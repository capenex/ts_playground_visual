"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // src/state.ts
  var state_exports = {};
  __export(state_exports, {
    AUTO_PLAY_MS: () => AUTO_PLAY_MS,
    MAX_EXEC_MS: () => MAX_EXEC_MS,
    MAX_STEPS: () => MAX_STEPS,
    PAUSE_SIGNAL: () => PAUSE_SIGNAL,
    RUN_TIMEOUT_MS: () => RUN_TIMEOUT_MS,
    VIDEO_FPS: () => VIDEO_FPS,
    VIDEO_HEIGHT: () => VIDEO_HEIGHT,
    VIDEO_SPEED_OPTIONS: () => VIDEO_SPEED_OPTIONS,
    VIDEO_WIDTH: () => VIDEO_WIDTH,
    appState: () => appState,
    bindStateGlobals: () => bindStateGlobals,
    esc: () => esc,
    notifyConsoleLog: () => notifyConsoleLog,
    registerUiHooks: () => registerUiHooks,
    subscribeConsoleLogs: () => subscribeConsoleLogs,
    uiHooks: () => uiHooks
  });
  var MAX_STEPS = 5e3;
  var MAX_EXEC_MS = 3500;
  var RUN_TIMEOUT_MS = 2e3;
  var AUTO_PLAY_MS = 900;
  var VIDEO_WIDTH = 1920;
  var VIDEO_HEIGHT = 1080;
  var VIDEO_FPS = 60;
  var VIDEO_SPEED_OPTIONS = [0.75, 1, 1.5, 2, 3];
  var PAUSE_SIGNAL = { __debugPause: true };
  function esc(t) {
    return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  var initialLayoutSpan = {};
  var appState = {
    VIEW_MODE: "script",
    ACTIVE_NB_CELL_ID: null,
    FILE_NAME: "playground.ts",
    LANG: "ts",
    LANG_BUFFERS: { ts: null, python: null },
    PY_DIAGS: [],
    CONSOLE_LOGS: [],
    VIDEO_EXPORT_SPEED: 1,
    IS_EXPORTING_VIDEO: false,
    TRACE: { title: "TypeScript Playground \xB7 Debug", code: [], steps: [] },
    cur: 0,
    timer: null,
    watched: /* @__PURE__ */ new Set(),
    layoutSpan: initialLayoutSpan,
    SELECTED_FRAME_IDX: null,
    SEEN_VARS_EVER: /* @__PURE__ */ new Set(),
    IS_STILL: false,
    URL_WATCH: null,
    STRICT_TS: true,
    TYPE_ERROR_LINES: /* @__PURE__ */ new Set(),
    RUNTIME_ERROR_LINES: /* @__PURE__ */ new Set(),
    lastEditorCursorLine: -1,
    ENTRY_CALL_LINE: 0,
    CURRENT_TS_META: {
      interfaces: /* @__PURE__ */ new Map(),
      varTypes: /* @__PURE__ */ new Map()
    },
    DEBUG_SESSION: {
      active: false,
      finished: false,
      crashed: false,
      error: null,
      errorLine: -1,
      returnValue: void 0,
      compiledFn: null,
      originalLines: [],
      callExpr: "undefined"
    }
  };
  var consoleListeners = /* @__PURE__ */ new Set();
  function subscribeConsoleLogs(listener) {
    consoleListeners.add(listener);
    return () => {
      consoleListeners.delete(listener);
    };
  }
  function notifyConsoleLog(action, entry) {
    consoleListeners.forEach((fn) => fn(action, entry));
  }
  function bindStateGlobals(target = globalThis) {
    for (const key of Object.keys(appState)) {
      const desc = Object.getOwnPropertyDescriptor(target, key);
      if (desc && !desc.configurable) continue;
      Object.defineProperty(target, key, {
        get: () => Reflect.get(appState, key),
        set: (v) => {
          Reflect.set(appState, key, v);
        },
        configurable: true,
        enumerable: true
      });
    }
    if (!Object.getOwnPropertyDescriptor(target, "steps")) {
      Object.defineProperty(target, "steps", {
        get: () => appState.TRACE?.steps || [],
        set: (v) => {
          if (appState.TRACE) appState.TRACE.steps = v;
        },
        configurable: true
      });
    }
    if (!Object.getOwnPropertyDescriptor(target, "idx")) {
      Object.defineProperty(target, "idx", {
        get: () => appState.cur,
        set: (v) => {
          appState.cur = Number(v) || 0;
        },
        configurable: true
      });
    }
    Object.assign(target, {
      MAX_STEPS,
      MAX_EXEC_MS,
      RUN_TIMEOUT_MS,
      AUTO_PLAY_MS,
      VIDEO_WIDTH,
      VIDEO_HEIGHT,
      VIDEO_FPS,
      VIDEO_SPEED_OPTIONS,
      PAUSE_SIGNAL,
      esc,
      appState
    });
  }
  var uiHooks = {
    stopAuto: () => {
    },
    clearFlyLayer: () => {
    },
    renderPicker: () => {
    },
    renderStatic: () => {
    },
    updateEditorChrome: () => {
    },
    revealErrorLine: () => {
    },
    loadSample: () => {
    },
    getActiveWorkspacePath: () => "",
    openVfsNotebookFile: () => {
    },
    openVfsScriptFile: () => {
    },
    onVfsFileDeleted: () => {
    },
    onVfsFileRenamed: () => {
    },
    setViewMode: () => {
    },
    importSampleIntoNotebook: () => {
    },
    appendConsoleLog: () => {
    },
    clearConsoleDom: () => {
    },
    getEditorSource: () => "",
    setEditorSource: () => {
    },
    renderNotebookUI: () => {
    },
    setCntStatus: () => {
    }
  };
  function registerUiHooks(hooks) {
    Object.assign(uiHooks, hooks);
  }
  bindStateGlobals();

  // src/ui/dom.ts
  var dom_exports = {};
  __export(dom_exports, {
    $: () => $,
    bindDomGlobals: () => bindDomGlobals,
    btnImportEl: () => btnImportEl,
    callStackBarEl: () => callStackBarEl,
    callStackHintEl: () => callStackHintEl,
    clearConsoleDom: () => clearConsoleDom,
    closestElement: () => closestElement,
    cntEl: () => cntEl,
    consoleEl: () => consoleEl,
    ctlHint: () => ctlHint,
    dom: () => dom,
    editor: () => editor,
    eventTargetElement: () => eventTargetElement,
    eventTargetNode: () => eventTargetNode,
    eventTargetTextArea: () => eventTargetTextArea,
    fileInputEl: () => fileInputEl,
    fileNameEl: () => fileNameEl,
    flyLayerEl: () => flyLayerEl,
    getEditorSource: () => getEditorSource,
    gutterEl: () => gutterEl,
    highlightEl: () => highlightEl,
    hoverTipEl: () => hoverTipEl,
    isDomElement: () => isDomElement,
    isDomNode: () => isDomNode,
    isTextAreaElement: () => isTextAreaElement,
    logEl: () => logEl,
    mainEl: () => mainEl,
    pickEl: () => pickEl,
    queryTextArea: () => queryTextArea,
    renderConsoleLogEntry: () => renderConsoleLogEntry,
    resizerEl: () => resizerEl,
    setCntStatus: () => setCntStatus,
    setEditorSource: () => setEditorSource,
    sidePanelEl: () => sidePanelEl,
    slotsEl: () => slotsEl,
    stepVizEl: () => stepVizEl,
    varsEl: () => varsEl
  });
  var $ = (id) => document.getElementById(id);
  function isDomElement(val) {
    if (!val || typeof val !== "object") return false;
    if (typeof HTMLElement !== "undefined" && val instanceof HTMLElement) return true;
    return "classList" in val || "dataset" in val || "tagName" in val || "closest" in val || "getAttribute" in val;
  }
  function isDomNode(val) {
    if (!val || typeof val !== "object") return false;
    if (typeof Node !== "undefined" && val instanceof Node) return true;
    return isDomElement(val) || "nodeType" in val;
  }
  function isTextAreaElement(val) {
    if (!isDomElement(val)) return false;
    if (typeof HTMLTextAreaElement !== "undefined" && val instanceof HTMLTextAreaElement) return true;
    return "value" in val;
  }
  function eventTargetElement(e) {
    const t = e ? e.target : null;
    return isDomElement(t) ? t : null;
  }
  function eventTargetNode(e) {
    const t = e ? e.target : null;
    return isDomNode(t) ? t : null;
  }
  function eventTargetTextArea(e) {
    const t = e ? e.target : null;
    return isTextAreaElement(t) ? t : null;
  }
  function closestElement(source, selector) {
    const el = isDomElement(source) ? source : source && typeof source === "object" && "target" in source && isDomElement(source.target) ? source.target : null;
    if (!el || typeof el.closest !== "function") return null;
    const matched = el.closest(selector);
    return isDomElement(matched) ? matched : null;
  }
  function queryTextArea(root, selector) {
    if (!root || typeof root.querySelector !== "function") return null;
    const found = root.querySelector(selector);
    return isTextAreaElement(found) ? found : null;
  }
  var editor = $("editor");
  var logEl = $("log");
  var gutterEl = $("gutter");
  var highlightEl = $("highlight");
  var varsEl = $("vars");
  var pickEl = $("pick");
  var callStackBarEl = $("callStackBar");
  var callStackHintEl = $("callStackHint");
  var slotsEl = $("slots");
  var consoleEl = $("console");
  var cntEl = $("cnt");
  var ctlHint = $("ctlHint");
  var mainEl = $("main");
  var sidePanelEl = $("sidePanel");
  var resizerEl = $("resizer");
  var flyLayerEl = $("flyLayer");
  var hoverTipEl = $("hoverTip");
  var stepVizEl = $("stepViz");
  var fileNameEl = $("fileName");
  var fileInputEl = $("fileInput");
  var btnImportEl = $("btnImport");
  var dom = {
    $,
    editor,
    logEl,
    gutterEl,
    highlightEl,
    varsEl,
    pickEl,
    callStackBarEl,
    callStackHintEl,
    slotsEl,
    consoleEl,
    cntEl,
    ctlHint,
    mainEl,
    sidePanelEl,
    resizerEl,
    flyLayerEl,
    hoverTipEl,
    stepVizEl,
    fileNameEl,
    fileInputEl,
    btnImportEl
  };
  function renderConsoleLogEntry(entry) {
    if (!logEl || typeof document === "undefined" || !document.createElement) return;
    const d = document.createElement("div");
    if (entry.cls) d.className = entry.cls;
    if (entry.line) {
      d.className = (entry.cls ? entry.cls + " " : "") + "diag";
      if (d.setAttribute) {
        d.setAttribute("data-line", String(entry.line));
        d.setAttribute("title", "\u70B9\u51FB\u5B9A\u4F4D\u5230\u7B2C " + entry.line + " \u884C");
      }
    }
    d.textContent = entry.msg;
    logEl.appendChild(d);
    logEl.scrollTop = logEl.scrollHeight;
  }
  function clearConsoleDom() {
    if (!logEl) return;
    logEl.innerHTML = "";
  }
  function getEditorSource() {
    return editor ? editor.value : "";
  }
  function setEditorSource(src) {
    if (editor) {
      editor.value = src;
    }
  }
  if (logEl && logEl.addEventListener) {
    logEl.addEventListener("click", (e) => {
      const target = closestElement(e, ".diag");
      if (!target || !target.getAttribute) return;
      uiHooks.revealErrorLine(parseInt(target.getAttribute("data-line") || "0", 10), true);
    });
  }
  function setCntStatus(text, cls = "") {
    if (cntEl) {
      cntEl.textContent = text;
      cntEl.className = cls;
    }
  }
  function bindDomGlobals(target = globalThis) {
    Object.assign(target, dom);
  }
  registerUiHooks({
    appendConsoleLog: renderConsoleLogEntry,
    clearConsoleDom,
    getEditorSource,
    setEditorSource,
    setCntStatus
  });
  bindDomGlobals();

  // src/samples/ts-samples.ts
  var ts_samples_exports = {};
  __export(ts_samples_exports, {
    EXPECTED_LINES: () => EXPECTED_LINES,
    SAMPLES: () => SAMPLES,
    SAMPLE_DEFAULT_STEP: () => SAMPLE_DEFAULT_STEP
  });
  var SAMPLES = {
    showcase: `function visualShowcase(nums: number[], target: number): number {
  const tree = {
    val: 8,
    left: { val: 4, left: { val: 2, left: null, right: null }, right: { val: 6, left: null, right: null } },
    right: { val: 12, left: { val: 10, left: null, right: null }, right: { val: 14, left: null, right: null } }
  };
  const graph = {
    nodes: [{ id: 0, label: "S" }, { id: 1, label: "A" }, { id: 2, label: "B" }, { id: 3, label: "T" }],
    edges: [[0, 1], [0, 2], [1, 2], [1, 3], [2, 3]]
  };
  const map = new Map<number, number>();
  const stack: number[] = [];
  let l = 0, sum = 0, best = 0;
  for (let r = 0; r < nums.length; r++) {
    const x = nums[r];
    sum = sum + x;
    const count = (map.get(x) || 0) + 1;
    map.set(x, count);
    while (stack.length > 0 && nums[stack[stack.length - 1]] < x) {
      stack.pop();
    }
    stack.push(r);
    if (r - l + 1 > 3) {
      sum = sum - nums[l];
      l = l + 1;
    }
    if (sum >= target) {
      best = Math.max(best, sum);
      checkpoint("\u7A97\u53E3\u8FBE\u6807", r, sum, best);
    }
  }
  return best + tree.val + graph.nodes.length;
}

visualShowcase([3, 6, 2, 8, 5, 4, 7], 12)
`,
    mergesort: `const nums: number[] = [8, 3, 5, 1, 9, 2, 7, 4];

function mergeSort(l: number, r: number): number[] {
  if (l >= r) {
    return nums;
  }
  const mid: number = (l + r) >> 1;
  mergeSort(l, mid);
  mergeSort(mid + 1, r);
  const tmp: number[] = [];
  let i: number = l;
  let j: number = mid + 1;
  while (i <= mid && j <= r) {
    if (nums[i] <= nums[j]) {
      tmp.push(nums[i]);
      i = i + 1;
    } else {
      tmp.push(nums[j]);
      j = j + 1;
    }
  }
  while (i <= mid) {
    tmp.push(nums[i]);
    i = i + 1;
  }
  while (j <= r) {
    tmp.push(nums[j]);
    j = j + 1;
  }
  for (let k = 0; k < tmp.length; k++) {
    nums[l + k] = tmp[k];
  }
  return nums;
}

mergeSort(0, 7)
`,
    debug_crash: `function debugCrashDemo(nums: number[], limit: number): number {
  let acc = 0;
  const history: number[] = [];
  for (let i = 0; i < nums.length; i++) {
    const x = nums[i];
    acc = acc + x;
    history.push(acc);
    checkpoint("\u68C0\u67E5\u7D2F\u52A0\u503C", i, x, acc);
    if (acc > limit) {
      throw new Error("\u8FD0\u884C\u65F6\u5F02\u5E38: \u7D2F\u52A0\u503C acc(" + acc + ") \u8D85\u8FC7\u5B89\u5168\u9608\u503C " + limit);
    }
  }
  return acc;
}

debugCrashDemo([4, 7, 5, 9, 3], 18)
`,
    lcs: `function lcs(a: string, b: string): number {
  const n: number = a.length;
  const m: number = b.length;
  const dp: number[][] = [];
  for (let i = 0; i <= n; i++) {
    dp.push(Array(m + 1).fill(0));
  }
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  return dp[n][m];
}

lcs("ABCBDAB", "BDCABA")
`,
    analyze: `function analyze(nums: number[], target: number): number[] {
  const map = new Map<number, number>();
  const stack: number[] = [];
  const seen = new Set<number>();
  let sum = 0, hits = 0;
  for (let i = 0; i < nums.length; i++) {
    const x = nums[i];
    const c = map.get(x) || 0;
    map.set(x, c + 1);
    while (stack.length > 0 && nums[stack[stack.length - 1]] < x) {
      stack.pop();
    }
    stack.push(i);
    if (seen.has(x) === false) {
      seen.add(x);
      sum = sum + x;
    }
    if (x === target) {
      hits = hits + 1;
    }
  }
  return [sum, hits];
}

analyze([3,1,4,1,5,9,2,6], 4)
`,
    window: `function minSubArrayLen(target: number, nums: number[]): number {
  let l = 0;
  let sum = 0;
  let best = 999;
  for (let r = 0; r < nums.length; r++) {
    sum = sum + nums[r];
    while (sum >= target) {
      const len = r - l + 1;
      if (len < best) {
        best = len;
      }
      sum = sum - nums[l];
      l = l + 1;
    }
  }
  return best === 999 ? 0 : best;
}

minSubArrayLen(7, [2,3,1,2,4,3])
`,
    structures: `function tourStructures(): number {
  const heap: number[] = [1, 3, 2, 7, 6, 4, 5];
  const queue: number[] = [10, 20, 30];
  const parent: number[] = [0, 0, 1, 3, 3];
  const list = { val: 1, next: { val: 2, next: { val: 3, next: null } } };
  const tree = {
    val: 4,
    left: { val: 2, left: { val: 1, left: null, right: null }, right: { val: 3, left: null, right: null } },
    right: { val: 6, left: { val: 5, left: null, right: null }, right: { val: 7, left: null, right: null } }
  };
  const graph = {
    nodes: [{ id: 0, label: "A" }, { id: 1, label: "B" }, { id: 2, label: "C" }, { id: 3, label: "D" }],
    edges: [[0, 1], [1, 2], [2, 3], [0, 2]]
  };
  queue.push(40);
  parent[3] = 0;
  return heap[0] + queue.length;
}

tourStructures()
`,
    counter: `function counter(n: number): number {
  let acc = 0;
  const log: number[] = [];
  for (let i = 1; i <= n; i++) {
    acc = acc + i;
    log.push(acc);
    if (acc > 10) {
      acc = acc - 1;
    }
  }
  return acc;
}

counter(8)
`,
    classes: `class Counter {
  total: number = 0;
  history: number[] = [];

  add(n: number): number {
    this.total = this.total + n;
    this.history.push(this.total);
    return this.total;
  }
}

function runCounter(start: number, times: number): number {
  const c = new Counter();
  for (let i = 0; i < times; i++) {
    c.add(start + i);
  }
  return c.total;
}

runCounter(1, 3)
`,
    async_loop: `function sleep<T>(ms: number, value: T): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(value);
    }, ms);
  });
}

async function fetchScore(userId: number, delayMs: number): Promise<number> {
  const base: number = await sleep(delayMs, userId * 10);
  return base + 5;
}

async function runAsyncDemo(): Promise<string> {
  const timeline: string[] = ["1:sync-start"];

  setTimeout(() => {
    timeline.push("5:timeout-10ms");
  }, 10);

  Promise.resolve("micro").then((tag: string) => {
    timeline.push("3:promise-then-" + tag);
  });

  queueMicrotask(() => {
    timeline.push("4:queueMicrotask");
  });

  timeline.push("2:before-await");
  const score: number = await fetchScore(3, 20);
  timeline.push("6:after-await-" + score);
  checkpoint(timeline, score);
  return timeline.join(" -> ");
}

runAsyncDemo()
`
  };
  var SAMPLE_DEFAULT_STEP = {
    showcase: 35,
    mergesort: 8,
    debug_crash: 0,
    lcs: 24,
    analyze: 18,
    window: 12,
    structures: 7,
    counter: 8,
    classes: 8,
    async_loop: 10
  };
  var EXPECTED_LINES = Object.fromEntries(
    Object.entries(SAMPLES).map(([k, v]) => [k, v.trim().split("\n")])
  );

  // src/samples/py-samples.ts
  var py_samples_exports = {};
  __export(py_samples_exports, {
    getPyEngine: () => getPyEngine,
    getPySamples: () => getPySamples
  });
  function getPyEngine() {
    return typeof PY_ENGINE !== "undefined" ? PY_ENGINE : null;
  }
  function getPySamples() {
    const eng = getPyEngine();
    return eng && eng.PY_SAMPLES ? eng.PY_SAMPLES : {};
  }

  // src/compiler/comments.ts
  var comments_exports = {};
  __export(comments_exports, {
    RESERVED_WORDS: () => RESERVED_WORDS,
    blankStrings: () => blankStrings,
    findBalancedParen: () => findBalancedParen,
    isIdentPart: () => isIdentPart,
    isIdentStart: () => isIdentStart,
    isWS: () => isWS,
    newlinesOf: () => newlinesOf,
    readIdent: () => readIdent,
    regexAllowedBefore: () => regexAllowedBefore,
    skipRegex: () => skipRegex,
    skipString: () => skipString,
    skipTemplateExpr: () => skipTemplateExpr,
    splitStatements: () => splitStatements,
    splitTopLevel: () => splitTopLevel,
    splitTopLevelSemicolons: () => splitTopLevelSemicolons,
    stripComments: () => stripComments,
    stripCommentsOnly: () => stripCommentsOnly,
    stripInlineCommentSafe: () => stripInlineCommentSafe
  });
  var RESERVED_WORDS = /* @__PURE__ */ new Set([
    "function",
    "const",
    "let",
    "var",
    "for",
    "while",
    "do",
    "if",
    "else",
    "switch",
    "case",
    "default",
    "break",
    "continue",
    "return",
    "try",
    "catch",
    "finally",
    "throw",
    "new",
    "delete",
    "typeof",
    "instanceof",
    "void",
    "in",
    "of",
    "class",
    "extends",
    "super",
    "this",
    "import",
    "export",
    "from",
    "as",
    "async",
    "await",
    "yield",
    "true",
    "false",
    "null",
    "undefined"
  ]);
  function skipString(src, i) {
    const q = src[i];
    i++;
    const n = src.length;
    while (i < n) {
      if (src[i] === "\\") {
        i += 2;
        continue;
      }
      if (src[i] === q) return i + 1;
      if (q === "`" && src[i] === "$" && src[i + 1] === "{") {
        i = skipTemplateExpr(src, i + 2);
        continue;
      }
      i++;
    }
    return n;
  }
  function skipTemplateExpr(src, i) {
    const n = src.length;
    let depth = 1;
    while (i < n && depth > 0) {
      if (src[i] === "{") depth++;
      else if (src[i] === "}") {
        depth--;
        if (depth === 0) return i + 1;
      } else if (src[i] === '"' || src[i] === "'" || src[i] === "`") {
        i = skipString(src, i);
        continue;
      }
      i++;
    }
    return n;
  }
  function newlinesOf(s) {
    const m = s.match(/\n/g);
    return m ? m.map(() => "\n").join("") : "";
  }
  function isIdentStart(c) {
    return Boolean(c && /[A-Za-z_$]/.test(c));
  }
  function isIdentPart(c) {
    return Boolean(c && /[\w$]/.test(c));
  }
  function isWS(c) {
    return c === " " || c === "	" || c === "\n" || c === "\r";
  }
  function readIdent(src, i) {
    const n = src.length;
    if (i >= n || !isIdentStart(src[i])) return null;
    let j = i;
    while (j < n && isIdentPart(src[j])) j++;
    return { name: src.slice(i, j), end: j };
  }
  function skipRegex(src, i) {
    const n = src.length;
    if (src[i] !== "/") return -1;
    let j = i + 1;
    let inClass = false;
    while (j < n) {
      const ch = src[j];
      if (ch === "\\") {
        j += 2;
        continue;
      }
      if (ch === "\n") return -1;
      if (ch === "[") inClass = true;
      else if (ch === "]") inClass = false;
      else if (ch === "/" && !inClass) {
        j++;
        break;
      }
      j++;
    }
    while (j < n && /[gimsuy]/.test(src[j] || "")) j++;
    return j;
  }
  function regexAllowedBefore(src, i) {
    let k = i - 1;
    while (k >= 0 && isWS(src[k])) k--;
    if (k < 0) return true;
    const c = src[k] || "";
    if (/[(=,:;!?&|{}[\]]/.test(c)) return true;
    if (isIdentPart(c)) {
      let w = k;
      while (w >= 0 && isIdentPart(src[w])) w--;
      const word = src.slice(w + 1, k + 1);
      return /^(return|typeof|instanceof|in|of|new|delete|void|case|do|else|yield|await)$/.test(word);
    }
    return false;
  }
  function stripCommentsOnly(s) {
    let out = "", i = 0;
    while (i < s.length) {
      const c = s[i];
      if (c === '"' || c === "'" || c === "`") {
        const end = skipString(s, i);
        out += s.slice(i, end);
        i = end;
        continue;
      }
      if (c === "/" && s[i + 1] === "/") {
        while (i < s.length && s[i] !== "\n") i++;
        continue;
      }
      if (c === "/" && s[i + 1] === "*") {
        const end = s.indexOf("*/", i + 2);
        i = end === -1 ? s.length : end + 2;
        continue;
      }
      out += c;
      i++;
    }
    return out;
  }
  var stripComments = stripCommentsOnly;
  function stripInlineCommentSafe(line) {
    if (!line) return "";
    let out = "";
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' || ch === "'" || ch === "`") {
        const end = skipString(line, i);
        out += line.slice(i, end);
        i = end - 1;
        continue;
      }
      if (ch === "/" && line[i + 1] === "/") {
        break;
      }
      if (ch === "/" && line[i + 1] === "*") {
        const closeIdx = line.indexOf("*/", i + 2);
        if (closeIdx >= 0) {
          i = closeIdx + 1;
          continue;
        } else {
          break;
        }
      }
      out += ch;
    }
    return out;
  }
  function blankStrings(js) {
    let out = "";
    let i = 0;
    const n = js.length;
    while (i < n) {
      const c = js[i];
      if (c === '"' || c === "'" || c === "`") {
        const end = skipString(js, i);
        out += '""' + newlinesOf(js.slice(i, end));
        i = end;
        continue;
      }
      if (c === "/" && js[i + 1] === "/") {
        let j = i + 2;
        while (j < n && js[j] !== "\n") j++;
        out += " ".repeat(j - i);
        i = j;
        continue;
      }
      if (c === "/" && js[i + 1] === "*") {
        let j = i + 2;
        while (j < n && !(js[j] === "*" && js[j + 1] === "/")) j++;
        j = Math.min(n, j + 2);
        out += js.slice(i, j).replace(/[^\n]/g, " ");
        i = j;
        continue;
      }
      out += c;
      i++;
    }
    return out;
  }
  function splitTopLevel(s) {
    const parts = [];
    let depth = 0, cur = "";
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === '"' || ch === "'" || ch === "`") {
        const end = skipString(s, i);
        cur += s.slice(i, end);
        i = end - 1;
        continue;
      }
      if (ch === "(" || ch === "[" || ch === "{") depth++;
      else if (ch === ")" || ch === "]" || ch === "}") depth--;
      if (ch === "," && depth === 0) {
        parts.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    if (cur) parts.push(cur);
    return parts;
  }
  function splitTopLevelSemicolons(s) {
    const parts = [];
    let depth = 0, cur = "";
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === '"' || ch === "'" || ch === "`") {
        const end = skipString(s, i);
        cur += s.slice(i, end);
        i = end - 1;
        continue;
      }
      if (ch === "(" || ch === "[" || ch === "{") depth++;
      else if (ch === ")" || ch === "]" || ch === "}") depth--;
      if (ch === ";" && depth === 0) {
        parts.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    parts.push(cur);
    return parts;
  }
  var splitStatements = splitTopLevelSemicolons;
  function findBalancedParen(s, openIdx) {
    let depth = 0;
    for (let i = openIdx; i < s.length; i++) {
      const ch = s[i];
      if (ch === '"' || ch === "'" || ch === "`") {
        i = skipString(s, i) - 1;
        continue;
      }
      if (ch === "/" && s[i + 1] === "/") break;
      if (ch === "(" || ch === "[" || ch === "{") depth++;
      else if (ch === ")" || ch === "]" || ch === "}") {
        depth--;
        if (depth === 0) return i;
      }
    }
    return -1;
  }

  // src/compiler/transpile.ts
  var transpile_exports = {};
  __export(transpile_exports, {
    NON_TYPED_KEYWORDS: () => NON_TYPED_KEYWORDS,
    buildEnumIIFE: () => buildEnumIIFE,
    detectUnsupportedSyntax: () => detectUnsupportedSyntax,
    extractConstructorParamProps: () => extractConstructorParamProps,
    findSyntaxErrors: () => findSyntaxErrors,
    looksLikeTypeText: () => looksLikeTypeText,
    stripTypes: () => stripTypes,
    transpileEnums: () => transpileEnums,
    transpileFsImportStatement: () => transpileFsImportStatement,
    transpileNamespaces: () => transpileNamespaces,
    transpileTS: () => transpileTS,
    tryParseType: () => tryParseType,
    tryParseTypeAtom: () => tryParseTypeAtom,
    tryParseTypeSuffix: () => tryParseTypeSuffix,
    tryStripAngleTypeAssertion: () => tryStripAngleTypeAssertion,
    tryStripGenericArrow: () => tryStripGenericArrow
  });

  // src/compiler/transpile-helpers.ts
  function looksLikeTypeText(text) {
    const t = text.trim();
    if (!t) return false;
    if (/^\{/.test(t)) {
      if (/\b(return|const|let|var|if|for|while|switch|break|continue|throw|try|catch|finally)\b/.test(t)) return false;
      if (new RegExp("(?<![=!<>:])=(?![=>])").test(t)) return false;
      return true;
    }
    if (/^(number|string|boolean|void|any|unknown|never|object|symbol|bigint|undefined|null|true|false)\b/.test(t)) return true;
    if (/^(typeof|keyof|infer|asserts|readonly|unique)\b/.test(t)) return true;
    if (/^(?:asserts\s+)?(?:[A-Za-z_$][\w$]*|this)\s+is\b/.test(t)) return true;
    if (/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/.test(t)) return true;
    if (/[<>\[\]|&]/.test(t)) return true;
    if (/\bextends\b/.test(t)) return true;
    if (/^[([]/.test(t)) return true;
    if (/^["'`]/.test(t)) return true;
    if (/^-?\d/.test(t)) return true;
    return false;
  }
  function tryParseType(src, i) {
    const n = src.length;
    let j = i;
    while (j < n && isWS(src[j])) j++;
    const atom = tryParseTypeAtom(src, j);
    if (atom < 0) return -1;
    j = atom;
    for (; ; ) {
      let k = j;
      while (k < n && (src[k] === " " || src[k] === "	")) k++;
      if (src[k] === "|" || src[k] === "&") {
        const next = tryParseTypeAtom(src, k + 1);
        if (next < 0) return j;
        j = next;
        continue;
      }
      if (src.startsWith("extends", k) && !isIdentPart(src[k + 7] || "")) {
        const extEnd = tryParseType(src, k + 7);
        if (extEnd > k + 7) {
          let q = extEnd;
          while (q < n && isWS(src[q])) q++;
          if (src[q] === "?") {
            const trueEnd = tryParseType(src, q + 1);
            if (trueEnd > q + 1) {
              let c = trueEnd;
              while (c < n && isWS(src[c])) c++;
              if (src[c] === ":") {
                const falseEnd = tryParseType(src, c + 1);
                if (falseEnd > c + 1) {
                  j = falseEnd;
                  continue;
                }
              }
            }
          }
        }
      }
      return j;
    }
  }
  function tryParseTypeAtom(src, i) {
    const n = src.length;
    let j = i;
    while (j < n && isWS(src[j])) j++;
    const rest = src.slice(j, j + 80);
    if (/^readonly\b/.test(rest) && !isIdentPart(src[j + 8] || "")) {
      return tryParseTypeAtom(src, j + 8);
    }
    if (/^unique\s+symbol\b/.test(rest)) {
      const m = /^unique\s+symbol\b/.exec(rest);
      return m ? tryParseTypeSuffix(src, j + m[0].length) : -1;
    }
    if (/^asserts\b/.test(rest) && !isIdentPart(src[j + 7] || "")) {
      let k2 = j + 7;
      while (k2 < n && isWS(src[k2])) k2++;
      const targetId = readIdent(src, k2);
      if (!targetId) return -1;
      let m = targetId.end;
      while (m < n && (src[m] === " " || src[m] === "	")) m++;
      if (src.startsWith("is", m) && !isIdentPart(src[m + 2] || "")) {
        const predEnd = tryParseType(src, m + 2);
        if (predEnd > m + 2) return predEnd;
      }
      return targetId.end;
    }
    if (/^(typeof|keyof)\b/.test(rest)) {
      const kw = rest.startsWith("typeof") ? 6 : 5;
      let k2 = j + kw;
      while (k2 < n && isWS(src[k2])) k2++;
      const targetEnd = tryParseTypeAtom(src, k2);
      if (targetEnd < 0) return -1;
      return tryParseTypeSuffix(src, targetEnd);
    }
    if (/^infer\b/.test(rest) && !isIdentPart(src[j + 5] || "")) {
      let k2 = j + 5;
      while (k2 < n && isWS(src[k2])) k2++;
      const id2 = readIdent(src, k2);
      if (!id2) return -1;
      let endPos = id2.end;
      let m = endPos;
      while (m < n && (src[m] === " " || src[m] === "	")) m++;
      if (src.startsWith("extends", m) && !isIdentPart(src[m + 7] || "")) {
        const cEnd = tryParseTypeAtom(src, m + 7);
        if (cEnd > m + 7) endPos = cEnd;
      }
      return tryParseTypeSuffix(src, endPos);
    }
    if (src[j] === '"' || src[j] === "'" || src[j] === "`") {
      const strEnd = skipString(src, j);
      return tryParseTypeSuffix(src, strEnd);
    }
    const numLit = /^-?\d+(?:\.\d+)?\b/.exec(rest);
    if (numLit) {
      return tryParseTypeSuffix(src, j + numLit[0].length);
    }
    if (src[j] === "(") {
      let depth = 0;
      while (j < n) {
        if (src[j] === "(") depth++;
        else if (src[j] === ")") {
          depth--;
          if (depth === 0) {
            j++;
            break;
          }
        } else if (src[j] === '"' || src[j] === "'" || src[j] === "`") {
          j = skipString(src, j);
          continue;
        }
        j++;
      }
      while (j < n && isWS(src[j])) j++;
      if (src[j] === "=" && src[j + 1] === ">") {
        j += 2;
        return tryParseType(src, j);
      }
      return tryParseTypeSuffix(src, j);
    }
    if (src[j] === "{") {
      let depth = 0;
      while (j < n) {
        if (src[j] === "{") depth++;
        else if (src[j] === "}") {
          depth--;
          if (depth === 0) {
            j++;
            break;
          }
        } else if (src[j] === '"' || src[j] === "'" || src[j] === "`") {
          j = skipString(src, j);
          continue;
        }
        j++;
      }
      return tryParseTypeSuffix(src, j);
    }
    if (src[j] === "[") {
      let depth = 0;
      while (j < n) {
        if (src[j] === "[") depth++;
        else if (src[j] === "]") {
          depth--;
          if (depth === 0) {
            j++;
            break;
          }
        } else if (src[j] === '"' || src[j] === "'" || src[j] === "`") {
          j = skipString(src, j);
          continue;
        }
        j++;
      }
      return tryParseTypeSuffix(src, j);
    }
    const prim = /^(number|string|boolean|void|any|unknown|never|object|symbol|bigint|undefined|null|true|false)\b/.exec(rest);
    if (prim) {
      j += prim[0].length;
      return tryParseTypeSuffix(src, j);
    }
    const id = readIdent(src, j);
    if (!id) return -1;
    j = id.end;
    {
      let m = j;
      while (m < n && (src[m] === " " || src[m] === "	")) m++;
      if (src.startsWith("is", m) && !isIdentPart(src[m + 2] || "")) {
        const predEnd = tryParseType(src, m + 2);
        if (predEnd > m + 2) return predEnd;
      }
    }
    while (j < n && src[j] === ".") {
      const nextId = readIdent(src, j + 1);
      if (!nextId) break;
      j = nextId.end;
    }
    let k = j;
    while (k < n && (src[k] === " " || src[k] === "	")) k++;
    if (src[k] === "<") {
      let depth = 0;
      let braceDepth = 0;
      while (k < n) {
        const ch = src[k];
        if ((ch === "\n" || ch === "\r" || ch === ";") && braceDepth === 0) break;
        if (ch === '"' || ch === "'" || ch === "`") {
          k = skipString(src, k);
          continue;
        }
        if (ch === "{") braceDepth++;
        else if (ch === "}") {
          if (braceDepth > 0) braceDepth--;
          else break;
        } else if (ch === "<") depth++;
        else if (ch === ">" && src[k - 1] !== "=") {
          depth--;
          if (depth === 0) {
            k++;
            break;
          }
        }
        k++;
      }
      if (depth === 0) j = k;
    }
    return tryParseTypeSuffix(src, j);
  }
  function tryParseTypeSuffix(src, i) {
    let j = i;
    const n = src.length;
    for (; ; ) {
      let k = j;
      while (k < n && (src[k] === " " || src[k] === "	")) k++;
      if (src[k] === "[") {
        if (src[k + 1] === "]") {
          j = k + 2;
          continue;
        }
        let depth = 1;
        let m = k + 1;
        while (m < n && depth > 0) {
          const ch = src[m];
          if (ch === "\n" || ch === ";") break;
          if (ch === '"' || ch === "'" || ch === "`") {
            m = skipString(src, m);
            continue;
          }
          if (ch === "[") depth++;
          else if (ch === "]") depth--;
          m++;
        }
        if (depth === 0) {
          j = m;
          continue;
        }
      }
      return j;
    }
  }
  function tryStripGenericArrow(src, i) {
    const n = src.length;
    let j = i + 1, depth = 1;
    while (j < n && depth > 0) {
      const ch = src[j];
      if (ch === '"' || ch === "'" || ch === "`") {
        j = skipString(src, j);
        continue;
      }
      if (ch === "\n" || ch === ";") return -1;
      if (ch === "<") depth++;
      else if (ch === ">" && src[j - 1] !== "=") depth--;
      j++;
    }
    if (depth !== 0) return -1;
    let k = j;
    while (k < n && isWS(src[k])) k++;
    if (src[k] !== "(") return -1;
    let pd = 1, m = k + 1;
    while (m < n && pd > 0) {
      const ch = src[m];
      if (ch === '"' || ch === "'" || ch === "`") {
        m = skipString(src, m);
        continue;
      }
      if (ch === "(") pd++;
      else if (ch === ")") pd--;
      m++;
    }
    if (pd !== 0) return -1;
    let p = m;
    while (p < n && isWS(src[p])) p++;
    if (src[p] === ":") {
      const typeEnd = tryParseType(src, p + 1);
      if (typeEnd > p + 1) p = typeEnd;
    }
    while (p < n && isWS(src[p])) p++;
    if (src[p] === "=" && src[p + 1] === ">") return j;
    return -1;
  }
  function tryStripAngleTypeAssertion(src, i, prevSigIdx) {
    const n = src.length;
    if (prevSigIdx >= 0) {
      const prev = src[prevSigIdx] || "";
      if (isIdentPart(prev)) {
        let w = prevSigIdx;
        while (w >= 0 && isIdentPart(src[w])) w--;
        const word = src.slice(w + 1, prevSigIdx + 1);
        if (!/^(return|yield|await|throw|case|typeof|void|delete|in|of|instanceof|new)$/.test(word)) {
          return -1;
        }
      } else if (!/[=([,:;?!+\-*/%&|^~{<>]/.test(prev)) {
        return -1;
      }
    }
    let j = i + 1;
    let depth = 1;
    while (j < n && depth > 0) {
      const ch = src[j];
      if (ch === '"' || ch === "'" || ch === "`") {
        j = skipString(src, j);
        continue;
      }
      if (ch === "\n" || ch === "\r" || ch === ";") return -1;
      if (ch === "<") depth++;
      else if (ch === ">" && src[j - 1] !== "=") depth--;
      j++;
    }
    if (depth !== 0) return -1;
    const inner = src.slice(i + 1, j - 1).trim();
    if (!inner || !looksLikeTypeText(inner)) return -1;
    const parsedEnd = tryParseType(inner, 0);
    if (parsedEnd < inner.length) {
      let rem = parsedEnd;
      while (rem < inner.length && isWS(inner[rem])) rem++;
      if (rem < inner.length) return -1;
    }
    let k = j;
    while (k < n && (src[k] === " " || src[k] === "	")) k++;
    const nextCh = src[k] || "";
    if (isIdentStart(nextCh) || nextCh >= "0" && nextCh <= "9" || nextCh === "(" || nextCh === "[" || nextCh === "{" || nextCh === '"' || nextCh === "'" || nextCh === "`" || nextCh === "!" || nextCh === "+" || nextCh === "-" || nextCh === "~") {
      return j;
    }
    return -1;
  }
  function buildEnumIIFE(name, body, line) {
    const parts = splitTopLevel(stripCommentsOnly(body));
    const stmts = [];
    const known = /* @__PURE__ */ Object.create(null);
    let next = 0;
    for (const rawPart of parts) {
      const part = rawPart.trim();
      if (!part) continue;
      const m = part.match(/^([A-Za-z_$][\w$]*)\s*(?:=\s*([\s\S]+))?$/);
      if (!m || !m[1]) {
        return { error: { line, message: "enum \u6210\u5458\u6682\u4E0D\u652F\u6301\u8FD9\u79CD\u5199\u6CD5\uFF1A" + part.slice(0, 40) } };
      }
      const key = m[1];
      const init = m[2] === void 0 ? null : m[2].trim();
      if (init === null) {
        stmts.push(name + "[" + JSON.stringify(key) + "] = " + next + "; " + name + "[" + next + "] = " + JSON.stringify(key) + ";");
        known[key] = next;
        next++;
        continue;
      }
      if (/^["']/.test(init)) {
        let val = void 0;
        try {
          val = new Function("return (" + init + ");")();
        } catch (_) {
          val = void 0;
        }
        if (typeof val !== "string") {
          return { error: { line, message: 'enum \u6210\u5458 "' + key + '" \u7684\u503C\u65E0\u6CD5\u9759\u6001\u6C42\u503C' } };
        }
        stmts.push(name + "[" + JSON.stringify(key) + "] = " + JSON.stringify(val) + ";");
        known[key] = val;
        continue;
      }
      let value;
      try {
        const argNames = Object.keys(known);
        value = new Function(...argNames, "return (" + init + ");")(...argNames.map((k) => known[k]));
      } catch (_) {
        value = void 0;
      }
      if (typeof value !== "number" || !isFinite(value)) {
        return { error: { line, message: 'enum \u6210\u5458 "' + key + '" \u7684\u503C\u65E0\u6CD5\u9759\u6001\u6C42\u503C\uFF08\u6682\u4E0D\u652F\u6301\u5F15\u7528\u5176\u4ED6\u6210\u5458\u6216\u590D\u6742\u8868\u8FBE\u5F0F\uFF09' } };
      }
      stmts.push(name + "[" + name + "[" + JSON.stringify(key) + "] = " + value + "] = " + JSON.stringify(key) + ";");
      known[key] = value;
      next = value + 1;
    }
    return {
      code: "var " + name + "; (function (" + name + ") { " + stmts.join(" ") + " })( " + name + " || (" + name + " = {}) );",
      error: null
    };
  }
  function transpileEnums(src) {
    let out = "";
    let i = 0;
    const n = src.length;
    while (i < n) {
      const c = src[i];
      if (c === '"' || c === "'" || c === "`") {
        const end = skipString(src, i);
        out += src.slice(i, end);
        i = end;
        continue;
      }
      if (c === "/" && src[i + 1] === "/") {
        let j = i;
        while (j < n && src[j] !== "\n") j++;
        out += src.slice(i, j);
        i = j;
        continue;
      }
      if (c === "/" && src[i + 1] === "*") {
        const e = src.indexOf("*/", i + 2);
        const end = e === -1 ? n : e + 2;
        out += src.slice(i, end);
        i = end;
        continue;
      }
      if (isIdentStart(c)) {
        const id = readIdent(src, i);
        if (!id) {
          i++;
          continue;
        }
        const isConstEnum = id.name === "const" && /^\s*enum\b/.test(src.slice(i + 5));
        if (id.name === "enum" || isConstEnum) {
          const start = i;
          let j = isConstEnum ? i + 5 : i;
          while (j < n && isWS(src[j])) j++;
          if (src.slice(j, j + 4) === "enum" && !isIdentPart(src[j + 4] || "")) {
            j += 4;
            while (j < n && isWS(src[j])) j++;
            const nameId = readIdent(src, j);
            if (nameId) {
              j = nameId.end;
              while (j < n && isWS(src[j])) j++;
              if (nameId.name && src[j] === "{") {
                let depth = 1, k = j + 1;
                while (k < n && depth > 0) {
                  const ch = src[k];
                  if (ch === '"' || ch === "'" || ch === "`") {
                    k = skipString(src, k);
                    continue;
                  }
                  if (ch === "/" && src[k + 1] === "/") {
                    while (k < n && src[k] !== "\n") k++;
                    continue;
                  }
                  if (ch === "/" && src[k + 1] === "*") {
                    const e = src.indexOf("*/", k + 2);
                    k = e === -1 ? n : e + 2;
                    continue;
                  }
                  if (ch === "{") depth++;
                  else if (ch === "}") depth--;
                  k++;
                }
                if (depth === 0) {
                  const line = src.slice(0, start).split("\n").length;
                  const built = buildEnumIIFE(nameId.name, src.slice(j + 1, k - 1), line);
                  if (built.error) return { code: src, error: built.error };
                  out += built.code;
                  out += "\n".repeat((src.slice(start, k).match(/\n/g) || []).length);
                  i = k;
                  continue;
                }
              }
            }
          }
        }
        out += src.slice(i, id.end);
        i = id.end;
        continue;
      }
      out += c;
      i++;
    }
    return { code: out, error: null };
  }
  function transpileNamespaces(src) {
    if (!/\b(?:namespace|module)\s+[A-Za-z_$]/.test(src)) return src;
    const lines = src.split("\n");
    const nsStack = [];
    let braceDepth = 0;
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i] ?? "";
      const trimmed = stripCommentsOnly(raw).trim();
      const depthBefore = braceDepth;
      const nsOpen = trimmed.match(/^(?:export\s+)?(?:namespace|module)\s+([A-Za-z_$][\w$]*)\s*\{(.*)$/);
      if (nsOpen && nsOpen[1] && !/^declare\b/.test(trimmed)) {
        const nsName = nsOpen[1];
        const indentMatch = raw.match(/^\s*/);
        const indent = indentMatch ? indentMatch[0] : "";
        const openBraceIdx = raw.indexOf("{");
        const afterBrace = openBraceIdx >= 0 ? raw.slice(openBraceIdx + 1) : "";
        let d = 1;
        for (let k = 0; k < afterBrace.length; k++) {
          const ch = afterBrace[k];
          if (ch === '"' || ch === "'" || ch === "`") {
            k = skipString(afterBrace, k) - 1;
            continue;
          }
          if (ch === "{") d++;
          else if (ch === "}") d--;
        }
        if (d <= 0 && afterBrace.includes("}")) {
          const lastClose = afterBrace.lastIndexOf("}");
          const innerBody = afterBrace.slice(0, lastClose);
          const transformedInner = rewriteNamespaceExportsOnLine(innerBody, nsName);
          lines[i] = `${indent}var ${nsName} = ${nsName} || {}; {${transformedInner}}`;
          continue;
        }
        const hoistedFns = [];
        let scanD = d;
        for (let sIdx = i + 1; sIdx < lines.length && scanD > 0; sIdx++) {
          const sLine = stripCommentsOnly(lines[sIdx] ?? "");
          if (scanD === 1) {
            const fm = sLine.match(/^\s*export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*(?:<|\()/);
            if (fm && fm[1]) hoistedFns.push(fm[1]);
          }
          for (let k = 0; k < sLine.length; k++) {
            const ch = sLine[k];
            if (ch === '"' || ch === "'" || ch === "`") {
              k = skipString(sLine, k) - 1;
              continue;
            }
            if (ch === "{") scanD++;
            else if (ch === "}") scanD--;
          }
        }
        const hoistAssigns = hoistedFns.map((fn) => ` ${nsName}.${fn} = ${fn};`).join("");
        nsStack.push({ name: nsName, startDepth: depthBefore });
        braceDepth += d;
        lines[i] = `${indent}var ${nsName} = ${nsName} || {}; {${hoistAssigns}${rewriteNamespaceExportsOnLine(afterBrace, nsName)}`;
        continue;
      }
      let closedNs = null;
      for (let k = 0; k < raw.length; k++) {
        const ch = raw[k];
        if (ch === '"' || ch === "'" || ch === "`") {
          k = skipString(raw, k) - 1;
          continue;
        }
        if (ch === "/" && raw[k + 1] === "/") break;
        if (ch === "{") braceDepth++;
        else if (ch === "}") {
          braceDepth = Math.max(0, braceDepth - 1);
          const topEntry = nsStack[nsStack.length - 1];
          if (topEntry && braceDepth <= topEntry.startDepth) {
            nsStack.pop();
            closedNs = { ns: topEntry, closeIdx: k };
            break;
          }
        }
      }
      if (closedNs) {
        const nsName = closedNs.ns.name;
        const beforeClose = raw.slice(0, closedNs.closeIdx);
        const afterClose = raw.slice(closedNs.closeIdx + 1);
        lines[i] = `${rewriteNamespaceExportsOnLine(beforeClose, nsName)}}${afterClose}`;
        continue;
      }
      const topNs = nsStack[nsStack.length - 1];
      if (topNs) {
        if (depthBefore === topNs.startDepth + 1) {
          lines[i] = rewriteNamespaceExportsOnLine(raw, topNs.name);
        }
      }
    }
    return lines.join("\n");
  }
  function rewriteNamespaceExportsOnLine(line, nsName) {
    const fnExp = line.match(/^(\s*)export\s+(async\s+)?function\s+([A-Za-z_$][\w$]*)([\s\S]*)$/);
    if (fnExp) {
      return `${fnExp[1]}${fnExp[2] || ""}function ${fnExp[3]}${fnExp[4]}`;
    }
    const clsExp = line.match(/^(\s*)export\s+(abstract\s+)?class\s+([A-Za-z_$][\w$]*)([\s\S]*)$/);
    if (clsExp) {
      return `${clsExp[1]}const ${clsExp[3]} = ${nsName}.${clsExp[3]} = class ${clsExp[3]}${clsExp[4]}`;
    }
    const varExp = line.match(/^(\s*)export\s+(const|let|var)\s+([A-Za-z_$][\w$]*)(\s*:\s*[^=]+)?\s*=\s*([\s\S]+)$/);
    if (varExp) {
      return `${varExp[1]}${varExp[2]} ${varExp[3]}${varExp[4] || ""} = ${nsName}.${varExp[3]} = ${varExp[5]}`;
    }
    return line;
  }
  function extractConstructorParamProps(paramSlice) {
    const parts = splitTopLevel(stripCommentsOnly(paramSlice));
    const props = [];
    for (const rawP of parts) {
      const p = rawP.trim();
      const m = p.match(/^(?:(?:public|private|protected|readonly|override)\s+)+([A-Za-z_$][\w$]*)/);
      if (m && m[1]) props.push(m[1]);
    }
    return props;
  }
  var NON_TYPED_KEYWORDS = /* @__PURE__ */ new Set([
    "default",
    "case",
    "return",
    "throw",
    "else",
    "do",
    "try",
    "finally",
    "yield",
    "await",
    "typeof",
    "void",
    "delete",
    "new",
    "in",
    "of",
    "instanceof"
  ]);
  function transpileFsImportStatement(rawStmt) {
    const flat = stripCommentsOnly(rawStmt).replace(/\s+/g, " ").trim().replace(/;$/, "").trim();
    if (/^import\s+type\b/.test(flat)) return null;
    const fromMatch = flat.match(/^import\s+([\s\S]+?)\s+from\s+(['"])([^'"]+)\2\s*$/);
    if (!fromMatch) return null;
    const clause = (fromMatch[1] || "").trim();
    const modSpec = (fromMatch[3] || "").trim();
    const isFsRoot = modSpec === "fs" || modSpec === "node:fs";
    const isFsPromises = modSpec === "fs/promises" || modSpec === "node:fs/promises";
    if (!isFsRoot && !isFsPromises) return null;
    const baseExpr = isFsPromises ? '(((typeof __t === "function" && __t.__env && __t.__env.fs) || globalThis.__FS_SHIM__).promises)' : '((typeof __t === "function" && __t.__env && __t.__env.fs) || globalThis.__FS_SHIM__)';
    const convertNamedBraces = (bracePart) => {
      const inner = bracePart.replace(/^\{|\}$/g, "").trim();
      if (!inner) return "{}";
      const specs = inner.split(",").map((s) => s.trim()).filter((s) => Boolean(s) && !/^type\s+/.test(s)).map((s) => s.replace(/^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/, "$1: $2"));
      return `{ ${specs.join(", ")} }`;
    };
    const nsMatch = clause.match(/^\*\s+as\s+([A-Za-z_$][\w$]*)$/);
    if (nsMatch && nsMatch[1]) {
      return `/*__import__*/ var ${nsMatch[1]} = ${baseExpr};`;
    }
    if (clause.startsWith("{") && clause.endsWith("}")) {
      return `/*__import__*/ var ${convertNamedBraces(clause)} = ${baseExpr};`;
    }
    const defAndNamed = clause.match(/^([A-Za-z_$][\w$]*)\s*,\s*(\{[\s\S]+\})$/);
    if (defAndNamed && defAndNamed[1] && defAndNamed[2]) {
      return `/*__import__*/ var ${defAndNamed[1]} = ${baseExpr}, ${convertNamedBraces(defAndNamed[2])} = ${defAndNamed[1]};`;
    }
    const defMatch = clause.match(/^([A-Za-z_$][\w$]*)$/);
    if (defMatch && defMatch[1]) {
      return `/*__import__*/ var ${defMatch[1]} = ${baseExpr};`;
    }
    return null;
  }

  // src/compiler/transpile.ts
  function emitTemplate(src, i) {
    const n = src.length;
    const parts = ["`"];
    i++;
    while (i < n) {
      if (src[i] === "\\") {
        parts.push(src.slice(i, i + 2));
        i += 2;
        continue;
      }
      if (src[i] === "`") {
        parts.push("`");
        return { next: i + 1, text: parts.join("") };
      }
      if (src[i] === "$" && src[i + 1] === "{") {
        parts.push("${");
        i += 2;
        const start = i;
        let depth = 1;
        while (i < n && depth > 0) {
          const ch = src[i];
          if (ch === "{") depth++;
          else if (ch === "}") depth--;
          else if (ch === '"' || ch === "'" || ch === "`") {
            i = skipString(src, i);
            continue;
          }
          i++;
        }
        const end = Math.max(start, i - 1);
        parts.push(stripTypes(src.slice(start, end)));
        parts.push("}");
        i = end + 1;
        continue;
      }
      parts.push(src[i] || "");
      i++;
    }
    return { next: n, text: parts.join("") };
  }
  function classifyOpenBraceKind(src, k, braceStack) {
    let kind = "block";
    if (k < 0) return kind;
    const prev = src[k];
    if (prev === ":") {
      const lineStart = src.lastIndexOf("\n", k) + 1;
      const linePrefix = src.slice(lineStart, k + 1).trim();
      const inObject = braceStack.length > 0 && braceStack[braceStack.length - 1] === "object";
      if (!inObject && /^(?:default|case\b[\s\S]*):$/.test(linePrefix)) {
        kind = "block";
      } else {
        kind = "object";
      }
    } else if (prev === "=" || prev === "(" || prev === "," || prev === "[" || prev === "!" || prev === "&" || prev === "|" || prev === "?") {
      kind = "object";
    } else if (prev === ">" && k >= 1 && src[k - 1] === "=") {
      kind = "block";
    } else if (prev === ")") {
      kind = "block";
    } else if (isIdentPart(prev)) {
      let w = k;
      while (w >= 0 && isIdentPart(src[w])) w--;
      const prevWord = src.slice(w + 1, k + 1);
      if (prevWord === "return" || prevWord === "case" || prevWord === "yield" || prevWord === "typeof" || prevWord === "const" || prevWord === "let" || prevWord === "var") {
        kind = "object";
      } else {
        kind = "block";
      }
    }
    return kind;
  }
  var _STRIP_TYPES_CACHE = { src: null, out: "" };
  function stripTypes(rawSrc) {
    if (typeof rawSrc === "string" && _STRIP_TYPES_CACHE.src === rawSrc) {
      return _STRIP_TYPES_CACHE.out;
    }
    const src = typeof rawSrc === "string" ? transpileNamespaces(rawSrc) : rawSrc;
    let out = "";
    let i = 0;
    const n = src.length;
    const ternaryStack = [];
    let parenDepth = 0;
    const braceStack = [];
    let pendingCtorProps = null;
    let pendingAfterSuperAssigns = null;
    let superCallTargetDepth = -1;
    function lookBackSignificant(from) {
      let k = from - 1;
      while (k >= 0 && isWS(src[k])) k--;
      return k;
    }
    function isTernaryColonNow() {
      const top = ternaryStack[ternaryStack.length - 1];
      if (!top) return false;
      return top.paren === parenDepth && top.brace === braceStack.length;
    }
    function popTernariesAtOrAbove(pDepth, bDepth) {
      while (ternaryStack.length > 0) {
        const top = ternaryStack[ternaryStack.length - 1];
        if (top && (top.brace > bDepth || top.brace === bDepth && top.paren >= pDepth)) {
          ternaryStack.pop();
        } else {
          break;
        }
      }
    }
    while (i < n) {
      const c = src[i];
      if (c === "`") {
        const tpl = emitTemplate(src, i);
        out += tpl.text;
        i = tpl.next;
        continue;
      }
      if (c === '"' || c === "'") {
        const s = i;
        i = skipString(src, i);
        out += src.slice(s, i);
        continue;
      }
      if (c === "/") {
        if (src[i + 1] === "/") {
          while (i < n && src[i] !== "\n") i++;
          continue;
        }
        if (src[i + 1] === "*") {
          const s = i;
          i = src.indexOf("*/", i + 2);
          i = i === -1 ? n : i + 2;
          out += newlinesOf(src.slice(s, i));
          continue;
        }
        if (regexAllowedBefore(src, i)) {
          const end = skipRegex(src, i);
          if (end > 0) {
            out += src.slice(i, end);
            i = end;
            continue;
          }
        }
      }
      if (c === "@") {
        let j = i + 1;
        while (j < n && (isIdentPart(src[j]) || src[j] === ".")) j++;
        if (j > i + 1) {
          while (j < n && (src[j] === " " || src[j] === "	")) j++;
          if (src[j] === "<") {
            let ad = 1;
            j++;
            while (j < n && ad > 0) {
              if (src[j] === '"' || src[j] === "'" || src[j] === "`") {
                j = skipString(src, j);
                continue;
              }
              if (src[j] === "<") ad++;
              else if (src[j] === ">" && src[j - 1] !== "=") ad--;
              j++;
            }
          }
          if (src[j] === "(") {
            let pd = 1;
            j++;
            while (j < n && pd > 0) {
              if (src[j] === '"' || src[j] === "'" || src[j] === "`") {
                j = skipString(src, j);
                continue;
              }
              if (src[j] === "(") pd++;
              else if (src[j] === ")") pd--;
              j++;
            }
          }
          while (j < n && (src[j] === " " || src[j] === "	")) j++;
          out += newlinesOf(src.slice(i, j));
          i = j;
          continue;
        }
      }
      if (c === "<") {
        const genericEnd = tryStripGenericArrow(src, i);
        if (genericEnd > i) {
          out += newlinesOf(src.slice(i, genericEnd));
          i = genericEnd;
          continue;
        }
        const assertEnd = tryStripAngleTypeAssertion(src, i, lookBackSignificant(i));
        if (assertEnd > i) {
          out += newlinesOf(src.slice(i, assertEnd));
          i = assertEnd;
          continue;
        }
      }
      if (c === "(" || c === "[") {
        parenDepth++;
        out += c;
        i++;
        continue;
      }
      if (c === ")" || c === "]") {
        popTernariesAtOrAbove(parenDepth, braceStack.length);
        parenDepth = Math.max(0, parenDepth - 1);
        out += c;
        i++;
        while (i < n && src[i] === "!" && src[i + 1] !== "=") i++;
        if (c === ")" && superCallTargetDepth >= 0 && parenDepth === superCallTargetDepth && pendingAfterSuperAssigns) {
          if (src[i] === ";") {
            out += ";" + pendingAfterSuperAssigns;
            i++;
          } else {
            out += ";" + pendingAfterSuperAssigns;
          }
          pendingAfterSuperAssigns = null;
          superCallTargetDepth = -1;
        }
        continue;
      }
      if (isIdentStart(c)) {
        const id = readIdent(src, i);
        if (!id) {
          out += c;
          i++;
          continue;
        }
        const word = id.name;
        const wordStart = i;
        i = id.end;
        if (word === "super" && pendingAfterSuperAssigns) {
          let js = i;
          while (js < n && isWS(src[js])) js++;
          if (src[js] === "(") {
            superCallTargetDepth = parenDepth;
          }
        }
        if (word === "import") {
          let j2 = i;
          while (j2 < n && isWS(src[j2])) j2++;
          if (src[j2] === "(") {
            out += word;
            continue;
          }
          let depth = 0;
          while (j2 < n) {
            const ch = src[j2];
            if (ch === '"' || ch === "'" || ch === "`") {
              j2 = skipString(src, j2);
              continue;
            }
            if (ch === "{" || ch === "(" || ch === "[") depth++;
            else if (ch === "}" || ch === ")" || ch === "]") depth--;
            else if (ch === ";" && depth <= 0) {
              j2++;
              break;
            } else if (ch === "\n" && depth <= 0) break;
            j2++;
          }
          const rawStmt = src.slice(wordStart, j2);
          const fsBinding = transpileFsImportStatement(rawStmt);
          if (fsBinding) {
            out += fsBinding + newlinesOf(rawStmt);
          } else {
            out += newlinesOf(rawStmt);
          }
          i = j2;
          continue;
        }
        if (word === "export") {
          let j2 = i;
          while (j2 < n && isWS(src[j2])) j2++;
          if (src.startsWith("default", j2) && !isIdentPart(src[j2 + 7] || "")) {
            i = j2 + 7;
            continue;
          }
          if (src.startsWith("type", j2) && !isIdentPart(src[j2 + 4] || "")) {
            let kt = j2 + 4;
            while (kt < n && isWS(src[kt])) kt++;
            if (src[kt] === "{" || src[kt] === "*") {
              j2 = kt;
            }
          }
          if (src[j2] === "*") {
            while (j2 < n && src[j2] !== ";" && src[j2] !== "\n") j2++;
            if (src[j2] === ";") j2++;
            out += newlinesOf(src.slice(wordStart, j2));
            i = j2;
            continue;
          }
          if (src[j2] === "{") {
            let depth = 0;
            while (j2 < n) {
              if (src[j2] === "{") depth++;
              else if (src[j2] === "}") {
                depth--;
                if (depth === 0) {
                  j2++;
                  break;
                }
              } else if (src[j2] === '"' || src[j2] === "'" || src[j2] === "`") {
                j2 = skipString(src, j2);
                continue;
              }
              j2++;
            }
            while (j2 < n && (src[j2] === " " || src[j2] === "	")) j2++;
            if (src.startsWith("from", j2) && !isIdentPart(src[j2 + 4] || "")) {
              while (j2 < n && src[j2] !== ";" && src[j2] !== "\n") j2++;
            }
            if (src[j2] === ";") j2++;
            out += newlinesOf(src.slice(wordStart, j2));
            i = j2;
            continue;
          }
          continue;
        }
        if (word === "declare") {
          let j2 = i;
          while (j2 < n && (src[j2] === " " || src[j2] === "	")) j2++;
          const nextId = readIdent(src, j2);
          if (nextId && (nextId.name === "interface" || nextId.name === "type")) {
            continue;
          }
          let depth = 0;
          let seenBraceBlock = false;
          while (j2 < n) {
            const ch = src[j2];
            if (ch === '"' || ch === "'" || ch === "`") {
              j2 = skipString(src, j2);
              continue;
            }
            if (ch === "{") {
              depth++;
              seenBraceBlock = true;
            } else if (ch === "}") {
              depth = Math.max(0, depth - 1);
              if (seenBraceBlock && depth === 0) {
                j2++;
                break;
              }
            } else if (ch === "(" || ch === "[") depth++;
            else if (ch === ")" || ch === "]") depth = Math.max(0, depth - 1);
            else if (ch === ";" && depth === 0) {
              j2++;
              break;
            } else if (ch === "\n" && depth === 0) break;
            j2++;
          }
          out += newlinesOf(src.slice(wordStart, j2));
          i = j2;
          continue;
        }
        if (word === "interface") {
          let j2 = i;
          let angleDepth = 0;
          while (j2 < n) {
            const ch = src[j2];
            if (ch === '"' || ch === "'" || ch === "`") {
              j2 = skipString(src, j2);
              continue;
            }
            if (ch === "<") angleDepth++;
            else if (ch === ">" && angleDepth > 0) angleDepth--;
            else if (ch === "{" && angleDepth === 0) break;
            else if (ch === "\n" && angleDepth === 0) {
              let p = j2 + 1;
              while (p < n && (src[p] === " " || src[p] === "	")) p++;
              if (src[p] !== "{" && !/^extends\b/.test(src.slice(p, p + 10))) break;
            }
            j2++;
          }
          if (src[j2] === "{") {
            let depth = 1;
            j2++;
            while (j2 < n && depth > 0) {
              if (src[j2] === "{") depth++;
              else if (src[j2] === "}") depth--;
              else if (src[j2] === '"' || src[j2] === "'" || src[j2] === "`") {
                j2 = skipString(src, j2);
                continue;
              }
              j2++;
            }
          }
          out += newlinesOf(src.slice(wordStart, j2));
          i = j2;
          continue;
        }
        if (word === "type") {
          let j2 = i;
          while (j2 < n && (src[j2] === " " || src[j2] === "	")) j2++;
          const typeNameId = readIdent(src, j2);
          if (typeNameId) {
            let k = typeNameId.end;
            while (k < n && isWS(src[k])) k++;
            if (src[k] === "<") {
              let ad = 1;
              k++;
              while (k < n && ad > 0) {
                const ch = src[k];
                if (ch === '"' || ch === "'" || ch === "`") {
                  k = skipString(src, k);
                  continue;
                }
                if (ch === "<") ad++;
                else if (ch === ">" && src[k - 1] !== "=") ad--;
                k++;
              }
              while (k < n && isWS(src[k])) k++;
            }
            if (src[k] === "=" && src[k + 1] !== "=" && src[k + 1] !== ">") {
              j2 = k + 1;
              let depth = 0;
              let angleDepth = 0;
              while (j2 < n) {
                const ch = src[j2];
                if (ch === '"' || ch === "'" || ch === "`") {
                  j2 = skipString(src, j2);
                  continue;
                }
                if (ch === "/" && src[j2 + 1] === "/") {
                  while (j2 < n && src[j2] !== "\n") j2++;
                  continue;
                }
                if (ch === "/" && src[j2 + 1] === "*") {
                  const closeC = src.indexOf("*/", j2 + 2);
                  j2 = closeC === -1 ? n : closeC + 2;
                  continue;
                }
                if (ch === "{" || ch === "[" || ch === "(") depth++;
                else if (ch === "}" || ch === "]" || ch === ")") depth = Math.max(0, depth - 1);
                else if (ch === "<") angleDepth++;
                else if (ch === ">" && angleDepth > 0 && src[j2 - 1] !== "=") angleDepth--;
                else if (ch === ";" && depth <= 0 && angleDepth <= 0) {
                  j2++;
                  break;
                } else if (ch === "\n" && depth <= 0 && angleDepth <= 0) {
                  let prevSig = j2 - 1;
                  while (prevSig > k && (src[prevSig] === " " || src[prevSig] === "	" || src[prevSig] === "\r")) prevSig--;
                  const prevCh = src[prevSig];
                  const prevWordM = src.slice(Math.max(k, prevSig - 10), prevSig + 1).match(/\b(extends|in|as|keyof|infer|readonly)$/);
                  let nextSig = j2 + 1;
                  while (nextSig < n && (src[nextSig] === " " || src[nextSig] === "	" || src[nextSig] === "\r")) nextSig++;
                  const nextCh = src[nextSig];
                  const continuesOnNextLine = prevCh === "=" || prevCh === "|" || prevCh === "&" || prevCh === "?" || prevCh === ":" || Boolean(prevWordM) || nextCh === "|" || nextCh === "&" || nextCh === "?" || nextCh === ":" || /^extends\b/.test(src.slice(nextSig, nextSig + 10));
                  if (!continuesOnNextLine) break;
                }
                j2++;
              }
              out += newlinesOf(src.slice(wordStart, j2));
              i = j2;
              continue;
            }
          }
        }
        if (word === "implements") {
          let j2 = i;
          while (j2 < n && src[j2] !== "{" && src[j2] !== "\n") {
            if (src[j2] === '"' || src[j2] === "'" || src[j2] === "`") {
              j2 = skipString(src, j2);
              continue;
            }
            j2++;
          }
          out += newlinesOf(src.slice(wordStart, j2));
          i = j2;
          continue;
        }
        if (word === "abstract") {
          let j2 = i;
          while (j2 < n && (src[j2] === " " || src[j2] === "	")) j2++;
          const nextId = readIdent(src, j2);
          if (nextId && nextId.name !== "class") {
            let k = nextId.end;
            while (k < n && (src[k] === " " || src[k] === "	")) k++;
            if (src[k] === "<") {
              let ad = 1;
              k++;
              while (k < n && ad > 0) {
                if (src[k] === '"' || src[k] === "'" || src[k] === "`") {
                  k = skipString(src, k);
                  continue;
                }
                if (src[k] === "<") ad++;
                else if (src[k] === ">" && src[k - 1] !== "=") ad--;
                k++;
              }
              while (k < n && (src[k] === " " || src[k] === "	")) k++;
            }
            if (src[k] === "(") {
              let pd = 1, m = k + 1;
              while (m < n && pd > 0) {
                if (src[m] === '"' || src[m] === "'" || src[m] === "`") {
                  m = skipString(src, m);
                  continue;
                }
                if (src[m] === "(") pd++;
                else if (src[m] === ")") pd--;
                m++;
              }
              if (pd === 0) {
                let p = m;
                while (p < n && (src[p] === " " || src[p] === "	")) p++;
                if (src[p] === ":") {
                  const tEnd = tryParseType(src, p + 1);
                  if (tEnd > p + 1) p = tEnd;
                }
                while (p < n && (src[p] === " " || src[p] === "	")) p++;
                if (src[p] === ";" || src[p] === "\n" || src[p] === "\r") {
                  if (src[p] === ";") p++;
                  out += nextId.name + "() {}" + newlinesOf(src.slice(wordStart, p));
                  i = p;
                  continue;
                }
              }
            }
          }
          continue;
        }
        if (/^(public|private|protected|readonly|override|namespace|implements)$/.test(word)) {
          continue;
        }
        if (word === "function") {
          let j2 = i;
          while (j2 < n && (src[j2] === " " || src[j2] === "	" || src[j2] === "*")) j2++;
          const fnId = readIdent(src, j2);
          if (fnId) {
            let k = fnId.end;
            while (k < n && (src[k] === " " || src[k] === "	")) k++;
            if (src[k] === "<") {
              let ad = 1;
              k++;
              while (k < n && ad > 0) {
                if (src[k] === '"' || src[k] === "'" || src[k] === "`") {
                  k = skipString(src, k);
                  continue;
                }
                if (src[k] === "<") ad++;
                else if (src[k] === ">" && src[k - 1] !== "=") ad--;
                k++;
              }
              while (k < n && (src[k] === " " || src[k] === "	")) k++;
            }
            if (src[k] === "(") {
              let pd = 1, m = k + 1;
              while (m < n && pd > 0) {
                if (src[m] === '"' || src[m] === "'" || src[m] === "`") {
                  m = skipString(src, m);
                  continue;
                }
                if (src[m] === "(") pd++;
                else if (src[m] === ")") pd--;
                m++;
              }
              if (pd === 0) {
                let p = m;
                while (p < n && (src[p] === " " || src[p] === "	")) p++;
                if (src[p] === ":") {
                  const tEnd = tryParseType(src, p + 1);
                  if (tEnd > p + 1) p = tEnd;
                }
                while (p < n && (src[p] === " " || src[p] === "	")) p++;
                if (src[p] === ";") {
                  p++;
                  out += newlinesOf(src.slice(wordStart, p));
                  i = p;
                  continue;
                }
              }
            }
          }
        }
        if (word === "constructor") {
          let j2 = i;
          while (j2 < n && isWS(src[j2])) j2++;
          if (src[j2] === "(") {
            let pd = 1, m = j2 + 1;
            while (m < n && pd > 0) {
              if (src[m] === '"' || src[m] === "'" || src[m] === "`") {
                m = skipString(src, m);
                continue;
              }
              if (src[m] === "(") pd++;
              else if (src[m] === ")") pd--;
              m++;
            }
            if (pd === 0) {
              const props = extractConstructorParamProps(src.slice(j2 + 1, m - 1));
              if (props.length > 0) {
                pendingCtorProps = props;
              }
            }
          }
        }
        if (word === "as" || word === "satisfies") {
          const end = tryParseType(src, i);
          if (end > 0) {
            out += newlinesOf(src.slice(i, end));
            i = end;
          } else {
            i = id.end;
          }
          continue;
        }
        out += word;
        while (i < n && src[i] === "!" && src[i + 1] !== "=") i++;
        {
          let jg = i;
          while (jg < n && (src[jg] === " " || src[jg] === "	")) jg++;
          if (src[jg] === "<") {
            let k = jg + 1;
            let depth = 1;
            let braceDepth = 0;
            while (k < n && depth > 0) {
              const ch = src[k];
              if ((ch === "\n" || ch === "\r" || ch === ";") && braceDepth === 0) break;
              if (ch === '"' || ch === "'" || ch === "`") {
                k = skipString(src, k);
                continue;
              }
              if (ch === "{") braceDepth++;
              else if (ch === "}") {
                if (braceDepth > 0) braceDepth--;
                else break;
              } else if (ch === "<") depth++;
              else if (ch === ">" && src[k - 1] !== "=") depth--;
              k++;
            }
            if (depth === 0) {
              let m = k;
              while (m < n && isWS(src[m])) m++;
              const after = src.slice(m, m + 11);
              if (src[m] === "(" || src[m] === "{" || /^extends\b/.test(after) || /^implements\b/.test(after)) {
                out += src.slice(i, jg) + newlinesOf(src.slice(jg, k));
                i = k;
              }
            }
          }
        }
        let j = i;
        while (j < n && isWS(src[j])) j++;
        if (src[j] === "?" && src[j + 1] === ":") {
          const typeStart = j + 2;
          const typeEnd = tryParseType(src, typeStart);
          if (typeEnd > typeStart) {
            out += src.slice(i, j) + newlinesOf(src.slice(j, typeEnd));
            i = typeEnd;
            continue;
          }
        }
        if (src[j] === "?" && (src[j + 1] === "," || src[j + 1] === ")") && parenDepth > 0 && !isTernaryColonNow()) {
          out += src.slice(i, j);
          i = j + 1;
          continue;
        }
        if (src[j] === ":" && !NON_TYPED_KEYWORDS.has(word)) {
          if (isTernaryColonNow()) {
            ternaryStack.pop();
            out += src.slice(i, j + 1);
            i = j + 1;
            continue;
          }
          const typeStart = j + 1;
          const typeEnd = tryParseType(src, typeStart);
          if (typeEnd > typeStart) {
            const typeText = src.slice(typeStart, typeEnd);
            const inObject = braceStack.length > 0 && braceStack[braceStack.length - 1] === "object";
            if (!inObject && looksLikeTypeText(typeText)) {
              out += src.slice(i, j) + newlinesOf(src.slice(j, typeEnd));
              i = typeEnd;
              continue;
            }
          }
        }
        continue;
      }
      if (c === "?") {
        const next = src[i + 1];
        if (next === "." || next === "?") {
          out += src.slice(i, i + 2);
          i += 2;
          if (next === "?" && src[i] === "=") {
            out += "=";
            i++;
          }
          continue;
        }
        ternaryStack.push({ paren: parenDepth, brace: braceStack.length });
        out += c;
        i++;
        continue;
      }
      if (c === ":") {
        if (isTernaryColonNow()) {
          ternaryStack.pop();
          out += c;
          i++;
          continue;
        }
        const k = lookBackSignificant(i);
        if (k >= 0 && (src[k] === ")" || src[k] === "]" || src[k] === "}")) {
          const inObject = braceStack.length > 0 && braceStack[braceStack.length - 1] === "object";
          const typeStart = i + 1;
          const typeEnd = tryParseType(src, typeStart);
          if (typeEnd > typeStart && looksLikeTypeText(src.slice(typeStart, typeEnd))) {
            if (src[k] === ")") {
              out += newlinesOf(src.slice(i, typeEnd));
              i = typeEnd;
              continue;
            }
            if (!inObject) {
              let afterIdx = typeEnd;
              while (afterIdx < n && (src[afterIdx] === " " || src[afterIdx] === "	")) afterIdx++;
              const afterCh = src[afterIdx] || "";
              const afterWord = readIdent(src, afterIdx)?.name || "";
              if (afterCh === "=" || afterCh === "," || afterCh === ")" || afterWord === "of" || afterWord === "in") {
                out += newlinesOf(src.slice(i, typeEnd));
                i = typeEnd;
                continue;
              }
            }
          }
        }
        out += c;
        i++;
        continue;
      }
      if (c === "{") {
        const k = lookBackSignificant(i);
        const kind = classifyOpenBraceKind(src, k, braceStack);
        braceStack.push(kind);
        if (pendingCtorProps && parenDepth === 0 && kind === "block") {
          const assigns = pendingCtorProps.map((p) => ` this.${p} = ${p};`).join("");
          pendingCtorProps = null;
          let bd = 1, m = i + 1;
          while (m < n && bd > 0) {
            if (src[m] === '"' || src[m] === "'" || src[m] === "`") {
              m = skipString(src, m);
              continue;
            }
            if (src[m] === "{") bd++;
            else if (src[m] === "}") bd--;
            m++;
          }
          const ctorBodySlice = stripCommentsOnly(src.slice(i + 1, m - 1));
          if (/\bsuper\s*\(/.test(ctorBodySlice)) {
            pendingAfterSuperAssigns = assigns;
            out += c;
          } else {
            out += "{" + assigns;
          }
        } else {
          out += c;
        }
        i++;
        continue;
      }
      if (c === "}") {
        popTernariesAtOrAbove(parenDepth, braceStack.length);
        braceStack.pop();
        out += c;
        i++;
        continue;
      }
      if (c === ";" || c === ",") {
        popTernariesAtOrAbove(parenDepth, braceStack.length);
        out += c;
        i++;
        continue;
      }
      out += c;
      i++;
    }
    if (typeof rawSrc === "string") {
      _STRIP_TYPES_CACHE = { src: rawSrc, out };
    }
    return out;
  }
  var transpileTS = stripTypes;
  function detectUnsupportedSyntax(src) {
    if (typeof src !== "string" || !src.trim()) return [];
    const results = [];
    const cleaned = stripCommentsOnly(src);
    const lines = cleaned.split("\n");
    for (let idx = 0; idx < lines.length; idx++) {
      const line = (lines[idx] ?? "").trim();
      if (!line) continue;
      const lineNo = idx + 1;
      if (/^with\s*\(/.test(line)) {
        results.push({
          line: lineNo,
          feature: "with \u8BED\u53E5",
          hint: "\u4E25\u683C\u6A21\u5F0F\u4E0B\u4E0D\u652F\u6301 `with (...)` \u8BED\u53E5\uFF0C\u8BF7\u76F4\u63A5\u8BBF\u95EE\u5BF9\u8C61\u5C5E\u6027\u6216\u4F7F\u7528\u89E3\u6784\u8D4B\u503C\u3002"
        });
      }
      if (/^import\s+[A-Za-z_$][\w$]*\s*=\s*require\s*\(/.test(line)) {
        results.push({
          line: lineNo,
          feature: "import = require()",
          hint: "\u6D4F\u89C8\u5668\u6C99\u7BB1\u4E0D\u652F\u6301 CommonJS `import x = require(...)`\uFF0C\u8BF7\u76F4\u63A5\u5B9A\u4E49\u6240\u9700\u6A21\u5757\u6216\u4F7F\u7528\u6807\u51C6 ES \u8BED\u6CD5\u3002"
        });
      }
    }
    return results;
  }
  var findSyntaxErrors = detectUnsupportedSyntax;

  // src/compiler/instrumenter.ts
  var instrumenter_exports = {};
  __export(instrumenter_exports, {
    __describeHeapVal: () => __describeHeapVal,
    blankJsLine: () => blankJsLine,
    collectNames: () => collectNames,
    extractBindingNames: () => extractBindingNames,
    extractCall: () => extractCall,
    findTrailingTopLevelCall: () => findTrailingTopLevelCall,
    formatVal: () => formatVal,
    instrument: () => instrument,
    isTraceableLine: () => isTraceableLine,
    resolveEntry: () => resolveEntry,
    snapFnExpr: () => snapFnExpr
  });
  function isTraceableLine(t) {
    if (!t) return false;
    if (t.startsWith("//") || t.startsWith("/*") || t.startsWith("*")) return false;
    if (/^[)}\].?:,&|]/.test(t)) return false;
    if (/^[;]+$/.test(t)) return false;
    if (/^(else|do|try|catch|finally|case\b|default\b)/.test(t)) return false;
    if (/^(function|class|interface|type|import|export)\b/.test(t)) return false;
    return true;
  }
  function extractBindingNames(lhs, names) {
    let s = lhs.trim();
    if (!s) return;
    let eqIdx = -1, depth = 0;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === '"' || ch === "'" || ch === "`") {
        i = skipString(s, i) - 1;
        continue;
      }
      if (ch === "(" || ch === "[" || ch === "{") depth++;
      else if (ch === ")" || ch === "]" || ch === "}") depth--;
      else if (ch === "=" && depth === 0 && s[i + 1] !== ">" && s[i + 1] !== "=") {
        eqIdx = i;
        break;
      }
    }
    if (eqIdx >= 0) s = s.slice(0, eqIdx).trim();
    if (s.startsWith("...")) s = s.slice(3).trim();
    if (s.startsWith("[")) {
      const inner = s.endsWith("]") ? s.slice(1, -1) : s.slice(1);
      splitTopLevel(inner).forEach((part) => extractBindingNames(part, names));
      return;
    }
    if (s.startsWith("{")) {
      const inner = s.endsWith("}") ? s.slice(1, -1) : s.slice(1);
      splitTopLevel(inner).forEach((part) => {
        const p = part.trim();
        if (!p) return;
        if (p.startsWith("...")) {
          extractBindingNames(p.slice(3), names);
          return;
        }
        let colonIdx = -1, d = 0;
        for (let i = 0; i < p.length; i++) {
          const ch = p[i];
          if (ch === "(" || ch === "[" || ch === "{") d++;
          else if (ch === ")" || ch === "]" || ch === "}") d--;
          else if (ch === ":" && d === 0) {
            colonIdx = i;
            break;
          }
        }
        if (colonIdx >= 0) extractBindingNames(p.slice(colonIdx + 1), names);
        else extractBindingNames(p, names);
      });
      return;
    }
    const m = s.match(/^([A-Za-z_$][\w$]*)$/);
    if (m && m[1] && !RESERVED_WORDS.has(m[1])) names.add(m[1]);
  }
  function collectNames(js) {
    const clean = blankStrings(js.replace(/\/\*__import__\*\/[^\n]*/g, ""));
    const names = /* @__PURE__ */ new Set();
    let m;
    const forRe = /\bfor\s*\(\s*(?:const|let|var)\s+(.+?)\s+(?:of|in)\b/g;
    while (m = forRe.exec(clean)) {
      extractBindingNames(m[1] || "", names);
    }
    const forClassicRe = /\bfor\s*\(\s*(?:const|let|var)\s+([^;]+)/g;
    while (m = forClassicRe.exec(clean)) {
      splitTopLevel(m[1] || "").forEach((part) => extractBindingNames(part, names));
    }
    const decl = /\b(?:const|let|var)\s+([^;\n]+)/g;
    while (m = decl.exec(clean)) {
      const rhs = (m[1] || "").replace(/\s+\b(?:of|in)\b[\s\S]*$/, "");
      splitTopLevel(rhs).forEach((part) => extractBindingNames(part, names));
    }
    const fn = /\bfunction\b\s*(?:[A-Za-z_$][\w$]*)?\s*\(([^)]*)\)/g;
    while (m = fn.exec(clean)) {
      splitTopLevel(m[1] || "").forEach((p) => extractBindingNames(p, names));
    }
    const method = /(?:^|[\n;{}])\s*(?:(?:public|private|protected|static|async|readonly|get|set)\s+)*([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*(?:\{|:)/g;
    while (m = method.exec(clean)) {
      if (!m[1] || RESERVED_WORDS.has(m[1])) continue;
      splitTopLevel(m[2] || "").forEach((p) => extractBindingNames(p, names));
    }
    for (let i = 0; i < clean.length - 1; i++) {
      if (clean[i] !== "=" || clean[i + 1] !== ">") continue;
      let k = i - 1;
      while (k >= 0 && isWS(clean[k])) k--;
      if (k >= 0 && clean[k] === ")") {
        let depth = 0, openIdx = -1;
        for (let p = k; p >= 0; p--) {
          const ch = clean[p];
          if (ch === ")" || ch === "]" || ch === "}") depth++;
          else if (ch === "(" || ch === "[" || ch === "{") {
            depth--;
            if (depth === 0) {
              if (ch === "(") openIdx = p;
              break;
            }
          }
        }
        if (openIdx >= 0) {
          splitTopLevel(clean.slice(openIdx + 1, k)).forEach((p) => extractBindingNames(p, names));
        }
      }
    }
    const singleArrow = /\b([A-Za-z_$][\w$]*)\s*=>/g;
    while (m = singleArrow.exec(clean)) {
      if (m[1] && !RESERVED_WORDS.has(m[1])) names.add(m[1]);
    }
    const cat = /\bcatch\s*\(\s*([^)]+)\)/g;
    while (m = cat.exec(clean)) {
      extractBindingNames(m[1] || "", names);
    }
    return [...names];
  }
  function snapFnExpr(names) {
    const body = names.map(
      (n) => `try{__v[${JSON.stringify(n)}]=${n};}catch(e){}`
    ).join("");
    return `function(){var __v={};${body}return __v;}`;
  }
  function endsWithContinuation(t) {
    if (!t) return false;
    if (/[.+\-*/%&|^<>?:=,(\[]$/.test(t)) {
      if (/(\+\+|--)$/.test(t)) return false;
      return true;
    }
    return false;
  }
  function isUnbracedControlHeader(t) {
    if (!t || t.endsWith("{") || t.endsWith(";")) return false;
    if (/^(else|do)$/.test(t)) return true;
    if (/^(?:if|for|while|else\s+if)\s*\(.*\)$/.test(t)) return true;
    return false;
  }
  function tryInjectLoopOrElseIf(raw, callExpr) {
    const mCond = raw.match(/^(\s*(?:}\s*)?(?:while|else\s+if)\s*)\(/);
    if (mCond && mCond[1] !== void 0) {
      const openIdx = mCond[1].length;
      const closeIdx = findBalancedParen(raw, openIdx);
      if (closeIdx > openIdx) {
        const cond = raw.slice(openIdx + 1, closeIdx).trim();
        if (cond) {
          return raw.slice(0, openIdx + 1) + "(" + callExpr + ", (" + cond + "))" + raw.slice(closeIdx);
        }
      }
    }
    const mFor = raw.match(/^(\s*for\s*)\(/);
    if (mFor && mFor[1] !== void 0) {
      const openIdx = mFor[1].length;
      const closeIdx = findBalancedParen(raw, openIdx);
      if (closeIdx > openIdx) {
        const inside = raw.slice(openIdx + 1, closeIdx);
        const semiParts = splitTopLevelSemicolons(inside);
        if (semiParts.length === 3) {
          const init = semiParts[0] ?? "";
          const cond = (semiParts[1] ?? "").trim();
          const upd = semiParts[2] ?? "";
          const wrappedCond = cond ? "(" + callExpr + ", (" + cond + "))" : "(" + callExpr + ", true)";
          return raw.slice(0, openIdx + 1) + init + "; " + wrappedCond + ";" + upd + raw.slice(closeIdx);
        } else if (semiParts.length === 1 && /\b(?:of|in)\b/.test(inside)) {
          const bracePos = raw.indexOf("{", closeIdx + 1);
          if (bracePos >= 0) {
            return raw.slice(0, bracePos + 1) + " " + callExpr + ";" + raw.slice(bracePos + 1);
          }
        }
      }
    }
    return null;
  }
  function matchFunctionHeaderForStack(rawLine, lineNum) {
    const clean = stripInlineCommentSafe(rawLine).trim();
    if (!clean.endsWith("{")) return null;
    let m = clean.match(/^(?:export\s+)?(?:default\s+)?(async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{$/);
    let isAsync = false;
    let fnName = "";
    let paramRaw = "";
    if (m && m[2]) {
      isAsync = Boolean(m[1]);
      fnName = m[2];
      paramRaw = m[3] || "";
    }
    if (!m) {
      m = clean.match(/^(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(async\s+)?function(?:\s+[A-Za-z_$][\w$]*)?\s*\(([^)]*)\)\s*\{$/);
      if (m && m[1]) {
        isAsync = Boolean(m[2]);
        fnName = m[1];
        paramRaw = m[3] || "";
      }
    }
    if (!m) {
      m = clean.match(/^(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(async\s+)?\(([^)]*)\)\s*=>\s*\{$/);
      if (m && m[1]) {
        isAsync = Boolean(m[2]);
        fnName = m[1];
        paramRaw = m[3] || "";
      }
    }
    if (!m) {
      m = clean.match(/^(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(async\s+)?([A-Za-z_$][\w$]*)\s*=>\s*\{$/);
      if (m && m[1]) {
        isAsync = Boolean(m[2]);
        fnName = m[1];
        paramRaw = m[3] || "";
      }
    }
    if (!m) {
      m = clean.match(/^((?:(?:public|private|protected|static|async|readonly|get|set)\s+)*)([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*(?::\s*[^{]+)?\s*\{$/);
      if (m && m[2] && RESERVED_WORDS.has(m[2])) m = null;
      if (m && m[2]) {
        isAsync = /\basync\b/.test(m[1] || "");
        fnName = m[2];
        paramRaw = m[3] || "";
      }
    }
    if (!m || !fnName) return null;
    const pSet = /* @__PURE__ */ new Set();
    splitTopLevel(paramRaw).forEach((p) => extractBindingNames(p, pSet));
    return {
      kind: "fn",
      name: fnName,
      params: [...pSet],
      line: lineNum,
      fidVar: `__fid_${lineNum}`,
      isAsync
    };
  }
  function rewriteAwaitExpressions(str, fidExpr, lineNum) {
    if (!/\bawait\b/.test(str)) return str;
    let out = "";
    let i = 0;
    const n = str.length;
    while (i < n) {
      const ch = str[i];
      if (ch === '"' || ch === "'" || ch === "`") {
        const end = skipString(str, i);
        out += str.slice(i, end);
        i = end;
        continue;
      }
      if (ch === "/" && str[i + 1] === "/") {
        out += str.slice(i);
        break;
      }
      if (isIdentStart(ch)) {
        const id = readIdent(str, i);
        if (!id) {
          i++;
          continue;
        }
        if (id.name === "await") {
          let j = id.end;
          while (j < n && isWS(str[j])) j++;
          let d = 0;
          let k = j;
          while (k < n) {
            const c = str[k];
            if (c === '"' || c === "'" || ch === "`") {
              k = skipString(str, k);
              continue;
            }
            if (c === "/" && str[k + 1] === "/") break;
            if (c === "(" || c === "[" || c === "{") d++;
            else if (c === ")" || c === "]" || c === "}") {
              if (d === 0) break;
              d--;
            } else if (d === 0 && (c === ";" || c === "," || c === "\n")) {
              break;
            }
            k++;
          }
          const rawExpr = str.slice(j, k).trim();
          if (rawExpr) {
            const innerRewritten = rewriteAwaitExpressions(rawExpr, fidExpr, lineNum);
            const label = rawExpr.length > 36 ? rawExpr.slice(0, 33) + "\u2026" : rawExpr;
            out += `(yield (__t && __t.__await ? __t.__await((${innerRewritten}), ${fidExpr}, ${lineNum}, ${JSON.stringify(label)}) : (${innerRewritten})))`;
            i = k;
            continue;
          }
        }
        out += str.slice(i, id.end);
        i = id.end;
        continue;
      }
      out += ch;
      i++;
    }
    return out;
  }
  function classKeywordIndex(raw) {
    for (let k = 0; k < raw.length; k++) {
      const ch = raw[k];
      if (ch === '"' || ch === "'" || ch === "`") {
        k = skipString(raw, k) - 1;
        continue;
      }
      if (ch === "/" && raw[k + 1] === "/") return -1;
      if (ch === "/" && raw[k + 1] === "*") {
        const e = raw.indexOf("*/", k + 2);
        k = e === -1 ? raw.length : e + 1;
        continue;
      }
      if (isIdentStart(ch)) {
        const id = readIdent(raw, k);
        if (!id) continue;
        if (id.name === "class") return k;
        k = id.end - 1;
      }
    }
    return -1;
  }
  function instrument(js, originalLines, names) {
    const lines = js.split("\n");
    const out = [];
    let parenDepth = 0;
    const braceStack = [];
    let prevContinued = false;
    let prevUnbracedControl = false;
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i] ?? "";
      const t = raw.trim();
      const indentMatch = raw.match(/^\s*/);
      const indent = indentMatch ? indentMatch[0] : "";
      const topBrace = braceStack.length > 0 ? braceStack[braceStack.length - 1] : null;
      const inObject = topBrace === "object";
      const inClassBody = topBrace === "classbody";
      const classKw = classKeywordIndex(raw);
      let classBraceIdx = -1;
      if (classKw >= 0) {
        for (let k = classKw + 5; k < raw.length; k++) {
          const ch = raw[k];
          if (ch === '"' || ch === "'" || ch === "`") {
            k = skipString(raw, k) - 1;
            continue;
          }
          if (ch === "/" && raw[k + 1] === "/") break;
          if (ch === "{") {
            classBraceIdx = k;
            break;
          }
        }
      }
      const origLine = originalLines[i];
      const srcLine = (origLine != null ? origLine : t).trim();
      const note = srcLine.length > 72 ? srcLine.slice(0, 69) + "\u2026" : srcLine;
      const insideClass = braceStack.some((k) => k === "classbody");
      const withThis = insideClass && !inClassBody && !/\bsuper\s*\(/.test(t);
      const callExpr = "__t(" + (i + 1) + ", " + JSON.stringify(note) + ", " + snapFnExpr(names) + (withThis ? ", this" : "") + ")";
      const canInjectHeader = parenDepth === 0 && !inObject && !inClassBody && !prevContinued && !prevUnbracedControl;
      let activeAsyncFn = null;
      for (let bIdx = braceStack.length - 1; bIdx >= 0; bIdx--) {
        const bItem = braceStack[bIdx];
        if (bItem && typeof bItem === "object" && bItem.kind === "fn") {
          if (bItem.isAsync) activeAsyncFn = bItem;
          break;
        }
      }
      const fnHeader = !inObject && parenDepth === 0 ? matchFunctionHeaderForStack(raw, i + 1) : null;
      let openFnBraceIdx = -1;
      if (fnHeader) {
        let lastBrace = -1;
        for (let k = 0; k < raw.length; k++) {
          const ch = raw[k];
          if (ch === '"' || ch === "'" || ch === "`") {
            k = skipString(raw, k) - 1;
            continue;
          }
          if (ch === "/" && raw[k + 1] === "/") break;
          if (ch === "{") lastBrace = k;
        }
        openFnBraceIdx = lastBrace;
      }
      const closeFnSplices = [];
      for (let k = 0; k < raw.length; k++) {
        const ch = raw[k];
        if (ch === '"' || ch === "'" || ch === "`") {
          k = skipString(raw, k) - 1;
          continue;
        }
        if (ch === "/" && raw[k + 1] === "/") break;
        if (ch === "(" || ch === "[") parenDepth++;
        else if (ch === ")" || ch === "]") parenDepth = Math.max(0, parenDepth - 1);
        else if (ch === "{") {
          if (fnHeader && k === openFnBraceIdx) {
            braceStack.push(fnHeader);
            continue;
          }
          if (classBraceIdx >= 0 && k === classBraceIdx) {
            braceStack.push("classbody");
            continue;
          }
          let p = k - 1;
          while (p >= 0 && isWS(raw[p])) p--;
          let kind = "block";
          if (p >= 0) {
            const prev = raw[p];
            if (prev === "=" || prev === "(" || prev === "," || prev === "[" || prev === ":" || prev === "?") kind = "object";
            else if (prev === ">" && p >= 1 && raw[p - 1] === "=") kind = "block";
            else if (isIdentPart(prev)) {
              let w = p;
              while (w >= 0 && isIdentPart(raw[w])) w--;
              const word = raw.slice(w + 1, p + 1);
              if (word === "return" || word === "case" || word === "default" || word === "yield") kind = "object";
            }
          } else if (prevContinued) {
            kind = "object";
          }
          braceStack.push(kind);
        } else if (ch === "}") {
          const popped = braceStack.pop();
          if (popped && typeof popped === "object" && popped.kind === "fn") {
            closeFnSplices.push({ idx: k, fnInfo: popped });
          }
        }
      }
      let transformedRaw = raw;
      if (fnHeader && openFnBraceIdx >= 0 && !closeFnSplices.some((s) => s.fnInfo === fnHeader)) {
        const headPrefix = fnHeader.isAsync ? raw.slice(0, openFnBraceIdx + 1).replace(/\basync\s+/, "") : raw.slice(0, openFnBraceIdx + 1);
        const enterHook = fnHeader.isAsync ? ` return (__t && __t.__async ? __t.__async(function* () { var ${fnHeader.fidVar} = (typeof __t === "function" && __t.__enter) ? __t.__enter(${JSON.stringify(fnHeader.name)}, ${JSON.stringify(fnHeader.params)}, [${fnHeader.params.join(", ")}], ${fnHeader.line}, ${snapFnExpr(names)}) : 0; try {` : ` var ${fnHeader.fidVar} = (typeof __t === "function" && __t.__enter) ? __t.__enter(${JSON.stringify(fnHeader.name)}, ${JSON.stringify(fnHeader.params)}, [${fnHeader.params.join(", ")}], ${fnHeader.line}, ${snapFnExpr(names)}) : 0; try {`;
        transformedRaw = headPrefix + enterHook + raw.slice(openFnBraceIdx + 1);
      } else if (closeFnSplices.length > 0) {
        let rebuilt = transformedRaw;
        for (let sIdx = closeFnSplices.length - 1; sIdx >= 0; sIdx--) {
          const sp = closeFnSplices[sIdx];
          if (!sp || sp.fnInfo === fnHeader) continue;
          const leaveHook = sp.fnInfo.isAsync ? `} finally { if (typeof __t === "function" && __t.__leave) __t.__leave(${sp.fnInfo.fidVar}); } }, this, ${JSON.stringify(sp.fnInfo.name)}, ${sp.fnInfo.line}) : undefined); ` : `} finally { if (typeof __t === "function" && __t.__leave) __t.__leave(${sp.fnInfo.fidVar}); } `;
          rebuilt = rebuilt.slice(0, sp.idx) + leaveHook + rebuilt.slice(sp.idx);
        }
        transformedRaw = rebuilt;
      } else {
        const singleAsyncFnM = transformedRaw.match(/^(\s*(?:export\s+)?(?:default\s+)?)async\s+function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{([\s\S]*)\}\s*;?\s*$/);
        if (singleAsyncFnM && singleAsyncFnM[2] !== void 0 && singleAsyncFnM[4] !== void 0) {
          const bodyRewritten = rewriteAwaitExpressions(singleAsyncFnM[4], "0", i + 1);
          transformedRaw = `${singleAsyncFnM[1] || ""}function ${singleAsyncFnM[2]}(${singleAsyncFnM[3] || ""}) { return (__t && __t.__async ? __t.__async(function* () { ${bodyRewritten} }, this, ${JSON.stringify(singleAsyncFnM[2])}, ${i + 1}) : undefined); }`;
        }
      }
      if (activeAsyncFn && /\bawait\b/.test(transformedRaw)) {
        transformedRaw = rewriteAwaitExpressions(transformedRaw, activeAsyncFn.fidVar, i + 1);
      }
      if (/\bcatch\b/.test(transformedRaw)) {
        transformedRaw = transformedRaw.replace(/\bcatch\s*\(\s*([A-Za-z_$][\w$]*)\s*\)\s*\{/g, "catch ($1) { if ($1 && ($1.__debugPause || $1.__timeout)) throw $1;").replace(/\bcatch\s*\{/g, "catch (__e) { if (__e && (__e.__debugPause || __e.__timeout)) throw __e;");
      }
      if (raw.trimStart().startsWith("/*__import__*/")) {
        out.push(transformedRaw);
        continue;
      }
      const injectedLine = canInjectHeader ? tryInjectLoopOrElseIf(transformedRaw, callExpr) : null;
      if (injectedLine !== null) {
        out.push(injectedLine);
      } else {
        const canTraceHere = canInjectHeader && isTraceableLine(t);
        if (canTraceHere) {
          out.push(indent + callExpr + ";");
        }
        out.push(transformedRaw);
      }
      if (t) {
        prevContinued = endsWithContinuation(t);
        prevUnbracedControl = isUnbracedControlHeader(t);
      }
    }
    const ckptPreamble = 'var checkpoint = function(){ try { if (typeof __t === "function" && __t.__ckpt) __t.__ckpt(Array.prototype.slice.call(arguments)); } catch (_){} }, \u65AD\u70B9 = checkpoint; var Promise = (__t && __t.__env && __t.__env.Promise) || globalThis.Promise, setTimeout = (__t && __t.__env && __t.__env.setTimeout) || globalThis.setTimeout, clearTimeout = (__t && __t.__env && __t.__env.clearTimeout) || globalThis.clearTimeout, queueMicrotask = (__t && __t.__env && __t.__env.queueMicrotask) || globalThis.queueMicrotask; if (typeof sleep === "undefined") { var sleep = (__t && __t.__env && __t.__env.sleep) || function(ms, val){ return new Promise(function(r){ setTimeout(function(){ r(val); }, ms); }); }; } try { if (typeof __t === "function" && __t.__initGlobal) __t.__initGlobal(' + snapFnExpr(names) + "); } catch (_){} ";
    if (out.length > 0) out[0] = ckptPreamble + out[0];
    else out.push(ckptPreamble);
    return out.join("\n");
  }
  function extractCall(src) {
    const m = src.match(/\/\/\s*调用[:：]\s*(.+)/);
    return m && m[1] ? m[1].trim() : null;
  }
  function findTrailingTopLevelCall(js) {
    const lines = String(js || "").replace(/\r/g, "").split("\n");
    let idx = lines.length - 1;
    while (idx >= 0) {
      const cleaned = stripInlineCommentSafe(lines[idx]).trim();
      if (!cleaned) {
        idx--;
        continue;
      }
      if (!/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*\s*\(/.test(cleaned)) return null;
      if (!/\)\s*;?\s*$/.test(cleaned)) return null;
      if (/^(?:return|throw|if|for|while|switch|class|function|const|let|var|import|export|await|new)\b/.test(cleaned)) return null;
      const body = cleaned.replace(/;\s*$/, "").trim();
      if (blankStrings(body).includes(";")) return null;
      let depth = 0;
      for (let i = 0; i < idx; i++) {
        const raw = blankStrings(stripInlineCommentSafe(lines[i]));
        for (let k = 0; k < raw.length; k++) {
          const ch = raw[k];
          if (ch === "{" || ch === "(" || ch === "[") depth++;
          else if (ch === "}" || ch === ")" || ch === "]") depth = Math.max(0, depth - 1);
        }
      }
      if (depth !== 0) return null;
      return { index: idx, expr: body, line: idx + 1 };
    }
    return null;
  }
  function blankJsLine(js, index) {
    const lines = String(js).split("\n");
    if (index >= 0 && index < lines.length) lines[index] = "";
    return lines.join("\n");
  }
  function resolveEntry(src, js) {
    const legacy = extractCall(src);
    if (legacy) {
      const idx = String(src).replace(/\r/g, "").split("\n").findIndex((l) => /\/\/\s*调用[:：]/.test(l));
      return { expr: stripTypes(legacy), index: -1, line: idx >= 0 ? idx + 1 : 0, legacy: true };
    }
    const found = findTrailingTopLevelCall(js);
    if (found) return { expr: stripTypes(found.expr), index: found.index, line: found.line, legacy: false };
    return { expr: "undefined", index: -1, line: 0, legacy: false };
  }
  function formatVal(v) {
    if (v === void 0) return "undefined";
    if (v === null) return "null";
    try {
      return typeof v === "object" ? JSON.stringify(v) : String(v);
    } catch (_) {
      return String(v);
    }
  }
  function __describeHeapVal(v) {
    return v;
  }

  // src/compiler/type-checker.ts
  var type_checker_exports = {};
  __export(type_checker_exports, {
    BUILTIN_TS_GLOBALS: () => BUILTIN_TS_GLOBALS,
    checkPass2Statements: () => checkPass2Statements,
    collectPass1Declarations: () => collectPass1Declarations,
    createTypeCheckContext: () => createTypeCheckContext,
    createTypeEvalEngine: () => createTypeEvalEngine,
    createTypeInferEngine: () => createTypeInferEngine,
    ensureTsWorker: () => ensureTsWorker,
    extractTsInterfaceMetadata: () => extractTsInterfaceMetadata,
    inferExpr: () => inferExpr,
    inferLiteralType: () => inferLiteralType,
    inferRuntimeTsType: () => inferRuntimeTsType,
    isAssignable: () => isAssignable,
    isLiteralOfPrimitive: () => isLiteralOfPrimitive,
    isTsAssignable: () => isTsAssignable,
    matchInterfaceForObject: () => matchInterfaceForObject,
    matchTemplateLiteralType: () => matchTemplateLiteralType,
    normalizeTsType: () => normalizeTsType,
    parseObjectLiteralEntries: () => parseObjectLiteralEntries,
    parseTopLevelConditional: () => parseTopLevelConditional,
    parseType: () => parseType,
    parseTypeParams: () => parseTypeParams,
    requestTsWorkerCheck: () => requestTsWorkerCheck,
    splitTopLevelDecl: () => splitTopLevelDecl,
    splitTopLevelIntersection: () => splitTopLevelIntersection,
    splitTopLevelUnion: () => splitTopLevelUnion,
    stripNullableFromType: () => stripNullableFromType,
    stripTupleElementLabel: () => stripTupleElementLabel,
    substituteTypeParamsInStr: () => substituteTypeParamsInStr,
    typeCheck: () => typeCheck,
    typeToStr: () => typeToStr,
    typecheckTS: () => typecheckTS
  });

  // src/utils/format.ts
  function isMapLike(v) {
    return Object.prototype.toString.call(v) === "[object Map]";
  }
  function isSetLike(v) {
    return Object.prototype.toString.call(v) === "[object Set]";
  }
  function isRecord(v) {
    return typeof v === "object" && v !== null;
  }
  function isFrame(v) {
    return typeof v === "object" && v !== null && !Array.isArray(v);
  }
  function defineHidden(obj, key, val) {
    if (!obj || typeof obj !== "object") return;
    try {
      Object.defineProperty(obj, key, {
        value: val,
        enumerable: false,
        configurable: true,
        writable: true
      });
    } catch (_) {
    }
  }
  function formatShortVal(val) {
    if (val === void 0) return "undefined";
    if (val === null) return "null";
    if (typeof val === "string") return JSON.stringify(val.length > 16 ? val.slice(0, 14) + "\u2026" : val);
    if (typeof val === "number" || typeof val === "boolean") return String(val);
    if (Array.isArray(val)) return "[" + val.slice(0, 4).map(formatShortVal).join(", ") + (val.length > 4 ? ", \u2026" : "") + "]";
    if (isMapLike(val)) return "Map(" + val.size + ")";
    if (isSetLike(val)) return "Set(" + val.size + ")";
    if (isRecord(val)) {
      const keys = Object.keys(val);
      if (keys.length > 0 && keys.length <= 4 && keys.every((k) => val[k] === null || typeof val[k] !== "object")) {
        return "{ " + keys.map((k) => k + ": " + formatShortVal(val[k])).join(", ") + " }";
      }
    }
    return "{\u2026}";
  }
  function cloneDeepBounded(val, depth = 0) {
    if (!isRecord(val)) return val;
    if (val.__isVirtualPromise) {
      if (val.state === "pending") return "Promise <pending>";
      if (val.state === "fulfilled") return "Promise <fulfilled: " + formatShortVal(val.value) + ">";
      return "Promise <rejected: " + formatShortVal(val.reason) + ">";
    }
    if (depth >= 4) return String(val);
    if (Array.isArray(val)) return val.slice(0, 40).map((x) => cloneDeepBounded(x, depth + 1));
    if (isMapLike(val)) {
      const entries = [];
      for (const [k, v] of val) {
        if (entries.length >= 40) break;
        entries.push({ k: cloneDeepBounded(k, depth + 1), v: cloneDeepBounded(v, depth + 1) });
      }
      return entries;
    }
    if (isSetLike(val)) {
      const items = [];
      for (const v of val) {
        if (items.length >= 40) break;
        items.push(cloneDeepBounded(v, depth + 1));
      }
      return items;
    }
    const out = {};
    const clsName = typeof val.__py_cls__ === "string" && val.__py_cls__ ? val.__py_cls__ : val.constructor && val.constructor !== Object && val.constructor.name ? val.constructor.name : "";
    if (clsName) {
      defineHidden(out, "__py_cls__", clsName);
    }
    Object.keys(val).slice(0, 20).forEach((k) => {
      out[k] = cloneDeepBounded(val[k], depth + 1);
    });
    return out;
  }
  function safeJSONStringify(val) {
    if (val === void 0) return "(undefined)";
    try {
      const seen = /* @__PURE__ */ new WeakSet();
      return JSON.stringify(val, (_k, v) => {
        if (v !== null && typeof v === "object") {
          if (seen.has(v)) return "[Circular]";
          seen.add(v);
          if (Array.isArray(v) && v.length > 60) {
            return [
              ...v.slice(0, 20),
              `\u2026 (\u5171 ${v.length} \u9879)`,
              ...v.slice(v.length - 5)
            ];
          }
        }
        return v;
      });
    } catch (_) {
      try {
        return String(val);
      } catch (__) {
        return "[Object]";
      }
    }
  }

  // src/compiler/tc-types.ts
  var BUILTIN_TS_GLOBALS = /* @__PURE__ */ new Set([
    "Math",
    "JSON",
    "Number",
    "String",
    "Boolean",
    "Array",
    "Object",
    "Map",
    "Set",
    "WeakMap",
    "WeakSet",
    "Date",
    "RegExp",
    "Error",
    "TypeError",
    "RangeError",
    "SyntaxError",
    "ReferenceError",
    "URIError",
    "EvalError",
    "AggregateError",
    "Promise",
    "Symbol",
    "BigInt",
    "Intl",
    "Reflect",
    "Proxy",
    "Generator",
    "AsyncGenerator",
    "Iterator",
    "AsyncIterator",
    "Iterable",
    "AsyncIterable",
    "ArrayBuffer",
    "SharedArrayBuffer",
    "DataView",
    "Int8Array",
    "Uint8Array",
    "Uint8ClampedArray",
    "Int16Array",
    "Uint16Array",
    "Int32Array",
    "Uint32Array",
    "Float32Array",
    "Float64Array",
    "BigInt64Array",
    "BigUint64Array",
    "parseInt",
    "parseFloat",
    "isNaN",
    "isFinite",
    "encodeURI",
    "decodeURI",
    "encodeURIComponent",
    "decodeURIComponent",
    "structuredClone",
    "atob",
    "btoa",
    "console",
    "window",
    "globalThis",
    "self",
    "document",
    "navigator",
    "location",
    "performance",
    "setTimeout",
    "clearTimeout",
    "setInterval",
    "clearInterval",
    "requestAnimationFrame",
    "cancelAnimationFrame",
    "queueMicrotask",
    "sleep",
    "Infinity",
    "NaN",
    "undefined",
    "null",
    "true",
    "false",
    "this",
    "super",
    "arguments",
    "checkpoint",
    "\u65AD\u70B9"
  ]);
  function createTypeCheckContext(src) {
    const lines = src.replace(/\r\n?/g, "\n").split("\n");
    const diagnostics = [];
    const fns = /* @__PURE__ */ new Map();
    const typeAliases = /* @__PURE__ */ new Map();
    const genericTypeAliases = /* @__PURE__ */ new Map();
    const interfaceTypeParams = /* @__PURE__ */ new Map();
    const interfaces = /* @__PURE__ */ new Map();
    const classParents = /* @__PURE__ */ new Map();
    const classImplements = /* @__PURE__ */ new Map();
    const abstractClasses = /* @__PURE__ */ new Set();
    const enumsSet = /* @__PURE__ */ new Set();
    const enumMembers = /* @__PURE__ */ new Map();
    const enumValueTypes = /* @__PURE__ */ new Map();
    const env = /* @__PURE__ */ new Map();
    const activeTypeParams = /* @__PURE__ */ new Map();
    function getKnownNominalTypes() {
      const s = /* @__PURE__ */ new Set();
      enumsSet.forEach((k) => s.add(k));
      interfaces.forEach((_, k) => s.add(k));
      typeAliases.forEach((_, k) => s.add(k));
      activeTypeParams.forEach((_, k) => s.delete(k));
      return s;
    }
    function isKnownIdentifier(name) {
      if (!name || !/^[A-Za-z_$][\w$]*$/.test(name)) return true;
      return env.has(name) || fns.has(name) || interfaces.has(name) || typeAliases.has(name) || genericTypeAliases.has(name) || activeTypeParams.has(name) || enumsSet.has(name) || BUILTIN_TS_GLOBALS.has(name) || RESERVED_WORDS.has(name);
    }
    function addDiag(line, code, message) {
      if (!diagnostics.some((d) => d.line === line && d.code === code && d.message === message)) {
        diagnostics.push({ line, code, message });
      }
    }
    return {
      lines,
      diagnostics,
      fns,
      typeAliases,
      genericTypeAliases,
      interfaceTypeParams,
      interfaces,
      classParents,
      classImplements,
      abstractClasses,
      enumsSet,
      enumMembers,
      enumValueTypes,
      env,
      activeTypeParams,
      addDiag,
      getKnownNominalTypes,
      isKnownIdentifier
    };
  }
  function inferRuntimeTsType(val) {
    if (val === null) return "null";
    if (Array.isArray(val)) {
      if (!val.length) return "any[]";
      return inferRuntimeTsType(val[0]) + "[]";
    }
    if (isMapLike(val)) return "Map";
    if (isSetLike(val)) return "Set";
    return typeof val;
  }
  function extractTsInterfaceMetadata(src) {
    const interfaces = /* @__PURE__ */ new Map();
    const varTypes = /* @__PURE__ */ new Map();
    if (!src || typeof src !== "string") {
      appState.CURRENT_TS_META = { interfaces, varTypes };
      return appState.CURRENT_TS_META;
    }
    const lines = src.replace(/\r\n?/g, "\n").split("\n");
    let activeIface = null;
    let activeIfaceLine = 1;
    let activeIsClass = false;
    let activeBody = "";
    let depth = 0;
    function parseFieldsFromBody(bodyStr, isClass = false) {
      const inner = bodyStr.trim().replace(/^\{/, "").replace(/\}$/, "").trim();
      const fields = [];
      const seen = /* @__PURE__ */ new Set();
      if (!inner) return fields;
      let topLevelOnly = "";
      let bDepth = 0;
      for (let i = 0; i < inner.length; i++) {
        const ch = inner[i];
        if (ch === '"' || ch === "'" || ch === "`") {
          const end = skipString(inner, i);
          if (bDepth === 0) topLevelOnly += inner.slice(i, end);
          i = end - 1;
          continue;
        }
        if (ch === "{") {
          bDepth++;
          continue;
        }
        if (ch === "}") {
          bDepth = Math.max(0, bDepth - 1);
          continue;
        }
        if (bDepth === 0) topLevelOnly += ch;
      }
      const members = topLevelOnly.split(/[;,\n]/).map((s) => stripInlineCommentSafe(s).trim()).filter(Boolean);
      members.forEach((mem) => {
        const cleaned = mem.replace(/^(?:(?:readonly|public|private|protected|static)\s+)+/, "");
        if (/^(?:constructor|get\s+|set\s+|async\s+|[A-Za-z_$][\w$]*\s*\()/.test(cleaned)) return;
        const m = cleaned.match(/^([A-Za-z_$][\w$]*)(\?)?\s*:\s*([^=]+?)(?:\s*=[\s\S]+)?$/);
        if (m && m[1] && m[3] && !seen.has(m[1])) {
          seen.add(m[1]);
          fields.push({
            k: m[1],
            declaredType: m[3].trim(),
            optional: Boolean(m[2])
          });
          return;
        }
        if (isClass) {
          const initOnly = cleaned.match(/^([A-Za-z_$][\w$]*)\s*=\s*(.+)$/);
          if (initOnly && initOnly[1] && initOnly[2] && !seen.has(initOnly[1])) {
            const rhs = initOnly[2].trim();
            let inferred = "any";
            if (/^[+-]?\d+(?:\.\d+)?$/.test(rhs)) inferred = "number";
            else if (/^(true|false)$/.test(rhs)) inferred = "boolean";
            else if (/^["'`]/.test(rhs)) inferred = "string";
            else if (rhs.startsWith("[")) inferred = "any[]";
            seen.add(initOnly[1]);
            fields.push({
              k: initOnly[1],
              declaredType: inferred,
              optional: false
            });
          }
        }
      });
      if (isClass) {
        const ctorM = inner.match(/\bconstructor\s*\(([^)]*)\)/);
        if (ctorM && ctorM[1]?.trim()) {
          splitTopLevel(ctorM[1]).forEach((rawP) => {
            const p = rawP.trim();
            const pm = p.match(/^(?:(?:public|private|protected|readonly)\s+)+([A-Za-z_$][\w$]*)(\?)?(?:\s*:\s*([^=]+?))?(?:\s*=\s*([\s\S]+))?$/);
            if (pm && pm[1] && !seen.has(pm[1])) {
              seen.add(pm[1]);
              let pType = pm[3] ? pm[3].trim() : "any";
              if (pType === "any" && pm[4]) {
                const rhs = pm[4].trim();
                if (/^[+-]?\d+(?:\.\d+)?$/.test(rhs)) pType = "number";
                else if (/^(true|false)$/.test(rhs)) pType = "boolean";
                else if (/^["'`]/.test(rhs)) pType = "string";
              }
              fields.push({ k: pm[1], declaredType: pType, optional: Boolean(pm[2]) });
            }
          });
        }
        const thisAssignRe = /\bthis\.([A-Za-z_$][\w$]*)\s*=/g;
        let tm;
        while (tm = thisAssignRe.exec(inner)) {
          if (tm[1] && !seen.has(tm[1])) {
            seen.add(tm[1]);
            fields.push({ k: tm[1], declaredType: "any", optional: false });
          }
        }
      }
      return fields;
    }
    for (let i = 0; i < lines.length; i++) {
      const raw = stripInlineCommentSafe(lines[i]);
      const trimmed = raw.trim();
      if (!trimmed) continue;
      if (activeIface) {
        activeBody += "\n" + raw;
        for (const ch of raw) {
          if (ch === "{") depth++;
          else if (ch === "}") depth--;
        }
        if (depth <= 0) {
          const parsedFields = parseFieldsFromBody(activeBody, activeIsClass);
          if (!activeIsClass || parsedFields.length > 0) {
            interfaces.set(activeIface, {
              name: activeIface,
              line: activeIfaceLine,
              isClass: activeIsClass,
              fields: parsedFields
            });
          }
          activeIface = null;
          activeIsClass = false;
          activeBody = "";
        }
        continue;
      }
      const ifaceM = trimmed.match(/^(?:export\s+)?(?:abstract\s+)?(interface|class)\s+([A-Za-z_$][\w$]*)(?:\s*<[^>]*>)?(?:\s+extends\s+[^{]+)?(?:\s+implements\s+[^{]+)?\s*\{(.*)$/);
      if (ifaceM && ifaceM[2]) {
        const isClass = ifaceM[1] === "class";
        const name = ifaceM[2];
        const rest = "{" + (ifaceM[3] || "");
        let d = 0;
        for (const ch of rest) {
          if (ch === "{") d++;
          else if (ch === "}") d--;
        }
        if (d <= 0 && rest.includes("}")) {
          const bodyPart = rest.slice(0, rest.lastIndexOf("}") + 1);
          const parsedFields = parseFieldsFromBody(bodyPart, isClass);
          if (!isClass || parsedFields.length > 0) {
            interfaces.set(name, {
              name,
              line: i + 1,
              isClass,
              fields: parsedFields
            });
          }
        } else {
          activeIface = name;
          activeIfaceLine = i + 1;
          activeIsClass = isClass;
          activeBody = rest;
          depth = d;
        }
        continue;
      }
      const typeObjM = trimmed.match(/^(?:export\s+)?type\s+([A-Za-z_$][\w$]*)\s*=\s*(\{[\s\S]*\});?$/);
      if (typeObjM && typeObjM[1] && typeObjM[2]) {
        interfaces.set(typeObjM[1], {
          name: typeObjM[1],
          line: i + 1,
          isClass: false,
          fields: parseFieldsFromBody(typeObjM[2], false)
        });
        continue;
      }
      const fnM = trimmed.match(/^(?:export\s+)?(?:default\s+)?function\s+[A-Za-z_$][\w$]*\s*\(([^)]*)\)/);
      if (fnM && fnM[1]?.trim()) {
        splitTopLevel(fnM[1]).forEach((p) => {
          const pm = p.trim().match(/^([A-Za-z_$][\w$]*)\??\s*:\s*(.+)$/);
          if (pm && pm[1] && pm[2]) varTypes.set(pm[1], pm[2].trim());
        });
      }
      const varM = trimmed.match(/^(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*:\s*([^=]+?)(?:\s*=|$)/);
      if (varM && varM[1] && varM[2]) {
        varTypes.set(varM[1], varM[2].trim());
      } else {
        const varNewM = trimmed.match(/^(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*new\s+([A-Za-z_$][\w$]*)\s*(?:<[^>]*>)?\s*\(/);
        if (varNewM && varNewM[1] && varNewM[2] && !/^(Map|Set|Array)$/.test(varNewM[2])) {
          varTypes.set(varNewM[1], varNewM[2]);
        }
      }
    }
    appState.CURRENT_TS_META = { interfaces, varTypes };
    return appState.CURRENT_TS_META;
  }
  function matchInterfaceForObject(name, value) {
    const { interfaces, varTypes } = appState.CURRENT_TS_META;
    const declaredVarT = name ? varTypes.get(name) : void 0;
    if (declaredVarT) {
      const cleanT = declaredVarT.replace(/\[\]$/, "").trim();
      if (interfaces.has(cleanT)) return interfaces.get(cleanT) || null;
    }
    if (value && typeof value === "object") {
      const pyCls = typeof value.__py_cls__ === "string" ? value.__py_cls__ : "";
      if (pyCls && interfaces.has(pyCls)) {
        return interfaces.get(pyCls) || null;
      }
    }
    if (!value || typeof value !== "object") return null;
    const valKeys = Object.keys(value);
    if (!valKeys.length) return null;
    let best = null;
    let bestScore = 0;
    interfaces.forEach((iface) => {
      if (!iface.fields.length) return;
      const overlap = iface.fields.filter((f) => (f.k || "") in value).length;
      if (overlap > 0 && overlap >= bestScore) {
        const allKnown = valKeys.every((k) => iface.fields.some((f) => f.k === k));
        const score = overlap * 2 + (allKnown ? 1 : 0);
        if (score > bestScore) {
          bestScore = score;
          best = iface;
        }
      }
    });
    return best;
  }
  function normalizeTsType(rawType) {
    if (!rawType) return "any";
    let src = rawType.trim();
    let t = "";
    let i = 0;
    while (i < src.length) {
      const ch = src[i] || "";
      if (ch === '"' || ch === "'" || ch === "`") {
        const end = skipString(src, i);
        let lit = src.slice(i, end);
        if (ch === "'") {
          lit = '"' + lit.slice(1, -1).replace(/"/g, '\\"') + '"';
        }
        t += lit;
        i = end;
        continue;
      }
      if (/\s/.test(ch)) {
        while (i < src.length && /\s/.test(src[i] || "")) i++;
        const prev = t[t.length - 1] || "";
        const next = src[i] || "";
        if (/[A-Za-z0-9_$?]/.test(prev) && /[A-Za-z0-9_$"`']/.test(next)) {
          t += " ";
        }
        continue;
      }
      t += ch;
      i++;
    }
    while (t.startsWith("(") && t.endsWith(")") && findBalancedParen(t, 0) === t.length - 1) {
      t = t.slice(1, -1).trim();
    }
    const parenArr = t.match(/^\(([^()]+)\)\[\]$/);
    if (parenArr && parenArr[1] && !/\binfer\s+/.test(parenArr[1]) && !parenArr[1].includes("|") && !parenArr[1].includes("&") && !parenArr[1].includes("=>")) {
      t = normalizeTsType(parenArr[1]) + "[]";
    }
    const arrGeneric = t.match(/^(?:Readonly)?Array<(.+)>$/);
    if (arrGeneric && arrGeneric[1] && splitTopLevelUnion(arrGeneric[1]).length === 1) {
      const inner = normalizeTsType(arrGeneric[1]);
      if (/\binfer\s+/.test(inner) || inner.includes("|") || inner.includes("&") || inner.includes("=>")) {
        t = `(${inner})[]`;
      } else {
        t = inner + "[]";
      }
    }
    if (t.startsWith("readonly ")) {
      t = t.slice("readonly ".length).trim();
    }
    if (t === "unique symbol") {
      return "symbol";
    }
    return t;
  }
  function stripTupleElementLabel(elemStr) {
    const s = elemStr.trim();
    const m = s.match(/^(\.\.\.)?(?:readonly\s+)?[A-Za-z_$][\w$]*(\?)?\s*:\s*([\s\S]+)$/);
    if (m && m[3]) {
      const prefix = m[1] || "";
      const optSuffix = m[2] ? "?" : "";
      return `${prefix}${m[3].trim()}${optSuffix}`;
    }
    return s.replace(/^readonly\s+/, "").trim();
  }
  function splitTopLevelUnion(typeStr) {
    const parts = [];
    let depth = 0, cur = "";
    for (let i = 0; i < typeStr.length; i++) {
      const ch = typeStr[i];
      if (ch === '"' || ch === "'" || ch === "`") {
        const end = skipString(typeStr, i);
        cur += typeStr.slice(i, end);
        i = end - 1;
        continue;
      }
      if (ch === "<" || ch === "(" || ch === "[" || ch === "{") depth++;
      else if (ch === ">" && typeStr[i - 1] !== "=" || ch === ")" || ch === "]" || ch === "}") depth = Math.max(0, depth - 1);
      if (ch === "|" && depth === 0) {
        if (cur.trim()) parts.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    if (cur.trim()) parts.push(cur.trim());
    return parts;
  }
  function splitTopLevelIntersection(typeStr) {
    const parts = [];
    let depth = 0, cur = "";
    for (let i = 0; i < typeStr.length; i++) {
      const ch = typeStr[i];
      if (ch === '"' || ch === "'" || ch === "`") {
        const end = skipString(typeStr, i);
        cur += typeStr.slice(i, end);
        i = end - 1;
        continue;
      }
      if (ch === "<" || ch === "(" || ch === "[" || ch === "{") depth++;
      else if (ch === ">" && typeStr[i - 1] !== "=" || ch === ")" || ch === "]" || ch === "}") depth = Math.max(0, depth - 1);
      if (ch === "&" && depth === 0) {
        if (cur.trim()) parts.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    if (cur.trim()) parts.push(cur.trim());
    return parts;
  }
  function stripNullableFromType(typeStr, target) {
    if (!typeStr) return "any";
    const norm = normalizeTsType(typeStr);
    const parts = splitTopLevelUnion(norm).filter((p) => p !== target);
    return parts.length ? parts.join("|") : norm;
  }
  function isLiteralOfPrimitive(lit, prim) {
    if (prim === "string") return lit.startsWith('"') && lit.endsWith('"') || lit.startsWith("`") && lit.endsWith("`");
    if (prim === "number") return /^[+-]?\d+(?:\.\d+)?$/.test(lit);
    if (prim === "boolean") return lit === "true" || lit === "false";
    return false;
  }
  function matchTemplateLiteralType(actualStr, patternTpl) {
    if (!actualStr.startsWith('"') || !actualStr.endsWith('"')) return null;
    if (!patternTpl.startsWith("`") || !patternTpl.endsWith("`")) return null;
    const val = actualStr.slice(1, -1);
    const body = patternTpl.slice(1, -1);
    let regexStr = "^";
    const inferNames = [];
    let i = 0;
    while (i < body.length) {
      if (body[i] === "$" && body[i + 1] === "{") {
        const end = body.indexOf("}", i + 2);
        if (end < 0) return null;
        const expr = body.slice(i + 2, end).trim();
        const inferM = expr.match(/^infer\s+([A-Za-z_$][\w$]*)(?:\s+extends\s+(.+))?$/);
        if (inferM && inferM[1]) {
          inferNames.push({ name: inferM[1], constraint: inferM[2] ? normalizeTsType(inferM[2]) : null });
          const hasMoreText = end + 1 < body.length;
          regexStr += hasMoreText ? "(.+?)" : "(.*)";
        } else if (expr === "string" || expr === "any") {
          regexStr += ".*";
        } else if (expr === "number") {
          regexStr += "[+-]?\\d+(?:\\.\\d+)?";
        } else if (expr === "boolean") {
          regexStr += "(?:true|false)";
        } else {
          const cleanLit = expr.replace(/^["']|["']$/g, "");
          regexStr += cleanLit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        }
        i = end + 1;
      } else {
        regexStr += (body[i] || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        i++;
      }
    }
    regexStr += "$";
    try {
      const m = val.match(new RegExp(regexStr));
      if (!m) return null;
      const bindings = /* @__PURE__ */ new Map();
      for (let k = 0; k < inferNames.length; k++) {
        const captured = m[k + 1] ?? "";
        const info = inferNames[k];
        if (!info) continue;
        if (info.constraint === "number") {
          if (!/^[+-]?\d+(?:\.\d+)?$/.test(captured)) return null;
          bindings.set(info.name, captured);
        } else if (info.constraint === "boolean") {
          if (captured !== "true" && captured !== "false") return null;
          bindings.set(info.name, captured);
        } else {
          bindings.set(info.name, `"${captured}"`);
        }
      }
      return bindings;
    } catch (_) {
      return null;
    }
  }
  function isTsAssignable(actual, expected, knownNominalTypes) {
    if (!actual || !expected) return true;
    const a = normalizeTsType(actual);
    const e = normalizeTsType(expected);
    if (a === e || a === "any" || e === "any" || e === "unknown" || a === "never") return true;
    if (a === "undefined" && e === "void") return true;
    if (a === "unknown") return false;
    if (e === "never") return a === "never";
    if (isLiteralOfPrimitive(a, e)) return true;
    if (e.startsWith("`") && e.endsWith("`") && a.startsWith('"') && a.endsWith('"')) {
      if (matchTemplateLiteralType(a, e) !== null) return true;
    }
    const aIsUnboundTypeParam = /^[A-Z]\d*$/.test(a) && (!knownNominalTypes || !knownNominalTypes.has(a));
    const eIsUnboundTypeParam = /^[A-Z]\d*$/.test(e) && (!knownNominalTypes || !knownNominalTypes.has(e));
    if (aIsUnboundTypeParam || eIsUnboundTypeParam) return true;
    const eParts = splitTopLevelUnion(e);
    if (eParts.length > 1) {
      const aPartsForUnion = splitTopLevelUnion(a);
      if (aPartsForUnion.length > 1) {
        return aPartsForUnion.every((ap) => eParts.some((ep) => isTsAssignable(ap, ep, knownNominalTypes)));
      }
      return eParts.some((part) => isTsAssignable(a, part, knownNominalTypes));
    }
    const aParts = splitTopLevelUnion(a);
    if (aParts.length > 1) {
      return aParts.every((part) => isTsAssignable(part, e, knownNominalTypes));
    }
    if (a === "any[]" && e.endsWith("[]")) return true;
    if (a === "any[][]" && e.endsWith("[][]")) return true;
    const aParenArr = a.match(/^\((.+)\)\[\]$/);
    const eParenArr = e.match(/^\((.+)\)\[\]$/);
    if ((aParenArr || a.endsWith("[]")) && (eParenArr || e.endsWith("[]"))) {
      const elemA = aParenArr ? aParenArr[1] : a.slice(0, -2);
      const elemE = eParenArr ? eParenArr[1] : e.slice(0, -2);
      return isTsAssignable(elemA, elemE, knownNominalTypes);
    }
    if (a.startsWith("[") && a.endsWith("]") && e.startsWith("[") && e.endsWith("]")) {
      const aPartsTup = a.slice(1, -1).split(",").map((s) => stripTupleElementLabel(s)).filter(Boolean);
      const ePartsTup = e.slice(1, -1).split(",").map((s) => stripTupleElementLabel(s)).filter(Boolean);
      if (aPartsTup.length === ePartsTup.length && aPartsTup.every((ap, idx) => isTsAssignable(ap, ePartsTup[idx], knownNominalTypes))) {
        return true;
      }
    }
    if (a.startsWith("[") && a.endsWith("]") && e.endsWith("[]")) {
      const elemE = eParenArr ? eParenArr[1] : e.slice(0, -2);
      const aPartsTup = a.slice(1, -1).split(",").map((s) => stripTupleElementLabel(s)).filter(Boolean);
      if (aPartsTup.every((ap) => isTsAssignable(ap, elemE, knownNominalTypes))) return true;
    }
    if (a.endsWith("[]") && e.startsWith("[") && e.endsWith("]")) {
      const elemA = aParenArr ? aParenArr[1] : a.slice(0, -2);
      const tupleParts = e.slice(1, -1).split(",").map((s) => stripTupleElementLabel(s)).filter(Boolean);
      if (tupleParts.length > 0 && tupleParts.every((tp) => isTsAssignable(elemA, tp, knownNominalTypes))) {
        return true;
      }
    }
    const fnArrowIdx = e.lastIndexOf("=>");
    if (fnArrowIdx > 0 && e.startsWith("(")) {
      const expectedRet = e.slice(fnArrowIdx + 2).trim();
      const aArrowIdx = a.lastIndexOf("=>");
      if (aArrowIdx > 0 && a.startsWith("(")) {
        const actualRet = a.slice(aArrowIdx + 2).trim();
        return isTsAssignable(actualRet, expectedRet, knownNominalTypes);
      }
      if (a === "function" || isTsAssignable(a, expectedRet, knownNominalTypes)) return true;
    }
    const aGenM = a.match(/^([A-Za-z_$][\w$]*)<(.+)>$/);
    const eGenM = e.match(/^([A-Za-z_$][\w$]*)<(.+)>$/);
    if (aGenM && eGenM && aGenM[1] === eGenM[1]) {
      return isTsAssignable(aGenM[2], eGenM[2], knownNominalTypes);
    }
    return false;
  }
  function splitTopLevelDecl(s) {
    const parts = [];
    let depth = 0, angleDepth = 0, cur = "";
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === '"' || ch === "'" || ch === "`") {
        const end = skipString(s, i);
        cur += s.slice(i, end);
        i = end - 1;
        continue;
      }
      if (ch === "(" || ch === "[" || ch === "{") depth++;
      else if (ch === ")" || ch === "]" || ch === "}") depth = Math.max(0, depth - 1);
      else if (ch === "<" && s.indexOf(">", i + 1) > i) angleDepth++;
      else if (ch === ">" && angleDepth > 0 && s[i - 1] !== "=") angleDepth--;
      if (ch === "," && depth === 0 && angleDepth === 0) {
        parts.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    if (cur) parts.push(cur);
    return parts;
  }
  function parseTypeParams(typeParamStr) {
    if (!typeParamStr) return [];
    let inner = typeParamStr.trim();
    if (inner.startsWith("<") && inner.endsWith(">")) inner = inner.slice(1, -1).trim();
    if (!inner) return [];
    const rawItems = splitTopLevelDecl(inner);
    const out = [];
    rawItems.forEach((item) => {
      let s = item.trim().replace(/^(?:const|in|out)\s+/, "");
      if (!s) return;
      let defaultType = null;
      let d = 0, ad = 0, eqIdx = -1;
      for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (ch === '"' || ch === "'" || ch === "`") {
          i = skipString(s, i) - 1;
          continue;
        }
        if (ch === "(" || ch === "[" || ch === "{") d++;
        else if (ch === ")" || ch === "]" || ch === "}") d = Math.max(0, d - 1);
        else if (ch === "<") ad++;
        else if (ch === ">" && s[i - 1] !== "=") ad = Math.max(0, ad - 1);
        else if (ch === "=" && s[i + 1] !== ">" && d === 0 && ad === 0) {
          eqIdx = i;
          break;
        }
      }
      if (eqIdx > 0) {
        defaultType = s.slice(eqIdx + 1).trim();
        s = s.slice(0, eqIdx).trim();
      }
      const extM = s.match(/^([A-Za-z_$][\w$]*)(?:\s+extends\s+([\s\S]+))?$/);
      if (extM && extM[1]) {
        out.push({
          name: extM[1],
          constraint: extM[2] ? extM[2].trim() : null,
          defaultType
        });
      }
    });
    return out;
  }
  function substituteTypeParamsInStr(typeStr, typeEnv) {
    if (!typeStr || !typeEnv || typeEnv.size === 0) return typeStr;
    let out = "";
    let i = 0;
    while (i < typeStr.length) {
      const ch = typeStr[i];
      if (ch === '"' || ch === "'" || ch === "`") {
        const end = skipString(typeStr, i);
        if (ch === "`") {
          let tpl = "`";
          let k = i + 1;
          while (k < end - 1) {
            if (typeStr[k] === "$" && typeStr[k + 1] === "{") {
              const closeIdx = typeStr.indexOf("}", k + 2);
              if (closeIdx > k && closeIdx < end) {
                const innerExpr = typeStr.slice(k + 2, closeIdx);
                tpl += "${" + substituteTypeParamsInStr(innerExpr, typeEnv) + "}";
                k = closeIdx + 1;
                continue;
              }
            }
            tpl += typeStr[k++];
          }
          tpl += "`";
          out += tpl;
        } else {
          out += typeStr.slice(i, end);
        }
        i = end;
        continue;
      }
      if (isIdentStart(ch)) {
        const id = readIdent(typeStr, i);
        if (!id) {
          out += ch;
          i++;
          continue;
        }
        const word = id.name;
        const prevCh = i > 0 ? typeStr[i - 1] || "" : "";
        let afterIdx = id.end;
        while (afterIdx < typeStr.length && isWS(typeStr[afterIdx])) afterIdx++;
        const isPropKey = (typeStr[afterIdx] === ":" || typeStr[afterIdx] === "?" && typeStr[afterIdx + 1] === ":") && (prevCh === "{" || prevCh === ";" || prevCh === "," || /\s/.test(prevCh));
        const isAfterInfer = out.trimEnd().endsWith("infer");
        if (!isPropKey && !isAfterInfer && prevCh !== "." && typeEnv.has(word)) {
          out += typeEnv.get(word);
        } else {
          out += word;
        }
        i = id.end;
        continue;
      }
      out += ch;
      i++;
    }
    return out;
  }
  function parseTopLevelConditional(typeStr) {
    let d = 0, ad = 0;
    let extPos = -1, extLen = 7, qPos = -1, cPos = -1;
    let qDepth = 0;
    for (let i = 0; i < typeStr.length; i++) {
      const ch = typeStr[i];
      if (ch === '"' || ch === "'" || ch === "`") {
        i = skipString(typeStr, i) - 1;
        continue;
      }
      if (ch === "(" || ch === "[" || ch === "{") d++;
      else if (ch === ")" || ch === "]" || ch === "}") d = Math.max(0, d - 1);
      else if (ch === "<") ad++;
      else if (ch === ">" && typeStr[i - 1] !== "=") ad = Math.max(0, ad - 1);
      else if (d === 0 && ad === 0) {
        if (extPos < 0 && (i === 0 || /[\s>)\]]/.test(typeStr[i - 1] || ""))) {
          const extM = typeStr.slice(i).match(/^extends(?:\s+|(?=[(\[{"'`]))/);
          if (extM) {
            extPos = i;
            extLen = extM[0].length;
            i += extLen - 1;
            continue;
          }
        }
        if (extPos >= 0 && ch === "?") {
          if (qPos < 0) qPos = i;
          else qDepth++;
        } else if (extPos >= 0 && qPos >= 0 && ch === ":") {
          if (qDepth === 0) {
            cPos = i;
            break;
          } else {
            qDepth--;
          }
        }
      }
    }
    if (extPos > 0 && qPos > extPos && cPos > qPos) {
      return {
        checkType: typeStr.slice(0, extPos).trim(),
        extendsType: typeStr.slice(extPos + extLen, qPos).trim(),
        trueType: typeStr.slice(qPos + 1, cPos).trim(),
        falseType: typeStr.slice(cPos + 1).trim()
      };
    }
    return null;
  }
  function inferLiteralType(expr) {
    if (!expr) return null;
    const s = expr.trim();
    if (s.startsWith('"') && s.endsWith('"') || s.startsWith("'") && s.endsWith("'")) {
      return '"' + s.slice(1, -1).replace(/"/g, '\\"') + '"';
    }
    if (/^[+-]?\d+(?:\.\d+)?$/.test(s)) return s;
    if (s === "true" || s === "false") return s;
    return null;
  }
  function parseObjectLiteralEntries(expr) {
    const s = expr.trim();
    if (!s.startsWith("{") || !s.endsWith("}") || findBalancedParen(s, 0) !== s.length - 1) return null;
    const inner = s.slice(1, -1).trim();
    const entries = /* @__PURE__ */ new Map();
    if (!inner) return entries;
    const parts = splitTopLevel(inner);
    parts.forEach((part) => {
      const p = part.trim();
      if (!p) return;
      const getterLitM = p.match(/^get\s+([A-Za-z_$][\w$]*)\s*\(\s*\)\s*(?::\s*([^{]+?))?\s*\{([\s\S]*)\}$/);
      if (getterLitM && getterLitM[1]) {
        const gRet = getterLitM[2] ? getterLitM[2].trim() : "0";
        entries.set(getterLitM[1], `undefined as ${gRet}`);
        return;
      }
      const methodLitM = p.match(/^(?:async\s+)?([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*(?::\s*([^{]+?))?\s*\{([\s\S]*)\}$/);
      if (methodLitM && methodLitM[1]) {
        entries.set(methodLitM[1], `(${methodLitM[2] || ""}) => undefined`);
        return;
      }
      let colonIdx = -1, d = 0;
      for (let i = 0; i < p.length; i++) {
        const ch = p[i];
        if (ch === '"' || ch === "'" || ch === "`") {
          i = skipString(p, i) - 1;
          continue;
        }
        if (ch === "(" && d === 0) break;
        if (ch === "(" || ch === "[" || ch === "{") d++;
        else if (ch === ")" || ch === "]" || ch === "}") d--;
        else if (d === 0 && ch === ":") {
          colonIdx = i;
          break;
        }
      }
      if (colonIdx > 0) {
        const keyRaw = p.slice(0, colonIdx).trim().replace(/^["']|["']$/g, "");
        const valExpr = p.slice(colonIdx + 1).trim();
        entries.set(keyRaw, valExpr);
      } else if (/^[A-Za-z_$][\w$]*$/.test(p)) {
        entries.set(p, p);
      }
    });
    return entries;
  }

  // src/compiler/tc-eval.ts
  function createTypeEvalEngine(ctx) {
    const {
      fns,
      typeAliases,
      genericTypeAliases,
      interfaceTypeParams,
      interfaces,
      classParents,
      enumsSet,
      enumValueTypes,
      env,
      activeTypeParams,
      getKnownNominalTypes
    } = ctx;
    function matchConditionalExtends(checkT, extT, typeEnv, depth) {
      const inferred = /* @__PURE__ */ new Map();
      const cNorm = evaluateType(checkT, typeEnv, depth + 1);
      const eSubst = substituteTypeParamsInStr(normalizeTsType(extT), typeEnv);
      const directInfer = eSubst.match(/^infer\s+([A-Za-z_$][\w$]*)(?:\s+extends\s+([\s\S]+))?$/);
      if (directInfer && directInfer[1]) {
        const varName = directInfer[1];
        if (directInfer[2]) {
          const constraintT = evaluateType(directInfer[2], typeEnv, depth + 1);
          if (!isTypeCompatible(cNorm, constraintT)) return { matched: false, inferred };
        }
        inferred.set(varName, cNorm);
        return { matched: true, inferred };
      }
      const arrInferM = eSubst.match(/^(?:\(\s*infer\s+([A-Za-z_$][\w$]*)\s*\)\[\]|infer\s+([A-Za-z_$][\w$]*)\[\]|(?:Readonly)?Array<\s*infer\s+([A-Za-z_$][\w$]*)\s*>)$/);
      if (arrInferM) {
        const varName = arrInferM[1] || arrInferM[2] || arrInferM[3] || "";
        if (cNorm.endsWith("[]") && splitTopLevelUnion(cNorm).length === 1) {
          let elem = cNorm.slice(0, -2);
          if (elem.startsWith("(") && elem.endsWith(")") && findBalancedParen(elem, 0) === elem.length - 1) {
            elem = elem.slice(1, -1);
          }
          inferred.set(varName, elem);
          return { matched: true, inferred };
        }
        if (cNorm.startsWith("[") && cNorm.endsWith("]")) {
          const parts = splitTopLevelDecl(cNorm.slice(1, -1)).map((s) => stripTupleElementLabel(s)).filter(Boolean);
          const unique = Array.from(new Set(parts));
          inferred.set(varName, unique.length ? unique.join("|") : "never");
          return { matched: true, inferred };
        }
        return { matched: false, inferred };
      }
      if (eSubst.startsWith("(") && eSubst.includes("=>")) {
        const closeP = findBalancedParen(eSubst, 0);
        if (closeP > 0 && eSubst.slice(closeP + 1).trim().startsWith("=>")) {
          const eParamStr = eSubst.slice(1, closeP).trim();
          const eRetStr = eSubst.slice(closeP + 1).trim().slice(2).trim();
          if (cNorm.startsWith("(") && cNorm.includes("=>")) {
            const cCloseP = findBalancedParen(cNorm, 0);
            if (cCloseP > 0 && cNorm.slice(cCloseP + 1).trim().startsWith("=>")) {
              const cParamStr = cNorm.slice(1, cCloseP).trim();
              const cRetStr = cNorm.slice(cCloseP + 1).trim().slice(2).trim();
              const retMatch = matchConditionalExtends(cRetStr, eRetStr, typeEnv, depth + 1);
              if (!retMatch.matched) return { matched: false, inferred };
              retMatch.inferred.forEach((v, k) => inferred.set(k, v));
              const restInferM = eParamStr.match(/^\.\.\.[A-Za-z_$][\w$]*\s*:\s*infer\s+([A-Za-z_$][\w$]*)$/);
              if (restInferM && restInferM[1]) {
                const pList = cParamStr ? splitTopLevelDecl(cParamStr).map((p) => {
                  const colon = p.indexOf(":");
                  return colon >= 0 ? evaluateType(p.slice(colon + 1).trim(), typeEnv, depth + 1) : "any";
                }) : [];
                inferred.set(restInferM[1], `[${pList.join(",")}]`);
                return { matched: true, inferred };
              }
              const eParams = eParamStr ? splitTopLevelDecl(eParamStr) : [];
              const cParams = cParamStr ? splitTopLevelDecl(cParamStr) : [];
              for (let idx = 0; idx < eParams.length; idx++) {
                const ep = (eParams[idx] || "").trim();
                if (ep.startsWith("...")) {
                  const eColon2 = ep.indexOf(":");
                  const restType = eColon2 >= 0 ? ep.slice(eColon2 + 1).trim() : "any[]";
                  if (restType === "any" || restType === "any[]" || restType === "unknown[]") {
                    break;
                  }
                  const elemRest = restType.endsWith("[]") ? restType.slice(0, -2) : restType;
                  for (let cIdx = idx; cIdx < cParams.length; cIdx++) {
                    const cp2 = cParams[cIdx] || "";
                    const cColon2 = cp2.indexOf(":");
                    const cpType2 = cColon2 >= 0 ? cp2.slice(cColon2 + 1).trim() : cp2.trim();
                    const pm2 = matchConditionalExtends(cpType2, elemRest, typeEnv, depth + 1);
                    if (!pm2.matched) return { matched: false, inferred };
                    pm2.inferred.forEach((v, k) => inferred.set(k, v));
                  }
                  break;
                }
                const cp = cParams[idx];
                if (!cp) break;
                const eColon = ep.indexOf(":");
                const cColon = cp.indexOf(":");
                const epType = eColon >= 0 ? ep.slice(eColon + 1).trim() : ep.trim();
                const cpType = cColon >= 0 ? cp.slice(cColon + 1).trim() : cp.trim();
                const pm = matchConditionalExtends(cpType, epType, typeEnv, depth + 1);
                if (!pm.matched) return { matched: false, inferred };
                pm.inferred.forEach((v, k) => inferred.set(k, v));
              }
              return { matched: true, inferred };
            }
          }
          return { matched: false, inferred };
        }
      }
      if (eSubst.startsWith("[") && eSubst.endsWith("]")) {
        if (!cNorm.startsWith("[") || !cNorm.endsWith("]")) return { matched: false, inferred };
        const eItems = splitTopLevelDecl(eSubst.slice(1, -1)).map((s) => stripTupleElementLabel(s)).filter(Boolean);
        const cItems = splitTopLevelDecl(cNorm.slice(1, -1)).map((s) => stripTupleElementLabel(s)).filter(Boolean);
        for (let idx = 0; idx < eItems.length; idx++) {
          const ei = eItems[idx] || "";
          const restInfer = ei.match(/^\.\.\.(?:infer\s+([A-Za-z_$][\w$]*)|([A-Za-z_$][\w$]*))$/);
          if (restInfer) {
            const restVar = restInfer[1];
            const remaining = cItems.slice(idx);
            if (restVar) inferred.set(restVar, `[${remaining.join(",")}]`);
            return { matched: true, inferred };
          }
          if (idx >= cItems.length) return { matched: false, inferred };
          const subM = matchConditionalExtends(cItems[idx] || "any", ei, typeEnv, depth + 1);
          if (!subM.matched) return { matched: false, inferred };
          subM.inferred.forEach((v, k) => inferred.set(k, v));
        }
        return { matched: cItems.length === eItems.length, inferred };
      }
      const eGenM = eSubst.match(/^([A-Za-z_$][\w$]*)<(.+)>$/);
      if (eGenM && eGenM[2] && /\binfer\s+/.test(eGenM[2])) {
        const cGenM = cNorm.match(/^([A-Za-z_$][\w$]*)<(.+)>$/);
        if (!cGenM || !cGenM[2] || cGenM[1] !== eGenM[1]) return { matched: false, inferred };
        const eArgs = splitTopLevelDecl(eGenM[2]).map((s) => s.trim());
        const cArgs = splitTopLevelDecl(cGenM[2]).map((s) => s.trim());
        if (eArgs.length !== cArgs.length) return { matched: false, inferred };
        for (let idx = 0; idx < eArgs.length; idx++) {
          const subM = matchConditionalExtends(cArgs[idx] || "any", eArgs[idx] || "any", typeEnv, depth + 1);
          if (!subM.matched) return { matched: false, inferred };
          subM.inferred.forEach((v, k) => inferred.set(k, v));
        }
        return { matched: true, inferred };
      }
      if (eSubst.startsWith("{") && eSubst.endsWith("}") && /\binfer\s+/.test(eSubst)) {
        const cShape = getInterfaceShape(cNorm);
        const eShape = parseObjectShapeLiteral(eSubst);
        if (!cShape || !eShape) return { matched: false, inferred };
        for (const [k, eProp] of eShape.entries()) {
          if (!cShape.has(k)) return { matched: false, inferred };
          const subM = matchConditionalExtends((cShape.get(k) || { type: "any" }).type, eProp.rawType || eProp.type, typeEnv, depth + 1);
          if (!subM.matched) return { matched: false, inferred };
          subM.inferred.forEach((v, ik) => inferred.set(ik, v));
        }
        return { matched: true, inferred };
      }
      if (eSubst.startsWith("`") && eSubst.endsWith("`")) {
        const tplBindings = matchTemplateLiteralType(cNorm, eSubst);
        if (tplBindings) {
          tplBindings.forEach((v, k) => inferred.set(k, v));
          return { matched: true, inferred };
        }
        return { matched: false, inferred };
      }
      const eEval = evaluateType(eSubst, typeEnv, depth + 1);
      return { matched: isTypeCompatible(cNorm, eEval), inferred };
    }
    function resolveIndexedAccess(objT, keyT, typeEnv, depth) {
      if (objT === "any" || keyT === "any") return "any";
      if (keyT === "never") return "never";
      const keyParts = splitTopLevelUnion(keyT);
      if (keyParts.length > 1) {
        const out = [];
        keyParts.forEach((kp) => {
          const r = resolveIndexedAccess(objT, kp, typeEnv, depth + 1);
          splitTopLevelUnion(r).forEach((u) => {
            if (u !== "never" && !out.includes(u)) out.push(u);
          });
        });
        return out.length ? out.join("|") : "never";
      }
      if (objT.endsWith("[]") && (keyT === "number" || /^[+-]?\d+$/.test(keyT))) {
        return objT.slice(0, -2);
      }
      if (objT.startsWith("[") && objT.endsWith("]")) {
        const elems = splitTopLevelDecl(objT.slice(1, -1)).map((s) => stripTupleElementLabel(s)).filter(Boolean);
        if (keyT === "number") {
          return Array.from(new Set(elems)).join("|") || "never";
        }
        if (/^\d+$/.test(keyT)) {
          const idx = Number(keyT);
          return idx < elems.length ? elems[idx] || "undefined" : "undefined";
        }
      }
      const shape = getInterfaceShape(objT);
      if (shape) {
        const cleanKey = keyT.replace(/^["']|["']$/g, "");
        if (shape.has(cleanKey)) {
          return (shape.get(cleanKey) || { type: "any" }).type;
        }
        if (shape.has("__index__")) {
          return (shape.get("__index__") || { type: "any" }).type;
        }
        if (keyT === "keyof " + objT) {
          const vals = [];
          shape.forEach((v, k) => {
            if (k !== "__index__" && !vals.includes(v.type)) vals.push(v.type);
          });
          return vals.join("|") || "any";
        }
      }
      if (activeTypeParams.has(objT) || activeTypeParams.has(keyT)) {
        return `${objT}[${keyT}]`;
      }
      return "any";
    }
    function evaluateType(rawType, typeEnv = /* @__PURE__ */ new Map(), depth = 0, expanding = /* @__PURE__ */ new Set()) {
      if (!rawType || depth > 24) return "any";
      const t = normalizeTsType(rawType);
      if (!t || t === "any" || t === "unknown" || t === "never" || t === "void" || t === "number" || t === "string" || t === "boolean" || t === "null" || t === "undefined" || t === "object" || t === "symbol" || t === "bigint") {
        return t || "any";
      }
      if (/^asserts\s+/.test(t)) return "void";
      if (/^(?:[A-Za-z_$][\w$]*|this)\s+is\s+/.test(t)) return "boolean";
      if (typeEnv && typeEnv.has(t)) {
        return typeEnv.get(t) || "any";
      }
      const cond = parseTopLevelConditional(t);
      if (cond) {
        const rawCheck = cond.checkType.trim();
        const isNakedTypeParam = /^[A-Za-z_$][\w$]*$/.test(rawCheck) && typeEnv && typeEnv.has(rawCheck);
        const resolvedCheck = evaluateType(rawCheck, typeEnv, depth + 1, expanding);
        if (isNakedTypeParam && resolvedCheck === "never") {
          return "never";
        }
        const checkUnionParts = isNakedTypeParam ? splitTopLevelUnion(resolvedCheck) : [resolvedCheck];
        if (checkUnionParts.length > 1) {
          const results = [];
          for (const member of checkUnionParts) {
            const memberEnv = new Map(typeEnv);
            memberEnv.set(rawCheck, member);
            const m2 = matchConditionalExtends(member, cond.extendsType, memberEnv, depth + 1);
            if (m2.matched) {
              m2.inferred.forEach((v, k) => memberEnv.set(k, v));
              const branchT = evaluateType(cond.trueType, memberEnv, depth + 1, expanding);
              if (branchT !== "never") {
                splitTopLevelUnion(branchT).forEach((u) => {
                  if (!results.includes(u)) results.push(u);
                });
              }
            } else {
              const branchF = evaluateType(cond.falseType, memberEnv, depth + 1, expanding);
              if (branchF !== "never") {
                splitTopLevelUnion(branchF).forEach((u) => {
                  if (!results.includes(u)) results.push(u);
                });
              }
            }
          }
          return results.length === 0 ? "never" : results.join("|");
        }
        const m = matchConditionalExtends(resolvedCheck, cond.extendsType, typeEnv, depth + 1);
        if (m.matched) {
          const trueEnv = new Map(typeEnv);
          m.inferred.forEach((v, k) => trueEnv.set(k, v));
          return evaluateType(cond.trueType, trueEnv, depth + 1, expanding);
        } else {
          return evaluateType(cond.falseType, typeEnv, depth + 1, expanding);
        }
      }
      const unionParts = splitTopLevelUnion(t);
      if (unionParts.length > 1) {
        const evaled = [];
        unionParts.forEach((part) => {
          const r = evaluateType(part, typeEnv, depth + 1, expanding);
          splitTopLevelUnion(r).forEach((u) => {
            if (u !== "never" && !evaled.includes(u)) evaled.push(u);
          });
        });
        return evaled.length === 0 ? "never" : evaled.join("|");
      }
      const interParts = splitTopLevelIntersection(t);
      if (interParts.length > 1) {
        const evaled = interParts.map((p) => evaluateType(p, typeEnv, depth + 1, expanding));
        if (evaled.includes("never")) return "never";
        if (evaled.length === 2 && evaled[1] === "{}") {
          return stripNullableFromType(stripNullableFromType(evaled[0], "null"), "undefined");
        }
        const simplified = evaled.filter(
          (p, idx) => !evaled.some((q, qIdx) => {
            if (qIdx === idx) return false;
            if (p === q) return qIdx < idx;
            const qUnion = splitTopLevelUnion(q);
            return qUnion.length > 0 && qUnion.every((qm) => isLiteralOfPrimitive(qm, p));
          })
        );
        if (simplified.length === 1 && simplified[0]) {
          return simplified[0];
        }
        const mergedProps = /* @__PURE__ */ new Map();
        let allShapes = true;
        for (const ep of simplified) {
          const sh = getInterfaceShape(ep);
          if (!sh) {
            allShapes = false;
            break;
          }
          sh.forEach((v, k) => mergedProps.set(k, v));
        }
        if (allShapes && mergedProps.size > 0) {
          const propStrs = [];
          mergedProps.forEach((v, k) => {
            if (k === "__index__") propStrs.push(`[k: string]:${v.type}`);
            else propStrs.push(`${k}${v.optional ? "?" : ""}:${v.type}`);
          });
          return `{${propStrs.join(";")}}`;
        }
        return simplified.join("&");
      }
      if (t.startsWith("keyof ")) {
        const target = evaluateType(t.slice(6).trim(), typeEnv, depth + 1, expanding);
        if (target === "any") return "string|number|symbol";
        const shape = getInterfaceShape(target);
        if (shape) {
          const keys = Array.from(shape.keys()).filter((k) => k !== "__index__" && !k.startsWith("[")).map((k) => `"${k}"`);
          if (keys.length) return keys.join("|");
          if (shape.has("__index__")) return "string";
          return "never";
        }
        if (target.startsWith("Record<")) {
          const recArgs = splitTopLevelDecl(target.slice(7, -1));
          if (recArgs.length >= 1) return evaluateType(recArgs[0], typeEnv, depth + 1, expanding);
        }
        return "string";
      }
      if (t.startsWith("typeof ")) {
        const exprName = t.slice(7).trim();
        if (env.has(exprName)) return (env.get(exprName) || { type: "any" }).type;
        const sig = fns.get(exprName);
        if (sig) {
          const pStr = sig.params.map((p) => `${p.name}${p.optional ? "?" : ""}:${p.type}`).join(",");
          return `(${pStr})=>${sig.returnType}`;
        }
        return "any";
      }
      if (t.startsWith("{") && t.endsWith("}")) {
        const inner = t.slice(1, -1).trim().replace(/;$/, "").trim();
        const mappedM = inner.match(/^(?:(?:\+|-)?readonly\s*)?\[\s*([A-Za-z_$][\w$]*)\s+in\s+([\s\S]+?)\s*\]([+\-]?)\?\s*:\s*([\s\S]+)$/) || inner.match(/^(?:(?:\+|-)?readonly\s*)?\[\s*([A-Za-z_$][\w$]*)\s+in\s+([\s\S]+?)\s*\]\s*:\s*([\s\S]+)$/);
        if (mappedM && mappedM[1] && mappedM[2]) {
          const kVar = mappedM[1];
          let inClause = mappedM[2].trim();
          let optMod = null;
          let valTemplate = "";
          if (mappedM.length === 5) {
            optMod = mappedM[3] === "-" ? "remove" : "add";
            valTemplate = (mappedM[4] || "").trim();
          } else {
            valTemplate = (mappedM[3] || "").trim();
          }
          let asClause = null;
          let d = 0, ad = 0;
          for (let i = 0; i < inClause.length; i++) {
            const ch = inClause[i];
            if (ch === '"' || ch === "'" || ch === "`") {
              i = skipString(inClause, i) - 1;
              continue;
            }
            if (ch === "(" || ch === "[" || ch === "{") d++;
            else if (ch === ")" || ch === "]" || ch === "}") d = Math.max(0, d - 1);
            else if (ch === "<") ad++;
            else if (ch === ">" && inClause[i - 1] !== "=") ad = Math.max(0, ad - 1);
            else if (d === 0 && ad === 0) {
              const asM = inClause.slice(i).match(/^\s+as(?:\s+|(?=[`"']))/);
              if (asM) {
                asClause = inClause.slice(i + asM[0].length).trim();
                inClause = inClause.slice(0, i).trim();
                break;
              }
            }
          }
          let sourceObjShape = null;
          const keyofM = inClause.match(/^keyof\s+([\s\S]+)$/);
          if (keyofM && keyofM[1]) {
            const srcT = evaluateType(keyofM[1].trim(), typeEnv, depth + 1, expanding);
            sourceObjShape = getInterfaceShape(srcT);
          }
          const keysUnion = evaluateType(inClause, typeEnv, depth + 1, expanding);
          const keyItems = splitTopLevelUnion(keysUnion).filter((k) => k !== "never");
          const outProps = [];
          for (const rawKey of keyItems) {
            if (rawKey === "string" || rawKey === "number" || rawKey === "symbol") continue;
            const mapEnv = new Map(typeEnv);
            const litKey = rawKey.startsWith('"') && rawKey.endsWith('"') ? rawKey : `"${rawKey.replace(/^["']|["']$/g, "")}"`;
            mapEnv.set(kVar, litKey);
            let finalKeyName = litKey.slice(1, -1);
            if (asClause) {
              const remapped = evaluateType(asClause, mapEnv, depth + 1, expanding);
              if (remapped === "never") continue;
              finalKeyName = remapped.replace(/^["']|["']$/g, "");
            }
            const propValType = evaluateType(valTemplate, mapEnv, depth + 1, expanding);
            let isOpt = false;
            const srcProp = sourceObjShape ? sourceObjShape.get(litKey.slice(1, -1)) : void 0;
            if (srcProp) {
              isOpt = Boolean(srcProp.optional);
            }
            if (optMod === "add") isOpt = true;
            else if (optMod === "remove") isOpt = false;
            outProps.push(`${finalKeyName}${isOpt ? "?" : ""}:${propValType}`);
          }
          return `{${outProps.join(";")}}`;
        }
        if (typeEnv && typeEnv.size > 0) {
          return substituteTypeParamsInStr(t, typeEnv);
        }
        return t;
      }
      if (t.startsWith("`") && t.endsWith("`")) {
        const body = t.slice(1, -1);
        let out = "";
        let i = 0;
        while (i < body.length) {
          if (body[i] === "$" && body[i + 1] === "{") {
            const end = body.indexOf("}", i + 2);
            if (end > i) {
              const innerExpr = body.slice(i + 2, end).trim();
              const ev = evaluateType(innerExpr, typeEnv, depth + 1, expanding);
              if (ev.startsWith('"') && ev.endsWith('"')) {
                out += ev.slice(1, -1);
              } else {
                out += `\${${ev}}`;
              }
              i = end + 1;
              continue;
            }
          }
          out += body[i++];
        }
        return out.includes("${") ? `\`${out}\`` : `"${out}"`;
      }
      if (t.endsWith("[]")) {
        const elemRaw = t.slice(0, -2);
        const elemEval = evaluateType(elemRaw, typeEnv, depth + 1, expanding);
        if (elemEval.includes("|") || elemEval.includes("&") || elemEval.includes("=>")) {
          return `(${elemEval})[]`;
        }
        return `${elemEval}[]`;
      }
      if (t.startsWith("[") && t.endsWith("]")) {
        const elems = splitTopLevelDecl(t.slice(1, -1)).map((rawE) => {
          const stripped = stripTupleElementLabel(rawE);
          const isRest = stripped.startsWith("...");
          const isOpt = !isRest && stripped.endsWith("?");
          const core = isRest ? stripped.slice(3).trim() : isOpt ? stripped.slice(0, -1).trim() : stripped;
          const ev = evaluateType(core, typeEnv, depth + 1, expanding);
          return `${isRest ? "..." : ""}${ev}${isOpt ? "?" : ""}`;
        });
        return `[${elems.join(",")}]`;
      }
      if (t.endsWith("]") && !t.startsWith("[")) {
        let openB = -1, d = 0;
        for (let i = t.length - 1; i >= 0; i--) {
          if (t[i] === "]") d++;
          else if (t[i] === "[") {
            d--;
            if (d === 0) {
              openB = i;
              break;
            }
          }
        }
        if (openB > 0) {
          const objPart = t.slice(0, openB).trim();
          const keyPart = t.slice(openB + 1, -1).trim();
          if (keyPart) {
            const objEval = evaluateType(objPart, typeEnv, depth + 1, expanding);
            const keyEval = evaluateType(keyPart, typeEnv, depth + 1, expanding);
            return resolveIndexedAccess(objEval, keyEval, typeEnv, depth + 1);
          }
        }
      }
      const genM = t.match(/^([A-Za-z_$][\w$]*)<([\s\S]+)>$/);
      if (genM && genM[1] && genM[2]) {
        const baseName = genM[1];
        const rawArgs = splitTopLevelDecl(genM[2]).map((a) => evaluateType(a.trim(), typeEnv, depth + 1, expanding));
        const arg0 = rawArgs[0] || "any";
        const arg1 = rawArgs[1] || "any";
        if (baseName === "Array" || baseName === "ReadonlyArray") {
          return arg0.includes("|") ? `(${arg0})[]` : `${arg0}[]`;
        }
        if (baseName === "Partial" && rawArgs.length === 1) {
          const shape = getInterfaceShape(arg0);
          if (shape) {
            const props = [];
            shape.forEach((v, k) => {
              if (k === "__index__") props.push(`[k: string]:${v.type}`);
              else props.push(`${k}?:${v.type}`);
            });
            return `{${props.join(";")}}`;
          }
        }
        if (baseName === "Required" && rawArgs.length === 1) {
          const shape = getInterfaceShape(arg0);
          if (shape) {
            const props = [];
            shape.forEach((v, k) => {
              if (k === "__index__") props.push(`[k: string]:${v.type}`);
              else props.push(`${k}:${v.type}`);
            });
            return `{${props.join(";")}}`;
          }
        }
        if (baseName === "Readonly" && rawArgs.length === 1) {
          if (arg0.endsWith("[]")) return arg0;
          const shape = getInterfaceShape(arg0);
          if (shape) {
            const props = [];
            shape.forEach((v, k) => {
              if (k === "__index__") props.push(`[k: string]:${v.type}`);
              else props.push(`${k}${v.optional ? "?" : ""}:${v.type}`);
            });
            return `{${props.join(";")}}`;
          }
          return arg0;
        }
        if (baseName === "Pick" && rawArgs.length === 2) {
          const shape = getInterfaceShape(arg0);
          if (shape) {
            const keys = new Set(splitTopLevelUnion(arg1).map((k) => k.replace(/^["']|["']$/g, "")));
            const props = [];
            shape.forEach((v, k) => {
              if (keys.has(k)) props.push(`${k}${v.optional ? "?" : ""}:${v.type}`);
            });
            return `{${props.join(";")}}`;
          }
        }
        if (baseName === "Omit" && rawArgs.length === 2) {
          const shape = getInterfaceShape(arg0);
          if (shape) {
            const omitKeys = new Set(splitTopLevelUnion(arg1).map((k) => k.replace(/^["']|["']$/g, "")));
            const props = [];
            shape.forEach((v, k) => {
              if (!omitKeys.has(k) && k !== "__index__") props.push(`${k}${v.optional ? "?" : ""}:${v.type}`);
            });
            return `{${props.join(";")}}`;
          }
        }
        if (baseName === "Record" && rawArgs.length === 2) {
          const keyParts = splitTopLevelUnion(arg0);
          const valT = arg1;
          const allLiteralKeys = keyParts.length > 0 && keyParts.every((k) => k.startsWith('"') && k.endsWith('"') || /^[A-Za-z_$][\w$]*$/.test(k) && k !== "string" && k !== "number" && k !== "symbol");
          if (allLiteralKeys) {
            const props = keyParts.map((k) => `${k.replace(/^["']|["']$/g, "")}:${valT}`);
            return `{${props.join(";")}}`;
          }
          return `Record<${arg0},${valT}>`;
        }
        if (baseName === "Exclude" && rawArgs.length === 2) {
          const uParts = splitTopLevelUnion(arg0);
          const kept = uParts.filter((p) => !isTypeCompatible(p, arg1));
          return kept.length ? kept.join("|") : "never";
        }
        if (baseName === "Extract" && rawArgs.length === 2) {
          const uParts = splitTopLevelUnion(arg0);
          const kept = uParts.filter((p) => isTypeCompatible(p, arg1));
          return kept.length ? kept.join("|") : "never";
        }
        if (baseName === "NonNullable" && rawArgs.length === 1) {
          const uParts = splitTopLevelUnion(arg0).filter((p) => p !== "null" && p !== "undefined" && p !== "void");
          return uParts.length ? uParts.join("|") : "never";
        }
        if (baseName === "ReturnType" && rawArgs.length === 1) {
          const arrowIdx = arg0.lastIndexOf("=>");
          if (arrowIdx > 0) return evaluateType(arg0.slice(arrowIdx + 2).trim(), typeEnv, depth + 1, expanding);
          return "any";
        }
        if (baseName === "Parameters" && rawArgs.length === 1) {
          if (arg0.startsWith("(")) {
            const closeP = findBalancedParen(arg0, 0);
            if (closeP > 0) {
              const pInner = arg0.slice(1, closeP).trim();
              const pTypes = pInner ? splitTopLevelDecl(pInner).map((p) => {
                const colon = p.indexOf(":");
                return colon >= 0 ? evaluateType(p.slice(colon + 1).trim(), typeEnv, depth + 1, expanding) : "any";
              }) : [];
              return `[${pTypes.join(",")}]`;
            }
          }
          return "any[]";
        }
        if (baseName === "Awaited" && rawArgs.length === 1) {
          let cur = arg0;
          let guard = 0;
          while (guard++ < 8) {
            const pm = cur.match(/^Promise<(.+)>$/);
            if (pm && pm[1]) cur = evaluateType(pm[1], typeEnv, depth + 1, expanding);
            else break;
          }
          return cur;
        }
        if ((baseName === "Uppercase" || baseName === "Lowercase" || baseName === "Capitalize" || baseName === "Uncapitalize") && rawArgs.length === 1) {
          if (arg0.startsWith('"') && arg0.endsWith('"')) {
            const inner = arg0.slice(1, -1);
            if (baseName === "Uppercase") return `"${inner.toUpperCase()}"`;
            if (baseName === "Lowercase") return `"${inner.toLowerCase()}"`;
            if (baseName === "Capitalize") return `"${inner.charAt(0).toUpperCase() + inner.slice(1)}"`;
            if (baseName === "Uncapitalize") return `"${inner.charAt(0).toLowerCase() + inner.slice(1)}"`;
          }
          return "string";
        }
        if (genericTypeAliases.has(baseName)) {
          if (expanding.has(baseName)) return `${baseName}<${rawArgs.join(",")}>`;
          const info = genericTypeAliases.get(baseName);
          if (info) {
            const subEnv = new Map(typeEnv);
            const nextExp = new Set(expanding);
            nextExp.add(baseName);
            info.typeParams.forEach((tp, idx) => {
              const argVal = rawArgs[idx] ?? (tp.defaultType ? evaluateType(tp.defaultType, subEnv, depth + 1, nextExp) : "any");
              subEnv.set(tp.name, argVal);
            });
            return evaluateType(info.body, subEnv, depth + 1, nextExp);
          }
        }
        return `${baseName}<${rawArgs.join(",")}>`;
      }
      if (typeAliases.has(t)) {
        if (expanding.has(t)) return t;
        const nextExp = new Set(expanding);
        nextExp.add(t);
        return evaluateType(typeAliases.get(t), typeEnv, depth + 1, nextExp);
      }
      if (t.startsWith("(") && t.includes("=>") && typeEnv && typeEnv.size > 0) {
        return normalizeTsType(substituteTypeParamsInStr(t, typeEnv));
      }
      return t;
    }
    function resolveAlias(t, typeEnv = activeTypeParams) {
      return evaluateType(t, typeEnv, 0);
    }
    function parseObjectShapeLiteral(typeBody, typeEnv = activeTypeParams) {
      const inner = typeBody.trim().replace(/^\{/, "").replace(/\}$/, "").trim();
      const propMap = /* @__PURE__ */ new Map();
      if (!inner) return propMap;
      const members = [];
      let d = 0, ad = 0, cur = "";
      for (let i = 0; i < inner.length; i++) {
        const ch = inner[i];
        if (ch === '"' || ch === "'" || ch === "`") {
          const end = skipString(inner, i);
          cur += inner.slice(i, end);
          i = end - 1;
          continue;
        }
        if (ch === "(" || ch === "[" || ch === "{") d++;
        else if (ch === ")" || ch === "]" || ch === "}") d = Math.max(0, d - 1);
        else if (ch === "<") ad++;
        else if (ch === ">" && inner[i - 1] !== "=") ad = Math.max(0, ad - 1);
        if ((ch === ";" || ch === ",") && d === 0 && ad === 0) {
          if (cur.trim()) members.push(cur.trim());
          cur = "";
        } else {
          cur += ch;
        }
      }
      if (cur.trim()) members.push(cur.trim());
      members.forEach((mem) => {
        const cleaned = mem.replace(/^(?:readonly|public|private|protected|static)\s+/, "");
        const idxM = cleaned.match(/^\[\s*[A-Za-z_$][\w$]*\s*:\s*(?:string|number|symbol|any)\s*\]\s*:\s*([\s\S]+)$/);
        if (idxM && idxM[1]) {
          const rawT = idxM[1].trim();
          propMap.set("__index__", { type: evaluateType(rawT, typeEnv), rawType: rawT, optional: true });
          return;
        }
        const compM = cleaned.match(/^\[\s*([A-Za-z_$][\w$]*)\s*\](\?)?\s*:\s*([\s\S]+)$/);
        if (compM && compM[1] && compM[3]) {
          const rawT = compM[3].trim();
          propMap.set(`[${compM[1]}]`, { type: evaluateType(rawT, typeEnv), rawType: rawT, optional: Boolean(compM[2]) });
          propMap.set("__index__", { type: evaluateType(rawT, typeEnv), rawType: rawT, optional: true });
          return;
        }
        const methM = cleaned.match(/^([A-Za-z_$][\w$]*)(\?)?\s*\(([^)]*)\)\s*:\s*([\s\S]+)$/);
        if (methM && methM[1] && methM[4]) {
          const rawRet = methM[4].trim();
          const fnT = `(${(methM[3] || "").trim()})=>${evaluateType(rawRet, typeEnv)}`;
          propMap.set(methM[1], { type: fnT, rawType: fnT, optional: Boolean(methM[2]) });
          return;
        }
        const m = cleaned.match(/^([A-Za-z_$][\w$]*)(\?)?\s*:\s*([\s\S]+)$/);
        if (m && m[1] && m[3]) {
          const rawT = m[3].trim();
          propMap.set(m[1], { type: evaluateType(rawT, typeEnv), rawType: rawT, optional: Boolean(m[2]) });
        }
      });
      return propMap;
    }
    function getInterfaceShape(typeName) {
      if (!typeName) return null;
      const resolved = evaluateType(typeName, activeTypeParams);
      if (resolved.startsWith("{") && resolved.endsWith("}")) {
        return parseObjectShapeLiteral(resolved);
      }
      const genM = resolved.match(/^([A-Za-z_$][\w$]*)<([\s\S]+)>$/);
      const baseName = genM && genM[1] ? genM[1] : resolved;
      const typeArgs = genM && genM[2] ? splitTopLevelDecl(genM[2]).map((a) => evaluateType(a.trim(), activeTypeParams)) : [];
      const direct = interfaces.get(resolved) || interfaces.get(baseName);
      if (direct) {
        const merged = /* @__PURE__ */ new Map();
        if (classParents.has(resolved) || classParents.has(baseName)) {
          let p = classParents.get(resolved) || classParents.get(baseName);
          const visited = /* @__PURE__ */ new Set([resolved, baseName]);
          while (p && !visited.has(p)) {
            visited.add(p);
            const pShape = interfaces.get(p);
            if (pShape) pShape.forEach((v, k) => {
              if (!merged.has(k)) merged.set(k, { ...v });
            });
            p = classParents.get(p);
          }
        }
        direct.forEach((v, k) => merged.set(k, { ...v }));
        const tParams = interfaceTypeParams.get(baseName);
        if (tParams && tParams.length > 0 && typeArgs.length > 0) {
          const subEnv = new Map(activeTypeParams);
          tParams.forEach((tp, idx) => {
            subEnv.set(tp.name, typeArgs[idx] ?? (tp.defaultType ? evaluateType(tp.defaultType, subEnv) : "any"));
          });
          const instantiated = /* @__PURE__ */ new Map();
          merged.forEach((v, k) => {
            instantiated.set(k, {
              ...v,
              type: evaluateType(v.rawType || v.type, subEnv)
            });
          });
          return instantiated;
        }
        return merged;
      }
      return null;
    }
    function getClassMethodSig(className, methodName) {
      const resolved = evaluateType(className, activeTypeParams);
      const genM = resolved.match(/^([A-Za-z_$][\w$]*)<([\s\S]+)>$/);
      let cur = genM && genM[1] ? genM[1] : resolved;
      const typeArgs = genM && genM[2] ? splitTopLevelDecl(genM[2]).map((a) => evaluateType(a.trim(), activeTypeParams)) : [];
      const tParams = interfaceTypeParams.get(cur);
      const classEnv = new Map(activeTypeParams);
      if (tParams && tParams.length > 0 && typeArgs.length > 0) {
        tParams.forEach((tp, idx) => {
          classEnv.set(tp.name, typeArgs[idx] ?? (tp.defaultType ? evaluateType(tp.defaultType, classEnv) : "any"));
        });
      }
      const visited = /* @__PURE__ */ new Set();
      while (cur && !visited.has(cur)) {
        visited.add(cur);
        const key = cur + "." + methodName;
        const rawSig = fns.get(key);
        if (rawSig) {
          if (classEnv.size === 0) return rawSig;
          return {
            ...rawSig,
            params: rawSig.params.map((p) => ({
              ...p,
              type: evaluateType(p.rawType || p.type, classEnv),
              rawType: substituteTypeParamsInStr(p.rawType || p.type, classEnv)
            })),
            returnType: evaluateType(rawSig.rawReturnType || rawSig.returnType, classEnv),
            rawReturnType: substituteTypeParamsInStr(rawSig.rawReturnType || rawSig.returnType, classEnv)
          };
        }
        cur = classParents.get(cur);
      }
      return null;
    }
    function isTypeCompatible(actualType, expectedType, seenPairs = /* @__PURE__ */ new Set()) {
      if (!actualType || !expectedType) return true;
      const a = evaluateType(actualType, activeTypeParams);
      const e = evaluateType(expectedType, activeTypeParams);
      const pairKey = `${a}==>${e}`;
      if (seenPairs.has(pairKey)) return true;
      const nextSeen = new Set(seenPairs);
      nextSeen.add(pairKey);
      const knownNominals = getKnownNominalTypes();
      if (isTsAssignable(a, e, knownNominals)) return true;
      if (e === "object") {
        if (a.startsWith("{") && a.endsWith("}") || a.endsWith("[]") || a.startsWith("[") && a.endsWith("]") || a.includes("=>") || interfaces.has(a) || a.startsWith("Record<") || a.startsWith("Map<") || a.startsWith("Set<")) {
          return true;
        }
        return false;
      }
      if (enumsSet.has(e)) {
        if (a === e || a.startsWith(e + ".")) return true;
        const vTypes = enumValueTypes.get(e);
        if (vTypes && vTypes.has("number") && !vTypes.has("string")) {
          if (a === "number" || /^[+-]?\d+(?:\.\d+)?$/.test(a)) return true;
        }
        return false;
      }
      const eParts = splitTopLevelUnion(e);
      if (eParts.length > 1) {
        const aParts2 = splitTopLevelUnion(a);
        if (aParts2.length > 1) {
          return aParts2.every((ap) => eParts.some((ep) => isTypeCompatible(ap, ep, nextSeen)));
        }
        return eParts.some((ep) => isTypeCompatible(a, ep, nextSeen));
      }
      const aParts = splitTopLevelUnion(a);
      if (aParts.length > 1) {
        return aParts.every((ap) => isTypeCompatible(ap, e, nextSeen));
      }
      const aParenArr = a.match(/^\((.+)\)\[\]$/);
      const eParenArr = e.match(/^\((.+)\)\[\]$/);
      if ((aParenArr || a.endsWith("[]")) && (eParenArr || e.endsWith("[]"))) {
        const elemA = aParenArr ? aParenArr[1] : a.slice(0, -2);
        const elemE = eParenArr ? eParenArr[1] : e.slice(0, -2);
        return isTypeCompatible(elemA, elemE, nextSeen);
      }
      const recM = e.match(/^Record<([^,]+),([\s\S]+)>$/);
      if (recM && recM[2]) {
        const valExpected = recM[2].trim();
        const aShape = getInterfaceShape(a);
        if (aShape) {
          for (const [, propInfo] of aShape.entries()) {
            if (!isTypeCompatible(propInfo.type, valExpected, nextSeen)) return false;
          }
          return true;
        }
      }
      const eShape = getInterfaceShape(e);
      if (eShape) {
        if (e === "object" || e === "{}") return !["number", "string", "boolean", "null", "undefined", "void", "unknown"].includes(a);
        if (a === "string" || a.startsWith('"')) {
          if (eShape.size === 1 && eShape.has("length") && (eShape.get("length") || { type: "" }).type === "number") return true;
        }
        if (a.endsWith("[]") || a.startsWith("[") && a.endsWith("]")) {
          if (eShape.size === 1 && eShape.has("length") && (eShape.get("length") || { type: "" }).type === "number") return true;
        }
        const aShape = getInterfaceShape(a);
        if (aShape) {
          const indexExpected = eShape.has("__index__") ? (eShape.get("__index__") || { type: "any" }).type : null;
          for (const [propName, propInfo] of eShape.entries()) {
            if (propName === "__index__") continue;
            if (!aShape.has(propName)) {
              if (!propInfo.optional) return false;
            } else {
              const actualPropT = (aShape.get(propName) || { type: "any" }).type;
              if (!isTypeCompatible(actualPropT, propInfo.type, nextSeen)) return false;
            }
          }
          if (indexExpected) {
            for (const [aPropName, aPropInfo] of aShape.entries()) {
              if (aPropName === "__index__") continue;
              if (!eShape.has(aPropName) && !isTypeCompatible(aPropInfo.type, indexExpected, nextSeen)) {
                return false;
              }
            }
          }
          return true;
        }
      }
      return false;
    }
    return {
      evaluateType,
      resolveAlias,
      matchConditionalExtends,
      resolveIndexedAccess,
      parseObjectShapeLiteral,
      getInterfaceShape,
      getClassMethodSig,
      isTypeCompatible
    };
  }

  // src/compiler/tc-infer.ts
  function createTypeInferEngine(ctx, evalEngine) {
    const {
      diagnostics,
      fns,
      interfaceTypeParams,
      interfaces,
      abstractClasses,
      enumsSet,
      enumMembers,
      env,
      activeTypeParams,
      addDiag,
      isKnownIdentifier
    } = ctx;
    const {
      evaluateType,
      resolveAlias,
      matchConditionalExtends,
      resolveIndexedAccess,
      getInterfaceShape,
      getClassMethodSig,
      isTypeCompatible
    } = evalEngine;
    function isExpressionAssignable(expr, actualType, expectedType, lineNum) {
      const e = evaluateType(expectedType, activeTypeParams);
      const a = evaluateType(actualType, activeTypeParams);
      if (isTypeCompatible(a, e)) return true;
      const litT = inferLiteralType(expr);
      if (litT && isTypeCompatible(litT, e)) return true;
      const trimmedExpr = expr ? expr.trim() : "";
      if (trimmedExpr.startsWith("[") && trimmedExpr.endsWith("]")) {
        const eParts = splitTopLevelUnion(e);
        for (const ep of eParts) {
          if (ep.startsWith("[") && ep.endsWith("]")) {
            const tupleTypes = splitTopLevelDecl(ep.slice(1, -1)).map((s) => stripTupleElementLabel(s)).filter(Boolean);
            const elemExprs = splitTopLevel(trimmedExpr.slice(1, -1)).map((s) => s.trim()).filter(Boolean);
            const restIdx = tupleTypes.findIndex((t) => t.startsWith("..."));
            const minRequired = tupleTypes.filter((t) => !t.startsWith("...") && !t.endsWith("?")).length;
            const maxAllowed = restIdx >= 0 ? Infinity : tupleTypes.length;
            if (elemExprs.length >= minRequired && elemExprs.length <= maxAllowed) {
              const allMatch = elemExprs.every((el, idx) => {
                let targetT = "any";
                const restElem = restIdx >= 0 ? tupleTypes[restIdx] : void 0;
                if (restIdx >= 0 && idx >= restIdx && restElem) {
                  const rawRest = restElem.slice(3).trim();
                  targetT = rawRest.endsWith("[]") ? rawRest.slice(0, -2) : rawRest;
                } else if (idx < tupleTypes.length) {
                  const rawElem = tupleTypes[idx] || "any";
                  targetT = rawElem.endsWith("?") ? rawElem.slice(0, -1).trim() : rawElem;
                }
                return isExpressionAssignable(el, inferType(el, lineNum), targetT, lineNum);
              });
              if (allMatch) return true;
            }
          } else if (ep.endsWith("[]")) {
            const elemExpected = ep.slice(0, -2).replace(/^\((.+)\)$/, "$1");
            const elemExprs = splitTopLevel(trimmedExpr.slice(1, -1)).map((s) => s.trim()).filter(Boolean);
            if (elemExprs.every((el) => isExpressionAssignable(el, inferType(el, lineNum), elemExpected, lineNum))) {
              return true;
            }
          }
        }
      }
      if (trimmedExpr.startsWith("{") && trimmedExpr.endsWith("}")) {
        const eParts = splitTopLevelUnion(e);
        for (const ep of eParts) {
          const shape = getInterfaceShape(ep);
          const entries = parseObjectLiteralEntries(trimmedExpr);
          if (shape && entries) {
            let ok = true;
            shape.forEach((propInfo, propName) => {
              if (propName !== "__index__" && !propInfo.optional && !entries.has(propName)) ok = false;
            });
            if (ok) {
              entries.forEach((valExpr, propName) => {
                const expPropT = shape.has(propName) ? (shape.get(propName) || { type: "any" }).type : shape.has("__index__") ? (shape.get("__index__") || { type: "any" }).type : null;
                if (!expPropT && !propName.startsWith("[")) {
                  ok = false;
                } else if (expPropT && !isExpressionAssignable(valExpr, inferType(valExpr, lineNum), expPropT, lineNum)) {
                  ok = false;
                }
              });
            }
            if (ok) return true;
          }
        }
      }
      return false;
    }
    function checkObjectLiteralAgainstShape(objExpr, expectedType, lineNum, contextDesc) {
      const nonNullExpected = stripNullableFromType(stripNullableFromType(evaluateType(expectedType, activeTypeParams), "null"), "undefined");
      const shape = getInterfaceShape(nonNullExpected) || getInterfaceShape(expectedType);
      const entries = parseObjectLiteralEntries(objExpr);
      if (!shape || !entries) return false;
      const indexProp = shape.get("__index__");
      shape.forEach((propInfo, propName) => {
        if (propName === "__index__" || propName.startsWith("[")) return;
        if (!propInfo.optional && !entries.has(propName)) {
          addDiag(lineNum, "TS2741", `\u7C7B\u578B\u4E2D\u7F3A\u5C11\u5C5E\u6027 "${propName}"\uFF0C\u4F46\u7C7B\u578B "${expectedType}" \u4E2D\u9700\u8981\u8BE5\u5C5E\u6027 (${contextDesc})`);
        }
      });
      entries.forEach((valExpr, propName) => {
        const valT = inferType(valExpr, lineNum);
        if (propName.startsWith("[") && propName.endsWith("]")) {
          const keyExpr = propName.slice(1, -1).trim();
          inferType(keyExpr, lineNum);
          const targetProp = shape.get(propName) || indexProp;
          if (targetProp && valT !== "any" && !isExpressionAssignable(valExpr, valT, targetProp.type, lineNum)) {
            addDiag(lineNum, "TS2322", `\u5C5E\u6027 "${propName}" \u7684\u7C7B\u578B "${valT}" \u4E0D\u80FD\u5206\u914D\u7ED9\u7C7B\u578B "${targetProp.type}" (${contextDesc})`);
          }
          return;
        }
        if (!shape.has(propName)) {
          if (indexProp) {
            const expectedPropT = indexProp.type;
            if (valExpr.trim().startsWith("{") && getInterfaceShape(expectedPropT)) {
              checkObjectLiteralAgainstShape(valExpr, expectedPropT, lineNum, `\u5C5E\u6027 "${propName}"`);
            } else if (valT !== "any" && !isExpressionAssignable(valExpr, valT, expectedPropT, lineNum)) {
              addDiag(lineNum, "TS2322", `\u5C5E\u6027 "${propName}" \u7684\u7C7B\u578B "${valT}" \u4E0D\u80FD\u5206\u914D\u7ED9\u7D22\u5F15\u7B7E\u540D\u7C7B\u578B "${expectedPropT}" (${contextDesc})`);
            }
          } else {
            addDiag(lineNum, "TS2353", `\u5BF9\u8C61\u5B57\u9762\u91CF\u53EA\u80FD\u6307\u5B9A\u5DF2\u77E5\u5C5E\u6027\uFF0C\u5E76\u4E14 "${propName}" \u4E0D\u5B58\u5728\u4E8E\u7C7B\u578B "${expectedType}" \u4E2D (${contextDesc})`);
          }
        } else {
          const expectedPropT = (shape.get(propName) || { type: "any" }).type;
          const nonNullPropT = stripNullableFromType(stripNullableFromType(evaluateType(expectedPropT, activeTypeParams), "null"), "undefined");
          if (valExpr.trim().startsWith("{") && (getInterfaceShape(expectedPropT) || getInterfaceShape(nonNullPropT))) {
            checkObjectLiteralAgainstShape(valExpr, nonNullPropT || expectedPropT, lineNum, `\u5C5E\u6027 "${propName}"`);
          } else if (valT !== "any" && !isExpressionAssignable(valExpr, valT, expectedPropT, lineNum)) {
            addDiag(lineNum, "TS2322", `\u5C5E\u6027 "${propName}" \u7684\u7C7B\u578B "${valT}" \u4E0D\u80FD\u5206\u914D\u7ED9\u7C7B\u578B "${expectedPropT}" (${contextDesc})`);
          }
        }
      });
      return true;
    }
    function checkTemplateInterpolations(tpl, lineNum) {
      let i = 1;
      while (i < tpl.length - 1) {
        if (tpl[i] === "\\") {
          i += 2;
          continue;
        }
        if (tpl[i] === "$" && tpl[i + 1] === "{") {
          const endIdx = skipTemplateExpr(tpl, i + 2);
          const innerExpr = tpl.slice(i + 2, endIdx - 1).trim();
          if (innerExpr) inferType(innerExpr, lineNum);
          i = endIdx;
          continue;
        }
        i++;
      }
    }
    function inferType(expr, lineNum) {
      if (!expr) return "any";
      let s = stripInlineCommentSafe(expr).trim().replace(/;$/, "").trim();
      if (!s) return "any";
      while (s.startsWith("(") && findBalancedParen(s, 0) === s.length - 1) {
        s = s.slice(1, -1).trim();
      }
      const yieldM = s.match(/^yield\s*(\*)?\s*([\s\S]*)$/);
      if (yieldM) {
        if (yieldM[2]?.trim()) inferType(yieldM[2].trim(), lineNum);
        return "any";
      }
      if (s.startsWith("<") && !s.includes("=>")) {
        let ad = 1, k = 1;
        while (k < s.length && ad > 0) {
          const ch = s[k];
          if (ch === '"' || ch === "'" || ch === "`") {
            k = skipString(s, k);
            continue;
          }
          if (ch === "<") ad++;
          else if (ch === ">" && s[k - 1] !== "=") ad--;
          k++;
        }
        if (ad === 0 && k < s.length) {
          const castT = s.slice(1, k - 1).trim();
          const restExpr = s.slice(k).trim();
          if (castT && restExpr) {
            inferType(restExpr, lineNum);
            return resolveAlias(castT);
          }
        }
      }
      const hadTrailingBang = s.endsWith("!") && !s.endsWith("!=");
      while (s.endsWith("!") && !s.endsWith("!=")) {
        s = s.slice(0, -1).trim();
      }
      if (hadTrailingBang) {
        const innerT = inferType(s, lineNum);
        return stripNullableFromType(stripNullableFromType(innerT, "null"), "undefined");
      }
      {
        let d = 0, castPos = -1, castKw = "", castTarget = "";
        for (let i = 0; i < s.length; i++) {
          const ch = s[i];
          if (ch === '"' || ch === "'" || ch === "`") {
            i = skipString(s, i) - 1;
            continue;
          }
          if (ch === "(" || ch === "[" || ch === "{") d++;
          else if (ch === ")" || ch === "]" || ch === "}") d--;
          else if (d === 0 && isWS(ch)) {
            const m = s.slice(i).match(/^\s+(as|satisfies)\s+([A-Za-z_$][\w$<>[\]\s|(){}:;,?"']*)$/);
            if (m && m[1] && m[2]) {
              castPos = i;
              castKw = m[1];
              castTarget = m[2].trim();
              break;
            }
          }
        }
        if (castPos > 0 && castTarget) {
          const lhsExpr = s.slice(0, castPos).trim();
          const lhsT = inferType(lhsExpr, lineNum);
          if (castKw === "as" && castTarget === "const") {
            return lhsT;
          }
          const resolvedCast = resolveAlias(castTarget);
          if (castKw === "satisfies") {
            if (lhsExpr.startsWith("{") && getInterfaceShape(resolvedCast)) {
              checkObjectLiteralAgainstShape(lhsExpr, resolvedCast, lineNum, `satisfies "${resolvedCast}"`);
            } else if (!isExpressionAssignable(lhsExpr, lhsT, resolvedCast, lineNum)) {
              addDiag(lineNum, "TS1360", `\u7C7B\u578B "${lhsT}" \u4E0D\u6EE1\u8DB3\u9884\u671F\u7C7B\u578B "${resolvedCast}"`);
            }
            return lhsT;
          }
          return resolvedCast;
        }
      }
      if (/^(true|false)$/.test(s)) return "boolean";
      if (s === "null") return "null";
      if (s === "undefined") return "undefined";
      if (s === "Infinity" || s === "-Infinity" || s === "NaN") return "number";
      if (/^[+-]?\d+(?:\.\d+)?$/.test(s)) return "number";
      if (s.startsWith('"') && s.endsWith('"') || s.startsWith("'") && s.endsWith("'")) {
        return "string";
      }
      if (s.startsWith("`") && s.endsWith("`")) {
        checkTemplateInterpolations(s, lineNum);
        return "string";
      }
      if (/^await\b/.test(s) && (s[5] === " " || s[5] === "	" || s[5] === "(")) {
        const awaitedT = inferType(s.slice(5).trim(), lineNum);
        return evaluateType(`Awaited<${awaitedT}>`, activeTypeParams);
      }
      const promiseCtor = s.match(/^new\s+Promise\s*(?:<\s*([\s\S]+?)\s*>)?\s*\(/);
      if (promiseCtor) {
        const pt = promiseCtor[1] ? resolveAlias(promiseCtor[1]) : "any";
        return `Promise<${pt}>`;
      }
      const mapCtor = s.match(/^new\s+Map\s*(?:<\s*([^,>]+)\s*,\s*([^>]+)\s*>)?\s*\(/);
      if (mapCtor) {
        const kt = mapCtor[1] ? resolveAlias(mapCtor[1]) : "any";
        const vt = mapCtor[2] ? resolveAlias(mapCtor[2]) : "any";
        return `Map<${kt},${vt}>`;
      }
      const setCtor = s.match(/^new\s+Set\s*(?:<\s*([^>]+)\s*>)?\s*\(/);
      if (setCtor) {
        const vt = setCtor[1] ? resolveAlias(setCtor[1]) : "any";
        return `Set<${vt}>`;
      }
      const arrFill = s.match(/^(?:new\s+)?Array\s*(?:<\s*([^>]+)\s*>)?\s*\([^)]*\)\s*\.fill\s*\(([\s\S]+)\)$/);
      if (arrFill) {
        const explicitT = arrFill[1] ? resolveAlias(arrFill[1]) : null;
        const elemT = explicitT || inferType(arrFill[2], lineNum);
        return elemT + "[]";
      }
      const arrCtor = s.match(/^(?:new\s+)?Array\s*(?:<\s*([^>]+)\s*>)?\s*\([^)]*\)$/);
      if (arrCtor) {
        const explicitT = arrCtor[1] ? resolveAlias(arrCtor[1]) : "any";
        return explicitT + "[]";
      }
      const newClassM = s.match(/^new\s+([A-Za-z_$][\w$]*)\s*(?:<([\s\S]*)>)?\s*\(([\s\S]*)\)$/);
      if (newClassM && newClassM[1] && !/^(Map|Set|Array|Promise)$/.test(newClassM[1]) && findBalancedParen(s, s.lastIndexOf("(")) === s.length - 1) {
        const afterNew = s.replace(/^new\s+/, "");
        const idInfo = readIdent(afterNew, 0);
        if (idInfo) {
          const clsName = idInfo.name;
          if (abstractClasses.has(clsName)) {
            addDiag(lineNum, "TS2511", `\u65E0\u6CD5\u521B\u5EFA\u62BD\u8C61\u7C7B "${clsName}" \u7684\u5B9E\u4F8B`);
          }
          let pIdx = idInfo.end;
          while (pIdx < afterNew.length && isWS(afterNew[pIdx])) pIdx++;
          let explicitTypeArgs = [];
          if (afterNew[pIdx] === "<") {
            let ad = 1, k = pIdx + 1;
            while (k < afterNew.length && ad > 0) {
              const ch = afterNew[k];
              if (ch === '"' || ch === "'" || ch === "`") {
                k = skipString(afterNew, k);
                continue;
              }
              if (ch === "<") ad++;
              else if (ch === ">" && afterNew[k - 1] !== "=") ad--;
              k++;
            }
            if (ad === 0) {
              explicitTypeArgs = splitTopLevelDecl(afterNew.slice(pIdx + 1, k - 1)).map((a) => a.trim()).filter(Boolean);
              pIdx = k;
              while (pIdx < afterNew.length && isWS(afterNew[pIdx])) pIdx++;
            }
          }
          if (afterNew[pIdx] === "(" && findBalancedParen(afterNew, pIdx) === afterNew.length - 1) {
            const argsRaw = afterNew.slice(pIdx + 1, -1).trim();
            const args = argsRaw ? splitTopLevel(argsRaw).map((a) => a.trim()) : [];
            const argTypes = args.map((a) => inferType(a, lineNum));
            const clsTParams = interfaceTypeParams.get(clsName) || [];
            const ctorSig = getClassMethodSig(clsName, "constructor");
            const callEnv = /* @__PURE__ */ new Map();
            if (ctorSig) {
              const effectiveSig = {
                ...ctorSig,
                typeParams: ctorSig.typeParams && ctorSig.typeParams.length ? ctorSig.typeParams : clsTParams
              };
              instantiateAndCheckCall(effectiveSig, explicitTypeArgs, args, argTypes, `\u6784\u9020\u51FD\u6570 "new ${clsName}"`, lineNum, callEnv);
            } else if (clsTParams.length > 0 && explicitTypeArgs.length > 0) {
              clsTParams.forEach((tp, idx) => {
                const argVal = idx < explicitTypeArgs.length ? evaluateType(explicitTypeArgs[idx]) : tp.defaultType ? evaluateType(tp.defaultType, callEnv) : "any";
                callEnv.set(tp.name, argVal);
              });
              clsTParams.forEach((tp) => {
                if (tp.constraint) {
                  const cEval = evaluateType(tp.constraint, callEnv);
                  const bVal = callEnv.get(tp.name);
                  if (bVal && bVal !== "any" && !isTypeCompatible(bVal, cEval)) {
                    addDiag(lineNum, "TS2344", `\u7C7B\u578B "${bVal}" \u4E0D\u6EE1\u8DB3\u6CDB\u578B\u7EA6\u675F "${cEval}" ("new ${clsName}" \u7684\u7C7B\u578B\u53C2\u6570 "${tp.name}")`);
                  }
                }
              });
            }
            if (clsTParams.length > 0) {
              const instArgs = clsTParams.map((tp, idx) => {
                if (callEnv.has(tp.name)) return callEnv.get(tp.name) || "any";
                if (idx < explicitTypeArgs.length) return evaluateType(explicitTypeArgs[idx]);
                return tp.defaultType ? evaluateType(tp.defaultType) : "any";
              });
              return `${clsName}<${instArgs.join(",")}>`;
            }
            return resolveAlias(clsName);
          }
        }
      }
      const newClassPrefixM = s.match(/^new\s+([A-Za-z_$][\w$]*)\s*(?:<[^>]*>)?\s*\(/);
      if (newClassPrefixM && newClassPrefixM[1] && !/^(Map|Set|Array)$/.test(newClassPrefixM[1])) {
        const openIdx = s.indexOf("(");
        const closeIdx = findBalancedParen(s, openIdx);
        if (closeIdx === s.length - 1) {
          if (abstractClasses.has(newClassPrefixM[1])) {
            addDiag(lineNum, "TS2511", `\u65E0\u6CD5\u521B\u5EFA\u62BD\u8C61\u7C7B "${newClassPrefixM[1]}" \u7684\u5B9E\u4F8B`);
          }
          return resolveAlias(newClassPrefixM[1]);
        }
      }
      if (s.startsWith("[") && s.endsWith("]") && findBalancedParen(s, 0) === s.length - 1) {
        const inner = s.slice(1, -1).trim();
        if (!inner) return "any[]";
        const elems = splitTopLevel(inner).map((e) => inferType(e, lineNum));
        const concrete = elems.filter((t) => t !== "any");
        if (!concrete.length) return "any[]";
        const unique = [];
        concrete.forEach((t) => {
          splitTopLevelUnion(normalizeTsType(t)).forEach((u) => {
            if (!unique.includes(u)) unique.push(u);
          });
        });
        if (unique.length === 1) return unique[0] + "[]";
        return "(" + unique.join("|") + ")[]";
      }
      if (s.startsWith("{") && s.endsWith("}") && findBalancedParen(s, 0) === s.length - 1) {
        const entries = parseObjectLiteralEntries(s);
        if (entries) {
          const shapeParts = [];
          entries.forEach((vExpr, kName) => {
            const vt = inferType(vExpr, lineNum);
            shapeParts.push(`${kName}:${vt}`);
          });
          return `{${shapeParts.join(";")}}`;
        }
        return "object";
      }
      const arrowExprM = s.match(/^(?:async\s+)?(?:<[^>]*>\s*)?(?:\(([^)]*)\)|([A-Za-z_$][\w$]*))\s*(?::\s*[^=]+?)?\s*=>\s*([\s\S]+)$/);
      if (arrowExprM && arrowExprM[3]) {
        const rawParamStr = arrowExprM[1] !== void 0 ? arrowExprM[1] : arrowExprM[2];
        const bodyStr = arrowExprM[3].trim();
        const saved = /* @__PURE__ */ new Map();
        const boundNames = /* @__PURE__ */ new Set();
        splitTopLevelDecl(rawParamStr || "").forEach((p) => {
          const cleanP = p.trim().replace(/^\.\.\./, "");
          const pm = cleanP.match(/^([A-Za-z_$][\w$]*)(\?)?(?:\s*:\s*([^=]+))?/);
          if (pm && pm[1]) {
            const pName = pm[1];
            const pType = pm[3] ? resolveAlias(pm[3].trim()) : "any";
            boundNames.add(pName);
            saved.set(pName, env.get(pName));
            env.set(pName, { type: pType, isConst: false, line: lineNum, declaredType: pType });
          } else {
            const dSet = /* @__PURE__ */ new Set();
            extractBindingNames(cleanP, dSet);
            dSet.forEach((pName) => {
              boundNames.add(pName);
              saved.set(pName, env.get(pName));
              env.set(pName, { type: "any", isConst: false, line: lineNum, declaredType: "any" });
            });
          }
        });
        let retT = "any";
        if (!bodyStr.startsWith("{")) {
          retT = inferType(bodyStr, lineNum);
        }
        boundNames.forEach((pName) => {
          const prev = saved.get(pName);
          if (prev !== void 0) env.set(pName, prev);
          else env.delete(pName);
        });
        return retT;
      }
      {
        let qIdx = -1, cIdx = -1, d = 0;
        for (let i = 0; i < s.length; i++) {
          const ch = s[i];
          if (ch === '"' || ch === "'" || ch === "`") {
            i = skipString(s, i) - 1;
            continue;
          }
          if (ch === "(" || ch === "[" || ch === "{") d++;
          else if (ch === ")" || ch === "]" || ch === "}") d--;
          else if (d === 0 && ch === "?" && s[i + 1] !== "." && s[i + 1] !== "?") {
            if (qIdx < 0) qIdx = i;
          } else if (d === 0 && ch === ":" && qIdx >= 0 && cIdx < 0) {
            cIdx = i;
            break;
          }
        }
        if (qIdx > 0 && cIdx > qIdx) {
          const condExpr = s.slice(0, qIdx).trim();
          inferType(condExpr, lineNum);
          const eqNullM = condExpr.match(/^([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*(===|!==)\s*(null|undefined)$/);
          let savedNarrow = null;
          const applyNarrow = (targetExpr, nullKind) => {
            const baseT = inferType(targetExpr, lineNum);
            const narrowedT = stripNullableFromType(baseT, nullKind);
            savedNarrow = { key: targetExpr, prev: env.get(targetExpr) };
            env.set(targetExpr, { type: narrowedT, isConst: false, line: lineNum, declaredType: narrowedT });
          };
          const restoreNarrow = () => {
            if (!savedNarrow) return;
            if (savedNarrow.prev !== void 0) env.set(savedNarrow.key, savedNarrow.prev);
            else env.delete(savedNarrow.key);
            savedNarrow = null;
          };
          if (eqNullM && eqNullM[1] && eqNullM[3] && eqNullM[2] === "!==") applyNarrow(eqNullM[1], eqNullM[3]);
          const t1 = inferType(s.slice(qIdx + 1, cIdx), lineNum);
          if (eqNullM && eqNullM[2] === "!==") restoreNarrow();
          if (eqNullM && eqNullM[1] && eqNullM[3] && eqNullM[2] === "===") applyNarrow(eqNullM[1], eqNullM[3]);
          const t2 = inferType(s.slice(cIdx + 1), lineNum);
          if (eqNullM && eqNullM[2] === "===") restoreNarrow();
          if (t1 === t2) return t1;
          if (isTsAssignable(t1, t2)) return t2;
          if (isTsAssignable(t2, t1)) return t1;
          return `${t1}|${t2}`;
        }
      }
      {
        let d = 0;
        for (let i = 0; i < s.length - 1; i++) {
          const ch = s[i];
          if (ch === '"' || ch === "'" || ch === "`") {
            i = skipString(s, i) - 1;
            continue;
          }
          if (ch === "(" || ch === "[" || ch === "{") d++;
          else if (ch === ")" || ch === "]" || ch === "}") d--;
          else if (d === 0 && (ch === "|" && s[i + 1] === "|" || ch === "?" && s[i + 1] === "?")) {
            const leftT = inferType(s.slice(0, i), lineNum);
            const rightT = inferType(s.slice(i + 2), lineNum);
            if (leftT.endsWith("|undefined")) {
              const baseL = leftT.replace(/\|undefined$/, "");
              if (isTsAssignable(rightT, baseL)) return baseL;
            }
            return rightT !== "any" ? rightT : leftT;
          } else if (d === 0 && ch === "&" && s[i + 1] === "&") {
            inferType(s.slice(0, i), lineNum);
            inferType(s.slice(i + 2), lineNum);
            return "boolean";
          }
        }
      }
      {
        let d = 0;
        for (let i = 0; i < s.length; i++) {
          const ch = s[i];
          if (ch === '"' || ch === "'" || ch === "`") {
            i = skipString(s, i) - 1;
            continue;
          }
          if (ch === "(" || ch === "[" || ch === "{") d++;
          else if (ch === ")" || ch === "]" || ch === "}") d--;
          else if (d === 0) {
            if (ch === "<" || ch === ">") {
              if (s[i + 1] === ch || s[i - 1] === ch) continue;
              if (ch === "<") {
                const before = s.slice(0, i).trim();
                if (/(?:^|\bnew\s+|\.)[A-Za-z_$][\w$]*$/.test(before)) {
                  let gd = 1, k = i + 1;
                  while (k < s.length && gd > 0) {
                    if (s[k] === "<") gd++;
                    else if (s[k] === ">" && s[k - 1] !== "=") gd--;
                    k++;
                  }
                  if (gd === 0 && /^\s*\(/.test(s.slice(k))) {
                    i = k - 1;
                    continue;
                  }
                }
              }
            }
            const rest = s.slice(i);
            const m = rest.match(/^(===|!==|<=|>=|==|!=|<|>)(?!=)/);
            if (m && m[1] && i > 0) {
              const op = m[1];
              const lhs = s.slice(0, i).trim();
              const rhs = s.slice(i + op.length).trim();
              if (lhs && rhs) {
                const lt = inferType(lhs, lineNum);
                const rt = inferType(rhs, lineNum);
                const prims = ["number", "string", "boolean"];
                if (prims.includes(lt) && prims.includes(rt) && lt !== rt) {
                  addDiag(lineNum, "TS2367", `\u6B64\u6BD4\u8F83\u8868\u8FBE\u5F0F\u7C7B\u578B\u4E0D\u5339\u914D\uFF1A\u65E0\u6CD5\u6BD4\u8F83\u7C7B\u578B "${lt}" \u4E0E "${rt}"`);
                }
                return "boolean";
              }
            }
          }
        }
      }
      {
        let d = 0;
        for (let i = s.length - 1; i > 0; i--) {
          const ch = s[i];
          if (ch === ")" || ch === "]" || ch === "}") d++;
          else if (ch === "(" || ch === "[" || ch === "{") d--;
          else if (d === 0 && (ch === ">" || ch === "<") && s[i - 1] === ch) {
            const shiftStart = ch === ">" && i >= 2 && s[i - 2] === ">" ? i - 2 : i - 1;
            const lhs = s.slice(0, shiftStart).trim();
            const rhs = s.slice(i + 1).trim();
            if (lhs && rhs) {
              inferType(lhs, lineNum);
              inferType(rhs, lineNum);
              return "number";
            }
            i = shiftStart;
          } else if (d === 0 && (ch === "+" || ch === "-" || ch === "*" || ch === "/" || ch === "%")) {
            if (s[i - 1] === ch || s[i + 1] === ch || s[i + 1] === "=" || s[i - 1] === "=") continue;
            const lhs = s.slice(0, i).trim();
            const rhs = s.slice(i + 1).trim();
            if (!lhs || !rhs || /[+\-*/%&|^<>?:=(,]$/.test(lhs)) continue;
            const lt = inferType(lhs, lineNum);
            const rt = inferType(rhs, lineNum);
            if (lt === "unknown" || rt === "unknown") {
              addDiag(lineNum, "TS18046", `\u5BF9\u8C61\u7684\u7C7B\u578B\u4E3A "unknown"`);
            }
            if (ch === "+") {
              if (lt === "string" || rt === "string") return "string";
              if (lt === "number" && rt === "number") return "number";
              if (lt === "number" && rt === "boolean" || lt === "boolean" && rt === "number" || lt.endsWith("[]") || rt.endsWith("[]")) {
                addDiag(lineNum, "TS2365", `\u8FD0\u7B97\u7B26 "+" \u4E0D\u80FD\u5E94\u7528\u4E8E\u7C7B\u578B "${lt}" \u548C "${rt}"`);
              }
              return lt === "number" || rt === "number" ? "number" : "any";
            } else {
              const badL = lt === "string" || lt === "boolean" || lt.endsWith("[]");
              const badR = rt === "string" || rt === "boolean" || rt.endsWith("[]");
              if (badL || badR) {
                addDiag(lineNum, "TS2362", `\u7B97\u672F\u8FD0\u7B97\u7B26 "${ch}" \u7684\u64CD\u4F5C\u6570\u7C7B\u578B\u5FC5\u987B\u4E3A "number"\uFF0C\u4E0D\u80FD\u4E3A "${badL ? lt : rt}"`);
              }
              return "number";
            }
          }
        }
      }
      if (s.startsWith("!")) return "boolean";
      if ((s.startsWith("-") || s.startsWith("+")) && s.length > 1) {
        const ut = inferType(s.slice(1), lineNum);
        if (ut === "string" || ut === "boolean") {
          addDiag(lineNum, "TS2362", `\u4E00\u5143\u7B97\u672F\u8FD0\u7B97\u7B26\u4E0D\u80FD\u5E94\u7528\u4E8E\u7C7B\u578B "${ut}"`);
        }
        return "number";
      }
      const newChainCallM = s.match(/^(new\s+[A-Za-z_$][\w$]*\s*(?:<[^>]*>)?\s*\([^)]*\))\.([A-Za-z_$][\w$]*)\s*\(([\s\S]*)\)$/);
      if (newChainCallM && newChainCallM[1] && newChainCallM[2] && newChainCallM[3] !== void 0 && findBalancedParen(s, s.lastIndexOf("(")) === s.length - 1) {
        const objType = inferType(newChainCallM[1], lineNum);
        const method = newChainCallM[2];
        const argsRaw = newChainCallM[3].trim();
        const args = argsRaw ? splitTopLevel(argsRaw).map((a) => a.trim()) : [];
        const argTypes = args.map((a) => inferType(a, lineNum));
        const mSig = getClassMethodSig(objType, method);
        if (mSig) {
          return instantiateAndCheckCall(mSig, [], args, argTypes, `\u65B9\u6CD5 "${objType}.${method}"`, lineNum);
        }
        return "any";
      }
      const callPrefixM = s.match(/^([A-Za-z_$][\w$!]*(?:(?:\?\.|\.)[A-Za-z_$][\w$!]*)*)\s*(?:<([\s\S]+)>)?\s*\(/);
      if (callPrefixM && callPrefixM[1]) {
        const callee = callPrefixM[1];
        let scanPos = callee.length;
        while (scanPos < s.length && isWS(s[scanPos])) scanPos++;
        let explicitTypeArgs = [];
        if (s[scanPos] === "<") {
          let ad = 1, k = scanPos + 1;
          while (k < s.length && ad > 0) {
            const ch = s[k];
            if (ch === '"' || ch === "'" || ch === "`") {
              k = skipString(s, k);
              continue;
            }
            if (ch === "<") ad++;
            else if (ch === ">" && s[k - 1] !== "=") ad--;
            k++;
          }
          if (ad === 0) {
            explicitTypeArgs = splitTopLevelDecl(s.slice(scanPos + 1, k - 1)).map((a) => a.trim()).filter(Boolean);
            scanPos = k;
            while (scanPos < s.length && isWS(s[scanPos])) scanPos++;
          }
        }
        if (s[scanPos] === "(" && findBalancedParen(s, scanPos) === s.length - 1) {
          const argsRaw = s.slice(scanPos + 1, -1).trim();
          const args = argsRaw ? splitTopLevel(argsRaw).map((a) => a.trim()) : [];
          const argTypes = args.map((a) => inferType(a, lineNum));
          if (callee === "checkpoint" || callee === "\u65AD\u70B9") {
            return "void";
          }
          if (/^Math\.(max|min|abs|floor|ceil|round|pow|sqrt|trunc|sign)$/.test(callee)) {
            argTypes.forEach((at, idx) => {
              if (at !== "any" && !isTsAssignable(at, "number")) {
                addDiag(lineNum, "TS2345", `\u8C03\u7528 "${callee}" \u7684\u7B2C ${idx + 1} \u4E2A\u53C2\u6570\u7C7B\u578B "${at}" \u4E0D\u80FD\u8D4B\u7ED9\u7C7B\u578B "number"`);
              }
            });
            return "number";
          }
          if (callee === "Number" || callee === "parseInt" || callee === "parseFloat") return "number";
          if (callee === "String" || callee === "JSON.stringify") return "string";
          if (callee === "Boolean" || callee === "Array.isArray") return "boolean";
          if (callee === "Symbol") return "symbol";
          if (callee === "Promise.resolve") {
            const t0 = explicitTypeArgs[0] ? evaluateType(explicitTypeArgs[0]) : argTypes[0] || "void";
            return `Promise<${t0}>`;
          }
          if (callee === "Promise.reject") return "Promise<never>";
          if (callee === "Promise.all") return "Promise<any[]>";
          if (callee === "Promise.race") return "Promise<any>";
          if (callee === "sleep") {
            const sleepT = explicitTypeArgs[0] ? evaluateType(explicitTypeArgs[0]) : argTypes[1] || "void";
            return `Promise<${sleepT}>`;
          }
          if (callee === "setTimeout") return "number";
          if (callee === "clearTimeout" || callee === "queueMicrotask") return "void";
          const dotIdx = callee.lastIndexOf(".");
          if (dotIdx > 0) {
            const isOptChain = callee[dotIdx - 1] === "?";
            const objName = callee.slice(0, isOptChain ? dotIdx - 1 : dotIdx);
            const method = callee.slice(dotIdx + 1).replace(/!+$/, "");
            const rawObjType = inferType(objName, lineNum);
            if (rawObjType === "unknown") {
              addDiag(lineNum, "TS18046", `"${objName}" \u7684\u7C7B\u578B\u4E3A "unknown"`);
              return "any";
            }
            if (!isOptChain && !objName.endsWith("!")) {
              const uParts = splitTopLevelUnion(rawObjType);
              if (uParts.includes("undefined")) {
                addDiag(lineNum, "TS18048", `"${objName}" \u53EF\u80FD\u4E3A "undefined"`);
              } else if (uParts.includes("null")) {
                addDiag(lineNum, "TS18047", `"${objName}" \u53EF\u80FD\u4E3A "null"`);
              }
            }
            const objType = stripNullableFromType(stripNullableFromType(rawObjType, "null"), "undefined");
            const mapM = objType.match(/^Map<([^,]+),(.+)>$/);
            if (mapM && mapM[1] && mapM[2]) {
              const kt = mapM[1], vt = mapM[2];
              if (method === "get" || method === "has" || method === "delete") {
                if (argTypes[0] && !isExpressionAssignable(args[0], argTypes[0], kt, lineNum)) {
                  addDiag(lineNum, "TS2345", `"${objName}.${method}" \u7684\u952E\u53C2\u6570\u7C7B\u578B "${argTypes[0]}" \u4E0D\u80FD\u8D4B\u7ED9\u7C7B\u578B "${kt}"`);
                }
                return method === "get" ? `${vt}|undefined` : "boolean";
              }
              if (method === "set") {
                if (argTypes[0] && !isExpressionAssignable(args[0], argTypes[0], kt, lineNum)) {
                  addDiag(lineNum, "TS2345", `"${objName}.set" \u7684\u952E\u53C2\u6570\u7C7B\u578B "${argTypes[0]}" \u4E0D\u80FD\u8D4B\u7ED9\u7C7B\u578B "${kt}"`);
                }
                if (argTypes[1] && !isExpressionAssignable(args[1], argTypes[1], vt, lineNum)) {
                  addDiag(lineNum, "TS2345", `"${objName}.set" \u7684\u503C\u53C2\u6570\u7C7B\u578B "${argTypes[1]}" \u4E0D\u80FD\u8D4B\u7ED9\u7C7B\u578B "${vt}"`);
                }
                return objType;
              }
            }
            const setM = objType.match(/^Set<(.+)>$/);
            if (setM && setM[1]) {
              const vt = setM[1];
              if (method === "add" || method === "has" || method === "delete") {
                if (argTypes[0] && !isExpressionAssignable(args[0], argTypes[0], vt, lineNum)) {
                  addDiag(lineNum, "TS2345", `"${objName}.${method}" \u7684\u53C2\u6570\u7C7B\u578B "${argTypes[0]}" \u4E0D\u80FD\u8D4B\u7ED9\u7C7B\u578B "${vt}"`);
                }
                return method === "add" ? objType : "boolean";
              }
            }
            if (objType.endsWith("[]")) {
              const elemT = objType.slice(0, -2);
              if (method === "push" || method === "unshift") {
                argTypes.forEach((at, idx) => {
                  if (!isExpressionAssignable(args[idx], at, elemT, lineNum)) {
                    addDiag(lineNum, "TS2345", `\u6570\u7EC4 "${objName}.${method}" \u7684\u53C2\u6570\u7C7B\u578B "${at}" \u4E0D\u80FD\u8D4B\u7ED9\u5143\u7D20\u7C7B\u578B "${elemT}"`);
                  }
                });
                return "number";
              }
              if (method === "pop" || method === "shift") return elemT;
              if (method === "includes") return "boolean";
              if (method === "slice" || method === "concat" || method === "filter") return objType;
              if (method === "join") return "string";
            }
            if (objType === "string") {
              if (method === "slice" || method === "substring" || method === "trim" || method === "toLowerCase" || method === "toUpperCase") return "string";
              if (method === "includes" || method === "startsWith" || method === "endsWith") return "boolean";
              if (method === "indexOf" || method === "charCodeAt") return "number";
            }
            if (objType === "__FsPromises__" || objName.endsWith(".promises") && inferType(objName.slice(0, -9).trim(), lineNum) === "__FsModule__") {
              if (method === "readFile") return "Promise<string>";
              if (method === "writeFile" || method === "appendFile" || method === "mkdir" || method === "unlink" || method === "rm" || method === "access" || method === "copyFile" || method === "rename") return "Promise<void>";
              if (method === "readdir") return "Promise<string[]>";
              if (method === "exists") return "Promise<boolean>";
              if (method === "stat") return "Promise<any>";
            }
            if (objType === "__FsModule__") {
              if (method === "readFileSync") return "string";
              if (method === "writeFileSync" || method === "appendFileSync" || method === "mkdirSync" || method === "unlinkSync" || method === "rmSync" || method === "copyFileSync" || method === "renameSync") return "void";
              if (method === "readdirSync") return "string[]";
              if (method === "existsSync") return "boolean";
              if (method === "statSync") return "any";
            }
            const classMethodSig = getClassMethodSig(objType, method);
            if (classMethodSig) {
              return instantiateAndCheckCall(classMethodSig, explicitTypeArgs, args, argTypes, `\u65B9\u6CD5 "${objName}.${method}"`, lineNum);
            }
            const objShape = getInterfaceShape(objType);
            if (objShape && objShape.has(method)) {
              const propType = (objShape.get(method) || { type: "" }).type || "";
              const arrowPos = propType.lastIndexOf("=>");
              if (arrowPos > 0) {
                return resolveAlias(propType.slice(arrowPos + 2).trim());
              }
            }
          }
          const sig = fns.get(callee);
          if (sig) {
            return instantiateAndCheckCall(sig, explicitTypeArgs, args, argTypes, `\u51FD\u6570 "${callee}"`, lineNum);
          }
          if (dotIdx < 0 && !isKnownIdentifier(callee)) {
            addDiag(lineNum, "TS2304", `\u627E\u4E0D\u5230\u540D\u79F0 "${callee}"`);
          }
          return "any";
        }
      }
      const bracketOpen = s.indexOf("[");
      if (bracketOpen > 0 && s.endsWith("]")) {
        let curBase = s.slice(0, bracketOpen).trim();
        const isOptBracket = curBase.endsWith("?.");
        if (isOptBracket) curBase = curBase.slice(0, -2).trim();
        let curType = inferType(curBase, lineNum);
        if (curType === "unknown") {
          addDiag(lineNum, "TS18046", `"${curBase}" \u7684\u7C7B\u578B\u4E3A "unknown"`);
          return "any";
        }
        if (!isOptBracket && !curBase.endsWith("!")) {
          const uParts = splitTopLevelUnion(curType);
          if (uParts.includes("undefined")) addDiag(lineNum, "TS18048", `"${curBase}" \u53EF\u80FD\u4E3A "undefined"`);
          else if (uParts.includes("null")) addDiag(lineNum, "TS18047", `"${curBase}" \u53EF\u80FD\u4E3A "null"`);
        }
        curType = stripNullableFromType(stripNullableFromType(curType, "null"), "undefined");
        let pos = bracketOpen;
        while (pos < s.length && s[pos] === "[") {
          const closeB = findBalancedParen(s, pos);
          if (closeB < 0) break;
          const idxExpr = s.slice(pos + 1, closeB).trim();
          const idxType = inferType(idxExpr, lineNum);
          const litIdx = inferLiteralType(idxExpr);
          if (idxType === "string" || idxType === "boolean") {
            if (curType.endsWith("[]") || curType === "string") {
              addDiag(lineNum, "TS2538", `\u6570\u7EC4\u6216\u5B57\u7B26\u4E32\u7684\u7D22\u5F15\u7C7B\u578B\u5FC5\u987B\u4E3A "number"\uFF0C\u4E0D\u80FD\u4F7F\u7528\u7C7B\u578B "${idxType}"`);
            }
          }
          const shape = getInterfaceShape(curType);
          if (curType.endsWith("[]")) {
            curType = curType.slice(0, -2);
          } else if (curType.startsWith("[") && curType.endsWith("]") && litIdx && /^\d+$/.test(litIdx)) {
            curType = resolveIndexedAccess(curType, litIdx, /* @__PURE__ */ new Map(), 0);
          } else if (curType === "string") {
            curType = "string";
          } else if (litIdx && shape) {
            curType = resolveIndexedAccess(curType, litIdx, /* @__PURE__ */ new Map(), 0);
          } else if (shape && shape.has(`[${idxExpr}]`)) {
            curType = (shape.get(`[${idxExpr}]`) || { type: "any" }).type;
          } else if (shape && shape.has("__index__")) {
            curType = (shape.get("__index__") || { type: "any" }).type;
          } else if (activeTypeParams.has(curType) && activeTypeParams.has(idxType)) {
            curType = `${curType}[${idxType}]`;
          } else {
            curType = "any";
          }
          pos = closeB + 1;
        }
        if (pos === s.length) return curType;
      }
      if (/^[A-Za-z_$][\w$]*!*(?:(?:\?\.|\.)[A-Za-z_$][\w$]*!*)+$/.test(s)) {
        if (env.has(s)) return (env.get(s) || { type: "any" }).type;
        const tokens = [];
        let rem = s;
        let nextOpt = false;
        while (rem.length > 0) {
          const m = rem.match(/^([A-Za-z_$][\w$]*)(!*)(\?\.|\.)?/);
          if (!m || !m[1]) break;
          tokens.push({ name: m[1], hasBang: Boolean(m[2]), optChainBefore: nextOpt });
          nextOpt = m[3] === "?.";
          rem = rem.slice(m[0].length);
        }
        const firstTok = tokens[0];
        if (tokens.length >= 2 && firstTok) {
          const firstBase = firstTok.name;
          if (!isKnownIdentifier(firstBase)) {
            addDiag(lineNum, "TS2304", `\u627E\u4E0D\u5230\u540D\u79F0 "${firstBase}"\uFF08\u53D8\u91CF\u672A\u58F0\u660E\uFF0C\u8BF7\u4F7F\u7528 let \u6216 const \u58F0\u660E\uFF09`);
            return "any";
          }
          if (enumsSet.has(firstBase)) {
            const secondTok = tokens[1];
            const memberProp = secondTok ? secondTok.name : "";
            const memSet = enumMembers.get(firstBase);
            if (memSet && memSet.size > 0 && !memSet.has(memberProp)) {
              addDiag(lineNum, "TS2339", `\u7C7B\u578B "typeof ${firstBase}" \u4E0A\u4E0D\u5B58\u5728\u5C5E\u6027 "${memberProp}"`);
            }
            return firstBase;
          }
          let curType = env.has(firstBase) ? (env.get(firstBase) || { type: "any" }).type : interfaces.has(firstBase) ? firstBase : "any";
          if (firstTok.hasBang) {
            curType = stripNullableFromType(stripNullableFromType(curType, "null"), "undefined");
          }
          let hadOptChain = false;
          for (let pIdx = 1; pIdx < tokens.length; pIdx++) {
            const tok = tokens[pIdx];
            if (!tok) continue;
            const prop = tok.name;
            const prefixLabel = tokens.slice(0, pIdx).map((t) => t.name).join(".");
            if (curType === "unknown") {
              addDiag(lineNum, "TS18046", `"${prefixLabel}" \u7684\u7C7B\u578B\u4E3A "unknown"`);
              return "any";
            }
            if (tok.optChainBefore) {
              hadOptChain = true;
            } else if (!tokens[pIdx - 1]?.hasBang) {
              const cParts = splitTopLevelUnion(curType);
              if (cParts.includes("undefined")) {
                addDiag(lineNum, "TS18048", `"${prefixLabel}" \u53EF\u80FD\u4E3A "undefined"`);
              } else if (cParts.includes("null")) {
                addDiag(lineNum, "TS18047", `"${prefixLabel}" \u53EF\u80FD\u4E3A "null"`);
              }
            }
            const lookupType = stripNullableFromType(stripNullableFromType(curType, "null"), "undefined");
            if (prop === "length" && (lookupType.endsWith("[]") || lookupType.startsWith("[") || lookupType === "string")) {
              curType = "number";
              continue;
            }
            if (prop === "size" && (lookupType.startsWith("Map<") || lookupType.startsWith("Set<"))) {
              curType = "number";
              continue;
            }
            const shape = getInterfaceShape(lookupType);
            if (shape) {
              if (shape.has(prop)) {
                curType = (shape.get(prop) || { type: "any" }).type;
              } else if (getClassMethodSig(lookupType, prop)) {
                curType = "function";
              } else if (shape.has("__index__")) {
                curType = (shape.get("__index__") || { type: "any" }).type;
              } else {
                addDiag(lineNum, "TS2339", `\u7C7B\u578B "${lookupType}" \u4E0A\u4E0D\u5B58\u5728\u5C5E\u6027 "${prop}"`);
                return "any";
              }
            } else {
              if (prop === "length" || prop === "size" || prop === "val") curType = "number";
              else curType = "any";
            }
            if (tok.hasBang) {
              curType = stripNullableFromType(stripNullableFromType(curType, "null"), "undefined");
              hadOptChain = false;
            }
          }
          if (hadOptChain && curType !== "any" && !splitTopLevelUnion(curType).includes("undefined")) {
            curType = `${curType}|undefined`;
          }
          return curType;
        }
      }
      const exprIncM = s.match(/^(?:(\+\+|--)\s*([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)|([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*(\+\+|--))$/);
      if (exprIncM) {
        const target = exprIncM[2] || exprIncM[3] || "";
        inferType(target, lineNum);
        return "number";
      }
      if (/^[A-Za-z_$][\w$]*$/.test(s)) {
        if (env.has(s)) return (env.get(s) || { type: "any" }).type;
        if (!isKnownIdentifier(s)) {
          addDiag(lineNum, "TS2304", `\u627E\u4E0D\u5230\u540D\u79F0 "${s}"\uFF08\u53D8\u91CF\u672A\u58F0\u660E\uFF0C\u8BF7\u4F7F\u7528 let \u6216 const \u58F0\u660E\uFF09`);
        }
      }
      return "any";
    }
    function instantiateAndCheckCall(sig, explicitTypeArgs, args, argTypes, calleeLabel, lineNum, outEnv = null) {
      const hasRest = sig.params.some((p) => p.isRest);
      if (args.length < sig.minArgs || !hasRest && args.length > sig.params.length) {
        addDiag(lineNum, "TS2554", `${calleeLabel} \u5E94\u6709 ${sig.minArgs === sig.params.length ? sig.params.length : sig.minArgs + "-" + sig.params.length} \u4E2A\u53C2\u6570\uFF0C\u4F46\u83B7\u5F97 ${args.length} \u4E2A`);
        return sig.returnType || "any";
      }
      const tParams = sig.typeParams || [];
      const callEnv = outEnv || /* @__PURE__ */ new Map();
      if (tParams.length > 0) {
        const tpNames = new Set(tParams.map((tp) => tp.name));
        const tpMetaMap = new Map(tParams.map((tp) => [tp.name, tp]));
        if (explicitTypeArgs && explicitTypeArgs.length > 0) {
          tParams.forEach((tp, idx) => {
            if (idx < explicitTypeArgs.length) {
              callEnv.set(tp.name, evaluateType(explicitTypeArgs[idx], callEnv));
            }
          });
        }
        for (let idx = 0; idx < args.length && idx < sig.params.length; idx++) {
          const p = sig.params[idx];
          if (!p) continue;
          const rawPT = normalizeTsType(p.rawType || p.type || "any");
          const actT = argTypes[idx];
          const litT = inferLiteralType(args[idx]);
          if (tpNames.has(rawPT)) {
            if (!callEnv.has(rawPT)) {
              const meta = tpMetaMap.get(rawPT);
              const usedAsIndex = sig.rawReturnType && new RegExp(`\\[\\s*${rawPT}\\s*\\]`).test(sig.rawReturnType);
              const hasKeyofOrLitConstraint = meta && meta.constraint && /\bkeyof\b|["']/.test(meta.constraint);
              if (litT && (usedAsIndex || hasKeyofOrLitConstraint)) {
                callEnv.set(rawPT, litT);
              } else if (actT && actT !== "any") {
                callEnv.set(rawPT, actT);
              }
            }
          } else if (actT && actT !== "any") {
            let patWithInfer = rawPT;
            let replacedSome = false;
            tpNames.forEach((tpName) => {
              if (!callEnv.has(tpName)) {
                const rx = new RegExp(`\\b${tpName}\\b`, "g");
                if (rx.test(patWithInfer)) {
                  patWithInfer = patWithInfer.replace(rx, `infer ${tpName}`);
                  replacedSome = true;
                }
              }
            });
            if (replacedSome) {
              const m = matchConditionalExtends(actT, patWithInfer, callEnv, 0);
              if (m.matched) {
                m.inferred.forEach((v, k) => {
                  if (!callEnv.has(k)) callEnv.set(k, v);
                });
              }
            }
          }
        }
        tParams.forEach((tp) => {
          if (!callEnv.has(tp.name)) {
            callEnv.set(tp.name, tp.defaultType ? evaluateType(tp.defaultType, callEnv) : "any");
          }
        });
        tParams.forEach((tp) => {
          if (tp.constraint) {
            const constraintT = evaluateType(tp.constraint, callEnv);
            const boundT = callEnv.get(tp.name);
            if (boundT && boundT !== "any" && !isTypeCompatible(boundT, constraintT)) {
              addDiag(lineNum, "TS2345", `\u7C7B\u578B "${boundT}" \u4E0D\u6EE1\u8DB3\u6CDB\u578B\u7EA6\u675F "${constraintT}" (${calleeLabel} \u7684\u7C7B\u578B\u53C2\u6570 "${tp.name}")`);
            }
          }
        });
      }
      const lastParam = sig.params[sig.params.length - 1];
      for (let idx = 0; idx < args.length; idx++) {
        const p = idx < sig.params.length ? sig.params[idx] : lastParam?.isRest ? lastParam : void 0;
        if (!p) continue;
        let expectedPT = tParams.length > 0 ? evaluateType(p.rawType || p.type, callEnv) : p.type;
        if (p.isRest && expectedPT.endsWith("[]")) {
          expectedPT = expectedPT.slice(0, -2);
        }
        const at = argTypes[idx] || "any";
        const rawArg = (args[idx] || "").trim();
        if (expectedPT && expectedPT !== "any") {
          if (rawArg.startsWith("{") && getInterfaceShape(expectedPT)) {
            checkObjectLiteralAgainstShape(rawArg, expectedPT, lineNum, `${calleeLabel} \u7684\u53C2\u6570 "${p.name}"`);
          } else if (!isExpressionAssignable(rawArg, at, expectedPT, lineNum)) {
            addDiag(lineNum, "TS2345", `\u7C7B\u578B "${at}" \u7684\u53C2\u6570\u4E0D\u80FD\u8D4B\u7ED9\u7C7B\u578B "${expectedPT}" \u7684\u53C2\u6570 (${calleeLabel} \u7684\u53C2\u6570 "${p.name}")`);
          }
        }
      }
      if (tParams.length > 0 && (sig.rawReturnType || sig.returnType)) {
        return evaluateType(sig.rawReturnType || sig.returnType, callEnv);
      }
      return sig.returnType ? evaluateType(sig.returnType) : "any";
    }
    function checkArrayElementsAgainst(arrExpr, expectedElemType, lineNum, contextLabel) {
      const s = arrExpr.trim();
      if (!s.startsWith("[") || !s.endsWith("]")) return;
      const inner = s.slice(1, -1).trim();
      if (!inner) return;
      const elems = splitTopLevel(inner);
      elems.forEach((el, idx) => {
        const et = inferType(el, lineNum);
        if (el.trim().startsWith("{") && getInterfaceShape(expectedElemType)) {
          checkObjectLiteralAgainstShape(el.trim(), expectedElemType, lineNum, `${contextLabel} \u7B2C ${idx + 1} \u4E2A\u5143\u7D20`);
        } else if (!isExpressionAssignable(el, et, expectedElemType, lineNum)) {
          addDiag(lineNum, "TS2322", `${contextLabel} \u7B2C ${idx + 1} \u4E2A\u5143\u7D20\u7C7B\u578B "${et}" \u4E0D\u80FD\u5206\u914D\u7ED9\u5143\u7D20\u7C7B\u578B "${expectedElemType}"`);
        }
      });
    }
    function parseParamList(paramStr, lineNum, checkUntypedParams = true) {
      const rawParams = paramStr ? splitTopLevelDecl(paramStr) : [];
      const params = [];
      let minArgs = 0;
      rawParams.forEach((pRaw) => {
        const p = pRaw.trim().replace(/^(?:(?:public|private|protected|readonly|override)\s+)+/, "");
        if (!p) return;
        const pm = p.match(/^(\.\.\.)?([A-Za-z_$][\w$]*)(\?)?(?:\s*:\s*((?:[^=]|=>)+?))?(?:\s*=\s*(?!=|>)([\s\S]+))?$/);
        if (pm && pm[2]) {
          const isRest = Boolean(pm[1]);
          const pName = pm[2];
          const isOpt = Boolean(pm[3] || pm[5] || isRest);
          const rawType = pm[4] ? pm[4].trim() : null;
          let pType = rawType ? resolveAlias(rawType) : null;
          if (!pType && pm[5]) {
            pType = inferType(pm[5].trim(), lineNum);
          }
          if (!pType) {
            if (checkUntypedParams) {
              addDiag(lineNum, "TS7006", `\u53C2\u6570 "${pName}" \u9690\u5F0F\u5177\u6709 "any" \u7C7B\u578B\uFF08\u4E25\u683C\u6A21\u5F0F\u4E0B\u8BF7\u663E\u5F0F\u6DFB\u52A0\u7C7B\u578B\u6CE8\u89E3\uFF0C\u5982 ${pName}: number\uFF09`);
            }
            pType = isRest ? "any[]" : "any";
          }
          if (!isOpt) minArgs++;
          params.push({ name: pName, type: pType, rawType: rawType || pType, optional: isOpt, isRest });
        }
      });
      return { params, minArgs };
    }
    function parseClassTopMember(mem, propMap, clsName, lineNum) {
      const s = mem.trim();
      if (!s) return;
      const getterM = s.match(/^(?:(?:public|private|protected|static|readonly|override)\s+)*get\s+([A-Za-z_$][\w$]*)\s*\(\s*\)\s*(?::\s*([^{]+))?/);
      if (getterM && getterM[1]) {
        const rawGT = getterM[2] ? getterM[2].trim() : "any";
        const gType = resolveAlias(rawGT);
        propMap.set(getterM[1], { type: gType, rawType: rawGT, optional: false });
        fns.set(clsName + ".get." + getterM[1], {
          name: clsName + "." + getterM[1],
          params: [],
          minArgs: 0,
          returnType: gType,
          rawReturnType: rawGT,
          typeParams: [],
          line: lineNum,
          hasValueReturn: /\breturn\s+[^;}\s]/.test(s)
        });
        return;
      }
      const setterM = s.match(/^(?:(?:public|private|protected|static|readonly|override)\s+)*set\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/);
      if (setterM && setterM[1]) {
        const sName = setterM[1];
        const { params, minArgs } = parseParamList((setterM[2] || "").trim(), lineNum, true);
        const sType = params[0]?.type || "any";
        const sRaw = params[0]?.rawType || sType;
        if (!propMap.has(sName)) {
          propMap.set(sName, { type: sType, rawType: sRaw, optional: false });
        }
        fns.set(clsName + ".set." + sName, {
          name: clsName + "." + sName,
          params,
          minArgs,
          returnType: "void",
          rawReturnType: "void",
          typeParams: [],
          line: lineNum,
          hasValueReturn: true
        });
        return;
      }
      const idxM = s.match(/^(?:readonly\s+)?\[\s*[A-Za-z_$][\w$]*\s*:\s*(?:string|number|symbol|any)\s*\]\s*:\s*([^;=]+)$/);
      if (idxM && idxM[1]) {
        const rawT = idxM[1].trim();
        propMap.set("__index__", { type: resolveAlias(rawT), rawType: rawT, optional: true });
        return;
      }
      const compM = s.match(/^(?:(?:readonly|public|private|protected|static)\s+)*\[\s*([A-Za-z_$][\w$]*)\s*\](\?)?\s*:\s*([^;=]+)(?:\s*=\s*[\s\S]+)?$/);
      if (compM && compM[1] && compM[3]) {
        const rawT = compM[3].trim();
        propMap.set(`[${compM[1]}]`, { type: resolveAlias(rawT), rawType: rawT, optional: Boolean(compM[2]) });
        propMap.set("__index__", { type: resolveAlias(rawT), rawType: rawT, optional: true });
        return;
      }
      const methodHdrM = s.match(/^(?:(?:public|private|protected|static|async|readonly|abstract|override)\s+)*\*?\s*([A-Za-z_$][\w$]*)\s*(<[\s\S]*>)?\s*\(/);
      if (methodHdrM && methodHdrM[1] && !RESERVED_WORDS.has(methodHdrM[1])) {
        const mName = methodHdrM[1];
        let openP = -1, ad = 0;
        for (let k = s.indexOf(mName) + mName.length; k < s.length; k++) {
          if (s[k] === "<") ad++;
          else if (s[k] === ">" && s[k - 1] !== "=") ad = Math.max(0, ad - 1);
          else if (s[k] === "(" && ad === 0) {
            openP = k;
            break;
          }
        }
        const typeParamStr = openP > 0 ? s.slice(s.indexOf(mName) + mName.length, openP).trim() : "";
        const mTypeParams = typeParamStr.startsWith("<") ? parseTypeParams(typeParamStr) : [];
        const closeP = openP > 0 ? findBalancedParen(s, openP) : -1;
        if (closeP > openP) {
          const paramStr = s.slice(openP + 1, closeP).trim();
          const afterClose = s.slice(closeP + 1).trim();
          const retM = afterClose.match(/^:\s*([^{;]+?)(?:\s*(?:\{[\s\S]*|;))?$/);
          const rawRetType = mName === "constructor" ? "void" : retM && retM[1] ? retM[1].trim() : "any";
          const retType = mName === "constructor" ? "void" : resolveAlias(rawRetType);
          const { params, minArgs } = parseParamList(paramStr, lineNum, true);
          if (mName === "constructor") {
            splitTopLevelDecl(paramStr).forEach((rawP, idx) => {
              const pTrim = rawP.trim();
              const pInfo = params[idx];
              if (/^(?:(?:public|private|protected|readonly|override)\s+)+/.test(pTrim) && pInfo) {
                propMap.set(pInfo.name, { type: pInfo.type, rawType: pInfo.rawType || pInfo.type, optional: Boolean(pInfo.optional) });
              }
            });
          } else {
            const fnShapeStr = `(${params.map((p) => `${p.name}${p.optional ? "?" : ""}:${p.type}`).join(",")})=>${retType}`;
            if (!propMap.has(mName)) {
              propMap.set(mName, { type: fnShapeStr, rawType: fnShapeStr, optional: false });
            }
          }
          const isAbstractOrOverload = /^\s*(?:(?:public|private|protected|static|async|readonly|override)\s+)*abstract\b/.test(s) || /;\s*$/.test(afterClose);
          const hasValRet = isAbstractOrOverload || /\breturn\s+[^;}\s]/.test(s);
          fns.set(clsName + "." + mName, {
            name: clsName + "." + mName,
            params,
            minArgs,
            returnType: retType,
            rawReturnType: rawRetType,
            typeParams: mTypeParams,
            line: lineNum,
            hasValueReturn: hasValRet
          });
          return;
        }
      }
      if (s.includes("(") && !s.includes("=>") && (!s.includes("=") || s.indexOf("(") < s.indexOf("="))) return;
      const cleaned = s.replace(/^(?:(?:readonly|public|private|protected|static|abstract|override)\s+)+/, "");
      const pm = cleaned.match(/^([A-Za-z_$][\w$]*)(\?)?\s*:\s*((?:[^=]|=>)+?)(?:\s*=\s*(?!=|>)[\s\S]+)?$/);
      if (pm && pm[1] && pm[3]) {
        const rawFT = pm[3].trim();
        propMap.set(pm[1], { type: resolveAlias(rawFT), rawType: rawFT, optional: Boolean(pm[2]) });
        return;
      }
      const initM = cleaned.match(/^([A-Za-z_$][\w$]*)\s*=\s*(.+)$/);
      if (initM && initM[1] && initM[2]) {
        const savedDiagLen = diagnostics.length;
        const infT = inferType(initM[2].trim(), lineNum);
        diagnostics.length = savedDiagLen;
        propMap.set(initM[1], { type: infT, rawType: infT, optional: false });
      }
    }
    return {
      inferType,
      isExpressionAssignable,
      checkObjectLiteralAgainstShape,
      checkTemplateInterpolations,
      instantiateAndCheckCall,
      checkArrayElementsAgainst,
      parseParamList,
      parseClassTopMember
    };
  }

  // src/compiler/type-checker.ts
  var _TYPECHECK_CACHE = { src: null, strict: null, diags: [] };
  function collectPass1Declarations(ctx, evalEngine, inferEngine) {
    const {
      lines,
      fns,
      typeAliases,
      genericTypeAliases,
      interfaceTypeParams,
      interfaces,
      classParents,
      classImplements,
      abstractClasses,
      enumsSet,
      enumMembers,
      enumValueTypes,
      addDiag
    } = ctx;
    const {
      evaluateType,
      resolveAlias,
      parseObjectShapeLiteral,
      getInterfaceShape,
      getClassMethodSig
    } = evalEngine;
    const { parseParamList, parseClassTopMember } = inferEngine;
    let activeInterface = null;
    let activeInterfaceName = "";
    let activeInterfaceIsClass = false;
    let activeInterfaceDepth = 0;
    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      const raw = stripInlineCommentSafe(lines[i]).trim();
      if (!raw || raw.startsWith("@")) continue;
      if (activeInterface) {
        const depthBefore = activeInterfaceDepth;
        for (let k = 0; k < raw.length; k++) {
          const ch = raw[k];
          if (ch === '"' || ch === "'" || ch === "`") {
            k = skipString(raw, k) - 1;
            continue;
          }
          if (ch === "{") activeInterfaceDepth++;
          else if (ch === "}") activeInterfaceDepth--;
        }
        if (depthBefore === 1) {
          const memberPart = activeInterfaceDepth <= 0 && raw.includes("}") ? raw.slice(0, raw.lastIndexOf("}")).trim() : raw;
          if (memberPart) {
            if (activeInterfaceIsClass && /^(?:(?:public|private|protected|static|async|readonly|abstract|get|set)\s+)*[A-Za-z_$][\w$]*\s*(?:<[\s\S]*>)?\s*\(/.test(memberPart)) {
              parseClassTopMember(memberPart, activeInterface, activeInterfaceName, lineNum);
            } else {
              const activeIfaceMap = activeInterface;
              memberPart.split(/[;,]/).map((s) => s.trim()).filter(Boolean).forEach((mem) => {
                parseClassTopMember(mem, activeIfaceMap, activeInterfaceName, lineNum);
              });
            }
          }
        }
        if (activeInterfaceIsClass) {
          const thisAssignRe = /\bthis\.([A-Za-z_$][\w$]*)\s*=\s*(?!=)/g;
          let tm;
          while (tm = thisAssignRe.exec(raw)) {
            if (tm[1] && !activeInterface.has(tm[1])) {
              activeInterface.set(tm[1], { type: "any", rawType: "any", optional: false });
            }
          }
        }
        if (activeInterfaceDepth <= 0) {
          activeInterface = null;
          activeInterfaceName = "";
          activeInterfaceIsClass = false;
          activeInterfaceDepth = 0;
        }
        continue;
      }
      const nsKwM = raw.match(/^(?:export\s+)?(?:declare\s+)?(?:namespace|module)\s+([A-Za-z_$][\w$]*)/);
      if (nsKwM && nsKwM[1]) {
        enumsSet.add(nsKwM[1]);
        continue;
      }
      const ifaceKwM = raw.match(/^(?:export\s+)?(?:declare\s+)?(abstract\s+)?(interface|class)\s+([A-Za-z_$][\w$]*)/);
      if (ifaceKwM && ifaceKwM[3]) {
        const isAbstract = Boolean(ifaceKwM[1]);
        const isClass = ifaceKwM[2] === "class";
        const ifaceName = ifaceKwM[3];
        if (isClass && isAbstract) {
          abstractClasses.add(ifaceName);
        }
        let pos = ifaceKwM[0].length;
        while (pos < raw.length && isWS(raw[pos])) pos++;
        let tParamStr = "";
        if (raw[pos] === "<") {
          let ad = 1, k = pos + 1;
          while (k < raw.length && ad > 0) {
            const ch = raw[k];
            if (ch === '"' || ch === "'" || ch === "`") {
              k = skipString(raw, k);
              continue;
            }
            if (ch === "<") ad++;
            else if (ch === ">" && raw[k - 1] !== "=") ad--;
            k++;
          }
          if (ad === 0) {
            tParamStr = raw.slice(pos, k);
            pos = k;
          }
        }
        const tParams = parseTypeParams(tParamStr);
        if (tParams.length > 0) interfaceTypeParams.set(ifaceName, tParams);
        const afterTParams = raw.slice(pos);
        const braceOpenIdx = afterTParams.indexOf("{");
        if (braceOpenIdx >= 0) {
          const headerTail = afterTParams.slice(0, braceOpenIdx);
          const extM = headerTail.match(/\bextends\s+([A-Za-z_$][\w$]*)/);
          const parentName = extM ? extM[1] : null;
          if (isClass) {
            const implM = headerTail.match(/\bimplements\s+([^{]+)/);
            if (implM && implM[1]) {
              const implList = splitTopLevelDecl(implM[1].trim()).map((s) => s.replace(/<[\s\S]*>$/, "").trim()).filter(Boolean);
              if (implList.length > 0) {
                classImplements.set(ifaceName, { interfaces: implList, line: lineNum });
              }
            }
          }
          const rest = afterTParams.slice(braceOpenIdx + 1).trim();
          const propMap = /* @__PURE__ */ new Map();
          interfaces.set(ifaceName, propMap);
          if (parentName) {
            classParents.set(ifaceName, parentName);
          }
          let d = 1;
          for (let k = 0; k < rest.length; k++) {
            const ch = rest[k];
            if (ch === '"' || ch === "'" || ch === "`") {
              k = skipString(rest, k) - 1;
              continue;
            }
            if (ch === "{") d++;
            else if (ch === "}") d--;
          }
          if (d <= 0 && rest.includes("}")) {
            const inner = rest.slice(0, rest.lastIndexOf("}")).trim();
            inner.split(/[;,]/).map((s) => s.trim()).filter(Boolean).forEach((mem) => {
              parseClassTopMember(mem, propMap, ifaceName, lineNum);
            });
          } else {
            activeInterface = propMap;
            activeInterfaceName = ifaceName;
            activeInterfaceIsClass = isClass;
            activeInterfaceDepth = d;
          }
          continue;
        }
      }
      const enumMatch = raw.match(/^(?:export\s+)?(?:const\s+)?enum\s+([A-Za-z_$][\w$]*)\b/);
      if (enumMatch && enumMatch[1]) {
        const enumName = enumMatch[1];
        enumsSet.add(enumName);
        const members = /* @__PURE__ */ new Set();
        const valTypes = /* @__PURE__ */ new Set();
        let enumScan = raw.slice(raw.indexOf("{") >= 0 ? raw.indexOf("{") + 1 : enumMatch[0].length);
        let scanIdx = i;
        while (!enumScan.includes("}") && scanIdx + 1 < lines.length) {
          scanIdx++;
          enumScan += " " + stripInlineCommentSafe(lines[scanIdx]).trim();
        }
        const closeBrace = enumScan.indexOf("}");
        const bodyStr = (closeBrace >= 0 ? enumScan.slice(0, closeBrace) : enumScan).trim();
        splitTopLevelDecl(bodyStr).forEach((entry) => {
          const em = entry.trim().match(/^([A-Za-z_$][\w$]*)(?:\s*=\s*([\s\S]+))?$/);
          if (em && em[1]) {
            members.add(em[1]);
            if (em[2]) {
              const initTrim = em[2].trim();
              if (/^(?:"[^"]*"|'[^']*'|`[^`]*`)$/.test(initTrim)) {
                valTypes.add("string");
              } else {
                valTypes.add("number");
              }
            } else {
              valTypes.add("number");
            }
          }
        });
        if (valTypes.size === 0) valTypes.add("number");
        enumMembers.set(enumName, members);
        enumValueTypes.set(enumName, valTypes);
        continue;
      }
      const typeHdrM = raw.match(/^(?:export\s+)?type\s+([A-Za-z_$][\w$]*)/);
      if (typeHdrM && typeHdrM[1]) {
        const aliasName = typeHdrM[1];
        let fullTypeDecl = raw;
        let scanIdx = i;
        const countTypeDepth = (str) => {
          let d = 0, ad = 0, seenEq = false;
          let p2 = typeHdrM[0].length;
          while (p2 < str.length && isWS(str[p2])) p2++;
          if (str[p2] === "<") {
            let pad = 1;
            p2++;
            while (p2 < str.length && pad > 0) {
              if (str[p2] === '"' || str[p2] === "'" || str[p2] === "`") {
                p2 = skipString(str, p2);
                continue;
              }
              if (str[p2] === "<") pad++;
              else if (str[p2] === ">" && str[p2 - 1] !== "=") pad--;
              p2++;
            }
          }
          while (p2 < str.length && isWS(str[p2])) p2++;
          if (str[p2] === "=" && str[p2 + 1] !== "=" && str[p2 + 1] !== ">") {
            seenEq = true;
            p2++;
          }
          for (; p2 < str.length; p2++) {
            const ch = str[p2];
            if (ch === '"' || ch === "'" || ch === "`") {
              p2 = skipString(str, p2) - 1;
              continue;
            }
            if (ch === "(" || ch === "[" || ch === "{") d++;
            else if (ch === ")" || ch === "]" || ch === "}") d = Math.max(0, d - 1);
            else if (ch === "<") ad++;
            else if (ch === ">" && str[p2 - 1] !== "=") ad = Math.max(0, ad - 1);
          }
          return { d, ad, seenEq };
        };
        let st = countTypeDepth(fullTypeDecl);
        while (scanIdx + 1 < lines.length) {
          const curTrim = fullTypeDecl.trim();
          const nextClean = stripInlineCommentSafe(lines[scanIdx + 1]).trim();
          const continues = st.d > 0 || st.ad > 0 || !/;\s*$/.test(curTrim) && (/[=|&?:]$|\bextends$/.test(curTrim) || /^(?:[|&?:]|extends\b)/.test(nextClean));
          if (!continues) break;
          scanIdx++;
          fullTypeDecl += " " + nextClean;
          st = countTypeDepth(fullTypeDecl);
        }
        i = scanIdx;
        let p = typeHdrM[0].length;
        while (p < fullTypeDecl.length && isWS(fullTypeDecl[p])) p++;
        let tParamStr = "";
        if (fullTypeDecl[p] === "<") {
          let pad = 1, k = p + 1;
          while (k < fullTypeDecl.length && pad > 0) {
            if (fullTypeDecl[k] === '"' || fullTypeDecl[k] === "'" || fullTypeDecl[k] === "`") {
              k = skipString(fullTypeDecl, k);
              continue;
            }
            if (fullTypeDecl[k] === "<") pad++;
            else if (fullTypeDecl[k] === ">" && fullTypeDecl[k - 1] !== "=") pad--;
            k++;
          }
          if (pad === 0) {
            tParamStr = fullTypeDecl.slice(p, k);
            p = k;
          }
        }
        while (p < fullTypeDecl.length && isWS(fullTypeDecl[p])) p++;
        if (fullTypeDecl[p] === "=") {
          const rhsType = fullTypeDecl.slice(p + 1).replace(/;\s*$/, "").trim();
          const tParams = parseTypeParams(tParamStr);
          if (tParams.length > 0) {
            genericTypeAliases.set(aliasName, { typeParams: tParams, body: rhsType, line: lineNum });
          } else {
            typeAliases.set(aliasName, rhsType);
          }
          continue;
        }
      }
      const fnMatch = raw.match(/^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)/);
      if (fnMatch && fnMatch[1] && raw.indexOf("(") >= 0) {
        const fnName = fnMatch[1];
        let headerStr = raw;
        let scanLine = i;
        let openP = -1;
        const findFnOpenParen = (str) => {
          let pos = fnMatch[0].length;
          while (pos < str.length && isWS(str[pos])) pos++;
          if (str[pos] === "<") {
            let ad = 1, k = pos + 1;
            while (k < str.length && ad > 0) {
              if (str[k] === '"' || str[k] === "'" || str[k] === "`") {
                k = skipString(str, k);
                continue;
              }
              if (str[k] === "<") ad++;
              else if (str[k] === ">" && str[k - 1] !== "=") ad--;
              k++;
            }
            pos = k;
          }
          return str.indexOf("(", pos);
        };
        openP = findFnOpenParen(headerStr);
        while ((openP < 0 || findBalancedParen(headerStr, openP) < 0) && scanLine + 1 < lines.length) {
          scanLine++;
          headerStr += " " + stripInlineCommentSafe(lines[scanLine]).trim();
          openP = findFnOpenParen(headerStr);
        }
        const closeP = openP >= 0 ? findBalancedParen(headerStr, openP) : -1;
        if (closeP > openP) {
          const tParamRegion = headerStr.slice(fnMatch[0].length, openP).trim();
          const fnTParams = tParamRegion.startsWith("<") ? parseTypeParams(tParamRegion) : [];
          const paramStr = headerStr.slice(openP + 1, closeP).trim();
          const afterClose = headerStr.slice(closeP + 1).trim();
          const retM = afterClose.match(/^:\s*([^{]+?)(?:\s*\{[\s\S]*)?$/);
          const rawRetType = retM && retM[1] ? retM[1].trim() : "any";
          const tempEnv = /* @__PURE__ */ new Map();
          fnTParams.forEach((tp) => tempEnv.set(tp.name, tp.name));
          const retType = retM ? resolveAlias(rawRetType, tempEnv) : "any";
          const { params, minArgs } = parseParamList(paramStr, lineNum, true);
          fns.set(fnName, {
            name: fnName,
            params,
            minArgs,
            returnType: retType,
            rawReturnType: rawRetType,
            typeParams: fnTParams,
            line: lineNum,
            hasValueReturn: false
          });
        }
      }
    }
    typeAliases.forEach((rhs, aliasName) => {
      const evaluated = evaluateType(rhs, /* @__PURE__ */ new Map(), 0, /* @__PURE__ */ new Set([aliasName]));
      typeAliases.set(aliasName, evaluated);
      if (evaluated.startsWith("{") && evaluated.endsWith("}") && !interfaces.has(aliasName)) {
        interfaces.set(aliasName, parseObjectShapeLiteral(evaluated));
      }
    });
    classImplements.forEach(({ interfaces: implList, line: clsLine }, clsName) => {
      const clsShape = getInterfaceShape(clsName);
      implList.forEach((ifaceName) => {
        const targetShape = getInterfaceShape(ifaceName);
        if (!targetShape) return;
        targetShape.forEach((propInfo, propName) => {
          if (propName.startsWith("__")) return;
          const hasMember = clsShape && clsShape.has(propName) || Boolean(getClassMethodSig(clsName, propName));
          if (!hasMember && !propInfo.optional) {
            addDiag(clsLine, "TS2420", `\u7C7B "${clsName}" \u9519\u8BEF\u5B9E\u73B0\u63A5\u53E3 "${ifaceName}": \u7F3A\u5C11\u5C5E\u6027\u6216\u65B9\u6CD5 "${propName}"`);
          } else if (clsShape && clsShape.has(propName)) {
            const clsMember = clsShape.get(propName);
            if (clsMember && clsMember.type !== "any" && propInfo.type !== "any" && !isTsAssignable(clsMember.type, propInfo.type)) {
              addDiag(clsLine, "TS2420", `\u7C7B "${clsName}" \u9519\u8BEF\u5B9E\u73B0\u63A5\u53E3 "${ifaceName}": \u5C5E\u6027 "${propName}" \u7684\u7C7B\u578B "${clsMember.type}" \u4E0D\u80FD\u5206\u914D\u7ED9\u7C7B\u578B "${propInfo.type}"`);
            }
          }
        });
      });
    });
  }
  function checkPass2Statements(ctx, evalEngine, inferEngine) {
    const {
      lines,
      fns,
      interfaceTypeParams,
      interfaces,
      env,
      activeTypeParams,
      addDiag,
      isKnownIdentifier
    } = ctx;
    const { resolveAlias, getInterfaceShape } = evalEngine;
    const {
      inferType,
      isExpressionAssignable,
      checkObjectLiteralAgainstShape,
      checkArrayElementsAgainst,
      parseParamList
    } = inferEngine;
    let currentFn = null;
    const fnScopeStack = [];
    const switchStack = [];
    let currentClass = null;
    let classStartBraceDepth = 0;
    let braceDepth = 0;
    let fnStartBraceDepth = 0;
    let inInterfaceBlock = false;
    let inInterfaceDepth = 0;
    let inEnumBlock = false;
    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      let rawLine = lines[i] ?? "";
      const rawTrimmed = rawLine.trim();
      const callComment = rawTrimmed.match(/^\/\/\s*调用[:：]\s*(.+)$/);
      if (callComment && callComment[1]) {
        inferType(callComment[1].trim(), lineNum);
        continue;
      }
      let trimmed = stripInlineCommentSafe(rawLine).trim();
      if (!trimmed || trimmed.startsWith("@")) continue;
      if (/^import\b/.test(trimmed)) {
        const impMatch = trimmed.replace(/;$/, "").trim().match(/^import\s+([\s\S]+?)\s+from\s+(['"])([^'"]+)\2\s*$/);
        if (impMatch) {
          const clause = (impMatch[1] || "").trim();
          const modSpec = (impMatch[3] || "").trim();
          const isFsRoot = modSpec === "fs" || modSpec === "node:fs";
          const isFsPromises = modSpec === "fs/promises" || modSpec === "node:fs/promises";
          const modType = isFsPromises ? "__FsPromises__" : isFsRoot ? "__FsModule__" : "any";
          const registerNamedBindings = (braceStr) => {
            const inner = braceStr.replace(/^\{|\}$/g, "").trim();
            if (!inner) return;
            inner.split(",").forEach((rawSpec) => {
              const spec = rawSpec.trim().replace(/^type\s+/, "");
              if (!spec) return;
              const asM = spec.match(/^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/);
              const imported = asM && asM[1] ? asM[1] : spec;
              const local = asM && asM[2] ? asM[2] : spec;
              if (!/^[A-Za-z_$][\w$]*$/.test(local)) return;
              const bType = isFsRoot && imported === "promises" ? "__FsPromises__" : "any";
              env.set(local, { type: bType, isConst: true, line: lineNum, declaredType: bType });
            });
          };
          const nsM = clause.match(/^\*\s+as\s+([A-Za-z_$][\w$]*)$/);
          if (nsM && nsM[1]) {
            env.set(nsM[1], { type: modType, isConst: true, line: lineNum, declaredType: modType });
          } else if (clause.startsWith("{") && clause.endsWith("}")) {
            registerNamedBindings(clause);
          } else {
            const defNamedM = clause.match(/^([A-Za-z_$][\w$]*)\s*,\s*(\{[\s\S]+\})$/);
            if (defNamedM && defNamedM[1] && defNamedM[2]) {
              env.set(defNamedM[1], { type: modType, isConst: true, line: lineNum, declaredType: modType });
              registerNamedBindings(defNamedM[2]);
            } else if (/^[A-Za-z_$][\w$]*$/.test(clause)) {
              env.set(clause, { type: modType, isConst: true, line: lineNum, declaredType: modType });
            }
          }
        }
        continue;
      }
      if (/^declare\b/.test(trimmed)) {
        const declVarM = trimmed.match(/^declare\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::\s*([^=;]+))?/);
        if (declVarM && declVarM[1]) {
          const dType = declVarM[2] ? resolveAlias(declVarM[2].trim()) : "any";
          env.set(declVarM[1], { type: dType, isConst: true, line: lineNum, declaredType: dType });
        }
        continue;
      }
      const nsOpenM = trimmed.match(/^(?:export\s+)?(?:namespace|module)\s+([A-Za-z_$][\w$]*)\s*\{/);
      if (nsOpenM && nsOpenM[1]) {
        env.set(nsOpenM[1], { type: "any", isConst: true, line: lineNum, declaredType: "any" });
        for (let k = 0; k < rawLine.length; k++) {
          const ch = rawLine[k];
          if (ch === '"' || ch === "'" || ch === "`") {
            k = skipString(rawLine, k) - 1;
            continue;
          }
          if (ch === "/" && rawLine[k + 1] === "/") break;
          if (ch === "{") braceDepth++;
          else if (ch === "}") braceDepth = Math.max(0, braceDepth - 1);
        }
        continue;
      }
      if (inInterfaceBlock) {
        for (let k = 0; k < trimmed.length; k++) {
          if (trimmed[k] === "{") inInterfaceDepth++;
          else if (trimmed[k] === "}") inInterfaceDepth--;
        }
        if (inInterfaceDepth <= 0) inInterfaceBlock = false;
        continue;
      }
      if (inEnumBlock) {
        if (trimmed.includes("}")) inEnumBlock = false;
        continue;
      }
      if (/^(?:export\s+)?interface\s+[A-Za-z_$][\w$]*/.test(trimmed)) {
        let d = 0;
        for (let k = 0; k < trimmed.length; k++) {
          if (trimmed[k] === "{") d++;
          else if (trimmed[k] === "}") d--;
        }
        if (d > 0) {
          inInterfaceBlock = true;
          inInterfaceDepth = d;
        }
        continue;
      }
      if (/^(?:export\s+)?(?:const\s+)?enum\s+[A-Za-z_$][\w$]*\s*\{/.test(trimmed)) {
        if (!trimmed.includes("}")) inEnumBlock = true;
        continue;
      }
      if (/^(?:export\s+)?type\s+[A-Za-z_$][\w$]*(?:\s*<|\s*=)/.test(trimmed)) {
        let fullT = trimmed;
        while (i + 1 < lines.length) {
          let d = 0, ad = 0;
          const eqPos = fullT.indexOf("=");
          for (let k = eqPos >= 0 ? eqPos + 1 : 0; k < fullT.length; k++) {
            const ch = fullT[k];
            if (ch === '"' || ch === "'" || ch === "`") {
              k = skipString(fullT, k) - 1;
              continue;
            }
            if (ch === "(" || ch === "[" || ch === "{") d++;
            else if (ch === ")" || ch === "]" || ch === "}") d = Math.max(0, d - 1);
            else if (ch === "<") ad++;
            else if (ch === ">" && fullT[k - 1] !== "=") ad = Math.max(0, ad - 1);
          }
          const curTrim = fullT.trim();
          const nextClean = stripInlineCommentSafe(lines[i + 1]).trim();
          const continues = d > 0 || ad > 0 || !/;\s*$/.test(curTrim) && (/[=|&?:]$|\bextends$/.test(curTrim) || /^(?:[|&?:]|extends\b)/.test(nextClean));
          if (!continues) break;
          i++;
          fullT += " " + nextClean;
        }
        continue;
      }
      const classOpen = trimmed.match(/^(?:export\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)(?:\s*<[\s\S]*>)?(?:\s+extends\s+[^{]+)?(?:\s+implements\s+[^{]+)?\s*\{/);
      const classExprOpen = !classOpen ? trimmed.match(/^(?:export\s+)?(const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*class\b(?:\s+[A-Za-z_$][\w$]*)?\s*\{/) : null;
      if (classOpen || classExprOpen) {
        const clsName = (classOpen ? classOpen[1] : classExprOpen ? classExprOpen[2] : "") || "";
        if (classExprOpen) {
          env.set(clsName, { type: clsName, isConst: classExprOpen[1] === "const", line: lineNum, declaredType: clsName });
          if (!interfaces.has(clsName)) interfaces.set(clsName, /* @__PURE__ */ new Map());
        }
        const clsTParams = interfaceTypeParams.get(clsName) || [];
        clsTParams.forEach((tp) => activeTypeParams.set(tp.name, tp.name));
        let d = 0;
        for (let k = 0; k < rawLine.length; k++) {
          const ch = rawLine[k];
          if (ch === '"' || ch === "'" || ch === "`") {
            k = skipString(rawLine, k) - 1;
            continue;
          }
          if (ch === "/" && rawLine[k + 1] === "/") break;
          if (ch === "{") d++;
          else if (ch === "}") d--;
        }
        if (d > 0) {
          currentClass = clsName;
          classStartBraceDepth = braceDepth;
          braceDepth += d;
          env.set("this", { type: clsName, isConst: true, line: lineNum, declaredType: clsName });
        }
        continue;
      }
      if (currentClass && braceDepth === classStartBraceDepth + 1) {
        if (/^(?:(?:public|private|protected|static|async|readonly)\s+)*abstract\s+[A-Za-z_$][\w$]*\s*(?:<[\s\S]*>)?\s*\(/.test(trimmed)) {
          continue;
        }
        if (/^static\s*\{/.test(trimmed)) {
          for (let k = 0; k < rawLine.length; k++) {
            if (rawLine[k] === "{") braceDepth++;
            else if (rawLine[k] === "}") braceDepth = Math.max(0, braceDepth - 1);
          }
          continue;
        }
        const isMethodHdr = /^(?:(?:public|private|protected|static|async|readonly|get|set)\s+)*[A-Za-z_$][\w$]*\s*(?:<[\s\S]*>)?\s*\(/.test(trimmed);
        if (!isMethodHdr && trimmed !== "}" && trimmed !== "};") {
          const cleanedField = trimmed.replace(/^(?:(?:readonly|public|private|protected|static|abstract)\s+)+/, "").replace(/;$/, "").trim();
          const fm = cleanedField.match(/^([A-Za-z_$][\w$]*)(\?)?(?:\s*:\s*((?:[^=]|=>)+?))?(?:\s*=\s*(?!=|>)([\s\S]+))?$/);
          if (fm) {
            const fName = fm[1];
            const declT = fm[3] ? resolveAlias(fm[3].trim()) : null;
            const initExpr = fm[4] ? fm[4].trim() : null;
            if (declT && initExpr) {
              const initT = inferType(initExpr, lineNum);
              if (!isExpressionAssignable(initExpr, initT, declT, lineNum)) {
                addDiag(lineNum, "TS2322", `\u4E0D\u80FD\u5C06\u7C7B\u578B "${initT}" \u5206\u914D\u7ED9\u7C7B\u578B "${declT}" (\u5C5E\u6027 "${currentClass}.${fName}")`);
              }
            }
            continue;
          }
        }
      }
      if (/^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*[A-Za-z_$][\w$]*[\s\S]*;\s*$/.test(trimmed) && !trimmed.includes("{")) {
        continue;
      }
      const fnOpen = trimmed.match(/^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*(\*)?\s*([A-Za-z_$][\w$]*)\s*(?:<[\s\S]*>)?\s*\(/);
      const arrowFnOpen = !fnOpen ? trimmed.match(/^(?:export\s+)?(const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\s*\*?(?:\s+[A-Za-z_$][\w$]*)?\s*)?(?:(<[\s\S]*>)\s*)?\(([^)]*)\)\s*(?::\s*([^=]+?))?\s*(?:=>\s*)?\{/) : null;
      let validMethodOpen = null;
      if (!fnOpen && !arrowFnOpen && currentClass && braceDepth === classStartBraceDepth + 1) {
        const mHdr = trimmed.match(/^(?:(?:public|private|protected|static|async|readonly|override)\s+)*(?:(get|set)\s+)?(\*\s*)?([A-Za-z_$][\w$]*)\s*(?:<[\s\S]*>)?\s*\(/);
        if (mHdr && mHdr[3] && !RESERVED_WORDS.has(mHdr[3])) {
          const accessorKind = mHdr[1] || "";
          const mName = mHdr[3];
          let openP = -1, ad = 0;
          for (let k = trimmed.indexOf(mName) + mName.length; k < trimmed.length; k++) {
            if (trimmed[k] === "<") ad++;
            else if (trimmed[k] === ">" && trimmed[k - 1] !== "=") ad = Math.max(0, ad - 1);
            else if (trimmed[k] === "(" && ad === 0) {
              openP = k;
              break;
            }
          }
          const closeP = openP > 0 ? findBalancedParen(trimmed, openP) : -1;
          if (closeP > openP) {
            const afterP = trimmed.slice(closeP + 1).trim();
            const retM2 = afterP.match(/^(?::\s*([^{]+?))?\s*\{/);
            if (retM2) {
              validMethodOpen = [trimmed, mName, trimmed.slice(openP + 1, closeP).trim(), retM2[1] || "", accessorKind];
            }
          }
        }
      }
      const callbackArrowOpen = !fnOpen && !arrowFnOpen && !validMethodOpen ? trimmed.match(/(?:async\s*)?(?:(<[A-Za-z_$][\w$,\s=<>]*>)\s*)?\(([^()]*)\)\s*(?::\s*([^{=]+?))?\s*=>\s*\{$/) || trimmed.match(/(?:async\s*)?function\s*\*?(?:\s+[A-Za-z_$][\w$]*)?\s*(?:(<[A-Za-z_$][\w$,\s=<>]*>)\s*)?\(([^()]*)\)\s*(?::\s*([^{=]+?))?\s*\{$/) : null;
      let bodyStartInRaw = 0;
      if (fnOpen || arrowFnOpen || validMethodOpen || callbackArrowOpen) {
        if (fnOpen) {
          while (findBalancedParen(trimmed, trimmed.lastIndexOf("(")) < 0 && i + 1 < lines.length) {
            i++;
            rawLine += "\n" + lines[i];
            trimmed += " " + stripInlineCommentSafe(lines[i]).trim();
          }
        }
        if (arrowFnOpen && arrowFnOpen[2]) {
          const fnVarName = arrowFnOpen[2];
          const isConstFn = arrowFnOpen[1] === "const";
          env.set(fnVarName, { type: "function", isConst: isConstFn, line: lineNum, declaredType: "function" });
        }
        if (callbackArrowOpen && currentFn && /^return\b/.test(trimmed)) {
          currentFn.hasValueReturn = true;
        }
        fnScopeStack.push({
          fn: currentFn,
          startDepth: fnStartBraceDepth,
          prevEnv: new Map(env),
          prevTypeParams: new Map(activeTypeParams)
        });
        const methodKey = validMethodOpen && validMethodOpen[1] && currentClass ? validMethodOpen[4] === "set" ? `${currentClass}.set.${validMethodOpen[1]}` : validMethodOpen[4] === "get" ? `${currentClass}.get.${validMethodOpen[1]}` : `${currentClass}.${validMethodOpen[1]}` : "";
        const existingFn = (fnOpen && fnOpen[2] ? fns.get(fnOpen[2]) : void 0) || (methodKey && validMethodOpen ? fns.get(methodKey) || fns.get(`${currentClass}.${validMethodOpen[1]}`) : void 0);
        let activeFn;
        if (existingFn) {
          activeFn = existingFn;
          if (fnOpen && fnOpen[1] === "*") {
            activeFn.hasValueReturn = true;
          }
        } else if (callbackArrowOpen) {
          const cbTParams = callbackArrowOpen[1] ? parseTypeParams(callbackArrowOpen[1]) : [];
          const cbParamStr = (callbackArrowOpen[2] || "").trim();
          const cbRawRet = callbackArrowOpen[3] ? callbackArrowOpen[3].trim() : "any";
          const cbRet = callbackArrowOpen[3] ? resolveAlias(cbRawRet) : "any";
          const { params: cbParams, minArgs: cbMin } = parseParamList(cbParamStr, lineNum, false);
          activeFn = { name: "<callback>", params: cbParams, minArgs: cbMin, returnType: cbRet, rawReturnType: cbRawRet, typeParams: cbTParams, line: lineNum, hasValueReturn: false };
        } else {
          const fName = (fnOpen ? fnOpen[2] : arrowFnOpen ? arrowFnOpen[2] : methodKey || currentClass + "." + (validMethodOpen ? validMethodOpen[1] : "")) || "";
          let paramStr = "";
          let retType = "any";
          let rawRetType = "any";
          let fnTParams = [];
          if (fnOpen) {
            const openP = trimmed.indexOf("(");
            const closeP = findBalancedParen(trimmed, openP);
            if (closeP > openP) {
              paramStr = trimmed.slice(openP + 1, closeP).trim();
              const afterClose = trimmed.slice(closeP + 1).trim();
              const retM2 = afterClose.match(/^:\s*([^{]+?)(?:\s*\{[\s\S]*)?$/);
              if (retM2 && retM2[1]) {
                rawRetType = retM2[1].trim();
                retType = resolveAlias(rawRetType);
              }
            }
          } else if (arrowFnOpen) {
            fnTParams = arrowFnOpen[3] ? parseTypeParams(arrowFnOpen[3]) : [];
            paramStr = (arrowFnOpen[4] || "").trim();
            rawRetType = arrowFnOpen[5] ? arrowFnOpen[5].trim() : "any";
            retType = arrowFnOpen[5] ? resolveAlias(rawRetType) : "any";
          } else if (validMethodOpen) {
            paramStr = (validMethodOpen[2] || "").trim();
            const isCtorOrSetter = validMethodOpen[1] === "constructor" || validMethodOpen[4] === "set";
            rawRetType = isCtorOrSetter ? "void" : validMethodOpen[3] ? validMethodOpen[3].trim() : "any";
            retType = isCtorOrSetter ? "void" : resolveAlias(rawRetType);
          }
          const { params, minArgs } = parseParamList(paramStr, lineNum, Boolean(fnOpen || validMethodOpen));
          const isGen = Boolean(fnOpen && fnOpen[1] === "*" || /^Generator<|^AsyncGenerator<|^IterableIterator<|^Iterator</.test(retType));
          activeFn = { name: fName, params, minArgs, returnType: retType, rawReturnType: rawRetType, typeParams: fnTParams, line: lineNum, hasValueReturn: isGen };
          fns.set(fName, activeFn);
        }
        currentFn = activeFn;
        if (activeFn.typeParams) {
          activeFn.typeParams.forEach((tp) => activeTypeParams.set(tp.name, tp.name));
        }
        activeFn.params.forEach((p) => {
          env.set(p.name, { type: p.type, isConst: false, line: activeFn.line, declaredType: p.type });
        });
        fnStartBraceDepth = braceDepth;
        let openBraceIdx = -1;
        if (trimmed.endsWith("{")) {
          openBraceIdx = trimmed.lastIndexOf("{");
          bodyStartInRaw = rawLine.lastIndexOf("{");
        } else {
          let searchFrom = 0;
          const firstOpenP = trimmed.indexOf("(");
          if (firstOpenP >= 0) {
            const closeP = findBalancedParen(trimmed, firstOpenP);
            if (closeP > firstOpenP) searchFrom = closeP + 1;
          }
          let td = 0;
          for (let k = searchFrom; k < trimmed.length; k++) {
            const ch = trimmed[k];
            if (ch === '"' || ch === "'" || ch === "`") {
              k = skipString(trimmed, k) - 1;
              continue;
            }
            if (ch === "<" || ch === "(" || ch === "[") td++;
            else if (ch === ">" && trimmed[k - 1] !== "=" || ch === ")" || ch === "]") td = Math.max(0, td - 1);
            else if (ch === "{" && td === 0) {
              openBraceIdx = k;
              break;
            }
          }
          if (openBraceIdx >= 0) {
            const suffix = trimmed.slice(openBraceIdx);
            const rawIdx = rawLine.lastIndexOf(suffix);
            bodyStartInRaw = rawIdx >= 0 ? rawIdx : rawLine.indexOf("{");
          }
        }
        const closeBraceIdx = trimmed.lastIndexOf("}");
        const bodyAfterOpenBrace = openBraceIdx >= 0 ? trimmed.slice(openBraceIdx + 1) : "";
        const rm = bodyAfterOpenBrace.match(/\breturn\b([^;}\n]*)/);
        if (rm && rm[1]?.trim()) {
          activeFn.hasValueReturn = true;
          const inlineRetExpr = rm[1].trim();
          const inlineRetT = inferType(inlineRetExpr, lineNum);
          const expRet = activeFn.returnType;
          const unwrappedExp = expRet && expRet.startsWith("Promise<") && expRet.endsWith(">") ? expRet.slice(8, -1) : expRet;
          if (expRet && expRet !== "any" && !isExpressionAssignable(inlineRetExpr, inlineRetT, expRet, lineNum) && !isExpressionAssignable(inlineRetExpr, inlineRetT, unwrappedExp, lineNum)) {
            addDiag(lineNum, "TS2322", `\u4E0D\u80FD\u5C06\u8FD4\u56DE\u503C\u7C7B\u578B "${inlineRetT}" \u5206\u914D\u7ED9\u51FD\u6570 "${activeFn.name}" \u58F0\u660E\u7684\u8FD4\u56DE\u7C7B\u578B "${expRet}"`);
          }
        }
        if (openBraceIdx >= 0 && closeBraceIdx > openBraceIdx) {
          const inlineBody = trimmed.slice(openBraceIdx + 1, closeBraceIdx).trim();
          inlineBody.split(";").map((s) => s.trim()).filter(Boolean).forEach((stmt) => {
            const inlineAssign = stmt.match(/^([A-Za-z_$][\w$!]*(?:\.[A-Za-z_$][\w$!]*|\s*\[[^\]]+\])*)\s*(\+=|-=|\*=|\/=|=(?!=))\s*([\s\S]+)$/);
            if (inlineAssign && inlineAssign[1] && inlineAssign[3]) {
              const lhs = inlineAssign[1].trim();
              const rhsExpr = inlineAssign[3].trim();
              const rhsT = inferType(rhsExpr, lineNum);
              if (lhs.includes(".") || lhs.includes("[")) {
                const lhsT = inferType(lhs, lineNum);
                if (lhsT !== "any" && !isExpressionAssignable(rhsExpr, rhsT, lhsT, lineNum)) {
                  addDiag(lineNum, "TS2322", `\u4E0D\u80FD\u5C06\u7C7B\u578B "${rhsT}" \u5206\u914D\u7ED9\u7C7B\u578B "${lhsT}" ("${lhs}")`);
                }
              } else if (/^[A-Za-z_$][\w$]*$/.test(lhs) && !isKnownIdentifier(lhs)) {
                addDiag(lineNum, "TS2304", `\u627E\u4E0D\u5230\u540D\u79F0 "${lhs}"\uFF08\u53D8\u91CF\u672A\u58F0\u660E\uFF0C\u8BF7\u4F7F\u7528 let \u6216 const \u58F0\u660E\uFF09`);
              }
            }
          });
        }
      }
      for (let k = Math.max(0, bodyStartInRaw); k < rawLine.length; k++) {
        const ch = rawLine[k];
        if (ch === '"' || ch === "'" || ch === "`") {
          k = skipString(rawLine, k) - 1;
          continue;
        }
        if (ch === "/" && rawLine[k + 1] === "/") break;
        if (ch === "{") braceDepth++;
        else if (ch === "}") {
          braceDepth = Math.max(0, braceDepth - 1);
          const topSwitch = switchStack[switchStack.length - 1];
          if (topSwitch && braceDepth <= topSwitch.startDepth) {
            const sw = switchStack.pop();
            if (sw && sw.origInfo) {
              env.set(sw.expr, sw.origInfo);
            }
          }
          if (currentFn && braceDepth <= fnStartBraceDepth) {
            const isGenRet = /^Generator<|^AsyncGenerator<|^IterableIterator<|^Iterator</.test(currentFn.returnType);
            if (currentFn.returnType !== "any" && currentFn.returnType !== "void" && currentFn.returnType !== "Promise<void>" && currentFn.returnType !== "unknown" && !isGenRet && !currentFn.hasValueReturn) {
              addDiag(currentFn.line, "TS2355", `\u51FD\u6570 "${currentFn.name}" \u58F0\u660E\u8FD4\u56DE\u7C7B\u578B\u4E3A "${currentFn.returnType}"\uFF0C\u4F46\u7F3A\u5C11 return \u8FD4\u56DE\u503C\u8BED\u53E5`);
            }
            const prev = fnScopeStack.pop();
            if (prev) {
              currentFn = prev.fn;
              fnStartBraceDepth = prev.startDepth;
              if (prev.prevEnv) {
                env.clear();
                prev.prevEnv.forEach((v, kName) => env.set(kName, v));
                if (currentClass) env.set("this", { type: currentClass, isConst: true, line: lineNum, declaredType: currentClass });
              }
              if (prev.prevTypeParams) {
                activeTypeParams.clear();
                prev.prevTypeParams.forEach((v, kName) => activeTypeParams.set(kName, v));
              }
            } else {
              currentFn = null;
            }
          }
          if (currentClass && braceDepth <= classStartBraceDepth) {
            const clsTParams = interfaceTypeParams.get(currentClass) || [];
            clsTParams.forEach((tp) => activeTypeParams.delete(tp.name));
            currentClass = null;
            env.delete("this");
          }
        }
      }
      if (fnOpen || arrowFnOpen || validMethodOpen || callbackArrowOpen) continue;
      const catchM = trimmed.match(/^(?:}\s*)?catch\s*\(\s*([A-Za-z_$][\w$]*)(?:\s*:\s*[^)]+)?\s*\)/);
      if (catchM && catchM[1]) {
        env.set(catchM[1], { type: "any", isConst: false, line: lineNum, declaredType: "any" });
        continue;
      }
      if (/^(?:\}[\s);,]*|\}\s*,\s*[\s\S]+\)\s*;?|\}\s*else\s*\{?|else\s*\{?|try\s*\{?|\}\s*finally\s*\{?|finally\s*\{?|do\s*\{?)$/.test(trimmed)) {
        continue;
      }
      const forOfInM = trimmed.match(/^for\s*\(\s*(?:(const|let|var)\s+)?(.+?)\s+(of|in)\s+([\s\S]+?)\)\s*\{?$/);
      if (forOfInM && forOfInM[2] && forOfInM[4]) {
        const kind = forOfInM[1] || null;
        const lhsRaw = forOfInM[2].trim();
        const mode = forOfInM[3];
        const rhsExpr = forOfInM[4].trim();
        const rhsT = inferType(rhsExpr, lineNum);
        let elemT = "any";
        if (mode === "in") {
          elemT = "string";
        } else if (rhsT.endsWith("[]")) {
          elemT = rhsT.slice(0, -2);
        } else if (rhsT === "string") {
          elemT = "string";
        }
        if (kind) {
          const simpleVar = lhsRaw.match(/^([A-Za-z_$][\w$]*)(?:\s*:\s*([^=]+))?$/);
          if (simpleVar && simpleVar[1]) {
            const vName = simpleVar[1];
            const declT = simpleVar[2] ? resolveAlias(simpleVar[2].trim()) : elemT;
            env.set(vName, { type: declT, isConst: kind === "const", line: lineNum, declaredType: declT });
          } else {
            const bound = /* @__PURE__ */ new Set();
            extractBindingNames(lhsRaw, bound);
            bound.forEach((vName) => {
              env.set(vName, { type: "any", isConst: kind === "const", line: lineNum, declaredType: "any" });
            });
          }
        } else if (/^[A-Za-z_$][\w$]*$/.test(lhsRaw)) {
          if (!isKnownIdentifier(lhsRaw)) {
            addDiag(lineNum, "TS2304", `\u627E\u4E0D\u5230\u540D\u79F0 "${lhsRaw}"\uFF08\u53D8\u91CF\u672A\u58F0\u660E\uFF0C\u8BF7\u4F7F\u7528 let \u6216 const \u58F0\u660E\uFF09`);
          } else if (env.has(lhsRaw) && env.get(lhsRaw)?.isConst) {
            addDiag(lineNum, "TS2588", `\u65E0\u6CD5\u5206\u914D\u5230 "${lhsRaw}"\uFF0C\u56E0\u4E3A\u5B83\u662F\u5E38\u6570 (const)`);
          }
        }
        continue;
      }
      const forM = trimmed.match(/^for\s*\(\s*(?:(const|let|var)\s+)?([^;]*);([^;]*);([^)]*)\)/);
      if (forM && forM[2] !== void 0 && forM[3] !== void 0 && forM[4] !== void 0) {
        const kind = forM[1] || null;
        const initPart = forM[2].trim();
        if (kind && initPart) {
          const decls = splitTopLevel(initPart);
          decls.forEach((d) => {
            const dm = d.trim().match(/^([A-Za-z_$][\w$]*)(?:\s*:\s*([^=]+))?\s*=\s*(.+)$/);
            if (dm && dm[1] && dm[3]) {
              const vName = dm[1];
              const declT = dm[2] ? resolveAlias(dm[2].trim()) : null;
              const initT = inferType(dm[3].trim(), lineNum);
              if (declT && !isTsAssignable(initT, declT)) {
                addDiag(lineNum, "TS2322", `\u4E0D\u80FD\u5C06\u7C7B\u578B "${initT}" \u5206\u914D\u7ED9\u7C7B\u578B "${declT}" (\u5FAA\u73AF\u53D8\u91CF "${vName}")`);
              }
              env.set(vName, { type: declT || initT, isConst: kind === "const", line: lineNum });
            }
          });
        } else if (initPart) {
          splitTopLevel(initPart).forEach((d) => {
            const am = d.trim().match(/^([A-Za-z_$][\w$]*)\s*=\s*(.+)$/);
            if (am && am[1] && am[2]) {
              inferType(am[2].trim(), lineNum);
              if (!isKnownIdentifier(am[1])) {
                addDiag(lineNum, "TS2304", `\u627E\u4E0D\u5230\u540D\u79F0 "${am[1]}"\uFF08\u53D8\u91CF\u672A\u58F0\u660E\uFF0C\u8BF7\u4F7F\u7528 let \u6216 const \u58F0\u660E\uFF09`);
              } else if (env.has(am[1]) && env.get(am[1])?.isConst) {
                addDiag(lineNum, "TS2588", `\u65E0\u6CD5\u5206\u914D\u5230 "${am[1]}"\uFF0C\u56E0\u4E3A\u5B83\u662F\u5E38\u6570 (const)`);
              }
            } else {
              inferType(d.trim(), lineNum);
            }
          });
        }
        if (forM[3].trim()) inferType(forM[3].trim(), lineNum);
        if (forM[4].trim()) {
          const updVar = forM[4].trim().match(/^([A-Za-z_$][\w$]*)\s*(?:\+\+|--|\+=|-=|=)/);
          if (updVar && updVar[1]) {
            if (!isKnownIdentifier(updVar[1])) {
              addDiag(lineNum, "TS2304", `\u627E\u4E0D\u5230\u540D\u79F0 "${updVar[1]}"\uFF08\u53D8\u91CF\u672A\u58F0\u660E\uFF0C\u8BF7\u4F7F\u7528 let \u6216 const \u58F0\u660E\uFF09`);
            } else if (env.has(updVar[1]) && env.get(updVar[1])?.isConst) {
              addDiag(lineNum, "TS2588", `\u65E0\u6CD5\u5206\u914D\u5230 "${updVar[1]}"\uFF0C\u56E0\u4E3A\u5B83\u662F\u5E38\u6570 (const)`);
            }
          }
        }
        continue;
      }
      const varM = trimmed.match(/^(?:export\s+)?(const|let|var)\s+([\s\S]+?);?$/);
      if (varM) {
        const isConst = varM[1] === "const";
        let rest = varM[2] || "";
        const countOpenBrackets = (str) => {
          let b = 0;
          for (let cIdx = 0; cIdx < str.length; cIdx++) {
            const ch = str[cIdx];
            if (ch === '"' || ch === "'" || ch === "`") {
              cIdx = skipString(str, cIdx) - 1;
              continue;
            }
            if (ch === "{" || ch === "[" || ch === "(") b++;
            else if (ch === "}" || ch === "]" || ch === ")") b--;
          }
          return b;
        };
        let openB = countOpenBrackets(rest);
        while ((openB > 0 || /[=.,+\-*/|&(\[]$/.test(rest.trim())) && i + 1 < lines.length) {
          const nextLineRaw = lines[i + 1] ?? "";
          const nextLineClean = stripInlineCommentSafe(nextLineRaw).trim();
          for (let k = 0; k < nextLineRaw.length; k++) {
            const ch = nextLineRaw[k];
            if (ch === '"' || ch === "'" || ch === "`") {
              k = skipString(nextLineRaw, k) - 1;
              continue;
            }
            if (ch === "/" && nextLineRaw[k + 1] === "/") break;
            if (ch === "{") braceDepth++;
            else if (ch === "}") braceDepth = Math.max(0, braceDepth - 1);
          }
          i++;
          rest += " " + nextLineClean;
          openB = countOpenBrackets(rest);
          if (openB <= 0 && /;\s*$/.test(nextLineClean)) break;
        }
        rest = rest.replace(/;\s*$/, "").trim();
        if (openB === 0) {
          const parts = splitTopLevelDecl(rest);
          parts.forEach((part) => {
            const pTrim = part.trim();
            const pm = pTrim.match(/^([A-Za-z_$][\w$]*)(?:\s*:\s*((?:[^=]|=>)+?))?(?:\s*=\s*(?!=|>)([\s\S]+))?$/);
            if (pm && pm[1]) {
              const vName = pm[1];
              const declT = pm[2] ? resolveAlias(pm[2].trim()) : null;
              const initExpr = pm[3] ? pm[3].trim() : null;
              if (initExpr) {
                const inlineArrowM = initExpr.match(/^(?:async\s+)?(?:(<[\s\S]*?>)\s*)?\(([^)]*)\)\s*(?::\s*((?:[^=]|=>)+?))?\s*=>\s*([\s\S]+)$/);
                if (inlineArrowM && inlineArrowM[2] !== void 0) {
                  const arrowTParams = inlineArrowM[1] ? parseTypeParams(inlineArrowM[1]) : [];
                  const arrowParamStr = inlineArrowM[2].trim();
                  const arrowRawRet = inlineArrowM[3] ? inlineArrowM[3].trim() : null;
                  const { params: aParams, minArgs: aMin } = parseParamList(arrowParamStr, lineNum, false);
                  const aRet = arrowRawRet ? resolveAlias(arrowRawRet) : "any";
                  fns.set(vName, {
                    name: vName,
                    params: aParams,
                    minArgs: aMin,
                    returnType: aRet,
                    rawReturnType: arrowRawRet || aRet,
                    typeParams: arrowTParams,
                    line: lineNum,
                    hasValueReturn: true
                  });
                }
              }
              const narrowedPropKey = initExpr ? "__narrowed_prop_" + initExpr : "";
              let initT = initExpr ? inferType(initExpr, lineNum) : "any";
              if (narrowedPropKey && env.has(narrowedPropKey)) {
                initT = (env.get(narrowedPropKey) || { type: "any" }).type;
                env.delete(narrowedPropKey);
              }
              if (declT && initExpr) {
                if (initExpr.startsWith("{") && getInterfaceShape(declT)) {
                  checkObjectLiteralAgainstShape(initExpr, declT, lineNum, `\u53D8\u91CF "${vName}"`);
                } else if (declT.endsWith("[]") && splitTopLevelUnion(declT).length <= 1 && initExpr.startsWith("[")) {
                  checkArrayElementsAgainst(initExpr, declT.slice(0, -2), lineNum, `\u53D8\u91CF "${vName}" \u7684\u6570\u7EC4\u5B57\u9762\u91CF\u4E2D`);
                } else if (!isExpressionAssignable(initExpr, initT, declT, lineNum)) {
                  addDiag(lineNum, "TS2322", `\u4E0D\u80FD\u5C06\u7C7B\u578B "${initT}" \u5206\u914D\u7ED9\u7C7B\u578B "${declT}" (\u53D8\u91CF "${vName}")`);
                }
              }
              const litVal = isConst && initExpr ? inferLiteralType(initExpr) : null;
              env.set(vName, {
                type: declT || initT,
                isConst,
                line: lineNum,
                declaredType: declT || initT,
                literalType: litVal
              });
            } else if (pTrim.startsWith("[") || pTrim.startsWith("{")) {
              let eqIdx = -1, colonIdx = -1, patEndIdx = -1, d = 0;
              for (let k = 0; k < pTrim.length; k++) {
                const ch = pTrim[k];
                if (ch === '"' || ch === "'" || ch === "`") {
                  k = skipString(pTrim, k) - 1;
                  continue;
                }
                if (ch === "(" || ch === "[" || ch === "{") d++;
                else if (ch === ")" || ch === "]" || ch === "}") {
                  d--;
                  if (d === 0 && patEndIdx < 0) patEndIdx = k;
                } else if (ch === ":" && d === 0 && patEndIdx > 0 && colonIdx < 0 && eqIdx < 0) {
                  colonIdx = k;
                } else if (ch === "=" && d === 0 && pTrim[k + 1] !== "=" && pTrim[k + 1] !== ">") {
                  eqIdx = k;
                  break;
                }
              }
              if (eqIdx > 0) {
                const rhsExpr = pTrim.slice(eqIdx + 1).trim();
                const rhsT = inferType(rhsExpr, lineNum);
                if (colonIdx > 0 && colonIdx < eqIdx) {
                  const declT = resolveAlias(pTrim.slice(colonIdx + 1, eqIdx).trim());
                  if (declT && declT !== "any") {
                    if (rhsExpr.startsWith("{") && getInterfaceShape(declT)) {
                      checkObjectLiteralAgainstShape(rhsExpr, declT, lineNum, "\u89E3\u6784\u58F0\u660E");
                    } else if (!isExpressionAssignable(rhsExpr, rhsT, declT, lineNum)) {
                      addDiag(lineNum, "TS2322", `\u4E0D\u80FD\u5C06\u7C7B\u578B "${rhsT}" \u5206\u914D\u7ED9\u7C7B\u578B "${declT}" (\u89E3\u6784\u58F0\u660E)`);
                    }
                  }
                }
              }
              const patOnly = colonIdx > 0 ? pTrim.slice(0, colonIdx) : eqIdx > 0 ? pTrim.slice(0, eqIdx) : pTrim;
              const bound = /* @__PURE__ */ new Set();
              extractBindingNames(patOnly, bound);
              bound.forEach((vName) => {
                env.set(vName, { type: "any", isConst, line: lineNum, declaredType: "any" });
              });
            }
          });
        }
        continue;
      }
      const retM = trimmed.match(/^return(?:\s+([\s\S]+?))?;?$/);
      if (retM) {
        const retExpr = retM[1] ? retM[1].trim() : "";
        const retT = retExpr ? inferType(retExpr, lineNum) : "void";
        if (currentFn) {
          if (retExpr) currentFn.hasValueReturn = true;
          const expectedRet = currentFn.returnType;
          if (expectedRet && expectedRet !== "any") {
            const promiseInnerM = expectedRet.match(/^Promise<([\s\S]+)>$/);
            const genInnerM = expectedRet.match(/^(?:Async)?Generator<([\s\S]+)>$/);
            let unwrappedExpected = promiseInnerM && promiseInnerM[1] ? promiseInnerM[1] : expectedRet;
            if (genInnerM && genInnerM[1]) {
              const genArgs = splitTopLevelDecl(genInnerM[1]);
              unwrappedExpected = genArgs[1] ? genArgs[1].trim() : "any";
            }
            if (unwrappedExpected !== "any") {
              if (retExpr.startsWith("{") && getInterfaceShape(unwrappedExpected)) {
                checkObjectLiteralAgainstShape(retExpr, unwrappedExpected, lineNum, `\u51FD\u6570 "${currentFn.name}" \u8FD4\u56DE\u503C`);
              } else if (unwrappedExpected.endsWith("[]") && splitTopLevelUnion(unwrappedExpected).length <= 1 && retExpr.startsWith("[")) {
                checkArrayElementsAgainst(retExpr, unwrappedExpected.slice(0, -2), lineNum, `\u51FD\u6570 "${currentFn.name}" \u8FD4\u56DE\u6570\u7EC4\u4E2D`);
              } else if (!isExpressionAssignable(retExpr, retT, expectedRet, lineNum) && !isExpressionAssignable(retExpr, retT, unwrappedExpected, lineNum)) {
                addDiag(lineNum, "TS2322", `\u4E0D\u80FD\u5C06\u8FD4\u56DE\u503C\u7C7B\u578B "${retT}" \u5206\u914D\u7ED9\u51FD\u6570 "${currentFn.name}" \u58F0\u660E\u7684\u8FD4\u56DE\u7C7B\u578B "${expectedRet}"`);
              }
            }
          }
        }
        continue;
      }
      const throwM = trimmed.match(/^throw\s+([\s\S]+?);?$/);
      if (throwM && throwM[1]) {
        inferType(throwM[1].trim(), lineNum);
        continue;
      }
      const switchM = trimmed.match(/^switch\s*\(([\s\S]+)\)\s*\{?$/);
      if (switchM && switchM[1]) {
        const swExpr = switchM[1].trim();
        inferType(swExpr, lineNum);
        if (/^[A-Za-z_$][\w$]*$/.test(swExpr) && env.has(swExpr)) {
          const origInfo = env.get(swExpr) || { type: "any" };
          const parts = splitTopLevelUnion(resolveAlias(origInfo.type)).map((p) => p.trim()).filter(Boolean);
          switchStack.push({
            expr: swExpr,
            startDepth: braceDepth - (trimmed.endsWith("{") ? 1 : 0),
            origInfo: { ...origInfo },
            remainingTypes: parts
          });
        }
        continue;
      }
      const caseM = trimmed.match(/^case\s+([^:]+):(.*)$/);
      if (caseM && caseM[1]) {
        const caseExpr = caseM[1].trim();
        const caseT = inferType(caseExpr, lineNum);
        const caseLit = inferLiteralType(caseExpr) || caseT;
        const sw = switchStack[switchStack.length - 1];
        if (sw) {
          sw.remainingTypes = sw.remainingTypes.filter((t) => t !== caseLit && t !== caseExpr);
          if (env.has(sw.expr)) {
            env.set(sw.expr, { ...sw.origInfo, type: caseLit });
          }
        }
        const caseRest = (caseM[2] || "").trim();
        if (caseRest) {
          const inlineRet = caseRest.match(/^return(?:\s+([\s\S]+?))?;?$/);
          if (inlineRet) {
            const rExpr = inlineRet[1] ? inlineRet[1].trim() : "";
            const rT = rExpr ? inferType(rExpr, lineNum) : "void";
            if (currentFn) {
              if (rExpr) currentFn.hasValueReturn = true;
              const expectedRet = currentFn.returnType;
              if (expectedRet && expectedRet !== "any" && !isExpressionAssignable(rExpr, rT, expectedRet, lineNum)) {
                addDiag(lineNum, "TS2322", `\u4E0D\u80FD\u5C06\u8FD4\u56DE\u503C\u7C7B\u578B "${rT}" \u5206\u914D\u7ED9\u51FD\u6570 "${currentFn.name}" \u58F0\u660E\u7684\u8FD4\u56DE\u7C7B\u578B "${expectedRet}"`);
              }
            }
          }
        }
        continue;
      }
      const defaultM = trimmed.match(/^default\s*:(.*)$/);
      if (defaultM) {
        const sw = switchStack[switchStack.length - 1];
        if (sw) {
          const remT = sw.remainingTypes.length > 0 ? sw.remainingTypes.join("|") : "never";
          if (env.has(sw.expr)) {
            env.set(sw.expr, { ...sw.origInfo, type: remT });
          }
        }
        continue;
      }
      const applyClauseNarrowing = (clauseStr, forEarlyExit) => {
        const c = clauseStr.trim();
        const predCallM = c.match(/^(!)?\s*([A-Za-z_$][\w$]*)\s*\(\s*([A-Za-z_$][\w$]*)\s*\)$/);
        if (predCallM && predCallM[2] && predCallM[3]) {
          const isNegated = Boolean(predCallM[1]);
          const fnName = predCallM[2];
          const argVar = predCallM[3];
          const sig = fns.get(fnName);
          if (sig && sig.rawReturnType && env.has(argVar)) {
            const pm = sig.rawReturnType.match(/^([A-Za-z_$][\w$]*)\s+is\s+([\s\S]+)$/);
            if (pm && pm[2]) {
              const targetT = resolveAlias(pm[2].trim());
              const curInfo = env.get(argVar) || { type: "any" };
              if (!forEarlyExit && !isNegated || forEarlyExit && isNegated) {
                env.set(argVar, { ...curInfo, type: targetT });
              } else if (forEarlyExit && !isNegated || !forEarlyExit && isNegated) {
                const rem = splitTopLevelUnion(resolveAlias(curInfo.type)).filter((u) => u !== targetT);
                if (rem.length > 0) env.set(argVar, { ...curInfo, type: rem.join("|") });
              }
            }
          }
        }
        const typeofM = c.match(/^typeof\s+([A-Za-z_$][\w$]*)\s*(===|!==)\s*["'](string|number|boolean|bigint|symbol|undefined|object|function)["']$/);
        if (typeofM && typeofM[1] && typeofM[2] && typeofM[3] && env.has(typeofM[1])) {
          const varName = typeofM[1];
          const op = typeofM[2];
          const primT = typeofM[3];
          const curInfo = env.get(varName) || { type: "any" };
          if (!forEarlyExit && op === "===" || forEarlyExit && op === "!==") {
            env.set(varName, { ...curInfo, type: primT });
          } else if (forEarlyExit && op === "===" || !forEarlyExit && op === "!==") {
            const rem = splitTopLevelUnion(resolveAlias(curInfo.type)).filter((u) => u !== primT);
            if (rem.length > 0) env.set(varName, { ...curInfo, type: rem.join("|") });
          }
        }
      };
      const inlineIfRet = trimmed.match(/^if\s*\((.+?)\)\s*(return(?:\s+([\s\S]+?))?|break|continue);?$/);
      if (inlineIfRet && inlineIfRet[1] && inlineIfRet[2]) {
        const condStr = inlineIfRet[1].trim();
        const actionKw = inlineIfRet[2];
        const retExpr = inlineIfRet[3] ? inlineIfRet[3].trim() : "";
        inferType(condStr, lineNum);
        if (actionKw.startsWith("return")) {
          const savedInlineNarrow = /* @__PURE__ */ new Map();
          condStr.split("&&").forEach((clause) => {
            const cm = clause.trim().match(/^([A-Za-z_$][\w$]*)\s*!==\s*(null|undefined)$/);
            if (cm && cm[1] && cm[2] && env.has(cm[1])) {
              const curInfo = env.get(cm[1]) || { type: "any" };
              savedInlineNarrow.set(cm[1], curInfo);
              env.set(cm[1], { ...curInfo, type: stripNullableFromType(curInfo.type, cm[2]) });
            }
          });
          const retT = retExpr ? inferType(retExpr, lineNum) : "void";
          savedInlineNarrow.forEach((prevInfo, k) => env.set(k, prevInfo));
          if (currentFn) {
            if (retExpr) currentFn.hasValueReturn = true;
            const expectedRet = currentFn.returnType;
            if (expectedRet && expectedRet !== "any" && !isExpressionAssignable(retExpr, retT, expectedRet, lineNum)) {
              addDiag(lineNum, "TS2322", `\u4E0D\u80FD\u5C06\u8FD4\u56DE\u503C\u7C7B\u578B "${retT}" \u5206\u914D\u7ED9\u51FD\u6570 "${currentFn.name}" \u58F0\u660E\u7684\u8FD4\u56DE\u7C7B\u578B "${expectedRet}"`);
            }
          }
        }
        condStr.split("||").forEach((clause) => {
          const cm = clause.trim().match(/^([A-Za-z_$][\w$]*)\s*===\s*(null|undefined)$/);
          const cmRev = !cm ? clause.trim().match(/^(null|undefined)\s*===\s*([A-Za-z_$][\w$]*)$/) : null;
          const negM = !cm && !cmRev ? clause.trim().match(/^!\s*([A-Za-z_$][\w$]*)$/) : null;
          const varName = cm ? cm[1] : cmRev ? cmRev[2] : negM ? negM[1] : null;
          if (varName && env.has(varName)) {
            const curInfo = env.get(varName) || { type: "any" };
            let nextT = stripNullableFromType(curInfo.type, "null");
            nextT = stripNullableFromType(nextT, "undefined");
            env.set(varName, { ...curInfo, type: nextT });
          }
          applyClauseNarrowing(clause, true);
        });
        continue;
      }
      const condPrefixM = trimmed.match(/^(?:}\s*)?(?:if|while|else\s+if)\s*\(/);
      if (condPrefixM) {
        const openIdx = trimmed.indexOf("(", condPrefixM[0].length - 1);
        const closeIdx = findBalancedParen(trimmed, openIdx);
        if (closeIdx > openIdx) {
          const condStr = trimmed.slice(openIdx + 1, closeIdx).trim();
          inferType(condStr, lineNum);
          const tail = trimmed.slice(closeIdx + 1).trim();
          if (tail && tail !== "{") {
            const bodyInner = tail.startsWith("{") && tail.endsWith("}") ? tail.slice(1, -1).trim() : tail;
            bodyInner.split(";").map((s) => s.trim()).filter(Boolean).forEach((stmt) => {
              const inlineAssign = stmt.match(/^([A-Za-z_$][\w$!]*(?:\.[A-Za-z_$][\w$!]*|\s*\[[^\]]+\])*)\s*(\+=|-=|\*=|\/=|=(?!=))\s*([\s\S]+)$/);
              if (inlineAssign && inlineAssign[1] && inlineAssign[3]) {
                const lhs = inlineAssign[1].trim();
                const rhsExpr = inlineAssign[3].trim();
                const rhsT = inferType(rhsExpr, lineNum);
                if (/^[A-Za-z_$][\w$]*$/.test(lhs) && !isKnownIdentifier(lhs)) {
                  addDiag(lineNum, "TS2304", `\u627E\u4E0D\u5230\u540D\u79F0 "${lhs}"\uFF08\u53D8\u91CF\u672A\u58F0\u660E\uFF0C\u8BF7\u4F7F\u7528 let \u6216 const \u58F0\u660E\uFF09`);
                } else if (lhs.includes(".") || lhs.includes("[")) {
                  const lhsT = inferType(lhs, lineNum);
                  if (lhsT !== "any" && !isExpressionAssignable(rhsExpr, rhsT, lhsT, lineNum)) {
                    addDiag(lineNum, "TS2322", `\u4E0D\u80FD\u5C06\u7C7B\u578B "${rhsT}" \u5206\u914D\u7ED9\u7C7B\u578B "${lhsT}" ("${lhs}")`);
                  }
                }
              }
            });
          }
          condStr.split("&&").forEach((clause) => {
            const cm = clause.trim().match(/^([A-Za-z_$][\w$]*)\s*!==\s*(null|undefined)$/);
            if (cm && cm[1] && cm[2] && env.has(cm[1])) {
              const curInfo = env.get(cm[1]) || { type: "any" };
              env.set(cm[1], { ...curInfo, type: stripNullableFromType(curInfo.type, cm[2]) });
            }
            applyClauseNarrowing(clause, false);
            const propCm = clause.trim().match(/^([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+)\s*!==\s*(null|undefined)$/);
            if (propCm && propCm[1] && propCm[2] && i + 1 < lines.length) {
              const propExpr = propCm[1];
              const nextTrim = stripInlineCommentSafe(lines[i + 1]).trim();
              const nextDecl = nextTrim.match(/^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+)\s*;?$/);
              if (nextDecl && nextDecl[2] === propExpr) {
                const propT = stripNullableFromType(inferType(propExpr, lineNum), propCm[2]);
                env.set("__narrowed_prop_" + propExpr, { type: propT });
              }
            }
          });
          if (/^if\s*\(/.test(trimmed) && i + 1 < lines.length && /^\s*(?:return|break|continue)\b/.test(lines[i + 1] ?? "")) {
            condStr.split("||").forEach((clause) => {
              const cm = clause.trim().match(/^([A-Za-z_$][\w$]*)\s*===\s*(null|undefined)$/);
              if (cm && cm[1] && cm[2] && env.has(cm[1])) {
                const curInfo = env.get(cm[1]) || { type: "any" };
                env.set(cm[1], { ...curInfo, type: stripNullableFromType(curInfo.type, cm[2]) });
              }
              applyClauseNarrowing(clause, true);
            });
          }
          continue;
        }
      }
      const incM = trimmed.match(/^(?:(\+\+|--)\s*([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)|([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*(\+\+|--));?$/);
      if (incM) {
        const vName = incM[2] || incM[3] || "";
        if (vName.includes(".")) {
          const propT = inferType(vName, lineNum);
          if (propT !== "any" && !isTsAssignable("number", propT)) {
            addDiag(lineNum, "TS2322", `\u4E0D\u80FD\u5BF9\u7C7B\u578B "${propT}" \u7684\u5C5E\u6027 "${vName}" \u6267\u884C\u81EA\u589E/\u81EA\u51CF\u8FD0\u7B97`);
          }
        } else if (env.has(vName)) {
          const info = env.get(vName) || { type: "any" };
          if (info.isConst) {
            addDiag(lineNum, "TS2588", `\u65E0\u6CD5\u5206\u914D\u5230 "${vName}"\uFF0C\u56E0\u4E3A\u5B83\u662F\u5E38\u6570 (const)`);
          } else if (info.type !== "any" && !isTsAssignable("number", info.type)) {
            addDiag(lineNum, "TS2322", `\u4E0D\u80FD\u5BF9\u7C7B\u578B "${info.type}" \u7684\u53D8\u91CF "${vName}" \u6267\u884C\u81EA\u589E/\u81EA\u51CF\u8FD0\u7B97`);
          }
        } else if (!isKnownIdentifier(vName)) {
          addDiag(lineNum, "TS2304", `\u627E\u4E0D\u5230\u540D\u79F0 "${vName}"\uFF08\u53D8\u91CF\u672A\u58F0\u660E\uFF0C\u8BF7\u4F7F\u7528 let \u6216 const \u58F0\u660E\uFF09`);
        }
        continue;
      }
      if (/^\[[^\]]+\]\s*=\s*[\s\S]+$/.test(trimmed)) {
        const eqIdx = trimmed.indexOf("=");
        const lhsPart = trimmed.slice(0, eqIdx).trim();
        const rhsPart = trimmed.slice(eqIdx + 1).replace(/;\s*$/, "").trim();
        inferType(rhsPart, lineNum);
        const bound = /* @__PURE__ */ new Set();
        extractBindingNames(lhsPart, bound);
        bound.forEach((vName) => {
          if (!isKnownIdentifier(vName)) {
            addDiag(lineNum, "TS2304", `\u627E\u4E0D\u5230\u540D\u79F0 "${vName}"\uFF08\u53D8\u91CF\u672A\u58F0\u660E\uFF0C\u8BF7\u4F7F\u7528 let \u6216 const \u58F0\u660E\uFF09`);
          } else if (env.has(vName) && env.get(vName)?.isConst) {
            addDiag(lineNum, "TS2588", `\u65E0\u6CD5\u5206\u914D\u5230 "${vName}"\uFF0C\u56E0\u4E3A\u5B83\u662F\u5E38\u6570 (const)`);
          }
        });
        continue;
      }
      const assignM = trimmed.match(/^([A-Za-z_$][\w$!]*(?:\.[A-Za-z_$][\w$!]*|\s*\[[^\]]+\])*)\s*(\+=|-=|\*=|\/=|=(?!=))\s*([\s\S]+?);?$/);
      if (assignM && assignM[1] && assignM[2] && assignM[3]) {
        const lhs = assignM[1].trim();
        const op = assignM[2];
        const rhs = assignM[3].trim();
        const rhsT = inferType(rhs, lineNum);
        if (/^[A-Za-z_$][\w$]*$/.test(lhs)) {
          if (env.has(lhs)) {
            const info = env.get(lhs) || { type: "any" };
            const checkTargetT = info.declaredType || info.type;
            if (info.isConst) {
              addDiag(lineNum, "TS2588", `\u65E0\u6CD5\u5206\u914D\u5230 "${lhs}"\uFF0C\u56E0\u4E3A\u5B83\u662F\u5E38\u6570 (const)`);
            } else if (checkTargetT !== "any") {
              if (op === "=" && rhs.startsWith("{") && getInterfaceShape(checkTargetT)) {
                checkObjectLiteralAgainstShape(rhs, checkTargetT, lineNum, `\u53D8\u91CF "${lhs}"`);
              } else {
                const effectiveT = op === "=" ? rhsT : inferType(`${lhs} ${op[0]} (${rhs})`, lineNum);
                if (!isExpressionAssignable(op === "=" ? rhs : "", effectiveT, checkTargetT, lineNum)) {
                  addDiag(lineNum, "TS2322", `\u4E0D\u80FD\u5C06\u7C7B\u578B "${effectiveT}" \u5206\u914D\u7ED9\u7C7B\u578B "${checkTargetT}" (\u53D8\u91CF "${lhs}")`);
                }
              }
            }
          } else if (!isKnownIdentifier(lhs)) {
            addDiag(lineNum, "TS2304", `\u627E\u4E0D\u5230\u540D\u79F0 "${lhs}"\uFF08\u53D8\u91CF\u672A\u58F0\u660E\uFF0C\u8BF7\u4F7F\u7528 let \u6216 const \u58F0\u660E\uFF09`);
          }
        } else if (lhs.includes(".") || lhs.includes("[")) {
          const lhsT = inferType(lhs, lineNum);
          if (lhsT !== "any" && !isExpressionAssignable(rhs, rhsT, lhsT, lineNum)) {
            addDiag(lineNum, "TS2322", `\u4E0D\u80FD\u5C06\u7C7B\u578B "${rhsT}" \u5206\u914D\u7ED9\u7C7B\u578B "${lhsT}" ("${lhs}")`);
          }
        }
        continue;
      }
      inferType(trimmed, lineNum);
      const assertCallM = trimmed.match(/^([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*;?$/);
      if (assertCallM && assertCallM[1] && assertCallM[2] !== void 0) {
        const sig = fns.get(assertCallM[1]);
        if (sig && sig.rawReturnType && /^asserts\b/.test(sig.rawReturnType)) {
          const am = sig.rawReturnType.match(/^asserts\s+([A-Za-z_$][\w$]*)(?:\s+is\s+([\s\S]+))?$/);
          if (am && am[1]) {
            const pIdx = sig.params.findIndex((p) => p.name === am[1]);
            const callArgs = splitTopLevel(assertCallM[2]);
            const argExpr = (pIdx >= 0 ? callArgs[pIdx] : callArgs[0])?.trim();
            if (argExpr && /^[A-Za-z_$][\w$]*$/.test(argExpr) && env.has(argExpr)) {
              const curInfo = env.get(argExpr) || { type: "any" };
              if (am[2]) {
                env.set(argExpr, { ...curInfo, type: resolveAlias(am[2].trim()) });
              } else {
                let nextT = stripNullableFromType(curInfo.type, "null");
                nextT = stripNullableFromType(nextT, "undefined");
                env.set(argExpr, { ...curInfo, type: nextT });
              }
            }
          }
        }
      }
    }
  }
  function typecheckTS(src, strict = appState.STRICT_TS) {
    extractTsInterfaceMetadata(src);
    if (!strict) return [];
    if (typeof src === "string" && _TYPECHECK_CACHE.src === src && _TYPECHECK_CACHE.strict === strict) {
      return _TYPECHECK_CACHE.diags.map((d) => ({ ...d }));
    }
    const ctx = createTypeCheckContext(src);
    const evalEngine = createTypeEvalEngine(ctx);
    const inferEngine = createTypeInferEngine(ctx, evalEngine);
    collectPass1Declarations(ctx, evalEngine, inferEngine);
    checkPass2Statements(ctx, evalEngine, inferEngine);
    const { diagnostics } = ctx;
    if (_TS_WORKER_STATE.lastSrc === src && Array.isArray(_TS_WORKER_STATE.lastDiags)) {
      _TS_WORKER_STATE.lastDiags.forEach((wd) => {
        if (!diagnostics.some((d) => d.line === wd.line && d.code === wd.code)) {
          diagnostics.push({ line: wd.line, code: wd.code, message: wd.message });
        }
      });
    } else {
      requestTsWorkerCheck(src, strict);
    }
    if (typeof src === "string") {
      _TYPECHECK_CACHE = { src, strict, diags: diagnostics.map((d) => ({ ...d })) };
    }
    return diagnostics;
  }
  var _TS_WORKER_STATE = {
    worker: null,
    failed: false,
    reqId: 0,
    pendingSrc: null,
    lastSrc: null,
    lastDiags: null,
    timer: null
  };
  function ensureTsWorker() {
    if (_TS_WORKER_STATE.worker || _TS_WORKER_STATE.failed) return _TS_WORKER_STATE.worker;
    if (typeof Worker === "undefined" || typeof window === "undefined") {
      _TS_WORKER_STATE.failed = true;
      return null;
    }
    try {
      const w = new Worker("editor/ts-worker.bundle.js");
      w.onmessage = (ev) => {
        const data = ev && ev.data;
        if (!data || data.type !== "checkResult") return;
        _TS_WORKER_STATE.lastSrc = data.src;
        const newDiags = Array.isArray(data.diagnostics) ? data.diagnostics : [];
        _TS_WORKER_STATE.lastDiags = newDiags;
        if (_TYPECHECK_CACHE.src === data.src && newDiags.length > 0) {
          _TYPECHECK_CACHE = { src: null, strict: null, diags: [] };
          try {
            uiHooks.updateEditorChrome();
          } catch (_) {
          }
        }
      };
      w.onerror = (ev) => {
        if (ev && typeof ev.preventDefault === "function") ev.preventDefault();
        _TS_WORKER_STATE.failed = true;
        _TS_WORKER_STATE.worker = null;
      };
      _TS_WORKER_STATE.worker = w;
      return w;
    } catch (_) {
      _TS_WORKER_STATE.failed = true;
      return null;
    }
  }
  function requestTsWorkerCheck(src, strict) {
    if (!strict || typeof src !== "string" || typeof Worker === "undefined") return;
    const w = ensureTsWorker();
    if (!w) return;
    _TS_WORKER_STATE.pendingSrc = src;
    if (_TS_WORKER_STATE.timer) clearTimeout(_TS_WORKER_STATE.timer);
    _TS_WORKER_STATE.timer = setTimeout(() => {
      const id = ++_TS_WORKER_STATE.reqId;
      try {
        w.postMessage({ id, type: "check", src: _TS_WORKER_STATE.pendingSrc, strict: Boolean(strict) });
      } catch (_) {
      }
    }, 60);
  }
  var typeCheck = typecheckTS;
  var parseType = normalizeTsType;
  var typeToStr = normalizeTsType;
  var isAssignable = isTsAssignable;
  function inferExpr(expr) {
    return normalizeTsType(expr);
  }

  // src/runtime/event-loop.ts
  var event_loop_exports = {};
  __export(event_loop_exports, {
    anonStackLine: () => anonStackLine,
    clearLog: () => clearLog,
    createVirtualEventLoop: () => createVirtualEventLoop,
    createVirtualPromiseAndFsEnv: () => createVirtualPromiseAndFsEnv,
    fnBodyLineOffset: () => fnBodyLineOffset,
    formatCallArgItem: () => formatCallArgItem,
    formatCallFrameLabel: () => formatCallFrameLabel,
    getOrCreateVfsApi: () => getOrCreateVfsApi,
    hasAsyncConstructs: () => hasAsyncConstructs,
    isThenableLike: () => isThenableLike,
    resetTraceState: () => resetTraceState,
    rethrowIfControlSignal: () => rethrowIfControlSignal,
    safeJSONStringify: () => safeJSONStringify,
    say: () => say,
    sourceLineFromStack: () => sourceLineFromStack
  });

  // src/runtime/event-loop-env.ts
  function isThenableLike(val) {
    if (!val || typeof val !== "object" && typeof val !== "function") return false;
    return "then" in val && typeof val.then === "function";
  }
  function rethrowIfControlSignal(err) {
    if (err === PAUSE_SIGNAL || isRecord(err) && (err.__debugPause || err.__timeout)) {
      throw err;
    }
  }
  function getOrCreateVfsApi() {
    if (globalThis.__VFS__) return globalThis.__VFS__;
    const fallbackFiles = /* @__PURE__ */ new Map();
    const resolveFallbackWorkspacePath = (rawPath, allowEmptyRoot = false) => {
      const s = String(rawPath ?? "").trim().replace(/\\/g, "/");
      if (!s) {
        if (allowEmptyRoot) return "";
        throw new Error(`ENOENT: no such file or directory, open ''`);
      }
      if (/^[A-Za-z]:/.test(s) || s.startsWith("~")) {
        throw new Error(`EACCES: permission denied, access '${rawPath}' (outside workspace is not allowed)`);
      }
      let rel = s;
      if (s.startsWith("/")) {
        if (s === "/" || s === "/workspace" || s === "/workspace/") {
          rel = "";
        } else if (s.startsWith("/workspace/")) {
          rel = s.slice("/workspace/".length);
        } else {
          throw new Error(`EACCES: permission denied, access '${rawPath}' (outside workspace is not allowed)`);
        }
      } else if (s === "workspace" || s === "workspace/") {
        rel = "";
      } else if (s.startsWith("workspace/")) {
        rel = s.slice("workspace/".length);
      }
      const rawParts = rel.split("/");
      const resolved = [];
      for (const part of rawParts) {
        if (!part || part === ".") continue;
        if (part === "..") {
          if (resolved.length === 0) {
            throw new Error(`EACCES: permission denied, access '${rawPath}' (outside workspace is not allowed)`);
          }
          resolved.pop();
          continue;
        }
        resolved.push(part);
      }
      if (resolved.length === 0 && !allowEmptyRoot) {
        throw new Error(`EISDIR: illegal operation on a directory, open '${rawPath}'`);
      }
      return resolved.join("/");
    };
    const ensureParentFolders = (norm) => {
      const parts = norm.split("/").filter(Boolean);
      let acc = "";
      for (let idx = 0; idx < parts.length - 1; idx++) {
        const seg = parts[idx] || "";
        acc = acc ? `${acc}/${seg}` : seg;
        if (!fallbackFiles.has(acc)) {
          fallbackFiles.set(acc, { type: "folder", content: "", mtime: Date.now() });
        }
      }
    };
    const api = {
      resolveWorkspacePath(rawPath, allowEmptyRoot = false) {
        return resolveFallbackWorkspacePath(rawPath, allowEmptyRoot);
      },
      readFile(p) {
        const norm = resolveFallbackWorkspacePath(p, false);
        const node = fallbackFiles.get(norm);
        if (!node) throw new Error(`ENOENT: no such file or directory, open '${p}'`);
        if (node.type === "folder") throw new Error(`EISDIR: illegal operation on a directory, read '${p}'`);
        return node.content;
      },
      writeFile(p, data) {
        const norm = resolveFallbackWorkspacePath(p, false);
        ensureParentFolders(norm);
        const str = typeof data === "string" ? data : JSON.stringify(data, null, 2);
        fallbackFiles.set(norm, { type: "file", content: str, mtime: Date.now() });
        return true;
      },
      appendFile(p, data) {
        const norm = resolveFallbackWorkspacePath(p, false);
        ensureParentFolders(norm);
        const prev = fallbackFiles.get(norm)?.content ?? "";
        const str = typeof data === "string" ? data : JSON.stringify(data);
        fallbackFiles.set(norm, { type: "file", content: prev + str, mtime: Date.now() });
        return true;
      },
      exists(p) {
        const norm = resolveFallbackWorkspacePath(p, true);
        if (!norm) return true;
        return fallbackFiles.has(norm);
      },
      listFiles(p) {
        const norm = resolveFallbackWorkspacePath(p || ".", true);
        const prefix = norm ? norm + "/" : "";
        const out = /* @__PURE__ */ new Set();
        fallbackFiles.forEach((_v, k) => {
          if (!prefix) {
            const first = k.split("/")[0];
            if (first) out.add(first);
          } else if (k.startsWith(prefix)) {
            const rest = k.slice(prefix.length).split("/")[0];
            if (rest) out.add(rest);
          }
        });
        return Array.from(out).sort();
      },
      readdir(p) {
        return api.listFiles(p);
      },
      mkdir(p) {
        const norm = resolveFallbackWorkspacePath(p, true);
        if (!norm) return true;
        ensureParentFolders(norm);
        fallbackFiles.set(norm, { type: "folder", content: "", mtime: Date.now() });
        return true;
      },
      deleteFile(p) {
        const norm = resolveFallbackWorkspacePath(p, false);
        const existed = fallbackFiles.delete(norm);
        Array.from(fallbackFiles.keys()).forEach((k) => {
          if (k.startsWith(norm + "/")) fallbackFiles.delete(k);
        });
        return existed;
      },
      unlink(p) {
        return api.deleteFile(p);
      },
      stat(p) {
        const norm = resolveFallbackWorkspacePath(p, true);
        if (!norm) {
          return {
            size: 0,
            isFile: () => false,
            isDirectory: () => true
          };
        }
        const node = fallbackFiles.get(norm);
        if (!node) throw new Error(`ENOENT: no such file or directory, stat '${p}'`);
        return {
          size: node.type === "file" ? node.content.length : 0,
          isFile: () => node.type === "file",
          isDirectory: () => node.type === "folder"
        };
      },
      listAll() {
        return Array.from(fallbackFiles.keys()).sort();
      },
      clear() {
        fallbackFiles.clear();
      }
    };
    globalThis.__VFS__ = api;
    globalThis.vfs = api;
    return api;
  }
  function createVirtualPromiseAndFsEnv(opts) {
    const { loop, getCurLine, nextPromiseId, enqueueMicrotask, __t } = opts;
    class VirtualPromise {
      __isVirtualPromise;
      id;
      label;
      state;
      value;
      reason;
      line;
      _handlers;
      _internal;
      reactions;
      constructor(executor, label) {
        loop.used = true;
        this.__isVirtualPromise = true;
        this.id = nextPromiseId();
        this.label = label || "Promise#" + this.id;
        this.state = "pending";
        this.value = void 0;
        this.reason = void 0;
        this.line = getCurLine() || 1;
        this._handlers = [];
        loop.promises.push(this);
        const resolve = (val) => this._resolve(val);
        const reject = (reason) => this._reject(reason);
        if (typeof executor === "function") {
          try {
            executor(resolve, reject);
          } catch (err) {
            rethrowIfControlSignal(err);
            this._reject(err);
          }
        }
      }
      _resolve(val) {
        if (this.state !== "pending") return;
        if (isThenableLike(val)) {
          try {
            val.then((v) => this._resolve(v), (r) => this._reject(r));
          } catch (err) {
            rethrowIfControlSignal(err);
            this._reject(err);
          }
          return;
        }
        this.state = "fulfilled";
        this.value = val;
        this._flush();
      }
      _reject(reason) {
        if (this.state !== "pending") return;
        this.state = "rejected";
        this.reason = reason;
        this._flush();
      }
      _flush() {
        if (this.state === "pending") return;
        const pending = this._handlers.splice(0, this._handlers.length);
        for (const h of pending) {
          this._scheduleHandler(h);
        }
      }
      _scheduleHandler(h) {
        const isFulfilled = this.state === "fulfilled";
        const cb = isFulfilled ? h.onFulfilled : h.onRejected;
        const arg = isFulfilled ? this.value : this.reason;
        enqueueMicrotask({
          label: h.label || this.label + (isFulfilled ? ".then" : ".catch"),
          line: h.line || this.line || 1,
          isInternalAwait: Boolean(h.isInternalAwait),
          rawCb: cb,
          run: () => {
            if (typeof cb !== "function") {
              if (isFulfilled) h.child._resolve(arg);
              else h.child._reject(arg);
              return;
            }
            try {
              const cbSrc = Function.prototype.toString.call(cb);
              if (!h.isInternalAwait && !cbSrc.includes("__t(") && typeof __t === "function") {
                __t(h.line || 1, "\u26A1 [\u5FAE\u4EFB\u52A1 Microtask] " + (h.label || "Promise.then"), loop.globalSnapFn);
              }
              const res = cb(arg);
              h.child._resolve(res);
            } catch (err) {
              rethrowIfControlSignal(err);
              h.child._reject(err);
            }
          }
        });
      }
      then(onFulfilled, onRejected, metaLabel, isInternalAwait) {
        const callLine = getCurLine() || this.line || 1;
        const child = new VirtualPromise(null, metaLabel || this.label + ".then");
        if (isInternalAwait) child._internal = true;
        const handler = {
          onFulfilled,
          onRejected,
          child,
          line: callLine,
          label: metaLabel || this.label + ".then",
          isInternalAwait: Boolean(isInternalAwait)
        };
        if (this.state === "pending") {
          this._handlers.push(handler);
        } else {
          this._scheduleHandler(handler);
        }
        return child;
      }
      catch(onRejected) {
        return this.then(null, onRejected, this.label + ".catch");
      }
      finally(onFinally) {
        return this.then(
          (v) => {
            if (typeof onFinally === "function") onFinally();
            return v;
          },
          (err) => {
            if (typeof onFinally === "function") onFinally();
            throw err;
          },
          this.label + ".finally"
        );
      }
      static resolve(val) {
        loop.used = true;
        if (val instanceof VirtualPromise) {
          return val;
        }
        if (isThenableLike(val)) {
          return new VirtualPromise((res, rej) => val.then(res, rej), "Promise.resolve(thenable)");
        }
        return new VirtualPromise((res) => res(val), "Promise.resolve(" + formatShortVal(val) + ")");
      }
      static reject(reason) {
        loop.used = true;
        return new VirtualPromise((_res, rej) => rej(reason), "Promise.reject(" + formatShortVal(reason) + ")");
      }
      static all(items) {
        loop.used = true;
        const arr = Array.from(items || []);
        return new VirtualPromise((resolve, reject) => {
          if (arr.length === 0) {
            resolve([]);
            return;
          }
          const out = new Array(arr.length);
          let left = arr.length;
          arr.forEach((item, idx) => {
            VirtualPromise.resolve(item).then((val) => {
              out[idx] = val;
              if (--left === 0) resolve(out);
            }, reject);
          });
        }, "Promise.all");
      }
      static race(items) {
        loop.used = true;
        const arr = Array.from(items || []);
        return new VirtualPromise((resolve, reject) => {
          arr.forEach((item) => {
            VirtualPromise.resolve(item).then(resolve, reject);
          });
        }, "Promise.race");
      }
    }
    const readRequiredVfsFile = (p) => {
      const content = getOrCreateVfsApi().readFile(p);
      if (content === null) {
        throw new Error(`ENOENT: no such file or directory, open '${p}'`);
      }
      return content;
    };
    const fsPromisesApi = {
      readFile(p, _encoding) {
        loop.used = true;
        return new VirtualPromise((resolve, reject) => {
          try {
            resolve(readRequiredVfsFile(p));
          } catch (e) {
            reject(e);
          }
        }, `fs.readFile(${formatShortVal(p)})`);
      },
      writeFile(p, data, _encoding) {
        loop.used = true;
        return new VirtualPromise((resolve, reject) => {
          try {
            getOrCreateVfsApi().writeFile(p, typeof data === "string" ? data : String(data ?? ""));
            resolve(void 0);
          } catch (e) {
            reject(e);
          }
        }, `fs.writeFile(${formatShortVal(p)})`);
      },
      appendFile(p, data, _encoding) {
        loop.used = true;
        return new VirtualPromise((resolve, reject) => {
          try {
            getOrCreateVfsApi().appendFile(p, typeof data === "string" ? data : String(data ?? ""));
            resolve(void 0);
          } catch (e) {
            reject(e);
          }
        }, `fs.appendFile(${formatShortVal(p)})`);
      },
      readdir(p) {
        loop.used = true;
        return new VirtualPromise((resolve, reject) => {
          try {
            resolve(getOrCreateVfsApi().readdir(p));
          } catch (e) {
            reject(e);
          }
        }, `fs.readdir(${formatShortVal(p || ".")})`);
      },
      mkdir(p, _options) {
        loop.used = true;
        return new VirtualPromise((resolve, reject) => {
          try {
            getOrCreateVfsApi().mkdir(p);
            resolve(void 0);
          } catch (e) {
            reject(e);
          }
        }, `fs.mkdir(${formatShortVal(p)})`);
      },
      unlink(p) {
        loop.used = true;
        return new VirtualPromise((resolve, reject) => {
          try {
            getOrCreateVfsApi().unlink(p);
            resolve(void 0);
          } catch (e) {
            reject(e);
          }
        }, `fs.unlink(${formatShortVal(p)})`);
      },
      rm(p, _options) {
        loop.used = true;
        return new VirtualPromise((resolve, reject) => {
          try {
            getOrCreateVfsApi().unlink(p);
            resolve(void 0);
          } catch (e) {
            reject(e);
          }
        }, `fs.rm(${formatShortVal(p)})`);
      },
      stat(p) {
        loop.used = true;
        return new VirtualPromise((resolve, reject) => {
          try {
            resolve(getOrCreateVfsApi().stat(p));
          } catch (e) {
            reject(e);
          }
        }, `fs.stat(${formatShortVal(p)})`);
      },
      exists(p) {
        loop.used = true;
        return new VirtualPromise((resolve, reject) => {
          try {
            resolve(getOrCreateVfsApi().exists(p));
          } catch (e) {
            reject(e);
          }
        }, `fs.exists(${formatShortVal(p)})`);
      },
      access(p, _mode) {
        loop.used = true;
        return new VirtualPromise((resolve, reject) => {
          try {
            getOrCreateVfsApi().stat(p);
            resolve(void 0);
          } catch (e) {
            reject(e);
          }
        }, `fs.access(${formatShortVal(p)})`);
      },
      copyFile(srcPath, destPath) {
        loop.used = true;
        return new VirtualPromise((resolve, reject) => {
          try {
            const content = readRequiredVfsFile(srcPath);
            getOrCreateVfsApi().writeFile(destPath, content);
            resolve(void 0);
          } catch (e) {
            reject(e);
          }
        }, `fs.copyFile(${formatShortVal(srcPath)})`);
      },
      rename(oldPath, newPath) {
        loop.used = true;
        return new VirtualPromise((resolve, reject) => {
          try {
            const content = readRequiredVfsFile(oldPath);
            getOrCreateVfsApi().writeFile(newPath, content);
            getOrCreateVfsApi().unlink(oldPath);
            resolve(void 0);
          } catch (e) {
            reject(e);
          }
        }, `fs.rename(${formatShortVal(oldPath)})`);
      }
    };
    const fsModuleEnv = {
      promises: fsPromisesApi,
      readFileSync(p, _encoding) {
        return readRequiredVfsFile(p);
      },
      writeFileSync(p, data, _encoding) {
        getOrCreateVfsApi().writeFile(p, typeof data === "string" ? data : String(data ?? ""));
      },
      appendFileSync(p, data, _encoding) {
        getOrCreateVfsApi().appendFile(p, typeof data === "string" ? data : String(data ?? ""));
      },
      existsSync(p) {
        try {
          return getOrCreateVfsApi().exists(p);
        } catch (_) {
          return false;
        }
      },
      readdirSync(p) {
        return getOrCreateVfsApi().readdir(p);
      },
      mkdirSync(p, _options) {
        getOrCreateVfsApi().mkdir(p);
      },
      unlinkSync(p) {
        getOrCreateVfsApi().unlink(p);
      },
      rmSync(p, _options) {
        getOrCreateVfsApi().unlink(p);
      },
      statSync(p) {
        return getOrCreateVfsApi().stat(p);
      },
      copyFileSync(srcPath, destPath) {
        const content = readRequiredVfsFile(srcPath);
        getOrCreateVfsApi().writeFile(destPath, content);
      },
      renameSync(oldPath, newPath) {
        const content = readRequiredVfsFile(oldPath);
        getOrCreateVfsApi().writeFile(newPath, content);
        getOrCreateVfsApi().unlink(oldPath);
      }
    };
    return { VirtualPromise, fsModuleEnv };
  }

  // src/runtime/event-loop.ts
  function isAwaitYieldDescriptor(val) {
    return isRecord(val) && Boolean(val.__isAwait);
  }
  function say(msg, cls, line) {
    const entry = { msg };
    if (cls !== void 0) entry.cls = cls;
    if (line !== void 0) entry.line = line;
    appState.CONSOLE_LOGS.push(entry);
    notifyConsoleLog("append", entry);
    uiHooks.appendConsoleLog(entry);
  }
  function clearLog(msg) {
    appState.CONSOLE_LOGS.length = 0;
    notifyConsoleLog("clear");
    uiHooks.clearConsoleDom();
    if (msg) say(msg, "dim");
  }
  function anonStackLine(stack) {
    const re = /,\s*<anonymous>:(\d+):\d+/g;
    const m = re.exec(String(stack || ""));
    return m && m[1] ? parseInt(m[1], 10) : 0;
  }
  var FN_BODY_LINE_OFFSET = null;
  function fnBodyLineOffset() {
    if (FN_BODY_LINE_OFFSET !== null) return FN_BODY_LINE_OFFSET;
    let off = 2;
    try {
      new Function('throw new Error("probe")')();
    } catch (e) {
      const line = anonStackLine(e instanceof Error ? e.stack : void 0);
      if (line > 0) off = Math.max(1, line - 1);
    }
    FN_BODY_LINE_OFFSET = off;
    return off;
  }
  function sourceLineFromStack(stack, lineCount) {
    const stackLine = anonStackLine(stack);
    if (!stackLine) return 0;
    const line = stackLine - fnBodyLineOffset() - 1;
    if (!isFinite(line) || line < 1) return 0;
    if (lineCount && line > lineCount) return 0;
    return line;
  }
  function hasAsyncConstructs(src) {
    if (!src || typeof src !== "string") return false;
    const clean = blankStrings(src);
    return /\b(?:async|await|Promise|setTimeout|queueMicrotask|sleep)\b/.test(clean);
  }
  function createVirtualEventLoop(__t, getCurLine = () => 1, onSuspendFrame, onResumeFrame) {
    let promiseSeq = 0;
    let microSeq = 0;
    let macroSeq = 0;
    let coroSeq = 0;
    const loop = {
      used: false,
      virtualTime: 0,
      phase: "sync",
      activeTaskLabel: "\u4E3B\u7EBF\u7A0B\u540C\u6B65\u6808 (Sync)",
      coroutines: [],
      microtasks: [],
      macrotasks: [],
      promises: [],
      globalSnapFn: null
    };
    function enqueueMicrotask(item) {
      loop.used = true;
      const task = {
        id: ++microSeq,
        label: item.label || "microtask#" + microSeq,
        line: item.line || getCurLine() || 1,
        status: "queued",
        isInternalAwait: Boolean(item.isInternalAwait),
        run: item.run,
        rawCb: item.rawCb || null
      };
      loop.microtasks.push(task);
      return task;
    }
    const { VirtualPromise, fsModuleEnv } = createVirtualPromiseAndFsEnv({
      loop,
      getCurLine,
      nextPromiseId: () => ++promiseSeq,
      enqueueMicrotask,
      __t
    });
    const env = {
      Promise: VirtualPromise,
      fs: fsModuleEnv,
      queueMicrotask(cb) {
        loop.used = true;
        const line = getCurLine() || 1;
        enqueueMicrotask({
          label: "queueMicrotask",
          line,
          rawCb: cb,
          run: () => {
            if (typeof cb !== "function") return;
            const cbSrc = Function.prototype.toString.call(cb);
            if (!cbSrc.includes("__t(") && typeof __t === "function") {
              __t(line, "\u26A1 [\u5FAE\u4EFB\u52A1] queueMicrotask", loop.globalSnapFn);
            }
            cb();
          }
        });
      },
      setTimeout(cb, delay = 0, ...args) {
        loop.used = true;
        const d = Math.max(0, Number(delay) || 0);
        const line = getCurLine() || 1;
        const id = ++macroSeq;
        loop.macrotasks.push({
          id,
          label: `setTimeout (${d}ms)`,
          delay: d,
          fireAt: loop.virtualTime + d,
          line,
          status: "waiting",
          cb,
          args
        });
        return id;
      },
      clearTimeout(id) {
        const t = loop.macrotasks.find((m) => m.id === id && m.status === "waiting");
        if (t) t.status = "cancelled";
      },
      sleep(ms = 0, val = void 0) {
        loop.used = true;
        const d = Math.max(0, Number(ms) || 0);
        return new VirtualPromise((resolve) => {
          env.setTimeout(() => resolve(val), d);
        }, `sleep(${d}ms)`);
      }
    };
    function runAsyncCoroutine(genFn, self, fnName, defLine) {
      loop.used = true;
      const coro = {
        id: ++coroSeq,
        name: fnName || "async",
        line: defLine || getCurLine() || 1,
        status: "running",
        awaitExpr: null,
        fid: 0
      };
      loop.coroutines.push(coro);
      const outPromise = new VirtualPromise(null, `${coro.name}()`);
      let gen;
      try {
        gen = genFn.call(self);
      } catch (err) {
        rethrowIfControlSignal(err);
        coro.status = "rejected";
        outPromise._reject(err);
        return outPromise;
      }
      function drive(method, arg) {
        coro.status = "running";
        coro.awaitExpr = null;
        let stepRes;
        try {
          stepRes = gen[method](arg);
        } catch (err) {
          rethrowIfControlSignal(err);
          coro.status = "rejected";
          outPromise._reject(err);
          return;
        }
        if (stepRes.done) {
          coro.status = "done";
          outPromise._resolve(stepRes.value);
          return;
        }
        const yielded = stepRes.value;
        const isAwaitDesc = isAwaitYieldDescriptor(yielded);
        const awaitedVal = isAwaitDesc ? yielded.value : yielded;
        const fid = isAwaitDesc && typeof yielded.fid === "number" ? yielded.fid : 0;
        const awaitLine = isAwaitDesc && typeof yielded.line === "number" ? yielded.line : getCurLine() || coro.line;
        const awaitExpr = isAwaitDesc && typeof yielded.expr === "string" && yielded.expr ? yielded.expr : "await";
        coro.status = "suspended";
        coro.line = awaitLine;
        coro.awaitExpr = awaitExpr;
        coro.fid = fid;
        if (fid && typeof onSuspendFrame === "function") {
          onSuspendFrame(fid, awaitLine, awaitExpr);
        }
        const awaitedPromise = VirtualPromise.resolve(awaitedVal);
        awaitedPromise.then(
          (resolvedVal) => {
            if (fid && typeof onResumeFrame === "function") {
              onResumeFrame(fid);
            }
            drive("next", resolvedVal);
          },
          (rejectedReason) => {
            if (fid && typeof onResumeFrame === "function") {
              onResumeFrame(fid);
            }
            drive("throw", rejectedReason);
          },
          `await \u6062\u590D: ${coro.name} (L${awaitLine})`,
          true
        );
      }
      drive("next", void 0);
      return outPromise;
    }
    function drainEventLoop(entryVal, fallbackSnapFn) {
      if (fallbackSnapFn && !loop.globalSnapFn) loop.globalSnapFn = fallbackSnapFn;
      if (!loop.used) return entryVal;
      let safety = 0;
      while (safety++ < 2e3) {
        const nextMicro = loop.microtasks.find((m) => m.status === "queued");
        if (nextMicro) {
          nextMicro.status = "running";
          loop.phase = "microtask";
          loop.activeTaskLabel = nextMicro.label;
          try {
            nextMicro.run();
          } finally {
            if (nextMicro.status === "running") nextMicro.status = "done";
          }
          continue;
        }
        let bestMacro = null;
        for (const m of loop.macrotasks) {
          if (m.status !== "waiting") continue;
          if (!bestMacro || m.fireAt < bestMacro.fireAt || m.fireAt === bestMacro.fireAt && m.id < bestMacro.id) {
            bestMacro = m;
          }
        }
        if (bestMacro) {
          bestMacro.status = "running";
          loop.virtualTime = Math.max(loop.virtualTime, bestMacro.fireAt);
          loop.phase = "macrotask";
          loop.activeTaskLabel = `${bestMacro.label} @ ${loop.virtualTime}ms`;
          try {
            if (typeof bestMacro.cb === "function") {
              const cbSrc = Function.prototype.toString.call(bestMacro.cb);
              if (!cbSrc.includes("__t(") && typeof __t === "function") {
                __t(bestMacro.line || 1, `\u26A1 [\u5B8F\u4EFB\u52A1 @ ${loop.virtualTime}ms] ${bestMacro.label}`, loop.globalSnapFn);
              }
              bestMacro.cb(...bestMacro.args || []);
            }
          } catch (err) {
            rethrowIfControlSignal(err);
            throw err;
          } finally {
            if (bestMacro.status === "running") bestMacro.status = "done";
          }
          continue;
        }
        break;
      }
      loop.phase = "idle";
      loop.activeTaskLabel = "\u4E8B\u4EF6\u5FAA\u73AF\u5DF2\u6E05\u7A7A (Idle)";
      if (isRecord(entryVal) && entryVal.__isVirtualPromise) {
        if (entryVal.state === "rejected") {
          throw entryVal.reason instanceof Error ? entryVal.reason : new Error(String(entryVal.reason));
        }
        if (entryVal.state === "fulfilled") {
          return entryVal.value;
        }
      }
      return entryVal;
    }
    function toVizSnapshot() {
      return {
        kind: "eventloop",
        now: loop.virtualTime,
        virtualTime: loop.virtualTime,
        phase: loop.phase,
        activeTask: loop.activeTaskLabel,
        activeTaskLabel: loop.activeTaskLabel,
        coroutines: loop.coroutines.slice(-8).map((c) => ({
          id: c.id,
          name: c.name,
          line: c.line,
          status: c.status,
          awaitExpr: c.awaitExpr,
          awaitingExpr: c.awaitExpr
        })),
        microtasks: loop.microtasks.filter((m) => m.status !== "done").concat(
          loop.microtasks.filter((m) => m.status === "done").slice(-3)
        ).slice(0, 8).map((m) => ({
          id: m.id,
          label: m.label,
          line: m.line,
          status: m.status
        })),
        macrotasks: loop.macrotasks.filter((m) => m.status !== "done" && m.status !== "cancelled").concat(
          loop.macrotasks.filter((m) => m.status === "done").slice(-3)
        ).slice(0, 8).map((m) => ({
          id: m.id,
          label: m.label,
          delay: m.delay,
          due: m.fireAt,
          fireAt: m.fireAt,
          line: m.line,
          status: m.status
        })),
        promises: loop.promises.filter((p) => !p._internal).slice(-8).map((p) => ({
          id: p.id,
          label: p.label,
          state: p.state,
          value: p.state === "fulfilled" ? formatShortVal(p.value) : p.state === "rejected" ? formatShortVal(p.reason) : "pending",
          valStr: p.state === "fulfilled" ? formatShortVal(p.value) : p.state === "rejected" ? formatShortVal(p.reason) : "pending",
          reactions: p.reactions ? p.reactions.length : 0,
          line: p.line
        }))
      };
    }
    return {
      loop,
      env,
      runAsyncCoroutine,
      drainEventLoop,
      toVizSnapshot
    };
  }
  function formatCallArgItem(val) {
    if (val === void 0) return "undefined";
    if (val === null) return "null";
    if (typeof val === "number" || typeof val === "boolean") return String(val);
    if (typeof val === "string") {
      return val.length > 10 ? JSON.stringify(val.slice(0, 8) + "\u2026") : JSON.stringify(val);
    }
    if (Array.isArray(val)) {
      if (val.length === 0) return "[]";
      if (Array.isArray(val[0])) return `[${val.length}\xD7${val[0].length}]`;
      if (val.length <= 4) return "[" + val.map((x) => formatCallArgItem(x)).join(", ") + "]";
      return "[" + val.slice(0, 3).map((x) => formatCallArgItem(x)).join(", ") + ", \u2026]";
    }
    if (isMapLike(val)) return `Map(${val.size})`;
    if (isSetLike(val)) return `Set(${val.size})`;
    if (typeof val === "object") {
      if ("val" in val && ("left" in val || "right" in val)) return `Tree(${val.val})`;
      if ("val" in val && "next" in val) return `List(${val.val})`;
      return "{\u2026}";
    }
    return String(val);
  }
  function formatCallFrameLabel(fnName, _paramNames, paramVals) {
    const vals = Array.isArray(paramVals) ? paramVals : [];
    if (!vals.length) return `${fnName}()`;
    const isPrimitive = (v) => v === null || v === void 0 || typeof v === "number" || typeof v === "string" || typeof v === "boolean";
    const primVals = vals.filter(isPrimitive);
    const hasComplex = vals.some((v) => !isPrimitive(v));
    if (hasComplex && primVals.length >= 2 && primVals.every((v) => typeof v === "number")) {
      return `${fnName}(${primVals.map((v) => formatCallArgItem(v)).join(", ")})`;
    }
    return `${fnName}(${vals.map((v) => formatCallArgItem(v)).join(", ")})`;
  }
  function resetTraceState() {
    uiHooks.stopAuto();
    uiHooks.clearFlyLayer();
    appState.TRACE = { title: "TypeScript Playground \xB7 Debug", code: [], steps: [] };
    appState.DEBUG_SESSION = {
      active: false,
      finished: false,
      crashed: false,
      error: null,
      errorLine: -1,
      returnValue: void 0,
      compiledFn: null,
      originalLines: [],
      callExpr: "undefined"
    };
    appState.RUNTIME_ERROR_LINES.clear();
    appState.cur = 0;
    appState.watched = /* @__PURE__ */ new Set();
    appState.SEEN_VARS_EVER = /* @__PURE__ */ new Set();
    appState.layoutSpan = /* @__PURE__ */ Object.create(null);
    uiHooks.renderPicker();
    uiHooks.renderStatic(0);
    uiHooks.updateEditorChrome();
  }

  // src/runtime/runner.ts
  var runner_exports = {};
  __export(runner_exports, {
    buildFrameSnapshotFromClosure: () => buildFrameSnapshotFromClosure,
    computeAndAppendNextStep: () => computeAndAppendNextStep,
    evalCall: () => evalCall,
    generateTrace: () => generateTrace,
    initWatchedVars: () => initWatchedVars,
    rebuildFromSource: () => rebuildFromSource,
    reportTypeErrors: () => reportTypeErrors,
    runOnce: () => runOnce,
    runTrace: () => runTrace,
    startDebug: () => startDebug
  });

  // src/viz/memory-normalizers.ts
  var asChildFrame = (v) => isFrame(v) ? v : null;
  function hasForEachMethod(val) {
    return isRecord(val) && typeof val.forEach === "function";
  }
  function normalizeTree(value) {
    if (value && Array.isArray(value.nodes)) {
      return {
        kind: "tree",
        total: value.total || value.nodes.length,
        nodes: value.nodes.slice(0, 31).map((n) => ({
          val: n.val !== void 0 ? n.val : n.id,
          left: n.left ?? null,
          right: n.right ?? null
        })),
        root: value.root ?? 0
      };
    }
    const nodes = [];
    const seen = /* @__PURE__ */ new Set();
    const nodeMap = /* @__PURE__ */ new Map();
    function walk(node) {
      if (!node || typeof node !== "object" || seen.has(node)) return null;
      seen.add(node);
      if (nodes.length >= 31) {
        if (seen.size < 2e3) {
          walk(asChildFrame(node.left));
          walk(asChildFrame(node.right));
        }
        return null;
      }
      const idx = nodes.length;
      nodeMap.set(node, idx);
      const item = {
        val: node.val !== void 0 ? node.val : node.value,
        left: null,
        right: null
      };
      nodes.push(item);
      item.left = walk(asChildFrame(node.left));
      item.right = walk(asChildFrame(node.right));
      return idx;
    }
    const root = walk(value);
    const out = { kind: "tree", nodes, root: root ?? 0, total: seen.size };
    defineHidden(out, "__nodeMap", nodeMap);
    return out;
  }
  function normalizeList(value) {
    const pyMeta = isFrame(value) && isFrame(value.__py_meta__) ? value.__py_meta__ : null;
    if (Array.isArray(value)) {
      const total = pyMeta && typeof pyMeta.total === "number" ? pyMeta.total : value.length;
      const out2 = { kind: "list", items: value.slice(0, 30).map((x) => cloneDeepBounded(x, 1)), total };
      if (total > 20) {
        defineHidden(out2, "__raw", value);
        if (pyMeta) defineHidden(out2, "__pyMeta", pyMeta);
      }
      return out2;
    }
    const items = [];
    const rawNodes = [];
    const rawVals = [];
    const seen = /* @__PURE__ */ new Set();
    let curNode = value;
    while (curNode && typeof curNode === "object" && !seen.has(curNode) && rawNodes.length < 5e3) {
      seen.add(curNode);
      const v = curNode.val !== void 0 ? curNode.val : curNode.value;
      rawNodes.push(curNode);
      rawVals.push(v);
      if (items.length < 30) items.push(cloneDeepBounded(v, 1));
      curNode = curNode.next;
    }
    const out = { kind: "list", items, total: rawNodes.length };
    if (rawNodes.length > 0) {
      defineHidden(out, "__rawNodes", rawNodes);
      defineHidden(out, "__rawVals", rawVals);
    }
    return out;
  }
  function normalizeGraph(value) {
    if (value && Array.isArray(value.nodes) && Array.isArray(value.edges)) {
      const rawNodes = value.nodes.slice(0, 16);
      const count = rawNodes.length || 1;
      const nodes = rawNodes.map((n, idx) => {
        const angle = 2 * Math.PI * idx / count - Math.PI / 2;
        const id = n && typeof n === "object" ? n.id ?? idx : n;
        const label = n && typeof n === "object" ? n.label ?? n.val ?? id : String(n);
        const x = n && typeof n.x === "number" ? n.x : Math.round(90 + 62 * Math.cos(angle));
        const y = n && typeof n.y === "number" ? n.y : Math.round(68 + 48 * Math.sin(angle));
        return { id, label: String(label), x, y };
      });
      const edges = value.edges.slice(0, 32).map(
        (e) => Array.isArray(e) ? [e[0], e[1]] : [e.from ?? 0, e.to ?? 0]
      );
      return { kind: "graph", nodes, edges, totalNodes: value.nodes.length, totalEdges: value.edges.length };
    }
    return { kind: "graph", nodes: [], edges: [] };
  }
  function snapshot(kind, value, extra) {
    const recVal = isFrame(value) ? value : null;
    const pyMeta = recVal && isFrame(recVal.__py_meta__) ? recVal.__py_meta__ : null;
    if (kind === "stack") {
      const arr = Array.isArray(value) ? value : [];
      const total = pyMeta && typeof pyMeta.total === "number" ? pyMeta.total : arr.length;
      let items;
      let baseIdx = 0;
      if (pyMeta && Array.isArray(pyMeta.tail) && total > arr.length) {
        items = pyMeta.tail.map((x) => cloneDeepBounded(x, 1));
        baseIdx = Math.max(0, total - items.length);
      } else if (arr.length > 40) {
        baseIdx = arr.length - 40;
        items = arr.slice(baseIdx).map((x) => cloneDeepBounded(x, 1));
      } else {
        items = arr.slice(0, 40).map((x) => cloneDeepBounded(x, 1));
      }
      return Object.assign({ kind, items, total, baseIdx }, extra || {});
    }
    if (kind === "array" || kind === "heap" || kind === "queue" || kind === "uf") {
      const arr = Array.isArray(value) ? value : [];
      const total = pyMeta && typeof pyMeta.total === "number" ? pyMeta.total : arr.length;
      const items = arr.slice(0, 40).map((x) => cloneDeepBounded(x, 1));
      const out = Object.assign({ kind, items, total }, extra || {});
      if (total > 20) {
        defineHidden(out, "__raw", arr);
        if (pyMeta) defineHidden(out, "__pyMeta", pyMeta);
      }
      return out;
    }
    if (kind === "list") {
      return Object.assign(normalizeList(Array.isArray(value) ? value : recVal), extra || {});
    }
    if (kind === "tree") {
      return Object.assign(normalizeTree(recVal), extra || {});
    }
    if (kind === "graph") {
      return Object.assign(normalizeGraph(recVal), extra || {});
    }
    if (kind === "string") {
      const s = String(value);
      const total = s.length;
      const items = s.slice(0, 40).split("");
      const out = Object.assign({ kind, items, total }, extra || {});
      if (total > 20) {
        defineHidden(out, "__raw", s);
      }
      return out;
    }
    if (kind === "map") {
      const entries = [];
      let total = 0;
      if (isMapLike(value)) {
        total = pyMeta && typeof pyMeta.total === "number" ? pyMeta.total : value.size;
        for (const [k, v] of value) {
          if (entries.length >= 40) break;
          entries.push({ k: cloneDeepBounded(k, 1), v: cloneDeepBounded(v, 1) });
        }
      } else if (hasForEachMethod(recVal)) {
        recVal.forEach((v, k) => {
          total++;
          if (entries.length < 40) entries.push({ k: cloneDeepBounded(k, 1), v: cloneDeepBounded(v, 1) });
        });
      } else if (recVal) {
        const keys = Object.keys(recVal);
        total = keys.length;
        keys.slice(0, 40).forEach((k) => entries.push({ k, v: cloneDeepBounded(recVal[k], 1) }));
      }
      const out = Object.assign({ kind, entries, total }, extra || {});
      if (total > 20) defineHidden(out, "__raw", value);
      return out;
    }
    if (kind === "set") {
      const items = [];
      let total = 0;
      if (isSetLike(value)) {
        total = pyMeta && typeof pyMeta.total === "number" ? pyMeta.total : value.size;
        for (const v of value) {
          if (items.length >= 40) break;
          items.push(cloneDeepBounded(v, 1));
        }
      } else if (hasForEachMethod(recVal)) {
        recVal.forEach((v) => {
          total++;
          if (items.length < 40) items.push(cloneDeepBounded(v, 1));
        });
      }
      const out = Object.assign({ kind, items, total }, extra || {});
      if (total > 20) defineHidden(out, "__raw", value);
      return out;
    }
    if (kind === "grid") {
      const totalRows = pyMeta && typeof pyMeta.totalRows === "number" ? pyMeta.totalRows : Array.isArray(value) ? value.length : 0;
      const totalCols = pyMeta && typeof pyMeta.totalCols === "number" ? pyMeta.totalCols : Array.isArray(value) && Array.isArray(value[0]) ? value[0].length : 0;
      const cloned = Array.isArray(value) ? value.slice(0, 30).map((r) => Array.isArray(r) ? r.slice(0, 30).map((c) => cloneDeepBounded(c, 2)) : r) : [[0]];
      const out = Object.assign({ kind, cells: cloned, mark: null, deps: [], totalRows, totalCols }, extra || {});
      if (totalRows > 10 || totalCols > 10) {
        defineHidden(out, "__raw", value);
        if (pyMeta) defineHidden(out, "__pyMeta", pyMeta);
      }
      return out;
    }
    if (kind === "interface" || kind === "object") {
      return Object.assign({ kind: "interface", fields: [], entries: [] }, extra || {});
    }
    return { kind: "array", items: [] };
  }
  function classifyValue(name, value) {
    if (value == null) return null;
    const n = String(name);
    if (Array.isArray(value)) {
      if (value.length > 0 && Array.isArray(value[0])) return snapshot("grid", value);
      if (/^(parent|uf|fa|dsu)\b/i.test(n)) return snapshot("uf", value);
      if (/stack|stk/i.test(n)) return snapshot("stack", value);
      if (/queue|deque/i.test(n)) return snapshot("queue", value);
      if (/heap|pq/i.test(n)) return snapshot("heap", value);
      if (/^list$/i.test(n)) return snapshot("list", value);
      return snapshot("array", value);
    }
    if (isMapLike(value)) return snapshot("map", value);
    if (isSetLike(value)) return snapshot("set", value);
    if (typeof value === "string") {
      if (value.length > 0) return snapshot("string", value);
      return null;
    }
    if (isFrame(value)) {
      const obj = value;
      if (obj.__isVirtualPromise) return null;
      if (Array.isArray(obj.nodes) && Array.isArray(obj.edges)) return snapshot("graph", obj);
      if (Array.isArray(obj.nodes) && "root" in obj) return snapshot("tree", obj);
      if (n !== "this") {
        if (("val" in obj || "value" in obj) && ("left" in obj || "right" in obj)) return snapshot("tree", obj);
        if (("val" in obj || "value" in obj) && "next" in obj) return snapshot("list", obj);
      }
      const ifaceDef = matchInterfaceForObject(n, obj);
      const annotType = appState.CURRENT_TS_META.varTypes.get(n);
      const ifaceName = ifaceDef ? ifaceDef.name : annotType || obj.__py_cls__ || "object";
      const isClass = Boolean(ifaceDef && ifaceDef.isClass || obj.__py_cls__);
      const fieldMap = /* @__PURE__ */ new Map();
      if (ifaceDef) {
        ifaceDef.fields.forEach((f) => {
          const fk = f.k || f.name || "";
          fieldMap.set(fk, {
            k: fk,
            v: fk in obj ? cloneDeepBounded(obj[fk], 1) : void 0,
            declaredType: f.declaredType,
            optional: Boolean(f.optional)
          });
        });
      }
      Object.keys(obj).slice(0, 20).forEach((k) => {
        if (!fieldMap.has(k)) {
          fieldMap.set(k, {
            k,
            v: cloneDeepBounded(obj[k], 1),
            declaredType: inferRuntimeTsType(obj[k]),
            optional: false
          });
        }
      });
      const fields = [...fieldMap.values()];
      if (fields.length > 0 || isClass) {
        return snapshot("interface", obj, {
          interfaceName: ifaceName,
          isClass,
          isSchema: false,
          fields,
          entries: fields.map((f) => ({ k: f.k, v: f.v }))
        });
      }
    }
    return null;
  }
  function populateInterfaceSchemas(ds) {
    const { interfaces, varTypes } = appState.CURRENT_TS_META;
    if (!interfaces || !interfaces.size) return;
    interfaces.forEach((iface) => {
      if (iface.isClass && (!iface.fields || !iface.fields.length)) return;
      const prefix = iface.isClass ? "class " : "interface ";
      const slotKey = iface.name in ds ? prefix + iface.name : iface.name;
      let boundInstance = null;
      let boundVarName = null;
      Object.keys(ds).forEach((k) => {
        const item = ds[k];
        if (!boundInstance && item && item.kind === "interface" && !item.isSchema && item.interfaceName === iface.name) {
          boundInstance = item;
          boundVarName = k;
        }
      });
      if (!boundVarName && varTypes) {
        Object.keys(ds).forEach((k) => {
          if (!boundVarName && varTypes.get(k) === iface.name) {
            boundVarName = k;
          }
        });
      }
      const fields = iface.fields.map((f) => {
        const key = f.k || f.name || "";
        const instField = boundInstance && boundInstance.fields ? boundInstance.fields.find((x) => x.k === key) : null;
        return {
          k: key,
          declaredType: f.declaredType,
          optional: Boolean(f.optional),
          v: instField ? instField.v : void 0
        };
      });
      ds[slotKey] = {
        kind: "interface",
        interfaceName: iface.name,
        isClass: Boolean(iface.isClass),
        isSchema: true,
        instanceName: boundVarName,
        fields,
        entries: fields.map((f) => ({ k: f.k, v: f.v !== void 0 ? f.v : f.declaredType }))
      };
    });
  }
  function detectWindowRange(v) {
    if (!v) return null;
    const pairs = [["l", "r"], ["left", "right"], ["lo", "hi"], ["start", "end"]];
    for (const [lk, rk] of pairs) {
      const lv = v[lk];
      const rv = v[rk];
      if (typeof lv === "number" && typeof rv === "number" && lv >= 0 && rv >= lv) {
        return [lv, rv];
      }
    }
    return null;
  }
  var POINTER_VAR_NAMES = [
    "mid",
    "m",
    "i",
    "j",
    "k",
    "idx",
    "p",
    "q",
    "cur",
    "curr",
    "slow",
    "fast",
    "pivot",
    "l",
    "r",
    "left",
    "right",
    "lo",
    "hi",
    "low",
    "high",
    "start",
    "end"
  ];
  function build1DFocalSlice(total, getAt, focalCenters) {
    if (total <= 20) return null;
    const centers = [];
    const seenC = /* @__PURE__ */ new Set();
    (focalCenters || []).forEach((c) => {
      if (typeof c === "number" && Number.isInteger(c) && c >= 0 && c < total && !seenC.has(c)) {
        seenC.add(c);
        centers.push(c);
      }
    });
    const activeCenters = centers.slice(0, 4);
    const radius = activeCenters.length <= 1 ? 3 : activeCenters.length === 2 ? 2 : 1;
    const intervals = [
      [0, Math.min(total - 1, 2)],
      [Math.max(0, total - 3), total - 1]
    ];
    activeCenters.forEach((c) => {
      intervals.push([Math.max(0, c - radius), Math.min(total - 1, c + radius)]);
    });
    intervals.sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const iv of intervals) {
      const prev = merged[merged.length - 1];
      if (!prev) {
        merged.push([iv[0], iv[1]]);
      } else if (iv[0] <= prev[1] + 2) {
        prev[1] = Math.max(prev[1], iv[1]);
      } else {
        merged.push([iv[0], iv[1]]);
      }
    }
    const out = [];
    for (let s = 0; s < merged.length; s++) {
      const curIv = merged[s];
      if (!curIv) continue;
      const [start, end] = curIv;
      const prevIv = s > 0 ? merged[s - 1] : void 0;
      if (prevIv) {
        const prevEnd = prevIv[1];
        const gapCount = start - prevEnd - 1;
        if (gapCount > 0) {
          out.push({ gap: true, count: gapCount, from: prevEnd + 1, to: start - 1 });
        }
      }
      for (let idx = start; idx <= end; idx++) {
        out.push({ idx, val: getAt(idx) });
      }
    }
    return out;
  }
  function selectGridAxisIndices(total, focusIdx, maxCount = 8) {
    if (total <= maxCount) {
      return Array.from({ length: total }, (_, i) => i);
    }
    const set = /* @__PURE__ */ new Set([0, total - 1]);
    const center = typeof focusIdx === "number" && Number.isInteger(focusIdx) && focusIdx >= 0 && focusIdx < total ? focusIdx : 1;
    const innerQuota = Math.max(2, maxCount - 2);
    let start = Math.max(1, center - Math.floor(innerQuota / 2));
    let end = Math.min(total - 2, start + innerQuota - 1);
    start = Math.max(1, end - innerQuota + 1);
    for (let i = start; i <= end; i++) set.add(i);
    return [...set].sort((a, b) => a - b);
  }
  function enrichFromNoteTextAccess(ds, safeV, text, evalIdx) {
    const propRe = /\b([A-Za-z_$][\w$]*)\s*\.\s*([A-Za-z_$][\w$]*)\b/g;
    let pm;
    while (pm = propRe.exec(text)) {
      const rawObj = pm[1] || "", propName = pm[2];
      const objName = rawObj === "self" && !ds.self && ds.this ? "this" : rawObj;
      const objItem = ds[objName];
      if (objItem && (objItem.kind === "interface" || objItem.kind === "object")) {
        objItem.hot = propName;
        const ifaceName = objItem.interfaceName;
        const ifaceItem = ifaceName ? ds[ifaceName] : void 0;
        if (ifaceItem && ifaceItem.kind === "interface") {
          ifaceItem.hot = propName;
        }
      }
    }
    const g = text.match(/\b([A-Za-z_$][\w$]*)\s*\[\s*([^[\]]+?)\s*\]\s*\[\s*([^[\]]+?)\s*\]/);
    const gItem = g && g[1] ? ds[g[1]] : void 0;
    if (g && g[1] && gItem && gItem.kind === "grid") {
      const row = evalIdx(g[2]);
      const col = evalIdx(g[3]);
      if (typeof row === "number" && typeof col === "number") {
        gItem.mark = [row, col];
      }
      const deps = [];
      const re = /\b[A-Za-z_$][\w$]*\s*\[\s*([^[\]]+?)\s*\]\s*\[\s*([^[\]]+?)\s*\]/g;
      let m;
      while (m = re.exec(text)) {
        const r = evalIdx(m[1]);
        const c = evalIdx(m[2]);
        if (typeof r === "number" && typeof c === "number") {
          const curMark = gItem.mark;
          if (!(Array.isArray(curMark) && curMark[0] === r && curMark[1] === c)) {
            deps.push([r, c]);
          }
        }
      }
      gItem.deps = deps;
    }
    const subRe = /\b([A-Za-z_$][\w$]*)\s*\[\s*([^[\]]+?)\s*\](?!\s*\[)/g;
    let sm;
    while (sm = subRe.exec(text)) {
      const varName = sm[1] || "";
      const d = ds[varName];
      if (!d || d.kind === "grid") continue;
      let idx = evalIdx(sm[2]);
      if (typeof idx === "number") {
        const total = typeof d.total === "number" ? d.total : d.items ? d.items.length : 0;
        if (idx < 0 && total > 0) idx = total + idx;
        if (d.hot === void 0) {
          d.hot = idx;
        } else {
          if (!d.__extraFocal) defineHidden(d, "__extraFocal", []);
          if (d.__extraFocal) d.__extraFocal.push(idx);
        }
      }
    }
    const p = text.match(/\b([A-Za-z_$][\w$]*)\s*\.\s*(push|set|add|pop|shift|unshift|get|has)\s*\(\s*([^,)]*)/);
    const pItem = p && p[1] ? ds[p[1]] : void 0;
    if (p && p[1] && pItem) {
      const d = pItem;
      const method = p[2];
      const firstArg = p[3] ? p[3].trim() : "";
      if (method === "get" || method === "has" || method === "set" || method === "add") {
        const argVal = firstArg ? safeEvalExpr(firstArg, safeV) : void 0;
        if (d.kind === "map" && argVal !== void 0) {
          d.hot = argVal;
        } else if (d.kind === "set" && argVal !== void 0) {
          d.hot = argVal;
        }
      }
      if (method === "push" || method === "add" || method === "set" || method === "unshift") {
        if (d.kind === "stack" || d.kind === "array" || d.kind === "queue" || d.kind === "heap") {
          const total = typeof d.total === "number" ? d.total : d.items ? d.items.length : 0;
          if (total > 0) d.hot = method === "unshift" ? 0 : total - 1;
        } else if (d.kind === "map" && d.hot === void 0) {
          if (d.entries && d.entries.length) {
            const lastEntry = d.entries[d.entries.length - 1];
            if (lastEntry) d.hot = lastEntry.k;
          }
        } else if (d.kind === "set" && d.hot === void 0) {
          if (d.items && d.items.length) d.hot = d.items[d.items.length - 1];
        }
      }
    }
  }
  function enrichFromNote(ds, v, note) {
    if (!ds || typeof ds !== "object") return;
    const safeV = v || {};
    const text = String(note || "");
    const evalIdx = (expr) => {
      const t = String(expr || "").trim();
      if (!t) return void 0;
      if (/^\d+$/.test(t)) return +t;
      const directVal = safeV[t];
      if (t in safeV && typeof directVal === "number" && Number.isInteger(directVal)) return directVal;
      const m = t.match(/^([A-Za-z_$][\w$]*)\s*([+-])\s*(\d+)$/);
      if (m && m[1] && m[3] !== void 0) {
        const baseVal = safeV[m[1]];
        if (typeof baseVal === "number" && Number.isInteger(baseVal)) {
          return m[2] === "+" ? baseVal + +m[3] : baseVal - +m[3];
        }
      }
      const evaluated = safeEvalExpr(t, safeV);
      return typeof evaluated === "number" && Number.isInteger(evaluated) ? evaluated : void 0;
    };
    const win = detectWindowRange(safeV);
    if (win) {
      Object.keys(ds).forEach((k) => {
        const item = ds[k];
        if (item && (item.kind === "array" || item.kind === "string")) {
          item.win = win;
        }
      });
    }
    if (text) {
      enrichFromNoteTextAccess(ds, safeV, text, evalIdx);
    }
    Object.keys(ds).forEach((varName) => {
      const d = ds[varName];
      if (!d || typeof d !== "object") return;
      if (d.kind === "tree" && d.__nodeMap) {
        for (const pName of POINTER_VAR_NAMES) {
          const ref = safeV[pName];
          if (ref && typeof ref === "object" && d.__nodeMap.has(ref)) {
            const nodeIdx = d.__nodeMap.get(ref);
            if (d.hot === void 0) d.hot = nodeIdx;
            break;
          }
        }
      }
      if (d.kind === "list" && d.__rawNodes) {
        const nodePtrs = {};
        const focal = [];
        for (const pName of POINTER_VAR_NAMES) {
          const ref = safeV[pName];
          if (ref && typeof ref === "object") {
            const idx = d.__rawNodes.indexOf(ref);
            if (idx >= 0) {
              const ptrArr = nodePtrs[idx] || (nodePtrs[idx] = []);
              if (!ptrArr.includes(pName)) ptrArr.push(pName);
              if (d.hot === void 0) d.hot = idx;
              focal.push(idx);
            }
          }
        }
        if (Object.keys(nodePtrs).length) d.pointers = nodePtrs;
        const rawVals = d.__rawVals || [];
        const total = d.total || rawVals.length;
        if (total > 20) {
          if (typeof d.hot === "number") focal.unshift(d.hot);
          d.windowed = build1DFocalSlice(total, (idx) => cloneDeepBounded(rawVals[idx], 1), focal);
        }
      }
      if (d.kind === "array" || d.kind === "queue" || d.kind === "heap" || d.kind === "uf" || d.kind === "string" || d.kind === "list" && !d.__rawNodes) {
        const total = typeof d.total === "number" ? d.total : d.items ? d.items.length : 0;
        if (total > 0) {
          const ptrs = d.pointers || {};
          const focal = [];
          if (typeof d.hot === "number" && d.hot >= 0 && d.hot < total) focal.push(d.hot);
          if (Array.isArray(d.__extraFocal)) {
            d.__extraFocal.forEach((idx) => {
              if (typeof idx === "number" && idx >= 0 && idx < total) focal.push(idx);
            });
          }
          if (typeof d.mark === "number" && d.mark >= 0 && d.mark < total) focal.push(d.mark);
          if (Array.isArray(d.win)) {
            if (d.win[0] >= 0 && d.win[0] < total) focal.push(d.win[0]);
            if (d.win[1] >= 0 && d.win[1] < total) focal.push(d.win[1]);
          }
          for (const pName of POINTER_VAR_NAMES) {
            const val = safeV[pName];
            if (typeof val === "number" && Number.isInteger(val) && val >= 0 && val < total) {
              const pArr = ptrs[val] || (ptrs[val] = []);
              if (!pArr.includes(pName)) pArr.push(pName);
              focal.push(val);
            }
          }
          if (Object.keys(ptrs).length) d.pointers = ptrs;
          if (d.hot === void 0 && d.mark === void 0) {
            if (typeof safeV.mid === "number" && Number.isInteger(safeV.mid) && safeV.mid >= 0 && safeV.mid < total) {
              d.mark = safeV.mid;
            } else if (typeof safeV.m === "number" && Number.isInteger(safeV.m) && safeV.m >= 0 && safeV.m < total) {
              d.mark = safeV.m;
            }
          }
          if (total > 20) {
            const raw = d.__raw;
            const pyMeta = d.__pyMeta;
            const getAt = (idx) => {
              if (pyMeta && pyMeta.sparse && pyMeta.sparse.has(idx)) {
                return cloneDeepBounded(pyMeta.sparse.get(idx), 1);
              }
              if (typeof raw === "string") return raw[idx] ?? "";
              if (Array.isArray(raw) && idx < raw.length) return cloneDeepBounded(raw[idx], 1);
              if (d.items && idx < d.items.length) return d.items[idx];
              return "\u2026";
            };
            d.windowed = build1DFocalSlice(total, getAt, focal);
          }
        }
      }
      if (d.kind === "map" && d.hot !== void 0 && isMapLike(d.__raw)) {
        const rawMap = d.__raw;
        const entries = d.entries || (d.entries = []);
        const exists = entries.some((e) => e.k === d.hot);
        if (!exists && rawMap.has(d.hot)) {
          entries.push({ k: cloneDeepBounded(d.hot, 1), v: cloneDeepBounded(rawMap.get(d.hot), 1) });
        }
      }
      if (d.kind === "set" && d.hot !== void 0 && isSetLike(d.__raw)) {
        const rawSet = d.__raw;
        const items = d.items || (d.items = []);
        const exists = items.some((x) => x === d.hot);
        if (!exists && rawSet.has(d.hot)) {
          items.push(cloneDeepBounded(d.hot, 1));
        }
      }
      if (d.kind === "grid") {
        const totalRows = typeof d.totalRows === "number" ? d.totalRows : d.cells ? d.cells.length : 0;
        const totalCols = typeof d.totalCols === "number" ? d.totalCols : d.cells && d.cells[0] ? d.cells[0].length : 0;
        if (totalRows > 10 || totalCols > 10) {
          const pyMeta = d.__pyMeta;
          if (pyMeta && Array.isArray(pyMeta.rowIndices) && Array.isArray(pyMeta.colIndices) && Array.isArray(pyMeta.viewCells)) {
            d.rowIndices = pyMeta.rowIndices;
            d.colIndices = pyMeta.colIndices;
            d.viewCells = pyMeta.viewCells;
          } else {
            let focusR = Array.isArray(d.mark) ? d.mark[0] : d.deps && d.deps[0] ? d.deps[0][0] : void 0;
            let focusC = Array.isArray(d.mark) ? d.mark[1] : d.deps && d.deps[0] ? d.deps[0][1] : void 0;
            if (focusR === void 0 || focusC === void 0) {
              const coordPairs = [["i", "j"], ["r", "c"], ["row", "col"], ["x", "y"]];
              for (const [rk, ck] of coordPairs) {
                const rv = safeV[rk];
                const cv = safeV[ck];
                if (typeof rv === "number" && typeof cv === "number") {
                  focusR = rv;
                  focusC = cv;
                  break;
                }
              }
            }
            const rowIndices = selectGridAxisIndices(totalRows, focusR, 8);
            const colIndices = selectGridAxisIndices(totalCols, focusC, 8);
            const rawGrid = Array.isArray(d.__raw) ? d.__raw : d.cells;
            d.rowIndices = rowIndices;
            d.colIndices = colIndices;
            d.viewCells = rowIndices.map((r) => {
              const rowCandidate = rawGrid ? rawGrid[r] : void 0;
              const rowArr = Array.isArray(rowCandidate) ? rowCandidate : [];
              return colIndices.map((c) => cloneDeepBounded(rowArr[c], 2));
            });
          }
        }
      }
      delete d.__raw;
      delete d.__rawNodes;
      delete d.__rawVals;
      delete d.__nodeMap;
      delete d.__pyMeta;
      delete d.__extraFocal;
    });
  }
  function safeEvalExpr(expr, v) {
    if (!expr || !v) return void 0;
    const clean = stripTypes(expr).trim();
    if (!clean) return void 0;
    if (/\.\s*(push|pop|shift|unshift|splice|set|add|delete|clear|fill|sort|reverse)\s*\(/.test(clean)) {
      return void 0;
    }
    if (new RegExp("(?:\\+\\+|--|(?<![=!<>])=(?!=))").test(clean)) return void 0;
    try {
      const keys = Object.keys(v).filter((k) => /^[A-Za-z_$][\w$]*$/.test(k) && !RESERVED_WORDS.has(k));
      const vals = keys.map((k) => v[k]);
      const fn = new Function(...keys, "return (" + clean + ");");
      const thisCtx = v && Object.prototype.hasOwnProperty.call(v, "this") ? v.this : void 0;
      return fn.call(thisCtx, ...vals);
    } catch {
      return void 0;
    }
  }
  function splitLogicalClauses(condExpr) {
    const clauses = [];
    let depth = 0, start = 0;
    for (let i = 0; i < condExpr.length; i++) {
      const ch = condExpr[i];
      if (ch === '"' || ch === "'" || ch === "`") {
        i = skipString(condExpr, i) - 1;
        continue;
      }
      if (ch === "(" || ch === "[" || ch === "{") depth++;
      else if (ch === ")" || ch === "]" || ch === "}") depth--;
      else if (depth === 0 && (ch === "&" && condExpr[i + 1] === "&" || ch === "|" && condExpr[i + 1] === "|")) {
        clauses.push({ expr: condExpr.slice(start, i).trim(), opAfter: ch + ch });
        i++;
        start = i + 1;
      }
    }
    clauses.push({ expr: condExpr.slice(start).trim(), opAfter: null });
    return clauses.filter((c) => c.expr);
  }
  function deriveAnimAndNote(rawLine, v, nextV) {
    const clean = stripTypes(rawLine || "").trim().replace(/;$/, "");
    if (!clean) return { anim: null, note: rawLine };
    let condExpr = null;
    const condMatch = clean.match(/^(?:}\s*)?(?:if|while|else\s+if)\s*\(([\s\S]+)\)\s*\{?$/);
    if (condMatch && condMatch[1]) {
      condExpr = condMatch[1].trim();
    } else {
      const forMatch = clean.match(/^for\s*\(([\s\S]+)\)\s*\{?$/);
      if (forMatch && forMatch[1] !== void 0) {
        const semiParts = splitTopLevelSemicolons(forMatch[1]);
        if (semiParts.length === 3 && semiParts[1]?.trim()) {
          condExpr = semiParts[1].trim();
        }
      }
    }
    if (condExpr !== null) {
      const clauses = splitLogicalClauses(condExpr);
      let activeClause = clauses[0] ? clauses[0].expr : condExpr;
      let overallResult = safeEvalExpr(condExpr, v);
      for (let i = 0; i < clauses.length; i++) {
        const c = clauses[i];
        if (!c) continue;
        activeClause = c.expr;
        const cVal = safeEvalExpr(c.expr, v);
        if (typeof cVal === "boolean") {
          if (c.opAfter === "&&" && !cVal) {
            overallResult = false;
            break;
          }
          if (c.opAfter === "||" && cVal) {
            overallResult = true;
            break;
          }
          if (!c.opAfter) overallResult = cVal;
        }
      }
      const cmp = activeClause.match(/^(.+?)\s*(===|!==|<=|>=|==|!=|<|>)\s*(.+)$/);
      if (cmp && cmp[1] && cmp[2] && cmp[3]) {
        const lhs = cmp[1].trim(), op = cmp[2], rhs = cmp[3].trim();
        const lhsVal = safeEvalExpr(lhs, v);
        const rhsVal = safeEvalExpr(rhs, v);
        const resVal = typeof overallResult === "boolean" ? overallResult : safeEvalExpr(activeClause, v);
        if (typeof resVal === "boolean") {
          const anim = {
            type: "compare",
            lhs,
            rhs,
            op,
            lhsVal: formatShortVal(lhsVal),
            rhsVal: formatShortVal(rhsVal),
            result: resVal
          };
          const note = `${rawLine.trim()}  \u2192  ${anim.lhsVal} ${op} ${anim.rhsVal} (${resVal})`;
          return { anim, note };
        }
      }
      if (typeof overallResult === "boolean") {
        const anim = {
          type: "compare",
          lhs: activeClause,
          rhs: "",
          op: "?",
          lhsVal: formatShortVal(overallResult),
          rhsVal: "",
          result: overallResult
        };
        return { anim, note: `${rawLine.trim()}  \u2192  ${overallResult}` };
      }
    }
    const ckptCall = clean.match(/^(?:checkpoint|断点)\s*\(([\s\S]*)\)$/);
    if (ckptCall && ckptCall[1] !== void 0) {
      const fnName = clean.startsWith("\u65AD\u70B9") ? "\u65AD\u70B9" : "checkpoint";
      const args = splitTopLevel(ckptCall[1]).map((s) => s.trim()).filter(Boolean);
      const ckptVals = nextV && Array.isArray(nextV.__ckptVals) ? nextV.__ckptVals.map(String) : null;
      const argVals = ckptVals && ckptVals.length === args.length ? ckptVals : args.map((a) => formatShortVal(safeEvalExpr(a, v)));
      const anim = { type: "checkpoint", fn: fnName, args, argVals };
      const detail = args.length ? args.map((a, idx) => argVals[idx] !== void 0 && argVals[idx] !== a ? `${a}=${argVals[idx]}` : a).join(", ") : "\u5DF2\u547D\u4E2D\u65AD\u70B9";
      return { anim, note: `\u25C9 ${fnName}(${detail})`, isCheckpoint: true };
    }
    const callOnly = clean.match(/^([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*\((.*)\)$/);
    if (callOnly && callOnly[1] && callOnly[2] !== void 0) {
      const fnName = callOnly[1];
      const args = splitTopLevel(callOnly[2]).map((s) => s.trim()).filter(Boolean);
      const argVals = args.map((a) => formatShortVal(safeEvalExpr(a, v)));
      const anim = { type: "call", fn: fnName, args, argVals, result: null, to: null };
      return { anim, note: `${fnName}(${argVals.join(", ")})` };
    }
    const compoundAssign = clean.match(/^([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\s*\[[^\]]+\])*)\s*(\+=|-=|\*=|\/=)\s*(.+)$/);
    if (compoundAssign && compoundAssign[1] && compoundAssign[2] && compoundAssign[3]) {
      const to = compoundAssign[1].trim();
      const op = compoundAssign[2][0];
      const rhs = compoundAssign[3].trim();
      const from = `${to} ${op} ${rhs}`;
      let val = safeEvalExpr(from, v);
      if (val === void 0 && nextV) val = safeEvalExpr(to, nextV);
      if (val !== void 0) {
        const valStr = formatShortVal(val);
        return { anim: { type: "assign", to, from: rhs, val: valStr }, note: `${to} \u2190 ${valStr}   (${rawLine.trim()})` };
      }
    }
    const assignMatch = clean.match(/^(?:(?:const|let|var)\s+)?([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\s*\[[^\]]+\])*)\s*=\s*(?!=)(.+)$/);
    if (assignMatch && assignMatch[1] && assignMatch[2]) {
      const to = assignMatch[1].trim();
      const from = assignMatch[2].trim();
      const isSingleDecl = splitTopLevel(clean.replace(/^(?:const|let|var)\s+/, "")).length === 1;
      if (isSingleDecl || !from.includes(",") || /^[\w$.]+\s*\([^)]*\)$/.test(from)) {
        let val = safeEvalExpr(from, v);
        if (val === void 0 && nextV) {
          val = safeEvalExpr(to, nextV);
        }
        const valStr = val !== void 0 ? formatShortVal(val) : null;
        const rhsCall = from.match(/^([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*\((.*)\)$/);
        if (rhsCall && rhsCall[1] && rhsCall[2] !== void 0 && valStr !== null) {
          const fnName = rhsCall[1];
          const args = splitTopLevel(rhsCall[2]).map((s) => s.trim()).filter(Boolean);
          const argVals = args.map((a) => formatShortVal(safeEvalExpr(a, v)));
          const anim = { type: "call", fn: fnName, args, argVals, result: valStr, to };
          return { anim, note: `${to} = ${fnName}(${argVals.join(", ")})  \u2192  ${valStr}` };
        }
        if (valStr !== null) {
          const anim = { type: "assign", to, from, val: valStr };
          return { anim, note: `${to} \u2190 ${valStr}   (${rawLine.trim()})` };
        }
      }
    }
    const retMatch = clean.match(/^return\s+(.+)$/);
    if (retMatch && retMatch[1]) {
      const expr = retMatch[1].trim();
      const val = safeEvalExpr(expr, v);
      if (val !== void 0) {
        const valStr = formatShortVal(val);
        const anim = { type: "assign", to: "return", from: expr, val: valStr };
        return { anim, note: `return ${expr}  \u2192  ${valStr}` };
      }
    }
    return { anim: null, note: rawLine.trim() };
  }
  function pressure(d) {
    if (!d) return 0;
    let n = 0;
    if (typeof d.total === "number") n = d.total;
    else if (d.items) n = d.items.length;
    else if (d.fields) n = d.fields.length;
    else if (d.entries) n = d.entries.length;
    else if (d.nodes) n = d.nodes.length;
    else if (d.cells) n = (d.totalRows || d.cells.length) * (d.totalCols || (d.cells[0] ? d.cells[0].length : 1));
    switch (d.kind) {
      case "eventloop":
        return 1;
      case "grid":
        return Math.min(1, Math.max(0.5, n / 12));
      case "array":
      case "queue":
      case "uf":
        return Math.min(1, n / 11);
      case "heap":
        return Math.min(1, Math.max(0.46, n / 11));
      case "list":
        return Math.min(1, n / 7);
      case "map":
        return Math.min(1, n / 7);
      case "interface":
      case "object":
        return Math.min(1, n / 6);
      case "set":
        return Math.min(1, n / 9);
      case "string":
        return Math.min(1, n / 18);
      case "tree":
        return n >= 6 ? 0.38 : 0.28;
      case "graph":
        return n >= 5 ? 0.36 : 0.26;
      case "stack":
        return Math.min(0.35, n / 16);
      default:
        return Math.min(1, n / 10);
    }
  }
  var SPAN_UP = 0.45;
  var SPAN_DOWN = 0.28;
  function decideSpan(id, p) {
    const curSpan = appState.layoutSpan[id] || 1;
    if (curSpan < 2 && p >= SPAN_UP) appState.layoutSpan[id] = 2;
    else if (curSpan > 1 && p <= SPAN_DOWN) appState.layoutSpan[id] = 1;
    return appState.layoutSpan[id] || 1;
  }
  function allocateSlotSpans(vars, ds) {
    const meta = vars.map((s, idx) => {
      const d = ds[s.id];
      const kind = d && d.kind || s.kind || "array";
      const p = pressure(d);
      const span = decideSpan(s.id, p);
      return { s, d, kind, p, span, idx };
    });
    const oneColItems = meta.filter((m) => m.span === 1);
    if (oneColItems.length % 2 === 1) {
      let promote = oneColItems[0];
      if (promote) {
        for (let i = 1; i < oneColItems.length; i++) {
          const candidate = oneColItems[i];
          if (candidate && candidate.p >= promote.p) {
            promote = candidate;
          }
        }
        promote.span = 2;
      }
    }
    return meta;
  }
  var _DISCOVER_CACHE = {
    traceRef: null,
    scannedSteps: 0,
    map: /* @__PURE__ */ new Map(),
    list: []
  };
  function discoverVars() {
    const steps = appState.TRACE && appState.TRACE.steps || [];
    if (_DISCOVER_CACHE.traceRef !== appState.TRACE || steps.length < _DISCOVER_CACHE.scannedSteps) {
      _DISCOVER_CACHE = { traceRef: appState.TRACE, scannedSteps: 0, map: /* @__PURE__ */ new Map(), list: [] };
    }
    if (_DISCOVER_CACHE.scannedSteps < steps.length) {
      let changed = false;
      for (let i = _DISCOVER_CACHE.scannedSteps; i < steps.length; i++) {
        const st = steps[i];
        const ds = st && st.ds || {};
        const keys = Object.keys(ds);
        for (let k = 0; k < keys.length; k++) {
          const name = keys[k];
          const item = name ? ds[name] : void 0;
          if (name && item && !_DISCOVER_CACHE.map.has(name)) {
            _DISCOVER_CACHE.map.set(name, { id: name, name, kind: item.kind || name });
            changed = true;
          }
        }
      }
      _DISCOVER_CACHE.scannedSteps = steps.length;
      if (changed) _DISCOVER_CACHE.list = [..._DISCOVER_CACHE.map.values()];
    }
    return _DISCOVER_CACHE.list;
  }
  var VIZ = {};
  function getActiveFrame(st) {
    if (!st) return null;
    const stack = Array.isArray(st.callStack) && st.callStack.length ? st.callStack : null;
    if (!stack) {
      return {
        idx: 0,
        total: 1,
        isTop: true,
        fn: "global",
        label: "global",
        line: st.line,
        v: st.v || {},
        ds: st.ds || {}
      };
    }
    const topIdx = stack.length - 1;
    const idx = appState.SELECTED_FRAME_IDX !== null && appState.SELECTED_FRAME_IDX >= 0 && appState.SELECTED_FRAME_IDX < stack.length ? appState.SELECTED_FRAME_IDX : topIdx;
    const frame = stack[idx] || stack[topIdx];
    return {
      idx,
      total: stack.length,
      isTop: idx === topIdx,
      fn: frame.fn || "global",
      label: frame.label || "global",
      line: frame.line || st.line,
      v: frame.v || (idx === topIdx ? st.v : {}) || {},
      ds: (frame.ds && Object.keys(frame.ds).length ? frame.ds : st.ds) || {}
    };
  }

  // src/runtime/runner.ts
  function reportTypeErrors(diags) {
    appState.TYPE_ERROR_LINES = new Set(diags.map((d) => d.line));
    uiHooks.updateEditorChrome();
    say(`\u2717 TypeScript \u4E25\u683C\u7C7B\u578B\u68C0\u67E5\u672A\u901A\u8FC7 (\u5171 ${diags.length} \u5904\u9519\u8BEF)\uFF1A`, "err");
    diags.forEach((d) => {
      say(`  \u2022 ${d.code} [\u7B2C ${d.line} \u884C]: ${d.message}`, "err", d.line);
    });
    if (diags[0]?.line) uiHooks.revealErrorLine(diags[0].line);
  }
  function isSnapFn(val) {
    return typeof val === "function";
  }
  function evalSnapOrObject(snap) {
    if (isSnapFn(snap)) return snap() || {};
    if (isRecord(snap)) return snap;
    return {};
  }
  function evalCall(js, call, opts) {
    const o = opts || {};
    const expr = stripTypes(call || "undefined");
    const budgetMs = o.budgetMs || 0;
    const entryLine = o.entryLine || 0;
    const stub = o.instrumented ? "" : "var checkpoint = function(){}, \u65AD\u70B9 = checkpoint;\n";
    const t0 = Date.now();
    let ticks = 0;
    let lastLine = 0;
    let expired = false;
    const timeoutError = () => Object.assign(new Error("RUN_TIMEOUT"), {
      __timeout: true,
      __line: lastLine
    });
    const __t = function(line) {
      if (line) lastLine = line;
      if (!budgetMs) return;
      if (expired) throw timeoutError();
      if ((++ticks & 31) === 31 && Date.now() - t0 > budgetMs) {
        expired = true;
        throw timeoutError();
      }
    };
    const evLoop = createVirtualEventLoop(__t, () => lastLine);
    __t.__env = evLoop.env;
    __t.__async = evLoop.runAsyncCoroutine;
    __t.__await = (val, fid, line, exprText) => ({ __isAwait: true, value: val, fid, line, expr: exprText });
    __t.__drain = evLoop.drainEventLoop;
    __t.__initGlobal = function(snapFn) {
      evLoop.loop.globalSnapFn = snapFn;
    };
    __t.__ckpt = function() {
    };
    const body = stub + js + "\n;return (function(){ try { var __v = (" + expr + '); if (__t && __t.__drain) __v = __t.__drain(__v); return { ok:true, value:__v }; } catch (e) { return { ok:false, error: e && e.message ? e.message : String(e), stack: e && e.stack ? String(e.stack) : "", line: (e && e.__line) || 0, timeout: Boolean(e && e.__timeout) }; } })();';
    const logs = [];
    const f = new Function("__t", "console", body);
    let r;
    const formatConsoleArg = (x) => {
      if (x instanceof Error) return x.message || String(x);
      try {
        return typeof x === "object" ? JSON.stringify(x) : String(x);
      } catch (_) {
        return String(x);
      }
    };
    const pushLogLine = (...a) => logs.push(a.map(formatConsoleArg).join(" "));
    try {
      r = f(__t, {
        log: pushLogLine,
        info: pushLogLine,
        warn: pushLogLine,
        error: pushLogLine
      });
    } catch (e) {
      const errObj = isRecord(e) ? e : null;
      r = {
        ok: false,
        error: errObj && typeof errObj.message === "string" && errObj.message ? errObj.message : String(e),
        stack: errObj && errObj.stack ? String(errObj.stack) : "",
        line: (errObj && typeof errObj.__line === "number" ? errObj.__line : 0) || lastLine || entryLine || 0,
        timeout: Boolean(errObj && errObj.__timeout)
      };
    }
    if (r && r.ok && !r.line) r.line = lastLine || entryLine || 0;
    if (r && !r.ok) r.line = r.line || lastLine || entryLine || 0;
    return { ...r, logs, elapsedMs: Date.now() - t0 };
  }
  function runOnce(budgetMs, sourceCode) {
    if (appState.LANG === "python") return PY_ENGINE.runOnly(budgetMs);
    const budget = typeof budgetMs === "number" && budgetMs > 0 ? budgetMs : RUN_TIMEOUT_MS;
    const src = typeof sourceCode === "string" ? sourceCode : uiHooks.getEditorSource();
    const unsupported = detectUnsupportedSyntax2(src);
    if (unsupported.length && unsupported[0]) {
      unsupported.forEach((x) => say("\u2717 \u7B2C " + x.line + " \u884C\uFF1A\u6682\u4E0D\u652F\u6301 " + x.feature + " \u2014\u2014 " + x.hint, "err", x.line));
      uiHooks.revealErrorLine(unsupported[0].line);
      return;
    }
    const diags = typecheckTS(src, appState.STRICT_TS);
    if (diags.length > 0) {
      reportTypeErrors(diags);
      return;
    }
    if (appState.TYPE_ERROR_LINES.size || appState.RUNTIME_ERROR_LINES.size) {
      appState.TYPE_ERROR_LINES.clear();
      appState.RUNTIME_ERROR_LINES.clear();
      uiHooks.updateEditorChrome();
    }
    const enums = transpileEnums(src);
    if (enums.error) {
      say("\u2717 \u7B2C " + enums.error.line + " \u884C\uFF1A" + enums.error.message, "err", enums.error.line);
      uiHooks.revealErrorLine(enums.error.line);
      return;
    }
    const js = stripTypes(enums.code);
    const originalLines = src.replace(/\r/g, "").split("\n");
    const entry = resolveEntry(src, js);
    const call = stripTypes(entry.expr || "undefined");
    appState.ENTRY_CALL_LINE = entry.line || 0;
    const jsBody = entry.index >= 0 ? blankJsLine(js, entry.index) : js;
    let code = jsBody;
    let instrumented = false;
    try {
      const candidate = instrument(jsBody, originalLines, collectNames(jsBody));
      new Function("__t", "console", candidate);
      code = candidate;
      instrumented = true;
    } catch (_) {
      code = jsBody;
      instrumented = false;
    }
    if (!instrumented) say("\u26A0 \u672C\u6B21\u8FD0\u884C\u672A\u80FD\u542F\u7528\u6B7B\u5FAA\u73AF\u7194\u65AD\uFF08\u63D2\u6869/\u7F16\u8BD1\u56DE\u9000\uFF09\uFF0C\u8BF7\u7559\u610F\u53EF\u80FD\u7684\u6B7B\u5FAA\u73AF", "dim");
    try {
      const r = evalCall(code, call, { budgetMs: budget, instrumented, entryLine: entry.line });
      r.logs.forEach((l) => say("  log: " + l, "dim"));
      if (!r.ok && r.timeout) {
        const line = r.line || 0;
        const snippet = line ? (originalLines[line - 1] || "").trim().slice(0, 90) : "";
        if (line) {
          appState.RUNTIME_ERROR_LINES.add(line);
          uiHooks.updateEditorChrome();
          uiHooks.revealErrorLine(line);
        }
        say(
          "\u2717 \u8FD0\u884C\u8D85\u8FC7 " + budget / 1e3 + "s \u4ECD\u672A\u7ED3\u675F\uFF0C\u5DF2\u5F3A\u5236\u7EC8\u6B62\uFF08\u7591\u4F3C\u6B7B\u5FAA\u73AF / \u8BA1\u7B97\u91CF\u8FC7\u5927\uFF09" + (line ? " \xB7 \u4F4D\u7F6E\uFF1A\u7B2C " + line + " \u884C" + (snippet ? " \xB7 " + snippet : "") : " \xB7 \u672A\u80FD\u5B9A\u4F4D\u5230\u5177\u4F53\u884C"),
          "err",
          line || void 0
        );
        return;
      }
      if (!r.ok) {
        const line = r.line || sourceLineFromStack(r.stack, originalLines.length);
        if (line) {
          appState.RUNTIME_ERROR_LINES.add(line);
          uiHooks.updateEditorChrome();
          say("\u2717 \u7B2C " + line + " \u884C\u8FD0\u884C\u65F6\u62A5\u9519: " + r.error, "err", line);
          uiHooks.revealErrorLine(line);
        } else {
          say("\u2717 \u8C03\u7528\u5931\u8D25: " + r.error, "err");
        }
        return;
      }
      const elapsed = " (" + r.elapsedMs + "ms)";
      say("\u2713 \u8FD0\u884C\u5B8C\u6210  \u2192  " + safeJSONStringify(r.value) + elapsed, "ok");
    } catch (e) {
      say("\u2717 " + (e instanceof Error && e.message ? e.message : e), "err");
    }
  }
  function buildFrameSnapshotFromClosure(frame, fallbackLine, noteForEnrich) {
    const raw = (typeof frame.snapFn === "function" ? frame.snapFn() : {}) || {};
    if (frame.self && typeof frame.self === "object") {
      try {
        const selfCopy = {};
        for (const k in frame.self) {
          try {
            selfCopy[k] = frame.self[k];
          } catch (e) {
          }
        }
        raw["this"] = selfCopy;
      } catch (e) {
      }
    }
    const v = {};
    Object.keys(raw).forEach((k) => {
      const val = raw[k];
      v[k] = val !== null && typeof val === "object" ? cloneDeepBounded(val, 2) : val;
    });
    const ds = {};
    Object.keys(raw).forEach((name) => {
      const d = classifyValue(name, raw[name]);
      if (d) ds[name] = d;
    });
    populateInterfaceSchemas(ds);
    enrichFromNote(ds, raw, noteForEnrich || "");
    const win = detectWindowRange(raw);
    const snapFrame = {
      id: frame.id,
      fn: frame.fn,
      label: frame.label,
      line: frame.lastLine || frame.line || fallbackLine || 1,
      v,
      ds
    };
    if (win) {
      snapFrame.l = win[0];
      snapFrame.r = win[1];
    }
    return snapFrame;
  }
  function computeAndAppendNextStep(opts = {}) {
    if (!appState.DEBUG_SESSION.active || appState.DEBUG_SESSION.finished) return false;
    const targetIdx = appState.TRACE.steps.length;
    if (targetIdx >= MAX_STEPS) {
      appState.DEBUG_SESSION.finished = true;
      appState.DEBUG_SESSION.crashed = true;
      appState.DEBUG_SESSION.error = "\u5DF2\u8FBE\u5355\u6B21\u8C03\u8BD5\u4E0A\u9650\uFF0C\u81EA\u52A8\u7194\u65AD\u4EE5\u9632\u6B7B\u5FAA\u73AF";
      say("\u2717 " + appState.DEBUG_SESSION.error, "err");
      return false;
    }
    const originalLines = appState.DEBUG_SESSION.originalLines;
    const callIdx = originalLines.findIndex((l) => /\/\/\s*调用[:：]/.test(l));
    const globalCallLine = callIdx >= 0 ? callIdx + 1 : appState.ENTRY_CALL_LINE || 1;
    let count = 0;
    let frameSeq = 0;
    let curLineTracker = globalCallLine;
    let activeRecording = false;
    let unwindingPause = false;
    let pendingStep = null;
    let pendingStepSnapFn = null;
    const phaseBox = {
      current: null
    };
    let nextVRaw = null;
    const stepLogs = [];
    const t0 = Date.now();
    const liveCallStack = [
      {
        id: 0,
        fn: "global",
        label: "global",
        line: globalCallLine,
        lastLine: globalCallLine,
        snapFn: null
      }
    ];
    const suspendedFrames = /* @__PURE__ */ new Map();
    const evLoop = createVirtualEventLoop(
      (line, note, snap, self) => __t(line, note, snap, self),
      () => curLineTracker,
      (fid) => {
        if (unwindingPause) return;
        for (let k = liveCallStack.length - 1; k >= 1; k--) {
          if (liveCallStack[k]?.id === fid) {
            const [removed] = liveCallStack.splice(k, 1);
            if (removed) suspendedFrames.set(fid, removed);
            break;
          }
        }
      },
      (fid) => {
        if (unwindingPause) return;
        const frame = suspendedFrames.get(fid);
        if (frame) {
          suspendedFrames.delete(fid);
          liveCallStack.push(frame);
        }
      }
    );
    if (appState.DEBUG_SESSION.hasAsync) {
      evLoop.loop.used = true;
    }
    const __t = (line, note, snap, self) => {
      const stepLine = line || curLineTracker || 1;
      if (line) curLineTracker = line;
      const idx = count++;
      if ((idx & 63) === 63 && Date.now() - t0 > MAX_EXEC_MS) {
        throw new Error("\u6267\u884C\u8D85\u65F6 (>" + MAX_EXEC_MS + "ms)\uFF0C\u81EA\u52A8\u7194\u65AD\u4EE5\u9632\u9875\u9762\u5361\u6B7B");
      }
      const topFrame = liveCallStack[liveCallStack.length - 1];
      if (topFrame) {
        topFrame.lastLine = stepLine;
        if (isSnapFn(snap)) topFrame.snapFn = snap;
        if (isRecord(self)) topFrame.self = self;
      }
      if (idx < targetIdx) {
        return;
      }
      if (idx === targetIdx) {
        const effectiveSnap = (isSnapFn(snap) ? snap : null) || topFrame && topFrame.snapFn || evLoop.loop.globalSnapFn;
        const vRaw = (typeof effectiveSnap === "function" ? effectiveSnap() : evalSnapOrObject(snap)) || {};
        if (isRecord(self)) {
          try {
            const selfCopy = {};
            for (const k in self) {
              try {
                selfCopy[k] = self[k];
              } catch (e) {
              }
            }
            vRaw["this"] = selfCopy;
          } catch (e) {
          }
        }
        const v = {};
        Object.keys(vRaw).forEach((k) => {
          const val = vRaw[k];
          v[k] = val !== null && typeof val === "object" ? cloneDeepBounded(val, 2) : val;
        });
        const ds = {};
        Object.keys(vRaw).forEach((name) => {
          const d = classifyValue(name, vRaw[name]);
          if (d) ds[name] = d;
        });
        enrichFromNote(ds, vRaw, note || "");
        const win = detectWindowRange(vRaw);
        const capturedStack = liveCallStack.map((fr, fIdx) => {
          const isTop = fIdx === liveCallStack.length - 1;
          const fNote = isTop ? note || "" : originalLines[(fr.lastLine || fr.line || 1) - 1] || "";
          return buildFrameSnapshotFromClosure(fr, isTop ? stepLine : fr.line || 1, fNote);
        });
        pendingStepSnapFn = effectiveSnap;
        phaseBox.current = {
          phase: evLoop.loop.phase,
          activeTaskLabel: evLoop.loop.activeTaskLabel,
          virtualTime: evLoop.loop.virtualTime
        };
        const stepToCommit = {
          line: stepLine,
          note: note || "",
          v,
          vRaw,
          ds,
          callStack: capturedStack,
          isCheckpoint: false,
          checkpointVals: null,
          error: null
        };
        if (win) {
          stepToCommit.l = win[0];
          stepToCommit.r = win[1];
        }
        pendingStep = stepToCommit;
        activeRecording = true;
        return;
      }
      if (idx === targetIdx + 1) {
        activeRecording = false;
        unwindingPause = true;
        const sameScopeRaw = typeof pendingStepSnapFn === "function" ? pendingStepSnapFn() : null;
        const fallbackRaw = evalSnapOrObject(snap);
        nextVRaw = sameScopeRaw || fallbackRaw || {};
        throw PAUSE_SIGNAL;
      }
    };
    __t.__env = evLoop.env;
    __t.__async = evLoop.runAsyncCoroutine;
    __t.__await = (val, fid, line, exprText) => ({ __isAwait: true, value: val, fid, line, expr: exprText });
    __t.__drain = evLoop.drainEventLoop;
    __t.__initGlobal = (globalSnapFn) => {
      evLoop.loop.globalSnapFn = globalSnapFn;
      if (liveCallStack[0]) {
        liveCallStack[0].snapFn = globalSnapFn;
      }
    };
    __t.__enter = (fnName, paramNames, paramVals, defLine, snapFn) => {
      if (unwindingPause) return 0;
      const fid = ++frameSeq;
      const label = formatCallFrameLabel(fnName, paramNames, paramVals);
      liveCallStack.push({
        id: fid,
        fn: fnName,
        label,
        line: defLine || 1,
        lastLine: defLine || 1,
        snapFn
      });
      return fid;
    };
    __t.__leave = (fid) => {
      if (unwindingPause) return;
      suspendedFrames.delete(fid);
      for (let k = liveCallStack.length - 1; k >= 1; k--) {
        if (liveCallStack[k]?.id === fid) {
          liveCallStack.splice(k, 1);
          break;
        }
      }
    };
    __t.__ckpt = (args) => {
      if (activeRecording && pendingStep) {
        pendingStep.isCheckpoint = true;
        pendingStep.checkpointVals = (args || []).map((a) => formatShortVal(a));
      }
    };
    __t.__fin = (snap) => {
      if (activeRecording) {
        activeRecording = false;
        const sameScopeRaw = typeof pendingStepSnapFn === "function" ? pendingStepSnapFn() : null;
        const fallbackRaw = evalSnapOrObject(snap);
        nextVRaw = sameScopeRaw || fallbackRaw || {};
      }
    };
    const formatStepConsoleArg = (x) => {
      if (x instanceof Error) return x.message || String(x);
      try {
        return typeof x === "object" ? JSON.stringify(x) : String(x);
      } catch (_) {
        return String(x);
      }
    };
    const pushStepConsole = (...a) => {
      if (!activeRecording) return;
      stepLogs.push(a.map(formatStepConsoleArg).join(" "));
    };
    const customConsole = {
      log: pushStepConsole,
      info: pushStepConsole,
      warn: pushStepConsole,
      error: pushStepConsole
    };
    let paused = false;
    let runtimeErr = null;
    let retVal = void 0;
    try {
      if (appState.DEBUG_SESSION.compiledFn) {
        retVal = appState.DEBUG_SESSION.compiledFn(__t, customConsole);
      }
    } catch (e) {
      if (e === PAUSE_SIGNAL) {
        paused = true;
      } else {
        runtimeErr = e;
      }
    }
    stepLogs.forEach((l) => say("  log: " + l, "dim"));
    if (!pendingStep) {
      if (runtimeErr) {
        const errMsg = runtimeErr instanceof Error && runtimeErr.message ? runtimeErr.message : runtimeErr && typeof runtimeErr === "object" && "message" in runtimeErr && typeof runtimeErr.message === "string" ? runtimeErr.message : String(runtimeErr);
        const callLine = globalCallLine;
        const errStep = {
          line: callLine,
          note: "\u2717 \u8FD0\u884C\u65F6\u9519\u8BEF: " + errMsg,
          v: {},
          ds: {},
          callStack: [{ id: 0, fn: "global", label: "global", line: callLine, v: {}, ds: {} }],
          anim: { type: "error", message: errMsg },
          isCheckpoint: false,
          error: errMsg
        };
        populateInterfaceSchemas(errStep.ds);
        appState.TRACE.steps.push(errStep);
        appState.RUNTIME_ERROR_LINES.add(callLine);
        appState.DEBUG_SESSION.finished = true;
        appState.DEBUG_SESSION.crashed = true;
        appState.DEBUG_SESSION.error = errMsg;
        appState.DEBUG_SESSION.errorLine = callLine;
        say("\u2717 \u8FD0\u884C\u65F6\u9519\u8BEF [\u7B2C " + callLine + " \u884C]: " + errMsg + "\uFF08\u5DF2\u505C\u6B62\u5728\u62A5\u9519\u5904\uFF09", "err");
        return true;
      }
      if (targetIdx === 0 && appState.CURRENT_TS_META.interfaces && appState.CURRENT_TS_META.interfaces.size > 0) {
        const firstIface = [...appState.CURRENT_TS_META.interfaces.values()][0];
        if (firstIface) {
          const schemaDs = {};
          populateInterfaceSchemas(schemaDs);
          const schemaStep = {
            line: firstIface.line || 1,
            note: `interface ${firstIface.name} { ${firstIface.fields.map((f) => f.k + (f.optional ? "?" : "") + ": " + f.declaredType).join("; ")} }`,
            v: {},
            ds: schemaDs,
            callStack: [{ id: 0, fn: "global", label: "global", line: firstIface.line || 1, v: {}, ds: schemaDs }],
            anim: null,
            isCheckpoint: false,
            error: null,
            isFinalReturn: true
          };
          appState.TRACE.steps.push(schemaStep);
          appState.DEBUG_SESSION.finished = true;
          appState.DEBUG_SESSION.returnValue = retVal;
          return true;
        }
      }
      appState.DEBUG_SESSION.finished = true;
      appState.DEBUG_SESSION.returnValue = retVal;
      return false;
    }
    const stepObj = pendingStep;
    const rawLine = originalLines[stepObj.line - 1] || stepObj.note || "";
    const nextContext = Object.assign({}, nextVRaw || stepObj.vRaw);
    if (stepObj.checkpointVals) {
      nextContext["__ckptVals"] = stepObj.checkpointVals;
    }
    if (nextVRaw) {
      const rawMap = nextVRaw;
      Object.keys(rawMap).forEach((name) => {
        const nv = rawMap[name];
        if (nv && typeof nv === "object" && "__isVirtualPromise" in nv) {
          stepObj.v[name] = cloneDeepBounded(nv, 2);
        }
        if (stepObj.vRaw && stepObj.vRaw[name] === void 0 && nv !== void 0 && !stepObj.ds[name]) {
          const d = classifyValue(name, nv);
          if (d) stepObj.ds[name] = d;
        }
      });
    }
    populateInterfaceSchemas(stepObj.ds);
    enrichFromNote(stepObj.ds, nextVRaw || stepObj.vRaw || {}, rawLine);
    if (evLoop.loop.used) {
      const elSnap = evLoop.toVizSnapshot();
      const phaseInfo = phaseBox.current;
      if (phaseInfo) {
        elSnap.phase = phaseInfo.phase;
        elSnap.activeTaskLabel = phaseInfo.activeTaskLabel;
        elSnap.virtualTime = phaseInfo.virtualTime;
      }
      stepObj.ds["eventLoop"] = elSnap;
    }
    if (stepObj.callStack && stepObj.callStack.length > 0) {
      const topF = stepObj.callStack[stepObj.callStack.length - 1];
      if (topF) {
        topF.line = stepObj.line;
        topF.v = stepObj.v;
        topF.ds = stepObj.ds;
      }
    }
    const derived = deriveAnimAndNote(rawLine, stepObj.vRaw || {}, nextContext);
    delete stepObj.vRaw;
    stepObj.anim = derived.anim;
    stepObj.rawNote = stepObj.note;
    stepObj.note = derived.note || stepObj.note;
    if (derived.isCheckpoint) {
      stepObj.isCheckpoint = true;
    }
    if (runtimeErr) {
      const errMsg = runtimeErr instanceof Error && runtimeErr.message ? runtimeErr.message : runtimeErr && typeof runtimeErr === "object" && "message" in runtimeErr && typeof runtimeErr.message === "string" ? runtimeErr.message : String(runtimeErr);
      stepObj.error = errMsg;
      stepObj.note = `${rawLine.trim()}  \u2192  \u2717 \u8FD0\u884C\u65F6\u9519\u8BEF: ${errMsg}`;
      appState.RUNTIME_ERROR_LINES.add(stepObj.line);
      appState.DEBUG_SESSION.finished = true;
      appState.DEBUG_SESSION.crashed = true;
      appState.DEBUG_SESSION.error = errMsg;
      appState.DEBUG_SESSION.errorLine = stepObj.line;
    } else if (!paused) {
      appState.DEBUG_SESSION.finished = true;
      appState.DEBUG_SESSION.returnValue = retVal;
      stepObj.isFinalReturn = true;
      stepObj.returnValue = retVal;
    }
    appState.TRACE.steps.push(stepObj);
    discoverVars().forEach((s) => {
      if (!appState.SEEN_VARS_EVER.has(s.id)) {
        appState.SEEN_VARS_EVER.add(s.id);
        if (!appState.URL_WATCH || !appState.URL_WATCH.length || appState.URL_WATCH.includes(s.id)) {
          appState.watched.add(s.id);
        }
      }
    });
    if (runtimeErr) {
      say("\u2717 \u8FD0\u884C\u65F6\u9519\u8BEF [\u7B2C " + stepObj.line + " \u884C]: " + stepObj.error + "\uFF08\u5DF2\u8FD0\u884C\u5230\u62A5\u9519\u4E3A\u6B62\uFF09", "err");
    } else if (!paused && !opts.silent) {
      say("\u2713 \u8C03\u8BD5\u8FD0\u884C\u5B8C\u6210  \u2192  " + safeJSONStringify(retVal), "ok");
    }
    return true;
  }
  function detectUnsupportedSyntax2(_src) {
    return [];
  }
  function startDebug(initialStep = 0, sourceCode) {
    if (appState.LANG === "python") return PY_ENGINE.start(initialStep);
    appState.SELECTED_FRAME_IDX = null;
    const rawSrc = typeof sourceCode === "string" ? sourceCode : uiHooks.getEditorSource();
    const src = rawSrc.replace(/\r/g, "");
    const unsupported = detectUnsupportedSyntax2(src);
    if (unsupported.length && unsupported[0]) {
      resetTraceState();
      unsupported.forEach((x) => say("\u2717 \u7B2C " + x.line + " \u884C\uFF1A\u6682\u4E0D\u652F\u6301 " + x.feature + " \u2014\u2014 " + x.hint, "err", x.line));
      uiHooks.revealErrorLine(unsupported[0].line);
      return false;
    }
    extractTsInterfaceMetadata(src);
    const diags = typecheckTS(src, appState.STRICT_TS);
    if (diags.length > 0) {
      resetTraceState();
      reportTypeErrors(diags);
      return false;
    }
    if (appState.TYPE_ERROR_LINES.size || appState.RUNTIME_ERROR_LINES.size) {
      appState.TYPE_ERROR_LINES.clear();
      appState.RUNTIME_ERROR_LINES.clear();
    }
    const originalLines = src.split("\n");
    const enums = transpileEnums(src);
    if (enums.error) {
      resetTraceState();
      say("\u2717 \u7B2C " + enums.error.line + " \u884C\uFF1A" + enums.error.message, "err", enums.error.line);
      uiHooks.revealErrorLine(enums.error.line);
      return false;
    }
    const js0 = stripTypes(enums.code);
    const entry = resolveEntry(src, js0);
    const expr = stripTypes(entry.expr || "undefined");
    appState.ENTRY_CALL_LINE = entry.line || 0;
    const jsBody = entry.index >= 0 ? blankJsLine(js0, entry.index) : js0;
    let compiledFn;
    try {
      const names = collectNames(jsBody);
      const js = instrument(jsBody, originalLines, names);
      const snapStr = snapFnExpr(names);
      const body = js + "\n;var __entryVal = (" + expr + ');\nif (typeof __t === "function" && __t.__drain) { __entryVal = __t.__drain(__entryVal, ' + snapStr + '); }\ntry{if(typeof __t==="function"&&__t.__fin)__t.__fin(' + snapStr + ");}catch(_){}\nreturn __entryVal;";
      compiledFn = new Function("__t", "console", body);
    } catch (e) {
      resetTraceState();
      say("\u2717 \u7F16\u8BD1\u5931\u8D25: " + (e instanceof Error && e.message ? e.message : e), "err");
      return false;
    }
    uiHooks.stopAuto();
    uiHooks.clearFlyLayer();
    appState.TRACE = {
      title: "TypeScript Playground \xB7 Debug",
      code: originalLines,
      steps: []
    };
    appState.DEBUG_SESSION = {
      active: true,
      finished: false,
      crashed: false,
      error: null,
      errorLine: -1,
      returnValue: void 0,
      compiledFn,
      originalLines,
      callExpr: expr,
      hasAsync: hasAsyncConstructs(src)
    };
    appState.cur = 0;
    appState.watched = /* @__PURE__ */ new Set();
    appState.SEEN_VARS_EVER = /* @__PURE__ */ new Set();
    appState.layoutSpan = /* @__PURE__ */ Object.create(null);
    const target = Math.max(0, initialStep || 0);
    for (let s = 0; s <= target; s++) {
      const ok = computeAndAppendNextStep({ silent: s < target });
      if (!ok || appState.DEBUG_SESSION.finished) break;
    }
    appState.cur = Math.max(0, appState.TRACE.steps.length - 1);
    initWatchedVars();
    uiHooks.renderPicker();
    uiHooks.renderStatic(appState.cur, false);
    if (!appState.DEBUG_SESSION.crashed) {
      say("\u2713 \u7F16\u8BD1\u901A\u8FC7 \xB7 \u5DF2\u8FDB\u5165 Debug \u6A21\u5F0F\uFF08\u6BCF\u8D70\u4E00\u6B65\u5F53\u573A\u8BA1\u7B97\uFF0C\u53EF\u968F\u65F6\u6B65\u8FDB\u6216\u8FD0\u884C\u5230\u4E0B\u4E00\u4E2A\u68C0\u67E5\u70B9\uFF09", "ok");
    }
    return true;
  }
  var generateTrace = startDebug;
  function initWatchedVars() {
    const all = discoverVars().map((s) => s.id);
    all.forEach((id) => appState.SEEN_VARS_EVER.add(id));
    const urlWatch = appState.URL_WATCH;
    if (urlWatch && urlWatch.length) {
      const filtered = all.filter((id) => urlWatch.includes(id));
      appState.watched = new Set(filtered.length ? filtered : all);
    } else {
      appState.watched = new Set(all);
    }
  }
  var runTrace = startDebug;
  var rebuildFromSource = startDebug;

  // src/viz/ast-view.ts
  var ast_view_exports = {};
  __export(ast_view_exports, {
    buildAST: () => buildAST,
    buildStepVizRow: () => buildStepVizRow,
    clearFlyLayer: () => clearFlyLayer,
    hoverMetrics: () => hoverMetrics,
    playStepAnimation: () => playStepAnimation,
    positionStepViz: () => positionStepViz,
    renderAST: () => renderAST,
    updateStepViz: () => updateStepViz
  });
  var HOVER_GEOM = { charW: 0, lh: 24, padLeft: 16, padTop: 12 };
  function hoverMetrics() {
    let lh = 24, padLeft = 16, padTop = 12;
    try {
      const cs = typeof getComputedStyle === "function" ? getComputedStyle(editor) : null;
      if (cs) {
        lh = parseFloat(cs.lineHeight) || lh;
        padLeft = parseFloat(cs.paddingLeft) || padLeft;
        padTop = parseFloat(cs.paddingTop) || padTop;
        if (!HOVER_GEOM.charW && document.createElement) {
          const cv = document.createElement("canvas");
          const ctx = cv && cv.getContext ? cv.getContext("2d") : null;
          if (ctx) {
            ctx.font = (cs.fontWeight || "400") + " " + (cs.fontSize || "15px") + " " + (cs.fontFamily || "monospace");
            const w = ctx.measureText("MMMMMMMMMM").width / 10;
            if (w > 0 && isFinite(w)) HOVER_GEOM.charW = w;
          }
        }
      }
    } catch (_) {
    }
    HOVER_GEOM.lh = lh;
    HOVER_GEOM.padLeft = padLeft;
    HOVER_GEOM.padTop = padTop;
    return { lh, padLeft, padTop, charW: HOVER_GEOM.charW || 8.5 };
  }
  function buildAST(src) {
    const lines = String(src || "").replace(/\r\n?/g, "\n").split("\n");
    const children = [];
    for (let i = 0; i < lines.length; i++) {
      const clean = stripInlineCommentSafe(lines[i]).trim();
      if (!clean) continue;
      const stmts = splitStatements(clean).map((s) => s.trim()).filter(Boolean);
      for (const st of stmts) {
        let kind = "Statement";
        if (/^(?:export\s+)?(?:async\s+)?function\b/.test(st)) kind = "FunctionDeclaration";
        else if (/^(?:export\s+)?(?:abstract\s+)?class\b/.test(st)) kind = "ClassDeclaration";
        else if (/^(?:export\s+)?interface\b/.test(st)) kind = "InterfaceDeclaration";
        else if (/^(?:export\s+)?type\b/.test(st)) kind = "TypeAliasDeclaration";
        else if (/^(?:const|let|var)\b/.test(st)) kind = "VariableDeclaration";
        else if (/^(?:for|while|do)\b/.test(st)) kind = "LoopStatement";
        else if (/^(?:if|else|switch)\b/.test(st)) kind = "BranchStatement";
        else if (/^return\b/.test(st)) kind = "ReturnStatement";
        children.push({ kind, line: i + 1, text: st });
      }
    }
    return { kind: "Program", line: 1, text: "Program", children };
  }
  function renderAST(ast) {
    if (!ast || !Array.isArray(ast.children)) return "";
    return ast.children.map((n) => `<div class="ast-node" data-line="${n.line}"><span class="ast-kind">${esc(n.kind)}</span> <span class="ast-txt">${esc(n.text)}</span></div>`).join("");
  }
  function buildStepVizRow(_rawLine, anim, stError, isBelow = false) {
    const guideChar = isBelow ? "\u2570\u2500" : "\u256D\u2500";
    if (stError) {
      return `<div class="step-viz-row"><span class="sv-guide err">${guideChar}</span><div class="sv-box sv-err-box"><span class="sv-err-tag">\u2717 RUNTIME ERROR</span><span class="sv-err-msg">${esc(stError)}</span></div></div>`;
    }
    if (!anim) return "";
    if (anim.type === "error" && anim.message) {
      return `<div class="step-viz-row"><span class="sv-guide err">${guideChar}</span><div class="sv-box sv-err-box"><span class="sv-err-tag">\u2717 RUNTIME ERROR</span><span class="sv-err-msg">${esc(anim.message)}</span></div></div>`;
    }
    if (anim.type === "checkpoint") {
      const args = anim.args || [];
      const argVals = anim.argVals || [];
      const chips = args.length ? args.map((a, idx) => {
        const av = argVals[idx];
        const showEq = av !== void 0 && av !== a;
        return `<span class="sv-arg">${esc(a)}${showEq ? ` <span class="sv-eval">= ${esc(av)}</span>` : ""}</span>`;
      }).join('<span class="sv-dim">,</span>') : `<span class="sv-dim">\u5DF2\u6682\u505C\u4E8E\u68C0\u67E5\u70B9\u51FD\u6570 ${esc(anim.fn || "checkpoint")}()</span>`;
      return `<div class="step-viz-row"><span class="sv-guide ckpt">${guideChar}</span><div class="sv-box sv-ckpt-box"><span class="sv-ckpt-tag">\u25C9 CHECKPOINT</span>` + chips + `</div></div>`;
    }
    if (anim.type === "assign") {
      const valTxt = anim.val != null ? anim.val : "\u2026";
      const showFrom = anim.from && anim.from !== valTxt;
      return `<div class="step-viz-row"><span class="sv-guide">${guideChar}</span><div class="sv-box"><span class="sv-dst">${esc(anim.to)}</span><span class="sv-arrow">\u27F5</span><span class="sv-val">${esc(valTxt)}</span>` + (showFrom ? `<span class="sv-dim">from</span><span class="sv-src">${esc(anim.from)}</span>` : "") + `</div></div>`;
    }
    if (anim.type === "compare") {
      const vCls = anim.result ? "ok" : "no";
      const lhsShowVal = anim.lhsVal !== void 0 && anim.lhsVal !== anim.lhs;
      const rhsShowVal = anim.rhs && anim.rhsVal !== void 0 && anim.rhsVal !== anim.rhs;
      const lhsHtml = `<span class="sv-cmp"><span>${esc(anim.lhs)}</span>${lhsShowVal ? `<span class="sv-eval">= ${esc(anim.lhsVal)}</span>` : ""}</span>`;
      const rhsHtml = anim.rhs ? `<span class="sv-op">${esc(anim.op)}</span><span class="sv-cmp"><span>${esc(anim.rhs)}</span>${rhsShowVal ? `<span class="sv-eval">= ${esc(anim.rhsVal)}</span>` : ""}</span>` : "";
      return `<div class="step-viz-row"><span class="sv-guide">${guideChar}</span><div class="sv-box">` + lhsHtml + rhsHtml + `<span class="sv-verdict ${vCls}">\u21D2 ${anim.result ? "true" : "false"}</span></div></div>`;
    }
    if (anim.type === "call") {
      const args = anim.args || [];
      const argVals = anim.argVals || [];
      const argChips = args.map((a, idx) => {
        const av = argVals[idx];
        const showEq = av !== void 0 && av !== a;
        return `<span class="sv-arg">${esc(a)}${showEq ? ` <span class="sv-eval">= ${esc(av)}</span>` : ""}</span>`;
      }).join('<span class="sv-dim">,</span>');
      const prefix = anim.to && anim.result != null ? `<span class="sv-dst">${esc(anim.to)}</span><span class="sv-arrow">\u27F5</span><span class="sv-val">${esc(anim.result)}</span><span class="sv-dim">from</span>` : anim.result != null ? `<span class="sv-val">${esc(anim.result)}</span><span class="sv-arrow">\u27F5</span>` : "";
      return `<div class="step-viz-row"><span class="sv-guide">${guideChar}</span><div class="sv-box">` + prefix + `<span class="sv-fn">${esc(anim.fn)}</span><span class="sv-dim">(</span>${argChips}<span class="sv-dim">)</span></div></div>`;
    }
    return "";
  }
  var STEP_VIZ_LINE = -1;
  function updateStepViz(st, line, show, rawLine) {
    if (!stepVizEl) return;
    const html = show && st ? buildStepVizRow(rawLine, st.anim, st.error, line === 1) : "";
    if (!html) {
      STEP_VIZ_LINE = -1;
      if (stepVizEl.__vizHtml !== "") {
        stepVizEl.innerHTML = "";
        stepVizEl.__vizHtml = "";
      }
      if (stepVizEl.style) stepVizEl.style.display = "none";
      return;
    }
    STEP_VIZ_LINE = line;
    if (stepVizEl.__vizHtml !== html) {
      stepVizEl.innerHTML = html;
      stepVizEl.__vizHtml = html;
    }
    if (stepVizEl.style) {
      stepVizEl.style.left = "16px";
      stepVizEl.style.display = "block";
    }
    positionStepViz();
  }
  function positionStepViz() {
    if (!stepVizEl || !stepVizEl.style) return;
    if (STEP_VIZ_LINE < 1 || !appState.TRACE.steps.length) {
      stepVizEl.style.display = "none";
      return;
    }
    let placedBelow = false;
    if (window.PlaygroundCM) {
      const cm = window.PlaygroundCM;
      const lineTop = cm.lineTop(STEP_VIZ_LINE);
      const h = stepVizEl.offsetHeight || 22;
      let top = lineTop - h - 3;
      if (top < 2) {
        top = lineTop + 24 + 3;
        placedBelow = true;
      }
      const boxH = cm.viewportHeight() || 0;
      if (boxH && top + h > boxH - 2) {
        top = lineTop - h - 3;
        placedBelow = false;
        if (top < 2) top = Math.max(2, boxH - h - 4);
      }
      stepVizEl.style.left = cm.contentLeft() + "px";
      stepVizEl.style.top = Math.round(top) + "px";
      stepVizEl.style.display = "block";
    } else {
      const m = hoverMetrics();
      const lineTop = m.padTop + (STEP_VIZ_LINE - 1) * m.lh - (editor.scrollTop || 0);
      const h = stepVizEl.offsetHeight || 22;
      let top = lineTop - h - 3;
      if (top < 2) {
        top = lineTop + m.lh + 3;
        placedBelow = true;
      }
      const boxH = editor.clientHeight || 0;
      if (boxH && top + h > boxH - 2) {
        top = lineTop - h - 3;
        placedBelow = false;
        if (top < 2) top = Math.max(2, boxH - h - 4);
      }
      stepVizEl.style.top = Math.round(top) + "px";
      stepVizEl.style.display = "block";
    }
    if (stepVizEl.classList) {
      stepVizEl.classList.toggle("below-line", placedBelow);
    }
    if (typeof stepVizEl.innerHTML === "string" && stepVizEl.innerHTML) {
      const targetGuide = placedBelow ? "\u2570\u2500" : "\u256D\u2500";
      const nextHtml = stepVizEl.innerHTML.replace(
        /(<span class="sv-guide(?:\s+[^"]*)?">)(?:╭─|╰─)(<\/span>)/,
        `$1${targetGuide}$2`
      );
      if (nextHtml !== stepVizEl.innerHTML) {
        stepVizEl.innerHTML = nextHtml;
        stepVizEl.__vizHtml = nextHtml;
      }
    }
  }
  function clearFlyLayer() {
    if (flyLayerEl) flyLayerEl.innerHTML = "";
  }
  function playStepAnimation(st) {
    clearFlyLayer();
    if (appState.IS_STILL || !st || !st.anim || !flyLayerEl) return;
    const anim = st.anim;
    if (anim.type !== "assign" && !(anim.type === "call" && anim.to && anim.result != null)) return;
    const srcEl = highlightEl.querySelector(".ln.cur .tok-src") || highlightEl.querySelector(".ln.cur .tok-fn");
    const dstEl = highlightEl.querySelector(".ln.cur .tok-dst") || highlightEl.querySelector(".ln.cur");
    if (!srcEl || !dstEl) return;
    const sRect = srcEl.getBoundingClientRect();
    const dRect = dstEl.getBoundingClientRect();
    if (sRect.width === 0 && sRect.height === 0) return;
    const chip = document.createElement("div");
    chip.className = "fly-chip";
    chip.textContent = String(anim.val != null ? anim.val : anim.result);
    const sx = Math.round(sRect.left + sRect.width / 2 - 14);
    const sy = Math.round(sRect.top - 6);
    const dx = Math.round(dRect.left + dRect.width / 2 - 14);
    const dy = Math.round(dRect.top - 6);
    chip.style.transform = `translate3d(${sx}px, ${sy}px, 0) scale(0.92)`;
    chip.style.opacity = "0.96";
    flyLayerEl.appendChild(chip);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        chip.classList.add("landed");
        chip.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(1)`;
      });
    });
    setTimeout(() => {
      chip.style.opacity = "0";
    }, 340);
    setTimeout(() => {
      if (chip.parentNode) chip.parentNode.removeChild(chip);
    }, 620);
  }
  registerUiHooks({ clearFlyLayer });

  // src/viz/highlight.ts
  var highlight_exports = {};
  __export(highlight_exports, {
    HIGHLIGHT_BUILTINS: () => HIGHLIGHT_BUILTINS,
    collectDeclaredNames: () => collectDeclaredNames,
    collectHighlightBuiltins: () => collectHighlightBuiltins,
    findExprSpan: () => findExprSpan,
    formatHoverVal: () => formatHoverVal,
    hideHoverTip: () => hideHoverTip,
    highlightTS: () => highlightTS,
    hl: () => hl,
    hlActiveLine: () => hlActiveLine,
    hoverColumnAt: () => hoverColumnAt,
    hoverHitFromEvent: () => hoverHitFromEvent,
    hoverInfoFor: () => hoverInfoFor,
    hoverMetrics: () => hoverMetrics,
    hoverTipForName: () => hoverTipForName,
    hoverTipHtml: () => hoverTipHtml,
    hoverValueSummary: () => hoverValueSummary,
    hoverWordAt: () => hoverWordAt,
    liveTypeDiags: () => liveTypeDiags,
    positionHoverTip: () => positionHoverTip,
    revealErrorLine: () => revealErrorLine,
    scrollCodeTo: () => scrollCodeTo,
    showHoverTip: () => showHoverTip,
    syncScroll: () => syncScroll,
    updateEditorChrome: () => updateEditorChrome
  });
  var HIGHLIGHT_BUILTINS = /* @__PURE__ */ new Set([
    "checkpoint",
    "\u65AD\u70B9",
    "this",
    "console",
    "window",
    "document",
    "globalThis",
    "undefined",
    "NaN",
    "Infinity",
    "Math",
    "JSON",
    "Object",
    "Array",
    "Number",
    "String",
    "Boolean",
    "Map",
    "Set",
    "Promise",
    "Error",
    "RegExp",
    "Date",
    "parseInt",
    "parseFloat",
    "isNaN",
    "setTimeout",
    "clearTimeout"
  ]);
  var DECLARED_NAMES_CACHE = { src: null, names: /* @__PURE__ */ new Set() };
  function collectDeclaredNames(src) {
    if (appState.LANG === "python") return PY_ENGINE.collectDeclared(src);
    const text = String(src == null ? "" : src);
    if (DECLARED_NAMES_CACHE.src === text) return DECLARED_NAMES_CACHE.names;
    const names = /* @__PURE__ */ new Set();
    let js = text;
    try {
      js = stripTypes(text);
    } catch (_) {
      js = text;
    }
    try {
      collectNames(js).forEach((n) => names.add(n));
    } catch (_) {
    }
    let m;
    const impRe = /\/\*__import__\*\/\s*var\s+([^\n=]+)=/g;
    while (m = impRe.exec(js)) {
      const lhs = m[1] || "";
      const idRe = /\b([A-Za-z_$][\w$]*)\b/g;
      let im;
      while (im = idRe.exec(lhs)) {
        if (im[1]) names.add(im[1]);
      }
    }
    const typeRe = /\b(?:function|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g;
    const rawClean = blankStrings(text);
    while (m = typeRe.exec(rawClean)) {
      if (m[1]) names.add(m[1]);
    }
    const fnAssign = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b|\(|[A-Za-z_$][\w$]*\s*=>)/g;
    while (m = fnAssign.exec(js)) {
      if (m[1]) names.add(m[1]);
    }
    DECLARED_NAMES_CACHE = { src: text, names };
    return names;
  }
  function collectHighlightBuiltins(declared) {
    const source = appState.LANG === "python" ? typeof PY_ENGINE !== "undefined" && PY_ENGINE.builtins || [] : HIGHLIGHT_BUILTINS;
    const out = /* @__PURE__ */ new Set();
    Array.from(source).forEach((name) => {
      if (!declared.has(name)) out.add(name);
    });
    return out;
  }
  function hl(t, declared) {
    if (appState.LANG === "python") return PY_ENGINE.hl(t, declared);
    const re = new RegExp("(\\/\\/.*$)|(\"(?:[^\"\\\\]|\\\\.)*\"|'(?:[^'\\\\]|\\\\.)*'|`(?:[^`\\\\]|\\\\.)*`)|\\b(function|const|let|var|new|class|extends|typeof|instanceof|import|export|from|async|await|interface|type|as|satisfies)\\b|\\b(for|if|else|return|while|do|switch|case|break|continue|try|catch|finally|throw|yield)\\b|\\b(number|string|boolean|void|any|unknown|never|Math|Map|Set|Array|Object|JSON|Number|String|Boolean|Promise|Record|Error)\\b|\\b(true|false|null|undefined|\\d+(?:\\.\\d+)?)\\b|(\\b[A-Za-z_$][\\w$]*)(?=\\s*\\()|(?<=\\.)([A-Za-z_$][\\w$]*)\\b|([{,][ \\t]*)([A-Za-z_$][\\w$]*)(?=[ \\t]*:)|(^[ \\t]*)([A-Za-z_$][\\w$]*)(?=[ \\t]*:)|\\b([A-Za-z_$][\\w$]*)\\b|(===|!==|>=|<=|=>|&&|\\|\\||\\+\\+|--)", "g");
    let out = "", last = 0, m;
    while (m = re.exec(t)) {
      out += esc(t.slice(last, m.index));
      if (m[1]) out += '<span class="com">' + esc(m[1]) + "</span>";
      else if (m[2]) out += '<span class="str">' + esc(m[2]) + "</span>";
      else if (m[3]) out += '<span class="kw">' + esc(m[3]) + "</span>";
      else if (m[4]) out += '<span class="ctl">' + esc(m[4]) + "</span>";
      else if (m[5]) out += '<span class="' + (HIGHLIGHT_BUILTINS.has(m[5]) ? "bi" : "typ") + '">' + esc(m[5]) + "</span>";
      else if (m[6]) out += '<span class="num">' + esc(m[6]) + "</span>";
      else if (m[7]) {
        const id = m[7];
        const isMethod = m.index > 0 && t[m.index - 1] === ".";
        if (!isMethod && HIGHLIGHT_BUILTINS.has(id)) out += '<span class="bi">' + esc(id) + "</span>";
        else if (!declared || isMethod || declared.has(id)) out += '<span class="fn">' + esc(id) + "</span>";
        else out += esc(id);
      } else if (m[8]) out += '<span class="prop">' + esc(m[8]) + "</span>";
      else if (m[9]) out += esc(m[9]) + '<span class="prop">' + esc(m[10]) + "</span>";
      else if (m[11]) out += esc(m[11]) + '<span class="prop">' + esc(m[12]) + "</span>";
      else if (m[13]) {
        if (!declared || declared.has(m[13])) out += '<span class="prop">' + esc(m[13]) + "</span>";
        else if (HIGHLIGHT_BUILTINS.has(m[13])) out += '<span class="bi">' + esc(m[13]) + "</span>";
        else out += esc(m[13]);
      } else if (m[14]) out += '<span class="op">' + esc(m[14]) + "</span>";
      last = m.index + m[0].length;
    }
    out += esc(t.slice(last));
    return out;
  }
  function findExprSpan(line, target, fromIndex = 0) {
    if (!target) return -1;
    const startBoundary = isIdentPart(target[0]);
    const endBoundary = isIdentPart(target[target.length - 1]);
    let pos = Math.max(0, fromIndex);
    while (pos <= line.length - target.length) {
      const idx = line.indexOf(target, pos);
      if (idx < 0) return -1;
      const prev = idx > 0 ? line[idx - 1] : "";
      const next = idx + target.length < line.length ? line[idx + target.length] : "";
      const okStart = !startBoundary || !isIdentPart(prev);
      const okEnd = !endBoundary || !isIdentPart(next);
      if (okStart && okEnd) return idx;
      pos = idx + 1;
    }
    return -1;
  }
  function hlActiveLine(rawLine, anim, declared) {
    if (appState.LANG === "python") return PY_ENGINE.hlActiveLine(rawLine, anim, declared);
    if (!anim) return hl(rawLine, declared);
    const h = (s) => hl(s, declared);
    const declPrefix = rawLine.match(/^\s*(?:(?:export\s+)?(?:const|let|var)\b\s*)/);
    const lhsSearchStart = declPrefix ? declPrefix[0].length : 0;
    if (anim.type === "assign" && typeof anim.from === "string" && anim.from && typeof anim.to === "string" && anim.to) {
      const toIdx = findExprSpan(rawLine, anim.to, lhsSearchStart);
      if (toIdx >= 0) {
        const afterTo = toIdx + anim.to.length;
        const eqPos = rawLine.indexOf("=", afterTo);
        const rhsSearchStart = eqPos >= 0 ? eqPos + 1 : afterTo;
        const fromIdx = findExprSpan(rawLine, anim.from, rhsSearchStart);
        if (fromIdx >= afterTo) {
          const p1 = rawLine.slice(0, toIdx);
          const p2 = rawLine.slice(toIdx, afterTo);
          const p3 = rawLine.slice(afterTo, fromIdx);
          const p4 = rawLine.slice(fromIdx, fromIdx + anim.from.length);
          const p5 = rawLine.slice(fromIdx + anim.from.length);
          return h(p1) + '<span class="tok-dst">' + h(p2) + "</span>" + h(p3) + '<span class="tok-src">' + h(p4) + "</span>" + h(p5);
        }
      }
    }
    if (anim.type === "compare" && anim.lhs) {
      const condPrefix = rawLine.match(/^\s*(?:}\s*)?(?:(?:else\s+)?(?:if|while)\s*\(|for\s*\([^;]*;)/);
      const cmpStart = condPrefix ? condPrefix[0].length : 0;
      const lIdx = findExprSpan(rawLine, anim.lhs, cmpStart);
      if (lIdx >= 0) {
        if (anim.rhs) {
          const afterLhs2 = lIdx + anim.lhs.length;
          const opStr = anim.op || "";
          const opIdx = opStr ? rawLine.indexOf(opStr, afterLhs2) : -1;
          const rhsStart = opIdx >= 0 ? opIdx + opStr.length : afterLhs2;
          const rIdx = findExprSpan(rawLine, anim.rhs, rhsStart);
          if (rIdx >= afterLhs2) {
            const p1 = rawLine.slice(0, lIdx);
            const p2 = rawLine.slice(lIdx, afterLhs2);
            const p3 = rawLine.slice(afterLhs2, rIdx);
            const p4 = rawLine.slice(rIdx, rIdx + anim.rhs.length);
            const p5 = rawLine.slice(rIdx + anim.rhs.length);
            return h(p1) + '<span class="tok-cmp">' + h(p2) + "</span>" + h(p3) + '<span class="tok-cmp">' + h(p4) + "</span>" + h(p5);
          }
        }
        const afterLhs = lIdx + anim.lhs.length;
        return h(rawLine.slice(0, lIdx)) + '<span class="tok-cmp">' + h(rawLine.slice(lIdx, afterLhs)) + "</span>" + h(rawLine.slice(afterLhs));
      }
    }
    if (anim.type === "checkpoint") {
      const fnName = anim.fn || "checkpoint";
      const fnIdx = findExprSpan(rawLine, fnName, 0);
      if (fnIdx >= 0) {
        const p1 = rawLine.slice(0, fnIdx);
        const p2 = rawLine.slice(fnIdx, fnIdx + fnName.length);
        const rest = rawLine.slice(fnIdx + fnName.length);
        return h(p1) + '<span class="tok-ckpt">' + h(p2) + "</span>" + h(rest);
      }
    }
    if (anim.type === "call" && anim.fn) {
      const toStr = typeof anim.to === "string" && anim.to ? anim.to : "";
      const toIdx = toStr ? findExprSpan(rawLine, toStr, lhsSearchStart) : -1;
      const fnSearchStart = toIdx >= 0 ? toIdx + toStr.length : lhsSearchStart;
      const fnIdx = findExprSpan(rawLine, anim.fn, fnSearchStart);
      if (fnIdx >= 0) {
        if (toIdx >= 0 && fnIdx > toIdx) {
          const p12 = rawLine.slice(0, toIdx);
          const p22 = rawLine.slice(toIdx, toIdx + toStr.length);
          const p3 = rawLine.slice(toIdx + toStr.length, fnIdx);
          const p4 = rawLine.slice(fnIdx, fnIdx + anim.fn.length);
          const p5 = rawLine.slice(fnIdx + anim.fn.length);
          return h(p12) + '<span class="tok-dst">' + h(p22) + "</span>" + h(p3) + '<span class="tok-fn">' + h(p4) + "</span>" + h(p5);
        }
        const p1 = rawLine.slice(0, fnIdx);
        const p2 = rawLine.slice(fnIdx, fnIdx + anim.fn.length);
        const rest = rawLine.slice(fnIdx + anim.fn.length);
        return h(p1) + '<span class="tok-fn">' + h(p2) + "</span>" + h(rest);
      }
    }
    return h(rawLine);
  }
  function updateEditorChrome() {
    const text = editor.value.replace(/\r\n?/g, "\n");
    const lines = text.split("\n");
    const declared = collectDeclaredNames(text);
    const builtins = collectHighlightBuiltins(declared);
    const liveErrors = liveTypeDiags(text);
    const liveByLine = /* @__PURE__ */ new Map();
    liveErrors.forEach((d) => {
      if (d && d.line >= 1 && !liveByLine.has(d.line)) liveByLine.set(d.line, d);
    });
    const st = appState.TRACE.steps.length ? appState.TRACE.steps[appState.cur] : null;
    const activeFrame = st ? getActiveFrame(st) : null;
    const curLine = activeFrame ? activeFrame.line : st ? st.line : -1;
    const showVizOnLine = Boolean(st && (!activeFrame || activeFrame.isTop) && (st.anim || st.error) && curLine >= 1 && curLine <= lines.length);
    const errorBadge = (lineNum) => {
      const d = liveByLine.get(lineNum);
      if (!d) return "";
      const tip = (d.code ? d.code + ": " : "") + (d.message || "");
      return '<span class="ln-err-badge" title="' + esc(tip) + '">\u2717 ' + esc(d.code || (appState.LANG === "python" ? "PY" : "TS")) + "</span>";
    };
    if (window.PlaygroundCM) {
      const errorLines = /* @__PURE__ */ new Set([...liveByLine.keys(), ...appState.TYPE_ERROR_LINES, ...appState.RUNTIME_ERROR_LINES]);
      if (st && st.error && curLine >= 1) errorLines.add(curLine);
      window.PlaygroundCM.syncFromApp({
        language: appState.LANG,
        text,
        lines,
        declared,
        builtins,
        liveErrors,
        curLine,
        st,
        errorLines
      });
    } else {
      highlightEl.innerHTML = lines.map((t, k) => {
        const lineNum = k + 1;
        const isCur = lineNum === curLine;
        const isLiveErr = liveByLine.has(lineNum);
        const isErr = isLiveErr || appState.TYPE_ERROR_LINES.has(lineNum) || appState.RUNTIME_ERROR_LINES.has(lineNum) || Boolean(isCur && st && st.error);
        const inner = isCur && (!activeFrame || activeFrame.isTop) ? hlActiveLine(t, st && st.anim, declared) : hl(t, declared);
        const content = (inner || "&nbsp;") + (isLiveErr ? errorBadge(lineNum) : "");
        return '<span class="ln' + (isCur ? " cur" : "") + (isErr ? " err" : "") + '">' + content + "</span>";
      }).join("");
      gutterEl.innerHTML = lines.map((t, k) => {
        const lineNum = k + 1;
        const isCur = lineNum === curLine;
        const isErr = liveByLine.has(lineNum) || appState.TYPE_ERROR_LINES.has(lineNum) || appState.RUNTIME_ERROR_LINES.has(lineNum) || Boolean(isCur && st && st.error);
        const hasCkpt = /^\s*(?:checkpoint|断点)\s*\(/.test(t);
        return '<div class="gline' + (isCur ? " cur" : "") + (hasCkpt ? " ckpt" : "") + (isErr ? " err" : "") + '" data-line="' + lineNum + '">' + lineNum + "</div>";
      }).join("");
    }
    updateStepViz(st, curLine, showVizOnLine, lines[curLine - 1] || "");
    syncScroll();
  }
  var LIVE_TYPE_CACHE = { src: null, diags: [] };
  function liveTypeDiags(src) {
    if (appState.LANG === "python") return appState.PY_DIAGS;
    const text = String(src == null ? "" : src);
    if (LIVE_TYPE_CACHE.src === text) return LIVE_TYPE_CACHE.diags;
    let diags = [];
    try {
      diags = typecheckTS(text, appState.STRICT_TS) || [];
    } catch (_) {
      diags = [];
    }
    LIVE_TYPE_CACHE = { src: text, diags };
    return diags;
  }
  function revealErrorLine(line, focus) {
    const ln = Math.round(Number(line) || 0);
    if (ln < 1) return;
    if (window.PlaygroundCM) {
      window.PlaygroundCM.revealLine(ln, focus);
      return;
    }
    const lines = editor.value.replace(/\r\n?/g, "\n").split("\n");
    if (ln > lines.length) return;
    scrollCodeTo(ln);
    if (!focus || !editor.focus) return;
    try {
      editor.focus();
      let pos = 0;
      for (let i = 0; i < ln - 1; i++) pos += (lines[i] || "").length + 1;
      editor.selectionStart = editor.selectionEnd = Math.min(pos, editor.value.length);
    } catch (_) {
    }
  }
  var hoverTipKey = "";
  function hoverColumnAt(lineText, x, charW) {
    let acc = 0;
    for (let i = 0; i < lineText.length; i++) {
      const w = lineText[i] === "	" ? charW * 2 : charW;
      if (x < acc + w) return i;
      acc += w;
    }
    return -1;
  }
  function hoverHitFromEvent(e) {
    if (!editor || !editor.getBoundingClientRect) return null;
    const rect = editor.getBoundingClientRect();
    if (!rect || !rect.width && !rect.height) return null;
    const m = hoverMetrics();
    const y = e.clientY - rect.top - m.padTop + (editor.scrollTop || 0);
    const x = e.clientX - rect.left - m.padLeft + (editor.scrollLeft || 0);
    if (y < 0 || x < 0) return null;
    const lineIdx = Math.floor(y / m.lh);
    const lines = editor.value.replace(/\r\n?/g, "\n").split("\n");
    if (lineIdx < 0 || lineIdx >= lines.length) return null;
    const text = lines[lineIdx];
    if (!text) return null;
    const col = hoverColumnAt(text, x, m.charW);
    if (col < 0) return null;
    return { line: lineIdx + 1, text, col };
  }
  var HOVER_WORD_RE = /[A-Za-z0-9_$]/;
  function hoverWordAt(lineText, col) {
    if (!lineText) return null;
    let i = Math.min(Math.max(0, col), lineText.length - 1);
    if (!HOVER_WORD_RE.test(lineText[i] || "")) {
      if (i > 0 && HOVER_WORD_RE.test(lineText[i - 1] || "")) i--;
      else return null;
    }
    let s = i, e = i;
    while (s > 0 && HOVER_WORD_RE.test(lineText[s - 1] || "")) s--;
    while (e < lineText.length && HOVER_WORD_RE.test(lineText[e] || "")) e++;
    const word = lineText.slice(s, e);
    if (!/^[A-Za-z_$][\w$]*$/.test(word)) return null;
    return { word, start: s, end: e };
  }
  function hoverInfoFor(name) {
    if (!name || !appState.TRACE.steps.length) return null;
    if (typeof RESERVED_WORDS !== "undefined" && RESERVED_WORDS.has(name) && name !== "this") return null;
    const st = appState.TRACE.steps[appState.cur];
    if (!st) return null;
    const frame = getActiveFrame(st);
    let v = frame && frame.v || st.v || {};
    let ds = frame && frame.ds || st.ds || {};
    let frameLabel = frame ? frame.label : "global";
    const found = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
    let lookupKey = name;
    if (name === "self" && !found(v, "self") && !ds.self && (found(v, "this") || ds.this)) {
      lookupKey = "this";
    }
    if (!found(v, lookupKey) && !ds[lookupKey]) {
      const globalFrame = st.callStack && st.callStack[0];
      if (globalFrame && globalFrame.v && (found(globalFrame.v, lookupKey) || globalFrame.ds && globalFrame.ds[lookupKey])) {
        v = globalFrame.v;
        ds = globalFrame.ds || {};
        frameLabel = globalFrame.label || "global";
      }
    }
    const hasVal = found(v, lookupKey);
    const d = ds[lookupKey] || null;
    if (!hasVal && !d) return null;
    const val = hasVal ? v[lookupKey] : void 0;
    const declaredType = (appState.CURRENT_TS_META && appState.CURRENT_TS_META.varTypes ? appState.CURRENT_TS_META.varTypes.get(lookupKey) : null) || (d && d.interfaceName && d.interfaceName !== "object" ? d.interfaceName : null);
    const kindStr = d ? d.kind === "interface" && d.isClass ? d.interfaceName ? "class \xB7 " + d.interfaceName : "class" : d.kind : declaredType || inferRuntimeTsType(val);
    return {
      name,
      val,
      d,
      kind: kindStr,
      declaredType: declaredType || null,
      frame: frameLabel
    };
  }
  function formatHoverVal(val) {
    if (val === void 0) return "undefined";
    if (val === null) return "null";
    if (typeof val === "function") return "\u0192 " + (val.name || "function");
    if (typeof val === "string") return JSON.stringify(val.length > 140 ? val.slice(0, 138) + "\u2026" : val);
    if (typeof val === "number" || typeof val === "boolean") return String(val);
    if (Array.isArray(val)) {
      const head = val.slice(0, 12).map(formatHoverVal).join(", ");
      return "[" + head + (val.length > 12 ? ", \u2026 (" + val.length + " \u9879)" : "") + "]";
    }
    if (isMapLike(val)) return "Map(" + val.size + ")";
    if (isSetLike(val)) return "Set(" + val.size + ")";
    if (isRecord(val)) {
      const keys = Object.keys(val);
      const body = keys.slice(0, 8).map((k) => k + ": " + formatHoverVal(val[k])).join(", ");
      return "{ " + body + (keys.length > 8 ? ", \u2026" : "") + " }";
    }
    return String(val);
  }
  function hoverValueSummary(info) {
    const d = info.d;
    if (!d) return formatHoverVal(info.val);
    const short = formatShortVal;
    if (Array.isArray(d.items)) {
      const total = typeof d.total === "number" ? d.total : d.items.length;
      if (d.kind === "string") {
        const s = d.items.join("");
        const suffix = total > d.items.length ? ` (\u5171 ${total} \u5B57\u7B26)` : "";
        return JSON.stringify(s.length > 120 ? s.slice(0, 118) + "\u2026" : s) + suffix;
      }
      const head = d.items.slice(0, 14).map(short).join(", ");
      return "[" + head + (total > 14 ? `, \u2026 (\u5171 ${total} \u9879)` : "") + "]";
    }
    if (d.kind === "map") {
      const entries = d.entries || [];
      const total = typeof d.total === "number" ? d.total : entries.length;
      const head = entries.slice(0, 6).map((e) => short(e.k) + " \u2192 " + short(e.v)).join(", ");
      return "Map(" + total + " \u9879) { " + head + (total > 6 ? ", \u2026" : "") + " }";
    }
    if (d.kind === "grid") {
      const rows = typeof d.totalRows === "number" ? d.totalRows : (d.cells || []).length;
      const cols = typeof d.totalCols === "number" ? d.totalCols : rows && Array.isArray(d.cells[0]) ? d.cells[0].length : 0;
      return rows + " \xD7 " + cols + " \u7684\u4E8C\u7EF4\u77E9\u9635";
    }
    if (d.kind === "tree") {
      const nodes = d.nodes || [];
      const total = typeof d.total === "number" ? d.total : nodes.length;
      const root = nodes[d.root] ? nodes[d.root].val : void 0;
      return "Tree(" + total + " \u4E2A\u8282\u70B9 \xB7 \u6839 " + short(root) + ")";
    }
    if (d.kind === "graph") {
      const nCnt = typeof d.totalNodes === "number" ? d.totalNodes : (d.nodes || []).length;
      const eCnt = typeof d.totalEdges === "number" ? d.totalEdges : (d.edges || []).length;
      return "Graph(" + nCnt + " \u8282\u70B9 / " + eCnt + " \u6761\u8FB9)";
    }
    if (d.fields) {
      const head = d.fields.slice(0, 6).map((f) => f.k + ": " + short(f.v)).join(", ");
      return "{ " + head + (d.fields.length > 6 ? ", \u2026" : "") + " }";
    }
    return formatHoverVal(info.val);
  }
  function hoverTipHtml(info) {
    if (!info) return "";
    const parts = [];
    const kindLabel = esc(String(info.kind || "").replace(/^./, (c) => c.toUpperCase()));
    parts.push('<div class="ht-head"><span class="ht-name">' + esc(info.name) + "</span>" + (kindLabel ? '<span class="ht-kind">' + kindLabel + "</span>" : "") + "</div>");
    parts.push('<div class="ht-val">' + esc(hoverValueSummary(info)) + "</div>");
    const note = [];
    if (info.declaredType) note.push("\u58F0\u660E\u7C7B\u578B " + info.declaredType);
    if (info.frame) note.push("\u6808\u5E27 " + info.frame);
    if (note.length) parts.push('<div class="ht-note">' + esc(note.join(" \xB7 ")) + "</div>");
    const vizFn = info.d && typeof info.d.kind === "string" ? VIZ[info.d.kind] : null;
    if (typeof vizFn === "function") {
      let viz = "";
      try {
        viz = vizFn(info.d) || "";
      } catch (_) {
        viz = "";
      }
      if (viz) parts.push('<div class="ht-viz">' + viz + "</div>");
    }
    return parts.join("");
  }
  function positionHoverTip(clientX, clientY) {
    if (!hoverTipEl) return;
    const rect = hoverTipEl.getBoundingClientRect ? hoverTipEl.getBoundingClientRect() : { width: 320, height: 120 };
    const vw = typeof window !== "undefined" && window.innerWidth || 1280;
    const vh = typeof window !== "undefined" && window.innerHeight || 800;
    let left = clientX + 16;
    let top = clientY + 18;
    if (left + rect.width > vw - 10) left = Math.max(8, clientX - rect.width - 16);
    if (top + rect.height > vh - 10) top = Math.max(8, clientY - rect.height - 14);
    if (hoverTipEl.style) {
      hoverTipEl.style.left = left + "px";
      hoverTipEl.style.top = top + "px";
    }
  }
  function hideHoverTip() {
    hoverTipKey = "";
    if (!hoverTipEl) return;
    if (hoverTipEl.classList) hoverTipEl.classList.remove("on");
    if (hoverTipEl.setAttribute) hoverTipEl.setAttribute("aria-hidden", "true");
  }
  function showHoverTip(info, clientX, clientY) {
    if (!hoverTipEl || !info) {
      hideHoverTip();
      return;
    }
    hoverTipEl.innerHTML = hoverTipHtml(info);
    if (hoverTipEl.classList) hoverTipEl.classList.add("on");
    if (hoverTipEl.setAttribute) hoverTipEl.setAttribute("aria-hidden", "false");
    positionHoverTip(clientX, clientY);
  }
  function hoverTipForName(name, clientX, clientY) {
    if (!appState.TRACE.steps.length) {
      hideHoverTip();
      return false;
    }
    const info = hoverInfoFor(name);
    if (!info) {
      hideHoverTip();
      return false;
    }
    const key = name + "@" + appState.cur + "#" + appState.TRACE.steps.length;
    if (!(hoverTipEl && hoverTipEl.classList && hoverTipEl.classList.contains && hoverTipEl.classList.contains("on")) || hoverTipKey !== key) {
      hoverTipKey = key;
      showHoverTip(info, clientX, clientY);
    } else {
      positionHoverTip(clientX, clientY);
    }
    return true;
  }
  function syncScroll() {
    if (window.PlaygroundCM) {
      positionStepViz();
      return;
    }
    highlightEl.scrollTop = editor.scrollTop;
    highlightEl.scrollLeft = editor.scrollLeft;
    gutterEl.scrollTop = editor.scrollTop;
    positionStepViz();
  }
  function scrollCodeTo(line) {
    if (window.PlaygroundCM) {
      window.PlaygroundCM.scrollToLine(line);
      return;
    }
    const lh = 24;
    const idx = Math.max(0, line - 1);
    const visible = Math.max(1, Math.floor(editor.clientHeight / lh));
    const first = Math.round(editor.scrollTop / lh);
    if (idx < first) editor.scrollTop = Math.max(0, (idx - 1) * lh);
    else if (idx >= first + visible - 1) editor.scrollTop = (idx - visible + 2) * lh;
    syncScroll();
  }
  var highlightTS = hl;
  registerUiHooks({ updateEditorChrome, revealErrorLine });

  // src/viz/memory-graph.ts
  var memory_graph_exports = {};
  __export(memory_graph_exports, {
    POINTER_VAR_NAMES: () => POINTER_VAR_NAMES,
    VIZ: () => VIZ,
    allocateSlotSpans: () => allocateSlotSpans,
    build1DFocalSlice: () => build1DFocalSlice,
    classifyValue: () => classifyValue,
    cloneDeepBounded: () => cloneDeepBounded,
    decideSpan: () => decideSpan,
    defineHidden: () => defineHidden,
    deriveAnimAndNote: () => deriveAnimAndNote,
    detectWindowRange: () => detectWindowRange,
    discoverVars: () => discoverVars,
    drawArrows: () => drawArrows,
    enrichFromNote: () => enrichFromNote,
    formatShortVal: () => formatShortVal,
    getActiveFrame: () => getActiveFrame,
    isFrame: () => isFrame,
    isMapLike: () => isMapLike,
    isRecord: () => isRecord,
    isSetLike: () => isSetLike,
    normalizeGraph: () => normalizeGraph,
    normalizeList: () => normalizeList,
    normalizeTree: () => normalizeTree,
    populateInterfaceSchemas: () => populateInterfaceSchemas,
    pressure: () => pressure,
    renderAsyncQueues: () => renderAsyncQueues,
    renderCallStack: () => renderCallStack,
    renderMemory: () => renderMemory,
    renderPicker: () => renderPicker,
    renderSlots: () => renderSlots,
    renderStatic: () => renderStatic,
    safeEvalExpr: () => safeEvalExpr,
    scheduleArrowRedraw: () => scheduleArrowRedraw,
    selectGridAxisIndices: () => selectGridAxisIndices,
    selectStackFrame: () => selectStackFrame,
    snapshot: () => snapshot,
    splitLogicalClauses: () => splitLogicalClauses,
    truncMap: () => truncMap,
    updateControlButtons: () => updateControlButtons,
    vizArray: () => vizArray,
    vizEventLoop: () => vizEventLoop,
    vizGraph: () => vizGraph,
    vizGrid: () => vizGrid,
    vizHeap: () => vizHeap,
    vizInterface: () => vizInterface,
    vizList: () => vizList,
    vizMap: () => vizMap,
    vizQueue: () => vizQueue,
    vizSet: () => vizSet,
    vizStack: () => vizStack,
    vizString: () => vizString,
    vizTree: () => vizTree,
    vizUF: () => vizUF
  });
  function selectStackFrame(frameIdx) {
    const st = appState.TRACE.steps[appState.cur];
    if (!st || !Array.isArray(st.callStack) || !st.callStack.length) return;
    const topIdx = st.callStack.length - 1;
    const clamped = Math.max(0, Math.min(topIdx, Number(frameIdx) || 0));
    appState.SELECTED_FRAME_IDX = clamped === topIdx ? null : clamped;
    renderStatic(appState.cur, false);
  }
  function renderCallStack(st) {
    if (!callStackBarEl) return;
    if (!st) {
      callStackBarEl.innerHTML = '<span class="cs-empty">\u672A\u5728\u8C03\u8BD5</span>';
      if (callStackHintEl) callStackHintEl.textContent = "\u70B9\u51FB\u6808\u5E27\u53EF\u5207\u6362\u4F5C\u7528\u57DF";
      return;
    }
    const stack = Array.isArray(st.callStack) && st.callStack.length ? st.callStack : [{ fn: "global", label: "global", line: st.line, v: st.v || {}, ds: st.ds || {} }];
    const active = getActiveFrame(st);
    const activeIdx = active ? active.idx : 0;
    const activeIsTop = active ? active.isTop : true;
    const activeLabel = active ? active.label : "global";
    callStackBarEl.innerHTML = stack.map((f, fIdx) => {
      const isSel = fIdx === activeIdx;
      const isTop = fIdx === stack.length - 1;
      const cls = "cs-crumb" + (isSel ? " active" : "") + (isTop ? " is-top" : "") + (!isTop && isSel ? " inspecting" : "");
      const sep = fIdx > 0 ? '<span class="cs-sep">\u25B8</span>' : "";
      return sep + `<button type="button" class="${cls}" data-frame-idx="${fIdx}" title="\u5207\u6362\u5230\u6808\u5E27 ${esc(f.label)} (\u7B2C ${f.line || st.line} \u884C)">${esc(f.label)}</button>`;
    }).join("");
    if (callStackHintEl) {
      callStackHintEl.textContent = activeIsTop ? `\u6808\u6DF1 ${stack.length} \xB7 \u70B9\u51FB\u6808\u5E27\u53EF\u5207\u6362` : `\u6B63\u5728\u67E5\u770B\u6808\u5E27 ${activeIdx + 1}/${stack.length}: ${activeLabel}`;
    }
  }
  function truncMap(arr, render, d) {
    if (d && Array.isArray(d.windowed) && d.windowed.length) {
      return d.windowed.map((entry) => {
        if (entry && entry.gap) {
          const tip = entry.from != null && entry.to != null ? ` title="\u7701\u7565\u4E0B\u6807 ${entry.from}..${entry.to}\uFF08\u5171 ${entry.count} \u9879\uFF09"` : "";
          return '<div class="vmore"' + tip + '>\u2026<span class="vmore-cnt">+' + entry.count + "</span></div>";
        }
        return render(entry.val, entry.idx ?? 0);
      }).join("");
    }
    const MAX = 20, HEAD = 10, TAIL = 5;
    if (!arr || arr.length <= MAX) return (arr || []).map((x, i) => render(x, i)).join("");
    const total = d && typeof d.total === "number" && d.total >= arr.length ? d.total : arr.length;
    const hidden = Math.max(1, total - HEAD - TAIL);
    const head = arr.slice(0, HEAD).map((x, i) => render(x, i)).join("");
    const tailStart = total - TAIL;
    const tail = arr.slice(arr.length - TAIL).map((x, i) => render(x, tailStart + i)).join("");
    return head + '<div class="vmore" title="\u7701\u7565 ' + hidden + ' \u9879">\u2026<span class="vmore-cnt">+' + hidden + "</span></div>" + tail;
  }
  function vizArray(d) {
    if (!d || !d.items || !d.items.length) return null;
    const win = d.win;
    const ptrs = d.pointers;
    const cells = truncMap(d.items, (n, k) => {
      let cls = "vcell vcell-idx";
      if (win && k >= win[0] && k <= win[1]) cls += " win";
      if (d.hot === k) cls += " hot";
      else if (d.mark === k) cls += " mark";
      const pTag = ptrs && ptrs[k] && ptrs[k].length ? '<span class="sub-tag ptr-tag">' + esc(ptrs[k].slice(0, 2).join(",")) + "</span>" : "";
      return '<div class="' + cls + '">' + pTag + '<span class="val">' + esc(n) + '</span><span class="idx">' + k + "</span></div>";
    }, d);
    return '<div class="viz"><div class="viz-row varray-row">' + cells + "</div></div>";
  }
  function vizQueue(d) {
    if (!d || !d.items || !d.items.length) return null;
    const len = typeof d.total === "number" && d.total > 0 ? d.total : d.items.length;
    const cells = truncMap(d.items, (n, k) => {
      let cls = "vcell vcell-idx";
      if (d.hot === k) cls += " hot";
      else if (k === 0) cls += " mark";
      const tag = k === 0 ? '<span class="sub-tag">front</span>' : k === len - 1 ? '<span class="sub-tag">back</span>' : "";
      return '<div class="' + cls + '">' + tag + '<span class="val">' + esc(n) + '</span><span class="idx">' + k + "</span></div>";
    }, d);
    return '<div class="viz"><div class="viz-row varray-row">' + cells + "</div></div>";
  }
  function vizHeap(d) {
    if (!d || !d.items || !d.items.length) return null;
    const cells = truncMap(d.items, (n, k) => {
      let cls = "vcell vcell-idx";
      if (d.hot === k) cls += " hot";
      else if (k === 0) cls += " mark";
      const tag = k === 0 ? '<span class="sub-tag">top</span>' : "";
      return '<div class="' + cls + '">' + tag + '<span class="val">' + esc(n) + '</span><span class="idx">' + k + "</span></div>";
    }, d);
    return '<div class="viz"><div class="viz-row varray-row">' + cells + '</div><div class="vmeta-hint">parent = (i - 1) &gt;&gt; 1 \xB7 left = 2i + 1</div></div>';
  }
  function vizUF(d) {
    if (!d || !d.items || !d.items.length) return null;
    const cells = truncMap(d.items, (p, k) => {
      let cls = "vcell vcell-idx";
      if (d.hot === k) cls += " hot";
      else if (p === k) cls += " mark";
      const tag = p === k ? '<span class="sub-tag">root</span>' : '<span class="sub-tag">p:' + esc(p) + "</span>";
      return '<div class="' + cls + '">' + tag + '<span class="val">' + esc(p) + '</span><span class="idx">' + k + "</span></div>";
    }, d);
    return '<div class="viz"><div class="viz-row varray-row">' + cells + "</div></div>";
  }
  function vizMap(d) {
    if (!d || !d.entries || !d.entries.length) return null;
    return '<div class="viz"><div class="viz-row vmap-row">' + truncMap(d.entries, (e) => {
      const k = isRecord(e) ? e.k : "";
      const v = isRecord(e) ? e.v : void 0;
      return '<div class="vpair' + (d.hot === k ? " hot" : "") + '"><span class="vcell vk">' + esc(k) + '</span><span class="varr">\u2192</span><span class="vcell vv">' + esc(v) + "</span></div>";
    }, d) + "</div></div>";
  }
  function vizSet(d) {
    if (!d || !d.items || !d.items.length) return null;
    return '<div class="viz"><div class="viz-row">' + truncMap(
      d.items,
      (x) => '<div class="vcell' + (d.hot === x ? " hot" : "") + '">' + esc(x) + "</div>",
      d
    ) + "</div></div>";
  }
  function vizStack(d) {
    if (!d || !d.items || !d.items.length) return null;
    const all = d.items, MAX = 6;
    const total = typeof d.total === "number" && d.total >= all.length ? d.total : all.length;
    const baseIdx = typeof d.baseIdx === "number" ? d.baseIdx : Math.max(0, total - all.length);
    const sliceStart = Math.max(0, all.length - MAX);
    const shown = all.slice(sliceStart);
    const hiddenCount = Math.max(0, total - shown.length);
    const rows = shown.map((x, k) => {
      const abs = baseIdx + sliceStart + k;
      const isTop = abs === total - 1;
      return '<div class="vcell' + (d.hot === abs ? " hot" : isTop ? " mark" : "") + '"><span>' + esc(x) + "</span>" + (isTop ? '<span class="vtop">top</span>' : "") + "</div>";
    }).join("");
    return '<div class="viz"><div class="vcol">' + rows + "</div>" + (hiddenCount ? '<div class="vmore">\u2026+' + hiddenCount + "</div>" : "") + "</div>";
  }
  function vizString(d) {
    if (!d || !d.items || !d.items.length) return null;
    const win = d.win;
    if (Array.isArray(d.windowed) && d.windowed.length) {
      const cells = truncMap(d.items, (ch, k) => {
        let cls = "ch";
        if (win && k >= win[0] && k <= win[1]) cls += " win";
        if (d.hot === k) cls += " hot";
        else if (d.mark === k) cls += " mark";
        return '<span class="' + cls + '" title="[' + k + ']">' + esc(ch) + "</span>";
      }, d);
      return '<div class="viz"><div class="vstr">' + cells + "</div></div>";
    }
    return '<div class="viz"><div class="vstr">' + d.items.map((ch, k) => {
      let cls = "ch";
      if (win && k >= win[0] && k <= win[1]) cls += " win";
      if (d.hot === k) cls += " hot";
      else if (d.mark === k) cls += " mark";
      return '<span class="' + cls + '">' + esc(ch) + "</span>";
    }).join("") + "</div></div>";
  }
  function vizGrid(d) {
    if (!d || !d.cells || !d.cells.length) return null;
    const depSet = new Set((d.deps || []).map((p) => p[0] + "," + p[1]));
    if (Array.isArray(d.rowIndices) && Array.isArray(d.colIndices) && Array.isArray(d.viewCells)) {
      const rIdxs = d.rowIndices;
      const cIdxs = d.colIndices;
      const colTracks = [];
      for (let ci = 0; ci < cIdxs.length; ci++) {
        const curC = cIdxs[ci] ?? 0;
        const prevC = cIdxs[ci - 1] ?? 0;
        if (ci > 0 && curC > prevC + 1) colTracks.push({ gap: true });
        colTracks.push({ gap: false, c: curC, ci });
      }
      const gridCols = colTracks.length + 1;
      let html2 = '<div class="ghead">r\\c</div>';
      for (const ct of colTracks) {
        if (ct.gap) {
          html2 += '<div class="ggap">\u22EF</div>';
        } else {
          const isFocusCol = Array.isArray(d.mark) && d.mark[1] === ct.c;
          html2 += '<div class="ghead' + (isFocusCol ? " focus" : "") + '">' + ct.c + "</div>";
        }
      }
      for (let ri = 0; ri < rIdxs.length; ri++) {
        const realR = rIdxs[ri];
        if (ri > 0 && realR !== void 0 && realR > (rIdxs[ri - 1] ?? 0) + 1) {
          html2 += '<div class="ggap">\u22EE</div>';
          for (let gi = 0; gi < colTracks.length; gi++) {
            html2 += '<div class="ggap">' + (colTracks[gi]?.gap ? "\u22F1" : "\u22EE") + "</div>";
          }
        }
        const isFocusRow = Array.isArray(d.mark) && d.mark[0] === realR;
        html2 += '<div class="ghead' + (isFocusRow ? " focus" : "") + '">' + realR + "</div>";
        const rowVals = d.viewCells[ri] || [];
        for (const ct of colTracks) {
          if (ct.gap) {
            html2 += '<div class="ggap">\u22EF</div>';
          } else {
            const realC = ct.c;
            let cls = "gcell";
            if (Array.isArray(d.mark) && d.mark[0] === realR && d.mark[1] === realC) cls += " hot";
            else if (depSet.has(realR + "," + realC)) cls += " dep";
            const val = rowVals[ct.ci];
            html2 += '<div class="' + cls + '" title="[' + realR + "][" + realC + ']">' + (val === void 0 || val === null ? "\xB7" : esc(val)) + "</div>";
          }
        }
      }
      return '<div class="viz"><div class="vgrid-wrap"><div class="vgrid" style="grid-template-columns:repeat(' + gridCols + ',auto)">' + html2 + "</div></div></div>";
    }
    const cols = d.cells[0]?.length ?? 0;
    let html = "";
    for (let r = 0; r < d.cells.length; r++) {
      for (let c = 0; c < cols; c++) {
        let cls = "gcell";
        if (Array.isArray(d.mark) && d.mark[0] === r && d.mark[1] === c) cls += " hot";
        else if (depSet.has(r + "," + c)) cls += " dep";
        const val = d.cells[r]?.[c];
        html += '<div class="' + cls + '">' + (val === void 0 || val === null ? "\xB7" : esc(val)) + "</div>";
      }
    }
    return '<div class="viz"><div class="vgrid" style="grid-template-columns:repeat(' + cols + ',auto)">' + html + "</div></div>";
  }
  function vizList(d) {
    if (!d || !d.items || !d.items.length) return null;
    const total = typeof d.total === "number" && d.total > 0 ? d.total : d.items.length;
    const ptrs = d.pointers;
    return '<div class="viz"><div class="viz-row">' + truncMap(d.items, (val, k) => {
      const pTag = ptrs && ptrs[k] && ptrs[k].length ? '<span class="sub-tag ptr-tag">' + esc(ptrs[k].slice(0, 2).join(",")) + "</span>" : "";
      return '<div class="vpair"><span class="vcell' + (d.hot === k ? " hot" : "") + '">' + pTag + esc(val) + "</span>" + (k < total - 1 ? '<span class="varr">\u2192</span>' : '<span class="varr">\u2192</span><span class="vempty">null</span>') + "</div>";
    }, d) + "</div></div>";
  }
  function vizTree(d) {
    if (!d || !d.nodes || !d.nodes.length) return null;
    const nodes = d.nodes;
    const root = d.root ?? 0;
    const coords = /* @__PURE__ */ new Map();
    let maxDepth = 0;
    function layout(idx, depth, xMin, xMax) {
      if (idx == null || !nodes[idx] || coords.has(idx) || depth > 5) return;
      const node = nodes[idx];
      if (!node) return;
      maxDepth = Math.max(maxDepth, depth);
      const x = (xMin + xMax) / 2;
      const y = 20 + depth * 36;
      const leftIdx = typeof node.left === "number" ? node.left : null;
      const rightIdx = typeof node.right === "number" ? node.right : null;
      coords.set(idx, { x, y, val: node.val, left: leftIdx, right: rightIdx });
      layout(leftIdx, depth + 1, xMin, x);
      layout(rightIdx, depth + 1, x, xMax);
    }
    layout(root, 0, 14, 226);
    const h = Math.max(60, (maxDepth + 1) * 36 + 10);
    let edgesSvg = "", nodesSvg = "";
    coords.forEach((info, idx) => {
      [info.left, info.right].forEach((ch) => {
        if (ch != null && coords.has(ch)) {
          const c = coords.get(ch);
          if (c) edgesSvg += `<line class="vsvg-edge" x1="${info.x}" y1="${info.y}" x2="${c.x}" y2="${c.y}"/>`;
        }
      });
      const cls = d.hot === idx ? "vsvg-node hot" : idx === root ? "vsvg-node mark" : "vsvg-node";
      nodesSvg += `<g><circle class="${cls}" cx="${info.x}" cy="${info.y}" r="12"/><text class="vsvg-txt" x="${info.x}" y="${info.y}">${esc(info.val)}</text></g>`;
    });
    return `<div class="viz"><div class="vsvg-wrap"><svg viewBox="0 0 240 ${h}" width="240" height="${h}">${edgesSvg}${nodesSvg}</svg></div></div>`;
  }
  function vizGraph(d) {
    if (!d || !d.nodes || !d.nodes.length) return null;
    const byId = /* @__PURE__ */ new Map();
    d.nodes.forEach((n, idx) => byId.set(n.id ?? idx, n));
    let edgesSvg = "", nodesSvg = "";
    (d.edges || []).forEach((e) => {
      const e0 = Array.isArray(e) ? e[0] : e.from ?? 0;
      const e1 = Array.isArray(e) ? e[1] : e.to ?? 0;
      const a = byId.get(e0), b = byId.get(e1);
      if (a && b) {
        edgesSvg += `<line class="vsvg-edge" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`;
      }
    });
    d.nodes.forEach((n, idx) => {
      const id = n.id ?? idx;
      const cls = d.hot === id ? "vsvg-node hot" : "vsvg-node";
      nodesSvg += `<g><circle class="${cls}" cx="${n.x}" cy="${n.y}" r="13"/><text class="vsvg-txt" x="${n.x}" y="${n.y}">${esc(n.label ?? id)}</text></g>`;
    });
    return `<div class="viz"><div class="vsvg-wrap"><svg viewBox="0 0 180 136" width="180" height="136">${edgesSvg}${nodesSvg}</svg></div></div>`;
  }
  function vizInterface(d) {
    if (!d) return null;
    const fields = d.fields || (d.entries ? d.entries.map((e) => ({ k: String(e.k), v: e.v, declaredType: typeof e.v })) : []);
    if (!fields.length && !d.isClass) return null;
    const ifaceTitle = d.interfaceName && d.interfaceName !== "object" ? d.interfaceName : "Object";
    const kwTxt = d.isClass ? "class" : "interface";
    const badgeTxt = d.isSchema ? d.instanceName ? `schema \xB7 \u7ED1\u5B9A ${d.instanceName}` : "schema" : "instance";
    const rows = fields.length ? fields.slice(0, 12).map((f) => {
      const isHot = d.hot === f.k;
      const hasVal = f.v !== void 0;
      const isStr = typeof f.v === "string";
      const valDisplay = hasVal ? isStr ? JSON.stringify(f.v) : f.v !== null && typeof f.v === "object" ? safeJSONStringify(f.v) : String(f.v) : "\u672A\u5B9E\u4F8B\u5316";
      return '<div class="viface-row' + (isHot ? " hot" : "") + '"><span class="viface-k">' + esc(f.k) + (f.optional ? '<span class="viface-opt">?</span>' : "") + "</span>" + (f.declaredType ? '<span class="viface-t">: ' + esc(f.declaredType) + "</span>" : "") + (hasVal ? '<span class="viface-eq">=</span><span class="viface-v' + (isStr ? " str" : "") + '">' + esc(valDisplay) + "</span>" : '<span class="viface-v schema-only">' + esc(valDisplay) + "</span>") + "</div>";
    }).join("") : '<div class="viface-row"><span class="viface-v schema-only">\uFF08\u65E0\u5B9E\u4F8B\u5C5E\u6027\uFF09</span></div>';
    return '<div class="viz"><div class="viface"><div class="viface-head"><span class="viface-kw">' + kwTxt + '</span><span class="viface-title">' + esc(ifaceTitle) + '</span><span class="viface-badge">' + esc(badgeTxt) + '</span></div><div class="viface-body">' + rows + "</div></div></div>";
  }
  function vizEventLoop(d) {
    if (!d) return null;
    const phaseMap = {
      sync: { label: "Sync \xB7 \u540C\u6B65\u6808\u6267\u884C", cls: "sync" },
      await_suspend: { label: "Await \xB7 \u534F\u7A0B\u6302\u8D77", cls: "suspend" },
      await_resume: { label: "Await \xB7 \u534F\u7A0B\u6062\u590D", cls: "resume" },
      microtask: { label: "Microtask \xB7 \u5FAE\u4EFB\u52A1\u51FA\u961F", cls: "micro" },
      macrotask: { label: "Macrotask \xB7 \u5B8F\u4EFB\u52A1\u89E6\u53D1", cls: "macro" }
    };
    const ph = (d.phase ? phaseMap[d.phase] : void 0) || { label: d.phase || "Event Loop", cls: "sync" };
    const nowMs = typeof d.now === "number" ? d.now : 0;
    const coroutines = Array.isArray(d.coroutines) ? d.coroutines : [];
    const coroHtml = coroutines.length ? coroutines.map((c) => {
      const stCls = c.status === "running" ? "running" : c.status === "suspended" ? "suspended" : "completed";
      const stLabel = c.status === "running" ? "\u25CF \u6267\u884C\u4E2D" : c.status === "suspended" ? `\u23F8 \u6302\u8D77 @L${c.line}` : "\u2713 \u5B8C\u6210";
      const detail = c.status === "suspended" && c.awaitingExpr ? `<span class="vel-coro-expr">await ${esc(c.awaitingExpr)}</span>` : c.status === "completed" && c.returnVal !== void 0 ? `<span class="vel-coro-expr">\u21D2 ${esc(c.returnVal)}</span>` : "";
      return `<div class="vel-chip coro-${stCls}"><span class="vel-chip-title">async ${esc(c.name)}()</span><span class="vel-chip-status">${esc(stLabel)}</span>` + detail + `</div>`;
    }).join("") : '<span class="vel-empty">\u65E0\u6D3B\u8DC3\u534F\u7A0B</span>';
    const microtasks = Array.isArray(d.microtasks) ? d.microtasks : [];
    const microHtml = microtasks.length ? microtasks.map(
      (m, idx) => `<div class="vel-qitem micro${idx === 0 ? " head" : ""}"><span class="vel-qidx">#${idx + 1}</span><span class="vel-qlabel">${esc(m.label)}</span>` + ((m.line ?? 0) > 0 ? `<span class="vel-qmeta">@L${m.line}</span>` : "") + `</div>`
    ).join("") : '<span class="vel-empty">\u961F\u5217\u4E3A\u7A7A (0)</span>';
    const macrotasks = Array.isArray(d.macrotasks) ? d.macrotasks : [];
    const macroHtml = macrotasks.length ? macrotasks.map(
      (t, idx) => `<div class="vel-qitem macro${idx === 0 ? " head" : ""}"><span class="vel-qidx">t=${t.due}ms</span><span class="vel-qlabel">${esc(t.label)}</span><span class="vel-qmeta">+${t.delay}ms</span></div>`
    ).join("") : '<span class="vel-empty">\u65E0\u5F85\u89E6\u53D1\u5B9A\u65F6\u5668 (0)</span>';
    const promises = Array.isArray(d.promises) ? d.promises : [];
    const promHtml = promises.length ? promises.map((p) => {
      const st = p.state || "pending";
      const icon = st === "fulfilled" ? "\u2713" : st === "rejected" ? "\u2717" : "\u23F3";
      const reactions = p.reactions ?? 0;
      const valPart = st === "pending" ? reactions > 0 ? `<span class="vel-pval dim">${reactions} waiter${reactions > 1 ? "s" : ""}</span>` : '<span class="vel-pval dim">pending</span>' : `<span class="vel-pval">${esc(p.value)}</span>`;
      return `<div class="vel-pcard ${esc(st)}"><span class="vel-phead"><span class="vel-picon">${icon}</span><span class="vel-pname">P#${p.id} \xB7 ${esc(p.label)}</span></span>` + valPart + `</div>`;
    }).join("") : '<span class="vel-empty">\u6682\u65E0 Promise \u5B9E\u4F8B</span>';
    return `<div class="viz"><div class="veventloop"><div class="vel-header"><span class="vel-phase ${ph.cls}">${esc(ph.label)}</span>` + (d.activeTask ? `<span class="vel-active">${esc(d.activeTask)}</span>` : "") + `<span class="vel-clock">\u23F1 \u865A\u62DF\u65F6\u949F ${nowMs}ms</span></div><div class="vel-grid"><div class="vel-lane"><div class="vel-lane-title">Async \u534F\u7A0B\u72B6\u6001</div><div class="vel-lane-body">` + coroHtml + '</div></div><div class="vel-lane"><div class="vel-lane-title">Microtask \u5FAE\u4EFB\u52A1\u961F\u5217 (FIFO)</div><div class="vel-lane-body">' + microHtml + '</div></div><div class="vel-lane"><div class="vel-lane-title">Macrotask \u5B8F\u4EFB\u52A1 / \u5B9A\u65F6\u5668</div><div class="vel-lane-body">' + macroHtml + '</div></div><div class="vel-lane"><div class="vel-lane-title">Promise \u72B6\u6001\u8868</div><div class="vel-lane-body vel-pgrid">' + promHtml + "</div></div></div></div></div>";
  }
  Object.assign(VIZ, {
    array: vizArray,
    map: vizMap,
    set: vizSet,
    stack: vizStack,
    string: vizString,
    grid: vizGrid,
    list: vizList,
    heap: vizHeap,
    queue: vizQueue,
    tree: vizTree,
    graph: vizGraph,
    uf: vizUF,
    interface: vizInterface,
    object: vizInterface,
    eventloop: vizEventLoop
  });
  function renderPicker() {
    const vars = discoverVars();
    if (!vars.length) {
      pickEl.innerHTML = '<span class="vempty">\u65E0\u7ED3\u6784\u53D8\u91CF</span>';
      renderSlots();
      return;
    }
    pickEl.innerHTML = vars.map(
      (s) => '<div class="chip-pick' + (appState.watched.has(s.id) ? " on" : "") + '" data-id="' + esc(s.id) + '">' + esc(s.name) + "</div>"
    ).join("");
    renderSlots();
  }
  function renderSlots() {
    const stepAtCur = appState.TRACE.steps[appState.cur];
    const st = stepAtCur || {};
    const activeFrame = stepAtCur ? getActiveFrame(stepAtCur) : null;
    const ds = Object.assign({}, activeFrame && activeFrame.ds || st.ds || {});
    if (st.ds && st.ds.eventLoop && !ds.eventLoop) ds.eventLoop = st.ds.eventLoop;
    const vars = discoverVars().filter((s) => appState.watched.has(s.id) && ds[s.id] !== void 0);
    if (slotsEl && slotsEl.classList && slotsEl.classList.toggle) {
      slotsEl.classList.toggle("single-col", slotsEl.clientWidth > 0 && slotsEl.clientWidth < 420);
    }
    if (!vars.length) {
      slotsEl.innerHTML = '<div class="slot" style="grid-column:1/-1"><div class="vempty">' + (appState.TRACE.steps.length ? "\u70B9\u9009\u53D8\u91CF\u4EE5\u5173\u6CE8\uFF08\u6216\u672C\u6B65\u6682\u65E0\u7ED3\u6784\uFF09" : "\u751F\u6210\u8F68\u8FF9\u540E\u663E\u793A\u7ED3\u6784\u53EF\u89C6\u5316") + "</div></div>";
      return;
    }
    const allocated = allocateSlotSpans(vars, ds);
    slotsEl.innerHTML = allocated.map(({ s, d, kind, span }) => {
      const fn = VIZ[kind];
      const body = d ? fn ? fn(d) || '<div class="vempty">empty</div>' : '<div class="vempty">\u2026</div>' : '<div class="vempty">empty</div>';
      const winTag = d && d.win ? `<span class="win-tag">[${d.win[0]}..${d.win[1]}]</span>` : "";
      let sizeTag = "";
      if (d) {
        if (kind === "grid" && ((d.totalRows || 0) > 10 || (d.totalCols || 0) > 10)) {
          sizeTag = `<span class="size-tag">${d.totalRows}\xD7${d.totalCols}</span>`;
        } else if (typeof d.total === "number" && d.total > 20) {
          sizeTag = `<span class="size-tag">\u5171 ${d.total} \u9879</span>`;
        }
      }
      const isHotSlot = d && (d.hot !== void 0 || d.mark != null);
      const kindPrefix = d && d.isClass ? "class" : "interface";
      const kindBadge = kind === "interface" && d && d.interfaceName && d.interfaceName !== "object" && !d.isSchema ? `${kindPrefix} \xB7 ${d.interfaceName}` : kind === "interface" && d && d.isClass ? "class" : kind;
      return '<div class="slot' + (span === 2 ? " span-2" : "") + (isHotSlot ? " pulse" : "") + '" data-var="' + esc(s.name) + '"><div class="name"><span>' + esc(s.name) + '</span><span class="kind">' + esc(kindBadge) + "</span>" + sizeTag + winTag + "</div>" + body + "</div>";
    }).join("");
  }
  function updateControlButtons() {
    const prevBtn = $("prev");
    const nextBtn = $("next");
    const ckptBtn = $("nextCheckpoint");
    const autoBtn = $("auto");
    const atEnd = Boolean(appState.TRACE.steps.length > 0 && appState.cur >= appState.TRACE.steps.length - 1 && appState.DEBUG_SESSION.finished);
    if (prevBtn) prevBtn.disabled = !appState.TRACE.steps.length || appState.cur <= 0;
    if (nextBtn) nextBtn.disabled = atEnd;
    if (ckptBtn) ckptBtn.disabled = atEnd;
    if (autoBtn) autoBtn.disabled = atEnd;
  }
  function renderStatic(i, withAnim = false) {
    hideHoverTip();
    const st = appState.TRACE.steps[i];
    const prevSt = i > 0 ? appState.TRACE.steps[i - 1] : null;
    if (!st) {
      renderCallStack(null);
      varsEl.innerHTML = "";
      consoleEl.innerHTML = '<div><span class="p">\u203A</span><span class="dim">\u5F00\u542F Debug \u6A21\u5F0F\u540E\u5F53\u573A\u8BA1\u7B97\u5E76\u663E\u793A\u6BCF\u6B65\u6267\u884C\u8BE6\u60C5</span></div>';
      cntEl.textContent = "\u672A\u5728\u8C03\u8BD5";
      cntEl.className = "";
      updateControlButtons();
      renderSlots();
      updateEditorChrome();
      return;
    }
    renderCallStack(st);
    const activeFrame = getActiveFrame(st);
    const v = activeFrame && activeFrame.v || st.v || {};
    const prevV = prevSt && prevSt.v || {};
    const primEntries = Object.keys(v).map((k) => {
      const val = v[k];
      if (val !== null && typeof val === "object") return "";
      const changed = Boolean(activeFrame && activeFrame.isTop && prevSt && prevV[k] !== val);
      return '<div class="pair' + (changed ? " changed" : "") + '" data-var="' + esc(k) + '"><span class="k">' + esc(k) + '</span><span class="v">' + esc(val) + "</span></div>";
    }).join("");
    if (primEntries) {
      varsEl.innerHTML = primEntries;
    } else if (activeFrame && activeFrame.fn === "global") {
      varsEl.innerHTML = '<div class="pair"><span class="k">scope</span><span class="v">global</span></div>' + (appState.DEBUG_SESSION.callExpr && appState.DEBUG_SESSION.callExpr !== "undefined" ? '<div class="pair"><span class="k">entry</span><span class="v">' + esc(appState.DEBUG_SESSION.callExpr) + "</span></div>" : "");
    } else {
      varsEl.innerHTML = '<div class="vempty">\uFF08\u672C\u5E27\u65E0\u539F\u59CB\u7C7B\u578B\u5C40\u90E8\u53D8\u91CF\uFF09</div>';
    }
    let animDesc = "";
    if (st.error) {
      animDesc = `<div class="anim-desc" style="color:var(--red)">runtime error \xB7 \u5DF2\u505C\u6B62\u5728\u62A5\u9519\u884C (\u7B2C ${st.line} \u884C)</div>`;
    } else if (st.anim) {
      if (st.anim.type === "assign") animDesc = `<div class="anim-desc">assign \xB7 ${esc(st.anim.from)} \u2192 ${esc(st.anim.to)} = ${esc(st.anim.val)}</div>`;
      else if (st.anim.type === "compare") animDesc = `<div class="anim-desc">compare \xB7 ${esc(st.anim.lhs)} ${esc(st.anim.op)} ${esc(st.anim.rhs)} \u21D2 ${esc(st.anim.result)}</div>`;
      else if (st.anim.type === "call") animDesc = `<div class="anim-desc">call \xB7 ${esc(st.anim.fn)}(${esc((st.anim.argVals || []).join(", "))})</div>`;
      else if (st.anim.type === "checkpoint") animDesc = `<div class="anim-desc" style="color:var(--cyan)">checkpoint \xB7 \u68C0\u67E5\u70B9\u5DF2\u547D\u4E2D (${esc((st.anim.argVals || []).join(", ") || "\u65E0\u53C2\u6570")})</div>`;
    }
    consoleEl.innerHTML = '<div><span class="p">\u203A</span>' + esc(st.note || "") + "</div>" + animDesc;
    if (st.error) {
      cntEl.textContent = "\u2717 \u8FD0\u884C\u65F6\u62A5\u9519";
      cntEl.className = "err";
    } else if (st.isCheckpoint) {
      cntEl.textContent = "\u25C9 \u547D\u4E2D\u68C0\u67E5\u70B9";
      cntEl.className = "ckpt";
    } else if (appState.DEBUG_SESSION.finished && i === appState.TRACE.steps.length - 1) {
      cntEl.textContent = "\u2713 \u6267\u884C\u5B8C\u6BD5";
      cntEl.className = "done";
    } else {
      cntEl.textContent = "\u25CF \u8C03\u8BD5\u8FD0\u884C\u4E2D";
      cntEl.className = "running";
    }
    updateControlButtons();
    updateEditorChrome();
    if (appState.VIEW_MODE === "notebook" && typeof globalThis.renderNotebookUI === "function") {
      globalThis.renderNotebookUI(false);
    } else {
      scrollCodeTo(activeFrame ? activeFrame.line : st.line);
    }
    renderSlots();
    if (withAnim && appState.VIEW_MODE !== "notebook") {
      playStepAnimation(st);
    }
  }
  var renderMemory = renderSlots;
  var renderAsyncQueues = vizEventLoop;
  function drawArrows() {
  }
  function scheduleArrowRedraw() {
  }
  registerUiHooks({ renderPicker, renderStatic });

  // src/ui/controls.ts
  var controls_exports = {};
  __export(controls_exports, {
    addCheckpointFunction: () => addCheckpointFunction,
    blurEditor: () => blurEditor,
    btnExportMenu: () => btnExportMenu,
    btnExportVideo: () => btnExportVideo,
    btnExportVideoLabel: () => btnExportVideoLabel,
    exportFileName: () => exportFileName,
    exportMenuWrap: () => exportMenuWrap,
    go: () => go,
    isEditorFocused: () => isEditorFocused,
    loadImportedSource: () => loadImportedSource,
    onSourceChanged: () => onSourceChanged,
    rebuildDebugAtPosition: () => rebuildDebugAtPosition,
    recordEditorCursorLine: () => recordEditorCursorLine,
    renderStep: () => renderStep,
    runToNextCheckpoint: () => runToNextCheckpoint,
    sanitizeFileName: () => sanitizeFileName,
    scheduleRebuild: () => scheduleRebuild,
    setFileName: () => setFileName,
    setStatus: () => setStatus,
    setVideoExportSpeed: () => setVideoExportSpeed,
    staleTimer: () => staleTimer,
    stepBack: () => stepBack,
    stepForward: () => stepForward,
    stepNext: () => stepNext,
    stepPrev: () => stepPrev,
    stopAuto: () => stopAuto,
    togglePlay: () => togglePlay,
    videoExportStatus: () => videoExportStatus,
    videoSpeedBadge: () => videoSpeedBadge,
    videoSpeedGroup: () => videoSpeedGroup
  });
  function stepPrev() {
    stopAuto();
    if (!appState.TRACE.steps.length || appState.cur <= 0) return;
    appState.SELECTED_FRAME_IDX = null;
    if (document.body && document.body.classList) document.body.classList.remove("editing-code");
    if (isEditorFocused()) blurEditor();
    appState.cur--;
    renderPicker();
    renderStatic(appState.cur, true);
  }
  function stepNext(fromAuto = false) {
    if (!fromAuto) stopAuto();
    appState.SELECTED_FRAME_IDX = null;
    if (document.body && document.body.classList) document.body.classList.remove("editing-code");
    if (isEditorFocused()) blurEditor();
    if (!appState.DEBUG_SESSION.active) {
      startDebug(0);
      return;
    }
    if (appState.cur < appState.TRACE.steps.length - 1) {
      appState.cur++;
      renderPicker();
      renderStatic(appState.cur, true);
      return;
    }
    if (appState.DEBUG_SESSION.finished) return;
    const ok = computeAndAppendNextStep();
    if (ok) {
      appState.cur = appState.TRACE.steps.length - 1;
      renderPicker();
      renderStatic(appState.cur, true);
    } else {
      renderStatic(appState.cur, false);
    }
  }
  function runToNextCheckpoint() {
    if (appState.LANG === "python") return PY_ENGINE.runToNextCheckpoint();
    stopAuto();
    appState.SELECTED_FRAME_IDX = null;
    if (document.body && document.body.classList) document.body.classList.remove("editing-code");
    if (isEditorFocused()) blurEditor();
    if (!appState.DEBUG_SESSION.active) {
      if (!startDebug(0)) return;
      const firstSt = appState.TRACE.steps[0];
      if (firstSt && (firstSt.isCheckpoint || firstSt.error || appState.DEBUG_SESSION.finished)) {
        if (firstSt.isCheckpoint) {
          say("\u25C9 \u5DF2\u5230\u8FBE\u68C0\u67E5\u70B9 [\u7B2C " + firstSt.line + " \u884C] \xB7 " + (firstSt.note || ""), "ok");
        }
        return;
      }
    }
    if (appState.cur >= appState.TRACE.steps.length - 1 && appState.DEBUG_SESSION.finished) {
      return;
    }
    let safety = 0;
    while (safety++ < MAX_STEPS) {
      if (appState.cur < appState.TRACE.steps.length - 1) {
        appState.cur++;
        const st = appState.TRACE.steps[appState.cur];
        if (st && (st.isCheckpoint || st.error || appState.cur === appState.TRACE.steps.length - 1 && appState.DEBUG_SESSION.finished)) {
          break;
        }
      } else {
        if (appState.DEBUG_SESSION.finished) break;
        const added = computeAndAppendNextStep({ silent: true });
        if (!added) break;
        appState.cur = appState.TRACE.steps.length - 1;
        const st = appState.TRACE.steps[appState.cur];
        if (st && (st.isCheckpoint || st.error || appState.DEBUG_SESSION.finished)) {
          break;
        }
      }
    }
    renderPicker();
    renderStatic(appState.cur, true);
    const finalSt = appState.TRACE.steps[appState.cur];
    if (finalSt && finalSt.error) {
    } else if (finalSt && finalSt.isCheckpoint) {
      say("\u25C9 \u5DF2\u8FD0\u884C\u5230\u68C0\u67E5\u70B9 [\u7B2C " + finalSt.line + " \u884C] \xB7 " + (finalSt.note || ""), "ok");
    } else if (appState.DEBUG_SESSION.finished) {
      say("\u2713 \u5DF2\u8FD0\u884C\u81F3\u7A0B\u5E8F\u7ED3\u675F\uFF08\u540E\u7EED\u65E0\u66F4\u591A\u68C0\u67E5\u70B9\uFF09  \u2192  " + safeJSONStringify(appState.DEBUG_SESSION.returnValue), "ok");
    }
  }
  function rebuildDebugAtPosition(newTargetLine, targetVisits, fallbackStepIdx) {
    const src = editor.value.replace(/\r/g, "");
    const unsupported = detectUnsupportedSyntax(src);
    if (unsupported.length) {
      unsupported.forEach((x) => say("\u2717 \u7B2C " + x.line + " \u884C\uFF1A\u6682\u4E0D\u652F\u6301 " + x.feature + " \u2014\u2014 " + x.hint, "err", x.line));
      return false;
    }
    extractTsInterfaceMetadata(src);
    const diags = typecheckTS(src, appState.STRICT_TS);
    if (diags.length > 0) {
      reportTypeErrors(diags);
      return false;
    }
    if (appState.TYPE_ERROR_LINES.size || appState.RUNTIME_ERROR_LINES.size) {
      appState.TYPE_ERROR_LINES.clear();
      appState.RUNTIME_ERROR_LINES.clear();
    }
    const originalLines = src.split("\n");
    const enums = transpileEnums(src);
    if (enums.error) {
      say("\u2717 \u7B2C " + enums.error.line + " \u884C\uFF1A" + enums.error.message, "err", enums.error.line);
      return false;
    }
    const js0 = stripTypes(enums.code);
    const entry = resolveEntry(src, js0);
    const expr = stripTypes(entry.expr || "undefined");
    appState.ENTRY_CALL_LINE = entry.line || 0;
    const jsBody = entry.index >= 0 ? blankJsLine(js0, entry.index) : js0;
    let compiledFn;
    try {
      const names = collectNames(jsBody);
      const js = instrument(jsBody, originalLines, names);
      const finHook = '\n;try{if(typeof __t==="function"&&__t.__fin)__t.__fin(' + snapFnExpr(names) + ");}catch(_){}\n";
      const body = js + finHook + ";return (" + expr + ");";
      compiledFn = new Function("__t", "console", body);
    } catch (e) {
      say("\u2717 \u7F16\u8BD1\u5931\u8D25: " + (e instanceof Error && e.message ? e.message : e), "err");
      return false;
    }
    stopAuto();
    clearFlyLayer();
    const prevWatched = new Set(appState.watched);
    appState.TRACE = {
      title: "TypeScript Playground \xB7 Debug",
      code: originalLines,
      steps: []
    };
    appState.DEBUG_SESSION = {
      active: true,
      finished: false,
      crashed: false,
      error: null,
      errorLine: -1,
      returnValue: void 0,
      compiledFn,
      originalLines,
      callExpr: expr
    };
    appState.cur = 0;
    let visitsSeen = 0;
    let safety = 0;
    while (safety++ < MAX_STEPS) {
      const ok = computeAndAppendNextStep({ silent: true });
      if (!ok) break;
      const latest = appState.TRACE.steps[appState.TRACE.steps.length - 1];
      if (newTargetLine >= 1 && targetVisits >= 1) {
        if (latest && latest.line === newTargetLine) {
          visitsSeen++;
          if (visitsSeen >= targetVisits) break;
        }
      } else if (appState.TRACE.steps.length - 1 >= fallbackStepIdx) {
        break;
      }
      if (appState.DEBUG_SESSION.finished) break;
    }
    appState.cur = Math.max(0, appState.TRACE.steps.length - 1);
    if (prevWatched.size > 0) {
      appState.watched = prevWatched;
      discoverVars().forEach((s) => appState.watched.add(s.id));
    } else {
      initWatchedVars();
    }
    renderPicker();
    renderStatic(appState.cur, false);
    return true;
  }
  function addCheckpointFunction(preferredLine) {
    if (appState.LANG === "python") {
      const text2 = editor.value.replace(/\r\n?/g, "\n");
      const lines2 = text2.split("\n");
      let line = preferredLine || appState.TRACE.steps[appState.cur]?.line || (window.__CM_CURSOR_LINE || appState.lastEditorCursorLine) || lines2.length;
      line = Math.max(1, Math.min(lines2.length, line));
      const current = lines2[line - 1] || "";
      const indent2 = (current.match(/^\s*/) || [""])[0];
      if (/:\s*(?:#.*)?$/.test(current)) {
        lines2.splice(line, 0, indent2 + "    checkpoint()");
        line = line + 1;
      } else {
        lines2.splice(line - 1, 0, indent2 + "checkpoint()");
      }
      editor.value = lines2.join("\n");
      appState.lastEditorCursorLine = line;
      resetTraceState();
      PY_ENGINE.start(0);
      say("\u2713 \u5DF2\u63D2\u5165 checkpoint()\uFF0C\u6B63\u5728\u91CD\u65B0\u5F55\u5236 Python \u6267\u884C\u6B65\u9AA4", "ok");
      return;
    }
    const text = editor.value.replace(/\r\n?/g, "\n");
    const lines = text.split("\n");
    const curStep = appState.TRACE.steps[appState.cur];
    const wasActive = Boolean(appState.DEBUG_SESSION.active && appState.TRACE.steps.length > 0 && curStep);
    const origCurLine = curStep ? curStep.line : -1;
    const origLineVisits = wasActive ? appState.TRACE.steps.slice(0, appState.cur + 1).filter((s) => s.line === origCurLine).length : 0;
    const prevCurIdx = appState.cur;
    let fnOpenIdx = -1;
    let fnCloseIdx = lines.length - 1;
    let depth = 0;
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i] || "";
      if (fnOpenIdx < 0 && /^\s*(?:export\s+)?(?:default\s+)?function\b/.test(raw)) {
        fnOpenIdx = i;
      }
      if (fnOpenIdx >= 0) {
        for (let k = 0; k < raw.length; k++) {
          const ch = raw[k];
          if (ch === '"' || ch === "'" || ch === "`") {
            k = skipString(raw, k) - 1;
            continue;
          }
          if (ch === "/" && raw[k + 1] === "/") break;
          if (ch === "{") depth++;
          else if (ch === "}") {
            depth--;
            if (depth === 0) {
              fnCloseIdx = i;
              break;
            }
          }
        }
        if (depth === 0 && fnCloseIdx >= fnOpenIdx) break;
      }
    }
    let targetIdx;
    const cursorLine = window.__CM_CURSOR_LINE || appState.lastEditorCursorLine;
    if (typeof preferredLine === "number" && preferredLine >= 1 && preferredLine <= lines.length) {
      targetIdx = preferredLine - 1;
    } else if (cursorLine >= 1 && cursorLine <= lines.length) {
      targetIdx = cursorLine - 1;
    } else if (wasActive) {
      targetIdx = origCurLine - 1;
    } else {
      targetIdx = fnOpenIdx >= 0 ? fnOpenIdx + 1 : 0;
    }
    if (fnOpenIdx >= 0) {
      if (targetIdx <= fnOpenIdx) targetIdx = fnOpenIdx + 1;
      if (targetIdx >= fnCloseIdx) targetIdx = Math.max(fnOpenIdx + 1, fnCloseIdx);
    }
    const refLine = lines[targetIdx] || "";
    const refTrim = refLine.trim();
    if (typeof preferredLine === "number" && /^(?:checkpoint|断点)\s*\([^)]*\)\s*;?$/.test(refTrim)) {
      const removedLine = targetIdx + 1;
      lines.splice(targetIdx, 1);
      editor.value = lines.join("\n");
      if (staleTimer) clearTimeout(staleTimer);
      if (wasActive) {
        const newTargetLine = origCurLine > removedLine ? origCurLine - 1 : origCurLine === removedLine ? -1 : origCurLine;
        rebuildDebugAtPosition(newTargetLine, origLineVisits, Math.max(0, prevCurIdx - 1));
      } else {
        startDebug(0);
      }
      const keepLine = Math.max(1, Math.min(lines.length, Math.min(removedLine, lines.length)));
      scrollCodeTo(keepLine);
      say("\xB7 \u5DF2\u79FB\u9664\u7B2C " + removedLine + " \u884C\u7684 checkpoint() \u68C0\u67E5\u70B9\u51FD\u6570\uFF08\u4FDD\u6301\u5F53\u524D\u8C03\u8BD5\u8FDB\u5EA6\uFF09", "dim");
      return;
    }
    let insertIdx = targetIdx;
    let indent = (refLine.match(/^\s*/) || ["  "])[0] || "  ";
    if (refTrim.endsWith("{")) {
      insertIdx = targetIdx + 1;
      indent = indent + "  ";
    }
    const insertedLineNum = insertIdx + 1;
    lines.splice(insertIdx, 0, indent + "checkpoint();");
    editor.value = lines.join("\n");
    appState.lastEditorCursorLine = insertedLineNum;
    if (staleTimer) clearTimeout(staleTimer);
    if (wasActive) {
      const newTargetLine = origCurLine >= insertedLineNum ? origCurLine + 1 : origCurLine;
      rebuildDebugAtPosition(newTargetLine, origLineVisits, prevCurIdx);
    } else {
      startDebug(0);
    }
    scrollCodeTo(insertedLineNum);
    say("\u2713 \u5DF2\u5728\u7B2C " + insertedLineNum + " \u884C\u6DFB\u52A0\u68C0\u67E5\u70B9\u51FD\u6570 checkpoint()\uFF08\u4FDD\u6301\u5F53\u524D\u8C03\u8BD5\u4F4D\u7F6E\uFF0C\u70B9\u51FB\u5DE6\u4E0B\u300C\u23ED \u8FD0\u884C\u5230\u4E0B\u4E00\u4E2A\u68C0\u67E5\u70B9\u300D\u5373\u53EF\u8FD0\u884C\u81F3\u68C0\u67E5\u70B9\uFF09", "ok");
  }
  function go(i) {
    if (i > appState.cur) stepNext();
    else if (i < appState.cur) stepPrev();
  }
  function stopAuto() {
    if (appState.timer) {
      clearInterval(appState.timer);
      appState.timer = null;
      $("auto").textContent = "\u25B6 \u81EA\u52A8";
    }
  }
  $("prev").onclick = () => stepPrev();
  $("next").onclick = () => stepNext();
  if ($("nextCheckpoint")) {
    $("nextCheckpoint").onclick = () => runToNextCheckpoint();
  }
  if ($("btnAddCheckpoint")) {
    $("btnAddCheckpoint").onclick = () => addCheckpointFunction();
  }
  if (gutterEl) {
    gutterEl.addEventListener("click", (e) => {
      const g = closestElement(e, ".gline");
      if (!g || !g.dataset.line) return;
      addCheckpointFunction(parseInt(g.dataset.line, 10));
    });
  }
  $("auto").onclick = async () => {
    if (appState.timer) {
      stopAuto();
      return;
    }
    if (!appState.DEBUG_SESSION.active || appState.cur >= appState.TRACE.steps.length - 1 && appState.DEBUG_SESSION.finished) {
      const ok = await Promise.resolve(startDebug(0));
      if (!ok) return;
    }
    if (appState.cur >= appState.TRACE.steps.length - 1 && appState.DEBUG_SESSION.finished) return;
    $("auto").textContent = "\u23F8 \u6682\u505C";
    appState.timer = setInterval(() => {
      if (appState.cur >= appState.TRACE.steps.length - 1 && appState.DEBUG_SESSION.finished) {
        stopAuto();
        return;
      }
      stepNext(true);
      const st = appState.TRACE.steps[appState.cur];
      if (!st || st.error || appState.cur >= appState.TRACE.steps.length - 1 && appState.DEBUG_SESSION.finished) {
        stopAuto();
      }
    }, AUTO_PLAY_MS);
  };
  $("btnRun").onclick = () => {
    stopAuto();
    if (appState.VIEW_MODE === "notebook" && typeof globalThis.runNotebookCell === "function") {
      globalThis.runNotebookCell(void 0, true);
      return;
    }
    runOnce();
  };
  $("btnTrace").onclick = () => {
    stopAuto();
    if (document.body && document.body.classList) document.body.classList.remove("editing-code");
    if (appState.VIEW_MODE === "notebook" && typeof globalThis.debugNotebookCell === "function") {
      globalThis.debugNotebookCell(void 0);
      return;
    }
    startDebug(0);
  };
  var exportMenuWrap = $("exportMenuWrap");
  var btnExportMenu = $("btnExportMenu");
  var videoSpeedGroup = $("videoSpeedGroup");
  var videoSpeedBadge = $("videoSpeedBadge");
  var btnExportVideo = $("btnExportVideo");
  var btnExportVideoLabel = $("btnExportVideoLabel");
  var videoExportStatus = $("videoExportStatus");
  function setVideoExportSpeed(mult) {
    const num = Number(mult);
    if (!VIDEO_SPEED_OPTIONS.includes(num)) return appState.VIDEO_EXPORT_SPEED;
    appState.VIDEO_EXPORT_SPEED = num;
    if (videoSpeedGroup && videoSpeedGroup.querySelectorAll) {
      const btns = videoSpeedGroup.querySelectorAll(".speed-opt");
      btns.forEach((b) => {
        if (b.classList) b.classList.toggle("active", Number(b.dataset.speed) === num);
      });
    }
    if (videoSpeedBadge) {
      videoSpeedBadge.textContent = num + "x \xB7 60fps";
    }
    return appState.VIDEO_EXPORT_SPEED;
  }
  if (btnExportMenu && exportMenuWrap) {
    btnExportMenu.onclick = (e) => {
      e.stopPropagation();
      if (exportMenuWrap.classList) exportMenuWrap.classList.toggle("open");
    };
    addEventListener("click", (e) => {
      if (!exportMenuWrap.classList || !exportMenuWrap.classList.contains("open")) return;
      if (exportMenuWrap.contains && exportMenuWrap.contains(eventTargetNode(e))) return;
      exportMenuWrap.classList.remove("open");
    });
  }
  if (videoSpeedGroup) {
    videoSpeedGroup.addEventListener("click", (e) => {
      const btn = closestElement(e, ".speed-opt");
      if (!btn || !btn.dataset.speed) return;
      e.stopPropagation();
      setVideoExportSpeed(parseFloat(btn.dataset.speed));
    });
  }
  function sanitizeFileName(name) {
    const cleaned = String(name == null ? "" : name).replace(/[\\/:*?"<>|\u0000-\u001f]/g, "").replace(/\s+/g, " ").trim().replace(/[.\s]+$/, "");
    return cleaned || (appState.LANG === "python" ? "playground.py" : "playground.ts");
  }
  function exportFileName() {
    const fallback = appState.LANG === "python" ? "playground.py" : "playground.ts";
    const name = appState.FILE_NAME || fallback;
    const ext = appState.LANG === "python" ? ".py" : ".ts";
    return /\.[A-Za-z0-9]{1,12}$/.test(name) ? name : name + ext;
  }
  function setFileName(name) {
    appState.FILE_NAME = sanitizeFileName(name);
    if (fileNameEl && fileNameEl.value !== appState.FILE_NAME) fileNameEl.value = appState.FILE_NAME;
    const tag = $("fileExportTag");
    if (tag) tag.textContent = exportFileName();
    if (typeof globalThis.syncActiveScriptTabFromFileName === "function") {
      try {
        globalThis.syncActiveScriptTabFromFileName(appState.FILE_NAME);
      } catch (_) {
      }
    }
  }
  function loadImportedSource(text, name) {
    const src = String(text == null ? "" : text).replace(/\r\n?/g, "\n");
    if (name && /\.ipynb$/i.test(name) && typeof globalThis.importNotebookFromJson === "function") {
      if (globalThis.importNotebookFromJson(src, name)) return;
    }
    if (appState.VIEW_MODE === "notebook" && typeof globalThis.setViewMode === "function") {
      globalThis.setViewMode("script");
    }
    editor.value = src;
    setFileName(name || (appState.LANG === "python" ? "imported.py" : "imported.ts"));
    if (typeof globalThis.syncActiveScriptTabSource === "function") {
      try {
        globalThis.syncActiveScriptTabSource(src);
      } catch (_) {
      }
    }
    appState.lastEditorCursorLine = -1;
    resetTraceState();
    updateEditorChrome();
    clearLog("\u2713 \u5DF2\u5BFC\u5165 " + appState.FILE_NAME + " \xB7 " + src.split("\n").length + " \u884C \xB7 \u70B9\u300C\u{1F41E} Debug \u8C03\u8BD5\u300D\u6216\u300C\u25B6 \u8FD0\u884C\u300D\u5F00\u59CB");
  }
  if (btnImportEl && fileInputEl) {
    if (!$("importMenuWrap")) {
      btnImportEl.onclick = () => fileInputEl.click();
    }
    fileInputEl.addEventListener("change", () => {
      const file = fileInputEl.files && fileInputEl.files[0];
      fileInputEl.value = "";
      if (!file) return;
      const read = typeof file.text === "function" ? file.text() : Promise.reject(new Error("\u5F53\u524D\u6D4F\u89C8\u5668\u4E0D\u652F\u6301\u8BFB\u53D6\u8BE5\u6587\u4EF6"));
      Promise.resolve(read).then((text) => loadImportedSource(text, file.name)).catch((e) => say("\u2717 \u5BFC\u5165\u5931\u8D25: " + (e && e.message ? e.message : e), "err"));
    });
  }
  if (fileNameEl) {
    const commitName = () => setFileName(fileNameEl.value);
    fileNameEl.addEventListener("change", commitName);
    fileNameEl.addEventListener("blur", commitName);
    fileNameEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commitName();
        fileNameEl.blur();
      } else if (e.key === "Escape") {
        fileNameEl.value = appState.FILE_NAME;
        fileNameEl.blur();
      }
    });
  }
  setFileName(appState.FILE_NAME);
  if ($("btnExportTs")) {
    $("btnExportTs").onclick = () => {
      try {
        if (exportMenuWrap && exportMenuWrap.classList) exportMenuWrap.classList.remove("open");
        const name = exportFileName();
        const blob = new Blob([editor.value], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        say("\u2713 \u5DF2\u5BFC\u51FA\u6587\u4EF6 " + name + "\uFF08" + editor.value.split("\n").length + " \u884C\uFF09", "ok");
      } catch (e) {
        say("\u2717 \u5BFC\u51FA\u5931\u8D25: " + (e instanceof Error && e.message ? e.message : e), "err");
      }
    };
  }
  if ($("btnShareLink")) {
    $("btnShareLink").onclick = () => {
      if (exportMenuWrap && exportMenuWrap.classList) exportMenuWrap.classList.remove("open");
      const tag = $("shareLinkTag");
      if (tag) tag.textContent = "\u6682\u672A\u5B9E\u73B0";
      say("\u6682\u672A\u5B9E\u73B0", "dim");
    };
  }
  $("sampleSel").onchange = () => uiHooks.loadSample($("sampleSel").value);
  pickEl.addEventListener("click", (e) => {
    const el = closestElement(e, ".chip-pick");
    if (!el || !el.dataset.id) return;
    const id = el.dataset.id;
    if (appState.watched.has(id)) appState.watched.delete(id);
    else appState.watched.add(id);
    renderPicker();
  });
  if (callStackBarEl) {
    callStackBarEl.addEventListener("click", (e) => {
      const btn = closestElement(e, ".cs-crumb");
      if (!btn || btn.dataset.frameIdx === void 0) return;
      selectStackFrame(parseInt(btn.dataset.frameIdx, 10));
    });
  }
  (function initResizer() {
    if (!resizerEl || !mainEl || !sidePanelEl) return;
    let dragging = false;
    function applySideWidth(clientX) {
      const rect = mainEl.getBoundingClientRect();
      if (!rect.width) return;
      const minCodeW = 340;
      const minSideW = 280;
      const maxSideW = Math.max(minSideW, Math.min(rect.width - minCodeW, Math.round(rect.width * 0.65)));
      const desiredSideW = Math.round(rect.right - clientX);
      const clamped = Math.max(minSideW, Math.min(maxSideW, desiredSideW));
      sidePanelEl.style.width = clamped + "px";
      sidePanelEl.style.maxWidth = "none";
      if (slotsEl && slotsEl.classList) {
        slotsEl.classList.toggle("single-col", clamped < 440);
      }
      clearFlyLayer();
    }
    resizerEl.addEventListener("pointerdown", (e) => {
      dragging = true;
      resizerEl.classList.add("dragging");
      document.body.classList.add("resizing");
      if (resizerEl.setPointerCapture) {
        try {
          resizerEl.setPointerCapture(e.pointerId);
        } catch {
        }
      }
      e.preventDefault();
    });
    addEventListener("pointermove", (e) => {
      if (!dragging) return;
      applySideWidth(e.clientX);
    });
    function endDrag() {
      if (!dragging) return;
      dragging = false;
      resizerEl.classList.remove("dragging");
      document.body.classList.remove("resizing");
    }
    addEventListener("pointerup", endDrag);
    addEventListener("pointercancel", endDrag);
    resizerEl.addEventListener("dblclick", () => {
      sidePanelEl.style.width = "40%";
      sidePanelEl.style.maxWidth = "65%";
      clearFlyLayer();
    });
  })();
  function isEditorFocused() {
    try {
      if (window.PlaygroundCM && window.PlaygroundCM.hasFocus()) return true;
    } catch (_) {
    }
    return document.activeElement === editor;
  }
  function blurEditor() {
    try {
      if (window.PlaygroundCM && window.PlaygroundCM.hasFocus()) {
        window.PlaygroundCM.blur();
        return;
      }
    } catch (_) {
    }
    if (editor.blur) editor.blur();
  }
  function recordEditorCursorLine() {
    try {
      const pos = editor.selectionStart || 0;
      appState.lastEditorCursorLine = editor.value.slice(0, pos).split("\n").length;
    } catch {
    }
  }
  editor.addEventListener("click", recordEditorCursorLine);
  editor.addEventListener("keyup", recordEditorCursorLine);
  editor.addEventListener("focus", () => {
    recordEditorCursorLine();
    if (appState.TRACE.steps.length && document.body && document.body.classList) {
      document.body.classList.add("editing-code");
      clearFlyLayer();
    }
  });
  editor.addEventListener("blur", () => {
    if (document.body && document.body.classList) {
      document.body.classList.remove("editing-code");
    }
  });
  editor.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const s = editor.selectionStart, t = editor.selectionEnd;
      const indent = appState.LANG === "python" ? "    " : "  ";
      editor.value = editor.value.slice(0, s) + indent + editor.value.slice(t);
      editor.selectionStart = editor.selectionEnd = s + indent.length;
      onSourceChanged();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      stopAuto();
      if (e.shiftKey) {
        if (document.body && document.body.classList) document.body.classList.remove("editing-code");
        if (isEditorFocused()) blurEditor();
        startDebug(0);
      } else {
        runOnce();
      }
    }
  });
  var staleTimer = null;
  function onSourceChanged() {
    recordEditorCursorLine();
    appState.TYPE_ERROR_LINES.clear();
    appState.RUNTIME_ERROR_LINES.clear();
    if (appState.LANG === "python") appState.PY_DIAGS.length = 0;
    hideHoverTip();
    updateEditorChrome();
    if (appState.TRACE.steps.length || appState.DEBUG_SESSION.active) {
      if (staleTimer) clearTimeout(staleTimer);
      staleTimer = setTimeout(() => {
        resetTraceState();
        clearLog("\u6E90\u7801\u5DF2\u4FEE\u6539\uFF0C\u5F53\u524D\u8C03\u8BD5\u4F1A\u8BDD\u5DF2\u91CD\u7F6E \xB7 \u53EF\u70B9\u51FB\u300C\u{1F41E} Debug \u8C03\u8BD5\u300D\u6216\u5DE6\u4E0B\u300C\u8FD0\u884C\u5230\u4E0B\u4E00\u4E2A\u68C0\u67E5\u70B9\u300D\u91CD\u65B0\u5F00\u59CB");
      }, 300);
    }
  }
  editor.addEventListener("input", onSourceChanged);
  editor.addEventListener("scroll", () => {
    clearFlyLayer();
    hideHoverTip();
    syncScroll();
  });
  if (editor && editor.addEventListener) {
    editor.addEventListener("mousemove", (e) => {
      if (!appState.TRACE.steps.length || e && e.buttons) {
        hideHoverTip();
        return;
      }
      const hit = hoverHitFromEvent(e);
      const word = hit ? hoverWordAt(hit.text, hit.col) : null;
      if (!word) {
        hideHoverTip();
        return;
      }
      hoverTipForName(word.word, e.clientX, e.clientY);
    });
    editor.addEventListener("mouseleave", hideHoverTip);
    editor.addEventListener("mousedown", hideHoverTip);
  }
  if (sidePanelEl && sidePanelEl.addEventListener) {
    sidePanelEl.addEventListener("mousemove", (e) => {
      const card = closestElement(e, "[data-var]");
      if (!card || !card.getAttribute) {
        hideHoverTip();
        return;
      }
      hoverTipForName(card.getAttribute("data-var"), e.clientX, e.clientY);
    });
    sidePanelEl.addEventListener("mouseleave", hideHoverTip);
  }
  addEventListener("resize", () => positionStepViz());
  addEventListener("keydown", (e) => {
    if (isEditorFocused()) return;
    const target = eventTargetElement(e);
    if (e.key === "ArrowRight" || e.key === " ") {
      if (target && target.closest && target.closest("button,select,input,textarea")) return;
      e.preventDefault();
      stepNext();
    }
    if (e.key === "ArrowLeft") {
      if (target && target.closest && target.closest("button,select,input,textarea")) return;
      e.preventDefault();
      stepPrev();
    }
  });
  (function initCheckerInfo() {
    const badge = $("checkerBadge");
    const modal = $("checkerModal");
    const close = $("checkerModalClose");
    if (!badge || !modal) return;
    const open = () => {
      modal.hidden = false;
    };
    const hide = () => {
      modal.hidden = true;
    };
    badge.onclick = open;
    badge.onkeydown = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    };
    if (close) close.onclick = hide;
    if (modal.addEventListener) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) hide();
      });
    }
    if (document.addEventListener) {
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") hide();
      });
    }
  })();
  var stepForward = stepNext;
  var stepBack = stepPrev;
  var renderStep = renderStatic;
  var scheduleRebuild = onSourceChanged;
  function togglePlay() {
    const autoBtn = $("auto");
    if (autoBtn && typeof autoBtn.onclick === "function") Reflect.apply(autoBtn.onclick, autoBtn, []);
  }
  function setStatus(msg, cls) {
    say(msg, cls);
  }
  registerUiHooks({ stopAuto });

  // src/ui/share.ts
  var share_exports = {};
  __export(share_exports, {
    boot: () => boot,
    drawVizCardOnCanvas: () => drawVizCardOnCanvas,
    initApp: () => initApp,
    loadSample: () => loadSample,
    renderVideoFrameToCanvas: () => renderVideoFrameToCanvas,
    roundRectPath: () => roundRectPath,
    tokenizeCodeForCanvas: () => tokenizeCodeForCanvas
  });
  function roundRectPath(ctx, x, y, w, h, r) {
    const rad = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.lineTo(x + w - rad, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
    ctx.lineTo(x + w, y + h - rad);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
    ctx.lineTo(x + rad, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
    ctx.lineTo(x, y + rad);
    ctx.quadraticCurveTo(x, y, x + rad, y);
    ctx.closePath();
  }
  function tokenizeCodeForCanvas(line) {
    const re = new RegExp("(\\/\\/.*$)|(\"(?:[^\"\\\\]|\\\\.)*\"|'(?:[^'\\\\]|\\\\.)*'|`(?:[^`\\\\]|\\\\.)*`)|\\b(function|const|let|var|new|class|extends|typeof|instanceof|import|export|from|async|await|interface|type|as|satisfies)\\b|\\b(for|if|else|return|while|do|switch|case|break|continue|try|catch|finally|throw|yield)\\b|\\b(number|string|boolean|void|any|unknown|never|Math|Map|Set|Array|Object|JSON|Number|String|Boolean|Promise|Record|Error)\\b|\\b(true|false|null|undefined|\\d+(?:\\.\\d+)?)\\b|(\\b[A-Za-z_$][\\w$]*)(?=\\s*\\()|(?<=\\.)([A-Za-z_$][\\w$]*)\\b|(\\b[A-Za-z_$][\\w$]*)\\b|(===|!==|>=|<=|=>|&&|\\|\\||\\+\\+|--)", "g");
    const tokens = [];
    let last = 0, m;
    while (m = re.exec(line)) {
      if (m.index > last) tokens.push({ text: line.slice(last, m.index), color: "#d8e2ef" });
      let color = "#d8e2ef";
      if (m[1]) color = "#637488";
      else if (m[2]) color = "#9ece6a";
      else if (m[3]) color = "#ff7b72";
      else if (m[4]) color = "#c792ea";
      else if (m[5]) color = "#38bdf8";
      else if (m[6]) color = "#ffb454";
      else if (m[7]) color = "#79c0ff";
      else if (m[8] || m[9]) color = "#9cdcfe";
      else if (m[10]) color = "#89ddff";
      tokens.push({ text: m[0], color });
      last = m.index + m[0].length;
    }
    if (last < line.length) tokens.push({ text: line.slice(last), color: "#d8e2ef" });
    return tokens;
  }
  function drawVizCardOnCanvas(ctx, x, y, w, h, s, d, kind) {
    roundRectPath(ctx, x, y, w, h, 10);
    ctx.fillStyle = "#070a0f";
    ctx.fill();
    const isHot = d && (d.hot !== void 0 || d.mark != null);
    ctx.strokeStyle = isHot ? "rgba(255,180,84,0.68)" : "#1c2432";
    ctx.lineWidth = isHot ? 1.5 : 1;
    ctx.stroke();
    ctx.font = '700 13px "Cascadia Code", Consolas, monospace';
    ctx.fillStyle = "#cbd5e1";
    ctx.fillText(String(s.name || ""), x + 12, y + 20);
    const nameW = ctx.measureText(String(s.name || "")).width;
    ctx.font = '500 11px "Cascadia Code", Consolas, monospace';
    ctx.fillStyle = "#64748b";
    ctx.fillText(String(kind || ""), x + 18 + nameW, y + 20);
    if (d && d.win) {
      const winTxt = `[${d.win[0]}..${d.win[1]}]`;
      const ww = ctx.measureText(winTxt).width + 12;
      roundRectPath(ctx, x + w - ww - 10, y + 7, ww, 18, 9);
      ctx.fillStyle = "rgba(56,189,248,0.16)";
      ctx.fill();
      ctx.fillStyle = "#38bdf8";
      ctx.fillText(winTxt, x + w - ww - 4, y + 20);
    }
    if (!d) {
      ctx.fillStyle = "#64748b";
      ctx.fillText("empty", x + 14, y + 52);
      return;
    }
    const bx = x + 12, by = y + 32, bw = w - 24, bh = h - 40;
    if (kind === "array" || kind === "queue" || kind === "heap" || kind === "uf" || kind === "set" || kind === "list") {
      const items = d.items || [];
      const maxShow = Math.min(items.length, Math.max(4, Math.floor(bw / 44)));
      const cw = Math.min(44, Math.max(28, Math.floor((bw - (maxShow - 1) * 6) / Math.max(1, maxShow))));
      const ch = 36;
      const cy = by + Math.max(4, Math.floor((bh - ch - 12) / 2));
      for (let i = 0; i < maxShow; i++) {
        const cx = bx + i * (cw + 6);
        const isCellHot = d.hot === i || kind === "set" && d.hot === items[i];
        const isWin = d.win && i >= d.win[0] && i <= d.win[1];
        const isMark = d.mark === i || kind === "heap" && i === 0 || kind === "queue" && i === 0;
        roundRectPath(ctx, cx, cy - (isCellHot ? 2 : 0), cw, ch, 6);
        ctx.fillStyle = isCellHot ? "rgba(255,180,84,0.22)" : isWin ? "rgba(56,189,248,0.14)" : "#121823";
        ctx.fill();
        ctx.strokeStyle = isCellHot ? "#ffb454" : isMark ? "rgba(96,165,250,0.65)" : isWin ? "rgba(56,189,248,0.65)" : "#253042";
        ctx.lineWidth = isCellHot ? 1.8 : 1;
        ctx.stroke();
        ctx.font = '700 13px "Cascadia Code", Consolas, monospace';
        ctx.fillStyle = isCellHot ? "#ffb454" : "#f7f9fc";
        const valStr = String(items[i]);
        const vw = ctx.measureText(valStr).width;
        ctx.fillText(valStr, cx + Math.max(3, (cw - vw) / 2), cy + 19);
        ctx.font = '500 9px "Cascadia Code", Consolas, monospace';
        ctx.fillStyle = isCellHot ? "#ffb454" : "#64748b";
        const idxStr = String(i);
        const iw = ctx.measureText(idxStr).width;
        ctx.fillText(idxStr, cx + (cw - iw) / 2, cy + 32);
      }
      return;
    }
    if (kind === "stack") {
      const items = d.items || [];
      const shown = items.slice(-5);
      const cw = Math.min(110, bw - 8);
      const ch = 22;
      shown.forEach((val, idx) => {
        const abs = items.length - shown.length + idx;
        const isTop = abs === items.length - 1;
        const isCellHot = d.hot === abs;
        const ry = by + (shown.length - 1 - idx) * (ch + 4);
        if (ry + ch > y + h - 4) return;
        roundRectPath(ctx, bx + 4, ry, cw, ch, 5);
        ctx.fillStyle = isCellHot ? "rgba(255,180,84,0.22)" : "#121823";
        ctx.fill();
        ctx.strokeStyle = isCellHot ? "#ffb454" : isTop ? "rgba(96,165,250,0.65)" : "#253042";
        ctx.stroke();
        ctx.font = '700 12px "Cascadia Code", Consolas, monospace';
        ctx.fillStyle = isCellHot ? "#ffb454" : "#f7f9fc";
        ctx.fillText(String(val), bx + 12, ry + 15);
        if (isTop) {
          ctx.font = '600 9px "Cascadia Code", Consolas, monospace';
          ctx.fillStyle = "#60a5fa";
          ctx.fillText("top", bx + cw - 24, ry + 15);
        }
      });
      return;
    }
    if (kind === "map") {
      const entries = d.entries || [];
      let curX = bx, curY = by + 4;
      entries.slice(0, 8).forEach((e) => {
        const pairTxt = `${e.k} \u2192 ${e.v}`;
        ctx.font = '600 12px "Cascadia Code", Consolas, monospace';
        const pw = ctx.measureText(pairTxt).width + 18;
        if (curX + pw > bx + bw && curX > bx) {
          curX = bx;
          curY += 30;
        }
        if (curY + 24 > y + h - 4) return;
        const isPairHot = d.hot === e.k;
        roundRectPath(ctx, curX, curY, pw, 24, 6);
        ctx.fillStyle = isPairHot ? "rgba(255,180,84,0.2)" : "#121823";
        ctx.fill();
        ctx.strokeStyle = isPairHot ? "#ffb454" : "#253042";
        ctx.stroke();
        ctx.fillStyle = isPairHot ? "#ffb454" : "#93c5fd";
        ctx.fillText(pairTxt, curX + 9, curY + 16);
        curX += pw + 6;
      });
      return;
    }
    if (kind === "tree" && d.nodes && d.nodes.length) {
      let layout2 = function(idx, depth, xMin, xMax) {
        if (idx == null || !nodes[idx] || coords.has(idx) || depth > 4) return;
        const node = nodes[idx];
        if (!node) return;
        const nx = (xMin + xMax) / 2;
        const ny = by + 16 + depth * 32;
        const leftIdx = typeof node.left === "number" ? node.left : null;
        const rightIdx = typeof node.right === "number" ? node.right : null;
        coords.set(idx, { x: nx, y: ny, val: node.val, left: leftIdx, right: rightIdx });
        layout2(leftIdx, depth + 1, xMin, nx);
        layout2(rightIdx, depth + 1, nx, xMax);
      };
      var layout = layout2;
      const nodes = d.nodes;
      const root = d.root ?? 0;
      const coords = /* @__PURE__ */ new Map();
      layout2(root, 0, bx + 16, bx + bw - 16);
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 1.5;
      coords.forEach((info) => {
        [info.left, info.right].forEach((ch) => {
          if (ch != null && coords.has(ch)) {
            const c = coords.get(ch);
            if (c) {
              ctx.beginPath();
              ctx.moveTo(info.x, info.y);
              ctx.lineTo(c.x, c.y);
              ctx.stroke();
            }
          }
        });
      });
      coords.forEach((info, idx) => {
        const isNodeHot = d.hot === idx;
        ctx.beginPath();
        ctx.arc(info.x, info.y, 12, 0, Math.PI * 2);
        ctx.fillStyle = isNodeHot ? "#2a1f10" : "#121823";
        ctx.fill();
        ctx.strokeStyle = isNodeHot ? "#ffb454" : idx === root ? "#60a5fa" : "#334155";
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.font = '700 11px "Cascadia Code", Consolas, monospace';
        ctx.fillStyle = isNodeHot ? "#ffb454" : "#f7f9fc";
        const txt = String(info.val);
        ctx.fillText(txt, info.x - ctx.measureText(txt).width / 2, info.y + 4);
      });
      return;
    }
    if (kind === "graph" && d.nodes && d.nodes.length) {
      const byId = /* @__PURE__ */ new Map();
      const scaleX = bw / 180;
      const scaleY = Math.min(1.15, bh / 136);
      d.nodes.forEach((n, idx) => {
        byId.set(n.id ?? idx, {
          id: n.id ?? idx,
          label: n.label ?? (n.id ?? idx),
          x: bx + (n.x ?? 0) * scaleX,
          y: by + (n.y ?? 0) * scaleY
        });
      });
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 1.5;
      (d.edges || []).forEach((e) => {
        const e0 = Array.isArray(e) ? e[0] : e.from ?? 0;
        const e1 = Array.isArray(e) ? e[1] : e.to ?? 0;
        const a = byId.get(e0), b = byId.get(e1);
        if (a && b) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      });
      byId.forEach((n) => {
        const isNodeHot = d.hot === n.id;
        ctx.beginPath();
        ctx.arc(n.x, n.y, 12, 0, Math.PI * 2);
        ctx.fillStyle = isNodeHot ? "#2a1f10" : "#121823";
        ctx.fill();
        ctx.strokeStyle = isNodeHot ? "#ffb454" : "#334155";
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.font = '700 11px "Cascadia Code", Consolas, monospace';
        ctx.fillStyle = isNodeHot ? "#ffb454" : "#f7f9fc";
        const txt = String(n.label);
        ctx.fillText(txt, n.x - ctx.measureText(txt).width / 2, n.y + 4);
      });
      return;
    }
    if (kind === "grid" && d.cells && d.cells.length) {
      const rows = Math.min(d.cells.length, 6);
      const cols = Math.min((d.cells[0] || []).length, 10);
      const cellS = Math.min(24, Math.floor(Math.min(bw / Math.max(1, cols), bh / Math.max(1, rows))));
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const gx = bx + c * (cellS + 3);
          const gy = by + r * (cellS + 3);
          const isCellHot = Array.isArray(d.mark) && d.mark[0] === r && d.mark[1] === c;
          roundRectPath(ctx, gx, gy, cellS, cellS, 4);
          ctx.fillStyle = isCellHot ? "rgba(255,180,84,0.24)" : "#121823";
          ctx.fill();
          ctx.strokeStyle = isCellHot ? "#ffb454" : "#222b38";
          ctx.stroke();
          ctx.font = '600 11px "Cascadia Code", Consolas, monospace';
          ctx.fillStyle = isCellHot ? "#ffb454" : "#cbd5e1";
          const vStr = String(d.cells[r]?.[c] ?? "\xB7");
          ctx.fillText(vStr, gx + (cellS - ctx.measureText(vStr).width) / 2, gy + cellS / 2 + 4);
        }
      }
      return;
    }
    if (kind === "interface" || kind === "object") {
      const fields = d.fields || (d.entries ? d.entries.map((e) => ({ k: String(e.k), v: e.v, declaredType: typeof e.v })) : []);
      const rowH = 22;
      fields.slice(0, 5).forEach((f, idx) => {
        const ry = by + idx * (rowH + 4);
        if (ry + rowH > y + h - 4) return;
        const isRowHot = d.hot === f.k;
        roundRectPath(ctx, bx, ry, bw, rowH, 5);
        ctx.fillStyle = isRowHot ? "rgba(255,180,84,0.22)" : "#121823";
        ctx.fill();
        ctx.strokeStyle = isRowHot ? "#ffb454" : "#232c3b";
        ctx.stroke();
        ctx.font = '700 11px "Cascadia Code", Consolas, monospace';
        ctx.fillStyle = "#9cdcfe";
        const keyTxt = f.k + (f.optional ? "?" : "");
        ctx.fillText(keyTxt, bx + 8, ry + 15);
        const kw = ctx.measureText(keyTxt).width;
        if (f.declaredType) {
          ctx.font = '600 10px "Cascadia Code", Consolas, monospace';
          ctx.fillStyle = "#4ec9b0";
          ctx.fillText(": " + f.declaredType, bx + 12 + kw, ry + 15);
        }
        if (f.v !== void 0) {
          const valTxt = typeof f.v === "string" ? JSON.stringify(f.v) : String(f.v);
          ctx.font = '700 11px "Cascadia Code", Consolas, monospace';
          ctx.fillStyle = typeof f.v === "string" ? "#9ece6a" : "#ffb454";
          const vw = ctx.measureText(valTxt).width;
          ctx.fillText(valTxt, Math.max(bx + 90, bx + bw - vw - 8), ry + 15);
        }
      });
      return;
    }
    if (kind === "string" && d.items) {
      const chars = d.items.slice(0, 24);
      chars.forEach((ch, idx) => {
        const cx = bx + idx * 24;
        if (cx + 22 > bx + bw) return;
        const isHotCh = d.hot === idx;
        roundRectPath(ctx, cx, by + 10, 21, 26, 4);
        ctx.fillStyle = isHotCh ? "rgba(255,180,84,0.22)" : "#121823";
        ctx.fill();
        ctx.strokeStyle = isHotCh ? "#ffb454" : "#253042";
        ctx.stroke();
        ctx.font = '700 12px "Cascadia Code", Consolas, monospace';
        ctx.fillStyle = isHotCh ? "#ffb454" : "#f7f9fc";
        ctx.fillText(String(ch), cx + 6, by + 27);
      });
    }
  }
  function renderVideoFrameToCanvas(ctx, stepIdx, subProgress, speedMult) {
    const W = VIDEO_WIDTH, H = VIDEO_HEIGHT;
    const st = appState.TRACE.steps[stepIdx] || appState.TRACE.steps[0];
    const prevSt = stepIdx > 0 ? appState.TRACE.steps[stepIdx - 1] : null;
    const codeLines = appState.TRACE.code && appState.TRACE.code.length ? appState.TRACE.code : editor.value.replace(/\r/g, "").split("\n");
    ctx.fillStyle = "#07090d";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#0a0e14";
    ctx.fillRect(0, 0, W, 56);
    ctx.strokeStyle = "#1d232e";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 56);
    ctx.lineTo(W, 56);
    ctx.stroke();
    ctx.font = '700 20px "Segoe UI", "PingFang SC", sans-serif';
    ctx.fillStyle = "#f7f9fc";
    ctx.fillText("TypeScript Playground \xB7 Debug Trace", 24, 35);
    const badgeText = `${speedMult}x Speed \xB7 1920\xD71080 \xB7 60fps`;
    ctx.font = '600 13px "Cascadia Code", Consolas, monospace';
    const bw = ctx.measureText(badgeText).width + 28;
    roundRectPath(ctx, W - bw - 24, 13, bw, 30, 15);
    ctx.fillStyle = "rgba(56,189,248,0.14)";
    ctx.fill();
    ctx.strokeStyle = "rgba(56,189,248,0.5)";
    ctx.stroke();
    ctx.fillStyle = "#38bdf8";
    ctx.fillText(badgeText, W - bw - 10, 33);
    const splitX = 1110;
    const mainTop = 56, mainBottom = H - 56, mainH = mainBottom - mainTop;
    ctx.fillStyle = "#0a0e14";
    ctx.fillRect(0, mainTop, splitX, mainH);
    ctx.strokeStyle = "#1d232e";
    ctx.beginPath();
    ctx.moveTo(splitX, mainTop);
    ctx.lineTo(splitX, mainBottom);
    ctx.stroke();
    ctx.font = '700 12px "Segoe UI", sans-serif';
    ctx.fillStyle = "#98a2b3";
    ctx.fillText("SOURCE", 22, mainTop + 26);
    const curLine = st ? st.line : -1;
    const lh = 26;
    const codeStartY = mainTop + 46;
    const maxVisibleLines = Math.floor((mainH - 64) / lh);
    let startLineIdx = 0;
    if (curLine > maxVisibleLines - 6) {
      startLineIdx = Math.max(0, Math.min(codeLines.length - maxVisibleLines, curLine - Math.floor(maxVisibleLines / 2)));
    }
    for (let i = 0; i < maxVisibleLines && startLineIdx + i < codeLines.length; i++) {
      const lineIdx = startLineIdx + i;
      const lineNum = lineIdx + 1;
      const raw = codeLines[lineIdx] || "";
      const ly = codeStartY + i * lh;
      const isCur = lineNum === curLine;
      const hasCkpt = /^\s*(?:checkpoint|断点)\s*\(/.test(raw);
      if (isCur) {
        const pulseAlpha = 0.14 + 0.06 * Math.sin(subProgress * Math.PI);
        ctx.fillStyle = st && st.error ? "rgba(248,113,113,0.20)" : `rgba(255,180,84,${pulseAlpha.toFixed(3)})`;
        ctx.fillRect(0, ly - 17, splitX - 2, lh);
        ctx.fillStyle = st && st.error ? "#f87171" : "#ffb454";
        ctx.fillRect(0, ly - 17, 4, lh);
      }
      if (hasCkpt) {
        ctx.beginPath();
        ctx.arc(14, ly - 5, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#38bdf8";
        ctx.fill();
      }
      ctx.font = (isCur ? "700 " : "500 ") + '14px "Cascadia Code", Consolas, monospace';
      ctx.fillStyle = isCur ? "#ffb454" : "#4b5565";
      const numStr = String(lineNum).padStart(2, " ");
      ctx.fillText(numStr, 26, ly);
      let tx = 68;
      const tokens = tokenizeCodeForCanvas(raw);
      tokens.forEach((tok) => {
        ctx.fillStyle = tok.color;
        ctx.fillText(tok.text, tx, ly);
        tx += ctx.measureText(tok.text).width;
      });
    }
    if (st && (st.anim || st.error)) {
      const hudText = st.error ? `\u2717 RUNTIME ERROR: ${st.error}` : st.note || "";
      ctx.font = '600 13px "Cascadia Code", Consolas, monospace';
      const hudW = Math.min(splitX - 60, ctx.measureText(hudText).width + 32);
      const hudX = 36, hudY = mainBottom - 54;
      roundRectPath(ctx, hudX, hudY, hudW, 36, 9);
      ctx.fillStyle = st.error ? "rgba(42,14,18,0.95)" : st.isCheckpoint ? "rgba(11,29,46,0.95)" : "rgba(19,27,40,0.95)";
      ctx.fill();
      ctx.strokeStyle = st.error ? "#f87171" : st.isCheckpoint ? "#38bdf8" : "#ffb454";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = st.error ? "#fecaca" : st.isCheckpoint ? "#bae6fd" : "#fde68a";
      ctx.fillText(hudText.slice(0, 88), hudX + 14, hudY + 23);
    }
    const sideX = splitX + 1, sideW = W - sideX;
    ctx.fillStyle = "#0d1219";
    ctx.fillRect(sideX, mainTop, sideW, mainH);
    ctx.font = '700 12px "Segoe UI", sans-serif';
    ctx.fillStyle = "#98a2b3";
    ctx.fillText("LOCALS", sideX + 20, mainTop + 24);
    const stackFrames = st && Array.isArray(st.callStack) && st.callStack.length ? st.callStack : [{ label: "global" }];
    const stackChainTxt = stackFrames.map((f) => f.label).join(" \u25B8 ");
    roundRectPath(ctx, sideX + 20, mainTop + 32, sideW - 40, 26, 7);
    ctx.fillStyle = "#0b1018";
    ctx.fill();
    ctx.strokeStyle = "#1e2736";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.font = '600 12px "Cascadia Code", Consolas, monospace';
    ctx.fillStyle = "#7dd3fc";
    ctx.fillText(stackChainTxt.slice(0, 72), sideX + 30, mainTop + 49);
    const v = st && st.v || {};
    const prevV = prevSt && prevSt.v || {};
    let locX = sideX + 20, locY = mainTop + 66;
    const primKeys = Object.keys(v).filter((k) => v[k] === null || typeof v[k] !== "object");
    primKeys.forEach((k) => {
      const valStr = String(v[k]);
      const changed = prevSt && prevV[k] !== v[k];
      ctx.font = '600 13px "Cascadia Code", Consolas, monospace';
      const chipW = ctx.measureText(`${k} : ${valStr}`).width + 24;
      if (locX + chipW > W - 20 && locX > sideX + 20) {
        locX = sideX + 20;
        locY += 34;
      }
      roundRectPath(ctx, locX, locY, chipW, 28, 7);
      ctx.fillStyle = changed ? "rgba(255,180,84,0.16)" : "#121822";
      ctx.fill();
      ctx.strokeStyle = changed ? "rgba(255,180,84,0.65)" : "#1d2532";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "#98a2b3";
      ctx.fillText(k, locX + 10, locY + 19);
      const kw = ctx.measureText(k).width;
      ctx.fillStyle = "#ffb454";
      ctx.fillText(valStr, locX + 18 + kw, locY + 19);
      locX += chipW + 8;
    });
    const watchHeaderY = Math.max(mainTop + 124, locY + 46);
    ctx.font = '700 12px "Segoe UI", sans-serif';
    ctx.fillStyle = "#98a2b3";
    ctx.fillText("WATCH \xB7 \u6570\u636E\u7ED3\u6784\u53EF\u89C6\u5316", sideX + 20, watchHeaderY);
    const ds = st && st.ds || {};
    const vars = discoverVars().filter((s) => appState.watched.has(s.id) && ds[s.id] !== void 0);
    const allocated = allocateSlotSpans(vars, ds);
    const gridLeft = sideX + 20;
    const gridW = sideW - 40;
    const colGap = 12;
    const colW = Math.floor((gridW - colGap) / 2);
    let curRowY = watchHeaderY + 14;
    let pendingSingle = null;
    const consoleTop = mainBottom - 84;
    function drawRowItems(items) {
      const first = items[0];
      const second = items[1];
      if (!first || curRowY + 95 > consoleTop) return;
      const isTall = items.some((it) => it.kind === "tree" || it.kind === "graph" || it.kind === "grid" || it.kind === "stack" || it.kind === "interface");
      const cardH = Math.min(isTall ? 158 : 108, consoleTop - curRowY - 8);
      if (cardH < 64) return;
      if (items.length === 1 || !second) {
        drawVizCardOnCanvas(ctx, gridLeft, curRowY, gridW, cardH, first.s, first.d, first.kind);
      } else {
        drawVizCardOnCanvas(ctx, gridLeft, curRowY, colW, cardH, first.s, first.d, first.kind);
        drawVizCardOnCanvas(ctx, gridLeft + colW + colGap, curRowY, colW, cardH, second.s, second.d, second.kind);
      }
      curRowY += cardH + 10;
    }
    allocated.forEach((item) => {
      if (item.span === 2) {
        if (pendingSingle) {
          drawRowItems([pendingSingle]);
          pendingSingle = null;
        }
        drawRowItems([item]);
      } else {
        if (pendingSingle) {
          drawRowItems([pendingSingle, item]);
          pendingSingle = null;
        } else {
          pendingSingle = item;
        }
      }
    });
    if (pendingSingle) drawRowItems([pendingSingle]);
    ctx.fillStyle = "#070a0f";
    ctx.fillRect(sideX, consoleTop, sideW, mainBottom - consoleTop);
    ctx.strokeStyle = "#1d232e";
    ctx.beginPath();
    ctx.moveTo(sideX, consoleTop);
    ctx.lineTo(W, consoleTop);
    ctx.stroke();
    ctx.font = '600 13px "Cascadia Code", Consolas, monospace';
    ctx.fillStyle = "#ffb454";
    ctx.fillText("\u203A", sideX + 20, consoleTop + 30);
    ctx.fillStyle = st && st.error ? "#f87171" : "#cbd5e1";
    ctx.fillText(String(st && st.note || "").slice(0, 76), sideX + 36, consoleTop + 30);
    ctx.fillStyle = "#0a0e14";
    ctx.fillRect(0, mainBottom, W, 56);
    ctx.strokeStyle = "#1d232e";
    ctx.beginPath();
    ctx.moveTo(0, mainBottom);
    ctx.lineTo(W, mainBottom);
    ctx.stroke();
    let statusLabel = "\u25CF \u8C03\u8BD5\u8FD0\u884C\u4E2D";
    let statusColor = "#4ade80";
    if (st && st.error) {
      statusLabel = "\u2717 \u8FD0\u884C\u65F6\u62A5\u9519";
      statusColor = "#f87171";
    } else if (st && st.isCheckpoint) {
      statusLabel = "\u25C9 \u547D\u4E2D\u68C0\u67E5\u70B9";
      statusColor = "#38bdf8";
    } else if (appState.DEBUG_SESSION.finished && stepIdx === appState.TRACE.steps.length - 1) {
      statusLabel = "\u2713 \u6267\u884C\u5B8C\u6BD5";
      statusColor = "#ffb454";
    }
    roundRectPath(ctx, 24, mainBottom + 12, 136, 32, 16);
    ctx.fillStyle = "#111722";
    ctx.fill();
    ctx.strokeStyle = statusColor;
    ctx.stroke();
    ctx.font = '600 13px "Cascadia Code", Consolas, monospace';
    ctx.fillStyle = statusColor;
    ctx.fillText(statusLabel, 42, mainBottom + 33);
    ctx.font = '500 13px "Segoe UI", sans-serif';
    ctx.fillStyle = "#64748b";
    ctx.fillText(`TypeScript Playground \xB7 1920\xD71080 60fps \u89C6\u9891\u5BFC\u51FA (${speedMult}x \u500D\u901F)`, 184, mainBottom + 33);
  }
  function loadSample(key) {
    if (appState.LANG === "python") {
      PY_ENGINE.loadSample(key);
      return;
    }
    const targetKey = SAMPLES[key] ? key : "showcase";
    if ($("sampleSel")) $("sampleSel").value = targetKey;
    const src = SAMPLES[targetKey] || "";
    if (typeof globalThis.openSampleScriptTab === "function") {
      globalThis.openSampleScriptTab(targetKey + ".ts", src, "ts");
    } else {
      editor.value = src;
      setFileName(targetKey + ".ts");
    }
    appState.lastEditorCursorLine = -1;
    clearLog("\u5DF2\u52A0\u8F7D\u6837\u4F8B \xB7 \u81EA\u52A8\u5F00\u542F Debug \u8C03\u8BD5\u6A21\u5F0F\uFF08\u53EF\u6309 \u2190 / \u2192 \u9010\u6B65\u5F53\u573A\u8BA1\u7B97\uFF0C\u6216\u70B9\u51FB\u5DE6\u4E0B\u300C\u8FD0\u884C\u5230\u4E0B\u4E00\u4E2A\u68C0\u67E5\u70B9\u300D\uFF09");
    resetTraceState();
    const defaultStep = SAMPLE_DEFAULT_STEP[targetKey] || 0;
    startDebug(defaultStep);
  }
  function boot() {
    window.__BOOT_DEFERRED = false;
    try {
      const hash = typeof location !== "undefined" && location.hash || "";
      const qs0 = typeof location !== "undefined" && location.search ? new URLSearchParams(location.search) : null;
      const hasUrlChoice = Boolean(qs0 && (qs0.has("trace") || qs0.has("sample") || qs0.has("step")));
      const wantsPython = Boolean(qs0 && qs0.get("lang") === "python");
      let hasSaved = false;
      if (!hasUrlChoice && !wantsPython && typeof localStorage !== "undefined") {
        try {
          hasSaved = Boolean(localStorage.getItem("ts-playground-session-v1"));
        } catch (_) {
        }
      }
      if (hash.startsWith("#s=") || wantsPython || hasSaved) {
        window.__BOOT_DEFERRED = true;
        editor.value = "";
        clearLog("\u6B63\u5728\u6062\u590D\u4E0A\u6B21\u4F1A\u8BDD / \u5206\u4EAB\u4EE3\u7801\u2026");
        updateEditorChrome();
        return;
      }
    } catch (_) {
    }
    let sampleKey = "showcase";
    let customStep = null;
    try {
      const qs = typeof location !== "undefined" && location.search ? new URLSearchParams(location.search) : null;
      if (qs) {
        const tr = qs.get("trace") || qs.get("sample");
        const aliasMap = { demo: "showcase", tour: "structures", stress: "lcs" };
        if (tr) {
          const mapped = aliasMap[tr] || tr;
          if (SAMPLES[mapped]) sampleKey = mapped;
        }
        if (qs.has("watch")) {
          const w = qs.get("watch");
          appState.URL_WATCH = w ? w.split(",").map((s) => s.trim()).filter(Boolean) : [];
        }
        if (qs.get("still") === "1") {
          appState.IS_STILL = true;
          if (document.body && document.body.classList) document.body.classList.add("still");
        }
        if (qs.has("step")) {
          customStep = parseInt(qs.get("step") || "0", 10) || 0;
        }
      }
    } catch {
    }
    if ($("sampleSel")) $("sampleSel").value = sampleKey;
    const initialSrc = SAMPLES[sampleKey] || SAMPLES.showcase || "";
    if (typeof globalThis.openSampleScriptTab === "function") {
      globalThis.openSampleScriptTab(sampleKey + ".ts", initialSrc, "ts");
    } else {
      editor.value = initialSrc;
      setFileName(sampleKey + ".ts");
    }
    updateEditorChrome();
    const initialStep = customStep !== null ? customStep : SAMPLE_DEFAULT_STEP[sampleKey] || 0;
    generateTrace(initialStep);
  }
  var initApp = boot;
  registerUiHooks({ loadSample });

  // src/ui/video-webm.ts
  var video_webm_exports = {};
  __export(video_webm_exports, {
    concatUint8Arrays: () => concatUint8Arrays,
    ebmlAsciiBytes: () => ebmlAsciiBytes,
    ebmlElement: () => ebmlElement,
    ebmlFloat64Bytes: () => ebmlFloat64Bytes,
    ebmlUintBytes: () => ebmlUintBytes,
    ebmlVintSize: () => ebmlVintSize,
    encodeVideoFastWebCodecs: () => encodeVideoFastWebCodecs,
    exportVideo: () => exportVideo,
    fixWebmDuration: () => fixWebmDuration,
    muxWebmChunks: () => muxWebmChunks
  });

  // src/utils/webm-muxer.ts
  function ebmlUintBytes(num) {
    let v = Math.max(0, Math.floor(Number(num) || 0));
    if (v === 0) return new Uint8Array([0]);
    const bytes = [];
    while (v > 0) {
      bytes.unshift(v & 255);
      v = Math.floor(v / 256);
    }
    return new Uint8Array(bytes);
  }
  function ebmlFloat64Bytes(val) {
    const buf = new ArrayBuffer(8);
    new DataView(buf).setFloat64(0, Number(val) || 0, false);
    return new Uint8Array(buf);
  }
  function ebmlAsciiBytes(str) {
    const s = String(str || "");
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 127;
    return out;
  }
  function ebmlVintSize(len) {
    const n = Math.max(0, Math.floor(len));
    if (n < 127) return new Uint8Array([128 | n]);
    if (n < 16383) return new Uint8Array([64 | n >> 8, n & 255]);
    if (n < 2097151) return new Uint8Array([32 | n >> 16, n >> 8 & 255, n & 255]);
    if (n < 268435455) {
      return new Uint8Array([
        16 | n >>> 24 & 15,
        n >>> 16 & 255,
        n >>> 8 & 255,
        n & 255
      ]);
    }
    const hi = Math.floor(n / 4294967296);
    const lo = n >>> 0;
    return new Uint8Array([
      1,
      hi >>> 16 & 255,
      hi >>> 8 & 255,
      hi & 255,
      lo >>> 24 & 255,
      lo >>> 16 & 255,
      lo >>> 8 & 255,
      lo & 255
    ]);
  }
  function concatUint8Arrays(arrays) {
    let total = 0;
    for (const arr of arrays) total += arr.length;
    const out = new Uint8Array(total);
    let offset = 0;
    for (const arr of arrays) {
      out.set(arr, offset);
      offset += arr.length;
    }
    return out;
  }
  function isUint8ArrayList(arr) {
    return arr[0] instanceof Uint8Array;
  }
  function ebmlElement(idBytes, payload) {
    const idArr = idBytes instanceof Uint8Array ? idBytes : new Uint8Array(idBytes);
    const body = Array.isArray(payload) ? isUint8ArrayList(payload) ? concatUint8Arrays(payload) : new Uint8Array(payload) : payload instanceof Uint8Array ? payload : new Uint8Array(payload);
    const sizeArr = ebmlVintSize(body.length);
    return concatUint8Arrays([idArr, sizeArr, body]);
  }
  function muxWebmChunks(frames, durationMs, width = 1920, height = 1080, fps = 60, codecId = "V_VP8") {
    const ebmlHeader = ebmlElement([26, 69, 223, 163], [
      ebmlElement([66, 134], ebmlUintBytes(1)),
      ebmlElement([66, 247], ebmlUintBytes(1)),
      ebmlElement([66, 242], ebmlUintBytes(4)),
      ebmlElement([66, 243], ebmlUintBytes(8)),
      ebmlElement([66, 130], ebmlAsciiBytes("webm")),
      ebmlElement([66, 135], ebmlUintBytes(4)),
      ebmlElement([66, 133], ebmlUintBytes(2))
    ]);
    const infoElem = ebmlElement([21, 73, 169, 102], [
      ebmlElement([42, 215, 177], ebmlUintBytes(1e6)),
      ebmlElement([68, 137], ebmlFloat64Bytes(durationMs)),
      ebmlElement([77, 128], ebmlAsciiBytes("TSPlaygroundVisual")),
      ebmlElement([87, 65], ebmlAsciiBytes("TSPlaygroundVisual"))
    ]);
    const defaultDurNs = Math.round(1e9 / fps);
    const tracksElem = ebmlElement([22, 84, 174, 107], [
      ebmlElement([174], [
        ebmlElement([215], ebmlUintBytes(1)),
        ebmlElement([115, 197], ebmlUintBytes(1)),
        ebmlElement([156], ebmlUintBytes(0)),
        ebmlElement([34, 181, 156], ebmlAsciiBytes("und")),
        ebmlElement([134], ebmlAsciiBytes(codecId)),
        ebmlElement([131], ebmlUintBytes(1)),
        ebmlElement([35, 227, 131], ebmlUintBytes(defaultDurNs)),
        ebmlElement([224], [
          ebmlElement([176], ebmlUintBytes(width)),
          ebmlElement([186], ebmlUintBytes(height))
        ])
      ])
    ]);
    const clusters = [];
    let curCluster = null;
    for (const f of frames) {
      const tMs = Math.max(0, Math.round(f.timestampMs));
      if (!curCluster || f.isKey || tMs - curCluster.timecodeMs >= 2e3) {
        curCluster = { timecodeMs: tMs, blocks: [] };
        clusters.push(curCluster);
      }
      const relMs = Math.max(0, Math.min(32767, tMs - curCluster.timecodeMs));
      const blockHeader = new Uint8Array([
        129,
        relMs >> 8 & 255,
        relMs & 255,
        f.isKey ? 128 : 0
      ]);
      const simpleBlock = ebmlElement([163], [blockHeader, f.data]);
      curCluster.blocks.push(simpleBlock);
    }
    let segOffset = infoElem.length + tracksElem.length;
    const clusterElems = [];
    const cuePoints = [];
    for (const cl of clusters) {
      const tcElem = ebmlElement([231], ebmlUintBytes(cl.timecodeMs));
      const clElem = ebmlElement([31, 67, 182, 117], [tcElem, ...cl.blocks]);
      cuePoints.push(
        ebmlElement([187], [
          ebmlElement([179], ebmlUintBytes(cl.timecodeMs)),
          ebmlElement([183], [
            ebmlElement([247], ebmlUintBytes(1)),
            ebmlElement([241], ebmlUintBytes(segOffset))
          ])
        ])
      );
      clusterElems.push(clElem);
      segOffset += clElem.length;
    }
    const cuesElem = ebmlElement([28, 83, 187, 107], cuePoints);
    const segmentBody = concatUint8Arrays([infoElem, tracksElem, ...clusterElems, cuesElem]);
    const segmentSize8 = new Uint8Array([
      1,
      0,
      0,
      0,
      segmentBody.length >>> 24 & 255,
      segmentBody.length >>> 16 & 255,
      segmentBody.length >>> 8 & 255,
      segmentBody.length & 255
    ]);
    const segmentElem = concatUint8Arrays([
      new Uint8Array([24, 83, 128, 103]),
      segmentSize8,
      segmentBody
    ]);
    return new Blob([ebmlHeader, segmentElem], { type: "video/webm" });
  }
  async function fixWebmDuration(blob, durationMs) {
    if (!blob || !(durationMs > 0)) return blob;
    try {
      const buf = await blob.arrayBuffer();
      const bytes = new Uint8Array(buf);
      const searchLimit = Math.min(bytes.length - 12, 16384);
      let infoPos = -1;
      let tracksPos = -1;
      for (let i = 0; i < searchLimit; i++) {
        if (infoPos < 0 && bytes[i] === 21 && bytes[i + 1] === 73 && bytes[i + 2] === 169 && bytes[i + 3] === 102) {
          infoPos = i;
        } else if (infoPos >= 0 && bytes[i] === 22 && bytes[i + 1] === 84 && bytes[i + 2] === 174 && bytes[i + 3] === 107) {
          tracksPos = i;
          break;
        }
      }
      if (infoPos < 0) return blob;
      const sizeIdx = infoPos + 4;
      const firstByte = bytes[sizeIdx] ?? 0;
      let vintLen = 1;
      let mask = 128;
      while (vintLen <= 8 && !(firstByte & mask)) {
        mask >>= 1;
        vintLen++;
      }
      if (vintLen > 8) return blob;
      let parsedInfoSize = firstByte & mask - 1;
      for (let k = 1; k < vintLen; k++) {
        parsedInfoSize = parsedInfoSize * 256 + (bytes[sizeIdx + k] ?? 0);
      }
      const isUnknownInfoSize = vintLen === 8 && bytes[sizeIdx + 1] === 255 && bytes[sizeIdx + 2] === 255 || parsedInfoSize === Math.pow(2, 7 * vintLen) - 1;
      const infoDataStart = sizeIdx + vintLen;
      const infoDataEnd = tracksPos > infoDataStart ? tracksPos : !isUnknownInfoSize ? Math.min(bytes.length, infoDataStart + parsedInfoSize) : Math.min(bytes.length, infoDataStart + 64);
      let existingDurUpdated = false;
      for (let i = infoDataStart; i <= infoDataEnd - 11; i++) {
        if (bytes[i] === 68 && bytes[i + 1] === 137 && bytes[i + 2] === 136) {
          new DataView(bytes.buffer, bytes.byteOffset + i + 3, 8).setFloat64(0, durationMs, false);
          existingDurUpdated = true;
          break;
        }
      }
      let outBytes = bytes;
      let tailStartInOut = infoDataEnd;
      if (!existingDurUpdated) {
        const durElem = new Uint8Array(11);
        durElem[0] = 68;
        durElem[1] = 137;
        durElem[2] = 136;
        new DataView(durElem.buffer).setFloat64(3, durationMs, false);
        const origInfoPayload = bytes.subarray(infoDataStart, infoDataEnd);
        const newInfoPayloadLen = durElem.length + origInfoPayload.length;
        const newSizeVint = new Uint8Array([
          16 | newInfoPayloadLen >>> 24 & 15,
          newInfoPayloadLen >>> 16 & 255,
          newInfoPayloadLen >>> 8 & 255,
          newInfoPayloadLen & 255
        ]);
        const head = bytes.subarray(0, infoPos + 4);
        const tail = bytes.subarray(infoDataEnd);
        outBytes = concatUint8Arrays([head, newSizeVint, durElem, origInfoPayload, tail]);
        tailStartInOut = head.length + newSizeVint.length + durElem.length + origInfoPayload.length;
      }
      for (let i = 0; i < Math.min(infoPos, 128); i++) {
        if (outBytes[i] === 24 && outBytes[i + 1] === 83 && outBytes[i + 2] === 128 && outBytes[i + 3] === 103) {
          if (outBytes[i + 4] === 1 && outBytes[i + 5] === 255 && outBytes[i + 6] === 255) {
            const segPayloadLen = outBytes.length - (i + 12);
            outBytes[i + 4] = 1;
            outBytes[i + 5] = 0;
            outBytes[i + 6] = 0;
            outBytes[i + 7] = 0;
            outBytes[i + 8] = segPayloadLen >>> 24 & 255;
            outBytes[i + 9] = segPayloadLen >>> 16 & 255;
            outBytes[i + 10] = segPayloadLen >>> 8 & 255;
            outBytes[i + 11] = segPayloadLen & 255;
          }
          break;
        }
      }
      let firstClusterTc = null;
      for (let i = tailStartInOut; i < outBytes.length - 16; i++) {
        if (outBytes[i] === 31 && outBytes[i + 1] === 67 && outBytes[i + 2] === 182 && outBytes[i + 3] === 117) {
          const b0 = outBytes[i + 4] ?? 0;
          let vLen = 1, m = 128;
          while (vLen <= 8 && !(b0 & m)) {
            m >>= 1;
            vLen++;
          }
          const tcPos = i + 4 + vLen;
          if (tcPos + 2 < outBytes.length && outBytes[tcPos] === 231) {
            const tcSizeByte = outBytes[tcPos + 1] ?? 0;
            const tcLen = tcSizeByte & 127;
            if (tcLen >= 1 && tcLen <= 8 && tcPos + 2 + tcLen <= outBytes.length) {
              let val = 0;
              for (let b = 0; b < tcLen; b++) {
                val = val * 256 + (outBytes[tcPos + 2 + b] ?? 0);
              }
              if (firstClusterTc === null) {
                firstClusterTc = val;
              }
              if (firstClusterTc > 0) {
                let rebased = Math.max(0, Math.min(Math.round(durationMs), val - firstClusterTc));
                for (let b = tcLen - 1; b >= 0; b--) {
                  outBytes[tcPos + 2 + b] = rebased & 255;
                  rebased = Math.floor(rebased / 256);
                }
              }
            }
          }
        }
      }
      return new Blob([outBytes], { type: "video/webm" });
    } catch (_) {
      return blob;
    }
  }

  // src/ui/video-webm.ts
  var btnExportVideo2 = $("btnExportVideo");
  var btnExportVideoLabel2 = $("btnExportVideoLabel");
  var videoExportStatus2 = $("videoExportStatus");
  async function encodeVideoFastWebCodecs(canvas, ctx, totalSteps, stepDurationMs, mult) {
    if (typeof VideoEncoder !== "function" || typeof VideoFrame !== "function") return null;
    const codecCandidates = [
      { codec: "vp8", webmId: "V_VP8" },
      { codec: "vp09.00.10.08", webmId: "V_VP9" }
    ];
    let chosen = null;
    for (const c of codecCandidates) {
      try {
        const sup = await VideoEncoder.isConfigSupported({
          codec: c.codec,
          width: VIDEO_WIDTH,
          height: VIDEO_HEIGHT,
          bitrate: 8e6,
          framerate: VIDEO_FPS,
          latencyMode: "realtime"
        });
        if (sup && sup.supported) {
          chosen = c;
          break;
        }
      } catch (_) {
      }
    }
    if (!chosen) return null;
    const encodedFrames = [];
    let encoderError = null;
    const encoder = new VideoEncoder({
      output: (chunk) => {
        const data = new Uint8Array(chunk.byteLength);
        chunk.copyTo(data);
        encodedFrames.push({
          data,
          timestampMs: Math.max(0, Math.round(chunk.timestamp / 1e3)),
          isKey: chunk.type === "key"
        });
      },
      error: (err) => {
        encoderError = err;
      }
    });
    encoder.configure({
      codec: chosen.codec,
      width: VIDEO_WIDTH,
      height: VIDEO_HEIGHT,
      bitrate: 8e6,
      framerate: VIDEO_FPS,
      latencyMode: "realtime"
    });
    const frameDurMs = 1e3 / VIDEO_FPS;
    const totalDurationMs = totalSteps * stepDurationMs;
    const subFramesPerStep = 6;
    for (let s = 0; s < totalSteps; s++) {
      if (encoderError) throw encoderError;
      if (videoExportStatus2 && (s % 2 === 0 || s === totalSteps - 1)) {
        const pct = Math.round((s + 1) / totalSteps * 100);
        videoExportStatus2.textContent = `\u6B63\u5728\u6781\u901F\u7F16\u7801 1920\xD71080 60fps (${mult}x) \xB7 ${pct}%`;
        await new Promise((r) => setTimeout(r, 0));
      }
      const stepStartMs = s * stepDurationMs;
      for (let k = 0; k < subFramesPerStep; k++) {
        const frac = k / subFramesPerStep;
        const rawMs = stepStartMs + frac * stepDurationMs;
        const tickIdx = Math.round(rawMs / frameDurMs);
        const tMs = Math.min(totalDurationMs - 17, Math.round(tickIdx * frameDurMs));
        const tUs = tMs * 1e3;
        if (k === 0 || k === 3) {
          renderVideoFrameToCanvas(ctx, s, frac, mult);
        }
        const vf = new VideoFrame(canvas, {
          timestamp: tUs,
          duration: Math.round(stepDurationMs / subFramesPerStep * 1e3)
        });
        encoder.encode(vf, { keyFrame: k === 0 });
        vf.close();
      }
      if (s === totalSteps - 1) {
        const endMs = Math.max(0, Math.round(totalDurationMs - frameDurMs));
        const vfEnd = new VideoFrame(canvas, {
          timestamp: endMs * 1e3,
          duration: Math.round(frameDurMs * 1e3)
        });
        encoder.encode(vfEnd, { keyFrame: false });
        vfEnd.close();
      }
      while (encoder.encodeQueueSize > 12) {
        await new Promise((r) => setTimeout(r, 4));
      }
    }
    await encoder.flush();
    encoder.close();
    if (encoderError || !encodedFrames.length) return null;
    return {
      blob: muxWebmChunks(encodedFrames, totalDurationMs, VIDEO_WIDTH, VIDEO_HEIGHT, VIDEO_FPS, chosen.webmId),
      durationMs: totalDurationMs
    };
  }
  async function exportVideo(speedMult = appState.VIDEO_EXPORT_SPEED) {
    if (appState.IS_EXPORTING_VIDEO) return false;
    const mult = setVideoExportSpeed(speedMult);
    stopAuto();
    const savedCur = appState.cur;
    if (!startDebug(0)) {
      say("\u2717 \u4EE3\u7801\u7F16\u8BD1\u672A\u901A\u8FC7\uFF0C\u65E0\u6CD5\u5BFC\u51FA\u89C6\u9891", "err");
      return false;
    }
    while (!appState.DEBUG_SESSION.finished && appState.TRACE.steps.length < MAX_STEPS) {
      if (!computeAndAppendNextStep({ silent: true })) break;
    }
    initWatchedVars();
    if (!appState.TRACE.steps.length) {
      say("\u2717 \u5F53\u524D\u4EE3\u7801\u672A\u4EA7\u751F\u53EF\u5F55\u5236\u7684\u8C03\u8BD5\u6B65\u9AA4", "err");
      return false;
    }
    appState.IS_EXPORTING_VIDEO = true;
    if (btnExportVideo2) btnExportVideo2.disabled = true;
    if (btnExportVideoLabel2) btnExportVideoLabel2.textContent = "\u23FA \u6B63\u5728\u6781\u901F\u5BFC\u51FA...";
    if (videoExportStatus2) {
      videoExportStatus2.classList.add("active");
      videoExportStatus2.textContent = `\u51C6\u5907\u6781\u901F\u5BFC\u51FA 1920\xD71080 @ ${VIDEO_FPS}fps (${mult}x \u500D\u901F)...`;
    }
    say(`\u{1F3AC} \u5F00\u59CB\u6781\u901F\u5BFC\u51FA\u89C6\u9891\uFF1A\u5206\u8FA8\u7387 ${VIDEO_WIDTH}\xD7${VIDEO_HEIGHT} \xB7 ${VIDEO_FPS}fps \xB7 \u500D\u901F ${mult}x`, "ok");
    try {
      const canvas = document.createElement("canvas");
      canvas.width = VIDEO_WIDTH;
      canvas.height = VIDEO_HEIGHT;
      const ctx = canvas.getContext("2d");
      const stepDurationMs = Math.max(120, Math.round(AUTO_PLAY_MS / mult));
      const totalSteps = appState.TRACE.steps.length;
      const targetTotalDurationMs = totalSteps * stepDurationMs;
      const fastRes = ctx ? await encodeVideoFastWebCodecs(canvas, ctx, totalSteps, stepDurationMs, mult) : null;
      if (fastRes && fastRes.blob) {
        appState.cur = Math.min(savedCur, Math.max(0, appState.TRACE.steps.length - 1));
        renderPicker();
        renderStatic(appState.cur, false);
        const url2 = URL.createObjectURL(fastRes.blob);
        const a2 = document.createElement("a");
        a2.href = url2;
        a2.download = `ts-playground-1080p-60fps-${mult}x.webm`;
        document.body.appendChild(a2);
        a2.click();
        document.body.removeChild(a2);
        URL.revokeObjectURL(url2);
        const secTxt2 = (fastRes.durationMs / 1e3).toFixed(1) + "s";
        if (videoExportStatus2) {
          videoExportStatus2.textContent = `\u2713 \u5DF2\u6781\u901F\u5BFC\u51FA (${secTxt2}) ts-playground-1080p-60fps-${mult}x.webm`;
        }
        say(`\u2713 \u89C6\u9891\u6781\u901F\u5BFC\u51FA\u5B8C\u6210\uFF1Ats-playground-1080p-60fps-${mult}x.webm (1920\xD71080 \xB7 60fps \xB7 ${mult}x \u500D\u901F \xB7 \u7CBE\u786E\u65F6\u957F ${secTxt2})`, "ok");
        return true;
      }
      if (typeof canvas.captureStream !== "function" || typeof MediaRecorder === "undefined") {
        if (ctx) renderVideoFrameToCanvas(ctx, totalSteps - 1, 1, mult);
        return true;
      }
      const mimeCandidates = [
        "video/webm;codecs=vp8",
        "video/webm;codecs=vp9",
        "video/webm"
      ];
      let mimeType = "";
      for (const m of mimeCandidates) {
        if (typeof MediaRecorder.isTypeSupported === "function" && MediaRecorder.isTypeSupported(m)) {
          mimeType = m;
          break;
        }
      }
      if (ctx) renderVideoFrameToCanvas(ctx, 0, 0, mult);
      const stream = canvas.captureStream(VIDEO_FPS);
      const videoTrack = stream.getVideoTracks && stream.getVideoTracks()[0];
      const recorderOpts = { videoBitsPerSecond: 8e6 };
      if (mimeType) recorderOpts.mimeType = mimeType;
      const recorder = new MediaRecorder(stream, recorderOpts);
      const chunks = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };
      const stoppedPromise = new Promise((resolve, reject) => {
        recorder.onstop = resolve;
        recorder.onerror = (ev) => reject(ev.error || new Error("MediaRecorder error"));
      });
      const recStartWall = performance.now();
      recorder.start(100);
      const frameIntervalMs = 1e3 / VIDEO_FPS;
      for (let s = 0; s < totalSteps; s++) {
        if (videoExportStatus2 && (s % 2 === 0 || s === totalSteps - 1)) {
          const pct = Math.round((s + 1) / totalSteps * 100);
          videoExportStatus2.textContent = `\u6B63\u5728\u5408\u6210 1920\xD71080 60fps (${mult}x) \xB7 ${pct}%`;
        }
        const stepStart = performance.now();
        if (ctx) renderVideoFrameToCanvas(ctx, s, 0.5, mult);
        while (true) {
          const now = performance.now();
          const elapsedStep = now - stepStart;
          if (elapsedStep >= stepDurationMs) break;
          if (videoTrack && typeof videoTrack.requestFrame === "function") {
            try {
              videoTrack.requestFrame();
            } catch (_) {
            }
          }
          const waitMs = Math.max(1, Math.min(frameIntervalMs, stepDurationMs - elapsedStep));
          await new Promise((r) => setTimeout(r, waitMs));
        }
      }
      const actualDurationMs = Math.max(200, Math.round(performance.now() - recStartWall));
      recorder.stop();
      await stoppedPromise;
      stream.getTracks().forEach((t) => t.stop());
      appState.cur = Math.min(savedCur, Math.max(0, appState.TRACE.steps.length - 1));
      renderPicker();
      renderStatic(appState.cur, false);
      let blob = new Blob(chunks, { type: mimeType || "video/webm" });
      blob = await fixWebmDuration(blob, actualDurationMs || targetTotalDurationMs);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ts-playground-1080p-60fps-${mult}x.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      const secTxt = (actualDurationMs / 1e3).toFixed(1) + "s";
      if (videoExportStatus2) {
        videoExportStatus2.textContent = `\u2713 \u5DF2\u5BFC\u51FA (${secTxt}) ts-playground-1080p-60fps-${mult}x.webm`;
      }
      say(`\u2713 \u89C6\u9891\u5BFC\u51FA\u5B8C\u6210\uFF1Ats-playground-1080p-60fps-${mult}x.webm (1920\xD71080 \xB7 60fps \xB7 ${mult}x \u500D\u901F \xB7 \u65F6\u957F ${secTxt})`, "ok");
      return true;
    } catch (err) {
      const msg = err instanceof Error && err.message ? err.message : String(err);
      if (videoExportStatus2) videoExportStatus2.textContent = "\u2717 \u5BFC\u51FA\u5931\u8D25: " + msg;
      say("\u2717 \u89C6\u9891\u5BFC\u51FA\u5931\u8D25: " + msg, "err");
      return false;
    } finally {
      appState.IS_EXPORTING_VIDEO = false;
      if (btnExportVideo2) btnExportVideo2.disabled = false;
      if (btnExportVideoLabel2) btnExportVideoLabel2.textContent = "\u{1F3AC} \u5BFC\u51FA\u89C6\u9891";
    }
  }
  if (btnExportVideo2) {
    btnExportVideo2.onclick = (e) => {
      e.stopPropagation();
      exportVideo(appState.VIDEO_EXPORT_SPEED);
    };
  }

  // src/ui/vfs.ts
  var vfs_exports = {};
  __export(vfs_exports, {
    VFS_EXPANDED_FOLDERS: () => VFS_EXPANDED_FOLDERS,
    VFS_NODES: () => VFS_NODES,
    VFS_STORAGE_KEY: () => VFS_STORAGE_KEY,
    bindGlobalVfsApi: () => bindGlobalVfsApi,
    createVfsCoreApi: () => createVfsCoreApi,
    ensureParentFoldersExist: () => ensureParentFoldersExist,
    ensureVfsInitialized: () => ensureVfsInitialized,
    initVfsSidebarEvents: () => initVfsSidebarEvents,
    notifyVfsStoreChanged: () => notifyVfsStoreChanged,
    openVfsFile: () => openVfsFile,
    persistVfsToClientStorage: () => persistVfsToClientStorage,
    renderVfsTreeUI: () => renderVfsTreeUI,
    resolveWorkspacePath: () => resolveWorkspacePath,
    serializeFsData: () => serializeFsData,
    subscribeVfsStore: () => subscribeVfsStore
  });

  // src/runtime/vfs-store.ts
  var VFS_STORAGE_KEY = "ts-visual-vfs-workspace-v2";
  var vfsBootInitialized = false;
  var VFS_EXPANDED_FOLDERS = /* @__PURE__ */ new Set();
  var VFS_NODES = /* @__PURE__ */ new Map();
  var vfsListeners = /* @__PURE__ */ new Set();
  function subscribeVfsStore(listener) {
    vfsListeners.add(listener);
    return () => {
      vfsListeners.delete(listener);
    };
  }
  function notifyVfsStoreChanged() {
    vfsListeners.forEach((fn) => fn());
  }
  function resolveWorkspacePath(rawPath, allowEmptyRoot = false) {
    const raw = String(rawPath ?? "").trim().replace(/\\/g, "/");
    if (!raw || raw === "." || raw === "./" || raw === "workspace" || raw === "/workspace" || raw === "workspace/" || raw === "/workspace/") {
      if (allowEmptyRoot) return "";
      throw new Error(`EISDIR: illegal operation on workspace root directory '${rawPath}'`);
    }
    if (/^[A-Za-z]:/.test(raw) || raw.startsWith("~")) {
      throw new Error(`EACCES: permission denied, file operations outside workspace are not allowed: '${rawPath}'`);
    }
    if (raw.startsWith("/")) {
      if (raw !== "/workspace" && !raw.startsWith("/workspace/")) {
        throw new Error(`EACCES: permission denied, file operations outside workspace are not allowed: '${rawPath}'`);
      }
    }
    let stripped = raw;
    if (stripped.startsWith("/workspace/")) {
      stripped = stripped.slice("/workspace/".length);
    } else if (stripped.startsWith("workspace/")) {
      stripped = stripped.slice("workspace/".length);
    } else if (stripped.startsWith("./")) {
      stripped = stripped.slice(2);
    }
    const rawSegments = stripped.split("/");
    const resolved = [];
    for (const seg of rawSegments) {
      if (!seg || seg === ".") continue;
      if (seg === "..") {
        if (resolved.length === 0) {
          throw new Error(`EACCES: permission denied, file operations outside workspace are not allowed: '${rawPath}'`);
        }
        resolved.pop();
        continue;
      }
      resolved.push(seg);
    }
    const firstSeg = resolved[0] || "";
    if (firstSeg === "examples" || firstSeg === "notebooks") {
      throw new Error(`EACCES: permission denied, file operations outside workspace are not allowed: '${rawPath}'`);
    }
    const finalPath = resolved.join("/");
    if (!finalPath && !allowEmptyRoot) {
      throw new Error(`EISDIR: illegal operation on workspace root directory '${rawPath}'`);
    }
    return finalPath;
  }
  function isPersistedVfsNode(item) {
    if (!isRecord(item)) return false;
    return typeof item.path === "string" && typeof item.name === "string" && (item.type === "file" || item.type === "folder");
  }
  function ensureVfsInitialized() {
    if (vfsBootInitialized) return;
    vfsBootInitialized = true;
    VFS_NODES.clear();
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem("ts-visual-vfs-v1");
        const raw = localStorage.getItem(VFS_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            for (const item of parsed) {
              if (isPersistedVfsNode(item)) {
                VFS_NODES.set(item.path, {
                  path: item.path,
                  name: item.name,
                  type: item.type,
                  parentPath: typeof item.parentPath === "string" ? item.parentPath : "",
                  content: typeof item.content === "string" ? item.content : void 0,
                  readonly: Boolean(item.readonly)
                });
              }
            }
          }
        }
      }
    } catch (_) {
    }
  }
  function persistVfsToClientStorage() {
    try {
      if (typeof localStorage === "undefined") return;
      const customNodes = [];
      VFS_NODES.forEach((node) => {
        customNodes.push(node);
      });
      localStorage.setItem(VFS_STORAGE_KEY, JSON.stringify(customNodes));
    } catch (_) {
    }
  }
  function ensureParentFoldersExist(relPath) {
    const parts = relPath.split("/").filter(Boolean);
    if (parts.length <= 1) return;
    let acc = "";
    for (let i = 0; i < parts.length - 1; i++) {
      const folderName = parts[i] || "";
      const parentPath = acc;
      acc = acc ? `${acc}/${folderName}` : folderName;
      if (!VFS_NODES.has(acc)) {
        VFS_NODES.set(acc, {
          path: acc,
          name: folderName,
          type: "folder",
          parentPath
        });
        VFS_EXPANDED_FOLDERS.add(acc);
      }
    }
  }
  function serializeFsData(data) {
    if (typeof data === "string") return data;
    if (data instanceof Uint8Array) {
      return typeof TextDecoder !== "undefined" ? new TextDecoder().decode(data) : String(data);
    }
    if (data !== null && typeof data === "object") {
      try {
        return JSON.stringify(data, null, 2);
      } catch (_) {
        return String(data);
      }
    }
    return String(data ?? "");
  }
  function createVfsCoreApi() {
    const api = {
      resolveWorkspacePath(rawPath, allowEmptyRoot = false) {
        return resolveWorkspacePath(rawPath, allowEmptyRoot);
      },
      readFile(path) {
        ensureVfsInitialized();
        const rel = resolveWorkspacePath(path, false);
        const node = VFS_NODES.get(rel);
        if (!node) return null;
        if (node.type === "folder") {
          throw new Error(`EISDIR: illegal operation on a directory, read '${path}'`);
        }
        return node.content ?? "";
      },
      writeFile(path, content) {
        ensureVfsInitialized();
        const rel = resolveWorkspacePath(path, false);
        const existing = VFS_NODES.get(rel);
        if (existing && existing.type === "folder") {
          throw new Error(`EISDIR: illegal operation on a directory, open '${path}'`);
        }
        ensureParentFoldersExist(rel);
        const parts = rel.split("/");
        const name = parts.pop() || rel;
        const parentPath = parts.join("/");
        VFS_NODES.set(rel, {
          path: rel,
          name,
          type: "file",
          parentPath,
          content: serializeFsData(content)
        });
        persistVfsToClientStorage();
        notifyVfsStoreChanged();
        return true;
      },
      appendFile(path, content) {
        ensureVfsInitialized();
        const rel = resolveWorkspacePath(path, false);
        const existing = VFS_NODES.get(rel);
        if (existing && existing.type === "folder") {
          throw new Error(`EISDIR: illegal operation on a directory, open '${path}'`);
        }
        const prev = existing && existing.type === "file" ? existing.content ?? "" : "";
        return api.writeFile(rel, prev + serializeFsData(content));
      },
      listFiles(dirPath = "") {
        ensureVfsInitialized();
        const rel = resolveWorkspacePath(dirPath, true);
        if (rel !== "") {
          const dirNode = VFS_NODES.get(rel);
          if (!dirNode) {
            throw new Error(`ENOENT: no such file or directory, scandir '${dirPath}'`);
          }
          if (dirNode.type !== "folder") {
            throw new Error(`ENOTDIR: not a directory, scandir '${dirPath}'`);
          }
        }
        const out = [];
        VFS_NODES.forEach((node) => {
          if (node.parentPath === rel) out.push(node.name);
        });
        return out;
      },
      readdir(dirPath = "") {
        return api.listFiles(dirPath);
      },
      listAll() {
        ensureVfsInitialized();
        return Array.from(VFS_NODES.keys()).sort();
      },
      exists(path) {
        ensureVfsInitialized();
        const rel = resolveWorkspacePath(path, true);
        if (rel === "") return true;
        return VFS_NODES.has(rel);
      },
      deleteFile(path) {
        ensureVfsInitialized();
        const rel = resolveWorkspacePath(path, false);
        const node = VFS_NODES.get(rel);
        if (!node) {
          throw new Error(`ENOENT: no such file or directory, unlink '${path}'`);
        }
        const prefix = rel + "/";
        Array.from(VFS_NODES.keys()).forEach((k) => {
          if (k === rel || k.startsWith(prefix)) {
            VFS_NODES.delete(k);
          }
        });
        persistVfsToClientStorage();
        notifyVfsStoreChanged();
        return true;
      },
      unlink(path) {
        return api.deleteFile(path);
      },
      mkdir(path) {
        ensureVfsInitialized();
        const rel = resolveWorkspacePath(path, true);
        if (!rel) return true;
        ensureParentFoldersExist(rel + "/_");
        persistVfsToClientStorage();
        notifyVfsStoreChanged();
        return true;
      },
      stat(path) {
        ensureVfsInitialized();
        const rel = resolveWorkspacePath(path, true);
        if (rel === "") {
          return {
            size: 0,
            isFile: () => false,
            isDirectory: () => true
          };
        }
        const node = VFS_NODES.get(rel);
        if (!node) {
          throw new Error(`ENOENT: no such file or directory, stat '${path}'`);
        }
        const isDir = node.type === "folder";
        const size = isDir ? 0 : (node.content ?? "").length;
        return {
          size,
          isFile: () => !isDir,
          isDirectory: () => isDir
        };
      },
      clear() {
        ensureVfsInitialized();
        VFS_NODES.clear();
        persistVfsToClientStorage();
        notifyVfsStoreChanged();
      }
    };
    return api;
  }
  function bindGlobalVfsApi() {
    const api = createVfsCoreApi();
    const fsPromises = {
      async readFile(path, _options) {
        const content = api.readFile(path);
        if (content === null) {
          throw new Error(`ENOENT: no such file or directory, open '${path}'`);
        }
        return content;
      },
      async writeFile(path, data, _options) {
        api.writeFile(path, serializeFsData(data));
      },
      async appendFile(path, data, _options) {
        api.appendFile(path, serializeFsData(data));
      },
      async unlink(path) {
        api.deleteFile(path);
      },
      async rm(path, _options) {
        api.deleteFile(path);
      },
      async readdir(path = "", _options) {
        return api.listFiles(path);
      },
      async mkdir(path, _options) {
        api.mkdir(path);
        return void 0;
      },
      async rmdir(path, _options) {
        api.deleteFile(path);
      },
      async stat(path) {
        return api.stat(path);
      },
      async access(path, _mode) {
        if (!api.exists(path)) {
          throw new Error(`ENOENT: no such file or directory, access '${path}'`);
        }
      },
      async exists(path) {
        return api.exists(path);
      },
      async copyFile(src, dest) {
        const content = api.readFile(src);
        if (content === null) {
          throw new Error(`ENOENT: no such file or directory, copyfile '${src}'`);
        }
        api.writeFile(dest, content);
      },
      async rename(oldPath, newPath) {
        const content = api.readFile(oldPath);
        if (content === null) {
          throw new Error(`ENOENT: no such file or directory, rename '${oldPath}'`);
        }
        api.writeFile(newPath, content);
        api.deleteFile(oldPath);
      }
    };
    const fsShim = {
      promises: fsPromises,
      readFileSync(path, _options) {
        const content = api.readFile(path);
        if (content === null) {
          throw new Error(`ENOENT: no such file or directory, open '${path}'`);
        }
        return content;
      },
      writeFileSync(path, data, _options) {
        api.writeFile(path, serializeFsData(data));
      },
      appendFileSync(path, data, _options) {
        api.appendFile(path, serializeFsData(data));
      },
      existsSync(path) {
        return api.exists(path);
      },
      unlinkSync(path) {
        api.deleteFile(path);
      },
      rmSync(path, _options) {
        api.deleteFile(path);
      },
      readdirSync(path = "") {
        return api.listFiles(path);
      },
      mkdirSync(path, _options) {
        api.mkdir(path);
        return void 0;
      },
      rmdirSync(path, _options) {
        api.deleteFile(path);
      },
      statSync(path) {
        return api.stat(path);
      },
      copyFileSync(src, dest) {
        const content = api.readFile(src);
        if (content === null) {
          throw new Error(`ENOENT: no such file or directory, copyfile '${src}'`);
        }
        api.writeFile(dest, content);
      },
      renameSync(oldPath, newPath) {
        const content = api.readFile(oldPath);
        if (content === null) {
          throw new Error(`ENOENT: no such file or directory, rename '${oldPath}'`);
        }
        api.writeFile(newPath, content);
        api.deleteFile(oldPath);
      }
    };
    globalThis.__VFS__ = api;
    globalThis.vfs = api;
    globalThis.__FS_SHIM__ = fsShim;
  }

  // src/ui/vfs.ts
  var pendingVfsDeletePath = null;
  function renderVfsTreeUI() {
    const treeEl = $("vfsTreeList");
    if (!treeEl) return;
    ensureVfsInitialized();
    const activePath = uiHooks.getActiveWorkspacePath();
    const childrenOf = (parentPath) => {
      const list = [];
      VFS_NODES.forEach((node) => {
        if (node.parentPath === parentPath) list.push(node);
      });
      return list.sort((a, b) => {
        if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    };
    const buildConfirmHtml = (node) => {
      if (pendingVfsDeletePath !== node.path) return "";
      return `<div class="vfs-del-confirm" data-vfs-confirm-box="${esc(node.path)}"><span class="vfs-del-confirm-text">\u786E\u8BA4\u5220\u9664 ${esc(node.name)}\uFF1F</span><span class="vfs-del-confirm-actions"><button type="button" class="vfs-confirm-btn danger" data-vfs-confirm-del="${esc(node.path)}">\u786E\u8BA4</button><button type="button" class="vfs-confirm-btn" data-vfs-cancel-del="${esc(node.path)}">\u53D6\u6D88</button></span></div>`;
    };
    const renderNode = (node, depth) => {
      const padLeft = 8 + depth * 14;
      const canDel = !node.readonly;
      const delBtnHtml = canDel ? `<span class="vfs-row-actions"><button type="button" class="vfs-del-btn" data-vfs-del="${esc(node.path)}" title="\u5220\u9664">\u274C</button></span>` : "";
      if (node.type === "folder") {
        const isOpen = VFS_EXPANDED_FOLDERS.has(node.path);
        const kids = childrenOf(node.path);
        return `<div class="vfs-folder-row" data-vfs-folder="${esc(node.path)}" style="padding-left:${padLeft}px" title="\u5355\u51FB\u5C55\u5F00/\u6298\u53E0\u76EE\u5F55 \xB7 \u53CC\u51FB\u91CD\u547D\u540D\u76EE\u5F55"><span class="vfs-caret">${isOpen ? "\u25BE" : "\u25B8"}</span><span class="vfs-icon">\u{1F4C1}</span><span class="vfs-name">${esc(node.name)}/</span>` + delBtnHtml + `</div>` + buildConfirmHtml(node) + (isOpen ? `<div class="vfs-folder-children">${kids.map((k) => renderNode(k, depth + 1)).join("")}</div>` : "");
      }
      const isAct = Boolean(activePath && node.path === activePath);
      const ext = (node.name.split(".").pop() || "").toLowerCase();
      const icon = ext === "ipynb" ? "\u{1F4D3}" : ext === "py" ? "\u{1F40D}" : ext === "ts" ? "\u{1F4D8}" : ext === "json" ? "\u{1F5C2}" : "\u{1F4C4}";
      return `<div class="vfs-file-row${isAct ? " active" : ""}" data-vfs-file="${esc(node.path)}" style="padding-left:${padLeft}px" title="${esc(node.path)}\uFF08\u5355\u51FB\u6253\u5F00 \xB7 \u53CC\u51FB\u91CD\u547D\u540D\uFF09"><span class="vfs-icon">${icon}</span><span class="vfs-name">${esc(node.name)}</span>` + delBtnHtml + `</div>` + buildConfirmHtml(node);
    };
    const roots = childrenOf("");
    if (roots.length === 0) {
      treeEl.innerHTML = `<div class="vfs-empty-hint" style="padding:14px 10px;color:#64748b;font-size:11.5px;text-align:center;">\u7A7A\u76EE\u5F55</div>`;
    } else {
      treeEl.innerHTML = roots.map((r) => renderNode(r, 0)).join("");
    }
    const footEl = $("vfsFootStatus");
    if (footEl) {
      let fileCount = 0;
      let totalBytes = 0;
      VFS_NODES.forEach((n) => {
        if (n.type === "file") {
          fileCount++;
          totalBytes += (n.content || "").length;
        }
      });
      const kb = (totalBytes / 1024).toFixed(1);
      footEl.textContent = `${fileCount} \u4E2A\u6587\u4EF6 (${kb} KB)`;
    }
  }
  subscribeVfsStore(() => {
    renderVfsTreeUI();
  });
  function openVfsFile(rawPath) {
    ensureVfsInitialized();
    let path = rawPath;
    try {
      path = resolveWorkspacePath(rawPath, false);
    } catch (err) {
      say(`\u2717 ${err instanceof Error ? err.message : String(err)}`, "err");
      return;
    }
    const node = VFS_NODES.get(path);
    if (!node || node.type !== "file") return;
    if (node.name.endsWith(".ipynb")) {
      uiHooks.openVfsNotebookFile(node.name, node.content);
      return;
    }
    const isPyFile = node.name.endsWith(".py");
    if (isPyFile && appState.LANG !== "python" && typeof PY_ENGINE !== "undefined" && PY_ENGINE.setLang) {
      PY_ENGINE.setLang("python");
    } else if (node.name.endsWith(".ts") && appState.LANG === "python" && typeof PY_ENGINE !== "undefined" && PY_ENGINE.setLang) {
      PY_ENGINE.setLang("ts");
    }
    uiHooks.setViewMode("script");
    uiHooks.openVfsScriptFile(node.path, node.name, node.content || "");
    renderVfsTreeUI();
    say(`\u{1F4C2} \u5DF2\u6253\u5F00 ${node.path}`, "ok");
  }
  function initVfsSidebarEvents() {
    const fileInput = $("fileInput");
    const vfsSidebar = $("vfsSidebar");
    const b1 = $("btnToggleVfs");
    const b2 = $("nbBtnToggleVfs");
    if (vfsSidebar) {
      vfsSidebar.hidden = true;
    }
    if (b1 && b1.classList) b1.classList.remove("active");
    if (b2 && b2.classList) b2.classList.remove("active");
    const toggleVfsSidebar = () => {
      if (!vfsSidebar) return;
      vfsSidebar.hidden = !vfsSidebar.hidden;
      const isVisible = !vfsSidebar.hidden;
      if (b1 && b1.classList) b1.classList.toggle("active", isVisible);
      if (b2 && b2.classList) b2.classList.toggle("active", isVisible);
    };
    if (b1) b1.onclick = toggleVfsSidebar;
    if (b2) b2.onclick = toggleVfsSidebar;
    const btnNewFile = $("vfsBtnNewFile");
    if (btnNewFile) {
      btnNewFile.onclick = () => {
        ensureVfsInitialized();
        const ext = appState.LANG === "python" ? ".py" : ".ts";
        let idx = 1;
        while (VFS_NODES.has(`file_${idx}${ext}`)) idx++;
        const name = `file_${idx}${ext}`;
        const path = name;
        const content = appState.LANG === "python" ? `# ${name}
` : `// ${name}
`;
        VFS_NODES.set(path, {
          path,
          name,
          type: "file",
          parentPath: "",
          content
        });
        persistVfsToClientStorage();
        openVfsFile(path);
      };
    }
    const btnNewFolder = $("vfsBtnNewFolder");
    if (btnNewFolder) {
      btnNewFolder.onclick = () => {
        ensureVfsInitialized();
        let idx = 1;
        while (VFS_NODES.has(`folder_${idx}`)) idx++;
        const name = `folder_${idx}`;
        const path = name;
        VFS_NODES.set(path, {
          path,
          name,
          type: "folder",
          parentPath: ""
        });
        VFS_EXPANDED_FOLDERS.add(path);
        persistVfsToClientStorage();
        renderVfsTreeUI();
        say(`\u{1F4C1} \u5DF2\u521B\u5EFA\u6587\u4EF6\u5939 ${path}/\uFF08\u53CC\u51FB\u53EF\u91CD\u547D\u540D\uFF09`, "ok");
      };
    }
    const btnUpload = $("vfsBtnUpload");
    if (btnUpload && fileInput) {
      btnUpload.onclick = () => fileInput.click();
    }
    const vfsTreeList = $("vfsTreeList");
    if (!vfsTreeList || !vfsTreeList.addEventListener) return;
    vfsTreeList.addEventListener("click", (e) => {
      const target = eventTargetElement(e);
      if (!target) return;
      const confirmDelBtn = closestElement(target, "[data-vfs-confirm-del]");
      if (confirmDelBtn) {
        e.stopPropagation();
        const delPath = confirmDelBtn.getAttribute("data-vfs-confirm-del");
        pendingVfsDeletePath = null;
        if (delPath && VFS_NODES.has(delPath)) {
          const prefix = delPath + "/";
          Array.from(VFS_NODES.keys()).forEach((k) => {
            if (k === delPath || k.startsWith(prefix)) {
              VFS_NODES.delete(k);
            }
          });
          persistVfsToClientStorage();
          uiHooks.onVfsFileDeleted(delPath);
          renderVfsTreeUI();
          say(`\u{1F5D1} \u5DF2\u4ECE\u6587\u4EF6\u76EE\u5F55\u79FB\u9664 ${delPath}`, "dim");
        } else {
          renderVfsTreeUI();
        }
        return;
      }
      const cancelDelBtn = closestElement(target, "[data-vfs-cancel-del]");
      if (cancelDelBtn) {
        e.stopPropagation();
        pendingVfsDeletePath = null;
        renderVfsTreeUI();
        return;
      }
      const delBtn = closestElement(target, "[data-vfs-del]");
      if (delBtn) {
        e.stopPropagation();
        const delPath = delBtn.getAttribute("data-vfs-del");
        if (delPath && VFS_NODES.has(delPath)) {
          pendingVfsDeletePath = pendingVfsDeletePath === delPath ? null : delPath;
          renderVfsTreeUI();
        }
        return;
      }
      const folderRow = closestElement(target, "[data-vfs-folder]");
      if (folderRow) {
        const folderPath = folderRow.getAttribute("data-vfs-folder");
        if (folderPath) {
          if (VFS_EXPANDED_FOLDERS.has(folderPath)) VFS_EXPANDED_FOLDERS.delete(folderPath);
          else VFS_EXPANDED_FOLDERS.add(folderPath);
          renderVfsTreeUI();
        }
        return;
      }
      const fileRow = closestElement(target, "[data-vfs-file]");
      if (fileRow) {
        const filePath = fileRow.getAttribute("data-vfs-file");
        if (filePath) {
          const curActivePath = uiHooks.getActiveWorkspacePath();
          if (filePath !== curActivePath || editor.value !== (VFS_NODES.get(filePath)?.content ?? "")) {
            openVfsFile(filePath);
          }
        }
      }
    });
    vfsTreeList.addEventListener("dblclick", (e) => {
      const row = closestElement(e, "[data-vfs-file], [data-vfs-folder]");
      if (!row) return;
      const oldPath = row.getAttribute("data-vfs-file") || row.getAttribute("data-vfs-folder");
      if (!oldPath) return;
      const node = VFS_NODES.get(oldPath);
      if (!node || node.readonly) return;
      const nameSpan = row.querySelector ? row.querySelector(".vfs-name") : null;
      if (!nameSpan) return;
      const input = document.createElement("input");
      input.type = "text";
      input.className = "vfs-rename-input";
      input.value = node.name;
      nameSpan.replaceWith(input);
      input.focus();
      input.select();
      let committed = false;
      const commit = () => {
        if (committed) return;
        committed = true;
        const nextName = input.value.trim().replace(/[\\/:*?"<>|]/g, "");
        if (nextName && nextName !== node.name) {
          const nextPath = node.parentPath ? `${node.parentPath}/${nextName}` : nextName;
          VFS_NODES.delete(oldPath);
          node.name = nextName;
          node.path = nextPath;
          VFS_NODES.set(nextPath, node);
          persistVfsToClientStorage();
          uiHooks.onVfsFileRenamed(oldPath, nextPath, nextName);
          say(`\u2713 \u5DF2\u91CD\u547D\u540D\u4E3A ${nextPath}`, "ok");
        }
        renderVfsTreeUI();
      };
      input.addEventListener("blur", commit);
      input.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") {
          ev.preventDefault();
          input.blur();
        } else if (ev.key === "Escape") {
          committed = true;
          renderVfsTreeUI();
        }
      });
    });
  }

  // src/ui/script-tabs.ts
  var script_tabs_exports = {};
  __export(script_tabs_exports, {
    PY_SAMPLE_METADATA: () => PY_SAMPLE_METADATA,
    SCRIPT_TABS: () => SCRIPT_TABS,
    TS_SAMPLE_METADATA: () => TS_SAMPLE_METADATA,
    ensureScriptTabsForLang: () => ensureScriptTabsForLang,
    getActiveScriptTab: () => getActiveScriptTab,
    getPySamplesDict: () => getPySamplesDict,
    handleVfsFileDeletedInTabs: () => handleVfsFileDeletedInTabs,
    handleVfsFileRenamedInTabs: () => handleVfsFileRenamedInTabs,
    initScriptTabsAndImportEvents: () => initScriptTabsAndImportEvents,
    isScriptTabSyncing: () => isScriptTabSyncing,
    nextScriptTabId: () => nextScriptTabId,
    onVfsFileDeleted: () => onVfsFileDeleted,
    onVfsFileRenamed: () => onVfsFileRenamed,
    openSampleScriptTab: () => openSampleScriptTab,
    openVfsScriptFile: () => openVfsScriptFile,
    renderImportSampleMenu: () => renderImportSampleMenu,
    renderScriptTabsUI: () => renderScriptTabsUI,
    setScriptTabSyncing: () => setScriptTabSyncing,
    syncActiveScriptTabFromFileName: () => syncActiveScriptTabFromFileName,
    syncActiveScriptTabSource: () => syncActiveScriptTabSource,
    upsertSampleScriptTab: () => upsertSampleScriptTab,
    upsertVfsScriptTab: () => upsertVfsScriptTab
  });

  // src/runtime/script-tabs-store.ts
  var scriptTabSeq = 1;
  var syncingScriptTab = false;
  function nextScriptTabId() {
    return "stab_" + ++scriptTabSeq;
  }
  function isScriptTabSyncing() {
    return syncingScriptTab;
  }
  function setScriptTabSyncing(val) {
    syncingScriptTab = val;
  }
  var SCRIPT_TABS = {
    ts: { activeTabId: "", tabs: [] },
    python: { activeTabId: "", tabs: [] }
  };
  var TS_SAMPLE_METADATA = [
    { key: "showcase", label: "showcase.ts \xB7 \u7EFC\u5408\u6F14\u793A", desc: "\u6ED1\u52A8\u7A97\u53E3 + \u5355\u8C03\u6808 + Map + \u6811\u4E0E\u56FE" },
    { key: "mergesort", label: "mergesort.ts \xB7 \u5F52\u5E76\u6392\u5E8F", desc: "\u5206\u6CBB\u9012\u5F52\u4E0E\u5DE6\u53F3\u5B50\u6570\u7EC4\u5F52\u5E76" },
    { key: "debug_crash", label: "debug_crash.ts \xB7 \u8D8A\u754C\u6392\u9519", desc: "\u4E8C\u5206\u67E5\u627E <= \u8D8A\u754C Bug \u73B0\u573A\u5B9A\u4F4D" },
    { key: "lcs", label: "lcs.ts \xB7 \u6700\u957F\u516C\u5171\u5B50\u5E8F\u5217", desc: "\u4E8C\u7EF4 DP \u7F51\u683C\u89C4\u5212" },
    { key: "analyze", label: "analyze.ts \xB7 \u9891\u7387\u7EDF\u8BA1", desc: "\u6570\u7EC4\u4E0E Map \u54C8\u5E0C\u7EDF\u8BA1" },
    { key: "window", label: "window.ts \xB7 \u6ED1\u52A8\u7A97\u53E3", desc: "\u53CC\u6307\u9488\u5B9A\u957F\u6ED1\u52A8\u7A97\u53E3" },
    { key: "structures", label: "structures.ts \xB7 \u6570\u636E\u7ED3\u6784\u5168\u5BB6\u6876", desc: "\u6808 / \u961F\u5217 / \u5806 / \u5E76\u67E5\u96C6 / \u6811 / \u56FE" },
    { key: "counter", label: "counter.ts \xB7 \u95ED\u5305\u8BA1\u6570\u5668", desc: "\u9AD8\u9636\u51FD\u6570\u4E0E\u8BCD\u6CD5\u4F5C\u7528\u57DF\u95ED\u5305" },
    { key: "classes", label: "classes.ts \xB7 \u7C7B\u4E0E\u7EE7\u627F", desc: "class / extends / super \u5B9E\u4F8B\u65B9\u6CD5" },
    { key: "async_loop", label: "async_loop.ts \xB7 \u4E8B\u4EF6\u5FAA\u73AF", desc: "async / await \u4E0E\u5FAE\u4EFB\u52A1\u961F\u5217" }
  ];
  var PY_SAMPLE_METADATA = [
    { key: "quickstart", label: "quickstart.py \xB7 \u5192\u6CE1\u6392\u5E8F", desc: "Python \u5217\u8868\u539F\u5730\u4EA4\u6362\u4E0E\u53CC\u5C42\u5FAA\u73AF" },
    { key: "binary_search", label: "binary_search.py \xB7 \u4E8C\u5206\u67E5\u627E", desc: "\u53CC\u6307\u9488\u6298\u534A\u641C\u7D22\u4E0E checkpoint()" },
    { key: "bfs", label: "bfs.py \xB7 BFS \u5E7F\u5EA6\u4F18\u5148\u641C\u7D22", desc: "deque \u961F\u5217\u4E0E\u96C6\u5408\u8BBF\u95EE\u6807\u8BB0" },
    { key: "lcs", label: "lcs.py \xB7 DP \u6700\u957F\u516C\u5171\u5B50\u5E8F\u5217", desc: "\u4E8C\u7EF4\u5217\u8868\u63A8\u5BFC\u5F0F\u4E0E\u52A8\u6001\u89C4\u5212" },
    { key: "structures", label: "structures.py \xB7 \u7ED3\u6784\u96C6\u5408", desc: "TreeNode / ListNode / \u5B57\u5178 / \u96C6\u5408" },
    { key: "classes", label: "classes.py \xB7 \u7C7B\u4E0E\u5B9E\u4F8B", desc: "Counter \u7C7B\u6784\u9020\u4E0E\u5B9E\u4F8B\u5C5E\u6027\u8FFD\u8E2A" }
  ];
  function getPySamplesDict() {
    const eng = typeof PY_ENGINE !== "undefined" ? PY_ENGINE : null;
    return eng && eng.samples ? eng.samples : {};
  }
  function ensureScriptTabsForLang(lang) {
    ensureVfsInitialized();
    const store = SCRIPT_TABS[lang];
    if (store.tabs.length === 0) {
      const curLang = appState.LANG;
      const curFileName = appState.FILE_NAME;
      const editorSrc = uiHooks.getEditorSource();
      const defaultTitle = lang === "python" ? curLang === "python" && curFileName ? curFileName : "quickstart.py" : curLang !== "python" && curFileName ? curFileName : "showcase.ts";
      const defaultSrc = lang === "python" ? curLang === "python" && editorSrc ? editorSrc : getPySamplesDict().quickstart || "" : curLang !== "python" && editorSrc ? editorSrc : SAMPLES.showcase || "";
      const tabId = nextScriptTabId();
      store.tabs.push({
        id: tabId,
        title: defaultTitle,
        lang,
        source: defaultSrc,
        vfsPath: "",
        isSample: true
      });
      store.activeTabId = tabId;
    }
    const firstTab = store.tabs[0];
    if (firstTab && !store.tabs.some((t) => t.id === store.activeTabId)) {
      store.activeTabId = firstTab.id;
    }
    return store;
  }
  function getActiveScriptTab(lang) {
    const targetLang = lang || (appState.LANG === "python" ? "python" : "ts");
    const store = ensureScriptTabsForLang(targetLang);
    const found = store.tabs.find((t) => t.id === store.activeTabId) ?? store.tabs[0];
    if (found) return found;
    return {
      id: "stab_0",
      title: targetLang === "python" ? "quickstart.py" : "showcase.ts",
      lang: targetLang,
      source: "",
      vfsPath: "",
      isSample: true
    };
  }
  function syncActiveScriptTabSource(src) {
    const lang = appState.LANG === "python" ? "python" : "ts";
    const activeTab = getActiveScriptTab(lang);
    if (!activeTab) return;
    activeTab.source = src;
    if (!activeTab.isSample && activeTab.vfsPath) {
      const node = VFS_NODES.get(activeTab.vfsPath);
      if (node && node.type === "file") {
        node.content = src;
        persistVfsToClientStorage();
      }
    }
  }
  function upsertSampleScriptTab(title, source, lang) {
    const targetLang = lang || (appState.LANG === "python" ? "python" : "ts");
    const store = ensureScriptTabsForLang(targetLang);
    let tab = store.tabs.find((t) => (t.isSample || !t.vfsPath) && t.title === title);
    if (!tab) {
      tab = {
        id: nextScriptTabId(),
        title,
        lang: targetLang,
        source,
        vfsPath: "",
        isSample: true
      };
      store.tabs.push(tab);
    } else {
      tab.source = source;
      tab.vfsPath = "";
      tab.isSample = true;
    }
    store.activeTabId = tab.id;
    return tab;
  }
  function upsertVfsScriptTab(path, name, content, lang) {
    const targetLang = lang || (appState.LANG === "python" ? "python" : "ts");
    const store = ensureScriptTabsForLang(targetLang);
    let tab = store.tabs.find((t) => !t.isSample && t.vfsPath === path);
    if (!tab) {
      tab = {
        id: nextScriptTabId(),
        title: name,
        lang: targetLang,
        source: content,
        vfsPath: path,
        isSample: false
      };
      store.tabs.push(tab);
    } else {
      tab.source = content;
      tab.vfsPath = path;
      tab.isSample = false;
    }
    store.activeTabId = tab.id;
    return tab;
  }
  function handleVfsFileDeletedInTabs(delPath) {
    const prefix = delPath + "/";
    ["ts", "python"].forEach((l) => {
      const st = SCRIPT_TABS[l];
      st.tabs.forEach((t) => {
        if (t.vfsPath === delPath || t.vfsPath.startsWith(prefix)) {
          t.vfsPath = "";
        }
      });
    });
  }
  function handleVfsFileRenamedInTabs(oldPath, nextPath, nextName) {
    const lang = appState.LANG === "python" ? "python" : "ts";
    const store = ensureScriptTabsForLang(lang);
    const matchingTab = store.tabs.find((t) => t.vfsPath === oldPath);
    if (!matchingTab) return { updated: false, isActive: false };
    matchingTab.title = nextName;
    matchingTab.vfsPath = nextPath;
    return {
      updated: true,
      isActive: store.activeTabId === matchingTab.id
    };
  }

  // src/ui/script-tabs.ts
  function openSampleScriptTab(title, source, lang) {
    if (editor && editor.value) {
      syncActiveScriptTabSource(editor.value);
    }
    upsertSampleScriptTab(title, source, lang);
    setScriptTabSyncing(true);
    if (editor) editor.value = source;
    setFileName(title);
    setScriptTabSyncing(false);
    renderScriptTabsUI();
    renderVfsTreeUI();
  }
  function syncActiveScriptTabFromFileName(newFileName) {
    if (isScriptTabSyncing()) return;
    const lang = appState.LANG === "python" ? "python" : "ts";
    const store = ensureScriptTabsForLang(lang);
    const activeTab = store.tabs.find((t) => t.id === store.activeTabId);
    if (!activeTab) return;
    const oldPath = activeTab.vfsPath;
    activeTab.title = newFileName;
    activeTab.source = editor ? editor.value : activeTab.source;
    if (!activeTab.isSample && oldPath && VFS_NODES.has(oldPath)) {
      activeTab.vfsPath = newFileName;
      VFS_NODES.delete(oldPath);
      VFS_NODES.set(activeTab.vfsPath, {
        path: activeTab.vfsPath,
        name: newFileName,
        type: "file",
        parentPath: "",
        content: activeTab.source
      });
      persistVfsToClientStorage();
    }
    renderScriptTabsUI();
    renderVfsTreeUI();
  }
  function renderScriptTabsUI() {
    const tabsEl = $("scriptTabsList");
    if (!tabsEl) return;
    const lang = appState.LANG === "python" ? "python" : "ts";
    const store = ensureScriptTabsForLang(lang);
    const activeTab = getActiveScriptTab(lang);
    tabsEl.innerHTML = store.tabs.map((t) => {
      const isAct = t.id === activeTab.id;
      const iconCls = lang === "python" ? "py-icon" : "ts-icon";
      return `<div class="nb-tab${isAct ? " active" : ""}" data-script-tab-id="${esc(t.id)}" title="\u5355\u51FB\u5207\u6362\u6807\u7B7E\u9875 \xB7 \u53CC\u51FB\u6587\u4EF6\u540D\u91CD\u547D\u540D"><span class="nb-tab-icon ${iconCls}" aria-hidden="true"></span><span class="nb-tab-title">${esc(t.title)}</span>` + (store.tabs.length > 1 ? `<button type="button" class="nb-tab-close" data-close-script-tab="${esc(t.id)}" title="\u5173\u95ED\u6807\u7B7E\u9875">\xD7</button>` : "") + `</div>`;
    }).join("") + `<button type="button" class="nb-tab-add" id="scriptBtnNewTab" title="\u65B0\u5EFA\u4EE3\u7801\u6587\u4EF6\u6807\u7B7E\u9875">\uFF0B</button>`;
  }
  function renderImportSampleMenu() {
    const listEl = $("importSampleList");
    if (!listEl) return;
    const isPy = appState.LANG === "python";
    const items = isPy ? PY_SAMPLE_METADATA : TS_SAMPLE_METADATA;
    const folderPrefix = isPy ? "examples/python/" : "examples/ts/";
    const nbItemHtml = `<button type="button" class="import-sample-item" data-import-sample-notebook="Intro.ipynb"><span class="import-sample-name">\u{1F4D3} Intro.ipynb \xB7 \u4EA4\u4E92\u5F0F\u7B14\u8BB0\u672C\u793A\u4F8B</span><span class="import-sample-path">examples/notebooks/</span></button>`;
    listEl.innerHTML = (appState.VIEW_MODE === "notebook" ? nbItemHtml : "") + items.map(
      (item) => `<button type="button" class="import-sample-item" data-import-sample-key="${esc(item.key)}" title="${esc(item.desc)}"><span class="import-sample-name">${esc(item.label)}</span><span class="import-sample-path">${esc(folderPrefix + item.key + (isPy ? ".py" : ".ts"))}</span></button>`
    ).join("") + (appState.VIEW_MODE !== "notebook" ? nbItemHtml : "");
  }
  function initScriptTabsAndImportEvents() {
    const importMenuWrap = $("importMenuWrap");
    const btnImport = $("btnImport");
    const btnUploadLocalFile = $("btnUploadLocalFile");
    const importSampleList = $("importSampleList");
    const fileInput = $("fileInput");
    if (btnImport && importMenuWrap) {
      btnImport.onclick = (e) => {
        if (e && typeof e.stopPropagation === "function") e.stopPropagation();
        renderImportSampleMenu();
        if (importMenuWrap.classList) {
          importMenuWrap.classList.toggle("open");
        }
      };
      addEventListener("click", (e) => {
        if (!importMenuWrap.classList || !importMenuWrap.classList.contains("open")) return;
        if (importMenuWrap.contains && importMenuWrap.contains(eventTargetNode(e))) return;
        importMenuWrap.classList.remove("open");
      });
    }
    if (btnUploadLocalFile && fileInput) {
      btnUploadLocalFile.onclick = (e) => {
        if (e && typeof e.stopPropagation === "function") e.stopPropagation();
        if (importMenuWrap && importMenuWrap.classList) importMenuWrap.classList.remove("open");
        fileInput.click();
      };
    }
    if (importSampleList && importSampleList.addEventListener) {
      importSampleList.addEventListener("click", (e) => {
        const btn = closestElement(e, ".import-sample-item");
        if (!btn) return;
        if (importMenuWrap && importMenuWrap.classList) importMenuWrap.classList.remove("open");
        const nbFile = btn.getAttribute("data-import-sample-notebook");
        if (nbFile) {
          uiHooks.setViewMode("notebook");
          say(`\u2713 \u5DF2\u52A0\u8F7D\u5185\u7F6E\u793A\u4F8B\u7B14\u8BB0\u672C ${nbFile}`, "ok");
          return;
        }
        const sampleKey = btn.getAttribute("data-import-sample-key");
        if (sampleKey) {
          if (appState.VIEW_MODE === "notebook") {
            const code = appState.LANG === "python" ? getPySamplesDict()[sampleKey] || "" : SAMPLES[sampleKey] || "";
            if (code) {
              uiHooks.importSampleIntoNotebook(code, sampleKey);
            }
            return;
          }
          loadSample(sampleKey);
        }
      });
    }
    const scriptTabsEl = $("scriptTabsList");
    if (scriptTabsEl && scriptTabsEl.addEventListener) {
      scriptTabsEl.addEventListener("click", (e) => {
        const target = eventTargetElement(e);
        if (!target) return;
        const lang = appState.LANG === "python" ? "python" : "ts";
        const store = ensureScriptTabsForLang(lang);
        const closeBtn = closestElement(target, "[data-close-script-tab]");
        if (closeBtn) {
          e.stopPropagation();
          const closeId = closeBtn.getAttribute("data-close-script-tab");
          if (store.tabs.length <= 1) return;
          const idx = store.tabs.findIndex((t) => t.id === closeId);
          if (idx >= 0) {
            store.tabs.splice(idx, 1);
            if (store.activeTabId === closeId) {
              const fallbackTab = store.tabs[Math.max(0, idx - 1)];
              if (fallbackTab) store.activeTabId = fallbackTab.id;
              const nextTab = getActiveScriptTab(lang);
              setScriptTabSyncing(true);
              editor.value = nextTab.source;
              setFileName(nextTab.title);
              setScriptTabSyncing(false);
              resetTraceState();
              updateEditorChrome();
            }
            renderScriptTabsUI();
            renderVfsTreeUI();
          }
          return;
        }
        const newBtn = closestElement(target, "#scriptBtnNewTab");
        if (newBtn) {
          syncActiveScriptTabSource(editor ? editor.value : "");
          const ext = lang === "python" ? ".py" : ".ts";
          const newTitle = `untitled-${store.tabs.length + 1}${ext}`;
          const newTab = {
            id: nextScriptTabId(),
            title: newTitle,
            lang,
            source: lang === "python" ? "# \u65B0\u5EFA Python \u811A\u672C\n" : "// \u65B0\u5EFA TypeScript \u811A\u672C\n",
            vfsPath: "",
            isSample: false
          };
          store.tabs.push(newTab);
          store.activeTabId = newTab.id;
          setScriptTabSyncing(true);
          editor.value = newTab.source;
          setFileName(newTab.title);
          setScriptTabSyncing(false);
          resetTraceState();
          updateEditorChrome();
          renderScriptTabsUI();
          renderVfsTreeUI();
          if (editor && typeof editor.focus === "function") editor.focus();
          return;
        }
        const tabEl = closestElement(target, "[data-script-tab-id]");
        if (tabEl) {
          const tabId = tabEl.getAttribute("data-script-tab-id");
          if (tabId && store.activeTabId !== tabId) {
            syncActiveScriptTabSource(editor ? editor.value : "");
            store.activeTabId = tabId;
            const nextTab = getActiveScriptTab(lang);
            setScriptTabSyncing(true);
            editor.value = nextTab.source;
            setFileName(nextTab.title);
            setScriptTabSyncing(false);
            resetTraceState();
            updateEditorChrome();
            renderScriptTabsUI();
            renderVfsTreeUI();
          }
        }
      });
      scriptTabsEl.addEventListener("dblclick", (e) => {
        const tabEl = closestElement(e, "[data-script-tab-id]");
        if (!tabEl) return;
        const tabId = tabEl.getAttribute("data-script-tab-id");
        const lang = appState.LANG === "python" ? "python" : "ts";
        const store = ensureScriptTabsForLang(lang);
        const targetTab = store.tabs.find((t) => t.id === tabId);
        if (!targetTab) return;
        const titleSpan = tabEl.querySelector ? tabEl.querySelector(".nb-tab-title") : null;
        if (!titleSpan) return;
        const input = document.createElement("input");
        input.type = "text";
        input.className = "nb-tab-rename-input";
        input.value = targetTab.title;
        titleSpan.replaceWith(input);
        input.focus();
        input.select();
        let committed = false;
        const commit = () => {
          if (committed) return;
          committed = true;
          const rawVal = input.value.trim();
          if (rawVal) {
            const ext = lang === "python" ? ".py" : ".ts";
            const nextName = /\.[A-Za-z0-9]{1,12}$/.test(rawVal) ? rawVal : rawVal + ext;
            const oldPath = targetTab.vfsPath;
            targetTab.title = nextName;
            if (!targetTab.isSample && oldPath && VFS_NODES.has(oldPath)) {
              targetTab.vfsPath = nextName;
              VFS_NODES.delete(oldPath);
              VFS_NODES.set(targetTab.vfsPath, {
                path: targetTab.vfsPath,
                name: nextName,
                type: "file",
                parentPath: "",
                content: targetTab.source
              });
              persistVfsToClientStorage();
            }
            if (store.activeTabId === targetTab.id) {
              setScriptTabSyncing(true);
              setFileName(nextName);
              setScriptTabSyncing(false);
            }
            say(`\u2713 \u6587\u4EF6\u5DF2\u91CD\u547D\u540D\u4E3A ${nextName}`, "ok");
          }
          renderScriptTabsUI();
          renderVfsTreeUI();
        };
        input.addEventListener("blur", commit);
        input.addEventListener("keydown", (ev) => {
          if (ev.key === "Enter") {
            ev.preventDefault();
            input.blur();
          } else if (ev.key === "Escape") {
            committed = true;
            renderScriptTabsUI();
          }
        });
      });
    }
    if (editor && editor.addEventListener) {
      editor.addEventListener("input", () => {
        syncActiveScriptTabSource(editor.value);
      });
    }
  }
  function openVfsScriptFile(path, name, content) {
    const lang = appState.LANG === "python" ? "python" : "ts";
    if (editor && editor.value) {
      syncActiveScriptTabSource(editor.value);
    }
    const tab = upsertVfsScriptTab(path, name, content, lang);
    setScriptTabSyncing(true);
    editor.value = tab.source;
    setFileName(tab.title);
    setScriptTabSyncing(false);
    resetTraceState();
    updateEditorChrome();
    renderScriptTabsUI();
  }
  function onVfsFileDeleted(delPath) {
    handleVfsFileDeletedInTabs(delPath);
    renderScriptTabsUI();
  }
  function onVfsFileRenamed(oldPath, nextPath, nextName) {
    const res = handleVfsFileRenamedInTabs(oldPath, nextPath, nextName);
    if (res.updated) {
      if (res.isActive) {
        setScriptTabSyncing(true);
        setFileName(nextName);
        setScriptTabSyncing(false);
      }
      renderScriptTabsUI();
    }
  }
  registerUiHooks({
    getActiveWorkspacePath: () => getActiveScriptTab().vfsPath,
    openVfsScriptFile,
    onVfsFileDeleted,
    onVfsFileRenamed
  });

  // src/ui/notebook.ts
  var notebook_exports = {};
  __export(notebook_exports, {
    buildTsPreambleFromHistory: () => buildTsPreambleFromHistory,
    buildTsTypecheckContext: () => buildTsTypecheckContext,
    copyNotebookCell: () => copyNotebookCell,
    createDefaultNotebooks: () => createDefaultNotebooks,
    cutNotebookCell: () => cutNotebookCell,
    debugNotebookCell: () => debugNotebookCell,
    debugPythonNotebookCell: () => debugPythonNotebookCell,
    debugTsNotebookCell: () => debugTsNotebookCell,
    deleteCellInModel: () => deleteCellInModel,
    deleteNotebookCell: () => deleteNotebookCell,
    duplicateCellInModel: () => duplicateCellInModel,
    duplicateNotebookCell: () => duplicateNotebookCell,
    ensureLangNotebooks: () => ensureLangNotebooks,
    estimateMarkdownEditorHeight: () => estimateMarkdownEditorHeight,
    exportActiveNotebookIpynb: () => exportActiveNotebookIpynb,
    getActiveCell: () => getActiveCell,
    getActiveNotebook: () => getActiveNotebook,
    getClipboardCell: () => getClipboardCell,
    importNotebookFromJson: () => importNotebookFromJson,
    importSampleIntoNotebook: () => importSampleIntoNotebook,
    initNotebookUI: () => initNotebookUI,
    insertCellInModel: () => insertCellInModel,
    insertNotebookCell: () => insertNotebookCell,
    moveCellInModel: () => moveCellInModel,
    moveFocusToNextCell: () => moveFocusToNextCell,
    moveNotebookCell: () => moveNotebookCell,
    nextCellId: () => nextCellId,
    nextDocId: () => nextDocId,
    normalizeCellTsForNotebook: () => normalizeCellTsForNotebook,
    notebooksByLang: () => notebooksByLang,
    openVfsNotebookFile: () => openVfsNotebookFile,
    parseIpynbJsonToDocument: () => parseIpynbJsonToDocument,
    pasteNotebookCell: () => pasteNotebookCell,
    renderMarkdownHtml: () => renderMarkdownHtml,
    renderNotebookUI: () => renderNotebookUI,
    restartNotebookKernel: () => restartNotebookKernel,
    runAllNotebookCells: () => runAllNotebookCells,
    runNotebookCell: () => runNotebookCell,
    runPythonNotebookCell: () => runPythonNotebookCell,
    runTsNotebookCell: () => runTsNotebookCell,
    serializeNotebookToIpynbJson: () => serializeNotebookToIpynbJson,
    setClipboardCell: () => setClipboardCell,
    setViewMode: () => setViewMode,
    syncNotebookGlobalsToSidePanel: () => syncNotebookGlobalsToSidePanel,
    typecheckNotebookCellTS: () => typecheckNotebookCellTS
  });

  // src/notebook/notebook-model.ts
  var nbClipboardCell = null;
  var nbCellSeq = 100;
  var nbDocSeq = 10;
  function nextCellId() {
    return "cell_" + ++nbCellSeq + "_" + Math.random().toString(36).slice(2, 6);
  }
  function nextDocId() {
    return "nb_" + ++nbDocSeq;
  }
  function getClipboardCell() {
    return nbClipboardCell;
  }
  function setClipboardCell(cell) {
    nbClipboardCell = cell;
  }
  function createDefaultNotebooks(lang) {
    const isPy = lang === "python";
    const c1Id = nextCellId();
    const c2Id = nextCellId();
    const c3Id = nextCellId();
    const c4Id = nextCellId();
    const c5Id = nextCellId();
    const introCells = isPy ? [
      {
        id: c1Id,
        type: "markdown",
        source: "### \u{1F4D3} \u4EA4\u4E92\u5F0F\u7B97\u6CD5\u7B14\u8BB0\u672C (Python Kernel)\n\u652F\u6301**\u8DE8\u5355\u5143\u683C\u5171\u4EAB\u53D8\u91CF\u4E0A\u4E0B\u6587**\u3001\u5185\u8054\u8F93\u51FA\u4EE5\u53CA\u9488\u5BF9\u4EFB\u610F\u5355\u5143\u683C\u7684 **\u{1F41E} \u5355\u6B65\u53EF\u89C6\u5316\u8C03\u8BD5**\uFF08\u53F3\u4FA7\u5B9E\u65F6\u8054\u52A8 `LOCALS` \u4E0E `WATCH` \u6570\u636E\u7ED3\u6784\u753B\u5E03\uFF09\u3002",
        executionCount: null,
        status: "idle",
        output: null,
        markdownRendered: true
      },
      {
        id: c2Id,
        type: "code",
        source: "a = 1",
        executionCount: 3,
        status: "success",
        output: { logs: [], returnValue: null, error: null }
      },
      {
        id: c3Id,
        type: "code",
        source: "print(a)",
        executionCount: 4,
        status: "success",
        output: { logs: ["1"], returnValue: null, error: null }
      },
      {
        id: c4Id,
        type: "code",
        source: '# \u8DE8\u5355\u5143\u683C\u4F7F\u7528\u4E0A\u65B9\u5B9A\u4E49\u7684\u53D8\u91CF a\uFF0C\u6784\u5EFA\u6570\u7EC4\u5E76\u5728\u53F3\u4FA7 WATCH \u9762\u677F\u89C2\u5BDF\nnums = [a, a + 2, a + 4, 9, 13, 18]\nnums.append(25)\nprint("\u5F53\u524D\u6570\u7EC4:", nums)',
        executionCount: null,
        status: "idle",
        output: null
      },
      {
        id: c5Id,
        type: "code",
        source: '# \u70B9\u51FB\u6B64\u5355\u5143\u683C\u53F3\u4E0A\u89D2 \u{1F41E} \u53EF\u57FA\u4E8E\u4E0A\u65B9\u5DF2\u751F\u6210\u7684 nums \u5355\u6B65\u8C03\u8BD5\u4E8C\u5206\u67E5\u627E\nl, r = 0, len(nums) - 1\ntarget = 13\nwhile l <= r:\n    mid = (l + r) // 2\n    checkpoint("mid", mid, nums[mid])\n    if nums[mid] == target:\n        print("\u627E\u5230\u76EE\u6807\u7D22\u5F15:", mid)\n        break\n    elif nums[mid] < target:\n        l = mid + 1\n    else:\n        r = mid - 1',
        executionCount: null,
        status: "idle",
        output: null
      }
    ] : [
      {
        id: c1Id,
        type: "markdown",
        source: "### \u{1F4D3} \u4EA4\u4E92\u5F0F\u7B97\u6CD5\u7B14\u8BB0\u672C (TypeScript Kernel)\n\u652F\u6301**\u8DE8\u5355\u5143\u683C\u5171\u4EAB\u53D8\u91CF\u4E0A\u4E0B\u6587**\u3001\u5185\u8054\u8F93\u51FA\u4EE5\u53CA\u9488\u5BF9\u4EFB\u610F\u5355\u5143\u683C\u7684 **\u{1F41E} \u5355\u6B65\u53EF\u89C6\u5316\u8C03\u8BD5**\uFF08\u53F3\u4FA7\u5B9E\u65F6\u8054\u52A8 `LOCALS` \u4E0E `WATCH` \u6570\u636E\u7ED3\u6784\u753B\u5E03\uFF09\u3002",
        executionCount: null,
        status: "idle",
        output: null,
        markdownRendered: true
      },
      {
        id: c2Id,
        type: "code",
        source: "let a: number = 1;",
        executionCount: 3,
        status: "success",
        output: { logs: [], returnValue: null, error: null }
      },
      {
        id: c3Id,
        type: "code",
        source: "console.log(a);",
        executionCount: 4,
        status: "success",
        output: { logs: ["1"], returnValue: null, error: null }
      },
      {
        id: c4Id,
        type: "code",
        source: "// \u8DE8\u5355\u5143\u683C\u4F7F\u7528\u4E0A\u65B9\u5B9A\u4E49\u7684\u53D8\u91CF a\uFF0C\u6784\u5EFA\u6570\u7EC4\u5E76\u5728\u53F3\u4FA7 WATCH \u9762\u677F\u89C2\u5BDF\nconst nums: number[] = [a, a + 2, a + 4, 9, 13, 18];\nnums.push(25);\nconsole.log('\u5F53\u524D\u6570\u7EC4:', nums);",
        executionCount: null,
        status: "idle",
        output: null
      },
      {
        id: c5Id,
        type: "code",
        source: "// \u70B9\u51FB\u6B64\u5355\u5143\u683C\u53F3\u4E0A\u89D2 \u{1F41E} \u53EF\u57FA\u4E8E\u4E0A\u65B9\u5DF2\u751F\u6210\u7684 nums \u5355\u6B65\u8C03\u8BD5\u4E8C\u5206\u67E5\u627E\nlet l: number = 0, r: number = nums.length - 1;\nconst target: number = 13;\nwhile (l <= r) {\n  const mid: number = (l + r) >> 1;\n  checkpoint(l, mid, r);\n  if (nums[mid] === target) {\n    console.log('\u627E\u5230\u76EE\u6807\u7D22\u5F15:', mid);\n    break;\n  }\n  if (nums[mid] < target) l = mid + 1;\n  else r = mid - 1;\n}",
        executionCount: null,
        status: "idle",
        output: null
      }
    ];
    const u1Id = nextCellId();
    const u2Id = nextCellId();
    const untitledCells = [
      {
        id: u1Id,
        type: "code",
        source: isPy ? "x = 10\ny = 20\nx + y" : "const x: number = 10;\nconst y: number = 20;\nx + y",
        executionCount: null,
        status: "idle",
        output: null
      },
      {
        id: u2Id,
        type: "code",
        source: "",
        executionCount: null,
        status: "idle",
        output: null
      }
    ];
    return [
      {
        id: "nb_intro",
        title: "Intro.ipynb",
        lang,
        execCounter: 4,
        activeCellId: c2Id,
        debuggingCellId: null,
        cells: introCells,
        executedHistory: isPy ? [
          { cellId: c2Id, execCount: 3, source: "a = 1" },
          { cellId: c3Id, execCount: 4, source: "print(a)" }
        ] : [
          { cellId: c2Id, execCount: 3, source: "let a: number = 1;" },
          { cellId: c3Id, execCount: 4, source: "console.log(a);" }
        ],
        lastGlobalVars: { a: 1 },
        lastGlobalDs: {}
      },
      {
        id: "nb_untitled",
        title: "Untitled.ipynb",
        lang,
        execCounter: 0,
        activeCellId: u1Id,
        debuggingCellId: null,
        cells: untitledCells,
        executedHistory: [],
        lastGlobalVars: {},
        lastGlobalDs: {}
      }
    ];
  }
  var notebooksByLang = {
    ts: { docs: [], activeDocId: "nb_intro" },
    python: { docs: [], activeDocId: "nb_intro" }
  };
  function ensureLangNotebooks(lang) {
    const key = lang === "python" ? "python" : "ts";
    if (!notebooksByLang[key].docs.length) {
      const docs = createDefaultNotebooks(key);
      notebooksByLang[key].docs = docs;
      notebooksByLang[key].activeDocId = docs[0].id;
    }
    return notebooksByLang[key];
  }
  function getActiveNotebook() {
    const lang = appState.LANG === "python" ? "python" : "ts";
    const store = ensureLangNotebooks(lang);
    let doc = store.docs.find((d) => d.id === store.activeDocId) ?? store.docs[0];
    if (!doc) {
      doc = createDefaultNotebooks(lang)[0];
      store.docs.push(doc);
    }
    store.activeDocId = doc.id;
    return doc;
  }
  function getActiveCell(doc = getActiveNotebook()) {
    if (!doc || !doc.cells.length) return null;
    const cell = doc.cells.find((c) => c.id === doc.activeCellId) ?? doc.cells[0];
    if (!cell) return null;
    doc.activeCellId = cell.id;
    return cell;
  }
  function renderMarkdownHtml(md) {
    const raw = String(md || "").trim();
    if (!raw) {
      return '<span class="nb-md-empty">\u53CC\u51FB\u6B64\u5904\u8F93\u5165 Markdown \u7B14\u8BB0\u5185\u5BB9\u2026</span>';
    }
    const lines = raw.replace(/\r\n?/g, "\n").split("\n");
    const out = [];
    let inCodeBlock = false;
    let codeLines = [];
    let inList = false;
    const formatInline = (text) => {
      let s = esc(text);
      s = s.replace(/`([^`]+)`/g, '<code class="nb-md-code">$1</code>');
      s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
      s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
      return s;
    };
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? "";
      if (/^\s*```/.test(line)) {
        if (inList) {
          out.push("</ul>");
          inList = false;
        }
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeLines = [];
        } else {
          inCodeBlock = false;
          out.push('<pre class="nb-md-pre"><code>' + esc(codeLines.join("\n")) + "</code></pre>");
        }
        continue;
      }
      if (inCodeBlock) {
        codeLines.push(line);
        continue;
      }
      const hMatch = line.match(/^(#{1,4})\s+(.+)$/);
      if (hMatch && hMatch[1] && hMatch[2] !== void 0) {
        if (inList) {
          out.push("</ul>");
          inList = false;
        }
        const lvl = hMatch[1].length;
        out.push(`<h${lvl} class="nb-md-h${lvl}">${formatInline(hMatch[2])}</h${lvl}>`);
        continue;
      }
      const liMatch = line.match(/^\s*[-*]\s+(.+)$/);
      if (liMatch && liMatch[1] !== void 0) {
        if (!inList) {
          out.push('<ul class="nb-md-ul">');
          inList = true;
        }
        out.push(`<li>${formatInline(liMatch[1])}</li>`);
        continue;
      }
      if (inList && !line.trim()) {
        out.push("</ul>");
        inList = false;
        continue;
      }
      if (!line.trim()) {
        continue;
      }
      out.push(`<p class="nb-md-p">${formatInline(line)}</p>`);
    }
    if (inList) out.push("</ul>");
    if (inCodeBlock) {
      out.push('<pre class="nb-md-pre"><code>' + esc(codeLines.join("\n")) + "</code></pre>");
    }
    return out.join("");
  }
  function moveFocusToNextCell(doc, currentCellId, createIfLast = false) {
    const idx = doc.cells.findIndex((c) => c.id === currentCellId);
    if (idx < 0) return;
    const nextCell = doc.cells[idx + 1];
    if (nextCell) {
      doc.activeCellId = nextCell.id;
      appState.ACTIVE_NB_CELL_ID = doc.activeCellId;
    } else if (createIfLast) {
      const newCell = {
        id: nextCellId(),
        type: "code",
        source: "",
        executionCount: null,
        status: "idle",
        output: null
      };
      doc.cells.push(newCell);
      doc.activeCellId = newCell.id;
      appState.ACTIVE_NB_CELL_ID = newCell.id;
    }
  }
  function insertCellInModel(doc, pos = "below", refCellId, type = "code") {
    const targetId = refCellId || doc.activeCellId;
    const idx = doc.cells.findIndex((c) => c.id === targetId);
    const newCell = {
      id: nextCellId(),
      type,
      source: "",
      executionCount: null,
      status: "idle",
      output: null,
      markdownRendered: false
    };
    if (idx < 0) {
      doc.cells.push(newCell);
    } else {
      const insertIdx = pos === "above" ? idx : idx + 1;
      doc.cells.splice(insertIdx, 0, newCell);
    }
    doc.activeCellId = newCell.id;
    appState.ACTIVE_NB_CELL_ID = newCell.id;
    return newCell;
  }
  function duplicateCellInModel(doc, cellId) {
    const targetId = cellId || doc.activeCellId;
    const idx = doc.cells.findIndex((c) => c.id === targetId);
    if (idx < 0) return null;
    const orig = doc.cells[idx];
    if (!orig) return null;
    const copy = {
      id: nextCellId(),
      type: orig.type,
      source: orig.source,
      executionCount: null,
      status: "idle",
      output: null,
      markdownRendered: orig.markdownRendered
    };
    doc.cells.splice(idx + 1, 0, copy);
    doc.activeCellId = copy.id;
    appState.ACTIVE_NB_CELL_ID = copy.id;
    return copy;
  }
  function moveCellInModel(doc, dir, cellId) {
    const targetId = cellId || doc.activeCellId;
    const idx = doc.cells.findIndex((c) => c.id === targetId);
    const nextIdx = idx + dir;
    if (idx < 0 || nextIdx < 0 || nextIdx >= doc.cells.length) return false;
    const [item] = doc.cells.splice(idx, 1);
    if (!item) return false;
    doc.cells.splice(nextIdx, 0, item);
    doc.activeCellId = item.id;
    appState.ACTIVE_NB_CELL_ID = item.id;
    return true;
  }
  function deleteCellInModel(doc, cellId) {
    const targetId = cellId || doc.activeCellId;
    if (doc.cells.length <= 1) {
      const first = doc.cells[0];
      if (first) {
        first.source = "";
        first.executionCount = null;
        first.status = "idle";
        first.output = null;
      }
      return { deleted: true, clearedDebugging: false };
    }
    const idx = doc.cells.findIndex((c) => c.id === targetId);
    if (idx < 0) return { deleted: false, clearedDebugging: false };
    let clearedDebugging = false;
    if (doc.debuggingCellId === targetId) {
      doc.debuggingCellId = null;
      clearedDebugging = true;
    }
    doc.cells.splice(idx, 1);
    const nextActive = doc.cells[Math.min(idx, doc.cells.length - 1)];
    if (nextActive) {
      doc.activeCellId = nextActive.id;
      appState.ACTIVE_NB_CELL_ID = nextActive.id;
    }
    return { deleted: true, clearedDebugging };
  }
  function serializeNotebookToIpynbJson(doc) {
    const ipynb = {
      nbformat: 4,
      nbformat_minor: 5,
      metadata: {
        kernelspec: {
          display_name: doc.lang === "python" ? "Python 3 (Pyodide)" : "TypeScript (Playground Visual)",
          language: doc.lang === "python" ? "python" : "typescript",
          name: doc.lang
        }
      },
      cells: doc.cells.map((c) => ({
        id: c.id,
        cell_type: c.type === "markdown" ? "markdown" : "code",
        metadata: {},
        source: c.source.split("\n").map((line, i, arr) => i < arr.length - 1 ? line + "\n" : line),
        ...c.type === "code" ? {
          execution_count: c.executionCount,
          outputs: c.output ? [
            ...c.output.logs.length ? [{ output_type: "stream", name: "stdout", text: c.output.logs.map((l) => l + "\n") }] : [],
            ...c.output.returnValue != null ? [
              {
                output_type: "execute_result",
                execution_count: c.executionCount,
                data: { "text/plain": [c.output.returnValue] },
                metadata: {}
              }
            ] : []
          ] : []
        } : {}
      }))
    };
    return JSON.stringify(ipynb, null, 2);
  }
  function parseIpynbJsonToDocument(jsonText, fileName, lang) {
    try {
      const data = JSON.parse(jsonText);
      if (!data || !Array.isArray(data.cells)) return null;
      const cells = data.cells.map(
        (rawCell) => {
          const type = rawCell.cell_type === "markdown" ? "markdown" : "code";
          const src = Array.isArray(rawCell.source) ? rawCell.source.join("") : String(rawCell.source || "");
          return {
            id: nextCellId(),
            type,
            source: src.replace(/\r\n?/g, "\n"),
            executionCount: typeof rawCell.execution_count === "number" ? rawCell.execution_count : null,
            status: "idle",
            output: null,
            markdownRendered: type === "markdown"
          };
        }
      );
      if (!cells.length) {
        cells.push({
          id: nextCellId(),
          type: "code",
          source: "",
          executionCount: null,
          status: "idle",
          output: null
        });
      }
      return {
        id: nextDocId(),
        title: fileName.endsWith(".ipynb") ? fileName : fileName + ".ipynb",
        lang,
        execCounter: 0,
        activeCellId: cells[0]?.id || "",
        debuggingCellId: null,
        cells,
        executedHistory: [],
        lastGlobalVars: {},
        lastGlobalDs: {}
      };
    } catch (_) {
      return null;
    }
  }
  function estimateMarkdownEditorHeight(src) {
    const lines = String(src || "").replace(/\r\n?/g, "\n").split("\n");
    let visualLines = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? "";
      let cols = 0;
      for (let k = 0; k < line.length; k++) {
        cols += line.charCodeAt(k) > 255 ? 2 : 1;
      }
      visualLines += Math.max(1, Math.ceil(cols / 62));
    }
    return Math.max(92, visualLines * 26 + 28);
  }

  // src/notebook/notebook-kernel.ts
  function normalizeCellTsForNotebook(src) {
    const lines = String(src || "").replace(/\r\n?/g, "\n").split("\n");
    const transformed = lines.map((line) => {
      const declM = line.match(/^(\s*)(?:export\s+)?(?:const|let)\b(\s+)/);
      if (declM) {
        return declM[1] + "var" + declM[2] + line.slice(declM[0].length);
      }
      return line;
    });
    return {
      normalized: transformed.join("\n")
    };
  }
  function buildTsPreambleFromHistory(doc, excludeCellId) {
    const chunks = [];
    for (const item of doc.executedHistory) {
      if (excludeCellId && item.cellId === excludeCellId) continue;
      const { normalized } = normalizeCellTsForNotebook(item.source);
      const enums = transpileEnums(normalized);
      const js0 = stripTypes(enums.error ? normalized : enums.code);
      chunks.push(js0);
    }
    const combined = chunks.join("\n");
    const names = new Set(collectNames(combined));
    return {
      preambleJs: combined,
      allNames: [...names]
    };
  }
  function buildTsTypecheckContext(doc, cell) {
    const historyChunks = [];
    for (const item of doc.executedHistory) {
      if (item.cellId === cell.id) continue;
      const src = String(item.source || "").replace(/\r\n?/g, "\n");
      if (src.trim()) historyChunks.push(src);
    }
    const preambleTs = historyChunks.join("\n");
    const preambleLines = preambleTs ? preambleTs.split("\n").length : 0;
    const cellSrc = String(cell.source || "").replace(/\r\n?/g, "\n");
    const combinedTs = preambleTs ? preambleTs + "\n" + cellSrc : cellSrc;
    return { preambleTs, preambleLines, combinedTs };
  }
  function typecheckNotebookCellTS(doc, cell) {
    if (appState.LANG === "python" || cell.type !== "code") return [];
    const rawCell = String(cell.source || "").replace(/\r\n?/g, "\n");
    if (!rawCell.trim()) return [];
    const { preambleLines, combinedTs } = buildTsTypecheckContext(doc, cell);
    const allDiags = typecheckTS(combinedTs, appState.STRICT_TS) || [];
    return allDiags.filter((d) => Boolean(d && typeof d.line === "number" && d.line > preambleLines)).map((d) => ({
      line: d.line - preambleLines,
      code: String(d.code || "TS"),
      message: d.message || "\u7C7B\u578B\u9519\u8BEF"
    }));
  }
  function syncNotebookGlobalsToSidePanel(doc = getActiveNotebook()) {
    if (!doc) return;
    if (doc.debuggingCellId && appState.DEBUG_SESSION.active && appState.TRACE.steps.length > 0) {
      uiHooks.renderPicker();
      uiHooks.renderStatic(appState.cur, false);
      return;
    }
    const v = doc.lastGlobalVars || {};
    const ds = doc.lastGlobalDs || {};
    const step = {
      line: 1,
      note: doc.execCounter > 0 ? `Notebook \u4F1A\u8BDD\u4E0A\u4E0B\u6587 \xB7 \u5DF2\u7D2F\u8BA1\u6267\u884C ${doc.execCounter} \u4E2A\u5355\u5143\u683C` : "Notebook \u4F1A\u8BDD\u5C31\u7EEA \xB7 \u8FD0\u884C\u4EFB\u610F\u5355\u5143\u683C\u540E\u5728\u6B64\u540C\u6B65\u663E\u793A\u5168\u5C40\u53D8\u91CF\u4E0E\u6570\u636E\u7ED3\u6784",
      v,
      ds,
      callStack: [
        {
          id: 0,
          fn: "notebook",
          label: `Kernel [${doc.execCounter || " "}]`,
          line: 1,
          v,
          ds
        }
      ],
      anim: null,
      isCheckpoint: false,
      error: null
    };
    appState.TRACE = {
      title: `${doc.title} \xB7 Kernel Context`,
      code: [""],
      steps: [step]
    };
    appState.DEBUG_SESSION = {
      active: false,
      finished: true,
      crashed: false,
      error: null,
      errorLine: -1,
      returnValue: void 0,
      compiledFn: null,
      originalLines: [""],
      callExpr: "undefined"
    };
    appState.cur = 0;
    appState.SELECTED_FRAME_IDX = null;
    initWatchedVars();
    uiHooks.renderPicker();
    uiHooks.renderStatic(0, false);
    uiHooks.setCntStatus(
      doc.execCounter > 0 ? `Notebook [${doc.execCounter}] \xB7 \u5168\u5C40\u4E0A\u4E0B\u6587` : "Notebook \u5C31\u7EEA",
      ""
    );
  }
  async function runPythonNotebookCell(doc, cell, rawSrc, advanceToNext) {
    try {
      const payload = await PY_ENGINE.run(rawSrc, {
        trace: false,
        useNotebookKernel: true,
        timeLimit: 6
      });
      if (payload.syntaxError) {
        const err = payload.syntaxError;
        const msg = `SyntaxError (\u7B2C ${err.line || 1} \u884C): ${err.msg || "\u8BED\u6CD5\u9519\u8BEF"}`;
        cell.status = "error";
        cell.output = { logs: [], returnValue: null, error: msg, errorLine: err.line || 1 };
        say(`\u2717 [${doc.title}] ${msg}`, "err");
        uiHooks.renderNotebookUI();
        return false;
      }
      doc.execCounter += 1;
      cell.executionCount = doc.execCounter;
      const logs = payload.stdout ? String(payload.stdout).replace(/\n$/, "").split("\n") : [];
      const rvHydrated = PY_ENGINE.hydrate(payload.returnValue);
      const hasReturn = rvHydrated !== void 0 && rvHydrated !== null && payload.entryExpr;
      const rvStr = hasReturn ? PY_ENGINE.fmtReturn(rvHydrated) : null;
      if (payload.meta) {
        PY_ENGINE.applyMeta(payload.meta);
      }
      const vRaw = PY_ENGINE.hydrateVars(payload.finalVars || {});
      const v = PY_ENGINE.cloneVars(vRaw);
      const ds = {};
      Object.keys(vRaw).forEach((name) => {
        const d = classifyValue(name, vRaw[name]);
        if (d) ds[name] = d;
      });
      populateInterfaceSchemas(ds);
      doc.lastGlobalVars = v;
      doc.lastGlobalDs = ds;
      if (payload.error) {
        cell.status = "error";
        cell.output = {
          logs,
          returnValue: null,
          error: payload.error,
          errorLine: payload.errorLine || 1
        };
        say(`\u2717 [Cell ${cell.executionCount}] \u7B2C ${payload.errorLine || 1} \u884C\u62A5\u9519: ${payload.error}`, "err");
      } else {
        cell.status = "success";
        cell.output = {
          logs,
          returnValue: rvStr,
          error: null
        };
        doc.executedHistory = doc.executedHistory.filter((h) => h.cellId !== cell.id);
        doc.executedHistory.push({ cellId: cell.id, execCount: cell.executionCount, source: rawSrc });
        say(
          `\u2713 [Cell ${cell.executionCount}] \u6267\u884C\u5B8C\u6210` + (logs.length ? ` \xB7 \u8F93\u51FA: ${logs.join(" | ")}` : "") + (rvStr ? `  \u2192  ${rvStr}` : ""),
          "ok"
        );
      }
      syncNotebookGlobalsToSidePanel(doc);
      if (advanceToNext && !payload.error) {
        moveFocusToNextCell(doc, cell.id, true);
      }
      uiHooks.renderNotebookUI();
      return !payload.error;
    } catch (err) {
      cell.status = "error";
      cell.output = { logs: [], returnValue: null, error: err instanceof Error && err.message || String(err) };
      uiHooks.renderNotebookUI();
      return false;
    }
  }
  function runTsNotebookCell(doc, cell, rawSrc, advanceToNext) {
    const t0 = Date.now();
    const { combinedTs } = buildTsTypecheckContext(doc, cell);
    const cellDiags = typecheckNotebookCellTS(doc, cell);
    if (cellDiags.length > 0) {
      cell.status = "error";
      const errText = cellDiags.map((d) => `${d.code} [\u7B2C ${d.line} \u884C]: ${d.message}`).join("\n");
      cell.output = {
        logs: [],
        returnValue: null,
        error: errText,
        errorLine: cellDiags[0]?.line ?? 1
      };
      say(`\u2717 [Notebook] TypeScript \u4E25\u683C\u7C7B\u578B\u68C0\u67E5\u672A\u901A\u8FC7 (\u5171 ${cellDiags.length} \u5904\u9519\u8BEF)\uFF1A`, "err");
      cellDiags.forEach((d) => {
        say(`  \u2022 ${d.code} [\u7B2C ${d.line} \u884C]: ${d.message}`, "err", d.line);
      });
      uiHooks.renderNotebookUI();
      return false;
    }
    extractTsInterfaceMetadata(combinedTs);
    const { preambleJs, allNames: histNames } = buildTsPreambleFromHistory(doc, cell.id);
    const { normalized: normCellSrc } = normalizeCellTsForNotebook(rawSrc);
    const enums = transpileEnums(normCellSrc);
    if (enums.error) {
      cell.status = "error";
      cell.output = {
        logs: [],
        returnValue: null,
        error: `\u7B2C ${enums.error.line} \u884C: ${enums.error.message}`,
        errorLine: enums.error.line
      };
      say(`\u2717 [Notebook] \u7B2C ${enums.error.line} \u884C: ${enums.error.message}`, "err");
      uiHooks.renderNotebookUI();
      return false;
    }
    const jsCell = stripTypes(enums.code);
    const entry = resolveEntry(normCellSrc, jsCell);
    const rawEntryExpr = (entry.expr || "").trim();
    const isConsoleLogCall = /^console\.log\s*\(/.test(rawEntryExpr);
    const isAssignmentExpr = /^[A-Za-z_$][\w$]*\s*=[^=]/.test(rawEntryExpr);
    const shouldEvalTailExpr = Boolean(entry.index >= 0 && rawEntryExpr && !isConsoleLogCall && !isAssignmentExpr);
    const jsCellBody = shouldEvalTailExpr ? blankJsLine(jsCell, entry.index) : jsCell;
    const tailExpr = shouldEvalTailExpr ? stripTypes(rawEntryExpr) : "undefined";
    const cellNames = collectNames(jsCell);
    const combinedNames = Array.from(/* @__PURE__ */ new Set([...histNames, ...cellNames]));
    const snapExpr = snapFnExpr(combinedNames);
    const logs = [];
    let recordLogs = false;
    const fmtNotebookConsoleArgs = (...args) => args.map((x) => {
      if (x instanceof Error) return x.message || String(x);
      try {
        return typeof x === "object" && x !== null ? JSON.stringify(x) : String(x);
      } catch (_) {
        return String(x);
      }
    }).join(" ");
    const customConsole = {
      log: (...args) => {
        if (!recordLogs) return;
        logs.push(fmtNotebookConsoleArgs(...args));
      },
      info: (...args) => {
        if (!recordLogs) return;
        logs.push(fmtNotebookConsoleArgs(...args));
      },
      warn: (...args) => {
        if (!recordLogs) return;
        logs.push(fmtNotebookConsoleArgs(...args));
      },
      error: (...args) => {
        if (!recordLogs) return;
        logs.push(fmtNotebookConsoleArgs(...args));
      },
      EnableRecording: () => {
        recordLogs = true;
      }
    };
    const fnBody = "var checkpoint = function(){}, \u65AD\u70B9 = checkpoint;\n" + preambleJs + "\n;console.EnableRecording();\n" + jsCellBody + "\n;var __ret = (" + tailExpr + ");\nreturn { ok: true, value: __ret, vars: (" + snapExpr + ")() };";
    doc.execCounter += 1;
    cell.executionCount = doc.execCounter;
    try {
      const fn = new Function("console", fnBody);
      const res = fn(customConsole);
      const elapsedMs = Date.now() - t0;
      const vRaw = isRecord(res) && isRecord(res.vars) ? res.vars : {};
      const v = {};
      const ds = {};
      Object.keys(vRaw).forEach((k) => {
        const val = vRaw[k];
        v[k] = val !== null && typeof val === "object" ? cloneDeepBounded(val, 2) : val;
        const d = classifyValue(k, val);
        if (d) ds[k] = d;
      });
      populateInterfaceSchemas(ds);
      doc.lastGlobalVars = v;
      doc.lastGlobalDs = ds;
      const rvStr = shouldEvalTailExpr && res.value !== void 0 ? safeJSONStringify(res.value) : null;
      cell.status = "success";
      cell.output = {
        logs,
        returnValue: rvStr,
        error: null,
        elapsedMs
      };
      doc.executedHistory = doc.executedHistory.filter((h) => h.cellId !== cell.id);
      doc.executedHistory.push({ cellId: cell.id, execCount: cell.executionCount, source: rawSrc });
      say(
        `\u2713 [Cell ${cell.executionCount}] \u6267\u884C\u5B8C\u6210 (${elapsedMs}ms)` + (logs.length ? ` \xB7 \u8F93\u51FA: ${logs.join(" | ")}` : "") + (rvStr ? `  \u2192  ${rvStr}` : ""),
        "ok"
      );
      syncNotebookGlobalsToSidePanel(doc);
      if (advanceToNext) {
        moveFocusToNextCell(doc, cell.id, true);
      }
      uiHooks.renderNotebookUI();
      return true;
    } catch (err) {
      const msg = err instanceof Error && err.message ? err.message : String(err);
      cell.status = "error";
      cell.output = {
        logs,
        returnValue: null,
        error: msg
      };
      say(`\u2717 [Cell ${cell.executionCount}] \u8FD0\u884C\u65F6\u62A5\u9519: ${msg}`, "err");
      uiHooks.renderNotebookUI();
      return false;
    }
  }
  async function runNotebookCell(cellId, advanceToNext = false) {
    const doc = getActiveNotebook();
    const cell = cellId ? doc.cells.find((c) => c.id === cellId) : getActiveCell(doc);
    if (!cell) return false;
    doc.activeCellId = cell.id;
    appState.ACTIVE_NB_CELL_ID = cell.id;
    if (doc.debuggingCellId) {
      doc.debuggingCellId = null;
      uiHooks.stopAuto();
      uiHooks.clearFlyLayer();
    }
    if (cell.type === "markdown") {
      cell.markdownRendered = true;
      cell.status = "idle";
      if (advanceToNext) moveFocusToNextCell(doc, cell.id, true);
      uiHooks.renderNotebookUI();
      return true;
    }
    const rawSrc = cell.source.replace(/\r\n?/g, "\n");
    if (!rawSrc.trim()) {
      cell.executionCount = null;
      cell.status = "idle";
      cell.output = null;
      if (advanceToNext) moveFocusToNextCell(doc, cell.id, true);
      uiHooks.renderNotebookUI();
      return true;
    }
    cell.status = "running";
    uiHooks.renderNotebookUI();
    if (appState.LANG === "python") {
      return runPythonNotebookCell(doc, cell, rawSrc, advanceToNext);
    }
    return runTsNotebookCell(doc, cell, rawSrc, advanceToNext);
  }
  async function debugPythonNotebookCell(doc, cell, rawSrc) {
    cell.status = "debugging";
    doc.debuggingCellId = cell.id;
    uiHooks.renderNotebookUI();
    try {
      say(`\u2026 \u6B63\u5728\u5F55\u5236\u5355\u5143\u683C [${cell.executionCount || " "}] \u7684 Python \u5355\u6B65\u8F68\u8FF9\u2026`, "dim");
      const payload = await PY_ENGINE.run(rawSrc, {
        trace: true,
        useNotebookKernel: true,
        maxSteps: 2e3,
        timeLimit: 6
      });
      if (payload.syntaxError) {
        const err = payload.syntaxError;
        cell.status = "error";
        doc.debuggingCellId = null;
        cell.output = {
          logs: [],
          returnValue: null,
          error: `SyntaxError (\u7B2C ${err.line || 1} \u884C): ${err.msg || "\u8BED\u6CD5\u9519\u8BEF"}`,
          errorLine: err.line || 1
        };
        uiHooks.renderNotebookUI();
        return false;
      }
      doc.execCounter += 1;
      cell.executionCount = doc.execCounter;
      const sourceLines = rawSrc.split("\n");
      PY_ENGINE.applyMeta(payload.meta || {});
      payload.__returnValueHydrated = PY_ENGINE.hydrate(payload.returnValue);
      payload.__callExpr = payload.entryExpr || "";
      const steps = PY_ENGINE.buildSteps(payload, sourceLines);
      resetTraceState();
      appState.TRACE = { title: `${doc.title} \xB7 Cell [${cell.executionCount}]`, code: sourceLines, steps };
      appState.DEBUG_SESSION = {
        active: true,
        finished: true,
        crashed: Boolean(payload.error),
        error: payload.error || null,
        errorLine: payload.errorLine || -1,
        returnValue: payload.__returnValueHydrated,
        compiledFn: null,
        originalLines: sourceLines,
        callExpr: payload.entryExpr || "undefined"
      };
      const vRaw = PY_ENGINE.hydrateVars(payload.finalVars || {});
      const v = PY_ENGINE.cloneVars(vRaw);
      const ds = {};
      Object.keys(vRaw).forEach((name) => {
        const d = classifyValue(name, vRaw[name]);
        if (d) ds[name] = d;
      });
      populateInterfaceSchemas(ds);
      doc.lastGlobalVars = v;
      doc.lastGlobalDs = ds;
      const logs = payload.stdout ? String(payload.stdout).replace(/\n$/, "").split("\n") : [];
      cell.output = {
        logs,
        returnValue: payload.__returnValueHydrated !== void 0 && payload.__returnValueHydrated !== null && payload.entryExpr ? PY_ENGINE.fmtReturn(payload.__returnValueHydrated) : null,
        error: payload.error || null,
        errorLine: payload.errorLine || null
      };
      appState.cur = 0;
      appState.SELECTED_FRAME_IDX = null;
      appState.watched = /* @__PURE__ */ new Set();
      appState.SEEN_VARS_EVER = /* @__PURE__ */ new Set();
      appState.layoutSpan = /* @__PURE__ */ Object.create(null);
      initWatchedVars();
      uiHooks.renderPicker();
      uiHooks.renderStatic(appState.cur, false);
      uiHooks.renderNotebookUI();
      say(`\u2713 [Cell ${cell.executionCount}] \u5DF2\u8FDB\u5165\u5355\u6B65\u8C03\u8BD5\u6A21\u5F0F\uFF08\u5171 ${steps.length} \u6B65\uFF0C\u53EF\u4F7F\u7528\u5E95\u90E8\u63A7\u5236\u680F\u9010\u6B65\u89C2\u5BDF\uFF09`, "ok");
      return true;
    } catch (_err) {
      cell.status = "error";
      doc.debuggingCellId = null;
      uiHooks.renderNotebookUI();
      return false;
    }
  }
  function debugTsNotebookCell(doc, cell, rawSrc) {
    const { combinedTs } = buildTsTypecheckContext(doc, cell);
    const cellDiags = typecheckNotebookCellTS(doc, cell);
    if (cellDiags.length > 0) {
      cell.status = "error";
      doc.debuggingCellId = null;
      const errText = cellDiags.map((d) => `${d.code} [\u7B2C ${d.line} \u884C]: ${d.message}`).join("\n");
      cell.output = {
        logs: [],
        returnValue: null,
        error: errText,
        errorLine: cellDiags[0]?.line ?? 1
      };
      say(`\u2717 [Notebook] TypeScript \u4E25\u683C\u7C7B\u578B\u68C0\u67E5\u672A\u901A\u8FC7 (\u5171 ${cellDiags.length} \u5904\u9519\u8BEF)\uFF1A`, "err");
      cellDiags.forEach((d) => {
        say(`  \u2022 ${d.code} [\u7B2C ${d.line} \u884C]: ${d.message}`, "err", d.line);
      });
      uiHooks.renderNotebookUI();
      return false;
    }
    extractTsInterfaceMetadata(combinedTs);
    const { preambleJs, allNames: histNames } = buildTsPreambleFromHistory(doc, cell.id);
    const { normalized: normCellSrc } = normalizeCellTsForNotebook(rawSrc);
    const originalLines = rawSrc.split("\n");
    const enums = transpileEnums(normCellSrc);
    if (enums.error) {
      cell.status = "error";
      cell.output = {
        logs: [],
        returnValue: null,
        error: `\u7B2C ${enums.error.line} \u884C: ${enums.error.message}`,
        errorLine: enums.error.line
      };
      uiHooks.renderNotebookUI();
      return false;
    }
    const js0 = stripTypes(enums.code);
    const entry = resolveEntry(normCellSrc, js0);
    const rawEntryExpr = (entry.expr || "").trim();
    const isConsoleLogCall = /^console\.log\s*\(/.test(rawEntryExpr);
    const isAssignmentExpr = /^[A-Za-z_$][\w$]*\s*=[^=]/.test(rawEntryExpr);
    const shouldEvalTailExpr = Boolean(entry.index >= 0 && rawEntryExpr && !isConsoleLogCall && !isAssignmentExpr);
    const expr = shouldEvalTailExpr ? stripTypes(rawEntryExpr) : "undefined";
    appState.ENTRY_CALL_LINE = entry.line || 1;
    const jsBody = shouldEvalTailExpr ? blankJsLine(js0, entry.index) : js0;
    let compiledFn;
    try {
      const cellNames = collectNames(jsBody);
      const allNames = Array.from(/* @__PURE__ */ new Set([...histNames, ...cellNames]));
      const instrumentedCellJs = instrument(jsBody, originalLines, allNames);
      const snapStr = snapFnExpr(allNames);
      const body = preambleJs + "\n" + instrumentedCellJs + "\n;var __entryVal = (" + expr + ');\nif (typeof __t === "function" && __t.__drain) { __entryVal = __t.__drain(__entryVal, ' + snapStr + '); }\ntry{if(typeof __t==="function"&&__t.__fin)__t.__fin(' + snapStr + ");}catch(_){}\nreturn __entryVal;";
      compiledFn = new Function("__t", "console", body);
    } catch (e) {
      cell.status = "error";
      cell.output = {
        logs: [],
        returnValue: null,
        error: "\u7F16\u8BD1\u5931\u8D25: " + (e instanceof Error && e.message ? e.message : String(e))
      };
      uiHooks.renderNotebookUI();
      return false;
    }
    doc.execCounter += 1;
    cell.executionCount = doc.execCounter;
    cell.status = "debugging";
    doc.debuggingCellId = cell.id;
    appState.TRACE = {
      title: `${doc.title} \xB7 Cell [${cell.executionCount}]`,
      code: originalLines,
      steps: []
    };
    appState.DEBUG_SESSION = {
      active: true,
      finished: false,
      crashed: false,
      error: null,
      errorLine: -1,
      returnValue: void 0,
      compiledFn,
      originalLines,
      callExpr: expr,
      hasAsync: hasAsyncConstructs(rawSrc)
    };
    appState.cur = 0;
    appState.watched = /* @__PURE__ */ new Set();
    appState.SEEN_VARS_EVER = /* @__PURE__ */ new Set();
    appState.layoutSpan = /* @__PURE__ */ Object.create(null);
    computeAndAppendNextStep({ silent: true });
    appState.cur = Math.max(0, appState.TRACE.steps.length - 1);
    initWatchedVars();
    uiHooks.renderPicker();
    uiHooks.renderStatic(appState.cur, false);
    uiHooks.renderNotebookUI();
    say(`\u2713 [Cell ${cell.executionCount}] \u5DF2\u5F00\u542F\u5355\u6B65\u8C03\u8BD5 \xB7 \u53EF\u4F7F\u7528\u5E95\u90E8\u300C\u4E0B\u4E00\u6B65 \u203A\u300D\u6216\u300C\u23ED \u8FD0\u884C\u5230\u4E0B\u4E00\u4E2A\u68C0\u67E5\u70B9\u300D\u9010\u6B65\u63A8\u5BFC`, "ok");
    return true;
  }
  async function debugNotebookCell(cellId) {
    const doc = getActiveNotebook();
    const cell = cellId ? doc.cells.find((c) => c.id === cellId) : getActiveCell(doc);
    if (!cell || cell.type !== "code") return false;
    doc.activeCellId = cell.id;
    appState.ACTIVE_NB_CELL_ID = cell.id;
    const rawSrc = cell.source.replace(/\r\n?/g, "\n");
    if (!rawSrc.trim()) {
      say("\u26A0 \u5F53\u524D\u5355\u5143\u683C\u4E3A\u7A7A\uFF0C\u8BF7\u5148\u8F93\u5165\u4EE3\u7801\u540E\u518D\u542F\u52A8\u5355\u6B65\u8C03\u8BD5", "dim");
      return false;
    }
    uiHooks.stopAuto();
    uiHooks.clearFlyLayer();
    if (appState.LANG === "python") {
      return debugPythonNotebookCell(doc, cell, rawSrc);
    }
    return debugTsNotebookCell(doc, cell, rawSrc);
  }
  async function restartNotebookKernel(silent = false) {
    const doc = getActiveNotebook();
    uiHooks.stopAuto();
    uiHooks.clearFlyLayer();
    doc.execCounter = 0;
    doc.debuggingCellId = null;
    doc.executedHistory = [];
    doc.lastGlobalVars = {};
    doc.lastGlobalDs = {};
    doc.cells.forEach((c) => {
      c.executionCount = null;
      c.status = "idle";
      c.output = null;
    });
    if (appState.LANG === "python" && typeof PY_ENGINE !== "undefined") {
      try {
        await PY_ENGINE.run("", { resetKernel: true, trace: false });
      } catch (_) {
      }
    }
    resetTraceState();
    syncNotebookGlobalsToSidePanel(doc);
    uiHooks.renderNotebookUI();
    if (!silent) {
      say(`\u21BB \u5DF2\u91CD\u542F [${doc.title}] \u5185\u6838\u5E76\u6E05\u7A7A\u6240\u6709\u8DE8\u5355\u5143\u683C\u53D8\u91CF\u4E0E\u8BA1\u6570`, "ok");
    }
  }
  async function runAllNotebookCells() {
    const doc = getActiveNotebook();
    await restartNotebookKernel(true);
    say(`\u23E9 \u5F00\u59CB\u987A\u5E8F\u6267\u884C [${doc.title}] \u7684\u5168\u90E8\u5355\u5143\u683C\u2026`, "dim");
    for (const cell of doc.cells) {
      if (cell.type === "markdown") {
        cell.markdownRendered = true;
        continue;
      }
      if (!cell.source.trim()) continue;
      const ok = await runNotebookCell(cell.id, false);
      if (!ok) {
        say(`\u26A0 \u987A\u5E8F\u6267\u884C\u5728\u5355\u5143\u683C [${cell.executionCount || " "}] \u5904\u56E0\u62A5\u9519\u4E2D\u65AD`, "err");
        break;
      }
    }
    uiHooks.renderNotebookUI();
  }

  // src/ui/notebook.ts
  function insertNotebookCell(pos = "below", refCellId, type = "code") {
    const doc = getActiveNotebook();
    insertCellInModel(doc, pos, refCellId, type);
    renderNotebookUI(true);
  }
  function duplicateNotebookCell(cellId) {
    const doc = getActiveNotebook();
    if (!duplicateCellInModel(doc, cellId)) return;
    renderNotebookUI(true);
  }
  function moveNotebookCell(dir, cellId) {
    const doc = getActiveNotebook();
    if (!moveCellInModel(doc, dir, cellId)) return;
    renderNotebookUI();
  }
  function deleteNotebookCell(cellId) {
    const doc = getActiveNotebook();
    const res = deleteCellInModel(doc, cellId);
    if (!res.deleted) return;
    if (res.clearedDebugging) {
      resetTraceState();
    }
    renderNotebookUI();
  }
  function cutNotebookCell() {
    const doc = getActiveNotebook();
    const cell = getActiveCell(doc);
    if (!cell) return;
    setClipboardCell({ ...cell, output: null, executionCount: null, status: "idle" });
    deleteNotebookCell(cell.id);
    say("\u2702 \u5DF2\u526A\u5207\u5F53\u524D\u5355\u5143\u683C", "dim");
  }
  function copyNotebookCell() {
    const doc = getActiveNotebook();
    const cell = getActiveCell(doc);
    if (!cell) return;
    setClipboardCell({ ...cell, output: null, executionCount: null, status: "idle" });
    say("\u{1F4CB} \u5DF2\u590D\u5236\u5F53\u524D\u5355\u5143\u683C", "dim");
  }
  function pasteNotebookCell() {
    const clip = getClipboardCell();
    if (!clip) {
      say("\u26A0 \u526A\u8D34\u677F\u4E2D\u6682\u65E0\u5DF2\u590D\u5236\u7684\u5355\u5143\u683C", "dim");
      return;
    }
    const doc = getActiveNotebook();
    const idx = doc.cells.findIndex((c) => c.id === doc.activeCellId);
    const pasted = {
      ...clip,
      id: nextCellId(),
      executionCount: null,
      status: "idle",
      output: null
    };
    if (idx < 0) doc.cells.push(pasted);
    else doc.cells.splice(idx + 1, 0, pasted);
    doc.activeCellId = pasted.id;
    appState.ACTIVE_NB_CELL_ID = pasted.id;
    renderNotebookUI(true);
    say("\u{1F4C4} \u5DF2\u5728\u4E0B\u65B9\u7C98\u8D34\u5355\u5143\u683C", "ok");
  }
  function exportActiveNotebookIpynb() {
    const doc = getActiveNotebook();
    const jsonStr = serializeNotebookToIpynbJson(doc);
    const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.title.endsWith(".ipynb") ? doc.title : doc.title + ".ipynb";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    say(`\u{1F4BE} \u5DF2\u5BFC\u51FA\u7B14\u8BB0\u672C\u6587\u4EF6 ${a.download}`, "ok");
  }
  function importNotebookFromJson(jsonText, fileName) {
    const lang = appState.LANG === "python" ? "python" : "ts";
    const newDoc = parseIpynbJsonToDocument(jsonText, fileName, lang);
    if (!newDoc) return false;
    const store = ensureLangNotebooks(lang);
    store.docs.push(newDoc);
    store.activeDocId = newDoc.id;
    setViewMode("notebook");
    renderNotebookUI();
    say(`\u2713 \u5DF2\u5BFC\u5165 Jupyter \u7B14\u8BB0\u672C ${newDoc.title}\uFF08\u5171 ${newDoc.cells.length} \u4E2A\u5355\u5143\u683C\uFF09`, "ok");
    return true;
  }
  function setViewMode(mode) {
    const next = mode === "notebook" ? "notebook" : "script";
    appState.VIEW_MODE = next;
    if (document.body && document.body.classList) {
      if (next === "notebook") document.body.classList.add("notebook-mode");
      else document.body.classList.remove("notebook-mode");
    }
    const modeSwitch = $("modeSwitch");
    if (modeSwitch && modeSwitch.querySelectorAll) {
      modeSwitch.querySelectorAll(".mode-tab").forEach((btn) => {
        if (btn.classList && typeof btn.classList.toggle === "function") {
          btn.classList.toggle("active", btn.dataset.mode === next);
        }
      });
    }
    const nbWrap = $("notebookWrap");
    const edWrap = $("editorWrap");
    const srcPaneTitle = $("sourcePaneTitle");
    const expMenuWrap = $("exportMenuWrap");
    const vfsSidebar = $("vfsSidebar");
    const b1 = $("btnToggleVfs");
    const b2 = $("nbBtnToggleVfs");
    if (nbWrap) nbWrap.hidden = next !== "notebook";
    if (edWrap) edWrap.style.display = next === "notebook" ? "none" : "flex";
    if (srcPaneTitle) srcPaneTitle.style.display = next === "notebook" ? "none" : "flex";
    if (expMenuWrap) {
      expMenuWrap.style.display = next === "notebook" ? "none" : "";
      if (next === "notebook" && expMenuWrap.classList) expMenuWrap.classList.remove("open");
    }
    if (vfsSidebar) {
      vfsSidebar.hidden = true;
    }
    if (b1 && b1.classList) b1.classList.remove("active");
    if (b2 && b2.classList) b2.classList.remove("active");
    if (next === "notebook") {
      const doc = getActiveNotebook();
      appState.ACTIVE_NB_CELL_ID = doc.activeCellId;
      syncNotebookGlobalsToSidePanel(doc);
      renderNotebookUI();
    } else {
      stopAuto();
      clearFlyLayer();
      renderScriptTabsUI();
    }
    renderVfsTreeUI();
  }
  function renderCellCodeHighlight(cell, isDebuggingThisCell) {
    const doc = getActiveNotebook();
    const lines = cell.source.replace(/\r\n?/g, "\n").split("\n");
    const { combinedTs } = appState.LANG === "python" ? { combinedTs: cell.source } : buildTsTypecheckContext(doc, cell);
    const declared = collectDeclaredNames(combinedTs);
    if (appState.LANG === "python" && doc.lastGlobalVars) {
      Object.keys(doc.lastGlobalVars).forEach((k) => declared.add(k));
    }
    const liveByLine = /* @__PURE__ */ new Map();
    if (appState.LANG !== "python" && cell.type === "code") {
      const cellDiags = typecheckNotebookCellTS(doc, cell);
      cellDiags.forEach((d) => {
        if (d && d.line >= 1 && !liveByLine.has(d.line)) {
          liveByLine.set(d.line, d);
        }
      });
    }
    const st = isDebuggingThisCell && appState.TRACE.steps.length ? appState.TRACE.steps[appState.cur] : null;
    const curLine = st ? st.line : -1;
    const hlHtml = lines.map((t, idx) => {
      const ln = idx + 1;
      const isCur = isDebuggingThisCell && ln === curLine;
      const diag = liveByLine.get(ln);
      const isErr = Boolean(diag) || cell.status === "error" && cell.output && cell.output.errorLine === ln || Boolean(isCur && st && st.error);
      const inner = isCur ? hlActiveLine(t, st && st.anim, declared) : hl(t, declared);
      const errBadge = diag ? `<span class="ln-err-badge" title="${esc((diag.code ? diag.code + ": " : "") + (diag.message || ""))}">\u2717 ${esc(diag.code || "TS")}</span>` : "";
      return `<span class="ln${isCur ? " cur" : ""}${isErr ? " err" : ""}">${(inner || "&nbsp;") + errBadge}</span>`;
    }).join("");
    const gutterHtml = lines.map((t, idx) => {
      const ln = idx + 1;
      const isCur = isDebuggingThisCell && ln === curLine;
      const isErr = liveByLine.has(ln) || cell.status === "error" && cell.output && cell.output.errorLine === ln || Boolean(isCur && st && st.error);
      const hasCkpt = /^\s*(?:checkpoint|断点)\s*\(/.test(t);
      return `<div class="nb-gline${isCur ? " cur" : ""}${isErr ? " err" : ""}${hasCkpt ? " ckpt" : ""}" data-line="${ln}" title="\u70B9\u51FB\u5728\u7B2C ${ln} \u884C\u63D2\u5165/\u79FB\u9664 checkpoint()">${ln}</div>`;
    }).join("");
    let stepVizHtml = "";
    if (isDebuggingThisCell && st && (st.anim || st.error) && curLine >= 1 && curLine <= lines.length) {
      stepVizHtml = buildStepVizRow(lines[curLine - 1] || "", st.anim, st.error, true);
    }
    return { hlHtml, gutterHtml, stepVizHtml, stepVizLine: curLine };
  }
  function renderNotebookUI(focusActiveEditor = false) {
    const wrap = $("notebookWrap");
    if (!wrap || appState.VIEW_MODE !== "notebook") return;
    const lang = appState.LANG === "python" ? "python" : "ts";
    const store = ensureLangNotebooks(lang);
    const doc = getActiveNotebook();
    const activeCell = getActiveCell(doc);
    const tabsEl = $("nbTabsList");
    if (tabsEl) {
      tabsEl.innerHTML = store.docs.map((d) => {
        const isAct = d.id === doc.id;
        return `<div class="nb-tab${isAct ? " active" : ""}" data-doc-id="${esc(d.id)}" title="\u53CC\u51FB\u53EF\u91CD\u547D\u540D\u7B14\u8BB0\u672C"><span class="nb-tab-icon" aria-hidden="true"></span><span class="nb-tab-title">${esc(d.title)}</span>` + (store.docs.length > 1 ? `<button type="button" class="nb-tab-close" data-close-doc="${esc(d.id)}" title="\u5173\u95ED\u6807\u7B7E\u9875">\xD7</button>` : "") + `</div>`;
      }).join("") + `<button type="button" class="nb-tab-add" id="nbBtnNewTab" title="\u65B0\u5EFA\u7A7A\u767D Notebook \u6807\u7B7E\u9875">\uFF0B</button>`;
    }
    const typeSel = $("nbCellType");
    if (typeSel && activeCell) {
      typeSel.value = activeCell.type;
    }
    const kernelBadge = $("nbKernelStatus");
    if (kernelBadge) {
      const isDbg = Boolean(doc.debuggingCellId && appState.DEBUG_SESSION.active);
      const stateTxt = isDbg ? "\u8C03\u8BD5\u4E2D" : "\u5C31\u7EEA";
      kernelBadge.innerHTML = `<span class="nb-kernel-dot${isDbg ? " debug" : ""}"></span><span>${stateTxt}</span>`;
    }
    const cellsContainer = $("nbCellsList");
    if (!cellsContainer) return;
    cellsContainer.innerHTML = doc.cells.map((cell, idx) => {
      const isFocused = cell.id === doc.activeCellId;
      const isDebugging = doc.debuggingCellId === cell.id && appState.DEBUG_SESSION.active;
      const promptTxt = cell.status === "running" ? "[*]:" : cell.executionCount != null ? `[${cell.executionCount}]:` : "[ ]:";
      const lineCount = Math.max(1, cell.source.split("\n").length);
      const editorHeight = Math.max(38, lineCount * 24 + 14);
      const mdEditorHeight = estimateMarkdownEditorHeight(cell.source);
      if (cell.type === "markdown") {
        const isRendered = Boolean(cell.markdownRendered);
        return `<div class="nb-cell nb-cell-md${isFocused ? " active" : ""}" data-cell-id="${esc(cell.id)}"><div class="nb-cell-bar"></div><div class="nb-cell-prompt md-prompt">${isRendered ? "" : "MD"}</div><div class="nb-cell-main"><div class="nb-cell-input md-input"><div class="nb-cell-actions"><button type="button" class="nb-act-btn" data-cell-act="toggle-md" data-cell-id="${esc(cell.id)}" title="${isRendered ? "\u7F16\u8F91 Markdown" : "\u6E32\u67D3\u9884\u89C8 Markdown (Shift+Enter)"}">${isRendered ? "\u270E" : "\u2713"}</button><button type="button" class="nb-act-btn" data-cell-act="dup" data-cell-id="${esc(cell.id)}" title="\u590D\u5236\u5E76\u5411\u4E0B\u514B\u9686\u5355\u5143\u683C">\u29C9</button><button type="button" class="nb-act-btn" data-cell-act="up" data-cell-id="${esc(cell.id)}" ${idx === 0 ? "disabled" : ""} title="\u4E0A\u79FB\u5355\u5143\u683C">\u2191</button><button type="button" class="nb-act-btn" data-cell-act="down" data-cell-id="${esc(cell.id)}" ${idx === doc.cells.length - 1 ? "disabled" : ""} title="\u4E0B\u79FB\u5355\u5143\u683C">\u2193</button><button type="button" class="nb-act-btn" data-cell-act="ins-above" data-cell-id="${esc(cell.id)}" title="\u5728\u4E0A\u65B9\u63D2\u5165\u5355\u5143\u683C">\u2912</button><button type="button" class="nb-act-btn" data-cell-act="ins-below" data-cell-id="${esc(cell.id)}" title="\u5728\u4E0B\u65B9\u63D2\u5165\u5355\u5143\u683C">\u2913</button><button type="button" class="nb-act-btn danger" data-cell-act="del" data-cell-id="${esc(cell.id)}" title="\u5220\u9664\u5355\u5143\u683C">\u{1F5D1}</button></div>` + (isRendered ? `<div class="nb-md-preview" data-cell-act="edit-md" data-cell-id="${esc(cell.id)}" title="\u53CC\u51FB\u7F16\u8F91 Markdown">${renderMarkdownHtml(cell.source)}</div>` : `<textarea class="nb-cell-textarea md-textarea" data-cell-id="${esc(cell.id)}" style="height:${mdEditorHeight}px" spellcheck="false" placeholder="# \u8F93\u5165 Markdown \u6807\u9898\u6216\u7B97\u6CD5\u63A8\u5BFC\u8BF4\u660E\uFF0C\u6309 Shift+Enter \u6E32\u67D3\u9884\u89C8">${esc(cell.source)}</textarea>`) + `</div></div></div>`;
      }
      const { hlHtml, gutterHtml, stepVizHtml } = renderCellCodeHighlight(cell, isDebugging);
      const out = cell.output;
      let outputHtml = "";
      if (out && (out.logs.length > 0 || out.returnValue != null || out.error)) {
        const logsPart = out.logs.map((l) => `<div class="nb-out-line">${esc(l)}</div>`).join("");
        const retPart = out.returnValue != null ? `<div class="nb-out-ret"><span class="nb-out-prompt">Out[${cell.executionCount || ""}]:</span> <span>${esc(out.returnValue)}</span></div>` : "";
        const errPart = out.error ? `<div class="nb-out-err">\u2717 ${esc(out.error)}</div>` : "";
        outputHtml = `<div class="nb-cell-output">${logsPart}${retPart}${errPart}</div>`;
      }
      return `<div class="nb-cell nb-cell-code${isFocused ? " active" : ""}${isDebugging ? " debugging" : ""}${cell.status === "error" ? " has-error" : ""}" data-cell-id="${esc(cell.id)}"><div class="nb-cell-bar"></div><div class="nb-cell-prompt" data-cell-act="run" data-cell-id="${esc(cell.id)}" title="\u70B9\u51FB\u8FD0\u884C\u6B64\u5355\u5143\u683C (Shift+Enter)">${esc(promptTxt)}</div><div class="nb-cell-main"><div class="nb-cell-input"><div class="nb-cell-gutter">${gutterHtml}</div><div class="nb-cell-code-box" style="height:${editorHeight}px"><pre class="nb-cell-hl" aria-hidden="true">${hlHtml}</pre><textarea class="nb-cell-textarea" data-cell-id="${esc(cell.id)}" style="height:${editorHeight}px" spellcheck="false" autocomplete="off" placeholder="${lang === "python" ? "# \u8F93\u5165 Python \u4EE3\u7801\uFF0CShift+Enter \u8FD0\u884C\uFF0C\u70B9\u53F3\u4E0A \u{1F41E} \u5355\u6B65\u8C03\u8BD5" : "// \u8F93\u5165 TypeScript \u4EE3\u7801\uFF0CShift+Enter \u8FD0\u884C\uFF0C\u70B9\u53F3\u4E0A \u{1F41E} \u5355\u6B65\u8C03\u8BD5"}">${esc(cell.source)}</textarea></div><div class="nb-cell-actions"><button type="button" class="nb-act-btn run-act" data-cell-act="run" data-cell-id="${esc(cell.id)}" title="\u8FD0\u884C\u6B64\u5355\u5143\u683C (Shift+Enter)">\u25B6</button><button type="button" class="nb-act-btn debug-act${isDebugging ? " active" : ""}" data-cell-act="debug" data-cell-id="${esc(cell.id)}" title="\u5355\u6B65\u53EF\u89C6\u5316\u8C03\u8BD5\u6B64\u5355\u5143\u683C (Ctrl+Shift+Enter)">\u{1F41E}</button><button type="button" class="nb-act-btn" data-cell-act="dup" data-cell-id="${esc(cell.id)}" title="\u590D\u5236\u5E76\u5411\u4E0B\u514B\u9686\u5355\u5143\u683C">\u29C9</button><button type="button" class="nb-act-btn" data-cell-act="up" data-cell-id="${esc(cell.id)}" ${idx === 0 ? "disabled" : ""} title="\u4E0A\u79FB\u5355\u5143\u683C">\u2191</button><button type="button" class="nb-act-btn" data-cell-act="down" data-cell-id="${esc(cell.id)}" ${idx === doc.cells.length - 1 ? "disabled" : ""} title="\u4E0B\u79FB\u5355\u5143\u683C">\u2193</button><button type="button" class="nb-act-btn" data-cell-act="ins-above" data-cell-id="${esc(cell.id)}" title="\u5728\u4E0A\u65B9\u63D2\u5165\u5355\u5143\u683C">\u2912</button><button type="button" class="nb-act-btn" data-cell-act="ins-below" data-cell-id="${esc(cell.id)}" title="\u5728\u4E0B\u65B9\u63D2\u5165\u5355\u5143\u683C">\u2913</button><button type="button" class="nb-act-btn danger" data-cell-act="del" data-cell-id="${esc(cell.id)}" title="\u5220\u9664\u5355\u5143\u683C">\u{1F5D1}</button></div></div>` + (stepVizHtml ? `<div class="nb-cell-stepviz">${stepVizHtml}</div>` : "") + outputHtml + `</div></div>`;
    }).join("") + `<div class="nb-bottom-add-bar"><button type="button" class="nb-add-chip" id="nbBottomAddCode">\uFF0B \u4EE3\u7801\u5355\u5143\u683C (Code)</button><button type="button" class="nb-add-chip" id="nbBottomAddMd">\uFF0B \u6587\u6863\u5355\u5143\u683C (Markdown)</button></div>`;
    if (cellsContainer.querySelectorAll) {
      cellsContainer.querySelectorAll(".nb-cell-textarea.md-textarea").forEach((el) => {
        if (el && el.scrollHeight && el.scrollHeight > el.clientHeight) {
          el.style.height = Math.max(92, el.scrollHeight + 10) + "px";
        }
      });
    }
    if (focusActiveEditor && doc.activeCellId) {
      const ta = queryTextArea(cellsContainer, `textarea[data-cell-id="${doc.activeCellId}"]`);
      if (ta && typeof ta.focus === "function") {
        ta.focus();
      }
    }
  }
  function toggleNotebookCellCheckpoint(cellId, lineNum) {
    const doc = getActiveNotebook();
    const cell = doc.cells.find((c) => c.id === cellId);
    if (!cell || cell.type !== "code") return;
    const lines = cell.source.replace(/\r\n?/g, "\n").split("\n");
    if (lineNum < 1 || lineNum > lines.length) return;
    const targetLine = lines[lineNum - 1] || "";
    if (/^\s*(?:checkpoint|断点)\s*\(/.test(targetLine)) {
      lines.splice(lineNum - 1, 1);
    } else {
      const indent = (targetLine.match(/^\s*/) || [""])[0];
      const stmt = appState.LANG === "python" ? "checkpoint()" : "checkpoint();";
      lines.splice(lineNum - 1, 0, indent + stmt);
    }
    cell.source = lines.join("\n");
    renderNotebookUI();
    if (doc.debuggingCellId === cell.id) {
      debugNotebookCell(cell.id);
    }
  }
  function initNotebookTabsEvents() {
    const tabsEl = $("nbTabsList");
    if (!tabsEl || !tabsEl.addEventListener) return;
    tabsEl.addEventListener("click", (e) => {
      const target = eventTargetElement(e);
      if (!target) return;
      const closeBtn = closestElement(target, "[data-close-doc]");
      const lang = appState.LANG === "python" ? "python" : "ts";
      const store = ensureLangNotebooks(lang);
      if (closeBtn) {
        e.stopPropagation();
        const closeId = closeBtn.getAttribute("data-close-doc");
        if (store.docs.length <= 1) return;
        const idx = store.docs.findIndex((d) => d.id === closeId);
        if (idx >= 0) {
          store.docs.splice(idx, 1);
          if (store.activeDocId === closeId) {
            const fallbackDoc = store.docs[Math.max(0, idx - 1)];
            if (fallbackDoc) store.activeDocId = fallbackDoc.id;
          }
          syncNotebookGlobalsToSidePanel();
          renderNotebookUI();
          renderVfsTreeUI();
        }
        return;
      }
      const newBtn = closestElement(target, "#nbBtnNewTab");
      if (newBtn) {
        const cId = nextCellId();
        const newDoc = {
          id: nextDocId(),
          title: `Untitled-${store.docs.length + 1}.ipynb`,
          lang,
          execCounter: 0,
          activeCellId: cId,
          debuggingCellId: null,
          cells: [
            {
              id: cId,
              type: "code",
              source: "",
              executionCount: null,
              status: "idle",
              output: null
            }
          ],
          executedHistory: [],
          lastGlobalVars: {},
          lastGlobalDs: {}
        };
        store.docs.push(newDoc);
        store.activeDocId = newDoc.id;
        syncNotebookGlobalsToSidePanel(newDoc);
        renderNotebookUI(true);
        renderVfsTreeUI();
        return;
      }
      const tab = closestElement(target, ".nb-tab");
      if (tab && tab.dataset.docId) {
        if (store.activeDocId !== tab.dataset.docId) {
          store.activeDocId = tab.dataset.docId;
          syncNotebookGlobalsToSidePanel();
          renderNotebookUI();
          renderVfsTreeUI();
        }
      }
    });
    tabsEl.addEventListener("dblclick", (e) => {
      const tab = closestElement(e, ".nb-tab");
      if (!tab || !tab.dataset.docId) return;
      const lang = appState.LANG === "python" ? "python" : "ts";
      const store = ensureLangNotebooks(lang);
      const targetDoc = store.docs.find((d) => d.id === tab.dataset.docId) || getActiveNotebook();
      const titleSpan = tab.querySelector ? tab.querySelector(".nb-tab-title") : null;
      if (!titleSpan) return;
      const input = document.createElement("input");
      input.type = "text";
      input.className = "nb-tab-rename-input";
      input.value = targetDoc.title;
      titleSpan.replaceWith(input);
      input.focus();
      input.select();
      let committed = false;
      const commit = () => {
        if (committed) return;
        committed = true;
        const val = input.value.trim();
        if (val) {
          const oldPath = `notebooks/${targetDoc.title}`;
          targetDoc.title = val.endsWith(".ipynb") ? val : val + ".ipynb";
          if (oldPath !== `notebooks/${targetDoc.title}`) {
            VFS_NODES.delete(oldPath);
          }
          say(`\u2713 \u7B14\u8BB0\u672C\u5DF2\u91CD\u547D\u540D\u4E3A ${targetDoc.title}`, "ok");
        }
        renderNotebookUI();
        renderVfsTreeUI();
      };
      input.addEventListener("blur", commit);
      input.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") {
          ev.preventDefault();
          input.blur();
        } else if (ev.key === "Escape") {
          committed = true;
          renderNotebookUI();
        }
      });
    });
  }
  function initNotebookCellsEvents() {
    const typeSel = $("nbCellType");
    if (typeSel) {
      typeSel.onchange = () => {
        const doc = getActiveNotebook();
        const cell = getActiveCell(doc);
        if (!cell) return;
        cell.type = typeSel.value === "markdown" ? "markdown" : "code";
        cell.markdownRendered = false;
        cell.output = null;
        cell.executionCount = null;
        renderNotebookUI(true);
      };
    }
    const cellsList = $("nbCellsList");
    if (!cellsList || !cellsList.addEventListener) return;
    cellsList.addEventListener("click", (e) => {
      const target = eventTargetElement(e);
      if (!target) return;
      if (target.closest && target.closest("#nbBottomAddCode")) {
        const doc = getActiveNotebook();
        const last = doc.cells[doc.cells.length - 1];
        insertNotebookCell("below", last ? last.id : void 0, "code");
        return;
      }
      if (target.closest && target.closest("#nbBottomAddMd")) {
        const doc = getActiveNotebook();
        const last = doc.cells[doc.cells.length - 1];
        insertNotebookCell("below", last ? last.id : void 0, "markdown");
        return;
      }
      const gline = closestElement(target, ".nb-gline");
      if (gline && gline.dataset.line) {
        const cellEl = closestElement(gline, ".nb-cell");
        if (cellEl && cellEl.dataset.cellId) {
          toggleNotebookCellCheckpoint(cellEl.dataset.cellId, parseInt(gline.dataset.line, 10));
          return;
        }
      }
      const actEl = closestElement(target, "[data-cell-act]");
      if (actEl) {
        const act = actEl.getAttribute("data-cell-act");
        const cid = actEl.getAttribute("data-cell-id");
        if (!cid) return;
        const doc = getActiveNotebook();
        doc.activeCellId = cid;
        appState.ACTIVE_NB_CELL_ID = cid;
        if (act === "run") {
          runNotebookCell(cid, true);
          return;
        }
        if (act === "debug") {
          debugNotebookCell(cid);
          return;
        }
        if (act === "dup") {
          duplicateNotebookCell(cid);
          return;
        }
        if (act === "up") {
          moveNotebookCell(-1, cid);
          return;
        }
        if (act === "down") {
          moveNotebookCell(1, cid);
          return;
        }
        if (act === "ins-above") {
          insertNotebookCell("above", cid);
          return;
        }
        if (act === "ins-below") {
          insertNotebookCell("below", cid);
          return;
        }
        if (act === "del") {
          deleteNotebookCell(cid);
          return;
        }
        if (act === "toggle-md") {
          const c = doc.cells.find((x) => x.id === cid);
          if (c) {
            c.markdownRendered = !c.markdownRendered;
            renderNotebookUI(!c.markdownRendered);
          }
          return;
        }
      }
      const cellBox = closestElement(target, ".nb-cell");
      if (cellBox && cellBox.dataset.cellId) {
        const doc = getActiveNotebook();
        if (doc.activeCellId !== cellBox.dataset.cellId) {
          doc.activeCellId = cellBox.dataset.cellId;
          appState.ACTIVE_NB_CELL_ID = doc.activeCellId;
          if (cellsList.querySelectorAll) {
            cellsList.querySelectorAll(".nb-cell").forEach((el) => {
              el.classList.toggle("active", el.dataset.cellId === doc.activeCellId);
            });
          }
          const c = getActiveCell(doc);
          if (typeSel && c) typeSel.value = c.type;
        }
      }
    });
    cellsList.addEventListener("dblclick", (e) => {
      const mdPrev = closestElement(e, '[data-cell-act="edit-md"]');
      if (mdPrev) {
        const cid = mdPrev.getAttribute("data-cell-id");
        const doc = getActiveNotebook();
        const c = doc.cells.find((x) => x.id === cid);
        if (c) {
          c.markdownRendered = false;
          doc.activeCellId = c.id;
          renderNotebookUI(true);
        }
      }
    });
    cellsList.addEventListener("input", (e) => {
      const ta = eventTargetTextArea(e);
      if (!ta || !ta.classList || !ta.classList.contains("nb-cell-textarea")) return;
      const cid = ta.getAttribute("data-cell-id");
      const doc = getActiveNotebook();
      const cell = doc.cells.find((c) => c.id === cid);
      if (!cell) return;
      cell.source = ta.value;
      if (cell.type === "markdown") {
        const estH = estimateMarkdownEditorHeight(cell.source);
        ta.style.height = "auto";
        const nextH = Math.max(estH, (ta.scrollHeight || 0) + 10);
        ta.style.height = nextH + "px";
        return;
      }
      const lineCount = Math.max(1, cell.source.split("\n").length);
      const h = Math.max(38, lineCount * 24 + 14);
      ta.style.height = h + "px";
      const codeBox = closestElement(ta, ".nb-cell-code-box");
      if (codeBox) codeBox.style.height = h + "px";
      if (cell.type === "code") {
        const isDebugging = doc.debuggingCellId === cell.id && appState.DEBUG_SESSION.active;
        const { hlHtml, gutterHtml } = renderCellCodeHighlight(cell, isDebugging);
        const hlPre = codeBox && codeBox.querySelector ? codeBox.querySelector(".nb-cell-hl") : null;
        if (hlPre) hlPre.innerHTML = hlHtml;
        const inputWrap = ta.closest ? ta.closest(".nb-cell-input") : null;
        const gutter = inputWrap && inputWrap.querySelector ? inputWrap.querySelector(".nb-cell-gutter") : null;
        if (gutter) gutter.innerHTML = gutterHtml;
      }
    });
    cellsList.addEventListener("keydown", (e) => {
      const ta = eventTargetTextArea(e);
      if (!ta || !ta.classList || !ta.classList.contains("nb-cell-textarea")) return;
      const cid = ta.getAttribute("data-cell-id") || void 0;
      if (e.key === "Tab") {
        e.preventDefault();
        const s = ta.selectionStart || 0;
        const t = ta.selectionEnd || 0;
        const indent = appState.LANG === "python" ? "    " : "  ";
        ta.value = ta.value.slice(0, s) + indent + ta.value.slice(t);
        ta.selectionStart = ta.selectionEnd = s + indent.length;
        ta.dispatchEvent(new Event("input", { bubbles: true }));
        return;
      }
      if (e.key === "Enter" && e.shiftKey && !(e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        runNotebookCell(cid, true);
        return;
      }
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && e.shiftKey) {
        e.preventDefault();
        debugNotebookCell(cid);
        return;
      }
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        runNotebookCell(cid, false);
        return;
      }
    });
  }
  function initNotebookUI() {
    bindGlobalVfsApi();
    ensureVfsInitialized();
    const modeSwitch = $("modeSwitch");
    if (modeSwitch && modeSwitch.addEventListener) {
      modeSwitch.addEventListener("click", (e) => {
        const btn = closestElement(e, ".mode-tab");
        if (!btn || !btn.dataset.mode) return;
        setViewMode(btn.dataset.mode === "notebook" ? "notebook" : "script");
      });
    }
    initScriptTabsAndImportEvents();
    initVfsSidebarEvents();
    renderScriptTabsUI();
    renderVfsTreeUI();
    renderImportSampleMenu();
    const nbWrap = $("notebookWrap");
    if (!nbWrap || !nbWrap.addEventListener) return;
    initNotebookTabsEvents();
    const bindBtn = (id, fn) => {
      const b = $(id);
      if (b) b.onclick = fn;
    };
    bindBtn("nbBtnAdd", () => insertNotebookCell("below"));
    bindBtn("nbBtnCut", () => cutNotebookCell());
    bindBtn("nbBtnCopy", () => copyNotebookCell());
    bindBtn("nbBtnPaste", () => pasteNotebookCell());
    bindBtn("nbBtnRun", () => runNotebookCell(void 0, true));
    bindBtn("nbBtnStop", () => {
      const doc = getActiveNotebook();
      doc.debuggingCellId = null;
      stopAuto();
      resetTraceState();
      syncNotebookGlobalsToSidePanel(doc);
      renderNotebookUI();
      say("\u25A0 \u5DF2\u9000\u51FA\u5F53\u524D\u5355\u5143\u683C\u5355\u6B65\u8C03\u8BD5\uFF0C\u6062\u590D\u663E\u793A Notebook \u5168\u5C40\u4E0A\u4E0B\u6587", "dim");
    });
    bindBtn("nbBtnRestart", () => restartNotebookKernel(false));
    bindBtn("nbBtnRunAll", () => runAllNotebookCells());
    initNotebookCellsEvents();
    if (typeof window !== "undefined") {
      window.onNotebookLangChanged = (_nextLang) => {
        renderImportSampleMenu();
        renderScriptTabsUI();
        renderVfsTreeUI();
        if (appState.VIEW_MODE === "notebook") {
          const doc = getActiveNotebook();
          syncNotebookGlobalsToSidePanel(doc);
          renderNotebookUI();
        }
      };
    }
  }
  function openVfsNotebookFile(name, content) {
    const lang = appState.LANG === "python" ? "python" : "ts";
    const store = ensureLangNotebooks(lang);
    const existing = store.docs.find((d) => d.title === name);
    if (existing) {
      store.activeDocId = existing.id;
      setViewMode("notebook");
      renderNotebookUI();
      return;
    }
    if (content && importNotebookFromJson(content, name)) {
      return;
    }
    setViewMode("notebook");
  }
  function importSampleIntoNotebook(code, sampleKey) {
    const doc = getActiveNotebook();
    const newCell = {
      id: nextCellId(),
      type: "code",
      source: code.trim(),
      executionCount: null,
      status: "idle",
      output: null
    };
    doc.cells.push(newCell);
    doc.activeCellId = newCell.id;
    renderNotebookUI(true);
    say(`\u2713 \u5DF2\u5C06\u793A\u4F8B ${sampleKey} \u5BFC\u5165\u5230\u5F53\u524D Notebook \u65B0\u5355\u5143\u683C`, "ok");
  }
  registerUiHooks({
    setViewMode,
    openVfsNotebookFile,
    importSampleIntoNotebook,
    renderNotebookUI,
    getActiveWorkspacePath: () => appState.VIEW_MODE === "notebook" ? getActiveNotebook().title : getActiveScriptTab().vfsPath
  });

  // src/main.ts
  bindStateGlobals();
  bindDomGlobals();
  var allExports = {
    ...state_exports,
    ...dom_exports,
    ...ts_samples_exports,
    ...py_samples_exports,
    ...comments_exports,
    ...transpile_exports,
    ...instrumenter_exports,
    ...type_checker_exports,
    ...event_loop_exports,
    ...runner_exports,
    ...ast_view_exports,
    ...highlight_exports,
    ...memory_graph_exports,
    ...controls_exports,
    ...share_exports,
    ...video_webm_exports,
    ...vfs_exports,
    ...script_tabs_exports,
    ...notebook_exports
  };
  Object.assign(globalThis, allExports);
  if (typeof globalThis.syncGutterAndHighlight !== "function") {
    globalThis.syncGutterAndHighlight = updateEditorChrome;
  }
  if (typeof globalThis.updateCursorPos !== "function") {
    globalThis.updateCursorPos = recordEditorCursorLine;
  }
  if (!globalThis.breakpoints) {
    globalThis.breakpoints = /* @__PURE__ */ new Set();
  }
  initNotebookUI();
  boot();
})();
