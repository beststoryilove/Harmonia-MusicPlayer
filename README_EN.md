# Harmonia MusicPlayer

![Harmonia](https://img.shields.io/badge/Harmonia-Music_Player-ff2d55)
![Platform](https://img.shields.io/badge/Platform-Web-34aadc)

A sleek, feature-rich online music player inspired by Apple Music, with word-by-word lyrics, playlist management, multiple themes, and more (vibecoding project).

[**🎧 Live Demo**](https://harmoniamusicplayer.dpdns.org) | [中文版](README.md)

---

## ✨ Features

- **Multi-platform music search & playback**
- **Apple Music-style UI** – dynamic backgrounds, 3D album art, and a Dynamic Island search panel
- **Immersive lyrics** – KTV-style word-by-word highlighting, scrolling lyrics, click-to-seek
- **Smart translation** – auto-detect & translate foreign lyrics via GLM-4-Flashx API
- **Playlist management** – drag-and-drop sorting, favorites, play history, import/export
- **Desktop lyrics** – connect via WebSocket to a standalone desktop lyrics client
- **Theme switching** – light/dark modes, customizable via CSS variables
- **Responsive design** – desktop, tablet, and mobile friendly
- **Playback modes** – sequential, single repeat, shuffle
- **Built-in proxy** – self-hosted Netease CORS proxy (customizable)

---

## 🚀 Getting Started

**Online**  
Visit [https://harmoniamusicplayer.dpdns.org](https://harmoniamusicplayer.dpdns.org)

**Local Run**
```bash
git clone https://github.com/beststoryilove/Harmonia-MusicPlayer.git
cd Harmonia-MusicPlayer
python -m http.server 8000   # Python 3
```
Open `http://localhost:8000` in your browser.

**Quick Tips**  
- Click the Dynamic Island or press `Tab` to search  
- Toggle lyrics panel via the bottom‑right button  
- Switch theme with the top‑right icon; enable translation in Settings and paste your API token

---

## 🛠 Tech Stack

| Category | Technology |
|----------|------------|
| Core | HTML5, CSS3, JavaScript (ES6+) |
| Audio | Web Audio API |
| Storage | Web Storage (localStorage) |
| Graphics | Canvas API (color extraction) |
| Communication | WebSocket (desktop lyrics) |
| Drag & Drop | Drag & Drop API |
| Media Control | Media Session API |
| Lyrics | Custom LRC parser with word-level support |
| Translation | GLM-4-Flashx API (Bigmodel) |
| Fonts | PingFang SC, SF Pro Display, Font Awesome 6 |

---

## 📁 Project Structure

```
Harmonia-MusicPlayer/
├── index.html              # Main page
├── fonts/                  # Font files
├── default.svg             # Default album art
└── README.md
```

---

## ⚙️ Configuration

- **Translation API**: Get an API token from [Bigmodel](https://open.bigmodel.cn) and enter it in Settings.
- **Proxy**: A built‑in Netease proxy is provided and can be customized in Settings.

---

## 🌐 Browser Compatibility

Chrome 60+ · Firefox 55+ · Safari 12+ · Edge 79+ · iOS Safari 12+ · Android Chrome 60+

Some advanced features (e.g., drag-and-drop) may be limited in older browsers.

---

## 🙏 Acknowledgements

- Music API: [GD Music Station Developer API](https://music-api.gdstudio.xyz)
- Fonts: Apple PingFang, SF Pro
- Icons: Font Awesome
- Design inspiration: Apple Music, iOS
- Lyrics display reference: [mengobs/musicplayer](https://github.com/mengobs/musicplayer)

---

## 🤝 Contributing

Issues and pull requests are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📌 Project Status

- **Stable version**: v3.3.4 (260510)  
- **Development version**: v3.4 (in testing) – [Preview](https://809blog.dpdns.org/Harmonia_Pre)  
- **Update frequency**: ~weekly  
- **Desktop lyrics**: [Separate repository](https://github.com/beststoryilove/Harmonia-DesktopLyrics/) (Kugou word-by-word lyrics under adaptation)

---

## 🤖 AI models used

AI models used in this project so far (sorted A–Z):
1. ChatGPT(including GPT-4.5, GPT-5, GPT-5.1–5.5)
2. Deepseek(including R1, V3, V3.1, V3.2, V3.2 speciale, V4)
3. Gemini(including 3.0 Pro, 3.1 Pro)
4. Grok(including v4.1–4.3)
5. Qwen(including all v3.5–v3.6 series models)

---

## 💬 Community & Contact

- **Official Blog**: [azalkmin.abrdns.com](https://azalkmin.abrdns.com/)
- **QQ Group**: Click to join [https://qm.qq.com/q/p4WYBXFGNO](https://qm.qq.com/q/p4WYBXFGNO)  
  Or scan the QR code below:

<img src="https://raw.githubusercontent.com/beststoryilove/Harmonia-MusicPlayer/main/qrcode_1779913195527.jpg" width="150" alt="QQ Group QR Code"/>

---

## 📊 Star History

<a href="https://www.star-history.com/?repos=beststoryilove%2FHarmonia-MusicPlayer&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=beststoryilove/Harmonia-MusicPlayer&type=date&theme=dark&legend=bottom-right" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=beststoryilove/Harmonia-MusicPlayer&type=date&legend=bottom-right" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=beststoryilove/Harmonia-MusicPlayer&type=date&legend=bottom-right" />
 </picture>
</a>

**Harmonia – Music at your fingertips** 🎶
