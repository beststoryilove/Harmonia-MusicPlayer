/* Harmonia 纯函数库（H7）
 *
 * 用途：把不依赖 DOM/全局状态的纯函数集中于此，浏览器与 Node 双环境可用。
 * 浏览器：<script src="js/lib/pure.js"></script> 后全局暴露 window.HarmoniaLib；
 * Node：require('../../js/lib/pure.js') 得到 { escapeHtml, formatTime, normalizeMusicSource, normalizeTrack, parseLyrics, buildStFetchUrl, isProxyRangeProbeOk, measureLoudnessDbfs, computeMatchGain, chooseTransitionEffect, isCreditLine, isArtistCreditLine, spatial3dDelaySeconds, computeArtistMarquee }。
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
  // 尾部未分析成功/静音结尾(≥silenceCutSec) → volumeMix；淡出结尾 → 图可用时 bassSwap 否则 volumeMix；
  // 骤然结尾 → 有回声原料时 echoOut 否则 volumeMix。
  function chooseTransitionEffect(edges, tailBufOk, graphOk, silenceCutSec) {
    var cut = (typeof silenceCutSec === 'number' && isFinite(silenceCutSec)) ? silenceCutSec : 0.8;
    if (!edges || !edges.tailOk) return 'volumeMix';
    if ((edges.tailSilenceSec || 0) >= cut) return 'volumeMix';
    if (edges.tailFading) return graphOk ? 'bassSwap' : 'volumeMix';
    return tailBufOk ? 'echoOut' : 'volumeMix';
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

  return {
    escapeHtml: escapeHtml,
    formatTime: formatTime,
    normalizeMusicSource: normalizeMusicSource,
    normalizeTrack: normalizeTrack,
    parseLyrics: parseLyrics,
    buildStFetchUrl: buildStFetchUrl,
    isProxyRangeProbeOk: isProxyRangeProbeOk,
    measureLoudnessDbfs: measureLoudnessDbfs,
    computeMatchGain: computeMatchGain,
    chooseTransitionEffect: chooseTransitionEffect,
    isCreditLine: isCreditLine,
    isArtistCreditLine: isArtistCreditLine,
    spatial3dDelaySeconds: spatial3dDelaySeconds,
    computeArtistMarquee: computeArtistMarquee
  };
});
