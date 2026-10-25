/* Harmonia AutoMix（Apple Music 风格智能过渡）
 *
 * 定位：**缓存的增值功能**。只有在「歌曲缓存开启 + 当前歌与下一首都已缓存 + 两侧分析结果可用」
 * 时才接管过渡；其余所有情况（缓存关闭、未缓存、网页版、分析失败、参数不达标）
 * 一律降级为现有 st* 过渡，行为零变化。
 *
 * 为什么要缓存：全曲分析需要完整音频文件。现有 st* 只能拉头尾各 ~640KB Range 片段算平均 BPM，
 * 无法得到拍点所在毫秒/重拍位置/乐句边界——而这三样正是 DJ 式过渡的核心。
 *
 * ⚠ 双源同步：Harmonia/js/automix.js 必须与本文件逐字节一致。
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.HarmoniaAutomix = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var ANALYSIS_VERSION_EXPECTED = 1;

  /* ── 可调常量 ─────────────────────────────────────────────────── */
  var BPM_CONF_MIN = 0.6;           // 分析置信度下限
  /* APPLE_MUSIC_STYLE：BPM 差距上限
     为什么从 6% 提到 13%（实测依据）：
       Apple Music 对 Cruel Summer(84.7 BPM) → Shape of You(95.7 BPM) 的处理是
       **把出歌加速约 13%** 对齐进歌，再叠加低通模糊。
       6% 的阈值会把这种真实场景直接拒绝（真机日志：bpm-delta-too-large:0.115），
       导致用户开了 AutoMix 却永远听不到效果。
       signalsmith 官方称 0.75–1.5× 都在音质安全区，13% 远未到极限。 */
  var MAX_RATE_DELTA = 0.13;
  var MIN_MIX_SEC = 2.0;            // 最少可混音时长
  var TRANSITION_LEAD_SEC = 0.8;    // 提前触发量（覆盖调度抖动）

  function num(v, d) { var n = Number(v); return isFinite(n) ? n : d; }

  /* 分析结果是否可用于 AutoMix。
     注意：**不**要求 downbeatReliable——重拍不可靠时降级为 beat 对齐模式（仍可用），
     这是实测后确认的设计（四踩 EDM 重拍本质不可辨，但仍能做小节/乐句对齐混音）。 */
  function isAnalysisUsable(a) {
    if (!a || typeof a !== 'object') return false;
    if (num(a.version, 0) !== ANALYSIS_VERSION_EXPECTED) return false;
    if (!(num(a.bpm, 0) > 0)) return false;
    if (num(a.bpmConfidence, 0) < BPM_CONF_MIN) return false;
    if (!(num(a.durationSec, 0) >= MIN_MIX_SEC)) return false;
    return true;
  }

  /* ── 核心决策：能否用 AutoMix ──────────────────────────────────
     纯函数。任一判据不满足 → { use:false, reason }，调用方据此完全走现有逻辑。
     reason 必须可读，排障时能直接看出降级原因。 */
  function decideAutomix(input) {
    var s = input || {};
    if (!s.cacheEnabled) return { use: false, reason: 'cache-disabled', rate: 1 };
    if (!s.curCached) return { use: false, reason: 'current-not-cached', rate: 1 };
    if (!s.nextCached) return { use: false, reason: 'next-not-cached', rate: 1 };
    if (s.userPlaybackRate !== undefined && s.userPlaybackRate !== null
        && Math.abs(num(s.userPlaybackRate, 1) - 1) > 1e-6) {
      return { use: false, reason: 'user-changed-playback-rate', rate: 1 };
    }
    if (!isAnalysisUsable(s.analysisCur)) return { use: false, reason: 'current-analysis-unusable', rate: 1 };
    if (!isAnalysisUsable(s.analysisNext)) return { use: false, reason: 'next-analysis-unusable', rate: 1 };

    var bpmCur = num(s.analysisCur.bpm, 0);
    var bpmNext = num(s.analysisNext.bpm, 0);
    if (!(bpmCur > 0) || !(bpmNext > 0)) return { use: false, reason: 'invalid-bpm', rate: 1 };

    /* ═══ APPLE_MUSIC_STYLE：变速出歌 A，而不是进歌 B ═══
       为什么变速 A：
         Apple Music 的实际听感是「Cruel Summer 结尾加速推进 → 模糊 → Shape of You 原速进来」。
         即：**出歌加速去追进歌**，进歌保持原速（不变调更自然）。
       计算：rateA = bpmNext / bpmCur
         例 cur=84.7, next=95.7 → rateA = 1.13（A 加速 13%）

       ═══ 八度折叠（支持 2 倍/半倍关系）═══
       84.7 与 169.4 是同一节奏的慢/快写法，对拍没问题，但直接算会得 0.5 → 判降级。
       实际 DJ 场景里「半速/倍速」很常见（BPM 检测也常有倍频歧义）。
       做法：把比值折叠到一个八度内 [0.75, 1.5)，只有折叠后确实接近 1 才采用。 */
    var ratioRaw = bpmCur > 0 ? (bpmNext / bpmCur) : 1;
    var octaveShift = 0;
    var r = ratioRaw;
    if (r > 0) {
      while (r < 0.75) { r *= 2; octaveShift--; }
      while (r >= 1.5) { r /= 2; octaveShift++; }
    }
    var useFolded = Math.abs(r - 1) <= MAX_RATE_DELTA;
    var rate = useFolded ? r : ratioRaw;
    var delta = Math.abs(rate - 1);
    if (delta > MAX_RATE_DELTA) {
      return {
        use: false,
        reason: 'bpm-delta-too-large:' + delta.toFixed(4)
          + (octaveShift !== 0 ? '(octave-folded,raw=' + ratioRaw.toFixed(4) + ')' : ''),
        rate: rate
      };
    }

    /* 对齐模式：重拍可靠 → downbeat；否则 → beat（任意相位，仍能做小节级混音）。
       两者都正常参与 AutoMix，不是降级。 */
    var mode = (s.analysisCur.downbeatReliable && s.analysisNext.downbeatReliable)
      ? 'downbeat' : 'beat';
    /* rate 语义：**出歌 A 的播放速率**（A 加速到 rate 后与 B 同拍）
       tempoTarget='A' 表示变速出歌（Apple Music 风格） */
    return { use: true, reason: 'ok', rate: rate, alignmentMode: mode, tempoTarget: 'A' };
  }

  /* ── 乐句边界调度 ─────────────────────────────────────────────
     等乐句边界切入（而非播到某秒就切）是 DJ 感的关键。
     纯算术，可在 timeupdate（4Hz）里高频调用。 */
  function phraseLenSec(analysis) {
    if (!analysis || !(num(analysis.bpm, 0) > 0)) return 0;
    var barSec = (60 / analysis.bpm) * num(analysis.beatsPerBar, 4);
    return barSec * num(analysis.phraseBars, 4);
  }
  function nextBoundaryForTransition(analysis, currentTimeSec) {
    var len = phraseLenSec(analysis);
    if (!(len > 0)) return null;
    var first = num(analysis.firstDownbeatSec, 0);
    var t = num(currentTimeSec, 0);
    if (t <= first) return first;
    var k = Math.ceil((t - first) / len - 1e-9);
    var b = first + k * len;
    if (num(analysis.durationSec, 0) > 0 && b > analysis.durationSec) return null;
    return b;
  }
  /* 距离下一个乐句边界还有多少秒；无边界返回 Infinity */
  function secToNextBoundary(analysis, currentTimeSec) {
    var b = nextBoundaryForTransition(analysis, currentTimeSec);
    if (b === null) return Infinity;
    return b - num(currentTimeSec, 0);
  }

  /* ── 变速服务（signalsmith-stretch）──────────────────────────────
     为什么必须保音高：Apple Music AutoMix 的核心是 time-stretching + beat-matching。
     直接改 playbackRate 会变调（"花栗鼠效应"），DJ 混音绝不允许。
     实测：1.06× 变速输入 20.0s → 输出 21.2s（精确），耗时 647ms = 30.9× 实时。

     为什么预变速而不是切歌时算：一首 4 分钟歌约需 8s，
     切歌那一刻再算必然来不及，会变成明显卡顿。

     依赖：js/vendor/signalsmith-stretch-js/browser/index.js（由 prepare.mjs 复制进产物）。
     CSP 前提：main.html 的 script-src 已含 'wasm-unsafe-eval'（否则 WASM 编译被拒）。 */

  var _stretchMod = null;
  var _stretchModPromise = null;
  var _prepared = {};          // key: songId + '|' + rate → { buffer, at }
  var MAX_PREPARED = 2;        // 最多留 2 首预变速结果（单首 4 分钟 stereo ≈ 84MB，必须限制）

  function stretchModuleUrl() {
    return 'js/vendor/signalsmith-stretch-js/browser/index.js';
  }

  function loadStretchModule(baseUrl) {
    if (_stretchMod) return Promise.resolve(_stretchMod);
    if (_stretchModPromise) return _stretchModPromise;
    var url = baseUrl || stretchModuleUrl();
    var absUrl;
    try {
      absUrl = new URL(url, (typeof location !== 'undefined' ? location.href : 'https://localhost/')).href;
    } catch (_) { absUrl = url; }
    _stretchModPromise = import(absUrl).then(function (m) {
      _stretchMod = m;
      return m;
    }).catch(function (e) {
      _stretchModPromise = null;
      throw e;
    });
    return _stretchModPromise;
  }

  /* 变速一个 AudioBuffer。rate = 输出时长/输入时长（1.06 → 变慢）。
     返回新 AudioBuffer（不修改入参）。 */
  function stretchBuffer(audioCtx, audioBuffer, rate, baseUrl) {
    if (!(rate > 0)) return Promise.reject(new Error('invalid-rate'));
    if (Math.abs(rate - 1) < 1e-6) return Promise.resolve(audioBuffer);
    return loadStretchModule(baseUrl).then(function (mod) {
      if (!mod || typeof mod.processAudioBuffer !== 'function') {
        throw new Error('signalsmith processAudioBuffer 不可用');
      }
      return mod.processAudioBuffer(audioCtx, audioBuffer, {
        timeRatio: rate,          // 输出/输入时长比
        pitchSemitones: 0,        // 保音高
        quality: 'high',
        advanced: { formantCompensation: true }
      });
    });
  }

  /* 预变速"下一首"，结果按 songId+rate 缓存。重复调用不重复计算。 */
  function prepareNext(audioCtx, songId, audioBuffer, rate, baseUrl) {
    if (!songId || !audioBuffer || !(rate > 0)) return Promise.resolve(null);
    var key = songId + '|' + Number(rate).toFixed(4);
    if (_prepared[key]) return Promise.resolve(_prepared[key].buffer);
    return stretchBuffer(audioCtx, audioBuffer, rate, baseUrl).then(function (out) {
      var keys = Object.keys(_prepared);
      if (keys.length >= MAX_PREPARED) {
        keys.sort(function (a, b) { return (_prepared[a].at || 0) - (_prepared[b].at || 0); });
        delete _prepared[keys[0]];
      }
      _prepared[key] = { buffer: out, at: Date.now() };
      return out;
    });
  }

  function getPrepared(songId, rate) {
    var key = songId + '|' + Number(rate).toFixed(4);
    return _prepared[key] ? _prepared[key].buffer : null;
  }
  function clearPrepared() { _prepared = {}; }

  /* ── 执行层：DJ 式三段混音 ───────────────────────────────────────
     设计原则：**本文件不直接操作 <audio> 或混音台**，一切音频副作用通过 ctx.hooks 注入。
     理由：
       1) 保持本文件可在 Node 里单测（无 DOM/无 AudioContext）
       2) 避免与现有 st* 引擎直接争用 audioPlayerB / stMixAGain ——宿主（main.js）是
          唯一知道当前哪套引擎在用的地方，由它决定如何驱动

     三段式时间线（参考 DJ 混音实践：低频互斥 + 贝斯在拍上切换 + HPF 扫频）：
       阶段 1（0-25%）  A 全频；B 用 HPF 只出中高频 + 音量淡入
       阶段 2（25-50%） A HPF 下移去掉低频；B HPF 打开低频进入（**落点在重拍**）
       阶段 3（50-100%）A 继续收紧至消失；B 全频到 1

     混音窗口默认按一个乐句长度，夹在 MIN_MIX_SEC-16s。 */

  var _run = null;   // { active, startAt, windowSec, rate, analysis*, phase, hooks }

  function isActive() { return !!(_run && _run.active); }
  function clampNum(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  /* 由 main.js 每次 timeupdate 调用。只做算术；真正启动时才调用 hooks。 */
  function tick(ctx) {
    try {
      if (!ctx || !ctx.analysisCur || !ctx.analysisNext) return;
      if (isActive()) {
        /* 已在混音中：推进包络 */
        var elapsed = (ctx.currentTime || 0) - _run.startAt;
        if (elapsed < 0) return;
        var p = _run.windowSec > 0 ? elapsed / _run.windowSec : 1;
        applyEnvelope(p);
        if (p >= 1) finish();
        return;
      }
      var cur = ctx.currentTime || 0;
      var toBoundary = secToNextBoundary(ctx.analysisCur, cur);
      if (!isFinite(toBoundary)) return;
      /* 提前 TRANSITION_LEAD_SEC 启动，保证边界那一拍已经进入混音 */
      if (toBoundary > TRANSITION_LEAD_SEC) return;
      startTransition(ctx, cur + toBoundary);
    } catch (_) { /* 任何异常都不能冒泡到 main.js 的 timeupdate */ }
  }

  function startTransition(ctx, boundaryAbsSec) {
    if (isActive()) return;
    var winSec = clampNum(phraseLenSec(ctx.analysisCur), MIN_MIX_SEC, 16);
    _run = {
      active: true,
      startAt: Math.max(0, boundaryAbsSec - 0.05),
      windowSec: winSec,
      rate: ctx.rate,
      alignmentMode: ctx.alignmentMode || 'beat',
      analysisCur: ctx.analysisCur,
      analysisNext: ctx.analysisNext,
      nextSong: ctx.nextSong || null,
      tempoTarget: ctx.tempoTarget || 'A',
      phase: 0,
      aborted: false,
      hooks: ctx.hooks || null
    };
    try {
      if (_run.hooks && typeof _run.hooks.begin === 'function') _run.hooks.begin(_run);
    } catch (_) { abort(); }
  }

  /* 包络推进。p ∈ [0,1]。宿主据 phase 与 progress 驱动音量/EQ。 */
  function applyEnvelope(progress) {
    if (!_run || !_run.active) return;
    var p = clampNum(progress, 0, 1);
    _run.phase = p;
    /* 三段划分点（可调） */
    var PHASE2_START = 0.25;
    var PHASE3_START = 0.50;
    var stage = p < PHASE2_START ? 1 : (p < PHASE3_START ? 2 : 3);
    var stageProgress = stage === 1 ? p / PHASE2_START
      : stage === 2 ? (p - PHASE2_START) / (PHASE3_START - PHASE2_START)
        : (p - PHASE3_START) / (1 - PHASE3_START);
    if (_run.hooks && typeof _run.hooks.envelope === 'function') {
      try { _run.hooks.envelope(p, stage, stageProgress, _run); } catch (_) {}
    }
  }

  function finish() {
    if (!_run) return;
    var r = _run;
    _run = null;
    try { if (r.hooks && typeof r.hooks.end === 'function') r.hooks.end(r); } catch (_) {}
  }
  function abort() {
    if (!_run) return;
    var r = _run;
    r.aborted = true;
    _run = null;
    try { if (r.hooks && typeof r.hooks.abort === 'function') r.hooks.abort(r); } catch (_) {}
  }

  return {
    // 常量
    BPM_CONF_MIN: BPM_CONF_MIN,
    MAX_RATE_DELTA: MAX_RATE_DELTA,
    MIN_MIX_SEC: MIN_MIX_SEC,
    TRANSITION_LEAD_SEC: TRANSITION_LEAD_SEC,
    ANALYSIS_VERSION_EXPECTED: ANALYSIS_VERSION_EXPECTED,
    // 决策
    isAnalysisUsable: isAnalysisUsable,
    decideAutomix: decideAutomix,
    // 变速服务
    stretchModuleUrl: stretchModuleUrl,
    loadStretchModule: loadStretchModule,
    stretchBuffer: stretchBuffer,
    prepareNext: prepareNext,
    getPrepared: getPrepared,
    clearPrepared: clearPrepared,
    // 执行层
    tick: tick,
    isActive: isActive,
    startTransition: startTransition,
    applyEnvelope: applyEnvelope,
    finish: finish,
    abort: abort,
    // 调度
    phraseLenSec: phraseLenSec,
    nextBoundaryForTransition: nextBoundaryForTransition,
    secToNextBoundary: secToNextBoundary
  };
});
