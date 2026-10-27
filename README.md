# Algorithm Visualizer (Visual TypeScript & Python Engine)

一个纯前端、零后端依赖的**双引擎（TypeScript & Python）算法与内存拓扑可视化沙箱**，同时内建完整的 **Jupyter Notebook (`.ipynb`) 交互式文档模式**、**虚拟文件系统（VFS）** 与 **多文件脚本标签页（Script Tabs）**。

通过 AST 级编译插桩（TypeScript 引擎）与 `sys.settrace` 字节码追踪（Python Pyodide Web Worker 引擎），将代码执行过程中的**词法/语法树（AST）**、**函数调用栈帧（Call Stack）**、**堆内存对象图与指针拓扑（Heap Graph & SVG Links）**、**异步事件循环（Macrotasks / Microtasks）** 以及 **7 类核心数据结构（矩阵、二叉树、有向/无向图、链表、栈/队列、哈希表、一维 DP 数组）** 转化为可逐帧前进、倒退、打断点、跨语言对比的交互式动画。

---

## ✨ 核心特性

- **双语言执行引擎**
  - **TypeScript 引擎**：内置教育级静态类型检查器（`src/compiler/type-checker.ts` + `tc-infer.ts` + `tc-eval.ts`）、TS ➔ JS 轻量转译器（`src/compiler/transpile.ts`）、AST 步进插桩器（`src/compiler/instrumenter.ts`）与确定性虚拟事件循环沙箱（`src/runtime/event-loop.ts`，支持 `async/await`、`Promise`、`setTimeout`）。
  - **Python 引擎**：基于 Web Worker + Pyodide (`WASM`) + `sys.settrace` 的毫秒级行步进追踪，支持 `SharedArrayBuffer` 零延迟中断或 Worker 重生降级。
- **Jupyter Notebook (`.ipynb`) 双模工作台**
  - 一键在 **Script 单文件/多标签调试模式** 与 **Notebook 多单元格交互模式** 之间无缝切换。
  - 纯数据与视图解耦架构（`src/notebook/notebook-model.ts` + `src/notebook/notebook-kernel.ts` + `src/ui/notebook.ts`）：支持 **Code Cell**（跨单元格共享变量与函数作用域）与 **Markdown Cell**（标题、列表、表格、代码块、行内公式渲染）。
  - 任意 Code Cell 点击 **「🔍 送入可视化器」** 即可将该单元格代码连同前置单元格上下文一并送入步进沙箱逐帧剖析。
  - 完整兼容标准 **Jupyter `.ipynb` (v4)** 文件导入与导出。
- **VFS 虚拟文件系统与多标签页工作区**
  - 内置纯内存领域模型（`src/runtime/vfs-store.ts` 与 `src/runtime/script-tabs-store.ts`）与侧边栏 UI（`src/ui/vfs.ts`、`src/ui/script-tabs.ts`），支持新建、重命名、删除、快照导入导出及多脚本标签快速切换。
- **深度内存与数据结构可视化**
  - **栈与堆拓扑图**：自动分离基本类型（Primitive）与引用类型（Heap Reference），使用贝塞尔曲线动态绘制栈变量到堆对象、堆对象之间的引用关系，支持循环引用检测与脉冲动画。
  - **7 类结构智能识别**：自动将符合特征的数组/对象渲染为 **2D 矩阵网格**、**SVG 层次树（Binary/N-ary Tree）**、**圆形布局图（Graph 邻接表）**、**单/双向链表**、**栈/队列**、**哈希表桶视图** 或 **1D 数组索引视图**。
  - **生命周期脉冲动画**：精确高亮每一步的新建变量（`var-new`）、数值变更（`var-changed`）、数组元素读写（`arr-read` / `arr-write`）与新建堆节点（`heap-new`）。
- **工程化导出与分享**
  - **🔗 URL 状态分享**：将代码、语言、断点全部编码进 URL Hash，零服务器一键分享。
  - **📦 独立 HTML 播放器导出**：生成单文件离线可交互播放器（内嵌全部录制帧数据与 SVG 拓扑渲染器）。
  - **🎬 WebM 视频录制**：基于纯二进制封装器（`src/utils/webm-muxer.ts`）与 WebCodecs `VideoEncoder` 在浏览器端直接合成高清动画视频。

---

## 📁 目录结构（34 模块七层单向架构）

项目采用严格的**数据与 UI 视图分离（Data / UI Separation）**与**单向有向无环图（DAG）**架构。在 `src/` 下的 **34 个 TypeScript 模块**中，**24 个核心模块完全零 DOM 依赖**，详情请参阅 [`ARCHITECTURE.md`](./ARCHITECTURE.md)。

```text
├── index.html                  # 主应用工作台入口 (Script + Notebook 双模式)
├── share.html                  # 轻量级独立分享/嵌入播放器页面
├── server.mjs                  # AI Studio / 本地开发服务器 (0.0.0.0:3000 + COOP/COEP 头)
├── tsconfig.json               # TypeScript 严格模式配置 (strict + noUncheckedIndexedAccess)
├── src/                        # 模块化 TypeScript 源码 (34 个模块，编译为 js/app.bundle.js)
│   ├── types.ts                # [L1 0-DOM] 全量核心数据结构与类型契约定义
│   ├── state.ts                # [L2 0-DOM] 全局状态树 appState 与 uiHooks 依赖倒置注册表
│   ├── globals.d.ts            # [L2 0-DOM] 第三方运行时最小声明 (0 隐式 DOM 全局变量)
│   ├── main.ts                 # [L7 DOM]   应用启动入口、快捷键绑定与 window.App 门面导出
│   ├── utils/
│   │   ├── format.ts           # [L1 0-DOM] 值格式化、HTML 转义与耗时格式化纯函数
│   │   └── webm-muxer.ts       # [L1 0-DOM] 纯二进制 EBML / Matroska / WebM 视频封装器
│   ├── samples/
│   │   ├── ts-samples.ts       # [L1 0-DOM] 内置 10 个 TypeScript 算法与异步示例
│   │   └── py-samples.ts       # [L1 0-DOM] 内置 6 个 Python 算法示例
│   ├── compiler/
│   │   ├── comments.ts         # [L3 0-DOM] 源码注释清洗与位置映射
│   │   ├── transpile-helpers.ts# [L3 0-DOM] TS 泛型擦除、修饰符剥离与参数属性展开辅助函数
│   │   ├── transpile.ts        # [L3 0-DOM] TypeScript ➔ JavaScript 轻量转译流水线
│   │   ├── instrumenter.ts     # [L3 0-DOM] Acorn AST 解析、步进插桩与复杂度分析
│   │   ├── tc-types.ts         # [L3 0-DOM] 静态类型检查器符号表与作用域结构定义
│   │   ├── tc-eval.ts          # [L3 0-DOM] 类型兼容性判定與泛型替换求值
│   │   ├── tc-infer.ts         # [L3 0-DOM] AST 表达式静态类型推导引擎
│   │   └── type-checker.ts     # [L3 0-DOM] 教育级 TypeScript 静态类型检查器主入口
│   ├── runtime/
│   │   ├── event-loop-env.ts   # [L4 0-DOM] 虚拟事件循环沙箱宿主环境构造器
│   │   ├── event-loop.ts       # [L4 0-DOM] 虚拟宏任务/微任务队列调度器
│   │   ├── runner.ts           # [L4 0-DOM] TS/Python 沙箱执行器与状态编排
│   │   ├── vfs-store.ts        # [L4 0-DOM] VFS 虚拟文件系统纯内存领域模型
│   │   └── script-tabs-store.ts# [L4 0-DOM] 多文件脚本标签页纯状态模型
│   ├── notebook/
│   │   ├── notebook-model.ts   # [L5 0-DOM] Jupyter .ipynb 序列化、Cell CRUD 与 Markdown 纯渲染
│   │   └── notebook-kernel.ts  # [L5 0-DOM] Notebook 跨单元格共享作用域求值内核
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
│       └── share.ts            # [L7 DOM]   URL 分享与独立 HTML 播放器导出
├── editor/                     # CodeMirror 6 编辑器与 TS 语言服务 Worker 打包源码及产物
├── python/                     # Python 引擎 (py_engine.js, py_worker.js, py_bridge.py)
├── examples/                   # 独立示例库 (examples/ts/*.ts, examples/python/*.py, examples/notebooks/*.ipynb)
├── scripts/                    # 构建脚本 (build-editor.mjs, build.mjs)
├── test-pipeline.mjs           # 9 大架构/类型安全静态门禁 + 编译器/运行时/纯模块自动化测试
└── smoke-e2e.mjs               # Playwright Headless Chromium 端到端全链路冒烟测试
```

---

## 🚀 快速启动与开发指南

### 1. 安装依赖与启动开发服务器

```bash
npm install
npm run dev
```

启动后访问 `http://localhost:3000`。`server.mjs` 默认启用 `Cross-Origin-Opener-Policy: same-origin` 与 `Cross-Origin-Embedder-Policy: require-corp` 响应头，从而激活 `SharedArrayBuffer` 零延迟 Python 中断能力。

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

项目提供两套自动化测试脚本，包含 **9 大静态架构与类型安全门禁**（强制 `0 any`、`0 !`、`0 @ts-ignore`、`0 as` 类型断言、`0 循环依赖`、`纯数据层 0 DOM 引用`）：

```bash
# 1. 静态门禁 + 编译插桩 + 纯模块测试（无需浏览器，毫秒级完成）
node test-pipeline.mjs

# 2. 端到端浏览器全链路冒烟测试（Playwright + Headless Chromium）
node smoke-e2e.mjs
```

---

## 📚 核心文档导航

- 📖 **[项目架构与每次更新验收规范 (`ARCHITECTURE.md`)](./ARCHITECTURE.md)**：34 模块 7 层 DAG 架构详解、`uiHooks` 依赖倒置机制、Zero-`as` 规范与每次代码更新必检清单。
- 🧭 **[用户使用指南 (`USER_GUIDE.md`)](./USER_GUIDE.md)**：界面布局、单步调试技巧、Notebook 交互式笔记用法、VFS 与导出分享操作说明。
- 📐 **[语法与可视化参考手册 (`SYNTAX_REFERENCE.md`)](./SYNTAX_REFERENCE.md)**：TypeScript 与 Python 引擎各自支持的语言特性矩阵、静态类型检查范围以及 7 类数据结构的自动识别规则。
- 🚢 **[构建与部署指南 (`DEPLOY.md`)](./DEPLOY.md)**：静态打包 (`dist/`)、COOP/COEP 跨源隔离头配置以及 GitHub Pages / Cloudflare Pages / Vercel 部署说明。
- 📝 **[版本更新日志 (`CHANGELOG.md`)](./CHANGELOG.md)**：各版本核心特性、架构演进与质量门禁记录。
