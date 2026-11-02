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
import { isMapLike, isRecord, isSetLike } from "../utils/format";
import { appState, createTsConfigFromPreset, detectTsConfigPreset } from "../state";
import {
  Frame,
  InterfaceFieldMeta,
  InterfaceSchemaMeta,
  StepAnim,
  TsCompilerOptions,
  TypeAliasMeta,
  TypeUnionBranchMeta,
} from "../types";

export function formatTsConfigCacheKey(cfg: TsCompilerOptions = appState.TS_CONFIG): string {
  return [
    cfg.strict ? 1 : 0,
    cfg.noImplicitAny ? 1 : 0,
    cfg.strictNullChecks ? 1 : 0,
    cfg.strictFunctionTypes ? 1 : 0,
    cfg.noImplicitReturns ? 1 : 0,
    cfg.noUnusedLocals ? 1 : 0,
    cfg.allowRunOnTypeError ? 1 : 0,
  ].join('');
}

export function serializeTsConfigToJson(cfg: TsCompilerOptions = appState.TS_CONFIG): string {
  const presetLabel =
    cfg.preset === 'beginner'
      ? '新手宽松模式 (Beginner) — 允许隐式 any、关闭严格空值检查、类型警告不阻断运行'
      : cfg.preset === 'standard'
      ? '标准教学模式 (Standard) — 检查显式类型与空值安全、允许省略参数类型'
      : cfg.preset === 'strict'
      ? '最严生产模式 (Strictest) — 全开 strict / noImplicitAny / noUnusedLocals'
      : '自定义模式 (Custom)';
  return [
    `{`,
    `  // 当前预设: ${presetLabel}`,
    `  "compilerOptions": {`,
    `    "target": "ES2022",`,
    `    "module": "ESNext",`,
    `    "strict": ${cfg.strict},`,
    `    "noImplicitAny": ${cfg.noImplicitAny},`,
    `    "strictNullChecks": ${cfg.strictNullChecks},`,
    `    "strictFunctionTypes": ${cfg.strictFunctionTypes},`,
    `    "noImplicitReturns": ${cfg.noImplicitReturns},`,
    `    "noUnusedLocals": ${cfg.noUnusedLocals}`,
    `  },`,
    `  "playgroundOptions": {`,
    `    "preset": "${cfg.preset}",`,
    `    "allowRunOnTypeError": ${cfg.allowRunOnTypeError}`,
    `  }`,
    `}`,
    ``,
  ].join('\n');
}

function stripJsonCommentsAndTrailingCommas(raw: string): string {
  let out = '';
  let i = 0;
  const n = raw.length;
  while (i < n) {
    const ch = raw[i];
    const next = raw[i + 1];
    if (ch === '"') {
      const end = skipString(raw, i);
      out += raw.slice(i, end);
      i = end;
      continue;
    }
    if (ch === '/' && next === '/') {
      while (i < n && raw[i] !== '\n') i++;
      continue;
    }
    if (ch === '/' && next === '*') {
      i += 2;
      while (i < n && !(raw[i] === '*' && raw[i + 1] === '/')) {
        if (raw[i] === '\n') out += '\n';
        i++;
      }
      i = Math.min(n, i + 2);
      continue;
    }
    out += ch;
    i++;
  }
  return out.replace(/,\s*([}\]])/g, '$1');
}

export function parseTsConfigJson(
  rawJson: string,
  fallbackConfig: TsCompilerOptions = appState.TS_CONFIG
): { config: TsCompilerOptions; error: string | null } {
  const cleaned = stripJsonCommentsAndTrailingCommas(String(rawJson || '')).trim();
  if (!cleaned) {
    return { config: { ...fallbackConfig }, error: null };
  }
  try {
    const parsed: unknown = JSON.parse(cleaned);
    if (!isRecord(parsed)) {
      return { config: { ...fallbackConfig }, error: 'tsconfig.json 根节点必须是 JSON 对象' };
    }
    const co = isRecord(parsed.compilerOptions) ? parsed.compilerOptions : parsed;
    const po = isRecord(parsed.playgroundOptions)
      ? parsed.playgroundOptions
      : isRecord(parsed.playgroundConfig)
      ? parsed.playgroundConfig
      : parsed;

    let base = { ...fallbackConfig };
    const rawPreset = typeof po.preset === 'string' ? po.preset.trim() : '';
    if (rawPreset === 'beginner' || rawPreset === 'standard' || rawPreset === 'strict') {
      base = createTsConfigFromPreset(rawPreset);
    }

    const hasStrictBool = typeof co.strict === 'boolean';
    const strictVal = hasStrictBool ? Boolean(co.strict) : base.strict;
    const noImplicitAny =
      typeof co.noImplicitAny === 'boolean'
        ? co.noImplicitAny
        : hasStrictBool
        ? strictVal
        : base.noImplicitAny;
    const strictNullChecks =
      typeof co.strictNullChecks === 'boolean'
        ? co.strictNullChecks
        : hasStrictBool
        ? strictVal
        : base.strictNullChecks;
    const strictFunctionTypes =
      typeof co.strictFunctionTypes === 'boolean'
        ? co.strictFunctionTypes
        : hasStrictBool
        ? strictVal
        : base.strictFunctionTypes;
    const noImplicitReturns =
      typeof co.noImplicitReturns === 'boolean'
        ? co.noImplicitReturns
        : base.noImplicitReturns;
    const noUnusedLocals =
      typeof co.noUnusedLocals === 'boolean'
        ? co.noUnusedLocals
        : base.noUnusedLocals;
    const allowRunOnTypeError =
      typeof po.allowRunOnTypeError === 'boolean'
        ? po.allowRunOnTypeError
        : typeof co.allowRunOnTypeError === 'boolean'
        ? co.allowRunOnTypeError
        : base.allowRunOnTypeError;

    const mergedWithoutPreset = {
      strict: strictVal,
      noImplicitAny,
      strictNullChecks,
      strictFunctionTypes,
      noImplicitReturns,
      noUnusedLocals,
      allowRunOnTypeError,
    };
    const detectedPreset = detectTsConfigPreset(mergedWithoutPreset);
    return {
      config: {
        preset: detectedPreset,
        ...mergedWithoutPreset,
      },
      error: null,
    };
  } catch (e) {
    return {
      config: { ...fallbackConfig },
      error: e instanceof Error && e.message ? e.message : String(e),
    };
  }
}

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
  hasExplicitReturnType?: boolean;
  isAsync?: boolean;
  inferredReturnTypes?: string[];
}

export interface TypeCheckContext {
  lines: string[];
  tsConfig: TsCompilerOptions;
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

export function createTypeCheckContext(
  src: string,
  customTsConfig?: TsCompilerOptions
): TypeCheckContext {
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const tsConfig: TsCompilerOptions = customTsConfig ? { ...customTsConfig } : { ...appState.TS_CONFIG };
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
    tsConfig,
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

function formatSingleFnParamClause(rawParam: string): { name: string; formatted: string; rawType: string | null } {
  const cleaned = rawParam
    .trim()
    .replace(/^(?:(?:public|private|protected|readonly)\s+)+/, '');
  if (!cleaned) return { name: '', formatted: '', rawType: null };

  // Find top-level '=' default value (excluding '=>' and '=='/'!=')
  let eqIdx = -1;
  let depth = 0;
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      i = skipString(cleaned, i) - 1;
      continue;
    }
    if (ch === '(' || ch === '[' || ch === '{' || ch === '<') depth++;
    else if (ch === ')' || ch === ']' || ch === '}' || (ch === '>' && cleaned[i - 1] !== '=')) {
      depth = Math.max(0, depth - 1);
    } else if (
      ch === '=' &&
      depth === 0 &&
      cleaned[i + 1] !== '>' &&
      cleaned[i + 1] !== '=' &&
      cleaned[i - 1] !== '=' &&
      cleaned[i - 1] !== '!' &&
      cleaned[i - 1] !== '<' &&
      cleaned[i - 1] !== '>'
    ) {
      eqIdx = i;
      break;
    }
  }

  const headPart = eqIdx >= 0 ? cleaned.slice(0, eqIdx).trim() : cleaned;
  const defaultPart = eqIdx >= 0 ? cleaned.slice(eqIdx + 1).trim() : '';

  // Find top-level ':' type annotation
  let colonIdx = -1;
  depth = 0;
  for (let i = 0; i < headPart.length; i++) {
    const ch = headPart[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      i = skipString(headPart, i) - 1;
      continue;
    }
    if (ch === '(' || ch === '[' || ch === '{' || ch === '<') depth++;
    else if (ch === ')' || ch === ']' || ch === '}' || (ch === '>' && headPart[i - 1] !== '=')) {
      depth = Math.max(0, depth - 1);
    } else if (ch === ':' && depth === 0) {
      colonIdx = i;
      break;
    }
  }

  if (colonIdx >= 0) {
    const pLeft = headPart.slice(0, colonIdx).trim();
    const pType = headPart.slice(colonIdx + 1).trim() || 'any';
    const cleanName = pLeft.replace(/^\.\.\./, '').replace(/\?$/, '').trim();
    const optMark = defaultPart && !pLeft.endsWith('?') ? '?' : '';
    return {
      name: cleanName,
      formatted: `${pLeft}${optMark}: ${pType}`,
      rawType: pType,
    };
  }

  let inferredType = 'any';
  if (defaultPart) {
    if (/^[+-]?\d+(?:\.\d+)?$/.test(defaultPart)) inferredType = 'number';
    else if (/^(true|false)$/.test(defaultPart)) inferredType = 'boolean';
    else if (/^["'`]/.test(defaultPart)) inferredType = 'string';
    else if (defaultPart.startsWith('[') && defaultPart.endsWith(']')) {
      const inner = defaultPart.slice(1, -1).trim();
      if (!inner) inferredType = 'any[]';
      else if (/^[+-]?\d+(?:\.\d+)?$/.test(splitTopLevel(inner)[0]?.trim() || '')) inferredType = 'number[]';
      else if (/^["'`]/.test(splitTopLevel(inner)[0]?.trim() || '')) inferredType = 'string[]';
      else if (/^(true|false)$/.test(splitTopLevel(inner)[0]?.trim() || '')) inferredType = 'boolean[]';
      else inferredType = 'any[]';
    }
  }
  const cleanName = headPart.replace(/^\.\.\./, '').replace(/\?$/, '').trim();
  const isRest = headPart.startsWith('...');
  const optSuffix = defaultPart && !headPart.endsWith('?') && !isRest ? '?' : '';
  return {
    name: cleanName,
    formatted: `${headPart}${optSuffix}: ${isRest && inferredType === 'any' ? 'any[]' : inferredType}`,
    rawType: inferredType !== 'any' ? inferredType : null,
  };
}

export function formatFnSigInfoToTypeString(sig: FnSigInfo): string {
  const tParams =
    sig.typeParams && sig.typeParams.length > 0
      ? '<' +
        sig.typeParams
          .map(
            tp =>
              tp.name +
              (tp.constraint ? ` extends ${tp.constraint}` : '') +
              (tp.defaultType ? ` = ${tp.defaultType}` : '')
          )
          .join(', ') +
        '>'
      : '';
  const paramsStr = sig.params
    .map(p => `${p.isRest ? '...' : ''}${p.name}${p.optional ? '?' : ''}: ${p.rawType || p.type || 'any'}`)
    .join(', ');
  const retStr = sig.rawReturnType || sig.returnType || 'any';
  return `${tParams}(${paramsStr}) => ${retStr}`;
}

export function formatFunctionTypeSignature(
  varName: string | null | undefined,
  fnVal: unknown
): string {
  const meta = appState.CURRENT_TS_META;
  if (varName && meta) {
    const fromFnMap = meta.fnTypes ? meta.fnTypes.get(varName) : undefined;
    if (fromFnMap && fromFnMap.includes('=>')) return fromFnMap;
    const fromVarMap = meta.varTypes ? meta.varTypes.get(varName) : undefined;
    if (fromVarMap && fromVarMap.includes('=>')) return fromVarMap;
  }
  if (typeof fnVal === 'function' && fnVal.name && meta) {
    const fnName = fnVal.name;
    const fromFnMap = meta.fnTypes ? meta.fnTypes.get(fnName) : undefined;
    if (fromFnMap && fromFnMap.includes('=>')) return fromFnMap;
    const fromVarMap = meta.varTypes ? meta.varTypes.get(fnName) : undefined;
    if (fromVarMap && fromVarMap.includes('=>')) return fromVarMap;
  }
  if (typeof fnVal === 'function') {
    try {
      const fnStr = Function.prototype.toString.call(fnVal).trim();
      const openP = fnStr.indexOf('(');
      if (openP >= 0 && openP < 80) {
        const closeP = findBalancedParen(fnStr, openP);
        if (closeP > openP) {
          const rawParams = splitTopLevel(fnStr.slice(openP + 1, closeP))
            .map(s => s.trim())
            .filter(Boolean);
          const formatted = rawParams
            .map(p => formatSingleFnParamClause(p).formatted)
            .filter(Boolean)
            .join(', ');
          const isAsync = /^async\b/.test(fnStr);
          return `(${formatted}) => ${isAsync ? 'Promise<any>' : 'any'}`;
        }
      }
      const singleArrow = fnStr.match(/^(?:async\s+)?([A-Za-z_$][\w$]*)\s*=>/);
      if (singleArrow && singleArrow[1]) {
        const isAsync = /^async\b/.test(fnStr);
        return `(${singleArrow[1]}: any) => ${isAsync ? 'Promise<any>' : 'any'}`;
      }
    } catch (_) {
      /* ignore fallback error */
    }
  }
  return '(...args: any[]) => any';
}

export function parseFieldsFromTypeBody(bodyStr: string, isClass = false): InterfaceFieldMeta[] {
  const inner = bodyStr.trim().replace(/^\{/, '').replace(/\}$/, '').trim();
  const fields: InterfaceFieldMeta[] = [];
  const seen = new Set<string>();
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

function resolveUtilityTypeFields(
  expr: string,
  knownInterfaces?: Map<string, InterfaceSchemaMeta>,
  knownTypeAliases?: Map<string, TypeAliasMeta>
): InterfaceFieldMeta[] | null {
  const utilM = expr.match(/^(Omit|Pick|Partial|Required|Readonly)\s*<\s*([\s\S]+)\s*>$/);
  if (!utilM || !utilM[1] || !utilM[2]) return null;
  const utilName = utilM[1];
  const args = splitTopLevel(utilM[2]);
  const baseName = (args[0] || '').trim();
  if (!baseName) return null;
  let baseFields: InterfaceFieldMeta[] | null = null;
  if (knownInterfaces && knownInterfaces.has(baseName)) {
    const iface = knownInterfaces.get(baseName);
    if (iface && iface.fields.length) baseFields = iface.fields;
  } else if (knownTypeAliases && knownTypeAliases.has(baseName)) {
    const ta = knownTypeAliases.get(baseName);
    if (ta && ta.fields && ta.fields.length) baseFields = ta.fields;
  } else if (baseName.startsWith('{') && baseName.endsWith('}')) {
    baseFields = parseFieldsFromTypeBody(baseName, false);
  }
  if (!baseFields || !baseFields.length) return null;
  if (utilName === 'Partial') {
    return baseFields.map(f => ({ ...f, optional: true }));
  }
  if (utilName === 'Required') {
    return baseFields.map(f => ({ ...f, optional: false }));
  }
  if (utilName === 'Readonly') {
    return baseFields.map(f => ({ ...f, readonly: true }));
  }
  const keyExpr = (args[1] || '').trim();
  const keySet = new Set(
    splitTopLevelUnion(keyExpr)
      .map(k => k.trim().replace(/^['"`]|['"`]$/g, '').trim())
      .filter(Boolean)
  );
  if (utilName === 'Omit') {
    return baseFields.filter(f => !keySet.has(f.k || f.name || '')).map(f => ({ ...f }));
  }
  if (utilName === 'Pick') {
    return baseFields.filter(f => keySet.has(f.k || f.name || '')).map(f => ({ ...f }));
  }
  return null;
}

export function buildTypeAliasMeta(
  name: string,
  rawDef: string,
  resolvedDef?: string,
  line?: number,
  typeParams?: string,
  knownInterfaces?: Map<string, InterfaceSchemaMeta>,
  knownTypeAliases?: Map<string, TypeAliasMeta>
): TypeAliasMeta {
  const cleanRaw = rawDef.trim().replace(/;\s*$/, '').replace(/^\|\s*/, '').trim();
  let cleanResolved = (resolvedDef ? resolvedDef.trim() : cleanRaw)
    .replace(/;\s*$/, '')
    .replace(/^\|\s*/, '')
    .trim();

  const unionParts = splitTopLevelUnion(cleanResolved);
  if (unionParts.length > 1) {
    const unionBranches: TypeUnionBranchMeta[] = unionParts.map(part => {
      const p = part.trim();
      if (p.startsWith('{') && p.endsWith('}')) {
        const branchFields = parseFieldsFromTypeBody(p, false);
        return {
          raw: p,
          isObject: branchFields.length > 0,
          fields: branchFields.length > 0 ? branchFields : undefined,
        };
      }
      if (knownInterfaces && knownInterfaces.has(p)) {
        const iface = knownInterfaces.get(p);
        if (iface && iface.fields.length > 0) {
          return {
            raw: p,
            isObject: true,
            fields: iface.fields.map(f => ({ ...f })),
          };
        }
      }
      return { raw: p, isObject: false };
    });
    return {
      name,
      line,
      typeParams: typeParams || undefined,
      rawDef: cleanRaw,
      resolvedDef: cleanResolved,
      aliasKind: 'union',
      unionBranches,
    };
  }

  let objFields: InterfaceFieldMeta[] | null = null;
  if (cleanResolved.startsWith('{') && cleanResolved.endsWith('}')) {
    objFields = parseFieldsFromTypeBody(cleanResolved, false);
  } else {
    objFields =
      resolveUtilityTypeFields(cleanResolved, knownInterfaces, knownTypeAliases) ||
      resolveUtilityTypeFields(cleanRaw, knownInterfaces, knownTypeAliases);
    if (objFields && objFields.length > 0 && !(cleanResolved.startsWith('{') && cleanResolved.endsWith('}'))) {
      cleanResolved = `{ ${objFields.map(f => `${f.k || f.name || ''}${f.optional ? '?' : ''}: ${f.declaredType || 'any'}`).join('; ')} }`;
    }
  }

  if (objFields && objFields.length > 0) {
    return {
      name,
      line,
      typeParams: typeParams || undefined,
      rawDef: cleanRaw,
      resolvedDef: cleanResolved,
      aliasKind: 'object',
      fields: objFields,
    };
  }

  return {
    name,
    line,
    typeParams: typeParams || undefined,
    rawDef: cleanRaw,
    resolvedDef: cleanResolved,
    aliasKind: 'alias',
  };
}

export function extractTsInterfaceMetadata(src: string | null | undefined, merge = false) {
  const interfaces = merge && appState.CURRENT_TS_META?.interfaces
    ? new Map<string, InterfaceSchemaMeta>(appState.CURRENT_TS_META.interfaces)
    : new Map<string, InterfaceSchemaMeta>();
  const varTypes = merge && appState.CURRENT_TS_META?.varTypes
    ? new Map<string, string>(appState.CURRENT_TS_META.varTypes)
    : new Map<string, string>();
  const fnTypes = merge && appState.CURRENT_TS_META?.fnTypes
    ? new Map<string, string>(appState.CURRENT_TS_META.fnTypes)
    : new Map<string, string>();
  const typeAliases = merge && appState.CURRENT_TS_META?.typeAliases
    ? new Map<string, TypeAliasMeta>(appState.CURRENT_TS_META.typeAliases)
    : new Map<string, TypeAliasMeta>();
  if (!src || typeof src !== 'string') {
    appState.CURRENT_TS_META = { interfaces, varTypes, fnTypes, typeAliases };
    return appState.CURRENT_TS_META;
  }

  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const localTypeAliases = new Map<string, string>();
  let activeIface: string | null = null;
  let activeIfaceLine = 1;
  let activeIsClass = false;
  let activeBody = '';
  let depth = 0;

  const parseFieldsFromBody = parseFieldsFromTypeBody;

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

    const typeHdrM = trimmed.match(/^(?:export\s+)?type\s+([A-Za-z_$][\w$]*)/);
    if (typeHdrM && typeHdrM[1]) {
      const aliasName = typeHdrM[1];
      const declLineNum = i + 1;
      let fullTypeDecl = trimmed;
      let scanIdx = i;
      const countTypeDepth = (str: string) => {
        let d = 0, ad = 0;
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
        if (str[p] === '=' && str[p + 1] !== '=' && str[p + 1] !== '>') p++;
        for (; p < str.length; p++) {
          const ch = str[p];
          if (ch === '"' || ch === "'" || ch === '`') { p = skipString(str, p) - 1; continue; }
          if (ch === '(' || ch === '[' || ch === '{') d++;
          else if (ch === ')' || ch === ']' || ch === '}') d = Math.max(0, d - 1);
          else if (ch === '<') ad++;
          else if (ch === '>' && str[p - 1] !== '=') ad = Math.max(0, ad - 1);
        }
        return { d, ad };
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
        localTypeAliases.set(aliasName, rhsType);
        const aliasMeta = buildTypeAliasMeta(
          aliasName,
          rhsType,
          undefined,
          declLineNum,
          tParamStr,
          interfaces,
          typeAliases
        );
        typeAliases.set(aliasName, aliasMeta);
        continue;
      }
    }

    const fnHdrM = trimmed.match(/^(?:export\s+)?(?:default\s+)?(async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)/);
    if (fnHdrM && fnHdrM[2] && trimmed.includes('(')) {
      const isAsyncFn = Boolean(fnHdrM[1]);
      const fnName = fnHdrM[2];
      let headerStr = trimmed;
      let scanIdx = i;
      const findFnOpenParen = (str: string) => {
        let pos = fnHdrM[0].length;
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
      let openP = findFnOpenParen(headerStr);
      while ((openP < 0 || findBalancedParen(headerStr, openP) < 0) && scanIdx + 1 < lines.length) {
        scanIdx++;
        headerStr += ' ' + stripInlineCommentSafe(lines[scanIdx]).trim();
        openP = findFnOpenParen(headerStr);
      }
      const closeP = openP >= 0 ? findBalancedParen(headerStr, openP) : -1;
      if (closeP > openP) {
        const tParamPart = headerStr.slice(fnHdrM[0].length, openP).trim();
        const paramInner = headerStr.slice(openP + 1, closeP).trim();
        const rawParams = paramInner ? splitTopLevel(paramInner) : [];
        const formattedParams: string[] = [];
        rawParams.forEach(p => {
          const parsedP = formatSingleFnParamClause(p);
          if (parsedP.formatted) formattedParams.push(parsedP.formatted);
          if (parsedP.name && parsedP.rawType) {
            varTypes.set(parsedP.name, parsedP.rawType);
          }
        });
        const afterClose = headerStr.slice(closeP + 1).trim();
        const retM = afterClose.match(/^:\s*([^{;]+?)(?:\s*\{[\s\S]*|\s*;)?$/);
        let retType = retM && retM[1]
          ? retM[1].trim()
          : '';
        if (!retType) {
          const inlineEmptyBlock = /^\{\s*\}\s*;?$/.test(afterClose);
          if (inlineEmptyBlock) {
            retType = isAsyncFn ? 'Promise<void>' : 'void';
          } else {
            retType = isAsyncFn ? 'Promise<any>' : 'any';
          }
        }
        const fnSig = `${tParamPart ? tParamPart : ''}(${formattedParams.join(', ')}) => ${retType}`;
        const existingFnSig = merge ? fnTypes.get(fnName) : undefined;
        if (!existingFnSig || !retType.endsWith('any') || existingFnSig.endsWith('=> any') || existingFnSig.endsWith('=> Promise<any>')) {
          fnTypes.set(fnName, fnSig);
          varTypes.set(fnName, fnSig);
        }
      }
      continue;
    }

    // Variable with explicit type annotation (including function types like `(arr: number[]) => string` or alias `TestType`)
    const varDeclM = trimmed.match(/^(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*:\s*((?:[^=]|=>)+?)(?:\s*=\s*(?!>)\s*([\s\S]+)|;?$)/);
    if (varDeclM && varDeclM[1] && varDeclM[2]) {
      const vName = varDeclM[1];
      let declT = varDeclM[2].trim().replace(/;$/, '').trim();
      const resolvedAlias = localTypeAliases.get(declT);
      if (resolvedAlias && resolvedAlias.includes('=>')) {
        declT = resolvedAlias;
      }
      varTypes.set(vName, declT);
      if (declT.includes('=>')) {
        fnTypes.set(vName, declT);
      }
      continue;
    }

    // Variable assigned an arrow function or function expression without explicit variable `: Type`
    const varHeadM = trimmed.match(/^(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?!>)/);
    if (varHeadM && varHeadM[1]) {
      const vName = varHeadM[1];
      let rhs = trimmed.slice(varHeadM[0].length).replace(/;\s*$/, '').trim();
      let isAsyncArrow = false;
      if (/^async\b/.test(rhs) && (isWS(rhs[5]) || rhs[5] === '(' || rhs[5] === '<' || rhs.slice(5).trim().startsWith('function'))) {
        isAsyncArrow = true;
        rhs = rhs.slice(5).trim();
      }
      let isFnExpr = false;
      const fnExprM = rhs.match(/^function\s*\*?(?:\s+[A-Za-z_$][\w$]*)?\s*/);
      if (fnExprM) {
        isFnExpr = true;
        rhs = rhs.slice(fnExprM[0].length).trim();
      }
      let tParamPart = '';
      if (rhs.startsWith('<')) {
        let ad = 1, k = 1;
        while (k < rhs.length && ad > 0) {
          const ch = rhs[k];
          if (ch === '"' || ch === "'" || ch === '`') { k = skipString(rhs, k); continue; }
          if (ch === '<') ad++;
          else if (ch === '>' && rhs[k - 1] !== '=') ad--;
          k++;
        }
        if (ad === 0) {
          tParamPart = rhs.slice(0, k).trim();
          rhs = rhs.slice(k).trim();
        }
      }
      let matchedArrowOrFn = false;
      let paramInner = '';
      let explicitRet = '';
      let bodyRemainder = '';
      if (rhs.startsWith('(')) {
        const closeP = findBalancedParen(rhs, 0);
        if (closeP >= 1) {
          paramInner = rhs.slice(1, closeP).trim();
          const afterP = rhs.slice(closeP + 1).trim();
          if (isFnExpr) {
            const rM = afterP.match(/^(?::\s*([^{]+?))?\s*(\{[\s\S]*)$/);
            if (rM && rM[2]) {
              matchedArrowOrFn = true;
              explicitRet = rM[1] ? rM[1].trim() : '';
              bodyRemainder = rM[2].trim();
            }
          } else if (afterP.startsWith('=>')) {
            matchedArrowOrFn = true;
            bodyRemainder = afterP.slice(2).trim();
          } else if (afterP.startsWith(':')) {
            const afterColon = afterP.slice(1).trim();
            let td = 0, arrowPos = -1;
            let skipFirstFnArrow = afterColon.startsWith('(') || afterColon.startsWith('<');
            for (let k = 0; k < afterColon.length - 1; k++) {
              const ch = afterColon[k];
              if (ch === '"' || ch === "'" || ch === '`') { k = skipString(afterColon, k) - 1; continue; }
              if (ch === '(' || ch === '[' || ch === '{' || ch === '<') td++;
              else if (ch === ')' || ch === ']' || ch === '}' || (ch === '>' && afterColon[k - 1] !== '=')) td = Math.max(0, td - 1);
              else if (td === 0 && ch === '=' && afterColon[k + 1] === '>') {
                if (skipFirstFnArrow) {
                  skipFirstFnArrow = false;
                  k++;
                  continue;
                }
                arrowPos = k;
                break;
              }
            }
            if (arrowPos > 0) {
              matchedArrowOrFn = true;
              explicitRet = afterColon.slice(0, arrowPos).trim();
              bodyRemainder = afterColon.slice(arrowPos + 2).trim();
            }
          }
        }
      } else if (!isFnExpr) {
        const singleM = rhs.match(/^([A-Za-z_$][\w$]*)\s*=>\s*([\s\S]+)$/);
        if (singleM && singleM[1] && singleM[2]) {
          matchedArrowOrFn = true;
          paramInner = singleM[1];
          bodyRemainder = singleM[2].trim();
        }
      }

      if (matchedArrowOrFn) {
        const rawParams = paramInner ? splitTopLevel(paramInner) : [];
        const formattedParams: string[] = [];
        rawParams.forEach(p => {
          const parsedP = formatSingleFnParamClause(p);
          if (parsedP.formatted) formattedParams.push(parsedP.formatted);
          if (parsedP.name && parsedP.rawType) {
            varTypes.set(parsedP.name, parsedP.rawType);
          }
        });
        let retType = explicitRet;
        if (!retType) {
          let baseRet = 'any';
          if (bodyRemainder.startsWith('{')) {
            if (/^\{\s*\}$/.test(bodyRemainder)) {
              baseRet = 'void';
            } else if (bodyRemainder.endsWith('}')) {
              const innerB = bodyRemainder.slice(1, -1).trim();
              const rM = innerB.match(/\breturn(?:\s+([^;}]+))?/);
              if (!rM) {
                baseRet = /\bthrow\b/.test(innerB) ? 'never' : 'void';
              } else if (!rM[1] || !rM[1].trim()) {
                baseRet = 'void';
              } else {
                const lit = inferLiteralType(rM[1].trim());
                if (lit) {
                  baseRet = /^[+-]?\d/.test(lit) ? 'number' : (lit === 'true' || lit === 'false' ? 'boolean' : 'string');
                }
              }
            }
          } else if (bodyRemainder) {
            const lit = inferLiteralType(bodyRemainder);
            if (lit) {
              baseRet = /^[+-]?\d/.test(lit) ? 'number' : (lit === 'true' || lit === 'false' ? 'boolean' : 'string');
            } else if (bodyRemainder === 'undefined') {
              baseRet = 'undefined';
            } else if (bodyRemainder === 'null') {
              baseRet = 'null';
            } else if (bodyRemainder.startsWith('`') && bodyRemainder.endsWith('`')) {
              baseRet = 'string';
            }
          }
          retType = isAsyncArrow && !baseRet.startsWith('Promise<') ? `Promise<${baseRet}>` : baseRet;
        }
        const fnSig = `${tParamPart}(${formattedParams.join(', ')}) => ${retType}`;
        const existingSig = merge ? fnTypes.get(vName) : undefined;
        if (!existingSig || (!retType.endsWith('any') && !retType.endsWith('<any>')) || existingSig.endsWith('=> any') || existingSig.endsWith('=> Promise<any>')) {
          fnTypes.set(vName, fnSig);
          varTypes.set(vName, fnSig);
        }
        continue;
      }
    }

    const varNewM = trimmed.match(/^(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*new\s+([A-Za-z_$][\w$]*)\s*(?:<[^>]*>)?\s*\(/);
    if (varNewM && varNewM[1] && varNewM[2] && !/^(Map|Set|Array)$/.test(varNewM[2])) {
      varTypes.set(varNewM[1], varNewM[2]);
    }
  }

  // Re-resolve typeAliases once all interfaces and typeAliases in the file are collected
  typeAliases.forEach((meta, aliasName) => {
    const refreshed = buildTypeAliasMeta(
      aliasName,
      meta.rawDef,
      meta.resolvedDef !== meta.rawDef ? meta.resolvedDef : undefined,
      meta.line,
      meta.typeParams,
      interfaces,
      typeAliases
    );
    typeAliases.set(aliasName, refreshed);
  });

  appState.CURRENT_TS_META = { interfaces, varTypes, fnTypes, typeAliases };
  return appState.CURRENT_TS_META;
}

export function matchInterfaceForObject(name: string | null | undefined, value: StepAnim | Frame | null | undefined): InterfaceSchemaMeta | null {
  const { interfaces, varTypes, typeAliases } = appState.CURRENT_TS_META;
  const declaredVarT = name ? varTypes.get(name) : undefined;
  if (declaredVarT) {
    const cleanT = declaredVarT.replace(/\[\]$/, '').trim();
    if (interfaces.has(cleanT)) return interfaces.get(cleanT) || null;
    const aliasMeta = typeAliases ? typeAliases.get(cleanT) : undefined;
    if (aliasMeta && aliasMeta.fields && aliasMeta.fields.length > 0) {
      return {
        kind: 'type',
        name: cleanT,
        line: aliasMeta.line,
        isClass: false,
        fields: aliasMeta.fields,
      };
    }
  }
  if (value && typeof value === 'object') {
    const clsName = typeof value.__cls__ === 'string' ? value.__cls__ : '';
    if (clsName && interfaces.has(clsName)) {
      return interfaces.get(clsName) || null;
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
  if (!appState.TS_CONFIG.strictNullChecks && (a === 'null' || a === 'undefined') && e !== 'never') {
    return true;
  }
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
  const findTopArrow = (s: string): number => {
    let d = 0;
    for (let i = 0; i < s.length - 1; i++) {
      const ch = s[i];
      if (ch === '"' || ch === "'" || ch === '`') { i = skipString(s, i) - 1; continue; }
      if (ch === '(' || ch === '[' || ch === '{' || ch === '<') d++;
      else if (ch === ')' || ch === ']' || ch === '}' || (ch === '>' && s[i - 1] !== '=')) d = Math.max(0, d - 1);
      else if (d === 0 && ch === '=' && s[i + 1] === '>') return i;
    }
    return -1;
  };
  const fnArrowIdx = findTopArrow(e);
  if (fnArrowIdx > 0 && (e.startsWith('(') || e.startsWith('<'))) {
    const expectedRet = e.slice(fnArrowIdx + 2).trim();
    const aArrowIdx = findTopArrow(a);
    if (aArrowIdx > 0 && (a.startsWith('(') || a.startsWith('<'))) {
      const actualRet = a.slice(aArrowIdx + 2).trim();
      return expectedRet === 'void' || isTsAssignable(actualRet, expectedRet, knownNominalTypes);
    }
    if (a === 'function' || expectedRet === 'void' || isTsAssignable(a, expectedRet, knownNominalTypes)) return true;
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
