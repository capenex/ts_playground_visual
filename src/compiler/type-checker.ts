/* ================================================================
   Static TypeScript Type Checker & Worker Bridge (src/compiler/type-checker.ts)
   ================================================================ */
import {
  findBalancedParen,
  isIdentStart,
  isWS,
  readIdent,
  skipString,
  skipTemplateExpr,
  splitTopLevel,
  stripInlineCommentSafe,
  RESERVED_WORDS,
} from "./comments";
import { extractBindingNames } from "./instrumenter";
import { isMapLike, isSetLike } from "../viz/memory-graph";
import { say } from "../runtime/event-loop";
import { updateEditorChrome, revealErrorLine } from "../viz/highlight";
import { Diag, Frame, InterfaceSchemaMeta, StepAnim } from "../types";

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
    // Strip nested method bodies `{ ... }` when parsing top-level class/interface fields
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

let _TYPECHECK_CACHE: { src: string | null; strict: boolean | null; diags: Diag[] } = { src: null, strict: null, diags: [] };

export function typecheckTS(src: string, strict = STRICT_TS) {
  extractTsInterfaceMetadata(src);
  if (!strict) return [];
  if (typeof src === 'string' && _TYPECHECK_CACHE.src === src && _TYPECHECK_CACHE.strict === strict) {
    return _TYPECHECK_CACHE.diags.map((d: Diag) => ({ ...d }));
  }
  const diagnostics: Array<{ line: number; code: string; message?: string }> = [];

  interface TypeParamInfo {
    name: string;
    constraint: string | null;
    defaultType: string | null;
  }

  interface PropShapeInfo {
    type: string;
    rawType: string;
    optional: boolean;
  }

  interface VarEnvInfo {
    type: string;
    isConst?: boolean;
    line?: number;
    declaredType?: string;
    literalType?: string | null;
  }

  interface FnSigInfo {
    name: string;
    params: Array<{ name: string; type: string; rawType: string; optional: boolean; isRest?: boolean }>;
    minArgs: number;
    returnType: string;
    rawReturnType: string;
    typeParams: TypeParamInfo[];
    line: number;
    hasValueReturn: boolean;
  }

  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const fns = new Map<string, FnSigInfo>();
  const typeAliases = new Map<string, string>();
  const genericTypeAliases = new Map<string, { typeParams: TypeParamInfo[]; body: string; line: number }>(); // name -> { typeParams, body, line }
  const interfaceTypeParams = new Map<string, TypeParamInfo[]>(); // name -> [{ name, constraint, defaultType }]
  const interfaces = new Map<string, Map<string, PropShapeInfo>>(); // name -> Map<propName, { type, rawType, optional }>
  const classParents = new Map<string, string>(); // className -> parentClassName
  const classImplements = new Map<string, { interfaces: string[]; line: number }>();
  const abstractClasses = new Set<string>();
  const enumsSet = new Set<string>();
  const enumMembers = new Map<string, Set<string>>();
  const enumValueTypes = new Map<string, Set<string>>();
  const env = new Map<string, VarEnvInfo>();
  const activeTypeParams = new Map<string, string>(); // current scope type params -> constraint or 'any'

  const BUILTIN_TS_GLOBALS = new Set([
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

  function splitTopLevelDecl(s: string): string[] {
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

  function parseTypeParams(typeParamStr: string): Array<{ name: string; constraint: string | null; defaultType: string | null }> {
    if (!typeParamStr) return [];
    let inner = typeParamStr.trim();
    if (inner.startsWith('<') && inner.endsWith('>')) inner = inner.slice(1, -1).trim();
    if (!inner) return [];
    const rawItems = splitTopLevelDecl(inner);
    const out: Array<{ name: string; constraint: string | null; defaultType: string | null }> = [];
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

  function substituteTypeParamsInStr(typeStr: string, typeEnv: Map<string, string> | null | undefined): string {
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

  function parseTopLevelConditional(typeStr: string) {
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

  function matchConditionalExtends(checkT: string, extT: string, typeEnv: Map<string, string>, depth: number): { matched: boolean; inferred: Map<string, string> } {
    const inferred = new Map<string, string>();
    const cNorm = evaluateType(checkT, typeEnv, depth + 1);
    const eSubst = substituteTypeParamsInStr(normalizeTsType(extT), typeEnv);

    // 1. Direct `infer U` or `infer U extends Constraint`
    const directInfer = eSubst.match(/^infer\s+([A-Za-z_$][\w$]*)(?:\s+extends\s+([\s\S]+))?$/);
    if (directInfer && directInfer[1]) {
      const varName = directInfer[1];
      if (directInfer[2]) {
        const constraintT = evaluateType(directInfer[2], typeEnv, depth + 1);
        if (!isTypeCompatible(cNorm, constraintT)) return { matched: false, inferred };
      }
      inferred.set(varName, cNorm);
      return { matched: true, inferred };
    }

    // 2. Array pattern: `(infer U)[]`, `infer U[]`, `Array<infer U>`
    const arrInferM = eSubst.match(/^(?:\(\s*infer\s+([A-Za-z_$][\w$]*)\s*\)\[\]|infer\s+([A-Za-z_$][\w$]*)\[\]|(?:Readonly)?Array<\s*infer\s+([A-Za-z_$][\w$]*)\s*>)$/);
    if (arrInferM) {
      const varName = arrInferM[1] || arrInferM[2] || arrInferM[3] || '';
      if (cNorm.endsWith('[]') && splitTopLevelUnion(cNorm).length === 1) {
        let elem = cNorm.slice(0, -2);
        if (elem.startsWith('(') && elem.endsWith(')') && findBalancedParen(elem, 0) === elem.length - 1) {
          elem = elem.slice(1, -1);
        }
        inferred.set(varName, elem);
        return { matched: true, inferred };
      }
      if (cNorm.startsWith('[') && cNorm.endsWith(']')) {
        const parts = splitTopLevelDecl(cNorm.slice(1, -1)).map(s => stripTupleElementLabel(s)).filter(Boolean);
        const unique = Array.from(new Set(parts));
        inferred.set(varName, unique.length ? unique.join('|') : 'never');
        return { matched: true, inferred };
      }
      return { matched: false, inferred };
    }

    // 3. Function pattern: `(...args: infer P) => infer R` or `(a: infer A) => any`
    if (eSubst.startsWith('(') && eSubst.includes('=>')) {
      const closeP = findBalancedParen(eSubst, 0);
      if (closeP > 0 && eSubst.slice(closeP + 1).trim().startsWith('=>')) {
        const eParamStr = eSubst.slice(1, closeP).trim();
        const eRetStr = eSubst.slice(closeP + 1).trim().slice(2).trim();
        if (cNorm.startsWith('(') && cNorm.includes('=>')) {
          const cCloseP = findBalancedParen(cNorm, 0);
          if (cCloseP > 0 && cNorm.slice(cCloseP + 1).trim().startsWith('=>')) {
            const cParamStr = cNorm.slice(1, cCloseP).trim();
            const cRetStr = cNorm.slice(cCloseP + 1).trim().slice(2).trim();
            const retMatch = matchConditionalExtends(cRetStr, eRetStr, typeEnv, depth + 1);
            if (!retMatch.matched) return { matched: false, inferred };
            retMatch.inferred.forEach((v, k) => inferred.set(k, v));

            const restInferM = eParamStr.match(/^\.\.\.[A-Za-z_$][\w$]*\s*:\s*infer\s+([A-Za-z_$][\w$]*)$/);
            if (restInferM && restInferM[1]) {
              const pList = cParamStr ? splitTopLevelDecl(cParamStr).map(p => {
                const colon = p.indexOf(':');
                return colon >= 0 ? evaluateType(p.slice(colon + 1).trim(), typeEnv, depth + 1) : 'any';
              }) : [];
              inferred.set(restInferM[1], `[${pList.join(',')}]`);
              return { matched: true, inferred };
            }
            const eParams = eParamStr ? splitTopLevelDecl(eParamStr) : [];
            const cParams = cParamStr ? splitTopLevelDecl(cParamStr) : [];
            for (let idx = 0; idx < eParams.length; idx++) {
              const ep = (eParams[idx] || '').trim();
              if (ep.startsWith('...')) {
                const eColon = ep.indexOf(':');
                const restType = eColon >= 0 ? ep.slice(eColon + 1).trim() : 'any[]';
                if (restType === 'any' || restType === 'any[]' || restType === 'unknown[]') {
                  break;
                }
                const elemRest = restType.endsWith('[]') ? restType.slice(0, -2) : restType;
                for (let cIdx = idx; cIdx < cParams.length; cIdx++) {
                  const cp = cParams[cIdx] || '';
                  const cColon = cp.indexOf(':');
                  const cpType = cColon >= 0 ? cp.slice(cColon + 1).trim() : cp.trim();
                  const pm = matchConditionalExtends(cpType, elemRest, typeEnv, depth + 1);
                  if (!pm.matched) return { matched: false, inferred };
                  pm.inferred.forEach((v, k) => inferred.set(k, v));
                }
                break;
              }
              const cp = cParams[idx];
              if (!cp) break;
              const eColon = ep.indexOf(':');
              const cColon = cp.indexOf(':');
              const epType = eColon >= 0 ? ep.slice(eColon + 1).trim() : ep.trim();
              const cpType = cColon >= 0 ? cp.slice(cColon + 1).trim() : cp.trim();
              const pm = matchConditionalExtends(cpType, epType, typeEnv, depth + 1);
              if (!pm.matched) return { matched: false, inferred };
              pm.inferred.forEach((v, k) => inferred.set(k, v));
            }
            return { matched: true, inferred };
          }
        }
        return { matched: false, inferred };
      }
    }

    // 4. Tuple pattern: `[infer H, ...infer T]` or `[infer A, infer B]`
    if (eSubst.startsWith('[') && eSubst.endsWith(']')) {
      if (!cNorm.startsWith('[') || !cNorm.endsWith(']')) return { matched: false, inferred };
      const eItems = splitTopLevelDecl(eSubst.slice(1, -1)).map(s => stripTupleElementLabel(s)).filter(Boolean);
      const cItems = splitTopLevelDecl(cNorm.slice(1, -1)).map(s => stripTupleElementLabel(s)).filter(Boolean);
      for (let idx = 0; idx < eItems.length; idx++) {
        const ei = eItems[idx] || '';
        const restInfer = ei.match(/^\.\.\.(?:infer\s+([A-Za-z_$][\w$]*)|([A-Za-z_$][\w$]*))$/);
        if (restInfer) {
          const restVar = restInfer[1];
          const remaining = cItems.slice(idx);
          if (restVar) inferred.set(restVar, `[${remaining.join(',')}]`);
          return { matched: true, inferred };
        }
        if (idx >= cItems.length) return { matched: false, inferred };
        const subM = matchConditionalExtends(cItems[idx] || 'any', ei, typeEnv, depth + 1);
        if (!subM.matched) return { matched: false, inferred };
        subM.inferred.forEach((v, k) => inferred.set(k, v));
      }
      return { matched: cItems.length === eItems.length, inferred };
    }

    // 5. Generic wrapper pattern: `Promise<infer U>`, `Box<infer T>`, `Map<infer K, infer V>`
    const eGenM = eSubst.match(/^([A-Za-z_$][\w$]*)<(.+)>$/);
    if (eGenM && eGenM[2] && /\binfer\s+/.test(eGenM[2])) {
      const cGenM = cNorm.match(/^([A-Za-z_$][\w$]*)<(.+)>$/);
      if (!cGenM || !cGenM[2] || cGenM[1] !== eGenM[1]) return { matched: false, inferred };
      const eArgs = splitTopLevelDecl(eGenM[2]).map(s => s.trim());
      const cArgs = splitTopLevelDecl(cGenM[2]).map(s => s.trim());
      if (eArgs.length !== cArgs.length) return { matched: false, inferred };
      for (let idx = 0; idx < eArgs.length; idx++) {
        const subM = matchConditionalExtends(cArgs[idx] || 'any', eArgs[idx] || 'any', typeEnv, depth + 1);
        if (!subM.matched) return { matched: false, inferred };
        subM.inferred.forEach((v, k) => inferred.set(k, v));
      }
      return { matched: true, inferred };
    }

    // 6. Object shape pattern with `infer`: `{ a: infer U }`
    if (eSubst.startsWith('{') && eSubst.endsWith('}') && /\binfer\s+/.test(eSubst)) {
      const cShape = getInterfaceShape(cNorm);
      const eShape = parseObjectShapeLiteral(eSubst);
      if (!cShape || !eShape) return { matched: false, inferred };
      for (const [k, eProp] of eShape.entries()) {
        if (!cShape.has(k)) return { matched: false, inferred };
        const subM = matchConditionalExtends((cShape.get(k) || { type: 'any' }).type, eProp.rawType || eProp.type, typeEnv, depth + 1);
        if (!subM.matched) return { matched: false, inferred };
        subM.inferred.forEach((v, ik) => inferred.set(ik, v));
      }
      return { matched: true, inferred };
    }

    // 7. Template literal pattern with `infer`: `` `${infer P}_${infer S}` ``
    if (eSubst.startsWith('`') && eSubst.endsWith('`')) {
      const tplBindings = matchTemplateLiteralType(cNorm, eSubst);
      if (tplBindings) {
        tplBindings.forEach((v, k) => inferred.set(k, v));
        return { matched: true, inferred };
      }
      return { matched: false, inferred };
    }

    // 8. Standard type assignability / compatibility check
    const eEval = evaluateType(eSubst, typeEnv, depth + 1);
    return { matched: isTypeCompatible(cNorm, eEval), inferred };
  }

  function resolveIndexedAccess(objT: string, keyT: string, typeEnv: Map<string, string>, depth: number): string {
    if (objT === 'any' || keyT === 'any') return 'any';
    if (keyT === 'never') return 'never';
    const keyParts = splitTopLevelUnion(keyT);
    if (keyParts.length > 1) {
      const out: string[] = [];
      keyParts.forEach(kp => {
        const r = resolveIndexedAccess(objT, kp, typeEnv, depth + 1);
        splitTopLevelUnion(r).forEach(u => { if (u !== 'never' && !out.includes(u)) out.push(u); });
      });
      return out.length ? out.join('|') : 'never';
    }
    if (objT.endsWith('[]') && (keyT === 'number' || /^[+-]?\d+$/.test(keyT))) {
      return objT.slice(0, -2);
    }
    if (objT.startsWith('[') && objT.endsWith(']')) {
      const elems = splitTopLevelDecl(objT.slice(1, -1)).map(s => stripTupleElementLabel(s)).filter(Boolean);
      if (keyT === 'number') {
        return Array.from(new Set(elems)).join('|') || 'never';
      }
      if (/^\d+$/.test(keyT)) {
        const idx = Number(keyT);
        return idx < elems.length ? (elems[idx] || 'undefined') : 'undefined';
      }
    }
    const shape = getInterfaceShape(objT);
    if (shape) {
      const cleanKey = keyT.replace(/^["']|["']$/g, '');
      if (shape.has(cleanKey)) {
        return (shape.get(cleanKey) || { type: 'any' }).type;
      }
      if (shape.has('__index__')) {
        return (shape.get('__index__') || { type: 'any' }).type;
      }
      if (keyT === 'keyof ' + objT) {
        const vals: string[] = [];
        shape.forEach((v: { type: string }, k: string) => { if (k !== '__index__' && !vals.includes(v.type)) vals.push(v.type); });
        return vals.join('|') || 'any';
      }
    }
    if (activeTypeParams.has(objT) || activeTypeParams.has(keyT)) {
      return `${objT}[${keyT}]`;
    }
    return 'any';
  }

  function evaluateType(
    rawType: string | null | undefined,
    typeEnv: Map<string, string> = new Map<string, string>(),
    depth = 0,
    expanding: Set<string> = new Set<string>(),
  ): string {
    if (!rawType || depth > 24) return 'any';
    let t = normalizeTsType(rawType);
    if (!t || t === 'any' || t === 'unknown' || t === 'never' || t === 'void' ||
        t === 'number' || t === 'string' || t === 'boolean' || t === 'null' ||
        t === 'undefined' || t === 'object' || t === 'symbol' || t === 'bigint') {
      return t || 'any';
    }
    if (/^asserts\s+/.test(t)) return 'void';
    if (/^(?:[A-Za-z_$][\w$]*|this)\s+is\s+/.test(t)) return 'boolean';

    // 1. Direct type parameter lookup
    if (typeEnv && typeEnv.has(t)) {
      return typeEnv.get(t) || 'any';
    }

    // 2. Top-level conditional type: `Check extends Ext ? TrueBranch : FalseBranch`
    const cond = parseTopLevelConditional(t);
    if (cond) {
      const rawCheck = cond.checkType.trim();
      const isNakedTypeParam = /^[A-Za-z_$][\w$]*$/.test(rawCheck) && typeEnv && typeEnv.has(rawCheck);
      const resolvedCheck = evaluateType(rawCheck, typeEnv, depth + 1, expanding);
      if (isNakedTypeParam && resolvedCheck === 'never') {
        return 'never';
      }
      const checkUnionParts = isNakedTypeParam ? splitTopLevelUnion(resolvedCheck) : [resolvedCheck];
      if (checkUnionParts.length > 1) {
        const results: string[] = [];
        for (const member of checkUnionParts) {
          const memberEnv = new Map(typeEnv);
          memberEnv.set(rawCheck, member);
          const m = matchConditionalExtends(member, cond.extendsType, memberEnv, depth + 1);
          if (m.matched) {
            m.inferred.forEach((v, k) => memberEnv.set(k, v));
            const branchT = evaluateType(cond.trueType, memberEnv, depth + 1, expanding);
            if (branchT !== 'never') {
              splitTopLevelUnion(branchT).forEach(u => { if (!results.includes(u)) results.push(u); });
            }
          } else {
            const branchF = evaluateType(cond.falseType, memberEnv, depth + 1, expanding);
            if (branchF !== 'never') {
              splitTopLevelUnion(branchF).forEach(u => { if (!results.includes(u)) results.push(u); });
            }
          }
        }
        return results.length === 0 ? 'never' : results.join('|');
      }
      const m = matchConditionalExtends(resolvedCheck, cond.extendsType, typeEnv, depth + 1);
      if (m.matched) {
        const trueEnv = new Map(typeEnv);
        m.inferred.forEach((v, k) => trueEnv.set(k, v));
        return evaluateType(cond.trueType, trueEnv, depth + 1, expanding);
      } else {
        return evaluateType(cond.falseType, typeEnv, depth + 1, expanding);
      }
    }

    // 3. Top-level union `A | B`
    const unionParts = splitTopLevelUnion(t);
    if (unionParts.length > 1) {
      const evaled: string[] = [];
      unionParts.forEach(part => {
        const r = evaluateType(part, typeEnv, depth + 1, expanding);
        splitTopLevelUnion(r).forEach(u => {
          if (u !== 'never' && !evaled.includes(u)) evaled.push(u);
        });
      });
      return evaled.length === 0 ? 'never' : evaled.join('|');
    }

    // 4. Top-level intersection `A & B`
    const interParts = splitTopLevelIntersection(t);
    if (interParts.length > 1) {
      const evaled = interParts.map(p => evaluateType(p, typeEnv, depth + 1, expanding));
      if (evaled.includes('never')) return 'never';
      if (evaled.length === 2 && evaled[1] === '{}') {
        return stripNullableFromType(stripNullableFromType(evaled[0], 'null'), 'undefined');
      }
      // Simplify intersections like `string & "dark"` -> `"dark"`
      const simplified = evaled.filter((p, idx) =>
        !evaled.some((q, qIdx) => {
          if (qIdx === idx) return false;
          if (p === q) return qIdx < idx;
          const qUnion = splitTopLevelUnion(q);
          return qUnion.length > 0 && qUnion.every(qm => isLiteralOfPrimitive(qm, p));
        })
      );
      if (simplified.length === 1 && simplified[0]) {
        return simplified[0];
      }
      const mergedProps = new Map<string, PropShapeInfo>();
      let allShapes = true;
      for (const ep of simplified) {
        const sh = getInterfaceShape(ep);
        if (!sh) { allShapes = false; break; }
        sh.forEach((v, k) => mergedProps.set(k, v));
      }
      if (allShapes && mergedProps.size > 0) {
        const propStrs: string[] = [];
        mergedProps.forEach((v, k) => {
          if (k === '__index__') propStrs.push(`[k: string]:${v.type}`);
          else propStrs.push(`${k}${v.optional ? '?' : ''}:${v.type}`);
        });
        return `{${propStrs.join(';')}}`;
      }
      return simplified.join('&');
    }

    // 5. `keyof T`
    if (t.startsWith('keyof ')) {
      const target = evaluateType(t.slice(6).trim(), typeEnv, depth + 1, expanding);
      if (target === 'any') return 'string|number|symbol';
      const shape = getInterfaceShape(target);
      if (shape) {
        const keys = Array.from(shape.keys()).filter(k => k !== '__index__' && !k.startsWith('[')).map(k => `"${k}"`);
        if (keys.length) return keys.join('|');
        if (shape.has('__index__')) return 'string';
        return 'never';
      }
      if (target.startsWith('Record<')) {
        const recArgs = splitTopLevelDecl(target.slice(7, -1));
        if (recArgs.length >= 1) return evaluateType(recArgs[0], typeEnv, depth + 1, expanding);
      }
      return 'string';
    }

    // 6. `typeof varName`
    if (t.startsWith('typeof ')) {
      const exprName = t.slice(7).trim();
      if (env.has(exprName)) return (env.get(exprName) || { type: 'any' }).type;
      const sig = fns.get(exprName);
      if (sig) {
        const pStr = sig.params.map((p: { name: string; optional?: boolean; type: string }) => `${p.name}${p.optional ? '?' : ''}:${p.type}`).join(',');
        return `(${pStr})=>${sig.returnType}`;
      }
      return 'any';
    }

    // 7. Mapped Type: `{ [K in Union as Remap]?: ValueType }`
    if (t.startsWith('{') && t.endsWith('}')) {
      const inner = t.slice(1, -1).trim().replace(/;$/, '').trim();
      const mappedM = inner.match(/^(?:(?:\+|-)?readonly\s*)?\[\s*([A-Za-z_$][\w$]*)\s+in\s+([\s\S]+?)\s*\]([+\-]?)\?\s*:\s*([\s\S]+)$/) ||
                      inner.match(/^(?:(?:\+|-)?readonly\s*)?\[\s*([A-Za-z_$][\w$]*)\s+in\s+([\s\S]+?)\s*\]\s*:\s*([\s\S]+)$/);
      if (mappedM && mappedM[1] && mappedM[2]) {
        const kVar = mappedM[1];
        let inClause = mappedM[2].trim();
        let optMod: 'add' | 'remove' | null = null;
        let valTemplate = '';
        if (mappedM.length === 5) {
          optMod = mappedM[3] === '-' ? 'remove' : 'add';
          valTemplate = (mappedM[4] || '').trim();
        } else {
          valTemplate = (mappedM[3] || '').trim();
        }
        let asClause: string | null = null;
        let d = 0, ad = 0;
        for (let i = 0; i < inClause.length; i++) {
          const ch = inClause[i];
          if (ch === '"' || ch === "'" || ch === '`') { i = skipString(inClause, i) - 1; continue; }
          if (ch === '(' || ch === '[' || ch === '{') d++;
          else if (ch === ')' || ch === ']' || ch === '}') d = Math.max(0, d - 1);
          else if (ch === '<') ad++;
          else if (ch === '>' && inClause[i - 1] !== '=') ad = Math.max(0, ad - 1);
          else if (d === 0 && ad === 0) {
            const asM = inClause.slice(i).match(/^\s+as(?:\s+|(?=[`"']))/);
            if (asM) {
              asClause = inClause.slice(i + asM[0].length).trim();
              inClause = inClause.slice(0, i).trim();
              break;
            }
          }
        }
        let sourceObjShape: Map<string, { type: string; rawType: string; optional: boolean }> | null = null;
        const keyofM = inClause.match(/^keyof\s+([\s\S]+)$/);
        if (keyofM && keyofM[1]) {
          const srcT = evaluateType(keyofM[1].trim(), typeEnv, depth + 1, expanding);
          sourceObjShape = getInterfaceShape(srcT);
        }
        const keysUnion = evaluateType(inClause, typeEnv, depth + 1, expanding);
        const keyItems = splitTopLevelUnion(keysUnion).filter(k => k !== 'never');
        const outProps: string[] = [];
        for (const rawKey of keyItems) {
          if (rawKey === 'string' || rawKey === 'number' || rawKey === 'symbol') continue;
          const mapEnv = new Map(typeEnv);
          const litKey = (rawKey.startsWith('"') && rawKey.endsWith('"')) ? rawKey : `"${rawKey.replace(/^["']|["']$/g, '')}"`;
          mapEnv.set(kVar, litKey);
          let finalKeyName = litKey.slice(1, -1);
          if (asClause) {
            const remapped = evaluateType(asClause, mapEnv, depth + 1, expanding);
            if (remapped === 'never') continue;
            finalKeyName = remapped.replace(/^["']|["']$/g, '');
          }
          const propValType = evaluateType(valTemplate, mapEnv, depth + 1, expanding);
          let isOpt = false;
          const srcProp = sourceObjShape ? sourceObjShape.get(litKey.slice(1, -1)) : undefined;
          if (srcProp) {
            isOpt = Boolean(srcProp.optional);
          }
          if (optMod === 'add') isOpt = true;
          else if (optMod === 'remove') isOpt = false;
          outProps.push(`${finalKeyName}${isOpt ? '?' : ''}:${propValType}`);
        }
        return `{${outProps.join(';')}}`;
      }
      // Regular object type literal: substitute type params inside property value types
      if (typeEnv && typeEnv.size > 0) {
        return substituteTypeParamsInStr(t, typeEnv);
      }
      return t;
    }

    // 8. Template literal type evaluation (e.g. `` `get_${Capitalize<K>}` ``)
    if (t.startsWith('`') && t.endsWith('`')) {
      const body = t.slice(1, -1);
      let out = '';
      let i = 0;
      while (i < body.length) {
        if (body[i] === '$' && body[i + 1] === '{') {
          const end = body.indexOf('}', i + 2);
          if (end > i) {
            const innerExpr = body.slice(i + 2, end).trim();
            const ev = evaluateType(innerExpr, typeEnv, depth + 1, expanding);
            if (ev.startsWith('"') && ev.endsWith('"')) {
              out += ev.slice(1, -1);
            } else {
              out += `\${${ev}}`;
            }
            i = end + 1;
            continue;
          }
        }
        out += body[i++];
      }
      return out.includes('${') ? `\`${out}\`` : `"${out}"`;
    }

    // 9. Array type suffix `T[]`
    if (t.endsWith('[]')) {
      const elemRaw = t.slice(0, -2);
      const elemEval = evaluateType(elemRaw, typeEnv, depth + 1, expanding);
      if (elemEval.includes('|') || elemEval.includes('&') || elemEval.includes('=>')) {
        return `(${elemEval})[]`;
      }
      return `${elemEval}[]`;
    }

    // 10. Tuple type `[A, B]` or labeled tuple `[name: string, age?: number, ...rest: boolean[]]`
    if (t.startsWith('[') && t.endsWith(']')) {
      const elems = splitTopLevelDecl(t.slice(1, -1)).map(rawE => {
        const stripped = stripTupleElementLabel(rawE);
        const isRest = stripped.startsWith('...');
        const isOpt = !isRest && stripped.endsWith('?');
        const core = isRest ? stripped.slice(3).trim() : (isOpt ? stripped.slice(0, -1).trim() : stripped);
        const ev = evaluateType(core, typeEnv, depth + 1, expanding);
        return `${isRest ? '...' : ''}${ev}${isOpt ? '?' : ''}`;
      });
      return `[${elems.join(',')}]`;
    }

    // 11. Indexed access type `T[K]` (e.g. `User["id"]`, `T[K]`, `Arr[number]`)
    if (t.endsWith(']') && !t.startsWith('[')) {
      let openB = -1, d = 0;
      for (let i = t.length - 1; i >= 0; i--) {
        if (t[i] === ']') d++;
        else if (t[i] === '[') {
          d--;
          if (d === 0) { openB = i; break; }
        }
      }
      if (openB > 0) {
        const objPart = t.slice(0, openB).trim();
        const keyPart = t.slice(openB + 1, -1).trim();
        if (keyPart) {
          const objEval = evaluateType(objPart, typeEnv, depth + 1, expanding);
          const keyEval = evaluateType(keyPart, typeEnv, depth + 1, expanding);
          return resolveIndexedAccess(objEval, keyEval, typeEnv, depth + 1);
        }
      }
    }

    // 12. Generic instantiation: `Name<Arg1, Arg2>` (Built-in utility types + user generic type aliases + generic interfaces/classes)
    const genM = t.match(/^([A-Za-z_$][\w$]*)<([\s\S]+)>$/);
    if (genM && genM[1] && genM[2]) {
      const baseName = genM[1];
      const rawArgs = splitTopLevelDecl(genM[2]).map(a => evaluateType(a.trim(), typeEnv, depth + 1, expanding));
      const arg0 = rawArgs[0] || 'any';
      const arg1 = rawArgs[1] || 'any';

      if (baseName === 'Array' || baseName === 'ReadonlyArray') {
        const elem = arg0;
        return elem.includes('|') ? `(${elem})[]` : `${elem}[]`;
      }
      if (baseName === 'Partial' && rawArgs.length === 1) {
        const shape = getInterfaceShape(arg0);
        if (shape) {
          const props: string[] = [];
          shape.forEach((v, k) => {
            if (k === '__index__') props.push(`[k: string]:${v.type}`);
            else props.push(`${k}?:${v.type}`);
          });
          return `{${props.join(';')}}`;
        }
      }
      if (baseName === 'Required' && rawArgs.length === 1) {
        const shape = getInterfaceShape(arg0);
        if (shape) {
          const props: string[] = [];
          shape.forEach((v, k) => {
            if (k === '__index__') props.push(`[k: string]:${v.type}`);
            else props.push(`${k}:${v.type}`);
          });
          return `{${props.join(';')}}`;
        }
      }
      if (baseName === 'Readonly' && rawArgs.length === 1) {
        if (arg0.endsWith('[]')) return arg0;
        const shape = getInterfaceShape(arg0);
        if (shape) {
          const props: string[] = [];
          shape.forEach((v, k) => {
            if (k === '__index__') props.push(`[k: string]:${v.type}`);
            else props.push(`${k}${v.optional ? '?' : ''}:${v.type}`);
          });
          return `{${props.join(';')}}`;
        }
        return arg0;
      }
      if (baseName === 'Pick' && rawArgs.length === 2) {
        const shape = getInterfaceShape(arg0);
        if (shape) {
          const keys = new Set(splitTopLevelUnion(arg1).map(k => k.replace(/^["']|["']$/g, '')));
          const props: string[] = [];
          shape.forEach((v, k) => {
            if (keys.has(k)) props.push(`${k}${v.optional ? '?' : ''}:${v.type}`);
          });
          return `{${props.join(';')}}`;
        }
      }
      if (baseName === 'Omit' && rawArgs.length === 2) {
        const shape = getInterfaceShape(arg0);
        if (shape) {
          const omitKeys = new Set(splitTopLevelUnion(arg1).map(k => k.replace(/^["']|["']$/g, '')));
          const props: string[] = [];
          shape.forEach((v, k) => {
            if (!omitKeys.has(k) && k !== '__index__') props.push(`${k}${v.optional ? '?' : ''}:${v.type}`);
          });
          return `{${props.join(';')}}`;
        }
      }
      if (baseName === 'Record' && rawArgs.length === 2) {
        const keyParts = splitTopLevelUnion(arg0);
        const valT = arg1;
        const allLiteralKeys = keyParts.length > 0 && keyParts.every(k => (k.startsWith('"') && k.endsWith('"')) || /^[A-Za-z_$][\w$]*$/.test(k) && k !== 'string' && k !== 'number' && k !== 'symbol');
        if (allLiteralKeys) {
          const props = keyParts.map(k => `${k.replace(/^["']|["']$/g, '')}:${valT}`);
          return `{${props.join(';')}}`;
        }
        return `Record<${arg0},${valT}>`;
      }
      if (baseName === 'Exclude' && rawArgs.length === 2) {
        const uParts = splitTopLevelUnion(arg0);
        const excl = arg1;
        const kept = uParts.filter(p => !isTypeCompatible(p, excl));
        return kept.length ? kept.join('|') : 'never';
      }
      if (baseName === 'Extract' && rawArgs.length === 2) {
        const uParts = splitTopLevelUnion(arg0);
        const target = arg1;
        const kept = uParts.filter(p => isTypeCompatible(p, target));
        return kept.length ? kept.join('|') : 'never';
      }
      if (baseName === 'NonNullable' && rawArgs.length === 1) {
        const uParts = splitTopLevelUnion(arg0).filter(p => p !== 'null' && p !== 'undefined' && p !== 'void');
        return uParts.length ? uParts.join('|') : 'never';
      }
      if (baseName === 'ReturnType' && rawArgs.length === 1) {
        const fnT = arg0;
        const arrowIdx = fnT.lastIndexOf('=>');
        if (arrowIdx > 0) return evaluateType(fnT.slice(arrowIdx + 2).trim(), typeEnv, depth + 1, expanding);
        return 'any';
      }
      if (baseName === 'Parameters' && rawArgs.length === 1) {
        const fnT = arg0;
        if (fnT.startsWith('(')) {
          const closeP = findBalancedParen(fnT, 0);
          if (closeP > 0) {
            const pInner = fnT.slice(1, closeP).trim();
            const pTypes = pInner ? splitTopLevelDecl(pInner).map(p => {
              const colon = p.indexOf(':');
              return colon >= 0 ? evaluateType(p.slice(colon + 1).trim(), typeEnv, depth + 1, expanding) : 'any';
            }) : [];
            return `[${pTypes.join(',')}]`;
          }
        }
        return 'any[]';
      }
      if (baseName === 'Awaited' && rawArgs.length === 1) {
        let cur = arg0;
        let guard = 0;
        while (guard++ < 8) {
          const pm = cur.match(/^Promise<(.+)>$/);
          if (pm && pm[1]) cur = evaluateType(pm[1], typeEnv, depth + 1, expanding);
          else break;
        }
        return cur;
      }
      if ((baseName === 'Uppercase' || baseName === 'Lowercase' || baseName === 'Capitalize' || baseName === 'Uncapitalize') && rawArgs.length === 1) {
        const sArg = arg0;
        if (sArg.startsWith('"') && sArg.endsWith('"')) {
          const inner = sArg.slice(1, -1);
          if (baseName === 'Uppercase') return `"${inner.toUpperCase()}"`;
          if (baseName === 'Lowercase') return `"${inner.toLowerCase()}"`;
          if (baseName === 'Capitalize') return `"${inner.charAt(0).toUpperCase() + inner.slice(1)}"`;
          if (baseName === 'Uncapitalize') return `"${inner.charAt(0).toLowerCase() + inner.slice(1)}"`;
        }
        return 'string';
      }

      if (genericTypeAliases.has(baseName)) {
        if (expanding.has(baseName)) return `${baseName}<${rawArgs.join(',')}>`;
        const info = genericTypeAliases.get(baseName);
        if (info) {
          const subEnv = new Map(typeEnv);
          const nextExp = new Set(expanding);
          nextExp.add(baseName);
          info.typeParams.forEach((tp: { name: string; defaultType?: string | null }, idx: number) => {
            const argVal = rawArgs[idx] ?? (tp.defaultType ? evaluateType(tp.defaultType, subEnv, depth + 1, nextExp) : 'any');
            subEnv.set(tp.name, argVal);
          });
          return evaluateType(info.body, subEnv, depth + 1, nextExp);
        }
      }

      return `${baseName}<${rawArgs.join(',')}>`;
    }

    // 13. Non-generic type alias lookup (with recursive cycle guard)
    if (typeAliases.has(t)) {
      if (expanding.has(t)) return t;
      const nextExp = new Set(expanding);
      nextExp.add(t);
      return evaluateType(typeAliases.get(t), typeEnv, depth + 1, nextExp);
    }

    // 14. Function type `(a: T) => R` with active typeEnv substitution
    if (t.startsWith('(') && t.includes('=>') && typeEnv && typeEnv.size > 0) {
      return normalizeTsType(substituteTypeParamsInStr(t, typeEnv));
    }

    return t;
  }

  function resolveAlias(t: string | null | undefined, typeEnv: Map<string, string> = activeTypeParams): string {
    return evaluateType(t, typeEnv, 0);
  }

  function parseObjectShapeLiteral(typeBody: string, typeEnv: Map<string, string> = activeTypeParams): Map<string, PropShapeInfo> {
    const inner = typeBody.trim().replace(/^\{/, '').replace(/\}$/, '').trim();
    const propMap = new Map<string, PropShapeInfo>();
    if (!inner) return propMap;
    const members: string[] = [];
    let d = 0, ad = 0, cur = '';
    for (let i = 0; i < inner.length; i++) {
      const ch = inner[i];
      if (ch === '"' || ch === "'" || ch === '`') {
        const end = skipString(inner, i);
        cur += inner.slice(i, end);
        i = end - 1;
        continue;
      }
      if (ch === '(' || ch === '[' || ch === '{') d++;
      else if (ch === ')' || ch === ']' || ch === '}') d = Math.max(0, d - 1);
      else if (ch === '<') ad++;
      else if (ch === '>' && inner[i - 1] !== '=') ad = Math.max(0, ad - 1);
      if ((ch === ';' || ch === ',') && d === 0 && ad === 0) {
        if (cur.trim()) members.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    if (cur.trim()) members.push(cur.trim());
    members.forEach(mem => {
      const cleaned = mem.replace(/^(?:readonly|public|private|protected|static)\s+/, '');
      const idxM = cleaned.match(/^\[\s*[A-Za-z_$][\w$]*\s*:\s*(?:string|number|symbol|any)\s*\]\s*:\s*([\s\S]+)$/);
      if (idxM && idxM[1]) {
        const rawT = idxM[1].trim();
        propMap.set('__index__', { type: evaluateType(rawT, typeEnv), rawType: rawT, optional: true });
        return;
      }
      const compM = cleaned.match(/^\[\s*([A-Za-z_$][\w$]*)\s*\](\?)?\s*:\s*([\s\S]+)$/);
      if (compM && compM[1] && compM[3]) {
        const rawT = compM[3].trim();
        propMap.set(`[${compM[1]}]`, { type: evaluateType(rawT, typeEnv), rawType: rawT, optional: Boolean(compM[2]) });
        propMap.set('__index__', { type: evaluateType(rawT, typeEnv), rawType: rawT, optional: true });
        return;
      }
      const methM = cleaned.match(/^([A-Za-z_$][\w$]*)(\?)?\s*\(([^)]*)\)\s*:\s*([\s\S]+)$/);
      if (methM && methM[1] && methM[4]) {
        const rawRet = methM[4].trim();
        const fnT = `(${(methM[3] || '').trim()})=>${evaluateType(rawRet, typeEnv)}`;
        propMap.set(methM[1], { type: fnT, rawType: fnT, optional: Boolean(methM[2]) });
        return;
      }
      const m = cleaned.match(/^([A-Za-z_$][\w$]*)(\?)?\s*:\s*([\s\S]+)$/);
      if (m && m[1] && m[3]) {
        const rawT = m[3].trim();
        propMap.set(m[1], { type: evaluateType(rawT, typeEnv), rawType: rawT, optional: Boolean(m[2]) });
      }
    });
    return propMap;
  }

  function getInterfaceShape(typeName: string | null | undefined): Map<string, PropShapeInfo> | null {
    if (!typeName) return null;
    const resolved = evaluateType(typeName, activeTypeParams);
    if (resolved.startsWith('{') && resolved.endsWith('}')) {
      return parseObjectShapeLiteral(resolved);
    }
    const genM = resolved.match(/^([A-Za-z_$][\w$]*)<([\s\S]+)>$/);
    const baseName = (genM && genM[1]) ? genM[1] : resolved;
    const typeArgs = (genM && genM[2]) ? splitTopLevelDecl(genM[2]).map(a => evaluateType(a.trim(), activeTypeParams)) : [];
    const direct = interfaces.get(resolved) || interfaces.get(baseName);
    if (direct) {
      const merged = new Map<string, PropShapeInfo>();
      if (classParents.has(resolved) || classParents.has(baseName)) {
        let p = classParents.get(resolved) || classParents.get(baseName);
        const visited = new Set([resolved, baseName]);
        while (p && !visited.has(p)) {
          visited.add(p);
          const pShape = interfaces.get(p);
          if (pShape) pShape.forEach((v: PropShapeInfo, k: string) => { if (!merged.has(k)) merged.set(k, { ...v }); });
          p = classParents.get(p);
        }
      }
      direct.forEach((v: PropShapeInfo, k: string) => merged.set(k, { ...v }));
      const tParams = interfaceTypeParams.get(baseName);
      if (tParams && tParams.length > 0 && typeArgs.length > 0) {
        const subEnv = new Map(activeTypeParams);
        tParams.forEach((tp: { name: string; defaultType?: string | null }, idx: number) => {
          subEnv.set(tp.name, typeArgs[idx] ?? (tp.defaultType ? evaluateType(tp.defaultType, subEnv) : 'any'));
        });
        const instantiated = new Map<string, PropShapeInfo>();
        merged.forEach((v, k) => {
          instantiated.set(k, {
            ...v,
            type: evaluateType(v.rawType || v.type, subEnv),
          });
        });
        return instantiated;
      }
      return merged;
    }
    return null;
  }

  function getClassMethodSig(className: string, methodName: string): FnSigInfo | null {
    const resolved = evaluateType(className, activeTypeParams);
    const genM = resolved.match(/^([A-Za-z_$][\w$]*)<([\s\S]+)>$/);
    let cur: string | undefined = (genM && genM[1]) ? genM[1] : resolved;
    const typeArgs = (genM && genM[2]) ? splitTopLevelDecl(genM[2]).map(a => evaluateType(a.trim(), activeTypeParams)) : [];
    const tParams = interfaceTypeParams.get(cur);
    const classEnv = new Map(activeTypeParams);
    if (tParams && tParams.length > 0 && typeArgs.length > 0) {
      tParams.forEach((tp: { name: string; defaultType?: string | null }, idx: number) => {
        classEnv.set(tp.name, typeArgs[idx] ?? (tp.defaultType ? evaluateType(tp.defaultType, classEnv) : 'any'));
      });
    }
    const visited = new Set<string>();
    while (cur && !visited.has(cur)) {
      visited.add(cur);
      const key = cur + '.' + methodName;
      const rawSig = fns.get(key);
      if (rawSig) {
        if (classEnv.size === 0) return rawSig;
        return {
          ...rawSig,
          params: rawSig.params.map((p: { name: string; type: string; rawType: string; optional: boolean; isRest?: boolean }) => ({
            ...p,
            type: evaluateType(p.rawType || p.type, classEnv),
            rawType: substituteTypeParamsInStr(p.rawType || p.type, classEnv),
          })),
          returnType: evaluateType(rawSig.rawReturnType || rawSig.returnType, classEnv),
          rawReturnType: substituteTypeParamsInStr(rawSig.rawReturnType || rawSig.returnType, classEnv),
        };
      }
      cur = classParents.get(cur);
    }
    return null;
  }

  function inferLiteralType(expr: string | null | undefined): string | null {
    if (!expr) return null;
    const s = expr.trim();
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
      return '"' + s.slice(1, -1).replace(/"/g, '\\"') + '"';
    }
    if (/^[+-]?\d+(?:\.\d+)?$/.test(s)) return s;
    if (s === 'true' || s === 'false') return s;
    return null;
  }

  function isTypeCompatible(
    actualType: string | null | undefined,
    expectedType: string | null | undefined,
    seenPairs: Set<string> = new Set<string>(),
  ): boolean {
    if (!actualType || !expectedType) return true;
    const a = evaluateType(actualType, activeTypeParams);
    const e = evaluateType(expectedType, activeTypeParams);
    const pairKey = `${a}==>${e}`;
    if (seenPairs.has(pairKey)) return true;
    const nextSeen = new Set(seenPairs);
    nextSeen.add(pairKey);

    const knownNominals = getKnownNominalTypes();
    if (isTsAssignable(a, e, knownNominals)) return true;

    if (e === 'object') {
      if ((a.startsWith('{') && a.endsWith('}')) || a.endsWith('[]') || (a.startsWith('[') && a.endsWith(']')) || a.includes('=>') || interfaces.has(a) || a.startsWith('Record<') || a.startsWith('Map<') || a.startsWith('Set<')) {
        return true;
      }
      return false;
    }

    // Enum assignability check: numeric enums accept numbers; string enums only accept the enum itself
    if (enumsSet.has(e)) {
      if (a === e || a.startsWith(e + '.')) return true;
      const vTypes = enumValueTypes.get(e);
      if (vTypes && vTypes.has('number') && !vTypes.has('string')) {
        if (a === 'number' || /^[+-]?\d+(?:\.\d+)?$/.test(a)) return true;
      }
      return false;
    }

    // Union splitting with full recursive compatibility (handles recursive type aliases & interfaces)
    const eParts = splitTopLevelUnion(e);
    if (eParts.length > 1) {
      const aParts = splitTopLevelUnion(a);
      if (aParts.length > 1) {
        return aParts.every(ap => eParts.some(ep => isTypeCompatible(ap, ep, nextSeen)));
      }
      return eParts.some(ep => isTypeCompatible(a, ep, nextSeen));
    }
    const aParts = splitTopLevelUnion(a);
    if (aParts.length > 1) {
      return aParts.every(ap => isTypeCompatible(ap, e, nextSeen));
    }

    // Array / tuple recursive compatibility (e.g. `Json[]` inside `Json`)
    const aParenArr = a.match(/^\((.+)\)\[\]$/);
    const eParenArr = e.match(/^\((.+)\)\[\]$/);
    if ((aParenArr || a.endsWith('[]')) && (eParenArr || e.endsWith('[]'))) {
      const elemA = aParenArr ? aParenArr[1] : a.slice(0, -2);
      const elemE = eParenArr ? eParenArr[1] : e.slice(0, -2);
      return isTypeCompatible(elemA, elemE, nextSeen);
    }

    const recM = e.match(/^Record<([^,]+),([\s\S]+)>$/);
    if (recM && recM[2]) {
      const valExpected = recM[2].trim();
      const aShape = getInterfaceShape(a);
      if (aShape) {
        for (const [, propInfo] of aShape.entries()) {
          if (!isTypeCompatible(propInfo.type, valExpected, nextSeen)) return false;
        }
        return true;
      }
    }
    const eShape = getInterfaceShape(e);
    if (eShape) {
      if (e === 'object' || e === '{}') return !['number', 'string', 'boolean', 'null', 'undefined', 'void', 'unknown'].includes(a);
      if (a === 'string' || a.startsWith('"')) {
        if (eShape.size === 1 && eShape.has('length') && (eShape.get('length') || { type: '' }).type === 'number') return true;
      }
      if (a.endsWith('[]') || (a.startsWith('[') && a.endsWith(']'))) {
        if (eShape.size === 1 && eShape.has('length') && (eShape.get('length') || { type: '' }).type === 'number') return true;
      }
      const aShape = getInterfaceShape(a);
      if (aShape) {
        const indexExpected = eShape.has('__index__') ? (eShape.get('__index__') || { type: 'any' }).type : null;
        for (const [propName, propInfo] of eShape.entries()) {
          if (propName === '__index__') continue;
          if (!aShape.has(propName)) {
            if (!propInfo.optional) return false;
          } else {
            const actualPropT = (aShape.get(propName) || { type: 'any' }).type;
            if (!isTypeCompatible(actualPropT, propInfo.type, nextSeen)) return false;
          }
        }
        if (indexExpected) {
          for (const [aPropName, aPropInfo] of aShape.entries()) {
            if (aPropName === '__index__') continue;
            if (!eShape.has(aPropName) && !isTypeCompatible(aPropInfo.type, indexExpected, nextSeen)) {
              return false;
            }
          }
        }
        return true;
      }
    }
    return false;
  }

  function isExpressionAssignable(expr: string | null | undefined, actualType: string, expectedType: string, lineNum: number): boolean {
    const e = evaluateType(expectedType, activeTypeParams);
    const a = evaluateType(actualType, activeTypeParams);
    if (isTypeCompatible(a, e)) return true;
    const litT = inferLiteralType(expr);
    if (litT && isTypeCompatible(litT, e)) return true;
    const trimmedExpr = expr ? expr.trim() : '';
    if (trimmedExpr.startsWith('[') && trimmedExpr.endsWith(']')) {
      const eParts = splitTopLevelUnion(e);
      for (const ep of eParts) {
        if (ep.startsWith('[') && ep.endsWith(']')) {
          const tupleTypes = splitTopLevelDecl(ep.slice(1, -1)).map(s => stripTupleElementLabel(s)).filter(Boolean);
          const elemExprs = splitTopLevel(trimmedExpr.slice(1, -1)).map(s => s.trim()).filter(Boolean);
          const restIdx = tupleTypes.findIndex(t => t.startsWith('...'));
          const minRequired = tupleTypes.filter(t => !t.startsWith('...') && !t.endsWith('?')).length;
          const maxAllowed = restIdx >= 0 ? Infinity : tupleTypes.length;
          if (elemExprs.length >= minRequired && elemExprs.length <= maxAllowed) {
            const allMatch = elemExprs.every((el, idx) => {
              let targetT = 'any';
              const restElem = restIdx >= 0 ? tupleTypes[restIdx] : undefined;
              if (restIdx >= 0 && idx >= restIdx && restElem) {
                const rawRest = restElem.slice(3).trim();
                targetT = rawRest.endsWith('[]') ? rawRest.slice(0, -2) : rawRest;
              } else if (idx < tupleTypes.length) {
                const rawElem = tupleTypes[idx] || 'any';
                targetT = rawElem.endsWith('?') ? rawElem.slice(0, -1).trim() : rawElem;
              }
              return isExpressionAssignable(el, inferType(el, lineNum), targetT, lineNum);
            });
            if (allMatch) return true;
          }
        } else if (ep.endsWith('[]')) {
          const elemExpected = ep.slice(0, -2).replace(/^\((.+)\)$/, '$1');
          const elemExprs = splitTopLevel(trimmedExpr.slice(1, -1)).map(s => s.trim()).filter(Boolean);
          if (elemExprs.every(el => isExpressionAssignable(el, inferType(el, lineNum), elemExpected, lineNum))) {
            return true;
          }
        }
      }
    }
    if (trimmedExpr.startsWith('{') && trimmedExpr.endsWith('}')) {
      const eParts = splitTopLevelUnion(e);
      for (const ep of eParts) {
        const shape = getInterfaceShape(ep);
        const entries = parseObjectLiteralEntries(trimmedExpr);
        if (shape && entries) {
          let ok = true;
          shape.forEach((propInfo, propName) => {
            if (propName !== '__index__' && !propInfo.optional && !entries.has(propName)) ok = false;
          });
          if (ok) {
            entries.forEach((valExpr, propName) => {
              const expPropT = shape.has(propName)
                ? (shape.get(propName) || { type: 'any' }).type
                : (shape.has('__index__') ? (shape.get('__index__') || { type: 'any' }).type : null);
              if (!expPropT && !propName.startsWith('[')) {
                ok = false;
              } else if (expPropT && !isExpressionAssignable(valExpr, inferType(valExpr, lineNum), expPropT, lineNum)) {
                ok = false;
              }
            });
          }
          if (ok) return true;
        }
      }
    }
    return false;
  }

  function parseObjectLiteralEntries(expr: string): Map<string, string> | null {
    const s = expr.trim();
    if (!s.startsWith('{') || !s.endsWith('}') || findBalancedParen(s, 0) !== s.length - 1) return null;
    const inner = s.slice(1, -1).trim();
    const entries = new Map<string, string>();
    if (!inner) return entries;
    const parts = splitTopLevel(inner);
    parts.forEach(part => {
      const p = part.trim();
      if (!p) return;
      // Handle getter / method inside object literal: `get double(): number { return 2; }` or `foo(): number { return 1; }`
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

  function checkObjectLiteralAgainstShape(objExpr: string, expectedType: string, lineNum: number, contextDesc: string): boolean {
    const nonNullExpected = stripNullableFromType(stripNullableFromType(evaluateType(expectedType, activeTypeParams), 'null'), 'undefined');
    const shape = getInterfaceShape(nonNullExpected) || getInterfaceShape(expectedType);
    const entries = parseObjectLiteralEntries(objExpr);
    if (!shape || !entries) return false;
    const indexProp = shape.get('__index__');

    // 1. Check required properties exist
    shape.forEach((propInfo, propName) => {
      if (propName === '__index__' || propName.startsWith('[')) return;
      if (!propInfo.optional && !entries.has(propName)) {
        addDiag(lineNum, 'TS2741', `类型中缺少属性 "${propName}"，但类型 "${expectedType}" 中需要该属性 (${contextDesc})`);
      }
    });

    // 2. Check each provided property exists on shape and matches type
    entries.forEach((valExpr, propName) => {
      const valT = inferType(valExpr, lineNum);
      if (propName.startsWith('[') && propName.endsWith(']')) {
        const keyExpr = propName.slice(1, -1).trim();
        inferType(keyExpr, lineNum);
        const targetProp = shape.get(propName) || indexProp;
        if (targetProp && valT !== 'any' && !isExpressionAssignable(valExpr, valT, targetProp.type, lineNum)) {
          addDiag(lineNum, 'TS2322', `属性 "${propName}" 的类型 "${valT}" 不能分配给类型 "${targetProp.type}" (${contextDesc})`);
        }
        return;
      }
      if (!shape.has(propName)) {
        if (indexProp) {
          const expectedPropT = indexProp.type;
          if (valExpr.trim().startsWith('{') && getInterfaceShape(expectedPropT)) {
            checkObjectLiteralAgainstShape(valExpr, expectedPropT, lineNum, `属性 "${propName}"`);
          } else if (valT !== 'any' && !isExpressionAssignable(valExpr, valT, expectedPropT, lineNum)) {
            addDiag(lineNum, 'TS2322', `属性 "${propName}" 的类型 "${valT}" 不能分配给索引签名类型 "${expectedPropT}" (${contextDesc})`);
          }
        } else {
          addDiag(lineNum, 'TS2353', `对象字面量只能指定已知属性，并且 "${propName}" 不存在于类型 "${expectedType}" 中 (${contextDesc})`);
        }
      } else {
        const expectedPropT = (shape.get(propName) || { type: 'any' }).type;
        const nonNullPropT = stripNullableFromType(stripNullableFromType(evaluateType(expectedPropT, activeTypeParams), 'null'), 'undefined');
        if (valExpr.trim().startsWith('{') && (getInterfaceShape(expectedPropT) || getInterfaceShape(nonNullPropT))) {
          checkObjectLiteralAgainstShape(valExpr, nonNullPropT || expectedPropT, lineNum, `属性 "${propName}"`);
        } else if (valT !== 'any' && !isExpressionAssignable(valExpr, valT, expectedPropT, lineNum)) {
          addDiag(lineNum, 'TS2322', `属性 "${propName}" 的类型 "${valT}" 不能分配给类型 "${expectedPropT}" (${contextDesc})`);
        }
      }
    });
    return true;
  }

  function checkTemplateInterpolations(tpl: string, lineNum: number): void {
    let i = 1;
    while (i < tpl.length - 1) {
      if (tpl[i] === '\\') { i += 2; continue; }
      if (tpl[i] === '$' && tpl[i + 1] === '{') {
        const endIdx = skipTemplateExpr(tpl, i + 2);
        const innerExpr = tpl.slice(i + 2, endIdx - 1).trim();
        if (innerExpr) inferType(innerExpr, lineNum);
        i = endIdx;
        continue;
      }
      i++;
    }
  }

  function inferType(expr: string | null | undefined, lineNum: number): string {
    if (!expr) return 'any';
    let s = stripInlineCommentSafe(expr).trim().replace(/;$/, '').trim();
    if (!s) return 'any';

    while (s.startsWith('(') && findBalancedParen(s, 0) === s.length - 1) {
      s = s.slice(1, -1).trim();
    }

    // Yield expression: `yield expr` or `yield* expr`
    const yieldM = s.match(/^yield\s*(\*)?\s*([\s\S]*)$/);
    if (yieldM) {
      if (yieldM[2]?.trim()) inferType(yieldM[2].trim(), lineNum);
      return 'any';
    }

    // Prefix angle-bracket type assertion: `<string>val`
    if (s.startsWith('<') && !s.includes('=>')) {
      let ad = 1, k = 1;
      while (k < s.length && ad > 0) {
        const ch = s[k];
        if (ch === '"' || ch === "'" || ch === '`') { k = skipString(s, k); continue; }
        if (ch === '<') ad++;
        else if (ch === '>' && s[k - 1] !== '=') ad--;
        k++;
      }
      if (ad === 0 && k < s.length) {
        const castT = s.slice(1, k - 1).trim();
        const restExpr = s.slice(k).trim();
        if (castT && restExpr) {
          inferType(restExpr, lineNum);
          return resolveAlias(castT);
        }
      }
    }

    const hadTrailingBang = s.endsWith('!') && !s.endsWith('!=');
    while (s.endsWith('!') && !s.endsWith('!=')) {
      s = s.slice(0, -1).trim();
    }
    if (hadTrailingBang) {
      const innerT = inferType(s, lineNum);
      return stripNullableFromType(stripNullableFromType(innerT, 'null'), 'undefined');
    }

    // Top-level `as` or `satisfies` cast (only when outside parens/brackets/braces)
    {
      let d = 0, castPos = -1, castKw = '', castTarget = '';
      for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (ch === '"' || ch === "'" || ch === '`') { i = skipString(s, i) - 1; continue; }
        if (ch === '(' || ch === '[' || ch === '{') d++;
        else if (ch === ')' || ch === ']' || ch === '}') d--;
        else if (d === 0 && isWS(ch)) {
          const m = s.slice(i).match(/^\s+(as|satisfies)\s+([A-Za-z_$][\w$<>[\]\s|(){}:;,?"']*)$/);
          if (m && m[1] && m[2]) {
            castPos = i;
            castKw = m[1];
            castTarget = m[2].trim();
            break;
          }
        }
      }
      if (castPos > 0 && castTarget) {
        const lhsExpr = s.slice(0, castPos).trim();
        const lhsT = inferType(lhsExpr, lineNum);
        if (castKw === 'as' && castTarget === 'const') {
          return lhsT;
        }
        const resolvedCast = resolveAlias(castTarget);
        if (castKw === 'satisfies') {
          if (lhsExpr.startsWith('{') && getInterfaceShape(resolvedCast)) {
            checkObjectLiteralAgainstShape(lhsExpr, resolvedCast, lineNum, `satisfies "${resolvedCast}"`);
          } else if (!isExpressionAssignable(lhsExpr, lhsT, resolvedCast, lineNum)) {
            addDiag(lineNum, 'TS1360', `类型 "${lhsT}" 不满足预期类型 "${resolvedCast}"`);
          }
          return lhsT;
        }
        return resolvedCast;
      }
    }

    if (/^(true|false)$/.test(s)) return 'boolean';
    if (s === 'null') return 'null';
    if (s === 'undefined') return 'undefined';
    if (s === 'Infinity' || s === '-Infinity' || s === 'NaN') return 'number';
    if (/^[+-]?\d+(?:\.\d+)?$/.test(s)) return 'number';
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
      return 'string';
    }
    if (s.startsWith('`') && s.endsWith('`')) {
      checkTemplateInterpolations(s, lineNum);
      return 'string';
    }

    if (/^await\b/.test(s) && (s[5] === ' ' || s[5] === '\t' || s[5] === '(')) {
      const awaitedT = inferType(s.slice(5).trim(), lineNum);
      return evaluateType(`Awaited<${awaitedT}>`, activeTypeParams);
    }

    const promiseCtor = s.match(/^new\s+Promise\s*(?:<\s*([\s\S]+?)\s*>)?\s*\(/);
    if (promiseCtor) {
      const pt = promiseCtor[1] ? resolveAlias(promiseCtor[1]) : 'any';
      return `Promise<${pt}>`;
    }

    const mapCtor = s.match(/^new\s+Map\s*(?:<\s*([^,>]+)\s*,\s*([^>]+)\s*>)?\s*\(/);
    if (mapCtor) {
      const kt = mapCtor[1] ? resolveAlias(mapCtor[1]) : 'any';
      const vt = mapCtor[2] ? resolveAlias(mapCtor[2]) : 'any';
      return `Map<${kt},${vt}>`;
    }
    const setCtor = s.match(/^new\s+Set\s*(?:<\s*([^>]+)\s*>)?\s*\(/);
    if (setCtor) {
      const vt = setCtor[1] ? resolveAlias(setCtor[1]) : 'any';
      return `Set<${vt}>`;
    }
    const arrFill = s.match(/^(?:new\s+)?Array\s*(?:<\s*([^>]+)\s*>)?\s*\([^)]*\)\s*\.fill\s*\(([\s\S]+)\)$/);
    if (arrFill) {
      const explicitT = arrFill[1] ? resolveAlias(arrFill[1]) : null;
      const elemT = explicitT || inferType(arrFill[2], lineNum);
      return elemT + '[]';
    }
    const arrCtor = s.match(/^(?:new\s+)?Array\s*(?:<\s*([^>]+)\s*>)?\s*\([^)]*\)$/);
    if (arrCtor) {
      const explicitT = arrCtor[1] ? resolveAlias(arrCtor[1]) : 'any';
      return explicitT + '[]';
    }
    const newClassM = s.match(/^new\s+([A-Za-z_$][\w$]*)\s*(?:<([\s\S]*)>)?\s*\(([\s\S]*)\)$/);
    if (newClassM && newClassM[1] && !/^(Map|Set|Array|Promise)$/.test(newClassM[1]) && findBalancedParen(s, s.lastIndexOf('(')) === s.length - 1) {
      const afterNew = s.replace(/^new\s+/, '');
      const idInfo = readIdent(afterNew, 0);
      if (idInfo) {
        const clsName = idInfo.name;
        if (abstractClasses.has(clsName)) {
          addDiag(lineNum, 'TS2511', `无法创建抽象类 "${clsName}" 的实例`);
        }
        let pIdx = idInfo.end;
        while (pIdx < afterNew.length && isWS(afterNew[pIdx])) pIdx++;
        let explicitTypeArgs: string[] = [];
        if (afterNew[pIdx] === '<') {
          let ad = 1, k = pIdx + 1;
          while (k < afterNew.length && ad > 0) {
            const ch = afterNew[k];
            if (ch === '"' || ch === "'" || ch === '`') { k = skipString(afterNew, k); continue; }
            if (ch === '<') ad++;
            else if (ch === '>' && afterNew[k - 1] !== '=') ad--;
            k++;
          }
          if (ad === 0) {
            explicitTypeArgs = splitTopLevelDecl(afterNew.slice(pIdx + 1, k - 1)).map(a => a.trim()).filter(Boolean);
            pIdx = k;
            while (pIdx < afterNew.length && isWS(afterNew[pIdx])) pIdx++;
          }
        }
        if (afterNew[pIdx] === '(' && findBalancedParen(afterNew, pIdx) === afterNew.length - 1) {
          const argsRaw = afterNew.slice(pIdx + 1, -1).trim();
          const args = argsRaw ? splitTopLevel(argsRaw).map(a => a.trim()) : [];
          const argTypes = args.map(a => inferType(a, lineNum));
          const clsTParams = interfaceTypeParams.get(clsName) || [];
          const ctorSig = getClassMethodSig(clsName, 'constructor');
          const callEnv = new Map<string, string>();
          if (ctorSig) {
            const effectiveSig = {
              ...ctorSig,
              typeParams: (ctorSig.typeParams && ctorSig.typeParams.length) ? ctorSig.typeParams : clsTParams,
            };
            instantiateAndCheckCall(effectiveSig, explicitTypeArgs, args, argTypes, `构造函数 "new ${clsName}"`, lineNum, callEnv);
          } else if (clsTParams.length > 0 && explicitTypeArgs.length > 0) {
            clsTParams.forEach((tp: { name: string; constraint?: string | null; defaultType?: string | null }, idx: number) => {
              const argVal = idx < explicitTypeArgs.length ? evaluateType(explicitTypeArgs[idx]) : (tp.defaultType ? evaluateType(tp.defaultType, callEnv) : 'any');
              callEnv.set(tp.name, argVal);
            });
            clsTParams.forEach((tp: { name: string; constraint?: string | null; defaultType?: string | null }) => {
              if (tp.constraint) {
                const cEval = evaluateType(tp.constraint, callEnv);
                const bVal = callEnv.get(tp.name);
                if (bVal && bVal !== 'any' && !isTypeCompatible(bVal, cEval)) {
                  addDiag(lineNum, 'TS2344', `类型 "${bVal}" 不满足泛型约束 "${cEval}" ("new ${clsName}" 的类型参数 "${tp.name}")`);
                }
              }
            });
          }
          if (clsTParams.length > 0) {
            const instArgs = clsTParams.map((tp: { name: string; constraint?: string | null; defaultType?: string | null }, idx: number) => {
              if (callEnv.has(tp.name)) return callEnv.get(tp.name) || 'any';
              if (idx < explicitTypeArgs.length) return evaluateType(explicitTypeArgs[idx]);
              return tp.defaultType ? evaluateType(tp.defaultType) : 'any';
            });
            return `${clsName}<${instArgs.join(',')}>`;
          }
          return resolveAlias(clsName);
        }
      }
    }
    const newClassPrefixM = s.match(/^new\s+([A-Za-z_$][\w$]*)\s*(?:<[^>]*>)?\s*\(/);
    if (newClassPrefixM && newClassPrefixM[1] && !/^(Map|Set|Array)$/.test(newClassPrefixM[1])) {
      const openIdx = s.indexOf('(');
      const closeIdx = findBalancedParen(s, openIdx);
      if (closeIdx === s.length - 1) {
        if (abstractClasses.has(newClassPrefixM[1])) {
          addDiag(lineNum, 'TS2511', `无法创建抽象类 "${newClassPrefixM[1]}" 的实例`);
        }
        return resolveAlias(newClassPrefixM[1]);
      }
    }

    if (s.startsWith('[') && s.endsWith(']') && findBalancedParen(s, 0) === s.length - 1) {
      const inner = s.slice(1, -1).trim();
      if (!inner) return 'any[]';
      const elems = splitTopLevel(inner).map(e => inferType(e, lineNum));
      const concrete = elems.filter(t => t !== 'any');
      if (!concrete.length) return 'any[]';
      const unique: string[] = [];
      concrete.forEach(t => {
        splitTopLevelUnion(normalizeTsType(t)).forEach(u => {
          if (!unique.includes(u)) unique.push(u);
        });
      });
      if (unique.length === 1) return unique[0] + '[]';
      return '(' + unique.join('|') + ')[]';
    }

    if (s.startsWith('{') && s.endsWith('}') && findBalancedParen(s, 0) === s.length - 1) {
      const entries = parseObjectLiteralEntries(s);
      if (entries) {
        const shapeParts: string[] = [];
        entries.forEach((vExpr, kName) => {
          const vt = inferType(vExpr, lineNum);
          shapeParts.push(`${kName}:${vt}`);
        });
        return `{${shapeParts.join(';')}}`;
      }
      return 'object';
    }

    // Inline arrow function expression: (a, b) => expr or x => expr
    const arrowExprM = s.match(/^(?:async\s+)?(?:<[^>]*>\s*)?(?:\(([^)]*)\)|([A-Za-z_$][\w$]*))\s*(?::\s*[^=]+?)?\s*=>\s*([\s\S]+)$/);
    if (arrowExprM && arrowExprM[3]) {
      const rawParamStr = arrowExprM[1] !== undefined ? arrowExprM[1] : arrowExprM[2];
      const bodyStr = arrowExprM[3].trim();
      const saved = new Map<string, VarEnvInfo | undefined>();
      const boundNames = new Set<string>();
      splitTopLevelDecl(rawParamStr || '').forEach(p => {
        const cleanP = p.trim().replace(/^\.\.\./, '');
        const pm = cleanP.match(/^([A-Za-z_$][\w$]*)(\?)?(?:\s*:\s*([^=]+))?/);
        if (pm && pm[1]) {
          const pName = pm[1];
          const pType = pm[3] ? resolveAlias(pm[3].trim()) : 'any';
          boundNames.add(pName);
          saved.set(pName, env.get(pName));
          env.set(pName, { type: pType, isConst: false, line: lineNum, declaredType: pType });
        } else {
          const dSet = new Set<string>();
          extractBindingNames(cleanP, dSet);
          dSet.forEach(pName => {
            boundNames.add(pName);
            saved.set(pName, env.get(pName));
            env.set(pName, { type: 'any', isConst: false, line: lineNum, declaredType: 'any' });
          });
        }
      });
      let retT = 'any';
      if (!bodyStr.startsWith('{')) {
        retT = inferType(bodyStr, lineNum);
      }
      boundNames.forEach(pName => {
        const prev = saved.get(pName);
        if (prev !== undefined) env.set(pName, prev);
        else env.delete(pName);
      });
      return retT;
    }

    // Ternary: cond ? a : b (top-level)
    {
      let qIdx = -1, cIdx = -1, d = 0;
      for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (ch === '"' || ch === "'" || ch === '`') { i = skipString(s, i) - 1; continue; }
        if (ch === '(' || ch === '[' || ch === '{') d++;
        else if (ch === ')' || ch === ']' || ch === '}') d--;
        else if (d === 0 && ch === '?' && s[i + 1] !== '.' && s[i + 1] !== '?') {
          if (qIdx < 0) qIdx = i;
        } else if (d === 0 && ch === ':' && qIdx >= 0 && cIdx < 0) {
          cIdx = i;
          break;
        }
      }
      if (qIdx > 0 && cIdx > qIdx) {
        const condExpr = s.slice(0, qIdx).trim();
        inferType(condExpr, lineNum);
        const eqNullM = condExpr.match(/^([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*(===|!==)\s*(null|undefined)$/);
        let savedNarrow: {
          key: string;
          prev: VarEnvInfo | undefined;
        } | null = null;
        const applyNarrow = (targetExpr: string, nullKind: string) => {
          const baseT = inferType(targetExpr, lineNum);
          const narrowedT = stripNullableFromType(baseT, nullKind);
          savedNarrow = { key: targetExpr, prev: env.get(targetExpr) };
          env.set(targetExpr, { type: narrowedT, isConst: false, line: lineNum, declaredType: narrowedT });
        };
        const restoreNarrow = () => {
          if (!savedNarrow) return;
          if (savedNarrow.prev !== undefined) env.set(savedNarrow.key, savedNarrow.prev);
          else env.delete(savedNarrow.key);
          savedNarrow = null;
        };
        if (eqNullM && eqNullM[1] && eqNullM[3] && eqNullM[2] === '!==') applyNarrow(eqNullM[1], eqNullM[3]);
        const t1 = inferType(s.slice(qIdx + 1, cIdx), lineNum);
        if (eqNullM && eqNullM[2] === '!==') restoreNarrow();
        if (eqNullM && eqNullM[1] && eqNullM[3] && eqNullM[2] === '===') applyNarrow(eqNullM[1], eqNullM[3]);
        const t2 = inferType(s.slice(cIdx + 1), lineNum);
        if (eqNullM && eqNullM[2] === '===') restoreNarrow();
        if (t1 === t2) return t1;
        if (isTsAssignable(t1, t2)) return t2;
        if (isTsAssignable(t2, t1)) return t1;
        return `${t1}|${t2}`;
      }
    }

    // Logical || / ?? / && (top-level)
    {
      let d = 0;
      for (let i = 0; i < s.length - 1; i++) {
        const ch = s[i];
        if (ch === '"' || ch === "'" || ch === '`') { i = skipString(s, i) - 1; continue; }
        if (ch === '(' || ch === '[' || ch === '{') d++;
        else if (ch === ')' || ch === ']' || ch === '}') d--;
        else if (d === 0 && ((ch === '|' && s[i + 1] === '|') || (ch === '?' && s[i + 1] === '?'))) {
          const leftT = inferType(s.slice(0, i), lineNum);
          const rightT = inferType(s.slice(i + 2), lineNum);
          if (leftT.endsWith('|undefined')) {
            const baseL = leftT.replace(/\|undefined$/, '');
            if (isTsAssignable(rightT, baseL)) return baseL;
          }
          return rightT !== 'any' ? rightT : leftT;
        } else if (d === 0 && ch === '&' && s[i + 1] === '&') {
          inferType(s.slice(0, i), lineNum);
          inferType(s.slice(i + 2), lineNum);
          return 'boolean';
        }
      }
    }

    // Comparisons ===, !==, <=, >=, <, > (excluding bitwise shifts <<, >>, >>>)
    {
      let d = 0;
      for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (ch === '"' || ch === "'" || ch === '`') { i = skipString(s, i) - 1; continue; }
        if (ch === '(' || ch === '[' || ch === '{') d++;
        else if (ch === ')' || ch === ']' || ch === '}') d--;
        else if (d === 0) {
          if (ch === '<' || ch === '>') {
            if (s[i + 1] === ch || s[i - 1] === ch) continue;
            if (ch === '<') {
              const before = s.slice(0, i).trim();
              if (/(?:^|\bnew\s+|\.)[A-Za-z_$][\w$]*$/.test(before)) {
                let gd = 1, k = i + 1;
                while (k < s.length && gd > 0) {
                  if (s[k] === '<') gd++;
                  else if (s[k] === '>' && s[k - 1] !== '=') gd--;
                  k++;
                }
                if (gd === 0 && /^\s*\(/.test(s.slice(k))) {
                  i = k - 1;
                  continue;
                }
              }
            }
          }
          const rest = s.slice(i);
          const m = rest.match(/^(===|!==|<=|>=|==|!=|<|>)(?!=)/);
          if (m && m[1] && i > 0) {
            const op = m[1];
            const lhs = s.slice(0, i).trim();
            const rhs = s.slice(i + op.length).trim();
            if (lhs && rhs) {
              const lt = inferType(lhs, lineNum);
              const rt = inferType(rhs, lineNum);
              const prims = ['number', 'string', 'boolean'];
              if (prims.includes(lt) && prims.includes(rt) && lt !== rt) {
                addDiag(lineNum, 'TS2367', `此比较表达式类型不匹配：无法比较类型 "${lt}" 与 "${rt}"`);
              }
              return 'boolean';
            }
          }
        }
      }
    }

    // Top-level binary +, -, *, /, %, >>, <<, >>>
    {
      let d = 0;
      for (let i = s.length - 1; i > 0; i--) {
        const ch = s[i];
        if (ch === ')' || ch === ']' || ch === '}') d++;
        else if (ch === '(' || ch === '[' || ch === '{') d--;
        else if (d === 0 && (ch === '>' || ch === '<') && s[i - 1] === ch) {
          const shiftStart = (ch === '>' && i >= 2 && s[i - 2] === '>') ? i - 2 : i - 1;
          const lhs = s.slice(0, shiftStart).trim();
          const rhs = s.slice(i + 1).trim();
          if (lhs && rhs) {
            inferType(lhs, lineNum);
            inferType(rhs, lineNum);
            return 'number';
          }
          i = shiftStart;
        } else if (d === 0 && (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '%')) {
          if (s[i - 1] === ch || s[i + 1] === ch || s[i + 1] === '=' || s[i - 1] === '=') continue;
          const lhs = s.slice(0, i).trim();
          const rhs = s.slice(i + 1).trim();
          if (!lhs || !rhs || /[+\-*/%&|^<>?:=(,]$/.test(lhs)) continue;
          const lt = inferType(lhs, lineNum);
          const rt = inferType(rhs, lineNum);
          if (lt === 'unknown' || rt === 'unknown') {
            addDiag(lineNum, 'TS18046', `对象的类型为 "unknown"`);
          }
          if (ch === '+') {
            if (lt === 'string' || rt === 'string') return 'string';
            if (lt === 'number' && rt === 'number') return 'number';
            if ((lt === 'number' && rt === 'boolean') || (lt === 'boolean' && rt === 'number') || lt.endsWith('[]') || rt.endsWith('[]')) {
              addDiag(lineNum, 'TS2365', `运算符 "+" 不能应用于类型 "${lt}" 和 "${rt}"`);
            }
            return lt === 'number' || rt === 'number' ? 'number' : 'any';
          } else {
            const badL = lt === 'string' || lt === 'boolean' || lt.endsWith('[]');
            const badR = rt === 'string' || rt === 'boolean' || rt.endsWith('[]');
            if (badL || badR) {
              addDiag(lineNum, 'TS2362', `算术运算符 "${ch}" 的操作数类型必须为 "number"，不能为 "${badL ? lt : rt}"`);
            }
            return 'number';
          }
        }
      }
    }

    if (s.startsWith('!')) return 'boolean';
    if ((s.startsWith('-') || s.startsWith('+')) && s.length > 1) {
      const ut = inferType(s.slice(1), lineNum);
      if (ut === 'string' || ut === 'boolean') {
        addDiag(lineNum, 'TS2362', `一元算术运算符不能应用于类型 "${ut}"`);
      }
      return 'number';
    }

    // Method call on `new ClassName(...).method(...)`
    const newChainCallM = s.match(/^(new\s+[A-Za-z_$][\w$]*\s*(?:<[^>]*>)?\s*\([^)]*\))\.([A-Za-z_$][\w$]*)\s*\(([\s\S]*)\)$/);
    if (newChainCallM && newChainCallM[1] && newChainCallM[2] && newChainCallM[3] !== undefined && findBalancedParen(s, s.lastIndexOf('(')) === s.length - 1) {
      const objType = inferType(newChainCallM[1], lineNum);
      const method = newChainCallM[2];
      const argsRaw = newChainCallM[3].trim();
      const args = argsRaw ? splitTopLevel(argsRaw).map(a => a.trim()) : [];
      const argTypes = args.map(a => inferType(a, lineNum));
      const mSig = getClassMethodSig(objType, method);
      if (mSig) {
        return instantiateAndCheckCall(mSig, [], args, argTypes, `方法 "${objType}.${method}"`, lineNum);
      }
      return 'any';
    }

    // Function or method call: callee(args) or callee<T1, T2>(args)
    const callPrefixM = s.match(/^([A-Za-z_$][\w$!]*(?:(?:\?\.|\.)[A-Za-z_$][\w$!]*)*)\s*(?:<([\s\S]+)>)?\s*\(/);
    if (callPrefixM && callPrefixM[1]) {
      const callee = callPrefixM[1];
      let scanPos = callee.length;
      while (scanPos < s.length && isWS(s[scanPos])) scanPos++;
      let explicitTypeArgs: string[] = [];
      if (s[scanPos] === '<') {
        let ad = 1, k = scanPos + 1;
        while (k < s.length && ad > 0) {
          const ch = s[k];
          if (ch === '"' || ch === "'" || ch === '`') { k = skipString(s, k); continue; }
          if (ch === '<') ad++;
          else if (ch === '>' && s[k - 1] !== '=') ad--;
          k++;
        }
        if (ad === 0) {
          explicitTypeArgs = splitTopLevelDecl(s.slice(scanPos + 1, k - 1)).map(a => a.trim()).filter(Boolean);
          scanPos = k;
          while (scanPos < s.length && isWS(s[scanPos])) scanPos++;
        }
      }
      if (s[scanPos] === '(' && findBalancedParen(s, scanPos) === s.length - 1) {
        const argsRaw = s.slice(scanPos + 1, -1).trim();
        const args = argsRaw ? splitTopLevel(argsRaw).map(a => a.trim()) : [];
        const argTypes = args.map(a => inferType(a, lineNum));

        if (callee === 'checkpoint' || callee === '断点') {
          return 'void';
        }
        if (/^Math\.(max|min|abs|floor|ceil|round|pow|sqrt|trunc|sign)$/.test(callee)) {
          argTypes.forEach((at, idx) => {
            if (at !== 'any' && !isTsAssignable(at, 'number')) {
              addDiag(lineNum, 'TS2345', `调用 "${callee}" 的第 ${idx + 1} 个参数类型 "${at}" 不能赋给类型 "number"`);
            }
          });
          return 'number';
        }
        if (callee === 'Number' || callee === 'parseInt' || callee === 'parseFloat') return 'number';
        if (callee === 'String' || callee === 'JSON.stringify') return 'string';
        if (callee === 'Boolean' || callee === 'Array.isArray') return 'boolean';
        if (callee === 'Symbol') return 'symbol';
        if (callee === 'Promise.resolve') {
          const t0 = explicitTypeArgs[0] ? evaluateType(explicitTypeArgs[0]) : (argTypes[0] || 'void');
          return `Promise<${t0}>`;
        }
        if (callee === 'Promise.reject') {
          return 'Promise<never>';
        }
        if (callee === 'Promise.all') {
          return 'Promise<any[]>';
        }
        if (callee === 'Promise.race') {
          return 'Promise<any>';
        }
        if (callee === 'sleep') {
          const sleepT = explicitTypeArgs[0] ? evaluateType(explicitTypeArgs[0]) : (argTypes[1] || 'void');
          return `Promise<${sleepT}>`;
        }
        if (callee === 'setTimeout') {
          return 'number';
        }
        if (callee === 'clearTimeout' || callee === 'queueMicrotask') {
          return 'void';
        }

        const dotIdx = callee.lastIndexOf('.');
        if (dotIdx > 0) {
          const isOptChain = callee[dotIdx - 1] === '?';
          const objName = callee.slice(0, isOptChain ? dotIdx - 1 : dotIdx);
          const method = callee.slice(dotIdx + 1).replace(/!+$/, '');
          const rawObjType = inferType(objName, lineNum);
          if (rawObjType === 'unknown') {
            addDiag(lineNum, 'TS18046', `"${objName}" 的类型为 "unknown"`);
            return 'any';
          }
          if (!isOptChain && !objName.endsWith('!')) {
            const uParts = splitTopLevelUnion(rawObjType);
            if (uParts.includes('undefined')) {
              addDiag(lineNum, 'TS18048', `"${objName}" 可能为 "undefined"`);
            } else if (uParts.includes('null')) {
              addDiag(lineNum, 'TS18047', `"${objName}" 可能为 "null"`);
            }
          }
          const objType = stripNullableFromType(stripNullableFromType(rawObjType, 'null'), 'undefined');

          const mapM = objType.match(/^Map<([^,]+),(.+)>$/);
          if (mapM && mapM[1] && mapM[2]) {
            const kt = mapM[1], vt = mapM[2];
            if (method === 'get' || method === 'has' || method === 'delete') {
              if (argTypes[0] && !isExpressionAssignable(args[0], argTypes[0], kt, lineNum)) {
                addDiag(lineNum, 'TS2345', `"${objName}.${method}" 的键参数类型 "${argTypes[0]}" 不能赋给类型 "${kt}"`);
              }
              return method === 'get' ? `${vt}|undefined` : 'boolean';
            }
            if (method === 'set') {
              if (argTypes[0] && !isExpressionAssignable(args[0], argTypes[0], kt, lineNum)) {
                addDiag(lineNum, 'TS2345', `"${objName}.set" 的键参数类型 "${argTypes[0]}" 不能赋给类型 "${kt}"`);
              }
              if (argTypes[1] && !isExpressionAssignable(args[1], argTypes[1], vt, lineNum)) {
                addDiag(lineNum, 'TS2345', `"${objName}.set" 的值参数类型 "${argTypes[1]}" 不能赋给类型 "${vt}"`);
              }
              return objType;
            }
          }

          const setM = objType.match(/^Set<(.+)>$/);
          if (setM && setM[1]) {
            const vt = setM[1];
            if (method === 'add' || method === 'has' || method === 'delete') {
              if (argTypes[0] && !isExpressionAssignable(args[0], argTypes[0], vt, lineNum)) {
                addDiag(lineNum, 'TS2345', `"${objName}.${method}" 的参数类型 "${argTypes[0]}" 不能赋给类型 "${vt}"`);
              }
              return method === 'add' ? objType : 'boolean';
            }
          }

          if (objType.endsWith('[]')) {
            const elemT = objType.slice(0, -2);
            if (method === 'push' || method === 'unshift') {
              argTypes.forEach((at, idx) => {
                if (!isExpressionAssignable(args[idx], at, elemT, lineNum)) {
                  addDiag(lineNum, 'TS2345', `数组 "${objName}.${method}" 的参数类型 "${at}" 不能赋给元素类型 "${elemT}"`);
                }
              });
              return 'number';
            }
            if (method === 'pop' || method === 'shift') return elemT;
            if (method === 'includes') return 'boolean';
            if (method === 'slice' || method === 'concat' || method === 'filter') return objType;
            if (method === 'join') return 'string';
          }

          if (objType === 'string') {
            if (method === 'slice' || method === 'substring' || method === 'trim' || method === 'toLowerCase' || method === 'toUpperCase') return 'string';
            if (method === 'includes' || method === 'startsWith' || method === 'endsWith') return 'boolean';
            if (method === 'indexOf' || method === 'charCodeAt') return 'number';
          }

          if (objType === '__FsPromises__' || (objName.endsWith('.promises') && inferType(objName.slice(0, -9).trim(), lineNum) === '__FsModule__')) {
            if (method === 'readFile') return 'Promise<string>';
            if (method === 'writeFile' || method === 'appendFile' || method === 'mkdir' || method === 'unlink' || method === 'rm' || method === 'access' || method === 'copyFile' || method === 'rename') return 'Promise<void>';
            if (method === 'readdir') return 'Promise<string[]>';
            if (method === 'exists') return 'Promise<boolean>';
            if (method === 'stat') return 'Promise<any>';
          }

          if (objType === '__FsModule__') {
            if (method === 'readFileSync') return 'string';
            if (method === 'writeFileSync' || method === 'appendFileSync' || method === 'mkdirSync' || method === 'unlinkSync' || method === 'rmSync' || method === 'copyFileSync' || method === 'renameSync') return 'void';
            if (method === 'readdirSync') return 'string[]';
            if (method === 'existsSync') return 'boolean';
            if (method === 'statSync') return 'any';
          }

          const classMethodSig = getClassMethodSig(objType, method);
          if (classMethodSig) {
            return instantiateAndCheckCall(classMethodSig, explicitTypeArgs, args, argTypes, `方法 "${objName}.${method}"`, lineNum);
          }
          const objShape = getInterfaceShape(objType);
          if (objShape && objShape.has(method)) {
            const propType = (objShape.get(method) || { type: '' }).type || '';
            const arrowPos = propType.lastIndexOf('=>');
            if (arrowPos > 0) {
              return resolveAlias(propType.slice(arrowPos + 2).trim());
            }
          }
        }

        const sig = fns.get(callee);
        if (sig) {
          return instantiateAndCheckCall(sig, explicitTypeArgs, args, argTypes, `函数 "${callee}"`, lineNum);
        }

        if (dotIdx < 0 && !isKnownIdentifier(callee)) {
          addDiag(lineNum, 'TS2304', `找不到名称 "${callee}"`);
        }

        return 'any';
      }
    }

    // Array / String / Object indexing: target[idx] (possibly multi-dimensional dp[i][j] or obj[key])
    const bracketOpen = s.indexOf('[');
    if (bracketOpen > 0 && s.endsWith(']')) {
      let curBase = s.slice(0, bracketOpen).trim();
      const isOptBracket = curBase.endsWith('?.');
      if (isOptBracket) curBase = curBase.slice(0, -2).trim();
      let curType = inferType(curBase, lineNum);
      if (curType === 'unknown') {
        addDiag(lineNum, 'TS18046', `"${curBase}" 的类型为 "unknown"`);
        return 'any';
      }
      if (!isOptBracket && !curBase.endsWith('!')) {
        const uParts = splitTopLevelUnion(curType);
        if (uParts.includes('undefined')) addDiag(lineNum, 'TS18048', `"${curBase}" 可能为 "undefined"`);
        else if (uParts.includes('null')) addDiag(lineNum, 'TS18047', `"${curBase}" 可能为 "null"`);
      }
      curType = stripNullableFromType(stripNullableFromType(curType, 'null'), 'undefined');
      let pos = bracketOpen;
      while (pos < s.length && s[pos] === '[') {
        const closeB = findBalancedParen(s, pos);
        if (closeB < 0) break;
        const idxExpr = s.slice(pos + 1, closeB).trim();
        const idxType = inferType(idxExpr, lineNum);
        const litIdx = inferLiteralType(idxExpr);
        if (idxType === 'string' || idxType === 'boolean') {
          if (curType.endsWith('[]') || curType === 'string') {
            addDiag(lineNum, 'TS2538', `数组或字符串的索引类型必须为 "number"，不能使用类型 "${idxType}"`);
          }
        }
        const shape = getInterfaceShape(curType);
        if (curType.endsWith('[]')) {
          curType = curType.slice(0, -2);
        } else if (curType.startsWith('[') && curType.endsWith(']') && litIdx && /^\d+$/.test(litIdx)) {
          curType = resolveIndexedAccess(curType, litIdx, new Map<string, string>(), 0);
        } else if (curType === 'string') {
          curType = 'string';
        } else if (litIdx && shape) {
          curType = resolveIndexedAccess(curType, litIdx, new Map<string, string>(), 0);
        } else if (shape && shape.has(`[${idxExpr}]`)) {
          curType = (shape.get(`[${idxExpr}]`) || { type: 'any' }).type;
        } else if (shape && shape.has('__index__')) {
          curType = (shape.get('__index__') || { type: 'any' }).type;
        } else if (activeTypeParams.has(curType) && activeTypeParams.has(idxType)) {
          curType = `${curType}[${idxType}]`;
        } else {
          curType = 'any';
        }
        pos = closeB + 1;
      }
      if (pos === s.length) return curType;
    }

    // Property access chain: a.b.c (with optional non-null assertions a!.b!.c or optional chaining a?.b)
    if (/^[A-Za-z_$][\w$]*!*(?:(?:\?\.|\.)[A-Za-z_$][\w$]*!*)+$/.test(s)) {
      if (env.has(s)) return (env.get(s) || { type: 'any' }).type;
      const tokens: Array<{ name: string; hasBang: boolean; optChainBefore: boolean }> = [];
      let rem = s;
      let nextOpt = false;
      while (rem.length > 0) {
        const m = rem.match(/^([A-Za-z_$][\w$]*)(!*)(\?\.|\.)?/);
        if (!m || !m[1]) break;
        tokens.push({ name: m[1], hasBang: Boolean(m[2]), optChainBefore: nextOpt });
        nextOpt = m[3] === '?.';
        rem = rem.slice(m[0].length);
      }
      const firstTok = tokens[0];
      if (tokens.length >= 2 && firstTok) {
        const firstBase = firstTok.name;
        if (!isKnownIdentifier(firstBase)) {
          addDiag(lineNum, 'TS2304', `找不到名称 "${firstBase}"（变量未声明，请使用 let 或 const 声明）`);
          return 'any';
        }
        if (enumsSet.has(firstBase)) {
          const secondTok = tokens[1];
          const memberProp = secondTok ? secondTok.name : '';
          const memSet = enumMembers.get(firstBase);
          if (memSet && memSet.size > 0 && !memSet.has(memberProp)) {
            addDiag(lineNum, 'TS2339', `类型 "typeof ${firstBase}" 上不存在属性 "${memberProp}"`);
          }
          return firstBase;
        }
        let curType = env.has(firstBase) ? (env.get(firstBase) || { type: 'any' }).type : (interfaces.has(firstBase) ? firstBase : 'any');
        if (firstTok.hasBang) {
          curType = stripNullableFromType(stripNullableFromType(curType, 'null'), 'undefined');
        }
        let hadOptChain = false;
        for (let pIdx = 1; pIdx < tokens.length; pIdx++) {
          const tok = tokens[pIdx];
          if (!tok) continue;
          const prop = tok.name;
          const prefixLabel = tokens.slice(0, pIdx).map(t => t.name).join('.');
          if (curType === 'unknown') {
            addDiag(lineNum, 'TS18046', `"${prefixLabel}" 的类型为 "unknown"`);
            return 'any';
          }
          if (tok.optChainBefore) {
            hadOptChain = true;
          } else if (!tokens[pIdx - 1]?.hasBang) {
            const cParts = splitTopLevelUnion(curType);
            if (cParts.includes('undefined')) {
              addDiag(lineNum, 'TS18048', `"${prefixLabel}" 可能为 "undefined"`);
            } else if (cParts.includes('null')) {
              addDiag(lineNum, 'TS18047', `"${prefixLabel}" 可能为 "null"`);
            }
          }
          const lookupType = stripNullableFromType(stripNullableFromType(curType, 'null'), 'undefined');
          if (prop === 'length' && (lookupType.endsWith('[]') || lookupType.startsWith('[') || lookupType === 'string')) {
            curType = 'number';
            continue;
          }
          if (prop === 'size' && (lookupType.startsWith('Map<') || lookupType.startsWith('Set<'))) {
            curType = 'number';
            continue;
          }
          const shape = getInterfaceShape(lookupType);
          if (shape) {
            if (shape.has(prop)) {
              curType = (shape.get(prop) || { type: 'any' }).type;
            } else if (getClassMethodSig(lookupType, prop)) {
              curType = 'function';
            } else if (shape.has('__index__')) {
              curType = (shape.get('__index__') || { type: 'any' }).type;
            } else {
              addDiag(lineNum, 'TS2339', `类型 "${lookupType}" 上不存在属性 "${prop}"`);
              return 'any';
            }
          } else {
            if (prop === 'length' || prop === 'size' || prop === 'val') curType = 'number';
            else curType = 'any';
          }
          if (tok.hasBang) {
            curType = stripNullableFromType(stripNullableFromType(curType, 'null'), 'undefined');
            hadOptChain = false;
          }
        }
        if (hadOptChain && curType !== 'any' && !splitTopLevelUnion(curType).includes('undefined')) {
          curType = `${curType}|undefined`;
        }
        return curType;
      }
    }

    // Prefix / postfix ++ or -- inside expression
    const exprIncM = s.match(/^(?:(\+\+|--)\s*([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)|([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*(\+\+|--))$/);
    if (exprIncM) {
      const target = exprIncM[2] || exprIncM[3] || '';
      inferType(target, lineNum);
      return 'number';
    }

    // Identifier lookup
    if (/^[A-Za-z_$][\w$]*$/.test(s)) {
      if (env.has(s)) return (env.get(s) || { type: 'any' }).type;
      if (!isKnownIdentifier(s)) {
        addDiag(lineNum, 'TS2304', `找不到名称 "${s}"（变量未声明，请使用 let 或 const 声明）`);
      }
    }

    return 'any';
  }

  function instantiateAndCheckCall(sig: FnSigInfo, explicitTypeArgs: string[], args: string[], argTypes: string[], calleeLabel: string, lineNum: number, outEnv: Map<string, string> | null = null): string {
    const hasRest = sig.params.some(p => p.isRest);
    if (args.length < sig.minArgs || (!hasRest && args.length > sig.params.length)) {
      addDiag(lineNum, 'TS2554', `${calleeLabel} 应有 ${sig.minArgs === sig.params.length ? sig.params.length : sig.minArgs + '-' + sig.params.length} 个参数，但获得 ${args.length} 个`);
      return sig.returnType || 'any';
    }
    const tParams = sig.typeParams || [];
    const callEnv = outEnv || new Map<string, string>();
    if (tParams.length > 0) {
      const tpNames = new Set(tParams.map(tp => tp.name));
      const tpMetaMap = new Map(tParams.map(tp => [tp.name, tp]));
      if (explicitTypeArgs && explicitTypeArgs.length > 0) {
        tParams.forEach((tp, idx) => {
          if (idx < explicitTypeArgs.length) {
            callEnv.set(tp.name, evaluateType(explicitTypeArgs[idx], callEnv));
          }
        });
      }
      // Infer remaining type parameters from arguments
      for (let idx = 0; idx < args.length && idx < sig.params.length; idx++) {
        const p = sig.params[idx];
        if (!p) continue;
        const rawPT = normalizeTsType(p.rawType || p.type || 'any');
        const actT = argTypes[idx];
        const litT = inferLiteralType(args[idx]);
        if (tpNames.has(rawPT)) {
          if (!callEnv.has(rawPT)) {
            const meta = tpMetaMap.get(rawPT);
            const usedAsIndex = sig.rawReturnType && new RegExp(`\\[\\s*${rawPT}\\s*\\]`).test(sig.rawReturnType);
            const hasKeyofOrLitConstraint = meta && meta.constraint && (/\bkeyof\b|["']/.test(meta.constraint));
            if (litT && (usedAsIndex || hasKeyofOrLitConstraint)) {
              callEnv.set(rawPT, litT);
            } else if (actT && actT !== 'any') {
              callEnv.set(rawPT, actT);
            }
          }
        } else if (actT && actT !== 'any') {
          let patWithInfer = rawPT;
          let replacedAny = false;
          tpNames.forEach(tpName => {
            if (!callEnv.has(tpName)) {
              const rx = new RegExp(`\\b${tpName}\\b`, 'g');
              if (rx.test(patWithInfer)) {
                patWithInfer = patWithInfer.replace(rx, `infer ${tpName}`);
                replacedAny = true;
              }
            }
          });
          if (replacedAny) {
            const m = matchConditionalExtends(actT, patWithInfer, callEnv, 0);
            if (m.matched) {
              m.inferred.forEach((v, k) => {
                if (!callEnv.has(k)) callEnv.set(k, v);
              });
            }
          }
        }
      }
      // Fill defaults for any still-unbound type parameters
      tParams.forEach(tp => {
        if (!callEnv.has(tp.name)) {
          callEnv.set(tp.name, tp.defaultType ? evaluateType(tp.defaultType, callEnv) : 'any');
        }
      });
      // Validate generic constraints (e.g. T extends { length: number }, K extends keyof T)
      tParams.forEach(tp => {
        if (tp.constraint) {
          const constraintT = evaluateType(tp.constraint, callEnv);
          const boundT = callEnv.get(tp.name);
          if (boundT && boundT !== 'any' && !isTypeCompatible(boundT, constraintT)) {
            addDiag(lineNum, 'TS2345', `类型 "${boundT}" 不满足泛型约束 "${constraintT}" (${calleeLabel} 的类型参数 "${tp.name}")`);
          }
        }
      });
    }

    // Check each argument against its (possibly generic-instantiated) parameter type
    const lastParam = sig.params[sig.params.length - 1];
    for (let idx = 0; idx < args.length; idx++) {
      const p = idx < sig.params.length ? sig.params[idx] : (lastParam?.isRest ? lastParam : undefined);
      if (!p) continue;
      let expectedPT = tParams.length > 0 ? evaluateType(p.rawType || p.type, callEnv) : p.type;
      if (p.isRest && expectedPT.endsWith('[]')) {
        expectedPT = expectedPT.slice(0, -2);
      }
      const at = argTypes[idx] || 'any';
      const rawArg = (args[idx] || '').trim();
      if (expectedPT && expectedPT !== 'any') {
        if (rawArg.startsWith('{') && getInterfaceShape(expectedPT)) {
          checkObjectLiteralAgainstShape(rawArg, expectedPT, lineNum, `${calleeLabel} 的参数 "${p.name}"`);
        } else if (!isExpressionAssignable(rawArg, at, expectedPT, lineNum)) {
          addDiag(lineNum, 'TS2345', `类型 "${at}" 的参数不能赋给类型 "${expectedPT}" 的参数 (${calleeLabel} 的参数 "${p.name}")`);
        }
      }
    }

    if (tParams.length > 0 && (sig.rawReturnType || sig.returnType)) {
      return evaluateType(sig.rawReturnType || sig.returnType, callEnv);
    }
    return sig.returnType ? evaluateType(sig.returnType) : 'any';
  }

  function checkArrayElementsAgainst(arrExpr: string, expectedElemType: string, lineNum: number, contextLabel: string) {
    const s = arrExpr.trim();
    if (!s.startsWith('[') || !s.endsWith(']')) return;
    const inner = s.slice(1, -1).trim();
    if (!inner) return;
    const elems = splitTopLevel(inner);
    elems.forEach((el, idx) => {
      const et = inferType(el, lineNum);
      if (el.trim().startsWith('{') && getInterfaceShape(expectedElemType)) {
        checkObjectLiteralAgainstShape(el.trim(), expectedElemType, lineNum, `${contextLabel} 第 ${idx + 1} 个元素`);
      } else if (!isExpressionAssignable(el, et, expectedElemType, lineNum)) {
        addDiag(lineNum, 'TS2322', `${contextLabel} 第 ${idx + 1} 个元素类型 "${et}" 不能分配给元素类型 "${expectedElemType}"`);
      }
    });
  }

  function parseParamList(paramStr: string, lineNum: number, checkImplicitAny = true) {
    const rawParams = paramStr ? splitTopLevelDecl(paramStr) : [];
    const params: Array<{ name: string; type: string; rawType: string; optional: boolean; isRest?: boolean }> = [];
    let minArgs = 0;
    rawParams.forEach(pRaw => {
      const p = pRaw.trim().replace(/^(?:(?:public|private|protected|readonly|override)\s+)+/, '');
      if (!p) return;
      const pm = p.match(/^(\.\.\.)?([A-Za-z_$][\w$]*)(\?)?(?:\s*:\s*((?:[^=]|=>)+?))?(?:\s*=\s*(?!=|>)([\s\S]+))?$/);
      if (pm && pm[2]) {
        const isRest = Boolean(pm[1]);
        const pName = pm[2];
        const isOpt = Boolean(pm[3] || pm[5] || isRest);
        const rawType = pm[4] ? pm[4].trim() : null;
        let pType = rawType ? resolveAlias(rawType) : null;
        if (!pType && pm[5]) {
          pType = inferType(pm[5].trim(), lineNum);
        }
        if (!pType) {
          if (checkImplicitAny) {
            addDiag(lineNum, 'TS7006', `参数 "${pName}" 隐式具有 "any" 类型（严格模式下请显式添加类型注解，如 ${pName}: number）`);
          }
          pType = isRest ? 'any[]' : 'any';
        }
        if (!isOpt) minArgs++;
        params.push({ name: pName, type: pType, rawType: rawType || pType, optional: isOpt, isRest });
      }
    });
    return { params, minArgs };
  }

  function parseClassTopMember(mem: string, propMap: Map<string, { type: string; rawType: string; optional: boolean }>, clsName: string, lineNum: number) {
    const s = mem.trim();
    if (!s) return;
    const getterM = s.match(/^(?:(?:public|private|protected|static|readonly|override)\s+)*get\s+([A-Za-z_$][\w$]*)\s*\(\s*\)\s*(?::\s*([^{]+))?/);
    if (getterM && getterM[1]) {
      const rawGT = getterM[2] ? getterM[2].trim() : 'any';
      const gType = resolveAlias(rawGT);
      propMap.set(getterM[1], { type: gType, rawType: rawGT, optional: false });
      fns.set(clsName + '.get.' + getterM[1], {
        name: clsName + '.' + getterM[1],
        params: [],
        minArgs: 0,
        returnType: gType,
        rawReturnType: rawGT,
        typeParams: [],
        line: lineNum,
        hasValueReturn: /\breturn\s+[^;}\s]/.test(s),
      });
      return;
    }
    const setterM = s.match(/^(?:(?:public|private|protected|static|readonly|override)\s+)*set\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/);
    if (setterM && setterM[1]) {
      const sName = setterM[1];
      const { params, minArgs } = parseParamList((setterM[2] || '').trim(), lineNum, true);
      const sType = params[0]?.type || 'any';
      const sRaw = params[0]?.rawType || sType;
      if (!propMap.has(sName)) {
        propMap.set(sName, { type: sType, rawType: sRaw, optional: false });
      }
      fns.set(clsName + '.set.' + sName, {
        name: clsName + '.' + sName,
        params,
        minArgs,
        returnType: 'void',
        rawReturnType: 'void',
        typeParams: [],
        line: lineNum,
        hasValueReturn: true,
      });
      return;
    }
    const idxM = s.match(/^(?:readonly\s+)?\[\s*[A-Za-z_$][\w$]*\s*:\s*(?:string|number|symbol|any)\s*\]\s*:\s*([^;=]+)$/);
    if (idxM && idxM[1]) {
      const rawT = idxM[1].trim();
      propMap.set('__index__', { type: resolveAlias(rawT), rawType: rawT, optional: true });
      return;
    }
    const compM = s.match(/^(?:(?:readonly|public|private|protected|static)\s+)*\[\s*([A-Za-z_$][\w$]*)\s*\](\?)?\s*:\s*([^;=]+)(?:\s*=\s*[\s\S]+)?$/);
    if (compM && compM[1] && compM[3]) {
      const rawT = compM[3].trim();
      propMap.set(`[${compM[1]}]`, { type: resolveAlias(rawT), rawType: rawT, optional: Boolean(compM[2]) });
      propMap.set('__index__', { type: resolveAlias(rawT), rawType: rawT, optional: true });
      return;
    }
    const methodHdrM = s.match(/^(?:(?:public|private|protected|static|async|readonly|abstract|override)\s+)*\*?\s*([A-Za-z_$][\w$]*)\s*(<[\s\S]*>)?\s*\(/);
    if (methodHdrM && methodHdrM[1] && !RESERVED_WORDS.has(methodHdrM[1])) {
      const mName = methodHdrM[1];
      let openP = -1, ad = 0;
      for (let k = s.indexOf(mName) + mName.length; k < s.length; k++) {
        if (s[k] === '<') ad++;
        else if (s[k] === '>' && s[k - 1] !== '=') ad = Math.max(0, ad - 1);
        else if (s[k] === '(' && ad === 0) { openP = k; break; }
      }
      const typeParamStr = openP > 0 ? s.slice(s.indexOf(mName) + mName.length, openP).trim() : '';
      const mTypeParams = typeParamStr.startsWith('<') ? parseTypeParams(typeParamStr) : [];
      const closeP = openP > 0 ? findBalancedParen(s, openP) : -1;
      if (closeP > openP) {
        const paramStr = s.slice(openP + 1, closeP).trim();
        const afterClose = s.slice(closeP + 1).trim();
        const retM = afterClose.match(/^:\s*([^{;]+?)(?:\s*(?:\{[\s\S]*|;))?$/);
        const rawRetType = mName === 'constructor' ? 'void' : (retM && retM[1] ? retM[1].trim() : 'any');
        const retType = mName === 'constructor' ? 'void' : resolveAlias(rawRetType);
        const { params, minArgs } = parseParamList(paramStr, lineNum, true);
        if (mName === 'constructor') {
          splitTopLevelDecl(paramStr).forEach((rawP, idx) => {
            const pTrim = rawP.trim();
            const pInfo = params[idx];
            if (/^(?:(?:public|private|protected|readonly|override)\s+)+/.test(pTrim) && pInfo) {
              propMap.set(pInfo.name, { type: pInfo.type, rawType: pInfo.rawType || pInfo.type, optional: Boolean(pInfo.optional) });
            }
          });
        } else {
          const fnShapeStr = `(${params.map(p => `${p.name}${p.optional ? '?' : ''}:${p.type}`).join(',')})=>${retType}`;
          if (!propMap.has(mName)) {
            propMap.set(mName, { type: fnShapeStr, rawType: fnShapeStr, optional: false });
          }
        }
        const isAbstractOrOverload = /^\s*(?:(?:public|private|protected|static|async|readonly|override)\s+)*abstract\b/.test(s) || /;\s*$/.test(afterClose);
        const hasValRet = isAbstractOrOverload || /\breturn\s+[^;}\s]/.test(s);
        fns.set(clsName + '.' + mName, {
          name: clsName + '.' + mName,
          params,
          minArgs,
          returnType: retType,
          rawReturnType: rawRetType,
          typeParams: mTypeParams,
          line: lineNum,
          hasValueReturn: hasValRet,
        });
        return;
      }
    }
    if (s.includes('(') && !s.includes('=>') && (!s.includes('=') || s.indexOf('(') < s.indexOf('='))) return;
    const cleaned = s.replace(/^(?:(?:readonly|public|private|protected|static|abstract|override)\s+)+/, '');
    const pm = cleaned.match(/^([A-Za-z_$][\w$]*)(\?)?\s*:\s*((?:[^=]|=>)+?)(?:\s*=\s*(?!=|>)[\s\S]+)?$/);
    if (pm && pm[1] && pm[3]) {
      const rawFT = pm[3].trim();
      propMap.set(pm[1], { type: resolveAlias(rawFT), rawType: rawFT, optional: Boolean(pm[2]) });
      return;
    }
    const initM = cleaned.match(/^([A-Za-z_$][\w$]*)\s*=\s*(.+)$/);
    if (initM && initM[1] && initM[2]) {
      const savedDiagLen = diagnostics.length;
      const infT = inferType(initM[2].trim(), lineNum);
      diagnostics.length = savedDiagLen;
      propMap.set(initM[1], { type: infT, rawType: infT, optional: false });
    }
  }

  // Pass 1: Collect interfaces, classes, type aliases & function signatures
  let activeInterface: Map<string, { type: string; rawType: string; optional: boolean }> | null = null;
  let activeInterfaceName = '';
  let activeInterfaceIsClass = false;
  let activeInterfaceDepth = 0;
  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const raw = stripInlineCommentSafe(lines[i]).trim();
    if (!raw || raw.startsWith('@')) continue;

    if (activeInterface) {
      const depthBefore = activeInterfaceDepth;
      for (let k = 0; k < raw.length; k++) {
        const ch = raw[k];
        if (ch === '"' || ch === "'" || ch === '`') { k = skipString(raw, k) - 1; continue; }
        if (ch === '{') activeInterfaceDepth++;
        else if (ch === '}') activeInterfaceDepth--;
      }
      if (depthBefore === 1) {
        const memberPart = activeInterfaceDepth <= 0 && raw.includes('}') ? raw.slice(0, raw.lastIndexOf('}')).trim() : raw;
        if (memberPart) {
          if (activeInterfaceIsClass && /^(?:(?:public|private|protected|static|async|readonly|abstract|get|set)\s+)*[A-Za-z_$][\w$]*\s*(?:<[\s\S]*>)?\s*\(/.test(memberPart)) {
            parseClassTopMember(memberPart, activeInterface, activeInterfaceName, lineNum);
          } else {
            const activeIfaceMap = activeInterface;
            memberPart.split(/[;,]/).map(s => s.trim()).filter(Boolean).forEach(mem => {
              parseClassTopMember(mem, activeIfaceMap, activeInterfaceName, lineNum);
            });
          }
        }
      }
      // Also record `this.prop = ...` inside class methods/constructors if not already declared
      if (activeInterfaceIsClass) {
        const thisAssignRe = /\bthis\.([A-Za-z_$][\w$]*)\s*=\s*(?!=)/g;
        let tm;
        while ((tm = thisAssignRe.exec(raw))) {
          if (tm[1] && !activeInterface.has(tm[1])) {
            activeInterface.set(tm[1], { type: 'any', rawType: 'any', optional: false });
          }
        }
      }
      if (activeInterfaceDepth <= 0) {
        activeInterface = null;
        activeInterfaceName = '';
        activeInterfaceIsClass = false;
        activeInterfaceDepth = 0;
      }
      continue;
    }

    const nsKwM = raw.match(/^(?:export\s+)?(?:declare\s+)?(?:namespace|module)\s+([A-Za-z_$][\w$]*)/);
    if (nsKwM && nsKwM[1]) {
      enumsSet.add(nsKwM[1]);
      continue;
    }

    const ifaceKwM = raw.match(/^(?:export\s+)?(?:declare\s+)?(abstract\s+)?(interface|class)\s+([A-Za-z_$][\w$]*)/);
    if (ifaceKwM && ifaceKwM[3]) {
      const isAbstract = Boolean(ifaceKwM[1]);
      const isClass = ifaceKwM[2] === 'class';
      const ifaceName = ifaceKwM[3];
      if (isClass && isAbstract) {
        abstractClasses.add(ifaceName);
      }
      let pos = ifaceKwM[0].length;
      while (pos < raw.length && isWS(raw[pos])) pos++;
      let tParamStr = '';
      if (raw[pos] === '<') {
        let ad = 1, k = pos + 1;
        while (k < raw.length && ad > 0) {
          const ch = raw[k];
          if (ch === '"' || ch === "'" || ch === '`') { k = skipString(raw, k); continue; }
          if (ch === '<') ad++;
          else if (ch === '>' && raw[k - 1] !== '=') ad--;
          k++;
        }
        if (ad === 0) {
          tParamStr = raw.slice(pos, k);
          pos = k;
        }
      }
      const tParams = parseTypeParams(tParamStr);
      if (tParams.length > 0) interfaceTypeParams.set(ifaceName, tParams);
      const afterTParams = raw.slice(pos);
      const braceOpenIdx = afterTParams.indexOf('{');
      if (braceOpenIdx >= 0) {
        const headerTail = afterTParams.slice(0, braceOpenIdx);
        const extM = headerTail.match(/\bextends\s+([A-Za-z_$][\w$]*)/);
        const parentName = extM ? extM[1] : null;
        if (isClass) {
          const implM = headerTail.match(/\bimplements\s+([^{]+)/);
          if (implM && implM[1]) {
            const implList = splitTopLevelDecl(implM[1].trim()).map(s => s.replace(/<[\s\S]*>$/, '').trim()).filter(Boolean);
            if (implList.length > 0) {
              classImplements.set(ifaceName, { interfaces: implList, line: lineNum });
            }
          }
        }
        const rest = afterTParams.slice(braceOpenIdx + 1).trim();
        const propMap = new Map<string, PropShapeInfo>();
        interfaces.set(ifaceName, propMap);
        if (parentName) {
          classParents.set(ifaceName, parentName);
        }
        let d = 1;
        for (let k = 0; k < rest.length; k++) {
          const ch = rest[k];
          if (ch === '"' || ch === "'" || ch === '`') { k = skipString(rest, k) - 1; continue; }
          if (ch === '{') d++;
          else if (ch === '}') d--;
        }
        if (d <= 0 && rest.includes('}')) {
          const inner = rest.slice(0, rest.lastIndexOf('}')).trim();
          inner.split(/[;,]/).map(s => s.trim()).filter(Boolean).forEach(mem => {
            parseClassTopMember(mem, propMap, ifaceName, lineNum);
          });
        } else {
          activeInterface = propMap;
          activeInterfaceName = ifaceName;
          activeInterfaceIsClass = isClass;
          activeInterfaceDepth = d;
        }
        continue;
      }
    }

    const enumMatch = raw.match(/^(?:export\s+)?(?:const\s+)?enum\s+([A-Za-z_$][\w$]*)\b/);
    if (enumMatch && enumMatch[1]) {
      const enumName = enumMatch[1];
      enumsSet.add(enumName);
      const members = new Set<string>();
      const valTypes = new Set<'number' | 'string'>();
      let enumScan = raw.slice(raw.indexOf('{') >= 0 ? raw.indexOf('{') + 1 : enumMatch[0].length);
      let scanIdx = i;
      while (!enumScan.includes('}') && scanIdx + 1 < lines.length) {
        scanIdx++;
        enumScan += ' ' + stripInlineCommentSafe(lines[scanIdx]).trim();
      }
      const closeBrace = enumScan.indexOf('}');
      const bodyStr = (closeBrace >= 0 ? enumScan.slice(0, closeBrace) : enumScan).trim();
      splitTopLevelDecl(bodyStr).forEach(entry => {
        const em = entry.trim().match(/^([A-Za-z_$][\w$]*)(?:\s*=\s*([\s\S]+))?$/);
        if (em && em[1]) {
          members.add(em[1]);
          if (em[2]) {
            const initTrim = em[2].trim();
            if (/^(?:"[^"]*"|'[^']*'|`[^`]*`)$/.test(initTrim)) {
              valTypes.add('string');
            } else {
              valTypes.add('number');
            }
          } else {
            valTypes.add('number');
          }
        }
      });
      if (valTypes.size === 0) valTypes.add('number');
      enumMembers.set(enumName, members);
      enumValueTypes.set(enumName, valTypes);
      continue;
    }

    // Match `type Name = ...` or `type Name<T extends ..., U = ...> = ...` (single-line or multi-line)
    const typeHdrM = raw.match(/^(?:export\s+)?type\s+([A-Za-z_$][\w$]*)/);
    if (typeHdrM && typeHdrM[1]) {
      const aliasName = typeHdrM[1];
      let fullTypeDecl = raw;
      let scanIdx = i;
      const countTypeDepth = (str: string) => {
        let d = 0, ad = 0, seenEq = false;
        let p = typeHdrM[0].length;
        while (p < str.length && isWS(str[p])) p++;
        if (str[p] === '<') {
          let pad = 1; p++;
          while (p < str.length && pad > 0) {
            if (str[p] === '"' || str[p] === "'" || str[p] === '`') { p = skipString(str, p); continue; }
            if (str[p] === '<') pad++;
            else if (str[p] === '>' && str[p - 1] !== '=') pad--;
            p++;
          }
        }
        while (p < str.length && isWS(str[p])) p++;
        if (str[p] === '=' && str[p + 1] !== '=' && str[p + 1] !== '>') {
          seenEq = true;
          p++;
        }
        for (; p < str.length; p++) {
          const ch = str[p];
          if (ch === '"' || ch === "'" || ch === '`') { p = skipString(str, p) - 1; continue; }
          if (ch === '(' || ch === '[' || ch === '{') d++;
          else if (ch === ')' || ch === ']' || ch === '}') d = Math.max(0, d - 1);
          else if (ch === '<') ad++;
          else if (ch === '>' && str[p - 1] !== '=') ad = Math.max(0, ad - 1);
        }
        return { d, ad, seenEq };
      };
      let st = countTypeDepth(fullTypeDecl);
      while (scanIdx + 1 < lines.length) {
        const curTrim = fullTypeDecl.trim();
        const nextClean = stripInlineCommentSafe(lines[scanIdx + 1]).trim();
        const continues =
          st.d > 0 ||
          st.ad > 0 ||
          (!/;\s*$/.test(curTrim) && (/[=|&?:]$|\bextends$/.test(curTrim) || /^(?:[|&?:]|extends\b)/.test(nextClean)));
        if (!continues) break;
        scanIdx++;
        fullTypeDecl += ' ' + nextClean;
        st = countTypeDepth(fullTypeDecl);
      }
      i = scanIdx;
      // Extract optional <...> and = rhs
      let p = typeHdrM[0].length;
      while (p < fullTypeDecl.length && isWS(fullTypeDecl[p])) p++;
      let tParamStr = '';
      if (fullTypeDecl[p] === '<') {
        let pad = 1, k = p + 1;
        while (k < fullTypeDecl.length && pad > 0) {
          if (fullTypeDecl[k] === '"' || fullTypeDecl[k] === "'" || fullTypeDecl[k] === '`') { k = skipString(fullTypeDecl, k); continue; }
          if (fullTypeDecl[k] === '<') pad++;
          else if (fullTypeDecl[k] === '>' && fullTypeDecl[k - 1] !== '=') pad--;
          k++;
        }
        if (pad === 0) {
          tParamStr = fullTypeDecl.slice(p, k);
          p = k;
        }
      }
      while (p < fullTypeDecl.length && isWS(fullTypeDecl[p])) p++;
      if (fullTypeDecl[p] === '=') {
        const rhsType = fullTypeDecl.slice(p + 1).replace(/;\s*$/, '').trim();
        const tParams = parseTypeParams(tParamStr);
        if (tParams.length > 0) {
          genericTypeAliases.set(aliasName, { typeParams: tParams, body: rhsType, line: lineNum });
        } else {
          typeAliases.set(aliasName, rhsType);
        }
        continue;
      }
    }

    const fnMatch = raw.match(/^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)/);
    if (fnMatch && fnMatch[1] && raw.indexOf('(') >= 0) {
      const fnName = fnMatch[1];
      let headerStr = raw;
      let scanLine = i;
      let openP = -1;
      const findFnOpenParen = (str: string) => {
        let pos = fnMatch[0].length;
        while (pos < str.length && isWS(str[pos])) pos++;
        if (str[pos] === '<') {
          let ad = 1, k = pos + 1;
          while (k < str.length && ad > 0) {
            if (str[k] === '"' || str[k] === "'" || str[k] === '`') { k = skipString(str, k); continue; }
            if (str[k] === '<') ad++;
            else if (str[k] === '>' && str[k - 1] !== '=') ad--;
            k++;
          }
          pos = k;
        }
        return str.indexOf('(', pos);
      };
      openP = findFnOpenParen(headerStr);
      while ((openP < 0 || findBalancedParen(headerStr, openP) < 0) && scanLine + 1 < lines.length) {
        scanLine++;
        headerStr += ' ' + stripInlineCommentSafe(lines[scanLine]).trim();
        openP = findFnOpenParen(headerStr);
      }
      const closeP = openP >= 0 ? findBalancedParen(headerStr, openP) : -1;
      if (closeP > openP) {
        const tParamRegion = headerStr.slice(fnMatch[0].length, openP).trim();
        const fnTParams = tParamRegion.startsWith('<') ? parseTypeParams(tParamRegion) : [];
        const paramStr = headerStr.slice(openP + 1, closeP).trim();
        const afterClose = headerStr.slice(closeP + 1).trim();
        const retM = afterClose.match(/^:\s*([^{]+?)(?:\s*\{[\s\S]*)?$/);
        const rawRetType = (retM && retM[1]) ? retM[1].trim() : 'any';
        const tempEnv = new Map<string, string>();
        fnTParams.forEach(tp => tempEnv.set(tp.name, tp.name));
        const retType = retM ? resolveAlias(rawRetType, tempEnv) : 'any';
        const { params, minArgs } = parseParamList(paramStr, lineNum, true);
        fns.set(fnName, {
          name: fnName,
          params,
          minArgs,
          returnType: retType,
          rawReturnType: rawRetType,
          typeParams: fnTParams,
          line: lineNum,
          hasValueReturn: false,
        });
      }
    }
  }

  // Materialize non-generic object/mapped/utility type aliases into `interfaces` after all Pass 1 declarations are known
  typeAliases.forEach((rhs, aliasName) => {
    const evaluated = evaluateType(rhs, new Map(), 0, new Set([aliasName]));
    typeAliases.set(aliasName, evaluated);
    if (evaluated.startsWith('{') && evaluated.endsWith('}') && !interfaces.has(aliasName)) {
      interfaces.set(aliasName, parseObjectShapeLiteral(evaluated));
    }
  });

  // Validate class `implements` contracts against target interfaces
  classImplements.forEach(({ interfaces: implList, line: clsLine }, clsName) => {
    const clsShape = getInterfaceShape(clsName);
    implList.forEach(ifaceName => {
      const targetShape = getInterfaceShape(ifaceName);
      if (!targetShape) return;
      targetShape.forEach((propInfo, propName) => {
        if (propName.startsWith('__')) return;
        const hasMember = (clsShape && clsShape.has(propName)) || Boolean(getClassMethodSig(clsName, propName));
        if (!hasMember && !propInfo.optional) {
          addDiag(clsLine, 'TS2420', `类 "${clsName}" 错误实现接口 "${ifaceName}": 缺少属性或方法 "${propName}"`);
        } else if (clsShape && clsShape.has(propName)) {
          const clsMember = clsShape.get(propName);
          if (clsMember && clsMember.type !== 'any' && propInfo.type !== 'any' && !isTsAssignable(clsMember.type, propInfo.type)) {
            addDiag(clsLine, 'TS2420', `类 "${clsName}" 错误实现接口 "${ifaceName}": 属性 "${propName}" 的类型 "${clsMember.type}" 不能分配给类型 "${propInfo.type}"`);
          }
        }
      });
    });
  });

  // Pass 2: Check statements, declarations, reassignments, returns, and calls line-by-line
  let currentFn: FnSigInfo | null = null;
  const fnScopeStack: Array<{
    fn: FnSigInfo | null;
    startDepth: number;
    prevEnv: Map<string, VarEnvInfo>;
    prevTypeParams: Map<string, string>;
  }> = [];
  const switchStack: Array<{
    expr: string;
    startDepth: number;
    origInfo: VarEnvInfo;
    remainingTypes: string[];
  }> = [];
  let currentClass: string | null = null;
  let classStartBraceDepth = 0;
  let braceDepth = 0;
  let fnStartBraceDepth = 0;
  let inInterfaceBlock = false;
  let inInterfaceDepth = 0;
  let inEnumBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    let rawLine = lines[i] ?? '';
    const rawTrimmed = rawLine.trim();

    const callComment = rawTrimmed.match(/^\/\/\s*调用[:：]\s*(.+)$/);
    if (callComment && callComment[1]) {
      inferType(callComment[1].trim(), lineNum);
      continue;
    }

    let trimmed = stripInlineCommentSafe(rawLine).trim();
    if (!trimmed || trimmed.startsWith('@')) continue;

    // Handle `import ... from '...'`
    if (/^import\b/.test(trimmed)) {
      const impMatch = trimmed.replace(/;$/, '').trim().match(/^import\s+([\s\S]+?)\s+from\s+(['"])([^'"]+)\2\s*$/);
      if (impMatch) {
        const clause = (impMatch[1] || '').trim();
        const modSpec = (impMatch[3] || '').trim();
        const isFsRoot = modSpec === 'fs' || modSpec === 'node:fs';
        const isFsPromises = modSpec === 'fs/promises' || modSpec === 'node:fs/promises';
        const modType = isFsPromises ? '__FsPromises__' : (isFsRoot ? '__FsModule__' : 'any');
        const registerNamedBindings = (braceStr: string) => {
          const inner = braceStr.replace(/^\{|\}$/g, '').trim();
          if (!inner) return;
          inner.split(',').forEach(rawSpec => {
            const spec = rawSpec.trim().replace(/^type\s+/, '');
            if (!spec) return;
            const asM = spec.match(/^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/);
            const imported = asM && asM[1] ? asM[1] : spec;
            const local = asM && asM[2] ? asM[2] : spec;
            if (!/^[A-Za-z_$][\w$]*$/.test(local)) return;
            const bType = (isFsRoot && imported === 'promises') ? '__FsPromises__' : 'any';
            env.set(local, { type: bType, isConst: true, line: lineNum, declaredType: bType });
          });
        };
        const nsM = clause.match(/^\*\s+as\s+([A-Za-z_$][\w$]*)$/);
        if (nsM && nsM[1]) {
          env.set(nsM[1], { type: modType, isConst: true, line: lineNum, declaredType: modType });
        } else if (clause.startsWith('{') && clause.endsWith('}')) {
          registerNamedBindings(clause);
        } else {
          const defNamedM = clause.match(/^([A-Za-z_$][\w$]*)\s*,\s*(\{[\s\S]+\})$/);
          if (defNamedM && defNamedM[1] && defNamedM[2]) {
            env.set(defNamedM[1], { type: modType, isConst: true, line: lineNum, declaredType: modType });
            registerNamedBindings(defNamedM[2]);
          } else if (/^[A-Za-z_$][\w$]*$/.test(clause)) {
            env.set(clause, { type: modType, isConst: true, line: lineNum, declaredType: modType });
          }
        }
      }
      continue;
    }

    // Handle `declare const/let/var/function/class/namespace`
    if (/^declare\b/.test(trimmed)) {
      const declVarM = trimmed.match(/^declare\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::\s*([^=;]+))?/);
      if (declVarM && declVarM[1]) {
        const dType = declVarM[2] ? resolveAlias(declVarM[2].trim()) : 'any';
        env.set(declVarM[1], { type: dType, isConst: true, line: lineNum, declaredType: dType });
      }
      continue;
    }

    // Handle `namespace Name {`
    const nsOpenM = trimmed.match(/^(?:export\s+)?(?:namespace|module)\s+([A-Za-z_$][\w$]*)\s*\{/);
    if (nsOpenM && nsOpenM[1]) {
      env.set(nsOpenM[1], { type: 'any', isConst: true, line: lineNum, declaredType: 'any' });
      for (let k = 0; k < rawLine.length; k++) {
        const ch = rawLine[k];
        if (ch === '"' || ch === "'" || ch === '`') { k = skipString(rawLine, k) - 1; continue; }
        if (ch === '/' && rawLine[k + 1] === '/') break;
        if (ch === '{') braceDepth++;
        else if (ch === '}') braceDepth = Math.max(0, braceDepth - 1);
      }
      continue;
    }

    if (inInterfaceBlock) {
      for (let k = 0; k < trimmed.length; k++) {
        if (trimmed[k] === '{') inInterfaceDepth++;
        else if (trimmed[k] === '}') inInterfaceDepth--;
      }
      if (inInterfaceDepth <= 0) inInterfaceBlock = false;
      continue;
    }
    if (inEnumBlock) {
      if (trimmed.includes('}')) inEnumBlock = false;
      continue;
    }
    if (/^(?:export\s+)?interface\s+[A-Za-z_$][\w$]*/.test(trimmed)) {
      let d = 0;
      for (let k = 0; k < trimmed.length; k++) {
        if (trimmed[k] === '{') d++;
        else if (trimmed[k] === '}') d--;
      }
      if (d > 0) {
        inInterfaceBlock = true;
        inInterfaceDepth = d;
      }
      continue;
    }
    if (/^(?:export\s+)?(?:const\s+)?enum\s+[A-Za-z_$][\w$]*\s*\{/.test(trimmed)) {
      if (!trimmed.includes('}')) inEnumBlock = true;
      continue;
    }
    if (/^(?:export\s+)?type\s+[A-Za-z_$][\w$]*(?:\s*<|\s*=)/.test(trimmed)) {
      let fullT = trimmed;
      while (i + 1 < lines.length) {
        let d = 0, ad = 0;
        let eqPos = fullT.indexOf('=');
        for (let k = eqPos >= 0 ? eqPos + 1 : 0; k < fullT.length; k++) {
          const ch = fullT[k];
          if (ch === '"' || ch === "'" || ch === '`') { k = skipString(fullT, k) - 1; continue; }
          if (ch === '(' || ch === '[' || ch === '{') d++;
          else if (ch === ')' || ch === ']' || ch === '}') d = Math.max(0, d - 1);
          else if (ch === '<') ad++;
          else if (ch === '>' && fullT[k - 1] !== '=') ad = Math.max(0, ad - 1);
        }
        const curTrim = fullT.trim();
        const nextClean = stripInlineCommentSafe(lines[i + 1]).trim();
        const continues =
          d > 0 ||
          ad > 0 ||
          (!/;\s*$/.test(curTrim) && (/[=|&?:]$|\bextends$/.test(curTrim) || /^(?:[|&?:]|extends\b)/.test(nextClean)));
        if (!continues) break;
        i++;
        fullT += ' ' + nextClean;
      }
      continue;
    }

    const classOpen = trimmed.match(/^(?:export\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)(?:\s*<[\s\S]*>)?(?:\s+extends\s+[^{]+)?(?:\s+implements\s+[^{]+)?\s*\{/);
    const classExprOpen = !classOpen ? trimmed.match(/^(?:export\s+)?(const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*class\b(?:\s+[A-Za-z_$][\w$]*)?\s*\{/) : null;
    if (classOpen || classExprOpen) {
      const clsName = (classOpen ? classOpen[1] : (classExprOpen ? classExprOpen[2] : '')) || '';
      if (classExprOpen) {
        env.set(clsName, { type: clsName, isConst: classExprOpen[1] === 'const', line: lineNum, declaredType: clsName });
        if (!interfaces.has(clsName)) interfaces.set(clsName, new Map<string, PropShapeInfo>());
      }
      const clsTParams = interfaceTypeParams.get(clsName) || [];
      clsTParams.forEach((tp: { name: string }) => activeTypeParams.set(tp.name, tp.name));
      let d = 0;
      for (let k = 0; k < rawLine.length; k++) {
        const ch = rawLine[k];
        if (ch === '"' || ch === "'" || ch === '`') { k = skipString(rawLine, k) - 1; continue; }
        if (ch === '/' && rawLine[k + 1] === '/') break;
        if (ch === '{') d++;
        else if (ch === '}') d--;
      }
      if (d > 0) {
        currentClass = clsName;
        classStartBraceDepth = braceDepth;
        braceDepth += d;
        env.set('this', { type: clsName, isConst: true, line: lineNum, declaredType: clsName });
      }
      continue;
    }

    // Class field or abstract method declaration inside class body (at top level of class body)
    if (currentClass && braceDepth === classStartBraceDepth + 1) {
      if (/^(?:(?:public|private|protected|static|async|readonly)\s+)*abstract\s+[A-Za-z_$][\w$]*\s*(?:<[\s\S]*>)?\s*\(/.test(trimmed)) {
        continue;
      }
      if (/^static\s*\{/.test(trimmed)) {
        for (let k = 0; k < rawLine.length; k++) {
          if (rawLine[k] === '{') braceDepth++;
          else if (rawLine[k] === '}') braceDepth = Math.max(0, braceDepth - 1);
        }
        continue;
      }
      const isMethodHdr = /^(?:(?:public|private|protected|static|async|readonly|get|set)\s+)*[A-Za-z_$][\w$]*\s*(?:<[\s\S]*>)?\s*\(/.test(trimmed);
      if (!isMethodHdr && trimmed !== '}' && trimmed !== '};') {
        const cleanedField = trimmed.replace(/^(?:(?:readonly|public|private|protected|static|abstract)\s+)+/, '').replace(/;$/, '').trim();
        const fm = cleanedField.match(/^([A-Za-z_$][\w$]*)(\?)?(?:\s*:\s*((?:[^=]|=>)+?))?(?:\s*=\s*(?!=|>)([\s\S]+))?$/);
        if (fm) {
          const fName = fm[1];
          const declT = fm[3] ? resolveAlias(fm[3].trim()) : null;
          const initExpr = fm[4] ? fm[4].trim() : null;
          if (declT && initExpr) {
            const initT = inferType(initExpr, lineNum);
            if (!isExpressionAssignable(initExpr, initT, declT, lineNum)) {
              addDiag(lineNum, 'TS2322', `不能将类型 "${initT}" 分配给类型 "${declT}" (属性 "${currentClass}.${fName}")`);
            }
          }
          continue;
        }
      }
    }

    // Skip function overload signature without body: `function add(a: number, b: number): number;`
    if (/^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*[A-Za-z_$][\w$]*[\s\S]*;\s*$/.test(trimmed) && !trimmed.includes('{')) {
      continue;
    }

    const fnOpen = trimmed.match(/^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*(\*)?\s*([A-Za-z_$][\w$]*)\s*(?:<[\s\S]*>)?\s*\(/);
    const arrowFnOpen = !fnOpen ? trimmed.match(/^(?:export\s+)?(const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\s*\*?(?:\s+[A-Za-z_$][\w$]*)?\s*)?(?:(<[\s\S]*>)\s*)?\(([^)]*)\)\s*(?::\s*([^=]+?))?\s*(?:=>\s*)?\{/) : null;
    let validMethodOpen: string[] | null = null;
    if (!fnOpen && !arrowFnOpen && currentClass && braceDepth === classStartBraceDepth + 1) {
      const mHdr = trimmed.match(/^(?:(?:public|private|protected|static|async|readonly|override)\s+)*(?:(get|set)\s+)?(\*\s*)?([A-Za-z_$][\w$]*)\s*(?:<[\s\S]*>)?\s*\(/);
      if (mHdr && mHdr[3] && !RESERVED_WORDS.has(mHdr[3])) {
        const accessorKind = mHdr[1] || '';
        const mName = mHdr[3];
        let openP = -1, ad = 0;
        for (let k = trimmed.indexOf(mName) + mName.length; k < trimmed.length; k++) {
          if (trimmed[k] === '<') ad++;
          else if (trimmed[k] === '>' && trimmed[k - 1] !== '=') ad = Math.max(0, ad - 1);
          else if (trimmed[k] === '(' && ad === 0) { openP = k; break; }
        }
        const closeP = openP > 0 ? findBalancedParen(trimmed, openP) : -1;
        if (closeP > openP) {
          const afterP = trimmed.slice(closeP + 1).trim();
          const retM = afterP.match(/^(?::\s*([^{]+?))?\s*\{/);
          if (retM) {
            validMethodOpen = [trimmed, mName, trimmed.slice(openP + 1, closeP).trim(), retM[1] || '', accessorKind];
          }
        }
      }
    }
    const callbackArrowOpen = (!fnOpen && !arrowFnOpen && !validMethodOpen)
      ? (trimmed.match(/(?:async\s*)?(?:(<[A-Za-z_$][\w$,\s=<>]*>)\s*)?\(([^()]*)\)\s*(?::\s*([^{=]+?))?\s*=>\s*\{$/) ||
         trimmed.match(/(?:async\s*)?function\s*\*?(?:\s+[A-Za-z_$][\w$]*)?\s*(?:(<[A-Za-z_$][\w$,\s=<>]*>)\s*)?\(([^()]*)\)\s*(?::\s*([^{=]+?))?\s*\{$/))
      : null;

    let bodyStartInRaw = 0;
    if (fnOpen || arrowFnOpen || validMethodOpen || callbackArrowOpen) {
      if (fnOpen) {
        while (findBalancedParen(trimmed, trimmed.lastIndexOf('(')) < 0 && i + 1 < lines.length) {
          i++;
          rawLine += '\n' + lines[i];
          trimmed += ' ' + stripInlineCommentSafe(lines[i]).trim();
        }
      }
      if (arrowFnOpen && arrowFnOpen[2]) {
        const fnVarName = arrowFnOpen[2];
        const isConstFn = arrowFnOpen[1] === 'const';
        env.set(fnVarName, { type: 'function', isConst: isConstFn, line: lineNum, declaredType: 'function' });
      }
      // If a callback-opening line starts with `return ...` (e.g. `return new Promise(function(resolve) {`),
      // mark the enclosing function as having a value return before pushing the callback scope.
      if (callbackArrowOpen && currentFn && /^return\b/.test(trimmed)) {
        currentFn.hasValueReturn = true;
      }
      fnScopeStack.push({
        fn: currentFn,
        startDepth: fnStartBraceDepth,
        prevEnv: new Map(env),
        prevTypeParams: new Map(activeTypeParams),
      });
      const methodKey = validMethodOpen && validMethodOpen[1] && currentClass
        ? (validMethodOpen[4] === 'set'
            ? `${currentClass}.set.${validMethodOpen[1]}`
            : validMethodOpen[4] === 'get'
              ? `${currentClass}.get.${validMethodOpen[1]}`
              : `${currentClass}.${validMethodOpen[1]}`)
        : '';
      const existingFn: FnSigInfo | undefined = (fnOpen && fnOpen[2] ? fns.get(fnOpen[2]) : undefined) ||
        (methodKey && validMethodOpen ? (fns.get(methodKey) || fns.get(`${currentClass}.${validMethodOpen[1]}`)) : undefined);
      let activeFn: FnSigInfo;
      if (existingFn) {
        activeFn = existingFn;
        if (fnOpen && fnOpen[1] === '*') {
          activeFn.hasValueReturn = true;
        }
      } else if (callbackArrowOpen) {
        const cbTParams = callbackArrowOpen[1] ? parseTypeParams(callbackArrowOpen[1]) : [];
        const cbParamStr = (callbackArrowOpen[2] || '').trim();
        const cbRawRet = callbackArrowOpen[3] ? callbackArrowOpen[3].trim() : 'any';
        const cbRet = callbackArrowOpen[3] ? resolveAlias(cbRawRet) : 'any';
        const { params: cbParams, minArgs: cbMin } = parseParamList(cbParamStr, lineNum, false);
        activeFn = { name: '<callback>', params: cbParams, minArgs: cbMin, returnType: cbRet, rawReturnType: cbRawRet, typeParams: cbTParams, line: lineNum, hasValueReturn: false };
      } else {
        const fName = (fnOpen ? fnOpen[2] : (arrowFnOpen ? arrowFnOpen[2] : (methodKey || (currentClass + '.' + (validMethodOpen ? validMethodOpen[1] : ''))))) || '';
        let paramStr = '';
        let retType = 'any';
        let rawRetType = 'any';
        let fnTParams: Array<{ name: string; constraint: string | null; defaultType: string | null }> = [];
        if (fnOpen) {
          const openP = trimmed.indexOf('(');
          const closeP = findBalancedParen(trimmed, openP);
          if (closeP > openP) {
            paramStr = trimmed.slice(openP + 1, closeP).trim();
            const afterClose = trimmed.slice(closeP + 1).trim();
            const retM = afterClose.match(/^:\s*([^{]+?)(?:\s*\{[\s\S]*)?$/);
            if (retM && retM[1]) {
              rawRetType = retM[1].trim();
              retType = resolveAlias(rawRetType);
            }
          }
        } else if (arrowFnOpen) {
          fnTParams = arrowFnOpen[3] ? parseTypeParams(arrowFnOpen[3]) : [];
          paramStr = (arrowFnOpen[4] || '').trim();
          rawRetType = arrowFnOpen[5] ? arrowFnOpen[5].trim() : 'any';
          retType = arrowFnOpen[5] ? resolveAlias(rawRetType) : 'any';
        } else if (validMethodOpen) {
          paramStr = (validMethodOpen[2] || '').trim();
          const isCtorOrSetter = validMethodOpen[1] === 'constructor' || validMethodOpen[4] === 'set';
          rawRetType = isCtorOrSetter ? 'void' : (validMethodOpen[3] ? validMethodOpen[3].trim() : 'any');
          retType = isCtorOrSetter ? 'void' : resolveAlias(rawRetType);
        }
        const { params, minArgs } = parseParamList(paramStr, lineNum, Boolean(fnOpen || validMethodOpen));
        const isGen = Boolean((fnOpen && fnOpen[1] === '*') || /^Generator<|^AsyncGenerator<|^IterableIterator<|^Iterator</.test(retType));
        activeFn = { name: fName, params, minArgs, returnType: retType, rawReturnType: rawRetType, typeParams: fnTParams, line: lineNum, hasValueReturn: isGen };
        fns.set(fName, activeFn);
      }
      currentFn = activeFn;
      if (activeFn.typeParams) {
        activeFn.typeParams.forEach(tp => activeTypeParams.set(tp.name, tp.name));
      }
      activeFn.params.forEach(p => {
        env.set(p.name, { type: p.type, isConst: false, line: activeFn.line, declaredType: p.type });
      });
      fnStartBraceDepth = braceDepth;
      // Locate the function body's opening `{` (skipping `{...}` inside generic constraints, parameters, or return types)
      let openBraceIdx = -1;
      if (trimmed.endsWith('{')) {
        openBraceIdx = trimmed.lastIndexOf('{');
        bodyStartInRaw = rawLine.lastIndexOf('{');
      } else {
        let searchFrom = 0;
        const firstOpenP = trimmed.indexOf('(');
        if (firstOpenP >= 0) {
          const closeP = findBalancedParen(trimmed, firstOpenP);
          if (closeP > firstOpenP) searchFrom = closeP + 1;
        }
        let td = 0;
        for (let k = searchFrom; k < trimmed.length; k++) {
          const ch = trimmed[k];
          if (ch === '"' || ch === "'" || ch === '`') { k = skipString(trimmed, k) - 1; continue; }
          if (ch === '<' || ch === '(' || ch === '[') td++;
          else if ((ch === '>' && trimmed[k - 1] !== '=') || ch === ')' || ch === ']') td = Math.max(0, td - 1);
          else if (ch === '{' && td === 0) {
            openBraceIdx = k;
            break;
          }
        }
        if (openBraceIdx >= 0) {
          const suffix = trimmed.slice(openBraceIdx);
          const rawIdx = rawLine.lastIndexOf(suffix);
          bodyStartInRaw = rawIdx >= 0 ? rawIdx : rawLine.indexOf('{');
        }
      }
      const closeBraceIdx = trimmed.lastIndexOf('}');
      const bodyAfterOpenBrace = openBraceIdx >= 0 ? trimmed.slice(openBraceIdx + 1) : '';
      const rm = bodyAfterOpenBrace.match(/\breturn\b([^;}\n]*)/);
      if (rm && rm[1]?.trim()) {
        activeFn.hasValueReturn = true;
        const inlineRetExpr = rm[1].trim();
        const inlineRetT = inferType(inlineRetExpr, lineNum);
        const expRet = activeFn.returnType;
        const unwrappedExp = (expRet && expRet.startsWith('Promise<') && expRet.endsWith('>')) ? expRet.slice(8, -1) : expRet;
        if (expRet && expRet !== 'any' && !isExpressionAssignable(inlineRetExpr, inlineRetT, expRet, lineNum) && !isExpressionAssignable(inlineRetExpr, inlineRetT, unwrappedExp, lineNum)) {
          addDiag(lineNum, 'TS2322', `不能将返回值类型 "${inlineRetT}" 分配给函数 "${activeFn.name}" 声明的返回类型 "${expRet}"`);
        }
      }
      if (openBraceIdx >= 0 && closeBraceIdx > openBraceIdx) {
        const inlineBody = trimmed.slice(openBraceIdx + 1, closeBraceIdx).trim();
        inlineBody.split(';').map(s => s.trim()).filter(Boolean).forEach(stmt => {
          const inlineAssign = stmt.match(/^([A-Za-z_$][\w$!]*(?:\.[A-Za-z_$][\w$!]*|\s*\[[^\]]+\])*)\s*(\+=|-=|\*=|\/=|=(?!=))\s*([\s\S]+)$/);
          if (inlineAssign && inlineAssign[1] && inlineAssign[3]) {
            const lhs = inlineAssign[1].trim();
            const rhsExpr = inlineAssign[3].trim();
            const rhsT = inferType(rhsExpr, lineNum);
            if (lhs.includes('.') || lhs.includes('[')) {
              const lhsT = inferType(lhs, lineNum);
              if (lhsT !== 'any' && !isExpressionAssignable(rhsExpr, rhsT, lhsT, lineNum)) {
                addDiag(lineNum, 'TS2322', `不能将类型 "${rhsT}" 分配给类型 "${lhsT}" ("${lhs}")`);
              }
            } else if (/^[A-Za-z_$][\w$]*$/.test(lhs) && !isKnownIdentifier(lhs)) {
              addDiag(lineNum, 'TS2304', `找不到名称 "${lhs}"（变量未声明，请使用 let 或 const 声明）`);
            }
          }
        });
      }
    }

    for (let k = Math.max(0, bodyStartInRaw); k < rawLine.length; k++) {
      const ch = rawLine[k];
      if (ch === '"' || ch === "'" || ch === '`') { k = skipString(rawLine, k) - 1; continue; }
      if (ch === '/' && rawLine[k + 1] === '/') break;
      if (ch === '{') braceDepth++;
      else if (ch === '}') {
        braceDepth = Math.max(0, braceDepth - 1);
        const topSwitch = switchStack[switchStack.length - 1];
        if (topSwitch && braceDepth <= topSwitch.startDepth) {
          const sw = switchStack.pop();
          if (sw && sw.origInfo) {
            env.set(sw.expr, sw.origInfo);
          }
        }
        if (currentFn && braceDepth <= fnStartBraceDepth) {
          const isGenRet = /^Generator<|^AsyncGenerator<|^IterableIterator<|^Iterator</.test(currentFn.returnType);
          if (currentFn.returnType !== 'any' && currentFn.returnType !== 'void' && currentFn.returnType !== 'Promise<void>' && currentFn.returnType !== 'unknown' && !isGenRet && !currentFn.hasValueReturn) {
            addDiag(currentFn.line, 'TS2355', `函数 "${currentFn.name}" 声明返回类型为 "${currentFn.returnType}"，但缺少 return 返回值语句`);
          }
          const prev = fnScopeStack.pop();
          if (prev) {
            currentFn = prev.fn;
            fnStartBraceDepth = prev.startDepth;
            if (prev.prevEnv) {
              env.clear();
              prev.prevEnv.forEach((v, kName) => env.set(kName, v));
              if (currentClass) env.set('this', { type: currentClass, isConst: true, line: lineNum, declaredType: currentClass });
            }
            if (prev.prevTypeParams) {
              activeTypeParams.clear();
              prev.prevTypeParams.forEach((v, kName) => activeTypeParams.set(kName, v));
            }
          } else {
            currentFn = null;
          }
        }
        if (currentClass && braceDepth <= classStartBraceDepth) {
          const clsTParams = interfaceTypeParams.get(currentClass) || [];
          clsTParams.forEach((tp: { name: string }) => activeTypeParams.delete(tp.name));
          currentClass = null;
          env.delete('this');
        }
      }
    }
    if (fnOpen || arrowFnOpen || validMethodOpen || callbackArrowOpen) continue;

    // Catch clause: catch (e) {
    const catchM = trimmed.match(/^(?:}\s*)?catch\s*\(\s*([A-Za-z_$][\w$]*)(?:\s*:\s*[^)]+)?\s*\)/);
    if (catchM && catchM[1]) {
      env.set(catchM[1], { type: 'any', isConst: false, line: lineNum, declaredType: 'any' });
      continue;
    }

    // Pure structural braces / keywords: }, };, });, }, 20);, else {, try {, finally {, do {
    if (/^(?:\}[\s);,]*|\}\s*,\s*[\s\S]+\)\s*;?|\}\s*else\s*\{?|else\s*\{?|try\s*\{?|\}\s*finally\s*\{?|finally\s*\{?|do\s*\{?)$/.test(trimmed)) {
      continue;
    }

    // For-of / For-in loop header: for (const/let/var x of/in expr)
    const forOfInM = trimmed.match(/^for\s*\(\s*(?:(const|let|var)\s+)?(.+?)\s+(of|in)\s+([\s\S]+?)\)\s*\{?$/);
    if (forOfInM && forOfInM[2] && forOfInM[4]) {
      const kind = forOfInM[1] || null;
      const lhsRaw = forOfInM[2].trim();
      const mode = forOfInM[3];
      const rhsExpr = forOfInM[4].trim();
      const rhsT = inferType(rhsExpr, lineNum);
      let elemT = 'any';
      if (mode === 'in') {
        elemT = 'string';
      } else if (rhsT.endsWith('[]')) {
        elemT = rhsT.slice(0, -2);
      } else if (rhsT === 'string') {
        elemT = 'string';
      }
      if (kind) {
        const simpleVar = lhsRaw.match(/^([A-Za-z_$][\w$]*)(?:\s*:\s*([^=]+))?$/);
        if (simpleVar && simpleVar[1]) {
          const vName = simpleVar[1];
          const declT = simpleVar[2] ? resolveAlias(simpleVar[2].trim()) : elemT;
          env.set(vName, { type: declT, isConst: kind === 'const', line: lineNum, declaredType: declT });
        } else {
          const bound = new Set<string>();
          extractBindingNames(lhsRaw, bound);
          bound.forEach(vName => {
            env.set(vName, { type: 'any', isConst: kind === 'const', line: lineNum, declaredType: 'any' });
          });
        }
      } else if (/^[A-Za-z_$][\w$]*$/.test(lhsRaw)) {
        if (!isKnownIdentifier(lhsRaw)) {
          addDiag(lineNum, 'TS2304', `找不到名称 "${lhsRaw}"（变量未声明，请使用 let 或 const 声明）`);
        } else if (env.has(lhsRaw) && env.get(lhsRaw)?.isConst) {
          addDiag(lineNum, 'TS2588', `无法分配到 "${lhsRaw}"，因为它是常数 (const)`);
        }
      }
      continue;
    }

    // For-loop header: for (let i = 0; i < n; i++) or for (i = 0; i < n; i++)
    const forM = trimmed.match(/^for\s*\(\s*(?:(const|let|var)\s+)?([^;]*);([^;]*);([^)]*)\)/);
    if (forM && forM[2] !== undefined && forM[3] !== undefined && forM[4] !== undefined) {
      const kind = forM[1] || null;
      const initPart = forM[2].trim();
      if (kind && initPart) {
        const decls = splitTopLevel(initPart);
        decls.forEach(d => {
          const dm = d.trim().match(/^([A-Za-z_$][\w$]*)(?:\s*:\s*([^=]+))?\s*=\s*(.+)$/);
          if (dm && dm[1] && dm[3]) {
            const vName = dm[1];
            const declT = dm[2] ? resolveAlias(dm[2].trim()) : null;
            const initT = inferType(dm[3].trim(), lineNum);
            if (declT && !isTsAssignable(initT, declT)) {
              addDiag(lineNum, 'TS2322', `不能将类型 "${initT}" 分配给类型 "${declT}" (循环变量 "${vName}")`);
            }
            env.set(vName, { type: declT || initT, isConst: kind === 'const', line: lineNum });
          }
        });
      } else if (initPart) {
        splitTopLevel(initPart).forEach(d => {
          const am = d.trim().match(/^([A-Za-z_$][\w$]*)\s*=\s*(.+)$/);
          if (am && am[1] && am[2]) {
            inferType(am[2].trim(), lineNum);
            if (!isKnownIdentifier(am[1])) {
              addDiag(lineNum, 'TS2304', `找不到名称 "${am[1]}"（变量未声明，请使用 let 或 const 声明）`);
            } else if (env.has(am[1]) && env.get(am[1])?.isConst) {
              addDiag(lineNum, 'TS2588', `无法分配到 "${am[1]}"，因为它是常数 (const)`);
            }
          } else {
            inferType(d.trim(), lineNum);
          }
        });
      }
      if (forM[3].trim()) inferType(forM[3].trim(), lineNum);
      if (forM[4].trim()) {
        const updVar = forM[4].trim().match(/^([A-Za-z_$][\w$]*)\s*(?:\+\+|--|\+=|-=|=)/);
        if (updVar && updVar[1]) {
          if (!isKnownIdentifier(updVar[1])) {
            addDiag(lineNum, 'TS2304', `找不到名称 "${updVar[1]}"（变量未声明，请使用 let 或 const 声明）`);
          } else if (env.has(updVar[1]) && env.get(updVar[1])?.isConst) {
            addDiag(lineNum, 'TS2588', `无法分配到 "${updVar[1]}"，因为它是常数 (const)`);
          }
        }
      }
      continue;
    }

    // Variable declarations: const/let/var ... (supporting multi-line array/object/call expressions & destructuring)
    const varM = trimmed.match(/^(?:export\s+)?(const|let|var)\s+([\s\S]+?);?$/);
    if (varM) {
      const isConst = varM[1] === 'const';
      let rest = varM[2] || '';
      const countOpenBrackets = (str: string) => {
        let b = 0;
        for (let cIdx = 0; cIdx < str.length; cIdx++) {
          const ch = str[cIdx];
          if (ch === '"' || ch === "'" || ch === '`') { cIdx = skipString(str, cIdx) - 1; continue; }
          if (ch === '{' || ch === '[' || ch === '(') b++;
          else if (ch === '}' || ch === ']' || ch === ')') b--;
        }
        return b;
      };
      let openB = countOpenBrackets(rest);
      while ((openB > 0 || /[=.,+\-*/|&(\[]$/.test(rest.trim())) && i + 1 < lines.length) {
        const nextLineRaw = lines[i + 1] ?? '';
        const nextLineClean = stripInlineCommentSafe(nextLineRaw).trim();
        for (let k = 0; k < nextLineRaw.length; k++) {
          const ch = nextLineRaw[k];
          if (ch === '"' || ch === "'" || ch === '`') { k = skipString(nextLineRaw, k) - 1; continue; }
          if (ch === '/' && nextLineRaw[k + 1] === '/') break;
          if (ch === '{') braceDepth++;
          else if (ch === '}') braceDepth = Math.max(0, braceDepth - 1);
        }
        i++;
        rest += ' ' + nextLineClean;
        openB = countOpenBrackets(rest);
        if (openB <= 0 && /;\s*$/.test(nextLineClean)) break;
      }
      rest = rest.replace(/;\s*$/, '').trim();
      if (openB === 0) {
        const parts = splitTopLevelDecl(rest);
        parts.forEach(part => {
          const pTrim = part.trim();
          const pm = pTrim.match(/^([A-Za-z_$][\w$]*)(?:\s*:\s*((?:[^=]|=>)+?))?(?:\s*=\s*(?!=|>)([\s\S]+))?$/);
          if (pm && pm[1]) {
            const vName = pm[1];
            const declT = pm[2] ? resolveAlias(pm[2].trim()) : null;
            const initExpr = pm[3] ? pm[3].trim() : null;
            // Register inline generic or typed arrow function in `fns`
            if (initExpr) {
              const inlineArrowM = initExpr.match(/^(?:async\s+)?(?:(<[\s\S]*?>)\s*)?\(([^)]*)\)\s*(?::\s*((?:[^=]|=>)+?))?\s*=>\s*([\s\S]+)$/);
              if (inlineArrowM && inlineArrowM[2] !== undefined) {
                const arrowTParams = inlineArrowM[1] ? parseTypeParams(inlineArrowM[1]) : [];
                const arrowParamStr = inlineArrowM[2].trim();
                const arrowRawRet = inlineArrowM[3] ? inlineArrowM[3].trim() : null;
                const { params: aParams, minArgs: aMin } = parseParamList(arrowParamStr, lineNum, false);
                const aRet = arrowRawRet ? resolveAlias(arrowRawRet) : 'any';
                fns.set(vName, {
                  name: vName,
                  params: aParams,
                  minArgs: aMin,
                  returnType: aRet,
                  rawReturnType: arrowRawRet || aRet,
                  typeParams: arrowTParams,
                  line: lineNum,
                  hasValueReturn: true,
                });
              }
            }
            const narrowedPropKey = initExpr ? '__narrowed_prop_' + initExpr : '';
            let initT = initExpr ? inferType(initExpr, lineNum) : 'any';
            if (narrowedPropKey && env.has(narrowedPropKey)) {
              initT = (env.get(narrowedPropKey) || { type: 'any' }).type;
              env.delete(narrowedPropKey);
            }

            if (declT && initExpr) {
              if (initExpr.startsWith('{') && getInterfaceShape(declT)) {
                checkObjectLiteralAgainstShape(initExpr, declT, lineNum, `变量 "${vName}"`);
              } else if (declT.endsWith('[]') && splitTopLevelUnion(declT).length <= 1 && initExpr.startsWith('[')) {
                checkArrayElementsAgainst(initExpr, declT.slice(0, -2), lineNum, `变量 "${vName}" 的数组字面量中`);
              } else if (!isExpressionAssignable(initExpr, initT, declT, lineNum)) {
                addDiag(lineNum, 'TS2322', `不能将类型 "${initT}" 分配给类型 "${declT}" (变量 "${vName}")`);
              }
            }
            const litVal = isConst && initExpr ? inferLiteralType(initExpr) : null;
            env.set(vName, {
              type: declT || initT,
              isConst,
              line: lineNum,
              declaredType: declT || initT,
              literalType: litVal,
            });
          } else if (pTrim.startsWith('[') || pTrim.startsWith('{')) {
            let eqIdx = -1, colonIdx = -1, patEndIdx = -1, d = 0;
            for (let k = 0; k < pTrim.length; k++) {
              const ch = pTrim[k];
              if (ch === '"' || ch === "'" || ch === '`') { k = skipString(pTrim, k) - 1; continue; }
              if (ch === '(' || ch === '[' || ch === '{') d++;
              else if (ch === ')' || ch === ']' || ch === '}') {
                d--;
                if (d === 0 && patEndIdx < 0) patEndIdx = k;
              } else if (ch === ':' && d === 0 && patEndIdx > 0 && colonIdx < 0 && eqIdx < 0) {
                colonIdx = k;
              } else if (ch === '=' && d === 0 && pTrim[k + 1] !== '=' && pTrim[k + 1] !== '>') {
                eqIdx = k;
                break;
              }
            }
            if (eqIdx > 0) {
              const rhsExpr = pTrim.slice(eqIdx + 1).trim();
              const rhsT = inferType(rhsExpr, lineNum);
              if (colonIdx > 0 && colonIdx < eqIdx) {
                const declT = resolveAlias(pTrim.slice(colonIdx + 1, eqIdx).trim());
                if (declT && declT !== 'any') {
                  if (rhsExpr.startsWith('{') && getInterfaceShape(declT)) {
                    checkObjectLiteralAgainstShape(rhsExpr, declT, lineNum, '解构声明');
                  } else if (!isExpressionAssignable(rhsExpr, rhsT, declT, lineNum)) {
                    addDiag(lineNum, 'TS2322', `不能将类型 "${rhsT}" 分配给类型 "${declT}" (解构声明)`);
                  }
                }
              }
            }
            const patOnly = colonIdx > 0 ? pTrim.slice(0, colonIdx) : (eqIdx > 0 ? pTrim.slice(0, eqIdx) : pTrim);
            const bound = new Set<string>();
            extractBindingNames(patOnly, bound);
            bound.forEach(vName => {
              env.set(vName, { type: 'any', isConst, line: lineNum, declaredType: 'any' });
            });
          }
        });
      }
      continue;
    }

    // Return statement
    const retM = trimmed.match(/^return(?:\s+([\s\S]+?))?;?$/);
    if (retM) {
      const retExpr = retM[1] ? retM[1].trim() : '';
      const retT = retExpr ? inferType(retExpr, lineNum) : 'void';
      if (currentFn) {
        if (retExpr) currentFn.hasValueReturn = true;
        const expectedRet = currentFn.returnType;
        if (expectedRet && expectedRet !== 'any') {
          const promiseInnerM = expectedRet.match(/^Promise<([\s\S]+)>$/);
          const genInnerM = expectedRet.match(/^(?:Async)?Generator<([\s\S]+)>$/);
          let unwrappedExpected = (promiseInnerM && promiseInnerM[1]) ? promiseInnerM[1] : expectedRet;
          if (genInnerM && genInnerM[1]) {
            const genArgs = splitTopLevelDecl(genInnerM[1]);
            unwrappedExpected = genArgs[1] ? genArgs[1].trim() : 'any';
          }
          if (unwrappedExpected !== 'any') {
            if (retExpr.startsWith('{') && getInterfaceShape(unwrappedExpected)) {
              checkObjectLiteralAgainstShape(retExpr, unwrappedExpected, lineNum, `函数 "${currentFn.name}" 返回值`);
            } else if (unwrappedExpected.endsWith('[]') && splitTopLevelUnion(unwrappedExpected).length <= 1 && retExpr.startsWith('[')) {
              checkArrayElementsAgainst(retExpr, unwrappedExpected.slice(0, -2), lineNum, `函数 "${currentFn.name}" 返回数组中`);
            } else if (!isExpressionAssignable(retExpr, retT, expectedRet, lineNum) && !isExpressionAssignable(retExpr, retT, unwrappedExpected, lineNum)) {
              addDiag(lineNum, 'TS2322', `不能将返回值类型 "${retT}" 分配给函数 "${currentFn.name}" 声明的返回类型 "${expectedRet}"`);
            }
          }
        }
      }
      continue;
    }

    // Throw statement
    const throwM = trimmed.match(/^throw\s+([\s\S]+?);?$/);
    if (throwM && throwM[1]) {
      inferType(throwM[1].trim(), lineNum);
      continue;
    }

    // Switch / case / default statements with exhaustiveness narrowing
    const switchM = trimmed.match(/^switch\s*\(([\s\S]+)\)\s*\{?$/);
    if (switchM && switchM[1]) {
      const swExpr = switchM[1].trim();
      inferType(swExpr, lineNum);
      if (/^[A-Za-z_$][\w$]*$/.test(swExpr) && env.has(swExpr)) {
        const origInfo = env.get(swExpr) || { type: 'any' };
        const parts = splitTopLevelUnion(resolveAlias(origInfo.type)).map(p => p.trim()).filter(Boolean);
        switchStack.push({
          expr: swExpr,
          startDepth: braceDepth - (trimmed.endsWith('{') ? 1 : 0),
          origInfo: { ...origInfo },
          remainingTypes: parts,
        });
      }
      continue;
    }
    const caseM = trimmed.match(/^case\s+([^:]+):(.*)$/);
    if (caseM && caseM[1]) {
      const caseExpr = caseM[1].trim();
      const caseT = inferType(caseExpr, lineNum);
      const caseLit = inferLiteralType(caseExpr) || caseT;
      const sw = switchStack[switchStack.length - 1];
      if (sw) {
        sw.remainingTypes = sw.remainingTypes.filter(t => t !== caseLit && t !== caseExpr);
        if (env.has(sw.expr)) {
          env.set(sw.expr, { ...sw.origInfo, type: caseLit });
        }
      }
      const caseRest = (caseM[2] || '').trim();
      if (caseRest) {
        const inlineRet = caseRest.match(/^return(?:\s+([\s\S]+?))?;?$/);
        if (inlineRet) {
          const rExpr = inlineRet[1] ? inlineRet[1].trim() : '';
          const rT = rExpr ? inferType(rExpr, lineNum) : 'void';
          if (currentFn) {
            if (rExpr) currentFn.hasValueReturn = true;
            const expectedRet = currentFn.returnType;
            if (expectedRet && expectedRet !== 'any' && !isExpressionAssignable(rExpr, rT, expectedRet, lineNum)) {
              addDiag(lineNum, 'TS2322', `不能将返回值类型 "${rT}" 分配给函数 "${currentFn.name}" 声明的返回类型 "${expectedRet}"`);
            }
          }
        }
      }
      continue;
    }
    const defaultM = trimmed.match(/^default\s*:(.*)$/);
    if (defaultM) {
      const sw = switchStack[switchStack.length - 1];
      if (sw) {
        const remT = sw.remainingTypes.length > 0 ? sw.remainingTypes.join('|') : 'never';
        if (env.has(sw.expr)) {
          env.set(sw.expr, { ...sw.origInfo, type: remT });
        }
      }
      continue;
    }

    const applyClauseNarrowing = (clauseStr: string, forEarlyExit: boolean) => {
      const c = clauseStr.trim();
      // User-defined type predicate call: `isNum(x)` or `!isNum(x)`
      const predCallM = c.match(/^(!)?\s*([A-Za-z_$][\w$]*)\s*\(\s*([A-Za-z_$][\w$]*)\s*\)$/);
      if (predCallM && predCallM[2] && predCallM[3]) {
        const isNegated = Boolean(predCallM[1]);
        const fnName = predCallM[2];
        const argVar = predCallM[3];
        const sig = fns.get(fnName);
        if (sig && sig.rawReturnType && env.has(argVar)) {
          const pm = sig.rawReturnType.match(/^([A-Za-z_$][\w$]*)\s+is\s+([\s\S]+)$/);
          if (pm && pm[2]) {
            const targetT = resolveAlias(pm[2].trim());
            const curInfo = env.get(argVar) || { type: 'any' };
            if ((!forEarlyExit && !isNegated) || (forEarlyExit && isNegated)) {
              env.set(argVar, { ...curInfo, type: targetT });
            } else if ((forEarlyExit && !isNegated) || (!forEarlyExit && isNegated)) {
              const rem = splitTopLevelUnion(resolveAlias(curInfo.type)).filter(u => u !== targetT);
              if (rem.length > 0) env.set(argVar, { ...curInfo, type: rem.join('|') });
            }
          }
        }
      }
      // `typeof x === "string"` / `typeof x !== "string"`
      const typeofM = c.match(/^typeof\s+([A-Za-z_$][\w$]*)\s*(===|!==)\s*["'](string|number|boolean|bigint|symbol|undefined|object|function)["']$/);
      if (typeofM && typeofM[1] && typeofM[2] && typeofM[3] && env.has(typeofM[1])) {
        const varName = typeofM[1];
        const op = typeofM[2];
        const primT = typeofM[3];
        const curInfo = env.get(varName) || { type: 'any' };
        if ((!forEarlyExit && op === '===') || (forEarlyExit && op === '!==')) {
          env.set(varName, { ...curInfo, type: primT });
        } else if ((forEarlyExit && op === '===') || (!forEarlyExit && op === '!==')) {
          const rem = splitTopLevelUnion(resolveAlias(curInfo.type)).filter(u => u !== primT);
          if (rem.length > 0) env.set(varName, { ...curInfo, type: rem.join('|') });
        }
      }
    };

    // Inline if (...) return / break / continue (with optional early-exit type narrowing)
    const inlineIfRet = trimmed.match(/^if\s*\((.+?)\)\s*(return(?:\s+([\s\S]+?))?|break|continue);?$/);
    if (inlineIfRet && inlineIfRet[1] && inlineIfRet[2]) {
      const condStr = inlineIfRet[1].trim();
      const actionKw = inlineIfRet[2];
      const retExpr = inlineIfRet[3] ? inlineIfRet[3].trim() : '';
      inferType(condStr, lineNum);
      if (actionKw.startsWith('return')) {
        const savedInlineNarrow = new Map<string, VarEnvInfo>();
        condStr.split('&&').forEach(clause => {
          const cm = clause.trim().match(/^([A-Za-z_$][\w$]*)\s*!==\s*(null|undefined)$/);
          if (cm && cm[1] && cm[2] && env.has(cm[1])) {
            const curInfo = env.get(cm[1]) || { type: 'any' };
            savedInlineNarrow.set(cm[1], curInfo);
            env.set(cm[1], { ...curInfo, type: stripNullableFromType(curInfo.type, cm[2]) });
          }
        });
        const retT = retExpr ? inferType(retExpr, lineNum) : 'void';
        savedInlineNarrow.forEach((prevInfo, k) => env.set(k, prevInfo));
        if (currentFn) {
          if (retExpr) currentFn.hasValueReturn = true;
          const expectedRet = currentFn.returnType;
          if (expectedRet && expectedRet !== 'any' && !isExpressionAssignable(retExpr, retT, expectedRet, lineNum)) {
            addDiag(lineNum, 'TS2322', `不能将返回值类型 "${retT}" 分配给函数 "${currentFn.name}" 声明的返回类型 "${expectedRet}"`);
          }
        }
      }
      // Early exit narrowing: if (x === null || ...) return/break/continue -> narrow x in subsequent code
      condStr.split('||').forEach(clause => {
        const cm = clause.trim().match(/^([A-Za-z_$][\w$]*)\s*===\s*(null|undefined)$/);
        const cmRev = !cm ? clause.trim().match(/^(null|undefined)\s*===\s*([A-Za-z_$][\w$]*)$/) : null;
        const negM = (!cm && !cmRev) ? clause.trim().match(/^!\s*([A-Za-z_$][\w$]*)$/) : null;
        const varName = cm ? cm[1] : (cmRev ? cmRev[2] : (negM ? negM[1] : null));
        if (varName && env.has(varName)) {
          const curInfo = env.get(varName) || { type: 'any' };
          let nextT = stripNullableFromType(curInfo.type, 'null');
          nextT = stripNullableFromType(nextT, 'undefined');
          env.set(varName, { ...curInfo, type: nextT });
        }
        applyClauseNarrowing(clause, true);
      });
      continue;
    }

    // If / while / else if conditions (including single-line bodies like `while (i >= 0) { i = i + 1; }` or `while (true) i = i + 1;`)
    const condPrefixM = trimmed.match(/^(?:}\s*)?(?:if|while|else\s+if)\s*\(/);
    if (condPrefixM) {
      const openIdx = trimmed.indexOf('(', condPrefixM[0].length - 1);
      const closeIdx = findBalancedParen(trimmed, openIdx);
      if (closeIdx > openIdx) {
        const condStr = trimmed.slice(openIdx + 1, closeIdx).trim();
        inferType(condStr, lineNum);
        const tail = trimmed.slice(closeIdx + 1).trim();
        if (tail && tail !== '{') {
          const bodyInner = (tail.startsWith('{') && tail.endsWith('}')) ? tail.slice(1, -1).trim() : tail;
          bodyInner.split(';').map(s => s.trim()).filter(Boolean).forEach(stmt => {
            const inlineAssign = stmt.match(/^([A-Za-z_$][\w$!]*(?:\.[A-Za-z_$][\w$!]*|\s*\[[^\]]+\])*)\s*(\+=|-=|\*=|\/=|=(?!=))\s*([\s\S]+)$/);
            if (inlineAssign && inlineAssign[1] && inlineAssign[3]) {
              const lhs = inlineAssign[1].trim();
              const rhsExpr = inlineAssign[3].trim();
              const rhsT = inferType(rhsExpr, lineNum);
              if (/^[A-Za-z_$][\w$]*$/.test(lhs) && !isKnownIdentifier(lhs)) {
                addDiag(lineNum, 'TS2304', `找不到名称 "${lhs}"（变量未声明，请使用 let 或 const 声明）`);
              } else if (lhs.includes('.') || lhs.includes('[')) {
                const lhsT = inferType(lhs, lineNum);
                if (lhsT !== 'any' && !isExpressionAssignable(rhsExpr, rhsT, lhsT, lineNum)) {
                  addDiag(lineNum, 'TS2322', `不能将类型 "${rhsT}" 分配给类型 "${lhsT}" ("${lhs}")`);
                }
              }
            }
          });
        }
        // Narrow x !== null / x !== undefined / type predicates / typeof inside while/if body
        condStr.split('&&').forEach(clause => {
          const cm = clause.trim().match(/^([A-Za-z_$][\w$]*)\s*!==\s*(null|undefined)$/);
          if (cm && cm[1] && cm[2] && env.has(cm[1])) {
            const curInfo = env.get(cm[1]) || { type: 'any' };
            env.set(cm[1], { ...curInfo, type: stripNullableFromType(curInfo.type, cm[2]) });
          }
          applyClauseNarrowing(clause, false);
          // If condition checks x.prop !== null, verify if next line assigns const v = x.prop; and narrow it
          const propCm = clause.trim().match(/^([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+)\s*!==\s*(null|undefined)$/);
          if (propCm && propCm[1] && propCm[2] && i + 1 < lines.length) {
            const propExpr = propCm[1];
            const nextTrim = stripInlineCommentSafe(lines[i + 1]).trim();
            const nextDecl = nextTrim.match(/^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+)\s*;?$/);
            if (nextDecl && nextDecl[2] === propExpr) {
              const propT = stripNullableFromType(inferType(propExpr, lineNum), propCm[2]);
              env.set('__narrowed_prop_' + propExpr, { type: propT });
            }
          }
        });
        // Check if an upcoming line right after if (...) is a return/break/continue statement for early-exit narrowing
        if (/^if\s*\(/.test(trimmed) && i + 1 < lines.length && /^\s*(?:return|break|continue)\b/.test(lines[i + 1] ?? '')) {
          condStr.split('||').forEach(clause => {
            const cm = clause.trim().match(/^([A-Za-z_$][\w$]*)\s*===\s*(null|undefined)$/);
            if (cm && cm[1] && cm[2] && env.has(cm[1])) {
              const curInfo = env.get(cm[1]) || { type: 'any' };
              env.set(cm[1], { ...curInfo, type: stripNullableFromType(curInfo.type, cm[2]) });
            }
            applyClauseNarrowing(clause, true);
          });
        }
        continue;
      }
    }

    // Unary ++ / -- statement
    const incM = trimmed.match(/^(?:(\+\+|--)\s*([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)|([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*(\+\+|--));?$/);
    if (incM) {
      const vName = incM[2] || incM[3] || '';
      if (vName.includes('.')) {
        const propT = inferType(vName, lineNum);
        if (propT !== 'any' && !isTsAssignable('number', propT)) {
          addDiag(lineNum, 'TS2322', `不能对类型 "${propT}" 的属性 "${vName}" 执行自增/自减运算`);
        }
      } else if (env.has(vName)) {
        const info = env.get(vName) || { type: 'any' };
        if (info.isConst) {
          addDiag(lineNum, 'TS2588', `无法分配到 "${vName}"，因为它是常数 (const)`);
        } else if (info.type !== 'any' && !isTsAssignable('number', info.type)) {
          addDiag(lineNum, 'TS2322', `不能对类型 "${info.type}" 的变量 "${vName}" 执行自增/自减运算`);
        }
      } else if (!isKnownIdentifier(vName)) {
        addDiag(lineNum, 'TS2304', `找不到名称 "${vName}"（变量未声明，请使用 let 或 const 声明）`);
      }
      continue;
    }

    // Destructuring assignment: [a, b] = [b, a]
    if (/^\[[^\]]+\]\s*=\s*[\s\S]+$/.test(trimmed)) {
      const eqIdx = trimmed.indexOf('=');
      const lhsPart = trimmed.slice(0, eqIdx).trim();
      const rhsPart = trimmed.slice(eqIdx + 1).replace(/;\s*$/, '').trim();
      inferType(rhsPart, lineNum);
      const bound = new Set<string>();
      extractBindingNames(lhsPart, bound);
      bound.forEach(vName => {
        if (!isKnownIdentifier(vName)) {
          addDiag(lineNum, 'TS2304', `找不到名称 "${vName}"（变量未声明，请使用 let 或 const 声明）`);
        } else if (env.has(vName) && env.get(vName)?.isConst) {
          addDiag(lineNum, 'TS2588', `无法分配到 "${vName}"，因为它是常数 (const)`);
        }
      });
      continue;
    }

    // Assignment or compound assignment: lhs = rhs / lhs += rhs (including property assignment u.age = "20")
    const assignM = trimmed.match(/^([A-Za-z_$][\w$!]*(?:\.[A-Za-z_$][\w$!]*|\s*\[[^\]]+\])*)\s*(\+=|-=|\*=|\/=|=(?!=))\s*([\s\S]+?);?$/);
    if (assignM && assignM[1] && assignM[2] && assignM[3]) {
      const lhs = assignM[1].trim();
      const op = assignM[2];
      const rhs = assignM[3].trim();
      const rhsT = inferType(rhs, lineNum);

      if (/^[A-Za-z_$][\w$]*$/.test(lhs)) {
        if (env.has(lhs)) {
          const info = env.get(lhs) || { type: 'any' };
          const checkTargetT = info.declaredType || info.type;
          if (info.isConst) {
            addDiag(lineNum, 'TS2588', `无法分配到 "${lhs}"，因为它是常数 (const)`);
          } else if (checkTargetT !== 'any') {
            if (op === '=' && rhs.startsWith('{') && getInterfaceShape(checkTargetT)) {
              checkObjectLiteralAgainstShape(rhs, checkTargetT, lineNum, `变量 "${lhs}"`);
            } else {
              const effectiveT = op === '=' ? rhsT : inferType(`${lhs} ${op[0]} (${rhs})`, lineNum);
              if (!isExpressionAssignable(op === '=' ? rhs : '', effectiveT, checkTargetT, lineNum)) {
                addDiag(lineNum, 'TS2322', `不能将类型 "${effectiveT}" 分配给类型 "${checkTargetT}" (变量 "${lhs}")`);
              }
            }
          }
        } else if (!isKnownIdentifier(lhs)) {
          addDiag(lineNum, 'TS2304', `找不到名称 "${lhs}"（变量未声明，请使用 let 或 const 声明）`);
        }
      } else if (lhs.includes('.') || lhs.includes('[')) {
        const lhsT = inferType(lhs, lineNum);
        if (lhsT !== 'any' && !isExpressionAssignable(rhs, rhsT, lhsT, lineNum)) {
          addDiag(lineNum, 'TS2322', `不能将类型 "${rhsT}" 分配给类型 "${lhsT}" ("${lhs}")`);
        }
      }
      continue;
    }

    // Standalone expression / call statement
    inferType(trimmed, lineNum);
    // Assertion function narrowing: `assertStr(u);` where `assertStr` has `asserts val is T` or `asserts val`
    const assertCallM = trimmed.match(/^([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*;?$/);
    if (assertCallM && assertCallM[1] && assertCallM[2] !== undefined) {
      const sig = fns.get(assertCallM[1]);
      if (sig && sig.rawReturnType && /^asserts\b/.test(sig.rawReturnType)) {
        const am = sig.rawReturnType.match(/^asserts\s+([A-Za-z_$][\w$]*)(?:\s+is\s+([\s\S]+))?$/);
        if (am && am[1]) {
          const pIdx = sig.params.findIndex((p: { name: string }) => p.name === am[1]);
          const callArgs = splitTopLevel(assertCallM[2]);
          const argExpr = (pIdx >= 0 ? callArgs[pIdx] : callArgs[0])?.trim();
          if (argExpr && /^[A-Za-z_$][\w$]*$/.test(argExpr) && env.has(argExpr)) {
            const curInfo = env.get(argExpr) || { type: 'any' };
            if (am[2]) {
              env.set(argExpr, { ...curInfo, type: resolveAlias(am[2].trim()) });
            } else {
              let nextT = stripNullableFromType(curInfo.type, 'null');
              nextT = stripNullableFromType(nextT, 'undefined');
              env.set(argExpr, { ...curInfo, type: nextT });
            }
          }
        }
      }
    }
  }

  // Merge cached diagnostics from the official TypeScript Web Worker if available for this exact source
  if (_TS_WORKER_STATE.lastSrc === src && Array.isArray(_TS_WORKER_STATE.lastDiags)) {
    _TS_WORKER_STATE.lastDiags.forEach((wd: { line: number; code: string; message?: string }) => {
      if (!diagnostics.some(d => d.line === wd.line && d.code === wd.code)) {
        diagnostics.push({ line: wd.line, code: wd.code, message: wd.message });
      }
    });
  } else {
    requestTsWorkerCheck(src, strict);
  }

  if (typeof src === 'string') {
    _TYPECHECK_CACHE = { src, strict, diags: diagnostics.map(d => ({ ...d })) };
  }
  return diagnostics;
}

/* ================================================================
   3.6) Official TypeScript Compiler Web Worker Bridge (Plan B)
   Runs full `typescript` semantic checking off the main thread in the browser.
   ================================================================ */
const _TS_WORKER_STATE: {
  worker: Worker | null;
  failed: boolean;
  reqId: number;
  pendingSrc: string | null;
  lastSrc: string | null;
  lastDiags: Array<{ line: number; code: string; message?: string }> | null;
  timer: ReturnType<typeof setTimeout> | null;
} = {
  worker: null,
  failed: false,
  reqId: 0,
  pendingSrc: null,
  lastSrc: null,
  lastDiags: null,
  timer: null,
};

export function ensureTsWorker() {
  if (_TS_WORKER_STATE.worker || _TS_WORKER_STATE.failed) return _TS_WORKER_STATE.worker;
  if (typeof Worker === 'undefined' || typeof window === 'undefined') {
    _TS_WORKER_STATE.failed = true;
    return null;
  }
  try {
    const w = new Worker('editor/ts-worker.bundle.js');
    w.onmessage = (ev) => {
      const data = ev && ev.data;
      if (!data || data.type !== 'checkResult') return;
      _TS_WORKER_STATE.lastSrc = data.src;
      const newDiags = Array.isArray(data.diagnostics) ? data.diagnostics : [];
      _TS_WORKER_STATE.lastDiags = newDiags;
      // Invalidate synchronous cache if worker found additional diagnostics for current editor code
      if (_TYPECHECK_CACHE.src === data.src && newDiags.length > 0) {
        _TYPECHECK_CACHE = { src: null, strict: null, diags: [] };
        if (typeof updateEditorChrome === 'function') {
          try { updateEditorChrome(); } catch (_) {}
        }
      }
    };
    w.onerror = (ev) => {
      if (ev && typeof ev.preventDefault === 'function') ev.preventDefault();
      _TS_WORKER_STATE.failed = true;
      _TS_WORKER_STATE.worker = null;
    };
    _TS_WORKER_STATE.worker = w;
    return w;
  } catch (_) {
    _TS_WORKER_STATE.failed = true;
    return null;
  }
}

export function requestTsWorkerCheck(src: string, strict: boolean) {
  if (!strict || typeof src !== 'string' || typeof Worker === 'undefined') return;
  const w = ensureTsWorker();
  if (!w) return;
  _TS_WORKER_STATE.pendingSrc = src;
  if (_TS_WORKER_STATE.timer) clearTimeout(_TS_WORKER_STATE.timer);
  _TS_WORKER_STATE.timer = setTimeout(() => {
    const id = ++_TS_WORKER_STATE.reqId;
    try {
      w.postMessage({ id, type: 'check', src: _TS_WORKER_STATE.pendingSrc, strict: Boolean(strict) });
    } catch (_) {}
  }, 60);
}

export function reportTypeErrors(diags: Array<{ line: number; code?: string | number; message?: string }>) {
  TYPE_ERROR_LINES = new Set(diags.map(d => d.line));
  updateEditorChrome();
  say(`✗ TypeScript 严格类型检查未通过 (共 ${diags.length} 处错误)：`, 'err');
  diags.forEach(d => {
    say(`  • ${d.code} [第 ${d.line} 行]: ${d.message}`, 'err', d.line);
  });
  if (diags[0]?.line) revealErrorLine(diags[0].line);
}


export const typeCheck = typecheckTS;
export const parseType = normalizeTsType;
export const typeToStr = normalizeTsType;
export const isAssignable = isTsAssignable;
export function inferExpr(expr: string): string {
  return normalizeTsType(expr);
}
