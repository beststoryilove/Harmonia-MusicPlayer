/* Harmonia AutoMix 分析算法（纯函数层）
 *
 * 用途：从**本地缓存的完整音频**算出节拍网格（BPM / 拍相位 / 重拍 / 乐句边界），
 * 供 automix.js 做 DJ 式过渡。这是 AutoMix 区别于普通交叉淡化的根本。
 *
 * 为什么能比现有 st* 更准：现有实现只能拉头尾各 ~640KB 的 Range 片段（ST_INTRO_BYTES），
 * 只有几秒音频算平均 BPM，无法得到拍点所在的具体毫秒。缓存给了完整文件。
 *
 * ⚠ 本文件必须是纯函数：无 DOM、无 window、无文件 IO、无网络。
 *   - 浏览器：<script src> 后暴露 window.HarmoniaAutomixAnalysis
 *   - Node 测试：require() 得到同一对象
 * ⚠ 双源同步：Harmonia/js/automix-analysis.js 必须与本文件逐字节一致。
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.HarmoniaAutomixAnalysis = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSION = 1;
  var ANALYSIS_VERSION = 1;

  /* ── 可调常量（集中在此，便于按真实歌曲调参）─────────────────── */
  var FRAME_SIZE = 1024;        // FFT 帧长（22050Hz 下约 46ms）
  var HOP_SIZE = 256;           // 帧移（约 11.6ms，足够细的 onset 分辨率）
  var BPM_MIN = 60;
  var BPM_MAX = 200;
  var BPM_CONF_MIN_FOR_USE = 0.6;
  var DOWNBEAT_CONF_MIN = 0.55;
  /* 重拍可靠度的 SNR 阈值：SNR = 相位间标准差 / 相位内标准差。
     实测标定（见 detectDownbeat 注释）：
       四踩 EDM 完全相等 → SNR ≈ 0.19（不可靠）
       第 1 拍明显更重   → SNR ≈ 1.94（可靠）
     取 0.6 位于两者之间，留足余量。 */
  var DOWNBEAT_SNR_MIN = 0.6;
  var PHRASE_OPTIONS = [8, 16, 4];
  var KICK_BAND_HZ_LOW = 30;
  var KICK_BAND_HZ_HIGH = 120;

  /* ── 内部 FFT（radix-2，原地）────────────────────────────────────
     不依赖 pure.js：automix-analysis.js 要能独立 require 与独立测试，
     与 pure.js 解耦可避免双源耦合带来的连锁改动风险。 */
  function fftInPlace(re, im) {
    var n = re.length;
    if (!n || (n & (n - 1)) !== 0) return false;
    if (!im || im.length !== n) return false;
    for (var i = 1, j = 0; i < n; i++) {
      var bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        var tr = re[i]; re[i] = re[j]; re[j] = tr;
        var ti = im[i]; im[i] = im[j]; im[j] = ti;
      }
    }
    for (var len = 2; len <= n; len <<= 1) {
      var ang = -2 * Math.PI / len;
      var wr = Math.cos(ang), wi = Math.sin(ang);
      for (var s = 0; s < n; s += len) {
        var cr = 1, ci = 0;
        for (var k = 0; k < len / 2; k++) {
          var ur = re[s + k], ui = im[s + k];
          var vr = re[s + k + len / 2] * cr - im[s + k + len / 2] * ci;
          var vi = re[s + k + len / 2] * ci + im[s + k + len / 2] * cr;
          re[s + k] = ur + vr; im[s + k] = ui + vi;
          re[s + k + len / 2] = ur - vr; im[s + k + len / 2] = ui - vi;
          var ncr = cr * wr - ci * wi;
          ci = cr * wi + ci * wr;
          cr = ncr;
        }
      }
    }
    return true;
  }

  /* ── ① onset 强度包络（spectral flux）+ 低频带能量（一次 FFT 同时产出）──
     谱通量 = 当前帧幅度谱相对上一帧的正向增量之和（onset 检测标准做法）。
     低频带能量 = ≤150Hz 幅度谱求和（重拍检测用，见 detectDownbeat）。

     **性能关键**：这两个特征共用同一次 STFT。早期版本它们各做一遍全曲 FFT，
     实测 120s 音频因此多花 1.6s（总计 2.9s）；合并后降到约 1.2s。 */
  function buildOnsetEnvelope(samples, sampleRate) {
    var n = samples.length;
    var frameRate = sampleRate / HOP_SIZE;
    var frames = Math.max(0, Math.floor((n - FRAME_SIZE) / HOP_SIZE) + 1);
    var flux = new Float32Array(Math.max(1, frames));
    var lowBand = new Float32Array(Math.max(1, frames));
    var re = new Float32Array(FRAME_SIZE);
    var im = new Float32Array(FRAME_SIZE);
    var prevMag = new Float32Array(FRAME_SIZE / 2);
    var lowBinLimit = Math.max(1, Math.floor(150 * FRAME_SIZE / sampleRate));

    for (var f = 0; f < frames; f++) {
      var off = f * HOP_SIZE;
      for (var i = 0; i < FRAME_SIZE; i++) {
        // Hann 窗
        var w = 0.5 * (1 - Math.cos(2 * Math.PI * i / (FRAME_SIZE - 1)));
        re[i] = (off + i < n) ? samples[off + i] * w : 0;
        im[i] = 0;
      }
      fftInPlace(re, im);
      var sum = 0;
      var lowSum = 0;
      for (var k = 1; k < FRAME_SIZE / 2; k++) {
        var mag = Math.sqrt(re[k] * re[k] + im[k] * im[k]);
        var d = mag - prevMag[k];
        if (d > 0) sum += d;
        prevMag[k] = mag;
        if (k <= lowBinLimit) lowSum += mag;
      }
      flux[f] = sum;
      lowBand[f] = lowSum;
    }

    // 谱通量归一化到 0-1（用 95 分位避免单个尖峰把整体压平）
    var sorted = Array.prototype.slice.call(flux).sort(function (a, b) { return a - b; });
    var p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
    if (p95 > 0) {
      for (var j = 0; j < flux.length; j++) flux[j] = Math.min(1, flux[j] / p95);
    }
    // 低频带同样归一化（供重拍检测做相对比较）
    var lowMax = 0;
    for (var lm = 0; lm < lowBand.length; lm++) if (lowBand[lm] > lowMax) lowMax = lowBand[lm];
    if (lowMax > 0) {
      for (var ln = 0; ln < lowBand.length; ln++) lowBand[ln] /= lowMax;
    }

    return {
      flux: flux,
      hopSize: HOP_SIZE,
      frameRate: frameRate,
      lowBand: lowBand,
      lowBandHop: HOP_SIZE,
      lowBandSampleRate: sampleRate
    };
  }

  /* ── ② BPM：包络自相关 + 倍频归一化 ─────────────────────────────
     实现要点（都来自真实音乐实测踩坑）：
      1) **lag 下限必须够大**：谱通量包络在 lag=3~10（对应 500+ BPM）处自相关极强，
         那是包络自身的高频自相似（帧间平滑），不是节拍。实测若不限制，
         会稳定选中 lag=3 这种伪峰。故 lag 下限直接对应 BPM_MAX。
      2) **倍频归一化**：真实 90 BPM 的歌在 180 BPM 的 lag 上同样强（半拍也是拍），
         反之 128 BPM 的歌在 64 也在。必须把候选折叠到人耳偏好区间（90-180），
         而不是简单地"取最大峰"。
      3) **置信度要可比**：用「最优峰的归一化自相关值」本身衡量周期性，
         而不是最优/次优差（次优常是同一峰的邻点，差值恒小 → 置信度恒低）。 */
  function detectBpm(envelope, opts) {
    var o = opts || {};
    var flux = envelope && envelope.flux;
    var rate = envelope && envelope.frameRate;
    if (!flux || !flux.length || !(rate > 0)) return { bpm: 0, confidence: 0 };

    // lag 范围：只覆盖 60-200 BPM，且强制 ≥ 对应 BPM_MAX 的 lag（排除帧间自相似的伪峰）
    var minLag = Math.max(8, Math.ceil(rate * 60 / BPM_MAX));
    var maxLag = Math.min(flux.length - 2, Math.floor(rate * 60 / BPM_MIN));
    if (maxLag <= minLag + 2) return { bpm: 0, confidence: 0 };

    // 去均值
    var mean = 0;
    for (var i = 0; i < flux.length; i++) mean += flux[i];
    mean /= flux.length;
    var x = new Float32Array(flux.length);
    for (var a = 0; a < flux.length; a++) x[a] = flux[a] - mean;

    // 自相关（归一化：除以能量，使不同曲目可比）
    var energy = 0;
    for (var e = 0; e < x.length; e++) energy += x[e] * x[e];
    if (!(energy > 0)) return { bpm: 0, confidence: 0 };

    var ac = new Float32Array(maxLag + 2);
    for (var lag = minLag; lag <= maxLag; lag++) {
      var s = 0;
      for (var t = 0; t + lag < x.length; t++) s += x[t] * x[t + lag];
      ac[lag] = s / energy;
    }

    // 找局部峰（lag 与其左右邻居比）
    var peaks = [];
    for (var l = minLag + 1; l < maxLag; l++) {
      if (ac[l] > ac[l - 1] && ac[l] >= ac[l + 1] && ac[l] > 0) {
        peaks.push({ lag: l, val: ac[l], bpm: 60 * rate / l });
      }
    }
    if (!peaks.length) return { bpm: 0, confidence: 0 };
    peaks.sort(function (p, q) { return q.val - p.val; });

    /* 倍频归一化：把每个候选折叠到 [BPM_FOLD_MIN, BPM_FOLD_MAX) 区间。
       例如 178 → 89（折半，因为 178/2=89 在偏好区间）；
            89  → 89（不变）；
            64  → 128（折半后 64? 不，64 已在区间下限外 → 乘 2 = 128）。
       折叠后同一「感知速度」的多个候选合并，取该折叠值下最强的峰。 */
    var FOLD_MIN = 70, FOLD_MAX = 175;
    function foldBpm(b) {
      var v = b;
      while (v > 0 && v < FOLD_MIN) v *= 2;
      while (v >= FOLD_MAX) v /= 2;
      return v;
    }

    var folded = {};   // 折叠后 BPM（保留 1 位）→ 最强峰
    for (var pi = 0; pi < peaks.length; pi++) {
      var fb = foldBpm(peaks[pi].bpm);
      var key = Math.round(fb * 10) / 10;
      if (!folded[key] || peaks[pi].val > folded[key].val) {
        folded[key] = { bpm: key, val: peaks[pi].val, rawLag: peaks[pi].lag, rawBpm: peaks[pi].bpm };
      }
    }

    var bestKey = null, bestVal = -1;
    for (var k in folded) {
      if (!Object.prototype.hasOwnProperty.call(folded, k)) continue;
      if (folded[k].val > bestVal) { bestVal = folded[k].val; bestKey = k; }
    }
    if (bestKey === null) return { bpm: 0, confidence: 0 };

    var chosen = folded[bestKey];

    /* 置信度：用归一化自相关值衡量周期性强度。
       实测真实电子乐在正确 BPM 处 ac ≈ 0.05-0.20；噪声/静音 << 0.02。
       映射：0.02 → 0；0.12 → 1.0（线性夹取）。 */
    var conf = (chosen.val - 0.02) / 0.10;
    conf = Math.max(0, Math.min(1, conf));

    return { bpm: Math.round(chosen.bpm * 10) / 10, confidence: conf };
  }

  // 低频能量包络（供 detectBeatPhase / detectDownbeat / fitPhraseGrid 共用）
  // 一阶低通到 KICK_BAND_HZ_HIGH 以下，按 1ms 分辨率取每毫秒峰值。
  function buildLowEnergyEnvelope(samples, sampleRate) {
    var msRate = 1000;
    var n = samples.length;
    var envLen = Math.max(1, Math.floor(n / sampleRate * msRate));
    var data = new Float32Array(envLen);
    var dt = 1 / sampleRate;
    var rc = 1 / (2 * Math.PI * KICK_BAND_HZ_HIGH);
    var alpha = dt / (rc + dt);
    var lp = 0;
    for (var i = 0; i < n; i++) {
      lp = lp + alpha * (samples[i] - lp);
      var idx = Math.floor(i / sampleRate * msRate);
      if (idx < envLen) {
        var v = lp * lp;
        if (v > data[idx]) data[idx] = v;
      }
    }
    return { data: data, msRate: msRate };
  }

  // 从低频包络取某个时刻起 winSec 窗口内的峰值
  function peakInWindow(lowEnv, tSec, winSec) {
    var start = Math.round(tSec * lowEnv.msRate);
    var len = Math.round(winSec * lowEnv.msRate);
    var mx = 0;
    for (var i = 0; i < len; i++) {
      var idx = start + i;
      if (idx >= 0 && idx < lowEnv.data.length && lowEnv.data[idx] > mx) mx = lowEnv.data[idx];
    }
    return mx;
  }

  /* ── ③ 拍相位：在 onset 包络上做网格对齐 ─────────────────────
     尝试过用低频（kick）能量定相位，实测有两个问题：
       1) 一阶低通有固定群延迟（约 70ms），造成系统性偏差；
       2) 各相位候选得分过于接近，置信度算法退化为 0（会导致永远降级）。
     改用 onset 包络（谱通量）本身：它由 FFT 帧直接算出，无滤波器延迟，
     且 kick 的起音在谱通量上是尖锐峰，区分度足够。

     做法：在 BPM 网格上滑动相位偏移，取"网格点处 onset 包络之和"最大的偏移。
     用抛物线插值把分辨率从帧级（11.6ms）细化到毫秒级。 */
  function detectBeatPhase(envelope, samples, sampleRate, bpm) {
    if (!(bpm > 0) || !envelope || !envelope.flux || !envelope.flux.length) {
      return { phaseSec: 0, confidence: 0 };
    }
    var flux = envelope.flux;
    var frameRate = envelope.frameRate;
    if (!(frameRate > 0)) return { phaseSec: 0, confidence: 0 };
    var beatSec = 60 / bpm;
    var totalSec = flux.length / frameRate;

    function fluxAt(tSec) {
      var fi = tSec * frameRate;
      var i0 = Math.floor(fi);
      if (i0 < 0 || i0 >= flux.length) return 0;
      var i1 = i0 + 1;
      if (i1 >= flux.length) return flux[i0];
      var f = fi - i0;
      return flux[i0] * (1 - f) + flux[i1] * f;
    }

    // 扫描相位偏移（0 到 beatSec），步长 2ms（比帧移更细，靠线性插值取值）
    var stepSec = 0.002;
    var steps = Math.max(1, Math.floor(beatSec / stepSec));
    var scores = new Float64Array(steps);
    for (var si = 0; si < steps; si++) {
      var phase = si * stepSec;
      var sum = 0, hits = 0;
      for (var t = phase; t < totalSec; t += beatSec) {
        sum += fluxAt(t);
        hits++;
      }
      scores[si] = hits > 0 ? sum / hits : 0;
    }

    // 找最优与次优（次优要求与最优相隔至少 1/4 拍，避免相邻采样点造成假区分）
    var bestIdx = 0, bestVal = -1;
    for (var i = 0; i < steps; i++) if (scores[i] > bestVal) { bestVal = scores[i]; bestIdx = i; }
    var guardSteps = Math.max(1, Math.floor((beatSec / 4) / stepSec));
    var secondVal = -1;
    for (var j = 0; j < steps; j++) {
      var dist = Math.abs(j - bestIdx);
      dist = Math.min(dist, steps - dist); // 环形距离
      if (dist >= guardSteps && scores[j] > secondVal) secondVal = scores[j];
    }

    // 抛物线插值细化峰值位置
    var refined = bestIdx;
    var prevIdx = (bestIdx - 1 + steps) % steps;
    var nextIdx = (bestIdx + 1) % steps;
    var yPrev = scores[prevIdx], yCur = scores[bestIdx], yNext = scores[nextIdx];
    var denom = (yPrev - 2 * yCur + yNext);
    if (Math.abs(denom) > 1e-12) {
      var delta = 0.5 * (yPrev - yNext) / denom;
      if (delta > -1 && delta < 1) refined = bestIdx + delta;
    }
    var phaseSec = refined * stepSec;
    // 归一到 [0, beatSec)
    while (phaseSec < 0) phaseSec += beatSec;
    while (phaseSec >= beatSec) phaseSec -= beatSec;

    // 置信度：最优相对次优的提升比例。真实节拍下最优应明显高于其他相位。
    var conf = 0;
    if (bestVal > 0) {
      if (secondVal <= 0) conf = 1;
      else {
        var rel = (bestVal - secondVal) / bestVal;
        conf = Math.max(0, Math.min(1, rel * 6)); // 实测 rel 约 0.1-0.3 → 0.6-1.0
      }
    }
    return { phaseSec: phaseSec, confidence: conf };
  }

  /* ── ④ 重拍：低频带能量 + 相位枚举 + SNR 可靠度判据 ──────────────
     ⚠ 实测背景（真实 EDM 数据集，必须先读）：
       纯电子乐多为「四踩」（每拍都有 kick），**4 拍的低频能量几乎相等**
       （实测 4 拍均值 362.9/388.5/382.8/377.5，相对领先仅 3.8%）。
       这意味着重拍在低频维度上**本质不可辨**——不是算法缺陷，
       连专业 DJ 软件（Rekordbox/Traktor）也需要人工纠正重拍。

     **可靠度判据（关键设计，解决了假阳性）**：
       不能用「最佳相位相对其他相位的能量差」——整体渐强/起音截断会让
       完全相等的 4 拍也产生虚假差异（实测曾给出 conf=1 的假阳性）。
       改用 **SNR = 相位间标准差 / 相位内标准差**：
         - 四拍完全相等：SNR ≈ 0.19（相位间差异远小于相位内波动）→ 不可靠
         - 第 1 拍明显更重：SNR ≈ 1.94 → 可靠
       阈值 DOWNBEAT_SNR_MIN = 0.6，实测两类样本分离度良好。

     两种对齐模式（调用方据此选择，都能做 DJ 式过渡）：
       - reliable=true  → downbeat 模式：从真重拍对齐（最佳听感）
       - reliable=false → beat 模式：从任意相位按 4 拍分组（可能错开 1-2 拍，仍远好于不对齐） */
  function detectDownbeat(samples, sampleRate, bpm, phaseSec, beatsPerBar, envelope) {
    var bpb = beatsPerBar || 4;
    if (!(bpm > 0) || !samples || !samples.length) {
      return { downbeatOffsetBeats: 0, confidence: 0, reliable: false, scores: [], snr: 0 };
    }
    var beatSec = 60 / bpm;
    var durationSec = samples.length / sampleRate;

    /* 复用 buildOnsetEnvelope 已算好的低频带能量（性能关键：
       早期版本这里重做一遍全曲 FFT，实测让 120s 音频多花 1.6s）。
       若调用方没传 envelope（独立调用场景）才回退到自算。 */
    var lowBand;
    if (envelope && envelope.lowBand && envelope.lowBand.length) {
      lowBand = {
        data: envelope.lowBand,
        hop: envelope.lowBandHop || HOP_SIZE,
        sampleRate: envelope.lowBandSampleRate || sampleRate
      };
    } else {
      lowBand = buildLowBandStft(samples, sampleRate);
    }
    if (!lowBand || !lowBand.data.length) {
      return { downbeatOffsetBeats: 0, confidence: 0, reliable: false, scores: [], snr: 0 };
    }

    // 节拍时刻序列与每个拍点的低频能量
    var perBeat = [];
    for (var t = phaseSec; t < durationSec; t += beatSec) {
      perBeat.push(lowBandEnergyAt(lowBand, t));
    }
    if (perBeat.length < bpb * 2) {
      return { downbeatOffsetBeats: 0, confidence: 0, reliable: false, scores: [], snr: 0 };
    }

    // 按相位分组，计算各组均值
    var groups = [];
    for (var p = 0; p < bpb; p++) {
      var g = [];
      for (var i = p; i < perBeat.length; i += bpb) g.push(perBeat[i]);
      groups.push(g);
    }
    var means = groups.map(function (arr) {
      if (!arr.length) return 0;
      var s = 0;
      for (var k = 0; k < arr.length; k++) s += arr[k];
      return s / arr.length;
    });

    // 相位内标准差（噪声水平）
    var withinVarSum = 0, withinCnt = 0;
    for (var gi = 0; gi < groups.length; gi++) {
      var m = means[gi];
      for (var gj = 0; gj < groups[gi].length; gj++) {
        var d = groups[gi][gj] - m;
        withinVarSum += d * d;
        withinCnt++;
      }
    }
    var withinStd = withinCnt > 0 ? Math.sqrt(withinVarSum / withinCnt) : 0;

    // 相位间标准差（信号水平）
    var grandMean = 0;
    for (var mi = 0; mi < means.length; mi++) grandMean += means[mi];
    grandMean /= means.length;
    var betweenVarSum = 0;
    for (var mj = 0; mj < means.length; mj++) {
      var dd = means[mj] - grandMean;
      betweenVarSum += dd * dd;
    }
    var betweenStd = Math.sqrt(betweenVarSum / means.length);

    // SNR：相位间差异相对相位内波动
    var snr = withinStd > 0 ? betweenStd / withinStd : (betweenStd > 0 ? 99 : 0);

    // 最佳相位（均值最大的组）
    var bestPhase = 0, bestMean = -Infinity;
    for (var bp2 = 0; bp2 < means.length; bp2++) {
      if (means[bp2] > bestMean) { bestMean = means[bp2]; bestPhase = bp2; }
    }

    // 置信度：基于 SNR 映射到 0-1（SNR 0.3 → 0；SNR 1.5 → 1）
    var conf = Math.max(0, Math.min(1, (snr - 0.3) / 1.2));

    // 可靠度：SNR 达到阈值才认为重拍可判别
    var reliable = snr >= DOWNBEAT_SNR_MIN;

    var scores = means.map(function (mm) { return Math.round((mm - grandMean) * 1000) / 1000; });
    return {
      downbeatOffsetBeats: reliable ? bestPhase : 0,
      confidence: Math.round(conf * 1000) / 1000,
      reliable: reliable,
      snr: Math.round(snr * 1000) / 1000,
      scores: scores
    };
  }

  /* STFT 低频带能量：≤150Hz 的幅度谱求和，逐帧。
     用频域而不是时域低通：避免滤波器群延迟（实测时域低通造成 70ms 固定偏差）。 */
  function buildLowBandStft(samples, sampleRate) {
    var n = samples.length;
    var frames = Math.max(0, Math.floor((n - FRAME_SIZE) / HOP_SIZE) + 1);
    if (frames <= 0) return null;
    var data = new Float32Array(frames);
    var re = new Float32Array(FRAME_SIZE);
    var im = new Float32Array(FRAME_SIZE);
    var binLimit = Math.max(1, Math.floor(150 * FRAME_SIZE / sampleRate));

    for (var f = 0; f < frames; f++) {
      var off = f * HOP_SIZE;
      for (var i = 0; i < FRAME_SIZE; i++) {
        var w = 0.5 * (1 - Math.cos(2 * Math.PI * i / (FRAME_SIZE - 1)));
        re[i] = (off + i < n) ? samples[off + i] * w : 0;
        im[i] = 0;
      }
      fftInPlace(re, im);
      var sum = 0;
      for (var k = 1; k <= binLimit; k++) {
        sum += Math.sqrt(re[k] * re[k] + im[k] * im[k]);
      }
      data[f] = sum;
    }

    // 归一化（避免整体渐强影响相位判断——这是参考实现的关键做法）
    var mx = 0;
    for (var j = 0; j < data.length; j++) if (data[j] > mx) mx = data[j];
    if (mx > 0) for (var q = 0; q < data.length; q++) data[q] /= mx;

    return { data: data, hop: HOP_SIZE, sampleRate: sampleRate };
  }

  function lowBandEnergyAt(lowBand, tSec) {
    var i = Math.round(tSec * lowBand.sampleRate / lowBand.hop);
    var mx = 0;
    for (var d = -1; d <= 1; d++) {
      var idx = i + d;
      if (idx >= 0 && idx < lowBand.data.length && lowBand.data[idx] > mx) mx = lowBand.data[idx];
    }
    return mx;
  }

  /* 取某时刻起 winSec 窗口内的低频带峰值（供 fitPhraseGrid 用） */
  function lowBandWindowPeak(lowBand, tSec, winSec) {
    var start = Math.round(tSec * lowBand.sampleRate / lowBand.hop);
    var len = Math.max(1, Math.round(winSec * lowBand.sampleRate / lowBand.hop));
    var mx = 0;
    for (var i = 0; i < len; i++) {
      var idx = start + i;
      if (idx >= 0 && idx < lowBand.data.length && lowBand.data[idx] > mx) mx = lowBand.data[idx];
    }
    return mx;
  }

  /* ── ⑤ 乐句网格：8 / 16 / 4 小节中选最可信的 ──────────────────
     不做结构分段（那需要自相似矩阵，误差大耗时）。
     只在「已知 firstDownbeat + 每小节时长」的等距网格上，
     用「边界处低频能量相对段中点的比值」判断乐句长度假设哪个更成立。
     找不到明显优势 → 退回 4（仍能按小节对齐，只是更频繁）。

     性能：复用 envelope.lowBand（不再逐样本做时域低通，实测省约 1s/首）。 */
  function fitPhraseGrid(samples, sampleRate, bpm, firstDownbeatSec, envelope) {
    if (!(bpm > 0)) return { phraseBars: 4, confidence: 0 };
    var barSec = (60 / bpm) * 4;
    var durationSec = samples.length / sampleRate;

    var lowBand = null;
    if (envelope && envelope.lowBand && envelope.lowBand.length) {
      lowBand = {
        data: envelope.lowBand,
        hop: envelope.lowBandHop || HOP_SIZE,
        sampleRate: envelope.lowBandSampleRate || sampleRate
      };
    } else {
      lowBand = buildLowBandStft(samples, sampleRate);
    }
    if (!lowBand || !lowBand.data.length) return { phraseBars: 4, confidence: 0 };

    var best = { phraseBars: 4, confidence: 0, score: -1 };

    for (var oi = 0; oi < PHRASE_OPTIONS.length; oi++) {
      var bars = PHRASE_OPTIONS[oi];
      var phraseSec = barSec * bars;
      if (phraseSec > durationSec) continue;
      var boundary = [], mid = [];
      for (var t = firstDownbeatSec + phraseSec; t < durationSec; t += phraseSec) {
        boundary.push(lowBandWindowPeak(lowBand, t, 0.1));
        mid.push(lowBandWindowPeak(lowBand, t - phraseSec / 2, 0.1));
      }
      if (boundary.length < 2) continue;
      var mb = mean(boundary), mm = mean(mid);
      var score = mm > 0 ? mb / mm : 0;
      if (score > best.score) {
        best = { phraseBars: bars, confidence: Math.min(1, Math.max(0, (score - 1))), score: score };
      }
    }
    return { phraseBars: best.phraseBars, confidence: best.confidence };
  }

  function mean(arr) {
    if (!arr.length) return 0;
    var s = 0;
    for (var i = 0; i < arr.length; i++) s += arr[i];
    return s / arr.length;
  }

  /* ── 乐句边界查询（纯算术，播放时高频调用）───────────────────── */
  function phraseLengthSec(analysis) {
    if (!analysis || !(analysis.bpm > 0)) return 0;
    var barSec = (60 / analysis.bpm) * (analysis.beatsPerBar || 4);
    return barSec * (analysis.phraseBars || 4);
  }

  function nearestPhraseBoundary(analysis, timeSec) {
    var len = phraseLengthSec(analysis);
    if (!(len > 0)) return null;
    var first = analysis.firstDownbeatSec || 0;
    if (timeSec < first) return first;
    var k = Math.round((timeSec - first) / len);
    return first + k * len;
  }

  function phraseBoundaryAtOrAfter(analysis, timeSec) {
    var len = phraseLengthSec(analysis);
    if (!(len > 0)) return null;
    var first = analysis.firstDownbeatSec || 0;
    if (analysis.durationSec > 0 && timeSec > analysis.durationSec) return null;
    if (timeSec <= first) return first;
    var k = Math.ceil((timeSec - first) / len - 1e-9);
    var b = first + k * len;
    if (analysis.durationSec > 0 && b > analysis.durationSec) return null;
    return b;
  }

  /* ── 变速换算：B 的起播偏移 ───────────────────────────────────
     B 以 rate 倍速播放，其内部时刻 t 对应的墙钟时长是 t/rate。
     要让 B 的第一个重拍落在 targetAbsSec，则：
       起播墙钟时刻 = targetAbsSec - firstDownbeatSec/rate
     现有 stComputeBStartOffset 只 ±3%，近似忽略了 /rate；6% 不能忽略。 */
  function computeStartAtSec(analysisB, rate, targetAbsSec) {
    var r = (rate > 0) ? rate : 1;
    var fd = (analysisB && analysisB.firstDownbeatSec) || 0;
    return targetAbsSec - fd / r;
  }

  /* ── 全曲分析入口 ─────────────────────────────────────────────
     输入单声道 Float32Array（建议 ≤22050Hz 以省 CPU），输出可 JSON 序列化的对象。 */
  function analyzeTrack(monoSamples, sampleRate, opts) {
    var o = opts || {};
    var now = (typeof performance !== 'undefined' && performance.now) ? function () { return performance.now(); } : function () { return Date.now(); };
    var t0 = now();

    var envelope = buildOnsetEnvelope(monoSamples, sampleRate);
    var bpmRes = detectBpm(envelope, o);
    var bpm = bpmRes.bpm;
    var beatsPerBar = o.beatsPerBar || 4;
    var beatSec = bpm > 0 ? 60 / bpm : 0;

    var phaseSec = 0, phaseConf = 0;
    var downbeatOffset = 0, downbeatConf = 0, downbeatReliable = false;
    var phraseBars = 4, phraseConf = 0;
    var firstDownbeatSec = 0;
    var alignmentMode = 'none';

    if (bpm > 0) {
      var pr = detectBeatPhase(envelope, monoSamples, sampleRate, bpm);
      phaseSec = pr.phaseSec; phaseConf = pr.confidence;
      var dr = detectDownbeat(monoSamples, sampleRate, bpm, phaseSec, beatsPerBar, envelope);
      downbeatOffset = dr.downbeatOffsetBeats;
      downbeatConf = dr.confidence;
      downbeatReliable = !!dr.reliable;

      /* 两种对齐模式（关键设计）：
         - downbeat：重拍可靠时，从小节第 1 拍开始对齐（最佳 DJ 感）
         - beat：重拍不可靠时（四踩 EDM 常见），退化为从"任意相位"开始按 4 拍分组。
           听感上可能整体错开 1-2 拍，但仍能做出按小节/乐句对齐的过渡，
           远好于完全不对齐。此模式仍会正常参与 AutoMix，不降级。 */
      if (downbeatReliable) {
        alignmentMode = 'downbeat';
        firstDownbeatSec = phaseSec + downbeatOffset * beatSec;
      } else {
        alignmentMode = 'beat';
        // 退化：把相位作为组起点（相当于假定当前相位就是小节起点）
        firstDownbeatSec = phaseSec;
      }
      var barSec = beatSec * beatsPerBar;
      firstDownbeatSec = ((firstDownbeatSec % barSec) + barSec) % barSec;

      var fr = fitPhraseGrid(monoSamples, sampleRate, bpm, firstDownbeatSec, envelope);
      phraseBars = fr.phraseBars; phraseConf = fr.confidence;
    }

    var durationSec = monoSamples.length / sampleRate;
    var t1 = now();

    return {
      version: ANALYSIS_VERSION,
      bpm: bpm,
      bpmConfidence: bpmRes.confidence,
      beatPhaseSec: phaseSec,
      beatPhaseConfidence: phaseConf,
      downbeatOffsetBeats: downbeatOffset,
      downbeatConfidence: downbeatConf,
      downbeatReliable: downbeatReliable,
      alignmentMode: alignmentMode,
      beatsPerBar: beatsPerBar,
      phraseBars: phraseBars,
      phraseConfidence: phraseConf,
      firstDownbeatSec: Math.max(0, firstDownbeatSec),
      durationSec: durationSec,
      elapsedMs: Math.round(t1 - t0)
    };
  }

  return {
    VERSION: VERSION,
    // 常量导出，供 automix.js 与测试共用（避免魔法数字散落）
    BPM_CONF_MIN_FOR_USE: BPM_CONF_MIN_FOR_USE,
    DOWNBEAT_CONF_MIN: DOWNBEAT_CONF_MIN,
    FRAME_SIZE: FRAME_SIZE,
    HOP_SIZE: HOP_SIZE,
    // 主要 API
    buildOnsetEnvelope: buildOnsetEnvelope,
    detectBpm: detectBpm,
    detectBeatPhase: detectBeatPhase,
    detectDownbeat: detectDownbeat,
    fitPhraseGrid: fitPhraseGrid,
    phraseLengthSec: phraseLengthSec,
    nearestPhraseBoundary: nearestPhraseBoundary,
    phraseBoundaryAtOrAfter: phraseBoundaryAtOrAfter,
    computeStartAtSec: computeStartAtSec,
    analyzeTrack: analyzeTrack
  };
});
