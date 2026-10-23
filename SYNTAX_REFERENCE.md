# TypeScript Playground VISUAL · 支持的语法范围与可视化规范参考手册

本文档详细说明 **TypeScript Playground VISUAL**（模块化代码位于 `src/**/*.ts`）内置的四大核心引擎所支持的 TypeScript / JavaScript 语法范围与可视化规则：
1. **静态类型检查器与官方 TS Worker 桥接 (`src/compiler/type-checker.ts` + `editor/ts-worker.bundle.js`)**
2. **词法感知类型剥离与语法降级器 (`src/compiler/transpile.ts`)**
3. **语句级自动插桩、异步协程改写与虚拟事件循环 (`src/compiler/instrumenter.ts` + `src/runtime/event-loop.ts`)**
4. **数据结构分类器与可视化映射规范 (`src/viz/memory-graph.ts`)**

---

## 一、 静态类型检查器 (`typecheckTS` + TS Worker) 支持范围

系统默认开启严格静态类型检查（`STRICT_TS = true`）。在编辑代码、点击「▶ 运行」或「🐞 Debug 调试」时，同步检查器 `typecheckTS` 会立即执行双遍类型推导与校验，并在浏览器环境中协同官方 TypeScript Web Worker（`editor/ts-worker.bundle.js`）提供完整诊断。

### 1. 支持的类型系统特性
| 语法结构 | 支持写法示例 | 说明 |
|---|---|---|
| **原始类型与字面量类型** | `number`, `string`, `boolean`, `void`, `null`, `undefined`, `any`, `unknown`, `never`, `"ok"`, `200` | 支持字面量推导、模板字面量类型 `` `prefix-${string}` `` 匹配 |
| **数组与元组类型** | `number[]`, `ReadonlyArray<string>`, `[number, number][]`, `(number \| string)[]` | 严格区分同构联合数组 `string[] \| number[]` 与混合元素数组 `(number \| string)[]` |
| **联合类型与交叉类型** | `number \| string`, `A & B` | 支持联合类型可赋值性校验、交叉类型字段合并与三元/`if` 分支类型收窄 |
| **接口与类型别名** | `interface User<T> { ... }`、`type Nullable<T> = ...` | 支持单行/多行定义、泛型参数、`extends` 继承、`readonly` 与 `?` 可选属性 |
| **泛型函数与 `keyof` / `T[K]`** | `function getProp<T, K extends keyof T>(obj: T, key: K): T[K]` | 支持从实参推断泛型参数、校验 `extends keyof T` 约束并求值索引访问类型 `T[K]` |
| **条件类型与 `infer`** | `type Unwrap<T> = T extends Promise<infer U> ? Unwrap<U> : T` | 支持分布式条件类型、递归条件类型与数组/函数返回值/Promise/元组/模板字符串 `infer` 提取 |
| **映射类型 (Mapped Types)** | `type MyPartial<T> = { [K in keyof T]?: T[K] \| null }` | 支持单行与跨多行映射类型展开、修饰符 `?` / `-?` / `readonly` |
| **内置工具类型 (Utility Types)** | `Partial<T>`, `Required<T>`, `Readonly<T>`, `Pick<T, K>`, `Omit<T, K>`, `Record<K, V>`, `ReturnType<F>`, `Parameters<F>`, `Awaited<T>` | 开箱即用支持常用 TypeScript 标准工具类型求值 |
| **泛型类与面向对象** | `class Box<T> { constructor(private v: T) {} get(): T { return this.v; } }` | 支持泛型类实例化类型替换、构造器参数属性、`abstract class`、方法内 `this` 属性检查 |
| **Promise 与异步函数** | `async function f(): Promise<number>`、`new Promise<string>((resolve) => ...)`、`new Promise(function(resolve) { ... })` | 自动推断 `resolve` 参数类型（箭头函数与 `function` 表达式均支持）及 `await` 解包类型 |
| **命名空间、重载与声明** | `namespace MathUtil { export function add... }`、函数重载签名、`declare const VERSION: string` | 完整识别命名空间导出成员、多签名重载匹配与环境声明 |

### 2. 支持的核心静态诊断错误码
| 错误码 | 触发场景说明 | 典型拦截示例 |
|---|---|---|
| **`TS2304`** | 引用或赋值了当前作用域与全局环境中均未声明的标识符 | `strs = ["a"]`（缺少 `let`/`const` 声明） |
| **`TS7006`** | 函数顶层参数缺少显式类型注解且无默认值（隐式 `any`） | `function add(a, b: number)`（回调与 Promise executor 参数可自动上下文推断） |
| **`TS2322`** | 变量初始化、重赋值、数组元素、对象属性或函数返回值类型不兼容 | `const arr: string[] \| number[] = [1, "a"];` |
| **`TS2741`** | 对象字面量缺少目标接口/映射类型的必填属性 | `const u: User = { name: "Alice" };` |
| **`TS2353`** | 对象字面量包含目标类型（含 `Pick`/`Omit`）不存在的未知属性 | `const p: Pick<Task, "id"> = { id: 1, title: "x" };` |
| **`TS2339`** | 访问接口、类实例或 `this` 上不存在的属性 | `this.unknownProp` 或 `user.email` |
| **`TS2345`** | 函数/方法/构造器调用实参类型不匹配，或违反泛型 `extends` 约束 | `getProp(u, "missingKey")` |
| **`TS2554`** | 函数调用传入的实参个数不符合必填/重载参数要求 | `add(1)` |
| **`TS2355`** | 声明了非 `void`/`any` 返回类型的函数缺少返回值 | `function test(n: number): number { let x = n; }` |
| **`TS2588`** | 对 `const` 常量执行重新赋值或自增自减 | `const k = 10; k = 20;` |
| **`TS2362` / `TS2365`** | 算术运算符操作数类型非法 | `"abc" - 1` |
| **`TS2367`** | 比较运算符左右两侧类型无交集 | `count === "10"` |
| **`TS2538`** | 数组或字符串下标索引使用了非数字类型 | `nums["0"]` |

---

## 二、 类型剥离与语法降级器 (`src/compiler/transpile.ts`)

静态检查通过后，编译器会将 TypeScript 源码无损转换为**严格等行号**的 JavaScript 代码：

1. **声明级擦除（保持 1:1 行号映射）**
   - 单行与多行 `interface`、`type`（含跨多行条件类型与映射类型）、`declare` 声明、无函数体的重载签名、`import` / `export type` 均替换为空行或等量换行符。
2. **TypeScript 运行时语法降级**
   - **枚举 (`transpileEnums`)**：数字枚举、字符串枚举与 `const enum` 编译为等行号 IIFE，支持正向与反向映射（`E[E["A"] = 0] = "A"`）。
   - **命名空间 (`transpileNamespaces`)**：`namespace N { export const x = 1; export function f() {} }` 编译为等行号闭包并自动挂载导出成员到对象 `N`。
   - **构造器参数属性 (`extractConstructorParamProps`)**：`constructor(private x: number, public y = 1)` 自动在构造器入口（或 `super(...)` 调用后）注入 `this.x = x; this.y = y;`。
   - **抽象方法与装饰器**：`abstract foo(): void;` 降级为 `foo() {}`；类/方法装饰器 `@dec` 安全剥离并保持换行数不变。
3. **O(n) 表达式消歧义保护**
   - 完整保留嵌套三元表达式 `a ? b : c`、可选链 `?.`、空值合并 `??`、非空断言 `!` 剥离（不误伤 `!==` 与前缀 `!`），且对多行未闭合 `<` 比较运算具备行级短路保护。

---

## 三、 自动插桩与确定性虚拟事件循环 (`src/compiler/instrumenter.ts` & `src/runtime/event-loop.ts`)

### 1. 自动追踪与 `async / await` 协程改写
- 自动收集 `const/let/var`、解构绑定、`for` 循环变量、函数/箭头函数/类方法参数，并在每行可执行语句与循环条件中注入 `__t(line, note, snapFn, this)`。
- 将 `async function` 自动转换为生成器协程 `__t.__async(function* () { ... })`，将 `await expr` 转换为 `yield __t.__await(expr, fid, line, label)`，从而支持在 `await` 处挂起当前栈帧、执行其他微任务/宏任务后再恢复该栈帧继续单步调试。

### 2. 确定性虚拟事件循环 (`createVirtualEventLoop`)
- 沙箱内置 `VirtualPromise`（支持 `new Promise`、`Promise.resolve`、`Promise.reject`、`Promise.all`、`Promise.race`、`.then`、`.catch`、`.finally`）、`queueMicrotask`、`setTimeout`、`clearTimeout` 与 `sleep(ms, val)`。
- 事件循环严格遵循：**同步代码 (`sync`) → 清空全部微任务队列 (`microtask`, FIFO) → 推进虚拟时钟至最早到期定时器并执行一个宏任务 (`macrotask`) → 再次清空微任务队列**，保证单步回放与正向步进 100% 确定可重现。

---

## 四、 数据结构自动识别与可视化规范 (`src/viz/memory-graph.ts`)

右侧 `WATCH` 面板根据变量的运行时结构、命名约定与 TypeScript 声明元数据，自动映射为对应的可视化组件：

| 序号 | 可视化类型 (`kind`) | 自动识别条件 | 特殊高亮与大数量级视窗特性 |
|---|---|---|---|
| 1 | **`array`（一维数组）** | 普通一维数组 `T[]` | 支持读写索引高亮（`hot`/`mark`）、`[l..r]` 滑动窗口条带、指针标签（`l,r,mid,i,j`）；超过 20 项时自动启用 1D 焦点切片（`build1DFocalSlice`） |
| 2 | **`string`（字符串）** | 非空字符串变量 | 字符格序列，支持下标高亮、`[l..r]` 窗口与长字符串焦点切片 |
| 3 | **`stack`（栈）** | 变量名匹配 `/stack\|stk/i` 的数组 | 垂直栈布局，顶部标注 `top`，超长栈自动保留真实栈顶并显示底部省略计数 `…+N` |
| 4 | **`queue`（队列）** | 变量名匹配 `/queue\|deque/i` 的数组 | 水平队列布局，标注队首 `front` 与队尾 `back` |
| 5 | **`heap`（二叉堆）** | 变量名匹配 `/heap\|pq/i` 的数组 | 标注堆顶 `top`，附带父子节点下标公式 `parent = (i - 1) >> 1 · left = 2i + 1` |
| 6 | **`uf`（并查集）** | 变量名匹配 `/^(parent\|uf\|fa\|dsu)\b/i` 的数组 | 自动识别根节点 `root`（`parent[i] === i`）与父节点指针 `p:x` |
| 7 | **`map`（哈希映射）** | `Map` 实例 | 渲染 `key → value` 键值对胶囊，高亮当前读写键（超长 Map 自动包含当前访问的热点键） |
| 8 | **`set`（集合）** | `Set` 实例 | 渲染集合元素胶囊，高亮当前读写元素 |
| 9 | **`grid`（二维矩阵）** | 二维数组 `T[][]`（如 DP 表 `dp`） | 琥珀色高亮当前写入格 `[r, c]`，蓝色高亮本行引用的依赖格；超过 `10×10` 时自动启用带行列坐标头的二维滑动视窗（`selectGridAxisIndices`） |
| 10 | **`list`（单链表）** | 含 `{ val, next }` 属性的链式对象 | 渲染 `val → val → null` 指针链，自动识别并标注指向节点的局部变量（如 `slow`、`fast`），超长链表自动启用焦点切片 |
| 11 | **`tree`（二叉树）** | 含 `{ val, left, right }` 属性的树形对象 | 递归计算坐标并绘制 SVG 二叉树，自动高亮局部变量引用的树节点 |
| 12 | **`graph`（图结构）** | 含 `{ nodes, edges }` 的对象 | 环形拓扑布局并绘制 SVG 节点与边连线 |
| 13 | **`interface` / `class`（对象与类实例）** | 普通对象、`interface` 实例、或 `class` 实例（含方法内的 `this`） | 展示 `interface` / `class` 标题徽章、属性名、声明类型与实时属性值，高亮当前行访问的字段 |
| 14 | **`eventloop`（异步事件循环）** | 使用了 `async/await`、`Promise`、`setTimeout`、`queueMicrotask` 或 `sleep` | 四栏实时展示：虚拟时钟与当前阶段、Async 协程挂起/运行状态、Microtask 队列（FIFO）、Macrotask 定时器队列与 Promise 状态表 |
