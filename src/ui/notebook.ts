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
import { hl, hlActiveLine, collectDeclaredNames } from "../viz/highlight";
import { buildStepVizRow, clearFlyLayer } from "../viz/ast-view";
import { registerUiHooks } from "../state";
import { stopAuto } from "./controls";
import {
  bindGlobalVfsApi,
  ensureVfsInitialized,
  initVfsSidebarEvents,
  renderVfsTreeUI,
  VFS_NODES,
} from "./vfs";
import {
  getActiveScriptTab,
  initScriptTabsAndImportEvents,
  renderImportSampleMenu,
  renderScriptTabsUI,
} from "./script-tabs";

let nbClipboardCell: NotebookCell | null = null;
let nbCellSeq = 100;
let nbDocSeq = 10;

export function nextCellId(): string {
  return "cell_" + (++nbCellSeq) + "_" + Math.random().toString(36).slice(2, 6);
}

export function nextDocId(): string {
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

export function ensureLangNotebooks(lang: "ts" | "python") {
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

async function runPythonNotebookCell(doc: NotebookDocument, cell: NotebookCell, rawSrc: string, advanceToNext: boolean): Promise<boolean> {
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

function runTsNotebookCell(doc: NotebookDocument, cell: NotebookCell, rawSrc: string, advanceToNext: boolean): boolean {
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
    return runPythonNotebookCell(doc, cell, rawSrc, advanceToNext);
  }
  return runTsNotebookCell(doc, cell, rawSrc, advanceToNext);
}

async function debugPythonNotebookCell(doc: NotebookDocument, cell: NotebookCell, rawSrc: string): Promise<boolean> {
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

function debugTsNotebookCell(doc: NotebookDocument, cell: NotebookCell, rawSrc: string): boolean {
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
    return debugPythonNotebookCell(doc, cell, rawSrc);
  }
  return debugTsNotebookCell(doc, cell, rawSrc);
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
    modeSwitch.querySelectorAll<HTMLElement>(".mode-tab").forEach((btn: HTMLElement) => {
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

  const typeSel = $<HTMLSelectElement>("nbCellType");
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

  if (cellsContainer.querySelectorAll) {
    cellsContainer.querySelectorAll<HTMLElement>(".nb-cell-textarea.md-textarea").forEach((el: HTMLElement) => {
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

function initNotebookTabsEvents() {
  const tabsEl = $("nbTabsList");
  if (!tabsEl || !tabsEl.addEventListener) return;

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

function initNotebookCellsEvents() {
  const typeSel = $<HTMLSelectElement>("nbCellType");
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
          cellsList.querySelectorAll<HTMLElement>(".nb-cell").forEach((el: HTMLElement) => {
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

  initScriptTabsAndImportEvents();
  initVfsSidebarEvents();

  renderScriptTabsUI();
  renderVfsTreeUI();
  renderImportSampleMenu();

  const nbWrap = $("notebookWrap");
  if (!nbWrap || !nbWrap.addEventListener) return;

  initNotebookTabsEvents();

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

  initNotebookCellsEvents();

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

export function openVfsNotebookFile(name: string, content: string | undefined): void {
  const lang = LANG === "python" ? "python" : "ts";
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

export function importSampleIntoNotebook(code: string, sampleKey: string): void {
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

registerUiHooks({
  setViewMode,
  openVfsNotebookFile,
  importSampleIntoNotebook,
  getActiveWorkspacePath: () =>
    VIEW_MODE === "notebook"
      ? getActiveNotebook().title
      : getActiveScriptTab().vfsPath,
});

