/* ================================================================
   Centralized runtime & UI state management (src/state.ts)
   ================================================================ */
import type { DebugSession, Diag, LangBuffer, TraceData, TsMeta } from './types';

export const $ = (id: string): any =>
  typeof document !== 'undefined' ? document.getElementById(id) : null;

export const editor = $('editor');
export const logEl = $('log');
export const gutterEl = $('gutter');
export const highlightEl = $('highlight');
export const varsEl = $('vars');
export const pickEl = $('pick');
export const callStackBarEl = $('callStackBar');
export const callStackHintEl = $('callStackHint');
export const slotsEl = $('slots');
export const consoleEl = $('console');
export const cntEl = $('cnt');
export const ctlHint = $('ctlHint');
export const mainEl = $('main');
export const sidePanelEl = $('sidePanel');
export const resizerEl = $('resizer');
export const flyLayerEl = $('flyLayer');
export const hoverTipEl = $('hoverTip');
export const stepVizEl = $('stepViz');
export const fileNameEl = $('fileName');
export const fileInputEl = $('fileInput');
export const btnImportEl = $('btnImport');

export const MAX_STEPS = 5000;
export const MAX_EXEC_MS = 3500;
export const RUN_TIMEOUT_MS = 2000;
export const AUTO_PLAY_MS = 900;
export const VIDEO_WIDTH = 1920;
export const VIDEO_HEIGHT = 1080;
export const VIDEO_FPS = 60;
export const VIDEO_SPEED_OPTIONS = [0.75, 1, 1.5, 2, 3];
export const PAUSE_SIGNAL = { __debugPause: true };

export function esc(t: any): string {
  return String(t)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const appState = {
  VIEW_MODE: 'script' as 'script' | 'notebook',
  ACTIVE_NB_CELL_ID: null as string | null,
  FILE_NAME: 'playground.ts',
  LANG: 'ts' as 'ts' | 'python',
  LANG_BUFFERS: { ts: null, python: null } as Record<string, LangBuffer | null>,
  PY_DIAGS: [] as Diag[],
  VIDEO_EXPORT_SPEED: 1,
  IS_EXPORTING_VIDEO: false,
  TRACE: { title: 'TypeScript Playground · Debug', code: [], steps: [] } as TraceData,
  cur: 0,
  timer: null as any,
  watched: new Set<string>(),
  layoutSpan: Object.create(null) as Record<string, number>,
  SELECTED_FRAME_IDX: null as number | null,
  SEEN_VARS_EVER: new Set<string>(),
  IS_STILL: false,
  URL_WATCH: null as string[] | null,
  STRICT_TS: true,
  TYPE_ERROR_LINES: new Set<number>(),
  RUNTIME_ERROR_LINES: new Set<number>(),
  lastEditorCursorLine: -1,
  ENTRY_CALL_LINE: 0,
  CURRENT_TS_META: { interfaces: new Map<string, any>(), varTypes: new Map<string, string>() } as any,
  DEBUG_SESSION: {
    active: false,
    finished: false,
    crashed: false,
    error: null,
    errorLine: -1,
    returnValue: undefined,
    compiledFn: null,
    originalLines: [],
    callExpr: 'undefined',
  } as DebugSession,
};

export function bindStateGlobals(target: any = globalThis): void {
  const keys = Object.keys(appState) as Array<keyof typeof appState>;
  for (const key of keys) {
    const desc = Object.getOwnPropertyDescriptor(target, key);
    if (desc && !desc.configurable) continue;
    Object.defineProperty(target, key, {
      get: () => appState[key],
      set: (v) => {
        (appState as any)[key] = v;
      },
      configurable: true,
      enumerable: true,
    });
  }
  // Alias for external compatibility (REFACTOR_PLAN.md)
  if (!Object.getOwnPropertyDescriptor(target, 'steps')) {
    Object.defineProperty(target, 'steps', {
      get: () => appState.TRACE?.steps || [],
      set: (v) => {
        if (appState.TRACE) appState.TRACE.steps = v;
      },
      configurable: true,
    });
  }
  if (!Object.getOwnPropertyDescriptor(target, 'idx')) {
    Object.defineProperty(target, 'idx', {
      get: () => appState.cur,
      set: (v) => {
        appState.cur = Number(v) || 0;
      },
      configurable: true,
    });
  }
  Object.assign(target, {
    $,
    editor,
    logEl,
    gutterEl,
    highlightEl,
    varsEl,
    pickEl,
    callStackBarEl,
    callStackHintEl,
    slotsEl,
    consoleEl,
    cntEl,
    ctlHint,
    mainEl,
    sidePanelEl,
    resizerEl,
    flyLayerEl,
    hoverTipEl,
    stepVizEl,
    fileNameEl,
    fileInputEl,
    btnImportEl,
    MAX_STEPS,
    MAX_EXEC_MS,
    RUN_TIMEOUT_MS,
    AUTO_PLAY_MS,
    VIDEO_WIDTH,
    VIDEO_HEIGHT,
    VIDEO_FPS,
    VIDEO_SPEED_OPTIONS,
    PAUSE_SIGNAL,
    esc,
    appState,
  });
}

bindStateGlobals(globalThis);

