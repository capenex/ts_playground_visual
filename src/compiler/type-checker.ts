/* ================================================================
   Static TypeScript Type Checker & Worker Bridge (src/compiler/type-checker.ts)
   ================================================================ */
import {
  findBalancedParen,
  isWS,
  skipString,
  splitTopLevel,
  stripInlineCommentSafe,
  RESERVED_WORDS,
} from "./comments";
import { extractBindingNames } from "./instrumenter";
import { appState, uiHooks } from "../state";
import { Diag, TypeAliasMeta } from "../types";
import {
  buildTypeAliasMeta,
  createTypeCheckContext,
  extractTsInterfaceMetadata,
  FnSigInfo,
  formatFnSigInfoToTypeString,
  formatTsConfigCacheKey,
  inferLiteralType,
  isTsAssignable,
  normalizeTsType,
  parseTsConfigJson,
  parseTypeParams,
  PropShapeInfo,
  splitTopLevelDecl,
  splitTopLevelUnion,
  stripNullableFromType,
  TypeCheckContext,
  VarEnvInfo,
} from "./tc-types";
import { createTypeEvalEngine, TypeEvalEngine } from "./tc-eval";
import { createTypeInferEngine, TypeInferEngine } from "./tc-infer";
import { buildModuleGraph, ModuleGraphResult, ModuleNode } from "./module-graph";

export * from "./tc-types";
export * from "./tc-eval";
export * from "./tc-infer";
export * from "./module-graph";

let _TYPECHECK_CACHE: {
  src: string | null;
  strict: boolean | null;
  configKey: string | null;
  diags: Diag[];
  fnTypes?: Map<string, string>;
  varTypes?: Map<string, string>;
  typeAliases?: Map<string, TypeAliasMeta>;
} = { src: null, strict: null, configKey: null, diags: [] };

export function collectPass1Declarations(
  ctx: TypeCheckContext,
  evalEngine: TypeEvalEngine,
  inferEngine: TypeInferEngine
) {
  const {
    lines,
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
    addDiag,
  } = ctx;
  const {
    evaluateType,
    resolveAlias,
    parseObjectShapeLiteral,
    getInterfaceShape,
    getClassMethodSig,
  } = evalEngine;
  const { parseParamList, parseClassTopMember } = inferEngine;

  let activeInterface: Map<string, PropShapeInfo> | null = null;
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

    const fnMatch = raw.match(/^(?:export\s+)?(?:default\s+)?(async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)/);
    if (fnMatch && fnMatch[2] && raw.indexOf('(') >= 0) {
      const isAsyncFn = Boolean(fnMatch[1]);
      const fnName = fnMatch[2];
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
        const hasExplicitRet = Boolean(retM && retM[1]);
        const defaultRet = isAsyncFn ? 'Promise<any>' : 'any';
        const rawRetType = (retM && retM[1]) ? retM[1].trim() : defaultRet;
        const tempEnv = new Map<string, string>();
        fnTParams.forEach(tp => tempEnv.set(tp.name, tp.name));
        const retType = retM ? resolveAlias(rawRetType, tempEnv) : defaultRet;
        const { params, minArgs } = parseParamList(paramStr, lineNum, Boolean(ctx.tsConfig.noImplicitAny));
        fns.set(fnName, {
          name: fnName,
          params,
          minArgs,
          returnType: retType,
          rawReturnType: rawRetType,
          typeParams: fnTParams,
          line: lineNum,
          hasValueReturn: false,
          hasExplicitReturnType: hasExplicitRet,
          isAsync: isAsyncFn,
          inferredReturnTypes: [],
        });
      }
    }
  }

  typeAliases.forEach((rhs, aliasName) => {
    const evaluated = evaluateType(rhs, new Map(), 0, new Set([aliasName]));
    typeAliases.set(aliasName, evaluated);
    if (evaluated.startsWith('{') && evaluated.endsWith('}') && !interfaces.has(aliasName)) {
      interfaces.set(aliasName, parseObjectShapeLiteral(evaluated));
    }
  });

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
}

export function checkPass2Statements(
  ctx: TypeCheckContext,
  evalEngine: TypeEvalEngine,
  inferEngine: TypeInferEngine
) {
  const {
    lines,
    fns,
    interfaceTypeParams,
    interfaces,
    env,
    activeTypeParams,
    addDiag,
    isKnownIdentifier,
  } = ctx;
  const { resolveAlias, getInterfaceShape } = evalEngine;
  const {
    inferType,
    isExpressionAssignable,
    checkObjectLiteralAgainstShape,
    checkArrayElementsAgainst,
    parseParamList,
  } = inferEngine;

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

    if (/^import\b/.test(trimmed)) {
      const impMatch = trimmed.replace(/;$/, '').trim().match(/^import\s+(?:type\s+)?([\s\S]+?)\s+from\s+(['"])([^'"]+)\2\s*$/);
      if (impMatch) {
        const clause = (impMatch[1] || '').trim();
        const modSpec = (impMatch[3] || '').trim();
        const isFsRoot = modSpec === 'fs' || modSpec === 'node:fs';
        const isFsPromises = modSpec === 'fs/promises' || modSpec === 'node:fs/promises';
        const modType = isFsPromises ? '__FsPromises__' : (isFsRoot ? '__FsModule__' : 'any');
        const isAlreadyLinked = (localName: string) =>
          !isFsRoot &&
          !isFsPromises &&
          (env.has(localName) ||
            fns.has(localName) ||
            interfaces.has(localName) ||
            ctx.typeAliases.has(localName) ||
            ctx.genericTypeAliases.has(localName) ||
            ctx.enumsSet.has(localName));
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
            if (isAlreadyLinked(local)) return;
            const bType = (isFsRoot && imported === 'promises') ? '__FsPromises__' : 'any';
            env.set(local, { type: bType, isConst: true, line: lineNum, declaredType: bType });
          });
        };
        const nsM = clause.match(/^\*\s+as\s+([A-Za-z_$][\w$]*)$/);
        if (nsM && nsM[1]) {
          if (!isAlreadyLinked(nsM[1])) {
            env.set(nsM[1], { type: modType, isConst: true, line: lineNum, declaredType: modType });
          }
        } else if (clause.startsWith('{') && clause.endsWith('}')) {
          registerNamedBindings(clause);
        } else {
          const defNamedM = clause.match(/^([A-Za-z_$][\w$]*)\s*,\s*(\{[\s\S]+\})$/);
          if (defNamedM && defNamedM[1] && defNamedM[2]) {
            if (!isAlreadyLinked(defNamedM[1])) {
              env.set(defNamedM[1], { type: modType, isConst: true, line: lineNum, declaredType: modType });
            }
            registerNamedBindings(defNamedM[2]);
          } else if (/^[A-Za-z_$][\w$]*$/.test(clause)) {
            if (!isAlreadyLinked(clause)) {
              env.set(clause, { type: modType, isConst: true, line: lineNum, declaredType: modType });
            }
          }
        }
      }
      continue;
    }

    if (/^export\s+(?:type\s+)?\{[^}]*\}(?:\s+from\s+['"][^'"]+['"])?\s*;?$/.test(trimmed)) {
      const braceM = trimmed.match(/^export\s+(type\s+)?\{([^}]*)\}(?:\s+from\s+['"]([^'"]+)['"])?/);
      if (braceM && braceM[2] !== undefined && !braceM[3]) {
        splitTopLevel(braceM[2]).forEach(rawItem => {
          const item = rawItem.trim().replace(/^type\s+/, '').trim();
          if (!item) return;
          const asM = item.match(/^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/);
          const local = asM && asM[1] ? asM[1] : item;
          if (/^[A-Za-z_$][\w$]*$/.test(local) && !isKnownIdentifier(local)) {
            addDiag(lineNum, 'TS2304', `找不到要导出的名称 "${local}"`);
          }
        });
      }
      continue;
    }

    if (/^export\s+default\b/.test(trimmed) && !/^export\s+default\s+(?:async\s+)?(?:function|class|abstract\s+class)\b/.test(trimmed)) {
      const defExpr = trimmed.replace(/^export\s+default\s+/, '').replace(/;\s*$/, '').trim();
      if (defExpr) {
        const defT = inferType(defExpr, lineNum);
        env.set('__default_export__', { type: defT, isConst: true, line: lineNum, declaredType: defT });
      }
      continue;
    }

    if (/^declare\b/.test(trimmed)) {
      const declVarM = trimmed.match(/^declare\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::\s*([^=;]+))?/);
      if (declVarM && declVarM[1]) {
        const dType = declVarM[2] ? resolveAlias(declVarM[2].trim()) : 'any';
        env.set(declVarM[1], { type: dType, isConst: true, line: lineNum, declaredType: dType });
      }
      continue;
    }

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
        const eqPos = fullT.indexOf('=');
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

    if (/^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*[A-Za-z_$][\w$]*[\s\S]*;\s*$/.test(trimmed) && !trimmed.includes('{')) {
      continue;
    }

    const matchArrowOrFnVarOpen = (lineStr: string) => {
      const mVar = lineStr.match(/^(?:export\s+)?(const|let|var)\s+([A-Za-z_$][\w$]*)/);
      if (!mVar || !mVar[1] || !mVar[2]) return null;
      const varKind = mVar[1];
      const varName = mVar[2];
      const afterName = lineStr.slice(mVar[0].length);
      let eqIdx = -1, colonIdx = -1, d = 0;
      for (let k = 0; k < afterName.length; k++) {
        const ch = afterName[k];
        if (ch === '"' || ch === "'" || ch === '`') { k = skipString(afterName, k) - 1; continue; }
        if (ch === '(' || ch === '[' || ch === '{' || ch === '<') d++;
        else if (ch === ')' || ch === ']' || ch === '}' || (ch === '>' && afterName[k - 1] !== '=')) d = Math.max(0, d - 1);
        else if (d === 0 && ch === ':' && colonIdx < 0 && eqIdx < 0) {
          colonIdx = k;
        } else if (
          d === 0 &&
          ch === '=' &&
          afterName[k + 1] !== '=' &&
          afterName[k + 1] !== '>' &&
          afterName[k - 1] !== '=' &&
          afterName[k - 1] !== '!' &&
          afterName[k - 1] !== '<' &&
          afterName[k - 1] !== '>'
        ) {
          eqIdx = k;
          break;
        }
      }
      if (eqIdx < 0) return null;
      const rawVarDeclType = colonIdx >= 0 ? afterName.slice(colonIdx + 1, eqIdx).trim() : null;
      let rhs = afterName.slice(eqIdx + 1).trim();
      let isAsync = false;
      if (/^async\b/.test(rhs) && (isWS(rhs[5]) || rhs[5] === '(' || rhs[5] === '<' || rhs.slice(5).trim().startsWith('function'))) {
        isAsync = true;
        rhs = rhs.slice(5).trim();
      }
      let isFnKeyword = false;
      const fnKwM = rhs.match(/^function\s*(\*)?(?:\s+[A-Za-z_$][\w$]*)?\s*/);
      if (fnKwM) {
        isFnKeyword = true;
        rhs = rhs.slice(fnKwM[0].length).trim();
      }
      let typeParamStr = '';
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
          typeParamStr = rhs.slice(0, k).trim();
          rhs = rhs.slice(k).trim();
        }
      }
      if (rhs.startsWith('(')) {
        const closeP = findBalancedParen(rhs, 0);
        if (closeP < 0) return null;
        const paramStr = rhs.slice(1, closeP).trim();
        const afterParen = rhs.slice(closeP + 1).trim();
        if (isFnKeyword) {
          const retM = afterParen.match(/^(?::\s*([^{]+?))?\s*\{/);
          if (!retM) return null;
          return {
            varKind,
            varName,
            rawVarDeclType,
            isAsync,
            typeParamStr,
            paramStr,
            rawRetType: retM[1] ? retM[1].trim() : null,
          };
        }
        if (afterParen.startsWith('=>')) {
          const afterArrow = afterParen.slice(2).trim();
          if (!afterArrow.startsWith('{')) return null;
          return {
            varKind,
            varName,
            rawVarDeclType,
            isAsync,
            typeParamStr,
            paramStr,
            rawRetType: null,
          };
        }
        if (afterParen.startsWith(':')) {
          const afterColon = afterParen.slice(1).trim();
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
            const afterArrow = afterColon.slice(arrowPos + 2).trim();
            if (!afterArrow.startsWith('{')) return null;
            return {
              varKind,
              varName,
              rawVarDeclType,
              isAsync,
              typeParamStr,
              paramStr,
              rawRetType: afterColon.slice(0, arrowPos).trim(),
            };
          }
        }
        return null;
      }
      const singleParamM = !isFnKeyword ? rhs.match(/^([A-Za-z_$][\w$]*)\s*=>\s*\{/) : null;
      if (singleParamM && singleParamM[1]) {
        return {
          varKind,
          varName,
          rawVarDeclType,
          isAsync,
          typeParamStr,
          paramStr: singleParamM[1],
          rawRetType: null,
        };
      }
      return null;
    };

    const fnOpen = trimmed.match(/^(?:export\s+)?(?:default\s+)?(async\s+)?function\s*(\*)?\s*([A-Za-z_$][\w$]*)\s*(?:<[\s\S]*>)?\s*\(/);
    const arrowFnOpen = !fnOpen ? matchArrowOrFnVarOpen(trimmed) : null;
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
      ? (trimmed.match(/(?:(async)\s*)?(?:(<[A-Za-z_$][\w$,\s=<>]*>)\s*)?\(([^()]*)\)\s*(?::\s*([^{=]+?))?\s*=>\s*\{$/) ||
         trimmed.match(/(?:(async)\s*)?function\s*\*?(?:\s+[A-Za-z_$][\w$]*)?\s*(?:(<[A-Za-z_$][\w$,\s=<>]*>)\s*)?\(([^()]*)\)\s*(?::\s*([^{=]+?))?\s*\{$/))
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
      if (arrowFnOpen) {
        const fnVarName = arrowFnOpen.varName;
        const isConstFn = arrowFnOpen.varKind === 'const';
        const declVarT = arrowFnOpen.rawVarDeclType ? resolveAlias(arrowFnOpen.rawVarDeclType) : 'function';
        env.set(fnVarName, { type: declVarT, isConst: isConstFn, line: lineNum, declaredType: declVarT });
      }
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
      const existingFn: FnSigInfo | undefined = (fnOpen && fnOpen[3] ? fns.get(fnOpen[3]) : undefined) ||
        (methodKey && validMethodOpen ? (fns.get(methodKey) || fns.get(`${currentClass}.${validMethodOpen[1]}`)) : undefined);
      let activeFn: FnSigInfo;
      if (existingFn) {
        activeFn = existingFn;
        activeFn.inferredReturnTypes = [];
        if (fnOpen && fnOpen[2] === '*') {
          activeFn.hasValueReturn = true;
        }
      } else if (callbackArrowOpen) {
        const isAsyncCb = Boolean(callbackArrowOpen[1]);
        const cbTParams = callbackArrowOpen[2] ? parseTypeParams(callbackArrowOpen[2]) : [];
        const cbParamStr = (callbackArrowOpen[3] || '').trim();
        const hasCbRet = Boolean(callbackArrowOpen[4]);
        const cbRawRet = callbackArrowOpen[4] ? callbackArrowOpen[4].trim() : (isAsyncCb ? 'Promise<any>' : 'any');
        const cbRet = callbackArrowOpen[4] ? resolveAlias(cbRawRet) : cbRawRet;
        const { params: cbParams, minArgs: cbMin } = parseParamList(cbParamStr, lineNum, false);
        activeFn = {
          name: '<callback>',
          params: cbParams,
          minArgs: cbMin,
          returnType: cbRet,
          rawReturnType: cbRawRet,
          typeParams: cbTParams,
          line: lineNum,
          hasValueReturn: false,
          hasExplicitReturnType: hasCbRet,
          isAsync: isAsyncCb,
          inferredReturnTypes: [],
        };
      } else {
        const fName = (fnOpen ? fnOpen[3] : (arrowFnOpen ? arrowFnOpen.varName : (methodKey || (currentClass + '.' + (validMethodOpen ? validMethodOpen[1] : ''))))) || '';
        let paramStr = '';
        let retType = 'any';
        let rawRetType = 'any';
        let hasExplicitRet = false;
        let isAsyncFn = false;
        let fnTParams: Array<{ name: string; constraint: string | null; defaultType: string | null }> = [];
        if (fnOpen) {
          isAsyncFn = Boolean(fnOpen[1]);
          const openP = trimmed.indexOf('(');
          const closeP = findBalancedParen(trimmed, openP);
          if (closeP > openP) {
            paramStr = trimmed.slice(openP + 1, closeP).trim();
            const afterClose = trimmed.slice(closeP + 1).trim();
            const retM = afterClose.match(/^:\s*([^{]+?)(?:\s*\{[\s\S]*)?$/);
            if (retM && retM[1]) {
              hasExplicitRet = true;
              rawRetType = retM[1].trim();
              retType = resolveAlias(rawRetType);
            } else if (isAsyncFn) {
              rawRetType = 'Promise<any>';
              retType = 'Promise<any>';
            }
          }
        } else if (arrowFnOpen) {
          isAsyncFn = arrowFnOpen.isAsync;
          fnTParams = arrowFnOpen.typeParamStr ? parseTypeParams(arrowFnOpen.typeParamStr) : [];
          paramStr = arrowFnOpen.paramStr;
          if (arrowFnOpen.rawRetType) {
            hasExplicitRet = true;
            rawRetType = arrowFnOpen.rawRetType;
            retType = resolveAlias(rawRetType);
          } else if (isAsyncFn) {
            rawRetType = 'Promise<any>';
            retType = 'Promise<any>';
          }
        } else if (validMethodOpen) {
          isAsyncFn = /\basync\s+/.test(validMethodOpen[0] || '');
          paramStr = (validMethodOpen[2] || '').trim();
          const isCtorOrSetter = validMethodOpen[1] === 'constructor' || validMethodOpen[4] === 'set';
          hasExplicitRet = isCtorOrSetter || Boolean(validMethodOpen[3]);
          rawRetType = isCtorOrSetter ? 'void' : (validMethodOpen[3] ? validMethodOpen[3].trim() : (isAsyncFn ? 'Promise<any>' : 'any'));
          retType = isCtorOrSetter ? 'void' : resolveAlias(rawRetType);
        }
        const { params, minArgs } = parseParamList(
          paramStr,
          lineNum,
          Boolean(ctx.tsConfig.noImplicitAny) && Boolean(fnOpen || validMethodOpen)
        );
        if (arrowFnOpen && arrowFnOpen.rawVarDeclType) {
          const resolvedVarDecl = resolveAlias(arrowFnOpen.rawVarDeclType);
          let d = 0, topArrow = -1;
          for (let k = 0; k < resolvedVarDecl.length - 1; k++) {
            const ch = resolvedVarDecl[k];
            if (ch === '"' || ch === "'" || ch === '`') { k = skipString(resolvedVarDecl, k) - 1; continue; }
            if (ch === '(' || ch === '[' || ch === '{' || ch === '<') d++;
            else if (ch === ')' || ch === ']' || ch === '}' || (ch === '>' && resolvedVarDecl[k - 1] !== '=')) d = Math.max(0, d - 1);
            else if (d === 0 && ch === '=' && resolvedVarDecl[k + 1] === '>') { topArrow = k; break; }
          }
          if (topArrow > 0) {
            const leftPart = resolvedVarDecl.slice(0, topArrow).trim();
            const rightPart = resolvedVarDecl.slice(topArrow + 2).trim();
            const openP = leftPart.indexOf('(');
            const closeP = openP >= 0 ? findBalancedParen(leftPart, openP) : -1;
            if (closeP > openP) {
              const { params: ctxParams } = parseParamList(leftPart.slice(openP + 1, closeP).trim(), lineNum, false);
              const rawItems = paramStr ? splitTopLevelDecl(paramStr) : [];
              params.forEach((p, idx) => {
                const rawC = (rawItems[idx] || '').trim();
                const ctxP = ctxParams[idx];
                if (!rawC.includes(':') && !rawC.includes('=') && ctxP && (p.type === 'any' || p.type === 'any[]')) {
                  p.type = ctxP.type;
                  p.rawType = ctxP.rawType || ctxP.type;
                }
              });
            }
            if (!hasExplicitRet && rightPart && rightPart !== 'any') {
              hasExplicitRet = true;
              rawRetType = rightPart;
              retType = resolveAlias(rightPart);
            }
          }
        }
        const isGen = Boolean((fnOpen && fnOpen[2] === '*') || /^Generator<|^AsyncGenerator<|^IterableIterator<|^Iterator</.test(retType));
        activeFn = {
          name: fName,
          params,
          minArgs,
          returnType: retType,
          rawReturnType: rawRetType,
          typeParams: fnTParams,
          line: lineNum,
          hasValueReturn: isGen,
          hasExplicitReturnType: hasExplicitRet,
          isAsync: isAsyncFn,
          inferredReturnTypes: [],
        };
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
      if (openBraceIdx >= 0 && closeBraceIdx > openBraceIdx) {
        const inlineBody = trimmed.slice(openBraceIdx + 1, closeBraceIdx).trim();
        inlineBody.split(';').map(s => s.trim()).filter(Boolean).forEach(stmt => {
          const inlineVar = stmt.match(/^(?:const|let|var)\s+([A-Za-z_$][\w$]*)(?:\s*:\s*([^=]+?))?\s*=\s*([\s\S]+)$/);
          if (inlineVar && inlineVar[1] && inlineVar[3]) {
            const vName = inlineVar[1];
            const vDecl = inlineVar[2] ? resolveAlias(inlineVar[2].trim()) : null;
            const vT = vDecl || inferType(inlineVar[3].trim(), lineNum);
            env.set(vName, { type: vT, isConst: stmt.startsWith('const'), line: lineNum, declaredType: vT });
            return;
          }
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
      if (/\bthrow\b/.test(bodyAfterOpenBrace)) {
        activeFn.hasValueReturn = true;
      }
      const rm = bodyAfterOpenBrace.match(/\breturn\b([^;}\n]*)/);
      if (rm) {
        const inlineRetExpr = (rm[1] || '').trim();
        if (inlineRetExpr) {
          activeFn.hasValueReturn = true;
          const inlineRetT = inferType(inlineRetExpr, lineNum);
          if (!activeFn.hasExplicitReturnType) {
            if (!activeFn.inferredReturnTypes) activeFn.inferredReturnTypes = [];
            if (!activeFn.inferredReturnTypes.includes(inlineRetT)) {
              activeFn.inferredReturnTypes.push(inlineRetT);
            }
          } else {
            const expRet = activeFn.returnType;
            const unwrappedExp = (expRet && expRet.startsWith('Promise<') && expRet.endsWith('>')) ? expRet.slice(8, -1) : expRet;
            if (expRet && expRet !== 'any' && !isExpressionAssignable(inlineRetExpr, inlineRetT, expRet, lineNum) && !isExpressionAssignable(inlineRetExpr, inlineRetT, unwrappedExp, lineNum)) {
              addDiag(lineNum, 'TS2322', `不能将返回值类型 "${inlineRetT}" 分配给函数 "${activeFn.name}" 声明的返回类型 "${expRet}"`);
            }
          }
        } else if (!activeFn.hasExplicitReturnType) {
          if (!activeFn.inferredReturnTypes) activeFn.inferredReturnTypes = [];
          if (!activeFn.inferredReturnTypes.includes('void')) {
            activeFn.inferredReturnTypes.push('void');
          }
        }
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
          if (!currentFn.hasExplicitReturnType && !isGenRet) {
            const collected = (currentFn.inferredReturnTypes || []).filter(Boolean);
            const nonAny = collected.filter(t => t !== 'any');
            const effective = nonAny.length > 0 ? nonAny : collected;
            let inferredRet = 'void';
            if (effective.length > 0) {
              inferredRet = effective.join(' | ');
            } else if (currentFn.hasValueReturn) {
              inferredRet = 'never';
            }
            if (currentFn.isAsync && !inferredRet.startsWith('Promise<')) {
              inferredRet = `Promise<${inferredRet}>`;
            }
            currentFn.rawReturnType = inferredRet;
            currentFn.returnType = resolveAlias(inferredRet);
          } else if (
            ctx.tsConfig.noImplicitReturns !== false &&
            currentFn.returnType !== 'any' &&
            currentFn.returnType !== 'void' &&
            currentFn.returnType !== 'Promise<void>' &&
            currentFn.returnType !== 'never' &&
            currentFn.returnType !== 'Promise<never>' &&
            currentFn.returnType !== 'unknown' &&
            !isGenRet &&
            !currentFn.hasValueReturn
          ) {
            addDiag(currentFn.line, 'TS2355', `函数 "${currentFn.name}" 声明返回类型为 "${currentFn.returnType}"，但缺少 return 返回值语句`);
          }
          const finishedFn = currentFn;
          const prev = fnScopeStack.pop();
          if (prev) {
            currentFn = prev.fn;
            fnStartBraceDepth = prev.startDepth;
            if (prev.prevEnv) {
              if (finishedFn.name && finishedFn.name !== '<callback>' && prev.prevEnv.has(finishedFn.name)) {
                const prevEntry = prev.prevEnv.get(finishedFn.name);
                if (prevEntry) {
                  const fullSig = formatFnSigInfoToTypeString(finishedFn);
                  const nextType = prevEntry.declaredType && prevEntry.declaredType !== 'function'
                    ? prevEntry.declaredType
                    : fullSig;
                  prev.prevEnv.set(finishedFn.name, {
                    ...prevEntry,
                    type: nextType,
                    declaredType: nextType,
                  });
                }
              }
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

    const catchM = trimmed.match(/^(?:}\s*)?catch\s*\(\s*([A-Za-z_$][\w$]*)(?:\s*:\s*[^)]+)?\s*\)/);
    if (catchM && catchM[1]) {
      env.set(catchM[1], { type: 'any', isConst: false, line: lineNum, declaredType: 'any' });
      continue;
    }

    if (/^(?:\}[\s);,]*|\}\s*,\s*[\s\S]+\)\s*;?|\}\s*else\s*\{?|else\s*\{?|try\s*\{?|\}\s*finally\s*\{?|finally\s*\{?|do\s*\{?)$/.test(trimmed)) {
      continue;
    }

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
        const parseTopLevelFnType = (fnTypeStr: string | null, ln: number) => {
          if (!fnTypeStr) return null;
          const resolved = resolveAlias(fnTypeStr.trim());
          let d = 0;
          let arrowIdx = -1;
          for (let k = 0; k < resolved.length - 1; k++) {
            const ch = resolved[k];
            if (ch === '"' || ch === "'" || ch === '`') { k = skipString(resolved, k) - 1; continue; }
            if (ch === '(' || ch === '[' || ch === '{' || ch === '<') d++;
            else if (ch === ')' || ch === ']' || ch === '}' || (ch === '>' && resolved[k - 1] !== '=')) d = Math.max(0, d - 1);
            else if (d === 0 && ch === '=' && resolved[k + 1] === '>') { arrowIdx = k; break; }
          }
          if (arrowIdx < 0) return null;
          const left = resolved.slice(0, arrowIdx).trim();
          const right = resolved.slice(arrowIdx + 2).trim();
          const openP = left.indexOf('(');
          if (openP < 0) return null;
          const closeP = findBalancedParen(left, openP);
          if (closeP < openP) return null;
          const pInner = left.slice(openP + 1, closeP).trim();
          const { params: ctxParams } = parseParamList(pInner, ln, false);
          return { params: ctxParams, returnType: right || 'any' };
        };

        const parseInlineArrow = (exprStr: string) => {
          let s = exprStr.trim();
          let isAsync = false;
          if (/^async\b/.test(s) && (isWS(s[5]) || s[5] === '(' || s[5] === '<')) {
            isAsync = true;
            s = s.slice(5).trim();
          }
          let typeParamStr = '';
          if (s.startsWith('<')) {
            let ad = 1, k = 1;
            while (k < s.length && ad > 0) {
              const ch = s[k];
              if (ch === '"' || ch === "'" || ch === '`') { k = skipString(s, k); continue; }
              if (ch === '<') ad++;
              else if (ch === '>' && s[k - 1] !== '=') ad--;
              k++;
            }
            if (ad === 0) {
              typeParamStr = s.slice(0, k).trim();
              s = s.slice(k).trim();
            }
          }
          if (s.startsWith('(')) {
            const closeP = findBalancedParen(s, 0);
            if (closeP < 0) return null;
            const paramStr = s.slice(1, closeP).trim();
            const afterParen = s.slice(closeP + 1).trim();
            if (afterParen.startsWith('=>')) {
              return {
                isAsync,
                typeParamStr,
                paramStr,
                rawRet: null,
                bodyStr: afterParen.slice(2).trim(),
              };
            }
            if (afterParen.startsWith(':')) {
              const afterColon = afterParen.slice(1).trim();
              let d = 0;
              let arrowPos = -1;
              let skipFirstFnTypeArrow = afterColon.startsWith('(') || afterColon.startsWith('<');
              for (let k = 0; k < afterColon.length - 1; k++) {
                const ch = afterColon[k];
                if (ch === '"' || ch === "'" || ch === '`') { k = skipString(afterColon, k) - 1; continue; }
                if (ch === '(' || ch === '[' || ch === '{' || ch === '<') d++;
                else if (ch === ')' || ch === ']' || ch === '}' || (ch === '>' && afterColon[k - 1] !== '=')) d = Math.max(0, d - 1);
                else if (d === 0 && ch === '=' && afterColon[k + 1] === '>') {
                  if (skipFirstFnTypeArrow) {
                    skipFirstFnTypeArrow = false;
                    k++;
                    continue;
                  }
                  arrowPos = k;
                  break;
                }
              }
              if (arrowPos > 0) {
                return {
                  isAsync,
                  typeParamStr,
                  paramStr,
                  rawRet: afterColon.slice(0, arrowPos).trim(),
                  bodyStr: afterColon.slice(arrowPos + 2).trim(),
                };
              }
            }
            return null;
          }
          const singleM = s.match(/^([A-Za-z_$][\w$]*)\s*=>\s*([\s\S]+)$/);
          if (singleM && singleM[1] && singleM[2]) {
            return {
              isAsync,
              typeParamStr,
              paramStr: singleM[1],
              rawRet: null,
              bodyStr: singleM[2].trim(),
            };
          }
          return null;
        };

        const splitBlockTopStatements = (blockInner: string): string[] => {
          const stmts: string[] = [];
          let cur = '';
          let d = 0;
          for (let k = 0; k < blockInner.length; k++) {
            const ch = blockInner[k];
            if (ch === '"' || ch === "'" || ch === '`') {
              const end = skipString(blockInner, k);
              cur += blockInner.slice(k, end);
              k = end - 1;
              continue;
            }
            if (ch === '(' || ch === '[' || ch === '{') d++;
            else if (ch === ')' || ch === ']' || ch === '}') d = Math.max(0, d - 1);
            if ((ch === ';' || ch === '\n') && d === 0) {
              if (cur.trim()) stmts.push(cur.trim());
              cur = '';
            } else {
              cur += ch;
            }
          }
          if (cur.trim()) stmts.push(cur.trim());
          return stmts;
        };

        const parts = splitTopLevelDecl(rest);
        parts.forEach(part => {
          const pTrim = part.trim();
          const idM = pTrim.match(/^([A-Za-z_$][\w$]*)/);
          if (idM && idM[1]) {
            const vName = idM[1];
            const afterName = pTrim.slice(vName.length);
            let eqIdx = -1, colonIdx = -1, d = 0;
            for (let k = 0; k < afterName.length; k++) {
              const ch = afterName[k];
              if (ch === '"' || ch === "'" || ch === '`') { k = skipString(afterName, k) - 1; continue; }
              if (ch === '(' || ch === '[' || ch === '{' || ch === '<') d++;
              else if (ch === ')' || ch === ']' || ch === '}' || (ch === '>' && afterName[k - 1] !== '=')) d = Math.max(0, d - 1);
              else if (d === 0 && ch === ':' && colonIdx < 0 && eqIdx < 0) {
                colonIdx = k;
              } else if (
                d === 0 &&
                ch === '=' &&
                afterName[k + 1] !== '=' &&
                afterName[k + 1] !== '>' &&
                afterName[k - 1] !== '=' &&
                afterName[k - 1] !== '!' &&
                afterName[k - 1] !== '<' &&
                afterName[k - 1] !== '>'
              ) {
                eqIdx = k;
                break;
              }
            }
            const rawDeclStr = colonIdx >= 0
              ? afterName.slice(colonIdx + 1, eqIdx >= 0 ? eqIdx : afterName.length).trim()
              : null;
            const declT = rawDeclStr ? resolveAlias(rawDeclStr) : null;
            const initExpr = eqIdx >= 0 ? afterName.slice(eqIdx + 1).trim() : null;

            let inlineArrowSigStr: string | null = null;
            if (initExpr) {
              const parsedArrow = parseInlineArrow(initExpr);
              if (parsedArrow) {
                const arrowTParams = parsedArrow.typeParamStr ? parseTypeParams(parsedArrow.typeParamStr) : [];
                const rawParamItems = parsedArrow.paramStr ? splitTopLevelDecl(parsedArrow.paramStr) : [];
                const { params: aParams, minArgs: aMin } = parseParamList(parsedArrow.paramStr, lineNum, false);
                const ctxFn = parseTopLevelFnType(rawDeclStr || declT, lineNum);
                if (ctxFn) {
                  aParams.forEach((p, idx) => {
                    const rawClause = (rawParamItems[idx] || '').trim();
                    const hasExplicitOrDefault = rawClause.includes(':') || rawClause.includes('=');
                    const ctxP = ctxFn.params[idx];
                    if (!hasExplicitOrDefault && ctxP && (p.type === 'any' || p.type === 'any[]')) {
                      p.type = ctxP.type;
                      p.rawType = ctxP.rawType || ctxP.type;
                    }
                  });
                }

                const savedEnv = new Map<string, VarEnvInfo | undefined>();
                const boundNames = new Set<string>();
                const savedTParams = new Map<string, string | undefined>();
                arrowTParams.forEach(tp => {
                  savedTParams.set(tp.name, activeTypeParams.get(tp.name));
                  activeTypeParams.set(tp.name, tp.constraint ? resolveAlias(tp.constraint) : tp.name);
                });
                aParams.forEach(p => {
                  boundNames.add(p.name);
                  savedEnv.set(p.name, env.get(p.name));
                  env.set(p.name, { type: p.type, isConst: false, line: lineNum, declaredType: p.type });
                });

                const rawBody = parsedArrow.bodyStr.trim();
                const isBlockBody = rawBody.startsWith('{') && rawBody.endsWith('}') && findBalancedParen(rawBody, 0) === rawBody.length - 1;
                let inferredBodyRet = 'any';
                let hasValRet = true;
                if (isBlockBody) {
                  const innerBody = rawBody.slice(1, -1).trim();
                  const stmts = innerBody ? splitBlockTopStatements(innerBody) : [];
                  if (stmts.length === 0) {
                    inferredBodyRet = 'void';
                    hasValRet = false;
                  } else {
                    const retTypes: string[] = [];
                    let sawThrow = false;
                    stmts.forEach(st => {
                      const localVarM = st.match(/^(?:const|let|var)\s+([A-Za-z_$][\w$]*)(?:\s*:\s*([^=]+?))?\s*=\s*([\s\S]+)$/);
                      if (localVarM && localVarM[1] && localVarM[3]) {
                        const lvName = localVarM[1];
                        const lvDecl = localVarM[2] ? resolveAlias(localVarM[2].trim()) : null;
                        const lvT = lvDecl || inferType(localVarM[3].trim(), lineNum);
                        if (!boundNames.has(lvName)) {
                          boundNames.add(lvName);
                          savedEnv.set(lvName, env.get(lvName));
                        }
                        env.set(lvName, { type: lvT, isConst: st.startsWith('const'), line: lineNum, declaredType: lvT });
                        return;
                      }
                      const rM = st.match(/^return(?:\s+([\s\S]+))?$/);
                      if (rM) {
                        const rExpr = rM[1] ? rM[1].trim() : '';
                        const rT = rExpr ? inferType(rExpr, lineNum) : 'void';
                        if (!retTypes.includes(rT)) retTypes.push(rT);
                        return;
                      }
                      if (/^throw\b/.test(st)) {
                        sawThrow = true;
                        const thExpr = st.replace(/^throw\s+/, '').trim();
                        if (thExpr) inferType(thExpr, lineNum);
                        return;
                      }
                      inferType(st, lineNum);
                    });
                    if (retTypes.length === 0) {
                      inferredBodyRet = sawThrow ? 'never' : 'void';
                      hasValRet = sawThrow;
                    } else {
                      inferredBodyRet = retTypes.join('|');
                      hasValRet = retTypes.some(t => t !== 'void');
                    }
                  }
                } else {
                  inferredBodyRet = inferType(rawBody, lineNum);
                  hasValRet = true;
                }

                boundNames.forEach(bName => {
                  const prev = savedEnv.get(bName);
                  if (prev !== undefined) env.set(bName, prev);
                  else env.delete(bName);
                });
                arrowTParams.forEach(tp => {
                  const prevTp = savedTParams.get(tp.name);
                  if (prevTp !== undefined) activeTypeParams.set(tp.name, prevTp);
                  else activeTypeParams.delete(tp.name);
                });

                let finalRawRet: string;
                let finalRet: string;
                if (parsedArrow.rawRet) {
                  finalRawRet = parsedArrow.rawRet;
                  finalRet = resolveAlias(finalRawRet);
                  const expectedBodyRet = parsedArrow.isAsync && finalRet.startsWith('Promise<') && finalRet.endsWith('>')
                    ? finalRet.slice(8, -1).trim()
                    : finalRet;
                  if (
                    expectedBodyRet !== 'any' &&
                    expectedBodyRet !== 'void' &&
                    inferredBodyRet !== 'any' &&
                    !isExpressionAssignable(isBlockBody ? '' : rawBody, inferredBodyRet, expectedBodyRet, lineNum)
                  ) {
                    addDiag(lineNum, 'TS2322', `不能将返回值类型 "${inferredBodyRet}" 分配给声明的返回类型 "${finalRet}"`);
                  }
                } else {
                  let baseRet = inferredBodyRet;
                  if (baseRet === 'any' && ctxFn && ctxFn.returnType) {
                    baseRet = ctxFn.returnType;
                  }
                  if (parsedArrow.isAsync && !baseRet.startsWith('Promise<')) {
                    baseRet = `Promise<${baseRet}>`;
                  }
                  finalRawRet = baseRet;
                  finalRet = resolveAlias(baseRet);
                }

                const arrowSig: FnSigInfo = {
                  name: vName,
                  params: aParams,
                  minArgs: aMin,
                  returnType: finalRet,
                  rawReturnType: finalRawRet,
                  typeParams: arrowTParams,
                  line: lineNum,
                  hasValueReturn: hasValRet,
                };
                fns.set(vName, arrowSig);
                inlineArrowSigStr = formatFnSigInfoToTypeString(arrowSig);
              }
            }

            const narrowedPropKey = initExpr ? '__narrowed_prop_' + initExpr : '';
            let initT = inlineArrowSigStr ? inlineArrowSigStr : (initExpr ? inferType(initExpr, lineNum) : 'any');
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
            if (!declT && !initExpr && ctx.tsConfig.noImplicitAny) {
              addDiag(lineNum, 'TS7005', `变量 "${vName}" 隐式具有 "any" 类型（严格模式下请显式添加类型注解或初始值）`);
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

    const retM = trimmed.match(/^return(?:\s+([\s\S]+?))?;?$/);
    if (retM) {
      const retExpr = retM[1] ? retM[1].trim() : '';
      const retT = retExpr ? inferType(retExpr, lineNum) : 'void';
      if (currentFn) {
        if (retExpr) currentFn.hasValueReturn = true;
        if (!currentFn.hasExplicitReturnType) {
          if (!currentFn.inferredReturnTypes) currentFn.inferredReturnTypes = [];
          if (!currentFn.inferredReturnTypes.includes(retT)) {
            currentFn.inferredReturnTypes.push(retT);
          }
        } else {
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
      }
      continue;
    }

    const throwM = trimmed.match(/^throw\s+([\s\S]+?);?$/);
    if (throwM && throwM[1]) {
      if (currentFn) currentFn.hasValueReturn = true;
      inferType(throwM[1].trim(), lineNum);
      continue;
    }

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
        if (/^throw\b/.test(caseRest) && currentFn) {
          currentFn.hasValueReturn = true;
        }
        const inlineRet = caseRest.match(/^return(?:\s+([\s\S]+?))?;?$/);
        if (inlineRet) {
          const rExpr = inlineRet[1] ? inlineRet[1].trim() : '';
          const rT = rExpr ? inferType(rExpr, lineNum) : 'void';
          if (currentFn) {
            if (rExpr) currentFn.hasValueReturn = true;
            if (!currentFn.hasExplicitReturnType) {
              if (!currentFn.inferredReturnTypes) currentFn.inferredReturnTypes = [];
              if (!currentFn.inferredReturnTypes.includes(rT)) {
                currentFn.inferredReturnTypes.push(rT);
              }
            } else {
              const expectedRet = currentFn.returnType;
              if (expectedRet && expectedRet !== 'any' && !isExpressionAssignable(rExpr, rT, expectedRet, lineNum)) {
                addDiag(lineNum, 'TS2322', `不能将返回值类型 "${rT}" 分配给函数 "${currentFn.name}" 声明的返回类型 "${expectedRet}"`);
              }
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
      const defRest = (defaultM[1] || '').trim();
      if (defRest) {
        if (/^throw\b/.test(defRest) && currentFn) {
          currentFn.hasValueReturn = true;
        }
        const inlineDefRet = defRest.match(/^return(?:\s+([\s\S]+?))?;?$/);
        if (inlineDefRet && currentFn) {
          const rExpr = inlineDefRet[1] ? inlineDefRet[1].trim() : '';
          const rT = rExpr ? inferType(rExpr, lineNum) : 'void';
          if (rExpr) currentFn.hasValueReturn = true;
          if (!currentFn.hasExplicitReturnType) {
            if (!currentFn.inferredReturnTypes) currentFn.inferredReturnTypes = [];
            if (!currentFn.inferredReturnTypes.includes(rT)) {
              currentFn.inferredReturnTypes.push(rT);
            }
          }
        }
      }
      continue;
    }

    const applyClauseNarrowing = (clauseStr: string, forEarlyExit: boolean) => {
      const c = clauseStr.trim();
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

    const inlineIfThrow = trimmed.match(/^if\s*\((.+?)\)\s*throw\s+([\s\S]+?);?$/);
    if (inlineIfThrow && inlineIfThrow[1] && inlineIfThrow[2]) {
      if (currentFn) currentFn.hasValueReturn = true;
      inferType(inlineIfThrow[1].trim(), lineNum);
      inferType(inlineIfThrow[2].trim(), lineNum);
      continue;
    }

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
          if (/\b(?:return\s+[^;}\s]|throw\b)/.test(bodyInner) && currentFn) {
            currentFn.hasValueReturn = true;
          }
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
        condStr.split('&&').forEach(clause => {
          const cm = clause.trim().match(/^([A-Za-z_$][\w$]*)\s*!==\s*(null|undefined)$/);
          if (cm && cm[1] && cm[2] && env.has(cm[1])) {
            const curInfo = env.get(cm[1]) || { type: 'any' };
            env.set(cm[1], { ...curInfo, type: stripNullableFromType(curInfo.type, cm[2]) });
          }
          applyClauseNarrowing(clause, false);
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

    inferType(trimmed, lineNum);
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

  if (ctx.tsConfig.noUnusedLocals) {
    const cleanSource = lines.map(ln => stripInlineCommentSafe(ln)).join('\n');
    env.forEach((info, vName) => {
      if (!info.line || vName === 'this' || vName.startsWith('__')) return;
      const declLineRaw = stripInlineCommentSafe(lines[info.line - 1] || '').trim();
      if (/^export\b/.test(declLineRaw)) return;
      const idRe = new RegExp(`\\b${vName.replace(/\$/g, '\\$')}\\b`, 'g');
      const matches = cleanSource.match(idRe);
      if (!matches || matches.length <= 1) {
        addDiag(info.line, 'TS6133', `已声明 "${vName}"，但从未读取其值 (noUnusedLocals)`);
      }
    });
  }
}

function syncContextFunctionTypesToMeta(ctx: TypeCheckContext): void {
  const meta = appState.CURRENT_TS_META;
  if (!meta) return;
  if (!meta.fnTypes) meta.fnTypes = new Map<string, string>();
  if (!meta.typeAliases) meta.typeAliases = new Map<string, TypeAliasMeta>();
  const fnTypes = meta.fnTypes;
  const varTypes = meta.varTypes;
  const typeAliases = meta.typeAliases;
  ctx.fns.forEach((sig, fnKey) => {
    if (!fnKey || fnKey.includes('.') || fnKey.startsWith('<')) return;
    const formatted = formatFnSigInfoToTypeString(sig);
    fnTypes.set(fnKey, formatted);
    varTypes.set(fnKey, formatted);
  });
  ctx.env.forEach((info, vName) => {
    const candidate = info.declaredType || info.type;
    if (candidate && candidate.includes('=>')) {
      fnTypes.set(vName, candidate);
      varTypes.set(vName, candidate);
    }
  });
  ctx.typeAliases.forEach((evaluatedBody, aliasName) => {
    const prev = typeAliases.get(aliasName);
    const rawDef = prev ? prev.rawDef : evaluatedBody;
    const updated = buildTypeAliasMeta(
      aliasName,
      rawDef,
      evaluatedBody,
      prev ? prev.line : undefined,
      prev ? prev.typeParams : undefined,
      meta.interfaces,
      typeAliases
    );
    typeAliases.set(aliasName, updated);
  });
  ctx.genericTypeAliases.forEach((gInfo, aliasName) => {
    const prev = typeAliases.get(aliasName);
    const tParamsStr = `<${gInfo.typeParams.map(tp => tp.name).join(', ')}>`;
    const updated = buildTypeAliasMeta(
      aliasName,
      prev ? prev.rawDef : gInfo.body,
      undefined,
      gInfo.line || (prev ? prev.line : undefined),
      tParamsStr,
      meta.interfaces,
      typeAliases
    );
    typeAliases.set(aliasName, updated);
  });
}

export function typecheckTS(src: string, strict = appState.STRICT_TS) {
  extractTsInterfaceMetadata(src);
  if (!strict) return [];
  const configKey = formatTsConfigCacheKey(appState.TS_CONFIG);
  if (
    typeof src === 'string' &&
    _TYPECHECK_CACHE.src === src &&
    _TYPECHECK_CACHE.strict === strict &&
    _TYPECHECK_CACHE.configKey === configKey
  ) {
    if (appState.CURRENT_TS_META) {
      if (_TYPECHECK_CACHE.fnTypes) {
        if (!appState.CURRENT_TS_META.fnTypes) {
          appState.CURRENT_TS_META.fnTypes = new Map<string, string>();
        }
        const targetFnTypes = appState.CURRENT_TS_META.fnTypes;
        _TYPECHECK_CACHE.fnTypes.forEach((v, k) => targetFnTypes.set(k, v));
      }
      if (_TYPECHECK_CACHE.varTypes) {
        const targetVarTypes = appState.CURRENT_TS_META.varTypes;
        _TYPECHECK_CACHE.varTypes.forEach((v, k) => targetVarTypes.set(k, v));
      }
      if (_TYPECHECK_CACHE.typeAliases) {
        if (!appState.CURRENT_TS_META.typeAliases) {
          appState.CURRENT_TS_META.typeAliases = new Map<string, TypeAliasMeta>();
        }
        const targetAliases = appState.CURRENT_TS_META.typeAliases;
        _TYPECHECK_CACHE.typeAliases.forEach((v, k) => targetAliases.set(k, v));
      }
    }
    return _TYPECHECK_CACHE.diags.map((d: Diag) => ({ ...d }));
  }

  const ctx = createTypeCheckContext(src, appState.TS_CONFIG);
  const evalEngine = createTypeEvalEngine(ctx);
  const inferEngine = createTypeInferEngine(ctx, evalEngine);

  collectPass1Declarations(ctx, evalEngine, inferEngine);
  checkPass2Statements(ctx, evalEngine, inferEngine);
  syncContextFunctionTypesToMeta(ctx);

  const { diagnostics } = ctx;

  if (
    _TS_WORKER_STATE.lastSrc === src &&
    _TS_WORKER_STATE.lastConfigKey === configKey &&
    Array.isArray(_TS_WORKER_STATE.lastDiags)
  ) {
    _TS_WORKER_STATE.lastDiags.forEach((wd: { line: number; code: string; message?: string }) => {
      if (!diagnostics.some(d => d.line === wd.line && d.code === wd.code)) {
        diagnostics.push({ line: wd.line, code: wd.code, message: wd.message });
      }
    });
  } else {
    requestTsWorkerCheck(src, strict);
  }

  if (typeof src === 'string') {
    _TYPECHECK_CACHE = {
      src,
      strict,
      configKey,
      diags: diagnostics.map(d => ({ ...d })),
      fnTypes: appState.CURRENT_TS_META?.fnTypes ? new Map(appState.CURRENT_TS_META.fnTypes) : undefined,
      varTypes: appState.CURRENT_TS_META?.varTypes ? new Map(appState.CURRENT_TS_META.varTypes) : undefined,
      typeAliases: appState.CURRENT_TS_META?.typeAliases ? new Map(appState.CURRENT_TS_META.typeAliases) : undefined,
    };
  }
  return diagnostics;
}

function linkSymbolFromDependency(
  targetCtx: TypeCheckContext,
  depCtx: TypeCheckContext,
  depNode: ModuleNode,
  importedName: string,
  localName: string,
  lineNum: number
): void {
  const expSpec = depNode.exports.find(e => e.exported === importedName);
  const srcName = expSpec ? expSpec.local : importedName;

  // Copy supporting nominal types referenced by exported functions/classes
  depCtx.interfaces.forEach((shape, ifaceName) => {
    if (!targetCtx.interfaces.has(ifaceName)) {
      targetCtx.interfaces.set(ifaceName, new Map(shape));
    }
  });
  depCtx.interfaceTypeParams.forEach((tParams, ifaceName) => {
    if (!targetCtx.interfaceTypeParams.has(ifaceName)) {
      targetCtx.interfaceTypeParams.set(ifaceName, [...tParams]);
    }
  });
  depCtx.classParents.forEach((parent, clsName) => {
    if (!targetCtx.classParents.has(clsName)) {
      targetCtx.classParents.set(clsName, parent);
    }
  });
  depCtx.typeAliases.forEach((aliasBody, aliasName) => {
    if (!targetCtx.typeAliases.has(aliasName)) {
      targetCtx.typeAliases.set(aliasName, aliasBody);
    }
  });
  depCtx.genericTypeAliases.forEach((gInfo, aliasName) => {
    if (!targetCtx.genericTypeAliases.has(aliasName)) {
      targetCtx.genericTypeAliases.set(aliasName, { ...gInfo });
    }
  });
  depCtx.enumsSet.forEach(en => targetCtx.enumsSet.add(en));
  depCtx.enumMembers.forEach((mems, en) => {
    if (!targetCtx.enumMembers.has(en)) targetCtx.enumMembers.set(en, new Set(mems));
  });
  depCtx.enumValueTypes.forEach((vts, en) => {
    if (!targetCtx.enumValueTypes.has(en)) targetCtx.enumValueTypes.set(en, new Set(vts));
  });
  // Also copy class methods `ClassName.methodName`
  depCtx.fns.forEach((sig, fnKey) => {
    if (fnKey.includes('.') && !targetCtx.fns.has(fnKey)) {
      targetCtx.fns.set(fnKey, { ...sig });
    }
  });

  if (depCtx.fns.has(srcName)) {
    const fnSig = depCtx.fns.get(srcName);
    if (fnSig) {
      targetCtx.fns.set(localName, { ...fnSig, name: localName });
    }
  }
  if (depCtx.interfaces.has(srcName)) {
    const shape = depCtx.interfaces.get(srcName);
    if (shape) {
      targetCtx.interfaces.set(localName, new Map(shape));
      const tParams = depCtx.interfaceTypeParams.get(srcName);
      if (tParams) targetCtx.interfaceTypeParams.set(localName, [...tParams]);
      if (depCtx.abstractClasses.has(srcName)) targetCtx.abstractClasses.add(localName);
      depCtx.fns.forEach((sig, fnKey) => {
        if (fnKey.startsWith(srcName + '.')) {
          const suffix = fnKey.slice(srcName.length);
          targetCtx.fns.set(localName + suffix, { ...sig });
        }
      });
    }
  }
  if (depCtx.typeAliases.has(srcName)) {
    const body = depCtx.typeAliases.get(srcName);
    if (body) targetCtx.typeAliases.set(localName, body);
  }
  if (depCtx.genericTypeAliases.has(srcName)) {
    const g = depCtx.genericTypeAliases.get(srcName);
    if (g) targetCtx.genericTypeAliases.set(localName, { ...g });
  }
  if (depCtx.enumsSet.has(srcName)) {
    targetCtx.enumsSet.add(localName);
    const mems = depCtx.enumMembers.get(srcName);
    if (mems) targetCtx.enumMembers.set(localName, new Set(mems));
    const vts = depCtx.enumValueTypes.get(srcName);
    if (vts) targetCtx.enumValueTypes.set(localName, new Set(vts));
  }
  if (depCtx.env.has(srcName)) {
    const vInfo = depCtx.env.get(srcName);
    if (vInfo) {
      targetCtx.env.set(localName, {
        type: vInfo.declaredType || vInfo.type,
        isConst: true,
        line: lineNum,
        declaredType: vInfo.declaredType || vInfo.type,
      });
    }
  }
}

export function typecheckWorkspaceModules(
  entryFile: string,
  entrySource: string,
  fileMap: ReadonlyMap<string, string> | Record<string, string>,
  strict = appState.STRICT_TS
): { diagnostics: Diag[]; diags: Diag[]; graph: ModuleGraphResult } {
  const isReadonlyMap = (
    m: ReadonlyMap<string, string> | Record<string, string>
  ): m is ReadonlyMap<string, string> => m instanceof Map;
  const rawTsConfig = isReadonlyMap(fileMap)
    ? (fileMap.get('tsconfig.json') ?? fileMap.get('/workspace/tsconfig.json'))
    : (fileMap['tsconfig.json'] ?? fileMap['/workspace/tsconfig.json']);
  let activeTsConfig = appState.TS_CONFIG;
  let tsConfigErrorDiag: Diag | null = null;
  if (typeof rawTsConfig === 'string' && rawTsConfig.trim()) {
    const parsedCfg = parseTsConfigJson(rawTsConfig, appState.TS_CONFIG);
    if (parsedCfg.error) {
      tsConfigErrorDiag = {
        file: 'tsconfig.json',
        line: 1,
        code: 'TS5095',
        message: parsedCfg.error,
        severity: 'error',
      };
    } else {
      activeTsConfig = parsedCfg.config;
      appState.TS_CONFIG = parsedCfg.config;
    }
  }

  const graph = buildModuleGraph(entryFile, entrySource, fileMap);
  if (!graph.isMultiFile) {
    const singleDiags: Diag[] = typecheckTS(entrySource, strict).map(d => ({
      ...d,
      file: ('file' in d && d.file) ? d.file : graph.entryFile,
    }));
    if (tsConfigErrorDiag) singleDiags.unshift(tsConfigErrorDiag);
    return { diagnostics: singleDiags, diags: singleDiags, graph };
  }

  appState.CURRENT_TS_META = {
    interfaces: new Map(),
    varTypes: new Map(),
    fnTypes: new Map(),
    typeAliases: new Map(),
  };

  for (const modFile of graph.order) {
    const modNode = graph.modules.get(modFile);
    if (modNode) {
      extractTsInterfaceMetadata(modNode.rawSource, true);
    }
  }
  // Propagate aliased imports in CURRENT_TS_META even when strict is false
  for (const modFile of graph.order) {
    const modNode = graph.modules.get(modFile);
    if (!modNode) continue;
    for (const imp of modNode.imports) {
      for (const bind of imp.bindings) {
        if (bind.imported !== '*' && bind.local !== bind.imported) {
          const fnSig = appState.CURRENT_TS_META.fnTypes?.get(bind.imported);
          if (fnSig && appState.CURRENT_TS_META.fnTypes) {
            appState.CURRENT_TS_META.fnTypes.set(bind.local, fnSig);
          }
          const vType = appState.CURRENT_TS_META.varTypes.get(bind.imported);
          if (vType) {
            appState.CURRENT_TS_META.varTypes.set(bind.local, vType);
          }
        }
      }
    }
  }

  if (!strict) {
    const diags = [...graph.diagnostics];
    if (tsConfigErrorDiag) diags.unshift(tsConfigErrorDiag);
    return { diagnostics: diags, diags, graph };
  }

  const allDiagnostics: Diag[] = [...graph.diagnostics];
  if (tsConfigErrorDiag) allDiagnostics.unshift(tsConfigErrorDiag);
  const checkedContexts = new Map<string, TypeCheckContext>();

  for (const modFile of graph.order) {
    const modNode = graph.modules.get(modFile);
    if (!modNode) continue;

    const ctx = createTypeCheckContext(modNode.rawSource, activeTsConfig);
    const evalEngine = createTypeEvalEngine(ctx);
    const inferEngine = createTypeInferEngine(ctx, evalEngine);

    for (const imp of modNode.imports) {
      if (imp.isBuiltinFs || !imp.resolvedPath) continue;
      const depCtx = checkedContexts.get(imp.resolvedPath);
      const depNode = graph.modules.get(imp.resolvedPath);
      if (!depCtx || !depNode) continue;

      for (const bind of imp.bindings) {
        if (bind.imported === '*') {
          const nsTypeName = `__ModuleNs_${imp.resolvedPath.replace(/[^A-Za-z0-9_]/g, '_')}__`;
          const nsShape = new Map<string, PropShapeInfo>();
          for (const exp of depNode.exports) {
            if (exp.kind === 'type') continue;
            const localV = depCtx.env.get(exp.local);
            if (localV) {
              nsShape.set(exp.exported, {
                type: localV.declaredType || localV.type,
                rawType: localV.declaredType || localV.type,
                optional: false,
              });
            }
            const localFn = depCtx.fns.get(exp.local);
            if (localFn) {
              ctx.fns.set(`${nsTypeName}.${exp.exported}`, { ...localFn, name: `${nsTypeName}.${exp.exported}` });
              nsShape.set(exp.exported, {
                type: 'function',
                rawType: 'function',
                optional: false,
              });
            }
          }
          ctx.interfaces.set(nsTypeName, nsShape);
          ctx.env.set(bind.local, {
            type: nsTypeName,
            isConst: true,
            line: imp.line,
            declaredType: nsTypeName,
          });
        } else {
          linkSymbolFromDependency(ctx, depCtx, depNode, bind.imported, bind.local, imp.line);
        }
      }
    }

    collectPass1Declarations(ctx, evalEngine, inferEngine);
    checkPass2Statements(ctx, evalEngine, inferEngine);
    syncContextFunctionTypesToMeta(ctx);
    checkedContexts.set(modFile, ctx);

    for (const d of ctx.diagnostics) {
      allDiagnostics.push({
        file: modFile,
        line: d.line,
        code: d.code,
        message: d.message,
        severity: 'error',
      });
    }
  }

  return { diagnostics: allDiagnostics, diags: allDiagnostics, graph };
}

const _TS_WORKER_STATE: {
  worker: Worker | null;
  failed: boolean;
  reqId: number;
  pendingSrc: string | null;
  lastSrc: string | null;
  lastConfigKey: string | null;
  lastDiags: Array<{ line: number; code: string; message?: string }> | null;
  timer: ReturnType<typeof setTimeout> | null;
} = {
  worker: null,
  failed: false,
  reqId: 0,
  pendingSrc: null,
  lastSrc: null,
  lastConfigKey: null,
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
      _TS_WORKER_STATE.lastConfigKey = typeof data.configKey === 'string' ? data.configKey : null;
      const newDiags = Array.isArray(data.diagnostics) ? data.diagnostics : [];
      _TS_WORKER_STATE.lastDiags = newDiags;
      if (_TYPECHECK_CACHE.src === data.src && newDiags.length > 0) {
        _TYPECHECK_CACHE = { src: null, strict: null, configKey: null, diags: [] };
        try { uiHooks.updateEditorChrome(); } catch (_) {}
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
  const configKey = formatTsConfigCacheKey(appState.TS_CONFIG);
  if (_TS_WORKER_STATE.timer) clearTimeout(_TS_WORKER_STATE.timer);
  _TS_WORKER_STATE.timer = setTimeout(() => {
    const id = ++_TS_WORKER_STATE.reqId;
    try {
      w.postMessage({
        id,
        type: 'check',
        src: _TS_WORKER_STATE.pendingSrc,
        strict: Boolean(strict),
        tsConfig: { ...appState.TS_CONFIG },
        configKey,
      });
    } catch (_) {}
  }, 60);
}

export const typeCheck = typecheckTS;
export const parseType = normalizeTsType;
export const typeToStr = normalizeTsType;
export const isAssignable = isTsAssignable;
export function inferExpr(expr: string): string {
  return normalizeTsType(expr);
}
