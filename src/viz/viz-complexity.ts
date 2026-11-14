/* ================================================================
   Time/Space Complexity Bar & Hot-Line Popover Renderer (src/viz/viz-complexity.ts)
   ================================================================ */
import { analyzeTimeComplexity, estimateInputSizeFromCall } from "../compiler/instrumenter";
import { appState, esc, uiHooks } from "../state";
import { ComplexityReport, StepSnapshot } from "../types";
import { complexityPopEl, consoleEl } from "../ui/dom";

function ensureComplexityReport(st?: StepSnapshot | null): ComplexityReport | null {
  if (appState.COMPLEXITY_REPORT) return appState.COMPLEXITY_REPORT;
  if (appState.TRACE && appState.TRACE.complexity) {
    appState.COMPLEXITY_REPORT = appState.TRACE.complexity;
    return appState.COMPLEXITY_REPORT;
  }
  const src = uiHooks.getEditorSource();
  if (!src || !src.trim()) return null;
  const callExpr = appState.DEBUG_SESSION.callExpr || 'undefined';
  const base = analyzeTimeComplexity(src, callExpr);
  const inputSizeN = estimateInputSizeFromCall(src, callExpr);
  const stepsCount = appState.TRACE && appState.TRACE.steps ? appState.TRACE.steps.length : 0;
  const maxDepth = appState.DEBUG_SESSION.maxStackDepth || (st && Array.isArray(st.callStack) ? st.callStack.length : 1);
  appState.COMPLEXITY_REPORT = {
    ...base,
    runtime: {
      inputSizeN,
      totalSteps: stepsCount,
      maxCallStackDepth: maxDepth,
      hotLines: [],
    },
  };
  return appState.COMPLEXITY_REPORT;
}

export function renderComplexityBar(st?: StepSnapshot | null): void {
  if (!consoleEl) return;
  const activeStep = st !== undefined ? st : (appState.TRACE.steps[appState.cur] || null);
  const report = ensureComplexityReport(activeStep);

  if (!report) {
    consoleEl.innerHTML =
      '<div class="cbar-row"><span class="p">›</span><span class="dim">⏱ 复杂度就绪</span></div>';
    if (complexityPopEl) complexityPopEl.hidden = true;
    return;
  }

  const rt = report.runtime;
  const stepsShown = activeStep ? (appState.cur + 1) : (rt ? rt.totalSteps : 0);
  const totalKnown = (appState.TRACE && appState.TRACE.steps.length) || (rt ? rt.totalSteps : 0);
  const stepStr = activeStep
    ? `步 ${stepsShown}/${totalKnown}${appState.DEBUG_SESSION.finished ? '' : '+'}`
    : (rt && rt.totalSteps > 0 ? `共 ${rt.totalSteps} 步` : '静态');
  const nStr = rt && rt.inputSizeN !== null && rt.inputSizeN > 0 ? `N=${rt.inputSizeN} · ` : '';
  const depthNum = activeStep && Array.isArray(activeStep.callStack) && activeStep.callStack.length > 0
    ? activeStep.callStack.length
    : (rt ? rt.maxCallStackDepth : 1);
  const hotTop = rt && rt.hotLines && rt.hotLines[0] ? rt.hotLines[0] : null;
  const hotStr = hotTop ? `🔥 L${hotTop.line}×${hotTop.hits}` : '';
  const statusAddon = activeStep && activeStep.error
    ? `<span class="cbar-err">✗ L${activeStep.line}</span>`
    : (activeStep && activeStep.isCheckpoint
      ? `<span class="cbar-ckpt">◉ L${activeStep.line}</span>`
      : '');

  consoleEl.innerHTML =
    '<div class="cbar-row" data-toggle-complexity="1">' +
      '<span class="p">›</span>' +
      '<span class="cbar-pill time" title="时间复杂度">⏱ <b>' + esc(report.overallTime) + '</b></span>' +
      '<span class="cbar-pill space" title="空间复杂度">📦 <b>' + esc(report.overallSpace) + '</b></span>' +
      '<span class="cbar-stat">' + esc(nStr + stepStr) + ' · 栈深 ' + depthNum + '</span>' +
      (hotStr ? '<span class="cbar-hot" title="热点行">' + esc(hotStr) + '</span>' : '') +
      statusAddon +
      '<span class="cbar-more" title="复杂度详情">详情 ▾</span>' +
    '</div>';

  if (complexityPopEl) {
    const fnRows = report.functions.length
      ? report.functions.map(fn =>
          '<div class="cpop-fn-row">' +
            '<span class="cpop-fn-name">' + esc(fn.fnName) + '<span class="cpop-fn-line">:L' + fn.line + '</span></span>' +
            '<span class="cpop-fn-badges">' +
              '<span class="cbar-pill time">T: ' + esc(fn.timeComplexity) + '</span>' +
              '<span class="cbar-pill space">S: ' + esc(fn.spaceComplexity) + '</span>' +
            '</span>' +
            '<div class="cpop-fn-reason">' + esc(fn.rationale) + '</div>' +
          '</div>'
        ).join('')
      : '<div class="cpop-empty">无命名函数</div>';

    const hotRows = rt && rt.hotLines && rt.hotLines.length
      ? rt.hotLines.map(h =>
          '<div class="cpop-hot-row" data-jump-line="' + h.line + '" title="跳转至第 ' + h.line + ' 行">' +
            '<span class="cpop-hot-line">L' + h.line + '</span>' +
            '<span class="cpop-hot-hits">' + h.hits + '次</span>' +
            '<code class="cpop-hot-code">' + esc(h.code || h.snippet || '') + '</code>' +
          '</div>'
        ).join('')
      : '<div class="cpop-empty">暂无热点行</div>';

    complexityPopEl.innerHTML =
      '<div class="cpop-head">' +
        '<span>⏱ 复杂度与热点行</span>' +
        '<button type="button" class="cpop-close" data-close-complexity="1">✕</button>' +
      '</div>' +
      '<div class="cpop-summary">' +
        '<div class="cpop-main-badges">' +
          '<span class="cbar-pill time lg">时间: <b>' + esc(report.overallTime) + '</b></span>' +
          '<span class="cbar-pill space lg">空间: <b>' + esc(report.overallSpace) + '</b></span>' +
          (rt && rt.inputSizeN !== null && rt.inputSizeN > 0 ? '<span class="cbar-pill neutral">N = ' + rt.inputSizeN + '</span>' : '') +
        '</div>' +
        '<div class="cpop-rationale">' + esc(report.rationale) + '</div>' +
      '</div>' +
      '<div class="cpop-section-title">函数复杂度</div>' +
      '<div class="cpop-fn-list">' + fnRows + '</div>' +
      '<div class="cpop-section-title">🔥 热点行 (Top 3)</div>' +
      '<div class="cpop-hot-list">' + hotRows + '</div>';
  }
}

export function toggleComplexityPopover(force?: boolean): void {
  if (!complexityPopEl) return;
  const nextHidden = typeof force === 'boolean' ? !force : !complexityPopEl.hidden;
  complexityPopEl.hidden = nextHidden;
  if (!nextHidden) {
    renderComplexityBar();
  }
}
