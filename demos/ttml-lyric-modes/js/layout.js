/**
 * 布局数学 —— 纯函数，无 DOM，可单测。
 *
 * 为什么单独成模块：本 demo 开发过程中出现的三个真实缺陷
 * （R2 整栏空白、R1/R2 卡片压叠、P2 焦点不居中）全部是**布局数学算错**，
 * 而不是渲染管线问题。把它们从 create() 闭包里提出来，才能被单测守住。
 *
 * 这里只做「算什么」，不做「怎么画」——画的部分留在各 variant 里。
 */

import { selectActiveSet, ROLE } from './model.js';

/**
 * 按声部把行分配到 A / B 两栏。
 *
 * 判据是「是否主声部」，不是「在声部列表里的序号取模」。
 * 真实样本 real-3402223603 只有 v1/v2 两个 agent 且对唱行全属 v2，
 * 若按序号取模，v2 的序号恒为 0，所有对唱行都会落进 A 栏，B 栏整栏空白。
 *
 * @param {Array<object>} lines 规范化行
 * @param {string} [primaryAgent] 主声部 id；缺失时按角色兜底
 * @returns {Map<number, 0|1>} line.index → 栏号
 */
export function assignDuetColumns(lines, primaryAgent) {
  const out = new Map();
  const list = Array.isArray(lines) ? lines : [];
  // 主声部缺失时，退化为「首个主行的 agent」
  const primary = primaryAgent || (list.find((l) => l.role === ROLE.MAIN)?.agent) || '';
  for (const line of list) {
    let col;
    if (primary) {
      col = (line.agent && line.agent !== primary) ? 1 : 0;
    } else {
      col = line.role === ROLE.DUET ? 1 : 0;
    }
    out.set(line.index, col);
  }
  return out;
}

/**
 * 采样出「焦点行随时间变化」的区间序列。
 *
 * 焦点行的判定复用与 JS 方案完全相同的 selectActiveSet，保证各方案
 * 对「当前该显示哪一句」的理解一致（这是横向对比成立的前提）。
 *
 * @param {Array<object>} lines 规范化行
 * @param {Map<number, number>} rowOf line.index → row
 * @returns {Array<{startMs: number, endMs: number, row: number}>} 连续区间
 */
export function buildFocusTimeline(lines, rowOf) {
  const list = Array.isArray(lines) ? lines : [];
  if (!list.length) return [];
  const bounds = [...new Set(list.flatMap((l) => [l.startMs, l.endMs]))].sort((a, b) => a - b);
  const segments = [];
  let lastFg = null;
  for (let i = 0; i < bounds.length; i += 1) {
    const start = bounds[i];
    const end = i + 1 < bounds.length ? bounds[i + 1] : start;
    if (end <= start) continue;
    // 取区间中点采样，避免落在边界上的半开区间歧义
    const mid = start + (end - start) / 2;
    const { fg } = selectActiveSet(list, mid, lastFg, { maxBg: 3 });
    if (fg) lastFg = fg;
    if (!fg) continue;
    const row = rowOf.get(fg.index);
    if (!Number.isFinite(row)) continue;
    const prev = segments[segments.length - 1];
    if (prev && prev.row === row && prev.endMs === start) {
      prev.endMs = end;
    } else {
      segments.push({ startMs: start, endMs: end, row });
    }
  }
  return segments;
}

/**
 * 由焦点时间线生成轨道滚动的 CSS keyframes。
 *
 * 两个关键点：
 *  ① 保持段：只在焦点行起点之间线性插值的话，轨道会匀速平移，「焦点行居中」
 *     仅在恰好到达其起点的瞬间成立（实测偏移可达一个泳道高度 65px）。
 *     因此每个区间输出「段首 + 段尾前 TRANSITION」两个同值帧，使其全程钉在中心。
 *  ② 避免同百分比覆盖：焦点区间首尾相接（上段 endMs === 下段 startMs），
 *     若把段尾与下段段首都写成同一百分比，后者会覆盖前者，保持段会消失
 *     （实测 55 帧里只剩 4 个保持段）。因此过渡压缩到段尾前的窗口内完成。
 *
 * @param {object} input
 * @param {Array<{startMs: number, endMs: number, row: number}>} input.timeline 焦点时间线
 * @param {Map<number, number>} input.rowY 行号 → 纵向偏移
 * @param {number} input.durationMs 总时长
 * @param {number} input.centerY 视觉中心 Y
 * @param {number} [input.transitionMs=420] 过渡时长
 * @returns {{keyframes: string, stopCount: number, holdCount: number, moveCount: number}}
 */
export function buildTrackKeyframes(input) {
  const {
    timeline = [], rowY, durationMs, centerY,
    transitionMs = 420,
  } = input || {};
  const total = Math.max(1, Number(durationMs) || 1);
  const at = (row) => centerY - (rowY.get(row) ?? 0);
  const pct = (t) => Math.max(0, Math.min(100, (t / total) * 100));

  const byPercent = new Map();
  const put = (t, row) => {
    byPercent.set(Number(pct(t).toFixed(4)), at(row).toFixed(1));
  };

  if (!timeline.length) {
    const only = `${centerY.toFixed(1)}`;
    return {
      keyframes: `@keyframes dsTrackScroll{0%{transform:translate3d(0,${only}px,0)}100%{transform:translate3d(0,${only}px,0)}}`,
      stopCount: 2,
      holdCount: 0,
      moveCount: 0,
    };
  }

  // 两端补齐：否则 fill-mode:both 会从元素基态（transform:none）跳变
  put(0, timeline[0].row);
  for (const seg of timeline) {
    const span = seg.endMs - seg.startMs;
    // 过渡窗口不超过该段自身时长的 40%，短段退化为直接过渡
    const trans = Math.min(transitionMs, Math.max(16, span * 0.4));
    put(seg.startMs, seg.row);
    const holdEnd = seg.endMs - trans;
    if (holdEnd > seg.startMs) put(holdEnd, seg.row);
  }
  put(total, timeline[timeline.length - 1].row);

  const ordered = [...byPercent.entries()].sort((a, b) => a[0] - b[0]);
  const body = ordered
    .map(([p, y]) => `${p.toFixed(4)}%{transform:translate3d(0,${y}px,0)}`)
    .join('');
  let holdCount = 0;
  let moveCount = 0;
  for (let i = 1; i < ordered.length; i += 1) {
    if (ordered[i][1] === ordered[i - 1][1]) holdCount += 1;
    else moveCount += 1;
  }
  return {
    keyframes: `@keyframes dsTrackScroll{${body}}`,
    stopCount: ordered.length,
    holdCount,
    moveCount,
  };
}
