# 构建与部署指南 (`DEPLOY.md`)

**TypeScript Playground VISUAL (Visual TypeScript Engine)** 是一个 **100% 纯前端、零后端状态依赖、零外部 CDN 运行时依赖** 的自包含 Web 应用程序。所有的 TypeScript 编译插桩（由 `src/` 下 34 个严格分层模块打包为 `js/app.bundle.js`）、静态类型检查、虚拟事件循环、Jupyter `.ipynb` 解析、VFS 虚拟文件系统以及 1080p 60fps WebM 视频编码均在用户浏览器本地完成。

因此，你可以将构建生成的 `dist/` 目录直接托管在任何静态网站服务（GitHub Pages、Cloudflare Pages、Vercel、Netlify、Nginx、S3 等）上，**无需配置任何特殊的跨源隔离响应头（COOP / COEP）或后端服务**。

---

## 1. 构建静态生产包 (`dist/`)

在部署前，请按顺序执行源码类型检查、Bundle 打包、自动化门禁与静态产物组装：

```bash
# 1. 验证 TypeScript 源码严格模式零错误 (strict + noUncheckedIndexedAccess)
./node_modules/.bin/tsc --noEmit

# 2. 重新编译打包 src/ 下的 34 个 TS 模块至 js/app.bundle.js 及 editor/*.bundle.js
node scripts/build-editor.mjs

# 3. 运行 10 大静态架构门禁与全链路沙箱测试
node test-pipeline.mjs

# 4. 组装并校验生产环境静态目录 dist/
npm run build
```

`npm run build`（即 `node scripts/build.mjs`）会自动清理并生成 `dist/` 目录，内含所有运行所需资源：
- `index.html`、`share.html`、`storage-guard.js`、`app-session.js`
- `css/app.css`
- `js/app.bundle.js`（由 `src/` 下 34 个 TypeScript 模块经 `esbuild` 打包生成）
- `editor/cm.bundle.js`、`editor/ts-worker.bundle.js`
- `examples/`（内置 10 个 TypeScript 示例文件与 7 份 `.ipynb` 交互式教学笔记本）
- 核心文档（`README.md`、`ARCHITECTURE.md`、`USER_GUIDE.md`、`SYNTAX_REFERENCE.md`、`DEPLOY.md`、`CHANGELOG.md`）

---

## 2. 各平台部署配置示例

### 2.1 本地启动与预览

```bash
# 开发与本地预览（默认监听 http://0.0.0.0:3000）
npm start
```

### 2.2 GitHub Pages / Cloudflare Pages / Netlify

直接将构建输出目录设置为 `dist` 即可，无需任何额外 Header 或重写规则：
- **Build command**: `npm run build`
- **Publish / Output directory**: `dist`

### 2.3 Vercel (`vercel.json`)

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}
```

### 2.4 Nginx 静态托管配置片段

```nginx
server {
    listen 80;
    server_name visualizer.example.com;
    root /var/www/visualizer/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```
