/* ================================================================
   Syntax Highlight, Active-Line Tokens & Hover Inspector (src/viz/highlight.ts)
   ================================================================ */
import { blankStrings, isIdentPart, RESERVED_WORDS } from "../compiler/comments";
import { stripTypes } from "../compiler/transpile";
import { collectNames } from "../compiler/instrumenter";
import { typecheckTS, typecheckWorkspaceModules, normalizeWorkspaceModulePath } from "../compiler/type-checker";
import { inferRuntimeTsType, formatFunctionTypeSignature } from "../compiler/tc-types";
import { appState, esc, registerUiHooks, uiHooks } from "../state";
import { Diag, StepAnim } from "../types";
import { editor, gutterEl, highlightEl, hoverTipEl } from "../ui/dom";
import { isMapLike, isSetLike, isRecord, formatShortVal } from "../utils/format";
import { updateStepViz, positionStepViz, hoverMetrics } from "./ast-view";
import { getActiveFrame, VIZ } from "./memory-normalizers";

export { hoverMetrics };

export const HIGHLIGHT_BUILTINS = new Set([
  'checkpoint', '断点', 'this', 'console', 'window', 'document', 'globalThis',
  'undefined', 'NaN', 'Infinity', 'Math', 'JSON', 'Object', 'Array', 'Number',
  'String', 'Boolean', 'Map', 'Set', 'Promise', 'Error', 'RegExp', 'Date',
  'parseInt', 'parseFloat', 'isNaN', 'setTimeout', 'clearTimeout',
]);

let DECLARED_NAMES_CACHE: { src: string | null; names: Set<string> } = { src: null, names: new Set() };

/* All names the current buffer actually declares: const/let/var (incl. destructuring),
   function & arrow params, loop/catch bindings, function/class/interface/type names. */
export function collectDeclaredNames(src: string | null | undefined): Set<string> {
  const text = String(src == null ? '' : src);
  if (DECLARED_NAMES_CACHE.src === text) return DECLARED_NAMES_CACHE.names;

  const names = new Set<string>();
  let js = text;
  try { js = stripTypes(text); } catch (_) { js = text; }
  try {
    collectNames(js).forEach(n => names.add(n));
  } catch (_) { /* keep what we have */ }
  let m;
  const impRe = /\/\*__import__\*\/\s*var\s+([^\n=]+)=/g;
  while ((m = impRe.exec(js))) {
    const lhs = m[1] || '';
    const idRe = /\b([A-Za-z_$][\w$]*)\b/g;
    let im: RegExpExecArray | null;
    while ((im = idRe.exec(lhs))) {
      if (im[1]) names.add(im[1]);
    }
  }
  const esmImpRe = /^\s*import\s+(?:type\s+)?(.+?)\s+from\s+['"][^'"]+['"]/gm;
  while ((m = esmImpRe.exec(text))) {
    const clause = (m[1] || '').replace(/\btype\b/g, ' ');
    const idRe = /\b([A-Za-z_$][\w$]*)\b/g;
    let im: RegExpExecArray | null;
    while ((im = idRe.exec(clause))) {
      if (im[1] && im[1] !== 'as') names.add(im[1]);
    }
  }
  const typeRe = /\b(?:function|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g;
  const rawClean = blankStrings(text);
  while ((m = typeRe.exec(rawClean))) { if (m[1]) names.add(m[1]); }
  const fnAssign = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b|\(|[A-Za-z_$][\w$]*\s*=>)/g;
  while ((m = fnAssign.exec(js))) { if (m[1]) names.add(m[1]); }

  DECLARED_NAMES_CACHE = { src: text, names };
  return names;
}

export function collectHighlightBuiltins(declared: Set<string>): Set<string> {
  const out = new Set<string>();
  Array.from(HIGHLIGHT_BUILTINS).forEach((name: string) => {
    if (!declared.has(name)) out.add(name);
  });
  return out;
}

export function hl(t: string, declared?: Set<string> | null): string {
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

export function findExprSpan(line: string, target: string, fromIndex = 0) {
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

export function hlActiveLine(rawLine: string, anim?: StepAnim | null, declared?: Set<string> | null): string {
  if (!anim) return hl(rawLine, declared);
  const h = (s: string) => hl(s, declared);

  const declPrefix = rawLine.match(/^\s*(?:(?:export\s+)?(?:const|let|var)\b\s*)/);
  const lhsSearchStart = declPrefix ? declPrefix[0].length : 0;

  if (anim.type === 'assign' && typeof anim.from === 'string' && anim.from && typeof anim.to === 'string' && anim.to) {
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
        const opStr = anim.op || '';
        const opIdx = opStr ? rawLine.indexOf(opStr, afterLhs) : -1;
        const rhsStart = opIdx >= 0 ? opIdx + opStr.length : afterLhs;
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
    const toStr = typeof anim.to === 'string' && anim.to ? anim.to : '';
    const toIdx = toStr ? findExprSpan(rawLine, toStr, lhsSearchStart) : -1;
    const fnSearchStart = toIdx >= 0 ? toIdx + toStr.length : lhsSearchStart;
    const fnIdx = findExprSpan(rawLine, anim.fn, fnSearchStart);
    if (fnIdx >= 0) {
      if (toIdx >= 0 && fnIdx > toIdx) {
        const p1 = rawLine.slice(0, toIdx);
        const p2 = rawLine.slice(toIdx, toIdx + toStr.length);
        const p3 = rawLine.slice(toIdx + toStr.length, fnIdx);
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

export function updateEditorChrome() {
  const text = editor.value.replace(/\r\n?/g, '\n');
  const lines = text.split('\n');
  const declared = collectDeclaredNames(text);
  const builtins = collectHighlightBuiltins(declared);
  const liveErrors = liveTypeDiags(text);
  const liveByLine = new Map<number, Diag>();
  liveErrors.forEach((d: Diag) => { if (d && d.line >= 1 && !liveByLine.has(d.line)) liveByLine.set(d.line, d); });
  const st = appState.TRACE.steps.length ? appState.TRACE.steps[appState.cur] : null;
  const activeFrame = st ? getActiveFrame(st) : null;
  const stepFile = (activeFrame && activeFrame.file) || (st && st.file) || appState.DEBUG_SESSION.entryFile || '';
  const isMultiModule = Boolean(
    appState.TRACE.moduleSources && Object.keys(appState.TRACE.moduleSources).length > 1
  );
  const currentEditorFile = normalizeWorkspaceModulePath(appState.FILE_NAME || appState.ACTIVE_DEBUG_FILE || '');
  const viewingStepFile =
    !isMultiModule || !stepFile || !currentEditorFile || stepFile === currentEditorFile;
  const curLine = viewingStepFile ? (activeFrame ? activeFrame.line : (st ? st.line : -1)) : -1;
  const showVizOnLine = Boolean(
    viewingStepFile && st && (!activeFrame || activeFrame.isTop) && (st.anim || st.error) && curLine >= 1 && curLine <= lines.length
  );

  const errorBadge = (lineNum: number) => {
    const d = liveByLine.get(lineNum);
    if (!d) return '';
    const tip = (d.code ? d.code + ': ' : '') + (d.message || '');
    return '<span class="ln-err-badge" title="' + esc(tip) + '">✗ ' + esc(d.code || 'TS') + '</span>';
  };

  if (window.PlaygroundCM) {
    const errorLines = new Set([...liveByLine.keys(), ...appState.TYPE_ERROR_LINES, ...appState.RUNTIME_ERROR_LINES]);
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
      errorLines,
    });
  } else {
    highlightEl.innerHTML = lines.map((t: string, k: number) => {
      const lineNum = k + 1;
      const isCur = lineNum === curLine;
      const isLiveErr = liveByLine.has(lineNum);
      const isErr = isLiveErr || appState.TYPE_ERROR_LINES.has(lineNum) || appState.RUNTIME_ERROR_LINES.has(lineNum) || Boolean(isCur && st && st.error);
      const inner = (isCur && (!activeFrame || activeFrame.isTop)) ? hlActiveLine(t, st && st.anim, declared) : hl(t, declared);
      const content = (inner || '&nbsp;') + (isLiveErr ? errorBadge(lineNum) : '');
      return '<span class="ln' + (isCur ? ' cur' : '') + (isErr ? ' err' : '') + '">' + content + '</span>';
    }).join('');

    gutterEl.innerHTML = lines.map((t: string, k: number) => {
      const lineNum = k + 1;
      const isCur = lineNum === curLine;
      const isErr = liveByLine.has(lineNum) || appState.TYPE_ERROR_LINES.has(lineNum) || appState.RUNTIME_ERROR_LINES.has(lineNum) || Boolean(isCur && st && st.error);
      const hasCkpt = /^\s*(?:checkpoint|断点)\s*\(/.test(t);
      return '<div class="gline' + (isCur ? ' cur' : '') + (hasCkpt ? ' ckpt' : '') + (isErr ? ' err' : '') + '" data-line="' + lineNum + '">' + lineNum + '</div>';
    }).join('');
  }

  updateStepViz(st, curLine, showVizOnLine, lines[curLine - 1] || '');
  syncScroll();
}

let LIVE_TYPE_CACHE: { key: string | null; diags: Diag[] } = { key: null, diags: [] };
export function liveTypeDiags(src: string | null | undefined): Diag[] {
  const text = String(src == null ? '' : src);
  const currentFile = normalizeWorkspaceModulePath(appState.FILE_NAME || 'main.ts');
  const hasModuleSyntax = /^\s*(?:import|export)\b/m.test(text);
  let fileMap = new Map<string, string>();
  let mapSig = '';
  if (hasModuleSyntax) {
    try {
      fileMap = uiHooks.collectWorkspaceFileMap();
      const keys = Array.from(fileMap.keys()).sort();
      if (keys.length > 0) {
        mapSig = keys.map(k => `${k}:${(fileMap.get(k) || '').length}`).join('|');
      }
    } catch (_) {
      fileMap = new Map<string, string>();
    }
  }
  const cacheKey = `${currentFile}::${appState.STRICT_TS ? 1 : 0}::${mapSig}::${text}`;
  if (LIVE_TYPE_CACHE.key === cacheKey) return LIVE_TYPE_CACHE.diags;
  let diags: Diag[] = [];
  try {
    if (hasModuleSyntax && fileMap.size > 0) {
      fileMap.set(currentFile, text);
      const { diagnostics } = typecheckWorkspaceModules(currentFile, text, fileMap, appState.STRICT_TS);
      diags = diagnostics.filter((d: Diag) => !d.file || d.file === currentFile);
    } else {
      diags = typecheckTS(text, appState.STRICT_TS) || [];
    }
  } catch (_) {
    diags = [];
  }
  LIVE_TYPE_CACHE = { key: cacheKey, diags };
  return diags;
}

/* Scroll (and optionally place the caret) on the given line — used by error badges & log entries. */
export function revealErrorLine(line: number | string, focus?: boolean) {
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
    for (let i = 0; i < ln - 1; i++) pos += (lines[i] || '').length + 1;
    editor.selectionStart = editor.selectionEnd = Math.min(pos, editor.value.length);
  } catch (_) { /* selection is best effort */ }
}

/* ── hover inspector: value / visualization for the variable under the cursor (debug mode) ── */
let hoverTipKey = '';

export function hoverColumnAt(lineText: string, x: number, charW: number) {
  let acc = 0;
  for (let i = 0; i < lineText.length; i++) {
    const w = lineText[i] === '\t' ? charW * 2 : charW;
    if (x < acc + w) return i;
    acc += w;
  }
  return -1;   // past the end of the line: nothing to inspect
}

export function hoverHitFromEvent(e: { clientX: number; clientY: number }) {
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
export function hoverWordAt(lineText: string, col: number) {
  if (!lineText) return null;
  let i = Math.min(Math.max(0, col), lineText.length - 1);
  if (!HOVER_WORD_RE.test(lineText[i] || '')) {
    if (i > 0 && HOVER_WORD_RE.test(lineText[i - 1] || '')) i--;
    else return null;
  }
  let s = i, e = i;
  while (s > 0 && HOVER_WORD_RE.test(lineText[s - 1] || '')) s--;
  while (e < lineText.length && HOVER_WORD_RE.test(lineText[e] || '')) e++;
  const word = lineText.slice(s, e);
  if (!/^[A-Za-z_$][\w$]*$/.test(word)) return null;
  return { word, start: s, end: e };
}

/* Value + structure snapshot for a name in the frame currently shown in LOCALS
   (falling back to the global frame so outer variables stay inspectable inside functions). */
export function hoverInfoFor(name: string | null | undefined) {
  if (!name || !appState.TRACE.steps.length) return null;
  if (typeof RESERVED_WORDS !== 'undefined' && RESERVED_WORDS.has(name) && name !== 'this') return null;
  const st = appState.TRACE.steps[appState.cur];
  if (!st) return null;
  const frame = getActiveFrame(st);
  let v = (frame && frame.v) || st.v || {};
  let ds = (frame && frame.ds) || st.ds || {};
  let frameLabel = frame ? frame.label : 'global';
  const found = (obj: object, key: string) => Object.prototype.hasOwnProperty.call(obj, key);
  const lookupKey = name;
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
  const declaredType = (appState.CURRENT_TS_META && appState.CURRENT_TS_META.varTypes ? appState.CURRENT_TS_META.varTypes.get(lookupKey) : null) ||
    (d && d.interfaceName && d.interfaceName !== 'object' ? d.interfaceName : null);
  const kindStr = d
    ? (d.kind === 'interface' && d.isClass ? (d.interfaceName ? 'class · ' + d.interfaceName : 'class') : d.kind)
    : (typeof val === 'function' ? formatFunctionTypeSignature(lookupKey, val) : (declaredType || inferRuntimeTsType(val)));
  return {
    name,
    val,
    d,
    kind: kindStr,
    declaredType: declaredType || null,
    frame: frameLabel,
  };
}

export type HoverInfo = NonNullable<ReturnType<typeof hoverInfoFor>>;

export function formatHoverVal(val: unknown, varName?: string): string {
  if (val === undefined) return 'undefined';
  if (val === null) return 'null';
  if (typeof val === 'function') return formatFunctionTypeSignature(varName || val.name || '', val);
  if (typeof val === 'string') return JSON.stringify(val.length > 140 ? val.slice(0, 138) + '…' : val);
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (Array.isArray(val)) {
    const head: string = val.slice(0, 12).map((item: unknown) => formatHoverVal(item)).join(', ');
    return '[' + head + (val.length > 12 ? ', … (' + val.length + ' 项)' : '') + ']';
  }
  if (isMapLike(val)) return 'Map(' + val.size + ')';
  if (isSetLike(val)) return 'Set(' + val.size + ')';
  if (isRecord(val)) {
    const keys = Object.keys(val);
    const body: string = keys.slice(0, 8).map((k: string): string => k + ': ' + formatHoverVal(val[k])).join(', ');
    return '{ ' + body + (keys.length > 8 ? ', …' : '') + ' }';
  }
  return String(val);
}

/* Prefer the structure snapshot for the value line: deep clones stop at a depth limit
   and would otherwise print "[object Object]" for nested tree/graph nodes. */
export function hoverValueSummary(info: HoverInfo) {
  const d = info.d;
  if (!d) return formatHoverVal(info.val, info.name);
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
    const head = entries.slice(0, 6).map((e: { k: unknown; v: unknown }) => short(e.k) + ' → ' + short(e.v)).join(', ');
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
    const head = d.fields.slice(0, 6).map((f: { k: string; v: unknown }) => f.k + ': ' + short(f.v)).join(', ');
    return '{ ' + head + (d.fields.length > 6 ? ', …' : '') + ' }';
  }
  return formatHoverVal(info.val);
}

export function hoverTipHtml(info: HoverInfo | null | undefined) {
  if (!info) return '';
  const parts: string[] = [];
  const kindLabel = esc(String(info.kind || '').replace(/^./, c => c.toUpperCase()));
  parts.push('<div class="ht-head"><span class="ht-name">' + esc(info.name) + '</span>' +
    (kindLabel ? '<span class="ht-kind">' + kindLabel + '</span>' : '') + '</div>');
  parts.push('<div class="ht-val">' + esc(hoverValueSummary(info)) + '</div>');
  const note: string[] = [];
  if (info.declaredType) note.push('声明类型 ' + info.declaredType);
  if (info.frame) note.push('栈帧 ' + info.frame);
  if (note.length) parts.push('<div class="ht-note">' + esc(note.join(' · ')) + '</div>');
  const vizFn = info.d && typeof info.d.kind === 'string' ? VIZ[info.d.kind] : null;
  if (typeof vizFn === 'function') {
    let viz = '';
    try { viz = vizFn(info.d) || ''; } catch (_) { viz = ''; }
    if (viz) parts.push('<div class="ht-viz">' + viz + '</div>');
  }
  return parts.join('');
}

export function positionHoverTip(clientX: number, clientY: number) {
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

export function hideHoverTip() {
  hoverTipKey = '';
  if (!hoverTipEl) return;
  if (hoverTipEl.classList) hoverTipEl.classList.remove('on');
  if (hoverTipEl.setAttribute) hoverTipEl.setAttribute('aria-hidden', 'true');
}

export function showHoverTip(info: HoverInfo | null | undefined, clientX: number, clientY: number) {
  if (!hoverTipEl || !info) { hideHoverTip(); return; }
  hoverTipEl.innerHTML = hoverTipHtml(info);
  if (hoverTipEl.classList) hoverTipEl.classList.add('on');
  if (hoverTipEl.setAttribute) hoverTipEl.setAttribute('aria-hidden', 'false');
  positionHoverTip(clientX, clientY);
}

export function hoverTipForName(name: string | null | undefined, clientX: number, clientY: number) {
  if (!appState.TRACE.steps.length) { hideHoverTip(); return false; }
  const info = hoverInfoFor(name);
  if (!info) { hideHoverTip(); return false; }
  const key = name + '@' + appState.cur + '#' + appState.TRACE.steps.length;
  if (!(hoverTipEl && hoverTipEl.classList && hoverTipEl.classList.contains && hoverTipEl.classList.contains('on')) || hoverTipKey !== key) {
    hoverTipKey = key;
    showHoverTip(info, clientX, clientY);
  } else {
    positionHoverTip(clientX, clientY);
  }
  return true;
}

export function syncScroll() {
  if (window.PlaygroundCM) { positionStepViz(); return; }
  highlightEl.scrollTop = editor.scrollTop;
  highlightEl.scrollLeft = editor.scrollLeft;
  gutterEl.scrollTop = editor.scrollTop;
  positionStepViz();
}

export function scrollCodeTo(line: number) {
  if (window.PlaygroundCM) { window.PlaygroundCM.scrollToLine(line); return; }
  const lh = 24;
  const idx = Math.max(0, line - 1);
  const visible = Math.max(1, Math.floor(editor.clientHeight / lh));
  const first = Math.round(editor.scrollTop / lh);
  if (idx < first) editor.scrollTop = Math.max(0, (idx - 1) * lh);
  else if (idx >= first + visible - 1) editor.scrollTop = (idx - visible + 2) * lh;
  syncScroll();
}

export const highlightTS = hl;

registerUiHooks({ updateEditorChrome, revealErrorLine });

