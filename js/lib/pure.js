/* Harmonia 纯函数库（H7）
 *
 * 用途：把不依赖 DOM/全局状态的纯函数集中于此，浏览器与 Node 双环境可用。
 * 浏览器：<script src="js/lib/pure.js"></script> 后全局暴露 window.HarmoniaLib；
 * Node：require('../../js/lib/pure.js') 得到 { escapeHtml, formatTime, normalizeMusicSource, normalizeTrack, parseLyrics }。
 * 注意：仅支持 CJS require 与浏览器 <script> 加载；不支持 ESM import（ESM 下 this 为 undefined 会抛错）。
 *
 * 注意：main.js 中同名函数为委托封装（见 H7 抽取记录），平台无关逻辑改动需同时改 pure.js 与测试。
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.HarmoniaLib = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // 与 main.js 顶层 escapeHtml 等价：& < > " ' 全量转义（无 DOM 依赖，可在 Node 测试）。
  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // 秒 → m:ss（秒<10 补零）。负数按 0 处理；非数字回退 0:00。
  function formatTime(sec) {
    let n = Number(sec);
    if (!isFinite(n) || n < 0) n = 0;
    const m = Math.floor(n / 60);
    const s = Math.floor(n % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  // 音乐源归一：非 'kugou' 一律视为 'netease'。
  function normalizeMusicSource(source) {
    return source === 'kugou' ? 'kugou' : 'netease';
  }

  // 曲目归一：兜底 source 字段，其余字段原样保留。
  function normalizeTrack(track, fallbackSource) {
    track = (track && typeof track === 'object') ? track : {};
    const source = normalizeMusicSource(track.source || fallbackSource || 'netease');
    return Object.assign({}, track, { source: source });
  }

  // LRC 解析：支持 [mm:ss.xx] / [mm:ss:xx]（1~3 位小数秒）。
  // 返回 [{ time, text, translation: '' }]，按 time 升序；无时间戳行忽略。
  function parseLyrics(lyricText) {
    if (!lyricText) return [];
    const lines = String(lyricText).split('\n');
    const res = [];
    const re = /\[(\d{2}):(\d{2})(?:[\.:](\d{1,3}))?\]/g;
    for (const line of lines) {
      let match;
      const lineTimestamps = [];
      let cleanLine = line;
      while ((match = re.exec(line)) !== null) {
        const min = parseInt(match[1], 10);
        const sec = parseInt(match[2], 10);
        const ms = match[3] ? parseFloat('0.' + match[3]) : 0;
        const time = min * 60 + sec + ms;
        lineTimestamps.push(time);
        cleanLine = cleanLine.replace(match[0], '');
      }
      cleanLine = cleanLine.trim();
      if (cleanLine && lineTimestamps.length > 0) {
        res.push({ time: Math.min.apply(null, lineTimestamps), text: cleanLine, translation: '' });
      }
    }
    return res.filter(function (l) { return l.time !== -1; }).sort(function (a, b) { return a.time - b.time; });
  }

  return {
    escapeHtml: escapeHtml,
    formatTime: formatTime,
    normalizeMusicSource: normalizeMusicSource,
    normalizeTrack: normalizeTrack,
    parseLyrics: parseLyrics
  };
});
