/**
 * TTML（Timed Text Markup Language）歌词解析器 —— 面向桌面歌词场景。
 *
 * 覆盖范围（对齐 Apple Music 歌词扩展与 AMLL TTML DB 社区约定）：
 *  - 逐字/逐音节时序：`<span begin end>`，`itunes:timing="Word" | "Line"`
 *  - 多声部：`ttm:agent`（`<p>` 级与 `<span>` 级），`<ttm:agent type role>` 元数据
 *  - 背景人声：`ttm:role="x-bg"`（可带自身逐字时序，与主行并行）
 *  - 翻译/音译：内联 `x-translation` / `x-roman`，以及 Apple sidecar
 *    `<iTunesMetadata><translations><translation xml:lang><text for="L1">`
 *  - 重叠时间轴：**不假设** `<p>` 之间互不重叠（Apple 规范要求不重叠，
 *    但社区库与人工校订文件存在重叠，必须容错并让重叠行共存）
 *  - Ruby 注音：`tts:ruby="container|base|textContainer|text"`
 *  - 段落信息：`itunes:song-part`（`<div>` 与 `<p>`）
 *
 * 输出为「规范化歌词行」数组，形状与 Harmonia 播放器端的
 * `normalizeAMLLLines()` 输出保持一致，因此播放器既有的主行/副行调度逻辑可直接复用：
 *
 *   {
 *     key, songPart, agent, language,
 *     startTime, endTime,          // 毫秒
 *     words: [{ startTime, endTime, word, agent, ruby }],
 *     text,                        // 由 words 拼接
 *     translatedLyric, romanLyric,
 *     isBG, isDuet, isPriorityBg,
 *     ruby: [{ base, text, startTime, endTime }],
 *   }
 *
 * 设计约束：只读、不抛异常。任何畸形输入都降级为「能解析多少算多少」，
 * 保证歌词链路不会因为一个坏字段整体中断。
 */

import { parseXml } from './xml.js';

/** TTML 命名空间常量（用于文档与调试，解析本身按去前缀的本地名匹配）。 */
export const NS = Object.freeze({
  TTML: 'http://www.w3.org/ns/ttml',
  TTML_METADATA: 'http://www.w3.org/ns/ttml#metadata',
  TTML_STYLING: 'http://www.w3.org/ns/ttml#styling',
  ITUNES: 'http://music.apple.com/lyric-ttml-internal',
  XML: 'http://www.w3.org/XML/1998/namespace',
});

/** 未指定 `end` 且无法推断时的兜底行时长（毫秒），与播放器端保持一致。 */
export const DEFAULT_LINE_DURATION_MS = 5000;

/** 单个词未指定 `end` 时的兜底时长（毫秒）。 */
export const DEFAULT_WORD_DURATION_MS = 3000;

// ─────────────────────────────────────────────────────────────
// 时间表达式
// ─────────────────────────────────────────────────────────────

/**
 * 解析 TTML 时间表达式为毫秒。
 *
 * 支持的全部写法（Apple 规范 + 社区实际使用）：
 *  - `HH:MM:SS.mmm` / `MM:SS.mmm` / `MM:SS`（SMIL clock-value，小时与小数可选）
 *  - `12.3s` / `500ms` / `2m` / `1h`（offset-time，带单位）
 *  - `12.3`（裸秒数，非标准但社区库常见）
 *
 * @param {string|number} value 时间值
 * @returns {number} 毫秒；无法解析时返回 `NaN`
 */
export function parseTtmlTime(value) {
  if (value === null || value === undefined) return NaN;
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;

  const str = String(value).trim();
  if (!str) return NaN;

  // 裸数字：按秒处理（community TTML 常用 `begin="10.5"`）
  if (/^\d+(?:\.\d+)?$/.test(str)) return Math.round(parseFloat(str) * 1000);

  // SMIL clock-value：H?:M?:S(.fraction)
  const clock = /^(?:(\d+):)?(\d{1,3}):(\d{1,2}(?:\.\d+)?)$/.exec(str);
  if (clock) {
    const hours = clock[1] === undefined ? 0 : parseInt(clock[1], 10);
    const minutes = parseInt(clock[2], 10);
    const seconds = parseFloat(clock[3]);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) return NaN;
    return Math.round(((hours * 60 + minutes) * 60 + seconds) * 1000);
  }

  // offset-time：带单位
  const offset = /^([\d.]+)\s*(h|m|s|ms|f|t)$/i.exec(str);
  if (offset) {
    const amount = parseFloat(offset[1]);
    if (!Number.isFinite(amount)) return NaN;
    switch (offset[2].toLowerCase()) {
      case 'h': return Math.round(amount * 3600000);
      case 'm': return Math.round(amount * 60000);
      case 's': return Math.round(amount * 1000);
      case 'ms': return Math.round(amount);
      // 帧/滴答需要 frameRate/tickRate，本解析器不读取这些参数，视为无法解析
      default: return NaN;
    }
  }

  return NaN;
}

/**
 * 解析元素的时序（`begin` / `end` / `dur`），支持从父级继承。
 *
 * 解析优先级：
 *  - 起点：`begin` → 父级起点
 *  - 终点：`end` → `begin + dur` → 父级终点
 *
 * @param {import('./xml.js').XmlElement} element 目标元素
 * @param {{start: number, end: number}} inherited 父级时序
 * @returns {{start: number, end: number, hasOwnStart: boolean, hasOwnEnd: boolean}}
 */
export function resolveTiming(element, inherited) {
  const parentStart = inherited && Number.isFinite(inherited.start) ? inherited.start : NaN;
  const parentEnd = inherited && Number.isFinite(inherited.end) ? inherited.end : NaN;

  const ownStart = parseTtmlTime(element.getAttribute('begin'));
  const ownEnd = parseTtmlTime(element.getAttribute('end'));
  const ownDur = parseTtmlTime(element.getAttribute('dur'));

  const start = Number.isFinite(ownStart) ? ownStart : parentStart;

  let end = NaN;
  if (Number.isFinite(ownEnd)) end = ownEnd;
  else if (Number.isFinite(ownStart) && Number.isFinite(ownDur)) end = ownStart + ownDur;
  else if (Number.isFinite(start) && Number.isFinite(ownDur)) end = start + ownDur;
  else if (Number.isFinite(parentEnd)) end = parentEnd;

  return {
    start,
    end,
    hasOwnStart: Number.isFinite(ownStart),
    hasOwnEnd: Number.isFinite(ownEnd),
  };
}

// ─────────────────────────────────────────────────────────────
// 角色 / 属性判定
// ─────────────────────────────────────────────────────────────

/** 归一化 `ttm:role` 值（社区库存在 `x-bg`、`bg`、`background` 多种写法）。 */
function normRole(value) {
  return String(value || '').trim().toLowerCase();
}

/**
 * 是否翻译 span。
 *
 * 判定依据：显式 `ttm:role="x-translation"`（或 `translation`），
 * 或「带 `xml:lang` 但没有自身时序」——后者是社区库用语言标签隐式表达翻译的写法。
 *
 * @param {import('./xml.js').XmlElement} element 元素
 * @returns {boolean}
 */
export function isTranslationElement(element) {
  const role = normRole(element.getAttribute('ttm:role') || element.getAttribute('role'));
  if (/translation|translat/.test(role)) return true;
  if (role) return false;
  const lang = getLanguageTag(element);
  const hasTiming = Boolean(element.getAttribute('begin') || element.getAttribute('end') || element.getAttribute('dur'));
  return Boolean(lang) && !hasTiming;
}

/**
 * 是否音译（罗马音）span：`x-roman` / `x-romaja` / `transliteration` / `pronunciation`。
 *
 * @param {import('./xml.js').XmlElement} element 元素
 * @returns {boolean}
 */
export function isRomanElement(element) {
  const role = normRole(element.getAttribute('ttm:role') || element.getAttribute('role'));
  return /roman|romaja|romaji|transliteration|pronunciation|pronounce/.test(role);
}

/**
 * 是否背景人声 span：`ttm:role="x-bg"`。
 *
 * @param {import('./xml.js').XmlElement} element 元素
 * @returns {boolean}
 */
export function isBackgroundElement(element) {
  const role = normRole(element.getAttribute('ttm:role') || element.getAttribute('role'));
  if (!role) return false;
  return role === 'x-bg' || role === 'bg' || role.includes('background') || role.includes('x-bg');
}

/** 读取语言标签，兼容 `xml:lang` / `lang`。 */
function getLanguageTag(element) {
  return String(
    element.getAttribute('xml:lang')
    || element.getAttribute('lang')
    || '',
  ).trim();
}

/** 读取 agent 标识，兼容 `ttm:agent` / `agent`。 */
function getAgentId(element) {
  return String(element.getAttribute('ttm:agent') || element.getAttribute('agent') || '').trim();
}

/** 元素是否为指定本地名。 */
function isNamed(element, localName) {
  return Boolean(element) && element.type === 'element' && element.localName === localName;
}

// ─────────────────────────────────────────────────────────────
// 文本收集
// ─────────────────────────────────────────────────────────────

/**
 * 收集元素文本，排除翻译/音译/背景人声子树。
 *
 * 逐字歌词里这三类内容必须剔除，否则翻译文本会被当成歌词正文重复计入。
 *
 * @param {import('./xml.js').XmlElement} element 元素
 * @returns {string} 原始（未空白归一化）文本
 */
function textExcludingAuxiliary(element) {
  let out = '';
  for (const child of element.children) {
    if (child.type === 'text' || child.type === 'cdata') {
      out += child.value;
      continue;
    }
    if (child.type !== 'element') continue;
    if (isTranslationElement(child) || isRomanElement(child) || isBackgroundElement(child)) continue;
    out += textExcludingAuxiliary(child);
  }
  return out;
}

/**
 * 归一化逐字文本。
 *
 * TTML 是空白敏感的，但社区文件常被格式化输出。归一化规则：
 *  - 换行/制表符折成单空格
 *  - 连续空格压成一个
 *  - **清除行首空白**（行首缩进不可能是歌词内容）
 *  - 保留行尾单个空格（拉丁词之间的分隔靠它承载）
 *
 * @param {string} text 原始文本
 * @returns {string} 归一化文本
 */
export function normalizeWordText(text) {
  return String(text == null ? '' : text)
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/ {2,}/g, ' ')
    .replace(/^ +/, '');
}

/**
 * 判断文本节点是否为「纯空白分隔符」。
 *
 * 依据 W3C TTML §7.2.1（`xml:space="default"`）：词间的空白序列折叠为单个空格，
 * 因此 `<span>When</span> <span>the</span>` 与换行缩进写法
 * （`<span>When</span>\n  <span>the</span>`）都代表一个词间空格。
 *
 * 但换行排版产生的**首尾**空白不是内容：`<p>\n  <span>词</span>\n</p>` 不应
 * 让歌词变成 " 词 "。首尾处理由 `collectWords` 完成，本函数只做分类。
 *
 * @param {string} text 文本节点值
 * @returns {'skip'|'separator'|'content'} 分类结果
 */
function classifyTextNode(text) {
  if (!text) return 'skip';
  if (/[^\s]/.test(text)) return 'content';
  return 'separator';
}

// ─────────────────────────────────────────────────────────────
// Ruby 注音
// ─────────────────────────────────────────────────────────────

/** 读取 `tts:ruby` 值。 */
function getRubyKind(element) {
  return String(element.getAttribute('tts:ruby') || element.getAttribute('ruby') || '').trim().toLowerCase();
}

/**
 * 从 ruby 容器提取「基文 + 注音」。
 *
 * 结构（W3C TTML Ruby）：
 * ```xml
 * <span tts:ruby="container">
 *   <span tts:ruby="base">所</span>
 *   <span tts:ruby="textContainer"><span tts:ruby="text" begin end>しょ</span></span>
 * </span>
 * ```
 *
 * @param {import('./xml.js').XmlElement} container ruby 容器元素
 * @returns {{base: string, text: string, startTime: number, endTime: number}|null}
 */
function extractRuby(container) {
  let base = '';
  let text = '';
  let startTime = NaN;
  let endTime = NaN;

  const visit = (element) => {
    for (const child of element.children) {
      if (child.type !== 'element') continue;
      const kind = getRubyKind(child);
      if (kind === 'base') {
        base += child.textContent;
        continue;
      }
      if (kind === 'text' || kind === 'delimiter') {
        if (kind === 'text') {
          text += child.textContent;
          const start = parseTtmlTime(child.getAttribute('begin'));
          const end = parseTtmlTime(child.getAttribute('end'));
          if (Number.isFinite(start) && !Number.isFinite(startTime)) startTime = start;
          if (Number.isFinite(end)) endTime = end;
        }
        continue;
      }
      visit(child);
    }
  };
  visit(container);

  if (!base && !text) return null;
  return { base, text, startTime, endTime };
}

// ─────────────────────────────────────────────────────────────
// 词收集
// ─────────────────────────────────────────────────────────────

/**
 * 从容器（`<p>` 或 `x-bg` span）收集全部词。
 *
 * 处理要点：
 *  - 跳过翻译 / 音译 / 嵌套背景人声子树；
 *  - ruby 容器折叠为**单个**词（基文为准，注音作为附加数据）；
 *  - 无自身时序的词继承父级时序；
 *  - 词级 `ttm:agent` 会记录在词上，供上层做声部切分；
 *  - 词间空白遵循 TTML `xml:space="default"`：空白序列折叠为单个空格，
 *    但**行首/行尾空白不是内容**（见下方 pendingSpace 机制）。
 *
 * 空白处理模型
 * ────────────
 * 用一个贯穿递归的 `pendingSpace` 标记，而不是就地修改上一个词：
 *   - 遇到纯空白文本节点 → 置起 `pendingSpace`
 *   - 遇到词 → 若 `pendingSpace` 已置起**且前面已有词**，才把空格挂到该词前
 *   - 容器遍历结束 → 仍未消费的 `pendingSpace` 自然丢弃（行尾空白不产生内容）
 * 这样 `<p>\n  <span>词</span>\n</p>` 得到 `"词"` 而非 `" 词 "`，
 * 而 `<span>When</span>\n  <span>the</span>` 得到 `"When the"`。
 *
 * @param {import('./xml.js').XmlElement} container 容器元素
 * @param {{start: number, end: number, agent: string}} context 继承上下文
 * @param {string[]} warnings 警告收集器
 * @returns {Array<object>} 词数组
 */
function collectWords(container, context, warnings) {
  /** @type {Array<object>} */
  const words = [];
  /** 跨递归共享的空白状态 */
  const state = { pendingSpace: false };

  /**
   * 追加一个词。
   *
   * 空白语义：词**自身**的尾部空格是真实内容（社区 TTML 用 `"When "` 这种方式
   * 承载词间分隔，见 AMLL TTML DB 真实样本），因此这里保留；
   * 只有整行最后一个词的尾部空格才在收集结束后统一剥除。
   *
   * @param {string} rawText 词文本（可含首尾空白）
   * @param {number} start 起始毫秒
   * @param {number} end 结束毫秒
   * @param {object} [extra] 附加字段
   */
  const push = (rawText, start, end, extra) => {
    const source = String(rawText == null ? '' : rawText);
    // normalizeWordText 会剥掉行首空白（缩进不可能是内容），保留尾部空格
    let wordText = normalizeWordText(source);
    const hadLeadingSpace = /^\s/.test(source);

    if (!wordText.trim()) {
      // 纯空白内容：记为待定分隔符
      if (source !== '') state.pendingSpace = true;
      return;
    }

    // 前导分隔符 → 与前一个词之间补一个空格
    if ((state.pendingSpace || hadLeadingSpace) && words.length) {
      wordText = ' ' + wordText;
    }
    state.pendingSpace = false;

    let safeStart = Number.isFinite(start) ? start : context.start;
    if (!Number.isFinite(safeStart)) {
      warnings.push('存在无起始时间的词，已按 0 处理');
      safeStart = 0;
    }
    let safeEnd = Number.isFinite(end) ? end : NaN;
    if (!Number.isFinite(safeEnd)) {
      safeEnd = Number.isFinite(context.end) && context.end > safeStart
        ? context.end
        : safeStart + DEFAULT_WORD_DURATION_MS;
    }
    // 结束时间必须严格晚于起始时间，否则卡拉OK填充会出现除零
    if (safeEnd <= safeStart) safeEnd = safeStart + 1;

    words.push({
      startTime: safeStart,
      endTime: safeEnd,
      word: wordText,
      agent: (extra && extra.agent) || '',
      ...(extra && extra.ruby ? { ruby: extra.ruby } : {}),
      ...(extra && extra.emptyBeat ? { emptyBeat: true } : {}),
    });
  };

  const walk = (element, inherited) => {
    for (const child of element.children) {
      // ── 文本节点 ──
      if (child.type === 'text' || child.type === 'cdata') {
        const kind = classifyTextNode(child.value);
        if (kind === 'skip') continue;
        if (kind === 'separator') {
          // 纯空白：先记为待定分隔符，只有后面真的跟了词才会生效
          state.pendingSpace = true;
          continue;
        }
        // 无时序的裸文本：按父级时序整体成词（Line 模式常见写法）
        push(child.value, inherited.start, inherited.end, { agent: inherited.agent });
        continue;
      }

      if (child.type !== 'element') continue;

      // ── 辅助内容：不进入正文词序列 ──
      if (isTranslationElement(child) || isRomanElement(child)) continue;
      if (isBackgroundElement(child)) continue;

      const childTiming = resolveTiming(child, inherited);
      const childAgent = getAgentId(child) || inherited.agent;

      // ── Ruby 容器：折叠为单词 ──
      if (getRubyKind(child) === 'container') {
        const ruby = extractRuby(child);
        if (ruby) {
          push(ruby.base || ruby.text, childTiming.start, childTiming.end, {
            agent: childAgent,
            ruby: ruby.text ? ruby : null,
          });
        }
        continue;
      }

      const rubyKind = getRubyKind(child);
      if (rubyKind === 'base' || rubyKind === 'textContainer' || rubyKind === 'text') {
        // 游离的 ruby 子元素（无 container 包裹）：按普通词处理，避免整句丢失
        push(child.textContent, childTiming.start, childTiming.end, { agent: childAgent });
        continue;
      }

      // ── 空拍标记 ──
      const role = normRole(child.getAttribute('ttm:role'));
      const emptyBeat = role.includes('empty-beat')
        || String(child.getAttribute('amll:empty-beat') || '').toLowerCase() === 'true';
      if (emptyBeat) {
        push(child.textContent || '♪', childTiming.start, childTiming.end, {
          agent: childAgent,
          emptyBeat: true,
        });
        continue;
      }

      // ── 分组容器（含子元素时递归下钻）──
      const hasElementChildren = child.children.some((node) => node.type === 'element');
      if (hasElementChildren) {
        walk(child, { start: childTiming.start, end: childTiming.end, agent: childAgent });
        continue;
      }

      push(textExcludingAuxiliary(child), childTiming.start, childTiming.end, { agent: childAgent });
    }
  };

  walk(container, context);

  // 整行最后一个词的尾部空格不是内容，统一剥除
  if (words.length) {
    const last = words[words.length - 1];
    last.word = last.word.replace(/ +$/, '');
    if (!last.word) words.pop();
  }
  return words;
}

/**
 * 收集容器内直系的辅助内容（翻译 / 音译）。
 *
 * 只取直系子元素：`<p>` 的翻译直接写在 `<p>` 下，
 * 而背景人声自己的翻译写在 `x-bg` 内部（由背景行自行收集）。
 *
 * @param {import('./xml.js').XmlElement} container 容器
 * @returns {{translations: Array<{text: string, lang: string, priority: number}>, romanizations: Array<{text: string, lang: string}>}}
 */
function collectAuxiliary(container) {
  const translations = [];
  const romanizations = [];

  for (const child of container.children) {
    if (child.type !== 'element') continue;
    const text = String(child.textContent || '').replace(/\s+/g, ' ').trim();
    if (!text) continue;

    if (isRomanElement(child)) {
      romanizations.push({ text, lang: getLanguageTag(child) });
      continue;
    }
    if (isTranslationElement(child)) {
      const lang = getLanguageTag(child);
      translations.push({ text, lang, priority: translationPriority(lang, text) });
    }
  }

  return { translations, romanizations };
}

/**
 * 翻译优先级：越小的数字越优先作为「显示用翻译」。
 *
 * 中文优先（桌面歌词主力语言），其次无语言标签但含汉字者，最后其他语言。
 *
 * @param {string} lang BCP-47 语言标签
 * @param {string} text 译文
 * @returns {number} 优先级；99 表示不作为译文候选
 */
export function translationPriority(lang, text) {
  const normalized = String(lang || '').trim().replace(/_/g, '-').toLowerCase();
  if (!normalized) return /[\u3400-\u9FFF\uF900-\uFAFF]/.test(String(text || '')) ? 3 : 99;
  if (/^zh-(cn|hans|sg|my)(-|$)/.test(normalized)) return 0;
  if (normalized === 'zh') return 1;
  if (/^zh(-|$)/.test(normalized)) return 2;
  return 99;
}

// ─────────────────────────────────────────────────────────────
// 声部（agent）
// ─────────────────────────────────────────────────────────────

/**
 * 解析 `<ttm:agent>` 元数据。
 *
 * @param {import('./xml.js').XmlDocument} doc 文档
 * @returns {Map<string, {id: string, type: string, role: string, name: string, order: number}>}
 */
function parseAgents(doc) {
  const agents = new Map();
  const elements = doc.getElementsByTagName('agent');
  elements.forEach((element, index) => {
    const id = String(
      element.getAttribute('xml:id')
      || element.getAttribute('id')
      || '',
    ).trim();
    if (!id) return;

    let name = '';
    const nameElement = element.getElementsByTagName('name')[0];
    if (nameElement) name = String(nameElement.textContent || '').trim();
    if (!name) name = String(element.getAttribute('name') || '').trim();

    agents.set(id, {
      id,
      type: String(element.getAttribute('type') || '').trim().toLowerCase(),
      role: normRole(element.getAttribute('role') || element.getAttribute('ttm:role')),
      name,
      order: index,
    });
  });
  return agents;
}

/**
 * 选出主声部（用于判定哪些行属于「对唱/次要声部」）。
 *
 * 规则：按文档序取第一个既非 `type="other"` 也未标 `other/background` 角色的 agent；
 * 找不到则退回第一个声明的 agent。没有任何 agent 时返回空串。
 *
 * @param {Map<string, object>} agents 声部表
 * @returns {string} 主声部 id
 */
export function pickPrimaryAgent(agents) {
  for (const agent of agents.values()) {
    const isOther = agent.type === 'other'
      || agent.role.includes('other')
      || agent.role.includes('background')
      || agent.role.includes('bg');
    if (!isOther) return agent.id;
  }
  const first = agents.keys().next();
  return first.done ? '' : first.value;
}

/**
 * 判断某声部是否为次要声部（对唱的另一方 / 背景人声）。
 *
 * @param {string} agentId 声部 id
 * @param {Map<string, object>} agents 声部表
 * @param {string} primaryAgentId 主声部 id
 * @returns {boolean}
 */
export function isSecondaryAgent(agentId, agents, primaryAgentId) {
  if (!agentId) return false;
  if (agentId !== primaryAgentId) return true;
  const agent = agents.get(agentId);
  if (!agent) return false;
  return agent.type === 'other'
    || agent.role.includes('other')
    || agent.role.includes('duet')
    || agent.role.includes('background')
    || agent.role.includes('bg');
}

// ─────────────────────────────────────────────────────────────
// Apple sidecar（翻译 / 音译）
// ─────────────────────────────────────────────────────────────

/**
 * 解析 `<iTunesMetadata>` 中的 sidecar 翻译与音译。
 *
 * 结构：
 * ```xml
 * <iTunesMetadata xmlns="http://music.apple.com/lyric-ttml-internal">
 *   <translations><translation xml:lang="zh-Hans"><text for="L1">…</text></translation></translations>
 *   <transliterations><transliteration xml:lang="ja-Latn"><text for="L1">…</text></transliteration></transliterations>
 * </iTunesMetadata>
 * ```
 * `for` 对应正文 `<p itunes:key="L1">`。
 *
 * @param {import('./xml.js').XmlDocument} doc 文档
 * @returns {{translations: Map<string, Array<{text: string, lang: string, priority: number}>>, romanizations: Map<string, Array<{text: string, lang: string}>>}}
 */
function parseSidecar(doc) {
  const translations = new Map();
  const romanizations = new Map();

  const collect = (bucket, map, build) => {
    const nodes = doc.getElementsByTagName(bucket);
    for (const node of nodes) {
      const lang = getLanguageTag(node);
      for (const textNode of node.getElementsByTagName('text')) {
        const key = String(textNode.getAttribute('for') || '').trim();
        if (!key) continue;
        const text = String(textNode.textContent || '').replace(/\s+/g, ' ').trim();
        if (!text) continue;
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(build(text, lang));
      }
    }
  };

  collect('translation', translations, (text, lang) => ({
    text,
    lang,
    priority: translationPriority(lang, text),
  }));
  collect('transliteration', romanizations, (text, lang) => ({ text, lang }));

  return { translations, romanizations };
}

/**
 * 解析 `<amll:meta key value>` 与 `<ttm:title>` 等元数据。
 *
 * @param {import('./xml.js').XmlDocument} doc 文档
 * @returns {Record<string, string>} 元数据表
 */
function parseMetadata(doc) {
  const meta = Object.create(null);
  for (const node of doc.getElementsByTagName('meta')) {
    const key = String(node.getAttribute('key') || '').trim();
    const value = String(node.getAttribute('value') || '').trim();
    if (key && value) meta[key] = value;
  }
  const title = doc.getElementsByTagName('title')[0];
  if (title && !meta.musicName) {
    const value = String(title.textContent || '').trim();
    if (value) meta.musicName = value;
  }
  return meta;
}

// ─────────────────────────────────────────────────────────────
// 主流程
// ─────────────────────────────────────────────────────────────

/**
 * 按声部切分一行内的词序列（行内多声部）。
 *
 * Apple 允许 `ttm:agent` 出现在 `<span>` 上，因此**同一 `<p>` 内可以换声部**。
 * 例如「A 唱前半句、B 接后半句」写在同一个 `<p>` 里。
 * 切分后每个连续同声部片段成为独立子行，时间轴互不重叠，
 * 从而让对唱渲染能够正确地左右分区。
 *
 * @param {Array<object>} words 词数组
 * @param {string} fallbackAgent 行级声部（词未标注时使用）
 * @param {string[]} warnings 警告收集器
 * @returns {Array<{agent: string, words: Array<object>}>} 片段数组
 */
function splitWordsByAgent(words, fallbackAgent, warnings) {
  const effective = words.map((word) => ({ ...word, agent: word.agent || fallbackAgent }));
  const agentsInLine = new Set(effective.map((word) => word.agent).filter(Boolean));
  if (agentsInLine.size <= 1) {
    return [{ agent: effective[0]?.agent || fallbackAgent, words: effective }];
  }

  warnings.push(`检测到行内多声部（${Array.from(agentsInLine).join(' / ')}），已按声部切分为独立行`);

  const segments = [];
  let current = null;
  for (const word of effective) {
    if (!current || current.agent !== word.agent) {
      current = { agent: word.agent, words: [] };
      segments.push(current);
    }
    current.words.push(word);
  }
  return segments;
}

/**
 * 解析 TTML 文本为规范化歌词行。
 *
 * @param {string} ttmlText TTML 原文
 * @param {object} [options] 解析选项
 * @param {boolean} [options.splitByAgent=true] 是否把行内多声部切分为独立行
 * @param {boolean} [options.keepEmptyBeats=false] 是否保留空拍行
 * @returns {{
 *   lines: Array<object>,
 *   metadata: Record<string, string>,
 *   agents: Array<object>,
 *   primaryAgent: string,
 *   timing: string,
 *   language: string,
 *   warnings: string[],
 *   recovered: boolean
 * }}
 */
export function parseTtml(ttmlText, options = {}) {
  const splitByAgent = options.splitByAgent !== false;
  const keepEmptyBeats = options.keepEmptyBeats === true;

  /** @type {string[]} */
  const warnings = [];
  const doc = parseXml(ttmlText);
  for (const warning of doc.warnings) warnings.push(warning);
  const recovered = doc.recovered;

  const root = doc.documentElement;
  const agents = parseAgents(doc);
  const primaryAgent = pickPrimaryAgent(agents);
  const sidecar = parseSidecar(doc);
  const metadata = parseMetadata(doc);

  const timing = String(root.getAttribute('itunes:timing') || root.getAttribute('timing') || 'Word');
  const language = getLanguageTag(root);

  const paragraphs = doc.getElementsByTagName('p');

  /** 预扫描：每个 `<p>` 的起始时间（文档序），用于在缺 `end` 时推断行尾。 */
  const paragraphStarts = paragraphs.map((p) => parseTtmlTime(p.getAttribute('begin')));

  /** @type {Array<object>} */
  const lines = [];

  paragraphs.forEach((paragraph, index) => {
    const key = String(paragraph.getAttribute('itunes:key') || paragraph.getAttribute('key') || '').trim();
    const paraTiming = resolveTiming(paragraph, { start: NaN, end: NaN });
    if (!Number.isFinite(paraTiming.start)) {
      warnings.push(`第 ${index + 1} 个 <p> 缺少有效起始时间，已跳过`);
      return;
    }

    // 行尾推断：显式 end/dur → 下一个 <p> 的开始 → 兜底时长
    let paraEnd = paraTiming.end;
    if (!Number.isFinite(paraEnd) || paraEnd <= paraTiming.start) {
      let nextStart = NaN;
      for (let k = index + 1; k < paragraphStarts.length; k += 1) {
        const candidate = paragraphStarts[k];
        if (Number.isFinite(candidate) && candidate > paraTiming.start) {
          nextStart = candidate;
          break;
        }
      }
      paraEnd = Number.isFinite(nextStart) ? nextStart : paraTiming.start + DEFAULT_LINE_DURATION_MS;
    }

    const songPart = String(
      paragraph.getAttribute('itunes:song-part')
      || paragraph.getAttribute('itunes:songPart')
      || paragraph.getAttribute('song-part')
      || findAncestorSongPart(paragraph, doc)
      || '',
    ).trim();

    const paraAgent = getAgentId(paragraph);
    const context = { start: paraTiming.start, end: paraEnd, agent: paraAgent };
    const words = collectWords(paragraph, context, warnings);
    if (!words.length) {
      warnings.push(`第 ${index + 1} 个 <p> 未解析出任何词，已跳过`);
      return;
    }

    const auxiliary = collectAuxiliary(paragraph);
    const translatedLyric = pickTranslation(auxiliary.translations, sidecar.translations.get(key));
    const romanLyric = pickRomanization(auxiliary.romanizations, sidecar.romanizations.get(key));

    // 行内多声部切分
    const segments = splitByAgent ? splitWordsByAgent(words, paraAgent, warnings) : [{
      agent: words[0]?.agent || paraAgent,
      words: words.map((word) => ({ ...word, agent: word.agent || paraAgent })),
    }];

    // ── 背景人声：在「行」层级提取一次 ──
    //
    // 必须按 <p> 提取而不是按声部片段提取：行内多声部会把一个 <p> 拆成多段，
    // 若在每段里都收集 x-bg，同一段背景人声会被重复插入多次。
    // 背景人声与主行是并行时间轴，本就不从属于某个声部片段。
    const bgLines = collectBackgroundLines(paragraph, {
      paragraphStart: paraTiming.start,
      paragraphEnd: paraEnd,
      fallbackAgent: paraAgent,
      key,
      songPart,
      language,
      agents,
      warnings,
    });

    segments.forEach((segment, segmentIndex) => {
      const segmentWords = segment.words;
      const segmentStart = segmentWords[0].startTime;
      const segmentEnd = Math.max(
        segmentWords[segmentWords.length - 1].endTime,
        segmentStart + 1,
      );

      // 翻译/音译只挂在首段，避免重复显示
      const isFirstSegment = segmentIndex === 0;
      lines.push(makeLine({
        key,
        songPart,
        agent: segment.agent,
        language,
        startTime: segmentStart,
        endTime: segmentEnd,
        words: segmentWords,
        translatedLyric: isFirstSegment ? translatedLyric : '',
        romanLyric: isFirstSegment ? romanLyric : '',
        isBG: false,
        isDuet: isSecondaryAgent(segment.agent, agents, primaryAgent),
        isPriorityBg: isSecondaryAgent(segment.agent, agents, primaryAgent),
        agents,
      }));
    });

    for (const bgLine of bgLines) lines.push(bgLine);
  });

  // 稳定排序：起始时间升序；同起始时间时主行在前、背景行在后
  const ordered = lines
    .filter((line) => keepEmptyBeats || !isPureEmptyBeatLine(line))
    .sort((a, b) => {
      if (a.startTime !== b.startTime) return a.startTime - b.startTime;
      if (a.isBG !== b.isBG) return a.isBG ? 1 : -1;
      return 0;
    });

  // 重叠检测（重叠是合法且必须支持的，这里只做提示，便于排查歌词源质量）
  for (let i = 1; i < ordered.length; i += 1) {
    const prev = ordered[i - 1];
    const current = ordered[i];
    if (current.isBG) continue;
    if (prev.isBG) continue;
    if (current.startTime < prev.endTime && current.startTime > prev.startTime) {
      warnings.push(`检测到重叠时间轴：${formatMs(prev.startTime)} 与 ${formatMs(current.startTime)} 两行时间区间重叠（已按共存处理）`);
    }
  }

  return {
    lines: ordered,
    metadata,
    agents: Array.from(agents.values()),
    primaryAgent,
    timing,
    language,
    warnings,
    recovered,
  };
}

/**
 * 提取一个 `<p>` 下的全部背景人声行。
 *
 * 背景人声（`ttm:role="x-bg"`）与主行是**并行时间轴**：它可能比主行晚开始、
 * 早结束，也可能整体包裹主行。因此这里独立解析其逐字时序，
 * 而不是继承主行区间。
 *
 * 同时兼容两种结构：
 *  - `x-bg` 直接作为 `<p>` 的子元素（Apple / AMLL 规范写法）；
 *  - `x-bg` 嵌套在普通分组 span 内（部分编辑器导出如此）。
 *
 * @param {import('./xml.js').XmlElement} paragraph 段落元素
 * @param {object} context 上下文
 * @returns {Array<object>} 背景行数组
 */
function collectBackgroundLines(paragraph, context) {
  const {
    paragraphStart, paragraphEnd, fallbackAgent, key, songPart, language, agents, warnings,
  } = context;

  const bgSpans = [];
  for (const child of paragraph.children) {
    if (child.type !== 'element') continue;
    if (isBackgroundElement(child)) {
      bgSpans.push(child);
      continue;
    }
    // 分组容器内的 x-bg（不跨越嵌套的 x-bg）
    if (isTranslationElement(child) || isRomanElement(child)) continue;
    for (const nested of child.children) {
      if (nested.type === 'element' && isBackgroundElement(nested)) bgSpans.push(nested);
    }
  }

  const lines = [];
  for (const bgSpan of bgSpans) {
    const bgTiming = resolveTiming(bgSpan, { start: paragraphStart, end: paragraphEnd });
    const bgAgent = getAgentId(bgSpan) || fallbackAgent;
    const bgWords = collectWords(bgSpan, {
      start: Number.isFinite(bgTiming.start) ? bgTiming.start : paragraphStart,
      end: Number.isFinite(bgTiming.end) ? bgTiming.end : paragraphEnd,
      agent: bgAgent,
    }, warnings);
    if (!bgWords.length) continue;

    const bgAuxiliary = collectAuxiliary(bgSpan);
    const bgStart = bgWords[0].startTime;
    const bgEnd = Math.max(bgWords[bgWords.length - 1].endTime, bgStart + 1);

    lines.push(makeLine({
      key,
      songPart,
      agent: bgAgent,
      language,
      startTime: bgStart,
      endTime: bgEnd,
      words: bgWords,
      translatedLyric: pickTranslation(bgAuxiliary.translations, null),
      romanLyric: pickRomanization(bgAuxiliary.romanizations, null),
      isBG: true,
      isDuet: false,
      isPriorityBg: false,
      agents,
    }));
  }
  return lines;
}

/** 构造规范化歌词行。 */
function makeLine(input) {
  const { words, agents } = input;
  const text = joinWords(words);
  const ruby = words
    .filter((word) => word.ruby && word.ruby.text)
    .map((word) => ({
      base: word.word.trim(),
      text: word.ruby.text,
      startTime: Number.isFinite(word.ruby.startTime) ? word.ruby.startTime : word.startTime,
      endTime: Number.isFinite(word.ruby.endTime) ? word.ruby.endTime : word.endTime,
    }));

  const agentMeta = agents.get(input.agent);

  return {
    key: input.key || '',
    songPart: input.songPart || '',
    agent: input.agent || '',
    agentName: agentMeta ? agentMeta.name : '',
    language: input.language || '',
    startTime: input.startTime,
    endTime: input.endTime,
    words: words.map((word) => ({
      startTime: word.startTime,
      endTime: word.endTime,
      word: word.word,
      agent: word.agent || '',
      ...(word.ruby && word.ruby.text ? { ruby: word.ruby.text } : {}),
      ...(word.emptyBeat ? { emptyBeat: true } : {}),
    })),
    text,
    translatedLyric: input.translatedLyric || '',
    romanLyric: input.romanLyric || '',
    isBG: Boolean(input.isBG),
    isDuet: Boolean(input.isDuet),
    isPriorityBg: Boolean(input.isPriorityBg),
    ...(ruby.length ? { ruby } : {}),
  };
}

/**
 * 拼接词文本为整行文本。
 *
 * TTML 的空白已经承载在词文本里（词间空格是词的一部分），因此：
 *  - 直接连接各词；
 *  - CJK 行清理 CJK 片段之间可能残留的空格（社区文件偶有多余空格）；
 *  - 拉丁行做一次空白折叠。
 *
 * @param {Array<{word: string}>} words 词数组
 * @returns {string} 整行文本
 */
export function joinWords(words) {
  if (!Array.isArray(words) || !words.length) return '';
  const parts = words.map((word) => word.word || '');
  const joined = parts.join('');
  const hasCJK = /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF]/.test(joined);
  if (hasCJK) {
    // CJK 行内不应出现英文分词空格；仅清理 CJK 片段之间的空格
    return joined
      .replace(/(?<=[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF]) +(?=[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF])/g, '')
      .trim();
  }
  return joined.replace(/\s{2,}/g, ' ').trim();
}

/** 取优先级最高的翻译。 */
function pickTranslation(inline, sidecar) {
  const candidates = [];
  for (const item of inline || []) candidates.push(item);
  for (const item of sidecar || []) candidates.push(item);
  if (!candidates.length) return '';
  const usable = candidates.filter((item) => item.priority < 99);
  if (!usable.length) return '';
  usable.sort((a, b) => a.priority - b.priority);
  return usable[0].text;
}

/** 取第一个音译。 */
function pickRomanization(inline, sidecar) {
  for (const item of inline || []) if (item.text) return item.text;
  for (const item of sidecar || []) if (item.text) return item.text;
  return '';
}

/** 上溯查找 `itunes:song-part`（写在 `<div>` 上时下放到 `<p>`）。 */
function findAncestorSongPart(element) {
  let node = element && element.parent;
  while (node) {
    const value = String(
      node.getAttribute('itunes:song-part')
      || node.getAttribute('itunes:songPart')
      || node.getAttribute('song-part')
      || '',
    ).trim();
    if (value) return value;
    node = node.parent;
  }
  return '';
}

/** 整行只由空拍构成时返回 true。 */
function isPureEmptyBeatLine(line) {
  const words = line.words || [];
  if (!words.length) return false;
  if (!words.every((word) => word.emptyBeat)) return false;
  return !/[^\s♪]/.test(line.text || '');
}

/** 毫秒格式化为 `M:SS.mmm`，用于警告文案。 */
function formatMs(ms) {
  const total = Math.max(0, ms) / 1000;
  const minutes = Math.floor(total / 60);
  const seconds = total - minutes * 60;
  return `${minutes}:${seconds.toFixed(3).padStart(6, '0')}`;
}

export default parseTtml;
