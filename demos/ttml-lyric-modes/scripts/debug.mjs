#!/usr/bin/env node
/**
 * 排查脚本 —— 在真实页面里 dump 方案 DOM 状态，用于定位「活动行不可见」类问题。
 *
 * 与冒烟脚本的分工：冒烟给结论（通过/失败），本脚本给证据（DOM 实际计算样式）。
 * 保留在仓库里，因为这类「布局数学算错导致整屏空白」的问题后续还会遇到。
 *
 * 用法：node scripts/debug.mjs
 */

import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchChrome, openPage, evaluate, sleep, freePort } from './cdp.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

async function startServer() {
  const port = await freePort();
  const child = spawn(process.execPath, ['serve.mjs', '--port', String(port)], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  child.stdout.on('data', (d) => { log += d.toString(); });
  child.stderr.on('data', (d) => { log += d.toString(); });
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/index.html`);
      if (res.ok) return { url: `http://127.0.0.1:${port}/`, stop: () => child.kill(), getLog: () => log };
    } catch { /* 继续等 */ }
    await sleep(100);
  }
  child.kill();
  throw new Error('服务器未就绪');
}

/** 在页面里 dump 某方案在指定时刻的 DOM 状态。 */
const DUMP_FN = `(async (variantId, sampleId) => {
  const demo = window.__DSH_DEMO__;
  const modeOf = { v1: 'visual', v2: 'visual', v3: 'visual', p1: 'performance', p2: 'performance', p3: 'performance', r1: 'preview', r2: 'preview', r3: 'preview' };
  demo.selectMode(modeOf[variantId]);
  demo.selectVariant(variantId);
  await demo.selectSample(sampleId);
  const lines = demo.state.data.lines;
  // 选一个活动行最多的时刻
  let best = 0, bestMs = 0;
  for (const l of lines) {
    const t = l.startMs + 1;
    const n = lines.filter(x => x.startMs <= t && t < x.endMs).length;
    if (n > best) { best = n; bestMs = t; }
  }
  const ms = bestMs;
  demo.state.clock.seek(ms);
  demo.drawFrame({ ms, state: 'paused', rate: 1, durationMs: demo.state.data.stats.durationMs });
  const slot = demo.state.slots[0];
  const host = slot.host;
  const active = lines.filter(x => x.startMs <= ms && ms < x.endMs).map(x => x.index);
  const rows = [];
  for (const el of host.querySelectorAll('[data-index]')) {
    const cs = getComputedStyle(el);
    rows.push({
      idx: el.dataset.index,
      role: el.dataset.role || '',
      active: active.includes(Number(el.dataset.index)),
      opacity: cs.opacity,
      display: cs.display,
      visibility: cs.visibility,
      filter: cs.filter,
      inlineOpacity: el.style.opacity,
      transform: el.style.transform.slice(0, 40),
      cls: el.className,
    });
  }
  return JSON.stringify({
    variantId,
    ms,
    peakActive: best,
    activeIndices: active,
    totalIndexed: rows.length,
    rows: rows.slice(0, 10),
    hostClass: host.className,
    hostChildren: host.children.length,
  }, null, 1);
})`;

async function main() {
  const server = await startServer();
  let chrome = null;
  try {
    chrome = await launchChrome({ width: 1600, height: 900 });
    await chrome.cdp.send('Network.enable');
    const bad = [];
    chrome.cdp.on('Network.responseReceived', (p) => {
      if (p?.response?.status >= 400) bad.push(`${p.response.status} ${p.response.url}`);
    });

    await openPage(chrome.cdp, `${server.url}?x=1`, { timeoutMs: 45000 });
    await sleep(800);

    for (const [variantId, sampleId] of [
      ['v2', 'real-3402223603'],
      ['p1', 'real-3402223603'],
      ['v1', 'real-3402223603'],
    ]) {
      console.log(`\n══════ ${variantId} @ ${sampleId} ══════`);
      const json = await evaluate(chrome.cdp, `${DUMP_FN}(${JSON.stringify(variantId)}, ${JSON.stringify(sampleId)})`);
      console.log(json);
    }

    /* 帧成本拆解：drawFrame 内 countNodes 的开销 */
    console.log('\n══════ 帧成本拆解 ══════');
    const cost = await evaluate(chrome.cdp, `(async () => {
      const demo = window.__DSH_DEMO__;
      demo.selectMode('visual');
      demo.selectVariant('v1');
      await demo.selectSample('real-3402223603');
      const host = demo.state.slots[0].host;
      const N = 60;
      // 纯 update
      const t0 = performance.now();
      for (let i = 0; i < N; i++) demo.state.slots[0].instance.update({ ms: 40000 + i * 16, state: 'paused', rate: 1, durationMs: 260000 });
      const updateMs = (performance.now() - t0) / N;
      // countNodes（app 每帧都调）
      const count = (root) => { let n = 1; const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT); while (w.nextNode()) n += 1; return n; };
      const t1 = performance.now();
      for (let i = 0; i < N; i++) count(host);
      const countMs = (performance.now() - t1) / N;
      return JSON.stringify({ updateMsPerFrame: +updateMs.toFixed(3), countNodesMsPerFrame: +countMs.toFixed(3), nodes: count(host) }, null, 1);
    })()`);
    console.log(cost);

    console.log('\n══════ 4xx/5xx 资源 ══════');
    console.log(bad.length ? [...new Set(bad)].join('\n') : '（无）');

    const log = server.getLog().split('\n').filter((l) => /404|403|500/.test(l));
    console.log('\n══════ 服务器错误日志 ══════');
    console.log(log.length ? [...new Set(log)].join('\n') : '（无）');
  } finally {
    if (chrome) await chrome.close();
    server.stop();
  }
}

main().catch((error) => {
  console.error('排查脚本异常：', error);
  process.exit(1);
});
