# Harmonia-MusicPlayer

![Harmonia Music Player](https://img.shields.io/badge/Harmonia-Music_Player-ff2d55)
![Platform](https://img.shields.io/badge/Platform-Web-34aadc)

Harmonia 是一个美观、功能丰富的在线音乐播放器，灵感来源于 Apple Music 设计风格，支持歌词显示、播放列表管理、多主题切换等高级功能。

## ✨ 功能特性

### 🎵 核心功能
- **在线音乐搜索** - 支持多平台音乐搜索
- **Apple Music 风格界面** - 现代化设计，动态背景效果
- **歌词显示** - 支持逐字歌词（KTV风格）和滚动歌词
- **翻译功能** - 集成 GLM-4-Flashx API 自动翻译外语歌词
- **播放列表管理** - 创建、编辑、保存个人播放列表
- **播放历史** - 自动记录播放历史
- **收藏功能** - 收藏喜欢的歌曲

### 🎨 特色功能
- **灵动岛设计** - 类似 iOS 的动态搜索面板
- **侧边抽屉** - 便捷的播放列表管理界面
- **拖拽排序** - 自定义播放列表顺序
- **桌面歌词** - WebSocket 连接桌面歌词客户端
- **多主题支持** - 深色/浅色主题一键切换
- **专辑封面特效** - 3D 悬停效果
- **逐字歌词** - Apple Music 风格的逐字高亮效果
- **歌词翻译** - 智能检测并翻译外语歌词

### 🛠️ 高级功能
- **播放模式** - 顺序播放、单曲循环、随机播放
- **音量控制** - 实时音量调节
- **进度控制** - 点击进度条快速跳转
- **歌词跳转** - 点击歌词跳转到对应时间点
- **歌曲分享** - 导入/导出播放列表
- **跨域代理** - 内置多个网易云代理服务器
- **响应式设计** - 适配桌面端和移动端

## 🚀 快速开始

### 在线使用
直接访问官方部署页面即可使用，无需安装：
```
https://harmoniamusicplayer.dpdns.org
```

### 本地运行
1. 克隆仓库到本地：
```bash
git clone https://github.com/beststoryilove/Harmonia-MusicPlayer.git
cd Harmonia-MusicPlayer
```

2. 启动本地服务器（使用 Python）：
```bash
# Python 3
python -m http.server 8000

# 或使用 Python 2
python -m SimpleHTTPServer 8000
```

3. 在浏览器中访问：
```
http://localhost:8000
```

## 🎯 使用指南

### 基本操作
1. **搜索音乐**：点击顶部灵动岛或按 Tab 键展开搜索面板
2. **播放控制**：使用中央控制按钮控制播放/暂停、上一曲/下一曲
3. **播放列表**：点击左上角菜单按钮管理播放列表
4. **主题切换**：点击右上角月亮/太阳图标切换深色/浅色主题
5. **歌词显示**：点击右下角按钮显示/隐藏歌词面板

### 播放列表管理
- **添加歌曲**：在搜索结果中点击 "+" 按钮
- **删除歌曲**：在播放列表中点击 "×" 按钮
- **拖拽排序**：在自定义排序模式下拖拽歌曲调整顺序
- **排序方式**：支持 A-Z、Z-A、自定义排序

### 翻译功能设置
1. 点击右上角设置按钮
2. 在歌词设置中启用翻译功能
3. 获取并填写 GLM-4-Flashx API 令牌
4. 选择翻译策略（推荐"仅翻译没有翻译的外语歌"）

### 逐字歌词
- 在设置中启用逐字歌词功能
- 仅网易云音乐支持逐字歌词
- 若无逐字歌词，自动回退到普通歌词

## 🛠️ 技术栈

### 前端技术
- **HTML5** - 语义化标记
- **CSS3** - 现代布局与动画
- **JavaScript (ES6+)** - 核心交互逻辑
- **Font Awesome 6** - 图标系统
- **Apple 风格字体** - PingFang SC, SF Pro Display

### API 集成
- **音乐 API** - music-api.gdstudio.xyz
- **歌词翻译** - GLM-4-Flashx (Bigmodel)
- **网易云代理** - 多个 CORS 代理轮询

### 浏览器特性
- **Web Storage** - 本地数据存储
- **WebSocket** - 桌面歌词通信
- **Canvas API** - 专辑封面颜色提取
- **CSS Variables** - 动态主题系统
- **Drag & Drop API** - 拖拽排序功能

## 📁 项目结构

```
Harmonia-MusicPlayer/
├── index.html              # 主页面文件
├── fonts/                  # 字体文件目录
│   ├── PingFangSC-Regular.woff2
│   ├── PingFangSC-Semibold.woff2
│   ├── sf-pro-display_regular.woff2
│   └── sf-pro-display_semibold.woff2
├── default.svg             # 默认专辑封面
└── README.md              # 项目说明文档
```

## ⚙️ 配置说明

### 翻译 API 配置
1. 访问 Bigmodel 平台注册账号
2. 创建 API 令牌
3. 在设置中填入令牌即可使用翻译功能

### 代理服务器
内置多个网易云代理服务器，可按需在设置中自定义：
```javascript
const BUILTIN_NETEASE_PROXIES = [
  'https://cors.isomorphic-git.org/',
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
  // ... 更多代理
];
```

## 📱 响应式设计

- **桌面端**：完整功能，双栏布局
- **平板端**：自适应布局，优化控件间距
- **移动端**：简化界面，优化触摸操作

### 移动端优化
- 简化歌词字体大小
- 优化控制按钮间距
- 隐藏桌面歌词功能
- 触控友好的拖拽排序

## 🔧 开发指南

### 自定义主题
通过修改 CSS 变量自定义颜色主题：
```css
:root {
  --primary-color: #ff2d55;
  --bg-dark: #000;
  --text-dark: #fff;
  /* ... 更多变量 */
}
```

### 扩展功能
1. **添加新音乐源**：修改 `getAudioUrl` 和 `searchMusic` 函数
2. **自定义代理**：在设置中添加代理服务器
3. **主题扩展**：添加新的主题变量和切换逻辑

### 本地存储结构
```javascript
{
  musicPlaylist: [],    // 播放列表
  musicFavorites: [],   // 收藏列表
  musicHistory: [],     // 播放历史
  musicPlayerTheme: '', // 主题偏好
  translationSettings: {}, // 翻译设置
  lyricsSettings: {}    // 歌词设置
}
```

## 🌐 浏览器兼容性

- Chrome 60+ ✅
- Firefox 55+ ✅
- Safari 12+ ✅
- Edge 79+ ✅
- iOS Safari 12+ ✅
- Android Chrome 60+ ✅

**注意**：部分高级功能（如拖拽排序）在旧版浏览器中可能受限。

## 🙏 致谢

- 音乐 API 提供商：[GD音乐台开发者API](https://music-api.gdstudio.xyz)
- 字体提供：Apple PingFang, SF Pro
- 图标库：Font Awesome
- 设计灵感：Apple Music, iOS
- 歌词展示：[mengobs/musicplayer](https://github.com/mengobs/musicplayer)

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request 来改进这个项目！

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📞 支持与反馈

如有问题或建议，请：
1. 查看 [Issues](https://github.com/beststoryilove/Harmonia-MusicPlayer/issues) 页面
2. 提交新的 Issue 描述问题
3. 提供详细的复现步骤和预期行为

### 开发进度

- 我们将会保持1周左右的更新频率以保证用户的使用体验。
- 当前正式版本：v2.1（260216）；
- 当前开发版本：v2.2（暂未提供预览版本，敬请期待）；

- 您可以访问链接查看当前开发进度。
- [Harmonia开发版本预览](https://809blog.dpdns.org/Harmonia_Pre)

### 配套组件

- 我们提供桌面端的桌面歌词，您可以访问我们的仓库获得构建版本。
- [点我直达桌面歌词仓库](https://github.com/beststoryilove/Harmonia-DesktopLyrics/)

#### ❗❗❗温馨提示

- 由于逐字歌词的更新，目前桌面歌词暂不适用于使用逐字歌词的歌曲！
- 该问题预计将会在2月内修复，在此期间请不要使用桌面歌词，感谢您的理解。

---

**Harmonia - 让音乐触手可及** 🎶

*最后更新：2026年1月29日*
