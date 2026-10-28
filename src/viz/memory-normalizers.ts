/* ================================================================
   Memory Snapshot Normalizers, Classifiers & Step Animation Inference (src/viz/memory-normalizers.ts)
   ================================================================ */
import { RESERVED_WORDS, skipString, splitTopLevel, splitTopLevelSemicolons } from "../compiler/comments";
import { stripTypes } from "../compiler/transpile";
import { inferRuntimeTsType, matchInterfaceForObject } from "../compiler/tc-types";
import { appState } from "../state";
import { Frame, InterfaceFieldMeta, StepAnim, StepSnapshot } from "../types";
import {
  isMapLike,
  isSetLike,
  isRecord,
  isFrame,
  defineHidden,
  formatShortVal,
  cloneDeepBounded,
} from "../utils/format";

export { isMapLike, isSetLike, isRecord, isFrame, defineHidden, formatShortVal, cloneDeepBounded };

const asChildFrame = (v: unknown): Frame | null => (isFrame(v) ? v : null);

interface ForEachCollection {
  forEach(cb: (v: unknown, k: unknown) => void): void;
}

function hasForEachMethod(val: unknown): val is ForEachCollection {
  return isRecord(val) && typeof val.forEach === 'function';
}

export function normalizeTree(value: Frame | null | undefined): StepAnim {
  if (value && Array.isArray(value.nodes)) {
    return {
      kind: 'tree',
      total: value.total || value.nodes.length,
      nodes: value.nodes.slice(0, 31).map((n: Frame) => ({
        val: n.val !== undefined ? n.val : n.id,
        left: n.left ?? null,
        right: n.right ?? null,
      })),
      root: value.root ?? 0,
    };
  }
  const nodes: Array<{ val: unknown; left: number | null; right: number | null }> = [];
  const seen = new Set();
  const nodeMap = new Map();
  function walk(node: Frame | null | undefined): number | null {
    if (!node || typeof node !== 'object' || seen.has(node)) return null;
    seen.add(node);
    if (nodes.length >= 31) {
      if (seen.size < 2000) {
        walk(asChildFrame(node.left));
        walk(asChildFrame(node.right));
      }
      return null;
    }
    const idx = nodes.length;
    nodeMap.set(node, idx);
    const item: { val: unknown; left: number | null; right: number | null } = {
      val: node.val !== undefined ? node.val : node.value,
      left: null,
      right: null,
    };
    nodes.push(item);
    item.left = walk(asChildFrame(node.left));
    item.right = walk(asChildFrame(node.right));
    return idx;
  }
  const root = walk(value);
  const out: StepAnim = { kind: 'tree', nodes, root: root ?? 0, total: seen.size };
  defineHidden(out, '__nodeMap', nodeMap);
  return out;
}

export function normalizeList(value: Frame | unknown[] | null | undefined) {
  if (Array.isArray(value)) {
    const total = value.length;
    const out = { kind: 'list', items: value.slice(0, 30).map((x: unknown) => cloneDeepBounded(x, 1)), total };
    if (total > 20) {
      defineHidden(out, '__raw', value);
    }
    return out;
  }
  const items: unknown[] = [];
  const rawNodes: object[] = [];
  const rawVals: unknown[] = [];
  const seen = new Set();
  let curNode: Frame | null | undefined = value;
  while (curNode && typeof curNode === 'object' && !seen.has(curNode) && rawNodes.length < 5000) {
    seen.add(curNode);
    const v = curNode.val !== undefined ? curNode.val : curNode.value;
    rawNodes.push(curNode);
    rawVals.push(v);
    if (items.length < 30) items.push(cloneDeepBounded(v, 1));
    curNode = curNode.next;
  }
  const out = { kind: 'list', items, total: rawNodes.length };
  if (rawNodes.length > 0) {
    defineHidden(out, '__rawNodes', rawNodes);
    defineHidden(out, '__rawVals', rawVals);
  }
  return out;
}

export function normalizeGraph(value: Frame | null | undefined): StepAnim {
  if (value && Array.isArray(value.nodes) && Array.isArray(value.edges)) {
    const rawNodes = value.nodes.slice(0, 16);
    const count = rawNodes.length || 1;
    const nodes = rawNodes.map((n: Frame, idx: number) => {
      const angle = (2 * Math.PI * idx) / count - Math.PI / 2;
      const id = n && typeof n === 'object' ? (n.id ?? idx) : n;
      const label = n && typeof n === 'object' ? (n.label ?? n.val ?? id) : String(n);
      const x = n && typeof n.x === 'number' ? n.x : Math.round(90 + 62 * Math.cos(angle));
      const y = n && typeof n.y === 'number' ? n.y : Math.round(68 + 48 * Math.sin(angle));
      return { id, label: String(label), x, y };
    });
    const edges: Array<[number | string, number | string]> = value.edges.slice(0, 32).map((e: [number | string, number | string] | Frame): [number | string, number | string] =>
      Array.isArray(e) ? [e[0], e[1]] : [e.from ?? 0, e.to ?? 0]
    );
    return { kind: 'graph', nodes, edges, totalNodes: value.nodes.length, totalEdges: value.edges.length };
  }
  return { kind: 'graph', nodes: [], edges: [] };
}

export function snapshot(kind: string, value: unknown, extra?: Record<string, unknown>): StepAnim {
  const recVal = isFrame(value) ? value : null;
  if (kind === 'stack') {
    const arr = Array.isArray(value) ? value : [];
    const total = arr.length;
    let items: unknown[];
    let baseIdx = 0;
    if (arr.length > 40) {
      baseIdx = arr.length - 40;
      items = arr.slice(baseIdx).map(x => cloneDeepBounded(x, 1));
    } else {
      items = arr.slice(0, 40).map(x => cloneDeepBounded(x, 1));
    }
    return Object.assign({ kind, items, total, baseIdx }, extra || {});
  }
  if (kind === 'array' || kind === 'heap' || kind === 'queue' || kind === 'uf') {
    const arr = Array.isArray(value) ? value : [];
    const total = arr.length;
    const items = arr.slice(0, 40).map(x => cloneDeepBounded(x, 1));
    const out = Object.assign({ kind, items, total }, extra || {});
    if (total > 20) {
      defineHidden(out, '__raw', arr);
    }
    return out;
  }
  if (kind === 'list') {
    return Object.assign(normalizeList(Array.isArray(value) ? value : recVal), extra || {});
  }
  if (kind === 'tree') {
    return Object.assign(normalizeTree(recVal), extra || {});
  }
  if (kind === 'graph') {
    return Object.assign(normalizeGraph(recVal), extra || {});
  }
  if (kind === 'string') {
    const s = String(value);
    const total = s.length;
    const items = s.slice(0, 40).split('');
    const out = Object.assign({ kind, items, total }, extra || {});
    if (total > 20) {
      defineHidden(out, '__raw', s);
    }
    return out;
  }
  if (kind === 'map') {
    const entries: Array<{ k: unknown; v: unknown }> = [];
    let total = 0;
    if (isMapLike(value)) {
      total = value.size;
      for (const [k, v] of value) {
        if (entries.length >= 40) break;
        entries.push({ k: cloneDeepBounded(k, 1), v: cloneDeepBounded(v, 1) });
      }
    } else if (hasForEachMethod(recVal)) {
      recVal.forEach((v: unknown, k: unknown) => {
        total++;
        if (entries.length < 40) entries.push({ k: cloneDeepBounded(k, 1), v: cloneDeepBounded(v, 1) });
      });
    } else if (recVal) {
      const keys = Object.keys(recVal);
      total = keys.length;
      keys.slice(0, 40).forEach(k => entries.push({ k, v: cloneDeepBounded(recVal[k], 1) }));
    }
    const out = Object.assign({ kind, entries, total }, extra || {});
    if (total > 20) defineHidden(out, '__raw', value);
    return out;
  }
  if (kind === 'set') {
    const items: unknown[] = [];
    let total = 0;
    if (isSetLike(value)) {
      total = value.size;
      for (const v of value) {
        if (items.length >= 40) break;
        items.push(cloneDeepBounded(v, 1));
      }
    } else if (hasForEachMethod(recVal)) {
      recVal.forEach((v: unknown) => {
        total++;
        if (items.length < 40) items.push(cloneDeepBounded(v, 1));
      });
    }
    const out = Object.assign({ kind, items, total }, extra || {});
    if (total > 20) defineHidden(out, '__raw', value);
    return out;
  }
  if (kind === 'grid') {
    const totalRows = Array.isArray(value) ? value.length : 0;
    const totalCols = Array.isArray(value) && Array.isArray(value[0]) ? value[0].length : 0;
    const cloned = Array.isArray(value)
      ? value.slice(0, 30).map(r => Array.isArray(r) ? r.slice(0, 30).map(c => cloneDeepBounded(c, 2)) : r)
      : [[0]];
    const out = Object.assign({ kind, cells: cloned, mark: null, deps: [], totalRows, totalCols }, extra || {});
    if (totalRows > 10 || totalCols > 10) {
      defineHidden(out, '__raw', value);
    }
    return out;
  }
  if (kind === 'interface' || kind === 'object') {
    return Object.assign({ kind: 'interface', fields: [], entries: [] }, extra || {});
  }
  return { kind: 'array', items: [] };
}

export function classifyValue(name: string, value: unknown) {
  if (value == null) return null;
  const n = String(name);
  if (Array.isArray(value)) {
    if (value.length > 0 && Array.isArray(value[0])) return snapshot('grid', value);
    if (/^(parent|uf|fa|dsu)\b/i.test(n)) return snapshot('uf', value);
    if (/stack|stk/i.test(n)) return snapshot('stack', value);
    if (/queue|deque/i.test(n)) return snapshot('queue', value);
    if (/heap|pq/i.test(n)) return snapshot('heap', value);
    if (/^list$/i.test(n)) return snapshot('list', value);
    return snapshot('array', value);
  }
  if (isMapLike(value)) return snapshot('map', value);
  if (isSetLike(value)) return snapshot('set', value);
  if (typeof value === 'string') {
    if (value.length > 0) return snapshot('string', value);
    return null;
  }
  if (isFrame(value)) {
    const obj = value;
    if (obj.__isVirtualPromise) return null;
    if (Array.isArray(obj.nodes) && Array.isArray(obj.edges)) return snapshot('graph', obj);
    if (Array.isArray(obj.nodes) && 'root' in obj) return snapshot('tree', obj);
    if (n !== 'this') {
      if (('val' in obj || 'value' in obj) && ('left' in obj || 'right' in obj)) return snapshot('tree', obj);
      if (('val' in obj || 'value' in obj) && 'next' in obj) return snapshot('list', obj);
    }

    const ifaceDef = matchInterfaceForObject(n, obj);
    const annotType = appState.CURRENT_TS_META.varTypes.get(n);
    const runtimeCls =
      typeof obj.__cls__ === 'string' && obj.__cls__
        ? obj.__cls__
        : obj.constructor && obj.constructor !== Object && obj.constructor.name
        ? obj.constructor.name
        : '';
    const ifaceName = ifaceDef ? ifaceDef.name : (annotType || runtimeCls || 'object');
    const isClass = Boolean((ifaceDef && ifaceDef.isClass) || runtimeCls);
    const fieldMap = new Map<string, { k: string; v: unknown; declaredType: string | undefined; optional: boolean }>();
    if (ifaceDef) {
      ifaceDef.fields.forEach((f: InterfaceFieldMeta) => {
        const fk = f.k || f.name || '';
        fieldMap.set(fk, {
          k: fk,
          v: (fk in obj) ? cloneDeepBounded(obj[fk], 1) : undefined,
          declaredType: f.declaredType,
          optional: Boolean(f.optional),
        });
      });
    }
    Object.keys(obj).slice(0, 20).forEach(k => {
      if (!fieldMap.has(k)) {
        fieldMap.set(k, {
          k,
          v: cloneDeepBounded(obj[k], 1),
          declaredType: inferRuntimeTsType(obj[k]),
          optional: false,
        });
      }
    });
    const fields = [...fieldMap.values()];
    if (fields.length > 0 || isClass) {
      return snapshot('interface', obj, {
        interfaceName: ifaceName,
        isClass,
        isSchema: false,
        fields,
        entries: fields.map(f => ({ k: f.k, v: f.v })),
      });
    }
  }
  return null;
}

export function populateInterfaceSchemas(ds: Record<string, StepAnim>) {
  const { interfaces, varTypes } = appState.CURRENT_TS_META;
  if (!interfaces || !interfaces.size) return;
  interfaces.forEach(iface => {
    if (iface.isClass && (!iface.fields || !iface.fields.length)) return;
    const prefix = iface.isClass ? 'class ' : 'interface ';
    const slotKey = (iface.name in ds) ? (prefix + iface.name) : iface.name;
    let boundInstance: StepAnim | null = null;
    let boundVarName: string | null = null;
    Object.keys(ds).forEach(k => {
      const item = ds[k];
      if (!boundInstance && item && item.kind === 'interface' && !item.isSchema && item.interfaceName === iface.name) {
        boundInstance = item;
        boundVarName = k;
      }
    });
    if (!boundVarName && varTypes) {
      Object.keys(ds).forEach(k => {
        if (!boundVarName && varTypes.get(k) === iface.name) {
          boundVarName = k;
        }
      });
    }
    const fields = iface.fields.map((f: InterfaceFieldMeta) => {
      const key = f.k || f.name || '';
      const instField = boundInstance && boundInstance.fields ? boundInstance.fields.find(x => x.k === key) : null;
      return {
        k: key,
        declaredType: f.declaredType,
        optional: Boolean(f.optional),
        v: instField ? instField.v : undefined,
      };
    });
    ds[slotKey] = {
      kind: 'interface',
      interfaceName: iface.name,
      isClass: Boolean(iface.isClass),
      isSchema: true,
      instanceName: boundVarName,
      fields,
      entries: fields.map((f: { k: string; v?: unknown; declaredType?: string }) => ({ k: f.k, v: f.v !== undefined ? f.v : f.declaredType })),
    };
  });
}

export function detectWindowRange(v: StepAnim | null | undefined): [number, number] | null {
  if (!v) return null;
  const pairs: Array<[string, string]> = [['l', 'r'], ['left', 'right'], ['lo', 'hi'], ['start', 'end']];
  for (const [lk, rk] of pairs) {
    const lv = v[lk];
    const rv = v[rk];
    if (typeof lv === 'number' && typeof rv === 'number' && lv >= 0 && rv >= lv) {
      return [lv, rv];
    }
  }
  return null;
}

export const POINTER_VAR_NAMES = [
  'mid', 'm', 'i', 'j', 'k', 'idx', 'p', 'q', 'cur', 'curr', 'slow', 'fast', 'pivot',
  'l', 'r', 'left', 'right', 'lo', 'hi', 'low', 'high', 'start', 'end',
];

export function build1DFocalSlice(total: number, getAt: (idx: number) => unknown, focalCenters?: number[] | null) {
  if (total <= 20) return null;
  const centers: number[] = [];
  const seenC = new Set();
  (focalCenters || []).forEach((c: number) => {
    if (typeof c === 'number' && Number.isInteger(c) && c >= 0 && c < total && !seenC.has(c)) {
      seenC.add(c);
      centers.push(c);
    }
  });
  const activeCenters = centers.slice(0, 4);
  const radius = activeCenters.length <= 1 ? 3 : (activeCenters.length === 2 ? 2 : 1);
  const intervals: Array<[number, number]> = [
    [0, Math.min(total - 1, 2)],
    [Math.max(0, total - 3), total - 1],
  ];
  activeCenters.forEach(c => {
    intervals.push([Math.max(0, c - radius), Math.min(total - 1, c + radius)]);
  });
  intervals.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const iv of intervals) {
    const prev = merged[merged.length - 1];
    if (!prev) {
      merged.push([iv[0], iv[1]]);
    } else if (iv[0] <= prev[1] + 2) {
      prev[1] = Math.max(prev[1], iv[1]);
    } else {
      merged.push([iv[0], iv[1]]);
    }
  }
  const out: Array<
    | { gap: true; count: number; from: number; to: number }
    | { gap?: false; idx: number; val: unknown }
  > = [];
  for (let s = 0; s < merged.length; s++) {
    const curIv = merged[s];
    if (!curIv) continue;
    const [start, end] = curIv;
    const prevIv = s > 0 ? merged[s - 1] : undefined;
    if (prevIv) {
      const prevEnd = prevIv[1];
      const gapCount = start - prevEnd - 1;
      if (gapCount > 0) {
        out.push({ gap: true, count: gapCount, from: prevEnd + 1, to: start - 1 });
      }
    }
    for (let idx = start; idx <= end; idx++) {
      out.push({ idx, val: getAt(idx) });
    }
  }
  return out;
}

export function selectGridAxisIndices(total: number, focusIdx?: number, maxCount = 8) {
  if (total <= maxCount) {
    return Array.from({ length: total }, (_, i) => i);
  }
  const set = new Set([0, total - 1]);
  const center = (typeof focusIdx === 'number' && Number.isInteger(focusIdx) && focusIdx >= 0 && focusIdx < total)
    ? focusIdx
    : 1;
  const innerQuota = Math.max(2, maxCount - 2);
  let start = Math.max(1, center - Math.floor(innerQuota / 2));
  let end = Math.min(total - 2, start + innerQuota - 1);
  start = Math.max(1, end - innerQuota + 1);
  for (let i = start; i <= end; i++) set.add(i);
  return [...set].sort((a, b) => a - b);
}

function enrichFromNoteTextAccess(
  ds: Record<string, StepAnim>,
  safeV: StepAnim,
  text: string,
  evalIdx: (expr: string | undefined) => number | undefined
) {
  const propRe = /\b([A-Za-z_$][\w$]*)\s*\.\s*([A-Za-z_$][\w$]*)\b/g;
  let pm;
  while ((pm = propRe.exec(text))) {
    const objName = pm[1] || '', propName = pm[2];
    const objItem = ds[objName];
    if (objItem && (objItem.kind === 'interface' || objItem.kind === 'object')) {
      objItem.hot = propName;
      const ifaceName = objItem.interfaceName;
      const ifaceItem = ifaceName ? ds[ifaceName] : undefined;
      if (ifaceItem && ifaceItem.kind === 'interface') {
        ifaceItem.hot = propName;
      }
    }
  }

  const g = text.match(/\b([A-Za-z_$][\w$]*)\s*\[\s*([^[\]]+?)\s*\]\s*\[\s*([^[\]]+?)\s*\]/);
  const gItem = g && g[1] ? ds[g[1]] : undefined;
  if (g && g[1] && gItem && gItem.kind === 'grid') {
    const row = evalIdx(g[2]);
    const col = evalIdx(g[3]);
    if (typeof row === 'number' && typeof col === 'number') {
      gItem.mark = [row, col];
    }
    const deps: Array<[number, number]> = [];
    const re = /\b[A-Za-z_$][\w$]*\s*\[\s*([^[\]]+?)\s*\]\s*\[\s*([^[\]]+?)\s*\]/g;
    let m;
    while ((m = re.exec(text))) {
      const r = evalIdx(m[1]);
      const c = evalIdx(m[2]);
      if (typeof r === 'number' && typeof c === 'number') {
        const curMark = gItem.mark;
        if (!(Array.isArray(curMark) && curMark[0] === r && curMark[1] === c)) {
          deps.push([r, c]);
        }
      }
    }
    gItem.deps = deps;
  }

  const subRe = /\b([A-Za-z_$][\w$]*)\s*\[\s*([^[\]]+?)\s*\](?!\s*\[)/g;
  let sm;
  while ((sm = subRe.exec(text))) {
    const varName = sm[1] || '';
    const d = ds[varName];
    if (!d || d.kind === 'grid') continue;
    let idx = evalIdx(sm[2]);
    if (typeof idx === 'number') {
      const total = typeof d.total === 'number' ? d.total : (d.items ? d.items.length : 0);
      if (idx < 0 && total > 0) idx = total + idx;
      if (d.hot === undefined) {
        d.hot = idx;
      } else {
        if (!d.__extraFocal) defineHidden(d, '__extraFocal', []);
        if (d.__extraFocal) d.__extraFocal.push(idx);
      }
    }
  }

  const p = text.match(/\b([A-Za-z_$][\w$]*)\s*\.\s*(push|set|add|pop|shift|unshift|get|has)\s*\(\s*([^,)]*)/);
  const pItem = p && p[1] ? ds[p[1]] : undefined;
  if (p && p[1] && pItem) {
    const d = pItem;
    const method = p[2];
    const firstArg = p[3] ? p[3].trim() : '';
    if (method === 'get' || method === 'has' || method === 'set' || method === 'add') {
      const argVal = firstArg ? safeEvalExpr(firstArg, safeV) : undefined;
      if (d.kind === 'map' && argVal !== undefined) {
        d.hot = argVal;
      } else if (d.kind === 'set' && argVal !== undefined) {
        d.hot = argVal;
      }
    }
    if (method === 'push' || method === 'add' || method === 'set' || method === 'unshift') {
      if (d.kind === 'stack' || d.kind === 'array' || d.kind === 'queue' || d.kind === 'heap') {
        const total = typeof d.total === 'number' ? d.total : (d.items ? d.items.length : 0);
        if (total > 0) d.hot = method === 'unshift' ? 0 : total - 1;
      } else if (d.kind === 'map' && d.hot === undefined) {
        if (d.entries && d.entries.length) {
          const lastEntry = d.entries[d.entries.length - 1];
          if (lastEntry) d.hot = lastEntry.k;
        }
      } else if (d.kind === 'set' && d.hot === undefined) {
        if (d.items && d.items.length) d.hot = d.items[d.items.length - 1];
      }
    }
  }
}

export function enrichFromNote(ds: Record<string, StepAnim> | null | undefined, v: StepAnim | null | undefined, note?: string | null) {
  if (!ds || typeof ds !== 'object') return;
  const safeV: StepAnim = v || {};
  const text = String(note || '');

  const evalIdx = (expr: string | undefined): number | undefined => {
    const t = String(expr || '').trim();
    if (!t) return undefined;
    if (/^\d+$/.test(t)) return +t;
    const directVal = safeV[t];
    if (t in safeV && typeof directVal === 'number' && Number.isInteger(directVal)) return directVal;
    const m = t.match(/^([A-Za-z_$][\w$]*)\s*([+-])\s*(\d+)$/);
    if (m && m[1] && m[3] !== undefined) {
      const baseVal = safeV[m[1]];
      if (typeof baseVal === 'number' && Number.isInteger(baseVal)) {
        return m[2] === '+' ? baseVal + (+m[3]) : baseVal - (+m[3]);
      }
    }
    const evaluated = safeEvalExpr(t, safeV);
    return (typeof evaluated === 'number' && Number.isInteger(evaluated)) ? evaluated : undefined;
  };

  const win = detectWindowRange(safeV);
  if (win) {
    Object.keys(ds).forEach(k => {
      const item = ds[k];
      if (item && (item.kind === 'array' || item.kind === 'string')) {
        item.win = win;
      }
    });
  }

  if (text) {
    enrichFromNoteTextAccess(ds, safeV, text, evalIdx);
  }

  Object.keys(ds).forEach(varName => {
    const d = ds[varName];
    if (!d || typeof d !== 'object') return;

    if (d.kind === 'tree' && d.__nodeMap) {
      for (const pName of POINTER_VAR_NAMES) {
        const ref = safeV[pName];
        if (ref && typeof ref === 'object' && d.__nodeMap.has(ref)) {
          const nodeIdx = d.__nodeMap.get(ref);
          if (d.hot === undefined) d.hot = nodeIdx;
          break;
        }
      }
    }

    if (d.kind === 'list' && d.__rawNodes) {
      const nodePtrs: Record<number, string[]> = {};
      const focal: number[] = [];
      for (const pName of POINTER_VAR_NAMES) {
        const ref = safeV[pName];
        if (ref && typeof ref === 'object') {
          const idx = d.__rawNodes.indexOf(ref);
          if (idx >= 0) {
            const ptrArr = nodePtrs[idx] || (nodePtrs[idx] = []);
            if (!ptrArr.includes(pName)) ptrArr.push(pName);
            if (d.hot === undefined) d.hot = idx;
            focal.push(idx);
          }
        }
      }
      if (Object.keys(nodePtrs).length) d.pointers = nodePtrs;
      const rawVals = d.__rawVals || [];
      const total = d.total || rawVals.length;
      if (total > 20) {
        if (typeof d.hot === 'number') focal.unshift(d.hot);
        d.windowed = build1DFocalSlice(total, (idx: number) => cloneDeepBounded(rawVals[idx], 1), focal);
      }
    }

    if (
      d.kind === 'array' || d.kind === 'queue' || d.kind === 'heap' ||
      d.kind === 'uf' || d.kind === 'string' || (d.kind === 'list' && !d.__rawNodes)
    ) {
      const total = typeof d.total === 'number' ? d.total : (d.items ? d.items.length : 0);
      if (total > 0) {
        const ptrs = d.pointers || {};
        const focal: number[] = [];
        if (typeof d.hot === 'number' && d.hot >= 0 && d.hot < total) focal.push(d.hot);
        if (Array.isArray(d.__extraFocal)) {
          d.__extraFocal.forEach((idx: number) => {
            if (typeof idx === 'number' && idx >= 0 && idx < total) focal.push(idx);
          });
        }
        if (typeof d.mark === 'number' && d.mark >= 0 && d.mark < total) focal.push(d.mark);
        if (Array.isArray(d.win)) {
          if (d.win[0] >= 0 && d.win[0] < total) focal.push(d.win[0]);
          if (d.win[1] >= 0 && d.win[1] < total) focal.push(d.win[1]);
        }
        for (const pName of POINTER_VAR_NAMES) {
          const val = safeV[pName];
          if (typeof val === 'number' && Number.isInteger(val) && val >= 0 && val < total) {
            const pArr = ptrs[val] || (ptrs[val] = []);
            if (!pArr.includes(pName)) pArr.push(pName);
            focal.push(val);
          }
        }
        if (Object.keys(ptrs).length) d.pointers = ptrs;
        if (d.hot === undefined && d.mark === undefined) {
          if (typeof safeV.mid === 'number' && Number.isInteger(safeV.mid) && safeV.mid >= 0 && safeV.mid < total) {
            d.mark = safeV.mid;
          } else if (typeof safeV.m === 'number' && Number.isInteger(safeV.m) && safeV.m >= 0 && safeV.m < total) {
            d.mark = safeV.m;
          }
        }
        if (total > 20) {
          const raw = d.__raw;
          const getAt = (idx: number) => {
            if (typeof raw === 'string') return raw[idx] ?? '';
            if (Array.isArray(raw) && idx < raw.length) return cloneDeepBounded(raw[idx], 1);
            if (d.items && idx < d.items.length) return d.items[idx];
            return '…';
          };
          d.windowed = build1DFocalSlice(total, getAt, focal);
        }
      }
    }

    if (d.kind === 'map' && d.hot !== undefined && isMapLike(d.__raw)) {
      const rawMap = d.__raw;
      const entries = d.entries || (d.entries = []);
      const exists = entries.some((e: { k: unknown }) => e.k === d.hot);
      if (!exists && rawMap.has(d.hot)) {
        entries.push({ k: cloneDeepBounded(d.hot, 1), v: cloneDeepBounded(rawMap.get(d.hot), 1) });
      }
    }
    if (d.kind === 'set' && d.hot !== undefined && isSetLike(d.__raw)) {
      const rawSet = d.__raw;
      const items = d.items || (d.items = []);
      const exists = items.some((x: unknown) => x === d.hot);
      if (!exists && rawSet.has(d.hot)) {
        items.push(cloneDeepBounded(d.hot, 1));
      }
    }

    if (d.kind === 'grid') {
      const totalRows = typeof d.totalRows === 'number' ? d.totalRows : (d.cells ? d.cells.length : 0);
      const totalCols = typeof d.totalCols === 'number' ? d.totalCols : (d.cells && d.cells[0] ? d.cells[0].length : 0);
      if (totalRows > 10 || totalCols > 10) {
        let focusR = Array.isArray(d.mark) ? d.mark[0] : (d.deps && d.deps[0] ? d.deps[0][0] : undefined);
        let focusC = Array.isArray(d.mark) ? d.mark[1] : (d.deps && d.deps[0] ? d.deps[0][1] : undefined);
        if (focusR === undefined || focusC === undefined) {
          const coordPairs: Array<[string, string]> = [['i', 'j'], ['r', 'c'], ['row', 'col'], ['x', 'y']];
          for (const [rk, ck] of coordPairs) {
            const rv = safeV[rk];
            const cv = safeV[ck];
            if (typeof rv === 'number' && typeof cv === 'number') {
              focusR = rv;
              focusC = cv;
              break;
            }
          }
        }
        const rowIndices = selectGridAxisIndices(totalRows, focusR, 8);
        const colIndices = selectGridAxisIndices(totalCols, focusC, 8);
        const rawGrid = Array.isArray(d.__raw) ? d.__raw : d.cells;
        d.rowIndices = rowIndices;
        d.colIndices = colIndices;
        d.viewCells = rowIndices.map(r => {
          const rowCandidate = rawGrid ? rawGrid[r] : undefined;
          const rowArr: unknown[] = Array.isArray(rowCandidate) ? rowCandidate : [];
          return colIndices.map(c => cloneDeepBounded(rowArr[c], 2));
        });
      }
    }

    delete d.__raw;
    delete d.__rawNodes;
    delete d.__rawVals;
    delete d.__nodeMap;
    delete d.__extraFocal;
  });
}


export function safeEvalExpr(expr: string | null | undefined, v: StepAnim | null | undefined) {
  if (!expr || !v) return undefined;
  const clean = stripTypes(expr).trim();
  if (!clean) return undefined;
  if (/\.\s*(push|pop|shift|unshift|splice|set|add|delete|clear|fill|sort|reverse)\s*\(/.test(clean)) {
    return undefined;
  }
  if (/(?:\+\+|--|(?<![=!<>])=(?!=))/.test(clean)) return undefined;
  try {
    const keys = Object.keys(v).filter(k => /^[A-Za-z_$][\w$]*$/.test(k) && !RESERVED_WORDS.has(k));
    const vals = keys.map(k => v[k]);
    const fn = new Function(...keys, 'return (' + clean + ');');
    const thisCtx = (v && Object.prototype.hasOwnProperty.call(v, 'this')) ? v.this : undefined;
    return fn.call(thisCtx, ...vals);
  } catch {
    return undefined;
  }
}

export function splitLogicalClauses(condExpr: string) {
  const clauses: Array<{ expr: string; opAfter: string | null }> = [];
  let depth = 0, start = 0;
  for (let i = 0; i < condExpr.length; i++) {
    const ch = condExpr[i];
    if (ch === '"' || ch === "'" || ch === '`') { i = skipString(condExpr, i) - 1; continue; }
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') depth--;
    else if (depth === 0 && ((ch === '&' && condExpr[i + 1] === '&') || (ch === '|' && condExpr[i + 1] === '|'))) {
      clauses.push({ expr: condExpr.slice(start, i).trim(), opAfter: ch + ch });
      i++;
      start = i + 1;
    }
  }
  clauses.push({ expr: condExpr.slice(start).trim(), opAfter: null });
  return clauses.filter(c => c.expr);
}

export function deriveAnimAndNote(
  rawLine: string,
  v?: StepAnim | null,
  nextV?: StepAnim | null
): { anim: StepAnim | null; note: string; isCheckpoint?: boolean } {
  const clean = stripTypes(rawLine || '').trim().replace(/;$/, '');
  if (!clean) return { anim: null, note: rawLine };

  let condExpr: string | null = null;
  const condMatch = clean.match(/^(?:}\s*)?(?:if|while|else\s+if)\s*\(([\s\S]+)\)\s*\{?$/);
  if (condMatch && condMatch[1]) {
    condExpr = condMatch[1].trim();
  } else {
    const forMatch = clean.match(/^for\s*\(([\s\S]+)\)\s*\{?$/);
    if (forMatch && forMatch[1] !== undefined) {
      const semiParts = splitTopLevelSemicolons(forMatch[1]);
      if (semiParts.length === 3 && semiParts[1]?.trim()) {
        condExpr = semiParts[1].trim();
      }
    }
  }

  if (condExpr !== null) {
    const clauses = splitLogicalClauses(condExpr);
    let activeClause = clauses[0] ? clauses[0].expr : condExpr;
    let overallResult = safeEvalExpr(condExpr, v);

    for (let i = 0; i < clauses.length; i++) {
      const c = clauses[i];
      if (!c) continue;
      activeClause = c.expr;
      const cVal = safeEvalExpr(c.expr, v);
      if (typeof cVal === 'boolean') {
        if (c.opAfter === '&&' && !cVal) { overallResult = false; break; }
        if (c.opAfter === '||' && cVal) { overallResult = true; break; }
        if (!c.opAfter) overallResult = cVal;
      }
    }

    const cmp = activeClause.match(/^(.+?)\s*(===|!==|<=|>=|==|!=|<|>)\s*(.+)$/);
    if (cmp && cmp[1] && cmp[2] && cmp[3]) {
      const lhs = cmp[1].trim(), op = cmp[2], rhs = cmp[3].trim();
      const lhsVal = safeEvalExpr(lhs, v);
      const rhsVal = safeEvalExpr(rhs, v);
      const resVal = typeof overallResult === 'boolean' ? overallResult : safeEvalExpr(activeClause, v);
      if (typeof resVal === 'boolean') {
        const anim = {
          type: 'compare',
          lhs, rhs, op,
          lhsVal: formatShortVal(lhsVal),
          rhsVal: formatShortVal(rhsVal),
          result: resVal,
        };
        const note = `${rawLine.trim()}  →  ${anim.lhsVal} ${op} ${anim.rhsVal} (${resVal})`;
        return { anim, note };
      }
    }
    if (typeof overallResult === 'boolean') {
      const anim = {
        type: 'compare',
        lhs: activeClause, rhs: '', op: '?',
        lhsVal: formatShortVal(overallResult), rhsVal: '',
        result: overallResult,
      };
      return { anim, note: `${rawLine.trim()}  →  ${overallResult}` };
    }
  }

  const ckptCall = clean.match(/^(?:checkpoint|断点)\s*\(([\s\S]*)\)$/);
  if (ckptCall && ckptCall[1] !== undefined) {
    const fnName = clean.startsWith('断点') ? '断点' : 'checkpoint';
    const args = splitTopLevel(ckptCall[1]).map(s => s.trim()).filter(Boolean);
    const hasRuntimeTrigger = Boolean(nextV && '__ckptTriggered' in nextV);
    const triggered = hasRuntimeTrigger && nextV
      ? Boolean(nextV.__ckptTriggered)
      : (args.length === 0 ? true : Boolean(safeEvalExpr(args[0] || '', v)));
    if (!triggered) {
      const condExpr = args[0] || 'false';
      const anim = {
        type: 'compare',
        lhs: condExpr,
        rhs: '',
        op: '?',
        lhsVal: 'false',
        rhsVal: '',
        result: false,
      };
      return { anim, note: `○ ${fnName}(${condExpr})  →  false（条件未满足，跳过检查点）`, isCheckpoint: false };
    }
    const ckptVals = nextV && Array.isArray(nextV.__ckptVals) ? nextV.__ckptVals.map(String) : null;
    let msgStr = '';
    if (ckptVals && ckptVals.length > 0 && ckptVals[0]) {
      msgStr = ckptVals[0];
    } else if (args.length >= 2 && args[1]) {
      const evaluatedMsg = safeEvalExpr(args[1], v);
      msgStr = evaluatedMsg !== undefined && evaluatedMsg !== null
        ? String(evaluatedMsg)
        : args[1].replace(/^['"`]|['"`]$/g, '');
    }
    const anim = {
      type: 'checkpoint',
      fn: fnName,
      args: msgStr ? [msgStr] : [],
      argVals: msgStr ? [msgStr] : [],
    };
    const detail = msgStr ? msgStr : '已命中断点';
    return { anim, note: `◉ ${fnName}(${detail})`, isCheckpoint: true };
  }

  const callOnly = clean.match(/^([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*\((.*)\)$/);
  if (callOnly && callOnly[1] && callOnly[2] !== undefined) {
    const fnName = callOnly[1];
    const args = splitTopLevel(callOnly[2]).map(s => s.trim()).filter(Boolean);
    const argVals = args.map(a => formatShortVal(safeEvalExpr(a, v)));
    const anim = { type: 'call', fn: fnName, args, argVals, result: null, to: null };
    return { anim, note: `${fnName}(${argVals.join(', ')})` };
  }

  const compoundAssign = clean.match(/^([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\s*\[[^\]]+\])*)\s*(\+=|-=|\*=|\/=)\s*(.+)$/);
  if (compoundAssign && compoundAssign[1] && compoundAssign[2] && compoundAssign[3]) {
    const to = compoundAssign[1].trim();
    const op = compoundAssign[2][0];
    const rhs = compoundAssign[3].trim();
    const from = `${to} ${op} ${rhs}`;
    let val = safeEvalExpr(from, v);
    if (val === undefined && nextV) val = safeEvalExpr(to, nextV);
    if (val !== undefined) {
      const valStr = formatShortVal(val);
      return { anim: { type: 'assign', to, from: rhs, val: valStr }, note: `${to} ← ${valStr}   (${rawLine.trim()})` };
    }
  }

  const assignMatch = clean.match(/^(?:(?:const|let|var)\s+)?([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\s*\[[^\]]+\])*)\s*=\s*(?!=)(.+)$/);
  if (assignMatch && assignMatch[1] && assignMatch[2]) {
    const to = assignMatch[1].trim();
    const from = assignMatch[2].trim();
    const isSingleDecl = splitTopLevel(clean.replace(/^(?:const|let|var)\s+/, '')).length === 1;
    if (isSingleDecl || !from.includes(',') || /^[\w$.]+\s*\([^)]*\)$/.test(from)) {
      let val = safeEvalExpr(from, v);
      if (val === undefined && nextV) {
        val = safeEvalExpr(to, nextV);
      }
      const valStr = val !== undefined ? formatShortVal(val) : null;

      const rhsCall = from.match(/^([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*\((.*)\)$/);
      if (rhsCall && rhsCall[1] && rhsCall[2] !== undefined && valStr !== null) {
        const fnName = rhsCall[1];
        const args = splitTopLevel(rhsCall[2]).map(s => s.trim()).filter(Boolean);
        const argVals = args.map(a => formatShortVal(safeEvalExpr(a, v)));
        const anim = { type: 'call', fn: fnName, args, argVals, result: valStr, to };
        return { anim, note: `${to} = ${fnName}(${argVals.join(', ')})  →  ${valStr}` };
      }

      if (valStr !== null) {
        const anim = { type: 'assign', to, from, val: valStr };
        return { anim, note: `${to} ← ${valStr}   (${rawLine.trim()})` };
      }
    }
  }

  const retMatch = clean.match(/^return\s+(.+)$/);
  if (retMatch && retMatch[1]) {
    const expr = retMatch[1].trim();
    const val = safeEvalExpr(expr, v);
    if (val !== undefined) {
      const valStr = formatShortVal(val);
      const anim = { type: 'assign', to: 'return', from: expr, val: valStr };
      return { anim, note: `return ${expr}  →  ${valStr}` };
    }
  }

  return { anim: null, note: rawLine.trim() };
}

export function pressure(d: Frame | null | undefined) {
  if (!d) return 0;
  let n = 0;
  if (typeof d.total === 'number') n = d.total;
  else if (d.items) n = d.items.length;
  else if (d.fields) n = d.fields.length;
  else if (d.entries) n = d.entries.length;
  else if (d.nodes) n = d.nodes.length;
  else if (d.cells) n = (d.totalRows || d.cells.length) * (d.totalCols || (d.cells[0] ? d.cells[0].length : 1));
  switch (d.kind) {
    case 'eventloop': return 1;
    case 'grid': return Math.min(1, Math.max(0.5, n / 12));
    case 'array':
    case 'queue':
    case 'uf': return Math.min(1, n / 11);
    case 'heap': return Math.min(1, Math.max(0.46, n / 11));
    case 'list': return Math.min(1, n / 7);
    case 'map': return Math.min(1, n / 7);
    case 'interface':
    case 'object': return Math.min(1, n / 6);
    case 'set': return Math.min(1, n / 9);
    case 'string': return Math.min(1, n / 18);
    case 'tree': return n >= 6 ? 0.38 : 0.28;
    case 'graph': return n >= 5 ? 0.36 : 0.26;
    case 'stack': return Math.min(0.35, n / 16);
    default: return Math.min(1, n / 10);
  }
}

const SPAN_UP = 0.45, SPAN_DOWN = 0.28;
export function decideSpan(id: string, p: number): number {
  const curSpan = appState.layoutSpan[id] || 1;
  if (curSpan < 2 && p >= SPAN_UP) appState.layoutSpan[id] = 2;
  else if (curSpan > 1 && p <= SPAN_DOWN) appState.layoutSpan[id] = 1;
  return appState.layoutSpan[id] || 1;
}

export interface DiscoveredVar {
  id: string;
  name: string;
  kind?: string;
}

export function allocateSlotSpans(vars: DiscoveredVar[], ds: Record<string, StepAnim>) {
  const meta = vars.map((s: DiscoveredVar, idx: number) => {
    const d: Frame | undefined = ds[s.id];
    const kind: string = (d && d.kind) || s.kind || 'array';
    const p = pressure(d);
    const span = decideSpan(s.id, p);
    return { s, d, kind, p, span, idx };
  });

  const oneColItems = meta.filter(m => m.span === 1);
  if (oneColItems.length % 2 === 1) {
    let promote = oneColItems[0];
    if (promote) {
      for (let i = 1; i < oneColItems.length; i++) {
        const candidate = oneColItems[i];
        if (candidate && candidate.p >= promote.p) {
          promote = candidate;
        }
      }
      promote.span = 2;
    }
  }

  return meta;
}

let _DISCOVER_CACHE: { traceRef: unknown; scannedSteps: number; map: Map<string, DiscoveredVar>; list: DiscoveredVar[] } = {
  traceRef: null,
  scannedSteps: 0,
  map: new Map(),
  list: [],
};

export function discoverVars(): DiscoveredVar[] {
  const steps = (appState.TRACE && appState.TRACE.steps) || [];
  if (_DISCOVER_CACHE.traceRef !== appState.TRACE || steps.length < _DISCOVER_CACHE.scannedSteps) {
    _DISCOVER_CACHE = { traceRef: appState.TRACE, scannedSteps: 0, map: new Map(), list: [] };
  }
  if (_DISCOVER_CACHE.scannedSteps < steps.length) {
    let changed = false;
    for (let i = _DISCOVER_CACHE.scannedSteps; i < steps.length; i++) {
      const st = steps[i];
      const ds = (st && st.ds) || {};
      const keys = Object.keys(ds);
      for (let k = 0; k < keys.length; k++) {
        const name = keys[k];
        const item = name ? ds[name] : undefined;
        if (name && item && !_DISCOVER_CACHE.map.has(name)) {
          _DISCOVER_CACHE.map.set(name, { id: name, name, kind: item.kind || name });
          changed = true;
        }
      }
    }
    _DISCOVER_CACHE.scannedSteps = steps.length;
    if (changed) _DISCOVER_CACHE.list = [..._DISCOVER_CACHE.map.values()];
  }
  return _DISCOVER_CACHE.list;
}

export const VIZ: Record<string, (d: Frame | null | undefined) => string | null> = {};

export function getActiveFrame(st: StepSnapshot | Frame | null | undefined) {
  if (!st) return null;
  const stack = Array.isArray(st.callStack) && st.callStack.length ? st.callStack : null;
  if (!stack) {
    return {
      idx: 0,
      total: 1,
      isTop: true,
      file: st.file || appState.DEBUG_SESSION.entryFile || '',
      fn: 'global',
      label: 'global',
      line: st.line,
      v: st.v || {},
      ds: st.ds || {},
    };
  }
  const topIdx = stack.length - 1;
  const idx = (appState.SELECTED_FRAME_IDX !== null && appState.SELECTED_FRAME_IDX >= 0 && appState.SELECTED_FRAME_IDX < stack.length)
    ? appState.SELECTED_FRAME_IDX
    : topIdx;
  const frame = stack[idx] || stack[topIdx];
  return {
    idx,
    total: stack.length,
    isTop: idx === topIdx,
    file: frame.file || st.file || appState.DEBUG_SESSION.entryFile || '',
    fn: frame.fn || 'global',
    label: frame.label || 'global',
    line: frame.line || st.line,
    v: frame.v || (idx === topIdx ? st.v : {}) || {},
    ds: (frame.ds && Object.keys(frame.ds).length ? frame.ds : st.ds) || {},
  };
}

