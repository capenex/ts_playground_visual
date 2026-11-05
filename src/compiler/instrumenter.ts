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
import { stripTypes, transpileEnums } from './transpile';
import type { ComplexityClass, ComplexityReport, FunctionComplexityMeta } from '../types';

export function isTraceableLine(t: string): boolean {
  if (!t) return false;
  if (t.startsWith('//') || t.startsWith('/*') || t.startsWith('*')) return false;
  if (/^[)}\].?:,&|]/.test(t)) return false;
  if (/^[;]+$/.test(t)) return false;
  if (/^(else|do|try|catch|finally|case\b|default\b)/.test(t)) return false;
  if (/^(function|class|interface|type|import|export)\b/.test(t)) return false;
  return true;
}

export function extractBindingNames(lhs: string, names: Set<string>): void {
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
  if (m && m[1] && !RESERVED_WORDS.has(m[1]) && !m[1].startsWith('__')) names.add(m[1]);
}

export function collectNames(js: string): string[] {
  const clean = blankStrings(js);
  const names = new Set<string>();
  let m: RegExpExecArray | null;

  const forRe = /\bfor\s*\(\s*(?:const|let|var)\s+(.+?)\s+(?:of|in)\b/g;
  while ((m = forRe.exec(clean))) {
    extractBindingNames(m[1] || '', names);
  }
  const forClassicRe = /\bfor\s*\(\s*(?:const|let|var)\s+([^;]+)/g;
  while ((m = forClassicRe.exec(clean))) {
    splitTopLevel(m[1] || '').forEach(part => extractBindingNames(part, names));
  }

  const decl = /\b(?:const|let|var)\s+([^;\n]+)/g;
  while ((m = decl.exec(clean))) {
    const rhs = (m[1] || '').replace(/\s+\b(?:of|in)\b[\s\S]*$/, '');
    splitTopLevel(rhs).forEach(part => extractBindingNames(part, names));
  }

  const fn = /\bfunction\b\s*(?:[A-Za-z_$][\w$]*)?\s*\(([^)]*)\)/g;
  while ((m = fn.exec(clean))) {
    splitTopLevel(m[1] || '').forEach(p => extractBindingNames(p, names));
  }

  // Class / object-literal method parameters: `sum(n) { ... }`, `constructor(v) { ... }`
  const method = /(?:^|[\n;{}])\s*(?:(?:public|private|protected|static|async|readonly|get|set)\s+)*([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*(?:\{|:)/g;
  while ((m = method.exec(clean))) {
    if (!m[1] || RESERVED_WORDS.has(m[1])) continue;
    splitTopLevel(m[2] || '').forEach(p => extractBindingNames(p, names));
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
    if (m[1] && !RESERVED_WORDS.has(m[1])) names.add(m[1]);
  }

  const cat = /\bcatch\s*\(\s*([^)]+)\)/g;
  while ((m = cat.exec(clean))) {
    extractBindingNames(m[1] || '', names);
  }

  return [...names];
}

export function snapFnExpr(names: string[]): string {
  const body = names.map(n => {
    const k = JSON.stringify(n);
    return `try{var __x=${n};if(__x!==undefined&&!(__x!==null&&(typeof __x==="object"||typeof __x==="function")&&__g&&${k} in __g&&__x===__g[${k}])){if(__x!==null&&typeof __x==="object")void __x.__isVirtualPromise;__v[${k}]=__x;}}catch(e){}`;
  }).join('');
  return `function(){var __v={},__g=typeof globalThis!=="undefined"?globalThis:null;${body}return __v;}`;
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
  if (mCond && mCond[1] !== undefined) {
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
  if (mFor && mFor[1] !== undefined) {
    const openIdx = mFor[1].length;
    const closeIdx = findBalancedParen(raw, openIdx);
    if (closeIdx > openIdx) {
      const inside = raw.slice(openIdx + 1, closeIdx);
      const semiParts = splitTopLevelSemicolons(inside);
      if (semiParts.length === 3) {
        const init = semiParts[0] ?? '';
        const cond = (semiParts[1] ?? '').trim();
        const upd = semiParts[2] ?? '';
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
  const casePre = raw.match(/^(\s*(?:case\b|default\b))/);
  if (casePre && casePre[1]) {
    let d = 0;
    let colonIdx = -1;
    for (let k = casePre[1].length; k < raw.length; k++) {
      const ch = raw[k];
      if (ch === '"' || ch === "'" || ch === '`') { k = skipString(raw, k) - 1; continue; }
      if (ch === '/' && raw[k + 1] === '/') break;
      if (ch === '(' || ch === '[' || ch === '{') d++;
      else if (ch === ')' || ch === ']' || ch === '}') d = Math.max(0, d - 1);
      else if (ch === ':' && d === 0) {
        colonIdx = k;
        break;
      }
    }
    if (colonIdx >= 0) {
      const afterColon = stripInlineCommentSafe(raw.slice(colonIdx + 1)).trim();
      if (afterColon && afterColon !== '{') {
        return raw.slice(0, colonIdx + 1) + ' ' + callExpr + '; ' + raw.slice(colonIdx + 1).trimStart();
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
  if (m && m[2]) {
    isAsync = Boolean(m[1]);
    fnName = m[2];
    paramRaw = m[3] || '';
  }
  if (!m) {
    m = clean.match(/^(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(async\s+)?function(?:\s+[A-Za-z_$][\w$]*)?\s*\(([^)]*)\)\s*\{$/);
    if (m && m[1]) { isAsync = Boolean(m[2]); fnName = m[1]; paramRaw = m[3] || ''; }
  }
  if (!m) {
    m = clean.match(/^(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(async\s+)?\(([^)]*)\)\s*=>\s*\{$/);
    if (m && m[1]) { isAsync = Boolean(m[2]); fnName = m[1]; paramRaw = m[3] || ''; }
  }
  if (!m) {
    m = clean.match(/^(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(async\s+)?([A-Za-z_$][\w$]*)\s*=>\s*\{$/);
    if (m && m[1]) { isAsync = Boolean(m[2]); fnName = m[1]; paramRaw = m[3] || ''; }
  }
  if (!m) {
    m = clean.match(/^((?:(?:public|private|protected|static|async|readonly|get|set)\s+)*)([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*(?::\s*[^{]+)?\s*\{$/);
    if (m && m[2] && RESERVED_WORDS.has(m[2])) m = null;
    if (m && m[2]) {
      isAsync = /\basync\b/.test(m[1] || '');
      fnName = m[2];
      paramRaw = m[3] || '';
    }
  }
  if (!m || !fnName) return null;
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
      const id = readIdent(str, i);
      if (!id) { i++; continue; }
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
      const id = readIdent(raw, k);
      if (!id) continue;
      if (id.name === 'class') return k;
      k = id.end - 1;
    }
  }
  return -1;
}

export function instrument(js: string, originalLines: string[], names: string[], filePath?: string): string {
  const lines = js.split('\n');
  const out: string[] = [];
  let parenDepth = 0;
  const braceStack: Array<string | FnHeaderStackInfo> = [];
  let prevContinued = false;
  let prevUnbracedControl = false;
  const fileArgSuffix = filePath ? ', ' + JSON.stringify(filePath) : '';

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? '';
    const t = raw.trim();
    const indentMatch = raw.match(/^\s*/);
    const indent = indentMatch ? indentMatch[0] : '';
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

    const origLine = originalLines[i];
    const srcLine = (origLine != null ? origLine : t).trim();
    const note = srcLine.length > 72 ? srcLine.slice(0, 69) + '…' : srcLine;
    const insideClass = braceStack.some(k => k === 'classbody');
    const withThis = insideClass && !inClassBody && !/\bsuper\s*\(/.test(t);
    const callExpr = filePath
      ? '__t(' + (i + 1) + ', ' + JSON.stringify(note) + ', ' + snapFnExpr(names) + ', ' + (withThis ? 'this' : 'undefined') + fileArgSuffix + ')'
      : '__t(' + (i + 1) + ', ' + JSON.stringify(note) + ', ' + snapFnExpr(names) + (withThis ? ', this' : '') + ')';

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
        ? ` return (__t && __t.__async ? __t.__async(function* () { var ${fnHeader.fidVar} = (typeof __t === "function" && __t.__enter) ? __t.__enter(${JSON.stringify(fnHeader.name)}, ${JSON.stringify(fnHeader.params)}, [${fnHeader.params.join(', ')}], ${fnHeader.line}, ${snapFnExpr(names)}${fileArgSuffix}) : 0; try {`
        : ` var ${fnHeader.fidVar} = (typeof __t === "function" && __t.__enter) ? __t.__enter(${JSON.stringify(fnHeader.name)}, ${JSON.stringify(fnHeader.params)}, [${fnHeader.params.join(', ')}], ${fnHeader.line}, ${snapFnExpr(names)}${fileArgSuffix}) : 0; try {`;
      transformedRaw = headPrefix + enterHook + raw.slice(openFnBraceIdx + 1);
    } else if (closeFnSplices.length > 0) {
      let rebuilt = transformedRaw;
      for (let sIdx = closeFnSplices.length - 1; sIdx >= 0; sIdx--) {
        const sp = closeFnSplices[sIdx];
        if (!sp || sp.fnInfo === fnHeader) continue;
        const leaveHook = sp.fnInfo.isAsync
          ? `} finally { if (typeof __t === "function" && __t.__leave) __t.__leave(${sp.fnInfo.fidVar}); } }, this, ${JSON.stringify(sp.fnInfo.name)}, ${sp.fnInfo.line}) : undefined); `
          : `} finally { if (typeof __t === "function" && __t.__leave) __t.__leave(${sp.fnInfo.fidVar}); } `;
        rebuilt = rebuilt.slice(0, sp.idx) + leaveHook + rebuilt.slice(sp.idx);
      }
      transformedRaw = rebuilt;
    } else {
      // Single-line async function: `async function f() { return 1; }`
      const singleAsyncFnM = transformedRaw.match(/^(\s*(?:export\s+)?(?:default\s+)?)async\s+function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{([\s\S]*)\}\s*;?\s*$/);
      if (singleAsyncFnM && singleAsyncFnM[2] !== undefined && singleAsyncFnM[4] !== undefined) {
        const bodyRewritten = rewriteAwaitExpressions(singleAsyncFnM[4], '0', i + 1);
        transformedRaw = `${singleAsyncFnM[1] || ''}function ${singleAsyncFnM[2]}(${singleAsyncFnM[3] || ''}) { return (__t && __t.__async ? __t.__async(function* () { ${bodyRewritten} }, this, ${JSON.stringify(singleAsyncFnM[2])}, ${i + 1}) : undefined); }`;
      }
    }

    if (activeAsyncFn && /\bawait\b/.test(transformedRaw)) {
      transformedRaw = rewriteAwaitExpressions(transformedRaw, activeAsyncFn.fidVar, i + 1);
    }

    if (/\bcatch\b/.test(transformedRaw)) {
      transformedRaw = transformedRaw
        .replace(/\bcatch\s*\(\s*([A-Za-z_$][\w$]*)\s*\)\s*\{/g, 'catch ($1) { if ($1 && ($1.__debugPause || $1.__timeout)) throw $1;')
        .replace(/\bcatch\s*\{/g, 'catch (__e) { if (__e && (__e.__debugPause || __e.__timeout)) throw __e;');
    }

    if (raw.trimStart().startsWith('/*__import__*/')) {
      out.push(transformedRaw);
      continue;
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
  return m && m[1] ? m[1].trim() : null;
}

export function findTrailingTopLevelCall(js: string): { index: number; expr: string; line: number } | null {
  const lines = String(js || '').replace(/\r/g, '').split('\n');
  let idx = lines.length - 1;
  while (idx >= 0) {
    const cleaned = stripInlineCommentSafe(lines[idx]).trim();
    if (!cleaned) { idx--; continue; }
    if (!/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*\s*\(/.test(cleaned)) return null;
    if (!/\)\s*;?\s*$/.test(cleaned)) return null;
    if (/^(?:return|throw|if|for|while|switch|class|function|const|let|var|import|export|await|new|checkpoint|断点)\b/.test(cleaned)) return null;
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

export function formatVal(v: unknown): string {
  if (v === undefined) return 'undefined';
  if (v === null) return 'null';
  try {
    return typeof v === 'object' ? JSON.stringify(v) : String(v);
  } catch (_) {
    return String(v);
  }
}

export function __describeHeapVal(v: unknown): unknown {
  return v;
}

const COMPLEXITY_RANK: Record<ComplexityClass, number> = {
  'O(1)': 0,
  'O(log N)': 1,
  'O(N)': 2,
  'O(N log N)': 3,
  'O(N²)': 4,
  'O(N³)': 5,
  'O(2^N)': 6,
};

export function compareComplexityClass(a: ComplexityClass, b: ComplexityClass): number {
  return COMPLEXITY_RANK[a] - COMPLEXITY_RANK[b];
}

export function maxComplexityClass(a: ComplexityClass, b: ComplexityClass): ComplexityClass {
  return compareComplexityClass(a, b) >= 0 ? a : b;
}

export function estimateInputSizeFromCall(callExpr: string, src?: string): number | null {
  const c = String(callExpr || '').trim();
  if (!c || c === 'undefined') return null;

  const arrLit = c.match(/\[([^\][]+)\]/);
  if (arrLit && arrLit[1]) {
    const items = arrLit[1].split(',').map(x => x.trim()).filter(Boolean);
    if (items.length > 0) return items.length;
  }

  const strMatches: string[] = [];
  const strRe = /"([^"\\]*)"|'([^'\\]*)'/g;
  let sm;
  while ((sm = strRe.exec(c))) {
    const sVal = sm[1] !== undefined ? sm[1] : (sm[2] || '');
    if (sVal.length > 0) strMatches.push(sVal);
  }
  if (strMatches.length > 0) {
    return Math.max(...strMatches.map(s => s.length));
  }

  const numMatch = c.match(/\(\s*(\d+)\s*(?:[,)]|$)/);
  if (numMatch && numMatch[1]) {
    const nVal = parseInt(numMatch[1], 10);
    if (nVal > 0 && nVal <= 100000) return nVal;
  }

  if (src) {
    const allArrs = [...src.matchAll(/\[([^\][\n]{3,})\]/g)];
    let bestLen = 0;
    for (const m of allArrs) {
      if (m[1]) {
        const count = m[1].split(',').filter(x => x.trim().length > 0).length;
        if (count > bestLen) bestLen = count;
      }
    }
    if (bestLen > 1) return bestLen;
  }

  return null;
}

function estimateSpaceFromBlock(bodyText: string, recursionBranches: number, hasLogRecursion: boolean): { space: ComplexityClass; spaceReason: string } {
  const clean = blankStrings(bodyText);
  if (
    /Array\.from\s*\([^)]*=>\s*(?:new\s+Array|Array\.from|\[)/.test(clean) ||
    /\.map\s*\([^)]*=>\s*(?:new\s+Array|Array\.from|\[[^\]]*\.(?:fill|map))/.test(clean) ||
    /\b(?:dp|grid|mat|matrix|board|table)\s*:\s*[^=;]+\[\]\[\]/.test(bodyText)
  ) {
    return { space: 'O(N²)', spaceReason: '分配二维矩阵/DP 表空间 O(N²)' };
  }
  if (
    /\bnew\s+(?:Map|Set|Array)\b/.test(clean) ||
    /\.(?:slice|concat|filter|map|split)\s*\(/.test(clean) ||
    /\b(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*(?::\s*[^=]+)?=\s*\[\s*\]/.test(clean)
  ) {
    return { space: 'O(N)', spaceReason: '分配线性集合/数组空间 O(N)' };
  }
  if (recursionBranches >= 1) {
    return hasLogRecursion
      ? { space: 'O(log N)', spaceReason: '递归调用栈深 O(log N)' }
      : { space: 'O(N)', spaceReason: '递归调用栈深 O(N)' };
  }
  return { space: 'O(1)', spaceReason: '原地常量级辅助空间 O(1)' };
}

function analyzeSingleFunctionBlock(
  fnName: string,
  startLine: number,
  bodyLines: string[]
): FunctionComplexityMeta {
  const joined = bodyLines.join('\n');
  const cleanJoined = blankStrings(joined);

  let maxLoopDepth = 0;
  let effectiveLoopDepth = 0;
  let hasLogStep = false;
  let hasSortCall = /\.\s*sort\s*\(/.test(cleanJoined);
  let hasAmortizedInner = false;

  const loopStack: Array<{ braceDepth: number; isLog: boolean; isAmortized: boolean; isConstantBound: boolean }> = [];
  let braceDepth = 0;

  for (let i = 0; i < bodyLines.length; i++) {
    const raw = bodyLines[i] || '';
    const clean = stripInlineCommentSafe(raw).trim();
    if (!clean) continue;

    const isFor = /^\s*for\s*\(/.test(clean);
    const isWhile = /^\s*(?:while|do)\b/.test(clean);
    const isIterMethod = /\.\s*(?:forEach|map|filter|reduce|some|every|find|findIndex)\s*\(/.test(clean);

    if (isFor || isWhile) {
      const lookahead = bodyLines.slice(i, Math.min(bodyLines.length, i + 10)).map(stripInlineCommentSafe).join(' ');
      const isLogLoop =
        /(?:\*=|\/=|>>=|<<=)\s*2\b/.test(lookahead) ||
        /[A-Za-z_$][\w$]*\s*=\s*[A-Za-z_$][\w$]*\s*[*/]\s*2\b/.test(lookahead) ||
        /\bmid\b[\s\S]{0,120}\b(?:lo|left|l|start)\s*=\s*mid\b|\b(?:hi|right|r|end)\s*=\s*mid\b/.test(lookahead) ||
        /\bMath\.floor\s*\(\s*\([^)]+\)\s*\/\s*2\s*\)/.test(lookahead) ||
        />>\s*1\b/.test(lookahead);

      const constForBound = isFor && /;\s*[A-Za-z_$][\w$]*\s*<=\s*([0-9]+)\b|;\s*[A-Za-z_$][\w$]*\s*<\s*([0-9]+)\b/.exec(clean);
      const boundNum = constForBound ? parseInt(constForBound[1] || constForBound[2] || '999', 10) : 999;
      const isConstLoop = boundNum <= 8;

      const isInnerWhile = isWhile && loopStack.length >= 1;
      const isAmortizedTwoPtr =
        isInnerWhile &&
        (/\b(?:l|left|slow|start)\s*(?:\+\+|\+=\s*1)/.test(lookahead) ||
          /\.(?:pop|shift)\s*\(\s*\)/.test(lookahead));

      if (isLogLoop) hasLogStep = true;
      if (isAmortizedTwoPtr) hasAmortizedInner = true;

      loopStack.push({
        braceDepth,
        isLog: isLogLoop,
        isAmortized: isAmortizedTwoPtr,
        isConstantBound: isConstLoop,
      });

      const rawDepth = loopStack.filter(l => !l.isConstantBound).length;
      const effDepth = loopStack.filter(l => !l.isConstantBound && !l.isAmortized).length;
      if (rawDepth > maxLoopDepth) maxLoopDepth = rawDepth;
      if (effDepth > effectiveLoopDepth) effectiveLoopDepth = effDepth;
    } else if (isIterMethod) {
      const curEff = loopStack.filter(l => !l.isConstantBound && !l.isAmortized).length + 1;
      if (curEff > maxLoopDepth) maxLoopDepth = curEff;
      if (curEff > effectiveLoopDepth) effectiveLoopDepth = curEff;
    }

    const noStr = blankStrings(clean);
    for (let k = 0; k < noStr.length; k++) {
      const ch = noStr[k];
      if (ch === '{') braceDepth++;
      else if (ch === '}') {
        braceDepth = Math.max(0, braceDepth - 1);
        while (loopStack.length > 0) {
          const top = loopStack[loopStack.length - 1];
          if (top && braceDepth <= top.braceDepth) {
            loopStack.pop();
          } else {
            break;
          }
        }
      }
    }
  }

  let recursionBranches = 0;
  let hasHalvingRecursionArg = false;
  let hasMemoization = /\b(?:memo|cache|dp)\b\s*(?:\.\s*(?:has|get)|\[)/.test(cleanJoined);

  if (fnName && fnName !== '<top>') {
    const bodyWithoutHeader = bodyLines.slice(1).map(stripInlineCommentSafe).join('\n');
    const escapedFn = fnName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const callRe = new RegExp(`\\b${escapedFn}\\s*\\(([^)]*)\\)`, 'g');
    let cm;
    while ((cm = callRe.exec(bodyWithoutHeader))) {
      recursionBranches++;
      const argsTxt = cm[1] || '';
      if (
        /\b(?:mid|m|half)\b/.test(argsTxt) ||
        /\/\s*2\b|>>\s*1\b|\.slice\s*\(/.test(argsTxt)
      ) {
        hasHalvingRecursionArg = true;
      }
    }
  }

  let timeComplexity: ComplexityClass = 'O(1)';
  const reasons: string[] = [];

  if (recursionBranches >= 2) {
    if (hasHalvingRecursionArg) {
      const hasLinearCombine = effectiveLoopDepth >= 1 || /\.(?:slice|concat|filter|map|reduce)\s*\(/.test(cleanJoined);
      timeComplexity = hasLinearCombine ? 'O(N log N)' : 'O(N)';
      reasons.push(
        hasLinearCombine
          ? `分治递归 (${recursionBranches} 分支折半) + 线性切分/合并 → O(N log N)`
          : `二分递归遍历 (${recursionBranches} 分支折半) → O(N)`
      );
    } else if (hasMemoization) {
      timeComplexity = effectiveLoopDepth >= 1 ? 'O(N²)' : 'O(N)';
      reasons.push(`记忆化递归 (Memoization) 消除重复子问题 → ${timeComplexity}`);
    } else {
      timeComplexity = 'O(2^N)';
      reasons.push(`多分支递归 (${recursionBranches} 路自调用且无折半/记忆化) → 指数级 O(2^N)`);
    }
  } else if (recursionBranches === 1) {
    if (hasHalvingRecursionArg) {
      timeComplexity = effectiveLoopDepth >= 1 ? 'O(N)' : 'O(log N)';
      reasons.push(`单路折半递归 → ${timeComplexity}`);
    } else {
      timeComplexity = effectiveLoopDepth >= 1 ? 'O(N²)' : 'O(N)';
      reasons.push(`线性递归调用 → ${timeComplexity}`);
    }
  } else {
    if (effectiveLoopDepth >= 3) {
      timeComplexity = 'O(N³)';
      reasons.push(`检测到 ${effectiveLoopDepth} 层嵌套循环 → O(N³)`);
    } else if (effectiveLoopDepth === 2) {
      if (hasLogStep) {
        timeComplexity = 'O(N log N)';
        reasons.push('外层线性循环 + 内层对数折半步长 → O(N log N)');
      } else {
        timeComplexity = 'O(N²)';
        reasons.push('双重嵌套循环遍历 → O(N²)');
      }
    } else if (effectiveLoopDepth === 1) {
      if (hasLogStep && maxLoopDepth === 1) {
        timeComplexity = 'O(log N)';
        reasons.push('循环步长每次折半/倍增 (二分/倍增) → O(log N)');
      } else if (hasAmortizedInner) {
        timeComplexity = 'O(N)';
        reasons.push('外层循环 + 内层双指针/单调栈均摊单调推进 → 均摊 O(N)');
      } else {
        timeComplexity = 'O(N)';
        reasons.push('单层线性循环扫描 → O(N)');
      }
    } else {
      timeComplexity = 'O(1)';
      reasons.push('无随输入规模增长的循环或递归 → 常量时间 O(1)');
    }
  }

  if (hasSortCall && compareComplexityClass(timeComplexity, 'O(N log N)') < 0) {
    timeComplexity = 'O(N log N)';
    reasons.push('包含 .sort() 排序调用 → O(N log N)');
  }

  const { space, spaceReason } = estimateSpaceFromBlock(
    joined,
    recursionBranches,
    hasHalvingRecursionArg
  );
  reasons.push(spaceReason);

  return {
    fnName,
    line: startLine,
    timeComplexity,
    spaceComplexity: space,
    maxLoopDepth,
    hasLogStep: hasLogStep || hasHalvingRecursionArg,
    recursionBranches,
    rationale: reasons.join(' · '),
  };
}

export function analyzeTimeComplexity(src: string, jsOverride?: string): ComplexityReport {
  const rawSrc = String(src || '').replace(/\r/g, '');
  let js = jsOverride;
  if (!js) {
    const enums = transpileEnums(rawSrc);
    js = stripTypes(enums.code);
  }
  const srcLines = rawSrc.split('\n');
  const functions: FunctionComplexityMeta[] = [];

  const fnOpenRe = /^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/;
  const methodOpenRe = /^\s*(?:public\s+|private\s+|protected\s+|static\s+|async\s+)*([A-Za-z_$][\w$]*)\s*\([^;]*\)\s*(?::\s*[^{]+)?\{/;
  const arrowOpenRe = /^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::\s*[^=]+)?=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*(?::\s*[^=]+)?=>\s*\{/;

  let i = 0;
  const coveredLines = new Set<number>();

  while (i < srcLines.length) {
    const lineText = stripInlineCommentSafe(srcLines[i] || '');
    const fnMatch =
      fnOpenRe.exec(lineText) ||
      arrowOpenRe.exec(lineText) ||
      (!/^\s*(?:if|for|while|switch|catch|function|class|interface|type)\b/.test(lineText) ? methodOpenRe.exec(lineText) : null);

    if (fnMatch && fnMatch[1] && fnMatch[1] !== 'constructor') {
      const fnName = fnMatch[1];
      const startIdx = i;
      let depth = 0;
      let started = false;
      let endIdx = i;
      for (let k = i; k < srcLines.length; k++) {
        const clean = blankStrings(stripInlineCommentSafe(srcLines[k] || ''));
        for (let c = 0; c < clean.length; c++) {
          if (clean[c] === '{') {
            depth++;
            started = true;
          } else if (clean[c] === '}') {
            depth--;
          }
        }
        endIdx = k;
        if (started && depth <= 0) break;
      }
      for (let k = startIdx; k <= endIdx; k++) coveredLines.add(k);
      const blockLines = srcLines.slice(startIdx, endIdx + 1);
      functions.push(analyzeSingleFunctionBlock(fnName, startIdx + 1, blockLines));
      i = endIdx + 1;
      continue;
    }
    i++;
  }

  const topLines = srcLines.filter((_, idx) => !coveredLines.has(idx));
  const topMeta = analyzeSingleFunctionBlock('<top>', 1, topLines);

  // Detect helper calls inside functions (e.g. mergeSort calling merge -> O(N log N))
  const fnMap = new Map<string, FunctionComplexityMeta>();
  functions.forEach(f => fnMap.set(f.fnName, f));
  for (const fn of functions) {
    if (fn.recursionBranches >= 2 && fn.hasLogStep && fn.timeComplexity === 'O(N)') {
      for (const [otherName, otherMeta] of fnMap.entries()) {
        if (otherName !== fn.fnName && compareComplexityClass(otherMeta.timeComplexity, 'O(N)') >= 0) {
          const fnSrc = srcLines.slice(fn.line - 1).join('\n');
          const callOtherRe = new RegExp(`\\b${otherName}\\s*\\(`);
          if (callOtherRe.test(fnSrc)) {
            fn.timeComplexity = 'O(N log N)';
            fn.rationale = `分治递归调用线性子过程 ${otherName}() → O(N log N)`;
          }
        }
      }
    }
  }

  let overallTime: ComplexityClass = topMeta.timeComplexity;
  let overallSpace: ComplexityClass = topMeta.spaceComplexity;
  let dominantFn: FunctionComplexityMeta | null = null;

  for (const fn of functions) {
    if (compareComplexityClass(fn.timeComplexity, overallTime) >= 0) {
      overallTime = fn.timeComplexity;
      dominantFn = fn;
    }
    overallSpace = maxComplexityClass(overallSpace, fn.spaceComplexity);
  }

  const primaryRationale = dominantFn
    ? `${dominantFn.fnName}(): ${dominantFn.rationale}`
    : topMeta.rationale;

  return {
    overallTime,
    overallSpace,
    confidence: functions.length > 0 ? 'high' : 'medium',
    rationale: primaryRationale,
    functions,
  };
}
