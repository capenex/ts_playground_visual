/* ================================================================
   Pure Notebook Execution Kernel & Step-Debugger Bridge (src/notebook/notebook-kernel.ts)
   Zero DOM dependencies — handles cross-cell context, cell execution & step debugging
   ================================================================ */
import { blankJsLine, collectNames, instrument, resolveEntry, snapFnExpr } from "../compiler/instrumenter";
import { stripTypes, transpileEnums } from "../compiler/transpile";
import { extractTsInterfaceMetadata, typecheckTS } from "../compiler/type-checker";
import { createVirtualEventLoop, hasAsyncConstructs, resetTraceState, safeJSONStringify, say } from "../runtime/event-loop";
import { computeAndAppendNextStep, initWatchedVars } from "../runtime/runner";
import { appState, uiHooks } from "../state";
import type { Diag, NotebookCell, NotebookDocument, StepAnim } from "../types";
import { cloneDeepBounded, isRecord } from "../utils/format";
import { classifyValue, populateInterfaceSchemas } from "../viz/memory-normalizers";
import { getActiveCell, getActiveNotebook, moveFocusToNextCell } from "./notebook-model";

/* ── Normalize Cell TS Code for Re-Declarable Cumulative Execution ── */
export function normalizeCellTsForNotebook(src: string): { normalized: string } {
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

export function buildTsPreambleFromHistory(
  doc: NotebookDocument,
  excludeCellId?: string
): { preambleJs: string; allNames: string[] } {
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
export function buildTsTypecheckContext(
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
  if (cell.type !== "code") return [];
  const rawCell = String(cell.source || "").replace(/\r\n?/g, "\n");
  if (!rawCell.trim()) return [];
  const { preambleLines, combinedTs } = buildTsTypecheckContext(doc, cell);
  const allDiags = typecheckTS(combinedTs, appState.STRICT_TS) || [];
  return allDiags
    .filter((d: Diag) => Boolean(d && typeof d.line === "number" && d.line > preambleLines))
    .map((d: Diag) => ({
      line: d.line - preambleLines,
      code: String(d.code || "TS"),
      message: d.message || "类型错误",
    }));
}

/* ── Sync Notebook Global Context to Right-Hand LOCALS / WATCH Panel ── */
export function syncNotebookGlobalsToSidePanel(doc = getActiveNotebook()): void {
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
    note:
      doc.execCounter > 0
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
  appState.TRACE = {
    title: `${doc.title} · Kernel Context`,
    code: [""],
    steps: [step],
  };
  appState.DEBUG_SESSION = {
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

export function runTsNotebookCell(
  doc: NotebookDocument,
  cell: NotebookCell,
  rawSrc: string,
  advanceToNext: boolean
): boolean {
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
      error: `第 ${enums.error.line} 行: ${enums.error.message}`,
      errorLine: enums.error.line,
    };
    say(`✗ [Notebook] 第 ${enums.error.line} 行: ${enums.error.message}`, "err");
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

  doc.execCounter += 1;
  cell.executionCount = doc.execCounter;

  try {
    let res: unknown;
    if (hasAsyncConstructs(combinedTs)) {
      const instrumentedBody = instrument(jsCellBody, rawSrc.split("\n"), combinedNames);
      const asyncEnvHeader =
        "var checkpoint = function(){}, 断点 = checkpoint;\n" +
        "var Promise = (__t && __t.__env && __t.__env.Promise) || globalThis.Promise, " +
        "setTimeout = (__t && __t.__env && __t.__env.setTimeout) || globalThis.setTimeout, " +
        "clearTimeout = (__t && __t.__env && __t.__env.clearTimeout) || globalThis.clearTimeout, " +
        "queueMicrotask = (__t && __t.__env && __t.__env.queueMicrotask) || globalThis.queueMicrotask;\n";
      const asyncFnBody =
        asyncEnvHeader +
        preambleJs +
        "\n;console.EnableRecording();\n" +
        instrumentedBody +
        "\n;var __ret = (" +
        tailExpr +
        ");\n" +
        "if (typeof __t === 'function' && __t.__drain) { __ret = __t.__drain(__ret, " +
        snapExpr +
        "); }\n" +
        "return { ok: true, value: __ret, vars: (" +
        snapExpr +
        ")() };";
      let lastLine = 1;
      const traceStub: {
        (line?: number): void;
        __env?: unknown;
        __async?: unknown;
        __await?: (val: unknown, fid: number, line: number, exprText: string) => unknown;
        __drain?: unknown;
        __initGlobal?: (snapFn: (() => Record<string, unknown>) | null) => void;
        __enter?: () => number;
        __leave?: () => void;
        __ckpt?: () => void;
        __fin?: () => void;
      } = function (line?: number) {
        if (line) lastLine = line;
      };
      const evLoop = createVirtualEventLoop(traceStub, () => lastLine);
      traceStub.__env = evLoop.env;
      traceStub.__async = evLoop.runAsyncCoroutine;
      traceStub.__await = (val: unknown, fid: number, line: number, exprText: string) => ({
        __isAwait: true,
        value: val,
        fid,
        line,
        expr: exprText,
      });
      traceStub.__drain = evLoop.drainEventLoop;
      traceStub.__initGlobal = function (snapFn: (() => Record<string, unknown>) | null) {
        evLoop.loop.globalSnapFn = snapFn;
      };
      traceStub.__enter = () => 0;
      traceStub.__leave = () => {};
      traceStub.__ckpt = () => {};
      traceStub.__fin = () => {};
      const fn = new Function("__t", "console", asyncFnBody);
      res = fn(traceStub, customConsole);
    } else {
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
      const fn = new Function("console", fnBody);
      res = fn(customConsole);
    }
    const elapsedMs = Date.now() - t0;

    const vRaw: Record<string, unknown> = isRecord(res) && isRecord(res.vars) ? res.vars : {};
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
      shouldEvalTailExpr && isRecord(res) && res.value !== undefined
        ? safeJSONStringify(res.value)
        : null;

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
    uiHooks.renderNotebookUI();
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
    uiHooks.renderNotebookUI();
    return false;
  }
}

/* ── Execute a Single Notebook Cell (▶ Run Cell) ── */
export async function runNotebookCell(cellId?: string, advanceToNext = false): Promise<boolean> {
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

export function debugTsNotebookCell(
  doc: NotebookDocument,
  cell: NotebookCell,
  rawSrc: string
): boolean {
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
      error: `第 ${enums.error.line} 行: ${enums.error.message}`,
      errorLine: enums.error.line,
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

  let compiledFn: Function;
  try {
    const cellNames = collectNames(jsBody);
    const allNames = Array.from(new Set([...histNames, ...cellNames]));
    const instrumentedCellJs = instrument(jsBody, originalLines, allNames);
    const snapStr = snapFnExpr(allNames);
    const asyncEnvHeader =
      "var Promise = (__t && __t.__env && __t.__env.Promise) || globalThis.Promise, " +
      "setTimeout = (__t && __t.__env && __t.__env.setTimeout) || globalThis.setTimeout, " +
      "clearTimeout = (__t && __t.__env && __t.__env.clearTimeout) || globalThis.clearTimeout, " +
      "queueMicrotask = (__t && __t.__env && __t.__env.queueMicrotask) || globalThis.queueMicrotask;\n";
    const body =
      asyncEnvHeader +
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
    steps: [],
  };
  appState.DEBUG_SESSION = {
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
  appState.cur = 0;
  appState.watched = new Set();
  appState.SEEN_VARS_EVER = new Set();
  appState.layoutSpan = Object.create(null);

  computeAndAppendNextStep({ silent: true });
  appState.cur = Math.max(0, appState.TRACE.steps.length - 1);
  initWatchedVars();
  uiHooks.renderPicker();
  uiHooks.renderStatic(appState.cur, false);
  uiHooks.renderNotebookUI();

  say(`✓ [Cell ${cell.executionCount}] 已开启单步调试 · 可使用底部「下一步 ›」或「⏭ 运行到下一个检查点」逐步推导`, "ok");
  return true;
}

/* ── Step-by-Step Debug a Single Notebook Cell (🐞 Debug Cell) ── */
export async function debugNotebookCell(cellId?: string): Promise<boolean> {
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

/* ── Run All Cells & Restart Kernel ── */
export async function restartNotebookKernel(silent = false): Promise<void> {
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
  uiHooks.renderNotebookUI();
}
