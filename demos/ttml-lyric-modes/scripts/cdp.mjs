/**
 * 无依赖 CDP 客户端 —— 供冒烟与截图脚本复用。
 *
 * 为什么不用 puppeteer：本项目零依赖原则，且 Electron 未安装。
 * 系统 Chrome 已存在，直接用其远程调试协议（CDP）即可完成
 * 「加载页面 → 等自检 → 读结果 → 截图」的全部需求。
 *
 * 实现要点：
 *  - 用 node:http 发 HTTP 请求拿到 /json/list 里的 webSocketDebuggerUrl；
 *  - 用 node:http 的 upgrade 事件手写 WebSocket 握手与帧编解码
 *    （只支持服务端→客户端的小消息，足够 CDP 使用）。
 */

import { createServer as createHttpServer, request as httpRequest } from 'node:http';
import { createHash, randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

/** 常见 Chrome 安装位置。 */
const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

/**
 * 找到可用的 Chrome 可执行文件。
 *
 * @returns {string} 路径
 * @throws 找不到时抛错
 */
export function findChrome() {
  for (const candidate of CHROME_CANDIDATES) {
    if (candidate && existsSync(candidate)) return candidate;
  }
  throw new Error('未找到 Chrome/Edge，请设置环境变量 CHROME_PATH');
}

/** 等待若干毫秒。 */
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 选一个空闲端口（先监听 0 再读回端口号）。
 *
 * @returns {Promise<number>}
 */
export function freePort() {
  return new Promise((resolve, reject) => {
    const server = createHttpServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

/** GET 一个本地 HTTP 地址并返回 JSON。 */
function getJson(url) {
  return new Promise((resolve, reject) => {
    const req = httpRequest(url, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (error) { reject(new Error(`JSON 解析失败: ${body.slice(0, 200)}`)); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

/**
 * 极简 WebSocket 客户端（仅文本帧，客户端→服务端带掩码）。
 */
class MiniWebSocket {
  constructor(socket) {
    this.socket = socket;
    this.buffer = Buffer.alloc(0);
    this.handlers = new Set();
    this.closed = false;
    socket.on('data', (chunk) => this.onData(chunk));
    socket.on('close', () => { this.closed = true; });
    socket.on('error', () => { this.closed = true; });
  }

  onData(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    // 逐帧解析：至少需要 2 字节头
    for (;;) {
      if (this.buffer.length < 2) return;
      const first = this.buffer[0];
      const second = this.buffer[1];
      const opcode = first & 0x0f;
      const masked = (second & 0x80) !== 0;
      let length = second & 0x7f;
      let offset = 2;
      if (length === 126) {
        if (this.buffer.length < offset + 2) return;
        length = this.buffer.readUInt16BE(offset);
        offset += 2;
      } else if (length === 127) {
        if (this.buffer.length < offset + 8) return;
        const big = this.buffer.readBigUInt64BE(offset);
        if (big > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('WebSocket 帧过大');
        length = Number(big);
        offset += 8;
      }
      let maskKey = null;
      if (masked) {
        if (this.buffer.length < offset + 4) return;
        maskKey = this.buffer.subarray(offset, offset + 4);
        offset += 4;
      }
      if (this.buffer.length < offset + length) return;
      let payload = this.buffer.subarray(offset, offset + length);
      if (maskKey) {
        payload = Buffer.from(payload);
        for (let i = 0; i < payload.length; i += 1) payload[i] ^= maskKey[i % 4];
      }
      this.buffer = this.buffer.subarray(offset + length);

      if (opcode === 0x1) {
        const text = payload.toString('utf8');
        for (const handler of this.handlers) handler(text);
      } else if (opcode === 0x8) {
        this.closed = true;
        return;
      }
      // 0x9 ping / 0xA pong / 0x0 continuation：本场景不出现，忽略
    }
  }

  onMessage(handler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  send(text) {
    if (this.closed) throw new Error('WebSocket 已关闭');
    const payload = Buffer.from(text, 'utf8');
    const mask = randomBytes(4);
    let header;
    if (payload.length < 126) {
      header = Buffer.alloc(2);
      header[1] = 0x80 | payload.length;
    } else if (payload.length < 65536) {
      header = Buffer.alloc(4);
      header[1] = 0x80 | 126;
      header.writeUInt16BE(payload.length, 2);
    } else {
      header = Buffer.alloc(10);
      header[1] = 0x80 | 127;
      header.writeBigUInt64BE(BigInt(payload.length), 2);
    }
    header[0] = 0x81; // FIN + text
    const masked = Buffer.from(payload);
    for (let i = 0; i < masked.length; i += 1) masked[i] ^= mask[i % 4];
    this.socket.write(Buffer.concat([header, mask, masked]));
  }

  close() {
    this.closed = true;
    try { this.socket.destroy(); } catch { /* 忽略 */ }
  }
}

/**
 * 启动一个 headless Chrome，返回 CDP 控制句柄。
 *
 * @param {object} [options]
 * @param {number} [options.width=1600] 视口宽
 * @param {number} [options.height=900] 视口高
 * @returns {Promise<{cdp: object, close: () => Promise<void>, port: number}>}
 */
export async function launchChrome(options = {}) {
  const width = options.width || 1600;
  const height = options.height || 900;
  const chromePath = findChrome();
  const port = await freePort();
  const userDataDir = `${process.env.TEMP || '/tmp'}/ttml-demo-chrome-${Date.now()}`;

  const args = [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    `--window-size=${width},${height}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--disable-extensions',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    'about:blank',
  ];

  // 该标志仅用于测试环境：headless 下没有真实用户手势，
  // <audio>.play() 必然被自动播放策略拒绝，导致「音频驱动歌词」这条链路无法自动验证。
  // 真实浏览器中该策略仍然生效，应用侧也已对拒绝做了提示处理（见 app.js）。
  if (options.allowAutoplay) args.unshift('--autoplay-policy=no-user-gesture-required');

  const child = spawn(chromePath, args, { stdio: 'ignore', detached: false });

  // 轮询等待调试端口就绪
  let version = null;
  for (let i = 0; i < 100; i += 1) {
    try {
      version = await getJson(`http://127.0.0.1:${port}/json/version`);
      break;
    } catch {
      await sleep(100);
    }
  }
  if (!version) {
    child.kill();
    throw new Error('Chrome 调试端口未就绪');
  }

  const targets = await getJson(`http://127.0.0.1:${port}/json/list`);
  const page = targets.find((t) => t.type === 'page');
  if (!page) {
    child.kill();
    throw new Error('未找到可用的 page target');
  }

  const cdp = await connectCdp(page.webSocketDebuggerUrl);

  return {
    port,
    cdp,
    chromeVersion: version.Browser,
    async close() {
      try { cdp.close(); } catch { /* 忽略 */ }
      child.kill();
      await sleep(200);
    },
  };
}

/** 与服务端建立 CDP 连接并完成握手。 */
function connectCdp(wsUrl) {
  return new Promise((resolve, reject) => {
    const url = new URL(wsUrl);
    const key = randomBytes(16).toString('base64');
    const req = httpRequest({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        Connection: 'Upgrade',
        Upgrade: 'websocket',
        'Sec-WebSocket-Key': key,
        'Sec-WebSocket-Version': '13',
      },
    });

    req.on('upgrade', (res, socket) => {
      const accept = res.headers['sec-websocket-accept'];
      const expected = createHash('sha1')
        .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
        .digest('base64');
      if (accept !== expected) {
        socket.destroy();
        reject(new Error('WebSocket 握手校验失败'));
        return;
      }
      const ws = new MiniWebSocket(socket);
      let nextId = 1;
      const pending = new Map();
      const listeners = new Set();

      ws.onMessage((text) => {
        let msg;
        try { msg = JSON.parse(text); } catch { return; }
        if (msg.id && pending.has(msg.id)) {
          const { resolve: res2, reject: rej2 } = pending.get(msg.id);
          pending.delete(msg.id);
          if (msg.error) rej2(new Error(`${msg.error.message} (${JSON.stringify(msg.error.data || '')})`));
          else res2(msg.result);
        } else if (msg.method) {
          for (const listener of listeners) listener(msg);
        }
      });

      resolve({
        send(method, params = {}, timeoutMs = 30000) {
          const id = nextId++;
          return new Promise((res2, rej2) => {
            const timer = setTimeout(() => {
              if (pending.has(id)) {
                pending.delete(id);
                rej2(new Error(`CDP 超时: ${method}`));
              }
            }, timeoutMs);
            pending.set(id, {
              resolve: (v) => { clearTimeout(timer); res2(v); },
              reject: (e) => { clearTimeout(timer); rej2(e); },
            });
            ws.send(JSON.stringify({ id, method, params }));
          });
        },
        on(method, handler) {
          const wrapped = (msg) => { if (msg.method === method) handler(msg.params); };
          listeners.add(wrapped);
          return () => listeners.delete(wrapped);
        },
        close() { ws.close(); },
        get closed() { return ws.closed; },
      });
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * 打开一个页面，等待到「可交互」状态。
 *
 * @param {object} cdp
 * @param {string} url
 * @param {object} [options]
 * @param {number} [options.timeoutMs=30000]
 * @param {number} [options.width=1600]
 * @param {number} [options.height=900]
 */
export async function openPage(cdp, url, options = {}) {
  const timeoutMs = options.timeoutMs || 30000;
  const width = options.width || 1600;
  const height = options.height || 900;

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable').catch(() => {});
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width, height, deviceScaleFactor: 1, mobile: false,
  });

  const consoleErrors = [];
  cdp.on('Runtime.exceptionThrown', (params) => {
    consoleErrors.push(params?.exceptionDetails?.exception?.description
      || params?.exceptionDetails?.text || '未知异常');
  });
  cdp.on('Log.entryAdded', (params) => {
    if (params?.entry?.level === 'error') consoleErrors.push(params.entry.text);
  });

  const loaded = new Promise((resolve) => {
    const off = cdp.on('Page.loadEventFired', () => { off(); resolve(); });
  });

  await cdp.send('Page.navigate', { url });
  await Promise.race([
    loaded,
    sleep(timeoutMs).then(() => { throw new Error(`页面加载超时: ${url}`); }),
  ]);

  return { consoleErrors };
}

/**
 * 在页面里执行表达式并返回其 JSON 值。
 *
 * @param {object} cdp
 * @param {string} expression
 * @param {object} [options]
 * @param {boolean} [options.awaitPromise=true]
 * @returns {Promise<any>}
 */
export async function evaluate(cdp, expression, options = {}) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: options.awaitPromise !== false,
    timeout: options.timeoutMs || 30000,
  });
  if (result.exceptionDetails) {
    throw new Error(`页面求值异常: ${result.exceptionDetails.exception?.description
      || result.exceptionDetails.text}`);
  }
  return result.result?.value;
}

/**
 * 等待页面内条件成立（轮询求值）。
 *
 * @param {object} cdp
 * @param {string} expression 返回真值的表达式
 * @param {object} [options]
 * @returns {Promise<boolean>}
 */
export async function waitFor(cdp, expression, options = {}) {
  const timeoutMs = options.timeoutMs || 30000;
  const interval = options.intervalMs || 150;
  const started = Date.now();
  for (;;) {
    const ok = await evaluate(cdp, expression).catch(() => false);
    if (ok) return true;
    if (Date.now() - started > timeoutMs) return false;
    await sleep(interval);
  }
}

/**
 * 截图并写入文件。
 *
 * @param {object} cdp
 * @param {string} filePath
 * @param {object} [options]
 */
export async function screenshot(cdp, filePath, options = {}) {
  const result = await cdp.send('Page.captureScreenshot', {
    format: options.format || 'png',
    captureBeyondViewport: false,
    fromSurface: true,
  });
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, Buffer.from(result.data, 'base64'));
  return filePath;
}
