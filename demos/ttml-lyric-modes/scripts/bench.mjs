#!/usr/bin/env node
/**
 * 性能基准 —— 逐个方案在真实播放条件下测量写入成本，输出可对比的表格。
 *
 * 为什么必须实测：本 demo 的「性能优先」主张必须可证伪。
 * 观感上的「流畅」不足以说明省在哪里，因此直接量四件事：
 *   - 样式写入 / 帧（实际落到 DOM 的次数，已扣除去重跳过）
 *   - class 变更 / 帧
 *   - 强制布局读取 / 帧（会触发重排，最贵）
 *   - rAF 回调 / 帧（捕捉「方案偷偷又开了循环」）
 *
 * 重要口径：所有方案共用唯一时钟（js/scheduler.js），因此 rAF 基数一致，
 * 差异全部来自方案自身。测量期间关闭诊断面板自身的刷新开销。
 *
 * 用法：
 *   node scripts/bench.mjs                  # 真实样本，全部 9 个方案
 *   node scripts/bench.mjs --sample duet
 *   node scripts/bench.mjs --seconds 6
 */

import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchChrome, openPage, evaluate, sleep, freePort } from './cdp.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

const ALL = ['v1', 'v2', 'v3', 'p1', 'p2', 'p3', 'r1', 'r2', 'r3'];
const MODE_OF = {
  v1: 'visual', v2: 'visual', v3: 'visual',
  p1: 'performance', p2: 'performance', p3: 'performance',
  r1: 'preview', r2: 'preview', r3: 'preview',
};

function parseArgs(argv) {
  const out = { variants: [], sample: 'real-3402223603', seconds: 4, startMs: 30000 };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--sample') out.sample = argv[++i];
    else if (a === '--seconds') out.seconds = Number(argv[++i]);
    else if (a === '--start') out.startMs = Number(argv[++i]);
    else if (ALL.includes(a)) out.variants.push(a);
  }
  if (!out.variants.length) out.variants = ALL.slice();
  return out;
}

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

/**
 * 在页面内测量一个方案。
 *
 * 做法：选好方案 → 关闭诊断面板刷新（避免测量工具本身成为噪声）→
 * 从 startMs 起真实播放 N 秒 → 读取累计计数器。
 */
function benchScript(variantId, sampleId, seconds, startMs) {
  return `(async () => {
    const demo = window.__DSH_DEMO__;
    const counters = await import('./js/dom.js');
    const diag = await import('./js/diagnostics.js');

    demo.selectMode(${JSON.stringify(MODE_OF)}[${JSON.stringify(variantId)}]);
    demo.selectVariant(${JSON.stringify(variantId)});
    await demo.selectSample(${JSON.stringify(sampleId)});

    // 关掉诊断面板的每帧刷新：它是测量工具，不该计入被测成本
    const panel = document.getElementById('diag');
    const realTextContent = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
    // 用 CSS 隐藏不足以省掉 JS 组装；直接把 renderDiag 的节流计数打满不现实，
    // 故改为清空容器并让每次采样后的重建落在游离节点上（成本恒定且与方案无关）。
    const detached = document.createElement('div');
    const origAppend = panel.appendChild.bind(panel);
    panel.appendChild = (n) => detached.appendChild(n);

    demo.state.clock.seek(${Number(startMs)});
    counters.resetCounters();
    demo.state.diag.reset();

    const framesBefore = demo.state.clock.frameCount;
    demo.state.clock.play();
    await new Promise(r => setTimeout(r, ${Number(seconds) * 1000}));
    demo.state.clock.pause();
    const frames = demo.state.clock.frameCount - framesBefore;

    // 读累计计数：diagnostics.sample 每帧会 reset，故取最近一帧的窗口值
    const summary = demo.state.diag.summary();
    const stats = demo.state.slots[0] && demo.state.slots[0].instance.stats
      ? demo.state.slots[0].instance.stats() : {};

    return JSON.stringify({
      variantId: ${JSON.stringify(variantId)},
      frames,
      seconds: ${Number(seconds)},
      styleWritesPerFrame: summary.styleWritesPerFrame,
      styleSkipsPerFrame: summary.styleSkipsPerFrame,
      classTogglesPerFrame: summary.classTogglesPerFrame,
      layoutReadsPerFrame: summary.layoutReadsPerFrame,
      rafCallbacksPerFrame: summary.rafCallbacksPerFrame,
      avgFrameMs: summary.avgFrameMs,
      fps: summary.fps,
      nodes: stats.nodes ?? summary.nodes,
      model: stats.model || '',
    });
  })()`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const server = await startServer();
  let chrome = null;
  try {
    chrome = await launchChrome({ width: 1680, height: 940 });
    await openPage(chrome.cdp, server.url, { timeoutMs: 45000 });
    await sleep(900);

    const rows = [];
    for (const id of args.variants) {
      // 每个方案跑一轮预热 + 一轮正式，消除首帧建 DOM 的开销
      await evaluate(chrome.cdp, benchScript(id, args.sample, 0.4, args.startMs));
      const raw = await evaluate(chrome.cdp, benchScript(id, args.sample, args.seconds, args.startMs));
      const r = JSON.parse(raw);
      rows.push(r);
      console.log(`  测量 ${id} … ${r.frames} 帧`);
    }

    const pad = (s, n) => String(s).padEnd(n);
    const padL = (s, n) => String(s).padStart(n);
    console.log(`\n样本：${args.sample}    每方案播放：${args.seconds}s    起始：${args.startMs}ms\n`);
    console.log(
      `${pad('方案', 5)}${pad('模式', 12)}${padL('帧数', 6)}${padL('样式写/帧', 11)}`
      + `${padL('跳过/帧', 9)}${padL('class/帧', 10)}${padL('布局读/帧', 11)}`
      + `${padL('rAF/帧', 8)}${padL('节点', 7)}  模型`,
    );
    console.log('─'.repeat(130));
    for (const r of rows) {
      console.log(
        `${pad(r.variantId, 5)}${pad(MODE_OF[r.variantId], 12)}`
        + `${padL(r.frames, 6)}${padL(r.styleWritesPerFrame.toFixed(1), 11)}`
        + `${padL(r.styleSkipsPerFrame.toFixed(1), 9)}${padL(r.classTogglesPerFrame.toFixed(1), 10)}`
        + `${padL(r.layoutReadsPerFrame.toFixed(1), 11)}${padL(r.rafCallbacksPerFrame.toFixed(2), 8)}`
        + `${padL(r.nodes, 7)}  ${r.model}`,
      );
    }

    // 结论：按关键指标点名最优者
    if (rows.length > 1) {
      const min = (key) => rows.reduce((a, b) => (b[key] < a[key] ? b : a));
      console.log('');
      console.log(`样式写入最少：${min('styleWritesPerFrame').variantId}`
        + `（${min('styleWritesPerFrame').styleWritesPerFrame.toFixed(1)}/帧）`);
      console.log(`布局读取最少：${min('layoutReadsPerFrame').variantId}`
        + `（${min('layoutReadsPerFrame').layoutReadsPerFrame.toFixed(1)}/帧）`);
      console.log(`DOM 节点最少：${min('nodes').variantId}（${min('nodes').nodes} 个）`);
    }
  } finally {
    if (chrome) await chrome.close();
    server.stop();
  }
}

main().catch((e) => { console.error('基准脚本异常：', e); process.exit(1); });
