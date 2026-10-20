import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'editor', 'cm.bundle.js');

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

const fs = await import('node:fs');
const kb = Math.round(fs.statSync(OUT).size / 1024);
console.log(`built editor/cm.bundle.js · ${kb} KB`);
