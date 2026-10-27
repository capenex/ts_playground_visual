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
import { Diag } from "../types";
import {
  createTypeCheckContext,
  extractTsInterfaceMetadata,
  FnSigInfo,
  inferLiteralType,
  isTsAssignable,
  normalizeTsType,
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

export * from "./tc-types";
export * from "./tc-eval";
export * from "./tc-infer";

let _TYPECHECK_CACHE: { src: string | null; strict: boolean | null; diags: Diag[] } = { src: null, strict: null, diags: [] };

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
        const parts = splitTopLevelDecl(rest);
        parts.forEach(part => {
          const pTrim = part.trim();
          const pm = pTrim.match(/^([A-Za-z_$][\w$]*)(?:\s*:\s*((?:[^=]|=>)+?))?(?:\s*=\s*(?!=|>)([\s\S]+))?$/);
          if (pm && pm[1]) {
            const vName = pm[1];
            const declT = pm[2] ? resolveAlias(pm[2].trim()) : null;
            const initExpr = pm[3] ? pm[3].trim() : null;
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

    const throwM = trimmed.match(/^throw\s+([\s\S]+?);?$/);
    if (throwM && throwM[1]) {
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
}

export function typecheckTS(src: string, strict = appState.STRICT_TS) {
  extractTsInterfaceMetadata(src);
  if (!strict) return [];
  if (typeof src === 'string' && _TYPECHECK_CACHE.src === src && _TYPECHECK_CACHE.strict === strict) {
    return _TYPECHECK_CACHE.diags.map((d: Diag) => ({ ...d }));
  }

  const ctx = createTypeCheckContext(src);
  const evalEngine = createTypeEvalEngine(ctx);
  const inferEngine = createTypeInferEngine(ctx, evalEngine);

  collectPass1Declarations(ctx, evalEngine, inferEngine);
  checkPass2Statements(ctx, evalEngine, inferEngine);

  const { diagnostics } = ctx;

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
      if (_TYPECHECK_CACHE.src === data.src && newDiags.length > 0) {
        _TYPECHECK_CACHE = { src: null, strict: null, diags: [] };
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
  if (_TS_WORKER_STATE.timer) clearTimeout(_TS_WORKER_STATE.timer);
  _TS_WORKER_STATE.timer = setTimeout(() => {
    const id = ++_TS_WORKER_STATE.reqId;
    try {
      w.postMessage({ id, type: 'check', src: _TS_WORKER_STATE.pendingSrc, strict: Boolean(strict) });
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
