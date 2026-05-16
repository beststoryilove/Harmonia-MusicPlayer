# Harmonia MusicPlayer

[English](README_EN.md) | 简体中文

![Harmonia](https://img.shields.io/badge/Harmonia-Music_Player-ff2d55)
![Platform](https://img.shields.io/badge/Platform-Web-34aadc)

Harmonia 是一个美观、功能丰富的在线音乐播放器，灵感来源于 Apple Music 设计风格，支持逐字歌词、播放列表管理、多主题等高级特性（vibecoding project）。

[**🎧 在线体验**](https://harmoniamusicplayer.dpdns.org)

---

## ✨ 功能特性

- **多平台音乐搜索与播放** - 集成多个音乐源，支持在线搜索
- **Apple Music 风格界面** - 动态背景、3D 封面特效与灵动岛搜索面板
- **沉浸式歌词** - 支持 KTV 风格逐字高亮与滚动歌词，点击跳转
- **智能歌词翻译** - 集成 GLM-4-Flashx API，自动检测并翻译外语歌词
- **播放列表管理** - 拖拽排序、收藏、播放历史，支持导入/导出
- **桌面歌词** - 通过 WebSocket 连接独立桌面歌词客户端
- **多主题切换** - 一键切换深色/浅色主题，支持自定义 CSS 变量
- **响应式设计** - 适配桌面、平板与移动端
- **播放模式** - 顺序、单曲循环、随机播放
- **内置代理** - 提供自建网易云跨域代理，可自定义

---

## 🚀 快速开始

**在线使用**  
直接访问 [https://harmoniamusicplayer.dpdns.org](https://harmoniamusicplayer.dpdns.org)

**本地运行**
```bash
git clone https://github.com/beststoryilove/Harmonia-MusicPlayer.git
cd Harmonia-MusicPlayer
python -m http.server 8000   # Python 3
```
浏览器打开 `http://localhost:8000`

**基本操作**  
- 点击顶部灵动岛或按 `Tab` 键搜索音乐  
- 右下角按钮显示/隐藏歌词面板  
- 右上角图标切换主题，设置中启用翻译并填入 API 令牌

---

## 🛠 技术栈

| 分类 | 技术 |
|------|------|
| 核心 | HTML5, CSS3, JavaScript (ES6+) |
| 音频 | Web Audio API |
| 存储 | Web Storage (localStorage) |
| 图形 | Canvas API (封面取色) |
| 通信 | WebSocket (桌面歌词) |
| 拖拽 | Drag & Drop API |
| 媒体控制 | Media Session API |
| 歌词 | LRC 解析引擎，支持逐字 |
| 翻译 | GLM-4-Flashx API (Bigmodel) |
| 字体 | PingFang SC, SF Pro Display, Font Awesome 6 |

---

## 📁 项目结构

```
Harmonia-MusicPlayer/
├── index.html              # 主页面
├── fonts/                  # 字体文件
├── default.svg             # 默认专辑封面
└── README.md
```

---

## ⚙️ 配置

- **翻译 API**：在 [Bigmodel](https://open.bigmodel.cn) 获取 API 令牌，填入设置即可
- **代理服务器**：内置自建网易云代理，可在设置中自定义

---

## 🌐 浏览器兼容性

Chrome 60+ · Firefox 55+ · Safari 12+ · Edge 79+ · iOS Safari 12+ · Android Chrome 60+

部分高级功能（如拖拽排序）可能在旧版浏览器中受限。

---

## 🙏 致谢

- 音乐 API 提供：[GD音乐台开发者API](https://music-api.gdstudio.xyz)
- 字体：Apple PingFang, SF Pro
- 图标库：Font Awesome
- 设计灵感：Apple Music, iOS
- 歌词展示参考：[mengobs/musicplayer](https://github.com/mengobs/musicplayer)

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！
1. Fork 本仓库
2. 创建分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📌 项目状态

- **正式版**: v3.3.1 (260510)
- **开发版**: v3.4（开发中） - [预览地址](https://809blog.dpdns.org/Harmonia_Pre)
- **更新频率**: 约每周一次
- **桌面歌词**: [独立仓库](https://github.com/beststoryilove/Harmonia-DesktopLyrics/) （酷狗源逐字歌词适配中）

---

## 🤖 所使用的AI模型

目前该项目所使用过的AI模型（以A-Z排序）：
1. ChatGPT（包括GPT4.5，GPT5，GPT5.1-5.5）
2. Deepseek（包括R1，V3，V3.1，V3.2，V3.2 speciale，V4）
3. Gemini（包括3.0Pro，3.1Pro）
4. Grok（包括v4.1-4.3）
5. Qwen（包括v3.5-v3.6全系列模型）

---

## 📊 Star History

<a href="https://www.star-history.com/?repos=beststoryilove%2FHarmonia-MusicPlayer&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=beststoryilove/Harmonia-MusicPlayer&type=date&theme=dark&legend=bottom-right" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=beststoryilove/Harmonia-MusicPlayer&type=date&legend=bottom-right" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=beststoryilove/Harmonia-MusicPlayer&type=date&legend=bottom-right" />
 </picture>
</a>

**Harmonia - 让音乐触手可及** 🎶
