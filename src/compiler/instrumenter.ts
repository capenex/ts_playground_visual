/* ================================================================
   AST/line-level instrumenter & async snapshot hooks (src/compiler/instrumenter.ts)
   ================================================================ */
import {
  RESERVED_WORDS,
  blankStrings,
  findBalancedParen,
  isIdentPart,
  isIdentStart,
  isWS,
  readIdent,
  skipString,
  splitTopLevel,
  splitTopLevelSemicolons,
  stripInlineCommentSafe,
} from './comments';
import { stripTypes } from './transpile';

export function isTraceableLine(t: string): boolean {
  if (!t) return false;
  if (t.startsWith('//') || t.startsWith('/*') || t.startsWith('*')) return false;
  if (/^[)}\].?:,&|]/.test(t)) return false;
  if (/^[;]+$/.test(t)) return false;
  if (/^(else|do|try|catch|finally|case\b|default\b)/.test(t)) return false;
  if (/^(function|class|interface|type|import|export)\b/.test(t)) return false;
  return true;
}

export function extractBindingNames(lhs: string, names: Set<any>): void {
  let s = lhs.trim();
  if (!s) return;
  let eqIdx = -1, depth = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '"' || ch === "'" || ch === '`') { i = skipString(s, i) - 1; continue; }
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') depth--;
    else if (ch === '=' && depth === 0 && s[i + 1] !== '>' && s[i + 1] !== '=') {
      eqIdx = i;
      break;
    }
  }
  if (eqIdx >= 0) s = s.slice(0, eqIdx).trim();
  if (s.startsWith('...')) s = s.slice(3).trim();

  if (s.startsWith('[')) {
    const inner = s.endsWith(']') ? s.slice(1, -1) : s.slice(1);
    splitTopLevel(inner).forEach(part => extractBindingNames(part, names));
    return;
  }
  if (s.startsWith('{')) {
    const inner = s.endsWith('}') ? s.slice(1, -1) : s.slice(1);
    splitTopLevel(inner).forEach(part => {
      const p = part.trim();
      if (!p) return;
      if (p.startsWith('...')) {
        extractBindingNames(p.slice(3), names);
        return;
      }
      let colonIdx = -1, d = 0;
      for (let i = 0; i < p.length; i++) {
        const ch = p[i];
        if (ch === '(' || ch === '[' || ch === '{') d++;
        else if (ch === ')' || ch === ']' || ch === '}') d--;
        else if (ch === ':' && d === 0) { colonIdx = i; break; }
      }
      if (colonIdx >= 0) extractBindingNames(p.slice(colonIdx + 1), names);
      else extractBindingNames(p, names);
    });
    return;
  }

  const m = s.match(/^([A-Za-z_$][\w$]*)$/);
  if (m && !RESERVED_WORDS.has(m[1])) names.add(m[1]);
}

export function collectNames(js: string): string[] {
  const clean = blankStrings(js);
  const names = new Set<string>();
  let m: RegExpExecArray | null;

  const forRe = /\bfor\s*\(\s*(?:const|let|var)\s+(.+?)\s+(?:of|in)\b/g;
  while ((m = forRe.exec(clean))) {
    extractBindingNames(m[1], names);
  }
  const forClassicRe = /\bfor\s*\(\s*(?:const|let|var)\s+([^;]+)/g;
  while ((m = forClassicRe.exec(clean))) {
    splitTopLevel(m[1]).forEach(part => extractBindingNames(part, names));
  }

  const decl = /\b(?:const|let|var)\s+([^;\n]+)/g;
  while ((m = decl.exec(clean))) {
    const rhs = m[1].replace(/\s+\b(?:of|in)\b[\s\S]*$/, '');
    splitTopLevel(rhs).forEach(part => extractBindingNames(part, names));
  }

  const fn = /\bfunction\b\s*(?:[A-Za-z_$][\w$]*)?\s*\(([^)]*)\)/g;
  while ((m = fn.exec(clean))) {
    splitTopLevel(m[1]).forEach(p => extractBindingNames(p, names));
  }

  // Class / object-literal method parameters: `sum(n) { ... }`, `constructor(v) { ... }`
  const method = /(?:^|[\n;{}])\s*(?:(?:public|private|protected|static|async|readonly|get|set)\s+)*([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*(?:\{|:)/g;
  while ((m = method.exec(clean))) {
    if (RESERVED_WORDS.has(m[1])) continue;
    splitTopLevel(m[2]).forEach(p => extractBindingNames(p, names));
  }

  for (let i = 0; i < clean.length - 1; i++) {
    if (clean[i] !== '=' || clean[i + 1] !== '>') continue;
    let k = i - 1;
    while (k >= 0 && isWS(clean[k])) k--;
    if (k >= 0 && clean[k] === ')') {
      let depth = 0, openIdx = -1;
      for (let p = k; p >= 0; p--) {
        const ch = clean[p];
        if (ch === ')' || ch === ']' || ch === '}') depth++;
        else if (ch === '(' || ch === '[' || ch === '{') {
          depth--;
          if (depth === 0) {
            if (ch === '(') openIdx = p;
            break;
          }
        }
      }
      if (openIdx >= 0) {
        splitTopLevel(clean.slice(openIdx + 1, k)).forEach(p => extractBindingNames(p, names));
      }
    }
  }
  const singleArrow = /\b([A-Za-z_$][\w$]*)\s*=>/g;
  while ((m = singleArrow.exec(clean))) {
    if (!RESERVED_WORDS.has(m[1])) names.add(m[1]);
  }

  const cat = /\bcatch\s*\(\s*([^)]+)\)/g;
  while ((m = cat.exec(clean))) {
    extractBindingNames(m[1], names);
  }

  return [...names];
}

export function snapFnExpr(names: string[]): string {
  const body = names.map(n =>
    `try{__v[${JSON.stringify(n)}]=${n};}catch(e){}`
  ).join('');
  return `function(){var __v={};${body}return __v;}`;
}

function endsWithContinuation(t: string): boolean {
  if (!t) return false;
  if (/[.+\-*/%&|^<>?:=,(\[]$/.test(t)) {
    if (/(\+\+|--)$/.test(t)) return false;
    return true;
  }
  return false;
}

function isUnbracedControlHeader(t: string): boolean {
  if (!t || t.endsWith('{') || t.endsWith(';')) return false;
  if (/^(else|do)$/.test(t)) return true;
  if (/^(?:if|for|while|else\s+if)\s*\(.*\)$/.test(t)) return true;
  return false;
}

function tryInjectLoopOrElseIf(raw: string, callExpr: string): string | null {
  const mCond = raw.match(/^(\s*(?:}\s*)?(?:while|else\s+if)\s*)\(/);
  if (mCond) {
    const openIdx = mCond[1].length;
    const closeIdx = findBalancedParen(raw, openIdx);
    if (closeIdx > openIdx) {
      const cond = raw.slice(openIdx + 1, closeIdx).trim();
      if (cond) {
        return raw.slice(0, openIdx + 1) + '(' + callExpr + ', (' + cond + '))' + raw.slice(closeIdx);
      }
    }
  }

  const mFor = raw.match(/^(\s*for\s*)\(/);
  if (mFor) {
    const openIdx = mFor[1].length;
    const closeIdx = findBalancedParen(raw, openIdx);
    if (closeIdx > openIdx) {
      const inside = raw.slice(openIdx + 1, closeIdx);
      const semiParts = splitTopLevelSemicolons(inside);
      if (semiParts.length === 3) {
        const init = semiParts[0];
        const cond = semiParts[1].trim();
        const upd = semiParts[2];
        const wrappedCond = cond ? '(' + callExpr + ', (' + cond + '))' : '(' + callExpr + ', true)';
        return raw.slice(0, openIdx + 1) + init + '; ' + wrappedCond + ';' + upd + raw.slice(closeIdx);
      } else if (semiParts.length === 1 && /\b(?:of|in)\b/.test(inside)) {
        const bracePos = raw.indexOf('{', closeIdx + 1);
        if (bracePos >= 0) {
          return raw.slice(0, bracePos + 1) + ' ' + callExpr + ';' + raw.slice(bracePos + 1);
        }
      }
    }
  }
  return null;
}

interface FnHeaderStackInfo {
  kind: 'fn';
  name: string;
  params: string[];
  line: number;
  fidVar: string;
  isAsync: boolean;
}

function matchFunctionHeaderForStack(rawLine: string, lineNum: number): FnHeaderStackInfo | null {
  const clean = stripInlineCommentSafe(rawLine).trim();
  if (!clean.endsWith('{')) return null;
  let m = clean.match(/^(?:export\s+)?(?:default\s+)?(async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{$/);
  let isAsync = false;
  let fnName = '';
  let paramRaw = '';
  if (m) {
    isAsync = Boolean(m[1]);
    fnName = m[2];
    paramRaw = m[3] || '';
  }
  if (!m) {
    m = clean.match(/^(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(async\s+)?function(?:\s+[A-Za-z_$][\w$]*)?\s*\(([^)]*)\)\s*\{$/);
    if (m) { isAsync = Boolean(m[2]); fnName = m[1]; paramRaw = m[3] || ''; }
  }
  if (!m) {
    m = clean.match(/^(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(async\s+)?\(([^)]*)\)\s*=>\s*\{$/);
    if (m) { isAsync = Boolean(m[2]); fnName = m[1]; paramRaw = m[3] || ''; }
  }
  if (!m) {
    m = clean.match(/^(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(async\s+)?([A-Za-z_$][\w$]*)\s*=>\s*\{$/);
    if (m) { isAsync = Boolean(m[2]); fnName = m[1]; paramRaw = m[3] || ''; }
  }
  if (!m) {
    m = clean.match(/^((?:(?:public|private|protected|static|async|readonly|get|set)\s+)*)([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*(?::\s*[^{]+)?\s*\{$/);
    if (m && RESERVED_WORDS.has(m[2])) m = null;
    if (m) {
      isAsync = /\basync\b/.test(m[1] || '');
      fnName = m[2];
      paramRaw = m[3] || '';
    }
  }
  if (!m) return null;
  const pSet = new Set<string>();
  splitTopLevel(paramRaw).forEach(p => extractBindingNames(p, pSet));
  return {
    kind: 'fn',
    name: fnName,
    params: [...pSet],
    line: lineNum,
    fidVar: `__fid_${lineNum}`,
    isAsync,
  };
}

function rewriteAwaitExpressions(str: string, fidExpr: string, lineNum: number): string {
  if (!/\bawait\b/.test(str)) return str;
  let out = '';
  let i = 0;
  const n = str.length;
  while (i < n) {
    const ch = str[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      const end = skipString(str, i);
      out += str.slice(i, end);
      i = end;
      continue;
    }
    if (ch === '/' && str[i + 1] === '/') {
      out += str.slice(i);
      break;
    }
    if (isIdentStart(ch)) {
      const id = readIdent(str, i)!;
      if (id.name === 'await') {
        let j = id.end;
        while (j < n && isWS(str[j])) j++;
        let d = 0;
        let k = j;
        while (k < n) {
          const c = str[k];
          if (c === '"' || c === "'" || ch === '`') { k = skipString(str, k); continue; }
          if (c === '/' && str[k + 1] === '/') break;
          if (c === '(' || c === '[' || c === '{') d++;
          else if (c === ')' || c === ']' || c === '}') {
            if (d === 0) break;
            d--;
          } else if (d === 0 && (c === ';' || c === ',' || c === '\n')) {
            break;
          }
          k++;
        }
        const rawExpr = str.slice(j, k).trim();
        if (rawExpr) {
          const innerRewritten = rewriteAwaitExpressions(rawExpr, fidExpr, lineNum);
          const label = rawExpr.length > 36 ? rawExpr.slice(0, 33) + '…' : rawExpr;
          out += `(yield (__t && __t.__await ? __t.__await((${innerRewritten}), ${fidExpr}, ${lineNum}, ${JSON.stringify(label)}) : (${innerRewritten})))`;
          i = k;
          continue;
        }
      }
      out += str.slice(i, id.end);
      i = id.end;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

/* Index of a real `class` keyword on this line (outside strings/comments), or -1. */
function classKeywordIndex(raw: string): number {
  for (let k = 0; k < raw.length; k++) {
    const ch = raw[k];
    if (ch === '"' || ch === "'" || ch === '`') { k = skipString(raw, k) - 1; continue; }
    if (ch === '/' && raw[k + 1] === '/') return -1;
    if (ch === '/' && raw[k + 1] === '*') {
      const e = raw.indexOf('*/', k + 2);
      k = e === -1 ? raw.length : e + 1;
      continue;
    }
    if (isIdentStart(ch)) {
      const id = readIdent(raw, k)!;
      if (id.name === 'class') return k;
      k = id.end - 1;
    }
  }
  return -1;
}

export function instrument(js: string, originalLines: string[], names: string[]): string {
  const lines = js.split('\n');
  const out: string[] = [];
  let parenDepth = 0;
  const braceStack: Array<string | FnHeaderStackInfo> = [];
  let prevContinued = false;
  let prevUnbracedControl = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const t = raw.trim();
    const indent = raw.match(/^\s*/)![0];
    const topBrace = braceStack.length > 0 ? braceStack[braceStack.length - 1] : null;
    const inObject = topBrace === 'object';
    const inClassBody = topBrace === 'classbody';
    const classKw = classKeywordIndex(raw);
    let classBraceIdx = -1;
    if (classKw >= 0) {
      for (let k = classKw + 5; k < raw.length; k++) {
        const ch = raw[k];
        if (ch === '"' || ch === "'" || ch === '`') { k = skipString(raw, k) - 1; continue; }
        if (ch === '/' && raw[k + 1] === '/') break;
        if (ch === '{') { classBraceIdx = k; break; }
      }
    }

    const srcLine = (originalLines[i] != null ? originalLines[i] : t).trim();
    const note = srcLine.length > 72 ? srcLine.slice(0, 69) + '…' : srcLine;
    const insideClass = braceStack.some(k => k === 'classbody');
    const withThis = insideClass && !inClassBody;
    const callExpr = '__t(' + (i + 1) + ', ' + JSON.stringify(note) + ', ' + snapFnExpr(names) + (withThis ? ', this' : '') + ')';

    const canInjectHeader =
      parenDepth === 0 &&
      !inObject &&
      !inClassBody &&
      !prevContinued &&
      !prevUnbracedControl;

    let activeAsyncFn: FnHeaderStackInfo | null = null;
    for (let bIdx = braceStack.length - 1; bIdx >= 0; bIdx--) {
      const bItem = braceStack[bIdx];
      if (bItem && typeof bItem === 'object' && bItem.kind === 'fn') {
        if (bItem.isAsync) activeAsyncFn = bItem;
        break;
      }
    }

    const fnHeader = (!inObject && parenDepth === 0) ? matchFunctionHeaderForStack(raw, i + 1) : null;
    let openFnBraceIdx = -1;
    if (fnHeader) {
      let lastBrace = -1;
      for (let k = 0; k < raw.length; k++) {
        const ch = raw[k];
        if (ch === '"' || ch === "'" || ch === '`') { k = skipString(raw, k) - 1; continue; }
        if (ch === '/' && raw[k + 1] === '/') break;
        if (ch === '{') lastBrace = k;
      }
      openFnBraceIdx = lastBrace;
    }

    const closeFnSplices: Array<{ idx: number; fnInfo: FnHeaderStackInfo }> = [];
    for (let k = 0; k < raw.length; k++) {
      const ch = raw[k];
      if (ch === '"' || ch === "'" || ch === '`') {
        k = skipString(raw, k) - 1;
        continue;
      }
      if (ch === '/' && raw[k + 1] === '/') break;
      if (ch === '(' || ch === '[') parenDepth++;
      else if (ch === ')' || ch === ']') parenDepth = Math.max(0, parenDepth - 1);
      else if (ch === '{') {
        if (fnHeader && k === openFnBraceIdx) {
          braceStack.push(fnHeader);
          continue;
        }
        if (classBraceIdx >= 0 && k === classBraceIdx) {
          braceStack.push('classbody');
          continue;
        }
        let p = k - 1;
        while (p >= 0 && isWS(raw[p])) p--;
        let kind = 'block';
        if (p >= 0) {
          const prev = raw[p];
          if (prev === '=' || prev === '(' || prev === ',' || prev === '[' || prev === ':' || prev === '?') kind = 'object';
          else if (prev === '>' && p >= 1 && raw[p - 1] === '=') kind = 'block';
          else if (isIdentPart(prev)) {
            let w = p;
            while (w >= 0 && isIdentPart(raw[w])) w--;
            const word = raw.slice(w + 1, p + 1);
            if (word === 'return' || word === 'case' || word === 'default' || word === 'yield') kind = 'object';
          }
        } else if (prevContinued) {
          kind = 'object';
        }
        braceStack.push(kind);
      } else if (ch === '}') {
        const popped = braceStack.pop();
        if (popped && typeof popped === 'object' && popped.kind === 'fn') {
          closeFnSplices.push({ idx: k, fnInfo: popped });
        }
      }
    }

    let transformedRaw = raw;
    if (fnHeader && openFnBraceIdx >= 0 && !closeFnSplices.some(s => s.fnInfo === fnHeader)) {
      const headPrefix = fnHeader.isAsync
        ? raw.slice(0, openFnBraceIdx + 1).replace(/\basync\s+/, '')
        : raw.slice(0, openFnBraceIdx + 1);
      const enterHook = fnHeader.isAsync
        ? ` return (__t && __t.__async ? __t.__async(function* () { var ${fnHeader.fidVar} = (typeof __t === "function" && __t.__enter) ? __t.__enter(${JSON.stringify(fnHeader.name)}, ${JSON.stringify(fnHeader.params)}, [${fnHeader.params.join(', ')}], ${fnHeader.line}, ${snapFnExpr(names)}) : 0; try {`
        : ` var ${fnHeader.fidVar} = (typeof __t === "function" && __t.__enter) ? __t.__enter(${JSON.stringify(fnHeader.name)}, ${JSON.stringify(fnHeader.params)}, [${fnHeader.params.join(', ')}], ${fnHeader.line}, ${snapFnExpr(names)}) : 0; try {`;
      transformedRaw = headPrefix + enterHook + raw.slice(openFnBraceIdx + 1);
    } else if (closeFnSplices.length > 0) {
      let rebuilt = transformedRaw;
      for (let sIdx = closeFnSplices.length - 1; sIdx >= 0; sIdx--) {
        const sp = closeFnSplices[sIdx];
        if (sp.fnInfo === fnHeader) continue;
        const leaveHook = sp.fnInfo.isAsync
          ? `} finally { if (typeof __t === "function" && __t.__leave) __t.__leave(${sp.fnInfo.fidVar}); } }, this, ${JSON.stringify(sp.fnInfo.name)}, ${sp.fnInfo.line}) : undefined); `
          : `} finally { if (typeof __t === "function" && __t.__leave) __t.__leave(${sp.fnInfo.fidVar}); } `;
        rebuilt = rebuilt.slice(0, sp.idx) + leaveHook + rebuilt.slice(sp.idx);
      }
      transformedRaw = rebuilt;
    } else {
      // Single-line async function: `async function f() { return 1; }`
      const singleAsyncFnM = transformedRaw.match(/^(\s*(?:export\s+)?(?:default\s+)?)async\s+function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{([\s\S]*)\}\s*;?\s*$/);
      if (singleAsyncFnM) {
        const bodyRewritten = rewriteAwaitExpressions(singleAsyncFnM[4], '0', i + 1);
        transformedRaw = `${singleAsyncFnM[1]}function ${singleAsyncFnM[2]}(${singleAsyncFnM[3]}) { return (__t && __t.__async ? __t.__async(function* () { ${bodyRewritten} }, this, ${JSON.stringify(singleAsyncFnM[2])}, ${i + 1}) : undefined); }`;
      }
    }

    if (activeAsyncFn && /\bawait\b/.test(transformedRaw)) {
      transformedRaw = rewriteAwaitExpressions(transformedRaw, activeAsyncFn.fidVar, i + 1);
    }

    const injectedLine = canInjectHeader ? tryInjectLoopOrElseIf(transformedRaw, callExpr) : null;
    if (injectedLine !== null) {
      out.push(injectedLine);
    } else {
      const canTraceHere = canInjectHeader && isTraceableLine(t);
      if (canTraceHere) {
        out.push(indent + callExpr + ';');
      }
      out.push(transformedRaw);
    }

    if (t) {
      prevContinued = endsWithContinuation(t);
      prevUnbracedControl = isUnbracedControlHeader(t);
    }
  }
  const ckptPreamble =
    'var checkpoint = function(){ try { if (typeof __t === "function" && __t.__ckpt) __t.__ckpt(Array.prototype.slice.call(arguments)); } catch (_){} }, 断点 = checkpoint; ' +
    'var Promise = (__t && __t.__env && __t.__env.Promise) || globalThis.Promise, ' +
    'setTimeout = (__t && __t.__env && __t.__env.setTimeout) || globalThis.setTimeout, ' +
    'clearTimeout = (__t && __t.__env && __t.__env.clearTimeout) || globalThis.clearTimeout, ' +
    'queueMicrotask = (__t && __t.__env && __t.__env.queueMicrotask) || globalThis.queueMicrotask; ' +
    'if (typeof sleep === "undefined") { var sleep = (__t && __t.__env && __t.__env.sleep) || function(ms, val){ return new Promise(function(r){ setTimeout(function(){ r(val); }, ms); }); }; } ' +
    'try { if (typeof __t === "function" && __t.__initGlobal) __t.__initGlobal(' + snapFnExpr(names) + '); } catch (_){} ';
  if (out.length > 0) out[0] = ckptPreamble + out[0];
  else out.push(ckptPreamble);
  return out.join('\n');
}

export function extractCall(src: string): string | null {
  const m = src.match(/\/\/\s*调用[:：]\s*(.+)/);
  return m ? m[1].trim() : null;
}

export function findTrailingTopLevelCall(js: string): { index: number; expr: string; line: number } | null {
  const lines = String(js || '').replace(/\r/g, '').split('\n');
  let idx = lines.length - 1;
  while (idx >= 0) {
    const cleaned = stripInlineCommentSafe(lines[idx]).trim();
    if (!cleaned) { idx--; continue; }
    if (!/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*\s*\(/.test(cleaned)) return null;
    if (!/\)\s*;?\s*$/.test(cleaned)) return null;
    if (/^(?:return|throw|if|for|while|switch|class|function|const|let|var|import|export|await|new)\b/.test(cleaned)) return null;
    const body = cleaned.replace(/;\s*$/, '').trim();
    if (blankStrings(body).includes(';')) return null;
    let depth = 0;
    for (let i = 0; i < idx; i++) {
      const raw = blankStrings(stripInlineCommentSafe(lines[i]));
      for (let k = 0; k < raw.length; k++) {
        const ch = raw[k];
        if (ch === '{' || ch === '(' || ch === '[') depth++;
        else if (ch === '}' || ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
      }
    }
    if (depth !== 0) return null;
    return { index: idx, expr: body, line: idx + 1 };
  }
  return null;
}

export function blankJsLine(js: string, index: number): string {
  const lines = String(js).split('\n');
  if (index >= 0 && index < lines.length) lines[index] = '';
  return lines.join('\n');
}

export function resolveEntry(src: string, js: string): { expr: string; index: number; line: number; legacy: boolean } {
  const legacy = extractCall(src);
  if (legacy) {
    const idx = String(src).replace(/\r/g, '').split('\n').findIndex(l => /\/\/\s*调用[:：]/.test(l));
    return { expr: stripTypes(legacy), index: -1, line: idx >= 0 ? idx + 1 : 0, legacy: true };
  }
  const found = findTrailingTopLevelCall(js);
  if (found) return { expr: stripTypes(found.expr), index: found.index, line: found.line, legacy: false };
  return { expr: 'undefined', index: -1, line: 0, legacy: false };
}

export function formatVal(v: any): string {
  if (v === undefined) return 'undefined';
  if (v === null) return 'null';
  try {
    return typeof v === 'object' ? JSON.stringify(v) : String(v);
  } catch (_) {
    return String(v);
  }
}

export function __describeHeapVal(v: any): any {
  return v;
}
