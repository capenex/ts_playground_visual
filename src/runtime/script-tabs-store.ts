/* ================================================================
   Pure Script Tabs State Store & Sample Metadata (src/runtime/script-tabs-store.ts)
   Zero DOM dependencies — manages multi-tab document models & VFS sync
   ================================================================ */
import { SAMPLES } from "../samples/ts-samples";
import { appState, uiHooks } from "../state";
import {
  ensureVfsInitialized,
  persistVfsToClientStorage,
  VFS_NODES,
} from "./vfs-store";

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
    const curLang = appState.LANG;
    const curFileName = appState.FILE_NAME;
    const editorSrc = uiHooks.getEditorSource();
    const defaultTitle =
      lang === "python"
        ? (curLang === "python" && curFileName ? curFileName : "quickstart.py")
        : (curLang !== "python" && curFileName ? curFileName : "showcase.ts");
    const defaultSrc =
      lang === "python"
        ? (curLang === "python" && editorSrc ? editorSrc : (getPySamplesDict().quickstart || ""))
        : (curLang !== "python" && editorSrc ? editorSrc : (SAMPLES.showcase || ""));
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
  const targetLang = lang || (appState.LANG === "python" ? "python" : "ts");
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

export function syncActiveScriptTabSource(src: string): void {
  const lang = appState.LANG === "python" ? "python" : "ts";
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

export function upsertSampleScriptTab(
  title: string,
  source: string,
  lang?: "ts" | "python"
): ScriptTabDoc {
  const targetLang = lang || (appState.LANG === "python" ? "python" : "ts");
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
  return tab;
}

export function upsertVfsScriptTab(
  path: string,
  name: string,
  content: string,
  lang?: "ts" | "python"
): ScriptTabDoc {
  const targetLang = lang || (appState.LANG === "python" ? "python" : "ts");
  const store = ensureScriptTabsForLang(targetLang);
  let tab = store.tabs.find((t) => !t.isSample && t.vfsPath === path);
  if (!tab) {
    tab = {
      id: nextScriptTabId(),
      title: name,
      lang: targetLang,
      source: content,
      vfsPath: path,
      isSample: false,
    };
    store.tabs.push(tab);
  } else {
    tab.source = content;
    tab.vfsPath = path;
    tab.isSample = false;
  }
  store.activeTabId = tab.id;
  return tab;
}

export function handleVfsFileDeletedInTabs(delPath: string): void {
  const prefix = delPath + "/";
  (["ts", "python"] as const).forEach((l) => {
    const st = SCRIPT_TABS[l];
    st.tabs.forEach((t) => {
      if (t.vfsPath === delPath || t.vfsPath.startsWith(prefix)) {
        t.vfsPath = "";
      }
    });
  });
}

export function handleVfsFileRenamedInTabs(
  oldPath: string,
  nextPath: string,
  nextName: string
): { updated: boolean; isActive: boolean } {
  const lang = appState.LANG === "python" ? "python" : "ts";
  const store = ensureScriptTabsForLang(lang);
  const matchingTab = store.tabs.find((t) => t.vfsPath === oldPath);
  if (!matchingTab) return { updated: false, isActive: false };
  matchingTab.title = nextName;
  matchingTab.vfsPath = nextPath;
  return {
    updated: true,
    isActive: store.activeTabId === matchingTab.id,
  };
}
