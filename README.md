# TypeScript Playground VISUAL · 项目架构与技术文档

**TypeScript Playground VISUAL** 是一个**零前端框架依赖**的 **TypeScript / Python 可视化演练场与按需逐行 Debug 调试器**。核心引擎采用模块化 TypeScript 编写（位于 `src/**/*.ts`，按职责划分为状态与类型定义、内置样例、编译器层、运行时与虚拟事件循环层、可视化渲染层、UI 控制与导出层），通过 `esbuild` 打包为浏览器直接运行的 `js/app.bundle.js`；CodeMirror 6 编辑器与官方 TypeScript Web Worker 分别打包为 `editor/cm.bundle.js` 与 `editor/ts-worker.bundle.js`；样式位于 `css/app.css`，自动保存与分享链接位于 `app-session.js`，Python 模式位于 `python/`。

> **双层类型检查架构**：内置 `typecheckTS`（`src/compiler/type-checker.ts`）提供零延迟的同步静态类型检查（支持基础类型、接口、类、泛型函数与 `keyof` 约束、条件类型、`infer`、映射类型与内置工具类型），并在浏览器后台联动官方 TypeScript 编译器 Web Worker（`editor/ts-worker.bundle.js`）合并完整诊断。

---

## 📚 文档导航

本项目提供四份配套中文文档，面向不同阅读场景：

1. **[`README.md`（本文档 · 项目架构与部署维护指南）](./README.md)**：介绍项目模块化架构、核心编译与调试管线设计、内置样例、构建/测试/部署流程。
2. **[`USER_GUIDE.md`（面向用户的操作说明手册）](./USER_GUIDE.md)**：图文式讲解界面布局、如何编写可调试代码、如何使用 `checkpoint()` 检查点、异步 Event Loop 调试、以及如何导出 1080p 60fps 视频。
3. **[`SYNTAX_REFERENCE.md`（支持的 TypeScript 语法与可视化范围参考手册）](./SYNTAX_REFERENCE.md)**：详列静态类型检查器（`typecheckTS` + TS Worker）支持的规则与错误码、类型剥离与语法降级器（`stripTypes`）、自动插桩器（`instrument`）、虚拟事件循环以及数据结构可视化识别规则。
4. **[`REFACTOR_PLAN.md`（TypeScript 模块化重构计划与模块映射说明）](./REFACTOR_PLAN.md)**：记录从早期全局脚本架构迁移至 `src/**/*.ts` 模块化工程的目录结构、映射关系与外部全局桥接契约。

---

## 一、 模块化目录结构 (`src/`)

```text
├── src/
│   ├── types.ts                  # 全局核心数据结构与接口定义 (Diag, Frame, EventLoopSnapshot, StepSnapshot 等)
│   ├── globals.d.ts              # 全局桥接变量与 WebCodecs API 环境声明
│   ├── state.ts                  # 集中式运行时与 UI 状态管理 (appState 与响应式全局属性代理)
│   ├── samples/
│   │   ├── ts-samples.ts         # TypeScript 10 个内置示例与默认步进配置 (SAMPLES, SAMPLE_DEFAULT_STEP)
│   │   └── py-samples.ts         # Python / 多语言示例桥接支持
│   ├── compiler/
│   │   ├── comments.ts           # 词法扫描、注释剥离、字符串掩码与顶层切分工具
│   │   ├── transpile.ts          # TS 类型擦除与语法降级编译器 (stripTypes, transpileEnums, transpileNamespaces)
│   │   ├── instrumenter.ts       # 语句级自动插桩器与 async/await 协程改写 (instrument, collectNames)
│   │   └── type-checker.ts       # 同步静态类型检查器、接口/类元数据提取与 TS Worker 桥接 (typecheckTS)
│   ├── runtime/
│   │   ├── event-loop.ts         # 确定性虚拟事件循环调度器 (createVirtualEventLoop, VirtualPromise, setTimeout)
│   │   └── runner.ts             # 沙箱执行器与按需步进轨迹生成 (startDebug, computeAndAppendNextStep, runOnce)
│   ├── viz/
│   │   ├── ast-view.ts           # AST 视图构建、行间求值胶囊 (#stepViz) 与飞入动画
│   │   ├── highlight.ts          # 声明感知语法高亮、编辑器错误波浪线同步与悬停查看器 (#hoverTip)
│   │   └── memory-graph.ts       # 快照分类器、调用栈面包屑与 14 类数据结构可视化渲染器 (classifyValue, VIZ)
│   ├── ui/
│   │   ├── controls.ts           # 步进器、播放控制、动态检查点注入、文件导入/改名/导出与分栏拖拽
│   │   └── share.ts              # 1920×1080 60fps WebCodecs/WebM 视频导出器、样例加载与启动引导 (boot)
│   └── main.ts                   # 统一入口：挂载全局兼容桥接接口并启动应用
├── editor/
│   ├── cm-entry.js               # CodeMirror 6 编辑器源码入口
│   ├── cm.bundle.js              # CodeMirror 6 打包产物
│   ├── ts-worker-entry.js        # 官方 TypeScript 编译器 Web Worker 源码入口
│   └── ts-worker.bundle.js       # TypeScript Web Worker 打包产物
├── js/
│   └── app.bundle.js             # src/main.ts 的 IIFE 打包产物
├── python/                       # Python (Pyodide Worker) 模式引擎与本地静态服务器
├── scripts/
│   ├── build-editor.mjs          # 使用 esbuild 打包 js/app.bundle.js、editor/cm.bundle.js 与 ts-worker.bundle.js
│   └── build.mjs                 # 生成 dist/ 生产环境纯静态发布目录
├── test-pipeline.mjs             # 自动化端到端测试套件
└── tsconfig.json                 # TypeScript 模块化类型检查配置
```

---

## 二、 核心特性一览

| 模块 / 区域 | 核心能力说明 |
|---|---|
| **左上品牌栏 (`TypeScript Playground VISUAL`)** | 蓝青渐变 `TS` 徽标 + 主副标题层级排版 + 垂直居中的琥珀流光 `VISUAL` 标识。 |
| **顶部工具栏 (`#top`)** | 顶部 `TS / PY` 语言切换；**10 个 TypeScript** + **6 个 Python** 内置样例（切换后自动开启 Debug 调试）、**`📂 导入`**（读取本地 `.ts/.tsx/.js/.jsx/.txt/.py` 到编辑器）、`▶ 运行`（直接求值）、`🐞 Debug 调试`（编译通过后开启按需步进模式），以及右上角 **「⬇ 导出 / 下载 ▾」** 下拉菜单。 |
| **右上角「⬇ 导出 / 下载」菜单** | 集成 **「📄 导出 TypeScript / Python 文件」**（按 SOURCE 标题栏的可改名文件名下载，缺扩展名时按当前语言补 `.ts` / `.py`）、**「🔗 复制分享链接」**（gzip + base64url 放进 URL hash，打开 `share.html` 的 sandboxed iframe，只加载不自动运行）与 **「🎬 导出视频 (`1920×1080 · 60fps`)」**（WebM），内含相对于自动速度的 **5 档倍速调节按钮（`0.75x` / `1x` / `1.5x` / `2x` / `3x`）**。 |
| **会话与分享** | 自动保存代码 / 文件名 / 语言到 `localStorage`，刷新后恢复但不自动运行；分享页使用 `sandbox="allow-scripts allow-downloads"`（无 `allow-same-origin`）隔离，TS 分享代码不能访问主页面 DOM / localStorage。 |
| **左侧：SOURCE 统一源码编辑与调试画布（CodeMirror 6）** | 编辑代码与单步 Debug 共用同一区域；CodeMirror 6 提供查找 / 替换、多光标（`Ctrl/Cmd+D`、`Alt+点击`）、光标所在词的同名整词匹配（蓝色下划线标示，跳过字符串 / 注释）、括号匹配 / 自动闭合、自动缩进、代码折叠、撤销 / 重做与单层清晰错误波浪线。**只有真正声明过的名字**显示为浅蓝色（`#9cdcfe`）；内置变量 / 函数使用暖金色（`#dcdcaa`）；未声明的名字保持白色。步进时在**当前执行行的正上方浮出一枚可视化求值胶囊**（`#stepViz`）。标题栏的 **`TS ␣ 文件名` 芯片可直接点击改名**。 |
| **面向对象 / 全语法 TS 支持 (`class` · `enum` · `namespace` · 泛型)** | 完整支持 `class`（含构造器参数属性 `constructor(private x: number)`、`abstract class`、类装饰器 `@sealed`、`extends`、`implements`、`static`、getter/setter）、`enum` / `const enum`、`namespace`、函数重载签名、`declare` 声明，以及泛型函数/类、条件类型 `T extends U ? X : Y`、`infer`、映射类型 `{ [K in keyof T]: ... }` 和内置工具类型（`Partial`、`Pick`、`Omit`、`Record`、`ReturnType`、`Parameters`、`Awaited`）。 |
| **异步 Event Loop 可视化 (`async/await` · `Promise` · `setTimeout`)** | 内置确定性虚拟事件循环（`createVirtualEventLoop`），支持 `async / await` 协程挂起与恢复、`new Promise`（箭头函数与 `function(resolve)` 写法）、`Promise.resolve/reject/all/race`、`queueMicrotask`、`setTimeout` 与 `sleep`；在 `WATCH` 面板自动渲染 `eventLoop` 卡片，实时展示虚拟时钟、Async 协程状态、Microtask 微任务队列、Macrotask 定时器队列与 Promise 状态表。 |
| **大规模数据结构焦点视窗 (`1D Focal Slice` & `2D Sliding Grid`)** | 当一维数组/链表超过 20 项（如 10,000 项）或二维矩阵超过 `10×10`（如 `100×100`）时，自动围绕当前读写下标、双指针（`l`/`mid`/`r`/`slow`/`fast`）构建焦点切片与二维滑动视窗，保留真实下标、指针标签与省略计数（`…+N`）。 |
| **悬停查看器 (`#hoverTip`)** | Debug 模式下把鼠标停在任意变量/数据结构（源码里或 `LOCALS`/`WATCH` 卡片上）即可弹出浮层：名字、声明类型/结构种类、**当前帧的实时值**，结构变量还会附带一份同款可视化。 |
| **报错定位（CodeMirror 波浪线 + 控制台跳转）** | 静态类型检查报错**实时**标在对应行；控制台每条诊断可点击跳转到该行。`▶ 运行` 阶段的运行时报错也会精确映射回源码行。 |
| **行号与检查点交互** | 点击任意行号即可在代码中自动插入/移除 `checkpoint();`，并**保持当前所在的调试步骤进度不重置回第一步**。 |
| **中间：可拖拽分隔条 (`#resizer`)** | 左右拖动自由调节代码区与右侧面板宽度（双击分隔条一键恢复默认比例）。 |
| **右侧：调用栈面包屑 · LOCALS · WATCH · 控制台** | 在 `LOCALS` 区域顶部实时展示当前函数调用链条（如 `global ▸ mergeSort(0, 7) ▸ mergeSort(0, 3) ▸ mergeSort(0, 1)`），**点击任意栈帧面包屑即可切换查看对应栈帧的局部变量（`LOCALS`）、数据结构窗口状态（`WATCH`）与调用行位置**。 |
| **底部 Debug 控制栏 (`#ctl`)** | 提供 `‹ 上一步`、状态徽章（`● 调试运行中` / `◉ 命中检查点` / `✗ 运行时报错` / `✓ 执行完毕`）、`下一步 ›`、**`⏭ 运行到下一个检查点`**、**`＋ 添加检查点函数`** 以及 **`▶ 自动`** 连续播放。 |
| **运行看门狗 (`RUN_TIMEOUT_MS`)** | `▶ 运行` 同样经过插桩，墙钟超过 2 秒当场抛错终止并标红死循环所在源码行，防止页面卡死。 |

---

## 三、 内置精选样例 (`SAMPLES`)

打开 `index.html` 时默认加载并自动启动 **`showcase · 综合美学演示 (含检查点)`**：

1. **`showcase · 综合美学演示 (含检查点)`**：融合二叉搜索树（`Tree` SVG）、有向图（`Graph` SVG）、哈希频次表（`Map`）、单调栈（`Stack`）与定长滑动窗口（`Array [l..r]`），并在窗口达标处内置 `checkpoint("窗口达标", r, sum, best)`。
2. **`mergesort · 归并排序 (递归调用栈演示)`**：演示分治递归排序过程，直观呈现 `LOCALS` 顶部的多层递归调用栈链条 `global ▸ mergeSort(0, 7) ▸ mergeSort(0, 3) ▸ mergeSort(0, 1)` 及点击栈帧切换历史层局部变量与数组 `[l..r]` 区间。
3. **`debug_crash · 检查点与报错即停演示`**：演示包含运行时异常（`throw new Error(...)`）但静态类型合法的程序如何通过编译进入 Debug 模式，支持在多个 `checkpoint()` 之间跳转，并精准运行到抛出异常的那一行停止。
4. **`lcs · DP (Grid)`**：最长公共子序列二维动态规划矩阵，实时高亮当前写入单元格（`hot`）与状态转移依赖单元格（`deps`）。
5. **`analyze · Map/Set/Stack`**：展示 `Map` 键值统计、`Set` 去重集合与单调栈 `Stack` 的同步演化。
6. **`window · 滑动窗口 [l..r]`**：双指针滑动窗口，自动识别局部变量 `l`、`r` 并在数组上渲染 `[l..r]` 窗口区间条带。
7. **`structures · Tree/Graph/UF/Heap/List`**：集中展示最小堆（`Heap`）、队列（`Queue`）、并查集（`UF`）、单链表（`List`）、二叉树（`Tree`）与有向图（`Graph`）。
8. **`counter · 简单赋值`**：轻量循环累加与条件分支，适合观察行间赋值、比较与飞入动画。
9. **`classes · 类 / 字段 / 方法`**：演示 `class`、字段初始值、构造器与方法调用；进入方法后调用栈显示 `global ▸ runCounter(1, 3) ▸ add(2)`，`WATCH` 里的 `this` 卡片实时展示实例字段（`total` / `history`）的变化。
10. **`async_loop · 异步 Event Loop (async/await/Promise/Timer)`**：演示泛型 `sleep<T>`（基于标准 `new Promise` + `setTimeout`）、`async / await`、`Promise.resolve().then(...)` 与 `queueMicrotask` 的完整事件循环调度顺序，实时呈现微任务先于宏任务定时器执行、协程挂起与恢复的全过程。

---

## 四、 核心技术管线架构

### 1. 静态类型检查器与 TS Worker 桥接 (`src/compiler/type-checker.ts`)
- **第一遍（Pass 1）**：收集 `interface`、`type`（含泛型类型别名、条件类型 `extends ? :`、`infer` 模式匹配、多行映射类型 `{ [K in keyof T]: ... }`）、`class`（含泛型类 `class Box<T>`、构造器参数属性、`extends`）、`enum`、`namespace` 与函数重载签名。
- **第二遍（Pass 2）**：逐行推导表达式类型并校验：
  - 支持泛型函数调用推断、`<T, K extends keyof T>` 约束检查与索引访问类型 `T[K]` 求值；
  - 支持分布式条件类型、递归 `infer` 解包与内置工具类型（`Partial`、`Required`、`Readonly`、`Pick`、`Omit`、`Record`、`ReturnType`、`Parameters`、`Awaited`）；
  - 支持 `new Promise<T>((resolve, reject) => ...)` 与 `new Promise(function(resolve) { ... })` 构造器回调参数类型推断；
  - 支持三元表达式与单行 `if (x !== undefined) return x;` 类型收窄；
  - 区分同构联合数组 `string[] | number[]` 与异构联合元素数组 `(number | string)[]`。
- **官方 TypeScript Web Worker 协同**：在浏览器环境中后台启动 `editor/ts-worker.bundle.js`，将官方 `typescript` 编译器的语义诊断无感合并至编辑器提示中。

### 2. O(n) 词法感知类型剥离与语法降级器 (`src/compiler/transpile.ts`)
- 严格保留原始源码行号 1:1 映射，确保调试高亮与报错行号零偏差。
- 支持将 `enum` / `const enum` 展开为同行 IIFE，将 `namespace` 展开为同行对象闭包，将构造器参数属性 `constructor(private x: number)` 自动注入 `this.x = x;`，将 `abstract` 方法体降级为空方法存根，并擦除装饰器、函数重载无体签名与 `declare` 声明。
- 对未闭合 `<` 比较运算符具备行级短路保护，1400 行连续 `<` 比较可在数毫秒内完成剥离。

### 3. 语句级自动插桩与异步协程改写 (`src/compiler/instrumenter.ts`)
- 在独立可执行语句前插入 `__t(line, note, snapFn, this)` 快照钩子，并在 `while` / `for` / `else if` 条件内部注入逗号表达式钩子。
- 将 `async function` 自动改写为由 `__t.__async(function* () { ... })` 驱动的生成器协程，将 `await expr` 改写为 `yield __t.__await(expr, fid, line, label)`，使按需重放引擎与 `PAUSE_SIGNAL` 能够跨 `await` 边界精确挂起与恢复调用栈帧。

### 4. 确定性虚拟事件循环 (`src/runtime/event-loop.ts` & `src/runtime/runner.ts`)
- 提供沙箱内确定性调度的 `VirtualPromise`、`setTimeout`、`clearTimeout`、`queueMicrotask` 与 `sleep`。
- 同步主线程代码执行完毕后，`drainEventLoop` 严格按照 **「清空所有排队微任务 (FIFO) → 推进虚拟时钟至最近到期宏任务定时器 → 执行一个宏任务 → 再次清空微任务」** 的标准事件循环模型驱动执行，并在每一步快照中生成 `ds.eventLoop` 可视化数据。

---

## 五、 构建、测试与部署

### 1. 常用命令
```bash
npm ci                 # 安装依赖 (codemirror, typescript, esbuild)
npm run build:editor   # 打包 js/app.bundle.js, editor/cm.bundle.js 与 editor/ts-worker.bundle.js
npx tsc --noEmit       # 运行 src/**/*.ts 模块化 TypeScript 类型检查
npm test               # 运行端到端自动化测试套件 (node test-pipeline.mjs)
npm run build          # 打包全部 bundle + 运行测试 + 生成 dist/ 纯静态发布目录
npm start              # 构建并启动服务 (默认端口 3000，或使用 node python/serve.mjs 监听 5180)
```

### 2. 部署说明
- `npm run build` 会生成完整的 `dist/` 静态目录（含 `index.html`、`share.html`、`js/app.bundle.js`、`editor/cm.bundle.js`、`editor/ts-worker.bundle.js`、`css/app.css`、`app-session.js`、`python/` 及四份文档）；直接将 `dist/` 上传至 GitHub Pages、Vercel、Cloudflare Pages、Netlify 或 Nginx 即可零后端运行。
