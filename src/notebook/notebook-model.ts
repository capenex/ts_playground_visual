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
export function createDefaultNotebooks(_lang: "ts" = "ts"): [NotebookDocument, ...NotebookDocument[]] {
  const c1Id = nextCellId();
  const c2Id = nextCellId();
  const c3Id = nextCellId();
  const c4Id = nextCellId();
  const c5Id = nextCellId();

  const introCells: NotebookCell[] = [
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
        "// 点击此单元格右上角 🐞 可基于上方已生成的 nums 单步调试二分查找\nlet l: number = 0, r: number = nums.length - 1;\nconst target: number = 13;\nwhile (l <= r) {\n  const mid: number = (l + r) >> 1;\n  checkpoint(nums[mid] === target, '找到目标值');\n  if (nums[mid] === target) {\n    console.log('找到目标索引:', mid);\n    break;\n  }\n  if (nums[mid] < target) l = mid + 1;\n  else r = mid - 1;\n}",
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
      source: "const x: number = 10;\nconst y: number = 20;\nx + y",
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
      lang: "ts",
      execCounter: 4,
      activeCellId: c2Id,
      debuggingCellId: null,
      cells: introCells,
      executedHistory: [
        { cellId: c2Id, execCount: 3, source: "let a: number = 1;" },
        { cellId: c3Id, execCount: 4, source: "console.log(a);" },
      ],
      lastGlobalVars: { a: 1 },
      lastGlobalDs: {},
    },
    {
      id: "nb_untitled",
      title: "Untitled.ipynb",
      lang: "ts",
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

export const notebooksByLang: Record<"ts", { docs: NotebookDocument[]; activeDocId: string }> = {
  ts: { docs: [], activeDocId: "nb_intro" },
};

export function ensureLangNotebooks(_lang: "ts" = "ts") {
  if (!notebooksByLang.ts.docs.length) {
    const docs = createDefaultNotebooks("ts");
    notebooksByLang.ts.docs = docs;
    notebooksByLang.ts.activeDocId = docs[0].id;
  }
  return notebooksByLang.ts;
}

export function getActiveNotebook(): NotebookDocument {
  const store = ensureLangNotebooks("ts");
  let doc = store.docs.find((d) => d.id === store.activeDocId) ?? store.docs[0];
  if (!doc) {
    doc = createDefaultNotebooks("ts")[0];
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
        display_name: "TypeScript (Playground Visual)",
        language: "typescript",
        name: "ts",
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
  lang: "ts" = "ts"
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

/* ── Built-in TypeScript Advanced Interactive Notebook Tutorials ── */
export interface TsNotebookTutorialCellSeed {
  type: "markdown" | "code";
  source: string;
}

export interface TsNotebookTutorialItem {
  id: string;
  codeBadge: string;
  fileName: string;
  title: string;
  category: string;
  level: string;
  summary: string;
  highlights: string[];
  cells: TsNotebookTutorialCellSeed[];
}

export const TS_NOTEBOOK_TUTORIALS: TsNotebookTutorialItem[] = [
  {
    id: "ts-adv-01-interfaces-structural",
    codeBadge: "01",
    fileName: "01-Interfaces-Structural.ipynb",
    title: "01 · 接口契约与结构化类型系统 (interface / readonly)",
    category: "类型系统进阶",
    level: "进阶 · 核心必学",
    summary:
      "深入理解 TypeScript 的结构化子类型（Duck Typing）、interface 契约设计、readonly 只读不可变属性与可选字段 ? 的控制流安全收窄。",
    highlights: [
      "interface 结构化契约建模",
      "readonly 只读属性防篡改",
      "可选属性 ? 与默认值收窄",
      "跨单元格对象数组与健康筛查调试",
    ],
    cells: [
      {
        type: "markdown",
        source:
          "### 🎓 01 · 接口契约与结构化类型系统 (`interface` / `readonly`)\n" +
          "TypeScript 采用**结构化类型系统（Structural Subtyping）**：只要对象的属性形状满足 `interface` 声明的契约，即被判定为类型兼容。\n" +
          "- **`readonly` 只读修饰符**：在编译期锁定关键标识字段，防止业务代码意外覆写。\n" +
          "- **可选属性 `?`**：显式声明可能缺省的配置项，配合条件分支实现安全的类型收窄。",
      },
      {
        type: "code",
        source:
          "// 1. 定义微服务节点契约：包含 readonly 只读主键与可选 tag 标签\n" +
          "interface ServiceNode {\n" +
          "  readonly id: string;\n" +
          "  host: string;\n" +
          "  latencyMs: number;\n" +
          "  healthy: boolean;\n" +
          "  tag?: string;\n" +
          "}\n\n" +
          "const cluster: ServiceNode[] = [\n" +
          '  { id: "gw-01", host: "10.0.1.11", latencyMs: 18, healthy: true, tag: "edge" },\n' +
          '  { id: "db-01", host: "10.0.2.20", latencyMs: 145, healthy: true, tag: "primary" },\n' +
          '  { id: "cache-01", host: "10.0.3.15", latencyMs: 6, healthy: false }\n' +
          "];\n\n" +
          'console.log("已注册集群节点数:", cluster.length);',
      },
      {
        type: "code",
        source:
          "// 2. 跨单元格复用 ServiceNode 契约，编写带可选属性收窄的格式化函数\n" +
          "function formatNodeBadge(node: ServiceNode): string {\n" +
          '  const role: string = node.tag ? node.tag : "general";\n' +
          '  const state: string = node.healthy ? "UP" : "DOWN";\n' +
          '  return "[" + state + "] " + node.id + " (" + role + ") - " + node.latencyMs + "ms";\n' +
          "}\n\n" +
          "const badges: string[] = [];\n" +
          "for (let i: number = 0; i < cluster.length; i++) {\n" +
          "  badges.push(formatNodeBadge(cluster[i]));\n" +
          "}\n" +
          'console.log("集群状态快照:", badges.join(" | "));',
      },
      {
        type: "code",
        source:
          "// 3. 点击右上角 🐞 单步调试：筛选低延迟健康节点并观察右侧 WATCH 面板\n" +
          "const fastHosts: string[] = [];\n" +
          "let totalLatency: number = 0;\n\n" +
          "for (let i: number = 0; i < cluster.length; i++) {\n" +
          "  const item: ServiceNode = cluster[i];\n" +
          '  checkpoint(item.healthy && item.latencyMs < 100, "发现低延迟健康节点");\n' +
          "  if (item.healthy && item.latencyMs < 100) {\n" +
          "    fastHosts.push(item.host);\n" +
          "    totalLatency = totalLatency + item.latencyMs;\n" +
          "  }\n" +
          "}\n\n" +
          'console.log("优选低延迟节点:", fastHosts, "总延迟(ms):", totalLatency);',
      },
    ],
  },
  {
    id: "ts-adv-02-enums-unions-narrowing",
    codeBadge: "02",
    fileName: "02-Enums-Unions-Narrowing.ipynb",
    title: "02 · 枚举、联合类型与控制流收窄 (enum / Union)",
    category: "类型收窄与状态机",
    level: "进阶 · 状态建模",
    summary:
      "掌握 enum 编译期双向映射展开、type 联合类型别名（Union Types）与 typeof 控制流类型收窄，构建零魔术常量的有限状态机。",
    highlights: [
      "enum 双向映射与状态常量",
      "type 联合类型别名 (number | string)",
      "typeof 控制流窄化 (Narrowing)",
      "Map<string, number> 状态桶实时可视化",
    ],
    cells: [
      {
        type: "markdown",
        source:
          "### 🎓 02 · 枚举、联合类型与控制流收窄 (`enum` / `Union`)\n" +
          "在复杂状态机与多态输入处理中，避免硬编码魔术数字是高质量 TypeScript 工程的核心：\n" +
          "- **`enum` 枚举**：编译期提供具名类型约束，运行期自动展开为双向映射字典对象。\n" +
          "- **联合类型 (`number | string`)**：配合 `typeof` 条件守卫，让编译器在各分支内自动收窄具体类型。",
      },
      {
        type: "code",
        source:
          "// 1. 定义任务状态枚举与联合类型输入解析函数\n" +
          "enum JobStatus {\n" +
          "  Queued = 0,\n" +
          "  Running = 1,\n" +
          "  Completed = 2,\n" +
          "  Failed = 3\n" +
          "}\n\n" +
          "type MetricInput = number | string;\n\n" +
          "function normalizeWeight(raw: MetricInput): number {\n" +
          '  if (typeof raw === "number") {\n' +
          "    return raw;\n" +
          "  }\n" +
          "  return raw.length * 10;\n" +
          "}\n\n" +
          'const combinedWeight: number = normalizeWeight(60) + normalizeWeight("high");\n' +
          'console.log("收窄计算权重:", combinedWeight, "初始枚举值:", JobStatus.Queued);',
      },
      {
        type: "code",
        source:
          "// 2. 编写确定性状态转移函数 stepStatus\n" +
          "function stepStatus(cur: JobStatus, ok: boolean): JobStatus {\n" +
          "  if (cur === JobStatus.Queued) {\n" +
          "    return JobStatus.Running;\n" +
          "  }\n" +
          "  if (cur === JobStatus.Running) {\n" +
          "    return ok ? JobStatus.Completed : JobStatus.Failed;\n" +
          "  }\n" +
          "  return cur;\n" +
          "}\n\n" +
          "let stDemo: JobStatus = JobStatus.Queued;\n" +
          "stDemo = stepStatus(stDemo, true);\n" +
          "stDemo = stepStatus(stDemo, true);\n" +
          'console.log("状态流转终点:", stDemo, "名称:", JobStatus[stDemo]);',
      },
      {
        type: "code",
        source:
          "// 3. 点击右上角 🐞 单步调试：批量驱动状态机并在右侧 WATCH 观察 Map 哈希统计桶\n" +
          "const signals: boolean[] = [true, false, true, true, false];\n" +
          "const stats = new Map<string, number>();\n" +
          'stats.set("Completed", 0);\n' +
          'stats.set("Failed", 0);\n\n' +
          "for (let i: number = 0; i < signals.length; i++) {\n" +
          "  let st: JobStatus = JobStatus.Queued;\n" +
          "  st = stepStatus(st, true);\n" +
          "  st = stepStatus(st, signals[i]);\n" +
          '  const key: string = st === JobStatus.Completed ? "Completed" : "Failed";\n' +
          "  const prev: number = stats.get(key) || 0;\n" +
          "  stats.set(key, prev + 1);\n" +
          '  checkpoint(st === JobStatus.Failed, "检测到失败任务");\n' +
          "}\n\n" +
          'console.log("成功任务数:", stats.get("Completed"), "失败任务数:", stats.get("Failed"));',
      },
    ],
  },
  {
    id: "ts-adv-03-classes-oop-inheritance",
    codeBadge: "03",
    fileName: "03-Classes-OOP-Inheritance.ipynb",
    title: "03 · 面向对象进阶：访问控制、参数属性与继承 (class / extends)",
    category: "面向对象与内存模型",
    level: "进阶 · OOP 架构",
    summary:
      "掌握构造函数参数属性语法糖、public / protected / private / readonly 封装边界检查，以及 extends 派生类继承与 super() 协同。",
    highlights: [
      "constructor 参数属性语法糖",
      "private / protected / readonly 封装",
      "extends 继承链与 super() 调用",
      "堆内存实例卡片与引用实时追踪",
    ],
    cells: [
      {
        type: "markdown",
        source:
          "### 🎓 03 · 面向对象进阶：访问控制、参数属性与继承 (`class` / `extends`)\n" +
          "TypeScript 扩展了标准类的封装与多态能力：\n" +
          "- **访问修饰符**：`private`（仅本类可见）、`protected`（本类与子类可见）、`public`（公开）与 `readonly`（只读）。\n" +
          "- **参数属性**：在 `constructor(public readonly name: string, protected quota: number)` 中一键完成字段声明与赋值。",
      },
      {
        type: "code",
        source:
          "// 1. 定义带参数属性与访问修饰符的配额限流器基类 RateLimiter\n" +
          "class RateLimiter {\n" +
          "  private used: number = 0;\n\n" +
          "  constructor(public readonly service: string, protected quota: number) {}\n\n" +
          "  public acquire(cost: number): boolean {\n" +
          "    if (this.used + cost > this.quota) {\n" +
          "      return false;\n" +
          "    }\n" +
          "    this.used = this.used + cost;\n" +
          "    return true;\n" +
          "  }\n\n" +
          "  public remaining(): number {\n" +
          "    return this.quota - this.used;\n" +
          "  }\n" +
          "}\n\n" +
          'const baseLimiter = new RateLimiter("auth-svc", 10);\n' +
          'console.log("申请 4 单位配额:", baseLimiter.acquire(4), "剩余:", baseLimiter.remaining());',
      },
      {
        type: "code",
        source:
          "// 2. 通过 extends 继承 RateLimiter，扩展支持突发流量池的 BurstLimiter\n" +
          "class BurstLimiter extends RateLimiter {\n" +
          "  private burstUsed: number = 0;\n\n" +
          "  constructor(service: string, quota: number, public readonly burstMax: number) {\n" +
          "    super(service, quota);\n" +
          "  }\n\n" +
          "  public requestToken(cost: number): string {\n" +
          "    if (this.acquire(cost)) {\n" +
          '      return "NORMAL_OK";\n' +
          "    }\n" +
          "    if (this.burstUsed + cost <= this.burstMax) {\n" +
          "      this.burstUsed = this.burstUsed + cost;\n" +
          '      return "BURST_OK";\n' +
          "    }\n" +
          '    return "REJECTED";\n' +
          "  }\n" +
          "}\n\n" +
          'const gatewayLimiter = new BurstLimiter("edge-gateway", 10, 5);\n' +
          'console.log("网关限流器初始化完成:", gatewayLimiter.service, "突发上限:", gatewayLimiter.burstMax);',
      },
      {
        type: "code",
        source:
          "// 3. 点击右上角 🐞 单步调试：模拟流量洪峰并在右侧观察堆实例属性变化\n" +
          "const requests: number[] = [4, 5, 4, 3, 2];\n" +
          "const verdicts: string[] = [];\n\n" +
          "for (let i: number = 0; i < requests.length; i++) {\n" +
          "  const cost: number = requests[i];\n" +
          "  const res: string = gatewayLimiter.requestToken(cost);\n" +
          "  verdicts.push(res);\n" +
          '  checkpoint(res !== "NORMAL_OK", "触发突发池或限流");\n' +
          "}\n\n" +
          'console.log("流量裁决序列:", verdicts.join(" -> "));',
      },
    ],
  },
  {
    id: "ts-adv-04-generics-collections",
    codeBadge: "04",
    fileName: "04-Generics-Collections-Trees.ipynb",
    title: "04 · 泛型编程与强类型树/链表可视化 (<T> / Tree / List)",
    category: "泛型与数据结构",
    level: "高阶 · 算法工程",
    summary:
      "掌握泛型类 class ValueBox<T>、泛型函数与自引用树/链表结构定义，在右侧 WATCH 面板实时联动 SVG 二叉树与链表视图。",
    highlights: [
      "泛型容器类 class ValueBox<T>",
      "泛型函数 <T> 类型参数推导",
      "SVG 二叉树与链表自动识别渲染",
      "单步追踪树结构与栈轨迹",
    ],
    cells: [
      {
        type: "markdown",
        source:
          "### 🎓 04 · 泛型编程与强类型数据结构 (`<T>` / `Tree` / `LinkedList`)\n" +
          "泛型（Generics）将类型参数化，使容器与算法兼具复用性与严格类型校验：\n" +
          "- **泛型类与泛型函数**：通过 `<T>` 将元素类型绑定到实例与返回值。\n" +
          "- **树与链表自动可视化**：包含 `val` + `left` / `right` 的对象自动渲染为 **SVG 层次二叉树**；包含 `val` + `next` 的对象自动渲染为 **水平链表**。",
      },
      {
        type: "code",
        source:
          "// 1. 定义泛型历史记录容器类 ValueBox<T>\n" +
          "class ValueBox<T> {\n" +
          "  history: T[] = [];\n\n" +
          "  constructor(public current: T) {\n" +
          "    this.history.push(current);\n" +
          "  }\n\n" +
          "  update(nextVal: T): T {\n" +
          "    this.current = nextVal;\n" +
          "    this.history.push(nextVal);\n" +
          "    return this.current;\n" +
          "  }\n" +
          "}\n\n" +
          "const scoreBox = new ValueBox<number>(100);\n" +
          "scoreBox.update(180);\n" +
          "scoreBox.update(260);\n" +
          'console.log("当前泛型盒值:", scoreBox.current, "历史记录:", scoreBox.history);',
      },
      {
        type: "code",
        source:
          "// 2. 构建强类型二叉树 tree 与单链表 list（运行后右侧 WATCH 自动渲染图形）\n" +
          "const list = {\n" +
          "  val: 10,\n" +
          "  next: { val: 20, next: { val: 30, next: null } }\n" +
          "};\n\n" +
          "const tree = {\n" +
          "  val: 50,\n" +
          "  left: {\n" +
          "    val: 30,\n" +
          "    left: { val: 20, left: null, right: null },\n" +
          "    right: { val: 40, left: null, right: null }\n" +
          "  },\n" +
          "  right: {\n" +
          "    val: 70,\n" +
          "    left: { val: 60, left: null, right: null },\n" +
          "    right: { val: 85, left: null, right: null }\n" +
          "  }\n" +
          "};\n\n" +
          'console.log("树根:", tree.val, "链表头:", list.val);',
      },
      {
        type: "code",
        source:
          "// 3. 点击右上角 🐞 单步调试：结合栈与集合统计树特征值\n" +
          "const levelValues: number[] = [tree.val, tree.left.val, tree.right.val, tree.left.left.val, tree.right.right.val];\n" +
          "const visited = new Set<number>();\n" +
          "const stack: number[] = [];\n" +
          "let treeSum: number = 0;\n\n" +
          "for (let i: number = 0; i < levelValues.length; i++) {\n" +
          "  const v: number = levelValues[i];\n" +
          "  visited.add(v);\n" +
          "  stack.push(v);\n" +
          "  treeSum = treeSum + v;\n" +
          '  checkpoint(treeSum > 100, "节点累计和超百");\n' +
          "}\n\n" +
          'console.log("采样节点累计和:", treeSum, "去重集合大小:", visited.size);',
      },
    ],
  },
  {
    id: "ts-adv-05-async-event-loop",
    codeBadge: "05",
    fileName: "05-Async-Await-EventLoop.ipynb",
    title: "05 · 异步编程、Promise 与确定性事件循环 (async / await)",
    category: "异步并发与调度",
    level: "高阶 · 运行时机制",
    summary:
      "深入剖析 async / await 协程挂起恢复、Promise.then / queueMicrotask 微任务队列与 setTimeout 宏任务队列的确定性执行时序。",
    highlights: [
      "同步调用栈 vs 微任务 vs 宏任务",
      "async / await 协程挂起与恢复",
      "queueMicrotask 与 Promise.then 优先级",
      "确定性虚拟事件循环单步可视化",
    ],
    cells: [
      {
        type: "markdown",
        source:
          "### 🎓 05 · 异步编程与确定性事件循环 (`async / await` / `Microtask` / `Macrotask`)\n" +
          "本引擎内置了**确定性虚拟事件循环沙箱**，无需真实等待定时器即可精确重现标准并发调度规则：\n" +
          "1. **同步代码（Call Stack）** 最先执行完毕；\n" +
          "2. **微任务队列（Microtasks）**：如 `Promise.resolve().then(...)`、`queueMicrotask(...)`、`await` 后续代码，在当前宏任务末尾**一次性全部清空**；\n" +
          "3. **宏任务队列（Macrotasks）**：如 `setTimeout(fn, delay)`，按虚拟时间顺序依次触发。",
      },
      {
        type: "code",
        source:
          "// 1. 经典面试题实证：同步栈、微任务与宏任务的精确出队顺序\n" +
          "const orderLog: string[] = [];\n\n" +
          'orderLog.push("1:sync-start");\n\n' +
          "setTimeout(() => {\n" +
          '  orderLog.push("5:timeout-0ms");\n' +
          "}, 0);\n\n" +
          'Promise.resolve("p1").then((tag: string) => {\n' +
          '  orderLog.push("3:promise-then-" + tag);\n' +
          "});\n\n" +
          "queueMicrotask(() => {\n" +
          '  orderLog.push("4:queue-microtask");\n' +
          "});\n\n" +
          'orderLog.push("2:sync-end");\n' +
          'console.log("事件循环实测时序:", orderLog.join(" -> "));',
      },
      {
        type: "code",
        source:
          "// 2. 定义 async 异步函数，理解 await 前后的同步与微任务切分\n" +
          "const traceEvents: string[] = [];\n\n" +
          "async function loadRemoteConfig(envName: string): Promise<string> {\n" +
          '  traceEvents.push("2:enter-async-" + envName);\n' +
          '  const tag: string = await Promise.resolve("cfg-" + envName);\n' +
          '  traceEvents.push("4:after-await-" + tag);\n' +
          "  return tag;\n" +
          "}\n\n" +
          'traceEvents.push("1:before-call");\n' +
          'loadRemoteConfig("prod");\n' +
          'traceEvents.push("3:after-call-sync");\n' +
          'console.log("协程恢复轨迹:", traceEvents.join(" -> "));',
      },
      {
        type: "code",
        source:
          "// 3. 点击右上角 🐞 单步调试：观察右侧 Event Loop 面板中协程、微任务与定时器的流转\n" +
          "async function computeStage(uid: number): Promise<number> {\n" +
          "  const base: number = await Promise.resolve(uid * 100);\n" +
          "  return base + 25;\n" +
          "}\n\n" +
          "async function runAsyncPipeline(): Promise<string> {\n" +
          '  const timeline: string[] = ["1:pipeline-start"];\n\n' +
          "  setTimeout(() => {\n" +
          '    timeline.push("5:timer-10ms");\n' +
          "  }, 10);\n\n" +
          '  Promise.resolve("fast").then((x: string) => {\n' +
          '    timeline.push("3:micro-" + x);\n' +
          "  });\n\n" +
          '  timeline.push("2:before-await");\n' +
          "  const quota: number = await computeStage(2);\n" +
          '  timeline.push("4:after-await-" + quota);\n' +
          '  checkpoint(quota > 200, "异步流水线恢复");\n' +
          '  return timeline.join(" -> ");\n' +
          "}\n\n" +
          "runAsyncPipeline()",
      },
    ],
  },
  {
    id: "ts-adv-06-type-diagnostics-lab",
    codeBadge: "06",
    fileName: "06-Type-Diagnostics-DP-Lab.ipynb",
    title: "06 · 静态类型诊断与二维矩阵算法实战 (Type Checker & 2D DP)",
    category: "类型安全与算法可视化",
    level: "实战 · 综合演练",
    summary:
      "结合内置教育级静态类型检查器体验实时行尾错误徽章诊断，并用严格类型实现双指针滑动窗口与二维矩阵动态规划（2D Matrix 可视化）。",
    highlights: [
      "实时静态类型诊断徽章实验室",
      "一维数组双指针 [l..r] 自动悬挂",
      "二维矩阵 number[][] 网格动态渲染",
      "结合 checkpoint() 逐步推导 DP 转移方程",
    ],
    cells: [
      {
        type: "markdown",
        source:
          "### 🎓 06 · 静态类型诊断与二维矩阵算法实战 (`Type Checker` + `2D Matrix`)\n" +
          "本课程展示如何将 **编译期静态类型防御** 与 **运行期算法可视化调试** 结合：\n" +
          "- **实时类型诊断**：当代码出现类型不匹配时，编辑器行尾会立即提示红色 `✗ TS` 诊断徽章。\n" +
          "- **双指针与二维网格**：变量名 `l` / `r` 会自动悬挂在一维数组下方；`dp: number[][]` 会自动渲染为二维矩阵表格。",
      },
      {
        type: "code",
        source:
          "// 1. 静态类型防错实验室（可尝试取消倒数第二行注释，体验行尾实时红色 TS 诊断徽章）\n" +
          "interface RiskRule {\n" +
          "  readonly baseScore: number;\n" +
          "  multiplier: number;\n" +
          "}\n\n" +
          "function evaluateRisk(rule: RiskRule, factor: number): number {\n" +
          "  return rule.baseScore + rule.multiplier * factor;\n" +
          "}\n\n" +
          "const prodRule: RiskRule = { baseScore: 50, multiplier: 9 };\n" +
          "const safeScore: number = evaluateRisk(prodRule, 4);\n" +
          '// 试一试：取消下一行注释将触发静态类型错误（string 不能赋给 number）\n' +
          '// const brokenScore: number = "type_mismatch";\n' +
          'console.log("风控评估合规得分:", safeScore);',
      },
      {
        type: "code",
        source:
          "// 2. 点击右上角 🐞 单步调试：观察一维数组下方自动悬挂的 [l, r] 双指针标签\n" +
          "const nums: number[] = [4, 9, 2, 11, 6, 8, 5];\n" +
          "let l: number = 0;\n" +
          "let r: number = nums.length - 1;\n" +
          "let windowBest: number = 0;\n\n" +
          "while (l < r) {\n" +
          "  const pairVal: number = nums[l] + nums[r];\n" +
          "  if (pairVal > windowBest) {\n" +
          "    windowBest = pairVal;\n" +
          "  }\n" +
          '  checkpoint(pairVal >= 15, "双指针配对和达标");\n' +
          "  l = l + 1;\n" +
          "  r = r - 1;\n" +
          "}\n" +
          'console.log("双指针最大配对和:", windowBest);',
      },
      {
        type: "code",
        source:
          "// 3. 点击右上角 🐞 单步调试：在右侧 WATCH 面板观察二维矩阵 dp: number[][] 的逐格填充\n" +
          "const rows: number = 3;\n" +
          "const cols: number = 4;\n" +
          "const dp: number[][] = [\n" +
          "  [1, 1, 1, 1],\n" +
          "  [1, 0, 0, 0],\n" +
          "  [1, 0, 0, 0]\n" +
          "];\n\n" +
          "for (let i: number = 1; i < rows; i++) {\n" +
          "  for (let j: number = 1; j < cols; j++) {\n" +
          "    dp[i][j] = dp[i - 1][j] + dp[i][j - 1];\n" +
          '    checkpoint(dp[i][j] >= 6, "网格路径数过半");\n' +
          "  }\n" +
          "}\n\n" +
          'console.log("网格右下角不同路径总数:", dp[rows - 1][cols - 1]);',
      },
    ],
  },
];

export function createTutorialNotebookDocument(tutorialId: string): NotebookDocument | null {
  const item = TS_NOTEBOOK_TUTORIALS.find((t) => t.id === tutorialId || t.fileName === tutorialId);
  if (!item) return null;
  const cells: NotebookCell[] = item.cells.map((seed) => ({
    id: nextCellId(),
    type: seed.type,
    source: seed.source,
    executionCount: null,
    status: "idle",
    output: null,
    markdownRendered: seed.type === "markdown",
  }));
  const firstCodeCell = cells.find((c) => c.type === "code") ?? cells[0];
  return {
    id: nextDocId(),
    title: item.fileName,
    lang: "ts",
    execCounter: 0,
    activeCellId: firstCodeCell ? firstCodeCell.id : "",
    debuggingCellId: null,
    cells,
    executedHistory: [],
    lastGlobalVars: {},
    lastGlobalDs: {},
  };
}

export function serializeTutorialToIpynbJson(tutorialId: string): string | null {
  const doc = createTutorialNotebookDocument(tutorialId);
  if (!doc) return null;
  return serializeNotebookToIpynbJson(doc);
}

