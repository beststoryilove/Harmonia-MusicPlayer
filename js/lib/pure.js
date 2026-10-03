/* Harmonia 纯函数库（H7）
 *
 * 用途：把不依赖 DOM/全局状态的纯函数集中于此，浏览器与 Node 双环境可用。
 * 浏览器：<script src="js/lib/pure.js"></script> 后全局暴露 window.HarmoniaLib；
 * Node：require('../../js/lib/pure.js') 得到 { escapeHtml, formatTime, normalizeMusicSource, normalizeTrack, parseLyrics, buildStFetchUrl, isProxyRangeProbeOk, measureLoudnessDbfs, computeMatchGain, chooseTransitionEffect, isCreditLine, isArtistCreditLine, spatial3dDelaySeconds, computeArtistMarquee, computeTransitionStartOffset, quantizeMixToBar, computeSkippableTailSilence, computeTransitionTriggerLead }。
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

  // ── 智能过渡纯函数（ST2）──

  // 酷狗音频片段在非桌面端经自建代理拉取；否则原样返回。
  function buildStFetchUrl(url, opts) {
    var viaProxy = !!(opts && opts.viaProxy);
    var proxyBase = (opts && opts.proxyBase) || '';
    if (!viaProxy || !proxyBase) return url;
    return proxyBase + encodeURIComponent(url);
  }

  // 代理 Range 能力探测判定：206 且响应体恰为请求区间长度（bytes=0-99 → 100B）。
  // 200+全量 = 代理剥离了 Range 头，不可用于片段分析。
  function isProxyRangeProbeOk(status, byteLength) {
    return status === 206 && byteLength === 100;
  }

  // 近似综合响度（dBFS，负值）：0.4s 非重叠窗 RMS → 绝对门限(-70dB)与相对门限(均值-10dB)双重门限
  // → 门内能量均值 → 10*log10。非完整 K 加权 LUFS，仅用于歌间相对响度匹配。整段静音/无效输入返回 null。
  function measureLoudnessDbfs(mono, sampleRate) {
    if (!mono || !mono.length || !sampleRate || sampleRate <= 0) return null;
    var win = Math.max(1, Math.floor(sampleRate * 0.4));
    var energies = [];
    for (var off = 0; off + win <= mono.length; off += win) {
      var sum = 0;
      for (var i = 0; i < win; i += 2) { var s = mono[off + i]; sum += s * s; }
      energies.push(sum / (win / 2));
    }
    if (!energies.length) return null;
    var meanPow = 0;
    for (var j = 0; j < energies.length; j++) meanPow += energies[j];
    meanPow /= energies.length;
    var absThr = Math.pow(10, -70 / 10);
    var relThr = meanPow * Math.pow(10, -10 / 10);
    var gated = 0, cnt = 0;
    for (var k = 0; k < energies.length; k++) {
      if (energies[k] > absThr && energies[k] > relThr) { gated += energies[k]; cnt++; }
    }
    if (!cnt || gated <= 0) return null;
    return 10 * Math.log10(gated / cnt);
  }

  // 响度匹配增益：把下一首拉到当前歌响度；±6dB 外 clamp 到 [0.5, 2]；任一侧缺数据返回 1。
  function computeMatchGain(curDb, nextDb) {
    if (typeof curDb !== 'number' || typeof nextDb !== 'number') return 1;
    if (!isFinite(curDb) || !isFinite(nextDb)) return 1;
    var gain = Math.pow(10, (curDb - nextDb) / 20);
    return Math.max(0.5, Math.min(2, gain));
  }

  // 混音效果选择（main.js stChooseEffect 的纯函数主体）：
  // 尾部未分析成功 / 静音结尾(≥silenceCutSec) / 骤然结尾 → volumeMix；淡出结尾 → 图可用时 bassSwap。
  //
  // ⚠️ 骤然结尾不再选 echoOut（2026-09-30 ST5）：回声是「把上一首最后 2.5s 送进延迟反馈网络」，
  // 拖尾会盖到下一首开头上；而「骤然」判据（非静音 + 非淡出）覆盖了绝大多数正常结尾，
  // 实测几乎每首歌都触发（用户反馈「过渡后总有上一首的回响」）。
  // 另外该分支还曾依赖内存态 tailBufOk（缓存命中时不重建），导致同一首歌冷/热缓存行为不一致。
  // 实现保留在 main.js stPerformEchoOut（当前不在自动选择路径上），待做成可选设置后再启用。
  function chooseTransitionEffect(edges, graphOk, silenceCutSec) {
    var cut = (typeof silenceCutSec === 'number' && isFinite(silenceCutSec)) ? silenceCutSec : 0.8;
    if (!edges || !edges.tailOk) return 'volumeMix';
    if ((edges.tailSilenceSec || 0) >= cut) return 'volumeMix';
    if (edges.tailFading) return graphOk ? 'bassSwap' : 'volumeMix';
    return 'volumeMix';
  }

  // ── 智能过渡：内容/节拍对齐（ST3）──
  //
  // 支撑「按内容与节拍决策」的三个纯函数：下一首起播点（跳过开头静音 + 重拍相位对齐）、
  // 混音窗口的整小节量化、由内容末端反推的触发提前量。
  // main.js 侧的 stComputeBStartOffset / stEffectiveWindow / stTransitionTriggerLead 是薄封装。
  // 抽到 pure.js 的原因与 ST2 一致：不依赖 DOM/全局，可被 node --test 穷举边界。

  /* 数值兜底：非空且有限才取用，否则回退默认值。 */
  function stNumOr(v, d) {
    if (v === null || typeof v === 'undefined' || v === '') return d;
    var n = Number(v);
    return isFinite(n) ? n : d;
  }

  /* 下一首起播点（秒）。混音时下一首以 rate=clamp(bpmA/bpmB) 变速播放，其拍周期在播放
   * 时间轴上等于当前歌的拍周期；因此把 currentTime 取为「第一个不早于开头静音的拍点」，
   * 就能让两首歌的重拍在混音起点重合，同时跳过下一首的开头静音。
   * 无有效 BPM/置信不足 → 只跳过开头静音；结果超过 maxStartSec → 同样只跳静音
   * （防异常相位把开头切掉过多）。
   * 返回 { startAtSec, aligned, beatSec }。 */
  function computeTransitionStartOffset(bpmNext, leadSilenceSec, opts) {
    var o = opts || {};
    var maxStart = stNumOr(o.maxStartSec, 3);
    var confMin = stNumOr(o.confidenceMin, 0.6);
    var lead = stNumOr(leadSilenceSec, 0);
    if (lead < 0) lead = 0;
    var fallback = Math.min(lead, maxStart);
    var bpm = bpmNext ? Number(bpmNext.bpm) : NaN;
    var conf = bpmNext ? Number(bpmNext.confidence) : NaN;
    var phase = bpmNext ? Number(bpmNext.phaseSec) : NaN;
    if (!isFinite(bpm) || bpm <= 0 || !isFinite(conf) || conf < confMin || !isFinite(phase) || phase < 0) {
      return { startAtSec: fallback, aligned: false, beatSec: 0 };
    }
    var beat = 60 / bpm;
    /* 取「与开头静音最近的拍点」：既不在静音里白混，也不多跳一拍内容；
       最近拍点落到负值（下一首自己的拍点网格起点为负）时，上取到第一个非负拍点。
       静音期最多残留半拍——此时当前歌仍接近满音量，听感上不可辨。 */
    var n = Math.round((lead - phase) / beat);
    if (!isFinite(n)) n = 0;
    var start = phase + n * beat;
    while (start < 0) { n += 1; start = phase + n * beat; }
    if (start > maxStart) return { startAtSec: fallback, aligned: false, beatSec: beat };
    return { startAtSec: Math.round(start * 1000) / 1000, aligned: true, beatSec: Math.round(beat * 1000) / 1000 };
  }

  /* 混音窗口量化到整小节（秒）：使交接点落在当前歌的强拍上。
   * bar = beatsPerBar * 60/bpm；n = max(1, round(mixSec/bar))；越上界则逐档退，最后夹在 [minSec,maxSec]。
   * 无有效 BPM/置信不足/小节长于上界 → 原值返回。 */
  function quantizeMixToBar(mixSec, bpm, minSec, maxSec, opts) {
    var o = opts || {};
    var confMin = stNumOr(o.confidenceMin, 0.6);
    var beats = stNumOr(o.beatsPerBar, 4);
    var m = stNumOr(mixSec, 0);
    if (!(m > 0)) return mixSec;
    var lo = stNumOr(minSec, 1);
    var hi = stNumOr(maxSec, 12);
    if (hi < lo) hi = lo;
    var b = bpm ? Number(bpm.bpm) : NaN;
    var c = bpm ? Number(bpm.confidence) : NaN;
    if (!isFinite(b) || b <= 0 || !isFinite(c) || c < confMin || !(beats > 0)) return m;
    var bar = beats * 60 / b;
    if (!(bar > 0) || bar > hi) return m;
    var n = Math.max(1, Math.round(m / bar));
    var q = n * bar;
    while (q > hi && n > 1) { n -= 1; q = n * bar; }
    if (q > hi) q = hi;
    if (q < lo) q = lo;
    return Math.round(q * 1000) / 1000;
  }

  /* 尾部留白中「可以安全整段跳过」的秒数（触发提前量的输入）。
   *
   * 为什么相对阈值不够：stMeasureTail 用「峰值 2%」判静音，母带留白与
   * 「很轻但真实的环境音/尾奏」都会落进该阈值——全量跳过就会丢真实内容。
   * 故要求实测电平也足够低（默认 ≤ -50 dBFS；整段数字静音记 -120）才整段跳过，
   * 否则退化为只跳固定的一小段（silenceCutSec）：保住体验，又不赌内容。
   * 电平未知（老缓存/字段缺失）同样走保守分支。 */
  function computeSkippableTailSilence(tailSilenceSec, tailSilenceDb, opts) {
    var o = opts || {};
    var cut = stNumOr(o.silenceCutSec, 0.8);
    var quietMax = stNumOr(o.quietDbMax, -50);
    var s = stNumOr(tailSilenceSec, 0);
    if (!(s > 0)) return 0;
    if (!(cut >= 0)) cut = 0.8;
    var db = (typeof tailSilenceDb === 'number' && isFinite(tailSilenceDb)) ? tailSilenceDb : null;
    if (db !== null && db <= quietMax) return s;
    return Math.min(s, cut);
  }

  /* 触发提前量（秒）：= 窗口 + 可跳过的尾部留白 + 调度余量。
   * 交接时刻因此落在当前歌的**内容末端**（留白被整段跳过，用户不再干等十几秒），
   * 而不是「文件结束前固定 1.5s」。留白能否跳过由 computeSkippableTailSilence 判定。
   * 执行层用 min(窗口, 剩余) 夹取时长，故拍点对齐等待造成的缩短不会让交接点越过内容末端。 */
  function computeTransitionTriggerLead(windowSec, skippableSilenceSec, opts) {
    var o = opts || {};
    var margin = stNumOr(o.marginSec, 0.6);
    var w = stNumOr(windowSec, 0);
    if (!(w > 0)) return 0;
    var s = stNumOr(skippableSilenceSec, 0);
    if (!(s > 0)) s = 0;
    return Math.round((w + s + Math.max(0, margin)) * 1000) / 1000;
  }


  // ── 智能过渡：调性 × 能量双维相容度（ST6）──
  //
  // 目的：让过渡决策从「尾部形态」单维升级为「音乐语义」双维——重叠期真正同时发声的两段音频
  // （A 的尾部 × B 的头部）的调性是否相容、能量是否满冲，据此精修重叠时长与滤波整形。
  // 与 ST2/ST3 同因：全部不依赖 DOM/全局，可被 node --test 穷举边界。

  /* 就地基-2 FFT（re/im 等长，长度须为 2 的幂）。位反转置换 + 蝶形。
     为可测性，实现须与朴素 DFT 数值一致（单测用 64/256 点对照，容差 1e-3）。
     非法输入返回 false 且不修改入参。 */
  function fftRadix2(re, im) {
    var n = re ? re.length : 0;
    if (!n || (n & (n - 1)) !== 0) return false;
    if (!im || im.length !== n) return false;
    /* 位反转置换 */
    for (var i = 1, j = 0; i < n; i++) {
      var bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        var tr = re[i]; re[i] = re[j]; re[j] = tr;
        var ti = im[i]; im[i] = im[j]; im[j] = ti;
      }
    }
    /* 蝶形：每级用单位根的迭代旋转（避免逐 k 调用三角函数） */
    for (var len = 2; len <= n; len <<= 1) {
      var ang = -2 * Math.PI / len;
      var wr = Math.cos(ang), wi = Math.sin(ang);
      for (var s = 0; s < n; s += len) {
        var cr = 1, ci = 0;
        for (var k = 0; k < len / 2; k++) {
          var pr = re[s + k], pi = im[s + k];
          var qr = re[s + k + len / 2], qi = im[s + k + len / 2];
          var vr = qr * cr - qi * ci;
          var vi = qr * ci + qi * cr;
          re[s + k] = pr + vr; im[s + k] = pi + vi;
          re[s + k + len / 2] = pr - vr; im[s + k + len / 2] = pi - vi;
          var nr = cr * wr - ci * wi;
          ci = cr * wi + ci * wr; cr = nr;
        }
      }
    }
    return true;
  }

  /* 复音证据：判断窗口内是否真的存在「多个独立基频同时发声」（即真的有和声）。
     返回**无法被单一谐波列解释**的谱峰数（0 = 全部峰都可归入同一基频的谐波列）；
     无法判定返回 null。

     为什么需要它（四次失败的判据设计，见设计文档 §4.2.15）：
       单音（哪怕带 40 次谐波）与调性剖面仍能相关到 0.79~0.83，因为它**恰好**符合某调的
       音级分布；而它的谐波本身散布在多个音级上，所以
         ① 聚合熵不低（实测 C2 40 谐波 entropy 0.967）→ 熵折扣形同虚设；
         ② 分段 chroma 距离不可靠（周期性 loop 与静态无法区分）；
         ③ "偏离整数倍即算证据"虽能拒绝理想单音，但会被**真实乐器的非谐性**击穿——
            钢琴/钟的泛音是**拉伸**的（f_h = h·f0·√(1+B·h²)），实测钟（B=1e-2）得证据 4 → 误报。

     最终判据：判定"所有显著谱峰能否被**单一拉伸谐波列**解释"。
       单一基频（含钢琴/钟的拉伸泛音）→ 可被某条拉伸列解释 → 证据 0；
       真实和声含多个独立基频 → 无法被单条列解释 → 证据 ≥1。
       B 扫描用粗到细（粗 2e-3 再局部细 1e-4），实测 30s 音频约 61ms（比朴素全扫更快且更准）。

     实测 24 组夹具（误报 0、漏报 0）：
       理想单音（1/6/20/40 谐波）、钢琴（B≤5e-4）、钟（B=1e-2/3e-2）、深颤音 → 0 或 null
       白噪声（峰极多无序）→ null
       三和弦/小三和弦/七和弦 → 5/5/8；低音和弦 6；五度（两个独立基频）2
       2s loop 12；四和弦 5；独奏旋律 10；鼓+和弦 5；和弦+旋律 11
     实现：16k 点 FFT（分辨率 ~0.67Hz@11kHz），取 60~2000Hz 内高于帧内最大值 12% 的局部极大峰，
     以**最低**显著峰为参照（ratio = hz/f0），容差 3.5%，峰数 >40 视为噪声（不可判定）。 */
  function stHarmonyEvidence(mono, sampleRate, opts) {
    var o = opts || {};
    var fftSize = stNumOr(o.fftSize, 16384);
    var tol = stNumOr(o.tolerance, 0.035);
    var maxPeaks = stNumOr(o.maxPeaks, 40);
    var coarseB = stNumOr(o.coarseB, 0.002);
    var maxB = stNumOr(o.maxB, 0.05);
    var fundamentalCand = stNumOr(o.fundamentalCand, 4);
    if (!mono || !mono.length || !sampleRate || sampleRate <= 0) return null;
    if (typeof mono.subarray !== 'function') return null;
    /* 参数护栏：fftSize 必须为正整数，否则 new Float32Array 会抛错
       （实测 fftSize=-1 → "Invalid typed array length: -1"）。粗/细步长须为正，
       否则 B 扫描可能空转或死循环。任何非法参数一律返回 null（不可判定）。 */
    if (!(fftSize >= 16)) return null;
    fftSize = Math.floor(fftSize);
    if (!(coarseB > 0)) return null;
    if (!(maxB >= 0)) return null;
    if (coarseB > 1) coarseB = 1;
    if (maxB > 1) maxB = 1;
    if (!(fundamentalCand >= 1)) return null;
    fundamentalCand = Math.min(Math.floor(fundamentalCand), 32);
    var dec = Math.max(1, Math.floor(sampleRate / 11025));
    var sig = mono, sr = sampleRate;
    if (dec > 1) {
      var dn = Math.floor(mono.length / dec);
      if (dn < fftSize) return null;
      sig = new Float32Array(dn);
      for (var d = 0; d < dn; d++) sig[d] = mono[d * dec];
      sr = sampleRate / dec;
    }
    if (sig.length < fftSize) return null;
    var frames = Math.max(1, Math.floor(sig.length / fftSize));
    var win = new Float32Array(fftSize);
    for (var w = 0; w < fftSize; w++) win[w] = 0.5 - 0.5 * Math.cos(2 * Math.PI * w / (fftSize - 1));
    var re = new Float32Array(fftSize), im = new Float32Array(fftSize);
    var binHz = sr / fftSize;
    var kLo = Math.max(2, Math.ceil(60 / binHz));
    var kHi = Math.min(fftSize / 2 - 2, Math.floor(2000 / binHz));
    if (kHi <= kLo) return null;
    /* 某条拉伸谐波列（基频 f0）能解释多少个峰。
       ⚠️ 必须处理"峰在候选基频**之下**"的情形（比值 <0.95）——因为候选基频不再
       预设为最低峰，故低于基频的峰不可能是它的谐波，计为未解释。
       这与"同度泄漏"（0.95~1.15，视为解释）是不同的情况。 */
    function explainedCount(hzList, f0, B) {
      var n = 0;
      for (var i = 0; i < hzList.length; i++) {
        var r = hzList[i] / f0;
        if (r < 0.95) continue;                /* 在候选基频之下 → 不是它的谐波 */
        if (r < 1.15) { n++; continue; }        /* 同度（窗泄漏/同一基频） */
        var ok = false;
        for (var h = 1; h <= 60; h++) {
          var pred = h * Math.sqrt(1 + B * h * h);
          if (Math.abs(r - pred) / pred <= tol) { ok = true; break; }
          if (pred > r * 1.2) break;
        }
        if (ok) n++;
      }
      return n;
    }
    /* 对给定峰集与候选基频，返回"最多能解释多少个峰"（B 用粗到细扫描） */
    function bestExplainedFor(hzList, f0) {
      var bestE = 0, bestB = 0, B;
      for (B = 0; B <= maxB; B += coarseB) {
        var e = explainedCount(hzList, f0, B);
        if (e > bestE) { bestE = e; bestB = B; }
        if (bestE === hzList.length) break;
      }
      if (bestE < hzList.length) {
        var lo = Math.max(0, bestB - coarseB), hi = Math.min(maxB, bestB + coarseB);
        for (B = lo; B <= hi; B += coarseB / 20) {
          var e2 = explainedCount(hzList, f0, B);
          if (e2 > bestE) { bestE = e2; if (bestE === hzList.length) break; }
        }
      }
      return bestE;
    }
    var bestUnexplained = 0, bestPeakCount = 0, anyFrame = false;
    for (var f = 0; f < frames; f++) {
      var off = f * fftSize;
      for (var z = 0; z < fftSize; z++) { re[z] = (sig[off + z] || 0) * win[z]; im[z] = 0; }
      fftRadix2(re, im);
      var nBins = kHi - kLo + 1;
      var mags = new Float32Array(nBins);
      var mx = 0;
      for (var k = kLo; k <= kHi; k++) {
        var m = Math.sqrt(re[k] * re[k] + im[k] * im[k]);
        mags[k - kLo] = m;
        if (m > mx) mx = m;
      }
      if (!(mx > 0)) continue;
      var peaks = [];
      for (var i = 1; i < nBins - 1; i++) {
        if (mags[i] > mags[i - 1] && mags[i] >= mags[i + 1] && mags[i] > mx * 0.12) {
          peaks.push({ hz: (kLo + i) * binHz, m: mags[i] / mx });
        }
      }
      if (peaks.length < 2) continue;
      anyFrame = true;
      if (peaks.length > bestPeakCount) bestPeakCount = peaks.length;
      peaks.sort(function (a, b) { return a.hz - b.hz; });
      var hzList = [];
      for (var p = 0; p < peaks.length; p++) {
        /* 只统计能量足够（>15% 最大值）的峰：排除窗泄漏产生的弱峰 */
        if (p > 0 && !(peaks[p].m > 0.15)) continue;
        hzList.push(peaks[p].hz);
      }
      if (hzList.length < 2) continue;

      /* ★ 候选基频必须是**多个**，不能预设"最低峰即基频"。
         实测教训（第五轮评审发现、见设计文档 §4.2.15「未解决缺陷」）：
         颤音素材的最低显著峰常是基频**下方**的弱边带，例如 C3 ±2% @6Hz 的一帧为
         124.5Hz(amp 0.21 边带) / 130.5Hz(amp 1.00 真实基频) / 136.6Hz(amp 0.23 边带)。
         取 124.5 为参照会把真实基频算成 r=1.0486（偏离 4.86%），整个谐波列"对不上"
         → 凭空产生证据 → 单音被误判为有和声。
         正确的问题是"**是否存在某个基频能解释全部峰**"，故对所有合理候选都试一遍：
         ① 能量最强的若干峰（真实基频通常是强峰）；② 最低峰（兼容原有行为）。
         实测（42 组夹具）：误报由 15 降至 7，且**漏报仍为 0**。

         为何**不**加入"低端峰两两中点"作为候选（曾实验，已弃用）：
         中点会误伤真实和声——低音小二度（110Hz 与 116.54Hz 同响，真实和声）的
         中点 113.27Hz 会把两个基频都当作"同度泄漏"吸收，使证据=0 → 漏报。
         实测中点仅减少 1 个误报却引入 1 个漏报（真实和声），得不偿失，故不采用。 */
      var candList = [];
      var byAmp = peaks.slice().sort(function (a, b) { return b.m - a.m; });
      var nCand = Math.min(fundamentalCand, byAmp.length);
      for (var c = 0; c < nCand; c++) candList.push(byAmp[c].hz);
      candList.push(hzList[0]);
      /* 去重（1% 以内视为同一候选）并限制总数，避免候选爆炸 */
      var uniq = [];
      for (var q = 0; q < candList.length; q++) {
        var dup = false;
        for (var u = 0; u < uniq.length; u++) {
          if (Math.abs(uniq[u] - candList[q]) / candList[q] <= 0.01) { dup = true; break; }
        }
        if (!dup) uniq.push(candList[q]);
        if (uniq.length >= 32) break;
      }
      var bestExpl = 0;
      for (var ci = 0; ci < uniq.length; ci++) {
        if (!(uniq[ci] > 40)) continue;
        var e3 = bestExplainedFor(hzList, uniq[ci]);
        if (e3 > bestExpl) bestExpl = e3;
        if (bestExpl === hzList.length) break;
      }
      var unexpl = hzList.length - bestExpl;
      if (unexpl > bestUnexplained) bestUnexplained = unexpl;
    }
    if (!anyFrame) return 0;                   /* 只有单一基频 → 无复音证据 */
    if (bestPeakCount > maxPeaks) return null; /* 峰过多且无序（噪声）→ 无法判定 */
    return bestUnexplained;
  }

  /* 分段 chroma 的"和声变化量"：把窗口切成 segs 段，各段算 chroma，取两两余弦距离均值。
     0 = 各段和声完全不变；越大 = 和声在变化。

     ⚠️ 该指标的**已知局限**（第三轮对抗式评审实测，见设计文档 §4.2.14）：
     它混淆「没有和声」与「和声在周期性重复」——2s/4s loop 反复（house/techno 主流形态）
     的各段 chroma 几乎相同，实测 variation 仅 0.00017~0.00036，与静态单音同量级。
     因此它**只用于"排除明显静态素材"，不足以单独证明有调性**；真正的安全保证来自
     detectKey 的 fail-closed 语义（见下）。门槛取 0.004 是保守值。

     返回 null 表示**无法判定**（窗口太短/解码失败），调用方必须按 fail-closed 处理。 */
  function stChromaVariation(mono, sampleRate, segs) {
    var n = stNumOr(segs, 8);
    if (!(n >= 2) || !mono || !mono.length || !sampleRate || sampleRate <= 0) return null;
    if (typeof mono.subarray !== 'function') return null; /* 只接受 TypedArray（与 computeChroma 的宽松契约不同，此处显式拒绝，避免抛错） */
    /* 段长必须足够 computeChroma 稳定估计 chroma：降采样后需 ≥ fftSize + 7*hop = 11264 样本。
       实测教训：原守卫写 segLen < 2048，而 computeChroma 真实需要 45056 原始样本/段
       （44.1kHz 下 dec=4），导致 [2048, 45055] 区间"守卫通过但实际返回 null"的静默降级。
       现按真实约束推导，并把所需样本量写进注释。 */
    var segLen = Math.floor(mono.length / n);
    var srTarget = 11025;
    var dec = Math.max(1, Math.floor(sampleRate / srTarget));
    var needRaw = (4096 + 7 * 1024) * dec; /* fftSize 4096 + 7*hop，换算回原始采样率 */
    if (segLen < needRaw) return null;
    var list = [];
    for (var i = 0; i < n; i++) {
      var ch = computeChroma(mono.subarray(i * segLen, (i + 1) * segLen), sampleRate, {});
      if (ch && ch.ok && ch.chroma) list.push(ch.chroma);
    }
    if (list.length < 2) return null;
    var sum = 0, cnt = 0;
    for (var a = 0; a < list.length; a++) {
      for (var b = a + 1; b < list.length; b++) {
        var dot = 0, na = 0, nb = 0;
        for (var k = 0; k < 12; k++) {
          dot += list[a][k] * list[b][k];
          na += list[a][k] * list[a][k];
          nb += list[b][k] * list[b][k];
        }
        var cos = (na > 0 && nb > 0) ? dot / Math.sqrt(na * nb) : 0;
        sum += 1 - cos; cnt++;
      }
    }
    return cnt ? sum / cnt : null;
  }

  /* 12 维音级能量（chroma）。步骤：整数倍抽取降采样 → Hann 窗 → 逐帧 FFT → 幅度谱 →
     仅取 [minHz, maxHz]（低于为隆隆声/贝斯基频，高于为镲片宽带噪声，二者都会劣化调性估计）→
     按 MIDI 音高对相邻两个音级做线性分配加权（避免硬取整的量化误差）→ 幅度 sqrt 压缩
     （抑制强峰支配）→ 逐帧归一累加 → 全体 L2 归一化。
     帧数不足 8 或全静音 → { ok: false, chroma: null }。
     ⚠️ fftSize 默认 4096（设计稿初稿为 2048，实测不足已修正）：在 srTarget=11025 下
     2048 点 ⇒ binHz=5.38Hz，Hann 主瓣约 4 bin ≈ 21.5Hz，而 C4 的半音宽仅 15.6Hz ——
     主瓣比半音还宽，能量必然泄漏到相邻音级（实测 C 三和弦三音级占比仅 0.627，
     调性识别 5/6）。4096 点 ⇒ binHz=2.69Hz，主瓣 ≈ 10.8Hz < 半音，占比升到 0.734、
     识别 6/6；再增大到 8192/16384 无进一步收益而耗时翻倍，故 4096 为拐点。
     30s 音频单次分析约 100ms，属播放期后台惰性计算，可接受。 */
  function computeChroma(mono, sampleRate, opts) {
    var o = opts || {};
    var srTarget = stNumOr(o.srTarget, 11025);
    var fftSize = stNumOr(o.fftSize, 4096);
    var hop = stNumOr(o.hop, 1024);
    var minHz = stNumOr(o.minHz, 55);
    var maxHz = stNumOr(o.maxHz, 2000);
    var fail = { ok: false, chroma: null, frames: 0 };
    if (!mono || !mono.length || !sampleRate || sampleRate <= 0) return fail;
    if (!(fftSize >= 32) || (fftSize & (fftSize - 1)) !== 0) return fail;
    if (!(hop > 0)) hop = fftSize / 2;
    /* 整数倍抽取降采样：分析无需全带宽，省算力（与 stDetectBpm 同法） */
    var sig = mono, sr = sampleRate;
    var dec = Math.max(1, Math.floor(sampleRate / srTarget));
    if (dec > 1) {
      var dn = Math.floor(mono.length / dec);
      sig = new Float32Array(dn);
      for (var d = 0; d < dn; d++) sig[d] = mono[d * dec];
      sr = sampleRate / dec;
    }
    var frames = Math.floor((sig.length - fftSize) / hop) + 1;
    if (frames < 8) { fail.frames = Math.max(0, frames); return fail; }
    /* Hann 窗 */
    var win = new Float32Array(fftSize);
    for (var w = 0; w < fftSize; w++) win[w] = 0.5 - 0.5 * Math.cos(2 * Math.PI * w / (fftSize - 1));
    var re = new Float32Array(fftSize), im = new Float32Array(fftSize);
    var chroma = new Float32Array(12);
    var binHz = sr / fftSize;
    var kLo = Math.max(1, Math.ceil(minHz / binHz));
    var kHi = Math.min(fftSize / 2 - 1, Math.floor(maxHz / binHz));
    if (kHi < kLo) { fail.frames = frames; return fail; }
    var total = 0;
    for (var f = 0; f < frames; f++) {
      var off = f * hop;
      for (var z = 0; z < fftSize; z++) { re[z] = sig[off + z] * win[z]; im[z] = 0; }
      fftRadix2(re, im);
      var tmp = new Float32Array(12);
      var frameSum = 0;
      for (var k = kLo; k <= kHi; k++) {
        var mag = Math.sqrt(re[k] * re[k] + im[k] * im[k]);
        if (!(mag > 0)) continue;
        var amp = Math.sqrt(mag); /* 幅度压缩：抑制单个强峰支配整帧 */
        var hz = k * binHz;
        var midi = 69 + 12 * Math.log2(hz / 440);
        var base = Math.floor(midi);
        var frac = midi - base;
        var pc0 = ((base % 12) + 12) % 12;
        var pc1 = (pc0 + 1) % 12;
        tmp[pc0] += amp * (1 - frac);
        tmp[pc1] += amp * frac;
        frameSum += amp;
      }
      if (!(frameSum > 0)) continue;
      for (var c = 0; c < 12; c++) chroma[c] += tmp[c] / frameSum;
      total++;
    }
    if (!total) { fail.frames = frames; return fail; }
    var norm = 0;
    for (var q = 0; q < 12; q++) norm += chroma[q] * chroma[q];
    if (!(norm > 0)) { fail.frames = total; return fail; }
    norm = Math.sqrt(norm);
    for (var p = 0; p < 12; p++) chroma[p] = chroma[p] / norm;
    return { ok: true, chroma: chroma, frames: total };
  }

  /* Krumhansl-Schmuckler 调性剖面（大调 / 小调，按音级度数排列）。
     工程折衷值，非实测标定；单测只断言 tonic/mode 与置信度的单调性与边界。 */
  var ST_KS_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
  var ST_KS_MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

  /* Camelot 轮编号（下标 = tonic 音级，0 = C）。等音自动合并。
     校验：关系大小调共享同一 number（C 大 8B / A 小 8A）。 */
  var ST_CAMELOT_MAJOR = [8, 3, 10, 5, 12, 7, 2, 9, 4, 11, 6, 1];
  var ST_CAMELOT_MINOR = [5, 12, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10];

  /* Pearson 相关系数；任一侧方差为 0 → 0（避免除零）。 */
  function stPearson(a, b) {
    var n = a.length;
    if (!n || b.length !== n) return 0;
    var ma = 0, mb = 0, i;
    for (i = 0; i < n; i++) { ma += a[i]; mb += b[i]; }
    ma /= n; mb /= n;
    var num = 0, da = 0, db = 0;
    for (i = 0; i < n; i++) {
      var x = a[i] - ma, y = b[i] - mb;
      num += x * y; da += x * x; db += y * y;
    }
    if (!(da > 0) || !(db > 0)) return 0;
    return num / Math.sqrt(da * db);
  }

  /* chroma → 调性。24 个候选（12 tonic × 大小调）取 Pearson 相关最高者。
     ⚠️ 置信度用**绝对拟合强度 bestR**（clamp 到 [0,1]），而非"最优与次优的相关差"。
     原因（实测标定，见设计文档 §4.2.9）：gap 型指标衡量的是"最优候选有多独特"，
     而不是"最优候选有多贴合"。无调性素材（白噪声）没有任何候选贴合，但总有一个
     随机地相对突出，于是 gap 反而很大——实测白噪声 gap 置信度 0.678，
     竟高于正确识别样本的中位数 0.487。而 bestR 能干净区分：
       正确识别（22 个合成复音素材）bestR ∈ [0.814, 1.0]（中位 0.873）
       无调性/歧义素材            bestR ≤ 0.775（白噪声 0.294、12 音堆叠 0.263、
                                            纯五度 0.775、单音 0.764）

     ⚠️ 另有**音级多样性（熵）折扣**（opts.minEntropy，默认 0.85）：
     单音/持续低音与调性剖面仍能相关到 0.70~0.79（谐波"恰好"符合某个调的音级分布），
     但音乐上并无调性可言。用归一化熵（0=全集中在一个音级，1=完全平坦）压低这类素材。

     ⚠️⚠️ **必须有复音证据（opts.harmonyEvidence，见设计文档 §4.2.15）**：
     单音/持续低音与调性剖面仍能相关到 0.79~0.83（谐波"恰好"符合某个调的音级分布），
     且其**聚合熵不低**（C2 带 40 次谐波实测 entropy 0.967）——故熵折扣对这类素材形同虚设。
     唯一的可靠判据是"是否真的有多个独立基频同时发声"：单一基频的谐波都是其**整数倍**，
     真实和声含**非整数比**的独立基频。
     调用方必须传入 `opts.harmonyEvidence`（由 stHarmonyEvidence 算出：0 = 只有单一基频，
     >=1 = 检测到非整数倍谱峰）。**缺省或为 0 一律按"无和声"处理并返回无效结果**（fail-closed）：
     宁可漏报（退回既有行为，无危害），不可误报（错误缩短重叠并施加频谱分离，损害听感）。
     ⚠️ 一个音高不是"调性"——E 既属 C 大调（三音，协和）也属 E 大调，
     用 Camelot 轮按"调"比较单音必然给出错误的相容度（实测 E pedal vs C 大调被判冲突）。

     `secondR` / `gap` / `entropy` 作为诊断字段保留（写入日志便于回看）。 */
  function detectKey(chroma, opts) {
    var o = opts || {};
    var minEntropy = stNumOr(o.minEntropy, 0.85);
    var variation = (typeof o.variation === 'number' && isFinite(o.variation)) ? o.variation : null;
    var evidence = (typeof o.harmonyEvidence === 'number' && isFinite(o.harmonyEvidence)) ? o.harmonyEvidence : null;
    var invalid = { tonic: null, mode: null, confidence: 0, bestR: 0, secondR: 0, gap: 0, entropy: 0, variation: variation, harmonyEvidence: evidence };
    if (!chroma || chroma.length !== 12) return invalid;
    /* fail-closed：无复音证据 → 无法证明"有和声" → 按不可信处理 */
    if (evidence === null || !(evidence >= 1)) return invalid;
    var sum = 0, i;
    for (i = 0; i < 12; i++) sum += Math.abs(stNumOr(chroma[i], 0));
    if (!(sum > 0)) return invalid;
    /* 归一化熵：音级多样性（诊断用；不单独作为门限，理由见上）。 */
    var entropy = 0;
    for (i = 0; i < 12; i++) {
      var pv = Math.abs(stNumOr(chroma[i], 0)) / sum;
      if (pv > 0) entropy -= pv * Math.log(pv);
    }
    entropy = entropy / Math.log(12);
    var bestR = -2, secondR = -2, bestTonic = null, bestMode = null;
    var rotated = new Float32Array(12);
    for (var m = 0; m < 2; m++) {
      var prof = m === 0 ? ST_KS_MAJOR : ST_KS_MINOR;
      for (var t = 0; t < 12; t++) {
        for (var k = 0; k < 12; k++) rotated[k] = stNumOr(chroma[(k + t) % 12], 0);
        var r = stPearson(rotated, prof);
        if (r > bestR) {
          secondR = bestR; bestR = r; bestTonic = t;
          bestMode = m === 0 ? 'major' : 'minor';
        } else if (r > secondR) {
          secondR = r;
        }
      }
    }
    if (bestTonic === null) return invalid;
    /* 置信度 = 绝对拟合强度 × 熵折扣。
       熵折扣用于压低"单音/持续低音/同音反复"这类音级分布恰好贴合某调、
       但音乐上无和声的素材（详见函数头部注释与设计文档 §4.2.14）。 */
    var divEntropy = minEntropy > 0 ? Math.min(1, entropy / minEntropy) : 1;
    var conf = Math.max(0, Math.min(1, bestR)) * divEntropy;
    var r2 = Math.max(secondR, -2);
    return {
      tonic: bestTonic,
      mode: bestMode,
      confidence: Math.round(conf * 1000) / 1000,
      bestR: Math.round(bestR * 10000) / 10000,
      secondR: Math.round(r2 * 10000) / 10000,
      gap: Math.round((bestR - Math.max(r2, 0)) * 10000) / 10000,
      entropy: Math.round(entropy * 10000) / 10000,
      variation: (variation === null) ? null : Math.round(variation * 10000) / 10000,
      harmonyEvidence: evidence
    };
  }

  /* 调性相容度（0..1）。Camelot 轮：同号同 letter 最合，关系大小调次之，
     纯五度经典 DJ 混音，三全音最冲突。任一侧无效 → null（调用方走中性分支）。 */
  function computeKeyCompat(keyA, keyB, opts) {
    if (!keyA || !keyB) return null;
    /* ⚠️ 必须显式拒绝 null/undefined/'' —— Number(null) === 0 且 isFinite(0) 为真，
       只靠 isFinite 会把"调性未知"误当成 C（0），从而给出完全错误的相容度。
       stNumOr(v, NaN) 对 null/undefined/'' 返回 NaN，正好把这三者与真正的 0 区分开。 */
    var ta = stNumOr(keyA.tonic, NaN), tb = stNumOr(keyB.tonic, NaN);
    var ma = keyA.mode, mb = keyB.mode;
    if (!isFinite(ta) || !isFinite(tb)) return null;
    if (ma !== 'major' && ma !== 'minor') return null;
    if (mb !== 'major' && mb !== 'minor') return null;
    ta = ((Math.round(ta) % 12) + 12) % 12;
    tb = ((Math.round(tb) % 12) + 12) % 12;
    var na = (ma === 'major' ? ST_CAMELOT_MAJOR : ST_CAMELOT_MINOR)[ta];
    var nb = (mb === 'major' ? ST_CAMELOT_MAJOR : ST_CAMELOT_MINOR)[tb];
    var la = ma === 'major' ? 'B' : 'A';
    var lb = mb === 'major' ? 'B' : 'A';
    if (na === nb && la === lb) return 1.00;   /* 同调 */
    if (na === nb && la !== lb) return 0.95;   /* 关系大小调 */
    var d = Math.abs(na - nb);
    if (d > 6) d = 12 - d;                     /* 环形距离归一到 [0,6] */
    if (d === 6) return 0.20;                  /* 三全音：最冲突 */
    if (d === 1 && la === lb) return 0.85;     /* 纯五度 */
    if (d === 2 && la === lb) return 0.65;     /* 大二度 */
    if (d === 1 && la !== lb) return 0.60;     /* 关系调的五度 */
    return 0.40;                               /* 其余：中性偏保守 */
  }

  /* 保留两位小数（统一数值口径，避免浮点尾巴进日志/断言）。 */
  function stRound2(v) {
    return Math.round(v * 100) / 100;
  }

  /* 取 [lo, hi) 区间的中位数（对副本排序，不改动入参）。 */
  function stMedian(arr, lo, hi) {
    var a = [];
    for (var i = lo; i < hi; i++) if (i >= 0 && i < arr.length) a.push(arr[i]);
    if (!a.length) return -120;
    a.sort(function (x, y) { return x - y; });
    var mid = a.length >> 1;
    return (a.length % 2) ? a[mid] : (a[mid - 1] + a[mid]) / 2;
  }

  /* 能量形态：逐帧 RMS → dBFS 包络 → 线性回归得斜率（dB 域，因为听感对数是线性的）→
     走势分档；另给首/末边界相对峰值的充能程度（fullness ≤ 0）。
     语义：endFullness ≈ 0 = "在满能量处停止"（骤停）；很低 = "已经衰减下去了"。
           startFullness ≈ 0 = B "一上来就是满能量"；很低 = "软起/前奏轻"。
     ⚠️ 实质静音（peakDb <= -60）明确返回 ok:false：全静音段若被算成"满能量骤停"
     （endFullness=0），会让冲突/骤停判定无端拉长重叠时长。 */
  function computeEnergyShape(mono, sampleRate, opts) {
    var o = opts || {};
    var frameSec = stNumOr(o.frameSec, 0.1);
    var edgeSec = stNumOr(o.edgeSec, 0.5);
    var fail = {
      ok: false, peakDb: null, meanDb: null, startDb: null, endDb: null,
      slopeDbPerSec: 0, trend: 'steady', startFullness: null, endFullness: null
    };
    if (!mono || !mono.length || !sampleRate || sampleRate <= 0) return fail;
    if (!(frameSec > 0) || !(edgeSec > 0)) return fail;
    var win = Math.max(1, Math.floor(sampleRate * frameSec));
    var frames = Math.floor(mono.length / win);
    if (frames < 4) return fail;
    var dbs = new Float64Array(frames);
    for (var f = 0; f < frames; f++) {
      var off = f * win, sum = 0;
      for (var i = 0; i < win; i += 2) { var s = mono[off + i]; sum += s * s; }
      var rms = Math.sqrt(sum / (win / 2));
      dbs[f] = rms > 1e-6 ? 20 * Math.log10(rms) : -120;
    }
    /* 峰值：95 分位（抗单帧尖峰） */
    var sorted = Array.prototype.slice.call(dbs).sort(function (a, b) { return a - b; });
    var peakDb = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
    /* 实质静音（含极低电平）：无形态可言 → 明确失败，避免被误判成"满能量骤停" */
    if (!(peakDb > -60)) return fail;
    var meanDb = 0;
    for (var m = 0; m < frames; m++) meanDb += dbs[m];
    meanDb /= frames;
    /* 最小二乘线性回归（x = 秒，y = dB） */
    var sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (var x = 0; x < frames; x++) {
      var tSec = x * frameSec;
      sx += tSec; sy += dbs[x]; sxx += tSec * tSec; sxy += tSec * dbs[x];
    }
    var denom = frames * sxx - sx * sx;
    var slope = denom !== 0 ? (frames * sxy - sx * sy) / denom : 0;
    var edgeFrames = Math.max(1, Math.min(frames, Math.round(edgeSec / frameSec)));
    var startDb = stMedian(dbs, 0, edgeFrames);
    var endDb = stMedian(dbs, frames - edgeFrames, frames);
    var trend = slope <= -1.5 ? 'falling' : (slope >= 1.5 ? 'rising' : 'steady');
    return {
      ok: true,
      peakDb: stRound2(peakDb),
      meanDb: stRound2(meanDb),
      startDb: stRound2(startDb),
      endDb: stRound2(endDb),
      slopeDbPerSec: stRound2(slope),
      trend: trend,
      startFullness: stRound2(startDb - peakDb),
      endFullness: stRound2(endDb - peakDb)
    };
  }

  /* 数值夹取（lo > hi 时以 lo 为准，避免非法区间产出 NaN）。 */
  function stClamp(v, lo, hi) {
    var l = stNumOr(lo, 0), h = stNumOr(hi, 0);
    if (h < l) h = l;
    var x = stNumOr(v, l);
    return x < l ? l : (x > h ? h : x);
  }

  /* 调性是否可用（tonic 有效即算，置信度由调用方另行门槛）。 */
  function stKeyUsable(k) {
    if (!k) return false;
    var t = stNumOr(k.tonic, NaN);
    if (!isFinite(t)) return false;
    return k.mode === 'major' || k.mode === 'minor';
  }

  /* 轻节拍对齐速率。既有行为：两侧 BPM 置信不足 → 1；否则 clamp(bpmA/bpmB, bounds)。
     widen=true 时若差距落在 (3%, 6%] 则换用宽边界 wideBounds（仅高调性相容时由调用方开启）。
     不做事后取整：既有 stComputeAlignRate 同样不取整，保持行为一致。 */
  function stAlignRateOf(bpmA, bpmB, confA, confB, alignConf, rateBounds, widen, wideBounds) {
    if (!(bpmA > 0) || !(bpmB > 0)) return 1;
    if (!(confA >= alignConf) || !(confB >= alignConf)) return 1;
    var ratio = bpmA / bpmB;
    var lo = stNumOr(rateBounds[0], 0.97), hi = stNumOr(rateBounds[1], 1.03);
    var dev = Math.abs(ratio - 1);
    if (widen && dev > 0.03 && dev <= 0.06) {
      var w = (wideBounds && wideBounds.length === 2) ? wideBounds : [0.94, 1.06];
      lo = stNumOr(w[0], 0.94); hi = stNumOr(w[1], 1.06);
    }
    return stClamp(ratio, lo, hi);
  }

  /* ST6 唯一新增决策出口：在既有「尾部形态」决策（caps.baseKind）之上做两维精修——
     ① 调性相容度（A 尾 × B 头）→ 冲突则缩短同时发声时长；
     ② 能量形态（A 尾是否满能量骤停 / B 头是否软起）→ 骤停则给足重叠。
     产出冻结 Plan，执行层只读不写。缺新数据时与既有取值逐项相等（零回归不变量 I1）。
     注意：重叠时长仍需调用方与"当前歌剩余"夹取（min(overlapSec, remaining)）。 */
  function buildTransitionShape(cur, next, prefs, caps) {
    var p = prefs || {}, c = caps || {};
    var curS = cur || {}, nextS = next || {};
    /* 入口夹取：调用方契约是 windowSec = stEffectiveWindow() ∈ [ST_MIX_MIN, ST_MIX_MAX]
       （stGetMixDuration 自身夹在 [1,12]，silenceMix 走 max(2,…)，量化再夹一次）。
       对合法输入此处是恒等变换，故不变量 I1（无新数据时 overlapSec === windowSec）精确成立；
       同时对越界输入（未来新增调用方传 0/负数/NaN）保证 I2（结果恒在 [1,12]）不被破坏——
       否则 I1 与 I2 对越界输入会互相矛盾。 */
    var rawWindow = stNumOr(p.windowSec, 0);
    var windowSec = stClamp(rawWindow, stNumOr(p.mixMin, 1), stNumOr(p.mixMax, 12));
    var maxExtend = stNumOr(p.maxExtendSec, 12);
    var keyConfMin = stNumOr(p.keyConfMin, 0.75);
    var goodMin = stNumOr(p.harmonicGoodMin, 0.85);
    var conflictMax = stNumOr(p.harmonicConflictMax, 0.55);
    var minOverlap = stNumOr(p.harmonicMinOverlap, 2);
    var abruptMin = stNumOr(p.abruptMinOverlap, 3);
    var abruptFullDb = stNumOr(p.abruptFullEnergyDb, -3);
    var softHeadDb = stNumOr(p.softHeadDb, -12);
    var mixMin = stNumOr(p.mixMin, 1);
    var mixMax = stNumOr(p.mixMax, 12);
    var rateBounds = (p.rateBounds && p.rateBounds.length === 2) ? p.rateBounds : [0.97, 1.03];
    var wideBounds = (p.wideRateBounds && p.wideRateBounds.length === 2) ? p.wideRateBounds : [0.94, 1.06];
    /* 滤波整形的频率端点：由调用方传入以便集中调参；缺省值与设计稿一致 */
    var lpStart = stNumOr(p.lpStartHz, 700);
    var lpOpen = stNumOr(p.lpOpenHz, 20000);
    var lpMid = stNumOr(p.lpMidHz, 12000);
    var hpFrom = stNumOr(p.hpFromHz, 10);
    var hpTo = stNumOr(p.hpToHz, 130);
    var hpRatioGood = stNumOr(p.hpDurRatioGood, 0.65);
    var hpRatioNeutral = stNumOr(p.hpDurRatioNeutral, 0.50);
    var hpRatioConflict = stNumOr(p.hpDurRatioConflict, 0.35);
    var baseKind = c.baseKind || 'fade';
    var reasons = [];

    /* 调性：优先 A 尾 × B 头（重叠期真正同时发声的两段）；A 尾缺则回退 A 头 */
    var keyA = null, keySource = 'none';
    if (stKeyUsable(curS.keyTail)) { keyA = curS.keyTail; keySource = 'tail-head'; }
    else if (stKeyUsable(curS.keyHead)) { keyA = curS.keyHead; keySource = 'head-head'; }
    var keyB = stKeyUsable(nextS.keyHead) ? nextS.keyHead : null;
    var eTail = curS.energyTail || null;
    var eHead = nextS.energyHead || null;
    var tailOk = !!(eTail && eTail.ok);
    var headOk = !!(eHead && eHead.ok);

    /* 速率与响度：只依赖既有数据，始终按既有规则算 */
    var bpmA = (curS.bpm && Number(curS.bpm.bpm) > 0) ? Number(curS.bpm.bpm) : 0;
    var bpmB = (nextS.bpm && Number(nextS.bpm.bpm) > 0) ? Number(nextS.bpm.bpm) : 0;
    var confA = curS.bpm ? stNumOr(curS.bpm.confidence, 0) : 0;
    var confB = nextS.bpm ? stNumOr(nextS.bpm.confidence, 0) : 0;
    var alignConf = stNumOr(p.bpmAlignConf, 0.6);
    var matchGain = computeMatchGain(
      (typeof curS.loudnessDb === 'number') ? curS.loudnessDb : null,
      (typeof nextS.loudnessDb === 'number') ? nextS.loudnessDb : null);

    /* 调性相容度：两侧都达到置信门槛才算数 */
    var compat = null, confident = false;
    if (keyA && keyB && stNumOr(keyA.confidence, 0) >= keyConfMin && stNumOr(keyB.confidence, 0) >= keyConfMin) {
      compat = computeKeyCompat(keyA, keyB);
      confident = (compat !== null);
    }

    /* 步骤 0：无新数据 → 与既有取值逐项相等（不变量 I1）。
       "全缺"= 两侧都没有任何可用的新信息（key 与 energy 均无）。
       注意 key 存在但置信不足不算"全缺"：此时取值虽与既有相同，但归因不同
       （harmonic-low-confidence），对排查"为什么这次没做调性精修"是必要信息。 */
    var hasNew = confident || tailOk || headOk || !!keyA || !!keyB;
    if (!hasNew || !(windowSec > 0)) {
      return Object.freeze({
        kind: baseKind,
        overlapSec: windowSec,
        alignRate: stAlignRateOf(bpmA, bpmB, confA, confB, alignConf, rateBounds, false),
        matchGain: matchGain,
        eq: Object.freeze({ aHpFrom: hpFrom, aHpTo: hpTo, aHpDurRatio: hpRatioGood, bLp: null }),
        harmonic: Object.freeze({ compat: null, keyA: null, keyB: null, source: 'none', confident: false }),
        energy: Object.freeze({ tailEndFullness: null, tailTrend: null, headStartFullness: null, headTrend: null, ok: false }),
        reasons: Object.freeze(['legacy-no-data'])
      });
    }

    /* 步骤 1–2：调性精修。三种情况必须分开归因，否则日志会给出**虚假**的失败原因：
       ① 调性可信 + 窗口足够 → 按相容度决定是否缩短；
       ② 调性可信 + 窗口过短 → 不缩短（再缩已无意义），但相容度仍如实上报、频谱整形照常应用。
          执行层会把实际混音时长夹到 max(2, …)，故整形仍作用在 ≥2s 的同时发声窗口上。
          ⚠️ 此处绝不可复用 ③ 的归因——confidence 明明是高的，写 harmonic-low-confidence
          会把排查引向完全错误的方向（实测曾如此）。
       ③ 调性不可信 → 不精修。 */
    var overlap = windowSec;
    if (confident) {
      if (overlap < 2) {
        reasons.push('harmonic-window-too-short');
      } else if (compat >= goodMin) {
        reasons.push('harmonic-ok');
      } else if (compat < conflictMax) {
        var shortened = Math.max(minOverlap, overlap * 0.45);
        /* 归因只在**时长真的变了**时才记：窗口已在下限时缩短动作无效果，
           记 harmonic-conflict-shorten 会谎称发生了缩短（实测 window=2 可达）。 */
        if (shortened < overlap) {
          overlap = shortened;
          reasons.push('harmonic-conflict-shorten');
        } else {
          reasons.push('harmonic-conflict-at-floor');
        }
      } else {
        reasons.push('harmonic-neutral');
      }
    } else if (keyA && keyB) {
      reasons.push('harmonic-low-confidence');
    } else {
      reasons.push('harmonic-unavailable');
    }

    /* 步骤 3：A 尾满能量骤停 → 给足重叠（只升不降，上限受 maxExtendSec）。
       归因同样只在**真的延长了**时才记：否则会出现"日志说延长、实际却被上一步缩短"
       的自相矛盾记录（实测 window=8 + 冲突 → overlap 8→3.6 却记 tail-full-energy-extend）。 */
    var tailFull = tailOk && typeof eTail.endFullness === 'number' && eTail.endFullness >= abruptFullDb;
    if (tailFull) {
      if (overlap < abruptMin) {
        var extended = Math.min(abruptMin, Math.max(maxExtend, mixMin));
        if (extended > overlap) {
          overlap = extended;
          reasons.push('tail-full-energy-extend');
        } else {
          reasons.push('tail-full-energy-no-room');
        }
      } else {
        reasons.push('tail-full-energy-already-covered');
      }
    }

    /* 步骤 4：B 头软起（软起的 B 混入早期不产生冲突，不缩短时长） */
    var headSoft = headOk && typeof eHead.startFullness === 'number' && eHead.startFullness <= softHeadDb;
    if (headSoft) reasons.push('head-soft');

    /* 步骤 5：夹取 */
    overlap = stClamp(overlap, mixMin, mixMax);

    /* 步骤 6：滤波整形。⚠️ 仅在调性**可信**时才整形：
       调性未知/置信不足时一律沿用既有默认（0.65 + 旁路），否则会凭空对无数据的两首歌
       施加频谱分离——既违反零回归不变量 I1，也没有任何依据。
       B 侧低通方向：from(700) → to(20000/12000) 是"打开"（由暗到亮）；
       写成 to=15 会把 B 逐渐闷死至静音。bypass 用 null 而非 0——低通频率 0 就是全静音。 */
    var aHpDurRatio, bLp;
    if (!confident) {
      aHpDurRatio = hpRatioGood; bLp = null;
    } else if (compat >= goodMin) {
      aHpDurRatio = hpRatioGood; bLp = null;
    } else if (compat >= conflictMax) {
      aHpDurRatio = hpRatioNeutral; bLp = { from: lpStart, to: lpOpen };
    } else {
      aHpDurRatio = hpRatioConflict; bLp = { from: lpStart, to: lpMid };
    }

    /* 步骤 7：变速（含放宽）。放宽三条件：高相容 + 两侧 BPM 高置信 + 差距 ∈ (3%, 6%] */
    var widen = confident && compat >= goodMin;
    var alignRate = stAlignRateOf(bpmA, bpmB, confA, confB, alignConf, rateBounds, widen, wideBounds);
    if (alignRate !== stAlignRateOf(bpmA, bpmB, confA, confB, alignConf, rateBounds, false, wideBounds)) {
      reasons.push('rate-widened');
    }

    return Object.freeze({
      kind: baseKind,
      overlapSec: Math.round(overlap * 1000) / 1000,
      alignRate: alignRate,
      matchGain: matchGain,
      eq: Object.freeze({
        aHpFrom: hpFrom,
        aHpTo: hpTo,
        aHpDurRatio: aHpDurRatio,
        bLp: bLp ? Object.freeze({ from: bLp.from, to: bLp.to }) : null
      }),
      harmonic: Object.freeze({
        compat: compat,
        keyA: keyA ? { tonic: keyA.tonic, mode: keyA.mode } : null,
        keyB: keyB ? { tonic: keyB.tonic, mode: keyB.mode } : null,
        source: confident ? keySource : (keyA && keyB ? keySource + '-lowconf' : 'none'),
        confident: confident
      }),
      energy: Object.freeze({
        tailEndFullness: tailOk ? eTail.endFullness : null,
        tailTrend: tailOk ? eTail.trend : null,
        headStartFullness: headOk ? eHead.startFullness : null,
        headTrend: headOk ? eHead.trend : null,
        ok: !!(tailOk || headOk)
      }),
      reasons: Object.freeze(reasons)
    });
  }

  // ── 歌词元数据/署名行判定（filterLyricCredits 判定核心）──────────
  /* 取代旧「任意子串命中 + 仅前 60s 时间窗」规则（前者误伤正文、后者漏掉尾部元数据）。
     新规则全部行首锚定（容忍前导括号/破折号/空白），对整首歌所有时间段的行统一生效：
     - 安全角色词（作词/作曲/编曲/制作人/乐器全称…）：后跟冒号类、破折号、闭括号、空白或行尾；
     - 易撞词（词/曲/编、鼓/琵琶/小号…英文 rap/mix/bass/organ…）：仅后跟冒号类、「by」或行尾；
     - 短前缀（≤6字）+ 零歧义角色（作词/作曲）+ 冒号：覆盖「本曲作词：xx」形。 */
  /* 头部构造：容忍前导破折号/括号；角色 = 中文角色（可再跟英文角色）或纯英文角色。
     复合形是真实数据里的常态（如「编曲 Arranger：…」「人声录音棚 Vocal Recording Studio：…」），
     旧实现只认单一角色词，导致这类行整行漏过滤。 */
  var CREDIT_HEAD_PREFIX = '^\\s*(?:[-–—~～]+\\s*)?(?:[({（【\\[［]?\\s*)?';
  var CREDIT_SEP_STRONG = '[:：/／|｜\\-—–]';
  var CREDIT_CLOSE = '[)）】\\]］]\\s*';

  /* 中文安全角色（后跟冒号/破折号/闭括号/空白/行尾均可） */
  var CREDIT_ROLE_SAFE_ZH = '人声录音棚|人声录音师|人声录音|乐器录音|和声录音|录音工程|混音工程|混音助理|母带制作|母带工程|乐谱制作|制谱|谱务|音乐制作人|作词|作曲|编曲|制作人|制作团队|制作|监制人|监制|监唱|出品人|出品|发行公司|发行|录音棚|录音室|录音师|录音|混音室|混音师|混音|母带处理|母带|和声编写|和音编写|和声设计|和声|和音|配唱制作人|配唱|伴唱|人声编辑|人声|音乐制作|音乐总监|艺术总监|音乐编辑|配器|原唱|演唱|主唱|歌手|说唱|rap词|rap设计|编舞|统筹|企划|总策划|策划|词曲';
  var CREDIT_INSTR_SAFE = '电吉他|木吉他|架子鼓|吉他|贝斯|键盘|钢琴|电子琴|合成器|管弦乐|弦乐|小提琴|中提琴|大提琴|低音提琴|double\\s+bass|萨克斯管|萨克斯|长号|圆号|大号|单簧管|双簧管|巴松管|短笛|口琴|手风琴|风琴|竖琴|木管|铜管|马头琴|箜篌|中阮|柳琴|班卓琴|曼陀林|尤克里里|三角铁|木琴|军鼓|打碟|搓碟';
  /* 易撞角色（词/曲/鼓…）：须强分隔符或「by」或行尾，避免「一曲相思」类误判 */
  var CREDIT_ROLE_COLON_ZH = '词|曲|编|制作助理|制作助手|文案|封面设计|封面|设计|摄影|宣传|导演|鸣谢|特别鸣谢|致谢|艺人|经纪|版权|所属公司|厂牌|乐器|音效|采样|编程|program';
  var CREDIT_INSTR_COLON = '鼓|箫|笛|埙|笙|镲|钹|小号|琵琶|古筝|古琴|扬琴|唢呐|二胡|竹笛|笛子';

  /* 英文安全角色（补 copyist / recording studio / * engineer 等多词角色） */
  var CREDIT_ROLE_SAFE_EN = 'music\\s+copyist|copyist|recording\\s+studio|recording\\s+engineer|mixing\\s+engineer|mastering\\s+engineer|vocal\\s+recording(?:\\s+studio|\\s+engineer)?|vocal\\s+producer|music\\s+produced\\s+by|lyrics?|lyricist|words?|composer|composed|compose|arranger|arranged|arrangement|producer|produced|produce|executive\\s+producer|recording|recorded|engineer(?:ing|ed)?|mixing|mixed|mastering|mastered|backing\\s+vocals?|vocalist|string\\s+section|strings|brass|choir|keyboards?|drums?|percussion|program(?:ming)?|synthesizer|photograph(?:y|er)|artwork|choreograph(?:y|er)|director|written\\s+by|performed\\s+by|recorded\\s+by|mixed\\s+by|mastered\\s+by|produced\\s+by|arranged\\s+by|composed\\s+by';
  var CREDIT_ROLE_COLON_EN = 'mix|master|record|vocal(?:s)?|guitars?|bass|rap|horn|organ|harp|sax(?:ophone)?|synths?|snare|cymbal|xylophone|feature[ds]?|feat';

  /* 中文角色后允许再跟一个英文角色（编曲 Arranger：…）。
     注意：这里不可放入「裸英文角色」分支——中文表的收尾允许空白分隔，
     混入英文会让 'Drum and bass drop'、'strings of my heart' 这类正文被误判。
     纯英文角色一律走下面的 CREDIT_HEAD_EN_* 严格分隔路径。 */
  var CREDIT_ROLE_ANY_ZH_INSTR = '(?:(?:' + CREDIT_ROLE_SAFE_ZH + '|' + CREDIT_INSTR_SAFE + ')(?:\\s+(?:' + CREDIT_ROLE_SAFE_EN + '))?)';
  var CREDIT_ROLE_ANY_COLON = '(?:(?:' + CREDIT_ROLE_COLON_ZH + '|' + CREDIT_INSTR_COLON + ')(?:\\s+(?:' + CREDIT_ROLE_SAFE_EN + '|' + CREDIT_ROLE_COLON_EN + '))?)';

  var CREDIT_HEAD_ZH_SAFE = new RegExp(CREDIT_HEAD_PREFIX + CREDIT_ROLE_ANY_ZH_INSTR + '\\s*(?:' + CREDIT_CLOSE + '|' + CREDIT_SEP_STRONG + '|\\s|$)', 'i');
  var CREDIT_HEAD_ZH_COLON = new RegExp(CREDIT_HEAD_PREFIX + CREDIT_ROLE_ANY_COLON + '(?:' + CREDIT_CLOSE + ')?\\s*(?:' + CREDIT_SEP_STRONG + '|\\s+by\\b|\\s*$)', 'i');
  var CREDIT_HEAD_EN_SAFE = new RegExp(CREDIT_HEAD_PREFIX + '(?:' + CREDIT_ROLE_SAFE_EN + ')(?:' + CREDIT_CLOSE + ')?\\s*(?:' + CREDIT_SEP_STRONG + '|\\s+by\\b|\\s*$)', 'i');
  var CREDIT_HEAD_EN_COLON = new RegExp(CREDIT_HEAD_PREFIX + '(?:' + CREDIT_ROLE_COLON_EN + ')(?:' + CREDIT_CLOSE + ')?\\s*(?:[:：/／|｜]|\\s+by\\b|\\s*$)', 'i');
  var CREDIT_SHORT_PUBLISH = /\b(?:OP|SP)\s*[:：]/;                        /* OP/SP 大写 + 冒号（任意位置） */
  var CREDIT_SHORT_PUBLISH_HEAD = /^\s*(?:[(（【\[]?\s*)?(?:OP|SP)(?:\s*(?:&|＋|和)\s*(?:OP|SP))*\s*(?:[)）】\]]?\s*)?(?:[:：/／|｜\-—–]|[\s\u3000]|$)/; /* 行首 OP/SP + 分隔符/空格/行尾 */

  /* 长度护栏（两段式）：署名行通常短，但「角色：值」的值本身可以很长——
     如「人声录音棚 Vocal Recording Studio：The Hideout Recording Studio」(57)。
     旧实现一刀切 raw.length > 48 直接放行，长署名行因此整行漏过滤。
     现在：有明确标签分隔符（冒号/破折号等，且出现在头部窗口内）才放宽到硬上限；
     仅靠空白/行尾收尾的「弱分隔」仍维持 48，防止「制作 一个梦 需要多少年…」类长正文误判。 */
  var CREDIT_LEN_MAX = 160;        /* 硬上限：任何署名行都不会超过 */
  var CREDIT_LEN_MAX_WEAK = 48;    /* 弱分隔上限：沿用旧值 */
  var CREDIT_HEAD_WINDOW = 44;     /* 分隔符须落在前 44 字符内，才算「标签式」署名 */
  var CREDIT_SEP_SCAN = /[:：/／|｜\-—–]|\s+by\b/i;

  function isCreditLine(text) {
    var raw = String(text == null ? '' : text).trim();
    if (!raw || raw.length > CREDIT_LEN_MAX) return false;
    var sepAt = raw.search(CREDIT_SEP_SCAN);
    var strongSep = sepAt !== -1 && sepAt <= CREDIT_HEAD_WINDOW;
    if (!strongSep && raw.length > CREDIT_LEN_MAX_WEAK) return false;
    if (CREDIT_HEAD_ZH_SAFE.test(raw)) return true;
    /* 「词/曲」单字 + 空格 + 短名（整行）：真实署名形；正文行几乎不会以「曲␣」起头 */
    if (/^[词曲]\s+\S{1,20}$/.test(raw)) return true;
    if (CREDIT_HEAD_ZH_COLON.test(raw)) return true;
    if (CREDIT_HEAD_EN_SAFE.test(raw)) return true;
    if (CREDIT_HEAD_EN_COLON.test(raw)) return true;
    /* 行首 ≤6 个非标点字符前缀 + 零歧义角色 + 冒号（如「本曲作词：xx」） */
    var stripped = raw.replace(/^[\s\-–—~～]+/, '').replace(/^[(（【\[［]\s*/, '');
    if (stripped.length <= 14 && /^.{1,6}(?:作词|作曲)\s*[:：]/.test(stripped)) return true;
    if (CREDIT_SHORT_PUBLISH.test(raw) || CREDIT_SHORT_PUBLISH_HEAD.test(raw)) return true;
    return false;
  }

  /* 艺人名署名行：整行恰为「艺人」「艺人A、艺人B」「艺人 - 别名」等形；
     不再用「行内包含」判定（正文提及歌手名不再被误删）。names = 艺人数组（原始大小写）。 */
  function isArtistCreditLine(text, names) {
    var raw = String(text == null ? '' : text).trim();
    if (!raw || raw.length > 40 || !Array.isArray(names) || !names.length) return false;
    function esc(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
    var norm = raw.toLowerCase().replace(/\s+/g, '');
    var alts = [], seen = {};
    for (var i = 0; i < names.length; i++) {
      var n = String(names[i] || '').toLowerCase().replace(/\s+/g, '');
      if (!n) continue;
      if (!seen[n]) { seen[n] = 1; alts.push(esc(n)); }
      var paren = n.match(/^(.+?)[（(](.+?)[）)]$/);   /* 「JayChou(周杰伦)」中英双形 */
      if (paren) {
        if (!seen[paren[1]]) { seen[paren[1]] = 1; alts.push(esc(paren[1])); }
        if (!seen[paren[2]]) { seen[paren[2]] = 1; alts.push(esc(paren[2])); }
      }
    }
    if (!alts.length) return false;
    var norm2 = norm.replace(/[/／、，,]/g, '、');
    var one = '(?:' + alts.join('|') + ')';
    var rest = '(?:\\s*(?:&|＋|&amp;|和|、|，|,)\\s*' + one + ')*';
    var tail = '(?:\\s*(?:等|feat\\.?|ft\\.?|with))*';
    if (new RegExp('^' + one + rest + tail + '$', 'i').test(norm2)) return true;
    /* 「艺人 - 别名/称号」短署名行 */
    if (new RegExp('^' + one + '(?:\\s*(?:&|＋|和|、|，|,)\\s*' + one + ')*\\s*[-–—]\\s*\\S{1,24}$', 'i').test(norm2)) return true;
    return false;
  }

  // 3D 丽音（Haas 展宽）：开关状态 → 右声道延时秒数。关闭恒为 0（透明旁路）；ms 夹在 [0,100]，非法回退 25。
  function spatial3dDelaySeconds(enabled, ms) {
    var v = (typeof ms === 'number' && isFinite(ms)) ? ms : 25;
    v = Math.max(0, Math.min(100, v));
    return enabled === true ? v / 1000 : 0;
  }

  /* 歌手/制作人行跑马灯时序（设计见 docs/superpowers/specs/2026-09-19-artist-marquee-design.md）。
   *
   * 无缝循环：轨道内含两段相同文本，位移一整段（文本宽 + 段间距）即完成一轮，
   * 此时第二段恰好回到起点，肉眼无跳变；随后停顿 holdMs 再进入下一轮。
   *
   * 关键帧百分比按长度动态计算（滚动段占比 = 滚动时长 / 总时长）：
   * 静态 @keyframes 的百分比是定值，无法同时满足「速度恒定」与「停顿恒为 3s」——
   * 停顿占比 = holdMs / (scrollMs + holdMs)，必然随文字长度变化。
   *
   * 不做 prefers-reduced-motion 判定（保持纯净、可在 Node 中测）；该判定由调用方完成。
   */
  function computeArtistMarquee(textW, viewportW, opts) {
    var o = opts || {};
    var speed = Number(o.speedPxPerSec);
    if (!isFinite(speed) || speed <= 0) speed = 30;      // 下限保护：杜绝除零 → Infinity
    var hold = Number(o.holdMs);
    if (!isFinite(hold) || hold < 0) hold = 3000;
    var gap = Number(o.gapPx);
    if (!isFinite(gap) || gap < 0) gap = 48;

    var tw = Number(textW);
    if (!isFinite(tw) || tw < 0) tw = 0;
    var vw = Number(viewportW);
    if (!isFinite(vw) || vw < 0) vw = 0;

    if (vw <= 0 || tw <= vw) {
      return { scrolling: false, distance: 0, scrollMs: 0, totalMs: 0, keyframePct: 0, textW: tw, viewportW: vw };
    }

    var distance = tw + gap;
    var scrollMs = distance / speed * 1000;
    var totalMs = scrollMs + hold;
    var pct = scrollMs / totalMs * 100;
    return {
      scrolling: true,
      distance: Math.round(distance * 100) / 100,
      scrollMs: Math.round(scrollMs * 100) / 100,
      totalMs: Math.round(totalMs * 100) / 100,
      keyframePct: Math.round(pct * 1000) / 1000,
      textW: tw,
      viewportW: vw
    };
  }

  // ── AMLL 解析适配纯函数（AMLL-1）──
  //
  // 用途：把 @applemusic-like-lyrics/lyric 官方 parser 的输出适配到本工程内部的数据形态。
  // 抽到 pure.js 的原因与 H7 一致：这些映射不依赖 DOM，可被 node --test 直接覆盖，
  // 而 main.js 中的同名函数是委托封装（浏览器侧需保持单文件全局作用域）。
  //
  // 注意：本文件与 Harmonia/js/lib/pure.js 保持同源，两份改动需同步。

  var CJK_RE = /[\u4e00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/;

  // 行文本拼接口径（与 main.js lineTextFromAMLL 一致）：
  //  - TTML 来源按原样拼接（TTML 空格敏感，词内已带空格）；
  //  - 其他来源若含 CJK 则直接拼接，否则用空格连接（拉丁文按词切开后需要还原词间空格）。
  function joinWordTexts(words, fromTtml) {
    var list = (Array.isArray(words) ? words : []).map(function (w) {
      return String((w && (w.word !== undefined ? w.word : w.text)) || '');
    });
    if (!list.length) return '';
    if (fromTtml) return list.join('');
    if (list.length === 1) return list[0];
    return CJK_RE.test(list.join('')) ? list.join('') : list.join(' ');
  }

  // 官方 AMLL 行 → 工程既有「逐字歌词行」形状（time/end 为秒，words[].{start,end,text}）。
  // 工程内部同时存在逐字行与 AMLL 行两种形态，此函数用于让官方 parser 的输出
  // 能被下游既有逻辑（署名过滤、翻译对齐、legacyWordLinesToAMLLLines）直接消费。
  function amllLinesToLegacyWordLines(lines) {
    return (Array.isArray(lines) ? lines : []).map(function (line) {
      var words = (Array.isArray(line && line.words) ? line.words : [])
        .map(function (w) {
          return {
            start: Number(w.startTime) / 1000,
            end: Number(w.endTime) / 1000,
            text: String((w.word !== undefined ? w.word : w.text) || '')
          };
        })
        .filter(function (w) { return w.text.length > 0; });
      var startSec = Number(line && line.startTime) / 1000;
      return {
        time: isFinite(startSec) ? startSec : 0,
        end: Number(line && line.endTime) / 1000,
        words: words,
        text: words.length ? words.map(function (w) { return w.text; }).join('') : '',
        translation: (line && line.translatedLyric) || '',
        romanLyric: (line && line.romanLyric) || '',
        // 官方 parseYrc / parseQrc 会把「整行被圆括号包裹」的行识别为背景人声并去掉括号，
        // 该信息必须透传，否则下游无法区分背景句与正文句。
        isBG: !!(line && line.isBG),
        isDuet: !!(line && line.isDuet)
      };
    });
  }

  // 官方 parseTTML 输出 → 工程内部行模型。
  // 官方（内部委托 ttml 包的 toAmllLyrics）形状已与本工程高度一致，差异仅三点：
  //  1) 词尾空格用 endsWithSpace 布尔字段表达，而非直接写进 word —— 需还原成尾随空格，
  //     否则英文歌词会连成一片；
  //  2) 无 _fromTtml 标记 —— 该标记控制拉丁空格兜底与文本拼接口径；
  //  3) 官方无 agent 字段（isDuet 已按 ttm:agent 交替自行推导），故 agent 留空。
  // 另原样保留 word 上的 ruby / obscene / emptyBeat / romanWord：
  //  - obscene 为布尔（amll:obscene="true"）；
  //  - emptyBeat 为**数值**（amll:empty-beat="2"，解析侧用 parseInt，
  //    故 "true" 会得到 NaN 而被官方丢弃；此处按数值原样透传，不做布尔化，
  //    否则会把 2 变成 true，丢失空拍节拍数）；
  //  - ruby 为 [{startTime,endTime,word}] 注音分段。
  function adaptAmllTtmlLines(parsed) {
    var parsedLines = (parsed && (parsed.lines || parsed.lyricLines)) || [];
    return parsedLines.map(function (line) {
      var words = (Array.isArray(line && line.words) ? line.words : []).map(function (w) {
        var base = {
          startTime: w.startTime,
          endTime: w.endTime,
          word: String((w.word !== undefined ? w.word : w.text) || '') + (w.endsWithSpace ? ' ' : '')
        };
        if (Array.isArray(w.ruby) && w.ruby.length) base.ruby = w.ruby;
        if (w.obscene !== undefined) base.obscene = !!w.obscene;
        if (w.emptyBeat !== undefined) base.emptyBeat = w.emptyBeat;
        if (w.romanWord) base.romanWord = w.romanWord;
        return base;
      });
      var out = {};
      for (var k in line) if (Object.prototype.hasOwnProperty.call(line, k)) out[k] = line[k];
      out.words = words;
      out.isBG = !!line.isBG;
      out.isDuet = !!line.isDuet;
      out.agent = line.agent || '';
      out._fromTtml = true;
      return out;
    });
  }

  return {
    escapeHtml: escapeHtml,
    formatTime: formatTime,
    normalizeMusicSource: normalizeMusicSource,
    normalizeTrack: normalizeTrack,
    parseLyrics: parseLyrics,
    joinWordTexts: joinWordTexts,
    amllLinesToLegacyWordLines: amllLinesToLegacyWordLines,
    adaptAmllTtmlLines: adaptAmllTtmlLines,
    buildStFetchUrl: buildStFetchUrl,
    isProxyRangeProbeOk: isProxyRangeProbeOk,
    measureLoudnessDbfs: measureLoudnessDbfs,
    computeMatchGain: computeMatchGain,
    chooseTransitionEffect: chooseTransitionEffect,
    computeTransitionStartOffset: computeTransitionStartOffset,
    quantizeMixToBar: quantizeMixToBar,
    computeSkippableTailSilence: computeSkippableTailSilence,
    computeTransitionTriggerLead: computeTransitionTriggerLead,
    fftRadix2: fftRadix2,
    computeChroma: computeChroma,
    computeChromaVariation: stChromaVariation,
    computeHarmonyEvidence: stHarmonyEvidence,
    detectKey: detectKey,
    computeKeyCompat: computeKeyCompat,
    computeEnergyShape: computeEnergyShape,
    buildTransitionShape: buildTransitionShape,
    isCreditLine: isCreditLine,
    isArtistCreditLine: isArtistCreditLine,
    spatial3dDelaySeconds: spatial3dDelaySeconds,
    computeArtistMarquee: computeArtistMarquee
  };
});
