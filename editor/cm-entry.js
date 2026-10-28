import { basicSetup } from 'codemirror';
import {
  EditorView, keymap, Decoration, ViewPlugin, placeholder,
} from '@codemirror/view';
import {
  EditorState, StateField, StateEffect, Compartment, Prec, CharCategory,
} from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
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
    '.cm-content': { padding: '12px 0 48px 0', caretColor: '#38bdf8', minHeight: '100%' },
    '.cm-line': { padding: '0 64px 0 16px' },
    '.cm-gutters': { backgroundColor: '#070b10', color: '#38414f', border: 'none', padding: '0 0 48px 0' },
    '.cm-lineNumbers .cm-gutterElement': { minWidth: '52px', padding: '0 10px 0 0', textAlign: 'right' },
    '.cm-activeLine': { backgroundColor: 'transparent' },
    '.cm-activeLineGutter': { backgroundColor: 'transparent', color: '#60a5fa' },
    '.cm-cursor': { borderLeftColor: '#38bdf8' },
    '.cm-selectionBackground': { backgroundColor: 'rgba(96,165,250,.28) !important' },
    '.cm-content ::selection, .cm-line ::selection, .cm-line::selection': { backgroundColor: 'transparent !important' },
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
      textUnderlineOffset: '4px',
      textDecorationSkipInk: 'none',
    },
    '.cm-wordMatch-main': {
      textDecoration: 'underline',
      textDecorationColor: '#7dd3fc',
      textDecorationThickness: '2px',
      textUnderlineOffset: '4px',
      textDecorationSkipInk: 'none',
    },
    '.cm-panels': { backgroundColor: '#0d1219', color: '#cbd5e1', borderTop: '1px solid #1d2532' },
    '.cm-panel.cm-search': { padding: '8px 10px', fontFamily: 'system-ui,"PingFang SC","Microsoft YaHei",sans-serif', fontSize: '12px' },
    '.cm-textfield': { backgroundColor: '#121a26', color: '#e2e8f0', border: '1px solid #2a3342', borderRadius: '4px', padding: '3px 6px' },
    '.cm-button': { backgroundColor: '#1a2230', color: '#cbd5e1', border: '1px solid #2a3342', borderRadius: '4px', padding: '3px 8px' },
    '.cm-tooltip': { backgroundColor: '#0d1219', color: '#cbd5e1', border: '1px solid #263041', borderRadius: '6px' },
    '.cm-tooltip.cm-tooltip-autocomplete > ul': {
      fontFamily: '"Cascadia Code","JetBrains Mono",Consolas,ui-monospace,monospace',
      fontSize: '12.5px',
      maxHeight: '240px',
    },
    '.cm-tooltip-autocomplete ul li[aria-selected]': {
      backgroundColor: 'rgba(56,189,248,.22)',
      color: '#f8fafc',
    },
    '.cm-completionLabel': { color: '#e2e8f0' },
    '.cm-completionDetail': { color: '#38bdf8', fontStyle: 'normal', marginLeft: '10px', opacity: '0.9' },
    '.cm-completionInfo': {
      backgroundColor: '#0b1017',
      color: '#94a3b8',
      border: '1px solid #1e293b',
      padding: '6px 10px',
      fontSize: '12px',
    },
    '.cm-lintRange-error, .cm-lintRange-warning, .cm-lintRange-info, .cm-lintRange-active': {
      backgroundImage: 'none !important',
    },
    '.cm-lintRange-error': {
      backgroundImage: 'none !important',
      textDecoration: 'underline wavy #f87171',
      textUnderlineOffset: '3px',
    },
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

  // ================================================================
  // Context-Aware TypeScript & Python IntelliSense Completion Engine
  // ================================================================
  const TS_PRIMITIVE_TYPES = [
    { label: 'number', type: 'type', detail: '原始数值类型', boost: 90 },
    { label: 'string', type: 'type', detail: '原始字符串类型', boost: 90 },
    { label: 'boolean', type: 'type', detail: '布尔类型 (true | false)', boost: 90 },
    { label: 'unknown', type: 'type', detail: '类型安全的顶层未知类型', boost: 86 },
    { label: 'never', type: 'type', detail: '永不存在的值类型 / 穷尽检查', boost: 86 },
    { label: 'void', type: 'type', detail: '无返回值类型', boost: 86 },
    { label: 'any', type: 'type', detail: '任意动态类型', boost: 84 },
    { label: 'null', type: 'type', detail: '空值类型', boost: 84 },
    { label: 'undefined', type: 'type', detail: '未定义类型', boost: 84 },
    { label: 'symbol', type: 'type', detail: '符号类型', boost: 82 },
    { label: 'unique symbol', type: 'type', detail: '唯一符号名义类型', boost: 80 },
    { label: 'bigint', type: 'type', detail: '大整数类型', boost: 80 },
    { label: 'object', type: 'type', detail: '非原始对象类型', boost: 82 },
    { label: 'readonly', type: 'keyword', detail: '只读类型修饰符', boost: 82 },
    { label: 'keyof', type: 'keyword', detail: '索引键查询操作符 keyof T', boost: 85 },
    { label: 'typeof', type: 'keyword', detail: '类型查询操作符 typeof val', boost: 85 },
    { label: 'infer', type: 'keyword', detail: '条件类型推导关键字 infer U', boost: 85 },
    { label: 'asserts', type: 'keyword', detail: '断言函数返回修饰 asserts x is T', boost: 82 },
    { label: 'const', type: 'keyword', detail: '字面量常量断言 as const', boost: 82 },
  ];

  const TS_UTILITY_TYPES = [
    { label: 'Partial', type: 'type', detail: 'Partial<T> · 将所有属性设为可选', boost: 88 },
    { label: 'Required', type: 'type', detail: 'Required<T> · 将所有属性设为必选', boost: 88 },
    { label: 'Readonly', type: 'type', detail: 'Readonly<T> · 将所有属性设为只读', boost: 88 },
    { label: 'Pick', type: 'type', detail: 'Pick<T, K> · 挑选指定属性子集', boost: 88 },
    { label: 'Omit', type: 'type', detail: 'Omit<T, K> · 剔除指定属性', boost: 88 },
    { label: 'Record', type: 'type', detail: 'Record<K, V> · 键值对映射类型', boost: 88 },
    { label: 'Exclude', type: 'type', detail: 'Exclude<T, U> · 从联合类型排除子集', boost: 86 },
    { label: 'Extract', type: 'type', detail: 'Extract<T, U> · 从联合类型提取子集', boost: 86 },
    { label: 'NonNullable', type: 'type', detail: 'NonNullable<T> · 剔除 null 和 undefined', boost: 86 },
    { label: 'ReturnType', type: 'type', detail: 'ReturnType<F> · 获取函数返回值类型', boost: 86 },
    { label: 'Parameters', type: 'type', detail: 'Parameters<F> · 获取函数参数元组类型', boost: 86 },
    { label: 'ConstructorParameters', type: 'type', detail: 'ConstructorParameters<C> · 构造函数参数类型', boost: 82 },
    { label: 'InstanceType', type: 'type', detail: 'InstanceType<C> · 类实例类型', boost: 82 },
    { label: 'Awaited', type: 'type', detail: 'Awaited<T> · 递归解包 Promise 类型', boost: 86 },
    { label: 'Uppercase', type: 'type', detail: 'Uppercase<S> · 字符串字面量转大写', boost: 80 },
    { label: 'Lowercase', type: 'type', detail: 'Lowercase<S> · 字符串字面量转小写', boost: 80 },
    { label: 'Capitalize', type: 'type', detail: 'Capitalize<S> · 首字母大写字面量类型', boost: 80 },
    { label: 'Uncapitalize', type: 'type', detail: 'Uncapitalize<S> · 首字母小写字面量类型', boost: 80 },
    { label: 'Promise', type: 'class', detail: 'Promise<T> · 异步 Promise 容器', boost: 88 },
    { label: 'Array', type: 'class', detail: 'Array<T> · 泛型数组', boost: 86 },
    { label: 'ReadonlyArray', type: 'interface', detail: 'ReadonlyArray<T> · 只读数组', boost: 84 },
    { label: 'Map', type: 'class', detail: 'Map<K, V> · 哈希映射表', boost: 88 },
    { label: 'Set', type: 'class', detail: 'Set<T> · 哈希集合', boost: 88 },
    { label: 'Generator', type: 'interface', detail: 'Generator<Y, R, N> · 生成器返回类型', boost: 84 },
    { label: 'AsyncGenerator', type: 'interface', detail: 'AsyncGenerator<Y, R, N> · 异步生成器', boost: 82 },
    { label: 'IterableIterator', type: 'interface', detail: 'IterableIterator<T> · 可迭代迭代器', boost: 82 },
    { label: 'ListNode', type: 'class', detail: 'ListNode { val: number; next: ListNode | null }', boost: 85 },
    { label: 'TreeNode', type: 'class', detail: 'TreeNode { val: number; left; right }', boost: 85 },
  ];

  const TS_SYNTAX_KEYWORDS = [
    { label: 'interface', type: 'keyword', detail: '定义接口结构 interface Name { ... }', boost: 85 },
    { label: 'type', type: 'keyword', detail: '定义类型别名 type Name<T> = ...', boost: 85 },
    { label: 'enum', type: 'keyword', detail: '定义枚举 enum Name { ... }', boost: 84 },
    { label: 'const enum', type: 'keyword', detail: '定义常量枚举 const enum Name { ... }', boost: 82 },
    { label: 'abstract class', type: 'keyword', detail: '定义抽象类 abstract class Name { ... }', boost: 82 },
    { label: 'class', type: 'keyword', detail: '定义类 class Name implements I { ... }', boost: 85 },
    { label: 'implements', type: 'keyword', detail: '类实现接口契约 class C implements I', boost: 82 },
    { label: 'extends', type: 'keyword', detail: '继承类/接口或泛型约束 T extends U', boost: 82 },
    { label: 'public', type: 'keyword', detail: '公开成员/参数属性修饰符', boost: 80 },
    { label: 'private', type: 'keyword', detail: '私有成员/参数属性修饰符', boost: 80 },
    { label: 'protected', type: 'keyword', detail: '受保护成员/参数属性修饰符', boost: 80 },
    { label: 'readonly', type: 'keyword', detail: '只读属性/元组修饰符', boost: 82 },
    { label: 'override', type: 'keyword', detail: '显式覆写父类方法修饰符', boost: 80 },
    { label: 'static', type: 'keyword', detail: '静态类成员修饰符', boost: 80 },
    { label: 'abstract', type: 'keyword', detail: '抽象类或抽象方法修饰符', boost: 80 },
    { label: 'function', type: 'keyword', detail: '函数声明 function fn<T>(x: T): T', boost: 86 },
    { label: 'function*', type: 'keyword', detail: '生成器函数声明 function* gen()', boost: 80 },
    { label: 'async', type: 'keyword', detail: '异步函数修饰符 async function', boost: 84 },
    { label: 'await', type: 'keyword', detail: '等待 Promise 结果 await expr', boost: 84 },
    { label: 'yield', type: 'keyword', detail: '生成器产出值 yield expr', boost: 80 },
    { label: 'declare', type: 'keyword', detail: '环境类型声明 declare const/function', boost: 78 },
    { label: 'namespace', type: 'keyword', detail: '命名空间声明 namespace N { ... }', boost: 78 },
    { label: 'satisfies', type: 'keyword', detail: '类型满足性校验 expr satisfies Type', boost: 84 },
    { label: 'as const', type: 'keyword', detail: '字面量只读断言 expr as const', boost: 84 },
    { label: 'keyof', type: 'keyword', detail: '获取对象键名联合类型 keyof T', boost: 82 },
    { label: 'typeof', type: 'keyword', detail: '获取值或类型守卫 typeof x', boost: 82 },
    { label: 'infer', type: 'keyword', detail: '条件类型内提取类型变量 infer U', boost: 80 },
    { label: 'asserts', type: 'keyword', detail: '断言函数返回类型 asserts x is T', boost: 78 },
    { label: 'checkpoint', type: 'function', detail: 'checkpoint(cond?: boolean, msg?: string): void · 条件检查点 (Ctrl+C)', boost: 92 },
    { label: '断点', type: 'function', detail: '断点(cond?: boolean, msg?: string): void · 条件检查点 (Ctrl+C)', boost: 88 },
    { label: 'sleep', type: 'function', detail: 'sleep(ms: number, val?: T): Promise<T>', boost: 86 },
    { label: 'queueMicrotask', type: 'function', detail: 'queueMicrotask(cb: () => void): void', boost: 82 },
    { label: 'setTimeout', type: 'function', detail: 'setTimeout(cb: () => void, ms: number): number', boost: 82 },
    { label: 'console', type: 'variable', detail: 'Console · 控制台输出 console.log(...)', boost: 86 },
  ];

  const BUILTIN_NAMESPACE_MEMBERS = {
    Math: [
      { label: 'max', type: 'method', detail: '(...values: number[]): number' },
      { label: 'min', type: 'method', detail: '(...values: number[]): number' },
      { label: 'floor', type: 'method', detail: '(x: number): number' },
      { label: 'ceil', type: 'method', detail: '(x: number): number' },
      { label: 'round', type: 'method', detail: '(x: number): number' },
      { label: 'abs', type: 'method', detail: '(x: number): number' },
      { label: 'sqrt', type: 'method', detail: '(x: number): number' },
      { label: 'pow', type: 'method', detail: '(x: number, y: number): number' },
      { label: 'trunc', type: 'method', detail: '(x: number): number' },
      { label: 'PI', type: 'property', detail: 'number (3.14159...)' },
    ],
    console: [
      { label: 'log', type: 'method', detail: '(...data: any[]): void' },
      { label: 'warn', type: 'method', detail: '(...data: any[]): void' },
      { label: 'error', type: 'method', detail: '(...data: any[]): void' },
    ],
    Promise: [
      { label: 'resolve', type: 'method', detail: '<T>(value?: T): Promise<Awaited<T>>' },
      { label: 'reject', type: 'method', detail: '<T = never>(reason?: any): Promise<T>' },
      { label: 'all', type: 'method', detail: '<T>(values: T[]): Promise<Awaited<T>[]>' },
      { label: 'race', type: 'method', detail: '<T>(values: T[]): Promise<Awaited<T>>' },
    ],
    Object: [
      { label: 'keys', type: 'method', detail: '(o: object): string[]' },
      { label: 'values', type: 'method', detail: '<T>(o: Record<string, T>): T[]' },
      { label: 'entries', type: 'method', detail: '<T>(o: Record<string, T>): [string, T][]' },
      { label: 'assign', type: 'method', detail: '<T, U>(target: T, source: U): T & U' },
      { label: 'fromEntries', type: 'method', detail: '<T>(entries: Iterable<[PropertyKey, T]>): Record<string, T>' },
    ],
    Array: [
      { label: 'isArray', type: 'method', detail: '(arg: any): arg is any[]' },
      { label: 'from', type: 'method', detail: '<T, U>(iterable: Iterable<T>, mapfn?: (v: T, k: number) => U): U[]' },
      { label: 'of', type: 'method', detail: '<T>(...items: T[]): T[]' },
    ],
    JSON: [
      { label: 'stringify', type: 'method', detail: '(value: any, replacer?: any, space?: number): string' },
      { label: 'parse', type: 'method', detail: '(text: string): any' },
    ],
    Number: [
      { label: 'isFinite', type: 'method', detail: '(n: unknown): boolean' },
      { label: 'isInteger', type: 'method', detail: '(n: unknown): boolean' },
      { label: 'isNaN', type: 'method', detail: '(n: unknown): boolean' },
      { label: 'parseInt', type: 'method', detail: '(s: string, radix?: number): number' },
      { label: 'MAX_SAFE_INTEGER', type: 'property', detail: 'number' },
      { label: 'MIN_SAFE_INTEGER', type: 'property', detail: 'number' },
    ],
  };

  const COMMON_INSTANCE_MEMBERS = [
    { label: 'length', type: 'property', detail: 'number · 数组或字符串长度', boost: 85 },
    { label: 'push', type: 'method', detail: '(...items: T[]): number · 尾部追加元素', boost: 85 },
    { label: 'pop', type: 'method', detail: '(): T | undefined · 弹出尾部元素', boost: 85 },
    { label: 'shift', type: 'method', detail: '(): T | undefined · 弹出头部元素', boost: 82 },
    { label: 'unshift', type: 'method', detail: '(...items: T[]): number · 头部插入元素', boost: 82 },
    { label: 'map', type: 'method', detail: '<U>(fn: (v: T, i: number) => U): U[]', boost: 85 },
    { label: 'filter', type: 'method', detail: '(fn: (v: T, i: number) => boolean): T[]', boost: 85 },
    { label: 'reduce', type: 'method', detail: '<U>(fn: (acc: U, v: T) => U, init: U): U', boost: 84 },
    { label: 'forEach', type: 'method', detail: '(fn: (v: T, i: number) => void): void', boost: 82 },
    { label: 'find', type: 'method', detail: '(fn: (v: T) => boolean): T | undefined', boost: 82 },
    { label: 'findIndex', type: 'method', detail: '(fn: (v: T) => boolean): number', boost: 80 },
    { label: 'some', type: 'method', detail: '(fn: (v: T) => boolean): boolean', boost: 80 },
    { label: 'every', type: 'method', detail: '(fn: (v: T) => boolean): boolean', boost: 80 },
    { label: 'includes', type: 'method', detail: '(searchElement: T): boolean', boost: 84 },
    { label: 'indexOf', type: 'method', detail: '(searchElement: T): number', boost: 80 },
    { label: 'slice', type: 'method', detail: '(start?: number, end?: number): T[] | string', boost: 84 },
    { label: 'splice', type: 'method', detail: '(start: number, deleteCount?: number, ...items: T[]): T[]', boost: 80 },
    { label: 'sort', type: 'method', detail: '(compareFn?: (a: T, b: T) => number): this', boost: 84 },
    { label: 'reverse', type: 'method', detail: '(): T[]', boost: 80 },
    { label: 'join', type: 'method', detail: '(separator?: string): string', boost: 82 },
    { label: 'fill', type: 'method', detail: '(value: T, start?: number, end?: number): this', boost: 82 },
    { label: 'get', type: 'method', detail: '(key: K): V | undefined · Map 读取', boost: 84 },
    { label: 'set', type: 'method', detail: '(key: K, value: V): this · Map 写入', boost: 84 },
    { label: 'has', type: 'method', detail: '(key: K): boolean · Map/Set 包含检查', boost: 84 },
    { label: 'add', type: 'method', detail: '(value: T): this · Set 添加元素', boost: 82 },
    { label: 'delete', type: 'method', detail: '(key: K): boolean · Map/Set 删除元素', boost: 80 },
    { label: 'size', type: 'property', detail: 'number · Map/Set 元素数量', boost: 82 },
    { label: 'then', type: 'method', detail: '<U>(onfulfilled: (v: T) => U): Promise<U>', boost: 82 },
    { label: 'catch', type: 'method', detail: '(onrejected: (err: any) => any): Promise<T>', boost: 80 },
    { label: 'trim', type: 'method', detail: '(): string · 去除首尾空白', boost: 80 },
    { label: 'split', type: 'method', detail: '(separator: string | RegExp): string[]', boost: 82 },
    { label: 'startsWith', type: 'method', detail: '(prefix: string): boolean', boost: 80 },
    { label: 'endsWith', type: 'method', detail: '(suffix: string): boolean', boost: 80 },
    { label: 'val', type: 'property', detail: 'number · ListNode / TreeNode 节点值', boost: 80 },
    { label: 'next', type: 'property', detail: 'ListNode | null · 链表下一节点或生成器 next()', boost: 80 },
    { label: 'left', type: 'property', detail: 'TreeNode | null · 二叉树左子节点', boost: 80 },
    { label: 'right', type: 'property', detail: 'TreeNode | null · 二叉树右子节点', boost: 80 },
  ];

  function extractDocSymbols(docText) {
    const shapes = new Map(); // name -> { kind, parent, members: Map<name, { type, detail }> }
    const enums = new Map(); // enumName -> string[]
    const functions = new Map(); // fnName -> detail
    const variables = new Map(); // varName -> typeName
    const typeAliases = new Map(); // aliasName -> rhs

    const lines = String(docText || '').split('\n');
    let curShape = null;
    let curDepth = 0;

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i].replace(/\/\/.*$/, '').trim();
      if (!raw) continue;

      if (curShape) {
        for (let k = 0; k < raw.length; k++) {
          if (raw[k] === '{') curDepth++;
          else if (raw[k] === '}') curDepth--;
        }
        if (curDepth >= 1) {
          const cleanMem = raw.replace(/^(?:(?:public|private|protected|readonly|static|override|abstract)\s+)+/, '');
          const getSetM = cleanMem.match(/^(?:get|set)\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)(?:\s*:\s*([^{;]+))?/);
          const methodM = !getSetM ? cleanMem.match(/^([A-Za-z_$][\w$]*)\s*(?:<[^>]*>)?\s*\(([^)]*)\)(?:\s*:\s*([^{;]+))?/) : null;
          const propM = (!getSetM && !methodM) ? cleanMem.match(/^([A-Za-z_$][\w$]*)(\?)?\s*:\s*([^=;]+)/) : null;
          if (getSetM && getSetM[1]) {
            curShape.members.set(getSetM[1], { type: 'property', detail: (getSetM[3] || 'any').trim() });
          } else if (methodM && methodM[1] && methodM[1] !== 'constructor') {
            curShape.members.set(methodM[1], {
              type: 'method',
              detail: `(${(methodM[2] || '').trim()}): ${(methodM[3] || 'any').trim()}`,
            });
          } else if (propM && propM[1]) {
            curShape.members.set(propM[1], {
              type: 'property',
              detail: `${propM[2] ? '(optional) ' : ''}${propM[3].trim()}`,
            });
          }
          const ctorM = cleanMem.match(/^constructor\s*\(([^)]*)\)/);
          if (ctorM && ctorM[1]) {
            ctorM[1].split(',').forEach((p) => {
              const pm = p.trim().match(/^(?:(?:public|private|protected|readonly|override)\s+)+([A-Za-z_$][\w$]*)(\?)?(?:\s*:\s*([^=]+))?/);
              if (pm && pm[1]) {
                curShape.members.set(pm[1], { type: 'property', detail: (pm[3] || 'any').trim() });
              }
            });
          }
        }
        if (curDepth <= 0) {
          curShape = null;
          curDepth = 0;
        }
        continue;
      }

      const ifaceOrCls = raw.match(/^(?:export\s+)?(?:declare\s+)?(?:abstract\s+)?(interface|class)\s+([A-Za-z_$][\w$]*)(?:<[^>]*>)?(?:\s+extends\s+([A-Za-z_$][\w$]*))?/);
      if (ifaceOrCls && ifaceOrCls[2]) {
        const kind = ifaceOrCls[1];
        const name = ifaceOrCls[2];
        const parent = ifaceOrCls[3] || null;
        const entry = { kind, parent, members: new Map() };
        shapes.set(name, entry);
        let d = 0;
        for (let k = 0; k < raw.length; k++) {
          if (raw[k] === '{') d++;
          else if (raw[k] === '}') d--;
        }
        if (d > 0) {
          curShape = entry;
          curDepth = d;
        } else if (raw.includes('{') && raw.includes('}')) {
          const inner = raw.slice(raw.indexOf('{') + 1, raw.lastIndexOf('}'));
          inner.split(/[;,]/).forEach((part) => {
            const pm = part.trim().replace(/^readonly\s+/, '').match(/^([A-Za-z_$][\w$]*)(\?)?\s*:\s*(.+)$/);
            if (pm && pm[1]) entry.members.set(pm[1], { type: 'property', detail: pm[3].trim() });
          });
        }
        continue;
      }

      const enumM = raw.match(/^(?:export\s+)?(?:const\s+)?enum\s+([A-Za-z_$][\w$]*)\s*\{([^}]*)\}?/);
      if (enumM && enumM[1]) {
        const eName = enumM[1];
        const body = enumM[2] || '';
        const mems = [];
        body.split(',').forEach((part) => {
          const em = part.trim().match(/^([A-Za-z_$][\w$]*)/);
          if (em && em[1]) mems.push(em[1]);
        });
        enums.set(eName, mems);
        continue;
      }

      const typeM = raw.match(/^(?:export\s+)?type\s+([A-Za-z_$][\w$]*)(?:<[^>]*>)?\s*=\s*(.+)$/);
      if (typeM && typeM[1] && typeM[2]) {
        typeAliases.set(typeM[1], typeM[2].replace(/;\s*$/, '').trim());
        continue;
      }

      const fnM = raw.match(/^(?:export\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)\s*(?:<[^>]*>)?\s*\(([^)]*)\)(?:\s*:\s*([^{;]+))?/);
      if (fnM && fnM[1]) {
        functions.set(fnM[1], `(${(fnM[2] || '').trim()}): ${(fnM[3] || 'any').trim()}`);
        fnM[2].split(',').forEach((param) => {
          const pm = param.trim().match(/^([A-Za-z_$][\w$]*)\??\s*:\s*(.+)$/);
          if (pm && pm[1] && pm[2]) variables.set(pm[1], pm[2].trim());
        });
        continue;
      }

      const varM = raw.match(/^(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)(?:\s*:\s*([^=]+))?(?:\s*=\s*(.+))?$/);
      if (varM && varM[1]) {
        const vName = varM[1];
        let vType = varM[2] ? varM[2].trim() : '';
        const init = varM[3] ? varM[3].replace(/;\s*$/, '').trim() : '';
        if (!vType && init) {
          const newM = init.match(/^new\s+([A-Za-z_$][\w$]*)/);
          if (newM && newM[1]) vType = newM[1];
          else if (init.startsWith('[')) vType = 'Array';
          else if (/^["'`]/.test(init)) vType = 'string';
          else if (/^-?\d/.test(init)) vType = 'number';
        }
        variables.set(vName, vType || 'any');
      }
    }

    return { shapes, enums, functions, variables, typeAliases };
  }

  function computeCompletionsForDoc(docText, pos, explicit) {
    const lineStart = docText.lastIndexOf('\n', Math.max(0, pos - 1)) + 1;
    const linePrefix = docText.slice(lineStart, pos);

    const syms = extractDocSymbols(docText);

    // 1. Member access completion after `.` or `?.` (e.g., `user.`, `Dir.`, `Math.`, `this.`)
    const dotM = linePrefix.match(/([A-Za-z_$][\w$]*)\s*(?:\?\.)?\.\s*([A-Za-z_$][\w$]*)?$/);
    if (dotM && dotM[1]) {
      const receiver = dotM[1];
      const partial = dotM[2] || '';
      const from = pos - partial.length;
      const opts = [];
      const seen = new Set();
      const pushOpt = (opt) => {
        if (!seen.has(opt.label)) {
          seen.add(opt.label);
          opts.push(opt);
        }
      };

      if (syms.enums.has(receiver)) {
        (syms.enums.get(receiver) || []).forEach((mem) => {
          pushOpt({ label: mem, type: 'enum', detail: `${receiver}.${mem}`, boost: 99 });
        });
        return { from, options: opts };
      }

      if (BUILTIN_NAMESPACE_MEMBERS[receiver]) {
        BUILTIN_NAMESPACE_MEMBERS[receiver].forEach((m) => pushOpt({ ...m, boost: 98 }));
        return { from, options: opts };
      }

      const rawVarType = receiver === 'this'
        ? (Array.from(syms.shapes.keys()).pop() || '')
        : (syms.variables.get(receiver) || '');
      const cleanType = rawVarType.replace(/<[^>]*>$/, '').split('|')[0].trim();

      let curShapeName = cleanType;
      let guard = 0;
      while (curShapeName && syms.shapes.has(curShapeName) && guard++ < 6) {
        const sh = syms.shapes.get(curShapeName);
        sh.members.forEach((info, mName) => {
          pushOpt({ label: mName, type: info.type, detail: info.detail, boost: 96 });
        });
        curShapeName = sh.parent;
      }

      COMMON_INSTANCE_MEMBERS.forEach(pushOpt);
      return { from, options: opts };
    }

    // 2. Type-annotation position (after `:`, `<`, `extends`, `implements`, `as`, `satisfies`, or `type X =`)
    const inTypePos =
      /(?::\s*|[<,|&]\s*|\b(?:extends|implements|as|satisfies)\s+|type\s+[A-Za-z_$][\w$]*(?:<[^>]*>)?\s*=\s*)([A-Za-z_$][\w$]*)?$/.test(linePrefix) &&
      !/^\s*(?:case|default)\b/.test(linePrefix);

    const wordM = linePrefix.match(/[A-Za-z_$\u4e00-\u9fa5][\w$\u4e00-\u9fa5]*$/);
    if (!wordM && !explicit && !inTypePos) return null;
    const from = wordM ? pos - wordM[0].length : pos;
    if (!wordM && inTypePos && !explicit) return null;

    const options = [];
    const seen = new Set();
    const addOpt = (opt) => {
      if (!seen.has(opt.label)) {
        seen.add(opt.label);
        options.push(opt);
      }
    };

    if (inTypePos) {
      syms.shapes.forEach((info, name) => {
        addOpt({ label: name, type: info.kind, detail: `${info.kind} ${name}`, boost: 96 });
      });
      syms.typeAliases.forEach((rhs, name) => {
        addOpt({ label: name, type: 'type', detail: `type ${name} = ${rhs.slice(0, 36)}`, boost: 95 });
      });
      syms.enums.forEach((_, name) => {
        addOpt({ label: name, type: 'enum', detail: `enum ${name}`, boost: 94 });
      });
      TS_PRIMITIVE_TYPES.forEach(addOpt);
      TS_UTILITY_TYPES.forEach(addOpt);
      return { from, options };
    }

    // 3. General statement / expression position
    syms.functions.forEach((sig, name) => {
      addOpt({ label: name, type: 'function', detail: sig, boost: 95 });
    });
    syms.variables.forEach((vType, name) => {
      addOpt({ label: name, type: 'variable', detail: vType, boost: 94 });
    });
    syms.shapes.forEach((info, name) => {
      addOpt({ label: name, type: info.kind, detail: `${info.kind} ${name}`, boost: 92 });
    });
    syms.enums.forEach((_, name) => {
      addOpt({ label: name, type: 'enum', detail: `enum ${name}`, boost: 92 });
    });
    syms.typeAliases.forEach((rhs, name) => {
      addOpt({ label: name, type: 'type', detail: `type ${name}`, boost: 90 });
    });
    TS_SYNTAX_KEYWORDS.forEach(addOpt);
    TS_UTILITY_TYPES.forEach(addOpt);
    TS_PRIMITIVE_TYPES.forEach(addOpt);

    return { from, options };
  }

  function tsCompletionSource(context) {
    const docText = context.state.doc.toString();
    return computeCompletionsForDoc(docText, context.pos, context.explicit);
  }

  const languageExt = () => [javascript({ typescript: true }), EditorState.languageData.of(() => [{ autocomplete: tsCompletionSource }])];

  const placeholderFor = () => '// 写 TypeScript，可在任意位置调用 checkpoint() 设置检查点，最后一行直接写入口调用，例如 main()';

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
          {
            key: 'Ctrl-c',
            run: (v) => {
              if (!v.state.selection.main.empty) return false;
              const ln = v.state.doc.lineAt(v.state.selection.main.head).number;
              if (typeof window.addCheckpointFunction === 'function') {
                window.addCheckpointFunction(ln);
                return true;
              }
              return false;
            },
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

  function setLanguage() {
    currentLang = 'ts';
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

  document.body.classList.add('cm-on');
  window.__CM_CURSOR_LINE = currentLine();

  // Sync the initial state after the app has booted.
  if (typeof window.updateEditorChrome === 'function') window.updateEditorChrome();
}
