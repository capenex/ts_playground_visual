# Changelog

本项目的所有重要特性新增、架构演进与问题修复均记录于此。

---

## [v0.7.0] - 2026-10-27 · 数据与视图彻底分离（34 模块 DAG）与 100% 零 `as` 类型断言治理

### 🏗️ 五阶段数据与 UI 视图分离重构（17 ➔ 34 模块）
- **阶段一：消除隐式 DOM 全局变量與状态层 DOM 解耦**
  - 新增 `src/ui/dom.ts` 强类型惰性 DOM 注册表（`getEl` / `mustEl`），彻底清空 `src/globals.d.ts` 中的隐式 DOM ID 全局声明。
  - 在 `src/state.ts` 中建立 `uiHooks` / `registerUiHooks` 依赖倒置机制，使 `src/state.ts` 与 `src/runtime/runner.ts` 实现 **100% 零 DOM 引用**，彻底切断 `runtime <-> ui` 循环依赖。
- **阶段二：抽离纯二进制封装与纯数据结构归一化层**
  - 从 `src/ui/video-webm.ts` 中抽离零 DOM 的纯二进制 EBML / Matroska / WebM 容器封装器 `src/utils/webm-muxer.ts`。
  - 从 `src/viz/memory-graph.ts` 中抽离零 DOM 的 7 类算法数据结构归一化纯函数层 `src/viz/memory-normalizers.ts`。
- **阶段三：VFS 虚拟文件系统与多标签页 Store/View 分离**
  - 拆分为纯内存领域模型 `src/runtime/vfs-store.ts`、`src/runtime/script-tabs-store.ts`（均 0 DOM）与薄 DOM 视图层 `src/ui/vfs.ts`、`src/ui/script-tabs.ts`。
- **阶段四：Notebook 三层解耦（Model / Kernel / View）**
  - 将原单体 `src/ui/notebook.ts` 拆分为 `src/notebook/notebook-model.ts`（`.ipynb` 序列化、Cell CRUD、纯 Markdown 渲染，0 DOM）、`src/notebook/notebook-kernel.ts`（跨 Cell 共享作用域状态机，0 DOM）与 `src/ui/notebook.ts`（DOM 视图与 CodeMirror `WeakMap` 生命周期）。
- **阶段五：编译器大文件模块化拆分与全图 SCC 无环门禁**
  - 将静态类型检查器拆分为 `tc-types.ts`、`tc-eval.ts`、`tc-infer.ts`、`type-checker.ts`；转译辅助函数拆分为 `transpile-helpers.ts`；事件循环宿主环境拆分为 `event-loop-env.ts`。
  - 在 `test-pipeline.mjs` 中引入 **Tarjan 强连通分量（SCC）算法**门禁，确保全仓 34 个模块 **0 直接循环依赖** 与 **0 多节点传递循环依赖**，且 **24/34 个模块（70.6%）完全零 DOM 引用**。

### 🛡️ 全仓 100% 零 `as` 类型断言治理（128 ➔ 0）
- **四阶段消除全量 128 处 `as` 类型断言（`as const` 除外）**：
  - **阶段 A**：消除全部 `as unknown as` 双重逃逸、内联匿名结构断言 `as { ... }` 与索引签名袋断言 `as StepAnim` / `as Frame`；为 `StepAnim` 建立 10 分支可辨识联合类型。
  - **阶段 B**：重构 `src/compiler/*` 与 `src/viz/memory-normalizers.ts` 的 AST 节点窄化与堆对象解析，引入 `getChildNode`、`getChildNodeList`、`isHeapGraphEntry` 等纯类型守卫，实现编译器与归一化层 `0 as`。
  - **阶段 C**：重构 `src/runtime/*` 与 `src/notebook/*`，引入 `validateNotebookJSON` 边界校验器、`createSandboxGlobal` 强类型沙箱构造器与 `parsePyRawResult` 校验器，实现运行时与内核层 `0 as`。
  - **阶段 D**：重构 `src/ui/*`、`src/viz/*` 与 `src/main.ts`，使用泛型 `document.createElement`、`instanceof` DOM 守卫与 `WeakMap<HTMLElement, CodeMirrorView>` 旁路表替代 DOM 属性挂载，实现全仓 34 个模块 **`0 as` 类型断言**。
- **新增 `/ARCHITECTURE.md` 架构宪章与每次更新验收清单**：固化 9 大自动化门禁与 5 步标准验证流水线。

---

## [v0.6.0] - 2026-04-17 · 全量 TypeScript 模块化架构升级与严格类型门禁

### 🏗️ 核心架构重构（Legacy JS ➔ Modular TypeScript）
- **全量源码 TypeScript 化**：将原有的 10 个松散全局脚本（`js/01-config.js` ~ `js/10-init.js`）完整重构为 `src/` 下的模块化 TypeScript 架构，统一由 `esbuild` 打包生成 `js/app.bundle.js`。
- **开启最高级别类型安全配置**：
  - `tsconfig.json` 启用 `"strict": true` 与 `"noUncheckedIndexedAccess": true`。
  - 彻底消除显式与隐式 `any`（**0 `any`**）、非空断言（**0 `!`**）以及类型检查忽略指令（**0 `@ts-ignore` / `@ts-expect-error`**）。
- **测试流水线静态门禁集成**：在 `test-pipeline.mjs` 中集成源码级静态扫描测试，自动校验 `src/**/*.ts` 的类型安全约束。

---

## [v0.5.0] - 2026-04-17 · Jupyter Notebook (`.ipynb`) 双模架构与测试套件

### ✨ 新增功能
- **Jupyter Notebook 交互式工作台**：
  - 顶部导航栏新增 **`📜 Script` / `📓 Notebook`** 模式切换器。
  - 支持 **Code Cell**（TypeScript / Python 实时执行、跨单元格共享变量与函数上下文、独立耗时统计与错误诊断）与 **Markdown Cell**（双击编辑、失焦或运行渲染 GFM 标题/列表/表格/代码块/行内公式）。
  - 每个 Code Cell 配备 **「🔍 送入可视化器」** 按钮：自动拼接前置已执行单元格的顶层定义与当前单元格代码，一键切回 Script 可视化工作台进行逐帧 AST 与内存拓扑剖析。
  - 原生支持标准 **Jupyter `.ipynb` (v4)** 格式导入与导出，并在首次进入时预置交互式算法教程笔记（`examples/notebooks/Intro.ipynb`）。
- **自动化验证流水线**：
  - 新增 `test-pipeline.mjs`：在 Node 环境下直接对全部 10 个内置 TypeScript 示例执行「转译 ➔ 类型检查 ➔ AST 插桩 ➔ 虚拟事件循环沙箱执行 ➔ 预期输出断言」。
  - 新增 `smoke-e2e.mjs`：基于 Playwright Headless Chromium 的端到端全链路测试。

---

## [v0.4.0] - 2026-04 · 异步事件循环、WebM 视频导出与静态类型检查增强

### ✨ 新增功能
- **确定性虚拟事件循环（Event Loop Sandbox）**：
  - 支持 `async / await`、`new Promise`、`Promise.resolve().then(...)`、`setTimeout`、`queueMicrotask` 的步进追踪与宏任务/微任务队列可视化。
- **浏览器端 WebM 视频录制**：
  - 基于 WebCodecs `VideoEncoder` (VP8/VP9) 与自定义二进制 EBML/WebM Muxer，将算法执行过程录制为高清 `.webm` 视频文件。
- **教育级 TypeScript 静态类型检查器**：
  - 支持接口（`interface`）结构兼容性检查、函数参数与返回值类型校验、类成员访问权限（`private` / `protected`）、`readonly` 属性赋值拦截以及泛型类型实参推导。

---

## [v0.3.0] - 2026-03 · Python Pyodide 引擎与 7 类数据结构自动可视化

### ✨ 新增功能
- **Python Web Worker 引擎**：
  - 集成 Pyodide + `sys.settrace` 字节码行追踪器（`python/py_bridge.py`），输出与 TypeScript 引擎完全同构的栈帧与堆内存快照。
- **7 类数据结构智能识别与 SVG 拓扑渲染**：
  - 自动识别并渲染 **2D Matrix**、**Binary/N-ary Tree**、**Graph（邻接表）**、**LinkedList（单/双向及环检测）**、**Stack/Queue**、**HashMap/Set** 以及 **1D Array & Index Pointers**。
