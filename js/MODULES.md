# Harmonia JS 模块结构

> 本文件说明 `js/main.js`（单体文件，约 1.1 万行）中各功能区的职责与关键函数。
> 代码已紧凑化，通过函数名前缀可快速定位：`init*` 初始化、`render*` 渲染、`fetch*` 网络请求、
> `handle*` 事件处理、`update*` 状态更新、`build*` 构造 HTML、`open/close*` 弹窗控制。

## 顶层基础设施（文件首部）

| 符号 | 职责 |
|------|------|
| `el(id)` | document.getElementById 简写 |
| `qs(s)` / `qsa(s)` | document.querySelector / querySelectorAll 简写 |
| `safeCall(fn,...)` | 捕获异常的调用包装 |
| `safeJsonParse(v, fb)` | JSON.parse 的 try/catch 包装（顶层存储读取统一使用） |
| `escapeHtml(s)` | HTML 文本转义（含引号，可用于属性上下文） |
| `window.onerror / unhandledrejection` | 全局未捕获错误兜底（console） |

## 功能区概览

| 区段 | 关键函数 | 说明 |
|------|----------|------|
| DOM 缓存 | `dynamicIsland`, `searchInput`, `audioPlayer`... | 全局 DOM 引用（启动时一次性缓存） |
| 状态 | `isPlaying`, `currentSongInfo`, `playlist`, `favorites`, `history`, `playlists`, `harmoniaStats` | 应用状态（顶层 let，多处直接修改） |
| 网络 | `wrappedFetch`（25s 超时 + AbortController）、`withKugouRequestDedup` | 统一请求与去重 |
| 灵动岛 | `toggleDynamicIsland`, `expandDynamicIsland`, `showDynamicIslandToast` | 灵动岛展开/收起/提示 |
| 播放控制 | `playSong`, `playFromPlaylist`, `getNextSongId`, `preloadNextSongForGapless`, 无逢隙 `onGaplessEnded` | 播放/切歌/预加载（ended 自动切歌在 `onGaplessEnded`） |
| 歌词 | `parseLyrics`（LRC/YRC/QRC/KRC/TTML）、`renderAMLLLines`, `updateAMLyricsHighlight`, IndexedDB 缓存 `getCachedLyrics` | 歌词解析/渲染/高亮/缓存 |
| 搜索 | `searchMusic`, `displaySearchResults`, `updatePagination` | 搜索/结果/分页 |
| 歌单 | `createPlaylist`, `addTrackToPlaylist`, `syncKugouPlaylists`, `renderPlaylists` | 歌单 CRUD（含酷狗同步） |
| 酷狗 | `fetchKugouVipDetail`, `loginKugou`, `initKugouQrLogin`, `runKugouVipClaimAndUpgrade` | 酷狗 API 与 VIP |
| 均衡器 | `ensureEqAudioGraph`, `applyEqToGraph`, `persistAndRefreshEqUi` | Web Audio EQ（CORS 探测 + 自动关闭） |
| 分享 | `generateShareCard`, `downloadPoster` | 分享卡片（canvas） |
| MV | `fetchAndPlayMV`, `setMvPlaceholder` | MV 播放 |
| PiP | `openDesktopLyricsPip`, `openPipPlayer`, `closePipPlayer`, `syncPipLyrics` | 画中画（两窗口互斥，封面按 src 指纹更新） |
| 主题 | `initTheme`, `toggleTheme` | 主题切换（body.light-theme） |
| 设置 | `saveAllSettings`, `loadTranslationSettings`, `loadVisualSettings`, `loadEqSettings` | 设置持久化 |
| 统计 | `accumulateStats`, `saveStatsThrottled`, `renderStats` | 播放统计（5s 节流落盘） |
| 初始化 | `init()` | 入口（文件主体唯一调用一次，勿重复调用） |

## 错误处理

- 网络请求统一走 `wrappedFetch`（25s 超时 + AbortController）
- UI 错误通过 `showError(msg, ms)` 显示在灵动岛
- 关键操作（init、login、search、play）外层 try/catch 兜底
- 全局 `window.onerror` / `unhandledrejection` 兜底（console.error）

## 注意事项

- `main.js` 为全局作用域单体脚本，无模块化/构建步骤；新增函数注意命名冲突
- `js/` 目录仅部署 `main.js` 与 `MODULES.md`（备份脚本已归档至 `backup_20260802/`）
- 顶层 localStorage 读取必须走 `safeJsonParse`，避免存储损坏导致整站白屏
- `init()` 只在文件主体执行一次（`<script defer>` 加载），勿在 DOMContentLoaded 中再次调用
