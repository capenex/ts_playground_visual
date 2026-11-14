/* ================================================================
   Canvas 1080p Frame Renderer, Sample Loader & Boot Logic (src/ui/share.ts)
   ================================================================ */
import { formatFunctionTypeSignature } from "../compiler/tc-types";
import { SAMPLES, SAMPLE_DEFAULT_STEP } from "../samples/ts-samples";
import { appState, registerUiHooks, VIDEO_HEIGHT, VIDEO_WIDTH } from "../state";
import { Diag, Frame, StepAnim } from "../types";
import { safeJSONStringify } from "../utils/format";
import { clearLog, resetTraceState } from "../runtime/event-loop";
import { startDebug, generateTrace } from "../runtime/runner";
import {
  allocateSlotSpans,
  discoverVars,
  DiscoveredVar,
  evaluateCustomWatch,
  getActiveFrame,
  watchIdForExpr,
} from "../viz/memory-normalizers";
import {
  collectDeclaredNames,
  collectDeclaredTypeNames,
  findExprSpan,
  HIGHLIGHT_BUILTINS,
  liveTypeDiags,
  updateEditorChrome,
} from "../viz/highlight";
import { computeGraphLayout, computeTreeLayout, GraphLayoutEdge } from "../viz/svg-layout";
import { setFileName } from "./controls";
import { $, editor } from "./dom";

export interface CanvasCodeToken {
  text: string;
  color: string;
}

const TS_TYPE_WORDS = new Set([
  'number', 'string', 'boolean', 'void', 'any', 'unknown', 'never', 'bigint', 'symbol', 'object',
  'Omit', 'Pick', 'Partial', 'Required', 'Readonly', 'ReadonlyArray', 'Record',
  'Exclude', 'Extract', 'NonNullable', 'ReturnType', 'Parameters', 'Awaited',
]);

export function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  if (typeof ctx.quadraticCurveTo !== 'function' || rad <= 0) {
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    return;
  }
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

export function tokenizeCodeForCanvas(
  line: string,
  customTypes?: Set<string> | null,
  declared?: Set<string> | null,
): CanvasCodeToken[] {
  const re = /(\/\/.*$|\/\*.*?\*\/)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b(function|const|let|var|new|class|extends|implements|typeof|instanceof|import|export|from|async|await|interface|type|enum|as|satisfies|readonly|public|private|protected|abstract|static|declare|keyof|infer|is|in|of|default)\b|\b(for|if|else|return|while|do|switch|case|break|continue|try|catch|finally|throw|yield)\b|\b(number|string|boolean|void|any|unknown|never|bigint|symbol|object|Omit|Pick|Partial|Required|Readonly|ReadonlyArray|Record|Exclude|Extract|NonNullable|ReturnType|Parameters|Awaited|Math|Map|Set|Array|Object|JSON|Number|String|Boolean|Promise|Error|RegExp|Date)\b|\b(true|false|null|undefined|NaN|Infinity|0x[\da-fA-F]+|\d+(?:\.\d+)?)\b|(\b[A-Za-z_$][\w$]*)(?=\s*\()|(?<=\.)([A-Za-z_$][\w$]*)\b|([{,][ \t]*)([A-Za-z_$][\w$]*)(?=[ \t]*\??:)|(^[ \t]*)([A-Za-z_$][\w$]*)(?=[ \t]*\??:)|\b([A-Za-z_$][\w$]*)\b|(===|!==|>=|<=|=>|&&|\|\||\+\+|--|\?\?|\?\.|\.\.\.)/g;
  const tokens: CanvasCodeToken[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let prevKeyword = '';

  while ((m = re.exec(line))) {
    if (m.index > last) {
      const gap = line.slice(last, m.index);
      if (gap.trim()) prevKeyword = '';
      tokens.push({ text: gap, color: '#d8e2ef' });
    }
    if (m[1]) {
      tokens.push({ text: m[1], color: '#637488' });
      prevKeyword = '';
    } else if (m[2]) {
      tokens.push({ text: m[2], color: '#9ece6a' });
      prevKeyword = '';
    } else if (m[3]) {
      tokens.push({ text: m[3], color: '#ff7b72' });
      prevKeyword = m[3];
    } else if (m[4]) {
      tokens.push({ text: m[4], color: '#c792ea' });
      prevKeyword = '';
    } else if (m[5]) {
      const color = HIGHLIGHT_BUILTINS.has(m[5]) && !TS_TYPE_WORDS.has(m[5]) ? '#38bdf8' : '#4ec9b0';
      tokens.push({ text: m[5], color });
      prevKeyword = '';
    } else if (m[6]) {
      tokens.push({ text: m[6], color: '#ffb454' });
      prevKeyword = '';
    } else if (m[7]) {
      const id = m[7];
      const isMethod = m.index > 0 && line[m.index - 1] === '.';
      let color = '#79c0ff';
      if (!isMethod && (prevKeyword === 'new' || prevKeyword === 'class' || (customTypes && customTypes.has(id)))) {
        color = '#4ec9b0';
      } else if (!isMethod && HIGHLIGHT_BUILTINS.has(id)) {
        color = '#38bdf8';
      } else if (declared && !isMethod && !declared.has(id)) {
        color = '#79c0ff';
      }
      tokens.push({ text: id, color });
      prevKeyword = '';
    } else if (m[8]) {
      tokens.push({ text: m[8], color: '#9cdcfe' });
      prevKeyword = '';
    } else if (m[9] !== undefined && m[10]) {
      tokens.push({ text: m[9], color: '#d8e2ef' });
      tokens.push({ text: m[10], color: '#9cdcfe' });
      prevKeyword = '';
    } else if (m[11] !== undefined && m[12]) {
      tokens.push({ text: m[11], color: '#d8e2ef' });
      tokens.push({ text: m[12], color: '#9cdcfe' });
      prevKeyword = '';
    } else if (m[13]) {
      const id = m[13];
      const isDeclTypePos =
        prevKeyword === 'interface' ||
        prevKeyword === 'type' ||
        prevKeyword === 'class' ||
        prevKeyword === 'enum' ||
        prevKeyword === 'extends' ||
        prevKeyword === 'implements';
      let color = '#d8e2ef';
      if (isDeclTypePos || (customTypes && customTypes.has(id))) {
        color = '#4ec9b0';
      } else if (HIGHLIGHT_BUILTINS.has(id) && (!declared || !declared.has(id))) {
        color = '#38bdf8';
      } else if (!declared || declared.has(id)) {
        color = '#9cdcfe';
      }
      tokens.push({ text: id, color });
      prevKeyword = '';
    } else if (m[14]) {
      tokens.push({ text: m[14], color: '#89ddff' });
      prevKeyword = '';
    } else {
      tokens.push({ text: m[0], color: '#d8e2ef' });
      prevKeyword = '';
    }
    last = m.index + m[0].length;
  }

  if (last < line.length) {
    tokens.push({ text: line.slice(last), color: '#d8e2ef' });
  }
  return tokens;
}

function fitText(ctx: CanvasRenderingContext2D, raw: string, maxW: number): string {
  if (maxW <= 8) return '';
  if (ctx.measureText(raw).width <= maxW) return raw;
  let lo = 0;
  let hi = raw.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const candidate = raw.slice(0, mid) + '…';
    if (ctx.measureText(candidate).width <= maxW) lo = mid;
    else hi = mid - 1;
  }
  return lo > 0 ? raw.slice(0, lo) + '…' : '…';
}

function formatCircleLabel(raw: unknown): string {
  const s = String(raw);
  return s.length <= 6 ? s : s.slice(0, 5) + '…';
}

function drawBadgePill(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  h: number,
  bg: string,
  border: string,
  fg: string,
  font = '600 10px "Cascadia Code", Consolas, monospace',
): number {
  ctx.font = font;
  const padX = 7;
  const pw = Math.ceil(ctx.measureText(text).width + padX * 2);
  roundRectPath(ctx, x, y, pw, h, Math.min(8, h / 2));
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.strokeStyle = border;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = fg;
  ctx.fillText(text, x + padX, y + Math.round(h * 0.68));
  return pw;
}

function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  tipX: number,
  tipY: number,
  angle: number,
  size: number,
  color: string,
) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(tipX - Math.cos(angle - 0.45) * size, tipY - Math.sin(angle - 0.45) * size);
  ctx.lineTo(tipX - Math.cos(angle + 0.45) * size, tipY - Math.sin(angle + 0.45) * size);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function drawScaledGraphEdge(
  ctx: CanvasRenderingContext2D,
  edge: GraphLayoutEdge,
  tx: (px: number) => number,
  ty: (py: number) => number,
  scale: number,
  directed: boolean,
  isHotEdge: boolean,
) {
  const strokeColor = isHotEdge ? '#ffb454' : '#475569';
  const nums = (edge.path.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = isHotEdge ? 1.8 : 1.4;
  ctx.beginPath();

  let endAngle = Math.atan2(edge.y2 - edge.y1, edge.x2 - edge.x1);
  let lblX = (edge.x1 + edge.x2) / 2;
  let lblY = (edge.y1 + edge.y2) / 2 - 6;

  if (edge.isSelfLoop && nums.length >= 8 && typeof ctx.bezierCurveTo === 'function') {
    const [x0 = 0, y0 = 0, cx1 = 0, cy1 = 0, cx2 = 0, cy2 = 0, ex = 0, ey = 0] = nums;
    ctx.moveTo(tx(x0), ty(y0));
    ctx.bezierCurveTo(tx(cx1), ty(cy1), tx(cx2), ty(cy2), tx(ex), ty(ey));
    endAngle = Math.atan2(ey - cy2, ex - cx2);
    lblX = 0.125 * x0 + 0.375 * cx1 + 0.375 * cx2 + 0.125 * ex;
    lblY = 0.125 * y0 + 0.375 * cy1 + 0.375 * cy2 + 0.125 * ey - 6;
  } else if (edge.isCurved && nums.length >= 6 && typeof ctx.quadraticCurveTo === 'function') {
    const [x0 = 0, y0 = 0, cx = 0, cy = 0, ex = 0, ey = 0] = nums;
    ctx.moveTo(tx(x0), ty(y0));
    ctx.quadraticCurveTo(tx(cx), ty(cy), tx(ex), ty(ey));
    endAngle = Math.atan2(ey - cy, ex - cx);
    lblX = 0.25 * x0 + 0.5 * cx + 0.25 * ex;
    lblY = 0.25 * y0 + 0.5 * cy + 0.25 * ey - 6;
  } else {
    ctx.moveTo(tx(edge.x1), ty(edge.y1));
    ctx.lineTo(tx(edge.x2), ty(edge.y2));
  }
  ctx.stroke();

  if (directed) {
    const arrowSz = Math.max(5.5, Math.min(8.5, 6.8 * scale));
    drawArrowHead(ctx, tx(edge.x2), ty(edge.y2), endAngle, arrowSz, strokeColor);
  }

  if (edge.label && !edge.isSelfLoop) {
    ctx.font = '600 9px "Cascadia Code", Consolas, monospace';
    ctx.fillStyle = isHotEdge ? '#fde68a' : '#94a3b8';
    const lw = ctx.measureText(edge.label).width;
    ctx.fillText(edge.label, tx(lblX) - lw / 2, ty(lblY));
  }
}

interface LinearEntry {
  gap: boolean;
  count?: number;
  idx: number;
  val: unknown;
}

function buildLinearEntries(
  items: readonly unknown[],
  d: Frame,
  maxShow: number,
): { entries: LinearEntry[]; truncatedEnd: boolean } {
  if (Array.isArray(d.windowed) && d.windowed.length > 0) {
    return {
      entries: d.windowed.map((w) =>
        w && w.gap
          ? { gap: true, count: w.count ?? 1, idx: -1, val: null }
          : { gap: false, idx: w.idx ?? 0, val: w.val },
      ),
      truncatedEnd: false,
    };
  }
  const total = typeof d.total === 'number' && d.total >= items.length ? d.total : items.length;
  if (items.length <= maxShow) {
    return {
      entries: items.map((val, idx) => ({ gap: false, idx, val })),
      truncatedEnd: total > items.length,
    };
  }
  const headCnt = Math.max(2, Math.floor((maxShow - 1) * 0.65));
  const tailCnt = Math.max(1, maxShow - 1 - headCnt);
  const hidden = Math.max(1, total - headCnt - tailCnt);
  const out: LinearEntry[] = [];
  for (let i = 0; i < headCnt; i++) {
    out.push({ gap: false, idx: i, val: items[i] });
  }
  out.push({ gap: true, count: hidden, idx: -1, val: null });
  const tailStart = total - tailCnt;
  for (let i = 0; i < tailCnt; i++) {
    const arrIdx = items.length - tailCnt + i;
    out.push({ gap: false, idx: tailStart + i, val: items[arrIdx] });
  }
  return { entries: out, truncatedEnd: false };
}

function drawTreeCard(
  ctx: CanvasRenderingContext2D,
  bx: number,
  by: number,
  bw: number,
  bh: number,
  d: Frame,
) {
  const root = typeof d.root === 'number' ? d.root : 0;
  const layout = computeTreeLayout(d.nodes, root);
  if (layout.nodes.length === 0) {
    ctx.font = '500 12px "Cascadia Code", Consolas, monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText('empty', bx + 2, by + 18);
    return;
  }
  const scale = Math.min(bw / Math.max(1, layout.width), bh / Math.max(1, layout.height));
  const drawW = layout.width * scale;
  const drawH = layout.height * scale;
  const ox = bx + (bw - drawW) / 2;
  const oy = by + (bh - drawH) / 2;
  const tx = (px: number) => ox + px * scale;
  const ty = (py: number) => oy + py * scale;
  const nodeR = Math.max(7.5, Math.min(16, 14 * scale));

  for (const edge of layout.edges) {
    const isHotEdge = d.hot === edge.to || d.hot === edge.from;
    ctx.strokeStyle = isHotEdge ? 'rgba(255,180,84,0.65)' : '#334155';
    ctx.lineWidth = isHotEdge ? 1.8 : 1.4;
    ctx.beginPath();
    ctx.moveTo(tx(edge.x1), ty(edge.y1));
    ctx.lineTo(tx(edge.x2), ty(edge.y2));
    ctx.stroke();
  }

  for (const node of layout.nodes) {
    const isNodeHot = d.hot === node.index;
    const isRoot = node.index === layout.rootIndex;
    const nx = tx(node.x);
    const ny = ty(node.y);
    ctx.beginPath();
    ctx.arc(nx, ny, nodeR, 0, Math.PI * 2);
    ctx.fillStyle = isNodeHot ? '#2a1f10' : (isRoot ? '#111d30' : '#121823');
    ctx.fill();
    ctx.strokeStyle = isNodeHot ? '#ffb454' : (isRoot ? '#60a5fa' : '#334155');
    ctx.lineWidth = isNodeHot ? 1.8 : 1.5;
    ctx.stroke();

    const fontSize = Math.max(8, Math.min(12, Math.round(nodeR * 0.85)));
    ctx.font = `700 ${fontSize}px "Cascadia Code", Consolas, monospace`;
    ctx.fillStyle = isNodeHot ? '#ffb454' : '#f7f9fc';
    const txt = formatCircleLabel(node.val);
    ctx.fillText(txt, nx - ctx.measureText(txt).width / 2, ny + Math.round(fontSize * 0.35));
  }
}

function drawGraphCard(
  ctx: CanvasRenderingContext2D,
  bx: number,
  by: number,
  bw: number,
  bh: number,
  d: Frame,
) {
  const directed = d.directed !== false;
  const layout = computeGraphLayout(d.nodes, d.edges || [], { directed });
  if (layout.nodes.length === 0) {
    ctx.font = '500 12px "Cascadia Code", Consolas, monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText('empty', bx + 2, by + 18);
    return;
  }
  const scale = Math.min(bw / Math.max(1, layout.width), bh / Math.max(1, layout.height));
  const drawW = layout.width * scale;
  const drawH = layout.height * scale;
  const ox = bx + (bw - drawW) / 2;
  const oy = by + (bh - drawH) / 2;
  const tx = (px: number) => ox + px * scale;
  const ty = (py: number) => oy + py * scale;

  for (const edge of layout.edges) {
    const isHotEdge = d.hot === edge.from || d.hot === edge.to;
    drawScaledGraphEdge(ctx, edge, tx, ty, scale, layout.directed, isHotEdge);
  }

  for (const node of layout.nodes) {
    const isNodeHot = d.hot === node.id;
    const isNodeMark = !isNodeHot && d.mark === node.id;
    const nodeR = Math.max(7.5, Math.min(16, node.r * scale));
    const nx = tx(node.x);
    const ny = ty(node.y);
    ctx.beginPath();
    ctx.arc(nx, ny, nodeR, 0, Math.PI * 2);
    ctx.fillStyle = isNodeHot ? '#2a1f10' : (isNodeMark ? '#111d30' : '#121823');
    ctx.fill();
    ctx.strokeStyle = isNodeHot ? '#ffb454' : (isNodeMark ? '#60a5fa' : '#334155');
    ctx.lineWidth = isNodeHot || isNodeMark ? 1.8 : 1.5;
    ctx.stroke();

    const fontSize = Math.max(8, Math.min(12, Math.round(nodeR * 0.85)));
    ctx.font = `700 ${fontSize}px "Cascadia Code", Consolas, monospace`;
    ctx.fillStyle = isNodeHot ? '#ffb454' : (isNodeMark ? '#93c5fd' : '#f7f9fc');
    const txt = formatCircleLabel(node.label);
    ctx.fillText(txt, nx - ctx.measureText(txt).width / 2, ny + Math.round(fontSize * 0.35));
  }
}

function drawGridCard(
  ctx: CanvasRenderingContext2D,
  bx: number,
  by: number,
  bw: number,
  bh: number,
  d: Frame,
) {
  const depSet = new Set((d.deps || []).map((p: [number, number]) => `${p[0]},${p[1]}`));
  const markR = Array.isArray(d.mark) ? d.mark[0] : null;
  const markC = Array.isArray(d.mark) ? d.mark[1] : null;

  const isWindowed = Array.isArray(d.rowIndices) && Array.isArray(d.colIndices) && Array.isArray(d.viewCells);
  const rawCells = d.cells || [];
  const rIdxs: number[] = isWindowed && d.rowIndices
    ? d.rowIndices
    : Array.from({ length: Math.min(rawCells.length, 6) }, (_, i) => i);
  const cIdxs: number[] = isWindowed && d.colIndices
    ? d.colIndices
    : Array.from({ length: Math.min((rawCells[0] || []).length, 10) }, (_, i) => i);
  const matrixRows: unknown[][] = isWindowed && d.viewCells ? d.viewCells : rawCells;

  const colTracks: Array<{ gap: true } | { gap: false; c: number; ci: number }> = [];
  for (let ci = 0; ci < cIdxs.length; ci++) {
    const curC = cIdxs[ci] ?? 0;
    const prevC = cIdxs[ci - 1] ?? 0;
    if (ci > 0 && curC > prevC + 1) colTracks.push({ gap: true });
    colTracks.push({ gap: false, c: curC, ci });
  }

  const rowTracks: Array<{ gap: true } | { gap: false; r: number; ri: number }> = [];
  for (let ri = 0; ri < rIdxs.length; ri++) {
    const curR = rIdxs[ri] ?? 0;
    const prevR = rIdxs[ri - 1] ?? 0;
    if (ri > 0 && curR > prevR + 1) rowTracks.push({ gap: true });
    rowTracks.push({ gap: false, r: curR, ri });
  }

  const totalCols = colTracks.length + 1;
  const totalRows = rowTracks.length + 1;
  const gap = 2;
  const cellH = Math.max(13, Math.min(25, Math.floor((bh - (totalRows - 1) * gap) / Math.max(1, totalRows))));
  const cellW = Math.max(18, Math.min(34, Math.floor((bw - (totalCols - 1) * gap) / Math.max(1, totalCols))));
  const startX = bx + Math.max(0, Math.floor((bw - (totalCols * cellW + (totalCols - 1) * gap)) / 2));
  const fontSize = cellH >= 20 ? 10 : 9;

  // Header row (r\c + column indices)
  roundRectPath(ctx, startX, by, cellW, cellH, 3);
  ctx.fillStyle = '#0d131d';
  ctx.fill();
  ctx.font = `600 ${Math.max(8, fontSize - 1)}px "Cascadia Code", Consolas, monospace`;
  ctx.fillStyle = '#64748b';
  const rcTxt = 'r\\c';
  ctx.fillText(rcTxt, startX + (cellW - ctx.measureText(rcTxt).width) / 2, by + cellH * 0.68);

  colTracks.forEach((ct, idx) => {
    const gx = startX + (idx + 1) * (cellW + gap);
    if (ct.gap) {
      ctx.fillStyle = '#475569';
      ctx.fillText('⋯', gx + (cellW - ctx.measureText('⋯').width) / 2, by + cellH * 0.68);
      return;
    }
    const isFocusCol = markC === ct.c;
    roundRectPath(ctx, gx, by, cellW, cellH, 3);
    ctx.fillStyle = isFocusCol ? 'rgba(56,189,248,0.16)' : '#0d131d';
    ctx.fill();
    ctx.strokeStyle = isFocusCol ? 'rgba(56,189,248,0.6)' : '#1c2432';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = isFocusCol ? '#7dd3fc' : '#64748b';
    const cStr = String(ct.c);
    ctx.fillText(cStr, gx + (cellW - ctx.measureText(cStr).width) / 2, by + cellH * 0.68);
  });

  rowTracks.forEach((rt, rDisplayIdx) => {
    const gy = by + (rDisplayIdx + 1) * (cellH + gap);
    if (gy + cellH > by + bh + 2) return;
    if (rt.gap) {
      ctx.font = `600 ${fontSize}px "Cascadia Code", Consolas, monospace`;
      ctx.fillStyle = '#475569';
      ctx.fillText('⋮', startX + (cellW - ctx.measureText('⋮').width) / 2, gy + cellH * 0.68);
      colTracks.forEach((ct, idx) => {
        const gx = startX + (idx + 1) * (cellW + gap);
        const sym = ct.gap ? '⋱' : '⋮';
        ctx.fillText(sym, gx + (cellW - ctx.measureText(sym).width) / 2, gy + cellH * 0.68);
      });
      return;
    }

    const realR = rt.r;
    const isFocusRow = markR === realR;
    roundRectPath(ctx, startX, gy, cellW, cellH, 3);
    ctx.fillStyle = isFocusRow ? 'rgba(56,189,248,0.16)' : '#0d131d';
    ctx.fill();
    ctx.strokeStyle = isFocusRow ? 'rgba(56,189,248,0.6)' : '#1c2432';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.font = `600 ${Math.max(8, fontSize - 1)}px "Cascadia Code", Consolas, monospace`;
    ctx.fillStyle = isFocusRow ? '#7dd3fc' : '#64748b';
    const rStr = String(realR);
    ctx.fillText(rStr, startX + (cellW - ctx.measureText(rStr).width) / 2, gy + cellH * 0.68);

    const rowVals = matrixRows[rt.ri] || [];
    colTracks.forEach((ct, idx) => {
      const gx = startX + (idx + 1) * (cellW + gap);
      if (ct.gap) {
        ctx.fillStyle = '#475569';
        ctx.fillText('⋯', gx + (cellW - ctx.measureText('⋯').width) / 2, gy + cellH * 0.68);
        return;
      }
      const realC = ct.c;
      const isHotCell = markR === realR && markC === realC;
      const isDepCell = !isHotCell && depSet.has(`${realR},${realC}`);
      roundRectPath(ctx, gx, gy, cellW, cellH, 4);
      ctx.fillStyle = isHotCell
        ? 'rgba(255,180,84,0.24)'
        : (isDepCell ? 'rgba(56,189,248,0.16)' : '#121823');
      ctx.fill();
      ctx.strokeStyle = isHotCell ? '#ffb454' : (isDepCell ? '#38bdf8' : '#222b38');
      ctx.lineWidth = isHotCell || isDepCell ? 1.4 : 1;
      ctx.stroke();

      const val = rowVals[ct.ci];
      const vStr = val === undefined || val === null ? '·' : fitText(ctx, String(val), cellW - 4);
      ctx.font = `${isHotCell ? '700' : '600'} ${fontSize}px "Cascadia Code", Consolas, monospace`;
      ctx.fillStyle = isHotCell ? '#ffb454' : (isDepCell ? '#7dd3fc' : (val === undefined || val === null ? '#475569' : '#cbd5e1'));
      ctx.fillText(vStr, gx + (cellW - ctx.measureText(vStr).width) / 2, gy + cellH * 0.68);
    });
  });
}

function drawListCard(
  ctx: CanvasRenderingContext2D,
  bx: number,
  by: number,
  bw: number,
  bh: number,
  d: Frame,
) {
  const items = d.items || [];
  if (!items.length && !(Array.isArray(d.windowed) && d.windowed.length)) {
    ctx.font = '500 12px "Cascadia Code", Consolas, monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText('null', bx + 4, by + 22);
    return;
  }
  const arrowW = 20;
  const nullW = 36;
  const maxFit = Math.max(3, Math.floor((bw - nullW) / 68));
  const { entries, truncatedEnd } = buildLinearEntries(items, d, maxFit);
  const gapCount = entries.filter(e => e.gap).length;
  const nodeCount = entries.length - gapCount;
  const gapPillW = 38;
  const reservedW = (entries.length - (truncatedEnd ? 1 : 0)) * arrowW + (truncatedEnd ? 0 : nullW) + gapCount * gapPillW;
  const nodeW = Math.min(54, Math.max(34, Math.floor((bw - reservedW) / Math.max(1, nodeCount))));
  const nodeH = Math.min(34, Math.max(24, bh - 26));
  const ptrReserve = 18;
  const cy = by + ptrReserve + Math.max(2, Math.floor((bh - ptrReserve - nodeH) / 2));

  let curX = bx;
  const ptrs = d.pointers;
  entries.forEach((entry, pos) => {
    if (entry.gap) {
      if (curX + gapPillW > bx + bw) return;
      drawBadgePill(ctx, `…+${entry.count ?? 1}`, curX, cy + (nodeH - 22) / 2, 22, '#101622', '#263244', '#94a3b8');
      curX += gapPillW;
    } else {
      if (curX + nodeW > bx + bw) return;
      const idx = entry.idx;
      const isHot = d.hot === idx;
      const isMark = !isHot && d.mark === idx;
      const ptrList = ptrs ? ptrs[idx] : undefined;
      if (ptrList && ptrList.length > 0) {
        const ptrLabel = ptrList.slice(0, 2).join(',');
        const pw = drawBadgePill(ctx, ptrLabel, curX, cy - 20, 15, 'rgba(56,189,248,0.16)', 'rgba(56,189,248,0.6)', '#7dd3fc', '700 9px "Cascadia Code", Consolas, monospace');
        ctx.strokeStyle = 'rgba(56,189,248,0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(curX + Math.min(nodeW / 2, pw / 2), cy - 5);
        ctx.lineTo(curX + nodeW / 2, cy);
        ctx.stroke();
      }
      roundRectPath(ctx, curX, cy - (isHot ? 2 : 0), nodeW, nodeH, 6);
      ctx.fillStyle = isHot ? 'rgba(255,180,84,0.22)' : (isMark ? 'rgba(96,165,250,0.16)' : '#121823');
      ctx.fill();
      ctx.strokeStyle = isHot ? '#ffb454' : (isMark ? '#60a5fa' : '#2c3a4f');
      ctx.lineWidth = isHot ? 1.7 : 1.1;
      ctx.stroke();

      ctx.font = '700 12px "Cascadia Code", Consolas, monospace';
      ctx.fillStyle = isHot ? '#ffb454' : '#f7f9fc';
      const valStr = fitText(ctx, String(entry.val), nodeW - 8);
      ctx.fillText(valStr, curX + (nodeW - ctx.measureText(valStr).width) / 2, cy + nodeH * 0.62);
      curX += nodeW;
    }

    const isLast = pos === entries.length - 1;
    if (!isLast || !truncatedEnd) {
      if (curX + arrowW <= bx + bw) {
        const midY = cy + nodeH / 2;
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(curX + 2, midY);
        ctx.lineTo(curX + arrowW - 5, midY);
        ctx.stroke();
        drawArrowHead(ctx, curX + arrowW - 2, midY, 0, 5, '#64748b');
        curX += arrowW;
      }
    }
  });

  if (!truncatedEnd && curX + nullW <= bx + bw + 4) {
    drawBadgePill(ctx, 'null', curX, cy + (nodeH - 22) / 2, 22, '#0d121b', '#222c3c', '#64748b');
  }
}

function draw1DCollectionCard(
  ctx: CanvasRenderingContext2D,
  bx: number,
  by: number,
  bw: number,
  bh: number,
  d: Frame,
  kind: string,
) {
  const items = d.items || [];
  if (!items.length && !(Array.isArray(d.windowed) && d.windowed.length)) return;
  const maxShow = Math.max(4, Math.floor(bw / 46));
  const { entries } = buildLinearEntries(items, d, maxShow);
  const gapCount = entries.filter(e => e.gap).length;
  const cellCount = entries.length - gapCount;
  const cellGap = 6;
  const gapW = 36;
  const availW = bw - gapCount * (gapW + cellGap) - Math.max(0, cellCount - 1) * cellGap;
  const cw = kind === 'string'
    ? Math.min(30, Math.max(20, Math.floor(availW / Math.max(1, cellCount))))
    : Math.min(48, Math.max(28, Math.floor(availW / Math.max(1, cellCount))));
  const ch = 36;
  const hasTopTags = Boolean(d.pointers || kind === 'queue' || kind === 'heap' || kind === 'uf' || d.win);
  const topPad = hasTopTags ? 16 : 4;
  const cy = by + topPad + Math.max(0, Math.floor((bh - topPad - ch - 12) / 2));

  const total = typeof d.total === 'number' && d.total > 0 ? d.total : items.length;
  const ptrs = d.pointers;
  let curX = bx;
  let winMinX = Infinity;
  let winMaxX = -Infinity;

  const cellPositions: Array<{ entry: LinearEntry; x: number; w: number }> = [];
  for (const entry of entries) {
    const w = entry.gap ? gapW : cw;
    if (curX + w > bx + bw + 2) break;
    cellPositions.push({ entry, x: curX, w });
    if (!entry.gap && d.win && entry.idx >= d.win[0] && entry.idx <= d.win[1]) {
      winMinX = Math.min(winMinX, curX);
      winMaxX = Math.max(winMaxX, curX + w);
    }
    curX += w + cellGap;
  }

  // Draw sliding window [l..r] bracket frame behind cells
  if (d.win && Number.isFinite(winMinX) && Number.isFinite(winMaxX)) {
    roundRectPath(ctx, winMinX - 3, cy - 4, winMaxX - winMinX + 6, ch + 8, 8);
    ctx.fillStyle = 'rgba(56,189,248,0.08)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(56,189,248,0.55)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  for (const pos of cellPositions) {
    const { entry, x: cx, w } = pos;
    if (entry.gap) {
      drawBadgePill(ctx, `…+${entry.count ?? 1}`, cx, cy + 7, 22, '#101622', '#263244', '#94a3b8');
      continue;
    }
    const i = entry.idx;
    const val = entry.val;
    const isHot = d.hot === i;
    const isWin = Boolean(d.win && i >= d.win[0] && i <= d.win[1]);
    const isMark = !isHot && (
      d.mark === i ||
      (kind === 'heap' && i === 0) ||
      (kind === 'queue' && i === 0) ||
      (kind === 'uf' && val === i)
    );

    let topTag = '';
    if (ptrs && ptrs[i] && ptrs[i].length > 0) {
      topTag = ptrs[i].slice(0, 2).join(',');
    } else if (kind === 'queue') {
      if (i === 0) topTag = 'front';
      else if (i === total - 1) topTag = 'back';
    } else if (kind === 'heap' && i === 0) {
      topTag = 'top';
    } else if (kind === 'uf') {
      topTag = val === i ? 'root' : `p:${String(val)}`;
    }

    if (topTag) {
      drawBadgePill(
        ctx,
        fitText(ctx, topTag, cw + 12),
        cx,
        cy - 17,
        14,
        isHot ? 'rgba(255,180,84,0.18)' : 'rgba(56,189,248,0.14)',
        isHot ? 'rgba(255,180,84,0.55)' : 'rgba(56,189,248,0.45)',
        isHot ? '#ffb454' : '#7dd3fc',
        '600 9px "Cascadia Code", Consolas, monospace',
      );
    }

    roundRectPath(ctx, cx, cy - (isHot ? 2 : 0), w, ch, 6);
    ctx.fillStyle = isHot ? 'rgba(255,180,84,0.22)' : (isWin ? 'rgba(56,189,248,0.14)' : '#121823');
    ctx.fill();
    ctx.strokeStyle = isHot ? '#ffb454' : (isMark ? 'rgba(96,165,250,0.75)' : (isWin ? 'rgba(56,189,248,0.65)' : '#253042'));
    ctx.lineWidth = isHot ? 1.8 : 1.1;
    ctx.stroke();

    ctx.font = '700 12px "Cascadia Code", Consolas, monospace';
    ctx.fillStyle = isHot ? '#ffb454' : '#f7f9fc';
    const valStr = fitText(ctx, String(val), w - 6);
    ctx.fillText(valStr, cx + Math.max(2, (w - ctx.measureText(valStr).width) / 2), cy + 18);

    ctx.font = '500 9px "Cascadia Code", Consolas, monospace';
    ctx.fillStyle = isHot ? '#ffb454' : '#64748b';
    const idxStr = String(i);
    ctx.fillText(idxStr, cx + (w - ctx.measureText(idxStr).width) / 2, cy + 31);
  }

  if (kind === 'heap' && cy + ch + 14 <= by + bh) {
    ctx.font = '500 9px "Cascadia Code", Consolas, monospace';
    ctx.fillStyle = '#475569';
    ctx.fillText('parent = (i - 1) >> 1 · left = 2i + 1', bx, by + bh - 2);
  }
}

function drawStackCard(
  ctx: CanvasRenderingContext2D,
  bx: number,
  by: number,
  bw: number,
  bh: number,
  d: Frame,
) {
  const all = d.items || [];
  if (!all.length) return;
  const total = typeof d.total === 'number' && d.total >= all.length ? d.total : all.length;
  const baseIdx = typeof d.baseIdx === 'number' ? d.baseIdx : Math.max(0, total - all.length);
  const rowH = 22;
  const rowGap = 4;
  const maxRows = Math.max(1, Math.floor((bh - 12) / (rowH + rowGap)));
  const sliceStart = Math.max(0, all.length - maxRows);
  const shown = all.slice(sliceStart);
  const hiddenCount = Math.max(0, total - shown.length);
  const cw = Math.min(180, bw - 34);

  shown.forEach((val: unknown, idx: number) => {
    const abs = baseIdx + sliceStart + idx;
    const isTop = abs === total - 1;
    const isHot = d.hot === abs;
    const ry = by + (shown.length - 1 - idx) * (rowH + rowGap);
    if (ry + rowH > by + bh) return;

    ctx.font = '500 9px "Cascadia Code", Consolas, monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText(String(abs), bx, ry + 15);

    roundRectPath(ctx, bx + 22, ry, cw, rowH, 5);
    ctx.fillStyle = isHot ? 'rgba(255,180,84,0.22)' : (isTop ? 'rgba(96,165,250,0.12)' : '#121823');
    ctx.fill();
    ctx.strokeStyle = isHot ? '#ffb454' : (isTop ? 'rgba(96,165,250,0.7)' : '#253042');
    ctx.lineWidth = isHot ? 1.6 : 1;
    ctx.stroke();

    ctx.font = '700 11px "Cascadia Code", Consolas, monospace';
    ctx.fillStyle = isHot ? '#ffb454' : '#f7f9fc';
    ctx.fillText(fitText(ctx, String(val), cw - 44), bx + 30, ry + 15);

    if (isTop) {
      ctx.font = '600 9px "Cascadia Code", Consolas, monospace';
      ctx.fillStyle = '#60a5fa';
      ctx.fillText('top', bx + 22 + cw - 26, ry + 15);
    }
  });

  if (hiddenCount > 0) {
    const bottomY = by + shown.length * (rowH + rowGap) + 10;
    if (bottomY <= by + bh) {
      ctx.font = '500 10px "Cascadia Code", Consolas, monospace';
      ctx.fillStyle = '#64748b';
      ctx.fillText(`…+${hiddenCount}`, bx + 26, bottomY);
    }
  }
}

function drawMapOrSetCard(
  ctx: CanvasRenderingContext2D,
  bx: number,
  by: number,
  bw: number,
  bh: number,
  d: Frame,
  kind: 'map' | 'set',
) {
  let curX = bx;
  let curY = by + 4;
  const pillH = 24;
  const rowStep = 30;

  if (kind === 'map') {
    const entries = d.entries || [];
    for (const e of entries.slice(0, 14)) {
      const kStr = String(e.k);
      const vStr = String(e.v);
      ctx.font = '600 11px "Cascadia Code", Consolas, monospace';
      const pairTxt = `${kStr} → ${vStr}`;
      const pw = Math.min(bw, Math.ceil(ctx.measureText(pairTxt).width + 20));
      if (curX + pw > bx + bw && curX > bx) {
        curX = bx;
        curY += rowStep;
      }
      if (curY + pillH > by + bh) break;
      const isHot = d.hot === e.k;
      roundRectPath(ctx, curX, curY, pw, pillH, 6);
      ctx.fillStyle = isHot ? 'rgba(255,180,84,0.2)' : '#121823';
      ctx.fill();
      ctx.strokeStyle = isHot ? '#ffb454' : '#253042';
      ctx.lineWidth = isHot ? 1.5 : 1;
      ctx.stroke();

      ctx.fillStyle = isHot ? '#ffb454' : '#93c5fd';
      const clippedK = fitText(ctx, kStr, pw - 24);
      ctx.fillText(clippedK, curX + 8, curY + 16);
      const kw = ctx.measureText(clippedK).width;
      ctx.fillStyle = '#64748b';
      ctx.fillText('→', curX + 12 + kw, curY + 16);
      ctx.fillStyle = isHot ? '#fde68a' : '#e2e8f0';
      const remW = pw - (24 + kw + 10);
      if (remW > 8) {
        ctx.fillText(fitText(ctx, vStr, remW), curX + 24 + kw, curY + 16);
      }
      curX += pw + 6;
    }
    return;
  }

  const items = d.items || [];
  for (const item of items.slice(0, 16)) {
    const valStr = String(item);
    ctx.font = '600 11px "Cascadia Code", Consolas, monospace';
    const pw = Math.min(bw, Math.ceil(ctx.measureText(valStr).width + 18));
    if (curX + pw > bx + bw && curX > bx) {
      curX = bx;
      curY += rowStep;
    }
    if (curY + pillH > by + bh) break;
    const isHot = d.hot === item;
    roundRectPath(ctx, curX, curY, pw, pillH, 6);
    ctx.fillStyle = isHot ? 'rgba(255,180,84,0.22)' : '#121823';
    ctx.fill();
    ctx.strokeStyle = isHot ? '#ffb454' : '#253042';
    ctx.lineWidth = isHot ? 1.5 : 1;
    ctx.stroke();
    ctx.fillStyle = isHot ? '#ffb454' : '#e2e8f0';
    ctx.fillText(fitText(ctx, valStr, pw - 12), curX + 9, curY + 16);
    curX += pw + 6;
  }
}

function drawInterfaceOrTypeCard(
  ctx: CanvasRenderingContext2D,
  bx: number,
  by: number,
  bw: number,
  bh: number,
  d: Frame,
  kind: string,
) {
  const isType = kind === 'type';
  let curY = by;

  // Compact sub-header badge row (keyword + title + role badge)
  const kwTxt = isType ? 'type' : (d.isClass ? 'class' : 'interface');
  const titleTxt = isType
    ? String(d.interfaceName || d.name || 'Type') + (d.typeParams || '')
    : (d.interfaceName && d.interfaceName !== 'object' ? String(d.interfaceName) : 'Object');
  const aliasKind = d.aliasKind ||
    (Array.isArray(d.unionBranches) && d.unionBranches.length > 1
      ? 'union'
      : (Array.isArray(d.fields) && d.fields.length > 0 ? 'object' : 'alias'));
  const isUtilityObj = isType && aliasKind === 'object' && Boolean(d.rawDef && !d.rawDef.trim().startsWith('{'));
  const roleBadge = isType
    ? (aliasKind === 'union'
      ? `union · ${(d.unionBranches || []).length}`
      : (isUtilityObj ? 'utility · object' : aliasKind))
    : (d.isSchema ? 'definition' : 'instance');

  const kwW = drawBadgePill(
    ctx,
    kwTxt,
    bx,
    curY,
    18,
    isType ? 'rgba(199,146,234,0.16)' : 'rgba(78,201,176,0.15)',
    isType ? 'rgba(199,146,234,0.5)' : 'rgba(78,201,176,0.45)',
    isType ? '#c792ea' : '#4ec9b0',
  );
  ctx.font = '700 11px "Cascadia Code", Consolas, monospace';
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText(fitText(ctx, titleTxt, bw - kwW - 92), bx + kwW + 6, curY + 13);

  ctx.font = '600 9px "Cascadia Code", Consolas, monospace';
  const rbW = ctx.measureText(roleBadge).width + 14;
  drawBadgePill(ctx, roleBadge, bx + bw - rbW, curY, 18, '#111827', '#263244', '#94a3b8', '600 9px "Cascadia Code", Consolas, monospace');
  curY += 23;

  if (isType && isUtilityObj && d.rawDef && curY + 18 <= by + bh) {
    ctx.font = '500 10px "Cascadia Code", Consolas, monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(fitText(ctx, `= ${d.rawDef}`, bw - 4), bx + 2, curY + 11);
    curY += 17;
  }

  if (isType && aliasKind === 'union' && Array.isArray(d.unionBranches) && d.unionBranches.length > 0) {
    const hasObjBranch = d.unionBranches.some(b => b.isObject && b.fields && b.fields.length > 0);
    if (hasObjBranch) {
      const rowH = 20;
      for (const b of d.unionBranches) {
        if (curY + rowH > by + bh) break;
        roundRectPath(ctx, bx, curY, bw, rowH, 4);
        ctx.fillStyle = '#121823';
        ctx.fill();
        ctx.strokeStyle = '#232c3b';
        ctx.lineWidth = 1;
        ctx.stroke();
        const desc = b.isObject && b.fields && b.fields.length > 0
          ? '| { ' + b.fields.map(f => `${f.k || f.name || ''}${f.optional ? '?' : ''}: ${f.declaredType || 'unknown'}`).join('; ') + ' }'
          : `| ${b.raw}`;
        ctx.font = '600 10px "Cascadia Code", Consolas, monospace';
        ctx.fillStyle = '#93c5fd';
        ctx.fillText(fitText(ctx, desc, bw - 14), bx + 7, curY + 14);
        curY += rowH + 3;
      }
      return;
    }

    let pillX = bx;
    for (let idx = 0; idx < d.unionBranches.length; idx++) {
      const branch = d.unionBranches[idx];
      if (!branch) continue;
      if (idx > 0) {
        ctx.font = '600 11px "Cascadia Code", Consolas, monospace';
        if (pillX + 14 > bx + bw) {
          pillX = bx;
          curY += 24;
        }
        if (curY + 20 > by + bh) break;
        ctx.fillStyle = '#64748b';
        ctx.fillText('|', pillX + 2, curY + 14);
        pillX += 12;
      }
      const isLit = /^['"`]/.test(branch.raw);
      ctx.font = '600 10px "Cascadia Code", Consolas, monospace';
      const pw = Math.min(bw, ctx.measureText(branch.raw).width + 14);
      if (pillX + pw > bx + bw && pillX > bx) {
        pillX = bx;
        curY += 24;
      }
      if (curY + 20 > by + bh) break;
      drawBadgePill(
        ctx,
        fitText(ctx, branch.raw, bw - 14),
        pillX,
        curY,
        20,
        '#121823',
        '#253042',
        isLit ? '#9ece6a' : '#4ec9b0',
        '600 10px "Cascadia Code", Consolas, monospace',
      );
      pillX += pw + 4;
    }
    return;
  }

  const fields = d.fields || (d.entries ? d.entries.map((e: { k: unknown; v: unknown }) => ({ k: String(e.k), v: e.v, declaredType: typeof e.v })) : []);
  if (!fields.length) {
    const fallbackTxt = isType
      ? `= ${d.resolvedDef || d.rawDef || 'any'}`
      : (d.isSchema ? '（空接口契约）' : '（无实例属性）');
    ctx.font = '500 11px "Cascadia Code", Consolas, monospace';
    ctx.fillStyle = isType ? '#4ec9b0' : '#64748b';
    ctx.fillText(fitText(ctx, fallbackTxt, bw - 8), bx + 4, curY + 14);
    return;
  }

  const rowH = 21;
  const rowGap = 3;
  const maxRows = Math.max(1, Math.floor((by + bh - curY) / (rowH + rowGap)));
  fields.slice(0, maxRows).forEach((f: { k: string; v?: unknown; optional?: boolean; declaredType?: string }, idx: number) => {
    const ry = curY + idx * (rowH + rowGap);
    if (ry + rowH > by + bh) return;
    const isRowHot = !d.isSchema && d.hot === f.k;
    roundRectPath(ctx, bx, ry, bw, rowH, 5);
    ctx.fillStyle = isRowHot ? 'rgba(255,180,84,0.22)' : '#121823';
    ctx.fill();
    ctx.strokeStyle = isRowHot ? '#ffb454' : '#232c3b';
    ctx.lineWidth = isRowHot ? 1.4 : 1;
    ctx.stroke();

    ctx.font = '700 11px "Cascadia Code", Consolas, monospace';
    ctx.fillStyle = '#9cdcfe';
    const keyTxt = f.k + (f.optional ? '?' : '');
    ctx.fillText(keyTxt, bx + 8, ry + 14);
    const kw = ctx.measureText(keyTxt).width;

    let typeEndX = bx + 10 + kw;
    if (f.declaredType) {
      ctx.font = '600 10px "Cascadia Code", Consolas, monospace';
      ctx.fillStyle = '#4ec9b0';
      const maxTypeW = d.isSchema ? bw - (typeEndX - bx) - 8 : Math.max(40, Math.floor(bw * 0.45) - kw);
      const tTxt = fitText(ctx, `: ${f.declaredType}`, maxTypeW);
      ctx.fillText(tTxt, typeEndX, ry + 14);
      typeEndX += ctx.measureText(tTxt).width;
    }

    if (!d.isSchema) {
      const hasVal = f.v !== undefined;
      const valTxt = hasVal
        ? (typeof f.v === 'string'
          ? JSON.stringify(f.v)
          : (f.v !== null && typeof f.v === 'object' ? safeJSONStringify(f.v) : String(f.v)))
        : '未实例化';
      ctx.font = `${hasVal ? '700' : '500'} 10px "Cascadia Code", Consolas, monospace`;
      ctx.fillStyle = !hasVal ? '#64748b' : (typeof f.v === 'string' ? '#9ece6a' : '#ffb454');
      const availValW = Math.max(24, bx + bw - 8 - (typeEndX + 10));
      const clippedVal = fitText(ctx, hasVal ? `= ${valTxt}` : valTxt, availValW);
      const vw = ctx.measureText(clippedVal).width;
      ctx.fillText(clippedVal, Math.max(typeEndX + 8, bx + bw - vw - 8), ry + 14);
    }
  });
}

function drawEventLoopCard(
  ctx: CanvasRenderingContext2D,
  bx: number,
  by: number,
  bw: number,
  bh: number,
  d: Frame,
) {
  const phaseMap: Record<string, { label: string; bg: string; border: string; fg: string }> = {
    sync: { label: 'Sync · 同步栈执行', bg: 'rgba(96,165,250,0.16)', border: '#60a5fa', fg: '#93c5fd' },
    await_suspend: { label: 'Await · 协程挂起', bg: 'rgba(199,146,234,0.16)', border: '#c792ea', fg: '#e9d5ff' },
    await_resume: { label: 'Await · 协程恢复', bg: 'rgba(74,222,128,0.16)', border: '#4ade80', fg: '#86efac' },
    microtask: { label: 'Microtask · 微任务出队', bg: 'rgba(56,189,248,0.16)', border: '#38bdf8', fg: '#7dd3fc' },
    macrotask: { label: 'Macrotask · 宏任务触发', bg: 'rgba(255,180,84,0.16)', border: '#ffb454', fg: '#fde68a' },
  };
  const ph = (d.phase ? phaseMap[d.phase] : undefined) || {
    label: String(d.phase || 'Event Loop'),
    bg: 'rgba(96,165,250,0.14)',
    border: '#60a5fa',
    fg: '#93c5fd',
  };
  const pw = drawBadgePill(ctx, ph.label, bx, by, 18, ph.bg, ph.border, ph.fg, '700 10px "Cascadia Code", Consolas, monospace');
  const activeTask = d.activeTask || d.activeTaskLabel || d.currentTask;
  if (activeTask) {
    ctx.font = '600 10px "Cascadia Code", Consolas, monospace';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(fitText(ctx, String(activeTask), bw - pw - 96), bx + pw + 8, by + 13);
  }
  const nowMs = typeof d.now === 'number' ? d.now : (typeof d.virtualTime === 'number' ? d.virtualTime : 0);
  const clockTxt = `⏱ ${nowMs}ms`;
  ctx.font = '600 10px "Cascadia Code", Consolas, monospace';
  const cw = ctx.measureText(clockTxt).width + 14;
  drawBadgePill(ctx, clockTxt, bx + bw - cw, by, 18, '#101622', '#263244', '#94a3b8', '600 10px "Cascadia Code", Consolas, monospace');

  const gridTop = by + 24;
  const gridH = Math.max(40, bh - 24);
  const laneGap = 8;
  const laneW = Math.floor((bw - laneGap) / 2);
  const laneH = Math.floor((gridH - laneGap) / 2);

  const drawLane = (lx: number, ly: number, title: string, accent: string, lines: Array<{ text: string; head?: boolean; color?: string }>, emptyText: string) => {
    roundRectPath(ctx, lx, ly, laneW, laneH, 6);
    ctx.fillStyle = '#0c1119';
    ctx.fill();
    ctx.strokeStyle = '#1e2736';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = '700 10px "Segoe UI", "PingFang SC", sans-serif';
    ctx.fillStyle = accent;
    ctx.fillText(title, lx + 8, ly + 14);

    if (!lines.length) {
      ctx.font = '500 10px "Cascadia Code", Consolas, monospace';
      ctx.fillStyle = '#475569';
      ctx.fillText(emptyText, lx + 8, ly + 32);
      return;
    }

    const itemH = 18;
    let iy = ly + 20;
    for (const item of lines) {
      if (iy + itemH > ly + laneH - 2) break;
      roundRectPath(ctx, lx + 6, iy, laneW - 12, itemH, 4);
      ctx.fillStyle = item.head ? 'rgba(56,189,248,0.14)' : '#121823';
      ctx.fill();
      ctx.strokeStyle = item.head ? accent : '#242f40';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.font = '600 10px "Cascadia Code", Consolas, monospace';
      ctx.fillStyle = item.color || '#e2e8f0';
      ctx.fillText(fitText(ctx, item.text, laneW - 22), lx + 11, iy + 13);
      iy += itemH + 3;
    }
  };

  // Lane 1: Call Stack / Async Coroutines
  const coroutines = Array.isArray(d.coroutines) ? d.coroutines : [];
  const callStackItems = Array.isArray(d.callStack) ? d.callStack : [];
  const coroLines: Array<{ text: string; head?: boolean; color?: string }> = coroutines.length
    ? coroutines.map((c: Frame) => {
        const mark = c.status === 'running' ? '●' : (c.status === 'suspended' ? '⏸' : '✓');
        const tail = c.status === 'suspended' && c.awaitingExpr ? ` await ${c.awaitingExpr}` : '';
        return {
          text: `${mark} async ${c.name || ''}()${tail}`,
          head: c.status === 'running',
          color: c.status === 'running' ? '#86efac' : (c.status === 'suspended' ? '#e9d5ff' : '#94a3b8'),
        };
      })
    : (callStackItems.length
      ? callStackItems.map((f: Frame, idx: number) => ({
          text: `${idx === callStackItems.length - 1 ? '▸ ' : ''}${String(f.label || f.fn || 'frame')}`,
          head: idx === callStackItems.length - 1,
          color: idx === callStackItems.length - 1 ? '#93c5fd' : '#cbd5e1',
        }))
      : (activeTask ? [{ text: `● ${String(activeTask)}`, head: true, color: '#93c5fd' }] : []));

  // Lane 2: Microtask Queue
  const microtasks = Array.isArray(d.microtasks) ? d.microtasks : [];
  const microLines = microtasks.map((m: Frame, idx: number) => ({
    text: `#${idx + 1} ${String(m.label || '')}${(m.line ?? 0) > 0 ? ` @L${m.line}` : ''}`,
    head: idx === 0,
    color: idx === 0 ? '#7dd3fc' : '#cbd5e1',
  }));

  // Lane 3: Macrotask / Timer Queue
  const macrotasks = Array.isArray(d.macrotasks) ? d.macrotasks : (Array.isArray(d.webApis) ? d.webApis : []);
  const macroLines = macrotasks.map((t: Frame, idx: number) => ({
    text: `t=${t.due ?? 0}ms ${String(t.label || '')} (+${t.delay ?? 0}ms)`,
    head: idx === 0,
    color: idx === 0 ? '#fde68a' : '#cbd5e1',
  }));

  // Lane 4: Promise Status Table
  const promises = Array.isArray(d.promises) ? d.promises : [];
  const promLines = promises.map((p: Frame) => {
    const st = p.state || 'pending';
    const icon = st === 'fulfilled' ? '✓' : (st === 'rejected' ? '✗' : '⏳');
    const valPart = st === 'pending'
      ? ((p.reactions ?? 0) > 0 ? `${p.reactions} waiters` : 'pending')
      : String(p.value);
    return {
      text: `${icon} P#${p.id ?? 0} ${String(p.label || '')}: ${valPart}`,
      head: st === 'pending',
      color: st === 'fulfilled' ? '#86efac' : (st === 'rejected' ? '#fca5a5' : '#cbd5e1'),
    };
  });

  drawLane(bx, gridTop, 'Call Stack / Async 协程', '#60a5fa', coroLines, '无活跃协程');
  drawLane(bx + laneW + laneGap, gridTop, 'Microtask 微任务队列', '#38bdf8', microLines, '队列为空 (0)');
  drawLane(bx, gridTop + laneH + laneGap, 'Macrotask / Timer 宏任务', '#ffb454', macroLines, '无待触发定时器 (0)');
  drawLane(bx + laneW + laneGap, gridTop + laneH + laneGap, 'Promise 状态表', '#c792ea', promLines, '暂无 Promise 实例');
}

function drawWatchScalarCard(
  ctx: CanvasRenderingContext2D,
  bx: number,
  by: number,
  bw: number,
  bh: number,
  d: Frame,
) {
  const cy = by + Math.floor(bh / 2) + 4;
  if (d.watchStatus === 'unready') {
    const pw = drawBadgePill(ctx, '未就绪', bx, cy - 14, 20, '#121823', '#2a3444', '#94a3b8');
    ctx.font = '500 11px "Cascadia Code", Consolas, monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText(fitText(ctx, String(d.watchError || '当前作用域未就绪'), bw - pw - 12), bx + pw + 8, cy);
    return;
  }
  if (d.watchStatus === 'error') {
    const pw = drawBadgePill(ctx, '异常', bx, cy - 14, 20, 'rgba(248,113,113,0.16)', '#f87171', '#fca5a5');
    ctx.font = '500 11px "Cascadia Code", Consolas, monospace';
    ctx.fillStyle = '#fca5a5';
    ctx.fillText(fitText(ctx, String(d.watchError || '求值失败'), bw - pw - 12), bx + pw + 8, cy);
    return;
  }
  let curX = bx;
  const hasDelta = Boolean(d.changed && d.prevValStr !== undefined && d.prevValStr !== String(d.val));
  if (hasDelta) {
    ctx.font = '600 13px "Cascadia Code", Consolas, monospace';
    ctx.fillStyle = '#64748b';
    const prevTxt = String(d.prevValStr);
    ctx.fillText(prevTxt, curX, cy);
    curX += ctx.measureText(prevTxt).width + 6;
    ctx.fillStyle = '#ffb454';
    ctx.fillText('→', curX, cy);
    curX += ctx.measureText('→').width + 6;
  }
  ctx.font = '700 15px "Cascadia Code", Consolas, monospace';
  ctx.fillStyle = d.changed ? '#ffb454' : '#f7f9fc';
  const valTxt = fitText(ctx, String(d.val), Math.max(40, bw - (curX - bx) - 60));
  ctx.fillText(valTxt, curX, cy);
}

export function drawVizCardOnCanvas(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  s: { name?: string; isCustomWatch?: boolean },
  d: Frame | null | undefined,
  kind: string,
) {
  roundRectPath(ctx, x, y, w, h, 10);
  ctx.fillStyle = '#070a0f';
  ctx.fill();
  const isHot = Boolean(d && (d.hot !== undefined || d.mark != null || d.changed));
  ctx.strokeStyle = isHot ? 'rgba(255,180,84,0.68)' : '#1c2432';
  ctx.lineWidth = isHot ? 1.5 : 1;
  ctx.stroke();

  const kindPrefix = d && d.isClass ? 'class' : 'interface';
  const kindBadge = kind === 'watch-scalar'
    ? `watch · ${(d && d.runtimeType) || 'expr'}`
    : (kind === 'interface' && d && d.interfaceName && d.interfaceName !== 'object' && !d.isSchema)
      ? `${kindPrefix} · ${d.interfaceName}`
      : (kind === 'interface' && d && d.isClass ? 'class' : (s.isCustomWatch ? `watch · ${kind}` : kind));

  let rightEdge = x + w - 10;
  if (d && d.win) {
    const winTxt = `[${d.win[0]}..${d.win[1]}]`;
    ctx.font = '600 10px "Cascadia Code", Consolas, monospace';
    const ww = ctx.measureText(winTxt).width + 14;
    rightEdge -= ww;
    drawBadgePill(ctx, winTxt, rightEdge, y + 7, 18, 'rgba(56,189,248,0.16)', 'rgba(56,189,248,0.5)', '#38bdf8', '600 10px "Cascadia Code", Consolas, monospace');
    rightEdge -= 6;
  }

  if (d) {
    let sizeTxt = '';
    if (kind === 'grid' && ((d.totalRows || 0) > 10 || (d.totalCols || 0) > 10)) {
      sizeTxt = `${d.totalRows}×${d.totalCols}`;
    } else if (typeof d.total === 'number' && d.total > 20) {
      sizeTxt = `共 ${d.total} 项`;
    }
    if (sizeTxt) {
      ctx.font = '600 10px "Cascadia Code", Consolas, monospace';
      const sw = ctx.measureText(sizeTxt).width + 12;
      rightEdge -= sw;
      drawBadgePill(ctx, sizeTxt, rightEdge, y + 7, 18, '#101622', '#263244', '#94a3b8', '600 10px "Cascadia Code", Consolas, monospace');
      rightEdge -= 6;
    }
  }

  const titleMaxW = Math.max(40, rightEdge - (x + 12));
  const titleStr = (s.isCustomWatch ? 'ƒ ' : '') + String(s.name || '');
  ctx.font = '700 13px "Cascadia Code", Consolas, monospace';
  const clippedTitle = fitText(ctx, titleStr, titleMaxW);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText(clippedTitle, x + 12, y + 20);
  const nameW = ctx.measureText(clippedTitle).width;

  const badgeSpace = rightEdge - (x + 18 + nameW);
  if (badgeSpace > 24) {
    ctx.font = '500 11px "Cascadia Code", Consolas, monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText(fitText(ctx, String(kindBadge || ''), badgeSpace), x + 18 + nameW, y + 20);
  }

  if (!d) {
    ctx.font = '500 12px "Cascadia Code", Consolas, monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText('empty', x + 14, y + 52);
    return;
  }

  const bx = x + 12;
  const by = y + 32;
  const bw = w - 24;
  const bh = h - 40;

  if (kind === 'tree' && d.nodes && d.nodes.length) {
    drawTreeCard(ctx, bx, by, bw, bh, d);
    return;
  }
  if (kind === 'graph' && d.nodes && d.nodes.length) {
    drawGraphCard(ctx, bx, by, bw, bh, d);
    return;
  }
  if (kind === 'grid' && d.cells && d.cells.length) {
    drawGridCard(ctx, bx, by, bw, bh, d);
    return;
  }
  if (kind === 'list') {
    drawListCard(ctx, bx, by, bw, bh, d);
    return;
  }
  if (kind === 'eventloop' || kind === 'event_loop') {
    drawEventLoopCard(ctx, bx, by, bw, bh, d);
    return;
  }
  if (kind === 'interface' || kind === 'object' || kind === 'type') {
    drawInterfaceOrTypeCard(ctx, bx, by, bw, bh, d, kind);
    return;
  }
  if (kind === 'stack') {
    drawStackCard(ctx, bx, by, bw, bh, d);
    return;
  }
  if (kind === 'map' || kind === 'set') {
    drawMapOrSetCard(ctx, bx, by, bw, bh, d, kind);
    return;
  }
  if (kind === 'watch-scalar') {
    drawWatchScalarCard(ctx, bx, by, bw, bh, d);
    return;
  }
  if (kind === 'array' || kind === 'queue' || kind === 'heap' || kind === 'uf' || kind === 'string') {
    draw1DCollectionCard(ctx, bx, by, bw, bh, d, kind);
  }
}

function drawActiveAnimHighlight(
  ctx: CanvasRenderingContext2D,
  rawLine: string,
  anim: StepAnim | null | undefined,
  txStart: number,
  ly: number,
  lh: number,
) {
  if (!anim) return;
  const drawSpanBox = (startIdx: number, len: number, bg: string, border: string) => {
    if (startIdx < 0 || len <= 0) return;
    const preW = ctx.measureText(rawLine.slice(0, startIdx)).width;
    const spanW = ctx.measureText(rawLine.slice(startIdx, startIdx + len)).width;
    roundRectPath(ctx, txStart + preW - 2, ly - 15, spanW + 4, lh - 4, 4);
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    ctx.stroke();
  };

  const declPrefix = rawLine.match(/^\s*(?:(?:export\s+)?(?:const|let|var)\b\s*)/);
  const lhsSearchStart = declPrefix ? declPrefix[0].length : 0;

  if (anim.type === 'assign' && typeof anim.to === 'string' && anim.to) {
    const toIdx = findExprSpan(rawLine, anim.to, lhsSearchStart);
    if (toIdx >= 0) {
      drawSpanBox(toIdx, anim.to.length, 'rgba(255,180,84,0.16)', 'rgba(255,180,84,0.55)');
      if (typeof anim.from === 'string' && anim.from) {
        const afterTo = toIdx + anim.to.length;
        const eqPos = rawLine.indexOf('=', afterTo);
        const fromIdx = findExprSpan(rawLine, anim.from, eqPos >= 0 ? eqPos + 1 : afterTo);
        if (fromIdx >= afterTo) {
          drawSpanBox(fromIdx, anim.from.length, 'rgba(56,189,248,0.14)', 'rgba(56,189,248,0.45)');
        }
      }
    }
  } else if (anim.type === 'compare' && typeof anim.lhs === 'string' && anim.lhs) {
    const condPrefix = rawLine.match(/^\s*(?:}\s*)?(?:(?:else\s+)?(?:if|while)\s*\(|for\s*\([^;]*;)/);
    const cmpStart = condPrefix ? condPrefix[0].length : 0;
    const lIdx = findExprSpan(rawLine, anim.lhs, cmpStart);
    if (lIdx >= 0) {
      const col = anim.result ? 'rgba(74,222,128,0.14)' : 'rgba(248,113,113,0.14)';
      const brd = anim.result ? 'rgba(74,222,128,0.45)' : 'rgba(248,113,113,0.45)';
      drawSpanBox(lIdx, anim.lhs.length, col, brd);
      if (typeof anim.rhs === 'string' && anim.rhs) {
        const afterLhs = lIdx + anim.lhs.length;
        const opStr = typeof anim.op === 'string' ? anim.op : '';
        const opIdx = opStr ? rawLine.indexOf(opStr, afterLhs) : -1;
        const rIdx = findExprSpan(rawLine, anim.rhs, opIdx >= 0 ? opIdx + opStr.length : afterLhs);
        if (rIdx >= afterLhs) drawSpanBox(rIdx, anim.rhs.length, col, brd);
      }
    }
  } else if (anim.type === 'checkpoint') {
    const fnName = String(anim.fn || 'checkpoint');
    const fnIdx = findExprSpan(rawLine, fnName, 0);
    if (fnIdx >= 0) drawSpanBox(fnIdx, fnName.length, 'rgba(56,189,248,0.18)', 'rgba(56,189,248,0.6)');
  } else if (anim.type === 'call' && typeof anim.fn === 'string' && anim.fn) {
    const toStr = typeof anim.to === 'string' ? anim.to : '';
    const toIdx = toStr ? findExprSpan(rawLine, toStr, lhsSearchStart) : -1;
    if (toIdx >= 0) drawSpanBox(toIdx, toStr.length, 'rgba(255,180,84,0.16)', 'rgba(255,180,84,0.55)');
    const fnIdx = findExprSpan(rawLine, anim.fn, toIdx >= 0 ? toIdx + toStr.length : lhsSearchStart);
    if (fnIdx >= 0) drawSpanBox(fnIdx, anim.fn.length, 'rgba(121,192,255,0.16)', 'rgba(121,192,255,0.5)');
  }
}

export function renderVideoFrameToCanvas(
  ctx: CanvasRenderingContext2D,
  stepIdx: number,
  subProgress: number,
  speedMult: number,
) {
  const W = VIDEO_WIDTH;
  const H = VIDEO_HEIGHT;
  const st = appState.TRACE.steps[stepIdx] || appState.TRACE.steps[0];
  const prevSt = stepIdx > 0 ? appState.TRACE.steps[stepIdx - 1] : null;
  const activeFrame = st ? getActiveFrame(st) : null;
  const prevFrame = prevSt ? getActiveFrame(prevSt) : null;
  const isMultiModule = Boolean(
    appState.TRACE.moduleSources && Object.keys(appState.TRACE.moduleSources).length > 1,
  );
  const stepFile = (activeFrame && activeFrame.file) || (st && st.file) || '';
  const stepModuleLines =
    stepFile && appState.TRACE.moduleSources ? appState.TRACE.moduleSources[stepFile] : undefined;
  const codeLines = (stepModuleLines && stepModuleLines.length)
    ? stepModuleLines
    : ((appState.TRACE.code && appState.TRACE.code.length) ? appState.TRACE.code : editor.value.replace(/\r/g, '').split('\n'));

  ctx.fillStyle = '#07090d';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#0a0e14';
  ctx.fillRect(0, 0, W, 56);
  ctx.strokeStyle = '#1d232e';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 56);
  ctx.lineTo(W, 56);
  ctx.stroke();

  ctx.font = '700 20px "Segoe UI", "PingFang SC", sans-serif';
  ctx.fillStyle = '#f7f9fc';
  ctx.fillText('TypeScript Playground · Debug Trace', 24, 35);

  const badgeText = `${speedMult}x Speed · 1920×1080 · 60fps`;
  ctx.font = '600 13px "Cascadia Code", Consolas, monospace';
  const bw = ctx.measureText(badgeText).width + 28;
  roundRectPath(ctx, W - bw - 24, 13, bw, 30, 15);
  ctx.fillStyle = 'rgba(56,189,248,0.14)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(56,189,248,0.5)';
  ctx.stroke();
  ctx.fillStyle = '#38bdf8';
  ctx.fillText(badgeText, W - bw - 10, 33);

  const splitX = 1110;
  const mainTop = 56;
  const mainBottom = H - 56;
  const mainH = mainBottom - mainTop;

  ctx.fillStyle = '#0a0e14';
  ctx.fillRect(0, mainTop, splitX, mainH);
  ctx.strokeStyle = '#1d232e';
  ctx.beginPath();
  ctx.moveTo(splitX, mainTop);
  ctx.lineTo(splitX, mainBottom);
  ctx.stroke();

  ctx.font = '700 12px "Segoe UI", sans-serif';
  ctx.fillStyle = '#98a2b3';
  const sourceHeaderLabel = isMultiModule && stepFile ? `SOURCE · ${stepFile}` : 'SOURCE';
  ctx.fillText(sourceHeaderLabel, 22, mainTop + 26);

  const fullCodeText = codeLines.join('\n');
  const customTypes = collectDeclaredTypeNames(fullCodeText);
  const declaredNames = collectDeclaredNames(fullCodeText);
  const liveByLine = new Map<number, Diag>();
  for (const diag of liveTypeDiags(fullCodeText)) {
    if (diag && diag.line >= 1 && !liveByLine.has(diag.line)) {
      liveByLine.set(diag.line, diag);
    }
  }

  const curLine = activeFrame ? activeFrame.line : (st ? st.line : -1);
  const lh = 26;
  const codeStartY = mainTop + 46;
  const maxVisibleLines = Math.floor((mainH - 64) / lh);
  let startLineIdx = 0;
  if (curLine > maxVisibleLines - 6) {
    startLineIdx = Math.max(0, Math.min(codeLines.length - maxVisibleLines, curLine - Math.floor(maxVisibleLines / 2)));
  }

  if (typeof ctx.save === 'function' && typeof ctx.clip === 'function' && typeof ctx.rect === 'function') {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, mainTop, splitX - 2, mainH);
    ctx.clip();
  }

  for (let i = 0; i < maxVisibleLines && (startLineIdx + i) < codeLines.length; i++) {
    const lineIdx = startLineIdx + i;
    const lineNum = lineIdx + 1;
    const raw = codeLines[lineIdx] || '';
    const ly = codeStartY + i * lh;
    const isCur = lineNum === curLine;
    const hasCkpt = /^\s*(?:checkpoint|断点)\s*\(/.test(raw);
    const liveDiag = liveByLine.get(lineNum);
    const isErr = Boolean(
      liveDiag ||
      appState.TYPE_ERROR_LINES.has(lineNum) ||
      appState.RUNTIME_ERROR_LINES.has(lineNum) ||
      (isCur && st && st.error),
    );

    if (isCur) {
      const pulseAlpha = 0.14 + 0.06 * Math.sin(subProgress * Math.PI);
      ctx.fillStyle = isErr
        ? 'rgba(248,113,113,0.20)'
        : (st && st.isCheckpoint ? `rgba(56,189,248,${pulseAlpha.toFixed(3)})` : `rgba(255,180,84,${pulseAlpha.toFixed(3)})`);
      ctx.fillRect(0, ly - 17, splitX - 2, lh);
      ctx.fillStyle = isErr ? '#f87171' : (st && st.isCheckpoint ? '#38bdf8' : '#ffb454');
      ctx.fillRect(0, ly - 17, 4, lh);
    } else if (isErr) {
      ctx.fillStyle = 'rgba(248,113,113,0.10)';
      ctx.fillRect(0, ly - 17, splitX - 2, lh);
      ctx.fillStyle = '#f87171';
      ctx.fillRect(0, ly - 17, 3, lh);
    }

    if (hasCkpt) {
      if (isCur && st && st.isCheckpoint) {
        ctx.beginPath();
        ctx.arc(14, ly - 5, 7, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(56,189,248,0.28)';
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(14, ly - 5, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.fill();
    }

    ctx.font = (isCur ? '700 ' : '500 ') + '14px "Cascadia Code", Consolas, monospace';
    ctx.fillStyle = isErr ? '#f87171' : (isCur ? '#ffb454' : '#4b5565');
    const numStr = String(lineNum).padStart(2, ' ');
    ctx.fillText(numStr, 26, ly);

    let tx = 68;
    if (isCur && st && st.anim && (!activeFrame || activeFrame.isTop)) {
      drawActiveAnimHighlight(ctx, raw, st.anim, tx, ly, lh);
    }
    const tokens = tokenizeCodeForCanvas(raw, customTypes, declaredNames);
    tokens.forEach(tok => {
      ctx.fillStyle = tok.color;
      ctx.fillText(tok.text, tx, ly);
      tx += ctx.measureText(tok.text).width;
    });

    if (isErr && tx + 24 < splitX - 20) {
      const errTag = liveDiag && liveDiag.code ? `✗ ${liveDiag.code}` : '✗ ERR';
      drawBadgePill(
        ctx,
        errTag,
        tx + 12,
        ly - 14,
        18,
        'rgba(248,113,113,0.18)',
        'rgba(248,113,113,0.6)',
        '#fca5a5',
        '600 10px "Cascadia Code", Consolas, monospace',
      );
    } else if (isCur && st && st.anim && tx + 24 < splitX - 24) {
      let deltaBadge = '';
      if (st.anim.type === 'assign' && st.anim.val !== undefined && st.anim.val !== null) {
        deltaBadge = `← ${String(st.anim.val)}`;
      } else if (st.anim.type === 'compare' && typeof st.anim.result === 'boolean') {
        deltaBadge = `⇒ ${String(st.anim.result)}`;
      } else if (st.anim.type === 'checkpoint') {
        deltaBadge = '◉ CHECKPOINT';
      }
      if (deltaBadge) {
        const clipped = fitText(ctx, deltaBadge, splitX - tx - 28);
        if (clipped.length > 1) {
          drawBadgePill(
            ctx,
            clipped,
            tx + 12,
            ly - 14,
            18,
            st.anim.type === 'checkpoint' ? 'rgba(56,189,248,0.16)' : 'rgba(255,180,84,0.14)',
            st.anim.type === 'checkpoint' ? 'rgba(56,189,248,0.55)' : 'rgba(255,180,84,0.5)',
            st.anim.type === 'checkpoint' ? '#7dd3fc' : '#fde68a',
            '600 10px "Cascadia Code", Consolas, monospace',
          );
        }
      }
    }
  }

  if (typeof ctx.restore === 'function') {
    ctx.restore();
  }

  if (st && (st.anim || st.error)) {
    const hudText = st.error
      ? `✗ RUNTIME ERROR: ${st.error}`
      : (st.note || '');
    ctx.font = '600 13px "Cascadia Code", Consolas, monospace';
    const hudW = Math.min(splitX - 60, ctx.measureText(hudText).width + 32);
    const hudX = 36;
    const hudY = mainBottom - 54;
    roundRectPath(ctx, hudX, hudY, hudW, 36, 9);
    ctx.fillStyle = st.error ? 'rgba(42,14,18,0.95)' : (st.isCheckpoint ? 'rgba(11,29,46,0.95)' : 'rgba(19,27,40,0.95)');
    ctx.fill();
    ctx.strokeStyle = st.error ? '#f87171' : (st.isCheckpoint ? '#38bdf8' : '#ffb454');
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = st.error ? '#fecaca' : (st.isCheckpoint ? '#bae6fd' : '#fde68a');
    ctx.fillText(fitText(ctx, hudText, hudW - 24), hudX + 14, hudY + 23);
  }

  const sideX = splitX + 1;
  const sideW = W - sideX;
  ctx.fillStyle = '#0d1219';
  ctx.fillRect(sideX, mainTop, sideW, mainH);

  ctx.font = '700 12px "Segoe UI", sans-serif';
  ctx.fillStyle = '#98a2b3';
  ctx.fillText('LOCALS', sideX + 20, mainTop + 24);

  const stackFrames = (st && Array.isArray(st.callStack) && st.callStack.length)
    ? st.callStack
    : [{ label: 'global' }];
  const stackChainTxt = stackFrames
    .map(f => {
      const shortFile = f.file ? (f.file.split('/').pop() || f.file) : '';
      return isMultiModule && shortFile && !String(f.label || '').startsWith('<module:')
        ? `[${shortFile}] ${f.label}`
        : String(f.label || 'global');
    })
    .join(' ▸ ');
  roundRectPath(ctx, sideX + 20, mainTop + 32, sideW - 40, 26, 7);
  ctx.fillStyle = '#0b1018';
  ctx.fill();
  ctx.strokeStyle = '#1e2736';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.font = '600 12px "Cascadia Code", Consolas, monospace';
  ctx.fillStyle = '#7dd3fc';
  ctx.fillText(fitText(ctx, stackChainTxt, sideW - 60), sideX + 30, mainTop + 49);

  const v = (activeFrame && activeFrame.v) || (st && st.v) || {};
  const prevV = (prevFrame && prevFrame.v) || (prevSt && prevSt.v) || {};
  const isTopFrame = Boolean(!activeFrame || activeFrame.isTop);
  const assignTarget =
    isTopFrame &&
    st &&
    st.anim &&
    (st.anim.type === 'assign' || (st.anim.type === 'call' && st.anim.to)) &&
    typeof st.anim.to === 'string' &&
    st.anim.to !== 'return'
      ? st.anim.to.trim()
      : '';
  const assignNextVal =
    assignTarget && st && st.anim
      ? (st.anim.val !== undefined ? st.anim.val : st.anim.result)
      : undefined;

  let locX = sideX + 20;
  let locY = mainTop + 66;
  const primKeys = Object.keys(v).filter(k => v[k] === null || typeof v[k] !== 'object');
  primKeys.forEach(k => {
    const rawVal = v[k];
    const isFn = typeof rawVal === 'function';
    const valStr = isFn ? formatFunctionTypeSignature(k, rawVal) : String(rawVal);
    const prevVal = prevV[k];
    const isPendingAssign = Boolean(
      assignTarget === k &&
      assignNextVal !== undefined &&
      assignNextVal !== null &&
      String(rawVal) !== String(assignNextVal),
    );
    const changed = Boolean(
      isPendingAssign ||
      (isTopFrame &&
        prevSt &&
        (isFn
          ? typeof prevVal !== 'function' || formatFunctionTypeSignature(k, prevVal) !== valStr
          : prevVal !== rawVal)),
    );
    const suffix = isPendingAssign ? ` → ${String(assignNextVal)}` : '';
    ctx.font = '600 13px "Cascadia Code", Consolas, monospace';
    const chipW = Math.min(sideW - 40, ctx.measureText(`${k} : ${valStr}${suffix}`).width + 24);
    if (locX + chipW > W - 20 && locX > sideX + 20) {
      locX = sideX + 20;
      locY += 34;
    }
    roundRectPath(ctx, locX, locY, chipW, 28, 7);
    ctx.fillStyle = changed ? 'rgba(255,180,84,0.16)' : '#121822';
    ctx.fill();
    ctx.strokeStyle = changed ? 'rgba(255,180,84,0.65)' : '#1d2532';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#98a2b3';
    ctx.fillText(k, locX + 10, locY + 19);
    const kw = ctx.measureText(k).width;
    ctx.fillStyle = '#ffb454';
    ctx.fillText(fitText(ctx, valStr + suffix, chipW - kw - 24), locX + 18 + kw, locY + 19);
    locX += chipW + 8;
  });

  const watchHeaderY = Math.max(mainTop + 124, locY + 46);
  ctx.font = '700 12px "Segoe UI", sans-serif';
  ctx.fillStyle = '#98a2b3';
  ctx.fillText('WATCH · 数据结构可视化', sideX + 20, watchHeaderY);

  const ds: Record<string, StepAnim> = Object.assign({}, (activeFrame && activeFrame.ds) || (st && st.ds) || {});
  if (st && st.ds && st.ds.eventLoop && !ds.eventLoop) {
    ds.eventLoop = st.ds.eventLoop;
  }
  const rawNote = (st && (st.rawNote || st.note)) || '';
  for (const expr of appState.CUSTOM_WATCHES) {
    const wid = watchIdForExpr(expr);
    if (appState.watched.has(wid)) {
      ds[wid] = evaluateCustomWatch(expr, v, prevV, rawNote);
    }
  }

  const vars = discoverVars().filter((s: DiscoveredVar) => appState.watched.has(s.id) && ds[s.id] !== undefined);
  const allocated = allocateSlotSpans(vars, ds);
  const gridLeft = sideX + 20;
  const gridW = sideW - 40;
  const colGap = 12;
  const colW = Math.floor((gridW - colGap) / 2);
  let curRowY = watchHeaderY + 14;
  interface AllocatedSlotItem {
    s: DiscoveredVar;
    d: Frame | null | undefined;
    kind: string;
    span: number;
  }
  let pendingSingle: AllocatedSlotItem | null = null;

  const consoleTop = mainBottom - 84;

  function drawRowItems(items: AllocatedSlotItem[]) {
    const first = items[0];
    const second = items[1];
    if (!first || curRowY + 84 > consoleTop) return;
    const hasEventLoop = items.some((it) => it.kind === 'eventloop' || it.kind === 'event_loop');
    const isTall = items.some((it) =>
      it.kind === 'tree' ||
      it.kind === 'graph' ||
      it.kind === 'grid' ||
      it.kind === 'stack' ||
      it.kind === 'interface' ||
      it.kind === 'object' ||
      it.kind === 'type',
    );
    const targetH = hasEventLoop ? 216 : (isTall ? 172 : 114);
    const cardH = Math.min(targetH, consoleTop - curRowY - 8);
    if (cardH < 64) return;
    if (items.length === 1 || !second) {
      drawVizCardOnCanvas(ctx, gridLeft, curRowY, gridW, cardH, first.s, first.d, first.kind);
    } else {
      drawVizCardOnCanvas(ctx, gridLeft, curRowY, colW, cardH, first.s, first.d, first.kind);
      drawVizCardOnCanvas(ctx, gridLeft + colW + colGap, curRowY, colW, cardH, second.s, second.d, second.kind);
    }
    curRowY += cardH + 10;
  }

  allocated.forEach((item: AllocatedSlotItem) => {
    if (item.span === 2) {
      if (pendingSingle) {
        drawRowItems([pendingSingle]);
        pendingSingle = null;
      }
      drawRowItems([item]);
    } else {
      if (pendingSingle) {
        drawRowItems([pendingSingle, item]);
        pendingSingle = null;
      } else {
        pendingSingle = item;
      }
    }
  });
  if (pendingSingle) drawRowItems([pendingSingle]);

  ctx.fillStyle = '#070a0f';
  ctx.fillRect(sideX, consoleTop, sideW, mainBottom - consoleTop);
  ctx.strokeStyle = '#1d232e';
  ctx.beginPath();
  ctx.moveTo(sideX, consoleTop);
  ctx.lineTo(W, consoleTop);
  ctx.stroke();

  ctx.font = '600 13px "Cascadia Code", Consolas, monospace';
  ctx.fillStyle = '#ffb454';
  ctx.fillText('›', sideX + 20, consoleTop + 30);
  ctx.fillStyle = st && st.error ? '#f87171' : '#cbd5e1';
  ctx.fillText(fitText(ctx, String((st && st.note) || ''), sideW - 56), sideX + 36, consoleTop + 30);

  ctx.fillStyle = '#0a0e14';
  ctx.fillRect(0, mainBottom, W, 56);
  ctx.strokeStyle = '#1d232e';
  ctx.beginPath();
  ctx.moveTo(0, mainBottom);
  ctx.lineTo(W, mainBottom);
  ctx.stroke();

  let statusLabel = '● 调试运行中';
  let statusColor = '#4ade80';
  if (st && st.error) { statusLabel = '✗ 运行时报错'; statusColor = '#f87171'; }
  else if (st && st.isCheckpoint) { statusLabel = '◉ 命中检查点'; statusColor = '#38bdf8'; }
  else if (appState.DEBUG_SESSION.finished && stepIdx === appState.TRACE.steps.length - 1) { statusLabel = '✓ 执行完毕'; statusColor = '#ffb454'; }

  roundRectPath(ctx, 24, mainBottom + 12, 136, 32, 16);
  ctx.fillStyle = '#111722';
  ctx.fill();
  ctx.strokeStyle = statusColor;
  ctx.stroke();
  ctx.font = '600 13px "Cascadia Code", Consolas, monospace';
  ctx.fillStyle = statusColor;
  ctx.fillText(statusLabel, 42, mainBottom + 33);

  ctx.font = '500 13px "Segoe UI", sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText(`TypeScript Playground · 1920×1080 60fps 视频导出 (${speedMult}x 倍速)`, 184, mainBottom + 33);
}

export function loadSample(key: string) {
  const targetKey = SAMPLES[key] ? key : 'showcase';
  if ($('sampleSel')) $<HTMLSelectElement>('sampleSel').value = targetKey;
  const src = SAMPLES[targetKey] || '';
  if (typeof globalThis.openSampleScriptTab === 'function') {
    globalThis.openSampleScriptTab(targetKey + '.ts', src, 'ts');
  } else {
    editor.value = src;
    setFileName(targetKey + '.ts');
  }
  appState.lastEditorCursorLine = -1;
  clearLog('✓ 已加载样例');
  resetTraceState();
  const defaultStep = SAMPLE_DEFAULT_STEP[targetKey] || 0;
  startDebug(defaultStep);
}

/* ── boot + URL contract (?trace=&step=&watch=&still=1) ── */
export function boot() {
  window.__BOOT_DEFERRED = false;
  try {
    const hash = (typeof location !== 'undefined' && location.hash) || '';
    const qs0 = (typeof location !== 'undefined' && location.search) ? new URLSearchParams(location.search) : null;
    const hasUrlChoice = Boolean(qs0 && (qs0.has('trace') || qs0.has('sample') || qs0.has('step')));
    let hasSaved = false;
    if (!hasUrlChoice && typeof localStorage !== 'undefined') {
      try { hasSaved = Boolean(localStorage.getItem('ts-playground-session-v1')); } catch (_) {}
    }
    if (hash.startsWith('#s=') || hasSaved) {
      window.__BOOT_DEFERRED = true;
      editor.value = '';
      clearLog('正在恢复上次会话 / 分享代码…');
      updateEditorChrome();
      return;
    }
  } catch (_) { /* ignore */ }
  let sampleKey = 'showcase';
  let customStep: number | null = null;
  try {
    const qs = typeof location !== 'undefined' && location.search ? new URLSearchParams(location.search) : null;
    if (qs) {
      const tr = qs.get('trace') || qs.get('sample');
      const aliasMap: Record<string, string> = { demo: 'showcase', tour: 'structures', stress: 'lcs' };
      if (tr) {
        const mapped = aliasMap[tr] || tr;
        if (SAMPLES[mapped]) sampleKey = mapped;
      }
      if (qs.has('watch')) {
        const w = qs.get('watch');
        appState.URL_WATCH = w ? w.split(',').map(s => s.trim()).filter(Boolean) : [];
      }
      if (qs.get('still') === '1') {
        appState.IS_STILL = true;
        if (document.body && document.body.classList) document.body.classList.add('still');
      }
      if (qs.has('step')) {
        customStep = parseInt(qs.get('step') || '0', 10) || 0;
      }
    }
  } catch {}

  if ($('sampleSel')) $<HTMLSelectElement>('sampleSel').value = sampleKey;
  const initialSrc = SAMPLES[sampleKey] || SAMPLES.showcase || '';
  if (typeof globalThis.openSampleScriptTab === 'function') {
    globalThis.openSampleScriptTab(sampleKey + '.ts', initialSrc, 'ts');
  } else {
    editor.value = initialSrc;
    setFileName(sampleKey + '.ts');
  }
  const initialStep = customStep !== null ? customStep : (SAMPLE_DEFAULT_STEP[sampleKey] || 0);
  generateTrace(initialStep);
}

export const initApp = boot;

registerUiHooks({ loadSample });
