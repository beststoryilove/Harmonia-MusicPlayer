#!/usr/bin/env node
/**
 * 视觉优先调参探针 —— 逐个关掉昂贵效果，量化各自的帧率代价。
 *
 * 背景：视觉优先（V1）的既有语汇包含 blur + scale + 级联，是全 demo 最重的模式。
 * 但「重」到什么程度、主要由哪一项造成，必须实测而非估计。
 * 本脚本在同一页面上依次禁用单项效果并测帧率，直接读出归因。
 *
 * 用法：node scripts/probe-visual-cost.mjs [variantId] [sampleId]
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

/** 测 2 秒真实播放的帧数。 */
const MEASURE = `(async (label) => {
  const demo = window.__DSH_DEMO__;
  const start = demo.state.clock.frameCount;
  demo.state.clock.play();
  await new Promise(r => setTimeout(r, 2000));
  const frames = demo.state.clock.frameCount - start;
  demo.state.clock.pause();
  return { label, frames, fps: +(frames / 2).toFixed(1) };
})`;

/** 注入一条覆盖样式（后加的同优先级规则生效，故用 !important 保证覆盖）。 */
const override = (css) => `(() => {
  let el = document.getElementById('__probe_override');
  if (!el) { el = document.createElement('style'); el.id = '__probe_override'; document.head.appendChild(el); }
  el.textContent = ${JSON.stringify(css)};
  return true;
})()`;

async function main() {
  const variantId = process.argv[2] || 'v1';
  const sampleId = process.argv[3] || 'real-3402223603';
  const server = await startServer();
  let chrome = null;
  try {
    chrome = await launchChrome({ width: 1680, height: 940 });
    await openPage(chrome.cdp, server.url, { timeoutMs: 45000 });
    await sleep(800);

    await evaluate(chrome.cdp, `(async () => {
      const demo = window.__DSH_DEMO__;
      demo.selectMode('visual');
      demo.selectVariant(${JSON.stringify(variantId)});
      await demo.selectSample(${JSON.stringify(sampleId)});
      demo.state.clock.seek(30000);
    })()`);

    const results = [];
    // 基线：原样
    await evaluate(chrome.cdp, override(''));
    results.push(await evaluate(chrome.cdp, `${MEASURE}('① 基线（全效果）')`));

    // 关闭 blur
    await evaluate(chrome.cdp, override('.ds-line { filter: none !important; }'));
    results.push(await evaluate(chrome.cdp, `${MEASURE}('② 关闭 filter:blur')`));

    // 关闭 scale（改回纯位移）
    await evaluate(chrome.cdp, override('.ds-line { filter: none !important; }'));
    await evaluate(chrome.cdp, `(() => {
      // 直接改写内联 transform 里的 scale 不便，改为测试 transform 本身的开销
      return true;
    })()`);
    results.push(await evaluate(chrome.cdp, `${MEASURE}('③ 关闭 blur 后（重复测）')`));

    // 关闭 transition
    await evaluate(chrome.cdp, override('.ds-line { filter: none !important; transition: none !important; }'));
    results.push(await evaluate(chrome.cdp, `${MEASURE}('④ 关闭 blur + transition')`));

    // 关闭离屏剔除，看剔除本身值多少
    await evaluate(chrome.cdp, override('.ds-line { filter: none !important; transition: none !important; } .ds-line[data-offscreen="1"] { visibility: visible !important; }'));
    results.push(await evaluate(chrome.cdp, `${MEASURE}('⑤ 关闭 blur+transition+剔除')`));

    console.log(`\n${variantId} @ ${sampleId} 的绘制成本归因：`);
    for (const r of results) {
      console.log(`  ${r.label.padEnd(34)} ${String(r.fps).padStart(6)} fps  (${r.frames} 帧 / 2s)`);
    }
  } finally {
    if (chrome) await chrome.close();
    server.stop();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
