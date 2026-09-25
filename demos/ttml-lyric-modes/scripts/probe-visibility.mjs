#!/usr/bin/env node
/**
 * 可见性探针 —— 针对「活动行却不可见」定位到具体是哪个祖先/属性把它吃掉了。
 *
 * 输出每个活动行的：行内 opacity、计算 opacity、以及完整祖先链的 opacity/display，
 * 直接把「到底是谁把 opacity 变成 0」指出来。
 *
 * 用法：node scripts/probe-visibility.mjs [variantId] [sampleId]
 */

import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchChrome, openPage, evaluate, sleep, freePort } from './cdp.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

async function startServer() {
  const port = await freePort();
  const child = spawn(process.execPath, ['serve.mjs', '--port', String(port)], { cwd: ROOT, stdio: 'ignore' });
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/index.html`);
      if (res.ok) return { url: `http://127.0.0.1:${port}/`, stop: () => child.kill() };
    } catch { /* 继续等 */ }
    await sleep(100);
  }
  child.kill();
  throw new Error('服务器未就绪');
}

const PROBE = `(async (variantId, sampleId, msOverride) => {
  const demo = window.__DSH_DEMO__;
  const modeOf = { v1:'visual', v2:'visual', v3:'visual', p1:'performance', p2:'performance', p3:'performance', r1:'preview', r2:'preview', r3:'preview' };
  demo.selectMode(modeOf[variantId]);
  demo.selectVariant(variantId);
  await demo.selectSample(sampleId);
  const lines = demo.state.data.lines;
  const dur = demo.state.data.stats.durationMs;

  // 选一个活动行最多的时刻
  let best = 0, bestMs = 0;
  for (const l of lines) {
    const t = l.startMs + 1;
    const n = lines.filter(x => x.startMs <= t && t < x.endMs).length;
    if (n > best) { best = n; bestMs = t; }
  }
  const ms = msOverride || bestMs;

  // 关闭过渡：computed opacity 在过渡进行中会读到起始值（0），
  // 会把「渲染器已把活动行置为可见」误判成不可见。这里先排除该干扰。
  const noTrans = document.getElementById('__probe_no_transition');
  if (!noTrans) {
    const st = document.createElement('style');
    st.id = '__probe_no_transition';
    st.textContent = '*, *::after { transition: none !important; }';
    document.head.appendChild(st);
  }

  // 注意：这里刻意不调用 demo.drawFrame，而是直接调 instance.update，
  // 复现 selftest 的调用方式，避免 drawFrame 里的额外逻辑掩盖问题。
  const slot = demo.state.slots[0];
  slot.instance.update({ ms, state: 'paused', rate: 1, durationMs: dur });
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

  const host = slot.host;
  const active = lines.filter(x => x.startMs <= ms && ms < x.endMs);

  const chain = (node) => {
    const out = [];
    let el = node;
    while (el && el.nodeType === 1) {
      const cs = getComputedStyle(el);
      out.push({
        tag: el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ').join('.') : ''),
        opacity: cs.opacity,
        display: cs.display,
        visibility: cs.visibility,
      });
      el = el.parentElement;
    }
    return out;
  };

  const rows = [];
  for (const line of active) {
    const node = host.querySelector('[data-index="' + line.index + '"]');
    if (!node) { rows.push({ idx: line.index, role: line.role, MISSING: true }); continue; }
    const cs = getComputedStyle(node);
    rows.push({
      idx: line.index,
      role: line.role,
      offscreen: node.dataset.offscreen ?? '(未设置)',
      inlineOpacity: node.style.opacity,
      computedOpacity: cs.opacity,
      computedDisplay: cs.display,
      computedVisibility: cs.visibility,
      hasIsActive: node.classList.contains('is-active'),
    });
  }

  // 也统计所有 [data-index] 里 is-active 的数量
  const all = [...host.querySelectorAll('[data-index]')];
  const visibleCount = all.filter(n => {
    const cs = getComputedStyle(n);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) >= 0.02;
  }).length;

  return JSON.stringify({
    variantId, sampleId, ms, peakActive: best,
    activeCount: active.length,
    visibleDataIndexNodes: visibleCount,
    totalDataIndexNodes: all.length,
    hostClass: host.className,
    rows,
  }, null, 1);
})`;

async function main() {
  const variantId = process.argv[2] || 'v2';
  const sampleId = process.argv[3] || 'real-3402223603';
  const msOverride = process.argv[4] ? Number(process.argv[4]) : null;

  const server = await startServer();
  let chrome = null;
  try {
    chrome = await launchChrome({ width: 1600, height: 900 });
    await openPage(chrome.cdp, server.url, { timeoutMs: 45000 });
    await sleep(700);
    const out = await evaluate(chrome.cdp, `${PROBE}(${JSON.stringify(variantId)}, ${JSON.stringify(sampleId)}, ${msOverride})`);
    console.log(out);
  } finally {
    if (chrome) await chrome.close();
    server.stop();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
