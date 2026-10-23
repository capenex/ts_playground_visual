/* ================================================================
   Stepper Controls, Checkpoints, File Import/Export & Resizer (src/ui/controls.ts)
   ================================================================ */
import { skipString } from "../compiler/comments";
import { stripTypes, transpileEnums, detectUnsupportedSyntax } from "../compiler/transpile";
import { collectNames, instrument, resolveEntry, blankJsLine, snapFnExpr } from "../compiler/instrumenter";
import { typecheckTS, reportTypeErrors, extractTsInterfaceMetadata } from "../compiler/type-checker";
import { say, clearLog, safeJSONStringify, resetTraceState } from "../runtime/event-loop";
import { computeAndAppendNextStep, startDebug, initWatchedVars, runOnce } from "../runtime/runner";
import { discoverVars, renderPicker, renderStatic, selectStackFrame } from "../viz/memory-graph";
import {
  updateEditorChrome,
  scrollCodeTo,
  hideHoverTip,
  syncScroll,
  hoverHitFromEvent,
  hoverWordAt,
  hoverTipForName,
} from "../viz/highlight";
import { clearFlyLayer, positionStepViz } from "../viz/ast-view";
import { loadSample } from "./share";

export function stepPrev() {
  stopAuto();
  if (!TRACE.steps.length || cur <= 0) return;
  SELECTED_FRAME_IDX = null;
  if (document.body && document.body.classList) document.body.classList.remove('editing-code');
  if (isEditorFocused()) blurEditor();
  cur--;
  renderPicker();
  renderStatic(cur, true);
}

export function stepNext(fromAuto = false) {
  if (!fromAuto) stopAuto();
  SELECTED_FRAME_IDX = null;
  if (document.body && document.body.classList) document.body.classList.remove('editing-code');
  if (isEditorFocused()) blurEditor();
  if (!DEBUG_SESSION.active) {
    startDebug(0);
    return;
  }
  if (cur < TRACE.steps.length - 1) {
    cur++;
    renderPicker();
    renderStatic(cur, true);
    return;
  }
  if (DEBUG_SESSION.finished) return;
  const ok = computeAndAppendNextStep();
  if (ok) {
    cur = TRACE.steps.length - 1;
    renderPicker();
    renderStatic(cur, true);
  } else {
    renderStatic(cur, false);
  }
}

export function runToNextCheckpoint() {
  if (LANG === 'python') return PY_ENGINE.runToNextCheckpoint();
  stopAuto();
  SELECTED_FRAME_IDX = null;
  if (document.body && document.body.classList) document.body.classList.remove('editing-code');
  if (isEditorFocused()) blurEditor();

  if (!DEBUG_SESSION.active) {
    if (!startDebug(0)) return;
    const firstSt = TRACE.steps[0];
    if (firstSt && (firstSt.isCheckpoint || firstSt.error || DEBUG_SESSION.finished)) {
      if (firstSt.isCheckpoint) {
        say('◉ 已到达检查点 [第 ' + firstSt.line + ' 行] · ' + (firstSt.note || ''), 'ok');
      }
      return;
    }
  }

  if (cur >= TRACE.steps.length - 1 && DEBUG_SESSION.finished) {
    return;
  }

  let safety = 0;
  while (safety++ < MAX_STEPS) {
    if (cur < TRACE.steps.length - 1) {
      cur++;
      const st = TRACE.steps[cur];
      if (st && (st.isCheckpoint || st.error || (cur === TRACE.steps.length - 1 && DEBUG_SESSION.finished))) {
        break;
      }
    } else {
      if (DEBUG_SESSION.finished) break;
      const added = computeAndAppendNextStep({ silent: true });
      if (!added) break;
      cur = TRACE.steps.length - 1;
      const st = TRACE.steps[cur];
      if (st && (st.isCheckpoint || st.error || DEBUG_SESSION.finished)) {
        break;
      }
    }
  }

  renderPicker();
  renderStatic(cur, true);

  const finalSt = TRACE.steps[cur];
  if (finalSt && finalSt.error) {
    // Already logged by computeAndAppendNextStep
  } else if (finalSt && finalSt.isCheckpoint) {
    say('◉ 已运行到检查点 [第 ' + finalSt.line + ' 行] · ' + (finalSt.note || ''), 'ok');
  } else if (DEBUG_SESSION.finished) {
    say('✓ 已运行至程序结束（后续无更多检查点）  →  ' + safeJSONStringify(DEBUG_SESSION.returnValue), 'ok');
  }
}

export function rebuildDebugAtPosition(newTargetLine: number, targetVisits: number, fallbackStepIdx: number) {
  const src = editor.value.replace(/\r/g, '');
  const unsupported = detectUnsupportedSyntax(src);
  if (unsupported.length) {
    unsupported.forEach(x => say('✗ 第 ' + x.line + ' 行：暂不支持 ' + x.feature + ' —— ' + x.hint, 'err', x.line));
    return false;
  }
  extractTsInterfaceMetadata(src);
  const diags = typecheckTS(src, STRICT_TS);
  if (diags.length > 0) {
    reportTypeErrors(diags);
    return false;
  }
  if (TYPE_ERROR_LINES.size || RUNTIME_ERROR_LINES.size) {
    TYPE_ERROR_LINES.clear();
    RUNTIME_ERROR_LINES.clear();
  }

  const originalLines = src.split('\n');
  const enums = transpileEnums(src);
  if (enums.error) {
    say('✗ 第 ' + enums.error.line + ' 行：' + enums.error.message, 'err', enums.error.line);
    return false;
  }
  const js0 = stripTypes(enums.code);
  const entry = resolveEntry(src, js0);
  const expr = stripTypes(entry.expr || 'undefined');
  ENTRY_CALL_LINE = entry.line || 0;
  const jsBody = entry.index >= 0 ? blankJsLine(js0, entry.index) : js0;

  let compiledFn;
  try {
    const names = collectNames(jsBody);
    const js = instrument(jsBody, originalLines, names);
    const finHook = '\n;try{if(typeof __t==="function"&&__t.__fin)__t.__fin(' + snapFnExpr(names) + ');}catch(_){}\n';
    const body = js + finHook + ';return (' + expr + ');';
    compiledFn = new Function('__t', 'console', body);
  } catch (e) {
    say('✗ 编译失败: ' + (e && e.message ? e.message : e), 'err');
    return false;
  }

  stopAuto();
  clearFlyLayer();
  const prevWatched = new Set(watched);
  TRACE = {
    title: 'TypeScript Playground · Debug',
    code: originalLines,
    steps: [],
  };
  DEBUG_SESSION = {
    active: true,
    finished: false,
    crashed: false,
    error: null,
    errorLine: -1,
    returnValue: undefined,
    compiledFn,
    originalLines,
    callExpr: expr,
  };
  cur = 0;

  let visitsSeen = 0;
  let safety = 0;
  while (safety++ < MAX_STEPS) {
    const ok = computeAndAppendNextStep({ silent: true });
    if (!ok) break;
    const latest = TRACE.steps[TRACE.steps.length - 1];
    if (newTargetLine >= 1 && targetVisits >= 1) {
      if (latest && latest.line === newTargetLine) {
        visitsSeen++;
        if (visitsSeen >= targetVisits) break;
      }
    } else if (TRACE.steps.length - 1 >= fallbackStepIdx) {
      break;
    }
    if (DEBUG_SESSION.finished) break;
  }

  cur = Math.max(0, TRACE.steps.length - 1);
  if (prevWatched.size > 0) {
    watched = prevWatched;
    discoverVars().forEach((s: { id: string }) => watched.add(s.id));
  } else {
    initWatchedVars();
  }
  renderPicker();
  renderStatic(cur, false);
  return true;
}

export function addCheckpointFunction(preferredLine?: any) {
  if (LANG === 'python') {
    const text = editor.value.replace(/\r\n?/g, '\n');
    const lines = text.split('\n');
    let line = preferredLine || (TRACE.steps[cur] && TRACE.steps[cur].line) || (window.__CM_CURSOR_LINE || lastEditorCursorLine) || lines.length;
    line = Math.max(1, Math.min(lines.length, line));
    const current = lines[line - 1] || '';
    const indent = (current.match(/^\s*/) || [''])[0];
    if (/:\s*(?:#.*)?$/.test(current)) {
      lines.splice(line, 0, indent + '    checkpoint()');
      line = line + 1;
    } else {
      lines.splice(line - 1, 0, indent + 'checkpoint()');
    }
    editor.value = lines.join('\n');
    lastEditorCursorLine = line;
    resetTraceState();
    PY_ENGINE.start(0);
    say('✓ 已插入 checkpoint()，正在重新录制 Python 执行步骤', 'ok');
    return;
  }
  const text = editor.value.replace(/\r\n?/g, '\n');
  const lines = text.split('\n');

  const wasActive = Boolean(DEBUG_SESSION.active && TRACE.steps.length > 0 && TRACE.steps[cur]);
  const origCurLine = wasActive ? TRACE.steps[cur].line : -1;
  const origLineVisits = wasActive
    ? TRACE.steps.slice(0, cur + 1).filter(s => s.line === origCurLine).length
    : 0;
  const prevCurIdx = cur;

  let fnOpenIdx = -1;
  let fnCloseIdx = lines.length - 1;
  let depth = 0;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (fnOpenIdx < 0 && /^\s*(?:export\s+)?(?:default\s+)?function\b/.test(raw)) {
      fnOpenIdx = i;
    }
    if (fnOpenIdx >= 0) {
      for (let k = 0; k < raw.length; k++) {
        const ch = raw[k];
        if (ch === '"' || ch === "'" || ch === '`') { k = skipString(raw, k) - 1; continue; }
        if (ch === '/' && raw[k + 1] === '/') break;
        if (ch === '{') depth++;
        else if (ch === '}') {
          depth--;
          if (depth === 0) {
            fnCloseIdx = i;
            break;
          }
        }
      }
      if (depth === 0 && fnCloseIdx >= fnOpenIdx) break;
    }
  }

  let targetIdx;
  const cursorLine = window.__CM_CURSOR_LINE || lastEditorCursorLine;
  if (typeof preferredLine === 'number' && preferredLine >= 1 && preferredLine <= lines.length) {
    targetIdx = preferredLine - 1;
  } else if (cursorLine >= 1 && cursorLine <= lines.length) {
    targetIdx = cursorLine - 1;
  } else if (wasActive) {
    targetIdx = origCurLine - 1;
  } else {
    targetIdx = fnOpenIdx >= 0 ? fnOpenIdx + 1 : 0;
  }

  if (fnOpenIdx >= 0) {
    if (targetIdx <= fnOpenIdx) targetIdx = fnOpenIdx + 1;
    if (targetIdx >= fnCloseIdx) targetIdx = Math.max(fnOpenIdx + 1, fnCloseIdx);
  }

  const refLine = lines[targetIdx] || '';
  const refTrim = refLine.trim();

  if (typeof preferredLine === 'number' && /^(?:checkpoint|断点)\s*\([^)]*\)\s*;?$/.test(refTrim)) {
    const removedLine = targetIdx + 1;
    lines.splice(targetIdx, 1);
    editor.value = lines.join('\n');
    if (staleTimer) clearTimeout(staleTimer);
    if (wasActive) {
      const newTargetLine = origCurLine > removedLine ? origCurLine - 1 : (origCurLine === removedLine ? -1 : origCurLine);
      rebuildDebugAtPosition(newTargetLine, origLineVisits, Math.max(0, prevCurIdx - 1));
    } else {
      startDebug(0);
    }
    const keepLine = Math.max(1, Math.min(lines.length, Math.min(removedLine, lines.length)));
    scrollCodeTo(keepLine);
    say('· 已移除第 ' + removedLine + ' 行的 checkpoint() 检查点函数（保持当前调试进度）', 'dim');
    return;
  }

  let insertIdx = targetIdx;
  let indent = (refLine.match(/^\s*/) || ['  '])[0] || '  ';
  if (refTrim.endsWith('{')) {
    insertIdx = targetIdx + 1;
    indent = indent + '  ';
  }

  const insertedLineNum = insertIdx + 1;
  lines.splice(insertIdx, 0, indent + 'checkpoint();');
  editor.value = lines.join('\n');
  lastEditorCursorLine = insertedLineNum;

  if (staleTimer) clearTimeout(staleTimer);
  if (wasActive) {
    const newTargetLine = origCurLine >= insertedLineNum ? origCurLine + 1 : origCurLine;
    rebuildDebugAtPosition(newTargetLine, origLineVisits, prevCurIdx);
  } else {
    startDebug(0);
  }
  scrollCodeTo(insertedLineNum);
  say('✓ 已在第 ' + insertedLineNum + ' 行添加检查点函数 checkpoint()（保持当前调试位置，点击左下「⏭ 运行到下一个检查点」即可运行至检查点）', 'ok');
}

export function go(i: number) {
  if (i > cur) stepNext();
  else if (i < cur) stepPrev();
}

export function stopAuto() {
  if (timer) { clearInterval(timer); timer = null; $('auto').textContent = '▶ 自动'; }
}

$('prev').onclick = () => stepPrev();
$('next').onclick = () => stepNext();
if ($('nextCheckpoint')) {
  $('nextCheckpoint').onclick = () => runToNextCheckpoint();
}
if ($('btnAddCheckpoint')) {
  $('btnAddCheckpoint').onclick = () => addCheckpointFunction();
}
if (gutterEl) {
  gutterEl.addEventListener('click', (e: any) => {
    const g = (e.target as any).closest('.gline');
    if (!g || !g.dataset.line) return;
    addCheckpointFunction(parseInt(g.dataset.line, 10));
  });
}

$('auto').onclick = async () => {
  if (timer) { stopAuto(); return; }
  if (!DEBUG_SESSION.active || (cur >= TRACE.steps.length - 1 && DEBUG_SESSION.finished)) {
    const ok = await Promise.resolve(startDebug(0));
    if (!ok) return;
  }
  if (cur >= TRACE.steps.length - 1 && DEBUG_SESSION.finished) return;
  $('auto').textContent = '⏸ 暂停';
  timer = setInterval(() => {
    if (cur >= TRACE.steps.length - 1 && DEBUG_SESSION.finished) { stopAuto(); return; }
    stepNext(true);
    const st = TRACE.steps[cur];
    if (!st || st.error || (cur >= TRACE.steps.length - 1 && DEBUG_SESSION.finished)) {
      stopAuto();
    }
  }, AUTO_PLAY_MS);
};

$('btnRun').onclick = () => {
  stopAuto();
  if (typeof VIEW_MODE !== 'undefined' && VIEW_MODE === 'notebook' && typeof (globalThis as any).runNotebookCell === 'function') {
    (globalThis as any).runNotebookCell(undefined, true);
    return;
  }
  runOnce();
};
$('btnTrace').onclick = () => {
  stopAuto();
  if (document.body && document.body.classList) document.body.classList.remove('editing-code');
  if (typeof VIEW_MODE !== 'undefined' && VIEW_MODE === 'notebook' && typeof (globalThis as any).debugNotebookCell === 'function') {
    (globalThis as any).debugNotebookCell(undefined);
    return;
  }
  startDebug(0);
};

/* ── Top-right Dropdown Menu: Download Single-File HTML + 1920x1080 60fps Video Exporter ── */
export const exportMenuWrap = $('exportMenuWrap');
export const btnExportMenu = $('btnExportMenu');
export const videoSpeedGroup = $('videoSpeedGroup');
export const videoSpeedBadge = $('videoSpeedBadge');
export const btnExportVideo = $('btnExportVideo');
export const btnExportVideoLabel = $('btnExportVideoLabel');
export const videoExportStatus = $('videoExportStatus');

export function setVideoExportSpeed(mult: number | string) {
  const num = Number(mult);
  if (!VIDEO_SPEED_OPTIONS.includes(num)) return VIDEO_EXPORT_SPEED;
  VIDEO_EXPORT_SPEED = num;
  if (videoSpeedGroup && videoSpeedGroup.querySelectorAll) {
    const btns = videoSpeedGroup.querySelectorAll('.speed-opt');
    btns.forEach((b: HTMLElement) => {
      if (b.classList) b.classList.toggle('active', Number(b.dataset.speed) === num);
    });
  }
  if (videoSpeedBadge) {
    videoSpeedBadge.textContent = num + 'x · 60fps';
  }
  return VIDEO_EXPORT_SPEED;
}

if (btnExportMenu && exportMenuWrap) {
  btnExportMenu.onclick = (e: MouseEvent) => {
    e.stopPropagation();
    if (exportMenuWrap.classList) exportMenuWrap.classList.toggle('open');
  };
  addEventListener('click', (e) => {
    if (!exportMenuWrap.classList || !exportMenuWrap.classList.contains('open')) return;
    if (exportMenuWrap.contains && exportMenuWrap.contains(e.target)) return;
    exportMenuWrap.classList.remove('open');
  });
}

if (videoSpeedGroup) {
  videoSpeedGroup.addEventListener('click', (e: any) => {
    const btn = (e.target as any).closest ? (e.target as any).closest('.speed-opt') : null;
    if (!btn || !btn.dataset.speed) return;
    e.stopPropagation();
    setVideoExportSpeed( parseFloat(btn.dataset.speed) );
  });
}

/* ── file identity: the editable chip in the SOURCE header drives import/export names ── */
export function sanitizeFileName(name: string | null | undefined) {
  const cleaned = String(name == null ? '' : name)
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.\s]+$/, '');   // Windows rejects trailing dots/spaces
  return cleaned || (LANG === 'python' ? 'playground.py' : 'playground.ts');
}

/* Name actually written to disk: keep a real extension, otherwise append .ts */
export function exportFileName() {
  const fallback = LANG === 'python' ? 'playground.py' : 'playground.ts';
  const name = FILE_NAME || fallback;
  const ext = LANG === 'python' ? '.py' : '.ts';
  return /\.[A-Za-z0-9]{1,12}$/.test(name) ? name : name + ext;
}

export function setFileName(name: string | null | undefined) {
  FILE_NAME = sanitizeFileName(name);
  if (fileNameEl && fileNameEl.value !== FILE_NAME) fileNameEl.value = FILE_NAME;
  const tag = $('fileExportTag');
  if (tag) tag.textContent = exportFileName();
  if (typeof (globalThis as any).syncActiveScriptTabFromFileName === 'function') {
    try { (globalThis as any).syncActiveScriptTabFromFileName(FILE_NAME); } catch (_) {}
  }
}

export function loadImportedSource(text: string | null | undefined, name?: string) {
  const src = String(text == null ? '' : text).replace(/\r\n?/g, '\n');
  if (name && /\.ipynb$/i.test(name) && typeof (globalThis as any).importNotebookFromJson === 'function') {
    if ((globalThis as any).importNotebookFromJson(src, name)) return;
  }
  if (typeof VIEW_MODE !== 'undefined' && VIEW_MODE === 'notebook' && typeof (globalThis as any).setViewMode === 'function') {
    (globalThis as any).setViewMode('script');
  }
  editor.value = src;
  setFileName(name || (LANG === 'python' ? 'imported.py' : 'imported.ts'));
  if (typeof (globalThis as any).syncActiveScriptTabSource === 'function') {
    try { (globalThis as any).syncActiveScriptTabSource(src); } catch (_) {}
  }
  lastEditorCursorLine = -1;
  resetTraceState();
  updateEditorChrome();
  clearLog('✓ 已导入 ' + FILE_NAME + ' · ' + src.split('\n').length + ' 行 · 点「🐞 Debug 调试」或「▶ 运行」开始');
}

if (btnImportEl && fileInputEl) {
  if (!$('importMenuWrap')) {
    btnImportEl.onclick = () => fileInputEl.click();
  }
  fileInputEl.addEventListener('change', () => {
    const file = fileInputEl.files && fileInputEl.files[0];
    fileInputEl.value = '';                      // allow re-importing the same file
    if (!file) return;
    const read = (typeof file.text === 'function')
      ? file.text()
      : Promise.reject(new Error('当前浏览器不支持读取该文件'));
    Promise.resolve(read)
      .then(text => loadImportedSource(text, file.name))
      .catch(e => say('✗ 导入失败: ' + (e && e.message ? e.message : e), 'err'));
  });
}

if (fileNameEl) {
  const commitName = () => setFileName(fileNameEl.value);
  fileNameEl.addEventListener('change', commitName);
  fileNameEl.addEventListener('blur', commitName);
  fileNameEl.addEventListener('keydown', (e: any) => {
    if (e.key === 'Enter') { e.preventDefault(); commitName(); fileNameEl.blur(); }
    else if (e.key === 'Escape') { fileNameEl.value = FILE_NAME; fileNameEl.blur(); }
  });
}
setFileName(FILE_NAME);

/* ── export the buffer as a real .ts file, named by the editable file chip ── */
if ($('btnExportTs')) {
  $('btnExportTs').onclick = () => {
    try {
      if (exportMenuWrap && exportMenuWrap.classList) exportMenuWrap.classList.remove('open');
      const name = exportFileName();
      const blob = new Blob([editor.value], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      say('✓ 已导出 TypeScript 文件 ' + name + '（' + editor.value.split('\n').length + ' 行）', 'ok');
    } catch (e) {
      say('✗ 导出失败: ' + (e && e.message ? e.message : e), 'err');
    }
  };
}


$('sampleSel').onchange = () => loadSample($('sampleSel').value);

pickEl.addEventListener('click', (e: any) => {
  const el = (e.target as any).closest('.chip-pick');
  if (!el) return;
  const id = el.dataset.id;
  if (watched.has(id)) watched.delete(id); else watched.add(id);
  renderPicker();
});

if (callStackBarEl) {
  callStackBarEl.addEventListener('click', (e: any) => {
    const btn = (e.target as any).closest('.cs-crumb');
    if (!btn || btn.dataset.frameIdx === undefined) return;
    selectStackFrame(parseInt(btn.dataset.frameIdx, 10));
  });
}

/* ── Draggable split pane resizer ── */
(function initResizer() {
  if (!resizerEl || !mainEl || !sidePanelEl) return;
  let dragging = false;

  function applySideWidth(clientX: number) {
    const rect = mainEl.getBoundingClientRect();
    if (!rect.width) return;
    const minCodeW = 340;
    const minSideW = 280;
    const maxSideW = Math.max(minSideW, Math.min(rect.width - minCodeW, Math.round(rect.width * 0.65)));
    const desiredSideW = Math.round(rect.right - clientX);
    const clamped = Math.max(minSideW, Math.min(maxSideW, desiredSideW));
    sidePanelEl.style.width = clamped + 'px';
    sidePanelEl.style.maxWidth = 'none';
    if (slotsEl && slotsEl.classList) {
      slotsEl.classList.toggle('single-col', clamped < 440);
    }
    clearFlyLayer();
  }

  resizerEl.addEventListener('pointerdown', (e: PointerEvent) => {
    dragging = true;
    resizerEl.classList.add('dragging');
    document.body.classList.add('resizing');
    if (resizerEl.setPointerCapture) {
      try { resizerEl.setPointerCapture(e.pointerId); } catch {}
    }
    e.preventDefault();
  });

  addEventListener('pointermove', e => {
    if (!dragging) return;
    applySideWidth(e.clientX);
  });

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    resizerEl.classList.remove('dragging');
    document.body.classList.remove('resizing');
  }

  addEventListener('pointerup', endDrag);
  addEventListener('pointercancel', endDrag);

  resizerEl.addEventListener('dblclick', () => {
    sidePanelEl.style.width = '40%';
    sidePanelEl.style.maxWidth = '65%';
    clearFlyLayer();
  });
})();

export function isEditorFocused() {
  try {
    if (window.PlaygroundCM && window.PlaygroundCM.hasFocus()) return true;
  } catch (_) { /* ignore */ }
  return document.activeElement === editor;
}

export function blurEditor() {
  try {
    if (window.PlaygroundCM && window.PlaygroundCM.hasFocus()) {
      window.PlaygroundCM.blur();
      return;
    }
  } catch (_) { /* ignore */ }
  if (editor.blur) editor.blur();
}

export function recordEditorCursorLine() {
  try {
    const pos = editor.selectionStart || 0;
    lastEditorCursorLine = editor.value.slice(0, pos).split('\n').length;
  } catch {}
}
editor.addEventListener('click', recordEditorCursorLine);
editor.addEventListener('keyup', recordEditorCursorLine);

/* ── editor key handling ── */
editor.addEventListener('focus', () => {
  recordEditorCursorLine();
  if (TRACE.steps.length && document.body && document.body.classList) {
    document.body.classList.add('editing-code');
    clearFlyLayer();
  }
});
editor.addEventListener('blur', () => {
  if (document.body && document.body.classList) {
    document.body.classList.remove('editing-code');
  }
});
editor.addEventListener('keydown', (e: any) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    const s = editor.selectionStart, t = editor.selectionEnd;
    const indent = LANG === 'python' ? '    ' : '  ';
    editor.value = editor.value.slice(0, s) + indent + editor.value.slice(t);
    editor.selectionStart = editor.selectionEnd = s + indent.length;
    onSourceChanged();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    stopAuto();
    if (e.shiftKey) {
      if (document.body && document.body.classList) document.body.classList.remove('editing-code');
      if (isEditorFocused()) blurEditor();
      startDebug(0);
    } else {
      runOnce();
    }
  }
});

export let staleTimer: ReturnType<typeof setTimeout> | null = null;
export function onSourceChanged() {
  recordEditorCursorLine();
  TYPE_ERROR_LINES.clear();
  RUNTIME_ERROR_LINES.clear();
  if (LANG === 'python') PY_DIAGS.length = 0;
  hideHoverTip();
  updateEditorChrome();
  if (TRACE.steps.length || DEBUG_SESSION.active) {
    if (staleTimer) clearTimeout(staleTimer);
    staleTimer = setTimeout(() => {
      resetTraceState();
      clearLog('源码已修改，当前调试会话已重置 · 可点击「🐞 Debug 调试」或左下「运行到下一个检查点」重新开始');
    }, 300);
  }
}
editor.addEventListener('input', onSourceChanged);
editor.addEventListener('scroll', () => { clearFlyLayer(); hideHoverTip(); syncScroll(); });

/* ── hover inspector wiring: editor tokens + LOCALS/WATCH cards ── */
if (editor && editor.addEventListener) {
  editor.addEventListener('mousemove', (e: MouseEvent) => {
    if (!TRACE.steps.length || (e && e.buttons)) { hideHoverTip(); return; }
    const hit = hoverHitFromEvent(e);
    const word = hit ? hoverWordAt(hit.text, hit.col) : null;
    if (!word) { hideHoverTip(); return; }
    hoverTipForName(word.word, e.clientX, e.clientY);
  });
  editor.addEventListener('mouseleave', hideHoverTip);
  editor.addEventListener('mousedown', hideHoverTip);
}
if (sidePanelEl && sidePanelEl.addEventListener) {
  sidePanelEl.addEventListener('mousemove', (e: MouseEvent) => {
    const card = e && e.target && (e.target as any).closest ? (e.target as any).closest('[data-var]') : null;
    if (!card || !card.getAttribute) { hideHoverTip(); return; }
    hoverTipForName(card.getAttribute('data-var'), e.clientX, e.clientY);
  });
  sidePanelEl.addEventListener('mouseleave', hideHoverTip);
}

/* the floating capsule follows its line when the window is resized */
addEventListener('resize', () => positionStepViz());

addEventListener('keydown', e => {
  if (isEditorFocused()) return;
  if (e.key === 'ArrowRight' || e.key === ' ') {
    if ((e.target as any).closest && (e.target as any).closest('button,select,input,textarea')) return;
    e.preventDefault();
    stepNext();
  }
  if (e.key === 'ArrowLeft') {
    if ((e.target as any).closest && (e.target as any).closest('button,select,input,textarea')) return;
    e.preventDefault();
    stepPrev();
  }
});

/* ── built-in checker scope badge + limitations modal ── */
(function initCheckerInfo() {
  const badge = $('checkerBadge');
  const modal = $('checkerModal');
  const close = $('checkerModalClose');
  if (!badge || !modal) return;
  const open = () => { modal.hidden = false; };
  const hide = () => { modal.hidden = true; };
  badge.onclick = open;
  badge.onkeydown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open();
    }
  };
  if (close) close.onclick = hide;
  if (modal.addEventListener) {
    modal.addEventListener('click', (e: MouseEvent) => {
      if (e.target === modal) hide();
    });
  }
  if (document.addEventListener) {
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') hide();
    });
  }
})();


export const stepForward = stepNext;
export const stepBack = stepPrev;
export const renderStep = renderStatic;
export const scheduleRebuild = onSourceChanged;
export function togglePlay(): void {
  const autoBtn = $("auto");
  if (autoBtn && typeof autoBtn.onclick === "function") autoBtn.onclick();
}
export function setStatus(msg: string, cls?: string): void {
  say(msg, cls);
}
