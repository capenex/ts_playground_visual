# TypeScript Playground VISUAL · 支持的语法范围与可视化规范参考手册

本文档详细说明 **TypeScript Playground VISUAL** 内置的三大核心编译与分析引擎所支持的 TypeScript / JavaScript 语法范围：
1. **内置子集类型检查器 (`typecheckTS`，非完整 tsc)**
2. **词法感知类型剥离器 (`stripTypes`)**
3. **语句级自动插桩与按需 Debug 引擎 (`instrument` + `deriveAnimAndNote`)**
4. **数据结构分类器与可视化映射规则 (`classifyValue` + `VIZ`)**

> **重要**：`typecheckTS` 是项目内置的**子集检查器**，不是完整的 TypeScript 编译器（tsc），也不调用官方语言服务。它只覆盖下表列出的常用规则，可能漏报或误报；实际行为以官方 `tsc` 和运行结果为准。页面 SOURCE 旁的「TS 子集检查」也列出了同样的边界。

---

## 一、 静态类型检查器 (`typecheckTS`) 支持范围

系统默认开启内置子集类型检查（`STRICT_TS = true`）。在点击「▶ 运行」或「🐞 Debug 调试」时，如果源码存在以下类型违规，系统将在左侧行号与代码行标红，并在底部日志面板输出对应的标准 TypeScript 错误码与中文诊断说明，同时阻止带病执行。

### 1. 支持的类型语法声明
| 语法结构 | 支持写法示例 | 说明 |
|---|---|---|
| **原始类型** | `number`, `string`, `boolean`, `void`, `null`, `undefined`, `any`, `unknown`, `never` | 支持字面量自动推导（如 `123` → `number`，`"abc"` → `string`，`true` → `boolean`） |
| **一维与多维数组** | `number[]`, `string[][]`, `Array<number>`, `Array<string[]>` | `Array<T>` 泛型会自动归一化为 `T[]`，支持嵌套数组元素类型逐项检查 |
| **联合类型 (Union Types)** | `number \| string`, `number \| null`, `string \| undefined` | 支持联合类型的双向可赋值性校验与空值合并收窄（`x \|\| 0`、`x ?? 0`） |
| **接口声明 (`interface`)** | `interface User { name: string; age: number; email?: string; }` | 支持单行或多行 `interface` 定义，支持 `;` 或 `,` 分隔字段，支持 `?` 可选属性 |
| **类型别名 (`type`)** | `type ID = number \| string;`、`type Point = { x: number; y: number };` | 支持基本类型别名、联合类型别名与对象字面量结构别名 |
| **泛型容器类型** | `new Map<number, string>()`、`new Set<number>()` | 自动追踪 `Map<K, V>` 的键/值类型与 `Set<T>` 的元素类型 |
| **函数声明与参数注解** | `function fn(a: number, b?: string, c = 10): boolean` | 支持必填参数、可选参数 `?`、默认参数类型推导及返回类型注解 |
| **类型断言** | `expr as number`、`expr satisfies User` | 按断言目标类型解析表达式结果类型 |

### 2. 支持的静态诊断错误码清单
| 错误码 | 触发场景说明 | 典型拦截示例 |
|---|---|---|
| **`TS7006`** | 函数参数缺少显式类型注解且无默认值（隐式 `any`） | `function add(a, b: number)` → 报错参数 `"a"` 隐式具有 `"any"` 类型 |
| **`TS2322`** | 变量初始化、变量重赋值、数组元素、对象属性或函数返回值类型不匹配 | `const n: number = "123";` 或 `greet({ name: "Bob", age: "20" })`（`age` 应为 `number`） |
| **`TS2741`** | 对象字面量赋值给 `interface` / 对象类型时**缺少必填属性** | `const u: User = { name: "Alice" };`（缺少 `User` 必填的 `age` 属性） |
| **`TS2353`** | 对象字面量中包含目标 `interface` **不存在的未知属性** | `const u: User = { name: "Alice", age: 18, role: "admin" };` |
| **`TS2339`** | 在普通表达式或模板字符串 `${...}` 中访问 `interface` **不存在的属性** | ``return `Hello, ${user.email}`;``（`User` 上不存在属性 `email`） |
| **`TS2345`** | 函数调用、方法调用（`Array.push`、`Map.get/set`、`Set.add/has`、`Math.*`）实参类型不匹配 | `add(1, "two")` 或 `numArr.push("str")` |
| **`TS2554`** | 函数调用传入的实参个数少于必填参数个数或多于总参数个数 | `add(1)`（应有 2 个参数，但获得 1 个） |
| **`TS2355`** | 函数声明了非 `void` / `any` 返回类型，但函数体缺少返回值 `return` 语句 | `function test(n: number): number { let x = n; }` |
| **`TS2588`** | 对 `const` 声明的常量执行重新赋值、`++`、`--` 或在 `for` 循环步进中修改 | `const k = 10; k = 20;` |
| **`TS2362` / `TS2365`** | 算术运算符（`-`, `*`, `/`, `%`, `+`）操作数类型非法 | `const x = "abc" - 1;` 或 `10 + true` |
| **`TS2367`** | 比较运算符（`===`, `!==`, `<`, `>`, `<=`, `>=`）左右两侧为不兼容的不同原始类型 | `if (count === "10")`（无法比较 `"number"` 与 `"string"`） |
| **`TS2538`** | 数组或字符串下标索引使用了非数字类型（如 `string` 或 `boolean`） | `nums["0"]` |

### 3. 类型检查边界（不是完整 tsc）

**覆盖范围**

- 基础类型注解、数组 / 联合类型、`interface` / `type` 对象结构；
- 函数参数、返回类型、常用数组 / `Map` / `Set` / `Math` 方法和简单表达式；
- 对象属性链、模板字符串插值、基础赋值 / 比较 / 调用检查；
- 内置样例和常见算法代码里的类型错误。

**不覆盖**

- 完整泛型推断与约束、条件类型、映射类型、交叉类型；
- 复杂类型收窄、声明合并、命名空间 / 模块解析、跨文件类型；
- 装饰器、JSX / TSX、完整标准库类型、类型级运算、`satisfies` 的完整语义；
- 所有 tsc 的诊断规则与错误码。

**因此**：可能出现漏报（错误没标红）或误报（合法写法被标红）。以实际运行结果和官方 `tsc` 为准。

**Python 模式**：不在 `typecheckTS` 范围内；只做运行前语法检查（`ast.parse` / `compile`），不做静态类型检查，类型注解不参与校验。

---

## 二、 类型剥离器 (`stripTypes`) 支持的 TypeScript 语法

在静态类型检查通过后，`stripTypes` 会将 TypeScript 源码无损转换为等行号的纯 JavaScript 代码：

1. **声明级擦除（保持原行号与换行符数量完全一致）**
   - `interface Foo { ... }`（单行与跨多行接口块）
   - `type Bar = ...;`（单行与跨多行类型别名）
   - `import ... from '...';`、`export { ... }`、`export * from '...'`（保留动态 `import(...)` 调用；`export function` / `export const` / `export default` 自动剥离 `export default` 关键字并保留声明体）
2. **注解与修饰符擦除**
   - 变量、常量、循环变量的类型注解：`const a: number[] = [1, 2]` → `const a = [1, 2]`
   - 函数参数与箭头函数参数类型注解、可选参数问号 `?`：`function f(x: number, y?: string): void` → `function f(x, y)`
   - 函数与方法名后的泛型参数列表：`function id<T>(x: T): T` → `function id(x)`
   - 构造器调用与函数调用的泛型实参：`new Map<number, number>()` → `new Map()`
   - Class 字段与构造函数参数修饰符：`public`、`private`、`protected`、`readonly`
   - 类型断言：`x as number`、`x satisfies Config` → `x`
3. **复杂表达式消歧义保护（绝不误删运行时语法）**
   - **三元表达式保护**：支持嵌套三元 `a ? b : c`、函数调用内含逗号的三元 `ok ? Math.max(a, b) : c` 以及三元分支为 PascalCase 标识符 `cond ? Foo : Bar`。
   - **可选链与空值合并保护**：完整保留 `obj?.prop`、`arr?.[i]`、`fn?.()` 与 `a ?? b`，且不会干扰同一行后续的类型注解剥离。
   - **对象字面量与解构重命名保护**：完整保留 `{ val: 1, left: null }` 与 `const { a: alias } = obj`。
   - **字符串与模板字符串保护**：字符串内的 `//`、`/* */`、`: type` 以及模板字符串插值 `` `val: ${x}` `` 均原样保留。

---

## 三、 自动插桩器 (`instrument`) 与单步调试支持范围

### 1. 自动追踪的变量范围 (`collectNames`)
插桩器会自动扫描并收集以下所有标识符，在每一步快照中实时记录它们的值：
- `const` / `let` / `var` 声明的变量（含单行多变量声明 `let l = 0, sum = 0`）；
- 数组解构与对象解构变量（如 `const [u, v] = edge`、`const { val, next } = node`）；
- `for (let i = 0; ...)`、`for (const x of arr)`、`for (const k in obj)` 循环变量；
- `function` 声明参数与箭头函数 `(a, b) => ...` 参数；
- class / 对象字面量方法参数（如 `add(n: number)`、`constructor(v)`），以及方法体里的 `this`（会作为 `this` 快照进入 WATCH）。

**入口调用**：推荐在源码**最后一行**直接写真实的顶层调用（如 `fib(10)`）。调试器会把最后一行顶层调用当作入口，并从执行体中摘除，避免执行两次；旧的 `// 调用：expr` 注释仍然兼容，但不再推荐。Python 模式同理，旧的 `# 调用：expr` 仍兼容。

### 2. 逐行步进与条件判断全覆盖
- **普通可执行语句**：赋值语句、变量声明、`return`、`throw`、独立函数/方法调用（如 `stack.push(r)`、`map.set(x, count)`）、自增自减语句。
- **循环与分支条件全覆盖**：
  - `while (cond) {`：每次进入循环前以及每次循环体末尾回到头部判别 `cond` 时，都会单独生成一步并展示 `cond` 的实时比较结果（如 `stack.length > 0 && nums[...] < x ⇒ true/false`）。
  - `for (init; cond; update) {`：每次迭代判别 `cond`（含最后一次退出循环时的 `false` 判别）均会生成独立调试步。
  - `if (cond) {` 与 `} else if (cond) {`：当 `if` 为 `false` 落入 `else if` 时，会明确在 `else if` 行停留并展示其条件判别结果。
- **多行语句安全保护**：跨多行的对象字面量、数组字面量、链式方法调用（`.map(...)\n.filter(...)`）以及无花括号的 `if (cond)\n stmt;` 均经过括号深度与续行分析，不会在语法中间非法插入钩子。

### 3. 内置调试辅助函数与调用栈追踪
- **`checkpoint(...args)` / `断点(...args)`**：可在代码任意语句位置调用，支持传入 0 个或多个说明文字与变量表达式（如 `checkpoint("窗口达标", r, sum, best)`）。使用「⏭ 运行到下一个检查点」时会在此暂停并高亮展示所有实参的值；「▶ 自动」则会把检查点当作普通步骤继续播放。
- **函数调用栈自动追踪 (`__t.__initGlobal` / `__t.__enter` / `__t.__leave`)**：自动对多行具名函数声明（`function fn(...) { ... }`）、函数表达式与箭头函数（`const fn = (...) => { ... }`）以及 class / 对象方法（`add(n) { ... }`）注入 `try / finally` 进出栈钩子与独立词法闭包快照，在右侧 `LOCALS` 面板顶部实时呈现如 `global ▸ mergeSort(0, 7) ▸ mergeSort(0, 3) ▸ mergeSort(0, 1)` 的完整调用链条，并支持点击任意栈帧切换查看该层栈帧的局部变量与数据结构状态。

---

## 四、 12 种数据结构自动识别与可视化规范

右侧 `WATCH` 面板根据运行时变量的**结构特征**与**命名约定**，自动将其映射为 12 种专业图形组件：

| 序号 | 可视化类型 (`kind`) | 自动识别条件 | 特殊高亮与附加特性 |
|---|---|---|---|
| 1 | **`array`（一维数组）** | 普通一维数组 `T[]` | 支持读写索引高亮（`hot` / `mark`）；若作用域内存在 `l` 和 `r`（或 `left` 和 `right`），自动渲染 `[l..r]` 滑动窗口条带 |
| 2 | **`string`（字符串）** | 长度 `1 ~ 60` 的字符串变量 | 字符格序列，同样支持下标高亮与 `[l..r]` 滑动窗口条带 |
| 3 | **`stack`（栈）** | 变量名匹配 `/stack\|stk/i` 的一维数组 | 垂直栈布局，顶部标注 `top`，压栈/弹栈时高亮栈顶元素 |
| 4 | **`queue`（队列）** | 变量名匹配 `/queue\|deque\|bfs/i` 的一维数组 | 水平队列布局，自动标注队首 `front` 与队尾 `back` |
| 5 | **`heap`（二叉堆）** | 变量名匹配 `/heap\|pq\|priority/i` 的一维数组 | 标注堆顶 `top`，底部附带父子节点下标公式 `parent = (i - 1) >> 1 · left = 2i + 1` |
| 6 | **`uf`（并查集）** | 变量名匹配 `/^(uf\|dsu\|parent\|parents\|fa\|root)$/i` 的整型数组 | 自动识别根节点 `root`（`parent[i] === i`）与父节点指针 `p:x` |
| 7 | **`map`（哈希映射）** | `Map` 实例 | 渲染 `key → value` 键值对胶囊，执行 `map.get(k)` / `map.set(k, v)` 时高亮对应键 |
| 8 | **`set`（集合）** | `Set` 实例 | 渲染集合元素胶囊，执行 `set.add(x)` / `set.has(x)` 时高亮对应元素 |
| 9 | **`grid`（二维矩阵）** | 二维数组 `T[][]`（如 DP 表 `dp`） | 网格视图，执行 `dp[i][j] = ...` 时琥珀色高亮当前写入格 `[i, j]`，蓝色高亮本行引用的依赖格（如 `dp[i-1][j-1]`） |
| 10 | **`list`（单链表）** | 含 `{ val, next }`（或 `value`）属性的链式对象 | 渲染 `val → val → null` 节点指针链 |
| 11 | **`tree`（二叉树）** | 含 `{ val, left, right }` 属性的树形嵌套对象 | 自动计算递归坐标并绘制 SVG 二叉树节点与边连线，根节点带蓝色轮廓标识 |
| 12 | **`graph`（图结构）** | 含 `{ nodes, edges }` 的对象或邻接表/矩阵 | 自动进行环形拓扑布局并绘制 SVG 节点与边连线 |

## 五、 类 / 枚举 / 泛型支持范围

### 1. class
- **支持**：字段（含初值与类型注解）、方法（参数 / 返回类型）、构造器、`extends`、`static`、getter / setter、`private` / `public` / `protected` / `readonly`（修饰符擦除）、`implements`（整句剥离）、类表达式。
- **单步**：方法体会逐行插桩，调用栈显示 `global ▸ run(1) ▸ add(2)`；方法体内的 `this` 会作为一张 `this` 卡片进入 `WATCH`，字段变化实时可见。
- **暂不支持（会给出人话提示，不会抛 `Unexpected token`）**：构造器参数属性 `constructor(private x)`、装饰器、`abstract`、`static {}` 初始化块、`namespace` / `module`。

### 2. enum
- **支持**：数字枚举（自动递增、反向映射 `E[0] === "A"`）、字符串枚举、混合枚举、`const enum`，以及成员引用前面成员的计算值（如 `enum E { A = 1 << 1, B = A + 10 }`）。
- **实现方式**：整段 `enum` 被展开成一行 IIFE，行号数量保持不变，因此步进与报错行号不受影响。
- **暂不支持**：成员值无法静态求值的写法（如引用外部变量、调用函数）。

### 3. 泛型
- **支持**：函数 / 方法泛型声明、泛型类、泛型箭头、调用点类型实参，运行期全部擦除。
- **不做泛型类型检查**：`typecheckTS` 只做子集检查，泛型约束与推断不作为报错依据。

---

## 六、 使用限制与注意事项

为了保持毫秒级响应，当前引擎存在以下设计边界。当前版本是多文件静态应用（CodeMirror 6 + 可选 Python / Pyodide），TypeScript 核心仍不依赖前端框架：

1. **同页作用域**：TypeScript 代码由 `new Function` 编译执行，不支持加载外部 npm 包或模块导入；**注意它不是安全沙箱**——代码仍能访问同页面的全局对象，请只运行你信任的代码。分享链接默认在 `share.html` 的 sandboxed iframe 中隔离运行（无 `allow-same-origin`）。
2. **异步语法**：按需步进引擎基于同步确定性重放机制设计，暂不支持对 `async / await`、`Promise.then` 或 `setTimeout` 异步回调进行跨事件循环的单步插桩。
3. **安全熔断上限**：单次调试最多记录 `MAX_STEPS = 2000` 步，单步计算上限 `MAX_EXEC_MS = 2500ms`；`▶ 运行` 的墙钟上限为 `RUN_TIMEOUT_MS = 2000ms`，超时会强制终止并报出死循环所在行。
4. **Python 模式**：本文档只覆盖 TypeScript；Python 模式只做运行前语法检查（`ast.parse` / `compile`），不做静态类型检查；入口同样是最后一行真实调用；运行在 Pyodide Worker 中，详见 `USER_GUIDE.md` 的「Python 模式」。
