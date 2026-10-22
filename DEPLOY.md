# 部署说明 · TypeScript Playground VISUAL

这个压缩包是**已经构建好的静态站点**，不需要 `npm install`、不需要再打包。解压后把整个目录交给任意静态 HTTP(S) 服务器即可。

构建时间：2026-10-20（基于本地 `python-support` 工作区）。

## 1. 包内文件

```
index.html                 主页面（TS / PY 均从这里进入；只含界面结构与脚本顺序）
css/app.css                全部样式
js/01…10-*.js              应用代码，10 个分片，按 index.html 中的顺序加载
share.html                 分享链接的沙箱预览页
app-session.js             自动保存 / 分享链接
editor/cm.bundle.js        CodeMirror 6 编辑器（构建产物，必须保留）
python/py_engine.js        Python 主线程引擎
python/py_worker.js        Pyodide Worker
python/py_bridge.py        Python 插桩 / 快照桥
python/serve.mjs           本地静态服务器（需要 Node.js）
README.md                  项目架构文档（偏开发）
USER_GUIDE.md              用户操作手册
SYNTAX_REFERENCE.md        TypeScript 语法与可视化范围
DEPLOY.md                  本文件
```

⚠️ 不要单独只上传 `index.html`：页面逻辑在 `js/`、样式在 `css/`，编辑器、分享页和 Python 模式还依赖上面这些相对路径文件。

## 2. 本地试跑

### 有 Node.js（推荐）

在解压后的目录里执行：

```bash
node python/serve.mjs
```

然后打开 <http://127.0.0.1:5180/>。

默认只监听 `127.0.0.1`。如果要让同一局域网的其他设备访问：

```bash
# macOS / Linux
HOST=0.0.0.0 PORT=8080 node python/serve.mjs

# Windows PowerShell
$env:HOST='0.0.0.0'; $env:PORT='8080'; node python/serve.mjs
```

⚠️ 应用会在浏览器里执行你输入的代码；开放到局域网前先确认访问者可信。

### 没有 Node.js

任意静态服务器都可以，例如：

```bash
python -m http.server 5180
# 或 Windows: py -m http.server 5180
# 或 PHP:     php -S 127.0.0.1:5180
```

然后打开 <http://127.0.0.1:5180/>。

⚠️ **不要直接双击 `index.html`（`file://`）**。编辑器和页面脚本可以部分加载，但 Python 模式、分享沙箱、剪贴板等会受浏览器安全策略限制；请用 HTTP 打开。

## 3. 部署到静态托管

直接把解压目录里的**全部内容**上传到站点根目录：

- GitHub Pages：仓库根目录（或 `docs/`，在 Settings → Pages 里选择对应目录），不需要构建命令。
- Netlify / Cloudflare Pages / Vercel：发布目录选解压后的目录，构建命令留空。
- Nginx / Apache：把站点 root 指向解压目录。

如果服务器需要手动配置 MIME：

```nginx
types {
  text/javascript js;
  application/wasm  wasm;
  text/plain        py;
}
```

`.py` 只用于 `fetch` 读取 Python 桥接脚本；`.wasm` 只有在你把 Pyodide 本地化后才会用到。

## 4. Python 模式

- 默认从 jsDelivr 加载 Pyodide 0.26.4：首次进入 Python 模式需要联网，通常 1–3 秒；`numpy` 在第一次 `import numpy` 时加载。
- 只支持 Python 标准库 + numpy / 纯 Python 算法库；不做静态类型检查，运行前只检查语法。
- `open()` 只作用于 Pyodide 的**虚拟文件系统**，不能读写本机文件；`input()` 没有终端；单次最多 2000 步 / 6 秒。

### 离线部署（可选）

如果部署环境不能访问 jsDelivr：

1. 把 Pyodide 0.26.4 的完整运行时放到 `python/pyodide/`（至少包含 `pyodide.js`、`pyodide.asm.js`、`pyodide.asm.wasm`、`python_stdlib.zip`、`pyodide-lock.json`；需要 numpy 时再放对应 wheel）。
2. 在 `index.html` 里、`<script src="python/py_engine.js"></script>` **之前**加一行：

```html
<script>window.PYODIDE_BASE = 'python/pyodide/';</script>
```

3. 确保服务器把 `.wasm` 作为 `application/wasm` 返回，并保留末尾的 `/`。

## 5. 自动保存与分享

- 代码、文件名、语言保存在浏览器 `localStorage`；刷新会恢复，但**不会自动运行**。
- 分享按钮生成 `share.html#s=...` 链接：代码经 gzip + base64url 压缩，打开后只加载、不运行。
- TypeScript 分享在 `sandbox="allow-scripts allow-downloads"`（无 `allow-same-origin`）的 iframe 中运行，不能访问主页面的 DOM / localStorage。
- Python 分享在沙箱 iframe 里可能因 Worker 加载限制而失败；失败时把代码复制到完整页面运行。
- 分享链接的代码在 URL 片段里，不会作为请求发给静态服务器，但任何拿到链接的人都能看到代码，别放敏感内容。

## 6. 安全与隐私

- 应用是纯前端：没有后端，不主动上传代码。
- **完整页面里的 TypeScript 代码由 `new Function` 执行，可以访问页面全局对象；它不是安全沙箱。** 只运行你信任的代码。
- Python 代码运行在 Pyodide Worker 中；`share.html` 的 TS 分享运行在隔离 iframe 中。
- 默认没有统计 / 埋点；Python 模式会从 jsDelivr 拉取运行时。

## 7. 验收清单

1. 打开首页，TypeScript 样例能加载并「运行 / Debug」。
2. 顶部切到 `PY`，quickstart 能运行（首次等待 Pyodide 加载），返回排序后的数组。
3. 点「⬇ 导出 / 下载」→「🔗 复制分享链接」，新开链接能看到 `share.html` 沙箱并显示「沙箱已就绪」，且不会自动运行。
4. 刷新页面，刚才的代码 / 语言被恢复。
5. 如果修改了文件后浏览器仍显示旧界面，`Ctrl + F5` 强刷（`editor/cm.bundle.js` 带版本参数）。
