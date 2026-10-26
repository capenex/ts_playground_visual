/* ================================================================
   TypeScript Type-Level Evaluation & Compatibility Engine (src/compiler/tc-eval.ts)
   ================================================================ */
import { findBalancedParen, skipString } from "./comments";
import {
  FnSigInfo,
  isLiteralOfPrimitive,
  isTsAssignable,
  matchTemplateLiteralType,
  normalizeTsType,
  parseTopLevelConditional,
  PropShapeInfo,
  splitTopLevelDecl,
  splitTopLevelIntersection,
  splitTopLevelUnion,
  stripNullableFromType,
  stripTupleElementLabel,
  substituteTypeParamsInStr,
  TypeCheckContext,
} from "./tc-types";

export interface TypeEvalEngine {
  evaluateType: (
    rawType: string | null | undefined,
    typeEnv?: Map<string, string>,
    depth?: number,
    expanding?: Set<string>
  ) => string;
  resolveAlias: (t: string | null | undefined, typeEnv?: Map<string, string>) => string;
  matchConditionalExtends: (
    checkT: string,
    extT: string,
    typeEnv: Map<string, string>,
    depth: number
  ) => { matched: boolean; inferred: Map<string, string> };
  resolveIndexedAccess: (
    objT: string,
    keyT: string,
    typeEnv: Map<string, string>,
    depth: number
  ) => string;
  parseObjectShapeLiteral: (
    typeBody: string,
    typeEnv?: Map<string, string>
  ) => Map<string, PropShapeInfo>;
  getInterfaceShape: (typeName: string | null | undefined) => Map<string, PropShapeInfo> | null;
  getClassMethodSig: (className: string, methodName: string) => FnSigInfo | null;
  isTypeCompatible: (
    actualType: string | null | undefined,
    expectedType: string | null | undefined,
    seenPairs?: Set<string>
  ) => boolean;
}

export function createTypeEvalEngine(ctx: TypeCheckContext): TypeEvalEngine {
  const {
    fns,
    typeAliases,
    genericTypeAliases,
    interfaceTypeParams,
    interfaces,
    classParents,
    enumsSet,
    enumValueTypes,
    env,
    activeTypeParams,
    getKnownNominalTypes,
  } = ctx;

  function matchConditionalExtends(
    checkT: string,
    extT: string,
    typeEnv: Map<string, string>,
    depth: number
  ): { matched: boolean; inferred: Map<string, string> } {
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

    // 3. Function pattern: `(...args: infer P) => infer R`
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

    // 7. Template literal pattern with `infer`
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
    const t = normalizeTsType(rawType);
    if (!t || t === 'any' || t === 'unknown' || t === 'never' || t === 'void' ||
        t === 'number' || t === 'string' || t === 'boolean' || t === 'null' ||
        t === 'undefined' || t === 'object' || t === 'symbol' || t === 'bigint') {
      return t || 'any';
    }
    if (/^asserts\s+/.test(t)) return 'void';
    if (/^(?:[A-Za-z_$][\w$]*|this)\s+is\s+/.test(t)) return 'boolean';

    if (typeEnv && typeEnv.has(t)) {
      return typeEnv.get(t) || 'any';
    }

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

    const interParts = splitTopLevelIntersection(t);
    if (interParts.length > 1) {
      const evaled = interParts.map(p => evaluateType(p, typeEnv, depth + 1, expanding));
      if (evaled.includes('never')) return 'never';
      if (evaled.length === 2 && evaled[1] === '{}') {
        return stripNullableFromType(stripNullableFromType(evaled[0], 'null'), 'undefined');
      }
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
      if (typeEnv && typeEnv.size > 0) {
        return substituteTypeParamsInStr(t, typeEnv);
      }
      return t;
    }

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

    if (t.endsWith('[]')) {
      const elemRaw = t.slice(0, -2);
      const elemEval = evaluateType(elemRaw, typeEnv, depth + 1, expanding);
      if (elemEval.includes('|') || elemEval.includes('&') || elemEval.includes('=>')) {
        return `(${elemEval})[]`;
      }
      return `${elemEval}[]`;
    }

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

    const genM = t.match(/^([A-Za-z_$][\w$]*)<([\s\S]+)>$/);
    if (genM && genM[1] && genM[2]) {
      const baseName = genM[1];
      const rawArgs = splitTopLevelDecl(genM[2]).map(a => evaluateType(a.trim(), typeEnv, depth + 1, expanding));
      const arg0 = rawArgs[0] || 'any';
      const arg1 = rawArgs[1] || 'any';

      if (baseName === 'Array' || baseName === 'ReadonlyArray') {
        return arg0.includes('|') ? `(${arg0})[]` : `${arg0}[]`;
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
        const kept = uParts.filter(p => !isTypeCompatible(p, arg1));
        return kept.length ? kept.join('|') : 'never';
      }
      if (baseName === 'Extract' && rawArgs.length === 2) {
        const uParts = splitTopLevelUnion(arg0);
        const kept = uParts.filter(p => isTypeCompatible(p, arg1));
        return kept.length ? kept.join('|') : 'never';
      }
      if (baseName === 'NonNullable' && rawArgs.length === 1) {
        const uParts = splitTopLevelUnion(arg0).filter(p => p !== 'null' && p !== 'undefined' && p !== 'void');
        return uParts.length ? uParts.join('|') : 'never';
      }
      if (baseName === 'ReturnType' && rawArgs.length === 1) {
        const arrowIdx = arg0.lastIndexOf('=>');
        if (arrowIdx > 0) return evaluateType(arg0.slice(arrowIdx + 2).trim(), typeEnv, depth + 1, expanding);
        return 'any';
      }
      if (baseName === 'Parameters' && rawArgs.length === 1) {
        if (arg0.startsWith('(')) {
          const closeP = findBalancedParen(arg0, 0);
          if (closeP > 0) {
            const pInner = arg0.slice(1, closeP).trim();
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
        if (arg0.startsWith('"') && arg0.endsWith('"')) {
          const inner = arg0.slice(1, -1);
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

    if (typeAliases.has(t)) {
      if (expanding.has(t)) return t;
      const nextExp = new Set(expanding);
      nextExp.add(t);
      return evaluateType(typeAliases.get(t), typeEnv, depth + 1, nextExp);
    }

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

    if (enumsSet.has(e)) {
      if (a === e || a.startsWith(e + '.')) return true;
      const vTypes = enumValueTypes.get(e);
      if (vTypes && vTypes.has('number') && !vTypes.has('string')) {
        if (a === 'number' || /^[+-]?\d+(?:\.\d+)?$/.test(a)) return true;
      }
      return false;
    }

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

  return {
    evaluateType,
    resolveAlias,
    matchConditionalExtends,
    resolveIndexedAccess,
    parseObjectShapeLiteral,
    getInterfaceShape,
    getClassMethodSig,
    isTypeCompatible,
  };
}
