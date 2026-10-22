/* ================================================================
   TypeScript Playground — debug pane renderers
   Part 8/10 · loaded in order from index.html (classic script;
   shares the global lexical scope with the other parts).
   ================================================================ */

/* ================================================================
   6) Debug pane renderers — all 12 kinds
   ================================================================ */
function truncMap(arr, render, d) {
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

function vizArray(d) {
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

function vizQueue(d) {
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

function vizHeap(d) {
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

function vizUF(d) {
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

function vizMap(d) {
  if (!d || !d.entries || !d.entries.length) return null;
  return '<div class="viz"><div class="viz-row vmap-row">' + truncMap(d.entries, (e) =>
    '<div class="vpair' + (d.hot === e.k ? ' hot' : '') + '">' +
      '<span class="vcell vk">' + esc(e.k) + '</span><span class="varr">→</span>' +
      '<span class="vcell vv">' + esc(e.v) + '</span></div>',
    d
  ) + '</div></div>';
}

function vizSet(d) {
  if (!d || !d.items || !d.items.length) return null;
  return '<div class="viz"><div class="viz-row">' + truncMap(d.items, (x) =>
    '<div class="vcell' + (d.hot === x ? ' hot' : '') + '">' + esc(x) + '</div>',
    d
  ) + '</div></div>';
}

function vizStack(d) {
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

function vizString(d) {
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

function vizGrid(d) {
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

function vizList(d) {
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

function vizTree(d) {
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

function vizGraph(d) {
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

function vizInterface(d) {
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

const VIZ = {
  array: vizArray, map: vizMap, set: vizSet, stack: vizStack,
  string: vizString, grid: vizGrid, list: vizList,
  heap: vizHeap, queue: vizQueue, tree: vizTree, graph: vizGraph, uf: vizUF,
  interface: vizInterface, object: vizInterface,
};

function pressure(d) {
  if (!d) return 0;
  let n = 0;
  if (typeof d.total === 'number') n = d.total;
  else if (d.items) n = d.items.length;
  else if (d.fields) n = d.fields.length;
  else if (d.entries) n = d.entries.length;
  else if (d.nodes) n = d.nodes.length;
  else if (d.cells) n = (d.totalRows || d.cells.length) * (d.totalCols || (d.cells[0] ? d.cells[0].length : 1));
  switch (d.kind) {
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
function decideSpan(id, p) {
  const curSpan = layoutSpan[id] || 1;
  if (curSpan < 2 && p >= SPAN_UP) layoutSpan[id] = 2;
  else if (curSpan > 1 && p <= SPAN_DOWN) layoutSpan[id] = 1;
  return layoutSpan[id];
}

function allocateSlotSpans(vars, ds) {
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

let _DISCOVER_CACHE = { traceRef: null, scannedSteps: 0, map: new Map(), list: [] };

function discoverVars() {
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

function renderPicker() {
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

function renderSlots() {
  const st = TRACE.steps[cur] || {};
  const activeFrame = TRACE.steps[cur] ? getActiveFrame(st) : null;
  const ds = (activeFrame && activeFrame.ds) || st.ds || {};
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

function updateControlButtons() {
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

function renderStatic(i, withAnim = false) {
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
  scrollCodeTo(activeFrame ? activeFrame.line : st.line);
  renderSlots();

  if (withAnim) {
    playStepAnimation(st);
  }
}
