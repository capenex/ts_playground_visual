# TypeScript Playground VISUAL — 线上 18 项问题定位、总体解决方案、分步计划与工程量评估

> **前置声明（遵守 `/ARCHITECTURE.md` 第 0 节与第 6 节）**
> 1. 本文档严格依据 `/ARCHITECTURE.md` 架构宪章编制，**当前仅输出根因定位、总体方案、分步计划与工程量预估，未对任何业务代码进行修改**。
> 2. 所有拟定修复方案均 100% 满足 `ARCHITECTURE.md` 的硬性门禁约束：
>    - **精确 34 个 TypeScript 模块**（Gate 10a：不新增或删除 `src/**/*.ts` 文件，所有逻辑在既有分层模块内演进）；
>    - **纯逻辑层 22 个实现模块 + 1 个环境声明模块 100% 零 DOM / 零 `localStorage` 依赖**（Gate 9：所有 `localStorage`、DOM 与剪贴板操作严格收敛在 L7 `src/ui/*`、`app-session.js` 与 `storage-guard.js`，纯模型层通过 `StorageAdapter` 或 `uiHooks` 依赖倒置解耦）；
>    - **100% 零类型逃逸**（Gates 1–7：`0 any`、`0 !`、`0 @ts-ignore`、`0 as` 断言，全部使用具名类型守卫、`instanceof` 窄化与 `isRecord` 边界校验器）；
>    - **7 层单向无环依赖图（DAG）**（Gate 8：Tarjan SCC 循环依赖检测为 `0`）。
> 3. 根据 `/ARCHITECTURE.md` 第 6 节（仓库仅保留 6 份核心文档，严禁保留过时的临时重构草案），本方案文件 `/REMEDIATION_PLAN.md` 仅供方案评审与开发对照；待全量修复完成并通过五步验收流水线后，将把变更记录归档至 `/CHANGELOG.md` 并移除本临时计划文件。

---

## 一、全量 18 项问题源码级根因定位与架构合规解决方案

### 1.1 P1 级问题（数据丢失风险 & 核心计算语义失真）

#### 【B01 · P1 Bug】新建 Notebook 刷新后消失
- **源码根因定位**：
  1. `src/ui/notebook.ts:477-506`（`#nbBtnNewTab` 点击新建空白 Notebook）、`src/ui/notebook.ts:66-136`（单元格插入/复制/移动/删除）、`src/ui/notebook.ts:676-708`（单元格 `textarea` 输入事件）以及 `src/notebook/notebook-kernel.ts:342-356`（单元格运行后更新 `executedHistory` 与 `output`）仅修改了内存对象 `notebooksByLang.ts`（定义于 `src/notebook/notebook-model.ts:135`）。
  2. 整个 Notebook 生命周期中，只有 `importTutorialNotebook()`（`src/ui/notebook.ts:810-821`）调用了 `syncTutorialDocToVfs()`，**顶部新建的 Notebook 和单元格日常编辑从未写入 `localStorage` 或同步到 `VFS_NODES`**。
  3. 页面刷新后，`ensureLangNotebooks()`（`src/notebook/notebook-model.ts:139-146`）发现内存为空，直接调用 `createDefaultNotebooks("ts")` 硬编码重置为 `Intro.ipynb` 和 `Untitled.ipynb`。
- **架构合规解决方案**：
  - **L5 纯模型层（`src/notebook/notebook-model.ts`，保持 0 DOM / 0 `localStorage`）**：
    - 参照 `src/runtime/vfs-store.ts` 的 `VfsStorageAdapter` 模式，在 `notebook-model.ts` 中新增 `NotebookStorageAdapter` 接口与 `registerNotebookStorageAdapter()`、`persistNotebooksToStorage()`、`restoreNotebooksFromStorage()` 纯数据序列化/反序列化校验函数（使用 `isRecord` 窄化，0 `as` 断言），完整保存 `docs`（含每个文档的 `id`、`title`、`cells`、`execCounter`、`activeCellId`、`executedHistory`、`lastGlobalVars`）与 `activeDocId`。
  - **L7 UI 视图层（`src/ui/notebook.ts`）**：
    - 注册 `localStorage` 适配器（键名 `ts-visual-notebooks-v1`），并在新建/重命名/关闭 Notebook 标签、编辑单元格源码、增删移动单元格、运行单元格、重启内核时触发防抖保存（同时将非内置新建 Notebook 同步映射到 VFS，关闭或重命名时同步更新）。

#### 【B02 · P1 Bug】顶部新建代码标签中的非当前文件刷新后丢失
- **源码根因定位**：
  1. `src/ui/script-tabs.ts:320-344`（`#scriptBtnNewTab` 点击新建标签）创建的 `ScriptTabDoc` 将 `vfsPath` 设为空字符串 `""`，仅推入内存 `SCRIPT_TABS.ts.tabs`。
  2. `src/runtime/script-tabs-store.ts:94-105`（`syncActiveScriptTabSource`）仅当 `!activeTab.isSample && activeTab.vfsPath` 非空时才写入 `VFS_NODES`。因此顶部 `＋` 新建的标签不会进入 VFS 存储。
  3. `app-session.js:39-51`（`snapshot()`）只保存了当前活动编辑器的单份代码 `ts: { src, name }`，未保存 `SCRIPT_TABS.ts.tabs` 多标签数组。刷新后非当前标签页自然全部丢失。
- **架构合规解决方案**：
  1. **多标签会话完整快照**：在 `src/runtime/script-tabs-store.ts` 中提供纯数据序列化/恢复函数 `serializeScriptTabsSession()` 与 `restoreScriptTabsSession(raw: unknown)`（0 DOM，使用 `isRecord` 窄化）。
  2. **扩展 `app-session.js`**：在 `snapshot()` 中除保留向后兼容的 `ts: { src, name }` 外，新增 `tabs`（全量打开的脚本标签页列表）、`activeTabId` 与 `viewMode`（`'script' | 'notebook'`）；在 `applyState()` 中完整恢复所有打开的代码标签页与激活状态。
  3. **VFS 协同**：顶部 `#scriptBtnNewTab` 新建代码标签时，若文件名不与内置示例冲突，同步关联 `vfsPath: newTitle` 并写入 `VFS_NODES` + `persistVfsToClientStorage()`，使其在多模块 `import` 与刷新恢复中均保持一致。

#### 【B03 · P2 Bug】恢复源码后，文件名变成默认名 (`playground.ts`)
- **源码根因定位**：
  1. `index.html:252-253` 先加载 `js/app.bundle.js`，后加载 `app-session.js`。
  2. `js/app.bundle.js` 执行 `initNotebookUI()` ➔ `renderScriptTabsUI()` ➔ `ensureScriptTabsForLang()`（`src/runtime/script-tabs-store.ts:54-78`），此时 `appState.FILE_NAME` 仍为默认初始值 `'playground.ts'`，于是生成的首个标签页 `title` 为 `'playground.ts'`。
  3. 随后 `app-session.js:81-101` 的 `applyState()` 恢复会话时，只设置了 `editor.value = buf.src` 和 `fileNameEl.value = buf.name`，**既没有调用 `setFileName(buf.name)` 更新 `appState.FILE_NAME`，也没有更新 `SCRIPT_TABS.ts` 中活动标签页的 `title` 并重绘 `renderScriptTabsUI()`**。
  4. 更严重的是，`app-session.js:34-37` 的 `currentName()` 第一行写着：
     `if (typeof FILE_NAME !== 'undefined' && FILE_NAME) return FILE_NAME;`
     由于 `globalThis.FILE_NAME` 代理到 `appState.FILE_NAME`（仍是 `'playground.ts'`），导致恢复后的顶部标签名以及下一次自动保存的 `name` 全部被覆盖回 `'playground.ts'`。
- **架构合规解决方案**：
  - 在 `app-session.js` 的 `applyState()` 中：
    1. 优先恢复 `state.tabs` 多标签页状态；若旧版存档仅有 `state.ts = { src, name }`，则调用 `setFileName(buf.name || 'playground.ts')` 同步更新 `appState.FILE_NAME`、当前激活 `ScriptTabDoc.title` / `source`，并调用 `renderScriptTabsUI()` 与 `renderVfsTreeUI()`。
    2. 修正 `app-session.js` 中的 `currentName()`：优先读取当前激活 Script Tab 的 `title` 或 `appState.FILE_NAME`（在 `setFileName` 同步后二者严格一致）。

#### 【B04 · P1 Bug】Notebook 重复运行累加单元格，状态没有继续累积（两次都得到 1）
- **源码根因定位**：
  1. `src/notebook/notebook-kernel.ts:31-49` 的 `buildTsPreambleFromHistory(doc, excludeCellId)` 在第 173 行被调用时传入了 `excludeCellId = cell.id`：
     `const { preambleJs, allNames: histNames } = buildTsPreambleFromHistory(doc, cell.id);`
  2. 同时第 342-343 行：
     `doc.executedHistory = doc.executedHistory.filter((h) => h.cellId !== cell.id);`
     `doc.executedHistory.push({ cellId: cell.id, execCount: cell.executionCount, source: rawSrc });`
  3. 这意味着内核并非基于**上一次执行后的运行时变量值**继续求值，而是每次把“除当前格以外的历史单元格源码”拼成 `preambleJs` 从头重跑一遍！
     - 当第 1 格为 `let count: number = 0;`，第 2 格为 `count += 1;`：
     - 第 1 次跑第 2 格：执行第 1 格源码 `var count = 0;` ➔ 执行第 2 格 `count += 1;` ➔ 得到 `1`。
     - 第 2 次跑第 2 格：由于排除了第 2 格自身的历史，`preambleJs` 依然是第 1 格的 `var count = 0;`，把 `count` 重新初始化为 `0` 后再执行一次 `count += 1;`，因此无论重复运行多少次，结果永远是 `1`！
- **架构合规解决方案**：
  - 在 `src/notebook/notebook-kernel.ts`（L5 纯内核层，0 DOM）中将跨单元格上下文从“源码重放并剔除当前格”升级为**“持久运行时状态注入 + 类型/函数声明前置”**：
    1. 在 `NotebookDocument`（或内核 WeakMap 旁路存储）中维护实时运行时变量字典（与 `doc.lastGlobalVars` 同步，但保留未截断的运行时真实对象引用）。
    2. 构建执行前导码时：
       - 将历史单元格中定义的 `function`、`class`、`enum` 声明保留在 `preambleJs` 中；
       - 对于所有已存在于内核上下文中的顶层变量名 `k`，通过传入参数 `__ctx` 生成初始绑定 `var k = __ctx["k"];`（置于历史声明之后、`console.EnableRecording()` 与当前单元格代码 `jsCellBody` 之前）。
       - 若当前单元格显式包含声明语句（如重新运行第 1 格 `let count: number = 0;` 转换成的 `var count = 0;`），当前格的代码会自然将 `count` 重新赋值为 `0`；
       - 若当前单元格是增量/修改语句（如重复运行第 2 格 `count += 1;`），则在 `__ctx["count"]`（当前值 `1`）的基础上累加为 `2`、`3`……
    3. `debugTsNotebookCell`（单格步进调试）同样注入 `__ctx` 当前最新变量状态，保证直接运行与单步调试的跨格计算语义 100% 一致。

#### 【B05 · P1 Bug】普通运行改变了 `console.log()` 的返回值，与调试结果不同
- **源码根因定位**：
  - `src/runtime/runner.ts:310-317`（`evalCall` 函数内）：
    ```ts
    const pushLogLine = (...a: unknown[]) => logs.push(a.map(formatConsoleArg).join(' '));
    ```
    `Array.prototype.push()` 返回数组的新长度（`number`）。由于该箭头函数未加花括号，隐式将 `logs.push(...)` 的返回值（例如 `1`）作为 `console.log()` 的返回值返回给了用户代码！
  - 而在调试器 `computeAndAppendNextStep`（`src/runtime/runner.ts:714-717`）中，`pushStepConsole` 使用了花括号语句块 `{ ... logs.push(...); }`，返回 `undefined`。因此 `return console.log("HELLO")` 或末尾 `console.log(...)` 在普通运行时返回 `1`，在调试时返回 `undefined`。
- **架构合规解决方案**：
  - 修改 `src/runtime/runner.ts:310`：
    ```ts
    const pushLogLine = (...a: unknown[]): void => {
      logs.push(a.map(formatConsoleArg).join(' '));
    };
    ```
    确保 `console.log / info / warn / error` 严格返回 `undefined`。

#### 【R01 · P1 条件性数据风险】存储版本不匹配时，会静默删除已保存会话和虚拟文件
- **源码根因定位**：
  - `storage-guard.js:46-70`：当 `localStorage.getItem('ts-playground-storage-version') !== CURRENT_STORAGE_VERSION` 时，无条件删除所有 `ts-playground-*`（含用户会话 `ts-playground-session-v1`）与 `ts-visual-*`（含虚拟文件目录 `ts-visual-vfs-workspace-v2`）。
- **架构合规解决方案**：
  - 将 `storage-guard.js` 从“破坏性全删（Destructive Wipe）”升级为**“非破坏性Schema校验与备份保留（Non-Destructive Migration & Backup）”**：
    1. 当检测到版本缺失或不匹配时，对用户数据键（`ts-playground-session-v1`、`ts-visual-vfs-workspace-v2`、`ts-visual-notebooks-v1`）：
       - 先校验其 JSON 结构是否合法可解析（例如 `ts-playground-session-v1` 含有效 `ts.src` 或 `tabs`，`ts-visual-vfs-workspace-v2` 为合法节点数组）；
       - **若结构合法，原地保留并迁移数据**，绝不删除用户的源码与虚拟文件；
       - **仅当某个键的 JSON 损坏无法解析或属于已废弃的旧缓存键（如 `ts-visual-vfs-v1`）时**，才清理该损坏键（并在清理前将原始字符串备份至 `ts-playground-backup-<key>`，同时在页面日志中给出温和提示）。
    2. 保留 `runStorageVersionGuard(customStorage, customIndexedDB, targetVersion)` 的导出接口以兼容现有测试架构。

---

### 1.2 P2 级问题（调试定位偏差、类型检查误报、功能缺口与快捷键副作用）

#### 【B06 · P2 Bug】文件末尾检查点定位到上一行
- **源码根因定位**：
  1. `src/compiler/instrumenter.ts:525-549` 的 `findTrailingTopLevelCall(js)` 扫描文件最后一个非空行：若匹配顶层函数调用，则将其提取为 `entry.expr`（入口求值表达式），并由 `blankJsLine(js, entry.index)` **将该行从函数主体 `jsBody` 中抹空**。
  2. 当文件最后一行是 `checkpoint(true, "audit-checkpoint");`（第 3 行）时，`findTrailingTopLevelCall` 误把 `checkpoint(...)` 当成了入口返回值调用，将其从 `jsBody` 第 3 行抹除（导致第 3 行没有生成 `__t(3, ...)` 步进钩子），并塞进了末尾的 `;var __entryVal = (checkpoint(true, "audit-checkpoint"));`。
  3. 在 `computeAndAppendNextStep`（`src/runtime/runner.ts:578-638`）执行第 2 行 `console.log(...)` 时，`idx === targetIdx` 开启了 `activeRecording = true`；由于第 3 行没有 `__t(3, ...)` 来触发 `idx === targetIdx + 1` 的 `PAUSE_SIGNAL` 暂停，执行流直接顺延进末尾的 `var __entryVal = (checkpoint(...))`，触发了 `__t.__ckpt`，导致把第 3 行的检查点标记和消息错误地挂载到了第 2 行的 `pendingStep` 上！
- **架构合规解决方案**：
  1. 在 `src/compiler/instrumenter.ts:533` 的 `findTrailingTopLevelCall()` 中，将 `checkpoint` 与 `断点` 加入排除列表：
     `if (/^(?:return|throw|if|for|while|switch|class|function|const|let|var|import|export|await|new|checkpoint|断点)\b/.test(cleaned)) return null;`
  2. 如此，文件末尾的 `checkpoint(...)` 会保留在 `jsBody` 的真实行号（第 3 行）上，由 `instrument()` 正常注入 `__t(3, 'checkpoint(true, "audit-checkpoint");', ...)` 独立调试步骤，定位与行号 100% 准确。

#### 【B07 · P2 Bug】行内 `case` 返回语句没有可观察的调试步骤
- **源码根因定位**：
  - `src/compiler/instrumenter.ts:24` 的 `isTraceableLine(t)` 规定：
    `if (/^(else|do|try|catch|finally|case\b|default\b)/.test(t)) return false;`
    之所以跳过 `case` 和 `default`，是因为如果像普通语句一样在 `case 1:` **整行之前**注入 `__t(...)`，在 `switch (n) {` 与第一个 `case` 之间会产生不可达代码，而在后续 `case` 之前注入则会变成上一个分支的贯穿（fallthrough）执行。
  - 但这也导致单行写法 `case 1: return "one";` 或 `default: return "other";` 完全没有任何 `__t(...)` 钩子，步进调试时从 `switch (n)` 直接跳到函数结束。
- **架构合规解决方案**：
  - 在 `src/compiler/instrumenter.ts` 中新增 `tryInjectCaseOrDefault(raw: string, callExpr: string): string | null`（与 `tryInjectLoopOrElseIf` 并列）：
    - 识别形如 `case <expr>: <stmt>` 或 `default: <stmt>` 的行内分支语句（冒号后存在非空、非单纯 `{` 或注释的可执行语句）；
    - 将 `callExpr + '; '` 精确注入在**冒号 `:` 之后、行内语句 `<stmt>` 之前**：
      - 原文：`case 1: return "one";`
      - 插桩后：`case 1: __t(3, "case 1: return \"one\";", ...); return "one";`
    - 这样只有当 `switch` 真正匹配并进入该 `case` / `default` 分支时，才会触发这一行的调试步骤，右侧面板可清晰观察到命中的分支与返回值推导。

#### 【B08 · P2 Bug】只抛异常的合法函数被误报缺少返回值 (`TS2355`)
- **源码根因定位**：
  - `src/compiler/type-checker.ts:861-863` 在函数右花括号闭合时检查：
    `if (currentFn.returnType !== 'any' && currentFn.returnType !== 'void' && currentFn.returnType !== 'Promise<void>' && currentFn.returnType !== 'unknown' && !isGenRet && !currentFn.hasValueReturn)`
    报错 `TS2355`。
  - 而在 Pass 2 扫描函数体时（`src/compiler/type-checker.ts` 第 813 行及偏移后第 95-99 行），只识别了 `return <expr>` 将 `currentFn.hasValueReturn = true`，**遇到 `throw <expr>` 时仅调用了 `inferType()`，没有将 `currentFn.hasValueReturn` 设为 `true`**，且上述条件也未排除 `returnType === 'never'`。
- **架构合规解决方案**：
  - 在 `src/compiler/type-checker.ts` 中：
    1. 当遇到 `throw ...` 语句（包括独立行 `throw ...`、单行函数体 `{ throw ... }`、`if (...) throw ...`、`case ...: throw ...`）时，若 `currentFn` 存在，设置 `currentFn.hasValueReturn = true`；
    2. 在第 861 行条件中同步放行 `currentFn.returnType === 'never'` 与 `currentFn.returnType === 'Promise<never>'`。

#### 【B09 · P2 Bug】多文件普通运行报错，标红的是错误文件
- **源码根因定位**：
  1. `src/runtime/runner.ts:162` 在编译多文件子模块（如 `bst.ts`）时，已调用 `instrument(jsMod, modNode.lines, modNames, modFile)`，生成的钩子第 5 个参数带有模块文件名：`__t(2, ..., "bst.ts")`。
  2. 但是在 `evalCall()`（`src/runtime/runner.ts:287-295`）中：
     `const __t: TraceHookFn = function (line?: number) { if (line) lastLine = line; ... }`
     **完全忽略了第 5 个参数 `file`**，也没有维护 `lastFile`，返回结果 `r` 中只有 `line: 2` 而没有 `file: "bst.ts"`。
  3. 在 `runOnce()`（`src/runtime/runner.ts:433-443`）处理报错时，直接把 `r.line`（`2`）加入 `appState.RUNTIME_ERROR_LINES`，既未检查报错是否来自子模块 `r.file`，也未调用 `uiHooks.switchToScriptFile(r.file)`，导致编辑器停留在 `main.ts` 并把 `main.ts` 的第 2 行标红，日志也未打印 `bst.ts · 第 2 行`。
- **架构合规解决方案**：
  1. 在 `evalCall()`（`src/runtime/runner.ts`）中新增 `let lastFile = '';`，在 `__t(line, _note, _snap, _self, file)` 中记录 `if (file) lastFile = file;`，并在 `timeoutError()`、异常捕获及正常返回对象中携带 `file: lastFile`。
  2. 在 `runOnce()` 处理超时（`r.timeout`）与运行时异常（`!r.ok`）时：
     - 若 `r.file && r.file !== entryFile`，先调用 `uiHooks.switchToScriptFile(r.file)` 切换到真实报错的模块文件；
     - 日志格式与 Debug 模式对齐：当多文件或非入口文件报错时，输出 `✗ [${r.file} · 第 ${line} 行] 运行时报错: ${r.error}`，并在目标文件对应行标红与滚动定位。

#### 【F01 · P2 功能缺口】Notebook 模式没有可见的下载入口
- **源码根因定位**：
  - `src/ui/notebook.ts:139-152` 已实现 `exportActiveNotebookIpynb()`，但 `setViewMode()`（`src/ui/notebook.ts:192-195`）在切换到 `'notebook'` 模式时执行了 `expMenuWrap.style.display = "none"`，隐藏了顶部「⬇ 导出 / 下载」菜单；同时 `index.html:133-156` 的 Notebook 顶部栏与工具栏中也未放置导出按钮。
- **架构合规解决方案**：
  1. 在 `index.html` 的 Notebook 工具栏（`.nb-toolbar` 或 `.nb-top-actions`）中新增可见按钮：
     `<button type="button" id="nbBtnExportIpynb" class="vfs-toggle-btn" title="将当前 Notebook 导出为标准 Jupyter .ipynb 文件">⬇ 导出 .ipynb</button>`
     并在 `src/ui/notebook.ts` 的 `initNotebookUI()` 中绑定 `bindBtn("nbBtnExportIpynb", () => exportActiveNotebookIpynb())`。
  2. 同时在顶部 `#exportMenuWrap` 中支持 Notebook 模式（或保留顶部导出按钮可见，在 Notebook 模式下点击「📄 导出文件」即导出当前 `.ipynb`），实现双入口可达。

#### 【F02 · P2 功能缺口】分享按钮仍是占位功能，且点击产生两条重复提示
- **源码根因定位**：
  1. **重复提示原因**：`src/ui/controls.ts:535-542` 给 `$('btnShareLink').onclick` 绑定了一次打印 `'暂未实现'`；而 `app-session.js:247` 又对同一个 `#btnShareLink` 绑定了 `shareBtn.addEventListener('click', copyShareLink)`，同样打印 `'暂未实现'`，导致单次点击输出两条重复日志。
  2. **占位原因**：`app-session.js:104-161` 已经完整编写了 `packState()`（Gzip 压缩 + Base64URL 编码）、`unpackState()`、`restoreFromHash()`（解析 `#s=...`）以及 `copyText()`，但 `copyShareLink()`（`app-session.js:163-168`）被写成了固定输出 `'暂未实现'`。
- **架构合规解决方案**：
  1. 移除 `src/ui/controls.ts:535-542` 中的重复占位 `onclick` 绑定。
  2. 在 `app-session.js` 的 `copyShareLink()` 中打通真实分享流程：
     - 调用 `const encoded = await packState(snapshot());`
     - 生成完整 URL：`const url = location.origin + location.pathname + '#s=' + encoded;`
     - 调用 `await copyText(url);` 写入剪贴板，将 `#shareLinkTag` 文本更新为 `'✓ 已复制'`（2 秒后恢复 `'含当前代码'`），并打印单条成功日志：`✓ 已复制分享链接（含当前代码，打开后仅加载不自动运行）`。

#### 【O05 · P2 体验不足】无文本选择时，Ctrl+C 会修改源码
- **源码根因定位**：
  - `src/ui/controls.ts:664-671`（编辑器 `keydown`）、`src/ui/controls.ts:730-738`（`window` 全局 `keydown`）、`src/ui/notebook.ts:734-741`（Notebook 单元格 `keydown`）在无文本选中时拦截了 `Ctrl+C / Cmd+C` 并调用 `addCheckpointFunction()` 插入 `checkpoint();`。
  - 尤其是 `controls.ts:730-738` 的全局 `keydown` 监听，当用户焦点在顶部「运行」按钮或页面任意非输入框区域按 `Ctrl+C` 时，会直接篡改源码。
- **架构合规解决方案**：
  1. **彻底移除 `window` 全局非编辑器焦点下的 `Ctrl+C` 拦截**（`src/ui/controls.ts:730-738`），确保焦点不在编辑器时按任何复制键绝不修改源码。
  2. 将编辑器与 Notebook 单元格内“快捷插入/移除检查点函数”的快捷键调整为不与系统复制冲突的 **`Alt+C`（或 `Ctrl+Shift+B` / 点击行号 Gutter / 点击底部「＋ 添加检查点函数」按钮）**，让 `Ctrl+C / Cmd+C` 完全回归原生复制语义；同时同步更新 `#btnAddCheckpoint` 的 `title` 与日志提示文案。

---

### 1.3 P3 级问题（信息一致性、无障碍可达性、日志轮次与视口呈现）

#### 【B10 · P3 Bug】类型检查边界提示指向一个不可见入口
- **源码根因定位**：
  - `app-session.js:253` 输出日志：`ℹ 类型检查：TS 为内置子集检查器（不是完整 tsc）。点击 SOURCE 旁徽标查看边界。`
  - 但 `index.html:117` 中 `#checkerBadge` 带有 `hidden` 属性，且 `css/app.css:179-181` 写了 `#codeCol .pane-title .checker-badge { display:none!important; }`，同时 `SOURCE` 标题已被多标签栏 `#scriptTabsList` 取代。
- **架构合规解决方案**：
  1. 移除 `index.html:117` 中 `#checkerBadge` 的 `hidden` 属性，并移除 `css/app.css:179-181` 的 `display:none!important`，为其设计紧凑美观的胶囊样式，展示在代码区右上角 `.script-header-actions`（「📁 文件目录」按钮左侧），点击即弹出 `#checkerModal` 范围与限制说明框。
  2. 将 `app-session.js:253` 的提示文案更新为：`ℹ 类型检查：TS 为内置子集检查器（不是完整 tsc）。点击右上角「TS 子集检查」徽标查看边界。`

#### 【O01 · P3 体验不足】文件标签的键盘与辅助技术可达性不足
- **源码根因定位**：
  - `src/ui/script-tabs.ts:100` 与 `src/ui/notebook.ts:292` 渲染的 `.nb-tab` 是普通 `<div>`，无 `role="tab"`、`tabindex="0"`、`aria-selected`，且未绑定键盘 `Enter / Space / ArrowLeft / ArrowRight` 事件，导致键盘 Tab 导航只能聚焦到关闭按钮 `×`，无法聚焦和切换标签本身。
- **架构合规解决方案**：
  1. 在 `renderScriptTabsUI()` 与 `renderNotebookUI()` 中，为每个 `.nb-tab` 增加 `role="tab"`、`tabindex="0"`、`aria-selected="${isAct ? "true" : "false"}"`。
  2. 在 `initScriptTabsAndImportEvents()` 与 `initNotebookTabsEvents()` 中绑定 `keydown`：当焦点在 `.nb-tab` 本身（非内部 `.nb-tab-close` 或 `.nb-tab-rename-input`）时，按 `Enter` 或 `Space` 切换激活该标签；按 `ArrowLeft` / `ArrowRight` 在相邻标签间移动焦点，并在 `css/app.css` 中补充 `.nb-tab:focus-visible` 高亮描边。

#### 【O02 · P3 体验不足】连续运行的日志缺少清晰的轮次边界
- **源码根因定位**：
  - `src/runtime/event-loop.ts` 的 `say()` 向 `#log` 连续追加消息；多次点击「▶ 运行」或「🐞 Debug 调试」时，多轮输出混在一起，既无分隔线，也无清空入口。
- **架构合规解决方案**：
  1. 在 `src/state.ts`（或 `event-loop.ts`）维护运行轮次计数；每次触发 `runOnce()`、`startDebug()`、`runNotebookCell()` 时，若 `#log` 中已有历史运行记录，自动插入一条带轮次与动作标识的视觉分隔行（如 `<div class="log-divider">── ▶ 运行 ( main.ts ) ──</div>`）。
  2. 在 `#log` 容器右上角（或底部控制栏旁）提供轻量级「🧹 清空日志」按钮（调用已有的 `clearLog()`），方便用户一键清屏。

#### 【O03 · P3 体验不足】普通桌面视口（1128 × 772）下，底部重要提示被截断
- **源码根因定位**：
  - `css/app.css:782-817` 中，`#ctl` 内含 6 个控制按钮，在 `1128px` 宽度下留给右侧 `#ctlHint` 的宽度仅约 `384px`，而 `#ctlHint` 设置了 `white-space:nowrap;overflow:hidden;text-overflow:ellipsis`，导致末尾关于“运行超 2s 自动熔断并报出死循环行号”的提示被省略号截断。
- **架构合规解决方案**：
  1. 优化 `css/app.css` 中 `#ctl` 的间距与 `#ctlHint` 样式：在桌面视口下允许 `#ctlHint` 双行紧凑排版（`white-space: normal; line-height: 1.25; font-size: 11.5px; display: -webkit-box; -webkit-line-clamp: 2;`），并微调 `#ctl` 按钮 `padding` 与 `gap`。
  2. 为 `#ctlHint` 补充完整的 `title` 悬浮提示属性，并精炼文案为：`Debug：每步当场计算 · 悬停看变量 · 报错标红 · ▶ 运行超 2s 自动熔断定位死循环行号`，使其在 `1128 × 772` 视口下无需截断即可完整呈现。

#### 【O04 · P3 体验不足】执行前变量与执行后赋值提示同时出现，状态时机不直观
- **源码根因定位**：
  - `src/runtime/runner.ts:578-629` 中，`stepObj.v` 捕获的是**当前语句执行前（Pre-step）**的变量快照（单元测试 `tests/03-runtime-debug.test.mjs:72` 依赖此契约验证 `checkpoint()` 捕获上一行计算后的值），而 `deriveAnimAndNote` 生成的行内气泡与底部详情展示的是**本行执行后的赋值结果**（如 `total ← 6`）。当用户停在 `total += n` 这一行时，气泡显示 `total ← 6`，但右侧 `LOCALS` 显示 `total: 3`，未说明哪一个是“执行前快照”、哪一个是“本步即将写入的新值”。
- **架构合规解决方案**：
  - **保持底层 `stepObj.v` 数据结构不变（确保 100% 兼容现有单元测试断言）**，在 L6 可视化渲染层 `src/viz/memory-graph.ts` 的 `renderStatic()` 中增强状态时机呈现：
    1. 当顶层栈帧激活且当前步 `st.anim` 为赋值操作（`st.anim.type === 'assign'` 或带 `to` 的 `'call'`）时，在 `LOCALS` 面板对应的变量胶囊中直观展示**“执行前 ➔ 本步赋值后”过渡态**（例如 `total: 3 → 6`，其中 `3` 为当前行执行前旧值，`→ 6` 高亮显示本行执行后新值）；
    2. 若本行是新变量声明（如 `const answer = 2 + 3`，执行前 `v` 中尚无 `answer`），在 `LOCALS` 面板实时渲染带 `new` 标记的预览胶囊 `answer: → 5`；
    3. 在右侧底部 `#console` 详情面板与 `LOCALS` 副标题中明确标注状态语义，彻底消除学习者对两个面板数值不一致的困惑。

---

## 二、分步实施计划（6 个阶段 / Phases）

为严格遵守 `/ARCHITECTURE.md` 的分层架构与验收门禁，计划按以下 **6 个有序阶段**推进实施：

### Phase 1：存储版本安全与多标签/Notebook 会话持久化闭环（解决 R01, B01, B02, B03）
1. **升级 `storage-guard.js`（R01）**：
   - 将版本不匹配时的“全量删除”改为“JSON 结构合法性校验 + 原地保留迁移 + 损坏键备份清理”。
2. **实现 Notebook 持久化适配器（B01）**：
   - 在 `src/notebook/notebook-model.ts`（0 DOM）新增 `NotebookStorageAdapter` 与纯数据序列化/恢复逻辑；
   - 在 `src/ui/notebook.ts` 接入 `localStorage`（`ts-visual-notebooks-v1`）与 VFS 同步，覆盖新建标签、单元格编辑、增删移动、运行与重命名。
3. **打通 Script 多标签保存与文件名恢复（B02, B03）**：
   - 在 `src/runtime/script-tabs-store.ts`（0 DOM）新增多标签快照导出与恢复函数；
   - 在 `src/ui/script-tabs.ts` 新建标签时关联 VFS 节点并触发会话保存；
   - 在 `app-session.js` 的 `snapshot()` / `applyState()` 中完整保存和恢复 `tabs`、`activeTabId`、`viewMode`，并调用 `setFileName()` 同步 `appState.FILE_NAME` 与顶部标签栏 UI。

### Phase 2：Notebook 内核状态累积与普通运行返回值语义修正（解决 B04, B05）
1. **修复普通运行 `console.log` 返回值（B05）**：
   - 修改 `src/runtime/runner.ts:310` 的 `pushLogLine` 为语句块，严格返回 `undefined`。
2. **重构 Notebook 跨格状态累积机制（B04）**：
   - 在 `src/notebook/notebook-kernel.ts`（0 DOM）中维护文档级运行时变量状态字典；
   - 在 `runTsNotebookCell` 与 `debugTsNotebookCell` 中通过上下文参数注入当前累计变量值，不再因剔除当前格历史重跑初始声明而冲掉累加状态，同时保留重新运行声明格重置变量的能力。

### Phase 3：编译器插桩、类型检查与多文件报错定位修复（解决 B06, B07, B08, B09）
1. **修复末尾 `checkpoint()` 行号错位（B06）**：
   - 在 `src/compiler/instrumenter.ts:533` 的 `findTrailingTopLevelCall` 中排除 `checkpoint` 与 `断点`，保留其作为独立插桩步骤。
2. **支持行内 `case / default` 语句步进追踪（B07）**：
   - 在 `src/compiler/instrumenter.ts` 新增 `tryInjectCaseOrDefault()`，在 `case expr:` / `default:` 冒号之后、行内语句之前注入 `__t(...)` 钩子。
3. **修复 `throw` 函数误报 `TS2355`（B08）**：
   - 在 `src/compiler/type-checker.ts` Pass 2 中将含 `throw` 语句或返回类型为 `never` 的函数标记为已满足返回契约。
4. **修复多文件普通运行报错定位（B09）**：
   - 在 `src/runtime/runner.ts` 的 `evalCall()` 中记录并返回 `file: lastFile`；
   - 在 `runOnce()` 报错与超时处理中自动调用 `uiHooks.switchToScriptFile(r.file)` 切换到出错模块并输出 `[文件名 · 第 N 行]`。

### Phase 4：功能缺口补齐与快捷键冲突治理（解决 B10, F01, F02, O05）
1. **恢复「TS 子集检查」边界徽标可见性（B10）**：
   - 移除 `index.html` 中 `#checkerBadge` 的 `hidden` 与 `css/app.css` 中的 `display:none!important`，同步更新 `app-session.js` 提示文案。
2. **新增 Notebook `.ipynb` 导出按钮（F01）**：
   - 在 `index.html` Notebook 顶部栏新增 `#nbBtnExportIpynb` 按钮并绑定 `exportActiveNotebookIpynb()`，同时支持顶部导出菜单在 Notebook 下导出 `.ipynb`。
3. **激活分享链接功能并消除重复提示（F02）**：
   - 移除 `src/ui/controls.ts` 中对 `#btnShareLink` 的重复占位绑定，在 `app-session.js` 的 `copyShareLink()` 中启用 `packState(snapshot())` + 剪贴板复制。
4. **解除 `Ctrl+C` 篡改源码副作用（O05）**：
   - 移除 `src/ui/controls.ts` 全局非编辑器下的 `Ctrl+C` 拦截，将编辑器与 Notebook 快捷添加检查点改为 `Alt+C`（保留按钮与行号点击），让 `Ctrl+C` 专注原生复制。

### Phase 5：无障碍可达性、日志轮次分隔、视口排版与快照过渡态展示（解决 O01, O02, O03, O04）
1. **文件标签 ARIA 与键盘导航（O01）**：
   - 为 Script 与 Notebook 标签添加 `role="tab"`、`tabindex="0"`、`aria-selected` 及 `Enter / Space / ArrowLeft / ArrowRight` 键盘切换支持。
2. **连续运行日志轮次分隔与清空入口（O02）**：
   - 在每次运行/调试启动时插入清晰的轮次分隔条，并在日志区提供一键清空入口。
3. **底部提示栏响应式防截断（O03）**：
   - 调整 `index.html` 与 `css/app.css` 中 `#ctl` 及 `#ctlHint` 排版，确保 `1128 × 772` 视口下完整显示 2 秒熔断说明。
4. **LOCALS 执行前/执行后赋值过渡态直显（O04）**：
   - 在 `src/viz/memory-graph.ts` 的 `renderStatic()` 中，为当前步正在赋值的变量或新声明变量渲染 `旧值 → 新值` 过渡标识，消除执行前快照与执行后气泡的视觉割裂。

### Phase 6：全链路回归测试补充与五步门禁验收
1. 在 `/tests/02-compiler-typecheck.test.mjs`、`/tests/03-runtime-debug.test.mjs`、`/tests/05-workspace-nb.test.mjs` 中新增针对 B01–B10、F01–F02、R01 的专项回归测试断言。
2. 严格按 `/ARCHITECTURE.md` 第 5.3 节顺序执行五步验证命令：
   - `./node_modules/.bin/tsc --noEmit`
   - `node scripts/build-editor.mjs`
   - `node test-pipeline.mjs`（验证 10 大静态门禁 + 全量领域单测 100% 通过）
   - `node scripts/build.mjs`
   - `node smoke-e2e.mjs`
3. 将修复明细归档至 `/CHANGELOG.md`，并按 `/ARCHITECTURE.md` 第 6 节文档规范清理临时计划文件。

---

## 三、工程量预估矩阵（Effort Estimation）

### 3.1 逐项工程量预估表

| 编号 | 优先级 | 问题描述 | 涉及架构层级与核心文件 | 预计改动行数 (LOC) | 技术复杂度 | 预估耗时 |
| :---: | :---: | :--- | :--- | :---: | :---: | :---: |
| **B01** | **P1** | 新建 Notebook 刷新后消失 | L5 `notebook-model.ts` (0 DOM)<br>L7 `ui/notebook.ts` | ~95 行 | 中 | 25 分钟 |
| **B02** | **P1** | 非当前新建代码标签刷新后丢失 | L4 `script-tabs-store.ts` (0 DOM)<br>L7 `ui/script-tabs.ts`, `app-session.js` | ~85 行 | 中 | 20 分钟 |
| **B03** | **P2** | 恢复源码后文件名变成默认名 | `app-session.js`<br>L7 `ui/script-tabs.ts`, `ui/controls.ts` | ~35 行 | 低 | 10 分钟 |
| **B04** | **P1** | Notebook 重复运行累加单元格不累积 | L5 `notebook-kernel.ts` (0 DOM)<br>L1 `types.ts` | ~80 行 | 中高 | 25 分钟 |
| **B05** | **P1** | 普通运行改变 `console.log()` 返回值 | L4 `runtime/runner.ts` (0 DOM) | ~6 行 | 极低 | 5 分钟 |
| **B06** | **P2** | 文件末尾检查点定位到上一行 | L3 `compiler/instrumenter.ts` (0 DOM) | ~12 行 | 低 | 10 分钟 |
| **B07** | **P2** | 行内 `case` 返回语句无调试步骤 | L3 `compiler/instrumenter.ts` (0 DOM) | ~35 行 | 中 | 15 分钟 |
| **B08** | **P2** | 只抛异常的函数被误报缺少返回值 | L3 `compiler/type-checker.ts` (0 DOM) | ~20 行 | 低 | 10 分钟 |
| **B09** | **P2** | 多文件普通运行报错标红错误文件 | L4 `runtime/runner.ts` (0 DOM) | ~35 行 | 低 | 15 分钟 |
| **B10** | **P3** | 类型检查边界提示指向不可见入口 | `index.html`, `css/app.css`, `app-session.js` | ~25 行 | 极低 | 8 分钟 |
| **F01** | **P2** | Notebook 模式缺少可见下载入口 | `index.html`, L7 `ui/notebook.ts`, `ui/controls.ts` | ~30 行 | 低 | 10 分钟 |
| **F02** | **P2** | 分享按钮为占位功能且重复提示 | `app-session.js`, L7 `ui/controls.ts` | ~35 行 | 低 | 10 分钟 |
| **O01** | **P3** | 文件标签键盘与辅助技术可达性不足 | L7 `ui/script-tabs.ts`, `ui/notebook.ts`, `css/app.css` | ~65 行 | 低 | 15 分钟 |
| **O02** | **P3** | 连续运行的日志缺少清晰轮次边界 | L4 `runtime/event-loop.ts`, L7 `ui/controls.ts`, `css/app.css` | ~45 行 | 低 | 12 分钟 |
| **O03** | **P3** | 普通桌面视口下底部重要提示被截断 | `index.html`, `css/app.css` | ~20 行 | 极低 | 8 分钟 |
| **O04** | **P3** | 执行前变量与执行后赋值同时出现不直观 | L6 `viz/memory-graph.ts`, `css/app.css` | ~55 行 | 中 | 18 分钟 |
| **O05** | **P2** | 无文本选择时 `Ctrl+C` 会修改源码 | L7 `ui/controls.ts`, `ui/notebook.ts`, `index.html` | ~25 行 | 低 | 8 分钟 |
| **R01** | **P1** | 存储版本不匹配时静默删除用户数据 | `storage-guard.js` | ~60 行 | 中 | 16 分钟 |

### 3.2 分阶段与总体工程量汇总

| 阶段 | 包含问题项 | 涉及文件数 | 预计新增/修改代码量 | 预计验证与测试新增量 | 预估工时 |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Phase 1：存储与会话持久化** | R01, B01, B02, B03 | 6 个文件 | ~275 LOC | ~60 LOC | ~1.2 小时 |
| **Phase 2：Notebook 内核与运行时语义** | B04, B05 | 3 个文件 | ~86 LOC | ~35 LOC | ~0.5 小时 |
| **Phase 3：编译器、类型检查与多文件报错** | B06, B07, B08, B09 | 3 个文件 | ~102 LOC | ~55 LOC | ~0.8 小时 |
| **Phase 4：功能补齐与快捷键治理** | B10, F01, F02, O05 | 5 个文件 | ~115 LOC | ~30 LOC | ~0.6 小时 |
| **Phase 5：无障碍、日志、视口与状态呈现** | O01, O02, O03, O04 | 6 个文件 | ~185 LOC | ~25 LOC | ~0.9 小时 |
| **Phase 6：全量回归测试与五步构建验收** | 10 大门禁 + E2E 冒烟 | 4 个测试文件 | — | ~205 LOC（含上方单测） | ~0.5 小时 |
| **总计（Total）** | **全部 18 项问题** | **14 个源码/资源文件 + 3 个测试文件** | **约 760 LOC** | **约 205 LOC** | **约 4.5 人时**（AI 自动执行约 2–3 轮工具调用） |

---

## 四、架构合规与零回归保障检查点

1. **模块数量零变动**：所有修改均在现有 34 个 `src/**/*.ts` 模块及外围脚本（`app-session.js`、`storage-guard.js`、`index.html`、`css/app.css`）内完成，`Gate 10a (34 modules)` 保持 100% 通过。
2. **纯逻辑层零 DOM 污染**：`notebook-model.ts`、`notebook-kernel.ts`、`script-tabs-store.ts`、`runner.ts`、`instrumenter.ts`、`type-checker.ts` 绝不出现任何 `localStorage`、`window`、`document` 引用，`Gate 9 (22 pure modules 0 DOM)` 保持 100% 通过。
3. **零类型断言逃逸**：新增的 JSON 解析与存储恢复全部采用 `isRecord()` 与显式字段类型守卫，`Gates 1-7 (0 any / 0 ! / 0 as)` 保持 100% 通过。
