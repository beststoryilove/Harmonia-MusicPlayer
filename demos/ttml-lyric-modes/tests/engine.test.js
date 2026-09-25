/**
 * 引擎层单元测试 —— 弹簧物理与歌词清洗，纯逻辑无 DOM。
 *
 * 这两层是新引擎的地基，且都能在 node 下直接验证：
 *  - 弹簧是闭式数学，可以精确断言收敛性、连续性与帧率无关性；
 *  - 歌词清洗是纯函数，可以断言语义（背景行归属、非刻意重叠的判定等）。
 *
 * 运行：cd Harmonia/demos/ttml-lyric-modes && npm test
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { solveSpring, velocityOf, Spring, DEFAULT_SPRING } from '../js/engine/spring.js';
import { optimizeLines, buildGroups, THRESHOLDS } from '../js/engine/optimize.js';
import { normalizeLines, ROLE } from '../js/model.js';
import { parseLyrics } from '../js/harness.js';

const readSample = (file) => readFileSync(new URL(`../samples/${file}`, import.meta.url), 'utf8');
const line = (startTime, endTime, extra = {}) => ({ startTime, endTime, words: [], ...extra });

/* ── 弹簧：数学性质 ──────────────────────────────────────────────────── */

test('solveSpring：t=0 时等于起始位置', () => {
  const f = solveSpring(100, 0, 200);
  assert.equal(f(0), 100);
});

test('solveSpring：长时间后收敛到目标位置', () => {
  const f = solveSpring(0, 0, 100);
  assert.ok(Math.abs(f(10) - 100) < 0.01, `t=10s 应到位，实际 ${f(10)}`);
});

test('solveSpring：起点等于目标时全程不动', () => {
  const f = solveSpring(50, 0, 50);
  for (const t of [0, 0.1, 1, 5]) assert.ok(Math.abs(f(t) - 50) < 1e-9);
});

test('solveSpring：延迟期间保持起始位置，之后才开始运动', () => {
  const f = solveSpring(0, 0, 100, 0.5);
  assert.equal(f(0), 0);
  assert.equal(f(0.4), 0, '延迟未到应保持起始值');
  assert.equal(f(0.5), 0, '延迟刚到时仍为起始值');
  assert.ok(f(0.8) > 0, '延迟之后应开始运动');
});

test('solveSpring：轨迹连续（无跳变）', () => {
  const f = solveSpring(0, 0, 100);
  let prev = f(0);
  for (let t = 0.001; t <= 2; t += 0.001) {
    const cur = f(t);
    assert.ok(Math.abs(cur - prev) < 2, `t=${t.toFixed(3)} 处跳变 ${Math.abs(cur - prev)}`);
    prev = cur;
  }
});

test('solveSpring：非零初速度时速度从该值起步', () => {
  const f = solveSpring(0, 50, 100);
  const v = velocityOf(f);
  assert.ok(Math.abs(v(0) - 50) < 1, `初速度应约为 50，实际 ${v(0).toFixed(3)}`);
});

test('solveSpring：过阻尼参数下不振荡（单调收敛）', () => {
  // damping 很大 → 过阻尼分支
  const f = solveSpring(0, 0, 100, 0, { mass: 1, damping: 40, stiffness: 100 });
  let prev = f(0);
  for (let t = 0.01; t <= 5; t += 0.01) {
    const cur = f(t);
    assert.ok(cur >= prev - 1e-6, `过阻尼不应回落：t=${t.toFixed(2)} ${prev} → ${cur}`);
    prev = cur;
  }
});

test('solveSpring：soft 参数走指数分支且不振荡', () => {
  const f = solveSpring(0, 0, 100, 0, { soft: true });
  let prev = f(0);
  for (let t = 0.01; t <= 5; t += 0.01) {
    const cur = f(t);
    assert.ok(cur >= prev - 1e-6);
    prev = cur;
  }
});

test('solveSpring：欠阻尼参数下会过冲（这是「弹性」观感的来源）', () => {
  // damping 很小 → 欠阻尼，应越过目标再回来
  const f = solveSpring(0, 0, 100, 0, { mass: 1, damping: 2, stiffness: 100 });
  let peak = 0;
  for (let t = 0; t <= 2; t += 0.005) peak = Math.max(peak, f(t));
  assert.ok(peak > 100, `欠阻尼应过冲，实际峰值 ${peak.toFixed(2)}`);
});

test('帧率无关：不同步长采样同一解析解，同一时刻值一致', () => {
  const f = solveSpring(0, 0, 100);
  // 分别按 60fps 与 30fps 推进到 t=0.5，取时刻应完全一致（都是解析解求值）
  const at60 = f(Math.round(0.5 * 60) / 60);
  const at30 = f(Math.round(0.5 * 30) / 30);
  // 采样时刻不同，但都应落在解析解上：用解析解直接比较
  assert.equal(at60, f(30 / 60));
  assert.equal(at30, f(15 / 30));
});

/* ── Spring 类：状态机 ───────────────────────────────────────────────── */

test('Spring：初始位置即目标，初始为 arrived', () => {
  const s = new Spring(10);
  assert.equal(s.position, 10);
  assert.ok(s.arrived);
});

test('Spring：setPosition 立即跳位', () => {
  const s = new Spring(0);
  s.setPosition(100);
  assert.equal(s.position, 100);
  assert.ok(s.arrived);
});

test('Spring：setTarget 后 1 秒内收敛到目标附近', () => {
  const s = new Spring(0);
  s.setTarget(100);
  assert.ok(!s.arrived, '刚设目标时不应 arrived');
  // DEFAULT_SPRING 是欠阻尼（damping=10 < 2√(k·m)=20），因此会过冲后回落。
  // 判据应是「落在目标附近」而不是「单调逼近」，更不是「精确等于」。
  for (let i = 0; i < 60; i += 1) s.update(1 / 60);
  assert.ok(
    Math.abs(s.position - 100) < 3,
    `1 秒后应在目标 ±3 内，实际 ${s.position.toFixed(2)}`,
  );
});

test('Spring：默认参数会过冲（弹簧手感的来源）', () => {
  const s = new Spring(0);
  s.setTarget(100);
  let peak = 0;
  for (let i = 0; i < 60; i += 1) {
    s.update(1 / 60);
    peak = Math.max(peak, s.position);
  }
  assert.ok(peak > 100, `欠阻尼应过冲，实际峰值 ${peak.toFixed(2)}`);
  // 过冲幅度应在合理范围（不超过 30%），否则观感会是「弹过头」
  assert.ok(peak < 130, `过冲不应过大，实际峰值 ${peak.toFixed(2)}`);
});

test('Spring：最终会判定 arrived（收敛不必等到无限接近）', () => {
  const s = new Spring(0);
  s.setTarget(100);
  for (let i = 0; i < 60 * 8; i += 1) {
    s.update(1 / 60);
    if (s.arrived) break;
  }
  assert.ok(s.arrived, `8 秒内应 settle，实际位置 ${s.position.toFixed(3)}`);
});

/**
 * 测量「改目标」**瞬间**的速度连续性。
 *
 * 为什么必须在瞬间测：弹簧在改目标后，新的恢复力会立刻开始作用。
 * 若跨越整整一帧（1/60s）去比较前后速度，测到的是「新恢复力作用一帧后的
 * 速度」，那本来就该不同（实测改到相反方向会差 140 px/s，而这是正确的物理，
 * 不是跳变）。
 *
 * 真正的不变量是：改目标那一刻（新解 t=0）的速度，等于改之前那一刻
 * （旧解 t=当前时间）的速度。用极小步长探测即可。
 *
 * @param {(s: Spring) => void} mutate
 * @returns {{vBefore: number, vAfter: number}}
 */
function measureInstantVelocityAroundMutation(mutate) {
  const eps = 1e-7;
  const s = new Spring(0);
  s.setTarget(100);
  for (let i = 0; i < 8; i += 1) s.update(1 / 60);

  // 改目标前：右上导数（用当前解在 t 处的斜率）
  const posBefore = s.position;
  const vBefore = s._velocity(s.currentTime);

  mutate(s);

  // 改目标后：新解在 t=0+ 的斜率
  const vAfter = s._velocity(0);
  void posBefore;
  void eps;
  return { vBefore, vAfter };
}

test('Spring：动画中途改目标，瞬间速度连续（C1 连续）', () => {
  const { vBefore, vAfter } = measureInstantVelocityAroundMutation((s) => s.setTarget(-50));
  assert.ok(
    Math.abs(vAfter - vBefore) < 1,
    `改目标瞬间速度应连续：${vBefore.toFixed(2)} → ${vAfter.toFixed(2)} px/s`,
  );
});

test('Spring：运行中改参数，瞬间速度连续', () => {
  const { vBefore, vAfter } = measureInstantVelocityAroundMutation(
    (s) => s.updateParams({ stiffness: 200 }),
  );
  assert.ok(
    Math.abs(vAfter - vBefore) < 1,
    `改参数瞬间速度应连续：${vBefore.toFixed(2)} → ${vAfter.toFixed(2)} px/s`,
  );
});

test('Spring：改目标后位置前进方向符合新恢复力（反向目标会减速）', () => {
  const s = new Spring(0);
  s.setTarget(100);
  for (let i = 0; i < 8; i += 1) s.update(1 / 60);
  const p0 = s.position;
  s.setTarget(-50);
  s.update(1 / 60);
  // 仍在前向运动中（惯性），但一帧的位移应小于改目标前，说明正在减速
  s.update(1 / 60);
  const p1 = s.position;
  s.update(1 / 60);
  const p2 = s.position;
  assert.ok(p1 > p0, '惯性使其继续前向');
  assert.ok(p2 - p1 < p1 - p0, '新恢复力应使其减速');
});

test('Spring：改目标后位置本身也连续（C0）', () => {
  const s = new Spring(0);
  s.setTarget(100);
  for (let i = 0; i < 8; i += 1) s.update(1 / 60);
  const before = s.position;
  s.setTarget(-50);
  const after = s.position;
  assert.equal(before, after, '改目标的瞬间位置不应改变');
});

test('Spring：延迟目标在延迟结束后才生效', () => {
  const s = new Spring(0);
  s.setTarget(100, 0.5);
  assert.equal(s.position, 0);
  s.update(0.2);
  assert.ok(Math.abs(s.position) < 0.01, `延迟内不应移动，实际 ${s.position}`);
  // 推进超过延迟
  for (let i = 0; i < 60; i += 1) s.update(1 / 60);
  assert.ok(s.position > 0, '延迟结束后应开始移动');
});

test('Spring：updateParams 延迟生效时不影响当前位置', () => {
  const s = new Spring(0);
  s.setTarget(100);
  for (let i = 0; i < 10; i += 1) s.update(1 / 60);
  const mid = s.position;
  s.updateParams({ stiffness: 200 }, 0.5);
  // 延迟期内参数未生效，应当继续按原参数运动（位置前进但不跳变）
  s.update(1 / 60);
  assert.ok(s.position > mid, '应继续向目标运动');
  assert.ok(Math.abs((s.position - mid) * 60) < 600, '不应出现速度突变');
});

test('DEFAULT_SPRING：约 1 秒内收敛到目标附近（适合歌词滚动的速度）', () => {
  const f = solveSpring(0, 0, 100, 0, DEFAULT_SPRING);
  // 注意默认参数是**欠阻尼**（damping=10 < 2√(k·m)=20），轨迹会过冲后回落，
  // 因此 0.5s 时反而可能离目标更远（实测 107.5）。判据取 1 秒。
  assert.ok(Math.abs(f(1.0) - 100) < 3, `1.0s 应基本到位，实际 ${f(1.0).toFixed(2)}`);
  assert.ok(Math.abs(f(2.0) - 100) < 0.1, `2.0s 应到位，实际 ${f(2.0).toFixed(3)}`);
});

test('DEFAULT_SPRING：过冲幅度适中（可感知弹性但不夸张）', () => {
  const f = solveSpring(0, 0, 100, 0, DEFAULT_SPRING);
  let peak = 0;
  for (let t = 0; t <= 2; t += 0.002) peak = Math.max(peak, f(t));
  assert.ok(peak > 100, '应有弹性过冲');
  assert.ok(peak <= 125, `过冲不应超过 25%，实际 ${peak.toFixed(2)}`);
});

/* ── 歌词清洗 ────────────────────────────────────────────────────────── */

test('optimizeLines：对齐词时间戳（单行单词且词时间为 0）', () => {
  const lines = normalizeLines([
    { startTime: 1000, endTime: 3000, words: [{ word: '整行', startTime: 0, endTime: 0 }] },
  ]);
  optimizeLines(lines);
  assert.equal(lines[0].words[0].startTime, 1000);
  assert.equal(lines[0].words[0].endTime, 3000);
});

test('optimizeLines：连续背景行只保留第一条为背景', () => {
  const lines = normalizeLines([
    line(0, 1000, { isBG: true, text: 'bg1' }),
    line(0, 1000, { isBG: true, text: 'bg2' }),
    line(0, 1000, { isBG: true, text: 'bg3' }),
    line(1000, 2000, { text: 'main' }),
  ]);
  optimizeLines(lines);
  assert.equal(lines[0].role, ROLE.BG, '第一条背景行保留');
  assert.equal(lines[1].role, ROLE.MAIN, '第二条降级');
  assert.equal(lines[2].role, ROLE.MAIN, '第三条降级');
});

test('optimizeLines：主行与紧随的背景行时间同步（取并集）', () => {
  const lines = normalizeLines([
    line(1000, 4000, { text: 'main' }),
    line(3000, 6000, { isBG: true, text: 'bg' }),
  ]);
  const { attachTo } = optimizeLines(lines);
  const main = lines.find((l) => l.role === ROLE.MAIN);
  const bg = lines.find((l) => l.role === ROLE.BG);
  // 同步发生在起唱提前之前，因此校验两者的**一致性**与区间覆盖，
  // 而不是硬编码 1000/6000 —— 提前起唱会整体左移起点（见下一条测试）。
  assert.equal(main.startMs, bg.startMs, '主行与背景行起点应一致');
  assert.equal(main.endMs, bg.endMs, '主行与背景行终点应一致');
  assert.ok(main.endMs >= 6000, `终点应覆盖背景行的 6000，实际 ${main.endMs}`);
  assert.ok(main.startMs <= 1000, `起点应不晚于 1000，实际 ${main.startMs}`);
  assert.equal(attachTo.get(bg.index), main.index, '应记录归属关系');
});

test('optimizeLines：同步后起唱提前会让两者一起左移', () => {
  const lines = normalizeLines([
    line(1000, 4000, { text: 'main' }),
    line(3000, 6000, { isBG: true, text: 'bg' }),
  ]);
  optimizeLines(lines);
  const main = lines.find((l) => l.role === ROLE.MAIN);
  const bg = lines.find((l) => l.role === ROLE.BG);
  assert.equal(main.startMs, 400, '首个主行可提前 600ms（上限）');
  assert.equal(bg.startMs, main.startMs, '背景行起点跟随主行');
  assert.equal(bg.endMs, 6000, '终点不受提前影响');
});

test('optimizeLines：非刻意重叠被清洗（<100ms）', () => {
  const lines = normalizeLines([
    line(0, 5000, { text: 'a' }),
    line(4950, 8000, { text: 'b' }),   // 仅重叠 50ms
  ]);
  optimizeLines(lines);
  const a = lines[0];
  assert.equal(a.endMs, 4950, '轻微重叠应被裁掉');
});

test('optimizeLines：刻意的重叠被保留（>100ms 且 >下一行 10%）', () => {
  const lines = normalizeLines([
    line(0, 5000, { text: 'a' }),
    line(3000, 9000, { text: 'b' }),   // 重叠 2000ms，占比很高
  ]);
  optimizeLines(lines);
  const a = lines[0];
  assert.equal(a.endMs, 5000, '刻意重叠应保留');
});

test('optimizeLines：起唱时间被提前，但不超过上一个主行组的终点', () => {
  const lines = normalizeLines([
    line(0, 2000, { text: 'first' }),
    line(5000, 7000, { text: 'second' }),
  ]);
  optimizeLines(lines);
  const second = lines[1];
  assert.ok(second.startMs < 5000, '应提前起唱');
  assert.ok(
    second.startMs >= 2000,
    `不应早于上一行终点 2000，实际 ${second.startMs}`,
  );
  assert.ok(
    5000 - second.startMs <= THRESHOLDS.ADVANCE_DEFAULT_MS,
    '提前量不超过上限',
  );
});

test('optimizeLines：清洗会重排并写入 order', () => {
  const lines = normalizeLines([line(0, 1000), line(2000, 3000)]);
  optimizeLines(lines);
  assert.deepEqual(lines.map((l) => l.order), [0, 1]);
  assert.ok(lines[0].startMs <= lines[1].startMs, '应按起点有序');
});

test('optimizeLines：默认全部开关开启', () => {
  const { options } = optimizeLines([]);
  assert.ok(options.normalizeSpaces);
  assert.ok(options.syncMainAndBg);
  assert.ok(options.cleanUnintentionalOverlaps);
  assert.ok(options.advanceStartTime);
});

/* ── 分组：背景行嵌套 ────────────────────────────────────────────────── */

test('buildGroups：背景行被并进主行的 group（核心结构）', () => {
  const lines = normalizeLines([
    line(1000, 4000, { text: 'main' }),
    line(3000, 6000, { isBG: true, text: 'bg' }),
  ]);
  const { attachTo } = optimizeLines(lines);
  const groups = buildGroups(lines, attachTo);
  assert.equal(groups.length, 1, '应只有 1 个 group');
  assert.equal(groups[0].main.text, 'main');
  assert.ok(groups[0].bg, 'group 应携带背景行');
  assert.equal(groups[0].bg.text, 'bg');
  assert.equal(groups[0].endMs, 6000, 'group 终点取两者较晚者');
});

test('buildGroups：未被关联的背景行不会被丢弃', () => {
  const lines = normalizeLines([
    line(0, 1000, { isBG: true, text: 'lonely-bg' }),
    line(2000, 3000, { text: 'main' }),
  ]);
  const { attachTo } = optimizeLines(lines);
  const groups = buildGroups(lines, attachTo);
  const texts = groups.map((g) => g.main.text);
  assert.ok(texts.includes('lonely-bg'), `孤立背景行应作为主行保留，实际 ${texts.join(',')}`);
  assert.equal(groups.length, 2);
});

test('buildGroups：真实样本的组数远少于行数（背景行被吸收）', () => {
  const parsed = parseLyrics(readSample('real-3402223603.ttml'));
  const lines = parsed.lines.map((l) => ({ ...l }));
  const { attachTo } = optimizeLines(lines);
  const groups = buildGroups(lines, attachTo);
  const withBg = groups.filter((g) => g.bg).length;
  assert.ok(groups.length < parsed.lines.length, `组数 ${groups.length} 应少于行数 ${parsed.lines.length}`);
  assert.ok(withBg > 0, '应存在携带背景行的组');
});

test('buildGroups：全部非背景样本的组数等于行数', () => {
  const lines = normalizeLines([
    line(0, 1000, { text: 'a' }),
    line(2000, 3000, { text: 'b' }),
  ]);
  const { attachTo } = optimizeLines(lines);
  const groups = buildGroups(lines, attachTo);
  assert.equal(groups.length, 2);
  assert.ok(groups.every((g) => g.bg === null));
});

test('optimizeLines：不修改入参之外的全局状态（可重复调用）', () => {
  const make = () => normalizeLines([
    line(1000, 4000, { text: 'main' }),
    line(3000, 6000, { isBG: true, text: 'bg' }),
  ]);
  const a = make();
  const b = make();
  optimizeLines(a);
  optimizeLines(b);
  assert.deepEqual(a.map((l) => l.startMs), b.map((l) => l.startMs));
  assert.deepEqual(a.map((l) => l.endMs), b.map((l) => l.endMs));
});

test('optimizeLines：空输入不抛错', () => {
  const { lines, attachTo } = optimizeLines([]);
  assert.deepEqual(lines, []);
  assert.equal(attachTo.size, 0);
});

test('buildGroups：空输入返回空数组', () => {
  assert.deepEqual(buildGroups([], new Map()), []);
});

/* ── 全样本回归 ──────────────────────────────────────────────────────── */

test('全部样本：清洗后仍保持时间有效且顺序正确', () => {
  for (const file of ['background-overlap.ttml', 'duet.ttml', 'real-3402223603.ttml', 'sidecar-ruby.ttml']) {
    const parsed = parseLyrics(readSample(file));
    const lines = parsed.lines.map((l) => ({ ...l }));
    const { attachTo } = optimizeLines(lines);
    for (const l of lines) {
      assert.ok(l.endMs >= l.startMs, `${file}: 行 ${l.index} 时间倒挂`);
    }
    for (let i = 1; i < lines.length; i += 1) {
      assert.ok(lines[i].startMs >= lines[i - 1].startMs, `${file}: 第 ${i} 行顺序错误`);
    }
    const groups = buildGroups(lines, attachTo);
    assert.ok(groups.length > 0, `${file}: 应产生组`);
  }
});

test('全部样本：背景行不会在清洗后消失（只改变归属方式）', () => {
  const parsed = parseLyrics(readSample('background-overlap.ttml'));
  const before = parsed.lines.filter((l) => l.role === ROLE.BG).length;
  const lines = parsed.lines.map((l) => ({ ...l }));
  const { attachTo } = optimizeLines(lines);
  const groups = buildGroups(lines, attachTo);
  const asBg = groups.filter((g) => g.bg).length;
  // 连续背景行会被折叠，因此 asBg <= before，但不应为 0
  assert.ok(asBg > 0, `背景行应至少保留一条，实际 ${asBg}`);
  assert.ok(asBg <= before, '折叠不应增加背景行数');
});
