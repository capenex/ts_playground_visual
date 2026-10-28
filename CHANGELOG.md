# Changelog

本项目的所有重要特性新增、架构演进与问题修复均记录于此。

---

## [v0.8.0] - 2026-10-27 · 架构纯粹化与门禁模块化：移除 Python 子系统 (ADR-001) & 重构 `test-pipeline.mjs`

### 📜 架构决策记录（Architecture Decision Record）

#### ADR-001：废弃并物理移除 Python (Pyodide) 子系统，收敛为单语言 TypeScript 可视化引擎
- **状态（Status）**：已批准并完成实施（2026-10-27）
- **背景与问题（Context）**：
  1. **架构异构与工程割裂**：TypeScript 主引擎已完成 7 层单向无环图（DAG）、`strict + noUncheckedIndexedAccess`、`0 any / 0 ! / 0 as` 的全量模块化重构；而早期加入的 Python 子系统（`/python/py_engine.js`、`py_worker.js`、`py_bridge.py`）仍为游离于 TypeScript 编译管线之外的原生 JS + Python 脚本，通过 `window.PY_ENGINE` 全局桥在 16 个核心 TS 模块中硬编码了 `if (appState.LANG === 'python')` 分支。
  2. **双引擎能力代差**：TypeScript 引擎具备 AST 级静态类型诊断（`typecheckTS`）、确定性虚拟事件循环（`async/await` / `Promise` / `setTimeout` 可视化）、6 门交互式进阶课程与按需惰性步进求值；Python 模式仅能借助外部 CDN 的 Pyodide WASM（~15MB）做全量轨迹预跑与 `ast.parse` 语法检查，且强依赖 `SharedArrayBuffer`（`COOP/COEP` 跨源隔离响应头）。
  3. **后续演进路线冲突**：项目后续核心迭代聚焦于 **TypeScript 多文件模块联动运行（Multi-file `import/export`）** 与 **1080p 60fps 视频导出深度优化**。若继续维持双语言架构，VFS 模块解析、多文件标签页状态机及快照归一化层均需承受双倍耦合成本。
- **评估选项（Options Considered）**：
  - *方案 A（全面弃用并移除 Python 子系统）*：物理删除 `/python/*`、`/examples/python/*` 与 `src/samples/py-samples.ts`，清理全部 16 个 TS 模块中的双语言分支，全仓收敛为纯 TypeScript 引擎。
  - *方案 B（重构 Python 桥接层为强类型 TS 插件）*：耗费高昂工程预算重写 `py_engine.js` 与 Worker 协议，但仍无法消除 Pyodide ~15MB 外部 CDN 依赖与能力代差。
  - *方案 C（冻结现状）*：保留历史技术债，持续拖慢后续 TS 多文件运行与视频导出迭代。
- **最终决策（Decision）**：采用 **方案 A**，果断割舍 Python 子系统，将项目定位收敛为纯粹的 **TypeScript Playground VISUAL (Visual TypeScript Engine)**。
- **得失权衡（Consequences — Gains vs. Losses）**：
  - **【得 · 架构与工程收益（Gains）】**：
    1. **核心架构纯粹化与认知负载减半**：物理删除 11 个 Python 相关文件，清理 16 个 TS 模块中的双语言条件分支（`runner.ts`、`notebook-kernel.ts`、`memory-normalizers.ts`、`format.ts` 等），全仓收敛为 **33 个纯 TypeScript 模块（21 个纯逻辑实现模块 + 1 个环境声明模块 100% 0 DOM / 0 Storage）**，消除双套栈帧与堆快照格式转换隐患。
    2. **包体积缩减与 100% 离线自包含**：移除 `@codemirror/lang-python` 后，`editor/cm.bundle.js` 体积由 **668 KB 降至 528 KB（直降 140 KB / -21%）**；彻底摆脱对外部 jsDelivr Pyodide CDN（~15MB WASM）及服务器 `COOP/COEP` 跨源隔离响应头的依赖，任何静态托管平台开箱即用。
    3. **为后续核心特性扫清障碍**：VFS、脚本标签栏与编译器管线不再受 `.py` 分支掣肘，可将 100% 研发精力投入 **TypeScript 多文件模块联动步进** 与 **WebM 录制渲染管线优化**。
  - **【失 · 功能牺牲与迁移代价（Losses & Trade-offs）】**：
    1. **丧失双语言教学与算法刷题受众**：彻底失去在浏览器端编写、运行和单步可视化调试 `.py` 脚本与 Python Jupyter Notebook 的能力；习惯使用 Python 刷题（LeetCode 风格）或希望在同一沙箱内做「TS vs. Python 同题对比教学」的用户将无法使用 Python 模式。
    2. **丧失 Python 标准库开箱即用的算法表达力**：Python 内置的 `collections.deque`、`Counter`、`defaultdict`、`heapq`、`bisect` 以及简洁切片/列表推导式在算法原型验证上比 TypeScript 更简短；移除后，用户必须使用 TypeScript 手写或基于数组/Map 构造对应数据结构。
    3. **前期研发沉没成本核销**：早期投入精力攻克的 `py_bridge.py` AST 行级追踪器、`SharedArrayBuffer + Int32Array` Worker 同步阻塞通信机制、Python `dict`/`set`/`tuple`/类实例堆图归一化规则，以及 6 个精心编写的 Python 算法示例（`quickstart.py`、`bfs.py`、`binary_search.py`、`lcs.py`、`structures.py`、`classes.py`）全部作废。
    4. **向后兼容性折损**：历史上生成的包含 `lang=python` 的分享链接或本地保存的 `.py` 工作区缓存不再可执行（仅能由 `app-session.js` 与 `vfs-store.ts` 自动降级回退至 TypeScript 默认工作区，避免页面白屏崩溃）。

---

### 🧪 测试架构模块化拆分（`test-pipeline.mjs` ➔ `/tests/01..05`）与门禁漏洞根治
- **领域模块化拆分（2,529 行单体 ➔ 52 行总控 + 5 大领域套件）**：
  - 新增 `/tests/harness.mjs`（共享 VM 沙箱与词法级源码清洗器），并将原 2,529 行的 `test-pipeline.mjs` 按架构分层拆分为：
    - `tests/01-static-gates.test.mjs`（10 大架构/类型安全静态门禁 + `tsc --noEmit` + HTML/沙箱完整性）
    - `tests/02-compiler-typecheck.test.mjs`（TS 转译、插桩、静态类型检查器与 10 个内置 TS 示例）
    - `tests/03-runtime-debug.test.mjs`（`runOnce` 死循环看门狗、按需单步调试、调用栈深度、`checkpoint()` 与虚拟事件循环）
    - `tests/04-viz-editor.test.mjs`（数据结构分类、焦点窗口切片、`VIZ` 渲染、`hl` 高亮、CM6 Bundle 与 WebM 封装）
    - `tests/05-workspace-nb.test.mjs`（`/workspace` VFS、`fs` 垫片、多标签页、Notebook 内核与 6 门 TS 进阶课程）
- **根治静态门禁盲区与架构违规**：
  - **修复模板插值与正则字面量扫描盲区**：升级 `stripCommentsAndStrings` 支持跳过正则字面量 `/.../` 并递归扫描模板字符串插值 `${...}`，捕获并消除了 `src/runtime/event-loop.ts`（第 401–405 行）隐藏在 `${...}` 内的 4 处 `as` 断言。
  - **实现 21 个纯逻辑实现模块 100% 零 DOM / 零 Storage 引用（Gate 9 全量覆盖）**：将 `StepVizElement extends HTMLElement` 迁至 `src/ui/dom.ts`；在 `src/runtime/vfs-store.ts` 中引入 `registerVfsStorageAdapter` 依赖注入接口，将 `localStorage` 读写下沉至 `src/ui/vfs.ts`。
  - **新增 Gate 10（Python 零残留与 33 模块精确数量门禁）**：强制校验 `/python`、`/examples/python`、`src/samples/py-samples.ts` 物理清零，全仓精确 33 个 TS 模块且 `PY_ENGINE` / `__py_meta__` / `__py_cls__` 出现次数为 `0`。
  - **无浏览器环境 E2E 冒烟兜底**：为 `smoke-e2e.mjs` 增加容器无 Chrome 二进制时的 Headless VM 冒烟回退路径。
- **核心文档全量同步**：同步更新 `ARCHITECTURE.md`、`README.md`、`USER_GUIDE.md`、`SYNTAX_REFERENCE.md`、`DEPLOY.md`、`CHANGELOG.md`。

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
