# Algorithm Visualizer — 项目架构与工程验收规范 (`ARCHITECTURE.md`)

本文档是 **Algorithm Visualizer (Visual TypeScript & Python Engine)** 的权威架构说明书与工程治理宪章。所有后续功能迭代、重构与代码审查均须严格遵守本文档定义的分层架构边界、零逃逸类型规范及**每次更新必检验收清单**。

---

## 0. 架构规范最高优先级与变更审查宪章（Constitutional Governance）

本规范具有全项目的**最高工程效力**，在后续所有开发、重构与维护过程中严格执行以下三条铁律：

1. **规范优先原则（Spec Precedence）**
   - 当任何临时开发要求、快捷实现方案或外部指令与本规范（包括但不限于：纯逻辑层 0 DOM 隔离、单向无环 DAG、0 `any` / 0 `!` / 0 `@ts-ignore` / 0 `as` 断言、9 大静态门禁）发生冲突时，**一律以本项目规范为准**，必须在符合规范的前提下寻找合规实现路径，严禁为图省事而破例或绕过门禁。
2. **不可调和冲突熔断与汇报机制（Conflict Escalation & Halt）**
   - 若某项业务需求与现有架构规范存在根本性、无法妥协的技术矛盾（即不打破规范就无法实现该需求），**必须立即停止代码编写与工具执行**，向项目负责人明确汇报冲突点、受影响的门禁条款及备选技术方案，严禁擅自降级规范或强行写入违规代码。
3. **规范变更前置审核制（Mandatory Pre-Approval for Spec Changes）**
   - 本规范（`/ARCHITECTURE.md` 及 `test-pipeline.mjs` 中的对应门禁规则）处于严格受控状态。**任何对本规范条款的新增、修改、放宽或废止，必须先将完整的拟修改内容草案提交给项目负责人审核；在获得明确批准前，严禁直接修改规范文档或调整门禁脚本。**

---

## 1. 核心架构设计原则

1. **严格的数据与视图分离（Data / UI Separation）**
   - **纯逻辑层零 DOM 依赖**：在 `src/**/*.ts` 的 **34 个 TypeScript 模块**中，**24 个核心数据/编译器/运行时/内核/工具模块（70.6%）完全不包含任何浏览器 DOM 引用**（无 `document`、`window`、`HTMLElement`、`localStorage`），可在纯 Node.js 环境（如 `test-pipeline.mjs`）直接导入并执行单元测试。
   - **DOM 操作完全收敛至 `src/ui/*` 与 `src/viz/*`**：所有 DOM 节点查询统一由 `src/ui/dom.ts` 强类型惰性注册表（`getEl` / `mustEl`）管理，严禁任何隐式 HTML `id` 全局变量。
2. **单向无环依赖图（Strict Unidirectional DAG）**
   - 全仓模块构成严格的 7 层单向有向无环图（DAG），通过 `test-pipeline.mjs` 中的 **Tarjan 强连通分量（SCC）算法**门禁强制保证 **0 直接循环依赖** 与 **0 多节点传递循环依赖**。
   - 底层状态与运行时通过 `src/state.ts` 的 `uiHooks` 接口实现**依赖倒置（Dependency Inversion）**，严禁底层模块反向 `import` 顶层 UI 视图模块。
3. **100% 零类型逃逸（Zero Type Escape Hatches）**
   - 全仓严格开启 `strict: true` 与 `noUncheckedIndexedAccess: true`。
   - 自动化门禁强制约束：**`0 any`**、**`0 !`（非空断言）**、**`0 @ts-ignore / @ts-expect-error / @ts-nocheck`**、**`0 as` 类型断言（`as const` 除外）**。

---

## 2. 34 模块七层单向架构全景

### 2.1 分层拓扑图

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Layer 7: 应用入口与 UI 视图层 (src/main.ts, src/ui/*) [8 modules, DOM-aware]   │
│   main.ts · controls.ts · vfs.ts · script-tabs.ts · notebook.ts ·            │
│   video-webm.ts · share.ts · dom.ts                                          │
└───────────────┬──────────────────────────────────────────────┬───────────────┘
                │ 单向调用                                      │ 注册 uiHooks
                ▼                                              ▼
┌───────────────────────────────────────────────┐ ┌────────────────────────────┐
│ Layer 6: 可视化渲染与纯归一化层 (src/viz/*)     │ │ Layer 5: Notebook 纯内核层  │
│   ast-view.ts · highlight.ts · memory-graph.ts│ │   notebook-model.ts (0 DOM)│
│   memory-normalizers.ts [0 DOM]               │ │   notebook-kernel.ts(0 DOM)│
└───────────────┬───────────────────────────────┘ └────────────┬───────────────┘
                │                                              │
                ▼                                              ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ Layer 4: 运行时沙箱与领域存储层 (src/runtime/*) [5 modules, 100% 0 DOM]        │
│   runner.ts · event-loop.ts · event-loop-env.ts ·                            │
│   vfs-store.ts · script-tabs-store.ts                                        │
└───────────────┬──────────────────────────────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ Layer 3: TypeScript 编译器与静态类型检查层 (src/compiler/*) [8 modules, 0 DOM] │
│   transpile.ts · transpile-helpers.ts · instrumenter.ts · comments.ts ·      │
│   type-checker.ts · tc-infer.ts · tc-eval.ts · tc-types.ts                   │
└───────────────┬──────────────────────────────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ Layer 2: 核心状态中枢与环境契约层 (src/state.ts, src/globals.d.ts) [0 DOM]    │
│   AppState · appState · uiHooks / registerUiHooks · CONSOLE_LOGS             │
└───────────────┬──────────────────────────────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ Layer 1: 基础类型契约、纯工具与内置示例层 [5 modules, 100% 0 DOM]             │
│   src/types.ts · src/utils/format.ts · src/utils/webm-muxer.ts ·             │
│   src/samples/ts-samples.ts · src/samples/py-samples.ts                      │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 全量 34 个模块职责矩阵

| 层级 | 模块路径 | DOM 依赖 | 核心职责说明 |
| :--- | :--- | :---: | :--- |
| **L1 基础契约与纯工具** | `src/types.ts` | **0 DOM** | 全量核心接口定义（`ASTNode`, `Frame`, `StepAnim`, `HeapObject`, `VizData`, `NotebookDoc` 等） |
| **L1 基础契约与纯工具** | `src/utils/format.ts` | **0 DOM** | 值格式化、HTML 转义、耗时格式化、源码行号构建等纯函数 |
| **L1 基础契约与纯工具** | `src/utils/webm-muxer.ts` | **0 DOM** | 纯二进制 EBML / Matroska / WebM 视频容器封装器（`WebmMuxer`），无任何浏览器依赖 |
| **L1 基础契约与纯工具** | `src/samples/ts-samples.ts` | **0 DOM** | 内置 10 个 TypeScript 算法与异步示例及预期输出（`TS_SAMPLE_EXPECTED`） |
| **L1 基础契约与纯工具** | `src/samples/py-samples.ts` | **0 DOM** | 内置 6 个 Python 算法示例及预期输出（`PY_SAMPLE_EXPECTED`） |
| **L2 状态与契约中枢** | `src/state.ts` | **0 DOM** | 全局单一状态树 `appState`、控制台缓冲 `CONSOLE_LOGS` 及 `uiHooks` 依赖倒置注册表 |
| **L2 状态与契约中枢** | `src/globals.d.ts` | **0 DOM** | 最小化第三方运行时（CodeMirror、Pyodide、WebCodecs）类型声明，0 隐式 DOM 全局变量 |
| **L3 编译器与类型检查** | `src/compiler/comments.ts` | **0 DOM** | 源码注释清洗、字符串遮罩与 AST 位置映射 |
| **L3 编译器与类型检查** | `src/compiler/transpile-helpers.ts` | **0 DOM** | TypeScript 泛型擦除、访问修饰符剥离、参数属性展开等底层文本转换辅助函数 |
| **L3 编译器与类型检查** | `src/compiler/transpile.ts` | **0 DOM** | TS ➔ JS 轻量级转译流水线（Interface/Type 擦除、Enum 展开、类型断言剥离） |
| **L3 编译器与类型检查** | `src/compiler/instrumenter.ts` | **0 DOM** | Acorn AST 解析、变量追踪、步进插桩（`__step__`）、复杂度估算与调用树生成 |
| **L3 编译器与类型检查** | `src/compiler/tc-types.ts` | **0 DOM** | 静态类型检查器内部符号表、接口/类结构与作用域上下文定义 |
| **L3 编译器与类型检查** | `src/compiler/tc-eval.ts` | **0 DOM** | 类型兼容性判定（`typesCompatible`）、字面量拓宽与泛型替换求值 |
| **L3 编译器与类型检查** | `src/compiler/tc-infer.ts` | **0 DOM** | AST 表达式静态类型推导引擎（`inferExprType`） |
| **L3 编译器与类型检查** | `src/compiler/type-checker.ts` | **0 DOM** | 教育级静态类型诊断主入口（`typeCheck`），输出精确行列号的 `TypeErrorInfo[]` |
| **L4 运行时与领域存储** | `src/runtime/event-loop-env.ts` | **0 DOM** | 虚拟事件循环的 `console`、`setTimeout`、`Promise`、`fetch` 沙箱宿主环境构造器 |
| **L4 运行时与领域存储** | `src/runtime/event-loop.ts` | **0 DOM** | 确定性宏任务队列（Macrotasks）与微任务队列（Microtasks）调度引擎 |
| **L4 运行时与领域存储** | `src/runtime/runner.ts` | **0 DOM** | TS/JS 沙箱执行器、Python 帧转换器（`applyPyResult`）与执行状态编排（通过 `uiHooks` 通知 UI） |
| **L4 运行时与领域存储** | `src/runtime/vfs-store.ts` | **0 DOM** | 虚拟文件系统（VFS）纯内存领域模型（路徑归一化、CRUD、快照导入导出、模板生成） |
| **L4 运行时与领域存储** | `src/runtime/script-tabs-store.ts` | **0 DOM** | 多文件脚本标签页（Script Tabs）纯状态管理（打开、切换、重命名、关闭、脏状态同步） |
| **L5 Notebook 内核层** | `src/notebook/notebook-model.ts` | **0 DOM** | Jupyter `.ipynb` v4 序列化/反序列化、Cell 增删改移、Markdown 纯渲染器（`renderMarkdown`） |
| **L5 Notebook 内核层** | `src/notebook/notebook-kernel.ts` | **0 DOM** | 跨 Cell 共享作用域状态机（`NotebookKernel`），支持 TS/JS 顶层声明重写与 Python 跨格执行 |
| **L6 可视化与归一化** | `src/viz/memory-normalizers.ts` | **0 DOM** | 7 类算法数据结构（2D Matrix、Tree、Graph、LinkedList、Stack/Queue、HashMap、DP）纯数据归一化 |
| **L6 可视化与归一化** | `src/viz/ast-view.ts` | DOM | 交互式 AST 语法树、作用域链与复杂度估算徽章渲染 |
| **L6 可视化与归一化** | `src/viz/highlight.ts` | DOM | 源码行级步进高亮、内联变量气泡提示（Tooltip）与 CodeMirror 装饰器同步 |
| **L6 可视化与归一化** | `src/viz/memory-graph.ts` | DOM | 栈帧面板、堆内存卡片、SVG 拓扑连线及对象生命周期脉冲动画渲染 |
| **L7 UI 视图与入口** | `src/ui/dom.ts` | DOM | 强类型 DOM 节点惰性查询注册表（`getEl` / `mustEl`）与动态元素工厂 |
| **L7 UI 视图与入口** | `src/ui/controls.ts` | DOM | 播放控制栏、步进/断点跳转、主题/布局切换、输出与诊断面板更新 |
| **L7 UI 视图与入口** | `src/ui/vfs.ts` | DOM | VFS 侧边栏文件树渲染、上传/下载交互与 `localStorage` 持久化桥接 |
| **L7 UI 视图与入口** | `src/ui/script-tabs.ts` | DOM | 编辑器顶部多标签栏 DOM 渲染与编辑器文档切换绑定 |
| **L7 UI 视图与入口** | `src/ui/notebook.ts` | DOM | Notebook 视图层、Cell 独立 CodeMirror 编辑器生命周期（`WeakMap` 管理）与拖拽交互 |
| **L7 UI 视图与入口** | `src/ui/video-webm.ts` | DOM | Canvas 帧绘制、WebCodecs `VideoEncoder` 硬件编码及视频下载 UI |
| **L7 UI 视图与入口** | `src/ui/share.ts` | DOM | Base64 URL 哈希分享链接生成、独立播放器 HTML 导出与剪贴板交互 |
| **L7 UI 视图与入口** | `src/main.ts` | DOM | 应用启动总装入口：注册 `uiHooks`、绑定全局事件与快捷键、挂载 `window.App` 门面 API |

---

## 3. 核心解耦机制详解

### 3.1 `uiHooks` 依赖倒置机制（消除 `runtime <-> ui` 循环依赖）
`src/runtime/runner.ts` 在代码编译或执行完成后需要触发 UI 刷新（如渲染 AST、更新帧画面、刷新控制台、高亮报错行），但它**绝不直接导入 `src/ui/*` 或 `src/viz/*`**。
- `src/state.ts` 定义了纯接口 `UiHooks` 及默认空操作对象 `uiHooks`。
- `src/main.ts` 在启动阶段调用 `registerUiHooks({...})` 将 UI 与可视化渲染回调注入 `uiHooks`。
- `src/runtime/runner.ts` 仅调用 `uiHooks.renderAST(...)`、`uiHooks.updateFrameUI(...)` 等钩子，从而在 Node.js 单元测试中无需任何 DOM Mock 即可独立运行 `runner.ts`。

### 3.2 零隐式 DOM 全局变量与 `src/ui/dom.ts`
早期代码依赖浏览器将带有 `id="foo"` 的 HTML 元素自动注入 `window.foo` 的非标准行为。现已全面废弃：
- `src/globals.d.ts` 中**零 DOM 元素全局变量声明**。
- 所有 UI 组件统一通过 `src/ui/dom.ts` 提供的 `getEl('btn-play')`（返回可空类型）或 `mustEl('code-input')`（带运行时校验的强类型返回）访问 DOM。

### 3.3 领域 Store 与 UI 视图分离模式
- **VFS 虚拟文件系统**：纯数据逻辑（路径规范化、默认示例注入、JSON 快照序列化）位于 `src/runtime/vfs-store.ts`；DOM 树渲染与 `localStorage` 读写位于 `src/ui/vfs.ts`。
- **多标签页管理**：标签页数组状态机位于 `src/runtime/script-tabs-store.ts`；DOM 标签栏渲染位于 `src/ui/script-tabs.ts`。
- **Notebook 架构**：拆分为 `notebook-model.ts`（文档结构与 Markdown 纯转换）+ `notebook-kernel.ts`（跨格求值内核）+ `src/ui/notebook.ts`（DOM 视图与 CodeMirror 实例 `WeakMap` 绑定）。

---

## 4. 严格 TypeScript 规范（Zero-`as` 工程模式）

本项目对 TypeScript 类型安全执行最高标准：**全仓禁止使用 `as` 类型断言（`as const` 除外）**。在编写或修改代码时，必须采用以下 5 种类型安全模式替代 `as`：

1. **具名联合类型与自定义类型守卫（Type Predicates）**
   - 禁止将 `unknown` 或宽泛接口直接 `as SpecificType`。
   - 必须编写形如 `function isBinaryExpr(node: ASTNode): node is BinaryASTNode` 的类型守卫，利用控制流窄化（Control Flow Narrowing）安全访问字段。
2. **外部输入边界校验器（Boundary Validators）**
   - 对 `JSON.parse()`、Python Worker 返回报文、URL 分享参数等 `unknown` 数据，必须通过显式结构窄化函数（如 `isRecord(v)`、字段类型检查）转换为强类型对象。
3. **DOM 精确构造与类型守卫（DOM Narrowing）**
   - 创建元素使用泛型签名 `document.createElement('canvas')`（自动推导为 `HTMLCanvasElement`）。
   - 事件目标窄化使用 `if (e.target instanceof HTMLElement)` 或 `if (el instanceof HTMLInputElement)`，严禁 `e.target as HTMLElement`。
4. **DOM 私有状态挂载使用 `WeakMap` 旁路表**
   - 严禁在 `HTMLElement` 上直接挂载自定义属性（如 `(el as any)._cm = view`）。
   - 统一使用模块级 `const cellEditors = new WeakMap<HTMLElement, CodeMirrorView>()` 存储关联实例。
5. **可辨识联合与穷尽 `switch`（Discriminated Unions）**
   - 动画事件 `StepAnim`、数据结构可视化 `VizData` 等均定义为可辨识联合类型，通过 `switch (item.type)` 自动窄化每个分支的专属属性。

---

## 5. 以后每次更新的验收清单（Per-Update Acceptance Checklist）

**任何代码变更（新增功能、Bug 修复、性能优化、重构）在提交或交付前，必须完整通过以下三阶段验收清单。任何一项未通过均视为构建失败。**

### 阶段一：架构与代码规范自检（Code Review Checklist）

- [ ] **0. 需求与规范冲突前置审查**：本次更新要求是否与 `ARCHITECTURE.md` 规范存在冲突？若有可调和冲突，是否已按规范修正实现方案？若有无法妥协的根本矛盾，是否已立即停机汇报？若涉及规范本身的修改，修改草案是否已提前提交审核并获得批准？
- [ ] **1. 零类型逃逸检查**：新增或修改的 `.ts` 代码中是否确保 **0 `any`**、**0 `!`（非空断言）**、**0 `@ts-ignore` / `@ts-expect-error`**、**0 `as` 类型断言（`as const` 除外）**？
- [ ] **2. 纯数据层零 DOM 污染检查**：`src/types.ts`、`src/state.ts`、`src/compiler/*`、`src/runtime/*`、`src/notebook/*`、`src/utils/*`、`src/samples/*`、`src/viz/memory-normalizers.ts` 中是否绝未引入 `document`、`window`、`HTMLElement` 或 `localStorage`？
- [ ] **3. 单向依赖方向检查**：是否遵守 `L1 ➔ L2 ➔ L3 ➔ L4 ➔ L5 ➔ L6 ➔ L7` 的单向引用原则？底层模块需触发 UI 更新时是否通过 `src/state.ts` 的 `uiHooks` 完成，而未反向 `import` 上层模块？
- [ ] **4. DOM 访问规范检查**：新增 UI 元素访问是否已登记到 `src/ui/dom.ts` 并使用 `getEl` / `mustEl` 或 `instanceof` 窄化，而非在 `src/globals.d.ts` 中声明隐式全局变量？
- [ ] **5. 索引安全检查**：在 `noUncheckedIndexedAccess: true` 下，所有数组下标访问 `arr[i]` 与字典访问 `map[key]` 是否均已做显式判空或默认值兜底？

### 阶段二：自动化流水线 9 大静态与运行时门禁（Automated Gates）

执行 `node test-pipeline.mjs`，必须 100% 通过其内置的 **9 项架构与类型安全静态门禁** 及 **全部编译器/运行时/纯数据层集成测试**：

| 门禁编号 | 门禁名称 | 验收阈值 | 检测范围 |
| :---: | :--- | :---: | :--- |
| **Gate 1** | 显式 `any` 类型检测 | **`0`** | `src/**/*.ts` 全量 34 个模块 |
| **Gate 2** | 非空断言 `!` 检测 | **`0`** | `src/**/*.ts` 全量 34 个模块 |
| **Gate 3** | `@ts-ignore` / `@ts-expect-error` / `@ts-nocheck` 检测 | **`0`** | `src/**/*.ts` 全量 34 个模块 |
| **Gate 4** | 双重逃逸断言 `as unknown as` 检测 | **`0`** | `src/**/*.ts` 全量 34 个模块 |
| **Gate 5** | 内联匿名结构断言 `as { ... }` / `as (...) => ...` 检测 | **`0`** | `src/**/*.ts` 全量 34 个模块 |
| **Gate 6** | 索引签名袋断言 `as StepAnim` / `as Frame` / `as Record<...>` 检测 | **`0`** | `src/**/*.ts` 全量 34 个模块 |
| **Gate 7** | **全量 `as` 类型断言检测（`as const` 除外）** | **`0`** | `src/**/*.ts` 全量 34 个模块 |
| **Gate 8** | **Tarjan SCC 全图循环依赖检测（2-Cycle & Multi-Node SCC）** | **`0`** | `src/**/*.ts` 全量 34 个模块 |
| **Gate 9** | **纯逻辑层零 DOM 引用隔离检测** | **`0`** | `state.ts`, `runtime/*`, `notebook/*`, `utils/*`, `viz/memory-normalizers.ts` 等 |

### 阶段三：标准五步构建与验证命令（Mandatory 5-Step Verification Commands）

每次代码修改完成后，必须按顺序执行以下 5 条命令且全部零错误通过：

```bash
# Step 1: TypeScript 严格模式全量类型检查（验证 strict + noUncheckedIndexedAccess 0 报错）
./node_modules/.bin/tsc --noEmit

# Step 2: 重新打包前端 Bundle（输出 js/app.bundle.js、editor/cm.bundle.js、editor/ts-worker.bundle.js）
node scripts/build-editor.mjs

# Step 3: 运行全链路自动化门禁与沙箱测试（9 大静态门禁 + 10 个 TS 示例 + 6 个 Python 示例 + 纯模块单测）
node test-pipeline.mjs

# Step 4: 生成并校验生产环境静态发布包 dist/
node scripts/build.mjs

# Step 5: （可选/UI 变更必跑）启动 Headless Chromium 端到端冒烟测试
node smoke-e2e.mjs
```

---

## 6. 文档体系清单

当前仓库保留以下 **6 份核心文档**，各司其职，严禁保留过时的临时重构草案：

| 文档路径 | 定位与职责 |
| :--- | :--- |
| `/README.md` | 项目总览、核心特性、快速启动、目录结构与测试命令速查 |
| `/ARCHITECTURE.md` | **（本文档）** 34 模块分层架构、解耦机制、Zero-`as` 类型规范与每次更新验收清单 |
| `/USER_GUIDE.md` | 面向最终用户的界面操作手册（Script/Notebook 模式、VFS、多标签页、时间旅行调试、WebM 导出） |
| `/SYNTAX_REFERENCE.md` | TypeScript 与 Python 引擎支持语法矩阵、静态类型检查覆盖表与自动识别数据结构规范 |
| `/DEPLOY.md` | 静态构建（`dist/`）、GitHub Pages / Cloudflare Pages / Vercel / Netlify 部署与 COOP/COEP 配置指南 |
| `/CHANGELOG.md` | 版本演进历史与架构里程碑记录 |
