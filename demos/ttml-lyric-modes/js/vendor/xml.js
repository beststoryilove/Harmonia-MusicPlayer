/**
 * 极简 XML 解析器（零依赖，Node 与浏览器通用）。
 *
 * 为什么不直接用 DOMParser / 第三方 XML 库：
 *  - 渲染进程不能依赖浏览器 DOM 解析器做单元测试（node:test 环境无 DOM）；
 *  - TTML 只需要「元素 + 属性 + 文本 + 命名空间」四件事，完整 XML 库过重；
 *  - 必须在任意位置容错（社区 TTML 库存在未声明前缀、缺失闭合标签等脏数据）。
 *
 * 本解析器不做 DTD 处理（TTML 不使用 DTD）。
 * 设计约束：只读、不抛异常（脏输入降级为可解析的最优结果），保证歌词链路永不因解析失败而中断。
 */

/** 内置实体表（XML 预定义五种 + 常用排版实体）。 */
const NAMED_ENTITIES = Object.freeze({
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00A0',
  // 中文歌词库中偶见直接写入的 HTML 实体
  ldquo: '\u201C',
  rdquo: '\u201D',
  lsquo: '\u2018',
  rsquo: '\u2019',
  hellip: '\u2026',
  mdash: '\u2014',
  ndash: '\u2013',
});

/**
 * 解码 XML 实体与数字字符引用。
 *
 * @param {string} text 原始文本
 * @returns {string} 解码后的文本
 */
function decodeEntities(text) {
  if (!text || text.indexOf('&') === -1) return text || '';
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (match, body) => {
    if (body.charAt(0) === '#') {
      const isHex = body.charAt(1) === 'x' || body.charAt(1) === 'X';
      const digits = isHex ? body.slice(2) : body.slice(1);
      const code = parseInt(digits, isHex ? 16 : 10);
      // 非法码位（NaN / 越界 / 代理区）原样保留，避免产出替换字符污染歌词
      if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return match;
      if (code >= 0xd800 && code <= 0xdfff) return match;
      try {
        return String.fromCodePoint(code);
      } catch (_) {
        return match;
      }
    }
    const named = NAMED_ENTITIES[body];
    return named === undefined ? match : named;
  });
}

/**
 * XML 元素节点。
 *
 * 与 DOM 的差异（有意为之）：
 *  - `attrs` 保留前缀原名（`ttm:role`）与展开名（`role`）两套访问方式；
 *  - 无父指针，避免循环引用（便于 JSON 快照与结构化克隆）。
 */
class XmlElement {
  /**
   * @param {string} name 限定名（含前缀，如 `ttm:agent`）
   * @param {string} localName 去前缀名（如 `agent`）
   * @param {string} prefix 命名空间前缀（如 `ttm`，无前缀为空串）
   * @param {Record<string,string>} attrs 属性表（键为限定名原文）
   */
  constructor(name, localName, prefix, attrs) {
    this.type = 'element';
    this.name = name;
    this.localName = localName;
    this.prefix = prefix;
    /** @type {Record<string,string>} 限定名 → 值 */
    this.attrs = attrs;
    /** @type {XmlNode[]} */
    this.children = [];
    /**
     * 父元素（根为 null）。
     *
     * 定义为不可枚举：既能让 TTML 解析器上溯查找 `<div itunes:song-part>`，
     * 又不会让 `JSON.stringify(doc)` 因循环引用而抛错。
     * @type {XmlElement|null}
     */
    Object.defineProperty(this, 'parent', {
      value: null,
      writable: true,
      enumerable: false,
      configurable: true,
    });
  }

  /**
   * 读取属性，兼容前缀写法与去前缀写法。
   *
   * 覆盖面：`getAttribute('ttm:role')` 与 `getAttribute('role')` 都能命中
   * `ttm:role="x-bg"`。社区 TTML 里两种写法都真实存在（有的库导出时丢前缀）。
   *
   * @param {string} name 属性名（可带前缀，也可不带）
   * @returns {string} 属性值；不存在时返回空串
   */
  getAttribute(name) {
    if (!name) return '';
    if (Object.prototype.hasOwnProperty.call(this.attrs, name)) {
      const direct = this.attrs[name];
      return direct === undefined || direct === null ? '' : String(direct);
    }
    // 去前缀匹配：请求 'role' 时也接受 'ttm:role'
    const bare = name.replace(/^.*:/, '');
    if (Object.prototype.hasOwnProperty.call(this.attrs, bare)) {
      const value = this.attrs[bare];
      return value === undefined || value === null ? '' : String(value);
    }
    // 反向匹配：请求 'ttm:role' 时也接受裸写的 'role'
    const suffix = ':' + bare;
    for (const key of Object.keys(this.attrs)) {
      if (key.length > suffix.length && key.endsWith(suffix)) {
        const value = this.attrs[key];
        return value === undefined || value === null ? '' : String(value);
      }
    }
    return '';
  }

  /** @returns {boolean} 是否存在该属性（同 getAttribute 的前缀兼容规则） */
  hasAttribute(name) {
    if (!name) return false;
    if (Object.prototype.hasOwnProperty.call(this.attrs, name)) return true;
    const bare = name.replace(/^.*:/, '');
    if (Object.prototype.hasOwnProperty.call(this.attrs, bare)) return true;
    const suffix = ':' + bare;
    return Object.keys(this.attrs).some((key) => key.length > suffix.length && key.endsWith(suffix));
  }

  /**
   * 递归收集后代元素。
   *
   * @param {string} [localName] 限定去前缀名；省略则返回全部后代
   * @returns {XmlElement[]} 文档序（前序）结果
   */
  getElementsByTagName(localName) {
    const out = [];
    const want = localName ? localName.replace(/^.*:/, '') : '';
    const walk = (node) => {
      for (const child of node.children) {
        if (child.type !== 'element') continue;
        if (!want || child.localName === want) out.push(child);
        walk(child);
      }
    };
    walk(this);
    return out;
  }

  /**
   * 取第一个匹配的后代元素。
   *
   * @param {string} localName 去前缀名
   * @returns {XmlElement|null}
   */
  querySelector(localName) {
    const found = this.getElementsByTagName(localName);
    return found.length ? found[0] : null;
  }

  /**
   * 直系子元素。
   *
   * @param {string} [localName] 去前缀名过滤
   * @returns {XmlElement[]}
   */
  childElements(localName) {
    const want = localName ? localName.replace(/^.*:/, '') : '';
    return this.children.filter(
      (child) => child.type === 'element' && (!want || child.localName === want),
    );
  }

  /**
   * 拼接全部文本内容（含后代），已解码实体。
   *
   * @returns {string}
   */
  get textContent() {
    let out = '';
    for (const child of this.children) {
      if (child.type === 'text' || child.type === 'cdata') out += child.value;
      else if (child.type === 'element') out += child.textContent;
    }
    return out;
  }

  /**
   * 仅直系文本节点的原始拼接（不含后代元素文本），已解码实体。
   *
   * 逐字歌词需要区分「本 span 的直接文本」与「嵌套子 span 的文本」：
   * 例如 `<span begin><span begin>词</span></span>` 的直系文本为空，
   * 若误用 textContent 会把子词重复计入父级。
   *
   * @returns {string}
   */
  get directText() {
    let out = '';
    for (const child of this.children) {
      if (child.type === 'text' || child.type === 'cdata') out += child.value;
    }
    return out;
  }

  /** @returns {string} 便于调试的树形摘要 */
  toString() {
    return `<${this.name} ${Object.entries(this.attrs).map(([k, v]) => `${k}="${v}"`).join(' ')}>`;
  }
}

/** XML 文本节点。 */
class XmlText {
  /** @param {string} value 已解码文本 */
  constructor(value) {
    this.type = 'text';
    this.value = value;
  }
}

/** 顶层文档容器，形状对齐 `DOMParser` 的 Document 用法（只暴露用到的部分）。 */
class XmlDocument {
  /** @param {XmlElement} root 根元素（`<tt>`） */
  constructor(root) {
    this.documentElement = root;
    /** 是否为容错解析（输入存在结构问题，已尽力修复） */
    this.recovered = false;
    /** @type {string[]} 解析期发现的非致命问题 */
    this.warnings = [];
  }

  /** @inheritDoc XmlElement.getElementsByTagName */
  getElementsByTagName(localName) {
    return this.documentElement.getElementsByTagName(localName);
  }

  /** @inheritDoc XmlElement.querySelector */
  querySelector(localName) {
    return this.documentElement.querySelector(localName);
  }
}

/** 标签扫描正则。属性区允许无值属性（容错），值支持单/双引号。 */
const TAG_RE = /<(\/?)([A-Za-z_][\w.:-]*)((?:\s+[\w.:-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'))?)*)\s*(\/?)>/g;
const ATTR_RE = /([\w.:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'))?/g;

/**
 * 剥离 XML 声明、注释与 DOCTYPE。
 *
 * 必须在标签扫描前完成：这些构造以 `<!` / `<?` 开头，不匹配 TAG_RE，
 * 若留着会被当作标签之间的普通文本，污染 `textContent` 并把声明串进歌词。
 *
 * @param {string} text XML 原文
 * @returns {string} 可安全扫描的正文
 */
function stripProlog(text) {
  return text
    .replace(/<\?[\s\S]*?\?>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<!DOCTYPE[^>[]*(?:\[[\s\S]*?\])?[^>]*>/gi, '');
}

/**
 * 解析属性串。
 *
 * @param {string} raw 属性区原文（不含标签名）
 * @returns {Record<string,string>} 属性表（值已解码实体）
 */
function parseAttrs(raw) {
  const attrs = Object.create(null);
  if (!raw) return attrs;
  ATTR_RE.lastIndex = 0;
  let match;
  while ((match = ATTR_RE.exec(raw)) !== null) {
    attrs[match[1]] = decodeEntities(match[2] !== undefined ? match[2] : match[3]);
  }
  return attrs;
}

/**
 * 解析 XML 文本为文档树。
 *
 * 容错策略：
 *  - 未闭合标签在 EOF 处自动补全；
 *  - 遇到与栈顶不匹配的闭合标签时，向上查找同名祖先并弹出（丢弃中间层）；
 *  - 注释、`<?xml?>` 声明、`<!DOCTYPE>` 一律跳过；
 *  - CDATA 段先遮蔽再扫描，避免其中的 `<` 被误判为标签；
 *  - 完全不抛异常：无根元素时返回仅含空 `<tt>` 的文档。
 *
 * @param {string} source XML 原文
 * @returns {XmlDocument} 解析结果
 */
function parseXml(source) {
  const raw = typeof source === 'string' ? source : String(source == null ? '' : source);
  const doc = new XmlDocument(new XmlElement('tt', 'tt', '', Object.create(null)));
  if (!raw) {
    doc.recovered = true;
    doc.warnings.push('输入为空');
    return doc;
  }

  const prologStripped = stripProlog(raw);
  const { masked, cdataParts, cdataWarnings } = maskCData(prologStripped);
  for (const warning of cdataWarnings) doc.warnings.push(warning);
  const text = masked;

  /** @type {XmlElement[]} 元素栈，栈底为根占位元素 */
  const stack = [doc.documentElement];
  let cursor = 0;
  let sawRoot = false;
  TAG_RE.lastIndex = 0;
  let match;

  while ((match = TAG_RE.exec(text)) !== null) {
    // 标签之间的文本归属当前栈顶
    if (match.index > cursor) {
      const chunk = unmaskCData(decodeEntities(text.slice(cursor, match.index)), cdataParts);
      if (chunk !== '') stack[stack.length - 1].children.push(new XmlText(chunk));
    }
    cursor = TAG_RE.lastIndex;

    const isClosing = match[1] === '/';
    const name = match[2];
    const rawAttrs = match[3] || '';
    const selfClosing = match[4] === '/';

    if (isClosing) {
      // 从栈顶向下找同名元素；找不到说明是游离闭合标签，直接忽略
      for (let i = stack.length - 1; i >= 1; i -= 1) {
        if (stack[i].name === name) {
          stack.length = i;
          break;
        }
      }
      continue;
    }

    const colonAt = name.indexOf(':');
    const prefix = colonAt === -1 ? '' : name.slice(0, colonAt);
    const localName = colonAt === -1 ? name : name.slice(colonAt + 1);
    const attrs = parseAttrs(rawAttrs);

    if (!sawRoot) {
      // 首个元素无论叫什么，都并入预置的根元素，保证 documentElement 引用稳定。
      // 不压栈：栈底即根元素本身，其子节点自然归属正确。
      sawRoot = true;
      const root = doc.documentElement;
      root.name = name;
      root.localName = localName;
      root.prefix = prefix;
      root.attrs = attrs;
      continue;
    }

    const element = new XmlElement(name, localName, prefix, attrs);
    const parent = stack[stack.length - 1];
    element.parent = parent;
    parent.children.push(element);
    if (!selfClosing) stack.push(element);
  }

  // 尾部残余文本
  if (cursor < text.length) {
    const chunk = unmaskCData(decodeEntities(text.slice(cursor)), cdataParts);
    if (chunk.trim()) stack[stack.length - 1].children.push(new XmlText(chunk));
  }

  if (stack.length > 1) {
    doc.recovered = true;
    doc.warnings.push(`存在 ${stack.length - 1} 个未闭合标签（已自动补全）`);
  }
  if (!sawRoot) {
    doc.recovered = true;
    doc.warnings.push('未找到任何元素');
  }

  return doc;
}

/** CDATA 遮蔽哨兵：以 NUL 包裹，既不匹配标签正则也不含实体字符。 */
const CDATA_OPEN = '\u0000';
const CDATA_CLOSE = '\u0001';

/**
 * 将 CDATA 段替换为等长哨兵串，使标签扫描不会进入 CDATA 内部。
 *
 * 哨兵长度与原文无关（`\u0000{n}\u0001`），因此不能用「保持索引」的简单替换；
 * 这里采用整体替换 + 解析后还原，索引一致性由替换后的字符串统一决定，无需额外对齐。
 *
 * @param {string} text 已剥离序言的正文
 * @returns {{masked: string, cdataParts: string[], cdataWarnings: string[]}}
 */
function maskCData(text) {
  const cdataParts = [];
  const cdataWarnings = [];
  let out = '';
  let cursor = 0;
  while (cursor < text.length) {
    const open = text.indexOf('<![CDATA[', cursor);
    if (open === -1) {
      out += text.slice(cursor);
      break;
    }
    out += text.slice(cursor, open);
    const close = text.indexOf(']]>', open + 9);
    if (close === -1) {
      cdataWarnings.push('CDATA 段未闭合（已按到文末处理）');
      cdataParts.push(text.slice(open + 9));
      out += CDATA_OPEN + (cdataParts.length - 1) + CDATA_CLOSE;
      break;
    }
    cdataParts.push(text.slice(open + 9, close));
    out += CDATA_OPEN + (cdataParts.length - 1) + CDATA_CLOSE;
    cursor = close + 3;
  }
  return { masked: out, cdataParts, cdataWarnings };
}

/**
 * 把哨兵还原为 CDATA 原文。
 *
 * 含哨兵的文本节点保持为普通文本节点（值即 CDATA 原文），
 * 因为 TTML 中 CDATA 只用于承载歌词文本，无需保留 CDATA 语义边界。
 *
 * @param {string} text 含哨兵的文本
 * @param {string[]} parts CDATA 原文表
 * @returns {string} 还原后的文本
 */
function unmaskCData(text, parts) {
  if (text.indexOf(CDATA_OPEN) === -1) return text;
  return text.replace(
    new RegExp(CDATA_OPEN + '(\\d+)' + CDATA_CLOSE, 'g'),
    (whole, index) => {
      const value = parts[Number(index)];
      return value === undefined ? whole : value;
    },
  );
}

export {
  parseXml,
  decodeEntities,
  XmlDocument,
  XmlElement,
  XmlText,
};
