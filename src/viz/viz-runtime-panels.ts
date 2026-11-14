/* ================================================================
   Runtime Call Stack, Event Loop, Watch Scalar & Control Panels (src/viz/viz-runtime-panels.ts)
   ================================================================ */
import { appState, esc, uiHooks } from "../state";
import { Frame, StepSnapshot } from "../types";
import { $, callStackBarEl, callStackHintEl } from "../ui/dom";
import { getActiveFrame } from "./memory-normalizers";

export function selectStackFrame(frameIdx: number | string) {
  const st = appState.TRACE.steps[appState.cur];
  if (!st || !Array.isArray(st.callStack) || !st.callStack.length) return;
  const topIdx = st.callStack.length - 1;
  const clamped = Math.max(0, Math.min(topIdx, Number(frameIdx) || 0));
  appState.SELECTED_FRAME_IDX = clamped === topIdx ? null : clamped;
  uiHooks.renderStatic(appState.cur, false);
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
