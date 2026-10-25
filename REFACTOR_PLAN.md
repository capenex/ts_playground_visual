# TypeScript 模块化重构工作流计划 (REFACTOR_PLAN.md)

本文档记录将当前基于全局脚本 (`js/01-*.js` ~ `js/10-*.js`) 的架构平滑迁移为现代模块化 TypeScript 工程 (`src/**/*.ts`) 的完整步骤、模块映射关系与验收标准，防止上下文压缩丢失进度。

---

## 一、 核心重构原则

1. **零功能回退**：重构过程中保持现有 TypeScript 编译器 Worker、异步事件循环可视化（Call Stack / Web APIs / Microtasks / Macrotasks）、内存堆图、Python 引擎 (`python/py_engine.js`)、会话管理 (`app-session.js`) 100% 正常工作。
2. **契约兼容**：在迁移完成前，通过 `src/main.ts` 将外部脚本（如 `python/py_engine.js`、`app-session.js`、`editor/cm-entry.js`、`test-pipeline.mjs`）依赖的少量核心桥接函数挂载到 `globalThis`，确保渐进式替换随时可编译、可测试。
3. **纯静态产物**：使用 `esbuild` 将 `src/main.ts` 打包为浏览器直接运行的 bundle，支持 GitHub Pages / Vercel / Cloudflare Pages / Netlify 零后端静态部署。

---

## 二、 目标目录结构 (`src/` · 17 个严格化 TypeScript 模块)

```text
├── src/
│   ├── types.ts                  # 全局核心数据结构与严格接口定义 (Diag, Frame, StepSnapshot, NotebookDocument 等)
│   ├── globals.d.ts              # 全局桥接变量、CodeMirror 6 桥接与 WebCodecs API 环境声明
│   ├── state.ts                  # 集中式运行时与 UI 状态管理 (替代原分散的全局变量)
│   ├── samples/
│   │   ├── ts-samples.ts         # TypeScript 内置示例与默认步进配置 (SAMPLES, SAMPLE_DEFAULT_STEP)
│   │   └── py-samples.ts         # Python / 多语言示例桥接支持
│   ├── compiler/
│   │   ├── comments.ts           # stripComments, splitTopLevel, splitStatements 及字符串/注释掩码工具
│   │   ├── transpile.ts          # TS 类型擦除与全语法降级编译器 (stripTypes, transpileEnums, transpileNamespaces)
│   │   ├── instrumenter.ts       # 语句级自动插桩器与 async/await 协程改写 (instrument, collectNames, resolveEntry)
│   │   └── type-checker.ts       # 同步静态类型检查器、接口/类元数据提取与 TS Worker 诊断桥接 (typecheckTS)
│   ├── runtime/
│   │   ├── event-loop.ts         # 确定性虚拟事件循环调度器 (createVirtualEventLoop, VirtualPromise, setTimeout)
│   │   └── runner.ts             # 沙箱执行器与按需步进轨迹生成 (startDebug, computeAndAppendNextStep, runOnce)
│   ├── viz/
│   │   ├── highlight.ts          # 声明感知语法高亮、波浪线同步与悬停查看器 (hl, collectDeclaredNames, hoverInfoFor)
│   │   ├── memory-graph.ts       # 调用栈面包屑与 14 类数据结构可视化渲染器 (classifyValue, VIZ, renderStatic)
│   │   └── ast-view.ts           # 行间求值胶囊 (#stepViz) 与飞入动画渲染 (buildStepVizRow, deriveAnimAndNote)
│   ├── ui/
│   │   ├── controls.ts           # 步进器、播放控制、动态检查点注入、文件导入/改名/导出与分栏拖拽
│   │   ├── notebook.ts           # Jupyter 风格交互式笔记本引擎 (多标签 .ipynb、跨单元格上下文、单元格级单步 Debug)
│   │   └── share.ts              # 1920×1080 60fps WebCodecs/WebM 视频导出器、样例加载与启动引导 (boot)
│   └── main.ts                   # 统一入口：初始化 DOM 事件，挂载全局兼容桥接接口
├── editor/
│   ├── cm-entry.js               # CodeMirror 6 编辑器源码入口
│   └── ts-worker-entry.js        # 官方 TypeScript 编译器 Web Worker 源码入口
├── python/
│   └── py_engine.js              # Python 引擎模块
├── scripts/
│   ├── build-editor.mjs          # 打包 js/app.bundle.js、editor/cm.bundle.js 与 editor/ts-worker.bundle.js
│   └── build.mjs                 # 生成 dist/ 生产环境纯静态发布目录
├── test-pipeline.mjs             # 自动化端到端测试套件（含 Strict TS Gate 静态门禁）
└── tsconfig.json                 # TypeScript 工业级严格模式配置 (strict + noUncheckedIndexedAccess)
```

---

## 三、 原 `js/01..10` 到 `src/` 17 模块的映射表

| 原文件 / 功能域 | 目标 TypeScript 模块 | 关键导出内容与职责 |
| :--- | :--- | :--- |
| `js/01-prelude-and-samples.js` | `src/types.ts`, `src/globals.d.ts`, `src/state.ts`, `src/samples/ts-samples.ts`, `src/samples/py-samples.ts` | 核心领域接口定义、全局类型声明、响应式状态中心、10 个内置 TS 示例 `SAMPLES` 与 `SAMPLE_DEFAULT_STEP` |
| `js/02-comments-and-transpile.js` | `src/compiler/comments.ts`, `src/compiler/transpile.ts` | 导出 `stripTypes`, `transpileEnums`, `transpileNamespaces`, `extractConstructorParamProps`, `blankLine` |
| `js/03-instrumenter.js` | `src/compiler/instrumenter.ts` | 导出 `instrument`, `collectNames`, `resolveEntry`, `blankJsLine`, `rewriteAsyncFunctions` |
| `js/04-ast.js` | `src/viz/ast-view.ts` | 导出 `buildStepVizRow`, `deriveAnimAndNote`, `enrichFromNote`, `launchFlyChips` |
| `js/05-type-checker.js` | `src/compiler/type-checker.ts` | 导出 `typecheckTS`, `extractTsInterfaceMetadata`, `scheduleWorkerTypecheck` |
| `js/06-run-trace.js` | `src/runtime/event-loop.ts`, `src/runtime/runner.ts` | 导出 `createVirtualEventLoop`, `startDebug`, `computeAndAppendNextStep`, `runOnce` |
| `js/07-highlight.js` | `src/viz/highlight.ts` | 导出 `hl`, `hlActiveLine`, `collectDeclaredNames`, `hoverInfoFor`, `hoverTipHtml` |
| `js/08-memory-viz.js` | `src/viz/memory-graph.ts` | 导出 `classifyValue`, `VIZ`, `renderStatic`, `renderCallStack`, `selectStackFrame` |
| `js/09-ui-and-playback.js` | `src/ui/controls.ts` | 导出 `stepNext`, `stepPrev`, `runToNextCheckpoint`, `addCheckpointFunction`, `loadImportedSource` |
| `js/10-init.js` | `src/ui/share.ts`, `src/main.ts` | 导出 `exportVideo`, `fixWebmDuration`, `loadSample`, `boot` 及全局兼容桥接挂载 |
| 新增：交互式笔记本 | `src/ui/notebook.ts` | 导出 `setViewMode`, `getActiveNotebook`, `runNotebookCell`, `debugNotebookCell`, `typecheckNotebookCellTS`, `importIpynbFile`, `exportActiveNotebookIpynb` |

---

## 四、 外部兼容契约（Global Bridge）

为了保证 `python/py_engine.js`、`app-session.js`、`editor/cm-entry.js` 和 `test-pipeline.mjs` 无缝协作，`src/main.ts` 会在 `window` / `globalThis` 上暴露以下严格类型的桥接属性：

- **编辑器与 Worker 桥接**：`window.__cmEditor`, `window.__cmCreateNotebookCellEditor`, `window.liveTypeDiags`, `window.updateEditorChrome`, `window.syncScroll`, `window.scheduleAutoDebug`
- **多语言、会话与测试桥接**：`window.SAMPLES`, `window.stripTypes`, `window.typecheckTS`, `window.instrument`, `window.startDebug`, `window.stepNext`, `window.stepPrev`, `window.runOnce`, `window.setViewMode`, `window.getActiveNotebook`, `window.runNotebookCell`, `window.debugNotebookCell`, `window.typecheckNotebookCellTS`, `window.__tsPlaygroundSessionHook`

---

## 五、 分阶段执行步骤与检查清单 (Checklist)

- [x] **阶段 1：前置问题修复与基线加固**
  - [x] 修复 `new Promise(function(resolve) { ... })` 匿名函数参数在内置类型检查器与运行时中的识别问题
  - [x] 更新 `async_loop` 示例，显式声明基于标准 `new Promise` + `setTimeout` 的 `sleep` 函数，兼容官方 TypeScript Playground
  - [x] 验证 `node test-pipeline.mjs` 100% 通过

- [x] **阶段 2：搭建 TypeScript 编译与打包基础设施**
  - [x] 创建 `tsconfig.json`（配置 `target: "ES2022"`, `module: "ESNext"`, `moduleResolution: "bundler"`）
  - [x] 创建 `src/types.ts` 与 `src/state.ts`
  - [x] 更新 `scripts/build-editor.mjs` 支持将 `src/main.ts` 打包为 `dist/app.bundle.js`（或 `js/app.bundle.js`）

- [x] **阶段 3：迁移编译器与运行时核心层 (`01` ~ `06`)**
  - [x] 迁移 `src/samples/ts-samples.ts` (`01`)
  - [x] 迁移 `src/compiler/comments.ts` 与 `src/compiler/transpile.ts` (`02`)
  - [x] 迁移 `src/compiler/instrumenter.ts` (`03`)
  - [x] 迁移 `src/compiler/type-checker.ts` (`05`)
  - [x] 迁移 `src/runtime/event-loop.ts` 与 `src/runtime/runner.ts` (`06`)
  - [x] 运行 `node test-pipeline.mjs` 验证编译器与运行时输出完全一致

- [x] **阶段 4：迁移可视化与 UI 交互层 (`04`, `07` ~ `10`)**
  - [x] 迁移 `src/viz/ast-view.ts` (`04`)
  - [x] 迁移 `src/viz/highlight.ts` (`07`)
  - [x] 迁移 `src/viz/memory-graph.ts` (`08`)
  - [x] 迁移 `src/ui/controls.ts`, `src/ui/share.ts`, `src/main.ts` (`09`, `10`)

- [x] **阶段 5：切换 HTML 引用、清理旧脚本与生产构建验证**
  - [x] 更新 `index.html` 与 `scripts/build.mjs` 使用打包后的模块化产物
  - [x] 移除旧的 `js/01-*.js` ~ `js/10-*.js`
  - [x] 运行 `npm run build` 与 `node test-pipeline.mjs` 进行最终验收

- [x] **阶段 6：全代码库严格化改造 (`src/**/*.ts` 零 `any`、零 `!`、严格索引检查)**
  - [x] 开启 `tsconfig.json` 工业级严格配置：`strict: true`、`noUncheckedIndexedAccess: true`、`noUnusedLocals: true`、`noUnusedParameters: true`、`noImplicitOverride: true`、`noFallthroughCasesInSwitch: true`
  - [x] 建立 `src/globals.d.ts` 与 `src/types.ts` 完整类型契约，彻底消除 `src/**/*.ts` 全部 17 个模块中的 `any` 与非空断言 `!`
  - [x] 将严格化静态扫描与 `tsc --noEmit` 零报错断言写入 `test-pipeline.mjs` 自动化验收流水线

---

## 六、 严格化 TypeScript 编程规范与每次更新验收清单 (Mandatory Per-Update Acceptance Checklist)

> **强制铁律**：此后对本项目的**每一次代码修改或功能新增**，都必须严格遵守以下编程规范，并在提交前逐项通过下方验收清单，严禁退化或绕过。

### 6.1 严格化编程红线（零容忍规则）
1. **严禁任何形式的 `any` 类型**：
   - `src/**/*.ts` 中出现 `: any`、`as any`、`any[]`、`Array<any>`、`Record<..., any>`、`Map<..., any>`、`Set<any>`、`Promise<any>` 的次数必须严格为 **`0`**。
   - 动态外部数据或沙箱返回值必须使用 `unknown` 接收，配合类型守卫（Type Guards）、`typeof` / `instanceof` / `Array.isArray` 收窄，或使用 `src/types.ts` 中显式建模的领域接口（如 `StepAnim`、`StepSnapshot`、`PlaygroundElement`、`PyPayload` 等）。
2. **严禁非空断言操作符 (`!`)**：
   - `src/**/*.ts` 中禁止使用后缀非空断言（如 `arr[i]!`、`map.get(k)!`、`el!.value`）。
   - 在 `noUncheckedIndexedAccess: true` 下，所有数组下标访问 `arr[i]`、正则捕获组 `m[1]`、字典索引 `obj[k]` 必须通过条件判断、空值合并 `??` 或可选链 `?.` 安全收窄。
3. **严禁压制编译器报错**：
   - 严禁在任何文件中使用 `@ts-ignore`、`@ts-expect-error`、`@ts-nocheck` 或 `eslint-disable`。
4. **严禁回退 `tsconfig.json` 严格编译选项**：
   - 必须始终保持：
     - `"strict": true`
     - `"noUncheckedIndexedAccess": true`
     - `"noUnusedLocals": true`
     - `"noUnusedParameters": true`
     - `"noImplicitOverride": true`
     - `"noFallthroughCasesInSwitch": true`

### 6.2 每次更新必跑验收清单（Per-Update Verification Workflow）
每次修改代码后，必须按顺序执行并通过以下 4 步验证（任一步失败均视为未完成）：

- [ ] **Step 1 — 严格类型检查 (`tsc --noEmit`)**：
  运行 `node node_modules/typescript/bin/tsc --noEmit`，确保退出码为 `0` 且无任何类型错误。
- [ ] **Step 2 — 重新打包模块产物 (`build-editor.mjs`)**：
  运行 `node scripts/build-editor.mjs`，确保 `js/app.bundle.js`、`js/cm-bundle.js`、`js/ts-worker.js` 同步更新且无打包警告。
- [ ] **Step 3 — 端到端与严格化门禁测试 (`test-pipeline.mjs`)**：
  运行 `node test-pipeline.mjs`，确保包含源码 `0 any` / `0 !` / `0 @ts-ignore` 门禁扫描与 `tsc --noEmit` 在内的全部自动化测试 100% 通过。
- [ ] **Step 4 — 生产环境构建校验 (`npm run build` / `compile_applet`)**：
  运行 `npm run build`（或调用 `compile_applet` 工具），确保 `dist/` 静态生产构建与全链路校验 100% 成功。

