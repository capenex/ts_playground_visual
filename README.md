# TypeScript Playground VISUAL (Visual TypeScript Engine)

一个纯前端、零后端依赖、100% 离线自包含的 **TypeScript 算法、静态类型系统与内存拓扑可视化沙箱**，同时内建完整的 **Jupyter Notebook (`.ipynb`) 交互式文档模式**、**虚拟文件系统（VFS）** 与 **多文件脚本标签页（Script Tabs）**。

通过 AST 级编译插桩、教育级静态类型推导与确定性虚拟事件循环，将 TypeScript 代码执行过程中的**词法/语法树（AST）**、**接口与类结构（Interfaces & Classes）**、**函数调用栈帧（Call Stack）**、**堆内存对象图与指针拓扑（Heap Graph & SVG Links）**、**异步事件循环（Macrotasks / Microtasks / Promises）** 以及 **7 类核心数据结构（矩阵、二叉树、有向/无向图、链表、栈/队列、哈希表、一维滑动窗口数组）** 转化为可逐帧前进、倒退、设检查点的交互式动画，并支持浏览器端直接合成 **1080p 60fps WebM 演示视频**。

---

## ✨ 核心特性

- **深度自研 TypeScript 引擎**
  - **教育级静态类型检查器**（`src/compiler/type-checker.ts` + `tc-infer.ts` + `tc-eval.ts`）：支持泛型约束、条件类型与 `infer`、映射类型、内置工具类型（`Partial` / `Pick` / `Omit` / `Record` / `ReturnType` / `Awaited`）、类型守卫 `x is T`、`satisfies` 及跨单元格上下文类型诊断。
  - **TS ➔ JS 轻量转译器与 AST 步进插桩器**（`src/compiler/transpile.ts` + `instrumenter.ts`）：1:1 保留源码行号映射，支持按需单步求值（On-demand step evaluation）与 2 秒死循环看门狗熔断定位。
  - **确定性虚拟事件循环沙箱**（`src/runtime/event-loop.ts` + `event-loop-env.ts`）：支持 `async/await`、`Promise`、`queueMicrotask`、`setTimeout` 及沙箱 `fs.promises` 的逐帧可视化调度。
- **Jupyter Notebook (`.ipynb`) 双模工作台**
  - 一键在 **Script 单文件/多标签调试模式** 与 **Notebook 多单元格交互模式** 之间无缝切换。
  - 纯数据与视图解耦架构（`src/notebook/notebook-model.ts` + `src/notebook/notebook-kernel.ts` + `src/ui/notebook.ts`）：支持 **Code Cell**（跨单元格共享变量、函数、接口与类作用域）与 **Markdown Cell**（标题、列表、表格、代码块渲染）。
  - 内置 **6 门 TypeScript 进阶交互式教学 Notebook 课程**，任意 Code Cell 点击 **「🐞 单步调试」** 即可将该单元格连同前置单元格上下文一并送入步进沙箱逐帧剖析。
  - 完整兼容标准 **Jupyter `.ipynb` (v4)** 文件导入与导出。
- **VFS 虚拟文件系统与多文件模块化运行（Multi-File ES Modules）**
  - 内置纯内存领域模型（`src/runtime/vfs-store.ts` 与 `src/runtime/script-tabs-store.ts`）、模块依赖图构建器（`src/compiler/module-graph.ts`）与侧边栏 UI（`src/ui/vfs.ts`、`src/ui/script-tabs.ts`）。
  - 支持在工作区多个 `.ts` 文件之间使用标准 `import` / `export` 语法进行**跨文件静态类型检查**（含 `TS2307` 模块缺失、`TS2305` 导出缺失、`TS2300` 循环依赖检测与跨模块类型推导）、**跨模块按需单步调试**（步进进入子模块函数时自动切换编辑器标签页并显示 `[file.ts] fn()` 栈帧徽章）以及通过 `import { promises as fs } from 'fs'` 读写工作区文件。
- **深度内存与数据结构可视化**
  - **栈与堆拓扑图**：自动分离基本类型（Primitive）与引用类型（Heap Reference），动态绘制接口/类实例、栈帧与数据结构卡片。
  - **12 种视图渲染器与超大结构焦点窗口**：自动将符合特征的数据渲染为 **2D 矩阵网格**、**SVG 二叉树**、**SVG 拓扑图（Graph）**、**单链表**、**栈/队列/堆/并查集**、**哈希表/集合** 或 **带 `[l..r]` 窗口与指针标签的 1D 数组**；对万级元素数组与百级矩阵自动启用焦点滑动窗口切片。
- **工程化导出与录制**
  - **🎬 1080p 60fps WebM 视频录制**：基于纯二进制封装器（`src/utils/webm-muxer.ts`）与 WebCodecs `VideoEncoder` 在浏览器端直接合成多倍速（`0.75x` ~ `3x`）高清动画视频。
  - **📄 源码与 `.ipynb` 导出**：支持一键导出 `.ts` 脚本或标准 `.ipynb` 笔记本文件。

---

## 📁 目录结构（34 模块七层单向架构）

项目采用严格的**数据与 UI 视图分离（Data / UI Separation）**与**单向有向无环图（DAG）**架构。在 `src/` 下的 **34 个 TypeScript 模块**中，**23 个核心模块完全零 DOM 依赖**（22 个纯逻辑实现模块 + 1 个环境声明模块），详情请参阅 [`ARCHITECTURE.md`](./ARCHITECTURE.md)。

```text
├── index.html                  # 主应用工作台入口 (Script + Notebook 双模式)
├── share.html                  # 轻量级独立分享/沙箱嵌入预览页面
├── server.mjs                  # 本地与生产预览静态服务器 (0.0.0.0:3000)
├── tsconfig.json               # TypeScript 严格模式配置 (strict + noUncheckedIndexedAccess)
├── src/                        # 模块化 TypeScript 源码 (34 个模块，编译为 js/app.bundle.js)
│   ├── types.ts                # [L1 0-DOM] 全量核心数据结构与类型契约定义
│   ├── state.ts                # [L2 0-DOM] 全局状态树 appState 与 uiHooks 依赖倒置注册表
│   ├── globals.d.ts            # [L2 0-DOM] 第三方运行时最小声明 (0 隐式 DOM 全局变量)
│   ├── main.ts                 # [L7 DOM]   应用启动入口、快捷键绑定与全局门面导出
│   ├── utils/
│   │   ├── format.ts           # [L1 0-DOM] 值格式化、HTML 转义与耗时格式化纯函数
│   │   └── webm-muxer.ts       # [L1 0-DOM] 纯二进制 EBML / Matroska / WebM 视频封装器
│   ├── samples/
│   │   └── ts-samples.ts       # [L1 0-DOM] 内置 10 个 TypeScript 算法与异步示例及 6 门教学 Notebook
│   ├── compiler/
│   │   ├── comments.ts         # [L3 0-DOM] 源码注释清洗与位置映射
│   │   ├── transpile-helpers.ts# [L3 0-DOM] TS 泛型擦除、修饰符剥离与参数属性展开辅助函数
│   │   ├── transpile.ts        # [L3 0-DOM] TypeScript ➔ JavaScript 轻量转译流水线
│   │   ├── instrumenter.ts     # [L3 0-DOM] Acorn AST 解析、步进插桩与复杂度分析
│   │   ├── module-graph.ts     # [L3 0-DOM] 多文件 ES Module 依赖图构建、拓扑排序与 1:1 保行号重写
│   │   ├── tc-types.ts         # [L3 0-DOM] 静态类型检查器符号表与作用域结构定义
│   │   ├── tc-eval.ts          # [L3 0-DOM] 类型兼容性判定与泛型替换求值
│   │   ├── tc-infer.ts         # [L3 0-DOM] AST 表达式静态类型推导引擎
│   │   └── type-checker.ts     # [L3 0-DOM] 教育级单文件/多模块 TypeScript 静态类型检查器主入口
│   ├── runtime/
│   │   ├── event-loop-env.ts   # [L4 0-DOM] 虚拟事件循环沙箱宿主环境构造器
│   │   ├── event-loop.ts       # [L4 0-DOM] 虚拟宏任务/微任务队列调度器
│   │   ├── runner.ts           # [L4 0-DOM] TS 沙箱按需步进执行器与状态编排
│   │   ├── vfs-store.ts        # [L4 0-DOM] VFS 虚拟文件系统纯内存领域模型
│   │   └── script-tabs-store.ts# [L4 0-DOM] 多文件脚本标签页纯状态模型
│   ├── notebook/
│   │   ├── notebook-model.ts   # [L5 0-DOM] Jupyter .ipynb 序列化、Cell CRUD 与 Markdown 纯渲染
│   │   └── notebook-kernel.ts  # [L5 0-DOM] Notebook 跨单元格共享作用域求值与单格调试内核
│   ├── viz/
│   │   ├── memory-normalizers.ts # [L6 0-DOM] 7 类算法数据结构纯归一化算法
│   │   ├── ast-view.ts         # [L6 DOM]   交互式 AST 树与作用域面板渲染
│   │   ├── highlight.ts        # [L6 DOM]   代码步进高亮、内联变量气泡提示与编辑器同步
│   │   └── memory-graph.ts     # [L6 DOM]   栈帧、堆内存卡片与 SVG 拓扑连线渲染引擎
│   └── ui/
│       ├── dom.ts              # [L7 DOM]   强类型 DOM 节点惰性查询注册表 (getEl / mustEl)
│       ├── controls.ts         # [L7 DOM]   播放控制、断点、主题、布局与面板切换
│       ├── vfs.ts              # [L7 DOM]   VFS 文件树侧边栏渲染与 localStorage 桥接
│       ├── script-tabs.ts      # [L7 DOM]   多文件脚本标签栏 DOM 渲染与交互
│       ├── notebook.ts         # [L7 DOM]   Notebook 视图层与 Cell 独立 CodeMirror 生命周期
│       ├── video-webm.ts       # [L7 DOM]   Canvas 帧绘制、WebCodecs 编码与 WebM 下载 UI
│       └── share.ts            # [L7 DOM]   URL 分享与启动引导
├── editor/                     # CodeMirror 6 编辑器与 TS 语言服务 Worker 打包源码及产物
├── examples/                   # 独立示例库 (examples/ts/*.ts, examples/notebooks/*.ipynb)
├── scripts/                    # 构建脚本 (build-editor.mjs, build.mjs)
├── tests/                      # 5 大领域自动化测试套件 (01-static-gates ~ 05-workspace-nb) + harness.mjs
├── test-pipeline.mjs           # 10 大架构/类型安全静态门禁 + 全链路自动化测试总控入口
└── smoke-e2e.mjs               # Headless Chromium / VM 端到端全链路冒烟测试
```

---

## 🚀 快速启动与开发指南

### 1. 安装依赖与启动开发服务器

```bash
npm install
npm run dev
```

启动后访问 `http://localhost:3000`。

### 2. 编译与打包脚本

当修改了 `src/**/*.ts` 或 `editor/*.js` 后，运行以下命令重新生成前端 Bundle：

```bash
# 1. 运行 TypeScript 严格模式全量类型检查 (0 errors)
./node_modules/.bin/tsc --noEmit

# 2. 使用 esbuild 重新打包 js/app.bundle.js 与 editor/*.bundle.js
node scripts/build-editor.mjs

# 3. 构建可部署的静态产物目录 dist/
npm run build
```

### 3. 自动化测试与架构门禁验证

项目提供两套自动化测试脚本，包含 **10 大静态架构与类型安全门禁**（强制 `0 any`、`0 !`、`0 @ts-ignore`、`0 as` 类型断言、`0 循环依赖`、`纯数据层 0 DOM 引用`、`Python 历史包袱 0 残留`）：

```bash
# 1. 静态门禁 + 编译插桩 + 纯模块测试（无需浏览器，毫秒级完成）
node test-pipeline.mjs

# 2. 端到端浏览器全链路冒烟测试（Headless Chromium / VM Fallback）
node smoke-e2e.mjs
```

---

## 📚 核心文档导航

- 📖 **[项目架构与每次更新验收规范 (`ARCHITECTURE.md`)](./ARCHITECTURE.md)**：34 模块 7 层 DAG 架构详解、`uiHooks` 依赖倒置机制、Zero-`as` 规范与每次代码更新必检清单。
- 🧭 **[用户使用指南 (`USER_GUIDE.md`)](./USER_GUIDE.md)**：界面布局、单步调试技巧、Notebook 交互式笔记用法、VFS 与视频导出操作说明。
- 📐 **[语法与可视化参考手册 (`SYNTAX_REFERENCE.md`)](./SYNTAX_REFERENCE.md)**：TypeScript 引擎支持的语言特性矩阵、静态类型检查范围以及数据结构的自动识别规则。
- 🚢 **[构建与部署指南 (`DEPLOY.md`)](./DEPLOY.md)**：静态打包 (`dist/`) 与 GitHub Pages / Cloudflare Pages / Vercel 零依赖部署说明。
- 📝 **[版本更新日志 (`CHANGELOG.md`)](./CHANGELOG.md)**：各版本核心特性、架构演进与质量门禁记录。
