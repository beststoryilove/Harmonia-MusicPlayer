/* Harmonia 设置内搜索纯函数库（2026-10-17）
 *
 * 用途：在「设置窗口打开时」让灵动岛的搜索框检索设置项，而非歌曲。
 * 本文件只做纯计算（不碰 DOM、不读全局状态），因此可在 Node 下直接单测。
 *
 * 浏览器：<script src="js/lib/settings-search.js"></script> 后暴露 window.HarmoniaSettingsSearch
 * Node：  require('../../js/lib/settings-search.js')
 *
 * ⚠️ 与 js/main.js 的分工：DOM 扫描（建索引）、渲染、跳转都在 main.js 的 ss* 区段；
 *    这里只负责「给定索引与查询词，返回排好序的条目」。
 *
 * ⚠️ 双源同步：Harmonia/js/lib/settings-search.js 与
 *    HarmoniaApp/网页源码/js/lib/settings-search.js 必须逐字节一致
 *    （由 tests/settings-island-search.test.js 与 prepare.mjs 双重守卫）。
 *
 * ⚠️ PINYIN_INITIALS 的维护：它由双源 main.html 的设置区文案（item-label /
 *    item-desc / group-title / 导航项）生成，共 536 字、37 个多音字。
 *    设置页新增中文文案后，settings-search.test.js 会 FAIL 并打印缺失汉字，
 *    按提示把这几个字补进下表即可。
 *    多音字给**全部**候选（如 "重":"cz"），匹配时逐字展开组合——
 *    这样「重试」的 z 与「重要」的 z 都能命中，不会因单读音选择而漏检。
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.HarmoniaSettingsSearch = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* 汉字 → 拼音首字母候选串（多音字为多个候选，如 "长":"cz"）。
     覆盖范围：双源 main.html 设置区全部汉字（实测 536 字）。 */
  var PINYIN_INITIALS = {
    "一":"y", "三":"s", "上":"s", "下":"x", "不":"bf", "与":"y", "专":"z", "业":"y", "两":"l", "个":"g", "中":"z", "为":"w",
    "主":"z", "丽":"l", "久":"j", "义":"y", "乐":"ly", "也":"y", "习":"x", "事":"s", "二":"e", "于":"y", "云":"y", "些":"sx",
    "交":"j", "产":"c", "亮":"l", "人":"r", "仅":"j", "从":"cz", "仓":"c", "代":"d", "令":"l", "以":"y", "件":"j", "任":"r",
    "份":"bf", "优":"y", "会":"hk", "传":"cz", "但":"d", "低":"d", "体":"t", "何":"h", "余":"y", "作":"z", "你":"n", "使":"s",
    "供":"g", "依":"y", "侧":"cz", "保":"b", "信":"sx", "修":"x", "值":"z", "停":"t", "偿":"c", "像":"x", "允":"y", "元":"y",
    "充":"c", "先":"x", "光":"g", "免":"m", "入":"r", "全":"q", "关":"g", "其":"jq", "典":"d", "兼":"j", "内":"n", "再":"z",
    "决":"j", "准":"z", "出":"c", "击":"j", "分":"f", "切":"q", "列":"l", "判":"p", "利":"l", "到":"d", "制":"z", "刷":"s",
    "前":"q", "剩":"s", "功":"g", "加":"j", "务":"w", "动":"d", "勿":"w", "包":"b", "化":"h", "区":"oq", "千":"q", "升":"s",
    "单":"cds", "卡":"kq", "即":"j", "厅":"t", "原":"y", "参":"cs", "反":"f", "发":"f", "取":"q", "变":"b", "口":"k", "古":"g",
    "只":"z", "可":"k", "右":"y", "号":"h", "合":"gh", "同":"t", "名":"m", "后":"h", "向":"x", "听":"t", "启":"q", "和":"h",
    "哈":"h", "响":"x", "唱":"c", "商":"s", "器":"q", "囊":"n", "回":"h", "因":"y", "围":"w", "固":"g", "国":"g", "图":"t",
    "在":"z", "地":"d", "场":"c", "均":"j", "坦":"t", "型":"x", "域":"y", "堂":"t", "填":"tz", "境":"j", "增":"z", "士":"s",
    "声":"s", "备":"b", "复":"f", "外":"w", "多":"d", "大":"dt", "天":"t", "失":"s", "头":"t", "如":"r", "始":"s", "子":"z",
    "字":"z", "存":"c", "学":"x", "守":"s", "完":"w", "官":"g", "定":"d", "实":"s", "客":"k", "害":"h", "家":"j", "容":"r",
    "宽":"k", "密":"m", "对":"d", "导":"d", "封":"f", "射":"sy", "将":"j", "小":"x", "尝":"c", "就":"j", "局":"j", "展":"z",
    "巧":"q", "已":"y", "布":"b", "帖":"t", "带":"d", "平":"p", "并":"b", "库":"k", "应":"y", "度":"d", "延":"y", "建":"j", "开":"k",
    "式":"s", "弱":"r", "强":"jq", "当":"d", "录":"l", "影":"y", "往":"w", "径":"j", "待":"d", "律":"l", "微":"w", "必":"b",
    "忆":"y", "志":"z", "快":"k", "念":"n", "态":"t", "思":"s", "性":"x", "总":"z", "恢":"h", "息":"x", "悬":"x", "意":"y",
    "感":"g", "慢":"m", "成":"c", "或":"h", "户":"h", "所":"s", "手":"s", "打":"d", "扫":"s", "扰":"r", "承":"c", "技":"j",
    "折":"sz", "担":"d", "拉":"l", "拒":"j", "拖":"t", "择":"z", "括":"gk", "持":"c", "指":"z", "按":"a", "损":"s", "换":"h",
    "据":"j", "捷":"j", "授":"s", "接":"j", "控":"k", "推":"t", "提":"dt", "搜":"s", "摇":"y", "播":"b", "支":"z", "收":"s",
    "改":"g", "放":"f", "效":"x", "数":"s", "整":"z", "文":"w", "断":"d", "斯":"s", "新":"x", "方":"f", "无":"w", "日":"r",
    "旧":"j", "时":"s", "明":"m", "易":"y", "是":"s", "显":"x", "晓":"x", "普":"p", "景":"jy", "晰":"x", "智":"z", "暂":"z",
    "暖":"n", "曲":"q", "更":"g", "最":"z", "有":"y", "服":"f", "期":"jq", "未":"w", "本":"b", "术":"sz", "机":"j", "权":"q",
    "条":"t", "来":"l", "析":"x", "果":"g", "染":"r", "查":"cz", "标":"b", "样":"y", "格":"g", "框":"k", "桌":"z", "概":"g",
    "模":"m", "次":"c", "款":"k", "歌":"g", "正":"z", "此":"c", "步":"b", "殊":"s", "段":"d", "每":"m", "氛":"f", "永":"y",
    "求":"q", "沉":"c", "没":"m", "法":"f", "活":"h", "流":"l", "测":"c", "济":"j", "浏":"l", "浮":"f", "液":"y", "淡":"d",
    "深":"s", "混":"h", "清":"q", "渡":"d", "温":"w", "渲":"x", "源":"y", "滚":"g", "滤":"l", "点":"d", "爵":"j", "片":"p",
    "版":"b", "牌":"p", "特":"t", "状":"z", "狗":"g", "环":"h", "现":"x", "玻":"b", "理":"l", "璃":"l", "生":"s", "用":"y",
    "由":"y", "电":"d", "画":"h", "留":"l", "登":"d", "的":"d", "益":"y", "盘":"p", "目":"m", "直":"z", "相":"x", "看":"k",
    "知":"z", "码":"m", "砂":"s", "研":"y", "确":"q", "磨":"m", "示":"s", "社":"s", "私":"s", "称":"c", "移":"y", "稳":"w",
    "究":"j", "空":"k", "窗":"c", "立":"l", "站":"z", "端":"d", "第":"d", "等":"d", "签":"q", "类":"l", "糊":"h", "系":"jx",
    "索":"s", "纠":"j", "约":"y", "级":"j", "纷":"f", "线":"x", "细":"x", "终":"z", "经":"j", "结":"j", "络":"l", "绝":"j",
    "统":"t", "绪":"x", "维":"w", "缓":"h", "编":"b", "缘":"y", "缩":"s", "网":"w", "置":"z", "群":"q", "翻":"f", "考":"k",
    "者":"z", "而":"e", "耐":"n", "耳":"e", "聆":"l", "聊":"l", "背":"b", "胶":"j", "能":"n", "自":"z", "舞":"w", "色":"s",
    "节":"j", "范":"f", "荐":"j", "获":"h", "菜":"c", "营":"y", "藏":"cz", "行":"hx", "衔":"x", "衡":"h", "表":"b", "要":"y",
    "观":"g", "规":"g", "视":"s", "览":"l", "觉":"j", "角":"j", "解":"jx", "言":"y", "计":"j", "认":"r", "议":"y", "记":"j",
    "许":"hx", "论":"l", "设":"s", "证":"z", "评":"p", "识":"sz", "词":"c", "译":"y", "试":"s", "话":"h", "语":"y", "请":"q", "调":"dtz", "谢":"x",
    "谱":"p", "负":"f", "责":"z", "败":"b", "账":"z", "质":"z", "费":"f", "赔":"p", "赖":"l", "起":"q", "跃":"y", "跨":"k",
    "路":"l", "跳":"t", "身":"s", "转":"z", "轴":"z", "载":"z", "较":"j", "辑":"j", "输":"s", "边":"b", "达":"d", "迁":"q",
    "过":"g", "运":"y", "返":"f", "这":"z", "进":"j", "连":"l", "迷":"m", "退":"t", "选":"x", "透":"t", "逐":"z", "通":"t",
    "速":"s", "道":"d", "遵":"z", "避":"b", "邀":"y", "部":"b", "配":"p", "酷":"k", "重":"cz", "量":"l", "钥":"y", "钮":"n",
    "链":"l", "键":"j", "镜":"j", "长":"cz", "闭":"b", "问":"w", "间":"j", "附":"f", "际":"j", "降":"jx", "限":"x", "除":"c",
    "险":"x", "随":"s", "隐":"y", "集":"j", "需":"x", "非":"f", "面":"m", "音":"y", "页":"y", "项":"x", "预":"y", "领":"l",
    "频":"bp", "题":"t", "风":"f", "馈":"k", "首":"s", "验":"y", "高":"g", "默":"m",
    "位":"w", "之":"z", "则":"z", "管":"g", "住":"z", "灵":"l", "岛":"d",
    "台":"t", "桥":"q", "含":"h", "秒":"m", "钟":"z", "划":"h", "占":"z", "磁":"c", "引":"y", "命":"m", "齐":"q", "拍":"p", "句":"j", "界":"j", "删":"s", "满":"m"
  };

  /* 分值表：数字越大越靠前。改这里必须同步改测试里的期望（测试引用 SCORE 常量，故改数值安全）。 */
  var SCORE = {
    TITLE_EXACT: 100,
    TITLE_PREFIX: 80,
    TITLE_INCLUDE: 60,
    PINYIN_PREFIX: 55,
    PINYIN_INCLUDE: 50,
    GROUP: 40,
    ALIAS: 35,
    TAB: 30,
    DESC: 20
  };

  /* 别名表（最小集）：用户常用说法 → 实际设置项标题片段。
     约束：term 必须能在**至少一端**的设置 DOM 里找到（测试守卫）。
     要加新的别名，在这里加一行即可。 */
  var ALIASES = [
    { alias: '模糊', term: '动态背景' },
    { alias: '音质', term: '酷狗音质' },
    { alias: '清晰', term: '逐字歌词' },
    { alias: '透明', term: '背景样式' },
    { alias: '大小', term: '歌词展示模式' },
    { alias: '键盘', term: '键盘快捷键' },
    { alias: '账号', term: '酷狗账号' },
    { alias: '登录', term: '酷狗账号' },
    { alias: '缓存', term: '歌词缓存' },
    { alias: '会员', term: '概念版 VIP' },
    { alias: '歌词字体', term: '歌词展示模式' },
    { alias: '主题', term: '液态玻璃样式' },
    { alias: '玻璃', term: '液态玻璃样式' },
    { alias: '音效', term: '3D 丽音' },
    { alias: '节奏', term: '歌曲过渡' }
  ];

  /* 空态快捷 chip。渲染前会按当前端实际存在的设置项过滤，
     因此客户端独有项（如「背景样式」）在网页版会被自动剔除，不会成为死链。 */
  var DEFAULT_CHIPS = ['动态背景', '音质', '均衡器', '桌面歌词', '翻译', '逐字歌词', '背景样式'];

  /* 多音字组合上限：防止病态输入（如 8 个三读音字 = 6561 组）拖慢匹配。 */
  var MAX_PINYIN_COMBOS = 64;

  /* 全角 ASCII（U+FF01..U+FF5E）→ 对应半角（U+0021..U+007E）。
     中文输入法在全角状态下会打出「ＡＢＣ」「１２３」这类字符，
     若不归一，「API」与「ＡＰＩ」就是两个互不相干的字符串，用户搜不到东西。
     单独写成函数便于单测覆盖。 */
  function toHalfWidthAscii(s) {
    return String(s).replace(/[\uFF01-\uFF5E]/g, function (ch) {
      return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
    });
  }

  function normalizeQuery(q) {
    if (typeof q !== 'string') return '';
    /* 全角空格 → 半角，全角 ASCII → 半角，再去首尾空白，最后小写 */
    return toHalfWidthAscii(q.replace(/\u3000/g, ' ')).trim().toLowerCase();
  }

  /* 文本 → 所有候选首字母串（多音字笛卡尔积，截断到 MAX_PINYIN_COMBOS）。 */
  function toPinyinInitials(text) {
    if (typeof text !== 'string' || !text) return [];
    var combos = [''];
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      var lower = ch.toLowerCase();
      var cands;
      if (/[a-z0-9]/.test(lower)) {
        cands = [lower];
      } else if (PINYIN_INITIALS[ch]) {
        cands = PINYIN_INITIALS[ch].split('');
      } else {
        /* 未知字符（标点/符号/罕见字）：跳过，不参与拼音串 */
        continue;
      }
      var next = [];
      for (var a = 0; a < combos.length; a++) {
        for (var b = 0; b < cands.length; b++) {
          next.push(combos[a] + cands[b]);
          if (next.length >= MAX_PINYIN_COMBOS) break;
        }
        if (next.length >= MAX_PINYIN_COMBOS) break;
      }
      combos = next;
      if (!combos.length) return [];
    }
    /* 去重并剔除空串 */
    var seen = Object.create(null);
    var out = [];
    for (var k = 0; k < combos.length; k++) {
      if (!combos[k] || seen[combos[k]]) continue;
      seen[combos[k]] = 1;
      out.push(combos[k]);
    }
    return out;
  }

  /* 单个字段的匹配分（0 = 不匹配）。level 用于区分标题类与辅助类。 */
  function scoreText(text, query) {
    if (!text) return 0;
    var hay = String(text).toLowerCase();
    if (hay === query) return SCORE.TITLE_EXACT;
    if (hay.indexOf(query) === 0) return SCORE.TITLE_PREFIX;
    if (hay.indexOf(query) > -1) return SCORE.TITLE_INCLUDE;
    return 0;
  }

  /* 拼音匹配：前缀优先于包含。 */
  function scorePinyin(text, query) {
    if (!text || !query) return 0;
    var combos = toPinyinInitials(text);
    var best = 0;
    for (var i = 0; i < combos.length; i++) {
      if (combos[i].indexOf(query) === 0) return SCORE.PINYIN_PREFIX;
      if (combos[i].indexOf(query) > -1) best = SCORE.PINYIN_INCLUDE;
    }
    return best;
  }

  /* 别名命中：query 是某条别名的前缀或全等 → 该 alias 指向的 term 视为命中。 */
  function scoreAlias(entryText, query) {
    for (var i = 0; i < ALIASES.length; i++) {
      var a = ALIASES[i];
      var al = a.alias.toLowerCase();
      if (al.indexOf(query) === 0 || query.indexOf(al) === 0) {
        /* 只有当该条目的文案确实含 term 时才给分，避免「模糊」命中了所有条目 */
        if (entryText && entryText.indexOf(a.term) > -1) return SCORE.ALIAS;
      }
    }
    return 0;
  }

  function scoreEntry(entry, query) {
    var q = normalizeQuery(query);
    if (!q || !entry) return 0;
    var title = entry.title || '';

    /* 1) 标题：完全相等 / 前缀 / 包含 */
    var s = scoreText(title, q);
    if (s === SCORE.TITLE_EXACT) return s;

    /* 2) 标题拼音 */
    var ps = scorePinyin(title, q);
    if (ps > s) s = ps;
    if (s) return s;

    /* 3) 分组名 */
    var gs = scoreText(entry.group, q) ? SCORE.GROUP : 0;
    if (gs) return gs;

    /* 4) 分页名 */
    var ts = scoreText(entry.tabLabel, q) ? SCORE.TAB : 0;
    if (ts) return ts;

    /* 5) 别名 */
    var as = scoreAlias([title, entry.group, entry.desc].join(' '), q);
    if (as) return as;

    /* 6) 说明 */
    var ds = scoreText(entry.desc, q) ? SCORE.DESC : 0;
    if (ds) return ds;

    return 0;
  }

  /* 过滤 + 稳定降序排序。同分保持入参顺序（显式记 _order，不依赖引擎稳定性）。 */
  function searchIndex(entries, query) {
    var q = normalizeQuery(query);
    if (!q || !Array.isArray(entries)) return [];
    var hits = [];
    for (var i = 0; i < entries.length; i++) {
      var sc = scoreEntry(entries[i], q);
      if (sc > 0) hits.push({ entry: entries[i], score: sc, order: i });
    }
    hits.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return a.order - b.order;
    });
    return hits.map(function (h) { return h.entry; });
  }

  return {
    PINYIN_INITIALS: PINYIN_INITIALS,
    SCORE: SCORE,
    ALIASES: ALIASES,
    DEFAULT_CHIPS: DEFAULT_CHIPS,
    MAX_PINYIN_COMBOS: MAX_PINYIN_COMBOS,
    toHalfWidthAscii: toHalfWidthAscii,
    normalizeQuery: normalizeQuery,
    toPinyinInitials: toPinyinInitials,
    scoreEntry: scoreEntry,
    searchIndex: searchIndex
  };
});
