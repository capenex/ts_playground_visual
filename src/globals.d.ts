/* ================================================================
   Ambient declarations for global bridge & WebCodecs APIs (src/globals.d.ts)
   ================================================================ */
import type {
  Diag,
  InterfaceSchemaMeta,
  StepAnim,
  StepSnapshot,
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
    language: 'ts';
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
  var openSampleScriptTab: ((title: string, source: string, lang?: 'ts') => void) | undefined;
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
    CURRENT_TS_META?: {
      interfaces: Map<string, InterfaceSchemaMeta>;
      varTypes: Map<string, string>;
    };
    StepAnim?: StepAnim;
  }

  interface Document {
    getElementById<T extends HTMLElement = HTMLElement>(elementId: string): T;
  }

  interface HTMLCanvasElement {
    captureStream?(frameRate?: number): MediaStream;
  }
}

export {};

