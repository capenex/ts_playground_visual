/* ================================================================
   Ambient declarations for global bridge & WebCodecs APIs (src/globals.d.ts)
   ================================================================ */
import type {
  DebugSession,
  Diag,
  InterfaceSchemaMeta,
  LangBuffer,
  PyEngineBridge,
  StepAnim,
  StepSnapshot,
  StepVizElement,
  TraceData,
  TsMeta,
} from './types';

export interface WebCodecsEncodedChunk {
  byteLength: number;
  timestamp: number;
  type: 'key' | 'delta';
  copyTo(dest: Uint8Array): void;
}

export interface WebCodecsVideoEncoderConfig {
  codec: string;
  width: number;
  height: number;
  bitrate?: number;
  framerate?: number;
  latencyMode?: string;
}

export interface WebCodecsVideoEncoder {
  state: string;
  configure(config: WebCodecsVideoEncoderConfig): void;
  encode(frame: WebCodecsVideoFrame, options?: { keyFrame?: boolean }): void;
  flush(): Promise<void>;
  close(): void;
}

export interface WebCodecsVideoEncoderConstructor {
  new (init: {
    output: (chunk: WebCodecsEncodedChunk) => void;
    error: (err: Error) => void;
  }): WebCodecsVideoEncoder;
  isConfigSupported?(config: WebCodecsVideoEncoderConfig): Promise<{ supported?: boolean }>;
}

export interface WebCodecsVideoFrame {
  close(): void;
}

export interface WebCodecsVideoFrameConstructor {
  new (
    source: HTMLCanvasElement,
    init: { timestamp: number; duration?: number }
  ): WebCodecsVideoFrame;
}

export interface PlaygroundCMBridge {
  syncFromApp(state: {
    language: 'ts' | 'python';
    text: string;
    lines: string[];
    declared: Set<string>;
    builtins: Set<string>;
    liveErrors: Diag[];
    curLine: number;
    st: StepSnapshot | null | undefined;
    errorLines: Set<number>;
  }): void;
  revealLine(line: number, focus?: boolean): void;
  scrollToLine(line: number): void;
  posAtCoords(coords: { x: number; y: number }): { lineNum: number; col: number; text: string } | null;
  coordsAtLineCol(lineNum: number, col?: number): { left: number; top: number; bottom: number } | null;
  lineTop(lineNum: number): number;
  viewportHeight(): number;
  contentLeft(): number;
  hasFocus(): boolean;
  blur(): void;
}

export interface FsStats {
  size: number;
  isFile(): boolean;
  isDirectory(): boolean;
}

export interface FsPromisesApi {
  readFile(path: string, options?: unknown): Promise<string>;
  writeFile(path: string, data: unknown, options?: unknown): Promise<void>;
  appendFile(path: string, data: unknown, options?: unknown): Promise<void>;
  unlink(path: string): Promise<void>;
  rm(path: string, options?: unknown): Promise<void>;
  readdir(path?: string, options?: unknown): Promise<string[]>;
  mkdir(path: string, options?: unknown): Promise<string | undefined>;
  rmdir(path: string, options?: unknown): Promise<void>;
  stat(path: string): Promise<FsStats>;
  access(path: string, mode?: number): Promise<void>;
  exists(path: string): Promise<boolean>;
  copyFile(src: string, dest: string): Promise<void>;
  rename(oldPath: string, newPath: string): Promise<void>;
}

export interface FsModuleApi {
  promises: FsPromisesApi;
  readFileSync(path: string, options?: unknown): string;
  writeFileSync(path: string, data: unknown, options?: unknown): void;
  appendFileSync(path: string, data: unknown, options?: unknown): void;
  existsSync(path: string): boolean;
  unlinkSync(path: string): void;
  rmSync(path: string, options?: unknown): void;
  readdirSync(path?: string): string[];
  mkdirSync(path: string, options?: unknown): string | undefined;
  rmdirSync(path: string, options?: unknown): void;
  statSync(path: string): FsStats;
  copyFileSync(src: string, dest: string): void;
  renameSync(oldPath: string, newPath: string): void;
}

export interface VfsClientApi {
  resolveWorkspacePath(rawPath: string, allowEmptyRoot?: boolean): string;
  readFile(path: string): string | null;
  writeFile(path: string, content: string): boolean;
  appendFile(path: string, content: string): boolean;
  listFiles(dirPath?: string): string[];
  readdir(dirPath?: string): string[];
  listAll(): string[];
  exists(path: string): boolean;
  deleteFile(path: string): boolean;
  unlink(path: string): boolean;
  mkdir(path: string): boolean;
  stat(path: string): FsStats;
  clear(): void;
}

declare global {
  var $: <T extends HTMLElement = HTMLElement>(id: string) => T;
  var editor: HTMLTextAreaElement;
  var logEl: HTMLElement;
  var gutterEl: HTMLElement;
  var highlightEl: HTMLElement;
  var varsEl: HTMLElement;
  var pickEl: HTMLElement;
  var callStackBarEl: HTMLElement;
  var callStackHintEl: HTMLElement;
  var slotsEl: HTMLElement;
  var consoleEl: HTMLElement;
  var cntEl: HTMLElement;
  var ctlHint: HTMLElement;
  var mainEl: HTMLElement;
  var sidePanelEl: HTMLElement;
  var resizerEl: HTMLElement;
  var flyLayerEl: HTMLElement;
  var hoverTipEl: HTMLElement;
  var stepVizEl: StepVizElement;
  var fileNameEl: HTMLInputElement;
  var fileInputEl: HTMLInputElement;
  var btnImportEl: HTMLButtonElement;

  var MAX_STEPS: number;
  var MAX_EXEC_MS: number;
  var RUN_TIMEOUT_MS: number;
  var AUTO_PLAY_MS: number;
  var VIDEO_WIDTH: number;
  var VIDEO_HEIGHT: number;
  var VIDEO_FPS: number;
  var VIDEO_SPEED_OPTIONS: number[];
  var PAUSE_SIGNAL: { __debugPause: boolean };
  var esc: (t: unknown) => string;

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
  var timer: ReturnType<typeof setInterval> | null;
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
  var CURRENT_TS_META: TsMeta;
  var DEBUG_SESSION: DebugSession;
  var PY_ENGINE: PyEngineBridge;
  var VideoEncoder: WebCodecsVideoEncoderConstructor | undefined;
  var VideoFrame: WebCodecsVideoFrameConstructor | undefined;

  // Cross-module global functions bridged via main.ts
  var updateEditorChrome: () => void;
  var revealErrorLine: (line: number | string, focus?: boolean) => void;
  var scrollCodeTo: (lineNum: number) => void;
  var syncScroll: () => void;
  var hideHoverTip: () => void;
  var hoverHitFromEvent: (e: MouseEvent) => { lineNum: number; col: number; text: string } | null;
  var hoverWordAt: (lineText: string, col: number) => { word: string; start: number; end: number } | null;
  var hoverTipForName: (name: string | null, clientX: number, clientY: number) => void;
  var playStepAnimation: (st: StepSnapshot) => void;
  var loadSample: (key: string) => void;
  var runNotebookCell: ((cellId?: string, advanceToNext?: boolean) => Promise<boolean>) | undefined;
  var debugNotebookCell: ((cellId?: string) => Promise<boolean>) | undefined;
  var renderNotebookUI: ((focusActiveEditor?: boolean) => void) | undefined;
  var openSampleScriptTab: ((title: string, source: string, lang?: 'ts' | 'python') => void) | undefined;
  var syncActiveScriptTabFromFileName: ((newFileName: string) => void) | undefined;
  var syncActiveScriptTabSource: ((src: string) => void) | undefined;
  var importNotebookFromJson: ((jsonText: string, fileName: string) => boolean) | undefined;
  var setViewMode: ((mode: 'script' | 'notebook') => void) | undefined;
  var syncGutterAndHighlight: (() => void) | undefined;
  var updateCursorPos: (() => void) | undefined;
  var breakpoints: Set<number> | undefined;
  var __VFS__: VfsClientApi | undefined;
  var vfs: VfsClientApi | undefined;
  var __FS_SHIM__: FsModuleApi | undefined;

  interface Window {
    PlaygroundCM?: PlaygroundCMBridge;
    __cmView?: unknown;
    __CM_CURSOR_LINE?: number;
    __BOOT_DEFERRED?: boolean;
    onNotebookLangChanged?: (nextLang: 'ts' | 'python') => void;
    CURRENT_TS_META?: {
      interfaces: Map<string, InterfaceSchemaMeta>;
      varTypes: Map<string, string>;
    };
    StepAnim?: StepAnim;
  }
}

export {};
