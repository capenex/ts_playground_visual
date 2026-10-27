/* ================================================================
   Pure Notebook Document Model, .ipynb Serializer & Markdown Parser (src/notebook/notebook-model.ts)
   Zero DOM dependencies — manages NotebookDocument / NotebookCell state & transformations
   ================================================================ */
import { appState, esc } from "../state";
import type { NotebookCell, NotebookDocument } from "../types";

let nbClipboardCell: NotebookCell | null = null;
let nbCellSeq = 100;
let nbDocSeq = 10;

export function nextCellId(): string {
  return "cell_" + (++nbCellSeq) + "_" + Math.random().toString(36).slice(2, 6);
}

export function nextDocId(): string {
  return "nb_" + (++nbDocSeq);
}

export function getClipboardCell(): NotebookCell | null {
  return nbClipboardCell;
}

export function setClipboardCell(cell: NotebookCell | null): void {
  nbClipboardCell = cell;
}

/* ── Default Built-In Notebooks (Matches Reference Screenshot & Visual Demo) ── */
export function createDefaultNotebooks(lang: "ts" | "python"): [NotebookDocument, ...NotebookDocument[]] {
  const isPy = lang === "python";
  const c1Id = nextCellId();
  const c2Id = nextCellId();
  const c3Id = nextCellId();
  const c4Id = nextCellId();
  const c5Id = nextCellId();

  const introCells: NotebookCell[] = isPy
    ? [
        {
          id: c1Id,
          type: "markdown",
          source:
            "### 📓 交互式算法笔记本 (Python Kernel)\n支持**跨单元格共享变量上下文**、内联输出以及针对任意单元格的 **🐞 单步可视化调试**（右侧实时联动 `LOCALS` 与 `WATCH` 数据结构画布）。",
          executionCount: null,
          status: "idle",
          output: null,
          markdownRendered: true,
        },
        {
          id: c2Id,
          type: "code",
          source: "a = 1",
          executionCount: 3,
          status: "success",
          output: { logs: [], returnValue: null, error: null },
        },
        {
          id: c3Id,
          type: "code",
          source: "print(a)",
          executionCount: 4,
          status: "success",
          output: { logs: ["1"], returnValue: null, error: null },
        },
        {
          id: c4Id,
          type: "code",
          source:
            "# 跨单元格使用上方定义的变量 a，构建数组并在右侧 WATCH 面板观察\nnums = [a, a + 2, a + 4, 9, 13, 18]\nnums.append(25)\nprint(\"当前数组:\", nums)",
          executionCount: null,
          status: "idle",
          output: null,
        },
        {
          id: c5Id,
          type: "code",
          source:
            "# 点击此单元格右上角 🐞 可基于上方已生成的 nums 单步调试二分查找\nl, r = 0, len(nums) - 1\ntarget = 13\nwhile l <= r:\n    mid = (l + r) // 2\n    checkpoint(\"mid\", mid, nums[mid])\n    if nums[mid] == target:\n        print(\"找到目标索引:\", mid)\n        break\n    elif nums[mid] < target:\n        l = mid + 1\n    else:\n        r = mid - 1",
          executionCount: null,
          status: "idle",
          output: null,
        },
      ]
    : [
        {
          id: c1Id,
          type: "markdown",
          source:
            "### 📓 交互式算法笔记本 (TypeScript Kernel)\n支持**跨单元格共享变量上下文**、内联输出以及针对任意单元格的 **🐞 单步可视化调试**（右侧实时联动 `LOCALS` 与 `WATCH` 数据结构画布）。",
          executionCount: null,
          status: "idle",
          output: null,
          markdownRendered: true,
        },
        {
          id: c2Id,
          type: "code",
          source: "let a: number = 1;",
          executionCount: 3,
          status: "success",
          output: { logs: [], returnValue: null, error: null },
        },
        {
          id: c3Id,
          type: "code",
          source: "console.log(a);",
          executionCount: 4,
          status: "success",
          output: { logs: ["1"], returnValue: null, error: null },
        },
        {
          id: c4Id,
          type: "code",
          source:
            "// 跨单元格使用上方定义的变量 a，构建数组并在右侧 WATCH 面板观察\nconst nums: number[] = [a, a + 2, a + 4, 9, 13, 18];\nnums.push(25);\nconsole.log('当前数组:', nums);",
          executionCount: null,
          status: "idle",
          output: null,
        },
        {
          id: c5Id,
          type: "code",
          source:
            "// 点击此单元格右上角 🐞 可基于上方已生成的 nums 单步调试二分查找\nlet l: number = 0, r: number = nums.length - 1;\nconst target: number = 13;\nwhile (l <= r) {\n  const mid: number = (l + r) >> 1;\n  checkpoint(l, mid, r);\n  if (nums[mid] === target) {\n    console.log('找到目标索引:', mid);\n    break;\n  }\n  if (nums[mid] < target) l = mid + 1;\n  else r = mid - 1;\n}",
          executionCount: null,
          status: "idle",
          output: null,
        },
      ];

  const u1Id = nextCellId();
  const u2Id = nextCellId();
  const untitledCells: NotebookCell[] = [
    {
      id: u1Id,
      type: "code",
      source: isPy ? "x = 10\ny = 20\nx + y" : "const x: number = 10;\nconst y: number = 20;\nx + y",
      executionCount: null,
      status: "idle",
      output: null,
    },
    {
      id: u2Id,
      type: "code",
      source: "",
      executionCount: null,
      status: "idle",
      output: null,
    },
  ];

  return [
    {
      id: "nb_intro",
      title: "Intro.ipynb",
      lang,
      execCounter: 4,
      activeCellId: c2Id,
      debuggingCellId: null,
      cells: introCells,
      executedHistory: isPy
        ? [
            { cellId: c2Id, execCount: 3, source: "a = 1" },
            { cellId: c3Id, execCount: 4, source: "print(a)" },
          ]
        : [
            { cellId: c2Id, execCount: 3, source: "let a: number = 1;" },
            { cellId: c3Id, execCount: 4, source: "console.log(a);" },
          ],
      lastGlobalVars: { a: 1 },
      lastGlobalDs: {},
    },
    {
      id: "nb_untitled",
      title: "Untitled.ipynb",
      lang,
      execCounter: 0,
      activeCellId: u1Id,
      debuggingCellId: null,
      cells: untitledCells,
      executedHistory: [],
      lastGlobalVars: {},
      lastGlobalDs: {},
    },
  ];
}

export const notebooksByLang: Record<"ts" | "python", { docs: NotebookDocument[]; activeDocId: string }> = {
  ts: { docs: [], activeDocId: "nb_intro" },
  python: { docs: [], activeDocId: "nb_intro" },
};

export function ensureLangNotebooks(lang: "ts" | "python") {
  const key = lang === "python" ? "python" : "ts";
  if (!notebooksByLang[key].docs.length) {
    const docs = createDefaultNotebooks(key);
    notebooksByLang[key].docs = docs;
    notebooksByLang[key].activeDocId = docs[0].id;
  }
  return notebooksByLang[key];
}

export function getActiveNotebook(): NotebookDocument {
  const lang = appState.LANG === "python" ? "python" : "ts";
  const store = ensureLangNotebooks(lang);
  let doc = store.docs.find((d) => d.id === store.activeDocId) ?? store.docs[0];
  if (!doc) {
    doc = createDefaultNotebooks(lang)[0];
    store.docs.push(doc);
  }
  store.activeDocId = doc.id;
  return doc;
}

export function getActiveCell(doc = getActiveNotebook()): NotebookCell | null {
  if (!doc || !doc.cells.length) return null;
  const cell = doc.cells.find((c) => c.id === doc.activeCellId) ?? doc.cells[0];
  if (!cell) return null;
  doc.activeCellId = cell.id;
  return cell;
}

/* ── Markdown Lightweight Renderer (Pure String Function) ── */
export function renderMarkdownHtml(md: string): string {
  const raw = String(md || "").trim();
  if (!raw) {
    return '<span class="nb-md-empty">双击此处输入 Markdown 笔记内容…</span>';
  }
  const lines = raw.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let inList = false;

  const formatInline = (text: string): string => {
    let s = esc(text);
    s = s.replace(/`([^`]+)`/g, '<code class="nb-md-code">$1</code>');
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    return s;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (/^\s*```/.test(line)) {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLines = [];
      } else {
        inCodeBlock = false;
        out.push('<pre class="nb-md-pre"><code>' + esc(codeLines.join("\n")) + "</code></pre>");
      }
      continue;
    }
    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }
    const hMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (hMatch && hMatch[1] && hMatch[2] !== undefined) {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      const lvl = hMatch[1].length;
      out.push(`<h${lvl} class="nb-md-h${lvl}">${formatInline(hMatch[2])}</h${lvl}>`);
      continue;
    }
    const liMatch = line.match(/^\s*[-*]\s+(.+)$/);
    if (liMatch && liMatch[1] !== undefined) {
      if (!inList) {
        out.push('<ul class="nb-md-ul">');
        inList = true;
      }
      out.push(`<li>${formatInline(liMatch[1])}</li>`);
      continue;
    }
    if (inList && !line.trim()) {
      out.push("</ul>");
      inList = false;
      continue;
    }
    if (!line.trim()) {
      continue;
    }
    out.push(`<p class="nb-md-p">${formatInline(line)}</p>`);
  }
  if (inList) out.push("</ul>");
  if (inCodeBlock) {
    out.push('<pre class="nb-md-pre"><code>' + esc(codeLines.join("\n")) + "</code></pre>");
  }
  return out.join("");
}

/* ── Pure Cell Model Mutations ── */
export function moveFocusToNextCell(doc: NotebookDocument, currentCellId: string, createIfLast = false): void {
  const idx = doc.cells.findIndex((c) => c.id === currentCellId);
  if (idx < 0) return;
  const nextCell = doc.cells[idx + 1];
  if (nextCell) {
    doc.activeCellId = nextCell.id;
    appState.ACTIVE_NB_CELL_ID = doc.activeCellId;
  } else if (createIfLast) {
    const newCell: NotebookCell = {
      id: nextCellId(),
      type: "code",
      source: "",
      executionCount: null,
      status: "idle",
      output: null,
    };
    doc.cells.push(newCell);
    doc.activeCellId = newCell.id;
    appState.ACTIVE_NB_CELL_ID = newCell.id;
  }
}

export function insertCellInModel(
  doc: NotebookDocument,
  pos: "above" | "below" = "below",
  refCellId?: string,
  type: "code" | "markdown" = "code"
): NotebookCell {
  const targetId = refCellId || doc.activeCellId;
  const idx = doc.cells.findIndex((c) => c.id === targetId);
  const newCell: NotebookCell = {
    id: nextCellId(),
    type,
    source: "",
    executionCount: null,
    status: "idle",
    output: null,
    markdownRendered: false,
  };
  if (idx < 0) {
    doc.cells.push(newCell);
  } else {
    const insertIdx = pos === "above" ? idx : idx + 1;
    doc.cells.splice(insertIdx, 0, newCell);
  }
  doc.activeCellId = newCell.id;
  appState.ACTIVE_NB_CELL_ID = newCell.id;
  return newCell;
}

export function duplicateCellInModel(doc: NotebookDocument, cellId?: string): NotebookCell | null {
  const targetId = cellId || doc.activeCellId;
  const idx = doc.cells.findIndex((c) => c.id === targetId);
  if (idx < 0) return null;
  const orig = doc.cells[idx];
  if (!orig) return null;
  const copy: NotebookCell = {
    id: nextCellId(),
    type: orig.type,
    source: orig.source,
    executionCount: null,
    status: "idle",
    output: null,
    markdownRendered: orig.markdownRendered,
  };
  doc.cells.splice(idx + 1, 0, copy);
  doc.activeCellId = copy.id;
  appState.ACTIVE_NB_CELL_ID = copy.id;
  return copy;
}

export function moveCellInModel(doc: NotebookDocument, dir: -1 | 1, cellId?: string): boolean {
  const targetId = cellId || doc.activeCellId;
  const idx = doc.cells.findIndex((c) => c.id === targetId);
  const nextIdx = idx + dir;
  if (idx < 0 || nextIdx < 0 || nextIdx >= doc.cells.length) return false;
  const [item] = doc.cells.splice(idx, 1);
  if (!item) return false;
  doc.cells.splice(nextIdx, 0, item);
  doc.activeCellId = item.id;
  appState.ACTIVE_NB_CELL_ID = item.id;
  return true;
}

export function deleteCellInModel(
  doc: NotebookDocument,
  cellId?: string
): { deleted: boolean; clearedDebugging: boolean } {
  const targetId = cellId || doc.activeCellId;
  if (doc.cells.length <= 1) {
    const first = doc.cells[0];
    if (first) {
      first.source = "";
      first.executionCount = null;
      first.status = "idle";
      first.output = null;
    }
    return { deleted: true, clearedDebugging: false };
  }
  const idx = doc.cells.findIndex((c) => c.id === targetId);
  if (idx < 0) return { deleted: false, clearedDebugging: false };
  let clearedDebugging = false;
  if (doc.debuggingCellId === targetId) {
    doc.debuggingCellId = null;
    clearedDebugging = true;
  }
  doc.cells.splice(idx, 1);
  const nextActive = doc.cells[Math.min(idx, doc.cells.length - 1)];
  if (nextActive) {
    doc.activeCellId = nextActive.id;
    appState.ACTIVE_NB_CELL_ID = nextActive.id;
  }
  return { deleted: true, clearedDebugging };
}

/* ── Pure .ipynb JSON Serialization & Parsing ── */
export function serializeNotebookToIpynbJson(doc: NotebookDocument): string {
  const ipynb = {
    nbformat: 4,
    nbformat_minor: 5,
    metadata: {
      kernelspec: {
        display_name: doc.lang === "python" ? "Python 3 (Pyodide)" : "TypeScript (Playground Visual)",
        language: doc.lang === "python" ? "python" : "typescript",
        name: doc.lang,
      },
    },
    cells: doc.cells.map((c) => ({
      id: c.id,
      cell_type: c.type === "markdown" ? "markdown" : "code",
      metadata: {},
      source: c.source.split("\n").map((line, i, arr) => (i < arr.length - 1 ? line + "\n" : line)),
      ...(c.type === "code"
        ? {
            execution_count: c.executionCount,
            outputs: c.output
              ? [
                  ...(c.output.logs.length
                    ? [{ output_type: "stream", name: "stdout", text: c.output.logs.map((l) => l + "\n") }]
                    : []),
                  ...(c.output.returnValue != null
                    ? [
                        {
                          output_type: "execute_result",
                          execution_count: c.executionCount,
                          data: { "text/plain": [c.output.returnValue] },
                          metadata: {},
                        },
                      ]
                    : []),
                ]
              : [],
          }
        : {}),
    })),
  };
  return JSON.stringify(ipynb, null, 2);
}

export function parseIpynbJsonToDocument(
  jsonText: string,
  fileName: string,
  lang: "ts" | "python"
): NotebookDocument | null {
  try {
    const data = JSON.parse(jsonText);
    if (!data || !Array.isArray(data.cells)) return null;
    const cells: NotebookCell[] = data.cells.map(
      (rawCell: { cell_type?: string; source?: string[] | string; execution_count?: number | null }) => {
        const type = rawCell.cell_type === "markdown" ? "markdown" : "code";
        const src = Array.isArray(rawCell.source) ? rawCell.source.join("") : String(rawCell.source || "");
        return {
          id: nextCellId(),
          type,
          source: src.replace(/\r\n?/g, "\n"),
          executionCount: typeof rawCell.execution_count === "number" ? rawCell.execution_count : null,
          status: "idle",
          output: null,
          markdownRendered: type === "markdown",
        };
      }
    );
    if (!cells.length) {
      cells.push({
        id: nextCellId(),
        type: "code",
        source: "",
        executionCount: null,
        status: "idle",
        output: null,
      });
    }
    return {
      id: nextDocId(),
      title: fileName.endsWith(".ipynb") ? fileName : fileName + ".ipynb",
      lang,
      execCounter: 0,
      activeCellId: cells[0]?.id || "",
      debuggingCellId: null,
      cells,
      executedHistory: [],
      lastGlobalVars: {},
      lastGlobalDs: {},
    };
  } catch (_) {
    return null;
  }
}

/* ── Estimate visual height for Markdown textarea including soft-wrapped lines ── */
export function estimateMarkdownEditorHeight(src: string): number {
  const lines = String(src || "").replace(/\r\n?/g, "\n").split("\n");
  let visualLines = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    let cols = 0;
    for (let k = 0; k < line.length; k++) {
      cols += line.charCodeAt(k) > 255 ? 2 : 1;
    }
    visualLines += Math.max(1, Math.ceil(cols / 62));
  }
  return Math.max(92, visualLines * 26 + 28);
}
