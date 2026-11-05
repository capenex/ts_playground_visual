import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
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
  '.ts': 'text/plain; charset=utf-8',
  '.ipynb': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.zip': 'application/zip',
};

const COMPRESSIBLE_EXT = new Set([
  '.html',
  '.js',
  '.mjs',
  '.css',
  '.json',
  '.md',
  '.svg',
  '.ts',
  '.ipynb',
  '.wasm',
]);

const PREWARM_FILES = [
  'index.html',
  'css/app.css',
  'storage-guard.js',
  'js/app.bundle.js',
  'app-session.js',
  'editor/cm.bundle.js',
  'editor/ts-worker.bundle.js',
];

/**
 * In-memory asset cache keyed by absolute file path.
 * Stores raw buffer + pre-compressed Brotli & Gzip buffers + ETag,
 * automatically invalidated whenever file size or mtimeMs changes.
 */
const assetCache = new Map();

function getCachedAsset(filePath, stat) {
  const mtimeMs = Math.trunc(stat.mtimeMs);
  const size = stat.size;
  const cached = assetCache.get(filePath);
  if (cached && cached.mtimeMs === mtimeMs && cached.size === size) {
    return cached;
  }

  const ext = path.extname(filePath).toLowerCase();
  const raw = fs.readFileSync(filePath);
  const canCompress = COMPRESSIBLE_EXT.has(ext) && size >= 512 && size <= 10 * 1024 * 1024;

  let br = null;
  let gzip = null;
  if (canCompress) {
    try {
      br = zlib.brotliCompressSync(raw, {
        params: {
          [zlib.constants.BROTLI_PARAM_QUALITY]: 5,
          [zlib.constants.BROTLI_PARAM_SIZE_HINT]: size,
        },
      });
    } catch (_) {
      br = null;
    }
    try {
      gzip = zlib.gzipSync(raw, { level: 6 });
    } catch (_) {
      gzip = null;
    }
  }

  const entry = {
    mtimeMs,
    size,
    etag: `W/"${size.toString(16)}-${mtimeMs.toString(16)}"`,
    contentType: MIME[ext] || 'application/octet-stream',
    ext,
    raw,
    br,
    gzip,
  };
  assetCache.set(filePath, entry);
  return entry;
}

function getCacheControlHeader(ext, hasVersionQuery) {
  if (ext === '.html') {
    return 'no-cache';
  }
  if (hasVersionQuery) {
    return 'public, max-age=31536000, immutable';
  }
  return 'public, max-age=3600, must-revalidate';
}

function serveFile(req, res, filePath, stat, hasVersionQuery) {
  const entry = getCachedAsset(filePath, stat);
  const cacheControl = getCacheControlHeader(entry.ext, hasVersionQuery);

  const ifNoneMatch = req.headers['if-none-match'];
  if (ifNoneMatch && ifNoneMatch === entry.etag) {
    res.writeHead(304, {
      ETag: entry.etag,
      'Cache-Control': cacheControl,
      Vary: 'Accept-Encoding',
    });
    res.end();
    return;
  }

  const acceptEncoding = String(req.headers['accept-encoding'] || '');
  let payload = entry.raw;
  let encoding = null;

  if (entry.br && /\bbr\b/.test(acceptEncoding)) {
    payload = entry.br;
    encoding = 'br';
  } else if (entry.gzip && /\bgzip\b/.test(acceptEncoding)) {
    payload = entry.gzip;
    encoding = 'gzip';
  }

  const headers = {
    'Content-Type': entry.contentType,
    'Cache-Control': cacheControl,
    ETag: entry.etag,
    Vary: 'Accept-Encoding',
    'Content-Length': payload.byteLength,
  };
  if (encoding) {
    headers['Content-Encoding'] = encoding;
  }

  res.writeHead(200, headers);
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  res.end(payload);
}

const server = http.createServer((req, res) => {
  try {
    const rawUrl = req.url || '/';
    const qIndex = rawUrl.indexOf('?');
    const rawPath = qIndex >= 0 ? rawUrl.slice(0, qIndex) : rawUrl;
    const rawQuery = qIndex >= 0 ? rawUrl.slice(qIndex + 1) : '';
    const hasVersionQuery = /(?:^|&)v=[^&]+/.test(rawQuery);

    const urlPath = decodeURIComponent(rawPath);
    const relPath = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
    const candidates = [
      path.resolve(__dirname, relPath),
      path.resolve(__dirname, 'public', relPath),
    ];

    for (const filePath of candidates) {
      if (!filePath.startsWith(__dirname)) continue;
      if (fs.existsSync(filePath)) {
        const stat = fs.statSync(filePath);
        if (stat.isFile()) {
          serveFile(req, res, filePath, stat, hasVersionQuery);
          return;
        }
      }
    }

    // SPA fallback to index.html ONLY for HTML / extensionless routes (never serve HTML for missing .js/.css/.wasm)
    const reqExt = path.extname(relPath).toLowerCase();
    if (!reqExt || reqExt === '.html') {
      const indexFile = path.resolve(__dirname, 'index.html');
      if (fs.existsSync(indexFile)) {
        const stat = fs.statSync(indexFile);
        serveFile(req, res, indexFile, stat, false);
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

function prewarmFirstScreenAssets() {
  for (const rel of PREWARM_FILES) {
    const full = path.resolve(__dirname, rel);
    try {
      if (fs.existsSync(full)) {
        const stat = fs.statSync(full);
        if (stat.isFile()) getCachedAsset(full, stat);
      }
    } catch (_) {
      // Ignore individual prewarm errors
    }
  }
}

server.listen(PORT, HOST, () => {
  prewarmFirstScreenAssets();
  console.log(`Server listening on http://${HOST}:${PORT}`);
});
