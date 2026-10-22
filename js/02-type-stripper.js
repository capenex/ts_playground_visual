/* ================================================================
   TypeScript Playground — type stripper
   Part 2/10 · loaded in order from index.html (classic script;
   shares the global lexical scope with the other parts).
   ================================================================ */

/* ================================================================
   1) Type stripper — string/comment-safe, line-preserving, ternary-aware
   ================================================================ */
function skipString(src, i) {
  const q = src[i];
  i++;
  const n = src.length;
  while (i < n) {
    if (src[i] === '\\') { i += 2; continue; }
    if (src[i] === q) return i + 1;
    if (q === '`' && src[i] === '$' && src[i + 1] === '{') {
      i = skipTemplateExpr(src, i + 2);
      continue;
    }
    i++;
  }
  return n;
}
function skipTemplateExpr(src, i) {
  const n = src.length;
  let depth = 1;
  while (i < n && depth > 0) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) return i + 1;
    } else if (src[i] === '"' || src[i] === "'" || src[i] === '`') {
      i = skipString(src, i);
      continue;
    }
    i++;
  }
  return n;
}
function newlinesOf(s) {
  const m = s.match(/\n/g);
  return m ? m.map(() => '\n').join('') : '';
}

function isIdentStart(c) { return /[A-Za-z_$]/.test(c); }
function isIdentPart(c) { return /[\w$]/.test(c); }
function isWS(c) { return c === ' ' || c === '\t' || c === '\n' || c === '\r'; }

function readIdent(src, i) {
  const n = src.length;
  if (i >= n || !isIdentStart(src[i])) return null;
  let j = i;
  while (j < n && isIdentPart(src[j])) j++;
  return { name: src.slice(i, j), end: j };
}

function skipRegex(src, i) {
  const n = src.length;
  if (src[i] !== '/') return -1;
  let j = i + 1;
  let inClass = false;
  while (j < n) {
    const ch = src[j];
    if (ch === '\\') { j += 2; continue; }
    if (ch === '\n') return -1;
    if (ch === '[') inClass = true;
    else if (ch === ']') inClass = false;
    else if (ch === '/' && !inClass) { j++; break; }
    j++;
  }
  while (j < n && /[gimsuy]/.test(src[j])) j++;
  return j;
}

function regexAllowedBefore(src, i) {
  let k = i - 1;
  while (k >= 0 && isWS(src[k])) k--;
  if (k < 0) return true;
  const c = src[k];
  if (/[(=,:;!?&|{}[\]]/.test(c)) return true;
  if (isIdentPart(c)) {
    let w = k;
    while (w >= 0 && isIdentPart(src[w])) w--;
    const word = src.slice(w + 1, k + 1);
    return /^(return|typeof|instanceof|in|of|new|delete|void|case|do|else|yield|await)$/.test(word);
  }
  return false;
}

function emitTemplate(src, i) {
  const n = src.length;
  const parts = ['`'];
  i++;
  while (i < n) {
    if (src[i] === '\\') {
      parts.push(src.slice(i, i + 2));
      i += 2;
      continue;
    }
    if (src[i] === '`') {
      parts.push('`');
      return { next: i + 1, text: parts.join('') };
    }
    if (src[i] === '$' && src[i + 1] === '{') {
      parts.push('${');
      i += 2;
      const start = i;
      let depth = 1;
      while (i < n && depth > 0) {
        const ch = src[i];
        if (ch === '{') depth++;
        else if (ch === '}') depth--;
        else if (ch === '"' || ch === "'" || ch === '`') {
          i = skipString(src, i);
          continue;
        }
        i++;
      }
      const end = Math.max(start, i - 1);
      parts.push(stripTypes(src.slice(start, end)));
      parts.push('}');
      i = end + 1;
      continue;
    }
    parts.push(src[i]);
    i++;
  }
  return { next: n, text: parts.join('') };
}

function looksLikeTypeText(text) {
  const t = text.trim();
  if (!t) return false;
  if (/^(number|string|boolean|void|any|unknown|never|object|symbol|bigint|undefined|null|true|false)\b/.test(t)) return true;
  if (/^(typeof|keyof|infer|asserts|readonly|unique)\b/.test(t)) return true;
  if (/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/.test(t)) return true;
  if (/[<>\[\]|&]/.test(t)) return true;
  if (/\bextends\b/.test(t)) return true;
  if (/^[([]/.test(t)) return true;
  if (/^\{/.test(t)) return true;   // object or mapped type literal: { a: number; b: string } or { [K in keyof T]: T[K] }
  if (/^["'`]/.test(t)) return true; // string or template literal type
  if (/^-?\d/.test(t)) return true;  // numeric literal type
  return false;
}

function tryParseType(src, i) {
  const n = src.length;
  let j = i;
  while (j < n && isWS(src[j])) j++;

  const atom = tryParseTypeAtom(src, j);
  if (atom < 0) return -1;
  j = atom;

  for (;;) {
    let k = j;
    while (k < n && (src[k] === ' ' || src[k] === '\t')) k++;
    if (src[k] === '|' || src[k] === '&') {
      const next = tryParseTypeAtom(src, k + 1);
      if (next < 0) return j;
      j = next;
      continue;
    }
    // Conditional type: `T extends U ? X : Y`
    if (src.startsWith('extends', k) && !isIdentPart(src[k + 7] || '')) {
      const extEnd = tryParseType(src, k + 7);
      if (extEnd > k + 7) {
        let q = extEnd;
        while (q < n && isWS(src[q])) q++;
        if (src[q] === '?') {
          const trueEnd = tryParseType(src, q + 1);
          if (trueEnd > q + 1) {
            let c = trueEnd;
            while (c < n && isWS(src[c])) c++;
            if (src[c] === ':') {
              const falseEnd = tryParseType(src, c + 1);
              if (falseEnd > c + 1) {
                j = falseEnd;
                continue;
              }
            }
          }
        }
      }
    }
    return j;
  }
}

function tryParseTypeAtom(src, i) {
  const n = src.length;
  let j = i;
  while (j < n && isWS(src[j])) j++;
  const rest = src.slice(j, j + 80);

  if (/^readonly\b/.test(rest) && !isIdentPart(src[j + 8] || '')) {
    return tryParseTypeAtom(src, j + 8);
  }

  if (/^(typeof|keyof)\b/.test(rest)) {
    const kw = rest.startsWith('typeof') ? 6 : 5;
    let k = j + kw;
    while (k < n && isWS(src[k])) k++;
    const targetEnd = tryParseTypeAtom(src, k);
    if (targetEnd < 0) return -1;
    return tryParseTypeSuffix(src, targetEnd);
  }

  if (/^infer\b/.test(rest) && !isIdentPart(src[j + 5] || '')) {
    let k = j + 5;
    while (k < n && isWS(src[k])) k++;
    const id = readIdent(src, k);
    if (!id) return -1;
    let endPos = id.end;
    let m = endPos;
    while (m < n && (src[m] === ' ' || src[m] === '\t')) m++;
    if (src.startsWith('extends', m) && !isIdentPart(src[m + 7] || '')) {
      const cEnd = tryParseTypeAtom(src, m + 7);
      if (cEnd > m + 7) endPos = cEnd;
    }
    return tryParseTypeSuffix(src, endPos);
  }

  if (src[j] === '"' || src[j] === "'" || src[j] === '`') {
    const strEnd = skipString(src, j);
    return tryParseTypeSuffix(src, strEnd);
  }

  const numLit = /^-?\d+(?:\.\d+)?\b/.exec(rest);
  if (numLit) {
    return tryParseTypeSuffix(src, j + numLit[0].length);
  }

  if (src[j] === '(') {
    let depth = 0;
    while (j < n) {
      if (src[j] === '(') depth++;
      else if (src[j] === ')') { depth--; if (depth === 0) { j++; break; } }
      else if (src[j] === '"' || src[j] === "'" || src[j] === '`') { j = skipString(src, j); continue; }
      j++;
    }
    while (j < n && isWS(src[j])) j++;
    if (src[j] === '=' && src[j + 1] === '>') {
      j += 2;
      return tryParseType(src, j);
    }
    return tryParseTypeSuffix(src, j);
  }

  if (src[j] === '{') {
    let depth = 0;
    while (j < n) {
      if (src[j] === '{') depth++;
      else if (src[j] === '}') { depth--; if (depth === 0) { j++; break; } }
      else if (src[j] === '"' || src[j] === "'" || src[j] === '`') { j = skipString(src, j); continue; }
      j++;
    }
    return tryParseTypeSuffix(src, j);
  }

  if (src[j] === '[') {
    let depth = 0;
    while (j < n) {
      if (src[j] === '[') depth++;
      else if (src[j] === ']') { depth--; if (depth === 0) { j++; break; } }
      else if (src[j] === '"' || src[j] === "'" || src[j] === '`') { j = skipString(src, j); continue; }
      j++;
    }
    return tryParseTypeSuffix(src, j);
  }

  const prim = /^(number|string|boolean|void|any|unknown|never|object|symbol|bigint|undefined|null|true|false)\b/.exec(rest);
  if (prim) {
    j += prim[0].length;
    return tryParseTypeSuffix(src, j);
  }

  const id = readIdent(src, j);
  if (!id) return -1;
  j = id.end;
  while (j < n && src[j] === '.') {
    const nextId = readIdent(src, j + 1);
    if (!nextId) break;
    j = nextId.end;
  }

  let k = j;
  while (k < n && (src[k] === ' ' || src[k] === '\t')) k++;
  if (src[k] === '<') {
    let depth = 0;
    let braceDepth = 0;
    while (k < n) {
      const ch = src[k];
      if ((ch === '\n' || ch === '\r' || ch === ';') && depth === 0 && braceDepth === 0) break;
      if (ch === '"' || ch === "'" || ch === '`') { k = skipString(src, k); continue; }
      if (ch === '{') braceDepth++;
      else if (ch === '}') {
        if (braceDepth > 0) braceDepth--;
        else break;
      } else if (ch === '<') depth++;
      else if (ch === '>' && src[k - 1] !== '=') {
        depth--;
        if (depth === 0) { k++; break; }
      }
      k++;
    }
    if (depth === 0) j = k;
  }
  return tryParseTypeSuffix(src, j);
}

function tryParseTypeSuffix(src, i) {
  let j = i;
  const n = src.length;
  for (;;) {
    let k = j;
    while (k < n && (src[k] === ' ' || src[k] === '\t')) k++;
    if (src[k] === '[') {
      if (src[k + 1] === ']') {
        j = k + 2;
        continue;
      }
      // Indexed access type: T[K], T["id"], T[number], T[keyof U]
      let depth = 1;
      let m = k + 1;
      while (m < n && depth > 0) {
        const ch = src[m];
        if (ch === '\n' || ch === ';') break;
        if (ch === '"' || ch === "'" || ch === '`') { m = skipString(src, m); continue; }
        if (ch === '[') depth++;
        else if (ch === ']') depth--;
        m++;
      }
      if (depth === 0) {
        j = m;
        continue;
      }
    }
    return j;
  }
}

/* `<T,>(x: T): T => x` or `<T extends Foo>(x: T) => x` — drop the type-parameter list of a generic arrow function. */
function tryStripGenericArrow(src, i) {
  const n = src.length;
  let j = i + 1, depth = 1;
  while (j < n && depth > 0) {
    const ch = src[j];
    if (ch === '"' || ch === "'" || ch === '`') { j = skipString(src, j); continue; }
    if (ch === '\n' || ch === ';') return -1;
    if (ch === '<') depth++;
    else if (ch === '>' && src[j - 1] !== '=') depth--;
    j++;
  }
  if (depth !== 0) return -1;
  let k = j;
  while (k < n && isWS(src[k])) k++;
  if (src[k] !== '(') return -1;
  let pd = 1, m = k + 1;
  while (m < n && pd > 0) {
    const ch = src[m];
    if (ch === '"' || ch === "'" || ch === '`') { m = skipString(src, m); continue; }
    if (ch === '(') pd++;
    else if (ch === ')') pd--;
    m++;
  }
  if (pd !== 0) return -1;
  let p = m;
  while (p < n && isWS(src[p])) p++;
  if (src[p] === ':') {
    const typeEnd = tryParseType(src, p + 1);
    if (typeEnd > p + 1) p = typeEnd;
  }
  while (p < n && isWS(src[p])) p++;
  if (src[p] === '=' && src[p + 1] === '>') return j;
  return -1;
}

/* Remove comments but keep string literals intact (used when parsing enum bodies). */
function stripCommentsOnly(s) {
  let out = '', i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === '"' || c === "'" || c === '`') {
      const end = skipString(s, i);
      out += s.slice(i, end);
      i = end;
      continue;
    }
    if (c === '/' && s[i + 1] === '/') { while (i < s.length && s[i] !== '\n') i++; continue; }
    if (c === '/' && s[i + 1] === '*') {
      const end = s.indexOf('*/', i + 2);
      i = end === -1 ? s.length : end + 2;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

/* `enum E { A, B = 5 }` → `var E; (function (E) { E[E["A"] = 0] = "A"; ... })(E || (E = {}));`
   Emitted as a single line so the debugger's 1:1 line mapping survives. */
function buildEnumIIFE(name, body, line) {
  const parts = splitTopLevel(stripCommentsOnly(body));
  const stmts = [];
  const known = Object.create(null);
  let next = 0;
  for (const rawPart of parts) {
    const part = rawPart.trim();
    if (!part) continue;
    const m = part.match(/^([A-Za-z_$][\w$]*)\s*(?:=\s*([\s\S]+))?$/);
    if (!m) {
      return { error: { line, message: 'enum 成员暂不支持这种写法：' + part.slice(0, 40) } };
    }
    const key = m[1];
    const init = m[2] === undefined ? null : m[2].trim();
    if (init === null) {
      stmts.push(name + '[' + JSON.stringify(key) + '] = ' + next + '; ' + name + '[' + next + '] = ' + JSON.stringify(key) + ';');
      known[key] = next;
      next++;
      continue;
    }
    if (/^["']/.test(init)) {
      let val = undefined;
      try { val = new Function('return (' + init + ');')(); } catch (_) { val = undefined; }
      if (typeof val !== 'string') {
        return { error: { line, message: 'enum 成员 "' + key + '" 的值无法静态求值' } };
      }
      stmts.push(name + '[' + JSON.stringify(key) + '] = ' + JSON.stringify(val) + ';');
      known[key] = val;
      continue;
    }
    let value;
    try {
      // Previous members are in scope, so `B = A + 10` works like it does in TS.
      const argNames = Object.keys(known);
      value = new Function(...argNames, 'return (' + init + ');')(...argNames.map(k => known[k]));
    } catch (_) { value = undefined; }
    if (typeof value !== 'number' || !isFinite(value)) {
      return { error: { line, message: 'enum 成员 "' + key + '" 的值无法静态求值（暂不支持引用其他成员或复杂表达式）' } };
    }
    stmts.push(name + '[' + name + '[' + JSON.stringify(key) + '] = ' + value + '] = ' + JSON.stringify(key) + ';');
    known[key] = value;
    next = value + 1;
  }
  return {
    code: 'var ' + name + '; (function (' + name + ') { ' + stmts.join(' ') + ' })( ' + name + ' || (' + name + ' = {}) );',
    error: null,
  };
}

/* Rewrite every enum declaration in the source, keeping the line count identical. */
function transpileEnums(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') {
      const end = skipString(src, i);
      out += src.slice(i, end);
      i = end;
      continue;
    }
    if (c === '/' && src[i + 1] === '/') {
      let j = i;
      while (j < n && src[j] !== '\n') j++;
      out += src.slice(i, j);
      i = j;
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      const e = src.indexOf('*/', i + 2);
      const end = e === -1 ? n : e + 2;
      out += src.slice(i, end);
      i = end;
      continue;
    }
    if (isIdentStart(c)) {
      const id = readIdent(src, i);
      const isConstEnum = id.name === 'const' && /^\s*enum\b/.test(src.slice(i + 5));
      if (id.name === 'enum' || isConstEnum) {
        const start = i;
        let j = isConstEnum ? i + 5 : i;
        while (j < n && isWS(src[j])) j++;
        if (src.slice(j, j + 4) === 'enum' && !isIdentPart(src[j + 4] || '')) {
          j += 4;
          while (j < n && isWS(src[j])) j++;
          const nameId = readIdent(src, j);
          j = nameId.end;
          while (j < n && isWS(src[j])) j++;
          if (nameId.name && src[j] === '{') {
            let depth = 1, k = j + 1;
            while (k < n && depth > 0) {
              const ch = src[k];
              if (ch === '"' || ch === "'" || ch === '`') { k = skipString(src, k); continue; }
              if (ch === '/' && src[k + 1] === '/') { while (k < n && src[k] !== '\n') k++; continue; }
              if (ch === '/' && src[k + 1] === '*') {
                const e = src.indexOf('*/', k + 2);
                k = e === -1 ? n : e + 2;
                continue;
              }
              if (ch === '{') depth++;
              else if (ch === '}') depth--;
              k++;
            }
            if (depth === 0) {
              const line = src.slice(0, start).split('\n').length;
              const built = buildEnumIIFE(nameId.name, src.slice(j + 1, k - 1), line);
              if (built.error) return { code: src, error: built.error };
              out += built.code;
              out += '\n'.repeat((src.slice(start, k).match(/\n/g) || []).length);
              i = k;
              continue;
            }
          }
        }
      }
      out += src.slice(i, id.end);
      i = id.end;
      continue;
    }
    out += c;
    i++;
  }
  return { code: out, error: null };
}

/* Transpile `namespace N { export const x = 1; export function f() {} }` while keeping 1:1 line numbers. */
function transpileNamespaces(src) {
  if (!/\b(?:namespace|module)\s+[A-Za-z_$]/.test(src)) return src;
  const lines = src.split('\n');
  const nsStack = [];
  let braceDepth = 0;
  for (let i = 0; i < lines.length; i++) {
    let raw = lines[i];
    const trimmed = stripCommentsOnly(raw).trim();
    const depthBefore = braceDepth;
    const nsOpen = trimmed.match(/^(?:export\s+)?(?:namespace|module)\s+([A-Za-z_$][\w$]*)\s*\{(.*)$/);
    if (nsOpen && !/^declare\b/.test(trimmed)) {
      const nsName = nsOpen[1];
      const indent = raw.match(/^\s*/)[0];
      const openBraceIdx = raw.indexOf('{');
      const afterBrace = openBraceIdx >= 0 ? raw.slice(openBraceIdx + 1) : '';
      let d = 1;
      for (let k = 0; k < afterBrace.length; k++) {
        const ch = afterBrace[k];
        if (ch === '"' || ch === "'" || ch === '`') { k = skipString(afterBrace, k) - 1; continue; }
        if (ch === '{') d++;
        else if (ch === '}') d--;
      }
      if (d <= 0 && afterBrace.includes('}')) {
        const lastClose = afterBrace.lastIndexOf('}');
        const innerBody = afterBrace.slice(0, lastClose);
        const transformedInner = rewriteNamespaceExportsOnLine(innerBody, nsName);
        lines[i] = `${indent}var ${nsName} = ${nsName} || {}; {${transformedInner}}`;
        continue;
      }
      const hoistedFns = [];
      let scanD = d;
      for (let sIdx = i + 1; sIdx < lines.length && scanD > 0; sIdx++) {
        const sLine = stripCommentsOnly(lines[sIdx]);
        if (scanD === 1) {
          const fm = sLine.match(/^\s*export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*(?:<|\()/);
          if (fm) hoistedFns.push(fm[1]);
        }
        for (let k = 0; k < sLine.length; k++) {
          const ch = sLine[k];
          if (ch === '"' || ch === "'" || ch === '`') { k = skipString(sLine, k) - 1; continue; }
          if (ch === '{') scanD++;
          else if (ch === '}') scanD--;
        }
      }
      const hoistAssigns = hoistedFns.map(fn => ` ${nsName}.${fn} = ${fn};`).join('');
      nsStack.push({ name: nsName, startDepth: depthBefore });
      braceDepth += d;
      lines[i] = `${indent}var ${nsName} = ${nsName} || {}; {${hoistAssigns}${rewriteNamespaceExportsOnLine(afterBrace, nsName)}`;
      continue;
    }

    let closedNs = null;
    for (let k = 0; k < raw.length; k++) {
      const ch = raw[k];
      if (ch === '"' || ch === "'" || ch === '`') { k = skipString(raw, k) - 1; continue; }
      if (ch === '/' && raw[k + 1] === '/') break;
      if (ch === '{') braceDepth++;
      else if (ch === '}') {
        braceDepth = Math.max(0, braceDepth - 1);
        if (nsStack.length > 0 && braceDepth <= nsStack[nsStack.length - 1].startDepth) {
          closedNs = { ns: nsStack.pop(), closeIdx: k };
          break;
        }
      }
    }

    if (closedNs) {
      const nsName = closedNs.ns.name;
      const beforeClose = raw.slice(0, closedNs.closeIdx);
      const afterClose = raw.slice(closedNs.closeIdx + 1);
      lines[i] = `${rewriteNamespaceExportsOnLine(beforeClose, nsName)}}${afterClose}`;
      continue;
    }

    if (nsStack.length > 0) {
      const topNs = nsStack[nsStack.length - 1];
      if (depthBefore === topNs.startDepth + 1) {
        lines[i] = rewriteNamespaceExportsOnLine(raw, topNs.name);
      }
    }
  }
  return lines.join('\n');
}

function rewriteNamespaceExportsOnLine(line, nsName) {
  const fnExp = line.match(/^(\s*)export\s+(async\s+)?function\s+([A-Za-z_$][\w$]*)([\s\S]*)$/);
  if (fnExp) {
    return `${fnExp[1]}${fnExp[2] || ''}function ${fnExp[3]}${fnExp[4]}`;
  }
  const clsExp = line.match(/^(\s*)export\s+(abstract\s+)?class\s+([A-Za-z_$][\w$]*)([\s\S]*)$/);
  if (clsExp) {
    return `${clsExp[1]}const ${clsExp[3]} = ${nsName}.${clsExp[3]} = class ${clsExp[3]}${clsExp[4]}`;
  }
  const varExp = line.match(/^(\s*)export\s+(const|let|var)\s+([A-Za-z_$][\w$]*)(\s*:\s*[^=]+)?\s*=\s*([\s\S]+)$/);
  if (varExp) {
    return `${varExp[1]}${varExp[2]} ${varExp[3]}${varExp[4] || ''} = ${nsName}.${varExp[3]} = ${varExp[5]}`;
  }
  return line;
}

/* Extract constructor parameter property names (`private x`, `public readonly y`) from a parameter list string. */
function extractConstructorParamProps(paramSlice) {
  const parts = splitTopLevel(stripCommentsOnly(paramSlice));
  const props = [];
  for (const rawP of parts) {
    const p = rawP.trim();
    const m = p.match(/^(?:(?:public|private|protected|readonly)\s+)+([A-Za-z_$][\w$]*)/);
    if (m) props.push(m[1]);
  }
  return props;
}

let _STRIP_TYPES_CACHE = { src: null, out: '' };

function stripTypes(rawSrc) {
  if (typeof rawSrc === 'string' && _STRIP_TYPES_CACHE.src === rawSrc) {
    return _STRIP_TYPES_CACHE.out;
  }
  const src = typeof rawSrc === 'string' ? transpileNamespaces(rawSrc) : rawSrc;
  let out = '';
  let i = 0;
  const n = src.length;
  const ternaryStack = [];
  let parenDepth = 0;
  const braceStack = [];
  let pendingCtorProps = null;
  let pendingAfterSuperAssigns = null;
  let superCallTargetDepth = -1;

  function lookBackSignificant(from) {
    let k = from - 1;
    while (k >= 0 && isWS(src[k])) k--;
    return k;
  }

  function isTernaryColonNow() {
    if (!ternaryStack.length) return false;
    const top = ternaryStack[ternaryStack.length - 1];
    return top.paren === parenDepth && top.brace === braceStack.length;
  }

  function popTernariesAtOrAbove(pDepth, bDepth) {
    while (ternaryStack.length > 0) {
      const top = ternaryStack[ternaryStack.length - 1];
      if (top.brace > bDepth || (top.brace === bDepth && top.paren >= pDepth)) {
        ternaryStack.pop();
      } else {
        break;
      }
    }
  }

  while (i < n) {
    const c = src[i];

    if (c === '`') {
      const tpl = emitTemplate(src, i);
      out += tpl.text;
      i = tpl.next;
      continue;
    }

    if (c === '"' || c === "'") {
      const s = i;
      i = skipString(src, i);
      out += src.slice(s, i);
      continue;
    }

    if (c === '/') {
      if (src[i + 1] === '/') {
        while (i < n && src[i] !== '\n') i++;
        continue;
      }
      if (src[i + 1] === '*') {
        const s = i;
        i = src.indexOf('*/', i + 2);
        i = i === -1 ? n : i + 2;
        out += newlinesOf(src.slice(s, i));
        continue;
      }
      if (regexAllowedBefore(src, i)) {
        const end = skipRegex(src, i);
        if (end > 0) {
          out += src.slice(i, end);
          i = end;
          continue;
        }
      }
    }

    // Strip TypeScript decorators `@sealed` or `@log("meta")` while preserving newlines
    if (c === '@') {
      let j = i + 1;
      while (j < n && (isIdentPart(src[j]) || src[j] === '.')) j++;
      if (j > i + 1) {
        while (j < n && (src[j] === ' ' || src[j] === '\t')) j++;
        if (src[j] === '<') {
          let ad = 1; j++;
          while (j < n && ad > 0) {
            if (src[j] === '"' || src[j] === "'" || src[j] === '`') { j = skipString(src, j); continue; }
            if (src[j] === '<') ad++;
            else if (src[j] === '>' && src[j - 1] !== '=') ad--;
            j++;
          }
        }
        if (src[j] === '(') {
          let pd = 1; j++;
          while (j < n && pd > 0) {
            if (src[j] === '"' || src[j] === "'" || src[j] === '`') { j = skipString(src, j); continue; }
            if (src[j] === '(') pd++;
            else if (src[j] === ')') pd--;
            j++;
          }
        }
        while (j < n && (src[j] === ' ' || src[j] === '\t')) j++;
        out += newlinesOf(src.slice(i, j));
        i = j;
        continue;
      }
    }

    if (c === '<') {
      const genericEnd = tryStripGenericArrow(src, i);
      if (genericEnd > i) { i = genericEnd; continue; }
    }

    if (c === '(' || c === '[') {
      parenDepth++;
      out += c;
      i++;
      continue;
    }
    if (c === ')' || c === ']') {
      popTernariesAtOrAbove(parenDepth, braceStack.length);
      parenDepth = Math.max(0, parenDepth - 1);
      out += c;
      i++;
      while (i < n && src[i] === '!' && src[i + 1] !== '=') i++;
      if (c === ')' && superCallTargetDepth >= 0 && parenDepth === superCallTargetDepth && pendingAfterSuperAssigns) {
        if (src[i] === ';') {
          out += ';' + pendingAfterSuperAssigns;
          i++;
        } else {
          out += ';' + pendingAfterSuperAssigns;
        }
        pendingAfterSuperAssigns = null;
        superCallTargetDepth = -1;
      }
      continue;
    }

    if (isIdentStart(c)) {
      const id = readIdent(src, i);
      const word = id.name;
      const wordStart = i;
      i = id.end;

      if (word === 'super' && pendingAfterSuperAssigns) {
        let js = i;
        while (js < n && isWS(src[js])) js++;
        if (src[js] === '(') {
          superCallTargetDepth = parenDepth;
        }
      }

      if (word === 'import') {
        let j = i;
        while (j < n && isWS(src[j])) j++;
        if (src[j] === '(') {
          out += word;
          continue;
        }
        let depth = 0;
        while (j < n) {
          const ch = src[j];
          if (ch === '"' || ch === "'" || ch === '`') { j = skipString(src, j); continue; }
          if (ch === '{' || ch === '(' || ch === '[') depth++;
          else if (ch === '}' || ch === ')' || ch === ']') depth--;
          else if (ch === ';' && depth <= 0) { j++; break; }
          else if (ch === '\n' && depth <= 0) break;
          j++;
        }
        out += newlinesOf(src.slice(wordStart, j));
        i = j;
        continue;
      }
      if (word === 'export') {
        let j = i;
        while (j < n && isWS(src[j])) j++;
        if (src.startsWith('default', j) && !isIdentPart(src[j + 7] || '')) {
          i = j + 7;
          continue;
        }
        if (src[j] === '*') {
          while (j < n && src[j] !== ';' && src[j] !== '\n') j++;
          if (src[j] === ';') j++;
          out += newlinesOf(src.slice(wordStart, j));
          i = j;
          continue;
        }
        if (src[j] === '{') {
          let depth = 0;
          while (j < n) {
            if (src[j] === '{') depth++;
            else if (src[j] === '}') { depth--; if (depth === 0) { j++; break; } }
            else if (src[j] === '"' || src[j] === "'" || src[j] === '`') { j = skipString(src, j); continue; }
            j++;
          }
          while (j < n && isWS(src[j])) j++;
          if (src[j] === ';') j++;
          out += newlinesOf(src.slice(wordStart, j));
          i = j;
          continue;
        }
        continue;
      }
      if (word === 'declare') {
        let j = i;
        while (j < n && (src[j] === ' ' || src[j] === '\t')) j++;
        const nextId = readIdent(src, j);
        if (nextId && (nextId.name === 'interface' || nextId.name === 'type')) {
          continue;
        }
        let depth = 0;
        let seenBraceBlock = false;
        while (j < n) {
          const ch = src[j];
          if (ch === '"' || ch === "'" || ch === '`') { j = skipString(src, j); continue; }
          if (ch === '{') { depth++; seenBraceBlock = true; }
          else if (ch === '}') {
            depth = Math.max(0, depth - 1);
            if (seenBraceBlock && depth === 0) { j++; break; }
          } else if (ch === '(' || ch === '[') depth++;
          else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
          else if (ch === ';' && depth === 0) { j++; break; }
          else if (ch === '\n' && depth === 0) break;
          j++;
        }
        out += newlinesOf(src.slice(wordStart, j));
        i = j;
        continue;
      }
      if (word === 'interface') {
        let j = i;
        let angleDepth = 0;
        while (j < n) {
          const ch = src[j];
          if (ch === '"' || ch === "'" || ch === '`') { j = skipString(src, j); continue; }
          if (ch === '<') angleDepth++;
          else if (ch === '>' && angleDepth > 0) angleDepth--;
          else if (ch === '{' && angleDepth === 0) break;
          else if (ch === '\n' && angleDepth === 0) {
            let p = j + 1;
            while (p < n && (src[p] === ' ' || src[p] === '\t')) p++;
            if (src[p] !== '{' && !/^extends\b/.test(src.slice(p, p + 10))) break;
          }
          j++;
        }
        if (src[j] === '{') {
          let depth = 1;
          j++;
          while (j < n && depth > 0) {
            if (src[j] === '{') depth++;
            else if (src[j] === '}') depth--;
            else if (src[j] === '"' || src[j] === "'" || src[j] === '`') {
              j = skipString(src, j);
              continue;
            }
            j++;
          }
        }
        out += newlinesOf(src.slice(wordStart, j));
        i = j;
        continue;
      }
      if (word === 'type') {
        let j = i;
        while (j < n && (src[j] === ' ' || src[j] === '\t')) j++;
        const typeNameId = readIdent(src, j);
        if (typeNameId) {
          let k = typeNameId.end;
          while (k < n && isWS(src[k])) k++;
          // Optional generic type parameters: `type Foo<T extends Bar = Baz> = ...`
          if (src[k] === '<') {
            let ad = 1;
            k++;
            while (k < n && ad > 0) {
              const ch = src[k];
              if (ch === '"' || ch === "'" || ch === '`') { k = skipString(src, k); continue; }
              if (ch === '<') ad++;
              else if (ch === '>' && src[k - 1] !== '=') ad--;
              k++;
            }
            while (k < n && isWS(src[k])) k++;
          }
          if (src[k] === '=' && src[k + 1] !== '=' && src[k + 1] !== '>') {
            j = k + 1;
            let depth = 0;
            let angleDepth = 0;
            while (j < n) {
              const ch = src[j];
              if (ch === '"' || ch === "'" || ch === '`') { j = skipString(src, j); continue; }
              if (ch === '/' && src[j + 1] === '/') {
                while (j < n && src[j] !== '\n') j++;
                continue;
              }
              if (ch === '/' && src[j + 1] === '*') {
                const closeC = src.indexOf('*/', j + 2);
                j = closeC === -1 ? n : closeC + 2;
                continue;
              }
              if (ch === '{' || ch === '[' || ch === '(') depth++;
              else if (ch === '}' || ch === ']' || ch === ')') depth = Math.max(0, depth - 1);
              else if (ch === '<') angleDepth++;
              else if (ch === '>' && angleDepth > 0 && src[j - 1] !== '=') angleDepth--;
              else if (ch === ';' && depth <= 0 && angleDepth <= 0) { j++; break; }
              else if (ch === '\n' && depth <= 0 && angleDepth <= 0) {
                let prevSig = j - 1;
                while (prevSig > k && (src[prevSig] === ' ' || src[prevSig] === '\t' || src[prevSig] === '\r')) prevSig--;
                const prevCh = src[prevSig];
                const prevWordM = src.slice(Math.max(k, prevSig - 10), prevSig + 1).match(/\b(extends|in|as|keyof|infer|readonly)$/);
                let nextSig = j + 1;
                while (nextSig < n && (src[nextSig] === ' ' || src[nextSig] === '\t' || src[nextSig] === '\r')) nextSig++;
                const nextCh = src[nextSig];
                const continuesOnNextLine =
                  prevCh === '=' || prevCh === '|' || prevCh === '&' || prevCh === '?' || prevCh === ':' ||
                  Boolean(prevWordM) ||
                  nextCh === '|' || nextCh === '&' || nextCh === '?' || nextCh === ':' ||
                  /^extends\b/.test(src.slice(nextSig, nextSig + 10));
                if (!continuesOnNextLine) break;
              }
              j++;
            }
            out += newlinesOf(src.slice(wordStart, j));
            i = j;
            continue;
          }
        }
      }

      if (word === 'implements') {
        // Drop the whole `implements A, B<T>` clause but keep the class body brace.
        let j = i;
        while (j < n && src[j] !== '{' && src[j] !== '\n') {
          if (src[j] === '"' || src[j] === "'" || src[j] === '`') { j = skipString(src, j); continue; }
          j++;
        }
        out += newlinesOf(src.slice(wordStart, j));
        i = j;
        continue;
      }

      // Abstract method stub: `abstract f(x: number): number;` -> `f() {}`
      if (word === 'abstract') {
        let j = i;
        while (j < n && (src[j] === ' ' || src[j] === '\t')) j++;
        const nextId = readIdent(src, j);
        if (nextId && nextId.name !== 'class') {
          let k = nextId.end;
          while (k < n && (src[k] === ' ' || src[k] === '\t')) k++;
          if (src[k] === '<') {
            let ad = 1; k++;
            while (k < n && ad > 0) {
              if (src[k] === '"' || src[k] === "'" || src[k] === '`') { k = skipString(src, k); continue; }
              if (src[k] === '<') ad++;
              else if (src[k] === '>' && src[k - 1] !== '=') ad--;
              k++;
            }
            while (k < n && (src[k] === ' ' || src[k] === '\t')) k++;
          }
          if (src[k] === '(') {
            let pd = 1, m = k + 1;
            while (m < n && pd > 0) {
              if (src[m] === '"' || src[m] === "'" || src[m] === '`') { m = skipString(src, m); continue; }
              if (src[m] === '(') pd++;
              else if (src[m] === ')') pd--;
              m++;
            }
            if (pd === 0) {
              let p = m;
              while (p < n && (src[p] === ' ' || src[p] === '\t')) p++;
              if (src[p] === ':') {
                const tEnd = tryParseType(src, p + 1);
                if (tEnd > p + 1) p = tEnd;
              }
              while (p < n && (src[p] === ' ' || src[p] === '\t')) p++;
              if (src[p] === ';' || src[p] === '\n' || src[p] === '\r') {
                if (src[p] === ';') p++;
                out += nextId.name + '() {}' + newlinesOf(src.slice(wordStart, p));
                i = p;
                continue;
              }
            }
          }
        }
        continue;
      }

      if (/^(public|private|protected|readonly|namespace|implements)$/.test(word)) {
        continue;
      }

      // Function overload signature without body: `function add(a: number, b: number): number;`
      if (word === 'function') {
        let j = i;
        while (j < n && (src[j] === ' ' || src[j] === '\t' || src[j] === '*')) j++;
        const fnId = readIdent(src, j);
        if (fnId) {
          let k = fnId.end;
          while (k < n && (src[k] === ' ' || src[k] === '\t')) k++;
          if (src[k] === '<') {
            let ad = 1; k++;
            while (k < n && ad > 0) {
              if (src[k] === '"' || src[k] === "'" || src[k] === '`') { k = skipString(src, k); continue; }
              if (src[k] === '<') ad++;
              else if (src[k] === '>' && src[k - 1] !== '=') ad--;
              k++;
            }
            while (k < n && (src[k] === ' ' || src[k] === '\t')) k++;
          }
          if (src[k] === '(') {
            let pd = 1, m = k + 1;
            while (m < n && pd > 0) {
              if (src[m] === '"' || src[m] === "'" || src[m] === '`') { m = skipString(src, m); continue; }
              if (src[m] === '(') pd++;
              else if (src[m] === ')') pd--;
              m++;
            }
            if (pd === 0) {
              let p = m;
              while (p < n && (src[p] === ' ' || src[p] === '\t')) p++;
              if (src[p] === ':') {
                const tEnd = tryParseType(src, p + 1);
                if (tEnd > p + 1) p = tEnd;
              }
              while (p < n && (src[p] === ' ' || src[p] === '\t')) p++;
              if (src[p] === ';') {
                p++;
                out += newlinesOf(src.slice(wordStart, p));
                i = p;
                continue;
              }
            }
          }
        }
      }

      // Constructor parameter properties: `constructor(private n: number, public name: string = "a") { ... }`
      if (word === 'constructor') {
        let j = i;
        while (j < n && isWS(src[j])) j++;
        if (src[j] === '(') {
          let pd = 1, m = j + 1;
          while (m < n && pd > 0) {
            if (src[m] === '"' || src[m] === "'" || src[m] === '`') { m = skipString(src, m); continue; }
            if (src[m] === '(') pd++;
            else if (src[m] === ')') pd--;
            m++;
          }
          if (pd === 0) {
            const props = extractConstructorParamProps(src.slice(j + 1, m - 1));
            if (props.length > 0) {
              pendingCtorProps = props;
            }
          }
        }
      }

      if (word === 'as' || word === 'satisfies') {
        const end = tryParseType(src, i);
        i = end > 0 ? end : id.end;
        continue;
      }

      out += word;
      while (i < n && src[i] === '!' && src[i + 1] !== '=') i++;

      {
        let jg = i;
        while (jg < n && (src[jg] === ' ' || src[jg] === '\t')) jg++;
        if (src[jg] === '<') {
          let k = jg + 1;
          let depth = 1;
          let braceDepth = 0;
          while (k < n && depth > 0) {
            const ch = src[k];
            if ((ch === '\n' || ch === '\r' || ch === ';') && braceDepth === 0) break;
            if (ch === '"' || ch === "'" || ch === '`') {
              k = skipString(src, k);
              continue;
            }
            if (ch === '{') braceDepth++;
            else if (ch === '}') {
              if (braceDepth > 0) braceDepth--;
              else break;
            } else if (ch === '<') depth++;
            else if (ch === '>' && src[k - 1] !== '=') depth--;
            k++;
          }
          if (depth === 0) {
            let m = k;
            while (m < n && isWS(src[m])) m++;
            const after = src.slice(m, m + 11);
            // `f<T>(`, `class Box<T> {`, `class Box<T> extends ...`
            if (src[m] === '(' || src[m] === '{' ||
                /^extends\b/.test(after) || /^implements\b/.test(after)) {
              out += src.slice(i, jg) + newlinesOf(src.slice(jg, k));
              i = k;
            }
          }
        }
      }

      let j = i;
      while (j < n && isWS(src[j])) j++;

      if (src[j] === '?' && src[j + 1] === ':') {
        const typeStart = j + 2;
        const typeEnd = tryParseType(src, typeStart);
        if (typeEnd > typeStart) {
          out += src.slice(i, j);
          i = typeEnd;
          continue;
        }
      }

      if (src[j] === '?' && (src[j + 1] === ',' || src[j + 1] === ')') && parenDepth > 0 && !isTernaryColonNow()) {
        out += src.slice(i, j);
        i = j + 1;
        continue;
      }

      if (src[j] === ':') {
        if (isTernaryColonNow()) {
          ternaryStack.pop();
          out += src.slice(i, j + 1);
          i = j + 1;
          continue;
        }

        const typeStart = j + 1;
        const typeEnd = tryParseType(src, typeStart);
        if (typeEnd > typeStart) {
          const typeText = src.slice(typeStart, typeEnd);
          const inObject = braceStack.length > 0 && braceStack[braceStack.length - 1] === 'object';
          if (!inObject && looksLikeTypeText(typeText)) {
            out += src.slice(i, j);
            i = typeEnd;
            continue;
          }
        }
      }
      continue;
    }

    if (c === '?') {
      const next = src[i + 1];
      if (next === '.' || next === '?') {
        out += src.slice(i, i + 2);
        i += 2;
        if (next === '?' && src[i] === '=') { out += '='; i++; }
        continue;
      }
      ternaryStack.push({ paren: parenDepth, brace: braceStack.length });
      out += c;
      i++;
      continue;
    }

    if (c === ':') {
      if (isTernaryColonNow()) {
        ternaryStack.pop();
        out += c;
        i++;
        continue;
      }
      const k = lookBackSignificant(i);
      if (k >= 0 && (src[k] === ')' || src[k] === ']' || src[k] === '}')) {
        const typeStart = i + 1;
        const typeEnd = tryParseType(src, typeStart);
        if (typeEnd > typeStart && looksLikeTypeText(src.slice(typeStart, typeEnd))) {
          i = typeEnd;
          continue;
        }
      }
      out += c;
      i++;
      continue;
    }

    if (c === '{') {
      let k = lookBackSignificant(i);
      let kind = 'block';
      if (k >= 0) {
        const prev = src[k];
        if (prev === '=' || prev === '(' || prev === ',' || prev === '[' || prev === '!' || prev === '&' || prev === '|' || prev === '?' || prev === ':') kind = 'object';
        else if (prev === '>' && k >= 1 && src[k - 1] === '=') kind = 'block';
        else if (prev === ')') kind = 'block';
        else if (isIdentPart(prev)) {
          let w = k;
          while (w >= 0 && isIdentPart(src[w])) w--;
          const prevWord = src.slice(w + 1, k + 1);
          if (prevWord === 'return' || prevWord === 'case' || prevWord === 'default' || prevWord === 'yield' || prevWord === 'typeof' || prevWord === 'const' || prevWord === 'let' || prevWord === 'var') {
            kind = 'object';
          } else {
            kind = 'block';
          }
        }
      }
      braceStack.push(kind);
      if (pendingCtorProps && parenDepth === 0 && kind === 'block') {
        const assigns = pendingCtorProps.map(p => ` this.${p} = ${p};`).join('');
        pendingCtorProps = null;
        let bd = 1, m = i + 1;
        while (m < n && bd > 0) {
          if (src[m] === '"' || src[m] === "'" || src[m] === '`') { m = skipString(src, m); continue; }
          if (src[m] === '{') bd++;
          else if (src[m] === '}') bd--;
          m++;
        }
        const ctorBodySlice = stripCommentsOnly(src.slice(i + 1, m - 1));
        if (/\bsuper\s*\(/.test(ctorBodySlice)) {
          pendingAfterSuperAssigns = assigns;
          out += c;
        } else {
          out += '{' + assigns;
        }
      } else {
        out += c;
      }
      i++;
      continue;
    }
    if (c === '}') {
      popTernariesAtOrAbove(parenDepth, braceStack.length);
      braceStack.pop();
      out += c;
      i++;
      continue;
    }
    if (c === ';' || c === ',') {
      popTernariesAtOrAbove(parenDepth, braceStack.length);
      out += c;
      i++;
      continue;
    }

    out += c;
    i++;
  }
  if (typeof rawSrc === 'string') {
    _STRIP_TYPES_CACHE = { src: rawSrc, out };
  }
  return out;
}
