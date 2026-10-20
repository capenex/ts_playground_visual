import { basicSetup } from 'codemirror';
import {
  EditorView, keymap, Decoration, ViewPlugin, placeholder,
} from '@codemirror/view';
import {
  EditorState, StateField, StateEffect, Compartment, Prec, CharCategory,
} from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { HighlightStyle, syntaxHighlighting, indentUnit, syntaxTree } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { search, openSearchPanel, selectNextOccurrence, SearchCursor } from '@codemirror/search';
import { indentWithTab } from '@codemirror/commands';
import { linter, setDiagnostics } from '@codemirror/lint';

const container = document.getElementById('cmEditor');
const textarea = document.getElementById('editor');
if (!container || !textarea) {
  // Nothing to do on pages without the editor (or in a minimal harness).
} else {
  try {
    init();
  } catch (err) {
    window.__CM_INIT_ERROR = String((err && err.stack) || err);
    document.body.classList.remove('cm-on');
    try { console.error('[PlaygroundCM] init failed', err); } catch (_) {}
  }
}

function init() {
  // Hide the legacy textarea/highlight layer immediately; restore it if init fails.
  document.body.classList.add('cm-on');
  const languageCompartment = new Compartment();
  const indentCompartment = new Compartment();
  const placeholderCompartment = new Compartment();

  const setStepLine = StateEffect.define();
  const setDeclaredDeco = StateEffect.define();
  const setBuiltinDeco = StateEffect.define();

  const stepLineField = StateField.define({
    create: () => Decoration.none,
    update(deco, tr) {
      deco = deco.map(tr.changes);
      for (const effect of tr.effects) {
        if (!effect.is(setStepLine)) continue;
        if (!effect.value || effect.value < 1) return Decoration.none;
        const lineNo = Math.min(effect.value, tr.state.doc.lines);
        const line = tr.state.doc.line(lineNo);
        return Decoration.set([Decoration.line({ class: 'cm-step-line' }).range(line.from)]);
      }
      return deco;
    },
    provide: (field) => EditorView.decorations.from(field),
  });

  const nameDecoField = (effect) => StateField.define({
    create: () => Decoration.none,
    update(deco, tr) {
      deco = deco.map(tr.changes);
      for (const e of tr.effects) {
        if (e.is(effect)) return e.value;
      }
      return deco;
    },
    provide: (field) => EditorView.decorations.from(field),
  });

  const declaredField = nameDecoField(setDeclaredDeco);
  const builtinField = nameDecoField(setBuiltinDeco);

  const ckptMarkPlugin = ViewPlugin.fromClass(class {
    constructor(view) {
      this.view = view;
      this.mark = () => this.apply();
      this.apply();
      view.scrollDOM.addEventListener('scroll', this.mark);
    }
    update(update) {
      if (update.docChanged || update.viewportChanged) this.apply();
    }
    apply() {
      const view = this.view;
      const cells = view.dom.querySelectorAll('.cm-lineNumbers .cm-gutterElement');
      cells.forEach((el) => {
        const n = parseInt(el.textContent || '', 10);
        if (!Number.isFinite(n) || n < 1 || n > view.state.doc.lines) {
          el.classList.remove('has-ckpt');
          return;
        }
        const line = view.state.doc.line(n);
        el.classList.toggle('has-ckpt', /^\s*(?:checkpoint|断点)\s*\(/.test(line.text));
      });
    }
    destroy() {
      this.view.scrollDOM.removeEventListener('scroll', this.mark);
    }
  });

  const highlightStyle = HighlightStyle.define([
    { tag: tags.keyword, color: '#ff7b72' },
    { tag: [tags.controlKeyword, tags.moduleKeyword], color: '#c792ea' },
    { tag: [tags.typeName, tags.className], color: '#38bdf8' },
    { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: '#79c0ff' },
    { tag: [tags.propertyName], color: '#c4b5fd' },
    { tag: [tags.variableName], color: '#d8e2ef' },
    { tag: [tags.string, tags.special(tags.string)], color: '#9ece6a' },
    { tag: [tags.number, tags.bool, tags.null], color: '#ffb454' },
    { tag: [tags.comment], color: '#637488', fontStyle: 'italic' },
    { tag: [tags.operator], color: '#d8e2ef' },
    { tag: [tags.compareOperator, tags.logicOperator, tags.updateOperator], color: '#d8e2ef' },
    { tag: [tags.punctuation], color: '#d8e2ef' },
    { tag: [tags.self], color: '#9cdcfe' },
  ]);

  const theme = EditorView.theme({
    '&': { height: '100%', backgroundColor: 'transparent', color: '#d8e2ef', fontSize: '15px' },
    '.cm-scroller': {
      fontFamily: '"Cascadia Code","Cascadia Mono","JetBrains Mono","Fira Code",Consolas,"Courier New",ui-monospace,monospace',
      lineHeight: '24px',
      overflow: 'auto',
    },
    '.cm-content': { padding: '12px 64px 48px 16px', caretColor: '#38bdf8', minHeight: '100%' },
    '.cm-line': { padding: '0' },
    '.cm-gutters': { backgroundColor: '#070b10', color: '#38414f', border: 'none', padding: '0 0 48px 0' },
    '.cm-lineNumbers .cm-gutterElement': { minWidth: '52px', padding: '0 10px 0 0', textAlign: 'right' },
    '.cm-activeLine': { backgroundColor: 'transparent' },
    '.cm-activeLineGutter': { backgroundColor: 'transparent', color: '#60a5fa' },
    '.cm-cursor': { borderLeftColor: '#38bdf8' },
    '.cm-selectionBackground, .cm-content ::selection': { backgroundColor: 'rgba(96,165,250,.32) !important' },
    '.cm-matchingBracket': {
      backgroundColor: 'transparent',
      outline: 'none',
      borderRadius: '0',
      filter: 'drop-shadow(0 0 2px rgba(255,240,170,.95)) drop-shadow(0 0 5px rgba(255,216,77,.75)) drop-shadow(0 0 9px rgba(255,196,0,.4))',
    },
    '.cm-nonmatchingBracket': { backgroundColor: 'rgba(248,113,113,.14)', outline: 'none', borderRadius: '0' },
    '.cm-searchMatch': { backgroundColor: 'rgba(255,180,84,.22)', outline: '1px solid rgba(255,180,84,.5)' },
    '.cm-searchMatch.cm-searchMatch-selected': { backgroundColor: 'rgba(255,180,84,.38)' },
    '.cm-selectionMatch': { backgroundColor: 'transparent', textDecoration: 'none' },
    '.cm-selectionMatch-main': { backgroundColor: 'transparent', textDecoration: 'none' },
    '.cm-wordMatch': {
      textDecoration: 'underline',
      textDecorationColor: '#38bdf8',
      textDecorationThickness: '2px',
      textUnderlineOffset: '3px',
    },
    '.cm-wordMatch-main': {
      textDecoration: 'underline',
      textDecorationColor: '#7dd3fc',
      textDecorationThickness: '2px',
      textUnderlineOffset: '3px',
    },
    '.cm-panels': { backgroundColor: '#0d1219', color: '#cbd5e1', borderTop: '1px solid #1d2532' },
    '.cm-panel.cm-search': { padding: '8px 10px', fontFamily: 'system-ui,"PingFang SC","Microsoft YaHei",sans-serif', fontSize: '12px' },
    '.cm-textfield': { backgroundColor: '#121a26', color: '#e2e8f0', border: '1px solid #2a3342', borderRadius: '4px', padding: '3px 6px' },
    '.cm-button': { backgroundColor: '#1a2230', color: '#cbd5e1', border: '1px solid #2a3342', borderRadius: '4px', padding: '3px 8px' },
    '.cm-tooltip': { backgroundColor: '#0d1219', color: '#cbd5e1', border: '1px solid #263041' },
    '.cm-lintRange-error': { textDecoration: 'underline wavy #f87171', textUnderlineOffset: '3px' },
    '.cm-step-line': { backgroundColor: 'rgba(96,165,250,.15)', boxShadow: 'inset 3px 0 0 #60a5fa' },
    '.cm-declared': { color: '#9cdcfe' },
    '.cm-ckpt-dot': { width: '6px', height: '6px', borderRadius: '50%', background: '#38bdf8', margin: '9px auto 0' },
    '.cm-checkpoint-gutter': { width: '14px' },
  }, { dark: true });

  let cachedDiagnostics = [];
  const lintExtension = linter(() => cachedDiagnostics);

  const WORD_MATCH_MAX = 200;
  const NON_CODE_NODES = new Set([
    'String', 'Comment', 'LineComment', 'BlockComment', 'RegExp', 'Number',
  ]);
  const IGNORED_MATCH_WORDS = new Set([
    'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue',
    'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if', 'import', 'in',
    'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with',
    'yield', 'match', 'case',
    'function', 'const', 'let', 'var', 'do', 'switch', 'default', 'catch', 'throw', 'new', 'delete',
    'typeof', 'instanceof', 'void', 'of', 'extends', 'super', 'export', 'true', 'false', 'null',
    'undefined', 'interface', 'type', 'enum', 'implements', 'public', 'private', 'protected',
    'readonly', 'static', 'abstract', 'declare', 'namespace', 'module', 'satisfies', 'keyof', 'infer',
    'number', 'string', 'boolean', 'any', 'unknown', 'never', 'object', 'symbol', 'bigint',
  ]);
  const wordMatchMark = Decoration.mark({ class: 'cm-wordMatch' });
  const wordMatchMain = Decoration.mark({ class: 'cm-wordMatch-main' });

  function nonCodeRanges(state, ranges) {
    const tree = syntaxTree(state);
    const out = [];
    const formats = [];
    const interpolations = [];
    for (const part of ranges) {
      tree.iterate({
        from: part.from,
        to: part.to,
        enter(node) {
          if (node.name === 'FormatString' || node.name === 'TemplateString') {
            formats.push({ from: node.from, to: node.to });
          } else if (node.name === 'FormatReplacement' || node.name === 'Interpolation') {
            interpolations.push({ from: node.from, to: node.to });
          } else if (NON_CODE_NODES.has(node.name)) {
            out.push({ name: node.name, from: node.from, to: node.to });
            return false;
          }
        },
      });
    }
    interpolations.sort((a, b) => a.from - b.from);
    for (const format of formats) {
      let pos = format.from;
      for (const part of interpolations) {
        if (part.to <= format.from) continue;
        if (part.from >= format.to) break;
        if (part.from > pos) out.push({ from: pos, to: Math.min(part.from, format.to) });
        if (part.to > pos) pos = part.to;
      }
      if (pos < format.to) out.push({ from: pos, to: format.to });
    }
    return out;
  }

  function overlapsNonCode(nodes, from, to) {
    return nodes.some(n => from < n.to && to > n.from);
  }

  const wordMatchPlugin = ViewPlugin.fromClass(class {
    constructor(view) {
      this.decorations = this.getDeco(view);
    }
    update(update) {
      if (update.selectionSet || update.docChanged || update.viewportChanged ||
          syntaxTree(update.startState) !== syntaxTree(update.state)) {
        this.decorations = this.getDeco(update.view);
      }
    }
    getDeco(view) {
      const state = view.state;
      const sel = state.selection;
      if (sel.ranges.length > 1) return Decoration.none;
      const range = sel.main;
      let query;
      let mainFrom;
      let mainTo;
      if (range.empty) {
        const word = state.wordAt(range.head);
        if (!word) return Decoration.none;
        query = state.sliceDoc(word.from, word.to);
        mainFrom = word.from;
        mainTo = word.to;
      } else {
        if (range.to - range.from > 200) return Decoration.none;
        const word = state.wordAt(Math.max(range.from, range.to - 1));
        if (!word || word.from !== range.from || word.to !== range.to) return Decoration.none;
        query = state.sliceDoc(range.from, range.to);
        mainFrom = range.from;
        mainTo = range.to;
      }
      const trimmedQuery = query.trim();
      if (!trimmedQuery || IGNORED_MATCH_WORDS.has(trimmedQuery)) return Decoration.none;

      const nonCode = nonCodeRanges(state, view.visibleRanges);
      if (overlapsNonCode(nonCode, mainFrom, mainTo)) return Decoration.none;

      const cat = state.charCategorizer(range.head);
      const wholeWord = (from, to) =>
        (from === 0 || cat(state.sliceDoc(from - 1, from)) !== CharCategory.Word) &&
        (to === state.doc.length || cat(state.sliceDoc(to, to + 1)) !== CharCategory.Word);

      const deco = [];
      for (const part of view.visibleRanges) {
        const cursor = new SearchCursor(state.doc, query, part.from, part.to);
        while (!cursor.next().done) {
          const { from, to } = cursor.value;
          if (!wholeWord(from, to) || overlapsNonCode(nonCode, from, to)) continue;
          const mark = (from === mainFrom && to === mainTo) ? wordMatchMain : wordMatchMark;
          deco.push(mark.range(from, to));
          if (deco.length >= WORD_MATCH_MAX) return Decoration.set(deco);
        }
      }
      return Decoration.set(deco);
    }
  }, {
    decorations: v => v.decorations,
  });

  const languageExt = (lang) => lang === 'python'
    ? python()
    : javascript({ typescript: true });

  const placeholderFor = (lang) => lang === 'python'
    ? '# 写 Python，可在任意位置调用 checkpoint() 设置检查点，最后一行直接写入口调用，例如 main()'
    : '// 写 TypeScript，可在任意位置调用 checkpoint() 设置检查点，最后一行直接写入口调用，例如 main()';

  let currentLang = 'ts';
  let declaredSignature = '';
  let builtinSignature = '';
  let lastDecoText = null;
  let diagSignature = '';
  let stepLine = -1;
  let applyingValue = false;
  let inputPending = false;

  const view = new EditorView({
    state: EditorState.create({
      doc: textarea.value,
      extensions: [
        basicSetup,
        keymap.of([indentWithTab]),
        wordMatchPlugin,
        theme,
        syntaxHighlighting(highlightStyle),
        search({ top: true }),
        lintExtension,
        stepLineField,
        declaredField,
        builtinField,
        ckptMarkPlugin,
        languageCompartment.of(languageExt('ts')),
        indentCompartment.of(indentUnit.of('  ')),
        placeholderCompartment.of(placeholder(placeholderFor('ts'))),
        Prec.highest(keymap.of([
          {
            key: 'Mod-Enter',
            run: () => {
              if (typeof window.runOnce === 'function') window.runOnce();
              return true;
            },
          },
          {
            key: 'Mod-Shift-Enter',
            run: () => {
              if (typeof window.startDebug === 'function') window.startDebug(0);
              return true;
            },
          },
          {
            key: 'Mod-d',
            run: (v) => selectNextOccurrence(v),
          },
        ])),
        EditorState.allowMultipleSelections.of(true),
        EditorView.clickAddsSelectionRange.of((event) => event.altKey),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !applyingValue) {
            const next = update.state.doc.toString();
            if (next !== getNativeValue()) setNativeValue(next);
            if (!inputPending) {
              inputPending = true;
              setTimeout(() => {
                inputPending = false;
                try { textarea.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}
              }, 0);
            }
            if (typeof window.clearFlyLayer === 'function') window.clearFlyLayer();
          }
          if (update.selectionSet || update.docChanged) {
            const line = update.state.doc.lineAt(update.state.selection.main.head).number;
            window.__CM_CURSOR_LINE = line;
          }
          if (update.focusChanged) {
            if (update.view.hasFocus) {
              document.body.classList.add('editing-code');
              if (typeof window.clearFlyLayer === 'function') window.clearFlyLayer();
              if (typeof window.hideHoverTip === 'function') window.hideHoverTip();
            } else {
              document.body.classList.remove('editing-code');
            }
          }
        }),
      ],
    }),
    parent: container,
  });

  // The marker and gutter are initialized above; no extra marker instance is needed.

  function getNativeValue() {
    const desc = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
    return desc.get.call(textarea);
  }

  function setNativeValue(value) {
    const desc = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
    desc.set.call(textarea, value);
  }

  function setValue(value) {
    const text = String(value == null ? '' : value);
    if (view.state.doc.toString() === text) return;
    applyingValue = true;
    try {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } });
    } finally {
      applyingValue = false;
    }
  }

  // Keep textarea.value assignments (samples, import, checkpoint insertion) in sync.
  try {
    const desc = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
    Object.defineProperty(textarea, 'value', {
      configurable: true,
      enumerable: false,
      get() { return desc.get.call(this); },
      set(next) {
        desc.set.call(this, next);
        setValue(next);
      },
    });
  } catch (_) { /* fallback to boot-time sync */ }

  function setLanguage(lang) {
    const next = lang === 'python' ? 'python' : 'ts';
    if (currentLang === next) return;
    currentLang = next;
    view.dispatch({
      effects: [
        languageCompartment.reconfigure(languageExt(next)),
        indentCompartment.reconfigure(indentUnit.of(next === 'python' ? '    ' : '  ')),
        placeholderCompartment.reconfigure(placeholder(placeholderFor(next))),
      ],
    });
    declaredSignature = '';
    builtinSignature = '';
    diagSignature = '';
  }

  function buildNameDeco(names, className) {
    if (!names || !names.size) return Decoration.none;
    const ranges = [];
    const deco = Decoration.mark({ class: className });
    const nonCode = nonCodeRanges(view.state, [{ from: 0, to: view.state.doc.length }]);
    const re = /\b[A-Za-z_$][\w$]*\b/g;
    for (let n = 1; n <= view.state.doc.lines; n++) {
      const line = view.state.doc.line(n);
      let m;
      re.lastIndex = 0;
      while ((m = re.exec(line.text))) {
        if (!names.has(m[0])) continue;
        let before = m.index - 1;
        while (before >= 0 && /\s/.test(line.text[before])) before--;
        if (before >= 0 && line.text[before] === '.') continue;
        const from = line.from + m.index;
        const to = from + m[0].length;
        if (overlapsNonCode(nonCode, from, to)) continue;
        ranges.push(deco.range(from, to));
      }
    }
    return Decoration.set(ranges, true);
  }

  function buildDiagnostics(payload) {
    const doc = view.state.doc;
    const out = [];
    const clampLine = (n) => Math.max(1, Math.min(doc.lines, Number(n) || 1));
    (payload.liveErrors || []).forEach((d) => {
      const line = doc.line(clampLine(d.line));
      out.push({
        from: line.from,
        to: Math.max(line.from + 1, line.to),
        severity: 'error',
        message: (d.code ? d.code + ': ' : '') + (d.message || '类型错误'),
      });
    });
    const seen = new Set((payload.liveErrors || []).map((d) => Number(d.line) || 1));
    (payload.errorLines || []).forEach((n) => {
      if (seen.has(Number(n))) return;
      const line = doc.line(clampLine(n));
      out.push({ from: line.from, to: Math.max(line.from + 1, line.to), severity: 'error', message: '运行时错误' });
    });
    return out;
  }

  function syncFromApp(payload) {
    if (!payload) return;
    if (payload.text != null && payload.text !== view.state.doc.toString()) {
      setValue(payload.text);
    }
    if (payload.language) setLanguage(payload.language);
    const nextStep = Number(payload.curLine) || -1;
    if (nextStep !== stepLine) {
      stepLine = nextStep;
      view.dispatch({ effects: setStepLine.of(nextStep) });
    }
    const diags = buildDiagnostics(payload);
    const diagSig = diags.map((d) => d.from + ':' + d.to + ':' + d.message).join('|');
    if (diagSig !== diagSignature) {
      diagSignature = diagSig;
      cachedDiagnostics = diags;
      view.dispatch(setDiagnostics(view.state, diags));
    }
    const declared = payload.declared instanceof Set ? payload.declared : new Set(payload.declared || []);
    const builtins = payload.builtins instanceof Set ? payload.builtins : new Set(payload.builtins || []);
    const declSig = [...declared].sort().join(',');
    const builtinSig = [...builtins].sort().join(',');
    const textChanged = payload.text != null && payload.text !== lastDecoText;
    if (payload.text != null) lastDecoText = payload.text;
    if (declSig !== declaredSignature || textChanged) {
      declaredSignature = declSig;
      view.dispatch({ effects: setDeclaredDeco.of(buildNameDeco(declared, 'cm-declared')) });
    }
    if (builtinSig !== builtinSignature || textChanged) {
      builtinSignature = builtinSig;
      view.dispatch({ effects: setBuiltinDeco.of(buildNameDeco(builtins, 'cm-builtin')) });
    }
  }

  function lineTop(line) {
    const doc = view.state.doc;
    const n = Math.max(1, Math.min(doc.lines, Number(line) || 1));
    const info = doc.line(n);
    const coords = view.coordsAtPos(info.from);
    if (!coords) return 0;
    const rect = container.getBoundingClientRect();
    return coords.top - rect.top;
  }

  function contentLeft() {
    const gutters = view.dom.querySelector('.cm-gutters');
    const w = gutters ? gutters.getBoundingClientRect().width : 52;
    return Math.round(w + 16);
  }

  function scrollToLine(line) {
    const doc = view.state.doc;
    const n = Math.max(1, Math.min(doc.lines, Number(line) || 1));
    const info = doc.line(n);
    const block = view.lineBlockAt(info.from);
    const scroller = view.scrollDOM;
    const target = block.top - Math.max(0, (scroller.clientHeight - block.height) / 2);
    scroller.scrollTop = Math.max(0, target);
  }

  function revealLine(line, focus) {
    scrollToLine(line);
    if (!focus) return;
    const doc = view.state.doc;
    const n = Math.max(1, Math.min(doc.lines, Number(line) || 1));
    view.dispatch({ selection: { anchor: doc.line(n).from } });
    view.focus();
  }

  function currentLine() {
    return view.state.doc.lineAt(view.state.selection.main.head).number;
  }

  function hasFocus() {
    return view.hasFocus;
  }

  function blur() {
    try { view.contentDOM.blur(); } catch (_) {}
  }

  const api = {
    view,
    getValue: () => view.state.doc.toString(),
    getLanguage: () => currentLang,
    setValue,
    setLanguage,
    syncFromApp,
    focus: () => view.focus(),
    blur,
    hasFocus,
    contains: (node) => view.dom.contains(node),
    lineTop,
    contentLeft,
    viewportHeight: () => view.scrollDOM.clientHeight,
    scrollToLine,
    revealLine,
    currentLine,
    openSearch: () => openSearchPanel(view),
    selectNext: () => selectNextOccurrence(view),
  };
  window.PlaygroundCM = api;

  // Hover inspector: translate CodeMirror coordinates to source text.
  view.dom.addEventListener('mousemove', (event) => {
    let hasTrace = false;
    try { hasTrace = typeof TRACE !== 'undefined' && TRACE.steps && TRACE.steps.length > 0; } catch (_) {}
    if (!hasTrace || event.buttons) {
      if (typeof window.hideHoverTip === 'function') window.hideHoverTip();
      return;
    }
    const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
    if (pos == null) {
      if (typeof window.hideHoverTip === 'function') window.hideHoverTip();
      return;
    }
    const line = view.state.doc.lineAt(pos);
    const col = pos - line.from;
    const word = typeof window.hoverWordAt === 'function' ? window.hoverWordAt(line.text, col) : null;
    if (!word) {
      if (typeof window.hideHoverTip === 'function') window.hideHoverTip();
      return;
    }
    if (typeof window.hoverTipForName === 'function') window.hoverTipForName(word.word, event.clientX, event.clientY);
  });
  view.dom.addEventListener('mouseleave', () => {
    if (typeof window.hideHoverTip === 'function') window.hideHoverTip();
  });
  view.dom.addEventListener('mousedown', () => {
    if (typeof window.hideHoverTip === 'function') window.hideHoverTip();
  });

  view.scrollDOM.addEventListener('scroll', () => {
    if (typeof window.positionStepViz === 'function') window.positionStepViz();
    if (typeof window.hideHoverTip === 'function') window.hideHoverTip();
    if (typeof window.clearFlyLayer === 'function') window.clearFlyLayer();
  });

  view.dom.addEventListener('click', (event) => {
    const gutter = event.target && event.target.closest ? event.target.closest('.cm-lineNumbers .cm-gutterElement') : null;
    if (!gutter) return;
    const line = parseInt(gutter.textContent || '', 10);
    if (Number.isFinite(line) && typeof window.addCheckpointFunction === 'function') {
      event.preventDefault();
      event.stopPropagation();
      window.addCheckpointFunction(line);
    }
  });

  document.body.classList.add('cm-on');
  window.__CM_CURSOR_LINE = currentLine();

  // Sync the initial state after the app has booted.
  if (typeof window.updateEditorChrome === 'function') window.updateEditorChrome();
}
