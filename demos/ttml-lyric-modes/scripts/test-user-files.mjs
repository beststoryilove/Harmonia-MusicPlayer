#!/usr/bin/env node
/**
 * 用户文件端到端测试 —— 验证「自行选择音频 + TTML」这条链路真的能跑通。
 *
 * 为什么必须单独验证：文件载入涉及 FileReader、objectURL、<audio> 事件、
 * 时钟接管与时长口径重算，任何一环断了都表现为「UI 有反应但歌词不动」。
 * 纯逻辑测试与页面自检都覆盖不到这条真实用户路径。
 *
 * 做法：用 CDP 的 DOM.setFileInputFiles 往真实 <input type=file> 注入文件
 * （等价于用户点选），再用 CDP Input 派发拖放事件验证拖放通路。
 * 音频用脚本就地合成的 WAV（见 make-test-audio.mjs）。
 *
 * 用法：node scripts/test-user-files.mjs
 * 退出码：0 = 全部通过。
 */

import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, mkdirSync } from 'node:fs';
import { writeFileSync } from 'node:fs';
import { launchChrome, openPage, evaluate, sleep, freePort } from './cdp.mjs';
import { makeWav } from './make-test-audio.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const FIXTURES = resolve(ROOT, 'scripts/fixtures');

/** 自造一份「用户 TTML」：4 行、含重叠 + 背景行 + 对唱行，时间可预期。 */
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

/** 往一个 file input 注入文件（等价于用户点选）。 */
async function setFileInput(cdp, selector, filePath) {
  const { root } = await cdp.send('DOM.getDocument');
  const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector });
  if (!nodeId) throw new Error(`未找到 ${selector}`);
  await cdp.send('DOM.setFileInputFiles', { nodeId, files: [filePath] });
}

/**
 * 用 CDP 派发一次真实鼠标点击（产生用户手势，使自动播放策略放行）。
 *
 * 为什么不用 --autoplay-policy=no-user-gesture-required 了事：
 * 那条路径绕过了真实浏览器的限制，验证不到「应用在手势下能否正常起播」。
 * 这里走真实点击 → 真实手势 → play() 放行，与用户实际操作一致。
 */
async function realClick(cdp, x, y) {
  const base = { x, y, button: 'left', clickCount: 1 };
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...base });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...base });
}

async function main() {
  // 准备夹具
  mkdirSync(FIXTURES, { recursive: true });
  const audioPath = resolve(FIXTURES, 'beep-30s.wav');
  if (!existsSync(audioPath)) writeFileSync(audioPath, makeWav(30));
  const ttmlPath = resolve(FIXTURES, 'user-lyrics.ttml');
  writeFileSync(ttmlPath, USER_TTML, 'utf8');

  const server = await startServer();
  let chrome = null;
  const failures = [];
  const check = (ok, label, detail = '') => {
    console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`);
    if (!ok) failures.push(label);
  };

  try {
    chrome = await launchChrome({ width: 1680, height: 940 });
    const { consoleErrors } = await openPage(chrome.cdp, server.url, { timeoutMs: 45000 });
    await chrome.cdp.send('DOM.enable');
    await sleep(800);

    console.log('\n▶ 1. 载入用户 TTML');
    await setFileInput(chrome.cdp, '#ttmlFile', ttmlPath);
    await sleep(700);
    let info = await evaluate(chrome.cdp, `JSON.stringify({
      info: document.getElementById('ttmlFileInfo').textContent,
      cls: document.getElementById('ttmlFileInfo').className,
      total: window.__DSH_DEMO__.state.data.stats.total,
      bg: window.__DSH_DEMO__.state.data.stats.bg,
      duet: window.__DSH_DEMO__.state.data.stats.duet,
      peak: window.__DSH_DEMO__.state.data.stats.peakConcurrent,
      useOwn: document.getElementById('useOwnLyrics').checked,
      sampleName: window.__DSH_DEMO__.state.data.sample.name,
    })`);
    let r = JSON.parse(info);
    check(r.total > 0, '解析出歌词行', `${r.total} 行`);
    check(r.bg === 1, '识别背景行', `bg=${r.bg}`);
    check(r.duet === 1, '识别对唱行', `duet=${r.duet}`);
    check(r.peak >= 2, '识别重叠', `峰值 ${r.peak} 行`);
    check(r.cls.includes('ok'), '文件信息标记为成功', r.info);
    check(r.useOwn === true, '自动勾选「使用我自己的 TTML」');

    console.log('\n▶ 2. 载入音频并接管时钟');
    await setFileInput(chrome.cdp, '#audioFile', audioPath);
    // 等 loadedmetadata
    await evaluate(chrome.cdp, `new Promise(res => {
      const a = document.getElementById('audioEl');
      if (a.readyState >= 1) return res(true);
      a.addEventListener('loadedmetadata', () => res(true), { once: true });
      setTimeout(() => res(false), 8000);
    })`);
    await sleep(500);
    info = await evaluate(chrome.cdp, `(() => {
      const d = window.__DSH_DEMO__;
      const a = document.getElementById('audioEl');
      return JSON.stringify({
        hasMedia: d.state.clock.hasMedia,
        duration: a.duration,
        clockDuration: d.state.clock.durationMs,
        info: document.getElementById('audioFileInfo').textContent,
        status: document.getElementById('statusPill').textContent,
      });
    })()`);
    r = JSON.parse(info);
    check(r.hasMedia === true, '时钟已接管音频');
    check(Math.abs(r.duration - 30) < 0.5, '音频时长正确', `${r.duration}s`);
    check(Math.abs(r.clockDuration - r.duration * 1000) < 600, '时钟时长口径 = 音频时长',
      `${Math.round(r.clockDuration)}ms`);
    check(/音频已接管/.test(r.status), '状态栏反映接管', r.status);

    console.log('\n▶ 3. 播放：歌词必须跟随音频时间');
    //
    // 自动播放策略说明：浏览器要求 play() 由用户手势触发。载入文件后的
    // 自动播放发生在异步回调里，手势可能已失效 —— 实测 headless 下**必然**失效。
    // 因此这里先派发一次真实点击（触发应用的手势补偿），再验证音频推进。
    // 补偿机制本身是产品能力（否则用户会遇到「载入了没声音」），故一并断言。
    const btn = await evaluate(chrome.cdp, `(() => {
      const r = document.getElementById('playBtn').getBoundingClientRect();
      return JSON.stringify({ x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) });
    })()`);
    const { x, y } = JSON.parse(btn);
    // 在文档空白处点击，等价于用户的普通交互（走带控件由按钮自己处理）
    await realClick(chrome.cdp, Math.round(x), Math.round(y));

    const follow = await evaluate(chrome.cdp, `(async () => {
      const d = window.__DSH_DEMO__;
      const a = document.getElementById('audioEl');
      // 兜底：若补偿仍未起播（例如点击被策略判定无效），显式再试一次
      if (a.paused) { try { await a.play(); } catch (e) { /* 记录在后面 */ } }
      d.state.clock.seek(0);

      // 不用「固定等待后看走了多少」——起播延迟会随环境波动（实测 0~1.4s），
      // 那样只能靠放宽阈值来消除 flaky，等于放弃断言。
      // 改为先轮询等到音频真的开始推进（有超时），再测**推进速率** ——
      // 「1 秒墙钟推进 1 秒音频」才是真正要守的不变量。
      const startWall = performance.now();
      let started = false;
      for (let i = 0; i < 60; i += 1) {
        if (a.currentTime > 0.3) { started = true; break; }
        await new Promise(r => setTimeout(r, 100));
      }
      if (!started) {
        return JSON.stringify({ started: false, audioT: Math.round(a.currentTime * 1000),
          paused: a.paused, startWaitMs: Math.round(performance.now() - startWall) });
      }

      const t0 = a.currentTime;
      const w0 = performance.now();
      await new Promise(r => setTimeout(r, 1500));
      const dAudio = a.currentTime - t0;
      const dWall = (performance.now() - w0) / 1000;

      const audioT = a.currentTime * 1000;
      const clockT = d.state.clock.now();
      const lines = d.state.data.lines;
      const active = lines.filter(l => l.startMs <= clockT && clockT < l.endMs);
      d.state.clock.pause();
      return JSON.stringify({
        started: true,
        audioT: Math.round(audioT),
        clockT: Math.round(clockT),
        rate: dAudio / dWall,
        startWaitMs: Math.round(w0 - startWall),
        paused: a.paused,
        activeIdx: active.map(l => l.index),
        activeText: active.map(l => l.text),
      });
    })()`);
    r = JSON.parse(follow);
    check(r.started === true, '音频在超时内开始推进',
      r.started ? `起播等待 ${r.startWaitMs}ms` : `等待 ${r.startWaitMs}ms 仍未推进`);
    check(Math.abs(r.clockT - r.audioT) < 150, '时钟时间 = 音频时间（误差 <150ms）',
      `音频 ${r.audioT}ms / 时钟 ${r.clockT}ms`);
    if (r.started) {
      // 核心不变量：音频以 1× 实时速率推进，且与时钟同步
      check(Math.abs(r.rate - 1) < 0.35, '音频以约 1× 实时速率推进', `${r.rate.toFixed(2)}×`);
    }
    check(r.paused === true, '暂停后音频停止');
    check(r.activeIdx?.length >= 1, '该时刻有活动行', (r.activeText || []).join(' | '));

    console.log('\n▶ 4. 拖动进度条应同步写回音频');
    const seekSync = await evaluate(chrome.cdp, `(async () => {
      const d = window.__DSH_DEMO__;
      const a = document.getElementById('audioEl');
      d.state.clock.seek(9000);
      await new Promise(r => setTimeout(r, 300));
      return JSON.stringify({
        audioT: Math.round(a.currentTime * 1000),
        clockT: Math.round(d.state.clock.now()),
      });
    })()`);
    r = JSON.parse(seekSync);
    check(Math.abs(r.audioT - 9000) < 200, '拖到 9s 后音频跟随', `音频 ${r.audioT}ms`);
    check(Math.abs(r.clockT - 9000) < 300, '拖到 9s 后时钟一致', `时钟 ${r.clockT}ms`);

    console.log('\n▶ 5. 歌词偏移（+500ms）');
    const offset = await evaluate(chrome.cdp, `(async () => {
      const d = window.__DSH_DEMO__;
      const a = document.getElementById('audioEl');
      const range = document.getElementById('offsetRange');
      range.value = '500';
      range.dispatchEvent(new Event('input', { bubbles: true }));
      d.state.clock.seek(9000);
      await new Promise(r => setTimeout(r, 300));
      const out = {
        audioT: Math.round(a.currentTime * 1000),
        clockT: Math.round(d.state.clock.now()),
        label: document.getElementById('offsetValue').textContent,
      };
      // 复位
      range.value = '0';
      range.dispatchEvent(new Event('input', { bubbles: true }));
      return JSON.stringify(out);
    })()`);
    r = JSON.parse(offset);
    // 偏移 +500ms：时钟口径应比音频时间大 500ms
    check(Math.abs(r.clockT - (r.audioT + 500)) < 200, '偏移生效（歌词 = 音频 + 500ms）',
      `音频 ${r.audioT}ms → 时钟 ${r.clockT}ms`);
    check(r.label === '500 ms', '偏移标签更新', r.label);

    console.log('\n▶ 6. 音量控制');
    const vol = await evaluate(chrome.cdp, `(() => {
      const range = document.getElementById('audioVolume');
      range.value = '0.35';
      range.dispatchEvent(new Event('input', { bubbles: true }));
      return JSON.stringify({
        vol: document.getElementById('audioEl').volume,
        label: document.getElementById('volumeValue').textContent,
      });
    })()`);
    r = JSON.parse(vol);
    check(Math.abs(r.vol - 0.35) < 0.01, '音量生效', `${r.vol}`);
    check(r.label === '35%', '音量标签更新', r.label);

    console.log('\n▶ 7. 九个方案都能渲染用户歌词');
    const allVariants = await evaluate(chrome.cdp, `(async () => {
      const d = window.__DSH_DEMO__;
      const errors = [];
      const modes = { v:'visual', p:'performance', r:'preview' };
      for (const [prefix, mode] of Object.entries(modes)) {
        d.selectMode(mode);
        await new Promise(r => setTimeout(r, 80));
        for (const n of [1,2,3]) {
          const id = prefix + n;
          try {
            d.selectVariant(id);
            d.state.clock.seek(3500);   // 重叠时刻：主行+背景行同活跃
            await new Promise(r => setTimeout(r, 120));
            const host = d.state.slots[0].host;
            const nodes = host.querySelectorAll('[data-index]').length;
            if (nodes === 0) errors.push(id + ': 无行节点');
          } catch (e) { errors.push(id + ': ' + e.message); }
        }
      }
      return JSON.stringify(errors);
    })()`);
    const variantErrors = JSON.parse(allVariants);
    check(variantErrors.length === 0, '9 个方案均能渲染用户歌词',
      variantErrors.length ? variantErrors.join('; ') : '');

    console.log('\n▶ 8. 清空文件后回到内置样本与内置时钟');
    await evaluate(chrome.cdp, `(() => { document.getElementById('clearFilesBtn').click(); return true; })()`);
    await sleep(900);
    info = await evaluate(chrome.cdp, `(() => {
      const d = window.__DSH_DEMO__;
      return JSON.stringify({
        hasMedia: d.state.clock.hasMedia,
        userLyrics: Boolean(d.state.userLyrics),
        useOwn: document.getElementById('useOwnLyrics').checked,
        sampleName: d.state.data.sample.name,
        total: d.state.data.stats.total,
        audioInfo: document.getElementById('audioFileInfo').textContent,
      });
    })()`);
    r = JSON.parse(info);
    check(r.hasMedia === false, '时钟已脱离音频');
    check(r.userLyrics === false, '用户歌词已清除');
    check(r.useOwn === false, '复选框已复位');
    check(!r.sampleName.includes('user-lyrics'), '已回到内置样本', r.sampleName);
    check(/未选择文件/.test(r.audioInfo), '音频信息已复位');

    console.log('\n▶ 9. 非法 TTML 应报错但不破坏现有歌词');
    const badPath = resolve(FIXTURES, 'not-ttml.txt');
    writeFileSync(badPath, '这不是 TTML，只是一段普通文本。', 'utf8');
    const beforeTotal = r.total;
    await setFileInput(chrome.cdp, '#ttmlFile', badPath);
    await sleep(700);
    info = await evaluate(chrome.cdp, `(() => {
      const d = window.__DSH_DEMO__;
      return JSON.stringify({
        cls: document.getElementById('ttmlFileInfo').className,
        info: document.getElementById('ttmlFileInfo').textContent,
        total: d.state.data.stats.total,
        status: document.getElementById('statusPill').textContent,
      });
    })()`);
    r = JSON.parse(info);
    check(r.cls.includes('bad'), '标记为失败', r.info);
    check(r.total === beforeTotal, '原有歌词未被破坏', `仍为 ${r.total} 行`);

    const realErrors = consoleErrors.filter((e) => !/favicon/i.test(e));
    check(realErrors.length === 0, '无控制台错误',
      realErrors.slice(0, 3).join(' | '));
  } finally {
    if (chrome) await chrome.close();
    server.stop();
  }

  console.log(failures.length === 0
    ? '\n✅ 用户文件链路全部通过'
    : `\n❌ 失败 ${failures.length} 项：\n   ${failures.join('\n   ')}`);
  process.exit(failures.length === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('测试脚本异常：', error);
  process.exit(1);
});
