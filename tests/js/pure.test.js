/* Harmonia 纯函数单元测试（H7）
 *
 * 运行：cd Harmonia && npm run test:js
 * 依赖：Harmonia/js/lib/pure.js（双环境导出，Node 侧用 require 加载）
 */
const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { escapeHtml, formatTime, normalizeTrack, normalizeMusicSource, parseLyrics } = require('../../js/lib/pure.js');
const { spatial3dDelaySeconds, isCreditLine, isArtistCreditLine, computeArtistMarquee } = require('../../js/lib/pure.js');

// ── escapeHtml ──────────────────────────────────────────────
describe('escapeHtml', () => {
  it('转义 & < > " \'', () => {
    assert.equal(escapeHtml('&'), '&amp;');
    assert.equal(escapeHtml('<'), '&lt;');
    assert.equal(escapeHtml('>'), '&gt;');
    assert.equal(escapeHtml('"'), '&quot;');
    assert.equal(escapeHtml("'"), '&#39;');
  });
  it('全部转义', () => {
    assert.equal(escapeHtml('<script>alert("xss")</script>'),
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });
  it('空字符串', () => {
    assert.equal(escapeHtml(''), '');
  });
  it('undefined/null', () => {
    assert.equal(escapeHtml(undefined), '');
    assert.equal(escapeHtml(null), '');
  });
  it('已有实体不重复转义', () => {
    assert.equal(escapeHtml('&amp;'), '&amp;amp;'); // 按约定转义 & 为 &amp;（已有实体字面保留）
  });
  it('数字', () => { assert.equal(escapeHtml(42), '42'); });
  it('0（falsy 数字 → 空串）', () => { assert.equal(escapeHtml(0), ''); });
  it('false → 空串', () => { assert.equal(escapeHtml(false), ''); });
  it('引号在属性上下文被转义', () => {
    assert.equal(escapeHtml('onclick="alert(1)"'), 'onclick=&quot;alert(1)&quot;');
  });
  it('NBSP 保持原样（不转义）', () => {
    assert.equal(escapeHtml('a\u00A0b'), 'a\u00A0b');
  });
  it('混合特殊字符', () => {
    assert.equal(escapeHtml('<a href="x">&\'</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
  });
});

// ── formatTime ──────────────────────────────────────────────
describe('formatTime', () => {
  it('0 秒', () => { assert.equal(formatTime(0), '0:00'); });
  it('61 秒', () => { assert.equal(formatTime(61), '1:01'); });
  it('3599 秒（59:59）', () => { assert.equal(formatTime(3599), '59:59'); });
  it('负数', () => { assert.equal(formatTime(-1), '0:00'); });
  it('大数', () => { assert.equal(formatTime(7320), '122:00'); });
  it('NaN', () => { assert.equal(formatTime(NaN), '0:00'); });
  it('Infinity', () => { assert.equal(formatTime(Infinity), '0:00'); });
  it('undefined', () => { assert.equal(formatTime(undefined), '0:00'); });
  it('null', () => { assert.equal(formatTime(null), '0:00'); });
  it('数字字符串', () => { assert.equal(formatTime('61'), '1:01'); });
  it('浮点截断', () => { assert.equal(formatTime(59.9), '0:59'); });
});

// ── normalizeMusicSource ────────────────────────────────────
describe('normalizeMusicSource', () => {
  it('kugou 保留', () => { assert.equal(normalizeMusicSource('kugou'), 'kugou'); });
  it('netease 保留', () => { assert.equal(normalizeMusicSource('netease'), 'netease'); });
  it('其他源回退 netease', () => { assert.equal(normalizeMusicSource('kuwo'), 'netease'); });
  it('undefined', () => { assert.equal(normalizeMusicSource(undefined), 'netease'); });
});

// ── normalizeTrack ──────────────────────────────────────────
describe('normalizeTrack', () => {
  it('保留 source kugou', () => {
    assert.equal(normalizeTrack({ id: '1', source: 'kugou' }).source, 'kugou');
  });
  it('无 source 时用 fallbackSource', () => {
    assert.equal(normalizeTrack({ id: '1' }, 'netease').source, 'netease');
  });
  it('空对象兜底', () => {
    const result = normalizeTrack({}, 'netease');
    assert.equal(result.source, 'netease');
  });
  it('undefined 兜底空对象', () => {
    const result = normalizeTrack(undefined, 'netease');
    assert.equal(result.source, 'netease');
  });
  it('null 兜底空对象', () => {
    const result = normalizeTrack(null, 'kugou');
    assert.equal(result.source, 'kugou');
  });
  it('非对象兜底空对象', () => {
    const result = normalizeTrack('not-an-object', 'netease');
    assert.equal(result.source, 'netease');
  });
  it('保留原始字段', () => {
    const result = normalizeTrack({ id: 'abc', name: 'test', source: 'kugou' });
    assert.equal(result.id, 'abc');
    assert.equal(result.name, 'test');
    assert.equal(result.source, 'kugou');
  });
});

// ── parseLyrics ─────────────────────────────────────────────
describe('parseLyrics', () => {
  it('空字符串', () => { assert.deepEqual(parseLyrics(''), []); });
  it('null/undefined', () => { assert.deepEqual(parseLyrics(null), []); });
  it('标准 LRC 行', () => {
    const result = parseLyrics('[01:30.50]Hello World\n[00:00.00]Intro');
    assert.equal(result.length, 2);
    assert.equal(result[0].time, 0);
    assert.equal(result[0].text, 'Intro');
    assert.equal(result[1].time, 90.5);
    assert.equal(result[1].text, 'Hello World');
  });
  it('3 位小数秒', () => {
    const result = parseLyrics('[00:00.123]Start');
    assert.equal(result.length, 1);
    assert.equal(result[0].time, 0.123);
  });
  it('多时间戳行用最早时间', () => {
    const result = parseLyrics('[00:05.00][00:10.00]Repeat');
    assert.equal(result.length, 1);
    assert.equal(result[0].time, 5);
  });
  it('纯时间行（无文本）忽略', () => {
    const result = parseLyrics('[00:00.00]\n[00:05.00]Music');
    assert.equal(result.length, 1);
    assert.equal(result[0].text, 'Music');
  });
  it('按时间排序', () => {
    const result = parseLyrics('[00:30.00]B\n[00:10.00]A\n[00:20.00]C');
    assert.equal(result[0].text, 'A');
    assert.equal(result[1].text, 'C');
    assert.equal(result[2].text, 'B');
  });
  it('翻译字段初始化为空', () => {
    const result = parseLyrics('[00:00.00]Test');
    assert.equal(result[0].translation, '');
  });
  it('CRLF 行尾', () => {
    const result = parseLyrics('[00:01.00]A\r\n[00:02.00]B');
    assert.equal(result.length, 2);
    assert.equal(result[0].text, 'A');
    assert.equal(result[1].text, 'B');
  });
  it('冒号时间戳 [mm:ss:xx]', () => {
    const result = parseLyrics('[00:01:50]Time');
    assert.equal(result.length, 1);
    assert.equal(result[0].time, 1.5);
  });
});

// ── spatial3dDelaySeconds（3D 丽音右声道延时） ──────────────
describe('spatial3dDelaySeconds', () => {
  it('开启返回默认 25ms（0.025s）', () => {
    assert.equal(spatial3dDelaySeconds(true), 0.025);
  });
  it('关闭恒为 0（透明旁路）', () => {
    assert.equal(spatial3dDelaySeconds(false), 0);
    assert.equal(spatial3dDelaySeconds(undefined), 0);
  });
  it('自定义毫秒值换算为秒', () => {
    assert.equal(spatial3dDelaySeconds(true, 35), 0.035);
  });
  it('毫秒值夹在 [0,100]', () => {
    assert.equal(spatial3dDelaySeconds(true, -5), 0);
    assert.equal(spatial3dDelaySeconds(true, 500), 0.1);
  });
  it('非法毫秒值回退默认 25ms', () => {
    assert.equal(spatial3dDelaySeconds(true, NaN), 0.025);
  });
});

// ── isCreditLine / isArtistCreditLine（歌词元数据判定） ──────
describe('isCreditLine（行首锚定的署名/元数据判定）', () => {
  it('典型中文署名行 → 判定为元数据', () => {
    for (const t of [
      '作词：郑楠', '词:李焯雄', '曲 周杰伦', '编曲：XXX', '制作人：林迈可',
      '监制：张三', '出品：XX文化', '发行：XX音乐', '录音：李明', '混音：Bill',
      '母带：Chris', '和声编写：XXX', '配唱制作人：XX', 'OP：索尼音乐',
      '封面设计：xxx', '文案：xxx', '摄影：xxx', '导演：xxx',
      '（作词：xxx）', '【编曲】xxx', '- 作曲：xxx', '吉他：李明', '鼓：王大师',
      '马头琴：巴拉', '唢呐：XXX', '鸣谢：家人'
    ]) assert.equal(isCreditLine(t), true, `应判元数据: ${t}`);
  });
  it('英文署名行 → 判定为元数据', () => {
    for (const t of [
      'Lyrics by 王', 'Lyrics: Wang', 'Composed by Jay', 'Arranged by Mac',
      'Produced by Eric', 'Mixed by Chris', 'Mastered by Tom', 'Vocal：XXX',
      'Record by Lee', 'Guitar: Han', 'Rap by GAI', 'OP/SP：XX', 'Programming: XX'
    ]) assert.equal(isCreditLine(t), true, `应判元数据: ${t}`);
  });
  it('正文行不得误伤（旧子串规则的重灾区）', () => {
    for (const t of [
      '谁设计的故事', '一曲相見', '词不达意', '鼓声像我的心跳', '鼓舞着我前行',
      '琵琶声停欲语迟', '小号吹响的清晨', '我在演唱会上哭', '歌手出身的他',
      '封面下的旧照片', '摄影机拍不到的海', '他说要写一首歌给我', '吉他弦断了也没关系',
      'Drum and bass drop', 'organ 是我的梦', 'This is bass music', 'grape vine',
      'loop through my mind', '把录音删掉好不好', '和声里藏着你', '文案里全是你的影子'
    ]) assert.equal(isCreditLine(t), false, `应保留正文: ${t}`);
  });
  it('超长行：无标签分隔的正文不判元数据（沿用弱分隔上限）', () => {
    /* 旧实现是「任何 >48 字符一律放行」，导致「编曲 Arranger：…」(51 字符) 这类
       长署名行整行漏过滤。现改为两段式：只有出现明确标签分隔符（冒号/破折号等）
       才放宽长度；仅靠空白收尾的长行仍按 48 上限拦下，避免长正文被误判。 */
    assert.equal(isCreditLine('哈'.repeat(60)), false);
    assert.equal(isCreditLine('作词' + '哈'.repeat(60)), false);
    /* 反向：带冒号的超长署名行必须仍能识别（本次修复目标之一） */
    assert.equal(isCreditLine('作词：' + '哈'.repeat(60)), true);
  });
});

describe('短乐器/职能词不得以子串误杀正文（回归：线上曾缺行）', () => {
  /* 旧实现用「关键词是否出现在行内」判定署名行，导致短乐器词命中正文子串即整行删除。
     真实事故：'Win it now! Be the sharp no one can ignore' 因 'harp' 命中 'sharp' 被删除，
     播放到该句时歌词直接缺了一行。以下为同类误杀样本，均须判为正文（返回 false）。 */
  it('英文正文中命中短词子串 → 保留', () => {
    for (const t of [
      "Win it now! Be the sharp no one can ignore",   // harp ← sharp
      "Swing now! We aren't bolted parts anymore",
      'Ready to surprise them all',
      'A mixture of love and pain',                   // mix ← mixture
      'The basses are humming',                       // bass ← basses
      'Nothing organic here',                         // organ ← organic
      'Grape vine memories',                          // rap ← grape
      'A remix of our song',                          // mix ← remix
      'Horns of the city',                            // horn ← horns
      'Wrap me in your arms',                         // rap ← wrap
      'Caught in a trap',                             // rap ← trap
      'The harp in your voice',
      'Drum and bass drop'
    ]) assert.equal(isCreditLine(t), false, `应保留正文: ${t}`);
  });
  it('中文正文中命中乐器/职能词子串 → 保留', () => {
    for (const t of [
      '谁设计的故事',      // 设计
      '一曲相思',          // 曲
      '鼓舞着我前行',      // 鼓
      '我在演唱会上哭',    // 演唱
      '封面下的旧照片',    // 封面
      '摄影机拍不到的海',  // 摄影
      '吉他弦断了也没关系',// 吉他
      '把录音删掉好不好',  // 录音
      '和声里藏着你',      // 和声
      '文案里全是你的影子' // 文案
    ]) assert.equal(isCreditLine(t), false, `应保留正文: ${t}`);
  });
});

describe('复合/多词角色署名行（回归：线上元数据漏过滤）', () => {
  /* 事故：网易云 LRC 里 '编曲 Arranger：…'（51 字符）、'制作人 Producer：…'（50 字符）
     因 isCreditLine 的「raw.length > 48 直接返回 false」被整行放行；
     '人声录音棚 Vocal Recording Studio：…'、'母带制作 Mastering Engineer：…'
     则因角色词表只有单字/单词而被漏掉。以下均须判为署名行。 */
  it('中文角色 + 英文角色 复合头（>48 字符）→ 判为元数据', () => {
    for (const t of [
      '编曲 Arranger：王可鑫 Eli.W (HOYO-MiX)/崔瀚普TSAR (HOYO-MiX)',
      '制作人 Producer：宫奇Gon (HOYO-MiX)/王可鑫 Eli.W (HOYO-MiX)',
      '作词 Lyricist：黑金雨/windflowerLia',
      '作曲 Composer：王可鑫 Eli.W (HOYO-MiX)'
    ]) assert.equal(isCreditLine(t), true, `应判元数据: ${t}`);
  });
  it('带修饰语的中文复合角色 → 判为元数据', () => {
    for (const t of [
      '人声录音棚 Vocal Recording Studio：The Hideout Recording Studio',
      '人声录音师 Vocal Recording Engineer：Nik Hotchkiss',
      '母带制作 Mastering Engineer：王可鑫 Eli.W (HOYO-MiX)',
      '制谱 Music Copyist：吴泽熙 Jersey Wu (HOYO-MiX)',
      '混音师 Mixing Engineer：王可鑫 Eli.W (HOYO-MiX)'
    ]) assert.equal(isCreditLine(t), true, `应判元数据: ${t}`);
  });
  it('放宽长度后仍不得误伤长正文行（防回归）', () => {
    for (const t of [
      "Win it now! Be the sharp no one can ignore",
      "Swing now! We aren't bolted parts anymore",
      'Where the balloon\'s taking me to roam?',
      'Electrify, our ending line is right in sight',
      'Lights on our star, supercharge it!',
      'Hey! Worried \'bout it? Don\'t you doubt it',
      'I love you - forever and a day, my dear',
      '谁设计的故事，谁在夜里唱着歌',
      '把录音删掉好不好，我什么都听不见'
    ]) assert.equal(isCreditLine(t), false, `应保留正文: ${t}`);
  });
});

describe('isArtistCreditLine（整行艺人名单）', () => {
  const names = ['周杰伦', '蔡依林'];
  it('整行艺人名列表 → 判定为元数据', () => {
    assert.equal(isArtistCreditLine('周杰伦', names), true);
    assert.equal(isArtistCreditLine('周杰伦、蔡依林', names), true);
    assert.equal(isArtistCreditLine('周杰伦 / 蔡依林', names), true);
    assert.equal(isArtistCreditLine('蔡依林、周杰伦 等', names), true);
    assert.equal(isArtistCreditLine('Jay Chou(周杰伦)', ['Jay Chou(周杰伦)']), true);
  });
  it('正文提及艺人名不误伤', () => {
    assert.equal(isArtistCreditLine('我想念周杰伦', names), false);
    assert.equal(isArtistCreditLine('周杰伦式的浪漫', names), false);
    assert.equal(isArtistCreditLine('谁不是蔡依林', names), false);
  });
  it('空名单/空行安全', () => {
    assert.equal(isArtistCreditLine('周杰伦', []), false);
    assert.equal(isArtistCreditLine('', names), false);
    assert.equal(isArtistCreditLine(null, names), false);
  });
});

// ── computeArtistMarquee（歌手行跑马灯时序）──────────────────
describe('computeArtistMarquee', () => {
  const CFG = { speedPxPerSec: 30, holdMs: 3000, gapPx: 48 };

  it('短文本不滚动', () => {
    const r = computeArtistMarquee(110, 420, CFG);
    assert.equal(r.scrolling, false);
    assert.equal(r.distance, 0);
    assert.equal(r.scrollMs, 0);
    assert.equal(r.totalMs, 0);
    assert.equal(r.keyframePct, 0);
  });

  it('恰好等宽不滚动（边界用 <=）', () => {
    assert.equal(computeArtistMarquee(420, 420, CFG).scrolling, false);
  });

  it('超长（Encanto 实测 601/420）时序正确', () => {
    const r = computeArtistMarquee(601, 420, CFG);
    assert.equal(r.scrolling, true);
    assert.equal(r.distance, 649);       // 601 + 48
    assert.equal(r.scrollMs, 21633.33);  // 649 / 30 * 1000
    assert.equal(r.totalMs, 24633.33);   // + 3000
    assert.equal(r.keyframePct, 87.821);
  });

  it('超长（1200/420）时序正确', () => {
    const r = computeArtistMarquee(1200, 420, CFG);
    assert.equal(r.distance, 1248);
    assert.equal(r.scrollMs, 41600);
    assert.equal(r.totalMs, 44600);
    assert.equal(r.keyframePct, 93.274);
  });

  it('非法 textW/viewportW 不抛错且判不滚动', () => {
    for (const [tw, vw] of [[NaN, 420], [undefined, 420], [null, 420], [-5, 420], ['x', 420], [601, 0], [601, NaN], [601, -1], [601, undefined]]) {
      const r = computeArtistMarquee(tw, vw, CFG);
      assert.equal(r.scrolling, false, 'textW=' + tw + ' viewportW=' + vw);
      assert.equal(r.distance, 0);
    }
  });

  it('非法 opts 回退默认值（speed<=0 不得产生 Infinity/NaN）', () => {
    const r = computeArtistMarquee(601, 420, { speedPxPerSec: 0, holdMs: -1, gapPx: NaN });
    assert.equal(r.scrolling, true);
    assert.equal(r.distance, 649);       // gap 回退 48
    assert.equal(r.totalMs, 24633.33);   // speed 回退 30、hold 回退 3000
    assert.ok(isFinite(r.keyframePct), 'keyframePct 必须有限');
    const r2 = computeArtistMarquee(601, 420, { speedPxPerSec: -3, holdMs: NaN, gapPx: -1 });
    assert.equal(r2.distance, 649);
    assert.ok(isFinite(r2.totalMs));
  });

  it('省略 opts 使用默认配置', () => {
    const r = computeArtistMarquee(601, 420);
    assert.equal(r.distance, 649);
    assert.equal(r.totalMs, 24633.33);
    assert.equal(r.keyframePct, 87.821);
  });

  it('keyframePct 恒在 (0,100) 开区间', () => {
    for (const tw of [421, 600, 1200, 5000]) {
      const p = computeArtistMarquee(tw, 420, CFG).keyframePct;
      assert.ok(p > 0 && p < 100, 'textW=' + tw + ' pct=' + p);
    }
  });

  it('回显入参 textW / viewportW（归一后）', () => {
    const r = computeArtistMarquee(601, 420, CFG);
    assert.equal(r.textW, 601);
    assert.equal(r.viewportW, 420);
    assert.equal(computeArtistMarquee(NaN, 420, CFG).textW, 0);
  });
});