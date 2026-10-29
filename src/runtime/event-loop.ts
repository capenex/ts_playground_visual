/* ================================================================
   Virtual Event Loop Scheduler & Console Log Utilities (src/runtime/event-loop.ts)
   ================================================================ */
import { blankStrings } from "../compiler/comments";
import { appState, notifyConsoleLog, uiHooks } from "../state";
import { formatShortVal, isMapLike, isRecord, isSetLike, safeJSONStringify } from "../utils/format";
import { ConsoleLogEntry, EventLoopSnapshot } from "../types";
import {
  createVirtualPromiseAndFsEnv,
  rethrowIfControlSignal,
  VirtualCoroutineEntry,
  VirtualLoopState,
  VirtualMacrotaskEntry,
  VirtualMicrotaskEntry,
} from "./event-loop-env";

interface AwaitYieldDescriptor {
  __isAwait: boolean;
  value?: unknown;
  fid?: number;
  line?: number;
  expr?: string;
}

function isAwaitYieldDescriptor(val: unknown): val is AwaitYieldDescriptor {
  return isRecord(val) && Boolean(val.__isAwait);
}

export { safeJSONStringify };
export * from "./event-loop-env";

let logRunSeq = 0;

export function say(msg: string, cls?: string, line?: number): void {
  const entry: ConsoleLogEntry = { msg };
  if (cls !== undefined) entry.cls = cls;
  if (line !== undefined) entry.line = line;
  appState.CONSOLE_LOGS.push(entry);
  notifyConsoleLog('append', entry);
  uiHooks.appendConsoleLog(entry);
}

export function logRunRoundHeader(actionLabel: string, targetName?: string): void {
  logRunSeq++;
  if (appState.CONSOLE_LOGS.length > 0) {
    const suffix = targetName ? ` · ${targetName}` : '';
    say(`── #${logRunSeq} ${actionLabel}${suffix} ──`, 'log-divider');
  }
}

export function clearLog(msg?: string): void {
  logRunSeq = 0;
  appState.CONSOLE_LOGS.length = 0;
  notifyConsoleLog('clear');
  uiHooks.clearConsoleDom();
  if (msg) say(msg, 'dim');
}

export function anonStackLine(stack: unknown) {
  const re = /,\s*<anonymous>:(\d+):\d+/g;
  const m = re.exec(String(stack || ''));
  return m && m[1] ? parseInt(m[1], 10) : 0;
}

let FN_BODY_LINE_OFFSET: number | null = null;
export function fnBodyLineOffset() {
  if (FN_BODY_LINE_OFFSET !== null) return FN_BODY_LINE_OFFSET;
  let off = 2;
  try {
    new Function('throw new Error("probe")')();
  } catch (e) {
    const line = anonStackLine(e instanceof Error ? e.stack : undefined);
    if (line > 0) off = Math.max(1, line - 1);
  }
  FN_BODY_LINE_OFFSET = off;
  return off;
}

export function sourceLineFromStack(stack: unknown, lineCount?: number) {
  const stackLine = anonStackLine(stack);
  if (!stackLine) return 0;
  const line = stackLine - fnBodyLineOffset() - 1;
  if (!isFinite(line) || line < 1) return 0;
  if (lineCount && line > lineCount) return 0;
  return line;
}

export function hasAsyncConstructs(src: unknown) {
  if (!src || typeof src !== 'string') return false;
  const clean = blankStrings(src);
  return /\b(?:async|await|Promise|setTimeout|queueMicrotask|sleep)\b/.test(clean);
}

export function createVirtualEventLoop(
  __t: ((line?: number, note?: string, snap?: unknown, self?: unknown) => void) | null | undefined,
  getCurLine: () => number = () => 1,
  onSuspendFrame?: (fid: number, line?: number, expr?: string) => void,
  onResumeFrame?: (fid: number) => void
) {
  let promiseSeq = 0;
  let microSeq = 0;
  let macroSeq = 0;
  let coroSeq = 0;

  const loop: VirtualLoopState = {
    used: false,
    virtualTime: 0,
    phase: 'sync',
    activeTaskLabel: '主线程同步栈 (Sync)',
    coroutines: [],
    microtasks: [],
    macrotasks: [],
    promises: [],
    globalSnapFn: null,
  };

  function enqueueMicrotask(item: {
    label?: string;
    line?: number;
    isInternalAwait?: boolean;
    run: () => void;
    rawCb?: unknown;
  }) {
    loop.used = true;
    const task: VirtualMicrotaskEntry = {
      id: ++microSeq,
      label: item.label || ('microtask#' + microSeq),
      line: item.line || getCurLine() || 1,
      status: 'queued',
      isInternalAwait: Boolean(item.isInternalAwait),
      run: item.run,
      rawCb: item.rawCb || null,
    };
    loop.microtasks.push(task);
    return task;
  }

  const { VirtualPromise, fsModuleEnv } = createVirtualPromiseAndFsEnv({
    loop,
    getCurLine,
    nextPromiseId: () => ++promiseSeq,
    enqueueMicrotask,
    __t,
  });

  const env = {
    Promise: VirtualPromise,
    fs: fsModuleEnv,
    queueMicrotask(cb: (() => unknown) | null | undefined) {
      loop.used = true;
      const line = getCurLine() || 1;
      enqueueMicrotask({
        label: 'queueMicrotask',
        line,
        rawCb: cb,
        run: () => {
          if (typeof cb !== 'function') return;
          const cbSrc = Function.prototype.toString.call(cb);
          if (!cbSrc.includes('__t(') && typeof __t === 'function') {
            __t(line, '⚡ [微任务] queueMicrotask', loop.globalSnapFn);
          }
          cb();
        },
      });
    },
    setTimeout(cb: ((...a: unknown[]) => unknown) | null | undefined, delay: number | string = 0, ...args: unknown[]) {
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
        status: 'waiting',
        cb,
        args,
      });
      return id;
    },
    clearTimeout(id: number) {
      const t = loop.macrotasks.find((m: { id: number; status: string }) => m.id === id && m.status === 'waiting');
      if (t) t.status = 'cancelled';
    },
    sleep(ms: number | string = 0, val: unknown = undefined) {
      loop.used = true;
      const d = Math.max(0, Number(ms) || 0);
      return new VirtualPromise((resolve: (v?: unknown) => void) => {
        env.setTimeout(() => resolve(val), d);
      }, `sleep(${d}ms)`);
    },
  };

  function runAsyncCoroutine(
    genFn: (this: unknown) => Generator<unknown, unknown, unknown>,
    self: unknown,
    fnName?: string,
    defLine?: number
  ) {
    loop.used = true;
    const coro: VirtualCoroutineEntry = {
      id: ++coroSeq,
      name: fnName || 'async',
      line: defLine || getCurLine() || 1,
      status: 'running',
      awaitExpr: null,
      fid: 0,
    };
    loop.coroutines.push(coro);
    const outPromise = new VirtualPromise(null, `${coro.name}()`);
    let gen: Generator<unknown, unknown, unknown>;
    try {
      gen = genFn.call(self);
    } catch (err) {
      rethrowIfControlSignal(err);
      coro.status = 'rejected';
      outPromise._reject(err);
      return outPromise;
    }

    function drive(method: 'next' | 'throw', arg: unknown) {
      coro.status = 'running';
      coro.awaitExpr = null;
      let stepRes;
      try {
        stepRes = gen[method](arg);
      } catch (err) {
        rethrowIfControlSignal(err);
        coro.status = 'rejected';
        outPromise._reject(err);
        return;
      }
      if (stepRes.done) {
        coro.status = 'done';
        outPromise._resolve(stepRes.value);
        return;
      }
      const yielded = stepRes.value;
      const isAwaitDesc = isAwaitYieldDescriptor(yielded);
      const awaitedVal = isAwaitDesc ? yielded.value : yielded;
      const fid = isAwaitDesc && typeof yielded.fid === 'number' ? yielded.fid : 0;
      const awaitLine = isAwaitDesc && typeof yielded.line === 'number' ? yielded.line : getCurLine() || coro.line;
      const awaitExpr = isAwaitDesc && typeof yielded.expr === 'string' && yielded.expr ? yielded.expr : 'await';

      coro.status = 'suspended';
      coro.line = awaitLine;
      coro.awaitExpr = awaitExpr;
      coro.fid = fid;
      if (fid && typeof onSuspendFrame === 'function') {
        onSuspendFrame(fid, awaitLine, awaitExpr);
      }

      const awaitedPromise = VirtualPromise.resolve(awaitedVal);
      awaitedPromise.then(
        (resolvedVal: unknown) => {
          if (fid && typeof onResumeFrame === 'function') {
            onResumeFrame(fid);
          }
          drive('next', resolvedVal);
        },
        (rejectedReason: unknown) => {
          if (fid && typeof onResumeFrame === 'function') {
            onResumeFrame(fid);
          }
          drive('throw', rejectedReason);
        },
        `await 恢复: ${coro.name} (L${awaitLine})`,
        true
      );
    }

    drive('next', undefined);
    return outPromise;
  }

  function drainEventLoop(entryVal: unknown, fallbackSnapFn?: (() => Record<string, unknown>) | null) {
    if (fallbackSnapFn && !loop.globalSnapFn) loop.globalSnapFn = fallbackSnapFn;
    if (!loop.used) return entryVal;

    let safety = 0;
    while (safety++ < 2000) {
      const nextMicro = loop.microtasks.find((m: { status: string }) => m.status === 'queued');
      if (nextMicro) {
        nextMicro.status = 'running';
        loop.phase = 'microtask';
        loop.activeTaskLabel = nextMicro.label;
        try {
          nextMicro.run();
        } finally {
          if (nextMicro.status === 'running') nextMicro.status = 'done';
        }
        continue;
      }

      let bestMacro: VirtualMacrotaskEntry | null = null;
      for (const m of loop.macrotasks) {
        if (m.status !== 'waiting') continue;
        if (!bestMacro || m.fireAt < bestMacro.fireAt || (m.fireAt === bestMacro.fireAt && m.id < bestMacro.id)) {
          bestMacro = m;
        }
      }
      if (bestMacro) {
        bestMacro.status = 'running';
        loop.virtualTime = Math.max(loop.virtualTime, bestMacro.fireAt);
        loop.phase = 'macrotask';
        loop.activeTaskLabel = `${bestMacro.label} @ ${loop.virtualTime}ms`;
        try {
          if (typeof bestMacro.cb === 'function') {
            const cbSrc = Function.prototype.toString.call(bestMacro.cb);
            if (!cbSrc.includes('__t(') && typeof __t === 'function') {
              __t(bestMacro.line || 1, `⚡ [宏任务 @ ${loop.virtualTime}ms] ${bestMacro.label}`, loop.globalSnapFn);
            }
            bestMacro.cb(...(bestMacro.args || []));
          }
        } catch (err) {
          rethrowIfControlSignal(err);
          throw err;
        } finally {
          if (bestMacro.status === 'running') bestMacro.status = 'done';
        }
        continue;
      }

      break;
    }

    loop.phase = 'idle';
    loop.activeTaskLabel = '事件循环已清空 (Idle)';

    if (isRecord(entryVal) && entryVal.__isVirtualPromise) {
      if (entryVal.state === 'rejected') {
        throw entryVal.reason instanceof Error ? entryVal.reason : new Error(String(entryVal.reason));
      }
      if (entryVal.state === 'fulfilled') {
        return entryVal.value;
      }
    }
    return entryVal;
  }

  function toVizSnapshot(): EventLoopSnapshot {
    return {
      kind: 'eventloop',
      now: loop.virtualTime,
      virtualTime: loop.virtualTime,
      phase: loop.phase,
      activeTask: loop.activeTaskLabel,
      activeTaskLabel: loop.activeTaskLabel,
      coroutines: loop.coroutines.slice(-8).map((c: { id: number; name: string; line: number; status: string; awaitExpr: string | null }) => ({
        id: c.id,
        name: c.name,
        line: c.line,
        status: c.status,
        awaitExpr: c.awaitExpr,
        awaitingExpr: c.awaitExpr,
      })),
      microtasks: loop.microtasks.filter((m: { status: string }) => m.status !== 'done').concat(
        loop.microtasks.filter((m: { status: string }) => m.status === 'done').slice(-3)
      ).slice(0, 8).map((m: { id: number; label: string; line: number; status: string }) => ({
        id: m.id,
        label: m.label,
        line: m.line,
        status: m.status,
      })),
      macrotasks: loop.macrotasks.filter((m: { status: string }) => m.status !== 'done' && m.status !== 'cancelled').concat(
        loop.macrotasks.filter((m: { status: string }) => m.status === 'done').slice(-3)
      ).slice(0, 8).map((m: { id: number; label: string; delay: number; fireAt: number; line: number; status: string }) => ({
        id: m.id,
        label: m.label,
        delay: m.delay,
        due: m.fireAt,
        fireAt: m.fireAt,
        line: m.line,
        status: m.status,
      })),
      promises: loop.promises.filter((p: { _internal?: boolean }) => !p._internal).slice(-8).map((p: { id: number; label: string; state: string; value: unknown; reason: unknown; reactions?: unknown[]; line: number }) => ({
        id: p.id,
        label: p.label,
        state: p.state,
        value: p.state === 'fulfilled' ? formatShortVal(p.value) : (p.state === 'rejected' ? formatShortVal(p.reason) : 'pending'),
        valStr: p.state === 'fulfilled' ? formatShortVal(p.value) : (p.state === 'rejected' ? formatShortVal(p.reason) : 'pending'),
        reactions: p.reactions ? p.reactions.length : 0,
        line: p.line,
      })),
    };
  }

  return {
    loop,
    env,
    runAsyncCoroutine,
    drainEventLoop,
    toVizSnapshot,
  };
}

export function formatCallArgItem(val: unknown): string {
  if (val === undefined) return 'undefined';
  if (val === null) return 'null';
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (typeof val === 'string') {
    return val.length > 10 ? JSON.stringify(val.slice(0, 8) + '…') : JSON.stringify(val);
  }
  if (Array.isArray(val)) {
    if (val.length === 0) return '[]';
    if (Array.isArray(val[0])) return `[${val.length}×${val[0].length}]`;
    if (val.length <= 4) return '[' + val.map((x: unknown): string => formatCallArgItem(x)).join(', ') + ']';
    return '[' + val.slice(0, 3).map((x: unknown): string => formatCallArgItem(x)).join(', ') + ', …]';
  }
  if (isMapLike(val)) return `Map(${val.size})`;
  if (isSetLike(val)) return `Set(${val.size})`;
  if (typeof val === 'object') {
    if ('val' in val && ('left' in val || 'right' in val)) return `Tree(${val.val})`;
    if ('val' in val && 'next' in val) return `List(${val.val})`;
    return '{…}';
  }
  return String(val);
}

export function formatCallFrameLabel(fnName: string, _paramNames: unknown, paramVals: unknown) {
  const vals = Array.isArray(paramVals) ? paramVals : [];
  if (!vals.length) return `${fnName}()`;
  const isPrimitive = (v: unknown) => v === null || v === undefined || typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean';
  const primVals = vals.filter(isPrimitive);
  const hasComplex = vals.some((v: unknown) => !isPrimitive(v));
  if (hasComplex && primVals.length >= 2 && primVals.every((v: unknown) => typeof v === 'number')) {
    return `${fnName}(${primVals.map((v: unknown) => formatCallArgItem(v)).join(', ')})`;
  }
  return `${fnName}(${vals.map((v: unknown) => formatCallArgItem(v)).join(', ')})`;
}

export function resetTraceState() {
  uiHooks.stopAuto();
  uiHooks.clearFlyLayer();
  appState.TRACE = { title: 'TypeScript Playground · Debug', code: [], steps: [] };
  appState.DEBUG_SESSION = {
    active: false,
    finished: false,
    crashed: false,
    error: null,
    errorLine: -1,
    returnValue: undefined,
    compiledFn: null,
    originalLines: [],
    callExpr: 'undefined',
  };
  appState.RUNTIME_ERROR_LINES.clear();
  appState.cur = 0;
  appState.watched = new Set();
  appState.SEEN_VARS_EVER = new Set();
  appState.layoutSpan = Object.create(null);
  uiHooks.renderPicker();
  uiHooks.renderStatic(0);
  uiHooks.updateEditorChrome();
}
