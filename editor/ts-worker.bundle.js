(()=>{var I=Object.create;var T=Object.defineProperty;var S=Object.getOwnPropertyDescriptor;var k=Object.getOwnPropertyNames;var A=Object.getPrototypeOf,R=Object.prototype.hasOwnProperty;var p=(e,r)=>()=>{try{return r||e((r={exports:{}}).exports,r),r.exports}catch(t){throw r=0,t}};var E=(e,r,t,s)=>{if(r&&typeof r=="object"||typeof r=="function")for(let o of k(r))!R.call(e,o)&&o!==t&&T(e,o,{get:()=>r[o],enumerable:!(s=S(r,o))||s.enumerable});return e};var V=(e,r,t)=>(t=e!=null?I(A(e)):{},E(r||!e||!e.__esModule?T(t,"default",{value:e,enumerable:!0}):t,e));var g=p((M,P)=>{P.exports={name:"typescript",version:"7.0.2",license:"Apache-2.0",author:"Microsoft Corp.",homepage:"https://www.typescriptlang.org/",description:"TypeScript is a language for application scale JavaScript development",keywords:["TypeScript","Microsoft","compiler","language","javascript"],bugs:{url:"https://github.com/microsoft/TypeScript/issues"},repository:{type:"git",url:"https://github.com/microsoft/TypeScript.git"},type:"module",preferUnplugged:!0,engines:{node:">=16.20.0"},files:["bin","lib","dist","vendor","NOTICE.txt"],bin:{tsc:"./bin/tsc"},exports:{"./package.json":"./package.json",".":"./lib/version.cjs","./unstable/sync":"./dist/api/sync/api.js","./unstable/async":"./dist/api/async/api.js","./unstable/fs":"./dist/api/fs.js","./unstable/proto":"./dist/api/proto.js","./unstable/ast":"./dist/ast/index.js","./unstable/ast/is":"./dist/ast/is.js","./unstable/ast/factory":"./dist/ast/factory.generated.js","./unstable/ast/utils":"./dist/ast/utils.js","./unstable/ast/scanner":"./dist/ast/scanner.js","./unstable/ast/visitor":"./dist/ast/visitor.js","./unstable/ast/clone":"./dist/ast/clone.js"},imports:{"#getExePath":"./lib/getExePath.js","#enums/*":{types:"./dist/enums/*.enum.d.ts",default:"./dist/enums/*.js"},"#vscode-jsonrpc/node":"./vendor/vscode-jsonrpc/lib/node/main.js"},gitHead:"2bd066d87f5bafd315be9f40889d0a60b9e58e0b",publishConfig:{access:"public",tag:"latest"},optionalDependencies:{"@typescript/typescript-win32-x64":"7.0.2","@typescript/typescript-win32-arm64":"7.0.2","@typescript/typescript-linux-x64":"7.0.2","@typescript/typescript-linux-arm":"7.0.2","@typescript/typescript-linux-arm64":"7.0.2","@typescript/typescript-darwin-x64":"7.0.2","@typescript/typescript-darwin-arm64":"7.0.2","@typescript/typescript-aix-ppc64":"7.0.2","@typescript/typescript-freebsd-arm64":"7.0.2","@typescript/typescript-freebsd-x64":"7.0.2","@typescript/typescript-linux-loong64":"7.0.2","@typescript/typescript-linux-mips64el":"7.0.2","@typescript/typescript-linux-ppc64":"7.0.2","@typescript/typescript-linux-riscv64":"7.0.2","@typescript/typescript-linux-s390x":"7.0.2","@typescript/typescript-netbsd-arm64":"7.0.2","@typescript/typescript-netbsd-x64":"7.0.2","@typescript/typescript-openbsd-arm64":"7.0.2","@typescript/typescript-openbsd-x64":"7.0.2","@typescript/typescript-sunos-x64":"7.0.2"}}});var f=p(d=>{var{version:w}=g();d.version=w;d.versionMajorMinor="7.0"});var y=V(f(),1),a=y.default||y,v=`
interface Boolean {}
interface Function {
  apply(this: Function, thisArg: any, argArray?: any): any;
  call(this: Function, thisArg: any, ...argArray: any[]): any;
  bind(this: Function, thisArg: any, ...argArray: any[]): any;
  readonly length: number;
}
interface CallableFunction extends Function {}
interface NewableFunction extends Function {}
interface IArguments {
  [index: number]: any;
  readonly length: number;
}
interface Number {
  toString(radix?: number): string;
  toFixed(fractionDigits?: number): string;
  valueOf(): number;
}
interface Object {
  constructor: Function;
  toString(): string;
  valueOf(): Object;
  hasOwnProperty(v: PropertyKey): boolean;
}
interface RegExp {
  exec(string: string): RegExpExecArray | null;
  test(string: string): boolean;
  readonly source: string;
  readonly flags: string;
  lastIndex: number;
}
interface RegExpMatchArray extends Array<string> {
  index?: number;
  input?: string;
}
interface RegExpExecArray extends Array<string> {
  index: number;
  input: string;
}
interface String {
  readonly length: number;
  charAt(pos: number): string;
  charCodeAt(index: number): number;
  codePointAt(pos: number): number | undefined;
  concat(...strings: string[]): string;
  indexOf(searchString: string, position?: number): number;
  lastIndexOf(searchString: string, position?: number): number;
  slice(start?: number, end?: number): string;
  substring(start: number, end?: number): string;
  substr(from: number, length?: number): string;
  toLowerCase(): string;
  toUpperCase(): string;
  trim(): string;
  trimStart(): string;
  trimEnd(): string;
  padStart(maxLength: number, fillString?: string): string;
  padEnd(maxLength: number, fillString?: string): string;
  repeat(count: number): string;
  replace(searchValue: string | RegExp, replaceValue: string | ((substring: string, ...args: any[]) => string)): string;
  replaceAll(searchValue: string | RegExp, replaceValue: string): string;
  split(separator: string | RegExp, limit?: number): string[];
  includes(searchString: string, position?: number): boolean;
  startsWith(searchString: string, position?: number): boolean;
  endsWith(searchString: string, endPosition?: number): boolean;
  match(regexp: string | RegExp): RegExpMatchArray | null;
  search(regexp: string | RegExp): number;
  localeCompare(that: string): number;
  at(index: number): string | undefined;
  [index: number]: string;
  [Symbol.iterator](): IterableIterator<string>;
}
interface ArrayBuffer {}
interface DataView {}
interface Int8Array {}
interface Uint8Array {}
interface Uint8ClampedArray {}
interface Int16Array {}
interface Uint16Array {}
interface Int32Array {}
interface Uint32Array {}
interface Float32Array {}
interface Float64Array {}
interface BigInt64Array {}
interface BigUint64Array {}
interface Symbol {
  readonly description: string | undefined;
  toString(): string;
  valueOf(): symbol;
}
interface SymbolConstructor {
  readonly iterator: unique symbol;
  readonly asyncIterator: unique symbol;
  readonly hasInstance: unique symbol;
  readonly toStringTag: unique symbol;
  (description?: string | number): symbol;
  for(key: string): symbol;
}
declare var Symbol: SymbolConstructor;

type PropertyKey = string | number | symbol;

interface IteratorYieldResult<TYield> {
  done?: false;
  value: TYield;
}
interface IteratorReturnResult<TReturn> {
  done: true;
  value: TReturn;
}
type IteratorResult<T, TReturn = any> = IteratorYieldResult<T> | IteratorReturnResult<TReturn>;
interface Iterator<T, TReturn = any, TNext = undefined> {
  next(...args: [] | [TNext]): IteratorResult<T, TReturn>;
  return?(value?: TReturn): IteratorResult<T, TReturn>;
  throw?(e?: any): IteratorResult<T, TReturn>;
}
interface Iterable<T> {
  [Symbol.iterator](): Iterator<T>;
}
interface IterableIterator<T> extends Iterator<T> {
  [Symbol.iterator](): IterableIterator<T>;
}

interface ReadonlyArray<T> {
  readonly length: number;
  toString(): string;
  concat(...items: ConcatArray<T>[]): T[];
  concat(...items: (T | ConcatArray<T>)[]): T[];
  join(separator?: string): string;
  slice(start?: number, end?: number): T[];
  indexOf(searchElement: T, fromIndex?: number): number;
  lastIndexOf(searchElement: T, fromIndex?: number): number;
  every<S extends T>(predicate: (value: T, index: number, array: readonly T[]) => value is S, thisArg?: any): this is readonly S[];
  every(predicate: (value: T, index: number, array: readonly T[]) => unknown, thisArg?: any): boolean;
  some(predicate: (value: T, index: number, array: readonly T[]) => unknown, thisArg?: any): boolean;
  forEach(callbackfn: (value: T, index: number, array: readonly T[]) => void, thisArg?: any): void;
  map<U>(callbackfn: (value: T, index: number, array: readonly T[]) => U, thisArg?: any): U[];
  filter<S extends T>(predicate: (value: T, index: number, array: readonly T[]) => value is S, thisArg?: any): S[];
  filter(predicate: (value: T, index: number, array: readonly T[]) => unknown, thisArg?: any): T[];
  reduce(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: readonly T[]) => T): T;
  reduce(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: readonly T[]) => T, initialValue: T): T;
  reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: readonly T[]) => U, initialValue: U): U;
  reduceRight(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: readonly T[]) => T): T;
  reduceRight(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: readonly T[]) => T, initialValue: T): T;
  reduceRight<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: readonly T[]) => U, initialValue: U): U;
  find<S extends T>(predicate: (value: T, index: number, obj: readonly T[]) => value is S, thisArg?: any): S | undefined;
  find(predicate: (value: T, index: number, obj: readonly T[]) => unknown, thisArg?: any): T | undefined;
  findIndex(predicate: (value: T, index: number, obj: readonly T[]) => unknown, thisArg?: any): number;
  entries(): IterableIterator<[number, T]>;
  keys(): IterableIterator<number>;
  values(): IterableIterator<T>;
  includes(searchElement: T, fromIndex?: number): boolean;
  flatMap<U, This = undefined>(callback: (this: This, value: T, index: number, array: T[]) => U | ReadonlyArray<U>, thisArg?: This): U[];
  flat<A, D extends number = 1>(this: A, depth?: D): any[];
  at(index: number): T | undefined;
  [Symbol.iterator](): IterableIterator<T>;
  readonly [n: number]: T;
}

interface ConcatArray<T> {
  readonly length: number;
  readonly [n: number]: T;
  join(separator?: string): string;
  slice(start?: number, end?: number): T[];
}

interface Array<T> {
  length: number;
  toString(): string;
  push(...items: T[]): number;
  pop(): T | undefined;
  concat(...items: ConcatArray<T>[]): T[];
  concat(...items: (T | ConcatArray<T>)[]): T[];
  join(separator?: string): string;
  reverse(): T[];
  shift(): T | undefined;
  slice(start?: number, end?: number): T[];
  sort(compareFn?: (a: T, b: T) => number): this;
  splice(start: number, deleteCount?: number): T[];
  splice(start: number, deleteCount: number, ...items: T[]): T[];
  unshift(...items: T[]): number;
  indexOf(searchElement: T, fromIndex?: number): number;
  lastIndexOf(searchElement: T, fromIndex?: number): number;
  every<S extends T>(predicate: (value: T, index: number, array: T[]) => value is S, thisArg?: any): this is S[];
  every(predicate: (value: T, index: number, array: T[]) => unknown, thisArg?: any): boolean;
  some(predicate: (value: T, index: number, array: T[]) => unknown, thisArg?: any): boolean;
  forEach(callbackfn: (value: T, index: number, array: T[]) => void, thisArg?: any): void;
  map<U>(callbackfn: (value: T, index: number, array: T[]) => U, thisArg?: any): U[];
  filter<S extends T>(predicate: (value: T, index: number, array: T[]) => value is S, thisArg?: any): S[];
  filter(predicate: (value: T, index: number, array: T[]) => unknown, thisArg?: any): T[];
  reduce(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: T[]) => T): T;
  reduce(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: T[]) => T, initialValue: T): T;
  reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U;
  reduceRight(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: T[]) => T): T;
  reduceRight(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: T[]) => T, initialValue: T): T;
  reduceRight<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U;
  find<S extends T>(predicate: (value: T, index: number, obj: T[]) => value is S, thisArg?: any): S | undefined;
  find(predicate: (value: T, index: number, obj: T[]) => unknown, thisArg?: any): T | undefined;
  findIndex(predicate: (value: T, index: number, obj: T[]) => unknown, thisArg?: any): number;
  fill(value: T, start?: number, end?: number): this;
  copyWithin(target: number, start: number, end?: number): this;
  entries(): IterableIterator<[number, T]>;
  keys(): IterableIterator<number>;
  values(): IterableIterator<T>;
  includes(searchElement: T, fromIndex?: number): boolean;
  flatMap<U, This = undefined>(callback: (this: This, value: T, index: number, array: T[]) => U | ReadonlyArray<U>, thisArg?: This): U[];
  flat<A, D extends number = 1>(this: A, depth?: D): any[];
  at(index: number): T | undefined;
  [Symbol.iterator](): IterableIterator<T>;
  [n: number]: T;
}

interface ArrayConstructor {
  new (arrayLength?: number): any[];
  new <T>(arrayLength: number): T[];
  new <T>(...items: T[]): T[];
  (arrayLength?: number): any[];
  <T>(arrayLength: number): T[];
  <T>(...items: T[]): T[];
  isArray(arg: any): arg is any[];
  from<T>(arrayLike: ArrayLike<T> | Iterable<T>): T[];
  from<T, U>(arrayLike: ArrayLike<T> | Iterable<T>, mapfn: (v: T, k: number) => U, thisArg?: any): U[];
  of<T>(...items: T[]): T[];
}
declare var Array: ArrayConstructor;

interface ArrayLike<T> {
  readonly length: number;
  readonly [n: number]: T;
}

interface Map<K, V> {
  clear(): void;
  delete(key: K): boolean;
  forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): void;
  get(key: K): V | undefined;
  has(key: K): boolean;
  set(key: K, value: V): this;
  readonly size: number;
  entries(): IterableIterator<[K, V]>;
  keys(): IterableIterator<K>;
  values(): IterableIterator<V>;
  [Symbol.iterator](): IterableIterator<[K, V]>;
}
interface MapConstructor {
  new (): Map<any, any>;
  new <K, V>(entries?: readonly (readonly [K, V])[] | null): Map<K, V>;
  new <K, V>(iterable?: Iterable<readonly [K, V]> | null): Map<K, V>;
}
declare var Map: MapConstructor;

interface Set<T> {
  add(value: T): this;
  clear(): void;
  delete(value: T): boolean;
  forEach(callbackfn: (value: T, value2: T, set: Set<T>) => void, thisArg?: any): void;
  has(value: T): boolean;
  readonly size: number;
  entries(): IterableIterator<[T, T]>;
  keys(): IterableIterator<T>;
  values(): IterableIterator<T>;
  [Symbol.iterator](): IterableIterator<T>;
}
interface SetConstructor {
  new <T = any>(values?: readonly T[] | null): Set<T>;
  new <T = any>(iterable?: Iterable<T> | null): Set<T>;
}
declare var Set: SetConstructor;

interface WeakMap<K extends object, V> {
  delete(key: K): boolean;
  get(key: K): V | undefined;
  has(key: K): boolean;
  set(key: K, value: V): this;
}
interface WeakMapConstructor {
  new <K extends object = object, V = any>(entries?: readonly [K, V][] | null): WeakMap<K, V>;
}
declare var WeakMap: WeakMapConstructor;

interface WeakSet<T extends object> {
  add(value: T): this;
  delete(value: T): boolean;
  has(value: T): boolean;
}
interface WeakSetConstructor {
  new <T extends object = object>(values?: readonly T[] | null): WeakSet<T>;
}
declare var WeakSet: WeakSetConstructor;

interface PromiseLike<T> {
  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ): PromiseLike<TResult1 | TResult2>;
}

interface Promise<T> {
  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ): Promise<TResult1 | TResult2>;
  catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null
  ): Promise<T | TResult>;
  finally(onfinally?: (() => void) | undefined | null): Promise<T>;
}
interface PromiseConstructor {
  new <T = any>(executor: (resolve: (value?: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void): Promise<T>;
  all<T extends readonly unknown[] | []>(values: T): Promise<{ -readonly [P in keyof T]: Awaited<T[P]> }>;
  race<T extends readonly unknown[] | []>(values: T): Promise<Awaited<T[number]>>;
  resolve(): Promise<void>;
  resolve<T>(value: T | PromiseLike<T>): Promise<Awaited<T>>;
  reject<T = never>(reason?: any): Promise<T>;
}
declare var Promise: PromiseConstructor;

// Built-in TypeScript Utility Types
type Partial<T> = { [P in keyof T]?: T[P] };
type Required<T> = { [P in keyof T]-?: T[P] };
type Readonly<T> = { readonly [P in keyof T]: T[P] };
type Pick<T, K extends keyof T> = { [P in K]: T[P] };
type Record<K extends keyof any, T> = { [P in K]: T };
type Exclude<T, U> = T extends U ? never : T;
type Extract<T, U> = T extends U ? T : never;
type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;
type NonNullable<T> = T & {};
type Parameters<T extends (...args: any) => any> = T extends (...args: infer P) => any ? P : never;
type ConstructorParameters<T extends abstract new (...args: any) => any> = T extends abstract new (...args: infer P) => any ? P : never;
type ReturnType<T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : any;
type InstanceType<T extends abstract new (...args: any) => any> = T extends abstract new (...args: any) => infer R ? R : any;
type Awaited<T> = T extends null | undefined ? T : T extends object & { then(onfulfilled: infer F, ...args: infer _): any } ? F extends ((value: infer V, ...args: infer _) => any) ? Awaited<V> : never : T;
type Uppercase<S extends string> = intrinsic;
type Lowercase<S extends string> = intrinsic;
type Capitalize<S extends string> = intrinsic;
type Uncapitalize<S extends string> = intrinsic;

interface Math {
  readonly E: number;
  readonly LN10: number;
  readonly LN2: number;
  readonly LOG2E: number;
  readonly LOG10E: number;
  readonly PI: number;
  readonly SQRT1_2: number;
  readonly SQRT2: number;
  abs(x: number): number;
  acos(x: number): number;
  asin(x: number): number;
  atan(x: number): number;
  atan2(y: number, x: number): number;
  ceil(x: number): number;
  cos(x: number): number;
  exp(x: number): number;
  floor(x: number): number;
  imul(x: number, y: number): number;
  log(x: number): number;
  log10(x: number): number;
  log2(x: number): number;
  max(...values: number[]): number;
  min(...values: number[]): number;
  pow(x: number, y: number): number;
  random(): number;
  round(x: number): number;
  sign(x: number): number;
  sin(x: number): number;
  sqrt(x: number): number;
  tan(x: number): number;
  trunc(x: number): number;
  clz32(x: number): number;
  hypot(...values: number[]): number;
}
declare var Math: Math;

interface NumberConstructor {
  new (value?: any): Number;
  (value?: any): number;
  readonly MAX_VALUE: number;
  readonly MIN_VALUE: number;
  readonly NaN: number;
  readonly NEGATIVE_INFINITY: number;
  readonly POSITIVE_INFINITY: number;
  readonly MAX_SAFE_INTEGER: number;
  readonly MIN_SAFE_INTEGER: number;
  readonly EPSILON: number;
  isFinite(number: unknown): boolean;
  isInteger(number: unknown): boolean;
  isNaN(number: unknown): boolean;
  isSafeInteger(number: unknown): boolean;
  parseFloat(string: string): number;
  parseInt(string: string, radix?: number): number;
}
declare var Number: NumberConstructor;

interface StringConstructor {
  new (value?: any): String;
  (value?: any): string;
  fromCharCode(...codes: number[]): string;
  fromCodePoint(...codePoints: number[]): string;
}
declare var String: StringConstructor;

interface BooleanConstructor {
  new (value?: any): Boolean;
  <T>(value?: T): boolean;
}
declare var Boolean: BooleanConstructor;

interface ObjectConstructor {
  new (value?: any): Object;
  (): any;
  (value: any): any;
  keys(o: object): string[];
  values<T>(o: { [s: string]: T } | ArrayLike<T>): T[];
  values(o: {}): any[];
  entries<T>(o: { [s: string]: T } | ArrayLike<T>): [string, T][];
  entries(o: {}): [string, any][];
  assign<T extends {}, U>(target: T, source: U): T & U;
  assign<T extends {}, U, V>(target: T, source1: U, source2: V): T & U & V;
  assign(target: object, ...sources: any[]): any;
  fromEntries<T = any>(entries: Iterable<readonly [PropertyKey, T]>): { [k: string]: T };
  freeze<T>(o: T): Readonly<T>;
  create(o: object | null): any;
  is(value1: any, value2: any): boolean;
  hasOwn(o: object, v: PropertyKey): boolean;
}
declare var Object: ObjectConstructor;

interface Error {
  name: string;
  message: string;
  stack?: string;
}
interface ErrorConstructor {
  new (message?: string): Error;
  (message?: string): Error;
}
declare var Error: ErrorConstructor;
declare var TypeError: ErrorConstructor;
declare var RangeError: ErrorConstructor;
declare var SyntaxError: ErrorConstructor;

interface JSON {
  parse(text: string, reviver?: (this: any, key: string, value: any) => any): any;
  stringify(value: any, replacer?: (this: any, key: string, value: any) => any, space?: string | number): string;
}
declare var JSON: JSON;

interface Console {
  log(...data: any[]): void;
  warn(...data: any[]): void;
  error(...data: any[]): void;
  info(...data: any[]): void;
}
declare var console: Console;

declare var NaN: number;
declare var Infinity: number;
declare function parseInt(string: string, radix?: number): number;
declare function parseFloat(string: string): number;
declare function isNaN(number: number): boolean;
declare function isFinite(number: number): boolean;
declare function BigInt(value: number | string | bigint | boolean): bigint;
declare function setTimeout(handler: (...args: any[]) => void, timeout?: number, ...args: any[]): number;
declare function clearTimeout(id?: number): void;
declare function setInterval(handler: (...args: any[]) => void, timeout?: number, ...args: any[]): number;
declare function clearInterval(id?: number): void;
declare function queueMicrotask(callback: () => void): void;
declare function sleep<T = void>(ms?: number, value?: T): Promise<T>;
declare function checkpoint(...args: any[]): void;
declare function \u65AD\u70B9(...args: any[]): void;

// Algorithm Playground Predeclared Helpers (conditional if user hasn't declared them)
`,l="/lib.es.d.ts",u="/playground.ts",F=a.createSourceFile(l,v,a.ScriptTarget.ES2022,!0);function N(e){let r="";return/\b(?:class|interface|type)\s+ListNode\b/.test(e)||(r+=`
declare class ListNode {
  val: number;
  next: ListNode | null;
  constructor(val?: number, next?: ListNode | null);
}
`),/\b(?:class|interface|type)\s+TreeNode\b/.test(e)||(r+=`
declare class TreeNode {
  val: number;
  left: TreeNode | null;
  right: TreeNode | null;
  constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null);
}
`),/\b(?:class|interface|type)\s+_Node\b/.test(e)||(r+=`
declare class _Node {
  val: number;
  next: _Node | null;
  random: _Node | null;
  neighbors: _Node[];
  children: _Node[];
  left: _Node | null;
  right: _Node | null;
  constructor(val?: number, ...rest: any[]);
}
`),r}var U={target:a.ScriptTarget.ES2022,module:a.ModuleKind.ESNext,strict:!1,noImplicitAny:!1,strictNullChecks:!1,noEmit:!0,skipLibCheck:!0,noLib:!1};function C(e){let r=v+N(e),t=a.createSourceFile(l,r,a.ScriptTarget.ES2022,!0),s=a.createSourceFile(u,e,a.ScriptTarget.ES2022,!0),o={getSourceFile:n=>{if(n===u)return s;if(n===l)return t},writeFile:()=>{},getDefaultLibFileName:()=>l,useCaseSensitiveFileNames:()=>!0,getCanonicalFileName:n=>n,getCurrentDirectory:()=>"/",getNewLine:()=>`
`,fileExists:n=>n===u||n===l,readFile:n=>{if(n===u)return e;if(n===l)return r}},i=a.createProgram([u],U,o),c=[...i.getSyntacticDiagnostics(s),...i.getSemanticDiagnostics(s)],b=[];for(let n of c){if(!n.file||n.file.fileName!==u)continue;let x=typeof n.start=="number"?n.start:0,m=s.getLineAndCharacterOfPosition(x),h=a.flattenDiagnosticMessageText(n.messageText,`
`);b.push({line:m.line+1,col:m.character+1,code:"TS"+n.code,message:h})}return b}function j(e){return a.transpileModule(e,{compilerOptions:{target:a.ScriptTarget.ES2022,module:a.ModuleKind.None,removeComments:!1}}).outputText}typeof self<"u"&&typeof self.addEventListener=="function"&&self.addEventListener("message",e=>{let r=e&&e.data?e.data:{},{id:t,type:s,src:o}=r;try{if(s==="check"){let i=String(o||""),c=C(i);self.postMessage({id:t,type:"checkResult",src:i,diagnostics:c,diags:c})}else if(s==="transpile"){let i=j(String(o||""));self.postMessage({id:t,type:"transpileResult",js:i})}}catch(i){self.postMessage({id:t,type:"error",error:i&&i.message?i.message:String(i)})}});})();
