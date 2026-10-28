/**
 * Shared test harness, sandboxed browser VM loader, and AST/source utilities
 * for TypeScript Playground VISUAL test suites.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '..');
export const SRC_DIR = path.join(ROOT, 'src');

let passed = 0;
let failed = 0;

export function check(name, cond, detail = '') {
  if (cond) {
    passed++;
  } else {
    failed++;
    console.error(`FAIL  ${name}${detail ? ' :: ' + detail : ''}`);
  }
}

export function assertEq(name, actual, expected) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  check(name, a === b, `got ${a}, expected ${b}`);
}

export function getStats() {
  return { passed, failed };
}

export function walkTsFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkTsFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.ts')) out.push(full);
  }
  return out;
}

/**
 * Strip comments, string/template literals, and regex literals while preserving
 * line structure so static regex checks never false-positive on comments, strings, or regexes.
 */
export function stripCommentsAndStrings(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  let prevNonSpace = '';

  const canStartRegex = (ch) =>
    !ch || '=(,[!&|?:;{}~^+-*%<>'.includes(ch);

  function stripRange(start, end, wrapChar = '') {
    if (wrapChar) out += wrapChar;
    for (let k = start; k < end; k++) {
      if (src[k] === '\n') out += '\n';
    }
    if (wrapChar) out += wrapChar;
  }

  while (i < n) {
    const ch = src[i];
    const next = src[i + 1];

    // Single-line comment
    if (ch === '/' && next === '/') {
      while (i < n && src[i] !== '\n') i++;
      continue;
    }

    // Multi-line comment
    if (ch === '/' && next === '*') {
      const start = i;
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i = Math.min(n, i + 2);
      stripRange(start, i);
      continue;
    }

    // Regex literal
    if (ch === '/' && next !== '/' && next !== '*' && canStartRegex(prevNonSpace)) {
      const start = i;
      i++;
      let inClass = false;
      let validRegex = false;
      while (i < n) {
        if (src[i] === '\\') {
          i += 2;
          continue;
        }
        if (src[i] === '[') inClass = true;
        else if (src[i] === ']') inClass = false;
        else if (src[i] === '/' && !inClass) {
          validRegex = true;
          i++;
          while (i < n && /[dgimsuvy]/.test(src[i])) i++;
          break;
        } else if (src[i] === '\n') {
          break;
        }
        i++;
      }
      if (validRegex) {
        stripRange(start, i, '/');
        prevNonSpace = '/';
        continue;
      }
      i = start;
    }

    // Single or double quoted string
    if (ch === "'" || ch === '"') {
      const quote = ch;
      const start = i + 1;
      i++;
      while (i < n && src[i] !== quote) {
        if (src[i] === '\\') {
          i += 2;
          continue;
        }
        i++;
      }
      stripRange(start, i, quote);
      i++;
      prevNonSpace = quote;
      continue;
    }

    // Template literal (with nested ${...} support)
    if (ch === '`') {
      out += '`';
      i++;
      while (i < n && src[i] !== '`') {
        if (src[i] === '\\') {
          if (src[i + 1] === '\n') out += '\n';
          i += 2;
          continue;
        }
        if (src[i] === '$' && src[i + 1] === '{') {
          i += 2;
          let depth = 1;
          const exprStart = i;
          while (i < n && depth > 0) {
            if (src[i] === '\\') { i += 2; continue; }
            if (src[i] === "'" || src[i] === '"' || src[i] === '`') {
              const q = src[i++];
              while (i < n && src[i] !== q) {
                if (src[i] === '\\') i += 2;
                else i++;
              }
              i++;
              continue;
            }
            if (src[i] === '{') depth++;
            else if (src[i] === '}') depth--;
            if (depth > 0) i++;
          }
          out += '${' + stripCommentsAndStrings(src.slice(exprStart, i)) + '}';
          i++;
          continue;
        }
        if (src[i] === '\n') out += '\n';
        i++;
      }
      out += '`';
      i++;
      prevNonSpace = '`';
      continue;
    }

    out += ch;
    if (!/\s/.test(ch)) prevNonSpace = ch;
    i++;
  }
  return out;
}

export function makeEl(id = '') {
  const classes = new Set();
  const attrs = new Map();
  const listeners = new Map();
  let _text = '';
  let _html = '';
  const el = {
    id,
    tagName: 'DIV',
    value: '',
    get textContent() { return _text; },
    set textContent(v) { _text = String(v ?? ''); _html = _text; },
    get innerHTML() { return _html; },
    set innerHTML(v) {
      _html = String(v ?? '');
      _text = _html.replace(/<[^>]*>/g, '');
      if (!_html) this.children = [];
    },
    disabled: false,
    hidden: false,
    scrollTop: 0,
    scrollHeight: 0,
    clientHeight: 400,
    offsetWidth: 600,
    offsetHeight: 400,
    style: { setProperty() {}, removeProperty() {} },
    dataset: {},
    children: [],
    className: '',
    classList: {
      add: (...c) => c.forEach((x) => classes.add(x)),
      remove: (...c) => c.forEach((x) => classes.delete(x)),
      toggle: (c, force) => {
        const next = force === undefined ? !classes.has(c) : Boolean(force);
        if (next) classes.add(c); else classes.delete(c);
        return next;
      },
      contains: (c) => classes.has(c),
    },
    setAttribute: (k, v) => attrs.set(k, String(v)),
    getAttribute: (k) => (attrs.has(k) ? attrs.get(k) : null),
    removeAttribute: (k) => attrs.delete(k),
    addEventListener: (ev, fn) => {
      if (!listeners.has(ev)) listeners.set(ev, []);
      listeners.get(ev).push(fn);
    },
    removeEventListener: () => {},
    dispatchEvent: (ev) => {
      const fns = listeners.get(ev && ev.type) || [];
      fns.forEach((fn) => fn(ev));
      return true;
    },
    appendChild(child) {
      this.children.push(child);
      if (child && child.textContent) {
        _text += (_text ? '\n' : '') + child.textContent;
      }
      return child;
    },
    remove() {},
    focus() {},
    blur() {},
    select() {},
    click() {},
    closest: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    getBoundingClientRect: () => ({ left: 0, top: 0, right: 100, bottom: 20, width: 100, height: 20 }),
  };
  return el;
}

export async function createSandboxedApp() {
  const bundleOut = path.join(ROOT, 'js', 'app.bundle.js');
  await esbuild.build({
    entryPoints: [path.join(SRC_DIR, 'main.ts')],
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['es2021'],
    outfile: bundleOut,
    charset: 'utf8',
    logLevel: 'silent',
  });

  const bundleCode = fs.readFileSync(bundleOut, 'utf8');
  const elements = new Map();
  const getElement = (id) => {
    if (!elements.has(id)) elements.set(id, makeEl(id));
    return elements.get(id);
  };

  const domIds = [
    'editor', 'highlight', 'gutter', 'codeScroll', 'stepViz', 'log', 'vars',
    'pick', 'slots', 'console', 'cnt', 'prev', 'next', 'nextCheckpoint',
    'btnAddCheckpoint', 'auto', 'sampleSel', 'btnRun', 'btnTrace',
    'btnExportMenu', 'exportMenuWrap', 'exportMenuPop', 'btnExportTs',
    'fileExportTag', 'btnShareLink', 'shareLinkTag', 'videoSpeedGroup',
    'btnExportVideo', 'btnExportVideoLabel', 'videoSpeedBadge',
    'videoExportStatus', 'fileName', 'btnImport', 'importMenuWrap',
    'importMenuPop', 'btnUploadLocalFile', 'importSampleList',
    'importSampleLangTag', 'fileInput', 'resizer', 'codeCol', 'sidePanel',
    'flyLayer', 'hoverTip', 'checkerBadge', 'checkerModal', 'checkerModalClose',
    'ctlHint', 'callStackBar', 'callStackHint', 'modeSwitch', 'editorWrap',
    'notebookWrap', 'sourcePaneTitle', 'nbBtnAdd', 'nbBtnCut', 'nbBtnCopy',
    'nbBtnPaste', 'nbBtnRun', 'nbBtnStop', 'nbBtnRestart', 'nbBtnRunAll',
    'nbCellType', 'nbKernelStatus', 'nbCellsList', 'nbTabsList',
    'scriptTabsList', 'btnToggleVfs', 'nbBtnToggleVfs', 'vfsSidebar',
    'vfsBtnNewFile', 'vfsBtnNewFolder', 'vfsBtnUpload', 'vfsTreeList',
    'vfsFootStatus', 'btnOpenTsTutorials', 'tutorialModal',
    'tutorialModalClose', 'tutorialModalList', 'tutorialModalDetail',
  ];
  domIds.forEach(getElement);

  const documentStub = {
    body: makeEl('body'),
    documentElement: makeEl('html'),
    activeElement: null,
    getElementById: (id) => getElement(id),
    createElement: (tag) => {
      const el = makeEl();
      el.tagName = String(tag).toUpperCase();
      if (el.tagName === 'CANVAS') {
        el.getContext = () => ({
          scale() {}, save() {}, restore() {}, beginPath() {}, moveTo() {},
          lineTo() {}, arcTo() {}, closePath() {}, fill() {}, stroke() {},
          fillRect() {}, strokeRect() {}, clearRect() {}, clip() {},
          fillText() {}, arc() {}, setLineDash() {},
          measureText: (txt) => ({ width: String(txt || '').length * 8 }),
          createLinearGradient: () => ({ addColorStop() {} }),
        });
      }
      return el;
    },
    createElementNS: (_ns, tag) => {
      const el = makeEl();
      el.tagName = String(tag).toUpperCase();
      return el;
    },
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    removeEventListener: () => {},
  };

  const sandbox = {
    console,
    Math,
    Date,
    JSON,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    Error,
    TypeError,
    RangeError,
    SyntaxError,
    ReferenceError,
    Map,
    Set,
    WeakMap,
    WeakSet,
    Symbol,
    Promise,
    Proxy,
    Reflect,
    Int8Array,
    Uint8Array,
    Uint8ClampedArray,
    Int16Array,
    Uint16Array,
    Int32Array,
    Uint32Array,
    Float32Array,
    Float64Array,
    ArrayBuffer,
    DataView,
    TextEncoder,
    TextDecoder,
    URL,
    URLSearchParams,
    Blob: typeof Blob !== 'undefined' ? Blob : function Blob() {},
    performance: { now: () => Date.now() },
    requestAnimationFrame: (cb) => setTimeout(cb, 0),
    cancelAnimationFrame: (id) => clearTimeout(id),
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    queueMicrotask,
    structuredClone: typeof structuredClone === 'function'
      ? structuredClone
      : (v) => JSON.parse(JSON.stringify(v)),
    document: documentStub,
    location: { search: '', hash: '', href: 'http://localhost:3000/' },
    navigator: { clipboard: { writeText: async () => {} } },
    addEventListener: () => {},
    removeEventListener: () => {},
    HTMLElement: function HTMLElement() {},
    HTMLInputElement: function HTMLInputElement() {},
    HTMLTextAreaElement: function HTMLTextAreaElement() {},
    HTMLSelectElement: function HTMLSelectElement() {},
    HTMLButtonElement: function HTMLButtonElement() {},
    HTMLCanvasElement: function HTMLCanvasElement() {},
    Node: function Node() {},
    Event: function Event(type) { this.type = type; },
    __BOOT_DEFERRED: true,
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;

  vm.createContext(sandbox);
  vm.runInContext(bundleCode, sandbox, { filename: 'app.bundle.js' });

  return { sandbox, elements };
}

export function resetSandbox(sandbox) {
  if (typeof sandbox.stopAuto === 'function') sandbox.stopAuto();
  sandbox.LANG = 'ts';
  sandbox.VIEW_MODE = 'script';
  sandbox.LIVE_ERRORS = [];
  sandbox.ERROR_LINES = new Set();
  sandbox.ACTIVE_STRUCTS = new Map();
  sandbox.WATCH_PINNED = new Set();
  sandbox.PREV_LOCALS = null;
  sandbox.PREV_STRUCTS = new Map();
  sandbox.TRACE = { steps: [], ast: null, root: null, declared: new Set(), builtins: new Set(), src: '' };
  sandbox.cur = 0;
}
