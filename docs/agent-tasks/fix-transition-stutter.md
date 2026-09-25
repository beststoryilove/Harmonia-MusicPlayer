# 任务提示词：修复智能过渡/交叉淡化时的音频播放卡顿

你是一个独立工作的编码 agent。请在修复前使用「系统化调试」方法（先定位根因，禁止猜测式修复），
本提示词提供了你所需的全部上下文。

## 项目与环境

- 仓库根目录：`E:\DeepseekHarness`
- 这是一个音乐播放器 Web 应用，主文件为 `E:\DeepseekHarness\Harmonia\main.html`，
  全部逻辑在 `E:\DeepseekHarness\Harmonia\js\main.js`（单文件约 1.3 万行，零缩进风格）。
  另有 `E:\DeepseekHarness\HarmoniaApp\` 下的打包副本，**本轮只改 `Harmonia\js\main.js`**，
  不要动副本。
- 页面通常以 `file://` 协议直接打开（`file:///E:/DeepseekHarness/Harmonia/main.html`）。
- 音源分两款：**酷狗（kugou）** 与 **网易云（netease）**，均通过
  `https://music-api.gdstudio.xyz/api.php?...` API 取播放链接。
- 有一个可运行的 Node 单测：`E:\DeepseekHarness\Harmonia\tests\flac-repair.test.mjs`
  （改完必须保证它仍全绿）。改动后请 `node --check Harmonia/js/main.js` 校验语法。

## 要修的 Bug（症状）

- 歌曲过渡（智能过渡 SmartTransition，或交叉淡化 crossfade）时，**音频播放会卡顿一下**。
- 卡顿同时控制台持续报错（一直存在）：
  ```
  [Gapless] 预加载音频错误: 4 file:///E:/DeepseekHarness/Harmonia/main.html
  ```
- `4` 是 `MediaError` 的 `MEDIA_ERR_SRC_NOT_SUPPORTED`（不支持的源）。
- 有时伴随：
  ```
  [酷狗] 无损（HQ） 未返回可播放链接，回退到 320 MP3
  Error fetching audio URL: Error: 酷狗未返回可播放链接
  [Gapless] 预加载失败: 酷狗未返回可播放链接
  [Gapless] 预加载失败: 网络请求失败（网络或服务端无响应），请检查网络后重试
  ```

## 你已经具备的已知事实（务必先消化）

1. **`src=main.html` 不等于 B 真的指向主页**：`audioPlayerB` 是
   `main.html` 里的 `<audio id="audioPlayerB" style="display:none"></audio>`（无 src 属性）。
   **在 JS 里把 `.src` 设成空串 `''` 后再读 `.src` 属性，会解析成页面地址**
   （空串按文档基址解析 = `main.html`）。所以"错误 4 + src=main.html"的真正含义是：
   **错误发生时 `audioPlayerB.src` 是空的**，即 B 缓冲没有有效音频可播。
2. **B 的 src 由 `preloadNextSongForGapless(nextSong)` 设置**（main.js 约 11240 行起）：
   `getAudioUrl()` → `audioPlayerB.src = audioUrl` → `audioPlayerB.load()`。
   若 `getAudioUrl` 返回的酷狗链接实际不可播（无版权/VIP/网络超时），`audioPlayerB.load()`
   就会触发 error（code 4）。
3. **错误监听**（main.js 约 11365 行）：
   ```js
   audioPlayerB.addEventListener('error', function onGaplessBufferError() {
     console.warn('[Gapless] 预加载音频错误:', audioPlayerB.error?.code, audioPlayerB.src);
     gaplessPreloadUrl = null;
     gaplessPreloadedSongId = null;
   });
   ```
   **它一触发就清空 `gaplessPreloadUrl`/`gaplessPreloadedSongId`**，导致过渡时
   B 无有效预加载源 → 淡入没有东西可播 → **卡顿**。
4. 多处代码会把 `audioPlayerB.src = ''` 清空：main.js 约 10720、10837、10993、11120、
   11338、11509 行（各过渡的 `finish()`/清理路径）。
5. 过渡逻辑里大量用 `if (!gaplessPreloadUrl || !audioPlayerB.src || audioPlayerB.src === window.location.href) return false;`
   作为"B 无有效源"的守卫——说明"B.src 为空即回退"是既定设计。

## 关键代码位置（main.js 行号，可能因后续改动偏移，请用 grep 定位）

- `preloadNextSongForGapless`：B 预加载入口，`audioPlayerB.src = audioUrl; ... audioPlayerB.load();`
- `getAudioUrl(id, source, song)`：取播放链接；kugou 走 `getKugouAudioUrlByHash`，
  失败时抛"酷狗未返回可播放链接"。
- `onGaplessBufferError`：B 的 error 监听（约 11365）。
- `stRunVolumeMix` / `stRunBassSwap` / `stPerformEchoOut` / `performCrossfadeToNext`：
  过渡执行，均在 `finish()` 里清 B 的 src。
- `stEnsureNextPreloaded`：预加载触发。

## 建议的排查路径（系统化，别跳步）

1. **复现并取证**：先在浏览器 DevTools 观察——过渡卡顿发生时，`onGaplessBufferError`
   是不是在过渡启动前触发（预加载阶段）？还是过渡中（play 阶段）？B 当时 src 是什么？
   `gaplessPreloadUrl` 是否已因 error 被清空？
2. **区分两类根因**：
   - (A) **预加载源本身拿不到/不可播**：`getAudioUrl` 对酷狗返回的 URL 为空/失效/403
     （无版权、VIP、或 `[酷狗] 无损 未返回链接回退 320` 后仍未拿到）。这类是"拿不到源"，
     过渡本应优雅回退到普通切歌，而不是卡顿。
   - (B) **src 被误清或 load() 时机错误**：例如错误监听无条件清了
     `gaplessPreloadUrl`，或某清理路径在 B 需要播放时把它 src 清空导致 code 4。
3. **针对卡顿本身**：过渡依赖"B 已就绪"。若 B 预加载失败，现有守卫会 `return false`
   走普通切歌——但可能切歌瞬间音量/时间不同步造成"卡顿一下"。请确认失败路径是否
   **静默**退化，还是制造了听感断裂。
4. **候选方向（供验证，不预判为答案）**：
   - 预加载失败时，是否仍进入了过渡逻辑并尝试 `audioPlayerB.play()`（对空 src）？
   - `onGaplessBufferError` 清 `gaplessPreloadUrl` 后，过渡触发前的守卫是否正确挡住？
   - 失败后是否应该走 `audioPlayer.ended` 的普通 `playSong`，而不是残留 B 状态？
   - 音量交接瞬间音量跳变的时间点是否对齐（`audioPlayer.currentTime` 与 B 对齐）。

## 硬性约束

1. **先根因后修复**：禁止"先试改一个看行不行"。必须在代码与运行时证据上定位失败的那一环。
2. **不得破坏已修复的功能**（本仓库近期刚完成、且已验证）：
   - 无损（FLAC/M4A）音源的**智能过渡尾部修复**（`js/stFlacRepair.js` 连续流方案，
     `main.js` 里 `_headRaw/_tailCopy/stTryRepairTail`）——这是功能，别改坏；
   - **后台标签页平滑过渡**：淡入淡出已从 rAF 改为 `setInterval` 驱动（`stFadeStart/stFadeStop`），
     别改回 rAF。刷新页面时留意这些结构仍在。
3. **改动范围**：只改 `Harmonia\js\main.js`（必要时 `Harmonia\js\stFlacRepair.js`），
   不改 `HarmoniaApp\` 副本；需要时可加诊断日志，但修复应尽量自包含。
4. **验证**：改完 `node --check` + 跑 `Harmonia\tests\flac-repair.test.mjs` 仍全绿；
   若你无法在浏览器实测，请给出清晰的、可让用户复现收证的步骤，并说明你的变化点。
5. 提交信息用中文，`fix:` 前缀，`git -C E:\DeepseekHarness add/commit <明确文件>`，
   只提交你本次改的文件，避免带入无关改动。

## 验收标准

- 过渡时不再出现 `[Gapless] 预加载音频错误: 4` 的连带卡顿，或至少失败时能**平滑回退**（无听感硬切/卡顿）。
- 无损尾段修复与后台平滑过渡功能不回退。
- 单测保持全绿。
