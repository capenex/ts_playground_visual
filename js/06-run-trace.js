/* ================================================================
   TypeScript Playground — run / trace
   Part 6/10 · loaded in order from index.html (classic script;
   shares the global lexical scope with the other parts).
   ================================================================ */

/* ================================================================
   4) Run / trace (with step & time circuit-breakers + post-enrichment)
   ================================================================ */
function say(msg, cls, line) {
  const d = document.createElement('div');
  if (cls) d.className = cls;
  if (line) {
    d.className = (cls ? cls + ' ' : '') + 'diag';
    if (d.setAttribute) {
      d.setAttribute('data-line', String(line));
      d.setAttribute('title', '点击定位到第 ' + line + ' 行');
    }
  }
  d.textContent = msg;
  logEl.appendChild(d);
  logEl.scrollTop = logEl.scrollHeight;
}

/* clicking a diagnostic in the log jumps to (and highlights) its line */
if (logEl && logEl.addEventListener) {
  logEl.addEventListener('click', e => {
    const target = e && e.target && e.target.closest ? e.target.closest('.diag') : null;
    if (!target || !target.getAttribute) return;
    revealErrorLine(parseInt(target.getAttribute('data-line'), 10), true);
  });
}

function clearLog(msg) {
  logEl.innerHTML = '';
  if (msg) say(msg, 'dim');
}

/* V8 wraps a Function body in extra lines; measure it instead of hard-coding.
   Stack frames look like `at boom (eval at f (file:12:3), <anonymous>:6:9)` — the
   `<anonymous>` location after the comma is the one inside the compiled body. */
function anonStackLine(stack) {
  const re = /,\s*<anonymous>:(\d+):\d+/g;
  const m = re.exec(String(stack || ''));
  return m ? parseInt(m[1], 10) : 0;
}

let FN_BODY_LINE_OFFSET = null;
function fnBodyLineOffset() {
  if (FN_BODY_LINE_OFFSET !== null) return FN_BODY_LINE_OFFSET;
  let off = 2;
  try {
    new Function('throw new Error("probe")')();
  } catch (e) {
    const line = anonStackLine(e && e.stack);
    if (line > 0) off = Math.max(1, line - 1);
  }
  FN_BODY_LINE_OFFSET = off;
  return off;
}

/* Map a compiled-function stack line back to the editor line it came from.
   The generated body is: line 1 = checkpoint stub, source line 1 starts on body line 2. */
function sourceLineFromStack(stack, lineCount) {
  const stackLine = anonStackLine(stack);
  if (!stackLine) return 0;
  const line = stackLine - fnBodyLineOffset() - 1;
  if (!isFinite(line) || line < 1) return 0;
  if (lineCount && line > lineCount) return 0;   // threw inside the evaluation wrapper, not user code
  return line;
}

/* Compile & evaluate one call. `opts.budgetMs` arms the loop watchdog: the instrumented
   `__t(line)` hooks count executions and throw once the wall-clock budget is spent, so a
   runaway loop is aborted on the spot and we still know which source line kept spinning. */
function safeJSONStringify(val) {
  if (val === undefined) return '(undefined)';
  try {
    const seen = new WeakSet();
    return JSON.stringify(val, (k, v) => {
      if (v !== null && typeof v === 'object') {
        if (seen.has(v)) return '[Circular]';
        seen.add(v);
        if (Array.isArray(v) && v.length > 60) {
          return [
            ...v.slice(0, 20),
            `… (共 ${v.length} 项)`,
            ...v.slice(v.length - 5),
          ];
        }
      }
      return v;
    });
  } catch (_) {
    try { return String(val); } catch (__) { return '[Object]'; }
  }
}

/* ================================================================
   4.1) Deterministic Virtual Event Loop Sandbox (Promise / async-await / setTimeout / queueMicrotask)
   Executes microtasks and timer macrotasks deterministically so step-by-step replay
   and PAUSE_SIGNAL unwinding work across async boundaries.
   ================================================================ */
function hasAsyncConstructs(src) {
  if (!src || typeof src !== 'string') return false;
  const clean = blankStrings(src);
  return /\b(?:async|await|Promise|setTimeout|queueMicrotask|sleep)\b/.test(clean);
}

function createVirtualEventLoop(__t, getCurLine, onSuspendFrame, onResumeFrame) {
  let promiseSeq = 0;
  let microSeq = 0;
  let macroSeq = 0;
  let coroSeq = 0;

  const loop = {
    used: false,
    virtualTime: 0,
    phase: 'sync', // 'sync' | 'microtask' | 'macrotask' | 'idle'
    activeTaskLabel: '主线程同步栈 (Sync)',
    coroutines: [],
    microtasks: [],
    macrotasks: [],
    promises: [],
    globalSnapFn: null,
  };

  function rethrowIfControlSignal(err) {
    if (err && (err === PAUSE_SIGNAL || err.__debugPause || err.__timeout)) {
      throw err;
    }
  }

  function enqueueMicrotask(item) {
    loop.used = true;
    const task = {
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

  class VirtualPromise {
    constructor(executor, label) {
      loop.used = true;
      this.__isVirtualPromise = true;
      this.id = ++promiseSeq;
      this.label = label || ('Promise#' + this.id);
      this.state = 'pending';
      this.value = undefined;
      this.reason = undefined;
      this.line = getCurLine() || 1;
      this._handlers = [];
      loop.promises.push(this);

      const resolve = (val) => this._resolve(val);
      const reject = (reason) => this._reject(reason);
      if (typeof executor === 'function') {
        try {
          executor(resolve, reject);
        } catch (err) {
          rethrowIfControlSignal(err);
          this._reject(err);
        }
      }
    }

    _resolve(val) {
      if (this.state !== 'pending') return;
      if (val && (val.__isVirtualPromise || typeof val.then === 'function')) {
        try {
          val.then((v) => this._resolve(v), (r) => this._reject(r));
        } catch (err) {
          rethrowIfControlSignal(err);
          this._reject(err);
        }
        return;
      }
      this.state = 'fulfilled';
      this.value = val;
      this._flush();
    }

    _reject(reason) {
      if (this.state !== 'pending') return;
      this.state = 'rejected';
      this.reason = reason;
      this._flush();
    }

    _flush() {
      if (this.state === 'pending') return;
      const pending = this._handlers.splice(0, this._handlers.length);
      for (const h of pending) {
        this._scheduleHandler(h);
      }
    }

    _scheduleHandler(h) {
      const isFulfilled = this.state === 'fulfilled';
      const cb = isFulfilled ? h.onFulfilled : h.onRejected;
      const arg = isFulfilled ? this.value : this.reason;
      enqueueMicrotask({
        label: h.label || (this.label + (isFulfilled ? '.then' : '.catch')),
        line: h.line || this.line || 1,
        isInternalAwait: Boolean(h.isInternalAwait),
        rawCb: cb,
        run: () => {
          if (typeof cb !== 'function') {
            if (isFulfilled) h.child._resolve(arg);
            else h.child._reject(arg);
            return;
          }
          try {
            // If user wrote a single-line callback without inner __t hooks, emit a trace step for the microtask
            const cbSrc = Function.prototype.toString.call(cb);
            if (!h.isInternalAwait && !cbSrc.includes('__t(') && typeof __t === 'function') {
              __t(h.line || 1, '⚡ [微任务 Microtask] ' + (h.label || 'Promise.then'), loop.globalSnapFn);
            }
            const res = cb(arg);
            h.child._resolve(res);
          } catch (err) {
            rethrowIfControlSignal(err);
            h.child._reject(err);
          }
        },
      });
    }

    then(onFulfilled, onRejected, metaLabel, isInternalAwait) {
      const callLine = getCurLine() || this.line || 1;
      const child = new VirtualPromise(null, metaLabel || (this.label + '.then'));
      // Hide internal child promises created purely for chaining from cluttering the promise list if needed
      if (isInternalAwait) child._internal = true;
      const handler = {
        onFulfilled,
        onRejected,
        child,
        line: callLine,
        label: metaLabel || (this.label + '.then'),
        isInternalAwait: Boolean(isInternalAwait),
      };
      if (this.state === 'pending') {
        this._handlers.push(handler);
      } else {
        this._scheduleHandler(handler);
      }
      return child;
    }

    catch(onRejected) {
      return this.then(null, onRejected, this.label + '.catch');
    }

    finally(onFinally) {
      return this.then(
        (v) => {
          if (typeof onFinally === 'function') onFinally();
          return v;
        },
        (err) => {
          if (typeof onFinally === 'function') onFinally();
          throw err;
        },
        this.label + '.finally'
      );
    }

    static resolve(val) {
      loop.used = true;
      if (val && val.__isVirtualPromise) return val;
      return new VirtualPromise((res) => res(val), 'Promise.resolve(' + formatShortVal(val) + ')');
    }

    static reject(reason) {
      loop.used = true;
      return new VirtualPromise((_, rej) => rej(reason), 'Promise.reject(' + formatShortVal(reason) + ')');
    }

    static all(items) {
      loop.used = true;
      const arr = Array.from(items || []);
      return new VirtualPromise((resolve, reject) => {
        if (arr.length === 0) { resolve([]); return; }
        const out = new Array(arr.length);
        let left = arr.length;
        arr.forEach((item, idx) => {
          VirtualPromise.resolve(item).then((val) => {
            out[idx] = val;
            if (--left === 0) resolve(out);
          }, reject);
        });
      }, 'Promise.all');
    }

    static race(items) {
      loop.used = true;
      const arr = Array.from(items || []);
      return new VirtualPromise((resolve, reject) => {
        arr.forEach((item) => {
          VirtualPromise.resolve(item).then(resolve, reject);
        });
      }, 'Promise.race');
    }
  }

  const env = {
    Promise: VirtualPromise,
    queueMicrotask(cb) {
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
        status: 'waiting',
        cb,
        args,
      });
      return id;
    },
    clearTimeout(id) {
      const t = loop.macrotasks.find(m => m.id === id && m.status === 'waiting');
      if (t) t.status = 'cancelled';
    },
    sleep(ms = 0, val = undefined) {
      loop.used = true;
      const d = Math.max(0, Number(ms) || 0);
      return new VirtualPromise((resolve) => {
        env.setTimeout(() => resolve(val), d);
      }, `sleep(${d}ms)`);
    },
  };

  function runAsyncCoroutine(genFn, self, fnName, defLine) {
    loop.used = true;
    const coro = {
      id: ++coroSeq,
      name: fnName || 'async',
      line: defLine || getCurLine() || 1,
      status: 'running',
      awaitExpr: null,
      fid: 0,
    };
    loop.coroutines.push(coro);
    const outPromise = new VirtualPromise(null, `${coro.name}()`);
    let gen;
    try {
      gen = genFn.call(self);
    } catch (err) {
      rethrowIfControlSignal(err);
      coro.status = 'rejected';
      outPromise._reject(err);
      return outPromise;
    }

    function drive(method, arg) {
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
      const isAwaitDesc = yielded && typeof yielded === 'object' && yielded.__isAwait;
      const awaitedVal = isAwaitDesc ? yielded.value : yielded;
      const fid = isAwaitDesc ? yielded.fid : 0;
      const awaitLine = (isAwaitDesc && yielded.line) ? yielded.line : getCurLine() || coro.line;
      const awaitExpr = (isAwaitDesc && yielded.expr) ? yielded.expr : 'await';

      coro.status = 'suspended';
      coro.line = awaitLine;
      coro.awaitExpr = awaitExpr;
      coro.fid = fid;
      if (fid && typeof onSuspendFrame === 'function') {
        onSuspendFrame(fid, awaitLine, awaitExpr);
      }

      const awaitedPromise = VirtualPromise.resolve(awaitedVal);
      awaitedPromise.then(
        (resolvedVal) => {
          if (fid && typeof onResumeFrame === 'function') {
            onResumeFrame(fid);
          }
          drive('next', resolvedVal);
        },
        (rejectedReason) => {
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

  function drainEventLoop(entryVal, fallbackSnapFn) {
    if (fallbackSnapFn && !loop.globalSnapFn) loop.globalSnapFn = fallbackSnapFn;
    if (!loop.used) return entryVal;

    let safety = 0;
    while (safety++ < 2000) {
      // 1. Drain all queued microtasks (FIFO)
      const nextMicro = loop.microtasks.find(m => m.status === 'queued');
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

      // 2. Pick the earliest waiting macrotask timer
      let bestMacro = null;
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

    if (entryVal && entryVal.__isVirtualPromise) {
      if (entryVal.state === 'rejected') {
        throw entryVal.reason instanceof Error ? entryVal.reason : new Error(String(entryVal.reason));
      }
      if (entryVal.state === 'fulfilled') {
        return entryVal.value;
      }
    }
    return entryVal;
  }

  function toVizSnapshot() {
    return {
      kind: 'eventloop',
      now: loop.virtualTime,
      virtualTime: loop.virtualTime,
      phase: loop.phase,
      activeTask: loop.activeTaskLabel,
      activeTaskLabel: loop.activeTaskLabel,
      coroutines: loop.coroutines.slice(-8).map(c => ({
        id: c.id,
        name: c.name,
        line: c.line,
        status: c.status,
        awaitExpr: c.awaitExpr,
        awaitingExpr: c.awaitExpr,
      })),
      microtasks: loop.microtasks.filter(m => m.status !== 'done').concat(
        loop.microtasks.filter(m => m.status === 'done').slice(-3)
      ).slice(0, 8).map(m => ({
        id: m.id,
        label: m.label,
        line: m.line,
        status: m.status,
      })),
      macrotasks: loop.macrotasks.filter(m => m.status !== 'done' && m.status !== 'cancelled').concat(
        loop.macrotasks.filter(m => m.status === 'done').slice(-3)
      ).slice(0, 8).map(m => ({
        id: m.id,
        label: m.label,
        delay: m.delay,
        due: m.fireAt,
        fireAt: m.fireAt,
        line: m.line,
        status: m.status,
      })),
      promises: loop.promises.filter(p => !p._internal).slice(-8).map(p => ({
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

function evalCall(js, call, opts) {
  const o = opts || {};
  const expr = stripTypes(call || 'undefined');
  const budgetMs = o.budgetMs || 0;
  const entryLine = o.entryLine || 0;
  const stub = o.instrumented ? '' : 'var checkpoint = function(){}, 断点 = checkpoint;\n';
  const t0 = Date.now();
  let ticks = 0;
  let lastLine = 0;
  let expired = false;
  const timeoutError = () => {
    const err = new Error('RUN_TIMEOUT');
    err.__timeout = true;
    err.__line = lastLine;
    return err;
  };
  const __t = function (line) {
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
  __t.__await = (val, fid, line, exprText) => ({ __isAwait: true, value: val, fid, line, expr: exprText });
  __t.__drain = evLoop.drainEventLoop;
  __t.__initGlobal = function (snapFn) { evLoop.loop.globalSnapFn = snapFn; };
  __t.__ckpt = function () {};
  const body = stub + js + '\n;return (function(){ try { var __v = (' + expr + '); if (__t && __t.__drain) __v = __t.__drain(__v); return { ok:true, value:__v }; } catch (e) { return { ok:false, error: e && e.message ? e.message : String(e), stack: e && e.stack ? String(e.stack) : "", line: (e && e.__line) || 0, timeout: Boolean(e && e.__timeout) }; } })();';
  const logs = [];
  const f = new Function('__t', 'console', body);
  let r;
  try {
    r = f(__t, { log: (...a) => logs.push(a.map(x => {
      try { return typeof x === 'object' ? JSON.stringify(x) : String(x); } catch (_) { return String(x); }
    }).join(' ')) });
  } catch (e) {
    // A throw from top-level code (outside the evaluated expression) lands here.
    r = {
      ok: false,
      error: e && e.message ? e.message : String(e),
      stack: e && e.stack ? String(e.stack) : '',
      line: (e && e.__line) || lastLine || entryLine || 0,
      timeout: Boolean(e && e.__timeout),
    };
  }
  if (r && r.ok && !r.line) r.line = lastLine || entryLine || 0;
  if (r && !r.ok) r.line = r.line || lastLine || entryLine || 0;
  return { ...r, logs, elapsedMs: Date.now() - t0 };
}

function runOnce(budgetMs) {
  if (LANG === 'python') return PY_ENGINE.runOnly(budgetMs);
  const budget = (typeof budgetMs === 'number' && budgetMs > 0) ? budgetMs : RUN_TIMEOUT_MS;
  const src = editor.value;
  const unsupported = detectUnsupportedSyntax(src);
  if (unsupported.length) {
    unsupported.forEach(x => say('✗ 第 ' + x.line + ' 行：暂不支持 ' + x.feature + ' —— ' + x.hint, 'err', x.line));
    revealErrorLine(unsupported[0].line);
    return;
  }
  const diags = typecheckTS(src, STRICT_TS);
  if (diags.length > 0) {
    reportTypeErrors(diags);
    return;
  }
  if (TYPE_ERROR_LINES.size || RUNTIME_ERROR_LINES.size) {
    TYPE_ERROR_LINES.clear();
    RUNTIME_ERROR_LINES.clear();
    updateEditorChrome();
  }
  const enums = transpileEnums(src);
  if (enums.error) {
    say('✗ 第 ' + enums.error.line + ' 行：' + enums.error.message, 'err', enums.error.line);
    revealErrorLine(enums.error.line);
    return;
  }
  const js = stripTypes(enums.code);
  const originalLines = src.replace(/\r/g, '').split('\n');
  const entry = resolveEntry(src, js);
  const call = stripTypes(entry.expr || 'undefined');
  ENTRY_CALL_LINE = entry.line || 0;
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
    r.logs.forEach(l => say('  log: ' + l, 'dim'));

    if (!r.ok && r.timeout) {
      const line = r.line || 0;
      const snippet = line ? (originalLines[line - 1] || '').trim().slice(0, 90) : '';
      if (line) {
        RUNTIME_ERROR_LINES.add(line);
        updateEditorChrome();
        revealErrorLine(line);
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
        RUNTIME_ERROR_LINES.add(line);
        updateEditorChrome();
        say('✗ 第 ' + line + ' 行运行时报错: ' + r.error, 'err', line);
        revealErrorLine(line);
      } else {
        say('✗ 调用失败: ' + r.error, 'err');
      }
      return;
    }
    const elapsed = ' (' + r.elapsedMs + 'ms)';
    say('✓ 运行完成  →  ' + safeJSONStringify(r.value) + elapsed, 'ok');
  } catch (e) {
    say('✗ ' + (e && e.message ? e.message : e), 'err');
  }
}

function formatCallArgItem(val) {
  if (val === undefined) return 'undefined';
  if (val === null) return 'null';
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (typeof val === 'string') {
    return val.length > 10 ? JSON.stringify(val.slice(0, 8) + '…') : JSON.stringify(val);
  }
  if (Array.isArray(val)) {
    if (val.length === 0) return '[]';
    if (Array.isArray(val[0])) return `[${val.length}×${val[0].length}]`;
    if (val.length <= 4) return '[' + val.map(x => formatCallArgItem(x)).join(', ') + ']';
    return '[' + val.slice(0, 3).map(x => formatCallArgItem(x)).join(', ') + ', …]';
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

function formatCallFrameLabel(fnName, paramNames, paramVals) {
  const vals = Array.isArray(paramVals) ? paramVals : [];
  if (!vals.length) return `${fnName}()`;
  const isPrimitive = (v) => v === null || v === undefined || typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean';
  const primVals = vals.filter(isPrimitive);
  const hasComplex = vals.some(v => !isPrimitive(v));
  // If a function takes a container alongside >=2 numeric range indices (e.g. mergeSort(arr, 0, 7)), display the numeric indices cleanly as mergeSort(0, 7)
  if (hasComplex && primVals.length >= 2 && primVals.every(v => typeof v === 'number')) {
    return `${fnName}(${primVals.map(v => formatCallArgItem(v)).join(', ')})`;
  }
  return `${fnName}(${vals.map(v => formatCallArgItem(v)).join(', ')})`;
}

function buildFrameSnapshotFromClosure(frame, fallbackLine, noteForEnrich) {
  const raw = (typeof frame.snapFn === 'function' ? frame.snapFn() : {}) || {};
  if (frame.self && typeof frame.self === 'object') {
    try {
      const selfCopy = {};
      for (const k in frame.self) { try { selfCopy[k] = frame.self[k]; } catch (e) {} }
      raw['this'] = selfCopy;
    } catch (e) {}
  }
  const v = {};
  Object.keys(raw).forEach(k => {
    const val = raw[k];
    v[k] = (val !== null && typeof val === 'object') ? cloneDeepBounded(val, 2) : val;
  });
  const ds = {};
  Object.keys(raw).forEach(name => {
    const d = classifyValue(name, raw[name]);
    if (d) ds[name] = d;
  });
  populateInterfaceSchemas(ds);
  enrichFromNote(ds, raw, noteForEnrich || '');
  const win = detectWindowRange(raw);
  const snapFrame = {
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
function computeAndAppendNextStep(opts = {}) {
  if (!DEBUG_SESSION.active || DEBUG_SESSION.finished) return false;
  const targetIdx = TRACE.steps.length;
  if (targetIdx >= MAX_STEPS) {
    DEBUG_SESSION.finished = true;
    DEBUG_SESSION.crashed = true;
    DEBUG_SESSION.error = '已达单次调试上限，自动熔断以防死循环';
    say('✗ ' + DEBUG_SESSION.error, 'err');
    return false;
  }

  const originalLines = DEBUG_SESSION.originalLines;
  const callIdx = originalLines.findIndex(l => /\/\/\s*调用[:：]/.test(l));
  const globalCallLine = callIdx >= 0 ? callIdx + 1 : (ENTRY_CALL_LINE || 1);

  let count = 0;
  let frameSeq = 0;
  let curLineTracker = globalCallLine;
  let activeRecording = false;
  let unwindingPause = false;
  let pendingStep = null;
  let pendingStepSnapFn = null;
  let pendingEventLoopPhase = null;
  let nextVRaw = null;
  const stepLogs = [];
  const t0 = Date.now();

  const liveCallStack = [
    {
      id: 0,
      fn: 'global',
      label: 'global',
      line: globalCallLine,
      lastLine: globalCallLine,
      snapFn: null,
    },
  ];
  const suspendedFrames = new Map();

  const evLoop = createVirtualEventLoop(
    (line, note, snap, self) => __t(line, note, snap, self),
    () => curLineTracker,
    (fid) => {
      if (unwindingPause) return;
      for (let k = liveCallStack.length - 1; k >= 1; k--) {
        if (liveCallStack[k].id === fid) {
          const [removed] = liveCallStack.splice(k, 1);
          suspendedFrames.set(fid, removed);
          break;
        }
      }
    },
    (fid) => {
      if (unwindingPause) return;
      if (suspendedFrames.has(fid)) {
        const frame = suspendedFrames.get(fid);
        suspendedFrames.delete(fid);
        liveCallStack.push(frame);
      }
    }
  );
  if (DEBUG_SESSION.hasAsync) {
    evLoop.loop.used = true;
  }

  const __t = (line, note, snap, self) => {
    if (line) curLineTracker = line;
    const idx = count++;
    if ((idx & 63) === 63 && Date.now() - t0 > MAX_EXEC_MS) {
      throw new Error('执行超时 (>' + MAX_EXEC_MS + 'ms)，自动熔断以防页面卡死');
    }
    const topFrame = liveCallStack[liveCallStack.length - 1];
    if (topFrame) {
      topFrame.lastLine = line;
      if (snap) topFrame.snapFn = snap;
      if (self && typeof self === 'object') topFrame.self = self;
    }
    if (idx < targetIdx) {
      return;
    }
    if (idx === targetIdx) {
      const effectiveSnap = snap || (topFrame && topFrame.snapFn) || evLoop.loop.globalSnapFn;
      const vRaw = (typeof effectiveSnap === 'function' ? effectiveSnap() : effectiveSnap) || {};
      if (self && typeof self === 'object') {
        try {
          const selfCopy = {};
          for (const k in self) { try { selfCopy[k] = self[k]; } catch (e) {} }
          vRaw['this'] = selfCopy;
        } catch (e) {}
      }
      const v = {};
      Object.keys(vRaw).forEach(k => {
        const val = vRaw[k];
        v[k] = (val !== null && typeof val === 'object') ? cloneDeepBounded(val, 2) : val;
      });
      const ds = {};
      Object.keys(vRaw).forEach(name => {
        const d = classifyValue(name, vRaw[name]);
        if (d) ds[name] = d;
      });
      enrichFromNote(ds, vRaw, note);
      const win = detectWindowRange(vRaw);
      const capturedStack = liveCallStack.map((fr, fIdx) => {
        const isTop = fIdx === liveCallStack.length - 1;
        const fNote = isTop ? note : (originalLines[(fr.lastLine || fr.line || 1) - 1] || '');
        return buildFrameSnapshotFromClosure(fr, isTop ? line : fr.line, fNote);
      });
      pendingStepSnapFn = effectiveSnap;
      pendingEventLoopPhase = {
        phase: evLoop.loop.phase,
        activeTaskLabel: evLoop.loop.activeTaskLabel,
        virtualTime: evLoop.loop.virtualTime,
      };
      pendingStep = {
        line,
        note,
        v,
        vRaw,
        ds,
        callStack: capturedStack,
        isCheckpoint: false,
        checkpointVals: null,
        error: null,
      };
      if (win) { pendingStep.l = win[0]; pendingStep.r = win[1]; }
      activeRecording = true;
      return;
    }
    if (idx === targetIdx + 1) {
      activeRecording = false;
      unwindingPause = true;
      const sameScopeRaw = (typeof pendingStepSnapFn === 'function' ? pendingStepSnapFn() : null);
      nextVRaw = sameScopeRaw || (typeof snap === 'function' ? snap() : snap) || {};
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
      snapFn,
    });
    return fid;
  };

  __t.__leave = (fid) => {
    if (unwindingPause) return;
    suspendedFrames.delete(fid);
    for (let k = liveCallStack.length - 1; k >= 1; k--) {
      if (liveCallStack[k].id === fid) {
        liveCallStack.splice(k, 1);
        break;
      }
    }
  };

  __t.__ckpt = (args) => {
    if (activeRecording && pendingStep) {
      pendingStep.isCheckpoint = true;
      pendingStep.checkpointVals = (args || []).map(a => formatShortVal(a));
    }
  };

  __t.__fin = (snap) => {
    if (activeRecording) {
      activeRecording = false;
      const sameScopeRaw = (typeof pendingStepSnapFn === 'function' ? pendingStepSnapFn() : null);
      nextVRaw = sameScopeRaw || (typeof snap === 'function' ? snap() : snap) || {};
    }
  };

  const customConsole = {
    log: (...a) => {
      if (!activeRecording) return;
      stepLogs.push(a.map(x => {
        try { return typeof x === 'object' ? JSON.stringify(x) : String(x); } catch (_) { return String(x); }
      }).join(' '));
    }
  };

  let paused = false;
  let runtimeErr = null;
  let retVal = undefined;

  try {
    retVal = DEBUG_SESSION.compiledFn(__t, customConsole);
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
      const errMsg = runtimeErr && runtimeErr.message ? runtimeErr.message : String(runtimeErr);
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
      TRACE.steps.push(errStep);
      RUNTIME_ERROR_LINES.add(callLine);
      DEBUG_SESSION.finished = true;
      DEBUG_SESSION.crashed = true;
      DEBUG_SESSION.error = errMsg;
      DEBUG_SESSION.errorLine = callLine;
      say('✗ 运行时错误 [第 ' + callLine + ' 行]: ' + errMsg + '（已停止在报错处）', 'err');
      return true;
    }
    // If the file only defines interface/type schemas without executable steps yet, synthesize an inspection step
    if (targetIdx === 0 && CURRENT_TS_META.interfaces && CURRENT_TS_META.interfaces.size > 0) {
      const firstIface = [...CURRENT_TS_META.interfaces.values()][0];
      const schemaDs = {};
      populateInterfaceSchemas(schemaDs);
      const schemaStep = {
        line: firstIface.line || 1,
        note: `interface ${firstIface.name} { ${firstIface.fields.map(f => f.k + (f.optional ? '?' : '') + ': ' + f.declaredType).join('; ')} }`,
        v: {},
        ds: schemaDs,
        callStack: [{ id: 0, fn: 'global', label: 'global', line: firstIface.line || 1, v: {}, ds: schemaDs }],
        anim: null,
        isCheckpoint: false,
        error: null,
        isFinalReturn: true,
      };
      TRACE.steps.push(schemaStep);
      DEBUG_SESSION.finished = true;
      DEBUG_SESSION.returnValue = retVal;
      return true;
    }
    DEBUG_SESSION.finished = true;
    DEBUG_SESSION.returnValue = retVal;
    return false;
  }

  const rawLine = originalLines[pendingStep.line - 1] || pendingStep.note || '';
  const nextContext = Object.assign({}, nextVRaw || pendingStep.vRaw);
  if (pendingStep.checkpointVals) {
    nextContext.__ckptVals = pendingStep.checkpointVals;
  }

  // Update primitive/Promise summary values in `pendingStep.v` if a variable was initialized on this line
  if (nextVRaw) {
    Object.keys(nextVRaw).forEach(name => {
      const nv = nextVRaw[name];
      if (nv && nv.__isVirtualPromise) {
        pendingStep.v[name] = cloneDeepBounded(nv, 2);
      }
      if (pendingStep.vRaw[name] === undefined && nv !== undefined && !pendingStep.ds[name]) {
        const d = classifyValue(name, nv);
        if (d) pendingStep.ds[name] = d;
      }
    });
  }
  populateInterfaceSchemas(pendingStep.ds);
  enrichFromNote(pendingStep.ds, nextVRaw || pendingStep.vRaw, rawLine);

  if (evLoop.loop.used) {
    const elSnap = evLoop.toVizSnapshot();
    if (pendingEventLoopPhase) {
      elSnap.phase = pendingEventLoopPhase.phase;
      elSnap.activeTaskLabel = pendingEventLoopPhase.activeTaskLabel;
      elSnap.virtualTime = pendingEventLoopPhase.virtualTime;
    }
    pendingStep.ds['eventLoop'] = elSnap;
  }

  if (pendingStep.callStack && pendingStep.callStack.length > 0) {
    const topF = pendingStep.callStack[pendingStep.callStack.length - 1];
    topF.line = pendingStep.line;
    topF.v = pendingStep.v;
    topF.ds = pendingStep.ds;
  }

  const derived = deriveAnimAndNote(rawLine, pendingStep.vRaw, nextContext);
  delete pendingStep.vRaw;
  pendingStep.anim = derived.anim;
  pendingStep.rawNote = pendingStep.note;
  pendingStep.note = derived.note || pendingStep.note;
  if (derived.isCheckpoint) {
    pendingStep.isCheckpoint = true;
  }

  if (runtimeErr) {
    const errMsg = runtimeErr && runtimeErr.message ? runtimeErr.message : String(runtimeErr);
    pendingStep.error = errMsg;
    pendingStep.note = `${rawLine.trim()}  →  ✗ 运行时错误: ${errMsg}`;
    RUNTIME_ERROR_LINES.add(pendingStep.line);
    DEBUG_SESSION.finished = true;
    DEBUG_SESSION.crashed = true;
    DEBUG_SESSION.error = errMsg;
    DEBUG_SESSION.errorLine = pendingStep.line;
  } else if (!paused) {
    DEBUG_SESSION.finished = true;
    DEBUG_SESSION.returnValue = retVal;
    pendingStep.isFinalReturn = true;
    pendingStep.returnValue = retVal;
  }

  TRACE.steps.push(pendingStep);

  discoverVars().forEach(s => {
    if (!SEEN_VARS_EVER.has(s.id)) {
      SEEN_VARS_EVER.add(s.id);
      if (!URL_WATCH || !URL_WATCH.length || URL_WATCH.includes(s.id)) {
        watched.add(s.id);
      }
    }
  });

  if (runtimeErr) {
    say('✗ 运行时错误 [第 ' + pendingStep.line + ' 行]: ' + pendingStep.error + '（已运行到报错为止）', 'err');
  } else if (!paused && !opts.silent) {
    say('✓ 调试运行完成  →  ' + safeJSONStringify(retVal), 'ok');
  }

  return true;
}

/* Full TypeScript syntax (decorators, abstract classes, constructor parameter properties,
   namespaces, declare, static blocks) is now supported directly by stripTypes & typecheckTS. */
function detectUnsupportedSyntax(_src) {
  return [];
}

function startDebug(initialStep = 0) {
  if (LANG === 'python') return PY_ENGINE.start(initialStep);
  SELECTED_FRAME_IDX = null;
  const src = editor.value.replace(/\r/g, '');
  const unsupported = detectUnsupportedSyntax(src);
  if (unsupported.length) {
    resetTraceState();
    unsupported.forEach(x => say('✗ 第 ' + x.line + ' 行：暂不支持 ' + x.feature + ' —— ' + x.hint, 'err', x.line));
    revealErrorLine(unsupported[0].line);
    return false;
  }
  extractTsInterfaceMetadata(src);
  const diags = typecheckTS(src, STRICT_TS);
  if (diags.length > 0) {
    resetTraceState();
    reportTypeErrors(diags);
    return false;
  }
  if (TYPE_ERROR_LINES.size || RUNTIME_ERROR_LINES.size) {
    TYPE_ERROR_LINES.clear();
    RUNTIME_ERROR_LINES.clear();
  }

  const originalLines = src.split('\n');
  const enums = transpileEnums(src);
  if (enums.error) {
    resetTraceState();
    say('✗ 第 ' + enums.error.line + ' 行：' + enums.error.message, 'err', enums.error.line);
    revealErrorLine(enums.error.line);
    return false;
  }
  const js0 = stripTypes(enums.code);
  const entry = resolveEntry(src, js0);
  const expr = stripTypes(entry.expr || 'undefined');
  ENTRY_CALL_LINE = entry.line || 0;
  const jsBody = entry.index >= 0 ? blankJsLine(js0, entry.index) : js0;

  let compiledFn;
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
    say('✗ 编译失败: ' + (e && e.message ? e.message : e), 'err');
    return false;
  }

  stopAuto();
  clearFlyLayer();
  TRACE = {
    title: 'TypeScript Playground · Debug',
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
    hasAsync: hasAsyncConstructs(src),
  };
  cur = 0;
  watched = new Set();
  SEEN_VARS_EVER = new Set();
  layoutSpan = Object.create(null);

  const target = Math.max(0, initialStep || 0);
  for (let s = 0; s <= target; s++) {
    const ok = computeAndAppendNextStep({ silent: s < target });
    if (!ok || DEBUG_SESSION.finished) break;
  }

  cur = Math.max(0, TRACE.steps.length - 1);
  initWatchedVars();
  renderPicker();
  renderStatic(cur, false);

  if (!DEBUG_SESSION.crashed) {
    say('✓ 编译通过 · 已进入 Debug 模式（每走一步当场计算，可随时步进或运行到下一个检查点）', 'ok');
  }
  return true;
}

const generateTrace = startDebug;

function initWatchedVars() {
  const all = discoverVars().map(s => s.id);
  all.forEach(id => SEEN_VARS_EVER.add(id));
  if (URL_WATCH && URL_WATCH.length) {
    const filtered = all.filter(id => URL_WATCH.includes(id));
    watched = new Set(filtered.length ? filtered : all);
  } else {
    watched = new Set(all);
  }
}

function resetTraceState() {
  stopAuto();
  clearFlyLayer();
  TRACE = { title: 'TypeScript Playground · Debug', code: [], steps: [] };
  DEBUG_SESSION = {
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
  RUNTIME_ERROR_LINES.clear();
  cur = 0;
  watched = new Set();
  SEEN_VARS_EVER = new Set();
  layoutSpan = Object.create(null);
  renderPicker();
  renderStatic(0);
  updateEditorChrome();
}
