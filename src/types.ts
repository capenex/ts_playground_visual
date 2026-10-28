/* ================================================================
   Core data structures & interfaces (src/types.ts)
   ================================================================ */

export interface Diag {
  file?: string;
  line: number;
  col?: number;
  endCol?: number;
  msg?: string;
  message?: string;
  code?: number | string;
  severity?: 'error' | 'warning';
}

export interface ConsoleLogEntry {
  msg: string;
  cls?: string;
  line?: number;
}

export interface InterfaceFieldMeta {
  name?: string;
  k?: string;
  type?: string;
  declaredType?: string;
  optional: boolean;
  readonly?: boolean;
}

export interface InterfaceSchemaMeta {
  kind?: 'interface' | 'type' | 'class';
  name: string;
  line?: number;
  isClass?: boolean;
  extends?: string[];
  fields: InterfaceFieldMeta[];
}

export interface TsMeta {
  varTypes: Map<string, string>;
  interfaces: Map<string, InterfaceSchemaMeta>;
  fnTypes?: Map<string, string>;
}

export interface HeapObj {
  id: string;
  type: string;
  label?: string;
  data?: unknown;
}

export interface StepAnim {
  id?: number | string;
  file?: string;
  fn?: string;
  name?: string;
  label?: string;
  line?: number;
  lastLine?: number;
  isTop?: boolean;
  total?: number;
  idx?: number;
  var?: string;
  type?: string;
  key?: string;
  r?: number;
  c?: number;
  from?: string | number | null;
  to?: string | number | null;
  val?: unknown;
  value?: unknown;
  lhs?: string;
  rhs?: string;
  op?: string;
  lhsVal?: string;
  rhsVal?: string;
  result?: string | number | boolean | null;
  args?: string[];
  argVals?: string[];
  message?: string;
  kind?: string;
  items?: unknown[];
  entries?: Array<{ k: string | unknown; v: unknown }>;
  fields?: Array<{ k: string; v?: unknown; declaredType?: string; optional?: boolean }>;
  nodes?: Frame[];
  edges?: Array<[number | string, number | string] | Frame>;
  cells?: unknown[][];
  viewCells?: unknown[][];
  rowIndices?: number[];
  colIndices?: number[];
  totalRows?: number;
  totalCols?: number;
  totalNodes?: number;
  totalEdges?: number;
  baseIdx?: number;
  root?: number;
  hot?: unknown;
  mark?: [number, number] | number | null;
  win?: [number, number] | null;
  deps?: Array<[number, number]>;
  pointers?: Record<number, string[]>;
  windowed?: Array<{ gap?: boolean; count?: number; from?: number; to?: number; idx?: number; val?: unknown }> | null;
  interfaceName?: string;
  isClass?: boolean;
  isSchema?: boolean;
  instanceName?: string | null;
  phase?: string;
  now?: number;
  virtualTime?: number;
  activeTask?: string | null;
  activeTaskLabel?: string | null;
  coroutines?: Frame[];
  microtasks?: Frame[];
  macrotasks?: Frame[];
  promises?: Frame[];
  vars?: Record<string, unknown>;
  v?: Record<string, unknown>;
  ds?: Record<string, StepAnim>;
  snap?: (() => Record<string, unknown>) | Record<string, unknown> | null;
  snapFn?: (() => Record<string, unknown>) | null;
  self?: Record<string, unknown> | null;
  __raw?: unknown;
  __rawNodes?: object[];
  __rawVals?: unknown[];
  __nodeMap?: Map<object, number>;
  __extraFocal?: number[];
  sparse?: Map<number, unknown>;
  left?: Frame | number | null;
  right?: Frame | number | null;
  next?: Frame | null;
  x?: number;
  y?: number;
  status?: string;
  state?: string;
  awaitingExpr?: string | null;
  awaitExpr?: string | null;
  returnVal?: unknown;
  due?: number;
  delay?: number;
  reactions?: number;
  valStr?: string;
  [key: string]: unknown;
}

export type Frame = StepAnim;

export interface EventLoopTaskItem {
  id: number | string;
  label: string;
  delay?: number;
  due?: number;
  state?: string;
  status?: string;
  line?: number;
  [key: string]: unknown;
}

export interface EventLoopSnapshot {
  kind?: string;
  phase: string;
  currentTask?: string | null;
  activeTask?: string | null;
  activeTaskLabel?: string | null;
  webApis?: EventLoopTaskItem[];
  microtasks: EventLoopTaskItem[];
  macrotasks: EventLoopTaskItem[];
  coroutines?: Frame[];
  promises?: Frame[];
  settledPromises?: Array<{ id: number; state: string; value: unknown; label?: string }>;
  ticks?: number;
  now?: number;
  virtualTime?: number;
  [key: string]: unknown;
}

export interface StepSnapshot {
  file?: string;
  line: number;
  note: string;
  rawNote?: string;
  vars?: Record<string, unknown>;
  v: Record<string, unknown>;
  vRaw?: Record<string, unknown>;
  ds: Record<string, StepAnim>;
  callStack: Frame[];
  eventLoop?: EventLoopSnapshot | null;
  anim?: StepAnim | null;
  ckpt?: boolean;
  isCheckpoint?: boolean;
  ckptArgs?: unknown[];
  checkpointVals?: string[] | null;
  crashed?: boolean;
  error?: string | null;
  errorMsg?: string;
  isFinalReturn?: boolean;
  returnValue?: unknown;
  l?: number;
  r?: number;
  tsTypes?: Record<string, string>;
  tsInterfaces?: Record<string, InterfaceSchemaMeta>;
}

export interface TraceData {
  title: string;
  entryFile?: string;
  code: string[];
  moduleSources?: Record<string, string[]>;
  steps: StepSnapshot[];
  returnValue?: unknown;
  tsMeta?: TsMeta;
}

export interface DebugSession {
  active: boolean;
  finished: boolean;
  crashed: boolean;
  error: string | Error | null;
  errorLine: number;
  errorFile?: string;
  returnValue: unknown;
  compiledFn: Function | null;
  entryFile?: string;
  originalLines: string[];
  moduleSources?: Record<string, string[]>;
  callExpr: string;
  hasAsync?: boolean;
  tsMeta?: TsMeta;
  rawStepCount?: number;
}

export interface LangBuffer {
  code: string;
  fileName: string;
  sampleKey?: string;
}

export interface NotebookCellOutput {
  logs: string[];
  returnValue?: string | null;
  error?: string | null;
  errorLine?: number | null;
  elapsedMs?: number;
}

export interface NotebookCell {
  id: string;
  type: 'code' | 'markdown';
  source: string;
  executionCount: number | null;
  status: 'idle' | 'running' | 'success' | 'error' | 'debugging';
  output: NotebookCellOutput | null;
  markdownRendered?: boolean;
}

export interface NotebookExecutedEntry {
  cellId: string;
  execCount: number;
  source: string;
}

export interface NotebookDocument {
  id: string;
  title: string;
  lang: 'ts';
  execCounter: number;
  activeCellId: string;
  debuggingCellId: string | null;
  cells: NotebookCell[];
  executedHistory: NotebookExecutedEntry[];
  lastGlobalVars: Record<string, unknown>;
  lastGlobalDs: Record<string, StepAnim>;
}
