import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

const FILES = [
  'index.html',
  'share.html',
  'app-session.js',
  'editor/cm.bundle.js',
  'editor/ts-worker.bundle.js',
  'README.md',
  'USER_GUIDE.md',
  'SYNTAX_REFERENCE.md',
  'DEPLOY.md',
];
const DIRS = ['python', 'js', 'css'];

const REQUIRED = [
  'index.html',
  'share.html',
  'app-session.js',
  'editor/cm.bundle.js',
  'editor/ts-worker.bundle.js',
  'DEPLOY.md',
  'python/py_engine.js',
  'python/py_worker.js',
  'python/py_bridge.py',
  'python/serve.mjs',
  'css/app.css',
  'js/01-prelude-and-samples.js',
  'js/10-video-export-and-boot.js',
];

function copyFile(rel) {
  const src = path.join(ROOT, rel);
  if (!fs.existsSync(src)) throw new Error('missing build input: ' + rel);
  const dest = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDir(rel) {
  const src = path.join(ROOT, rel);
  if (!fs.existsSync(src)) throw new Error('missing build input: ' + rel);
  fs.cpSync(src, path.join(DIST, rel), {
    recursive: true,
    filter: (item) => !item.includes(`${path.sep}__pycache__`) && !item.endsWith('__pycache__'),
  });
}

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

FILES.forEach(copyFile);
DIRS.forEach(copyDir);

for (const rel of REQUIRED) {
  if (!fs.existsSync(path.join(DIST, rel))) {
    throw new Error('build output missing: ' + rel);
  }
}

let fileCount = 0;
let totalBytes = 0;
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else {
      fileCount++;
      totalBytes += fs.statSync(full).size;
    }
  }
}
walk(DIST);

const kb = Math.round(totalBytes / 1024);
console.log(`built dist/ · ${fileCount} files · ${kb} KB`);
console.log('deploy the dist/ folder to any static host; run locally with: node dist/python/serve.mjs');
