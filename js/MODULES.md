# Harmonia JS 模块结构

> 本文件说明 `app.js` 中各功能区的职责与关键函数。代码已紧凑化（无空行/注释），
> 通过函数名前缀可快速定位：`init*` 初始化、`render*` 渲染、`fetch*` 网络请求、
> `handle*` 事件处理、`update*` 状态更新、`build*` 构造 HTML。

## 顶层基础设施（文件首部）

| 符号 | 职责 |
|------|------|
| `L.get / L.set / L.del` | localStorage 统一读写 |
| `el(id)` | document.getElementById 简写 |
| `qs(s)` | document.querySelector 简写 |
| `qsa(s)` | document.querySelectorAll 简写 |
| `__rafAdd / __rafCaf` | 统一 requestAnimationFrame 调度器 |

## 功能区概览

| 区段 | 关键函数 | 说明 |
|------|----------|------|
| DOM 缓存 | `dynamicIsland`, `searchInput`, `audioPlayer`... | 全局 DOM 引用 |
| 状态 | `isPlaying`, `currentSongInfo`, `playlist`... | 应用状态 |
| 灵动岛 | `toggleDynamicIsland`, `expandDynamicIsland`, `showDynamicIslandToast` | 灵动岛展开/收起/提示 |
| 播放控制 | `playSong`, `playFromPlaylist`, `playTrack` | 播放/暂停/切歌 |
| 歌词 | `parseLyrics`, `renderAMLLLines`, `updateAMLyricsHighlight` | 歌词解析/渲染/高亮 |
| 搜索 | `searchMusic`, `displaySearchResults`, `updatePagination` | 搜索/结果/分页 |
| 歌单 | `createPlaylist`, `addToPlaylist`, `syncKugouPlaylists` | 歌单 CRUD |
| 酷狗 | `fetchKugouVipDetail`, `loginKugou`, `initKugouQrLogin` | 酷狗 API |
| 均衡器 | `ensureEqAudioGraph`, `applyEqToGraph` | Web Audio EQ |
| 分享 | `generateShareCard`, `downloadPoster` | 分享卡片 |
| MV | `fetchAndPlayMV`, `openMvModal` | MV 播放 |
| PiP | `openDesktopLyricsPip`, `openPipPlayer` | 画中画 |
| 主题 | `initTheme`, `toggleTheme` | 主题切换 |
| 设置 | `saveSettings`, `loadTranslationSettings` | 设置持久化 |
| 初始化 | `init()` | 入口，按序调用上述初始化 |

## 错误处理

- 网络请求统一走 `wrappedFetchWithRetry`（含重试 + 错误上报）
- UI 错误通过 `showError(msg, ms)` 显示在灵动岛
- 关键操作（init、login）外层 try/catch 兜底

## 日志

- 开发期 `console.log` 已清理
- 保留 `console.warn`（AMLL 预加载失败等）
- 保留 `console.error`（初始化失败等）
