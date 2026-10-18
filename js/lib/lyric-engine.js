/* Harmonia Legacy 歌词引擎
 *
 * 来源：**改编自** Harmonia/demos/ttml-lyric-modes/js/{model.js, engine/*.js}。
 * 那套引擎是自研实现，只在技术方向上借鉴 applemusic-like-lyrics（AGPL-3.0-only），
 * 未复制其任何源码；本文件同样不含其代码。
 *
 * 与 demo 的关系是「分叉」而非「重复」，理由与差异如下（评审时请先读这段）：
 *   1) demo 不是发行产物的一部分（不进客户端构建），运行时不能依赖 demos/ 目录存在，
 *      因此必须把代码搬进 js/lib/；demo 保持只读，作为对照与测试素材。
 *   2) 搬迁时叠加了五项项目专属改动（见下），所以二者**不是**逐字相同的副本，
 *      不能用「保持同步」的方式维护 —— 它们是各自演进的。
 *   3) 为防止两边共享契约漂移，tests/js/lyric-engine.test.js 引用 demo 的**样本**
 *      作为测试素材；与 demo 的 optimize/model 逐点对照、把「分组语义一致」变成
 *      断言的 parity 用例已经加入该测试文件（`分叉契约：引擎与 demo 的分组语义一致`）。
 *
 * 与 demo 的五处差异（a–d 为叠加的新增代码，e 修改了 findActiveLines 的函数体）：
 *   a. LineGroup 构造时额外写 dataset.time（主行起点秒），供主项目点击跳转；
 *   b. LyricLayoutEngine 新增 relayout()：字号/尺寸变化后重测行高并强制重排；
 *   c. LyricLayoutEngine.update() 增加「宿主无尺寸则跳过」守卫（移动端面板隐藏时
 *      clientHeight 为 0，测量全为 0 会让所有组叠在一处），并新增 ensureSized()；
 *   d. 增加 mountLyrics() 装配层与 PRESETS（三种动画模式的参数预设）。
 *   e. findActiveLines 的向后回扫改用「前缀最大行尾」剪枝。demo 用「已见最大行尾」
 *      判断早停，该值初值为 -Infinity 且只覆盖已访问行，等价于「前两行结束就停」，
 *      会漏掉更早开始的长行（真实样本 5055 个采样点中 2 个漏行、并会漏掉跨多行的
 *      背景长行）。行数与判据一致，成本为一次 O(n) 前缀扫描。
 *
 * 为什么单文件 + UMD：主项目是 classic script 且以 file:// 加载（Electron），
 *   ES module 在 file:// 下会被 CORS 拦截；沿用 pure.js 的包装是既有先例。
 *
 * 浏览器：<script src="js/lib/lyric-engine.js"></script> → window.HarmoniaLyricEngine
 * Node：require('.../js/lib/lyric-engine.js')（供 node --test 直接驱动）
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.HarmoniaLyricEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ══ 1/7 来源 demos/ttml-lyric-modes/js/dom.js（删 export，函数体逐字）══ */

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
  const counters = {
    styleWrites: 0,      // 实际落到 DOM 的样式写入次数（去重后）
    styleSkips: 0,       // 因值未变而跳过的写入
    classToggles: 0,     // 实际 class 变更次数
    layoutReads: 0,      // getBoundingClientRect / offsetHeight 等强制布局读取
    rafCallbacks: 0,     // requestAnimationFrame 回调次数（由 diagnostics 包装统计）
    nodesTouched: 0,     // 被写入过的元素数（按帧去重）
    _touched: null,
  };

  /** 清空每帧计数。 */
  function resetCounters() {
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
  function setStyle(el, prop, value) {
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
  function setStyles(el, styles) {
    for (const prop of Object.keys(styles)) setStyle(el, prop, styles[prop]);
  }

  /**
   * 写入 CSS 自定义属性。自定义属性用同一套去重逻辑，但键名独立。
   *
   * @param {HTMLElement} el
   * @param {string} name 形如 `--lane-offset`
   * @param {string|number} value
   */
  function setVar(el, name, value) {
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
  function toggleClass(el, name, on) {
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
  function measure(el) {
    if (!el || typeof el.getBoundingClientRect !== 'function') return null;
    counters.layoutReads += 1;
    return el.getBoundingClientRect();
  }

  /** 读取元素高度（同样计入布局读取）。 */
  function measureHeight(el) {
    if (!el) return 0;
    counters.layoutReads += 1;
    return el.offsetHeight || 0;
  }

  /** 创建元素并设置 class / 文本的简写。 */
  function createEl(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined && text !== null) el.textContent = String(text);
    return el;
  }

  /** 清空容器（移除全部子节点）。 */
  function clearChildren(el) {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  /* ══ 2/7 来源 demos/ttml-lyric-modes/js/model.js（删 export，函数体逐字）══ */

  /**
   * 歌词行模型层 —— 纯函数，零 DOM 依赖，可在 node --test 下直接导入。
   *
   * 职责边界：
   *  - 把 vendor/ttml.js 解析出的原始行规范化为「统一行模型」（毫秒时间轴 + 角色标签）；
   *  - 提供重叠时间轴的查询原语：活动行集合、主/副行选择、重叠分组、窗口虚拟化；
   *  - 提供轨位打包原语 packLanes（区间图着色），供各渲染方案复用。
   *
   * 明确不负责：DOM 结构、样式、动画 —— 那些是各 variant 的差异所在。
   *
   * 术语：
   *  - 主行（main）   普通行，非背景非对唱
   *  - 对唱行（duet） isDuet 为真且非背景
   *  - 背景行（bg）   isBG 为真（ttm:role="x-bg"）
   *  - 活动行（active）startMs <= t < endMs
   */

  /** 行尾缺失时的兜底时长（毫秒）。与 vendor 解析器 DEFAULT_LINE_DURATION_MS 一致。 */
  const FALLBACK_LINE_MS = 5000;

  /** 角色常量。 */
  const ROLE = Object.freeze({
    MAIN: 'main',
    DUET: 'duet',
    BG: 'bg',
  });

  /**
   * 取行的结束时间（毫秒）。
   * 优先用解析器给的 endTime；非法时回退到下一个候选起点或兜底时长。
   *
   * @param {{endTime?: number, startTime?: number}} line
   * @param {number} [fallbackEnd] 下一个候选起点（毫秒）
   * @returns {number}
   */
  function lineEndMs(line, fallbackEnd) {
    const start = Number(line?.startTime) || 0;
    const end = Number(line?.endTime);
    if (Number.isFinite(end) && end > start) return end;
    if (Number.isFinite(fallbackEnd) && fallbackEnd > start) return fallbackEnd;
    return start + FALLBACK_LINE_MS;
  }

  /**
   * 判定行的角色。背景优先于对唱（背景行也可能挂在次要声部上）。
   *
   * @param {object} line
   * @returns {'main'|'duet'|'bg'}
   */
  function roleOf(line) {
    if (line?.isBG) return ROLE.BG;
    if (line?.isDuet || line?.isPriorityBg) return ROLE.DUET;
    return ROLE.MAIN;
  }

  /**
   * 取行的展示文本。解析器已给出 text；缺失时从 words 拼接。
   *
   * @param {object} line
   * @returns {string}
   */
  function lineText(line) {
    if (!line) return '';
    const text = String(line.text ?? '').trim();
    if (text) return text;
    return String((line.words || []).map((w) => w.word || '').join('')).trim();
  }

  /**
   * 规范化行数组。
   *
   * 做三件事：
   *  1. 过滤掉无法定时的行（无有限 startTime）；
   *  2. 补齐 endTime（用后续行起点推断，保证 endTime > startTime）；
   *  3. 按 startTime 升序稳定排序，并写入 index / role / endMs 派生字段。
   *
   * @param {Array<object>} lines vendor 解析器输出
   * @returns {Array<object>} 规范化行（新对象，不修改入参）
   */
  function normalizeLines(lines) {
    const list = Array.isArray(lines) ? lines : [];
    const staged = [];
    for (const raw of list) {
      if (!raw) continue;
      const startTime = Number(raw.startTime);
      if (!Number.isFinite(startTime)) continue;
      staged.push({ raw, startTime });
    }
    // 先按起点排序，才能用「下一个起点」推断缺失的行尾
    staged.sort((a, b) => a.startTime - b.startTime);

    const out = [];
    for (let i = 0; i < staged.length; i += 1) {
      const { raw, startTime } = staged[i];
      const nextStart = i + 1 < staged.length ? staged[i + 1].startTime : NaN;
      const endMs = lineEndMs({ startTime, endTime: raw.endTime }, nextStart);
      out.push({
        ...raw,
        startTime,
        endTime: endMs,
        endMs,
        startMs: startTime,
        index: i,
        role: roleOf(raw),
        text: lineText(raw),
        words: Array.isArray(raw.words) ? raw.words : [],
      });
    }
    return out;
  }

  /**
   * 取在时刻 `ms` 处于活动状态的全部行（保留规范化顺序）。
   *
   * 用二分定位首个 startMs > ms 的行，再向前回扫——重叠时间轴下行区间互相交叠，
   * 不能只取单个下标，必须收集整个活动集合。
   *
   * @param {Array<object>} lines 规范化行
   * @param {number} ms 当前时刻（毫秒）
   * @returns {Array<object>} 活动行
   */
  function findActiveLines(lines, ms) {
    const list = lines || [];
    if (!list.length) return [];
    const t = Number(ms) || 0;
    // 二分：第一个 startMs > t 的位置
    let lo = 0;
    let hi = list.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (list[mid].startMs > t) hi = mid;
      else lo = mid + 1;
    }
    // 前缀最大行尾：prefixMax[i] = max(endMs of list[0..i])。
    // 只有它能支持「更早的行是否还可能活动」的早停判断 —— 用「已见最大行尾」
    // 是不成立的：初值为 -Infinity 且只看已访问过的行，等价于「前两行结束就停」，
    // 会漏掉更早开始的长行（实测真实样本 5055 个采样点中 2 个漏行）。
    const prefixMax = new Array(list.length);
    let run = -Infinity;
    for (let i = 0; i < list.length; i += 1) {
      if (list[i].endMs > run) run = list[i].endMs;
      prefixMax[i] = run;
    }
    const active = [];
    // 向前回扫：本行若仍覆盖 t 则收集；当 i 之前所有行的行尾都不超过 t 时，
    // 再往前的行必然已全部结束，可以安全早停（前缀最大行尾即该判据）。
    for (let i = lo - 1; i >= 0; i -= 1) {
      if (list[i].endMs > t) active.push(list[i]);
      if (i === 0 || prefixMax[i - 1] <= t) break;
    }
    active.sort((a, b) => a.startMs - b.startMs || a.index - b.index);
    return active;
  }

  /**
   * 主行 / 副行选择。语义对齐主项目 `computeDesktopLyricLines`（main.js:4938-4970）：
   *
   *  主行 fg：普通行最早 → 保持 lastFg（间隙保持）→ 对唱行最早 → 背景行最早
   *  副行 bgSlots：仅对唱 / 背景行，活动即候选；对唱优先、跳过与主行同文本、最多 maxBg 条
   *
   * 副行排序：maxBg === 1 时取最新开始者（避免早行饿死新行）；
   *           maxBg > 1 时按开始时间升序（时间轴顺序）。
   *
   * 「间隙保持」的判定：lastFg 不必仍在活动集合内 —— 行与行之间的空隙里，
   * 主行本就已结束，保持它才能避免歌词区闪烁回空。只在它已被后续行取代
   * （即存在起点更晚的活动普通行）时才让位。
   *
   * @param {Array<object>} lines 规范化行
   * @param {number} ms 当前时刻
   * @param {object|null} lastFg 上一帧的主行（间隙保持用）
   * @param {object} [options]
   * @param {number} [options.maxBg=3] 副行上限
   * @returns {{fg: object|null, bgSlots: Array<object>, active: Array<object>}}
   */
  function selectActiveSet(lines, ms, lastFg, options = {}) {
    const maxBg = Number.isFinite(options.maxBg) ? options.maxBg : 3;
    const active = findActiveLines(lines, ms);
    const isBg = (ln) => ln.role === ROLE.BG;
    const isDuet = (ln) => ln.role === ROLE.DUET;

    let fg = null;
    const normals = active.filter((ln) => !isBg(ln) && !isDuet(ln));
    if (normals.length) fg = normals[0];
    else if (lastFg && !(lastFg.startMs <= ms && ms < lastFg.endMs)) fg = lastFg; // 间隙保持
    else {
      const duets = active.filter(isDuet);
      const bgs = active.filter(isBg);
      if (duets.length) fg = duets[0];
      else if (bgs.length) fg = bgs[0];
    }

    let bgSlots = [];
    if (fg) {
      const fgText = lineText(fg);
      const candidates = active.filter((ln) => ln !== fg && (isDuet(ln) || isBg(ln)));
      const pool = candidates.filter((ln) => lineText(ln) !== fgText);
      const sorted = [...pool];
      if (maxBg === 1) {
        sorted.sort((a, b) => (isDuet(a) === isDuet(b) ? b.startMs - a.startMs : (isDuet(a) ? -1 : 1)));
      } else {
        sorted.sort((a, b) => (isDuet(a) === isDuet(b) ? a.startMs - b.startMs : (isDuet(a) ? -1 : 1)));
      }
      bgSlots = sorted.slice(0, Math.max(0, maxBg));
    }

    return { fg, bgSlots, active };
  }

  /**
   * 把行数组按「时间轴重叠」聚成连通簇。
   *
   * 扫描线：维护当前簇的最大 endMs，下一行起点 >= 该值即断开。
   * 背景行与主行重叠是设计意图，同样计入簇。
   *
   * @param {Array<object>} lines 规范化行
   * @returns {Array<{startMs: number, endMs: number, indices: number[], peak: number}>}
   */
  function groupOverlaps(lines) {
    const list = lines || [];
    const groups = [];
    let current = null;
    for (const line of list) {
      if (!current || line.startMs >= current.endMs) {
        current = { startMs: line.startMs, endMs: line.endMs, indices: [line.index], peak: 1 };
        groups.push(current);
      } else {
        current.indices.push(line.index);
        if (line.endMs > current.endMs) current.endMs = line.endMs;
      }
    }
    // 峰值并发数（簇内逐点扫描，簇规模有限）
    for (const group of groups) {
      const members = group.indices.map((i) => list[i]).filter(Boolean);
      const points = [...new Set(members.flatMap((m) => [m.startMs, m.endMs]))].sort((a, b) => a - b);
      let peak = 0;
      for (const t of points) {
        const n = members.filter((m) => m.startMs <= t && t < m.endMs).length;
        if (n > peak) peak = n;
      }
      group.peak = peak;
    }
    return groups;
  }

  /**
   * 区间图着色（贪心）：给一组区间分配互不冲突的「泳道」编号。
   *
   * 同一泳道内的区间两两不重叠。贪心按起点升序、优先复用已释放的最小泳道号，
   * 得到的泳道数是区间图着色的最优解（区间图是完美图）。
   *
   * @param {Array<{startMs: number, endMs: number}>} intervals
   * @returns {number[]} 与入参等长的泳道编号数组（从 0 开始）
   */
  function packLanes(intervals) {
    const items = (intervals || []).map((iv, order) => ({
      startMs: Number(iv.startMs) || 0,
      endMs: Number(iv.endMs) || 0,
      order,
    }));
    items.sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs || a.order - b.order);
    const laneEnds = []; // laneEnds[lane] = 该泳道已占用的最大 endMs
    const result = new Array(intervals.length).fill(0);
    for (const item of items) {
      let lane = -1;
      for (let i = 0; i < laneEnds.length; i += 1) {
        if (laneEnds[i] <= item.startMs) { lane = i; break; }
      }
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(item.endMs);
      } else {
        laneEnds[lane] = item.endMs;
      }
      result[item.order] = lane;
    }
    return result;
  }

  /**
   * 窗口虚拟化：取 [ms - beforeMs, ms + afterMs] 内应当驻留 DOM 的行下标。
   *
   * 只保留与窗口相交的行（相交而非包含：跨越窗口的长行也要保留）。
   *
   * @param {Array<object>} lines 规范化行
   * @param {number} ms 当前时刻
   * @param {object} [options]
   * @param {number} [options.beforeMs=6000] 回看窗口
   * @param {number} [options.afterMs=8000] 前瞻窗口
   * @returns {number[]} 行下标（升序）
   */
  function computeWindow(lines, ms, options = {}) {
    const beforeMs = Number.isFinite(options.beforeMs) ? options.beforeMs : 6000;
    const afterMs = Number.isFinite(options.afterMs) ? options.afterMs : 8000;
    const t = Number(ms) || 0;
    const from = t - beforeMs;
    const to = t + afterMs;
    const out = [];
    for (const line of lines || []) {
      if (line.endMs < from) continue;
      if (line.startMs > to) break; // 已按 startMs 升序
      out.push(line.index);
    }
    return out;
  }

  /**
   * 统计模型的结构信息，用于 demo 顶栏与自检断言。
   *
   * @param {Array<object>} lines 规范化行
   * @returns {{total: number, main: number, duet: number, bg: number, overlapGroups: number, peakConcurrent: number, durationMs: number}}
   */
  function summarize(lines) {
    const list = lines || [];
    const groups = groupOverlaps(list);
    let peakConcurrent = 0;
    for (const group of groups) if (group.peak > peakConcurrent) peakConcurrent = group.peak;
    return {
      total: list.length,
      main: list.filter((l) => l.role === ROLE.MAIN).length,
      duet: list.filter((l) => l.role === ROLE.DUET).length,
      bg: list.filter((l) => l.role === ROLE.BG).length,
      overlapGroups: groups.filter((g) => g.indices.length > 1).length,
      peakConcurrent,
      durationMs: list.length ? Math.max(...list.map((l) => l.endMs)) : 0,
    };
  }

  /**
   * 进度百分比 → 词级填充进度（0~1）。
   * 逐字歌词的填充进度由当前活动词的时间区间决定；无词时按整行区间线性推进。
   *
   * @param {object} line 行
   * @param {number} ms 当前时刻
   * @returns {number} 0~1
   */
  function lineProgress(line, ms) {
    if (!line) return 0;
    const words = line.words || [];
    if (words.length) {
      let done = 0;
      for (const w of words) {
        const ws = Number(w.startTime);
        const we = Number(w.endTime);
        if (!Number.isFinite(ws)) continue;
        const end = Number.isFinite(we) && we > ws ? we : ws;
        if (ms >= end) done += end - ws;
        else if (ms > ws) done += ms - ws;
      }
      const total = words.reduce((sum, w) => {
        const ws = Number(w.startTime);
        const we = Number(w.endTime);
        if (!Number.isFinite(ws)) return sum;
        return sum + Math.max(0, (Number.isFinite(we) ? we : ws) - ws);
      }, 0);
      return total > 0 ? Math.max(0, Math.min(1, done / total)) : 0;
    }
    const span = line.endMs - line.startMs;
    return span > 0 ? Math.max(0, Math.min(1, (ms - line.startMs) / span)) : 0;
  }

  /* ══ 3/7 来源 demos/ttml-lyric-modes/js/engine/spring.js（删 export）══ */

  /**
   * 弹簧物理 —— 阻尼谐振子的解析解，用于所有位移与缩放动画。
   *
   * 为什么不用 CSS transition / 线性插值：
   *
   *  - 线性插值（我最初的做法）在目标点改变时会**速度突变**，多行同时滚动时
   *    观感是「一格一格跳」；弹簧则天然连续，且带轻微过冲，这是 AMLL 类效果的
   *    核心手感来源。
   *  - CSS transition 的问题是**无法在动画中途改变目标而不跳变**：歌词滚动会
   *    在行边界反复改变目标位置，插值实现会丢掉当前速度。
   *
   * 解析解而非数值积分：给定初位置、初速度、目标位置，直接求出任意时刻的位置
   * 闭式表达式。因此是**帧率无关**的 —— 30fps 与 120fps 下轨迹完全一致，
   * 不会因为掉帧而走样（数值积分版本会）。
   *
   * 数学形式（欠阻尼）：
   *   x(t) = target - (cos(ω_d t)·Δ + sin(ω_d t)·L) · e^(-ζ t)
   * 其中 Δ = target - from，L 由初速度与 Δ 决定，ω_d 为阻尼角频率。
   * 过阻尼（ζ ≥ 1）时退化为纯指数收敛，不带振荡。
   *
   * 参数默认值 (mass=1, damping=10, stiffness=100) 给出临界阻尼附近的收敛，
   * 约 0.5s 到位且几乎不过冲 —— 适合歌词滚动这种需要「跟手但不抖」的场景。
   */

  /** 默认弹簧参数。 */
  const DEFAULT_SPRING = Object.freeze({
    mass: 1,
    damping: 10,
    stiffness: 100,
    soft: false,
  });

  /**
   * 求弹簧位移函数。
   *
   * @param {number} from 起始位置
   * @param {number} velocity 起始速度（单位/秒）
   * @param {number} to 目标位置
   * @param {number} [delay=0] 延迟（秒）；延迟期间保持起始位置
   * @param {object} [params] 弹簧参数
   * @returns {(t: number) => number} 位置关于时间的函数（t 为秒）
   */
  function solveSpring(from, velocity, to, delay = 0, params = {}) {
    const {
      mass = DEFAULT_SPRING.mass,
      damping = DEFAULT_SPRING.damping,
      stiffness = DEFAULT_SPRING.stiffness,
      soft = DEFAULT_SPRING.soft,
    } = params;

    const delta = to - from;

    // 过阻尼 / 临界阻尼 / soft：无振荡的指数收敛
    if (soft || 1 <= damping / (2 * Math.sqrt(stiffness * mass))) {
      const omega = -Math.sqrt(stiffness / mass);
      const leftover = -omega * delta - velocity;
      return (t) => {
        const tt = t - delay;
        if (tt < 0) return from;
        return to - (delta + tt * leftover) * Math.E ** (tt * omega);
      };
    }

    // 欠阻尼：带振荡的收敛
    const dampingFreq = Math.sqrt(4 * mass * stiffness - damping ** 2);
    const leftover = (damping * delta - 2 * mass * velocity) / dampingFreq;
    const dfm = (0.5 * dampingFreq) / mass;
    const dm = -(0.5 * damping) / mass;

    return (t) => {
      const tt = t - delay;
      if (tt < 0) return from;
      return to - (Math.cos(tt * dfm) * delta + Math.sin(tt * dfm) * leftover) * Math.E ** (tt * dm);
    };
  }

  /**
   * 求弹簧位移函数的一阶导数（速度），用于在动画中途改变目标时接续速度。
   *
   * 用**前向差分**而非中心差分：解析解在 t<0 时返回起始值（延迟区间），
   * 中心差分会在 t=0 处采到负时间而被钳制值污染，导致初速度被低估一半
   * （实测 v=50 被算成 25.24）。前向差分只用 t 与 t+h，不受该钳制影响。
   *
   * 之所以用差分而不是解析求导：解析式对过阻尼/欠阻尼两个分支要各写一份，
   * 出错风险高；而这里的量只用于设置初速度，一阶精度已足够。
   *
   * @param {(t: number) => number} solver 位移函数
   * @param {number} [h=1e-4] 差分步长
   * @returns {(t: number) => number} 速度函数
   */
  function velocityOf(solver, h = 1e-4) {
    return (t) => (solver(t + h) - solver(t)) / h;
  }

  /**
   * 一个弹簧标量：跟踪某个目标值，逐帧推进。
   *
   * 用法（每帧）：
   *   spring.setTarget(100);
   *   spring.update(deltaSeconds);
   *   const y = spring.position;
   */
  class Spring {
    /**
     * @param {number} initial 初始位置
     * @param {object} [params] 弹簧参数
     */
    constructor(initial = 0, params = {}) {
      this.params = { ...DEFAULT_SPRING, ...params };
      this.targetPosition = initial;
      this.currentPosition = initial;
      this.currentTime = 0;
      this._solver = () => this.targetPosition;
      this._velocity = () => 0;
      /** 延迟生效的目标（秒）与位置，用于级联动画。 */
      this._queuedTarget = null;
    }

    /** 位置是否已足够接近目标（可提前收敛，省掉后续计算）。 */
    get arrived() {
      return (
        Math.abs(this.targetPosition - this.currentPosition) < 0.01
        && Math.abs(this._velocity(this.currentTime)) < 0.01
        && this._queuedTarget === null
      );
    }

    /** 当前位置。 */
    get position() {
      return this.currentPosition;
    }

    /** 立即跳到位（不做动画）。 */
    setPosition(value) {
      this.targetPosition = value;
      this.currentPosition = value;
      this._solver = () => this.targetPosition;
      this._velocity = () => 0;
      this._queuedTarget = null;
    }

    /**
     * 设置新的目标位置。
     *
     * 关键点：从**当前位置与当前速度**重解，因此动画中途改目标不会跳变。
     * 这正是 CSS transition 做不到、而歌词滚动必须要的能力。
     *
     * @param {number} value 目标位置
     * @param {number} [delay=0] 延迟（秒）
     */
    setTarget(value, delay = 0) {
      if (delay <= 0 && Math.abs(this.targetPosition - value) < 0.001) {
        this._queuedTarget = null;
        return;
      }
      if (delay > 0) {
        this._queuedTarget = { position: value, time: delay };
        return;
      }
      this._queuedTarget = null;
      this.targetPosition = value;
      this._resetSolver();
    }

    /** 修改弹簧参数（可在运行中改，例如进入间奏时放松）。 */
    updateParams(params = {}, delay = 0) {
      if (delay > 0) {
        this._queuedParams = { ...params, time: delay };
        return;
      }
      this.params = { ...this.params, ...params };
      this._resetSolver();
    }

    _resetSolver() {
      // 用当前速度作为新解的初速度，保证 C1 连续（不跳变）
      const v = this._velocity(this.currentTime);
      this.currentTime = 0;
      this._solver = solveSpring(
        this.currentPosition,
        v,
        this.targetPosition,
        0,
        this.params,
      );
      this._velocity = velocityOf(this._solver);
    }

    /**
     * 推进时间。
     *
     * @param {number} delta 时间步长（秒）
     */
    update(delta = 0) {
      this.currentTime += delta;
      this.currentPosition = this._solver(this.currentTime);

      if (this._queuedParams) {
        this._queuedParams.time -= delta;
        if (this._queuedParams.time <= 0) {
          const { time, ...rest } = this._queuedParams;
          this._queuedParams = null;
          this.updateParams(rest);
        }
      }
      if (this._queuedTarget) {
        this._queuedTarget.time -= delta;
        if (this._queuedTarget.time <= 0) {
          const p = this._queuedTarget.position;
          this._queuedTarget = null;
          this.setTarget(p);
        }
      }
      if (this.arrived) this.setPosition(this.targetPosition);
    }
  }

  /** 创建一组弹簧（用于按行号索引的批量位移）。 */
  function createSpringMap(initial = 0, params = {}) {
    const map = new Map();
    return {
      get(key) {
        if (!map.has(key)) map.set(key, new Spring(initial, params));
        return map.get(key);
      },
      update(delta) {
        for (const spring of map.values()) spring.update(delta);
      },
      /** 是否全部到位（全部到位则可跳过本帧的样式写入）。 */
      get allArrived() {
        for (const spring of map.values()) if (!spring.arrived) return false;
        return true;
      },
      clear() {
        map.clear();
      },
      get size() {
        return map.size;
      },
    };
  }

  /* ══ 4/7 来源 demos/ttml-lyric-modes/js/engine/word-anim.js（删 export）══ */

  /**
   * 逐字动画 —— 用 Web Animations API（WAAPI）驱动。
   *
   * 为什么从「改 CSS 变量宽度」改成 WAAPI：
   *
   *  我最初用 `clip-path: inset(... var(--p))` + 每帧写自定义属性做揭字。
   *  问题是：① 每帧都要写样式（即便量化也只是减少次数）；② 只能表达「线性推进」，
   *  做不出 AMLL 那种字与字之间相位错开、带缓动的书写感；
   *  ③ 暂停/继续靠开关 CSS 动画，与行级动画难以精确同步。
   *
   *  WAAPI 的好处：动画时间轴由浏览器维护（**播放期零 JS 写入**），
   *  可以精确 `currentTime = t` 定位、`playbackRate = -1` 倒放、
   *  多个动画 `composite: "add"` 叠加（float + emphasize 互不覆盖）。
   *  这正是「性能优先」也能做得好看的原因。
   *
   * 本模块只做三件事：
   *  - 揭字（mask 位移）
   *  - 悬浮（float，字随时间轻微上浮）
   *  - 强调（emphasize，长音上的缩放 + 辉光 + 逐字错峰）
   */

  /** 强调动画的采样帧数。32 帧足以让缓动看起来平滑，又不必每帧计算。 */
  const FRAME_QUANTITY = 32;

  /** 缓动：进场与出场用不同曲线，形成「书写」感。 */
  function bezierIn(x) {
    // 近似 cubic-bezier(0.2, 0.4, 0.58, 1.0)
    const t = x;
    return 1 - (1 - t) ** 3 * (1 - 0.2 * t);
  }
  function bezierOut(x) {
    // 近似 cubic-bezier(0.3, 0.0, 0.58, 1.0)
    const t = x;
    return t ** 3 * (1 - 0.3 * (1 - t));
  }

  const clamp01 = (x) => (x < 0 ? 0 : (x > 1 ? 1 : x));
  const clampPositive = (x) => (x < 0 ? 0 : x);

  /** 分段缓动：前半段用进场曲线，后半段用出场曲线。 */
  function makeSplitEasing(mid = 0.5) {
    return (x) => (x < mid
      ? bezierIn(clamp01(x / mid))
      : 1 - bezierOut(clamp01((x - mid) / (1 - mid))));
  }

  /** 生成「中间亮、两侧暗」的横向渐变，配合 mask-position 形成书写拖尾。 */
  function makeFadeMask(fadeWidth, width, brightAlpha = 1, darkAlpha = 0.2) {
    const totalAspect = 2 + (width > 0 ? fadeWidth / width : 0);
    const widthInTotal = width > 0 ? (fadeWidth / width) / totalAspect : 0;
    const leftPos = (1 - widthInTotal) / 2;
    const bright = `rgba(0,0,0,${brightAlpha})`;
    const dark = `rgba(0,0,0,${darkAlpha})`;
    return {
      image: `linear-gradient(to right,${bright} ${leftPos * 100}%,${dark} ${(leftPos + widthInTotal) * 100}%)`,
      size: `${totalAspect * 100}% 100%`,
    };
  }

  /**
   * 为一个词创建揭字动画。
   *
   * 实现思路：给词元素打一层 mask（中间透明的窄带），然后把 mask-position
   * 从「词左侧之外」线性推到「词右侧之外」。窄带扫过词面时即形成「正在书写」。
   * 相邻词的动画在时间上首尾相接，因此整行看起来是连续书写而非逐字闪跳。
   *
   * @param {HTMLElement} el 词元素
   * @param {object} opts
   * @param {number} opts.startTime 词起始（毫秒，绝对）
   * @param {number} opts.endTime 词结束（毫秒，绝对）
   * @param {number} opts.lineStartTime 行起始（毫秒，绝对）
   * @param {number} opts.totalDuration 行总时长（毫秒）
   * @param {number} opts.fadeWidth 拖尾宽度（像素）
   * @param {number} opts.width 词宽（像素）
   * @param {number} opts.padding 词内边距（像素）
   * @returns {Animation|null}
   */
  function createRevealAnimation(el, opts) {
    const {
      startTime, endTime, lineStartTime, totalDuration,
      fadeWidth, width, padding,
    } = opts;
    if (!el || !Number.isFinite(startTime) || !Number.isFinite(endTime)) return null;

    const w = Math.max(1, width || el.clientWidth || 1);
    const pad = padding || 0;
    const fade = Math.max(1, fadeWidth || w * 0.5);
    const duration = Math.max(1, totalDuration);

    const { image, size } = makeFadeMask(fade, w, 1, 0.4);
    el.style.maskImage = image;
    el.style.webkitMaskImage = image;
    el.style.maskRepeat = 'no-repeat';
    el.style.webkitMaskRepeat = 'no-repeat';
    el.style.maskOrigin = 'left';
    el.style.webkitMaskOrigin = 'left';
    el.style.maskSize = size;
    el.style.webkitMaskSize = size;

    // 窄带从「词左缘之外」扫到「词右缘之外」，扫过全程即完成揭字
    const from = -(w + pad * 2 + fade);
    const to = 0;
    // 词自身的时间区间映射到行时间轴上的相对位置
    const relStart = clamp01((startTime - lineStartTime) / duration);
    const relEnd = clamp01((Math.max(endTime, startTime + 1) - lineStartTime) / duration);

    const frames = [
      { offset: 0, maskPosition: `${from}px 0` },
      { offset: relStart, maskPosition: `${from}px 0` },
      { offset: relEnd, maskPosition: `${to}px 0` },
      { offset: 1, maskPosition: `${to}px 0` },
    ];

    try {
      const anim = el.animate(frames, { duration, id: `reveal-${startTime}`, fill: 'both' });
      anim.pause();
      return anim;
    } catch (error) {
      console.warn('[engine] 揭字动画创建失败', error);
      return null;
    }
  }

  /**
   * 悬浮动画：字在演唱期间轻微上浮。
   *
   * 用 `composite: "add"` 与揭字/强调动画叠加，互不覆盖 —— 这是 WAAPI 相对
   * CSS 变量的关键优势（多个动画可以合成到同一属性上）。
   */
  function createFloatAnimation(el, opts) {
    const { startTime, endTime, lineStartTime, isBg } = opts;
    if (!el || !Number.isFinite(startTime)) return null;

    const delay = Math.max(0, startTime - lineStartTime);
    let duration = Math.max(1000, (endTime || startTime + 1000) - startTime);
    let up = 0.05;
    if (isBg) up *= 2;

    try {
      const anim = el.animate(
        [{ transform: 'translateY(0px)' }, { transform: `translateY(${-up}em)` }],
        {
          duration, delay, id: 'float-word', composite: 'add', fill: 'both', easing: 'ease-out',
        },
      );
      anim.pause();
      return anim;
    } catch (error) {
      return null;
    }
  }

  /**
   * 强调动画：长音字上的缩放 + 辉光 + 逐字错峰。
   *
   * 参数按音长自适应：音越长，位移与辉光越明显（但设了上限，避免夸张）。
   */
  function createEmphasizeAnimations(el, opts) {
    const {
      startTime, endTime, lineStartTime, isBg,
      charIndex, charCount,
    } = opts;
    if (!el || !Number.isFinite(startTime)) return [];

    const delay = clampPositive(startTime - lineStartTime);
    let duration = Math.max(1000, (endTime || startTime + 1000) - startTime);

    let amount = duration / 2000;
    amount = amount > 1 ? Math.sqrt(amount) : amount ** 3;
    let blur = duration / 3000;
    blur = blur > 1 ? Math.sqrt(blur) : blur ** 3;
    amount *= 0.6;
    blur *= 0.5;
    amount = Math.min(1.2, amount);
    blur = Math.min(0.8, blur);

    const anchor = Math.max(1, charCount || 1);
    const perChar = (duration / 2.5) / anchor * (charIndex || 0);
    const wordDelay = delay + perChar;
    const easing = makeSplitEasing();

    const out = [];

    // 缩放 + 辉光
    try {
      const frames = new Array(FRAME_QUANTITY).fill(0).map((_, j) => {
        const x = (j + 1) / FRAME_QUANTITY;
        const p = easing(x);
        const scale = 1 + p * 0.1 * amount;
        const offsetX = -p * 0.03 * amount * ((charCount || 1) / 2 - (charIndex || 0));
        const offsetY = -p * 0.025 * amount;
        return {
          offset: x,
          transform: `scale(${scale.toFixed(4)}) translate(${offsetX.toFixed(4)}em, ${offsetY.toFixed(4)}em)`,
          textShadow: `0 0 ${Math.min(0.3, blur * 0.3).toFixed(3)}em rgba(255,255,255,${(p * blur).toFixed(3)})`,
        };
      });
      const glow = el.animate(frames, {
        duration, delay: wordDelay, id: 'emphasize-glow', iterations: 1,
        composite: 'replace', fill: 'both',
      });
      glow.onfinish = () => glow.pause();
      glow.pause();
      out.push(glow);
    } catch { /* 忽略单字失败 */ }

    // 额外上浮（与 float 叠加，因此 emphasize 时浮得更高）
    try {
      const frames = new Array(FRAME_QUANTITY).fill(0).map((_, j) => {
        const x = (j + 1) / FRAME_QUANTITY;
        let y = Math.sin(x * Math.PI);
        if (isBg) y *= 2;
        return { offset: x, transform: `translateY(${(-y * 0.05).toFixed(4)}em)` };
      });
      const float = el.animate(frames, {
        duration: duration * 1.4, delay: Math.max(0, wordDelay - 400),
        id: 'emphasize-float', iterations: 1, composite: 'add', fill: 'both',
      });
      float.onfinish = () => float.pause();
      float.pause();
      out.push(float);
    } catch { /* 忽略单字失败 */ }

    return out;
  }

  /**
   * 一组动画的统一控制句柄。
   *
   * 封装「按时刻定位 / 暂停 / 继续 / 倒放 / 销毁」，让渲染层不必理解
   * WAAPI 的细节，也让「性能优先」可以简单地只保留其一部分。
   */
  class WordAnimator {
    /**
     * @param {Array<Animation>} animations
     */
    constructor(animations = []) {
      this.animations = animations.filter(Boolean);
    }

    /** 是否为空（空则无需任何操作，供性能模式跳过）。 */
    get isEmpty() {
      return this.animations.length === 0;
    }

    /**
     * 按绝对时刻定位。
     *
     * @param {number} ms 当前时刻（绝对毫秒）
     * @param {number} lineStartTime 行起始（绝对毫秒）
     * @param {number} shouldPlay 是否应处于播放态
     */
    seek(ms, lineStartTime, shouldPlay) {
      const rel = clampPositive(ms - lineStartTime);
      for (const a of this.animations) {
        a.currentTime = rel;
        a.playbackRate = 1;
        const timing = a.effect?.getComputedTiming?.();
        const duration = Number(timing?.duration ?? 0);
        const delay = Number(timing?.delay ?? 0);
        if (shouldPlay && rel < delay + duration) a.play();
        else a.pause();
      }
    }

    /** 暂停（保持当前帧）。 */
    pause() {
      for (const a of this.animations) a.pause();
    }

    /** 继续。 */
    resume() {
      for (const a of this.animations) {
        const timing = a.effect?.getComputedTiming?.();
        const duration = Number(timing?.duration ?? 0);
        const delay = Number(timing?.delay ?? 0);
        const t = Number(a.currentTime) || 0;
        if (a.playState !== 'finished' && t < delay + duration) a.play();
      }
    }

    /**
     * 倒放退场。
     *
     * 为什么用倒放而不是另做一套退场动画：倒放天然「原路返回」，
     * 观感上像字被收回去，且不需要维护第二套关键帧。
     */
    reverse() {
      for (const a of this.animations) {
        if (a.id === 'float-word' || String(a.id).includes('float')) {
          a.playbackRate = -1;
          a.play();
        }
      }
    }

    /** 取消全部动画（释放浏览器资源）。 */
    cancel() {
      for (const a of this.animations) {
        try { a.cancel(); } catch { /* 已取消 */ }
      }
      this.animations = [];
    }
  }

  /* ══ 5/7 来源 demos/ttml-lyric-modes/js/engine/line.js（删 export + 差异 a）══ */

  /**
   * 行元素 —— 一条主行 + 可选的一条**嵌套**背景行。
   *
   * 这是相对我第一版最重要的结构修正。
   *
   * 第一版把背景行当成「独立的行」排进行序列，于是它必须和主行争夺同一个
   * 滚动位置，只能用泳道错开或卫星偏移来回避冲突 —— 这是治标。
   *
   * AMLL 的做法是：背景行**嵌在主行的包裹元素里**，作为一个
   * `bgWrapper` 子元素存在，并拥有自己独立的纵向弹簧（slideY）与缩放。
   * 于是：
   *   - 主行与背景行共享同一个「行位置」，天然同屏，不需要泳道；
   *   - 背景行可以独立做「折叠/展开」动画（未演唱时折叠收敛，演唱时展开）；
   *   - 背景行可以按时间先后出现在主行**上方**（bgFirst）或下方。
   *
   * 结构：
   *   .eng-group            ← 滚动位置由此元素承担
   *     .eng-bgWrapper      ← 仅在 bgFirst 时插到主行之前
   *     .eng-line.eng-main  ← 主行
   *     .eng-bgWrapper      ← 否则在主行之后
   *
   * 每个 .eng-line 内部固定三层：正文 / 翻译 / 音译，避免频繁增删节点。
   */

  /** 判断一个词是否值得做强调动画（长音、或含 CJK 的多字词）。 */
  function shouldEmphasize(word, duration) {
    const text = String(word?.word ?? '').trim();
    if (!text) return false;
    // 时长达阈值的长音，或含标点延长的词
    if (duration >= 900) return true;
    return /[~～ー—…♪]/.test(text);
  }

  /**
   * 一个词的可视元素与动画句柄。
   * @typedef {{word: object, el: HTMLElement, animator: WordAnimator, subEls: HTMLElement[]}} WordEntry
   */

  /**
   * 渲染一行（不含背景行）的元素与内容。
   */
  class LineElement {
    /**
     * @param {object} line 规范化行
     * @param {object} [options]
     * @param {boolean} [options.dynamic=true] 是否启用逐字动画
     * @param {number} [options.fadeWidthRatio=0.6] 揭字拖尾宽度相对字高的比例
     */
    constructor(line, options = {}) {
      this.line = line;
      this.options = { dynamic: true, fadeWidthRatio: 0.6, ...options };

      /** @type {HTMLElement} */
      this.el = document.createElement('div');
      this.el.className = 'eng-line';
      this.el.dataset.role = line.role;
      if (line.isDuet) this.el.classList.add('eng-duet');
      if (line.role === ROLE.BG) this.el.classList.add('eng-bg');
      this.el.dataset.index = String(line.index);

      this.mainEl = document.createElement('div');
      this.mainEl.className = 'eng-main';
      this.transEl = document.createElement('div');
      this.transEl.className = 'eng-sub eng-trans';
      this.romanEl = document.createElement('div');
      this.romanEl.className = 'eng-sub eng-roman';
      this.el.append(this.mainEl, this.transEl, this.romanEl);

      /** @type {WordEntry[]} */
      this.words = [];
      this.built = false;
      this.visible = false;
    }

    /** 取本行的纯文本（用于调试与断言）。 */
    get text() {
      return String(this.line.text || '');
    }

    /**
     * 构建行内 DOM 与动画。仅在进入可视区时调用（延迟构建）。
     */
    build() {
      if (this.built) return;
      this.built = true;

      const words = this.line.words?.length
        ? this.line.words
        : [{ word: this.line.text || '♪', startTime: this.line.startMs, endTime: this.line.endMs }];

      const nonDynamic = !this.options.dynamic;
      if (nonDynamic) {
        // 非逐字模式：整行文本，无动画，成本最低
        this.mainEl.textContent = words.map((w) => String(w.word ?? '')).join('');
      } else {
        for (const word of words) {
          const raw = String(word.word ?? '');
          // 关键：**不能 trim**。
          // 真实 TTML 把词间空格写在 span 内部（<span>When </span>），
          // trim 会吃掉这个空格，英文歌词会连成一片
          //（"When the first light" → "Whenthefirstlight"）。
          // 与 CSS 的 white-space: pre-wrap 配合即可正确渲染。
          if (!raw.trim()) {
            // 纯空白：作为文本节点，保留原样
            this.mainEl.appendChild(document.createTextNode(raw));
            continue;
          }
          const el = document.createElement('span');
          el.className = 'eng-word';
          // 保留首尾空白；仅去掉可能存在的换行/制表（它们由解析器转为空格）
          el.textContent = raw.replace(/[\r\n\t]+/g, ' ');
          this.mainEl.appendChild(el);

          const start = Number.isFinite(word.startTime) ? word.startTime : this.line.startMs;
          const end = Number.isFinite(word.endTime) && word.endTime > start
            ? word.endTime : start + 300;
          const duration = end - start;

          const anims = [];
          const floatAnim = createFloatAnimation(el, {
            startTime: start,
            endTime: end,
            lineStartTime: this.line.startMs,
            isBg: this.line.role === ROLE.BG,
          });
          if (floatAnim) anims.push(floatAnim);

          if (shouldEmphasize(word, duration)) {
            // 强调是针对「词内每个字符」做错峰的，因此这里为整词做一个整体强调
            anims.push(...createEmphasizeAnimations(el, {
              startTime: start,
              endTime: end,
              lineStartTime: this.line.startMs,
              isBg: this.line.role === ROLE.BG,
              charIndex: 0,
              charCount: 1,
            }));
            el.classList.add('eng-emphasize');
          }

          this.words.push({ word, el, animator: new WordAnimator(anims), subEls: [] });
        }
      }

      if (this.line.translatedLyric) this.transEl.textContent = this.line.translatedLyric;
      if (this.line.romanLyric) this.romanEl.textContent = this.line.romanLyric;
    }

    /**
     * 构建揭字动画。
     *
     * 必须在元素已挂载、且完成一次布局之后调用 —— 因为要读字宽。
     * 这也是 `updateMaskImage` 的职责。
     */
    buildRevealAnimations() {
      if (!this.options.dynamic || !this.words.length) return;
      let changed = false;
      for (const entry of this.words) {
        if (entry.reveal) continue;
        const el = entry.el;
        const padding = Number.parseFloat(getComputedStyle(el).paddingLeft) || 0;
        const width = Math.max(1, el.clientWidth - padding * 2);
        const height = Math.max(1, el.clientHeight - padding * 2);
        const fadeWidth = height * this.options.fadeWidthRatio;
        const start = Number.isFinite(entry.word.startTime) ? entry.word.startTime : this.line.startMs;
        const end = Number.isFinite(entry.word.endTime) && entry.word.endTime > start
          ? entry.word.endTime : start + 300;
        const anim = createRevealAnimation(el, {
          startTime: start,
          endTime: end,
          lineStartTime: this.line.startMs,
          totalDuration: Math.max(1, this.line.endMs - this.line.startMs),
          fadeWidth,
          width,
          padding,
        });
        if (anim) {
          entry.reveal = anim;
          entry.animator.animations.push(anim);
          changed = true;
        }
      }
      return changed;
    }

    /**
     * 按当前时刻定位全部动画。
     *
     * @param {number} ms 当前时刻
     * @param {boolean} isActive 是否为当前活动行
     * @param {boolean} isPlaying 是否播放中
     */
    seek(ms, isActive, isPlaying) {
      for (const entry of this.words) {
        entry.animator.seek(ms, this.line.startMs, isPlaying && isActive);
      }
    }

    /** 标记为活动行（触发揭字与强调）。 */
    setActive(active) {
      if (this._active === active) return false;
      this._active = active;
      this.el.classList.toggle('is-active', active);
      if (!active) {
        // 退场：倒放悬浮动画，形成「字被收回」的观感
        for (const entry of this.words) entry.animator.reverse();
      }
      return true;
    }

    /** 从 DOM 移除并释放动画（视口剔除时调用）。 */
    teardown() {
      for (const entry of this.words) entry.animator.cancel();
      this.words = [];
      this.mainEl.textContent = '';
      this.transEl.textContent = '';
      this.romanEl.textContent = '';
      this.built = false;
      this._active = undefined;
    }

    /** 彻底销毁。 */
    dispose() {
      this.teardown();
      this.el.remove();
    }
  }

  /**
   * 一个「行组」—— 主行 + 可选嵌套背景行。
   *
   * 承担滚动位置（posY 弹簧），并管理背景行的折叠/展开（bgSlideY 弹簧）。
   */
  class LineGroup {
    /**
     * @param {object} group 来自 optimize.buildGroups 的组
     * @param {object} [options]
     * @param {(line: object, options: object) => LineElement} [options.createLine] 行工厂（供子类/方案定制）
     */
    constructor(group, options = {}) {
      this.group = group;
      this.main = options.createLine ? options.createLine(group.main, options) : new LineElement(group.main, options);
      this.bg = group.bg
        ? (options.createLine ? options.createLine(group.bg, options) : new LineElement(group.bg, options))
        : null;

      this.el = document.createElement('div');
      this.el.className = 'eng-group';
      if (group.main.isDuet || group.bg?.line?.isDuet) this.el.classList.add('eng-group-duet');
      this.el.dataset.groupStart = String(Math.round(group.startMs));
      // 差异 a：主项目「点歌词跳转」按 data-time（秒）定位，demo 里没有这一项
      this.el.dataset.time = String((group.main.startMs || 0) / 1000);

      // 背景行先于主行起唱 → 放到主行上方，展开方向相反
      const bgStart = group.bg
        ? (group.bg.words?.[0]?.startTime ?? group.bg.startMs)
        : 0;
      const mainStart = group.main.words?.[0]?.startTime ?? group.main.startMs;
      this.bgFirst = Boolean(group.bg) && bgStart < mainStart;

      this.bgWrapper = null;
      if (this.bg) {
        this.bgWrapper = document.createElement('div');
        this.bgWrapper.className = 'eng-bg-wrap';
        if (this.bgFirst) this.bgWrapper.classList.add('eng-bg-wrap-top');
        this.bgWrapper.appendChild(this.bg.el);
        // 主行内部的三个子元素是 mainEl/transEl/romanEl，需插到整个 line 元素之前/之后
        if (this.bgFirst) this.el.appendChild(this.bgWrapper);
        this.el.appendChild(this.main.el);
        if (!this.bgFirst) this.el.appendChild(this.bgWrapper);
      } else {
        this.el.appendChild(this.main.el);
      }

      this.built = false;
      /** 组内两行的测量高度（前缀和用）。 */
      this.height = 0;
    }

    get startMs() { return this.group.startMs; }

    get endMs() { return this.group.endMs; }

    /** 构建组内内容（延迟到进入可视区）。 */
    build() {
      if (this.built) return;
      this.built = true;
      this.main.build();
      this.bg?.build();
    }

    /** 构建揭字动画（需已挂载并完成布局）。 */
    buildRevealAnimations() {
      this.main.buildRevealAnimations();
      this.bg?.buildRevealAnimations();
    }

    /**
     * 测量组高。
     *
     * 注意背景行是绝对定位或折叠的，测高时必须以「展开态」测量，
     * 否则会把折叠状态的高度当成真实高度，导致滚动距离偏小。
     */
    measure(expanded = true) {
      const prev = this.bgWrapper?.dataset.mode;
      if (expanded && this.bgWrapper) this.bgWrapper.dataset.mode = 'expanded';
      const h = this.el.offsetHeight || 0;
      if (expanded && this.bgWrapper) {
        if (prev === undefined) delete this.bgWrapper.dataset.mode;
        else this.bgWrapper.dataset.mode = prev;
      }
      this.height = h;
      return h;
    }

    /**
     * 更新活动状态与动画时刻。
     *
     * @param {number} ms
     * @param {boolean} isActive
     * @param {boolean} isPlaying
     */
    update(ms, isActive, isPlaying) {
      this.main.setActive(isActive);
      this.main.seek(ms, isActive, isPlaying);
      if (this.bg) {
        // 背景行只要在自身时间窗内就应活跃（它与主行并行，不一定与主行同时起止）
        const bgActive = ms >= this.bg.line.startMs && ms < this.bg.line.endMs;
        this.bg.setActive(bgActive);
        this.bg.seek(ms, bgActive, isPlaying);
      }
    }

    /** 释放内容（视口剔除）。 */
    teardown() {
      this.main.teardown();
      this.bg?.teardown();
      this.built = false;
    }

    /** 彻底销毁。 */
    dispose() {
      this.main.dispose();
      this.bg?.dispose();
      this.el.remove();
    }
  }

  /* ══ 6/7 来源 demos/ttml-lyric-modes/js/engine/layout.js（删 export + 差异 b/c）══ */

  /**
   * 布局引擎 —— 像素级滚动 + 每行独立弹簧 + 视口剔除。
   *
   * 这是整套效果的「骨架」。三个设计决定，每一个都针对我第一版的具体缺陷：
   *
   * ① **每行各有一条 Y 弹簧**，而不是「一个全局滚动偏移」。
   *    第一版用「当前行下标 × 固定行高」算位移，公式上等于是「整体匀速平移」，
   *    所有行同时启动、同时停止，观感僵硬。改成每行独立弹簧后：
   *      - 各行的目标位置一次算好，但**分别**用弹簧收敛，天然产生错峰；
   *      - 再叠加逐行递减的 delay（`baseDelay /= 1.05`），形成自下而上的涟漪。
   *    这是 AMLL 手感的关键，也是单纯调 CSS transition 做不出来的。
   *
   * ② **剔除按像素而非按行号**。第一版写死「距焦点 12 行以外剔除」，
   *    但行高是变化的（背景行更矮、长行会换行），按行号剔除要么切太早、
   *    要么留太多离屏节点。按像素 overscan(300px) 判断才是正确的量纲。
   *
   * ③ **剔除时 `teardown()` 释放 WAAPI 动画**，不只是隐藏。
   *    一个 77 行的样本若每行都有逐字动画，浏览器要维护上千条动画时间轴；
   *    离屏即释放，回到视野再重建（`build()` 是幂等的）。
   */

  /** 冻结的默认参数。 */
  const LAYOUT_DEFAULTS = Object.freeze({
    /** 焦点行在视口中的纵向比例（0.35 = 略高于中线，符合阅读习惯）。 */
    alignPosition: 0.35,
    /** 视口外仍渲染的像素余量。 */
    overscanPx: 300,
    /** 逐行级联延迟的基数（秒）与衰减比。 */
    baseDelay: 0.05,
    delayDecay: 1.05,
    /** 焦点对齐锚点：中心 / 顶部 / 底部。 */
    anchor: 'center',
    /** 是否启用弹簧；关掉则直接跳位（性能模式）。 */
    enableSpring: true,
    /** 是否启用模糊。 */
    enableBlur: true,
    /** 模糊强度倍率（性能模式可设为 0.5 做「轻量模糊」）。 */
    blurScale: 1,
    /** 是否启用逐字动画（关掉则整行文本，成本最低）。 */
    dynamic: true,
    /** 已唱过的行是否淡出隐藏。 */
    hidePassedLines: false,
    /** 弹簧参数。 */
    spring: { mass: 1, damping: 10, stiffness: 100 },
  });

  const ANCHOR_FACTOR = Object.freeze({ top: 0, center: 0.5, bottom: 1 });

  /**
   * 歌词布局引擎。
   *
   * 生命周期：
   *   new LyricLayoutEngine(opts)
   *   engine.mount(host)
   *   engine.setGroups(groups)     // 来自 engine/optimize.buildGroups
   *   engine.update(ms, isPlaying) // 每帧
   *   engine.destroy()
   */
  class LyricLayoutEngine {
    /**
     * @param {object} [options] 覆盖 LAYOUT_DEFAULTS
     */
    constructor(options = {}) {
      this.opts = { ...LAYOUT_DEFAULTS, ...options };
      /** @type {LineGroup[]} */
      this.groups = [];
      /** 每组的弹簧（按 index 对齐 this.groups）。 */
      this.springs = [];
      /** 每组高度。 */
      this.heights = [];
      /** 前缀和：prefix[i] = 前 i 组高度之和。 */
      this.prefix = [0];
      /** 每组的背景行折叠弹簧（用于背景行的展开/收起）。 */
      this.bgSprings = [];

      this.host = null;
      this.size = [0, 0];
      this.scrollToIndex = 0;
      this.lastActiveIndex = -1;
      this.measured = false;
      this._rafPending = false;
      this._onResize = null;
    }

    /* ── 生命周期 ─────────────────────────────────────────────────────── */

    /** 挂载到宿主元素。 */
    mount(host) {
      this.host = host;
      this.measureSize();
      this._onResize = () => {
        this.measureSize();
        this.measure();
        // 尺寸变化后必须强制重排一次，否则弹簧会从旧位置缓慢爬过去
        const now = this._lastMs ?? 0;
        this.update(now, this._lastPlaying ?? false, true);
      };
      window.addEventListener('resize', this._onResize);
    }

    /** 测量视口尺寸。 */
    measureSize() {
      this.size = [this.host?.clientWidth || 900, this.host?.clientHeight || 460];
    }

    /* ① 差异 b：relayout()：字号/尺寸变化后重测并强制重排。
          为什么必须重测：滚动数学依赖 offsetHeight 前缀和；字号一变，行高全变，
          不重测就会压叠或拉出巨缝（demo README「CSS 度量守卫」记录了同类事故）。 */
    relayout() {
      this.measureSize();
      this.measure();
      const now = this._lastMs ?? 0;
      this.update(now, this._lastPlaying ?? false, true);
    }

    /* ③ 差异 c：ensureSized()：宿主尺寸从 0 变为非 0 时自动 relayout 的一次性检查
          （调用方在 setGroups 后调用），避免移动端首次打开面板时空白。 */
    ensureSized() {
      if (this.size[1]) return true;
      this.measureSize();
      if (!this.size[1]) return false;
      this.relayout();
      return true;
    }

    /**
     * 设置行组：构建 DOM、测量高度、重置弹簧。
     *
     * @param {Array<{main: object, bg: object|null, startMs: number, endMs: number}>} groups
     */
    setGroups(groups) {
      this.destroyGroups();
      this.groups = groups.map((g) => new LineGroup(g, {
        dynamic: this.opts.dynamic,
        ...(this.opts.lineOptions || {}),
      }));
      this.springs = this.groups.map(() => new Spring(0, this.opts.spring));
      this.bgSprings = this.groups.map(() => new Spring(this.opts.bgHiddenSlide ?? -80, this.opts.spring));
      for (const group of this.groups) {
        if (this.host) this.host.appendChild(group.el);
      }
      this.measure();
      this.measured = true;
      this.scrollToIndex = 0;
      this.lastActiveIndex = -1;
    }

    /**
     * 测量所有组高并重建前缀和。
     *
     * 两个必须遵守的前提，缺一个就会测出错的高度，进而让整个滚动数学失准：
     *
     *  1. **先 build() 再测**。行内容是延迟构建的（进入视口才建），
     *     若在空元素上量高度，只能得到 padding（实测 38px，而真实卡片约 119~166px）。
     *     前缀和因此被严重低估 → 行距过小 → 卡片互相压叠。
     *  2. **先置于可见 + 展开态**。`content-visibility` 与折叠的背景行都会
     *     让 offsetHeight 返回占位值而非真实高度。
     */
    measure() {
      if (!this.groups.length) {
        this.heights = [];
        this.prefix = [0];
        return;
      }
      const heights = [];
      for (const group of this.groups) {
        // 前提 1：确保内容已构建
        group.build();
        // 前提 2：临时解除离屏隐藏
        const wasHidden = group.el.dataset.offscreen === '1';
        if (wasHidden) group.el.dataset.offscreen = '0';
        heights.push(group.measure(true));
        if (wasHidden) group.el.dataset.offscreen = '1';
      }
      this.heights = heights;
      const prefix = [0];
      for (let i = 0; i < heights.length; i += 1) prefix.push(prefix[i] + heights[i]);
      this.prefix = prefix;
    }

    /* ── 活动行定位 ───────────────────────────────────────────────────── */

    /**
     * 由时刻求「当前应对齐到哪一组」。
     *
     * 用「最后一个起点 <= ms 的组」而不是「活动集合里最早的那组」：
     * 行与行之间常有空隙，若按活动集合判定，空隙期间会退回到更早的组，
     * 造成来回抖动。这与 AMLL 用 playbackCursor 单调推进的思路一致。
     *
     * @param {number} ms
     * @returns {number} 组下标
     */
    findScrollIndex(ms) {
      const n = this.groups.length;
      if (!n) return 0;
      let lo = 0;
      let hi = n - 1;
      let ans = 0;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (this.groups[mid].startMs <= ms) {
          ans = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
      return ans;
    }

    /**
     * 计算某组应处的像素 Y。
     *
     * Y(i) = 视口对齐线 + (prefix[i] - prefix[target]) - 目标组高 × 锚点系数
     *
     * @param {number} i 组下标
     * @param {number} target 对齐目标组下标
     * @returns {number}
     */
    yFor(i, target) {
      const alignY = this.size[1] * this.opts.alignPosition;
      const targetH = this.heights[target] ?? (this.size[1] / 5);
      const anchorFactor = ANCHOR_FACTOR[this.opts.anchor] ?? 0.5;
      return alignY + (this.prefix[i] - this.prefix[target]) - targetH * anchorFactor;
    }

    /**
     * 计算模糊与透明度。
     *
     * 模糊强度按「距活动区的行数」线性增长（上限 5px）——
     * 与 AMLL 一致：近处轻微虚化，远处重虚化，形成景深。
     *
     * @param {number} i 组下标
     * @param {number} activeIndex 当前活动组
     * @param {number} latestIndex 已进入的活动区末组
     * @param {boolean} isActive
     * @returns {{blur: number, opacity: number}}
     */
    fogFor(i, activeIndex, latestIndex, isActive) {
      let blur = 0;
      let opacity = 1;
      if (this.opts.enableBlur && !isActive) {
        blur = 1;
        if (i < activeIndex) blur += Math.abs(activeIndex - i) + 1;
        else blur += Math.abs(i - Math.max(activeIndex, latestIndex));
        if (window.innerWidth <= 1024) blur *= 0.8;
      }
      return { blur: Math.min(5, blur), opacity };
    }

    /* ── 每帧更新 ─────────────────────────────────────────────────────── */

    /* ② 差异 c：首行加上「宿主无尺寸则跳过」守卫，返回 false 表示未布局。
          移动端面板隐藏时宿主 clientHeight 恒为 0，此时测量得到的高度全是 0，
          会把所有组叠在一处；等面板打开（宿主有尺寸）后由 relayout() 补上。 */

    /**
     * 推进一帧。
     *
     * @param {number} ms 当前时刻（毫秒）
     * @param {boolean} isPlaying 是否播放中
     * @param {boolean} [force=false] 强制跳位（不跑弹簧，用于 seek / 首次布局）
     * @returns {boolean} 是否完成布局（宿主无尺寸/未测量时返回 false）
     */
    update(ms, isPlaying, force = false) {
      this._lastMs = ms;
      this._lastPlaying = isPlaying;
      if (!this.measured || !this.groups.length) return false;
      if (!this.size[1]) { this.measureSize(); if (!this.size[1]) return false; }

      const target = this.findScrollIndex(ms);
      this.scrollToIndex = target;
      this.lastActiveIndex = target;

      // 活动区末组：把「已经进入但还没唱完」的相邻组算作活动，避免刚起唱就被虚化
      let latestIndex = target;
      for (let i = target + 1; i < this.groups.length; i += 1) {
        if (this.groups[i].startMs <= ms + 1) latestIndex = i;
        else break;
      }

      const alignY = this.size[1] * this.opts.alignPosition;
      let delay = 0;
      let baseDelay = this.opts.baseDelay;

      for (let i = 0; i < this.groups.length; i += 1) {
        const group = this.groups[i];
        const targetY = this.yFor(i, target);

        // 是否在渲染范围内（按像素，含 overscan）
        const buffer = (this.size[1] / 5) * 2;
        const inSight = targetY > -(this.opts.overscanPx + buffer)
          && targetY < this.size[1] + this.opts.overscanPx + buffer;

        if (inSight) {
          if (group.el.dataset.offscreen === '1') {
            group.el.dataset.offscreen = '0';
            // 重新进入视野：必须先构建内容，并**立刻**跳到正确位置，
            // 否则弹簧会从旧位置（可能是很远处）慢慢爬过来，出现「飞入」
            group.build();
            this.springs[i].setPosition(targetY);
            setStyle(group.el, 'transform', `translate3d(0,${targetY.toFixed(2)}px,0)`);
          }
          group.build();
        } else if (group.el.dataset.offscreen !== '1') {
          group.el.dataset.offscreen = '1';
          group.teardown();
        }

        const isActive = i >= target && i <= latestIndex;
        const { blur, opacity } = this.fogFor(i, target, latestIndex, isActive);

        // 弹簴推进
        if (force || !this.opts.enableSpring) {
          this.springs[i].setPosition(targetY);
        } else {
          this.springs[i].setTarget(targetY, delay);
        }

        // 背景行折叠：活动时展开（slideY → 0），否则收起到一侧
        if (group.bgWrapper) {
          const bgTarget = isActive || !isPlaying
            ? 0
            : (group.bgFirst ? 80 : -80);
          if (force || !this.opts.enableSpring) this.bgSprings[i].setPosition(bgTarget);
          else this.bgSprings[i].setTarget(bgTarget);
        }

        if (inSight) {
          this.renderGroup(i, isActive, blur, opacity);
        }

        // 级联延迟：只在已经进入视口上方的行累加，且越靠后越小 → 涟漪
        if (targetY >= 0) {
          delay += baseDelay;
          if (i >= target) baseDelay /= this.opts.delayDecay;
        }
      }
      return true;
    }

    /**
     * 推进弹簧时间并写入样式。
     *
     * 与 update 分离，是为了让外部（app.js）可以用**真实帧间隔**驱动弹簧，
     * 而不是假定固定 16.7ms —— 掉帧时轨迹依然正确（解析解保证帧率无关）。
     *
     * @param {number} delta 帧间隔（秒）
     * @param {number} ms 当前时刻
     * @param {boolean} isPlaying
     */
    step(delta, ms, isPlaying) {
      if (!this.measured) return;
      for (let i = 0; i < this.groups.length; i += 1) {
        this.springs[i].update(delta);
        this.bgSprings[i].update(delta);
      }
      this.writeStyles(ms, isPlaying);
    }

    /** 把弹簧当前位置写入 DOM。 */
    writeStyles(ms, isPlaying) {
      const target = this.scrollToIndex;
      let latestIndex = target;
      for (let i = target + 1; i < this.groups.length; i += 1) {
        if (this.groups[i].startMs <= ms + 1) latestIndex = i;
        else break;
      }

      for (let i = 0; i < this.groups.length; i += 1) {
        const group = this.groups[i];
        if (group.el.dataset.offscreen === '1') continue;
        const isActive = i >= target && i <= latestIndex;
        const { blur, opacity } = this.fogFor(i, target, latestIndex, isActive);
        this.renderGroup(i, isActive, blur, opacity);
        group.update(ms, isActive, isPlaying);
      }
    }

    /** 把某一组的弹簧值写进样式。 */
    renderGroup(i, isActive, blur, opacity) {
      const group = this.groups[i];
      const y = this.springs[i].position;

      // 写入统一走 dom.js 原语：既做「值未变则跳过」的去重，也让诊断面板
      // 能精确统计真实写入次数。若这里直接写 style，性能对比就失去依据。
      setStyle(group.el, 'transform', `translate3d(0,${y.toFixed(2)}px,0)`);

      if (Math.abs(opacity - (group._lastOpacity ?? -1)) >= 0.02) {
        group._lastOpacity = opacity;
        setStyle(group.el, 'opacity', String(opacity));
      }
      const b = Math.min(5, blur) * this.opts.blurScale;
      if (Math.abs(b - (group._lastBlur ?? -1)) >= 0.05) {
        group._lastBlur = b;
        setStyle(group.el, 'filter', b > 0.01 ? `blur(${b.toFixed(2)}px)` : 'none');
      }
      if (group._lastActive !== isActive) {
        group._lastActive = isActive;
        toggleClass(group.el, 'is-active', isActive);
        if (group.bgWrapper) toggleClass(group.bgWrapper, 'is-shown', isActive);
      }

      // 背景行折叠位移
      if (group.bgWrapper) {
        const slide = this.bgSprings[i].position;
        const progress = Math.max(0, Math.min(1, 1 - Math.abs(slide) / 80));
        const scale = (0.8 + progress * 0.2).toFixed(3);
        const height = group.bgWrapper.offsetHeight || 0;
        let ty = (slide / 100) * height;
        if (group.bgFirst) ty += -height * (1 - progress);
        setStyle(group.bgWrapper, 'transform', `translate3d(0,${ty.toFixed(2)}px,0) scale(${scale})`);
        setStyle(group.bgWrapper, 'opacity', progress.toFixed(3));
      }
    }

    /* ── 清理 ─────────────────────────────────────────────────────────── */

    /** 销毁全部行组。 */
    destroyGroups() {
      for (const group of this.groups) group.dispose();
      this.groups = [];
      this.springs = [];
      this.bgSprings = [];
      this.heights = [];
      this.prefix = [0];
      this.measured = false;
    }

    /** 彻底销毁。 */
    destroy() {
      if (this._onResize) window.removeEventListener('resize', this._onResize);
      this._onResize = null;
      this.destroyGroups();
      this.host = null;
    }

    /** 供诊断面板读取的结构信息。 */
    stats() {
      const offscreen = this.groups.filter((g) => g.el.dataset.offscreen === '1').length;
      const withBg = this.groups.filter((g) => g.bgWrapper).length;
      return {
        groups: this.groups.length,
        offscreen,
        visible: this.groups.length - offscreen,
        withBg,
        totalHeight: Math.round(this.prefix[this.prefix.length - 1] || 0),
      };
    }
  }

  /* ══ 7/7 来源 demos/ttml-lyric-modes/js/engine/optimize.js（删 export）══ */

  /**
   * 歌词清洗 —— 把「原始解析结果」整理成「适合渲染的行序列」。
   *
   * 这是我在第一版里**完全漏掉**的一层，也是背景行/重叠问题的真正关键：
   *
   * AMLL 的做法是把「背景人声行」与它所属的主行**合并成一个 group**，
   * 而不是当成两条独立的行去排队。在此之前，必须先做几件事：
   *
   *  1. 行时间戳与词时间戳对齐（TTML 逐行解析时词时间常为 0）；
   *  2. 连续多行背景人声压成一行（避免和声一行行刷屏）；
   *  3. 主行与紧跟其后的背景行**时间同步**（取并集的起止），
   *     否则背景行会在主行唱完后还在飘、或主行还在唱背景行已消失；
   *  4. 清洗「非刻意的重叠」：两行只重叠几十毫秒是解析噪声，不是艺术意图；
   *  5. 尝试把起唱时间提前一点（最多 600ms），让字与声音的心理对齐更自然。
   *
   * 这些都是纯函数，不碰 DOM，因此可单测。
   */

  /** 默认清洗开关。 */
  const DEFAULT_OPTIONS = Object.freeze({
    normalizeSpaces: true,
    alignLineTimestamps: true,
    collapseBgRuns: true,
    syncMainAndBg: true,
    cleanUnintentionalOverlaps: true,
    advanceStartTime: true,
  });

  /** 判定阈值（毫秒）。 */
  const THRESHOLDS = Object.freeze({
    /** 重叠超过该值且超过下一行时长 10% 才算刻意重叠。 */
    OVERLAP_MS: 100,
    OVERLAP_RATIO: 0.1,
    /** 起唱提前量的上限。 */
    ADVANCE_DEFAULT_MS: 600,
    ADVANCE_FALLBACK_MS: 400,
    ADVANCE_RATIO: 0.3,
  });

  /** 折叠空白。 */
  function normalizeSpaces(lines) {
    for (const line of lines) {
      for (const word of line.words || []) {
        const raw = String(word.word ?? '');
        const next = raw.replace(/\s+/g, ' ');
        if (next !== raw) word.word = next;
      }
    }
  }

  /**
   * 行时间戳与词时间戳对齐。
   *
   * 为什么需要：TTML 逐行（非逐字）解析时，词的 start/end 常为 0。
   * 若不修，逐字动画会全部挤在 0 秒处闪烁。
   */
  function alignLineTimestamps(lines) {
    for (const line of lines) {
      const words = line.words || [];
      if (!words.length) continue;
      if (
        words.length === 1
        && words[0].startTime === 0
        && words[0].endTime === 0
        && (line.startMs !== 0 || line.endMs !== 0)
      ) {
        words[0].startTime = line.startMs;
        words[0].endTime = line.endMs;
        continue;
      }
      // 多词：用首个词的起点与末个词的终点收窄行区间
      const first = words[0];
      const last = words[words.length - 1];
      if (Number.isFinite(first.startTime) && first.startTime > 0) line.startMs = first.startTime;
      if (Number.isFinite(last.endTime) && last.endTime > 0) line.endMs = last.endTime;
      line.startTime = line.startMs;
      line.endTime = line.endMs;
    }
  }

  /**
   * 连续多行背景人声折叠为一行。
   *
   * 只有「第一行连续的背景行」保留 isBG，后续的被降级为普通行 ——
   * 因为渲染层一个 group 只能挂一条背景行。
   */
  function collapseBgRuns(lines) {
    let run = 0;
    for (const line of lines) {
      if (line.role === ROLE.BG) {
        run += 1;
        if (run > 1) {
          line.role = ROLE.MAIN;
          line.isBG = false;
        }
      } else {
        run = 0;
      }
    }
  }

  /**
   * 主行与其后紧跟的背景行时间同步。
   *
   * 取两者的最早起点与最晚终点，应用到双方。这样背景行与主行同生共死，
   * 不会出现「背景行已消失但主行还在唱」的割裂感。
   *
   * 词时间为空时退化为用行时间——不能直接放弃同步：逐行（非逐字）TTML
   * 与某些解析路径下词的区间可能缺失，此时行时间仍然有效。
   *
   * @returns {Map<number, number>} 背景行 index → 所属主行 index（分组结果）
   */
  function syncMainAndBg(lines) {
    const attachTo = new Map();
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      const line = lines[i];
      if (line.role === ROLE.BG) continue;
      const next = lines[i + 1];
      if (next?.role !== ROLE.BG) continue;

      const allWords = [...(line.words || []), ...(next.words || [])]
        .filter((w) => String(w.word ?? '').trim().length > 0);

      // 有词：用词的并集；无词：退回两者的行时间。两条路径都要产出 finalStart/finalEnd。
      let minStart;
      let maxEnd;
      if (allWords.length) {
        minStart = Math.min(...allWords.map((w) => w.startTime));
        maxEnd = Math.max(...allWords.map((w) => w.endTime));
      } else {
        minStart = Math.min(line.startMs, next.startMs);
        maxEnd = Math.max(line.endMs, next.endMs);
      }

      const finalStart = Math.min(minStart, line.startMs, next.startMs);
      const finalEnd = Math.max(maxEnd, line.endMs, next.endMs);

      line.startMs = finalStart;
      line.endMs = finalEnd;
      line.startTime = finalStart;
      line.endTime = finalEnd;
      next.startMs = finalStart;
      next.endMs = finalEnd;
      next.startTime = finalStart;
      next.endTime = finalEnd;
      attachTo.set(next.index, line.index);
    }
    return attachTo;
  }

  /**
   * 清洗非刻意的重叠。
   *
   * 两行只重叠几十毫秒是解析误差，若照单全收，渲染层会为这点重叠
   * 展开一整个重叠簇，白白多出一条泳道。
   */
  function cleanUnintentionalOverlaps(lines) {
    for (let i = 0; i < lines.length - 1; i += 1) {
      const line = lines[i];
      if (line.role === ROLE.BG) continue;

      let nextIndex = i + 1;
      while (nextIndex < lines.length && lines[nextIndex].role === ROLE.BG) nextIndex += 1;
      if (nextIndex >= lines.length) continue;

      const nextLine = lines[nextIndex];
      if (nextLine.role === ROLE.BG) continue;
      const overlap = line.endMs - nextLine.startMs;
      if (overlap <= 0) continue;

      const nextDuration = nextLine.endMs - nextLine.startMs;
      const isIntentional = overlap > THRESHOLDS.OVERLAP_MS
        && overlap > nextDuration * THRESHOLDS.OVERLAP_RATIO;

      if (!isIntentional) {
        line.endMs = nextLine.startMs;
        line.endTime = nextLine.startMs;
        const attachedBg = lines[i + 1];
        if (attachedBg?.role === ROLE.BG) {
          attachedBg.endMs = nextLine.startMs;
          attachedBg.endTime = nextLine.startMs;
        }
      }
    }
  }

  /**
   * 尝试把起唱时间提前。
   *
   * 逐字歌词里，第一个字的时间戳往往略晚于歌手实际起唱（发声起振被
   * 切分器吃掉）。提前最多 600ms 能让视听对齐更自然；但若上一行还没唱完，
   * 则只提前 400ms 或上一行时长的 30%，避免压住上一行。
   */
  function advanceStartTime(lines) {
    let prevStart = 0;
    let prevEnd = 0;
    let prevGroupStart = 0;
    let prevGroupEnd = 0;
    let hasPrev = false;

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (line.role === ROLE.BG) continue;

      const originalStart = line.startMs;
      const originalEnd = line.endMs;

      let targetAdvance;
      let safeBoundary;
      if (hasPrev) {
        const hadGap = originalStart >= prevEnd;
        if (hadGap) {
          targetAdvance = THRESHOLDS.ADVANCE_DEFAULT_MS;
          safeBoundary = prevGroupEnd;
        } else {
          targetAdvance = THRESHOLDS.ADVANCE_FALLBACK_MS;
          const prevDuration = prevEnd - prevStart;
          safeBoundary = prevStart + prevDuration * THRESHOLDS.ADVANCE_RATIO;
        }
      } else {
        targetAdvance = THRESHOLDS.ADVANCE_DEFAULT_MS;
        safeBoundary = 0;
      }

      const newStart = Math.max(safeBoundary, originalStart - targetAdvance);
      if (newStart < originalStart) {
        line.startMs = newStart;
        line.startTime = newStart;
      }

      const next = lines[i + 1];
      if (next?.role === ROLE.BG) {
        next.startMs = line.startMs;
        next.startTime = line.startMs;
      }

      if (hasPrev) {
        const overlapsPrev = originalStart < prevGroupEnd && originalEnd > prevGroupStart;
        if (overlapsPrev) {
          prevGroupStart = Math.min(prevGroupStart, originalStart);
          prevGroupEnd = Math.max(prevGroupEnd, originalEnd);
        } else {
          prevGroupStart = originalStart;
          prevGroupEnd = originalEnd;
        }
      } else {
        prevGroupStart = originalStart;
        prevGroupEnd = originalEnd;
      }

      prevStart = originalStart;
      prevEnd = originalEnd;
      hasPrev = true;
    }
  }

  /**
   * 清洗歌词行（原地修改；调用方需先克隆）。
   *
   * @param {Array<object>} lines 规范化行（来自 model.normalizeLines）
   * @param {object} [options] 覆盖默认开关
   * @returns {{lines: Array<object>, attachTo: Map<number, number>, options: object}}
   *   attachTo：背景行 index → 所属主行 index
   */
  function optimizeLines(lines, options = {}) {
    const config = { ...DEFAULT_OPTIONS, ...options };
    const list = Array.isArray(lines) ? lines : [];

    if (config.normalizeSpaces) normalizeSpaces(list);
    if (config.alignLineTimestamps) alignLineTimestamps(list);
    if (config.collapseBgRuns) collapseBgRuns(list);

    const attachTo = config.syncMainAndBg ? syncMainAndBg(list) : new Map();
    if (config.cleanUnintentionalOverlaps) cleanUnintentionalOverlaps(list);
    if (config.advanceStartTime) advanceStartTime(list);

    // 排序可能因时间调整而失效，重排一次
    list.sort((a, b) => a.startMs - b.startMs || a.index - b.index);
    list.forEach((line, i) => { line.order = i; });

    return { lines: list, attachTo, options: config };
  }

  /**
   * 把行序列组装成渲染用的 group 序列。
   *
   * 一个 group = 一条主行 + 可选的一条背景行。这是 AMLL 的核心结构：
   * 背景行**嵌在主行里**，不是独立排队的行。
   *
   * 若某条背景行没有被 syncMainAndBg 关联到主行（例如它出现在主行之前），
   * 则它自己成为一条 main 行，避免被静默丢弃。
   *
   * @param {Array<object>} lines 已清洗的行
   * @param {Map<number, number>} attachTo 背景行 index → 主行 index
   * @returns {Array<{main: object, bg: object|null, startMs: number, endMs: number}>}
   */
  function buildGroups(lines, attachTo) {
    const byIndex = new Map(lines.map((l) => [l.index, l]));
    const attached = new Set(attachTo.keys());
    const groups = [];

    for (const line of lines) {
      if (attached.has(line.index)) continue; // 已被挂进某个 group
      const bgIndex = [...attachTo.entries()].find(([, main]) => main === line.index)?.[0];
      const bg = bgIndex === undefined ? null : (byIndex.get(bgIndex) || null);
      groups.push({
        main: line,
        bg,
        startMs: line.startMs,
        endMs: Math.max(line.endMs, bg ? bg.endMs : 0),
      });
    }
    return groups;
  }

  /* ══ 差异 d：装配层（本段为主项目新增代码，demo 中无对应文件）══ */

  /* ── 渲染装配：主项目唯一入口 ───────────────────────────────────────── */

  /**
   * 三种动画模式的参数预设（主项目新增，demo 里由各 renderer 变体各自携带）。
   *
   * 三档**共用同一套布局**，只有动画参数不同 —— 结构不随模式变化，
   * 因此切换模式只需重建行组，不需要另一套 DOM 结构。
   *
   * 逐字动画开关（`dynamic`）只跟随模式预设：主项目既有的
   * `lyricsSettings.wordLyricsEnabled` **只做 UI 同步、不参与渲染**
   * （js/main.js 全文仅 3 处引用），所以引擎不接受外部 dynamic 覆盖参数。
   */
  const PRESETS = {
    visual: { spring: { mass: 1, damping: 11, stiffness: 92 }, alignPosition: 0.35, baseDelay: 0.055, delayDecay: 1.05, overscanPx: 320, enableBlur: true, blurScale: 1, enableSpring: true, dynamic: true },
    performance: { spring: { mass: 1, damping: 22, stiffness: 200 }, alignPosition: 0.35, baseDelay: 0, delayDecay: 1, overscanPx: 180, enableBlur: false, blurScale: 0, enableSpring: true, dynamic: false },
    preview: { spring: { mass: 1.2, damping: 12, stiffness: 90 }, alignPosition: 0.38, baseDelay: 0.06, delayDecay: 1.06, overscanPx: 400, enableBlur: true, blurScale: 0.8, enableSpring: true, dynamic: true },
  };

  /**
   * 把行序列装配到宿主元素上（挂载布局引擎、逐帧驱动、字号变化重排）。
   *
   * 这是主项目调用引擎的唯一入口（js/main.js 的 legacy 渲染分支）。
   * 返回的 controller 由调用方的帧循环驱动：每帧 `update()`，
   * 跳转后用 `seek()`，字号 / 尺寸变化后用 `relayout()`。
   *
   * @param {HTMLElement} host 宿主元素（legacy 歌词容器）
   * @param {Array<object>} [lines] 初始行（AMLL 行，可省略，之后用 setLines 灌入）
   * @param {{preset?: string, engineOptions?: object}} [options]
   *   preset：'visual' | 'performance' | 'preview'（非法值回落 visual）
   *   engineOptions：追加覆盖（一般不用）
   * @returns {object|null} controller；host 缺失时返回 null
   */
  function mountLyrics(host, lines, options = {}) {
    if (!host) return null;
    const preset = PRESETS[options.preset] ? options.preset : 'visual';
    const opts = { ...PRESETS[preset], ...(options.engineOptions || {}) };

    const engine = new LyricLayoutEngine(opts);
    host.classList.add('lyric-engine-host');
    engine.mount(host);

    const controller = {
      engine,
      preset,
      groups: [],
      setLines(nextLines) {
        /* 必须克隆：optimizeLines 会原地改行与词（提前起唱、折叠背景行、裁重叠），
           直接改调用方的数组会让「切回 AMLL 再切回来」读到已被清洗过的数据。 */
        const cloned = (nextLines || []).map((l) => ({
          ...l, words: (l.words || []).map((w) => ({ ...w })),
        }));
        const normalized = normalizeLines(cloned);
        const { attachTo } = optimizeLines(normalized);
        const groups = buildGroups(normalized, attachTo);
        engine.setGroups(groups);
        controller.groups = engine.groups;
        engine.ensureSized();
        return groups.length;
      },
      setPreset(next) {
        if (!PRESETS[next] || next === controller.preset) return false;
        controller.preset = next;
        Object.assign(engine.opts, PRESETS[next]);
        /* 用新参数重建：行内容与动画由 build() 决定，必须重建才生效。
           descriptors 从 LineGroup.group 取回（setGroups 会先 dispose 旧的）。 */
        const descriptors = engine.groups.map((g) => g.group);
        engine.setGroups(descriptors);
        controller.groups = engine.groups;
        engine.relayout();
        return true;
      },
      update(ms, isPlaying, deltaSec) {
        const laid = engine.update(ms, isPlaying, false);
        if (!laid) return false;
        engine.step(deltaSec || 1 / 60, ms, isPlaying);
        return true;
      },
      /* 跳转（seek / 切歌 / 循环回卷）：必须**强制跳位**，否则弹簧会从旧位置
         缓慢爬过去 —— 表现为「拖动进度条后歌词要滚好几秒才到位」。 */
      seek(ms, isPlaying) {
        engine.measureSize();
        engine.measure();
        const laid = engine.update(ms, isPlaying, true);
        if (laid) engine.step(0, ms, isPlaying);
        return laid;
      },
      relayout() { engine.relayout(); },
      destroy() {
        engine.destroy();
        host.classList.remove('lyric-engine-host');
        controller.groups = [];
      },
      stats() { return engine.stats(); },
    };
    if (lines && lines.length) controller.setLines(lines);
    return controller;
  }

  /* ── 公开 API ──────────────────────────────────────────────────────── */
  return {
    ROLE, FALLBACK_LINE_MS,
    roleOf, lineText, normalizeLines, findActiveLines, selectActiveSet, summarize,
    optimizeLines, buildGroups, THRESHOLDS, DEFAULT_OPTIONS,
    Spring, solveSpring, velocityOf, DEFAULT_SPRING,
    LineElement, LineGroup, LyricLayoutEngine, LAYOUT_DEFAULTS,
    WordAnimator, createRevealAnimation, createFloatAnimation, createEmphasizeAnimations,
    counters, setStyle, toggleClass,
    PRESETS,
    mountLyrics,
  };
});
