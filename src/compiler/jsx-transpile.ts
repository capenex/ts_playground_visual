/* ================================================================
   TSX / JSX to React.createElement Transpiler (src/compiler/jsx-transpile.ts)
   Pure Layer 3 module — 0 DOM dependencies, 0 type escape hatches.
   ================================================================ */
import {
  isIdentPart,
  isIdentStart,
  isWS,
  newlinesOf,
  regexAllowedBefore,
  skipRegex,
  skipString,
} from './comments';
import { stripTypes, transpileEnums } from './transpile';

export interface JsxTranspileResult {
  code: string;
  exportedComponent: string | null;
  cssImports: string[];
  error: { line: number; message: string } | null;
}

type PropPart =
  | { kind: 'entry'; key: string; valueExpr: string }
  | { kind: 'spread'; expr: string };

const EXPR_PREFIX_KEYWORDS = new Set([
  'return',
  'throw',
  'case',
  'default',
  'yield',
  'await',
  'typeof',
  'void',
  'delete',
  'else',
  'do',
  'in',
  'of',
  'new',
  'export',
]);

function isValidJsIdentifier(name: string): boolean {
  if (!name.length) return false;
  if (!isIdentStart(name[0])) return false;
  for (let i = 1; i < name.length; i++) {
    if (!isIdentPart(name[i])) return false;
  }
  return true;
}

function skipBalancedBraces(src: string, openIdx: number): number {
  const n = src.length;
  let i = openIdx + 1;
  let depth = 1;
  while (i < n && depth > 0) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') {
      i = skipString(src, i);
      continue;
    }
    if (c === '/') {
      if (src[i + 1] === '/') {
        while (i < n && src[i] !== '\n') i++;
        continue;
      }
      if (src[i + 1] === '*') {
        const end = src.indexOf('*/', i + 2);
        i = end === -1 ? n : end + 2;
        continue;
      }
      if (regexAllowedBefore(src, i)) {
        const end = skipRegex(src, i);
        if (end > 0) {
          i = end;
          continue;
        }
      }
    }
    if (c === '{') depth++;
    else if (c === '}') depth--;
    i++;
  }
  return i;
}

function stripEmptyJsxComments(expr: string): string {
  let out = '';
  let i = 0;
  const n = expr.length;
  while (i < n) {
    const c = expr[i];
    if (c === '"' || c === "'" || c === '`') {
      const end = skipString(expr, i);
      out += expr.slice(i, end);
      i = end;
      continue;
    }
    if (c === '/' && expr[i + 1] === '*') {
      const end = expr.indexOf('*/', i + 2);
      i = end === -1 ? n : end + 2;
      continue;
    }
    if (c === '/' && expr[i + 1] === '/') {
      while (i < n && expr[i] !== '\n') i++;
      continue;
    }
    out += c || '';
    i++;
  }
  return out.trim();
}

function isJsxStartAt(src: string, ltIdx: number): boolean {
  const n = src.length;
  if (ltIdx < 0 || ltIdx >= n || src[ltIdx] !== '<') return false;

  // Check previous non-whitespace token in src
  let prev = ltIdx - 1;
  while (prev >= 0 && isWS(src[prev])) prev--;
  if (prev >= 0) {
    const pch = src[prev];
    if (pch === ')' || pch === ']') return false;
    if (isIdentPart(pch)) {
      let wStart = prev;
      while (wStart > 0 && isIdentPart(src[wStart - 1])) wStart--;
      const word = src.slice(wStart, prev + 1);
      if (!EXPR_PREFIX_KEYWORDS.has(word)) return false;
    }
  }

  // Fragment <>
  let afterLt = ltIdx + 1;
  while (afterLt < n && isWS(src[afterLt])) afterLt++;
  if (src[afterLt] === '>') return true;

  // Tag name must start immediately after '<' (no leading space in standard JSX)
  const first = src[ltIdx + 1];
  if (!isIdentStart(first)) return false;

  // Disambiguate TS generic arrow <T>(...) => or <T,>(...) or <T extends ...>
  let k = ltIdx + 1;
  while (k < n && (isIdentPart(src[k]) || src[k] === '.' || src[k] === '-')) k++;
  let afterName = k;
  while (afterName < n && isWS(src[afterName])) afterName++;
  if (src[afterName] === ',') return false;
  if (src.slice(afterName, afterName + 7) === 'extends' && !isIdentPart(src[afterName + 7])) {
    return false;
  }
  if (src[afterName] === '>') {
    let afterGt = afterName + 1;
    while (afterGt < n && isWS(src[afterGt])) afterGt++;
    if (src[afterGt] === '(') return false;
  }

  return true;
}

function formatPropsExpr(parts: PropPart[]): string {
  if (parts.length === 0) return 'null';
  const hasSpread = parts.some((p) => p.kind === 'spread');
  if (!hasSpread) {
    const entries: string[] = [];
    for (const part of parts) {
      if (part.kind === 'entry') {
        const keyOut = isValidJsIdentifier(part.key) ? part.key : JSON.stringify(part.key);
        entries.push(`${keyOut}: ${part.valueExpr}`);
      }
    }
    return `{ ${entries.join(', ')} }`;
  }

  const args: string[] = ['{}'];
  let pendingEntries: string[] = [];
  const flushEntries = () => {
    if (pendingEntries.length > 0) {
      args.push(`{ ${pendingEntries.join(', ')} }`);
      pendingEntries = [];
    }
  };
  for (const part of parts) {
    if (part.kind === 'spread') {
      flushEntries();
      args.push(part.expr);
    } else {
      const keyOut = isValidJsIdentifier(part.key) ? part.key : JSON.stringify(part.key);
      pendingEntries.push(`${keyOut}: ${part.valueExpr}`);
    }
  }
  flushEntries();
  return `Object.assign(${args.join(', ')})`;
}

function cleanJsxText(raw: string): string {
  if (!raw.includes('\n') && !raw.includes('\r')) {
    return raw;
  }
  const lines = raw.replace(/\r\n?/g, '\n').split('\n');
  const cleaned: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i] ?? '';
    if (i > 0) line = line.replace(/^[ \t]+/, '');
    if (i < lines.length - 1) line = line.replace(/[ \t]+$/, '');
    if (line.length > 0) cleaned.push(line);
  }
  return cleaned.join(' ');
}

function readTagName(src: string, start: number): { name: string; next: number } {
  const n = src.length;
  let i = start;
  while (i < n && (isIdentPart(src[i]) || src[i] === '.' || src[i] === '-' || src[i] === ':')) {
    i++;
  }
  return { name: src.slice(start, i), next: i };
}

function parseJsxElement(src: string, ltIdx: number): { code: string; next: number } {
  const n = src.length;
  let i = ltIdx + 1;
  while (i < n && isWS(src[i])) i++;

  let isFragment = false;
  let tagName = '';
  let tagExpr = 'React.Fragment';

  if (src[i] === '>') {
    isFragment = true;
    i++;
  } else {
    const tagInfo = readTagName(src, i);
    tagName = tagInfo.name;
    i = tagInfo.next;
    const isIntrinsic =
      tagName.length > 0 &&
      !tagName.includes('.') &&
      (tagName[0] ?? '') >= 'a' &&
      (tagName[0] ?? '') <= 'z';
    tagExpr = isIntrinsic ? JSON.stringify(tagName) : tagName;
  }

  const propParts: PropPart[] = [];
  let selfClosing = false;

  if (!isFragment) {
    while (i < n) {
      while (i < n && isWS(src[i])) i++;
      if (i >= n) break;
      if (src[i] === '/' && src[i + 1] === '>') {
        selfClosing = true;
        i += 2;
        break;
      }
      if (src[i] === '>') {
        i++;
        break;
      }
      if (src[i] === '{') {
        const braceEnd = skipBalancedBraces(src, i);
        const inner = src.slice(i + 1, Math.max(i + 1, braceEnd - 1)).trim();
        if (inner.startsWith('...')) {
          const spreadExpr = transpileJSX(inner.slice(3).trim());
          propParts.push({ kind: 'spread', expr: spreadExpr });
        }
        i = braceEnd;
        continue;
      }

      const attrInfo = readTagName(src, i);
      const attrName = attrInfo.name;
      if (!attrName) {
        i++;
        continue;
      }
      i = attrInfo.next;
      while (i < n && isWS(src[i])) i++;

      if (src[i] !== '=') {
        propParts.push({ kind: 'entry', key: attrName, valueExpr: 'true' });
        continue;
      }

      i++; // skip '='
      while (i < n && isWS(src[i])) i++;
      const vch = src[i];
      if (vch === '"' || vch === "'") {
        const end = skipString(src, i);
        propParts.push({ kind: 'entry', key: attrName, valueExpr: src.slice(i, end) });
        i = end;
      } else if (vch === '{') {
        const braceEnd = skipBalancedBraces(src, i);
        const inner = src.slice(i + 1, Math.max(i + 1, braceEnd - 1));
        const valExpr = transpileJSX(inner).trim() || 'undefined';
        propParts.push({ kind: 'entry', key: attrName, valueExpr: valExpr });
        i = braceEnd;
      } else if (vch === '<') {
        const nested = parseJsxElement(src, i);
        propParts.push({ kind: 'entry', key: attrName, valueExpr: nested.code });
        i = nested.next;
      } else {
        i++;
      }
    }
  }

  const propsExpr = formatPropsExpr(propParts);
  if (selfClosing) {
    return {
      code: `React.createElement(${tagExpr}, ${propsExpr})`,
      next: i,
    };
  }

  const children: string[] = [];
  while (i < n) {
    const ch = src[i];
    if (ch === '<') {
      if (src[i + 1] === '/') {
        // Closing tag </...>
        const gt = src.indexOf('>', i + 2);
        i = gt === -1 ? n : gt + 1;
        break;
      }
      const childEl = parseJsxElement(src, i);
      children.push(childEl.code);
      i = childEl.next;
      continue;
    }
    if (ch === '{') {
      const braceEnd = skipBalancedBraces(src, i);
      const innerRaw = src.slice(i + 1, Math.max(i + 1, braceEnd - 1));
      const strippedComment = stripEmptyJsxComments(innerRaw);
      if (strippedComment.length > 0) {
        const exprOut = transpileJSX(innerRaw).trim();
        if (exprOut.length > 0) {
          children.push(exprOut);
        }
      }
      i = braceEnd;
      continue;
    }

    const textStart = i;
    while (i < n && src[i] !== '<' && src[i] !== '{') {
      i++;
    }
    const cleaned = cleanJsxText(src.slice(textStart, i));
    if (cleaned.length > 0) {
      children.push(JSON.stringify(cleaned));
    }
  }

  const args = [tagExpr, propsExpr, ...children];
  return {
    code: `React.createElement(${args.join(', ')})`,
    next: i,
  };
}

function transpileTemplateWithJsx(src: string, start: number): { text: string; next: number } {
  const n = src.length;
  const parts = ['`'];
  let i = start + 1;
  while (i < n) {
    const c = src[i];
    if (c === '\\') {
      parts.push(src.slice(i, i + 2));
      i += 2;
      continue;
    }
    if (c === '`') {
      parts.push('`');
      return { text: parts.join(''), next: i + 1 };
    }
    if (c === '$' && src[i + 1] === '{') {
      parts.push('${');
      const braceEnd = skipBalancedBraces(src, i + 1);
      const inner = src.slice(i + 2, Math.max(i + 2, braceEnd - 1));
      parts.push(transpileJSX(inner));
      parts.push('}');
      i = braceEnd;
      continue;
    }
    parts.push(c || '');
    i++;
  }
  return { text: parts.join(''), next: n };
}

export function transpileJSX(src: string): string {
  if (!src.includes('<')) return src;
  let out = '';
  let i = 0;
  const n = src.length;

  while (i < n) {
    const c = src[i];
    if (c === '`') {
      const tpl = transpileTemplateWithJsx(src, i);
      out += tpl.text;
      i = tpl.next;
      continue;
    }
    if (c === '"' || c === "'") {
      const end = skipString(src, i);
      out += src.slice(i, end);
      i = end;
      continue;
    }
    if (c === '/') {
      if (src[i + 1] === '/') {
        const nl = src.indexOf('\n', i + 2);
        const end = nl === -1 ? n : nl;
        out += src.slice(i, end);
        i = end;
        continue;
      }
      if (src[i + 1] === '*') {
        const end = src.indexOf('*/', i + 2);
        const close = end === -1 ? n : end + 2;
        out += newlinesOf(src.slice(i, close));
        i = close;
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
    if (c === '<' && isJsxStartAt(src, i)) {
      const el = parseJsxElement(src, i);
      out += el.code;
      i = el.next;
      continue;
    }
    out += c || '';
    i++;
  }
  return out;
}

function preprocessReactImportsAndExports(rawSrc: string): {
  code: string;
  exportedComponent: string | null;
  cssImports: string[];
} {
  let exportedComponent: string | null = null;
  let firstPascalExport: string | null = null;
  const cssImports: string[] = [];
  const lines = rawSrc.replace(/\r\n?/g, '\n').split('\n');
  const outLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // import './xxx.css' or import styles from './xxx.css'
    const importCssMatch = trimmed.match(
      /^import\s+(?:([A-Za-z_$][\w$]*)\s+from\s+)?['"]([^'"]+\.css(?:\?[^'"]*)?)['"]\s*;?$/i
    );
    if (importCssMatch && importCssMatch[2]) {
      cssImports.push(importCssMatch[2].trim());
      if (importCssMatch[1]) {
        outLines.push(`const ${importCssMatch[1]} = {};`);
      } else {
        outLines.push('');
      }
      continue;
    }

    // import ... from 'react' | 'react-dom' | 'react/jsx-runtime'
    const importReactMatch = trimmed.match(
      /^import\s+(.+?)\s+from\s+['"]react(?:-dom(?:\/client)?|\/jsx-runtime)?['"]\s*;?$/
    );
    if (importReactMatch) {
      const spec = (importReactMatch[1] ?? '').trim();
      if (spec.startsWith('type ')) {
        outLines.push('');
        continue;
      }
      const statements: string[] = [];
      const braceStart = spec.indexOf('{');
      const braceEnd = spec.lastIndexOf('}');
      if (braceStart >= 0 && braceEnd > braceStart) {
        const beforeBrace = spec.slice(0, braceStart).replace(/,\s*$/, '').trim();
        if (beforeBrace && beforeBrace !== 'React' && !beforeBrace.startsWith('*')) {
          statements.push(`const ${beforeBrace} = React;`);
        }
        const namedRaw = spec.slice(braceStart + 1, braceEnd);
        const namedParts = namedRaw
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0 && !s.startsWith('type '))
          .map((s) => s.replace(/\s+as\s+/g, ': '));
        if (namedParts.length > 0) {
          statements.push(`const { ${namedParts.join(', ')} } = React;`);
        }
      } else if (spec && spec !== 'React' && !spec.startsWith('*')) {
        statements.push(`const ${spec} = React;`);
      }
      outLines.push(statements.join(' '));
      continue;
    }

    // import type ... from '...'
    if (/^import\s+type\s+/.test(trimmed)) {
      outLines.push('');
      continue;
    }

    // export default function Foo ...
    const expDefFn = line.match(/^(\s*)export\s+default\s+function\s+([A-Za-z_$][A-Za-z0-9_$]*)/);
    if (expDefFn) {
      exportedComponent = expDefFn[2] ?? exportedComponent;
      outLines.push(line.replace(/^(\s*)export\s+default\s+/, '$1'));
      continue;
    }

    // export default Identifier;
    const expDefId = trimmed.match(/^export\s+default\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*;?$/);
    if (expDefId) {
      exportedComponent = expDefId[1] ?? exportedComponent;
      outLines.push('');
      continue;
    }

    // export function Foo / export const Foo / export class Foo
    const expDecl = line.match(
      /^(\s*)export\s+(?:async\s+)?(?:function|const|let|class)\s+([A-Za-z_$][A-Za-z0-9_$]*)/
    );
    if (expDecl) {
      const name = expDecl[2] ?? '';
      if (!firstPascalExport && /^[A-Z]/.test(name)) {
        firstPascalExport = name;
      } else if (!firstPascalExport) {
        firstPascalExport = name;
      }
      outLines.push(line.replace(/^(\s*)export\s+/, '$1'));
      continue;
    }

    // export interface / export type
    if (/^(\s*)export\s+(?:interface|type)\s+/.test(line)) {
      outLines.push(line.replace(/^(\s*)export\s+/, '$1'));
      continue;
    }

    outLines.push(line);
  }

  const code = outLines.join('\n');
  if (!exportedComponent) {
    exportedComponent = firstPascalExport;
  }
  if (!exportedComponent) {
    const fallbackMatch = code.match(/\b(?:function|const)\s+([A-Z][A-Za-z0-9_$]*)\b/);
    if (fallbackMatch) {
      exportedComponent = fallbackMatch[1] ?? null;
    }
  }

  return { code, exportedComponent, cssImports };
}

export function transpileTSXForSandbox(rawSrc: string): JsxTranspileResult {
  const prep = preprocessReactImportsAndExports(rawSrc);
  const jsxTranspiled = transpileJSX(prep.code);
  const enumRes = transpileEnums(jsxTranspiled);
  if (enumRes.error) {
    return {
      code: '',
      exportedComponent: prep.exportedComponent,
      cssImports: prep.cssImports,
      error: enumRes.error,
    };
  }
  const jsCode = stripTypes(enumRes.code);
  const exportRet = prep.exportedComponent
    ? `\nreturn typeof ${prep.exportedComponent} !== "undefined" ? ${prep.exportedComponent} : null;`
    : '\nreturn null;';

  return {
    code: jsCode + exportRet,
    exportedComponent: prep.exportedComponent,
    cssImports: prep.cssImports,
    error: null,
  };
}
