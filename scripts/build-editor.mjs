import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'editor', 'cm.bundle.js');
const TS_WORKER_OUT = path.join(ROOT, 'editor', 'ts-worker.bundle.js');
const APP_OUT = path.join(ROOT, 'js', 'app.bundle.js');

await build({
  entryPoints: [path.join(ROOT, 'src', 'main.ts')],
  bundle: true,
  minify: false,
  format: 'iife',
  target: ['chrome100', 'firefox100', 'safari16'],
  outfile: APP_OUT,
  legalComments: 'none',
  logLevel: 'warning',
});

await build({
  entryPoints: [path.join(ROOT, 'editor', 'cm-entry.js')],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['chrome100', 'firefox100', 'safari16'],
  outfile: OUT,
  legalComments: 'none',
  logLevel: 'warning',
});

await build({
  entryPoints: [path.join(ROOT, 'editor', 'ts-worker-entry.js')],
  bundle: true,
  minify: true,
  platform: 'browser',
  format: 'iife',
  target: ['chrome100', 'firefox100', 'safari16'],
  outfile: TS_WORKER_OUT,
  legalComments: 'none',
  logLevel: 'warning',
});

const fs = await import('node:fs');

const STORAGE_VERSION = process.env.STORAGE_VERSION || '20261026-1';
const guardPath = path.join(ROOT, 'storage-guard.js');
if (fs.existsSync(guardPath)) {
  const guardSrc = fs.readFileSync(guardPath, 'utf8');
  const nextGuardSrc = guardSrc.replace(
    /var CURRENT_STORAGE_VERSION = '[^']+';/,
    `var CURRENT_STORAGE_VERSION = '${STORAGE_VERSION}';`
  );
  if (nextGuardSrc !== guardSrc) fs.writeFileSync(guardPath, nextGuardSrc, 'utf8');
}
const indexPath = path.join(ROOT, 'index.html');
if (fs.existsSync(indexPath)) {
  const indexSrc = fs.readFileSync(indexPath, 'utf8');
  const nextIndexSrc = indexSrc.replace(
    /<script src="storage-guard\.js(\?v=[^"]*)?"><\/script>/,
    `<script src="storage-guard.js?v=${STORAGE_VERSION}"></script>`
  );
  if (nextIndexSrc !== indexSrc) fs.writeFileSync(indexPath, nextIndexSrc, 'utf8');
}

const appKb = Math.round(fs.statSync(APP_OUT).size / 1024);
const kb = Math.round(fs.statSync(OUT).size / 1024);
const tsKb = Math.round(fs.statSync(TS_WORKER_OUT).size / 1024);
console.log(`built js/app.bundle.js · ${appKb} KB | editor/cm.bundle.js · ${kb} KB | editor/ts-worker.bundle.js · ${tsKb} KB | storage-version · ${STORAGE_VERSION}`);

