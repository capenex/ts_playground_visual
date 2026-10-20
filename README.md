# TypeScript Playground VISUAL · 项目架构与技术文档

**TypeScript Playground VISUAL** 是一个**零前端框架依赖**的 **TypeScript / Python 可视化演练场与按需逐行 Debug 调试器**。核心界面、类型剥离器、内置子集类型检查器、插桩引擎与 12 种数据结构渲染器集中在 `index.html`；自动保存 / 分享链接拆在 `app-session.js`，Python 模式拆在 `python/`。TypeScript 模式不依赖 CDN 或后端，但当前版本请通过静态 HTTP 服务打开（`node python/serve.mjs`）；若要恢复单文件离线分发，需要在构建时把这些脚本内联。

> **类型检查边界**：内置 `typecheckTS` 是项目自带的**子集检查器**，不是 TypeScript 官方 `tsc`，也不调用语言服务。它覆盖常用语法，可能漏报 / 误报；以实际运行和 `tsc` 为准。页面 SOURCE 旁的「TS 子集检查」可查看完整边界。

---

## 📚 文档导航

本项目提供三份配套中文文档，面向不同阅读场景：

1. **[`README.md`（本文档 · 项目架构与部署维护指南）](./README.md)**：介绍项目整体架构、核心管线设计、内置样例、构建/测试/部署流程。
2. **[`USER_GUIDE.md`（面向用户的操作说明手册）](./USER_GUIDE.md)**：图文式讲解界面布局、如何编写可调试代码、如何使用 `checkpoint()` 检查点、如何排查类型错误与运行时异常、以及如何导出 1080p 60fps 视频。
3. **[`SYNTAX_REFERENCE.md`（支持的 TypeScript 语法与可视化范围参考手册）](./SYNTAX_REFERENCE.md)**：详列内置子集类型检查器（`typecheckTS`，非完整 tsc）支持的规则与错误码、类型剥离器（`stripTypes`）与自动插桩器（`instrument`）支持的语法边界、以及 12 种数据结构可视化识别规则。

---

## 一、 核心特性一览

| 模块 / 区域 | 核心能力说明 |
|---|---|
| **左上品牌栏 (`TypeScript Playground VISUAL`)** | 蓝青渐变 `TS` 徽标 + 主副标题层级排版 + 垂直居中的琥珀流光 `VISUAL` 标识。 |
| **顶部工具栏 (`#top`)** | 顶部 `TS / PY` 语言切换；9 个 TypeScript + 6 个 Python 内置样例（切换后自动开启 Debug 调试）、**`📂 导入`**（读取本地 `.ts/.tsx/.js/.jsx/.txt/.py` 到编辑器）、`▶ 运行`（直接求值）、`🐞 Debug 调试`（编译通过后开启按需步进模式），以及右上角 **「⬇ 导出 / 下载 ▾」** 下拉菜单。 |
| **右上角「⬇ 导出 / 下载」菜单** | 集成 **「📄 导出 TypeScript / Python 文件」**（按 SOURCE 标题栏的可改名文件名下载，缺扩展名时按当前语言补 `.ts` / `.py`）、**「🔗 复制分享链接」**（gzip + base64url 放进 URL hash，打开 `share.html` 的 sandboxed iframe，只加载不自动运行）与 **「🎬 导出视频 (`1920×1080 · 60fps`)」**（WebM，实验性），内含相对于自动速度的 **5 档倍速调节按钮（`0.75x` / `1x` / `1.5x` / `2x` / `3x`）**。 |
| **会话与分享** | 自动保存代码 / 文件名 / 语言到 `localStorage`，刷新后恢复但不自动运行；分享页使用 `sandbox="allow-scripts allow-downloads"`（无 `allow-same-origin`）隔离，TS 分享代码不能访问主页面 DOM / localStorage。 |
| **左侧：SOURCE 统一源码编辑与调试画布（CodeMirror 6）** | 编辑代码与单步 Debug 共用同一区域；CodeMirror 6 提供查找 / 替换、多光标（`Ctrl/Cmd+D`、`Alt+点击`）、光标所在词的同名整词匹配（无需选中，蓝色下划线标示，跳过字符串 / 注释）、括号匹配 / 自动闭合、自动缩进、代码折叠、撤销 / 重做与错误波浪线。**只有真正声明过的名字**（`const/let/var`、函数/箭头参数、循环与 `catch` 绑定、函数/类/接口名）显示为浅蓝色（`#9cdcfe`）；内置变量 / 函数（`console`、`Math`、`checkpoint`、`len`、`range` 等）使用暖金色（`#dcdcaa`）；未声明的名字保持白色，一眼即可看出「这个词没有来源」。比较 / 逻辑运算符与普通运算符保持白色，匹配括号显示金色辉光。步进时在**当前执行行的正上方浮出一枚可视化求值胶囊**（独立浮层 `#stepViz`，`z-index` 高于代码层，不占行内空间；赋值 `assign`、比较 `compare`、调用 `call`、检查点 `checkpoint` 或运行时异常 `RUNTIME ERROR`）。标题栏的 **`TS ␣ 文件名` 芯片可直接点击改名**（`Enter` 提交 / `Esc` 撤销），导入与导出共用这个名字。 |
| **面向对象 / 泛型调试 (`class` · `enum` · 泛型)** | class 方法体会逐行插桩，调用栈出现 `global ▸ runCounter(1, 3) ▸ add(2)` 这样的帧；方法内的 `this` 以卡片进入 `WATCH`，字段（`total` / `history`…）随步进实时变化。`enum`（数字 / 字符串 / `const`）被展开成**等行号**的 IIFE，步进轨迹与报错行号不变；泛型类、`<T,>` 箭头、调用点实参在运行期擦除。`constructor(private x)`、装饰器、`abstract`、`namespace` 会给出明确的人话提示而不是 `Unexpected token`。 |
| **悬停查看器 (`#hoverTip`)** | Debug 模式下把鼠标停在任意变量/数据结构（源码里或 `LOCALS`/`WATCH` 卡片上）即可弹出浮层：名字、类型/结构种类、**当前帧的实时值**，结构变量还会附带一份同款可视化（数组/树/图/Map/Grid…）。当前帧找不到时自动回退到 `global` 帧，所有取值都来自当前这一步的快照，不会提前执行代码。 |
| **报错定位（CodeMirror 波浪线 + 控制台跳转）** | 内置子集类型检查的报错**实时**（边写边检）标在对应行：CodeMirror 红色波浪线 + 行号提示；控制台每条诊断可点击跳转到该行。`▶ 运行` 阶段的运行时报错也会通过编译栈行号映射回**源码行**（`fnBodyLineOffset` / `sourceLineFromStack`），而不是只给一句「调用失败」。 |
| **行号与检查点交互** | 点击任意行号（或行号旁的 `◉`）即可在代码中自动插入/移除 `checkpoint();`；CodeMirror gutter 与代码行严格对齐，并**保持当前所在的调试步骤进度不重置回第一步**。 |
| **中间：可拖拽分隔条 (`#resizer`)** | 左右拖动自由调节代码区与右侧面板宽度（当右侧面板拉窄至 `< 440px` 时卡片自动切换为单列布局；双击分隔条一键恢复默认比例）。 |
| **右侧：调用栈面包屑 · LOCALS · WATCH · 控制台** | 在 `LOCALS` 区域顶部实时展示当前函数调用链条（如 `global ▸ mergeSort(0, 7) ▸ mergeSort(0, 3) ▸ mergeSort(0, 1)`），**点击任意栈帧面包屑即可切换查看对应栈帧的局部变量（`LOCALS`）、数据结构窗口状态（`WATCH`）与调用行位置**；下方展示自适应网格卡片与底部单步执行详情。 |
| **底部 Debug 控制栏 (`#ctl`)** | 提供 `‹ 上一步`、非数字状态徽章（`● 调试运行中` / `◉ 命中检查点` / `✗ 运行时报错` / `✓ 执行完毕`，不展示具体步号与总步数）、`下一步 ›`、左下角 **`⏭ 运行到下一个检查点`**、**`＋ 添加检查点函数`** 以及 **`▶ 自动`** 连续播放。 |
| **运行看门狗 (`RUN_TIMEOUT_MS`)** | `▶ 运行` 的代码同样会经过插桩，每个循环条件里都埋一次预算检查：**墙钟超过 2 秒就当场抛错终止**（`while (true) {}` 这种空循环也拦得住），不会再把整个标签页卡死。终止后控制台给出「疑似死循环 · 位置：第 N 行 · 该行代码」，编辑器把该行标红并滚动过去；点一下诊断还能跳回该行。 |

---

## 二、 内置精选样例 (`SAMPLES`)

打开 `index.html` 时默认加载并自动启动 **`showcase · 综合美学演示 (含检查点)`**：

1. **`showcase · 综合美学演示 (含检查点)`**：融合二叉搜索树（`Tree` SVG）、有向图（`Graph` SVG）、哈希频次表（`Map`）、单调栈（`Stack`）与定长滑动窗口（`Array [l..r]`），并在窗口达标处内置 `checkpoint("窗口达标", r, sum, best)`。
2. **`mergesort · 归并排序 (递归调用栈演示)`**：演示分治递归排序过程，直观呈现 `LOCALS` 顶部的多层递归调用栈链条 `global ▸ mergeSort(0, 7) ▸ mergeSort(0, 3) ▸ mergeSort(0, 1)` 及点击栈帧切换历史层局部变量与数组 `[l..r]` 区间。
3. **`debug_crash · 检查点与报错即停演示`**：演示包含运行时异常（`throw new Error(...)`）但静态类型合法的程序如何通过编译进入 Debug 模式，每走一步当场计算、支持在多个 `checkpoint()` 之间跳转，并精准运行到抛出异常的那一行停止。
4. **`lcs · DP (Grid)`**：最长公共子序列二维动态规划矩阵，实时高亮当前写入单元格（`hot`）与状态转移依赖单元格（`deps`）。
5. **`analyze · Map/Set/Stack`**：展示 `Map` 键值统计、`Set` 去重集合与单调栈 `Stack` 的同步演化。
6. **`window · 滑动窗口 [l..r]`**：双指针滑动窗口，自动识别局部变量 `l`、`r` 并在数组上渲染 `[l..r]` 窗口区间条带。
7. **`structures · Tree/Graph/UF/Heap/List`**：集中展示最小堆（`Heap`）、队列（`Queue`）、并查集（`UF`）、单链表（`List`）、二叉树（`Tree`）与有向图（`Graph`）。
8. **`counter · 简单赋值`**：轻量循环累加与条件分支，适合观察行间赋值、比较与飞入动画。
9. **`classes · 类 / 字段 / 方法`**：演示 `class`、字段初始值、构造器与方法调用；进入方法后调用栈显示 `global ▸ runCounter(1, 3) ▸ add(2)`，`WATCH` 里的 `this` 卡片实时展示实例字段（`total` / `history`）的变化。

---

## 三、 核心技术管线架构

### 1. 默认开启的内置子集类型检查器 (`typecheckTS`，非完整 tsc)
在点击「▶ 运行」或「🐞 Debug 调试」前，引擎首先执行双遍静态类型检查（`STRICT_TS = true`）。该检查器是项目自带的子集实现，不追求完整 tsc 语义；覆盖 / 不覆盖范围见 `SYNTAX_REFERENCE.md` 的「类型检查边界」，页面 SOURCE 旁的「TS 子集检查」也能查看。
- **安全剥离行尾注释 (`stripInlineCommentSafe`)**：在保留字符串字面量与模板字符串内容的前提下剥离行尾 `//` 与 `/* */` 注释。
- **第一遍（Pass 1）**：收集 `interface` 多行/单行接口定义、`type` 类型别名以及函数签名（含必填/可选参数、默认参数类型推导、返回类型注解，并对未标注类型的参数报 `TS7006`）。
- **第二遍（Pass 2）**：逐行推导表达式类型并校验：
  - `interface` 与对象字面量结构匹配：检测缺失必填属性（`TS2741`）、多余未知属性（`TS2353`）及属性类型不兼容（`TS2322`）；
  - 对象属性链与模板字符串 `${...}` 插值表达式校验：访问接口上不存在的属性时报错（`TS2339`）；
  - 变量声明、数组字面量元素、函数返回值与实参类型匹配（`TS2322` / `TS2345` / `TS2554`）；
  - `const` 常量重赋值或自增拦截（`TS2588`）、算术与比较操作符类型校验（`TS2362` / `TS2365` / `TS2367`）、数组下标类型校验（`TS2538`）。

### 2. 词法感知的 TypeScript 类型剥离器 (`stripTypes`)
- 严格保留原始源码行号 1:1 映射，确保调试高亮与报错行号零偏差。
- 利用括号与三元深度栈 `ternaryStack` 准确区分三元表达式 `cond ? a : b`、可选链 `?.`、空值合并 `??`、对象字面量属性 `{ k: v }` 与 TypeScript 类型注解。

### 3. 全覆盖语句级自动插桩器 (`instrument`)
- 自动在独立可执行语句前插入 `__t(line, note, () => ({...}))` 快照钩子。
- **循环与分支条件全覆盖 (`tryInjectLoopOrElseIf`)**：针对 `while (cond)`、`else if (cond)` 与 `for (init; cond; update)`，利用逗号运算符將 `(__t(...), (cond))` 注入条件判断表达式内部，确保**每一次循环迭代的条件判别过程（无论结果为 `true` 还是 `false`）都作为独立步骤完整展现**，绝不跳过条件判别直接显示循环体。
- 内置 `checkpoint(...)` / `断点(...)` 运行时钩子 `__t.__ckpt`，支持任意数量参数的实时求值与暂停。

### 4. 按需当场计算的 Debug 引擎 (`computeAndAppendNextStep`)
- **按需单步求值**：开启 Debug 时仅计算初始步骤；每次点击「下一步 ›」或「⏭ 运行到下一个检查点」时，通过确定性重放目标步索引（`targetIdx`）并在 `targetIdx + 1` 抛出轻量级 `PAUSE_SIGNAL` 中断信号，当场计算下一步状态与前后帧变量差异。
- **运行时报错即停**：若程序在某一行抛出运行时异常（如 `throw new Error(...)` 或空指针访问），引擎捕获该异常并将其绑定到当前正在执行的源码行，在该行上方浮出红色 `✗ RUNTIME ERROR` 面板并停止后续步进。
- **保持进度的动态检查点注入 (`rebuildDebugAtPosition`)**：当用户在调试中途点击「＋ 添加检查点函数」或点击行号插入/移除 `checkpoint();` 时，系统自动统计当前行已被访问的次数并修正行号偏移，重新编译后无感快进恢复到原本所在的调试步骤。

### 4.1 ▶ 运行看门狗 (`RUN_TIMEOUT_MS` / `evalCall`)
- `▶ 运行`（非 Debug）以前直接在 `new Function` 里跑裸代码，死循环会把整个页面卡死、无从中断。现在 Run 也走与 Debug 同一套 `instrument()` 插桩：循环条件被改写成 `(__t(line), (cond))`，每个循环体首行也埋一个 `__t(line)`。
- `evalCall(code, call, { budgetMs })` 里的 `__t` 每 32 次钩子看一次墙钟，超过 `RUN_TIMEOUT_MS`（2000ms）就抛出带 `__timeout` / `__line` 标记的错误。**连 `while (true) {}`、`for (;;) {}`、`do {} while (true)` 这种空循环也被拦住**，因为钩子在循环条件里。
- 错误一旦抛出就不再只丢一次：`expired` 之后每个钩子都会继续抛，用户代码里偶发的 `try/catch` 吞掉第一次也逃不掉。
- 终止后统一处理：把 `__line` 对应的源码行加入 `RUNTIME_ERROR_LINES` 标红、`revealErrorLine` 滚动定位、控制台输出「疑似死循环 · 位置：第 N 行 · 该行代码」，并把这条诊断做成可点击条目。
- 若插桩或插桩后的编译失败，会退回裸代码运行并在控制台提示「本次运行未启用死循环熔断」，不让保护静默消失。
- 普通报错的行号也改用 `__t` 记录的最后执行行（`lastLine`），比解析 V8 栈更准；`sourceLineFromStack` 仅在未插桩的退路里兜底。

### 5. WATCH 卡片自动成对空间分配 (`allocateSlotSpans`)
- 右侧 `WATCH` 面板采用 `grid-template-columns: repeat(2, minmax(0, 1fr))` + `grid-auto-flow: row dense` 紧凑双列网格。
- 根据数据结构元素规模计算压力值 `pressure` 决定单双列跨度（`span 1` 或 `span 2`）；若单列卡片总数为奇数，自动将其中压力最大的一张升级为整行双列（`span 2`），确保**所有单列卡片永远成对并排填满，绝不出现半行空缺**。

### 6. 极速 1920×1080 60fps 视频导出与 WebM 时长修复 (`exportVideo` + `fixWebmDuration`)
> **当前状态（实验性）**：编码管线、倍速和 WebM 时长修复可用；Canvas 渲染层尚未完整复刻 WATCH 卡片（`list` / `queue` / `heap` / `uf` 等仍为简化版）、步骤胶囊和溢出处理，导出内容可能少于屏幕显示。完整对齐的工作量已另行评估。
- **WebCodecs 离线编码 + 确定性 WebM 封装**：优先使用 `VideoEncoder` 逐帧编码，MediaRecorder 作为 fallback；导出期间不依赖页面 DOM 布局。
- **5 档倍速控制**：支持 `0.75x`、`1x`、`1.5x`、`2x`、`3x` 五档倍速。
- **EBML 时长元数据注入 (`fixWebmDuration`)**：录制完成后自动解析 WebM 二进制头部并在 `Segment Info (0x1549A966)` 中写入精确的 `Duration (0x4489)` Float64 毫秒值，彻底解决浏览器原生 `MediaRecorder` 导出视频在播放器中显示时长异常（如 `26113:02`）的问题。

### 7. 声明集合着色 (`collectDeclaredNames` + `hl(t, declared)`)
- CodeMirror 模式下由 `editor/cm-entry.js` 分别用 `.cm-declared`（浅蓝 `#9cdcfe`）和 `.cm-builtin`（暖金 `#dcdcaa`）标记**用户声明名**与**内置名**；属性键和点号后的字段名使用紫色（声明 / 内置装饰会跳过 `.` 后的位置，避免覆盖属性色）；比较 / 逻辑运算符保持白色，匹配括号使用金色辉光。旧的 `hl()` 仍用于 textarea 回退和画布导出。
- **为什么按「声明」而不是按「长得像变量」着色**：旧的语法高亮把所有裸标识符都染成浅蓝，拼错的变量会冒充合法变量。现在先把当前缓冲区里的**真实声明**收集成一个 `Set`，高亮时逐词查表。
- 声明来源：`stripTypes(src)` 之后的 `collectNames`（覆盖 `const/let/var`、数组/对象解构、函数 / 箭头 / class 方法参数、`for...of/in`、`catch` 绑定），再加上原始源码里的 `function / class / interface / type / enum` 名字。内置名不混入声明集合：TypeScript 使用 `HIGHLIGHT_BUILTINS`，Python 使用 `PY_ENGINE.builtins`，若用户重新声明同名变量则按自定义变量着色。
- `hl(t, declared)` 的第二个参数为空时退化为旧行为（全部着色），便于测试与画布导出；编辑区始终传入真实集合。对象字面量的键（`{ val: 1 }`、行首 `key:`）仍然使用属性色，避免把「键」误读成「未声明变量」。
- 结果按源码文本缓存（`DECLARED_NAMES_CACHE`），每次重绘只查一次表。

### 8. 悬停取值与可视化 (`hoverInfoFor` / `hoverTipHtml`)
- 编辑区由 CodeMirror 6 承载；悬停用 `view.posAtCoords` 定位光标下的文本，再经 `hoverWordAt` 取出标识符（旧 textarea 只作为引擎的数据源保留在 DOM 中，屏幕上看不到）。
- 取值只读当前步的快照（`TRACE.steps[cur]` 的 `v` / `ds`），当前栈帧找不到时回退到 `global` 帧；不做任何 `eval`，不会因为悬停产生副作用。
- 浮层复用 WATCH 的 12 种渲染器（`VIZ[kind]`）画出同款缩略可视化；`LOCALS`/`WATCH` 卡片带 `data-var`，悬停同样生效。

### 9. 报错定位 (`liveTypeDiags` / `revealErrorLine` / `sourceLineFromStack`)
- CodeMirror 模式下由 `editor/cm-entry.js` 的 lint 波浪线呈现诊断；下面描述的是旧 textarea 回退层。
- **边写边检**：`updateEditorChrome` 通过 `liveTypeDiags`（按源码文本缓存）拿到 `typecheckTS` 的诊断，逐行加 `.ln.err`、左侧红条与 `✗ TSxxxx` 徽章；`TYPE_ERROR_LINES` / `RUNTIME_ERROR_LINES` 仍保留给「运行/调试」路径。
- **点击诊断跳转**：`say(msg, cls, line)` 给日志条目写入 `data-line`，点击后 `revealErrorLine` 滚动并把光标放到该行。
- **`▶ 运行` 的异常行号**：`evalCall` 会把 `e.stack` 带回，`anonStackLine` 取「逗号后 `<anonymous>:行:列`」这一帧，`fnBodyLineOffset` 在启动时实测 `new Function` 包装带来的偏移，`sourceLineFromStack` 再减掉首行 `checkpoint` 存根，即可把 V8 的栈行号还原成编辑器行号；解析失败或指到求值包装器时返回 `0`，退回原来的「调用失败」提示。

### 10. 文件身份：导入 / 改名 / 导出 (`FILE_NAME` / `setFileName` / `exportFileName`)
- SOURCE 标题栏里的 `TS ␣ 文件名` 是一个真实 `<input id="fileName">`，不是装饰：`blur` / `change` / `Enter` 提交、`Esc` 撤销；`sanitizeFileName()` 去掉路径分隔符与 `\ / : * ? " < > |` 及控制字符，空名回退 `playground.ts`。
- `loadSample()` 会把文件名同步成样例名（`lcs.ts`、`mergesort.ts` …）；导入文件时改用文件自身的名字。
- `exportFileName()` 保证下载名有扩展名：已有 `.ts` / `.tsx` / `.js` 等就原样保留，没有就补 `.ts`。
- **导入**：隐藏的 `<input type="file" accept=".ts,.tsx,.js,.jsx,.txt">` + `File.text()` 读取，`loadImportedSource()` 统一换行、`resetTraceState()` 停掉旧调试会话、写入编辑器并更新文件名；重新导入同名文件也能触发（读取后立刻清空 input 的 value）。
- **导出**：`Blob([editor.value])` + 临时 `<a download>`，导出内容就是编辑器原文（不做类型剥离、不加包装），扩展名与文件名来自上面那枚芯片。
- 文件名只存在于当前页面会话里，**不写 localStorage**、不随刷新保留。

### 11. 类 / 枚举 / 泛型：擦除、展开与插桩
- **class 插桩上下文**：`instrument()` 用 `classKeywordIndex()` 找出真正的 `class` 关键字，把类体那个 `{` 标记为 `classbody`。类体成员层（字段声明、方法签名）不插桩，方法体内部照常逐行插桩——所以字段不会变成非法语句，方法体又能一步步走。
- **方法调用栈**：`matchFunctionHeaderForStack()` 增加了方法签名匹配（`add(n) {`、`constructor(v) {`），配合 `__enter` / `__leave` 生成 `add(2)` 这样的栈帧。
- **`this` 快照**：方法体里的 `__t(...)` 多传一个 `this` 参数（`__t(line, note, snap, this)`），`computeAndAppendNextStep` 把实例自有字段浅拷贝进当前步的 `vRaw['this']`，于是 `WATCH` 能画出 `this` 卡片；`buildFrameSnapshotFromClosure` 也会把 `frame.self` 合并进帧快照，切换栈帧时同样能看到字段。
- **enum 展开 (`transpileEnums` + `buildEnumIIFE`)**：扫描源码（跳过字符串/注释）找到 `enum` / `const enum`，按成员生成 `E[E["A"] = 0] = "A"`（数字）或 `S["A"] = "a"`（字符串）的 IIFE，并补齐原声明占用的换行数，保证 1:1 行映射。成员值用 `new Function` 静态求值，前面的成员会作为实参传入，`B = A + 10` 也能算。
- **泛型擦除**：`stripTypes` 现在处理 `class Box<T>`、`<T,>(x: T) =>`、调用点 `f<number>(1)` / `new Box<number>()`，以及 `implements A, B<T>` 整句；泛型只影响类型层，运行期全部消失。
- **不支持语法预检 (`detectUnsupportedSyntax`)**：装饰器、`abstract`、`declare`、`namespace/module`、`constructor(private x)`、`static {}` 会在编译前被识别，输出「第 N 行：暂不支持 X —— 改成 Y」并定位到行，而不是把 `Unexpected token` 抛给用户。
- **兼容性修复**：`looksLikeTypeText` 认可对象类型字面量 `{ a: number }`（带类型解构参数终于能剥）；接口字段解析忽略 `readonly` 修饰符；单行函数 `function f(): number { return 1; }` 不再被误报 `TS2355`；入口调用表达式同样过 `stripTypes`，`f<number>(1)` 不会再被当成比较运算。

---

## 四、 Python 模式

- 顶部 `TS / PY` 切换；内置 6 个 Python 样例：冒泡排序、二分查找、BFS、LCS DP、结构集合、类 / 实例。
- 运行时是 **Pyodide Web Worker**：支持 Python 标准库和 numpy（首次 `import numpy` 时加载）；**不做静态类型检查**，运行前只用 `ast.parse` / `compile` 检查语法。f-string 会区分绿色字面段与插值表达式，插值内变量正常着色；选中匹配跳过字符串文字与数字常量。
- 入口规则与 TS 一致：最后一行直接写真实调用；旧的 `# 调用：expr` 注释仍兼容。调试/可视化复用 12 种 WATCH 渲染器、LOCALS、调用栈、悬停和 checkpoint。
- 限制：`open()` 只作用于 Pyodide 的虚拟文件系统，不能读写本机文件；`input()` 没有终端；单次最多 2000 步 / 6 秒；Python 模式暂不支持视频导出。
- 分享沙箱里 Python 模式受 iframe Worker 限制，加载失败时请把代码复制到完整页面运行。

---

## 五、 构建、测试与部署

### 1. 运行所需文件
- `index.html`、`app-session.js`、`editor/cm.bundle.js`、`share.html`、`python/`（Python 模式）以及三份文档。
- `editor/cm.bundle.js` 是 CodeMirror 6 的构建产物；源码在 `editor/cm-entry.js`。首次使用需要 `npm ci && npm run build:editor`。
- Python 模式必须通过 HTTP(S) 打开；`file://` 双击只适合 TypeScript 模式，且不保证外部脚本加载。

### 2. 常用命令
```bash
npm ci           # 首次安装 CodeMirror / esbuild
npm run build:editor  # 生成 editor/cm.bundle.js
npm start        # 或 node python/serve.mjs；默认 http://127.0.0.1:5180/
npm test         # 等价 node test-pipeline.mjs
npm run build    # build:editor + 生成 dist/
```

### 3. 部署说明
- `npm run build` 不下载依赖、不启动服务，输出在 `dist/`；把整个目录上传到 Nginx、GitHub Pages、Netlify、Cloudflare Pages 等静态托管即可。
- Python 运行时默认从 jsDelivr 加载；离线部署需把 Pyodide 复制到 `python/pyodide/`，并在页面加载前设置 `window.PYODIDE_BASE = 'python/pyodide/'`（以 `/` 结尾）。
- 分享链接会打开 `share.html`，在 `sandbox="allow-scripts allow-downloads"`（无 `allow-same-origin`）的 iframe 中加载分享代码；代码不能访问主页面的 DOM / localStorage，也不会自动运行。Python 模式在沙箱内受 Worker/iframe 限制，若加载失败请把代码复制到完整页面运行。
- 页面内仍可导入 / 导出 `.ts` / `.py`，以及导出视频。
- CI：`.github/workflows/ci.yml` 在 push / PR 时运行 `node test-pipeline.mjs` 和 `node scripts/build.mjs`。
- 许可证：当前 `package.json` 为 `private` + `UNLICENSED`。对外发布前请选择并补充 `LICENSE`（MIT / Apache-2.0 / 商业许可）；CodeMirror 6 使用 MIT 许可，分发时请保留其版权声明，Pyodide 使用 MPL-2.0。
