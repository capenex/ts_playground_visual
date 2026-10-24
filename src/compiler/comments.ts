/* ================================================================
   Lexical & comment/string/paren utilities (src/compiler/comments.ts)
   ================================================================ */

export const RESERVED_WORDS = new Set([
  'function', 'const', 'let', 'var', 'for', 'while', 'do', 'if', 'else',
  'switch', 'case', 'default', 'break', 'continue', 'return', 'try', 'catch',
  'finally', 'throw', 'new', 'delete', 'typeof', 'instanceof', 'void', 'in',
  'of', 'class', 'extends', 'super', 'this', 'import', 'export', 'from',
  'as', 'async', 'await', 'yield', 'true', 'false', 'null', 'undefined',
]);

export function skipString(src: string, i: number): number {
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

export function skipTemplateExpr(src: string, i: number): number {
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

export function newlinesOf(s: string): string {
  const m = s.match(/\n/g);
  return m ? m.map(() => '\n').join('') : '';
}

export function isIdentStart(c: string | undefined): boolean {
  return Boolean(c && /[A-Za-z_$]/.test(c));
}

export function isIdentPart(c: string | undefined): boolean {
  return Boolean(c && /[\w$]/.test(c));
}

export function isWS(c: string | undefined): boolean {
  return c === ' ' || c === '\t' || c === '\n' || c === '\r';
}

export function readIdent(src: string, i: number): { name: string; end: number } | null {
  const n = src.length;
  if (i >= n || !isIdentStart(src[i])) return null;
  let j = i;
  while (j < n && isIdentPart(src[j])) j++;
  return { name: src.slice(i, j), end: j };
}

export function skipRegex(src: string, i: number): number {
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
  while (j < n && /[gimsuy]/.test(src[j] || '')) j++;
  return j;
}

export function regexAllowedBefore(src: string, i: number): boolean {
  let k = i - 1;
  while (k >= 0 && isWS(src[k])) k--;
  if (k < 0) return true;
  const c = src[k] || '';
  if (/[(=,:;!?&|{}[\]]/.test(c)) return true;
  if (isIdentPart(c)) {
    let w = k;
    while (w >= 0 && isIdentPart(src[w])) w--;
    const word = src.slice(w + 1, k + 1);
    return /^(return|typeof|instanceof|in|of|new|delete|void|case|do|else|yield|await)$/.test(word);
  }
  return false;
}

/* Remove comments but keep string literals intact (used when parsing enum bodies). */
export function stripCommentsOnly(s: string): string {
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

export const stripComments = stripCommentsOnly;

export function stripInlineCommentSafe(line: string | undefined): string {
  if (!line) return '';
  let out = '';
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      const end = skipString(line, i);
      out += line.slice(i, end);
      i = end - 1;
      continue;
    }
    if (ch === '/' && line[i + 1] === '/') {
      break;
    }
    if (ch === '/' && line[i + 1] === '*') {
      const closeIdx = line.indexOf('*/', i + 2);
      if (closeIdx >= 0) {
        i = closeIdx + 1;
        continue;
      } else {
        break;
      }
    }
    out += ch;
  }
  return out;
}

/* Blank string/template contents *and* comments so declaration scanning never
   mistakes text in a comment for a real binding (e.g. `// const ghost = 1`). */
export function blankStrings(js: string): string {
  let out = '';
  let i = 0;
  const n = js.length;
  while (i < n) {
    const c = js[i];
    if (c === '"' || c === "'" || c === '`') {
      const end = skipString(js, i);
      out += '""' + newlinesOf(js.slice(i, end));
      i = end;
      continue;
    }
    if (c === '/' && js[i + 1] === '/') {
      let j = i + 2;
      while (j < n && js[j] !== '\n') j++;
      out += ' '.repeat(j - i);
      i = j;
      continue;
    }
    if (c === '/' && js[i + 1] === '*') {
      let j = i + 2;
      while (j < n && !(js[j] === '*' && js[j + 1] === '/')) j++;
      j = Math.min(n, j + 2);
      out += js.slice(i, j).replace(/[^\n]/g, ' ');
      i = j;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

export function splitTopLevel(s: string): string[] {
  const parts: string[] = [];
  let depth = 0, cur = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      const end = skipString(s, i);
      cur += s.slice(i, end);
      i = end - 1;
      continue;
    }
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur) parts.push(cur);
  return parts;
}

export function splitTopLevelSemicolons(s: string): string[] {
  const parts: string[] = [];
  let depth = 0, cur = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      const end = skipString(s, i);
      cur += s.slice(i, end);
      i = end - 1;
      continue;
    }
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') depth--;
    if (ch === ';' && depth === 0) {
      parts.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  parts.push(cur);
  return parts;
}

export const splitStatements = splitTopLevelSemicolons;

export function findBalancedParen(s: string, openIdx: number): number {
  let depth = 0;
  for (let i = openIdx; i < s.length; i++) {
    const ch = s[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      i = skipString(s, i) - 1;
      continue;
    }
    if (ch === '/' && s[i + 1] === '/') break;
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}
