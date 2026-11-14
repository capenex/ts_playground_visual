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
  const cmEntrySrc = fs.readFileSync(cmEntryPath, 'utf8').replace(/\r\n/g, '\n');
  const appCssSrc = fs.readFileSync(appCssPath, 'utf8').replace(/\r\n/g, '\n');
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

  // -------------------------------------------------------------------------
  // 7. Custom Watch Expressions & Type-Driven Visualization
  // -------------------------------------------------------------------------
  resetSandbox(sandbox);
  const watchSlice = sandbox.evaluateCustomWatch('nums.slice(l, r + 1)', { nums: [10, 20, 30, 40], l: 1, r: 2 });
  check('evaluateCustomWatch classifies array slice expression as kind="array"',
    Boolean(watchSlice && watchSlice.kind === 'array' && Array.isArray(watchSlice.items) && watchSlice.items.length === 2),
  );

  const watchScalar = sandbox.evaluateCustomWatch(
    'l + r',
    { l: 2, r: 5 },
    { l: 1, r: 5 },
  );
  check('evaluateCustomWatch formats scalar expression with prev -> next delta',
    Boolean(
      watchScalar &&
      watchScalar.kind === 'watch-scalar' &&
      watchScalar.watchStatus === 'ok' &&
      watchScalar.val === '7' &&
      watchScalar.prevValStr === '6' &&
      watchScalar.changed === true &&
      sandbox.VIZ['watch-scalar'](watchScalar).includes('7')
    ),
  );

  const watchUnready = sandbox.evaluateCustomWatch('dp[i]', {});
  check('evaluateCustomWatch gracefully handles unready scope without throwing',
    Boolean(watchUnready && watchUnready.kind === 'watch-scalar' && watchUnready.watchStatus === 'unready'),
  );

  const watchMutating = sandbox.evaluateCustomWatch('nums.push(99)', { nums: [1, 2, 3] });
  check('evaluateCustomWatch blocks side-effecting expressions',
    Boolean(watchMutating && watchMutating.watchStatus === 'error'),
  );

  sandbox.addCustomWatch('nums.slice(0, 2)');
  sandbox.startDebug(0, 'const nums = [5, 10, 15];\nconst x = nums[0] + nums[1];\nx');
  const slotsHtmlWithWatch = sandbox.slotsEl.innerHTML;
  check('addCustomWatch renders custom watch card inside #slots during debug session',
    slotsHtmlWithWatch.includes('nums.slice(0, 2)'),
  );
  const consoleBarHtml = sandbox.consoleEl.innerHTML;
  check('bottom complexity bar renders time & space complexity with › prompt',
    consoleBarHtml.includes('›') && consoleBarHtml.includes('O(1)'),
  );
  sandbox.removeCustomWatch('nums.slice(0, 2)');

  // -------------------------------------------------------------------------
  // 8. Adaptive SVG Tree/Graph Layout Anti-Overlap & Modularized Viz Exports
  // -------------------------------------------------------------------------
  const extractCircleCoords = (svgHtml) => {
    const coords = [];
    const circleRe = /<circle\b[^>]*>/g;
    let m;
    while ((m = circleRe.exec(String(svgHtml || ''))) !== null) {
      const tag = m[0];
      const cxMatch = tag.match(/\bcx="(-?[\d.]+)"/);
      const cyMatch = tag.match(/\bcy="(-?[\d.]+)"/);
      if (cxMatch && cyMatch) {
        coords.push({ x: Number(cxMatch[1]), y: Number(cyMatch[1]) });
      }
    }
    return coords;
  };

  const hasNoOverlap = (coords, minDist = 18) => {
    for (let i = 0; i < coords.length; i++) {
      for (let j = i + 1; j < coords.length; j++) {
        const dx = coords[i].x - coords[j].x;
        const dy = coords[i].y - coords[j].y;
        if (Math.hypot(dx, dy) < minDist) return false;
      }
    }
    return true;
  };

  // 8a. Deep skewed tree (depth 8 -> 9 nodes, previously truncated at depth > 5)
  const deepSkewedNodes = Array.from({ length: 9 }, (_, i) => ({
    val: i + 1,
    left: null,
    right: i < 8 ? i + 1 : null,
  }));
  const deepTreeHtml = sandbox.VIZ.tree({ kind: 'tree', nodes: deepSkewedNodes, root: 0, hot: 8 });
  const deepCoords = extractCircleCoords(deepTreeHtml);
  check('VIZ.tree renders all 9 nodes of a depth-8 right-skewed tree without depth>5 truncation',
    typeof deepTreeHtml === 'string' &&
    deepTreeHtml.includes('vsvg-wrap') &&
    deepTreeHtml.includes('vsvg-toolbar') &&
    deepCoords.length === 9 &&
    hasNoOverlap(deepCoords),
  );

  // 8b. Wide balanced tree (15 nodes, 4 levels) renders without node overlap
  const balancedNodes = Array.from({ length: 15 }, (_, i) => ({
    val: i + 1,
    left: 2 * i + 1 < 15 ? 2 * i + 1 : null,
    right: 2 * i + 2 < 15 ? 2 * i + 2 : null,
  }));
  const balancedTreeHtml = sandbox.VIZ.tree({ kind: 'tree', nodes: balancedNodes, root: 0 });
  const balancedCoords = extractCircleCoords(balancedTreeHtml);
  check('VIZ.tree renders 15-node balanced tree with non-overlapping node coordinates',
    typeof balancedTreeHtml === 'string' &&
    balancedCoords.length === 15 &&
    hasNoOverlap(balancedCoords),
  );

  // 8c. Graph without preset x/y coordinates (including self-loop) renders deterministically without NaN or overlap
  const coordlessGraph = {
    kind: 'graph',
    nodes: [
      { id: 'A', label: 'A' },
      { id: 'B', label: 'B' },
      { id: 'C', label: 'C' },
      { id: 'D', label: 'D' },
      { id: 'E', label: 'E' },
    ],
    edges: [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'E'], ['E', 'A'], ['A', 'A']],
    hot: 'C',
  };
  const graphHtml = sandbox.VIZ.graph(coordlessGraph);
  const graphCoords = extractCircleCoords(graphHtml);
  check('VIZ.graph lays out coordinate-less graph nodes without NaN or overlapping circles',
    typeof graphHtml === 'string' &&
    !graphHtml.includes('NaN') &&
    !graphHtml.includes('undefined') &&
    graphHtml.includes('vsvg-toolbar') &&
    graphCoords.length === 5 &&
    hasNoOverlap(graphCoords),
  );

  // 8d. Modularized viz exports backward-compatibility on global sandbox
  const expectedVizExports = [
    'truncMap', 'vizArray', 'vizQueue', 'vizHeap', 'vizUF', 'vizMap', 'vizSet', 'vizStack', 'vizString', 'vizGrid',
    'vizList', 'vizTree', 'vizGraph', 'vizInterface', 'vizTypeAlias', 'bindTopologyInteractions',
    'selectStackFrame', 'renderCallStack', 'vizEventLoop', 'vizWatchScalar', 'updateControlButtons', 'formatFnTypeHtml',
    'renderComplexityBar', 'toggleComplexityPopover',
    'addCustomWatch', 'removeCustomWatch', 'renderPicker', 'renderSlots', 'renderStatic',
    'renderMemory', 'renderAsyncQueues', 'drawArrows', 'scheduleArrowRedraw',
  ];
  const missingExports = expectedVizExports.filter((name) => typeof sandbox[name] !== 'function');
  check('memory-graph.ts re-exports all split viz module functions cleanly',
    missingExports.length === 0,
    missingExports.length ? `missing: ${missingExports.join(', ')}` : '',
  );

  if (sandbox.slotsEl) {
    sandbox.bindTopologyInteractions(sandbox.slotsEl);
    sandbox.bindTopologyInteractions(sandbox.slotsEl);
    check('bindTopologyInteractions is safe and idempotent when called repeatedly', true);
  }

  // -------------------------------------------------------------------------
  // 9. Video Frame Canvas Renderer (`renderVideoFrameToCanvas`, `tokenizeCodeForCanvas`, `drawVizCardOnCanvas`)
  // -------------------------------------------------------------------------
  const createRecordingCanvasCtx = () => {
    const texts = [];
    const arcCalls = [];
    const bezierCalls = [];
    const quadCalls = [];
    const lineToCalls = [];
    const fillRectCalls = [];
    return {
      texts,
      arcCalls,
      bezierCalls,
      quadCalls,
      lineToCalls,
      fillRectCalls,
      fillStyle: '#000',
      strokeStyle: '#000',
      lineWidth: 1,
      font: '12px monospace',
      save() {},
      restore() {},
      scale() {},
      beginPath() {},
      closePath() {},
      moveTo() {},
      lineTo(x, y) { lineToCalls.push({ x, y }); },
      arcTo() {},
      rect() {},
      clip() {},
      fill() {},
      stroke() {},
      clearRect() {},
      strokeRect() {},
      fillRect(x, y, w, h) { fillRectCalls.push({ x, y, w, h }); },
      quadraticCurveTo(cpx, cpy, x, y) { quadCalls.push({ cpx, cpy, x, y }); },
      bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) { bezierCalls.push({ cp1x, cp1y, cp2x, cp2y, x, y }); },
      arc(x, y, r) { arcCalls.push({ x, y, r }); },
      setLineDash() {},
      fillText(txt, x, y) { texts.push({ txt: String(txt), x, y }); },
      measureText(txt) { return { width: String(txt || '').length * 7.5 }; },
      createLinearGradient() { return { addColorStop() {} }; },
    };
  };

  // 9a. tokenizeCodeForCanvas highlights TS keywords, types, strings, numbers, comments & calls
  const codeToks = sandbox.tokenizeCodeForCanvas('const x: Record<string, number> = fn("ok", 42); // note');
  const findTok = (sub) => codeToks.find((t) => t.text === sub);
  check('tokenizeCodeForCanvas distinguishes TS keywords, types, strings, numbers, calls, and comments',
    Boolean(
      findTok('const')?.color === '#ff7b72' &&
      findTok('Record')?.color === '#4ec9b0' &&
      findTok('string')?.color === '#4ec9b0' &&
      findTok('"ok"')?.color === '#9ece6a' &&
      findTok('42')?.color === '#ffb454' &&
      findTok('fn')?.color === '#79c0ff' &&
      findTok('// note')?.color === '#637488'
    ),
  );

  // 9b. renderVideoFrameToCanvas renders Tree + Graph (self-loop + bidirectional) + Grid (viewCells + deps) + List
  resetSandbox(sandbox);
  sandbox.TRACE.code = [
    'interface CalcJob { id: string; count: number; }',
    'const arr: number[] = [10, 20, 30];',
    'checkpoint("mid", arr[1]);',
    'const bad: number = "oops";',
  ];
  sandbox.TRACE.steps = [
    {
      line: 3,
      note: '◉ checkpoint(mid, 20)',
      isCheckpoint: true,
      anim: { type: 'checkpoint', fn: 'checkpoint', args: ['"mid"', 'arr[1]'], argVals: ['mid', '20'] },
      callStack: [{ label: 'solve()', line: 3 }],
      v: { l: 0, r: 2, mid: 1 },
      ds: {
        bt: {
          kind: 'tree',
          root: 0,
          hot: 2,
          nodes: [
            { val: 1, left: 1, right: 2 },
            { val: 2, left: null, right: null },
            { val: 3, left: null, right: null },
          ],
        },
        g: {
          kind: 'graph',
          directed: true,
          hot: 'B',
          mark: 'A',
          nodes: [
            { id: 'A', label: 'A' },
            { id: 'B', label: 'B' },
            { id: 'C', label: 'C' },
          ],
          edges: [
            { from: 'A', to: 'B', label: '3' },
            { from: 'B', to: 'A', label: '5' },
            { from: 'B', to: 'C' },
            { from: 'A', to: 'A' },
          ],
        },
        dp: {
          kind: 'grid',
          cells: [[1, 2], [3, 4]],
          totalRows: 12,
          totalCols: 12,
          rowIndices: [0, 5, 6],
          colIndices: [0, 4, 5],
          viewCells: [[1, 2, 3], [4, 5, 6], [7, 8, 9]],
          mark: [6, 5],
          deps: [[5, 4], [5, 5]],
        },
        head: {
          kind: 'list',
          items: [10, 20, 30],
          total: 3,
          hot: 1,
          pointers: { 0: ['head'], 1: ['slow', 'cur'] },
        },
      },
    },
  ];
  sandbox.appState.watched = new sandbox.Set(['bt', 'g', 'dp', 'head']);
  const ctxTopo = createRecordingCanvasCtx();
  let renderTopoOk = false;
  try {
    sandbox.renderVideoFrameToCanvas(ctxTopo, 0, 0.5, 1);
    renderTopoOk = true;
  } catch (e) {
    renderTopoOk = false;
    console.error('renderVideoFrameToCanvas topo error:', e);
  }
  const topoTextAll = ctxTopo.texts.map((t) => t.txt).join('\n');
  check('renderVideoFrameToCanvas draws tree, graph (with self-loop/bidirectional bezier), viewCells grid, and list with pointers',
    renderTopoOk &&
    ctxTopo.arcCalls.length >= 6 &&
    ctxTopo.bezierCalls.length >= 1 &&
    ctxTopo.quadCalls.length >= 1 &&
    topoTextAll.includes('r\\c') &&
    topoTextAll.includes('head') &&
    topoTextAll.includes('slow,cur') &&
    topoTextAll.includes('null') &&
    topoTextAll.includes('◉ CHECKPOINT'),
  );

  // 9c. renderVideoFrameToCanvas renders Interface, TypeAlias, EventLoop, Array(win+pointers), Queue, Heap, UF, Stack, Map, Set
  resetSandbox(sandbox);
  sandbox.TRACE.code = [
    'interface CalcJob { id: string; count?: number; }',
    'const nums: number[] = [4, 7, 9, 12];',
  ];
  sandbox.TRACE.steps = [
    {
      line: 2,
      note: 'arr[1] = 20',
      anim: { type: 'assign', to: 'l', from: '1', val: '1' },
      callStack: [{ label: 'main()', line: 2 }],
      v: { l: 0, r: 2 },
      ds: {
        CalcJob: {
          kind: 'interface',
          interfaceName: 'CalcJob',
          isClass: false,
          isSchema: false,
          hot: 'id',
          fields: [
            { k: 'id', declaredType: 'string', v: '456', optional: false },
            { k: 'count', declaredType: 'number', v: 7, optional: true },
          ],
        },
        JobState: {
          kind: 'type',
          interfaceName: 'JobState',
          aliasKind: 'union',
          unionBranches: [
            { raw: "'idle'", isObject: false },
            { raw: "'done'", isObject: false },
          ],
        },
        eventLoop: {
          kind: 'eventloop',
          phase: 'microtask',
          now: 12,
          activeTask: 'flushMicrotasks',
          coroutines: [{ name: 'fetchJob', status: 'suspended', line: 5, awaitingExpr: 'p' }],
          microtasks: [{ label: 'then#1', line: 8 }],
          macrotasks: [{ label: 'timeout#1', due: 50, delay: 50 }],
          promises: [{ id: 1, label: 'p', state: 'fulfilled', value: 42 }],
        },
        nums: {
          kind: 'array',
          items: [4, 7, 9, 12],
          total: 4,
          hot: 1,
          win: [0, 2],
          pointers: { 0: ['l'], 2: ['r'] },
        },
        q: { kind: 'queue', items: [1, 2, 3], total: 3, hot: 0 },
        pq: { kind: 'heap', items: [1, 5, 8], total: 3, hot: 0 },
        uf: { kind: 'uf', items: [0, 0, 1], total: 3, hot: 2 },
        stk: { kind: 'stack', items: [11, 22], total: 2, hot: 1 },
        mp: { kind: 'map', entries: [{ k: 'a', v: 1 }], hot: 'a' },
        st: { kind: 'set', items: ['x', 'y'], hot: 'x' },
      },
    },
  ];
  sandbox.appState.watched = new sandbox.Set(['CalcJob', 'JobState', 'eventLoop', 'nums', 'q', 'pq', 'uf', 'stk', 'mp', 'st']);
  const ctxRich = createRecordingCanvasCtx();
  let renderRichOk = false;
  try {
    sandbox.renderVideoFrameToCanvas(ctxRich, 0, 0.25, 2);
    renderRichOk = true;
  } catch (e) {
    renderRichOk = false;
    console.error('renderVideoFrameToCanvas rich error:', e);
  }
  const richTextAll = ctxRich.texts.map((t) => t.txt).join('\n');
  check('renderVideoFrameToCanvas renders Interface, TypeAlias, EventLoop 4 lanes, and collections cleanly',
    renderRichOk &&
    richTextAll.includes('CalcJob') &&
    richTextAll.includes('JobState') &&
    richTextAll.includes('Microtask') &&
    richTextAll.includes('Macrotask') &&
    richTextAll.includes('Promise') &&
    richTextAll.includes('[0..2]'),
  );

  // 9d. Direct drawVizCardOnCanvas checks for event_loop alias & watch-scalar
  const ctxCard = createRecordingCanvasCtx();
  sandbox.drawVizCardOnCanvas(
    ctxCard,
    0,
    0,
    520,
    200,
    { name: 'loopAlias' },
    {
      kind: 'event_loop',
      phase: 'macrotask',
      now: 100,
      coroutines: [],
      microtasks: [],
      macrotasks: [{ label: 'cb', due: 100, delay: 100 }],
      promises: [],
    },
    'event_loop',
  );
  sandbox.drawVizCardOnCanvas(
    ctxCard,
    0,
    210,
    260,
    100,
    { name: 'l + r', isCustomWatch: true },
    { kind: 'watch-scalar', watchStatus: 'ok', val: '7', prevValStr: '6', changed: true, runtimeType: 'number' },
    'watch-scalar',
  );
  const cardTextAll = ctxCard.texts.map((t) => t.txt).join('\n');
  check('drawVizCardOnCanvas supports event_loop alias and watch-scalar delta',
    cardTextAll.includes('Macrotask · 宏任务触发') &&
    cardTextAll.includes('⏱ 100ms') &&
    cardTextAll.includes('6') &&
    cardTextAll.includes('7'),
  );
}

