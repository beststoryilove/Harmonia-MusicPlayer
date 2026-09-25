/**
 * 诊断计量 —— 让「性能优先」可证伪。
 *
 * 采集两类数据：
 *  1. 帧级：FPS、帧耗时（均/最差）、掉帧数（> 32ms 视为一次卡顿）；
 *  2. 写入级：样式写入、去重跳过、class 变更、强制布局读取、触及节点数。
 *
 * rAF 回调计数通过包装全局 requestAnimationFrame 实现——这能抓住
 * 「方案偷偷又开了一个 rAF 循环」这类问题，正是我们要防的。
 */

import { counters, resetCounters } from './dom.js';

/** 卡顿阈值（毫秒）。60fps 一帧 16.7ms，超过 32ms 记一次掉帧。 */
export const JANK_MS = 32;

/**
 * 创建诊断采集器。
 *
 * @param {object} [options]
 * @param {number} [options.windowSize=120] 滚动窗口帧数
 * @returns {object} 采集器 API
 */
export function createDiagnostics(options = {}) {
  const windowSize = Number(options.windowSize) || 120;

  /** @type {Array<{ms: number, frameMs: number, styleWrites: number, layoutReads: number, nodesTouched: number, classToggles: number, rafCallbacks: number, activeLines: number, nodes: number}>} */
  const samples = [];
  let lastFrameWall = 0;
  let jankCount = 0;
  let totalFrames = 0;
  let worstFrameMs = 0;
  let rafWrapperInstalled = false;
  let originalRaf = null;
  let extraRafCallbacks = 0;

  /**
   * 包装全局 rAF 以统计回调次数。
   * 注意：这会把 scheduler 自身的 rAF 也计入——那是共享时钟，9 个方案一视同仁，
   * 因此不影响方案之间的横向比较。
   */
  function installRafCounter() {
    if (rafWrapperInstalled || typeof requestAnimationFrame !== 'function') return;
    originalRaf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) => originalRaf((ts) => {
      extraRafCallbacks += 1;
      return callback(ts);
    });
    rafWrapperInstalled = true;
  }

  function uninstallRafCounter() {
    if (!rafWrapperInstalled || !originalRaf) return;
    window.requestAnimationFrame = originalRaf;
    rafWrapperInstalled = false;
    originalRaf = null;
  }

  /**
   * 采集一帧。必须在所有 variant 更新完之后调用，否则写入计数不完整。
   *
   * @param {object} frame 时钟帧快照
   * @param {object} [extra]
   * @param {number} [extra.activeLines=0] 当前活动行数
   * @param {number} [extra.nodes=0] 舞台内 DOM 节点数
   */
  function sample(frame, extra = {}) {
    const wall = performance.now();
    const frameMs = lastFrameWall ? wall - lastFrameWall : 0;
    lastFrameWall = wall;
    totalFrames += 1;
    if (frameMs > JANK_MS) jankCount += 1;
    if (frameMs > worstFrameMs) worstFrameMs = frameMs;

    samples.push({
      ms: frame?.ms || 0,
      frameMs,
      styleWrites: counters.styleWrites,
      styleSkips: counters.styleSkips,
      classToggles: counters.classToggles,
      layoutReads: counters.layoutReads,
      nodesTouched: counters.nodesTouched,
      rafCallbacks: extraRafCallbacks,
      activeLines: extra.activeLines || 0,
      nodes: extra.nodes || 0,
    });
    if (samples.length > windowSize) samples.shift();

    extraRafCallbacks = 0;
    resetCounters();
  }

  /** 聚合当前窗口的统计结果。 */
  function summary() {
    const n = samples.length;
    if (!n) {
      return {
        frames: 0, fps: 0, avgFrameMs: 0, p95FrameMs: 0, worstFrameMs: 0,
        jankCount, jankRate: 0, styleWritesPerFrame: 0, styleSkipsPerFrame: 0,
        classTogglesPerFrame: 0, layoutReadsPerFrame: 0, nodesTouchedPerFrame: 0,
        rafCallbacksPerFrame: 0, activeLines: 0, nodes: 0, totalFrames,
      };
    }
    const frameTimes = samples.map((s) => s.frameMs).filter((v) => v > 0);
    const avg = frameTimes.length ? frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length : 0;
    const sorted = [...frameTimes].sort((a, b) => a - b);
    const p95 = sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] : 0;
    const sum = (key) => samples.reduce((acc, s) => acc + s[key], 0);
    const last = samples[n - 1];
    return {
      frames: n,
      fps: avg > 0 ? 1000 / avg : 0,
      avgFrameMs: avg,
      p95FrameMs: p95,
      worstFrameMs,
      jankCount,
      jankRate: totalFrames ? jankCount / totalFrames : 0,
      styleWritesPerFrame: sum('styleWrites') / n,
      styleSkipsPerFrame: sum('styleSkips') / n,
      classTogglesPerFrame: sum('classToggles') / n,
      layoutReadsPerFrame: sum('layoutReads') / n,
      nodesTouchedPerFrame: sum('nodesTouched') / n,
      rafCallbacksPerFrame: sum('rafCallbacks') / n,
      activeLines: last.activeLines,
      nodes: last.nodes,
      totalFrames,
    };
  }

  /** 清空窗口，用于切换方案后重新开始测量。 */
  function reset() {
    samples.length = 0;
    lastFrameWall = 0;
    jankCount = 0;
    totalFrames = 0;
    worstFrameMs = 0;
    extraRafCallbacks = 0;
    resetCounters();
  }

  return { installRafCounter, uninstallRafCounter, sample, summary, reset };
}

/** 统计容器内 DOM 节点总数（含自身）。 */
export function countNodes(root) {
  if (!root) return 0;
  let n = 1;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  while (walker.nextNode()) n += 1;
  return n;
}
