# 语法与数据结构可视化参考手册 (`SYNTAX_REFERENCE.md`)

本文档详细列出 **Algorithm Visualizer** 的 **TypeScript 引擎** 与 **Python 引擎** 各自支持的语言特性、静态类型检查范围，以及 **7 类数据结构自动可视化识别规则**（由纯数据归一化模块 `src/viz/memory-normalizers.ts` 与渲染引擎 `src/viz/memory-graph.ts` 驱动）。

---

## 1. TypeScript 引擎支持矩阵

TypeScript 引擎由 **轻量级 TS 转译器 (`src/compiler/transpile.ts` + `transpile-helpers.ts`)**、**教育级静态类型检查器 (`src/compiler/type-checker.ts` + `tc-infer.ts` + `tc-eval.ts`)**、**Acorn AST 插桩器 (`src/compiler/instrumenter.ts`)** 与 **确定性虚拟事件循环 (`src/runtime/event-loop.ts` + `event-loop-env.ts`)** 四部分组成。

### 1.1 支持并可视化追踪的语法特性

| 类别 | 支持语法与特性 | 可视化表现 |
| :--- | :--- | :--- |
| **变量与常量** | `let`, `const`, `var`，解构赋值 `const [a, b] = ...`, `const {x, y} = ...` | 实时在左侧栈帧面板显示变量名、静态类型注解、当前值及新建/修改脉冲高亮 |
| **类型系统** | 基本类型 (`number`, `string`, `boolean`, `null`, `undefined`, `any`, `unknown`, `void`)、数组 `T[]` / `Array<T>`、元组 `[T1, T2]`、联合类型 `A \| B`、交叉类型 `A & B`、`interface`、`type` 别名、`enum`、泛型 `<T extends ...>`、类型断言 `x as T`、非空断言 `x!` | 编译期在「类型诊断」面板报告不兼容错误；转译期擦除类型注解并生成可执行 JS（`enum` 展开为双向映射运行时对象） |
| **控制流与循环** | `if / else`, `switch / case`, `for`, `for...of`, `for...in`, `while`, `do...while`, `break`, `continue` | 每个循环迭代与条件分支均插入步进点（`__step__`），内置死循环熔断保护（默认上限 5000 步） |
| **函数与递归** | 函数声明 `function fn()`、箭头函数 `() => {}`、默认参数、剩余参数 `...args`、递归调用 | 每次调用自动压入新栈帧（Call Stack），返回时弹出栈帧并记录返回值气泡与递归调用树（Call Tree） |
| **面向对象 (OOP)** | `class`, `constructor`, 参数属性 `constructor(public val: number)`, `extends` 继承, `super()`, 访问修饰符 (`public` / `private` / `protected` / `readonly`), 方法与字段默认值 | 实例分配在右侧堆内存区（Heap），栈变量通过 SVG 贝塞尔指针连线指向对应堆实例卡片 |
| **异步与事件循环** | `async / await`, `new Promise`, `Promise.resolve().then()`, `setTimeout`, `queueMicrotask` | 确定性虚拟事件循环沙箱按微任务（Microtask）优先于宏任务（Macrotask）顺序逐步推进，无需真实等待定时器延迟 |
| **内置集合** | `Array`, `Map`, `Set`, `Object` | 自动展开内部条目并渲染为专属数据结构视图 |

### 1.2 静态类型检查器诊断能力 (`src/compiler/type-checker.ts`)

静态类型检查器专门针对算法教学场景设计，捕获以下常见类型错误并精确标记源码行列号：
1. **变量声明与赋值类型不匹配**：如 `let count: number = "hello";` 或将 `string` 赋给 `number[]`。
2. **函数调用实参数量与类型检查**：检查必选参数缺失、过多参数以及实参类型与形参类型不兼容。
3. **函数返回值类型检查**：检查 `return` 表达式是否符合函数声明的返回类型，或非 `void` 函数遗漏返回值。
4. **接口 (`interface`) 与对象字面量结构检查**：检查缺失必选字段或字段类型不匹配。
5. **类与属性访问控制检查**：检查访问不存在的属性、向 `readonly` 属性二次赋值、在类外部访问 `private` / `protected` 成员。
6. **数组方法元素类型校验**：如向 `number[]` 调用 `.push("str")` 时触发类型告警。

---

## 2. Python 引擎支持矩阵

Python 引擎运行在独立的 **Pyodide Web Worker** (`python/py_worker.js` + `python/py_bridge.py`) 中，基于标准 CPython 3.11 (WASM) 的 `sys.settrace` 机制。

| 类别 | 支持特性 | 说明 |
| :--- | :--- | :--- |
| **Python 标准语法** | 完整 Python 3.11 语法（列表推导式、生成器、装饰器、`class`、`dataclass`、切片、字典推导等） | 由真实 CPython 解释器执行，100% 兼容标准语法 |
| **常用内置模块** | `collections` (`deque`, `defaultdict`, `Counter`), `heapq`, `bisect`, `math`, `itertools`, `functools`, `typing` | 开箱即用，无需额外安装 |
| **步进与内存快照** | 函数调用（`call`）、行执行（`line`）、函数返回（`return`）、异常捕获（`exception`） | `py_bridge.py` 在每一步自动遍历活动栈帧与可达堆对象，序列化为与 TS 引擎完全一致的视觉模型 |

---

## 3. 七类数据结构自动识别规则 (`src/viz/memory-normalizers.ts`)

可视化引擎会根据堆内存对象的**结构特征（Duck Typing）**或**变量命名约定**，在纯数据归一化层 `src/viz/memory-normalizers.ts` 中自动将其转换为专属图形视图，并由 `src/viz/memory-graph.ts` 渲染为交互式 SVG/DOM 卡片：

### 3.1 二维矩阵网格 (`2D Matrix`)
- **触发条件**：元素全部为等长（或近似等长）一维数组的二维数组（如 `dp: number[][]`、`grid: string[][]`、`board`）。
- **视觉表现**：渲染为行列对齐的二维表格网格，支持单元格坐标提示与读写脉冲高亮。

### 3.2 二叉树与多叉树 (`Tree`)
- **触发条件**：包含 `val` / `value` / `key` 字段，且具有 `left` & `right` 属性（二叉树）或 `children` 数组属性（多叉树）的对象节点。
- **视觉表现**：自动计算子树宽度并绘制自顶向下的 **SVG 层次树节点与父子连线**，同时标记指向当前节点的栈帧指针バッジ（如 `root`, `curr`, `node`）。

### 3.3 链表 (`LinkedList`)
- **触发条件**：包含 `val` / `value` / `data` 字段且包含 `next`（单链表）或 `next` + `prev`（双向链表）属性，且不包含 `left`/`right` 的链式节点。
- **视觉表现**：渲染为水平串联的节点链（`[val] ➔ [val] ➔ null`），若存在环路（Cycle）会自动检测并标记 `↩ cycle to #id`。

### 3.4 图结构 (`Graph`)
- **触发条件**：
  1. 变量名包含 `adj`、`graph`、`edges`、`network` 的邻接表对象/Map/二维数组；或
  2. 包含 `neighbors` / `edges` 数组属性的对象节点。
- **视觉表现**：自动采用圆周分布布局绘制 **SVG 顶点与有向箭头边**。

### 3.5 栈与队列 (`Stack` / `Queue`)
- **触发条件**：
  - 类名或变量名包含 `stack`、`lifo` ➔ 渲染为带 `TOP` 标记的**栈视图**。
  - 类名或变量名包含 `queue`、`deque`、`fifo`、`bfs` ➔ 渲染为带 `FRONT` / `BACK` 双端标记的**队列视图**。

### 3.6 哈希表与集合 (`HashMap` / `Set`)
- **触发条件**：JavaScript `Map` / `Set` 实例、Python `dict` / `set`、或普通键值字典对象。
- **视觉表现**：渲染为清晰的 `Key ➔ Value` 哈希桶卡片，若 Value 为堆对象引用则自动绘制跨卡片 SVG 指针连线。

### 3.7 一维数组与双指针跟随 (`1D Array + Index Pointers`)
- **触发条件**：所有普通一维数组（如 `nums`, `arr`, `dp`）。
- **视觉表现**：横向排列带下标编号的数组格子；当同一栈帧中存在名为 `i`, `j`, `k`, `left`, `right`, `low`, `high`, `mid`, `slow`, `fast`, `start`, `end`, `l`, `r` 的整型变量且其值落在数组下标范围内时，**自动在对应数组格子下方悬挂彩色指针标签**（例如 `▲ left=0`, `▲ right=7`）。

---

## 4. Notebook 模式跨单元格作用域规则 (`src/notebook/notebook-kernel.ts`)

在 **Notebook (`.ipynb`)** 模式下：
- **TypeScript 单元格**：求值内核 `src/notebook/notebook-kernel.ts` 会自动提取单元格顶层的 `let` / `const` / `var` / `function` / `class` 声明并提升至共享上下文对象 `__nb_ctx__`，因此后续单元格可以直接调用前面单元格定义的函数、类或变量。
- **Python 单元格**：在同一个持久化的 Pyodide 全局命名空间中顺序执行，天然支持跨单元格变量共享。
