"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

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
    LANG_BUFFERS: { ts: null },
    CONSOLE_LOGS: [],
    VIDEO_EXPORT_SPEED: 1,
    IS_EXPORTING_VIDEO: false,
    TRACE: { title: "TypeScript Playground · Debug", code: [], steps: [] },
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
    ENTRY_FILE_PATH: "",
    ACTIVE_DEBUG_FILE: "",
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
    collectWorkspaceFileMap: () => /* @__PURE__ */ new Map(),
    switchToScriptFile: () => {
    },
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
    openTutorialModal: () => {
    },
    importTutorialNotebook: () => false,
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
    btnOpenTsTutorialsEl: () => btnOpenTsTutorialsEl,
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
    tutorialModalCloseEl: () => tutorialModalCloseEl,
    tutorialModalDetailEl: () => tutorialModalDetailEl,
    tutorialModalEl: () => tutorialModalEl,
    tutorialModalListEl: () => tutorialModalListEl,
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
  var btnOpenTsTutorialsEl = $("btnOpenTsTutorials");
  var tutorialModalEl = $("tutorialModal");
  var tutorialModalCloseEl = $("tutorialModalClose");
  var tutorialModalListEl = $("tutorialModalList");
  var tutorialModalDetailEl = $("tutorialModalDetail");
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
    btnImportEl,
    btnOpenTsTutorialsEl,
    tutorialModalEl,
    tutorialModalCloseEl,
    tutorialModalListEl,
    tutorialModalDetailEl
  };
  function renderConsoleLogEntry(entry) {
    if (!logEl || typeof document === "undefined" || !document.createElement) return;
    const d = document.createElement("div");
    if (entry.cls) d.className = entry.cls;
    if (entry.line) {
      d.className = (entry.cls ? entry.cls + " " : "") + "diag";
      if (d.setAttribute) {
        d.setAttribute("data-line", String(entry.line));
        d.setAttribute("title", "点击定位到第 " + entry.line + " 行");
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
      checkpoint(sum >= target, "窗口达标");
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
    checkpoint(acc > 10, "检查累加值");
    if (acc > limit) {
      throw new Error("运行时异常: 累加值 acc(" + acc + ") 超过安全阈值 " + limit);
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
  checkpoint(score > 0, "异步等待完成");
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
      if (/(?<![=!<>:])=(?![=>])/.test(t)) return false;
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
        return { error: { line, message: "enum 成员暂不支持这种写法：" + part.slice(0, 40) } };
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
          return { error: { line, message: 'enum 成员 "' + key + '" 的值无法静态求值' } };
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
        return { error: { line, message: 'enum 成员 "' + key + '" 的值无法静态求值（暂不支持引用其他成员或复杂表达式）' } };
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
          feature: "with 语句",
          hint: "严格模式下不支持 `with (...)` 语句，请直接访问对象属性或使用解构赋值。"
        });
      }
      if (/^import\s+[A-Za-z_$][\w$]*\s*=\s*require\s*\(/.test(line)) {
        results.push({
          line: lineNo,
          feature: "import = require()",
          hint: "浏览器沙箱不支持 CommonJS `import x = require(...)`，请直接定义所需模块或使用标准 ES 语法。"
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
    if (m && m[1] && !RESERVED_WORDS.has(m[1]) && !m[1].startsWith("__")) names.add(m[1]);
  }
  function collectNames(js) {
    const clean = blankStrings(js);
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
    const casePre = raw.match(/^(\s*(?:case\b|default\b))/);
    if (casePre && casePre[1]) {
      let d = 0;
      let colonIdx = -1;
      for (let k = casePre[1].length; k < raw.length; k++) {
        const ch = raw[k];
        if (ch === '"' || ch === "'" || ch === "`") {
          k = skipString(raw, k) - 1;
          continue;
        }
        if (ch === "/" && raw[k + 1] === "/") break;
        if (ch === "(" || ch === "[" || ch === "{") d++;
        else if (ch === ")" || ch === "]" || ch === "}") d = Math.max(0, d - 1);
        else if (ch === ":" && d === 0) {
          colonIdx = k;
          break;
        }
      }
      if (colonIdx >= 0) {
        const afterColon = stripInlineCommentSafe(raw.slice(colonIdx + 1)).trim();
        if (afterColon && afterColon !== "{") {
          return raw.slice(0, colonIdx + 1) + " " + callExpr + "; " + raw.slice(colonIdx + 1).trimStart();
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
            const label = rawExpr.length > 36 ? rawExpr.slice(0, 33) + "…" : rawExpr;
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
  function instrument(js, originalLines, names, filePath) {
    const lines = js.split("\n");
    const out = [];
    let parenDepth = 0;
    const braceStack = [];
    let prevContinued = false;
    let prevUnbracedControl = false;
    const fileArgSuffix = filePath ? ", " + JSON.stringify(filePath) : "";
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
      const note = srcLine.length > 72 ? srcLine.slice(0, 69) + "…" : srcLine;
      const insideClass = braceStack.some((k) => k === "classbody");
      const withThis = insideClass && !inClassBody && !/\bsuper\s*\(/.test(t);
      const callExpr = filePath ? "__t(" + (i + 1) + ", " + JSON.stringify(note) + ", " + snapFnExpr(names) + ", " + (withThis ? "this" : "undefined") + fileArgSuffix + ")" : "__t(" + (i + 1) + ", " + JSON.stringify(note) + ", " + snapFnExpr(names) + (withThis ? ", this" : "") + ")";
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
        const enterHook = fnHeader.isAsync ? ` return (__t && __t.__async ? __t.__async(function* () { var ${fnHeader.fidVar} = (typeof __t === "function" && __t.__enter) ? __t.__enter(${JSON.stringify(fnHeader.name)}, ${JSON.stringify(fnHeader.params)}, [${fnHeader.params.join(", ")}], ${fnHeader.line}, ${snapFnExpr(names)}${fileArgSuffix}) : 0; try {` : ` var ${fnHeader.fidVar} = (typeof __t === "function" && __t.__enter) ? __t.__enter(${JSON.stringify(fnHeader.name)}, ${JSON.stringify(fnHeader.params)}, [${fnHeader.params.join(", ")}], ${fnHeader.line}, ${snapFnExpr(names)}${fileArgSuffix}) : 0; try {`;
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
    const ckptPreamble = 'var checkpoint = function(){ try { if (typeof __t === "function" && __t.__ckpt) __t.__ckpt(Array.prototype.slice.call(arguments)); } catch (_){} }, 断点 = checkpoint; var Promise = (__t && __t.__env && __t.__env.Promise) || globalThis.Promise, setTimeout = (__t && __t.__env && __t.__env.setTimeout) || globalThis.setTimeout, clearTimeout = (__t && __t.__env && __t.__env.clearTimeout) || globalThis.clearTimeout, queueMicrotask = (__t && __t.__env && __t.__env.queueMicrotask) || globalThis.queueMicrotask; if (typeof sleep === "undefined") { var sleep = (__t && __t.__env && __t.__env.sleep) || function(ms, val){ return new Promise(function(r){ setTimeout(function(){ r(val); }, ms); }); }; } try { if (typeof __t === "function" && __t.__initGlobal) __t.__initGlobal(' + snapFnExpr(names) + "); } catch (_){} ";
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
      if (/^(?:return|throw|if|for|while|switch|class|function|const|let|var|import|export|await|new|checkpoint|断点)\b/.test(cleaned)) return null;
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
    buildExportAssignmentFooter: () => buildExportAssignmentFooter,
    buildModuleGraph: () => buildModuleGraph,
    checkPass2Statements: () => checkPass2Statements,
    collectPass1Declarations: () => collectPass1Declarations,
    createTypeCheckContext: () => createTypeCheckContext,
    createTypeEvalEngine: () => createTypeEvalEngine,
    createTypeInferEngine: () => createTypeInferEngine,
    ensureTsWorker: () => ensureTsWorker,
    extractTsInterfaceMetadata: () => extractTsInterfaceMetadata,
    formatFnSigInfoToTypeString: () => formatFnSigInfoToTypeString,
    formatFunctionTypeSignature: () => formatFunctionTypeSignature,
    inferExpr: () => inferExpr,
    inferLiteralType: () => inferLiteralType,
    inferRuntimeTsType: () => inferRuntimeTsType,
    isAssignable: () => isAssignable,
    isLiteralOfPrimitive: () => isLiteralOfPrimitive,
    isTsAssignable: () => isTsAssignable,
    matchInterfaceForObject: () => matchInterfaceForObject,
    matchTemplateLiteralType: () => matchTemplateLiteralType,
    normalizeTsType: () => normalizeTsType,
    normalizeWorkspaceModulePath: () => normalizeWorkspaceModulePath,
    parseModuleImportsAndExports: () => parseModuleImportsAndExports,
    parseObjectLiteralEntries: () => parseObjectLiteralEntries,
    parseTopLevelConditional: () => parseTopLevelConditional,
    parseType: () => parseType,
    parseTypeParams: () => parseTypeParams,
    requestTsWorkerCheck: () => requestTsWorkerCheck,
    resolveModuleImportPath: () => resolveModuleImportPath,
    rewriteModuleEsmToCjs: () => rewriteModuleEsmToCjs,
    splitTopLevelDecl: () => splitTopLevelDecl,
    splitTopLevelIntersection: () => splitTopLevelIntersection,
    splitTopLevelUnion: () => splitTopLevelUnion,
    stripNullableFromType: () => stripNullableFromType,
    stripTupleElementLabel: () => stripTupleElementLabel,
    substituteTypeParamsInStr: () => substituteTypeParamsInStr,
    typeCheck: () => typeCheck,
    typeToStr: () => typeToStr,
    typecheckTS: () => typecheckTS,
    typecheckWorkspaceModules: () => typecheckWorkspaceModules
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
    if (typeof val === "string") return JSON.stringify(val.length > 16 ? val.slice(0, 14) + "…" : val);
    if (typeof val === "number" || typeof val === "boolean") return String(val);
    if (Array.isArray(val)) return "[" + val.slice(0, 4).map(formatShortVal).join(", ") + (val.length > 4 ? ", …" : "") + "]";
    if (isMapLike(val)) return "Map(" + val.size + ")";
    if (isSetLike(val)) return "Set(" + val.size + ")";
    if (isRecord(val)) {
      const keys = Object.keys(val);
      if (keys.length > 0 && keys.length <= 4 && keys.every((k) => val[k] === null || typeof val[k] !== "object")) {
        return "{ " + keys.map((k) => k + ": " + formatShortVal(val[k])).join(", ") + " }";
      }
    }
    return "{…}";
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
    const clsName = typeof val.__cls__ === "string" && val.__cls__ ? val.__cls__ : val.constructor && val.constructor !== Object && val.constructor.name ? val.constructor.name : "";
    if (clsName) {
      defineHidden(out, "__cls__", clsName);
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
              `… (共 ${v.length} 项)`,
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
    "断点"
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
  function formatSingleFnParamClause(rawParam) {
    const cleaned = rawParam.trim().replace(/^(?:(?:public|private|protected|readonly)\s+)+/, "");
    if (!cleaned) return { name: "", formatted: "", rawType: null };
    let eqIdx = -1;
    let depth = 0;
    for (let i = 0; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (ch === '"' || ch === "'" || ch === "`") {
        i = skipString(cleaned, i) - 1;
        continue;
      }
      if (ch === "(" || ch === "[" || ch === "{" || ch === "<") depth++;
      else if (ch === ")" || ch === "]" || ch === "}" || ch === ">" && cleaned[i - 1] !== "=") {
        depth = Math.max(0, depth - 1);
      } else if (ch === "=" && depth === 0 && cleaned[i + 1] !== ">" && cleaned[i + 1] !== "=" && cleaned[i - 1] !== "=" && cleaned[i - 1] !== "!" && cleaned[i - 1] !== "<" && cleaned[i - 1] !== ">") {
        eqIdx = i;
        break;
      }
    }
    const headPart = eqIdx >= 0 ? cleaned.slice(0, eqIdx).trim() : cleaned;
    const defaultPart = eqIdx >= 0 ? cleaned.slice(eqIdx + 1).trim() : "";
    let colonIdx = -1;
    depth = 0;
    for (let i = 0; i < headPart.length; i++) {
      const ch = headPart[i];
      if (ch === '"' || ch === "'" || ch === "`") {
        i = skipString(headPart, i) - 1;
        continue;
      }
      if (ch === "(" || ch === "[" || ch === "{" || ch === "<") depth++;
      else if (ch === ")" || ch === "]" || ch === "}" || ch === ">" && headPart[i - 1] !== "=") {
        depth = Math.max(0, depth - 1);
      } else if (ch === ":" && depth === 0) {
        colonIdx = i;
        break;
      }
    }
    if (colonIdx >= 0) {
      const pLeft = headPart.slice(0, colonIdx).trim();
      const pType = headPart.slice(colonIdx + 1).trim() || "any";
      const cleanName2 = pLeft.replace(/^\.\.\./, "").replace(/\?$/, "").trim();
      return {
        name: cleanName2,
        formatted: `${pLeft}: ${pType}`,
        rawType: pType
      };
    }
    let inferredType = "any";
    if (defaultPart) {
      if (/^[+-]?\d+(?:\.\d+)?$/.test(defaultPart)) inferredType = "number";
      else if (/^(true|false)$/.test(defaultPart)) inferredType = "boolean";
      else if (/^["'`]/.test(defaultPart)) inferredType = "string";
    }
    const cleanName = headPart.replace(/^\.\.\./, "").replace(/\?$/, "").trim();
    const isRest = headPart.startsWith("...");
    return {
      name: cleanName,
      formatted: `${headPart}: ${isRest && inferredType === "any" ? "any[]" : inferredType}`,
      rawType: null
    };
  }
  function formatFnSigInfoToTypeString(sig) {
    const tParams = sig.typeParams && sig.typeParams.length > 0 ? "<" + sig.typeParams.map(
      (tp) => tp.name + (tp.constraint ? ` extends ${tp.constraint}` : "") + (tp.defaultType ? ` = ${tp.defaultType}` : "")
    ).join(", ") + ">" : "";
    const paramsStr = sig.params.map((p) => `${p.isRest ? "..." : ""}${p.name}${p.optional ? "?" : ""}: ${p.rawType || p.type || "any"}`).join(", ");
    const retStr = sig.rawReturnType || sig.returnType || "any";
    return `${tParams}(${paramsStr}) => ${retStr}`;
  }
  function formatFunctionTypeSignature(varName, fnVal) {
    const meta = appState.CURRENT_TS_META;
    if (varName && meta) {
      const fromFnMap = meta.fnTypes ? meta.fnTypes.get(varName) : void 0;
      if (fromFnMap && fromFnMap.includes("=>")) return fromFnMap;
      const fromVarMap = meta.varTypes ? meta.varTypes.get(varName) : void 0;
      if (fromVarMap && fromVarMap.includes("=>")) return fromVarMap;
    }
    if (typeof fnVal === "function" && fnVal.name && meta) {
      const fnName = fnVal.name;
      const fromFnMap = meta.fnTypes ? meta.fnTypes.get(fnName) : void 0;
      if (fromFnMap && fromFnMap.includes("=>")) return fromFnMap;
      const fromVarMap = meta.varTypes ? meta.varTypes.get(fnName) : void 0;
      if (fromVarMap && fromVarMap.includes("=>")) return fromVarMap;
    }
    if (typeof fnVal === "function") {
      try {
        const fnStr = Function.prototype.toString.call(fnVal).trim();
        const openP = fnStr.indexOf("(");
        if (openP >= 0 && openP < 80) {
          const closeP = findBalancedParen(fnStr, openP);
          if (closeP > openP) {
            const rawParams = splitTopLevel(fnStr.slice(openP + 1, closeP)).map((s) => s.trim()).filter(Boolean);
            const formatted = rawParams.map((p) => formatSingleFnParamClause(p).formatted).filter(Boolean).join(", ");
            const isAsync = /^async\b/.test(fnStr);
            return `(${formatted}) => ${isAsync ? "Promise<any>" : "any"}`;
          }
        }
        const singleArrow = fnStr.match(/^(?:async\s+)?([A-Za-z_$][\w$]*)\s*=>/);
        if (singleArrow && singleArrow[1]) {
          const isAsync = /^async\b/.test(fnStr);
          return `(${singleArrow[1]}: any) => ${isAsync ? "Promise<any>" : "any"}`;
        }
      } catch (_) {
      }
    }
    return "(...args: any[]) => any";
  }
  function extractTsInterfaceMetadata(src, merge = false) {
    const interfaces = merge && appState.CURRENT_TS_META?.interfaces ? new Map(appState.CURRENT_TS_META.interfaces) : /* @__PURE__ */ new Map();
    const varTypes = merge && appState.CURRENT_TS_META?.varTypes ? new Map(appState.CURRENT_TS_META.varTypes) : /* @__PURE__ */ new Map();
    const fnTypes = merge && appState.CURRENT_TS_META?.fnTypes ? new Map(appState.CURRENT_TS_META.fnTypes) : /* @__PURE__ */ new Map();
    if (!src || typeof src !== "string") {
      appState.CURRENT_TS_META = { interfaces, varTypes, fnTypes };
      return appState.CURRENT_TS_META;
    }
    const lines = src.replace(/\r\n?/g, "\n").split("\n");
    const localTypeAliases = /* @__PURE__ */ new Map();
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
      const typeAliasM = trimmed.match(/^(?:export\s+)?type\s+([A-Za-z_$][\w$]*)(?:\s*<[^>]*>)?\s*=\s*(.+?);?$/);
      if (typeAliasM && typeAliasM[1] && typeAliasM[2]) {
        localTypeAliases.set(typeAliasM[1], typeAliasM[2].trim());
        continue;
      }
      const fnHdrM = trimmed.match(/^(?:export\s+)?(?:default\s+)?(async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)/);
      if (fnHdrM && fnHdrM[2] && trimmed.includes("(")) {
        const isAsyncFn = Boolean(fnHdrM[1]);
        const fnName = fnHdrM[2];
        let headerStr = trimmed;
        let scanIdx = i;
        const findFnOpenParen = (str) => {
          let pos = fnHdrM[0].length;
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
        let openP = findFnOpenParen(headerStr);
        while ((openP < 0 || findBalancedParen(headerStr, openP) < 0) && scanIdx + 1 < lines.length) {
          scanIdx++;
          headerStr += " " + stripInlineCommentSafe(lines[scanIdx]).trim();
          openP = findFnOpenParen(headerStr);
        }
        const closeP = openP >= 0 ? findBalancedParen(headerStr, openP) : -1;
        if (closeP > openP) {
          const tParamPart = headerStr.slice(fnHdrM[0].length, openP).trim();
          const paramInner = headerStr.slice(openP + 1, closeP).trim();
          const rawParams = paramInner ? splitTopLevel(paramInner) : [];
          const formattedParams = [];
          rawParams.forEach((p) => {
            const parsedP = formatSingleFnParamClause(p);
            if (parsedP.formatted) formattedParams.push(parsedP.formatted);
            if (parsedP.name && parsedP.rawType) {
              varTypes.set(parsedP.name, parsedP.rawType);
            }
          });
          const afterClose = headerStr.slice(closeP + 1).trim();
          const retM = afterClose.match(/^:\s*([^{;]+?)(?:\s*\{[\s\S]*|\s*;)?$/);
          const retType = retM && retM[1] ? retM[1].trim() : isAsyncFn ? "Promise<any>" : "any";
          const fnSig = `${tParamPart ? tParamPart : ""}(${formattedParams.join(", ")}) => ${retType}`;
          fnTypes.set(fnName, fnSig);
          varTypes.set(fnName, fnSig);
        }
        continue;
      }
      const varDeclM = trimmed.match(/^(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*:\s*((?:[^=]|=>)+?)(?:\s*=\s*(?!>)\s*([\s\S]+)|;?$)/);
      if (varDeclM && varDeclM[1] && varDeclM[2]) {
        const vName = varDeclM[1];
        let declT = varDeclM[2].trim().replace(/;$/, "").trim();
        const resolvedAlias = localTypeAliases.get(declT);
        if (resolvedAlias && resolvedAlias.includes("=>")) {
          declT = resolvedAlias;
        }
        varTypes.set(vName, declT);
        if (declT.includes("=>")) {
          fnTypes.set(vName, declT);
        }
        continue;
      }
      const varArrowM = trimmed.match(
        /^(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(async\s+)?(?:function\s*\*?(?:\s+[A-Za-z_$][\w$]*)?\s*)?(<[^>]+>\s*)?\(([^)]*)\)\s*(?::\s*([^=]+?))?\s*(?:=>|\{)/
      );
      if (varArrowM && varArrowM[1]) {
        const vName = varArrowM[1];
        const isAsyncArrow = Boolean(varArrowM[2]);
        const tParamPart = (varArrowM[3] || "").trim();
        const paramInner = (varArrowM[4] || "").trim();
        const rawParams = paramInner ? splitTopLevel(paramInner) : [];
        const formattedParams = [];
        rawParams.forEach((p) => {
          const parsedP = formatSingleFnParamClause(p);
          if (parsedP.formatted) formattedParams.push(parsedP.formatted);
          if (parsedP.name && parsedP.rawType) {
            varTypes.set(parsedP.name, parsedP.rawType);
          }
        });
        const retType = varArrowM[5] ? varArrowM[5].trim() : isAsyncArrow ? "Promise<any>" : "any";
        const fnSig = `${tParamPart}(${formattedParams.join(", ")}) => ${retType}`;
        fnTypes.set(vName, fnSig);
        varTypes.set(vName, fnSig);
        continue;
      }
      const varNewM = trimmed.match(/^(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*new\s+([A-Za-z_$][\w$]*)\s*(?:<[^>]*>)?\s*\(/);
      if (varNewM && varNewM[1] && varNewM[2] && !/^(Map|Set|Array)$/.test(varNewM[2])) {
        varTypes.set(varNewM[1], varNewM[2]);
      }
    }
    appState.CURRENT_TS_META = { interfaces, varTypes, fnTypes };
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
      const clsName = typeof value.__cls__ === "string" ? value.__cls__ : "";
      if (clsName && interfaces.has(clsName)) {
        return interfaces.get(clsName) || null;
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
          addDiag(lineNum, "TS2741", `类型中缺少属性 "${propName}"，但类型 "${expectedType}" 中需要该属性 (${contextDesc})`);
        }
      });
      entries.forEach((valExpr, propName) => {
        const valT = inferType(valExpr, lineNum);
        if (propName.startsWith("[") && propName.endsWith("]")) {
          const keyExpr = propName.slice(1, -1).trim();
          inferType(keyExpr, lineNum);
          const targetProp = shape.get(propName) || indexProp;
          if (targetProp && valT !== "any" && !isExpressionAssignable(valExpr, valT, targetProp.type, lineNum)) {
            addDiag(lineNum, "TS2322", `属性 "${propName}" 的类型 "${valT}" 不能分配给类型 "${targetProp.type}" (${contextDesc})`);
          }
          return;
        }
        if (!shape.has(propName)) {
          if (indexProp) {
            const expectedPropT = indexProp.type;
            if (valExpr.trim().startsWith("{") && getInterfaceShape(expectedPropT)) {
              checkObjectLiteralAgainstShape(valExpr, expectedPropT, lineNum, `属性 "${propName}"`);
            } else if (valT !== "any" && !isExpressionAssignable(valExpr, valT, expectedPropT, lineNum)) {
              addDiag(lineNum, "TS2322", `属性 "${propName}" 的类型 "${valT}" 不能分配给索引签名类型 "${expectedPropT}" (${contextDesc})`);
            }
          } else {
            addDiag(lineNum, "TS2353", `对象字面量只能指定已知属性，并且 "${propName}" 不存在于类型 "${expectedType}" 中 (${contextDesc})`);
          }
        } else {
          const expectedPropT = (shape.get(propName) || { type: "any" }).type;
          const nonNullPropT = stripNullableFromType(stripNullableFromType(evaluateType(expectedPropT, activeTypeParams), "null"), "undefined");
          if (valExpr.trim().startsWith("{") && (getInterfaceShape(expectedPropT) || getInterfaceShape(nonNullPropT))) {
            checkObjectLiteralAgainstShape(valExpr, nonNullPropT || expectedPropT, lineNum, `属性 "${propName}"`);
          } else if (valT !== "any" && !isExpressionAssignable(valExpr, valT, expectedPropT, lineNum)) {
            addDiag(lineNum, "TS2322", `属性 "${propName}" 的类型 "${valT}" 不能分配给类型 "${expectedPropT}" (${contextDesc})`);
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
              addDiag(lineNum, "TS1360", `类型 "${lhsT}" 不满足预期类型 "${resolvedCast}"`);
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
            addDiag(lineNum, "TS2511", `无法创建抽象类 "${clsName}" 的实例`);
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
              instantiateAndCheckCall(effectiveSig, explicitTypeArgs, args, argTypes, `构造函数 "new ${clsName}"`, lineNum, callEnv);
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
                    addDiag(lineNum, "TS2344", `类型 "${bVal}" 不满足泛型约束 "${cEval}" ("new ${clsName}" 的类型参数 "${tp.name}")`);
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
            addDiag(lineNum, "TS2511", `无法创建抽象类 "${newClassPrefixM[1]}" 的实例`);
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
                  addDiag(lineNum, "TS2367", `此比较表达式类型不匹配：无法比较类型 "${lt}" 与 "${rt}"`);
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
              addDiag(lineNum, "TS18046", `对象的类型为 "unknown"`);
            }
            if (ch === "+") {
              if (lt === "string" || rt === "string") return "string";
              if (lt === "number" && rt === "number") return "number";
              if (lt === "number" && rt === "boolean" || lt === "boolean" && rt === "number" || lt.endsWith("[]") || rt.endsWith("[]")) {
                addDiag(lineNum, "TS2365", `运算符 "+" 不能应用于类型 "${lt}" 和 "${rt}"`);
              }
              return lt === "number" || rt === "number" ? "number" : "any";
            } else {
              const badL = lt === "string" || lt === "boolean" || lt.endsWith("[]");
              const badR = rt === "string" || rt === "boolean" || rt.endsWith("[]");
              if (badL || badR) {
                addDiag(lineNum, "TS2362", `算术运算符 "${ch}" 的操作数类型必须为 "number"，不能为 "${badL ? lt : rt}"`);
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
          addDiag(lineNum, "TS2362", `一元算术运算符不能应用于类型 "${ut}"`);
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
          return instantiateAndCheckCall(mSig, [], args, argTypes, `方法 "${objType}.${method}"`, lineNum);
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
          if (callee === "checkpoint" || callee === "断点") {
            if (args.length <= 2 && argTypes[0] && argTypes[0] !== "any" && isTsAssignable(argTypes[0], "boolean")) {
              if (argTypes[1] && argTypes[1] !== "any" && !isTsAssignable(argTypes[1], "string")) {
                addDiag(lineNum, "TS2345", `"${callee}" 的第 2 个参数（打印消息）类型 "${argTypes[1]}" 不能赋给类型 "string"`);
              }
            }
            return "void";
          }
          if (/^Math\.(max|min|abs|floor|ceil|round|pow|sqrt|trunc|sign)$/.test(callee)) {
            argTypes.forEach((at, idx) => {
              if (at !== "any" && !isTsAssignable(at, "number")) {
                addDiag(lineNum, "TS2345", `调用 "${callee}" 的第 ${idx + 1} 个参数类型 "${at}" 不能赋给类型 "number"`);
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
              addDiag(lineNum, "TS18046", `"${objName}" 的类型为 "unknown"`);
              return "any";
            }
            if (!isOptChain && !objName.endsWith("!")) {
              const uParts = splitTopLevelUnion(rawObjType);
              if (uParts.includes("undefined")) {
                addDiag(lineNum, "TS18048", `"${objName}" 可能为 "undefined"`);
              } else if (uParts.includes("null")) {
                addDiag(lineNum, "TS18047", `"${objName}" 可能为 "null"`);
              }
            }
            const objType = stripNullableFromType(stripNullableFromType(rawObjType, "null"), "undefined");
            const mapM = objType.match(/^Map<([^,]+),(.+)>$/);
            if (mapM && mapM[1] && mapM[2]) {
              const kt = mapM[1], vt = mapM[2];
              if (method === "get" || method === "has" || method === "delete") {
                if (argTypes[0] && !isExpressionAssignable(args[0], argTypes[0], kt, lineNum)) {
                  addDiag(lineNum, "TS2345", `"${objName}.${method}" 的键参数类型 "${argTypes[0]}" 不能赋给类型 "${kt}"`);
                }
                return method === "get" ? `${vt}|undefined` : "boolean";
              }
              if (method === "set") {
                if (argTypes[0] && !isExpressionAssignable(args[0], argTypes[0], kt, lineNum)) {
                  addDiag(lineNum, "TS2345", `"${objName}.set" 的键参数类型 "${argTypes[0]}" 不能赋给类型 "${kt}"`);
                }
                if (argTypes[1] && !isExpressionAssignable(args[1], argTypes[1], vt, lineNum)) {
                  addDiag(lineNum, "TS2345", `"${objName}.set" 的值参数类型 "${argTypes[1]}" 不能赋给类型 "${vt}"`);
                }
                return objType;
              }
            }
            const setM = objType.match(/^Set<(.+)>$/);
            if (setM && setM[1]) {
              const vt = setM[1];
              if (method === "add" || method === "has" || method === "delete") {
                if (argTypes[0] && !isExpressionAssignable(args[0], argTypes[0], vt, lineNum)) {
                  addDiag(lineNum, "TS2345", `"${objName}.${method}" 的参数类型 "${argTypes[0]}" 不能赋给类型 "${vt}"`);
                }
                return method === "add" ? objType : "boolean";
              }
            }
            if (objType.endsWith("[]")) {
              const elemT = objType.slice(0, -2);
              if (method === "push" || method === "unshift") {
                argTypes.forEach((at, idx) => {
                  if (!isExpressionAssignable(args[idx], at, elemT, lineNum)) {
                    addDiag(lineNum, "TS2345", `数组 "${objName}.${method}" 的参数类型 "${at}" 不能赋给元素类型 "${elemT}"`);
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
              return instantiateAndCheckCall(classMethodSig, explicitTypeArgs, args, argTypes, `方法 "${objName}.${method}"`, lineNum);
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
            return instantiateAndCheckCall(sig, explicitTypeArgs, args, argTypes, `函数 "${callee}"`, lineNum);
          }
          if (dotIdx < 0 && !isKnownIdentifier(callee)) {
            addDiag(lineNum, "TS2304", `找不到名称 "${callee}"`);
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
          addDiag(lineNum, "TS18046", `"${curBase}" 的类型为 "unknown"`);
          return "any";
        }
        if (!isOptBracket && !curBase.endsWith("!")) {
          const uParts = splitTopLevelUnion(curType);
          if (uParts.includes("undefined")) addDiag(lineNum, "TS18048", `"${curBase}" 可能为 "undefined"`);
          else if (uParts.includes("null")) addDiag(lineNum, "TS18047", `"${curBase}" 可能为 "null"`);
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
              addDiag(lineNum, "TS2538", `数组或字符串的索引类型必须为 "number"，不能使用类型 "${idxType}"`);
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
            addDiag(lineNum, "TS2304", `找不到名称 "${firstBase}"（变量未声明，请使用 let 或 const 声明）`);
            return "any";
          }
          if (enumsSet.has(firstBase)) {
            const secondTok = tokens[1];
            const memberProp = secondTok ? secondTok.name : "";
            const memSet = enumMembers.get(firstBase);
            if (memSet && memSet.size > 0 && !memSet.has(memberProp)) {
              addDiag(lineNum, "TS2339", `类型 "typeof ${firstBase}" 上不存在属性 "${memberProp}"`);
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
              addDiag(lineNum, "TS18046", `"${prefixLabel}" 的类型为 "unknown"`);
              return "any";
            }
            if (tok.optChainBefore) {
              hadOptChain = true;
            } else if (!tokens[pIdx - 1]?.hasBang) {
              const cParts = splitTopLevelUnion(curType);
              if (cParts.includes("undefined")) {
                addDiag(lineNum, "TS18048", `"${prefixLabel}" 可能为 "undefined"`);
              } else if (cParts.includes("null")) {
                addDiag(lineNum, "TS18047", `"${prefixLabel}" 可能为 "null"`);
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
                addDiag(lineNum, "TS2339", `类型 "${lookupType}" 上不存在属性 "${prop}"`);
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
          addDiag(lineNum, "TS2304", `找不到名称 "${s}"（变量未声明，请使用 let 或 const 声明）`);
        }
      }
      return "any";
    }
    function instantiateAndCheckCall(sig, explicitTypeArgs, args, argTypes, calleeLabel, lineNum, outEnv = null) {
      const hasRest = sig.params.some((p) => p.isRest);
      if (args.length < sig.minArgs || !hasRest && args.length > sig.params.length) {
        addDiag(lineNum, "TS2554", `${calleeLabel} 应有 ${sig.minArgs === sig.params.length ? sig.params.length : sig.minArgs + "-" + sig.params.length} 个参数，但获得 ${args.length} 个`);
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
              addDiag(lineNum, "TS2345", `类型 "${boundT}" 不满足泛型约束 "${constraintT}" (${calleeLabel} 的类型参数 "${tp.name}")`);
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
            checkObjectLiteralAgainstShape(rawArg, expectedPT, lineNum, `${calleeLabel} 的参数 "${p.name}"`);
          } else if (!isExpressionAssignable(rawArg, at, expectedPT, lineNum)) {
            addDiag(lineNum, "TS2345", `类型 "${at}" 的参数不能赋给类型 "${expectedPT}" 的参数 (${calleeLabel} 的参数 "${p.name}")`);
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
          checkObjectLiteralAgainstShape(el.trim(), expectedElemType, lineNum, `${contextLabel} 第 ${idx + 1} 个元素`);
        } else if (!isExpressionAssignable(el, et, expectedElemType, lineNum)) {
          addDiag(lineNum, "TS2322", `${contextLabel} 第 ${idx + 1} 个元素类型 "${et}" 不能分配给元素类型 "${expectedElemType}"`);
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
              addDiag(lineNum, "TS7006", `参数 "${pName}" 隐式具有 "any" 类型（严格模式下请显式添加类型注解，如 ${pName}: number）`);
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

  // src/compiler/module-graph.ts
  function normalizeWorkspaceModulePath(rawPath) {
    const cleaned = String(rawPath ?? "").trim().replace(/\\/g, "/").replace(/^\/+/, "");
    const stripped = cleaned.startsWith("workspace/") ? cleaned.slice("workspace/".length) : cleaned.startsWith("./") ? cleaned.slice(2) : cleaned;
    const parts = stripped.split("/");
    const resolved = [];
    for (const seg of parts) {
      if (!seg || seg === ".") continue;
      if (seg === "..") {
        if (resolved.length > 0) resolved.pop();
        continue;
      }
      resolved.push(seg);
    }
    return resolved.join("/");
  }
  function resolveModuleImportPath(fromFile, specifier, availableFiles) {
    const spec = String(specifier ?? "").trim();
    if (!spec) return null;
    if (spec === "fs" || spec === "node:fs" || spec === "fs/promises" || spec === "node:fs/promises") {
      return "fs";
    }
    const normFrom = normalizeWorkspaceModulePath(fromFile || "main.ts");
    const fromParts = normFrom.split("/").filter(Boolean);
    fromParts.pop();
    let targetSegments = [];
    if (spec.startsWith("./") || spec.startsWith("../")) {
      targetSegments = [...fromParts];
      const relParts = spec.split("/");
      for (const seg of relParts) {
        if (!seg || seg === ".") continue;
        if (seg === "..") {
          if (targetSegments.length === 0) return null;
          targetSegments.pop();
        } else {
          targetSegments.push(seg);
        }
      }
    } else if (spec.startsWith("/workspace/") || spec.startsWith("workspace/")) {
      const norm = normalizeWorkspaceModulePath(spec);
      targetSegments = norm.split("/").filter(Boolean);
    } else if (spec.startsWith("/")) {
      const norm = normalizeWorkspaceModulePath(spec.slice(1));
      targetSegments = norm.split("/").filter(Boolean);
    } else {
      const norm = normalizeWorkspaceModulePath(spec);
      targetSegments = norm.split("/").filter(Boolean);
    }
    const baseCandidate = targetSegments.join("/");
    if (!baseCandidate) return null;
    const candidates = [];
    if (/\.[A-Za-z0-9]+$/.test(baseCandidate)) {
      candidates.push(baseCandidate);
      if (baseCandidate.endsWith(".js")) {
        candidates.push(baseCandidate.slice(0, -3) + ".ts");
      }
    } else {
      candidates.push(baseCandidate + ".ts");
      candidates.push(baseCandidate + ".tsx");
      candidates.push(baseCandidate + ".js");
      candidates.push(baseCandidate + "/index.ts");
    }
    if (fromParts.length > 0 && !spec.startsWith(".")) {
      const dirCandidate = [...fromParts, ...targetSegments].join("/");
      if (!/\.[A-Za-z0-9]+$/.test(dirCandidate)) {
        candidates.push(dirCandidate + ".ts");
      } else {
        candidates.push(dirCandidate);
      }
    }
    if (availableFiles && availableFiles.size > 0) {
      for (const cand of candidates) {
        if (availableFiles.has(cand)) return cand;
      }
      for (const cand of candidates) {
        const lower = cand.toLowerCase();
        for (const existingKey of availableFiles.keys()) {
          if (existingKey.toLowerCase() === lower) return existingKey;
        }
      }
      return null;
    }
    return candidates[0] || null;
  }
  function parseNamedSpecifiersList(braceInner, parentTypeOnly) {
    const bindings = [];
    const parts = splitTopLevel(braceInner);
    for (const rawPart of parts) {
      let part = rawPart.trim();
      if (!part) continue;
      let isTypeOnly = parentTypeOnly;
      if (/^type\s+/.test(part)) {
        isTypeOnly = true;
        part = part.replace(/^type\s+/, "").trim();
      }
      const asMatch = part.match(/^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/);
      const imported = asMatch && asMatch[1] ? asMatch[1] : part;
      const local = asMatch && asMatch[2] ? asMatch[2] : part;
      if (/^[A-Za-z_$][\w$]*$/.test(imported) && /^[A-Za-z_$][\w$]*$/.test(local)) {
        bindings.push({ imported, local, isTypeOnly });
      }
    }
    return bindings;
  }
  function parseModuleImportsAndExports(src, currentFile = "main.ts", availableFiles) {
    const lines = String(src ?? "").replace(/\r/g, "").split("\n");
    const imports = [];
    const exports = [];
    let hasRelativeImports = false;
    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      const rawLine = lines[i] ?? "";
      const trimmed = stripInlineCommentSafe(rawLine).trim();
      if (!trimmed) continue;
      if (/^import\b/.test(trimmed)) {
        const cleanStmt = trimmed.replace(/;\s*$/, "").trim();
        const sideEffectM = cleanStmt.match(/^import\s+(['"])([^'"]+)\1$/);
        if (sideEffectM && sideEffectM[2]) {
          const spec = sideEffectM[2].trim();
          const isBuiltinFs = spec === "fs" || spec === "node:fs" || spec === "fs/promises" || spec === "node:fs/promises";
          if (!isBuiltinFs) hasRelativeImports = true;
          imports.push({
            line: lineNum,
            specifier: spec,
            resolvedPath: resolveModuleImportPath(currentFile, spec, availableFiles),
            isTypeOnly: false,
            isBuiltinFs,
            bindings: []
          });
          continue;
        }
        const impM = cleanStmt.match(/^import\s+(type\s+)?([\s\S]+?)\s+from\s+(['"])([^'"]+)\3$/);
        if (impM && impM[2] && impM[4]) {
          const isTypeOnly = Boolean(impM[1]);
          const clause = impM[2].trim();
          const spec = impM[4].trim();
          const isBuiltinFs = spec === "fs" || spec === "node:fs" || spec === "fs/promises" || spec === "node:fs/promises";
          if (!isBuiltinFs) hasRelativeImports = true;
          const bindings = [];
          const nsM = clause.match(/^\*\s+as\s+([A-Za-z_$][\w$]*)$/);
          if (nsM && nsM[1]) {
            bindings.push({ imported: "*", local: nsM[1], isTypeOnly });
          } else if (clause.startsWith("{") && clause.endsWith("}")) {
            bindings.push(...parseNamedSpecifiersList(clause.slice(1, -1), isTypeOnly));
          } else {
            const defAndNamedM = clause.match(/^([A-Za-z_$][\w$]*)\s*,\s*\{([\s\S]*)\}$/);
            if (defAndNamedM && defAndNamedM[1] && defAndNamedM[2] !== void 0) {
              bindings.push({ imported: "default", local: defAndNamedM[1], isTypeOnly });
              bindings.push(...parseNamedSpecifiersList(defAndNamedM[2], isTypeOnly));
            } else if (/^[A-Za-z_$][\w$]*$/.test(clause)) {
              bindings.push({ imported: "default", local: clause, isTypeOnly });
            }
          }
          imports.push({
            line: lineNum,
            specifier: spec,
            resolvedPath: resolveModuleImportPath(currentFile, spec, availableFiles),
            isTypeOnly,
            isBuiltinFs,
            bindings
          });
        }
        continue;
      }
      if (/^export\b/.test(trimmed)) {
        const cleanStmt = trimmed.replace(/;\s*$/, "").trim();
        const exportListM = cleanStmt.match(/^export\s+(type\s+)?\{([^}]*)\}(?:\s+from\s+(['"])([^'"]+)\3)?$/);
        if (exportListM && exportListM[2] !== void 0) {
          const isTypeExport = Boolean(exportListM[1]);
          const fromSpec = exportListM[4] ? exportListM[4].trim() : void 0;
          if (fromSpec) {
            hasRelativeImports = true;
            imports.push({
              line: lineNum,
              specifier: fromSpec,
              resolvedPath: resolveModuleImportPath(currentFile, fromSpec, availableFiles),
              isTypeOnly: isTypeExport,
              isBuiltinFs: false,
              bindings: []
            });
          }
          const items = splitTopLevel(exportListM[2]);
          for (const rawItem of items) {
            let item = rawItem.trim();
            if (!item) continue;
            let itemTypeOnly = isTypeExport;
            if (/^type\s+/.test(item)) {
              itemTypeOnly = true;
              item = item.replace(/^type\s+/, "").trim();
            }
            const asM = item.match(/^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/);
            const local = asM && asM[1] ? asM[1] : item;
            const exported = asM && asM[2] ? asM[2] : item;
            if (/^[A-Za-z_$][\w$]*$/.test(local) && /^[A-Za-z_$][\w$]*$/.test(exported)) {
              exports.push({
                line: lineNum,
                exported,
                local,
                kind: fromSpec ? "reexport" : itemTypeOnly ? "type" : "value",
                reexportSpecifier: fromSpec
              });
            }
          }
          continue;
        }
        const typeExportM = cleanStmt.match(/^export\s+(?:declare\s+)?(interface|type)\s+([A-Za-z_$][\w$]*)/);
        if (typeExportM && typeExportM[2]) {
          exports.push({
            line: lineNum,
            exported: typeExportM[2],
            local: typeExportM[2],
            kind: "type"
          });
          continue;
        }
        const enumExportM = cleanStmt.match(/^export\s+(?:const\s+)?enum\s+([A-Za-z_$][\w$]*)/);
        if (enumExportM && enumExportM[1]) {
          exports.push({
            line: lineNum,
            exported: enumExportM[1],
            local: enumExportM[1],
            kind: "enum"
          });
          continue;
        }
        const fnExportM = cleanStmt.match(/^export\s+(default\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)?/);
        if (fnExportM) {
          const isDefault = Boolean(fnExportM[1]);
          const fnName = fnExportM[2] || "__default_export__";
          exports.push({
            line: lineNum,
            exported: isDefault ? "default" : fnName,
            local: fnName,
            kind: "function"
          });
          if (isDefault && fnExportM[2]) {
            exports.push({
              line: lineNum,
              exported: fnExportM[2],
              local: fnExportM[2],
              kind: "function"
            });
          }
          continue;
        }
        const clsExportM = cleanStmt.match(/^export\s+(default\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)?/);
        if (clsExportM) {
          const isDefault = Boolean(clsExportM[1]);
          const clsName = clsExportM[2] || "__default_export__";
          exports.push({
            line: lineNum,
            exported: isDefault ? "default" : clsName,
            local: clsName,
            kind: "class"
          });
          if (isDefault && clsExportM[2]) {
            exports.push({
              line: lineNum,
              exported: clsExportM[2],
              local: clsExportM[2],
              kind: "class"
            });
          }
          continue;
        }
        const varExportM = cleanStmt.match(/^export\s+(?:const|let|var)\s+([\s\S]+)$/);
        if (varExportM && varExportM[1]) {
          const decls = splitTopLevel(varExportM[1]);
          for (const d of decls) {
            const idM = d.trim().match(/^([A-Za-z_$][\w$]*)/);
            if (idM && idM[1]) {
              exports.push({
                line: lineNum,
                exported: idM[1],
                local: idM[1],
                kind: "value"
              });
            }
          }
          continue;
        }
        if (/^export\s+default\b/.test(cleanStmt)) {
          exports.push({
            line: lineNum,
            exported: "default",
            local: "__default_export__",
            kind: "value"
          });
        }
      }
    }
    return { imports, exports, hasRelativeImports };
  }
  function rewriteModuleEsmToCjs(src, currentFile = "main.ts", availableFiles) {
    const normCurrent = normalizeWorkspaceModulePath(currentFile || "main.ts");
    const lines = String(src ?? "").replace(/\r/g, "").split("\n");
    const outLines = [];
    const exportedBindings = [];
    const seenExported = /* @__PURE__ */ new Set();
    const recordExport = (exported, local) => {
      const key = `${exported}:${local}`;
      if (!seenExported.has(key)) {
        seenExported.add(key);
        exportedBindings.push({ exported, local });
      }
    };
    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i] ?? "";
      const trimmed = stripInlineCommentSafe(rawLine).trim();
      const indentMatch = rawLine.match(/^(\s*)/);
      const indent = indentMatch && indentMatch[1] ? indentMatch[1] : "";
      if (/^import\b/.test(trimmed)) {
        const cleanStmt = trimmed.replace(/;\s*$/, "").trim();
        const sideM = cleanStmt.match(/^import\s+(['"])([^'"]+)\1$/);
        if (sideM && sideM[2]) {
          const spec = sideM[2].trim();
          const resolved = resolveModuleImportPath(normCurrent, spec, availableFiles) || spec;
          outLines.push(`${indent}/*__import__*/ __require(${JSON.stringify(resolved)}, ${JSON.stringify(normCurrent)});`);
          continue;
        }
        const impM = cleanStmt.match(/^import\s+(type\s+)?([\s\S]+?)\s+from\s+(['"])([^'"]+)\3$/);
        if (impM && impM[2] && impM[4]) {
          const isTypeOnly = Boolean(impM[1]);
          const clause = impM[2].trim();
          const spec = impM[4].trim();
          if (isTypeOnly) {
            outLines.push(`${indent}/*__import_type__*/`);
            continue;
          }
          if (spec === "fs" || spec === "node:fs" || spec === "fs/promises" || spec === "node:fs/promises") {
            outLines.push(indent + transpileFsImportStatement(rawLine.trim()));
            continue;
          }
          const resolved = resolveModuleImportPath(normCurrent, spec, availableFiles) || spec;
          const targetTypeExports = /* @__PURE__ */ new Set();
          if (availableFiles && availableFiles.has(resolved)) {
            const targetSrc = availableFiles.get(resolved) || "";
            const parsedTarget = parseModuleImportsAndExports(targetSrc, resolved, availableFiles);
            for (const exp of parsedTarget.exports) {
              if (exp.kind === "type") {
                targetTypeExports.add(exp.exported);
              }
            }
          }
          const reqCall = `__require(${JSON.stringify(resolved)}, ${JSON.stringify(normCurrent)})`;
          const nsM = clause.match(/^\*\s+as\s+([A-Za-z_$][\w$]*)$/);
          if (nsM && nsM[1]) {
            outLines.push(`${indent}/*__import__*/ var ${nsM[1]} = ${reqCall};`);
            continue;
          }
          if (clause.startsWith("{") && clause.endsWith("}")) {
            const bindings = parseNamedSpecifiersList(clause.slice(1, -1), false).filter(
              (b) => !b.isTypeOnly && !targetTypeExports.has(b.imported)
            );
            if (bindings.length === 0) {
              outLines.push(`${indent}/*__import_type__*/`);
            } else {
              const destructure = bindings.map((b) => b.imported === b.local ? b.local : `${b.imported}: ${b.local}`).join(", ");
              outLines.push(`${indent}/*__import__*/ var { ${destructure} } = ${reqCall};`);
            }
            continue;
          }
          const defAndNamedM = clause.match(/^([A-Za-z_$][\w$]*)\s*,\s*\{([\s\S]*)\}$/);
          if (defAndNamedM && defAndNamedM[1] && defAndNamedM[2] !== void 0) {
            const defLocal = defAndNamedM[1];
            const named = parseNamedSpecifiersList(defAndNamedM[2], false).filter(
              (b) => !b.isTypeOnly && !targetTypeExports.has(b.imported)
            );
            const tmpVar = `__mod_${i + 1}`;
            const destructure = named.map((b) => b.imported === b.local ? b.local : `${b.imported}: ${b.local}`).join(", ");
            const namedPart = destructure ? `, { ${destructure} } = ${tmpVar}` : "";
            outLines.push(
              `${indent}/*__import__*/ var ${tmpVar} = ${reqCall}, ${defLocal} = (${tmpVar} && ${tmpVar}.default !== undefined ? ${tmpVar}.default : ${tmpVar})${namedPart};`
            );
            continue;
          }
          if (/^[A-Za-z_$][\w$]*$/.test(clause)) {
            const tmpVar = `__mod_${i + 1}`;
            outLines.push(
              `${indent}/*__import__*/ var ${tmpVar} = ${reqCall}, ${clause} = (${tmpVar} && ${tmpVar}.default !== undefined ? ${tmpVar}.default : ${tmpVar});`
            );
            continue;
          }
        }
      }
      if (/^export\b/.test(trimmed)) {
        const cleanStmt = trimmed.replace(/;\s*$/, "").trim();
        const exportListM = cleanStmt.match(/^export\s+(type\s+)?\{([^}]*)\}(?:\s+from\s+(['"])([^'"]+)\3)?$/);
        if (exportListM && exportListM[2] !== void 0) {
          const isTypeOnly = Boolean(exportListM[1]);
          const fromSpec = exportListM[4] ? exportListM[4].trim() : "";
          if (isTypeOnly) {
            outLines.push(`${indent}/*__export_type__*/`);
            continue;
          }
          const items = parseNamedSpecifiersList(exportListM[2], false).filter((b) => !b.isTypeOnly);
          if (fromSpec) {
            const resolved = resolveModuleImportPath(normCurrent, fromSpec, availableFiles) || fromSpec;
            const tmpVar = `__reexp_${i + 1}`;
            const assigns = items.map((b) => `__exports.${b.local} = ${tmpVar}.${b.imported};`).join(" ");
            outLines.push(
              `${indent}/*__import__*/ var ${tmpVar} = __require(${JSON.stringify(resolved)}, ${JSON.stringify(normCurrent)}); ${assigns}`
            );
          } else {
            items.forEach((b) => recordExport(b.local, b.imported));
            outLines.push(`${indent}/*__export__*/`);
          }
          continue;
        }
        if (/^export\s+(?:declare\s+)?(?:interface|type)\b/.test(cleanStmt)) {
          outLines.push(rawLine.replace(/^(\s*)export\s+/, "$1"));
          continue;
        }
        const fnM = cleanStmt.match(/^export\s+(default\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)?/);
        if (fnM) {
          const isDefault = Boolean(fnM[1]);
          const fnName = fnM[2] || "";
          if (isDefault && fnName) {
            recordExport("default", fnName);
            recordExport(fnName, fnName);
            outLines.push(rawLine.replace(/^(\s*)export\s+default\s+/, "$1"));
          } else if (isDefault && !fnName) {
            recordExport("default", "__default_export__");
            outLines.push(rawLine.replace(/^(\s*)export\s+default\s+/, "$1const __default_export__ = "));
          } else if (fnName) {
            recordExport(fnName, fnName);
            outLines.push(rawLine.replace(/^(\s*)export\s+/, "$1"));
          } else {
            outLines.push(rawLine.replace(/^(\s*)export\s+/, "$1"));
          }
          continue;
        }
        const clsM = cleanStmt.match(/^export\s+(default\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)?/);
        if (clsM) {
          const isDefault = Boolean(clsM[1]);
          const clsName = clsM[2] || "";
          if (isDefault && clsName) {
            recordExport("default", clsName);
            recordExport(clsName, clsName);
            outLines.push(rawLine.replace(/^(\s*)export\s+default\s+/, "$1"));
          } else if (isDefault && !clsName) {
            recordExport("default", "__default_export__");
            outLines.push(rawLine.replace(/^(\s*)export\s+default\s+/, "$1const __default_export__ = "));
          } else if (clsName) {
            recordExport(clsName, clsName);
            outLines.push(rawLine.replace(/^(\s*)export\s+/, "$1"));
          } else {
            outLines.push(rawLine.replace(/^(\s*)export\s+/, "$1"));
          }
          continue;
        }
        const enumM = cleanStmt.match(/^export\s+(?:const\s+)?enum\s+([A-Za-z_$][\w$]*)/);
        if (enumM && enumM[1]) {
          recordExport(enumM[1], enumM[1]);
          outLines.push(rawLine.replace(/^(\s*)export\s+/, "$1"));
          continue;
        }
        const varM = cleanStmt.match(/^export\s+(?:const|let|var)\s+([\s\S]+)$/);
        if (varM && varM[1]) {
          const decls = splitTopLevel(varM[1]);
          for (const d of decls) {
            const idM = d.trim().match(/^([A-Za-z_$][\w$]*)/);
            if (idM && idM[1]) {
              recordExport(idM[1], idM[1]);
            }
          }
          outLines.push(rawLine.replace(/^(\s*)export\s+/, "$1"));
          continue;
        }
        if (/^export\s+default\b/.test(cleanStmt)) {
          recordExport("default", "__default_export__");
          outLines.push(rawLine.replace(/^(\s*)export\s+default\s+/, "$1const __default_export__ = "));
          continue;
        }
      }
      outLines.push(rawLine);
    }
    return {
      code: outLines.join("\n"),
      exportedBindings
    };
  }
  function buildExportAssignmentFooter(exportedBindings) {
    if (exportedBindings.length === 0) return "";
    const getters = exportedBindings.map(
      (b) => `try { Object.defineProperty(__exports, ${JSON.stringify(b.exported)}, { enumerable: true, configurable: true, get: function(){ return ${b.local}; } }); } catch (_) { try { __exports[${JSON.stringify(b.exported)}] = ${b.local}; } catch (__e) {} }`
    ).join(" ");
    return `if (typeof __exports === "object" && __exports) { ${getters} }`;
  }
  function isReadonlyStringMap(val) {
    return typeof val.forEach === "function" && typeof val.get === "function";
  }
  function buildModuleGraph(entryFile, entrySource, fileMap) {
    const normEntry = normalizeWorkspaceModulePath(entryFile || "main.ts") || "main.ts";
    const allFiles = /* @__PURE__ */ new Map();
    if (isReadonlyStringMap(fileMap)) {
      fileMap.forEach((content, k) => {
        const nk = normalizeWorkspaceModulePath(k);
        if (nk) allFiles.set(nk, content.replace(/\r/g, ""));
      });
    } else {
      Object.keys(fileMap).forEach((k) => {
        const nk = normalizeWorkspaceModulePath(k);
        const content = fileMap[k];
        if (nk && typeof content === "string") allFiles.set(nk, content.replace(/\r/g, ""));
      });
    }
    allFiles.set(normEntry, String(entrySource ?? "").replace(/\r/g, ""));
    const entryParsed = parseModuleImportsAndExports(
      allFiles.get(normEntry) || "",
      normEntry,
      allFiles
    );
    const modules = /* @__PURE__ */ new Map();
    const diagnostics = [];
    const order = [];
    const visiting = /* @__PURE__ */ new Set();
    const visited = /* @__PURE__ */ new Set();
    function visit(filePath) {
      if (visited.has(filePath)) return;
      visiting.add(filePath);
      const rawSource = allFiles.get(filePath) ?? "";
      const parsed = filePath === normEntry ? entryParsed : parseModuleImportsAndExports(rawSource, filePath, allFiles);
      const deps = [];
      for (const imp of parsed.imports) {
        if (imp.isBuiltinFs) continue;
        if (!imp.resolvedPath || !allFiles.has(imp.resolvedPath)) {
          diagnostics.push({
            file: filePath,
            line: imp.line,
            code: "TS2307",
            message: `找不到模块 "${imp.specifier}"（请确认文件已存在于 /workspace 工作区中）`,
            severity: "error"
          });
          continue;
        }
        const depPath = imp.resolvedPath;
        if (!deps.includes(depPath)) deps.push(depPath);
        if (visiting.has(depPath)) {
          diagnostics.push({
            file: filePath,
            line: imp.line,
            code: "TS2300",
            message: `检测到模块循环依赖: "${filePath}" -> "${depPath}"`,
            severity: "error"
          });
          continue;
        }
        visit(depPath);
      }
      const node = {
        file: filePath,
        rawSource,
        lines: rawSource.split("\n"),
        imports: parsed.imports,
        exports: parsed.exports,
        dependencies: deps
      };
      modules.set(filePath, node);
      visiting.delete(filePath);
      visited.add(filePath);
      order.push(filePath);
    }
    visit(normEntry);
    modules.forEach((modNode) => {
      for (const imp of modNode.imports) {
        if (imp.isBuiltinFs || !imp.resolvedPath) continue;
        const targetMod = modules.get(imp.resolvedPath);
        if (!targetMod) continue;
        const exportedSet = /* @__PURE__ */ new Set();
        for (const exp of targetMod.exports) {
          exportedSet.add(exp.exported);
          if (exp.reexportSpecifier) {
            const reRes = resolveModuleImportPath(targetMod.file, exp.reexportSpecifier, allFiles);
            if (reRes && modules.has(reRes)) {
              modules.get(reRes)?.exports.forEach((re) => exportedSet.add(re.exported));
            }
          }
        }
        for (const bind of imp.bindings) {
          if (bind.imported === "*") continue;
          if (!exportedSet.has(bind.imported)) {
            diagnostics.push({
              file: modNode.file,
              line: imp.line,
              code: "TS2305",
              message: `模块 "${imp.specifier}" (${imp.resolvedPath}) 没有导出成员 "${bind.imported}"`,
              severity: "error"
            });
          }
        }
      }
    });
    const isMultiFile = order.length > 1 || entryParsed.hasRelativeImports || entryParsed.exports.length > 0;
    return {
      entryFile: normEntry,
      isMultiFile,
      order,
      modules,
      diagnostics
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
            addDiag(clsLine, "TS2420", `类 "${clsName}" 错误实现接口 "${ifaceName}": 缺少属性或方法 "${propName}"`);
          } else if (clsShape && clsShape.has(propName)) {
            const clsMember = clsShape.get(propName);
            if (clsMember && clsMember.type !== "any" && propInfo.type !== "any" && !isTsAssignable(clsMember.type, propInfo.type)) {
              addDiag(clsLine, "TS2420", `类 "${clsName}" 错误实现接口 "${ifaceName}": 属性 "${propName}" 的类型 "${clsMember.type}" 不能分配给类型 "${propInfo.type}"`);
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
        const impMatch = trimmed.replace(/;$/, "").trim().match(/^import\s+(?:type\s+)?([\s\S]+?)\s+from\s+(['"])([^'"]+)\2\s*$/);
        if (impMatch) {
          const clause = (impMatch[1] || "").trim();
          const modSpec = (impMatch[3] || "").trim();
          const isFsRoot = modSpec === "fs" || modSpec === "node:fs";
          const isFsPromises = modSpec === "fs/promises" || modSpec === "node:fs/promises";
          const modType = isFsPromises ? "__FsPromises__" : isFsRoot ? "__FsModule__" : "any";
          const isAlreadyLinked = (localName) => !isFsRoot && !isFsPromises && (env.has(localName) || fns.has(localName) || interfaces.has(localName) || ctx.typeAliases.has(localName) || ctx.genericTypeAliases.has(localName) || ctx.enumsSet.has(localName));
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
              if (isAlreadyLinked(local)) return;
              const bType = isFsRoot && imported === "promises" ? "__FsPromises__" : "any";
              env.set(local, { type: bType, isConst: true, line: lineNum, declaredType: bType });
            });
          };
          const nsM = clause.match(/^\*\s+as\s+([A-Za-z_$][\w$]*)$/);
          if (nsM && nsM[1]) {
            if (!isAlreadyLinked(nsM[1])) {
              env.set(nsM[1], { type: modType, isConst: true, line: lineNum, declaredType: modType });
            }
          } else if (clause.startsWith("{") && clause.endsWith("}")) {
            registerNamedBindings(clause);
          } else {
            const defNamedM = clause.match(/^([A-Za-z_$][\w$]*)\s*,\s*(\{[\s\S]+\})$/);
            if (defNamedM && defNamedM[1] && defNamedM[2]) {
              if (!isAlreadyLinked(defNamedM[1])) {
                env.set(defNamedM[1], { type: modType, isConst: true, line: lineNum, declaredType: modType });
              }
              registerNamedBindings(defNamedM[2]);
            } else if (/^[A-Za-z_$][\w$]*$/.test(clause)) {
              if (!isAlreadyLinked(clause)) {
                env.set(clause, { type: modType, isConst: true, line: lineNum, declaredType: modType });
              }
            }
          }
        }
        continue;
      }
      if (/^export\s+(?:type\s+)?\{[^}]*\}(?:\s+from\s+['"][^'"]+['"])?\s*;?$/.test(trimmed)) {
        const braceM = trimmed.match(/^export\s+(type\s+)?\{([^}]*)\}(?:\s+from\s+['"]([^'"]+)['"])?/);
        if (braceM && braceM[2] !== void 0 && !braceM[3]) {
          splitTopLevel(braceM[2]).forEach((rawItem) => {
            const item = rawItem.trim().replace(/^type\s+/, "").trim();
            if (!item) return;
            const asM = item.match(/^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/);
            const local = asM && asM[1] ? asM[1] : item;
            if (/^[A-Za-z_$][\w$]*$/.test(local) && !isKnownIdentifier(local)) {
              addDiag(lineNum, "TS2304", `找不到要导出的名称 "${local}"`);
            }
          });
        }
        continue;
      }
      if (/^export\s+default\b/.test(trimmed) && !/^export\s+default\s+(?:async\s+)?(?:function|class|abstract\s+class)\b/.test(trimmed)) {
        const defExpr = trimmed.replace(/^export\s+default\s+/, "").replace(/;\s*$/, "").trim();
        if (defExpr) {
          const defT = inferType(defExpr, lineNum);
          env.set("__default_export__", { type: defT, isConst: true, line: lineNum, declaredType: defT });
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
                addDiag(lineNum, "TS2322", `不能将类型 "${initT}" 分配给类型 "${declT}" (属性 "${currentClass}.${fName}")`);
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
        if (/\bthrow\b/.test(bodyAfterOpenBrace)) {
          activeFn.hasValueReturn = true;
        }
        const rm = bodyAfterOpenBrace.match(/\breturn\b([^;}\n]*)/);
        if (rm && rm[1]?.trim()) {
          activeFn.hasValueReturn = true;
          const inlineRetExpr = rm[1].trim();
          const inlineRetT = inferType(inlineRetExpr, lineNum);
          const expRet = activeFn.returnType;
          const unwrappedExp = expRet && expRet.startsWith("Promise<") && expRet.endsWith(">") ? expRet.slice(8, -1) : expRet;
          if (expRet && expRet !== "any" && !isExpressionAssignable(inlineRetExpr, inlineRetT, expRet, lineNum) && !isExpressionAssignable(inlineRetExpr, inlineRetT, unwrappedExp, lineNum)) {
            addDiag(lineNum, "TS2322", `不能将返回值类型 "${inlineRetT}" 分配给函数 "${activeFn.name}" 声明的返回类型 "${expRet}"`);
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
                  addDiag(lineNum, "TS2322", `不能将类型 "${rhsT}" 分配给类型 "${lhsT}" ("${lhs}")`);
                }
              } else if (/^[A-Za-z_$][\w$]*$/.test(lhs) && !isKnownIdentifier(lhs)) {
                addDiag(lineNum, "TS2304", `找不到名称 "${lhs}"（变量未声明，请使用 let 或 const 声明）`);
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
            if (currentFn.returnType !== "any" && currentFn.returnType !== "void" && currentFn.returnType !== "Promise<void>" && currentFn.returnType !== "never" && currentFn.returnType !== "Promise<never>" && currentFn.returnType !== "unknown" && !isGenRet && !currentFn.hasValueReturn) {
              addDiag(currentFn.line, "TS2355", `函数 "${currentFn.name}" 声明返回类型为 "${currentFn.returnType}"，但缺少 return 返回值语句`);
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
            addDiag(lineNum, "TS2304", `找不到名称 "${lhsRaw}"（变量未声明，请使用 let 或 const 声明）`);
          } else if (env.has(lhsRaw) && env.get(lhsRaw)?.isConst) {
            addDiag(lineNum, "TS2588", `无法分配到 "${lhsRaw}"，因为它是常数 (const)`);
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
                addDiag(lineNum, "TS2322", `不能将类型 "${initT}" 分配给类型 "${declT}" (循环变量 "${vName}")`);
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
                addDiag(lineNum, "TS2304", `找不到名称 "${am[1]}"（变量未声明，请使用 let 或 const 声明）`);
              } else if (env.has(am[1]) && env.get(am[1])?.isConst) {
                addDiag(lineNum, "TS2588", `无法分配到 "${am[1]}"，因为它是常数 (const)`);
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
              addDiag(lineNum, "TS2304", `找不到名称 "${updVar[1]}"（变量未声明，请使用 let 或 const 声明）`);
            } else if (env.has(updVar[1]) && env.get(updVar[1])?.isConst) {
              addDiag(lineNum, "TS2588", `无法分配到 "${updVar[1]}"，因为它是常数 (const)`);
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
                  checkObjectLiteralAgainstShape(initExpr, declT, lineNum, `变量 "${vName}"`);
                } else if (declT.endsWith("[]") && splitTopLevelUnion(declT).length <= 1 && initExpr.startsWith("[")) {
                  checkArrayElementsAgainst(initExpr, declT.slice(0, -2), lineNum, `变量 "${vName}" 的数组字面量中`);
                } else if (!isExpressionAssignable(initExpr, initT, declT, lineNum)) {
                  addDiag(lineNum, "TS2322", `不能将类型 "${initT}" 分配给类型 "${declT}" (变量 "${vName}")`);
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
                      checkObjectLiteralAgainstShape(rhsExpr, declT, lineNum, "解构声明");
                    } else if (!isExpressionAssignable(rhsExpr, rhsT, declT, lineNum)) {
                      addDiag(lineNum, "TS2322", `不能将类型 "${rhsT}" 分配给类型 "${declT}" (解构声明)`);
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
                checkObjectLiteralAgainstShape(retExpr, unwrappedExpected, lineNum, `函数 "${currentFn.name}" 返回值`);
              } else if (unwrappedExpected.endsWith("[]") && splitTopLevelUnion(unwrappedExpected).length <= 1 && retExpr.startsWith("[")) {
                checkArrayElementsAgainst(retExpr, unwrappedExpected.slice(0, -2), lineNum, `函数 "${currentFn.name}" 返回数组中`);
              } else if (!isExpressionAssignable(retExpr, retT, expectedRet, lineNum) && !isExpressionAssignable(retExpr, retT, unwrappedExpected, lineNum)) {
                addDiag(lineNum, "TS2322", `不能将返回值类型 "${retT}" 分配给函数 "${currentFn.name}" 声明的返回类型 "${expectedRet}"`);
              }
            }
          }
        }
        continue;
      }
      const throwM = trimmed.match(/^throw\s+([\s\S]+?);?$/);
      if (throwM && throwM[1]) {
        if (currentFn) currentFn.hasValueReturn = true;
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
          if (/^throw\b/.test(caseRest) && currentFn) {
            currentFn.hasValueReturn = true;
          }
          const inlineRet = caseRest.match(/^return(?:\s+([\s\S]+?))?;?$/);
          if (inlineRet) {
            const rExpr = inlineRet[1] ? inlineRet[1].trim() : "";
            const rT = rExpr ? inferType(rExpr, lineNum) : "void";
            if (currentFn) {
              if (rExpr) currentFn.hasValueReturn = true;
              const expectedRet = currentFn.returnType;
              if (expectedRet && expectedRet !== "any" && !isExpressionAssignable(rExpr, rT, expectedRet, lineNum)) {
                addDiag(lineNum, "TS2322", `不能将返回值类型 "${rT}" 分配给函数 "${currentFn.name}" 声明的返回类型 "${expectedRet}"`);
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
        const defRest = (defaultM[1] || "").trim();
        if (/^(?:return\s+\S|throw\b)/.test(defRest) && currentFn) {
          currentFn.hasValueReturn = true;
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
      const inlineIfThrow = trimmed.match(/^if\s*\((.+?)\)\s*throw\s+([\s\S]+?);?$/);
      if (inlineIfThrow && inlineIfThrow[1] && inlineIfThrow[2]) {
        if (currentFn) currentFn.hasValueReturn = true;
        inferType(inlineIfThrow[1].trim(), lineNum);
        inferType(inlineIfThrow[2].trim(), lineNum);
        continue;
      }
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
              addDiag(lineNum, "TS2322", `不能将返回值类型 "${retT}" 分配给函数 "${currentFn.name}" 声明的返回类型 "${expectedRet}"`);
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
            if (/\b(?:return\s+[^;}\s]|throw\b)/.test(bodyInner) && currentFn) {
              currentFn.hasValueReturn = true;
            }
            bodyInner.split(";").map((s) => s.trim()).filter(Boolean).forEach((stmt) => {
              const inlineAssign = stmt.match(/^([A-Za-z_$][\w$!]*(?:\.[A-Za-z_$][\w$!]*|\s*\[[^\]]+\])*)\s*(\+=|-=|\*=|\/=|=(?!=))\s*([\s\S]+)$/);
              if (inlineAssign && inlineAssign[1] && inlineAssign[3]) {
                const lhs = inlineAssign[1].trim();
                const rhsExpr = inlineAssign[3].trim();
                const rhsT = inferType(rhsExpr, lineNum);
                if (/^[A-Za-z_$][\w$]*$/.test(lhs) && !isKnownIdentifier(lhs)) {
                  addDiag(lineNum, "TS2304", `找不到名称 "${lhs}"（变量未声明，请使用 let 或 const 声明）`);
                } else if (lhs.includes(".") || lhs.includes("[")) {
                  const lhsT = inferType(lhs, lineNum);
                  if (lhsT !== "any" && !isExpressionAssignable(rhsExpr, rhsT, lhsT, lineNum)) {
                    addDiag(lineNum, "TS2322", `不能将类型 "${rhsT}" 分配给类型 "${lhsT}" ("${lhs}")`);
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
            addDiag(lineNum, "TS2322", `不能对类型 "${propT}" 的属性 "${vName}" 执行自增/自减运算`);
          }
        } else if (env.has(vName)) {
          const info = env.get(vName) || { type: "any" };
          if (info.isConst) {
            addDiag(lineNum, "TS2588", `无法分配到 "${vName}"，因为它是常数 (const)`);
          } else if (info.type !== "any" && !isTsAssignable("number", info.type)) {
            addDiag(lineNum, "TS2322", `不能对类型 "${info.type}" 的变量 "${vName}" 执行自增/自减运算`);
          }
        } else if (!isKnownIdentifier(vName)) {
          addDiag(lineNum, "TS2304", `找不到名称 "${vName}"（变量未声明，请使用 let 或 const 声明）`);
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
            addDiag(lineNum, "TS2304", `找不到名称 "${vName}"（变量未声明，请使用 let 或 const 声明）`);
          } else if (env.has(vName) && env.get(vName)?.isConst) {
            addDiag(lineNum, "TS2588", `无法分配到 "${vName}"，因为它是常数 (const)`);
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
              addDiag(lineNum, "TS2588", `无法分配到 "${lhs}"，因为它是常数 (const)`);
            } else if (checkTargetT !== "any") {
              if (op === "=" && rhs.startsWith("{") && getInterfaceShape(checkTargetT)) {
                checkObjectLiteralAgainstShape(rhs, checkTargetT, lineNum, `变量 "${lhs}"`);
              } else {
                const effectiveT = op === "=" ? rhsT : inferType(`${lhs} ${op[0]} (${rhs})`, lineNum);
                if (!isExpressionAssignable(op === "=" ? rhs : "", effectiveT, checkTargetT, lineNum)) {
                  addDiag(lineNum, "TS2322", `不能将类型 "${effectiveT}" 分配给类型 "${checkTargetT}" (变量 "${lhs}")`);
                }
              }
            }
          } else if (!isKnownIdentifier(lhs)) {
            addDiag(lineNum, "TS2304", `找不到名称 "${lhs}"（变量未声明，请使用 let 或 const 声明）`);
          }
        } else if (lhs.includes(".") || lhs.includes("[")) {
          const lhsT = inferType(lhs, lineNum);
          if (lhsT !== "any" && !isExpressionAssignable(rhs, rhsT, lhsT, lineNum)) {
            addDiag(lineNum, "TS2322", `不能将类型 "${rhsT}" 分配给类型 "${lhsT}" ("${lhs}")`);
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
  function syncContextFunctionTypesToMeta(ctx) {
    const meta = appState.CURRENT_TS_META;
    if (!meta) return;
    if (!meta.fnTypes) meta.fnTypes = /* @__PURE__ */ new Map();
    const fnTypes = meta.fnTypes;
    const varTypes = meta.varTypes;
    ctx.fns.forEach((sig, fnKey) => {
      if (!fnKey || fnKey.includes(".") || fnKey.startsWith("<")) return;
      const formatted = formatFnSigInfoToTypeString(sig);
      fnTypes.set(fnKey, formatted);
      varTypes.set(fnKey, formatted);
    });
    ctx.env.forEach((info, vName) => {
      const candidate = info.declaredType || info.type;
      if (candidate && candidate.includes("=>")) {
        fnTypes.set(vName, candidate);
        varTypes.set(vName, candidate);
      }
    });
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
    syncContextFunctionTypesToMeta(ctx);
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
  function linkSymbolFromDependency(targetCtx, depCtx, depNode, importedName, localName, lineNum) {
    const expSpec = depNode.exports.find((e) => e.exported === importedName);
    const srcName = expSpec ? expSpec.local : importedName;
    depCtx.interfaces.forEach((shape, ifaceName) => {
      if (!targetCtx.interfaces.has(ifaceName)) {
        targetCtx.interfaces.set(ifaceName, new Map(shape));
      }
    });
    depCtx.interfaceTypeParams.forEach((tParams, ifaceName) => {
      if (!targetCtx.interfaceTypeParams.has(ifaceName)) {
        targetCtx.interfaceTypeParams.set(ifaceName, [...tParams]);
      }
    });
    depCtx.classParents.forEach((parent, clsName) => {
      if (!targetCtx.classParents.has(clsName)) {
        targetCtx.classParents.set(clsName, parent);
      }
    });
    depCtx.typeAliases.forEach((aliasBody, aliasName) => {
      if (!targetCtx.typeAliases.has(aliasName)) {
        targetCtx.typeAliases.set(aliasName, aliasBody);
      }
    });
    depCtx.genericTypeAliases.forEach((gInfo, aliasName) => {
      if (!targetCtx.genericTypeAliases.has(aliasName)) {
        targetCtx.genericTypeAliases.set(aliasName, { ...gInfo });
      }
    });
    depCtx.enumsSet.forEach((en) => targetCtx.enumsSet.add(en));
    depCtx.enumMembers.forEach((mems, en) => {
      if (!targetCtx.enumMembers.has(en)) targetCtx.enumMembers.set(en, new Set(mems));
    });
    depCtx.enumValueTypes.forEach((vts, en) => {
      if (!targetCtx.enumValueTypes.has(en)) targetCtx.enumValueTypes.set(en, new Set(vts));
    });
    depCtx.fns.forEach((sig, fnKey) => {
      if (fnKey.includes(".") && !targetCtx.fns.has(fnKey)) {
        targetCtx.fns.set(fnKey, { ...sig });
      }
    });
    if (depCtx.fns.has(srcName)) {
      const fnSig = depCtx.fns.get(srcName);
      if (fnSig) {
        targetCtx.fns.set(localName, { ...fnSig, name: localName });
      }
    }
    if (depCtx.interfaces.has(srcName)) {
      const shape = depCtx.interfaces.get(srcName);
      if (shape) {
        targetCtx.interfaces.set(localName, new Map(shape));
        const tParams = depCtx.interfaceTypeParams.get(srcName);
        if (tParams) targetCtx.interfaceTypeParams.set(localName, [...tParams]);
        if (depCtx.abstractClasses.has(srcName)) targetCtx.abstractClasses.add(localName);
        depCtx.fns.forEach((sig, fnKey) => {
          if (fnKey.startsWith(srcName + ".")) {
            const suffix = fnKey.slice(srcName.length);
            targetCtx.fns.set(localName + suffix, { ...sig });
          }
        });
      }
    }
    if (depCtx.typeAliases.has(srcName)) {
      const body = depCtx.typeAliases.get(srcName);
      if (body) targetCtx.typeAliases.set(localName, body);
    }
    if (depCtx.genericTypeAliases.has(srcName)) {
      const g = depCtx.genericTypeAliases.get(srcName);
      if (g) targetCtx.genericTypeAliases.set(localName, { ...g });
    }
    if (depCtx.enumsSet.has(srcName)) {
      targetCtx.enumsSet.add(localName);
      const mems = depCtx.enumMembers.get(srcName);
      if (mems) targetCtx.enumMembers.set(localName, new Set(mems));
      const vts = depCtx.enumValueTypes.get(srcName);
      if (vts) targetCtx.enumValueTypes.set(localName, new Set(vts));
    }
    if (depCtx.env.has(srcName)) {
      const vInfo = depCtx.env.get(srcName);
      if (vInfo) {
        targetCtx.env.set(localName, {
          type: vInfo.declaredType || vInfo.type,
          isConst: true,
          line: lineNum,
          declaredType: vInfo.declaredType || vInfo.type
        });
      }
    }
  }
  function typecheckWorkspaceModules(entryFile, entrySource, fileMap, strict = appState.STRICT_TS) {
    const graph = buildModuleGraph(entryFile, entrySource, fileMap);
    if (!graph.isMultiFile) {
      const singleDiags = typecheckTS(entrySource, strict).map((d) => ({
        ...d,
        file: "file" in d && d.file ? d.file : graph.entryFile
      }));
      return { diagnostics: singleDiags, diags: singleDiags, graph };
    }
    appState.CURRENT_TS_META = {
      interfaces: /* @__PURE__ */ new Map(),
      varTypes: /* @__PURE__ */ new Map(),
      fnTypes: /* @__PURE__ */ new Map()
    };
    for (const modFile of graph.order) {
      const modNode = graph.modules.get(modFile);
      if (modNode) {
        extractTsInterfaceMetadata(modNode.rawSource, true);
      }
    }
    for (const modFile of graph.order) {
      const modNode = graph.modules.get(modFile);
      if (!modNode) continue;
      for (const imp of modNode.imports) {
        for (const bind of imp.bindings) {
          if (bind.imported !== "*" && bind.local !== bind.imported) {
            const fnSig = appState.CURRENT_TS_META.fnTypes?.get(bind.imported);
            if (fnSig && appState.CURRENT_TS_META.fnTypes) {
              appState.CURRENT_TS_META.fnTypes.set(bind.local, fnSig);
            }
            const vType = appState.CURRENT_TS_META.varTypes.get(bind.imported);
            if (vType) {
              appState.CURRENT_TS_META.varTypes.set(bind.local, vType);
            }
          }
        }
      }
    }
    if (!strict) {
      const diags = [...graph.diagnostics];
      return { diagnostics: diags, diags, graph };
    }
    const allDiagnostics = [...graph.diagnostics];
    const checkedContexts = /* @__PURE__ */ new Map();
    for (const modFile of graph.order) {
      const modNode = graph.modules.get(modFile);
      if (!modNode) continue;
      const ctx = createTypeCheckContext(modNode.rawSource);
      const evalEngine = createTypeEvalEngine(ctx);
      const inferEngine = createTypeInferEngine(ctx, evalEngine);
      for (const imp of modNode.imports) {
        if (imp.isBuiltinFs || !imp.resolvedPath) continue;
        const depCtx = checkedContexts.get(imp.resolvedPath);
        const depNode = graph.modules.get(imp.resolvedPath);
        if (!depCtx || !depNode) continue;
        for (const bind of imp.bindings) {
          if (bind.imported === "*") {
            const nsTypeName = `__ModuleNs_${imp.resolvedPath.replace(/[^A-Za-z0-9_]/g, "_")}__`;
            const nsShape = /* @__PURE__ */ new Map();
            for (const exp of depNode.exports) {
              if (exp.kind === "type") continue;
              const localV = depCtx.env.get(exp.local);
              if (localV) {
                nsShape.set(exp.exported, {
                  type: localV.declaredType || localV.type,
                  rawType: localV.declaredType || localV.type,
                  optional: false
                });
              }
              const localFn = depCtx.fns.get(exp.local);
              if (localFn) {
                ctx.fns.set(`${nsTypeName}.${exp.exported}`, { ...localFn, name: `${nsTypeName}.${exp.exported}` });
                nsShape.set(exp.exported, {
                  type: "function",
                  rawType: "function",
                  optional: false
                });
              }
            }
            ctx.interfaces.set(nsTypeName, nsShape);
            ctx.env.set(bind.local, {
              type: nsTypeName,
              isConst: true,
              line: imp.line,
              declaredType: nsTypeName
            });
          } else {
            linkSymbolFromDependency(ctx, depCtx, depNode, bind.imported, bind.local, imp.line);
          }
        }
      }
      collectPass1Declarations(ctx, evalEngine, inferEngine);
      checkPass2Statements(ctx, evalEngine, inferEngine);
      syncContextFunctionTypesToMeta(ctx);
      checkedContexts.set(modFile, ctx);
      for (const d of ctx.diagnostics) {
        allDiagnostics.push({
          file: modFile,
          line: d.line,
          code: d.code,
          message: d.message,
          severity: "error"
        });
      }
    }
    return { diagnostics: allDiagnostics, diags: allDiagnostics, graph };
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
    logRunRoundHeader: () => logRunRoundHeader,
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
      constructor(executor, label) {
        __publicField(this, "__isVirtualPromise");
        __publicField(this, "id");
        __publicField(this, "label");
        __publicField(this, "state");
        __publicField(this, "value");
        __publicField(this, "reason");
        __publicField(this, "line");
        __publicField(this, "_handlers");
        __publicField(this, "_internal");
        __publicField(this, "reactions");
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
                __t(h.line || 1, "⚡ [微任务 Microtask] " + (h.label || "Promise.then"), loop.globalSnapFn);
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
  var logRunSeq = 0;
  function say(msg, cls, line) {
    const entry = { msg };
    if (cls !== void 0) entry.cls = cls;
    if (line !== void 0) entry.line = line;
    appState.CONSOLE_LOGS.push(entry);
    notifyConsoleLog("append", entry);
    uiHooks.appendConsoleLog(entry);
  }
  function logRunRoundHeader(actionLabel, targetName) {
    logRunSeq++;
    if (appState.CONSOLE_LOGS.length > 0) {
      const suffix = targetName ? ` · ${targetName}` : "";
      say(`── #${logRunSeq} ${actionLabel}${suffix} ──`, "log-divider");
    }
  }
  function clearLog(msg) {
    logRunSeq = 0;
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
      activeTaskLabel: "主线程同步栈 (Sync)",
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
              __t(line, "⚡ [微任务] queueMicrotask", loop.globalSnapFn);
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
          `await 恢复: ${coro.name} (L${awaitLine})`,
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
                __t(bestMacro.line || 1, `⚡ [宏任务 @ ${loop.virtualTime}ms] ${bestMacro.label}`, loop.globalSnapFn);
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
      loop.activeTaskLabel = "事件循环已清空 (Idle)";
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
      return val.length > 10 ? JSON.stringify(val.slice(0, 8) + "…") : JSON.stringify(val);
    }
    if (Array.isArray(val)) {
      if (val.length === 0) return "[]";
      if (Array.isArray(val[0])) return `[${val.length}×${val[0].length}]`;
      if (val.length <= 4) return "[" + val.map((x) => formatCallArgItem(x)).join(", ") + "]";
      return "[" + val.slice(0, 3).map((x) => formatCallArgItem(x)).join(", ") + ", …]";
    }
    if (isMapLike(val)) return `Map(${val.size})`;
    if (isSetLike(val)) return `Set(${val.size})`;
    if (typeof val === "object") {
      if ("val" in val && ("left" in val || "right" in val)) return `Tree(${val.val})`;
      if ("val" in val && "next" in val) return `List(${val.val})`;
      return "{…}";
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
    appState.TRACE = { title: "TypeScript Playground · Debug", code: [], steps: [] };
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
    collectWorkspaceFilesAndEntry: () => collectWorkspaceFilesAndEntry,
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

  // src/runtime/vfs-store.ts
  var VFS_STORAGE_KEY = "ts-visual-vfs-workspace-v2";
  var vfsBootInitialized = false;
  var VFS_EXPANDED_FOLDERS = /* @__PURE__ */ new Set();
  var VFS_NODES = /* @__PURE__ */ new Map();
  var vfsListeners = /* @__PURE__ */ new Set();
  var vfsStorageAdapter = null;
  function registerVfsStorageAdapter(adapter) {
    vfsStorageAdapter = adapter;
  }
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
      if (vfsStorageAdapter) {
        const raw = vfsStorageAdapter.load();
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
      if (!vfsStorageAdapter) return;
      const customNodes = [];
      VFS_NODES.forEach((node) => {
        customNodes.push(node);
      });
      vfsStorageAdapter.save(JSON.stringify(customNodes));
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
    ts: { activeTabId: "", tabs: [] }
  };
  var TS_SAMPLE_METADATA = [
    { key: "showcase", label: "showcase.ts · 综合演示", desc: "滑动窗口 + 单调栈 + Map + 树与图" },
    { key: "mergesort", label: "mergesort.ts · 归并排序", desc: "分治递归与左右子数组归并" },
    { key: "debug_crash", label: "debug_crash.ts · 越界排错", desc: "二分查找 <= 越界 Bug 现场定位" },
    { key: "lcs", label: "lcs.ts · 最长公共子序列", desc: "二维 DP 网格规划" },
    { key: "analyze", label: "analyze.ts · 频率统计", desc: "数组与 Map 哈希统计" },
    { key: "window", label: "window.ts · 滑动窗口", desc: "双指针定长滑动窗口" },
    { key: "structures", label: "structures.ts · 数据结构全家桶", desc: "栈 / 队列 / 堆 / 并查集 / 树 / 图" },
    { key: "counter", label: "counter.ts · 闭包计数器", desc: "高阶函数与词法作用域闭包" },
    { key: "classes", label: "classes.ts · 类与继承", desc: "class / extends / super 实例方法" },
    { key: "async_loop", label: "async_loop.ts · 事件循环", desc: "async / await 与微任务队列" }
  ];
  function ensureScriptTabsForLang(_lang = "ts") {
    ensureVfsInitialized();
    const store = SCRIPT_TABS.ts;
    if (store.tabs.length === 0) {
      const curFileName = appState.FILE_NAME;
      const editorSrc = uiHooks.getEditorSource();
      const defaultTitle = curFileName ? curFileName : "showcase.ts";
      const defaultSrc = editorSrc ? editorSrc : SAMPLES.showcase || "";
      const tabId = nextScriptTabId();
      store.tabs.push({
        id: tabId,
        title: defaultTitle,
        lang: "ts",
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
  function getActiveScriptTab(_lang) {
    const store = ensureScriptTabsForLang("ts");
    const found = store.tabs.find((t) => t.id === store.activeTabId) ?? store.tabs[0];
    if (found) return found;
    return {
      id: "stab_0",
      title: "showcase.ts",
      lang: "ts",
      source: "",
      vfsPath: "",
      isSample: true
    };
  }
  function syncActiveScriptTabSource(src) {
    const activeTab = getActiveScriptTab("ts");
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
  function upsertSampleScriptTab(title, source, _lang) {
    const store = ensureScriptTabsForLang("ts");
    let tab = store.tabs.find((t) => (t.isSample || !t.vfsPath) && t.title === title);
    if (!tab) {
      tab = {
        id: nextScriptTabId(),
        title,
        lang: "ts",
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
  function upsertVfsScriptTab(path, name, content, _lang) {
    const store = ensureScriptTabsForLang("ts");
    let tab = store.tabs.find((t) => !t.isSample && t.vfsPath === path);
    if (!tab) {
      tab = {
        id: nextScriptTabId(),
        title: name,
        lang: "ts",
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
    SCRIPT_TABS.ts.tabs.forEach((t) => {
      if (t.vfsPath === delPath || t.vfsPath.startsWith(prefix)) {
        t.vfsPath = "";
      }
    });
  }
  function handleVfsFileRenamedInTabs(oldPath, nextPath, nextName) {
    const store = ensureScriptTabsForLang("ts");
    const matchingTab = store.tabs.find((t) => t.vfsPath === oldPath);
    if (!matchingTab) return { updated: false, isActive: false };
    matchingTab.title = nextName;
    matchingTab.vfsPath = nextPath;
    return {
      updated: true,
      isActive: store.activeTabId === matchingTab.id
    };
  }
  function serializeScriptTabsSession() {
    const store = ensureScriptTabsForLang("ts");
    return {
      activeTabId: store.activeTabId,
      tabs: store.tabs.map((t) => ({
        id: t.id,
        title: t.title,
        source: t.source,
        vfsPath: t.vfsPath || "",
        isSample: Boolean(t.isSample)
      }))
    };
  }
  function restoreScriptTabsSession(raw) {
    if (!isRecord(raw) || !Array.isArray(raw.tabs) || raw.tabs.length === 0) return false;
    const restored = [];
    for (const item of raw.tabs) {
      if (!isRecord(item) || typeof item.title !== "string" || typeof item.source !== "string") continue;
      const id = typeof item.id === "string" && item.id ? item.id : nextScriptTabId();
      const numM = id.match(/^stab_(\d+)$/);
      if (numM && numM[1]) {
        const seqNum = Number(numM[1]);
        if (seqNum >= scriptTabSeq) scriptTabSeq = seqNum + 1;
      }
      restored.push({
        id,
        title: item.title,
        lang: "ts",
        source: item.source,
        vfsPath: typeof item.vfsPath === "string" ? item.vfsPath : "",
        isSample: Boolean(item.isSample)
      });
    }
    if (restored.length === 0) return false;
    SCRIPT_TABS.ts.tabs = restored;
    const reqActive = typeof raw.activeTabId === "string" ? raw.activeTabId : "";
    const activeDoc = restored.find((t) => t.id === reqActive) ?? restored[0];
    if (activeDoc) {
      SCRIPT_TABS.ts.activeTabId = activeDoc.id;
    }
    return true;
  }

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
    if (Array.isArray(value)) {
      const total = value.length;
      const out2 = { kind: "list", items: value.slice(0, 30).map((x) => cloneDeepBounded(x, 1)), total };
      if (total > 20) {
        defineHidden(out2, "__raw", value);
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
    if (kind === "stack") {
      const arr = Array.isArray(value) ? value : [];
      const total = arr.length;
      let items;
      let baseIdx = 0;
      if (arr.length > 40) {
        baseIdx = arr.length - 40;
        items = arr.slice(baseIdx).map((x) => cloneDeepBounded(x, 1));
      } else {
        items = arr.slice(0, 40).map((x) => cloneDeepBounded(x, 1));
      }
      return Object.assign({ kind, items, total, baseIdx }, extra || {});
    }
    if (kind === "array" || kind === "heap" || kind === "queue" || kind === "uf") {
      const arr = Array.isArray(value) ? value : [];
      const total = arr.length;
      const items = arr.slice(0, 40).map((x) => cloneDeepBounded(x, 1));
      const out = Object.assign({ kind, items, total }, extra || {});
      if (total > 20) {
        defineHidden(out, "__raw", arr);
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
        total = value.size;
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
        total = value.size;
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
      const totalRows = Array.isArray(value) ? value.length : 0;
      const totalCols = Array.isArray(value) && Array.isArray(value[0]) ? value[0].length : 0;
      const cloned = Array.isArray(value) ? value.slice(0, 30).map((r) => Array.isArray(r) ? r.slice(0, 30).map((c) => cloneDeepBounded(c, 2)) : r) : [[0]];
      const out = Object.assign({ kind, cells: cloned, mark: null, deps: [], totalRows, totalCols }, extra || {});
      if (totalRows > 10 || totalCols > 10) {
        defineHidden(out, "__raw", value);
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
      const runtimeCls = typeof obj.__cls__ === "string" && obj.__cls__ ? obj.__cls__ : obj.constructor && obj.constructor !== Object && obj.constructor.name ? obj.constructor.name : "";
      const ifaceName = ifaceDef ? ifaceDef.name : annotType || runtimeCls || "object";
      const isClass = Boolean(ifaceDef && ifaceDef.isClass || runtimeCls);
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
      const objName = pm[1] || "", propName = pm[2];
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
            const getAt = (idx) => {
              if (typeof raw === "string") return raw[idx] ?? "";
              if (Array.isArray(raw) && idx < raw.length) return cloneDeepBounded(raw[idx], 1);
              if (d.items && idx < d.items.length) return d.items[idx];
              return "…";
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
      delete d.__raw;
      delete d.__rawNodes;
      delete d.__rawVals;
      delete d.__nodeMap;
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
    if (/(?:\+\+|--|(?<![=!<>])=(?!=))/.test(clean)) return void 0;
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
    const clean = stripTypes(rawLine || "").trim().replace(/^(?:case\s+[^:]+|default)\s*:\s*/, "").replace(/;$/, "");
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
          const note = `${rawLine.trim()}  →  ${anim.lhsVal} ${op} ${anim.rhsVal} (${resVal})`;
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
        return { anim, note: `${rawLine.trim()}  →  ${overallResult}` };
      }
    }
    const ckptCall = clean.match(/^(?:checkpoint|断点)\s*\(([\s\S]*)\)$/);
    if (ckptCall && ckptCall[1] !== void 0) {
      const fnName = clean.startsWith("断点") ? "断点" : "checkpoint";
      const args = splitTopLevel(ckptCall[1]).map((s) => s.trim()).filter(Boolean);
      const hasRuntimeTrigger = Boolean(nextV && "__ckptTriggered" in nextV);
      const triggered = hasRuntimeTrigger && nextV ? Boolean(nextV.__ckptTriggered) : args.length === 0 ? true : Boolean(safeEvalExpr(args[0] || "", v));
      if (!triggered) {
        const condExpr2 = args[0] || "false";
        const anim2 = {
          type: "compare",
          lhs: condExpr2,
          rhs: "",
          op: "?",
          lhsVal: "false",
          rhsVal: "",
          result: false
        };
        return { anim: anim2, note: `○ ${fnName}(${condExpr2})  →  false（条件未满足，跳过检查点）`, isCheckpoint: false };
      }
      const ckptVals = nextV && Array.isArray(nextV.__ckptVals) ? nextV.__ckptVals.map(String) : null;
      let msgStr = "";
      if (ckptVals && ckptVals.length > 0 && ckptVals[0]) {
        msgStr = ckptVals.join(", ");
      } else if (args.length >= 2 && args[1]) {
        const evaluatedMsg = safeEvalExpr(args[1], v);
        msgStr = evaluatedMsg !== void 0 && evaluatedMsg !== null ? String(evaluatedMsg) : args[1].replace(/^['"`]|['"`]$/g, "");
      }
      const anim = {
        type: "checkpoint",
        fn: fnName,
        args: msgStr ? [msgStr] : [],
        argVals: msgStr ? [msgStr] : []
      };
      const detail = msgStr ? msgStr : "已命中断点";
      return { anim, note: `◉ ${fnName}(${detail})`, isCheckpoint: true };
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
        return { anim: { type: "assign", to, from: rhs, val: valStr }, note: `${to} ← ${valStr}   (${rawLine.trim()})` };
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
          return { anim, note: `${to} = ${fnName}(${argVals.join(", ")})  →  ${valStr}` };
        }
        if (valStr !== null) {
          const anim = { type: "assign", to, from, val: valStr };
          return { anim, note: `${to} ← ${valStr}   (${rawLine.trim()})` };
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
        return { anim, note: `return ${expr}  →  ${valStr}` };
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
        file: st.file || appState.DEBUG_SESSION.entryFile || "",
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
      file: frame.file || st.file || appState.DEBUG_SESSION.entryFile || "",
      fn: frame.fn || "global",
      label: frame.label || "global",
      line: frame.line || st.line,
      v: frame.v || (idx === topIdx ? st.v : {}) || {},
      ds: (frame.ds && Object.keys(frame.ds).length ? frame.ds : st.ds) || {}
    };
  }

  // src/runtime/runner.ts
  function reportTypeErrors(diags) {
    const activeFile = appState.ENTRY_FILE_PATH || appState.FILE_NAME || "main.ts";
    appState.TYPE_ERROR_LINES = new Set(
      diags.filter((d) => !d.file || d.file === activeFile).map((d) => d.line)
    );
    uiHooks.updateEditorChrome();
    say(`✗ TypeScript 严格类型检查未通过 (共 ${diags.length} 处错误)：`, "err");
    diags.forEach((d) => {
      const filePrefix = d.file && d.file !== activeFile ? `${d.file} · ` : "";
      say(`  • ${d.code} [${filePrefix}第 ${d.line} 行]: ${d.message || d.msg || ""}`, "err", d.line);
    });
    const firstDiag = diags[0];
    if (firstDiag) {
      if (firstDiag.file && firstDiag.file !== activeFile) {
        uiHooks.switchToScriptFile(firstDiag.file);
      }
      if (firstDiag.line) uiHooks.revealErrorLine(firstDiag.line);
    }
  }
  function collectWorkspaceFilesAndEntry(sourceOverride) {
    ensureVfsInitialized();
    const fileMap = /* @__PURE__ */ new Map();
    VFS_NODES.forEach((node) => {
      if (node.type === "file") {
        const norm = normalizeWorkspaceModulePath(node.path);
        if (norm) fileMap.set(norm, (node.content ?? "").replace(/\r/g, ""));
      }
    });
    for (const tab of SCRIPT_TABS.ts.tabs) {
      const tabPath = normalizeWorkspaceModulePath(tab.vfsPath || tab.title);
      if (tabPath) {
        fileMap.set(tabPath, (tab.source ?? "").replace(/\r/g, ""));
      }
    }
    const activeTab = getActiveScriptTab("ts");
    let entryFile = normalizeWorkspaceModulePath(
      uiHooks.getActiveWorkspacePath() || activeTab.vfsPath || appState.FILE_NAME || activeTab.title || "main.ts"
    ) || "main.ts";
    let entrySource = typeof sourceOverride === "string" ? sourceOverride.replace(/\r/g, "") : uiHooks.getEditorSource().replace(/\r/g, "");
    fileMap.set(entryFile, entrySource);
    if (typeof sourceOverride !== "string" && appState.DEBUG_SESSION.entryFile && appState.ACTIVE_DEBUG_FILE && entryFile === appState.ACTIVE_DEBUG_FILE && entryFile !== appState.DEBUG_SESSION.entryFile && fileMap.has(appState.DEBUG_SESSION.entryFile)) {
      const candidateJs = stripTypes(entrySource);
      const childEntry = resolveEntry(entrySource, candidateJs);
      if (childEntry.expr === "undefined") {
        entryFile = appState.DEBUG_SESSION.entryFile;
        entrySource = fileMap.get(entryFile) || entrySource;
        uiHooks.switchToScriptFile(entryFile);
      }
    }
    return { entryFile, entrySource, fileMap };
  }
  function compileMultiModuleBundle(graph, fileMap) {
    const moduleSources = {};
    const moduleFactories = [];
    let hasAsync = false;
    for (const modFile of graph.order) {
      const modNode = graph.modules.get(modFile);
      if (!modNode) continue;
      moduleSources[modFile] = modNode.lines;
      if (hasAsyncConstructs(modNode.rawSource)) hasAsync = true;
      if (modFile === graph.entryFile) continue;
      const esm = rewriteModuleEsmToCjs(modNode.rawSource, modFile, fileMap);
      const enums = transpileEnums(esm.code);
      if (enums.error) {
        return {
          ok: false,
          errorFile: modFile,
          errorLine: enums.error.line,
          errorMessage: enums.error.message,
          code: "",
          call: "undefined",
          entryLine: 0,
          entryLines: [],
          entryNames: [],
          moduleSources,
          hasAsync,
          instrumented: false
        };
      }
      const jsMod = stripTypes(enums.code);
      const modNames = collectNames(jsMod);
      const instMod = instrument(jsMod, modNode.lines, modNames, modFile);
      const exportFooter = buildExportAssignmentFooter(esm.exportedBindings);
      moduleFactories.push(
        `${JSON.stringify(modFile)}: function(__exports, __require) {
${instMod}
${exportFooter}
}`
      );
    }
    const entryNode = graph.modules.get(graph.entryFile);
    const entryRaw = entryNode ? entryNode.rawSource : fileMap.get(graph.entryFile) || "";
    const entryLines = entryNode ? entryNode.lines : entryRaw.split("\n");
    moduleSources[graph.entryFile] = entryLines;
    const entryEsm = rewriteModuleEsmToCjs(entryRaw, graph.entryFile, fileMap);
    const entryEnums = transpileEnums(entryEsm.code);
    if (entryEnums.error) {
      return {
        ok: false,
        errorFile: graph.entryFile,
        errorLine: entryEnums.error.line,
        errorMessage: entryEnums.error.message,
        code: "",
        call: "undefined",
        entryLine: 0,
        entryLines,
        entryNames: [],
        moduleSources,
        hasAsync,
        instrumented: false
      };
    }
    const jsEntry = stripTypes(entryEnums.code);
    const entry = resolveEntry(entryEsm.code, jsEntry);
    const call = stripTypes(entry.expr || "undefined");
    const jsEntryBody = entry.index >= 0 ? blankJsLine(jsEntry, entry.index) : jsEntry;
    const entryNames = collectNames(jsEntryBody);
    const instEntry = instrument(jsEntryBody, entryLines, entryNames, graph.entryFile);
    const entryExportFooter = buildExportAssignmentFooter(entryEsm.exportedBindings);
    const loaderPreamble = `var __modCache = Object.create(null), __modLoading = Object.create(null), __exports = Object.create(null);
var __modules = {
${moduleFactories.join(",\n")}
};
function __require(modId) {
  if (__modCache[modId]) return __modCache[modId];
  if (__modLoading[modId]) throw new Error("检测到模块循环依赖: " + modId);
  var factory = __modules[modId];
  if (typeof factory !== "function") throw new Error("找不到模块: " + modId);
  __modLoading[modId] = true;
  var exp = Object.create(null);
  var modFid = (typeof __t === "function" && __t.__enter) ? __t.__enter("<module:" + modId + ">", [], [], 1, null, modId) : 0;
  try { factory(exp, __require); } finally {
    __modLoading[modId] = false;
    if (modFid && typeof __t === "function" && __t.__leave) __t.__leave(modFid);
  }
  __modCache[modId] = exp;
  return exp;
}
`;
    const fullCode = `${loaderPreamble}${instEntry}${entryExportFooter ? "\n" + entryExportFooter : ""}`;
    return {
      ok: true,
      code: fullCode,
      call,
      entryLine: entry.line || 0,
      entryLines,
      entryNames,
      moduleSources,
      hasAsync,
      instrumented: true
    };
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
    const logs = [];
    const handleCkpt = (args) => {
      const arr = Array.isArray(args) ? args : [];
      const isCondForm = arr.length > 0 && typeof arr[0] === "boolean";
      const triggered = arr.length === 0 || arr[0] === void 0 ? true : isCondForm ? Boolean(arr[0]) : true;
      if (!triggered) return;
      if (isCondForm) {
        if (arr.length >= 2 && arr[1] !== void 0) {
          logs.push(String(arr[1]));
        }
      } else if (arr.length > 0) {
        logs.push(arr.map((x) => String(x)).join(", "));
      }
    };
    const stub = o.instrumented ? "" : 'var checkpoint = function(){ if (typeof __t === "function" && __t.__ckpt) __t.__ckpt([].slice.call(arguments)); }, 断点 = checkpoint;\n';
    const t0 = Date.now();
    let ticks = 0;
    let lastLine = 0;
    let lastFile = "";
    let expired = false;
    const timeoutError = () => Object.assign(new Error("RUN_TIMEOUT"), {
      __timeout: true,
      __line: lastLine,
      __file: lastFile
    });
    const __t = function(line, _note, _snap, _self, file) {
      if (line) lastLine = line;
      if (file) lastFile = file;
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
    __t.__ckpt = handleCkpt;
    const body = stub + js + "\n;return (function(){ try { var __v = (" + expr + '); if (__t && __t.__drain) __v = __t.__drain(__v); return { ok:true, value:__v }; } catch (e) { return { ok:false, error: e && e.message ? e.message : String(e), stack: e && e.stack ? String(e.stack) : "", line: (e && e.__line) || 0, file: (e && e.__file) || "", timeout: Boolean(e && e.__timeout) }; } })();';
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
    const pushLogLine = (...a) => {
      logs.push(a.map(formatConsoleArg).join(" "));
    };
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
        file: (errObj && typeof errObj.__file === "string" && errObj.__file ? errObj.__file : "") || lastFile,
        timeout: Boolean(errObj && errObj.__timeout)
      };
    }
    if (r && r.ok && !r.line) r.line = lastLine || entryLine || 0;
    if (r && !r.ok) r.line = r.line || lastLine || entryLine || 0;
    if (r && !r.file && lastFile) r.file = lastFile;
    return { ...r, logs, elapsedMs: Date.now() - t0 };
  }
  function runOnce(budgetMs, sourceCode) {
    const budget = typeof budgetMs === "number" && budgetMs > 0 ? budgetMs : RUN_TIMEOUT_MS;
    const { entryFile, entrySource: src, fileMap } = collectWorkspaceFilesAndEntry(sourceCode);
    appState.ENTRY_FILE_PATH = entryFile;
    logRunRoundHeader("▶ 运行", entryFile);
    const unsupported = detectUnsupportedSyntax2(src);
    if (unsupported.length && unsupported[0]) {
      unsupported.forEach((x) => say("✗ 第 " + x.line + " 行：暂不支持 " + x.feature + " —— " + x.hint, "err", x.line));
      uiHooks.revealErrorLine(unsupported[0].line);
      return;
    }
    const { diagnostics: diags, graph } = typecheckWorkspaceModules(entryFile, src, fileMap, appState.STRICT_TS);
    if (diags.length > 0) {
      reportTypeErrors(diags);
      return;
    }
    if (appState.TYPE_ERROR_LINES.size || appState.RUNTIME_ERROR_LINES.size) {
      appState.TYPE_ERROR_LINES.clear();
      appState.RUNTIME_ERROR_LINES.clear();
      uiHooks.updateEditorChrome();
    }
    let code = "";
    let call = "undefined";
    let entryLine = 0;
    let originalLines = src.replace(/\r/g, "").split("\n");
    let instrumented = false;
    if (graph.isMultiFile) {
      const bundled = compileMultiModuleBundle(graph, fileMap);
      if (!bundled.ok) {
        if (bundled.errorFile && bundled.errorFile !== entryFile) {
          uiHooks.switchToScriptFile(bundled.errorFile);
        }
        const errLine = bundled.errorLine || 1;
        say("✗ " + (bundled.errorFile ? bundled.errorFile + " · " : "") + "第 " + errLine + " 行：" + (bundled.errorMessage || "编译错误"), "err", errLine);
        uiHooks.revealErrorLine(errLine);
        return;
      }
      code = bundled.code;
      call = bundled.call;
      entryLine = bundled.entryLine;
      originalLines = bundled.entryLines;
      appState.ENTRY_CALL_LINE = entryLine;
      try {
        new Function("__t", "console", code);
        instrumented = true;
      } catch (_) {
        instrumented = false;
      }
    } else {
      const enums = transpileEnums(src);
      if (enums.error) {
        say("✗ 第 " + enums.error.line + " 行：" + enums.error.message, "err", enums.error.line);
        uiHooks.revealErrorLine(enums.error.line);
        return;
      }
      const js = stripTypes(enums.code);
      const entry = resolveEntry(src, js);
      call = stripTypes(entry.expr || "undefined");
      entryLine = entry.line || 0;
      appState.ENTRY_CALL_LINE = entryLine;
      const jsBody = entry.index >= 0 ? blankJsLine(js, entry.index) : js;
      code = jsBody;
      try {
        const candidate = instrument(jsBody, originalLines, collectNames(jsBody));
        new Function("__t", "console", candidate);
        code = candidate;
        instrumented = true;
      } catch (_) {
        code = jsBody;
        instrumented = false;
      }
    }
    if (!instrumented) say("⚠ 本次运行未能启用死循环熔断（插桩/编译回退），请留意可能的死循环", "dim");
    try {
      const r = evalCall(code, call, { budgetMs: budget, instrumented, entryLine });
      r.logs.forEach((l) => say("  log: " + l, "dim"));
      if (!r.ok && r.timeout) {
        const targetFile = r.file || entryFile;
        if (targetFile && targetFile !== entryFile) {
          uiHooks.switchToScriptFile(targetFile);
        }
        const targetLines = targetFile && targetFile !== entryFile && fileMap.has(targetFile) ? (fileMap.get(targetFile) || "").replace(/\r/g, "").split("\n") : originalLines;
        const line = r.line || 0;
        const snippet = line ? (targetLines[line - 1] || "").trim().slice(0, 90) : "";
        if (line) {
          appState.RUNTIME_ERROR_LINES.add(line);
          uiHooks.updateEditorChrome();
          uiHooks.revealErrorLine(line);
        }
        const fileTag = targetFile && targetFile !== entryFile ? targetFile + " · " : "";
        say(
          "✗ 运行超过 " + budget / 1e3 + "s 仍未结束，已强制终止（疑似死循环 / 计算量过大）" + (line ? " · 位置：" + fileTag + "第 " + line + " 行" + (snippet ? " · " + snippet : "") : " · 未能定位到具体行"),
          "err",
          line || void 0
        );
        return;
      }
      if (!r.ok) {
        const targetFile = r.file || entryFile;
        if (targetFile && targetFile !== entryFile) {
          uiHooks.switchToScriptFile(targetFile);
        }
        const targetLines = targetFile && targetFile !== entryFile && fileMap.has(targetFile) ? (fileMap.get(targetFile) || "").replace(/\r/g, "").split("\n") : originalLines;
        const line = r.line || sourceLineFromStack(r.stack, targetLines.length);
        if (line) {
          appState.RUNTIME_ERROR_LINES.add(line);
          uiHooks.updateEditorChrome();
          const filePrefix = targetFile && targetFile !== entryFile ? "[" + targetFile + "] " : "";
          say("✗ " + filePrefix + "第 " + line + " 行运行时报错: " + r.error, "err", line);
          uiHooks.revealErrorLine(line);
        } else {
          say("✗ 调用失败: " + r.error, "err");
        }
        return;
      }
      const elapsed = " (" + r.elapsedMs + "ms)";
      say("✓ 运行完成  →  " + safeJSONStringify(r.value) + elapsed, "ok");
    } catch (e) {
      say("✗ " + (e instanceof Error && e.message ? e.message : e), "err");
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
      file: frame.file,
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
      appState.DEBUG_SESSION.error = "已达单次调试上限，自动熔断以防死循环";
      say("✗ " + appState.DEBUG_SESSION.error, "err");
      return false;
    }
    const originalLines = appState.DEBUG_SESSION.originalLines;
    const entryFile = appState.DEBUG_SESSION.entryFile || appState.ENTRY_FILE_PATH || appState.FILE_NAME || "main.ts";
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
        file: entryFile,
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
    const __t = (line, note, snap, self, file) => {
      const stepLine = line || curLineTracker || 1;
      if (line) curLineTracker = line;
      const idx = count++;
      if ((idx & 63) === 63 && Date.now() - t0 > MAX_EXEC_MS) {
        throw new Error("执行超时 (>" + MAX_EXEC_MS + "ms)，自动熔断以防页面卡死");
      }
      const topFrame = liveCallStack[liveCallStack.length - 1];
      const stepFile = file || topFrame && topFrame.file || entryFile;
      if (topFrame) {
        topFrame.lastLine = stepLine;
        if (file) topFrame.file = file;
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
          const frLines = fr.file && appState.DEBUG_SESSION.moduleSources && appState.DEBUG_SESSION.moduleSources[fr.file] || originalLines;
          const fNote = isTop ? note || "" : frLines[(fr.lastLine || fr.line || 1) - 1] || "";
          return buildFrameSnapshotFromClosure(fr, isTop ? stepLine : fr.line || 1, fNote);
        });
        pendingStepSnapFn = effectiveSnap;
        phaseBox.current = {
          phase: evLoop.loop.phase,
          activeTaskLabel: evLoop.loop.activeTaskLabel,
          virtualTime: evLoop.loop.virtualTime
        };
        const stepToCommit = {
          file: stepFile,
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
    __t.__enter = (fnName, paramNames, paramVals, defLine, snapFn, file) => {
      if (unwindingPause) return 0;
      const fid = ++frameSeq;
      const label = formatCallFrameLabel(fnName, paramNames, paramVals);
      const callerFile = liveCallStack[liveCallStack.length - 1]?.file || entryFile;
      liveCallStack.push({
        id: fid,
        file: file || callerFile,
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
    let ckptEvaluatedOnStep = false;
    __t.__ckpt = (args) => {
      if (activeRecording && pendingStep) {
        ckptEvaluatedOnStep = true;
        const arr = Array.isArray(args) ? args : [];
        const isCondForm = arr.length > 0 && typeof arr[0] === "boolean";
        const triggered = arr.length === 0 || arr[0] === void 0 ? true : isCondForm ? Boolean(arr[0]) : true;
        const vals = isCondForm ? arr.length >= 2 && arr[1] !== void 0 ? [String(arr[1])] : [] : arr.map((x) => String(x));
        if (triggered) {
          pendingStep.isCheckpoint = true;
          pendingStep.checkpointVals = vals;
          if (vals.length > 0) {
            stepLogs.push(vals.join(", "));
          }
        } else {
          pendingStep.isCheckpoint = false;
          pendingStep.checkpointVals = [];
        }
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
          file: entryFile,
          line: callLine,
          note: "✗ 运行时错误: " + errMsg,
          v: {},
          ds: {},
          callStack: [{ id: 0, file: entryFile, fn: "global", label: "global", line: callLine, v: {}, ds: {} }],
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
        appState.DEBUG_SESSION.errorFile = entryFile;
        say("✗ 运行时错误 [第 " + callLine + " 行]: " + errMsg + "（已停止在报错处）", "err");
        return true;
      }
      if (targetIdx === 0 && appState.CURRENT_TS_META.interfaces && appState.CURRENT_TS_META.interfaces.size > 0) {
        const firstIface = [...appState.CURRENT_TS_META.interfaces.values()][0];
        if (firstIface) {
          const schemaDs = {};
          populateInterfaceSchemas(schemaDs);
          const schemaStep = {
            file: entryFile,
            line: firstIface.line || 1,
            note: `interface ${firstIface.name} { ${firstIface.fields.map((f) => f.k + (f.optional ? "?" : "") + ": " + f.declaredType).join("; ")} }`,
            v: {},
            ds: schemaDs,
            callStack: [{ id: 0, file: entryFile, fn: "global", label: "global", line: firstIface.line || 1, v: {}, ds: schemaDs }],
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
    const stepSourceLines = stepObj.file && appState.DEBUG_SESSION.moduleSources && appState.DEBUG_SESSION.moduleSources[stepObj.file] || originalLines;
    const rawLine = stepSourceLines[stepObj.line - 1] || stepObj.note || "";
    const nextContext = Object.assign({}, nextVRaw || stepObj.vRaw);
    if (stepObj.checkpointVals) {
      nextContext["__ckptVals"] = stepObj.checkpointVals;
    }
    if (ckptEvaluatedOnStep) {
      nextContext["__ckptTriggered"] = Boolean(stepObj.isCheckpoint);
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
    if (derived.isCheckpoint && (!ckptEvaluatedOnStep || stepObj.isCheckpoint)) {
      stepObj.isCheckpoint = true;
    }
    if (runtimeErr) {
      const errMsg = runtimeErr instanceof Error && runtimeErr.message ? runtimeErr.message : runtimeErr && typeof runtimeErr === "object" && "message" in runtimeErr && typeof runtimeErr.message === "string" ? runtimeErr.message : String(runtimeErr);
      stepObj.error = errMsg;
      stepObj.note = `${rawLine.trim()}  →  ✗ 运行时错误: ${errMsg}`;
      appState.RUNTIME_ERROR_LINES.add(stepObj.line);
      appState.DEBUG_SESSION.finished = true;
      appState.DEBUG_SESSION.crashed = true;
      appState.DEBUG_SESSION.error = errMsg;
      appState.DEBUG_SESSION.errorLine = stepObj.line;
      appState.DEBUG_SESSION.errorFile = stepObj.file || entryFile;
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
      const fileLabel = stepObj.file && stepObj.file !== entryFile ? `${stepObj.file} · ` : "";
      say("✗ 运行时错误 [" + fileLabel + "第 " + stepObj.line + " 行]: " + stepObj.error + "（已运行到报错为止）", "err");
    } else if (!paused && !opts.silent) {
      say("✓ 调试运行完成  →  " + safeJSONStringify(retVal), "ok");
    }
    return true;
  }
  function detectUnsupportedSyntax2(_src) {
    return [];
  }
  function startDebug(initialStep = 0, sourceCode) {
    appState.SELECTED_FRAME_IDX = null;
    const { entryFile, entrySource: src, fileMap } = collectWorkspaceFilesAndEntry(sourceCode);
    appState.ENTRY_FILE_PATH = entryFile;
    if (initialStep === 0) {
      logRunRoundHeader("🐞 Debug 调试", entryFile);
    }
    const unsupported = detectUnsupportedSyntax2(src);
    if (unsupported.length && unsupported[0]) {
      resetTraceState();
      unsupported.forEach((x) => say("✗ 第 " + x.line + " 行：暂不支持 " + x.feature + " —— " + x.hint, "err", x.line));
      uiHooks.revealErrorLine(unsupported[0].line);
      return false;
    }
    const { diagnostics: diags, graph } = typecheckWorkspaceModules(entryFile, src, fileMap, appState.STRICT_TS);
    if (diags.length > 0) {
      resetTraceState();
      reportTypeErrors(diags);
      return false;
    }
    if (appState.TYPE_ERROR_LINES.size || appState.RUNTIME_ERROR_LINES.size) {
      appState.TYPE_ERROR_LINES.clear();
      appState.RUNTIME_ERROR_LINES.clear();
    }
    let compiledFn;
    let originalLines = src.split("\n");
    let expr = "undefined";
    let hasAsync = hasAsyncConstructs(src);
    let moduleSources = { [entryFile]: originalLines };
    if (graph.isMultiFile) {
      const bundle = compileMultiModuleBundle(graph, fileMap);
      if (!bundle.ok) {
        resetTraceState();
        if (bundle.errorFile && bundle.errorFile !== entryFile) {
          uiHooks.switchToScriptFile(bundle.errorFile);
        }
        say("✗ 第 " + (bundle.errorLine || 1) + " 行：" + (bundle.errorMessage || "编译失败"), "err", bundle.errorLine || 1);
        if (bundle.errorLine) uiHooks.revealErrorLine(bundle.errorLine);
        return false;
      }
      originalLines = bundle.entryLines;
      expr = stripTypes(bundle.call || "undefined");
      appState.ENTRY_CALL_LINE = bundle.entryLine || 0;
      hasAsync = bundle.hasAsync;
      moduleSources = bundle.moduleSources;
      try {
        const entryNames = bundle.entryNames;
        const snapStr = snapFnExpr(entryNames);
        const body = bundle.code + "\n;var __entryVal = (" + expr + ');\nif (typeof __t === "function" && __t.__drain) { __entryVal = __t.__drain(__entryVal, ' + snapStr + '); }\ntry{if(typeof __t==="function"&&__t.__fin)__t.__fin(' + snapStr + ");}catch(_){}\nreturn __entryVal;";
        compiledFn = new Function("__t", "console", body);
      } catch (e) {
        resetTraceState();
        say("✗ 编译失败: " + (e instanceof Error && e.message ? e.message : e), "err");
        return false;
      }
    } else {
      extractTsInterfaceMetadata(src);
      const enums = transpileEnums(src);
      if (enums.error) {
        resetTraceState();
        say("✗ 第 " + enums.error.line + " 行：" + enums.error.message, "err", enums.error.line);
        uiHooks.revealErrorLine(enums.error.line);
        return false;
      }
      const js0 = stripTypes(enums.code);
      const entry = resolveEntry(src, js0);
      expr = stripTypes(entry.expr || "undefined");
      appState.ENTRY_CALL_LINE = entry.line || 0;
      const jsBody = entry.index >= 0 ? blankJsLine(js0, entry.index) : js0;
      try {
        const names = collectNames(jsBody);
        const js = instrument(jsBody, originalLines, names);
        const snapStr = snapFnExpr(names);
        const body = js + "\n;var __entryVal = (" + expr + ');\nif (typeof __t === "function" && __t.__drain) { __entryVal = __t.__drain(__entryVal, ' + snapStr + '); }\ntry{if(typeof __t==="function"&&__t.__fin)__t.__fin(' + snapStr + ");}catch(_){}\nreturn __entryVal;";
        compiledFn = new Function("__t", "console", body);
      } catch (e) {
        resetTraceState();
        say("✗ 编译失败: " + (e instanceof Error && e.message ? e.message : e), "err");
        return false;
      }
    }
    uiHooks.stopAuto();
    uiHooks.clearFlyLayer();
    appState.TRACE = {
      title: graph.isMultiFile ? `TypeScript Multi-Module · ${entryFile}` : "TypeScript Playground · Debug",
      code: originalLines,
      steps: [],
      entryFile,
      moduleSources
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
      hasAsync,
      entryFile,
      moduleSources
    };
    appState.ACTIVE_DEBUG_FILE = entryFile;
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
      const multiBadge = graph.isMultiFile ? `（共加载 ${graph.order.length} 个模块）` : "";
      say("✓ 编译通过" + multiBadge + " · 已进入 Debug 模式（每走一步当场计算，可随时步进或运行到下一个检查点）", "ok");
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
    const guideChar = isBelow ? "╰─" : "╭─";
    if (stError) {
      return `<div class="step-viz-row"><span class="sv-guide err">${guideChar}</span><div class="sv-box sv-err-box"><span class="sv-err-tag">✗ RUNTIME ERROR</span><span class="sv-err-msg">${esc(stError)}</span></div></div>`;
    }
    if (!anim) return "";
    if (anim.type === "error" && anim.message) {
      return `<div class="step-viz-row"><span class="sv-guide err">${guideChar}</span><div class="sv-box sv-err-box"><span class="sv-err-tag">✗ RUNTIME ERROR</span><span class="sv-err-msg">${esc(anim.message)}</span></div></div>`;
    }
    if (anim.type === "checkpoint") {
      const args = anim.args || [];
      const argVals = anim.argVals || [];
      const chips = args.length ? args.map((a, idx) => {
        const av = argVals[idx];
        const showEq = av !== void 0 && av !== a;
        return `<span class="sv-arg">${esc(a)}${showEq ? ` <span class="sv-eval">= ${esc(av)}</span>` : ""}</span>`;
      }).join('<span class="sv-dim">,</span>') : `<span class="sv-dim">已暂停于检查点函数 ${esc(anim.fn || "checkpoint")}()</span>`;
      return `<div class="step-viz-row"><span class="sv-guide ckpt">${guideChar}</span><div class="sv-box sv-ckpt-box"><span class="sv-ckpt-tag">◉ CHECKPOINT</span>` + chips + `</div></div>`;
    }
    if (anim.type === "assign") {
      const valTxt = anim.val != null ? anim.val : "…";
      const showFrom = anim.from && anim.from !== valTxt;
      return `<div class="step-viz-row"><span class="sv-guide">${guideChar}</span><div class="sv-box"><span class="sv-dst">${esc(anim.to)}</span><span class="sv-arrow">⟵</span><span class="sv-val">${esc(valTxt)}</span>` + (showFrom ? `<span class="sv-dim">from</span><span class="sv-src">${esc(anim.from)}</span>` : "") + `</div></div>`;
    }
    if (anim.type === "compare") {
      const vCls = anim.result ? "ok" : "no";
      const lhsShowVal = anim.lhsVal !== void 0 && anim.lhsVal !== anim.lhs;
      const rhsShowVal = anim.rhs && anim.rhsVal !== void 0 && anim.rhsVal !== anim.rhs;
      const lhsHtml = `<span class="sv-cmp"><span>${esc(anim.lhs)}</span>${lhsShowVal ? `<span class="sv-eval">= ${esc(anim.lhsVal)}</span>` : ""}</span>`;
      const rhsHtml = anim.rhs ? `<span class="sv-op">${esc(anim.op)}</span><span class="sv-cmp"><span>${esc(anim.rhs)}</span>${rhsShowVal ? `<span class="sv-eval">= ${esc(anim.rhsVal)}</span>` : ""}</span>` : "";
      return `<div class="step-viz-row"><span class="sv-guide">${guideChar}</span><div class="sv-box">` + lhsHtml + rhsHtml + `<span class="sv-verdict ${vCls}">⇒ ${anim.result ? "true" : "false"}</span></div></div>`;
    }
    if (anim.type === "call") {
      const args = anim.args || [];
      const argVals = anim.argVals || [];
      const argChips = args.map((a, idx) => {
        const av = argVals[idx];
        const showEq = av !== void 0 && av !== a;
        return `<span class="sv-arg">${esc(a)}${showEq ? ` <span class="sv-eval">= ${esc(av)}</span>` : ""}</span>`;
      }).join('<span class="sv-dim">,</span>');
      const prefix = anim.to && anim.result != null ? `<span class="sv-dst">${esc(anim.to)}</span><span class="sv-arrow">⟵</span><span class="sv-val">${esc(anim.result)}</span><span class="sv-dim">from</span>` : anim.result != null ? `<span class="sv-val">${esc(anim.result)}</span><span class="sv-arrow">⟵</span>` : "";
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
      const targetGuide = placedBelow ? "╰─" : "╭─";
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
    "断点",
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
    const esmImpRe = /^\s*import\s+(?:type\s+)?(.+?)\s+from\s+['"][^'"]+['"]/gm;
    while (m = esmImpRe.exec(text)) {
      const clause = (m[1] || "").replace(/\btype\b/g, " ");
      const idRe = /\b([A-Za-z_$][\w$]*)\b/g;
      let im;
      while (im = idRe.exec(clause)) {
        if (im[1] && im[1] !== "as") names.add(im[1]);
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
    const out = /* @__PURE__ */ new Set();
    Array.from(HIGHLIGHT_BUILTINS).forEach((name) => {
      if (!declared.has(name)) out.add(name);
    });
    return out;
  }
  function hl(t, declared) {
    const re = /(\/\/.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b(function|const|let|var|new|class|extends|typeof|instanceof|import|export|from|async|await|interface|type|as|satisfies)\b|\b(for|if|else|return|while|do|switch|case|break|continue|try|catch|finally|throw|yield)\b|\b(number|string|boolean|void|any|unknown|never|Math|Map|Set|Array|Object|JSON|Number|String|Boolean|Promise|Record|Error)\b|\b(true|false|null|undefined|\d+(?:\.\d+)?)\b|(\b[A-Za-z_$][\w$]*)(?=\s*\()|(?<=\.)([A-Za-z_$][\w$]*)\b|([{,][ \t]*)([A-Za-z_$][\w$]*)(?=[ \t]*:)|(^[ \t]*)([A-Za-z_$][\w$]*)(?=[ \t]*:)|\b([A-Za-z_$][\w$]*)\b|(===|!==|>=|<=|=>|&&|\|\||\+\+|--)/g;
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
    const stepFile = activeFrame && activeFrame.file || st && st.file || appState.DEBUG_SESSION.entryFile || "";
    const isMultiModule = Boolean(
      appState.TRACE.moduleSources && Object.keys(appState.TRACE.moduleSources).length > 1
    );
    const currentEditorFile = normalizeWorkspaceModulePath(appState.FILE_NAME || appState.ACTIVE_DEBUG_FILE || "");
    const viewingStepFile = !isMultiModule || !stepFile || !currentEditorFile || stepFile === currentEditorFile;
    const curLine = viewingStepFile ? activeFrame ? activeFrame.line : st ? st.line : -1 : -1;
    const showVizOnLine = Boolean(
      viewingStepFile && st && (!activeFrame || activeFrame.isTop) && (st.anim || st.error) && curLine >= 1 && curLine <= lines.length
    );
    const errorBadge = (lineNum) => {
      const d = liveByLine.get(lineNum);
      if (!d) return "";
      const tip = (d.code ? d.code + ": " : "") + (d.message || "");
      return '<span class="ln-err-badge" title="' + esc(tip) + '">✗ ' + esc(d.code || "TS") + "</span>";
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
  var LIVE_TYPE_CACHE = { key: null, diags: [] };
  function liveTypeDiags(src) {
    const text = String(src == null ? "" : src);
    const currentFile = normalizeWorkspaceModulePath(appState.FILE_NAME || "main.ts");
    const hasModuleSyntax = /^\s*(?:import|export)\b/m.test(text);
    let fileMap = /* @__PURE__ */ new Map();
    let mapSig = "";
    if (hasModuleSyntax) {
      try {
        fileMap = uiHooks.collectWorkspaceFileMap();
        const keys = Array.from(fileMap.keys()).sort();
        if (keys.length > 0) {
          mapSig = keys.map((k) => `${k}:${(fileMap.get(k) || "").length}`).join("|");
        }
      } catch (_) {
        fileMap = /* @__PURE__ */ new Map();
      }
    }
    const cacheKey = `${currentFile}::${appState.STRICT_TS ? 1 : 0}::${mapSig}::${text}`;
    if (LIVE_TYPE_CACHE.key === cacheKey) return LIVE_TYPE_CACHE.diags;
    let diags = [];
    try {
      if (hasModuleSyntax && fileMap.size > 0) {
        fileMap.set(currentFile, text);
        const { diagnostics } = typecheckWorkspaceModules(currentFile, text, fileMap, appState.STRICT_TS);
        diags = diagnostics.filter((d) => !d.file || d.file === currentFile);
      } else {
        diags = typecheckTS(text, appState.STRICT_TS) || [];
      }
    } catch (_) {
      diags = [];
    }
    LIVE_TYPE_CACHE = { key: cacheKey, diags };
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
    const lookupKey = name;
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
    const kindStr = d ? d.kind === "interface" && d.isClass ? d.interfaceName ? "class · " + d.interfaceName : "class" : d.kind : typeof val === "function" ? formatFunctionTypeSignature(lookupKey, val) : declaredType || inferRuntimeTsType(val);
    return {
      name,
      val,
      d,
      kind: kindStr,
      declaredType: declaredType || null,
      frame: frameLabel
    };
  }
  function formatHoverVal(val, varName) {
    if (val === void 0) return "undefined";
    if (val === null) return "null";
    if (typeof val === "function") return formatFunctionTypeSignature(varName || val.name || "", val);
    if (typeof val === "string") return JSON.stringify(val.length > 140 ? val.slice(0, 138) + "…" : val);
    if (typeof val === "number" || typeof val === "boolean") return String(val);
    if (Array.isArray(val)) {
      const head = val.slice(0, 12).map((item) => formatHoverVal(item)).join(", ");
      return "[" + head + (val.length > 12 ? ", … (" + val.length + " 项)" : "") + "]";
    }
    if (isMapLike(val)) return "Map(" + val.size + ")";
    if (isSetLike(val)) return "Set(" + val.size + ")";
    if (isRecord(val)) {
      const keys = Object.keys(val);
      const body = keys.slice(0, 8).map((k) => k + ": " + formatHoverVal(val[k])).join(", ");
      return "{ " + body + (keys.length > 8 ? ", …" : "") + " }";
    }
    return String(val);
  }
  function hoverValueSummary(info) {
    const d = info.d;
    if (!d) return formatHoverVal(info.val, info.name);
    const short = formatShortVal;
    if (Array.isArray(d.items)) {
      const total = typeof d.total === "number" ? d.total : d.items.length;
      if (d.kind === "string") {
        const s = d.items.join("");
        const suffix = total > d.items.length ? ` (共 ${total} 字符)` : "";
        return JSON.stringify(s.length > 120 ? s.slice(0, 118) + "…" : s) + suffix;
      }
      const head = d.items.slice(0, 14).map(short).join(", ");
      return "[" + head + (total > 14 ? `, … (共 ${total} 项)` : "") + "]";
    }
    if (d.kind === "map") {
      const entries = d.entries || [];
      const total = typeof d.total === "number" ? d.total : entries.length;
      const head = entries.slice(0, 6).map((e) => short(e.k) + " → " + short(e.v)).join(", ");
      return "Map(" + total + " 项) { " + head + (total > 6 ? ", …" : "") + " }";
    }
    if (d.kind === "grid") {
      const rows = typeof d.totalRows === "number" ? d.totalRows : (d.cells || []).length;
      const cols = typeof d.totalCols === "number" ? d.totalCols : rows && Array.isArray(d.cells[0]) ? d.cells[0].length : 0;
      return rows + " × " + cols + " 的二维矩阵";
    }
    if (d.kind === "tree") {
      const nodes = d.nodes || [];
      const total = typeof d.total === "number" ? d.total : nodes.length;
      const root = nodes[d.root] ? nodes[d.root].val : void 0;
      return "Tree(" + total + " 个节点 · 根 " + short(root) + ")";
    }
    if (d.kind === "graph") {
      const nCnt = typeof d.totalNodes === "number" ? d.totalNodes : (d.nodes || []).length;
      const eCnt = typeof d.totalEdges === "number" ? d.totalEdges : (d.edges || []).length;
      return "Graph(" + nCnt + " 节点 / " + eCnt + " 条边)";
    }
    if (d.fields) {
      const head = d.fields.slice(0, 6).map((f) => f.k + ": " + short(f.v)).join(", ");
      return "{ " + head + (d.fields.length > 6 ? ", …" : "") + " }";
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
    if (info.declaredType) note.push("声明类型 " + info.declaredType);
    if (info.frame) note.push("栈帧 " + info.frame);
    if (note.length) parts.push('<div class="ht-note">' + esc(note.join(" · ")) + "</div>");
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
    formatFnTypeHtml: () => formatFnTypeHtml,
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
      callStackBarEl.innerHTML = '<span class="cs-empty">未在调试</span>';
      if (callStackHintEl) callStackHintEl.textContent = "点击栈帧可切换作用域";
      return;
    }
    const stack = Array.isArray(st.callStack) && st.callStack.length ? st.callStack : [{ file: st.file, fn: "global", label: "global", line: st.line, v: st.v || {}, ds: st.ds || {} }];
    const active = getActiveFrame(st);
    const activeIdx = active ? active.idx : 0;
    const activeIsTop = active ? active.isTop : true;
    const activeLabel = active ? active.label : "global";
    const isMultiModule = Boolean(
      appState.TRACE.moduleSources && Object.keys(appState.TRACE.moduleSources).length > 1
    );
    callStackBarEl.innerHTML = stack.map((f, fIdx) => {
      const isSel = fIdx === activeIdx;
      const isTop = fIdx === stack.length - 1;
      const cls = "cs-crumb" + (isSel ? " active" : "") + (isTop ? " is-top" : "") + (!isTop && isSel ? " inspecting" : "");
      const sep = fIdx > 0 ? '<span class="cs-sep">▸</span>' : "";
      const shortFile = f.file ? f.file.split("/").pop() || f.file : "";
      const displayLabel = isMultiModule && shortFile && !String(f.label || "").startsWith("<module:") ? `[${shortFile}] ${f.label}` : String(f.label || "global");
      const titlePrefix = f.file ? `${f.file} · ` : "";
      return sep + `<button type="button" class="${cls}" data-frame-idx="${fIdx}" title="切换到栈帧 ${esc(titlePrefix + String(f.label || "global"))} (第 ${f.line || st.line} 行)">${esc(displayLabel)}</button>`;
    }).join("");
    if (callStackHintEl) {
      const activeFileTag = isMultiModule && active && active.file ? ` (${active.file}) ` : "";
      callStackHintEl.textContent = activeIsTop ? `栈深 ${stack.length}${activeFileTag} · 点击栈帧可切换` : `正在查看栈帧 ${activeIdx + 1}/${stack.length}${activeFileTag}: ${activeLabel}`;
    }
  }
  function truncMap(arr, render, d) {
    if (d && Array.isArray(d.windowed) && d.windowed.length) {
      return d.windowed.map((entry) => {
        if (entry && entry.gap) {
          const tip = entry.from != null && entry.to != null ? ` title="省略下标 ${entry.from}..${entry.to}（共 ${entry.count} 项）"` : "";
          return '<div class="vmore"' + tip + '>…<span class="vmore-cnt">+' + entry.count + "</span></div>";
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
    return head + '<div class="vmore" title="省略 ' + hidden + ' 项">…<span class="vmore-cnt">+' + hidden + "</span></div>" + tail;
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
    return '<div class="viz"><div class="viz-row varray-row">' + cells + '</div><div class="vmeta-hint">parent = (i - 1) &gt;&gt; 1 · left = 2i + 1</div></div>';
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
      return '<div class="vpair' + (d.hot === k ? " hot" : "") + '"><span class="vcell vk">' + esc(k) + '</span><span class="varr">→</span><span class="vcell vv">' + esc(v) + "</span></div>";
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
    return '<div class="viz"><div class="vcol">' + rows + "</div>" + (hiddenCount ? '<div class="vmore">…+' + hiddenCount + "</div>" : "") + "</div>";
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
          html2 += '<div class="ggap">⋯</div>';
        } else {
          const isFocusCol = Array.isArray(d.mark) && d.mark[1] === ct.c;
          html2 += '<div class="ghead' + (isFocusCol ? " focus" : "") + '">' + ct.c + "</div>";
        }
      }
      for (let ri = 0; ri < rIdxs.length; ri++) {
        const realR = rIdxs[ri];
        if (ri > 0 && realR !== void 0 && realR > (rIdxs[ri - 1] ?? 0) + 1) {
          html2 += '<div class="ggap">⋮</div>';
          for (let gi = 0; gi < colTracks.length; gi++) {
            html2 += '<div class="ggap">' + (colTracks[gi]?.gap ? "⋱" : "⋮") + "</div>";
          }
        }
        const isFocusRow = Array.isArray(d.mark) && d.mark[0] === realR;
        html2 += '<div class="ghead' + (isFocusRow ? " focus" : "") + '">' + realR + "</div>";
        const rowVals = d.viewCells[ri] || [];
        for (const ct of colTracks) {
          if (ct.gap) {
            html2 += '<div class="ggap">⋯</div>';
          } else {
            const realC = ct.c;
            let cls = "gcell";
            if (Array.isArray(d.mark) && d.mark[0] === realR && d.mark[1] === realC) cls += " hot";
            else if (depSet.has(realR + "," + realC)) cls += " dep";
            const val = rowVals[ct.ci];
            html2 += '<div class="' + cls + '" title="[' + realR + "][" + realC + ']">' + (val === void 0 || val === null ? "·" : esc(val)) + "</div>";
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
        html += '<div class="' + cls + '">' + (val === void 0 || val === null ? "·" : esc(val)) + "</div>";
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
      return '<div class="vpair"><span class="vcell' + (d.hot === k ? " hot" : "") + '">' + pTag + esc(val) + "</span>" + (k < total - 1 ? '<span class="varr">→</span>' : '<span class="varr">→</span><span class="vempty">null</span>') + "</div>";
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
    const badgeTxt = d.isSchema ? d.instanceName ? `schema · 绑定 ${d.instanceName}` : "schema" : "instance";
    const rows = fields.length ? fields.slice(0, 12).map((f) => {
      const isHot = d.hot === f.k;
      const hasVal = f.v !== void 0;
      const isStr = typeof f.v === "string";
      const valDisplay = hasVal ? isStr ? JSON.stringify(f.v) : f.v !== null && typeof f.v === "object" ? safeJSONStringify(f.v) : String(f.v) : "未实例化";
      return '<div class="viface-row' + (isHot ? " hot" : "") + '"><span class="viface-k">' + esc(f.k) + (f.optional ? '<span class="viface-opt">?</span>' : "") + "</span>" + (f.declaredType ? '<span class="viface-t">: ' + esc(f.declaredType) + "</span>" : "") + (hasVal ? '<span class="viface-eq">=</span><span class="viface-v' + (isStr ? " str" : "") + '">' + esc(valDisplay) + "</span>" : '<span class="viface-v schema-only">' + esc(valDisplay) + "</span>") + "</div>";
    }).join("") : '<div class="viface-row"><span class="viface-v schema-only">（无实例属性）</span></div>';
    return '<div class="viz"><div class="viface"><div class="viface-head"><span class="viface-kw">' + kwTxt + '</span><span class="viface-title">' + esc(ifaceTitle) + '</span><span class="viface-badge">' + esc(badgeTxt) + '</span></div><div class="viface-body">' + rows + "</div></div></div>";
  }
  function vizEventLoop(d) {
    if (!d) return null;
    const phaseMap = {
      sync: { label: "Sync · 同步栈执行", cls: "sync" },
      await_suspend: { label: "Await · 协程挂起", cls: "suspend" },
      await_resume: { label: "Await · 协程恢复", cls: "resume" },
      microtask: { label: "Microtask · 微任务出队", cls: "micro" },
      macrotask: { label: "Macrotask · 宏任务触发", cls: "macro" }
    };
    const ph = (d.phase ? phaseMap[d.phase] : void 0) || { label: d.phase || "Event Loop", cls: "sync" };
    const nowMs = typeof d.now === "number" ? d.now : 0;
    const coroutines = Array.isArray(d.coroutines) ? d.coroutines : [];
    const coroHtml = coroutines.length ? coroutines.map((c) => {
      const stCls = c.status === "running" ? "running" : c.status === "suspended" ? "suspended" : "completed";
      const stLabel = c.status === "running" ? "● 执行中" : c.status === "suspended" ? `⏸ 挂起 @L${c.line}` : "✓ 完成";
      const detail = c.status === "suspended" && c.awaitingExpr ? `<span class="vel-coro-expr">await ${esc(c.awaitingExpr)}</span>` : c.status === "completed" && c.returnVal !== void 0 ? `<span class="vel-coro-expr">⇒ ${esc(c.returnVal)}</span>` : "";
      return `<div class="vel-chip coro-${stCls}"><span class="vel-chip-title">async ${esc(c.name)}()</span><span class="vel-chip-status">${esc(stLabel)}</span>` + detail + `</div>`;
    }).join("") : '<span class="vel-empty">无活跃协程</span>';
    const microtasks = Array.isArray(d.microtasks) ? d.microtasks : [];
    const microHtml = microtasks.length ? microtasks.map(
      (m, idx) => `<div class="vel-qitem micro${idx === 0 ? " head" : ""}"><span class="vel-qidx">#${idx + 1}</span><span class="vel-qlabel">${esc(m.label)}</span>` + ((m.line ?? 0) > 0 ? `<span class="vel-qmeta">@L${m.line}</span>` : "") + `</div>`
    ).join("") : '<span class="vel-empty">队列为空 (0)</span>';
    const macrotasks = Array.isArray(d.macrotasks) ? d.macrotasks : [];
    const macroHtml = macrotasks.length ? macrotasks.map(
      (t, idx) => `<div class="vel-qitem macro${idx === 0 ? " head" : ""}"><span class="vel-qidx">t=${t.due}ms</span><span class="vel-qlabel">${esc(t.label)}</span><span class="vel-qmeta">+${t.delay}ms</span></div>`
    ).join("") : '<span class="vel-empty">无待触发定时器 (0)</span>';
    const promises = Array.isArray(d.promises) ? d.promises : [];
    const promHtml = promises.length ? promises.map((p) => {
      const st = p.state || "pending";
      const icon = st === "fulfilled" ? "✓" : st === "rejected" ? "✗" : "⏳";
      const reactions = p.reactions ?? 0;
      const valPart = st === "pending" ? reactions > 0 ? `<span class="vel-pval dim">${reactions} waiter${reactions > 1 ? "s" : ""}</span>` : '<span class="vel-pval dim">pending</span>' : `<span class="vel-pval">${esc(p.value)}</span>`;
      return `<div class="vel-pcard ${esc(st)}"><span class="vel-phead"><span class="vel-picon">${icon}</span><span class="vel-pname">P#${p.id} · ${esc(p.label)}</span></span>` + valPart + `</div>`;
    }).join("") : '<span class="vel-empty">暂无 Promise 实例</span>';
    return `<div class="viz"><div class="veventloop"><div class="vel-header"><span class="vel-phase ${ph.cls}">${esc(ph.label)}</span>` + (d.activeTask ? `<span class="vel-active">${esc(d.activeTask)}</span>` : "") + `<span class="vel-clock">⏱ 虚拟时钟 ${nowMs}ms</span></div><div class="vel-grid"><div class="vel-lane"><div class="vel-lane-title">Async 协程状态</div><div class="vel-lane-body">` + coroHtml + '</div></div><div class="vel-lane"><div class="vel-lane-title">Microtask 微任务队列 (FIFO)</div><div class="vel-lane-body">' + microHtml + '</div></div><div class="vel-lane"><div class="vel-lane-title">Macrotask 宏任务 / 定时器</div><div class="vel-lane-body">' + macroHtml + '</div></div><div class="vel-lane"><div class="vel-lane-title">Promise 状态表</div><div class="vel-lane-body vel-pgrid">' + promHtml + "</div></div></div></div></div>";
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
      pickEl.innerHTML = '<span class="vempty">无结构变量</span>';
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
      slotsEl.innerHTML = '<div class="slot" style="grid-column:1/-1"><div class="vempty">' + (appState.TRACE.steps.length ? "点选变量以关注（或本步暂无结构）" : "生成轨迹后显示结构可视化") + "</div></div>";
      return;
    }
    const allocated = allocateSlotSpans(vars, ds);
    slotsEl.innerHTML = allocated.map(({ s, d, kind, span }) => {
      const fn = VIZ[kind];
      const body = d ? fn ? fn(d) || '<div class="vempty">empty</div>' : '<div class="vempty">…</div>' : '<div class="vempty">empty</div>';
      const winTag = d && d.win ? `<span class="win-tag">[${d.win[0]}..${d.win[1]}]</span>` : "";
      let sizeTag = "";
      if (d) {
        if (kind === "grid" && ((d.totalRows || 0) > 10 || (d.totalCols || 0) > 10)) {
          sizeTag = `<span class="size-tag">${d.totalRows}×${d.totalCols}</span>`;
        } else if (typeof d.total === "number" && d.total > 20) {
          sizeTag = `<span class="size-tag">共 ${d.total} 项</span>`;
        }
      }
      const isHotSlot = d && (d.hot !== void 0 || d.mark != null);
      const kindPrefix = d && d.isClass ? "class" : "interface";
      const kindBadge = kind === "interface" && d && d.interfaceName && d.interfaceName !== "object" && !d.isSchema ? `${kindPrefix} · ${d.interfaceName}` : kind === "interface" && d && d.isClass ? "class" : kind;
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
  function formatTypeTokensHtml(typeExpr) {
    return esc(typeExpr).replace(/\b([A-Za-z_$][\w$]*)\b/g, '<span class="ft-type">$1</span>');
  }
  function formatFnTypeHtml(sig) {
    const s = String(sig || "() => any").trim();
    let d = 0;
    let arrowIdx = -1;
    for (let i = 0; i < s.length - 1; i++) {
      const ch = s[i];
      if (ch === "(" || ch === "<" || ch === "[") d++;
      else if (ch === ")" || ch === ">" || ch === "]") d = Math.max(0, d - 1);
      else if (d === 0 && ch === "=" && s[i + 1] === ">") {
        arrowIdx = i;
        break;
      }
    }
    if (arrowIdx < 0) {
      return formatTypeTokensHtml(s);
    }
    const left = s.slice(0, arrowIdx).trim();
    const right = s.slice(arrowIdx + 2).trim();
    let genPrefix = "";
    let paramsPart = left;
    if (left.startsWith("<")) {
      let gd = 0;
      for (let i = 0; i < left.length; i++) {
        if (left[i] === "<") gd++;
        else if (left[i] === ">") {
          gd--;
          if (gd === 0) {
            genPrefix = left.slice(0, i + 1);
            paramsPart = left.slice(i + 1).trim();
            break;
          }
        }
      }
    }
    let paramsInner = paramsPart;
    if (paramsPart.startsWith("(") && paramsPart.endsWith(")")) {
      paramsInner = paramsPart.slice(1, -1);
    }
    const paramList = [];
    let pd = 0;
    let last = 0;
    for (let i = 0; i < paramsInner.length; i++) {
      const ch = paramsInner[i];
      if (ch === "(" || ch === "<" || ch === "[" || ch === "{") pd++;
      else if (ch === ")" || ch === ">" || ch === "]" || ch === "}") pd = Math.max(0, pd - 1);
      else if (pd === 0 && ch === ",") {
        paramList.push(paramsInner.slice(last, i).trim());
        last = i + 1;
      }
    }
    const tail = paramsInner.slice(last).trim();
    if (tail) paramList.push(tail);
    const formattedParams = paramList.map((p) => {
      const m = p.match(/^(\.\.\.)?([A-Za-z_$][\w$]*)(\?)?\s*:\s*([\s\S]+)$/);
      if (m && m[2] && m[4]) {
        const dots = m[1] ? `<span class="ft-punct">...</span>` : "";
        const opt = m[3] ? `<span class="ft-punct">?</span>` : "";
        return `${dots}<span class="ft-param">${esc(m[2])}</span>${opt}<span class="ft-punct">: </span>${formatTypeTokensHtml(m[4].trim())}`;
      }
      return formatTypeTokensHtml(p);
    }).join('<span class="ft-punct">, </span>');
    const genHtml = genPrefix ? formatTypeTokensHtml(genPrefix) : "";
    return `${genHtml}<span class="ft-punct">(</span>${formattedParams}<span class="ft-punct">)</span> <span class="ft-arrow">=&gt;</span> ` + formatTypeTokensHtml(right);
  }
  function renderStatic(i, withAnim = false) {
    hideHoverTip();
    const st = appState.TRACE.steps[i];
    const prevSt = i > 0 ? appState.TRACE.steps[i - 1] : null;
    if (!st) {
      renderCallStack(null);
      varsEl.innerHTML = "";
      consoleEl.innerHTML = '<div><span class="p">›</span><span class="dim">开启 Debug 模式后当场计算并显示每步执行详情</span></div>';
      cntEl.textContent = "未在调试";
      cntEl.className = "";
      updateControlButtons();
      renderSlots();
      updateEditorChrome();
      return;
    }
    renderCallStack(st);
    const activeFrame = getActiveFrame(st);
    const targetFile = activeFrame && activeFrame.file || st.file || appState.DEBUG_SESSION.entryFile || "";
    if (targetFile && appState.TRACE.moduleSources && Object.keys(appState.TRACE.moduleSources).length > 1) {
      appState.ACTIVE_DEBUG_FILE = targetFile;
      uiHooks.switchToScriptFile(targetFile);
    }
    const v = activeFrame && activeFrame.v || st.v || {};
    const prevV = prevSt && prevSt.v || {};
    const isTopFrame = Boolean(!activeFrame || activeFrame.isTop);
    const assignTarget = isTopFrame && st.anim && (st.anim.type === "assign" || st.anim.type === "call" && st.anim.to) && typeof st.anim.to === "string" && st.anim.to !== "return" ? st.anim.to.trim() : "";
    const assignNextVal = assignTarget && st.anim ? st.anim.val !== void 0 ? st.anim.val : st.anim.result : void 0;
    const primList = Object.keys(v).map((k) => {
      const val = v[k];
      if (val !== null && typeof val === "object") return "";
      const isFn = typeof val === "function";
      const prevVal = prevV[k];
      const isPendingAssign = Boolean(
        assignTarget === k && assignNextVal !== void 0 && assignNextVal !== null && String(val) !== String(assignNextVal)
      );
      const changed = Boolean(
        isPendingAssign || activeFrame && activeFrame.isTop && prevSt && (isFn ? typeof prevVal !== "function" || formatFunctionTypeSignature(k, prevVal) !== formatFunctionTypeSignature(k, val) : prevVal !== val)
      );
      const nextBadge = isPendingAssign ? ` <span class="v-next" title="本行执行前为 ${esc(val)}，本行赋值后变为 ${esc(assignNextVal)}">→ ${esc(assignNextVal)}</span>` : "";
      const valHtml = isFn ? '<span class="v fn-type">' + formatFnTypeHtml(formatFunctionTypeSignature(k, val)) + "</span>" : '<span class="v">' + esc(val) + nextBadge + "</span>";
      return '<div class="pair' + (changed ? " changed" : "") + '" data-var="' + esc(k) + '"><span class="k">' + esc(k) + "</span>" + valHtml + "</div>";
    });
    if (assignTarget && /^[A-Za-z_$][\w$]*$/.test(assignTarget) && !(assignTarget in v) && assignNextVal !== void 0 && assignNextVal !== null) {
      primList.push(
        '<div class="pair changed" data-var="' + esc(assignTarget) + '" title="本行即将声明并赋值的变量"><span class="k">' + esc(assignTarget) + '</span><span class="v"><span class="v-next">→ ' + esc(assignNextVal) + "</span></span></div>"
      );
    }
    const primEntries = primList.join("");
    if (primEntries) {
      varsEl.innerHTML = primEntries;
    } else if (activeFrame && activeFrame.fn === "global") {
      varsEl.innerHTML = '<div class="pair"><span class="k">scope</span><span class="v">global</span></div>' + (appState.DEBUG_SESSION.callExpr && appState.DEBUG_SESSION.callExpr !== "undefined" ? '<div class="pair"><span class="k">entry</span><span class="v">' + esc(appState.DEBUG_SESSION.callExpr) + "</span></div>" : "");
    } else {
      varsEl.innerHTML = '<div class="vempty">（本帧无原始类型局部变量）</div>';
    }
    let animDesc = "";
    const fileTag = st.file && appState.TRACE.moduleSources && Object.keys(appState.TRACE.moduleSources).length > 1 ? `${st.file} · ` : "";
    if (st.error) {
      animDesc = `<div class="anim-desc" style="color:var(--red)">runtime error · 已停止在报错行 (${esc(fileTag)}第 ${st.line} 行)</div>`;
    } else if (st.anim) {
      if (st.anim.type === "assign") animDesc = `<div class="anim-desc">${esc(fileTag)}assign · ${esc(st.anim.from)} → ${esc(st.anim.to)} = ${esc(st.anim.val)}</div>`;
      else if (st.anim.type === "compare") animDesc = `<div class="anim-desc">${esc(fileTag)}compare · ${esc(st.anim.lhs)} ${esc(st.anim.op)} ${esc(st.anim.rhs)} ⇒ ${esc(st.anim.result)}</div>`;
      else if (st.anim.type === "call") animDesc = `<div class="anim-desc">${esc(fileTag)}call · ${esc(st.anim.fn)}(${esc((st.anim.argVals || []).join(", "))})</div>`;
      else if (st.anim.type === "checkpoint") animDesc = `<div class="anim-desc" style="color:var(--cyan)">${esc(fileTag)}checkpoint · ${esc(st.anim.argVals && st.anim.argVals[0] ? st.anim.argVals[0] : "检查点已命中")}</div>`;
    }
    consoleEl.innerHTML = '<div><span class="p">›</span>' + (fileTag ? '<span class="dim">[' + esc(st.file || "") + "] </span>" : "") + esc(st.note || "") + "</div>" + animDesc;
    if (st.error) {
      cntEl.textContent = "✗ 运行时报错";
      cntEl.className = "err";
    } else if (st.isCheckpoint) {
      cntEl.textContent = "◉ 命中检查点";
      cntEl.className = "ckpt";
    } else if (appState.DEBUG_SESSION.finished && i === appState.TRACE.steps.length - 1) {
      cntEl.textContent = "✓ 执行完毕";
      cntEl.className = "done";
    } else {
      cntEl.textContent = "● 调试运行中";
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
    stopAuto();
    appState.SELECTED_FRAME_IDX = null;
    if (document.body && document.body.classList) document.body.classList.remove("editing-code");
    if (isEditorFocused()) blurEditor();
    if (!appState.DEBUG_SESSION.active) {
      if (!startDebug(0)) return;
      const firstSt = appState.TRACE.steps[0];
      if (firstSt && (firstSt.isCheckpoint || firstSt.error || appState.DEBUG_SESSION.finished)) {
        if (firstSt.isCheckpoint) {
          say("◉ 已到达检查点 [第 " + firstSt.line + " 行] · " + (firstSt.note || ""), "ok");
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
      say("◉ 已运行到检查点 [第 " + finalSt.line + " 行] · " + (finalSt.note || ""), "ok");
    } else if (appState.DEBUG_SESSION.finished) {
      say("✓ 已运行至程序结束（后续无更多检查点）  →  " + safeJSONStringify(appState.DEBUG_SESSION.returnValue), "ok");
    }
  }
  function rebuildDebugAtPosition(newTargetLine, targetVisits, fallbackStepIdx) {
    const src = editor.value.replace(/\r/g, "");
    const unsupported = detectUnsupportedSyntax(src);
    if (unsupported.length) {
      unsupported.forEach((x) => say("✗ 第 " + x.line + " 行：暂不支持 " + x.feature + " —— " + x.hint, "err", x.line));
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
      say("✗ 第 " + enums.error.line + " 行：" + enums.error.message, "err", enums.error.line);
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
      say("✗ 编译失败: " + (e instanceof Error && e.message ? e.message : e), "err");
      return false;
    }
    stopAuto();
    clearFlyLayer();
    const prevWatched = new Set(appState.watched);
    appState.TRACE = {
      title: "TypeScript Playground · Debug",
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
    const isCkptStmt = (s) => /^(?:checkpoint|断点)\s*\([\s\S]*\)\s*;?$/.test(s.trim());
    let removeIdx = -1;
    if (isCkptStmt(refTrim)) {
      removeIdx = targetIdx;
    } else if (refTrim.endsWith("{") && targetIdx + 1 < lines.length && isCkptStmt(lines[targetIdx + 1] || "")) {
      removeIdx = targetIdx + 1;
    }
    if (removeIdx >= 0) {
      const removedLine = removeIdx + 1;
      lines.splice(removeIdx, 1);
      editor.value = lines.join("\n");
      syncActiveScriptTabSource(editor.value);
      if (staleTimer) clearTimeout(staleTimer);
      if (wasActive) {
        if (appState.TRACE.moduleSources && Object.keys(appState.TRACE.moduleSources).length > 1) {
          startDebug(Math.max(0, prevCurIdx - 1));
        } else {
          const newTargetLine = origCurLine > removedLine ? origCurLine - 1 : origCurLine === removedLine ? -1 : origCurLine;
          rebuildDebugAtPosition(newTargetLine, origLineVisits, Math.max(0, prevCurIdx - 1));
        }
      } else {
        startDebug(0);
      }
      const keepLine = Math.max(1, Math.min(lines.length, Math.min(removedLine, lines.length)));
      appState.lastEditorCursorLine = keepLine;
      scrollCodeTo(keepLine);
      say("· 已移除第 " + removedLine + " 行的 checkpoint() 检查点函数 (Alt+C)", "dim");
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
    syncActiveScriptTabSource(editor.value);
    appState.lastEditorCursorLine = insertedLineNum;
    if (staleTimer) clearTimeout(staleTimer);
    if (wasActive) {
      if (appState.TRACE.moduleSources && Object.keys(appState.TRACE.moduleSources).length > 1) {
        startDebug(prevCurIdx);
      } else {
        const newTargetLine = origCurLine >= insertedLineNum ? origCurLine + 1 : origCurLine;
        rebuildDebugAtPosition(newTargetLine, origLineVisits, prevCurIdx);
      }
    } else {
      startDebug(0);
    }
    scrollCodeTo(insertedLineNum);
    say("✓ 已在第 " + insertedLineNum + " 行添加检查点函数 checkpoint()（可按 Alt+C 随时增删该行检查点）", "ok");
  }
  function go(i) {
    if (i > appState.cur) stepNext();
    else if (i < appState.cur) stepPrev();
  }
  function stopAuto() {
    if (appState.timer) {
      clearInterval(appState.timer);
      appState.timer = null;
      $("auto").textContent = "▶ 自动";
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
    $("auto").textContent = "⏸ 暂停";
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
      videoSpeedBadge.textContent = num + "x · 60fps";
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
    return cleaned || "playground.ts";
  }
  function exportFileName() {
    const name = appState.FILE_NAME || "playground.ts";
    return /\.[A-Za-z0-9]{1,12}$/.test(name) ? name : name + ".ts";
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
    setFileName(name || "imported.ts");
    if (typeof globalThis.syncActiveScriptTabSource === "function") {
      try {
        globalThis.syncActiveScriptTabSource(src);
      } catch (_) {
      }
    }
    appState.lastEditorCursorLine = -1;
    resetTraceState();
    updateEditorChrome();
    clearLog("✓ 已导入 " + appState.FILE_NAME + " · " + src.split("\n").length + " 行 · 点「🐞 Debug 调试」或「▶ 运行」开始");
  }
  if (btnImportEl && fileInputEl) {
    if (!$("importMenuWrap")) {
      btnImportEl.onclick = () => fileInputEl.click();
    }
    fileInputEl.addEventListener("change", () => {
      const file = fileInputEl.files && fileInputEl.files[0];
      fileInputEl.value = "";
      if (!file) return;
      const read = typeof file.text === "function" ? file.text() : Promise.reject(new Error("当前浏览器不支持读取该文件"));
      Promise.resolve(read).then((text) => loadImportedSource(text, file.name)).catch((e) => say("✗ 导入失败: " + (e && e.message ? e.message : e), "err"));
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
        say("✓ 已导出文件 " + name + "（" + editor.value.split("\n").length + " 行）", "ok");
      } catch (e) {
        say("✗ 导出失败: " + (e instanceof Error && e.message ? e.message : e), "err");
      }
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
      const indent = "  ";
      editor.value = editor.value.slice(0, s) + indent + editor.value.slice(t);
      editor.selectionStart = editor.selectionEnd = s + indent.length;
      onSourceChanged();
    }
    if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.key.toLowerCase() === "c") {
      e.preventDefault();
      recordEditorCursorLine();
      addCheckpointFunction(appState.lastEditorCursorLine);
      return;
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
    hideHoverTip();
    updateEditorChrome();
    if (appState.TRACE.steps.length || appState.DEBUG_SESSION.active) {
      if (staleTimer) clearTimeout(staleTimer);
      staleTimer = setTimeout(() => {
        resetTraceState();
        clearLog("源码已修改，当前调试会话已重置 · 可点击「🐞 Debug 调试」或左下「运行到下一个检查点」重新开始");
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
    const re = /(\/\/.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b(function|const|let|var|new|class|extends|typeof|instanceof|import|export|from|async|await|interface|type|as|satisfies)\b|\b(for|if|else|return|while|do|switch|case|break|continue|try|catch|finally|throw|yield)\b|\b(number|string|boolean|void|any|unknown|never|Math|Map|Set|Array|Object|JSON|Number|String|Boolean|Promise|Record|Error)\b|\b(true|false|null|undefined|\d+(?:\.\d+)?)\b|(\b[A-Za-z_$][\w$]*)(?=\s*\()|(?<=\.)([A-Za-z_$][\w$]*)\b|(\b[A-Za-z_$][\w$]*)\b|(===|!==|>=|<=|=>|&&|\|\||\+\+|--)/g;
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
        const pairTxt = `${e.k} → ${e.v}`;
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
          const vStr = String(d.cells[r]?.[c] ?? "·");
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
    const isMultiModule = Boolean(
      appState.TRACE.moduleSources && Object.keys(appState.TRACE.moduleSources).length > 1
    );
    const stepModuleLines = st && st.file && appState.TRACE.moduleSources ? appState.TRACE.moduleSources[st.file] : void 0;
    const codeLines = stepModuleLines && stepModuleLines.length ? stepModuleLines : appState.TRACE.code && appState.TRACE.code.length ? appState.TRACE.code : editor.value.replace(/\r/g, "").split("\n");
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
    ctx.fillText("TypeScript Playground · Debug Trace", 24, 35);
    const badgeText = `${speedMult}x Speed · 1920×1080 · 60fps`;
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
    const sourceHeaderLabel = isMultiModule && st && st.file ? `SOURCE · ${st.file}` : "SOURCE";
    ctx.fillText(sourceHeaderLabel, 22, mainTop + 26);
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
      const hudText = st.error ? `✗ RUNTIME ERROR: ${st.error}` : st.note || "";
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
    const stackChainTxt = stackFrames.map((f) => {
      const shortFile = f.file ? f.file.split("/").pop() || f.file : "";
      return isMultiModule && shortFile && !String(f.label || "").startsWith("<module:") ? `[${shortFile}] ${f.label}` : String(f.label || "global");
    }).join(" ▸ ");
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
      const rawVal = v[k];
      const isFn = typeof rawVal === "function";
      const valStr = isFn ? formatFunctionTypeSignature(k, rawVal) : String(rawVal);
      const changed = prevSt && (isFn ? typeof prevV[k] !== "function" : prevV[k] !== rawVal);
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
    ctx.fillText("WATCH · 数据结构可视化", sideX + 20, watchHeaderY);
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
    ctx.fillText("›", sideX + 20, consoleTop + 30);
    ctx.fillStyle = st && st.error ? "#f87171" : "#cbd5e1";
    ctx.fillText(String(st && st.note || "").slice(0, 76), sideX + 36, consoleTop + 30);
    ctx.fillStyle = "#0a0e14";
    ctx.fillRect(0, mainBottom, W, 56);
    ctx.strokeStyle = "#1d232e";
    ctx.beginPath();
    ctx.moveTo(0, mainBottom);
    ctx.lineTo(W, mainBottom);
    ctx.stroke();
    let statusLabel = "● 调试运行中";
    let statusColor = "#4ade80";
    if (st && st.error) {
      statusLabel = "✗ 运行时报错";
      statusColor = "#f87171";
    } else if (st && st.isCheckpoint) {
      statusLabel = "◉ 命中检查点";
      statusColor = "#38bdf8";
    } else if (appState.DEBUG_SESSION.finished && stepIdx === appState.TRACE.steps.length - 1) {
      statusLabel = "✓ 执行完毕";
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
    ctx.fillText(`TypeScript Playground · 1920×1080 60fps 视频导出 (${speedMult}x 倍速)`, 184, mainBottom + 33);
  }
  function loadSample(key) {
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
    clearLog("已加载样例 · 自动开启 Debug 调试模式（可按 ← / → 逐步当场计算，或点击左下「运行到下一个检查点」）");
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
      let hasSaved = false;
      if (!hasUrlChoice && typeof localStorage !== "undefined") {
        try {
          hasSaved = Boolean(localStorage.getItem("ts-playground-session-v1"));
        } catch (_) {
        }
      }
      if (hash.startsWith("#s=") || hasSaved) {
        window.__BOOT_DEFERRED = true;
        editor.value = "";
        clearLog("正在恢复上次会话 / 分享代码…");
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
        videoExportStatus2.textContent = `正在极速编码 1920×1080 60fps (${mult}x) · ${pct}%`;
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
      say("✗ 代码编译未通过，无法导出视频", "err");
      return false;
    }
    while (!appState.DEBUG_SESSION.finished && appState.TRACE.steps.length < MAX_STEPS) {
      if (!computeAndAppendNextStep({ silent: true })) break;
    }
    initWatchedVars();
    if (!appState.TRACE.steps.length) {
      say("✗ 当前代码未产生可录制的调试步骤", "err");
      return false;
    }
    appState.IS_EXPORTING_VIDEO = true;
    if (btnExportVideo2) btnExportVideo2.disabled = true;
    if (btnExportVideoLabel2) btnExportVideoLabel2.textContent = "⏺ 正在极速导出...";
    if (videoExportStatus2) {
      videoExportStatus2.classList.add("active");
      videoExportStatus2.textContent = `准备极速导出 1920×1080 @ ${VIDEO_FPS}fps (${mult}x 倍速)...`;
    }
    say(`🎬 开始极速导出视频：分辨率 ${VIDEO_WIDTH}×${VIDEO_HEIGHT} · ${VIDEO_FPS}fps · 倍速 ${mult}x`, "ok");
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
          videoExportStatus2.textContent = `✓ 已极速导出 (${secTxt2}) ts-playground-1080p-60fps-${mult}x.webm`;
        }
        say(`✓ 视频极速导出完成：ts-playground-1080p-60fps-${mult}x.webm (1920×1080 · 60fps · ${mult}x 倍速 · 精确时长 ${secTxt2})`, "ok");
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
          videoExportStatus2.textContent = `正在合成 1920×1080 60fps (${mult}x) · ${pct}%`;
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
        videoExportStatus2.textContent = `✓ 已导出 (${secTxt}) ts-playground-1080p-60fps-${mult}x.webm`;
      }
      say(`✓ 视频导出完成：ts-playground-1080p-60fps-${mult}x.webm (1920×1080 · 60fps · ${mult}x 倍速 · 时长 ${secTxt})`, "ok");
      return true;
    } catch (err) {
      const msg = err instanceof Error && err.message ? err.message : String(err);
      if (videoExportStatus2) videoExportStatus2.textContent = "✗ 导出失败: " + msg;
      say("✗ 视频导出失败: " + msg, "err");
      return false;
    } finally {
      appState.IS_EXPORTING_VIDEO = false;
      if (btnExportVideo2) btnExportVideo2.disabled = false;
      if (btnExportVideoLabel2) btnExportVideoLabel2.textContent = "🎬 导出视频";
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
    registerVfsStorageAdapter: () => registerVfsStorageAdapter,
    renderVfsTreeUI: () => renderVfsTreeUI,
    resolveWorkspacePath: () => resolveWorkspacePath,
    serializeFsData: () => serializeFsData,
    subscribeVfsStore: () => subscribeVfsStore
  });
  registerVfsStorageAdapter({
    load: () => {
      if (typeof localStorage === "undefined") return null;
      localStorage.removeItem("ts-visual-vfs-v1");
      return localStorage.getItem(VFS_STORAGE_KEY);
    },
    save: (rawJson) => {
      if (typeof localStorage === "undefined") return;
      localStorage.setItem(VFS_STORAGE_KEY, rawJson);
    }
  });
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
      return `<div class="vfs-del-confirm" data-vfs-confirm-box="${esc(node.path)}"><span class="vfs-del-confirm-text">确认删除 ${esc(node.name)}？</span><span class="vfs-del-confirm-actions"><button type="button" class="vfs-confirm-btn danger" data-vfs-confirm-del="${esc(node.path)}">确认</button><button type="button" class="vfs-confirm-btn" data-vfs-cancel-del="${esc(node.path)}">取消</button></span></div>`;
    };
    const renderNode = (node, depth) => {
      const padLeft = 8 + depth * 14;
      const canDel = !node.readonly;
      const delBtnHtml = canDel ? `<span class="vfs-row-actions"><button type="button" class="vfs-del-btn" data-vfs-del="${esc(node.path)}" title="删除">❌</button></span>` : "";
      if (node.type === "folder") {
        const isOpen = VFS_EXPANDED_FOLDERS.has(node.path);
        const kids = childrenOf(node.path);
        return `<div class="vfs-folder-row" data-vfs-folder="${esc(node.path)}" style="padding-left:${padLeft}px" title="单击展开/折叠目录 · 双击重命名目录"><span class="vfs-caret">${isOpen ? "▾" : "▸"}</span><span class="vfs-icon">📁</span><span class="vfs-name">${esc(node.name)}/</span>` + delBtnHtml + `</div>` + buildConfirmHtml(node) + (isOpen ? `<div class="vfs-folder-children">${kids.map((k) => renderNode(k, depth + 1)).join("")}</div>` : "");
      }
      const isAct = Boolean(activePath && node.path === activePath);
      const ext = (node.name.split(".").pop() || "").toLowerCase();
      const icon = ext === "ipynb" ? "📓" : ext === "ts" ? "📘" : ext === "json" ? "🗂" : "📄";
      return `<div class="vfs-file-row${isAct ? " active" : ""}" data-vfs-file="${esc(node.path)}" style="padding-left:${padLeft}px" title="${esc(node.path)}（单击打开 · 双击重命名）"><span class="vfs-icon">${icon}</span><span class="vfs-name">${esc(node.name)}</span>` + delBtnHtml + `</div>` + buildConfirmHtml(node);
    };
    const roots = childrenOf("");
    if (roots.length === 0) {
      treeEl.innerHTML = `<div class="vfs-empty-hint" style="padding:14px 10px;color:#64748b;font-size:11.5px;text-align:center;">空目录</div>`;
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
      footEl.textContent = `${fileCount} 个文件 (${kb} KB)`;
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
      say(`✗ ${err instanceof Error ? err.message : String(err)}`, "err");
      return;
    }
    const node = VFS_NODES.get(path);
    if (!node || node.type !== "file") return;
    if (node.name.endsWith(".ipynb")) {
      uiHooks.openVfsNotebookFile(node.name, node.content);
      return;
    }
    uiHooks.setViewMode("script");
    uiHooks.openVfsScriptFile(node.path, node.name, node.content || "");
    renderVfsTreeUI();
    say(`📂 已打开 ${node.path}`, "ok");
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
        let idx = 1;
        while (VFS_NODES.has(`file_${idx}.ts`)) idx++;
        const name = `file_${idx}.ts`;
        const path = name;
        const content = `// ${name}
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
        say(`📁 已创建文件夹 ${path}/（双击可重命名）`, "ok");
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
          say(`🗑 已从文件目录移除 ${delPath}`, "dim");
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
          say(`✓ 已重命名为 ${nextPath}`, "ok");
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
    SCRIPT_TABS: () => SCRIPT_TABS,
    TS_SAMPLE_METADATA: () => TS_SAMPLE_METADATA,
    collectWorkspaceFileMap: () => collectWorkspaceFileMap,
    ensureScriptTabsForLang: () => ensureScriptTabsForLang,
    getActiveScriptTab: () => getActiveScriptTab,
    handleVfsFileDeletedInTabs: () => handleVfsFileDeletedInTabs,
    handleVfsFileRenamedInTabs: () => handleVfsFileRenamedInTabs,
    initScriptTabsAndImportEvents: () => initScriptTabsAndImportEvents,
    isScriptTabSyncing: () => isScriptTabSyncing,
    loadMultiFileSampleProject: () => loadMultiFileSampleProject,
    nextScriptTabId: () => nextScriptTabId,
    onVfsFileDeleted: () => onVfsFileDeleted,
    onVfsFileRenamed: () => onVfsFileRenamed,
    openSampleScriptTab: () => openSampleScriptTab,
    openVfsScriptFile: () => openVfsScriptFile,
    renderImportSampleMenu: () => renderImportSampleMenu,
    renderScriptTabsUI: () => renderScriptTabsUI,
    restoreScriptTabsSession: () => restoreScriptTabsSession,
    serializeScriptTabsSession: () => serializeScriptTabsSession,
    setScriptTabSyncing: () => setScriptTabSyncing,
    switchToScriptFile: () => switchToScriptFile,
    syncActiveScriptTabFromFileName: () => syncActiveScriptTabFromFileName,
    syncActiveScriptTabSource: () => syncActiveScriptTabSource,
    upsertSampleScriptTab: () => upsertSampleScriptTab,
    upsertVfsScriptTab: () => upsertVfsScriptTab
  });
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
    const store = ensureScriptTabsForLang("ts");
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
    if (typeof document !== "undefined" && typeof document.dispatchEvent === "function") {
      try {
        document.dispatchEvent(new Event("ts-session-change"));
      } catch (_) {
      }
    }
    const tabsEl = $("scriptTabsList");
    if (!tabsEl) return;
    const store = ensureScriptTabsForLang("ts");
    const activeTab = getActiveScriptTab("ts");
    const isMultiDebug = Boolean(
      appState.DEBUG_SESSION.active && appState.TRACE.moduleSources && Object.keys(appState.TRACE.moduleSources).length > 1
    );
    tabsEl.innerHTML = store.tabs.map((t) => {
      const isAct = t.id === activeTab.id;
      const normPath = normalizeWorkspaceModulePath(t.vfsPath || t.title);
      const isDebugEntry = isMultiDebug && appState.DEBUG_SESSION.entryFile === normPath;
      const badge = isDebugEntry ? ` <span class="dim" title="当前多文件调试入口模块">▶</span>` : "";
      return `<div class="nb-tab${isAct ? " active" : ""}" role="tab" tabindex="0" aria-selected="${isAct ? "true" : "false"}" data-script-tab-id="${esc(t.id)}" title="单击或按 Enter/Space 切换标签页 · 双击文件名重命名"><span class="nb-tab-icon ts-icon" aria-hidden="true"></span><span class="nb-tab-title">${esc(t.title)}${badge}</span>` + (store.tabs.length > 1 ? `<button type="button" class="nb-tab-close" data-close-script-tab="${esc(t.id)}" title="关闭标签页">×</button>` : "") + `</div>`;
    }).join("") + `<button type="button" class="nb-tab-add" id="scriptBtnNewTab" title="新建代码文件标签页">＋</button>`;
  }
  function renderImportSampleMenu() {
    const listEl = $("importSampleList");
    if (!listEl) return;
    const nbItemHtml = `<button type="button" class="import-sample-item" data-import-sample-notebook="Intro.ipynb"><span class="import-sample-name">📓 Intro.ipynb · 交互式笔记本示例</span><span class="import-sample-path">examples/notebooks/</span></button>`;
    const multiFileItemHtml = `<button type="button" class="import-sample-item" data-import-sample-multifile="bst-project" title="加载包含 bst.ts 与 main.ts 的多模块 TypeScript 工程示例，支持跨文件步进与类型检查"><span class="import-sample-name">📦 多文件模块化工程 · 二叉搜索树 (bst.ts + main.ts)</span><span class="import-sample-path">workspace/bst.ts + main.ts</span></button>`;
    listEl.innerHTML = (appState.VIEW_MODE === "notebook" ? nbItemHtml : multiFileItemHtml) + TS_SAMPLE_METADATA.map(
      (item) => `<button type="button" class="import-sample-item" data-import-sample-key="${esc(item.key)}" title="${esc(item.desc)}"><span class="import-sample-name">${esc(item.label)}</span><span class="import-sample-path">${esc("examples/ts/" + item.key + ".ts")}</span></button>`
    ).join("") + (appState.VIEW_MODE !== "notebook" ? nbItemHtml : "");
  }
  function loadMultiFileSampleProject() {
    ensureVfsInitialized();
    const bstSource = [
      "// 二叉搜索树节点模块 (bst.ts)",
      "export interface BstNode {",
      "  val: number;",
      "  left: BstNode | null;",
      "  right: BstNode | null;",
      "}",
      "",
      "export function createNode(val: number): BstNode {",
      "  return { val, left: null, right: null };",
      "}",
      "",
      "export function insertBst(root: BstNode | null, val: number): BstNode {",
      "  if (root === null) {",
      "    return createNode(val);",
      "  }",
      "  if (val < root.val) {",
      "    root.left = insertBst(root.left, val);",
      "  } else if (val > root.val) {",
      "    root.right = insertBst(root.right, val);",
      "  }",
      "  return root;",
      "}"
    ].join("\n");
    const mainSource = [
      "// 多文件入口模块 (main.ts) —— 导入 ./bst 并跨模块步进调试",
      "import { BstNode, insertBst } from './bst';",
      "",
      "function buildSearchTree(nums: number[]): number {",
      "  let tree: BstNode | null = null;",
      "  for (let i = 0; i < nums.length; i++) {",
      "    const x = nums[i];",
      "    tree = insertBst(tree, x);",
      '    checkpoint(x < 8, "插入左子树节点");',
      "  }",
      "  if (tree !== null) {",
      "    return tree.val;",
      "  }",
      "  return -1;",
      "}",
      "",
      "// 调用：buildSearchTree([8, 4, 12, 2, 6])"
    ].join("\n");
    VFS_NODES.set("bst.ts", {
      path: "bst.ts",
      name: "bst.ts",
      type: "file",
      parentPath: "",
      content: bstSource
    });
    VFS_NODES.set("main.ts", {
      path: "main.ts",
      name: "main.ts",
      type: "file",
      parentPath: "",
      content: mainSource
    });
    persistVfsToClientStorage();
    upsertVfsScriptTab("bst.ts", "bst.ts", bstSource, "ts");
    const mainTab = upsertVfsScriptTab("main.ts", "main.ts", mainSource, "ts");
    setScriptTabSyncing(true);
    if (editor) editor.value = mainTab.source;
    setFileName("main.ts");
    setScriptTabSyncing(false);
    renderScriptTabsUI();
    renderVfsTreeUI();
    uiHooks.setViewMode("script");
    resetTraceState();
    startDebug(0);
  }
  function initScriptTabsAndImportEvents() {
    const importMenuWrap = $("importMenuWrap");
    const btnImport = $("btnImport");
    const btnUploadLocalFile = $("btnUploadLocalFile");
    const btnOpenTsTutorials = $("btnOpenTsTutorials");
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
    if (btnOpenTsTutorials) {
      btnOpenTsTutorials.onclick = (e) => {
        if (e && typeof e.stopPropagation === "function") e.stopPropagation();
        if (importMenuWrap && importMenuWrap.classList) importMenuWrap.classList.remove("open");
        uiHooks.openTutorialModal();
      };
    }
    if (importSampleList && importSampleList.addEventListener) {
      importSampleList.addEventListener("click", (e) => {
        const btn = closestElement(e, ".import-sample-item");
        if (!btn) return;
        if (importMenuWrap && importMenuWrap.classList) importMenuWrap.classList.remove("open");
        const multiFile = btn.getAttribute("data-import-sample-multifile");
        if (multiFile) {
          loadMultiFileSampleProject();
          return;
        }
        const nbFile = btn.getAttribute("data-import-sample-notebook");
        if (nbFile) {
          uiHooks.setViewMode("notebook");
          say(`✓ 已加载内置示例笔记本 ${nbFile}`, "ok");
          return;
        }
        const sampleKey = btn.getAttribute("data-import-sample-key");
        if (sampleKey) {
          if (appState.VIEW_MODE === "notebook") {
            const code = SAMPLES[sampleKey] || "";
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
        const store = ensureScriptTabsForLang("ts");
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
              const nextTab = getActiveScriptTab("ts");
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
          const newTitle = `untitled-${store.tabs.length + 1}.ts`;
          const newTab = {
            id: nextScriptTabId(),
            title: newTitle,
            lang: "ts",
            source: "// 新建 TypeScript 脚本\n",
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
            const nextTab = getActiveScriptTab("ts");
            const normNext = normalizeWorkspaceModulePath(nextTab.vfsPath || nextTab.title);
            const inActiveMultiSession = Boolean(
              appState.DEBUG_SESSION.active && appState.TRACE.moduleSources && Object.keys(appState.TRACE.moduleSources).length > 1 && appState.TRACE.moduleSources[normNext]
            );
            setScriptTabSyncing(true);
            editor.value = nextTab.source;
            setFileName(nextTab.vfsPath || nextTab.title);
            setScriptTabSyncing(false);
            if (inActiveMultiSession) {
              appState.ACTIVE_DEBUG_FILE = normNext;
            } else {
              resetTraceState();
            }
            updateEditorChrome();
            renderScriptTabsUI();
            renderVfsTreeUI();
          }
        }
      });
      scriptTabsEl.addEventListener("keydown", (e) => {
        const target = eventTargetElement(e);
        if (!target || target.classList && (target.classList.contains("nb-tab-close") || target.classList.contains("nb-tab-rename-input"))) return;
        const tabEl = closestElement(target, "[data-script-tab-id]");
        if (!tabEl) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          tabEl.click();
          return;
        }
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          e.preventDefault();
          const allTabs = scriptTabsEl.querySelectorAll ? Array.from(scriptTabsEl.querySelectorAll("[data-script-tab-id]")) : [];
          const curIdx = allTabs.indexOf(tabEl);
          if (curIdx >= 0 && allTabs.length > 1) {
            const nextIdx = (curIdx + (e.key === "ArrowRight" ? 1 : allTabs.length - 1)) % allTabs.length;
            const nextEl = allTabs[nextIdx];
            if (nextEl) {
              nextEl.click();
              const refreshed = scriptTabsEl.querySelectorAll ? scriptTabsEl.querySelectorAll("[data-script-tab-id]")[nextIdx] : null;
              if (refreshed && typeof refreshed.focus === "function") refreshed.focus();
            }
          }
        }
      });
      scriptTabsEl.addEventListener("dblclick", (e) => {
        const tabEl = closestElement(e, "[data-script-tab-id]");
        if (!tabEl) return;
        const tabId = tabEl.getAttribute("data-script-tab-id");
        const store = ensureScriptTabsForLang("ts");
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
            const nextName = /\.[A-Za-z0-9]{1,12}$/.test(rawVal) ? rawVal : rawVal + ".ts";
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
            say(`✓ 文件已重命名为 ${nextName}`, "ok");
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
    if (editor && editor.value) {
      syncActiveScriptTabSource(editor.value);
    }
    const tab = upsertVfsScriptTab(path, name, content, "ts");
    setScriptTabSyncing(true);
    editor.value = tab.source;
    setFileName(tab.vfsPath || tab.title);
    setScriptTabSyncing(false);
    resetTraceState();
    updateEditorChrome();
    renderScriptTabsUI();
  }
  function switchToScriptFile(targetPath) {
    const normPath = normalizeWorkspaceModulePath(targetPath);
    if (!normPath) return;
    const store = ensureScriptTabsForLang("ts");
    const currentActive = getActiveScriptTab("ts");
    const currentNorm = normalizeWorkspaceModulePath(currentActive.vfsPath || currentActive.title);
    if (currentNorm === normPath && normalizeWorkspaceModulePath(appState.FILE_NAME) === normPath) {
      return;
    }
    if (editor && editor.value) {
      syncActiveScriptTabSource(editor.value);
    }
    let targetTab = store.tabs.find(
      (t) => normalizeWorkspaceModulePath(t.vfsPath || t.title) === normPath
    );
    if (!targetTab) {
      ensureVfsInitialized();
      const vfsNode = VFS_NODES.get(normPath);
      if (vfsNode && vfsNode.type === "file") {
        targetTab = upsertVfsScriptTab(normPath, vfsNode.name, vfsNode.content ?? "", "ts");
      }
    }
    if (!targetTab) return;
    store.activeTabId = targetTab.id;
    appState.ACTIVE_DEBUG_FILE = normPath;
    setScriptTabSyncing(true);
    if (editor) editor.value = targetTab.source;
    setFileName(targetTab.vfsPath || targetTab.title);
    setScriptTabSyncing(false);
    renderScriptTabsUI();
    renderVfsTreeUI();
  }
  function collectWorkspaceFileMap() {
    const map = /* @__PURE__ */ new Map();
    ensureVfsInitialized();
    VFS_NODES.forEach((node, path) => {
      if (node.type === "file" && typeof node.content === "string") {
        const norm = normalizeWorkspaceModulePath(path);
        if (norm) map.set(norm, node.content.replace(/\r/g, ""));
      }
    });
    const store = ensureScriptTabsForLang("ts");
    store.tabs.forEach((tab) => {
      const key = normalizeWorkspaceModulePath(tab.vfsPath || tab.title);
      if (key) {
        map.set(key, (tab.source || "").replace(/\r/g, ""));
      }
    });
    return map;
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
    collectWorkspaceFileMap,
    openVfsScriptFile,
    switchToScriptFile,
    onVfsFileDeleted,
    onVfsFileRenamed
  });

  // src/ui/notebook.ts
  var notebook_exports = {};
  __export(notebook_exports, {
    NOTEBOOK_STORAGE_KEY: () => NOTEBOOK_STORAGE_KEY,
    TS_NOTEBOOK_TUTORIALS: () => TS_NOTEBOOK_TUTORIALS,
    buildTsPreambleFromHistory: () => buildTsPreambleFromHistory,
    buildTsTypecheckContext: () => buildTsTypecheckContext,
    closeTutorialModal: () => closeTutorialModal,
    copyNotebookCell: () => copyNotebookCell,
    createDefaultNotebooks: () => createDefaultNotebooks,
    createTutorialNotebookDocument: () => createTutorialNotebookDocument,
    cutNotebookCell: () => cutNotebookCell,
    debugNotebookCell: () => debugNotebookCell,
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
    importAllTutorialNotebooks: () => importAllTutorialNotebooks,
    importNotebookFromJson: () => importNotebookFromJson,
    importSampleIntoNotebook: () => importSampleIntoNotebook,
    importTutorialNotebook: () => importTutorialNotebook,
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
    openTutorialModal: () => openTutorialModal,
    openVfsNotebookFile: () => openVfsNotebookFile,
    parseIpynbJsonToDocument: () => parseIpynbJsonToDocument,
    pasteNotebookCell: () => pasteNotebookCell,
    persistNotebooksToStorage: () => persistNotebooksToStorage,
    registerNotebookStorageAdapter: () => registerNotebookStorageAdapter,
    renderMarkdownHtml: () => renderMarkdownHtml,
    renderNotebookUI: () => renderNotebookUI,
    renderTutorialModalUI: () => renderTutorialModalUI,
    restartNotebookKernel: () => restartNotebookKernel,
    restoreNotebooksFromStorage: () => restoreNotebooksFromStorage,
    runAllNotebookCells: () => runAllNotebookCells,
    runNotebookCell: () => runNotebookCell,
    runTsNotebookCell: () => runTsNotebookCell,
    serializeNotebookToIpynbJson: () => serializeNotebookToIpynbJson,
    serializeTutorialToIpynbJson: () => serializeTutorialToIpynbJson,
    setClipboardCell: () => setClipboardCell,
    setViewMode: () => setViewMode,
    syncNotebookGlobalsToSidePanel: () => syncNotebookGlobalsToSidePanel,
    typecheckNotebookCellTS: () => typecheckNotebookCellTS
  });

  // src/notebook/notebook-model.ts
  var NOTEBOOK_STORAGE_KEY = "ts-visual-notebooks-v1";
  var nbStorageAdapter = null;
  var nbStorageRestored = false;
  function registerNotebookStorageAdapter(adapter) {
    nbStorageAdapter = adapter;
  }
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
  function createDefaultNotebooks(_lang = "ts") {
    const c1Id = nextCellId();
    const c2Id = nextCellId();
    const c3Id = nextCellId();
    const c4Id = nextCellId();
    const c5Id = nextCellId();
    const introCells = [
      {
        id: c1Id,
        type: "markdown",
        source: "### 📓 交互式算法笔记本 (TypeScript Kernel)\n支持**跨单元格共享变量上下文**、内联输出以及针对任意单元格的 **🐞 单步可视化调试**（右侧实时联动 `LOCALS` 与 `WATCH` 数据结构画布）。",
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
        source: "// 跨单元格使用上方定义的变量 a，构建数组并在右侧 WATCH 面板观察\nconst nums: number[] = [a, a + 2, a + 4, 9, 13, 18];\nnums.push(25);\nconsole.log('当前数组:', nums);",
        executionCount: null,
        status: "idle",
        output: null
      },
      {
        id: c5Id,
        type: "code",
        source: "// 点击此单元格右上角 🐞 可基于上方已生成的 nums 单步调试二分查找\nlet l: number = 0, r: number = nums.length - 1;\nconst target: number = 13;\nwhile (l <= r) {\n  const mid: number = (l + r) >> 1;\n  checkpoint(nums[mid] === target, '找到目标值');\n  if (nums[mid] === target) {\n    console.log('找到目标索引:', mid);\n    break;\n  }\n  if (nums[mid] < target) l = mid + 1;\n  else r = mid - 1;\n}",
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
        source: "const x: number = 10;\nconst y: number = 20;\nx + y",
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
        lang: "ts",
        execCounter: 4,
        activeCellId: c2Id,
        debuggingCellId: null,
        cells: introCells,
        executedHistory: [
          { cellId: c2Id, execCount: 3, source: "let a: number = 1;" },
          { cellId: c3Id, execCount: 4, source: "console.log(a);" }
        ],
        lastGlobalVars: { a: 1 },
        lastGlobalDs: {}
      },
      {
        id: "nb_untitled",
        title: "Untitled.ipynb",
        lang: "ts",
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
    ts: { docs: [], activeDocId: "nb_intro" }
  };
  function persistNotebooksToStorage() {
    if (!nbStorageAdapter || !notebooksByLang.ts.docs.length) return;
    try {
      const payload = {
        v: 1,
        activeDocId: notebooksByLang.ts.activeDocId,
        docs: notebooksByLang.ts.docs.map((d) => ({
          id: d.id,
          title: d.title,
          lang: "ts",
          execCounter: d.execCounter,
          activeCellId: d.activeCellId,
          cells: d.cells.map((c) => ({
            id: c.id,
            type: c.type,
            source: c.source,
            executionCount: c.executionCount,
            status: c.status === "running" ? "idle" : c.status,
            output: c.output,
            markdownRendered: Boolean(c.markdownRendered)
          })),
          executedHistory: d.executedHistory,
          lastGlobalVars: d.lastGlobalVars
        }))
      };
      nbStorageAdapter.save(JSON.stringify(payload));
    } catch (_) {
    }
  }
  function restoreNotebooksFromStorage() {
    if (!nbStorageAdapter) return false;
    try {
      const raw = nbStorageAdapter.load();
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (!isRecord(parsed) || !Array.isArray(parsed.docs) || parsed.docs.length === 0) return false;
      const docs = [];
      for (const rawDoc of parsed.docs) {
        if (!isRecord(rawDoc) || typeof rawDoc.title !== "string" || !Array.isArray(rawDoc.cells)) continue;
        const docId = typeof rawDoc.id === "string" && rawDoc.id ? rawDoc.id : nextDocId();
        const docNumM = docId.match(/^nb_(\d+)$/);
        if (docNumM && docNumM[1]) {
          const n = Number(docNumM[1]);
          if (n >= nbDocSeq) nbDocSeq = n + 1;
        }
        const cells = [];
        for (const rc of rawDoc.cells) {
          if (!isRecord(rc) || typeof rc.source !== "string") continue;
          const cid = typeof rc.id === "string" && rc.id ? rc.id : nextCellId();
          const cNumM = cid.match(/^cell_(\d+)_/);
          if (cNumM && cNumM[1]) {
            const cn = Number(cNumM[1]);
            if (cn >= nbCellSeq) nbCellSeq = cn + 1;
          }
          let outVal = null;
          if (isRecord(rc.output)) {
            outVal = {
              logs: Array.isArray(rc.output.logs) ? rc.output.logs.map(String) : [],
              returnValue: typeof rc.output.returnValue === "string" ? rc.output.returnValue : null,
              error: typeof rc.output.error === "string" ? rc.output.error : null,
              errorLine: typeof rc.output.errorLine === "number" ? rc.output.errorLine : void 0,
              elapsedMs: typeof rc.output.elapsedMs === "number" ? rc.output.elapsedMs : void 0
            };
          }
          cells.push({
            id: cid,
            type: rc.type === "markdown" ? "markdown" : "code",
            source: rc.source,
            executionCount: typeof rc.executionCount === "number" ? rc.executionCount : null,
            status: rc.status === "success" || rc.status === "error" ? rc.status : "idle",
            output: outVal,
            markdownRendered: Boolean(rc.markdownRendered)
          });
        }
        if (cells.length === 0) continue;
        const firstCell = cells[0];
        const actCellId = typeof rawDoc.activeCellId === "string" && cells.some((c) => c.id === rawDoc.activeCellId) ? rawDoc.activeCellId : firstCell ? firstCell.id : "";
        const hist = [];
        if (Array.isArray(rawDoc.executedHistory)) {
          for (const h of rawDoc.executedHistory) {
            if (isRecord(h) && typeof h.cellId === "string" && typeof h.source === "string") {
              hist.push({
                cellId: h.cellId,
                execCount: typeof h.execCount === "number" ? h.execCount : 0,
                source: h.source
              });
            }
          }
        }
        docs.push({
          id: docId,
          title: rawDoc.title,
          lang: "ts",
          execCounter: typeof rawDoc.execCounter === "number" ? rawDoc.execCounter : 0,
          activeCellId: actCellId,
          debuggingCellId: null,
          cells,
          executedHistory: hist,
          lastGlobalVars: isRecord(rawDoc.lastGlobalVars) ? rawDoc.lastGlobalVars : {},
          lastGlobalDs: {}
        });
      }
      if (docs.length === 0) return false;
      notebooksByLang.ts.docs = docs;
      const reqActive = typeof parsed.activeDocId === "string" ? parsed.activeDocId : "";
      const activeDoc = docs.find((d) => d.id === reqActive) ?? docs[0];
      if (activeDoc) {
        notebooksByLang.ts.activeDocId = activeDoc.id;
      }
      return true;
    } catch (_) {
      return false;
    }
  }
  function ensureLangNotebooks(_lang = "ts") {
    if (!notebooksByLang.ts.docs.length) {
      if (!nbStorageRestored) {
        nbStorageRestored = true;
        if (restoreNotebooksFromStorage() && notebooksByLang.ts.docs.length > 0) {
          return notebooksByLang.ts;
        }
      }
      const docs = createDefaultNotebooks("ts");
      notebooksByLang.ts.docs = docs;
      notebooksByLang.ts.activeDocId = docs[0].id;
    }
    return notebooksByLang.ts;
  }
  function getActiveNotebook() {
    const store = ensureLangNotebooks("ts");
    let doc = store.docs.find((d) => d.id === store.activeDocId) ?? store.docs[0];
    if (!doc) {
      doc = createDefaultNotebooks("ts")[0];
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
      return '<span class="nb-md-empty">双击此处输入 Markdown 笔记内容…</span>';
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
          display_name: "TypeScript (Playground Visual)",
          language: "typescript",
          name: "ts"
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
  function parseIpynbJsonToDocument(jsonText, fileName, lang = "ts") {
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
  var TS_NOTEBOOK_TUTORIALS = [
    {
      id: "ts-adv-01-interfaces-structural",
      codeBadge: "01",
      fileName: "01-Interfaces-Structural.ipynb",
      title: "01 · 接口契约与结构化类型系统 (interface / readonly)",
      category: "类型系统进阶",
      level: "进阶 · 核心必学",
      summary: "深入理解 TypeScript 的结构化子类型（Duck Typing）、interface 契约设计、readonly 只读不可变属性与可选字段 ? 的控制流安全收窄。",
      highlights: [
        "interface 结构化契约建模",
        "readonly 只读属性防篡改",
        "可选属性 ? 与默认值收窄",
        "跨单元格对象数组与健康筛查调试"
      ],
      cells: [
        {
          type: "markdown",
          source: "### 🎓 01 · 接口契约与结构化类型系统 (`interface` / `readonly`)\nTypeScript 采用**结构化类型系统（Structural Subtyping）**：只要对象的属性形状满足 `interface` 声明的契约，即被判定为类型兼容。\n- **`readonly` 只读修饰符**：在编译期锁定关键标识字段，防止业务代码意外覆写。\n- **可选属性 `?`**：显式声明可能缺省的配置项，配合条件分支实现安全的类型收窄。"
        },
        {
          type: "code",
          source: '// 1. 定义微服务节点契约：包含 readonly 只读主键与可选 tag 标签\ninterface ServiceNode {\n  readonly id: string;\n  host: string;\n  latencyMs: number;\n  healthy: boolean;\n  tag?: string;\n}\n\nconst cluster: ServiceNode[] = [\n  { id: "gw-01", host: "10.0.1.11", latencyMs: 18, healthy: true, tag: "edge" },\n  { id: "db-01", host: "10.0.2.20", latencyMs: 145, healthy: true, tag: "primary" },\n  { id: "cache-01", host: "10.0.3.15", latencyMs: 6, healthy: false }\n];\n\nconsole.log("已注册集群节点数:", cluster.length);'
        },
        {
          type: "code",
          source: '// 2. 跨单元格复用 ServiceNode 契约，编写带可选属性收窄的格式化函数\nfunction formatNodeBadge(node: ServiceNode): string {\n  const role: string = node.tag ? node.tag : "general";\n  const state: string = node.healthy ? "UP" : "DOWN";\n  return "[" + state + "] " + node.id + " (" + role + ") - " + node.latencyMs + "ms";\n}\n\nconst badges: string[] = [];\nfor (let i: number = 0; i < cluster.length; i++) {\n  badges.push(formatNodeBadge(cluster[i]));\n}\nconsole.log("集群状态快照:", badges.join(" | "));'
        },
        {
          type: "code",
          source: '// 3. 点击右上角 🐞 单步调试：筛选低延迟健康节点并观察右侧 WATCH 面板\nconst fastHosts: string[] = [];\nlet totalLatency: number = 0;\n\nfor (let i: number = 0; i < cluster.length; i++) {\n  const item: ServiceNode = cluster[i];\n  checkpoint(item.healthy && item.latencyMs < 100, "发现低延迟健康节点");\n  if (item.healthy && item.latencyMs < 100) {\n    fastHosts.push(item.host);\n    totalLatency = totalLatency + item.latencyMs;\n  }\n}\n\nconsole.log("优选低延迟节点:", fastHosts, "总延迟(ms):", totalLatency);'
        }
      ]
    },
    {
      id: "ts-adv-02-enums-unions-narrowing",
      codeBadge: "02",
      fileName: "02-Enums-Unions-Narrowing.ipynb",
      title: "02 · 枚举、联合类型与控制流收窄 (enum / Union)",
      category: "类型收窄与状态机",
      level: "进阶 · 状态建模",
      summary: "掌握 enum 编译期双向映射展开、type 联合类型别名（Union Types）与 typeof 控制流类型收窄，构建零魔术常量的有限状态机。",
      highlights: [
        "enum 双向映射与状态常量",
        "type 联合类型别名 (number | string)",
        "typeof 控制流窄化 (Narrowing)",
        "Map<string, number> 状态桶实时可视化"
      ],
      cells: [
        {
          type: "markdown",
          source: "### 🎓 02 · 枚举、联合类型与控制流收窄 (`enum` / `Union`)\n在复杂状态机与多态输入处理中，避免硬编码魔术数字是高质量 TypeScript 工程的核心：\n- **`enum` 枚举**：编译期提供具名类型约束，运行期自动展开为双向映射字典对象。\n- **联合类型 (`number | string`)**：配合 `typeof` 条件守卫，让编译器在各分支内自动收窄具体类型。"
        },
        {
          type: "code",
          source: '// 1. 定义任务状态枚举与联合类型输入解析函数\nenum JobStatus {\n  Queued = 0,\n  Running = 1,\n  Completed = 2,\n  Failed = 3\n}\n\ntype MetricInput = number | string;\n\nfunction normalizeWeight(raw: MetricInput): number {\n  if (typeof raw === "number") {\n    return raw;\n  }\n  return raw.length * 10;\n}\n\nconst combinedWeight: number = normalizeWeight(60) + normalizeWeight("high");\nconsole.log("收窄计算权重:", combinedWeight, "初始枚举值:", JobStatus.Queued);'
        },
        {
          type: "code",
          source: '// 2. 编写确定性状态转移函数 stepStatus\nfunction stepStatus(cur: JobStatus, ok: boolean): JobStatus {\n  if (cur === JobStatus.Queued) {\n    return JobStatus.Running;\n  }\n  if (cur === JobStatus.Running) {\n    return ok ? JobStatus.Completed : JobStatus.Failed;\n  }\n  return cur;\n}\n\nlet stDemo: JobStatus = JobStatus.Queued;\nstDemo = stepStatus(stDemo, true);\nstDemo = stepStatus(stDemo, true);\nconsole.log("状态流转终点:", stDemo, "名称:", JobStatus[stDemo]);'
        },
        {
          type: "code",
          source: '// 3. 点击右上角 🐞 单步调试：批量驱动状态机并在右侧 WATCH 观察 Map 哈希统计桶\nconst signals: boolean[] = [true, false, true, true, false];\nconst stats = new Map<string, number>();\nstats.set("Completed", 0);\nstats.set("Failed", 0);\n\nfor (let i: number = 0; i < signals.length; i++) {\n  let st: JobStatus = JobStatus.Queued;\n  st = stepStatus(st, true);\n  st = stepStatus(st, signals[i]);\n  const key: string = st === JobStatus.Completed ? "Completed" : "Failed";\n  const prev: number = stats.get(key) || 0;\n  stats.set(key, prev + 1);\n  checkpoint(st === JobStatus.Failed, "检测到失败任务");\n}\n\nconsole.log("成功任务数:", stats.get("Completed"), "失败任务数:", stats.get("Failed"));'
        }
      ]
    },
    {
      id: "ts-adv-03-classes-oop-inheritance",
      codeBadge: "03",
      fileName: "03-Classes-OOP-Inheritance.ipynb",
      title: "03 · 面向对象进阶：访问控制、参数属性与继承 (class / extends)",
      category: "面向对象与内存模型",
      level: "进阶 · OOP 架构",
      summary: "掌握构造函数参数属性语法糖、public / protected / private / readonly 封装边界检查，以及 extends 派生类继承与 super() 协同。",
      highlights: [
        "constructor 参数属性语法糖",
        "private / protected / readonly 封装",
        "extends 继承链与 super() 调用",
        "堆内存实例卡片与引用实时追踪"
      ],
      cells: [
        {
          type: "markdown",
          source: "### 🎓 03 · 面向对象进阶：访问控制、参数属性与继承 (`class` / `extends`)\nTypeScript 扩展了标准类的封装与多态能力：\n- **访问修饰符**：`private`（仅本类可见）、`protected`（本类与子类可见）、`public`（公开）与 `readonly`（只读）。\n- **参数属性**：在 `constructor(public readonly name: string, protected quota: number)` 中一键完成字段声明与赋值。"
        },
        {
          type: "code",
          source: '// 1. 定义带参数属性与访问修饰符的配额限流器基类 RateLimiter\nclass RateLimiter {\n  private used: number = 0;\n\n  constructor(public readonly service: string, protected quota: number) {}\n\n  public acquire(cost: number): boolean {\n    if (this.used + cost > this.quota) {\n      return false;\n    }\n    this.used = this.used + cost;\n    return true;\n  }\n\n  public remaining(): number {\n    return this.quota - this.used;\n  }\n}\n\nconst baseLimiter = new RateLimiter("auth-svc", 10);\nconsole.log("申请 4 单位配额:", baseLimiter.acquire(4), "剩余:", baseLimiter.remaining());'
        },
        {
          type: "code",
          source: '// 2. 通过 extends 继承 RateLimiter，扩展支持突发流量池的 BurstLimiter\nclass BurstLimiter extends RateLimiter {\n  private burstUsed: number = 0;\n\n  constructor(service: string, quota: number, public readonly burstMax: number) {\n    super(service, quota);\n  }\n\n  public requestToken(cost: number): string {\n    if (this.acquire(cost)) {\n      return "NORMAL_OK";\n    }\n    if (this.burstUsed + cost <= this.burstMax) {\n      this.burstUsed = this.burstUsed + cost;\n      return "BURST_OK";\n    }\n    return "REJECTED";\n  }\n}\n\nconst gatewayLimiter = new BurstLimiter("edge-gateway", 10, 5);\nconsole.log("网关限流器初始化完成:", gatewayLimiter.service, "突发上限:", gatewayLimiter.burstMax);'
        },
        {
          type: "code",
          source: '// 3. 点击右上角 🐞 单步调试：模拟流量洪峰并在右侧观察堆实例属性变化\nconst requests: number[] = [4, 5, 4, 3, 2];\nconst verdicts: string[] = [];\n\nfor (let i: number = 0; i < requests.length; i++) {\n  const cost: number = requests[i];\n  const res: string = gatewayLimiter.requestToken(cost);\n  verdicts.push(res);\n  checkpoint(res !== "NORMAL_OK", "触发突发池或限流");\n}\n\nconsole.log("流量裁决序列:", verdicts.join(" -> "));'
        }
      ]
    },
    {
      id: "ts-adv-04-generics-collections",
      codeBadge: "04",
      fileName: "04-Generics-Collections-Trees.ipynb",
      title: "04 · 泛型编程与强类型树/链表可视化 (<T> / Tree / List)",
      category: "泛型与数据结构",
      level: "高阶 · 算法工程",
      summary: "掌握泛型类 class ValueBox<T>、泛型函数与自引用树/链表结构定义，在右侧 WATCH 面板实时联动 SVG 二叉树与链表视图。",
      highlights: [
        "泛型容器类 class ValueBox<T>",
        "泛型函数 <T> 类型参数推导",
        "SVG 二叉树与链表自动识别渲染",
        "单步追踪树结构与栈轨迹"
      ],
      cells: [
        {
          type: "markdown",
          source: "### 🎓 04 · 泛型编程与强类型数据结构 (`<T>` / `Tree` / `LinkedList`)\n泛型（Generics）将类型参数化，使容器与算法兼具复用性与严格类型校验：\n- **泛型类与泛型函数**：通过 `<T>` 将元素类型绑定到实例与返回值。\n- **树与链表自动可视化**：包含 `val` + `left` / `right` 的对象自动渲染为 **SVG 层次二叉树**；包含 `val` + `next` 的对象自动渲染为 **水平链表**。"
        },
        {
          type: "code",
          source: '// 1. 定义泛型历史记录容器类 ValueBox<T>\nclass ValueBox<T> {\n  history: T[] = [];\n\n  constructor(public current: T) {\n    this.history.push(current);\n  }\n\n  update(nextVal: T): T {\n    this.current = nextVal;\n    this.history.push(nextVal);\n    return this.current;\n  }\n}\n\nconst scoreBox = new ValueBox<number>(100);\nscoreBox.update(180);\nscoreBox.update(260);\nconsole.log("当前泛型盒值:", scoreBox.current, "历史记录:", scoreBox.history);'
        },
        {
          type: "code",
          source: '// 2. 构建强类型二叉树 tree 与单链表 list（运行后右侧 WATCH 自动渲染图形）\nconst list = {\n  val: 10,\n  next: { val: 20, next: { val: 30, next: null } }\n};\n\nconst tree = {\n  val: 50,\n  left: {\n    val: 30,\n    left: { val: 20, left: null, right: null },\n    right: { val: 40, left: null, right: null }\n  },\n  right: {\n    val: 70,\n    left: { val: 60, left: null, right: null },\n    right: { val: 85, left: null, right: null }\n  }\n};\n\nconsole.log("树根:", tree.val, "链表头:", list.val);'
        },
        {
          type: "code",
          source: '// 3. 点击右上角 🐞 单步调试：结合栈与集合统计树特征值\nconst levelValues: number[] = [tree.val, tree.left.val, tree.right.val, tree.left.left.val, tree.right.right.val];\nconst visited = new Set<number>();\nconst stack: number[] = [];\nlet treeSum: number = 0;\n\nfor (let i: number = 0; i < levelValues.length; i++) {\n  const v: number = levelValues[i];\n  visited.add(v);\n  stack.push(v);\n  treeSum = treeSum + v;\n  checkpoint(treeSum > 100, "节点累计和超百");\n}\n\nconsole.log("采样节点累计和:", treeSum, "去重集合大小:", visited.size);'
        }
      ]
    },
    {
      id: "ts-adv-05-async-event-loop",
      codeBadge: "05",
      fileName: "05-Async-Await-EventLoop.ipynb",
      title: "05 · 异步编程、Promise 与确定性事件循环 (async / await)",
      category: "异步并发与调度",
      level: "高阶 · 运行时机制",
      summary: "深入剖析 async / await 协程挂起恢复、Promise.then / queueMicrotask 微任务队列与 setTimeout 宏任务队列的确定性执行时序。",
      highlights: [
        "同步调用栈 vs 微任务 vs 宏任务",
        "async / await 协程挂起与恢复",
        "queueMicrotask 与 Promise.then 优先级",
        "确定性虚拟事件循环单步可视化"
      ],
      cells: [
        {
          type: "markdown",
          source: "### 🎓 05 · 异步编程与确定性事件循环 (`async / await` / `Microtask` / `Macrotask`)\n本引擎内置了**确定性虚拟事件循环沙箱**，无需真实等待定时器即可精确重现标准并发调度规则：\n1. **同步代码（Call Stack）** 最先执行完毕；\n2. **微任务队列（Microtasks）**：如 `Promise.resolve().then(...)`、`queueMicrotask(...)`、`await` 后续代码，在当前宏任务末尾**一次性全部清空**；\n3. **宏任务队列（Macrotasks）**：如 `setTimeout(fn, delay)`，按虚拟时间顺序依次触发。"
        },
        {
          type: "code",
          source: '// 1. 经典面试题实证：同步栈、微任务与宏任务的精确出队顺序\nconst orderLog: string[] = [];\n\norderLog.push("1:sync-start");\n\nsetTimeout(() => {\n  orderLog.push("5:timeout-0ms");\n}, 0);\n\nPromise.resolve("p1").then((tag: string) => {\n  orderLog.push("3:promise-then-" + tag);\n});\n\nqueueMicrotask(() => {\n  orderLog.push("4:queue-microtask");\n});\n\norderLog.push("2:sync-end");\nconsole.log("事件循环实测时序:", orderLog.join(" -> "));'
        },
        {
          type: "code",
          source: '// 2. 定义 async 异步函数，理解 await 前后的同步与微任务切分\nconst traceEvents: string[] = [];\n\nasync function loadRemoteConfig(envName: string): Promise<string> {\n  traceEvents.push("2:enter-async-" + envName);\n  const tag: string = await Promise.resolve("cfg-" + envName);\n  traceEvents.push("4:after-await-" + tag);\n  return tag;\n}\n\ntraceEvents.push("1:before-call");\nloadRemoteConfig("prod");\ntraceEvents.push("3:after-call-sync");\nconsole.log("协程恢复轨迹:", traceEvents.join(" -> "));'
        },
        {
          type: "code",
          source: '// 3. 点击右上角 🐞 单步调试：观察右侧 Event Loop 面板中协程、微任务与定时器的流转\nasync function computeStage(uid: number): Promise<number> {\n  const base: number = await Promise.resolve(uid * 100);\n  return base + 25;\n}\n\nasync function runAsyncPipeline(): Promise<string> {\n  const timeline: string[] = ["1:pipeline-start"];\n\n  setTimeout(() => {\n    timeline.push("5:timer-10ms");\n  }, 10);\n\n  Promise.resolve("fast").then((x: string) => {\n    timeline.push("3:micro-" + x);\n  });\n\n  timeline.push("2:before-await");\n  const quota: number = await computeStage(2);\n  timeline.push("4:after-await-" + quota);\n  checkpoint(quota > 200, "异步流水线恢复");\n  return timeline.join(" -> ");\n}\n\nrunAsyncPipeline()'
        }
      ]
    },
    {
      id: "ts-adv-06-type-diagnostics-lab",
      codeBadge: "06",
      fileName: "06-Type-Diagnostics-DP-Lab.ipynb",
      title: "06 · 静态类型诊断与二维矩阵算法实战 (Type Checker & 2D DP)",
      category: "类型安全与算法可视化",
      level: "实战 · 综合演练",
      summary: "结合内置教育级静态类型检查器体验实时行尾错误徽章诊断，并用严格类型实现双指针滑动窗口与二维矩阵动态规划（2D Matrix 可视化）。",
      highlights: [
        "实时静态类型诊断徽章实验室",
        "一维数组双指针 [l..r] 自动悬挂",
        "二维矩阵 number[][] 网格动态渲染",
        "结合 checkpoint() 逐步推导 DP 转移方程"
      ],
      cells: [
        {
          type: "markdown",
          source: "### 🎓 06 · 静态类型诊断与二维矩阵算法实战 (`Type Checker` + `2D Matrix`)\n本课程展示如何将 **编译期静态类型防御** 与 **运行期算法可视化调试** 结合：\n- **实时类型诊断**：当代码出现类型不匹配时，编辑器行尾会立即提示红色 `✗ TS` 诊断徽章。\n- **双指针与二维网格**：变量名 `l` / `r` 会自动悬挂在一维数组下方；`dp: number[][]` 会自动渲染为二维矩阵表格。"
        },
        {
          type: "code",
          source: '// 1. 静态类型防错实验室（可尝试取消倒数第二行注释，体验行尾实时红色 TS 诊断徽章）\ninterface RiskRule {\n  readonly baseScore: number;\n  multiplier: number;\n}\n\nfunction evaluateRisk(rule: RiskRule, factor: number): number {\n  return rule.baseScore + rule.multiplier * factor;\n}\n\nconst prodRule: RiskRule = { baseScore: 50, multiplier: 9 };\nconst safeScore: number = evaluateRisk(prodRule, 4);\n// 试一试：取消下一行注释将触发静态类型错误（string 不能赋给 number）\n// const brokenScore: number = "type_mismatch";\nconsole.log("风控评估合规得分:", safeScore);'
        },
        {
          type: "code",
          source: '// 2. 点击右上角 🐞 单步调试：观察一维数组下方自动悬挂的 [l, r] 双指针标签\nconst nums: number[] = [4, 9, 2, 11, 6, 8, 5];\nlet l: number = 0;\nlet r: number = nums.length - 1;\nlet windowBest: number = 0;\n\nwhile (l < r) {\n  const pairVal: number = nums[l] + nums[r];\n  if (pairVal > windowBest) {\n    windowBest = pairVal;\n  }\n  checkpoint(pairVal >= 15, "双指针配对和达标");\n  l = l + 1;\n  r = r - 1;\n}\nconsole.log("双指针最大配对和:", windowBest);'
        },
        {
          type: "code",
          source: '// 3. 点击右上角 🐞 单步调试：在右侧 WATCH 面板观察二维矩阵 dp: number[][] 的逐格填充\nconst rows: number = 3;\nconst cols: number = 4;\nconst dp: number[][] = [\n  [1, 1, 1, 1],\n  [1, 0, 0, 0],\n  [1, 0, 0, 0]\n];\n\nfor (let i: number = 1; i < rows; i++) {\n  for (let j: number = 1; j < cols; j++) {\n    dp[i][j] = dp[i - 1][j] + dp[i][j - 1];\n    checkpoint(dp[i][j] >= 6, "网格路径数过半");\n  }\n}\n\nconsole.log("网格右下角不同路径总数:", dp[rows - 1][cols - 1]);'
        }
      ]
    }
  ];
  function createTutorialNotebookDocument(tutorialId) {
    const item = TS_NOTEBOOK_TUTORIALS.find((t) => t.id === tutorialId || t.fileName === tutorialId);
    if (!item) return null;
    const cells = item.cells.map((seed) => ({
      id: nextCellId(),
      type: seed.type,
      source: seed.source,
      executionCount: null,
      status: "idle",
      output: null,
      markdownRendered: seed.type === "markdown"
    }));
    const firstCodeCell = cells.find((c) => c.type === "code") ?? cells[0];
    return {
      id: nextDocId(),
      title: item.fileName,
      lang: "ts",
      execCounter: 0,
      activeCellId: firstCodeCell ? firstCodeCell.id : "",
      debuggingCellId: null,
      cells,
      executedHistory: [],
      lastGlobalVars: {},
      lastGlobalDs: {}
    };
  }
  function serializeTutorialToIpynbJson(tutorialId) {
    const doc = createTutorialNotebookDocument(tutorialId);
    if (!doc) return null;
    return serializeNotebookToIpynbJson(doc);
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
      const js0 = stripTypes(enums.error ? normalized : enums.code).replace(
        /^(\s*)class\s+([A-Za-z_$][\w$]*)\b/gm,
        "$1var $2 = class $2"
      );
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
    const latestByCell = /* @__PURE__ */ new Map();
    for (const item of doc.executedHistory) {
      if (item.cellId === cell.id) continue;
      const src = String(item.source || "").replace(/\r\n?/g, "\n");
      if (src.trim()) {
        if (latestByCell.has(item.cellId)) latestByCell.delete(item.cellId);
        latestByCell.set(item.cellId, src);
      }
    }
    const historyChunks = Array.from(latestByCell.values());
    const preambleTs = historyChunks.join("\n");
    const preambleLines = preambleTs ? preambleTs.split("\n").length : 0;
    const cellSrc = String(cell.source || "").replace(/\r\n?/g, "\n");
    const combinedTs = preambleTs ? preambleTs + "\n" + cellSrc : cellSrc;
    return { preambleTs, preambleLines, combinedTs };
  }
  function typecheckNotebookCellTS(doc, cell) {
    if (cell.type !== "code") return [];
    const rawCell = String(cell.source || "").replace(/\r\n?/g, "\n");
    if (!rawCell.trim()) return [];
    const { preambleLines, combinedTs } = buildTsTypecheckContext(doc, cell);
    const allDiags = typecheckTS(combinedTs, appState.STRICT_TS) || [];
    return allDiags.filter((d) => Boolean(d && typeof d.line === "number" && d.line > preambleLines)).map((d) => ({
      line: d.line - preambleLines,
      code: String(d.code || "TS"),
      message: d.message || "类型错误"
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
      note: doc.execCounter > 0 ? `Notebook 会话上下文 · 已累计执行 ${doc.execCounter} 个单元格` : "Notebook 会话就绪 · 运行任意单元格后在此同步显示全局变量与数据结构",
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
      title: `${doc.title} · Kernel Context`,
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
      doc.execCounter > 0 ? `Notebook [${doc.execCounter}] · 全局上下文` : "Notebook 就绪",
      ""
    );
  }
  function runTsNotebookCell(doc, cell, rawSrc, advanceToNext) {
    const t0 = Date.now();
    const { combinedTs } = buildTsTypecheckContext(doc, cell);
    const cellDiags = typecheckNotebookCellTS(doc, cell);
    if (cellDiags.length > 0) {
      cell.status = "error";
      const errText = cellDiags.map((d) => `${d.code} [第 ${d.line} 行]: ${d.message}`).join("\n");
      cell.output = {
        logs: [],
        returnValue: null,
        error: errText,
        errorLine: cellDiags[0]?.line ?? 1
      };
      say(`✗ [Notebook] TypeScript 严格类型检查未通过 (共 ${cellDiags.length} 处错误)：`, "err");
      cellDiags.forEach((d) => {
        say(`  • ${d.code} [第 ${d.line} 行]: ${d.message}`, "err", d.line);
      });
      uiHooks.renderNotebookUI();
      return false;
    }
    extractTsInterfaceMetadata(combinedTs);
    const { preambleJs, allNames: histNames } = buildTsPreambleFromHistory(doc);
    const { normalized: normCellSrc } = normalizeCellTsForNotebook(rawSrc);
    const enums = transpileEnums(normCellSrc);
    if (enums.error) {
      cell.status = "error";
      cell.output = {
        logs: [],
        returnValue: null,
        error: `第 ${enums.error.line} 行: ${enums.error.message}`,
        errorLine: enums.error.line
      };
      say(`✗ [Notebook] 第 ${enums.error.line} 行: ${enums.error.message}`, "err");
      uiHooks.renderNotebookUI();
      return false;
    }
    const jsCell = stripTypes(enums.code).replace(
      /^(\s*)class\s+([A-Za-z_$][\w$]*)\b/gm,
      "$1var $2 = class $2"
    );
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
    doc.execCounter += 1;
    cell.executionCount = doc.execCounter;
    try {
      let res;
      if (hasAsyncConstructs(combinedTs)) {
        const instrumentedBody = instrument(jsCellBody, rawSrc.split("\n"), combinedNames);
        const asyncEnvHeader = "var checkpoint = function(){}, 断点 = checkpoint;\nvar Promise = (__t && __t.__env && __t.__env.Promise) || globalThis.Promise, setTimeout = (__t && __t.__env && __t.__env.setTimeout) || globalThis.setTimeout, clearTimeout = (__t && __t.__env && __t.__env.clearTimeout) || globalThis.clearTimeout, queueMicrotask = (__t && __t.__env && __t.__env.queueMicrotask) || globalThis.queueMicrotask;\n";
        const asyncFnBody = asyncEnvHeader + preambleJs + "\n;console.EnableRecording();\n" + instrumentedBody + "\n;var __ret = (" + tailExpr + ");\nif (typeof __t === 'function' && __t.__drain) { __ret = __t.__drain(__ret, " + snapExpr + "); }\nreturn { ok: true, value: __ret, vars: (" + snapExpr + ")() };";
        let lastLine = 1;
        const traceStub = function(line) {
          if (line) lastLine = line;
        };
        const evLoop = createVirtualEventLoop(traceStub, () => lastLine);
        traceStub.__env = evLoop.env;
        traceStub.__async = evLoop.runAsyncCoroutine;
        traceStub.__await = (val, fid, line, exprText) => ({
          __isAwait: true,
          value: val,
          fid,
          line,
          expr: exprText
        });
        traceStub.__drain = evLoop.drainEventLoop;
        traceStub.__initGlobal = function(snapFn) {
          evLoop.loop.globalSnapFn = snapFn;
        };
        traceStub.__enter = () => 0;
        traceStub.__leave = () => {
        };
        traceStub.__ckpt = () => {
        };
        traceStub.__fin = () => {
        };
        const fn = new Function("__t", "console", asyncFnBody);
        res = fn(traceStub, customConsole);
      } else {
        const fnBody = "var checkpoint = function(){}, 断点 = checkpoint;\n" + preambleJs + "\n;console.EnableRecording();\n" + jsCellBody + "\n;var __ret = (" + tailExpr + ");\nreturn { ok: true, value: __ret, vars: (" + snapExpr + ")() };";
        const fn = new Function("console", fnBody);
        res = fn(customConsole);
      }
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
      const rvStr = shouldEvalTailExpr && isRecord(res) && res.value !== void 0 ? safeJSONStringify(res.value) : null;
      cell.status = "success";
      cell.output = {
        logs,
        returnValue: rvStr,
        error: null,
        elapsedMs
      };
      doc.executedHistory.push({ cellId: cell.id, execCount: cell.executionCount, source: rawSrc });
      say(
        `✓ [Cell ${cell.executionCount}] 执行完成 (${elapsedMs}ms)` + (logs.length ? ` · 输出: ${logs.join(" | ")}` : "") + (rvStr ? `  →  ${rvStr}` : ""),
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
      say(`✗ [Cell ${cell.executionCount}] 运行时报错: ${msg}`, "err");
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
    return runTsNotebookCell(doc, cell, rawSrc, advanceToNext);
  }
  function debugTsNotebookCell(doc, cell, rawSrc) {
    const { combinedTs } = buildTsTypecheckContext(doc, cell);
    const cellDiags = typecheckNotebookCellTS(doc, cell);
    if (cellDiags.length > 0) {
      cell.status = "error";
      doc.debuggingCellId = null;
      const errText = cellDiags.map((d) => `${d.code} [第 ${d.line} 行]: ${d.message}`).join("\n");
      cell.output = {
        logs: [],
        returnValue: null,
        error: errText,
        errorLine: cellDiags[0]?.line ?? 1
      };
      say(`✗ [Notebook] TypeScript 严格类型检查未通过 (共 ${cellDiags.length} 处错误)：`, "err");
      cellDiags.forEach((d) => {
        say(`  • ${d.code} [第 ${d.line} 行]: ${d.message}`, "err", d.line);
      });
      uiHooks.renderNotebookUI();
      return false;
    }
    extractTsInterfaceMetadata(combinedTs);
    const { preambleJs, allNames: histNames } = buildTsPreambleFromHistory(doc);
    const { normalized: normCellSrc } = normalizeCellTsForNotebook(rawSrc);
    const originalLines = rawSrc.split("\n");
    const enums = transpileEnums(normCellSrc);
    if (enums.error) {
      cell.status = "error";
      cell.output = {
        logs: [],
        returnValue: null,
        error: `第 ${enums.error.line} 行: ${enums.error.message}`,
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
      const asyncEnvHeader = "var Promise = (__t && __t.__env && __t.__env.Promise) || globalThis.Promise, setTimeout = (__t && __t.__env && __t.__env.setTimeout) || globalThis.setTimeout, clearTimeout = (__t && __t.__env && __t.__env.clearTimeout) || globalThis.clearTimeout, queueMicrotask = (__t && __t.__env && __t.__env.queueMicrotask) || globalThis.queueMicrotask;\n";
      const body = asyncEnvHeader + preambleJs + "\n" + instrumentedCellJs + "\n;var __entryVal = (" + expr + ');\nif (typeof __t === "function" && __t.__drain) { __entryVal = __t.__drain(__entryVal, ' + snapStr + '); }\ntry{if(typeof __t==="function"&&__t.__fin)__t.__fin(' + snapStr + ");}catch(_){}\nreturn __entryVal;";
      compiledFn = new Function("__t", "console", body);
    } catch (e) {
      cell.status = "error";
      cell.output = {
        logs: [],
        returnValue: null,
        error: "编译失败: " + (e instanceof Error && e.message ? e.message : String(e))
      };
      uiHooks.renderNotebookUI();
      return false;
    }
    doc.execCounter += 1;
    cell.executionCount = doc.execCounter;
    cell.status = "debugging";
    doc.debuggingCellId = cell.id;
    appState.TRACE = {
      title: `${doc.title} · Cell [${cell.executionCount}]`,
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
    say(`✓ [Cell ${cell.executionCount}] 已开启单步调试 · 可使用底部「下一步 ›」或「⏭ 运行到下一个检查点」逐步推导`, "ok");
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
      say("⚠ 当前单元格为空，请先输入代码后再启动单步调试", "dim");
      return false;
    }
    uiHooks.stopAuto();
    uiHooks.clearFlyLayer();
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
    resetTraceState();
    syncNotebookGlobalsToSidePanel(doc);
    uiHooks.renderNotebookUI();
    if (!silent) {
      say(`↻ 已重启 [${doc.title}] 内核并清空所有跨单元格变量与计数`, "ok");
    }
  }
  async function runAllNotebookCells() {
    const doc = getActiveNotebook();
    await restartNotebookKernel(true);
    say(`⏩ 开始顺序执行 [${doc.title}] 的全部单元格…`, "dim");
    for (const cell of doc.cells) {
      if (cell.type === "markdown") {
        cell.markdownRendered = true;
        continue;
      }
      if (!cell.source.trim()) continue;
      const ok = await runNotebookCell(cell.id, false);
      if (!ok) {
        say(`⚠ 顺序执行在单元格 [${cell.executionCount || " "}] 处因报错中断`, "err");
        break;
      }
    }
    uiHooks.renderNotebookUI();
  }

  // src/ui/notebook.ts
  registerNotebookStorageAdapter({
    load: () => {
      if (typeof localStorage === "undefined") return null;
      try {
        return localStorage.getItem(NOTEBOOK_STORAGE_KEY);
      } catch (_) {
        return null;
      }
    },
    save: (rawJson) => {
      if (typeof localStorage === "undefined") return;
      try {
        localStorage.setItem(NOTEBOOK_STORAGE_KEY, rawJson);
      } catch (_) {
      }
    }
  });
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
    say("✂ 已剪切当前单元格", "dim");
  }
  function copyNotebookCell() {
    const doc = getActiveNotebook();
    const cell = getActiveCell(doc);
    if (!cell) return;
    setClipboardCell({ ...cell, output: null, executionCount: null, status: "idle" });
    say("📋 已复制当前单元格", "dim");
  }
  function pasteNotebookCell() {
    const clip = getClipboardCell();
    if (!clip) {
      say("⚠ 剪贴板中暂无已复制的单元格", "dim");
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
    say("📄 已在下方粘贴单元格", "ok");
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
    say(`💾 已导出笔记本文件 ${a.download}`, "ok");
  }
  function importNotebookFromJson(jsonText, fileName) {
    const newDoc = parseIpynbJsonToDocument(jsonText, fileName, "ts");
    if (!newDoc) return false;
    const store = ensureLangNotebooks("ts");
    store.docs.push(newDoc);
    store.activeDocId = newDoc.id;
    setViewMode("notebook");
    renderNotebookUI();
    say(`✓ 已导入 Jupyter 笔记本 ${newDoc.title}（共 ${newDoc.cells.length} 个单元格）`, "ok");
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
    if (expMenuWrap && expMenuWrap.classList) {
      expMenuWrap.classList.remove("open");
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
      const exportTag = $("fileExportTag");
      if (exportTag) exportTag.textContent = appState.FILE_NAME;
      stopAuto();
      clearFlyLayer();
      renderScriptTabsUI();
    }
    renderVfsTreeUI();
  }
  function renderCellCodeHighlight(cell, isDebuggingThisCell) {
    const doc = getActiveNotebook();
    const lines = cell.source.replace(/\r\n?/g, "\n").split("\n");
    const { combinedTs } = buildTsTypecheckContext(doc, cell);
    const declared = collectDeclaredNames(combinedTs);
    const liveByLine = /* @__PURE__ */ new Map();
    if (cell.type === "code") {
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
      const errBadge = diag ? `<span class="ln-err-badge" title="${esc((diag.code ? diag.code + ": " : "") + (diag.message || ""))}">✗ ${esc(diag.code || "TS")}</span>` : "";
      return `<span class="ln${isCur ? " cur" : ""}${isErr ? " err" : ""}">${(inner || "&nbsp;") + errBadge}</span>`;
    }).join("");
    const gutterHtml = lines.map((t, idx) => {
      const ln = idx + 1;
      const isCur = isDebuggingThisCell && ln === curLine;
      const isErr = liveByLine.has(ln) || cell.status === "error" && cell.output && cell.output.errorLine === ln || Boolean(isCur && st && st.error);
      const hasCkpt = /^\s*(?:checkpoint|断点)\s*\(/.test(t);
      return `<div class="nb-gline${isCur ? " cur" : ""}${isErr ? " err" : ""}${hasCkpt ? " ckpt" : ""}" data-line="${ln}">${ln}</div>`;
    }).join("");
    let stepVizHtml = "";
    if (isDebuggingThisCell && st && (st.anim || st.error) && curLine >= 1 && curLine <= lines.length) {
      stepVizHtml = buildStepVizRow(lines[curLine - 1] || "", st.anim, st.error, true);
    }
    return { hlHtml, gutterHtml, stepVizHtml, stepVizLine: curLine };
  }
  function renderNotebookUI(focusActiveEditor = false) {
    persistNotebooksToStorage();
    const wrap = $("notebookWrap");
    if (!wrap || appState.VIEW_MODE !== "notebook") return;
    const store = ensureLangNotebooks("ts");
    const doc = getActiveNotebook();
    const activeCell = getActiveCell(doc);
    const tabsEl = $("nbTabsList");
    if (tabsEl) {
      tabsEl.innerHTML = store.docs.map((d) => {
        const isAct = d.id === doc.id;
        return `<div class="nb-tab${isAct ? " active" : ""}" role="tab" tabindex="0" aria-selected="${isAct ? "true" : "false"}" data-doc-id="${esc(d.id)}" title="单击或按 Enter/Space 切换 · 双击可重命名笔记本"><span class="nb-tab-icon" aria-hidden="true"></span><span class="nb-tab-title">${esc(d.title)}</span>` + (store.docs.length > 1 ? `<button type="button" class="nb-tab-close" data-close-doc="${esc(d.id)}" title="关闭标签页">×</button>` : "") + `</div>`;
      }).join("") + `<button type="button" class="nb-tab-add" id="nbBtnNewTab" title="新建空白 Notebook 标签页">＋</button>`;
    }
    const exportTag = $("fileExportTag");
    if (exportTag) {
      exportTag.textContent = doc.title.endsWith(".ipynb") ? doc.title : doc.title + ".ipynb";
    }
    const typeSel = $("nbCellType");
    if (typeSel && activeCell) {
      typeSel.value = activeCell.type;
    }
    const kernelBadge = $("nbKernelStatus");
    if (kernelBadge) {
      const isDbg = Boolean(doc.debuggingCellId && appState.DEBUG_SESSION.active);
      const stateTxt = isDbg ? "调试中" : "就绪";
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
        return `<div class="nb-cell nb-cell-md${isFocused ? " active" : ""}" data-cell-id="${esc(cell.id)}"><div class="nb-cell-bar"></div><div class="nb-cell-prompt md-prompt">${isRendered ? "" : "MD"}</div><div class="nb-cell-main"><div class="nb-cell-input md-input"><div class="nb-cell-actions"><button type="button" class="nb-act-btn" data-cell-act="toggle-md" data-cell-id="${esc(cell.id)}" title="${isRendered ? "编辑 Markdown" : "渲染预览 Markdown (Shift+Enter)"}">${isRendered ? "✎" : "✓"}</button><button type="button" class="nb-act-btn" data-cell-act="dup" data-cell-id="${esc(cell.id)}" title="复制并向下克隆单元格">⧉</button><button type="button" class="nb-act-btn" data-cell-act="up" data-cell-id="${esc(cell.id)}" ${idx === 0 ? "disabled" : ""} title="上移单元格">↑</button><button type="button" class="nb-act-btn" data-cell-act="down" data-cell-id="${esc(cell.id)}" ${idx === doc.cells.length - 1 ? "disabled" : ""} title="下移单元格">↓</button><button type="button" class="nb-act-btn" data-cell-act="ins-above" data-cell-id="${esc(cell.id)}" title="在上方插入单元格">⤒</button><button type="button" class="nb-act-btn" data-cell-act="ins-below" data-cell-id="${esc(cell.id)}" title="在下方插入单元格">⤓</button><button type="button" class="nb-act-btn danger" data-cell-act="del" data-cell-id="${esc(cell.id)}" title="删除单元格">🗑</button></div>` + (isRendered ? `<div class="nb-md-preview" data-cell-act="edit-md" data-cell-id="${esc(cell.id)}" title="双击编辑 Markdown">${renderMarkdownHtml(cell.source)}</div>` : `<textarea class="nb-cell-textarea md-textarea" data-cell-id="${esc(cell.id)}" style="height:${mdEditorHeight}px" spellcheck="false" placeholder="# 输入 Markdown 标题或算法推导说明，按 Shift+Enter 渲染预览">${esc(cell.source)}</textarea>`) + `</div></div></div>`;
      }
      const { hlHtml, gutterHtml, stepVizHtml } = renderCellCodeHighlight(cell, isDebugging);
      const out = cell.output;
      let outputHtml = "";
      if (out && (out.logs.length > 0 || out.returnValue != null || out.error)) {
        const logsPart = out.logs.map((l) => `<div class="nb-out-line">${esc(l)}</div>`).join("");
        const retPart = out.returnValue != null ? `<div class="nb-out-ret"><span class="nb-out-prompt">Out[${cell.executionCount || ""}]:</span> <span>${esc(out.returnValue)}</span></div>` : "";
        const errPart = out.error ? `<div class="nb-out-err">✗ ${esc(out.error)}</div>` : "";
        outputHtml = `<div class="nb-cell-output">${logsPart}${retPart}${errPart}</div>`;
      }
      return `<div class="nb-cell nb-cell-code${isFocused ? " active" : ""}${isDebugging ? " debugging" : ""}${cell.status === "error" ? " has-error" : ""}" data-cell-id="${esc(cell.id)}"><div class="nb-cell-bar"></div><div class="nb-cell-prompt" data-cell-act="run" data-cell-id="${esc(cell.id)}" title="点击运行此单元格 (Shift+Enter)">${esc(promptTxt)}</div><div class="nb-cell-main"><div class="nb-cell-input"><div class="nb-cell-gutter">${gutterHtml}</div><div class="nb-cell-code-box" style="height:${editorHeight}px"><pre class="nb-cell-hl" aria-hidden="true">${hlHtml}</pre><textarea class="nb-cell-textarea" data-cell-id="${esc(cell.id)}" style="height:${editorHeight}px" spellcheck="false" autocomplete="off" placeholder="// 输入 TypeScript 代码，Shift+Enter 运行，点右上 🐞 单步调试">${esc(cell.source)}</textarea></div><div class="nb-cell-actions"><button type="button" class="nb-act-btn run-act" data-cell-act="run" data-cell-id="${esc(cell.id)}" title="运行此单元格 (Shift+Enter)">▶</button><button type="button" class="nb-act-btn debug-act${isDebugging ? " active" : ""}" data-cell-act="debug" data-cell-id="${esc(cell.id)}" title="单步可视化调试此单元格 (Ctrl+Shift+Enter)">🐞</button><button type="button" class="nb-act-btn" data-cell-act="dup" data-cell-id="${esc(cell.id)}" title="复制并向下克隆单元格">⧉</button><button type="button" class="nb-act-btn" data-cell-act="up" data-cell-id="${esc(cell.id)}" ${idx === 0 ? "disabled" : ""} title="上移单元格">↑</button><button type="button" class="nb-act-btn" data-cell-act="down" data-cell-id="${esc(cell.id)}" ${idx === doc.cells.length - 1 ? "disabled" : ""} title="下移单元格">↓</button><button type="button" class="nb-act-btn" data-cell-act="ins-above" data-cell-id="${esc(cell.id)}" title="在上方插入单元格">⤒</button><button type="button" class="nb-act-btn" data-cell-act="ins-below" data-cell-id="${esc(cell.id)}" title="在下方插入单元格">⤓</button><button type="button" class="nb-act-btn danger" data-cell-act="del" data-cell-id="${esc(cell.id)}" title="删除单元格">🗑</button></div></div>` + (stepVizHtml ? `<div class="nb-cell-stepviz">${stepVizHtml}</div>` : "") + outputHtml + `</div></div>`;
    }).join("") + `<div class="nb-bottom-add-bar"><button type="button" class="nb-add-chip" id="nbBottomAddCode">＋ 代码单元格 (Code)</button><button type="button" class="nb-add-chip" id="nbBottomAddMd">＋ 文档单元格 (Markdown)</button></div>`;
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
      lines.splice(lineNum - 1, 0, indent + "checkpoint();");
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
      const store = ensureLangNotebooks("ts");
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
          lang: "ts",
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
    tabsEl.addEventListener("keydown", (e) => {
      const target = eventTargetElement(e);
      if (!target || target.classList && (target.classList.contains("nb-tab-close") || target.classList.contains("nb-tab-rename-input"))) return;
      const tab = closestElement(target, ".nb-tab");
      if (!tab || !tab.dataset.docId) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        tab.click();
        return;
      }
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        const allTabs = tabsEl.querySelectorAll ? Array.from(tabsEl.querySelectorAll(".nb-tab[data-doc-id]")) : [];
        const curIdx = allTabs.indexOf(tab);
        if (curIdx >= 0 && allTabs.length > 1) {
          const nextIdx = (curIdx + (e.key === "ArrowRight" ? 1 : allTabs.length - 1)) % allTabs.length;
          const nextEl = allTabs[nextIdx];
          if (nextEl) {
            nextEl.click();
            const refreshed = tabsEl.querySelectorAll ? tabsEl.querySelectorAll(".nb-tab[data-doc-id]")[nextIdx] : null;
            if (refreshed && typeof refreshed.focus === "function") refreshed.focus();
          }
        }
      }
    });
    tabsEl.addEventListener("dblclick", (e) => {
      const tab = closestElement(e, ".nb-tab");
      if (!tab || !tab.dataset.docId) return;
      const store = ensureLangNotebooks("ts");
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
          say(`✓ 笔记本已重命名为 ${targetDoc.title}`, "ok");
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
      persistNotebooksToStorage();
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
        const indent = "  ";
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
      if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.key.toLowerCase() === "c") {
        if (cid) {
          e.preventDefault();
          const pos = ta.selectionStart || 0;
          const curLine = ta.value.slice(0, pos).split("\n").length;
          toggleNotebookCellCheckpoint(cid, curLine);
          return;
        }
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
    initTutorialModalEvents();
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
      say("■ 已退出当前单元格单步调试，恢复显示 Notebook 全局上下文", "dim");
    });
    bindBtn("nbBtnRestart", () => restartNotebookKernel(false));
    bindBtn("nbBtnRunAll", () => runAllNotebookCells());
    bindBtn("nbBtnExportIpynb", () => exportActiveNotebookIpynb());
    const topExportBtn = $("btnExportTs");
    if (topExportBtn) {
      const origExportClick = topExportBtn.onclick;
      topExportBtn.onclick = (ev) => {
        if (appState.VIEW_MODE === "notebook") {
          const expWrap = $("exportMenuWrap");
          if (expWrap && expWrap.classList) expWrap.classList.remove("open");
          exportActiveNotebookIpynb();
          return;
        }
        if (typeof origExportClick === "function") origExportClick.call(topExportBtn, ev);
      };
    }
    initNotebookCellsEvents();
  }
  var selectedTutorialId = TS_NOTEBOOK_TUTORIALS[0]?.id ?? "ts-adv-01-interfaces-structural";
  function ensureTsLanguageActive() {
    appState.LANG = "ts";
  }
  function syncTutorialDocToVfs(doc) {
    ensureVfsInitialized();
    const vfsPath = doc.title;
    VFS_NODES.set(vfsPath, {
      path: vfsPath,
      name: doc.title,
      type: "file",
      parentPath: "",
      content: serializeNotebookToIpynbJson(doc)
    });
    persistVfsToClientStorage();
  }
  function renderTutorialModalUI() {
    const listEl = $("tutorialModalList");
    const detailEl = $("tutorialModalDetail");
    if (!listEl || !detailEl) return;
    const store = ensureLangNotebooks("ts");
    const openedTitles = new Set(store.docs.map((d) => d.title));
    const current = TS_NOTEBOOK_TUTORIALS.find((t) => t.id === selectedTutorialId) ?? TS_NOTEBOOK_TUTORIALS[0];
    if (!current) return;
    selectedTutorialId = current.id;
    listEl.innerHTML = TS_NOTEBOOK_TUTORIALS.map((item) => {
      const isAct = item.id === current.id;
      const isLoaded = openedTitles.has(item.fileName);
      const codeCellCount = item.cells.filter((c) => c.type === "code").length;
      return `<button type="button" class="tutorial-card-item${isAct ? " active" : ""}" data-tutorial-id="${esc(item.id)}" title="单击预览课程大纲 · 双击立即导入并打开"><div class="tutorial-card-top"><span class="tutorial-card-badge">${esc(item.codeBadge)}</span><span class="tutorial-card-cat">${esc(item.category)}</span><span class="tutorial-card-lvl">${esc(item.level)}</span>` + (isLoaded ? `<span class="tutorial-card-loaded">已导入</span>` : "") + `</div><div class="tutorial-card-title">${esc(item.title)}</div><div class="tutorial-card-meta"><span>📓 ${esc(item.fileName)}</span><span>· ${codeCellCount} 个代码格</span></div></button>`;
    }).join("");
    const highlightsHtml = current.highlights.map((h) => `<span class="tutorial-hl-chip">✦ ${esc(h)}</span>`).join("");
    const cellsPreviewHtml = current.cells.map((c, idx) => {
      const isMd = c.type === "markdown";
      const firstLine = (c.source.split("\n")[0] || "").replace(/^#+\s*/, "").trim();
      const lineCount = c.source.split("\n").length;
      return `<div class="tutorial-cell-prev ${isMd ? "md" : "code"}"><div class="tutorial-cell-prev-head"><span class="tutorial-cell-tag">${isMd ? "Markdown 导读" : `Code [${idx}]`}</span><span class="tutorial-cell-lines">${lineCount} 行 · ${esc(firstLine)}</span></div><pre class="tutorial-cell-code">${esc(c.source)}</pre></div>`;
    }).join("");
    const alreadyInWorkspace = openedTitles.has(current.fileName);
    detailEl.innerHTML = `<div class="tutorial-detail-head"><div class="tutorial-detail-tags"><span class="tutorial-tag-cat">${esc(current.category)}</span><span class="tutorial-tag-lvl">${esc(current.level)}</span><span class="tutorial-tag-file">examples/notebooks/${esc(current.fileName)}</span></div><h4 class="tutorial-detail-title">${esc(current.title)}</h4><p class="tutorial-detail-summary">${esc(current.summary)}</p><div class="tutorial-hl-list">${highlightsHtml}</div></div><div class="tutorial-detail-cells-title">课程单元格结构预览（共 ${current.cells.length} 个单元格，含 🐞 单步可视化调试练习）</div><div class="tutorial-detail-cells">${cellsPreviewHtml}</div><div class="tutorial-detail-foot"><button type="button" class="tutorial-btn secondary" data-tutorial-act="import-all" title="将全部 6 门 TypeScript 进阶教学课程一次性导入到 Notebook 标签栏">📚 一键导入全部 6 门课程</button><button type="button" class="tutorial-btn primary" data-tutorial-act="import-one" data-tutorial-id="${esc(current.id)}">` + (alreadyInWorkspace ? "📓 切换到此教学 Notebook" : "📥 导入并打开此教学 Notebook") + `</button></div>`;
  }
  function openTutorialModal() {
    const modal = $("tutorialModal");
    if (!modal) return;
    renderTutorialModalUI();
    modal.hidden = false;
  }
  function closeTutorialModal() {
    const modal = $("tutorialModal");
    if (!modal) return;
    modal.hidden = true;
  }
  function importTutorialNotebook(tutorialId) {
    const item = TS_NOTEBOOK_TUTORIALS.find(
      (t) => t.id === tutorialId || t.fileName === tutorialId
    );
    if (!item) return false;
    ensureTsLanguageActive();
    const store = ensureLangNotebooks("ts");
    let targetDoc = store.docs.find((d) => d.title === item.fileName) ?? null;
    let isNew = false;
    if (!targetDoc) {
      targetDoc = createTutorialNotebookDocument(item.id);
      if (!targetDoc) return false;
      store.docs.push(targetDoc);
      syncTutorialDocToVfs(targetDoc);
      isNew = true;
    }
    store.activeDocId = targetDoc.id;
    selectedTutorialId = item.id;
    closeTutorialModal();
    setViewMode("notebook");
    syncNotebookGlobalsToSidePanel(targetDoc);
    renderNotebookUI();
    renderVfsTreeUI();
    say(
      isNew ? `🎓 已导入并打开 TS 进阶教学《${item.title}》（共 ${targetDoc.cells.length} 个单元格，可按 Shift+Enter 逐格运行或点 🐞 单步调试）` : `🎓 已切换到 TS 进阶教学《${item.title}》`,
      "ok"
    );
    return true;
  }
  function importAllTutorialNotebooks() {
    ensureTsLanguageActive();
    const store = ensureLangNotebooks("ts");
    let importedCount = 0;
    let focusDoc = null;
    for (const item of TS_NOTEBOOK_TUTORIALS) {
      let doc = store.docs.find((d) => d.title === item.fileName) ?? null;
      if (!doc) {
        doc = createTutorialNotebookDocument(item.id);
        if (doc) {
          store.docs.push(doc);
          syncTutorialDocToVfs(doc);
          importedCount++;
        }
      }
      if (doc && item.id === selectedTutorialId) {
        focusDoc = doc;
      }
    }
    const activeDoc = focusDoc ?? store.docs[store.docs.length - 1];
    if (activeDoc) {
      store.activeDocId = activeDoc.id;
    }
    closeTutorialModal();
    setViewMode("notebook");
    if (activeDoc) {
      syncNotebookGlobalsToSidePanel(activeDoc);
    }
    renderNotebookUI();
    renderVfsTreeUI();
    say(
      `🎓 已导入全部 ${TS_NOTEBOOK_TUTORIALS.length} 门 TypeScript 进阶教学 Notebook（新增 ${importedCount} 门），可在上方标签栏自由切换`,
      "ok"
    );
    return importedCount;
  }
  function initTutorialModalEvents() {
    const modal = $("tutorialModal");
    const closeBtn = $("tutorialModalClose");
    const listEl = $("tutorialModalList");
    const detailEl = $("tutorialModalDetail");
    if (closeBtn) {
      closeBtn.onclick = () => closeTutorialModal();
    }
    if (modal && modal.addEventListener) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          closeTutorialModal();
        }
      });
    }
    if (listEl && listEl.addEventListener) {
      listEl.addEventListener("click", (e) => {
        const card = closestElement(e, "[data-tutorial-id]");
        if (!card) return;
        const tid = card.getAttribute("data-tutorial-id");
        if (tid && tid !== selectedTutorialId) {
          selectedTutorialId = tid;
          renderTutorialModalUI();
        }
      });
      listEl.addEventListener("dblclick", (e) => {
        const card = closestElement(e, "[data-tutorial-id]");
        if (!card) return;
        const tid = card.getAttribute("data-tutorial-id");
        if (tid) {
          importTutorialNotebook(tid);
        }
      });
    }
    if (detailEl && detailEl.addEventListener) {
      detailEl.addEventListener("click", (e) => {
        const actBtn = closestElement(e, "[data-tutorial-act]");
        if (!actBtn) return;
        const act = actBtn.getAttribute("data-tutorial-act");
        if (act === "import-one") {
          const tid = actBtn.getAttribute("data-tutorial-id") || selectedTutorialId;
          importTutorialNotebook(tid);
        } else if (act === "import-all") {
          importAllTutorialNotebooks();
        }
      });
    }
  }
  function openVfsNotebookFile(name, content) {
    const store = ensureLangNotebooks("ts");
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
    if (importTutorialNotebook(name)) {
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
    say(`✓ 已将示例 ${sampleKey} 导入到当前 Notebook 新单元格`, "ok");
  }
  registerUiHooks({
    setViewMode,
    openVfsNotebookFile,
    importSampleIntoNotebook,
    openTutorialModal,
    importTutorialNotebook,
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
