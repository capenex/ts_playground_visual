/* ================================================================
   Single-File Mode Multi-Tab Bar View & Sample Import Menu (src/ui/script-tabs.ts)
   ================================================================ */
import { normalizeWorkspaceModulePath } from "../compiler/type-checker";
import { say, resetTraceState } from "../runtime/event-loop";
import { startDebug } from "../runtime/runner";
import {
  ensureScriptTabsForLang,
  getActiveScriptTab,
  handleVfsFileDeletedInTabs,
  handleVfsFileRenamedInTabs,
  isScriptTabSyncing,
  nextScriptTabId,
  ScriptTabDoc,
  setScriptTabSyncing,
  syncActiveScriptTabSource,
  TS_SAMPLE_METADATA,
  upsertSampleScriptTab,
  upsertVfsScriptTab,
} from "../runtime/script-tabs-store";
import {
  ensureVfsInitialized,
  persistVfsToClientStorage,
  VFS_NODES,
} from "../runtime/vfs-store";
import { SAMPLES } from "../samples/ts-samples";
import { appState, esc, registerUiHooks, uiHooks } from "../state";
import { updateEditorChrome } from "../viz/highlight";
import { setFileName } from "./controls";
import {
  $,
  closestElement,
  editor,
  eventTargetElement,
  eventTargetNode,
} from "./dom";
import { loadSample } from "./share";
import { renderVfsTreeUI } from "./vfs";

export * from "../runtime/script-tabs-store";

export function openSampleScriptTab(title: string, source: string, lang?: "ts") {
  if (editor && editor.value) {
    syncActiveScriptTabSource(editor.value);
  }
  upsertSampleScriptTab(title, source, lang);
  setScriptTabSyncing(true);
  if (editor) editor.value = source;
  setFileName(title);
  setScriptTabSyncing(false);
  renderScriptTabsUI();
  renderVfsTreeUI();
}

export function syncActiveScriptTabFromFileName(newFileName: string) {
  if (isScriptTabSyncing()) return;
  const store = ensureScriptTabsForLang("ts");
  const activeTab = store.tabs.find((t) => t.id === store.activeTabId);
  if (!activeTab) return;

  const oldPath = activeTab.vfsPath;
  activeTab.title = newFileName;
  activeTab.source = editor ? editor.value : activeTab.source;

  if (!activeTab.isSample && oldPath && VFS_NODES.has(oldPath)) {
    activeTab.vfsPath = newFileName;
    VFS_NODES.delete(oldPath);
    VFS_NODES.set(activeTab.vfsPath, {
      path: activeTab.vfsPath,
      name: newFileName,
      type: "file",
      parentPath: "",
      content: activeTab.source,
    });
    persistVfsToClientStorage();
  }
  renderScriptTabsUI();
  renderVfsTreeUI();
}

export function renderScriptTabsUI() {
  if (typeof document !== "undefined" && typeof document.dispatchEvent === "function") {
    try {
      document.dispatchEvent(new Event("ts-session-change"));
    } catch (_) {}
  }
  const tabsEl = $("scriptTabsList");
  if (!tabsEl) return;
  const store = ensureScriptTabsForLang("ts");
  const activeTab = getActiveScriptTab("ts");
  const isMultiDebug = Boolean(
    appState.DEBUG_SESSION.active &&
      appState.TRACE.moduleSources &&
      Object.keys(appState.TRACE.moduleSources).length > 1
  );

  tabsEl.innerHTML =
    store.tabs
      .map((t) => {
        const isAct = t.id === activeTab.id;
        const normPath = normalizeWorkspaceModulePath(t.vfsPath || t.title);
        const isDebugEntry = isMultiDebug && appState.DEBUG_SESSION.entryFile === normPath;
        const badge = isDebugEntry ? ` <span class="dim" title="当前多文件调试入口模块">▶</span>` : "";
        return (
          `<div class="nb-tab${isAct ? " active" : ""}" role="tab" tabindex="0" aria-selected="${isAct ? "true" : "false"}" data-script-tab-id="${esc(t.id)}" title="单击或按 Enter/Space 切换标签页 · 双击文件名重命名">` +
          `<span class="nb-tab-icon ts-icon" aria-hidden="true"></span>` +
          `<span class="nb-tab-title">${esc(t.title)}${badge}</span>` +
          (store.tabs.length > 1
            ? `<button type="button" class="nb-tab-close" data-close-script-tab="${esc(t.id)}" title="关闭标签页">×</button>`
            : "") +
          `</div>`
        );
      })
      .join("") +
    `<button type="button" class="nb-tab-add" id="scriptBtnNewTab" title="新建代码文件标签页">＋</button>`;
}

export function renderImportSampleMenu() {
  const listEl = $("importSampleList");
  if (!listEl) return;

  const nbItemHtml =
    `<button type="button" class="import-sample-item" data-import-sample-notebook="Intro.ipynb">` +
    `<span class="import-sample-name">📓 Intro.ipynb · 交互式笔记本示例</span>` +
    `<span class="import-sample-path">examples/notebooks/</span>` +
    `</button>`;

  const multiFileItemHtml =
    `<button type="button" class="import-sample-item" data-import-sample-multifile="bst-project" title="加载包含 bst.ts 与 main.ts 的多模块 TypeScript 工程示例，支持跨文件步进与类型检查">` +
    `<span class="import-sample-name">📦 多文件模块化工程 · 二叉搜索树 (bst.ts + main.ts)</span>` +
    `<span class="import-sample-path">workspace/bst.ts + main.ts</span>` +
    `</button>`;

  listEl.innerHTML =
    (appState.VIEW_MODE === "notebook" ? nbItemHtml : multiFileItemHtml) +
    TS_SAMPLE_METADATA
      .map(
        (item) =>
          `<button type="button" class="import-sample-item" data-import-sample-key="${esc(item.key)}" title="${esc(item.desc)}">` +
          `<span class="import-sample-name">${esc(item.label)}</span>` +
          `<span class="import-sample-path">${esc("examples/ts/" + item.key + ".ts")}</span>` +
          `</button>`
      )
      .join("") +
    (appState.VIEW_MODE !== "notebook" ? nbItemHtml : "");
}

export function loadMultiFileSampleProject(): void {
  ensureVfsInitialized();
  const bstSource = [
    "// 二叉搜索树节点模块 (bst.ts)",
    "export interface BstNode {",
    "  val: number;",
    "  left: BstNode | null;",
    "  right: BstNode | null;",
    "}",
    "",
    "export function createNode(val: number): BstNode {",
    "  return { val, left: null, right: null };",
    "}",
    "",
    "export function insertBst(root: BstNode | null, val: number): BstNode {",
    "  if (root === null) {",
    "    return createNode(val);",
    "  }",
    "  if (val < root.val) {",
    "    root.left = insertBst(root.left, val);",
    "  } else if (val > root.val) {",
    "    root.right = insertBst(root.right, val);",
    "  }",
    "  return root;",
    "}",
  ].join("\n");

  const mainSource = [
    "// 多文件入口模块 (main.ts) —— 导入 ./bst 并跨模块步进调试",
    "import { BstNode, insertBst } from './bst';",
    "",
    "function buildSearchTree(nums: number[]): number {",
    "  let tree: BstNode | null = null;",
    "  for (let i = 0; i < nums.length; i++) {",
    "    const x = nums[i];",
    "    tree = insertBst(tree, x);",
    '    checkpoint(x < 8, "插入左子树节点");',
    "  }",
    "  if (tree !== null) {",
    "    return tree.val;",
    "  }",
    "  return -1;",
    "}",
    "",
    "// 调用：buildSearchTree([8, 4, 12, 2, 6])",
  ].join("\n");

  VFS_NODES.set("bst.ts", {
    path: "bst.ts",
    name: "bst.ts",
    type: "file",
    parentPath: "",
    content: bstSource,
  });
  VFS_NODES.set("main.ts", {
    path: "main.ts",
    name: "main.ts",
    type: "file",
    parentPath: "",
    content: mainSource,
  });
  persistVfsToClientStorage();

  upsertVfsScriptTab("bst.ts", "bst.ts", bstSource, "ts");
  const mainTab = upsertVfsScriptTab("main.ts", "main.ts", mainSource, "ts");
  setScriptTabSyncing(true);
  if (editor) editor.value = mainTab.source;
  setFileName("main.ts");
  setScriptTabSyncing(false);
  renderScriptTabsUI();
  renderVfsTreeUI();
  uiHooks.setViewMode("script");
  resetTraceState();
  startDebug(0);
}

export function initScriptTabsAndImportEvents() {
  const importMenuWrap = $("importMenuWrap");
  const btnImport = $<HTMLButtonElement>("btnImport");
  const btnUploadLocalFile = $<HTMLButtonElement>("btnUploadLocalFile");
  const btnOpenTsTutorials = $<HTMLButtonElement>("btnOpenTsTutorials");
  const importSampleList = $("importSampleList");
  const fileInput = $<HTMLInputElement>("fileInput");

  if (btnImport && importMenuWrap) {
    btnImport.onclick = (e: MouseEvent) => {
      if (e && typeof e.stopPropagation === "function") e.stopPropagation();
      renderImportSampleMenu();
      if (importMenuWrap.classList) {
        importMenuWrap.classList.toggle("open");
      }
    };
    addEventListener("click", (e: MouseEvent) => {
      if (!importMenuWrap.classList || !importMenuWrap.classList.contains("open")) return;
      if (importMenuWrap.contains && importMenuWrap.contains(eventTargetNode(e))) return;
      importMenuWrap.classList.remove("open");
    });
  }

  if (btnUploadLocalFile && fileInput) {
    btnUploadLocalFile.onclick = (e: MouseEvent) => {
      if (e && typeof e.stopPropagation === "function") e.stopPropagation();
      if (importMenuWrap && importMenuWrap.classList) importMenuWrap.classList.remove("open");
      fileInput.click();
    };
  }

  if (btnOpenTsTutorials) {
    btnOpenTsTutorials.onclick = (e: MouseEvent) => {
      if (e && typeof e.stopPropagation === "function") e.stopPropagation();
      if (importMenuWrap && importMenuWrap.classList) importMenuWrap.classList.remove("open");
      uiHooks.openTutorialModal();
    };
  }

  if (importSampleList && importSampleList.addEventListener) {
    importSampleList.addEventListener("click", (e: MouseEvent) => {
      const btn = closestElement(e, ".import-sample-item");
      if (!btn) return;
      if (importMenuWrap && importMenuWrap.classList) importMenuWrap.classList.remove("open");
      const multiFile = btn.getAttribute("data-import-sample-multifile");
      if (multiFile) {
        loadMultiFileSampleProject();
        return;
      }
      const nbFile = btn.getAttribute("data-import-sample-notebook");
      if (nbFile) {
        uiHooks.setViewMode("notebook");
        say(`✓ 已加载内置示例笔记本 ${nbFile}`, "ok");
        return;
      }
      const sampleKey = btn.getAttribute("data-import-sample-key");
      if (sampleKey) {
        if (appState.VIEW_MODE === "notebook") {
          const code = SAMPLES[sampleKey] || "";
          if (code) {
            uiHooks.importSampleIntoNotebook(code, sampleKey);
          }
          return;
        }
        loadSample(sampleKey);
      }
    });
  }

  const scriptTabsEl = $("scriptTabsList");
  if (scriptTabsEl && scriptTabsEl.addEventListener) {
    scriptTabsEl.addEventListener("click", (e: MouseEvent) => {
      const target = eventTargetElement(e);
      if (!target) return;
      const store = ensureScriptTabsForLang("ts");

      const closeBtn = closestElement(target, "[data-close-script-tab]");
      if (closeBtn) {
        e.stopPropagation();
        const closeId = closeBtn.getAttribute("data-close-script-tab");
        if (store.tabs.length <= 1) return;
        const idx = store.tabs.findIndex((t) => t.id === closeId);
        if (idx >= 0) {
          store.tabs.splice(idx, 1);
          if (store.activeTabId === closeId) {
            const fallbackTab = store.tabs[Math.max(0, idx - 1)];
            if (fallbackTab) store.activeTabId = fallbackTab.id;
            const nextTab = getActiveScriptTab("ts");
            setScriptTabSyncing(true);
            editor.value = nextTab.source;
            setFileName(nextTab.title);
            setScriptTabSyncing(false);
            resetTraceState();
            updateEditorChrome();
          }
          renderScriptTabsUI();
          renderVfsTreeUI();
        }
        return;
      }

      const newBtn = closestElement(target, "#scriptBtnNewTab");
      if (newBtn) {
        syncActiveScriptTabSource(editor ? editor.value : "");
        const newTitle = `untitled-${store.tabs.length + 1}.ts`;
        const newTab: ScriptTabDoc = {
          id: nextScriptTabId(),
          title: newTitle,
          lang: "ts",
          source: "// 新建 TypeScript 脚本\n",
          vfsPath: "",
          isSample: false,
        };
        store.tabs.push(newTab);
        store.activeTabId = newTab.id;
        setScriptTabSyncing(true);
        editor.value = newTab.source;
        setFileName(newTab.title);
        setScriptTabSyncing(false);
        resetTraceState();
        updateEditorChrome();
        renderScriptTabsUI();
        renderVfsTreeUI();
        if (editor && typeof editor.focus === "function") editor.focus();
        return;
      }

      const tabEl = closestElement(target, "[data-script-tab-id]");
      if (tabEl) {
        const tabId = tabEl.getAttribute("data-script-tab-id");
        if (tabId && store.activeTabId !== tabId) {
          syncActiveScriptTabSource(editor ? editor.value : "");
          store.activeTabId = tabId;
          const nextTab = getActiveScriptTab("ts");
          const normNext = normalizeWorkspaceModulePath(nextTab.vfsPath || nextTab.title);
          const inActiveMultiSession = Boolean(
            appState.DEBUG_SESSION.active &&
              appState.TRACE.moduleSources &&
              Object.keys(appState.TRACE.moduleSources).length > 1 &&
              appState.TRACE.moduleSources[normNext]
          );
          setScriptTabSyncing(true);
          editor.value = nextTab.source;
          setFileName(nextTab.vfsPath || nextTab.title);
          setScriptTabSyncing(false);
          if (inActiveMultiSession) {
            appState.ACTIVE_DEBUG_FILE = normNext;
          } else {
            resetTraceState();
          }
          updateEditorChrome();
          renderScriptTabsUI();
          renderVfsTreeUI();
        }
      }
    });

    scriptTabsEl.addEventListener("keydown", (e: KeyboardEvent) => {
      const target = eventTargetElement(e);
      if (!target || (target.classList && (target.classList.contains("nb-tab-close") || target.classList.contains("nb-tab-rename-input")))) return;
      const tabEl = closestElement(target, "[data-script-tab-id]");
      if (!tabEl) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        tabEl.click();
        return;
      }
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        const allTabs = scriptTabsEl.querySelectorAll ? Array.from(scriptTabsEl.querySelectorAll<HTMLElement>("[data-script-tab-id]")) : [];
        const curIdx = allTabs.indexOf(tabEl);
        if (curIdx >= 0 && allTabs.length > 1) {
          const nextIdx = (curIdx + (e.key === "ArrowRight" ? 1 : allTabs.length - 1)) % allTabs.length;
          const nextEl = allTabs[nextIdx];
          if (nextEl) {
            nextEl.click();
            const refreshed = scriptTabsEl.querySelectorAll ? scriptTabsEl.querySelectorAll<HTMLElement>("[data-script-tab-id]")[nextIdx] : null;
            if (refreshed && typeof refreshed.focus === "function") refreshed.focus();
          }
        }
      }
    });

    scriptTabsEl.addEventListener("dblclick", (e: MouseEvent) => {
      const tabEl = closestElement(e, "[data-script-tab-id]");
      if (!tabEl) return;
      const tabId = tabEl.getAttribute("data-script-tab-id");
      const store = ensureScriptTabsForLang("ts");
      const targetTab = store.tabs.find((t) => t.id === tabId);
      if (!targetTab) return;
      const titleSpan = tabEl.querySelector ? tabEl.querySelector(".nb-tab-title") : null;
      if (!titleSpan) return;

      const input = document.createElement("input");
      input.type = "text";
      input.className = "nb-tab-rename-input";
      input.value = targetTab.title;
      titleSpan.replaceWith(input);
      input.focus();
      input.select();

      let committed = false;
      const commit = () => {
        if (committed) return;
        committed = true;
        const rawVal = input.value.trim();
        if (rawVal) {
          const nextName = /\.[A-Za-z0-9]{1,12}$/.test(rawVal) ? rawVal : rawVal + ".ts";
          const oldPath = targetTab.vfsPath;
          targetTab.title = nextName;
          if (!targetTab.isSample && oldPath && VFS_NODES.has(oldPath)) {
            targetTab.vfsPath = nextName;
            VFS_NODES.delete(oldPath);
            VFS_NODES.set(targetTab.vfsPath, {
              path: targetTab.vfsPath,
              name: nextName,
              type: "file",
              parentPath: "",
              content: targetTab.source,
            });
            persistVfsToClientStorage();
          }
          if (store.activeTabId === targetTab.id) {
            setScriptTabSyncing(true);
            setFileName(nextName);
            setScriptTabSyncing(false);
          }
          say(`✓ 文件已重命名为 ${nextName}`, "ok");
        }
        renderScriptTabsUI();
        renderVfsTreeUI();
      };
      input.addEventListener("blur", commit);
      input.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") {
          ev.preventDefault();
          input.blur();
        } else if (ev.key === "Escape") {
          committed = true;
          renderScriptTabsUI();
        }
      });
    });
  }

  if (editor && editor.addEventListener) {
    editor.addEventListener("input", () => {
      syncActiveScriptTabSource(editor.value);
    });
  }
}

export function openVfsScriptFile(path: string, name: string, content: string): void {
  if (editor && editor.value) {
    syncActiveScriptTabSource(editor.value);
  }
  const tab = upsertVfsScriptTab(path, name, content, "ts");
  setScriptTabSyncing(true);
  editor.value = tab.source;
  setFileName(tab.vfsPath || tab.title);
  setScriptTabSyncing(false);
  resetTraceState();
  updateEditorChrome();
  renderScriptTabsUI();
}

export function switchToScriptFile(targetPath: string): void {
  const normPath = normalizeWorkspaceModulePath(targetPath);
  if (!normPath) return;
  const store = ensureScriptTabsForLang("ts");
  const currentActive = getActiveScriptTab("ts");
  const currentNorm = normalizeWorkspaceModulePath(currentActive.vfsPath || currentActive.title);
  if (currentNorm === normPath && normalizeWorkspaceModulePath(appState.FILE_NAME) === normPath) {
    return;
  }

  if (editor && editor.value) {
    syncActiveScriptTabSource(editor.value);
  }

  let targetTab = store.tabs.find(
    (t) => normalizeWorkspaceModulePath(t.vfsPath || t.title) === normPath
  );
  if (!targetTab) {
    ensureVfsInitialized();
    const vfsNode = VFS_NODES.get(normPath);
    if (vfsNode && vfsNode.type === "file") {
      targetTab = upsertVfsScriptTab(normPath, vfsNode.name, vfsNode.content ?? "", "ts");
    }
  }
  if (!targetTab) return;

  store.activeTabId = targetTab.id;
  appState.ACTIVE_DEBUG_FILE = normPath;
  setScriptTabSyncing(true);
  if (editor) editor.value = targetTab.source;
  setFileName(targetTab.vfsPath || targetTab.title);
  setScriptTabSyncing(false);
  renderScriptTabsUI();
  renderVfsTreeUI();
}

export function collectWorkspaceFileMap(): Map<string, string> {
  const map = new Map<string, string>();
  ensureVfsInitialized();
  VFS_NODES.forEach((node, path) => {
    if (node.type === "file" && typeof node.content === "string") {
      const norm = normalizeWorkspaceModulePath(path);
      if (norm) map.set(norm, node.content.replace(/\r/g, ""));
    }
  });
  const store = ensureScriptTabsForLang("ts");
  store.tabs.forEach((tab) => {
    const key = normalizeWorkspaceModulePath(tab.vfsPath || tab.title);
    if (key) {
      map.set(key, (tab.source || "").replace(/\r/g, ""));
    }
  });
  return map;
}

export function onVfsFileDeleted(delPath: string): void {
  handleVfsFileDeletedInTabs(delPath);
  renderScriptTabsUI();
}

export function onVfsFileRenamed(oldPath: string, nextPath: string, nextName: string): void {
  const res = handleVfsFileRenamedInTabs(oldPath, nextPath, nextName);
  if (res.updated) {
    if (res.isActive) {
      setScriptTabSyncing(true);
      setFileName(nextName);
      setScriptTabSyncing(false);
    }
    renderScriptTabsUI();
  }
}

registerUiHooks({
  getActiveWorkspacePath: () => getActiveScriptTab().vfsPath,
  collectWorkspaceFileMap,
  openVfsScriptFile,
  switchToScriptFile,
  onVfsFileDeleted,
  onVfsFileRenamed,
});


