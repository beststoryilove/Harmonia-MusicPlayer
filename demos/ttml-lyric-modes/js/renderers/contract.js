/**
 * 渲染方案契约 —— 9 个 variant 的统一接口。
 *
 * 一个 variant 就是一个「工厂 + 生命周期」对象：
 *
 *   export const meta = { id, mode, name, tagline, fixes, cost }
 *   export function create(ctx) -> { mount(host), update(frame), destroy(), stats() }
 *
 * 生命周期约定（由 app.js 严格按序调用）：
 *   create(ctx)   建实例，不做 DOM 操作
 *   mount(host)   建 DOM、算静态布局；只调用一次
 *   update(frame) 每帧调用（frame = { ms, state, rate, ... }）
 *   destroy()     清 DOM、解绑、停掉自己开的任何循环
 *
 * 硬性约束：
 *  - 播放期不得自行开 rAF（唯一例外：P2 方案，它完全不订阅帧，由 CSS 驱动）；
 *  - 任何样式写入走 js/dom.js 的原语，否则诊断面板计数失真；
 *  - update() 必须是幂等的：同一 ms 调两次结果一致。
 */

/** 方案成本标签，用于 UI 展示与 README 排序。 */
export const COST = Object.freeze({
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
});

/** 模式 id → 中文名。 */
export const MODE_LABEL = Object.freeze({
  visual: '视觉优先',
  performance: '性能优先',
  preview: '预览模式',
});

/** 成本标签 → 中文名。 */
export const COST_LABEL = Object.freeze({
  low: '开销低',
  medium: '开销中',
  high: '开销高',
});

/**
 * 校验 variant 是否满足契约。app.js 装配时调用，早失败早发现。
 *
 * @param {object} variant
 * @param {string} [expectedMode]
 * @returns {string[]} 问题列表（空数组表示合规）
 */
export function validateVariant(variant, expectedMode) {
  const problems = [];
  if (!variant || typeof variant !== 'object') return ['variant 不是对象'];
  const { meta, create } = variant;
  if (!meta || typeof meta !== 'object') problems.push('缺少 meta');
  else {
    for (const key of ['id', 'mode', 'name', 'tagline']) {
      if (!meta[key] || typeof meta[key] !== 'string') problems.push(`meta.${key} 缺失或非字符串`);
    }
    if (expectedMode && meta.mode !== expectedMode) {
      problems.push(`meta.mode=${meta.mode} 与预期 ${expectedMode} 不符`);
    }
    if (!Array.isArray(meta.fixes) || meta.fixes.length < 3) {
      problems.push('meta.fixes 至少需要 3 条（重叠多句 / 背景行 / 对唱行）');
    }
  }
  if (typeof create !== 'function') problems.push('create 不是函数');
  return problems;
}

/**
 * 校验实例是否满足生命周期契约。
 *
 * @param {object} instance
 * @returns {string[]}
 */
export function validateInstance(instance) {
  const problems = [];
  if (!instance || typeof instance !== 'object') return ['实例不是对象'];
  for (const method of ['mount', 'update', 'destroy']) {
    if (typeof instance[method] !== 'function') problems.push(`缺少 ${method}()`);
  }
  return problems;
}
