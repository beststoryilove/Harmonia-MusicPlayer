# Harmonia JS 模块结构

> 本文件说明 `js/main.js`（单体文件，约 1.3 万行）中各功能区的职责与关键函数。
> 代码已紧凑化，通过函数名前缀可快速定位：`init*` 初始化、`render*` 渲染、`fetch*` 网络请求、
> `handle*` 事件处理、`update*` 状态更新、`build*` 构造 HTML、`open/close*` 弹窗控制、`st*` 智能过渡。

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
| 播放控制 | `playSong`, `playFromPlaylist`, `getNextSongId`, `preloadNextSongForGapless`, 无逢隙 `onGaplessEnded` | 播放/切歌/预加载（ended 自动切歌在 `onGaplessEnded`；预加载按音源设置 crossorigin，见 `stApplySourceMediaAttrs`） |
| 智能过渡 | `stTimeUpdateHook`, `stTryStartTransition`, `stChooseEffect`, `stRunBassSwap`, `stPerformEchoOut`, `stRunVolumeMix`, `stEnsureMixer`, `stDetectBpm`, `stMeasureTail`, `stGetSongFeatures`, `stBuildPlan`, `stDetectKeyOf` | DJ 式混音引擎（非音量交叉淡化）：按结尾形态选效果——淡出结尾→bassSwap 低频交接（自建混音台，无需开 EQ，A/B 均可安全入图时）、骤然结尾→echoOut 回声收尾（尾部原料进 BPM 同步延迟反馈拖尾）、尾部静音→静音段浮现、分析失败→音量淡化+响度匹配；启动点吸附 4 拍小节边界，高置信鼓点歌轻对齐速度（±3%）；酷狗分析通路：桌面直连（跨域全放行），网页/手机经自建 cors 代理（Range 能力探测 7 天缓存，不支持则降级淡化）；负缓存分级 noCors 24h/networkFail 1h；分析缓存 localStorage（`stAnalysisCache5`，含 loudnessDb 与 ST6 的 key/energy），回声原料内存缓存 30 首；交接时响度匹配（matchGain 0.5-2）+4s 缓释；**ST6：调性 × 能量双维相容度**——`stBuildPlan` 用 A 尾 × B 头的 chroma/调性（Krumhansl-Schmuckler 24 调 + Camelot 轮相容度）与能量形态（满能量骤停 / 软起）产出**冻结 Plan**：调性冲突缩短同时发声时长（×0.45，下限 2s）、A 尾满能量骤停给足重叠（≥3s）、高相容旁路 B 侧低通、中性档 B 侧低通 700→20000 扫入、冲突档 700→12000（**由暗到亮**，方向恒为 to > from）、高相容 + 两侧 BPM 高置信且差距 ∈(3%,6%] 时变速放宽到 ±6%；调性不可信时一律沿用既有 0.65 + 旁路（零回归）；纯函数（效果选择/响度/匹配增益/代理URL/FFT/chroma/调性/相容度/能量形态/Plan）在 `js/lib/pure.js`。**调性可信度两重门槛**：① `computeHarmonyEvidence` **复音证据**——判定"所有显著谱峰能否被**单一拉伸谐波列**解释"（`f_h = h·f0·√(1+B·h²)`，B 粗到细扫描）：单一基频（含钢琴/钟的拉伸泛音）→ 证据 0；真实和声含多个独立基频 → 证据 ≥1。候选基频取**多个**（能量最强若干峰 + 最低峰）而非"最低峰即基频"——后者是错误假设，颤音素材的最低峰常是基频**下方**的弱边带，会导致真实基频被算错、谐波列整体"对不上"而凭空产生证据（实测颤音有害误报 19.0% → 6.5%）。单音（含 40 次谐波）证据恒为 0，此时 `detectKey` **fail-closed** 返回无效（不回退 bestR），因为一个音高不是"调性"（E 既属 C 大调也属 E 大调）；② 熵折扣 `minEntropy=0.85` + `ST_KEY_CONF_MIN=0.75`（两值与 pure.js 的 `keyConfMin` 缺省值均由单测守卫）。**已知残余**：低音区（82/110Hz）+快颤音（6.5Hz）的边带间距恰约为一个半音，与"两个相隔半音的真实音"在稳态频谱上不可区分（表示层局限） |
| 歌词 | `parseLyrics`（LRC 家族）、`parseWordLyrics`（YRC/QRC）、`parseKugouKrc`（KRC）、`parseTTMLContentToAMLLLines`（TTML）、`renderAMLLLines`, `updateAMLyricsHighlight`, `normalizeAMLLLine`, `amllSetLyricLinesNoBurst`, `applyAMLLProcessConfig`, IndexedDB 缓存 `getCachedLyrics` | 歌词解析/渲染/高亮/缓存。解析优先走 AMLL 官方 parser（`parseLrcLike`/`parseYrc`/`parseQrc`/`parseTTML`），手写实现降级为兜底；高行数歌词由 core 0.6.0 内置的渲染范围门控按需构建（渲染器不降级、行不合并） |
| 搜索 | `searchMusic`, `displaySearchResults`, `updatePagination` | 搜索/结果/分页 |
| 歌单 | `createPlaylist`, `addTrackToPlaylist`, `syncKugouPlaylists`, `renderPlaylists` | 歌单 CRUD（含酷狗同步） |
| 酷狗 | `fetchKugouVipDetail`, `loginKugou`, `initKugouQrLogin`, `runKugouVipClaimAndUpgrade` | 酷狗 API 与 VIP |
| 均衡器 | `ensureEqAudioGraph`, `applyEqToGraph`, `persistAndRefreshEqUi` | Web Audio EQ（CORS 探测 + 自动关闭） |
| 分享 | `generateShareCard`, `downloadPoster` | 分享卡片（canvas） |
| MV | `fetchAndPlayMV`, `setMvPlaceholder` | MV 播放 |
| PiP | `openDesktopLyricsPip`, `openPipPlayer`, `closePipPlayer`, `syncPipLyrics`, `schedulePipLyricsSync`, `computeNextSyncDelayMs`, `adjustLyricsThemeColor` | 画中画（两窗口互斥，封面按 src 指纹更新；歌词同步按行密度自适应节奏；桌面歌词字体颜色随封面亮度自适应：白/黑字切换 + 中间调背景推向对比侧，经 CSS 变量由 updateTheme 换歌时刷新） |
| 主题 | `initTheme`, `toggleTheme` | 主题切换（body.light-theme） |
| 设置 | `saveAllSettings`, `loadTranslationSettings`, `loadVisualSettings`, `loadEqSettings` | 设置持久化 |
| 统计 | `accumulateStats`, `saveStatsThrottled`, `renderStats` | 播放统计（5s 节流落盘） |
| 初始化 | `init()` | 入口（文件主体唯一调用一次，勿重复调用） |

## AMLL 歌词引擎

引擎版本：`@applemusic-like-lyrics/core@0.6.0` + `@applemusic-like-lyrics/lyric@1.1.0`。

**交付方式**：本地 vendor bundle（`js/vendor/amll-core.bundle.mjs`、`js/vendor/amll-lyric.bundle.mjs`、
`css/vendor/amll-core.css`），由 `tools/amll-build/` 用 esbuild 构建（详见该目录 `build.mjs` 头部说明）。
运行时按 `本地 vendor → esm.sh → esm.sh 重试` 顺序加载，CDN 仅作兜底
（原备用源 jsdelivr 在部分网络下已不可达，故改为 esm.sh 重试）。

> ⚠️ **JS 与 CSS 必须同版本**。`main.html` 引用的 `css/vendor/amll-core.css` 要与
> `js/vendor/amll-core.bundle.mjs` 出自同一次构建。二者错配不会报错，但会静默破坏渲染：
> 曾出现引擎升 0.6.0、样式仍为 0.5.1 的事故——0.6.0 改用 mask-image 渐变做逐字高亮，
> 依赖 `--bright-mask-alpha` / `--dark-mask-alpha` 与 `.FmKaba_gradientMask`（0.5.1 样式均无），
> 变量缺失时 JS 兜底双双取 1，渐变两侧同色 → **所有歌词一律全白，失去逐字高亮**。
> 现在由 `tests/js/amll-lyrics.test.js` 的版本一致性用例守住（含类名交叉校验）。

**升级注意（0.5.1 → 0.6.0 的破坏性变更）**：

| 变更 | 影响 |
|------|------|
| `calcLayout(force, immediate)` → `calcLayout(reason)` | 传旧的两个布尔参数会让 `LayoutReasonStrategyMap[reason]` 取到 `undefined` 并在解引用时抛错；须改传 `LayoutReason` 值（取自 core 模块导出，勿硬编码字符串） |
| 渲染门控重构：`isInSight`/`applyAlphaToDom` → `isInRenderRange()` + 行组 `isUiDirty` | 原先「拦截 update + 等尺寸就绪 + 强制 calcLayout」的防构建风暴 hack 与 `renderStyles` 缓存补丁均已移除：0.6.0 只在行进入渲染范围时才 `rebuildElement()`，且用脏标记避免重复写样式 |
| 新增 `updateLyricProcessConfig` / `setEnableAutoSeekDetection` | `applyAMLLProcessConfig` 用前者批量下发优化项与掩码配置，避免多次重建视图 |

**生命周期**：`registerAMLLUnloadCleanup` 在 `pagehide` 时取消自建 rAF 并调用 `dispose()`
（文档「时序与生命周期 · 清理」检查清单）。切换渲染器路径同样会先 `deactivateAMLLRenderer` 再重建。

**解析分工**（官方优先、手写兜底，两条路径都保留以应对社区格式变体）：

| 格式 | 官方 parser | 兜底实现 | 备注 |
|------|------------|---------|------|
| LRC / LRC A2 / SPL / ESLyric | `parseLrcLike` | `pure.js:parseLyrics` | 官方支持 SPL 规范时间戳（毫秒不足 3 位后位补 0）、显式行结尾、行内逐字标记 |
| 网易云 YRC / QQ 音乐 QRC | `parseYrc` / `parseQrc` | `parseWordLyricsLegacy` | 官方额外做「整行圆括号 → 背景行并去括号」等规范化 |
| 酷狗 KRC | —（私有格式） | `parseKugouKrc` | 官方无对应实现 |
| TTML | `parseTTML` | `simpleTTMLToAMLLLines` | 官方支持 Apple 风格 Head Sidecar（`iTunesMetadata` 翻译/音译）、`tts:ruby` 注音、`amll:obscene`、`amll:empty-beat`、`x-bg` 嵌套 |

适配层 `adaptAmllTtmlLines` / `amllLinesToLegacyWordLines` 位于 `js/lib/pure.js`（纯函数，
`node --test` 直接覆盖），`main.js` 中为委托封装。

**注意**：`normalizeAMLLWord` 必须透传 `ruby` / `obscene` / `emptyBeat` / `romanWord`。
这些字段曾在归一化时被重建丢弃，导致解析层解析正确却渲染不出注音与掩码。
其中 `emptyBeat` 是**数值**节拍数（`amll:empty-beat="2"`，官方用 `parseInt` 解析，
写成 `"true"` 会得到 NaN 被丢弃），`obscene` 为布尔。

## 错误处理

- 网络请求统一走 `wrappedFetch`（25s 超时 + AbortController）
- UI 错误通过 `showError(msg, ms)` 显示在灵动岛
- 关键操作（init、login、search、play）外层 try/catch 兜底
- 全局 `window.onerror` / `unhandledrejection` 兜底（console.error）

## 交接模型（智能过渡，2026-10-02 收敛）

智能过渡的**交接**与**状态复位**各由单一函数承载，替代原先 4 份逐字复制的 `finish` 尾段：

| 函数 | 职责 |
|---|---|
| `stHandoff(opts)` | **唯一交接实现**。`opts.nextSong` / `opts.matchGain` / `opts.targetVol` / `opts.onBeforeA`（各 runner 专属的包络复位回调，在 A 侧交接前执行）。B 出错时自行调 `stCleanup` 并返回 `false` —— **返回值仅供诊断，调用点不消费它** |
| `stResetTransitionState(nextSong, matchGain)` | 交接后的公共状态复位：过渡标志、预载句柄、特征交接（下一首→当前）、响度缓释 |

**止血点：交接不再清空 B 的已缓冲数据。** 旧写法是 `audioPlayer.src = audioPlayerB.src`
之后 `audioPlayerB.src = ''` —— 只搬 URL 字符串却丢掉 B 已就绪的缓冲，迫使 A 重新发起请求并
重新缓冲，**这是换歌瞬间卡顿的机制性根因**。现改为：B 仍被 `pause` 且音量归零（不会串音），
但**保留 `src`**，供同 URL 复用。该不变量由
`HarmoniaApp/tests/smart-transition-handoff.test.js` 守卫（`node --test`，逐文件运行）。

⚠️ **两条调用方须知**（评审结论，勿踩）：
1. `stHandoff` 返回 `false` 时降级**已在函数内部完成**，调用点不得依赖返回值决定流程。
2. "不清空 B"是**有条件的**：B 出错分支会先调 `stCleanup` 再提前 return，而 `stCleanup`
   自己的清理带 `if (!audioPlayerB.error)` 守卫 —— 亦即该路径上 `B.src` **不会被清**，
   出错时 B 保留的是失效/过期的 `src`。**交接后不得假设 `B.src` 有有效值**，
   一切"B 是否可用"的判断必须继续走 `gaplessPreloadUrl` / `preloadedOk` 守卫。

**为何不做「角色指针交换」**：曾计划引入 `stActiveRole`，让两个 `<audio>` 交替担任在播角色、
交接只切指针不碰 `src`。**该设计不可行**：音频图按元素建立且不可迁移
（`createMediaElementSource` 每元素仅可建一次），且 A/B 两通道职责不对等 ——
`stMixAGain` 是可听通道（增益=主音量）、`stMixBGain` 是淡化通道（增益=0）且**多一个
`stMixBLP` 低通**。只翻转角色指针而不重绑图通道，会让接手元素挂在增益 0 的链上 → **静音**。
若将来要做，需先解耦"逻辑角色"与"物理图通道"、在交接时交换节点绑定，并补充
**运行时音频证据**（守卫测试无法证明没有静音）。详见实施计划 Task 5 开头。

## 注意事项

- `main.js` 为全局作用域单体脚本，无模块化/构建步骤；新增函数注意命名冲突
- `js/` 目录部署 `main.js`、`stFlacRepair.js`（FLAC/WAV 无损音源尾部修复）与 `MODULES.md`
- 顶层 localStorage 读取必须走 `safeJsonParse`，避免存储损坏导致整站白屏
- `init()` 只在文件主体执行一次（`<script defer>` 加载），勿在 DOMContentLoaded 中再次调用
- 动态 import 的相对说明符须以 `./` 开头并以 `document.baseURI` 归一：`main.js` 位于 `/js/` 下，
  直接用 `'js/vendor/x.mjs'` 会被当成裸模块说明符而解析失败
