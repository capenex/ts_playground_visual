/* ================================================================
   Topology, Linked List, Schema & Type Alias Visualizers (src/viz/viz-topology.ts)
   Layer 6 (DOM-aware renderer + idempotent zoom/pan interaction controller)
   ================================================================ */
import { esc } from '../state';
import type { Frame } from '../types';
import { safeJSONStringify } from '../utils/format';
import { computeGraphLayout, computeTreeLayout } from './svg-layout';

interface TopologyTransform {
  scale: number;
  tx: number;
  ty: number;
}

const wrapTransforms = new WeakMap<HTMLElement, TopologyTransform>();
let arrowMarkerSeq = 0;

function getTransform(wrapEl: HTMLElement): TopologyTransform {
  const existing = wrapTransforms.get(wrapEl);
  if (existing) return existing;
  const fresh: TopologyTransform = { scale: 1, tx: 0, ty: 0 };
  wrapTransforms.set(wrapEl, fresh);
  return fresh;
}

function applyStageTransform(wrapEl: HTMLElement, state: TopologyTransform): void {
  const stageEl = wrapEl.querySelector('.vsvg-stage');
  if (!(stageEl instanceof HTMLElement)) return;
  stageEl.style.transform = `translate(${state.tx.toFixed(1)}px, ${state.ty.toFixed(1)}px) scale(${state.scale.toFixed(3)})`;
}

function clampScale(scale: number): number {
  return Math.max(0.35, Math.min(4, scale));
}

function formatCircleText(raw: unknown): string {
  const str = String(raw);
  if (str.length <= 6) return str;
  return str.slice(0, 5) + '…';
}

function renderTopologyStage(svgHtml: string): string {
  return (
    '<div class="viz"><div class="vsvg-wrap">' +
      '<div class="vsvg-toolbar" role="toolbar" aria-label="拓扑缩放控制">' +
        '<button type="button" class="vsvg-btn" data-vsvg-zoom="out" title="缩小">-</button>' +
        '<button type="button" class="vsvg-btn vsvg-btn-reset" data-vsvg-zoom="reset" title="重置缩放">1:1</button>' +
        '<button type="button" class="vsvg-btn" data-vsvg-zoom="in" title="放大">+</button>' +
      '</div>' +
      '<div class="vsvg-stage">' + svgHtml + '</div>' +
    '</div></div>'
  );
}

function mapListItems(
  arr: readonly unknown[] | null | undefined,
  render: (val: unknown, idx: number) => string,
  d?: Frame | null,
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
  const MAX = 20;
  const HEAD = 10;
  const TAIL = 5;
  if (!arr || arr.length <= MAX) return (arr || []).map((x: unknown, i: number) => render(x, i)).join('');
  const total = (d && typeof d.total === 'number' && d.total >= arr.length) ? d.total : arr.length;
  const hidden = Math.max(1, total - HEAD - TAIL);
  const head = arr.slice(0, HEAD).map((x: unknown, i: number) => render(x, i)).join('');
  const tailStart = total - TAIL;
  const tail = arr.slice(arr.length - TAIL).map((x: unknown, i: number) => render(x, tailStart + i)).join('');
  return head + '<div class="vmore" title="省略 ' + hidden + ' 项">…<span class="vmore-cnt">+' + hidden + '</span></div>' + tail;
}

export function vizList(d: Frame | null | undefined): string | null {
  if (!d || !d.items || !d.items.length) return null;
  const total = (typeof d.total === 'number' && d.total > 0) ? d.total : d.items.length;
  const ptrs = d.pointers;
  return '<div class="viz"><div class="viz-row">' + mapListItems(d.items, (val: unknown, k: number) => {
    const pTag = (ptrs && ptrs[k] && ptrs[k].length)
      ? '<span class="sub-tag ptr-tag">' + esc(ptrs[k].slice(0, 2).join(',')) + '</span>'
      : '';
    return '<div class="vpair"><span class="vcell' + (d.hot === k ? ' hot' : '') + '">' + pTag + esc(val) + '</span>' +
      (k < total - 1 ? '<span class="varr">→</span>' : '<span class="varr">→</span><span class="vempty">null</span>') +
      '</div>';
  }, d) + '</div></div>';
}

export function vizTree(d: Frame | null | undefined): string | null {
  if (!d || !d.nodes || !d.nodes.length) return null;
  const root = typeof d.root === 'number' ? d.root : 0;
  const layout = computeTreeLayout(d.nodes, root);
  if (layout.nodes.length === 0) return null;

  const edgesSvg = layout.edges.map((edge) =>
    `<line class="vsvg-edge" x1="${edge.x1}" y1="${edge.y1}" x2="${edge.x2}" y2="${edge.y2}"/>`
  ).join('');

  const nodesSvg = layout.nodes.map((node) => {
    const cls = d.hot === node.index
      ? 'vsvg-node hot'
      : (node.index === layout.rootIndex ? 'vsvg-node mark' : 'vsvg-node');
    const shortTxt = formatCircleText(node.val);
    const fullStr = String(node.val);
    const titleEl = fullStr.length > 6 ? `<title>${esc(fullStr)}</title>` : '';
    return `<g><circle class="${cls}" cx="${node.x}" cy="${node.y}" r="14"/>${titleEl}<text class="vsvg-txt" x="${node.x}" y="${node.y}">${esc(shortTxt)}</text></g>`;
  }).join('');

  return renderTopologyStage(
    `<svg viewBox="${layout.viewBox}" width="${layout.width}" height="${layout.height}">${edgesSvg}${nodesSvg}</svg>`
  );
}

export function vizGraph(d: Frame | null | undefined): string | null {
  if (!d || !d.nodes || !d.nodes.length) return null;
  const directed = d.directed !== false;
  const layout = computeGraphLayout(d.nodes, d.edges || [], { directed });
  if (layout.nodes.length === 0) return null;

  arrowMarkerSeq += 1;
  const markerId = `vsvg-arrow-${arrowMarkerSeq}`;
  const defsSvg = layout.directed
    ? `<defs><marker id="${markerId}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1.5 L 8 5 L 0 8.5 z" class="vsvg-arrow-head"/></marker></defs>`
    : '';

  const edgesSvg = layout.edges.map((edge) => {
    const markerAttr = layout.directed ? ` marker-end="url(#${markerId})"` : '';
    const edgePath = `<path class="vsvg-edge" d="${edge.path}"${markerAttr}/>`;
    if (edge.label && !edge.isSelfLoop) {
      const mx = ((edge.x1 + edge.x2) / 2).toFixed(1);
      const my = ((edge.y1 + edge.y2) / 2 - 7).toFixed(1);
      return edgePath + `<text class="vsvg-edge-lbl" x="${mx}" y="${my}">${esc(edge.label)}</text>`;
    }
    return edgePath;
  }).join('');

  const nodesSvg = layout.nodes.map((node) => {
    const cls = d.hot === node.id
      ? 'vsvg-node hot'
      : (d.mark === node.id ? 'vsvg-node mark' : 'vsvg-node');
    const shortTxt = formatCircleText(node.label);
    const titleEl = node.label.length > 6 ? `<title>${esc(node.label)}</title>` : '';
    return `<g><circle class="${cls}" cx="${node.x}" cy="${node.y}" r="${node.r}"/>${titleEl}<text class="vsvg-txt" x="${node.x}" y="${node.y}">${esc(shortTxt)}</text></g>`;
  }).join('');

  return renderTopologyStage(
    `<svg viewBox="${layout.viewBox}" width="${layout.width}" height="${layout.height}">${defsSvg}${edgesSvg}${nodesSvg}</svg>`
  );
}

export function vizInterface(d: Frame | null | undefined): string | null {
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

export function vizTypeAlias(d: Frame | null | undefined): string | null {
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

export function bindTopologyInteractions(rootEl: HTMLElement | null | undefined): void {
  if (!rootEl || !(rootEl instanceof HTMLElement)) return;
  if (rootEl.dataset.topoBound === '1') return;
  rootEl.dataset.topoBound = '1';

  let activeDrag: {
    wrap: HTMLElement;
    stage: HTMLElement;
    startX: number;
    startY: number;
    origTx: number;
    origTy: number;
  } | null = null;

  const doc = rootEl.ownerDocument;

  const onDocMouseMove = (ev: MouseEvent) => {
    if (!activeDrag) return;
    if (!activeDrag.wrap.isConnected) {
      stopDrag();
      return;
    }
    const state = getTransform(activeDrag.wrap);
    state.tx = activeDrag.origTx + (ev.clientX - activeDrag.startX);
    state.ty = activeDrag.origTy + (ev.clientY - activeDrag.startY);
    applyStageTransform(activeDrag.wrap, state);
  };

  const stopDrag = () => {
    if (activeDrag) {
      activeDrag.stage.classList.remove('dragging');
      activeDrag = null;
    }
    if (doc) {
      doc.removeEventListener('mousemove', onDocMouseMove);
      doc.removeEventListener('mouseup', stopDrag);
    }
  };

  rootEl.addEventListener('click', (e: MouseEvent) => {
    if (!(e.target instanceof Element)) return;
    const btn = e.target.closest('[data-vsvg-zoom]');
    if (!(btn instanceof HTMLButtonElement) || !rootEl.contains(btn)) return;
    const wrap = btn.closest('.vsvg-wrap');
    if (!(wrap instanceof HTMLElement)) return;

    const action = btn.dataset.vsvgZoom;
    const state = getTransform(wrap);
    if (action === 'reset') {
      state.scale = 1;
      state.tx = 0;
      state.ty = 0;
    } else if (action === 'in') {
      state.scale = clampScale(state.scale * 1.25);
    } else if (action === 'out') {
      state.scale = clampScale(state.scale / 1.25);
    }
    applyStageTransform(wrap, state);
  });

  rootEl.addEventListener('wheel', (e: WheelEvent) => {
    if (!(e.target instanceof Element)) return;
    const wrap = e.target.closest('.vsvg-wrap');
    if (!(wrap instanceof HTMLElement) || !rootEl.contains(wrap)) return;
    e.preventDefault();

    const state = getTransform(wrap);
    const prevScale = state.scale;
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const nextScale = clampScale(prevScale * factor);
    if (Math.abs(nextScale - prevScale) < 1e-4) return;

    const rect = wrap.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const ratio = nextScale / prevScale;
    state.tx = dx - (dx - state.tx) * ratio;
    state.ty = dy - (dy - state.ty) * ratio;
    state.scale = nextScale;
    applyStageTransform(wrap, state);
  }, { passive: false });

  rootEl.addEventListener('mousedown', (e: MouseEvent) => {
    if (e.button !== 0) return;
    if (!(e.target instanceof Element)) return;
    if (e.target.closest('.vsvg-toolbar')) return;
    const stage = e.target.closest('.vsvg-stage');
    const wrap = e.target.closest('.vsvg-wrap');
    if (!(stage instanceof HTMLElement) || !(wrap instanceof HTMLElement) || !rootEl.contains(wrap)) return;

    e.preventDefault();
    const state = getTransform(wrap);
    activeDrag = {
      wrap,
      stage,
      startX: e.clientX,
      startY: e.clientY,
      origTx: state.tx,
      origTy: state.ty,
    };
    stage.classList.add('dragging');
    if (doc) {
      doc.addEventListener('mousemove', onDocMouseMove);
      doc.addEventListener('mouseup', stopDrag);
    }
  });
}
