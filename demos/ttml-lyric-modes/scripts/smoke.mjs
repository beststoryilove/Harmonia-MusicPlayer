#!/usr/bin/env node
/**
 * 冒烟测试 —— headless Chrome 加载 demo，跑页面内自检，断言结果。
 *
 * 为什么必须做这一步：纯逻辑测试（tests/*.test.js）覆盖不到 DOM 渲染，
 * 而本 demo 的核心命题恰恰是「重叠行是否真的同屏可见」。
 * 页面内自检（js/selftest.js）把这类观感变成断言，本脚本负责把它跑起来。
 *
 * 用法：node scripts/smoke.mjs
 * 退出码：0 = 全部通过；1 = 有失败项。
 */

import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchChrome, openPage, evaluate, waitFor, sleep, freePort } from './cdp.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

/** 启动 demo 静态服务器（后台），返回 { url, stop }。 */
async function startServer() {
  const port = await freePort();
  const child = spawn(process.execPath, ['serve.mjs', '--port', String(port)], {
    cwd: ROOT,
    stdio: 'ignore',
  });
  // 等端口就绪
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/index.html`);
      if (res.ok) return { url: `http://127.0.0.1:${port}/`, stop: () => child.kill() };
    } catch { /* 继续等 */ }
    await sleep(100);
  }
  child.kill();
  throw new Error('demo 静态服务器未就绪');
}

async function main() {
  console.log('▶ 启动 demo 服务器…');
  const server = await startServer();
  console.log(`  已就绪：${server.url}`);

  let chrome = null;
  let failures = 0;
  try {
    console.log('▶ 启动 headless Chrome…');
    chrome = await launchChrome({ width: 1600, height: 900 });
    console.log(`  ${chrome.chromeVersion}`);

    const target = `${server.url}?selftest=1`;
    console.log(`▶ 打开 ${target}`);
    const { consoleErrors } = await openPage(chrome.cdp, target, { timeoutMs: 45000 });

    console.log('▶ 等待页面内自检完成…');
    const done = await waitFor(
      chrome.cdp,
      `document.body.dataset.selftest !== undefined`,
      { timeoutMs: 90000 },
    );
    if (!done) {
      console.error('✗ 自检未在 90s 内完成');
      failures += 1;
    } else {
      const summary = await evaluate(chrome.cdp, 'JSON.stringify(window.__DSH_SELFTEST__)');
      const parsed = JSON.parse(summary || '{}');
      console.log(`\n自检结果：${parsed.passed ?? 0} 通过 / ${parsed.failed ?? '?'} 失败`);
      if (parsed.error) console.error(`  异常：${parsed.error}`);

      const report = await evaluate(chrome.cdp, `document.getElementById('report').innerText`);
      const failedLines = String(report || '')
        .split('\n')
        .filter((line) => line.trim().startsWith('✗'));
      if (failedLines.length) {
        console.error('\n失败项：');
        for (const line of failedLines) console.error(`  ${line}`);
      }
      if ((parsed.failed ?? 1) !== 0) failures += 1;

      const state = await evaluate(chrome.cdp, 'document.body.dataset.selftest');
      if (state !== 'pass') {
        console.error(`✗ body[data-selftest] = ${state}`);
        failures += 1;
      }
    }

    // 交互冒烟：切模式 / 切方案 / 切样本 / 开对比 / 播放，确认不抛错
    console.log('\n▶ 交互冒烟…');
    const interactionErrors = await evaluate(chrome.cdp, `(async () => {
      const errors = [];
      const demo = window.__DSH_DEMO__;
      if (!demo) return ['__DSH_DEMO__ 未暴露'];
      const ids = ['visual', 'performance', 'preview'];
      for (const mode of ids) {
        try {
          demo.selectMode(mode);
          await new Promise(r => setTimeout(r, 120));
          const slots = demo.state.slots.length;
          if (slots < 1) errors.push('模式 ' + mode + ' 装配后无方案实例');
        } catch (e) { errors.push('selectMode(' + mode + '): ' + e.message); }
      }
      // 逐个方案单独渲染
      for (const mode of ids) {
        demo.selectMode(mode);
        await new Promise(r => setTimeout(r, 80));
        for (const id of demo.state.slots.map(s => s.variant.meta.id).slice()) {
          try {
            demo.selectVariant(id);
            await new Promise(r => setTimeout(r, 80));
          } catch (e) { errors.push('selectVariant(' + id + '): ' + e.message); }
        }
      }
      // 对比模式
      try {
        demo.selectMode('visual');
        document.getElementById('compareToggle').click();
        await new Promise(r => setTimeout(r, 200));
        if (demo.state.slots.length !== 3) errors.push('对比模式应装配 3 个方案，实际 ' + demo.state.slots.length);
        document.getElementById('compareToggle').click();
        await new Promise(r => setTimeout(r, 120));
      } catch (e) { errors.push('compare: ' + e.message); }
      // 逐个样本
      for (const sample of ['background-overlap', 'duet', 'sidecar-ruby', 'real-3402223603', 'encanto-bruno']) {
        try {
          await demo.selectSample(sample);
          await new Promise(r => setTimeout(r, 150));
          if (!demo.state.data || demo.state.data.lines.length === 0) {
            errors.push('样本 ' + sample + ' 未解析出行');
          }
        } catch (e) { errors.push('selectSample(' + sample + '): ' + e.message); }
      }
      return errors;
    })()`);

    if (Array.isArray(interactionErrors) && interactionErrors.length) {
      console.error('✗ 交互冒烟发现错误：');
      for (const err of interactionErrors) console.error(`  ${err}`);
      failures += 1;
    } else {
      console.log('  ✓ 模式 / 方案 / 样本 / 对比模式切换均无异常');
    }

    // 播放 2 秒，确认帧循环不抛错。
    //
    // 判据为什么不是帧率：headless Chrome 的帧数由合成时机决定，同一方案不同
    // 轮次实测在 18~75 帧/2s 之间波动（纯 JS 侧 update() 仅 0.34ms/帧，
    // 瓶颈在浏览器合成）。用帧数做断言必然 flaky。
    //
    // 改为断言三件确定性事实：
    //   ① 时钟按墙钟推进（误差 < 25%，与帧率无关）；
    //   ② 帧循环确实在跑（帧数 > 5，只用于捕捉「彻底卡死」）；
    //   ③ 期间没有未捕获异常 / 未处理 rejection。
    const playErrors = await evaluate(chrome.cdp, `(async () => {
      const errors = [];
      const demo = window.__DSH_DEMO__;
      demo.selectMode('visual');
      await demo.selectSample('real-3402223603');
      const captured = [];
      window.addEventListener('error', e => captured.push(String(e.message)));
      window.addEventListener('unhandledrejection', e => captured.push('rejection: ' + String(e.reason)));

      demo.state.clock.seek(0);
      const framesBefore = demo.state.clock.frameCount;
      const wallStart = performance.now();
      demo.state.clock.play();
      await new Promise(r => setTimeout(r, 2000));
      demo.state.clock.pause();
      const wallElapsed = performance.now() - wallStart;

      const frames = demo.state.clock.frameCount - framesBefore;
      const clockMs = demo.state.clock.now();

      if (frames <= 5) errors.push('帧循环疑似卡死：2 秒仅 ' + frames + ' 帧');
      // 时钟推进应与墙钟一致（允许 25% 误差，覆盖启动/停止开销）
      const drift = Math.abs(clockMs - wallElapsed) / wallElapsed;
      if (drift > 0.25) {
        errors.push('时钟漂移过大：推进 ' + clockMs.toFixed(0) + 'ms / 墙钟 '
          + wallElapsed.toFixed(0) + 'ms（' + (drift * 100).toFixed(1) + '%）');
      }
      return { errors: errors.concat(captured), frames, clockMs: Math.round(clockMs), wallElapsed: Math.round(wallElapsed) };
    })()`);

    if (playErrors?.errors?.length) {
      console.error('✗ 播放期发现错误：');
      for (const err of playErrors.errors) console.error(`  ${err}`);
      failures += 1;
    } else {
      console.log(
        `  ✓ 播放正常：时钟推进 ${playErrors.clockMs}ms / 墙钟 ${playErrors.wallElapsed}ms`
        + `（${playErrors.frames} 帧，无异常）`,
      );
    }

    // 页面级控制台错误
    const realErrors = consoleErrors.filter((e) => !/favicon/i.test(e));
    if (realErrors.length) {
      console.error('\n✗ 页面控制台错误：');
      for (const err of realErrors.slice(0, 20)) console.error(`  ${err}`);
      failures += 1;
    } else {
      console.log('\n✓ 页面无控制台错误');
    }
  } finally {
    if (chrome) await chrome.close();
    server.stop();
  }

  console.log(failures === 0 ? '\n✅ 冒烟通过' : `\n❌ 冒烟失败（${failures} 项）`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('冒烟脚本异常：', error);
  process.exit(1);
});
