/* ================================================================
   TypeScript type stripper & syntax transpiler (src/compiler/transpile.ts)
   ================================================================ */
import {
  isIdentPart,
  isIdentStart,
  isWS,
  newlinesOf,
  readIdent,
  regexAllowedBefore,
  skipRegex,
  skipString,
  stripCommentsOnly,
} from './comments';
import {
  extractConstructorParamProps,
  looksLikeTypeText,
  NON_TYPED_KEYWORDS,
  transpileFsImportStatement,
  transpileNamespaces,
  tryParseType,
  tryStripAngleTypeAssertion,
  tryStripGenericArrow,
} from './transpile-helpers';

export * from './transpile-helpers';

function emitTemplate(src: string, i: number): { next: number; text: string } {
  const n = src.length;
  const parts = ['`'];
  i++;
  while (i < n) {
    if (src[i] === '\\') {
      parts.push(src.slice(i, i + 2));
      i += 2;
      continue;
    }
    if (src[i] === '`') {
      parts.push('`');
      return { next: i + 1, text: parts.join('') };
    }
    if (src[i] === '$' && src[i + 1] === '{') {
      parts.push('${');
      i += 2;
      const start = i;
      let depth = 1;
      while (i < n && depth > 0) {
        const ch = src[i];
        if (ch === '{') depth++;
        else if (ch === '}') depth--;
        else if (ch === '"' || ch === "'" || ch === '`') {
          i = skipString(src, i);
          continue;
        }
        i++;
      }
      const end = Math.max(start, i - 1);
      parts.push(stripTypes(src.slice(start, end)));
      parts.push('}');
      i = end + 1;
      continue;
    }
    parts.push(src[i] || '');
    i++;
  }
  return { next: n, text: parts.join('') };
}

function classifyOpenBraceKind(src: string, k: number, braceStack: string[]): string {
  let kind = 'block';
  if (k < 0) return kind;
  const prev = src[k];
  if (prev === ':') {
    const lineStart = src.lastIndexOf('\n', k) + 1;
    const linePrefix = src.slice(lineStart, k + 1).trim();
    const inObject = braceStack.length > 0 && braceStack[braceStack.length - 1] === 'object';
    if (!inObject && /^(?:default|case\b[\s\S]*):$/.test(linePrefix)) {
      kind = 'block';
    } else {
      kind = 'object';
    }
  } else if (
    prev === '=' || prev === '(' || prev === ',' || prev === '[' ||
    prev === '!' || prev === '&' || prev === '|' || prev === '?'
  ) {
    kind = 'object';
  } else if (prev === '>' && k >= 1 && src[k - 1] === '=') {
    kind = 'block';
  } else if (prev === ')') {
    kind = 'block';
  } else if (isIdentPart(prev)) {
    let w = k;
    while (w >= 0 && isIdentPart(src[w])) w--;
    const prevWord = src.slice(w + 1, k + 1);
    if (
      prevWord === 'return' || prevWord === 'case' || prevWord === 'yield' ||
      prevWord === 'typeof' || prevWord === 'const' || prevWord === 'let' || prevWord === 'var'
    ) {
      kind = 'object';
    } else {
      kind = 'block';
    }
  }
  return kind;
}

let _STRIP_TYPES_CACHE: { src: string | null; out: string } = { src: null, out: '' };

export function stripTypes(rawSrc: string): string {
  if (typeof rawSrc === 'string' && _STRIP_TYPES_CACHE.src === rawSrc) {
    return _STRIP_TYPES_CACHE.out;
  }
  const src = typeof rawSrc === 'string' ? transpileNamespaces(rawSrc) : rawSrc;
  let out = '';
  let i = 0;
  const n = src.length;
  const ternaryStack: Array<{ paren: number; brace: number }> = [];
  let parenDepth = 0;
  const braceStack: string[] = [];
  let pendingCtorProps: string[] | null = null;
  let pendingAfterSuperAssigns: string | null = null;
  let superCallTargetDepth = -1;

  function lookBackSignificant(from: number): number {
    let k = from - 1;
    while (k >= 0 && isWS(src[k])) k--;
    return k;
  }

  function isTernaryColonNow(): boolean {
    const top = ternaryStack[ternaryStack.length - 1];
    if (!top) return false;
    return top.paren === parenDepth && top.brace === braceStack.length;
  }

  function popTernariesAtOrAbove(pDepth: number, bDepth: number): void {
    while (ternaryStack.length > 0) {
      const top = ternaryStack[ternaryStack.length - 1];
      if (top && (top.brace > bDepth || (top.brace === bDepth && top.paren >= pDepth))) {
        ternaryStack.pop();
      } else {
        break;
      }
    }
  }

  while (i < n) {
    const c = src[i];

    if (c === '`') {
      const tpl = emitTemplate(src, i);
      out += tpl.text;
      i = tpl.next;
      continue;
    }

    if (c === '"' || c === "'") {
      const s = i;
      i = skipString(src, i);
      out += src.slice(s, i);
      continue;
    }

    if (c === '/') {
      if (src[i + 1] === '/') {
        while (i < n && src[i] !== '\n') i++;
        continue;
      }
      if (src[i + 1] === '*') {
        const s = i;
        i = src.indexOf('*/', i + 2);
        i = i === -1 ? n : i + 2;
        out += newlinesOf(src.slice(s, i));
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

    if (c === '@') {
      let j = i + 1;
      while (j < n && (isIdentPart(src[j]) || src[j] === '.')) j++;
      if (j > i + 1) {
        while (j < n && (src[j] === ' ' || src[j] === '\t')) j++;
        if (src[j] === '<') {
          let ad = 1; j++;
          while (j < n && ad > 0) {
            if (src[j] === '"' || src[j] === "'" || src[j] === '`') { j = skipString(src, j); continue; }
            if (src[j] === '<') ad++;
            else if (src[j] === '>' && src[j - 1] !== '=') ad--;
            j++;
          }
        }
        if (src[j] === '(') {
          let pd = 1; j++;
          while (j < n && pd > 0) {
            if (src[j] === '"' || src[j] === "'" || src[j] === '`') { j = skipString(src, j); continue; }
            if (src[j] === '(') pd++;
            else if (src[j] === ')') pd--;
            j++;
          }
        }
        while (j < n && (src[j] === ' ' || src[j] === '\t')) j++;
        out += newlinesOf(src.slice(i, j));
        i = j;
        continue;
      }
    }

    if (c === '<') {
      const genericEnd = tryStripGenericArrow(src, i);
      if (genericEnd > i) {
        out += newlinesOf(src.slice(i, genericEnd));
        i = genericEnd;
        continue;
      }
      const assertEnd = tryStripAngleTypeAssertion(src, i, lookBackSignificant(i));
      if (assertEnd > i) {
        out += newlinesOf(src.slice(i, assertEnd));
        i = assertEnd;
        continue;
      }
    }

    if (c === '(' || c === '[') {
      parenDepth++;
      out += c;
      i++;
      continue;
    }
    if (c === ')' || c === ']') {
      popTernariesAtOrAbove(parenDepth, braceStack.length);
      parenDepth = Math.max(0, parenDepth - 1);
      out += c;
      i++;
      while (i < n && src[i] === '!' && src[i + 1] !== '=') i++;
      if (c === ')' && superCallTargetDepth >= 0 && parenDepth === superCallTargetDepth && pendingAfterSuperAssigns) {
        if (src[i] === ';') {
          out += ';' + pendingAfterSuperAssigns;
          i++;
        } else {
          out += ';' + pendingAfterSuperAssigns;
        }
        pendingAfterSuperAssigns = null;
        superCallTargetDepth = -1;
      }
      continue;
    }

    if (isIdentStart(c)) {
      const id = readIdent(src, i);
      if (!id) { out += c; i++; continue; }
      const word = id.name;
      const wordStart = i;
      i = id.end;

      if (word === 'super' && pendingAfterSuperAssigns) {
        let js = i;
        while (js < n && isWS(src[js])) js++;
        if (src[js] === '(') {
          superCallTargetDepth = parenDepth;
        }
      }

      if (word === 'import') {
        let j = i;
        while (j < n && isWS(src[j])) j++;
        if (src[j] === '(') {
          out += word;
          continue;
        }
        let depth = 0;
        while (j < n) {
          const ch = src[j];
          if (ch === '"' || ch === "'" || ch === '`') { j = skipString(src, j); continue; }
          if (ch === '{' || ch === '(' || ch === '[') depth++;
          else if (ch === '}' || ch === ')' || ch === ']') depth--;
          else if (ch === ';' && depth <= 0) { j++; break; }
          else if (ch === '\n' && depth <= 0) break;
          j++;
        }
        const rawStmt = src.slice(wordStart, j);
        const fsBinding = transpileFsImportStatement(rawStmt);
        if (fsBinding) {
          out += fsBinding + newlinesOf(rawStmt);
        } else {
          out += newlinesOf(rawStmt);
        }
        i = j;
        continue;
      }
      if (word === 'export') {
        let j = i;
        while (j < n && isWS(src[j])) j++;
        if (src.startsWith('default', j) && !isIdentPart(src[j + 7] || '')) {
          i = j + 7;
          continue;
        }
        if (src.startsWith('type', j) && !isIdentPart(src[j + 4] || '')) {
          let kt = j + 4;
          while (kt < n && isWS(src[kt])) kt++;
          if (src[kt] === '{' || src[kt] === '*') {
            j = kt;
          }
        }
        if (src[j] === '*') {
          while (j < n && src[j] !== ';' && src[j] !== '\n') j++;
          if (src[j] === ';') j++;
          out += newlinesOf(src.slice(wordStart, j));
          i = j;
          continue;
        }
        if (src[j] === '{') {
          let depth = 0;
          while (j < n) {
            if (src[j] === '{') depth++;
            else if (src[j] === '}') { depth--; if (depth === 0) { j++; break; } }
            else if (src[j] === '"' || src[j] === "'" || src[j] === '`') { j = skipString(src, j); continue; }
            j++;
          }
          while (j < n && (src[j] === ' ' || src[j] === '\t')) j++;
          if (src.startsWith('from', j) && !isIdentPart(src[j + 4] || '')) {
            while (j < n && src[j] !== ';' && src[j] !== '\n') j++;
          }
          if (src[j] === ';') j++;
          out += newlinesOf(src.slice(wordStart, j));
          i = j;
          continue;
        }
        continue;
      }
      if (word === 'declare') {
        let j = i;
        while (j < n && (src[j] === ' ' || src[j] === '\t')) j++;
        const nextId = readIdent(src, j);
        if (nextId && (nextId.name === 'interface' || nextId.name === 'type')) {
          continue;
        }
        let depth = 0;
        let seenBraceBlock = false;
        while (j < n) {
          const ch = src[j];
          if (ch === '"' || ch === "'" || ch === '`') { j = skipString(src, j); continue; }
          if (ch === '{') { depth++; seenBraceBlock = true; }
          else if (ch === '}') {
            depth = Math.max(0, depth - 1);
            if (seenBraceBlock && depth === 0) { j++; break; }
          } else if (ch === '(' || ch === '[') depth++;
          else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
          else if (ch === ';' && depth === 0) { j++; break; }
          else if (ch === '\n' && depth === 0) break;
          j++;
        }
        out += newlinesOf(src.slice(wordStart, j));
        i = j;
        continue;
      }
      if (word === 'interface') {
        let j = i;
        let angleDepth = 0;
        while (j < n) {
          const ch = src[j];
          if (ch === '"' || ch === "'" || ch === '`') { j = skipString(src, j); continue; }
          if (ch === '<') angleDepth++;
          else if (ch === '>' && angleDepth > 0) angleDepth--;
          else if (ch === '{' && angleDepth === 0) break;
          else if (ch === '\n' && angleDepth === 0) {
            let p = j + 1;
            while (p < n && (src[p] === ' ' || src[p] === '\t')) p++;
            if (src[p] !== '{' && !/^extends\b/.test(src.slice(p, p + 10))) break;
          }
          j++;
        }
        if (src[j] === '{') {
          let depth = 1;
          j++;
          while (j < n && depth > 0) {
            if (src[j] === '{') depth++;
            else if (src[j] === '}') depth--;
            else if (src[j] === '"' || src[j] === "'" || src[j] === '`') {
              j = skipString(src, j);
              continue;
            }
            j++;
          }
        }
        out += newlinesOf(src.slice(wordStart, j));
        i = j;
        continue;
      }
      if (word === 'type') {
        let j = i;
        while (j < n && (src[j] === ' ' || src[j] === '\t')) j++;
        const typeNameId = readIdent(src, j);
        if (typeNameId) {
          let k = typeNameId.end;
          while (k < n && isWS(src[k])) k++;
          if (src[k] === '<') {
            let ad = 1;
            k++;
            while (k < n && ad > 0) {
              const ch = src[k];
              if (ch === '"' || ch === "'" || ch === '`') { k = skipString(src, k); continue; }
              if (ch === '<') ad++;
              else if (ch === '>' && src[k - 1] !== '=') ad--;
              k++;
            }
            while (k < n && isWS(src[k])) k++;
          }
          if (src[k] === '=' && src[k + 1] !== '=' && src[k + 1] !== '>') {
            j = k + 1;
            let depth = 0;
            let angleDepth = 0;
            while (j < n) {
              const ch = src[j];
              if (ch === '"' || ch === "'" || ch === '`') { j = skipString(src, j); continue; }
              if (ch === '/' && src[j + 1] === '/') {
                while (j < n && src[j] !== '\n') j++;
                continue;
              }
              if (ch === '/' && src[j + 1] === '*') {
                const closeC = src.indexOf('*/', j + 2);
                j = closeC === -1 ? n : closeC + 2;
                continue;
              }
              if (ch === '{' || ch === '[' || ch === '(') depth++;
              else if (ch === '}' || ch === ']' || ch === ')') depth = Math.max(0, depth - 1);
              else if (ch === '<') angleDepth++;
              else if (ch === '>' && angleDepth > 0 && src[j - 1] !== '=') angleDepth--;
              else if (ch === ';' && depth <= 0 && angleDepth <= 0) { j++; break; }
              else if (ch === '\n' && depth <= 0 && angleDepth <= 0) {
                let prevSig = j - 1;
                while (prevSig > k && (src[prevSig] === ' ' || src[prevSig] === '\t' || src[prevSig] === '\r')) prevSig--;
                const prevCh = src[prevSig];
                const prevWordM = src.slice(Math.max(k, prevSig - 10), prevSig + 1).match(/\b(extends|in|as|keyof|infer|readonly)$/);
                let nextSig = j + 1;
                while (nextSig < n && (src[nextSig] === ' ' || src[nextSig] === '\t' || src[nextSig] === '\r')) nextSig++;
                const nextCh = src[nextSig];
                const continuesOnNextLine =
                  prevCh === '=' || prevCh === '|' || prevCh === '&' || prevCh === '?' || prevCh === ':' ||
                  Boolean(prevWordM) ||
                  nextCh === '|' || nextCh === '&' || nextCh === '?' || nextCh === ':' ||
                  /^extends\b/.test(src.slice(nextSig, nextSig + 10));
                if (!continuesOnNextLine) break;
              }
              j++;
            }
            out += newlinesOf(src.slice(wordStart, j));
            i = j;
            continue;
          }
        }
      }

      if (word === 'implements') {
        let j = i;
        while (j < n && src[j] !== '{' && src[j] !== '\n') {
          if (src[j] === '"' || src[j] === "'" || src[j] === '`') { j = skipString(src, j); continue; }
          j++;
        }
        out += newlinesOf(src.slice(wordStart, j));
        i = j;
        continue;
      }

      if (word === 'abstract') {
        let j = i;
        while (j < n && (src[j] === ' ' || src[j] === '\t')) j++;
        const nextId = readIdent(src, j);
        if (nextId && nextId.name !== 'class') {
          let k = nextId.end;
          while (k < n && (src[k] === ' ' || src[k] === '\t')) k++;
          if (src[k] === '<') {
            let ad = 1; k++;
            while (k < n && ad > 0) {
              if (src[k] === '"' || src[k] === "'" || src[k] === '`') { k = skipString(src, k); continue; }
              if (src[k] === '<') ad++;
              else if (src[k] === '>' && src[k - 1] !== '=') ad--;
              k++;
            }
            while (k < n && (src[k] === ' ' || src[k] === '\t')) k++;
          }
          if (src[k] === '(') {
            let pd = 1, m = k + 1;
            while (m < n && pd > 0) {
              if (src[m] === '"' || src[m] === "'" || src[m] === '`') { m = skipString(src, m); continue; }
              if (src[m] === '(') pd++;
              else if (src[m] === ')') pd--;
              m++;
            }
            if (pd === 0) {
              let p = m;
              while (p < n && (src[p] === ' ' || src[p] === '\t')) p++;
              if (src[p] === ':') {
                const tEnd = tryParseType(src, p + 1);
                if (tEnd > p + 1) p = tEnd;
              }
              while (p < n && (src[p] === ' ' || src[p] === '\t')) p++;
              if (src[p] === ';' || src[p] === '\n' || src[p] === '\r') {
                if (src[p] === ';') p++;
                out += nextId.name + '() {}' + newlinesOf(src.slice(wordStart, p));
                i = p;
                continue;
              }
            }
          }
        }
        continue;
      }

      if (/^(public|private|protected|readonly|override|namespace|implements)$/.test(word)) {
        continue;
      }

      if (word === 'function') {
        let j = i;
        while (j < n && (src[j] === ' ' || src[j] === '\t' || src[j] === '*')) j++;
        const fnId = readIdent(src, j);
        if (fnId) {
          let k = fnId.end;
          while (k < n && (src[k] === ' ' || src[k] === '\t')) k++;
          if (src[k] === '<') {
            let ad = 1; k++;
            while (k < n && ad > 0) {
              if (src[k] === '"' || src[k] === "'" || src[k] === '`') { k = skipString(src, k); continue; }
              if (src[k] === '<') ad++;
              else if (src[k] === '>' && src[k - 1] !== '=') ad--;
              k++;
            }
            while (k < n && (src[k] === ' ' || src[k] === '\t')) k++;
          }
          if (src[k] === '(') {
            let pd = 1, m = k + 1;
            while (m < n && pd > 0) {
              if (src[m] === '"' || src[m] === "'" || src[m] === '`') { m = skipString(src, m); continue; }
              if (src[m] === '(') pd++;
              else if (src[m] === ')') pd--;
              m++;
            }
            if (pd === 0) {
              let p = m;
              while (p < n && (src[p] === ' ' || src[p] === '\t')) p++;
              if (src[p] === ':') {
                const tEnd = tryParseType(src, p + 1);
                if (tEnd > p + 1) p = tEnd;
              }
              while (p < n && (src[p] === ' ' || src[p] === '\t')) p++;
              if (src[p] === ';') {
                p++;
                out += newlinesOf(src.slice(wordStart, p));
                i = p;
                continue;
              }
            }
          }
        }
      }

      if (word === 'constructor') {
        let j = i;
        while (j < n && isWS(src[j])) j++;
        if (src[j] === '(') {
          let pd = 1, m = j + 1;
          while (m < n && pd > 0) {
            if (src[m] === '"' || src[m] === "'" || src[m] === '`') { m = skipString(src, m); continue; }
            if (src[m] === '(') pd++;
            else if (src[m] === ')') pd--;
            m++;
          }
          if (pd === 0) {
            const props = extractConstructorParamProps(src.slice(j + 1, m - 1));
            if (props.length > 0) {
              pendingCtorProps = props;
            }
          }
        }
      }

      if (word === 'as' || word === 'satisfies') {
        const end = tryParseType(src, i);
        if (end > 0) {
          out += newlinesOf(src.slice(i, end));
          i = end;
        } else {
          i = id.end;
        }
        continue;
      }

      out += word;
      while (i < n && src[i] === '!' && src[i + 1] !== '=') i++;

      {
        let jg = i;
        while (jg < n && (src[jg] === ' ' || src[jg] === '\t')) jg++;
        if (src[jg] === '<') {
          let k = jg + 1;
          let depth = 1;
          let braceDepth = 0;
          while (k < n && depth > 0) {
            const ch = src[k];
            if ((ch === '\n' || ch === '\r' || ch === ';') && braceDepth === 0) break;
            if (ch === '"' || ch === "'" || ch === '`') {
              k = skipString(src, k);
              continue;
            }
            if (ch === '{') braceDepth++;
            else if (ch === '}') {
              if (braceDepth > 0) braceDepth--;
              else break;
            } else if (ch === '<') depth++;
            else if (ch === '>' && src[k - 1] !== '=') depth--;
            k++;
          }
          if (depth === 0) {
            let m = k;
            while (m < n && isWS(src[m])) m++;
            const after = src.slice(m, m + 11);
            if (src[m] === '(' || src[m] === '{' ||
                /^extends\b/.test(after) || /^implements\b/.test(after)) {
              out += src.slice(i, jg) + newlinesOf(src.slice(jg, k));
              i = k;
            }
          }
        }
      }

      let j = i;
      while (j < n && isWS(src[j])) j++;

      if (src[j] === '?' && src[j + 1] === ':') {
        const typeStart = j + 2;
        const typeEnd = tryParseType(src, typeStart);
        if (typeEnd > typeStart) {
          out += src.slice(i, j) + newlinesOf(src.slice(j, typeEnd));
          i = typeEnd;
          continue;
        }
      }

      if (src[j] === '?' && (src[j + 1] === ',' || src[j + 1] === ')') && parenDepth > 0 && !isTernaryColonNow()) {
        out += src.slice(i, j);
        i = j + 1;
        continue;
      }

      if (src[j] === ':' && !NON_TYPED_KEYWORDS.has(word)) {
        if (isTernaryColonNow()) {
          ternaryStack.pop();
          out += src.slice(i, j + 1);
          i = j + 1;
          continue;
        }

        const typeStart = j + 1;
        const typeEnd = tryParseType(src, typeStart);
        if (typeEnd > typeStart) {
          const typeText = src.slice(typeStart, typeEnd);
          const inObject = braceStack.length > 0 && braceStack[braceStack.length - 1] === 'object';
          if (!inObject && looksLikeTypeText(typeText)) {
            out += src.slice(i, j) + newlinesOf(src.slice(j, typeEnd));
            i = typeEnd;
            continue;
          }
        }
      }
      continue;
    }

    if (c === '?') {
      const next = src[i + 1];
      if (next === '.' || next === '?') {
        out += src.slice(i, i + 2);
        i += 2;
        if (next === '?' && src[i] === '=') { out += '='; i++; }
        continue;
      }
      ternaryStack.push({ paren: parenDepth, brace: braceStack.length });
      out += c;
      i++;
      continue;
    }

    if (c === ':') {
      if (isTernaryColonNow()) {
        ternaryStack.pop();
        out += c;
        i++;
        continue;
      }
      const k = lookBackSignificant(i);
      if (k >= 0 && (src[k] === ')' || src[k] === ']' || src[k] === '}')) {
        const inObject = braceStack.length > 0 && braceStack[braceStack.length - 1] === 'object';
        const typeStart = i + 1;
        const typeEnd = tryParseType(src, typeStart);
        if (typeEnd > typeStart && looksLikeTypeText(src.slice(typeStart, typeEnd))) {
          if (src[k] === ')') {
            out += newlinesOf(src.slice(i, typeEnd));
            i = typeEnd;
            continue;
          }
          if (!inObject) {
            let afterIdx = typeEnd;
            while (afterIdx < n && (src[afterIdx] === ' ' || src[afterIdx] === '\t')) afterIdx++;
            const afterCh = src[afterIdx] || '';
            const afterWord = readIdent(src, afterIdx)?.name || '';
            if (afterCh === '=' || afterCh === ',' || afterCh === ')' || afterWord === 'of' || afterWord === 'in') {
              out += newlinesOf(src.slice(i, typeEnd));
              i = typeEnd;
              continue;
            }
          }
        }
      }
      out += c;
      i++;
      continue;
    }

    if (c === '{') {
      const k = lookBackSignificant(i);
      const kind = classifyOpenBraceKind(src, k, braceStack);
      braceStack.push(kind);
      if (pendingCtorProps && parenDepth === 0 && kind === 'block') {
        const assigns = pendingCtorProps.map(p => ` this.${p} = ${p};`).join('');
        pendingCtorProps = null;
        let bd = 1, m = i + 1;
        while (m < n && bd > 0) {
          if (src[m] === '"' || src[m] === "'" || src[m] === '`') { m = skipString(src, m); continue; }
          if (src[m] === '{') bd++;
          else if (src[m] === '}') bd--;
          m++;
        }
        const ctorBodySlice = stripCommentsOnly(src.slice(i + 1, m - 1));
        if (/\bsuper\s*\(/.test(ctorBodySlice)) {
          pendingAfterSuperAssigns = assigns;
          out += c;
        } else {
          out += '{' + assigns;
        }
      } else {
        out += c;
      }
      i++;
      continue;
    }
    if (c === '}') {
      popTernariesAtOrAbove(parenDepth, braceStack.length);
      braceStack.pop();
      out += c;
      i++;
      continue;
    }
    if (c === ';' || c === ',') {
      popTernariesAtOrAbove(parenDepth, braceStack.length);
      out += c;
      i++;
      continue;
    }

    out += c;
    i++;
  }
  if (typeof rawSrc === 'string') {
    _STRIP_TYPES_CACHE = { src: rawSrc, out };
  }
  return out;
}

export const transpileTS = stripTypes;

export function detectUnsupportedSyntax(src: string): Array<{ line: number; feature: string; hint: string }> {
  if (typeof src !== 'string' || !src.trim()) return [];
  const results: Array<{ line: number; feature: string; hint: string }> = [];
  const cleaned = stripCommentsOnly(src);
  const lines = cleaned.split('\n');
  for (let idx = 0; idx < lines.length; idx++) {
    const line = (lines[idx] ?? '').trim();
    if (!line) continue;
    const lineNo = idx + 1;
    if (/^with\s*\(/.test(line)) {
      results.push({
        line: lineNo,
        feature: 'with 语句',
        hint: '严格模式下不支持 `with (...)` 语句，请直接访问对象属性或使用解构赋值。',
      });
    }
    if (/^import\s+[A-Za-z_$][\w$]*\s*=\s*require\s*\(/.test(line)) {
      results.push({
        line: lineNo,
        feature: 'import = require()',
        hint: '浏览器沙箱不支持 CommonJS `import x = require(...)`，请直接定义所需模块或使用标准 ES 语法。',
      });
    }
  }
  return results;
}

export const findSyntaxErrors = detectUnsupportedSyntax;
