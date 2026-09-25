#!/usr/bin/env node
/**
 * 用户文件界面的截图 —— 载入自带 TTML + 音频后截图，用于人工核对界面。
 *
 * 依赖 test-user-files.mjs 生成的夹具（scripts/fixtures/）。
 *
 * 用法：node scripts/shots-user-files.mjs
 */

import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { launchChrome, openPage, evaluate, screenshot, sleep, freePort } from './cdp.mjs';
import { makeWav } from './make-test-audio.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const FIXTURES = resolve(ROOT, 'scripts/fixtures');
const OUT = resolve(ROOT, 'scripts/out');

const USER_TTML = `<?xml version="1.0" encoding="UTF-8"?>
<tt xmlns="http://www.w3.org/ns/ttml"
    xmlns:ttm="http://www.w3.org/ns/ttml#metadata"
    xmlns:itunes="http://music.apple.com/lyric-ttml-internal"
    xml:lang="zh-Hans" itunes:timing="Word">
  <head>
    <metadata>
      <ttm:title>用户自造测试歌词</ttm:title>
      <ttm:agent type="person" xml:id="v1"><ttm:name type="full">甲</ttm:name></ttm:agent>
      <ttm:agent type="person" xml:id="v2"><ttm:name type="full">乙</ttm:name></ttm:agent>
    </metadata>
  </head>
  <body>
    <div itunes:song-part="Verse">
      <p begin="00:01.000" end="00:04.000" itunes:key="U1" ttm:agent="v1">
        <span begin="00:01.000" end="00:02.000">用户歌词</span>
        <span begin="00:02.000" end="00:04.000">第一句</span>
        <span ttm:role="x-bg" begin="00:03.000" end="00:05.000">
          <span begin="00:03.000" end="00:04.000">（背景和声）</span>
        </span>
      </p>
      <p begin="00:04.000" end="00:08.000" itunes:key="U2" ttm:agent="v2">
        <span begin="00:04.000" end="00:06.000">乙的对唱</span>
        <span begin="00:06.000" end="00:08.000">重叠时间轴</span>
      </p>
      <p begin="00:09.000" end="00:12.000" itunes:key="U3" ttm:agent="v1">
        <span begin="00:09.000" end="00:12.000">最后一句收尾</span>
      </p>
    </div>
  </body>
</tt>
`;

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

async function setFileInput(cdp, selector, filePath) {
  const { root } = await cdp.send('DOM.getDocument');
  const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector });
  await cdp.send('DOM.setFileInputFiles', { nodeId, files: [filePath] });
}

async function main() {
  mkdirSync(FIXTURES, { recursive: true });
  mkdirSync(OUT, { recursive: true });
  const audioPath = resolve(FIXTURES, 'beep-30s.wav');
  if (!existsSync(audioPath)) writeFileSync(audioPath, makeWav(30));
  const ttmlPath = resolve(FIXTURES, 'user-lyrics.ttml');
  writeFileSync(ttmlPath, USER_TTML, 'utf8');

  const server = await startServer();
  let chrome = null;
  try {
    chrome = await launchChrome({ width: 1680, height: 940 });
    const { consoleErrors } = await openPage(chrome.cdp, server.url, { timeoutMs: 45000 });
    await chrome.cdp.send('DOM.enable');
    await sleep(700);

    await setFileInput(chrome.cdp, '#ttmlFile', ttmlPath);
    await sleep(600);
    await setFileInput(chrome.cdp, '#audioFile', audioPath);
    await sleep(900);

    // 关过渡 + 定位到 3.5s（U1 主行与背景行重叠的时刻）并稳定下来
    const info = await evaluate(chrome.cdp, `(async () => {
      const d = window.__DSH_DEMO__;
      let st = document.getElementById('__shot_no_transition');
      if (!st) {
        st = document.createElement('style');
        st.id = '__shot_no_transition';
        st.textContent = '*, *::after { transition: none !important; }';
        document.head.appendChild(st);
      }
      d.state.clock.pause();
      await new Promise(r => setTimeout(r, 200));
      d.state.clock.seek(3500);
      d.drawFrame({ ms: 3500, state: 'paused', rate: 1, durationMs: d.state.clock.durationMs });
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const active = d.state.data.lines.filter(l => l.startMs <= 3500 && 3500 < l.endMs);
      return JSON.stringify({ active: active.map(l => l.role + ':' + l.text) });
    })()`);
    console.log('3.5s 处活动行：', info);

    const file = resolve(OUT, 'user-files-visual.png');
    await screenshot(chrome.cdp, file);
    console.log('已截图：', file);

    const realErrors = consoleErrors.filter((e) => !/favicon/i.test(e));
    console.log(realErrors.length ? `控制台错误：${realErrors.join('; ')}` : '无控制台错误');
  } finally {
    if (chrome) await chrome.close();
    server.stop();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
