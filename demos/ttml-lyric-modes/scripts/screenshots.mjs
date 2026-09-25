#!/usr/bin/env node
/**
 * 截图脚本 —— 逐个方案渲染并截图，供人工/模型视觉核对。
 *
 * 为什么必须截图核对：自检能断言「活动行可见」，但断言不了
 * 「重叠行是否真的分处不同泳道」「背景行是否看得出是背景」
 * 「对唱是否读得出左右对话」。这些只能看。
 *
 * 用法：
 *   node scripts/screenshots.mjs                    # 全部 9 个方案 @ 真实样本
 *   node scripts/screenshots.mjs v1 p1 r1           # 指定方案
 *   node scripts/screenshots.mjs --sample duet      # 指定样本
 *   node scripts/screenshots.mjs --ms 8000          # 指定时刻
 *
 * 输出：scripts/out/<variant>-<sample>.png
 */

import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
import { launchChrome, openPage, evaluate, screenshot, sleep, freePort } from './cdp.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT_DIR = resolve(ROOT, 'scripts/out');

const ALL_VARIANTS = ['v1', 'v2', 'v3', 'p1', 'p2', 'p3', 'r1', 'r2', 'r3'];
const MODE_OF = {
  v1: 'visual', v2: 'visual', v3: 'visual',
  p1: 'performance', p2: 'performance', p3: 'performance',
  r1: 'preview', r2: 'preview', r3: 'preview',
};

function parseArgs(argv) {
  const out = { variants: [], sample: 'real-3402223603', ms: null, compare: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--sample') out.sample = argv[++i];
    else if (arg === '--ms') out.ms = Number(argv[++i]);
    else if (arg === '--compare') out.compare = true;
    else if (ALL_VARIANTS.includes(arg)) out.variants.push(arg);
  }
  if (!out.variants.length) out.variants = ALL_VARIANTS.slice();
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
 * 让页面进入「指定方案 + 指定样本 + 指定时刻」并停稳，返回现场信息。
 *
 * 关键：截图前必须关闭过渡动画，否则会截到过渡中间态（半透明、位移未到位），
 * 导致误判布局。
 *
 * @param {object} chrome launchChrome 返回的句柄
 * @param {string} variantId 方案 id；compare 为真时忽略
 * @param {string} sampleId 样本 id
 * @param {number|null} msOverride 指定时刻（毫秒）；null 表示自动取峰值并发时刻
 * @param {boolean} compare 是否对比模式（并排 3 个方案）
 * @returns {Promise<{ms: number, peakActive: number, slotCount: number}>}
 */
async function setup(chrome, variantId, sampleId, msOverride, compare) {
  const script = `(async () => {
    const demo = window.__DSH_DEMO__;
    const mode = ${JSON.stringify(MODE_OF)}[${JSON.stringify(variantId)}];
    demo.selectMode(mode);
    if (!${Boolean(compare)}) demo.selectVariant(${JSON.stringify(variantId)});

    const toggle = document.getElementById('compareToggle');
    if (toggle && toggle.checked !== ${Boolean(compare)}) toggle.click();

    // 关闭过渡：截图必须取终态，不能取过渡中间态
    let st = document.getElementById('__shot_no_transition');
    if (!st) {
      st = document.createElement('style');
      st.id = '__shot_no_transition';
      st.textContent = '*, *::after { transition: none !important; }';
      document.head.appendChild(st);
    }

    await demo.selectSample(${JSON.stringify(sampleId)});
    const lines = demo.state.data.lines;
    const dur = demo.state.data.stats.durationMs;

    // 默认挑「活动行最多」的时刻：那才是重叠/背景/对唱同时成立的关键瞬间
    let best = 0, bestMs = 0;
    for (const l of lines) {
      const t = l.startMs + 1;
      const n = lines.filter(x => x.startMs <= t && t < x.endMs).length;
      if (n > best) { best = n; bestMs = t; }
    }
    const ms = ${msOverride === null ? 'bestMs' : Number(msOverride)};
    demo.state.clock.seek(ms);
    demo.drawFrame({ ms, state: 'paused', rate: 1, durationMs: dur });
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    return JSON.stringify({
      ms, peakActive: best, slotCount: demo.state.slots.length,
      variantIds: demo.state.slots.map(s => s.variant.meta.id), mode,
    });
  })()`;
  const raw = await evaluate(chrome.cdp, script);
  return JSON.parse(raw);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await mkdir(OUT_DIR, { recursive: true });

  const server = await startServer();
  let chrome = null;
  try {
    chrome = await launchChrome({ width: 1680, height: 940 });
    await openPage(chrome.cdp, server.url, { timeoutMs: 45000 });
    await sleep(800);

    console.log(`输出目录：${OUT_DIR}\n`);

    if (args.compare) {
      // 对比模式：本模式 3 个方案并排，共用同一时钟与同一时刻
      const firstOfMode = { visual: 'v1', performance: 'p1', preview: 'r1' };
      for (const mode of ['visual', 'performance', 'preview']) {
        const info = await setup(chrome, firstOfMode[mode], args.sample, args.ms, true);
        const file = resolve(OUT_DIR, `compare-${mode}-${args.sample}.png`);
        await screenshot(chrome.cdp, file);
        console.log(`  compare-${mode.padEnd(12)} ms=${String(info.ms).padStart(7)} 峰值并发=${info.peakActive} 方案数=${info.slotCount}  -> ${file}`);
      }
    } else {
      for (const variantId of args.variants) {
        let info;
        try {
          info = await setup(chrome, variantId, args.sample, args.ms, false);
        } catch (error) {
          console.error(`  ✗ ${variantId} 装配失败：${error.message}`);
          continue;
        }
        const file = resolve(OUT_DIR, `${variantId}-${args.sample}.png`);
        await screenshot(chrome.cdp, file);
        console.log(`  ${variantId.padEnd(3)} ${String(info.mode).padEnd(12)} ms=${String(info.ms).padStart(7)} 峰值并发=${info.peakActive}  -> ${file}`);
      }
    }
  } finally {
    if (chrome) await chrome.close();
    server.stop();
  }
  console.log('\n完成。');
}

main().catch((error) => {
  console.error('截图脚本异常：', error);
  process.exit(1);
});
