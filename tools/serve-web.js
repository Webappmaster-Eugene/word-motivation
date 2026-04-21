#!/usr/bin/env node
/**
 * Минимальный статик-сервер с SPA-fallback для `mobile/dist-web/`.
 * Используется для локальной проверки собранного Expo Web бандла.
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = Number(process.env.PORT ?? 8765);
const ROOT = path.resolve(__dirname, '..', 'mobile', 'dist-web');

const MIMES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
};

const server = http.createServer((req, res) => {
  const urlPath = (req.url ?? '/').split('?')[0];
  let safePath = path.posix.normalize(urlPath);
  if (safePath === '/') safePath = '/index.html';
  const full = path.join(ROOT, safePath);

  if (!full.startsWith(ROOT) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) {
    // SPA fallback → index.html
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(fs.readFileSync(path.join(ROOT, 'index.html')));
    return;
  }

  const ext = path.extname(full).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIMES[ext] ?? 'application/octet-stream' });
  res.end(fs.readFileSync(full));
});

server.listen(PORT, '127.0.0.1', () => {
  // eslint-disable-next-line no-console
  console.log(`[serve-web] http://127.0.0.1:${PORT}  root=${ROOT}`);
});
