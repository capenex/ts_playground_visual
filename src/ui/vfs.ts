/* ================================================================
   Client-Side Virtual File System (/workspace) & Node fs Shim (src/ui/vfs.ts)
   ================================================================ */
import { say } from "../runtime/event-loop";
import { uiHooks } from "../state";

export interface VfsNode {
  path: string;
  name: string;
  type: "file" | "folder";
  parentPath: string;
  content?: string;
  readonly?: boolean;
}

export const VFS_STORAGE_KEY = "ts-visual-vfs-workspace-v2";
let vfsBootInitialized = false;
let pendingVfsDeletePath: string | null = null;

export const VFS_EXPANDED_FOLDERS = new Set<string>();
export const VFS_NODES = new Map<string, VfsNode>();

export function resolveWorkspacePath(rawPath: string, allowEmptyRoot = false): string {
  const raw = String(rawPath ?? "").trim().replace(/\\/g, "/");
  if (
    !raw ||
    raw === "." ||
    raw === "./" ||
    raw === "workspace" ||
    raw === "/workspace" ||
    raw === "workspace/" ||
    raw === "/workspace/"
  ) {
    if (allowEmptyRoot) return "";
    throw new Error(`EISDIR: illegal operation on workspace root directory '${rawPath}'`);
  }
  if (/^[A-Za-z]:/.test(raw) || raw.startsWith("~")) {
    throw new Error(`EACCES: permission denied, file operations outside workspace are not allowed: '${rawPath}'`);
  }
  if (raw.startsWith("/")) {
    if (raw !== "/workspace" && !raw.startsWith("/workspace/")) {
      throw new Error(`EACCES: permission denied, file operations outside workspace are not allowed: '${rawPath}'`);
    }
  }
  let stripped = raw;
  if (stripped.startsWith("/workspace/")) {
    stripped = stripped.slice("/workspace/".length);
  } else if (stripped.startsWith("workspace/")) {
    stripped = stripped.slice("workspace/".length);
  } else if (stripped.startsWith("./")) {
    stripped = stripped.slice(2);
  }
  const rawSegments = stripped.split("/");
  const resolved: string[] = [];
  for (const seg of rawSegments) {
    if (!seg || seg === ".") continue;
    if (seg === "..") {
      if (resolved.length === 0) {
        throw new Error(`EACCES: permission denied, file operations outside workspace are not allowed: '${rawPath}'`);
      }
      resolved.pop();
      continue;
    }
    resolved.push(seg);
  }
  const firstSeg = resolved[0] || "";
  if (firstSeg === "examples" || firstSeg === "notebooks") {
    throw new Error(`EACCES: permission denied, file operations outside workspace are not allowed: '${rawPath}'`);
  }
  const finalPath = resolved.join("/");
  if (!finalPath && !allowEmptyRoot) {
    throw new Error(`EISDIR: illegal operation on workspace root directory '${rawPath}'`);
  }
  return finalPath;
}

export function ensureVfsInitialized() {
  if (vfsBootInitialized) return;
  vfsBootInitialized = true;
  VFS_NODES.clear();
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("ts-visual-vfs-v1");
      const raw = localStorage.getItem(VFS_STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (
              item &&
              typeof item === "object" &&
              typeof (item as VfsNode).path === "string" &&
              typeof (item as VfsNode).name === "string" &&
              ((item as VfsNode).type === "file" || (item as VfsNode).type === "folder")
            ) {
              const node = item as VfsNode;
              VFS_NODES.set(node.path, {
                path: node.path,
                name: node.name,
                type: node.type,
                parentPath: typeof node.parentPath === "string" ? node.parentPath : "",
                content: typeof node.content === "string" ? node.content : undefined,
                readonly: Boolean(node.readonly),
              });
            }
          }
        }
      }
    }
  } catch (_) {
    /* ignore storage errors */
  }
}

export function persistVfsToClientStorage() {
  try {
    if (typeof localStorage === "undefined") return;
    const customNodes: VfsNode[] = [];
    VFS_NODES.forEach((node) => {
      customNodes.push(node);
    });
    localStorage.setItem(VFS_STORAGE_KEY, JSON.stringify(customNodes));
  } catch (_) {
    /* ignore storage errors */
  }
}

export function ensureParentFoldersExist(relPath: string) {
  const parts = relPath.split("/").filter(Boolean);
  if (parts.length <= 1) return;
  let acc = "";
  for (let i = 0; i < parts.length - 1; i++) {
    const folderName = parts[i] || "";
    const parentPath = acc;
    acc = acc ? `${acc}/${folderName}` : folderName;
    if (!VFS_NODES.has(acc)) {
      VFS_NODES.set(acc, {
        path: acc,
        name: folderName,
        type: "folder",
        parentPath,
      });
      VFS_EXPANDED_FOLDERS.add(acc);
    }
  }
}

export function renderVfsTreeUI() {
  const treeEl = $("vfsTreeList");
  if (!treeEl) return;
  ensureVfsInitialized();

  const activePath = uiHooks.getActiveWorkspacePath();

  const childrenOf = (parentPath: string): VfsNode[] => {
    const list: VfsNode[] = [];
    VFS_NODES.forEach((node) => {
      if (node.parentPath === parentPath) list.push(node);
    });
    return list.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  };

  const buildConfirmHtml = (node: VfsNode): string => {
    if (pendingVfsDeletePath !== node.path) return "";
    return (
      `<div class="vfs-del-confirm" data-vfs-confirm-box="${esc(node.path)}">` +
      `<span class="vfs-del-confirm-text">确认删除 ${esc(node.name)}？</span>` +
      `<span class="vfs-del-confirm-actions">` +
      `<button type="button" class="vfs-confirm-btn danger" data-vfs-confirm-del="${esc(node.path)}">确认</button>` +
      `<button type="button" class="vfs-confirm-btn" data-vfs-cancel-del="${esc(node.path)}">取消</button>` +
      `</span>` +
      `</div>`
    );
  };

  const renderNode = (node: VfsNode, depth: number): string => {
    const padLeft = 8 + depth * 14;
    const canDel = !node.readonly;
    const delBtnHtml = canDel
      ? `<span class="vfs-row-actions"><button type="button" class="vfs-del-btn" data-vfs-del="${esc(node.path)}" title="删除">❌</button></span>`
      : "";
    if (node.type === "folder") {
      const isOpen = VFS_EXPANDED_FOLDERS.has(node.path);
      const kids = childrenOf(node.path);
      return (
        `<div class="vfs-folder-row" data-vfs-folder="${esc(node.path)}" style="padding-left:${padLeft}px" title="单击展开/折叠目录 · 双击重命名目录">` +
        `<span class="vfs-caret">${isOpen ? "▾" : "▸"}</span>` +
        `<span class="vfs-icon">📁</span>` +
        `<span class="vfs-name">${esc(node.name)}/</span>` +
        delBtnHtml +
        `</div>` +
        buildConfirmHtml(node) +
        (isOpen
          ? `<div class="vfs-folder-children">${kids.map((k) => renderNode(k, depth + 1)).join("")}</div>`
          : "")
      );
    }

    const isAct = Boolean(activePath && node.path === activePath);
    const ext = (node.name.split(".").pop() || "").toLowerCase();
    const icon =
      ext === "ipynb"
        ? "📓"
        : ext === "py"
        ? "🐍"
        : ext === "ts"
        ? "📘"
        : ext === "json"
        ? "🗂"
        : "📄";
    return (
      `<div class="vfs-file-row${isAct ? " active" : ""}" data-vfs-file="${esc(node.path)}" style="padding-left:${padLeft}px" title="${esc(node.path)}（单击打开 · 双击重命名）">` +
      `<span class="vfs-icon">${icon}</span>` +
      `<span class="vfs-name">${esc(node.name)}</span>` +
      delBtnHtml +
      `</div>` +
      buildConfirmHtml(node)
    );
  };

  const roots = childrenOf("");
  if (roots.length === 0) {
    treeEl.innerHTML = `<div class="vfs-empty-hint" style="padding:14px 10px;color:#64748b;font-size:11.5px;text-align:center;">空目录</div>`;
  } else {
    treeEl.innerHTML = roots.map((r) => renderNode(r, 0)).join("");
  }

  const footEl = $("vfsFootStatus");
  if (footEl) {
    let fileCount = 0;
    let totalBytes = 0;
    VFS_NODES.forEach((n) => {
      if (n.type === "file") {
        fileCount++;
        totalBytes += (n.content || "").length;
      }
    });
    const kb = (totalBytes / 1024).toFixed(1);
    footEl.textContent = `${fileCount} 个文件 (${kb} KB)`;
  }
}

export function openVfsFile(rawPath: string) {
  ensureVfsInitialized();
  let path = rawPath;
  try {
    path = resolveWorkspacePath(rawPath, false);
  } catch (err) {
    say(`✗ ${err instanceof Error ? err.message : String(err)}`, "err");
    return;
  }
  const node = VFS_NODES.get(path);
  if (!node || node.type !== "file") return;

  if (node.name.endsWith(".ipynb")) {
    uiHooks.openVfsNotebookFile(node.name, node.content);
    return;
  }

  const isPyFile = node.name.endsWith(".py");
  if (isPyFile && LANG !== "python" && typeof PY_ENGINE !== "undefined" && PY_ENGINE.setLang) {
    PY_ENGINE.setLang("python");
  } else if (node.name.endsWith(".ts") && LANG === "python" && typeof PY_ENGINE !== "undefined" && PY_ENGINE.setLang) {
    PY_ENGINE.setLang("ts");
  }

  uiHooks.setViewMode("script");
  uiHooks.openVfsScriptFile(node.path, node.name, node.content || "");
  renderVfsTreeUI();
  say(`📂 已打开 ${node.path}`, "ok");
}

function serializeFsData(data: unknown): string {
  if (typeof data === "string") return data;
  if (data instanceof Uint8Array) {
    return typeof TextDecoder !== "undefined" ? new TextDecoder().decode(data) : String(data);
  }
  if (data !== null && typeof data === "object") {
    try {
      return JSON.stringify(data, null, 2);
    } catch (_) {
      return String(data);
    }
  }
  return String(data ?? "");
}

function createVfsCoreApi() {
  const api = {
    resolveWorkspacePath(rawPath: string, allowEmptyRoot = false): string {
      return resolveWorkspacePath(rawPath, allowEmptyRoot);
    },
    readFile(path: string): string | null {
      ensureVfsInitialized();
      const rel = resolveWorkspacePath(path, false);
      const node = VFS_NODES.get(rel);
      if (!node) return null;
      if (node.type === "folder") {
        throw new Error(`EISDIR: illegal operation on a directory, read '${path}'`);
      }
      return node.content ?? "";
    },
    writeFile(path: string, content: string): boolean {
      ensureVfsInitialized();
      const rel = resolveWorkspacePath(path, false);
      const existing = VFS_NODES.get(rel);
      if (existing && existing.type === "folder") {
        throw new Error(`EISDIR: illegal operation on a directory, open '${path}'`);
      }
      ensureParentFoldersExist(rel);
      const parts = rel.split("/");
      const name = parts.pop() || rel;
      const parentPath = parts.join("/");
      VFS_NODES.set(rel, {
        path: rel,
        name,
        type: "file",
        parentPath,
        content: serializeFsData(content),
      });
      persistVfsToClientStorage();
      renderVfsTreeUI();
      return true;
    },
    appendFile(path: string, content: string): boolean {
      ensureVfsInitialized();
      const rel = resolveWorkspacePath(path, false);
      const existing = VFS_NODES.get(rel);
      if (existing && existing.type === "folder") {
        throw new Error(`EISDIR: illegal operation on a directory, open '${path}'`);
      }
      const prev = existing && existing.type === "file" ? (existing.content ?? "") : "";
      return api.writeFile(rel, prev + serializeFsData(content));
    },
    listFiles(dirPath = ""): string[] {
      ensureVfsInitialized();
      const rel = resolveWorkspacePath(dirPath, true);
      if (rel !== "") {
        const dirNode = VFS_NODES.get(rel);
        if (!dirNode) {
          throw new Error(`ENOENT: no such file or directory, scandir '${dirPath}'`);
        }
        if (dirNode.type !== "folder") {
          throw new Error(`ENOTDIR: not a directory, scandir '${dirPath}'`);
        }
      }
      const out: string[] = [];
      VFS_NODES.forEach((node) => {
        if (node.parentPath === rel) out.push(node.name);
      });
      return out;
    },
    readdir(dirPath = ""): string[] {
      return api.listFiles(dirPath);
    },
    listAll(): string[] {
      ensureVfsInitialized();
      return Array.from(VFS_NODES.keys()).sort();
    },
    exists(path: string): boolean {
      ensureVfsInitialized();
      const rel = resolveWorkspacePath(path, true);
      if (rel === "") return true;
      return VFS_NODES.has(rel);
    },
    deleteFile(path: string): boolean {
      ensureVfsInitialized();
      const rel = resolveWorkspacePath(path, false);
      const node = VFS_NODES.get(rel);
      if (!node) {
        throw new Error(`ENOENT: no such file or directory, unlink '${path}'`);
      }
      const prefix = rel + "/";
      Array.from(VFS_NODES.keys()).forEach((k) => {
        if (k === rel || k.startsWith(prefix)) {
          VFS_NODES.delete(k);
        }
      });
      persistVfsToClientStorage();
      renderVfsTreeUI();
      return true;
    },
    unlink(path: string): boolean {
      return api.deleteFile(path);
    },
    mkdir(path: string): boolean {
      ensureVfsInitialized();
      const rel = resolveWorkspacePath(path, true);
      if (!rel) return true;
      ensureParentFoldersExist(rel + "/_");
      persistVfsToClientStorage();
      renderVfsTreeUI();
      return true;
    },
    stat(path: string) {
      ensureVfsInitialized();
      const rel = resolveWorkspacePath(path, true);
      if (rel === "") {
        return {
          size: 0,
          isFile: () => false,
          isDirectory: () => true,
        };
      }
      const node = VFS_NODES.get(rel);
      if (!node) {
        throw new Error(`ENOENT: no such file or directory, stat '${path}'`);
      }
      const isDir = node.type === "folder";
      const size = isDir ? 0 : (node.content ?? "").length;
      return {
        size,
        isFile: () => !isDir,
        isDirectory: () => isDir,
      };
    },
    clear(): void {
      ensureVfsInitialized();
      VFS_NODES.clear();
      persistVfsToClientStorage();
      renderVfsTreeUI();
    },
  };
  return api;
}

/* Expose client-side VFS API on globalThis.__VFS__ and Node-compatible fs shim on globalThis.__FS_SHIM__ */
export function bindGlobalVfsApi() {
  const api = createVfsCoreApi();

  const fsPromises = {
    async readFile(path: string, _options?: unknown): Promise<string> {
      const content = api.readFile(path);
      if (content === null) {
        throw new Error(`ENOENT: no such file or directory, open '${path}'`);
      }
      return content;
    },
    async writeFile(path: string, data: unknown, _options?: unknown): Promise<void> {
      api.writeFile(path, serializeFsData(data));
    },
    async appendFile(path: string, data: unknown, _options?: unknown): Promise<void> {
      api.appendFile(path, serializeFsData(data));
    },
    async unlink(path: string): Promise<void> {
      api.deleteFile(path);
    },
    async rm(path: string, _options?: unknown): Promise<void> {
      api.deleteFile(path);
    },
    async readdir(path = "", _options?: unknown): Promise<string[]> {
      return api.listFiles(path);
    },
    async mkdir(path: string, _options?: unknown): Promise<string | undefined> {
      api.mkdir(path);
      return undefined;
    },
    async rmdir(path: string, _options?: unknown): Promise<void> {
      api.deleteFile(path);
    },
    async stat(path: string) {
      return api.stat(path);
    },
    async access(path: string, _mode?: number): Promise<void> {
      if (!api.exists(path)) {
        throw new Error(`ENOENT: no such file or directory, access '${path}'`);
      }
    },
    async exists(path: string): Promise<boolean> {
      return api.exists(path);
    },
    async copyFile(src: string, dest: string): Promise<void> {
      const content = api.readFile(src);
      if (content === null) {
        throw new Error(`ENOENT: no such file or directory, copyfile '${src}'`);
      }
      api.writeFile(dest, content);
    },
    async rename(oldPath: string, newPath: string): Promise<void> {
      const content = api.readFile(oldPath);
      if (content === null) {
        throw new Error(`ENOENT: no such file or directory, rename '${oldPath}'`);
      }
      api.writeFile(newPath, content);
      api.deleteFile(oldPath);
    },
  };

  const fsShim = {
    promises: fsPromises,
    readFileSync(path: string, _options?: unknown): string {
      const content = api.readFile(path);
      if (content === null) {
        throw new Error(`ENOENT: no such file or directory, open '${path}'`);
      }
      return content;
    },
    writeFileSync(path: string, data: unknown, _options?: unknown): void {
      api.writeFile(path, serializeFsData(data));
    },
    appendFileSync(path: string, data: unknown, _options?: unknown): void {
      api.appendFile(path, serializeFsData(data));
    },
    existsSync(path: string): boolean {
      return api.exists(path);
    },
    unlinkSync(path: string): void {
      api.deleteFile(path);
    },
    rmSync(path: string, _options?: unknown): void {
      api.deleteFile(path);
    },
    readdirSync(path = ""): string[] {
      return api.listFiles(path);
    },
    mkdirSync(path: string, _options?: unknown): string | undefined {
      api.mkdir(path);
      return undefined;
    },
    rmdirSync(path: string, _options?: unknown): void {
      api.deleteFile(path);
    },
    statSync(path: string) {
      return api.stat(path);
    },
    copyFileSync(src: string, dest: string): void {
      const content = api.readFile(src);
      if (content === null) {
        throw new Error(`ENOENT: no such file or directory, copyfile '${src}'`);
      }
      api.writeFile(dest, content);
    },
    renameSync(oldPath: string, newPath: string): void {
      const content = api.readFile(oldPath);
      if (content === null) {
        throw new Error(`ENOENT: no such file or directory, rename '${oldPath}'`);
      }
      api.writeFile(newPath, content);
      api.deleteFile(oldPath);
    },
  };

  globalThis.__VFS__ = api;
  globalThis.vfs = api;
  globalThis.__FS_SHIM__ = fsShim;
}

export function initVfsSidebarEvents() {
  const fileInput = $<HTMLInputElement>("fileInput");
  const vfsSidebar = $("vfsSidebar");
  const b1 = $("btnToggleVfs");
  const b2 = $("nbBtnToggleVfs");
  if (vfsSidebar) {
    vfsSidebar.hidden = true;
  }
  if (b1 && b1.classList) b1.classList.remove("active");
  if (b2 && b2.classList) b2.classList.remove("active");

  const toggleVfsSidebar = () => {
    if (!vfsSidebar) return;
    vfsSidebar.hidden = !vfsSidebar.hidden;
    const isVisible = !vfsSidebar.hidden;
    if (b1 && b1.classList) b1.classList.toggle("active", isVisible);
    if (b2 && b2.classList) b2.classList.toggle("active", isVisible);
  };
  if (b1) b1.onclick = toggleVfsSidebar;
  if (b2) b2.onclick = toggleVfsSidebar;

  const btnNewFile = $("vfsBtnNewFile");
  if (btnNewFile) {
    btnNewFile.onclick = () => {
      ensureVfsInitialized();
      const ext = LANG === "python" ? ".py" : ".ts";
      let idx = 1;
      while (VFS_NODES.has(`file_${idx}${ext}`)) idx++;
      const name = `file_${idx}${ext}`;
      const path = name;
      const content = LANG === "python" ? `# ${name}\n` : `// ${name}\n`;
      VFS_NODES.set(path, {
        path,
        name,
        type: "file",
        parentPath: "",
        content,
      });
      persistVfsToClientStorage();
      openVfsFile(path);
    };
  }

  const btnNewFolder = $("vfsBtnNewFolder");
  if (btnNewFolder) {
    btnNewFolder.onclick = () => {
      ensureVfsInitialized();
      let idx = 1;
      while (VFS_NODES.has(`folder_${idx}`)) idx++;
      const name = `folder_${idx}`;
      const path = name;
      VFS_NODES.set(path, {
        path,
        name,
        type: "folder",
        parentPath: "",
      });
      VFS_EXPANDED_FOLDERS.add(path);
      persistVfsToClientStorage();
      renderVfsTreeUI();
      say(`📁 已创建文件夹 ${path}/（双击可重命名）`, "ok");
    };
  }

  const btnUpload = $("vfsBtnUpload");
  if (btnUpload && fileInput) {
    btnUpload.onclick = () => fileInput.click();
  }

  const vfsTreeList = $("vfsTreeList");
  if (!vfsTreeList || !vfsTreeList.addEventListener) return;

  vfsTreeList.addEventListener("click", (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    const confirmDelBtn = target.closest ? (target.closest("[data-vfs-confirm-del]") as HTMLElement | null) : null;
    if (confirmDelBtn) {
      e.stopPropagation();
      const delPath = confirmDelBtn.getAttribute("data-vfs-confirm-del");
      pendingVfsDeletePath = null;
      if (delPath && VFS_NODES.has(delPath)) {
        const prefix = delPath + "/";
        Array.from(VFS_NODES.keys()).forEach((k) => {
          if (k === delPath || k.startsWith(prefix)) {
            VFS_NODES.delete(k);
          }
        });
        persistVfsToClientStorage();
        uiHooks.onVfsFileDeleted(delPath);
        renderVfsTreeUI();
        say(`🗑 已从文件目录移除 ${delPath}`, "dim");
      } else {
        renderVfsTreeUI();
      }
      return;
    }

    const cancelDelBtn = target.closest ? (target.closest("[data-vfs-cancel-del]") as HTMLElement | null) : null;
    if (cancelDelBtn) {
      e.stopPropagation();
      pendingVfsDeletePath = null;
      renderVfsTreeUI();
      return;
    }

    const delBtn = target.closest ? (target.closest("[data-vfs-del]") as HTMLElement | null) : null;
    if (delBtn) {
      e.stopPropagation();
      const delPath = delBtn.getAttribute("data-vfs-del");
      if (delPath && VFS_NODES.has(delPath)) {
        pendingVfsDeletePath = pendingVfsDeletePath === delPath ? null : delPath;
        renderVfsTreeUI();
      }
      return;
    }

    const folderRow = target.closest ? (target.closest("[data-vfs-folder]") as HTMLElement | null) : null;
    if (folderRow) {
      const folderPath = folderRow.getAttribute("data-vfs-folder");
      if (folderPath) {
        if (VFS_EXPANDED_FOLDERS.has(folderPath)) VFS_EXPANDED_FOLDERS.delete(folderPath);
        else VFS_EXPANDED_FOLDERS.add(folderPath);
        renderVfsTreeUI();
      }
      return;
    }

    const fileRow = target.closest ? (target.closest("[data-vfs-file]") as HTMLElement | null) : null;
    if (fileRow) {
      const filePath = fileRow.getAttribute("data-vfs-file");
      if (filePath) {
        const curActivePath = uiHooks.getActiveWorkspacePath();
        if (filePath !== curActivePath || editor.value !== (VFS_NODES.get(filePath)?.content ?? "")) {
          openVfsFile(filePath);
        }
      }
    }
  });

  vfsTreeList.addEventListener("dblclick", (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    const row = target && target.closest ? (target.closest("[data-vfs-file], [data-vfs-folder]") as HTMLElement | null) : null;
    if (!row) return;
    const oldPath = row.getAttribute("data-vfs-file") || row.getAttribute("data-vfs-folder");
    if (!oldPath) return;
    const node = VFS_NODES.get(oldPath);
    if (!node || node.readonly) return;
    const nameSpan = row.querySelector ? row.querySelector(".vfs-name") : null;
    if (!nameSpan) return;

    const input = document.createElement("input");
    input.type = "text";
    input.className = "vfs-rename-input";
    input.value = node.name;
    nameSpan.replaceWith(input);
    input.focus();
    input.select();

    let committed = false;
    const commit = () => {
      if (committed) return;
      committed = true;
      const nextName = input.value.trim().replace(/[\\/:*?"<>|]/g, "");
      if (nextName && nextName !== node.name) {
        const nextPath = node.parentPath ? `${node.parentPath}/${nextName}` : nextName;
        VFS_NODES.delete(oldPath);
        node.name = nextName;
        node.path = nextPath;
        VFS_NODES.set(nextPath, node);
        persistVfsToClientStorage();
        uiHooks.onVfsFileRenamed(oldPath, nextPath, nextName);
        say(`✓ 已重命名为 ${nextPath}`, "ok");
      }
      renderVfsTreeUI();
    };

    input.addEventListener("blur", commit);
    input.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        input.blur();
      } else if (ev.key === "Escape") {
        committed = true;
        renderVfsTreeUI();
      }
    });
  });
}
