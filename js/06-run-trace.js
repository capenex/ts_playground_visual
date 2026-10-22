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
  __t.__initGlobal = function () {};
  __t.__ckpt = function () {};
  const body = stub + js + '\n;return (function(){ try { return { ok:true, value:(' + expr + ') }; } catch (e) { return { ok:false, error: e && e.message ? e.message : String(e), stack: e && e.stack ? String(e.stack) : "", line: (e && e.__line) || 0, timeout: Boolean(e && e.__timeout) }; } })();';
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
  let activeRecording = false;
  let unwindingPause = false;
  let pendingStep = null;
  let pendingStepSnapFn = null;
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

  const __t = (line, note, snap, self) => {
    const idx = count++;
    if ((idx & 63) === 63 && Date.now() - t0 > MAX_EXEC_MS) {
      throw new Error('执行超时 (>' + MAX_EXEC_MS + 'ms)，自动熔断以防页面卡死');
    }
    const topFrame = liveCallStack[liveCallStack.length - 1];
    if (topFrame) {
      topFrame.lastLine = line;
      topFrame.snapFn = snap;
      if (self && typeof self === 'object') topFrame.self = self;
    }
    if (idx < targetIdx) {
      return;
    }
    if (idx === targetIdx) {
      const vRaw = (typeof snap === 'function' ? snap() : snap) || {};
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
      pendingStepSnapFn = snap;
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

  __t.__initGlobal = (globalSnapFn) => {
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

  // If the current line initializes a structured/interface variable (e.g. const u: User = { ... }), include it in ds on this step
  if (nextVRaw) {
    Object.keys(nextVRaw).forEach(name => {
      if (pendingStep.vRaw[name] === undefined && nextVRaw[name] !== undefined && !pendingStep.ds[name]) {
        const d = classifyValue(name, nextVRaw[name]);
        if (d) pendingStep.ds[name] = d;
      }
    });
  }
  populateInterfaceSchemas(pendingStep.ds);
  enrichFromNote(pendingStep.ds, nextVRaw || pendingStep.vRaw, rawLine);

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

/* Syntax we deliberately do not execute yet — report it in plain words instead of
   surfacing a raw `Unexpected token` from the JS engine. */
function detectUnsupportedSyntax(src) {
  const lines = String(src || '').replace(/\r\n?/g, '\n').split('\n');
  const issues = [];
  const add = (line, feature, hint) => {
    if (!issues.some(x => x.line === line && x.feature === feature)) issues.push({ line, feature, hint });
  };
  for (let i = 0; i < lines.length; i++) {
    const raw = blankStrings(stripInlineCommentSafe(lines[i]));
    const t = raw.trim();
    if (!t) continue;
    if (/^@[A-Za-z_$]/.test(t)) {
      add(i + 1, '装饰器 (decorator)', '去掉装饰器，或把装饰逻辑写成普通函数调用');
    }
    if (/\babstract\s+class\b/.test(t) || /^\s*(?:public|private|protected|static|readonly|async)?\s*abstract\b/.test(t)) {
      add(i + 1, 'abstract 抽象类 / 抽象方法', '改成普通类，用空实现或 throw 代替');
    }
    if (/^\s*declare\b/.test(t)) {
      add(i + 1, 'declare 环境声明', '删掉这一行（这里没有外部类型环境）');
    }
    if (/^\s*(?:export\s+)?(?:namespace|module)\s+[A-Za-z_$]/.test(t)) {
      add(i + 1, 'namespace / module', '改用普通对象或 ES 模块');
    }
    if (/constructor\s*\([^)]*\b(?:private|public|protected|readonly)\b[^)]*\)/.test(t)) {
      add(i + 1, '构造器参数属性 (constructor(private x))', '改成普通参数，再在构造器里写 this.x = x');
    }
    if (/^\s*static\s*\{/.test(t)) {
      add(i + 1, '静态初始化块 (static { ... })', '改成 static 方法，在入口处调用一次');
    }
  }
  return issues;
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
    const finHook = '\n;try{if(typeof __t==="function"&&__t.__fin)__t.__fin(' + snapFnExpr(names) + ');}catch(_){}\n';
    const body = js + finHook + ';return (' + expr + ');';
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
