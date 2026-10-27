/* ================================================================
   Centralized DOM Element Registry & Console View Adapter (src/ui/dom.ts)
   ================================================================ */
import { registerUiHooks, uiHooks } from '../state';
import type { ConsoleLogEntry, StepVizElement } from '../types';

export const $ = <T extends HTMLElement = HTMLElement>(id: string): T =>
  document.getElementById<T>(id);

export function isDomElement(val: unknown): val is HTMLElement {
  if (!val || typeof val !== 'object') return false;
  if (typeof HTMLElement !== 'undefined' && val instanceof HTMLElement) return true;
  return 'classList' in val || 'dataset' in val || 'tagName' in val || 'closest' in val || 'getAttribute' in val;
}

export function isDomNode(val: unknown): val is Node {
  if (!val || typeof val !== 'object') return false;
  if (typeof Node !== 'undefined' && val instanceof Node) return true;
  return isDomElement(val) || 'nodeType' in val;
}

export function isTextAreaElement(val: unknown): val is HTMLTextAreaElement {
  if (!isDomElement(val)) return false;
  if (typeof HTMLTextAreaElement !== 'undefined' && val instanceof HTMLTextAreaElement) return true;
  return 'value' in val;
}

export function eventTargetElement(e: { target?: unknown } | Event | null | undefined): HTMLElement | null {
  const t = e ? e.target : null;
  return isDomElement(t) ? t : null;
}

export function eventTargetNode(e: { target?: unknown } | Event | null | undefined): Node | null {
  const t = e ? e.target : null;
  return isDomNode(t) ? t : null;
}

export function eventTargetTextArea(e: { target?: unknown } | Event | null | undefined): HTMLTextAreaElement | null {
  const t = e ? e.target : null;
  return isTextAreaElement(t) ? t : null;
}

export function closestElement(
  source: { target?: unknown } | Event | Element | HTMLElement | null | undefined,
  selector: string
): HTMLElement | null {
  const el = isDomElement(source)
    ? source
    : source && typeof source === 'object' && 'target' in source && isDomElement(source.target)
    ? source.target
    : null;
  if (!el || typeof el.closest !== 'function') return null;
  const matched = el.closest(selector);
  return isDomElement(matched) ? matched : null;
}

export function queryTextArea(
  root: ParentNode | null | undefined,
  selector: string
): HTMLTextAreaElement | null {
  if (!root || typeof root.querySelector !== 'function') return null;
  const found = root.querySelector(selector);
  return isTextAreaElement(found) ? found : null;
}

export const editor = $<HTMLTextAreaElement>('editor');
export const logEl = $('log');
export const gutterEl = $('gutter');
export const highlightEl = $('highlight');
export const varsEl = $('vars');
export const pickEl = $('pick');
export const callStackBarEl = $('callStackBar');
export const callStackHintEl = $('callStackHint');
export const slotsEl = $('slots');
export const consoleEl = $('console');
export const cntEl = $('cnt');
export const ctlHint = $('ctlHint');
export const mainEl = $('main');
export const sidePanelEl = $('sidePanel');
export const resizerEl = $('resizer');
export const flyLayerEl = $('flyLayer');
export const hoverTipEl = $('hoverTip');
export const stepVizEl = $<StepVizElement>('stepViz');
export const fileNameEl = $<HTMLInputElement>('fileName');
export const fileInputEl = $<HTMLInputElement>('fileInput');
export const btnImportEl = $<HTMLButtonElement>('btnImport');
export const btnOpenTsTutorialsEl = $<HTMLButtonElement>('btnOpenTsTutorials');
export const tutorialModalEl = $('tutorialModal');
export const tutorialModalCloseEl = $<HTMLButtonElement>('tutorialModalClose');
export const tutorialModalListEl = $('tutorialModalList');
export const tutorialModalDetailEl = $('tutorialModalDetail');

export const dom = {
  $,
  editor,
  logEl,
  gutterEl,
  highlightEl,
  varsEl,
  pickEl,
  callStackBarEl,
  callStackHintEl,
  slotsEl,
  consoleEl,
  cntEl,
  ctlHint,
  mainEl,
  sidePanelEl,
  resizerEl,
  flyLayerEl,
  hoverTipEl,
  stepVizEl,
  fileNameEl,
  fileInputEl,
  btnImportEl,
  btnOpenTsTutorialsEl,
  tutorialModalEl,
  tutorialModalCloseEl,
  tutorialModalListEl,
  tutorialModalDetailEl,
};

export function renderConsoleLogEntry(entry: ConsoleLogEntry): void {
  if (!logEl || typeof document === 'undefined' || !document.createElement) return;
  const d = document.createElement('div');
  if (entry.cls) d.className = entry.cls;
  if (entry.line) {
    d.className = (entry.cls ? entry.cls + ' ' : '') + 'diag';
    if (d.setAttribute) {
      d.setAttribute('data-line', String(entry.line));
      d.setAttribute('title', '点击定位到第 ' + entry.line + ' 行');
    }
  }
  d.textContent = entry.msg;
  logEl.appendChild(d);
  logEl.scrollTop = logEl.scrollHeight;
}

export function clearConsoleDom(): void {
  if (!logEl) return;
  logEl.innerHTML = '';
}

export function getEditorSource(): string {
  return editor ? editor.value : '';
}

export function setEditorSource(src: string): void {
  if (editor) {
    editor.value = src;
  }
}

/* clicking a diagnostic in the log jumps to (and highlights) its line */
if (logEl && logEl.addEventListener) {
  logEl.addEventListener('click', (e: MouseEvent) => {
    const target = closestElement(e, '.diag');
    if (!target || !target.getAttribute) return;
    uiHooks.revealErrorLine(parseInt(target.getAttribute('data-line') || '0', 10), true);
  });
}

export function setCntStatus(text: string, cls = ''): void {
  if (cntEl) {
    cntEl.textContent = text;
    cntEl.className = cls;
  }
}

export function bindDomGlobals(target: object = globalThis): void {
  Object.assign(target, dom);
}

registerUiHooks({
  appendConsoleLog: renderConsoleLogEntry,
  clearConsoleDom,
  getEditorSource,
  setEditorSource,
  setCntStatus,
});

bindDomGlobals();
