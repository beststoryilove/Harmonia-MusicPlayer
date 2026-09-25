/**
 * DOM 写入原语 + 计量埋点。
 *
 * 为什么要有这一层：本 demo 的核心命题之一是「性能优先」到底省在哪。
 * 如果各方案直接 `el.style.color = x`，样式写入次数就无法可信统计，
 * 性能结论只能靠观感。因此把「写样式 / 读布局 / 切类名」收敛到这一处，
 * 由诊断面板精确计数。
 *
 * 写入去重（值未变则不写）也是真实优化手段，因此默认开启，且去重后的
 * 实际写入数才是计入统计的数字——这正是我们想比较的量。
 */

/** 运行期计数器。reset() 由诊断面板每帧调用。 */
export const counters = {
  styleWrites: 0,      // 实际落到 DOM 的样式写入次数（去重后）
  styleSkips: 0,       // 因值未变而跳过的写入
  classToggles: 0,     // 实际 class 变更次数
  layoutReads: 0,      // getBoundingClientRect / offsetHeight 等强制布局读取
  rafCallbacks: 0,     // requestAnimationFrame 回调次数（由 diagnostics 包装统计）
  nodesTouched: 0,     // 被写入过的元素数（按帧去重）
  _touched: null,
};

/** 清空每帧计数。 */
export function resetCounters() {
  counters.styleWrites = 0;
  counters.styleSkips = 0;
  counters.classToggles = 0;
  counters.layoutReads = 0;
  counters.rafCallbacks = 0;
  counters.nodesTouched = 0;
  counters._touched = new WeakSet();
}

resetCounters();

function markTouched(el) {
  if (!el || !counters._touched) return;
  if (counters._touched.has(el)) return;
  counters._touched.add(el);
  counters.nodesTouched += 1;
}

/**
 * 写入行内样式属性，值未变则跳过。
 *
 * @param {HTMLElement} el
 * @param {string} prop CSS 属性名（kebab-case 或 camelCase）
 * @param {string|number} value
 * @returns {boolean} 是否真的写入
 */
export function setStyle(el, prop, value) {
  if (!el || !el.style) return false;
  const next = value === null || value === undefined ? '' : String(value);
  const key = `__ds_${prop}`;
  if (el[key] === next) {
    counters.styleSkips += 1;
    return false;
  }
  el[key] = next;
  el.style.setProperty(prop, next);
  counters.styleWrites += 1;
  markTouched(el);
  return true;
}

/**
 * 批量写入行内样式（同一元素的多个属性）。
 *
 * @param {HTMLElement} el
 * @param {Record<string, string|number>} styles
 */
export function setStyles(el, styles) {
  for (const prop of Object.keys(styles)) setStyle(el, prop, styles[prop]);
}

/**
 * 写入 CSS 自定义属性。自定义属性用同一套去重逻辑，但键名独立。
 *
 * @param {HTMLElement} el
 * @param {string} name 形如 `--lane-offset`
 * @param {string|number} value
 */
export function setVar(el, name, value) {
  if (!el || !el.style) return false;
  const next = value === null || value === undefined ? '' : String(value);
  const key = `__dv_${name}`;
  if (el[key] === next) {
    counters.styleSkips += 1;
    return false;
  }
  el[key] = next;
  el.style.setProperty(name, next);
  counters.styleWrites += 1;
  markTouched(el);
  return true;
}

/**
 * 切换 class，状态未变则跳过。
 *
 * @param {HTMLElement} el
 * @param {string} name
 * @param {boolean} on
 */
export function toggleClass(el, name, on) {
  if (!el || !el.classList) return false;
  const want = Boolean(on);
  if (el.classList.contains(name) === want) return false;
  el.classList.toggle(name, want);
  counters.classToggles += 1;
  markTouched(el);
  return true;
}

/**
 * 强制布局读取（会触发重排，是性能敏感操作）。
 * 方案里任何量尺寸的行为都必须走这里，才能被诊断面板计入。
 *
 * @param {HTMLElement} el
 * @returns {DOMRect|null}
 */
export function measure(el) {
  if (!el || typeof el.getBoundingClientRect !== 'function') return null;
  counters.layoutReads += 1;
  return el.getBoundingClientRect();
}

/** 读取元素高度（同样计入布局读取）。 */
export function measureHeight(el) {
  if (!el) return 0;
  counters.layoutReads += 1;
  return el.offsetHeight || 0;
}

/** 创建元素并设置 class / 文本的简写。 */
export function createEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined && text !== null) el.textContent = String(text);
  return el;
}

/** 清空容器（移除全部子节点）。 */
export function clearChildren(el) {
  if (!el) return;
  while (el.firstChild) el.removeChild(el.firstChild);
}
