/* ================================================================
   Jupyter-Style Interactive Notebook View & Event Controller (src/ui/notebook.ts)
   Delegates document state to src/notebook/notebook-model.ts and execution
   kernel to src/notebook/notebook-kernel.ts
   ================================================================ */
import {
  buildTsTypecheckContext,
  debugNotebookCell,
  restartNotebookKernel,
  runAllNotebookCells,
  runNotebookCell,
  syncNotebookGlobalsToSidePanel,
  typecheckNotebookCellTS,
} from "../notebook/notebook-kernel";
import {
  createTutorialNotebookDocument,
  deleteCellInModel,
  duplicateCellInModel,
  ensureLangNotebooks,
  estimateMarkdownEditorHeight,
  getActiveCell,
  getActiveNotebook,
  getClipboardCell,
  insertCellInModel,
  moveCellInModel,
  nextCellId,
  nextDocId,
  parseIpynbJsonToDocument,
  renderMarkdownHtml,
  serializeNotebookToIpynbJson,
  setClipboardCell,
  TS_NOTEBOOK_TUTORIALS,
} from "../notebook/notebook-model";
import { resetTraceState, say } from "../runtime/event-loop";
import { appState, esc, registerUiHooks } from "../state";
import type { NotebookCell, NotebookDocument } from "../types";
import { buildStepVizRow, clearFlyLayer } from "../viz/ast-view";
import { collectDeclaredNames, hl, hlActiveLine } from "../viz/highlight";
import { stopAuto } from "./controls";
import {
  $,
  closestElement,
  eventTargetElement,
  eventTargetTextArea,
  queryTextArea,
} from "./dom";
import {
  getActiveScriptTab,
  initScriptTabsAndImportEvents,
  renderImportSampleMenu,
  renderScriptTabsUI,
} from "./script-tabs";
import {
  bindGlobalVfsApi,
  ensureVfsInitialized,
  initVfsSidebarEvents,
  persistVfsToClientStorage,
  renderVfsTreeUI,
  VFS_NODES,
} from "./vfs";

export * from "../notebook/notebook-model";
export * from "../notebook/notebook-kernel";

/* ── Cell Manipulation UI Actions (Insert, Move, Duplicate, Cut/Copy/Paste, Delete) ── */
export function insertNotebookCell(
  pos: "above" | "below" = "below",
  refCellId?: string,
  type: "code" | "markdown" = "code"
) {
  const doc = getActiveNotebook();
  insertCellInModel(doc, pos, refCellId, type);
  renderNotebookUI(true);
}

export function duplicateNotebookCell(cellId?: string) {
  const doc = getActiveNotebook();
  if (!duplicateCellInModel(doc, cellId)) return;
  renderNotebookUI(true);
}

export function moveNotebookCell(dir: -1 | 1, cellId?: string) {
  const doc = getActiveNotebook();
  if (!moveCellInModel(doc, dir, cellId)) return;
  renderNotebookUI();
}

export function deleteNotebookCell(cellId?: string) {
  const doc = getActiveNotebook();
  const res = deleteCellInModel(doc, cellId);
  if (!res.deleted) return;
  if (res.clearedDebugging) {
    resetTraceState();
  }
  renderNotebookUI();
}

export function cutNotebookCell() {
  const doc = getActiveNotebook();
  const cell = getActiveCell(doc);
  if (!cell) return;
  setClipboardCell({ ...cell, output: null, executionCount: null, status: "idle" });
  deleteNotebookCell(cell.id);
  say("✂ 已剪切当前单元格", "dim");
}

export function copyNotebookCell() {
  const doc = getActiveNotebook();
  const cell = getActiveCell(doc);
  if (!cell) return;
  setClipboardCell({ ...cell, output: null, executionCount: null, status: "idle" });
  say("📋 已复制当前单元格", "dim");
}

export function pasteNotebookCell() {
  const clip = getClipboardCell();
  if (!clip) {
    say("⚠ 剪贴板中暂无已复制的单元格", "dim");
    return;
  }
  const doc = getActiveNotebook();
  const idx = doc.cells.findIndex((c) => c.id === doc.activeCellId);
  const pasted: NotebookCell = {
    ...clip,
    id: nextCellId(),
    executionCount: null,
    status: "idle",
    output: null,
  };
  if (idx < 0) doc.cells.push(pasted);
  else doc.cells.splice(idx + 1, 0, pasted);
  doc.activeCellId = pasted.id;
  appState.ACTIVE_NB_CELL_ID = pasted.id;
  renderNotebookUI(true);
  say("📄 已在下方粘贴单元格", "ok");
}

/* ── Export & Import Standard .ipynb JSON ── */
export function exportActiveNotebookIpynb() {
  const doc = getActiveNotebook();
  const jsonStr = serializeNotebookToIpynbJson(doc);
  const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = doc.title.endsWith(".ipynb") ? doc.title : doc.title + ".ipynb";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  say(`💾 已导出笔记本文件 ${a.download}`, "ok");
}

export function importNotebookFromJson(jsonText: string, fileName: string): boolean {
  const newDoc = parseIpynbJsonToDocument(jsonText, fileName, "ts");
  if (!newDoc) return false;
  const store = ensureLangNotebooks("ts");
  store.docs.push(newDoc);
  store.activeDocId = newDoc.id;
  setViewMode("notebook");
  renderNotebookUI();
  say(`✓ 已导入 Jupyter 笔记本 ${newDoc.title}（共 ${newDoc.cells.length} 个单元格）`, "ok");
  return true;
}

/* ── Switch View Mode ('script' | 'notebook') ── */
export function setViewMode(mode: "script" | "notebook") {
  const next = mode === "notebook" ? "notebook" : "script";
  appState.VIEW_MODE = next;
  if (document.body && document.body.classList) {
    if (next === "notebook") document.body.classList.add("notebook-mode");
    else document.body.classList.remove("notebook-mode");
  }
  const modeSwitch = $("modeSwitch");
  if (modeSwitch && modeSwitch.querySelectorAll) {
    modeSwitch.querySelectorAll<HTMLElement>(".mode-tab").forEach((btn: HTMLElement) => {
      if (btn.classList && typeof btn.classList.toggle === "function") {
        btn.classList.toggle("active", btn.dataset.mode === next);
      }
    });
  }
  const nbWrap = $("notebookWrap");
  const edWrap = $("editorWrap");
  const srcPaneTitle = $("sourcePaneTitle");
  const expMenuWrap = $("exportMenuWrap");
  const vfsSidebar = $("vfsSidebar");
  const b1 = $("btnToggleVfs");
  const b2 = $("nbBtnToggleVfs");
  if (nbWrap) nbWrap.hidden = next !== "notebook";
  if (edWrap) edWrap.style.display = next === "notebook" ? "none" : "flex";
  if (srcPaneTitle) srcPaneTitle.style.display = next === "notebook" ? "none" : "flex";
  if (expMenuWrap) {
    expMenuWrap.style.display = next === "notebook" ? "none" : "";
    if (next === "notebook" && expMenuWrap.classList) expMenuWrap.classList.remove("open");
  }
  if (vfsSidebar) {
    vfsSidebar.hidden = true;
  }
  if (b1 && b1.classList) b1.classList.remove("active");
  if (b2 && b2.classList) b2.classList.remove("active");

  if (next === "notebook") {
    const doc = getActiveNotebook();
    appState.ACTIVE_NB_CELL_ID = doc.activeCellId;
    syncNotebookGlobalsToSidePanel(doc);
    renderNotebookUI();
  } else {
    stopAuto();
    clearFlyLayer();
    renderScriptTabsUI();
  }
  renderVfsTreeUI();
}

/* ── Render Highlighted Code + Live Type Diagnostics + Optional Debug Step Capsule for a Code Cell ── */
function renderCellCodeHighlight(
  cell: NotebookCell,
  isDebuggingThisCell: boolean
): { hlHtml: string; gutterHtml: string; stepVizHtml: string; stepVizLine: number } {
  const doc = getActiveNotebook();
  const lines = cell.source.replace(/\r\n?/g, "\n").split("\n");
  const { combinedTs } = buildTsTypecheckContext(doc, cell);
  const declared = collectDeclaredNames(combinedTs);

  const liveByLine = new Map<number, { line: number; code: string; message: string }>();
  if (cell.type === "code") {
    const cellDiags = typecheckNotebookCellTS(doc, cell);
    cellDiags.forEach((d) => {
      if (d && d.line >= 1 && !liveByLine.has(d.line)) {
        liveByLine.set(d.line, d);
      }
    });
  }

  const st = isDebuggingThisCell && appState.TRACE.steps.length ? appState.TRACE.steps[appState.cur] : null;
  const curLine = st ? st.line : -1;

  const hlHtml = lines
    .map((t, idx) => {
      const ln = idx + 1;
      const isCur = isDebuggingThisCell && ln === curLine;
      const diag = liveByLine.get(ln);
      const isErr =
        Boolean(diag) ||
        (cell.status === "error" && cell.output && cell.output.errorLine === ln) ||
        Boolean(isCur && st && st.error);
      const inner = isCur ? hlActiveLine(t, st && st.anim, declared) : hl(t, declared);
      const errBadge = diag
        ? `<span class="ln-err-badge" title="${esc((diag.code ? diag.code + ": " : "") + (diag.message || ""))}">✗ ${esc(diag.code || "TS")}</span>`
        : "";
      return `<span class="ln${isCur ? " cur" : ""}${isErr ? " err" : ""}">${(inner || "&nbsp;") + errBadge}</span>`;
    })
    .join("");

  const gutterHtml = lines
    .map((t, idx) => {
      const ln = idx + 1;
      const isCur = isDebuggingThisCell && ln === curLine;
      const isErr =
        liveByLine.has(ln) ||
        (cell.status === "error" && cell.output && cell.output.errorLine === ln) ||
        Boolean(isCur && st && st.error);
      const hasCkpt = /^\s*(?:checkpoint|断点)\s*\(/.test(t);
      return `<div class="nb-gline${isCur ? " cur" : ""}${isErr ? " err" : ""}${hasCkpt ? " ckpt" : ""}" data-line="${ln}">${ln}</div>`;
    })
    .join("");

  let stepVizHtml = "";
  if (isDebuggingThisCell && st && (st.anim || st.error) && curLine >= 1 && curLine <= lines.length) {
    stepVizHtml = buildStepVizRow(lines[curLine - 1] || "", st.anim, st.error, true);
  }

  return { hlHtml, gutterHtml, stepVizHtml, stepVizLine: curLine };
}

/* ── Main DOM Render for Notebook Mode ── */
export function renderNotebookUI(focusActiveEditor = false) {
  const wrap = $("notebookWrap");
  if (!wrap || appState.VIEW_MODE !== "notebook") return;

  const store = ensureLangNotebooks("ts");
  const doc = getActiveNotebook();
  const activeCell = getActiveCell(doc);

  const tabsEl = $("nbTabsList");
  if (tabsEl) {
    tabsEl.innerHTML =
      store.docs
        .map((d) => {
          const isAct = d.id === doc.id;
          return (
            `<div class="nb-tab${isAct ? " active" : ""}" data-doc-id="${esc(d.id)}" title="双击可重命名笔记本">` +
            `<span class="nb-tab-icon" aria-hidden="true"></span>` +
            `<span class="nb-tab-title">${esc(d.title)}</span>` +
            (store.docs.length > 1
              ? `<button type="button" class="nb-tab-close" data-close-doc="${esc(d.id)}" title="关闭标签页">×</button>`
              : "") +
            `</div>`
          );
        })
        .join("") +
      `<button type="button" class="nb-tab-add" id="nbBtnNewTab" title="新建空白 Notebook 标签页">＋</button>`;
  }

  const typeSel = $<HTMLSelectElement>("nbCellType");
  if (typeSel && activeCell) {
    typeSel.value = activeCell.type;
  }
  const kernelBadge = $("nbKernelStatus");
  if (kernelBadge) {
    const isDbg = Boolean(doc.debuggingCellId && appState.DEBUG_SESSION.active);
    const stateTxt = isDbg ? "调试中" : "就绪";
    kernelBadge.innerHTML =
      `<span class="nb-kernel-dot${isDbg ? " debug" : ""}"></span>` +
      `<span>${stateTxt}</span>`;
  }

  const cellsContainer = $("nbCellsList");
  if (!cellsContainer) return;

  cellsContainer.innerHTML = doc.cells
    .map((cell, idx) => {
      const isFocused = cell.id === doc.activeCellId;
      const isDebugging = doc.debuggingCellId === cell.id && appState.DEBUG_SESSION.active;
      const promptTxt =
        cell.status === "running"
          ? "[*]:"
          : cell.executionCount != null
          ? `[${cell.executionCount}]:`
          : "[ ]:";

      const lineCount = Math.max(1, cell.source.split("\n").length);
      const editorHeight = Math.max(38, lineCount * 24 + 14);
      const mdEditorHeight = estimateMarkdownEditorHeight(cell.source);

      if (cell.type === "markdown") {
        const isRendered = Boolean(cell.markdownRendered);
        return (
          `<div class="nb-cell nb-cell-md${isFocused ? " active" : ""}" data-cell-id="${esc(cell.id)}">` +
          `<div class="nb-cell-bar"></div>` +
          `<div class="nb-cell-prompt md-prompt">${isRendered ? "" : "MD"}</div>` +
          `<div class="nb-cell-main">` +
          `<div class="nb-cell-input md-input">` +
          `<div class="nb-cell-actions">` +
          `<button type="button" class="nb-act-btn" data-cell-act="toggle-md" data-cell-id="${esc(cell.id)}" title="${isRendered ? "编辑 Markdown" : "渲染预览 Markdown (Shift+Enter)"}">${isRendered ? "✎" : "✓"}</button>` +
          `<button type="button" class="nb-act-btn" data-cell-act="dup" data-cell-id="${esc(cell.id)}" title="复制并向下克隆单元格">⧉</button>` +
          `<button type="button" class="nb-act-btn" data-cell-act="up" data-cell-id="${esc(cell.id)}" ${idx === 0 ? "disabled" : ""} title="上移单元格">↑</button>` +
          `<button type="button" class="nb-act-btn" data-cell-act="down" data-cell-id="${esc(cell.id)}" ${idx === doc.cells.length - 1 ? "disabled" : ""} title="下移单元格">↓</button>` +
          `<button type="button" class="nb-act-btn" data-cell-act="ins-above" data-cell-id="${esc(cell.id)}" title="在上方插入单元格">⤒</button>` +
          `<button type="button" class="nb-act-btn" data-cell-act="ins-below" data-cell-id="${esc(cell.id)}" title="在下方插入单元格">⤓</button>` +
          `<button type="button" class="nb-act-btn danger" data-cell-act="del" data-cell-id="${esc(cell.id)}" title="删除单元格">🗑</button>` +
          `</div>` +
          (isRendered
            ? `<div class="nb-md-preview" data-cell-act="edit-md" data-cell-id="${esc(cell.id)}" title="双击编辑 Markdown">${renderMarkdownHtml(cell.source)}</div>`
            : `<textarea class="nb-cell-textarea md-textarea" data-cell-id="${esc(cell.id)}" style="height:${mdEditorHeight}px" spellcheck="false" placeholder="# 输入 Markdown 标题或算法推导说明，按 Shift+Enter 渲染预览">${esc(cell.source)}</textarea>`) +
          `</div>` +
          `</div>` +
          `</div>`
        );
      }

      const { hlHtml, gutterHtml, stepVizHtml } = renderCellCodeHighlight(cell, isDebugging);
      const out = cell.output;
      let outputHtml = "";
      if (out && (out.logs.length > 0 || out.returnValue != null || out.error)) {
        const logsPart = out.logs
          .map((l) => `<div class="nb-out-line">${esc(l)}</div>`)
          .join("");
        const retPart =
          out.returnValue != null
            ? `<div class="nb-out-ret"><span class="nb-out-prompt">Out[${cell.executionCount || ""}]:</span> <span>${esc(out.returnValue)}</span></div>`
            : "";
        const errPart = out.error
          ? `<div class="nb-out-err">✗ ${esc(out.error)}</div>`
          : "";
        outputHtml = `<div class="nb-cell-output">${logsPart}${retPart}${errPart}</div>`;
      }

      return (
        `<div class="nb-cell nb-cell-code${isFocused ? " active" : ""}${isDebugging ? " debugging" : ""}${cell.status === "error" ? " has-error" : ""}" data-cell-id="${esc(cell.id)}">` +
        `<div class="nb-cell-bar"></div>` +
        `<div class="nb-cell-prompt" data-cell-act="run" data-cell-id="${esc(cell.id)}" title="点击运行此单元格 (Shift+Enter)">${esc(promptTxt)}</div>` +
        `<div class="nb-cell-main">` +
        `<div class="nb-cell-input">` +
        `<div class="nb-cell-gutter">${gutterHtml}</div>` +
        `<div class="nb-cell-code-box" style="height:${editorHeight}px">` +
        `<pre class="nb-cell-hl" aria-hidden="true">${hlHtml}</pre>` +
        `<textarea class="nb-cell-textarea" data-cell-id="${esc(cell.id)}" style="height:${editorHeight}px" spellcheck="false" autocomplete="off" placeholder="// 输入 TypeScript 代码，Shift+Enter 运行，点右上 🐞 单步调试">${esc(cell.source)}</textarea>` +
        `</div>` +
        `<div class="nb-cell-actions">` +
        `<button type="button" class="nb-act-btn run-act" data-cell-act="run" data-cell-id="${esc(cell.id)}" title="运行此单元格 (Shift+Enter)">▶</button>` +
        `<button type="button" class="nb-act-btn debug-act${isDebugging ? " active" : ""}" data-cell-act="debug" data-cell-id="${esc(cell.id)}" title="单步可视化调试此单元格 (Ctrl+Shift+Enter)">🐞</button>` +
        `<button type="button" class="nb-act-btn" data-cell-act="dup" data-cell-id="${esc(cell.id)}" title="复制并向下克隆单元格">⧉</button>` +
        `<button type="button" class="nb-act-btn" data-cell-act="up" data-cell-id="${esc(cell.id)}" ${idx === 0 ? "disabled" : ""} title="上移单元格">↑</button>` +
        `<button type="button" class="nb-act-btn" data-cell-act="down" data-cell-id="${esc(cell.id)}" ${idx === doc.cells.length - 1 ? "disabled" : ""} title="下移单元格">↓</button>` +
        `<button type="button" class="nb-act-btn" data-cell-act="ins-above" data-cell-id="${esc(cell.id)}" title="在上方插入单元格">⤒</button>` +
        `<button type="button" class="nb-act-btn" data-cell-act="ins-below" data-cell-id="${esc(cell.id)}" title="在下方插入单元格">⤓</button>` +
        `<button type="button" class="nb-act-btn danger" data-cell-act="del" data-cell-id="${esc(cell.id)}" title="删除单元格">🗑</button>` +
        `</div>` +
        `</div>` +
        (stepVizHtml ? `<div class="nb-cell-stepviz">${stepVizHtml}</div>` : "") +
        outputHtml +
        `</div>` +
        `</div>`
      );
    })
    .join("") +
    `<div class="nb-bottom-add-bar">` +
    `<button type="button" class="nb-add-chip" id="nbBottomAddCode">＋ 代码单元格 (Code)</button>` +
    `<button type="button" class="nb-add-chip" id="nbBottomAddMd">＋ 文档单元格 (Markdown)</button>` +
    `</div>`;

  if (cellsContainer.querySelectorAll) {
    cellsContainer.querySelectorAll<HTMLElement>(".nb-cell-textarea.md-textarea").forEach((el: HTMLElement) => {
      if (el && el.scrollHeight && el.scrollHeight > el.clientHeight) {
        el.style.height = Math.max(92, el.scrollHeight + 10) + "px";
      }
    });
  }

  if (focusActiveEditor && doc.activeCellId) {
    const ta = queryTextArea(cellsContainer, `textarea[data-cell-id="${doc.activeCellId}"]`);
    if (ta && typeof ta.focus === "function") {
      ta.focus();
    }
  }
}

/* ── Toggle Checkpoint on a Specific Line of a Notebook Cell ── */
function toggleNotebookCellCheckpoint(cellId: string, lineNum: number) {
  const doc = getActiveNotebook();
  const cell = doc.cells.find((c) => c.id === cellId);
  if (!cell || cell.type !== "code") return;
  const lines = cell.source.replace(/\r\n?/g, "\n").split("\n");
  if (lineNum < 1 || lineNum > lines.length) return;
  const targetLine = lines[lineNum - 1] || "";
  if (/^\s*(?:checkpoint|断点)\s*\(/.test(targetLine)) {
    lines.splice(lineNum - 1, 1);
  } else {
    const indent = (targetLine.match(/^\s*/) || [""])[0];
    lines.splice(lineNum - 1, 0, indent + "checkpoint();");
  }
  cell.source = lines.join("\n");
  renderNotebookUI();
  if (doc.debuggingCellId === cell.id) {
    debugNotebookCell(cell.id);
  }
}

function initNotebookTabsEvents() {
  const tabsEl = $("nbTabsList");
  if (!tabsEl || !tabsEl.addEventListener) return;

  tabsEl.addEventListener("click", (e: MouseEvent) => {
    const target = eventTargetElement(e);
    if (!target) return;
    const closeBtn = closestElement(target, "[data-close-doc]");
    const store = ensureLangNotebooks("ts");
    if (closeBtn) {
      e.stopPropagation();
      const closeId = closeBtn.getAttribute("data-close-doc");
      if (store.docs.length <= 1) return;
      const idx = store.docs.findIndex((d) => d.id === closeId);
      if (idx >= 0) {
        store.docs.splice(idx, 1);
        if (store.activeDocId === closeId) {
          const fallbackDoc = store.docs[Math.max(0, idx - 1)];
          if (fallbackDoc) store.activeDocId = fallbackDoc.id;
        }
        syncNotebookGlobalsToSidePanel();
        renderNotebookUI();
        renderVfsTreeUI();
      }
      return;
    }
    const newBtn = closestElement(target, "#nbBtnNewTab");
    if (newBtn) {
      const cId = nextCellId();
      const newDoc: NotebookDocument = {
        id: nextDocId(),
        title: `Untitled-${store.docs.length + 1}.ipynb`,
        lang: "ts",
        execCounter: 0,
        activeCellId: cId,
        debuggingCellId: null,
        cells: [
          {
            id: cId,
            type: "code",
            source: "",
            executionCount: null,
            status: "idle",
            output: null,
          },
        ],
        executedHistory: [],
        lastGlobalVars: {},
        lastGlobalDs: {},
      };
      store.docs.push(newDoc);
      store.activeDocId = newDoc.id;
      syncNotebookGlobalsToSidePanel(newDoc);
      renderNotebookUI(true);
      renderVfsTreeUI();
      return;
    }
    const tab = closestElement(target, ".nb-tab");
    if (tab && tab.dataset.docId) {
      if (store.activeDocId !== tab.dataset.docId) {
        store.activeDocId = tab.dataset.docId;
        syncNotebookGlobalsToSidePanel();
        renderNotebookUI();
        renderVfsTreeUI();
      }
    }
  });

  tabsEl.addEventListener("dblclick", (e: MouseEvent) => {
    const tab = closestElement(e, ".nb-tab");
    if (!tab || !tab.dataset.docId) return;
    const store = ensureLangNotebooks("ts");
    const targetDoc = store.docs.find((d) => d.id === tab.dataset.docId) || getActiveNotebook();
    const titleSpan = tab.querySelector ? tab.querySelector(".nb-tab-title") : null;
    if (!titleSpan) return;
    const input = document.createElement("input");
    input.type = "text";
    input.className = "nb-tab-rename-input";
    input.value = targetDoc.title;
    titleSpan.replaceWith(input);
    input.focus();
    input.select();
    let committed = false;
    const commit = () => {
      if (committed) return;
      committed = true;
      const val = input.value.trim();
      if (val) {
        const oldPath = `notebooks/${targetDoc.title}`;
        targetDoc.title = val.endsWith(".ipynb") ? val : val + ".ipynb";
        if (oldPath !== `notebooks/${targetDoc.title}`) {
          VFS_NODES.delete(oldPath);
        }
        say(`✓ 笔记本已重命名为 ${targetDoc.title}`, "ok");
      }
      renderNotebookUI();
      renderVfsTreeUI();
    };
    input.addEventListener("blur", commit);
    input.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        input.blur();
      } else if (ev.key === "Escape") {
        committed = true;
        renderNotebookUI();
      }
    });
  });
}

function initNotebookCellsEvents() {
  const typeSel = $<HTMLSelectElement>("nbCellType");
  if (typeSel) {
    typeSel.onchange = () => {
      const doc = getActiveNotebook();
      const cell = getActiveCell(doc);
      if (!cell) return;
      cell.type = typeSel.value === "markdown" ? "markdown" : "code";
      cell.markdownRendered = false;
      cell.output = null;
      cell.executionCount = null;
      renderNotebookUI(true);
    };
  }

  const cellsList = $("nbCellsList");
  if (!cellsList || !cellsList.addEventListener) return;

  cellsList.addEventListener("click", (e: MouseEvent) => {
    const target = eventTargetElement(e);
    if (!target) return;
    if (target.closest && target.closest("#nbBottomAddCode")) {
      const doc = getActiveNotebook();
      const last = doc.cells[doc.cells.length - 1];
      insertNotebookCell("below", last ? last.id : undefined, "code");
      return;
    }
    if (target.closest && target.closest("#nbBottomAddMd")) {
      const doc = getActiveNotebook();
      const last = doc.cells[doc.cells.length - 1];
      insertNotebookCell("below", last ? last.id : undefined, "markdown");
      return;
    }

    const actEl = closestElement(target, "[data-cell-act]");
    if (actEl) {
      const act = actEl.getAttribute("data-cell-act");
      const cid = actEl.getAttribute("data-cell-id");
      if (!cid) return;
      const doc = getActiveNotebook();
      doc.activeCellId = cid;
      appState.ACTIVE_NB_CELL_ID = cid;
      if (act === "run") {
        runNotebookCell(cid, true);
        return;
      }
      if (act === "debug") {
        debugNotebookCell(cid);
        return;
      }
      if (act === "dup") {
        duplicateNotebookCell(cid);
        return;
      }
      if (act === "up") {
        moveNotebookCell(-1, cid);
        return;
      }
      if (act === "down") {
        moveNotebookCell(1, cid);
        return;
      }
      if (act === "ins-above") {
        insertNotebookCell("above", cid);
        return;
      }
      if (act === "ins-below") {
        insertNotebookCell("below", cid);
        return;
      }
      if (act === "del") {
        deleteNotebookCell(cid);
        return;
      }
      if (act === "toggle-md") {
        const c = doc.cells.find((x) => x.id === cid);
        if (c) {
          c.markdownRendered = !c.markdownRendered;
          renderNotebookUI(!c.markdownRendered);
        }
        return;
      }
    }

    const cellBox = closestElement(target, ".nb-cell");
    if (cellBox && cellBox.dataset.cellId) {
      const doc = getActiveNotebook();
      if (doc.activeCellId !== cellBox.dataset.cellId) {
        doc.activeCellId = cellBox.dataset.cellId;
        appState.ACTIVE_NB_CELL_ID = doc.activeCellId;
        if (cellsList.querySelectorAll) {
          cellsList.querySelectorAll<HTMLElement>(".nb-cell").forEach((el: HTMLElement) => {
            el.classList.toggle("active", el.dataset.cellId === doc.activeCellId);
          });
        }
        const c = getActiveCell(doc);
        if (typeSel && c) typeSel.value = c.type;
      }
    }
  });

  cellsList.addEventListener("dblclick", (e: MouseEvent) => {
    const mdPrev = closestElement(e, '[data-cell-act="edit-md"]');
    if (mdPrev) {
      const cid = mdPrev.getAttribute("data-cell-id");
      const doc = getActiveNotebook();
      const c = doc.cells.find((x) => x.id === cid);
      if (c) {
        c.markdownRendered = false;
        doc.activeCellId = c.id;
        renderNotebookUI(true);
      }
    }
  });

  cellsList.addEventListener("input", (e: Event) => {
    const ta = eventTargetTextArea(e);
    if (!ta || !ta.classList || !ta.classList.contains("nb-cell-textarea")) return;
    const cid = ta.getAttribute("data-cell-id");
    const doc = getActiveNotebook();
    const cell = doc.cells.find((c) => c.id === cid);
    if (!cell) return;
    cell.source = ta.value;

    if (cell.type === "markdown") {
      const estH = estimateMarkdownEditorHeight(cell.source);
      ta.style.height = "auto";
      const nextH = Math.max(estH, (ta.scrollHeight || 0) + 10);
      ta.style.height = nextH + "px";
      return;
    }

    const lineCount = Math.max(1, cell.source.split("\n").length);
    const h = Math.max(38, lineCount * 24 + 14);
    ta.style.height = h + "px";
    const codeBox = closestElement(ta, ".nb-cell-code-box");
    if (codeBox) codeBox.style.height = h + "px";

    if (cell.type === "code") {
      const isDebugging = doc.debuggingCellId === cell.id && appState.DEBUG_SESSION.active;
      const { hlHtml, gutterHtml } = renderCellCodeHighlight(cell, isDebugging);
      const hlPre = codeBox && codeBox.querySelector ? codeBox.querySelector(".nb-cell-hl") : null;
      if (hlPre) hlPre.innerHTML = hlHtml;
      const inputWrap = ta.closest ? ta.closest(".nb-cell-input") : null;
      const gutter = inputWrap && inputWrap.querySelector ? inputWrap.querySelector(".nb-cell-gutter") : null;
      if (gutter) gutter.innerHTML = gutterHtml;
    }
  });

  cellsList.addEventListener("keydown", (e: KeyboardEvent) => {
    const ta = eventTargetTextArea(e);
    if (!ta || !ta.classList || !ta.classList.contains("nb-cell-textarea")) return;
    const cid = ta.getAttribute("data-cell-id") || undefined;
    if (e.key === "Tab") {
      e.preventDefault();
      const s = ta.selectionStart || 0;
      const t = ta.selectionEnd || 0;
      const indent = "  ";
      ta.value = ta.value.slice(0, s) + indent + ta.value.slice(t);
      ta.selectionStart = ta.selectionEnd = s + indent.length;
      ta.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }
    if (e.key === "Enter" && e.shiftKey && !(e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      runNotebookCell(cid, true);
      return;
    }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && e.shiftKey) {
      e.preventDefault();
      debugNotebookCell(cid);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "c") {
      if ((ta.selectionStart || 0) === (ta.selectionEnd || 0) && cid) {
        e.preventDefault();
        const pos = ta.selectionStart || 0;
        const curLine = ta.value.slice(0, pos).split("\n").length;
        toggleNotebookCellCheckpoint(cid, curLine);
        return;
      }
    }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
      e.preventDefault();
      runNotebookCell(cid, false);
      return;
    }
  });
}

/* ── Wire Up Notebook DOM Events, Single-File Multi-Tabs, Import Menu & Right VFS Sidebar ── */
export function initNotebookUI() {
  bindGlobalVfsApi();
  ensureVfsInitialized();

  const modeSwitch = $("modeSwitch");
  if (modeSwitch && modeSwitch.addEventListener) {
    modeSwitch.addEventListener("click", (e: MouseEvent) => {
      const btn = closestElement(e, ".mode-tab");
      if (!btn || !btn.dataset.mode) return;
      setViewMode(btn.dataset.mode === "notebook" ? "notebook" : "script");
    });
  }

  initScriptTabsAndImportEvents();
  initVfsSidebarEvents();

  renderScriptTabsUI();
  renderVfsTreeUI();
  renderImportSampleMenu();

  const nbWrap = $("notebookWrap");
  if (!nbWrap || !nbWrap.addEventListener) return;

  initNotebookTabsEvents();
  initTutorialModalEvents();

  const bindBtn = (id: string, fn: () => void) => {
    const b = $(id);
    if (b) b.onclick = fn;
  };
  bindBtn("nbBtnAdd", () => insertNotebookCell("below"));
  bindBtn("nbBtnCut", () => cutNotebookCell());
  bindBtn("nbBtnCopy", () => copyNotebookCell());
  bindBtn("nbBtnPaste", () => pasteNotebookCell());
  bindBtn("nbBtnRun", () => runNotebookCell(undefined, true));
  bindBtn("nbBtnStop", () => {
    const doc = getActiveNotebook();
    doc.debuggingCellId = null;
    stopAuto();
    resetTraceState();
    syncNotebookGlobalsToSidePanel(doc);
    renderNotebookUI();
    say("■ 已退出当前单元格单步调试，恢复显示 Notebook 全局上下文", "dim");
  });
  bindBtn("nbBtnRestart", () => restartNotebookKernel(false));
  bindBtn("nbBtnRunAll", () => runAllNotebookCells());

  initNotebookCellsEvents();
}

/* ── TypeScript Advanced Interactive Tutorial Selector Modal ── */
let selectedTutorialId: string =
  TS_NOTEBOOK_TUTORIALS[0]?.id ?? "ts-adv-01-interfaces-structural";

function ensureTsLanguageActive(): void {
  appState.LANG = "ts";
}

function syncTutorialDocToVfs(doc: NotebookDocument): void {
  ensureVfsInitialized();
  const vfsPath = doc.title;
  VFS_NODES.set(vfsPath, {
    path: vfsPath,
    name: doc.title,
    type: "file",
    parentPath: "",
    content: serializeNotebookToIpynbJson(doc),
  });
  persistVfsToClientStorage();
}

export function renderTutorialModalUI(): void {
  const listEl = $("tutorialModalList");
  const detailEl = $("tutorialModalDetail");
  if (!listEl || !detailEl) return;

  const store = ensureLangNotebooks("ts");
  const openedTitles = new Set(store.docs.map((d) => d.title));
  const current =
    TS_NOTEBOOK_TUTORIALS.find((t) => t.id === selectedTutorialId) ??
    TS_NOTEBOOK_TUTORIALS[0];
  if (!current) return;
  selectedTutorialId = current.id;

  listEl.innerHTML = TS_NOTEBOOK_TUTORIALS.map((item) => {
    const isAct = item.id === current.id;
    const isLoaded = openedTitles.has(item.fileName);
    const codeCellCount = item.cells.filter((c) => c.type === "code").length;
    return (
      `<button type="button" class="tutorial-card-item${isAct ? " active" : ""}" data-tutorial-id="${esc(item.id)}" title="单击预览课程大纲 · 双击立即导入并打开">` +
      `<div class="tutorial-card-top">` +
      `<span class="tutorial-card-badge">${esc(item.codeBadge)}</span>` +
      `<span class="tutorial-card-cat">${esc(item.category)}</span>` +
      `<span class="tutorial-card-lvl">${esc(item.level)}</span>` +
      (isLoaded ? `<span class="tutorial-card-loaded">已导入</span>` : "") +
      `</div>` +
      `<div class="tutorial-card-title">${esc(item.title)}</div>` +
      `<div class="tutorial-card-meta">` +
      `<span>📓 ${esc(item.fileName)}</span>` +
      `<span>· ${codeCellCount} 个代码格</span>` +
      `</div>` +
      `</button>`
    );
  }).join("");

  const highlightsHtml = current.highlights
    .map((h) => `<span class="tutorial-hl-chip">✦ ${esc(h)}</span>`)
    .join("");

  const cellsPreviewHtml = current.cells
    .map((c, idx) => {
      const isMd = c.type === "markdown";
      const firstLine = (c.source.split("\n")[0] || "").replace(/^#+\s*/, "").trim();
      const lineCount = c.source.split("\n").length;
      return (
        `<div class="tutorial-cell-prev ${isMd ? "md" : "code"}">` +
        `<div class="tutorial-cell-prev-head">` +
        `<span class="tutorial-cell-tag">${isMd ? "Markdown 导读" : `Code [${idx}]`}</span>` +
        `<span class="tutorial-cell-lines">${lineCount} 行 · ${esc(firstLine)}</span>` +
        `</div>` +
        `<pre class="tutorial-cell-code">${esc(c.source)}</pre>` +
        `</div>`
      );
    })
    .join("");

  const alreadyInWorkspace = openedTitles.has(current.fileName);

  detailEl.innerHTML =
    `<div class="tutorial-detail-head">` +
    `<div class="tutorial-detail-tags">` +
    `<span class="tutorial-tag-cat">${esc(current.category)}</span>` +
    `<span class="tutorial-tag-lvl">${esc(current.level)}</span>` +
    `<span class="tutorial-tag-file">examples/notebooks/${esc(current.fileName)}</span>` +
    `</div>` +
    `<h4 class="tutorial-detail-title">${esc(current.title)}</h4>` +
    `<p class="tutorial-detail-summary">${esc(current.summary)}</p>` +
    `<div class="tutorial-hl-list">${highlightsHtml}</div>` +
    `</div>` +
    `<div class="tutorial-detail-cells-title">课程单元格结构预览（共 ${current.cells.length} 个单元格，含 🐞 单步可视化调试练习）</div>` +
    `<div class="tutorial-detail-cells">${cellsPreviewHtml}</div>` +
    `<div class="tutorial-detail-foot">` +
    `<button type="button" class="tutorial-btn secondary" data-tutorial-act="import-all" title="将全部 6 门 TypeScript 进阶教学课程一次性导入到 Notebook 标签栏">📚 一键导入全部 6 门课程</button>` +
    `<button type="button" class="tutorial-btn primary" data-tutorial-act="import-one" data-tutorial-id="${esc(current.id)}">` +
    (alreadyInWorkspace ? "📓 切换到此教学 Notebook" : "📥 导入并打开此教学 Notebook") +
    `</button>` +
    `</div>`;
}

export function openTutorialModal(): void {
  const modal = $("tutorialModal");
  if (!modal) return;
  renderTutorialModalUI();
  modal.hidden = false;
}

export function closeTutorialModal(): void {
  const modal = $("tutorialModal");
  if (!modal) return;
  modal.hidden = true;
}

export function importTutorialNotebook(tutorialId: string): boolean {
  const item = TS_NOTEBOOK_TUTORIALS.find(
    (t) => t.id === tutorialId || t.fileName === tutorialId
  );
  if (!item) return false;

  ensureTsLanguageActive();
  const store = ensureLangNotebooks("ts");
  let targetDoc = store.docs.find((d) => d.title === item.fileName) ?? null;
  let isNew = false;

  if (!targetDoc) {
    targetDoc = createTutorialNotebookDocument(item.id);
    if (!targetDoc) return false;
    store.docs.push(targetDoc);
    syncTutorialDocToVfs(targetDoc);
    isNew = true;
  }

  store.activeDocId = targetDoc.id;
  selectedTutorialId = item.id;
  closeTutorialModal();
  setViewMode("notebook");
  syncNotebookGlobalsToSidePanel(targetDoc);
  renderNotebookUI();
  renderVfsTreeUI();
  say(
    isNew
      ? `🎓 已导入并打开 TS 进阶教学《${item.title}》（共 ${targetDoc.cells.length} 个单元格，可按 Shift+Enter 逐格运行或点 🐞 单步调试）`
      : `🎓 已切换到 TS 进阶教学《${item.title}》`,
    "ok"
  );
  return true;
}

export function importAllTutorialNotebooks(): number {
  ensureTsLanguageActive();
  const store = ensureLangNotebooks("ts");
  let importedCount = 0;
  let focusDoc: NotebookDocument | null = null;

  for (const item of TS_NOTEBOOK_TUTORIALS) {
    let doc = store.docs.find((d) => d.title === item.fileName) ?? null;
    if (!doc) {
      doc = createTutorialNotebookDocument(item.id);
      if (doc) {
        store.docs.push(doc);
        syncTutorialDocToVfs(doc);
        importedCount++;
      }
    }
    if (doc && item.id === selectedTutorialId) {
      focusDoc = doc;
    }
  }

  const activeDoc = focusDoc ?? store.docs[store.docs.length - 1];
  if (activeDoc) {
    store.activeDocId = activeDoc.id;
  }
  closeTutorialModal();
  setViewMode("notebook");
  if (activeDoc) {
    syncNotebookGlobalsToSidePanel(activeDoc);
  }
  renderNotebookUI();
  renderVfsTreeUI();
  say(
    `🎓 已导入全部 ${TS_NOTEBOOK_TUTORIALS.length} 门 TypeScript 进阶教学 Notebook（新增 ${importedCount} 门），可在上方标签栏自由切换`,
    "ok"
  );
  return importedCount;
}

function initTutorialModalEvents(): void {
  const modal = $("tutorialModal");
  const closeBtn = $("tutorialModalClose");
  const listEl = $("tutorialModalList");
  const detailEl = $("tutorialModalDetail");

  if (closeBtn) {
    closeBtn.onclick = () => closeTutorialModal();
  }
  if (modal && modal.addEventListener) {
    modal.addEventListener("click", (e: MouseEvent) => {
      if (e.target === modal) {
        closeTutorialModal();
      }
    });
  }
  if (listEl && listEl.addEventListener) {
    listEl.addEventListener("click", (e: MouseEvent) => {
      const card = closestElement(e, "[data-tutorial-id]");
      if (!card) return;
      const tid = card.getAttribute("data-tutorial-id");
      if (tid && tid !== selectedTutorialId) {
        selectedTutorialId = tid;
        renderTutorialModalUI();
      }
    });
    listEl.addEventListener("dblclick", (e: MouseEvent) => {
      const card = closestElement(e, "[data-tutorial-id]");
      if (!card) return;
      const tid = card.getAttribute("data-tutorial-id");
      if (tid) {
        importTutorialNotebook(tid);
      }
    });
  }
  if (detailEl && detailEl.addEventListener) {
    detailEl.addEventListener("click", (e: MouseEvent) => {
      const actBtn = closestElement(e, "[data-tutorial-act]");
      if (!actBtn) return;
      const act = actBtn.getAttribute("data-tutorial-act");
      if (act === "import-one") {
        const tid = actBtn.getAttribute("data-tutorial-id") || selectedTutorialId;
        importTutorialNotebook(tid);
      } else if (act === "import-all") {
        importAllTutorialNotebooks();
      }
    });
  }
}

export function openVfsNotebookFile(name: string, content: string | undefined): void {
  const store = ensureLangNotebooks("ts");
  const existing = store.docs.find((d) => d.title === name);
  if (existing) {
    store.activeDocId = existing.id;
    setViewMode("notebook");
    renderNotebookUI();
    return;
  }
  if (content && importNotebookFromJson(content, name)) {
    return;
  }
  if (importTutorialNotebook(name)) {
    return;
  }
  setViewMode("notebook");
}

export function importSampleIntoNotebook(code: string, sampleKey: string): void {
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

registerUiHooks({
  setViewMode,
  openVfsNotebookFile,
  importSampleIntoNotebook,
  openTutorialModal,
  importTutorialNotebook,
  renderNotebookUI,
  getActiveWorkspacePath: () =>
    appState.VIEW_MODE === "notebook"
      ? getActiveNotebook().title
      : getActiveScriptTab().vfsPath,
});
