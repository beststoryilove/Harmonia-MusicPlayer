/**
 * 布局数学单元测试 —— 纯逻辑，无 DOM。
 *
 * 本文件的存在理由：demo 开发过程中出现并修复了三个真实缺陷，
 * 全部是布局数学算错，而非渲染管线问题：
 *   1. R2 双栏：整栏空白（声部→栏位映射错误）
 *   2. R1/R2：卡片压叠（固定步长 vs 实际卡片高度）
 *   3. P2：焦点行不居中（保持段被同百分比关键帧覆盖）
 * 这些必须由测试守住，否则改一行算术就会静默回归。
 *
 * 运行：cd Harmonia/demos/ttml-lyric-modes && npm test
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  assignDuetColumns, buildFocusTimeline, buildTrackKeyframes,
} from '../js/layout.js';
import { normalizeLines, groupOverlaps, ROLE } from '../js/model.js';
import { parseLyrics } from '../js/harness.js';

const readSample = (file) => readFileSync(new URL(`../samples/${file}`, import.meta.url), 'utf8');
const line = (startTime, endTime, extra = {}) => ({ startTime, endTime, words: [], ...extra });

/** 复刻各 variant 的行号展开（重叠簇内每行各占一个 row）。 */
function expandRows(lines) {
  const rank = { [ROLE.MAIN]: 0, [ROLE.DUET]: 1, [ROLE.BG]: 2 };
  const rowOf = new Map();
  let cursor = 0;
  for (const group of groupOverlaps(lines)) {
    const members = group.indices.map((i) => lines[i]).filter(Boolean)
      .sort((a, b) => rank[a.role] - rank[b.role] || a.startMs - b.startMs);
    for (const m of members) {
      rowOf.set(m.index, cursor);
      cursor += 1;
    }
  }
  return rowOf;
}

/* ── 1. 声部 → 栏位映射 ───────────────────────────────────────────────── */

test('assignDuetColumns：单一次要声部也要占满 B 栏（真实样本回归）', () => {
  // 真实样本只有 v1/v2，对唱行全属 v2。
  // 早期实现按「声部列表序号取模」，v2 序号恒为 0 → 全部落 A 栏，B 栏整栏空白。
  const parsed = parseLyrics(readSample('real-3402223603.ttml'));
  const cols = assignDuetColumns(parsed.lines, parsed.meta.primaryAgent);
  const col1 = [...cols.values()].filter((c) => c === 1).length;
  assert.ok(col1 > 0, `B 栏应至少有一行，实际 ${col1}`);

  // v2 的行必须全在 B 栏
  const v2Lines = parsed.lines.filter((l) => l.agent === 'v2');
  assert.ok(v2Lines.length > 0, '样本应含 v2 的行');
  for (const l of v2Lines) {
    assert.equal(cols.get(l.index), 1, `v2 的行 ${l.index} 应在 B 栏`);
  }
  // v1 的行必须全在 A 栏
  for (const l of parsed.lines.filter((x) => x.agent === 'v1')) {
    assert.equal(cols.get(l.index), 0, `v1 的行 ${l.index} 应在 A 栏`);
  }
});

test('assignDuetColumns：对唱样本两个声部分居左右栏', () => {
  const parsed = parseLyrics(readSample('duet.ttml'));
  const cols = assignDuetColumns(parsed.lines, parsed.meta.primaryAgent);
  assert.equal(new Set(cols.values()).size, 2, '应同时用到 A / B 两栏');
  // 行内换声部拆出的 L3 两行应落在不同栏
  const l3 = parsed.lines.filter((l) => l.key === 'L3');
  assert.equal(l3.length, 2);
  assert.notEqual(cols.get(l3[0].index), cols.get(l3[1].index), 'L3 两行应分处不同栏');
});

test('assignDuetColumns：primaryAgent 缺失时按角色兜底', () => {
  const lines = normalizeLines([
    line(0, 1000, { text: 'main' }),
    line(0, 1000, { text: 'duet', isDuet: true }),
  ]);
  const cols = assignDuetColumns(lines, '');
  assert.equal(cols.get(0), 0);
  assert.equal(cols.get(1), 1);
});

test('assignDuetColumns：每个输入行都有栏位（无遗漏）', () => {
  const parsed = parseLyrics(readSample('real-3402223603.ttml'));
  const cols = assignDuetColumns(parsed.lines, parsed.meta.primaryAgent);
  assert.equal(cols.size, parsed.lines.length, '栏位表应覆盖全部行');
});

/* ── 2. 焦点时间线 ────────────────────────────────────────────────────── */

test('buildFocusTimeline：区间连续无缝且不重叠', () => {
  const lines = normalizeLines([
    line(0, 5000), line(3000, 8000), line(8000, 12000),
  ]);
  const rows = expandRows(lines);
  const timeline = buildFocusTimeline(lines, rows);
  assert.ok(timeline.length > 0, '应产出焦点区间');
  for (let i = 1; i < timeline.length; i += 1) {
    assert.ok(
      timeline[i].startMs >= timeline[i - 1].endMs,
      `区间 ${i} 起点不应早于上一段终点`,
    );
  }
  assert.ok(timeline.every((s) => s.endMs > s.startMs), '每段区间应非空');
});

test('buildFocusTimeline：同一焦点行的相邻区间被合并', () => {
  const lines = normalizeLines([line(0, 5000)]);
  const rows = expandRows(lines);
  const timeline = buildFocusTimeline(lines, rows);
  // 单行样本应压成一段（而非多个碎段）
  assert.equal(timeline.length, 1, `应合并为 1 段，实际 ${timeline.length}`);
});

test('buildFocusTimeline：空输入返回空数组', () => {
  assert.deepEqual(buildFocusTimeline([], new Map()), []);
});

/* ── 3. 滚动关键帧：保持段与同百分比覆盖 ──────────────────────────────── */

test('buildTrackKeyframes：重叠场景下保持段占多数（回归：曾只剩 4/55）', () => {
  const parsed = parseLyrics(readSample('real-3402223603.ttml'));
  const rows = expandRows(parsed.lines);
  const rowY = new Map([...new Set(rows.values())].sort((a, b) => a - b).map((r, i) => [r, i * 72]));
  const timeline = buildFocusTimeline(parsed.lines, rows);
  const result = buildTrackKeyframes({
    timeline, rowY, durationMs: parsed.stats.durationMs, centerY: 355, transitionMs: 420,
  });
  assert.ok(result.holdCount > 20, `保持段应显著多于 4，实际 ${result.holdCount}`);
  assert.ok(result.stopCount >= timeline.length, '关键帧数不应少于区间数');
});

test('buildTrackKeyframes：焦点行在其区间内全程居中（偏移为 0）', () => {
  const parsed = parseLyrics(readSample('background-overlap.ttml'));
  const rows = expandRows(parsed.lines);
  const rowY = new Map([...new Set(rows.values())].sort((a, b) => a - b).map((r, i) => [r, i * 72]));
  const centerY = 355;
  const durationMs = parsed.stats.durationMs;
  const timeline = buildFocusTimeline(parsed.lines, rows);
  const { keyframes } = buildTrackKeyframes({
    timeline, rowY, durationMs, centerY, transitionMs: 420,
  });

  // 解析出关键帧 [(pct, y)]
  const stops = [...keyframes.matchAll(/([\d.]+)%\{transform:translate3d\(0,(-?[\d.]+)px,0\)\}/g)]
    .map((m) => ({ pct: Number(m[1]), y: Number(m[2]) }))
    .sort((a, b) => a.pct - b.pct);
  assert.ok(stops.length >= 2, '应解析出关键帧');

  /** 在给定百分比处线性插值出轨道 Y。 */
  const trackYAt = (pct) => {
    if (pct <= stops[0].pct) return stops[0].y;
    if (pct >= stops[stops.length - 1].pct) return stops[stops.length - 1].y;
    for (let i = 1; i < stops.length; i += 1) {
      if (pct <= stops[i].pct) {
        const a = stops[i - 1];
        const b = stops[i];
        const span = b.pct - a.pct;
        const k = span > 0 ? (pct - a.pct) / span : 0;
        return a.y + (b.y - a.y) * k;
      }
    }
    return stops[stops.length - 1].y;
  };

  // 在每个焦点区间的「保持段」内采样，焦点行应恰好居中
  let checked = 0;
  for (const seg of timeline) {
    const span = seg.endMs - seg.startMs;
    const trans = Math.min(420, Math.max(16, span * 0.4));
    const holdEnd = seg.endMs - trans;
    if (holdEnd <= seg.startMs) continue;
    const midMs = seg.startMs + (holdEnd - seg.startMs) / 2;
    const pct = (midMs / durationMs) * 100;
    const screenY = (rowY.get(seg.row) ?? 0) + trackYAt(pct);
    assert.ok(
      Math.abs(screenY - centerY) < 1,
      `区间 ${seg.startMs}-${seg.endMs} 内焦点行应居中，实际偏离 ${(screenY - centerY).toFixed(1)}px`,
    );
    checked += 1;
  }
  assert.ok(checked > 0, '应至少校验到一个保持段');
});

test('buildTrackKeyframes：空时间线也能产出合法 keyframes', () => {
  const result = buildTrackKeyframes({
    timeline: [], rowY: new Map(), durationMs: 1000, centerY: 300,
  });
  assert.match(result.keyframes, /@keyframes dsTrackScroll\{.*\}/);
  assert.ok(result.keyframes.includes('300.0px'), '应使用 centerY');
});

test('buildTrackKeyframes：不同百分比不会互相覆盖（保持段数目守恒）', () => {
  const lines = normalizeLines([line(0, 2000), line(2000, 4000), line(4000, 6000)]);
  const rows = expandRows(lines);
  const rowY = new Map([0, 1, 2].map((r) => [r, r * 72]));
  const timeline = buildFocusTimeline(lines, rows);
  const { keyframes } = buildTrackKeyframes({
    timeline, rowY, durationMs: 6000, centerY: 300, transitionMs: 300,
  });
  const pcts = [...keyframes.matchAll(/([\d.]+)%\{/g)].map((m) => m[1]);
  assert.equal(new Set(pcts).size, pcts.length, `关键帧百分比应唯一，实际 ${pcts.join(',')}`);
});

/* ── 4. 与模型层的一致性 ──────────────────────────────────────────────── */

test('焦点时间线覆盖的时间段与活动行存在期一致', () => {
  for (const file of ['background-overlap.ttml', 'duet.ttml', 'real-3402223603.ttml']) {
    const parsed = parseLyrics(readSample(file));
    const rows = expandRows(parsed.lines);
    const timeline = buildFocusTimeline(parsed.lines, rows);
    const covered = timeline.reduce((sum, s) => sum + (s.endMs - s.startMs), 0);
    const span = parsed.stats.durationMs;
    // 允许歌曲首尾的空隙（无任何活动行时焦点保持上一行，不计入区间）
    assert.ok(covered <= span + 1, `${file}: 覆盖时长 ${covered} 不应超过总时长 ${span}`);
    assert.ok(covered > span * 0.5, `${file}: 覆盖时长 ${covered} 应覆盖大部分曲目（总 ${span}）`);
  }
});
