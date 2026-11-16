/* ================================================================
   Component Design & Props Debug Studio (src/ui/component-studio.ts)
   Layer 7 UI module — isolated sandbox iframe + auto Props controls + CSS hot reload.
   ================================================================ */
import { transpileTSXForSandbox } from '../compiler/jsx-transpile';
import { normalizeWorkspaceModulePath, resolveModuleImportPath } from '../compiler/module-graph';
import {
  applyPropDefaultToSource,
  ComponentPropsSchema,
  extractPropsSchema,
  PropFieldSchema,
  PropPrimitiveValue,
} from '../compiler/props-schema';
import {
  getActiveScriptTab,
  SCRIPT_TABS,
  setScriptTabSyncing,
  syncActiveScriptTabSource,
  upsertVfsScriptTab,
} from '../runtime/script-tabs-store';
import { ensureVfsInitialized, persistVfsToClientStorage, VFS_NODES } from '../runtime/vfs-store';
import { getReactSampleById, REACT_SAMPLES } from '../samples/react-samples';
import { appState, esc, registerUiHooks, uiHooks } from '../state';
import { updateEditorChrome } from '../viz/highlight';
import { setFileName } from './controls';
import {
  $,
  closestElement,
  fileNameEl,
  getEditorSource,
  setEditorSource,
  studioPanelEl,
} from './dom';
import { renderScriptTabsUI } from './script-tabs';
import { renderVfsTreeUI } from './vfs';

type ViewportKind = 'desktop' | 'tablet' | 'mobile';
type StageBgKind = 'light' | 'dark' | 'dots';

interface StudioEventEntry {
  time: string;
  name: string;
  argsText: string;
}

interface StudioState {
  initialized: boolean;
  hasLoadedDefaultSample: boolean;
  activeSampleId: string;
  componentFilePath: string;
  cssFilePaths: string[];
  viewport: ViewportKind;
  bg: StageBgKind;
  schema: ComponentPropsSchema;
  lastComponentName: string | null;
  lastCodeDefaults: Map<string, PropPrimitiveValue | undefined>;
  propValues: Map<string, PropPrimitiveValue>;
  callbackCounts: Map<string, number>;
  events: StudioEventEntry[];
  debounceTimer: ReturnType<typeof setTimeout> | null;
  suppressSourceCompile: boolean;
  lastCompiledJs: string;
  lastRenderedCss: string;
}

const studioState: StudioState = {
  initialized: false,
  hasLoadedDefaultSample: false,
  activeSampleId: REACT_SAMPLES[0]?.id ?? 'button',
  componentFilePath: REACT_SAMPLES[0]?.fileName ?? 'Button.tsx',
  cssFilePaths: REACT_SAMPLES[0]?.cssFileName ? [REACT_SAMPLES[0].cssFileName] : [],
  viewport: 'desktop',
  bg: 'light',
  schema: { componentName: null, propsTypeName: null, fields: [] },
  lastComponentName: null,
  lastCodeDefaults: new Map<string, PropPrimitiveValue | undefined>(),
  propValues: new Map<string, PropPrimitiveValue>(),
  callbackCounts: new Map<string, number>(),
  events: [],
  debounceTimer: null,
  suppressSourceCompile: false,
  lastCompiledJs: '',
  lastRenderedCss: '',
};

function escapeHtml(text: string): string {
  return esc(text);
}

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null;
}

function getRuntimeBundleUrl(): string {
  if (typeof window !== 'undefined' && window.location && typeof URL !== 'undefined') {
    try {
      return new URL('editor/react-runtime.bundle.js', window.location.href).href;
    } catch {
      return 'editor/react-runtime.bundle.js';
    }
  }
  return 'editor/react-runtime.bundle.js';
}

function escapeScriptClose(text: string): string {
  return text.replace(/<\/script/gi, '<\\/script');
}

function escapeStyleClose(text: string): string {
  return text.replace(/<\/style/gi, '<\\/style');
}

function defaultValForField(field: PropFieldSchema): PropPrimitiveValue | undefined {
  if (field.hasDefault && field.defaultValue !== undefined) {
    return field.defaultValue;
  }
  if (field.kind === 'boolean') return false;
  if (field.kind === 'number') return 0;
  if (field.kind === 'string') return '';
  if (field.kind === 'enum') return field.options && field.options[0] ? field.options[0] : '';
  return undefined;
}

export function syncPropValuesWithSchema(
  schema: ComponentPropsSchema,
  resetToDefaults: boolean
): void {
  const componentChanged =
    studioState.lastComponentName !== null &&
    schema.componentName !== studioState.lastComponentName;
  const nextMap = new Map<string, PropPrimitiveValue>();
  const nextCodeDefaults = new Map<string, PropPrimitiveValue | undefined>();

  for (const field of schema.fields) {
    if (field.kind === 'callback' || field.kind === 'unknown') continue;
    const codeDef = field.hasDefault ? field.defaultValue : undefined;
    nextCodeDefaults.set(field.name, codeDef);

    const hadPrevCodeDef = studioState.lastCodeDefaults.has(field.name);
    const prevCodeDef = studioState.lastCodeDefaults.get(field.name);
    const codeDefaultChanged = !componentChanged && hadPrevCodeDef && codeDef !== prevCodeDef;
    const prevVal = studioState.propValues.get(field.name);

    if (!resetToDefaults && !componentChanged && !codeDefaultChanged && prevVal !== undefined) {
      if (field.kind === 'boolean' && typeof prevVal === 'boolean') {
        nextMap.set(field.name, prevVal);
        continue;
      }
      if (field.kind === 'number' && typeof prevVal === 'number') {
        nextMap.set(field.name, prevVal);
        continue;
      }
      if (field.kind === 'string' && typeof prevVal === 'string') {
        nextMap.set(field.name, prevVal);
        continue;
      }
      if (
        field.kind === 'enum' &&
        typeof prevVal === 'string' &&
        field.options &&
        field.options.includes(prevVal)
      ) {
        nextMap.set(field.name, prevVal);
        continue;
      }
    }

    const def = defaultValForField(field);
    if (def !== undefined) {
      nextMap.set(field.name, def);
    }
  }

  studioState.lastComponentName = schema.componentName;
  studioState.lastCodeDefaults = nextCodeDefaults;
  studioState.propValues = nextMap;
}

function getSerializablePropsObject(): Record<string, PropPrimitiveValue> {
  const obj: Record<string, PropPrimitiveValue> = {};
  for (const [k, v] of studioState.propValues.entries()) {
    obj[k] = v;
  }
  return obj;
}

function getCallbackPropNames(): string[] {
  return studioState.schema.fields
    .filter((f) => f.kind === 'callback')
    .map((f) => f.name);
}

function collectStudioCss(
  cssImports: string[],
  componentPath: string,
  fileMap: Map<string, string>
): { cssText: string; resolvedCssPaths: string[] } {
  const resolvedPaths: string[] = [];
  const seen = new Set<string>();

  for (const spec of cssImports) {
    const resolved =
      resolveModuleImportPath(componentPath, spec, fileMap) ||
      resolveModuleImportPath(componentPath, spec);
    if (resolved && !seen.has(resolved)) {
      seen.add(resolved);
      resolvedPaths.push(resolved);
    }
  }

  if (resolvedPaths.length === 0 && studioState.cssFilePaths.length > 0) {
    for (const p of studioState.cssFilePaths) {
      const norm = normalizeWorkspaceModulePath(p);
      if (norm && !seen.has(norm)) {
        seen.add(norm);
        resolvedPaths.push(norm);
      }
    }
  }

  const activeNorm = normalizeWorkspaceModulePath(appState.FILE_NAME || '');
  if (activeNorm.endsWith('.css')) {
    fileMap.set(activeNorm, getEditorSource().replace(/\r\n?/g, '\n'));
  }

  const chunks: string[] = [];
  for (const cssPath of resolvedPaths) {
    const fromWorkspace = fileMap.get(cssPath);
    if (typeof fromWorkspace === 'string') {
      chunks.push(fromWorkspace);
      continue;
    }
    const sampleMatch = REACT_SAMPLES.find(
      (s) => normalizeWorkspaceModulePath(s.cssFileName) === cssPath
    );
    if (sampleMatch) {
      chunks.push(sampleMatch.cssCode);
    }
  }

  return {
    cssText: chunks.join('\n\n'),
    resolvedCssPaths: resolvedPaths,
  };
}

function buildSandboxSrcdoc(
  compiledJs: string,
  componentName: string | null,
  initialProps: Record<string, PropPrimitiveValue>,
  callbackNames: string[],
  userCss: string
): string {
  const runtimeUrl = escapeHtml(getRuntimeBundleUrl());
  const safeCode = escapeScriptClose(compiledJs);
  const safeInitProps = escapeScriptClose(JSON.stringify(initialProps));
  const safeCallbacks = escapeScriptClose(JSON.stringify(callbackNames));
  const safeCompName = escapeScriptClose(JSON.stringify(componentName || 'Component'));
  const safeUserCss = escapeStyleClose(userCss);

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<style>
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; min-height: 100%; width: 100%; background: transparent !important; color-scheme: normal; }
  body {
    display: flex;
    padding: 20px;
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  #root {
    margin: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    max-width: 100%;
  }
  .sb-error {
    max-width: 480px;
    padding: 14px 16px;
    border-radius: 10px;
    background: #fef2f2;
    border: 1px solid #fca5a5;
    color: #991b1b;
    font: 500 12.5px/1.5 ui-monospace, Consolas, monospace;
    white-space: pre-wrap;
  }
</style>
<style id="studio-user-css">${safeUserCss}</style>
<script src="${runtimeUrl}"></script>
</head>
<body>
<div id="root"></div>
<script>
(function() {
  var React = window.__REACT__;
  var ReactDOM = window.__REACT_DOM__;
  var rootEl = document.getElementById('root');
  if (!React || !ReactDOM || !rootEl) {
    if (rootEl) rootEl.innerHTML = '<div class="sb-error">React 运行时未能加载。</div>';
    return;
  }

  function postToHost(payload) {
    try { window.parent.postMessage(payload, '*'); } catch (_) {}
  }

  function ErrorBoundary(props) {
    React.Component.call(this, props);
    this.state = { error: null };
  }
  ErrorBoundary.prototype = Object.create(React.Component.prototype);
  ErrorBoundary.prototype.constructor = ErrorBoundary;
  ErrorBoundary.getDerivedStateFromError = function(err) {
    return { error: err };
  };
  ErrorBoundary.prototype.componentDidCatch = function(err) {
    postToHost({
      type: 'studio-error',
      message: err && err.message ? String(err.message) : String(err)
    });
  };
  ErrorBoundary.prototype.render = function() {
    if (this.state && this.state.error) {
      return React.createElement('div', { className: 'sb-error' }, '组件渲染异常: ' + (this.state.error.message || String(this.state.error)));
    }
    return this.props.children;
  };

  var TargetComponent = null;
  try {
    var factory = new Function('React', ${JSON.stringify(safeCode)});
    TargetComponent = factory(React);
  } catch (err) {
    var msg = err && err.message ? String(err.message) : String(err);
    rootEl.innerHTML = '<div class="sb-error">编译执行失败: ' + msg.replace(/</g, '&lt;') + '</div>';
    postToHost({ type: 'studio-error', message: msg });
    return;
  }

  if (typeof TargetComponent !== 'function') {
    var notFoundMsg = '未找到可渲染的导出组件 ' + ${safeCompName};
    rootEl.innerHTML = '<div class="sb-error">' + notFoundMsg + '</div>';
    postToHost({ type: 'studio-error', message: notFoundMsg });
    return;
  }

  var root = ReactDOM.createRoot(rootEl);

  function buildProps(rawProps, cbNames) {
    var merged = Object.assign({}, rawProps || {});
    (cbNames || []).forEach(function(cbName) {
      merged[cbName] = function() {
        var args = [];
        for (var i = 0; i < arguments.length; i++) {
          var a = arguments[i];
          if (a && typeof a === 'object' && 'nativeEvent' in a) {
            args.push('[SyntheticEvent]');
          } else {
            try { args.push(JSON.stringify(a)); } catch (_) { args.push(String(a)); }
          }
        }
        postToHost({ type: 'studio-callback', name: cbName, argsText: args.join(', ') });
      };
    });
    return merged;
  }

  function renderWithProps(rawProps, cbNames) {
    var finalProps = buildProps(rawProps, cbNames);
    root.render(
      React.createElement(
        ErrorBoundary,
        null,
        React.createElement(TargetComponent, finalProps)
      )
    );
    postToHost({ type: 'studio-error', message: '' });
  }

  renderWithProps(${safeInitProps}, ${safeCallbacks});

  window.addEventListener('message', function(ev) {
    var data = ev && ev.data;
    if (!data) return;
    if (data.type === 'studio-update-css') {
      var styleEl = document.getElementById('studio-user-css');
      if (styleEl) styleEl.textContent = typeof data.css === 'string' ? data.css : '';
      return;
    }
    if (data.type === 'studio-update-props') {
      renderWithProps(data.props, data.callbacks);
    }
  });
})();
</script>
</body>
</html>`;
}

function getPreviewIframe(): HTMLIFrameElement | null {
  const el = $('studioPreviewFrame');
  if (typeof HTMLIFrameElement !== 'undefined' && el instanceof HTMLIFrameElement) {
    return el;
  }
  return null;
}

function pushPropsToIframe(): void {
  const iframe = getPreviewIframe();
  if (!iframe || !iframe.contentWindow) return;
  iframe.contentWindow.postMessage(
    {
      type: 'studio-update-props',
      props: getSerializablePropsObject(),
      callbacks: getCallbackPropNames(),
    },
    '*'
  );
}

function pushCssToIframe(cssText: string): boolean {
  const iframe = getPreviewIframe();
  if (!iframe || !iframe.contentWindow || !iframe.srcdoc) return false;
  iframe.contentWindow.postMessage(
    {
      type: 'studio-update-css',
      css: cssText,
    },
    '*'
  );
  return true;
}

function syncPropValueBackToSource(propName: string, newValue: PropPrimitiveValue): void {
  studioState.lastCodeDefaults.set(propName, newValue);
  const schemaField = studioState.schema.fields.find((f) => f.name === propName);
  if (schemaField) {
    schemaField.hasDefault = true;
    schemaField.defaultValue = newValue;
  }

  const compNorm = normalizeWorkspaceModulePath(studioState.componentFilePath || '');
  const activeNorm = normalizeWorkspaceModulePath(appState.FILE_NAME || '');

  if (!compNorm || activeNorm === compNorm) {
    const prevSrc = getEditorSource().replace(/\r\n?/g, '\n');
    const nextSrc = applyPropDefaultToSource(prevSrc, propName, newValue);
    if (nextSrc !== prevSrc) {
      if (studioState.debounceTimer !== null) {
        clearTimeout(studioState.debounceTimer);
        studioState.debounceTimer = null;
      }
      studioState.suppressSourceCompile = true;
      try {
        setEditorSource(nextSrc);
        syncActiveScriptTabSource(nextSrc);
        updateEditorChrome();
      } finally {
        studioState.suppressSourceCompile = false;
      }
    }
    return;
  }

  const targetTab = SCRIPT_TABS.ts.tabs.find(
    (t) => normalizeWorkspaceModulePath(t.vfsPath || t.title) === compNorm
  );
  const vfsNode = VFS_NODES.get(compNorm);
  const prevCompSrc =
    (targetTab ? targetTab.source : undefined) ??
    (vfsNode && vfsNode.type === 'file' ? vfsNode.content : undefined);
  if (typeof prevCompSrc !== 'string') return;

  const nextCompSrc = applyPropDefaultToSource(prevCompSrc, propName, newValue);
  if (nextCompSrc === prevCompSrc) return;

  if (targetTab) {
    targetTab.source = nextCompSrc;
  }
  if (vfsNode && vfsNode.type === 'file') {
    vfsNode.content = nextCompSrc;
    persistVfsToClientStorage();
  }
}

function setStudioError(message: string): void {
  const banner = $('studioErrorBanner');
  if (!banner) return;
  if (!message) {
    banner.hidden = true;
    banner.textContent = '';
  } else {
    banner.hidden = false;
    banner.textContent = message;
  }
}

function renderEventsLog(): void {
  const logEl = $('studioEventsLog');
  if (!logEl) return;
  if (studioState.events.length === 0) {
    logEl.innerHTML = '<div class="studio-empty-hint">触发组件回调事件将在此记录…</div>';
    return;
  }
  logEl.innerHTML = studioState.events
    .map(
      (ev) =>
        `<div class="studio-event-item"><span class="studio-event-time">${escapeHtml(ev.time)}</span><span class="studio-event-name">${escapeHtml(ev.name)}()</span><span class="studio-event-args">${escapeHtml(ev.argsText)}</span></div>`
    )
    .join('');
}

function updateCallbackBadge(name: string): void {
  const listEl = $('studioPropsList');
  if (!listEl || !listEl.querySelectorAll) return;
  const count = studioState.callbackCounts.get(name) ?? 0;
  listEl.querySelectorAll<HTMLElement>('[data-cb-badge]').forEach((el) => {
    if (el.dataset.cbBadge === name) {
      el.textContent = `⚡ 已触发 ${count} 次`;
    }
  });
}

function renderPropsPanel(): void {
  const tagEl = $('studioComponentTag');
  if (tagEl) {
    tagEl.textContent = studioState.schema.componentName
      ? `<${studioState.schema.componentName} />`
      : '未检测到组件';
  }
  const listEl = $('studioPropsList');
  if (!listEl) return;
  const fields = studioState.schema.fields;
  if (fields.length === 0) {
    listEl.innerHTML =
      '<div class="studio-empty-hint">未检测到 interface/type Props 定义，可在组件中声明 Props 接口自动生成控件。</div>';
    return;
  }

  const rowsHtml: string[] = [];
  for (const field of fields) {
    const val = studioState.propValues.get(field.name);
    const reqMark = field.optional ? '?' : '';
    const descHtml = field.description
      ? `<div class="studio-prop-desc">${escapeHtml(field.description)}</div>`
      : '';

    let ctrlHtml = '';
    if (field.kind === 'boolean') {
      const checked = Boolean(val);
      ctrlHtml = `<label class="studio-toggle"><input type="checkbox" data-prop-name="${escapeHtml(field.name)}" data-prop-kind="boolean" ${checked ? 'checked' : ''}><span data-bool-label="${escapeHtml(field.name)}">${checked ? 'true' : 'false'}</span></label>`;
    } else if (field.kind === 'string') {
      const strVal = typeof val === 'string' ? val : '';
      ctrlHtml = `<input type="text" class="studio-input" data-prop-name="${escapeHtml(field.name)}" data-prop-kind="string" value="${escapeHtml(strVal)}">`;
    } else if (field.kind === 'number') {
      const numVal = typeof val === 'number' ? val : 0;
      const maxVal = Math.max(100, Math.ceil(Math.abs(numVal) * 2));
      const minVal = numVal < 0 ? Math.floor(numVal * 2) : 0;
      ctrlHtml = `<input type="range" class="studio-range" min="${minVal}" max="${maxVal}" step="1" data-prop-name="${escapeHtml(field.name)}" data-prop-kind="number-range" value="${numVal}"><input type="number" class="studio-input studio-num-input" data-prop-name="${escapeHtml(field.name)}" data-prop-kind="number" value="${numVal}">`;
    } else if (field.kind === 'enum') {
      const opts = field.options ?? [];
      const curStr = typeof val === 'string' ? val : (opts[0] ?? '');
      if (opts.length <= 4) {
        const btns = opts
          .map(
            (opt) =>
              `<button type="button" class="studio-enum-opt${opt === curStr ? ' active' : ''}" data-prop-name="${escapeHtml(field.name)}" data-prop-kind="enum-btn" data-prop-val="${escapeHtml(opt)}">${escapeHtml(opt)}</button>`
          )
          .join('');
        ctrlHtml = `<div class="studio-enum-seg">${btns}</div>`;
      } else {
        const optsHtml = opts
          .map(
            (opt) =>
              `<option value="${escapeHtml(opt)}"${opt === curStr ? ' selected' : ''}>${escapeHtml(opt)}</option>`
          )
          .join('');
        ctrlHtml = `<select class="studio-select" data-prop-name="${escapeHtml(field.name)}" data-prop-kind="enum-sel">${optsHtml}</select>`;
      }
    } else if (field.kind === 'callback') {
      const count = studioState.callbackCounts.get(field.name) ?? 0;
      ctrlHtml = `<span class="studio-cb-pill" data-cb-badge="${escapeHtml(field.name)}">⚡ 已触发 ${count} 次</span>`;
    } else {
      ctrlHtml = `<span class="studio-prop-type">(${escapeHtml(field.rawType)})</span>`;
    }

    rowsHtml.push(
      `<div class="studio-prop-row"><div class="studio-prop-top"><span class="studio-prop-name">${escapeHtml(field.name)}${reqMark}</span><span class="studio-prop-type">${escapeHtml(field.rawType)}</span></div>${descHtml}<div class="studio-prop-ctrl">${ctrlHtml}</div></div>`
    );
  }

  listEl.innerHTML = rowsHtml.join('');
}

export function generateJsxSnippet(
  schema: ComponentPropsSchema,
  propValues: Map<string, PropPrimitiveValue>
): string {
  const compName = schema.componentName || 'Component';
  const attrLines: string[] = [];

  for (const field of schema.fields) {
    if (field.kind === 'callback') {
      attrLines.push(`  ${field.name}={() => {}}`);
      continue;
    }
    const val = propValues.get(field.name);
    if (val === undefined) continue;
    if (field.kind === 'boolean') {
      if (val === true) attrLines.push(`  ${field.name}`);
      else attrLines.push(`  ${field.name}={false}`);
    } else if (field.kind === 'number') {
      attrLines.push(`  ${field.name}={${val}}`);
    } else if (typeof val === 'string') {
      attrLines.push(`  ${field.name}=${JSON.stringify(val)}`);
    }
  }

  if (attrLines.length === 0) {
    return `<${compName} />`;
  }
  if (attrLines.length <= 2) {
    return `<${compName} ${attrLines.map((l) => l.trim()).join(' ')} />`;
  }
  return `<${compName}\n${attrLines.join('\n')}\n/>`;
}

export function compileAndRenderStudio(resetPropsToDefaults = false): void {
  const fileMap = uiHooks.collectWorkspaceFileMap();
  const activeNorm = normalizeWorkspaceModulePath(appState.FILE_NAME || '');
  const isCssEditor = /\.css$/i.test(activeNorm);
  const isTsxEditor = /\.(?:tsx|jsx)$/i.test(activeNorm);

  let componentPath = studioState.componentFilePath;
  let tsxSource = '';

  if (isTsxEditor) {
    componentPath = activeNorm;
    studioState.componentFilePath = componentPath;
    tsxSource = getEditorSource().replace(/\r\n?/g, '\n');
    fileMap.set(componentPath, tsxSource);
  } else if (isCssEditor) {
    const normComp = normalizeWorkspaceModulePath(componentPath);
    const fromMap = normComp ? fileMap.get(normComp) : undefined;
    if (typeof fromMap === 'string') {
      tsxSource = fromMap.replace(/\r\n?/g, '\n');
    } else {
      const sample = getReactSampleById(studioState.activeSampleId) ?? REACT_SAMPLES[0];
      if (sample) {
        componentPath = sample.fileName;
        studioState.componentFilePath = componentPath;
        tsxSource = sample.code.replace(/\r\n?/g, '\n');
      }
    }
  } else {
    tsxSource = getEditorSource().replace(/\r\n?/g, '\n');
    if (activeNorm) componentPath = activeNorm;
  }

  const nextSchema = extractPropsSchema(tsxSource);
  studioState.schema = nextSchema;
  syncPropValuesWithSchema(nextSchema, resetPropsToDefaults);
  renderPropsPanel();

  const transpiled = transpileTSXForSandbox(tsxSource);
  if (transpiled.error) {
    setStudioError(`L${transpiled.error.line}: ${transpiled.error.message}`);
    return;
  }

  const { cssText, resolvedCssPaths } = collectStudioCss(
    transpiled.cssImports,
    componentPath,
    fileMap
  );
  studioState.cssFilePaths = resolvedCssPaths;
  setStudioError('');

  const iframe = getPreviewIframe();
  if (!iframe) {
    studioState.lastCompiledJs = transpiled.code;
    studioState.lastRenderedCss = cssText;
    return;
  }

  if (
    isCssEditor &&
    transpiled.code === studioState.lastCompiledJs &&
    studioState.lastCompiledJs !== '' &&
    pushCssToIframe(cssText)
  ) {
    studioState.lastRenderedCss = cssText;
    return;
  }

  studioState.lastCompiledJs = transpiled.code;
  studioState.lastRenderedCss = cssText;
  iframe.srcdoc = buildSandboxSrcdoc(
    transpiled.code,
    transpiled.exportedComponent || nextSchema.componentName,
    getSerializablePropsObject(),
    getCallbackPropNames(),
    cssText
  );
}

function applyViewport(vp: ViewportKind): void {
  studioState.viewport = vp;
  const frame = $('studioViewportFrame');
  if (frame && frame.classList) {
    frame.classList.remove('viewport-desktop', 'viewport-tablet', 'viewport-mobile');
    frame.classList.add('viewport-' + vp);
  }
  const group = $('studioViewportGroup');
  if (group && group.querySelectorAll) {
    group.querySelectorAll<HTMLElement>('.studio-seg-btn').forEach((btn) => {
      if (btn.classList) btn.classList.toggle('active', btn.dataset.viewport === vp);
    });
  }
}

function applyStageBg(bg: StageBgKind): void {
  studioState.bg = bg;
  const stage = $('studioStage');
  if (stage && stage.classList) {
    stage.classList.remove('bg-light', 'bg-dark', 'bg-dots');
    stage.classList.add('bg-' + bg);
  }
  const group = $('studioBgGroup');
  if (group && group.querySelectorAll) {
    group.querySelectorAll<HTMLElement>('.studio-seg-btn').forEach((btn) => {
      if (btn.classList) btn.classList.toggle('active', btn.dataset.bg === bg);
    });
  }
}

export function loadStudioSample(sampleId: string): void {
  const sample = getReactSampleById(sampleId) ?? REACT_SAMPLES[0];
  if (!sample) return;
  studioState.activeSampleId = sample.id;
  studioState.hasLoadedDefaultSample = true;
  studioState.componentFilePath = sample.fileName;
  studioState.cssFilePaths = sample.cssFileName ? [sample.cssFileName] : [];
  studioState.lastComponentName = null;
  studioState.lastCodeDefaults.clear();
  studioState.callbackCounts.clear();
  studioState.events = [];
  renderEventsLog();

  ensureVfsInitialized();
  if (sample.cssFileName) {
    VFS_NODES.set(sample.cssFileName, {
      path: sample.cssFileName,
      name: sample.cssFileName,
      type: 'file',
      parentPath: '',
      content: sample.cssCode,
    });
  }
  VFS_NODES.set(sample.fileName, {
    path: sample.fileName,
    name: sample.fileName,
    type: 'file',
    parentPath: '',
    content: sample.code,
  });
  persistVfsToClientStorage();

  const currentTab = getActiveScriptTab('ts');
  if (currentTab && getEditorSource()) {
    syncActiveScriptTabSource(getEditorSource());
  }

  if (sample.cssFileName) {
    upsertVfsScriptTab(sample.cssFileName, sample.cssFileName, sample.cssCode, 'ts');
  }
  upsertVfsScriptTab(sample.fileName, sample.fileName, sample.code, 'ts');

  setScriptTabSyncing(true);
  setEditorSource(sample.code);
  setFileName(sample.fileName);
  if (fileNameEl) fileNameEl.value = sample.fileName;
  const exportTag = $('fileExportTag');
  if (exportTag) exportTag.textContent = sample.fileName;
  setScriptTabSyncing(false);

  renderScriptTabsUI();
  renderVfsTreeUI();
  updateEditorChrome();

  const sel = $('studioSampleSel');
  if (typeof HTMLSelectElement !== 'undefined' && sel instanceof HTMLSelectElement) {
    sel.value = sample.id;
  }

  compileAndRenderStudio(true);
}

function initStudioEventsOnce(): void {
  if (studioState.initialized) return;
  studioState.initialized = true;

  const sampleSel = $('studioSampleSel');
  if (typeof HTMLSelectElement !== 'undefined' && sampleSel instanceof HTMLSelectElement) {
    sampleSel.innerHTML = REACT_SAMPLES.map(
      (s) => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.title)}</option>`
    ).join('');
    sampleSel.addEventListener('change', () => {
      loadStudioSample(sampleSel.value);
    });
  }

  const vpGroup = $('studioViewportGroup');
  if (vpGroup && vpGroup.addEventListener) {
    vpGroup.addEventListener('click', (e: MouseEvent) => {
      const btn = closestElement(e, '.studio-seg-btn');
      const vp = btn?.dataset.viewport;
      if (vp === 'desktop' || vp === 'tablet' || vp === 'mobile') {
        applyViewport(vp);
      }
    });
  }

  const bgGroup = $('studioBgGroup');
  if (bgGroup && bgGroup.addEventListener) {
    bgGroup.addEventListener('click', (e: MouseEvent) => {
      const btn = closestElement(e, '.studio-seg-btn');
      const bg = btn?.dataset.bg;
      if (bg === 'light' || bg === 'dark' || bg === 'dots') {
        applyStageBg(bg);
      }
    });
  }

  const btnReset = $('studioBtnResetProps');
  if (btnReset && btnReset.addEventListener) {
    btnReset.addEventListener('click', () => {
      syncPropValuesWithSchema(studioState.schema, true);
      renderPropsPanel();
      pushPropsToIframe();
    });
  }

  const btnClearEv = $('studioBtnClearEvents');
  if (btnClearEv && btnClearEv.addEventListener) {
    btnClearEv.addEventListener('click', () => {
      studioState.callbackCounts.clear();
      studioState.events = [];
      renderEventsLog();
      renderPropsPanel();
    });
  }

  const btnCopy = $('studioBtnCopyJsx');
  if (btnCopy && btnCopy.addEventListener) {
    btnCopy.addEventListener('click', () => {
      const snippet = generateJsxSnippet(studioState.schema, studioState.propValues);
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(snippet).catch(() => {});
      }
      btnCopy.textContent = '✓ 已复制';
      btnCopy.classList.add('copied');
      setTimeout(() => {
        btnCopy.textContent = '📋 复制 JSX';
        btnCopy.classList.remove('copied');
      }, 1400);
    });
  }

  const propsList = $('studioPropsList');
  if (propsList && propsList.addEventListener) {
    propsList.addEventListener('input', (e: Event) => {
      const target = e.target;
      if (typeof HTMLInputElement !== 'undefined' && target instanceof HTMLInputElement) {
        const name = target.dataset.propName;
        const kind = target.dataset.propKind;
        if (!name || !kind) return;
        if (kind === 'string') {
          studioState.propValues.set(name, target.value);
          pushPropsToIframe();
          syncPropValueBackToSource(name, target.value);
        } else if (kind === 'number' || kind === 'number-range') {
          const num = Number(target.value);
          if (!Number.isNaN(num)) {
            studioState.propValues.set(name, num);
            propsList.querySelectorAll<HTMLInputElement>(`input[data-prop-name="${name}"]`).forEach((inp) => {
              if (inp !== target) inp.value = String(num);
            });
            pushPropsToIframe();
            syncPropValueBackToSource(name, num);
          }
        }
      }
    });

    propsList.addEventListener('change', (e: Event) => {
      const target = e.target;
      if (typeof HTMLInputElement !== 'undefined' && target instanceof HTMLInputElement) {
        const name = target.dataset.propName;
        const kind = target.dataset.propKind;
        if (name && kind === 'boolean') {
          studioState.propValues.set(name, target.checked);
          const lbl = propsList.querySelector<HTMLElement>(`[data-bool-label="${name}"]`);
          if (lbl) lbl.textContent = target.checked ? 'true' : 'false';
          pushPropsToIframe();
          syncPropValueBackToSource(name, target.checked);
        }
      } else if (typeof HTMLSelectElement !== 'undefined' && target instanceof HTMLSelectElement) {
        const name = target.dataset.propName;
        if (name && target.dataset.propKind === 'enum-sel') {
          studioState.propValues.set(name, target.value);
          pushPropsToIframe();
          syncPropValueBackToSource(name, target.value);
        }
      }
    });

    propsList.addEventListener('click', (e: MouseEvent) => {
      const btn = closestElement(e, '[data-prop-kind="enum-btn"]');
      if (!btn) return;
      const name = btn.dataset.propName;
      const val = btn.dataset.propVal;
      if (!name || val === undefined) return;
      studioState.propValues.set(name, val);
      propsList.querySelectorAll<HTMLElement>(`[data-prop-name="${name}"][data-prop-kind="enum-btn"]`).forEach((b) => {
        if (b.classList) b.classList.toggle('active', b.dataset.propVal === val);
      });
      pushPropsToIframe();
      syncPropValueBackToSource(name, val);
    });
  }

  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('message', (ev: MessageEvent) => {
      const data: unknown = ev.data;
      if (!isRecord(data)) return;
      const msgType = data.type;
      if (msgType === 'studio-error') {
        const msg = typeof data.message === 'string' ? data.message : '';
        setStudioError(msg);
      } else if (msgType === 'studio-callback') {
        const name = typeof data.name === 'string' ? data.name : 'callback';
        const argsText = typeof data.argsText === 'string' ? data.argsText : '';
        const nextCount = (studioState.callbackCounts.get(name) ?? 0) + 1;
        studioState.callbackCounts.set(name, nextCount);
        updateCallbackBadge(name);
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const ss = String(now.getSeconds()).padStart(2, '0');
        studioState.events.unshift({
          time: `${hh}:${mm}:${ss}`,
          name,
          argsText,
        });
        if (studioState.events.length > 30) {
          studioState.events.length = 30;
        }
        renderEventsLog();
      }
    });
  }
}

export function enterStudioMode(): void {
  initStudioEventsOnce();
  if (studioPanelEl) studioPanelEl.hidden = false;

  const src = getEditorSource();
  const activeFile = appState.FILE_NAME || '';
  const looksLikeTsx = /\bexport\b/.test(src) && /<[A-Za-z>]/.test(src);
  const isStudioFile = /\.(?:tsx|jsx|css)$/i.test(activeFile);

  if (!studioState.hasLoadedDefaultSample && !looksLikeTsx && !isStudioFile) {
    loadStudioSample(studioState.activeSampleId);
  } else {
    updateEditorChrome();
    compileAndRenderStudio(false);
  }
}

export function leaveStudioMode(): void {
  if (studioPanelEl) studioPanelEl.hidden = true;
  updateEditorChrome();
}

export function onStudioSourceChanged(): void {
  if (appState.VIEW_MODE !== 'studio' || studioState.suppressSourceCompile) return;
  if (studioState.debounceTimer !== null) {
    clearTimeout(studioState.debounceTimer);
  }
  studioState.debounceTimer = setTimeout(() => {
    studioState.debounceTimer = null;
    compileAndRenderStudio(false);
  }, 220);
}

export function onStudioFileActivated(): void {
  if (appState.VIEW_MODE !== 'studio') return;
  if (studioState.debounceTimer !== null) {
    clearTimeout(studioState.debounceTimer);
    studioState.debounceTimer = null;
  }
  compileAndRenderStudio(false);
}

registerUiHooks({
  onStudioSourceChanged,
  onStudioFileActivated,
});
