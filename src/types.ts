/* ================================================================
   Core data structures & interfaces (src/types.ts)
   ================================================================ */

export interface Diag {
  line: number;
  col?: number;
  endCol?: number;
  msg?: string;
  message?: string;
  code?: number | string;
  severity?: 'error' | 'warning';
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
  varTypes: Map<string, string> | Record<string, string>;
  interfaces: Map<string, InterfaceSchemaMeta> | Record<string, InterfaceSchemaMeta>;
}

export interface HeapObj {
  id: string;
  type: string;
  label?: string;
  data?: any;
}

export interface Frame {
  id?: number;
  fn?: string;
  name?: string;
  label?: string;
  line: number;
  lastLine?: number;
  vars?: Record<string, any>;
  v?: Record<string, any>;
  ds?: Record<string, any>;
  [key: string]: any;
}

export interface EventLoopTaskItem {
  id: number | string;
  label: string;
  delay?: number;
  state?: string;
  status?: string;
  line?: number;
  [key: string]: any;
}

export interface EventLoopSnapshot {
  phase: string;
  currentTask?: string | null;
  activeTask?: string | null;
  activeTaskLabel?: string | null;
  webApis?: EventLoopTaskItem[];
  microtasks: EventLoopTaskItem[];
  macrotasks: EventLoopTaskItem[];
  coroutines?: any[];
  promises?: any[];
  settledPromises?: Array<{ id: number; state: string; value: any; label?: string }>;
  ticks?: number;
  now?: number;
  virtualTime?: number;
  [key: string]: any;
}

export interface StepAnim {
  var?: string;
  type?: string;
  idx?: number;
  key?: string;
  r?: number;
  c?: number;
  from?: any;
  to?: any;
  val?: any;
  lhs?: string;
  rhs?: string;
  op?: string;
  lhsVal?: string;
  rhsVal?: string;
  result?: any;
  fn?: string;
  args?: string[];
  argVals?: string[];
  message?: string;
  [key: string]: any;
}

export interface StepSnapshot {
  line: number;
  note: string;
  rawNote?: string;
  vars?: Record<string, any>;
  v?: Record<string, any>;
  ds?: Record<string, any>;
  callStack: Frame[];
  eventLoop?: EventLoopSnapshot | null;
  anim?: StepAnim | null;
  ckpt?: boolean;
  isCheckpoint?: boolean;
  ckptArgs?: any[];
  checkpointVals?: any[];
  crashed?: boolean;
  error?: string | null;
  errorMsg?: string;
  isFinalReturn?: boolean;
  returnValue?: any;
  l?: number;
  r?: number;
  tsTypes?: Record<string, string>;
  tsInterfaces?: Record<string, InterfaceSchemaMeta>;
  [key: string]: any;
}

export interface TraceData {
  title: string;
  code: string[];
  steps: StepSnapshot[];
  returnValue?: any;
  tsMeta?: TsMeta;
}

export interface DebugSession {
  active: boolean;
  finished: boolean;
  crashed: boolean;
  error: any;
  errorLine: number;
  returnValue: any;
  compiledFn: Function | null;
  originalLines: string[];
  callExpr: string;
  hasAsync?: boolean;
  tsMeta?: TsMeta;
  rawStepCount?: number;
  [key: string]: any;
}

export interface LangBuffer {
  code: string;
  fileName: string;
  sampleKey?: string;
}
