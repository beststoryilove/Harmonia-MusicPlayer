// ============================================================================
// Harmonia Service Worker — Kugou CDN Referer Fix
// ============================================================================
// 酷狗 CDN 会校验请求来源（Referer），浏览器在加载 <audio> 时无法自定义该头，
// 导致直接请求 mp3 返回 403。此 SW 拦截所有到酷狗 CDN 的音频请求，注入正确的
// Referer 头，使播放正常化。
//
// 兼容 GitHub Pages：SW 通过 app.js 中动态计算 scope 注册，自动适配子目录部署。
// ============================================================================

const KUGOU_CDN_PATTERN = /\.kugou\.com\//i;
const AUDIO_EXT_PATTERN = /\.(mp3|m4a|flac|wav|ogg|aac|wma|ape)(\?|$)/i;
const REFERER_URL = 'https://www.kugou.com/';

// SW 安装：立即激活
self.addEventListener('install', (event) => {
  console.log('[Harmonia SW] Installing...');
  event.waitUntil(self.skipWaiting());
});

// SW 激活：接管所有页面
self.addEventListener('activate', (event) => {
  console.log('[Harmonia SW] Activated.');
  event.waitUntil(self.clients.claim());
});

// 拦截 fetch 请求
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isKugouCdn = KUGOU_CDN_PATTERN.test(url.hostname);
  const isAudio = AUDIO_EXT_PATTERN.test(url.pathname);

  // 只处理酷狗 CDN 的音频请求
  if (!isKugouCdn || !isAudio) {
    return; // 不拦截，浏览器默认处理
  }

  console.log(`[Harmonia SW] Intercepting Kugou audio: ${url.hostname}${url.pathname}`);

  // 构造新请求，仅附加 Referer 头（保留原始 mode/credentials/origin 不变）
  const modifiedHeaders = new Headers(event.request.headers);
  modifiedHeaders.set('Referer', REFERER_URL);

  // 保留原始请求的 mode，避免破坏 CORS 语义
  const modifiedRequest = new Request(event.request, {
    headers: modifiedHeaders,
    mode: event.request.mode,
    credentials: event.request.credentials,
  });

  event.respondWith(
    fetch(modifiedRequest).then((response) => {
      if (!response.ok) {
        console.warn(`[Harmonia SW] Kugou CDN returned ${response.status} for: ${url.href}`);
      }
      return response;
    }).catch((err) => {
      console.error(`[Harmonia SW] Failed to fetch Kugou audio:`, err);
      // 失败时返回错误响应，让 <audio> 触发 error → 页面端重试逻辑接管
      return new Response('Service Worker fetch failed', { status: 502 });
    })
  );
});
