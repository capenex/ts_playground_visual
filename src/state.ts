/* ================================================================
   Centralized pure runtime & domain state management (src/state.ts)
   ================================================================ */
import type {
  ConsoleLogEntry,
  DebugSession,
  Diag,
  InterfaceSchemaMeta,
  LangBuffer,
  TraceData,
  TsMeta,
} from './types';

export const MAX_STEPS = 5000;
export const MAX_EXEC_MS = 3500;
export const RUN_TIMEOUT_MS = 2000;
export const AUTO_PLAY_MS = 900;
export const VIDEO_WIDTH = 1920;
export const VIDEO_HEIGHT = 1080;
export const VIDEO_FPS = 60;
export const VIDEO_SPEED_OPTIONS = [0.75, 1, 1.5, 2, 3];
export const PAUSE_SIGNAL = { __debugPause: true };

export function esc(t: unknown): string {
  return String(t)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface AppState {
  VIEW_MODE: 'script' | 'notebook';
  ACTIVE_NB_CELL_ID: string | null;
  FILE_NAME: string;
  LANG: 'ts' | 'python';
  LANG_BUFFERS: Record<string, LangBuffer | null>;
  PY_DIAGS: Diag[];
  CONSOLE_LOGS: ConsoleLogEntry[];
  VIDEO_EXPORT_SPEED: number;
  IS_EXPORTING_VIDEO: boolean;
  TRACE: TraceData;
  cur: number;
  timer: ReturnType<typeof setInterval> | null;
  watched: Set<string>;
  layoutSpan: Record<string, number>;
  SELECTED_FRAME_IDX: number | null;
  SEEN_VARS_EVER: Set<string>;
  IS_STILL: boolean;
  URL_WATCH: string[] | null;
  STRICT_TS: boolean;
  TYPE_ERROR_LINES: Set<number>;
  RUNTIME_ERROR_LINES: Set<number>;
  lastEditorCursorLine: number;
  ENTRY_CALL_LINE: number;
  CURRENT_TS_META: TsMeta;
  DEBUG_SESSION: DebugSession;
}

const initialLayoutSpan: Record<string, number> = {};

export const appState: AppState = {
  VIEW_MODE: 'script',
  ACTIVE_NB_CELL_ID: null,
  FILE_NAME: 'playground.ts',
  LANG: 'ts',
  LANG_BUFFERS: { ts: null, python: null },
  PY_DIAGS: [],
  CONSOLE_LOGS: [],
  VIDEO_EXPORT_SPEED: 1,
  IS_EXPORTING_VIDEO: false,
  TRACE: { title: 'TypeScript Playground · Debug', code: [], steps: [] },
  cur: 0,
  timer: null,
  watched: new Set<string>(),
  layoutSpan: initialLayoutSpan,
  SELECTED_FRAME_IDX: null,
  SEEN_VARS_EVER: new Set<string>(),
  IS_STILL: false,
  URL_WATCH: null,
  STRICT_TS: true,
  TYPE_ERROR_LINES: new Set<number>(),
  RUNTIME_ERROR_LINES: new Set<number>(),
  lastEditorCursorLine: -1,
  ENTRY_CALL_LINE: 0,
  CURRENT_TS_META: {
    interfaces: new Map<string, InterfaceSchemaMeta>(),
    varTypes: new Map<string, string>(),
  },
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
  },
};

export type ConsoleLogListener = (
  action: 'append' | 'clear',
  entry?: ConsoleLogEntry
) => void;

const consoleListeners = new Set<ConsoleLogListener>();

export function subscribeConsoleLogs(listener: ConsoleLogListener): () => void {
  consoleListeners.add(listener);
  return () => {
    consoleListeners.delete(listener);
  };
}

export function notifyConsoleLog(action: 'append' | 'clear', entry?: ConsoleLogEntry): void {
  consoleListeners.forEach((fn) => fn(action, entry));
}

export function bindStateGlobals(target: object = globalThis): void {
  for (const key of Object.keys(appState)) {
    const desc = Object.getOwnPropertyDescriptor(target, key);
    if (desc && !desc.configurable) continue;
    Object.defineProperty(target, key, {
      get: () => Reflect.get(appState, key),
      set: (v: unknown) => {
        Reflect.set(appState, key, v);
      },
      configurable: true,
      enumerable: true,
    });
  }
  // Alias for external compatibility (REFACTOR_PLAN.md)
  if (!Object.getOwnPropertyDescriptor(target, 'steps')) {
    Object.defineProperty(target, 'steps', {
      get: () => appState.TRACE?.steps || [],
      set: (v: TraceData['steps']) => {
        if (appState.TRACE) appState.TRACE.steps = v;
      },
      configurable: true,
    });
  }
  if (!Object.getOwnPropertyDescriptor(target, 'idx')) {
    Object.defineProperty(target, 'idx', {
      get: () => appState.cur,
      set: (v: unknown) => {
        appState.cur = Number(v) || 0;
      },
      configurable: true,
    });
  }
  Object.assign(target, {
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

export interface RuntimeUiHooks {
  stopAuto: () => void;
  clearFlyLayer: () => void;
  renderPicker: () => void;
  renderStatic: (idx: number, animate?: boolean) => void;
  updateEditorChrome: () => void;
  revealErrorLine: (line: number | string, focus?: boolean) => void;
  loadSample: (key: string) => void;
  getActiveWorkspacePath: () => string;
  openVfsNotebookFile: (name: string, content: string | undefined) => void;
  openVfsScriptFile: (path: string, name: string, content: string) => void;
  onVfsFileDeleted: (delPath: string) => void;
  onVfsFileRenamed: (oldPath: string, nextPath: string, nextName: string) => void;
  setViewMode: (mode: 'script' | 'notebook') => void;
  importSampleIntoNotebook: (code: string, sampleKey: string) => void;
  openTutorialModal: () => void;
  importTutorialNotebook: (tutorialId: string) => boolean;
  appendConsoleLog: (entry: ConsoleLogEntry) => void;
  clearConsoleDom: () => void;
  getEditorSource: () => string;
  setEditorSource: (src: string) => void;
  renderNotebookUI: (focusActiveEditor?: boolean) => void;
  setCntStatus: (text: string, cls?: string) => void;
}

export const uiHooks: RuntimeUiHooks = {
  stopAuto: () => {},
  clearFlyLayer: () => {},
  renderPicker: () => {},
  renderStatic: () => {},
  updateEditorChrome: () => {},
  revealErrorLine: () => {},
  loadSample: () => {},
  getActiveWorkspacePath: () => '',
  openVfsNotebookFile: () => {},
  openVfsScriptFile: () => {},
  onVfsFileDeleted: () => {},
  onVfsFileRenamed: () => {},
  setViewMode: () => {},
  importSampleIntoNotebook: () => {},
  openTutorialModal: () => {},
  importTutorialNotebook: () => false,
  appendConsoleLog: () => {},
  clearConsoleDom: () => {},
  getEditorSource: () => '',
  setEditorSource: () => {},
  renderNotebookUI: () => {},
  setCntStatus: () => {},
};

export function registerUiHooks(hooks: Partial<RuntimeUiHooks>): void {
  Object.assign(uiHooks, hooks);
}

bindStateGlobals();


