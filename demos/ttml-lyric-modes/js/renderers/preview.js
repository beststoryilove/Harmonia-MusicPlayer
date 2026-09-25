/**
 * 预览模式 —— 三个互斥候选方案（基于引擎层重写）。
 *
 * 该模式的既有版式（responsive.css:14）：
 *   860px 卡片、左对齐、44px 粗体主行、22px 翻译、0.8s 慢过渡。
 * 三个方案保留「卡片 / 大字 / 左对齐」的版式语汇，差异在结构：
 *
 *   R1 卡片流        —— 引擎默认纵向流 + 卡片外观
 *   R2 剧本双栏      —— 两组引擎并排，各管一半声部（真正解决对唱）
 *   R3 焦点 + 时间轴 —— 焦点区只放活动组，下方全曲时间轴
 *
 * R2 是三者里最特别的：它用**两个独立引擎**，各自维护自己的滚动与弹簧。
 * 对唱的根本困难在于「两个声部要同时可见但各自滚动」，单引擎做不到，
 * 双引擎天然解决 —— 这是我第一版没想通的点。
 */

import { LyricLayoutEngine, optimizeLines, buildGroups } from '../engine/index.js';
import { ROLE } from '../model.js';

/** 组装方案的公共部分。 */
function prepare(ctx) {
  const lines = ctx.lines.map((l) => ({ ...l, words: (l.words || []).map((w) => ({ ...w })) }));
  const { attachTo } = optimizeLines(lines);
  const groups = buildGroups(lines, attachTo);
  return { lines, groups };
}

/* ────────────────────────────────────────────────────────────────────────
 * R1 卡片流
 * ──────────────────────────────────────────────────────────────────────── */

export const r1 = {
  meta: {
    id: 'r1',
    mode: 'preview',
    name: 'R1 卡片流 + 角色徽标',
    tagline: '860px 卡片纵向流，背景行作为凹入子卡嵌在主卡内，对唱卡带声部徽标',
    fixes: [
      '重叠多句：并发行各成一张卡片，弹簧错峰使它们依次浮现而不互相遮挡',
      '背景行：凹入子卡（虚线边 + 内阴影 + 缩进），嵌套在主卡内而非独立排队',
      '对唱行：卡片左缘声部色 + 右上 A/B 徽标，读得出谁在唱',
    ],
    cost: 'medium',
  },

  create(ctx) {
    const { groups } = prepare(ctx);
    const engine = new LyricLayoutEngine({
      spring: { mass: 1.2, damping: 12, stiffness: 90 },
      alignPosition: 0.38,
      baseDelay: 0.06,
      delayDecay: 1.06,
      overscanPx: 400,
      enableBlur: false,   // 卡片模式靠实体感而非景深
      dynamic: true,
      lineOptions: { card: true },
    });
    let host = null;

    return {
      mount(nextHost) {
        host = nextHost;
        host.classList.add('ds-preview', 'ds-r1', 'eng-host', 'eng-card');
        engine.mount(host);
        engine.setGroups(groups);
        engine.update(ctx.clock?.now?.() ?? 0, false, true);
      },

      update(frame) {
        if (!host) return;
        const ms = frame?.ms ?? 0;
        const playing = frame?.state === 'playing';
        engine.update(ms, playing, false);
        engine.step(frame?.deltaSec ?? 1 / 60, ms, playing);
      },

      destroy() {
        engine.destroy();
        if (host) host.innerHTML = '';
      },

      stats() {
        const s = engine.stats();
        return {
          ...s,
          nodes: s.visible,
          model: `卡片流 · 组 ${s.groups} · 含背景行 ${s.withBg} · 离屏 ${s.offscreen}`,
        };
      },
    };
  },
};

/* ────────────────────────────────────────────────────────────────────────
 * R2 剧本双栏（双引擎）
 * ──────────────────────────────────────────────────────────────────────── */

export const r2 = {
  meta: {
    id: 'r2',
    mode: 'preview',
    name: 'R2 剧本双栏（双引擎）',
    tagline: 'A/B 两栏各有一个独立引擎与独立弹簧，对唱天然左右对位',
    fixes: [
      '重叠多句：同栏内的并发行各自成组错峰，两栏之间互不干扰',
      '背景行：以斜体舞台提示样式嵌在所属行内，随该栏一起滚动',
      '对唱行：按声部进不同栏，各栏独立锚定自己的活动行 —— 不再需要抢位置',
    ],
    cost: 'high',
  },

  create(ctx) {
    const { lines } = prepare(ctx);

    // 栏位分配：A 栏 = 主声部，B 栏 = 次要声部（判据见 js/layout.js 的同类修正）
    const primaryAgent = ctx.meta?.primaryAgent
      || lines.find((l) => l.role === ROLE.MAIN)?.agent
      || '';
    const columnOf = (line) => {
      if (!primaryAgent) return line.role === ROLE.DUET ? 1 : 0;
      return (line.agent && line.agent !== primaryAgent) ? 1 : 0;
    };

    /** 为指定栏构建引擎与分组。 */
    function buildColumn(col) {
      // 每栏需要各自独立的行副本（optimizeLines 会原地改）
      const subset = lines
        .filter((l) => columnOf(l) === col)
        .map((l) => ({ ...l, words: (l.words || []).map((w) => ({ ...w })) }));
      const { attachTo } = optimizeLines(subset, { advanceStartTime: false });
      const groups = buildGroups(subset, attachTo);
      const engine = new LyricLayoutEngine({
        spring: { mass: 1, damping: 14, stiffness: 110 },
        alignPosition: 0.4,
        baseDelay: 0.04,
        overscanPx: 300,
        enableBlur: false,
        dynamic: true,
      });
      return { engine, groups, count: subset.length };
    }

    const cols = [buildColumn(0), buildColumn(1)];
    let host = null;
    let colEls = [];

    return {
      mount(nextHost) {
        host = nextHost;
        host.classList.add('ds-preview', 'ds-r2');
        colEls = [0, 1].map((i) => {
          const el = document.createElement('div');
          el.className = 'eng-col';
          el.dataset.col = String(i);
          host.appendChild(el);
          return el;
        });
        cols.forEach((col, i) => {
          colEls[i].classList.add('eng-host');
          col.engine.mount(colEls[i]);
          col.engine.setGroups(col.groups);
          col.engine.update(ctx.clock?.now?.() ?? 0, false, true);
        });
      },

      update(frame) {
        if (!host) return;
        const ms = frame?.ms ?? 0;
        const playing = frame?.state === 'playing';
        const delta = frame?.deltaSec ?? 1 / 60;
        // 两栏各自推进自己的弹簧 —— 互不干扰是双引擎的意义所在
        for (const col of cols) {
          col.engine.update(ms, playing, false);
          col.engine.step(delta, ms, playing);
        }
      },

      destroy() {
        for (const col of cols) col.engine.destroy();
        colEls = [];
        if (host) host.innerHTML = '';
      },

      stats() {
        const a = cols[0].engine.stats();
        const b = cols[1].engine.stats();
        return {
          groups: a.groups + b.groups,
          nodes: a.visible + b.visible,
          model: `双引擎 · A 栏 ${a.groups} 组 / B 栏 ${b.groups} 组`,
        };
      },
    };
  },
};

/* ────────────────────────────────────────────────────────────────────────
 * R3 焦点 + 缩略时间轴
 * ──────────────────────────────────────────────────────────────────────── */

export const r3 = {
  meta: {
    id: 'r3',
    mode: 'preview',
    name: 'R3 焦点区 + 全曲时间轴',
    tagline: '焦点区只渲染活动组（含嵌套背景行），下方时间轴按角色着色且静态不重绘',
    fixes: [
      '重叠多句：焦点区同时列出全部活动组，时间轴上并行的条一眼可见',
      '背景行：焦点区内作为凹入子卡嵌套呈现，时间轴上以虚线窄条区分',
      '对唱行：时间轴按声部着色，焦点区带徽标，段落结构清晰',
    ],
    cost: 'high',
  },

  create(ctx) {
    const { groups } = prepare(ctx);
    const engine = new LyricLayoutEngine({
      spring: { mass: 1, damping: 13, stiffness: 120 },
      alignPosition: 0.5,
      baseDelay: 0.03,
      overscanPx: 220,        // 焦点区只需很小余量
      enableBlur: false,
      dynamic: true,
    });
    const durationMs = Math.max(1, ...groups.map((g) => g.endMs));
    let host = null;
    let axisEl = null;
    let playheadEl = null;
    let focusEl = null;
    /** 时间轴静态条：一次性建好，播放期不再触碰 */
    let axisBars = [];

    return {
      mount(nextHost) {
        host = nextHost;
        host.classList.add('ds-preview', 'ds-r3');

        focusEl = document.createElement('div');
        focusEl.className = 'eng-focus eng-host';
        axisEl = document.createElement('div');
        axisEl.className = 'eng-axis';

        axisBars = groups.map((g) => {
          const bar = document.createElement('div');
          bar.className = 'eng-axis-bar';
          bar.dataset.role = g.main.role;
          bar.style.left = `${((g.startMs / durationMs) * 100).toFixed(4)}%`;
          bar.style.width = `${Math.max(0.25, ((g.endMs - g.startMs) / durationMs) * 100).toFixed(4)}%`;
          bar.style.top = `${(groups.indexOf(g) % 6) * 7}px`;
          axisEl.appendChild(bar);
          // 背景行：额外画一条虚线窄条，体现它有自己的时间轴
          if (g.bg) {
            const bgBar = document.createElement('div');
            bgBar.className = 'eng-axis-bar is-bg';
            bgBar.style.left = `${((g.bg.startMs / durationMs) * 100).toFixed(4)}%`;
            bgBar.style.width = `${Math.max(0.25, ((g.bg.endMs - g.bg.startMs) / durationMs) * 100).toFixed(4)}%`;
            bgBar.style.top = `${(groups.indexOf(g) % 6) * 7 + 3}px`;
            axisEl.appendChild(bgBar);
          }
          return bar;
        });
        playheadEl = document.createElement('div');
        playheadEl.className = 'eng-playhead';
        axisEl.appendChild(playheadEl);

        host.append(focusEl, axisEl);
        engine.mount(focusEl);
        engine.setGroups(groups);
        engine.update(ctx.clock?.now?.() ?? 0, false, true);
      },

      update(frame) {
        if (!host) return;
        const ms = frame?.ms ?? 0;
        const playing = frame?.state === 'playing';
        engine.update(ms, playing, false);
        engine.step(frame?.deltaSec ?? 1 / 60, ms, playing);
        // 时间轴：只写 playhead 一个属性
        playheadEl.style.left = `${((ms / durationMs) * 100).toFixed(4)}%`;
      },

      destroy() {
        engine.destroy();
        axisBars = [];
        if (host) host.innerHTML = '';
      },

      stats() {
        const s = engine.stats();
        return {
          ...s,
          nodes: s.visible + axisBars.length,
          model: `焦点区 ${s.visible} 组 + 静态时间轴 ${axisBars.length} 条`,
        };
      },
    };
  },
};

export const variants = [r1, r2, r3];
export default variants;
