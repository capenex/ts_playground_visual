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

