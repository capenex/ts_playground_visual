/* ================================================================
   Client-Side Virtual File System Sidebar View & DOM Events (src/ui/vfs.ts)
   ================================================================ */
import { say } from "../runtime/event-loop";
import {
  ensureVfsInitialized,
  persistVfsToClientStorage,
  resolveWorkspacePath,
  subscribeVfsStore,
  VFS_EXPANDED_FOLDERS,
  VFS_NODES,
  VfsNode,
} from "../runtime/vfs-store";
import { appState, esc, uiHooks } from "../state";
import { $, closestElement, editor, eventTargetElement } from "./dom";

export * from "../runtime/vfs-store";

let pendingVfsDeletePath: string | null = null;

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

subscribeVfsStore(() => {
  renderVfsTreeUI();
});

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
  if (isPyFile && appState.LANG !== "python" && typeof PY_ENGINE !== "undefined" && PY_ENGINE.setLang) {
    PY_ENGINE.setLang("python");
  } else if (node.name.endsWith(".ts") && appState.LANG === "python" && typeof PY_ENGINE !== "undefined" && PY_ENGINE.setLang) {
    PY_ENGINE.setLang("ts");
  }

  uiHooks.setViewMode("script");
  uiHooks.openVfsScriptFile(node.path, node.name, node.content || "");
  renderVfsTreeUI();
  say(`📂 已打开 ${node.path}`, "ok");
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
      const ext = appState.LANG === "python" ? ".py" : ".ts";
      let idx = 1;
      while (VFS_NODES.has(`file_${idx}${ext}`)) idx++;
      const name = `file_${idx}${ext}`;
      const path = name;
      const content = appState.LANG === "python" ? `# ${name}\n` : `// ${name}\n`;
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
    const target = eventTargetElement(e);
    if (!target) return;

    const confirmDelBtn = closestElement(target, "[data-vfs-confirm-del]");
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

    const cancelDelBtn = closestElement(target, "[data-vfs-cancel-del]");
    if (cancelDelBtn) {
      e.stopPropagation();
      pendingVfsDeletePath = null;
      renderVfsTreeUI();
      return;
    }

    const delBtn = closestElement(target, "[data-vfs-del]");
    if (delBtn) {
      e.stopPropagation();
      const delPath = delBtn.getAttribute("data-vfs-del");
      if (delPath && VFS_NODES.has(delPath)) {
        pendingVfsDeletePath = pendingVfsDeletePath === delPath ? null : delPath;
        renderVfsTreeUI();
      }
      return;
    }

    const folderRow = closestElement(target, "[data-vfs-folder]");
    if (folderRow) {
      const folderPath = folderRow.getAttribute("data-vfs-folder");
      if (folderPath) {
        if (VFS_EXPANDED_FOLDERS.has(folderPath)) VFS_EXPANDED_FOLDERS.delete(folderPath);
        else VFS_EXPANDED_FOLDERS.add(folderPath);
        renderVfsTreeUI();
      }
      return;
    }

    const fileRow = closestElement(target, "[data-vfs-file]");
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
    const row = closestElement(e, "[data-vfs-file], [data-vfs-folder]");
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
