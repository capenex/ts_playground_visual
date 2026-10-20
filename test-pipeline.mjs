import fs from 'fs';
import vm from 'vm';

const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

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
    '\n;globalThis.__exports = { stripTypes, typecheckTS, extractTsInterfaceMetadata, cloneDeepBounded, collectNames, instrument, resolveEntry, blankJsLine, classifyValue, enrichFromNote, deriveAnimAndNote, hl, hlActiveLine, buildStepVizRow, vizGrid, vizTree, vizGraph, vizUF, vizHeap, vizQueue, VIZ, SAMPLES, collectDeclaredNames, hoverInfoFor, hoverTipHtml, hoverWordAt, liveTypeDiags, revealErrorLine, formatHoverVal, startDebug, stepNext, stepPrev, runToNextCheckpoint, addCheckpointFunction, resetTraceState, runOnce, selectStackFrame, getActiveFrame, formatCallFrameLabel, setVideoExportSpeed, exportVideo, fixWebmDuration, VIDEO_WIDTH, VIDEO_HEIGHT, VIDEO_FPS, VIDEO_SPEED_OPTIONS, RUN_TIMEOUT_MS, setFileName, exportFileName, sanitizeFileName, loadImportedSource, getFileName: () => FILE_NAME, getDebugState: () => ({ TRACE, cur, SELECTED_FRAME_IDX, DEBUG_SESSION, VIDEO_EXPORT_SPEED, cnt: document.getElementById("cnt").textContent, callStackHtml: document.getElementById("callStackBar").innerHTML, varsHtml: document.getElementById("vars").innerHTML, highlightHtml: document.getElementById("highlight").innerHTML, gutterHtml: document.getElementById("gutter").innerHTML, stepVizHtml: document.getElementById("stepViz").innerHTML, stepVizTop: document.getElementById("stepViz").style.top, stepVizLeft: document.getElementById("stepViz").style.left, stepVizDisplay: document.getElementById("stepViz").style.display, editorVal: document.getElementById("editor").value }), setEditorVal: (v) => { document.getElementById("editor").value = v; } };',
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
check('syntax highlight CSS defined', /\.com\b/.test(html) && /\.str\b/.test(html) && /\.kw\b/.test(html));
check('draggable resizer defined', html.includes('id="resizer"') && html.includes('col-resize'));
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
check('export menu offers a TypeScript file (single-file html download removed)',
  /id="btnExportTs"[\s\S]{0,220}?导出 TypeScript 文件/.test(html) && !html.includes('下载单文件版') && !html.includes('btnDownloadHtml'));

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
setEditorVal('class C {\n  constructor(private n: number) {}\n}\n// 调用：new C(1).n\n');
let markG = logChildren().length;
check('constructor parameter properties are rejected with a human message',
  startDebug(0) === false && /暂不支持 构造器参数属性/.test(readLogSince(markG)), readLogSince(markG).slice(-140));

setEditorVal('@sealed\nclass D {}\n// 调用：1\n');
markG = logChildren().length;
check('decorators are reported as unsupported',
  startDebug(0) === false && /暂不支持 装饰器/.test(readLogSince(markG)), readLogSince(markG).slice(-120));

setEditorVal('abstract class A {\n  abstract f(): number;\n}\n// 调用：1\n');
markG = logChildren().length;
check('abstract classes are reported as unsupported',
  startDebug(0) === false && /暂不支持 abstract/.test(readLogSince(markG)), readLogSince(markG).slice(-120));

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
}

console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);





