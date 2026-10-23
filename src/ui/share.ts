/* ================================================================
   Video Exporter, Sample Loader & URL Share / Boot Logic (src/ui/share.ts)
   ================================================================ */
import { SAMPLES, SAMPLE_DEFAULT_STEP } from "../samples/ts-samples";
import { Frame } from "../types";
import { say, clearLog, resetTraceState } from "../runtime/event-loop";
import { startDebug, generateTrace, computeAndAppendNextStep, initWatchedVars } from "../runtime/runner";
import { discoverVars, allocateSlotSpans, renderPicker, renderStatic } from "../viz/memory-graph";
import { updateEditorChrome } from "../viz/highlight";
import {
  stopAuto,
  setVideoExportSpeed,
  setFileName,
} from "./controls";

const btnExportVideo = $('btnExportVideo');
const btnExportVideoLabel = $('btnExportVideoLabel');
const videoExportStatus = $('videoExportStatus');

/* ── 1920×1080 60fps Canvas Video Renderer & MediaRecorder Exporter ── */
export function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
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

export function tokenizeCodeForCanvas(line: string) {
  const re = /(\/\/.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b(function|const|let|var|new|class|extends|typeof|instanceof|import|export|from|async|await|interface|type|as|satisfies)\b|\b(for|if|else|return|while|do|switch|case|break|continue|try|catch|finally|throw|yield)\b|\b(number|string|boolean|void|any|unknown|never|Math|Map|Set|Array|Object|JSON|Number|String|Boolean|Promise|Record|Error)\b|\b(true|false|null|undefined|\d+(?:\.\d+)?)\b|(\b[A-Za-z_$][\w$]*)(?=\s*\()|(?<=\.)([A-Za-z_$][\w$]*)\b|(\b[A-Za-z_$][\w$]*)\b|(===|!==|>=|<=|=>|&&|\|\||\+\+|--)/g;
  const tokens: Array<{ text: string; color: string }> = [];
  let last = 0, m;
  while ((m = re.exec(line))) {
    if (m.index > last) tokens.push({ text: line.slice(last, m.index), color: '#d8e2ef' });
    let color = '#d8e2ef';
    if (m[1]) color = '#637488';
    else if (m[2]) color = '#9ece6a';
    else if (m[3]) color = '#ff7b72';
    else if (m[4]) color = '#c792ea';
    else if (m[5]) color = '#38bdf8';
    else if (m[6]) color = '#ffb454';
    else if (m[7]) color = '#79c0ff';
    else if (m[8] || m[9]) color = '#9cdcfe';
    else if (m[10]) color = '#89ddff';
    tokens.push({ text: m[0], color });
    last = m.index + m[0].length;
  }
  if (last < line.length) tokens.push({ text: line.slice(last), color: '#d8e2ef' });
  return tokens;
}

export function drawVizCardOnCanvas(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  s: { name?: string },
  d: Frame | null | undefined,
  kind: string
) {
  roundRectPath(ctx, x, y, w, h, 10);
  ctx.fillStyle = '#070a0f';
  ctx.fill();
  const isHot = d && (d.hot !== undefined || d.mark != null);
  ctx.strokeStyle = isHot ? 'rgba(255,180,84,0.68)' : '#1c2432';
  ctx.lineWidth = isHot ? 1.5 : 1;
  ctx.stroke();

  // Header
  ctx.font = '700 13px "Cascadia Code", Consolas, monospace';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText(String(s.name || ''), x + 12, y + 20);
  const nameW = ctx.measureText(String(s.name || '')).width;
  ctx.font = '500 11px "Cascadia Code", Consolas, monospace';
  ctx.fillStyle = '#64748b';
  ctx.fillText(String(kind || ''), x + 18 + nameW, y + 20);

  if (d && d.win) {
    const winTxt = `[${d.win[0]}..${d.win[1]}]`;
    const ww = ctx.measureText(winTxt).width + 12;
    roundRectPath(ctx, x + w - ww - 10, y + 7, ww, 18, 9);
    ctx.fillStyle = 'rgba(56,189,248,0.16)';
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(winTxt, x + w - ww - 4, y + 20);
  }

  if (!d) {
    ctx.fillStyle = '#64748b';
    ctx.fillText('empty', x + 14, y + 52);
    return;
  }

  const bx = x + 12, by = y + 32, bw = w - 24, bh = h - 40;

  if (kind === 'array' || kind === 'queue' || kind === 'heap' || kind === 'uf' || kind === 'set' || kind === 'list') {
    const items = d.items || [];
    const maxShow = Math.min(items.length, Math.max(4, Math.floor(bw / 44)));
    const cw = Math.min(44, Math.max(28, Math.floor((bw - (maxShow - 1) * 6) / Math.max(1, maxShow))));
    const ch = 36;
    const cy = by + Math.max(4, Math.floor((bh - ch - 12) / 2));
    for (let i = 0; i < maxShow; i++) {
      const cx = bx + i * (cw + 6);
      const isCellHot = d.hot === i || (kind === 'set' && d.hot === items[i]);
      const isWin = d.win && i >= d.win[0] && i <= d.win[1];
      const isMark = d.mark === i || (kind === 'heap' && i === 0) || (kind === 'queue' && i === 0);
      roundRectPath(ctx, cx, cy - (isCellHot ? 2 : 0), cw, ch, 6);
      ctx.fillStyle = isCellHot ? 'rgba(255,180,84,0.22)' : (isWin ? 'rgba(56,189,248,0.14)' : '#121823');
      ctx.fill();
      ctx.strokeStyle = isCellHot ? '#ffb454' : (isMark ? 'rgba(96,165,250,0.65)' : (isWin ? 'rgba(56,189,248,0.65)' : '#253042'));
      ctx.lineWidth = isCellHot ? 1.8 : 1;
      ctx.stroke();

      ctx.font = '700 13px "Cascadia Code", Consolas, monospace';
      ctx.fillStyle = isCellHot ? '#ffb454' : '#f7f9fc';
      const valStr = String(items[i]);
      const vw = ctx.measureText(valStr).width;
      ctx.fillText(valStr, cx + Math.max(3, (cw - vw) / 2), cy + 19);

      ctx.font = '500 9px "Cascadia Code", Consolas, monospace';
      ctx.fillStyle = isCellHot ? '#ffb454' : '#64748b';
      const idxStr = String(i);
      const iw = ctx.measureText(idxStr).width;
      ctx.fillText(idxStr, cx + (cw - iw) / 2, cy + 32);
    }
    return;
  }

  if (kind === 'stack') {
    const items = d.items || [];
    const shown = items.slice(-5);
    const cw = Math.min(110, bw - 8);
    const ch = 22;
    shown.forEach((val: unknown, idx: number) => {
      const abs = items.length - shown.length + idx;
      const isTop = abs === items.length - 1;
      const isCellHot = d.hot === abs;
      const ry = by + (shown.length - 1 - idx) * (ch + 4);
      if (ry + ch > y + h - 4) return;
      roundRectPath(ctx, bx + 4, ry, cw, ch, 5);
      ctx.fillStyle = isCellHot ? 'rgba(255,180,84,0.22)' : '#121823';
      ctx.fill();
      ctx.strokeStyle = isCellHot ? '#ffb454' : (isTop ? 'rgba(96,165,250,0.65)' : '#253042');
      ctx.stroke();
      ctx.font = '700 12px "Cascadia Code", Consolas, monospace';
      ctx.fillStyle = isCellHot ? '#ffb454' : '#f7f9fc';
      ctx.fillText(String(val), bx + 12, ry + 15);
      if (isTop) {
        ctx.font = '600 9px "Cascadia Code", Consolas, monospace';
        ctx.fillStyle = '#60a5fa';
        ctx.fillText('top', bx + cw - 24, ry + 15);
      }
    });
    return;
  }

  if (kind === 'map') {
    const entries = d.entries || [];
    let curX = bx, curY = by + 4;
    entries.slice(0, 8).forEach((e: { k: unknown; v: unknown }) => {
      const pairTxt = `${e.k} → ${e.v}`;
      ctx.font = '600 12px "Cascadia Code", Consolas, monospace';
      const pw = ctx.measureText(pairTxt).width + 18;
      if (curX + pw > bx + bw && curX > bx) {
        curX = bx;
        curY += 30;
      }
      if (curY + 24 > y + h - 4) return;
      const isPairHot = d.hot === e.k;
      roundRectPath(ctx, curX, curY, pw, 24, 6);
      ctx.fillStyle = isPairHot ? 'rgba(255,180,84,0.2)' : '#121823';
      ctx.fill();
      ctx.strokeStyle = isPairHot ? '#ffb454' : '#253042';
      ctx.stroke();
      ctx.fillStyle = isPairHot ? '#ffb454' : '#93c5fd';
      ctx.fillText(pairTxt, curX + 9, curY + 16);
      curX += pw + 6;
    });
    return;
  }

  if (kind === 'tree' && d.nodes && d.nodes.length) {
    const nodes = d.nodes;
    const root = d.root ?? 0;
    const coords = new Map<number, { x: number; y: number; val: unknown; left?: number | null; right?: number | null }>();
    function layout(idx: number | null | undefined, depth: number, xMin: number, xMax: number) {
      if (idx == null || !nodes[idx] || coords.has(idx) || depth > 4) return;
      const nx = (xMin + xMax) / 2;
      const ny = by + 16 + depth * 32;
      coords.set(idx, { x: nx, y: ny, val: nodes[idx].val, left: nodes[idx].left, right: nodes[idx].right });
      layout(nodes[idx].left, depth + 1, xMin, nx);
      layout(nodes[idx].right, depth + 1, nx, xMax);
    }
    layout(root, 0, bx + 16, bx + bw - 16);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    coords.forEach((info) => {
      [info.left, info.right].forEach(ch => {
        if (ch != null && coords.has(ch)) {
          const c = coords.get(ch);
          if (c) {
            ctx.beginPath();
            ctx.moveTo(info.x, info.y);
            ctx.lineTo(c.x, c.y);
            ctx.stroke();
          }
        }
      });
    });
    coords.forEach((info, idx) => {
      const isNodeHot = d.hot === idx;
      ctx.beginPath();
      ctx.arc(info.x, info.y, 12, 0, Math.PI * 2);
      ctx.fillStyle = isNodeHot ? '#2a1f10' : '#121823';
      ctx.fill();
      ctx.strokeStyle = isNodeHot ? '#ffb454' : (idx === root ? '#60a5fa' : '#334155');
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.font = '700 11px "Cascadia Code", Consolas, monospace';
      ctx.fillStyle = isNodeHot ? '#ffb454' : '#f7f9fc';
      const txt = String(info.val);
      ctx.fillText(txt, info.x - ctx.measureText(txt).width / 2, info.y + 4);
    });
    return;
  }

  if (kind === 'graph' && d.nodes && d.nodes.length) {
    const byId = new Map<number | string, { id: number | string; label: number | string; x: number; y: number }>();
    const scaleX = bw / 180;
    const scaleY = Math.min(1.15, bh / 136);
    d.nodes.forEach((n: { id?: number | string; label?: number | string; x: number; y: number }, idx: number) => {
      byId.set(n.id ?? idx, {
        id: n.id ?? idx,
        label: n.label ?? (n.id ?? idx),
        x: bx + n.x * scaleX,
        y: by + n.y * scaleY,
      });
    });
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    (d.edges || []).forEach((e: [number | string, number | string]) => {
      const a = byId.get(e[0]), b = byId.get(e[1]);
      if (a && b) {
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    });
    byId.forEach(n => {
      const isNodeHot = d.hot === n.id;
      ctx.beginPath();
      ctx.arc(n.x, n.y, 12, 0, Math.PI * 2);
      ctx.fillStyle = isNodeHot ? '#2a1f10' : '#121823';
      ctx.fill();
      ctx.strokeStyle = isNodeHot ? '#ffb454' : '#334155';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.font = '700 11px "Cascadia Code", Consolas, monospace';
      ctx.fillStyle = isNodeHot ? '#ffb454' : '#f7f9fc';
      const txt = String(n.label);
      ctx.fillText(txt, n.x - ctx.measureText(txt).width / 2, n.y + 4);
    });
    return;
  }

  if (kind === 'grid' && d.cells && d.cells.length) {
    const rows = Math.min(d.cells.length, 6);
    const cols = Math.min((d.cells[0] || []).length, 10);
    const cellS = Math.min(24, Math.floor(Math.min(bw / Math.max(1, cols), bh / Math.max(1, rows))));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const gx = bx + c * (cellS + 3);
        const gy = by + r * (cellS + 3);
        const isCellHot = d.mark && d.mark[0] === r && d.mark[1] === c;
        roundRectPath(ctx, gx, gy, cellS, cellS, 4);
        ctx.fillStyle = isCellHot ? 'rgba(255,180,84,0.24)' : '#121823';
        ctx.fill();
        ctx.strokeStyle = isCellHot ? '#ffb454' : '#222b38';
        ctx.stroke();
        ctx.font = '600 11px "Cascadia Code", Consolas, monospace';
        ctx.fillStyle = isCellHot ? '#ffb454' : '#cbd5e1';
        const vStr = String(d.cells[r][c] ?? '·');
        ctx.fillText(vStr, gx + (cellS - ctx.measureText(vStr).width) / 2, gy + cellS / 2 + 4);
      }
    }
    return;
  }

  if (kind === 'interface' || kind === 'object') {
    const fields = d.fields || (d.entries ? d.entries.map((e: { k: string; v: unknown }) => ({ k: e.k, v: e.v, declaredType: typeof e.v })) : []);
    const rowH = 22;
    fields.slice(0, 5).forEach((f: { k: string; v?: unknown; optional?: boolean; declaredType?: string }, idx: number) => {
      const ry = by + idx * (rowH + 4);
      if (ry + rowH > y + h - 4) return;
      const isRowHot = d.hot === f.k;
      roundRectPath(ctx, bx, ry, bw, rowH, 5);
      ctx.fillStyle = isRowHot ? 'rgba(255,180,84,0.22)' : '#121823';
      ctx.fill();
      ctx.strokeStyle = isRowHot ? '#ffb454' : '#232c3b';
      ctx.stroke();

      ctx.font = '700 11px "Cascadia Code", Consolas, monospace';
      ctx.fillStyle = '#9cdcfe';
      const keyTxt = f.k + (f.optional ? '?' : '');
      ctx.fillText(keyTxt, bx + 8, ry + 15);
      const kw = ctx.measureText(keyTxt).width;

      if (f.declaredType) {
        ctx.font = '600 10px "Cascadia Code", Consolas, monospace';
        ctx.fillStyle = '#4ec9b0';
        ctx.fillText(': ' + f.declaredType, bx + 12 + kw, ry + 15);
      }

      if (f.v !== undefined) {
        const valTxt = typeof f.v === 'string' ? JSON.stringify(f.v) : String(f.v);
        ctx.font = '700 11px "Cascadia Code", Consolas, monospace';
        ctx.fillStyle = typeof f.v === 'string' ? '#9ece6a' : '#ffb454';
        const vw = ctx.measureText(valTxt).width;
        ctx.fillText(valTxt, Math.max(bx + 90, bx + bw - vw - 8), ry + 15);
      }
    });
    return;
  }

  if (kind === 'string' && d.items) {
    const chars = d.items.slice(0, 24);
    chars.forEach((ch: string, idx: number) => {
      const cx = bx + idx * 24;
      if (cx + 22 > bx + bw) return;
      const isHotCh = d.hot === idx;
      roundRectPath(ctx, cx, by + 10, 21, 26, 4);
      ctx.fillStyle = isHotCh ? 'rgba(255,180,84,0.22)' : '#121823';
      ctx.fill();
      ctx.strokeStyle = isHotCh ? '#ffb454' : '#253042';
      ctx.stroke();
      ctx.font = '700 12px "Cascadia Code", Consolas, monospace';
      ctx.fillStyle = isHotCh ? '#ffb454' : '#f7f9fc';
      ctx.fillText(String(ch), cx + 6, by + 27);
    });
  }
}

export function renderVideoFrameToCanvas(ctx: CanvasRenderingContext2D, stepIdx: number, subProgress: number, speedMult: number) {
  const W = VIDEO_WIDTH, H = VIDEO_HEIGHT;
  const st = TRACE.steps[stepIdx] || TRACE.steps[0];
  const prevSt = stepIdx > 0 ? TRACE.steps[stepIdx - 1] : null;
  const codeLines = (TRACE.code && TRACE.code.length) ? TRACE.code : editor.value.replace(/\r/g, '').split('\n');

  // Background
  ctx.fillStyle = '#07090d';
  ctx.fillRect(0, 0, W, H);

  // Top Header Bar (56px)
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

  // Top-right badge in video frame
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

  // Split Pane Geometry
  const splitX = 1110;
  const mainTop = 56, mainBottom = H - 56, mainH = mainBottom - mainTop;

  // Left Code Pane
  ctx.fillStyle = '#0a0e14';
  ctx.fillRect(0, mainTop, splitX, mainH);
  ctx.strokeStyle = '#1d232e';
  ctx.beginPath();
  ctx.moveTo(splitX, mainTop);
  ctx.lineTo(splitX, mainBottom);
  ctx.stroke();

  // Pane titles
  ctx.font = '700 12px "Segoe UI", sans-serif';
  ctx.fillStyle = '#98a2b3';
  ctx.fillText('SOURCE', 22, mainTop + 26);

  // Code lines rendering
  const curLine = st ? st.line : -1;
  const lh = 26;
  const codeStartY = mainTop + 46;
  const maxVisibleLines = Math.floor((mainH - 64) / lh);
  let startLineIdx = 0;
  if (curLine > maxVisibleLines - 6) {
    startLineIdx = Math.max(0, Math.min(codeLines.length - maxVisibleLines, curLine - Math.floor(maxVisibleLines / 2)));
  }

  for (let i = 0; i < maxVisibleLines && (startLineIdx + i) < codeLines.length; i++) {
    const lineIdx = startLineIdx + i;
    const lineNum = lineIdx + 1;
    const raw = codeLines[lineIdx] || '';
    const ly = codeStartY + i * lh;
    const isCur = lineNum === curLine;
    const hasCkpt = /^\s*(?:checkpoint|断点)\s*\(/.test(raw);

    if (isCur) {
      const pulseAlpha = 0.14 + 0.06 * Math.sin(subProgress * Math.PI);
      ctx.fillStyle = st && st.error ? 'rgba(248,113,113,0.20)' : `rgba(255,180,84,${pulseAlpha.toFixed(3)})`;
      ctx.fillRect(0, ly - 17, splitX - 2, lh);
      ctx.fillStyle = st && st.error ? '#f87171' : '#ffb454';
      ctx.fillRect(0, ly - 17, 4, lh);
    }

    if (hasCkpt) {
      ctx.beginPath();
      ctx.arc(14, ly - 5, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#38bdf8';
      ctx.fill();
    }

    ctx.font = (isCur ? '700 ' : '500 ') + '14px "Cascadia Code", Consolas, monospace';
    ctx.fillStyle = isCur ? '#ffb454' : '#4b5565';
    const numStr = String(lineNum).padStart(2, ' ');
    ctx.fillText(numStr, 26, ly);

    // Syntax colored tokens
    let tx = 68;
    const tokens = tokenizeCodeForCanvas(raw);
    tokens.forEach(tok => {
      ctx.fillStyle = tok.color;
      ctx.fillText(tok.text, tx, ly);
      tx += ctx.measureText(tok.text).width;
    });
  }

  // Inter-line HUD Pill for active step
  if (st && (st.anim || st.error)) {
    const hudText = st.error
      ? `✗ RUNTIME ERROR: ${st.error}`
      : (st.note || '');
    ctx.font = '600 13px "Cascadia Code", Consolas, monospace';
    const hudW = Math.min(splitX - 60, ctx.measureText(hudText).width + 32);
    const hudX = 36, hudY = mainBottom - 54;
    roundRectPath(ctx, hudX, hudY, hudW, 36, 9);
    ctx.fillStyle = st.error ? 'rgba(42,14,18,0.95)' : (st.isCheckpoint ? 'rgba(11,29,46,0.95)' : 'rgba(19,27,40,0.95)');
    ctx.fill();
    ctx.strokeStyle = st.error ? '#f87171' : (st.isCheckpoint ? '#38bdf8' : '#ffb454');
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = st.error ? '#fecaca' : (st.isCheckpoint ? '#bae6fd' : '#fde68a');
    ctx.fillText(hudText.slice(0, 88), hudX + 14, hudY + 23);
  }

  // Right Side Panel (LOCALS + WATCH + CONSOLE)
  const sideX = splitX + 1, sideW = W - sideX;
  ctx.fillStyle = '#0d1219';
  ctx.fillRect(sideX, mainTop, sideW, mainH);

  // LOCALS section
  ctx.font = '700 12px "Segoe UI", sans-serif';
  ctx.fillStyle = '#98a2b3';
  ctx.fillText('LOCALS', sideX + 20, mainTop + 24);

  // Call Stack breadcrumb bar in video export
  const stackFrames = (st && Array.isArray(st.callStack) && st.callStack.length)
    ? st.callStack
    : [{ label: 'global' }];
  const stackChainTxt = stackFrames.map(f => f.label).join(' ▸ ');
  roundRectPath(ctx, sideX + 20, mainTop + 32, sideW - 40, 26, 7);
  ctx.fillStyle = '#0b1018';
  ctx.fill();
  ctx.strokeStyle = '#1e2736';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.font = '600 12px "Cascadia Code", Consolas, monospace';
  ctx.fillStyle = '#7dd3fc';
  ctx.fillText(stackChainTxt.slice(0, 72), sideX + 30, mainTop + 49);

  const v = (st && st.v) || {};
  const prevV = (prevSt && prevSt.v) || {};
  let locX = sideX + 20, locY = mainTop + 66;
  const primKeys = Object.keys(v).filter(k => v[k] === null || typeof v[k] !== 'object');
  primKeys.forEach(k => {
    const valStr = String(v[k]);
    const changed = prevSt && prevV[k] !== v[k];
    ctx.font = '600 13px "Cascadia Code", Consolas, monospace';
    const chipW = ctx.measureText(`${k} : ${valStr}`).width + 24;
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
    ctx.fillText(valStr, locX + 18 + kw, locY + 19);
    locX += chipW + 8;
  });

  // WATCH section
  const watchHeaderY = Math.max(mainTop + 124, locY + 46);
  ctx.font = '700 12px "Segoe UI", sans-serif';
  ctx.fillStyle = '#98a2b3';
  ctx.fillText('WATCH · 数据结构可视化', sideX + 20, watchHeaderY);

  const ds = (st && st.ds) || {};
  const vars = discoverVars().filter((s: { id: string; name?: string }) => watched.has(s.id) && ds[s.id] !== undefined);
  const allocated = allocateSlotSpans(vars, ds);
  const gridLeft = sideX + 20;
  const gridW = sideW - 40;
  const colGap = 12;
  const colW = Math.floor((gridW - colGap) / 2);
  let curRowY = watchHeaderY + 14;
  interface AllocatedSlotItem {
    s: { id: string; name?: string };
    d: Frame | null | undefined;
    kind: string;
    span: number;
  }
  let pendingSingle: AllocatedSlotItem | null = null;

  const consoleTop = mainBottom - 84;

  function drawRowItems(items: AllocatedSlotItem[]) {
    if (!items.length || curRowY + 95 > consoleTop) return;
    const isTall = items.some((it: AllocatedSlotItem) => it.kind === 'tree' || it.kind === 'graph' || it.kind === 'grid' || it.kind === 'stack' || it.kind === 'interface');
    const cardH = Math.min(isTall ? 158 : 108, consoleTop - curRowY - 8);
    if (cardH < 64) return;
    if (items.length === 1) {
      drawVizCardOnCanvas(ctx, gridLeft, curRowY, gridW, cardH, items[0].s, items[0].d, items[0].kind);
    } else {
      drawVizCardOnCanvas(ctx, gridLeft, curRowY, colW, cardH, items[0].s, items[0].d, items[0].kind);
      drawVizCardOnCanvas(ctx, gridLeft + colW + colGap, curRowY, colW, cardH, items[1].s, items[1].d, items[1].kind);
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

  // Console footer in sidePanel
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
  ctx.fillText(String((st && st.note) || '').slice(0, 76), sideX + 36, consoleTop + 30);

  // Bottom Control Bar (56px)
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
  else if (DEBUG_SESSION.finished && stepIdx === TRACE.steps.length - 1) { statusLabel = '✓ 执行完毕'; statusColor = '#ffb454'; }

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


export function ebmlUintBytes(num: number | string) {
  let v = Math.max(0, Math.floor(Number(num) || 0));
  if (v === 0) return new Uint8Array([0]);
  const bytes: number[] = [];
  while (v > 0) {
    bytes.unshift(v & 0xFF);
    v = Math.floor(v / 256);
  }
  return new Uint8Array(bytes);
}

export function ebmlFloat64Bytes(val: number | string) {
  const buf = new ArrayBuffer(8);
  new DataView(buf).setFloat64(0, Number(val) || 0, false);
  return new Uint8Array(buf);
}

export function ebmlAsciiBytes(str: string | null | undefined) {
  const s = String(str || '');
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0x7F;
  return out;
}

export function ebmlVintSize(len: number) {
  const n = Math.max(0, Math.floor(len));
  if (n < 0x7F) return new Uint8Array([0x80 | n]);
  if (n < 0x3FFF) return new Uint8Array([0x40 | (n >> 8), n & 0xFF]);
  if (n < 0x1FFFFF) return new Uint8Array([0x20 | (n >> 16), (n >> 8) & 0xFF, n & 0xFF]);
  if (n < 0x0FFFFFFF) {
    return new Uint8Array([
      0x10 | ((n >>> 24) & 0x0F),
      (n >>> 16) & 0xFF,
      (n >>> 8) & 0xFF,
      n & 0xFF,
    ]);
  }
  const hi = Math.floor(n / 0x100000000);
  const lo = n >>> 0;
  return new Uint8Array([
    0x01,
    (hi >>> 16) & 0xFF,
    (hi >>> 8) & 0xFF,
    hi & 0xFF,
    (lo >>> 24) & 0xFF,
    (lo >>> 16) & 0xFF,
    (lo >>> 8) & 0xFF,
    lo & 0xFF,
  ]);
}

export function concatUint8Arrays(arrays: Uint8Array[]) {
  let total = 0;
  for (let i = 0; i < arrays.length; i++) total += arrays[i].length;
  const out = new Uint8Array(total);
  let offset = 0;
  for (let i = 0; i < arrays.length; i++) {
    out.set(arrays[i], offset);
    offset += arrays[i].length;
  }
  return out;
}

export function ebmlElement(idBytes: Uint8Array | number[], payload: Uint8Array | Uint8Array[] | number[]) {
  const idArr = idBytes instanceof Uint8Array ? idBytes : new Uint8Array(idBytes);
  const body = Array.isArray(payload)
    ? (payload[0] instanceof Uint8Array ? concatUint8Arrays(payload as Uint8Array[]) : new Uint8Array(payload as number[]))
    : (payload instanceof Uint8Array ? payload : new Uint8Array(payload));
  const sizeArr = ebmlVintSize(body.length);
  return concatUint8Arrays([idArr, sizeArr, body]);
}

/* Build a 100% standards-compliant WebM file with known Segment/Info sizes, 0-based Cluster timestamps, and Cues index */
export function muxWebmChunks(
  frames: Array<{ data: Uint8Array; timestampMs: number; isKey: boolean }>,
  durationMs: number,
  width = VIDEO_WIDTH,
  height = VIDEO_HEIGHT,
  fps = VIDEO_FPS,
  codecId = 'V_VP8'
) {
  const ebmlHeader = ebmlElement([0x1A, 0x45, 0xDF, 0xA3], [
    ebmlElement([0x42, 0x86], ebmlUintBytes(1)),
    ebmlElement([0x42, 0xF7], ebmlUintBytes(1)),
    ebmlElement([0x42, 0xF2], ebmlUintBytes(4)),
    ebmlElement([0x42, 0xF3], ebmlUintBytes(8)),
    ebmlElement([0x42, 0x82], ebmlAsciiBytes('webm')),
    ebmlElement([0x42, 0x87], ebmlUintBytes(4)),
    ebmlElement([0x42, 0x85], ebmlUintBytes(2)),
  ]);

  const infoElem = ebmlElement([0x15, 0x49, 0xA9, 0x66], [
    ebmlElement([0x2A, 0xD7, 0xB1], ebmlUintBytes(1000000)), // 1ms TimecodeScale
    ebmlElement([0x44, 0x89], ebmlFloat64Bytes(durationMs)), // Exact Duration in ms
    ebmlElement([0x4D, 0x80], ebmlAsciiBytes('TSPlaygroundVisual')),
    ebmlElement([0x57, 0x41], ebmlAsciiBytes('TSPlaygroundVisual')),
  ]);

  const defaultDurNs = Math.round(1_000_000_000 / fps);
  const tracksElem = ebmlElement([0x16, 0x54, 0xAE, 0x6B], [
    ebmlElement([0xAE], [
      ebmlElement([0xD7], ebmlUintBytes(1)),
      ebmlElement([0x73, 0xC5], ebmlUintBytes(1)),
      ebmlElement([0x9C], ebmlUintBytes(0)),
      ebmlElement([0x22, 0xB5, 0x9C], ebmlAsciiBytes('und')),
      ebmlElement([0x86], ebmlAsciiBytes(codecId)),
      ebmlElement([0x83], ebmlUintBytes(1)),
      ebmlElement([0x23, 0xE3, 0x83], ebmlUintBytes(defaultDurNs)),
      ebmlElement([0xE0], [
        ebmlElement([0xB0], ebmlUintBytes(width)),
        ebmlElement([0xBA], ebmlUintBytes(height)),
      ]),
    ]),
  ]);

  // Group frames into Clusters (new cluster on every keyframe or every 2000ms)
  const clusters: Array<{ timecodeMs: number; blocks: Uint8Array[] }> = [];
  let curCluster: { timecodeMs: number; blocks: Uint8Array[] } | null = null;
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    const tMs = Math.max(0, Math.round(f.timestampMs));
    if (!curCluster || f.isKey || (tMs - curCluster.timecodeMs >= 2000)) {
      curCluster = { timecodeMs: tMs, blocks: [] };
      clusters.push(curCluster);
    }
    const relMs = Math.max(0, Math.min(32767, tMs - curCluster.timecodeMs));
    const blockHeader = new Uint8Array([
      0x81, // Track 1
      (relMs >> 8) & 0xFF,
      relMs & 0xFF,
      f.isKey ? 0x80 : 0x00,
    ]);
    const simpleBlock = ebmlElement([0xA3], [blockHeader, f.data]);
    curCluster.blocks.push(simpleBlock);
  }

  let segOffset = infoElem.length + tracksElem.length;
  const clusterElems: Uint8Array[] = [];
  const cuePoints: Uint8Array[] = [];

  for (let c = 0; c < clusters.length; c++) {
    const cl = clusters[c];
    const tcElem = ebmlElement([0xE7], ebmlUintBytes(cl.timecodeMs));
    const clElem = ebmlElement([0x1F, 0x43, 0xB6, 0x75], [tcElem, ...cl.blocks]);
    cuePoints.push(
      ebmlElement([0xBB], [
        ebmlElement([0xB3], ebmlUintBytes(cl.timecodeMs)),
        ebmlElement([0xB7], [
          ebmlElement([0xF7], ebmlUintBytes(1)),
          ebmlElement([0xF1], ebmlUintBytes(segOffset)),
        ]),
      ])
    );
    clusterElems.push(clElem);
    segOffset += clElem.length;
  }

  const cuesElem = ebmlElement([0x1C, 0x53, 0xBB, 0x6B], cuePoints);
  const segmentBody = concatUint8Arrays([infoElem, tracksElem, ...clusterElems, cuesElem]);
  const segmentSize8 = new Uint8Array([
    0x01, 0x00, 0x00, 0x00,
    (segmentBody.length >>> 24) & 0xFF,
    (segmentBody.length >>> 16) & 0xFF,
    (segmentBody.length >>> 8) & 0xFF,
    segmentBody.length & 0xFF,
  ]);
  const segmentElem = concatUint8Arrays([new Uint8Array([0x18, 0x53, 0x80, 0x67]), segmentSize8, segmentBody]);
  return new Blob([ebmlHeader, segmentElem], { type: 'video/webm' });
}

/* Patch WebM EBML Segment & Info with exact Duration (float64), known sizes, and 0-based Cluster Timecodes */
export async function fixWebmDuration(blob: Blob, durationMs: number) {
  if (!blob || !(durationMs > 0)) return blob;
  try {
    const buf = await blob.arrayBuffer();
    const bytes = new Uint8Array(buf);

    // 1. Locate Info [0x15, 0x49, 0xA9, 0x66] and Tracks [0x16, 0x54, 0xAE, 0x6B]
    const searchLimit = Math.min(bytes.length - 12, 16384);
    let infoPos = -1;
    let tracksPos = -1;
    for (let i = 0; i < searchLimit; i++) {
      if (infoPos < 0 && bytes[i] === 0x15 && bytes[i + 1] === 0x49 && bytes[i + 2] === 0xA9 && bytes[i + 3] === 0x66) {
        infoPos = i;
      } else if (infoPos >= 0 && bytes[i] === 0x16 && bytes[i + 1] === 0x54 && bytes[i + 2] === 0xAE && bytes[i + 3] === 0x6B) {
        tracksPos = i;
        break;
      }
    }
    if (infoPos < 0) return blob;

    // Read VINT length of Info size field
    const sizeIdx = infoPos + 4;
    const firstByte = bytes[sizeIdx];
    let vintLen = 1;
    let mask = 0x80;
    while (vintLen <= 8 && !(firstByte & mask)) {
      mask >>= 1;
      vintLen++;
    }
    if (vintLen > 8) return blob;

    let parsedInfoSize = firstByte & (mask - 1);
    for (let k = 1; k < vintLen; k++) {
      parsedInfoSize = (parsedInfoSize * 256) + bytes[sizeIdx + k];
    }
    const isUnknownInfoSize = (vintLen === 8 && bytes[sizeIdx + 1] === 0xFF && bytes[sizeIdx + 2] === 0xFF) ||
      (parsedInfoSize === Math.pow(2, 7 * vintLen) - 1);

    const infoDataStart = sizeIdx + vintLen;
    const infoDataEnd = tracksPos > infoDataStart
      ? tracksPos
      : (!isUnknownInfoSize ? Math.min(bytes.length, infoDataStart + parsedInfoSize) : Math.min(bytes.length, infoDataStart + 64));

    // Check if Duration [0x44, 0x89] already exists inside Info payload
    let existingDurUpdated = false;
    for (let i = infoDataStart; i <= infoDataEnd - 11; i++) {
      if (bytes[i] === 0x44 && bytes[i + 1] === 0x89 && bytes[i + 2] === 0x88) {
        new DataView(bytes.buffer, bytes.byteOffset + i + 3, 8).setFloat64(0, durationMs, false);
        existingDurUpdated = true;
        break;
      }
    }

    let outBytes = bytes;
    let tailStartInOut = infoDataEnd;

    if (!existingDurUpdated) {
      const durElem = new Uint8Array(11);
      durElem[0] = 0x44;
      durElem[1] = 0x89;
      durElem[2] = 0x88;
      new DataView(durElem.buffer).setFloat64(3, durationMs, false);

      const origInfoPayload = bytes.subarray(infoDataStart, infoDataEnd);
      const newInfoPayloadLen = durElem.length + origInfoPayload.length;
      const newSizeVint = new Uint8Array([
        0x10 | ((newInfoPayloadLen >>> 24) & 0x0F),
        (newInfoPayloadLen >>> 16) & 0xFF,
        (newInfoPayloadLen >>> 8) & 0xFF,
        newInfoPayloadLen & 0xFF,
      ]);

      const head = bytes.subarray(0, infoPos + 4);
      const tail = bytes.subarray(infoDataEnd);
      outBytes = concatUint8Arrays([head, newSizeVint, durElem, origInfoPayload, tail]);
      tailStartInOut = head.length + newSizeVint.length + durElem.length + origInfoPayload.length;
    }

    // 2. Patch Segment [0x18, 0x53, 0x80, 0x67] 8-byte unknown size with exact Segment length
    for (let i = 0; i < Math.min(infoPos, 128); i++) {
      if (outBytes[i] === 0x18 && outBytes[i + 1] === 0x53 && outBytes[i + 2] === 0x80 && outBytes[i + 3] === 0x67) {
        if (outBytes[i + 4] === 0x01 && outBytes[i + 5] === 0xFF && outBytes[i + 6] === 0xFF) {
          const segPayloadLen = outBytes.length - (i + 12);
          outBytes[i + 4] = 0x01;
          outBytes[i + 5] = 0x00;
          outBytes[i + 6] = 0x00;
          outBytes[i + 7] = 0x00;
          outBytes[i + 8] = (segPayloadLen >>> 24) & 0xFF;
          outBytes[i + 9] = (segPayloadLen >>> 16) & 0xFF;
          outBytes[i + 10] = (segPayloadLen >>> 8) & 0xFF;
          outBytes[i + 11] = segPayloadLen & 0xFF;
        }
        break;
      }
    }

    // 3. Rebase Cluster [0x1F, 0x43, 0xB6, 0x75] Timecode [0xE7] elements so first Cluster is at 0ms (eliminates OS uptime 26113:02)
    let firstClusterTc: number | null = null;
    for (let i = tailStartInOut; i < outBytes.length - 16; i++) {
      if (outBytes[i] === 0x1F && outBytes[i + 1] === 0x43 && outBytes[i + 2] === 0xB6 && outBytes[i + 3] === 0x75) {
        // Skip Cluster size VINT
        const b0 = outBytes[i + 4];
        let vLen = 1, m = 0x80;
        while (vLen <= 8 && !(b0 & m)) { m >>= 1; vLen++; }
        const tcPos = i + 4 + vLen;
        if (tcPos + 2 < outBytes.length && outBytes[tcPos] === 0xE7) {
          const tcSizeByte = outBytes[tcPos + 1];
          const tcLen = tcSizeByte & 0x7F;
          if (tcLen >= 1 && tcLen <= 8 && tcPos + 2 + tcLen <= outBytes.length) {
            let val = 0;
            for (let b = 0; b < tcLen; b++) {
              val = (val * 256) + outBytes[tcPos + 2 + b];
            }
            if (firstClusterTc === null) {
              firstClusterTc = val;
            }
            if (firstClusterTc > 0) {
              let rebased = Math.max(0, Math.min(Math.round(durationMs), val - firstClusterTc));
              for (let b = tcLen - 1; b >= 0; b--) {
                outBytes[tcPos + 2 + b] = rebased & 0xFF;
                rebased = Math.floor(rebased / 256);
              }
            }
          }
        }
      }
    }

    return new Blob([outBytes], { type: 'video/webm' });
  } catch (_) {
    return blob;
  }
}

/* Fast offline 1920x1080 60fps encoding via WebCodecs VideoEncoder + deterministic WebM muxer */
export async function encodeVideoFastWebCodecs(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  totalSteps: number,
  stepDurationMs: number,
  mult: number
) {
  if (typeof VideoEncoder !== 'function' || typeof VideoFrame !== 'function') return null;

  const codecCandidates = [
    { codec: 'vp8', webmId: 'V_VP8' },
    { codec: 'vp09.00.10.08', webmId: 'V_VP9' },
  ];
  let chosen: { codec: string; webmId: string } | null = null;
  for (const c of codecCandidates) {
    try {
      const sup = await VideoEncoder.isConfigSupported({
        codec: c.codec,
        width: VIDEO_WIDTH,
        height: VIDEO_HEIGHT,
        bitrate: 8_000_000,
        framerate: VIDEO_FPS,
        latencyMode: 'realtime',
      });
      if (sup && sup.supported) {
        chosen = c;
        break;
      }
    } catch (_) {}
  }
  if (!chosen) return null;

  const encodedFrames: Array<{ data: Uint8Array; timestampMs: number; isKey: boolean }> = [];
  let encoderError: DOMException | Error | null = null;
  const encoder = new VideoEncoder({
    output: (chunk) => {
      const data = new Uint8Array(chunk.byteLength);
      chunk.copyTo(data);
      encodedFrames.push({
        data,
        timestampMs: Math.max(0, Math.round(chunk.timestamp / 1000)),
        isKey: chunk.type === 'key',
      });
    },
    error: (err) => {
      encoderError = err;
    },
  });

  encoder.configure({
    codec: chosen.codec,
    width: VIDEO_WIDTH,
    height: VIDEO_HEIGHT,
    bitrate: 8_000_000,
    framerate: VIDEO_FPS,
    latencyMode: 'realtime',
  });

  const frameDurMs = 1000 / VIDEO_FPS;
  const totalDurationMs = totalSteps * stepDurationMs;
  const subFramesPerStep = 6; // Smooth active-line pulse across each step at 60fps timebase

  for (let s = 0; s < totalSteps; s++) {
    if (encoderError) throw encoderError;
    if (videoExportStatus && (s % 2 === 0 || s === totalSteps - 1)) {
      const pct = Math.round(((s + 1) / totalSteps) * 100);
      videoExportStatus.textContent = `正在极速编码 1920×1080 60fps (${mult}x) · ${pct}%`;
      await new Promise(r => setTimeout(r, 0));
    }

    const stepStartMs = s * stepDurationMs;
    for (let k = 0; k < subFramesPerStep; k++) {
      const frac = k / subFramesPerStep;
      const rawMs = stepStartMs + frac * stepDurationMs;
      const tickIdx = Math.round(rawMs / frameDurMs);
      const tMs = Math.min(totalDurationMs - 17, Math.round(tickIdx * frameDurMs));
      const tUs = tMs * 1000;

      if (k === 0 || k === 3) {
        renderVideoFrameToCanvas(ctx, s, frac, mult);
      }
      const vf = new VideoFrame(canvas, {
        timestamp: tUs,
        duration: Math.round((stepDurationMs / subFramesPerStep) * 1000),
      });
      encoder.encode(vf, { keyFrame: k === 0 });
      vf.close();
    }

    // Emit a final anchor frame at the very end of the last step so players see the exact end timestamp
    if (s === totalSteps - 1) {
      const endMs = Math.max(0, Math.round(totalDurationMs - frameDurMs));
      const vfEnd = new VideoFrame(canvas, {
        timestamp: endMs * 1000,
        duration: Math.round(frameDurMs * 1000),
      });
      encoder.encode(vfEnd, { keyFrame: false });
      vfEnd.close();
    }

    while (encoder.encodeQueueSize > 12) {
      await new Promise(r => setTimeout(r, 4));
    }
  }

  await encoder.flush();
  encoder.close();
  if (encoderError || !encodedFrames.length) return null;

  return {
    blob: muxWebmChunks(encodedFrames, totalDurationMs, VIDEO_WIDTH, VIDEO_HEIGHT, VIDEO_FPS, chosen.webmId),
    durationMs: totalDurationMs,
  };
}

export async function exportVideo(speedMult = VIDEO_EXPORT_SPEED) {
  if (IS_EXPORTING_VIDEO) return false;
  const mult = setVideoExportSpeed(speedMult);
  stopAuto();

  const savedCur = cur;

  // Prepare full debug trace from beginning to end (or runtime error)
  if (!startDebug(0)) {
    say('✗ 代码编译未通过，无法导出视频', 'err');
    return false;
  }
  while (!DEBUG_SESSION.finished && TRACE.steps.length < MAX_STEPS) {
    if (!computeAndAppendNextStep({ silent: true })) break;
  }
  initWatchedVars();

  if (!TRACE.steps.length) {
    say('✗ 当前代码未产生可录制的调试步骤', 'err');
    return false;
  }

  IS_EXPORTING_VIDEO = true;
  if (btnExportVideo) btnExportVideo.disabled = true;
  if (btnExportVideoLabel) btnExportVideoLabel.textContent = '⏺ 正在极速导出...';
  if (videoExportStatus) {
    videoExportStatus.classList.add('active');
    videoExportStatus.textContent = `准备极速导出 1920×1080 @ ${VIDEO_FPS}fps (${mult}x 倍速)...`;
  }
  say(`🎬 开始极速导出视频：分辨率 ${VIDEO_WIDTH}×${VIDEO_HEIGHT} · ${VIDEO_FPS}fps · 倍速 ${mult}x`, 'ok');

  try {
    const canvas: any = document.createElement('canvas');
    canvas.width = VIDEO_WIDTH;
    canvas.height = VIDEO_HEIGHT;
    const ctx = canvas.getContext('2d');

    // Step duration strictly relative to AUTO_PLAY_MS (900ms at 1x)
    const stepDurationMs = Math.max(120, Math.round(AUTO_PLAY_MS / mult));
    const totalSteps = TRACE.steps.length;
    const targetTotalDurationMs = totalSteps * stepDurationMs;

    // 1. Primary path: Fast offline WebCodecs VideoEncoder + deterministic WebM Muxer
    const fastRes = ctx ? await encodeVideoFastWebCodecs(canvas, ctx, totalSteps, stepDurationMs, mult) : null;
    if (fastRes && fastRes.blob) {
      cur = Math.min(savedCur, Math.max(0, TRACE.steps.length - 1));
      renderPicker();
      renderStatic(cur, false);

      const url = URL.createObjectURL(fastRes.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ts-playground-1080p-60fps-${mult}x.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const secTxt = (fastRes.durationMs / 1000).toFixed(1) + 's';
      if (videoExportStatus) {
        videoExportStatus.textContent = `✓ 已极速导出 (${secTxt}) ts-playground-1080p-60fps-${mult}x.webm`;
      }
      say(`✓ 视频极速导出完成：ts-playground-1080p-60fps-${mult}x.webm (1920×1080 · 60fps · ${mult}x 倍速 · 精确时长 ${secTxt})`, 'ok');
      return true;
    }

    // 2. Fallback path: MediaRecorder (WebM only) + fixWebmDuration
    if (typeof canvas.captureStream !== 'function' || typeof MediaRecorder === 'undefined') {
      if (ctx) renderVideoFrameToCanvas(ctx, totalSteps - 1, 1, mult);
      return true;
    }

    const mimeCandidates = [
      'video/webm;codecs=vp8',
      'video/webm;codecs=vp9',
      'video/webm',
    ];
    let mimeType = '';
    for (const m of mimeCandidates) {
      if (typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(m)) {
        mimeType = m;
        break;
      }
    }

    // Render initial frame BEFORE attaching captureStream so stream starts cleanly at t=0
    if (ctx) renderVideoFrameToCanvas(ctx, 0, 0, mult);
    const stream = canvas.captureStream(VIDEO_FPS);
    const videoTrack: any = stream.getVideoTracks && stream.getVideoTracks()[0];
    const recorderOpts: any = { videoBitsPerSecond: 8_000_000 };
    if (mimeType) recorderOpts.mimeType = mimeType;
    const recorder = new MediaRecorder(stream, recorderOpts);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) chunks.push(ev.data);
    };

    const stoppedPromise = new Promise((resolve, reject) => {
      recorder.onstop = resolve;
      recorder.onerror = (ev) => reject(ev.error || new Error('MediaRecorder error'));
    });

    const recStartWall = performance.now();
    recorder.start(100);
    const frameIntervalMs = 1000 / VIDEO_FPS;

    for (let s = 0; s < totalSteps; s++) {
      if (videoExportStatus && (s % 2 === 0 || s === totalSteps - 1)) {
        const pct = Math.round(((s + 1) / totalSteps) * 100);
        videoExportStatus.textContent = `正在合成 1920×1080 60fps (${mult}x) · ${pct}%`;
      }
      const stepStart = performance.now();
      if (ctx) renderVideoFrameToCanvas(ctx, s, 0.5, mult);
      while (true) {
        const now = performance.now();
        const elapsedStep = now - stepStart;
        if (elapsedStep >= stepDurationMs) break;
        if (videoTrack && typeof videoTrack.requestFrame === 'function') {
          try { videoTrack.requestFrame(); } catch (_) {}
        }
        const waitMs = Math.max(1, Math.min(frameIntervalMs, stepDurationMs - elapsedStep));
        await new Promise(r => setTimeout(r, waitMs));
      }
    }

    const actualDurationMs = Math.max(200, Math.round(performance.now() - recStartWall));
    recorder.stop();
    await stoppedPromise;
    stream.getTracks().forEach((t: { stop: () => void }) => t.stop());

    cur = Math.min(savedCur, Math.max(0, TRACE.steps.length - 1));
    renderPicker();
    renderStatic(cur, false);

    let blob = new Blob(chunks, { type: mimeType || 'video/webm' });
    blob = await fixWebmDuration(blob, actualDurationMs || targetTotalDurationMs);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ts-playground-1080p-60fps-${mult}x.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    const secTxt = (actualDurationMs / 1000).toFixed(1) + 's';
    if (videoExportStatus) {
      videoExportStatus.textContent = `✓ 已导出 (${secTxt}) ts-playground-1080p-60fps-${mult}x.webm`;
    }
    say(`✓ 视频导出完成：ts-playground-1080p-60fps-${mult}x.webm (1920×1080 · 60fps · ${mult}x 倍速 · 时长 ${secTxt})`, 'ok');
    return true;
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    if (videoExportStatus) videoExportStatus.textContent = '✗ 导出失败: ' + msg;
    say('✗ 视频导出失败: ' + msg, 'err');
    return false;
  } finally {
    IS_EXPORTING_VIDEO = false;
    if (btnExportVideo) btnExportVideo.disabled = false;
    if (btnExportVideoLabel) btnExportVideoLabel.textContent = '🎬 导出视频';
  }
}

if (btnExportVideo) {
  btnExportVideo.onclick = (e: MouseEvent) => {
    e.stopPropagation();
    exportVideo(VIDEO_EXPORT_SPEED);
  };
}

export function loadSample(key: string) {
  if (LANG === 'python') { PY_ENGINE.loadSample(key); return; }
  const targetKey = SAMPLES[key] ? key : 'showcase';
  if ($('sampleSel')) $('sampleSel').value = targetKey;
  editor.value = SAMPLES[targetKey];
  setFileName(targetKey + '.ts');
  lastEditorCursorLine = -1;
  clearLog('已加载样例 · 自动开启 Debug 调试模式（可按 ← / → 逐步当场计算，或点击左下「运行到下一个检查点」）');
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
    const wantsPython = Boolean(qs0 && qs0.get('lang') === 'python');
    let hasSaved = false;
    if (!hasUrlChoice && !wantsPython && typeof localStorage !== 'undefined') {
      try { hasSaved = Boolean(localStorage.getItem('ts-playground-session-v1')); } catch (_) {}
    }
    if (hash.startsWith('#s=') || wantsPython || hasSaved) {
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
        URL_WATCH = w ? w.split(',').map(s => s.trim()).filter(Boolean) : [];
      }
      if (qs.get('still') === '1') {
        IS_STILL = true;
        if (document.body && document.body.classList) document.body.classList.add('still');
      }
      if (qs.has('step')) {
        customStep = parseInt(qs.get('step') || '0', 10) || 0;
      }
    }
  } catch {}

  if ($('sampleSel')) $('sampleSel').value = sampleKey;
  editor.value = SAMPLES[sampleKey] || SAMPLES.showcase;
  setFileName(sampleKey + '.ts');
  updateEditorChrome();
  const initialStep = customStep !== null ? customStep : (SAMPLE_DEFAULT_STEP[sampleKey] || 0);
  generateTrace(initialStep);
}

export const initApp = boot;
