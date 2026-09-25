# Vendored 代码说明

本目录**不是本项目编写**，原样取自同一工作区内的另一个子项目：

| 文件 | 来源 | 大小 |
|---|---|---|
| `xml.js` | `Harmonia-DesktopLyrics-Next/src/core/xml.js` | 14.6 KB |
| `ttml.js` | `Harmonia-DesktopLyrics-Next/src/core/ttml.js` | 40.3 KB |

**未作任何修改。** 升级上游后如需同步，直接重新复制这两个文件即可。

## 为什么原样复制而不是改写或走 npm

1. **浏览器安全**：两个文件都不依赖 DOM，也不依赖 Node API
   （文档注释里明确说明「渲染进程不能依赖浏览器 DOM 解析器做单元测试」），
   因此同一份代码在浏览器与 `node --test` 下行为一致 —— 本 demo 的纯逻辑测试
   正是靠这一点才能覆盖真实解析结果。

2. **比主项目的解析器完整**。主项目 TTML 通路用自写的
   `simpleTTMLToAMLLLines`（`Harmonia/js/main.js:5087`），而本解析器额外正确处理：

   - 行内 `ttm:agent` 换声部 → 按声部切分为独立行（同一 `<p>` 拆成多行）；
   - `ttm:role="x-bg"` 背景人声 → 提取为独立行，且**按 `<p>` 而非按声部片段**
     收集，避免行内多声部时背景行被重复插入；
   - Apple `iTunesMetadata` sidecar 的翻译 / 音译（按 `itunes:key` 关联）；
   - `tts:ruby` 注音；
   - 缺失 `end` 时按「下一个 `<p>` 的起点 → 兜底时长」推断；
   - 三种时间格式混用（`HH:MM:SS.mmm` / `12.3s` / 裸秒数）。

3. **它是 9 个方案的共同输入**。若每个方案各自解析，对比的就成了解析差异
   而不是渲染差异 —— 那会让整个 demo 失去意义。

## 输出契约

`parseTtml(text)` 返回：

```js
{
  lines: [{
    key, songPart, agent, agentName, language,
    startTime, endTime,            // 毫秒
    words: [{ startTime, endTime, word, agent?, ruby?, emptyBeat? }],
    text,
    translatedLyric, romanLyric,
    isBG, isDuet, isPriorityBg,
    ruby?: [{ base, text, startTime, endTime }],
  }],
  metadata, agents, primaryAgent, timing, language, warnings, recovered,
}
```

本 demo 的 `js/model.js` 在这个形状之上做规范化（补 `endMs` / `role` /
`index`，按起点排序，丢弃无法定时的行）。

## 单元测试

上游自带 `Harmonia-DesktopLyrics-Next/tests/ttml.test.js`（26 KB）覆盖该解析器。
本 demo 的 `tests/model.test.js` 则在其**输出之上**验证与渲染相关的结构不变量
（角色分布、重叠簇峰值、背景行跨主行结尾、行内换声部拆分等）。
