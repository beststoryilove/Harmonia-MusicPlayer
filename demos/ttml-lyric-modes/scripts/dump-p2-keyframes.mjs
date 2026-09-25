#!/usr/bin/env node
/**
 * 关键帧 dump —— 打印 P2 生成的 dsTrackScroll 关键帧，用于核对保持段是否正确。
 *
 * 用法：node scripts/dump-p2-keyframes.mjs [sampleId] [variantId]
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
  const sampleId = process.argv[2] || 'real-3402223603';
  const server = await startServer();
  let chrome = null;
  try {
    chrome = await launchChrome({ width: 1680, height: 940 });
    await openPage(chrome.cdp, server.url, { timeoutMs: 45000 });
    await sleep(700);
    const out = await evaluate(chrome.cdp, `(async () => {
      const demo = window.__DSH_DEMO__;
      demo.selectMode('performance');
      demo.selectVariant('p2');
      await demo.selectSample(${JSON.stringify(sampleId)});
      const styles = [...document.querySelectorAll('style')].map(s => s.textContent).filter(t => t.includes('dsTrackScroll'));
      const kf = styles[0] || '';
      const nameMatch = kf.match(/@keyframes dsTrackScroll\\{([\\s\\S]*?)\\}\\s*\\.ds-p2/);
      const body = nameMatch ? nameMatch[1] : kf.slice(0, 400);
      const stops = [...body.matchAll(/([\\d.]+)%\\{transform:translate3d\\(0,(-?[\\d.]+)px,0\\)\\}/g)]
        .map(m => ({ pct: Number(m[1]), y: Number(m[2]) }));
      // 相邻 stop 若 y 相同 => 保持段
      let holds = 0, moves = 0;
      for (let i = 1; i < stops.length; i++) {
        if (stops[i].y === stops[i-1].y) holds++; else moves++;
      }
      const stageH = demo.state.slots[0].host.clientHeight;
      return JSON.stringify({
        stopCount: stops.length, holds, moves, stageH,
        first20: stops.slice(0, 20),
      }, null, 1);
    })()`);
    console.log(out);
  } finally {
    if (chrome) await chrome.close();
    server.stop();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
