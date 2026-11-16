/* ================================================================
   Static React Props Schema Extractor (src/compiler/props-schema.ts)
   Pure Layer 3 module — 0 DOM dependencies, 0 type escape hatches.
   ================================================================ */
import { isIdentPart, isIdentStart, isWS, skipString } from './comments';

export type PropFieldKind =
  | 'boolean'
  | 'string'
  | 'number'
  | 'enum'
  | 'callback'
  | 'unknown';

export type PropPrimitiveValue = string | number | boolean;

export interface PropFieldSchema {
  name: string;
  kind: PropFieldKind;
  rawType: string;
  optional: boolean;
  hasDefault: boolean;
  defaultValue?: PropPrimitiveValue;
  options?: string[];
  description?: string;
}

export interface ComponentPropsSchema {
  componentName: string | null;
  propsTypeName: string | null;
  fields: PropFieldSchema[];
}

function findMatchingBrace(src: string, openIdx: number, openCh: string, closeCh: string): number {
  const n = src.length;
  let i = openIdx + 1;
  let depth = 1;
  while (i < n && depth > 0) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') {
      i = skipString(src, i);
      continue;
    }
    if (c === '/' && src[i + 1] === '/') {
      while (i < n && src[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      i = end === -1 ? n : end + 2;
      continue;
    }
    if (c === openCh) depth++;
    else if (c === closeCh) depth--;
    i++;
  }
  return i - 1;
}

function splitTopLevel(src: string, sep: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let paren = 0;
  let brace = 0;
  let bracket = 0;
  let angle = 0;
  const n = src.length;
  let i = 0;
  while (i < n) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') {
      i = skipString(src, i);
      continue;
    }
    if (c === '/' && src[i + 1] === '/') {
      while (i < n && src[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      i = end === -1 ? n : end + 2;
      continue;
    }
    if (c === '(') paren++;
    else if (c === ')') paren = Math.max(0, paren - 1);
    else if (c === '{') brace++;
    else if (c === '}') brace = Math.max(0, brace - 1);
    else if (c === '[') bracket++;
    else if (c === ']') bracket = Math.max(0, bracket - 1);
    else if (c === '<') angle++;
    else if (c === '>' && src[i - 1] !== '=') angle = Math.max(0, angle - 1);
    else if (
      c === sep &&
      paren === 0 &&
      brace === 0 &&
      bracket === 0 &&
      angle === 0
    ) {
      parts.push(src.slice(start, i));
      start = i + 1;
    }
    i++;
  }
  parts.push(src.slice(start));
  return parts;
}

function unescapeQuotedString(inner: string): string {
  return inner
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

function parseLiteralDefault(raw: string): { ok: boolean; value?: PropPrimitiveValue } {
  const t = raw.trim();
  if (t === 'true') return { ok: true, value: true };
  if (t === 'false') return { ok: true, value: false };
  if (/^-?\d+(?:\.\d+)?$/.test(t)) {
    return { ok: true, value: Number(t) };
  }
  if (
    (t.startsWith("'") && t.endsWith("'")) ||
    (t.startsWith('"') && t.endsWith('"'))
  ) {
    return { ok: true, value: unescapeQuotedString(t.slice(1, -1)) };
  }
  return { ok: false };
}

function extractDefaultsFromDestructuring(
  destructureBody: string,
  defaults: Map<string, PropPrimitiveValue>
): void {
  const items = splitTopLevel(destructureBody, ',');
  for (const item of items) {
    const trimmed = item.trim();
    if (!trimmed || trimmed.startsWith('...')) continue;
    // Find top-level '='
    let eqIdx = -1;
    let paren = 0;
    let brace = 0;
    let bracket = 0;
    for (let i = 0; i < trimmed.length; i++) {
      const c = trimmed[i];
      if (c === '"' || c === "'" || c === '`') {
        i = skipString(trimmed, i) - 1;
        continue;
      }
      if (c === '(') paren++;
      else if (c === ')') paren = Math.max(0, paren - 1);
      else if (c === '{') brace++;
      else if (c === '}') brace = Math.max(0, brace - 1);
      else if (c === '[') bracket++;
      else if (c === ']') bracket = Math.max(0, bracket - 1);
      else if (c === '=' && trimmed[i + 1] !== '>' && paren === 0 && brace === 0 && bracket === 0) {
        eqIdx = i;
        break;
      }
    }
    if (eqIdx < 0) continue;
    const lhs = trimmed.slice(0, eqIdx).trim();
    const rhs = trimmed.slice(eqIdx + 1).trim();
    const colonIdx = lhs.indexOf(':');
    const propName = (colonIdx >= 0 ? lhs.slice(0, colonIdx) : lhs).trim();
    if (!propName || !isIdentStart(propName[0])) continue;
    const parsed = parseLiteralDefault(rhs);
    if (parsed.ok && parsed.value !== undefined) {
      defaults.set(propName, parsed.value);
    }
  }
}

function detectComponentAndPropsType(src: string): {
  componentName: string | null;
  propsTypeName: string | null;
  defaults: Map<string, PropPrimitiveValue>;
} {
  const defaults = new Map<string, PropPrimitiveValue>();
  let componentName: string | null = null;
  let propsTypeName: string | null = null;

  // 1. Detect exported component name
  const expDefaultFn = src.match(/\bexport\s+default\s+function\s+([A-Z][A-Za-z0-9_$]*)/);
  const expNamedFn = src.match(/\bexport\s+function\s+([A-Z][A-Za-z0-9_$]*)/);
  const expConst = src.match(/\bexport\s+const\s+([A-Z][A-Za-z0-9_$]*)\b/);
  const expDefaultId = src.match(/\bexport\s+default\s+([A-Z][A-Za-z0-9_$]*)\s*;?/);

  if (expDefaultFn && expDefaultFn[1]) componentName = expDefaultFn[1];
  else if (expNamedFn && expNamedFn[1]) componentName = expNamedFn[1];
  else if (expConst && expConst[1]) componentName = expConst[1];
  else if (expDefaultId && expDefaultId[1]) componentName = expDefaultId[1];
  else {
    const anyPascalFn = src.match(/\b(?:function|const)\s+([A-Z][A-Za-z0-9_$]*)\b/);
    if (anyPascalFn && anyPascalFn[1]) componentName = anyPascalFn[1];
  }

  if (componentName) {
    // Try finding React.FC<PropsName>
    const fcRe = new RegExp(
      `\\bconst\\s+${componentName}\\s*:\\s*(?:React\\.)?(?:FC|FunctionComponent)\\s*<\\s*([A-Za-z_$][A-Za-z0-9_$]*)\\s*>\\s*=\\s*\\(`
    );
    const fcMatch = src.match(fcRe);
    if (fcMatch && fcMatch[1]) {
      propsTypeName = fcMatch[1];
    }

    // Find parameter list for componentName
    const fnParamRe = new RegExp(
      `(?:function\\s+${componentName}|const\\s+${componentName}(?:\\s*:[^=]+)?\\s*=)\\s*(?:<[^>]*>)?\\s*\\(`
    );
    const fnMatch = fnParamRe.exec(src);
    if (fnMatch) {
      const openParen = src.indexOf('(', fnMatch.index);
      if (openParen >= 0) {
        const closeParen = findMatchingBrace(src, openParen, '(', ')');
        if (closeParen > openParen) {
          const paramsText = src.slice(openParen + 1, closeParen).trim();
          if (paramsText.startsWith('{')) {
            const closeDestr = findMatchingBrace(paramsText, 0, '{', '}');
            if (closeDestr > 0) {
              extractDefaultsFromDestructuring(paramsText.slice(1, closeDestr), defaults);
              const afterDestr = paramsText.slice(closeDestr + 1).trim();
              const typeAnnot = afterDestr.match(/^:\s*([A-Za-z_$][A-Za-z0-9_$]*)/);
              if (typeAnnot && typeAnnot[1] && !propsTypeName) {
                propsTypeName = typeAnnot[1];
              }
            }
          } else {
            const typeAnnot = paramsText.match(/^[A-Za-z_$][A-Za-z0-9_$]*\s*:\s*([A-Za-z_$][A-Za-z0-9_$]*)/);
            if (typeAnnot && typeAnnot[1] && !propsTypeName) {
              propsTypeName = typeAnnot[1];
            }
          }
        }
      }
    }
  }

  if (!propsTypeName && componentName) {
    const candidate = `${componentName}Props`;
    const existsRe = new RegExp(`\\b(?:interface|type)\\s+${candidate}\\b`);
    if (existsRe.test(src)) {
      propsTypeName = candidate;
    }
  }

  if (!propsTypeName) {
    const anyProps = src.match(/\b(?:interface|type)\s+([A-Za-z_$][A-Za-z0-9_$]*Props)\b/);
    if (anyProps && anyProps[1]) {
      propsTypeName = anyProps[1];
    }
  }

  return { componentName, propsTypeName, defaults };
}

function findPropsBody(src: string, propsTypeName: string): string | null {
  const ifaceRe = new RegExp(`\\binterface\\s+${propsTypeName}(?:\\s*<[^>]*>)?(?:\\s+extends\\s+[^{]+)?\\s*\\{`);
  const ifaceMatch = ifaceRe.exec(src);
  if (ifaceMatch) {
    const openBrace = src.indexOf('{', ifaceMatch.index);
    if (openBrace >= 0) {
      const closeBrace = findMatchingBrace(src, openBrace, '{', '}');
      if (closeBrace > openBrace) {
        return src.slice(openBrace + 1, closeBrace);
      }
    }
  }

  const typeRe = new RegExp(`\\btype\\s+${propsTypeName}(?:\\s*<[^>]*>)?\\s*=\\s*\\{`);
  const typeMatch = typeRe.exec(src);
  if (typeMatch) {
    const openBrace = src.indexOf('{', typeMatch.index);
    if (openBrace >= 0) {
      const closeBrace = findMatchingBrace(src, openBrace, '{', '}');
      if (closeBrace > openBrace) {
        return src.slice(openBrace + 1, closeBrace);
      }
    }
  }

  return null;
}

function cleanCommentText(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('/**')) {
    const inner = trimmed.slice(3, trimmed.endsWith('*/') ? -2 : undefined);
    return inner
      .split('\n')
      .map((line) => line.replace(/^\s*\*\s?/, '').trim())
      .filter((line) => line.length > 0 && !line.startsWith('@'))
      .join(' ')
      .trim();
  }
  if (trimmed.startsWith('/*')) {
    const inner = trimmed.slice(2, trimmed.endsWith('*/') ? -2 : undefined);
    return inner.replace(/\s+/g, ' ').trim();
  }
  if (trimmed.startsWith('//')) {
    return trimmed.slice(2).trim();
  }
  return trimmed;
}

function classifyPropType(rawType: string): { kind: PropFieldKind; options?: string[] } {
  const t = rawType.replace(/\s+/g, ' ').trim();
  if (!t) return { kind: 'unknown' };

  // Callback function types: (...) => ... or React.*Handler
  if (t.includes('=>') || /\b(?:MouseEventHandler|ChangeEventHandler|FormEventHandler|VoidFunction)\b/.test(t)) {
    return { kind: 'callback' };
  }

  const unionBranches = splitTopLevel(t, '|')
    .map((b) => b.trim())
    .filter((b) => b.length > 0 && b !== 'undefined' && b !== 'null');

  if (unionBranches.length === 1) {
    const single = unionBranches[0] ?? '';
    if (single === 'boolean') return { kind: 'boolean' };
    if (single === 'string') return { kind: 'string' };
    if (single === 'number') return { kind: 'number' };
  }

  if (unionBranches.length >= 1) {
    const strLiterals: string[] = [];
    let allStringLiterals = true;
    for (const branch of unionBranches) {
      if (
        (branch.startsWith("'") && branch.endsWith("'")) ||
        (branch.startsWith('"') && branch.endsWith('"'))
      ) {
        strLiterals.push(branch.slice(1, -1));
      } else {
        allStringLiterals = false;
        break;
      }
    }
    if (allStringLiterals && strLiterals.length > 0) {
      return { kind: 'enum', options: strLiterals };
    }
  }

  if (t === 'boolean') return { kind: 'boolean' };
  if (t === 'string') return { kind: 'string' };
  if (t === 'number') return { kind: 'number' };

  return { kind: 'unknown' };
}

function parsePropsBody(
  body: string,
  defaults: Map<string, PropPrimitiveValue>
): PropFieldSchema[] {
  const fields: PropFieldSchema[] = [];
  const n = body.length;
  let i = 0;
  let pendingComment = '';

  while (i < n) {
    // Skip whitespace
    while (i < n && isWS(body[i])) i++;
    if (i >= n) break;

    // Leading comments
    if (body[i] === '/' && body[i + 1] === '/') {
      const nl = body.indexOf('\n', i + 2);
      const end = nl === -1 ? n : nl;
      const lineComment = cleanCommentText(body.slice(i, end));
      pendingComment = pendingComment ? `${pendingComment} ${lineComment}` : lineComment;
      i = end + 1;
      continue;
    }
    if (body[i] === '/' && body[i + 1] === '*') {
      const close = body.indexOf('*/', i + 2);
      const end = close === -1 ? n : close + 2;
      pendingComment = cleanCommentText(body.slice(i, end));
      i = end;
      continue;
    }

    // Read member until top-level ';', ',', or newline (when balanced and not followed by '|')
    const stmtStart = i;
    let paren = 0;
    let brace = 0;
    let bracket = 0;
    let angle = 0;
    let trailingComment = '';

    while (i < n) {
      const c = body[i];
      if (c === '"' || c === "'" || c === '`') {
        i = skipString(body, i);
        continue;
      }
      if (c === '/' && body[i + 1] === '/') {
        const nl = body.indexOf('\n', i + 2);
        const end = nl === -1 ? n : nl;
        trailingComment = cleanCommentText(body.slice(i, end));
        i = end;
        if (paren === 0 && brace === 0 && bracket === 0 && angle === 0) break;
        continue;
      }
      if (c === '/' && body[i + 1] === '*') {
        const close = body.indexOf('*/', i + 2);
        i = close === -1 ? n : close + 2;
        continue;
      }
      if (c === '(') paren++;
      else if (c === ')') paren = Math.max(0, paren - 1);
      else if (c === '{') brace++;
      else if (c === '}') brace = Math.max(0, brace - 1);
      else if (c === '[') bracket++;
      else if (c === ']') bracket = Math.max(0, bracket - 1);
      else if (c === '<') angle++;
      else if (c === '>' && body[i - 1] !== '=') angle = Math.max(0, angle - 1);
      else if ((c === ';' || c === ',') && paren === 0 && brace === 0 && bracket === 0 && angle === 0) {
        i++;
        break;
      } else if (c === '\n' && paren === 0 && brace === 0 && bracket === 0 && angle === 0) {
        // Check if current statement already has ':' and next non-ws char isn't '|' or '&'
        const soFar = body.slice(stmtStart, i);
        let look = i + 1;
        while (look < n && isWS(body[look])) look++;
        if (soFar.includes(':') && body[look] !== '|' && body[look] !== '&') {
          i++;
          break;
        }
      }
      i++;
    }

    const rawMember = body.slice(stmtStart, i)
      .replace(/\/\/[^\n]*/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .trim()
      .replace(/[;,]$/, '')
      .trim();

    if (!rawMember) {
      pendingComment = '';
      continue;
    }

    // Parse `[readonly] name[?]: type`
    const memberMatch = rawMember.match(
      /^(?:readonly\s+)?([A-Za-z_$][A-Za-z0-9_$]*)\s*(\?)?\s*:\s*([\s\S]+)$/
    );
    if (!memberMatch) {
      pendingComment = '';
      continue;
    }

    const name = memberMatch[1] ?? '';
    const optional = memberMatch[2] === '?';
    const rawType = (memberMatch[3] ?? '').trim();
    if (!name || !isIdentStart(name[0]) || !isIdentPart(name[name.length - 1])) {
      pendingComment = '';
      continue;
    }

    const classified = classifyPropType(rawType);
    const hasDefault = defaults.has(name);
    const defaultValue = defaults.get(name);
    const description = pendingComment || trailingComment || undefined;

    const field: PropFieldSchema = {
      name,
      kind: classified.kind,
      rawType,
      optional,
      hasDefault,
    };
    if (hasDefault && defaultValue !== undefined) {
      field.defaultValue = defaultValue;
    }
    if (classified.options) {
      field.options = classified.options;
    }
    if (description) {
      field.description = description;
    }
    fields.push(field);
    pendingComment = '';
  }

  return fields;
}

export function extractPropsSchema(src: string): ComponentPropsSchema {
  const normalized = src.replace(/\r\n?/g, '\n');
  const { componentName, propsTypeName, defaults } = detectComponentAndPropsType(normalized);
  if (!propsTypeName) {
    return { componentName, propsTypeName: null, fields: [] };
  }
  const body = findPropsBody(normalized, propsTypeName);
  if (!body) {
    return { componentName, propsTypeName, fields: [] };
  }
  const fields = parsePropsBody(body, defaults);
  return { componentName, propsTypeName, fields };
}

function formatPropDefaultLiteral(
  value: PropPrimitiveValue,
  preferredQuote: "'" | '"' = "'"
): string {
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '0';
  if (preferredQuote === '"') {
    return JSON.stringify(value);
  }
  const escaped = value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
  return `'${escaped}'`;
}

function findTopLevelCommaRanges(src: string, start: number, end: number): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  let itemStart = start;
  let paren = 0;
  let brace = 0;
  let bracket = 0;
  let angle = 0;
  let i = start;
  while (i < end) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') {
      i = skipString(src, i);
      continue;
    }
    if (c === '/' && src[i + 1] === '/') {
      while (i < end && src[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      const close = src.indexOf('*/', i + 2);
      i = close === -1 || close + 2 > end ? end : close + 2;
      continue;
    }
    if (c === '(') paren++;
    else if (c === ')') paren = Math.max(0, paren - 1);
    else if (c === '{') brace++;
    else if (c === '}') brace = Math.max(0, brace - 1);
    else if (c === '[') bracket++;
    else if (c === ']') bracket = Math.max(0, bracket - 1);
    else if (c === '<') angle++;
    else if (c === '>' && src[i - 1] !== '=') angle = Math.max(0, angle - 1);
    else if (c === ',' && paren === 0 && brace === 0 && bracket === 0 && angle === 0) {
      ranges.push([itemStart, i]);
      itemStart = i + 1;
    }
    i++;
  }
  ranges.push([itemStart, end]);
  return ranges;
}

function trimBindingRange(src: string, start: number, end: number): [number, number] {
  let s = start;
  while (s < end) {
    while (s < end && isWS(src[s])) s++;
    if (src[s] === '/' && src[s + 1] === '/') {
      while (s < end && src[s] !== '\n') s++;
      continue;
    }
    if (src[s] === '/' && src[s + 1] === '*') {
      const close = src.indexOf('*/', s + 2);
      s = close === -1 || close + 2 > end ? end : close + 2;
      continue;
    }
    break;
  }
  let e = end;
  while (e > s && isWS(src[e - 1])) e--;
  return [s, e];
}

export function applyPropDefaultToSource(
  src: string,
  propName: string,
  value: PropPrimitiveValue
): string {
  if (!propName || !isIdentStart(propName[0])) return src;
  const normalized = src.replace(/\r\n?/g, '\n');
  const { componentName } = detectComponentAndPropsType(normalized);
  if (!componentName) return src;

  const fnParamRe = new RegExp(
    `(?:function\\s+${componentName}|const\\s+${componentName}(?:\\s*:[^=]+)?\\s*=)\\s*(?:<[^>]*>)?\\s*\\(`
  );
  const fnMatch = fnParamRe.exec(normalized);
  if (!fnMatch) return src;

  const openParen = normalized.indexOf('(', fnMatch.index);
  if (openParen < 0) return src;
  const closeParen = findMatchingBrace(normalized, openParen, '(', ')');
  if (closeParen <= openParen) return src;

  let destrOpen = openParen + 1;
  while (destrOpen < closeParen && isWS(normalized[destrOpen])) destrOpen++;
  if (normalized[destrOpen] !== '{') return src;

  const destrClose = findMatchingBrace(normalized, destrOpen, '{', '}');
  if (destrClose <= destrOpen || destrClose > closeParen) return src;

  const itemRanges = findTopLevelCommaRanges(normalized, destrOpen + 1, destrClose);
  for (const [rawStart, rawEnd] of itemRanges) {
    const [tokStart, tokEnd] = trimBindingRange(normalized, rawStart, rawEnd);
    if (tokEnd <= tokStart) continue;
    const itemStr = normalized.slice(tokStart, tokEnd);
    if (itemStr.startsWith('...')) continue;

    let eqIdx = -1;
    let paren = 0;
    let brace = 0;
    let bracket = 0;
    for (let i = 0; i < itemStr.length; i++) {
      const c = itemStr[i];
      if (c === '"' || c === "'" || c === '`') {
        i = skipString(itemStr, i) - 1;
        continue;
      }
      if (c === '(') paren++;
      else if (c === ')') paren = Math.max(0, paren - 1);
      else if (c === '{') brace++;
      else if (c === '}') brace = Math.max(0, brace - 1);
      else if (c === '[') bracket++;
      else if (c === ']') bracket = Math.max(0, bracket - 1);
      else if (c === '=' && itemStr[i + 1] !== '>' && paren === 0 && brace === 0 && bracket === 0) {
        eqIdx = i;
        break;
      }
    }

    const lhs = (eqIdx >= 0 ? itemStr.slice(0, eqIdx) : itemStr).trim();
    const colonIdx = lhs.indexOf(':');
    const candidateProp = (colonIdx >= 0 ? lhs.slice(0, colonIdx) : lhs).trim();
    if (candidateProp !== propName) continue;

    if (eqIdx >= 0) {
      const afterEq = itemStr.slice(eqIdx + 1);
      const leadingWs = afterEq.length - afterEq.trimStart().length;
      const rhsTrim = afterEq.trim();
      const preferredQuote: "'" | '"' = rhsTrim.startsWith('"') ? '"' : "'";
      const rhsStart = tokStart + eqIdx + 1 + leadingWs;
      const literal = formatPropDefaultLiteral(value, preferredQuote);
      return normalized.slice(0, rhsStart) + literal + normalized.slice(tokEnd);
    }

    const literal = formatPropDefaultLiteral(value, "'");
    return normalized.slice(0, tokEnd) + ' = ' + literal + normalized.slice(tokEnd);
  }

  return src;
}
