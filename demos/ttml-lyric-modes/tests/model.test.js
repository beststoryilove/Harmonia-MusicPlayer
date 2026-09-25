/**
 * 模型层单元测试 —— 纯逻辑，无 DOM。
 *
 * 覆盖重点：重叠时间轴的查询原语（这是三种模式共同失配的根因所在），
 * 以及各方案赖以成立的结构不变量。
 *
 * 运行：cd Harmonia/demos/ttml-lyric-modes && npm test
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  normalizeLines, findActiveLines, selectActiveSet, groupOverlaps,
  packLanes, computeWindow, summarize, lineProgress, lineEndMs, roleOf, lineText,
  ROLE, FALLBACK_LINE_MS,
} from '../js/model.js';
import { parseLyrics, SAMPLES } from '../js/harness.js';

const readSample = (file) => readFileSync(new URL(`../samples/${file}`, import.meta.url), 'utf8');

/** 构造一个最小行对象。 */
const line = (startTime, endTime, extra = {}) => ({ startTime, endTime, words: [], ...extra });

/* ── 规范化 ───────────────────────────────────────────────────────────── */

test('normalizeLines：按起点排序并写入派生字段', () => {
  const lines = normalizeLines([line(5000, 9000), line(1000, 3000), line(3000, 5000)]);
  assert.deepEqual(lines.map((l) => l.startMs), [1000, 3000, 5000]);
  assert.deepEqual(lines.map((l) => l.index), [0, 1, 2]);
  assert.ok(lines.every((l) => l.endMs > l.startMs));
});

test('normalizeLines：缺失 endTime 时用下一个起点推断', () => {
  const lines = normalizeLines([line(1000, NaN), line(4000, 6000)]);
  assert.equal(lines[0].endMs, 4000);
});

test('normalizeLines：末行缺失 endTime 时用兜底时长', () => {
  const lines = normalizeLines([line(1000, undefined)]);
  assert.equal(lines[0].endMs, 1000 + FALLBACK_LINE_MS);
});

test('normalizeLines：丢弃无法定时的行', () => {
  const lines = normalizeLines([line(NaN, 5000), line(1000, 2000), null, {}]);
  assert.equal(lines.length, 1);
});

test('normalizeLines：endTime 不大于 startTime 时被修正', () => {
  const lines = normalizeLines([line(2000, 2000), line(5000, 1000)]);
  assert.ok(lines.every((l) => l.endMs > l.startMs));
});

/* ── 角色判定 ─────────────────────────────────────────────────────────── */

test('roleOf：背景优先于对唱', () => {
  assert.equal(roleOf({ isBG: true, isDuet: true }), ROLE.BG);
  assert.equal(roleOf({ isDuet: true }), ROLE.DUET);
  assert.equal(roleOf({ isPriorityBg: true }), ROLE.DUET);
  assert.equal(roleOf({}), ROLE.MAIN);
});

test('lineText：text 缺失时从 words 拼接', () => {
  assert.equal(lineText({ text: '你好' }), '你好');
  assert.equal(lineText({ words: [{ word: 'a' }, { word: 'b' }] }), 'ab');
  assert.equal(lineText(null), '');
});

/* ── 活动行查询：重叠时间轴的核心 ─────────────────────────────────────── */

test('findActiveLines：单行活动', () => {
  const lines = normalizeLines([line(1000, 3000), line(3000, 5000)]);
  assert.deepEqual(findActiveLines(lines, 1500).map((l) => l.index), [0]);
  assert.deepEqual(findActiveLines(lines, 4000).map((l) => l.index), [1]);
});

test('findActiveLines：区间重叠时返回全部活动行', () => {
  // L2(5000-9000) 与 L3(7500-11000) 重叠
  const lines = normalizeLines([line(5000, 9000), line(7500, 11000)]);
  assert.deepEqual(findActiveLines(lines, 8000).map((l) => l.index), [0, 1]);
});

test('findActiveLines：边界半开区间（起点含、终点不含）', () => {
  const lines = normalizeLines([line(1000, 3000), line(3000, 5000)]);
  // t=3000 时第一行已结束（end 不含），第二行刚开始
  assert.deepEqual(findActiveLines(lines, 3000).map((l) => l.index), [1]);
  assert.deepEqual(findActiveLines(lines, 2999).map((l) => l.index), [0]);
  assert.deepEqual(findActiveLines(lines, 999), []);
});

test('findActiveLines：长尾行跨越多行仍被保留', () => {
  // 背景行 1000-20000 横跨后续 3 行
  const lines = normalizeLines([
    line(1000, 20000, { isBG: true }),
    line(3000, 5000), line(6000, 8000), line(9000, 11000),
  ]);
  const active = findActiveLines(lines, 9500);
  assert.ok(active.some((l) => l.role === ROLE.BG), '长尾背景行应仍活动');
  assert.ok(active.some((l) => l.index === 3), '当前主行应活动');
});

test('findActiveLines：峰值 4 行同时活跃（真实样本特征）', () => {
  const lines = normalizeLines([
    line(1000, 5000), line(2000, 6000), line(3000, 7000), line(4000, 8000),
  ]);
  assert.equal(findActiveLines(lines, 4500).length, 4);
});

test('findActiveLines：空输入与越界时刻不抛错', () => {
  assert.deepEqual(findActiveLines([], 1000), []);
  const lines = normalizeLines([line(1000, 2000)]);
  assert.deepEqual(findActiveLines(lines, 0), []);
  assert.deepEqual(findActiveLines(lines, 999999), []);
});

/* ── 主/副行选择 ──────────────────────────────────────────────────────── */

test('selectActiveSet：主行取最早的普通行', () => {
  const lines = normalizeLines([line(1000, 9000), line(2000, 8000)]);
  const { fg } = selectActiveSet(lines, 3000, null);
  assert.equal(fg.index, 0);
});

test('selectActiveSet：间隙保持 lastFg（行间空隙不回空）', () => {
  const lines = normalizeLines([line(1000, 3000), line(9000, 11000)]);
  const { fg: first } = selectActiveSet(lines, 1500, null);
  assert.equal(first.index, 0);
  // t=5000 无任何活动行：主行应保持，避免歌词区闪烁回空
  const { fg: held, active } = selectActiveSet(lines, 5000, first);
  assert.equal(active.length, 0, '该时刻确实没有活动行');
  assert.equal(held.index, 0, '主行应被保持');
});

test('selectActiveSet：lastFg 已被更晚的活动普通行取代时让位', () => {
  const lines = normalizeLines([line(1000, 3000), line(4000, 6000)]);
  const { fg: first } = selectActiveSet(lines, 1500, null);
  assert.equal(first.index, 0);
  const { fg: next } = selectActiveSet(lines, 4500, first);
  assert.equal(next.index, 1, '应切换到新行而非保持旧行');
});

test('selectActiveSet：无普通行时退化为对唱行，再退化为背景行', () => {
  const duetOnly = normalizeLines([line(1000, 5000, { isDuet: true })]);
  assert.equal(selectActiveSet(duetOnly, 2000, null).fg.index, 0);
  const bgOnly = normalizeLines([line(1000, 5000, { isBG: true })]);
  assert.equal(selectActiveSet(bgOnly, 2000, null).fg.role, ROLE.BG);
});

test('selectActiveSet：副行池跳过与主行同文本的行', () => {
  const lines = normalizeLines([
    { startTime: 1000, endTime: 5000, text: '相同', words: [] },
    { startTime: 1000, endTime: 5000, text: '相同', isBG: true, words: [] },
    { startTime: 1000, endTime: 5000, text: '不同', isBG: true, words: [] },
  ]);
  const { bgSlots } = selectActiveSet(lines, 2000, null, { maxBg: 3 });
  assert.equal(bgSlots.length, 1);
  assert.equal(lineText(bgSlots[0]), '不同');
});

test('selectActiveSet：对唱行优先于背景行进入副行池', () => {
  const lines = normalizeLines([
    line(1000, 9000),
    line(1000, 9000, { isBG: true, text: 'bg' }),
    line(1000, 9000, { isDuet: true, text: 'duet' }),
  ]);
  const { bgSlots } = selectActiveSet(lines, 2000, null, { maxBg: 1 });
  assert.equal(bgSlots.length, 1);
  assert.equal(bgSlots[0].role, ROLE.DUET);
});

test('selectActiveSet：maxBg=1 取最新开始者（避免早行饿死新行）', () => {
  const lines = normalizeLines([
    line(1000, 9000),
    line(1000, 9000, { isDuet: true, text: 'early' }),
    line(5000, 9000, { isDuet: true, text: 'late' }),
  ]);
  const { bgSlots } = selectActiveSet(lines, 6000, null, { maxBg: 1 });
  assert.equal(lineText(bgSlots[0]), 'late');
});

test('selectActiveSet：maxBg>1 按开始时间升序', () => {
  const lines = normalizeLines([
    line(1000, 9000),
    line(5000, 9000, { isDuet: true, text: 'late' }),
    line(1000, 9000, { isDuet: true, text: 'early' }),
  ]);
  const { bgSlots } = selectActiveSet(lines, 6000, null, { maxBg: 2 });
  assert.deepEqual(bgSlots.map(lineText), ['early', 'late']);
});

/* ── 重叠分组与泳道打包 ───────────────────────────────────────────────── */

test('groupOverlaps：不相交的行各自成簇', () => {
  const lines = normalizeLines([line(1000, 2000), line(2000, 3000), line(3000, 4000)]);
  assert.equal(groupOverlaps(lines).length, 3);
});

test('groupOverlaps：相交的行聚为一簇并给出峰值', () => {
  const lines = normalizeLines([line(1000, 5000), line(2000, 6000), line(5500, 7000)]);
  const groups = groupOverlaps(lines);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].indices.length, 3);
  assert.equal(groups[0].peak, 2);
});

test('packLanes：不重叠区间复用同一泳道', () => {
  const lanes = packLanes([
    { startMs: 0, endMs: 1000 }, { startMs: 1000, endMs: 2000 }, { startMs: 2000, endMs: 3000 },
  ]);
  assert.deepEqual(lanes, [0, 0, 0]);
});

test('packLanes：全重叠区间各占一条泳道（区间图着色最优）', () => {
  const lanes = packLanes([
    { startMs: 0, endMs: 3000 }, { startMs: 500, endMs: 3500 }, { startMs: 1000, endMs: 4000 },
  ]);
  assert.equal(new Set(lanes).size, 3);
});

test('packLanes：同泳道内区间两两不重叠（核心不变量）', () => {
  const intervals = [
    { startMs: 0, endMs: 5000 }, { startMs: 1000, endMs: 6000 },
    { startMs: 5500, endMs: 9000 }, { startMs: 2000, endMs: 3000 },
    { startMs: 8000, endMs: 12000 },
  ];
  const lanes = packLanes(intervals);
  for (let i = 0; i < intervals.length; i += 1) {
    for (let j = i + 1; j < intervals.length; j += 1) {
      if (lanes[i] !== lanes[j]) continue;
      const a = intervals[i];
      const b = intervals[j];
      const overlap = a.startMs < b.endMs && b.startMs < a.endMs;
      assert.ok(!overlap, `泳道 ${lanes[i]} 内区间 ${i}/${j} 不应重叠`);
    }
  }
});

test('packLanes：空输入返回空数组', () => {
  assert.deepEqual(packLanes([]), []);
});

/* ── 窗口虚拟化 ───────────────────────────────────────────────────────── */

test('computeWindow：只返回窗口内的行', () => {
  const lines = normalizeLines([
    line(0, 1000), line(2000, 3000), line(10000, 11000), line(50000, 51000),
  ]);
  const win = computeWindow(lines, 10000, { beforeMs: 6000, afterMs: 8000 });
  assert.ok(win.includes(2), '当前行应在窗口内');
  assert.ok(!win.includes(0), '远过去的行应被排除');
  assert.ok(!win.includes(3), '远未来的行应被排除');
});

test('computeWindow：跨越窗口边界的长行被保留（相交而非包含）', () => {
  const lines = normalizeLines([line(0, 60000)]);
  const win = computeWindow(lines, 30000, { beforeMs: 6000, afterMs: 8000 });
  assert.deepEqual(win, [0]);
});

test('computeWindow：结果按行下标升序且无重复', () => {
  const lines = normalizeLines([line(0, 30000), line(1000, 2000), line(3000, 4000)]);
  const win = computeWindow(lines, 3500, { beforeMs: 10000, afterMs: 10000 });
  assert.deepEqual(win, [...win].sort((a, b) => a - b));
  assert.equal(new Set(win).size, win.length);
});

/* ── 汇总与进度 ───────────────────────────────────────────────────────── */

test('summarize：角色计数与峰值统计正确', () => {
  const lines = normalizeLines([
    line(0, 5000),
    line(1000, 4000, { isBG: true }),
    line(2000, 3000, { isDuet: true }),
  ]);
  const s = summarize(lines);
  assert.equal(s.total, 3);
  assert.equal(s.main, 1);
  assert.equal(s.bg, 1);
  assert.equal(s.duet, 1);
  assert.equal(s.peakConcurrent, 3);
  assert.equal(s.overlapGroups, 1);
  assert.equal(s.durationMs, 5000);
});

test('summarize：空输入不抛错', () => {
  const s = summarize([]);
  assert.equal(s.total, 0);
  assert.equal(s.peakConcurrent, 0);
  assert.equal(s.durationMs, 0);
});

test('lineProgress：无词时按整行区间线性推进', () => {
  const l = normalizeLines([line(0, 1000)])[0];
  assert.equal(lineProgress(l, 0), 0);
  assert.equal(lineProgress(l, 500), 0.5);
  assert.equal(lineProgress(l, 1000), 1);
  assert.equal(lineProgress(l, 5000), 1);
});

test('lineProgress：有词时按词区间加权', () => {
  const l = normalizeLines([{
    startTime: 0,
    endTime: 1000,
    words: [
      { word: 'a', startTime: 0, endTime: 500 },
      { word: 'b', startTime: 500, endTime: 1000 },
    ],
  }])[0];
  assert.equal(lineProgress(l, 250), 0.25);
  assert.equal(lineProgress(l, 750), 0.75);
  assert.equal(lineProgress(l, 1000), 1);
});

test('lineEndMs：非法入参退化为兜底时长', () => {
  assert.equal(lineEndMs({ startTime: 1000, endTime: NaN }), 1000 + FALLBACK_LINE_MS);
  assert.equal(lineEndMs({ startTime: 1000, endTime: 1000 }), 1000 + FALLBACK_LINE_MS);
  assert.equal(lineEndMs({ startTime: 1000, endTime: 1000 }, 4000), 4000);
});

/* ── 真实样本集成 ─────────────────────────────────────────────────────── */

test('真实样本 real-3402223603：含重叠 / 背景 / 对唱，且全部行时间有效', () => {
  const parsed = parseLyrics(readSample('real-3402223603.ttml'));
  assert.ok(parsed.lines.length > 50, `应有大量行，实际 ${parsed.lines.length}`);
  assert.ok(parsed.stats.bg > 0, '应含背景行');
  assert.ok(parsed.stats.duet > 0, '应含对唱行');
  assert.ok(parsed.stats.overlapGroups > 0, '应含重叠簇');
  assert.ok(parsed.stats.peakConcurrent >= 3, `峰值并发应 ≥3，实际 ${parsed.stats.peakConcurrent}`);
  assert.ok(parsed.lines.every((l) => l.endMs > l.startMs), '所有行 endMs 应大于 startMs');
  assert.ok(parsed.lines.every((l) => Number.isFinite(l.startMs)), '所有行起点应为有限数');
});

test('真实样本：存在至少一个「三行以上同时活跃」的时刻', () => {
  const parsed = parseLyrics(readSample('real-3402223603.ttml'));
  let found = false;
  for (const l of parsed.lines) {
    const active = findActiveLines(parsed.lines, l.startMs + 1);
    if (active.length >= 3) { found = true; break; }
  }
  assert.ok(found, '应存在 ≥3 行同时活跃的时刻');
});

test('背景重叠样本：背景行跨出所属主行（早于主行结束，或晚于主行结束）', () => {
  const parsed = parseLyrics(readSample('background-overlap.ttml'));
  const bg = parsed.lines.filter((l) => l.role === ROLE.BG);
  // 「前景行」= 所有非背景行（主行 + 对唱行）。背景行依附的是前景行，
  // 不限于 ROLE.MAIN —— 样本中 (ひびく)(よぶ) 跨越的是对唱行 L3 的结尾。
  const fg = parsed.lines.filter((l) => l.role !== ROLE.BG);
  assert.ok(bg.length >= 3, `背景行应 ≥3，实际 ${bg.length}`);
  assert.ok(fg.length >= 4, `前景行应 ≥4，实际 ${fg.length}`);

  // 背景行与前景行是并行时间轴：既可能早于前景行结束，也可能晚于前景行结束。
  const bgBeyond = bg.some((b) => fg.some((m) => b.endMs > m.endMs && b.startMs < m.endMs));
  assert.ok(bgBeyond, '应存在晚于前景行结束的背景行（跨越主行结尾）');

  const bgBefore = bg.some((b) => fg.some((m) => b.endMs < m.endMs && b.startMs >= m.startMs));
  assert.ok(bgBefore, '应存在早于前景行结束的背景行');

  // 非包含关系：背景行既不与前景行完全重合，也不被完全包含
  const nested = bg.every((b) => fg.every((m) => !(b.startMs < m.endMs && m.startMs < b.endMs)
    || (b.startMs >= m.startMs && b.endMs <= m.endMs)));
  assert.ok(!nested, '至少一条背景行应与前景行区间呈非包含的重叠关系');
});

test('背景重叠样本：存在背景行与主行同时活跃的时刻', () => {
  const parsed = parseLyrics(readSample('background-overlap.ttml'));
  let coexists = false;
  for (const b of parsed.lines.filter((l) => l.role === ROLE.BG)) {
    const active = findActiveLines(parsed.lines, b.startMs + 1);
    if (active.some((l) => l.role !== ROLE.BG)) { coexists = true; break; }
  }
  assert.ok(coexists, '背景行应至少与一个非背景行同时活跃');
});

test('对唱样本：行内换声部被切分为独立行（同一 itunes:key 拆出多个声部）', () => {
  const parsed = parseLyrics(readSample('duet.ttml'));
  const duet = parsed.lines.filter((l) => l.role === ROLE.DUET);
  assert.ok(duet.length >= 2, `对唱行应 ≥2，实际 ${duet.length}`);

  // 声部归属要看所有行，而非仅对唱行：
  // v1 同时拥有主行与对唱行（样本 L3 行内先 v1 后 v2），因此主行也须计入声部集合。
  const agents = new Set(parsed.lines.map((l) => l.agent).filter(Boolean));
  assert.ok(agents.size >= 2, `应含 ≥2 个声部，实际 ${[...agents].join(',')}`);
  assert.ok(agents.has('v1') && agents.has('v2'), '应同时出现 v1 与 v2');

  // 行内换声部的直接证据：同一个 itunes:key 被拆成了归属不同声部的多行
  const byKey = new Map();
  for (const l of parsed.lines) {
    if (!l.key) continue;
    if (!byKey.has(l.key)) byKey.set(l.key, []);
    byKey.get(l.key).push(l);
  }
  const splitKeys = [...byKey.entries()].filter(([, group]) => new Set(group.map((l) => l.agent)).size > 1);
  assert.ok(splitKeys.length >= 1, '应有至少一个 key 被拆分为不同声部的多行');
  const l3 = byKey.get('L3');
  assert.ok(l3 && l3.length === 2, 'L3 应被拆为两行');
  assert.deepEqual(l3.map((l) => l.agent), ['v1', 'v2'], 'L3 两行应分属 v1 与 v2');
  assert.ok(l3[0].startMs < l3[1].startMs, 'L3 拆分后应按时间先后排列');
});

test('全部样本均可解析且无异常行', () => {
  for (const sample of SAMPLES) {
    const parsed = parseLyrics(readSample(sample.file));
    assert.ok(parsed.lines.length > 0, `${sample.id} 应解析出歌词行`);
    assert.ok(
      parsed.lines.every((l) => l.endMs > l.startMs && Number.isFinite(l.startMs)),
      `${sample.id} 所有行时间应有效`,
    );
  }
});

test('各样本的重叠簇内，峰值并发与 findActiveLines 实测一致', () => {
  for (const sample of SAMPLES) {
    const parsed = parseLyrics(readSample(sample.file));
    const groups = groupOverlaps(parsed.lines);
    for (const group of groups) {
      const members = group.indices.map((i) => parsed.lines[i]);
      // 在簇内每个成员起点处实测并发数，不应超过该簇报告的峰值
      for (const m of members) {
        const active = findActiveLines(parsed.lines, m.startMs);
        const inGroup = active.filter((l) => group.indices.includes(l.index)).length;
        assert.ok(
          inGroup <= group.peak,
          `${sample.id} 簇峰值 ${group.peak} 被实测 ${inGroup} 超出`,
        );
      }
    }
  }
});
