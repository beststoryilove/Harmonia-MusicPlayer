#!/usr/bin/env node
/**
 * 零依赖静态服务器。
 *
 * 为什么需要它：demo 用 ES module + fetch 加载样本，file:// 协议下
 * 模块加载与 fetch 都会被 CORS 策略拦截。因此必须经 http 打开。
 *
 * 用法：
 *   node serve.mjs            默认 http://127.0.0.1:8791
 *   node serve.mjs --port 9000
 *   node serve.mjs --open     启动后自动打开浏览器
 *
 * 仅监听 127.0.0.1，只服务本目录，不做目录穿越之外的任何事。
 */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ttml': 'application/xml; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function parseArgs(argv) {
  const out = { port: 8791, open: false, host: '127.0.0.1' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--open') out.open = true;
    else if (arg === '--port') out.port = Number(argv[++i]) || out.port;
    else if (arg === '--host') out.host = argv[++i] || out.host;
    else if (/^\d+$/.test(arg)) out.port = Number(arg);
  }
  return out;
}

/**
 * 把 URL 路径解析为磁盘路径，并确认它没有逃出 ROOT。
 *
 * @param {string} urlPath
 * @returns {string|null} 安全路径；越界返回 null
 */
function safeResolve(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  const rel = normalize(decoded).replace(/^([/\\])+/, '');
  const full = join(ROOT, rel);
  if (full !== ROOT && !full.startsWith(ROOT + sep)) return null;
  return full;
}

const server = createServer(async (req, res) => {
  const started = Date.now();
  let target = safeResolve(req.url || '/');
  if (!target) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 路径越界');
    return;
  }
  try {
    let info = await stat(target).catch(() => null);
    if (info?.isDirectory()) {
      target = join(target, 'index.html');
      info = await stat(target).catch(() => null);
    }
    if (!info?.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`404 未找到：${req.url}`);
      console.log(`404 ${req.url}`);
      return;
    }
    const body = await readFile(target);
    res.writeHead(200, {
      'Content-Type': MIME[extname(target).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'Content-Length': body.length,
    });
    res.end(body);
    console.log(`200 ${req.url} (${body.length}B, ${Date.now() - started}ms)`);
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`500 ${error.message}`);
    console.error(`500 ${req.url}`, error);
  }
});

const args = parseArgs(process.argv.slice(2));
server.listen(args.port, args.host, () => {
  const url = `http://${args.host}:${args.port}/`;
  console.log(`TTML 歌词三模式 Demo 已启动：${url}`);
  console.log('自检：' + url + '?selftest=1');
  console.log('自动播放：' + url + '?autoplay=1');
  console.log('按 Ctrl+C 停止。');
  if (args.open) {
    const cmd = process.platform === 'win32' ? 'cmd' : (process.platform === 'darwin' ? 'open' : 'xdg-open');
    const cmdArgs = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
    try {
      spawn(cmd, cmdArgs, { detached: true, stdio: 'ignore' }).unref();
    } catch (error) {
      console.warn('自动打开浏览器失败，请手动访问上面的地址。', error.message);
    }
  }
});

process.on('SIGINT', () => {
  console.log('\n已停止。');
  server.close(() => process.exit(0));
});
