/**
 * 性能优先 —— 三个互斥候选方案（基于引擎层重写）。
 *
 * 该模式的既有语汇（main.js:2477-2486、7335-7338）：
 *   0.18s 过渡、无 blur / 无阴影 / 无级联。
 * 三个方案共享引擎骨架，但各自砍掉不同的开销来源：
 *
 *   P1 减节点：只保留视口附近若干组，其余彻底 dispose
 *   P2 零弹簧：关掉弹簧，位置一次算好直接写（无积分、无逐帧收敛）
 *   P3 零逐字：关掉 WAAPI 逐字动画，整行文本渲染（动画时间轴归零）
 *
 * 关键认识：**「动画少」不等于「开销低」**。第一版我曾把「无 blur」当成
 * 性能优化的全部，但真正的成本大头是：每帧样式写入次数、合成层数量、
 * WAAPI 动画时间轴条数。这三者才分别对应上面三个方案。
 */

import { LyricLayoutEngine, optimizeLines, buildGroups } from '../engine/index.js';

/** 组装方案的公共部分。 */
function prepare(ctx) {
  const lines = ctx.lines.map((l) => ({ ...l, words: (l.words || []).map((w) => ({ ...w })) }));
  const { attachTo } = optimizeLines(lines, {
    // 性能模式不做逐字清洗相关的重排（提前起唱会改变视觉节奏，且非必要）
    advanceStartTime: false,
  });
  const groups = buildGroups(lines, attachTo);
  return { lines, groups };
}

/* ────────────────────────────────────────────────────────────────────────
 * P1 窗口化节点池
 * ──────────────────────────────────────────────────────────────────────── */

export const p1 = {
  meta: {
    id: 'p1',
    mode: 'performance',
    name: 'P1 窗口化节点池',
    tagline: '只保留视口附近的组，离屏组彻底释放 DOM 与动画，节点数恒定',
    fixes: [
      '重叠多句：并发行各自成组，窗口内全部驻留，窗口外整体释放，节点数不随总行数增长',
      '背景行：随宿主组一起进出窗口，复用同一套释放/重建逻辑',
      '对唱行：同窗口机制，声部色由 CSS 属性选择器承担，零内联写入',
    ],
    cost: 'low',
  },

  create(ctx) {
    const { groups } = prepare(ctx);
    const engine = new LyricLayoutEngine({
      // 硬弹簧：快速到位，减少收敛帧数
      spring: { mass: 1, damping: 22, stiffness: 200 },
      alignPosition: 0.35,
      baseDelay: 0,          // 无级联：省掉逐行延迟的排队
      enableSpring: true,
      enableBlur: false,     // 无 blur
      dynamic: true,
      // 更紧的 overscan → 更少的驻留节点
      overscanPx: 180,
    });
    let host = null;

    return {
      mount(nextHost) {
        host = nextHost;
        host.classList.add('ds-performance', 'ds-p1', 'eng-host');
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
          model: `窗口化 · 组 ${s.groups} · 驻留 ${s.visible} · 离屏 ${s.offscreen}`,
        };
      },
    };
  },
};

/* ────────────────────────────────────────────────────────────────────────
 * P2 零弹簧直写
 * ──────────────────────────────────────────────────────────────────────── */

export const p2 = {
  meta: {
    id: 'p2',
    mode: 'performance',
    name: 'P2 零弹簧直写',
    tagline: '位置一次算好直接写入，不做弹簧积分；仅在行边界变化时才写 DOM',
    fixes: [
      '重叠多句：并发行位置在行边界处一次性算好，稳定期每帧零 DOM 写入',
      '背景行：折叠状态由 class 切换（CSS 过渡承担动画），JS 不参与逐帧',
      '对唱行：静态定位，声部色走 CSS，行边界之外零 JS 写入',
    ],
    cost: 'low',
  },

  create(ctx) {
    const { groups } = prepare(ctx);
    const engine = new LyricLayoutEngine({
      enableSpring: false,   // 核心：关掉弹簧积分
      alignPosition: 0.35,
      baseDelay: 0,
      enableBlur: false,
      dynamic: false,        // 逐字也交给 CSS（无 WAAPI）
      overscanPx: 400,
    });
    let host = null;
    let lastIndex = -1;
    let lastPlaying = null;
    /** 稳定期跳过写入的次数（供诊断观察「零写入」是否成立）。 */
    let skippedFrames = 0;
    let writeFrames = 0;

    return {
      mount(nextHost) {
        host = nextHost;
        host.classList.add('ds-performance', 'ds-p2', 'eng-host');
        engine.mount(host);
        engine.setGroups(groups);
        engine.update(ctx.clock?.now?.() ?? 0, false, true);
        lastIndex = engine.scrollToIndex;
      },

      update(frame) {
        if (!host) return;
        const ms = frame?.ms ?? 0;
        const playing = frame?.state === 'playing';

        // 只在「焦点行变化」或「播放状态变化」时才重算并写 DOM。
        // 这是 P2 的核心：稳定期完全不动 DOM。
        engine.update(ms, playing, false);
        const changed = engine.scrollToIndex !== lastIndex || playing !== lastPlaying;
        lastIndex = engine.scrollToIndex;
        lastPlaying = playing;

        if (!changed) {
          skippedFrames += 1;
          // 仍需推进逐字动画（若有）与内容更新，但不写位置样式
          engine.writeStyles(ms, playing);
          return;
        }
        writeFrames += 1;
        engine.step(frame?.deltaSec ?? 1 / 60, ms, playing);
      },

      destroy() {
        engine.destroy();
        if (host) host.innerHTML = '';
      },

      stats() {
        const s = engine.stats();
        const total = writeFrames + skippedFrames;
        return {
          ...s,
          nodes: s.visible,
          model: `零弹簧直写 · 写入帧 ${writeFrames}/${total}`
            + `（跳过率 ${total ? ((skippedFrames / total) * 100).toFixed(0) : 0}%）`,
        };
      },
    };
  },
};

/* ────────────────────────────────────────────────────────────────────────
 * P3 零逐字动画
 * ──────────────────────────────────────────────────────────────────────── */

export const p3 = {
  meta: {
    id: 'p3',
    mode: 'performance',
    name: 'P3 零逐字动画',
    tagline: '整行文本渲染，不创建任何 WAAPI 动画时间轴，动画条数归零',
    fixes: [
      '重叠多句：并发行以整行文本渲染，位置仍由弹簧正确错峰，只是没有逐字效果',
      '背景行：嵌套结构保留（这是正确性而非装饰），但无逐字动画开销',
      '对唱行：右对齐 + 声部色，全部由 CSS 承担',
    ],
    cost: 'low',
  },

  create(ctx) {
    const { groups } = prepare(ctx);
    const engine = new LyricLayoutEngine({
      spring: { mass: 1, damping: 16, stiffness: 140 },
      alignPosition: 0.35,
      baseDelay: 0.02,
      enableSpring: true,
      enableBlur: false,
      dynamic: false,        // 核心：不建 WAAPI 动画
      overscanPx: 300,
    });
    let host = null;

    return {
      mount(nextHost) {
        host = nextHost;
        host.classList.add('ds-performance', 'ds-p3', 'eng-host');
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
        // 统计实际存在的 WAAPI 动画条数
        let anims = 0;
        for (const g of engine.groups) {
          anims += g.main.words.reduce((n, w) => n + w.animator.animations.length, 0);
          if (g.bg) anims += g.bg.words.reduce((n, w) => n + w.animator.animations.length, 0);
        }
        return {
          ...s,
          nodes: s.visible,
          animations: anims,
          model: `零逐字 · 组 ${s.groups} · WAAPI 动画 ${anims} 条`,
        };
      },
    };
  },
};

export const variants = [p1, p2, p3];
export default variants;
