/**
 * 页面内自检 —— 供 headless Chrome 冒烟与人工排查使用。
 *
 * 检查分三层：
 *  A. 静态契约：9 个方案齐备、meta 合规、fixes 覆盖三类 TTML 特性；
 *  B. 数据层：5 个样本都能解析，且真实样本确实含重叠 / 背景 / 对唱；
 *  C. 渲染层：逐个方案 mount → 在若干关键时刻 update → 断言活动行真的可见。
 *
 * C 层是本文件的核心价值：它把「重叠行是否同屏」从观感变成断言。
 */

import { selectActiveSet } from './model.js';
import { validateVariant, validateInstance } from './renderers/contract.js';

/**
 * 判定元素是否可见。
 *
 * 关键陷阱：不能在「过渡进行中」读 computed opacity。
 * 三个模式都有 0.18s~0.8s 的 opacity 过渡，刚写完 inline 值就去读，
 * 会读到过渡的起始值（常为 0），把正确的渲染误判为「活动行不可见」。
 *
 * 因此判定分两步：
 *  1. 结构可见性 —— display / visibility / 祖先链，不受过渡影响；
 *  2. 目标可见性 —— 读 inline 值（渲染器写入的**目标**值）而非 computed 值。
 *     若渲染器没写 inline，则回落到 computed（此时无过渡可言）。
 */
function isVisible(node) {
  let el = node;
  while (el && el.nodeType === 1) {
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    el = el.parentElement;
  }
  const inline = Number(el_ownInlineOpacity(node));
  const target = Number.isFinite(inline) ? inline : Number(getComputedStyle(node).opacity);
  return target >= 0.02;
}

/** 取元素自身声明的 opacity（未声明返回 NaN）。 */
function el_ownInlineOpacity(node) {
  const raw = node?.style?.opacity;
  if (raw === undefined || raw === '') return NaN;
  return Number(raw);
}

/**
 * 临时关闭全站过渡，使 computed 值立即等于目标值。
 * 自检结束后由调用方移除。返回还原函数。
 */
function disableTransitions() {
  const style = document.createElement('style');
  style.id = '__selftest_no_transition';
  style.textContent = '*, *::after, *::before { transition: none !important; animation: none !important; }';
  document.head.appendChild(style);
  return () => {
    if (style.parentNode) style.parentNode.removeChild(style);
  };
}

/** 取一组关键时刻：每个活动行的起点 + 中点 + 少量偏置，覆盖重叠区间。 */
function keyMoments(lines, limit = 40) {
  const points = new Set([0]);
  for (const line of lines) {
    points.add(line.startMs + 1);
    points.add(Math.round((line.startMs + line.endMs) / 2));
  }
  const sorted = [...points].sort((a, b) => a - b);
  if (sorted.length <= limit) return sorted;
  const step = sorted.length / limit;
  const out = [];
  for (let i = 0; i < limit; i += 1) out.push(sorted[Math.floor(i * step)]);
  return out;
}

/**
 * 运行自检。
 *
 * @param {object} ctx 由 app.js 注入的依赖集合
 * @returns {Promise<{lines: Array<{pass: boolean, text: string}>, text: string, summary: object}>}
 */
export async function runSelfTest(ctx) {
  const lines = [];
  const add = (pass, text) => lines.push({ pass: Boolean(pass), text: `${pass ? '✓' : '✗'} ${text}` });

  /* ── A. 静态契约 ───────────────────────────────────────────────────── */

  const all = ctx.MODES.flatMap((m) => ctx.VARIANTS_BY_MODE[m.id] || []);
  add(all.length === 9, `方案总数 9（实际 ${all.length}）`);
  for (const mode of ctx.MODES) {
    const list = ctx.VARIANTS_BY_MODE[mode.id] || [];
    add(list.length === 3, `模式「${mode.name}」3 个方案（实际 ${list.length}）`);
  }
  for (const variant of all) {
    const problems = validateVariant(variant);
    add(problems.length === 0, `契约 ${variant.meta.id}：${problems.length ? problems.join('; ') : '合规'}`);
    const fixes = variant.meta.fixes.join('');
    add(/重叠/.test(fixes), `${variant.meta.id} fixes 覆盖重叠多句`);
    add(/背景/.test(fixes), `${variant.meta.id} fixes 覆盖背景行`);
    add(/对唱/.test(fixes), `${variant.meta.id} fixes 覆盖对唱行`);
  }

  /* ── B. 数据层 ─────────────────────────────────────────────────────── */

  const sampleData = {};
  for (const sample of ctx.SAMPLES) {
    try {
      const text = await ctx.fetchSampleText(sample.file);
      const parsed = ctx.parseLyrics(text);
      sampleData[sample.id] = parsed;
      add(parsed.lines.length > 0, `样本 ${sample.id} 解析出 ${parsed.lines.length} 行`);
      const bad = parsed.lines.filter((l) => !(l.endMs > l.startMs));
      add(bad.length === 0, `样本 ${sample.id} 全部行 endMs > startMs（异常 ${bad.length}）`);
      const roles = new Set(parsed.lines.map((l) => l.role));
      add(roles.size > 0, `样本 ${sample.id} 角色分布：${[...roles].join('/')}`);
    } catch (error) {
      add(false, `样本 ${sample.id} 解析失败：${error.message}`);
    }
  }

  const real = sampleData['real-3402223603'];
  if (real) {
    add(real.stats.bg > 0, `真实样本含背景行 ${real.stats.bg} 条`);
    add(real.stats.duet > 0, `真实样本含对唱行 ${real.stats.duet} 条`);
    add(real.stats.overlapGroups > 0, `真实样本含重叠簇 ${real.stats.overlapGroups} 组`);
    add(real.stats.peakConcurrent >= 3, `真实样本峰值并发 ${real.stats.peakConcurrent} 行（期望 ≥3）`);
  } else {
    add(false, '真实样本未加载');
  }

  /* ── C. 渲染层 ─────────────────────────────────────────────────────── */

  const targetSample = real || sampleData[ctx.SAMPLES[0].id];
  const stage = document.getElementById('stages');

  // 渲染断言必须在「无过渡」环境下做：三个模式都有 0.18s~0.8s 的 opacity
  // 过渡，逐点 seek 时 computed 值会读到过渡起始值，导致误判。
  const restoreTransitions = disableTransitions();

  try {
  for (const variant of all) {
    const cell = document.createElement('div');
    cell.className = 'ds-stage-cell';
    cell.style.position = 'fixed';
    cell.style.left = '-10000px';
    cell.style.top = '0';
    cell.style.width = '900px';
    cell.style.height = '460px';
    const host = document.createElement('div');
    host.className = 'ds-stage eng-host';
    cell.appendChild(host);
    document.body.appendChild(cell);

    let instance = null;
    try {
      instance = variant.create({
        lines: targetSample.lines,
        meta: targetSample.meta,
        stats: targetSample.stats,
        clock: ctx.clock,
      });
      const problems = validateInstance(instance);
      add(problems.length === 0, `实例 ${variant.meta.id} 生命周期完整`);
      instance.mount(host);

      const moments = keyMoments(targetSample.lines, 24);
      let updateErrors = 0;
      let maxVisibleActive = 0;
      let missedActive = 0;
      let worstRatio = 1;
      let worstMs = 0;
      let multiLineMoments = 0;
      let multiLineFullyVisible = 0;
      let withBgGroups = 0;

      for (const ms of moments) {
        try {
          instance.update({
            ms, state: 'paused', rate: 1, durationMs: targetSample.stats.durationMs, deltaSec: 1 / 60,
          });
        } catch (error) {
          updateErrors += 1;
          console.error('[selftest] update 抛错', variant.meta.id, ms, error);
          continue;
        }
        // 引擎按 group（主行 + 嵌套背景行）组织 DOM：选择器用 .eng-group 的数据属性
        for (const groupEl of host.querySelectorAll('.eng-group')) {
          if (groupEl.querySelector('.eng-bg-wrap')) withBgGroups += 1;
        }
        const { active } = selectActiveSet(targetSample.lines, ms, null, { maxBg: 6 });
        let visible = 0;
        for (const line of active) {
          const node = host.querySelector(`.eng-line[data-index="${line.index}"]`);
          if (node && isVisible(node)) visible += 1;
        }
        if (visible > maxVisibleActive) maxVisibleActive = visible;

        // 核心不变量：同时活跃的每一行都必须可见 —— 这正是三种模式原本塌陷的地方。
        // 只在「多行并发」的时刻考核，单行时刻任何方案都不该失败。
        if (active.length >= 2) {
          multiLineMoments += 1;
          const ratio = visible / active.length;
          if (ratio < worstRatio) { worstRatio = ratio; worstMs = ms; }
          if (visible === active.length) multiLineFullyVisible += 1;
        }
        if (active.length > 0 && visible === 0) missedActive += 1;
      }

      add(updateErrors === 0, `${variant.meta.id} ${moments.length} 个关键时刻 update 无异常`);
      add(missedActive === 0, `${variant.meta.id} 无「活动行全不可见」时刻（异常 ${missedActive}）`);
      add(maxVisibleActive >= 1, `${variant.meta.id} 峰值可见活动行 ${maxVisibleActive}`);
      // 背景行必须真的被渲染出来（嵌套结构成立），而不只是被解析到
      add(withBgGroups > 0, `${variant.meta.id} 渲染出嵌套背景行（${withBgGroups} 处采样命中）`);

      // 重叠场景的硬性要求：多行并发时必须全部可见
      const overlapOk = multiLineMoments === 0 || multiLineFullyVisible === multiLineMoments;
      add(
        overlapOk,
        `${variant.meta.id} 重叠时刻全部行可见：${multiLineFullyVisible}/${multiLineMoments}`
        + (overlapOk ? '' : `（最差 ${(worstRatio * 100).toFixed(0)}% @ ${worstMs}ms）`),
      );

      const st = typeof instance.stats === 'function' ? instance.stats() : {};
      add(true, `${variant.meta.id} 模型：${st.model || 'n/a'}`);
    } catch (error) {
      add(false, `${variant.meta.id} 渲染失败：${error.message}`);
    } finally {
      try { instance?.destroy(); } catch (error) { add(false, `${variant.meta.id} destroy 抛错：${error.message}`); }
      cell.remove();
    }
  }
  } finally {
    restoreTransitions();
  }

  /* ── D. 舞台节点统计 ───────────────────────────────────────────────── */

  add(stage !== null, '舞台容器存在');
  add(ctx.state.slots.length > 0, `当前已装配 ${ctx.state.slots.length} 个方案`);

  const failed = lines.filter((l) => !l.pass).length;
  const text = `自检完成：${lines.length - failed} 通过 / ${failed} 失败\n`;
  return {
    lines,
    text,
    summary: { total: lines.length, failed, passed: lines.length - failed },
  };
}
