# 语法与数据结构可视化参考手册 (`SYNTAX_REFERENCE.md`)

本文档详细列出 **TypeScript Playground VISUAL** 的 **TypeScript 引擎** 所支持的语言特性、教育级静态类型检查范围，以及 **数据结构自动可视化识别规则**（由纯数据归一化模块 `src/viz/memory-normalizers.ts` 与渲染引擎 `src/viz/memory-graph.ts` 驱动）。

---

## 1. TypeScript 引擎支持矩阵

TypeScript 引擎由 **轻量级 TS 转译器 (`src/compiler/transpile.ts` + `transpile-helpers.ts`)**、**教育级静态类型检查器 (`src/compiler/type-checker.ts` + `tc-infer.ts` + `tc-eval.ts`)**、**AST 步进插桩器 (`src/compiler/instrumenter.ts`)** 与 **确定性虚拟事件循环 (`src/runtime/event-loop.ts` + `event-loop-env.ts`)** 四部分组成。

### 1.1 支持并可视化追踪的语法特性

| 类别 | 支持语法与特性 | 可视化表现 |
| :--- | :--- | :--- |
| **变量与常量** | `let`, `const`, `var`，解构赋值 `const [a, b] = ...`, `const {x, y} = ...` | 实时在右侧 `LOCALS` 栈帧面板显示变量名、当前值及数值更新高亮 |
| **基础与复合类型** | 基本类型 (`number`, `string`, `boolean`, `null`, `undefined`, `any`, `unknown`, `never`, `void`, `unique symbol`)、数组 `T[]` / `Array<T>`、具名/可选/剩余元组 `[name: string, age?: number, ...rest: boolean[]]`、联合类型 `A \| B`、交叉类型 `A & B`、`interface`、`type` 别名、`enum` / `const enum` | 编译期在编辑器波浪线与日志面板报告不兼容错误；转译期擦除类型注解并保持 1:1 源码行号映射（`enum` 展开为运行时双向映射对象） |
| **高级类型体操** | 泛型函数与泛型类 `<T, K extends keyof T>`、索引访问 `T[K]`、`typeof`、条件类型 `T extends U ? X : Y`（含分布式条件类型）、`infer` 类型推断、映射类型 `{ readonly [K in keyof T as ...] -?: T[K] }`、模板字面量类型 `` `on${Capitalize<T>}` ``、内置工具类型 (`Partial`, `Required`, `Readonly`, `Pick`, `Omit`, `Record`, `Exclude`, `Extract`, `NonNullable`, `ReturnType`, `Parameters`, `Awaited`) | 静态类型检查器在编译期直接求值展开高级类型并校验赋值、传参与返回值兼容性 |
| **类型收窄与断言** | 类型谓词 `x is T`、断言函数 `asserts x is T`、`typeof` / `!== null` / 可辨识联合分支收窄、`as T`、`as const`、非空断言 `x!`、`satisfies` 运算符 | 静态校验 `satisfies` 契约与穷尽 `switch (default: never)`，运行时平滑剥离类型语法 |
| **控制流与循环** | `if / else`, `switch / case`, `for`, `for...of`, `for...in`, `while`, `do...while`, `break`, `continue` | 每个循环头、条件判断与赋值语句均插入按需步进点（`__t`），内置 2s 死循环熔断与行号定位 |
| **函数与递归** | 函数声明、函数重载签名、`function*` 生成器、箭头函数 `() => {}`、默认参数、剩余参数 `...args`、递归调用 | 每次调用自动压入新栈帧（Call Stack 面包屑），支持点击任意历史栈帧切换作用域观察局部变量 |
| **面向对象 (OOP)** | `class`, `abstract class`, `implements`, `extends` 继承, `super()`, 构造器参数属性 `constructor(public readonly name: string)`, 访问修饰符 (`public` / `private` / `protected` / `readonly` / `override`), `static`, `get` / `set`, 类装饰器 `@sealed` | 实例自动渲染为专属 `interface / class` 结构卡片，在方法内步进时实时追踪 `this` 字段突变 |
| **异步与事件循环** | `async / await`, `new Promise`, `Promise.resolve().then()`, `setTimeout`, `queueMicrotask`, `import { promises as fs } from 'fs'` | 确定性虚拟事件循环沙箱按微任务（Microtask）优先于宏任务（Macrotask）顺序逐步推进，实时渲染 `eventLoop` 四栏状态看板 |

### 1.2 静态类型检查器诊断能力 (`src/compiler/type-checker.ts`)

静态类型检查器专门针对 TypeScript 教学与算法实现场景设计，捕获以下常见类型错误并精确标记源码行号与 TS 错误码：
1. **未声明标识符与隐式 `any`**：捕获拼写错误或未声明变量（`TS2304`）、未标注类型的函数参数（`TS7006`）及对 `const` 常量的二次赋值（`TS2588`）。
2. **变量声明与赋值类型不匹配（`TS2322`）**：如将 `string` 赋给 `number`，或将混合数组 `(number | string)[]` 赋给 `string[] | number[]`。
3. **函数调用实参数量与类型检查（`TS2345` / `TS2554`）**：检查必选参数缺失、实参类型不兼容、泛型约束违背及 `keyof` 属性名越界。
4. **接口 (`interface`) 与对象字面量结构检查（`TS2741` / `TS2353` / `TS1360`）**：检查缺失必选字段、多余未知属性及 `satisfies` 契约违背。
5. **类与属性访问控制检查（`TS2339` / `TS2511` / `TS2420`）**：检查访问不存在的属性、直接实例化抽象类、或类未完整实现 `implements` 接口。
6. **空值与 `unknown` 安全检查（`TS18047` / `TS18046`）**：拦截未收窄的 `null` / `undefined` 属性访问以及对 `unknown` 直接执行算术运算。

---

## 2. 数据结构自动识别规则 (`src/viz/memory-normalizers.ts`)

可视化引擎会根据运行时值的**结构特征（Duck Typing）**或**变量命名约定**，在纯数据归一化层 `src/viz/memory-normalizers.ts` 中自动将其转换为专属图形视图，并由 `src/viz/memory-graph.ts` 渲染为交互式 SVG/DOM 卡片：

### 2.1 二维矩阵网格 (`grid`)
- **触发条件**：元素为数组的二维数组（如 `dp: number[][]`、`grid: string[][]`）。
- **视觉表现**：渲染为行列对齐的二维表格网格，自动高亮当前写入格（`hot`）与动态规划状态转移读取依赖格（`dep`）；当矩阵超过 `10×10` 时自动启用围绕当前坐标 `(i, j)` 的滑动视窗。

### 2.2 二叉树 (`tree`)
- **触发条件**：包含 `val` 字段且具有 `left` 或 `right` 属性的对象节点。
- **视觉表现**：自动计算子树布局并绘制自顶向下的 **SVG 层次树节点与父子连线**。

### 2.3 单链表 (`list`)
- **触发条件**：包含 `val` 字段且包含 `next` 属性（不含 `left`/`right`）的链式节点。
- **视觉表现**：渲染为水平串联的节点链（`val → val → null`），自动追踪并标注指向链表内部节点的指针变量（如 `slow`、`fast`、`cur`），并具备环路检测能力。

### 2.4 图结构 (`graph`)
- **触发条件**：包含 `nodes: [{ id, label }]` 与 `edges: [[u, v]]` 的图结构对象。
- **视觉表现**：自动采用圆周分布布局绘制 **SVG 顶点与连线**。

### 2.5 栈、队列、堆与并查集 (`stack` / `queue` / `heap` / `uf`)
- **触发条件**：
  - 变量名为 `stack` / `stk` ➔ 渲染为带 `top` 栈顶标记的**栈视图**（超大栈自动保留栈顶焦点）。
  - 变量名为 `queue` / `deque` ➔ 渲染为带 `front` / `back` 双端标记的**队列视图**。
  - 变量名为 `heap` / `pq` ➔ 渲染为带 `top` 与父子下标公式提示的**二叉堆视图**。
  - 变量名为 `parent` / `uf` / `fa` / `dsu` ➔ 渲染为带 `root` 根标记与 `p:i` 父节点指向的**并查集视图**。

### 2.6 哈希表、集合与接口/类卡片 (`map` / `set` / `interface`)
- **触发条件**：`Map` 实例、`Set` 实例、或匹配 TypeScript `interface` / `class` 结构的对象实例。
- **视觉表现**：`Map` / `Set` 渲染为键值/元素桶视图；类与接口实例渲染为带字段声明类型注解与变更高亮（`hot`）的 Schema 卡片。

### 2.7 一维数组与滑动窗口/双指针跟随 (`array` / `string`)
- **触发条件**：所有普通一维数组与字符串。
- **视觉表现**：横向排列带下标编号的单元格；当同一栈帧中存在 `l` & `r`（或 `left`/`right`、`lo`/`hi`、`start`/`end`）时自动高亮 `[l..r]` 滑动窗口区间，并在对应下标下方悬挂 `i`、`j`、`mid` 等彩色指针标签；超过 20 项的超大数组自动启用围绕活动指针的动态焦点窗口切片。

---

## 3. Notebook 模式跨单元格作用域规则 (`src/notebook/notebook-kernel.ts`)

在 **Notebook (`.ipynb`)** 模式下：
- **跨单元格累积上下文**：求值内核 `src/notebook/notebook-kernel.ts` 会将前序已执行单元格的顶层声明规范化并拼入累积上下文，后续单元格可直接访问前面单元格定义的变量、函数、接口、类型别名与类。
- **跨单元格感知的静态类型检查**：`typecheckNotebookCellTS` 会结合前序已执行单元格的 TypeScript 声明对当前单元格做增量类型检查，并精确映射回当前单元格的行号。
