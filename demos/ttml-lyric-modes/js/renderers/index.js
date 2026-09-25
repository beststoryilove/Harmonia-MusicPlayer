/**
 * 方案注册表 —— 9 个 variant 的唯一清单。
 *
 * app.js 只从这里取方案，UI 也只从这里生成，避免「加了方案但 UI 没跟上」。
 */

import { validateVariant } from './contract.js';
import visual from './visual.js';
import performance from './performance.js';
import preview from './preview.js';

/** 模式清单（顺序即 UI 顺序）。 */
export const MODES = Object.freeze([
  { id: 'visual', name: '视觉优先', desc: '0.7s 缓动 + blur + scale + 级联入场' },
  { id: 'performance', name: '性能优先', desc: '0.18s 过渡、无 blur / 无阴影 / 无级联' },
  { id: 'preview', name: '预览模式', desc: '860px 卡片、44px 粗体、0.8s 慢过渡' },
]);

/** 全部方案。 */
export const VARIANTS = Object.freeze([...visual, ...performance, ...preview]);

/** 按模式分组。 */
export const VARIANTS_BY_MODE = Object.freeze(
  MODES.reduce((acc, mode) => {
    acc[mode.id] = VARIANTS.filter((v) => v.meta.mode === mode.id);
    return acc;
  }, {}),
);

/**
 * 自检：校验注册表完整性。app 启动时调用一次，问题直接抛到控制台与 UI。
 *
 * @returns {string[]} 问题列表
 */
export function selfCheck() {
  const problems = [];
  if (VARIANTS.length !== 9) problems.push(`方案总数应为 9，实际 ${VARIANTS.length}`);
  for (const mode of MODES) {
    const list = VARIANTS_BY_MODE[mode.id] || [];
    if (list.length !== 3) problems.push(`模式 ${mode.id} 应有 3 个方案，实际 ${list.length}`);
  }
  const ids = new Set();
  for (const variant of VARIANTS) {
    for (const problem of validateVariant(variant)) {
      problems.push(`${variant?.meta?.id || '(未知方案)'}: ${problem}`);
    }
    const id = variant?.meta?.id;
    if (ids.has(id)) problems.push(`方案 id 重复: ${id}`);
    ids.add(id);
  }
  return problems;
}

/**
 * 按 id 取方案。
 *
 * @param {string} id
 * @returns {object|undefined}
 */
export function getVariant(id) {
  return VARIANTS.find((v) => v.meta.id === id);
}
