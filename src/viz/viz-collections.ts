/* ================================================================
   Linear, Grid & Associative Collection Card Renderers (src/viz/viz-collections.ts)
   ================================================================ */
import { esc } from "../state";
import { Frame } from "../types";
import { isRecord } from "../utils/format";

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
    const ptrList = ptrs ? ptrs[k] : undefined;
    const pTag = (ptrList && ptrList.length)
      ? '<span class="sub-tag ptr-tag">' + esc(ptrList.slice(0, 2).join(',')) + '</span>'
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
