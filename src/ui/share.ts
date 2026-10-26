/* ================================================================
   Canvas 1080p Frame Renderer, Sample Loader & Boot Logic (src/ui/share.ts)
   ================================================================ */
import { SAMPLES, SAMPLE_DEFAULT_STEP } from "../samples/ts-samples";
import { Frame } from "../types";
import { clearLog, resetTraceState } from "../runtime/event-loop";
import { startDebug, generateTrace } from "../runtime/runner";
import { discoverVars, allocateSlotSpans } from "../viz/memory-graph";
import { updateEditorChrome } from "../viz/highlight";
import { setFileName } from "./controls";

export * from "./video-webm";

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
    const nodes = d.nodes as Array<{ val: unknown; left?: number | null; right?: number | null }>;
    const root = d.root ?? 0;
    const coords = new Map<number, { x: number; y: number; val: unknown; left?: number | null; right?: number | null }>();
    function layout(idx: number | null | undefined, depth: number, xMin: number, xMax: number) {
      if (idx == null || !nodes[idx] || coords.has(idx) || depth > 4) return;
      const node = nodes[idx];
      if (!node) return;
      const nx = (xMin + xMax) / 2;
      const ny = by + 16 + depth * 32;
      coords.set(idx, { x: nx, y: ny, val: node.val, left: node.left, right: node.right });
      layout(node.left, depth + 1, xMin, nx);
      layout(node.right, depth + 1, nx, xMax);
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
    d.nodes.forEach((n: Frame, idx: number) => {
      byId.set(n.id ?? idx, {
        id: n.id ?? idx,
        label: n.label ?? (n.id ?? idx),
        x: bx + (n.x ?? 0) * scaleX,
        y: by + (n.y ?? 0) * scaleY,
      });
    });
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    (d.edges || []).forEach((e: [number | string, number | string] | Frame) => {
      const e0 = Array.isArray(e) ? e[0] : (e.from ?? 0);
      const e1 = Array.isArray(e) ? e[1] : (e.to ?? 0);
      const a = byId.get(e0), b = byId.get(e1);
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
        const isCellHot = Array.isArray(d.mark) && d.mark[0] === r && d.mark[1] === c;
        roundRectPath(ctx, gx, gy, cellS, cellS, 4);
        ctx.fillStyle = isCellHot ? 'rgba(255,180,84,0.24)' : '#121823';
        ctx.fill();
        ctx.strokeStyle = isCellHot ? '#ffb454' : '#222b38';
        ctx.stroke();
        ctx.font = '600 11px "Cascadia Code", Consolas, monospace';
        ctx.fillStyle = isCellHot ? '#ffb454' : '#cbd5e1';
        const vStr = String(d.cells[r]?.[c] ?? '·');
        ctx.fillText(vStr, gx + (cellS - ctx.measureText(vStr).width) / 2, gy + cellS / 2 + 4);
      }
    }
    return;
  }

  if (kind === 'interface' || kind === 'object') {
    const fields = d.fields || (d.entries ? d.entries.map((e: { k: unknown; v: unknown }) => ({ k: String(e.k), v: e.v, declaredType: typeof e.v })) : []);
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
    const chars = d.items.slice(0, 24) as string[];
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
  const mainTop = 56, mainBottom = H - 56, mainH = mainBottom - mainTop;

  ctx.fillStyle = '#0a0e14';
  ctx.fillRect(0, mainTop, splitX, mainH);
  ctx.strokeStyle = '#1d232e';
  ctx.beginPath();
  ctx.moveTo(splitX, mainTop);
  ctx.lineTo(splitX, mainBottom);
  ctx.stroke();

  ctx.font = '700 12px "Segoe UI", sans-serif';
  ctx.fillStyle = '#98a2b3';
  ctx.fillText('SOURCE', 22, mainTop + 26);

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

    let tx = 68;
    const tokens = tokenizeCodeForCanvas(raw);
    tokens.forEach(tok => {
      ctx.fillStyle = tok.color;
      ctx.fillText(tok.text, tx, ly);
      tx += ctx.measureText(tok.text).width;
    });
  }

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

  const sideX = splitX + 1, sideW = W - sideX;
  ctx.fillStyle = '#0d1219';
  ctx.fillRect(sideX, mainTop, sideW, mainH);

  ctx.font = '700 12px "Segoe UI", sans-serif';
  ctx.fillStyle = '#98a2b3';
  ctx.fillText('LOCALS', sideX + 20, mainTop + 24);

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
    const first = items[0];
    const second = items[1];
    if (!first || curRowY + 95 > consoleTop) return;
    const isTall = items.some((it: AllocatedSlotItem) => it.kind === 'tree' || it.kind === 'graph' || it.kind === 'grid' || it.kind === 'stack' || it.kind === 'interface');
    const cardH = Math.min(isTall ? 158 : 108, consoleTop - curRowY - 8);
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
  ctx.fillText(String((st && st.note) || '').slice(0, 76), sideX + 36, consoleTop + 30);

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

export function loadSample(key: string) {
  if (LANG === 'python') { PY_ENGINE.loadSample(key); return; }
  const targetKey = SAMPLES[key] ? key : 'showcase';
  if ($('sampleSel')) $('sampleSel').value = targetKey;
  const src = SAMPLES[targetKey] || '';
  if (typeof globalThis.openSampleScriptTab === 'function') {
    globalThis.openSampleScriptTab(targetKey + '.ts', src, 'ts');
  } else {
    editor.value = src;
    setFileName(targetKey + '.ts');
  }
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
  const initialSrc = SAMPLES[sampleKey] || SAMPLES.showcase || '';
  if (typeof globalThis.openSampleScriptTab === 'function') {
    globalThis.openSampleScriptTab(sampleKey + '.ts', initialSrc, 'ts');
  } else {
    editor.value = initialSrc;
    setFileName(sampleKey + '.ts');
  }
  updateEditorChrome();
  const initialStep = customStep !== null ? customStep : (SAMPLE_DEFAULT_STEP[sampleKey] || 0);
  generateTrace(initialStep);
}

export const initApp = boot;
