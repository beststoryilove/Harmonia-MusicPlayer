#!/usr/bin/env node
/**
 * Markdown → Harmonia 条款页面（单文件 HTML）
 *
 * 为什么自研而不引入 marked/markdown-it：
 *   1. 站点承诺零运行时依赖，条款页也应保持自包含；
 *   2. 本项目文档只用到有限语法（标题/表格/引用/列表/行内样式），
 *      自研可精确控制输出，避免第三方解析器带来的行为差异。
 *
 * 支持的语法：
 *   # / ## / ### 标题、| 表格 |、> 引用（可嵌套列表）、- 无序列表、
 *   1. 有序列表（含缩进嵌套）、--- 分隔线（渲染为留白）、
 *   行内：**粗体**、`代码`、[链接](url)、<自动链接>
 *
 * 用法：
 *   node tools/md-to-page.mjs --in=docs/隐私政策.md --out=privacy.html \
 *        --nav-current=privacy --desc="..."
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const argv = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=?(.*)$/);
    return m ? [m[1], m[2] === '' ? true : m[2]] : [a, true];
  })
);

const IN = argv.in ? path.resolve(ROOT, String(argv.in)) : null;
const OUT = argv.out ? path.resolve(ROOT, String(argv.out)) : null;
const DESC = String(argv.desc || 'Harmonia 音乐播放器条款页面');
const CURRENT = String(argv['nav-current'] || '');

if (!IN || !OUT) {
  console.error('用法: node tools/md-to-page.mjs --in=<md> --out=<html> [--desc=...] [--nav-current=privacy|agreement]');
  process.exit(2);
}

const escapeHtml = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** 行内解析：代码 > 转义 > 自动链接 > 链接 > 粗体 */
function inline(text) {
  const codes = [];
  let s = String(text).replace(/`([^`]+)`/g, (_m, c) => {
    codes.push(c);
    return `\u0000C${codes.length - 1}\u0000`;
  });

  s = escapeHtml(s);

  // 自动链接：<https://...>
  s = s.replace(/&lt;(https?:\/\/[^\s&]+)&gt;/g,
    (_m, url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);

  // 行内链接：[文本](url)
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,
    (_m, t, u) => `<a href="${u}" target="_blank" rel="noopener noreferrer">${t}</a>`);

  // 粗体
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // 还原代码（内容再次转义，确保 <用户数据目录> 之类按字面显示）
  s = s.replace(/\u0000C(\d+)\u0000/g, (_m, i) => `<code>${escapeHtml(codes[+i])}</code>`);
  return s;
}

const isTableSep = (l) => /^\|[\s:|-]+\|$/.test(l.trim()) && l.includes('-');
const isTableRow = (l) => /^\s*\|.*\|\s*$/.test(l);
const splitRow = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());

const LIST_RE = /^(\s*)([-*]|\d+\.)\s+(.*)$/;

function renderList(items) {
  let i = 0;
  const build = (level) => {
    const ordered = items[i].ordered;
    const tag = ordered ? 'ol' : 'ul';
    let out = `<${tag}>`;
    while (i < items.length && items[i].indent === level && items[i].ordered === ordered) {
      const it = items[i];
      i++;
      let inner = '';
      if (i < items.length && items[i].indent > level) inner = build(items[i].indent);
      out += `<li>${inline(it.text)}${inner}</li>`;
    }
    return out + `</${tag}>`;
  };
  let html = '';
  while (i < items.length) html += build(items[i].indent);
  return html;
}

/** 块级解析（供正文与引用内部复用） */
function parseBlocks(lines) {
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();

    if (!line) { i++; continue; }

    // 分隔线：交由 CSS 的章节间距表达，不额外画线
    if (/^-{3,}$/.test(line)) { i++; continue; }

    // 表格
    if (isTableRow(raw) && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const header = splitRow(raw);
      const aligns = splitRow(lines[i + 1]).map((c) =>
        c.startsWith(':') && c.endsWith(':') ? 'center' : c.endsWith(':') ? 'right' : 'left');
      i += 2;
      const rows = [];
      while (i < lines.length && isTableRow(lines[i])) { rows.push(splitRow(lines[i])); i++; }
      let t = '<div class="tbl-wrap"><table><thead><tr>';
      header.forEach((h, k) => { t += `<th style="text-align:${aligns[k] || 'left'}">${inline(h)}</th>`; });
      t += '</tr></thead><tbody>';
      for (const r of rows) {
        t += '<tr>';
        for (let k = 0; k < header.length; k++) {
          t += `<td style="text-align:${aligns[k] || 'left'}">${inline(r[k] ?? '')}</td>`;
        }
        t += '</tr>';
      }
      t += '</tbody></table></div>';
      out.push(t);
      continue;
    }

    // 引用（内部递归解析，支持引用里嵌列表）
    if (/^>\s?/.test(raw)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      out.push(`<blockquote>${parseBlocks(buf)}</blockquote>`);
      continue;
    }

    // 标题
    let m;
    if ((m = raw.match(/^###\s+(.*)$/))) { out.push(`<h3>${inline(m[1])}</h3>`); i++; continue; }
    if ((m = raw.match(/^##\s+(.*)$/))) {
      const text = m[1];
      const id = slug(text);
      out.push(`<h2 id="${id}">${inline(text)}</h2>`);
      i++; continue;
    }
    if ((m = raw.match(/^#\s+(.*)$/))) { out.push(`<h1>${inline(m[1])}</h1>`); i++; continue; }

    // 列表（收集连续的列表行，保留缩进层级）
    if (LIST_RE.test(raw)) {
      const items = [];
      while (i < lines.length && LIST_RE.test(lines[i])) {
        const mm = lines[i].match(LIST_RE);
        const indent = Math.floor(mm[1].replace(/\t/g, '  ').length / 2);
        items.push({ indent, ordered: /\d/.test(mm[2]), text: mm[3] });
        i++;
      }
      out.push(renderList(items));
      continue;
    }

    // 段落：合并连续非空、非块级起始的行
    const buf = [line];
    i++;
    while (i < lines.length) {
      const nxt = lines[i];
      const nt = nxt.trim();
      if (!nt || /^[#>|]/.test(nt) || LIST_RE.test(nxt) || /^-{3,}$/.test(nt)) break;
      buf.push(nt);
      i++;
    }
    out.push(`<p>${inline(buf.join(' '))}</p>`);
  }

  return out.join('\n');
}

function slug(text) {
  const plain = text.replace(/[*`]/g, '').trim();
  return 'sec-' + plain.replace(/[^\w\u4e00-\u9fa5]+/g, '-').replace(/^-|-$/g, '');
}

/* ────────────────────────── 页面样式（沿用 tiaokuan.html 的液态玻璃） ────────────────────────── */
const CSS = `
    @font-face{src:url(fonts/PingFangSC-Regular.woff2);font-family:"PingFangSC-Regular";font-display:swap}
    @font-face{src:url(fonts/sf-pro-display_regular.woff2);font-family:"SFPro-Regular";font-display:swap}
    @font-face{src:url(fonts/PingFangSC-Semibold.woff2);font-family:"PingFangSC-Semibold";font-display:swap}
    @font-face{src:url(fonts/sf-pro-display_semibold.woff2);font-family:"SFPro-Semibold";font-display:swap}

    :root{
      --bg:#000;
      --ink:#f5f5f7;
      --ink-2:rgba(255,255,255,.72);
      --ink-3:rgba(255,255,255,.48);
      --hairline:rgba(255,255,255,.09);
      --accent:#ff2d55;
      --accent-soft:rgba(255,45,85,.12);
      --font-body:"SFPro-Regular","PingFangSC-Regular",-apple-system,"Segoe UI","Microsoft YaHei",sans-serif;
      --font-head:"SFPro-Semibold","PingFangSC-Semibold",-apple-system,"Segoe UI","Microsoft YaHei",sans-serif;
    }

    *{margin:0;padding:0;box-sizing:border-box}
    html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}

    body{
      font-family:var(--font-body);
      color:var(--ink);
      line-height:1.85;
      background:
        radial-gradient(1100px 620px at 82% -10%, rgba(255,45,85,.09), transparent 62%),
        radial-gradient(900px 560px at -12% 108%, rgba(88,86,214,.08), transparent 60%),
        var(--bg);
      background-attachment:fixed;
      min-height:100vh;
      -webkit-font-smoothing:antialiased;
      text-rendering:geometricPrecision;
    }

    ::selection{background:rgba(255,45,85,.38);color:#fff}

    .page{max-width:760px;margin:0 auto;padding:44px 28px 72px}

    /* ── 顶部导航 ── */
    .topbar{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:36px}
    .brand{display:flex;align-items:center;gap:12px;text-decoration:none;border:none}
    .brand-mark{
      width:34px;height:34px;border-radius:10px;flex-shrink:0;
      background:linear-gradient(135deg,#ff2d55,#b8345f);
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 6px 18px rgba(255,45,85,.22);
    }
    .brand-mark svg{width:17px;height:17px;fill:#fff}
    .brand-name{font-family:var(--font-head);font-size:15px;font-weight:600;letter-spacing:.3px;color:var(--ink-2)}
    .navlinks{display:flex;gap:8px;flex-wrap:wrap}
    .navlinks a{
      font-size:12.5px;color:var(--ink-3);text-decoration:none;border:1px solid var(--hairline);
      border-radius:999px;padding:5px 13px;transition:color .18s ease,border-color .18s ease,background .18s ease;
    }
    .navlinks a:hover{color:var(--ink);border-color:rgba(255,255,255,.22)}
    .navlinks a.active{color:var(--ink);background:var(--accent-soft);border-color:rgba(255,45,85,.35)}

    h1{
      font-family:var(--font-head);
      font-size:32px;line-height:1.32;font-weight:700;
      letter-spacing:.3px;color:var(--ink);
      margin-bottom:14px;
    }

    /* ── 目录 ── */
    .toc{
      margin:26px 0 8px;padding:16px 20px;
      background:rgba(255,255,255,.035);
      border:1px solid var(--hairline);border-radius:14px;
    }
    .toc-title{font-family:var(--font-head);font-size:11.5px;font-weight:700;color:var(--accent);letter-spacing:2px;margin-bottom:10px}
    .toc ol{list-style:none;margin:0;columns:2;column-gap:26px}
    .toc li{padding-left:0;margin-bottom:5px}
    .toc li::before{content:none}
    .toc a{font-size:13px;color:var(--ink-2);text-decoration:none;border-bottom:none}
    .toc a:hover{color:#ff7d97}

    /* ── 正文 ── */
    section{margin-top:46px}
    h2{
      font-family:var(--font-head);font-size:21px;font-weight:700;letter-spacing:.2px;
      padding-bottom:13px;margin-bottom:18px;border-bottom:1px solid var(--hairline);
      scroll-margin-top:20px;
    }
    h3{
      font-family:var(--font-head);
      font-size:15.5px;font-weight:600;color:var(--ink);
      margin:26px 0 10px;
    }
    p{font-size:14.5px;color:var(--ink-2);margin-bottom:12px}
    ul,ol{margin:4px 0 14px;padding-left:0}
    ul{list-style:none}
    ul li{
      font-size:14.5px;color:var(--ink-2);
      padding-left:18px;position:relative;margin-bottom:7px;
    }
    ul li::before{
      content:"";position:absolute;left:2px;top:.92em;
      width:5px;height:5px;border-radius:50%;
      background:var(--accent);opacity:.75;
    }
    ul ul{margin:7px 0 4px}
    ol{list-style:none;counter-reset:item}
    ol li{
      font-size:14.5px;color:var(--ink-2);
      padding-left:26px;position:relative;margin-bottom:7px;counter-increment:item;
    }
    ol li::before{
      content:counter(item) ".";
      position:absolute;left:2px;top:0;
      font-family:var(--font-head);font-size:13px;color:var(--accent);opacity:.85;
    }
    ol ol{margin:7px 0 4px}

    strong{color:var(--ink);font-weight:600}
    code{
      font-family:ui-monospace,SFMono-Regular,Consolas,"Courier New",monospace;
      font-size:.88em;color:var(--ink);
      background:rgba(255,255,255,.07);
      border:1px solid var(--hairline);
      border-radius:6px;padding:1px 6px;
      word-break:break-all;
    }
    a{color:#ff7d97;text-decoration:none;border-bottom:1px solid rgba(255,125,151,.35);transition:color .18s ease,border-color .18s ease}
    a:hover{color:#ffa5b5;border-bottom-color:currentColor}

    /* ── 表格 ── */
    .tbl-wrap{overflow-x:auto;margin:6px 0 18px;border:1px solid var(--hairline);border-radius:12px}
    table{border-collapse:collapse;width:100%;font-size:13.5px;min-width:420px}
    th,td{padding:10px 13px;border-bottom:1px solid var(--hairline);vertical-align:top;color:var(--ink-2)}
    th{
      font-family:var(--font-head);font-weight:600;font-size:12.5px;color:var(--ink);
      background:rgba(255,255,255,.04);letter-spacing:.3px;white-space:nowrap;
    }
    tbody tr:last-child td{border-bottom:none}
    td strong{color:var(--ink)}

    /* ── 引用 / 提示块 ── */
    blockquote{
      margin:16px 0;padding:15px 18px;
      background:var(--accent-soft);
      border:1px solid rgba(255,45,85,.18);
      border-radius:14px;
    }
    blockquote p,blockquote li{color:rgba(255,255,255,.82);font-size:14px}
    blockquote p:last-child,blockquote ul:last-child,blockquote ol:last-child,blockquote blockquote:last-child{margin-bottom:0}
    blockquote ul li::before{background:var(--accent);opacity:.9}
    blockquote code{background:rgba(255,255,255,.1)}

    /* ── 页脚 ── */
    footer{margin-top:52px;padding-top:24px;border-top:1px solid var(--hairline)}
    .foot-meta{font-size:12px;color:var(--ink-3);text-align:center;margin-bottom:22px}
    .foot-actions{display:flex;flex-direction:column;align-items:center;gap:14px}
    .back{
      display:inline-flex;align-items:center;gap:7px;
      padding:11px 26px;border-radius:999px;
      background:rgba(255,255,255,.06);
      border:1px solid rgba(255,255,255,.13);
      color:var(--ink);font-size:14px;font-weight:600;
      text-decoration:none;
      transition:background .18s ease,border-color .18s ease,transform .18s ease;
    }
    .back .arrow{transition:transform .18s ease}
    .back:hover{background:rgba(255,45,85,.14);border-color:rgba(255,45,85,.4)}
    .back:hover .arrow{transform:translateX(-3px)}
    .foot-repo{font-size:12.5px;color:var(--ink-3)}
    .foot-repo a{color:var(--ink-2);border-bottom:none}
    .foot-repo a:hover{color:var(--ink)}

    /* ── 响应式 ── */
    @media (max-width:640px){
      .page{padding:32px 20px 56px}
      h1{font-size:26px}
      h2{font-size:19px}
      p,li{font-size:14px}
      .toc ol{columns:1}
      section{margin-top:38px}
      .topbar{margin-bottom:26px}
    }

    @media print{
      body{background:#fff;color:#000}
      .brand-mark{box-shadow:none}
      .back,.navlinks,.toc{display:none}
      p,li,td,th,.foot-meta,.foot-repo{color:#333}
      strong,h1,h2,h3{color:#000}
      code{background:#f2f2f2;border-color:#ddd}
      a{color:#c4003a;border-bottom-color:#c4003a}
      blockquote{background:#fdf2f4;border-color:#f3c3cd}
      footer{border-color:#ddd}
      th{background:#f7f7f7}
    }
`;

const FAVICON_SVG = '<svg viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>';

/* ────────────────────────── 主流程 ────────────────────────── */
const md = fs.readFileSync(IN, 'utf8').replace(/\r\n/g, '\n');
const lines = md.split('\n');

// 标题：取第一个 # 行
const h1Match = md.match(/^#\s+(.*)$/m);
const pageTitle = h1Match ? h1Match[1].replace(/[*`]/g, '').trim() : 'Harmonia';
// 正文：去掉 h1 行（页面单独渲染 h1）
const bodyLines = lines.filter((l, idx) => !(idx === lines.indexOf(h1Match ? h1Match[0] : '\u0000')));

const bodyHtml = parseBlocks(bodyLines);

// 目录：由 h2 生成
const tocItems = [...md.matchAll(/^##\s+(.*)$/gm)].map((m) => ({
  text: m[1].replace(/[*`]/g, '').trim(),
  id: slug(m[1]),
}));
const toc = tocItems.length
  ? `<nav class="toc"><div class="toc-title">目录</div><ol>${tocItems
      .map((t) => `<li><a href="#${t.id}">${escapeHtml(t.text)}</a></li>`)
      .join('')}</ol></nav>`
  : '';

// 正文按 h2 切分为 <section>，让长文档有清晰分段
const sectioned = bodyHtml
  .split(/(?=<h2 id=)/)
  .map((chunk, idx) => (idx === 0 ? chunk : `<section>${chunk}</section>`))
  .join('\n');

const navLink = (href, label, key) =>
  `<a href="${href}"${CURRENT === key ? ' class="active"' : ''}>${label}</a>`;

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="theme-color" content="#000000">
  <meta name="description" content="${escapeHtml(DESC)}">
  <title>${escapeHtml(pageTitle)} · Harmonia</title>
  <style>${CSS}  </style>
</head>
<body>
  <main class="page">

    <div class="topbar">
      <a class="brand" href="index.html">
        <div class="brand-mark" aria-hidden="true">${FAVICON_SVG}</div>
        <span class="brand-name">Harmonia</span>
      </a>
      <div class="navlinks">
        ${navLink('privacy.html', '隐私政策', 'privacy')}
        ${navLink('agreement.html', '用户协议', 'agreement')}
        <a href="main.html">进入播放器</a>
      </div>
    </div>

    <h1>${escapeHtml(pageTitle)}</h1>

${toc}

${sectioned}

    <footer>
      <div class="foot-meta">最后修订：2026年10月3日 · 版本 v3.0</div>
      <div class="foot-actions">
        <a class="back" href="main.html">
          <span class="arrow">←</span> 返回 Harmonia 播放器
        </a>
        <span class="foot-repo">开源仓库 · <a href="https://github.com/beststoryilove/Harmonia-MusicPlayer" target="_blank" rel="noopener noreferrer">GitHub</a></span>
      </div>
    </footer>

  </main>
</body>
</html>
`;

fs.writeFileSync(OUT, html, 'utf8');
console.log(`✓ ${path.relative(ROOT, IN)}  ->  ${path.relative(ROOT, OUT)}`);
console.log(`  ${Buffer.byteLength(html, 'utf8')} B   标题: ${pageTitle}   目录项: ${tocItems.length}`);
