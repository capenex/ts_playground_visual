/* ================================================================
   TypeScript Type Parser & Declaration Transpile Helpers (src/compiler/transpile-helpers.ts)
   ================================================================ */
import {
  isIdentPart,
  isIdentStart,
  isWS,
  readIdent,
  skipString,
  splitTopLevel,
  stripCommentsOnly,
} from './comments';

export function looksLikeTypeText(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (/^\{/.test(t)) {
    if (/\b(return|const|let|var|if|for|while|switch|break|continue|throw|try|catch|finally)\b/.test(t)) return false;
    if (/(?<![=!<>:])=(?![=>])/.test(t)) return false;
    return true;
  }
  if (/^(number|string|boolean|void|any|unknown|never|object|symbol|bigint|undefined|null|true|false)\b/.test(t)) return true;
  if (/^(typeof|keyof|infer|asserts|readonly|unique)\b/.test(t)) return true;
  if (/^(?:asserts\s+)?(?:[A-Za-z_$][\w$]*|this)\s+is\b/.test(t)) return true;
  if (/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/.test(t)) return true;
  if (/[<>\[\]|&]/.test(t)) return true;
  if (/\bextends\b/.test(t)) return true;
  if (/^[([]/.test(t)) return true;
  if (/^["'`]/.test(t)) return true;
  if (/^-?\d/.test(t)) return true;
  return false;
}

export function tryParseType(src: string, i: number): number {
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

export function tryParseTypeAtom(src: string, i: number): number {
  const n = src.length;
  let j = i;
  while (j < n && isWS(src[j])) j++;
  const rest = src.slice(j, j + 80);

  if (/^readonly\b/.test(rest) && !isIdentPart(src[j + 8] || '')) {
    return tryParseTypeAtom(src, j + 8);
  }

  if (/^unique\s+symbol\b/.test(rest)) {
    const m = /^unique\s+symbol\b/.exec(rest);
    return m ? tryParseTypeSuffix(src, j + m[0].length) : -1;
  }

  if (/^asserts\b/.test(rest) && !isIdentPart(src[j + 7] || '')) {
    let k = j + 7;
    while (k < n && isWS(src[k])) k++;
    const targetId = readIdent(src, k);
    if (!targetId) return -1;
    let m = targetId.end;
    while (m < n && (src[m] === ' ' || src[m] === '\t')) m++;
    if (src.startsWith('is', m) && !isIdentPart(src[m + 2] || '')) {
      const predEnd = tryParseType(src, m + 2);
      if (predEnd > m + 2) return predEnd;
    }
    return targetId.end;
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

  {
    let m = j;
    while (m < n && (src[m] === ' ' || src[m] === '\t')) m++;
    if (src.startsWith('is', m) && !isIdentPart(src[m + 2] || '')) {
      const predEnd = tryParseType(src, m + 2);
      if (predEnd > m + 2) return predEnd;
    }
  }

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
      if ((ch === '\n' || ch === '\r' || ch === ';') && braceDepth === 0) break;
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

export function tryParseTypeSuffix(src: string, i: number): number {
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

export function tryStripGenericArrow(src: string, i: number): number {
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

export function tryStripAngleTypeAssertion(src: string, i: number, prevSigIdx: number): number {
  const n = src.length;
  if (prevSigIdx >= 0) {
    const prev = src[prevSigIdx] || '';
    if (isIdentPart(prev)) {
      let w = prevSigIdx;
      while (w >= 0 && isIdentPart(src[w])) w--;
      const word = src.slice(w + 1, prevSigIdx + 1);
      if (!/^(return|yield|await|throw|case|typeof|void|delete|in|of|instanceof|new)$/.test(word)) {
        return -1;
      }
    } else if (!/[=([,:;?!+\-*/%&|^~{<>]/.test(prev)) {
      return -1;
    }
  }
  let j = i + 1;
  let depth = 1;
  while (j < n && depth > 0) {
    const ch = src[j];
    if (ch === '"' || ch === "'" || ch === '`') { j = skipString(src, j); continue; }
    if (ch === '\n' || ch === '\r' || ch === ';') return -1;
    if (ch === '<') depth++;
    else if (ch === '>' && src[j - 1] !== '=') depth--;
    j++;
  }
  if (depth !== 0) return -1;
  const inner = src.slice(i + 1, j - 1).trim();
  if (!inner || !looksLikeTypeText(inner)) return -1;
  const parsedEnd = tryParseType(inner, 0);
  if (parsedEnd < inner.length) {
    let rem = parsedEnd;
    while (rem < inner.length && isWS(inner[rem])) rem++;
    if (rem < inner.length) return -1;
  }
  let k = j;
  while (k < n && (src[k] === ' ' || src[k] === '\t')) k++;
  const nextCh = src[k] || '';
  if (
    isIdentStart(nextCh) ||
    (nextCh >= '0' && nextCh <= '9') ||
    nextCh === '(' || nextCh === '[' || nextCh === '{' ||
    nextCh === '"' || nextCh === "'" || nextCh === '`' ||
    nextCh === '!' || nextCh === '+' || nextCh === '-' || nextCh === '~'
  ) {
    return j;
  }
  return -1;
}

export function buildEnumIIFE(name: string, body: string, line: number): { code?: string; error: { line: number; message: string } | null } {
  const parts = splitTopLevel(stripCommentsOnly(body));
  const stmts: string[] = [];
  const known: Record<string, string | number> = Object.create(null);
  let next = 0;
  for (const rawPart of parts) {
    const part = rawPart.trim();
    if (!part) continue;
    const m = part.match(/^([A-Za-z_$][\w$]*)\s*(?:=\s*([\s\S]+))?$/);
    if (!m || !m[1]) {
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
      let val: unknown = undefined;
      try { val = new Function('return (' + init + ');')(); } catch (_) { val = undefined; }
      if (typeof val !== 'string') {
        return { error: { line, message: 'enum 成员 "' + key + '" 的值无法静态求值' } };
      }
      stmts.push(name + '[' + JSON.stringify(key) + '] = ' + JSON.stringify(val) + ';');
      known[key] = val;
      continue;
    }
    let value: unknown;
    try {
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

export function transpileEnums(src: string): { code: string; error: { line: number; message: string } | null } {
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
      if (!id) { i++; continue; }
      const isConstEnum = id.name === 'const' && /^\s*enum\b/.test(src.slice(i + 5));
      if (id.name === 'enum' || isConstEnum) {
        const start = i;
        let j = isConstEnum ? i + 5 : i;
        while (j < n && isWS(src[j])) j++;
        if (src.slice(j, j + 4) === 'enum' && !isIdentPart(src[j + 4] || '')) {
          j += 4;
          while (j < n && isWS(src[j])) j++;
          const nameId = readIdent(src, j);
          if (nameId) {
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

export function transpileNamespaces(src: string): string {
  if (!/\b(?:namespace|module)\s+[A-Za-z_$]/.test(src)) return src;
  const lines = src.split('\n');
  const nsStack: Array<{ name: string; startDepth: number }> = [];
  let braceDepth = 0;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? '';
    const trimmed = stripCommentsOnly(raw).trim();
    const depthBefore = braceDepth;
    const nsOpen = trimmed.match(/^(?:export\s+)?(?:namespace|module)\s+([A-Za-z_$][\w$]*)\s*\{(.*)$/);
    if (nsOpen && nsOpen[1] && !/^declare\b/.test(trimmed)) {
      const nsName = nsOpen[1];
      const indentMatch = raw.match(/^\s*/);
      const indent = indentMatch ? indentMatch[0] : '';
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
      const hoistedFns: string[] = [];
      let scanD = d;
      for (let sIdx = i + 1; sIdx < lines.length && scanD > 0; sIdx++) {
        const sLine = stripCommentsOnly(lines[sIdx] ?? '');
        if (scanD === 1) {
          const fm = sLine.match(/^\s*export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*(?:<|\()/);
          if (fm && fm[1]) hoistedFns.push(fm[1]);
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

    let closedNs: { ns: { name: string; startDepth: number }; closeIdx: number } | null = null;
    for (let k = 0; k < raw.length; k++) {
      const ch = raw[k];
      if (ch === '"' || ch === "'" || ch === '`') { k = skipString(raw, k) - 1; continue; }
      if (ch === '/' && raw[k + 1] === '/') break;
      if (ch === '{') braceDepth++;
      else if (ch === '}') {
        braceDepth = Math.max(0, braceDepth - 1);
        const topEntry = nsStack[nsStack.length - 1];
        if (topEntry && braceDepth <= topEntry.startDepth) {
          nsStack.pop();
          closedNs = { ns: topEntry, closeIdx: k };
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

    const topNs = nsStack[nsStack.length - 1];
    if (topNs) {
      if (depthBefore === topNs.startDepth + 1) {
        lines[i] = rewriteNamespaceExportsOnLine(raw, topNs.name);
      }
    }
  }
  return lines.join('\n');
}

function rewriteNamespaceExportsOnLine(line: string, nsName: string): string {
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

export function extractConstructorParamProps(paramSlice: string): string[] {
  const parts = splitTopLevel(stripCommentsOnly(paramSlice));
  const props: string[] = [];
  for (const rawP of parts) {
    const p = rawP.trim();
    const m = p.match(/^(?:(?:public|private|protected|readonly|override)\s+)+([A-Za-z_$][\w$]*)/);
    if (m && m[1]) props.push(m[1]);
  }
  return props;
}

export const NON_TYPED_KEYWORDS = new Set([
  'default', 'case', 'return', 'throw', 'else', 'do', 'try', 'finally',
  'yield', 'await', 'typeof', 'void', 'delete', 'new', 'in', 'of', 'instanceof',
]);

export function transpileFsImportStatement(rawStmt: string): string | null {
  const flat = stripCommentsOnly(rawStmt).replace(/\s+/g, ' ').trim().replace(/;$/, '').trim();
  if (/^import\s+type\b/.test(flat)) return null;
  const fromMatch = flat.match(/^import\s+([\s\S]+?)\s+from\s+(['"])([^'"]+)\2\s*$/);
  if (!fromMatch) return null;
  const clause = (fromMatch[1] || '').trim();
  const modSpec = (fromMatch[3] || '').trim();
  const isFsRoot = modSpec === 'fs' || modSpec === 'node:fs';
  const isFsPromises = modSpec === 'fs/promises' || modSpec === 'node:fs/promises';
  if (!isFsRoot && !isFsPromises) return null;

  const baseExpr = isFsPromises
    ? '(((typeof __t === "function" && __t.__env && __t.__env.fs) || globalThis.__FS_SHIM__).promises)'
    : '((typeof __t === "function" && __t.__env && __t.__env.fs) || globalThis.__FS_SHIM__)';

  const convertNamedBraces = (bracePart: string): string => {
    const inner = bracePart.replace(/^\{|\}$/g, '').trim();
    if (!inner) return '{}';
    const specs = inner
      .split(',')
      .map(s => s.trim())
      .filter(s => Boolean(s) && !/^type\s+/.test(s))
      .map(s => s.replace(/^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/, '$1: $2'));
    return `{ ${specs.join(', ')} }`;
  };

  const nsMatch = clause.match(/^\*\s+as\s+([A-Za-z_$][\w$]*)$/);
  if (nsMatch && nsMatch[1]) {
    return `/*__import__*/ var ${nsMatch[1]} = ${baseExpr};`;
  }

  if (clause.startsWith('{') && clause.endsWith('}')) {
    return `/*__import__*/ var ${convertNamedBraces(clause)} = ${baseExpr};`;
  }

  const defAndNamed = clause.match(/^([A-Za-z_$][\w$]*)\s*,\s*(\{[\s\S]+\})$/);
  if (defAndNamed && defAndNamed[1] && defAndNamed[2]) {
    return `/*__import__*/ var ${defAndNamed[1]} = ${baseExpr}, ${convertNamedBraces(defAndNamed[2])} = ${defAndNamed[1]};`;
  }

  const defMatch = clause.match(/^([A-Za-z_$][\w$]*)$/);
  if (defMatch && defMatch[1]) {
    return `/*__import__*/ var ${defMatch[1]} = ${baseExpr};`;
  }

  return null;
}
