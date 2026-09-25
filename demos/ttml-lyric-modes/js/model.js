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
export const FALLBACK_LINE_MS = 5000;

/** 角色常量。 */
export const ROLE = Object.freeze({
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
export function lineEndMs(line, fallbackEnd) {
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
export function roleOf(line) {
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
export function lineText(line) {
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
export function normalizeLines(lines) {
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
export function findActiveLines(lines, ms) {
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
  const active = [];
  // 向前回扫直到行尾早已结束。用「最大已见 endMs」剪枝，避免长尾线性扫描。
  let maxSeenEnd = -Infinity;
  for (let i = lo - 1; i >= 0; i -= 1) {
    const line = list[i];
    if (line.endMs > t) active.push(line);
    if (line.endMs > maxSeenEnd) maxSeenEnd = line.endMs;
    // 更早的行即使起点很早，只要它的行尾不超过已见最大行尾就不可能活动；
    // 由于行尾可能任意长，这里只在连续若干行都结束后才停，保证正确性。
    if (line.endMs <= t && i > 0 && list[i - 1].endMs <= t && maxSeenEnd <= t) break;
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
export function selectActiveSet(lines, ms, lastFg, options = {}) {
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
export function groupOverlaps(lines) {
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
export function packLanes(intervals) {
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
export function computeWindow(lines, ms, options = {}) {
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
export function summarize(lines) {
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
export function lineProgress(line, ms) {
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
