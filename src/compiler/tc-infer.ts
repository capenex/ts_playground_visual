/* ================================================================
   TypeScript Expression Type Inference & Call-Site Checking Engine (src/compiler/tc-infer.ts)
   ================================================================ */
import {
  findBalancedParen,
  isWS,
  readIdent,
  skipString,
  skipTemplateExpr,
  splitTopLevel,
  stripInlineCommentSafe,
  RESERVED_WORDS,
} from "./comments";
import { extractBindingNames } from "./instrumenter";
import {
  FnSigInfo,
  inferLiteralType,
  isTsAssignable,
  normalizeTsType,
  parseObjectLiteralEntries,
  parseTypeParams,
  PropShapeInfo,
  splitTopLevelDecl,
  splitTopLevelUnion,
  stripNullableFromType,
  stripTupleElementLabel,
  TypeCheckContext,
  VarEnvInfo,
} from "./tc-types";
import { TypeEvalEngine } from "./tc-eval";

export interface TypeInferEngine {
  inferType: (expr: string | null | undefined, lineNum: number) => string;
  isExpressionAssignable: (expr: string | null | undefined, actualType: string, expectedType: string, lineNum: number) => boolean;
  checkObjectLiteralAgainstShape: (objExpr: string, expectedType: string, lineNum: number, contextDesc: string) => boolean;
  checkTemplateInterpolations: (tpl: string, lineNum: number) => void;
  instantiateAndCheckCall: (
    sig: FnSigInfo,
    explicitTypeArgs: string[],
    args: string[],
    argTypes: string[],
    calleeLabel: string,
    lineNum: number,
    outEnv?: Map<string, string> | null
  ) => string;
  checkArrayElementsAgainst: (arrExpr: string, expectedElemType: string, lineNum: number, contextLabel: string) => void;
  parseParamList: (
    paramStr: string,
    lineNum: number,
    checkUntypedParams?: boolean
  ) => { params: Array<{ name: string; type: string; rawType: string; optional: boolean; isRest?: boolean }>; minArgs: number };
  parseClassTopMember: (
    mem: string,
    propMap: Map<string, PropShapeInfo>,
    clsName: string,
    lineNum: number
  ) => void;
}

export function createTypeInferEngine(ctx: TypeCheckContext, evalEngine: TypeEvalEngine): TypeInferEngine {
  const {
    diagnostics,
    fns,
    interfaceTypeParams,
    interfaces,
    abstractClasses,
    enumsSet,
    enumMembers,
    env,
    activeTypeParams,
    addDiag,
    isKnownIdentifier,
  } = ctx;

  const {
    evaluateType,
    resolveAlias,
    matchConditionalExtends,
    resolveIndexedAccess,
    getInterfaceShape,
    getClassMethodSig,
    isTypeCompatible,
  } = evalEngine;

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

  function checkObjectLiteralAgainstShape(objExpr: string, expectedType: string, lineNum: number, contextDesc: string): boolean {
    const nonNullExpected = stripNullableFromType(stripNullableFromType(evaluateType(expectedType, activeTypeParams), 'null'), 'undefined');
    const shape = getInterfaceShape(nonNullExpected) || getInterfaceShape(expectedType);
    const entries = parseObjectLiteralEntries(objExpr);
    if (!shape || !entries) return false;
    const indexProp = shape.get('__index__');

    shape.forEach((propInfo, propName) => {
      if (propName === '__index__' || propName.startsWith('[')) return;
      if (!propInfo.optional && !entries.has(propName)) {
        addDiag(lineNum, 'TS2741', `类型中缺少属性 "${propName}"，但类型 "${expectedType}" 中需要该属性 (${contextDesc})`);
      }
    });

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

    const yieldM = s.match(/^yield\s*(\*)?\s*([\s\S]*)$/);
    if (yieldM) {
      if (yieldM[2]?.trim()) inferType(yieldM[2].trim(), lineNum);
      return 'any';
    }

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
          if (args.length <= 2 && argTypes[0] && argTypes[0] !== 'any' && isTsAssignable(argTypes[0], 'boolean')) {
            if (argTypes[1] && argTypes[1] !== 'any' && !isTsAssignable(argTypes[1], 'string')) {
              addDiag(lineNum, 'TS2345', `"${callee}" 的第 2 个参数（打印消息）类型 "${argTypes[1]}" 不能赋给类型 "string"`);
            }
          }
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
        if (callee === 'Promise.reject') return 'Promise<never>';
        if (callee === 'Promise.all') return 'Promise<any[]>';
        if (callee === 'Promise.race') return 'Promise<any>';
        if (callee === 'sleep') {
          const sleepT = explicitTypeArgs[0] ? evaluateType(explicitTypeArgs[0]) : (argTypes[1] || 'void');
          return `Promise<${sleepT}>`;
        }
        if (callee === 'setTimeout') return 'number';
        if (callee === 'clearTimeout' || callee === 'queueMicrotask') return 'void';

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

    const exprIncM = s.match(/^(?:(\+\+|--)\s*([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)|([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*(\+\+|--))$/);
    if (exprIncM) {
      const target = exprIncM[2] || exprIncM[3] || '';
      inferType(target, lineNum);
      return 'number';
    }

    if (/^[A-Za-z_$][\w$]*$/.test(s)) {
      if (env.has(s)) return (env.get(s) || { type: 'any' }).type;
      if (!isKnownIdentifier(s)) {
        addDiag(lineNum, 'TS2304', `找不到名称 "${s}"（变量未声明，请使用 let 或 const 声明）`);
      }
    }

    return 'any';
  }

  function instantiateAndCheckCall(
    sig: FnSigInfo,
    explicitTypeArgs: string[],
    args: string[],
    argTypes: string[],
    calleeLabel: string,
    lineNum: number,
    outEnv: Map<string, string> | null = null
  ): string {
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
          let replacedSome = false;
          tpNames.forEach(tpName => {
            if (!callEnv.has(tpName)) {
              const rx = new RegExp(`\\b${tpName}\\b`, 'g');
              if (rx.test(patWithInfer)) {
                patWithInfer = patWithInfer.replace(rx, `infer ${tpName}`);
                replacedSome = true;
              }
            }
          });
          if (replacedSome) {
            const m = matchConditionalExtends(actT, patWithInfer, callEnv, 0);
            if (m.matched) {
              m.inferred.forEach((v, k) => {
                if (!callEnv.has(k)) callEnv.set(k, v);
              });
            }
          }
        }
      }
      tParams.forEach(tp => {
        if (!callEnv.has(tp.name)) {
          callEnv.set(tp.name, tp.defaultType ? evaluateType(tp.defaultType, callEnv) : 'any');
        }
      });
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

  function parseParamList(paramStr: string, lineNum: number, checkUntypedParams = true) {
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
          if (checkUntypedParams) {
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

  function parseClassTopMember(mem: string, propMap: Map<string, PropShapeInfo>, clsName: string, lineNum: number) {
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

  return {
    inferType,
    isExpressionAssignable,
    checkObjectLiteralAgainstShape,
    checkTemplateInterpolations,
    instantiateAndCheckCall,
    checkArrayElementsAgainst,
    parseParamList,
    parseClassTopMember,
  };
}
