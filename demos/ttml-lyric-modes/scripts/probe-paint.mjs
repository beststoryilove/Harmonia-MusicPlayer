#!/usr/bin/env node
/**
 * 绘制成本探针 —— 判定低帧数来自「JS」还是「浏览器绘制/合成」。
 *
 * 方法：在相同页面上依次测量时钟帧率
 *   ① 舞台已装配（77 行、含 will-change / blur）
 *   ② 舞台已 destroy（无任何歌词 DOM）
 *   ③ 装配但去掉 will-change 与 filter
 * 若 ② 恢复到 ~60fps，则瓶颈在绘制而非 JS。
 *
 * 用法：node scripts/probe-paint.mjs
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

/** 在页面内测 2 秒时钟帧率。 */
const MEASURE = `(async (label) => {
  const demo = window.__DSH_DEMO__;
  const start = demo.state.clock.frameCount;
  const wall = performance.now();
  demo.state.clock.play();
  await new Promise(r => setTimeout(r, 2000));
  const frames = demo.state.clock.frameCount - start;
  const dt = performance.now() - wall;
  demo.state.clock.pause();
  return { label, frames, ms: Math.round(dt), fps: +(frames / (dt / 1000)).toFixed(1) };
})`;

async function main() {
  const server = await startServer();
  let chrome = null;
  try {
    chrome = await launchChrome({ width: 1600, height: 900 });
    await openPage(chrome.cdp, server.url, { timeoutMs: 45000 });
    await sleep(700);

    const results = [];

    // ① 装配 v1（77 行）
    await evaluate(chrome.cdp, `(async () => {
      const demo = window.__DSH_DEMO__;
      demo.selectMode('visual'); demo.selectVariant('v1');
      await demo.selectSample('real-3402223603');
    })()`);
    await sleep(300);
    results.push(await evaluate(chrome.cdp, `${MEASURE}('① v1 装配（77 行，含 will-change/blur）')`));

    // ② destroy 后（无歌词 DOM）
    await evaluate(chrome.cdp, `(() => {
      const demo = window.__DSH_DEMO__;
      for (const s of demo.state.slots) s.instance.destroy();
      document.getElementById('stages').textContent = '';
    })()`);
    await sleep(300);
    results.push(await evaluate(chrome.cdp, `${MEASURE}('② 舞台清空（无歌词 DOM）')`));

    // ③ 重新装配，但禁用 will-change 与 filter
    await evaluate(chrome.cdp, `(async () => {
      const demo = window.__DSH_DEMO__;
      demo.selectMode('visual'); demo.selectVariant('v1');
      await demo.selectSample('real-3402223603');
      const st = document.createElement('style');
      st.id = '__no_paint_cost';
      st.textContent = '.ds-line { will-change: auto !important; filter: none !important; } .ds-word { will-change: auto !important; }';
      document.head.appendChild(st);
    })()`);
    await sleep(300);
    results.push(await evaluate(chrome.cdp, `${MEASURE}('③ v1 装配但禁用 will-change/filter')`));

    // ④ 恢复 filter/will-change，但把非活动行 display:none（模拟窗口虚拟化）
    await evaluate(chrome.cdp, `(async () => {
      const st = document.getElementById('__no_paint_cost');
      if (st) st.remove();
      const demo = window.__DSH_DEMO__;
      const host = demo.state.slots[0].host;
      // 只保留 12 行在渲染树里
      const all = [...host.querySelectorAll('[data-index]')];
      all.slice(12).forEach(el => { el.style.display = 'none'; });
    })()`);
    await sleep(300);
    results.push(await evaluate(chrome.cdp, `${MEASURE}('④ v1 仅 12 行参与绘制')`));

    console.log('\n绘制成本对比：');
    for (const r of results) {
      console.log(`  ${r.label.padEnd(42)} ${String(r.fps).padStart(6)} fps  (${r.frames} 帧 / ${r.ms}ms)`);
    }
  } finally {
    if (chrome) await chrome.close();
    server.stop();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
