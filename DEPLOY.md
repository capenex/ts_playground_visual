# 构建与部署指南 (`DEPLOY.md`)

**Algorithm Visualizer (Visual TypeScript & Python Engine)** 是一个**100% 纯前端、零后端状态依赖**的 Web 应用程序。所有的 TypeScript 编译插桩（由 `src/` 下 34 个严格分层模块打包为 `js/app.bundle.js`）、Python `Pyodide` WebAssembly 执行、Jupyter `.ipynb` 解析、VFS 虚拟文件系统以及 WebM 视频编码均在用户浏览器本地完成。

因此，你可以将构建生成的 `dist/` 目录直接托管在任何静态网站服务（GitHub Pages、Cloudflare Pages、Vercel、Netlify、Nginx、S3 等）上。

---

## 1. 构建静态生产包 (`dist/`)

在部署前，请按顺序执行源码类型检查、Bundle 打包与静态产物组装：

```bash
# 1. 验证 TypeScript 源码严格模式零错误 (strict + noUncheckedIndexedAccess)
./node_modules/.bin/tsc --noEmit

# 2. 重新编译打包 src/ 下的 34 个 TS 模块至 js/app.bundle.js 及 editor/*.bundle.js
node scripts/build-editor.mjs

# 3. 运行 9 大静态架构门禁与全链路沙箱测试
node test-pipeline.mjs

# 4. 组装并校验生产环境静态目录 dist/
npm run build
```

`npm run build`（即 `node scripts/build.mjs`）会自动清理并生成 `dist/` 目录，内含所有运行所需资源：
- `index.html`、`share.html`、`storage-guard.js`、`app-session.js`
- `css/app.css`
- `js/app.bundle.js`（由 `src/` 下 34 个 TypeScript 模块经 `esbuild` 打包生成）
- `editor/cm.bundle.js`、`editor/ts-worker.bundle.js`
- `python/`（`py_engine.js`、`py_worker.js`、`py_bridge.py`、`serve.mjs`）
- `examples/`（内置 TypeScript、Python 与 `.ipynb` 示例文件）
- 核心文档（`README.md`、`ARCHITECTURE.md`、`USER_GUIDE.md`、`SYNTAX_REFERENCE.md`、`DEPLOY.md`、`CHANGELOG.md`）

---

## 2. 跨源隔离响应头（COOP / COEP）配置说明

### 为什么推荐配置 COOP / COEP？
当伺服器返回以下两个 HTTP 响应头时，浏览器将启用 `crossOriginIsolated`（跨源隔离）模式，从而允许使用 **`SharedArrayBuffer`**：

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

- **启用 COOP/COEP 时**：Python 引擎底部的状态徽章显示 `⚡ 零延迟中断 (SAB)`。当你在 Python 死循环中点击「停止」按钮时，主线程通过 `SharedArrayBuffer` 原子写入中断标志，Worker 在下一个字节码周期（< 1ms）立即优雅停止，**无需销毁并重新加载 Pyodide 运行时**。
- **未启用 COOP/COEP 时（如普通 GitHub Pages）**：应用依然 **100% 正常工作**！Python 引擎会自动降级为 `🔄 Worker 重生中断` 模式（点击停止时终止当前 Worker 并后台预热新 Worker）。

---

## 3. 各平台部署配置示例

### 3.1 本地预览生产包

```bash
npm run build
node dist/python/serve.mjs 8080
```
访问 `http://localhost:8080` 即可验证包含 COOP/COEP 头的完整生产环境。

### 3.2 Cloudflare Pages / Netlify (`_headers`)

若部署到 Cloudflare Pages 或 Netlify，可在 `dist/_headers` 中写入：

```text
/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
```

### 3.3 Vercel (`vercel.json`)

```json
{
  "buildCommand": "node scripts/build-editor.mjs && npm run build",
  "outputDirectory": "dist",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" }
      ]
    }
  ]
}
```

### 3.4 Nginx 配置片段

```nginx
server {
    listen 80;
    server_name visualizer.example.com;
    root /var/www/visualizer/dist;
    index index.html;

    add_header Cross-Origin-Opener-Policy "same-origin" always;
    add_header Cross-Origin-Embedder-Policy "require-corp" always;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```
