/* ================================================================
   Memory Snapshot Classifier, Call Stack & Data Structure Renderers (src/viz/memory-graph.ts)
   ================================================================ */
import { RESERVED_WORDS, skipString, splitTopLevel, splitTopLevelSemicolons } from "../compiler/comments";
import { stripTypes } from "../compiler/transpile";
import { inferRuntimeTsType, matchInterfaceForObject } from "../compiler/type-checker";
import { safeJSONStringify } from "../runtime/event-loop";
import { hideHoverTip, updateEditorChrome, scrollCodeTo } from "./highlight";
import { playStepAnimation } from "./ast-view";

export function isMapLike(v) {
  return Object.prototype.toString.call(v) === '[object Map]';
}
export function isSetLike(v) {
  return Object.prototype.toString.call(v) === '[object Set]';
}

export function defineHidden(obj, key, val) {
  if (!obj || typeof obj !== 'object') return;
  try {
    Object.defineProperty(obj, key, {
      value: val, enumerable: false, configurable: true, writable: true,
    });
  } catch (_) {}
}

export function cloneDeepBounded(val, depth = 0) {
  if (val === null || typeof val !== 'object') return val;
  if (val.__isVirtualPromise) {
    if (val.state === 'pending') return 'Promise <pending>';
    if (val.state === 'fulfilled') return 'Promise <fulfilled: ' + formatShortVal(val.value) + '>';
    return 'Promise <rejected: ' + formatShortVal(val.reason) + '>';
  }
  if (depth >= 4) return String(val);
  if (Array.isArray(val)) return val.slice(0, 40).map(x => cloneDeepBounded(x, depth + 1));
  if (isMapLike(val)) {
    const entries = [];
    for (const [k, v] of val) {
      if (entries.length >= 40) break;
      entries.push({ k: cloneDeepBounded(k, depth + 1), v: cloneDeepBounded(v, depth + 1) });
    }
    return entries;
  }
  if (isSetLike(val)) {
    const items = [];
    for (const v of val) {
      if (items.length >= 40) break;
      items.push(cloneDeepBounded(v, depth + 1));
    }
    return items;
  }
  const out = {};
  const clsName = val.__py_cls__ || (val.constructor && val.constructor !== Object && val.constructor.name ? val.constructor.name : '');
  if (clsName) {
    defineHidden(out, '__py_cls__', clsName);
  }
  Object.keys(val).slice(0, 20).forEach(k => {
    out[k] = cloneDeepBounded(val[k], depth + 1);
  });
  return out;
}

export function normalizeTree(value) {
  if (value && Array.isArray(value.nodes)) {
    return {
      kind: 'tree',
      total: value.total || value.nodes.length,
      nodes: value.nodes.slice(0, 31).map(n => ({
        val: n.val !== undefined ? n.val : n.id,
        left: n.left ?? null,
        right: n.right ?? null,
      })),
      root: value.root ?? 0,
    };
  }
  const nodes = [];
  const seen = new Set();
  const nodeMap = new Map();
  function walk(node) {
    if (!node || typeof node !== 'object' || seen.has(node)) return null;
    seen.add(node);
    if (nodes.length >= 31) {
      if (seen.size < 2000) {
        walk(node.left);
        walk(node.right);
      }
      return null;
    }
    const idx = nodes.length;
    nodeMap.set(node, idx);
    const item = { val: node.val !== undefined ? node.val : node.value, left: null, right: null };
    nodes.push(item);
    item.left = walk(node.left);
    item.right = walk(node.right);
    return idx;
  }
  const root = walk(value);
  const out = { kind: 'tree', nodes, root: root ?? 0, total: seen.size };
  defineHidden(out, '__nodeMap', nodeMap);
  return out;
}

export function normalizeList(value) {
  const pyMeta = (value && typeof value === 'object' && value.__py_meta__) ? value.__py_meta__ : null;
  if (Array.isArray(value)) {
    const total = (pyMeta && typeof pyMeta.total === 'number') ? pyMeta.total : value.length;
    const out = { kind: 'list', items: value.slice(0, 30).map(x => cloneDeepBounded(x, 1)), total };
    if (total > 20) {
      defineHidden(out, '__raw', value);
      if (pyMeta) defineHidden(out, '__pyMeta', pyMeta);
    }
    return out;
  }
  const items = [];
  const rawNodes = [];
  const rawVals = [];
  const seen = new Set();
  let curNode = value;
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

export function normalizeGraph(value) {
  if (value && Array.isArray(value.nodes) && Array.isArray(value.edges)) {
    const rawNodes = value.nodes.slice(0, 16);
    const count = rawNodes.length || 1;
    const nodes = rawNodes.map((n, idx) => {
      const angle = (2 * Math.PI * idx) / count - Math.PI / 2;
      const id = n && typeof n === 'object' ? (n.id ?? idx) : n;
      const label = n && typeof n === 'object' ? (n.label ?? n.val ?? id) : String(n);
      const x = n && typeof n.x === 'number' ? n.x : Math.round(90 + 62 * Math.cos(angle));
      const y = n && typeof n.y === 'number' ? n.y : Math.round(68 + 48 * Math.sin(angle));
      return { id, label: String(label), x, y };
    });
    const edges = value.edges.slice(0, 32).map(e => Array.isArray(e) ? [e[0], e[1]] : [e.from, e.to]);
    return { kind: 'graph', nodes, edges, totalNodes: value.nodes.length, totalEdges: value.edges.length };
  }
  return { kind: 'graph', nodes: [], edges: [] };
}

export function snapshot(kind: any, value: any, extra?: any): any {
  const pyMeta = (value && typeof value === 'object' && value.__py_meta__) ? value.__py_meta__ : null;
  if (kind === 'stack') {
    const arr = Array.isArray(value) ? value : [];
    const total = (pyMeta && typeof pyMeta.total === 'number') ? pyMeta.total : arr.length;
    let items;
    let baseIdx = 0;
    if (pyMeta && Array.isArray(pyMeta.tail) && total > arr.length) {
      items = pyMeta.tail.map(x => cloneDeepBounded(x, 1));
      baseIdx = Math.max(0, total - items.length);
    } else if (arr.length > 40) {
      baseIdx = arr.length - 40;
      items = arr.slice(baseIdx).map(x => cloneDeepBounded(x, 1));
    } else {
      items = arr.slice(0, 40).map(x => cloneDeepBounded(x, 1));
    }
    return Object.assign({ kind, items, total, baseIdx }, extra || {});
  }
  if (kind === 'array' || kind === 'heap' || kind === 'queue' || kind === 'uf') {
    const arr = Array.isArray(value) ? value : [];
    const total = (pyMeta && typeof pyMeta.total === 'number') ? pyMeta.total : arr.length;
    const items = arr.slice(0, 40).map(x => cloneDeepBounded(x, 1));
    const out = Object.assign({ kind, items, total }, extra || {});
    if (total > 20) {
      defineHidden(out, '__raw', arr);
      if (pyMeta) defineHidden(out, '__pyMeta', pyMeta);
    }
    return out;
  }
  if (kind === 'list') {
    return Object.assign(normalizeList(value), extra || {});
  }
  if (kind === 'tree') {
    return Object.assign(normalizeTree(value), extra || {});
  }
  if (kind === 'graph') {
    return Object.assign(normalizeGraph(value), extra || {});
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
    const entries = [];
    let total = 0;
    if (isMapLike(value)) {
      total = (pyMeta && typeof pyMeta.total === 'number') ? pyMeta.total : value.size;
      for (const [k, v] of value) {
        if (entries.length >= 40) break;
        entries.push({ k: cloneDeepBounded(k, 1), v: cloneDeepBounded(v, 1) });
      }
    } else if (value && typeof value.forEach === 'function') {
      value.forEach((v, k) => {
        total++;
        if (entries.length < 40) entries.push({ k: cloneDeepBounded(k, 1), v: cloneDeepBounded(v, 1) });
      });
    } else if (value && typeof value === 'object') {
      const keys = Object.keys(value);
      total = keys.length;
      keys.slice(0, 40).forEach(k => entries.push({ k, v: cloneDeepBounded(value[k], 1) }));
    }
    const out = Object.assign({ kind, entries, total }, extra || {});
    if (total > 20) defineHidden(out, '__raw', value);
    return out;
  }
  if (kind === 'set') {
    const items = [];
    let total = 0;
    if (isSetLike(value)) {
      total = (pyMeta && typeof pyMeta.total === 'number') ? pyMeta.total : value.size;
      for (const v of value) {
        if (items.length >= 40) break;
        items.push(cloneDeepBounded(v, 1));
      }
    } else if (value && typeof value.forEach === 'function') {
      value.forEach(v => {
        total++;
        if (items.length < 40) items.push(cloneDeepBounded(v, 1));
      });
    }
    const out = Object.assign({ kind, items, total }, extra || {});
    if (total > 20) defineHidden(out, '__raw', value);
    return out;
  }
  if (kind === 'grid') {
    const totalRows = (pyMeta && typeof pyMeta.totalRows === 'number') ? pyMeta.totalRows : (Array.isArray(value) ? value.length : 0);
    const totalCols = (pyMeta && typeof pyMeta.totalCols === 'number') ? pyMeta.totalCols : (Array.isArray(value) && Array.isArray(value[0]) ? value[0].length : 0);
    const cloned = Array.isArray(value)
      ? value.slice(0, 30).map(r => Array.isArray(r) ? r.slice(0, 30).map(c => cloneDeepBounded(c, 2)) : r)
      : [[0]];
    const out = Object.assign({ kind, cells: cloned, mark: null, deps: [], totalRows, totalCols }, extra || {});
    if (totalRows > 10 || totalCols > 10) {
      defineHidden(out, '__raw', value);
      if (pyMeta) defineHidden(out, '__pyMeta', pyMeta);
    }
    return out;
  }
  if (kind === 'interface' || kind === 'object') {
    return Object.assign({ kind: 'interface', fields: [], entries: [] }, extra || {});
  }
  return { kind: 'array', items: [] };
}

export function classifyValue(name, value) {
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
  if (typeof value === 'object') {
    if (value.__isVirtualPromise) return null;
    if (Array.isArray(value.nodes) && Array.isArray(value.edges)) return snapshot('graph', value);
    if (Array.isArray(value.nodes) && 'root' in value) return snapshot('tree', value);
    if (n !== 'this') {
      if (('val' in value || 'value' in value) && ('left' in value || 'right' in value)) return snapshot('tree', value);
      if (('val' in value || 'value' in value) && 'next' in value) return snapshot('list', value);
    }

    // Plain object, class instance, or TypeScript interface instance
    const ifaceDef = matchInterfaceForObject(n, value);
    const annotType = CURRENT_TS_META.varTypes.get(n);
    const ifaceName = ifaceDef ? ifaceDef.name : (annotType || value.__py_cls__ || 'object');
    const isClass = Boolean((ifaceDef && ifaceDef.isClass) || value.__py_cls__);
    const fieldMap = new Map();
    if (ifaceDef) {
      ifaceDef.fields.forEach(f => {
        fieldMap.set(f.k, {
          k: f.k,
          v: (f.k in value) ? cloneDeepBounded(value[f.k], 1) : undefined,
          declaredType: f.declaredType,
          optional: Boolean(f.optional),
        });
      });
    }
    Object.keys(value).slice(0, 20).forEach(k => {
      if (!fieldMap.has(k)) {
        fieldMap.set(k, {
          k,
          v: cloneDeepBounded(value[k], 1),
          declaredType: inferRuntimeTsType(value[k]),
          optional: false,
        });
      }
    });
    const fields = [...fieldMap.values()];
    if (fields.length > 0 || isClass) {
      return snapshot('interface', value, {
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

export function populateInterfaceSchemas(ds) {
  const { interfaces, varTypes } = CURRENT_TS_META;
  if (!interfaces || !interfaces.size) return;
  interfaces.forEach(iface => {
    if (iface.isClass && (!iface.fields || !iface.fields.length)) return;
    const prefix = iface.isClass ? 'class ' : 'interface ';
    const slotKey = (iface.name in ds) ? (prefix + iface.name) : iface.name;
    let boundInstance = null;
    let boundVarName = null;
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
    const fields = iface.fields.map(f => {
      const instField = boundInstance && boundInstance.fields ? boundInstance.fields.find(x => x.k === f.k) : null;
      return {
        k: f.k,
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
      entries: fields.map(f => ({ k: f.k, v: f.v !== undefined ? f.v : f.declaredType })),
    };
  });
}

export function detectWindowRange(v) {
  if (!v) return null;
  const pairs = [['l', 'r'], ['left', 'right'], ['lo', 'hi'], ['start', 'end']];
  for (const [lk, rk] of pairs) {
    if (typeof v[lk] === 'number' && typeof v[rk] === 'number' && v[lk] >= 0 && v[rk] >= v[lk]) {
      return [v[lk], v[rk]];
    }
  }
  return null;
}

export const POINTER_VAR_NAMES = [
  'mid', 'm', 'i', 'j', 'k', 'idx', 'p', 'q', 'cur', 'curr', 'slow', 'fast', 'pivot',
  'l', 'r', 'left', 'right', 'lo', 'hi', 'low', 'high', 'start', 'end',
];

export function build1DFocalSlice(total, getAt, focalCenters) {
  if (total <= 20) return null;
  const centers = [];
  const seenC = new Set();
  (focalCenters || []).forEach(c => {
    if (typeof c === 'number' && Number.isInteger(c) && c >= 0 && c < total && !seenC.has(c)) {
      seenC.add(c);
      centers.push(c);
    }
  });
  const activeCenters = centers.slice(0, 4);
  const radius = activeCenters.length <= 1 ? 3 : (activeCenters.length === 2 ? 2 : 1);
  const intervals = [
    [0, Math.min(total - 1, 2)],
    [Math.max(0, total - 3), total - 1],
  ];
  activeCenters.forEach(c => {
    intervals.push([Math.max(0, c - radius), Math.min(total - 1, c + radius)]);
  });
  intervals.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const iv of intervals) {
    if (!merged.length) {
      merged.push([iv[0], iv[1]]);
    } else {
      const prev = merged[merged.length - 1];
      if (iv[0] <= prev[1] + 2) {
        prev[1] = Math.max(prev[1], iv[1]);
      } else {
        merged.push([iv[0], iv[1]]);
      }
    }
  }
  const out = [];
  for (let s = 0; s < merged.length; s++) {
    const [start, end] = merged[s];
    if (s > 0) {
      const prevEnd = merged[s - 1][1];
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

export function selectGridAxisIndices(total, focusIdx, maxCount = 8) {
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

export function enrichFromNote(ds, v, note) {
  if (!ds || typeof ds !== 'object') return;
  const safeV = v || {};
  const text = String(note || '');

  const evalIdx = (expr) => {
    const t = String(expr || '').trim();
    if (!t) return undefined;
    if (/^\d+$/.test(t)) return +t;
    if (t in safeV && typeof safeV[t] === 'number' && Number.isInteger(safeV[t])) return safeV[t];
    const m = t.match(/^([A-Za-z_$][\w$]*)\s*([+-])\s*(\d+)$/);
    if (m && typeof safeV[m[1]] === 'number' && Number.isInteger(safeV[m[1]])) {
      return m[2] === '+' ? safeV[m[1]] + (+m[3]) : safeV[m[1]] - (+m[3]);
    }
    const evaluated = safeEvalExpr(t, safeV);
    return (typeof evaluated === 'number' && Number.isInteger(evaluated)) ? evaluated : undefined;
  };

  const win = detectWindowRange(safeV);
  if (win) {
    Object.keys(ds).forEach(k => {
      if (ds[k] && (ds[k].kind === 'array' || ds[k].kind === 'string')) {
        ds[k].win = win;
      }
    });
  }

  if (text) {
    // Highlight accessed property on interface / class / object cards (e.g. user.name, this.total, self.val)
    const propRe = /\b([A-Za-z_$][\w$]*)\s*\.\s*([A-Za-z_$][\w$]*)\b/g;
    let pm;
    while ((pm = propRe.exec(text))) {
      const rawObj = pm[1], propName = pm[2];
      const objName = (rawObj === 'self' && !ds.self && ds.this) ? 'this' : rawObj;
      if (ds[objName] && (ds[objName].kind === 'interface' || ds[objName].kind === 'object')) {
        ds[objName].hot = propName;
        const ifaceName = ds[objName].interfaceName;
        if (ifaceName && ds[ifaceName] && ds[ifaceName].kind === 'interface') {
          ds[ifaceName].hot = propName;
        }
      }
    }

    // 2D Grid subscript access: dp[i][j]
    const g = text.match(/\b([A-Za-z_$][\w$]*)\s*\[\s*([^[\]]+?)\s*\]\s*\[\s*([^[\]]+?)\s*\]/);
    if (g && ds[g[1]] && ds[g[1]].kind === 'grid') {
      const row = evalIdx(g[2]);
      const col = evalIdx(g[3]);
      if (typeof row === 'number' && typeof col === 'number') {
        ds[g[1]].mark = [row, col];
      }
      const deps = [];
      const re = /\b[A-Za-z_$][\w$]*\s*\[\s*([^[\]]+?)\s*\]\s*\[\s*([^[\]]+?)\s*\]/g;
      let m;
      while ((m = re.exec(text))) {
        const r = evalIdx(m[1]);
        const c = evalIdx(m[2]);
        if (typeof r === 'number' && typeof c === 'number') {
          if (!(ds[g[1]].mark && ds[g[1]].mark[0] === r && ds[g[1]].mark[1] === c)) {
            deps.push([r, c]);
          }
        }
      }
      ds[g[1]].deps = deps;
    }

    // 1D subscript access: nums[mid], s[i], etc. (match all occurrences on the line)
    const subRe = /\b([A-Za-z_$][\w$]*)\s*\[\s*([^[\]]+?)\s*\](?!\s*\[)/g;
    let sm;
    while ((sm = subRe.exec(text))) {
      const varName = sm[1];
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
          d.__extraFocal.push(idx);
        }
      }
    }

    // Container mutation / lookup methods: push, set, add, pop, shift, unshift, get, has
    const p = text.match(/\b([A-Za-z_$][\w$]*)\s*\.\s*(push|set|add|pop|shift|unshift|get|has)\s*\(\s*([^,)]*)/);
    if (p && ds[p[1]]) {
      const d = ds[p[1]];
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
          if (d.entries && d.entries.length) d.hot = d.entries[d.entries.length - 1].k;
        } else if (d.kind === 'set' && d.hot === undefined) {
          if (d.items && d.items.length) d.hot = d.items[d.items.length - 1];
        }
      }
    }
  }

  // Finalize focus-aware windowing & pointer tags for all structures in ds
  Object.keys(ds).forEach(varName => {
    const d = ds[varName];
    if (!d || typeof d !== 'object') return;

    // 1) Binary tree node reference highlighting
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

    // 2) Linked list node reference & focal windowing
    if (d.kind === 'list' && d.__rawNodes) {
      const nodePtrs = {};
      const focal = [];
      for (const pName of POINTER_VAR_NAMES) {
        const ref = safeV[pName];
        if (ref && typeof ref === 'object') {
          const idx = d.__rawNodes.indexOf(ref);
          if (idx >= 0) {
            if (!nodePtrs[idx]) nodePtrs[idx] = [];
            if (!nodePtrs[idx].includes(pName)) nodePtrs[idx].push(pName);
            if (d.hot === undefined) d.hot = idx;
            focal.push(idx);
          }
        }
      }
      if (Object.keys(nodePtrs).length) d.pointers = nodePtrs;
      const total = d.total || d.__rawVals.length;
      if (total > 20) {
        if (typeof d.hot === 'number') focal.unshift(d.hot);
        d.windowed = build1DFocalSlice(total, idx => cloneDeepBounded(d.__rawVals[idx], 1), focal);
      }
    }

    // 3) 1D Indexed Sequences (array, queue, heap, uf, string, array-backed list)
    if (
      d.kind === 'array' || d.kind === 'queue' || d.kind === 'heap' ||
      d.kind === 'uf' || d.kind === 'string' || (d.kind === 'list' && !d.__rawNodes)
    ) {
      const total = typeof d.total === 'number' ? d.total : (d.items ? d.items.length : 0);
      if (total > 0) {
        const ptrs = d.pointers || {};
        const focal = [];
        if (typeof d.hot === 'number' && d.hot >= 0 && d.hot < total) focal.push(d.hot);
        if (Array.isArray(d.__extraFocal)) {
          d.__extraFocal.forEach(idx => {
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
            if (!ptrs[val]) ptrs[val] = [];
            if (!ptrs[val].includes(pName)) ptrs[val].push(pName);
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
          const pyMeta = d.__pyMeta;
          const getAt = (idx) => {
            if (pyMeta && pyMeta.sparse && pyMeta.sparse.has(idx)) {
              return cloneDeepBounded(pyMeta.sparse.get(idx), 1);
            }
            if (typeof raw === 'string') return raw[idx] ?? '';
            if (Array.isArray(raw) && idx < raw.length) return cloneDeepBounded(raw[idx], 1);
            if (d.items && idx < d.items.length) return d.items[idx];
            return '…';
          };
          d.windowed = build1DFocalSlice(total, getAt, focal);
        }
      }
    }

    // 4) Large Map / Set: ensure accessed hot key/value beyond index 40 is included in entries/items
    if (d.kind === 'map' && d.hot !== undefined && d.__raw && isMapLike(d.__raw)) {
      const exists = (d.entries || []).some(e => e.k === d.hot);
      if (!exists && d.__raw.has(d.hot)) {
        d.entries.push({ k: cloneDeepBounded(d.hot, 1), v: cloneDeepBounded(d.__raw.get(d.hot), 1) });
      }
    }
    if (d.kind === 'set' && d.hot !== undefined && d.__raw && isSetLike(d.__raw)) {
      const exists = (d.items || []).some(x => x === d.hot);
      if (!exists && d.__raw.has(d.hot)) {
        d.items.push(cloneDeepBounded(d.hot, 1));
      }
    }

    // 5) 2D Grid sliding viewport for matrices larger than 10x10
    if (d.kind === 'grid') {
      const totalRows = typeof d.totalRows === 'number' ? d.totalRows : (d.cells ? d.cells.length : 0);
      const totalCols = typeof d.totalCols === 'number' ? d.totalCols : (d.cells && d.cells[0] ? d.cells[0].length : 0);
      if (totalRows > 10 || totalCols > 10) {
        const pyMeta = d.__pyMeta;
        if (pyMeta && Array.isArray(pyMeta.rowIndices) && Array.isArray(pyMeta.colIndices) && Array.isArray(pyMeta.viewCells)) {
          d.rowIndices = pyMeta.rowIndices;
          d.colIndices = pyMeta.colIndices;
          d.viewCells = pyMeta.viewCells;
        } else {
          let focusR = d.mark ? d.mark[0] : (d.deps && d.deps[0] ? d.deps[0][0] : undefined);
          let focusC = d.mark ? d.mark[1] : (d.deps && d.deps[0] ? d.deps[0][1] : undefined);
          if (focusR === undefined || focusC === undefined) {
            const coordPairs = [['i', 'j'], ['r', 'c'], ['row', 'col'], ['x', 'y']];
            for (const [rk, ck] of coordPairs) {
              if (typeof safeV[rk] === 'number' && typeof safeV[ck] === 'number') {
                focusR = safeV[rk];
                focusC = safeV[ck];
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
            const rowArr = rawGrid && Array.isArray(rawGrid[r]) ? rawGrid[r] : [];
            return colIndices.map(c => cloneDeepBounded(rowArr[c], 2));
          });
        }
      }
    }

    // Clean up temporary raw object references so snapshots stay lightweight and serializable
    delete d.__raw;
    delete d.__rawNodes;
    delete d.__rawVals;
    delete d.__nodeMap;
    delete d.__pyMeta;
    delete d.__extraFocal;
  });
}

export function formatShortVal(val) {
  if (val === undefined) return 'undefined';
  if (val === null) return 'null';
  if (typeof val === 'string') return JSON.stringify(val.length > 16 ? val.slice(0, 14) + '…' : val);
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (Array.isArray(val)) return '[' + val.slice(0, 4).map(formatShortVal).join(', ') + (val.length > 4 ? ', …' : '') + ']';
  if (isMapLike(val)) return 'Map(' + val.size + ')';
  if (isSetLike(val)) return 'Set(' + val.size + ')';
  if (typeof val === 'object') {
    const keys = Object.keys(val);
    if (keys.length > 0 && keys.length <= 4 && keys.every(k => val[k] === null || typeof val[k] !== 'object')) {
      return '{ ' + keys.map(k => k + ': ' + formatShortVal(val[k])).join(', ') + ' }';
    }
  }
  return '{…}';
}

export function safeEvalExpr(expr, v) {
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

export function splitLogicalClauses(condExpr) {
  const clauses = [];
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

export function deriveAnimAndNote(rawLine: any, v?: any, nextV?: any): any {
  const clean = stripTypes(rawLine || '').trim().replace(/;$/, '');
  if (!clean) return { anim: null, note: rawLine };

  let condExpr = null;
  const condMatch = clean.match(/^(?:}\s*)?(?:if|while|else\s+if)\s*\(([\s\S]+)\)\s*\{?$/);
  if (condMatch) {
    condExpr = condMatch[1].trim();
  } else {
    const forMatch = clean.match(/^for\s*\(([\s\S]+)\)\s*\{?$/);
    if (forMatch) {
      const semiParts = splitTopLevelSemicolons(forMatch[1]);
      if (semiParts.length === 3 && semiParts[1].trim()) {
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
      activeClause = c.expr;
      const cVal = safeEvalExpr(c.expr, v);
      if (typeof cVal === 'boolean') {
        if (c.opAfter === '&&' && !cVal) { overallResult = false; break; }
        if (c.opAfter === '||' && cVal) { overallResult = true; break; }
        if (!c.opAfter) overallResult = cVal;
      }
    }

    const cmp = activeClause.match(/^(.+?)\s*(===|!==|<=|>=|==|!=|<|>)\s*(.+)$/);
    if (cmp) {
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
  if (ckptCall) {
    const fnName = clean.startsWith('断点') ? '断点' : 'checkpoint';
    const args = splitTopLevel(ckptCall[1]).map(s => s.trim()).filter(Boolean);
    const argVals = Array.isArray(nextV && nextV.__ckptVals) && nextV.__ckptVals.length === args.length
      ? nextV.__ckptVals
      : args.map(a => formatShortVal(safeEvalExpr(a, v)));
    const anim = { type: 'checkpoint', fn: fnName, args, argVals };
    const detail = args.length
      ? args.map((a, idx) => (argVals[idx] !== undefined && argVals[idx] !== a ? `${a}=${argVals[idx]}` : a)).join(', ')
      : '已命中断点';
    return { anim, note: `◉ ${fnName}(${detail})`, isCheckpoint: true };
  }

  const callOnly = clean.match(/^([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*\((.*)\)$/);
  if (callOnly) {
    const fnName = callOnly[1];
    const args = splitTopLevel(callOnly[2]).map(s => s.trim()).filter(Boolean);
    const argVals = args.map(a => formatShortVal(safeEvalExpr(a, v)));
    const anim = { type: 'call', fn: fnName, args, argVals, result: null, to: null };
    return { anim, note: `${fnName}(${argVals.join(', ')})` };
  }

  const compoundAssign = clean.match(/^([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\s*\[[^\]]+\])*)\s*(\+=|-=|\*=|\/=)\s*(.+)$/);
  if (compoundAssign) {
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
  if (assignMatch) {
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
      if (rhsCall && valStr !== null) {
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
  if (retMatch) {
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

export function getActiveFrame(st) {
  if (!st) return null;
  const stack = Array.isArray(st.callStack) && st.callStack.length ? st.callStack : null;
  if (!stack) {
    return {
      idx: 0,
      total: 1,
      isTop: true,
      fn: 'global',
      label: 'global',
      line: st.line,
      v: st.v || {},
      ds: st.ds || {},
    };
  }
  const topIdx = stack.length - 1;
  const idx = (SELECTED_FRAME_IDX !== null && SELECTED_FRAME_IDX >= 0 && SELECTED_FRAME_IDX < stack.length)
    ? SELECTED_FRAME_IDX
    : topIdx;
  const frame = stack[idx] || stack[topIdx];
  return {
    idx,
    total: stack.length,
    isTop: idx === topIdx,
    fn: frame.fn || 'global',
    label: frame.label || 'global',
    line: frame.line || st.line,
    v: frame.v || (idx === topIdx ? st.v : {}) || {},
    ds: (frame.ds && Object.keys(frame.ds).length ? frame.ds : st.ds) || {},
  };
}

export function selectStackFrame(frameIdx) {
  const st = TRACE.steps[cur];
  if (!st || !Array.isArray(st.callStack) || !st.callStack.length) return;
  const topIdx = st.callStack.length - 1;
  const clamped = Math.max(0, Math.min(topIdx, Number(frameIdx) || 0));
  SELECTED_FRAME_IDX = clamped === topIdx ? null : clamped;
  renderStatic(cur, false);
}

export function renderCallStack(st) {
  if (!callStackBarEl) return;
  if (!st) {
    callStackBarEl.innerHTML = '<span class="cs-empty">未在调试</span>';
    if (callStackHintEl) callStackHintEl.textContent = '点击栈帧可切换作用域';
    return;
  }
  const stack = (Array.isArray(st.callStack) && st.callStack.length)
    ? st.callStack
    : [{ fn: 'global', label: 'global', line: st.line, v: st.v || {}, ds: st.ds || {} }];
  const active = getActiveFrame(st);
  callStackBarEl.innerHTML = stack.map((f, fIdx) => {
    const isSel = fIdx === active.idx;
    const isTop = fIdx === stack.length - 1;
    const cls = 'cs-crumb' + (isSel ? ' active' : '') + (isTop ? ' is-top' : '') + (!isTop && isSel ? ' inspecting' : '');
    const sep = fIdx > 0 ? '<span class="cs-sep">▸</span>' : '';
    return sep + `<button type="button" class="${cls}" data-frame-idx="${fIdx}" title="切换到栈帧 ${esc(f.label)} (第 ${f.line || st.line} 行)">${esc(f.label)}</button>`;
  }).join('');
  if (callStackHintEl) {
    callStackHintEl.textContent = active.isTop
      ? `栈深 ${stack.length} · 点击栈帧可切换`
      : `正在查看栈帧 ${active.idx + 1}/${stack.length}: ${active.label}`;
  }
}

export function truncMap(arr: any, render: any, d?: any) {
  if (d && Array.isArray(d.windowed) && d.windowed.length) {
    return d.windowed.map(entry => {
      if (entry && entry.gap) {
        const tip = entry.from != null && entry.to != null
          ? ` title="省略下标 ${entry.from}..${entry.to}（共 ${entry.count} 项）"`
          : '';
        return '<div class="vmore"' + tip + '>…<span class="vmore-cnt">+' + entry.count + '</span></div>';
      }
      return render(entry.val, entry.idx);
    }).join('');
  }
  const MAX = 20, HEAD = 10, TAIL = 5;
  if (!arr || arr.length <= MAX) return (arr || []).map((x, i) => render(x, i)).join('');
  const total = (d && typeof d.total === 'number' && d.total >= arr.length) ? d.total : arr.length;
  const hidden = Math.max(1, total - HEAD - TAIL);
  const head = arr.slice(0, HEAD).map((x, i) => render(x, i)).join('');
  const tailStart = total - TAIL;
  const tail = arr.slice(arr.length - TAIL).map((x, i) => render(x, tailStart + i)).join('');
  return head + '<div class="vmore" title="省略 ' + hidden + ' 项">…<span class="vmore-cnt">+' + hidden + '</span></div>' + tail;
}

export function vizArray(d) {
  if (!d || !d.items || !d.items.length) return null;
  const win = d.win;
  const ptrs = d.pointers;
  const cells = truncMap(d.items, (n, k) => {
    let cls = 'vcell vcell-idx';
    if (win && k >= win[0] && k <= win[1]) cls += ' win';
    if (d.hot === k) cls += ' hot';
    else if (d.mark === k) cls += ' mark';
    const pTag = (ptrs && ptrs[k] && ptrs[k].length)
      ? '<span class="sub-tag ptr-tag">' + esc(ptrs[k].slice(0, 2).join(',')) + '</span>'
      : '';
    return '<div class="' + cls + '">' + pTag + '<span class="val">' + esc(n) + '</span><span class="idx">' + k + '</span></div>';
  }, d);
  return '<div class="viz"><div class="viz-row varray-row">' + cells + '</div></div>';
}

export function vizQueue(d) {
  if (!d || !d.items || !d.items.length) return null;
  const len = (typeof d.total === 'number' && d.total > 0) ? d.total : d.items.length;
  const cells = truncMap(d.items, (n, k) => {
    let cls = 'vcell vcell-idx';
    if (d.hot === k) cls += ' hot';
    else if (k === 0) cls += ' mark';
    const tag = k === 0 ? '<span class="sub-tag">front</span>' : (k === len - 1 ? '<span class="sub-tag">back</span>' : '');
    return '<div class="' + cls + '">' + tag + '<span class="val">' + esc(n) + '</span><span class="idx">' + k + '</span></div>';
  }, d);
  return '<div class="viz"><div class="viz-row varray-row">' + cells + '</div></div>';
}

export function vizHeap(d) {
  if (!d || !d.items || !d.items.length) return null;
  const cells = truncMap(d.items, (n, k) => {
    let cls = 'vcell vcell-idx';
    if (d.hot === k) cls += ' hot';
    else if (k === 0) cls += ' mark';
    const tag = k === 0 ? '<span class="sub-tag">top</span>' : '';
    return '<div class="' + cls + '">' + tag + '<span class="val">' + esc(n) + '</span><span class="idx">' + k + '</span></div>';
  }, d);
  return '<div class="viz"><div class="viz-row varray-row">' + cells + '</div>' +
    '<div class="vmeta-hint">parent = (i - 1) &gt;&gt; 1 · left = 2i + 1</div></div>';
}

export function vizUF(d) {
  if (!d || !d.items || !d.items.length) return null;
  const cells = truncMap(d.items, (p, k) => {
    let cls = 'vcell vcell-idx';
    if (d.hot === k) cls += ' hot';
    else if (p === k) cls += ' mark';
    const tag = p === k ? '<span class="sub-tag">root</span>' : '<span class="sub-tag">p:' + esc(p) + '</span>';
    return '<div class="' + cls + '">' + tag + '<span class="val">' + esc(p) + '</span><span class="idx">' + k + '</span></div>';
  }, d);
  return '<div class="viz"><div class="viz-row varray-row">' + cells + '</div></div>';
}

export function vizMap(d) {
  if (!d || !d.entries || !d.entries.length) return null;
  return '<div class="viz"><div class="viz-row vmap-row">' + truncMap(d.entries, (e) =>
    '<div class="vpair' + (d.hot === e.k ? ' hot' : '') + '">' +
      '<span class="vcell vk">' + esc(e.k) + '</span><span class="varr">→</span>' +
      '<span class="vcell vv">' + esc(e.v) + '</span></div>',
    d
  ) + '</div></div>';
}

export function vizSet(d) {
  if (!d || !d.items || !d.items.length) return null;
  return '<div class="viz"><div class="viz-row">' + truncMap(d.items, (x) =>
    '<div class="vcell' + (d.hot === x ? ' hot' : '') + '">' + esc(x) + '</div>',
    d
  ) + '</div></div>';
}

export function vizStack(d) {
  if (!d || !d.items || !d.items.length) return null;
  const all = d.items, MAX = 6;
  const total = (typeof d.total === 'number' && d.total >= all.length) ? d.total : all.length;
  const baseIdx = typeof d.baseIdx === 'number' ? d.baseIdx : Math.max(0, total - all.length);
  const sliceStart = Math.max(0, all.length - MAX);
  const shown = all.slice(sliceStart);
  const hiddenCount = Math.max(0, total - shown.length);
  const rows = shown.map((x, k) => {
    const abs = baseIdx + sliceStart + k;
    const isTop = abs === total - 1;
    return '<div class="vcell' + (d.hot === abs ? ' hot' : (isTop ? ' mark' : '')) + '">' +
      '<span>' + esc(x) + '</span>' + (isTop ? '<span class="vtop">top</span>' : '') + '</div>';
  }).join('');
  return '<div class="viz"><div class="vcol">' + rows + '</div>' +
    (hiddenCount ? '<div class="vmore">…+' + hiddenCount + '</div>' : '') + '</div>';
}

export function vizString(d) {
  if (!d || !d.items || !d.items.length) return null;
  const win = d.win;
  if (Array.isArray(d.windowed) && d.windowed.length) {
    const cells = truncMap(d.items, (ch, k) => {
      let cls = 'ch';
      if (win && k >= win[0] && k <= win[1]) cls += ' win';
      if (d.hot === k) cls += ' hot';
      else if (d.mark === k) cls += ' mark';
      return '<span class="' + cls + '" title="[' + k + ']">' + esc(ch) + '</span>';
    }, d);
    return '<div class="viz"><div class="vstr">' + cells + '</div></div>';
  }
  return '<div class="viz"><div class="vstr">' + d.items.map((ch, k) => {
    let cls = 'ch';
    if (win && k >= win[0] && k <= win[1]) cls += ' win';
    if (d.hot === k) cls += ' hot';
    else if (d.mark === k) cls += ' mark';
    return '<span class="' + cls + '">' + esc(ch) + '</span>';
  }).join('') + '</div></div>';
}

export function vizGrid(d) {
  if (!d || !d.cells || !d.cells.length) return null;
  const depSet = new Set((d.deps || []).map(p => p[0] + ',' + p[1]));

  // Sliding viewport mode for large 2D grids (> 10 rows or > 10 cols)
  if (Array.isArray(d.rowIndices) && Array.isArray(d.colIndices) && Array.isArray(d.viewCells)) {
    const rIdxs = d.rowIndices;
    const cIdxs = d.colIndices;
    const colTracks = [];
    for (let ci = 0; ci < cIdxs.length; ci++) {
      if (ci > 0 && cIdxs[ci] > cIdxs[ci - 1] + 1) colTracks.push({ gap: true });
      colTracks.push({ gap: false, c: cIdxs[ci], ci });
    }
    const gridCols = colTracks.length + 1; // +1 for row header column
    let html = '<div class="ghead">r\\c</div>';
    for (const ct of colTracks) {
      if (ct.gap) {
        html += '<div class="ggap">⋯</div>';
      } else {
        const isFocusCol = d.mark && d.mark[1] === ct.c;
        html += '<div class="ghead' + (isFocusCol ? ' focus' : '') + '">' + ct.c + '</div>';
      }
    }
    for (let ri = 0; ri < rIdxs.length; ri++) {
      const realR = rIdxs[ri];
      if (ri > 0 && realR > rIdxs[ri - 1] + 1) {
        html += '<div class="ggap">⋮</div>';
        for (let gi = 0; gi < colTracks.length; gi++) {
          html += '<div class="ggap">' + (colTracks[gi].gap ? '⋱' : '⋮') + '</div>';
        }
      }
      const isFocusRow = d.mark && d.mark[0] === realR;
      html += '<div class="ghead' + (isFocusRow ? ' focus' : '') + '">' + realR + '</div>';
      const rowVals = d.viewCells[ri] || [];
      for (const ct of colTracks) {
        if (ct.gap) {
          html += '<div class="ggap">⋯</div>';
        } else {
          const realC = ct.c;
          let cls = 'gcell';
          if (d.mark && d.mark[0] === realR && d.mark[1] === realC) cls += ' hot';
          else if (depSet.has(realR + ',' + realC)) cls += ' dep';
          const val = rowVals[ct.ci];
          html += '<div class="' + cls + '" title="[' + realR + '][' + realC + ']">' + (val === undefined || val === null ? '·' : esc(val)) + '</div>';
        }
      }
    }
    return '<div class="viz"><div class="vgrid-wrap"><div class="vgrid" style="grid-template-columns:repeat(' + gridCols + ',auto)">' + html + '</div></div></div>';
  }

  const cols = d.cells[0].length;
  let html = '';
  for (let r = 0; r < d.cells.length; r++) {
    for (let c = 0; c < cols; c++) {
      let cls = 'gcell';
      if (d.mark && d.mark[0] === r && d.mark[1] === c) cls += ' hot';
      else if (depSet.has(r + ',' + c)) cls += ' dep';
      const val = d.cells[r][c];
      html += '<div class="' + cls + '">' + (val === undefined || val === null ? '·' : esc(val)) + '</div>';
    }
  }
  return '<div class="viz"><div class="vgrid" style="grid-template-columns:repeat(' + cols + ',auto)">' + html + '</div></div>';
}

export function vizList(d) {
  if (!d || !d.items || !d.items.length) return null;
  const total = (typeof d.total === 'number' && d.total > 0) ? d.total : d.items.length;
  const ptrs = d.pointers;
  return '<div class="viz"><div class="viz-row">' + truncMap(d.items, (val, k) => {
    const pTag = (ptrs && ptrs[k] && ptrs[k].length)
      ? '<span class="sub-tag ptr-tag">' + esc(ptrs[k].slice(0, 2).join(',')) + '</span>'
      : '';
    return '<div class="vpair"><span class="vcell' + (d.hot === k ? ' hot' : '') + '">' + pTag + esc(val) + '</span>' +
      (k < total - 1 ? '<span class="varr">→</span>' : '<span class="varr">→</span><span class="vempty">null</span>') +
      '</div>';
  }, d) + '</div></div>';
}

export function vizTree(d) {
  if (!d || !d.nodes || !d.nodes.length) return null;
  const nodes = d.nodes;
  const root = d.root ?? 0;
  const coords = new Map();
  let maxDepth = 0;
  function layout(idx, depth, xMin, xMax) {
    if (idx == null || !nodes[idx] || coords.has(idx) || depth > 5) return;
    maxDepth = Math.max(maxDepth, depth);
    const x = (xMin + xMax) / 2;
    const y = 20 + depth * 36;
    coords.set(idx, { x, y, val: nodes[idx].val, left: nodes[idx].left, right: nodes[idx].right });
    layout(nodes[idx].left, depth + 1, xMin, x);
    layout(nodes[idx].right, depth + 1, x, xMax);
  }
  layout(root, 0, 14, 226);
  const h = Math.max(60, (maxDepth + 1) * 36 + 10);
  let edgesSvg = '', nodesSvg = '';
  coords.forEach((info, idx) => {
    [info.left, info.right].forEach(ch => {
      if (ch != null && coords.has(ch)) {
        const c = coords.get(ch);
        edgesSvg += `<line class="vsvg-edge" x1="${info.x}" y1="${info.y}" x2="${c.x}" y2="${c.y}"/>`;
      }
    });
    const cls = d.hot === idx ? 'vsvg-node hot' : (idx === root ? 'vsvg-node mark' : 'vsvg-node');
    nodesSvg += `<g><circle class="${cls}" cx="${info.x}" cy="${info.y}" r="12"/><text class="vsvg-txt" x="${info.x}" y="${info.y}">${esc(info.val)}</text></g>`;
  });
  return `<div class="viz"><div class="vsvg-wrap"><svg viewBox="0 0 240 ${h}" width="240" height="${h}">${edgesSvg}${nodesSvg}</svg></div></div>`;
}

export function vizGraph(d) {
  if (!d || !d.nodes || !d.nodes.length) return null;
  const byId = new Map();
  d.nodes.forEach((n, idx) => byId.set(n.id ?? idx, n));
  let edgesSvg = '', nodesSvg = '';
  (d.edges || []).forEach(e => {
    const a = byId.get(e[0]), b = byId.get(e[1]);
    if (a && b) {
      edgesSvg += `<line class="vsvg-edge" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`;
    }
  });
  d.nodes.forEach((n, idx) => {
    const id = n.id ?? idx;
    const cls = d.hot === id ? 'vsvg-node hot' : 'vsvg-node';
    nodesSvg += `<g><circle class="${cls}" cx="${n.x}" cy="${n.y}" r="13"/><text class="vsvg-txt" x="${n.x}" y="${n.y}">${esc(n.label ?? id)}</text></g>`;
  });
  return `<div class="viz"><div class="vsvg-wrap"><svg viewBox="0 0 180 136" width="180" height="136">${edgesSvg}${nodesSvg}</svg></div></div>`;
}

export function vizInterface(d) {
  if (!d) return null;
  const fields = d.fields || (d.entries ? d.entries.map(e => ({ k: e.k, v: e.v, declaredType: typeof e.v })) : []);
  if (!fields.length && !d.isClass) return null;
  const ifaceTitle = d.interfaceName && d.interfaceName !== 'object' ? d.interfaceName : 'Object';
  const kwTxt = d.isClass ? 'class' : 'interface';
  const badgeTxt = d.isSchema
    ? (d.instanceName ? `schema · 绑定 ${d.instanceName}` : 'schema')
    : 'instance';
  const rows = fields.length
    ? fields.slice(0, 12).map(f => {
        const isHot = d.hot === f.k;
        const hasVal = f.v !== undefined;
        const isStr = typeof f.v === 'string';
        const valDisplay = hasVal
          ? (isStr ? JSON.stringify(f.v) : (f.v !== null && typeof f.v === 'object' ? safeJSONStringify(f.v) : String(f.v)))
          : '未实例化';
        return '<div class="viface-row' + (isHot ? ' hot' : '') + '">' +
          '<span class="viface-k">' + esc(f.k) + (f.optional ? '<span class="viface-opt">?</span>' : '') + '</span>' +
          (f.declaredType ? '<span class="viface-t">: ' + esc(f.declaredType) + '</span>' : '') +
          (hasVal
            ? '<span class="viface-eq">=</span><span class="viface-v' + (isStr ? ' str' : '') + '">' + esc(valDisplay) + '</span>'
            : '<span class="viface-v schema-only">' + esc(valDisplay) + '</span>') +
          '</div>';
      }).join('')
    : '<div class="viface-row"><span class="viface-v schema-only">（无实例属性）</span></div>';
  return '<div class="viz"><div class="viface">' +
    '<div class="viface-head"><span class="viface-kw">' + kwTxt + '</span><span class="viface-title">' + esc(ifaceTitle) + '</span><span class="viface-badge">' + esc(badgeTxt) + '</span></div>' +
    '<div class="viface-body">' + rows + '</div>' +
    '</div></div>';
}

export function vizEventLoop(d) {
  if (!d) return null;
  const phaseMap = {
    sync: { label: 'Sync · 同步栈执行', cls: 'sync' },
    await_suspend: { label: 'Await · 协程挂起', cls: 'suspend' },
    await_resume: { label: 'Await · 协程恢复', cls: 'resume' },
    microtask: { label: 'Microtask · 微任务出队', cls: 'micro' },
    macrotask: { label: 'Macrotask · 宏任务触发', cls: 'macro' },
  };
  const ph = phaseMap[d.phase] || { label: d.phase || 'Event Loop', cls: 'sync' };
  const nowMs = typeof d.now === 'number' ? d.now : 0;

  const coroutines = Array.isArray(d.coroutines) ? d.coroutines : [];
  const coroHtml = coroutines.length
    ? coroutines.map(c => {
        const stCls = c.status === 'running' ? 'running' : (c.status === 'suspended' ? 'suspended' : 'completed');
        const stLabel = c.status === 'running' ? '● 执行中' : (c.status === 'suspended' ? `⏸ 挂起 @L${c.line}` : '✓ 完成');
        const detail = c.status === 'suspended' && c.awaitingExpr
          ? `<span class="vel-coro-expr">await ${esc(c.awaitingExpr)}</span>`
          : (c.status === 'completed' && c.returnVal !== undefined ? `<span class="vel-coro-expr">⇒ ${esc(c.returnVal)}</span>` : '');
        return `<div class="vel-chip coro-${stCls}">` +
          `<span class="vel-chip-title">async ${esc(c.name)}()</span>` +
          `<span class="vel-chip-status">${esc(stLabel)}</span>` +
          detail +
          `</div>`;
      }).join('')
    : '<span class="vel-empty">无活跃协程</span>';

  const microtasks = Array.isArray(d.microtasks) ? d.microtasks : [];
  const microHtml = microtasks.length
    ? microtasks.map((m, idx) =>
        `<div class="vel-qitem micro${idx === 0 ? ' head' : ''}">` +
        `<span class="vel-qidx">#${idx + 1}</span>` +
        `<span class="vel-qlabel">${esc(m.label)}</span>` +
        (m.line > 0 ? `<span class="vel-qmeta">@L${m.line}</span>` : '') +
        `</div>`
      ).join('')
    : '<span class="vel-empty">队列为空 (0)</span>';

  const macrotasks = Array.isArray(d.macrotasks) ? d.macrotasks : [];
  const macroHtml = macrotasks.length
    ? macrotasks.map((t, idx) =>
        `<div class="vel-qitem macro${idx === 0 ? ' head' : ''}">` +
        `<span class="vel-qidx">t=${t.due}ms</span>` +
        `<span class="vel-qlabel">${esc(t.label)}</span>` +
        `<span class="vel-qmeta">+${t.delay}ms</span>` +
        `</div>`
      ).join('')
    : '<span class="vel-empty">无待触发定时器 (0)</span>';

  const promises = Array.isArray(d.promises) ? d.promises : [];
  const promHtml = promises.length
    ? promises.map(p => {
        const st = p.state || 'pending';
        const icon = st === 'fulfilled' ? '✓' : (st === 'rejected' ? '✗' : '⏳');
        const valPart = st === 'pending'
          ? (p.reactions > 0 ? `<span class="vel-pval dim">${p.reactions} waiter${p.reactions > 1 ? 's' : ''}</span>` : '<span class="vel-pval dim">pending</span>')
          : `<span class="vel-pval">${esc(p.value)}</span>`;
        return `<div class="vel-pcard ${esc(st)}">` +
          `<span class="vel-phead"><span class="vel-picon">${icon}</span><span class="vel-pname">P#${p.id} · ${esc(p.label)}</span></span>` +
          valPart +
          `</div>`;
      }).join('')
    : '<span class="vel-empty">暂无 Promise 实例</span>';

  return '<div class="viz"><div class="veventloop">' +
    '<div class="vel-header">' +
      `<span class="vel-phase ${ph.cls}">${esc(ph.label)}</span>` +
      (d.activeTask ? `<span class="vel-active">${esc(d.activeTask)}</span>` : '') +
      `<span class="vel-clock">⏱ 虚拟时钟 ${nowMs}ms</span>` +
    '</div>' +
    '<div class="vel-grid">' +
      '<div class="vel-lane"><div class="vel-lane-title">Async 协程状态</div><div class="vel-lane-body">' + coroHtml + '</div></div>' +
      '<div class="vel-lane"><div class="vel-lane-title">Microtask 微任务队列 (FIFO)</div><div class="vel-lane-body">' + microHtml + '</div></div>' +
      '<div class="vel-lane"><div class="vel-lane-title">Macrotask 宏任务 / 定时器</div><div class="vel-lane-body">' + macroHtml + '</div></div>' +
      '<div class="vel-lane"><div class="vel-lane-title">Promise 状态表</div><div class="vel-lane-body vel-pgrid">' + promHtml + '</div></div>' +
    '</div>' +
    '</div></div>';
}

export const VIZ = {
  array: vizArray, map: vizMap, set: vizSet, stack: vizStack,
  string: vizString, grid: vizGrid, list: vizList,
  heap: vizHeap, queue: vizQueue, tree: vizTree, graph: vizGraph, uf: vizUF,
  interface: vizInterface, object: vizInterface,
  eventloop: vizEventLoop,
};

export function pressure(d) {
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
export function decideSpan(id, p) {
  const curSpan = layoutSpan[id] || 1;
  if (curSpan < 2 && p >= SPAN_UP) layoutSpan[id] = 2;
  else if (curSpan > 1 && p <= SPAN_DOWN) layoutSpan[id] = 1;
  return layoutSpan[id];
}

export function allocateSlotSpans(vars, ds) {
  const meta = vars.map((s, idx) => {
    const d = ds[s.id];
    const kind = (d && d.kind) || s.kind;
    const p = pressure(d);
    const span = decideSpan(s.id, p);
    return { s, d, kind, p, span, idx };
  });

  // Ensure 1-column cards always form complete 2-column pairs so there are no half-empty rows
  const oneColItems = meta.filter(m => m.span === 1);
  if (oneColItems.length % 2 === 1) {
    let promote = oneColItems[0];
    for (let i = 1; i < oneColItems.length; i++) {
      if (oneColItems[i].p >= promote.p) {
        promote = oneColItems[i];
      }
    }
    promote.span = 2;
  }

  return meta;
}

let _DISCOVER_CACHE: any = { traceRef: null, scannedSteps: 0, map: new Map(), list: [] };

export function discoverVars() {
  const steps = (TRACE && TRACE.steps) || [];
  if (_DISCOVER_CACHE.traceRef !== TRACE || steps.length < _DISCOVER_CACHE.scannedSteps) {
    _DISCOVER_CACHE = { traceRef: TRACE, scannedSteps: 0, map: new Map(), list: [] };
  }
  if (_DISCOVER_CACHE.scannedSteps < steps.length) {
    let changed = false;
    for (let i = _DISCOVER_CACHE.scannedSteps; i < steps.length; i++) {
      const st = steps[i];
      const ds = (st && st.ds) || {};
      const keys = Object.keys(ds);
      for (let k = 0; k < keys.length; k++) {
        const name = keys[k];
        if (!_DISCOVER_CACHE.map.has(name)) {
          _DISCOVER_CACHE.map.set(name, { id: name, name, kind: ds[name].kind || name });
          changed = true;
        }
      }
    }
    _DISCOVER_CACHE.scannedSteps = steps.length;
    if (changed) _DISCOVER_CACHE.list = [..._DISCOVER_CACHE.map.values()];
  }
  return _DISCOVER_CACHE.list;
}

export function renderPicker() {
  const vars = discoverVars();
  if (!vars.length) {
    pickEl.innerHTML = '<span class="vempty">无结构变量</span>';
    renderSlots();
    return;
  }
  pickEl.innerHTML = vars.map(s =>
    '<div class="chip-pick' + (watched.has(s.id) ? ' on' : '') + '" data-id="' + esc(s.id) + '">' + esc(s.name) + '</div>'
  ).join('');
  renderSlots();
}

export function renderSlots() {
  const st: any = TRACE.steps[cur] || {};
  const activeFrame = TRACE.steps[cur] ? getActiveFrame(st) : null;
  const ds = Object.assign({}, (activeFrame && activeFrame.ds) || st.ds || {});
  if (st.ds && st.ds.eventLoop && !ds.eventLoop) ds.eventLoop = st.ds.eventLoop;
  const vars = discoverVars().filter(s => watched.has(s.id) && ds[s.id] !== undefined);
  if (slotsEl && slotsEl.classList && slotsEl.classList.toggle) {
    slotsEl.classList.toggle('single-col', slotsEl.clientWidth > 0 && slotsEl.clientWidth < 420);
  }
  if (!vars.length) {
    slotsEl.innerHTML = '<div class="slot" style="grid-column:1/-1"><div class="vempty">' +
      (TRACE.steps.length ? '点选变量以关注（或本步暂无结构）' : '生成轨迹后显示结构可视化') +
      '</div></div>';
    return;
  }
  const allocated = allocateSlotSpans(vars, ds);
  slotsEl.innerHTML = allocated.map(({ s, d, kind, span }) => {
    const fn = VIZ[kind];
    const body = d ? (fn ? (fn(d) || '<div class="vempty">empty</div>') : '<div class="vempty">…</div>') : '<div class="vempty">empty</div>';
    const winTag = d && d.win ? `<span class="win-tag">[${d.win[0]}..${d.win[1]}]</span>` : '';
    let sizeTag = '';
    if (d) {
      if (kind === 'grid' && ((d.totalRows || 0) > 10 || (d.totalCols || 0) > 10)) {
        sizeTag = `<span class="size-tag">${d.totalRows}×${d.totalCols}</span>`;
      } else if (typeof d.total === 'number' && d.total > 20) {
        sizeTag = `<span class="size-tag">共 ${d.total} 项</span>`;
      }
    }
    const isHotSlot = d && (d.hot !== undefined || d.mark != null);
    const kindPrefix = (d && d.isClass) ? 'class' : 'interface';
    const kindBadge = (kind === 'interface' && d && d.interfaceName && d.interfaceName !== 'object' && !d.isSchema)
      ? `${kindPrefix} · ${d.interfaceName}`
      : (kind === 'interface' && d && d.isClass ? 'class' : kind);
    return '<div class="slot' + (span === 2 ? ' span-2' : '') + (isHotSlot ? ' pulse' : '') + '" data-var="' + esc(s.name) + '">' +
      '<div class="name"><span>' + esc(s.name) + '</span><span class="kind">' + esc(kindBadge) + '</span>' + sizeTag + winTag + '</div>' +
      body + '</div>';
  }).join('');
}

export function updateControlButtons() {
  const prevBtn = $('prev');
  const nextBtn = $('next');
  const ckptBtn = $('nextCheckpoint');
  const autoBtn = $('auto');
  const atEnd = Boolean(TRACE.steps.length > 0 && cur >= TRACE.steps.length - 1 && DEBUG_SESSION.finished);
  if (prevBtn) prevBtn.disabled = !TRACE.steps.length || cur <= 0;
  if (nextBtn) nextBtn.disabled = atEnd;
  if (ckptBtn) ckptBtn.disabled = atEnd;
  if (autoBtn) autoBtn.disabled = atEnd;
}

export function renderStatic(i, withAnim = false) {
  hideHoverTip();
  const st = TRACE.steps[i];
  const prevSt = i > 0 ? TRACE.steps[i - 1] : null;
  if (!st) {
    renderCallStack(null);
    varsEl.innerHTML = '';
    consoleEl.innerHTML = '<div><span class="p">›</span><span class="dim">开启 Debug 模式后当场计算并显示每步执行详情</span></div>';
    cntEl.textContent = '未在调试';
    cntEl.className = '';
    updateControlButtons();
    renderSlots();
    updateEditorChrome();
    return;
  }

  renderCallStack(st);
  const activeFrame = getActiveFrame(st);
  const v = (activeFrame && activeFrame.v) || st.v || {};
  const prevV = (prevSt && prevSt.v) || {};
  const primEntries = Object.keys(v).map(k => {
    const val = v[k];
    if (val !== null && typeof val === 'object') return '';
    const changed = activeFrame.isTop && prevSt && prevV[k] !== val;
    return '<div class="pair' + (changed ? ' changed' : '') + '" data-var="' + esc(k) + '"><span class="k">' + esc(k) + '</span><span class="v">' + esc(val) + '</span></div>';
  }).join('');
  if (primEntries) {
    varsEl.innerHTML = primEntries;
  } else if (activeFrame && activeFrame.fn === 'global') {
    varsEl.innerHTML = '<div class="pair"><span class="k">scope</span><span class="v">global</span></div>' +
      (DEBUG_SESSION.callExpr && DEBUG_SESSION.callExpr !== 'undefined'
        ? '<div class="pair"><span class="k">entry</span><span class="v">' + esc(DEBUG_SESSION.callExpr) + '</span></div>'
        : '');
  } else {
    varsEl.innerHTML = '<div class="vempty">（本帧无原始类型局部变量）</div>';
  }

  let animDesc = '';
  if (st.error) {
    animDesc = `<div class="anim-desc" style="color:var(--red)">runtime error · 已停止在报错行 (第 ${st.line} 行)</div>`;
  } else if (st.anim) {
    if (st.anim.type === 'assign') animDesc = `<div class="anim-desc">assign · ${esc(st.anim.from)} → ${esc(st.anim.to)} = ${esc(st.anim.val)}</div>`;
    else if (st.anim.type === 'compare') animDesc = `<div class="anim-desc">compare · ${esc(st.anim.lhs)} ${esc(st.anim.op)} ${esc(st.anim.rhs)} ⇒ ${esc(st.anim.result)}</div>`;
    else if (st.anim.type === 'call') animDesc = `<div class="anim-desc">call · ${esc(st.anim.fn)}(${esc((st.anim.argVals || []).join(', '))})</div>`;
    else if (st.anim.type === 'checkpoint') animDesc = `<div class="anim-desc" style="color:var(--cyan)">checkpoint · 检查点已命中 (${esc((st.anim.argVals || []).join(', ') || '无参数')})</div>`;
  }
  consoleEl.innerHTML = '<div><span class="p">›</span>' + esc(st.note || '') + '</div>' + animDesc;

  if (st.error) {
    cntEl.textContent = '✗ 运行时报错';
    cntEl.className = 'err';
  } else if (st.isCheckpoint) {
    cntEl.textContent = '◉ 命中检查点';
    cntEl.className = 'ckpt';
  } else if (DEBUG_SESSION.finished && i === TRACE.steps.length - 1) {
    cntEl.textContent = '✓ 执行完毕';
    cntEl.className = 'done';
  } else {
    cntEl.textContent = '● 调试运行中';
    cntEl.className = 'running';
  }

  updateControlButtons();
  updateEditorChrome();
  if (typeof VIEW_MODE !== 'undefined' && VIEW_MODE === 'notebook' && typeof (globalThis as any).renderNotebookUI === 'function') {
    (globalThis as any).renderNotebookUI(false);
  } else {
    scrollCodeTo(activeFrame ? activeFrame.line : st.line);
  }
  renderSlots();

  if (withAnim && (typeof VIEW_MODE === 'undefined' || VIEW_MODE !== 'notebook')) {
    playStepAnimation(st);
  }
}


export const renderMemory = renderSlots;
export const renderAsyncQueues = vizEventLoop;
export function drawArrows(): void {}
export function scheduleArrowRedraw(): void {}
