# TypeScript 模块化重构工作流计划 (REFACTOR_PLAN.md)

本文档记录将当前基于全局脚本 (`js/01-*.js` ~ `js/10-*.js`) 的架构平滑迁移为现代模块化 TypeScript 工程 (`src/**/*.ts`) 的完整步骤、模块映射关系与验收标准，防止上下文压缩丢失进度。

---

## 一、 核心重构原则

1. **零功能回退**：重构过程中保持现有 TypeScript 编译器 Worker、异步事件循环可视化（Call Stack / Web APIs / Microtasks / Macrotasks）、内存堆图、Python 引擎 (`python/py_engine.js`)、会话管理 (`app-session.js`) 100% 正常工作。
2. **契约兼容**：在迁移完成前，通过 `src/main.ts` 将外部脚本（如 `python/py_engine.js`、`app-session.js`、`editor/cm-entry.js`、`test-pipeline.mjs`）依赖的少量核心桥接函数挂载到 `globalThis`，确保渐进式替换随时可编译、可测试。
3. **纯静态产物**：使用 `esbuild` 将 `src/main.ts` 打包为浏览器直接运行的 bundle，支持 GitHub Pages / Vercel / Cloudflare Pages / Netlify 零后端静态部署。

---

## 二、 目标目录结构 (`src/`)

```text
├── src/
│   ├── types.ts                  # 全局核心数据结构与接口定义 (Diag, Frame, HeapObj, EventLoopSnapshot, StepSnapshot 等)
│   ├── state.ts                  # 集中式运行时与 UI 状态管理 (替代原分散的全局变量)
│   ├── samples/
│   │   ├── ts-samples.ts         # TypeScript 内置示例与预期输出 (SAMPLES, EXPECTED_LINES)
│   │   └── py-samples.ts         # Python / 多语言示例桥接支持
│   ├── compiler/
│   │   ├── comments.ts           # stripComments, splitTopLevel, splitStatements
│   │   ├── transpile.ts          # TS 类型擦除与全语法降级编译器 (transpileTS, findSyntaxErrors)
│   │   ├── instrumenter.ts       # AST/行级插桩器与异步状态快照捕获 (instrument, formatVal)
│   │   └── type-checker.ts       # 内置快速静态类型诊断器与 TS Worker 诊断桥接 (typeCheck, liveTypeDiags)
│   ├── runtime/
│   │   ├── event-loop.ts         # 虚拟事件循环调度器 (VirtualPromise, setTimeout, queueMicrotask, sleep)
│   │   └── runner.ts             # 沙箱执行器与步进轨迹生成 (runTrace, rebuildFromSource)
│   ├── viz/
│   │   ├── highlight.ts          # 语法高亮与符号收集 (highlightTS, collectDeclaredNames)
│   │   ├── memory-graph.ts       # 栈帧、堆内存卡片、SVG 引用连线与异步队列面板渲染 (renderMemory, drawArrows)
│   │   └── ast-view.ts           # AST 语法树构建与视图渲染 (buildAST, renderAST)
│   ├── ui/
│   │   ├── controls.ts           # 步进器、播放控制、断点、主题切换、下拉示例管理
│   │   └── share.ts              # URL Hash 压缩分享与解码逻辑
│   └── main.ts                   # 统一入口：初始化 DOM 事件，挂载必要的全局兼容接口
├── editor/
│   ├── cm-entry.js               # CodeMirror 6 编辑器入口
│   └── ts-worker-entry.js        # 官方 TypeScript 编译器 Web Worker
├── python/
│   └── py_engine.js              # Python 引擎模块
├── scripts/
│   ├── build-editor.mjs          # 打包编辑器、TS Worker 与主应用 bundle
│   └── build.mjs                 # 生成 dist/ 生产环境纯静态发布目录
├── test-pipeline.mjs             # 自动化端到端测试套件
└── tsconfig.json                 # TypeScript 严格模式与模块化配置
```

---

## 三、 原 `js/01..10` 到 `src/` 的逐文件映射表

| 原文件 | 目标 TypeScript 模块 | 关键导出内容与职责 |
| :--- | :--- | :--- |
| `js/01-prelude-and-samples.js` | `src/types.ts`, `src/state.ts`, `src/samples/ts-samples.ts` | 导出 `SAMPLES`, `EXPECTED_LINES`, 应用状态单例 `appState`，以及通用 DOM/转义工具函数 (`esc`) |
| `js/02-comments-and-transpile.js` | `src/compiler/comments.ts`, `src/compiler/transpile.ts` | 导出 `stripComments`, `splitTopLevel`, `splitStatements`, `findSyntaxErrors`, `transpileTS` |
| `js/03-instrumenter.js` | `src/compiler/instrumenter.ts` | 导出 `instrument`, `formatVal`, `__describeHeapVal` |
| `js/04-ast.js` | `src/viz/ast-view.ts` | 导出 `buildAST`, `renderAST` |
| `js/05-type-checker.js` | `src/compiler/type-checker.ts` | 导出 `typeCheck`, `parseType`, `typeToStr`, `isAssignable`, `inferExpr` |
| `js/06-run-trace.js` | `src/runtime/event-loop.ts`, `src/runtime/runner.ts` | 导出 `runTrace`, `VirtualPromise` 及虚拟异步 API (`setTimeout`, `queueMicrotask`, `sleep`) |
| `js/07-highlight.js` | `src/viz/highlight.ts` | 导出 `highlightTS`, `collectDeclaredNames` |
| `js/08-memory-viz.js` | `src/viz/memory-graph.ts` | 导出 `renderMemory`, `renderAsyncQueues`, `drawArrows`, `scheduleArrowRedraw` |
| `js/09-ui-and-playback.js` | `src/ui/controls.ts` | 导出 `renderStep`, `rebuildFromSource`, `stepForward`, `stepBack`, `togglePlay` 等 |
| `js/10-init.js` | `src/ui/share.ts`, `src/main.ts` | 导出 `initApp`, 绑定窗口与按钮事件，处理分享链接 |

---

## 四、 外部兼容契约（Global Bridge）

为了保证 `python/py_engine.js`、`app-session.js`、`editor/cm-entry.js` 和 `test-pipeline.mjs` 无缝协作，`src/main.ts` 会在 `window` / `globalThis` 上暴露以下桥接属性：

- **编辑器与 Worker 桥接**：`window.__cmView`, `window.liveTypeDiags`, `window.breakpoints`, `window.currentStepLine`, `window.rebuildFromSource`, `window.scheduleRebuild`, `window.syncGutterAndHighlight`, `window.updateCursorPos`
- **多语言引擎桥接 (`python/py_engine.js` & `app-session.js`)**：`window.SAMPLES`, `window.EXPECTED_LINES`, `window.steps`, `window.idx`, `window.renderStep`, `window.setStatus`, `window.transpileTS`, `window.typeCheck`, `window.instrument`, `window.runTrace`, `window.buildAST`, `window.highlightTS`

---

## 五、 分阶段执行步骤与检查清单 (Checklist)

- [ ] **阶段 1：前置问题修复与基线加固**
  - [ ] 修复 `new Promise(function(resolve) { ... })` 匿名函数参数在内置类型检查器与运行时中的识别问题
  - [ ] 更新 `async_loop` 示例，显式声明基于标准 `new Promise` + `setTimeout` 的 `sleep` 函数，兼容官方 TypeScript Playground
  - [ ] 验证 `node test-pipeline.mjs` 100% 通过

- [ ] **阶段 2：搭建 TypeScript 编译与打包基础设施**
  - [ ] 创建 `tsconfig.json`（配置 `target: "ES2022"`, `module: "ESNext"`, `moduleResolution: "bundler"`）
  - [ ] 创建 `src/types.ts` 与 `src/state.ts`
  - [ ] 更新 `scripts/build-editor.mjs` 支持将 `src/main.ts` 打包为 `dist/app.bundle.js`（或 `js/app.bundle.js`）

- [ ] **阶段 3：迁移编译器与运行时核心层 (`01` ~ `06`)**
  - [ ] 迁移 `src/samples/ts-samples.ts` (`01`)
  - [ ] 迁移 `src/compiler/comments.ts` 与 `src/compiler/transpile.ts` (`02`)
  - [ ] 迁移 `src/compiler/instrumenter.ts` (`03`)
  - [ ] 迁移 `src/compiler/type-checker.ts` (`05`)
  - [ ] 迁移 `src/runtime/event-loop.ts` 与 `src/runtime/runner.ts` (`06`)
  - [ ] 运行 `node test-pipeline.mjs` 验证编译器与运行时输出完全一致

- [ ] **阶段 4：迁移可视化与 UI 交互层 (`04`, `07` ~ `10`)**
  - [ ] 迁移 `src/viz/ast-view.ts` (`04`)
  - [ ] 迁移 `src/viz/highlight.ts` (`07`)
  - [ ] 迁移 `src/viz/memory-graph.ts` (`08`)
  - [ ] 迁移 `src/ui/controls.ts`, `src/ui/share.ts`, `src/main.ts` (`09`, `10`)

- [ ] **阶段 5：切换 HTML 引用、清理旧脚本与生产构建验证**
  - [ ] 更新 `index.html` 与 `scripts/build.mjs` 使用打包后的模块化产物
  - [ ] 移除旧的 `js/01-*.js` ~ `js/10-*.js`
  - [ ] 运行 `npm run build` 与 `node test-pipeline.mjs` 进行最终验收
