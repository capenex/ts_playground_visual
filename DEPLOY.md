# 部署说明 · TypeScript Playground VISUAL

`dist/` 目录是**已经构建好的纯静态站点**，部署时不需要 `npm install`、也不需要后端服务。直接将 `dist/` 目录交给任意静态 HTTP(S) 服务器或静态托管平台即可。

更新时间：2026-10-24（基于 `src/**/*.ts` 17 模块严格化 TypeScript 架构，全库 `0 any` / `0 !` 非空断言，支持 Script 源码模式与交互式 `.ipynb` Notebook 模式）。

## 1. 发布包内文件结构 (`dist/`)

```text
index.html                 主页面（TS / PY 及 Script / Notebook 均从这里进入）
share.html                 分享链接的沙箱预览页
storage-guard.js           本地存储版本守卫（在 <head> 最先执行，版本变更时精准清理本应用旧缓存）
app-session.js             自动保存 / 分享链接管理
css/app.css                全部界面与可视化组件样式
js/app.bundle.js           主应用核心管线（由 src/main.ts 及严格 TS 模块打包生成）
editor/cm.bundle.js        CodeMirror 6 编辑器构建产物（含主编辑器与 Notebook 单元格编辑器）
editor/ts-worker.bundle.js 官方 TypeScript 编译器 Web Worker 构建产物
python/py_engine.js        Python 主线程引擎
python/py_worker.js        Pyodide Web Worker
python/py_bridge.py        Python 插桩 / 快照桥接脚本
python/serve.mjs           本地零依赖静态服务器（需要 Node.js）
examples/                  示例源码与测试脚本目录
README.md                  项目架构与技术文档
USER_GUIDE.md              用户操作手册（含 Script 与 Notebook 模式指南）
SYNTAX_REFERENCE.md        TypeScript 语法与可视化范围参考手册
REFACTOR_PLAN.md           TypeScript 模块化架构映射与严格化编程验收规范
DEPLOY.md                  本部署说明文件
```

⚠️ 请保持上述目录结构完整上传：页面逻辑在 `js/app.bundle.js`、存储守卫在 `storage-guard.js`、编辑器与类型工作线程在 `editor/`、样式在 `css/app.css`、分享页与 Python 模式依赖对应的相对路径文件。

## 2. 从源码构建发布包

如果你在开发环境中修改了 `src/**/*.ts` 或 `editor/` 下的源码，请运行：

```bash
npm ci
npm run build
```

该命令会依次执行：
1. `node scripts/build-editor.mjs`：通过 `esbuild` 将 `src/main.ts`、`editor/cm-entry.js`、`editor/ts-worker-entry.js` 打包为 `js/app.bundle.js`、`editor/cm.bundle.js` 和 `editor/ts-worker.bundle.js`，并自动将 `STORAGE_VERSION` 同步注入到 `storage-guard.js` 与 `index.html`；
2. `node test-pipeline.mjs`：运行全量自动化回归测试（含本地存储版本守卫 T1–T4 验收测试）与 **Strict TS Gate 严格化门禁**（强制检查 `src/**/*.ts` 中 `0 any`、`0 !` 非空断言、`0 @ts-ignore` 并执行 `tsc --noEmit` 零报错验证）；
3. `node scripts/build.mjs`：将所有静态产物与五份文档校验并复制组装到 `dist/` 目录。

> **本地存储版本守卫规范**：凡修改了本地持久化数据结构（如 `ts-playground-session-v1` 或 `ts-visual-vfs-*` 的 JSON 结构），发布前请递增 `scripts/build-editor.mjs` 中的 `STORAGE_VERSION`（或通过环境变量 `STORAGE_VERSION=YYYYMMDD-N npm run build` 构建）。用户浏览器首次加载新版本时，`storage-guard.js` 会自动清理当前应用的旧 `ts-playground-*` / `ts-visual-*` 存储并回退到默认样例，同时严禁调用 `localStorage.clear()`，不会误伤同源下其他应用的数据。

## 3. 本地试跑

### 方式 A：使用内置 Node.js 静态服务器（推荐）

```bash
node dist/python/serve.mjs
# 或在项目根目录直接运行：
npm run serve
```

然后打开 <http://127.0.0.1:5180/>（或运行 `npm start` 打开 `http://127.0.0.1:3000/`）。

默认监听 `127.0.0.1`。若需开放给局域网其他设备访问：

```bash
# macOS / Linux
HOST=0.0.0.0 PORT=8080 node dist/python/serve.mjs

# Windows PowerShell
$env:HOST='0.0.0.0'; $env:PORT='8080'; node dist/python/serve.mjs
```

### 方式 B：使用其他任意静态服务器

```bash
python -m http.server 5180 --directory dist
# 或 PHP:
php -S 127.0.0.1:5180 -t dist
```

⚠️ **请通过 HTTP(S) 打开页面，不要直接双击 `file://`**。Web Worker（TypeScript 后台类型检查器与 Python Pyodide）、分享沙箱及剪贴板功能均需要 HTTP(S) 环境。

## 4. 部署到静态托管平台

直接将 `dist/` 目录中的**全部内容**发布到站点根目录：

- **GitHub Pages**：将 `dist/` 内容推送到发布分支（或配置 Actions 发布 `dist` 目录）。
- **Vercel / Netlify / Cloudflare Pages**：构建命令填 `npm run build`，发布目录（Output Directory）填 `dist`。
- **Nginx / Apache**：将站点 `root` 指向 `dist` 目录。

如果服务器需要手动配置 MIME：

```nginx
types {
  text/javascript js;
  application/wasm  wasm;
  text/plain        py;
}
```

## 5. Python 模式与离线部署（可选）

- 默认从 jsDelivr 加载 Pyodide 0.26.4：首次切换到 `PY` 模式需联网加载（约 1–3 秒），`numpy` 在首次 `import numpy` 时按需加载。
- 若部署在内网/离线环境：
  1. 将 Pyodide 0.26.4 运行时文件放入 `python/pyodide/`；
  2. 在 `index.html` 中 `<script src="python/py_engine.js"></script>` 之前加入：
     ```html
     <script>window.PYODIDE_BASE = 'python/pyodide/';</script>
     ```

## 6. 验收清单

1. 打开首页，默认加载 `showcase` 样例并自动进入 Debug 模式，右侧展示数据结构卡片，顶部可切换 `async_loop` 等全部 10 个 TS 样例。
2. 点击顶部 `📓 Notebook` 切换到交互式笔记本模式，默认展示 `Intro.ipynb`，可跨单元格运行代码并点击单元格右上角 `🐞` 进行单步可视化调试。
3. 顶部切到 `PY`，Python 样例与 Python Notebook 均能正常加载、单步调试并渲染可视化结构。
4. 点击「⬇ 导出 / 下载」→「🔗 复制分享链接」，打开链接可进入 `share.html` 沙箱预览且不自动运行。
5. 刷新页面后，上次编辑的代码、文件名和语言模式自动恢复。

