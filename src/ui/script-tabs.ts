/* ================================================================
   Single-File Mode Multi-Tab Bar View & Sample Import Menu (src/ui/script-tabs.ts)
   ================================================================ */
import { say, resetTraceState } from "../runtime/event-loop";
import {
  ensureScriptTabsForLang,
  getActiveScriptTab,
  getPySamplesDict,
  handleVfsFileDeletedInTabs,
  handleVfsFileRenamedInTabs,
  isScriptTabSyncing,
  nextScriptTabId,
  PY_SAMPLE_METADATA,
  ScriptTabDoc,
  setScriptTabSyncing,
  syncActiveScriptTabSource,
  TS_SAMPLE_METADATA,
  upsertSampleScriptTab,
  upsertVfsScriptTab,
} from "../runtime/script-tabs-store";
import {
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

export function openSampleScriptTab(title: string, source: string, lang?: "ts" | "python") {
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
  const lang = appState.LANG === "python" ? "python" : "ts";
  const store = ensureScriptTabsForLang(lang);
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
  const tabsEl = $("scriptTabsList");
  if (!tabsEl) return;
  const lang = appState.LANG === "python" ? "python" : "ts";
  const store = ensureScriptTabsForLang(lang);
  const activeTab = getActiveScriptTab(lang);

  tabsEl.innerHTML =
    store.tabs
      .map((t) => {
        const isAct = t.id === activeTab.id;
        const iconCls = lang === "python" ? "py-icon" : "ts-icon";
        return (
          `<div class="nb-tab${isAct ? " active" : ""}" data-script-tab-id="${esc(t.id)}" title="单击切换标签页 · 双击文件名重命名">` +
          `<span class="nb-tab-icon ${iconCls}" aria-hidden="true"></span>` +
          `<span class="nb-tab-title">${esc(t.title)}</span>` +
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
  const isPy = appState.LANG === "python";
  const items = isPy ? PY_SAMPLE_METADATA : TS_SAMPLE_METADATA;
  const folderPrefix = isPy ? "examples/python/" : "examples/ts/";

  const nbItemHtml =
    `<button type="button" class="import-sample-item" data-import-sample-notebook="Intro.ipynb">` +
    `<span class="import-sample-name">📓 Intro.ipynb · 交互式笔记本示例</span>` +
    `<span class="import-sample-path">examples/notebooks/</span>` +
    `</button>`;

  listEl.innerHTML =
    (appState.VIEW_MODE === "notebook" ? nbItemHtml : "") +
    items
      .map(
        (item) =>
          `<button type="button" class="import-sample-item" data-import-sample-key="${esc(item.key)}" title="${esc(item.desc)}">` +
          `<span class="import-sample-name">${esc(item.label)}</span>` +
          `<span class="import-sample-path">${esc(folderPrefix + item.key + (isPy ? ".py" : ".ts"))}</span>` +
          `</button>`
      )
      .join("") +
    (appState.VIEW_MODE !== "notebook" ? nbItemHtml : "");
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
      const nbFile = btn.getAttribute("data-import-sample-notebook");
      if (nbFile) {
        uiHooks.setViewMode("notebook");
        say(`✓ 已加载内置示例笔记本 ${nbFile}`, "ok");
        return;
      }
      const sampleKey = btn.getAttribute("data-import-sample-key");
      if (sampleKey) {
        if (appState.VIEW_MODE === "notebook") {
          const code = appState.LANG === "python" ? (getPySamplesDict()[sampleKey] || "") : (SAMPLES[sampleKey] || "");
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
      const lang = appState.LANG === "python" ? "python" : "ts";
      const store = ensureScriptTabsForLang(lang);

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
            const nextTab = getActiveScriptTab(lang);
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
        const ext = lang === "python" ? ".py" : ".ts";
        const newTitle = `untitled-${store.tabs.length + 1}${ext}`;
        const newTab: ScriptTabDoc = {
          id: nextScriptTabId(),
          title: newTitle,
          lang,
          source: lang === "python" ? "# 新建 Python 脚本\n" : "// 新建 TypeScript 脚本\n",
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
          const nextTab = getActiveScriptTab(lang);
          setScriptTabSyncing(true);
          editor.value = nextTab.source;
          setFileName(nextTab.title);
          setScriptTabSyncing(false);
          resetTraceState();
          updateEditorChrome();
          renderScriptTabsUI();
          renderVfsTreeUI();
        }
      }
    });

    scriptTabsEl.addEventListener("dblclick", (e: MouseEvent) => {
      const tabEl = closestElement(e, "[data-script-tab-id]");
      if (!tabEl) return;
      const tabId = tabEl.getAttribute("data-script-tab-id");
      const lang = appState.LANG === "python" ? "python" : "ts";
      const store = ensureScriptTabsForLang(lang);
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
          const ext = lang === "python" ? ".py" : ".ts";
          const nextName = /\.[A-Za-z0-9]{1,12}$/.test(rawVal) ? rawVal : rawVal + ext;
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
  const lang = appState.LANG === "python" ? "python" : "ts";
  if (editor && editor.value) {
    syncActiveScriptTabSource(editor.value);
  }
  const tab = upsertVfsScriptTab(path, name, content, lang);
  setScriptTabSyncing(true);
  editor.value = tab.source;
  setFileName(tab.title);
  setScriptTabSyncing(false);
  resetTraceState();
  updateEditorChrome();
  renderScriptTabsUI();
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
  openVfsScriptFile,
  onVfsFileDeleted,
  onVfsFileRenamed,
});
