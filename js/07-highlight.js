/* ================================================================
   TypeScript Playground — syntax highlight + active line tokens
   Part 7/10 · loaded in order from index.html (classic script;
   shares the global lexical scope with the other parts).
   ================================================================ */

/* ================================================================
   5) Syntax highlight + active-line expression tokens + inter-line viz
   ================================================================ */
function esc(t) {
  return String(t)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
/* Names that are always available even though the user never declares them.
   Everything else that is used without a declaration is rendered plain (white). */
const HIGHLIGHT_BUILTINS = new Set([
  'checkpoint', '断点', 'this', 'console', 'window', 'document', 'globalThis',
  'undefined', 'NaN', 'Infinity', 'Math', 'JSON', 'Object', 'Array', 'Number',
  'String', 'Boolean', 'Map', 'Set', 'Promise', 'Error', 'RegExp', 'Date',
  'parseInt', 'parseFloat', 'isNaN', 'setTimeout', 'clearTimeout',
]);

let DECLARED_NAMES_CACHE = { src: null, names: new Set() };

/* All names the current buffer actually declares: const/let/var (incl. destructuring),
   function & arrow params, loop/catch bindings, function/class/interface/type names. */
function collectDeclaredNames(src) {
  if (LANG === 'python') return PY_ENGINE.collectDeclared(src);
  const text = String(src == null ? '' : src);
  if (DECLARED_NAMES_CACHE.src === text) return DECLARED_NAMES_CACHE.names;

  const names = new Set();
  let js = text;
  try { js = stripTypes(text); } catch (_) { js = text; }
  try {
    collectNames(js).forEach(n => names.add(n));
  } catch (_) { /* keep what we have */ }
  let m;
  const typeRe = /\b(?:function|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g;
  const rawClean = blankStrings(text);
  while ((m = typeRe.exec(rawClean))) names.add(m[1]);
  const fnAssign = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b|\(|[A-Za-z_$][\w$]*\s*=>)/g;
  while ((m = fnAssign.exec(js))) names.add(m[1]);

  DECLARED_NAMES_CACHE = { src: text, names };
  return names;
}

function collectHighlightBuiltins(declared) {
  const source = LANG === 'python'
    ? ((typeof PY_ENGINE !== 'undefined' && PY_ENGINE.builtins) || [])
    : HIGHLIGHT_BUILTINS;
  const out = new Set();
  source.forEach(name => {
    if (!declared.has(name)) out.add(name);
  });
  return out;
}

function hl(t, declared) {
  if (LANG === 'python') return PY_ENGINE.hl(t, declared);
  const re = /(\/\/.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b(function|const|let|var|new|class|extends|typeof|instanceof|import|export|from|async|await|interface|type|as|satisfies)\b|\b(for|if|else|return|while|do|switch|case|break|continue|try|catch|finally|throw|yield)\b|\b(number|string|boolean|void|any|unknown|never|Math|Map|Set|Array|Object|JSON|Number|String|Boolean|Promise|Record|Error)\b|\b(true|false|null|undefined|\d+(?:\.\d+)?)\b|(\b[A-Za-z_$][\w$]*)(?=\s*\()|(?<=\.)([A-Za-z_$][\w$]*)\b|([{,][ \t]*)([A-Za-z_$][\w$]*)(?=[ \t]*:)|(^[ \t]*)([A-Za-z_$][\w$]*)(?=[ \t]*:)|\b([A-Za-z_$][\w$]*)\b|(===|!==|>=|<=|=>|&&|\|\||\+\+|--)/g;
  let out = '', last = 0, m;
  while ((m = re.exec(t))) {
    out += esc(t.slice(last, m.index));
    if (m[1]) out += '<span class="com">' + esc(m[1]) + '</span>';
    else if (m[2]) out += '<span class="str">' + esc(m[2]) + '</span>';
    else if (m[3]) out += '<span class="kw">' + esc(m[3]) + '</span>';
    else if (m[4]) out += '<span class="ctl">' + esc(m[4]) + '</span>';
    else if (m[5]) out += '<span class="' + (HIGHLIGHT_BUILTINS.has(m[5]) ? 'bi' : 'typ') + '">' + esc(m[5]) + '</span>';
    else if (m[6]) out += '<span class="num">' + esc(m[6]) + '</span>';
    else if (m[7]) {
      const id = m[7];
      const isMethod = m.index > 0 && t[m.index - 1] === '.';
      if (!isMethod && HIGHLIGHT_BUILTINS.has(id)) out += '<span class="bi">' + esc(id) + '</span>';
      else if (!declared || isMethod || declared.has(id)) out += '<span class="fn">' + esc(id) + '</span>';
      else out += esc(id);
    }
    else if (m[8]) out += '<span class="prop">' + esc(m[8]) + '</span>';
    else if (m[9]) out += esc(m[9]) + '<span class="prop">' + esc(m[10]) + '</span>';
    else if (m[11]) out += esc(m[11]) + '<span class="prop">' + esc(m[12]) + '</span>';
    else if (m[13]) {
      // Declared and built-in names get distinct colors; anything else stays plain white.
      if (!declared || declared.has(m[13])) out += '<span class="prop">' + esc(m[13]) + '</span>';
      else if (HIGHLIGHT_BUILTINS.has(m[13])) out += '<span class="bi">' + esc(m[13]) + '</span>';
      else out += esc(m[13]);
    }
    else if (m[14]) out += '<span class="op">' + esc(m[14]) + '</span>';
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
    const prev = idx > 0 ? line[idx - 1] : '';
    const next = idx + target.length < line.length ? line[idx + target.length] : '';
    const okStart = !startBoundary || !isIdentPart(prev);
    const okEnd = !endBoundary || !isIdentPart(next);
    if (okStart && okEnd) return idx;
    pos = idx + 1;
  }
  return -1;
}

function hlActiveLine(rawLine, anim, declared) {
  if (LANG === 'python') return PY_ENGINE.hlActiveLine(rawLine, anim, declared);
  if (!anim) return hl(rawLine, declared);
  const h = (s) => hl(s, declared);

  const declPrefix = rawLine.match(/^\s*(?:(?:export\s+)?(?:const|let|var)\b\s*)/);
  const lhsSearchStart = declPrefix ? declPrefix[0].length : 0;

  if (anim.type === 'assign' && anim.from && anim.to) {
    const toIdx = findExprSpan(rawLine, anim.to, lhsSearchStart);
    if (toIdx >= 0) {
      const afterTo = toIdx + anim.to.length;
      const eqPos = rawLine.indexOf('=', afterTo);
      const rhsSearchStart = eqPos >= 0 ? eqPos + 1 : afterTo;
      const fromIdx = findExprSpan(rawLine, anim.from, rhsSearchStart);
      if (fromIdx >= afterTo) {
        const p1 = rawLine.slice(0, toIdx);
        const p2 = rawLine.slice(toIdx, afterTo);
        const p3 = rawLine.slice(afterTo, fromIdx);
        const p4 = rawLine.slice(fromIdx, fromIdx + anim.from.length);
        const p5 = rawLine.slice(fromIdx + anim.from.length);
        return h(p1) +
          '<span class="tok-dst">' + h(p2) + '</span>' +
          h(p3) +
          '<span class="tok-src">' + h(p4) + '</span>' +
          h(p5);
      }
    }
  }

  if (anim.type === 'compare' && anim.lhs) {
    const condPrefix = rawLine.match(/^\s*(?:}\s*)?(?:(?:else\s+)?(?:if|while)\s*\(|for\s*\([^;]*;)/);
    const cmpStart = condPrefix ? condPrefix[0].length : 0;
    const lIdx = findExprSpan(rawLine, anim.lhs, cmpStart);
    if (lIdx >= 0) {
      if (anim.rhs) {
        const afterLhs = lIdx + anim.lhs.length;
        const opIdx = anim.op ? rawLine.indexOf(anim.op, afterLhs) : -1;
        const rhsStart = opIdx >= 0 ? opIdx + anim.op.length : afterLhs;
        const rIdx = findExprSpan(rawLine, anim.rhs, rhsStart);
        if (rIdx >= afterLhs) {
          const p1 = rawLine.slice(0, lIdx);
          const p2 = rawLine.slice(lIdx, afterLhs);
          const p3 = rawLine.slice(afterLhs, rIdx);
          const p4 = rawLine.slice(rIdx, rIdx + anim.rhs.length);
          const p5 = rawLine.slice(rIdx + anim.rhs.length);
          return h(p1) +
            '<span class="tok-cmp">' + h(p2) + '</span>' +
            h(p3) +
            '<span class="tok-cmp">' + h(p4) + '</span>' +
            h(p5);
        }
      }
      const afterLhs = lIdx + anim.lhs.length;
      return h(rawLine.slice(0, lIdx)) +
        '<span class="tok-cmp">' + h(rawLine.slice(lIdx, afterLhs)) + '</span>' +
        h(rawLine.slice(afterLhs));
    }
  }

  if (anim.type === 'checkpoint') {
    const fnName = anim.fn || 'checkpoint';
    const fnIdx = findExprSpan(rawLine, fnName, 0);
    if (fnIdx >= 0) {
      const p1 = rawLine.slice(0, fnIdx);
      const p2 = rawLine.slice(fnIdx, fnIdx + fnName.length);
      const rest = rawLine.slice(fnIdx + fnName.length);
      return h(p1) + '<span class="tok-ckpt">' + h(p2) + '</span>' + h(rest);
    }
  }

  if (anim.type === 'call' && anim.fn) {
    const toIdx = anim.to ? findExprSpan(rawLine, anim.to, lhsSearchStart) : -1;
    const fnSearchStart = toIdx >= 0 ? toIdx + anim.to.length : lhsSearchStart;
    const fnIdx = findExprSpan(rawLine, anim.fn, fnSearchStart);
    if (fnIdx >= 0) {
      if (toIdx >= 0 && fnIdx > toIdx) {
        const p1 = rawLine.slice(0, toIdx);
        const p2 = rawLine.slice(toIdx, toIdx + anim.to.length);
        const p3 = rawLine.slice(toIdx + anim.to.length, fnIdx);
        const p4 = rawLine.slice(fnIdx, fnIdx + anim.fn.length);
        const p5 = rawLine.slice(fnIdx + anim.fn.length);
        return h(p1) +
          '<span class="tok-dst">' + h(p2) + '</span>' +
          h(p3) +
          '<span class="tok-fn">' + h(p4) + '</span>' +
          h(p5);
      }
      const p1 = rawLine.slice(0, fnIdx);
      const p2 = rawLine.slice(fnIdx, fnIdx + anim.fn.length);
      const rest = rawLine.slice(fnIdx + anim.fn.length);
      return h(p1) + '<span class="tok-fn">' + h(p2) + '</span>' + h(rest);
    }
  }

  return h(rawLine);
}

function getActiveFrame(st) {
  if (!st) return null;
  const stack = Array.isArray(st.callStack) && st.callStack.length ? st.callStack : null;
  if (!stack) {
    return {
      idx: 0,
      total: 1,
      isTop: true,
      fn: 'global',
      label: 'global',
      line: st.line,
      v: st.v || {},
      ds: st.ds || {},
    };
  }
  const topIdx = stack.length - 1;
  const idx = (SELECTED_FRAME_IDX !== null && SELECTED_FRAME_IDX >= 0 && SELECTED_FRAME_IDX < stack.length)
    ? SELECTED_FRAME_IDX
    : topIdx;
  const frame = stack[idx] || stack[topIdx];
  return {
    idx,
    total: stack.length,
    isTop: idx === topIdx,
    fn: frame.fn || 'global',
    label: frame.label || 'global',
    line: frame.line || st.line,
    v: frame.v || (idx === topIdx ? st.v : {}) || {},
    ds: (frame.ds && Object.keys(frame.ds).length ? frame.ds : st.ds) || {},
  };
}

function selectStackFrame(frameIdx) {
  const st = TRACE.steps[cur];
  if (!st || !Array.isArray(st.callStack) || !st.callStack.length) return;
  const topIdx = st.callStack.length - 1;
  const clamped = Math.max(0, Math.min(topIdx, Number(frameIdx) || 0));
  SELECTED_FRAME_IDX = clamped === topIdx ? null : clamped;
  renderStatic(cur, false);
}

function renderCallStack(st) {
  if (!callStackBarEl) return;
  if (!st) {
    callStackBarEl.innerHTML = '<span class="cs-empty">未在调试</span>';
    if (callStackHintEl) callStackHintEl.textContent = '点击栈帧可切换作用域';
    return;
  }
  const stack = (Array.isArray(st.callStack) && st.callStack.length)
    ? st.callStack
    : [{ fn: 'global', label: 'global', line: st.line, v: st.v || {}, ds: st.ds || {} }];
  const active = getActiveFrame(st);
  callStackBarEl.innerHTML = stack.map((f, fIdx) => {
    const isSel = fIdx === active.idx;
    const isTop = fIdx === stack.length - 1;
    const cls = 'cs-crumb' + (isSel ? ' active' : '') + (isTop ? ' is-top' : '') + (!isTop && isSel ? ' inspecting' : '');
    const sep = fIdx > 0 ? '<span class="cs-sep">▸</span>' : '';
    return sep + `<button type="button" class="${cls}" data-frame-idx="${fIdx}" title="切换到栈帧 ${esc(f.label)} (第 ${f.line || st.line} 行)">${esc(f.label)}</button>`;
  }).join('');
  if (callStackHintEl) {
    callStackHintEl.textContent = active.isTop
      ? `栈深 ${stack.length} · 点击栈帧可切换`
      : `正在查看栈帧 ${active.idx + 1}/${stack.length}: ${active.label}`;
  }
}

function buildStepVizRow(rawLine, anim, stError, isBelow = false) {
  const guideChar = isBelow ? '╰─' : '╭─';
  if (stError) {
    return `<div class="step-viz-row">` +
      `<span class="sv-guide err">${guideChar}</span>` +
      `<div class="sv-box sv-err-box">` +
        `<span class="sv-err-tag">✗ RUNTIME ERROR</span>` +
        `<span class="sv-err-msg">${esc(stError)}</span>` +
      `</div>` +
    `</div>`;
  }

  if (!anim) return '';

  if (anim.type === 'error' && anim.message) {
    return `<div class="step-viz-row">` +
      `<span class="sv-guide err">${guideChar}</span>` +
      `<div class="sv-box sv-err-box">` +
        `<span class="sv-err-tag">✗ RUNTIME ERROR</span>` +
        `<span class="sv-err-msg">${esc(anim.message)}</span>` +
      `</div>` +
    `</div>`;
  }

  if (anim.type === 'checkpoint') {
    const args = anim.args || [];
    const argVals = anim.argVals || [];
    const chips = args.length
      ? args.map((a, idx) => {
          const av = argVals[idx];
          const showEq = av !== undefined && av !== a;
          return `<span class="sv-arg">${esc(a)}${showEq ? ` <span class="sv-eval">= ${esc(av)}</span>` : ''}</span>`;
        }).join('<span class="sv-dim">,</span>')
      : `<span class="sv-dim">已暂停于检查点函数 ${esc(anim.fn || 'checkpoint')}()</span>`;
    return `<div class="step-viz-row">` +
      `<span class="sv-guide ckpt">${guideChar}</span>` +
      `<div class="sv-box sv-ckpt-box">` +
        `<span class="sv-ckpt-tag">◉ CHECKPOINT</span>` +
        chips +
      `</div>` +
    `</div>`;
  }

  if (anim.type === 'assign') {
    const valTxt = anim.val != null ? anim.val : '…';
    const showFrom = anim.from && anim.from !== valTxt;
    return `<div class="step-viz-row">` +
      `<span class="sv-guide">${guideChar}</span>` +
      `<div class="sv-box">` +
        `<span class="sv-dst">${esc(anim.to)}</span>` +
        `<span class="sv-arrow">⟵</span>` +
        `<span class="sv-val">${esc(valTxt)}</span>` +
        (showFrom ? `<span class="sv-dim">from</span><span class="sv-src">${esc(anim.from)}</span>` : '') +
      `</div>` +
    `</div>`;
  }

  if (anim.type === 'compare') {
    const vCls = anim.result ? 'ok' : 'no';
    const lhsShowVal = anim.lhsVal !== undefined && anim.lhsVal !== anim.lhs;
    const rhsShowVal = anim.rhs && anim.rhsVal !== undefined && anim.rhsVal !== anim.rhs;
    const lhsHtml = `<span class="sv-cmp"><span>${esc(anim.lhs)}</span>${lhsShowVal ? `<span class="sv-eval">= ${esc(anim.lhsVal)}</span>` : ''}</span>`;
    const rhsHtml = anim.rhs
      ? `<span class="sv-op">${esc(anim.op)}</span><span class="sv-cmp"><span>${esc(anim.rhs)}</span>${rhsShowVal ? `<span class="sv-eval">= ${esc(anim.rhsVal)}</span>` : ''}</span>`
      : '';
    return `<div class="step-viz-row">` +
      `<span class="sv-guide">${guideChar}</span>` +
      `<div class="sv-box">` +
        lhsHtml +
        rhsHtml +
        `<span class="sv-verdict ${vCls}">⇒ ${anim.result ? 'true' : 'false'}</span>` +
      `</div>` +
    `</div>`;
  }

  if (anim.type === 'call') {
    const args = anim.args || [];
    const argVals = anim.argVals || [];
    const argChips = args.map((a, idx) => {
      const av = argVals[idx];
      const showEq = av !== undefined && av !== a;
      return `<span class="sv-arg">${esc(a)}${showEq ? ` <span class="sv-eval">= ${esc(av)}</span>` : ''}</span>`;
    }).join('<span class="sv-dim">,</span>');
    const prefix = anim.to && anim.result != null
      ? `<span class="sv-dst">${esc(anim.to)}</span><span class="sv-arrow">⟵</span><span class="sv-val">${esc(anim.result)}</span><span class="sv-dim">from</span>`
      : (anim.result != null ? `<span class="sv-val">${esc(anim.result)}</span><span class="sv-arrow">⟵</span>` : '');
    return `<div class="step-viz-row">` +
      `<span class="sv-guide">${guideChar}</span>` +
      `<div class="sv-box">` +
        prefix +
        `<span class="sv-fn">${esc(anim.fn)}</span>` +
        `<span class="sv-dim">(</span>${argChips}<span class="sv-dim">)</span>` +
      `</div>` +
    `</div>`;
  }

  return '';
}

function updateEditorChrome() {
  const text = editor.value.replace(/\r\n?/g, '\n');
  const lines = text.split('\n');
  const declared = collectDeclaredNames(text);
  const builtins = collectHighlightBuiltins(declared);
  const liveErrors = liveTypeDiags(text);
  const liveByLine = new Map();
  liveErrors.forEach(d => { if (d && d.line >= 1 && !liveByLine.has(d.line)) liveByLine.set(d.line, d); });
  const st = TRACE.steps.length ? TRACE.steps[cur] : null;
  const activeFrame = st ? getActiveFrame(st) : null;
  const curLine = activeFrame ? activeFrame.line : (st ? st.line : -1);
  const showVizOnLine = Boolean(st && (!activeFrame || activeFrame.isTop) && (st.anim || st.error) && curLine >= 1 && curLine <= lines.length);

  const errorBadge = (lineNum) => {
    const d = liveByLine.get(lineNum);
    if (!d) return '';
    const tip = (d.code ? d.code + ': ' : '') + (d.message || '');
    return '<span class="ln-err-badge" title="' + esc(tip) + '">✗ ' + esc(d.code || (LANG === 'python' ? 'PY' : 'TS')) + '</span>';
  };

  if (window.PlaygroundCM) {
    const errorLines = new Set([...liveByLine.keys(), ...TYPE_ERROR_LINES, ...RUNTIME_ERROR_LINES]);
    if (st && st.error && curLine >= 1) errorLines.add(curLine);
    window.PlaygroundCM.syncFromApp({
      language: LANG,
      text,
      lines,
      declared,
      builtins,
      liveErrors,
      curLine,
      st,
      errorLines,
    });
  } else {
    highlightEl.innerHTML = lines.map((t, k) => {
      const lineNum = k + 1;
      const isCur = lineNum === curLine;
      const isLiveErr = liveByLine.has(lineNum);
      const isErr = isLiveErr || TYPE_ERROR_LINES.has(lineNum) || RUNTIME_ERROR_LINES.has(lineNum) || Boolean(isCur && st && st.error);
      const inner = (isCur && (!activeFrame || activeFrame.isTop)) ? hlActiveLine(t, st && st.anim, declared) : hl(t, declared);
      const content = (inner || '&nbsp;') + (isLiveErr ? errorBadge(lineNum) : '');
      return '<span class="ln' + (isCur ? ' cur' : '') + (isErr ? ' err' : '') + '">' + content + '</span>';
    }).join('');

    gutterEl.innerHTML = lines.map((t, k) => {
      const lineNum = k + 1;
      const isCur = lineNum === curLine;
      const isErr = liveByLine.has(lineNum) || TYPE_ERROR_LINES.has(lineNum) || RUNTIME_ERROR_LINES.has(lineNum) || Boolean(isCur && st && st.error);
      const hasCkpt = /^\s*(?:checkpoint|断点)\s*\(/.test(t);
      return '<div class="gline' + (isCur ? ' cur' : '') + (hasCkpt ? ' ckpt' : '') + (isErr ? ' err' : '') + '" data-line="' + lineNum + '">' + lineNum + '</div>';
    }).join('');
  }

  updateStepViz(st, curLine, showVizOnLine, lines[curLine - 1] || '');
  syncScroll();
}

/* ── floating step capsule: rendered above the active line, over the code layer ── */
let STEP_VIZ_LINE = -1;

function updateStepViz(st, line, show, rawLine) {
  if (!stepVizEl) return;
  const html = (show && st) ? buildStepVizRow(rawLine, st.anim, st.error, line === 1) : '';
  if (!html) {
    STEP_VIZ_LINE = -1;
    if (stepVizEl.__vizHtml !== '') {
      stepVizEl.innerHTML = '';
      stepVizEl.__vizHtml = '';
    }
    if (stepVizEl.style) stepVizEl.style.display = 'none';
    return;
  }
  STEP_VIZ_LINE = line;
  if (stepVizEl.__vizHtml !== html) {   // avoid restarting the entry animation on unrelated redraws
    stepVizEl.innerHTML = html;
    stepVizEl.__vizHtml = html;
  }
  if (stepVizEl.style) {
    stepVizEl.style.left = '16px';
    stepVizEl.style.display = 'block';
  }
  positionStepViz();
}

/* Keep the capsule glued to its line while the editor scrolls or the pane resizes. */
function positionStepViz() {
  if (!stepVizEl || !stepVizEl.style) return;
  if (STEP_VIZ_LINE < 1 || !TRACE.steps.length) {
    stepVizEl.style.display = 'none';
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
    stepVizEl.style.left = cm.contentLeft() + 'px';
    stepVizEl.style.top = Math.round(top) + 'px';
    stepVizEl.style.display = 'block';
  } else {
    const m = hoverMetrics();
    const lineTop = m.padTop + (STEP_VIZ_LINE - 1) * m.lh - (editor.scrollTop || 0);
    const h = stepVizEl.offsetHeight || 22;
    let top = lineTop - h - 3;                     // preferred: float directly above the line
    if (top < 2) {
      top = lineTop + m.lh + 3;                    // no room above → drop below the line
      placedBelow = true;
    }
    const boxH = editor.clientHeight || 0;
    if (boxH && top + h > boxH - 2) {              // keep it inside the code box at the bottom edge
      top = lineTop - h - 3;
      placedBelow = false;
      if (top < 2) top = Math.max(2, boxH - h - 4);
    }
    stepVizEl.style.top = Math.round(top) + 'px';
    stepVizEl.style.display = 'block';
  }
  if (stepVizEl.classList) {
    stepVizEl.classList.toggle('below-line', placedBelow);
  }
  if (typeof stepVizEl.innerHTML === 'string' && stepVizEl.innerHTML) {
    const targetGuide = placedBelow ? '╰─' : '╭─';
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
  if (flyLayerEl) flyLayerEl.innerHTML = '';
}

/* ── live static diagnostics: cached per source text, drives the red line markers ── */
let LIVE_TYPE_CACHE = { src: null, diags: [] };
function liveTypeDiags(src) {
  if (LANG === 'python') return PY_DIAGS;
  const text = String(src == null ? '' : src);
  if (LIVE_TYPE_CACHE.src === text) return LIVE_TYPE_CACHE.diags;
  let diags = [];
  try { diags = typecheckTS(text, STRICT_TS) || []; } catch (_) { diags = []; }
  LIVE_TYPE_CACHE = { src: text, diags };
  return diags;
}

/* Scroll (and optionally place the caret) on the given line — used by error badges & log entries. */
function revealErrorLine(line, focus) {
  const ln = Math.round(Number(line) || 0);
  if (ln < 1) return;
  if (window.PlaygroundCM) { window.PlaygroundCM.revealLine(ln, focus); return; }
  const lines = editor.value.replace(/\r\n?/g, '\n').split('\n');
  if (ln > lines.length) return;
  scrollCodeTo(ln);
  if (!focus || !editor.focus) return;
  try {
    editor.focus();
    let pos = 0;
    for (let i = 0; i < ln - 1; i++) pos += lines[i].length + 1;
    editor.selectionStart = editor.selectionEnd = Math.min(pos, editor.value.length);
  } catch (_) { /* selection is best effort */ }
}

/* ── hover inspector: value / visualization for the variable under the cursor (debug mode) ── */
const HOVER_GEOM = { charW: 0, lh: 24, padLeft: 16, padTop: 12 };
let hoverTipKey = '';

function hoverMetrics() {
  let lh = 24, padLeft = 16, padTop = 12;
  try {
    const cs = typeof getComputedStyle === 'function' ? getComputedStyle(editor) : null;
    if (cs) {
      lh = parseFloat(cs.lineHeight) || lh;
      padLeft = parseFloat(cs.paddingLeft) || padLeft;
      padTop = parseFloat(cs.paddingTop) || padTop;
      if (!HOVER_GEOM.charW && document.createElement) {
        const cv = document.createElement('canvas');
        const ctx = cv && cv.getContext ? cv.getContext('2d') : null;
        if (ctx) {
          ctx.font = (cs.fontWeight || '400') + ' ' + (cs.fontSize || '15px') + ' ' + (cs.fontFamily || 'monospace');
          const w = ctx.measureText('MMMMMMMMMM').width / 10;
          if (w > 0 && isFinite(w)) HOVER_GEOM.charW = w;
        }
      }
    }
  } catch (_) { /* fall back to defaults */ }
  HOVER_GEOM.lh = lh;
  HOVER_GEOM.padLeft = padLeft;
  HOVER_GEOM.padTop = padTop;
  return { lh, padLeft, padTop, charW: HOVER_GEOM.charW || 8.5 };
}

function hoverColumnAt(lineText, x, charW) {
  let acc = 0;
  for (let i = 0; i < lineText.length; i++) {
    const w = lineText[i] === '\t' ? charW * 2 : charW;
    if (x < acc + w) return i;
    acc += w;
  }
  return -1;   // past the end of the line: nothing to inspect
}

function hoverHitFromEvent(e) {
  if (!editor || !editor.getBoundingClientRect) return null;
  const rect = editor.getBoundingClientRect();
  if (!rect || (!rect.width && !rect.height)) return null;
  const m = hoverMetrics();
  const y = e.clientY - rect.top - m.padTop + (editor.scrollTop || 0);
  const x = e.clientX - rect.left - m.padLeft + (editor.scrollLeft || 0);
  if (y < 0 || x < 0) return null;
  const lineIdx = Math.floor(y / m.lh);
  const lines = editor.value.replace(/\r\n?/g, '\n').split('\n');
  if (lineIdx < 0 || lineIdx >= lines.length) return null;
  const text = lines[lineIdx];
  if (!text) return null;
  const col = hoverColumnAt(text, x, m.charW);
  if (col < 0) return null;
  return { line: lineIdx + 1, text, col };
}

const HOVER_WORD_RE = /[A-Za-z0-9_$]/;
function hoverWordAt(lineText, col) {
  if (!lineText) return null;
  let i = Math.min(Math.max(0, col), lineText.length - 1);
  if (!HOVER_WORD_RE.test(lineText[i] || '')) {
    if (i > 0 && HOVER_WORD_RE.test(lineText[i - 1])) i--;
    else return null;
  }
  let s = i, e = i;
  while (s > 0 && HOVER_WORD_RE.test(lineText[s - 1])) s--;
  while (e < lineText.length && HOVER_WORD_RE.test(lineText[e])) e++;
  const word = lineText.slice(s, e);
  if (!/^[A-Za-z_$][\w$]*$/.test(word)) return null;
  return { word, start: s, end: e };
}

/* Value + structure snapshot for a name in the frame currently shown in LOCALS
   (falling back to the global frame so outer variables stay inspectable inside functions). */
function hoverInfoFor(name) {
  if (!name || !TRACE.steps.length) return null;
  if (typeof RESERVED_WORDS !== 'undefined' && RESERVED_WORDS.has(name) && name !== 'this') return null;
  const st = TRACE.steps[cur];
  if (!st) return null;
  const frame = getActiveFrame(st);
  let v = (frame && frame.v) || st.v || {};
  let ds = (frame && frame.ds) || st.ds || {};
  let frameLabel = frame ? frame.label : 'global';
  const found = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
  let lookupKey = name;
  if (name === 'self' && !found(v, 'self') && !ds.self && (found(v, 'this') || ds.this)) {
    lookupKey = 'this';
  }
  if (!found(v, lookupKey) && !ds[lookupKey]) {
    const globalFrame = st.callStack && st.callStack[0];
    if (globalFrame && globalFrame.v && (found(globalFrame.v, lookupKey) || (globalFrame.ds && globalFrame.ds[lookupKey]))) {
      v = globalFrame.v;
      ds = globalFrame.ds || {};
      frameLabel = globalFrame.label || 'global';
    }
  }
  const hasVal = found(v, lookupKey);
  const d = ds[lookupKey] || null;
  if (!hasVal && !d) return null;
  const val = hasVal ? v[lookupKey] : undefined;
  const declaredType = (CURRENT_TS_META && CURRENT_TS_META.varTypes ? CURRENT_TS_META.varTypes.get(lookupKey) : null) ||
    (d && d.interfaceName && d.interfaceName !== 'object' ? d.interfaceName : null);
  const kindStr = d
    ? (d.kind === 'interface' && d.isClass ? (d.interfaceName ? 'class · ' + d.interfaceName : 'class') : d.kind)
    : (declaredType || inferRuntimeTsType(val));
  return {
    name,
    val,
    d,
    kind: kindStr,
    declaredType: declaredType || null,
    frame: frameLabel,
  };
}

function formatHoverVal(val) {
  if (val === undefined) return 'undefined';
  if (val === null) return 'null';
  if (typeof val === 'function') return 'ƒ ' + (val.name || 'function');
  if (typeof val === 'string') return JSON.stringify(val.length > 140 ? val.slice(0, 138) + '…' : val);
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (Array.isArray(val)) {
    const head = val.slice(0, 12).map(formatHoverVal).join(', ');
    return '[' + head + (val.length > 12 ? ', … (' + val.length + ' 项)' : '') + ']';
  }
  if (isMapLike(val)) return 'Map(' + val.size + ')';
  if (isSetLike(val)) return 'Set(' + val.size + ')';
  if (typeof val === 'object') {
    const keys = Object.keys(val);
    const body = keys.slice(0, 8).map(k => k + ': ' + formatHoverVal(val[k])).join(', ');
    return '{ ' + body + (keys.length > 8 ? ', …' : '') + ' }';
  }
  return String(val);
}

/* Prefer the structure snapshot for the value line: deep clones stop at a depth limit
   and would otherwise print "[object Object]" for nested tree/graph nodes. */
function hoverValueSummary(info) {
  const d = info.d;
  if (!d) return formatHoverVal(info.val);
  const short = formatShortVal;
  if (Array.isArray(d.items)) {
    const total = typeof d.total === 'number' ? d.total : d.items.length;
    if (d.kind === 'string') {
      const s = d.items.join('');
      const suffix = total > d.items.length ? ` (共 ${total} 字符)` : '';
      return JSON.stringify(s.length > 120 ? s.slice(0, 118) + '…' : s) + suffix;
    }
    const head = d.items.slice(0, 14).map(short).join(', ');
    return '[' + head + (total > 14 ? `, … (共 ${total} 项)` : '') + ']';
  }
  if (d.kind === 'map') {
    const entries = d.entries || [];
    const total = typeof d.total === 'number' ? d.total : entries.length;
    const head = entries.slice(0, 6).map(e => short(e.k) + ' → ' + short(e.v)).join(', ');
    return 'Map(' + total + ' 项) { ' + head + (total > 6 ? ', …' : '') + ' }';
  }
  if (d.kind === 'grid') {
    const rows = typeof d.totalRows === 'number' ? d.totalRows : (d.cells || []).length;
    const cols = typeof d.totalCols === 'number' ? d.totalCols : (rows && Array.isArray(d.cells[0]) ? d.cells[0].length : 0);
    return rows + ' × ' + cols + ' 的二维矩阵';
  }
  if (d.kind === 'tree') {
    const nodes = d.nodes || [];
    const total = typeof d.total === 'number' ? d.total : nodes.length;
    const root = nodes[d.root] ? nodes[d.root].val : undefined;
    return 'Tree(' + total + ' 个节点 · 根 ' + short(root) + ')';
  }
  if (d.kind === 'graph') {
    const nCnt = typeof d.totalNodes === 'number' ? d.totalNodes : (d.nodes || []).length;
    const eCnt = typeof d.totalEdges === 'number' ? d.totalEdges : (d.edges || []).length;
    return 'Graph(' + nCnt + ' 节点 / ' + eCnt + ' 条边)';
  }
  if (d.fields) {
    const head = d.fields.slice(0, 6).map(f => f.k + ': ' + short(f.v)).join(', ');
    return '{ ' + head + (d.fields.length > 6 ? ', …' : '') + ' }';
  }
  return formatHoverVal(info.val);
}

function hoverTipHtml(info) {
  if (!info) return '';
  const parts = [];
  const kindLabel = esc(String(info.kind || '').replace(/^./, c => c.toUpperCase()));
  parts.push('<div class="ht-head"><span class="ht-name">' + esc(info.name) + '</span>' +
    (kindLabel ? '<span class="ht-kind">' + kindLabel + '</span>' : '') + '</div>');
  parts.push('<div class="ht-val">' + esc(hoverValueSummary(info)) + '</div>');
  const note = [];
  if (info.declaredType) note.push('声明类型 ' + info.declaredType);
  if (info.frame) note.push('栈帧 ' + info.frame);
  if (note.length) parts.push('<div class="ht-note">' + esc(note.join(' · ')) + '</div>');
  const vizFn = info.d ? VIZ[info.d.kind] : null;
  if (typeof vizFn === 'function') {
    let viz = '';
    try { viz = vizFn(info.d) || ''; } catch (_) { viz = ''; }
    if (viz) parts.push('<div class="ht-viz">' + viz + '</div>');
  }
  return parts.join('');
}

function positionHoverTip(clientX, clientY) {
  if (!hoverTipEl) return;
  const rect = hoverTipEl.getBoundingClientRect ? hoverTipEl.getBoundingClientRect() : { width: 320, height: 120 };
  const vw = (typeof window !== 'undefined' && window.innerWidth) || 1280;
  const vh = (typeof window !== 'undefined' && window.innerHeight) || 800;
  let left = clientX + 16;
  let top = clientY + 18;
  if (left + rect.width > vw - 10) left = Math.max(8, clientX - rect.width - 16);
  if (top + rect.height > vh - 10) top = Math.max(8, clientY - rect.height - 14);
  if (hoverTipEl.style) {
    hoverTipEl.style.left = left + 'px';
    hoverTipEl.style.top = top + 'px';
  }
}

function hideHoverTip() {
  hoverTipKey = '';
  if (!hoverTipEl) return;
  if (hoverTipEl.classList) hoverTipEl.classList.remove('on');
  if (hoverTipEl.setAttribute) hoverTipEl.setAttribute('aria-hidden', 'true');
}

function showHoverTip(info, clientX, clientY) {
  if (!hoverTipEl || !info) { hideHoverTip(); return; }
  hoverTipEl.innerHTML = hoverTipHtml(info);
  if (hoverTipEl.classList) hoverTipEl.classList.add('on');
  if (hoverTipEl.setAttribute) hoverTipEl.setAttribute('aria-hidden', 'false');
  positionHoverTip(clientX, clientY);
}

function hoverTipForName(name, clientX, clientY) {
  if (!TRACE.steps.length) { hideHoverTip(); return false; }
  const info = hoverInfoFor(name);
  if (!info) { hideHoverTip(); return false; }
  const key = name + '@' + cur + '#' + TRACE.steps.length;
  if (!(hoverTipEl && hoverTipEl.classList && hoverTipEl.classList.contains && hoverTipEl.classList.contains('on')) || hoverTipKey !== key) {
    hoverTipKey = key;
    showHoverTip(info, clientX, clientY);
  } else {
    positionHoverTip(clientX, clientY);
  }
  return true;
}

function playStepAnimation(st) {
  clearFlyLayer();
  if (IS_STILL || !st || !st.anim || !flyLayerEl) return;
  const anim = st.anim;
  if (anim.type !== 'assign' && !(anim.type === 'call' && anim.to && anim.result != null)) return;

  const srcEl = highlightEl.querySelector('.ln.cur .tok-src') || highlightEl.querySelector('.ln.cur .tok-fn');
  const dstEl = highlightEl.querySelector('.ln.cur .tok-dst') || highlightEl.querySelector('.ln.cur');
  if (!srcEl || !dstEl) return;

  const sRect = srcEl.getBoundingClientRect();
  const dRect = dstEl.getBoundingClientRect();
  if (sRect.width === 0 && sRect.height === 0) return;

  const chip = document.createElement('div');
  chip.className = 'fly-chip';
  chip.textContent = anim.val != null ? anim.val : anim.result;
  const sx = Math.round(sRect.left + sRect.width / 2 - 14);
  const sy = Math.round(sRect.top - 6);
  const dx = Math.round(dRect.left + dRect.width / 2 - 14);
  const dy = Math.round(dRect.top - 6);

  chip.style.transform = `translate3d(${sx}px, ${sy}px, 0) scale(0.92)`;
  chip.style.opacity = '0.96';
  flyLayerEl.appendChild(chip);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      chip.classList.add('landed');
      chip.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(1)`;
    });
  });

  setTimeout(() => {
    chip.style.opacity = '0';
  }, 340);
  setTimeout(() => {
    if (chip.parentNode) chip.parentNode.removeChild(chip);
  }, 620);
}

function syncScroll() {
  if (window.PlaygroundCM) { positionStepViz(); return; }
  highlightEl.scrollTop = editor.scrollTop;
  highlightEl.scrollLeft = editor.scrollLeft;
  gutterEl.scrollTop = editor.scrollTop;
  positionStepViz();
}

function scrollCodeTo(line) {
  if (window.PlaygroundCM) { window.PlaygroundCM.scrollToLine(line); return; }
  const lh = 24;
  const idx = Math.max(0, line - 1);
  const visible = Math.max(1, Math.floor(editor.clientHeight / lh));
  const first = Math.round(editor.scrollTop / lh);
  if (idx < first) editor.scrollTop = Math.max(0, (idx - 1) * lh);
  else if (idx >= first + visible - 1) editor.scrollTop = (idx - visible + 2) * lh;
  syncScroll();
}
