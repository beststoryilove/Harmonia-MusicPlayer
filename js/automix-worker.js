/* Harmonia AutoMix Worker（薄壳）
 *
 * 职责：接收主线程传进来的 PCM → 调分析算法 → 回结果。
 * 为什么要在 Worker 里跑：全曲分析含 FFT 与自相关，一首 4 分钟歌约 1-3s，
 * 在主线程会明显卡 UI（尤其低端安卓）。实测 Android WebView 131 上 Worker 可用。
 *
 * 消息协议：
 *   收 { type:'analyze', songId, samples:Float32Array, sampleRate:number }
 *   回 { type:'result', songId, analysis }
 *   回 { type:'error',  songId, message }
 *
 * ⚠ 双源同步：Harmonia/js/automix-worker.js 必须与本文件逐字节一致。
 */
'use strict';

importScripts('automix-analysis.js');

var Lib = (typeof HarmoniaAutomixAnalysis !== 'undefined') ? HarmoniaAutomixAnalysis : null;

self.onmessage = function (e) {
  var msg = e.data || {};
  if (msg.type !== 'analyze') return;
  var songId = msg.songId;
  try {
    if (!Lib || typeof Lib.analyzeTrack !== 'function') {
      self.postMessage({ type: 'error', songId: songId, message: 'automix-analysis.js 未加载' });
      return;
    }
    if (!msg.samples || !msg.samples.length) {
      self.postMessage({ type: 'error', songId: songId, message: 'empty-samples' });
      return;
    }
    var analysis = Lib.analyzeTrack(msg.samples, msg.sampleRate);
    self.postMessage({ type: 'result', songId: songId, analysis: analysis });
  } catch (err) {
    self.postMessage({ type: 'error', songId: songId, message: String((err && err.message) || err) });
  }
};
