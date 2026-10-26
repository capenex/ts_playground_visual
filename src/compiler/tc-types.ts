/* ================================================================
   TypeScript Type-Checker Shared Types & Pure Type Utilities (src/compiler/tc-types.ts)
   ================================================================ */
import {
  findBalancedParen,
  isIdentStart,
  isWS,
  readIdent,
  skipString,
  splitTopLevel,
  stripInlineCommentSafe,
  RESERVED_WORDS,
} from "./comments";
import { isMapLike, isSetLike } from "../viz/memory-graph";
import { Frame, InterfaceSchemaMeta, StepAnim } from "../types";

export interface TypeParamInfo {
  name: string;
  constraint: string | null;
  defaultType: string | null;
}

export interface PropShapeInfo {
  type: string;
  rawType: string;
  optional: boolean;
}

export interface VarEnvInfo {
  type: string;
  isConst?: boolean;
  line?: number;
  declaredType?: string;
  literalType?: string | null;
}

export interface FnSigInfo {
  name: string;
  params: Array<{ name: string; type: string; rawType: string; optional: boolean; isRest?: boolean }>;
  minArgs: number;
  returnType: string;
  rawReturnType: string;
  typeParams: TypeParamInfo[];
  line: number;
  hasValueReturn: boolean;
}

export interface TypeCheckContext {
  lines: string[];
  diagnostics: Array<{ line: number; code: string; message?: string }>;
  fns: Map<string, FnSigInfo>;
  typeAliases: Map<string, string>;
  genericTypeAliases: Map<string, { typeParams: TypeParamInfo[]; body: string; line: number }>;
  interfaceTypeParams: Map<string, TypeParamInfo[]>;
  interfaces: Map<string, Map<string, PropShapeInfo>>;
  classParents: Map<string, string>;
  classImplements: Map<string, { interfaces: string[]; line: number }>;
  abstractClasses: Set<string>;
  enumsSet: Set<string>;
  enumMembers: Map<string, Set<string>>;
  enumValueTypes: Map<string, Set<string>>;
  env: Map<string, VarEnvInfo>;
  activeTypeParams: Map<string, string>;
  addDiag: (line: number, code: string, message?: string) => void;
  getKnownNominalTypes: () => Set<string>;
  isKnownIdentifier: (name: string) => boolean;
}

export const BUILTIN_TS_GLOBALS = new Set([
  'Math', 'JSON', 'Number', 'String', 'Boolean', 'Array', 'Object', 'Map', 'Set',
  'WeakMap', 'WeakSet', 'Date', 'RegExp', 'Error', 'TypeError', 'RangeError',
  'SyntaxError', 'ReferenceError', 'URIError', 'EvalError', 'AggregateError',
  'Promise', 'Symbol', 'BigInt', 'Intl', 'Reflect', 'Proxy',
  'Generator', 'AsyncGenerator', 'Iterator', 'AsyncIterator', 'Iterable', 'AsyncIterable',
  'ArrayBuffer', 'SharedArrayBuffer', 'DataView',
  'Int8Array', 'Uint8Array', 'Uint8ClampedArray', 'Int16Array', 'Uint16Array',
  'Int32Array', 'Uint32Array', 'Float32Array', 'Float64Array', 'BigInt64Array', 'BigUint64Array',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURI', 'decodeURI',
  'encodeURIComponent', 'decodeURIComponent', 'structuredClone', 'atob', 'btoa',
  'console', 'window', 'globalThis', 'self', 'document', 'navigator', 'location', 'performance',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame', 'queueMicrotask', 'sleep',
  'Infinity', 'NaN', 'undefined', 'null', 'true', 'false', 'this', 'super', 'arguments',
  'checkpoint', '断点',
]);

export function createTypeCheckContext(src: string): TypeCheckContext {
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const diagnostics: Array<{ line: number; code: string; message?: string }> = [];
  const fns = new Map<string, FnSigInfo>();
  const typeAliases = new Map<string, string>();
  const genericTypeAliases = new Map<string, { typeParams: TypeParamInfo[]; body: string; line: number }>();
  const interfaceTypeParams = new Map<string, TypeParamInfo[]>();
  const interfaces = new Map<string, Map<string, PropShapeInfo>>();
  const classParents = new Map<string, string>();
  const classImplements = new Map<string, { interfaces: string[]; line: number }>();
  const abstractClasses = new Set<string>();
  const enumsSet = new Set<string>();
  const enumMembers = new Map<string, Set<string>>();
  const enumValueTypes = new Map<string, Set<string>>();
  const env = new Map<string, VarEnvInfo>();
  const activeTypeParams = new Map<string, string>();

  function getKnownNominalTypes(): Set<string> {
    const s = new Set<string>();
    enumsSet.forEach(k => s.add(k));
    interfaces.forEach((_, k) => s.add(k));
    typeAliases.forEach((_, k) => s.add(k));
    activeTypeParams.forEach((_, k) => s.delete(k));
    return s;
  }

  function isKnownIdentifier(name: string) {
    if (!name || !/^[A-Za-z_$][\w$]*$/.test(name)) return true;
    return (
      env.has(name) ||
      fns.has(name) ||
      interfaces.has(name) ||
      typeAliases.has(name) ||
      genericTypeAliases.has(name) ||
      activeTypeParams.has(name) ||
      enumsSet.has(name) ||
      BUILTIN_TS_GLOBALS.has(name) ||
      RESERVED_WORDS.has(name)
    );
  }

  function addDiag(line: number, code: string, message?: string) {
    if (!diagnostics.some(d => d.line === line && d.code === code && d.message === message)) {
      diagnostics.push({ line, code, message });
    }
  }

  return {
    lines,
    diagnostics,
    fns,
    typeAliases,
    genericTypeAliases,
    interfaceTypeParams,
    interfaces,
    classParents,
    classImplements,
    abstractClasses,
    enumsSet,
    enumMembers,
    enumValueTypes,
    env,
    activeTypeParams,
    addDiag,
    getKnownNominalTypes,
    isKnownIdentifier,
  };
}

export function inferRuntimeTsType(val: unknown): string {
  if (val === null) return 'null';
  if (Array.isArray(val)) {
    if (!val.length) return 'any[]';
    return inferRuntimeTsType(val[0]) + '[]';
  }
  if (isMapLike(val)) return 'Map';
  if (isSetLike(val)) return 'Set';
  return typeof val;
}

export function extractTsInterfaceMetadata(src: string | null | undefined) {
  const interfaces = new Map<string, InterfaceSchemaMeta>();
  const varTypes = new Map<string, string>();
  if (!src || typeof src !== 'string') {
    CURRENT_TS_META = { interfaces, varTypes };
    return CURRENT_TS_META;
  }

  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  let activeIface: string | null = null;
  let activeIfaceLine = 1;
  let activeIsClass = false;
  let activeBody = '';
  let depth = 0;

  function parseFieldsFromBody(bodyStr: string, isClass = false) {
    const inner = bodyStr.trim().replace(/^\{/, '').replace(/\}$/, '').trim();
    const fields: Array<{ k: string; declaredType: string; optional: boolean }> = [];
    const seen = new Set();
    if (!inner) return fields;
    let topLevelOnly = '';
    let bDepth = 0;
    for (let i = 0; i < inner.length; i++) {
      const ch = inner[i];
      if (ch === '"' || ch === "'" || ch === '`') {
        const end = skipString(inner, i);
        if (bDepth === 0) topLevelOnly += inner.slice(i, end);
        i = end - 1;
        continue;
      }
      if (ch === '{') { bDepth++; continue; }
      if (ch === '}') { bDepth = Math.max(0, bDepth - 1); continue; }
      if (bDepth === 0) topLevelOnly += ch;
    }
    const members = topLevelOnly.split(/[;,\n]/).map(s => stripInlineCommentSafe(s).trim()).filter(Boolean);
    members.forEach(mem => {
      const cleaned = mem.replace(/^(?:(?:readonly|public|private|protected|static)\s+)+/, '');
      if (/^(?:constructor|get\s+|set\s+|async\s+|[A-Za-z_$][\w$]*\s*\()/.test(cleaned)) return;
      const m = cleaned.match(/^([A-Za-z_$][\w$]*)(\?)?\s*:\s*([^=]+?)(?:\s*=[\s\S]+)?$/);
      if (m && m[1] && m[3] && !seen.has(m[1])) {
        seen.add(m[1]);
        fields.push({
          k: m[1],
          declaredType: m[3].trim(),
          optional: Boolean(m[2]),
        });
        return;
      }
      if (isClass) {
        const initOnly = cleaned.match(/^([A-Za-z_$][\w$]*)\s*=\s*(.+)$/);
        if (initOnly && initOnly[1] && initOnly[2] && !seen.has(initOnly[1])) {
          const rhs = initOnly[2].trim();
          let inferred = 'any';
          if (/^[+-]?\d+(?:\.\d+)?$/.test(rhs)) inferred = 'number';
          else if (/^(true|false)$/.test(rhs)) inferred = 'boolean';
          else if (/^["'`]/.test(rhs)) inferred = 'string';
          else if (rhs.startsWith('[')) inferred = 'any[]';
          seen.add(initOnly[1]);
          fields.push({
            k: initOnly[1],
            declaredType: inferred,
            optional: false,
          });
        }
      }
    });
    if (isClass) {
      const ctorM = inner.match(/\bconstructor\s*\(([^)]*)\)/);
      if (ctorM && ctorM[1]?.trim()) {
        splitTopLevel(ctorM[1]).forEach(rawP => {
          const p = rawP.trim();
          const pm = p.match(/^(?:(?:public|private|protected|readonly)\s+)+([A-Za-z_$][\w$]*)(\?)?(?:\s*:\s*([^=]+?))?(?:\s*=\s*([\s\S]+))?$/);
          if (pm && pm[1] && !seen.has(pm[1])) {
            seen.add(pm[1]);
            let pType = pm[3] ? pm[3].trim() : 'any';
            if (pType === 'any' && pm[4]) {
              const rhs = pm[4].trim();
              if (/^[+-]?\d+(?:\.\d+)?$/.test(rhs)) pType = 'number';
              else if (/^(true|false)$/.test(rhs)) pType = 'boolean';
              else if (/^["'`]/.test(rhs)) pType = 'string';
            }
            fields.push({ k: pm[1], declaredType: pType, optional: Boolean(pm[2]) });
          }
        });
      }
      const thisAssignRe = /\bthis\.([A-Za-z_$][\w$]*)\s*=/g;
      let tm;
      while ((tm = thisAssignRe.exec(inner))) {
        if (tm[1] && !seen.has(tm[1])) {
          seen.add(tm[1]);
          fields.push({ k: tm[1], declaredType: 'any', optional: false });
        }
      }
    }
    return fields;
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = stripInlineCommentSafe(lines[i]);
    const trimmed = raw.trim();
    if (!trimmed) continue;

    if (activeIface) {
      activeBody += '\n' + raw;
      for (const ch of raw) {
        if (ch === '{') depth++;
        else if (ch === '}') depth--;
      }
      if (depth <= 0) {
        const parsedFields = parseFieldsFromBody(activeBody, activeIsClass);
        if (!activeIsClass || parsedFields.length > 0) {
          interfaces.set(activeIface, {
            name: activeIface,
            line: activeIfaceLine,
            isClass: activeIsClass,
            fields: parsedFields,
          });
        }
        activeIface = null;
        activeIsClass = false;
        activeBody = '';
      }
      continue;
    }

    const ifaceM = trimmed.match(/^(?:export\s+)?(?:abstract\s+)?(interface|class)\s+([A-Za-z_$][\w$]*)(?:\s*<[^>]*>)?(?:\s+extends\s+[^{]+)?(?:\s+implements\s+[^{]+)?\s*\{(.*)$/);
    if (ifaceM && ifaceM[2]) {
      const isClass = ifaceM[1] === 'class';
      const name = ifaceM[2];
      const rest = '{' + (ifaceM[3] || '');
      let d = 0;
      for (const ch of rest) {
        if (ch === '{') d++;
        else if (ch === '}') d--;
      }
      if (d <= 0 && rest.includes('}')) {
        const bodyPart = rest.slice(0, rest.lastIndexOf('}') + 1);
        const parsedFields = parseFieldsFromBody(bodyPart, isClass);
        if (!isClass || parsedFields.length > 0) {
          interfaces.set(name, {
            name,
            line: i + 1,
            isClass,
            fields: parsedFields,
          });
        }
      } else {
        activeIface = name;
        activeIfaceLine = i + 1;
        activeIsClass = isClass;
        activeBody = rest;
        depth = d;
      }
      continue;
    }

    const typeObjM = trimmed.match(/^(?:export\s+)?type\s+([A-Za-z_$][\w$]*)\s*=\s*(\{[\s\S]*\});?$/);
    if (typeObjM && typeObjM[1] && typeObjM[2]) {
      interfaces.set(typeObjM[1], {
        name: typeObjM[1],
        line: i + 1,
        isClass: false,
        fields: parseFieldsFromBody(typeObjM[2], false),
      });
      continue;
    }

    const fnM = trimmed.match(/^(?:export\s+)?(?:default\s+)?function\s+[A-Za-z_$][\w$]*\s*\(([^)]*)\)/);
    if (fnM && fnM[1]?.trim()) {
      splitTopLevel(fnM[1]).forEach(p => {
        const pm = p.trim().match(/^([A-Za-z_$][\w$]*)\??\s*:\s*(.+)$/);
        if (pm && pm[1] && pm[2]) varTypes.set(pm[1], pm[2].trim());
      });
    }

    const varM = trimmed.match(/^(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*:\s*([^=]+?)(?:\s*=|$)/);
    if (varM && varM[1] && varM[2]) {
      varTypes.set(varM[1], varM[2].trim());
    } else {
      const varNewM = trimmed.match(/^(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*new\s+([A-Za-z_$][\w$]*)\s*(?:<[^>]*>)?\s*\(/);
      if (varNewM && varNewM[1] && varNewM[2] && !/^(Map|Set|Array)$/.test(varNewM[2])) {
        varTypes.set(varNewM[1], varNewM[2]);
      }
    }
  }

  CURRENT_TS_META = { interfaces, varTypes };
  return CURRENT_TS_META;
}

export function matchInterfaceForObject(name: string | null | undefined, value: StepAnim | Frame | null | undefined): InterfaceSchemaMeta | null {
  const { interfaces, varTypes } = CURRENT_TS_META;
  const declaredVarT = name ? varTypes.get(name) : undefined;
  if (declaredVarT) {
    const cleanT = declaredVarT.replace(/\[\]$/, '').trim();
    if (interfaces.has(cleanT)) return interfaces.get(cleanT) || null;
  }
  if (value && typeof value === 'object') {
    const pyCls = typeof value.__py_cls__ === 'string' ? value.__py_cls__ : '';
    if (pyCls && interfaces.has(pyCls)) {
      return interfaces.get(pyCls) || null;
    }
  }
  if (!value || typeof value !== 'object') return null;
  const valKeys = Object.keys(value);
  if (!valKeys.length) return null;
  let best: InterfaceSchemaMeta | null = null;
  let bestScore = 0;
  interfaces.forEach(iface => {
    if (!iface.fields.length) return;
    const overlap = iface.fields.filter((f: { k?: string }) => (f.k || '') in value).length;
    if (overlap > 0 && overlap >= bestScore) {
      const allKnown = valKeys.every(k => iface.fields.some((f: { k?: string }) => f.k === k));
      const score = overlap * 2 + (allKnown ? 1 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = iface;
      }
    }
  });
  return best;
}

export function normalizeTsType(rawType: string | null | undefined): string {
  if (!rawType) return 'any';
  let src = rawType.trim();
  let t = '';
  let i = 0;
  while (i < src.length) {
    const ch = src[i] || '';
    if (ch === '"' || ch === "'" || ch === '`') {
      const end = skipString(src, i);
      let lit = src.slice(i, end);
      if (ch === "'") {
        lit = '"' + lit.slice(1, -1).replace(/"/g, '\\"') + '"';
      }
      t += lit;
      i = end;
      continue;
    }
    if (/\s/.test(ch)) {
      while (i < src.length && /\s/.test(src[i] || '')) i++;
      const prev = t[t.length - 1] || '';
      const next = src[i] || '';
      if (/[A-Za-z0-9_$?]/.test(prev) && /[A-Za-z0-9_$"`']/.test(next)) {
        t += ' ';
      }
      continue;
    }
    t += ch;
    i++;
  }
  while (t.startsWith('(') && t.endsWith(')') && findBalancedParen(t, 0) === t.length - 1) {
    t = t.slice(1, -1).trim();
  }
  const parenArr = t.match(/^\(([^()]+)\)\[\]$/);
  if (parenArr && parenArr[1] && !/\binfer\s+/.test(parenArr[1]) && !parenArr[1].includes('|') && !parenArr[1].includes('&') && !parenArr[1].includes('=>')) {
    t = normalizeTsType(parenArr[1]) + '[]';
  }
  const arrGeneric = t.match(/^(?:Readonly)?Array<(.+)>$/);
  if (arrGeneric && arrGeneric[1] && splitTopLevelUnion(arrGeneric[1]).length === 1) {
    const inner = normalizeTsType(arrGeneric[1]);
    if (/\binfer\s+/.test(inner) || inner.includes('|') || inner.includes('&') || inner.includes('=>')) {
      t = `(${inner})[]`;
    } else {
      t = inner + '[]';
    }
  }
  if (t.startsWith('readonly ')) {
    t = t.slice('readonly '.length).trim();
  }
  if (t === 'unique symbol') {
    return 'symbol';
  }
  return t;
}

export function stripTupleElementLabel(elemStr: string): string {
  const s = elemStr.trim();
  const m = s.match(/^(\.\.\.)?(?:readonly\s+)?[A-Za-z_$][\w$]*(\?)?\s*:\s*([\s\S]+)$/);
  if (m && m[3]) {
    const prefix = m[1] || '';
    const optSuffix = m[2] ? '?' : '';
    return `${prefix}${m[3].trim()}${optSuffix}`;
  }
  return s.replace(/^readonly\s+/, '').trim();
}

export function splitTopLevelUnion(typeStr: string): string[] {
  const parts: string[] = [];
  let depth = 0, cur = '';
  for (let i = 0; i < typeStr.length; i++) {
    const ch = typeStr[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      const end = skipString(typeStr, i);
      cur += typeStr.slice(i, end);
      i = end - 1;
      continue;
    }
    if (ch === '<' || ch === '(' || ch === '[' || ch === '{') depth++;
    else if ((ch === '>' && typeStr[i - 1] !== '=') || ch === ')' || ch === ']' || ch === '}') depth = Math.max(0, depth - 1);
    if (ch === '|' && depth === 0) {
      if (cur.trim()) parts.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

export function splitTopLevelIntersection(typeStr: string): string[] {
  const parts: string[] = [];
  let depth = 0, cur = '';
  for (let i = 0; i < typeStr.length; i++) {
    const ch = typeStr[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      const end = skipString(typeStr, i);
      cur += typeStr.slice(i, end);
      i = end - 1;
      continue;
    }
    if (ch === '<' || ch === '(' || ch === '[' || ch === '{') depth++;
    else if ((ch === '>' && typeStr[i - 1] !== '=') || ch === ')' || ch === ']' || ch === '}') depth = Math.max(0, depth - 1);
    if (ch === '&' && depth === 0) {
      if (cur.trim()) parts.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

export function stripNullableFromType(typeStr: string | null | undefined, target: string): string {
  if (!typeStr) return 'any';
  const norm = normalizeTsType(typeStr);
  const parts = splitTopLevelUnion(norm).filter(p => p !== target);
  return parts.length ? parts.join('|') : norm;
}

export function isLiteralOfPrimitive(lit: string, prim: string): boolean {
  if (prim === 'string') return (lit.startsWith('"') && lit.endsWith('"')) || (lit.startsWith('`') && lit.endsWith('`'));
  if (prim === 'number') return /^[+-]?\d+(?:\.\d+)?$/.test(lit);
  if (prim === 'boolean') return lit === 'true' || lit === 'false';
  return false;
}

export function matchTemplateLiteralType(actualStr: string, patternTpl: string): Map<string, string> | null {
  if (!actualStr.startsWith('"') || !actualStr.endsWith('"')) return null;
  if (!patternTpl.startsWith('`') || !patternTpl.endsWith('`')) return null;
  const val = actualStr.slice(1, -1);
  const body = patternTpl.slice(1, -1);
  let regexStr = '^';
  const inferNames: Array<{ name: string; constraint: string | null }> = [];
  let i = 0;
  while (i < body.length) {
    if (body[i] === '$' && body[i + 1] === '{') {
      const end = body.indexOf('}', i + 2);
      if (end < 0) return null;
      const expr = body.slice(i + 2, end).trim();
      const inferM = expr.match(/^infer\s+([A-Za-z_$][\w$]*)(?:\s+extends\s+(.+))?$/);
      if (inferM && inferM[1]) {
        inferNames.push({ name: inferM[1], constraint: inferM[2] ? normalizeTsType(inferM[2]) : null });
        const hasMoreText = end + 1 < body.length;
        regexStr += hasMoreText ? '(.+?)' : '(.*)';
      } else if (expr === 'string' || expr === 'any') {
        regexStr += '.*';
      } else if (expr === 'number') {
        regexStr += '[+-]?\\d+(?:\\.\\d+)?';
      } else if (expr === 'boolean') {
        regexStr += '(?:true|false)';
      } else {
        const cleanLit = expr.replace(/^["']|["']$/g, '');
        regexStr += cleanLit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }
      i = end + 1;
    } else {
      regexStr += (body[i] || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      i++;
    }
  }
  regexStr += '$';
  try {
    const m = val.match(new RegExp(regexStr));
    if (!m) return null;
    const bindings = new Map<string, string>();
    for (let k = 0; k < inferNames.length; k++) {
      const captured = m[k + 1] ?? '';
      const info = inferNames[k];
      if (!info) continue;
      if (info.constraint === 'number') {
        if (!/^[+-]?\d+(?:\.\d+)?$/.test(captured)) return null;
        bindings.set(info.name, captured);
      } else if (info.constraint === 'boolean') {
        if (captured !== 'true' && captured !== 'false') return null;
        bindings.set(info.name, captured);
      } else {
        bindings.set(info.name, `"${captured}"`);
      }
    }
    return bindings;
  } catch (_) {
    return null;
  }
}

export function isTsAssignable(
  actual: string | null | undefined,
  expected: string | null | undefined,
  knownNominalTypes?: Set<string>,
): boolean {
  if (!actual || !expected) return true;
  const a = normalizeTsType(actual);
  const e = normalizeTsType(expected);
  if (a === e || a === 'any' || e === 'any' || e === 'unknown' || a === 'never') return true;
  if (a === 'undefined' && e === 'void') return true;
  if (a === 'unknown') return false;
  if (e === 'never') return a === 'never';
  if (isLiteralOfPrimitive(a, e)) return true;
  if (e.startsWith('`') && e.endsWith('`') && a.startsWith('"') && a.endsWith('"')) {
    if (matchTemplateLiteralType(a, e) !== null) return true;
  }
  const aIsUnboundTypeParam = /^[A-Z]\d*$/.test(a) && (!knownNominalTypes || !knownNominalTypes.has(a));
  const eIsUnboundTypeParam = /^[A-Z]\d*$/.test(e) && (!knownNominalTypes || !knownNominalTypes.has(e));
  if (aIsUnboundTypeParam || eIsUnboundTypeParam) return true;
  const eParts = splitTopLevelUnion(e);
  if (eParts.length > 1) {
    const aPartsForUnion = splitTopLevelUnion(a);
    if (aPartsForUnion.length > 1) {
      return aPartsForUnion.every(ap => eParts.some(ep => isTsAssignable(ap, ep, knownNominalTypes)));
    }
    return eParts.some(part => isTsAssignable(a, part, knownNominalTypes));
  }
  const aParts = splitTopLevelUnion(a);
  if (aParts.length > 1) {
    return aParts.every(part => isTsAssignable(part, e, knownNominalTypes));
  }
  if (a === 'any[]' && e.endsWith('[]')) return true;
  if (a === 'any[][]' && e.endsWith('[][]')) return true;
  const aParenArr = a.match(/^\((.+)\)\[\]$/);
  const eParenArr = e.match(/^\((.+)\)\[\]$/);
  if ((aParenArr || a.endsWith('[]')) && (eParenArr || e.endsWith('[]'))) {
    const elemA = aParenArr ? aParenArr[1] : a.slice(0, -2);
    const elemE = eParenArr ? eParenArr[1] : e.slice(0, -2);
    return isTsAssignable(elemA, elemE, knownNominalTypes);
  }
  if (a.startsWith('[') && a.endsWith(']') && e.startsWith('[') && e.endsWith(']')) {
    const aPartsTup = a.slice(1, -1).split(',').map(s => stripTupleElementLabel(s)).filter(Boolean);
    const ePartsTup = e.slice(1, -1).split(',').map(s => stripTupleElementLabel(s)).filter(Boolean);
    if (aPartsTup.length === ePartsTup.length && aPartsTup.every((ap, idx) => isTsAssignable(ap, ePartsTup[idx], knownNominalTypes))) {
      return true;
    }
  }
  if (a.startsWith('[') && a.endsWith(']') && e.endsWith('[]')) {
    const elemE = eParenArr ? eParenArr[1] : e.slice(0, -2);
    const aPartsTup = a.slice(1, -1).split(',').map(s => stripTupleElementLabel(s)).filter(Boolean);
    if (aPartsTup.every(ap => isTsAssignable(ap, elemE, knownNominalTypes))) return true;
  }
  if (a.endsWith('[]') && e.startsWith('[') && e.endsWith(']')) {
    const elemA = aParenArr ? aParenArr[1] : a.slice(0, -2);
    const tupleParts = e.slice(1, -1).split(',').map(s => stripTupleElementLabel(s)).filter(Boolean);
    if (tupleParts.length > 0 && tupleParts.every(tp => isTsAssignable(elemA, tp, knownNominalTypes))) {
      return true;
    }
  }
  const fnArrowIdx = e.lastIndexOf('=>');
  if (fnArrowIdx > 0 && e.startsWith('(')) {
    const expectedRet = e.slice(fnArrowIdx + 2).trim();
    const aArrowIdx = a.lastIndexOf('=>');
    if (aArrowIdx > 0 && a.startsWith('(')) {
      const actualRet = a.slice(aArrowIdx + 2).trim();
      return isTsAssignable(actualRet, expectedRet, knownNominalTypes);
    }
    if (a === 'function' || isTsAssignable(a, expectedRet, knownNominalTypes)) return true;
  }
  const aGenM = a.match(/^([A-Za-z_$][\w$]*)<(.+)>$/);
  const eGenM = e.match(/^([A-Za-z_$][\w$]*)<(.+)>$/);
  if (aGenM && eGenM && aGenM[1] === eGenM[1]) {
    return isTsAssignable(aGenM[2], eGenM[2], knownNominalTypes);
  }
  return false;
}

export function splitTopLevelDecl(s: string): string[] {
  const parts: string[] = [];
  let depth = 0, angleDepth = 0, cur = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      const end = skipString(s, i);
      cur += s.slice(i, end);
      i = end - 1;
      continue;
    }
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') depth = Math.max(0, depth - 1);
    else if (ch === '<' && s.indexOf('>', i + 1) > i) angleDepth++;
    else if (ch === '>' && angleDepth > 0 && s[i - 1] !== '=') angleDepth--;
    if (ch === ',' && depth === 0 && angleDepth === 0) {
      parts.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur) parts.push(cur);
  return parts;
}

export function parseTypeParams(typeParamStr: string): Array<TypeParamInfo> {
  if (!typeParamStr) return [];
  let inner = typeParamStr.trim();
  if (inner.startsWith('<') && inner.endsWith('>')) inner = inner.slice(1, -1).trim();
  if (!inner) return [];
  const rawItems = splitTopLevelDecl(inner);
  const out: Array<TypeParamInfo> = [];
  rawItems.forEach(item => {
    let s = item.trim().replace(/^(?:const|in|out)\s+/, '');
    if (!s) return;
    let defaultType: string | null = null;
    let d = 0, ad = 0, eqIdx = -1;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === '"' || ch === "'" || ch === '`') { i = skipString(s, i) - 1; continue; }
      if (ch === '(' || ch === '[' || ch === '{') d++;
      else if (ch === ')' || ch === ']' || ch === '}') d = Math.max(0, d - 1);
      else if (ch === '<') ad++;
      else if (ch === '>' && s[i - 1] !== '=') ad = Math.max(0, ad - 1);
      else if (ch === '=' && s[i + 1] !== '>' && d === 0 && ad === 0) { eqIdx = i; break; }
    }
    if (eqIdx > 0) {
      defaultType = s.slice(eqIdx + 1).trim();
      s = s.slice(0, eqIdx).trim();
    }
    const extM = s.match(/^([A-Za-z_$][\w$]*)(?:\s+extends\s+([\s\S]+))?$/);
    if (extM && extM[1]) {
      out.push({
        name: extM[1],
        constraint: extM[2] ? extM[2].trim() : null,
        defaultType,
      });
    }
  });
  return out;
}

export function substituteTypeParamsInStr(typeStr: string, typeEnv: Map<string, string> | null | undefined): string {
  if (!typeStr || !typeEnv || typeEnv.size === 0) return typeStr;
  let out = '';
  let i = 0;
  while (i < typeStr.length) {
    const ch = typeStr[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      const end = skipString(typeStr, i);
      if (ch === '`') {
        let tpl = '`';
        let k = i + 1;
        while (k < end - 1) {
          if (typeStr[k] === '$' && typeStr[k + 1] === '{') {
            const closeIdx = typeStr.indexOf('}', k + 2);
            if (closeIdx > k && closeIdx < end) {
              const innerExpr = typeStr.slice(k + 2, closeIdx);
              tpl += '${' + substituteTypeParamsInStr(innerExpr, typeEnv) + '}';
              k = closeIdx + 1;
              continue;
            }
          }
          tpl += typeStr[k++];
        }
        tpl += '`';
        out += tpl;
      } else {
        out += typeStr.slice(i, end);
      }
      i = end;
      continue;
    }
    if (isIdentStart(ch)) {
      const id = readIdent(typeStr, i);
      if (!id) {
        out += ch;
        i++;
        continue;
      }
      const word = id.name;
      const prevCh = i > 0 ? (typeStr[i - 1] || '') : '';
      let afterIdx = id.end;
      while (afterIdx < typeStr.length && isWS(typeStr[afterIdx])) afterIdx++;
      const isPropKey = (typeStr[afterIdx] === ':' || (typeStr[afterIdx] === '?' && typeStr[afterIdx + 1] === ':')) &&
        (prevCh === '{' || prevCh === ';' || prevCh === ',' || /\s/.test(prevCh));
      const isAfterInfer = out.trimEnd().endsWith('infer');
      if (!isPropKey && !isAfterInfer && prevCh !== '.' && typeEnv.has(word)) {
        out += typeEnv.get(word);
      } else {
        out += word;
      }
      i = id.end;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

export function parseTopLevelConditional(typeStr: string) {
  let d = 0, ad = 0;
  let extPos = -1, extLen = 7, qPos = -1, cPos = -1;
  let qDepth = 0;
  for (let i = 0; i < typeStr.length; i++) {
    const ch = typeStr[i];
    if (ch === '"' || ch === "'" || ch === '`') { i = skipString(typeStr, i) - 1; continue; }
    if (ch === '(' || ch === '[' || ch === '{') d++;
    else if (ch === ')' || ch === ']' || ch === '}') d = Math.max(0, d - 1);
    else if (ch === '<') ad++;
    else if (ch === '>' && typeStr[i - 1] !== '=') ad = Math.max(0, ad - 1);
    else if (d === 0 && ad === 0) {
      if (extPos < 0 && (i === 0 || /[\s>)\]]/.test(typeStr[i - 1] || ''))) {
        const extM = typeStr.slice(i).match(/^extends(?:\s+|(?=[(\[{"'`]))/);
        if (extM) {
          extPos = i;
          extLen = extM[0].length;
          i += extLen - 1;
          continue;
        }
      }
      if (extPos >= 0 && ch === '?') {
        if (qPos < 0) qPos = i;
        else qDepth++;
      } else if (extPos >= 0 && qPos >= 0 && ch === ':') {
        if (qDepth === 0) {
          cPos = i;
          break;
        } else {
          qDepth--;
        }
      }
    }
  }
  if (extPos > 0 && qPos > extPos && cPos > qPos) {
    return {
      checkType: typeStr.slice(0, extPos).trim(),
      extendsType: typeStr.slice(extPos + extLen, qPos).trim(),
      trueType: typeStr.slice(qPos + 1, cPos).trim(),
      falseType: typeStr.slice(cPos + 1).trim(),
    };
  }
  return null;
}

export function inferLiteralType(expr: string | null | undefined): string | null {
  if (!expr) return null;
  const s = expr.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return '"' + s.slice(1, -1).replace(/"/g, '\\"') + '"';
  }
  if (/^[+-]?\d+(?:\.\d+)?$/.test(s)) return s;
  if (s === 'true' || s === 'false') return s;
  return null;
}

export function parseObjectLiteralEntries(expr: string): Map<string, string> | null {
  const s = expr.trim();
  if (!s.startsWith('{') || !s.endsWith('}') || findBalancedParen(s, 0) !== s.length - 1) return null;
  const inner = s.slice(1, -1).trim();
  const entries = new Map<string, string>();
  if (!inner) return entries;
  const parts = splitTopLevel(inner);
  parts.forEach(part => {
    const p = part.trim();
    if (!p) return;
    const getterLitM = p.match(/^get\s+([A-Za-z_$][\w$]*)\s*\(\s*\)\s*(?::\s*([^{]+?))?\s*\{([\s\S]*)\}$/);
    if (getterLitM && getterLitM[1]) {
      const gRet = getterLitM[2] ? getterLitM[2].trim() : '0';
      entries.set(getterLitM[1], `undefined as ${gRet}`);
      return;
    }
    const methodLitM = p.match(/^(?:async\s+)?([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*(?::\s*([^{]+?))?\s*\{([\s\S]*)\}$/);
    if (methodLitM && methodLitM[1]) {
      entries.set(methodLitM[1], `(${methodLitM[2] || ''}) => undefined`);
      return;
    }
    let colonIdx = -1, d = 0;
    for (let i = 0; i < p.length; i++) {
      const ch = p[i];
      if (ch === '"' || ch === "'" || ch === '`') { i = skipString(p, i) - 1; continue; }
      if (ch === '(' && d === 0) break;
      if (ch === '(' || ch === '[' || ch === '{') d++;
      else if (ch === ')' || ch === ']' || ch === '}') d--;
      else if (d === 0 && ch === ':') { colonIdx = i; break; }
    }
    if (colonIdx > 0) {
      const keyRaw = p.slice(0, colonIdx).trim().replace(/^["']|["']$/g, '');
      const valExpr = p.slice(colonIdx + 1).trim();
      entries.set(keyRaw, valExpr);
    } else if (/^[A-Za-z_$][\w$]*$/.test(p)) {
      entries.set(p, p);
    }
  });
  return entries;
}
