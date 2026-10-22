/* ================================================================
   TypeScript Playground — snapshot / classify
   Part 4/10 · loaded in order from index.html (classic script;
   shares the global lexical scope with the other parts).
   ================================================================ */

/* ================================================================
   3) Snapshot / classify — all 12 kinds + window [l, r] + anim/note
   ================================================================ */
function isMapLike(v) {
  return Object.prototype.toString.call(v) === '[object Map]';
}
function isSetLike(v) {
  return Object.prototype.toString.call(v) === '[object Set]';
}

function defineHidden(obj, key, val) {
  if (!obj || typeof obj !== 'object') return;
  try {
    Object.defineProperty(obj, key, {
      value: val, enumerable: false, configurable: true, writable: true,
    });
  } catch (_) {}
}

function cloneDeepBounded(val, depth = 0) {
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

function normalizeTree(value) {
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

function normalizeList(value) {
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

function normalizeGraph(value) {
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

function snapshot(kind, value, extra) {
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

/* Metadata extracted from TypeScript source for interface & variable type visualization */
let CURRENT_TS_META = {
  interfaces: new Map(), // ifaceName -> { name, line, isClass, fields: [{ k, declaredType, optional }] }
  varTypes: new Map(),   // varName -> declaredType
};

function inferRuntimeTsType(val) {
  if (val === null) return 'null';
  if (Array.isArray(val)) {
    if (!val.length) return 'any[]';
    return inferRuntimeTsType(val[0]) + '[]';
  }
  if (isMapLike(val)) return 'Map';
  if (isSetLike(val)) return 'Set';
  return typeof val;
}

function extractTsInterfaceMetadata(src) {
  const interfaces = new Map();
  const varTypes = new Map();
  if (!src || typeof src !== 'string') {
    CURRENT_TS_META = { interfaces, varTypes };
    return CURRENT_TS_META;
  }

  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  let activeIface = null;
  let activeIfaceLine = 1;
  let activeIsClass = false;
  let activeBody = '';
  let depth = 0;

  function parseFieldsFromBody(bodyStr, isClass = false) {
    const inner = bodyStr.trim().replace(/^\{/, '').replace(/\}$/, '').trim();
    const fields = [];
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
      if (m && !seen.has(m[1])) {
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
        if (initOnly && !seen.has(initOnly[1])) {
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
      if (ctorM && ctorM[1].trim()) {
        splitTopLevel(ctorM[1]).forEach(rawP => {
          const p = rawP.trim();
          const pm = p.match(/^(?:(?:public|private|protected|readonly)\s+)+([A-Za-z_$][\w$]*)(\?)?(?:\s*:\s*([^=]+?))?(?:\s*=\s*([\s\S]+))?$/);
          if (pm && !seen.has(pm[1])) {
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
        if (!seen.has(tm[1])) {
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
    if (ifaceM) {
      const isClass = ifaceM[1] === 'class';
      const name = ifaceM[2];
      const rest = '{' + ifaceM[3];
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
    if (typeObjM) {
      interfaces.set(typeObjM[1], {
        name: typeObjM[1],
        line: i + 1,
        isClass: false,
        fields: parseFieldsFromBody(typeObjM[2], false),
      });
      continue;
    }

    const fnM = trimmed.match(/^(?:export\s+)?(?:default\s+)?function\s+[A-Za-z_$][\w$]*\s*\(([^)]*)\)/);
    if (fnM && fnM[1].trim()) {
      splitTopLevel(fnM[1]).forEach(p => {
        const pm = p.trim().match(/^([A-Za-z_$][\w$]*)\??\s*:\s*(.+)$/);
        if (pm) varTypes.set(pm[1], pm[2].trim());
      });
    }

    const varM = trimmed.match(/^(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*:\s*([^=]+?)(?:\s*=|$)/);
    if (varM) {
      varTypes.set(varM[1], varM[2].trim());
    } else {
      const varNewM = trimmed.match(/^(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*new\s+([A-Za-z_$][\w$]*)\s*(?:<[^>]*>)?\s*\(/);
      if (varNewM && !/^(Map|Set|Array)$/.test(varNewM[2])) {
        varTypes.set(varNewM[1], varNewM[2]);
      }
    }
  }

  CURRENT_TS_META = { interfaces, varTypes };
  return CURRENT_TS_META;
}

function matchInterfaceForObject(name, value) {
  const { interfaces, varTypes } = CURRENT_TS_META;
  if (name && varTypes.has(name)) {
    const cleanT = varTypes.get(name).replace(/\[\]$/, '').trim();
    if (interfaces.has(cleanT)) return interfaces.get(cleanT);
  }
  if (value && typeof value === 'object' && value.__py_cls__ && interfaces.has(value.__py_cls__)) {
    return interfaces.get(value.__py_cls__);
  }
  if (!value || typeof value !== 'object') return null;
  const valKeys = Object.keys(value);
  if (!valKeys.length) return null;
  let best = null;
  let bestScore = 0;
  interfaces.forEach(iface => {
    if (!iface.fields.length) return;
    const overlap = iface.fields.filter(f => f.k in value).length;
    if (overlap > 0 && overlap >= bestScore) {
      const allKnown = valKeys.every(k => iface.fields.some(f => f.k === k));
      const score = overlap * 2 + (allKnown ? 1 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = iface;
      }
    }
  });
  return best;
}

function classifyValue(name, value) {
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

function populateInterfaceSchemas(ds) {
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

function detectWindowRange(v) {
  if (!v) return null;
  const pairs = [['l', 'r'], ['left', 'right'], ['lo', 'hi'], ['start', 'end']];
  for (const [lk, rk] of pairs) {
    if (typeof v[lk] === 'number' && typeof v[rk] === 'number' && v[lk] >= 0 && v[rk] >= v[lk]) {
      return [v[lk], v[rk]];
    }
  }
  return null;
}

const POINTER_VAR_NAMES = [
  'mid', 'm', 'i', 'j', 'k', 'idx', 'p', 'q', 'cur', 'curr', 'slow', 'fast', 'pivot',
  'l', 'r', 'left', 'right', 'lo', 'hi', 'low', 'high', 'start', 'end',
];

function build1DFocalSlice(total, getAt, focalCenters) {
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

function selectGridAxisIndices(total, focusIdx, maxCount = 8) {
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

function enrichFromNote(ds, v, note) {
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

function formatShortVal(val) {
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

function safeEvalExpr(expr, v) {
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

function splitLogicalClauses(condExpr) {
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

function deriveAnimAndNote(rawLine, v, nextV) {
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
