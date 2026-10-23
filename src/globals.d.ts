/* ================================================================
   Ambient declarations for global bridge & WebCodecs APIs (src/globals.d.ts)
   ================================================================ */
import type { DebugSession, Diag, LangBuffer, TraceData } from './types';

declare global {
  var $: (id: string) => any;
  var editor: any;
  var logEl: any;
  var gutterEl: any;
  var highlightEl: any;
  var varsEl: any;
  var pickEl: any;
  var callStackBarEl: any;
  var callStackHintEl: any;
  var slotsEl: any;
  var consoleEl: any;
  var cntEl: any;
  var ctlHint: any;
  var mainEl: any;
  var sidePanelEl: any;
  var resizerEl: any;
  var flyLayerEl: any;
  var hoverTipEl: any;
  var stepVizEl: any;
  var fileNameEl: any;
  var fileInputEl: any;
  var btnImportEl: any;

  var MAX_STEPS: number;
  var MAX_EXEC_MS: number;
  var RUN_TIMEOUT_MS: number;
  var AUTO_PLAY_MS: number;
  var VIDEO_WIDTH: number;
  var VIDEO_HEIGHT: number;
  var VIDEO_FPS: number;
  var VIDEO_SPEED_OPTIONS: number[];
  var PAUSE_SIGNAL: { __debugPause: boolean };
  var esc: (t: any) => string;

  var VIEW_MODE: 'script' | 'notebook';
  var ACTIVE_NB_CELL_ID: string | null;
  var FILE_NAME: string;
  var LANG: 'ts' | 'python';
  var LANG_BUFFERS: Record<string, LangBuffer | null>;
  var PY_DIAGS: Diag[];
  var VIDEO_EXPORT_SPEED: number;
  var IS_EXPORTING_VIDEO: boolean;
  var TRACE: TraceData;
  var cur: number;
  var timer: any;
  var watched: Set<string>;
  var layoutSpan: Record<string, number>;
  var SELECTED_FRAME_IDX: number | null;
  var SEEN_VARS_EVER: Set<string>;
  var IS_STILL: boolean;
  var URL_WATCH: string[] | null;
  var STRICT_TS: boolean;
  var TYPE_ERROR_LINES: Set<number>;
  var RUNTIME_ERROR_LINES: Set<number>;
  var lastEditorCursorLine: number;
  var ENTRY_CALL_LINE: number;
  var CURRENT_TS_META: { interfaces: Map<string, any>; varTypes: Map<string, string> };
  var DEBUG_SESSION: DebugSession & { hasAsync?: boolean };
  var PY_ENGINE: any;
  var VideoEncoder: any;
  var VideoFrame: any;

  interface Window {
    PlaygroundCM?: any;
    __cmView?: any;
    __CM_CURSOR_LINE?: number;
    __BOOT_DEFERRED?: boolean;
    [key: string]: any;
  }
}

export {};
