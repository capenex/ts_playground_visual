/* ================================================================
   Single-File Mode Multi-Tab Bar & Sample Import Menu (src/ui/script-tabs.ts)
   ================================================================ */
import type { NotebookCell } from "../types";
import { say, resetTraceState } from "../runtime/event-loop";
import { updateEditorChrome } from "../viz/highlight";
import { setFileName } from "./controls";
import { SAMPLES } from "../samples/ts-samples";
import { loadSample } from "./share";
import {
  ensureVfsInitialized,
  persistVfsToClientStorage,
  renderVfsTreeUI,
  VFS_NODES,
} from "./vfs";
import {
  getActiveNotebook,
  nextCellId,
  renderNotebookUI,
  setViewMode,
} from "./notebook";

export interface ScriptTabDoc {
  id: string;
  title: string;
  lang: "ts" | "python";
  source: string;
  vfsPath: string;
  isSample?: boolean;
}

let scriptTabSeq = 1;
let syncingScriptTab = false;

export function nextScriptTabId(): string {
  return "stab_" + (++scriptTabSeq);
}

export function isScriptTabSyncing(): boolean {
  return syncingScriptTab;
}

export function setScriptTabSyncing(val: boolean): void {
  syncingScriptTab = val;
}

export const SCRIPT_TABS: Record<"ts" | "python", { activeTabId: string; tabs: ScriptTabDoc[] }> = {
  ts: { activeTabId: "", tabs: [] },
  python: { activeTabId: "", tabs: [] },
};

export const TS_SAMPLE_METADATA: Array<{ key: string; label: string; desc: string }> = [
  { key: "showcase", label: "showcase.ts · 综合演示", desc: "滑动窗口 + 单调栈 + Map + 树与图" },
  { key: "mergesort", label: "mergesort.ts · 归并排序", desc: "分治递归与左右子数组归并" },
  { key: "debug_crash", label: "debug_crash.ts · 越界排错", desc: "二分查找 <= 越界 Bug 现场定位" },
  { key: "lcs", label: "lcs.ts · 最长公共子序列", desc: "二维 DP 网格规划" },
  { key: "analyze", label: "analyze.ts · 频率统计", desc: "数组与 Map 哈希统计" },
  { key: "window", label: "window.ts · 滑动窗口", desc: "双指针定长滑动窗口" },
  { key: "structures", label: "structures.ts · 数据结构全家桶", desc: "栈 / 队列 / 堆 / 并查集 / 树 / 图" },
  { key: "counter", label: "counter.ts · 闭包计数器", desc: "高阶函数与词法作用域闭包" },
  { key: "classes", label: "classes.ts · 类与继承", desc: "class / extends / super 实例方法" },
  { key: "async_loop", label: "async_loop.ts · 事件循环", desc: "async / await 与微任务队列" },
];

export const PY_SAMPLE_METADATA: Array<{ key: string; label: string; desc: string }> = [
  { key: "quickstart", label: "quickstart.py · 冒泡排序", desc: "Python 列表原地交换与双层循环" },
  { key: "binary_search", label: "binary_search.py · 二分查找", desc: "双指针折半搜索与 checkpoint()" },
  { key: "bfs", label: "bfs.py · BFS 广度优先搜索", desc: "deque 队列与集合访问标记" },
  { key: "lcs", label: "lcs.py · DP 最长公共子序列", desc: "二维列表推导式与动态规划" },
  { key: "structures", label: "structures.py · 结构集合", desc: "TreeNode / ListNode / 字典 / 集合" },
  { key: "classes", label: "classes.py · 类与实例", desc: "Counter 类构造与实例属性追踪" },
];

export function getPySamplesDict(): Record<string, string> {
  const eng = typeof PY_ENGINE !== "undefined" ? PY_ENGINE : null;
  return eng && eng.samples ? eng.samples : {};
}

export function ensureScriptTabsForLang(lang: "ts" | "python"): { activeTabId: string; tabs: ScriptTabDoc[] } {
  ensureVfsInitialized();
  const store = SCRIPT_TABS[lang];
  if (store.tabs.length === 0) {
    const defaultTitle =
      lang === "python"
        ? (LANG === "python" && FILE_NAME ? FILE_NAME : "quickstart.py")
        : (LANG !== "python" && FILE_NAME ? FILE_NAME : "showcase.ts");
    const defaultSrc =
      lang === "python"
        ? (LANG === "python" && editor && editor.value ? editor.value : (getPySamplesDict().quickstart || ""))
        : (LANG !== "python" && editor && editor.value ? editor.value : (SAMPLES.showcase || ""));
    const tabId = nextScriptTabId();
    store.tabs.push({
      id: tabId,
      title: defaultTitle,
      lang,
      source: defaultSrc,
      vfsPath: "",
      isSample: true,
    });
    store.activeTabId = tabId;
  }
  const firstTab = store.tabs[0];
  if (firstTab && !store.tabs.some((t) => t.id === store.activeTabId)) {
    store.activeTabId = firstTab.id;
  }
  return store;
}

export function getActiveScriptTab(lang?: "ts" | "python"): ScriptTabDoc {
  const targetLang = lang || (LANG === "python" ? "python" : "ts");
  const store = ensureScriptTabsForLang(targetLang);
  const found = store.tabs.find((t) => t.id === store.activeTabId) ?? store.tabs[0];
  if (found) return found;
  return {
    id: "stab_0",
    title: targetLang === "python" ? "quickstart.py" : "showcase.ts",
    lang: targetLang,
    source: "",
    vfsPath: "",
    isSample: true,
  };
}

export function openSampleScriptTab(title: string, source: string, lang?: "ts" | "python") {
  const targetLang = lang || (LANG === "python" ? "python" : "ts");
  if (editor && editor.value) {
    syncActiveScriptTabSource(editor.value);
  }
  const store = ensureScriptTabsForLang(targetLang);
  let tab = store.tabs.find((t) => (t.isSample || !t.vfsPath) && t.title === title);
  if (!tab) {
    tab = {
      id: nextScriptTabId(),
      title,
      lang: targetLang,
      source,
      vfsPath: "",
      isSample: true,
    };
    store.tabs.push(tab);
  } else {
    tab.source = source;
    tab.vfsPath = "";
    tab.isSample = true;
  }
  store.activeTabId = tab.id;
  syncingScriptTab = true;
  if (editor) editor.value = source;
  setFileName(title);
  syncingScriptTab = false;
  renderScriptTabsUI();
  renderVfsTreeUI();
}

export function syncActiveScriptTabFromFileName(newFileName: string) {
  if (syncingScriptTab) return;
  const lang = LANG === "python" ? "python" : "ts";
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

export function syncActiveScriptTabSource(src: string) {
  const lang = LANG === "python" ? "python" : "ts";
  const activeTab = getActiveScriptTab(lang);
  if (!activeTab) return;
  activeTab.source = src;
  if (!activeTab.isSample && activeTab.vfsPath) {
    const node = VFS_NODES.get(activeTab.vfsPath);
    if (node && node.type === "file") {
      node.content = src;
      persistVfsToClientStorage();
    }
  }
}

export function renderScriptTabsUI() {
  const tabsEl = $("scriptTabsList");
  if (!tabsEl) return;
  const lang = LANG === "python" ? "python" : "ts";
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
  const isPy = LANG === "python";
  const items = isPy ? PY_SAMPLE_METADATA : TS_SAMPLE_METADATA;
  const folderPrefix = isPy ? "examples/python/" : "examples/ts/";

  const nbItemHtml =
    `<button type="button" class="import-sample-item" data-import-sample-notebook="Intro.ipynb">` +
    `<span class="import-sample-name">📓 Intro.ipynb · 交互式笔记本示例</span>` +
    `<span class="import-sample-path">examples/notebooks/</span>` +
    `</button>`;

  listEl.innerHTML =
    (VIEW_MODE === "notebook" ? nbItemHtml : "") +
    items
      .map(
        (item) =>
          `<button type="button" class="import-sample-item" data-import-sample-key="${esc(item.key)}" title="${esc(item.desc)}">` +
          `<span class="import-sample-name">${esc(item.label)}</span>` +
          `<span class="import-sample-path">${esc(folderPrefix + item.key + (isPy ? ".py" : ".ts"))}</span>` +
          `</button>`
      )
      .join("") +
    (VIEW_MODE !== "notebook" ? nbItemHtml : "");
}

export function initScriptTabsAndImportEvents() {
  const importMenuWrap = $("importMenuWrap");
  const btnImport = $<HTMLButtonElement>("btnImport");
  const btnUploadLocalFile = $<HTMLButtonElement>("btnUploadLocalFile");
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
      if (importMenuWrap.contains && importMenuWrap.contains(e.target as Node | null)) return;
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

  if (importSampleList && importSampleList.addEventListener) {
    importSampleList.addEventListener("click", (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const btn = target && target.closest ? (target.closest(".import-sample-item") as HTMLElement | null) : null;
      if (!btn) return;
      if (importMenuWrap && importMenuWrap.classList) importMenuWrap.classList.remove("open");
      const nbFile = btn.getAttribute("data-import-sample-notebook");
      if (nbFile) {
        setViewMode("notebook");
        say(`✓ 已加载内置示例笔记本 ${nbFile}`, "ok");
        return;
      }
      const sampleKey = btn.getAttribute("data-import-sample-key");
      if (sampleKey) {
        if (VIEW_MODE === "notebook") {
          const code = LANG === "python" ? (getPySamplesDict()[sampleKey] || "") : (SAMPLES[sampleKey] || "");
          if (code) {
            const doc = getActiveNotebook();
            const newCell: NotebookCell = {
              id: nextCellId(),
              type: "code",
              source: code.trim(),
              executionCount: null,
              status: "idle",
              output: null,
            };
            doc.cells.push(newCell);
            doc.activeCellId = newCell.id;
            renderNotebookUI(true);
            say(`✓ 已将示例 ${sampleKey} 导入到当前 Notebook 新单元格`, "ok");
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
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const lang = LANG === "python" ? "python" : "ts";
      const store = ensureScriptTabsForLang(lang);

      const closeBtn = target.closest ? (target.closest("[data-close-script-tab]") as HTMLElement | null) : null;
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
            syncingScriptTab = true;
            editor.value = nextTab.source;
            setFileName(nextTab.title);
            syncingScriptTab = false;
            resetTraceState();
            updateEditorChrome();
          }
          renderScriptTabsUI();
          renderVfsTreeUI();
        }
        return;
      }

      const newBtn = target.closest ? (target.closest("#scriptBtnNewTab") as HTMLElement | null) : null;
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
        syncingScriptTab = true;
        editor.value = newTab.source;
        setFileName(newTab.title);
        syncingScriptTab = false;
        resetTraceState();
        updateEditorChrome();
        renderScriptTabsUI();
        renderVfsTreeUI();
        if (editor && typeof editor.focus === "function") editor.focus();
        return;
      }

      const tabEl = target.closest ? (target.closest("[data-script-tab-id]") as HTMLElement | null) : null;
      if (tabEl) {
        const tabId = tabEl.getAttribute("data-script-tab-id");
        if (tabId && store.activeTabId !== tabId) {
          syncActiveScriptTabSource(editor ? editor.value : "");
          store.activeTabId = tabId;
          const nextTab = getActiveScriptTab(lang);
          syncingScriptTab = true;
          editor.value = nextTab.source;
          setFileName(nextTab.title);
          syncingScriptTab = false;
          resetTraceState();
          updateEditorChrome();
          renderScriptTabsUI();
          renderVfsTreeUI();
        }
      }
    });

    scriptTabsEl.addEventListener("dblclick", (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const tabEl = target && target.closest ? (target.closest("[data-script-tab-id]") as HTMLElement | null) : null;
      if (!tabEl) return;
      const tabId = tabEl.getAttribute("data-script-tab-id");
      const lang = LANG === "python" ? "python" : "ts";
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
            syncingScriptTab = true;
            setFileName(nextName);
            syncingScriptTab = false;
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
