/* ================================================================
   Pure Script Tabs State Store & Sample Metadata (src/runtime/script-tabs-store.ts)
   Zero DOM dependencies — manages multi-tab document models & VFS sync
   ================================================================ */
import { SAMPLES } from "../samples/ts-samples";
import { appState, uiHooks } from "../state";
import { isRecord } from "../utils/format";
import {
  ensureVfsInitialized,
  persistVfsToClientStorage,
  VFS_NODES,
} from "./vfs-store";

export interface ScriptTabDoc {
  id: string;
  title: string;
  lang: "ts";
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

export const SCRIPT_TABS: Record<"ts", { activeTabId: string; tabs: ScriptTabDoc[] }> = {
  ts: { activeTabId: "", tabs: [] },
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

export function ensureScriptTabsForLang(_lang: "ts" = "ts"): { activeTabId: string; tabs: ScriptTabDoc[] } {
  ensureVfsInitialized();
  const store = SCRIPT_TABS.ts;
  if (store.tabs.length === 0) {
    const curFileName = appState.FILE_NAME;
    const editorSrc = uiHooks.getEditorSource();
    const defaultTitle = curFileName ? curFileName : "showcase.ts";
    const defaultSrc = editorSrc ? editorSrc : (SAMPLES.showcase || "");
    const tabId = nextScriptTabId();
    store.tabs.push({
      id: tabId,
      title: defaultTitle,
      lang: "ts",
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

export function getActiveScriptTab(_lang?: "ts"): ScriptTabDoc {
  const store = ensureScriptTabsForLang("ts");
  const found = store.tabs.find((t) => t.id === store.activeTabId) ?? store.tabs[0];
  if (found) return found;
  return {
    id: "stab_0",
    title: "showcase.ts",
    lang: "ts",
    source: "",
    vfsPath: "",
    isSample: true,
  };
}

export function syncActiveScriptTabSource(src: string): void {
  const activeTab = getActiveScriptTab("ts");
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
  _lang?: "ts"
): ScriptTabDoc {
  const store = ensureScriptTabsForLang("ts");
  let tab = store.tabs.find((t) => (t.isSample || !t.vfsPath) && t.title === title);
  if (!tab) {
    tab = {
      id: nextScriptTabId(),
      title,
      lang: "ts",
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
  _lang?: "ts"
): ScriptTabDoc {
  const store = ensureScriptTabsForLang("ts");
  let tab = store.tabs.find((t) => !t.isSample && t.vfsPath === path);
  if (!tab) {
    tab = {
      id: nextScriptTabId(),
      title: name,
      lang: "ts",
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
  SCRIPT_TABS.ts.tabs.forEach((t) => {
    if (t.vfsPath === delPath || t.vfsPath.startsWith(prefix)) {
      t.vfsPath = "";
    }
  });
}

export function handleVfsFileRenamedInTabs(
  oldPath: string,
  nextPath: string,
  nextName: string
): { updated: boolean; isActive: boolean } {
  const store = ensureScriptTabsForLang("ts");
  const matchingTab = store.tabs.find((t) => t.vfsPath === oldPath);
  if (!matchingTab) return { updated: false, isActive: false };
  matchingTab.title = nextName;
  matchingTab.vfsPath = nextPath;
  return {
    updated: true,
    isActive: store.activeTabId === matchingTab.id,
  };
}

export function serializeScriptTabsSession(): {
  activeTabId: string;
  tabs: Array<{ id: string; title: string; source: string; vfsPath: string; isSample: boolean }>;
} {
  const store = ensureScriptTabsForLang("ts");
  return {
    activeTabId: store.activeTabId,
    tabs: store.tabs.map((t) => ({
      id: t.id,
      title: t.title,
      source: t.source,
      vfsPath: t.vfsPath || "",
      isSample: Boolean(t.isSample),
    })),
  };
}

export function restoreScriptTabsSession(raw: unknown): boolean {
  if (!isRecord(raw) || !Array.isArray(raw.tabs) || raw.tabs.length === 0) return false;
  const restored: ScriptTabDoc[] = [];
  for (const item of raw.tabs) {
    if (!isRecord(item) || typeof item.title !== "string" || typeof item.source !== "string") continue;
    const id = typeof item.id === "string" && item.id ? item.id : nextScriptTabId();
    const numM = id.match(/^stab_(\d+)$/);
    if (numM && numM[1]) {
      const seqNum = Number(numM[1]);
      if (seqNum >= scriptTabSeq) scriptTabSeq = seqNum + 1;
    }
    restored.push({
      id,
      title: item.title,
      lang: "ts",
      source: item.source,
      vfsPath: typeof item.vfsPath === "string" ? item.vfsPath : "",
      isSample: Boolean(item.isSample),
    });
  }
  if (restored.length === 0) return false;
  SCRIPT_TABS.ts.tabs = restored;
  const reqActive = typeof raw.activeTabId === "string" ? raw.activeTabId : "";
  const activeDoc = restored.find((t) => t.id === reqActive) ?? restored[0];
  if (activeDoc) {
    SCRIPT_TABS.ts.activeTabId = activeDoc.id;
  }
  return true;
}

