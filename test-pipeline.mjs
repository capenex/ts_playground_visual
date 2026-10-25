import fs from 'fs';
import vm from 'vm';

const ROOT = new URL('./', import.meta.url);
const html = fs.readFileSync(new URL('./index.html', ROOT), 'utf8');
// App code is split into js/*.js parts, loaded in order from index.html.
const appParts = [...html.matchAll(/<script src="(js\/[^"?]+)/g)].map((m) => m[1]);
if (!appParts.length) throw new Error('index.html does not reference any js/*.js app parts');
const script = appParts.map((rel) => fs.readFileSync(new URL(rel, ROOT), 'utf8')).join('\n');

const makeClassList = () => {
  const set = new Set();
  return {
    add: (c) => set.add(c),
    remove: (c) => set.delete(c),
    toggle: (c, force) => (force === undefined ? (set.has(c) ? set.delete(c) : set.add(c)) : (force ? set.add(c) : set.delete(c))),
    contains: (c) => set.has(c),
  };
};

const el = () => {
  const handlers = new Map();
  const node = {
    value: '', innerHTML: '', textContent: '', style: {}, children: [],
    appendChild(child) { this.children.push(child); }, scrollTop: 0, scrollLeft: 0, clientHeight: 400,
    addEventListener(type, fn) { handlers.set(type, fn); }, focus() {}, dataset: {},
    classList: makeClassList(),
    getBoundingClientRect: () => ({ width: 800, height: 600, left: 0, right: 800, top: 0 }),
    querySelector: () => null,
    closest: () => null,
    fire(type, ev) { const fn = handlers.get(type); if (fn) return fn(ev); return undefined; },
    removeAttribute() {},
    setAttribute(name, value) { this[`__attr_${name}`] = value; },
    getAttribute(name) { return this[`__attr_${name}`]; },
  };
  return node;
};

const elementsById = new Map();
const getEl = (id) => {
  if (!elementsById.has(id)) elementsById.set(id, el());
  return elementsById.get(id);
};

const sandbox = {
  document: {
    getElementById: (id) => getEl(id),
    createElement: () => el(),
    body: { classList: { add() {}, remove() {} }, appendChild() {}, removeChild() {} },
    activeElement: null,
  },
  addEventListener: () => {},
  requestAnimationFrame: (fn) => fn(),
  clearInterval: () => {},
  setInterval: () => 0,
  clearTimeout: () => {},
  setTimeout: () => 0,
  console,
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(
  script +
    '\n;globalThis.__exports = { stripTypes, typecheckTS, extractTsInterfaceMetadata, cloneDeepBounded, collectNames, instrument, resolveEntry, blankJsLine, classifyValue, enrichFromNote, deriveAnimAndNote, hl, hlActiveLine, buildStepVizRow, vizGrid, vizTree, vizGraph, vizUF, vizHeap, vizQueue, VIZ, SAMPLES, collectDeclaredNames, hoverInfoFor, hoverTipHtml, hoverWordAt, liveTypeDiags, revealErrorLine, formatHoverVal, startDebug, stepNext, stepPrev, runToNextCheckpoint, addCheckpointFunction, resetTraceState, runOnce, selectStackFrame, getActiveFrame, formatCallFrameLabel, setVideoExportSpeed, exportVideo, fixWebmDuration, VIDEO_WIDTH, VIDEO_HEIGHT, VIDEO_FPS, VIDEO_SPEED_OPTIONS, RUN_TIMEOUT_MS, setFileName, exportFileName, sanitizeFileName, loadImportedSource, setViewMode, getActiveNotebook, runNotebookCell, debugNotebookCell, typecheckNotebookCellTS, getFileName: () => FILE_NAME, getDebugState: () => ({ TRACE, cur, SELECTED_FRAME_IDX, DEBUG_SESSION, VIDEO_EXPORT_SPEED, cnt: document.getElementById("cnt").textContent, callStackHtml: document.getElementById("callStackBar").innerHTML, varsHtml: document.getElementById("vars").innerHTML, highlightHtml: document.getElementById("highlight").innerHTML, gutterHtml: document.getElementById("gutter").innerHTML, stepVizHtml: document.getElementById("stepViz").innerHTML, stepVizTop: document.getElementById("stepViz").style.top, stepVizLeft: document.getElementById("stepViz").style.left, stepVizDisplay: document.getElementById("stepViz").style.display, editorVal: document.getElementById("editor").value }), setEditorVal: (v) => { document.getElementById("editor").value = v; } };',
  sandbox
);
const {
  stripTypes, typecheckTS, extractTsInterfaceMetadata, cloneDeepBounded, collectNames, instrument, resolveEntry, blankJsLine, classifyValue, enrichFromNote,
  deriveAnimAndNote, hl, hlActiveLine, buildStepVizRow, vizGrid, vizTree, vizGraph, vizUF, vizHeap, vizQueue, VIZ, SAMPLES,
  collectDeclaredNames, hoverInfoFor, hoverTipHtml, hoverWordAt, liveTypeDiags, revealErrorLine, formatHoverVal,
  startDebug, stepNext, stepPrev, runToNextCheckpoint, addCheckpointFunction, resetTraceState, runOnce,
  selectStackFrame, getActiveFrame, formatCallFrameLabel,
  setVideoExportSpeed, exportVideo, fixWebmDuration, VIDEO_WIDTH, VIDEO_HEIGHT, VIDEO_FPS, VIDEO_SPEED_OPTIONS,
  RUN_TIMEOUT_MS,
  setFileName, exportFileName, sanitizeFileName, loadImportedSource, getFileName,
  setViewMode, getActiveNotebook, runNotebookCell, debugNotebookCell, typecheckNotebookCellTS,
  getDebugState, setEditorVal,
} = sandbox.__exports;

let failed = 0;
function check(name, cond, extra) {
  if (cond) console.log('OK  ' + name);
  else {
    console.log('FAIL ' + name + (extra !== undefined ? ' :: ' + String(extra) : ''));
    failed++;
  }
}

// --- syntax highlight CSS classes & draggable resizer exist
const css = fs.readFileSync(new URL('./css/app.css', ROOT), 'utf8');
check('syntax highlight CSS defined', /\.com\b/.test(css) && /\.str\b/.test(css) && /\.kw\b/.test(css));
check('draggable resizer defined', html.includes('id="resizer"') && css.includes('col-resize'));
check('CodeMirror editor wired (container + bundle)', html.includes('id="cmEditor"') && html.includes('editor/cm.bundle.js'));

// --- stripTypes: strings with //
let r = stripTypes('const url = "http://x.com"; const b = 1;');
check('string keeps http://', r.includes('http://x.com'), r);

// --- stripTypes: ternary preserved
r = stripTypes('const x = a > b ? a : b;');
check('ternary kept', /\? a : b/.test(r), r);

// --- stripTypes: ternary with comma inside call
r = stripTypes('const res: number = ok ? Math.max(a, b) : c;');
check('ternary with comma in call kept', /\? Math\.max\(a, b\) : c/.test(r), r);

// --- stripTypes: object literal values
r = stripTypes('const o = { a: 1, b: foo, c: bar };');
check('object numeric', /a: 1/.test(r), r);
check('object ident', /b: foo/.test(r) && /c: bar/.test(r), r);

// --- stripTypes: annotations
r = stripTypes('function f(a: number, b: string): boolean { return true; }');
check('params stripped', !/a: number/.test(r) && !/b: string/.test(r) && !/:\s*boolean/.test(r), r);
check('function kept', /function f\(a, b\)/.test(r), r);

// --- stripTypes: line count preserved with interface
const src2 = 'interface Foo {\n  x: number;\n}\nfunction g(): void {\n  const y: number = 1;\n}\n';
r = stripTypes(src2);
check('line count preserved (interface)', r.split('\n').length === src2.split('\n').length, r.split('\n').length + ' vs ' + src2.split('\n').length);

// --- stripTypes: block comment newlines
const src3 = '/* a\nb\nc */\nlet z = 1;';
r = stripTypes(src3);
check('block comment newlines', r.split('\n').length === src3.split('\n').length, JSON.stringify(r));

// --- stripTypes: ternary + type
r = stripTypes('const n: number = a.length > b.length ? a.length : b.length;');
check('typed ternary', /a\.length > b\.length \? a\.length : b\.length/.test(r), r);

// --- sample LCS
const lcs = SAMPLES.lcs;
r = stripTypes(lcs);
check('LCS line count', r.split('\n').length === lcs.split('\n').length, r.split('\n').length + ' vs ' + lcs.split('\n').length);

// --- instrument + names
const names = collectNames(r);
check('collects names', names.includes('dp') && names.includes('a') && names.includes('n'), names.join(','));
const originalLines = lcs.replace(/\r/g, '').split('\n');
const inst = instrument(r, originalLines, names);
check('instrument inserts __t', inst.includes('__t('));
check('instrument uses original note', /__t\(\d+, "const n: number/.test(inst), (inst.match(/__t\([^;]+/g) || []).slice(0, 3).join(' | '));

// --- full generateTrace-like run for counter
function runTrace(sample, call) {
  const js0 = stripTypes(sample);
  const entry = resolveEntry(sample, js0);
  const jsBase = entry.index >= 0 ? blankJsLine(js0, entry.index) : js0;
  const ns = collectNames(jsBase);
  const origLines = sample.split('\n');
  const js1 = instrument(jsBase, origLines, ns);
  const steps = [];
  const __t = (line, note, snap) => {
    const v = (typeof snap === 'function' ? snap() : snap) || {};
    const ds = {};
    Object.keys(v).forEach((name) => {
      const d = classifyValue(name, v[name]);
      if (d) ds[name] = d;
    });
    enrichFromNote(ds, v, note);
    steps.push({ line, note, v, ds });
  };
  const body = js1 + '\n;return (function(){ try { return { ok:true, value:(' + call + ') }; } catch (e) { return { ok:false, error: e && e.message ? e.message : String(e) }; } })();';
  const f = new Function('__t', 'console', body);
  const res = f(__t, { log: () => {} });
  for (let i = 0; i < steps.length; i++) {
    const st = steps[i];
    const nextSt = steps[i + 1] || null;
    const rawLine = origLines[st.line - 1] || st.note || '';
    const derived = deriveAnimAndNote(rawLine, st.v, nextSt ? nextSt.v : st.v);
    st.anim = derived.anim;
    st.note = derived.note || st.note;
  }
  return { res, steps };
}

const counter = runTrace(SAMPLES.counter, 'counter(8)');
check('counter runs', counter.res.ok && counter.res.value === 32, JSON.stringify(counter.res));
check('counter has steps', counter.steps.length > 5, 'steps=' + counter.steps.length);
check('per-step locals', counter.steps.some((s) => 'acc' in s.v) && counter.steps.some((s) => 'i' in s.v));
check('array classified', counter.steps.some((s) => s.ds.log && s.ds.log.kind === 'array'));
const accs = counter.steps.map((s) => s.v.acc).filter((x) => typeof x === 'number');
check('acc evolves', new Set(accs).size > 1, accs.join(','));
check('anim assign generated', counter.steps.some((s) => s.anim && s.anim.type === 'assign'));
check('anim compare generated', counter.steps.some((s) => s.anim && s.anim.type === 'compare'));
check('anim call generated', counter.steps.some((s) => s.anim && s.anim.type === 'call'));

const analyze = runTrace(SAMPLES.analyze, 'analyze([3,1,4,1,5,9,2,6], 4)');
check('analyze runs', analyze.res.ok && JSON.stringify(analyze.res.value) === '[30,1]', JSON.stringify(analyze.res));
check('map visible', analyze.steps.some((s) => s.ds.map && s.ds.map.kind === 'map' && s.ds.map.entries.length > 0));
check('set visible', analyze.steps.some((s) => s.ds.seen && s.ds.seen.kind === 'set'));
check('stack visible', analyze.steps.some((s) => s.ds.stack && s.ds.stack.kind === 'stack'));

const lcsT = runTrace(SAMPLES.lcs, 'lcs("ABCBDAB","BDCABA")');
check('lcs runs', lcsT.res.ok && lcsT.res.value === 4, JSON.stringify(lcsT.res));
check('grid visible', lcsT.steps.some((s) => s.ds.dp && s.ds.dp.kind === 'grid'));
check('grid mark', lcsT.steps.some((s) => s.ds.dp && s.ds.dp.mark));
check(
  'grid evolves',
  new Set(lcsT.steps.filter((s) => s.ds.dp).map((s) => JSON.stringify(s.ds.dp.cells))).size > 1
);

// --- sliding window sample & [l..r] strip
const winT = runTrace(SAMPLES.window, 'minSubArrayLen(7, [2,3,1,2,4,3])');
check('sliding window runs', winT.res.ok && winT.res.value === 2, JSON.stringify(winT.res));
check('sliding window [l..r] detected', winT.steps.some((s) => s.ds.nums && Array.isArray(s.ds.nums.win)));

// --- all 12 VIZ kinds registered & structures sample works
const allKinds = ['array', 'string', 'map', 'set', 'stack', 'queue', 'list', 'tree', 'heap', 'graph', 'grid', 'uf'];
check('all 12 VIZ kinds registered', allKinds.every((k) => typeof VIZ[k] === 'function'));

const structT = runTrace(SAMPLES.structures, 'tourStructures()');
check('structures sample runs', structT.res.ok && structT.res.value === 5, JSON.stringify(structT.res));
const lastSt = structT.steps[structT.steps.length - 1];
check('tree classified & rendered', lastSt.ds.tree && lastSt.ds.tree.kind === 'tree' && vizTree(lastSt.ds.tree).includes('<svg'));
check('graph classified & rendered', lastSt.ds.graph && lastSt.ds.graph.kind === 'graph' && vizGraph(lastSt.ds.graph).includes('<svg'));
check('uf classified & rendered', lastSt.ds.parent && lastSt.ds.parent.kind === 'uf' && vizUF(lastSt.ds.parent).includes('root'));
check('heap classified & rendered', lastSt.ds.heap && lastSt.ds.heap.kind === 'heap' && vizHeap(lastSt.ds.heap).includes('parent ='));
check('queue classified & rendered', lastSt.ds.queue && lastSt.ds.queue.kind === 'queue' && vizQueue(lastSt.ds.queue).includes('front'));
check('list classified & rendered', lastSt.ds.list && lastSt.ds.list.kind === 'list' && VIZ.list(lastSt.ds.list).includes('null'));

// --- vizGrid deps exact match
const htmlG = vizGrid({ kind: 'grid', cells: [[0, 0, 0], [0, 0, 0]], mark: [1, 2], deps: [[1, 1], [11, 2]] });
check('vizGrid mark hot', htmlG.includes('hot'));
check('vizGrid dep cell count', (htmlG.match(/gcell dep/g) || []).length === 1, htmlG);

// --- template with comment-like text
r = stripTypes('const s = `see http://a.com/* and // stuff`; const t: number = 1;');
check('template keeps comment-like text', r.includes('http://a.com/*') && r.includes('// stuff'), r);

// --- as cast
r = stripTypes('const x = y as Foo;');
check('as cast removed', /const x = y\s*;/.test(r) || /const x = y;/.test(r), r);

// --- optional param
r = stripTypes('function f(a?: number): void {}');
check('optional param', /function f\(a\)/.test(r), r);

// --- ternary with PascalCase
r = stripTypes('const t = ok ? Foo : Bar;');
check('ternary pascal', /\? Foo : Bar/.test(r), r);

// --- optional chaining / nullish must not open ternary
r = stripTypes('const x = obj?.y ?? z; const n: number = 1;');
check('optional chain kept', /obj\?\.y \?\? z/.test(r), r);
check('optional chain does not block later type', /const n = 1/.test(r) && !/const n: number/.test(r), r);
r = stripTypes('const p = a?.b; const q: string = "x";');
check('?. does not block type', /const q = "x"/.test(r), r);

// --- export variants
r = stripTypes('export function f(a: number): void {}\nexport const x: number = 1;');
check('export function kept', /function f\(a\)/.test(r) && !/export function/.test(r), r);
check('export const kept', /const x = 1/.test(r) && !/export const/.test(r), r);
r = stripTypes("export default function f() {}\n");
check('export default drops keyword', /function f\(\)/.test(r) && !/export/.test(r), r);
r = stripTypes("export { a, b };\nconst a = 1;\n");
check('export clause removed', !/export/.test(r) && /const a = 1/.test(r), r);
r = stripTypes("export * from './m';\nconst z = 1;");
check('export star removed', !/export/.test(r) && !/from/.test(r) && /const z = 1/.test(r), r);

// --- dynamic import kept
r = stripTypes('async function load() { const m = await import("./x.js"); return m; }');
check('dynamic import kept', /await import\("\.\/x\.js"\)/.test(r), r);

// --- multi-line import
const srcImp = "import {\n  a,\n  b\n} from './m';\nconst k = a + b;\n";
r = stripTypes(srcImp);
check('multiline import line count', r.split('\n').length === srcImp.split('\n').length, r);
check('multiline import removed', !/import/.test(r) && /const k = a \+ b/.test(r), r);

// --- `} else` must not get __t before the closer
const elseSrc = `function f(x: number): number {
  if (x > 0) {
    return 1;
  } else if (x < 0) {
    return -1;
  } else {
    return 0;
  }
}

// 调用：f(1)
`;
const elseJs = stripTypes(elseSrc);
const elseNames = collectNames(elseJs);
const elseInst = instrument(elseJs, elseSrc.split('\n'), elseNames);
check('no __t before closer', !/__t\([^)]+\);\s*\n\s*\}/.test(elseInst), elseInst);
check('else body instrumented', /__t\(\d+,\s*"return -1/.test(elseInst) || /__t\(\d+,\s*"return 0/.test(elseInst), elseInst);
const elseRun = new Function('__t', 'console', elseInst + '\n;return f(-1);');
let elseSteps = 0;
check('else runs', elseRun(() => { elseSteps++; }, { log() {} }) === -1);

// --- arrow params collected
const arrowJs = stripTypes('const add = (a: number, b: number): number => a + b;\nconst t = add(1, 2);');
const arrowNames = collectNames(arrowJs);
check('arrow params', arrowNames.includes('a') && arrowNames.includes('b') && arrowNames.includes('add'), arrowNames.join(','));

// --- destructuring & for-of variable collection
const destrJs = stripTypes('const [p, q = 1] = [10, 20]; const { u, v: alias } = obj; for (const [idx, item] of arr) {}');
const destrNames = collectNames(destrJs);
check(
  'destructuring & for-of names collected',
  ['p', 'q', 'u', 'alias', 'idx', 'item'].every((k) => destrNames.includes(k)),
  destrNames.join(',')
);

// --- multi-line object literal, method chaining, and braceless if/else
const multiSrc = `function complex(nums: number[]): number {
  const cfg = {
    mult: 2,
    min: 3
  };
  const filtered = nums
    .map(x => x * cfg.mult)
    .filter(x => x > cfg.min);
  let ans = 0;
  if (filtered.length === 0)
    ans = -1;
  else
    ans = filtered[0];
  return ans;
}
`;
const multiRes = runTrace(multiSrc, 'complex([1, 2, 5])');
check('multiline object/chain & braceless if runs cleanly', multiRes.res.ok && multiRes.res.value === 4, JSON.stringify(multiRes.res));

// --- regression: hlActiveLine must NOT match 'c' inside 'const' or 'l' inside 'let'
const hlConstC = hlActiveLine('    const c = map.get(x) || 0;', {
  type: 'assign',
  to: 'c',
  from: 'map.get(x) || 0',
  val: '1',
});
check(
  'hlActiveLine const c highlights variable c, not c in const',
  hlConstC.includes('<span class="kw">const</span> <span class="tok-dst"><span class="prop">c</span></span>') &&
    hlConstC.includes('<span class="tok-src"><span class="prop">map</span>.<span class="fn">get</span>(<span class="prop">x</span>) <span class="op">||</span> <span class="num">0</span></span>'),
  hlConstC
);

const hlLetL = hlActiveLine('  let l = 0;', {
  type: 'assign',
  to: 'l',
  from: '0',
  val: '0',
});
check(
  'hlActiveLine let l highlights variable l, not l in let',
  hlLetL.includes('<span class="kw">let</span> <span class="tok-dst"><span class="prop">l</span></span>'),
  hlLetL
);

// --- inter-line buildStepVizRow above active line
const vizAssignRow = buildStepVizRow('    sum = sum + x;', {
  type: 'assign',
  to: 'sum',
  from: 'sum + x',
  val: '9',
});
check(
  'buildStepVizRow renders the assign capsule',
  vizAssignRow.includes('class="step-viz-row"') && vizAssignRow.includes('sum') && vizAssignRow.includes('9'),
  vizAssignRow
);

const vizCmpRow = buildStepVizRow('    while (stack.length > 0 && nums[stack[stack.length - 1]] < x) {', {
  type: 'compare',
  lhs: 'nums[stack[stack.length - 1]]',
  op: '<',
  rhs: 'x',
  lhsVal: '3',
  rhsVal: '6',
  result: true,
});
check(
  'buildStepVizRow renders the compare capsule',
  vizCmpRow.includes('class="step-viz-row"') && vizCmpRow.includes('⇒ true') && vizCmpRow.includes('= 3'),
  vizCmpRow
);

// --- default showcase sample & auto-trace on load
check('showcase sample exists', typeof SAMPLES.showcase === 'string' && SAMPLES.showcase.includes('visualShowcase'));
const showcaseT = runTrace(SAMPLES.showcase, 'visualShowcase([3, 6, 2, 8, 5, 4, 7], 12)');
check('showcase runs cleanly', showcaseT.res.ok && showcaseT.res.value === 29, JSON.stringify(showcaseT.res));
const scStep = showcaseT.steps[35];
check(
  'showcase step 35 has tree, graph, map, stack, and sliding window array',
  scStep &&
    scStep.ds.tree && scStep.ds.tree.kind === 'tree' &&
    scStep.ds.graph && scStep.ds.graph.kind === 'graph' &&
    scStep.ds.map && scStep.ds.map.kind === 'map' &&
    scStep.ds.stack && scStep.ds.stack.kind === 'stack' &&
    scStep.ds.nums && Array.isArray(scStep.ds.nums.win)
);

// --- regression: while loop condition must be stepped BEFORE every stack.pop() and on loop exit
let consecutivePops = 0;
let whileCheckedBeforeEveryPop = true;
for (let i = 0; i < showcaseT.steps.length; i++) {
  const curLine = (showcaseT.steps[i].note || '');
  const prevLine = i > 0 ? (showcaseT.steps[i - 1].note || '') : '';
  if (curLine.includes('stack.pop')) {
    if (prevLine.includes('stack.pop')) consecutivePops++;
    if (!prevLine.includes('while (')) whileCheckedBeforeEveryPop = false;
  }
}
check('no consecutive stack.pop() without while condition check in between', consecutivePops === 0 && whileCheckedBeforeEveryPop);

// --- regression: for loop header is stepped on every iteration (7 iterations + 1 exit check = 8 times)
const forHeaderSteps = showcaseT.steps.filter((s) => s.line === 14);
check('for header stepped on every iteration and exit', forHeaderSteps.length === 8, 'count=' + forHeaderSteps.length);
check('for header has compare anim', forHeaderSteps.every((s) => s.anim && s.anim.type === 'compare'));

// --- regression: `} else if (...)` condition is stepped when reached
const elseIfTrace = runTrace(elseSrc, 'f(-1)');
check(
  'else-if condition line stepped when if is false',
  elseIfTrace.steps.some((s) => s.line === 4 && s.anim && s.anim.type === 'compare' && s.anim.result === true),
  JSON.stringify(elseIfTrace.steps.map((s) => ({ line: s.line, note: s.note })))
);

// --- mandatory strict TypeScript type checking (enabled by default)
check(
  'all built-in samples pass strict typecheckTS with 0 errors',
  Object.keys(SAMPLES).every((k) => typecheckTS(SAMPLES[k], true).length === 0),
  JSON.stringify(Object.keys(SAMPLES).map((k) => [k, typecheckTS(SAMPLES[k], true)]))
);
check(
  'type checker is labeled as a subset, not full tsc',
  html.includes('TS 子集检查') && html.includes('不是完整的 TypeScript 编译器'),
  'missing subset label / disclaimer'
);
check(
  'checker limitations modal lists unsupported areas',
  html.includes('id="checkerModal"') && html.includes('完整泛型推断与约束') && html.includes('Python 模式'),
  'missing limitations modal'
);

const dImplicitAny = typecheckTS('function bad(x): number {\n  return x;\n}');
check('typecheckTS catches TS7006 implicit any param', dImplicitAny.some((d) => d.code === 'TS7006'), JSON.stringify(dImplicitAny));

const dTypeMismatch = typecheckTS('function bad(n: number): number {\n  const s: number = "hello";\n  return n;\n}');
check('typecheckTS catches TS2322 variable type mismatch', dTypeMismatch.some((d) => d.code === 'TS2322' && d.line === 2), JSON.stringify(dTypeMismatch));

const dReturnMismatch = typecheckTS('function bad(n: number): string {\n  return n + 1;\n}');
check('typecheckTS catches TS2322 return type mismatch', dReturnMismatch.some((d) => d.code === 'TS2322' && d.line === 2), JSON.stringify(dReturnMismatch));

const dConstReassign = typecheckTS('function bad(n: number): number {\n  const k = 10;\n  k = 20;\n  return k;\n}');
check('typecheckTS catches TS2588 const reassignment', dConstReassign.some((d) => d.code === 'TS2588' && d.line === 3), JSON.stringify(dConstReassign));

const dCallArgType = typecheckTS('function add(a: number, b: number): number {\n  return a + b;\n}\n// 调用：add(1, "two")');
check('typecheckTS catches TS2345 call arg type mismatch', dCallArgType.some((d) => d.code === 'TS2345' && d.line === 4), JSON.stringify(dCallArgType));

// --- Request #10: TypeScript badge removed from top bar, on-demand Debug Mode, no step counts, checkpoint() & runtime error stopping
check('TypeScript badge removed from #top', !/<span class="ts-only">/.test(html) && !/id="btnStrict"/.test(html));
check('Reset button (#btnReset) removed from #top', !/id="btnReset"/.test(html));
check('bottom-left has Run to Next Checkpoint button (#nextCheckpoint)', html.includes('id="nextCheckpoint"') && html.includes('运行到下一个检查点'));
check('has Add Checkpoint Function button (#btnAddCheckpoint)', html.includes('id="btnAddCheckpoint"') && html.includes('添加检查点函数'));

// Test on-demand step-by-step evaluation: startDebug(0) only computes step 0, each stepNext() computes 1 step on the spot
setEditorVal(SAMPLES.counter);
startDebug(0);
let st0 = getDebugState();
check('startDebug(0) computes only 1st step on demand', st0.TRACE.steps.length === 1 && st0.cur === 0, 'len=' + st0.TRACE.steps.length);
check('cnt does NOT display numeric step index or total steps', !/\d+\s*\/\s*\d+/.test(st0.cnt), st0.cnt);

stepNext();
let st1 = getDebugState();
check('stepNext() computes 2nd step on the spot', st1.TRACE.steps.length === 2 && st1.cur === 1, 'len=' + st1.TRACE.steps.length);

stepNext(true);
let st2 = getDebugState();
check('stepNext(true) from auto-play computes 3rd step on the spot', st2.TRACE.steps.length === 3 && st2.cur === 2, 'len=' + st2.TRACE.steps.length);

// Test addCheckpointFunction() preserves current debug position (does NOT reset to step 0) + runToNextCheckpoint()
const lineBeforeAdd = st2.TRACE.steps[st2.cur].line;
const accBeforeAdd = st2.TRACE.steps[st2.cur].v.acc;
addCheckpointFunction(8);
let afterAdd = getDebugState();
check('addCheckpointFunction inserts checkpoint(); into code', afterAdd.editorVal.includes('checkpoint();'));
check(
  'addCheckpointFunction preserves current debug position instead of resetting to step 0',
  afterAdd.cur > 0 &&
    afterAdd.TRACE.steps[afterAdd.cur].line === lineBeforeAdd &&
    afterAdd.TRACE.steps[afterAdd.cur].v.acc === accBeforeAdd,
  'cur=' + afterAdd.cur + ', line=' + (afterAdd.TRACE.steps[afterAdd.cur] && afterAdd.TRACE.steps[afterAdd.cur].line)
);
check('code with inserted checkpoint() passes strict typecheckTS', typecheckTS(afterAdd.editorVal, true).length === 0);

runToNextCheckpoint();
let atCkpt = getDebugState();
const ckptStep = atCkpt.TRACE.steps[atCkpt.cur];
check('runToNextCheckpoint pauses at checkpoint() step', ckptStep && ckptStep.isCheckpoint === true && ckptStep.anim && ckptStep.anim.type === 'checkpoint', JSON.stringify(ckptStep && ckptStep.note));
check('cnt shows checkpoint status without step numbers', atCkpt.cnt.includes('检查点') && !/\d/.test(atCkpt.cnt), atCkpt.cnt);

// Test runtime error program that passes compilation: runs step by step on demand, hits checkpoints, and stops right at runtime error
setEditorVal(SAMPLES.debug_crash);
const crashCompileOk = startDebug(0);
let crashInit = getDebugState();
check('runtime-error sample compiles and enters Debug Mode without upfront crash', crashCompileOk && !crashInit.DEBUG_SESSION.crashed && crashInit.TRACE.steps.length === 1);

// 1st checkpoint (i=0, acc=4 <= 18)
runToNextCheckpoint();
let ck1 = getDebugState();
check('debug_crash 1st checkpoint reached cleanly (acc=4)', ck1.TRACE.steps[ck1.cur].isCheckpoint && !ck1.DEBUG_SESSION.crashed && ck1.TRACE.steps[ck1.cur].v.acc === 4);

// 2nd checkpoint (i=1, acc=11 <= 18)
runToNextCheckpoint();
let ck2 = getDebugState();
check('debug_crash 2nd checkpoint reached cleanly (acc=11)', ck2.TRACE.steps[ck2.cur].isCheckpoint && !ck2.DEBUG_SESSION.crashed && ck2.TRACE.steps[ck2.cur].v.acc === 11);

// 3rd checkpoint (i=2, acc=16 <= 18)
runToNextCheckpoint();
let ck3 = getDebugState();
check('debug_crash 3rd checkpoint reached cleanly (acc=16)', ck3.TRACE.steps[ck3.cur].isCheckpoint && !ck3.DEBUG_SESSION.crashed && ck3.TRACE.steps[ck3.cur].v.acc === 16);

// 4th checkpoint (i=3, acc=25 > 18, paused at checkpoint right before if (acc > limit) throws!)
runToNextCheckpoint();
let ck4 = getDebugState();
check('debug_crash 4th checkpoint reached (acc=25, right before throw)', ck4.TRACE.steps[ck4.cur].isCheckpoint && !ck4.DEBUG_SESSION.crashed && ck4.TRACE.steps[ck4.cur].v.acc === 25);

// Next runToNextCheckpoint (or stepNext twice) hits throw new Error(...) and halts at the error line!
runToNextCheckpoint();
let crashedState = getDebugState();
const crashStep = crashedState.TRACE.steps[crashedState.cur];
check(
  'runtime error halts execution at the exact throwing line',
  crashedState.DEBUG_SESSION.crashed === true &&
    crashedState.DEBUG_SESSION.finished === true &&
    crashStep &&
    Boolean(crashStep.error) &&
    crashStep.error.includes('超过安全阈值'),
  JSON.stringify(crashStep)
);
check('cnt shows runtime error status without step numbers', crashedState.cnt.includes('报错') && !/\d/.test(crashedState.cnt), crashedState.cnt);

const lenAtCrash = crashedState.TRACE.steps.length;
stepNext();
check('stepping forward after runtime error does not advance beyond crash', getDebugState().TRACE.steps.length === lenAtCrash);

// --- Request #11 & #12: Export JSON removed, Top-right dropdown menu with Download Single-File + Export Video (1920x1080 60fps, speeds 0.75x/1x/1.5x/2x/3x), Brand Title, and Interface/Inline-Comment Typecheck
check('Export JSON button (#btnExport) removed', !/id="btnExport"/.test(html) && !/导出 JSON/.test(html));
check('Top-right dropdown menu (#exportMenuWrap) contains #btnExportTs and #btnExportVideo', html.includes('id="exportMenuWrap"') && html.includes('id="btnExportTs"') && html.includes('id="btnExportVideo"'));
check('Video exporter configured for 1920x1080 60fps', VIDEO_WIDTH === 1920 && VIDEO_HEIGHT === 1080 && VIDEO_FPS === 60);
check('Video speed options are [0.75, 1, 1.5, 2, 3]', JSON.stringify(VIDEO_SPEED_OPTIONS) === JSON.stringify([0.75, 1, 1.5, 2, 3]));
check('setVideoExportSpeed switches among 0.75x, 1x, 1.5x, 2x, 3x', setVideoExportSpeed(0.75) === 0.75 && setVideoExportSpeed(1.5) === 1.5 && setVideoExportSpeed(2) === 2 && setVideoExportSpeed(3) === 3 && setVideoExportSpeed(1) === 1);
check('Brand header designed with TypeScript Playground VISUAL', html.includes('class="brand-title"') && html.includes('TypeScript') && html.includes('Playground') && html.includes('VISUAL'));

const userScreenshotCode = `interface User {
  name: string;
  age: number;
}

function greet(user: User): string {
  // 错误 1: user 没有 email 属性
  return \`Hello, \${user.email}\`;
}

const u: User = { name: "Alice" }; // 错误 2: 缺少 age 属性

const n: number = "123"; // 错误 3: string 不能赋给 number

greet({ name: "Bob", age: "20" }); // 错误 4: age 应为 number, 实际是 string`;

const userDiags = typecheckTS(userScreenshotCode, true);
check('typecheckTS catches Error 1 (TS2339: user.email does not exist on User inside template literal)', userDiags.some(d => d.line === 8 && d.code === 'TS2339'), JSON.stringify(userDiags));
check('typecheckTS catches Error 2 (TS2741: missing property age in User object literal with trailing comment)', userDiags.some(d => d.line === 11 && d.code === 'TS2741'), JSON.stringify(userDiags));
check('typecheckTS catches Error 3 (TS2322: string "123" not assignable to number with trailing comment)', userDiags.some(d => d.line === 13 && d.code === 'TS2322'), JSON.stringify(userDiags));
check('typecheckTS catches Error 4 (TS2322: age "20" string not assignable to number in greet({ ... }) call)', userDiags.some(d => d.line === 15 && d.code === 'TS2322'), JSON.stringify(userDiags));

setEditorVal(userScreenshotCode);
const blockedStart = startDebug(0);
check('startDebug blocks execution when interface/type errors exist', blockedStart === false && getDebugState().TRACE.steps.length === 0);

// --- Request #13: Variable identifier color unified to light-blue (.prop), verbose pane-title strings removed, VISUAL badge vertically centered, and WebM duration header patched
const hlSrc = 'function walk(nums: number[]): number {\n  const map = new Map<number, number>();\n  const stack: number[] = [];\n  while (stack.length > 0 && nums[stack[stack.length - 1]] < x) {}\n  return map.size;\n}';
const hlDeclared = collectDeclaredNames(hlSrc);
const hlMapLine = hl('const map = new Map<number, number>();', hlDeclared);
const hlStackLine = hl('const stack: number[] = [];', hlDeclared);
const hlStackUse = hl('while (stack.length > 0 && nums[stack[stack.length - 1]] < x)', hlDeclared);
check('hl colors both map and stack declarations with light-blue .prop class', hlMapLine.includes('<span class="prop">map</span>') && hlStackLine.includes('<span class="prop">stack</span>'), hlMapLine);
check('hl colors subsequent stack and nums variable references with light-blue .prop class', hlStackUse.includes('<span class="prop">stack</span>') && hlStackUse.includes('<span class="prop">nums</span>'), hlStackUse);

// --- Feature A: only declared names keep the variable color; undeclared ones render plain white
const declNames = collectDeclaredNames(SAMPLES.counter);
check('collectDeclaredNames sees params, loop vars, locals and function names',
  ['counter', 'n', 'acc', 'log', 'i'].every(k => declNames.has(k)), [...declNames].join(','));
check('declared set is cached per source text', collectDeclaredNames(SAMPLES.counter) === declNames);
const hlUndeclared = hl('const total = acc + ghost;', new Set(['total', 'acc']));
check('undeclared identifier renders plain white while declared keeps .prop',
  hlUndeclared.includes('<span class="prop">acc</span>') && !hlUndeclared.includes('prop">ghost') && hlUndeclared.includes('ghost'), hlUndeclared);
check('object literal keys keep the property color', hl('const o = { val: 1 };', new Set(['o'])).includes('<span class="prop">val</span>'));
check('built-ins keep their own color without a declaration', hl('let x = checkpoint;', collectDeclaredNames('')).includes('<span class="bi">checkpoint</span>'));
check('built-ins are not mixed into the declared set', !collectDeclaredNames('').has('checkpoint') && !collectDeclaredNames('').has('Math'), [...collectDeclaredNames('')].join(','));
const declComment = collectDeclaredNames('// const ghost = 1;\nlet real = 2;\n/* function phantom() {} */\ninterface User { name: string }\nclass Node2 { x: number }\ntype Pair = [number, number];\n');
check('comments never contribute declared names', !declComment.has('ghost') && !declComment.has('phantom') && declComment.has('real'), [...declComment].join(','));
check('interface / class / type names count as declared', ['User', 'Node2', 'Pair'].every(n => declComment.has(n)), [...declComment].join(','));

// --- Feature B: hover inspector (value + visualization) in debug mode
setEditorVal(SAMPLES.counter);
startDebug(8);
const hvAcc = hoverInfoFor('acc');
check('hoverInfoFor returns the live value of a local', Boolean(hvAcc) && typeof hvAcc.val === 'number', JSON.stringify(hvAcc && hvAcc.val));
const hvAccHtml = hvAcc ? hoverTipHtml(hvAcc) : '';
check('hover tooltip shows name, kind and value', hvAccHtml.includes('ht-name') && hvAccHtml.includes('acc') && hvAccHtml.includes(String(hvAcc && hvAcc.val)), hvAccHtml.slice(0, 160));
const hvArr = hoverInfoFor('log');
const hvArrHtml = hvArr ? hoverTipHtml(hvArr) : '';
check('hover tooltip renders a structure visualization', Boolean(hvArr && hvArr.d && hvArr.d.kind === 'array') && hvArrHtml.includes('ht-viz') && hvArrHtml.includes('vcell'), hvArrHtml.slice(0, 180));
check('hoverWordAt extracts the identifier under the cursor',
  JSON.stringify(hoverWordAt('  acc = acc + i;', 4)) === JSON.stringify({ word: 'acc', start: 2, end: 5 }));
check('hoverInfoFor ignores names that are not in scope', hoverInfoFor('notDeclaredHere') === null);

// hover wiring through mouse events (stub geometry: 24px lines, 16px padding, 8.5px chars)
const editorNode = sandbox.document.getElementById('editor');
const tipNode = sandbox.document.getElementById('hoverTip');
editorNode.fire('mousemove', { clientX: 16 + 8.5 * 6 + 3, clientY: 12 + 24 + 5 });
check('mousemove over a declared variable opens the hover tooltip',
  tipNode.classList.contains('on') && tipNode.innerHTML.includes('ht-name') && tipNode.innerHTML.includes('acc'),
  tipNode.innerHTML.slice(0, 140));
editorNode.fire('mousemove', { clientX: 16 + 8.5 * 60, clientY: 12 + 24 + 5 });
check('mousemove over a non-identifier closes the tooltip', !tipNode.classList.contains('on'));
editorNode.fire('mousemove', { clientX: 16 + 8.5 * 6 + 3, clientY: 12 + 24 + 5 });
editorNode.fire('mouseleave', {});
check('mouseleave closes the tooltip', !tipNode.classList.contains('on'));
editorNode.fire('mousemove', { clientX: 16 + 8.5 * 6 + 3, clientY: 12 + 24 + 5 });
stepNext();
check('stepping closes the hover tooltip (no stale value)', !tipNode.classList.contains('on'));

resetTraceState();
check('hoverInfoFor is inert without a debug session', hoverInfoFor('acc') === null);

// --- Feature C: type errors get a red marker and an inline badge on the offending line
setEditorVal('const n: number = "123";\nconst m: number = n + 1;\n');
const errStart = startDebug(0);
const errState = getDebugState();
check('type error blocks debug', errStart === false);
check('type error line is marked .ln.err', /<span class="ln err">/.test(errState.highlightHtml), errState.highlightHtml.slice(0, 240));
check('type error line carries an inline TS badge', errState.highlightHtml.includes('ln-err-badge') && errState.highlightHtml.includes('TS2322'), errState.highlightHtml.slice(0, 320));
const errGutter = errState.gutterHtml.split('</div>');
check('gutter marks line 1 (not the following line) as the error line', errGutter[0].includes('err') && !errGutter[1].includes('err'), errGutter.slice(0, 2).join('|'));
check('live diagnostics are exposed for the current buffer', liveTypeDiags('const n: number = "123";\n').some(d => d.line === 1 && d.code === 'TS2322'));
const logNode = sandbox.document.getElementById('log');
const diagNodes = logNode.children.filter(c => String(c.className).includes('diag'));
check('diagnostic log entries are clickable and carry their line number',
  diagNodes.length > 0 && diagNodes.every(d => Number(d.getAttribute('data-line')) >= 1), diagNodes.length + ' entries');
check('revealErrorLine tolerates out-of-range lines', (() => { try { revealErrorLine(9999); revealErrorLine(0); return true; } catch (_) { return false; } })());
check('undeclared function call renders white while a declared call keeps .fn',
  !/class="fn">ghostCall</.test(hl('ghostCall(1);', new Set())) &&
    /class="fn">counter</.test(hl('counter(1);', new Set(['counter']))));

// --- Feature E: ▶ 运行 watchdog (2s wall clock) with loop-location reporting
check('run watchdog budget is 2s', RUN_TIMEOUT_MS === 2000);

const logChildren = () => sandbox.document.getElementById('log').children;
const readLog = () => logChildren().map(c => String(c.textContent)).join('\n');
const readLogSince = (n) => logChildren().slice(n).map(c => String(c.textContent)).join('\n');

setEditorVal('let i: number = 0;\nwhile (i >= 0) {\n  i = i + 1;\n}\n\n// 调用：i\n');
const logMark = logChildren().length;
const loopT0 = Date.now();
runOnce(150);
const loopElapsed = Date.now() - loopT0;
const loopState = getDebugState();
const loopLog = readLogSince(logMark);
check('infinite loop is force-stopped instead of hanging the page', loopElapsed < 1500, loopElapsed + 'ms');
check('timeout message reports a loop line (header or body)', /第 [23] 行/.test(loopLog) && /死循环/.test(loopLog), loopLog.slice(-320));
const loopErrLines = loopState.gutterHtml.split('</div>').map((s, k) => (s.includes('err') ? k + 1 : 0)).filter(Boolean);
check('timeout marks the spinning line red in the editor', loopErrLines.length === 1 && loopErrLines[0] >= 2 && loopErrLines[0] <= 3, JSON.stringify(loopErrLines));

setEditorVal('let guard: boolean = true;\nwhile (guard) {\n}\n\n// 调用：guard\n');
const emptyMark = logChildren().length;
const emptyT0 = Date.now();
runOnce(120);
const emptyElapsed = Date.now() - emptyT0;
const emptyLog = readLogSince(emptyMark);
check('empty-body infinite loop is caught by the loop-condition hook', emptyElapsed < 1500 && /第 2 行/.test(emptyLog), emptyElapsed + 'ms');

setEditorVal(SAMPLES.counter);
const counterMark = logChildren().length;
runOnce(2000);
const counterRunLog = readLogSince(counterMark);
check('instrumented run still returns the correct value', /运行完成/.test(counterRunLog) && /32/.test(counterRunLog), counterRunLog.slice(-160));

// Instrumentation must not change semantics for any built-in sample.
const sampleRunLogs = {};
for (const key of Object.keys(SAMPLES)) {
  setEditorVal(SAMPLES[key]);
  const mark = logChildren().length;
  runOnce(2000);
  sampleRunLogs[key] = readLogSince(mark);
}
check('every built-in sample runs under the 2s watchdog without a false timeout',
  !Object.values(sampleRunLogs).some(t => /强制终止/.test(t)),
  Object.keys(sampleRunLogs).filter(k => /强制终止/.test(sampleRunLogs[k])).join(','));
check('watchdog run keeps the known-answer results for counter and lcs',
  /→\s+32\s*\(/.test(sampleRunLogs.counter || '') && /→\s+4\s*\(/.test(sampleRunLogs.lcs || ''),
  (sampleRunLogs.counter || '').slice(-60) + ' | ' + (sampleRunLogs.lcs || '').slice(-60));

check('built-in samples use real entry calls instead of legacy // 调用 comments',
  !Object.values(SAMPLES).some(s => /\/\/\s*调用[:：]/.test(s)),
  Object.keys(SAMPLES).filter(k => /\/\/\s*调用[:：]/.test(SAMPLES[k])).join(','));

setEditorVal('function add(a: number, b: number): number {\n  return a + b;\n}\n\nadd(1, 2);\n');
const realEntryMark = logChildren().length;
runOnce(2000);
const realEntryLog = readLogSince(realEntryMark);
check('a real trailing top-level call becomes the entry',
  /运行完成/.test(realEntryLog) && /→\s+3\s*\(/.test(realEntryLog), realEntryLog.slice(-160));

setEditorVal('let calls = 0;\nfunction next(): number {\n  calls++;\n  return calls;\n}\n\nnext();\n');
const onceMark = logChildren().length;
runOnce(2000);
const onceLog = readLogSince(onceMark);
check('a real trailing call executes exactly once', /→\s+1\s*\(/.test(onceLog), onceLog.slice(-160));

setEditorVal('function add(a: number, b: number): number {\n  return a + b;\n}\n\nadd(1, 2);\n');
const startedReal = startDebug(0);
let realGuard = 0;
let realState = getDebugState();
while (realState.DEBUG_SESSION.active && !realState.DEBUG_SESSION.finished && realGuard++ < 50) {
  stepNext();
  realState = getDebugState();
}
check('Debug mode also uses the real trailing call as entry',
  startedReal && realState.DEBUG_SESSION.returnValue === 3,
  JSON.stringify({ started: startedReal, ret: realState.DEBUG_SESSION.returnValue, steps: realState.TRACE.steps.length }));

// --- Feature F: import button, editable file name, TypeScript export
check('import button, hidden file input and editable file name exist',
  html.includes('id="btnImport"') && html.includes('id="fileInput"') && html.includes('id="fileName"'));
check('export menu offers a file download (single-file html download removed)',
  /id="btnExportTs"[\s\S]{0,220}?导出文件/.test(html) && !html.includes('下载单文件版') && !html.includes('btnDownloadHtml'));

setFileName('my algorithm.ts');
check('a .ts name is kept as-is', exportFileName() === 'my algorithm.ts', exportFileName());
setFileName('weird/na*me');
check('rename strips path separators and illegal characters', getFileName() === 'weirdname', getFileName());
check('export appends .ts when the name has no extension', exportFileName() === 'weirdname.ts', exportFileName());
setFileName('notes.');
check('trailing dots are trimmed (Windows-safe)', getFileName() === 'notes', getFileName());
setFileName('   ');
check('an empty rename falls back to playground.ts', getFileName() === 'playground.ts', getFileName());
setFileName('demo.tsx');
check('other extensions are preserved on export', exportFileName() === 'demo.tsx', exportFileName());

loadImportedSource('const imported: number = 41;\n\n// 调用：imported + 1\n', 'imported-demo.ts');
const importedState = getDebugState();
check('import loads the source into the editor and adopts the file name',
  importedState.editorVal.includes('const imported: number = 41;') &&
    getFileName() === 'imported-demo.ts' &&
    importedState.TRACE.steps.length === 0,
  importedState.editorVal.slice(0, 40) + ' / ' + getFileName());
check('the export badge follows the renamed file', (() => { setFileName('alpha.ts'); return sandbox.document.getElementById('fileExportTag').textContent === 'alpha.ts'; })());

// --- Feature D: the floating step capsule sits above the active line, and flips below it near the top
setEditorVal('const nums: number[] = [1, 2];\n\n// 调用：nums.length\n');
startDebug(0);
const topEdgeState = getDebugState();
check('capsule drops below the active line when there is no room above',
  topEdgeState.stepVizDisplay === 'block' && topEdgeState.stepVizTop === '39px',
  JSON.stringify({ top: topEdgeState.stepVizTop, line: topEdgeState.TRACE.steps[0] && topEdgeState.TRACE.steps[0].line, viz: topEdgeState.stepVizHtml.slice(0, 80) }));

// --- Feature C2: a runtime error raised by ▶ 运行 is mapped back to its exact source line
setEditorVal('function boom(n: number) {\n  const x = n + 1;\n  throw new Error("boom " + x);\n  return x;\n}\n\n// 调用：boom(1)\n');
runOnce();
const runErrState = getDebugState();
const runErrGutter = runErrState.gutterHtml.split('</div>');
check('run-time error marks the throwing line (line 3), not the whole file',
  runErrGutter[2].includes('err') && !runErrGutter[0].includes('err') && !runErrGutter[1].includes('err') && !runErrGutter[3].includes('err'),
  runErrGutter.slice(0, 4).join('|'));


check('verbose SOURCE pane-title text removed', !html.includes('· TYPESCRIPT · 编辑 / 调试同一区域') && !html.includes('· 拖动分隔线调节宽度'));
check('brand-visual badge does not use floating translateY(-1px)', !/\.brand-visual\{[^}]*translateY/.test(html));
check('fixWebmDuration helper is defined for patching WebM EBML Duration metadata', typeof fixWebmDuration === 'function');

// --- Request #14: Editor cursor 1-to-1 line alignment (no inter-line vertical block gap) & Call Stack breadcrumb visualization above LOCALS
setEditorVal(SAMPLES.mergesort);
const msOk = startDebug(8);
const msState = getDebugState();
check('mergesort sample starts cleanly at step 8', msOk && msState.cur === 8);
check('gutter has no vertical gap div (.gline-viz-gap) that would shift editor cursor between lines', !msState.gutterHtml.includes('gline-viz-gap'));
const msStep8 = msState.TRACE.steps[8];
const msVizLine = (msStep8.callStack && msStep8.callStack.length ? msStep8.callStack[msStep8.callStack.length - 1].line : msStep8.line) || 1;
const msVizTop = parseInt(msState.stepVizTop, 10);
check('step capsule floats as its own layer above the active line (no longer inline in .ln)',
  msState.stepVizHtml.includes('step-viz-row') &&
    msState.stepVizDisplay === 'block' &&
    msState.stepVizLeft === '16px' &&
    !msState.highlightHtml.includes('step-viz-row') &&
    msVizTop < 12 + (msVizLine - 1) * 24,
  JSON.stringify({ top: msState.stepVizTop, line: msVizLine, display: msState.stepVizDisplay, hl: msState.highlightHtml.slice(0, 240) }));

const msLabels = (msStep8.callStack || []).map(f => f.label).join(' ▸ ');check(
  'Call Stack at mergesort step 8 is "global ▸ mergeSort(0, 7) ▸ mergeSort(0, 3) ▸ mergeSort(0, 1)"',
  msLabels === 'global ▸ mergeSort(0, 7) ▸ mergeSort(0, 3) ▸ mergeSort(0, 1)',
  msLabels
);
check(
  'Call Stack bar HTML above LOCALS renders breadcrumbs with ▸ separators',
  msState.callStackHtml.includes('global') &&
    msState.callStackHtml.includes('mergeSort(0, 7)') &&
    msState.callStackHtml.includes('mergeSort(0, 3)') &&
    msState.callStackHtml.includes('mergeSort(0, 1)') &&
    msState.callStackHtml.includes('▸'),
  msState.callStackHtml
);

// Test Stack Frame switching via selectStackFrame()
selectStackFrame(1); // switch to mergeSort(0, 7)
const frame1State = getDebugState();
const activeF1 = getActiveFrame(frame1State.TRACE.steps[frame1State.cur]);
check(
  'selectStackFrame(1) switches LOCALS to mergeSort(0, 7) where l=0, r=7, mid=3',
  activeF1.label === 'mergeSort(0, 7)' && activeF1.v.l === 0 && activeF1.v.r === 7 && activeF1.v.mid === 3 &&
    frame1State.varsHtml.includes('>7<') && frame1State.varsHtml.includes('>3<'),
  JSON.stringify(activeF1.v)
);

selectStackFrame(2); // switch to mergeSort(0, 3)
const frame2State = getDebugState();
const activeF2 = getActiveFrame(frame2State.TRACE.steps[frame2State.cur]);
check(
  'selectStackFrame(2) switches LOCALS to mergeSort(0, 3) where l=0, r=3, mid=1',
  activeF2.label === 'mergeSort(0, 3)' && activeF2.v.l === 0 && activeF2.v.r === 3 && activeF2.v.mid === 1 &&
    frame2State.varsHtml.includes('>3<') && frame2State.varsHtml.includes('>1<'),
  JSON.stringify(activeF2.v)
);

const hvNums = hoverInfoFor('nums');
check('hover falls back to the global frame for outer variables',
  Boolean(hvNums && Array.isArray(hvNums.val)), JSON.stringify(hvNums && hvNums.frame));

selectStackFrame(0); // switch to global
const frame0State = getDebugState();
const activeF0 = getActiveFrame(frame0State.TRACE.steps[frame0State.cur]);
check(
  'selectStackFrame(0) switches to global frame',
  activeF0.label === 'global' && frame0State.varsHtml.includes('global'),
  frame0State.varsHtml
);

stepNext(); // stepping resets frame selection to top of call stack
const afterStepState = getDebugState();
check('stepping automatically resets SELECTED_FRAME_IDX to null (stack top)', afterStepState.SELECTED_FRAME_IDX === null);

// --- Feature G: class / enum / generic support
setEditorVal('class C {\n  n: number = 1;\n  add(x: number): number {\n    this.n = this.n + x;\n    return this.n;\n  }\n}\n\n// 调用：new C().add(2)\n');
check('class methods compile and enter Debug', startDebug(0) === true);
stepNext(); stepNext(); stepNext();
const clsState = getDebugState();
const clsStep = clsState.TRACE.steps[clsState.cur];
check('stepping inside a method body', clsStep && (clsStep.line === 4 || clsStep.line === 5), clsStep && clsStep.line);
check('method call appears in the call stack',
  (clsStep.callStack || []).some(f => /add\(/.test(f.label)),
  (clsStep.callStack || []).map(f => f.label).join(' ▸ '));
check('method `this` snapshot carries the instance fields',
  Boolean(clsStep.ds && clsStep.ds.this && (clsStep.ds.this.fields || []).some(f => f.k === 'n')),
  JSON.stringify(clsStep.ds && Object.keys(clsStep.ds)));

const classForms = {
  extends: 'class A {\n  m(): number { return 1; }\n}\nclass B extends A {\n  n(): number { return this.m() + 1; }\n}\n// 调用：new B().n()\n',
  'static + getter': 'class C {\n  static s: number = 2;\n  get v(): number { return C.s; }\n}\n// 调用：new C().v\n',
  implements: 'interface I { x: number }\nclass C implements I {\n  x: number = 1;\n}\n// 调用：new C().x\n',
  'class expression': 'const C = class {\n  m(): number { return 2; }\n};\n// 调用：new C().m()\n',
};
Object.keys(classForms).forEach(k => {
  setEditorVal(classForms[k]);
  check('class form compiles: ' + k, startDebug(0) === true);
});

setEditorVal('class C {\n  spin(): number {\n    let i = 0;\n    while (i >= 0) { i = i + 1; }\n    return i;\n  }\n}\n// 调用：new C().spin()\n');
const spinMark = logChildren().length;
const spinT0 = Date.now();
runOnce(150);
const spinMs = Date.now() - spinT0;
const spinLog = readLogSince(spinMark);
setEditorVal('let i = 0;\nwhile (true) i = i + 1;\n// 调用：i\n');
const unbracedMark = logChildren().length;
const unbracedT0 = Date.now();
runOnce(120);
const unbracedMs = Date.now() - unbracedT0;
const unbracedLog = readLogSince(unbracedMark);
check('run watchdog catches an unbraced single-statement loop',
  unbracedMs < 1500 && /第 2 行/.test(unbracedLog) && /死循环|超时/.test(unbracedLog), unbracedMs + 'ms ' + unbracedLog.slice(-120));
check('run watchdog catches a single-line loop inside a class method',
  spinMs < 1500 && /第 4 行/.test(spinLog) && /死循环|超时/.test(spinLog), spinMs + 'ms ' + spinLog.slice(-120));
setEditorVal('class C {\n  constructor(private n: number, public label: string = "ok") {}\n  get(): string { return this.label + ":" + this.n; }\n}\n// 调用：new C(7).get()\n');
let markG = logChildren().length;
runOnce(500);
check('constructor parameter properties compile, typecheck, and execute',
  startDebug(0) === true && /→\s+"ok:7"/.test(readLogSince(markG)), readLogSince(markG).slice(-140));

setEditorVal('function sealed(target: any): any { return target; }\n@sealed\nclass D {\n  v: number = 42;\n}\n// 调用：new D().v\n');
markG = logChildren().length;
runOnce(500);
check('decorators on classes compile and execute',
  startDebug(0) === true && /→\s+42\b/.test(readLogSince(markG)), readLogSince(markG).slice(-120));

setEditorVal('abstract class Shape {\n  abstract area(): number;\n}\nclass Square extends Shape {\n  constructor(public side: number) { super(); }\n  area(): number { return this.side * this.side; }\n}\n// 调用：new Square(5).area()\n');
markG = logChildren().length;
runOnce(500);
check('abstract classes and abstract methods compile, typecheck, and execute',
  startDebug(0) === true && /→\s+25\b/.test(readLogSince(markG)), readLogSince(markG).slice(-120));

setEditorVal('enum Color { Red, Green, Blue }\n// 调用：Color.Blue + ":" + Color[1]\n');
markG = logChildren().length;
runOnce(500);
check('numeric enum values and reverse mapping',
  /→\s+"2:Green"/.test(readLogSince(markG)), readLogSince(markG).slice(-100));

setEditorVal('enum S { A = "a", B = "b" }\n// 调用：S.B\n');
markG = logChildren().length;
runOnce(500);
check('string enum values', /→\s+"b"/.test(readLogSince(markG)), readLogSince(markG).slice(-100));

setEditorVal('const enum CE { X, Y }\n// 调用：CE.Y\n');
markG = logChildren().length;
runOnce(500);
check('const enum values', /→\s+1\s*\(/.test(readLogSince(markG)), readLogSince(markG).slice(-100));

setEditorVal('enum E { A = 1 << 1, B = A + 10 }\n// 调用：E.B\n');
markG = logChildren().length;
runOnce(500);
check('enum members can reference earlier members', /→\s+12\s*\(/.test(readLogSince(markG)), readLogSince(markG).slice(-120));

setEditorVal('class Box<T> {\n  v: T;\n  constructor(v: T) { this.v = v; }\n  get(): T { return this.v; }\n}\n// 调用：new Box(1).get()\n');
check('generic class compiles', startDebug(0) === true);

setEditorVal('const f = <T,>(x: T): T => x;\n// 调用：f(1)\n');
check('generic arrow compiles', startDebug(0) === true);

setEditorVal('function f(x: number): number { return x; }\n// 调用：f<number>(1)\n');
check('call-site type arguments are stripped', startDebug(0) === true);

check('one-line function with a value return passes the checker',
  typecheckTS('function f(x: number): number { return x; }\n', true).length === 0);

setEditorVal(SAMPLES.classes);
check('built-in classes sample debug-compiles at its default step',
  startDebug(6) === true && getDebugState().TRACE.steps.length > 1);

// --- Benchmark regression suite: non-null assertion (!), generic Array<T>().fill, union/nullable narrowing, circular JSON
r = stripTypes('const x = slow!.next!.next; const y = stack.pop()!; const z = a[0]!;');
check('stripTypes removes postfix non-null assertions (!)', !r.includes('!') && r.includes('slow.next.next') && r.includes('stack.pop()') && r.includes('a[0]'), r);

r = stripTypes('const ok = a !== b && !flag;');
check('stripTypes preserves !== and prefix !', r.includes('a !== b') && r.includes('!flag'), r);

check('typecheckTS infers new Array<number>(n).fill(0) as number[]',
  typecheckTS('function f(n: number): number[] {\n  const dp: number[] = new Array<number>(n).fill(0);\n  return dp;\n}\n', true).length === 0);

check('typecheckTS infers new Array<boolean>(n).fill(false) as boolean[]',
  typecheckTS('function f(n: number): boolean[] {\n  const used: boolean[] = new Array<boolean>(n).fill(false);\n  return used;\n}\n', true).length === 0);

check('typecheckTS accepts bare return inside nested void helper',
  typecheckTS('function outer(nums: number[]): number[][] {\n  const res: number[][] = [];\n  const dfs = (): void => {\n    if (nums.length === 0) {\n      return;\n    }\n  };\n  dfs();\n  return res;\n}\n', true).length === 0);

check('typecheckTS accepts parenthesized union array parameter (number | null)[]',
  typecheckTS('function build(values: (number | null)[]): number {\n  return values.length;\n}\nbuild([1, null, 2, 3]);\n', true).length === 0);

// Circular return value should not crash startDebug / runToNextCheckpoint / runOnce
setEditorVal('class RNode {\n  val: number;\n  next: RNode | null;\n  random: RNode | null;\n  constructor(v: number) { this.val = v; this.next = null; this.random = null; }\n}\nfunction makeCycle(): RNode {\n  const a = new RNode(1);\n  const b = new RNode(2);\n  a.next = b;\n  b.random = a;\n  return a;\n}\nmakeCycle();\n');
check('circular structure in return value runs and finishes debug without JSON crash',
  startDebug(0) === true && (runToNextCheckpoint(), getDebugState().DEBUG_SESSION.finished && !getDebugState().DEBUG_SESSION.crashed));

// --- Class visualization, metadata, hover, and typechecking suite
{
  const meta = extractTsInterfaceMetadata('class Counter {\n  n: number;\n  constructor(start: number = 0) {\n    this.n = start;\n    this.tag = "ok";\n  }\n}\nconst c = new Counter(5);\n');
  const clsMeta = meta.interfaces.get('Counter');
  check('extractTsInterfaceMetadata extracts class with isClass=true and constructor fields',
    Boolean(clsMeta && clsMeta.isClass === true && clsMeta.fields.some(f => f.k === 'n' && f.declaredType === 'number') && clsMeta.fields.some(f => f.k === 'tag')),
    JSON.stringify(clsMeta));
  check('extractTsInterfaceMetadata infers varTypes for new ClassName()',
    meta.varTypes.get('c') === 'Counter', meta.varTypes.get('c'));

  const pyObj = { x: 10, y: 20 };
  Object.defineProperty(pyObj, '__py_cls__', { value: 'Point', enumerable: false, configurable: true, writable: true });
  const clonedPyObj = cloneDeepBounded(pyObj);
  check('cloneDeepBounded preserves non-enumerable __py_cls__ tag',
    clonedPyObj && clonedPyObj.__py_cls__ === 'Point', clonedPyObj && clonedPyObj.__py_cls__);

  setEditorVal('class Counter {\n  n: number;\n  constructor(start: number = 0) {\n    this.n = start;\n  }\n  inc(step: number = 1): number {\n    this.n += step;\n    return this.n;\n  }\n}\nfunction runCounter(): number {\n  const c = new Counter(10);\n  c.inc(5);\n  return c.n;\n}\nrunCounter();\n');
  startDebug(0);
  let hoverInsideMethod = null;
  let hoverSelfInsideMethod = null;
  for (let i = 0; i < 6; i++) {
    stepNext();
    const curSt = getDebugState().TRACE.steps[getDebugState().cur];
    if (curSt && /this\.n\s*\+=\s*step/.test(curSt.rawNote || '')) {
      hoverInsideMethod = hoverInfoFor('this');
      hoverSelfInsideMethod = hoverInfoFor('self');
    }
  }
  const st = getDebugState();
  const incStep = st.TRACE.steps.find(s => /this\.n\s*\+=\s*step/.test(s.rawNote || ''));
  check('class instance in method has interface/class ds card for `this`',
    Boolean(incStep && incStep.ds.this && incStep.ds.this.kind === 'interface' && incStep.ds.this.isClass === true && incStep.ds.this.interfaceName === 'Counter'),
    JSON.stringify(incStep && incStep.ds.this));
  check('this.n += step produces assign anim capsule and hot="n" on `this` card',
    Boolean(incStep && incStep.anim && incStep.anim.type === 'assign' && incStep.anim.to === 'this.n' && incStep.ds.this.hot === 'n'),
    JSON.stringify(incStep && { anim: incStep.anim, hot: incStep.ds.this && incStep.ds.this.hot }));
  const renderedCard = VIZ.interface(incStep.ds.this);
  check('VIZ.interface renders class keyword badge for class instances',
    renderedCard.includes('viface-kw">class<') && renderedCard.includes('Counter'),
    renderedCard.slice(0, 160));
  check('hoverInfoFor supports `this` and `self` when debugging inside a method',
    Boolean(hoverInsideMethod && hoverSelfInsideMethod && hoverInsideMethod.kind === 'class · Counter' && hoverInsideMethod.d && hoverInsideMethod.d.kind === 'interface'));

  // Class typechecking diagnostics
  const errProp = typecheckTS('class Box {\n  v: number;\n  constructor(v: number) { this.v = v; }\n  bad(): number { return this.missing; }\n}\n', true);
  check('typecheckTS catches TS2339 unknown property on `this` inside class method',
    errProp.some(d => d.code === 'TS2339' && /missing/.test(d.message)), JSON.stringify(errProp));

  const errAssign = typecheckTS('class Box {\n  v: number;\n  constructor(v: number) { this.v = "wrong"; }\n}\n', true);
  check('typecheckTS catches TS2322 wrong type assigned to `this.v`',
    errAssign.some(d => d.code === 'TS2322'), JSON.stringify(errAssign));

  const errCtor = typecheckTS('class Box {\n  v: number;\n  constructor(v: number) { this.v = v; }\n}\nconst b = new Box("wrong");\n', true);
  check('typecheckTS catches TS2345 wrong constructor argument type in new Box(...)',
    errCtor.some(d => d.code === 'TS2345'), JSON.stringify(errCtor));
}

// --- CodeMirror wordMatchPlugin ignores keywords like def, in, for, if, return
{
  const cmEntry = fs.readFileSync(new URL('./editor/cm-entry.js', import.meta.url), 'utf8');
  check('cm-entry.js defines IGNORED_MATCH_WORDS excluding def, in, for, if, return',
    cmEntry.includes('IGNORED_MATCH_WORDS') &&
    ['def', 'in', 'for', 'if', 'return'].every(kw => new RegExp(`['"]${kw}['"]`).test(cmEntry)));
}

// --- Undeclared variable detection (TS2304) & first-line step capsule upward guide (╰─)
{
  const undeclAssignDiags = typecheckTS('strs = ["flower", "flow", "flight"];\nlet ans = "";\n', true);
  check('typecheckTS catches TS2304 on undeclared variable assignment `strs = [...]`',
    undeclAssignDiags.some(d => d.line === 1 && d.code === 'TS2304' && /strs/.test(d.message)),
    JSON.stringify(undeclAssignDiags));

  setEditorVal('strs = ["flower", "flow", "flight"];\nlet ans = "";\n');
  check('startDebug rejects undeclared variable assignment with TS2304',
    startDebug(0) === false && getDebugState().TRACE.steps.length === 0);

  const undeclExprDiags = typecheckTS('const x: number = ghostVar + 1;\n', true);
  check('typecheckTS catches TS2304 on undeclared variable in expression',
    undeclExprDiags.some(d => d.line === 1 && d.code === 'TS2304' && /ghostVar/.test(d.message)),
    JSON.stringify(undeclExprDiags));

  const undeclIncDiags = typecheckTS('ghostCount++;\n', true);
  check('typecheckTS catches TS2304 on undeclared variable increment',
    undeclIncDiags.some(d => d.line === 1 && d.code === 'TS2304' && /ghostCount/.test(d.message)),
    JSON.stringify(undeclIncDiags));

  // First-line step capsule (dropped below line 1) points upward with ╰─, while line 2+ points downward with ╭─
  setEditorVal('let strs: string[] = ["flower", "flow", "flight"];\nlet ans: string = strs[0];\n\n// 调用：ans\n');
  const line1Ok = startDebug(0);
  const line1State = getDebugState();
  check('first-line step capsule is placed below line 1 and its guide points upward (╰─)',
    line1Ok &&
    line1State.TRACE.steps[0].line === 1 &&
    line1State.stepVizTop === '39px' &&
    line1State.stepVizHtml.includes('╰─') &&
    !line1State.stepVizHtml.includes('╭─'),
    line1State.stepVizHtml);

  stepNext();
  const line2State = getDebugState();
  check('second-line step capsule floats above line 2 and its guide points downward (╭─)',
    line2State.TRACE.steps[1].line === 2 &&
    parseInt(line2State.stepVizTop, 10) < 36 &&
    line2State.stepVizHtml.includes('╭─') &&
    !line2State.stepVizHtml.includes('╰─'),
    line2State.stepVizHtml);

  // Arrow function parameters inside call parens `s.sort((a, b) => a - b)` are recognized as declared
  const sortSrc = 'const s: number[] = [3, 1, 2];\ns.sort((a, b) => a - b);\n';
  const sortDeclared = collectDeclaredNames(sortSrc);
  const sortHl = hl('s.sort((a, b) => a - b);', sortDeclared);
  check('collectDeclaredNames & hl color arrow params (a, b) inside s.sort((a, b) => a - b)',
    sortDeclared.has('a') &&
    sortDeclared.has('b') &&
    sortHl.includes('<span class="prop">a</span>') &&
    sortHl.includes('<span class="prop">b</span>'),
    sortHl);

  const cmSrc = fs.readFileSync(new URL('./editor/cm-entry.js', import.meta.url), 'utf8');
  check('cm-entry.js binds indentWithTab in keymap for Tab/Shift-Tab indentation',
    cmSrc.includes('indentWithTab') && cmSrc.includes('keymap.of([indentWithTab])'));
}

// --- Ultra-large data structure support: focus-aware dynamic windowing, true indices, 2D sliding viewport
{
  const bigArr = Array.from({ length: 10000 }, (_, i) => i * 2);
  const dsArr = { nums: classifyValue('nums', bigArr) };
  enrichFromNote(dsArr, { l: 5000, r: 9999, mid: 7499 }, 'const x = nums[mid];');
  const dNums = dsArr.nums;
  const htmlNums = VIZ.array(dNums);
  check('10,000-element array records total=10000 and builds focus-aware windowed slice around l/mid/r',
    dNums.total === 10000 &&
    Array.isArray(dNums.windowed) &&
    dNums.windowed.some(e => !e.gap && e.idx === 7499 && e.val === 14998) &&
    dNums.windowed.some(e => !e.gap && e.idx === 5000 && e.val === 10000) &&
    dNums.windowed.some(e => !e.gap && e.idx === 9999 && e.val === 19998) &&
    dNums.windowed.some(e => e.gap && e.count > 1000));
  check('vizArray on 10,000-element array renders true indices (7499, 9999), pointer tags, and gap counts',
    htmlNums.includes('<span class="idx">7499</span>') &&
    htmlNums.includes('<span class="idx">9999</span>') &&
    htmlNums.includes('14998') &&
    htmlNums.includes('ptr-tag') &&
    htmlNums.includes('vmore-cnt'));

  // 100x100 2D DP Grid sliding viewport
  const bigGrid = Array.from({ length: 100 }, (_, r) => Array.from({ length: 100 }, (__, c) => r * 100 + c));
  const dsGrid = { dp: classifyValue('dp', bigGrid) };
  enrichFromNote(dsGrid, { i: 45, j: 60 }, 'dp[i][j] = dp[i - 1][j] + dp[i][j - 1];');
  const dGrid = dsGrid.dp;
  const htmlBigGrid = VIZ.grid(dGrid);
  check('100x100 2D grid computes sliding viewport around [45][60] with rowIndices and colIndices',
    dGrid.totalRows === 100 &&
    dGrid.totalCols === 100 &&
    Array.isArray(dGrid.rowIndices) && dGrid.rowIndices.includes(45) && dGrid.rowIndices.includes(0) && dGrid.rowIndices.includes(99) &&
    Array.isArray(dGrid.colIndices) && dGrid.colIndices.includes(60) && dGrid.colIndices.includes(0) && dGrid.colIndices.includes(99));
  check('vizGrid on 100x100 grid highlights [45][60] as hot and [44][60]/[45][59] as dep with bounded DOM cells',
    htmlBigGrid.includes('title="[45][60]"') &&
    htmlBigGrid.includes('gcell hot') &&
    (htmlBigGrid.match(/gcell dep/g) || []).length === 2 &&
    (htmlBigGrid.match(/class="gcell/g) || []).length <= 64);

  // 1,000-element Stack keeps top elements
  const bigStack = Array.from({ length: 1000 }, (_, i) => i + 1);
  const dsStack = { stack: classifyValue('stack', bigStack) };
  enrichFromNote(dsStack, {}, 'stack.push(1000);');
  const htmlStack = VIZ.stack(dsStack.stack);
  check('1,000-element stack preserves true top element (1000) and hidden count (+994)',
    dsStack.stack.total === 1000 &&
    htmlStack.includes('<span>1000</span><span class="vtop">top</span>') &&
    htmlStack.includes('…+994'));

  // 200-node Linked List with slow & fast pointers at node 50 and 100
  let head = null;
  const nodes = [];
  for (let i = 199; i >= 0; i--) {
    head = { val: i * 10, next: head };
    nodes[i] = head;
  }
  const dsList = { head: classifyValue('head', head) };
  enrichFromNote(dsList, { slow: nodes[50], fast: nodes[100] }, 'slow = slow.next;');
  const dList = dsList.head;
  const htmlList = VIZ.list(dList);
  check('200-node linked list tracks slow/fast node pointers at indices 50 and 100',
    dList.total === 200 &&
    dList.pointers && dList.pointers[50] && dList.pointers[50].includes('slow') &&
    dList.pointers[100] && dList.pointers[100].includes('fast') &&
    htmlList.includes('500') && htmlList.includes('1000'));

  // P1-1: O(n) stripTypes on 1400 lines of `<` comparisons without `>`
  const heavyLtSrc = Array.from({ length: 1400 }, (_, i) => `let x${i}: number = a < b ? ${i} : 0;`).join('\n');
  const t0 = Date.now();
  const strippedHeavy = stripTypes(heavyLtSrc);
  const elapsedMs = Date.now() - t0;
  check('stripTypes handles 1400 lines of `<` without `>` in O(n) (< 150ms vs 1960ms baseline)',
    elapsedMs < 150 && strippedHeavy.includes('let x1399 = a < b ? 1399 : 0;'), `elapsed=${elapsedMs}ms`);

  // Typechecker coverage for ternary narrowing, inline-if narrowing, tuple arrays, and function-typed fields
  check('typecheckTS narrows property inside ternary branch (current.next === null ? null : map.get(current.next))',
    typecheckTS('class N { next: N | null = null; }\nconst map = new Map<N, N>();\nconst cur = new N();\nconst x: N | null = cur.next === null ? null : map.get(cur.next) ?? null;\n', true).length === 0);
  check('typecheckTS narrows local inside inline if-return (if (existing !== undefined) return existing;)',
    typecheckTS('function f(m: Map<number, string>): string {\n  const existing = m.get(1);\n  if (existing !== undefined) return existing;\n  return "a";\n}\n', true).length === 0);
  check('typecheckTS accepts tuple array literal [number, number][]',
    typecheckTS('const dirs: [number, number][] = [[1, 0], [-1, 0]];\n', true).length === 0);
  check('typecheckTS accepts function-typed class field and constructor parameter (a: number, b: number) => number',
    typecheckTS('class Heap {\n  private cmp: (a: number, b: number) => number;\n  constructor(cmp: (a: number, b: number) => number) { this.cmp = cmp; }\n  test(): number { return this.cmp(1, 2); }\n}\nconst h = new Heap((a: number, b: number) => b - a);\n', true).length === 0);
  const cmSrc = fs.readFileSync(new URL('./editor/cm-entry.js', import.meta.url), 'utf8');
  check('cm-entry.js places horizontal padding on .cm-line and keeps native ::selection transparent so selection stays inside input bounds',
    cmSrc.includes("'.cm-line': { padding: '0 64px 0 16px' }") &&
    cmSrc.includes("'.cm-content': { padding: '12px 0 48px 0'") &&
    cmSrc.includes("'.cm-content ::selection, .cm-line ::selection, .cm-line::selection': { backgroundColor: 'transparent !important' }"));
  check('cm-entry.js sets textDecorationSkipInk: none on .cm-wordMatch so descenders like g and y have continuous underlines',
    cmSrc.includes("textDecorationSkipInk: 'none'") && cmSrc.includes("textUnderlineOffset: '4px'"));
}

// --- Advanced TypeScript Type System (Plan B: Full Generics, Conditional Types, Mapped Types, infer, Utility Types & Worker Bundle)
{
  // 1. Verify ts-worker.bundle.js is built and present
  const workerBundlePath = new URL('./editor/ts-worker.bundle.js', import.meta.url);
  check('editor/ts-worker.bundle.js is built by build-editor.mjs',
    fs.existsSync(workerBundlePath) && fs.statSync(workerBundlePath).size > 10000);

  // 2. Generic functions with constraints & keyof (stripTypes + typecheckTS + execution)
  const genericFnSrc = [
    'interface User {',
    '  id: number;',
    '  name: string;',
    '}',
    'function getProp<T, K extends keyof T>(obj: T, key: K): T[K] {',
    '  return obj[key];',
    '}',
    'const u: User = { id: 42, name: "Alice" };',
    'const idVal: number = getProp(u, "id");',
    'const nameVal: string = getProp(u, "name");',
    'idVal;',
  ].join('\n');
  const genericFnDiags = typecheckTS(genericFnSrc, true);
  check('typecheckTS accepts generic function getProp<T, K extends keyof T>(obj: T, key: K): T[K]',
    genericFnDiags.length === 0, JSON.stringify(genericFnDiags));

  const badGenericKeySrc = [
    'interface User { id: number; name: string; }',
    'function getProp<T, K extends keyof T>(obj: T, key: K): T[K] { return obj[key]; }',
    'const u: User = { id: 42, name: "Alice" };',
    'const bad = getProp(u, "missingKey");',
  ].join('\n');
  const badGenericKeyDiags = typecheckTS(badGenericKeySrc, true);
  check('typecheckTS rejects invalid keyof constraint argument with TS2345',
    badGenericKeyDiags.some(d => d.code === 'TS2345'), JSON.stringify(badGenericKeyDiags));

  const badGenericRetSrc = [
    'interface User { id: number; name: string; }',
    'function getProp<T, K extends keyof T>(obj: T, key: K): T[K] { return obj[key]; }',
    'const u: User = { id: 42, name: "Alice" };',
    'const wrongType: string = getProp(u, "id");',
  ].join('\n');
  const badGenericRetDiags = typecheckTS(badGenericRetSrc, true);
  check('typecheckTS infers T[K] return type ("id" -> number) and catches TS2322 when assigned to string',
    badGenericRetDiags.some(d => d.code === 'TS2322'), JSON.stringify(badGenericRetDiags));

  // 3. Conditional types & infer (UnwrapArray, MyReturnType, UnwrapPromise, Tuple Head/Tail, Template Literal infer)
  const condInferSrc = [
    'type UnwrapArray<T> = T extends (infer U)[] ? U : T;',
    'type MyReturnType<F> = F extends (...args: any[]) => infer R ? R : never;',
    'type UnwrapPromise<T> = T extends Promise<infer U> ? UnwrapPromise<U> : T;',
    'type FirstOfTuple<T> = T extends [infer H, ...infer _Rest] ? H : never;',
    'type ParseKey<S> = S extends `get_${infer Name}` ? Name : never;',
    'const a: UnwrapArray<number[]> = 123;',
    'const b: UnwrapArray<string> = "hello";',
    'const c: MyReturnType<(x: number) => boolean> = true;',
    'const d: UnwrapPromise<Promise<Promise<number>>> = 99;',
    'const e: FirstOfTuple<[string, number, boolean]> = "head";',
    'const f: ParseKey<"get_token"> = "token";',
    'a + d;',
  ].join('\n');
  const condInferDiags = typecheckTS(condInferSrc, true);
  check('typecheckTS evaluates conditional types and `infer` (array, function return, recursive Promise, tuple, template literal)',
    condInferDiags.length === 0, JSON.stringify(condInferDiags));

  const badCondInferSrc = [
    'type UnwrapArray<T> = T extends (infer U)[] ? U : T;',
    'const bad: UnwrapArray<number[]> = "not-a-number";',
  ].join('\n');
  const badCondInferDiags = typecheckTS(badCondInferSrc, true);
  check('typecheckTS catches TS2322 when conditional `infer` resolves UnwrapArray<number[]> to number',
    badCondInferDiags.some(d => d.code === 'TS2322'), JSON.stringify(badCondInferDiags));

  // 4. Distributive Conditional Types (MyExclude, MyExtract, MyNonNullable)
  const distCondSrc = [
    'type MyExclude<T, U> = T extends U ? never : T;',
    'type MyExtract<T, U> = T extends U ? T : never;',
    'type NumOrBool = MyExclude<string | number | boolean, string>;',
    'type OnlyStr = MyExtract<string | number, string>;',
    'const x: NumOrBool = 10;',
    'const y: NumOrBool = false;',
    'const z: OnlyStr = "ok";',
  ].join('\n');
  check('typecheckTS evaluates distributive conditional types over unions',
    typecheckTS(distCondSrc, true).length === 0);

  const badDistCondDiags = typecheckTS(distCondSrc + '\nconst bad: OnlyStr = 123;\n', true);
  check('typecheckTS catches TS2322 on distributive conditional type mismatch',
    badDistCondDiags.some(d => d.code === 'TS2322'), JSON.stringify(badDistCondDiags));

  // 5. Mapped Types ({ [K in keyof T]?: T[K] }, -?, readonly, key remapping with `as`)
  const mappedSrc = [
    'interface Config {',
    '  host: string;',
    '  port: number;',
    '}',
    'type PartialConfig = {',
    '  [K in keyof Config]?: Config[K];',
    '};',
    'type Nullable<T> = {',
    '  [K in keyof T]: T[K] | null;',
    '};',
    'const p: PartialConfig = { host: "localhost" };',
    'const n: Nullable<Config> = { host: null, port: 8080 };',
  ].join('\n');
  const mappedDiags = typecheckTS(mappedSrc, true);
  check('typecheckTS evaluates multi-line mapped types ({ [K in keyof T]?: ... } and generic Nullable<T>)',
    mappedDiags.length === 0, JSON.stringify(mappedDiags));

  const badMappedSrc = mappedSrc + '\nconst bad: Nullable<Config> = { host: 123, port: 8080 };\n';
  const badMappedDiags = typecheckTS(badMappedSrc, true);
  check('typecheckTS catches TS2322 when mapped type field has wrong value type',
    badMappedDiags.some(d => d.code === 'TS2322'), JSON.stringify(badMappedDiags));

  // 6. Built-in Utility Types (Partial, Required, Pick, Omit, Record, ReturnType, Parameters, Awaited)
  const utilitySrc = [
    'interface Task {',
    '  id: number;',
    '  title: string;',
    '  done?: boolean;',
    '}',
    'const tPartial: Partial<Task> = {};',
    'const tPick: Pick<Task, "id" | "title"> = { id: 1, title: "Write tests" };',
    'const tOmit: Omit<Task, "done" | "title"> = { id: 2 };',
    'const tRecord: Record<string, number> = { a: 1, b: 2 };',
    'type AddFn = (a: number, b: string) => boolean;',
    'const ret: ReturnType<AddFn> = false;',
    'const params: Parameters<AddFn> = [1, "x"];',
    'const aw: Awaited<Promise<string>> = "done";',
  ].join('\n');
  const utilityDiags = typecheckTS(utilitySrc, true);
  check('typecheckTS supports built-in utility types (Partial, Pick, Omit, Record, ReturnType, Parameters, Awaited)',
    utilityDiags.length === 0, JSON.stringify(utilityDiags));

  const badPickDiags = typecheckTS(
    'interface Task { id: number; title: string; done: boolean; }\nconst p: Pick<Task, "id"> = { id: 1, title: "extra" };\n',
    true
  );
  check('typecheckTS catches TS2353 excess property on Pick<Task, "id">',
    badPickDiags.some(d => d.code === 'TS2353'), JSON.stringify(badPickDiags));

  // 7. Generic class instantiation and method type substitution
  const genericClassSrc = [
    'class Box<T> {',
    '  val: T;',
    '  constructor(v: T) { this.val = v; }',
    '  get(): T { return this.val; }',
    '}',
    'const numBox = new Box<number>(100);',
    'const n: number = numBox.get();',
  ].join('\n');
  check('typecheckTS instantiates generic class Box<number> and resolves numBox.get() as number',
    typecheckTS(genericClassSrc, true).length === 0);

  const badGenericClassDiags = typecheckTS(
    genericClassSrc + '\nconst wrong: string = numBox.get();\n',
    true
  );
  check('typecheckTS catches TS2322 when assigning Box<number>.get() to string',
    badGenericClassDiags.some(d => d.code === 'TS2322'), JSON.stringify(badGenericClassDiags));

  // 8. End-to-end Debug execution of code with complex generics, conditional types, infer, and mapped types
  setEditorVal([
    'type Unwrap<T> = T extends (infer U)[] ? U : T;',
    'type Optionalize<T> = {',
    '  [K in keyof T]?: T[K];',
    '};',
    'interface Item {',
    '  id: number;',
    '  score: number;',
    '}',
    'function pluck<T, K extends keyof T>(items: T[], key: K): T[K][] {',
    '  const out: T[K][] = [];',
    '  for (let i = 0; i < items.length; i++) {',
    '    out.push(items[i][key]);',
    '  }',
    '  return out;',
    '}',
    'function runAdvanced(): number {',
    '  const list: Item[] = [{ id: 1, score: 10 }, { id: 2, score: 25 }];',
    '  const patch: Optionalize<Item> = { score: 30 };',
    '  const scores: Unwrap<number[][]> = pluck(list, "score");',
    '  return scores[0] + scores[1] + (patch.score ?? 0);',
    '}',
    'runAdvanced();',
  ].join('\n'));
  const advDebugOk = startDebug(0);
  while (getDebugState().DEBUG_SESSION.active && !getDebugState().DEBUG_SESSION.finished) {
    stepNext();
  }
  const advDebugState = getDebugState();
  check('Debug session compiles, strips multi-line conditional/mapped/generic types with 1:1 line mapping, and computes return value 65',
    advDebugOk && advDebugState.DEBUG_SESSION.returnValue === 65,
    JSON.stringify({ ok: advDebugOk, ret: advDebugState.DEBUG_SESSION.returnValue }));
}

// --- Full TS Syntax (namespaces, function overloads, declare, mixed array union inference) & Virtual Event Loop Async Visualization
{
  // 1. Single wavy red underline (no duplicate SVG background wave from @codemirror/lint)
  const cmSrc = fs.readFileSync(new URL('./editor/cm-entry.js', import.meta.url), 'utf8');
  const appCss = fs.readFileSync(new URL('./css/app.css', import.meta.url), 'utf8');
  check('cm-entry.js and css/app.css disable @codemirror/lint default background-image SVG wave so only 1 wavy red line renders',
    cmSrc.includes("backgroundImage: 'none !important'") && appCss.includes('background-image:none !important'));

  // 2. Mixed array literal inference & union array assignability (Image 1 regression test)
  const mixedArrBad = typecheckTS('const num: string[] | number[] = [123, 456, "132"];\n', true);
  check('typecheckTS infers [123, 456, "132"] as (number|string)[] and rejects assigning to string[] | number[] with TS2322',
    mixedArrBad.some(d => d.code === 'TS2322' && /\(number\|string\)\[\]/.test(d.message)),
    JSON.stringify(mixedArrBad));
  check('typecheckTS accepts assigning homogeneous number[] to string[] | number[] and mixed array to (number | string)[]',
    typecheckTS('const a: string[] | number[] = [123, 456];\nconst b: (number | string)[] = [123, 456, "132"];\n', true).length === 0);

  // 3. Namespace & function overloads & ambient declare
  setEditorVal([
    'declare const EXTERNAL_FLAG: boolean;',
    'namespace MathUtil {',
    '  export const PI_INT: number = 3;',
    '  export function double(x: number): number {',
    '    return x * 2;',
    '  }',
    '}',
    'function formatVal(x: number): string;',
    'function formatVal(x: string): string;',
    'function formatVal(x: number | string): string {',
    '  return "v=" + x;',
    '}',
    'formatVal(MathUtil.double(MathUtil.PI_INT));',
  ].join('\n'));
  const nsOk = startDebug(0);
  while (getDebugState().DEBUG_SESSION.active && !getDebugState().DEBUG_SESSION.finished) {
    stepNext();
  }
  check('namespace, function overloads, and declare statements compile, typecheck, and execute',
    nsOk && getDebugState().DEBUG_SESSION.returnValue === 'v=6',
    JSON.stringify({ nsOk, ret: getDebugState().DEBUG_SESSION.returnValue }));

  // 4. Virtual Event Loop & Async/Await/Promise/setTimeout/queueMicrotask visualization
  setEditorVal(SAMPLES.async_loop);
  const asyncOk = startDebug(0);
  let sawEventLoopCard = false;
  let renderedEventLoopHtml = '';
  while (getDebugState().DEBUG_SESSION.active && !getDebugState().DEBUG_SESSION.finished) {
    stepNext();
    const st = getDebugState().TRACE.steps[getDebugState().cur];
    if (st && st.ds && st.ds.eventLoop && st.ds.eventLoop.kind === 'eventloop') {
      sawEventLoopCard = true;
      if (!renderedEventLoopHtml && st.ds.eventLoop.coroutines && st.ds.eventLoop.coroutines.some(c => c.status === 'suspended')) {
        renderedEventLoopHtml = VIZ.eventloop(st.ds.eventLoop);
      }
    }
  }
  const asyncFinal = getDebugState();
  check('SAMPLES.async_loop executes deterministically through Virtual Event Loop in exact microtask -> timer -> await order',
    asyncOk &&
    asyncFinal.DEBUG_SESSION.returnValue === '1:sync-start -> 2:before-await -> 3:promise-then-micro -> 4:queueMicrotask -> 5:timeout-10ms -> 6:after-await-35',
    JSON.stringify({ asyncOk, ret: asyncFinal.DEBUG_SESSION.returnValue }));
  check('Virtual Event Loop attaches ds.eventLoop and VIZ.eventloop renders coroutines, microtasks, macrotasks, and promises',
    sawEventLoopCard &&
    renderedEventLoopHtml.includes('veventloop') &&
    renderedEventLoopHtml.includes('Async 协程状态') &&
    renderedEventLoopHtml.includes('Microtask 微任务队列') &&
    renderedEventLoopHtml.includes('Macrotask 宏任务') &&
    renderedEventLoopHtml.includes('Promise 状态表'),
    renderedEventLoopHtml.slice(0, 200));

  // 5. Anonymous `function(resolve)` inside `new Promise` + `setTimeout` (Screenshot 1 regression test)
  const delayAnonFnSrc = [
    'function delay(ms: number): Promise<string> {',
    '  return new Promise(function(resolve) {',
    '    setTimeout(function() {',
    '      resolve("完成!");',
    '    }, ms);',
    '  });',
    '}',
    'async function testDelay(): Promise<string> {',
    '  const res: string = await delay(10);',
    '  return res;',
    '}',
    'testDelay();',
  ].join('\n');
  const delayDiags = typecheckTS(delayAnonFnSrc, true);
  check('typecheckTS accepts new Promise(function(resolve) { setTimeout(function() { resolve("完成!"); }, ms); }) with 0 errors',
    delayDiags.length === 0, JSON.stringify(delayDiags));
  setEditorVal(delayAnonFnSrc);
  const delayRunOk = startDebug(0);
  while (getDebugState().DEBUG_SESSION.active && !getDebugState().DEBUG_SESSION.finished) {
    stepNext();
  }
  check('new Promise(function(resolve) { ... }) executes through Virtual Event Loop and resolves to "完成!"',
    delayRunOk && getDebugState().DEBUG_SESSION.returnValue === '完成!',
    JSON.stringify({ delayRunOk, ret: getDebugState().DEBUG_SESSION.returnValue }));

  // 6. Jupyter Notebook mode: cross-cell state sharing, strict TS typechecking, syntax highlight CSS, and UI status
  check('Notebook mode functions exported', typeof setViewMode === 'function' && typeof getActiveNotebook === 'function' && typeof runNotebookCell === 'function');
  check('Notebook toolbar removed #nbBtnDebug', !html.includes('id="nbBtnDebug"'));
  check('Notebook syntax highlight CSS rules defined for .nb-cell-hl', css.includes('.nb-cell-hl .kw') && css.includes('.nb-cell-hl .prop') && css.includes('.nb-cell-hl .ln-err-badge'));
  setViewMode('notebook');
  const nbDoc = getActiveNotebook();
  check('Default Intro.ipynb in TS mode uses pure TypeScript without print()',
    nbDoc && nbDoc.title === 'Intro.ipynb' && nbDoc.cells[1].source === 'let a: number = 1;' && nbDoc.cells[2].source === 'console.log(a);');
  check('nbKernelStatus shows concise "就绪" when idle',
    sandbox.document.getElementById('nbKernelStatus').innerHTML.includes('<span>就绪</span>') &&
    !sandbox.document.getElementById('nbKernelStatus').innerHTML.includes('TypeScript Kernel'));
  // Run Cell 4 (uses `a` from earlier cells and defines `nums`)
  await runNotebookCell(nbDoc.cells[3].id, false);
  check('Cross-cell execution shares variable `a` and updates `nums` in global context',
    Array.isArray(nbDoc.lastGlobalVars.nums) && nbDoc.lastGlobalVars.nums.length === 7 && nbDoc.cells[3].output.logs[0].includes('25'),
    JSON.stringify(nbDoc.cells[3].output));
  // Debug Cell 5 (binary search using `nums` from Cell 4)
  await debugNotebookCell(nbDoc.cells[4].id);
  const nbDbgState = getDebugState();
  check('Single-cell step debugger attaches to cell and inherits cross-cell `nums`',
    nbDbgState.DEBUG_SESSION.active && nbDbgState.TRACE.steps.length > 0 && Boolean(nbDbgState.TRACE.steps[0].ds.nums),
    JSON.stringify({ active: nbDbgState.DEBUG_SESSION.active, steps: nbDbgState.TRACE.steps.length }));
  check('nbKernelStatus shows concise "调试中" when debugging',
    sandbox.document.getElementById('nbKernelStatus').innerHTML.includes('<span>调试中</span>'));
  // Verify TS cell rejects Python print() and undeclared variables with TS2304
  const origCell2Src = nbDoc.cells[2].source;
  nbDoc.cells[2].source = 'print(a)';
  const pyInTsDiags = typecheckNotebookCellTS(nbDoc, nbDoc.cells[2]);
  const badRunOk = await runNotebookCell(nbDoc.cells[2].id, false);
  check('TypeScript Notebook cell rejects print(a) with TS2304 and blocks execution',
    !badRunOk && pyInTsDiags.some(d => d.code === 'TS2304') && nbDoc.cells[2].status === 'error',
    JSON.stringify({ badRunOk, pyInTsDiags, out: nbDoc.cells[2].output }));
  nbDoc.cells[2].source = origCell2Src;
  await runNotebookCell(nbDoc.cells[2].id, false);
  setViewMode('script');

  // 7. Full TypeScript Grammar & Strict Type-Checker Matrix (52+ Positive & Negative Clauses)
  const tsMatrix = [
    // 1. Declarations & Destructuring
    {
      name: '1a. Typed destructuring with defaults & rest (Positive)',
      pos: true,
      src: [
        'const { a, b = 10 }: { a: number; b?: number } = { a: 1 };',
        'const [x, ...rest]: [number, ...string[]] = [1, "a", "b"];',
      ].join('\n'),
    },
    {
      name: '1b. Typed destructuring mismatch (Negative)',
      pos: false,
      src: 'const { a }: { a: number } = { a: "wrong" };',
    },
    // 2. Primitives, Literals & Special Types (unknown, never, void, unique symbol)
    {
      name: '2a. unknown assignment, unique symbol, void (Positive)',
      pos: true,
      src: [
        'let u: unknown = 123;',
        'u = "str";',
        'const s: unique symbol = Symbol("k");',
        'const v: void = undefined;',
      ].join('\n'),
    },
    {
      name: '2b. unknown assigned to number without narrowing (Negative)',
      pos: false,
      src: 'let u: unknown = 123;\nlet n: number = u;',
    },
    {
      name: '2c. concrete value assigned to never (Negative)',
      pos: false,
      src: 'let nv: never = 1;',
    },
    // 3. Tuples: Optional, Rest & Labeled Tuple Elements
    {
      name: '3a. Labeled tuple with optional and rest elements (Positive)',
      pos: true,
      src: [
        'type T1 = [name: string, age?: number, ...tags: boolean[]];',
        'const t1: T1 = ["alice", 20, true, false];',
        'const t2: T1 = ["bob"];',
      ].join('\n'),
    },
    {
      name: '3b. Labeled tuple element type mismatch (Negative)',
      pos: false,
      src: 'type T1 = [name: string, age?: number];\nconst t: T1 = ["alice", "not-a-number"];',
    },
    // 4. Interfaces: Optional, Readonly, Index Signatures & Extends
    {
      name: '4a. Interface inheritance + index signature (Positive)',
      pos: true,
      src: [
        'interface Base { readonly id: number; }',
        'interface Dict extends Base { name?: string; [k: string]: any; }',
        'const d: Dict = { id: 1, extra: "ok" };',
      ].join('\n'),
    },
    // 5. Classes & OOP: Parameter Properties, Modifiers, Getters/Setters, Static, Abstract & Implements
    {
      name: '5a. Abstract class, implements, parameter properties, get/set, override (Positive)',
      pos: true,
      runCheck: (ret) => ret === 'Hi Ada:30:1',
      src: [
        'interface Named { name: string; greet(): string; }',
        'abstract class Base {',
        '  abstract greet(): string;',
        '}',
        'class Person extends Base implements Named {',
        '  private _age: number = 0;',
        '  static count: number = 0;',
        '  constructor(public readonly name: string, protected tag: string = "u") {',
        '    super();',
        '    Person.count++;',
        '  }',
        '  get age(): number { return this._age; }',
        '  set age(v: number) { this._age = v; }',
        '  override greet(): string { return "Hi " + this.name; }',
        '}',
        'function runOop(): string {',
        '  const p = new Person("Ada");',
        '  p.age = 30;',
        '  return p.greet() + ":" + p.age + ":" + Person.count;',
        '}',
        'runOop();',
      ].join('\n'),
    },
    {
      name: '5b. Instantiating abstract class directly (Negative TS2511)',
      pos: false,
      src: 'abstract class A { abstract f(): void; }\nconst a = new A();',
    },
    {
      name: '5c. Class failing implements interface contract (Negative TS2420)',
      pos: false,
      src: 'interface Named { name: string; }\nclass Bad implements Named { id: number = 1; }',
    },
    // 6. Enums & Const Enums (Numeric & String)
    {
      name: '6a. Numeric enum and const string enum (Positive)',
      pos: true,
      runCheck: (ret) => ret === '0:RED',
      src: [
        'enum Dir { Up, Down = 2 }',
        'const enum Color { Red = "RED", Blue = "BLUE" }',
        'function runEnum(): string {',
        '  const d: Dir = Dir.Up;',
        '  const c: Color = Color.Red;',
        '  return d + ":" + c;',
        '}',
        'runEnum();',
      ].join('\n'),
    },
    {
      name: '6b. Assigning invalid string to string enum (Negative TS2322)',
      pos: false,
      src: 'enum E9 { A = "a" }\nconst e: E9 = "b";',
    },
    // 7. Functions: Overloads, Rest Parameters, Optional/Default & Generators
    {
      name: '7a. Function overloads, rest params, and function* generator (Positive)',
      pos: true,
      src: [
        'function pad(s: string, n?: number): string;',
        'function pad(s: string, n: number = 2, ...rest: number[]): string {',
        '  return s + String(n + (rest[0] ?? 0));',
        '}',
        'function* gen(): Generator<number, string, unknown> {',
        '  yield 1;',
        '  return "done";',
        '}',
        'pad("x", 3, 4);',
      ].join('\n'),
    },
    {
      name: '7b. Invalid rest parameter argument type (Negative TS2345)',
      pos: false,
      src: 'function sum(...ns: number[]): number { return 0; }\nsum(1, "bad");',
    },
    // 8. Generics: Constraints, Defaults, keyof & Lookup Types
    {
      name: '8a. Generic function with object constraint, default type param, and keyof lookup (Positive)',
      pos: true,
      src: [
        'function getProp<T extends object, K extends keyof T>(obj: T, key: K): T[K] {',
        '  return obj[key];',
        '}',
        'function first<T extends { id: number }, U = string>(arr: T[]): [T | undefined, number] {',
        '  return [arr[0], arr.length];',
        '}',
        'const v: number = getProp({ a: 42, b: "hi" }, "a");',
        'const [f, len] = first([{ id: 7 }]);',
      ].join('\n'),
    },
    {
      name: '8b. Invalid keyof argument (Negative TS2345)',
      pos: false,
      src: 'function getProp<T, K extends keyof T>(obj: T, key: K): T[K] { return obj[key]; }\ngetProp({ a: 1 }, "nonexistent");',
    },
    {
      name: '8c. Generic constraint violation (Negative TS2345)',
      pos: false,
      src: 'function f<T extends { id: number }>(x: T): number { return x.id; }\nf({ id: "not-num" });',
    },
    // 9. Type Operators & Advanced Type-Level Programming
    {
      name: '9a. Conditional types with infer, mapped types with as template remapping, template literal types, and recursive types (Positive)',
      pos: true,
      src: [
        'const cfg = { port: 8080, host: "localhost" };',
        'type Cfg = typeof cfg;',
        'type Unpack<T> = T extends Array<infer U> ? U : T;',
        'const a: Unpack<string[]> = "hello";',
        'type Getters<T> = {',
        '  readonly [K in keyof T as `get_${string & K}`]-?: () => T[K];',
        '};',
        'interface User { id?: number; }',
        'const ug: Getters<User> = { get_id: () => 1 };',
        'type EventName<T extends string> = `on${Capitalize<T>}`;',
        'const ev: EventName<"click"> = "onClick";',
        'type Json = string | number | boolean | null | Json[] | { [k: string]: Json };',
        'const j: Json = { a: [1, "two", true, null] };',
      ].join('\n'),
    },
    {
      name: '9b. Mismatched conditional infer result (Negative TS2322)',
      pos: false,
      src: 'type Unpack<T> = T extends Array<infer U> ? U : T;\nconst a: Unpack<number[]> = "wrong";',
    },
    {
      name: '9c. Mismatched template literal type (Negative TS2322)',
      pos: false,
      src: 'type EventName<T extends string> = `on${Capitalize<T>}`;\nconst ev: EventName<"click"> = "onclick";',
    },
    // 10. Built-in Utility Types
    {
      name: '10a. All built-in utility types (Partial, Required, Readonly, Pick, Omit, Record, Exclude, Extract, NonNullable, ReturnType, Parameters, Awaited) (Positive)',
      pos: true,
      src: [
        'interface Todo { id: number; title: string; done?: boolean; }',
        'const p: Partial<Todo> = {};',
        'const req: Required<Todo> = { id: 1, title: "a", done: false };',
        'const ro: Readonly<Todo> = { id: 1, title: "a" };',
        'const pk: Pick<Todo, "id"> = { id: 1 };',
        'const om: Omit<Todo, "title" | "done"> = { id: 1 };',
        'const rec: Record<"a" | "b", number> = { a: 1, b: 2 };',
        'const ex: Exclude<"a" | "b" | "c", "a"> = "b";',
        'const ext: Extract<"a" | "b", "a" | "z"> = "a";',
        'const nn: NonNullable<string | null | undefined> = "ok";',
        'function fn(a: number, b: string): boolean { return true; }',
        'const rt: ReturnType<typeof fn> = false;',
        'const pr: Parameters<typeof fn> = [1, "x"];',
        'const aw: Awaited<Promise<Promise<number>>> = 42;',
      ].join('\n'),
    },
    {
      name: '10b. Incomplete Required<T> (Negative)',
      pos: false,
      src: 'interface Todo { id: number; done?: boolean; }\nconst r: Required<Todo> = { id: 1 };',
    },
    // 11. Type Assertions, Non-Null (!), as const & satisfies
    {
      name: '11a. as T, <T>val, non-null !, as const, and satisfies (Positive)',
      pos: true,
      runCheck: (ret) => ret === 'hello:world:red:#00ff00:ok',
      src: [
        'function runAssert(): string {',
        '  const v1 = ("hello" as unknown) as string;',
        '  const v2 = <string>("world" as any);',
        '  const colors = ["red", "blue"] as const;',
        '  const palette = {',
        '    red: [255, 0, 0],',
        '    green: "#00ff00"',
        '  } satisfies Record<string, string | number[]>;',
        '  let maybe: string | null = "ok";',
        '  const sure: string = maybe!;',
        '  return [v1, v2, colors[0], palette.green, sure].join(":");',
        '}',
        'runAssert();',
      ].join('\n'),
    },
    {
      name: '11b. satisfies operator violation (Negative TS1360)',
      pos: false,
      src: 'const p = { a: 123 } satisfies Record<string, string>;',
    },
    // 12. Type Guards (x is T), Assertion Functions (asserts x is T) & Exhaustive Switch
    {
      name: '12a. Type predicate x is T, assertion function asserts x is T, and discriminated union narrowing (Positive)',
      pos: true,
      runCheck: (ret) => ret === '11:5',
      src: [
        'function isNum(x: unknown): x is number { return typeof x === "number"; }',
        'function assertStr(x: unknown): asserts x is string {',
        '  if (typeof x !== "string") throw new Error("not string");',
        '}',
        'function test(u: unknown): number {',
        '  if (isNum(u)) {',
        '    return u + 1;',
        '  }',
        '  assertStr(u);',
        '  return u.length;',
        '}',
        'function runGuard(): string {',
        '  return test(10) + ":" + test("hello");',
        '}',
        'runGuard();',
      ].join('\n'),
    },
    {
      name: '12b. Non-exhaustive switch default: never check (Negative TS2322)',
      pos: false,
      src: [
        'type Kind = "a" | "b";',
        'function f(k: Kind): number {',
        '  switch (k) {',
        '    case "a": return 1;',
        '    default:',
        '      const _ex: never = k;',
        '      return _ex;',
        '  }',
        '}',
      ].join('\n'),
    },
    // 13. Strict Null Checks & Unknown Checks
    {
      name: '13a. Unguarded property access on nullable value (Negative TS18047)',
      pos: false,
      src: 'interface Node2 { val: number; }\nlet cur: Node2 | null = null;\nconst x = cur.val;',
    },
    {
      name: '13b. Arithmetic on unknown value without narrowing (Negative TS18046)',
      pos: false,
      src: 'let u: unknown = 10;\nconst y = u + 1;',
    },
  ];

  for (const tc of tsMatrix) {
    const diags = typecheckTS(tc.src, true);
    if (tc.pos) {
      check(`TS Matrix [${tc.name}] typechecks with 0 errors`, diags.length === 0, JSON.stringify(diags));
      if (tc.runCheck) {
        setEditorVal(tc.src);
        const ok = startDebug(0);
        while (getDebugState().DEBUG_SESSION.active && !getDebugState().DEBUG_SESSION.finished) {
          stepNext();
        }
        const retVal = getDebugState().DEBUG_SESSION.returnValue;
        check(`TS Matrix [${tc.name}] transpiles and executes accurately`, ok && tc.runCheck(retVal), JSON.stringify({ ok, retVal }));
      }
    } else {
      check(`TS Matrix [${tc.name}] catches type error`, diags.length > 0, JSON.stringify(diags));
    }
  }

  const cmEntrySrc = fs.readFileSync(new URL('./editor/cm-entry.js', ROOT), 'utf8');
  check(
    'cm-entry.js wires context-aware TypeScript & Python IntelliSense completion source (tsAndPyCompletionSource)',
    cmEntrySrc.includes('function tsAndPyCompletionSource(') &&
      cmEntrySrc.includes('function computeCompletionsForDoc(') &&
      cmEntrySrc.includes('autocomplete: tsAndPyCompletionSource'),
  );

  // 8. UI Header Cleanup, Separated Sample Tabs vs Workspace VFS, Path Sandboxing, `fs` Module Import, VFS Delete Confirmation & Export Menu
  {
    check(
      'Figure 1 UI & Script Tab Bar: #checkerBadge is hidden while #scriptTabsList is shown on #sourcePaneTitle row in Notebook tab style',
      !/<div[^>]*id="scriptTabsList"[^>]*\bhidden\b/.test(html) &&
        /<span[^>]*id="checkerBadge"[^>]*\bhidden\b/.test(html) &&
        /#codeCol\s+\.pane-title\s+\.checker-badge\s*\{\s*display\s*:\s*none\s*!important/.test(css) &&
        sandbox.document.getElementById('scriptTabsList').innerHTML.includes('class="nb-tab'),
    );
    check(
      'Default VFS sidebar is collapsed (hidden) and toggle buttons are not active on boot in both Script and Notebook modes',
      /<aside class="vfs-sidebar" id="vfsSidebar"[^>]*\bhidden\b/.test(html) &&
        !html.includes('class="btn vfs-toggle-btn active" id="btnToggleVfs"') &&
        !html.includes('class="nb-tool-btn active" id="nbBtnToggleVfs"') &&
        Boolean(sandbox.document.getElementById('vfsSidebar').hidden),
    );
    check(
      'Notebook mode top bar: #nbBtnToggleVfs is placed inside .nb-top-bar directly above .nb-toolbar, leaving #nbKernelStatus at far right of .nb-toolbar',
      /<div class="nb-top-bar">[\s\S]*?id="nbTabsList"[\s\S]*?id="nbBtnToggleVfs"[\s\S]*?<\/div>\s*<\/div>\s*<div class="nb-toolbar"/.test(html),
    );
    check(
      'Figure 2 clean workspace VFS: starts as an empty directory with no data/, examples/, notebooks/, or workspace/ wrapper',
      Boolean(sandbox.__VFS__) &&
        Array.isArray(sandbox.__VFS__.listAll()) &&
        sandbox.__VFS__.listAll().length === 0 &&
        sandbox.document.getElementById('vfsTreeList').innerHTML.includes('空目录') &&
        !sandbox.document.getElementById('vfsTreeList').innerHTML.includes('examples') &&
        !sandbox.document.getElementById('vfsTreeList').innerHTML.includes('notebooks') &&
        !sandbox.document.getElementById('vfsTreeList').innerHTML.includes('workspace'),
      JSON.stringify(sandbox.__VFS__ && sandbox.__VFS__.listAll()),
    );

    // Verify separation between VFS files and built-in sample files
    const vfsNewFileBtn = sandbox.document.getElementById('vfsBtnNewFile');
    if (vfsNewFileBtn && typeof vfsNewFileBtn.onclick === 'function') {
      vfsNewFileBtn.onclick();
    }
    check(
      'Creating a VFS file adds file_1.ts to workspace VFS and opens it in #scriptTabsList',
      sandbox.__VFS__.exists('file_1.ts') &&
        sandbox.document.getElementById('scriptTabsList').innerHTML.includes('file_1.ts'),
    );

    // Now open a built-in sample file ('mergesort') while file_1.ts is in VFS
    sandbox.loadSample('mergesort');
    const tabsHtmlAfterSample = sandbox.document.getElementById('scriptTabsList').innerHTML;
    const vfsFilesAfterSample = sandbox.__VFS__.listAll();
    check(
      'Opening built-in sample mergesort.ts displays it in #scriptTabsList alongside file_1.ts without loading mergesort.ts into workspace VFS or overwriting file_1.ts',
      tabsHtmlAfterSample.includes('file_1.ts') &&
        tabsHtmlAfterSample.includes('mergesort.ts') &&
        vfsFilesAfterSample.includes('file_1.ts') &&
        !vfsFilesAfterSample.includes('mergesort.ts') &&
        !vfsFilesAfterSample.includes('showcase.ts'),
      JSON.stringify({ vfsFilesAfterSample, tabsHtmlAfterSample }),
    );

    // Verify VFS ❌ delete button on the right and inline confirmation prompt below the row
    const treeHtmlWithFile = sandbox.document.getElementById('vfsTreeList').innerHTML;
    check(
      'VFS file row renders red ❌ delete button (.vfs-del-btn) without .vfs-row-btn rounded-rect class',
      treeHtmlWithFile.includes('class="vfs-del-btn"') &&
        treeHtmlWithFile.includes('data-vfs-del="file_1.ts"') &&
        treeHtmlWithFile.includes('❌') &&
        !treeHtmlWithFile.includes('class="vfs-row-btn danger"'),
      treeHtmlWithFile,
    );

    // Simulate clicking ❌ on file_1.ts -> should show inline confirmation prompt below row without deleting immediately
    const vfsTreeEl = sandbox.document.getElementById('vfsTreeList');
    if (vfsTreeEl && typeof vfsTreeEl.fire === 'function') {
      const fakeDelTarget = {
        closest(sel) {
          if (sel === '[data-vfs-del]') {
            return { getAttribute: (attr) => (attr === 'data-vfs-del' ? 'file_1.ts' : null) };
          }
          return null;
        },
      };
      vfsTreeEl.fire('click', { target: fakeDelTarget, stopPropagation() {} });
    }
    const treeHtmlAfterDelClick = sandbox.document.getElementById('vfsTreeList').innerHTML;
    check(
      'Clicking ❌ on file_1.ts does not delete immediately and renders .vfs-del-confirm prompt below the row',
      sandbox.__VFS__.exists('file_1.ts') &&
        treeHtmlAfterDelClick.includes('class="vfs-del-confirm"') &&
        treeHtmlAfterDelClick.includes('确认删除 file_1.ts？') &&
        treeHtmlAfterDelClick.includes('data-vfs-confirm-del="file_1.ts"') &&
        treeHtmlAfterDelClick.includes('data-vfs-cancel-del="file_1.ts"'),
      treeHtmlAfterDelClick,
    );

    // Simulate clicking confirm delete -> removes file_1.ts from workspace VFS
    if (vfsTreeEl && typeof vfsTreeEl.fire === 'function') {
      const fakeConfirmTarget = {
        closest(sel) {
          if (sel === '[data-vfs-confirm-del]') {
            return { getAttribute: (attr) => (attr === 'data-vfs-confirm-del' ? 'file_1.ts' : null) };
          }
          return null;
        },
      };
      vfsTreeEl.fire('click', { target: fakeConfirmTarget, stopPropagation() {} });
    }
    check(
      'Clicking 确认 in .vfs-del-confirm deletes file_1.ts from workspace VFS',
      !sandbox.__VFS__.exists('file_1.ts') && sandbox.__VFS__.listAll().length === 0,
    );

    // Verify Export menu label ('📄 导出文件' without 'TypeScript') and Share Link ('暂未实现')
    check(
      'Export button #btnExportTs displays "📄 导出文件" without "TypeScript"',
      html.includes('<span>📄 导出文件</span>') && !html.includes('导出 TypeScript 文件'),
    );
    const shareBtn = sandbox.document.getElementById('btnShareLink');
    const shareMark = logChildren().length;
    if (shareBtn && typeof shareBtn.onclick === 'function') {
      shareBtn.onclick();
    }
    const shareLog = readLogSince(shareMark);
    check(
      'Clicking #btnShareLink ("复制分享链接") displays "暂未实现"',
      sandbox.document.getElementById('shareLinkTag').textContent === '暂未实现' &&
        shareLog.includes('暂未实现'),
      shareLog,
    );

    // Verify strict workspace path sandboxing and isolation of sample files
    const forbiddenPaths = [
      '../outside.txt',
      '../../etc/passwd',
      '/etc/passwd',
      'C:\\Windows\\win.ini',
      '~/secret.txt',
      'examples/ts/showcase.ts',
      '../examples/ts/mergesort.ts',
    ];
    for (const badPath of forbiddenPaths) {
      let threwEacces = false;
      try {
        sandbox.__VFS__.readFile(badPath);
      } catch (err) {
        threwEacces = /EACCES/.test(String(err && err.message ? err.message : err));
      }
      check(`Workspace sandbox blocks readFile("${badPath}") with EACCES`, threwEacces);

      let threwWriteEacces = false;
      try {
        sandbox.__VFS__.writeFile(badPath, 'hack');
      } catch (err) {
        threwWriteEacces = /EACCES/.test(String(err && err.message ? err.message : err));
      }
      check(`Workspace sandbox blocks writeFile("${badPath}") with EACCES`, threwWriteEacces);
    }

    // Verify code running in a sample file cannot read other built-in sample files (since they are not in workspace VFS)
    check(
      'Built-in sample files cannot be read from workspace VFS (readFile returns null / ENOENT)',
      sandbox.__VFS__.readFile('showcase.ts') === null &&
        sandbox.__VFS__.readFile('mergesort.ts') === null,
    );

    // Figure 3 exact program: `import { promises as fs } from 'fs';`
    const fig3Program = [
      "import { promises as fs } from 'fs';",
      '',
      'async function fileOperations() {',
      "  const filePath = 'data.json';",
      '',
      '  try {',
      '    // 1. 异步写入文件',
      '    await fs.writeFile(filePath, \'{"name": "Alice", "age": 25}\', \'utf-8\');',
      "    console.log('写入成功');",
      '',
      '    // 2. 异步读取文件',
      "    const content = await fs.readFile(filePath, 'utf-8');",
      "    console.log('读取内容:', content);",
      '',
      '    // 3. 顺便解析 JSON',
      '    const data = JSON.parse(content);',
      '    console.log(data.name); // Alice',
      '',
      '  } catch (err) {',
      "    console.error('文件操作失败:', err);",
      '  }',
      '}',
      '',
      'fileOperations();',
    ].join('\n');

    const fig3Diags = typecheckTS(fig3Program, true);
    check(
      'Figure 3 program passes static typecheckTS with 0 errors',
      fig3Diags.length === 0,
      JSON.stringify(fig3Diags),
    );

    setEditorVal(fig3Program);
    const fig3RunMark = logChildren().length;
    runOnce(800);
    const fig3RunLog = readLogSince(fig3RunMark);
    check(
      'Figure 3 program runs in ▶ 运行 mode, writes data.json to workspace VFS, and logs 写入成功, 读取内容, Alice',
      fig3RunLog.includes('写入成功') &&
        fig3RunLog.includes('读取内容: {"name": "Alice", "age": 25}') &&
        fig3RunLog.includes('Alice') &&
        sandbox.__VFS__.exists('data.json') &&
        sandbox.__VFS__.readFile('data.json') === '{"name": "Alice", "age": 25}',
      fig3RunLog,
    );

    // Also test Figure 3 program in 🐞 Debug step-by-step mode
    sandbox.__VFS__.unlink('data.json');
    const fig3DbgMark = logChildren().length;
    const fig3DbgOk = startDebug(0);
    while (getDebugState().DEBUG_SESSION.active && !getDebugState().DEBUG_SESSION.finished) {
      stepNext();
    }
    const fig3DbgLog = readLogSince(fig3DbgMark);
    check(
      'Figure 3 program steps through 🐞 Debug mode without catch(err) swallowing pause signals and writes data.json',
      fig3DbgOk &&
        !getDebugState().DEBUG_SESSION.crashed &&
        fig3DbgLog.includes('写入成功') &&
        fig3DbgLog.includes('读取内容: {"name": "Alice", "age": 25}') &&
        fig3DbgLog.includes('Alice') &&
        sandbox.__VFS__.exists('data.json'),
      fig3DbgLog,
    );
    sandbox.__VFS__.unlink('data.json');
  }

  // =========================================================================
  // Strict TypeScript Codebase Gate (Enforced on Every Update per REFACTOR_PLAN.md)
  // =========================================================================
  function collectTsSourceFiles(dirUrl) {
    const out = [];
    for (const ent of fs.readdirSync(dirUrl, { withFileTypes: true })) {
      const fullUrl = new URL(ent.name + (ent.isDirectory() ? '/' : ''), dirUrl);
      if (ent.isDirectory()) {
        out.push(...collectTsSourceFiles(fullUrl));
      } else if (ent.isFile() && ent.name.endsWith('.ts')) {
        out.push(fullUrl);
      }
    }
    return out;
  }

  const { execFileSync } = await import('node:child_process');

  function stripTsCommentsStringsAndRegexes(code) {
    let out = '';
    let i = 0;
    const n = code.length;
    let prevNonWs = '';
    while (i < n) {
      const c = code[i];
      const next = code[i + 1];
      if (c === '/' && next === '/') {
        out += '  ';
        i += 2;
        while (i < n && code[i] !== '\n') {
          out += ' ';
          i++;
        }
        continue;
      }
      if (c === '/' && next === '*') {
        out += '  ';
        i += 2;
        while (i < n && !(code[i] === '*' && code[i + 1] === '/')) {
          out += code[i] === '\n' ? '\n' : ' ';
          i++;
        }
        if (i < n) {
          out += '  ';
          i += 2;
        }
        continue;
      }
      if (c === "'" || c === '"' || c === '`') {
        const quote = c;
        out += quote;
        i++;
        let braceDepth = 0;
        while (i < n) {
          if (code[i] === '\\') {
            out += '  ';
            i += 2;
            continue;
          }
          if (quote === '`') {
            if (code[i] === '$' && code[i + 1] === '{') {
              braceDepth++;
              out += '  ';
              i += 2;
              continue;
            }
            if (braceDepth > 0) {
              if (code[i] === '{') braceDepth++;
              else if (code[i] === '}') braceDepth--;
              out += code[i] === '\n' ? '\n' : ' ';
              i++;
              continue;
            }
          }
          if (code[i] === quote) {
            out += quote;
            i++;
            break;
          }
          out += code[i] === '\n' ? '\n' : ' ';
          i++;
        }
        prevNonWs = quote;
        continue;
      }
      // Regex literal detection: `/` after an operator/punctuator/keyword start
      if (
        c === '/' &&
        next !== '/' &&
        next !== '*' &&
        next !== '=' &&
        (!prevNonWs || /[=([,!?:;&|{+\-\n<>~^%]/.test(prevNonWs))
      ) {
        out += ' ';
        i++;
        let inCharClass = false;
        while (i < n && code[i] !== '\n') {
          if (code[i] === '\\') {
            out += '  ';
            i += 2;
            continue;
          }
          if (code[i] === '[') inCharClass = true;
          else if (code[i] === ']') inCharClass = false;
          else if (code[i] === '/' && !inCharClass) {
            out += ' ';
            i++;
            while (i < n && /[dgimsuvy]/.test(code[i])) {
              out += ' ';
              i++;
            }
            break;
          }
          out += ' ';
          i++;
        }
        prevNonWs = '/';
        continue;
      }
      if (!/\s/.test(c)) prevNonWs = c;
      out += c;
      i++;
    }
    return out;
  }

  const tsFiles = collectTsSourceFiles(new URL('./src/', ROOT));
  check('Strict TS Gate: discovered all 17+ TypeScript modules in src/', tsFiles.length >= 17, `found ${tsFiles.length}`);

  const anyViolations = [];
  const bangViolations = [];
  const tsIgnoreViolations = [];

  for (const fileUrl of tsFiles) {
    const relPath = fileUrl.pathname.slice(ROOT.pathname.length);
    const raw = fs.readFileSync(fileUrl, 'utf8');
    if (/@ts-(?:ignore|expect-error|nocheck)/.test(raw)) {
      tsIgnoreViolations.push(relPath);
    }
    const stripped = stripTsCommentsStringsAndRegexes(raw);
    const lines = stripped.split('\n');
    lines.forEach((line, idx) => {
      if (/\bany\b/.test(line)) {
        anyViolations.push(`${relPath}:${idx + 1}: ${line.trim()}`);
      }
      if (/[\w$\])]!(?!=)/.test(line)) {
        bangViolations.push(`${relPath}:${idx + 1}: ${line.trim()}`);
      }
    });
  }

  check(
    'Strict TS Gate: zero `any` types across all src/**/*.ts modules',
    anyViolations.length === 0,
    anyViolations.slice(0, 10).join(' | '),
  );
  check(
    'Strict TS Gate: zero non-null assertions (`!`) across all src/**/*.ts modules',
    bangViolations.length === 0,
    bangViolations.slice(0, 10).join(' | '),
  );
  check(
    'Strict TS Gate: zero @ts-ignore / @ts-expect-error / @ts-nocheck directives in src/**/*.ts',
    tsIgnoreViolations.length === 0,
    tsIgnoreViolations.join(', '),
  );

  const tsconfigJson = JSON.parse(fs.readFileSync(new URL('./tsconfig.json', ROOT), 'utf8'));
  const co = tsconfigJson.compilerOptions || {};
  check(
    'Strict TS Gate: tsconfig.json enforces strict, noUncheckedIndexedAccess, noUnusedLocals, noUnusedParameters, noImplicitOverride, noFallthroughCasesInSwitch',
    co.strict === true &&
      co.noUncheckedIndexedAccess === true &&
      co.noUnusedLocals === true &&
      co.noUnusedParameters === true &&
      co.noImplicitOverride === true &&
      co.noFallthroughCasesInSwitch === true,
    JSON.stringify(co),
  );

  let tscPassed = false;
  let tscOutput = '';
  try {
    execFileSync(process.execPath, [new URL('./node_modules/typescript/bin/tsc', ROOT).pathname, '--noEmit'], {
      cwd: ROOT.pathname,
      encoding: 'utf8',
      stdio: 'pipe',
    });
    tscPassed = true;
  } catch (err) {
    tscOutput = String((err && err.stdout) || (err && err.stderr) || err);
  }
  check('Strict TS Gate: `tsc --noEmit` exits with 0 errors', tscPassed, tscOutput.slice(0, 500));
}

console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
