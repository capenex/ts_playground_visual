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
  const appCssPath = path.join(ROOT, 'css', 'app.css');
  check('editor/cm.bundle.js exists and is built', fs.existsSync(cmBundlePath) && fs.statSync(cmBundlePath).size > 50000);
  const cmEntrySrc = fs.readFileSync(cmEntryPath, 'utf8');
  const appCssSrc = fs.readFileSync(appCssPath, 'utf8');
  check('editor/cm-entry.js has zero @codemirror/lang-python or PY_COMPLETIONS',
    !cmEntrySrc.includes('@codemirror/lang-python') && !cmEntrySrc.includes('PY_COMPLETIONS'),
  );
  check('editor/cm-entry.js and css/app.css disable font ligatures and enforce opaque #070b10 background to prevent deleted char ghosting',
    cmEntrySrc.includes("fontVariantLigatures: 'none'") &&
    cmEntrySrc.includes('fontFeatureSettings: \'"liga" 0, "calt" 0\'') &&
    cmEntrySrc.includes("backgroundColor: '#070b10'") &&
    appCssSrc.includes('#cmEditor .cm-scroller{overflow:auto;background:#070b10;letter-spacing:0;font-variant-ligatures:none;') &&
    cmEntrySrc.includes('if (effects.length > 0) {\n      view.dispatch({ effects });\n    }'),
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

  // 6. Static `interface` (Decoupled from Runtime Instances) & Static `type` Alias Visualization
  resetSandbox(sandbox);
  const schemaAndTypeSrc = [
    'export interface CalcJob {',
    '  id: string;',
    '  formula: string;',
    '  cutoffEnergyEv: number;',
    '  note?: string;',
    '}',
    "type JobPriority = 'low' | 'normal' | 'high';",
    "type CreateCalcJobInput = Omit<CalcJob, 'id'>;",
    'type JobState =',
    "  | {status: 'queued'; queuePosition: number}",
    "  | {status: 'completed'; totalEnergyEv: number}",
    "  | {status: 'failed'; reason: string};",
    "let job: CalcJob = {id: '123', formula: 'xyz', cutoffEnergyEv: 114};",
    "job.id = '456';",
    'console.log(job);',
    '1;',
  ].join('\n');
  sandbox.startDebug(2, schemaAndTypeSrc);
  const stepDs = sandbox.TRACE.steps[sandbox.cur]?.ds || {};
  const calcJobSchema = stepDs.CalcJob;
  const jobInstance = stepDs.job;
  check('interface CalcJob schema card exists and is not bound to runtime instance `job`',
    Boolean(
      calcJobSchema &&
      calcJobSchema.kind === 'interface' &&
      calcJobSchema.isSchema === true &&
      calcJobSchema.instanceName === null &&
      Array.isArray(calcJobSchema.fields) &&
      calcJobSchema.fields.every((f) => f.v === undefined)
    ),
  );
  const calcJobHtml = sandbox.VIZ.interface(calcJobSchema);
  check('VIZ.interface renders pure static definition without instance values or `绑定` / `未实例化`',
    typeof calcJobHtml === 'string' &&
    calcJobHtml.includes('definition') &&
    !calcJobHtml.includes('绑定') &&
    !calcJobHtml.includes('456') &&
    !calcJobHtml.includes('未实例化'),
  );
  check('runtime instance `job` still renders its own runtime values',
    Boolean(jobInstance && jobInstance.isSchema === false && sandbox.VIZ.interface(jobInstance).includes('456')),
  );

  const priorityType = stepDs.JobPriority;
  const omitType = stepDs.CreateCalcJobInput;
  const stateType = stepDs.JobState;
  check('type JobPriority is visualized as a static union type with 3 branches',
    Boolean(
      priorityType &&
      priorityType.kind === 'type' &&
      priorityType.isSchema === true &&
      priorityType.instanceName === null &&
      priorityType.aliasKind === 'union' &&
      Array.isArray(priorityType.unionBranches) &&
      priorityType.unionBranches.length === 3 &&
      sandbox.VIZ.type(priorityType).includes('low')
    ),
  );
  check('type CreateCalcJobInput = Omit<CalcJob, "id"> resolves omitted fields statically without `id`',
    Boolean(
      omitType &&
      omitType.kind === 'type' &&
      omitType.isSchema === true &&
      omitType.instanceName === null &&
      omitType.aliasKind === 'object' &&
      Array.isArray(omitType.fields) &&
      omitType.fields.length === 3 &&
      omitType.fields.some((f) => f.k === 'formula') &&
      !omitType.fields.some((f) => f.k === 'id') &&
      sandbox.VIZ.type(omitType).includes('Omit&lt;CalcJob')
    ),
  );
  check('type JobState multi-line discriminated union is visualized with 3 object branches',
    Boolean(
      stateType &&
      stateType.kind === 'type' &&
      stateType.isSchema === true &&
      stateType.instanceName === null &&
      stateType.aliasKind === 'union' &&
      Array.isArray(stateType.unionBranches) &&
      stateType.unionBranches.length === 3 &&
      stateType.unionBranches.every((b) => b.isObject === true) &&
      sandbox.VIZ.type(stateType).includes('queuePosition') &&
      sandbox.VIZ.type(stateType).includes('totalEnergyEv')
    ),
  );
}

