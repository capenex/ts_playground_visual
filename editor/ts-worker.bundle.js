"use strict";(()=>{var A=Object.create;var g=Object.defineProperty;var P=Object.getOwnPropertyDescriptor;var R=Object.getOwnPropertyNames;var E=Object.getPrototypeOf,F=Object.prototype.hasOwnProperty;var x=(e,n)=>()=>{try{return n||e((n={exports:{}}).exports,n),n.exports}catch(a){throw n=0,a}};var C=(e,n,a,i)=>{if(n&&typeof n=="object"||typeof n=="function")for(let o of R(n))!F.call(e,o)&&o!==a&&g(e,o,{get:()=>n[o],enumerable:!(i=P(n,o))||i.enumerable});return e};var w=(e,n,a)=>(a=e!=null?A(E(e)):{},C(n||!e||!e.__esModule?g(a,"default",{value:e,enumerable:!0}):a,e));var v=x((W,N)=>{N.exports={name:"typescript",version:"7.0.2",license:"Apache-2.0",author:"Microsoft Corp.",homepage:"https://www.typescriptlang.org/",description:"TypeScript is a language for application scale JavaScript development",keywords:["TypeScript","Microsoft","compiler","language","javascript"],bugs:{url:"https://github.com/microsoft/TypeScript/issues"},repository:{type:"git",url:"https://github.com/microsoft/TypeScript.git"},type:"module",preferUnplugged:!0,engines:{node:">=16.20.0"},files:["bin","lib","dist","vendor","NOTICE.txt"],bin:{tsc:"./bin/tsc"},exports:{"./package.json":"./package.json",".":"./lib/version.cjs","./unstable/sync":"./dist/api/sync/api.js","./unstable/async":"./dist/api/async/api.js","./unstable/fs":"./dist/api/fs.js","./unstable/proto":"./dist/api/proto.js","./unstable/ast":"./dist/ast/index.js","./unstable/ast/is":"./dist/ast/is.js","./unstable/ast/factory":"./dist/ast/factory.generated.js","./unstable/ast/utils":"./dist/ast/utils.js","./unstable/ast/scanner":"./dist/ast/scanner.js","./unstable/ast/visitor":"./dist/ast/visitor.js","./unstable/ast/clone":"./dist/ast/clone.js"},imports:{"#getExePath":"./lib/getExePath.js","#enums/*":{types:"./dist/enums/*.enum.d.ts",default:"./dist/enums/*.js"},"#vscode-jsonrpc/node":"./vendor/vscode-jsonrpc/lib/node/main.js"},gitHead:"2bd066d87f5bafd315be9f40889d0a60b9e58e0b",publishConfig:{access:"public",tag:"latest"},optionalDependencies:{"@typescript/typescript-win32-x64":"7.0.2","@typescript/typescript-win32-arm64":"7.0.2","@typescript/typescript-linux-x64":"7.0.2","@typescript/typescript-linux-arm":"7.0.2","@typescript/typescript-linux-arm64":"7.0.2","@typescript/typescript-darwin-x64":"7.0.2","@typescript/typescript-darwin-arm64":"7.0.2","@typescript/typescript-aix-ppc64":"7.0.2","@typescript/typescript-freebsd-arm64":"7.0.2","@typescript/typescript-freebsd-x64":"7.0.2","@typescript/typescript-linux-loong64":"7.0.2","@typescript/typescript-linux-mips64el":"7.0.2","@typescript/typescript-linux-ppc64":"7.0.2","@typescript/typescript-linux-riscv64":"7.0.2","@typescript/typescript-linux-s390x":"7.0.2","@typescript/typescript-netbsd-arm64":"7.0.2","@typescript/typescript-netbsd-x64":"7.0.2","@typescript/typescript-openbsd-arm64":"7.0.2","@typescript/typescript-openbsd-x64":"7.0.2","@typescript/typescript-sunos-x64":"7.0.2"}}});var h=x(b=>{var{version:V}=v();b.version=V;b.versionMajorMinor="7.0"});var T=w(h(),1),r=T.default||T,S=`
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
declare function checkpoint(cond?: boolean, msg?: string): void;
declare function checkpoint(label?: string, ...values: any[]): void;
declare function checkpoint(...values: any[]): void;
declare function \u65AD\u70B9(cond?: boolean, msg?: string): void;
declare function \u65AD\u70B9(label?: string, ...values: any[]): void;
declare function \u65AD\u70B9(...values: any[]): void;

interface FsStats {
  size: number;
  mtime: number;
  isFile(): boolean;
  isDirectory(): boolean;
}

interface FsPromisesApi {
  readFile(path: string, encoding?: string): Promise<string>;
  writeFile(path: string, data: string, encoding?: string): Promise<void>;
  appendFile(path: string, data: string, encoding?: string): Promise<void>;
  readdir(path?: string): Promise<string[]>;
  mkdir(path: string, options?: { recursive?: boolean } | boolean): Promise<void>;
  unlink(path: string): Promise<void>;
  rm(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void>;
  stat(path: string): Promise<FsStats>;
  exists(path: string): Promise<boolean>;
  access(path: string, mode?: number): Promise<void>;
  copyFile(src: string, dest: string): Promise<void>;
  rename(oldPath: string, newPath: string): Promise<void>;
}

declare module 'fs' {
  export const promises: FsPromisesApi;
  export function readFileSync(path: string, encoding?: string): string;
  export function writeFileSync(path: string, data: string, encoding?: string): void;
  export function appendFileSync(path: string, data: string, encoding?: string): void;
  export function existsSync(path: string): boolean;
  export function readdirSync(path?: string): string[];
  export function mkdirSync(path: string, options?: { recursive?: boolean } | boolean): void;
  export function unlinkSync(path: string): void;
  export function rmSync(path: string, options?: { recursive?: boolean; force?: boolean }): void;
  export function statSync(path: string): FsStats;
  export function copyFileSync(src: string, dest: string): void;
  export function renameSync(oldPath: string, newPath: string): void;
  const fsDefault: {
    promises: FsPromisesApi;
    readFileSync: typeof readFileSync;
    writeFileSync: typeof writeFileSync;
    appendFileSync: typeof appendFileSync;
    existsSync: typeof existsSync;
    readdirSync: typeof readdirSync;
    mkdirSync: typeof mkdirSync;
    unlinkSync: typeof unlinkSync;
    rmSync: typeof rmSync;
    statSync: typeof statSync;
    copyFileSync: typeof copyFileSync;
    renameSync: typeof renameSync;
  };
  export default fsDefault;
}

declare module 'node:fs' {
  export * from 'fs';
  export { default } from 'fs';
}

declare module 'fs/promises' {
  export const readFile: FsPromisesApi['readFile'];
  export const writeFile: FsPromisesApi['writeFile'];
  export const appendFile: FsPromisesApi['appendFile'];
  export const readdir: FsPromisesApi['readdir'];
  export const mkdir: FsPromisesApi['mkdir'];
  export const unlink: FsPromisesApi['unlink'];
  export const rm: FsPromisesApi['rm'];
  export const stat: FsPromisesApi['stat'];
  export const exists: FsPromisesApi['exists'];
  export const access: FsPromisesApi['access'];
  export const copyFile: FsPromisesApi['copyFile'];
  export const rename: FsPromisesApi['rename'];
  const fsPromisesDefault: FsPromisesApi;
  export default fsPromisesDefault;
}

declare module 'node:fs/promises' {
  export * from 'fs/promises';
  export { default } from 'fs/promises';
}

// Algorithm Playground Predeclared Helpers (conditional if user hasn't declared them)
`,U=`
declare namespace JSX {
  type Element = any;
  interface IntrinsicElements {
    [elemName: string]: any;
  }
  interface ElementAttributesProperty {
    props: {};
  }
  interface ElementChildrenAttribute {
    children: {};
  }
}

declare namespace React {
  export type ReactNode = any;
  export type ReactElement<P = any, T = any> = any;
  export type CSSProperties = Record<string, any>;
  export type FC<P = {}> = (props: P & { children?: ReactNode }) => ReactElement | null;
  export type FunctionComponent<P = {}> = FC<P>;
  export type ComponentType<P = {}> = FC<P> | (new (props: P) => any);
  export type ComponentProps<T = any> = any;
  export type PropsWithChildren<P = {}> = P & { children?: ReactNode };
  export type SyntheticEvent<T = any> = any;
  export type MouseEvent<T = any> = any;
  export type ChangeEvent<T = any> = any;
  export type KeyboardEvent<T = any> = any;
  export type FocusEvent<T = any> = any;
  export type FormEvent<T = any> = any;
  export type MouseEventHandler<T = any> = (event: MouseEvent<T>) => void;
  export type ChangeEventHandler<T = any> = (event: ChangeEvent<T>) => void;
  export type FormEventHandler<T = any> = (event: FormEvent<T>) => void;
  export type RefObject<T> = { readonly current: T | null };
  export type MutableRefObject<T> = { current: T };
  export type Dispatch<A> = (value: A) => void;
  export type SetStateAction<S> = S | ((prevState: S) => S);

  export const Fragment: unique symbol;
  export const StrictMode: any;
  export const Suspense: any;

  export function useState<S>(initialState: S | (() => S)): [S, Dispatch<SetStateAction<S>>];
  export function useState<S = undefined>(): [S | undefined, Dispatch<SetStateAction<S | undefined>>];
  export function useEffect(effect: () => (void | (() => void)), deps?: readonly any[]): void;
  export function useLayoutEffect(effect: () => (void | (() => void)), deps?: readonly any[]): void;
  export function useMemo<T>(factory: () => T, deps: readonly any[] | undefined): T;
  export function useCallback<T extends Function>(callback: T, deps: readonly any[]): T;
  export function useRef<T>(initialValue: T): MutableRefObject<T>;
  export function useRef<T = undefined>(): MutableRefObject<T | undefined>;
  export function useContext<T>(context: any): T;
  export function useReducer<R extends (state: any, action: any) => any>(reducer: R, initialArg: any): [any, Dispatch<any>];
  export function useId(): string;
  export function useTransition(): [boolean, (callback: () => void) => void];
  export function useDeferredValue<T>(value: T): T;
  export function createContext<T>(defaultValue: T): any;
  export function createElement(type: any, props?: any, ...children: any[]): ReactElement;
  export function cloneElement(element: any, props?: any, ...children: any[]): ReactElement;
  export function forwardRef<T, P = {}>(render: (props: P, ref: any) => ReactNode): FC<P>;
  export function memo<P>(component: FC<P>): FC<P>;
  export function lazy<T>(factory: () => Promise<{ default: T }>): T;
}

declare module 'react' {
  export = React;
}

declare module 'react-dom' {
  export function render(element: any, container: any): void;
  export function createPortal(children: any, container: any): any;
  const reactDomDefault: { render: typeof render; createPortal: typeof createPortal };
  export default reactDomDefault;
}

declare module 'react-dom/client' {
  export interface Root {
    render(children: any): void;
    unmount(): void;
  }
  export function createRoot(container: any): Root;
}

declare module 'react/jsx-runtime' {
  export const Fragment: typeof React.Fragment;
  export function jsx(type: any, props: any, key?: any): any;
  export function jsxs(type: any, props: any, key?: any): any;
}

declare module '*.css' {
  const styles: Record<string, string>;
  export default styles;
}
`,u="/lib.es.d.ts",j="/playground.ts",L="/playground.tsx",y=!!(r&&typeof r.createSourceFile=="function"&&r.ScriptTarget&&r.ModuleKind&&r.JsxEmit),J=y?r.createSourceFile(u,S,r.ScriptTarget.ES2022,!0):null;function M(e){let n="";return/\b(?:class|interface|type)\s+ListNode\b/.test(e)||(n+=`
declare class ListNode {
  val: number;
  next: ListNode | null;
  constructor(val?: number, next?: ListNode | null);
}
`),/\b(?:class|interface|type)\s+TreeNode\b/.test(e)||(n+=`
declare class TreeNode {
  val: number;
  left: TreeNode | null;
  right: TreeNode | null;
  constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null);
}
`),/\b(?:class|interface|type)\s+_Node\b/.test(e)||(n+=`
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
`),n}var K=y?{target:r.ScriptTarget.ES2022,module:r.ModuleKind.ESNext,jsx:r.JsxEmit.React,esModuleInterop:!0,allowSyntheticDefaultImports:!0,strict:!1,noImplicitAny:!1,strictNullChecks:!1,strictFunctionTypes:!0,noImplicitReturns:!1,noUnusedLocals:!1,noUncheckedIndexedAccess:!1,noEmit:!0,skipLibCheck:!0,noLib:!1}:{};function O(e,n){if(!y)return{};let a={...K,jsx:n?r.JsxEmit.React:r.JsxEmit.None};return!e||typeof e!="object"?a:{...a,strict:!!e.strict,noImplicitAny:!!e.noImplicitAny,strictNullChecks:!!e.strictNullChecks,strictFunctionTypes:e.strictFunctionTypes!==void 0?!!e.strictFunctionTypes:!0,noImplicitReturns:!!e.noImplicitReturns,noUnusedLocals:!!e.noUnusedLocals,noUncheckedIndexedAccess:!!e.noUncheckedIndexedAccess}}function _(e,n,a=!1){if(!y)return[];let i=a?L:j,o=S+(a?U:"")+M(e),p=r.createSourceFile(u,o,r.ScriptTarget.ES2022,!0),l=r.createSourceFile(i,e,r.ScriptTarget.ES2022,!0),m={getSourceFile:t=>{if(t===i)return l;if(t===u)return p},writeFile:()=>{},getDefaultLibFileName:()=>u,useCaseSensitiveFileNames:()=>!0,getCanonicalFileName:t=>t,getCurrentDirectory:()=>"/",getNewLine:()=>`
`,fileExists:t=>t===i||t===u,readFile:t=>{if(t===i)return e;if(t===u)return o}},d=r.createProgram([i],O(n,a),m),s=[...d.getSyntacticDiagnostics(l),...d.getSemanticDiagnostics(l)],c=[];for(let t of s){if(!t.file||t.file.fileName!==i)continue;let I=typeof t.start=="number"?t.start:0,f=l.getLineAndCharacterOfPosition(I),k=r.flattenDiagnosticMessageText(t.messageText,`
`);c.push({line:f.line+1,col:f.character+1,code:"TS"+t.code,message:k})}return c}function D(e){return r.transpileModule(e,{compilerOptions:{target:r.ScriptTarget.ES2022,module:r.ModuleKind.None,removeComments:!1}}).outputText}typeof self<"u"&&typeof self.addEventListener=="function"&&self.addEventListener("message",e=>{let n=e&&e.data?e.data:{},{id:a,type:i,src:o,tsConfig:p,configKey:l,fileName:m,isTsx:d}=n;try{if(i==="check"){let s=String(o||""),c=!!d||/\.(?:tsx|jsx)$/i.test(String(m||"")),t=_(s,p,c);self.postMessage({id:a,type:"checkResult",src:s,configKey:l,isTsx:c,diagnostics:t,diags:t})}else if(i==="transpile"){let s=D(String(o||""));self.postMessage({id:a,type:"transpileResult",js:s})}}catch(s){self.postMessage({id:a,type:"error",error:s&&s.message?s.message:String(s)})}});})();
