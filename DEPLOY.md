# 部署说明 · TypeScript Playground VISUAL

`dist/` 目录是**已经构建好的纯静态站点**，部署时不需要 `npm install`、也不需要后端服务。直接将 `dist/` 目录交给任意静态 HTTP(S) 服务器或静态托管平台即可。

更新时间：2026-10-23（基于 `src/**/*.ts` 模块化 TypeScript 架构）。

## 1. 发布包内文件结构 (`dist/`)

```text
index.html                 主页面（TS / PY 均从这里进入）
share.html                 分享链接的沙箱预览页
app-session.js             自动保存 / 分享链接管理
css/app.css                全部界面与可视化组件样式
js/app.bundle.js           主应用核心管线（由 src/main.ts 打包生成）
editor/cm.bundle.js        CodeMirror 6 编辑器构建产物
editor/ts-worker.bundle.js 官方 TypeScript 编译器 Web Worker 构建产物
python/py_engine.js        Python 主线程引擎
python/py_worker.js        Pyodide Web Worker
python/py_bridge.py        Python 插桩 / 快照桥接脚本
python/serve.mjs           本地零依赖静态服务器（需要 Node.js）
README.md                  项目架构与技术文档
USER_GUIDE.md              用户操作手册
SYNTAX_REFERENCE.md        TypeScript 语法与可视化范围参考手册
DEPLOY.md                  本部署说明文件
```

⚠️ 请保持上述目录结构完整上传：页面逻辑在 `js/app.bundle.js`、编辑器与类型工作线程在 `editor/`、样式在 `css/app.css`、分享页与 Python 模式依赖对应的相对路径文件。

## 2. 从源码构建发布包

如果你在开发环境中修改了 `src/**/*.ts` 或 `editor/` 下的源码，请运行：

```bash
npm ci
npm run build
```

该命令会依次执行：
1. `node scripts/build-editor.mjs`：通过 `esbuild` 将 `src/main.ts`、`editor/cm-entry.js`、`editor/ts-worker-entry.js` 打包为 `js/app.bundle.js`、`editor/cm.bundle.js` 和 `editor/ts-worker.bundle.js`；
2. `node test-pipeline.mjs`：运行全量自动化回归测试；
3. `node scripts/build.mjs`：将所有静态产物校验并复制组装到 `dist/` 目录。

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
2. 顶部切到 `PY`，Python 样例能正常加载、单步调试并渲染可视化结构。
3. 点击「⬇ 导出 / 下载」→「🔗 复制分享链接」，打开链接可进入 `share.html` 沙箱预览且不自动运行。
4. 刷新页面后，上次编辑的代码、文件名和语言模式自动恢复。
