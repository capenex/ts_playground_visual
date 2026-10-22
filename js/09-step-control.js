/* ================================================================
   TypeScript Playground — step control · checkpoints · layout
   Part 9/10 · loaded in order from index.html (classic script;
   shares the global lexical scope with the other parts).
   ================================================================ */

/* ================================================================
   7) Step control + Checkpoint tools + Export + Resizer + Boot
   ================================================================ */
function stepPrev() {
  stopAuto();
  if (!TRACE.steps.length || cur <= 0) return;
  SELECTED_FRAME_IDX = null;
  if (document.body && document.body.classList) document.body.classList.remove('editing-code');
  if (isEditorFocused()) blurEditor();
  cur--;
  renderPicker();
  renderStatic(cur, true);
}

function stepNext(fromAuto = false) {
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

function runToNextCheckpoint() {
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

function rebuildDebugAtPosition(newTargetLine, targetVisits, fallbackStepIdx) {
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
    discoverVars().forEach(s => watched.add(s.id));
  } else {
    initWatchedVars();
  }
  renderPicker();
  renderStatic(cur, false);
  return true;
}

function addCheckpointFunction(preferredLine) {
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

function go(i) {
  if (i > cur) stepNext();
  else if (i < cur) stepPrev();
}

function stopAuto() {
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
  gutterEl.addEventListener('click', e => {
    const g = e.target.closest('.gline');
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

$('btnRun').onclick = () => { stopAuto(); runOnce(); };
$('btnTrace').onclick = () => {
  stopAuto();
  if (document.body && document.body.classList) document.body.classList.remove('editing-code');
  startDebug(0);
};

/* ── Top-right Dropdown Menu: Download Single-File HTML + 1920x1080 60fps Video Exporter ── */
const exportMenuWrap = $('exportMenuWrap');
const btnExportMenu = $('btnExportMenu');
const videoSpeedGroup = $('videoSpeedGroup');
const videoSpeedBadge = $('videoSpeedBadge');
const btnExportVideo = $('btnExportVideo');
const btnExportVideoLabel = $('btnExportVideoLabel');
const videoExportStatus = $('videoExportStatus');

function setVideoExportSpeed(mult) {
  const num = Number(mult);
  if (!VIDEO_SPEED_OPTIONS.includes(num)) return VIDEO_EXPORT_SPEED;
  VIDEO_EXPORT_SPEED = num;
  if (videoSpeedGroup && videoSpeedGroup.querySelectorAll) {
    const btns = videoSpeedGroup.querySelectorAll('.speed-opt');
    btns.forEach(b => {
      if (b.classList) b.classList.toggle('active', Number(b.dataset.speed) === num);
    });
  }
  if (videoSpeedBadge) {
    videoSpeedBadge.textContent = num + 'x · 60fps';
  }
  return VIDEO_EXPORT_SPEED;
}

if (btnExportMenu && exportMenuWrap) {
  btnExportMenu.onclick = (e) => {
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
  videoSpeedGroup.addEventListener('click', (e) => {
    const btn = e.target.closest ? e.target.closest('.speed-opt') : null;
    if (!btn || !btn.dataset.speed) return;
    e.stopPropagation();
    setVideoExportSpeed( parseFloat(btn.dataset.speed) );
  });
}

/* ── file identity: the editable chip in the SOURCE header drives import/export names ── */
function sanitizeFileName(name) {
  const cleaned = String(name == null ? '' : name)
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.\s]+$/, '');   // Windows rejects trailing dots/spaces
  return cleaned || (LANG === 'python' ? 'playground.py' : 'playground.ts');
}

/* Name actually written to disk: keep a real extension, otherwise append .ts */
function exportFileName() {
  const fallback = LANG === 'python' ? 'playground.py' : 'playground.ts';
  const name = FILE_NAME || fallback;
  const ext = LANG === 'python' ? '.py' : '.ts';
  return /\.[A-Za-z0-9]{1,12}$/.test(name) ? name : name + ext;
}

function setFileName(name) {
  FILE_NAME = sanitizeFileName(name);
  if (fileNameEl && fileNameEl.value !== FILE_NAME) fileNameEl.value = FILE_NAME;
  const tag = $('fileExportTag');
  if (tag) tag.textContent = exportFileName();
}

function loadImportedSource(text, name) {
  const src = String(text == null ? '' : text).replace(/\r\n?/g, '\n');
  editor.value = src;
  setFileName(name || (LANG === 'python' ? 'imported.py' : 'imported.ts'));
  lastEditorCursorLine = -1;
  resetTraceState();
  updateEditorChrome();
  clearLog('✓ 已导入 ' + FILE_NAME + ' · ' + src.split('\n').length + ' 行 · 点「🐞 Debug 调试」或「▶ 运行」开始');
}

if (btnImportEl && fileInputEl) {
  btnImportEl.onclick = () => fileInputEl.click();
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
  fileNameEl.addEventListener('keydown', e => {
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

/* ── 1920×1080 60fps Canvas Video Renderer & MediaRecorder Exporter ── */
function roundRectPath(ctx, x, y, w, h, r) {
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

function tokenizeCodeForCanvas(line) {
  const re = /(\/\/.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b(function|const|let|var|new|class|extends|typeof|instanceof|import|export|from|async|await|interface|type|as|satisfies)\b|\b(for|if|else|return|while|do|switch|case|break|continue|try|catch|finally|throw|yield)\b|\b(number|string|boolean|void|any|unknown|never|Math|Map|Set|Array|Object|JSON|Number|String|Boolean|Promise|Record|Error)\b|\b(true|false|null|undefined|\d+(?:\.\d+)?)\b|(\b[A-Za-z_$][\w$]*)(?=\s*\()|(?<=\.)([A-Za-z_$][\w$]*)\b|(\b[A-Za-z_$][\w$]*)\b|(===|!==|>=|<=|=>|&&|\|\||\+\+|--)/g;
  const tokens = [];
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

function drawVizCardOnCanvas(ctx, x, y, w, h, s, d, kind) {
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
    shown.forEach((val, idx) => {
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
    entries.slice(0, 8).forEach(e => {
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
    const coords = new Map();
    function layout(idx, depth, xMin, xMax) {
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
          ctx.beginPath();
          ctx.moveTo(info.x, info.y);
          ctx.lineTo(c.x, c.y);
          ctx.stroke();
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
    const byId = new Map();
    const scaleX = bw / 180;
    const scaleY = Math.min(1.15, bh / 136);
    d.nodes.forEach((n, idx) => {
      byId.set(n.id ?? idx, {
        id: n.id ?? idx,
        label: n.label ?? (n.id ?? idx),
        x: bx + n.x * scaleX,
        y: by + n.y * scaleY,
      });
    });
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    (d.edges || []).forEach(e => {
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
    const fields = d.fields || (d.entries ? d.entries.map(e => ({ k: e.k, v: e.v, declaredType: typeof e.v })) : []);
    const rowH = 22;
    fields.slice(0, 5).forEach((f, idx) => {
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
    chars.forEach((ch, idx) => {
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

function renderVideoFrameToCanvas(ctx, stepIdx, subProgress, speedMult) {
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
  const vars = discoverVars().filter(s => watched.has(s.id) && ds[s.id] !== undefined);
  const allocated = allocateSlotSpans(vars, ds);
  const gridLeft = sideX + 20;
  const gridW = sideW - 40;
  const colGap = 12;
  const colW = Math.floor((gridW - colGap) / 2);
  let curRowY = watchHeaderY + 14;
  let pendingSingle = null;

  const consoleTop = mainBottom - 84;

  function drawRowItems(items) {
    if (!items.length || curRowY + 95 > consoleTop) return;
    const isTall = items.some(it => it.kind === 'tree' || it.kind === 'graph' || it.kind === 'grid' || it.kind === 'stack' || it.kind === 'interface');
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

  allocated.forEach(item => {
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
