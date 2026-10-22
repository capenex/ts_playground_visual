import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webm': 'video/webm',
  '.ico': 'image/x-icon',
  '.py': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
  '.zip': 'application/zip',
};

const server = http.createServer((req, res) => {
  try {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    const relPath = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
    const candidates = [
      path.resolve(__dirname, relPath),
      path.resolve(__dirname, 'public', relPath),
    ];

    for (const filePath of candidates) {
      if (!filePath.startsWith(__dirname)) continue;
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, {
          'Content-Type': MIME[ext] || 'application/octet-stream',
          'Cache-Control': 'no-cache',
        });
        fs.createReadStream(filePath).pipe(res);
        return;
      }
    }

    // SPA fallback to index.html ONLY for HTML / extensionless routes (never serve HTML for missing .js/.css/.wasm)
    const reqExt = path.extname(relPath).toLowerCase();
    if (!reqExt || reqExt === '.html') {
      const indexFile = path.resolve(__dirname, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache',
        });
        fs.createReadStream(indexFile).pipe(res);
        return;
      }
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(String(err && err.message ? err.message : err));
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
});
