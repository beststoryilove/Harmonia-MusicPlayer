#!/usr/bin/env node
/**
 * P2 聚焦度探针 —— 检查 CSS 时间轴驱动方案里「当前行是否落在视觉中心」。
 *
 * 背景：P2 用 keyframes 在行起点之间做线性插值。若插值区间跨度过大，
 * 当前行可能只在「恰逢其起点」的瞬间居中，其余时间都偏离中心。
 * 本脚本量化这个偏移，用来判断是否需要改进关键帧策略。
 *
 * 用法：node scripts/probe-p2-focus.mjs [sampleId]
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
      const lines = demo.state.data.lines;
      const slot = demo.state.slots[0];
      const host = slot.host;
      const dur = demo.state.data.stats.durationMs;

      // P2 的 update 只在「跨越行边界 / 跳转」时重锚，所以要逐点 seek 后强制 update
      const samples = [];
      for (let t = 20000; t < 60000; t += 2500) {
        demo.state.clock.seek(t);
        slot.instance.update({ ms: t, state: 'paused', rate: 1, durationMs: dur });
        const track = host.querySelector('.ds-track');
        const cs = getComputedStyle(track);
        // 找出该时刻的主行（前景行）
        const active = lines.filter(l => l.startMs <= t && t < l.endMs);
        const main = active.find(l => l.role === 'main') || active[0];
        let rowY = null;
        if (main) {
          const node = host.querySelector('[data-index="' + main.index + '"]');
          if (node) rowY = parseFloat(node.style.top) || 0;
        }
        const m = new DOMMatrixReadOnly(cs.transform);
        const trackY = m.m42;
        const stageH = host.clientHeight;
        const centerY = stageH / 2 - 36; // LANE_H/2 = 36
        samples.push({
          t,
          mainIdx: main ? main.index : null,
          mainRole: main ? main.role : null,
          rowY,
          trackY: +trackY.toFixed(1),
          // 主行屏幕位置 = rowY + trackY；与理想中心 centerY 的偏差
          mainScreenY: rowY === null ? null : +(rowY + trackY).toFixed(1),
          offsetFromCenter: rowY === null ? null : +((rowY + trackY) - centerY).toFixed(1),
        });
      }
      return JSON.stringify({ stageH: host.clientHeight, samples }, null, 1);
    })()`);
    const parsed = JSON.parse(out);
    console.log('stage 高度：', parsed.stageH);
    console.log('理想中心 Y =', parsed.stageH / 2 - 36);
    console.log('');
    console.log('时刻(ms)   主行  角色   rowY   trackY  主行屏幕Y  偏离中心');
    for (const s of parsed.samples) {
      const off = s.offsetFromCenter;
      const flag = off === null ? '' : (Math.abs(off) <= 40 ? ' ✓' : (Math.abs(off) <= 120 ? ' ~' : ' ✗'));
      console.log(
        `${String(s.t).padStart(7)}  ${String(s.mainIdx).padStart(4)}  ${String(s.mainRole).padEnd(4)}  `
        + `${String(s.rowY).padStart(5)}  ${String(s.trackY).padStart(7)}  ${String(s.mainScreenY).padStart(8)}  `
        + `${String(off).padStart(7)}${flag}`,
      );
    }
  } finally {
    if (chrome) await chrome.close();
    server.stop();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
