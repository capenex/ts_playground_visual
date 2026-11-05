/* ================================================================
   Call Stack & Data Structure Card Renderers (src/viz/memory-graph.ts)
   ================================================================ */
import { formatFunctionTypeSignature } from "../compiler/tc-types";
import { analyzeTimeComplexity, estimateInputSizeFromCall } from "../compiler/instrumenter";
import { appState, esc, registerUiHooks, uiHooks } from "../state";
import { ComplexityReport, Frame, StepAnim, StepSnapshot } from "../types";
import { $, callStackBarEl, callStackHintEl, cntEl, complexityPopEl, consoleEl, pickEl, slotsEl, varsEl } from "../ui/dom";
import { isRecord, safeJSONStringify } from "../utils/format";
import { hideHoverTip, updateEditorChrome, scrollCodeTo } from "./highlight";
import { playStepAnimation } from "./ast-view";
import {
  allocateSlotSpans,
  discoverVars,
  DiscoveredVar,
  evaluateCustomWatch,
  getActiveFrame,
  isCustomWatchId,
  VIZ,
  watchExprFromId,
  watchIdForExpr,
} from "./memory-normalizers";

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
  if (d.isSchema) {
    const schemaRows = fields.length
      ? fields.slice(0, 12).map((f: { k: string; optional?: boolean; declaredType?: string }) =>
          '<div class="viface-row">' +
            '<span class="viface-k">' + esc(f.k) + (f.optional ? '<span class="viface-opt">?</span>' : '') + '</span>' +
            (f.declaredType ? '<span class="viface-t">: ' + esc(f.declaredType) + '</span>' : '') +
          '</div>'
        ).join('')
      : '<div class="viface-row"><span class="viface-v schema-only">（空接口契约）</span></div>';
    return '<div class="viz"><div class="viface">' +
      '<div class="viface-head"><span class="viface-kw">' + kwTxt + '</span><span class="viface-title">' + esc(ifaceTitle) + '</span><span class="viface-badge">definition</span></div>' +
      '<div class="viface-body">' + schemaRows + '</div>' +
      '</div></div>';
  }
  const badgeTxt = 'instance';
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

export function vizTypeAlias(d: Frame | null | undefined) {
  if (!d) return null;
  const typeTitle = String(d.interfaceName || d.name || 'Type') + (d.typeParams || '');
  const aliasKind = d.aliasKind || (Array.isArray(d.unionBranches) && d.unionBranches.length > 1 ? 'union' : (Array.isArray(d.fields) && d.fields.length > 0 ? 'object' : 'alias'));
  const isUtilityObj = aliasKind === 'object' && Boolean(d.rawDef && !d.rawDef.trim().startsWith('{'));
  const badgeTxt = aliasKind === 'union'
    ? `union · ${(d.unionBranches || []).length}`
    : (isUtilityObj ? 'utility · object' : (aliasKind === 'object' ? 'object' : 'alias'));
  const exprBanner = isUtilityObj && d.rawDef
    ? '<div class="vtype-expr"><span class="viface-eq">=</span><span class="vtype-raw">' + esc(d.rawDef) + '</span></div>'
    : '';

  let bodyHtml = '';
  if (aliasKind === 'union' && Array.isArray(d.unionBranches) && d.unionBranches.length > 0) {
    const hasObjectBranch = d.unionBranches.some(b => b.isObject && b.fields && b.fields.length > 0);
    if (hasObjectBranch) {
      bodyHtml = d.unionBranches.slice(0, 10).map(b => {
        if (b.isObject && b.fields && b.fields.length > 0) {
          const propsHtml = b.fields.map(f => {
            const fKey = f.k || f.name || '';
            return '<span class="vtype-prop">' +
              '<span class="viface-k">' + esc(fKey) + (f.optional ? '<span class="viface-opt">?</span>' : '') + '</span>' +
              (f.declaredType ? '<span class="viface-t">: ' + esc(f.declaredType) + '</span>' : '') +
              '</span>';
          }).join('<span class="vtype-sep">; </span>');
          return '<div class="viface-row vtype-branch-obj">' +
            '<span class="vtype-bar">|</span>' +
            '<span class="vtype-brace">{</span>' +
            '<span class="vtype-branch-fields">' + propsHtml + '</span>' +
            '<span class="vtype-brace">}</span>' +
            '</div>';
        }
        return '<div class="viface-row vtype-branch-obj">' +
          '<span class="vtype-bar">|</span>' +
          '<span class="viface-t">' + esc(b.raw) + '</span>' +
          '</div>';
      }).join('');
    } else {
      bodyHtml = '<div class="vtype-union-pills">' +
        d.unionBranches.slice(0, 16).map((b, idx) => {
          const isLitStr = /^['"`]/.test(b.raw);
          return (idx > 0 ? '<span class="vtype-bar">|</span>' : '') +
            '<span class="vtype-pill' + (isLitStr ? ' lit-str' : '') + '">' + esc(b.raw) + '</span>';
        }).join('') +
        '</div>';
    }
  } else if (Array.isArray(d.fields) && d.fields.length > 0) {
    bodyHtml = d.fields.slice(0, 12).map(f => {
      const fKey = f.k || '';
      return '<div class="viface-row">' +
        '<span class="viface-k">' + esc(fKey) + (f.optional ? '<span class="viface-opt">?</span>' : '') + '</span>' +
        (f.declaredType ? '<span class="viface-t">: ' + esc(f.declaredType) + '</span>' : '') +
        '</div>';
    }).join('');
  } else {
    const defText = d.resolvedDef || d.rawDef || 'any';
    bodyHtml = '<div class="viface-row">' +
      '<span class="viface-eq">=</span>' +
      '<span class="viface-t">' + esc(defText) + '</span>' +
      '</div>';
  }

  return '<div class="viz"><div class="viface vtype-card">' +
    '<div class="viface-head vtype-head"><span class="viface-kw">type</span><span class="viface-title">' + esc(typeTitle) + '</span><span class="viface-badge">' + esc(badgeTxt) + '</span></div>' +
    exprBanner +
    '<div class="viface-body">' + bodyHtml + '</div>' +
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

export function vizWatchScalar(d: Frame | null | undefined) {
  if (!d) return '<div class="vempty">empty</div>';
  if (d.watchStatus === 'unready') {
    return '<div class="viz"><div class="vwatch-scalar unready">' +
      '<span class="vw-badge">未就绪</span>' +
      '<span class="vw-dim">' + esc(d.watchError || '当前作用域尚未初始化该表达式所需变量') + '</span>' +
      '</div></div>';
  }
  if (d.watchStatus === 'error') {
    return '<div class="viz"><div class="vwatch-scalar err">' +
      '<span class="vw-badge err">异常</span>' +
      '<span class="vw-err">' + esc(d.watchError || '表达式求值失败') + '</span>' +
      '</div></div>';
  }
  const hasDelta = Boolean(d.changed && d.prevValStr !== undefined && d.prevValStr !== String(d.val));
  const deltaHtml = hasDelta
    ? `<span class="vw-prev">${esc(d.prevValStr)}</span><span class="vw-arrow">→</span>`
    : '';
  return '<div class="viz"><div class="vwatch-scalar' + (d.changed ? ' changed' : '') + '">' +
    deltaHtml +
    '<span class="vw-val">' + esc(d.val) + '</span>' +
    (d.runtimeType ? '<span class="vw-type">' + esc(d.runtimeType) + '</span>' : '') +
    '</div></div>';
}

Object.assign(VIZ, {
  array: vizArray, map: vizMap, set: vizSet, stack: vizStack,
  string: vizString, grid: vizGrid, list: vizList,
  heap: vizHeap, queue: vizQueue, tree: vizTree, graph: vizGraph, uf: vizUF,
  interface: vizInterface, object: vizInterface, type: vizTypeAlias,
  eventloop: vizEventLoop,
  'watch-scalar': vizWatchScalar,
});

export function addCustomWatch(rawExpr: string): boolean {
  const expr = String(rawExpr || '').trim();
  if (!expr) return false;
  if (!appState.CUSTOM_WATCHES.includes(expr)) {
    appState.CUSTOM_WATCHES.push(expr);
  }
  const wid = watchIdForExpr(expr);
  appState.watched.add(wid);
  appState.SEEN_VARS_EVER.add(wid);
  renderPicker();
  return true;
}

export function removeCustomWatch(rawExprOrId: string): void {
  const expr = isCustomWatchId(rawExprOrId) ? watchExprFromId(rawExprOrId) : String(rawExprOrId || '').trim();
  const wid = watchIdForExpr(expr);
  appState.CUSTOM_WATCHES = appState.CUSTOM_WATCHES.filter(x => x !== expr);
  appState.watched.delete(wid);
  appState.SEEN_VARS_EVER.delete(wid);
  delete appState.layoutSpan[wid];
  renderPicker();
}

export function renderPicker() {
  const vars = discoverVars();
  if (!vars.length) {
    pickEl.innerHTML = '<span class="vempty">无结构变量 · 可在上方输入表达式添加自定义监听</span>';
    renderSlots();
    return;
  }
  pickEl.innerHTML = vars.map((s: DiscoveredVar) => {
    const isCustom = Boolean(s.isCustomWatch || isCustomWatchId(s.id));
    const delBtn = isCustom
      ? `<span class="chip-del" data-del-watch="${esc(s.id)}" title="移除自定义监听 ${esc(s.name)}">×</span>`
      : '';
    return '<div class="chip-pick' +
      (appState.watched.has(s.id) ? ' on' : '') +
      (isCustom ? ' custom-watch' : '') +
      '" data-id="' + esc(s.id) + '">' +
      (isCustom ? '<span class="chip-fx">ƒ</span>' : '') +
      '<span>' + esc(s.name) + '</span>' +
      delBtn +
      '</div>';
  }).join('');
  renderSlots();
}

export function renderSlots() {
  const stepAtCur = appState.TRACE.steps[appState.cur];
  const prevStep = appState.cur > 0 ? appState.TRACE.steps[appState.cur - 1] : null;
  const st: Partial<StepSnapshot> = stepAtCur || {};
  const activeFrame = stepAtCur ? getActiveFrame(stepAtCur) : null;
  const prevFrame = prevStep ? getActiveFrame(prevStep) : null;
  const ds: Record<string, StepAnim> = Object.assign({}, (activeFrame && activeFrame.ds) || st.ds || {});
  if (st.ds && st.ds.eventLoop && !ds.eventLoop) ds.eventLoop = st.ds.eventLoop;

  const curV = (activeFrame && activeFrame.v) || st.v || {};
  const prevV = (prevFrame && prevFrame.v) || (prevStep && prevStep.v) || null;
  const rawNote = st.rawNote || st.note || '';

  for (const expr of appState.CUSTOM_WATCHES) {
    const wid = watchIdForExpr(expr);
    if (appState.watched.has(wid)) {
      ds[wid] = evaluateCustomWatch(expr, curV, prevV, rawNote);
    }
  }

  const vars = discoverVars().filter((s: DiscoveredVar) => appState.watched.has(s.id) && ds[s.id] !== undefined);
  if (slotsEl && slotsEl.classList && slotsEl.classList.toggle) {
    slotsEl.classList.toggle('single-col', slotsEl.clientWidth > 0 && slotsEl.clientWidth < 420);
  }
  if (!vars.length) {
    slotsEl.innerHTML = '<div class="slot" style="grid-column:1/-1"><div class="vempty">' +
      (appState.TRACE.steps.length ? '点选变量以关注，或在 WATCH 栏输入表达式（如 nums.slice(l, r+1)）' : '生成轨迹后显示结构可视化 · 支持上方输入自定义表达式监听') +
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
    const isCustom = Boolean(s.isCustomWatch || isCustomWatchId(s.id));
    const isHotSlot = d && (d.hot !== undefined || d.mark != null || d.changed);
    const kindPrefix = (d && d.isClass) ? 'class' : 'interface';
    const kindBadge = kind === 'watch-scalar'
      ? `watch · ${(d && d.runtimeType) || 'expr'}`
      : (kind === 'interface' && d && d.interfaceName && d.interfaceName !== 'object' && !d.isSchema)
        ? `${kindPrefix} · ${d.interfaceName}`
        : (kind === 'interface' && d && d.isClass ? 'class' : (isCustom ? `watch · ${kind}` : kind));
    const closeBtn = isCustom
      ? `<button type="button" class="slot-watch-del" data-del-watch="${esc(s.id)}" title="移除监听表达式 ${esc(s.name)}">×</button>`
      : '';
    return '<div class="slot' + (span === 2 ? ' span-2' : '') + (isHotSlot ? ' pulse' : '') + (isCustom ? ' custom-watch-slot' : '') + '" data-var="' + esc(s.name) + '">' +
      '<div class="name"><span>' + (isCustom ? 'ƒ ' : '') + esc(s.name) + '</span><span class="kind">' + esc(kindBadge) + '</span>' + sizeTag + winTag + closeBtn + '</div>' +
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

function ensureComplexityReport(st?: StepSnapshot | null): ComplexityReport | null {
  if (appState.COMPLEXITY_REPORT) return appState.COMPLEXITY_REPORT;
  if (appState.TRACE && appState.TRACE.complexity) {
    appState.COMPLEXITY_REPORT = appState.TRACE.complexity;
    return appState.COMPLEXITY_REPORT;
  }
  const src = uiHooks.getEditorSource();
  if (!src || !src.trim()) return null;
  const callExpr = appState.DEBUG_SESSION.callExpr || 'undefined';
  const base = analyzeTimeComplexity(src, callExpr);
  const inputSizeN = estimateInputSizeFromCall(src, callExpr);
  const stepsCount = appState.TRACE && appState.TRACE.steps ? appState.TRACE.steps.length : 0;
  const maxDepth = appState.DEBUG_SESSION.maxStackDepth || (st && Array.isArray(st.callStack) ? st.callStack.length : 1);
  appState.COMPLEXITY_REPORT = {
    ...base,
    runtime: {
      inputSizeN,
      totalSteps: stepsCount,
      maxCallStackDepth: maxDepth,
      hotLines: [],
    },
  };
  return appState.COMPLEXITY_REPORT;
}

export function renderComplexityBar(st?: StepSnapshot | null): void {
  if (!consoleEl) return;
  const activeStep = st !== undefined ? st : (appState.TRACE.steps[appState.cur] || null);
  const report = ensureComplexityReport(activeStep);

  if (!report) {
    consoleEl.innerHTML =
      '<div class="cbar-row"><span class="p">›</span><span class="dim">⏱ 复杂度分析就绪 · 点击「▶ 运行」或「🐞 Debug 调试」查看时间/空间复杂度</span></div>';
    if (complexityPopEl) complexityPopEl.hidden = true;
    return;
  }

  const rt = report.runtime;
  const stepsShown = activeStep ? (appState.cur + 1) : (rt ? rt.totalSteps : 0);
  const totalKnown = (appState.TRACE && appState.TRACE.steps.length) || (rt ? rt.totalSteps : 0);
  const stepStr = activeStep
    ? `步数 ${stepsShown}/${totalKnown}${appState.DEBUG_SESSION.finished ? '' : '+'}`
    : (rt && rt.totalSteps > 0 ? `共 ${rt.totalSteps} 步` : '静态估算');
  const nStr = rt && rt.inputSizeN !== null && rt.inputSizeN > 0 ? `N=${rt.inputSizeN} · ` : '';
  const depthNum = activeStep && Array.isArray(activeStep.callStack) && activeStep.callStack.length > 0
    ? activeStep.callStack.length
    : (rt ? rt.maxCallStackDepth : 1);
  const hotTop = rt && rt.hotLines && rt.hotLines[0] ? rt.hotLines[0] : null;
  const hotStr = hotTop ? `🔥 L${hotTop.line}×${hotTop.hits}` : '';
  const statusAddon = activeStep && activeStep.error
    ? `<span class="cbar-err">✗ L${activeStep.line} 报错</span>`
    : (activeStep && activeStep.isCheckpoint
      ? `<span class="cbar-ckpt">◉ 断点 L${activeStep.line}</span>`
      : '');

  consoleEl.innerHTML =
    '<div class="cbar-row" data-toggle-complexity="1">' +
      '<span class="p">›</span>' +
      '<span class="cbar-pill time" title="估算时间复杂度">⏱ 时间 <b>' + esc(report.overallTime) + '</b></span>' +
      '<span class="cbar-pill space" title="估算空间复杂度">📦 空间 <b>' + esc(report.overallSpace) + '</b></span>' +
      '<span class="cbar-stat">' + esc(nStr + stepStr) + ' · 栈深 ' + depthNum + '</span>' +
      (hotStr ? '<span class="cbar-hot" title="最热执行代码行">' + esc(hotStr) + '</span>' : '') +
      statusAddon +
      '<span class="cbar-more" title="点击展开/收起复杂度推导依据与热点行详情">详情 ▾</span>' +
    '</div>';

  if (complexityPopEl) {
    const fnRows = report.functions.length
      ? report.functions.map(fn =>
          '<div class="cpop-fn-row">' +
            '<span class="cpop-fn-name">' + esc(fn.fnName) + '<span class="cpop-fn-line">:L' + fn.line + '</span></span>' +
            '<span class="cpop-fn-badges">' +
              '<span class="cbar-pill time">T: ' + esc(fn.timeComplexity) + '</span>' +
              '<span class="cbar-pill space">S: ' + esc(fn.spaceComplexity) + '</span>' +
            '</span>' +
            '<div class="cpop-fn-reason">' + esc(fn.rationale) + '</div>' +
          '</div>'
        ).join('')
      : '<div class="cpop-empty">仅顶层脚本语句（无命名函数声明）</div>';

    const hotRows = rt && rt.hotLines && rt.hotLines.length
      ? rt.hotLines.map(h =>
          '<div class="cpop-hot-row" data-jump-line="' + h.line + '" title="点击跳转到第 ' + h.line + ' 行">' +
            '<span class="cpop-hot-line">第 ' + h.line + ' 行</span>' +
            '<span class="cpop-hot-hits">执行 ' + h.hits + ' 次</span>' +
            '<code class="cpop-hot-code">' + esc(h.code || h.snippet || '') + '</code>' +
          '</div>'
        ).join('')
      : '<div class="cpop-empty">运行或单步调试后自动统计高频执行行</div>';

    complexityPopEl.innerHTML =
      '<div class="cpop-head">' +
        '<span>⏱ 算法时间/空间复杂度分析 &amp; 运行热点</span>' +
        '<button type="button" class="cpop-close" data-close-complexity="1">✕</button>' +
      '</div>' +
      '<div class="cpop-summary">' +
        '<div class="cpop-main-badges">' +
          '<span class="cbar-pill time lg">时间复杂度: <b>' + esc(report.overallTime) + '</b></span>' +
          '<span class="cbar-pill space lg">空间复杂度: <b>' + esc(report.overallSpace) + '</b></span>' +
          (rt && rt.inputSizeN !== null && rt.inputSizeN > 0 ? '<span class="cbar-pill neutral">估算输入规模 N = ' + rt.inputSizeN + '</span>' : '') +
        '</div>' +
        '<div class="cpop-rationale">' + esc(report.rationale) + '</div>' +
      '</div>' +
      '<div class="cpop-section-title">函数级复杂度拆解</div>' +
      '<div class="cpop-fn-list">' + fnRows + '</div>' +
      '<div class="cpop-section-title">🔥 运行时热点行 (Top 3)</div>' +
      '<div class="cpop-hot-list">' + hotRows + '</div>';
  }
}

export function toggleComplexityPopover(force?: boolean): void {
  if (!complexityPopEl) return;
  const nextHidden = typeof force === 'boolean' ? !force : !complexityPopEl.hidden;
  complexityPopEl.hidden = nextHidden;
  if (!nextHidden) {
    renderComplexityBar();
  }
}

export function renderStatic(i: number, withAnim = false) {
  hideHoverTip();
  const st = appState.TRACE.steps[i];
  const prevSt = i > 0 ? appState.TRACE.steps[i - 1] : null;
  if (!st) {
    renderCallStack(null);
    varsEl.innerHTML = '';
    renderComplexityBar(null);
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
  const isTopFrame = Boolean(!activeFrame || activeFrame.isTop);
  const assignTarget =
    isTopFrame &&
    st.anim &&
    (st.anim.type === 'assign' || (st.anim.type === 'call' && st.anim.to)) &&
    typeof st.anim.to === 'string' &&
    st.anim.to !== 'return'
      ? st.anim.to.trim()
      : '';
  const assignNextVal =
    assignTarget && st.anim
      ? (st.anim.val !== undefined ? st.anim.val : st.anim.result)
      : undefined;

  const primList = Object.keys(v).map(k => {
    const val = v[k];
    if (val !== null && typeof val === 'object') return '';
    const isFn = typeof val === 'function';
    const prevVal = prevV[k];
    const isPendingAssign = Boolean(
      assignTarget === k &&
      assignNextVal !== undefined &&
      assignNextVal !== null &&
      String(val) !== String(assignNextVal)
    );
    const changed = Boolean(
      isPendingAssign ||
      (activeFrame &&
        activeFrame.isTop &&
        prevSt &&
        (isFn
          ? typeof prevVal !== 'function' || formatFunctionTypeSignature(k, prevVal) !== formatFunctionTypeSignature(k, val)
          : prevVal !== val))
    );
    const nextBadge = isPendingAssign
      ? ` <span class="v-next" title="本行执行前为 ${esc(val)}，本行赋值后变为 ${esc(assignNextVal)}">→ ${esc(assignNextVal)}</span>`
      : '';
    const valHtml = isFn
      ? '<span class="v fn-type">' + formatFnTypeHtml(formatFunctionTypeSignature(k, val)) + '</span>'
      : '<span class="v">' + esc(val) + nextBadge + '</span>';
    return '<div class="pair' + (changed ? ' changed' : '') + '" data-var="' + esc(k) + '"><span class="k">' + esc(k) + '</span>' + valHtml + '</div>';
  });
  if (
    assignTarget &&
    /^[A-Za-z_$][\w$]*$/.test(assignTarget) &&
    !(assignTarget in v) &&
    assignNextVal !== undefined &&
    assignNextVal !== null
  ) {
    primList.push(
      '<div class="pair changed" data-var="' + esc(assignTarget) + '" title="本行即将声明并赋值的变量"><span class="k">' + esc(assignTarget) + '</span><span class="v"><span class="v-next">→ ' + esc(assignNextVal) + '</span></span></div>'
    );
  }
  const primEntries = primList.join('');
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

  renderComplexityBar(st);

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

registerUiHooks({ renderPicker, renderStatic, renderComplexityBar });

