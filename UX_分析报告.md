# Harmonia 用户体验分析发现

> 分析日期：2025-07 | 覆盖范围：main.html(1027行), main.js(13099行), CSS 全部, README.md
> 分析维度：交互反馈、可发现性、可访问性、错误处理、移动触屏、一致性、状态持久化

---

## 🚨 U1 严重（体感阻断）

| # | 问题 | 位置 | 用户影响 | 建议 |
|---|------|------|----------|------|
| U1-1 | **Tab 键全局劫持**：`document.addEventListener('keydown')` 中 Tab 键无条件 `e.preventDefault()` + `toggleDynamicIsland()`，且此检查在 INPUT/TEXTAREA 过滤之前执行 | `main.js:12848-12853` | 纯键盘用户完全无法使用 Tab 导航页面；即使在搜索输入框内打字，按 Tab 也会收起灵动岛而非移到下一焦点。**整个应用的键盘可达性归零** | 移除 Tab 劫持，改用其他键（如 `Ctrl+Tab`）切换灵动岛；或仅在非输入焦点时劫持 |
| U1-2 | **主音频播放器无错误监听**：`audioPlayer.addEventListener('error', ...)` 不存在——仅 `audioPlayerB`(预加载缓冲) 有错误处理 | `main.js:11664` (B 的错误处理)；对比：主 `audioPlayer` 无任何 `'error'` 监听 | 音源 404、CORS 拒绝、解码失败时，用户无任何反馈；播放按钮停留在"暂停"图标，歌曲静默中断 | 添加 `audioPlayer.addEventListener('error', ...)` 显示 Toast 错误及恢复建议（如换源/下一首） |
| U1-3 | **进度条和音量条仅支持 `mousedown`/`mousemove` 拖拽**，无 `touchstart`/`pointerdown` 处理 | `main.js:7223-7248` (进度条), `7423-7446` (音量条) | 触屏设备无法拖拽进度条/音量条；只能点击跳转（`click` 事件可工作，但无法精细拖动）。iOS Safari 的 `mousedown` 从 `touchstart` 合成延迟约 300ms，体验差 | 改用 `pointerdown`/`pointermove`/`pointerup` 统一触控和鼠标；或附加 `touchstart`/`touchmove` 分支 |
| U1-4 | **模态框无焦点圈闭 (focus trap)**：settings / MV / share / lyrics-rerequest / player-more 五个模态框均无焦点管理 | `main.html:144-696` (settings), `904-927` (MV), `933-952` (share), `117-126` (lyrics-rerequest), `954-1022` (player-more) | 打开模态框后 Tab 仍被劫持（见 U1-1），无法在模态内导航；点击外部区域可关闭（仅 overlay click），但键盘用户无法 Escape 关闭——实则 Escape 全局处理了（12854），但 tab 循环完全缺失 | 为每个模态框实现 focus trap：打开时保存上一个焦点，关闭时恢复；限制 Tab 循环在模态框内 |
| U1-5 | **搜索输入时灵动岛反复折叠**：`searchMusic` 调用 `startRequest()` → 灵动岛折叠为"正在请求中"状态；成功后 `expandDynamicIsland()` 重新展开。300ms 防抖触发每次按键 | `main.js:6352` (startRequest), `2487-2498` (折叠逻辑), `6374` (expandDynamicIsland) | 用户打字时搜索面板不断折叠→展开→折叠，输入框视觉上下文丢失；`.island-suppress-focus` 抑制了聚焦环（`base.css:5`），焦点指示器不可见 | 搜索进行中时保持灵动岛展开，仅更新 collapsed text 状态；或仅在首次搜索/翻页时折叠 |
| U1-6 | **Toast 消息与灵动岛折叠态文字复用同一 DOM 元素**：`showDynamicIslandToast` 将消息写入 `collapsedTextSpan.textContent`，覆盖"正在播放"状态 | `main.js:2439-2468` | 播放状态标识被临时覆盖；toast 期间用户看不到"正在播放"；多条快速 toast 排队显示但不保留原始文字 | 实现独立的 Toast 容器（DOM 层），不占用状态标识区域 |

---

## ⚠️ U2 高

| # | 问题 | 位置 | 用户影响 | 建议 |
|---|------|------|----------|------|
| U2-1 | **首次使用无空态引导**：初始状态播放列表为空、封面为 1px GIF、显示"歌曲标题/未知歌手"；无任何新人引导或功能提示 | `main.js:1667` (playlist = []), `main.html:815-822` (占位文字), `main.js:8597-8620` (init 无引导) | 新用户打开页面后不知如何开始：没有"搜索试试"提示、没有"添加歌曲"入口引导 | 首页空态添加引导卡片：搜索提示、示例歌单、快速开始步骤；`#playlistItems` 为空时显示引导插图 |
| U2-2 | **搜索框焦点在灵动岛折叠期间丢失且无可见指示器**：`expandDynamicIsland` 调用 `searchInput.focus()` + `.island-suppress-focus` 抑制 outline；每次搜索折叠后视觉焦点丢失 | `main.js:2995-2998` (toggle 展开), `3022-3024` (expand 展开), `base.css:5` (suppress-focus 移除 outline) | 键盘用户不知道焦点在哪；屏幕阅读器感知不到焦点位置 | 移除 `suppress-focus` 类，改用自定义聚焦样式（如增大内发光）；折叠时不从搜索框移走焦点 |
| U2-3 | **触屏目标尺寸多处低于 44px 最小标准**：歌词控制按钮 36×36、侧边栏关闭 36×36、设置关闭按钮 24px 字体、拖拽手柄 20×20、音量滑块 12px、进度条 12px | `player.css:227-231` (btn-small 20px), `player.css:127-132` (progress-container 12px), `player.css:334-348` (volume-slider 12px), `sidebar.css:7` (sidebar-close 36×36), `responsive.css` (settings-close-btn 24px), `search.css:1` (drag-handle 20×20) | 触屏用户难以精确点按；误触率高；WCAG 2.2 触控目标尺寸不达标 | 将所有交互目标扩至 ≥44×44px（含 padding）；进度条/音量条交互区域至少 44px 高 |
| U2-4 | **错误消息通过 Toast 呈现且过短**：`showError` 默认 3s 消失，调用 `showDynamicIslandToast`；错误消息被覆盖在灵动岛折叠态，3000ms 后自动消失 | `main.js:2242-2247` (showError 3s), `2439-2468` (showDynamicIslandToast) | 用户阅读复杂错误消息（如"酷狗凭证已失效，请重新登录"）时消息已消失；错误消息与正常 toast 共用同一通道，用户无法区分 | 严重错误使用独立持久化模态框或横幅；错误消息至少 5s 或手动关闭 |
| U2-5 | **右键菜单 / 长按菜单已移除但 README 仍声明存在**：注释 `main.js:3379` 明确"移除右键/长按'加入歌单'菜单，改用按钮触发"；但 README 第 69 行仍宣传"右键菜单「加入歌单」（含长按触屏支持）" | `main.js:3379` (注释), `README.md:69` (功能声明) | 用户按 README 期望使用右键/长按无反应；功能承诺与实现不一致 | 更新 README 移除该声明；或重新实现长按/右键菜单 |
| U2-6 | **均衡器（EQ）10 段——核心功能——被埋藏在"实验性功能"设置页签下**：EQ 开关、预设、10 段微调、前级增益均在"实验性功能"标签内，而非独立的"音频"标签 | `main.html:541-584` (EQ 在 experimental tab), `main.html:153` (audio tab 仅包含音源与音质) | 用户找不到 EQ 功能；"实验性"标签内的 EQ 被视为不稳定，降低信任度；该 Tab 还包含翻译、缓存、歌词来源等大量不相关内容 | 将 EQ 移至"音频"标签；"实验性功能"只保留真正实验性的 AI 翻译和 MV |
| U2-7 | **播放中歌曲被删除时静默暂停**：`removeFromPlaylist` 如果当前播放歌曲被删除，`audioPlayer.pause()` 但不通知用户，也不自动切到下一首 | `main.js:3625-3641` (removeFromPlaylist 3630-3634) | 用户侧边栏删除歌曲后突然静音，困惑"歌怎么停了"；无任何反馈 | 删除当前播放歌曲时自动播放下一首（若有）；显示 Toast"当前歌曲已移除，自动播放下一首" |
| U2-8 | **搜索实时触发（300ms 防抖）而非按 Enter 提交**：`searchInput.addEventListener('input', debounce(...))` 每次按键都触发 API 请求 | `main.js:7133` | 快速打字时产生大量 API 请求（浪费带宽）；用户可能还没打完字搜索就执行了；同时触发了 U1-5 的折叠问题 | 改为 Enter 提交 + 搜索按钮点击触发；保留 input 防抖仅用于"搜索建议"（如果实现的话） |
| U2-9 | **设置页存在"立即保存"和"自动保存"混合范式**：视觉/歌词/音频设置切换即自动保存；AI 翻译设置需点击"保存设置"按钮（`saveAllSettings`） | `main.js:2805-2842` (saveAllSettings), `main.html:417` (保存按钮) | 用户对"哪些设置需保存"产生困惑；翻译 API 密钥已输入但未保存时关闭设置弹窗丢失数据 | 所有设置统一自动保存；移除"保存设置"按钮，或在关闭弹窗时自动保存未保存的翻译设置 |
| U2-10 | **清空收藏/历史无确认且无反馈**：收藏/历史标签下点击"清空列表"直接 `favorites = []` / `history = []`，无任何确认对话框，无 Toast 提示，且无法撤销；播放列表标签下第一击仅进入勾选模式（未删除），两处行为不一致 | `main.js:4106-4113` (直接清空 favorites/history), `4095-4105` (playlist 需两击) | 用户误触即永久丢失全部收藏/历史，无挽回余地；同一按钮在三个标签下的行为完全不同 | 清空收藏/历史前用自定义确认框（"将删除全部 N 首，此操作不可撤销"）；删除后提供撤销 toast |

---

## 📋 U3 中

| # | 问题 | 位置 | 用户影响 | 建议 |
|---|------|------|----------|------|
| U3-1 | **`aria-label` 覆盖不完整**：SVG 图标按钮（如 `playerStarBtn` 收藏星、`playerMoreBtn` 更多菜单）无 `role="button"` 和 `tabindex`，不可键盘聚焦；HTML 中部分按钮有 aria-label 但 JS 动态生成的列表项缺少 | `main.html:825-832` (SVG 无 role/tabindex), `main.js:6442-6465` (搜索结果的 action 按钮无 aria-label) | 屏幕阅读器用户无法识别收藏按钮；搜索结果中的"加入播放列表""收藏""加入歌单"按钮无标签 | SVG 交互元素添加 `role="button"` + `tabindex="0"` + `aria-label`；动态生成的按钮传入 aria-label |
| U3-2 | **QR 码轮询失败无声**：`setInterval` 扫码轮询中网络错误仅 `console.error`，不更新 UI 状态 | `main.js:10140-10142` (catch 块仅 console.error) | 用户扫码后网络波动，轮询静默失败，状态停留在"请在手机确认"或"登录成功"（不一致），用户不知道需重试 | 轮询错误时更新状态提示"网络波动，正在重试…"；连续失败后显示"重新获取二维码"按钮 |
| U3-3 | **双击歌名/歌词无操作**：README 未声明双击功能，但常见音乐播放器（如 Apple Music）双击歌词可跳转；此处双击无任何反应 | 无对应代码（确认无 dblclick 监听） | 用户期望双击歌词跳转到该时间点，但未实现 | 添加歌词双击跳转功能（`lyrics` 区域的 `.item` 绑定 `dblclick` → `audioPlayer.currentTime`） |
| U3-4 | **快捷键列表不包括 Tab 键**：`SHORTCUTS` 数组不含 Tab（灵动岛切换），设置面板的快捷键列表未显示 Tab | `main.js:12823-12837` (SHORTCUTS 无 Tab), `main.js:8808-8825` (fillList 仅遍历 SHORTCUTS) | 用户从 README 知道 Tab 有功能，但设置面板中找不到，产生困惑 | 在 SHORTCUTS 中添加 Tab 条目或在快捷键列表单独渲染 |
| U3-5 | **CapsLock 开启时字母快捷键全部失效**：`e.key` 在 CapsLock 下返回大写字母，SHORTCUTS 使用小写匹配 | `main.js:12856-12858` (key 直接对比) | 用户若开启 CapsLock，L/S/M/R/P/D/T 等快捷键全不响应 | 匹配前对字母 `toLowerCase()` |
| U3-6 | **移动端全屏歌词退出仅通过歌词按钮**：`toggleMobileLyricsFullscreen` 是唯一退出路径；无下滑手势、无关闭按钮 | `main.js:2642-2667` (toggleLyrics), `2669-2697` (toggleMobileLyricsFullscreen) | 用户在全屏模式中需寻找底部小按钮退出，操作成本高 | 添加下滑关闭手势（`touchmove` 判断）；或全屏顶部显示"关闭"按钮 |
| U3-7 | **灵动岛 z-index 在移动端全屏歌词退出后未恢复**：进入全屏时设置 `dynamicIsland.style.zIndex = '1001'`（2676），退出时未恢复 | `main.js:2672-2681` (toggleMobileLyricsFullscreen 进入设置 zIndex，退出无恢复) | 退出全屏歌词后灵动岛可能覆盖其他 UI 元素 | 退出时恢复原始 z-index 或移除内联样式 |
| U3-8 | **`showFirstRequestFailureModal` 在首次请求失败时弹出，但用户可能仍想继续操作**：该模态框会覆盖整个页面，用户必须点击"知道了"才能继续 | `main.js:2506-2508`, `2523-2558` | 如果用户只是暂时网络波动，弹窗打断操作流程 | 改为非阻断式横幅或 Toast + 状态栏图标，而非全屏遮罩 |
| U3-9 | **删除歌单使用原生 `confirm()`**：`deletePlaylist` 调用了 `confirm('确定删除…')`，与整体 UI 风格不一致 | `main.js:4011` | 原生弹窗破坏 iOS 风格一致性；confirm 不可样式化 | 使用自定义模态框替代 |

---

## 🔍 U4 低

| # | 问题 | 位置 | 用户影响 | 建议 |
|---|------|------|----------|------|
| U4-1 | **分享卡片生成无 loading 状态**：`generateShareCard` 同步执行，大型封面图片可能阻塞主线程 | `main.js:11964-12068` | 复杂封面的分享卡片生成可能卡顿几十毫秒，用户无感知 | 添加微小的 loading 指示器，或异步生成 |
| U4-2 | **`playerStarBtn` 收藏按钮仅通过 `title` 属性传达状态（未聚焦不可见）**：`title = '取消收藏'/'添加到收藏'` 但无 `aria-label` 动态更新 | `main.js:8005-8009` (setAttribute title) | 屏幕阅读器用户可能不朗读 `title`；收藏状态仅通过填充色传达 | 动态更新 `aria-label` 如"收藏当前歌曲" / "取消收藏" |
| U4-3 | **侧边栏搜索清空按钮 24×24px**：`sidebar-search-clear` 24×24px 触控区域过小 | `search.css:1` (width:24px;height:24px) | 触屏难精确点击，尤其是快速打字中想清空搜索 | 扩大至 44×44px 或至少 32×32px |
| U4-4 | **`?` 快捷键在设置中显示为 `/`**：`SHORTCUTS` 用 `'/'` 作为 key，UI 渲染为 `key === '/'` 显示 `/` | `main.js:12837` (key: '/'), `12857` (key === '?' 转为 '/') | 用户看到的快捷键列表显示 `/` 而非 `?`，与 README 的 `?` 不一致 | 在 SHORTCUTS 列表中用 `?` 显示，实际匹配 `?` 和 `/` 两种 |
| U4-5 | **时间显示预览条定时器关闭弹窗后最多再空转 1 秒**：`updateTimeDisplayPreview` 的 tick 会检查弹窗是否关闭并停止，但 `closeSettingsModal` 未显式 clearInterval | `main.js:11-39` (tick 内检查), `7019-7023` (closeSettingsModal 未清定时器) | 轻微无效开销（≤1s），无感知影响 | 在 closeSettingsModal 中显式 clearInterval |
| U4-6 | **小屏（≤360px）下歌单网格卡片过窄**：`playlists-grid` 固定两列 1fr，320px 宽屏下每张卡约 139px，歌单名 13px 文案易截断 | `sidebar.css` (playlists-grid 两列布局) | 小屏设备歌单名显示不全，辨识度低 | 移动端（≤480px）改为单列或 `minmax(150px, 1fr)` 自适应 |

---

## 💡 U5 建议

| # | 建议 | 位置 | 理由 |
|---|------|------|------|
| U5-1 | 添加"播放队列为空"时的快速入口：点击空态区域直接展开搜索 | `main.js:3232-3243` | 降低首次使用门槛 |
| U5-2 | 添加音量变化时视觉反馈（如灵动岛 toast 显示"音量 70%"） | `main.js:12827-12828` (快捷键音量调整) | 当前快捷键调音量无视觉反馈（仅滑块动） |
| U5-3 | 搜索结果添加"加载中"骨架屏，而非让灵动岛折叠 | `main.js:6345-6382` | 提升搜索体验感知速度 |
| U5-4 | 添加长按播放列表项弹出"加入歌单"菜单（恢复被移除的功能） | `main.js:3379` (注释标记移除) | README 承诺的功能，用户期待 |
| U5-5 | 设置页搜索功能：在设置面板添加搜索框，快速定位设置项 | `main.html:144-696` | 9 个 Tab + 大量设置项，用户常找不到需要的位置 |
| U5-6 | 使用自定义确认对话框替代原生 `confirm()` | `main.js:4011` | 风格一致性 |
| U5-7 | 添加"添加到歌单"成功后的撤销按钮（Toast 带操作） | `main.js:3951,3970` | 如"已加入「我的歌单」— 撤销" |
| U5-8 | 进度条微调：添加 KeyboardEvent 支持（左右方向键在进度条聚焦时微调进度） | `main.js:7219-7256` | 键盘用户无法精确控制进度 |
| U5-9 | 设置面板的"缓存统计"添加自动刷新，而非手动刷新 | `main.html:441` (正在统计…), `main.js:11897` (统计) | 用户打开设置时看到"正在统计…"但不自动更新 |
| U5-10 | 酷狗搜索失败时提供降级搜索到网易云的建议 | `main.js:6331-6343` (searchKugouTracks 需登录) | "请先在设置-账户中登录酷狗账号"可附带"或切换到网易云音源" |

---

## 🧭 用户旅程痛点清单

### 第一阶段：首次使用

1. **[U2-1] 空态迷失**：打开页面→播放列表为空→占位文字"歌曲标题"+"未知歌手"→无任何引导。用户不知道"搜索"是第一步，需要 README 才知道功能范围。
2. **[U1-5] 搜索时面板反复折叠**：好不容易找到搜索框开始打字，灵动岛反复折叠→展开，打字体验极度割裂。
3. **[U2-2] 焦点不可见**：搜索框展开后聚焦环被抑制，键盘用户无法确认焦点位置。

### 第二阶段：日常听歌

4. **[U1-3] 触屏无法拖拽进度**：手机用户想拖到副歌部分，只能点击（精度差）或目视等待。
5. **[U1-2] 播放失败无反馈**：切歌后音频 URL 失效，播放按钮停在"暂停"图标，歌停了但 UI 显示"正在播放"，用户困惑。
6. **[U2-6] 找不到 EQ**：想调均衡器，音频设置只有音源切换；EQ 藏在"实验性功能"页签深处，用户以为没有此功能。

### 第三阶段：高级功能

7. **[U1-1] 键盘用户无法使用**：Tab 键被劫持导致整个页面无法键盘导航；快捷键虽多但键盘用户无法到达设置查看快捷键列表。
8. **[U1-4] 设置弹窗无焦点圈闭**：打开设置后键盘用户被困在弹窗内（Tab 直接跳转到地址栏或背景元素）。
9. **[U2-5] 右键/长按菜单名存实亡**：README 声称支持右键加入歌单，实际无此功能；用户尝试后困惑。