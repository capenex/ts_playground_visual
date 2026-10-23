# TypeScript Playground VISUAL · 用户使用指南

欢迎使用 **TypeScript Playground VISUAL**！这是一款将 **TypeScript / Python 代码编写、实时静态类型检查、按需逐行 Debug 调试、异步 Event Loop 可视化、数据结构实时可视化** 与 **1080p 60fps 演示视频导出** 融为一体的交互式工具。源码区由 **CodeMirror 6** 驱动，支持查找替换、多光标、括号匹配、自动缩进、代码折叠与错误波浪线。

通过静态 HTTP 服务打开（`npm start` 或 `node python/serve.mjs`），即可开始可视化编程与调试。

---

## 一、 界面快速导览

整个界面分为五个直观区域：

1. **顶部工具栏**
   - **`TS / PY` 语言切换**：顶部下拉框在 TypeScript 和 Python 模式之间切换，两种模式各自独立保留缓冲区。
   - **内置样例下拉菜单**：内置 **10 个 TypeScript** + **6 个 Python** 样例（涵盖二叉搜索树、归并排序递归调用栈、报错即停、二维 DP、滑动窗口、类与实例方法、以及 `async/await` 异步 Event Loop 演示），切换样例后会自动编译并进入 Debug 调试视图。
   - **`📂 导入` 按钮**：选择一个本地 `.ts` / `.tsx` / `.js` / `.jsx` / `.txt` / `.py` 文件读入编辑器（纯本地读取，不会上传到任何服务器）。
   - **`▶ 运行` 按钮**（快捷键 `Ctrl/Cmd + Enter`）：校验类型后直接运行完整代码（包含异步微任务与 `setTimeout` 宏任务事件循环），并在左下方日志区输出最终返回值与 `console.log` 打印内容；**同步死循环超过 2 秒会自动熔断**并报出死循环所在行。
   - **`🐞 Debug 调试` 按钮**（快捷键 `Ctrl/Cmd + Shift + Enter`）：编译并校验类型通过后，启动按需逐行计算的 Debug 调试模式。
   - **`⬇ 导出 / 下载 ▾` 下拉菜单**（右上角）：
     - **📄 导出 TypeScript / Python 文件**：把编辑器里的源码原样下载为 `.ts` / `.py`，文件名取自 SOURCE 标题栏里的可编辑文件名。
     - **🔗 复制分享链接**：生成压缩后的代码分享链接，打开后进入 `share.html` 的沙箱预览（只加载、不自动运行）。
     - **🎬 导出视频 (`1920×1080 · 60fps`)**：先选择倍速档位（`0.75x` / `1x` / `1.5x` / `2x` / `3x`），再点击「🎬 导出视频」，即可生成高清 WebM 演示视频。

2. **左侧：SOURCE 代码编辑与内联调试画布**
   - 标题栏里的 **`TS ␣ 文件名` 芯片可以直接点击改名**（按 `Enter` 提交、`Esc` 撤销）。
   - 处于 Debug 模式时，**当前即将执行的代码行**会高亮显示，并在**该行正上方浮出一枚可视化胶囊**（浮层盖在代码之上，不挤占行内空间），实时展示本行的赋值流向（`⟵`）、条件真假判断（`⇒ true / false`）、函数调用参数求值、检查点状态或运行时报错详情。若当前行在第一行或可视区顶端，胶囊会自动落到该行下方（`╰─`）。

3. **中间：可拖拽分隔条**
   - 左右拖动中间竖线可自由调节代码区与右侧可视化面板的宽度比例；**双击分隔条**可一键恢复默认比例。

4. **右侧：调用栈面包屑 · LOCALS · WATCH · 调试控制台**
   - **调用栈面包屑与栈帧切换（`LOCALS` 顶部）**：实时显示当前的函数调用链条（例如 `global ▸ mergeSort(0, 7) ▸ mergeSort(0, 3) ▸ mergeSort(0, 1)`）。**点击面包屑中的任意栈帧**，即可将 `LOCALS` 面板、`WATCH` 面板以及左侧代码高亮行切换到该层调用栈帧的作用域。
   - **LOCALS（局部变量）**：显示当前选中栈帧内所有原始类型变量及 `Promise` 状态摘要；刚刚发生变化的值会高亮提示。
   - **WATCH（数据结构与 Event Loop 可视化）**：顶部显示所有检测到的复杂结构芯片（点击可显隐对应卡片），下方以自适应双列网格实时渲染数组、滑动窗口、栈、队列、堆、并查集、链表、哈希表、集合、二维矩阵、接口/类实例卡片、二叉树、图结构以及异步 `eventLoop` 调度面板。
   - **底部输出栏**：显示当前步骤的完整执行表达式与动作摘要。

5. **底部 Debug 控制栏**
   - **`‹ 上一步` / `下一步 ›`**（或按键盘左右方向键 `←` / `→` / `Space`）：回退查看历史步，或当场计算推进到下一步。
   - **状态指示徽章**：显示当前调试状态（`● 调试运行中`、`◉ 命中检查点`、`✗ 运行时报错`、`✓ 执行完毕`）。
   - **`⏭ 运行到下一个检查点`**：连续快速计算，直到遇到代码中的下一个 `checkpoint()`、发生运行时报错或程序结束时自动暂停。
   - **`＋ 添加检查点函数`**：在当前光标所在行一键插入 `checkpoint();`，且**保持当前调试进度不会回到第一步**。
   - **`▶ 自动`**：按固定节奏自动逐步推进；遇到运行时报错或程序结束时自动停下。

---

## 二、 如何编写你自己的可调试代码？

### 1. 在最后一行直接写入口调用
在编辑器最后一行写真实的顶层调用语句，调试器会把**最后一行顶层调用**当作入口，并把它的返回值（若为 `async` 函数返回的 `Promise`，则等待虚拟事件循环清空后的最终解包值）作为运行结果：

```typescript
function binarySearch(nums: number[], target: number): number {
  let l = 0, r = nums.length - 1;
  while (l <= r) {
    const mid = (l + r) >> 1;
    checkpoint("检查中点", l, mid, r, nums[mid]);
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) l = mid + 1;
    else r = mid - 1;
  }
  return -1;
}

binarySearch([1, 3, 5, 7, 9, 11], 7);
```

### 2. 让数据结构自动呈现最佳图形效果的小技巧
右侧 `WATCH` 面板会根据**变量的值结构**与**变量名称**自动选择最匹配的渲染器：
- **滑动窗口高亮**：只要当前作用域内同时存在名为 `l` 和 `r`（或 `left`/`right`、`lo`/`hi`、`start`/`end`）的整型变量，所有一维数组与字符串卡片都会自动高亮显示 `[l..r]` 窗口区间，并标注 `i`、`j`、`mid` 等指针标签！
- **超大数组与超大矩阵自动焦点切片**：当一维数组/链表超过 20 项（例如 10,000 项）或二维矩阵超过 `10×10`（例如 `100×100`）时，`WATCH` 卡片会自动围绕当前访问下标与指针生成滑动焦点视窗，不会撑爆页面。
- **栈 (`Stack`)**：将数组变量命名为 `stack` 或 `stk`，自动切换为带 `top` 栈顶标识的垂直栈视图。
- **队列 (`Queue`)**：将数组变量命名为 `queue` 或 `deque`，自动标注 `front`（队首）与 `back`（队尾）。
- **堆 / 优先队列 (`Heap`)**：将数组变量命名为 `heap` 或 `pq`，自动标注堆顶并展示父子节点下标公式。
- **并查集 (`Union-Find`)**：将整型数组命名为 `parent`、`uf`、`fa` 或 `dsu`，自动标识 `root` 根节点与 `p:i` 父指针。
- **二叉树 (`Tree`)**：包含 `{ val, left, right }` 属性的对象会自动绘制为 SVG 二叉树。
- **图 (`Graph`)**：包含 `{ nodes: [{ id, label }], edges: [[u, v]] }` 的对象会自动绘制为 SVG 拓扑网络图。
- **单链表 (`List`)**：包含 `{ val, next }` 的嵌套对象会自动渲染为 `val → val → null` 指针链，并自动标出 `slow` / `fast` / `cur` 等节点指针。
- **二维网格 (`Grid`)**：二维数组 `number[][]`（如动态规划 `dp` 表）会自动渲染为二维矩阵，并在执行 `dp[i][j] = ...` 时高亮当前写入格与依赖格。
- **异步事件循环 (`eventLoop`)**：代码中使用 `async / await`、`Promise`、`queueMicrotask`、`setTimeout` 或 `sleep` 时，自动出现 `eventLoop` 四栏看板（Async 协程状态、Microtask 队列、Macrotask 定时器队列、Promise 状态表）。

---

## 三、 异步 Event Loop 调试 (`async / await` · `Promise` · `setTimeout`)

切换到内置样例 **`async_loop · 异步 Event Loop`** 或编写你自己的异步代码：

```typescript
function sleep<T>(ms: number, value: T): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(value);
    }, ms);
  });
}
```
- **标准兼容**：推荐显式声明基于 `new Promise` + `setTimeout` 的 `sleep` 函数（同时支持箭头函数 `(resolve) => ...` 与匿名函数 `function(resolve) { ... }`），代码に直接复制到官方 TypeScript Playground 也能零报错运行（沙箱同时也内置了兜底的 `sleep(ms, val)` 辅助函数）。
- **跨异步边界单步**：当执行到 `await fetchScore(3, 20)` 时，当前 `async` 栈帧会挂起（`⏸ 挂起`），控制权交还事件循环依次清空微任务队列（`Promise.then`、`queueMicrotask`）并触发到期的 `setTimeout` 宏任务；待 `Promise` 兑现后，挂起的协程自动恢复回调用栈继续单步执行！

---

## 四、 使用检查点 (`checkpoint`) 与排查报错

### 1. 插入与移除 `checkpoint()` 检查点
- **点击行号**：直接点击代码框左侧的**行号数字**，即可在该行插入或移除 `checkpoint();`（行号旁亮起青色圆点 `◉`），且**保持当前调试进度不会回到第一步**。
- **带参数的检查点**：在代码里写 `checkpoint("窗口达标", r, sum, best)`，命中该检查点时，上方浮层胶囊会把所有传入参数的当前值一并展示出来。

### 2. 三个「一眼看出问题」的编辑辅助
1. **声明感知着色**：浅蓝色（`#9cdcfe`）只留给真正声明过的变量/参数；暖金色（`#dcdcaa`）表示语言内置对象/函数；**未声明的拼写错误保持白色**，并立即触发 `TS2304` 红色波浪线。
2. **Debug 模式下悬停查看当前值**：把鼠标停在源码或右侧卡片的任意变量（含方法内的 `this` / `self`）上，即刻弹出实时值与同款缩略可视化。
3. **报错立刻标红并定位到行**：静态类型错误与运行时异常均会标红对应代码行，点击底部日志中的诊断条目即可滚动并聚焦到报错行。

---

## 五、 全面支持的 TypeScript 语法

- **面向对象 (`class` / `abstract class`)**：支持字段、构造器参数属性 `constructor(private n: number, public name: string = "a")`、抽象类与抽象方法、类装饰器 `@sealed`、`extends`、`implements`、`static`、getter / setter。
- **枚举与命名空间 (`enum` / `namespace` / `declare`)**：支持数字枚举（含反向映射）、字符串枚举、`const enum`、`namespace` 块内导出、函数重载签名与 `declare` 环境声明。
- **高级类型系统**：支持泛型函数与泛型类、`<T, K extends keyof T>` 索引类型查询与 `T[K]` 索引访问、条件类型 `T extends U ? X : Y`（含分布式条件类型）、`infer` 类型推断、多行映射类型 `{ [K in keyof T]?: ... }` 以及内置工具类型（`Partial`、`Pick`、`Omit`、`Record`、`ReturnType`、`Parameters`、`Awaited`）。

---

## 六、 快捷键速查表

| 快捷键 / 操作 | 功能说明 |
|---|---|
| `Ctrl + Enter` / `Cmd + Enter` | 直接运行代码并打印返回结果 |
| `Ctrl + Shift + Enter` / `Cmd + Shift + Enter` | 编译并开启 Debug 调试模式 |
| `→` 或 `Space`（焦点在编辑器外） | 当场计算并推进到下一步 |
| `←`（焦点在编辑器外） | 回看上一步历史状态 |
| `Ctrl + F` / `Cmd + F` | 打开查找 / 替换面板 |
| `Ctrl + D` / `Cmd + D` | 选择下一个相同词（多光标） |
| `Alt + 点击` | 添加一个光标 |
| `Ctrl + Z` / `Cmd + Z` | 撤销；加 `Shift` 为重做 |
| `Tab` / `Shift + Tab`（编辑器内） | 缩进 / 反缩进（TS 2 空格，Python 4 空格） |
| 点击左侧行号 | 在该行快速插入 / 移除 `checkpoint();` 检查点 |
| 拖拽中间分隔线 / 双击分隔线 | 调整左右面板宽度 / 恢复默认比例 |
