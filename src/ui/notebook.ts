/* ================================================================
   Jupyter-Style Interactive Notebook Mode (src/ui/notebook.ts)
   Supports Multi-Tab .ipynb, Code & Markdown Cells, Cross-Cell Context,
   Inline Outputs, and Live Right-Panel LOCALS/WATCH + Single-Cell Step Debug
   ================================================================ */
import type { Diag, NotebookCell, NotebookDocument, StepAnim } from "../types";
import { stripTypes, transpileEnums } from "../compiler/transpile";
import { collectNames, instrument, resolveEntry, blankJsLine, snapFnExpr } from "../compiler/instrumenter";
import { typecheckTS, extractTsInterfaceMetadata } from "../compiler/type-checker";
import { say, safeJSONStringify, resetTraceState, hasAsyncConstructs } from "../runtime/event-loop";
import { computeAndAppendNextStep, initWatchedVars } from "../runtime/runner";
import {
  cloneDeepBounded,
  classifyValue,
  populateInterfaceSchemas,
  renderPicker,
  renderStatic,
} from "../viz/memory-graph";
import { hl, hlActiveLine, collectDeclaredNames, updateEditorChrome } from "../viz/highlight";
import { buildStepVizRow, clearFlyLayer } from "../viz/ast-view";
import { stopAuto, setFileName } from "./controls";
import { SAMPLES } from "../samples/ts-samples";
import { loadSample } from "./share";

let nbClipboardCell: NotebookCell | null = null;
let nbCellSeq = 100;
let nbDocSeq = 10;

function nextCellId(): string {
  return "cell_" + (++nbCellSeq) + "_" + Math.random().toString(36).slice(2, 6);
}

function nextDocId(): string {
  return "nb_" + (++nbDocSeq);
}

/* ── Default Built-In Notebooks (Matches Reference Screenshot & Visual Demo) ── */
function createDefaultNotebooks(lang: "ts" | "python"): [NotebookDocument, ...NotebookDocument[]] {
  const isPy = lang === "python";
  const c1Id = nextCellId();
  const c2Id = nextCellId();
  const c3Id = nextCellId();
  const c4Id = nextCellId();
  const c5Id = nextCellId();

  const introCells: NotebookCell[] = isPy
    ? [
        {
          id: c1Id,
          type: "markdown",
          source:
            "### 📓 交互式算法笔记本 (Python Kernel)\n支持**跨单元格共享变量上下文**、内联输出以及针对任意单元格的 **🐞 单步可视化调试**（右侧实时联动 `LOCALS` 与 `WATCH` 数据结构画布）。",
          executionCount: null,
          status: "idle",
          output: null,
          markdownRendered: true,
        },
        {
          id: c2Id,
          type: "code",
          source: "a = 1",
          executionCount: 3,
          status: "success",
          output: { logs: [], returnValue: null, error: null },
        },
        {
          id: c3Id,
          type: "code",
          source: "print(a)",
          executionCount: 4,
          status: "success",
          output: { logs: ["1"], returnValue: null, error: null },
        },
        {
          id: c4Id,
          type: "code",
          source:
            "# 跨单元格使用上方定义的变量 a，构建数组并在右侧 WATCH 面板观察\nnums = [a, a + 2, a + 4, 9, 13, 18]\nnums.append(25)\nprint(\"当前数组:\", nums)",
          executionCount: null,
          status: "idle",
          output: null,
        },
        {
          id: c5Id,
          type: "code",
          source:
            "# 点击此单元格右上角 🐞 可基于上方已生成的 nums 单步调试二分查找\nl, r = 0, len(nums) - 1\ntarget = 13\nwhile l <= r:\n    mid = (l + r) // 2\n    checkpoint(\"mid\", mid, nums[mid])\n    if nums[mid] == target:\n        print(\"找到目标索引:\", mid)\n        break\n    elif nums[mid] < target:\n        l = mid + 1\n    else:\n        r = mid - 1",
          executionCount: null,
          status: "idle",
          output: null,
        },
      ]
    : [
        {
          id: c1Id,
          type: "markdown",
          source:
            "### 📓 交互式算法笔记本 (TypeScript Kernel)\n支持**跨单元格共享变量上下文**、内联输出以及针对任意单元格的 **🐞 单步可视化调试**（右侧实时联动 `LOCALS` 与 `WATCH` 数据结构画布）。",
          executionCount: null,
          status: "idle",
          output: null,
          markdownRendered: true,
        },
        {
          id: c2Id,
          type: "code",
          source: "let a: number = 1;",
          executionCount: 3,
          status: "success",
          output: { logs: [], returnValue: null, error: null },
        },
        {
          id: c3Id,
          type: "code",
          source: "console.log(a);",
          executionCount: 4,
          status: "success",
          output: { logs: ["1"], returnValue: null, error: null },
        },
        {
          id: c4Id,
          type: "code",
          source:
            "// 跨单元格使用上方定义的变量 a，构建数组并在右侧 WATCH 面板观察\nconst nums: number[] = [a, a + 2, a + 4, 9, 13, 18];\nnums.push(25);\nconsole.log('当前数组:', nums);",
          executionCount: null,
          status: "idle",
          output: null,
        },
        {
          id: c5Id,
          type: "code",
          source:
            "// 点击此单元格右上角 🐞 可基于上方已生成的 nums 单步调试二分查找\nlet l: number = 0, r: number = nums.length - 1;\nconst target: number = 13;\nwhile (l <= r) {\n  const mid: number = (l + r) >> 1;\n  checkpoint(l, mid, r);\n  if (nums[mid] === target) {\n    console.log('找到目标索引:', mid);\n    break;\n  }\n  if (nums[mid] < target) l = mid + 1;\n  else r = mid - 1;\n}",
          executionCount: null,
          status: "idle",
          output: null,
        },
      ];

  const u1Id = nextCellId();
  const u2Id = nextCellId();
  const untitledCells: NotebookCell[] = [
    {
      id: u1Id,
      type: "code",
      source: isPy ? "x = 10\ny = 20\nx + y" : "const x: number = 10;\nconst y: number = 20;\nx + y",
      executionCount: null,
      status: "idle",
      output: null,
    },
    {
      id: u2Id,
      type: "code",
      source: "",
      executionCount: null,
      status: "idle",
      output: null,
    },
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
      executedHistory: isPy
        ? [
            { cellId: c2Id, execCount: 3, source: "a = 1" },
            { cellId: c3Id, execCount: 4, source: "print(a)" },
          ]
        : [
            { cellId: c2Id, execCount: 3, source: "let a: number = 1;" },
            { cellId: c3Id, execCount: 4, source: "console.log(a);" },
          ],
      lastGlobalVars: { a: 1 },
      lastGlobalDs: {},
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
      lastGlobalDs: {},
    },
  ];
}

const notebooksByLang: Record<"ts" | "python", { docs: NotebookDocument[]; activeDocId: string }> = {
  ts: { docs: [], activeDocId: "nb_intro" },
  python: { docs: [], activeDocId: "nb_intro" },
};

function ensureLangNotebooks(lang: "ts" | "python") {
  const key = lang === "python" ? "python" : "ts";
  if (!notebooksByLang[key].docs.length) {
    const docs = createDefaultNotebooks(key);
    notebooksByLang[key].docs = docs;
    notebooksByLang[key].activeDocId = docs[0].id;
  }
  return notebooksByLang[key];
}

export function getActiveNotebook(): NotebookDocument {
  const lang = LANG === "python" ? "python" : "ts";
  const store = ensureLangNotebooks(lang);
  let doc = store.docs.find((d) => d.id === store.activeDocId) ?? store.docs[0];
  if (!doc) {
    doc = createDefaultNotebooks(lang)[0];
    store.docs.push(doc);
  }
  store.activeDocId = doc.id;
  return doc;
}

export function getActiveCell(doc = getActiveNotebook()): NotebookCell | null {
  if (!doc || !doc.cells.length) return null;
  const cell = doc.cells.find((c) => c.id === doc.activeCellId) ?? doc.cells[0];
  if (!cell) return null;
  doc.activeCellId = cell.id;
  return cell;
}

/* ── Markdown Lightweight Renderer ── */
export function renderMarkdownHtml(md: string): string {
  const raw = String(md || "").trim();
  if (!raw) {
    return '<span class="nb-md-empty">双击此处输入 Markdown 笔记内容…</span>';
  }
  const lines = raw.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let inList = false;

  const formatInline = (text: string): string => {
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
    if (hMatch && hMatch[1] && hMatch[2] !== undefined) {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      const lvl = hMatch[1].length;
      out.push(`<h${lvl} class="nb-md-h${lvl}">${formatInline(hMatch[2])}</h${lvl}>`);
      continue;
    }
    const liMatch = line.match(/^\s*[-*]\s+(.+)$/);
    if (liMatch && liMatch[1] !== undefined) {
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

/* ── Normalize Cell TS Code for Re-Declarable Cumulative Execution ── */
function normalizeCellTsForNotebook(src: string): { normalized: string } {
  const lines = String(src || "").replace(/\r\n?/g, "\n").split("\n");
  const transformed = lines.map((line) => {
    const declM = line.match(/^(\s*)(?:export\s+)?(?:const|let)\b(\s+)/);
    if (declM) {
      return declM[1] + "var" + declM[2] + line.slice(declM[0].length);
    }
    return line;
  });
  return {
    normalized: transformed.join("\n"),
  };
}

function buildTsPreambleFromHistory(doc: NotebookDocument, excludeCellId?: string): { preambleJs: string; allNames: string[] } {
  const chunks: string[] = [];
  for (const item of doc.executedHistory) {
    if (excludeCellId && item.cellId === excludeCellId) continue;
    const { normalized } = normalizeCellTsForNotebook(item.source);
    const enums = transpileEnums(normalized);
    const js0 = stripTypes(enums.error ? normalized : enums.code);
    chunks.push(js0);
  }
  const combined = chunks.join("\n");
  const names = new Set<string>(collectNames(combined));
  return {
    preambleJs: combined,
    allNames: [...names],
  };
}

/* ── Build Cumulative TypeScript Source & Run Static Type Checker on Cell ── */
function buildTsTypecheckContext(
  doc: NotebookDocument,
  cell: NotebookCell
): { preambleTs: string; preambleLines: number; combinedTs: string } {
  const historyChunks: string[] = [];
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

export function typecheckNotebookCellTS(
  doc: NotebookDocument,
  cell: NotebookCell
): Array<{ line: number; code: string; message: string }> {
  if (LANG === "python" || cell.type !== "code") return [];
  const rawCell = String(cell.source || "").replace(/\r\n?/g, "\n");
  if (!rawCell.trim()) return [];
  const { preambleLines, combinedTs } = buildTsTypecheckContext(doc, cell);
  const allDiags = typecheckTS(combinedTs, STRICT_TS) || [];
  return allDiags
    .filter((d: Diag) => Boolean(d && typeof d.line === "number" && d.line > preambleLines))
    .map((d: Diag) => ({
      line: d.line - preambleLines,
      code: String(d.code || "TS"),
      message: d.message || "类型错误",
    }));
}

/* ── Sync Notebook Global Context to Right-Hand LOCALS / WATCH Panel ── */
export function syncNotebookGlobalsToSidePanel(doc = getActiveNotebook()) {
  if (!doc) return;
  if (doc.debuggingCellId && DEBUG_SESSION.active && TRACE.steps.length > 0) {
    renderPicker();
    renderStatic(cur, false);
    return;
  }
  const v = doc.lastGlobalVars || {};
  const ds = doc.lastGlobalDs || {};
  const step = {
    line: 1,
    note: doc.execCounter > 0
      ? `Notebook 会话上下文 · 已累计执行 ${doc.execCounter} 个单元格`
      : "Notebook 会话就绪 · 运行任意单元格后在此同步显示全局变量与数据结构",
    v,
    ds,
    callStack: [
      {
        id: 0,
        fn: "notebook",
        label: `Kernel [${doc.execCounter || " "}]`,
        line: 1,
        v,
        ds,
      },
    ],
    anim: null,
    isCheckpoint: false,
    error: null,
  };
  TRACE = {
    title: `${doc.title} · Kernel Context`,
    code: [""],
    steps: [step],
  };
  DEBUG_SESSION = {
    active: false,
    finished: true,
    crashed: false,
    error: null,
    errorLine: -1,
    returnValue: undefined,
    compiledFn: null,
    originalLines: [""],
    callExpr: "undefined",
  };
  cur = 0;
  SELECTED_FRAME_IDX = null;
  initWatchedVars();
  renderPicker();
  renderStatic(0, false);
  if (cntEl) {
    cntEl.textContent = doc.execCounter > 0 ? `Notebook [${doc.execCounter}] · 全局上下文` : "Notebook 就绪";
    cntEl.className = "";
  }
}

/* ── Execute a Single Notebook Cell (▶ Run Cell) ── */
export async function runNotebookCell(cellId?: string, advanceToNext = false): Promise<boolean> {
  const doc = getActiveNotebook();
  const cell = cellId ? doc.cells.find((c) => c.id === cellId) : getActiveCell(doc);
  if (!cell) return false;

  doc.activeCellId = cell.id;
  ACTIVE_NB_CELL_ID = cell.id;

  if (doc.debuggingCellId) {
    doc.debuggingCellId = null;
    stopAuto();
    clearFlyLayer();
  }

  if (cell.type === "markdown") {
    cell.markdownRendered = true;
    cell.status = "idle";
    if (advanceToNext) moveFocusToNextCell(doc, cell.id, true);
    renderNotebookUI();
    return true;
  }

  const rawSrc = cell.source.replace(/\r\n?/g, "\n");
  if (!rawSrc.trim()) {
    cell.executionCount = null;
    cell.status = "idle";
    cell.output = null;
    if (advanceToNext) moveFocusToNextCell(doc, cell.id, true);
    renderNotebookUI();
    return true;
  }

  cell.status = "running";
  renderNotebookUI();

  if (LANG === "python") {
    try {
      const payload = await PY_ENGINE.run(rawSrc, {
        trace: false,
        useNotebookKernel: true,
        timeLimit: 6,
      });
      if (payload.syntaxError) {
        const err = payload.syntaxError;
        const msg = `SyntaxError (第 ${err.line || 1} 行): ${err.msg || "语法错误"}`;
        cell.status = "error";
        cell.output = { logs: [], returnValue: null, error: msg, errorLine: err.line || 1 };
        say(`✗ [${doc.title}] ${msg}`, "err");
        renderNotebookUI();
        return false;
      }
      doc.execCounter += 1;
      cell.executionCount = doc.execCounter;
      const logs = payload.stdout ? String(payload.stdout).replace(/\n$/, "").split("\n") : [];
      const rvHydrated = PY_ENGINE.hydrate(payload.returnValue);
      const hasReturn = rvHydrated !== undefined && rvHydrated !== null && payload.entryExpr;
      const rvStr = hasReturn ? PY_ENGINE.fmtReturn(rvHydrated) : null;

      if (payload.meta) {
        PY_ENGINE.applyMeta(payload.meta);
      }

      const vRaw = PY_ENGINE.hydrateVars(payload.finalVars || {});
      const v = PY_ENGINE.cloneVars(vRaw);
      const ds: Record<string, StepAnim> = {};
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
          errorLine: payload.errorLine || 1,
        };
        say(`✗ [Cell ${cell.executionCount}] 第 ${payload.errorLine || 1} 行报错: ${payload.error}`, "err");
      } else {
        cell.status = "success";
        cell.output = {
          logs,
          returnValue: rvStr,
          error: null,
        };
        doc.executedHistory = doc.executedHistory.filter((h) => h.cellId !== cell.id);
        doc.executedHistory.push({ cellId: cell.id, execCount: cell.executionCount, source: rawSrc });
        say(
          `✓ [Cell ${cell.executionCount}] 执行完成` +
            (logs.length ? ` · 输出: ${logs.join(" | ")}` : "") +
            (rvStr ? `  →  ${rvStr}` : ""),
          "ok"
        );
      }
      syncNotebookGlobalsToSidePanel(doc);
      if (advanceToNext && !payload.error) {
        moveFocusToNextCell(doc, cell.id, true);
      }
      renderNotebookUI();
      return !payload.error;
    } catch (err: unknown) {
      cell.status = "error";
      cell.output = { logs: [], returnValue: null, error: (err instanceof Error && err.message) || String(err) };
      renderNotebookUI();
      return false;
    }
  }

  // TypeScript Mode Execution with Cumulative Session Context & Strict Type Checking
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
      errorLine: cellDiags[0]?.line ?? 1,
    };
    say(`✗ [Notebook] TypeScript 严格类型检查未通过 (共 ${cellDiags.length} 处错误)：`, "err");
    cellDiags.forEach((d) => {
      say(`  • ${d.code} [第 ${d.line} 行]: ${d.message}`, "err", d.line);
    });
    renderNotebookUI();
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
      error: `第 ${enums.error.line} 行: ${enums.error.message}`,
      errorLine: enums.error.line,
    };
    say(`✗ [Notebook] 第 ${enums.error.line} 行: ${enums.error.message}`, "err");
    renderNotebookUI();
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
  const combinedNames = Array.from(new Set([...histNames, ...cellNames]));
  const snapExpr = snapFnExpr(combinedNames);

  const logs: string[] = [];
  let recordLogs = false;
  const fmtNotebookConsoleArgs = (...args: unknown[]): string =>
    args
      .map((x) => {
        if (x instanceof Error) return x.message || String(x);
        try {
          return typeof x === "object" && x !== null ? JSON.stringify(x) : String(x);
        } catch (_) {
          return String(x);
        }
      })
      .join(" ");
  const customConsole = {
    log: (...args: unknown[]) => {
      if (!recordLogs) return;
      logs.push(fmtNotebookConsoleArgs(...args));
    },
    info: (...args: unknown[]) => {
      if (!recordLogs) return;
      logs.push(fmtNotebookConsoleArgs(...args));
    },
    warn: (...args: unknown[]) => {
      if (!recordLogs) return;
      logs.push(fmtNotebookConsoleArgs(...args));
    },
    error: (...args: unknown[]) => {
      if (!recordLogs) return;
      logs.push(fmtNotebookConsoleArgs(...args));
    },
    EnableRecording: () => {
      recordLogs = true;
    },
  };

  const fnBody =
    "var checkpoint = function(){}, 断点 = checkpoint;\n" +
    preambleJs +
    "\n;console.EnableRecording();\n" +
    jsCellBody +
    "\n;var __ret = (" +
    tailExpr +
    ");\n" +
    "return { ok: true, value: __ret, vars: (" +
    snapExpr +
    ")() };";

  doc.execCounter += 1;
  cell.executionCount = doc.execCounter;

  try {
    const fn = new Function("console", fnBody);
    const res = fn(customConsole);
    const elapsedMs = Date.now() - t0;

    const vRaw = (res.vars || {}) as StepAnim;
    const v: StepAnim = {};
    const ds: Record<string, StepAnim> = {};
    Object.keys(vRaw).forEach((k) => {
      const val = vRaw[k];
      v[k] = val !== null && typeof val === "object" ? cloneDeepBounded(val, 2) : val;
      const d = classifyValue(k, val);
      if (d) ds[k] = d;
    });
    populateInterfaceSchemas(ds);
    doc.lastGlobalVars = v;
    doc.lastGlobalDs = ds;

    const rvStr =
      shouldEvalTailExpr && res.value !== undefined ? safeJSONStringify(res.value) : null;

    cell.status = "success";
    cell.output = {
      logs,
      returnValue: rvStr,
      error: null,
      elapsedMs,
    };

    doc.executedHistory = doc.executedHistory.filter((h) => h.cellId !== cell.id);
    doc.executedHistory.push({ cellId: cell.id, execCount: cell.executionCount, source: rawSrc });

    say(
      `✓ [Cell ${cell.executionCount}] 执行完成 (${elapsedMs}ms)` +
        (logs.length ? ` · 输出: ${logs.join(" | ")}` : "") +
        (rvStr ? `  →  ${rvStr}` : ""),
      "ok"
    );
    syncNotebookGlobalsToSidePanel(doc);
    if (advanceToNext) {
      moveFocusToNextCell(doc, cell.id, true);
    }
    renderNotebookUI();
    return true;
  } catch (err: unknown) {
    const msg = err instanceof Error && err.message ? err.message : String(err);
    cell.status = "error";
    cell.output = {
      logs,
      returnValue: null,
      error: msg,
    };
    say(`✗ [Cell ${cell.executionCount}] 运行时报错: ${msg}`, "err");
    renderNotebookUI();
    return false;
  }
}

/* ── Step-by-Step Debug a Single Notebook Cell (🐞 Debug Cell) ── */
export async function debugNotebookCell(cellId?: string): Promise<boolean> {
  const doc = getActiveNotebook();
  const cell = cellId ? doc.cells.find((c) => c.id === cellId) : getActiveCell(doc);
  if (!cell || cell.type !== "code") return false;

  doc.activeCellId = cell.id;
  ACTIVE_NB_CELL_ID = cell.id;

  const rawSrc = cell.source.replace(/\r\n?/g, "\n");
  if (!rawSrc.trim()) {
    say("⚠ 当前单元格为空，请先输入代码后再启动单步调试", "dim");
    return false;
  }

  stopAuto();
  clearFlyLayer();

  if (LANG === "python") {
    cell.status = "debugging";
    doc.debuggingCellId = cell.id;
    renderNotebookUI();
    try {
      say(`… 正在录制单元格 [${cell.executionCount || " "}] 的 Python 单步轨迹…`, "dim");
      const payload = await PY_ENGINE.run(rawSrc, {
        trace: true,
        useNotebookKernel: true,
        maxSteps: 2000,
        timeLimit: 6,
      });
      if (payload.syntaxError) {
        const err = payload.syntaxError;
        cell.status = "error";
        doc.debuggingCellId = null;
        cell.output = {
          logs: [],
          returnValue: null,
          error: `SyntaxError (第 ${err.line || 1} 行): ${err.msg || "语法错误"}`,
          errorLine: err.line || 1,
        };
        renderNotebookUI();
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
      TRACE = { title: `${doc.title} · Cell [${cell.executionCount}]`, code: sourceLines, steps };
      DEBUG_SESSION = {
        active: true,
        finished: true,
        crashed: Boolean(payload.error),
        error: payload.error || null,
        errorLine: payload.errorLine || -1,
        returnValue: payload.__returnValueHydrated,
        compiledFn: null,
        originalLines: sourceLines,
        callExpr: payload.entryExpr || "undefined",
      };

      const vRaw = PY_ENGINE.hydrateVars(payload.finalVars || {});
      const v = PY_ENGINE.cloneVars(vRaw);
      const ds: Record<string, StepAnim> = {};
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
        returnValue:
          payload.__returnValueHydrated !== undefined && payload.__returnValueHydrated !== null && payload.entryExpr
            ? PY_ENGINE.fmtReturn(payload.__returnValueHydrated)
            : null,
        error: payload.error || null,
        errorLine: payload.errorLine || null,
      };

      cur = 0;
      SELECTED_FRAME_IDX = null;
      watched = new Set();
      SEEN_VARS_EVER = new Set();
      layoutSpan = Object.create(null);
      initWatchedVars();
      renderPicker();
      renderStatic(cur, false);
      renderNotebookUI();
      say(`✓ [Cell ${cell.executionCount}] 已进入单步调试模式（共 ${steps.length} 步，可使用底部控制栏逐步观察）`, "ok");
      return true;
    } catch (_err: unknown) {
      cell.status = "error";
      doc.debuggingCellId = null;
      renderNotebookUI();
      return false;
    }
  }

  // TypeScript Single-Cell Step-by-Step Debugger (with cumulative preamble & strict typecheck)
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
      errorLine: cellDiags[0]?.line ?? 1,
    };
    say(`✗ [Notebook] TypeScript 严格类型检查未通过 (共 ${cellDiags.length} 处错误)：`, "err");
    cellDiags.forEach((d) => {
      say(`  • ${d.code} [第 ${d.line} 行]: ${d.message}`, "err", d.line);
    });
    renderNotebookUI();
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
      error: `第 ${enums.error.line} 行: ${enums.error.message}`,
      errorLine: enums.error.line,
    };
    renderNotebookUI();
    return false;
  }

  const js0 = stripTypes(enums.code);
  const entry = resolveEntry(normCellSrc, js0);
  const rawEntryExpr = (entry.expr || "").trim();
  const isConsoleLogCall = /^console\.log\s*\(/.test(rawEntryExpr);
  const isAssignmentExpr = /^[A-Za-z_$][\w$]*\s*=[^=]/.test(rawEntryExpr);
  const shouldEvalTailExpr = Boolean(entry.index >= 0 && rawEntryExpr && !isConsoleLogCall && !isAssignmentExpr);
  const expr = shouldEvalTailExpr ? stripTypes(rawEntryExpr) : "undefined";
  ENTRY_CALL_LINE = entry.line || 1;
  const jsBody = shouldEvalTailExpr ? blankJsLine(js0, entry.index) : js0;

  let compiledFn: Function;
  try {
    const cellNames = collectNames(jsBody);
    const allNames = Array.from(new Set([...histNames, ...cellNames]));
    const instrumentedCellJs = instrument(jsBody, originalLines, allNames);
    const snapStr = snapFnExpr(allNames);
    const body =
      preambleJs +
      "\n" +
      instrumentedCellJs +
      "\n;var __entryVal = (" +
      expr +
      ");\n" +
      'if (typeof __t === "function" && __t.__drain) { __entryVal = __t.__drain(__entryVal, ' +
      snapStr +
      "); }\n" +
      'try{if(typeof __t==="function"&&__t.__fin)__t.__fin(' +
      snapStr +
      ");}catch(_){}\n" +
      "return __entryVal;";
    compiledFn = new Function("__t", "console", body);
  } catch (e: unknown) {
    cell.status = "error";
    cell.output = {
      logs: [],
      returnValue: null,
      error: "编译失败: " + (e instanceof Error && e.message ? e.message : String(e)),
    };
    renderNotebookUI();
    return false;
  }

  doc.execCounter += 1;
  cell.executionCount = doc.execCounter;
  cell.status = "debugging";
  doc.debuggingCellId = cell.id;

  TRACE = {
    title: `${doc.title} · Cell [${cell.executionCount}]`,
    code: originalLines,
    steps: [],
  };
  DEBUG_SESSION = {
    active: true,
    finished: false,
    crashed: false,
    error: null,
    errorLine: -1,
    returnValue: undefined,
    compiledFn,
    originalLines,
    callExpr: expr,
    hasAsync: hasAsyncConstructs(rawSrc),
  };
  cur = 0;
  watched = new Set();
  SEEN_VARS_EVER = new Set();
  layoutSpan = Object.create(null);

  computeAndAppendNextStep({ silent: true });
  cur = Math.max(0, TRACE.steps.length - 1);
  initWatchedVars();
  renderPicker();
  renderStatic(cur, false);
  renderNotebookUI();

  say(`✓ [Cell ${cell.executionCount}] 已开启单步调试 · 可使用底部「下一步 ›」或「⏭ 运行到下一个检查点」逐步推导`, "ok");
  return true;
}

/* ── Run All Cells & Restart Kernel ── */
export async function restartNotebookKernel(silent = false): Promise<void> {
  const doc = getActiveNotebook();
  stopAuto();
  clearFlyLayer();
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
  if (LANG === "python" && typeof PY_ENGINE !== "undefined") {
    try {
      await PY_ENGINE.run("", { resetKernel: true, trace: false });
    } catch (_) {}
  }
  resetTraceState();
  syncNotebookGlobalsToSidePanel(doc);
  renderNotebookUI();
  if (!silent) {
    say(`↻ 已重启 [${doc.title}] 内核并清空所有跨单元格变量与计数`, "ok");
  }
}

export async function runAllNotebookCells(): Promise<void> {
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
  renderNotebookUI();
}

/* ── Cell Manipulation Actions (Insert, Move, Duplicate, Cut/Copy/Paste, Delete) ── */
function moveFocusToNextCell(doc: NotebookDocument, currentCellId: string, createIfLast = false) {
  const idx = doc.cells.findIndex((c) => c.id === currentCellId);
  if (idx < 0) return;
  const nextCell = doc.cells[idx + 1];
  if (nextCell) {
    doc.activeCellId = nextCell.id;
    ACTIVE_NB_CELL_ID = doc.activeCellId;
  } else if (createIfLast) {
    const newCell: NotebookCell = {
      id: nextCellId(),
      type: "code",
      source: "",
      executionCount: null,
      status: "idle",
      output: null,
    };
    doc.cells.push(newCell);
    doc.activeCellId = newCell.id;
    ACTIVE_NB_CELL_ID = newCell.id;
  }
}

export function insertNotebookCell(pos: "above" | "below" = "below", refCellId?: string, type: "code" | "markdown" = "code") {
  const doc = getActiveNotebook();
  const targetId = refCellId || doc.activeCellId;
  const idx = doc.cells.findIndex((c) => c.id === targetId);
  const newCell: NotebookCell = {
    id: nextCellId(),
    type,
    source: "",
    executionCount: null,
    status: "idle",
    output: null,
    markdownRendered: false,
  };
  if (idx < 0) {
    doc.cells.push(newCell);
  } else {
    const insertIdx = pos === "above" ? idx : idx + 1;
    doc.cells.splice(insertIdx, 0, newCell);
  }
  doc.activeCellId = newCell.id;
  ACTIVE_NB_CELL_ID = newCell.id;
  renderNotebookUI(true);
}

export function duplicateNotebookCell(cellId?: string) {
  const doc = getActiveNotebook();
  const targetId = cellId || doc.activeCellId;
  const idx = doc.cells.findIndex((c) => c.id === targetId);
  if (idx < 0) return;
  const orig = doc.cells[idx];
  if (!orig) return;
  const copy: NotebookCell = {
    id: nextCellId(),
    type: orig.type,
    source: orig.source,
    executionCount: null,
    status: "idle",
    output: null,
    markdownRendered: orig.markdownRendered,
  };
  doc.cells.splice(idx + 1, 0, copy);
  doc.activeCellId = copy.id;
  ACTIVE_NB_CELL_ID = copy.id;
  renderNotebookUI(true);
}

export function moveNotebookCell(dir: -1 | 1, cellId?: string) {
  const doc = getActiveNotebook();
  const targetId = cellId || doc.activeCellId;
  const idx = doc.cells.findIndex((c) => c.id === targetId);
  const nextIdx = idx + dir;
  if (idx < 0 || nextIdx < 0 || nextIdx >= doc.cells.length) return;
  const [item] = doc.cells.splice(idx, 1);
  if (!item) return;
  doc.cells.splice(nextIdx, 0, item);
  doc.activeCellId = item.id;
  ACTIVE_NB_CELL_ID = item.id;
  renderNotebookUI();
}

export function deleteNotebookCell(cellId?: string) {
  const doc = getActiveNotebook();
  const targetId = cellId || doc.activeCellId;
  if (doc.cells.length <= 1) {
    const first = doc.cells[0];
    if (first) {
      first.source = "";
      first.executionCount = null;
      first.status = "idle";
      first.output = null;
    }
    renderNotebookUI();
    return;
  }
  const idx = doc.cells.findIndex((c) => c.id === targetId);
  if (idx < 0) return;
  if (doc.debuggingCellId === targetId) {
    doc.debuggingCellId = null;
    resetTraceState();
  }
  doc.cells.splice(idx, 1);
  const nextActive = doc.cells[Math.min(idx, doc.cells.length - 1)];
  if (nextActive) {
    doc.activeCellId = nextActive.id;
    ACTIVE_NB_CELL_ID = nextActive.id;
  }
  renderNotebookUI();
}

export function cutNotebookCell() {
  const doc = getActiveNotebook();
  const cell = getActiveCell(doc);
  if (!cell) return;
  nbClipboardCell = { ...cell, output: null, executionCount: null, status: "idle" };
  deleteNotebookCell(cell.id);
  say("✂ 已剪切当前单元格", "dim");
}

export function copyNotebookCell() {
  const doc = getActiveNotebook();
  const cell = getActiveCell(doc);
  if (!cell) return;
  nbClipboardCell = { ...cell, output: null, executionCount: null, status: "idle" };
  say("📋 已复制当前单元格", "dim");
}

export function pasteNotebookCell() {
  if (!nbClipboardCell) {
    say("⚠ 剪贴板中暂无已复制的单元格", "dim");
    return;
  }
  const doc = getActiveNotebook();
  const idx = doc.cells.findIndex((c) => c.id === doc.activeCellId);
  const pasted: NotebookCell = {
    ...nbClipboardCell,
    id: nextCellId(),
    executionCount: null,
    status: "idle",
    output: null,
  };
  if (idx < 0) doc.cells.push(pasted);
  else doc.cells.splice(idx + 1, 0, pasted);
  doc.activeCellId = pasted.id;
  ACTIVE_NB_CELL_ID = pasted.id;
  renderNotebookUI(true);
  say("📄 已在下方粘贴单元格", "ok");
}

/* ── Export & Import Standard .ipynb JSON ── */
export function exportActiveNotebookIpynb() {
  const doc = getActiveNotebook();
  const ipynb = {
    nbformat: 4,
    nbformat_minor: 5,
    metadata: {
      kernelspec: {
        display_name: doc.lang === "python" ? "Python 3 (Pyodide)" : "TypeScript (Playground Visual)",
        language: doc.lang === "python" ? "python" : "typescript",
        name: doc.lang,
      },
    },
    cells: doc.cells.map((c) => ({
      id: c.id,
      cell_type: c.type === "markdown" ? "markdown" : "code",
      metadata: {},
      source: c.source.split("\n").map((line, i, arr) => (i < arr.length - 1 ? line + "\n" : line)),
      ...(c.type === "code"
        ? {
            execution_count: c.executionCount,
            outputs: c.output
              ? [
                  ...(c.output.logs.length
                    ? [{ output_type: "stream", name: "stdout", text: c.output.logs.map((l) => l + "\n") }]
                    : []),
                  ...(c.output.returnValue != null
                    ? [
                        {
                          output_type: "execute_result",
                          execution_count: c.executionCount,
                          data: { "text/plain": [c.output.returnValue] },
                          metadata: {},
                        },
                      ]
                    : []),
                ]
              : [],
          }
        : {}),
    })),
  };
  const blob = new Blob([JSON.stringify(ipynb, null, 2)], { type: "application/json;charset=utf-8" });
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

export function importNotebookFromJson(jsonText: string, fileName: string): boolean {
  try {
    const data = JSON.parse(jsonText);
    if (!data || !Array.isArray(data.cells)) return false;
    const lang = LANG === "python" ? "python" : "ts";
    const store = ensureLangNotebooks(lang);
    const cells: NotebookCell[] = data.cells.map(
      (rawCell: { cell_type?: string; source?: string[] | string; execution_count?: number | null }) => {
        const type = rawCell.cell_type === "markdown" ? "markdown" : "code";
        const src = Array.isArray(rawCell.source) ? rawCell.source.join("") : String(rawCell.source || "");
        return {
          id: nextCellId(),
          type,
          source: src.replace(/\r\n?/g, "\n"),
          executionCount: typeof rawCell.execution_count === "number" ? rawCell.execution_count : null,
          status: "idle",
          output: null,
          markdownRendered: type === "markdown",
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
        output: null,
      });
    }
    const newDoc: NotebookDocument = {
      id: nextDocId(),
      title: fileName.endsWith(".ipynb") ? fileName : fileName + ".ipynb",
      lang,
      execCounter: 0,
      activeCellId: cells[0]?.id || "",
      debuggingCellId: null,
      cells,
      executedHistory: [],
      lastGlobalVars: {},
      lastGlobalDs: {},
    };
    store.docs.push(newDoc);
    store.activeDocId = newDoc.id;
    setViewMode("notebook");
    renderNotebookUI();
    say(`✓ 已导入 Jupyter 笔记本 ${newDoc.title}（共 ${cells.length} 个单元格）`, "ok");
    return true;
  } catch (_) {
    return false;
  }
}

/* ── Estimate visual height for Markdown textarea including soft-wrapped lines ── */
function estimateMarkdownEditorHeight(src: string): number {
  const lines = String(src || "").replace(/\r\n?/g, "\n").split("\n");
  let visualLines = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    // Count CJK characters as 2 columns and ASCII as 1 column (~68 columns per line in cell editor)
    let cols = 0;
    for (let k = 0; k < line.length; k++) {
      cols += line.charCodeAt(k) > 255 ? 2 : 1;
    }
    visualLines += Math.max(1, Math.ceil(cols / 62));
  }
  return Math.max(92, visualLines * 26 + 28);
}

/* ── Switch View Mode ('script' | 'notebook') ── */
export function setViewMode(mode: "script" | "notebook") {
  const next = mode === "notebook" ? "notebook" : "script";
  VIEW_MODE = next;
  if (document.body && document.body.classList) {
    if (next === "notebook") document.body.classList.add("notebook-mode");
    else document.body.classList.remove("notebook-mode");
  }
  const modeSwitch = $("modeSwitch");
  if (modeSwitch && modeSwitch.querySelectorAll) {
    modeSwitch.querySelectorAll(".mode-tab").forEach((btn: HTMLElement) => {
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
    ACTIVE_NB_CELL_ID = doc.activeCellId;
    syncNotebookGlobalsToSidePanel(doc);
    renderNotebookUI();
  } else {
    stopAuto();
    clearFlyLayer();
    renderScriptTabsUI();
  }
  renderVfsTreeUI();
}

/* ── Render Highlighted Code + Live Type Diagnostics + Optional Debug Step Capsule for a Code Cell ── */
function renderCellCodeHighlight(cell: NotebookCell, isDebuggingThisCell: boolean): { hlHtml: string; gutterHtml: string; stepVizHtml: string; stepVizLine: number } {
  const doc = getActiveNotebook();
  const lines = cell.source.replace(/\r\n?/g, "\n").split("\n");
  const { combinedTs } = LANG === "python" ? { combinedTs: cell.source } : buildTsTypecheckContext(doc, cell);
  const declared = collectDeclaredNames(combinedTs);
  if (LANG === "python" && doc.lastGlobalVars) {
    Object.keys(doc.lastGlobalVars).forEach((k) => declared.add(k));
  }

  const liveByLine = new Map<number, { line: number; code: string; message: string }>();
  if (LANG !== "python" && cell.type === "code") {
    const cellDiags = typecheckNotebookCellTS(doc, cell);
    cellDiags.forEach((d) => {
      if (d && d.line >= 1 && !liveByLine.has(d.line)) {
        liveByLine.set(d.line, d);
      }
    });
  }

  const st = isDebuggingThisCell && TRACE.steps.length ? TRACE.steps[cur] : null;
  const curLine = st ? st.line : -1;

  const hlHtml = lines
    .map((t, idx) => {
      const ln = idx + 1;
      const isCur = isDebuggingThisCell && ln === curLine;
      const diag = liveByLine.get(ln);
      const isErr =
        Boolean(diag) ||
        (cell.status === "error" && cell.output && cell.output.errorLine === ln) ||
        Boolean(isCur && st && st.error);
      const inner = isCur ? hlActiveLine(t, st && st.anim, declared) : hl(t, declared);
      const errBadge = diag
        ? `<span class="ln-err-badge" title="${esc((diag.code ? diag.code + ": " : "") + (diag.message || ""))}">✗ ${esc(diag.code || "TS")}</span>`
        : "";
      return `<span class="ln${isCur ? " cur" : ""}${isErr ? " err" : ""}">${(inner || "&nbsp;") + errBadge}</span>`;
    })
    .join("");

  const gutterHtml = lines
    .map((t, idx) => {
      const ln = idx + 1;
      const isCur = isDebuggingThisCell && ln === curLine;
      const isErr =
        liveByLine.has(ln) ||
        (cell.status === "error" && cell.output && cell.output.errorLine === ln) ||
        Boolean(isCur && st && st.error);
      const hasCkpt = /^\s*(?:checkpoint|断点)\s*\(/.test(t);
      return `<div class="nb-gline${isCur ? " cur" : ""}${isErr ? " err" : ""}${hasCkpt ? " ckpt" : ""}" data-line="${ln}" title="点击在第 ${ln} 行插入/移除 checkpoint()">${ln}</div>`;
    })
    .join("");

  let stepVizHtml = "";
  if (isDebuggingThisCell && st && (st.anim || st.error) && curLine >= 1 && curLine <= lines.length) {
    stepVizHtml = buildStepVizRow(lines[curLine - 1] || "", st.anim, st.error, true);
  }

  return { hlHtml, gutterHtml, stepVizHtml, stepVizLine: curLine };
}

/* ── Main DOM Render for Notebook Mode ── */
export function renderNotebookUI(focusActiveEditor = false) {
  const wrap = $("notebookWrap");
  if (!wrap || VIEW_MODE !== "notebook") return;

  const lang = LANG === "python" ? "python" : "ts";
  const store = ensureLangNotebooks(lang);
  const doc = getActiveNotebook();
  const activeCell = getActiveCell(doc);

  const tabsEl = $("nbTabsList");
  if (tabsEl) {
    tabsEl.innerHTML =
      store.docs
        .map((d) => {
          const isAct = d.id === doc.id;
          return (
            `<div class="nb-tab${isAct ? " active" : ""}" data-doc-id="${esc(d.id)}" title="双击可重命名笔记本">` +
            `<span class="nb-tab-icon" aria-hidden="true"></span>` +
            `<span class="nb-tab-title">${esc(d.title)}</span>` +
            (store.docs.length > 1
              ? `<button type="button" class="nb-tab-close" data-close-doc="${esc(d.id)}" title="关闭标签页">×</button>`
              : "") +
            `</div>`
          );
        })
        .join("") +
      `<button type="button" class="nb-tab-add" id="nbBtnNewTab" title="新建空白 Notebook 标签页">＋</button>`;
  }

  const typeSel = $("nbCellType");
  if (typeSel && activeCell) {
    typeSel.value = activeCell.type;
  }
  const kernelBadge = $("nbKernelStatus");
  if (kernelBadge) {
    const isDbg = Boolean(doc.debuggingCellId && DEBUG_SESSION.active);
    const stateTxt = isDbg ? "调试中" : "就绪";
    kernelBadge.innerHTML =
      `<span class="nb-kernel-dot${isDbg ? " debug" : ""}"></span>` +
      `<span>${stateTxt}</span>`;
  }

  const cellsContainer = $("nbCellsList");
  if (!cellsContainer) return;

  cellsContainer.innerHTML = doc.cells
    .map((cell, idx) => {
      const isFocused = cell.id === doc.activeCellId;
      const isDebugging = doc.debuggingCellId === cell.id && DEBUG_SESSION.active;
      const promptTxt =
        cell.status === "running"
          ? "[*]:"
          : cell.executionCount != null
          ? `[${cell.executionCount}]:`
          : "[ ]:";

      const lineCount = Math.max(1, cell.source.split("\n").length);
      const editorHeight = Math.max(38, lineCount * 24 + 14);
      const mdEditorHeight = estimateMarkdownEditorHeight(cell.source);

      if (cell.type === "markdown") {
        const isRendered = Boolean(cell.markdownRendered);
        return (
          `<div class="nb-cell nb-cell-md${isFocused ? " active" : ""}" data-cell-id="${esc(cell.id)}">` +
          `<div class="nb-cell-bar"></div>` +
          `<div class="nb-cell-prompt md-prompt">${isRendered ? "" : "MD"}</div>` +
          `<div class="nb-cell-main">` +
          `<div class="nb-cell-input md-input">` +
          `<div class="nb-cell-actions">` +
          `<button type="button" class="nb-act-btn" data-cell-act="toggle-md" data-cell-id="${esc(cell.id)}" title="${isRendered ? "编辑 Markdown" : "渲染预览 Markdown (Shift+Enter)"}">${isRendered ? "✎" : "✓"}</button>` +
          `<button type="button" class="nb-act-btn" data-cell-act="dup" data-cell-id="${esc(cell.id)}" title="复制并向下克隆单元格">⧉</button>` +
          `<button type="button" class="nb-act-btn" data-cell-act="up" data-cell-id="${esc(cell.id)}" ${idx === 0 ? "disabled" : ""} title="上移单元格">↑</button>` +
          `<button type="button" class="nb-act-btn" data-cell-act="down" data-cell-id="${esc(cell.id)}" ${idx === doc.cells.length - 1 ? "disabled" : ""} title="下移单元格">↓</button>` +
          `<button type="button" class="nb-act-btn" data-cell-act="ins-above" data-cell-id="${esc(cell.id)}" title="在上方插入单元格">⤒</button>` +
          `<button type="button" class="nb-act-btn" data-cell-act="ins-below" data-cell-id="${esc(cell.id)}" title="在下方插入单元格">⤓</button>` +
          `<button type="button" class="nb-act-btn danger" data-cell-act="del" data-cell-id="${esc(cell.id)}" title="删除单元格">🗑</button>` +
          `</div>` +
          (isRendered
            ? `<div class="nb-md-preview" data-cell-act="edit-md" data-cell-id="${esc(cell.id)}" title="双击编辑 Markdown">${renderMarkdownHtml(cell.source)}</div>`
            : `<textarea class="nb-cell-textarea md-textarea" data-cell-id="${esc(cell.id)}" style="height:${mdEditorHeight}px" spellcheck="false" placeholder="# 输入 Markdown 标题或算法推导说明，按 Shift+Enter 渲染预览">${esc(cell.source)}</textarea>`) +
          `</div>` +
          `</div>` +
          `</div>`
        );
      }

      const { hlHtml, gutterHtml, stepVizHtml } = renderCellCodeHighlight(cell, isDebugging);
      const out = cell.output;
      let outputHtml = "";
      if (out && (out.logs.length > 0 || out.returnValue != null || out.error)) {
        const logsPart = out.logs
          .map((l) => `<div class="nb-out-line">${esc(l)}</div>`)
          .join("");
        const retPart =
          out.returnValue != null
            ? `<div class="nb-out-ret"><span class="nb-out-prompt">Out[${cell.executionCount || ""}]:</span> <span>${esc(out.returnValue)}</span></div>`
            : "";
        const errPart = out.error
          ? `<div class="nb-out-err">✗ ${esc(out.error)}</div>`
          : "";
        outputHtml = `<div class="nb-cell-output">${logsPart}${retPart}${errPart}</div>`;
      }

      return (
        `<div class="nb-cell nb-cell-code${isFocused ? " active" : ""}${isDebugging ? " debugging" : ""}${cell.status === "error" ? " has-error" : ""}" data-cell-id="${esc(cell.id)}">` +
        `<div class="nb-cell-bar"></div>` +
        `<div class="nb-cell-prompt" data-cell-act="run" data-cell-id="${esc(cell.id)}" title="点击运行此单元格 (Shift+Enter)">${esc(promptTxt)}</div>` +
        `<div class="nb-cell-main">` +
        `<div class="nb-cell-input">` +
        `<div class="nb-cell-gutter">${gutterHtml}</div>` +
        `<div class="nb-cell-code-box" style="height:${editorHeight}px">` +
        `<pre class="nb-cell-hl" aria-hidden="true">${hlHtml}</pre>` +
        `<textarea class="nb-cell-textarea" data-cell-id="${esc(cell.id)}" style="height:${editorHeight}px" spellcheck="false" autocomplete="off" placeholder="${lang === "python" ? "# 输入 Python 代码，Shift+Enter 运行，点右上 🐞 单步调试" : "// 输入 TypeScript 代码，Shift+Enter 运行，点右上 🐞 单步调试"}">${esc(cell.source)}</textarea>` +
        `</div>` +
        `<div class="nb-cell-actions">` +
        `<button type="button" class="nb-act-btn run-act" data-cell-act="run" data-cell-id="${esc(cell.id)}" title="运行此单元格 (Shift+Enter)">▶</button>` +
        `<button type="button" class="nb-act-btn debug-act${isDebugging ? " active" : ""}" data-cell-act="debug" data-cell-id="${esc(cell.id)}" title="单步可视化调试此单元格 (Ctrl+Shift+Enter)">🐞</button>` +
        `<button type="button" class="nb-act-btn" data-cell-act="dup" data-cell-id="${esc(cell.id)}" title="复制并向下克隆单元格">⧉</button>` +
        `<button type="button" class="nb-act-btn" data-cell-act="up" data-cell-id="${esc(cell.id)}" ${idx === 0 ? "disabled" : ""} title="上移单元格">↑</button>` +
        `<button type="button" class="nb-act-btn" data-cell-act="down" data-cell-id="${esc(cell.id)}" ${idx === doc.cells.length - 1 ? "disabled" : ""} title="下移单元格">↓</button>` +
        `<button type="button" class="nb-act-btn" data-cell-act="ins-above" data-cell-id="${esc(cell.id)}" title="在上方插入单元格">⤒</button>` +
        `<button type="button" class="nb-act-btn" data-cell-act="ins-below" data-cell-id="${esc(cell.id)}" title="在下方插入单元格">⤓</button>` +
        `<button type="button" class="nb-act-btn danger" data-cell-act="del" data-cell-id="${esc(cell.id)}" title="删除单元格">🗑</button>` +
        `</div>` +
        `</div>` +
        (stepVizHtml ? `<div class="nb-cell-stepviz">${stepVizHtml}</div>` : "") +
        outputHtml +
        `</div>` +
        `</div>`
      );
    })
    .join("") +
    `<div class="nb-bottom-add-bar">` +
    `<button type="button" class="nb-add-chip" id="nbBottomAddCode">＋ 代码单元格 (Code)</button>` +
    `<button type="button" class="nb-add-chip" id="nbBottomAddMd">＋ 文档单元格 (Markdown)</button>` +
    `</div>`;

  // Auto-fit any rendered Markdown textareas so wrapped lines are never clipped or omitted
  if (cellsContainer.querySelectorAll) {
    cellsContainer.querySelectorAll(".nb-cell-textarea.md-textarea").forEach((el: HTMLElement) => {
      if (el && el.scrollHeight && el.scrollHeight > el.clientHeight) {
        el.style.height = Math.max(92, el.scrollHeight + 10) + "px";
      }
    });
  }

  if (focusActiveEditor && doc.activeCellId && cellsContainer.querySelector) {
    const ta = cellsContainer.querySelector(`textarea[data-cell-id="${doc.activeCellId}"]`) as HTMLTextAreaElement | null;
    if (ta && typeof ta.focus === "function") {
      ta.focus();
    }
  }
}

/* ── Toggle Checkpoint on a Specific Line of a Notebook Cell ── */
function toggleNotebookCellCheckpoint(cellId: string, lineNum: number) {
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
    const stmt = LANG === "python" ? "checkpoint()" : "checkpoint();";
    lines.splice(lineNum - 1, 0, indent + stmt);
  }
  cell.source = lines.join("\n");
  renderNotebookUI();
  if (doc.debuggingCellId === cell.id) {
    debugNotebookCell(cell.id);
  }
}

/* ================================================================
   Single-File Mode Multi-Tab Bar (#scriptTabsList) + Client-Side Virtual File System (#vfsSidebar)
   ================================================================ */
export interface ScriptTabDoc {
  id: string;
  title: string;
  lang: "ts" | "python";
  source: string;
  vfsPath: string;
  isSample?: boolean;
}

export interface VfsNode {
  path: string;
  name: string;
  type: "file" | "folder";
  parentPath: string;
  content?: string;
  readonly?: boolean;
}

const VFS_STORAGE_KEY = "ts-visual-vfs-workspace-v2";
let scriptTabSeq = 1;
let syncingScriptTab = false;
let vfsBootInitialized = false;
let pendingVfsDeletePath: string | null = null;

const SCRIPT_TABS: Record<"ts" | "python", { activeTabId: string; tabs: ScriptTabDoc[] }> = {
  ts: { activeTabId: "", tabs: [] },
  python: { activeTabId: "", tabs: [] },
};

const VFS_EXPANDED_FOLDERS = new Set<string>();

const VFS_NODES = new Map<string, VfsNode>();

const TS_SAMPLE_METADATA: Array<{ key: string; label: string; desc: string }> = [
  { key: "showcase", label: "showcase.ts · 综合演示", desc: "滑动窗口 + 单调栈 + Map + 树与图" },
  { key: "mergesort", label: "mergesort.ts · 归并排序", desc: "分治递归与左右子数组归并" },
  { key: "debug_crash", label: "debug_crash.ts · 越界排错", desc: "二分查找 <= 越界 Bug 现场定位" },
  { key: "lcs", label: "lcs.ts · 最长公共子序列", desc: "二维 DP 网格规划" },
  { key: "analyze", label: "analyze.ts · 频率统计", desc: "数组与 Map 哈希统计" },
  { key: "window", label: "window.ts · 滑动窗口", desc: "双指针定长滑动窗口" },
  { key: "structures", label: "structures.ts · 数据结构全家桶", desc: "栈 / 队列 / 堆 / 并查集 / 树 / 图" },
  { key: "counter", label: "counter.ts · 闭包计数器", desc: "高阶函数与词法作用域闭包" },
  { key: "classes", label: "classes.ts · 类与继承", desc: "class / extends / super 实例方法" },
  { key: "async_loop", label: "async_loop.ts · 事件循环", desc: "async / await 与微任务队列" },
];

const PY_SAMPLE_METADATA: Array<{ key: string; label: string; desc: string }> = [
  { key: "quickstart", label: "quickstart.py · 冒泡排序", desc: "Python 列表原地交换与双层循环" },
  { key: "binary_search", label: "binary_search.py · 二分查找", desc: "双指针折半搜索与 checkpoint()" },
  { key: "bfs", label: "bfs.py · BFS 广度优先搜索", desc: "deque 队列与集合访问标记" },
  { key: "lcs", label: "lcs.py · DP 最长公共子序列", desc: "二维列表推导式与动态规划" },
  { key: "structures", label: "structures.py · 结构集合", desc: "TreeNode / ListNode / 字典 / 集合" },
  { key: "classes", label: "classes.py · 类与实例", desc: "Counter 类构造与实例属性追踪" },
];

function getPySamplesDict(): Record<string, string> {
  const eng = typeof PY_ENGINE !== "undefined" ? PY_ENGINE : null;
  return (eng && eng.samples) ? eng.samples : {};
}

export function resolveWorkspacePath(rawPath: string, allowEmptyRoot = false): string {
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
  const resolved: string[] = [];
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

function ensureVfsInitialized() {
  if (vfsBootInitialized) return;
  vfsBootInitialized = true;
  VFS_NODES.clear();
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("ts-visual-vfs-v1");
      localStorage.removeItem(VFS_STORAGE_KEY);
    }
  } catch (_) {}
}

function persistVfsToClientStorage() {
  try {
    if (typeof localStorage === "undefined") return;
    const customNodes: VfsNode[] = [];
    VFS_NODES.forEach((node) => {
      customNodes.push(node);
    });
    localStorage.setItem(VFS_STORAGE_KEY, JSON.stringify(customNodes));
  } catch (_) {}
}

function ensureParentFoldersExist(relPath: string) {
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
        parentPath,
      });
      VFS_EXPANDED_FOLDERS.add(acc);
    }
  }
}

function ensureScriptTabsForLang(lang: "ts" | "python"): { activeTabId: string; tabs: ScriptTabDoc[] } {
  ensureVfsInitialized();
  const store = SCRIPT_TABS[lang];
  if (store.tabs.length === 0) {
    const defaultTitle =
      lang === "python"
        ? (LANG === "python" && FILE_NAME ? FILE_NAME : "quickstart.py")
        : (LANG !== "python" && FILE_NAME ? FILE_NAME : "showcase.ts");
    const defaultSrc =
      lang === "python"
        ? (LANG === "python" && editor && editor.value ? editor.value : (getPySamplesDict().quickstart || ""))
        : (LANG !== "python" && editor && editor.value ? editor.value : (SAMPLES.showcase || ""));
    const tabId = "stab_" + (++scriptTabSeq);
    store.tabs.push({
      id: tabId,
      title: defaultTitle,
      lang,
      source: defaultSrc,
      vfsPath: "",
      isSample: true,
    });
    store.activeTabId = tabId;
  }
  const firstTab = store.tabs[0];
  if (firstTab && !store.tabs.some((t) => t.id === store.activeTabId)) {
    store.activeTabId = firstTab.id;
  }
  return store;
}

export function getActiveScriptTab(lang?: "ts" | "python"): ScriptTabDoc {
  const targetLang = lang || (LANG === "python" ? "python" : "ts");
  const store = ensureScriptTabsForLang(targetLang);
  const found = store.tabs.find((t) => t.id === store.activeTabId) ?? store.tabs[0];
  if (found) return found;
  return {
    id: "stab_0",
    title: targetLang === "python" ? "quickstart.py" : "showcase.ts",
    lang: targetLang,
    source: "",
    vfsPath: "",
    isSample: true,
  };
}

export function openSampleScriptTab(title: string, source: string, lang?: "ts" | "python") {
  const targetLang = lang || (LANG === "python" ? "python" : "ts");
  if (editor && editor.value) {
    syncActiveScriptTabSource(editor.value);
  }
  const store = ensureScriptTabsForLang(targetLang);
  let tab = store.tabs.find((t) => (t.isSample || !t.vfsPath) && t.title === title);
  if (!tab) {
    tab = {
      id: "stab_" + (++scriptTabSeq),
      title,
      lang: targetLang,
      source,
      vfsPath: "",
      isSample: true,
    };
    store.tabs.push(tab);
  } else {
    tab.source = source;
    tab.vfsPath = "";
    tab.isSample = true;
  }
  store.activeTabId = tab.id;
  syncingScriptTab = true;
  if (editor) editor.value = source;
  setFileName(title);
  syncingScriptTab = false;
  renderScriptTabsUI();
  renderVfsTreeUI();
}

export function syncActiveScriptTabFromFileName(newFileName: string) {
  if (syncingScriptTab) return;
  const lang = LANG === "python" ? "python" : "ts";
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
      content: activeTab.source,
    });
    persistVfsToClientStorage();
  }
  renderScriptTabsUI();
  renderVfsTreeUI();
}

export function syncActiveScriptTabSource(src: string) {
  const lang = LANG === "python" ? "python" : "ts";
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

export function renderScriptTabsUI() {
  const tabsEl = $("scriptTabsList");
  if (!tabsEl) return;
  const lang = LANG === "python" ? "python" : "ts";
  const store = ensureScriptTabsForLang(lang);
  const activeTab = getActiveScriptTab(lang);

  tabsEl.innerHTML =
    store.tabs
      .map((t) => {
        const isAct = t.id === activeTab.id;
        const iconCls = lang === "python" ? "py-icon" : "ts-icon";
        return (
          `<div class="nb-tab${isAct ? " active" : ""}" data-script-tab-id="${esc(t.id)}" title="单击切换标签页 · 双击文件名重命名">` +
          `<span class="nb-tab-icon ${iconCls}" aria-hidden="true"></span>` +
          `<span class="nb-tab-title">${esc(t.title)}</span>` +
          (store.tabs.length > 1
            ? `<button type="button" class="nb-tab-close" data-close-script-tab="${esc(t.id)}" title="关闭标签页">×</button>`
            : "") +
          `</div>`
        );
      })
      .join("") +
    `<button type="button" class="nb-tab-add" id="scriptBtnNewTab" title="新建代码文件标签页">＋</button>`;
}

export function renderImportSampleMenu() {
  const listEl = $("importSampleList");
  if (!listEl) return;
  const isPy = LANG === "python";
  const items = isPy ? PY_SAMPLE_METADATA : TS_SAMPLE_METADATA;
  const folderPrefix = isPy ? "examples/python/" : "examples/ts/";

  const nbItemHtml =
    `<button type="button" class="import-sample-item" data-import-sample-notebook="Intro.ipynb">` +
    `<span class="import-sample-name">📓 Intro.ipynb · 交互式笔记本示例</span>` +
    `<span class="import-sample-path">examples/notebooks/</span>` +
    `</button>`;

  listEl.innerHTML =
    (VIEW_MODE === "notebook" ? nbItemHtml : "") +
    items
      .map(
        (item) =>
          `<button type="button" class="import-sample-item" data-import-sample-key="${esc(item.key)}" title="${esc(item.desc)}">` +
          `<span class="import-sample-name">${esc(item.label)}</span>` +
          `<span class="import-sample-path">${esc(folderPrefix + item.key + (isPy ? ".py" : ".ts"))}</span>` +
          `</button>`
      )
      .join("") +
    (VIEW_MODE !== "notebook" ? nbItemHtml : "");
}

export function renderVfsTreeUI() {
  const treeEl = $("vfsTreeList");
  if (!treeEl) return;
  ensureVfsInitialized();

  const activePath =
    VIEW_MODE === "notebook"
      ? getActiveNotebook().title
      : getActiveScriptTab().vfsPath;

  const childrenOf = (parentPath: string): VfsNode[] => {
    const list: VfsNode[] = [];
    VFS_NODES.forEach((node) => {
      if (node.parentPath === parentPath) list.push(node);
    });
    return list.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  };

  const buildConfirmHtml = (node: VfsNode): string => {
    if (pendingVfsDeletePath !== node.path) return "";
    return (
      `<div class="vfs-del-confirm" data-vfs-confirm-box="${esc(node.path)}">` +
      `<span class="vfs-del-confirm-text">确认删除 ${esc(node.name)}？</span>` +
      `<span class="vfs-del-confirm-actions">` +
      `<button type="button" class="vfs-confirm-btn danger" data-vfs-confirm-del="${esc(node.path)}">确认</button>` +
      `<button type="button" class="vfs-confirm-btn" data-vfs-cancel-del="${esc(node.path)}">取消</button>` +
      `</span>` +
      `</div>`
    );
  };

  const renderNode = (node: VfsNode, depth: number): string => {
    const padLeft = 8 + depth * 14;
    const canDel = !node.readonly;
    const delBtnHtml = canDel
      ? `<span class="vfs-row-actions"><button type="button" class="vfs-del-btn" data-vfs-del="${esc(node.path)}" title="删除">❌</button></span>`
      : "";
    if (node.type === "folder") {
      const isOpen = VFS_EXPANDED_FOLDERS.has(node.path);
      const kids = childrenOf(node.path);
      return (
        `<div class="vfs-folder-row" data-vfs-folder="${esc(node.path)}" style="padding-left:${padLeft}px" title="单击展开/折叠目录 · 双击重命名目录">` +
        `<span class="vfs-caret">${isOpen ? "▾" : "▸"}</span>` +
        `<span class="vfs-icon">📁</span>` +
        `<span class="vfs-name">${esc(node.name)}/</span>` +
        delBtnHtml +
        `</div>` +
        buildConfirmHtml(node) +
        (isOpen
          ? `<div class="vfs-folder-children">${kids.map((k) => renderNode(k, depth + 1)).join("")}</div>`
          : "")
      );
    }

    const isAct = Boolean(activePath && node.path === activePath);
    const ext = (node.name.split(".").pop() || "").toLowerCase();
    const icon =
      ext === "ipynb"
        ? "📓"
        : ext === "py"
        ? "🐍"
        : ext === "ts"
        ? "📘"
        : ext === "json"
        ? "🗂"
        : "📄";
    return (
      `<div class="vfs-file-row${isAct ? " active" : ""}" data-vfs-file="${esc(node.path)}" style="padding-left:${padLeft}px" title="${esc(node.path)}（单击打开 · 双击重命名）">` +
      `<span class="vfs-icon">${icon}</span>` +
      `<span class="vfs-name">${esc(node.name)}</span>` +
      delBtnHtml +
      `</div>` +
      buildConfirmHtml(node)
    );
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

function openVfsFile(rawPath: string) {
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
    const lang = LANG === "python" ? "python" : "ts";
    const store = ensureLangNotebooks(lang);
    const existing = store.docs.find((d) => d.title === node.name);
    if (existing) {
      store.activeDocId = existing.id;
      setViewMode("notebook");
      renderNotebookUI();
      return;
    }
    if (node.content && importNotebookFromJson(node.content, node.name)) {
      return;
    }
    setViewMode("notebook");
    return;
  }

  const isPyFile = node.name.endsWith(".py");
  if (isPyFile && LANG !== "python" && typeof PY_ENGINE !== "undefined" && PY_ENGINE.setLang) {
    PY_ENGINE.setLang("python");
  } else if (node.name.endsWith(".ts") && LANG === "python" && typeof PY_ENGINE !== "undefined" && PY_ENGINE.setLang) {
    PY_ENGINE.setLang("ts");
  }

  setViewMode("script");
  const lang = LANG === "python" ? "python" : "ts";
  if (editor && editor.value) {
    syncActiveScriptTabSource(editor.value);
  }
  const store = ensureScriptTabsForLang(lang);
  let tab = store.tabs.find((t) => !t.isSample && t.vfsPath === node.path);
  if (!tab) {
    tab = {
      id: "stab_" + (++scriptTabSeq),
      title: node.name,
      lang,
      source: node.content || "",
      vfsPath: node.path,
      isSample: false,
    };
    store.tabs.push(tab);
  } else {
    tab.source = node.content ?? tab.source;
    tab.vfsPath = node.path;
    tab.isSample = false;
  }
  store.activeTabId = tab.id;
  syncingScriptTab = true;
  editor.value = tab.source;
  setFileName(tab.title);
  syncingScriptTab = false;
  resetTraceState();
  updateEditorChrome();
  renderScriptTabsUI();
  renderVfsTreeUI();
  say(`📂 已打开 ${node.path}`, "ok");
}

function serializeFsData(data: unknown): string {
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

/* Expose client-side VFS API on globalThis.__VFS__ and Node-compatible fs shim on globalThis.__FS_SHIM__ */
function bindGlobalVfsApi() {
  const api = {
    resolveWorkspacePath(rawPath: string, allowEmptyRoot = false): string {
      return resolveWorkspacePath(rawPath, allowEmptyRoot);
    },
    readFile(path: string): string | null {
      ensureVfsInitialized();
      const rel = resolveWorkspacePath(path, false);
      const node = VFS_NODES.get(rel);
      if (!node) return null;
      if (node.type === "folder") {
        throw new Error(`EISDIR: illegal operation on a directory, read '${path}'`);
      }
      return node.content ?? "";
    },
    writeFile(path: string, content: string): boolean {
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
        content: serializeFsData(content),
      });
      persistVfsToClientStorage();
      renderVfsTreeUI();
      return true;
    },
    appendFile(path: string, content: string): boolean {
      ensureVfsInitialized();
      const rel = resolveWorkspacePath(path, false);
      const existing = VFS_NODES.get(rel);
      if (existing && existing.type === "folder") {
        throw new Error(`EISDIR: illegal operation on a directory, open '${path}'`);
      }
      const prev = existing && existing.type === "file" ? (existing.content ?? "") : "";
      return api.writeFile(rel, prev + serializeFsData(content));
    },
    listFiles(dirPath = ""): string[] {
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
      const out: string[] = [];
      VFS_NODES.forEach((node) => {
        if (node.parentPath === rel) out.push(node.name);
      });
      return out;
    },
    readdir(dirPath = ""): string[] {
      return api.listFiles(dirPath);
    },
    listAll(): string[] {
      ensureVfsInitialized();
      return Array.from(VFS_NODES.keys()).sort();
    },
    exists(path: string): boolean {
      ensureVfsInitialized();
      const rel = resolveWorkspacePath(path, true);
      if (rel === "") return true;
      return VFS_NODES.has(rel);
    },
    deleteFile(path: string): boolean {
      ensureVfsInitialized();
      const rel = resolveWorkspacePath(path, false);
      const node = VFS_NODES.get(rel);
      if (!node) {
        throw new Error(`ENOENT: no such file or directory, unlink '${path}'`);
      }
      // Also delete children if folder
      const prefix = rel + "/";
      Array.from(VFS_NODES.keys()).forEach((k) => {
        if (k === rel || k.startsWith(prefix)) {
          VFS_NODES.delete(k);
        }
      });
      persistVfsToClientStorage();
      renderVfsTreeUI();
      return true;
    },
    unlink(path: string): boolean {
      return api.deleteFile(path);
    },
    mkdir(path: string): boolean {
      ensureVfsInitialized();
      const rel = resolveWorkspacePath(path, true);
      if (!rel) return true;
      ensureParentFoldersExist(rel + "/_");
      persistVfsToClientStorage();
      renderVfsTreeUI();
      return true;
    },
    stat(path: string) {
      ensureVfsInitialized();
      const rel = resolveWorkspacePath(path, true);
      if (rel === "") {
        return {
          size: 0,
          isFile: () => false,
          isDirectory: () => true,
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
        isDirectory: () => isDir,
      };
    },
    clear(): void {
      ensureVfsInitialized();
      VFS_NODES.clear();
      persistVfsToClientStorage();
      renderVfsTreeUI();
    },
  };

  const fsPromises = {
    async readFile(path: string, _options?: unknown): Promise<string> {
      const content = api.readFile(path);
      if (content === null) {
        throw new Error(`ENOENT: no such file or directory, open '${path}'`);
      }
      return content;
    },
    async writeFile(path: string, data: unknown, _options?: unknown): Promise<void> {
      api.writeFile(path, serializeFsData(data));
    },
    async appendFile(path: string, data: unknown, _options?: unknown): Promise<void> {
      api.appendFile(path, serializeFsData(data));
    },
    async unlink(path: string): Promise<void> {
      api.deleteFile(path);
    },
    async rm(path: string, _options?: unknown): Promise<void> {
      api.deleteFile(path);
    },
    async readdir(path = "", _options?: unknown): Promise<string[]> {
      return api.listFiles(path);
    },
    async mkdir(path: string, _options?: unknown): Promise<string | undefined> {
      api.mkdir(path);
      return undefined;
    },
    async rmdir(path: string, _options?: unknown): Promise<void> {
      api.deleteFile(path);
    },
    async stat(path: string) {
      return api.stat(path);
    },
    async access(path: string, _mode?: number): Promise<void> {
      if (!api.exists(path)) {
        throw new Error(`ENOENT: no such file or directory, access '${path}'`);
      }
    },
    async exists(path: string): Promise<boolean> {
      return api.exists(path);
    },
    async copyFile(src: string, dest: string): Promise<void> {
      const content = api.readFile(src);
      if (content === null) {
        throw new Error(`ENOENT: no such file or directory, copyfile '${src}'`);
      }
      api.writeFile(dest, content);
    },
    async rename(oldPath: string, newPath: string): Promise<void> {
      const content = api.readFile(oldPath);
      if (content === null) {
        throw new Error(`ENOENT: no such file or directory, rename '${oldPath}'`);
      }
      api.writeFile(newPath, content);
      api.deleteFile(oldPath);
    },
  };

  const fsShim = {
    promises: fsPromises,
    readFileSync(path: string, _options?: unknown): string {
      const content = api.readFile(path);
      if (content === null) {
        throw new Error(`ENOENT: no such file or directory, open '${path}'`);
      }
      return content;
    },
    writeFileSync(path: string, data: unknown, _options?: unknown): void {
      api.writeFile(path, serializeFsData(data));
    },
    appendFileSync(path: string, data: unknown, _options?: unknown): void {
      api.appendFile(path, serializeFsData(data));
    },
    existsSync(path: string): boolean {
      return api.exists(path);
    },
    unlinkSync(path: string): void {
      api.deleteFile(path);
    },
    rmSync(path: string, _options?: unknown): void {
      api.deleteFile(path);
    },
    readdirSync(path = ""): string[] {
      return api.listFiles(path);
    },
    mkdirSync(path: string, _options?: unknown): string | undefined {
      api.mkdir(path);
      return undefined;
    },
    rmdirSync(path: string, _options?: unknown): void {
      api.deleteFile(path);
    },
    statSync(path: string) {
      return api.stat(path);
    },
    copyFileSync(src: string, dest: string): void {
      const content = api.readFile(src);
      if (content === null) {
        throw new Error(`ENOENT: no such file or directory, copyfile '${src}'`);
      }
      api.writeFile(dest, content);
    },
    renameSync(oldPath: string, newPath: string): void {
      const content = api.readFile(oldPath);
      if (content === null) {
        throw new Error(`ENOENT: no such file or directory, rename '${oldPath}'`);
      }
      api.writeFile(newPath, content);
      api.deleteFile(oldPath);
    },
  };

  globalThis.__VFS__ = api;
  globalThis.vfs = api;
  globalThis.__FS_SHIM__ = fsShim;
}

/* ── Wire Up Notebook DOM Events, Single-File Multi-Tabs, Import Menu & Right VFS Sidebar ── */
export function initNotebookUI() {
  bindGlobalVfsApi();
  ensureVfsInitialized();

  const modeSwitch = $("modeSwitch");
  if (modeSwitch && modeSwitch.addEventListener) {
    modeSwitch.addEventListener("click", (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const btn = target && target.closest ? (target.closest(".mode-tab") as HTMLElement | null) : null;
      if (!btn || !btn.dataset.mode) return;
      setViewMode(btn.dataset.mode === "notebook" ? "notebook" : "script");
    });
  }

  /* ── 1. Import Dropdown Menu (#importMenuWrap / #btnImport / #btnUploadLocalFile / #importSampleList) ── */
  const importMenuWrap = $("importMenuWrap");
  const btnImport = $("btnImport");
  const btnUploadLocalFile = $("btnUploadLocalFile");
  const importSampleList = $("importSampleList");
  const fileInput = $("fileInput") as HTMLInputElement | null;

  if (btnImport && importMenuWrap) {
    btnImport.onclick = (e?: MouseEvent) => {
      if (e && typeof e.stopPropagation === "function") e.stopPropagation();
      renderImportSampleMenu();
      if (importMenuWrap.classList) {
        importMenuWrap.classList.toggle("open");
      }
    };
    addEventListener("click", (e: MouseEvent) => {
      if (!importMenuWrap.classList || !importMenuWrap.classList.contains("open")) return;
      if (importMenuWrap.contains && importMenuWrap.contains(e.target)) return;
      importMenuWrap.classList.remove("open");
    });
  }

  if (btnUploadLocalFile && fileInput) {
    btnUploadLocalFile.onclick = (e?: MouseEvent) => {
      if (e && typeof e.stopPropagation === "function") e.stopPropagation();
      if (importMenuWrap && importMenuWrap.classList) importMenuWrap.classList.remove("open");
      fileInput.click();
    };
  }

  if (importSampleList && importSampleList.addEventListener) {
    importSampleList.addEventListener("click", (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const btn = target && target.closest ? (target.closest(".import-sample-item") as HTMLElement | null) : null;
      if (!btn) return;
      if (importMenuWrap && importMenuWrap.classList) importMenuWrap.classList.remove("open");
      const nbFile = btn.getAttribute("data-import-sample-notebook");
      if (nbFile) {
        setViewMode("notebook");
        say(`✓ 已加载内置示例笔记本 ${nbFile}`, "ok");
        return;
      }
      const sampleKey = btn.getAttribute("data-import-sample-key");
      if (sampleKey) {
        if (VIEW_MODE === "notebook") {
          const code = LANG === "python" ? (getPySamplesDict()[sampleKey] || "") : (SAMPLES[sampleKey] || "");
          if (code) {
            const doc = getActiveNotebook();
            const newCell: NotebookCell = {
              id: nextCellId(),
              type: "code",
              source: code.trim(),
              executionCount: null,
              status: "idle",
              output: null,
            };
            doc.cells.push(newCell);
            doc.activeCellId = newCell.id;
            renderNotebookUI(true);
            say(`✓ 已将示例 ${sampleKey} 导入到当前 Notebook 新单元格`, "ok");
          }
          return;
        }
        loadSample(sampleKey);
      }
    });
  }

  /* ── 2. Single-File Mode Multi-Tab Bar (#scriptTabsList) with Double-Click Rename ── */
  const scriptTabsEl = $("scriptTabsList");
  if (scriptTabsEl && scriptTabsEl.addEventListener) {
    scriptTabsEl.addEventListener("click", (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const lang = LANG === "python" ? "python" : "ts";
      const store = ensureScriptTabsForLang(lang);

      const closeBtn = target.closest ? (target.closest("[data-close-script-tab]") as HTMLElement | null) : null;
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
            syncingScriptTab = true;
            editor.value = nextTab.source;
            setFileName(nextTab.title);
            syncingScriptTab = false;
            resetTraceState();
            updateEditorChrome();
          }
          renderScriptTabsUI();
          renderVfsTreeUI();
        }
        return;
      }

      const newBtn = target.closest ? (target.closest("#scriptBtnNewTab") as HTMLElement | null) : null;
      if (newBtn) {
        syncActiveScriptTabSource(editor ? editor.value : "");
        const ext = lang === "python" ? ".py" : ".ts";
        const newTitle = `untitled-${store.tabs.length + 1}${ext}`;
        const newTab: ScriptTabDoc = {
          id: "stab_" + (++scriptTabSeq),
          title: newTitle,
          lang,
          source: lang === "python" ? "# 新建 Python 脚本\n" : "// 新建 TypeScript 脚本\n",
          vfsPath: "",
          isSample: false,
        };
        store.tabs.push(newTab);
        store.activeTabId = newTab.id;
        syncingScriptTab = true;
        editor.value = newTab.source;
        setFileName(newTab.title);
        syncingScriptTab = false;
        resetTraceState();
        updateEditorChrome();
        renderScriptTabsUI();
        renderVfsTreeUI();
        if (editor && typeof editor.focus === "function") editor.focus();
        return;
      }

      const tabEl = target.closest ? (target.closest("[data-script-tab-id]") as HTMLElement | null) : null;
      if (tabEl) {
        const tabId = tabEl.getAttribute("data-script-tab-id");
        if (tabId && store.activeTabId !== tabId) {
          syncActiveScriptTabSource(editor ? editor.value : "");
          store.activeTabId = tabId;
          const nextTab = getActiveScriptTab(lang);
          syncingScriptTab = true;
          editor.value = nextTab.source;
          setFileName(nextTab.title);
          syncingScriptTab = false;
          resetTraceState();
          updateEditorChrome();
          renderScriptTabsUI();
          renderVfsTreeUI();
        }
      }
    });

    scriptTabsEl.addEventListener("dblclick", (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const tabEl = target && target.closest ? (target.closest("[data-script-tab-id]") as HTMLElement | null) : null;
      if (!tabEl) return;
      const tabId = tabEl.getAttribute("data-script-tab-id");
      const lang = LANG === "python" ? "python" : "ts";
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
              content: targetTab.source,
            });
            persistVfsToClientStorage();
          }
          if (store.activeTabId === targetTab.id) {
            syncingScriptTab = true;
            setFileName(nextName);
            syncingScriptTab = false;
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

  /* ── 3. Right-Side Virtual File System Sidebar (#vfsSidebar / #vfsTreeList) ── */
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

  if ($("vfsBtnNewFile")) {
    $("vfsBtnNewFile").onclick = () => {
      ensureVfsInitialized();
      const ext = LANG === "python" ? ".py" : ".ts";
      let idx = 1;
      while (VFS_NODES.has(`file_${idx}${ext}`)) idx++;
      const name = `file_${idx}${ext}`;
      const path = name;
      const content = LANG === "python" ? `# ${name}\n` : `// ${name}\n`;
      VFS_NODES.set(path, {
        path,
        name,
        type: "file",
        parentPath: "",
        content,
      });
      persistVfsToClientStorage();
      openVfsFile(path);
    };
  }

  if ($("vfsBtnNewFolder")) {
    $("vfsBtnNewFolder").onclick = () => {
      ensureVfsInitialized();
      let idx = 1;
      while (VFS_NODES.has(`folder_${idx}`)) idx++;
      const name = `folder_${idx}`;
      const path = name;
      VFS_NODES.set(path, {
        path,
        name,
        type: "folder",
        parentPath: "",
      });
      VFS_EXPANDED_FOLDERS.add(path);
      persistVfsToClientStorage();
      renderVfsTreeUI();
      say(`📁 已创建文件夹 ${path}/（双击可重命名）`, "ok");
    };
  }

  if ($("vfsBtnUpload") && fileInput) {
    $("vfsBtnUpload").onclick = () => fileInput.click();
  }

  const vfsTreeList = $("vfsTreeList");
  if (vfsTreeList && vfsTreeList.addEventListener) {
    vfsTreeList.addEventListener("click", (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const confirmDelBtn = target.closest ? (target.closest("[data-vfs-confirm-del]") as HTMLElement | null) : null;
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
          (["ts", "python"] as const).forEach((l) => {
            const st = SCRIPT_TABS[l];
            st.tabs.forEach((t) => {
              if (t.vfsPath === delPath || t.vfsPath.startsWith(prefix)) {
                t.vfsPath = "";
              }
            });
          });
          persistVfsToClientStorage();
          renderScriptTabsUI();
          renderVfsTreeUI();
          say(`🗑 已从文件目录移除 ${delPath}`, "dim");
        } else {
          renderVfsTreeUI();
        }
        return;
      }

      const cancelDelBtn = target.closest ? (target.closest("[data-vfs-cancel-del]") as HTMLElement | null) : null;
      if (cancelDelBtn) {
        e.stopPropagation();
        pendingVfsDeletePath = null;
        renderVfsTreeUI();
        return;
      }

      const delBtn = target.closest ? (target.closest("[data-vfs-del]") as HTMLElement | null) : null;
      if (delBtn) {
        e.stopPropagation();
        const delPath = delBtn.getAttribute("data-vfs-del");
        if (delPath && VFS_NODES.has(delPath)) {
          pendingVfsDeletePath = pendingVfsDeletePath === delPath ? null : delPath;
          renderVfsTreeUI();
        }
        return;
      }

      const folderRow = target.closest ? (target.closest("[data-vfs-folder]") as HTMLElement | null) : null;
      if (folderRow) {
        const folderPath = folderRow.getAttribute("data-vfs-folder");
        if (folderPath) {
          if (VFS_EXPANDED_FOLDERS.has(folderPath)) VFS_EXPANDED_FOLDERS.delete(folderPath);
          else VFS_EXPANDED_FOLDERS.add(folderPath);
          renderVfsTreeUI();
        }
        return;
      }

      const fileRow = target.closest ? (target.closest("[data-vfs-file]") as HTMLElement | null) : null;
      if (fileRow) {
        const filePath = fileRow.getAttribute("data-vfs-file");
        if (filePath) {
          const curActivePath =
            VIEW_MODE === "notebook"
              ? getActiveNotebook().title
              : getActiveScriptTab().vfsPath;
          if (filePath !== curActivePath || editor.value !== (VFS_NODES.get(filePath)?.content ?? "")) {
            openVfsFile(filePath);
          }
        }
      }
    });

    vfsTreeList.addEventListener("dblclick", (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const row = target && target.closest ? (target.closest("[data-vfs-file], [data-vfs-folder]") as HTMLElement | null) : null;
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

          const lang = LANG === "python" ? "python" : "ts";
          const store = ensureScriptTabsForLang(lang);
          const matchingTab = store.tabs.find((t) => t.vfsPath === oldPath);
          if (matchingTab) {
            matchingTab.title = nextName;
            matchingTab.vfsPath = nextPath;
            if (store.activeTabId === matchingTab.id) {
              syncingScriptTab = true;
              setFileName(nextName);
              syncingScriptTab = false;
            }
            renderScriptTabsUI();
          }
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

  renderScriptTabsUI();
  renderVfsTreeUI();
  renderImportSampleMenu();

  const nbWrap = $("notebookWrap");
  if (!nbWrap || !nbWrap.addEventListener) return;

  const tabsEl = $("nbTabsList");
  if (tabsEl && tabsEl.addEventListener) {
    tabsEl.addEventListener("click", (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const closeBtn = target.closest ? (target.closest("[data-close-doc]") as HTMLElement | null) : null;
      const lang = LANG === "python" ? "python" : "ts";
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
      const newBtn = target.closest ? (target.closest("#nbBtnNewTab") as HTMLElement | null) : null;
      if (newBtn) {
        const cId = nextCellId();
        const newDoc: NotebookDocument = {
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
              output: null,
            },
          ],
          executedHistory: [],
          lastGlobalVars: {},
          lastGlobalDs: {},
        };
        store.docs.push(newDoc);
        store.activeDocId = newDoc.id;
        syncNotebookGlobalsToSidePanel(newDoc);
        renderNotebookUI(true);
        renderVfsTreeUI();
        return;
      }
      const tab = target.closest ? (target.closest(".nb-tab") as HTMLElement | null) : null;
      if (tab && tab.dataset.docId) {
        // IMPORTANT: Only re-render if switching to a DIFFERENT tab so double-clicking a tab to rename is never interrupted!
        if (store.activeDocId !== tab.dataset.docId) {
          store.activeDocId = tab.dataset.docId;
          syncNotebookGlobalsToSidePanel();
          renderNotebookUI();
          renderVfsTreeUI();
        }
      }
    });

    tabsEl.addEventListener("dblclick", (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const tab = target && target.closest ? (target.closest(".nb-tab") as HTMLElement | null) : null;
      if (!tab || !tab.dataset.docId) return;
      const lang = LANG === "python" ? "python" : "ts";
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

  const bindBtn = (id: string, fn: () => void) => {
    const b = $(id);
    if (b) b.onclick = fn;
  };
  bindBtn("nbBtnAdd", () => insertNotebookCell("below"));
  bindBtn("nbBtnCut", () => cutNotebookCell());
  bindBtn("nbBtnCopy", () => copyNotebookCell());
  bindBtn("nbBtnPaste", () => pasteNotebookCell());
  bindBtn("nbBtnRun", () => runNotebookCell(undefined, true));
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
  if (cellsList && cellsList.addEventListener) {
    cellsList.addEventListener("click", (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest && target.closest("#nbBottomAddCode")) {
        const doc = getActiveNotebook();
        const last = doc.cells[doc.cells.length - 1];
        insertNotebookCell("below", last ? last.id : undefined, "code");
        return;
      }
      if (target.closest && target.closest("#nbBottomAddMd")) {
        const doc = getActiveNotebook();
        const last = doc.cells[doc.cells.length - 1];
        insertNotebookCell("below", last ? last.id : undefined, "markdown");
        return;
      }

      const gline = target.closest ? (target.closest(".nb-gline") as HTMLElement | null) : null;
      if (gline && gline.dataset.line) {
        const cellEl = gline.closest(".nb-cell") as HTMLElement | null;
        if (cellEl && cellEl.dataset.cellId) {
          toggleNotebookCellCheckpoint(cellEl.dataset.cellId, parseInt(gline.dataset.line, 10));
          return;
        }
      }

      const actEl = target.closest ? (target.closest("[data-cell-act]") as HTMLElement | null) : null;
      if (actEl) {
        const act = actEl.getAttribute("data-cell-act");
        const cid = actEl.getAttribute("data-cell-id");
        if (!cid) return;
        const doc = getActiveNotebook();
        doc.activeCellId = cid;
        ACTIVE_NB_CELL_ID = cid;
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

      const cellBox = target.closest ? (target.closest(".nb-cell") as HTMLElement | null) : null;
      if (cellBox && cellBox.dataset.cellId) {
        const doc = getActiveNotebook();
        if (doc.activeCellId !== cellBox.dataset.cellId) {
          doc.activeCellId = cellBox.dataset.cellId;
          ACTIVE_NB_CELL_ID = doc.activeCellId;
          if (cellsList.querySelectorAll) {
            cellsList.querySelectorAll(".nb-cell").forEach((el: HTMLElement) => {
              el.classList.toggle("active", el.dataset.cellId === doc.activeCellId);
            });
          }
          const c = getActiveCell(doc);
          if (typeSel && c) typeSel.value = c.type;
        }
      }
    });

    cellsList.addEventListener("dblclick", (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const mdPrev = target && target.closest ? (target.closest('[data-cell-act="edit-md"]') as HTMLElement | null) : null;
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

    cellsList.addEventListener("input", (e: Event) => {
      const ta = e.target as HTMLTextAreaElement;
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
      const codeBox = ta.closest ? (ta.closest(".nb-cell-code-box") as HTMLElement | null) : null;
      if (codeBox) codeBox.style.height = h + "px";

      if (cell.type === "code") {
        const isDebugging = doc.debuggingCellId === cell.id && DEBUG_SESSION.active;
        const { hlHtml, gutterHtml } = renderCellCodeHighlight(cell, isDebugging);
        const hlPre = codeBox && codeBox.querySelector ? codeBox.querySelector(".nb-cell-hl") : null;
        if (hlPre) hlPre.innerHTML = hlHtml;
        const inputWrap = ta.closest ? ta.closest(".nb-cell-input") : null;
        const gutter = inputWrap && inputWrap.querySelector ? inputWrap.querySelector(".nb-cell-gutter") : null;
        if (gutter) gutter.innerHTML = gutterHtml;
      }
    });

    cellsList.addEventListener("keydown", (e: KeyboardEvent) => {
      const ta = e.target as HTMLTextAreaElement;
      if (!ta || !ta.classList || !ta.classList.contains("nb-cell-textarea")) return;
      const cid = ta.getAttribute("data-cell-id") || undefined;
      if (e.key === "Tab") {
        e.preventDefault();
        const s = ta.selectionStart || 0;
        const t = ta.selectionEnd || 0;
        const indent = LANG === "python" ? "    " : "  ";
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

  if (typeof window !== "undefined") {
    window.onNotebookLangChanged = (_nextLang: "ts" | "python") => {
      renderImportSampleMenu();
      renderScriptTabsUI();
      renderVfsTreeUI();
      if (VIEW_MODE === "notebook") {
        const doc = getActiveNotebook();
        syncNotebookGlobalsToSidePanel(doc);
        renderNotebookUI();
      }
    };
  }
}

