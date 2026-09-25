#!/usr/bin/env node
/**
 * 时钟帧率探针 —— 判断 headless 下的低帧数是「共享时钟被节流」还是「渲染代码慢」。
 *
 * 做法：在同一页面里同时测量
 *   A. 裸 rAF 回调频率（无任何渲染）
 *   B. 时钟 onFrame 回调频率
 *   C. 单个方案 update 的平均耗时
 * 若 A 本身就低，说明是 headless 的 rAF 节流（环境限制）；
 * 若 A 正常而 B 低，则是时钟实现问题；若 C 很高，则是渲染代码问题。
 *
 * 用法：node scripts/probe-clock.mjs
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

async function main() {
  const server = await startServer();
  let chrome = null;
  try {
    chrome = await launchChrome({ width: 1600, height: 900 });
    await openPage(chrome.cdp, server.url, { timeoutMs: 45000 });
    await sleep(700);

    // A. 裸 rAF 频率（页面隐藏与否都会影响）
    const bare = await evaluate(chrome.cdp, `(async () => {
      let n = 0;
      const t0 = performance.now();
      await new Promise(resolve => {
        const loop = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(loop); else resolve(); };
        requestAnimationFrame(loop);
      });
      const dt = performance.now() - t0;
      return JSON.stringify({
        bareFrames: n,
        bareMs: +dt.toFixed(0),
        bareFps: +(n / (dt / 1000)).toFixed(1),
        hidden: document.hidden,
        visibilityState: document.visibilityState,
      });
    })()`);
    console.log('A. 裸 rAF：', bare);

    // B. 时钟回调频率 + C. 单方案 update 耗时
    const clockProbe = await evaluate(chrome.cdp, `(async () => {
      const demo = window.__DSH_DEMO__;
      demo.selectMode('visual');
      demo.selectVariant('v1');
      await demo.selectSample('real-3402223603');

      // 测 update 耗时
      const slot = demo.state.slots[0];
      const N = 120;
      const t0 = performance.now();
      for (let i = 0; i < N; i++) slot.instance.update({ ms: 30000 + i * 16, state: 'playing', rate: 1, durationMs: 260000 });
      const updateMs = (performance.now() - t0) / N;

      // 测时钟实际帧数
      const start = demo.state.clock.frameCount;
      const wall = performance.now();
      demo.state.clock.play();
      await new Promise(r => setTimeout(r, 2000));
      const frames = demo.state.clock.frameCount - start;
      const dt = performance.now() - wall;
      demo.state.clock.pause();
      return JSON.stringify({
        updateMsPerFrame: +updateMs.toFixed(3),
        clockFrames: frames,
        clockMs: +dt.toFixed(0),
        clockFps: +(frames / (dt / 1000)).toFixed(1),
      }, null, 1);
    })()`);
    console.log('B/C. 时钟与 update：', clockProbe);

    // D. 关掉 countNodes（app 每帧调用）后再测时钟帧数
    const withoutCount = await evaluate(chrome.cdp, `(async () => {
      const demo = window.__DSH_DEMO__;
      // 猴补：临时把 drawFrame 里的 countNodes 变廉价，看帧数是否回升
      const start = demo.state.clock.frameCount;
      const wall = performance.now();
      demo.state.clock.play();
      await new Promise(r => setTimeout(r, 2000));
      const frames = demo.state.clock.frameCount - start;
      const dt = performance.now() - wall;
      demo.state.clock.pause();
      return JSON.stringify({ frames, ms: +dt.toFixed(0), fps: +(frames / (dt / 1000)).toFixed(1) });
    })()`);
    console.log('D. 再测一次时钟：', withoutCount);
  } finally {
    if (chrome) await chrome.close();
    server.stop();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
