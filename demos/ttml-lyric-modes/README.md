# TTML 歌词三模式渲染 Demo

> 把 Harmonia 的 **视觉优先 / 性能优先 / 预览模式** 三条歌词动画通路单独抽出来，
> 各给 3 个互斥候选实现，共 9 个方案，在**同一段 TTML、同一时钟**下对比。
> 主项目零改动（`Harmonia/js/main.js` / `main.html` / `css/` 均未触碰）。

## 实现基于什么

引擎层（`js/engine/`）借鉴了
[applemusic-like-lyrics](https://github.com/amll-dev/applemusic-like-lyrics)
（AMLL）的技术方向 —— **代码全部自研，未复制其源码**（该仓库为 AGPL-3.0-only）：

| 技术点 | 借鑒内容 | 本项目实现 |
|---|---|---|
| 位移动画 | 阻尼谐振子弹簧（而非 CSS transition） | `spring.js`：解析解 + 前后向差分求速度 |
| 背景行 | **嵌进主行的 group**，不独立排队 | `line.js` / `optimize.js`：`bgWrapper` + `attachTo` 关联 |
| 逐字 | Web Animations API，非 CSS 变量 | `word-anim.js`：揭字 mask + float + emphasize |
| 剔除 | 按**像素** overscan，而非行数 | `layout.js`：`overscanPx` + `teardown` 释放动画 |
| 歌词清洗 | 主/背景时间同步、非刻意重叠剔除 | `optimize.js`：纯函数，可单测 |

值得记录的背景：**Harmonia 本身就在用 `@applemusic-like-lyrics/core@0.5.1`**
（`main.js:135`）。真正的问题不是「缺一个好渲染器」，而是
`main.js:5293` 的 `parseTTMLContentToAMLLLines` 让**自写的
`simpleTTMLToAMLLLines` 抢在 AMLL 的 `parseTTML` 前面执行**
（`if (locallyParsed.length) return locallyParsed;`），把后者更完整的解析结果挡掉了。

## 为什么需要这个 Demo

主项目有两条歌词渲染通路：

| 通路 | 入口 | TTML 支持 |
|---|---|---|
| AMLL 组件 | `renderAMLLLines`（main.js:5309） | 完整 |
| 自建 DOM（legacy） | `renderLegacyLyricLines`（main.js:5393） | 塌陷 |

而「视觉优先 / 性能优先 / 预览模式」这三种**只改 legacy 通路的动画参数**
（`main.js:2477-2525`、`7325-7399`），并不切换渲染器。所以除 AMLL 外，
这三种模式在 TTML 下都会丢失结构信息。

根因有四条，均已定位：

| # | 根因 | 位置 |
|---|---|---|
| 1 | 映射时**丢掉 `isBG` / `isDuet` / `agent`** | `main.js:5396-5408` |
| 2 | 滚动是**单列前缀高度**模型，无法表达并行轨 | `main.js:7251-7266`、`2072-2084` |
| 3 | `findActiveLyricIndex` **只返回单个** active index | `main.js:7267-7301` |
| 4 | 三种模式**只调动画参数**，不换渲染器 | `main.js:2477-2525` |

结论：这不是调参能修的，需要**多轨布局模型 + 正确的背景行结构**。
9 个方案就是 9 种在共享引擎上的取舍。


## 快速开始

```bash
cd Harmonia/demos/ttml-lyric-modes
node serve.mjs --open        # 或 npm start
```

必须经 http 打开（ES module + fetch 在 file:// 下会被 CORS 拦截）。

| URL | 用途 |
|---|---|
| `/` | 交互浏览 |
| `/?selftest=1` | 跑页面内自检（124 项） |
| `/?autoplay=1` | 自动播放 |

快捷键：`空格` 播放/暂停，`←`/`→` 前后 1 秒（`Shift` 为 5 秒）。

## 用自己的音频和 TTML 看实际效果

左侧面板「载入自己的文件」区可以直接选择文件，**也可以把文件拖到页面任意位置**。

| 项目 | 说明 |
|---|---|
| **TTML** | 接受 `.ttml` / `.xml`。选中后自动勾选「使用我自己的 TTML」；取消勾选即切回内置样本 |
| **音频** | 接受任意浏览器可解码的音频/视频。载入后 `<audio>.currentTime` **成为时间的唯一权威**，歌词与声音由同一时间源驱动，不会互相漂移 |
| **歌词偏移** | −3000 ~ +3000 ms，正数 = 歌词延后。对纯音频与 MV 尤其有用 |
| **音量** | 0 ~ 100% |

### 时钟如何接线

这是本 demo 能验证「真实播放」的关键设计（`js/scheduler.js`）：

```
未载入音频：时间 = performance.now() 推导（内置时钟，用于离线对比 9 个方案）
载入音频后：时间 = <audio>.currentTime + 偏移   ← 媒体是唯一权威
```

两种模式下都只有**一处 rAF**（本时钟），各渲染方案一律不自行开循环 ——
所以接了音频后依然能用同一套性能指标横向比较。
读取侧统一施加偏移，因此 9 个方案无需知道偏移存在。

### 关于自动播放

浏览器要求音频播放必须由用户手势触发。因此：

- 选文件本身算一次手势，会自动尝试播放；
- 若被策略拒绝（例如通过脚本设值而非真实点选），状态栏会提示
  「浏览器要求点击播放开始」，点一下播放按钮即可；
- 页面**不会**静默失败 —— 这是有意设计，避免「点了没反应」。

### 端到端验证

```bash
npm run test:files  # 30 项：注入真实文件，验证音频驱动歌词 / 拖动同步 / 偏移 / 清空 / 错误处理
npm run shots:files  # 载入自带文件后截图 -> scripts/out/user-files-visual.png
npm run fixtures     # 生成测试音频 scripts/fixtures/beep-30s.wav（每整秒一声报时）
```

`test:files` 通过 CDP 往真实 `<input type=file>` 注入文件（等价于点选），
并用**真实鼠标点击**建立用户手势后播放，实测音频时间与时钟时间一致（误差 <120ms）。
测试音频是脚本就地合成的 WAV（每秒一声、音高递增），仓库里不含受版权保护的音频。

## 九个方案

### 视觉优先（0.7s 缓动 + blur + scale + 级联入场）

| | 方案 | 重叠多句 | 背景行 | 对唱行 |
|---|---|---|---|---|
| **V1** | 弹簧滚动 + 景深 | 并发行各自成组、各自弹簧收敛，天然错峰同屏 | 嵌在主行 group 内，未唱时折叠、起唱时展开并缩放 | 整组右对齐 + 主行让出右侧 15% |
| **V2** | 焦点钉住 + 背景浮层 | 焦点行钉在中心零位移，并发行以强弹簧收束在四周 | 折叠在主行下方，随起唱上浮展开（slideY + scale 0.8→1.0） | 右对齐 + 声部色，左右对位 |
| **V3** | 视差滚动 + 长尾保持 | 并发行用更长弹簧并存于视野，重叠区间内全部可读 | 嵌套展开且不随主行立即收起，长尾和声保持可见 | 右对齐 + 声部色，长音字带强调 |

三者的差异现在落在**弹簧参数与对齐位置**上（见 `renderers/visual.js`），
而不再是「动画时长」这种表面差异。

### 性能优先（0.18s 过渡、无 blur / 无阴影 / 无级联）

| | 方案 | 重叠多句 | 背景行 | 对唱行 |
|---|---|---|---|---|
| **P1** | 窗口化节点池 | 窗口内并发行全部驻留，窗口外整体释放 | 随宿主组一起进出窗口，复用同一套释放/重建 | 声部色由 CSS 属性选择器承担，零内联写入 |
| **P2** | 零弹簧直写 | 位置在行边界处一次算好，稳定期每帧零 DOM 写入 | 折叠由 class 切换，CSS 过渡承担 | 静态定位，行边界之外零 JS |
| **P3** | 零逐字动画 | 整行文本渲染，位置仍由弹簧正确错峰 | 嵌套结构保留（正确性），无逐字开销 | 全部由 CSS 承担 |

关键认识：**「动画少」不等于「开销低」**。
第一版曾把「无 blur」当成性能优化的全部，但真正的成本大头是
每帧样式写入次数、合成层数量、WAAPI 动画时间轴条数 —— 这三者才分别对应上面三个方案。

### 预览模式（860px 卡片、44px 粗体、0.8s 慢过渡）

| | 方案 | 重叠多句 | 背景行 | 对唱行 |
|---|---|---|---|---|
| **R1** | 卡片流 + 角色徽标 | 并发行各成一张卡片，弹簧错峰使它们依次浮现 | 凹入子卡（虚线边 + 内阴影），**嵌套在主卡内** | 卡左缘声部色 + 右上 A/B 徽标 |
| **R2** | 剧本双栏（双引擎） | 同栏内并发行各自成组错峰，两栏互不干扰 | 斜体舞台提示样式，嵌在所属行内随栏滚动 | **按声部进不同栏，各栏独立滚动锚定** |
| **R3** | 焦点区 + 全曲时间轴 | 焦点区同时列出全部活动组，时间轴上并行条一眼可见 | 焦点区凹入子卡 + 时间轴虚线窄条 | 时间轴按声部着色 + 焦点区徽标 |

R2 是三者里最特别的：它用**两个独立引擎**，各自维护滚动与弹簧。
对唱的根本困难是「两个声部要同时可见但各自滚动」，单引擎做不到，双引擎天然解决。


## 实测结果

口径：真实社区样本 `real-3402223603.ttml`（解析 77 行 → 清洗后 **60 个行组**，
含 17 个带背景行、7 对唱），从 30s 起真实播放 4s，headless Chrome 153。
**所有方案共用唯一时钟**（`js/scheduler.js`），因此 `rAF/帧 = 1.00`
是硬性一致性证据 —— 差异全部来自方案自身。

| 方案 | 帧数 | 样式写/帧 | 写入跳过/帧 | 布局读/帧 | rAF/帧 | 驻留组 |
|---|---|---|---|---|---|---|
| v1 | 120 | 7.9 | 63.4 | 0.0 | 1.00 | 24（离屏 36） |
| v2 | 104 | 6.6 | 60.9 | 0.0 | 1.00 | 22 |
| v3 | 84 | 11.6 | 62.0 | 0.0 | 1.00 | 25 |
| **p1** | 163 | 5.9 | 63.6 | 0.0 | 1.00 | **23（离屏 37）** |
| **p2** | 228 | **0.0** | 76.0 | 0.0 | 1.00 | 26 |
| **p3** | 238 | 3.2 | 68.8 | 0.0 | 1.00 | 24（**WAAPI 动画 0 条**） |
| r1 | 165 | 4.2 | 43.8 | 0.0 | 1.00 | 24（离屏 36） |
| r2 | 196 | 2.6 | 82.7 | 0.0 | 1.00 | 27（双引擎） |
| r3 | 222 | 1.8 | 50.2 | 0.0 | 1.00 | 78（焦点 18 + 时间轴 60） |

复现：`npm run bench`（也可 `node scripts/bench.mjs --sample duet --seconds 6`）。

**结论**

- **P2 每帧写入为 0.0**：实测 230 帧中只有 4 帧真正写了 DOM
  （**跳过率 98%**）。因为位置只在「焦点组变化」时重算，稳定期完全不碰样式。
  这是「零弹簧直写」策略的直接结果。
- **P1 把驻留组从 60 压到 23**：37 个组被标记离屏并 `teardown()` 释放
  DOM 与动画。窗口化真实生效（这一点曾被一个 CSS bug 破坏，见下）。
- **P3 的 WAAPI 动画数为 0**：整行文本渲染，浏览器无需维护任何动画时间轴。
- **全部方案布局读取为 0**：没有任何方案在帧内量尺寸（量尺寸只在 mount/resize）。
- 帧数在不同轮次波动较大（headless 合成时机不确定），因此**结论只依据
  每帧写入次数与驻留组数**，不依据帧率排名。

诊断面板实时显示上述指标，可自行复核。


## 目录结构

```
ttml-lyric-modes/
├── index.html              单页：模式/方案切换 + 舞台 + 走带 + 诊断面板
├── serve.mjs               零依赖静态服务器
├── package.json
├── css/{base,engine,visual,performance,preview}.css
├── js/
│   ├── engine/             ★ 引擎层（9 个方案共享）
│   │   ├── spring.js       阻尼谐振子解析解 + Spring 类（帧率无关）
│   │   ├── optimize.js     歌词清洗 + 主/背景行关联 + 分组（纯函数）
│   │   ├── word-anim.js    WAAPI 揭字 / 悬浮 / 强调
│   │   ├── line.js         行元素 + 行组（主行 + 嵌套背景行）
│   │   ├── layout.js       像素级滚动 + 每行独立弹簧 + overscan 剔除
│   │   └── index.js        引擎出口
│   ├── model.js            行模型：规范化 / 活动行查询 / 重叠分组（纯函数）
│   ├── layout.js           布局数学：声部→栏位（纯函数，供 R2 等使用）
│   ├── scheduler.js        唯一时钟：单一 rAF；可接管 <audio> 作为时间权威
│   ├── dom.js              DOM 写入原语 + 计量埋点（引擎写入也经此，保证计数可信）
│   ├── diagnostics.js      FPS / 帧耗时 / 写入 / 布局读取 / rAF 回调计数
│   ├── harness.js          样本装载 + 用户文件解析
│   ├── selftest.js         页面内自检（124 项）
│   ├── app.js              装配层（只做编排，无渲染逻辑）
│   ├── vendor/{xml,ttml}.js  从 Harmonia-DesktopLyrics-Next 原样 vendored
│   └── renderers/
│       ├── contract.js     方案生命周期契约与校验
│       ├── index.js        方案注册表 + 自检
│       ├── visual.js       V1 / V2 / V3
│       ├── performance.js  P1 / P2 / P3
│       └── preview.js      R1 / R2 / R3
├── samples/                5 个 TTML 样本（含真实社区样本）
├── tests/                  99 项纯逻辑测试（model / layout / engine / css-guards）
└── scripts/                验证与排查脚本（见下）；fixtures/ 为脚本生成的测试素材
```


### 关于 vendored 解析器

`js/vendor/{xml,ttml}.js` 原样取自 `Harmonia-DesktopLyrics-Next/src/core/`，
未作修改。选它的理由：

- **浏览器安全**：无 DOM、无 Node 依赖，仅依赖同目录的 `xml.js`；
- **比主项目的 `simpleTTMLToAMLLLines` 完整**：正确处理行内换声部切分、
  背景行归属、sidecar 翻译、ruby 注音、缺失 `end` 的时间推断；
- 实测该样本得 77 行 / 19 背景 / 7 对唱 / 8 对重叠 / 峰值 4 行并发。

它是 9 个方案的**共同输入**，保证对比的是渲染而非解析差异。

## 验证

```bash
npm test            # 99 项纯逻辑测试（model + layout + engine + CSS 度量守卫）
npm run smoke       # headless Chrome：124 项页面自检 + 交互冒烟
npm run test:files  # 30 项：用户自带音频 + TTML 的端到端链路
npm run shots       # 9 个方案截图 -> scripts/out/
npm run shots:files # 用户文件界面截图
npm run bench       # 性能基准表格
```

`npm test` 用 `--experimental-test-isolation=none`：受限环境下 Node 测试运行器
派生子进程会 `EPERM`，改为同进程执行。需要隔离时用 `npm run test:isolated`。

冒烟测试断言的是**时钟按墙钟推进**（实测误差 0.2%）与无未捕获异常，
而不是帧率 —— headless Chrome 的帧数由合成时机决定，同一方案实测在
18~75 帧/2s 间波动，用帧率断言必然 flaky。

### 自检覆盖什么

- **A 静态契约**：9 个方案齐备、meta 合规、`fixes` 各自覆盖重叠/背景/对唱三类；
- **B 数据层**：5 个样本可解析、时间有效，真实样本确实含重叠/背景/对唱；
- **C 渲染层**：逐方案 mount → 在多个关键时刻 update → 断言
  **多行并发时每一行都可见**，且**确实渲染出了嵌套背景行**（`.eng-bg-wrap` 存在）；
- **D 装配**：舞台容器与实例数。

C 层是核心：它把「重叠行是否同屏」「背景行是否真的嵌套渲染」从观感变成断言。

### CSS 度量守卫（`tests/css-guards.test.js`）

引擎的滚动数学**依赖 `offsetHeight` 准确**。本次重写连续踩了三个同类坑，
且都表现为「位置全错但控制台无报错」：

| 坑 | 后果 | 实测 |
|---|---|---|
| `content-visibility: auto` 常开 | offsetHeight 返回 `contain-intrinsic-size` 占位值 | 40px（真实 130px） |
| `contain: strict`（含 size containment） | 容器忽略子元素尺寸 | 13px（真实 67~130px） |
| 测量前未 `build()` 内容 | 量到空元素（只有 padding） | 38px（真实 119~166px） |

前两个是**样式**问题，代码层面看不出来，因此加了静态检查：
只要有人在参与测量的元素上引入 size containment 或常开的
`content-visibility`，测试立刻失败并指出文件名与行号。


### 排查脚本

| 脚本 | 用途 |
|---|---|
| `scripts/debug.mjs` | dump 方案在指定时刻的 DOM 状态 |
| `scripts/probe-visibility.mjs` | 输出活动行的祖先链 opacity/display，定位「谁把它变没了」 |
| `scripts/probe-clock.mjs` | 区分低帧数来自「时钟被节流」还是「渲染慢」 |
| `scripts/probe-paint.mjs` | 区分瓶颈在 JS 还是浏览器绘制/合成 |
| `scripts/probe-visual-cost.mjs` | 逐项禁用 blur/transition/剔除，归因绘制成本 |
| `scripts/probe-p2-focus.mjs` | 量化 P2 焦点行偏离视觉中心的像素数 |
| `scripts/dump-p2-keyframes.mjs` | 打印 P2 生成的关键帧与保持段统计 |
| `scripts/make-test-audio.mjs` | 合成测试音频（每整秒一声报时） |
| `scripts/test-user-files.mjs` | 用户文件端到端测试（30 项） |
| `scripts/shots-user-files.mjs` | 用户文件界面截图 |

## 开发中修复的真实缺陷

这些不是推测，是实测发现并已修复的。分为两批：第一批是引擎重写**之前**
在旧实现上发现的；第二批是重写**过程中**新引入并当场修掉的。

### 第一批（旧实现，第一版）

1. **R2 整栏空白** — 栏位按「声部列表序号取模」分配。真实样本只有 v1/v2
   且对唱行全属 v2，v2 序号恒为 0 → 所有对唱行落进 A 栏，B 栏全空。
   改为按「是否主声部」判定（`assignDuetColumns`）。
2. **R1/R2 卡片压叠** — 用固定 72px 步长排布，而卡片实测高约 110~140px。
   改为实测高度做前缀和。
3. **P2 焦点行不居中** — 只在行起点间线性插值，「居中」仅在其起点瞬间成立，
   实测最大偏移 65px。且相邻区间首尾相接时同百分比关键帧互相覆盖，
   保持段从 55 个塌到 4 个。
4. **V2 主行永久不可见** — 前景分支 `continue` 前未清除离屏标记。
5. **全量 `will-change` 拖慢合成** — 每行各建一个合成层，
   实测帧率从 44fps 掉到 30fps。
6. **77 行全量遍历** — 每帧对全部行调用 `setStyle`，V1 实测 237 次/帧、
   其中 230 次无效跳过。
7. **诊断面板自身开销** — `countNodes` 每帧遍历 776 节点耗时 0.145ms，
   只为给面板显示。

### 第二批（引擎重写过程中）

8. **词间空格被吃掉**（最严重）— 我最初对每个词做 `trim()`，
   但真实 TTML 把词间空格写在 `span` **内部**（`<span>When </span>`），
   于是 `When the first light` 渲染成 `Whenthefirstlight`。
   这正是 `samples/README.md` 里记录的「用自造样例无法发现的真实缺陷」。
   修法：不 trim，保留首尾空白，配合 `white-space: pre-wrap`。
9. **`content-visibility: auto` 让 offsetHeight 失真** — 它用
   `contain-intrinsic-size` 占位值（40px）代替真实高度（130px），
   导致前缀和严重低估 → 卡片全部压叠。改为只在离屏元素上启用。
10. **`contain: strict` 让组容器忽略子元素尺寸** — 组高 13px（真实 67~130px），
    60 个组被压在 767px 内，**P1 的窗口化完全失效（离屏 0 个）**。
    改为 `contain: layout paint`。
11. **测量发生在 build() 之前** — 行内容是延迟构建的，量到空元素（38px）。
    引擎 `measure()` 改为先 `build()` 再量。
12. **`velocityOf` 用中心差分读到 t<0 的钳制值** — 初速度被低估一半
    （50 被算成 25.24），弹簧出现速度顿挫。改为前向差分。

第 8~11 条都归因于同一个教训：**「看起来对」不等于「量出来对」**。
因此现在有 `tests/css-guards.test.js` 静态守住 9/10 两条。

## 回填建议（未实施）

若要把某个方案搬回 `Harmonia/js/main.js` 的 legacy 通路，最小改动面如下。
**本 demo 未改动主项目任何文件**，以下仅为建议。

两处**共同前提**（缺任一条，后续任何方案都拿不到正确输入）：

1. `renderLegacyLyricLines`（main.js:5396）的行映射补上
   `isBG` / `isDuet` / `agent` / `isPriorityBg`；
2. `findActiveLyricIndex`（main.js:7267）旁增一个返回**活动集合**的函数，
   或直接复用已有的 `computeDesktopLyricLines`（main.js:4938）语义
   —— 本项目 `js/model.js` 的 `selectActiveSet` 就是它的可测版本。

**另有一处更值得先修**：`parseTTMLContentToAMLLLines`（main.js:5293）
让自写解析器抢在 AMLL 的 `parseTTML` 之前返回。既然项目已依赖
`@applemusic-like-lyrics/lyric@1.0.1`，让后者的解析结果优先，
就能直接拿到行内换声部切分、背景行归属、sidecar 翻译等完整信息。

在此基础上按取舍选方案：

| 若优先 | 建议 | 理由 |
|---|---|---|
| 省节点 | **P1** | 驻留组 23/60（离屏 37 个被释放），与总行数无关 |
| 省每帧开销 | **P2** | 写入 0.0 次/帧，跳过率 98%；改动最大（需重排为行边界驱动） |
| 省动画开销 | **P3** | WAAPI 动画 0 条，长曲目/低端设备友好 |
| 保留现有视觉语汇 | **V1** | 与现有 blur/scale/级联最接近，换成弹簧 + 嵌套背景行 |
| 版式改动最小 | **R1** | 复用现有卡片版式，只补徽标与实测高度 |

可搬进主项目的部分：`js/engine/` 全部（`spring.js` 与 `optimize.js` 无 DOM 依赖，
`line.js` / `layout.js` 只依赖 `dom.js` 的写入原语）+ `js/model.js`。
这批代码已有 99 项测试，其中包括 4 项静态 CSS 守卫。
主项目已有 `js/lib/pure.js` 这一「纯函数独立成文件」的先例。

## 样本版权

前三个样本为本项目/上游项目编写，可自由使用。
`real-3402223603.ttml` 与 `encanto-bruno.ttml` 来自
[AMLL TTML DB](https://github.com/amll-dev/amll-ttml-db)，版权归原作者，
此处仅作**测试数据**使用，文件内保留了 `amll:meta` 署名。
