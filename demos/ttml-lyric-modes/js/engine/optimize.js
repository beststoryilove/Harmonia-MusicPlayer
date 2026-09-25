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

import { ROLE } from '../model.js';

/** 默认清洗开关。 */
export const DEFAULT_OPTIONS = Object.freeze({
  normalizeSpaces: true,
  alignLineTimestamps: true,
  collapseBgRuns: true,
  syncMainAndBg: true,
  cleanUnintentionalOverlaps: true,
  advanceStartTime: true,
});

/** 判定阈值（毫秒）。 */
export const THRESHOLDS = Object.freeze({
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
export function optimizeLines(lines, options = {}) {
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
export function buildGroups(lines, attachTo) {
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
