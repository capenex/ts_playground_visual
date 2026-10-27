/* ================================================================
   Sandbox Executor & Step-by-Step Trace Generator (src/runtime/runner.ts)
   ================================================================ */
import { stripTypes, transpileEnums } from "../compiler/transpile";
import { collectNames, instrument, resolveEntry, blankJsLine, snapFnExpr } from "../compiler/instrumenter";
import { typecheckTS, extractTsInterfaceMetadata } from "../compiler/type-checker";
import { appState, MAX_EXEC_MS, MAX_STEPS, PAUSE_SIGNAL, RUN_TIMEOUT_MS, uiHooks } from "../state";
import { Frame, InterfaceFieldMeta, StepAnim, StepSnapshot } from "../types";
import {
  say,
  sourceLineFromStack,
  hasAsyncConstructs,
  createVirtualEventLoop,
  formatCallFrameLabel,
  resetTraceState,
} from "./event-loop";
import {
  cloneDeepBounded,
  formatShortVal,
  isRecord,
  safeJSONStringify,
} from "../utils/format";
import {
  classifyValue,
  populateInterfaceSchemas,
  enrichFromNote,
  detectWindowRange,
  deriveAnimAndNote,
  discoverVars,
} from "../viz/memory-normalizers";

export function reportTypeErrors(diags: Array<{ line: number; code?: string | number; message?: string }>) {
  appState.TYPE_ERROR_LINES = new Set(diags.map(d => d.line));
  uiHooks.updateEditorChrome();
  say(`✗ TypeScript 严格类型检查未通过 (共 ${diags.length} 处错误)：`, 'err');
  diags.forEach(d => {
    say(`  • ${d.code} [第 ${d.line} 行]: ${d.message}`, 'err', d.line);
  });
  if (diags[0]?.line) uiHooks.revealErrorLine(diags[0].line);
}

interface TraceHookFn {
  (line?: number, note?: string, snap?: unknown, self?: unknown): void;
  __env?: unknown;
  __async?: unknown;
  __await?: (val: unknown, fid: number, line: number, exprText: string) => { __isAwait: boolean; value: unknown; fid: number; line: number; expr: string };
  __drain?: unknown;
  __initGlobal?: (snapFn: (() => Record<string, unknown>) | null) => void;
  __enter?: (fnName: string, paramNames: string[], paramVals: unknown[], defLine: number, snapFn: (() => Record<string, unknown>) | null) => number;
  __leave?: (fid: number) => void;
  __ckpt?: (args: unknown[]) => void;
  __fin?: (snap: unknown) => void;
}

type SnapFn = () => Record<string, unknown>;

function isSnapFn(val: unknown): val is SnapFn {
  return typeof val === 'function';
}

function evalSnapOrObject(snap: unknown): Record<string, unknown> {
  if (isSnapFn(snap)) return snap() || {};
  if (isRecord(snap)) return snap;
  return {};
}

export function evalCall(
  js: string,
  call?: string,
  opts?: { budgetMs?: number; entryLine?: number; instrumented?: boolean }
) {
  const o = opts || {};
  const expr = stripTypes(call || 'undefined');
  const budgetMs = o.budgetMs || 0;
  const entryLine = o.entryLine || 0;
  const stub = o.instrumented ? '' : 'var checkpoint = function(){}, 断点 = checkpoint;\n';
  const t0 = Date.now();
  let ticks = 0;
  let lastLine = 0;
  let expired = false;
  const timeoutError = () =>
    Object.assign(new Error('RUN_TIMEOUT'), {
      __timeout: true,
      __line: lastLine,
    });
  const __t: TraceHookFn = function (line?: number) {
    if (line) lastLine = line;
    if (!budgetMs) return;
    if (expired) throw timeoutError();   // keep throwing: a user try/catch must not swallow the abort
    if ((++ticks & 31) === 31 && (Date.now() - t0) > budgetMs) {
      expired = true;
      throw timeoutError();
    }
  };
  const evLoop = createVirtualEventLoop(__t, () => lastLine);
  __t.__env = evLoop.env;
  __t.__async = evLoop.runAsyncCoroutine;
  __t.__await = (val: unknown, fid: number, line: number, exprText: string) => ({ __isAwait: true, value: val, fid, line, expr: exprText });
  __t.__drain = evLoop.drainEventLoop;
  __t.__initGlobal = function (snapFn: (() => Record<string, unknown>) | null) { evLoop.loop.globalSnapFn = snapFn; };
  __t.__ckpt = function () {};
  const body = stub + js + '\n;return (function(){ try { var __v = (' + expr + '); if (__t && __t.__drain) __v = __t.__drain(__v); return { ok:true, value:__v }; } catch (e) { return { ok:false, error: e && e.message ? e.message : String(e), stack: e && e.stack ? String(e.stack) : "", line: (e && e.__line) || 0, timeout: Boolean(e && e.__timeout) }; } })();';
  const logs: string[] = [];
  const f = new Function('__t', 'console', body);
  let r: { ok: boolean; value?: unknown; error?: string; stack?: string; line?: number; timeout?: boolean };
  const formatConsoleArg = (x: unknown): string => {
    if (x instanceof Error) return x.message || String(x);
    try { return typeof x === 'object' ? JSON.stringify(x) : String(x); } catch (_) { return String(x); }
  };
  const pushLogLine = (...a: unknown[]) => logs.push(a.map(formatConsoleArg).join(' '));
  try {
    r = f(__t, {
      log: pushLogLine,
      info: pushLogLine,
      warn: pushLogLine,
      error: pushLogLine,
    });
  } catch (e) {
    // A throw from top-level code (outside the evaluated expression) lands here.
    const errObj = isRecord(e) ? e : null;
    r = {
      ok: false,
      error: errObj && typeof errObj.message === 'string' && errObj.message ? errObj.message : String(e),
      stack: errObj && errObj.stack ? String(errObj.stack) : '',
      line: (errObj && typeof errObj.__line === 'number' ? errObj.__line : 0) || lastLine || entryLine || 0,
      timeout: Boolean(errObj && errObj.__timeout),
    };
  }
  if (r && r.ok && !r.line) r.line = lastLine || entryLine || 0;
  if (r && !r.ok) r.line = r.line || lastLine || entryLine || 0;
  return { ...r, logs, elapsedMs: Date.now() - t0 };
}

export function runOnce(budgetMs?: number, sourceCode?: string) {
  if (appState.LANG === 'python') return PY_ENGINE.runOnly(budgetMs);
  const budget = (typeof budgetMs === 'number' && budgetMs > 0) ? budgetMs : RUN_TIMEOUT_MS;
  const src = typeof sourceCode === 'string' ? sourceCode : uiHooks.getEditorSource();
  const unsupported = detectUnsupportedSyntax(src);
  if (unsupported.length && unsupported[0]) {
    unsupported.forEach(x => say('✗ 第 ' + x.line + ' 行：暂不支持 ' + x.feature + ' —— ' + x.hint, 'err', x.line));
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
    say('✗ 第 ' + enums.error.line + ' 行：' + enums.error.message, 'err', enums.error.line);
    uiHooks.revealErrorLine(enums.error.line);
    return;
  }
  const js = stripTypes(enums.code);
  const originalLines = src.replace(/\r/g, '').split('\n');
  const entry = resolveEntry(src, js);
  const call = stripTypes(entry.expr || 'undefined');
  appState.ENTRY_CALL_LINE = entry.line || 0;
  const jsBody = entry.index >= 0 ? blankJsLine(js, entry.index) : js;

  // Instrument exactly like Debug does, so every loop iteration passes a watchdog hook.
  let code = jsBody;
  let instrumented = false;
  try {
    const candidate = instrument(jsBody, originalLines, collectNames(jsBody));
    new Function('__t', 'console', candidate);   // reject transforms that would not compile
    code = candidate;
    instrumented = true;
  } catch (_) {
    code = jsBody;
    instrumented = false;
  }
  if (!instrumented) say('⚠ 本次运行未能启用死循环熔断（插桩/编译回退），请留意可能的死循环', 'dim');

  try {
    const r = evalCall(code, call, { budgetMs: budget, instrumented, entryLine: entry.line });
    r.logs.forEach((l: string) => say('  log: ' + l, 'dim'));

    if (!r.ok && r.timeout) {
      const line = r.line || 0;
      const snippet = line ? (originalLines[line - 1] || '').trim().slice(0, 90) : '';
      if (line) {
        appState.RUNTIME_ERROR_LINES.add(line);
        uiHooks.updateEditorChrome();
        uiHooks.revealErrorLine(line);
      }
      say(
        '✗ 运行超过 ' + (budget / 1000) + 's 仍未结束，已强制终止（疑似死循环 / 计算量过大）' +
          (line ? ' · 位置：第 ' + line + ' 行' + (snippet ? ' · ' + snippet : '') : ' · 未能定位到具体行'),
        'err',
        line || undefined
      );
      return;
    }

    if (!r.ok) {
      const line = r.line || sourceLineFromStack(r.stack, originalLines.length);
      if (line) {
        appState.RUNTIME_ERROR_LINES.add(line);
        uiHooks.updateEditorChrome();
        say('✗ 第 ' + line + ' 行运行时报错: ' + r.error, 'err', line);
        uiHooks.revealErrorLine(line);
      } else {
        say('✗ 调用失败: ' + r.error, 'err');
      }
      return;
    }
    const elapsed = ' (' + r.elapsedMs + 'ms)';
    say('✓ 运行完成  →  ' + safeJSONStringify(r.value) + elapsed, 'ok');
  } catch (e) {
    say('✗ ' + (e instanceof Error && e.message ? e.message : e), 'err');
  }
}

export function buildFrameSnapshotFromClosure(frame: Frame, fallbackLine: number, noteForEnrich: string) {
  const raw = (typeof frame.snapFn === 'function' ? frame.snapFn() : {}) || {};
  if (frame.self && typeof frame.self === 'object') {
    try {
      const selfCopy: Record<string, unknown> = {};
      for (const k in frame.self) { try { selfCopy[k] = frame.self[k]; } catch (e) {} }
      raw['this'] = selfCopy;
    } catch (e) {}
  }
  const v: Record<string, unknown> = {};
  Object.keys(raw).forEach(k => {
    const val = raw[k];
    v[k] = (val !== null && typeof val === 'object') ? cloneDeepBounded(val, 2) : val;
  });
  const ds: Record<string, StepAnim> = {};
  Object.keys(raw).forEach(name => {
    const d = classifyValue(name, raw[name]);
    if (d) ds[name] = d;
  });
  populateInterfaceSchemas(ds);
  enrichFromNote(ds, raw, noteForEnrich || '');
  const win = detectWindowRange(raw);
  const snapFrame: Frame = {
    id: frame.id,
    fn: frame.fn,
    label: frame.label,
    line: frame.lastLine || frame.line || fallbackLine || 1,
    v,
    ds,
  };
  if (win) {
    snapFrame.l = win[0];
    snapFrame.r = win[1];
  }
  return snapFrame;
}

/* ── On-demand step-by-step Debug Engine ── */
export function computeAndAppendNextStep(opts: { silent?: boolean } = {}) {
  if (!appState.DEBUG_SESSION.active || appState.DEBUG_SESSION.finished) return false;
  const targetIdx = appState.TRACE.steps.length;
  if (targetIdx >= MAX_STEPS) {
    appState.DEBUG_SESSION.finished = true;
    appState.DEBUG_SESSION.crashed = true;
    appState.DEBUG_SESSION.error = '已达单次调试上限，自动熔断以防死循环';
    say('✗ ' + appState.DEBUG_SESSION.error, 'err');
    return false;
  }

  const originalLines = appState.DEBUG_SESSION.originalLines;
  const callIdx = originalLines.findIndex(l => /\/\/\s*调用[:：]/.test(l));
  const globalCallLine = callIdx >= 0 ? callIdx + 1 : (appState.ENTRY_CALL_LINE || 1);

  let count = 0;
  let frameSeq = 0;
  let curLineTracker = globalCallLine;
  let activeRecording = false;
  let unwindingPause = false;
  let pendingStep: StepSnapshot | null = null;
  let pendingStepSnapFn: (() => Record<string, unknown>) | Record<string, unknown> | null = null;
  const phaseBox: { current: { phase: string; activeTaskLabel: string; virtualTime: number } | null } = {
    current: null,
  };
  let nextVRaw: Record<string, unknown> | null = null;
  const stepLogs: string[] = [];
  const t0 = Date.now();

  const liveCallStack: Frame[] = [
    {
      id: 0,
      fn: 'global',
      label: 'global',
      line: globalCallLine,
      lastLine: globalCallLine,
      snapFn: null,
    },
  ];
  const suspendedFrames = new Map<number, Frame>();

  const evLoop = createVirtualEventLoop(
    (line?: number, note?: string, snap?: unknown, self?: unknown) => __t(line, note, snap, self),
    () => curLineTracker,
    (fid: number) => {
      if (unwindingPause) return;
      for (let k = liveCallStack.length - 1; k >= 1; k--) {
        if (liveCallStack[k]?.id === fid) {
          const [removed] = liveCallStack.splice(k, 1);
          if (removed) suspendedFrames.set(fid, removed);
          break;
        }
      }
    },
    (fid: number) => {
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

  const __t: TraceHookFn = (line?: number, note?: string, snap?: unknown, self?: unknown) => {
    const stepLine = line || curLineTracker || 1;
    if (line) curLineTracker = line;
    const idx = count++;
    if ((idx & 63) === 63 && Date.now() - t0 > MAX_EXEC_MS) {
      throw new Error('执行超时 (>' + MAX_EXEC_MS + 'ms)，自动熔断以防页面卡死');
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
      const effectiveSnap = (isSnapFn(snap) ? snap : null) ||
        (topFrame && topFrame.snapFn) ||
        evLoop.loop.globalSnapFn;
      const vRaw: Record<string, unknown> = (typeof effectiveSnap === 'function' ? effectiveSnap() : evalSnapOrObject(snap)) || {};
      if (isRecord(self)) {
        try {
          const selfCopy: Record<string, unknown> = {};
          for (const k in self) { try { selfCopy[k] = self[k]; } catch (e) {} }
          vRaw['this'] = selfCopy;
        } catch (e) {}
      }
      const v: Record<string, unknown> = {};
      Object.keys(vRaw).forEach(k => {
        const val = vRaw[k];
        v[k] = (val !== null && typeof val === 'object') ? cloneDeepBounded(val, 2) : val;
      });
      const ds: Record<string, StepAnim> = {};
      Object.keys(vRaw).forEach(name => {
        const d = classifyValue(name, vRaw[name]);
        if (d) ds[name] = d;
      });
      enrichFromNote(ds, vRaw, note || '');
      const win = detectWindowRange(vRaw);
      const capturedStack = liveCallStack.map((fr, fIdx) => {
        const isTop = fIdx === liveCallStack.length - 1;
        const fNote = isTop ? (note || '') : (originalLines[(fr.lastLine || fr.line || 1) - 1] || '');
        return buildFrameSnapshotFromClosure(fr, isTop ? stepLine : (fr.line || 1), fNote);
      });
      pendingStepSnapFn = effectiveSnap;
      phaseBox.current = {
        phase: evLoop.loop.phase,
        activeTaskLabel: evLoop.loop.activeTaskLabel,
        virtualTime: evLoop.loop.virtualTime,
      };
      const stepToCommit: StepSnapshot = {
        line: stepLine,
        note: note || '',
        v,
        vRaw,
        ds,
        callStack: capturedStack,
        isCheckpoint: false,
        checkpointVals: null,
        error: null,
      };
      if (win) { stepToCommit.l = win[0]; stepToCommit.r = win[1]; }
      pendingStep = stepToCommit;
      activeRecording = true;
      return;
    }
    if (idx === targetIdx + 1) {
      activeRecording = false;
      unwindingPause = true;
      const sameScopeRaw = (typeof pendingStepSnapFn === 'function' ? pendingStepSnapFn() : null);
      const fallbackRaw = evalSnapOrObject(snap);
      nextVRaw = sameScopeRaw || fallbackRaw || {};
      throw PAUSE_SIGNAL;
    }
  };

  __t.__env = evLoop.env;
  __t.__async = evLoop.runAsyncCoroutine;
  __t.__await = (val: unknown, fid: number, line: number, exprText: string) => ({ __isAwait: true, value: val, fid, line, expr: exprText });
  __t.__drain = evLoop.drainEventLoop;

  __t.__initGlobal = (globalSnapFn: (() => Record<string, unknown>) | null) => {
    evLoop.loop.globalSnapFn = globalSnapFn;
    if (liveCallStack[0]) {
      liveCallStack[0].snapFn = globalSnapFn;
    }
  };

  __t.__enter = (fnName: string, paramNames: string[], paramVals: unknown[], defLine: number, snapFn: (() => Record<string, unknown>) | null) => {
    if (unwindingPause) return 0;
    const fid = ++frameSeq;
    const label = formatCallFrameLabel(fnName, paramNames, paramVals);
    liveCallStack.push({
      id: fid,
      fn: fnName,
      label,
      line: defLine || 1,
      lastLine: defLine || 1,
      snapFn,
    });
    return fid;
  };

  __t.__leave = (fid: number) => {
    if (unwindingPause) return;
    suspendedFrames.delete(fid);
    for (let k = liveCallStack.length - 1; k >= 1; k--) {
      if (liveCallStack[k]?.id === fid) {
        liveCallStack.splice(k, 1);
        break;
      }
    }
  };

  __t.__ckpt = (args: unknown[]) => {
    if (activeRecording && pendingStep) {
      pendingStep.isCheckpoint = true;
      pendingStep.checkpointVals = (args || []).map((a: unknown) => formatShortVal(a));
    }
  };

  __t.__fin = (snap: unknown) => {
    if (activeRecording) {
      activeRecording = false;
      const sameScopeRaw = (typeof pendingStepSnapFn === 'function' ? pendingStepSnapFn() : null);
      const fallbackRaw = evalSnapOrObject(snap);
      nextVRaw = sameScopeRaw || fallbackRaw || {};
    }
  };

  const formatStepConsoleArg = (x: unknown): string => {
    if (x instanceof Error) return x.message || String(x);
    try { return typeof x === 'object' ? JSON.stringify(x) : String(x); } catch (_) { return String(x); }
  };
  const pushStepConsole = (...a: unknown[]) => {
    if (!activeRecording) return;
    stepLogs.push(a.map(formatStepConsoleArg).join(' '));
  };
  const customConsole = {
    log: pushStepConsole,
    info: pushStepConsole,
    warn: pushStepConsole,
    error: pushStepConsole,
  };

  let paused = false;
  let runtimeErr: unknown = null;
  let retVal = undefined;

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

  stepLogs.forEach(l => say('  log: ' + l, 'dim'));

  if (!pendingStep) {
    if (runtimeErr) {
      const errMsg = runtimeErr instanceof Error && runtimeErr.message
        ? runtimeErr.message
        : (runtimeErr && typeof runtimeErr === 'object' && 'message' in runtimeErr && typeof runtimeErr.message === 'string'
          ? runtimeErr.message
          : String(runtimeErr));
      const callLine = globalCallLine;
      const errStep = {
        line: callLine,
        note: '✗ 运行时错误: ' + errMsg,
        v: {},
        ds: {},
        callStack: [{ id: 0, fn: 'global', label: 'global', line: callLine, v: {}, ds: {} }],
        anim: { type: 'error', message: errMsg },
        isCheckpoint: false,
        error: errMsg,
      };
      populateInterfaceSchemas(errStep.ds);
      appState.TRACE.steps.push(errStep);
      appState.RUNTIME_ERROR_LINES.add(callLine);
      appState.DEBUG_SESSION.finished = true;
      appState.DEBUG_SESSION.crashed = true;
      appState.DEBUG_SESSION.error = errMsg;
      appState.DEBUG_SESSION.errorLine = callLine;
      say('✗ 运行时错误 [第 ' + callLine + ' 行]: ' + errMsg + '（已停止在报错处）', 'err');
      return true;
    }
    // If the file only defines interface/type schemas without executable steps yet, synthesize an inspection step
    if (targetIdx === 0 && appState.CURRENT_TS_META.interfaces && appState.CURRENT_TS_META.interfaces.size > 0) {
      const firstIface = [...appState.CURRENT_TS_META.interfaces.values()][0];
      if (firstIface) {
        const schemaDs: Record<string, StepAnim> = {};
        populateInterfaceSchemas(schemaDs);
        const schemaStep: StepSnapshot = {
          line: firstIface.line || 1,
          note: `interface ${firstIface.name} { ${firstIface.fields.map((f: InterfaceFieldMeta) => f.k + (f.optional ? '?' : '') + ': ' + f.declaredType).join('; ')} }`,
          v: {},
          ds: schemaDs,
          callStack: [{ id: 0, fn: 'global', label: 'global', line: firstIface.line || 1, v: {}, ds: schemaDs }],
          anim: null,
          isCheckpoint: false,
          error: null,
          isFinalReturn: true,
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

  const stepObj: StepSnapshot = pendingStep;
  const rawLine = originalLines[stepObj.line - 1] || stepObj.note || '';
  const nextContext: Record<string, unknown> = Object.assign({}, nextVRaw || stepObj.vRaw);
  if (stepObj.checkpointVals) {
    nextContext['__ckptVals'] = stepObj.checkpointVals;
  }

  // Update primitive/Promise summary values in `stepObj.v` if a variable was initialized on this line
  if (nextVRaw) {
    const rawMap = nextVRaw;
    Object.keys(rawMap).forEach(name => {
      const nv = rawMap[name];
      if (nv && typeof nv === 'object' && '__isVirtualPromise' in nv) {
        stepObj.v[name] = cloneDeepBounded(nv, 2);
      }
      if (stepObj.vRaw && stepObj.vRaw[name] === undefined && nv !== undefined && !stepObj.ds[name]) {
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
    stepObj.ds['eventLoop'] = elSnap;
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
    const errMsg = runtimeErr instanceof Error && runtimeErr.message
      ? runtimeErr.message
      : (runtimeErr && typeof runtimeErr === 'object' && 'message' in runtimeErr && typeof runtimeErr.message === 'string'
        ? runtimeErr.message
        : String(runtimeErr));
    stepObj.error = errMsg;
    stepObj.note = `${rawLine.trim()}  →  ✗ 运行时错误: ${errMsg}`;
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

  discoverVars().forEach((s: { id: string }) => {
    if (!appState.SEEN_VARS_EVER.has(s.id)) {
      appState.SEEN_VARS_EVER.add(s.id);
      if (!appState.URL_WATCH || !appState.URL_WATCH.length || appState.URL_WATCH.includes(s.id)) {
        appState.watched.add(s.id);
      }
    }
  });

  if (runtimeErr) {
    say('✗ 运行时错误 [第 ' + stepObj.line + ' 行]: ' + stepObj.error + '（已运行到报错为止）', 'err');
  } else if (!paused && !opts.silent) {
    say('✓ 调试运行完成  →  ' + safeJSONStringify(retVal), 'ok');
  }

  return true;
}

/* Full TypeScript syntax (decorators, abstract classes, constructor parameter properties,
   namespaces, declare, static blocks) is now supported directly by stripTypes & typecheckTS. */
function detectUnsupportedSyntax(_src: string): Array<{ line: number; feature: string; hint: string }> {
  return [];
}

export function startDebug(initialStep = 0, sourceCode?: string) {
  if (appState.LANG === 'python') return PY_ENGINE.start(initialStep);
  appState.SELECTED_FRAME_IDX = null;
  const rawSrc = typeof sourceCode === 'string' ? sourceCode : uiHooks.getEditorSource();
  const src = rawSrc.replace(/\r/g, '');
  const unsupported = detectUnsupportedSyntax(src);
  if (unsupported.length && unsupported[0]) {
    resetTraceState();
    unsupported.forEach(x => say('✗ 第 ' + x.line + ' 行：暂不支持 ' + x.feature + ' —— ' + x.hint, 'err', x.line));
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

  const originalLines = src.split('\n');
  const enums = transpileEnums(src);
  if (enums.error) {
    resetTraceState();
    say('✗ 第 ' + enums.error.line + ' 行：' + enums.error.message, 'err', enums.error.line);
    uiHooks.revealErrorLine(enums.error.line);
    return false;
  }
  const js0 = stripTypes(enums.code);
  const entry = resolveEntry(src, js0);
  const expr = stripTypes(entry.expr || 'undefined');
  appState.ENTRY_CALL_LINE = entry.line || 0;
  const jsBody = entry.index >= 0 ? blankJsLine(js0, entry.index) : js0;

  let compiledFn: Function;
  try {
    const names = collectNames(jsBody);
    const js = instrument(jsBody, originalLines, names);
    const snapStr = snapFnExpr(names);
    const body =
      js +
      '\n;var __entryVal = (' + expr + ');\n' +
      'if (typeof __t === "function" && __t.__drain) { __entryVal = __t.__drain(__entryVal, ' + snapStr + '); }\n' +
      'try{if(typeof __t==="function"&&__t.__fin)__t.__fin(' + snapStr + ');}catch(_){}\n' +
      'return __entryVal;';
    compiledFn = new Function('__t', 'console', body);
  } catch (e) {
    resetTraceState();
    say('✗ 编译失败: ' + (e instanceof Error && e.message ? e.message : e), 'err');
    return false;
  }

  uiHooks.stopAuto();
  uiHooks.clearFlyLayer();
  appState.TRACE = {
    title: 'TypeScript Playground · Debug',
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
    hasAsync: hasAsyncConstructs(src),
  };
  appState.cur = 0;
  appState.watched = new Set();
  appState.SEEN_VARS_EVER = new Set();
  appState.layoutSpan = Object.create(null);

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
    say('✓ 编译通过 · 已进入 Debug 模式（每走一步当场计算，可随时步进或运行到下一个检查点）', 'ok');
  }
  return true;
}

export const generateTrace = startDebug;

export function initWatchedVars() {
  const all = discoverVars().map((s: { id: string }) => s.id);
  all.forEach((id: string) => appState.SEEN_VARS_EVER.add(id));
  const urlWatch = appState.URL_WATCH;
  if (urlWatch && urlWatch.length) {
    const filtered = all.filter((id: string) => urlWatch.includes(id));
    appState.watched = new Set(filtered.length ? filtered : all);
  } else {
    appState.watched = new Set(all);
  }
}

export const runTrace = startDebug;
export const rebuildFromSource = startDebug;
