/**
 * 视觉优先 —— 三个互斥候选方案（基于引擎层重写）。
 *
 * 该模式的既有语汇（主项目 main.js:2477-2486、7325-7399）：
 *   0.7s 缓动 + 按行距递增的 blur + scale + 级联入场延迟。
 * 三个方案共享引擎的弹簧与嵌套背景行骨架，差异在「多轨的表达方式」。
 *
 * 与第一版的关键区别：
 *  - 滚动由**每行独立的弹簧**驱动（而非固定行高 × 行号差），自然错峰；
 *  - 背景行**嵌在主行的 group 内**（而非独立排队争抢滚动位置）；
 *  - 级联延迟按行递减（`baseDelay /= 1.05`），形成自下而上的涟漪；
 *  - 剔除按**像素 overscan** 判定，并 teardown 释放 WAAPI 动画。
 */

import { LyricLayoutEngine, optimizeLines, buildGroups } from '../engine/index.js';

/** 三个方案共享的弹簧参数微调。 */
const SPRING_VISUAL = { mass: 1, damping: 11, stiffness: 92 }; // 略软 → 更明显的弹性

/**
 * 组装方案的公共部分：清洗 → 分组 → 建引擎。
 *
 * 注意克隆：optimizeLines 会原地修改行与其词数组，直接改 ctx.lines
 * 会让后续切换方案时读到已被清洗过的数据（时间被提前过、背景行被折叠过）。
 */
function prepare(ctx) {
  const lines = ctx.lines.map((l) => ({ ...l, words: (l.words || []).map((w) => ({ ...w })) }));
  const { attachTo } = optimizeLines(lines);
  const groups = buildGroups(lines, attachTo);
  return { lines, groups };
}

/* ────────────────────────────────────────────────────────────────────────
 * V1 弹簧滚动 + 景深
 * ──────────────────────────────────────────────────────────────────────── */

export const v1 = {
  meta: {
    id: 'v1',
    mode: 'visual',
    name: 'V1 弹簧滚动 + 景深',
    tagline: '每行独立弹簧驱动，景深模糊随行距递增，背景行嵌在主行内折叠展开',
    fixes: [
      '重叠多句：并发行各自成组、各自弹簧收敛，天然错峰同屏，不再互相覆盖',
      '背景行：嵌在主行 group 内，未唱时折叠、起唱时展开并带缩放，与主行同生共死',
      '对唱行：整组右对齐 + 主行让出右侧 15%，形成左右对话',
    ],
    cost: 'medium',
  },

  create(ctx) {
    const { groups } = prepare(ctx);
    const engine = new LyricLayoutEngine({
      spring: SPRING_VISUAL,
      alignPosition: 0.35,
      baseDelay: 0.055,
      delayDecay: 1.05,
      overscanPx: 320,
      enableBlur: true,
      dynamic: true,
    });
    let host = null;

    return {
      mount(nextHost) {
        host = nextHost;
        host.classList.add('ds-visual', 'ds-v1', 'eng-host');
        engine.mount(host);
        engine.setGroups(groups);
        // 首次布局：强制跳位，避免从 0 缓慢爬入
        engine.update(ctx.clock?.now?.() ?? 0, false, true);
      },

      update(frame) {
        if (!host) return;
        const ms = frame?.ms ?? 0;
        const playing = frame?.state === 'playing';
        // 真实帧间隔驱动弹簧（解析解保证帧率无关）
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
          // 诊断面板与基准脚本读 nodes：对引擎方案而言「驻留节点」= 可见组数
          nodes: s.visible,
          model: `弹簧滚动 · 组 ${s.groups} · 含背景行 ${s.withBg} · 离屏 ${s.offscreen}`,
        };
      },
    };
  },
};

/* ────────────────────────────────────────────────────────────────────────
 * V2 焦点钉住 + 背景浮层
 * ──────────────────────────────────────────────────────────────────────── */

export const v2 = {
  meta: {
    id: 'v2',
    mode: 'visual',
    name: 'V2 焦点钉住 + 背景浮层',
    tagline: '当前行钉在视觉中心零位移，上下行以强弹簧+重模糊退到后景',
    fixes: [
      '重叠多句：焦点行零位移，并发行以极强弹簧收束在焦点周围，不再争夺位置',
      '背景行：折叠在主行下方并随起唱上浮展开（slideY 弹簧 + scale 0.8→1.0）',
      '对唱行：右对齐 + 声部色，与主行形成左右对位',
    ],
    cost: 'medium',
  },

  create(ctx) {
    const { groups } = prepare(ctx);
    const engine = new LyricLayoutEngine({
      // 更硬的弹簧 + 更大阻尼：焦点行迅速归位，几乎不过冲
      spring: { mass: 1, damping: 18, stiffness: 160 },
      alignPosition: 0.5,
      anchor: 'center',
      baseDelay: 0.02,
      delayDecay: 1.02,
      overscanPx: 260,
      enableBlur: true,
      dynamic: true,
    });
    let host = null;

    return {
      mount(nextHost) {
        host = nextHost;
        host.classList.add('ds-visual', 'ds-v2', 'eng-host');
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
          model: `焦点钉住 · 组 ${s.groups} · 可见 ${s.visible}`,
        };
      },
    };
  },
};

/* ────────────────────────────────────────────────────────────────────────
 * V3 视差滚动 + 长尾保持
 * ──────────────────────────────────────────────────────────────────────── */

export const v3 = {
  meta: {
    id: 'v3',
    mode: 'visual',
    name: 'V3 视差滚动 + 长尾保持',
    tagline: '焦点略高（0.4）留出下方空间，长尾行保持可见，缓动更长更柔',
    fixes: [
      '重叠多句：并发行以更长弹簧并存于视野，重叠区间内全部可读',
      '背景行：嵌套展开且不随主行立即收起，长尾和声保持可见',
      '对唱行：右对齐 + 声部色，长音字带强调缩放',
    ],
    cost: 'high',
  },

  create(ctx) {
    const { groups } = prepare(ctx);
    const engine = new LyricLayoutEngine({
      // 更软更慢：视觉上更「飘」，代价是收敛时间长
      spring: { mass: 1.6, damping: 9, stiffness: 70 },
      alignPosition: 0.4,
      baseDelay: 0.07,
      delayDecay: 1.08,
      overscanPx: 420, // 更大余量 → 长尾行保持可见
      enableBlur: true,
      dynamic: true,
    });
    let host = null;

    return {
      mount(nextHost) {
        host = nextHost;
        host.classList.add('ds-visual', 'ds-v3', 'eng-host');
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
          model: `视差+长尾 · 组 ${s.groups} · 可见 ${s.visible}`,
        };
      },
    };
  },
};

export const variants = [v1, v2, v3];
export default variants;
