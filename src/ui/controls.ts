/* ================================================================
   Stepper Controls, Checkpoints, File Import/Export & Resizer (src/ui/controls.ts)
   ================================================================ */
import { skipString } from "../compiler/comments";
import { stripTypes, transpileEnums, detectUnsupportedSyntax } from "../compiler/transpile";
import { collectNames, instrument, resolveEntry, blankJsLine, snapFnExpr } from "../compiler/instrumenter";
import { typecheckTS, extractTsInterfaceMetadata } from "../compiler/type-checker";
import { say, clearLog, safeJSONStringify, resetTraceState } from "../runtime/event-loop";
import { computeAndAppendNextStep, startDebug, initWatchedVars, runOnce, reportTypeErrors } from "../runtime/runner";
import { appState, AUTO_PLAY_MS, MAX_STEPS, registerUiHooks, uiHooks, VIDEO_SPEED_OPTIONS } from "../state";
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
import {
  $,
  btnImportEl,
  callStackBarEl,
  closestElement,
  editor,
  eventTargetElement,
  eventTargetNode,
  fileInputEl,
  fileNameEl,
  gutterEl,
  mainEl,
  pickEl,
  resizerEl,
  sidePanelEl,
  slotsEl,
} from "./dom";

export function stepPrev() {
  stopAuto();
  if (!appState.TRACE.steps.length || appState.cur <= 0) return;
  appState.SELECTED_FRAME_IDX = null;
  if (document.body && document.body.classList) document.body.classList.remove('editing-code');
  if (isEditorFocused()) blurEditor();
  appState.cur--;
  renderPicker();
  renderStatic(appState.cur, true);
}

export function stepNext(fromAuto = false) {
  if (!fromAuto) stopAuto();
  appState.SELECTED_FRAME_IDX = null;
  if (document.body && document.body.classList) document.body.classList.remove('editing-code');
  if (isEditorFocused()) blurEditor();
  if (!appState.DEBUG_SESSION.active) {
    startDebug(0);
    return;
  }
  if (appState.cur < appState.TRACE.steps.length - 1) {
    appState.cur++;
    renderPicker();
    renderStatic(appState.cur, true);
    return;
  }
  if (appState.DEBUG_SESSION.finished) return;
  const ok = computeAndAppendNextStep();
  if (ok) {
    appState.cur = appState.TRACE.steps.length - 1;
    renderPicker();
    renderStatic(appState.cur, true);
  } else {
    renderStatic(appState.cur, false);
  }
}

export function runToNextCheckpoint() {
  if (appState.LANG === 'python') return PY_ENGINE.runToNextCheckpoint();
  stopAuto();
  appState.SELECTED_FRAME_IDX = null;
  if (document.body && document.body.classList) document.body.classList.remove('editing-code');
  if (isEditorFocused()) blurEditor();

  if (!appState.DEBUG_SESSION.active) {
    if (!startDebug(0)) return;
    const firstSt = appState.TRACE.steps[0];
    if (firstSt && (firstSt.isCheckpoint || firstSt.error || appState.DEBUG_SESSION.finished)) {
      if (firstSt.isCheckpoint) {
        say('◉ 已到达检查点 [第 ' + firstSt.line + ' 行] · ' + (firstSt.note || ''), 'ok');
      }
      return;
    }
  }

  if (appState.cur >= appState.TRACE.steps.length - 1 && appState.DEBUG_SESSION.finished) {
    return;
  }

  let safety = 0;
  while (safety++ < MAX_STEPS) {
    if (appState.cur < appState.TRACE.steps.length - 1) {
      appState.cur++;
      const st = appState.TRACE.steps[appState.cur];
      if (st && (st.isCheckpoint || st.error || (appState.cur === appState.TRACE.steps.length - 1 && appState.DEBUG_SESSION.finished))) {
        break;
      }
    } else {
      if (appState.DEBUG_SESSION.finished) break;
      const added = computeAndAppendNextStep({ silent: true });
      if (!added) break;
      appState.cur = appState.TRACE.steps.length - 1;
      const st = appState.TRACE.steps[appState.cur];
      if (st && (st.isCheckpoint || st.error || appState.DEBUG_SESSION.finished)) {
        break;
      }
    }
  }

  renderPicker();
  renderStatic(appState.cur, true);

  const finalSt = appState.TRACE.steps[appState.cur];
  if (finalSt && finalSt.error) {
    // Already logged by computeAndAppendNextStep
  } else if (finalSt && finalSt.isCheckpoint) {
    say('◉ 已运行到检查点 [第 ' + finalSt.line + ' 行] · ' + (finalSt.note || ''), 'ok');
  } else if (appState.DEBUG_SESSION.finished) {
    say('✓ 已运行至程序结束（后续无更多检查点）  →  ' + safeJSONStringify(appState.DEBUG_SESSION.returnValue), 'ok');
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
  const diags = typecheckTS(src, appState.STRICT_TS);
  if (diags.length > 0) {
    reportTypeErrors(diags);
    return false;
  }
  if (appState.TYPE_ERROR_LINES.size || appState.RUNTIME_ERROR_LINES.size) {
    appState.TYPE_ERROR_LINES.clear();
    appState.RUNTIME_ERROR_LINES.clear();
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
  appState.ENTRY_CALL_LINE = entry.line || 0;
  const jsBody = entry.index >= 0 ? blankJsLine(js0, entry.index) : js0;

  let compiledFn;
  try {
    const names = collectNames(jsBody);
    const js = instrument(jsBody, originalLines, names);
    const finHook = '\n;try{if(typeof __t==="function"&&__t.__fin)__t.__fin(' + snapFnExpr(names) + ');}catch(_){}\n';
    const body = js + finHook + ';return (' + expr + ');';
    compiledFn = new Function('__t', 'console', body);
  } catch (e) {
    say('✗ 编译失败: ' + (e instanceof Error && e.message ? e.message : e), 'err');
    return false;
  }

  stopAuto();
  clearFlyLayer();
  const prevWatched = new Set(appState.watched);
  appState.TRACE = {
    title: 'TypeScript Playground · Debug',
    code: originalLines,
    steps: [],
  };
  appState.DEBUG_SESSION = {
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
  appState.cur = 0;

  let visitsSeen = 0;
  let safety = 0;
  while (safety++ < MAX_STEPS) {
    const ok = computeAndAppendNextStep({ silent: true });
    if (!ok) break;
    const latest = appState.TRACE.steps[appState.TRACE.steps.length - 1];
    if (newTargetLine >= 1 && targetVisits >= 1) {
      if (latest && latest.line === newTargetLine) {
        visitsSeen++;
        if (visitsSeen >= targetVisits) break;
      }
    } else if (appState.TRACE.steps.length - 1 >= fallbackStepIdx) {
      break;
    }
    if (appState.DEBUG_SESSION.finished) break;
  }

  appState.cur = Math.max(0, appState.TRACE.steps.length - 1);
  if (prevWatched.size > 0) {
    appState.watched = prevWatched;
    discoverVars().forEach((s: { id: string }) => appState.watched.add(s.id));
  } else {
    initWatchedVars();
  }
  renderPicker();
  renderStatic(appState.cur, false);
  return true;
}

export function addCheckpointFunction(preferredLine?: number) {
  if (appState.LANG === 'python') {
    const text = editor.value.replace(/\r\n?/g, '\n');
    const lines = text.split('\n');
    let line = preferredLine || appState.TRACE.steps[appState.cur]?.line || (window.__CM_CURSOR_LINE || appState.lastEditorCursorLine) || lines.length;
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
    appState.lastEditorCursorLine = line;
    resetTraceState();
    PY_ENGINE.start(0);
    say('✓ 已插入 checkpoint()，正在重新录制 Python 执行步骤', 'ok');
    return;
  }
  const text = editor.value.replace(/\r\n?/g, '\n');
  const lines = text.split('\n');

  const curStep = appState.TRACE.steps[appState.cur];
  const wasActive = Boolean(appState.DEBUG_SESSION.active && appState.TRACE.steps.length > 0 && curStep);
  const origCurLine = curStep ? curStep.line : -1;
  const origLineVisits = wasActive
    ? appState.TRACE.steps.slice(0, appState.cur + 1).filter(s => s.line === origCurLine).length
    : 0;
  const prevCurIdx = appState.cur;

  let fnOpenIdx = -1;
  let fnCloseIdx = lines.length - 1;
  let depth = 0;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] || '';
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
  const cursorLine = window.__CM_CURSOR_LINE || appState.lastEditorCursorLine;
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
  appState.lastEditorCursorLine = insertedLineNum;

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
  if (i > appState.cur) stepNext();
  else if (i < appState.cur) stepPrev();
}

export function stopAuto() {
  if (appState.timer) { clearInterval(appState.timer); appState.timer = null; $('auto').textContent = '▶ 自动'; }
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
  gutterEl.addEventListener('click', (e: MouseEvent) => {
    const g = closestElement(e, '.gline');
    if (!g || !g.dataset.line) return;
    addCheckpointFunction(parseInt(g.dataset.line, 10));
  });
}

$('auto').onclick = async () => {
  if (appState.timer) { stopAuto(); return; }
  if (!appState.DEBUG_SESSION.active || (appState.cur >= appState.TRACE.steps.length - 1 && appState.DEBUG_SESSION.finished)) {
    const ok = await Promise.resolve(startDebug(0));
    if (!ok) return;
  }
  if (appState.cur >= appState.TRACE.steps.length - 1 && appState.DEBUG_SESSION.finished) return;
  $('auto').textContent = '⏸ 暂停';
  appState.timer = setInterval(() => {
    if (appState.cur >= appState.TRACE.steps.length - 1 && appState.DEBUG_SESSION.finished) { stopAuto(); return; }
    stepNext(true);
    const st = appState.TRACE.steps[appState.cur];
    if (!st || st.error || (appState.cur >= appState.TRACE.steps.length - 1 && appState.DEBUG_SESSION.finished)) {
      stopAuto();
    }
  }, AUTO_PLAY_MS);
};

$('btnRun').onclick = () => {
  stopAuto();
  if (appState.VIEW_MODE === 'notebook' && typeof globalThis.runNotebookCell === 'function') {
    globalThis.runNotebookCell(undefined, true);
    return;
  }
  runOnce();
};
$('btnTrace').onclick = () => {
  stopAuto();
  if (document.body && document.body.classList) document.body.classList.remove('editing-code');
  if (appState.VIEW_MODE === 'notebook' && typeof globalThis.debugNotebookCell === 'function') {
    globalThis.debugNotebookCell(undefined);
    return;
  }
  startDebug(0);
};

/* ── Top-right Dropdown Menu: Download Single-File HTML + 1920x1080 60fps Video Exporter ── */
export const exportMenuWrap = $('exportMenuWrap');
export const btnExportMenu = $('btnExportMenu');
export const videoSpeedGroup = $('videoSpeedGroup');
export const videoSpeedBadge = $('videoSpeedBadge');
export const btnExportVideo = $<HTMLButtonElement>('btnExportVideo');
export const btnExportVideoLabel = $('btnExportVideoLabel');
export const videoExportStatus = $('videoExportStatus');

export function setVideoExportSpeed(mult: number | string) {
  const num = Number(mult);
  if (!VIDEO_SPEED_OPTIONS.includes(num)) return appState.VIDEO_EXPORT_SPEED;
  appState.VIDEO_EXPORT_SPEED = num;
  if (videoSpeedGroup && videoSpeedGroup.querySelectorAll) {
    const btns = videoSpeedGroup.querySelectorAll<HTMLElement>('.speed-opt');
    btns.forEach((b: HTMLElement) => {
      if (b.classList) b.classList.toggle('active', Number(b.dataset.speed) === num);
    });
  }
  if (videoSpeedBadge) {
    videoSpeedBadge.textContent = num + 'x · 60fps';
  }
  return appState.VIDEO_EXPORT_SPEED;
}

if (btnExportMenu && exportMenuWrap) {
  btnExportMenu.onclick = (e: MouseEvent) => {
    e.stopPropagation();
    if (exportMenuWrap.classList) exportMenuWrap.classList.toggle('open');
  };
  addEventListener('click', (e) => {
    if (!exportMenuWrap.classList || !exportMenuWrap.classList.contains('open')) return;
    if (exportMenuWrap.contains && exportMenuWrap.contains(eventTargetNode(e))) return;
    exportMenuWrap.classList.remove('open');
  });
}

if (videoSpeedGroup) {
  videoSpeedGroup.addEventListener('click', (e: MouseEvent) => {
    const btn = closestElement(e, '.speed-opt');
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
  return cleaned || (appState.LANG === 'python' ? 'playground.py' : 'playground.ts');
}

/* Name actually written to disk: keep a real extension, otherwise append .ts */
export function exportFileName() {
  const fallback = appState.LANG === 'python' ? 'playground.py' : 'playground.ts';
  const name = appState.FILE_NAME || fallback;
  const ext = appState.LANG === 'python' ? '.py' : '.ts';
  return /\.[A-Za-z0-9]{1,12}$/.test(name) ? name : name + ext;
}

export function setFileName(name: string | null | undefined) {
  appState.FILE_NAME = sanitizeFileName(name);
  if (fileNameEl && fileNameEl.value !== appState.FILE_NAME) fileNameEl.value = appState.FILE_NAME;
  const tag = $('fileExportTag');
  if (tag) tag.textContent = exportFileName();
  if (typeof globalThis.syncActiveScriptTabFromFileName === 'function') {
    try { globalThis.syncActiveScriptTabFromFileName(appState.FILE_NAME); } catch (_) {}
  }
}

export function loadImportedSource(text: string | null | undefined, name?: string) {
  const src = String(text == null ? '' : text).replace(/\r\n?/g, '\n');
  if (name && /\.ipynb$/i.test(name) && typeof globalThis.importNotebookFromJson === 'function') {
    if (globalThis.importNotebookFromJson(src, name)) return;
  }
  if (appState.VIEW_MODE === 'notebook' && typeof globalThis.setViewMode === 'function') {
    globalThis.setViewMode('script');
  }
  editor.value = src;
  setFileName(name || (appState.LANG === 'python' ? 'imported.py' : 'imported.ts'));
  if (typeof globalThis.syncActiveScriptTabSource === 'function') {
    try { globalThis.syncActiveScriptTabSource(src); } catch (_) {}
  }
  appState.lastEditorCursorLine = -1;
  resetTraceState();
  updateEditorChrome();
  clearLog('✓ 已导入 ' + appState.FILE_NAME + ' · ' + src.split('\n').length + ' 行 · 点「🐞 Debug 调试」或「▶ 运行」开始');
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
  fileNameEl.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); commitName(); fileNameEl.blur(); }
    else if (e.key === 'Escape') { fileNameEl.value = appState.FILE_NAME; fileNameEl.blur(); }
  });
}
setFileName(appState.FILE_NAME);

/* ── export the buffer as a real file, named by the editable file chip ── */
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
      say('✓ 已导出文件 ' + name + '（' + editor.value.split('\n').length + ' 行）', 'ok');
    } catch (e) {
      say('✗ 导出失败: ' + (e instanceof Error && e.message ? e.message : e), 'err');
    }
  };
}

if ($('btnShareLink')) {
  $('btnShareLink').onclick = () => {
    if (exportMenuWrap && exportMenuWrap.classList) exportMenuWrap.classList.remove('open');
    const tag = $('shareLinkTag');
    if (tag) tag.textContent = '暂未实现';
    say('暂未实现', 'dim');
  };
}


$<HTMLSelectElement>('sampleSel').onchange = () => uiHooks.loadSample($<HTMLSelectElement>('sampleSel').value);

pickEl.addEventListener('click', (e: MouseEvent) => {
  const el = closestElement(e, '.chip-pick');
  if (!el || !el.dataset.id) return;
  const id = el.dataset.id;
  if (appState.watched.has(id)) appState.watched.delete(id); else appState.watched.add(id);
  renderPicker();
});

if (callStackBarEl) {
  callStackBarEl.addEventListener('click', (e: MouseEvent) => {
    const btn = closestElement(e, '.cs-crumb');
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
    appState.lastEditorCursorLine = editor.value.slice(0, pos).split('\n').length;
  } catch {}
}
editor.addEventListener('click', recordEditorCursorLine);
editor.addEventListener('keyup', recordEditorCursorLine);

/* ── editor key handling ── */
editor.addEventListener('focus', () => {
  recordEditorCursorLine();
  if (appState.TRACE.steps.length && document.body && document.body.classList) {
    document.body.classList.add('editing-code');
    clearFlyLayer();
  }
});
editor.addEventListener('blur', () => {
  if (document.body && document.body.classList) {
    document.body.classList.remove('editing-code');
  }
});
editor.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    const s = editor.selectionStart, t = editor.selectionEnd;
    const indent = appState.LANG === 'python' ? '    ' : '  ';
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
  appState.TYPE_ERROR_LINES.clear();
  appState.RUNTIME_ERROR_LINES.clear();
  if (appState.LANG === 'python') appState.PY_DIAGS.length = 0;
  hideHoverTip();
  updateEditorChrome();
  if (appState.TRACE.steps.length || appState.DEBUG_SESSION.active) {
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
    if (!appState.TRACE.steps.length || (e && e.buttons)) { hideHoverTip(); return; }
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
    const card = closestElement(e, '[data-var]');
    if (!card || !card.getAttribute) { hideHoverTip(); return; }
    hoverTipForName(card.getAttribute('data-var'), e.clientX, e.clientY);
  });
  sidePanelEl.addEventListener('mouseleave', hideHoverTip);
}

/* the floating capsule follows its line when the window is resized */
addEventListener('resize', () => positionStepViz());

addEventListener('keydown', e => {
  if (isEditorFocused()) return;
  const target = eventTargetElement(e);
  if (e.key === 'ArrowRight' || e.key === ' ') {
    if (target && target.closest && target.closest('button,select,input,textarea')) return;
    e.preventDefault();
    stepNext();
  }
  if (e.key === 'ArrowLeft') {
    if (target && target.closest && target.closest('button,select,input,textarea')) return;
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
  const autoBtn = $<HTMLButtonElement>("auto");
  if (autoBtn && typeof autoBtn.onclick === "function") Reflect.apply(autoBtn.onclick, autoBtn, []);
}
export function setStatus(msg: string, cls?: string): void {
  say(msg, cls);
}

registerUiHooks({ stopAuto });

