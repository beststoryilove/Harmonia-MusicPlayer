<div align="center">

# 🎵 Harmonia Music Player

<!-- 语言切换 / Language Switch -->
[**中文**](./README.md) | [**English**](./README_EN.md)

[![Banner](https://img.shields.io/badge/Harmonia-让音乐触手可即-ff2d55?style=for-the-badge&logo=applemusic&logoColor=white)](https://github.com/beststoryilove/Harmonia-MusicPlayer)

<br/>

*🎶 让音乐触手可即。*

---

</div>

## 📖 简介

**Harmonia** 是一款基于浏览器端运行的在线音乐播放器。灵感来源于 **Apple Music** 的设计语言，融合了 **iOS** 的交互美学，致力于在网页端提供流畅、优雅且功能丰富的音乐播放体验。

项目使用纯前端技术栈构建（HTML / CSS / Vanilla JS），无需后端服务即可运行。音乐数据来源于 **网易云音乐** 与 **酷狗音乐**，逐字歌词渲染由 [AMLL](https://github.com/amll-dev/applemusic-like-lyrics) 提供支持。

> ✨ **核心理念**：简洁、优雅、畅听 —— 让每一次播放都成为享受。

---

## ✨ 功能特性

### 🎵 多音源播放

<table>
  <tr>
    <td align="center"><b>网易云音乐</b></td>
    <td align="center"><b>酷狗音乐</b></td>
  </tr>
  <tr>
    <td>海量华语曲库，搜索播放</td>
    <td>高品质音源，VIP 身份领取</td>
  </tr>
</table>

- 支持 **网易云** / **酷狗** 双音源切换
- 酷狗音质可选：**128 MP3 / 320 MP3 / FLAC / 无损**
- 酷狗账号登录（二维码 / 手机号），可同步歌单与领取概念版 VIP

### 🎤 逐字歌词 (AML)

- **AMLL (Apple Music-like Lyrics)** 引擎驱动，逐字填充动画
- 支持翻译 / 罗马音 切换显示
- 支持 **TTML** 高级歌词格式（对唱、背景人声等）
- 经典模式 / AMLL 模式可自由切换
- 多种动画模式：**视觉优先 / 性能优先 / 预览模式**

### 🏝️ 灵动岛 (Dynamic Island)

- 灵感源自 Apple 的 Dynamic Island
- 折叠态显示「正在播放」状态，点击展开搜索面板
- 集成搜索框、搜索结果、分页、错误提示
- 支持 Toast 消息推送

### 📋 播放列表与歌单

- **播放列表**：添加、移除、拖拽排序、批量管理
- **我的收藏**：一键收藏喜欢的歌曲
- **播放历史**：自动记录，最多保留 50 首
- **我的歌单**：创建本地歌单 / 同步酷狗歌单
- 支持 A-Z 排序、自定义排序、音源筛选
- 右键菜单「加入歌单」（含长按触屏支持）

### 🎨 视觉与主题

- **深色 / 浅色** 双主题一键切换
- 专辑封面 **3D 倾斜** 效果（鼠标悬停随动）
- **Liquid Glass**（液态玻璃）毛玻璃质感 UI
- 背景随专辑封面主色调动态变化
- **流体动画** 背景层
- 播放器布局：**Harmonia 经典 / Apple Music** 风格可切换

### 🎛️ 音频均衡器

- **10 段 EQ** 均衡器（31Hz ~ 16kHz）
- 内置 **13 种预设**：平坦、温暖、低音增强、深沉低频、人声增强、播客、明亮、电子、摇滚、古典、爵士、原声、舞曲
- 自定义前级增益（Preamp）±12dB
- 基于 **Web Audio API** 实时处理

### 🔗 分享与导出

- **分享卡片**：生成精美海报（1080×1920），支持复制到剪贴板 / 下载
- **Mini 播放器**：PiP（画中画）窗口，支持桌面悬浮播放
- **桌面歌词**：通过 PiP 或 WebSocket 连接实现桌面歌词
- **保存专辑图**：一键下载当前封面原图

### 🌐 AI 翻译（实验性功能）

- 集成 **GLM-4.7-Flash** AI 翻译
- 支持「仅翻译外语歌」/「翻译所有外语歌」两种模式
- 自动将歌词翻译为中文，逐行对照显示

### ⌨️ 快捷键

| 按键 | 功能 |
|------|------|
| `Space` | 播放 / 暂停 |
| `← / →` | 上一曲 / 下一曲 |
| `↑ / ↓` | 音量 ±5% |
| `L` | 切换歌词 |
| `T` | 切换主题 |
| `S` | 聚焦搜索 |
| `M` | 打开/关闭侧栏 |
| `R` | 切换播放模式 |
| `P` | 分享卡片 |
| `D` | Mini 播放器 |
| `Tab` | 展开/收起灵动岛 |
| `?` | 快捷键列表 |
| `Esc` | 关闭弹窗 |

### 📱 响应式设计

- 完美适配 **桌面 / 平板 / 手机**
- 移动端专属全屏歌词模式
- 触屏拖拽排序、长按菜单
- 智能降级（移动端禁用高性能毛玻璃以节省电量）

---

## 🏗️ 技术架构

```
Harmonia/
├── main.html              # 主页面（含所有 DOM 结构与模态框）
├── css/
│   ├── variables.css      # CSS 变量 / 字体定义
│   ├── base.css           # 全局样式 / 动态岛 / 通用组件
│   ├── layout.css         # 主布局
│   ├── sidebar.css        # 侧边栏 / 播放列表
│   ├── search.css         # 搜索面板样式
│   ├── player.css         # 播放器控件 / 歌词样式
│   ├── settings.css       # 设置面板
│   ├── lyrics.css         # 歌词增强动画
│   ├── share.css          # 分享卡片模态框
│   └── responsive.css     # 响应式适配
├── js/
│   ├── main.js            # 主逻辑 (~9300 行)
│   │   ├── 灵动岛控制
│   │   ├── 播放 / 暂停 / 切歌
│   │   ├── 搜索 / 分页
│   │   ├── 歌词解析与渲染 (AMLL + 经典)
│   │   ├── 歌单 CRUD
│   │   ├── 酷狗 API / VIP
│   │   ├── 均衡器 (Web Audio)
│   │   ├── PiP 画中画
│   │   ├── 分享卡片生成
│   │   ├── 主题 / 设置持久化
│   │   └── 快捷键 / 初始化
│   |
│   └── MODULES.md         # 模块文档
└── fonts/
    ├── PingFangSC-Regular.woff2
    ├── PingFangSC-Semibold.woff2
    ├── sf-pro-display_regular.woff2
    └── sf-pro-display_semibold.woff2
```

### 技术栈

| 类别 | 技术 |
|------|------|
| **Markup** | HTML5 |
| **Styles** | CSS3 (Liquid Glass, Flexbox, Grid, Animation, Backdrop Filter) |
| **Script** | Vanilla JavaScript (ES6+) / 零依赖 |
| **歌词引擎** | [@applemusic-like-lyrics/core](https://github.com/amll-dev/applemusic-like-lyrics) (ESM) |
| **音频处理** | Web Audio API (10 段 EQ) |
| **桌面扩展** | Picture-in-Picture API / WebSocket |
| **图标** | [Font Awesome 6.4](https://fontawesome.com/) |
| **字体** | Apple PingFang / SF Pro |

---

## 🤖 所使用的 AI 模型

> 在 Harmonia 的开发过程中，以下 AI 模型为代码编写、架构设计、功能实现等提供了重要帮助。

目前该项目所使用过的 AI 模型（以 A-Z 排序）：

- **ChatGPT**（包括 GPT4.5、GPT5、GPT5.1-5.5）
- **Deepseek**（包括 R1、V3、V3.1、V3.2、V3.2 speciale、V4）
- **Gemini**（包括 3.0Pro、3.1Pro）
- **Grok**（包括 v4.1-4.3）
- **Qwen**（包括 v3.5-v3.6 全系列模型）
- **阶跃星辰**（包括 step-3.7-flash）
- **LongCat**（包括 LongCat-2.0）

---

## 💬 社区与交流

我们欢迎所有用户加入社区，反馈问题、分享歌单或提出建议！

| 渠道 | 链接 |
|------|------|
| 🌐 **官方博客** | [azalkmin.abrdns.com](https://azalkmin.abrdns.com) |
| 💬 **QQ 群** | [点击加入](https://qm.qq.com/q/p4WYBXFGNO) |
| 📱 **扫码入群** | <img src="qrcode_1779913195527.jpg" width="120" alt="Harmonia QQ 群二维码"> |

---

## 🙏 致谢

在 Harmonia 的开发过程中，我们得到了许多开源项目、API 和资源的帮助，在此表示衷心感谢：

| 项目 / 资源 | 用途 |
|-------------|------|
| [GD 音乐台开发者 API](https://music-api.gdstudio.xyz) | 音乐 API 提供 |
| [酷狗音乐 API](https://github.com/MakcRe/KuGouMusicApi) | 酷狗音乐 API 提供（Vercel 部署） |
| Apple **PingFang** / **SF Pro** | 字体资源 |
| [Font Awesome](https://fontawesome.com/) | 图标库 |
| [Apple Music](https://music.apple.com/) & [iOS](https://www.apple.com/ios/) | 设计灵感 |
| [mengobs/musicplayer](https://github.com/mengobs/musicplayer) | 歌词展示参考 |
| [AMLL (Apple Music-like Lyrics)](https://github.com/amll-dev/applemusic-like-lyrics) | 逐字歌词引擎 |

---

## Star History

<a href="https://www.star-history.com/?repos=beststoryilove%2FHarmonia-MusicPlayer&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=beststoryilove/Harmonia-MusicPlayer&type=date&theme=dark&legend=top-left&sealed_token=Z-FADy6CBKLhFfn4bqCt3NCY-4rkjaWi_OgYDpRrE0vTODPxxSBrt7Xx5Eun2dH86OHh3bs86B4uhwij3X7qHHrz-I98WaFp0JO2wciXWKAnc35HhYPyIH-dVqKyKEFp4LnGvPL4CzG9kl5E7LTvGIbaPs1EpofWYpr3MSqt3NG-tuXrmIDdt1A5khTf" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=beststoryilove/Harmonia-MusicPlayer&type=date&legend=top-left&sealed_token=Z-FADy6CBKLhFfn4bqCt3NCY-4rkjaWi_OgYDpRrE0vTODPxxSBrt7Xx5Eun2dH86OHh3bs86B4uhwij3X7qHHrz-I98WaFp0JO2wciXWKAnc35HhYPyIH-dVqKyKEFp4LnGvPL4CzG9kl5E7LTvGIbaPs1EpofWYpr3MSqt3NG-tuXrmIDdt1A5khTf" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=beststoryilove/Harmonia-MusicPlayer&type=date&legend=top-left&sealed_token=Z-FADy6CBKLhFfn4bqCt3NCY-4rkjaWi_OgYDpRrE0vTODPxxSBrt7Xx5Eun2dH86OHh3bs86B4uhwij3X7qHHrz-I98WaFp0JO2wciXWKAnc35HhYPyIH-dVqKyKEFp4LnGvPL4CzG9kl5E7LTvGIbaPs1EpofWYpr3MSqt3NG-tuXrmIDdt1A5khTf" />
 </picture>
</a>

---

<div align="center">

🌟 **如果 Harmonia 让你享受到了音乐的魅力，欢迎给我们一个 Star！** 🌟

<sub>Built with ❤️ and AI · 让音乐触手可即</sub>

</div>

