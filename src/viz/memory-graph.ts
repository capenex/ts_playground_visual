/* ================================================================
   Call Stack & Data Structure Card Renderers (src/viz/memory-graph.ts)
   ================================================================ */
import { formatFunctionTypeSignature } from "../compiler/tc-types";
import { appState, esc, registerUiHooks, uiHooks } from "../state";
import { Frame, StepSnapshot } from "../types";
import { $, callStackBarEl, callStackHintEl, cntEl, consoleEl, pickEl, slotsEl, varsEl } from "../ui/dom";
import { isRecord, safeJSONStringify } from "../utils/format";
import { hideHoverTip, updateEditorChrome, scrollCodeTo } from "./highlight";
import { playStepAnimation } from "./ast-view";
import { allocateSlotSpans, discoverVars, DiscoveredVar, getActiveFrame, VIZ } from "./memory-normalizers";

export * from "./memory-normalizers";

export function selectStackFrame(frameIdx: number | string) {
  const st = appState.TRACE.steps[appState.cur];
  if (!st || !Array.isArray(st.callStack) || !st.callStack.length) return;
  const topIdx = st.callStack.length - 1;
  const clamped = Math.max(0, Math.min(topIdx, Number(frameIdx) || 0));
  appState.SELECTED_FRAME_IDX = clamped === topIdx ? null : clamped;
  renderStatic(appState.cur, false);
}

export function renderCallStack(st: StepSnapshot | Frame | null | undefined) {
  if (!callStackBarEl) return;
  if (!st) {
    callStackBarEl.innerHTML = '<span class="cs-empty">未在调试</span>';
    if (callStackHintEl) callStackHintEl.textContent = '点击栈帧可切换作用域';
    return;
  }
  const stack: Frame[] = (Array.isArray(st.callStack) && st.callStack.length)
    ? st.callStack
    : [{ file: st.file, fn: 'global', label: 'global', line: st.line, v: st.v || {}, ds: st.ds || {} }];
  const active = getActiveFrame(st);
  const activeIdx = active ? active.idx : 0;
  const activeIsTop = active ? active.isTop : true;
  const activeLabel = active ? active.label : 'global';
  const isMultiModule = Boolean(
    appState.TRACE.moduleSources && Object.keys(appState.TRACE.moduleSources).length > 1
  );
  callStackBarEl.innerHTML = stack.map((f: Frame, fIdx: number) => {
    const isSel = fIdx === activeIdx;
    const isTop = fIdx === stack.length - 1;
    const cls = 'cs-crumb' + (isSel ? ' active' : '') + (isTop ? ' is-top' : '') + (!isTop && isSel ? ' inspecting' : '');
    const sep = fIdx > 0 ? '<span class="cs-sep">▸</span>' : '';
    const shortFile = f.file ? (f.file.split('/').pop() || f.file) : '';
    const displayLabel = isMultiModule && shortFile && !String(f.label || '').startsWith('<module:')
      ? `[${shortFile}] ${f.label}`
      : String(f.label || 'global');
    const titlePrefix = f.file ? `${f.file} · ` : '';
    return sep + `<button type="button" class="${cls}" data-frame-idx="${fIdx}" title="切换到栈帧 ${esc(titlePrefix + String(f.label || 'global'))} (第 ${f.line || st.line} 行)">${esc(displayLabel)}</button>`;
  }).join('');
  if (callStackHintEl) {
    const activeFileTag = isMultiModule && active && active.file ? ` (${active.file}) ` : '';
    callStackHintEl.textContent = activeIsTop
      ? `栈深 ${stack.length}${activeFileTag} · 点击栈帧可切换`
      : `正在查看栈帧 ${activeIdx + 1}/${stack.length}${activeFileTag}: ${activeLabel}`;
  }
}

export function truncMap(
  arr: readonly unknown[] | null | undefined,
  render: (val: unknown, idx: number) => string,
  d?: Frame | null
): string {
  if (d && Array.isArray(d.windowed) && d.windowed.length) {
    return d.windowed.map((entry: { gap?: boolean; from?: number; to?: number; count?: number; val?: unknown; idx?: number }) => {
      if (entry && entry.gap) {
        const tip = entry.from != null && entry.to != null
          ? ` title="省略下标 ${entry.from}..${entry.to}（共 ${entry.count} 项）"`
          : '';
        return '<div class="vmore"' + tip + '>…<span class="vmore-cnt">+' + entry.count + '</span></div>';
      }
      return render(entry.val, entry.idx ?? 0);
    }).join('');
  }
  const MAX = 20, HEAD = 10, TAIL = 5;
  if (!arr || arr.length <= MAX) return (arr || []).map((x: unknown, i: number) => render(x, i)).join('');
  const total = (d && typeof d.total === 'number' && d.total >= arr.length) ? d.total : arr.length;
  const hidden = Math.max(1, total - HEAD - TAIL);
  const head = arr.slice(0, HEAD).map((x: unknown, i: number) => render(x, i)).join('');
  const tailStart = total - TAIL;
  const tail = arr.slice(arr.length - TAIL).map((x: unknown, i: number) => render(x, tailStart + i)).join('');
  return head + '<div class="vmore" title="省略 ' + hidden + ' 项">…<span class="vmore-cnt">+' + hidden + '</span></div>' + tail;
}

export function vizArray(d: Frame | null | undefined) {
  if (!d || !d.items || !d.items.length) return null;
  const win = d.win;
  const ptrs = d.pointers;
  const cells = truncMap(d.items, (n: unknown, k: number) => {
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

export function vizQueue(d: Frame | null | undefined) {
  if (!d || !d.items || !d.items.length) return null;
  const len = (typeof d.total === 'number' && d.total > 0) ? d.total : d.items.length;
  const cells = truncMap(d.items, (n: unknown, k: number) => {
    let cls = 'vcell vcell-idx';
    if (d.hot === k) cls += ' hot';
    else if (k === 0) cls += ' mark';
    const tag = k === 0 ? '<span class="sub-tag">front</span>' : (k === len - 1 ? '<span class="sub-tag">back</span>' : '');
    return '<div class="' + cls + '">' + tag + '<span class="val">' + esc(n) + '</span><span class="idx">' + k + '</span></div>';
  }, d);
  return '<div class="viz"><div class="viz-row varray-row">' + cells + '</div></div>';
}

export function vizHeap(d: Frame | null | undefined) {
  if (!d || !d.items || !d.items.length) return null;
  const cells = truncMap(d.items, (n: unknown, k: number) => {
    let cls = 'vcell vcell-idx';
    if (d.hot === k) cls += ' hot';
    else if (k === 0) cls += ' mark';
    const tag = k === 0 ? '<span class="sub-tag">top</span>' : '';
    return '<div class="' + cls + '">' + tag + '<span class="val">' + esc(n) + '</span><span class="idx">' + k + '</span></div>';
  }, d);
  return '<div class="viz"><div class="viz-row varray-row">' + cells + '</div>' +
    '<div class="vmeta-hint">parent = (i - 1) &gt;&gt; 1 · left = 2i + 1</div></div>';
}

export function vizUF(d: Frame | null | undefined) {
  if (!d || !d.items || !d.items.length) return null;
  const cells = truncMap(d.items, (p: unknown, k: number) => {
    let cls = 'vcell vcell-idx';
    if (d.hot === k) cls += ' hot';
    else if (p === k) cls += ' mark';
    const tag = p === k ? '<span class="sub-tag">root</span>' : '<span class="sub-tag">p:' + esc(p) + '</span>';
    return '<div class="' + cls + '">' + tag + '<span class="val">' + esc(p) + '</span><span class="idx">' + k + '</span></div>';
  }, d);
  return '<div class="viz"><div class="viz-row varray-row">' + cells + '</div></div>';
}

export function vizMap(d: Frame | null | undefined) {
  if (!d || !d.entries || !d.entries.length) return null;
  return '<div class="viz"><div class="viz-row vmap-row">' + truncMap(d.entries, (e: unknown) => {
    const k = isRecord(e) ? e.k : '';
    const v = isRecord(e) ? e.v : undefined;
    return '<div class="vpair' + (d.hot === k ? ' hot' : '') + '">' +
      '<span class="vcell vk">' + esc(k) + '</span><span class="varr">→</span>' +
      '<span class="vcell vv">' + esc(v) + '</span></div>';
  }, d) + '</div></div>';
}

export function vizSet(d: Frame | null | undefined) {
  if (!d || !d.items || !d.items.length) return null;
  return '<div class="viz"><div class="viz-row">' + truncMap(d.items, (x: unknown) =>
    '<div class="vcell' + (d.hot === x ? ' hot' : '') + '">' + esc(x) + '</div>',
    d
  ) + '</div></div>';
}

export function vizStack(d: Frame | null | undefined) {
  if (!d || !d.items || !d.items.length) return null;
  const all = d.items, MAX = 6;
  const total = (typeof d.total === 'number' && d.total >= all.length) ? d.total : all.length;
  const baseIdx = typeof d.baseIdx === 'number' ? d.baseIdx : Math.max(0, total - all.length);
  const sliceStart = Math.max(0, all.length - MAX);
  const shown = all.slice(sliceStart);
  const hiddenCount = Math.max(0, total - shown.length);
  const rows = shown.map((x: unknown, k: number) => {
    const abs = baseIdx + sliceStart + k;
    const isTop = abs === total - 1;
    return '<div class="vcell' + (d.hot === abs ? ' hot' : (isTop ? ' mark' : '')) + '">' +
      '<span>' + esc(x) + '</span>' + (isTop ? '<span class="vtop">top</span>' : '') + '</div>';
  }).join('');
  return '<div class="viz"><div class="vcol">' + rows + '</div>' +
    (hiddenCount ? '<div class="vmore">…+' + hiddenCount + '</div>' : '') + '</div>';
}

export function vizString(d: Frame | null | undefined) {
  if (!d || !d.items || !d.items.length) return null;
  const win = d.win;
  if (Array.isArray(d.windowed) && d.windowed.length) {
    const cells = truncMap(d.items, (ch: unknown, k: number) => {
      let cls = 'ch';
      if (win && k >= win[0] && k <= win[1]) cls += ' win';
      if (d.hot === k) cls += ' hot';
      else if (d.mark === k) cls += ' mark';
      return '<span class="' + cls + '" title="[' + k + ']">' + esc(ch) + '</span>';
    }, d);
    return '<div class="viz"><div class="vstr">' + cells + '</div></div>';
  }
  return '<div class="viz"><div class="vstr">' + d.items.map((ch: unknown, k: number) => {
    let cls = 'ch';
    if (win && k >= win[0] && k <= win[1]) cls += ' win';
    if (d.hot === k) cls += ' hot';
    else if (d.mark === k) cls += ' mark';
    return '<span class="' + cls + '">' + esc(ch) + '</span>';
  }).join('') + '</div></div>';
}

export function vizGrid(d: Frame | null | undefined) {
  if (!d || !d.cells || !d.cells.length) return null;
  const depSet = new Set((d.deps || []).map((p: [number, number]) => p[0] + ',' + p[1]));

  if (Array.isArray(d.rowIndices) && Array.isArray(d.colIndices) && Array.isArray(d.viewCells)) {
    const rIdxs = d.rowIndices;
    const cIdxs = d.colIndices;
    const colTracks: Array<{ gap: true } | { gap: false; c: number; ci: number }> = [];
    for (let ci = 0; ci < cIdxs.length; ci++) {
      const curC = cIdxs[ci] ?? 0;
      const prevC = cIdxs[ci - 1] ?? 0;
      if (ci > 0 && curC > prevC + 1) colTracks.push({ gap: true });
      colTracks.push({ gap: false, c: curC, ci });
    }
    const gridCols = colTracks.length + 1;
    let html = '<div class="ghead">r\\c</div>';
    for (const ct of colTracks) {
      if (ct.gap) {
        html += '<div class="ggap">⋯</div>';
      } else {
        const isFocusCol = Array.isArray(d.mark) && d.mark[1] === ct.c;
        html += '<div class="ghead' + (isFocusCol ? ' focus' : '') + '">' + ct.c + '</div>';
      }
    }
    for (let ri = 0; ri < rIdxs.length; ri++) {
      const realR = rIdxs[ri];
      if (ri > 0 && realR !== undefined && realR > (rIdxs[ri - 1] ?? 0) + 1) {
        html += '<div class="ggap">⋮</div>';
        for (let gi = 0; gi < colTracks.length; gi++) {
          html += '<div class="ggap">' + (colTracks[gi]?.gap ? '⋱' : '⋮') + '</div>';
        }
      }
      const isFocusRow = Array.isArray(d.mark) && d.mark[0] === realR;
      html += '<div class="ghead' + (isFocusRow ? ' focus' : '') + '">' + realR + '</div>';
      const rowVals = d.viewCells[ri] || [];
      for (const ct of colTracks) {
        if (ct.gap) {
          html += '<div class="ggap">⋯</div>';
        } else {
          const realC = ct.c;
          let cls = 'gcell';
          if (Array.isArray(d.mark) && d.mark[0] === realR && d.mark[1] === realC) cls += ' hot';
          else if (depSet.has(realR + ',' + realC)) cls += ' dep';
          const val = rowVals[ct.ci];
          html += '<div class="' + cls + '" title="[' + realR + '][' + realC + ']">' + (val === undefined || val === null ? '·' : esc(val)) + '</div>';
        }
      }
    }
    return '<div class="viz"><div class="vgrid-wrap"><div class="vgrid" style="grid-template-columns:repeat(' + gridCols + ',auto)">' + html + '</div></div></div>';
  }

  const cols = d.cells[0]?.length ?? 0;
  let html = '';
  for (let r = 0; r < d.cells.length; r++) {
    for (let c = 0; c < cols; c++) {
      let cls = 'gcell';
      if (Array.isArray(d.mark) && d.mark[0] === r && d.mark[1] === c) cls += ' hot';
      else if (depSet.has(r + ',' + c)) cls += ' dep';
      const val = d.cells[r]?.[c];
      html += '<div class="' + cls + '">' + (val === undefined || val === null ? '·' : esc(val)) + '</div>';
    }
  }
  return '<div class="viz"><div class="vgrid" style="grid-template-columns:repeat(' + cols + ',auto)">' + html + '</div></div>';
}

export function vizList(d: Frame | null | undefined) {
  if (!d || !d.items || !d.items.length) return null;
  const total = (typeof d.total === 'number' && d.total > 0) ? d.total : d.items.length;
  const ptrs = d.pointers;
  return '<div class="viz"><div class="viz-row">' + truncMap(d.items, (val: unknown, k: number) => {
    const pTag = (ptrs && ptrs[k] && ptrs[k].length)
      ? '<span class="sub-tag ptr-tag">' + esc(ptrs[k].slice(0, 2).join(',')) + '</span>'
      : '';
    return '<div class="vpair"><span class="vcell' + (d.hot === k ? ' hot' : '') + '">' + pTag + esc(val) + '</span>' +
      (k < total - 1 ? '<span class="varr">→</span>' : '<span class="varr">→</span><span class="vempty">null</span>') +
      '</div>';
  }, d) + '</div></div>';
}

export function vizTree(d: Frame | null | undefined) {
  if (!d || !d.nodes || !d.nodes.length) return null;
  const nodes = d.nodes;
  const root = d.root ?? 0;
  const coords = new Map<number, { x: number; y: number; val: unknown; left?: number | null; right?: number | null }>();
  let maxDepth = 0;
  function layout(idx: number | null | undefined, depth: number, xMin: number, xMax: number) {
    if (idx == null || !nodes[idx] || coords.has(idx) || depth > 5) return;
    const node = nodes[idx];
    if (!node) return;
    maxDepth = Math.max(maxDepth, depth);
    const x = (xMin + xMax) / 2;
    const y = 20 + depth * 36;
    const leftIdx = typeof node.left === 'number' ? node.left : null;
    const rightIdx = typeof node.right === 'number' ? node.right : null;
    coords.set(idx, { x, y, val: node.val, left: leftIdx, right: rightIdx });
    layout(leftIdx, depth + 1, xMin, x);
    layout(rightIdx, depth + 1, x, xMax);
  }
  layout(root, 0, 14, 226);
  const h = Math.max(60, (maxDepth + 1) * 36 + 10);
  let edgesSvg = '', nodesSvg = '';
  coords.forEach((info, idx) => {
    [info.left, info.right].forEach(ch => {
      if (ch != null && coords.has(ch)) {
        const c = coords.get(ch);
        if (c) edgesSvg += `<line class="vsvg-edge" x1="${info.x}" y1="${info.y}" x2="${c.x}" y2="${c.y}"/>`;
      }
    });
    const cls = d.hot === idx ? 'vsvg-node hot' : (idx === root ? 'vsvg-node mark' : 'vsvg-node');
    nodesSvg += `<g><circle class="${cls}" cx="${info.x}" cy="${info.y}" r="12"/><text class="vsvg-txt" x="${info.x}" y="${info.y}">${esc(info.val)}</text></g>`;
  });
  return `<div class="viz"><div class="vsvg-wrap"><svg viewBox="0 0 240 ${h}" width="240" height="${h}">${edgesSvg}${nodesSvg}</svg></div></div>`;
}

export function vizGraph(d: Frame | null | undefined) {
  if (!d || !d.nodes || !d.nodes.length) return null;
  const byId = new Map<number | string, Frame>();
  d.nodes.forEach((n: Frame, idx: number) => byId.set(n.id ?? idx, n));
  let edgesSvg = '', nodesSvg = '';
  (d.edges || []).forEach((e: [number | string, number | string] | Frame) => {
    const e0 = Array.isArray(e) ? e[0] : (e.from ?? 0);
    const e1 = Array.isArray(e) ? e[1] : (e.to ?? 0);
    const a = byId.get(e0), b = byId.get(e1);
    if (a && b) {
      edgesSvg += `<line class="vsvg-edge" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`;
    }
  });
  d.nodes.forEach((n: Frame, idx: number) => {
    const id = n.id ?? idx;
    const cls = d.hot === id ? 'vsvg-node hot' : 'vsvg-node';
    nodesSvg += `<g><circle class="${cls}" cx="${n.x}" cy="${n.y}" r="13"/><text class="vsvg-txt" x="${n.x}" y="${n.y}">${esc(n.label ?? id)}</text></g>`;
  });
  return `<div class="viz"><div class="vsvg-wrap"><svg viewBox="0 0 180 136" width="180" height="136">${edgesSvg}${nodesSvg}</svg></div></div>`;
}

export function vizInterface(d: Frame | null | undefined) {
  if (!d) return null;
  const fields = d.fields || (d.entries ? d.entries.map((e: { k: unknown; v: unknown }) => ({ k: String(e.k), v: e.v, declaredType: typeof e.v })) : []);
  if (!fields.length && !d.isClass) return null;
  const ifaceTitle = d.interfaceName && d.interfaceName !== 'object' ? d.interfaceName : 'Object';
  const kwTxt = d.isClass ? 'class' : 'interface';
  const badgeTxt = d.isSchema
    ? (d.instanceName ? `schema · 绑定 ${d.instanceName}` : 'schema')
    : 'instance';
  const rows = fields.length
    ? fields.slice(0, 12).map((f: { k: string; v?: unknown; optional?: boolean; declaredType?: string }) => {
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

export function vizEventLoop(d: Frame | null | undefined) {
  if (!d) return null;
  const phaseMap: Record<string, { label: string; cls: string }> = {
    sync: { label: 'Sync · 同步栈执行', cls: 'sync' },
    await_suspend: { label: 'Await · 协程挂起', cls: 'suspend' },
    await_resume: { label: 'Await · 协程恢复', cls: 'resume' },
    microtask: { label: 'Microtask · 微任务出队', cls: 'micro' },
    macrotask: { label: 'Macrotask · 宏任务触发', cls: 'macro' },
  };
  const ph = (d.phase ? phaseMap[d.phase] : undefined) || { label: d.phase || 'Event Loop', cls: 'sync' };
  const nowMs = typeof d.now === 'number' ? d.now : 0;

  const coroutines = Array.isArray(d.coroutines) ? d.coroutines : [];
  const coroHtml = coroutines.length
    ? coroutines.map((c: Frame) => {
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
    ? microtasks.map((m: Frame, idx: number) =>
        `<div class="vel-qitem micro${idx === 0 ? ' head' : ''}">` +
        `<span class="vel-qidx">#${idx + 1}</span>` +
        `<span class="vel-qlabel">${esc(m.label)}</span>` +
        ((m.line ?? 0) > 0 ? `<span class="vel-qmeta">@L${m.line}</span>` : '') +
        `</div>`
      ).join('')
    : '<span class="vel-empty">队列为空 (0)</span>';

  const macrotasks = Array.isArray(d.macrotasks) ? d.macrotasks : [];
  const macroHtml = macrotasks.length
    ? macrotasks.map((t: Frame, idx: number) =>
        `<div class="vel-qitem macro${idx === 0 ? ' head' : ''}">` +
        `<span class="vel-qidx">t=${t.due}ms</span>` +
        `<span class="vel-qlabel">${esc(t.label)}</span>` +
        `<span class="vel-qmeta">+${t.delay}ms</span>` +
        `</div>`
      ).join('')
    : '<span class="vel-empty">无待触发定时器 (0)</span>';

  const promises = Array.isArray(d.promises) ? d.promises : [];
  const promHtml = promises.length
    ? promises.map((p: Frame) => {
        const st = p.state || 'pending';
        const icon = st === 'fulfilled' ? '✓' : (st === 'rejected' ? '✗' : '⏳');
        const reactions = p.reactions ?? 0;
        const valPart = st === 'pending'
          ? (reactions > 0 ? `<span class="vel-pval dim">${reactions} waiter${reactions > 1 ? 's' : ''}</span>` : '<span class="vel-pval dim">pending</span>')
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

Object.assign(VIZ, {
  array: vizArray, map: vizMap, set: vizSet, stack: vizStack,
  string: vizString, grid: vizGrid, list: vizList,
  heap: vizHeap, queue: vizQueue, tree: vizTree, graph: vizGraph, uf: vizUF,
  interface: vizInterface, object: vizInterface,
  eventloop: vizEventLoop,
});

export function renderPicker() {
  const vars = discoverVars();
  if (!vars.length) {
    pickEl.innerHTML = '<span class="vempty">无结构变量</span>';
    renderSlots();
    return;
  }
  pickEl.innerHTML = vars.map((s: DiscoveredVar) =>
    '<div class="chip-pick' + (appState.watched.has(s.id) ? ' on' : '') + '" data-id="' + esc(s.id) + '">' + esc(s.name) + '</div>'
  ).join('');
  renderSlots();
}

export function renderSlots() {
  const stepAtCur = appState.TRACE.steps[appState.cur];
  const st: Partial<StepSnapshot> = stepAtCur || {};
  const activeFrame = stepAtCur ? getActiveFrame(stepAtCur) : null;
  const ds = Object.assign({}, (activeFrame && activeFrame.ds) || st.ds || {});
  if (st.ds && st.ds.eventLoop && !ds.eventLoop) ds.eventLoop = st.ds.eventLoop;
  const vars = discoverVars().filter((s: DiscoveredVar) => appState.watched.has(s.id) && ds[s.id] !== undefined);
  if (slotsEl && slotsEl.classList && slotsEl.classList.toggle) {
    slotsEl.classList.toggle('single-col', slotsEl.clientWidth > 0 && slotsEl.clientWidth < 420);
  }
  if (!vars.length) {
    slotsEl.innerHTML = '<div class="slot" style="grid-column:1/-1"><div class="vempty">' +
      (appState.TRACE.steps.length ? '点选变量以关注（或本步暂无结构）' : '生成轨迹后显示结构可视化') +
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
  const prevBtn = $<HTMLButtonElement>('prev');
  const nextBtn = $<HTMLButtonElement>('next');
  const ckptBtn = $<HTMLButtonElement>('nextCheckpoint');
  const autoBtn = $<HTMLButtonElement>('auto');
  const atEnd = Boolean(appState.TRACE.steps.length > 0 && appState.cur >= appState.TRACE.steps.length - 1 && appState.DEBUG_SESSION.finished);
  if (prevBtn) prevBtn.disabled = !appState.TRACE.steps.length || appState.cur <= 0;
  if (nextBtn) nextBtn.disabled = atEnd;
  if (ckptBtn) ckptBtn.disabled = atEnd;
  if (autoBtn) autoBtn.disabled = atEnd;
}

function formatTypeTokensHtml(typeExpr: string): string {
  return esc(typeExpr).replace(/\b([A-Za-z_$][\w$]*)\b/g, '<span class="ft-type">$1</span>');
}

export function formatFnTypeHtml(sig: string): string {
  const s = String(sig || '() => any').trim();
  let d = 0;
  let arrowIdx = -1;
  for (let i = 0; i < s.length - 1; i++) {
    const ch = s[i];
    if (ch === '(' || ch === '<' || ch === '[') d++;
    else if (ch === ')' || ch === '>' || ch === ']') d = Math.max(0, d - 1);
    else if (d === 0 && ch === '=' && s[i + 1] === '>') {
      arrowIdx = i;
      break;
    }
  }
  if (arrowIdx < 0) {
    return formatTypeTokensHtml(s);
  }
  const left = s.slice(0, arrowIdx).trim();
  const right = s.slice(arrowIdx + 2).trim();

  let genPrefix = '';
  let paramsPart = left;
  if (left.startsWith('<')) {
    let gd = 0;
    for (let i = 0; i < left.length; i++) {
      if (left[i] === '<') gd++;
      else if (left[i] === '>') {
        gd--;
        if (gd === 0) {
          genPrefix = left.slice(0, i + 1);
          paramsPart = left.slice(i + 1).trim();
          break;
        }
      }
    }
  }

  let paramsInner = paramsPart;
  if (paramsPart.startsWith('(') && paramsPart.endsWith(')')) {
    paramsInner = paramsPart.slice(1, -1);
  }
  const paramList: string[] = [];
  let pd = 0;
  let last = 0;
  for (let i = 0; i < paramsInner.length; i++) {
    const ch = paramsInner[i];
    if (ch === '(' || ch === '<' || ch === '[' || ch === '{') pd++;
    else if (ch === ')' || ch === '>' || ch === ']' || ch === '}') pd = Math.max(0, pd - 1);
    else if (pd === 0 && ch === ',') {
      paramList.push(paramsInner.slice(last, i).trim());
      last = i + 1;
    }
  }
  const tail = paramsInner.slice(last).trim();
  if (tail) paramList.push(tail);

  const formattedParams = paramList
    .map(p => {
      const m = p.match(/^(\.\.\.)?([A-Za-z_$][\w$]*)(\?)?\s*:\s*([\s\S]+)$/);
      if (m && m[2] && m[4]) {
        const dots = m[1] ? `<span class="ft-punct">...</span>` : '';
        const opt = m[3] ? `<span class="ft-punct">?</span>` : '';
        return `${dots}<span class="ft-param">${esc(m[2])}</span>${opt}<span class="ft-punct">: </span>${formatTypeTokensHtml(m[4].trim())}`;
      }
      return formatTypeTokensHtml(p);
    })
    .join('<span class="ft-punct">, </span>');

  const genHtml = genPrefix ? formatTypeTokensHtml(genPrefix) : '';
  return (
    `${genHtml}<span class="ft-punct">(</span>${formattedParams}<span class="ft-punct">)</span>` +
    ` <span class="ft-arrow">=&gt;</span> ` +
    formatTypeTokensHtml(right)
  );
}

export function renderStatic(i: number, withAnim = false) {
  hideHoverTip();
  const st = appState.TRACE.steps[i];
  const prevSt = i > 0 ? appState.TRACE.steps[i - 1] : null;
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
  const targetFile = (activeFrame && activeFrame.file) || st.file || appState.DEBUG_SESSION.entryFile || '';
  if (
    targetFile &&
    appState.TRACE.moduleSources &&
    Object.keys(appState.TRACE.moduleSources).length > 1
  ) {
    appState.ACTIVE_DEBUG_FILE = targetFile;
    uiHooks.switchToScriptFile(targetFile);
  }
  const v = (activeFrame && activeFrame.v) || st.v || {};
  const prevV = (prevSt && prevSt.v) || {};
  const primEntries = Object.keys(v).map(k => {
    const val = v[k];
    if (val !== null && typeof val === 'object') return '';
    const isFn = typeof val === 'function';
    const prevVal = prevV[k];
    const changed = Boolean(
      activeFrame &&
      activeFrame.isTop &&
      prevSt &&
      (isFn
        ? typeof prevVal !== 'function' || formatFunctionTypeSignature(k, prevVal) !== formatFunctionTypeSignature(k, val)
        : prevVal !== val)
    );
    const valHtml = isFn
      ? '<span class="v fn-type">' + formatFnTypeHtml(formatFunctionTypeSignature(k, val)) + '</span>'
      : '<span class="v">' + esc(val) + '</span>';
    return '<div class="pair' + (changed ? ' changed' : '') + '" data-var="' + esc(k) + '"><span class="k">' + esc(k) + '</span>' + valHtml + '</div>';
  }).join('');
  if (primEntries) {
    varsEl.innerHTML = primEntries;
  } else if (activeFrame && activeFrame.fn === 'global') {
    varsEl.innerHTML = '<div class="pair"><span class="k">scope</span><span class="v">global</span></div>' +
      (appState.DEBUG_SESSION.callExpr && appState.DEBUG_SESSION.callExpr !== 'undefined'
        ? '<div class="pair"><span class="k">entry</span><span class="v">' + esc(appState.DEBUG_SESSION.callExpr) + '</span></div>'
        : '');
  } else {
    varsEl.innerHTML = '<div class="vempty">（本帧无原始类型局部变量）</div>';
  }

  let animDesc = '';
  const fileTag = st.file && appState.TRACE.moduleSources && Object.keys(appState.TRACE.moduleSources).length > 1
    ? `${st.file} · `
    : '';
  if (st.error) {
    animDesc = `<div class="anim-desc" style="color:var(--red)">runtime error · 已停止在报错行 (${esc(fileTag)}第 ${st.line} 行)</div>`;
  } else if (st.anim) {
    if (st.anim.type === 'assign') animDesc = `<div class="anim-desc">${esc(fileTag)}assign · ${esc(st.anim.from)} → ${esc(st.anim.to)} = ${esc(st.anim.val)}</div>`;
    else if (st.anim.type === 'compare') animDesc = `<div class="anim-desc">${esc(fileTag)}compare · ${esc(st.anim.lhs)} ${esc(st.anim.op)} ${esc(st.anim.rhs)} ⇒ ${esc(st.anim.result)}</div>`;
    else if (st.anim.type === 'call') animDesc = `<div class="anim-desc">${esc(fileTag)}call · ${esc(st.anim.fn)}(${esc((st.anim.argVals || []).join(', '))})</div>`;
    else if (st.anim.type === 'checkpoint') animDesc = `<div class="anim-desc" style="color:var(--cyan)">${esc(fileTag)}checkpoint · ${esc((st.anim.argVals && st.anim.argVals[0]) ? st.anim.argVals[0] : '检查点已命中')}</div>`;
  }
  consoleEl.innerHTML = '<div><span class="p">›</span>' + (fileTag ? '<span class="dim">[' + esc(st.file || '') + '] </span>' : '') + esc(st.note || '') + '</div>' + animDesc;

  if (st.error) {
    cntEl.textContent = '✗ 运行时报错';
    cntEl.className = 'err';
  } else if (st.isCheckpoint) {
    cntEl.textContent = '◉ 命中检查点';
    cntEl.className = 'ckpt';
  } else if (appState.DEBUG_SESSION.finished && i === appState.TRACE.steps.length - 1) {
    cntEl.textContent = '✓ 执行完毕';
    cntEl.className = 'done';
  } else {
    cntEl.textContent = '● 调试运行中';
    cntEl.className = 'running';
  }

  updateControlButtons();
  updateEditorChrome();
  if (appState.VIEW_MODE === 'notebook' && typeof globalThis.renderNotebookUI === 'function') {
    globalThis.renderNotebookUI(false);
  } else {
    scrollCodeTo(activeFrame ? activeFrame.line : st.line);
  }
  renderSlots();

  if (withAnim && appState.VIEW_MODE !== 'notebook') {
    playStepAnimation(st);
  }
}

export const renderMemory = renderSlots;
export const renderAsyncQueues = vizEventLoop;
export function drawArrows(): void {}
export function scheduleArrowRedraw(): void {}

registerUiHooks({ renderPicker, renderStatic });

