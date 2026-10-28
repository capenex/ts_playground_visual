/**
 * Suite 04: Data Structure Normalizers (`classifyValue`, `normalizeTree`/`List`/`Graph`,
 * 1D/2D Focal Windowing, `VIZ` Renderers), Syntax Highlighting (`hl`),
 * CodeMirror 6 IntelliSense (`cm-entry.js`), and 1080p 60fps WebM Video Exporter.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, check, assertEq, resetSandbox } from './harness.mjs';

export async function runVizEditorSuite(sandbox) {
  resetSandbox(sandbox);

  // 1. Data Structure Classification (`classifyValue`) & Normalizers
  assertEq('classifyValue: 1D array', sandbox.classifyValue('arr', [10, 20, 30]).kind, 'array');
  assertEq('classifyValue: 2D grid matrix', sandbox.classifyValue('dp', [[1, 2], [3, 4]]).kind, 'grid');
  assertEq('classifyValue: Map', sandbox.classifyValue('freq', new sandbox.Map([['a', 1]])).kind, 'map');
  assertEq('classifyValue: Set', sandbox.classifyValue('seen', new sandbox.Set([1, 2])).kind, 'set');
  assertEq('classifyValue: stack by variable name', sandbox.classifyValue('monoStack', [1, 2, 3]).kind, 'stack');

  const treeRoot = { val: 1, left: { val: 2, left: null, right: null }, right: { val: 3, left: null, right: null } };
  const treeDesc = sandbox.classifyValue('root', treeRoot);
  assertEq('classifyValue: binary tree', treeDesc.kind, 'tree');
  assertEq('normalizeTree extracts 3 tree nodes', treeDesc.nodes.length, 3);

  const listHead = { val: 10, next: { val: 20, next: { val: 30, next: null } } };
  const listDesc = sandbox.classifyValue('head', listHead);
  assertEq('classifyValue: singly linked list', listDesc.kind, 'list');
  assertEq('normalizeList extracts 3 list items', listDesc.items.length, 3);

  // Cyclic linked list safety
  const c1 = { val: 1, next: null };
  const c2 = { val: 2, next: c1 };
  c1.next = c2;
  const cyclicList = sandbox.classifyValue('cyclic', c1);
  check('normalizeList terminates on cyclic linked list without infinite loop',
    cyclicList.kind === 'list' && cyclicList.items.length === 2,
  );

  // Class instance with custom constructor name via cloneDeepBounded
  class CustomPoint {
    constructor(x, y) {
      this.x = x;
      this.y = y;
    }
  }
  const clonedPt = sandbox.cloneDeepBounded(new CustomPoint(3, 4));
  const ptDesc = sandbox.classifyValue('pt', clonedPt);
  check('classifyValue identifies custom TypeScript class instance via __cls__',
    Boolean(ptDesc && ptDesc.kind === 'interface' && ptDesc.isClass && ptDesc.interfaceName === 'CustomPoint'),
  );

  // 2. 1D & 2D Focal Windowing + VIZ HTML Renderers
  const hugeArr = Array.from({ length: 120 }, (_, i) => i * 2);
  const arrSlice = sandbox.build1DFocalSlice(hugeArr.length, (idx) => hugeArr[idx], [60]);
  check('build1DFocalSlice creates windowed slice around focal index 60 with gaps',
    Array.isArray(arrSlice) && arrSlice.some((item) => item.gap === true) && arrSlice.some((item) => item.idx === 60),
  );

  const arrHtml = sandbox.VIZ.array(sandbox.classifyValue('hugeArr', hugeArr));
  check('VIZ.array renders HTML cells cleanly', typeof arrHtml === 'string' && arrHtml.includes('vcell'));

  const hugeGrid = Array.from({ length: 24 }, (_, r) =>
    Array.from({ length: 24 }, (__, c) => r * 100 + c),
  );
  const gridDesc = sandbox.classifyValue('hugeGrid', hugeGrid);
  gridDesc.mark = [12, 15];
  const gridHtml = sandbox.VIZ.grid(gridDesc);
  check('VIZ.grid 2D focal windowing renders active cell and grid HTML',
    typeof gridHtml === 'string' && gridHtml.includes('gcell'),
  );

  // 3. Syntax Highlighter (`hl`) & Hover Word Extractor (`hoverWordAt`)
  const highlighted = sandbox.hl(
    'function greet(name: string): string { return name; }',
    new Set(['greet', 'name']),
  );
  check('hl() wraps TypeScript keywords, types, and declared identifiers',
    highlighted.includes('class="kw"') &&
    highlighted.includes('class="typ"') &&
    highlighted.includes('class="fn"'),
  );

  const hw = sandbox.hoverWordAt('  const totalCount = items.length;', 11);
  assertEq('hoverWordAt extracts identifier under cursor', hw && hw.word, 'totalCount');

  // 4. CodeMirror 6 Editor Bundle & Pure TypeScript Configuration
  const cmBundlePath = path.join(ROOT, 'editor', 'cm.bundle.js');
  const cmEntryPath = path.join(ROOT, 'editor', 'cm-entry.js');
  check('editor/cm.bundle.js exists and is built', fs.existsSync(cmBundlePath) && fs.statSync(cmBundlePath).size > 50000);
  const cmEntrySrc = fs.readFileSync(cmEntryPath, 'utf8');
  check('editor/cm-entry.js has zero @codemirror/lang-python or PY_COMPLETIONS',
    !cmEntrySrc.includes('@codemirror/lang-python') && !cmEntrySrc.includes('PY_COMPLETIONS'),
  );

  // 5. Pure WebM Muxer (`muxWebmChunks`) & EBML Binary Framing
  const webmBlob = sandbox.muxWebmChunks(
    [
      { data: new Uint8Array([0x82, 0x49, 0x83, 0x42, 0x00, 0x11, 0x22]), timestampMs: 0, isKey: true },
      { data: new Uint8Array([0x02, 0x99, 0xaa, 0xbb]), timestampMs: 16, isKey: false },
    ],
    33,
    1920,
    1080,
    60,
    'V_VP8',
  );
  const webmBuf = new Uint8Array(await webmBlob.arrayBuffer());
  check('muxWebmChunks emits valid EBML magic header (0x1A 0x45 0xDF 0xA3) and non-empty stream',
    webmBuf.byteLength > 64 &&
    webmBuf[0] === 0x1a &&
    webmBuf[1] === 0x45 &&
    webmBuf[2] === 0xdf &&
    webmBuf[3] === 0xa3,
  );
}
