/* ================================================================
   Pure Notebook Execution Kernel & Step-Debugger Bridge (src/notebook/notebook-kernel.ts)
   Zero DOM dependencies — handles cross-cell context, cell execution & step debugging
   ================================================================ */
import { blankJsLine, collectNames, instrument, resolveEntry, snapFnExpr } from "../compiler/instrumenter";
import { stripTypes, transpileEnums } from "../compiler/transpile";
import { extractTsInterfaceMetadata, typecheckTS } from "../compiler/type-checker";
import { hasAsyncConstructs, resetTraceState, safeJSONStringify, say } from "../runtime/event-loop";
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
  if (appState.LANG === "python" || cell.type !== "code") return [];
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

export async function runPythonNotebookCell(
  doc: NotebookDocument,
  cell: NotebookCell,
  rawSrc: string,
  advanceToNext: boolean
): Promise<boolean> {
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
      uiHooks.renderNotebookUI();
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
    uiHooks.renderNotebookUI();
    return !payload.error;
  } catch (err: unknown) {
    cell.status = "error";
    cell.output = { logs: [], returnValue: null, error: (err instanceof Error && err.message) || String(err) };
    uiHooks.renderNotebookUI();
    return false;
  }
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

  if (appState.LANG === "python") {
    return runPythonNotebookCell(doc, cell, rawSrc, advanceToNext);
  }
  return runTsNotebookCell(doc, cell, rawSrc, advanceToNext);
}

export async function debugPythonNotebookCell(
  doc: NotebookDocument,
  cell: NotebookCell,
  rawSrc: string
): Promise<boolean> {
  cell.status = "debugging";
  doc.debuggingCellId = cell.id;
  uiHooks.renderNotebookUI();
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
    appState.TRACE = { title: `${doc.title} · Cell [${cell.executionCount}]`, code: sourceLines, steps };
    appState.DEBUG_SESSION = {
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

    appState.cur = 0;
    appState.SELECTED_FRAME_IDX = null;
    appState.watched = new Set();
    appState.SEEN_VARS_EVER = new Set();
    appState.layoutSpan = Object.create(null);
    initWatchedVars();
    uiHooks.renderPicker();
    uiHooks.renderStatic(appState.cur, false);
    uiHooks.renderNotebookUI();
    say(`✓ [Cell ${cell.executionCount}] 已进入单步调试模式（共 ${steps.length} 步，可使用底部控制栏逐步观察）`, "ok");
    return true;
  } catch (_err: unknown) {
    cell.status = "error";
    doc.debuggingCellId = null;
    uiHooks.renderNotebookUI();
    return false;
  }
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

  if (appState.LANG === "python") {
    return debugPythonNotebookCell(doc, cell, rawSrc);
  }
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
  if (appState.LANG === "python" && typeof PY_ENGINE !== "undefined") {
    try {
      await PY_ENGINE.run("", { resetKernel: true, trace: false });
    } catch (_) {}
  }
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
