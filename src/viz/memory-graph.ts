/* ================================================================
   Memory & Frame Visualization Orchestrator (src/viz/memory-graph.ts)
   ================================================================ */
import { formatFunctionTypeSignature } from "../compiler/tc-types";
import { appState, esc, registerUiHooks, uiHooks } from "../state";
import { StepAnim } from "../types";
import { cntEl, pickEl, slotsEl, varsEl } from "../ui/dom";
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
import {
  vizArray,
  vizGrid,
  vizHeap,
  vizMap,
  vizQueue,
  vizSet,
  vizStack,
  vizString,
  vizUF,
} from "./viz-collections";
import {
  vizList,
  vizTree,
  vizGraph,
  vizInterface,
  vizTypeAlias,
  bindTopologyInteractions,
} from "./viz-topology";
import {
  formatFnTypeHtml,
  renderCallStack,
  updateControlButtons,
  vizEventLoop,
  vizWatchScalar,
} from "./viz-runtime-panels";
import { renderComplexityBar } from "./viz-complexity";

export * from "./memory-normalizers";
export * from "./viz-collections";
export * from "./viz-topology";
export * from "./viz-runtime-panels";
export * from "./viz-complexity";

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
  if (pickEl) {
    if (!vars.length) {
      pickEl.innerHTML = '<span class="vempty">无结构变量 · 可在上方输入表达式添加自定义监听</span>';
    } else {
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
    }
  }
  renderSlots();
}

export function renderSlots() {
  const stepAtCur = appState.TRACE.steps[appState.cur];
  const prevStep = appState.cur > 0 ? appState.TRACE.steps[appState.cur - 1] : null;
  const st = stepAtCur || null;
  const activeFrame = stepAtCur ? getActiveFrame(stepAtCur) : null;
  const prevFrame = prevStep ? getActiveFrame(prevStep) : null;
  const ds: Record<string, StepAnim> = Object.assign({}, (activeFrame && activeFrame.ds) || (st && st.ds) || {});
  if (st && st.ds && st.ds.eventLoop && !ds.eventLoop) ds.eventLoop = st.ds.eventLoop;

  const curV = (activeFrame && activeFrame.v) || (st && st.v) || {};
  const prevV = (prevFrame && prevFrame.v) || (prevStep && prevStep.v) || null;
  const rawNote = (st && (st.rawNote || st.note)) || '';

  for (const expr of appState.CUSTOM_WATCHES) {
    const wid = watchIdForExpr(expr);
    if (appState.watched.has(wid)) {
      ds[wid] = evaluateCustomWatch(expr, curV, prevV, rawNote);
    }
  }

  const vars = discoverVars().filter((s: DiscoveredVar) => appState.watched.has(s.id) && ds[s.id] !== undefined);
  if (!slotsEl) return;
  if (slotsEl.classList && slotsEl.classList.toggle) {
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
  bindTopologyInteractions(slotsEl);
}

export function renderStatic(i: number, withAnim = false) {
  hideHoverTip();
  const st = appState.TRACE.steps[i];
  const prevSt = i > 0 ? appState.TRACE.steps[i - 1] : null;
  if (!st) {
    renderCallStack(null);
    if (varsEl) varsEl.innerHTML = '';
    renderComplexityBar(null);
    if (cntEl) {
      cntEl.textContent = '未在调试';
      cntEl.className = '';
    }
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
  if (varsEl) {
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
  }

  renderComplexityBar(st);

  if (cntEl) {
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
