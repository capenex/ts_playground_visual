# CHANGELOG · 版本演进与工程架构记录

本项目（**TypeScript Playground VISUAL**）的版本记录分为两个阶段：

1. **第二阶段（进行中 / 未来主线）· エンジニア主导的 AI 辅助工程研发期（AI-Assisted Software Engineering）**：由开发者深入掌握编译器前端、静态类型系统、沙箱虚拟事件循环与数据结构可视化内核后，主导架构设计、技术选型、边界条件控制与代码审查（Code Review），将 AI 作为高效实现与测试生成的结对工具。
2. **第一阶段（已完成基线 v0.1.0 ~ v0.6.0）· 原型探索与工业级工程化奠基期（Vibecoding & Architecture Foundation）**：完成从零依赖单页原型到 **25 个严格模式 TypeScript 模块（0 `any`、0 `!` 非空断言、0 `@ts-ignore`）** 的全链路构建，确立完整的自动化测试门禁与模块化边界。

---

## 📌 后续「AI 辅助编程」阶段提交记录规范（Template）

> 当你开始亲手主导特性研发或重构时，建议每次迭代按照以下工程规范追加在顶部（遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/) 与语义化版本 SemVer）：

```markdown
## [vX.Y.Z] - YYYY-MM-DD · <版本主题一句话概括>

### 🎯 核心架构决策 (Architecture & Design Decisions)
- **问题背景**：为什么要改？（例如：某语法边界不支持 / 大数组渲染帧率下降 / 新增某种 AST 变换）
- **技术方案与取舍**：采用了什么算法或数据结构？为什么选方案 A 而不是方案 B？

### ✨ 新增特性 (Added)
- **[模块名 `src/...`]**：具体新增能力说明与核心函数入口。

### 🔧 架构优化与重构 (Changed / Refactored)
- **[模块名 `src/...`]**：复杂度降低、函数拆分、数据结构或接口契约调整。

### 🐛 边界修复 (Fixed)
- **[模块名 `src/...`]**：修复的 Corner Case、复现输入与根因分析（Root Cause Analysis）。

### ✅ 验收与测试覆盖 (Verification & Tests)
- `test-pipeline.mjs` 新增断言编号 / 测试用例说明；
- `tsc --noEmit` 严格类型门禁与 `0 any` / `0 !` 静态扫描结果。
```

---

## 🏛️ 第一阶段基线：原型探索与工程化奠基记录 (v0.1.0 → v0.6.0)

> 💡 **阅读与复盘指南（面向简历沉淀与技术深挖）**：
> 以下每一代版本均标注了对应的**核心源码文件**与**关键实现机制**。在过渡到自主研发阶段时，可按 `v0.1.0 → v0.6.0` 的顺序逐个模块精读源码与 `test-pipeline.mjs` 中的对应测试。

---

### [v0.6.0] - 2026-10-25 · 虚拟文件系统解耦、Storage Guard 版本守卫与 25 模块高内聚拆分

#### 🎯 核心架构决策
- **内置测试用例与用户工作区（Workspace VFS）彻底解耦**：防止用户在浏览内置算法示例时污染持久化虚拟文件目录（`workspace/`），同时通过沙箱路径强制映射确保示例代码中的文件 I/O 始终锚定在 `workspace/` 根目录下，杜绝跨目录越权读取其他示例。
- **前置同步版本守卫（Pre-boot Storage Guard）**：为解决版本升级后浏览器残留旧结构 `localStorage` 导致白屏或状态异常的问题，在主业务脚本执行前注入极小体积、零依赖、异常静默兜底的 `storage-guard.js`，实现按应用前缀精准清理过期存储及 `?reset=1` 强制初始化。
- **细粒度模块化拆分（25 个严格 TS 模块）**：消除超过千行的巨型文件与百行以上的复杂单函数，按「单一职责原则（SRP）」将类型检查器、转译辅助、事件循环环境、内存图归一化、虚拟文件系统、单文件多标签页与 WebM 容器封装拆分为独立子模块，显著降低后续人工维护与 Code Review 的认知负担。

#### ✨ 新增特性
- **`storage-guard.js`（前置本地存储版本守卫）**：
  - 定义 `APP_STORAGE_VERSION` 与 `APP_STORAGE_PREFIX`（`ts_playground_visual_`），版本不匹配时仅精准清除当前应用命名空间下的键，绝不误删同源其他路径数据；
  - 支持 URL 参数 `?reset=1` 强制清空应用缓存并在清理后通过 `history.replaceState` 剥离 `reset` 参数（完整保留其余 Query 参数与 `#hash` 分享数据）；
  - 全程 `try/catch` 包裹，在隐私模式或禁用 Storage 环境下静默降级，永不阻断页面启动。
- **`src/ui/vfs.ts` & `src/ui/script-tabs.ts`（虚拟文件目录与测试用例双轨管理）**：
  - 打开内置示例时不再写入 `workspace/`，而是在文件目录按钮同行右侧展示「测试用例」胶囊，复用 Notebook 模式的标签页交互；
  - Notebook 模式与 Script 模式统一将文件目录按钮置于编辑器左上方，默认收起目录树，将状态就绪徽章靠右对齐；
  - 标签页关闭按钮升级为右侧无背景 `❌`，点击后在下方弹出二次确认气泡（「是否确认删除」）；
  - 精简导出菜单文案为「📄 导出文件」，并将「🔗 复制分享链接」调整为点击后内联提示「暂未实现」。
- **`src/runtime/event-loop-env.ts`（沙箱 VFS 根目录隔离）**：
  - 当在内置示例文件中调用 `fs.readFileSync` / `fs.writeFileSync` / `fs.promises.*` 时，路径解析强制归一化至 `workspace/` 根目录，并对 `..` 路径穿越抛出标准 `EACCES: permission denied` 异常。

#### 🔧 架构优化与模块拆分
- **静态类型检查器四层拆分（`src/compiler/`）**：
  - `tc-types.ts`：内置工具类型集合、类型字符串词法切分、原始类型归一化与泛型参数解析；
  - `tc-eval.ts`：接口继承展开、映射类型求值、条件类型与 `infer` 递归模式匹配、模板字面量展开及兼容性判定（`typesCompatible`）；
  - `tc-infer.ts`：泛型实参回推（`inferGenericBindings`）、表达式类型推导（`inferExprType`）与收窄辅助；
  - `type-checker.ts`：两遍扫描主流程（Pass 1 声明收集 + Pass 2 语句级校验）与 TS Web Worker 诊断合并。
- **转译器、运行时、可视化与视频导出拆分**：
  - 从 `transpile.ts` 拆出 `transpile-helpers.ts`（`enum` / `namespace` 展开、构造器参数属性注入）；
  - 从 `event-loop.ts` 拆出 `event-loop-env.ts`（沙箱 `fs`、虚拟定时器与内置集合构造器注入）；
  - 从 `memory-graph.ts` 拆出 `memory-normalizers.ts`（链表、二叉树、有向图、并查集的启发式结构识别与归一化算法）；
  - 从 `share.ts` 拆出 `video-webm.ts`（WebM EBML 二进制容器 Duration 修补器 `fixWebmDuration` 与 Canvas 帧绘制）。

---

### [v0.5.0] - 工业级严格模式 TypeScript 全面迁移 (Strict TS Gate)

#### 🎯 核心架构决策
- **告别松散脚本，建立工业级类型安全基线**：将早期按序号加载的全局 JS 脚本（`js/01-*.js` ~ `js/10-*.js`）全面重构为 ES Module 组织的 `src/**/*.ts`，通过 `esbuild` 打包为 `js/app.bundle.js`。
- **最严苛编译配置与静态门禁**：开启 `strict: true`、`noUncheckedIndexedAccess: true`、`noUnusedLocals: true`、`noUnusedParameters: true`，并在 `test-pipeline.mjs` 中内置源码 AST/词法级门禁扫描，强制要求全仓库 **`0 any`、`0 !`（非空断言）、`0 @ts-ignore`**。

#### ✨ 新增与重构模块
- **`src/types.ts` & `src/globals.d.ts`**：集中建模 `Diag`、`Frame`、`StepSnapshot`、`StepAnim`、`NotebookDocument`、`VirtualEventLoop` 等核心领域模型及跨模块 `window` 桥接契约。
- **`src/state.ts`**：响应式全局状态中心，统一管理编辑器、调试轨迹 `steps`、当前步进指针 `idx`、调用栈选中帧与播放定时器。

---

### [v0.4.0] - 交互式算法笔记本引擎 (`📓 Notebook` · `.ipynb`)

#### 🎯 核心架构决策
- **打通「分段探索式编程」与「逐行算法可视化」**：传统 Jupyter Notebook 只能看最终输出，难以观察单元格内部的指针移动与递归栈；本版本将单步插桩调试器深度嵌入每个 `.ipynb` 代码单元格中。

#### ✨ 新增特性
- **`src/ui/notebook.ts`**：
  - 支持 `📄 Script` 与 `📓 Notebook` 双模式无缝切换及多标签页 `.ipynb` 管理（内置 `Intro.ipynb` 与 `Untitled.ipynb`）；
  - **跨单元格上下文累积**：按执行计数 `[1]`, `[2]` 自动提取已执行单元格的顶层变量、函数、类与类型声明，注入后续单元格运行沙箱，并在右侧 `LOCALS` / `WATCH` 面板持续演进内存图；
  - **单元格级单步可视化 Debug（`🐞`）**：支持在继承前序单元格变量的基础上，对当前单元格逐行步进并在单元格内渲染 `#stepViz` 求值胶囊；
  - **跨单元格静态类型检查（`typecheckNotebookCellTS`）**：自动拼接前序已执行单元格声明前缀并修正行号偏移，实现单元格内的精准波浪线报错；
  - 完整兼容 Jupyter Notebook v4 标准 `.ipynb` JSON 导入与导出。

---

### [v0.3.0] - 零延迟静态类型检查器、官方 TS Worker 协同与智能补全

#### 🎯 核心架构决策
- **双层混合类型诊断架构**：手写轻量同步类型检查器（`typecheckTS`）提供毫秒级即时反馈与教學向中文诊断说明，同时在 Web Worker 后台运行官方 `typescript` 编译器（`editor/ts-worker-entry.js`），实现零卡顿的完整语义覆盖。

#### ✨ 新增特性
- **`src/compiler/type-checker.ts`**：
  - 支持接口（`interface extends`、可选/只读属性）、类（`class extends/implements`、访问修饰符 `private/protected/public`、`abstract class`、构造器参数属性、静态成员）、枚举（`enum`）、命名空间（`namespace`）与函数重载签名；
  - 支持高阶类型体操：泛型函数推断、`<T, K extends keyof T>` 约束、索引访问类型 `T[K]`、分布式条件类型 `T extends U ? X : Y`、递归 `infer` 解包、映射类型 `{ [K in keyof T]: ... }`、模板字面量类型、类型谓词 `x is T` / `asserts x` 以及 12 种内置工具类型（`Partial`、`Required`、`Readonly`、`Pick`、`Omit`、`Record`、`Exclude`、`Extract`、`NonNullable`、`ReturnType`、`Parameters`、`Awaited`）。
- **`editor/cm-entry.js`（CodeMirror 6 深度定制）**：
  - 实现基于上下文作用域、接口/类成员及内置 API 的 TypeScript / Python 双语言自动补全；
  - 实现声明感知语法高亮（仅真实声明过的标识符着色为 `#9cdcfe`）与光标同名整词高亮。

---

### [v0.2.0] - 确定性虚拟事件循环（Async Event Loop）与大规模数据焦点视窗

#### 🎯 核心架构决策
- **破解浏览器原生异步无法单步回放的难题**：原生 `async/await` 与 `setTimeout` 由宿主浏览器异步调度，无法在确定性时间轴上随时「上一步 / 下一步」回退。为此设计了**源码级协程改写 + 确定性虚拟事件循环调度器**。

#### ✨ 新增特性
- **`src/compiler/instrumenter.ts` & `src/runtime/event-loop.ts`**：
  - 将 `async function` 自动改写为由 `__t.__async(function* () { ... })` 驱动的生成器协程，将 `await expr` 改写为 `yield __t.__await(...)`；
  - 实现沙箱内确定性 `VirtualPromise`、`setTimeout`、`clearTimeout`、`queueMicrotask` 与 `sleep`；
  - 严格遵循标准事件循环模型：**同步栈执行 → 清空微任务队列（FIFO） → 推进虚拟时钟至最近到期宏任务 → 执行单个宏任务 → 再次清空微任务**；
  - 在 `WATCH` 面板实时渲染 `eventLoop` 可视化卡片（虚拟时钟、协程挂起态、Microtasks 队列、Macrotasks 队列与 Promise 状态表）。
- **大规模数据结构焦点切片（`src/viz/memory-graph.ts`）**：
  - 一维数组/链表超过 20 项或二维网格超过 `10×10` 时，自动围绕当前读写下标及双指针（`l`/`mid`/`r`/`slow`/`fast`）生成焦点切片视窗（`1D Focal Slice` & `2D Sliding Grid`），兼顾万级数据量性能与局部细节观察。

---

### [v0.1.0] - 双语言可视化调试内核与 14 类数据结构自动渲染（初代原型）

#### ✨ 核心能力奠基
- **O(n) 行号保真类型擦除器（`src/compiler/transpile.ts`）**：在不改变任何源码行号的前提下剥离 TypeScript 类型注解并降级 `enum` / `namespace` / 构造器参数属性，确保运行时堆栈与源码行号 1:1 严格对齐。
- **语句级自动插桩与按需重放引擎（`src/compiler/instrumenter.ts` & `src/runtime/runner.ts`）**：
  - 自动在语句与循环条件中注入 `__t(line, note, snapFn, this)` 钩子；
  - 支持 `checkpoint()` 检查点直接跳转、动态点击行号注入/移除检查点且不丢失当前步进进度、运行时异常精准停在报错行。
- **14 类数据结构启发式识别与 SVG/DOM 渲染（`src/viz/memory-graph.ts` & `ast-view.ts`）**：
  - 自动识别并可视化：一维数组（含 `[l..r]` 窗口条带）、二维 DP 网格（含 `hot` 当前写入格与 `deps` 状态转移依赖高亮）、链表（`List`）、二叉树（`Tree` SVG）、有向图（`Graph` SVG）、堆（`Heap`）、栈（`Stack`）、队列（`Queue`）、并查集（`UF`）、`Map`、`Set`、类实例（`this`）等；
  - 实现当前行上方求值胶囊（`#stepViz`）、数值变更飞入动画（`launchFlyChips`）、递归调用栈面包屑切换与 `1920×1080 60fps` WebM 视频录制导出。
- **Python 3 双内核支持（`python/`）**：基于 Pyodide Web Worker 与 `sys.settrace` / AST 桥接，实现与 TypeScript 共用同一套前端可视化面板的跨语言调试体验。
