/* Python mode for TypeScript Playground VISUAL.
   Loaded as a classic script after the main inline script, so it can use the
   page's classifier, visualizers and render functions directly. */
var PY_ENGINE = (function () {
  'use strict';

  const SCRIPT_URL = document.currentScript ? document.currentScript.src : location.href;
  const WORKER_URL = new URL('py_worker.js', SCRIPT_URL).href;
  const DEFAULT_RUNTIME = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';
  const TS_SAMPLE_OPTIONS_HTML = (() => {
    const el = document.getElementById('sampleSel');
    return el ? el.innerHTML : '';
  })();

  const PY_KEYWORDS = new Set([
    'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue',
    'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if', 'import', 'in',
    'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with',
    'yield', 'match', 'case',
  ]);
  const PY_BUILTINS = new Set([
    'print', 'len', 'range', 'enumerate', 'zip', 'sorted', 'list', 'dict', 'set', 'tuple', 'int',
    'float', 'str', 'bool', 'sum', 'min', 'max', 'abs', 'map', 'filter', 'any', 'all', 'isinstance',
    'type', 'super', 'object', 'Exception', 'ValueError', 'TypeError', 'KeyError', 'IndexError',
    'ZeroDivisionError', 'checkpoint', '断点', 'self', 'input', 'open', 'round', 'reversed', 'divmod',
    'pow', 'ord', 'chr', 'repr', 'hash', 'id', 'iter', 'next', 'vars', 'dir', 'getattr', 'setattr',
    'hasattr', 'property', 'staticmethod', 'classmethod', 'frozenset', 'bytes', 'bytearray', 'slice',
  ]);
  const PY_EXTRA_DECLARED = new Set(['this', 'self']);

  const PY_SAMPLES = {
    quickstart: `def bubble_sort(nums):
    a = nums[:]
    for i in range(len(a)):
        for j in range(len(a) - 1 - i):
            if a[j] > a[j + 1]:
                a[j], a[j + 1] = a[j + 1], a[j]
    return a

nums = [5, 2, 9, 1, 5, 6]
bubble_sort(nums)
`,
    binary_search: `def binary_search(nums, target):
    l, r = 0, len(nums) - 1
    while l <= r:
        mid = (l + r) // 2
        checkpoint("mid", mid, nums[mid])
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            l = mid + 1
        else:
            r = mid - 1
    return -1

binary_search([1, 3, 5, 7, 9, 11], 7)
`,
    bfs: `from collections import deque

def bfs(adj, start):
    queue = deque([start])
    seen = {start}
    order = []
    while queue:
        node = queue.popleft()
        order.append(node)
        for nxt in adj.get(node, []):
            if nxt not in seen:
                seen.add(nxt)
                queue.append(nxt)
    return order

adj = {
    0: [1, 2],
    1: [3],
    2: [3, 4],
    3: [5],
    4: [5],
    5: []
}
bfs(adj, 0)
`,
    lcs: `def lcs(a, b):
    n, m = len(a), len(b)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    return dp[n][m]

lcs("ABCBDAB", "BDCABA")
`,
    structures: `class TreeNode:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None

class ListNode:
    def __init__(self, val):
        self.val = val
        self.next = None

def tour():
    arr = [3, 1, 4, 1, 5, 9]
    stack = [1, 2, 3]
    queue = [4, 5, 6]
    heap = [1, 3, 6, 5, 9]
    parent = [0, 0, 1, 1]
    mapping = {"a": 1, "b": 2}
    seen = {1, 2, 3}
    grid = [[1, 2], [3, 4]]
    text = "hello"
    tree = TreeNode(2)
    tree.left = TreeNode(1)
    tree.right = TreeNode(3)
    head = ListNode(1)
    head.next = ListNode(2)
    graph = {
        "nodes": [{"id": 0, "label": "A"}, {"id": 1, "label": "B"}, {"id": 2, "label": "C"}],
        "edges": [[0, 1], [1, 2], [0, 2]]
    }
    return arr

tour()
`,
    classes: `class Counter:
    def __init__(self, start):
        self.total = start
        self.history = []

    def add(self, n):
        self.total += n
        self.history.append(n)
        return self.total

def run_counter(start, times):
    c = Counter(start)
    for i in range(times):
        c.add(i + 1)
    return c.total

run_counter(1, 3)
`,
  };

  const SAMPLES_LABELS = {
    quickstart: 'quickstart · 冒泡排序',
    binary_search: 'binary_search · 二分查找',
    bfs: 'bfs · BFS 队列',
    lcs: 'lcs · DP 网格',
    structures: 'structures · 结构集合',
    classes: 'classes · 类与实例',
  };

  let worker = null;
  let readyPromise = null;
  let pending = new Map();
  let nextId = 1;
  let diags = [];
  let metaDeclared = new Set();
  let busy = false;
  let activeSampleKey = 'quickstart';

  const DEFAULT_STEP_HINTS = {
    quickstart: st => Boolean(st.ds && st.ds.nums && st.ds.a),
    binary_search: st => Boolean(st.isCheckpoint),
    bfs: st => Boolean(st.ds && st.ds.queue && st.ds.seen),
    lcs: st => Boolean(st.ds && st.ds.dp),
    structures: st => Boolean(st.ds && Object.keys(st.ds).length >= 10),
    classes: st => Boolean(st.ds && st.ds.this),
  };

  function ensureWorker() {
    if (readyPromise) return readyPromise;
    readyPromise = new Promise((resolve, reject) => {
      try {
        worker = new Worker(WORKER_URL);
      } catch (err) {
        readyPromise = null;
        reject(window.__SANDBOX_MODE
          ? new Error('Python 模式在沙箱预览中不可用（Worker 受 iframe 沙箱限制）。请把代码复制到完整页面运行。')
          : err);
        return;
      }
      let initDone = false;
      const initTimer = setTimeout(() => {
        if (initDone) return;
        initDone = true;
        readyPromise = null;
        reject(new Error('Python 运行时加载超时（>180s）'));
      }, 180000);
      worker.onmessage = (event) => {
        const msg = event.data || {};
        if (msg.type === 'ready') {
          initDone = true;
          clearTimeout(initTimer);
          resolve();
          return;
        }
        if (msg.type === 'init-error') {
          if (initDone) return;
          initDone = true;
          clearTimeout(initTimer);
          readyPromise = null;
          reject(new Error(msg.message || 'Python 运行时初始化失败'));
          return;
        }
        if (msg.id && pending.has(msg.id)) {
          const req = pending.get(msg.id);
          pending.delete(msg.id);
          if (msg.type === 'request-error') req.reject(new Error(msg.message || 'Python 请求失败'));
          else req.resolve(msg.payload);
        }
      };
      worker.onerror = (event) => {
        const error = new Error(window.__SANDBOX_MODE
          ? 'Python 模式在沙箱预览中不可用（Worker 受 iframe 沙箱限制）。请把代码复制到完整页面运行。'
          : (event.message || 'Python worker 异常'));
        pending.forEach(req => req.reject(error));
        pending.clear();
        try { worker.terminate(); } catch (_) {}
        readyPromise = null;
        if (!initDone) {
          initDone = true;
          clearTimeout(initTimer);
          reject(error);
        }
      };
      worker.postMessage({
        type: 'init',
        runtimeBase: (() => {
          let base = (typeof window !== 'undefined' && window.PYODIDE_BASE) || DEFAULT_RUNTIME;
          if (!base.endsWith('/')) base += '/';
          return base;
        })(),
      });
    });
    return readyPromise;
  }

  function request(type, payload, timeoutMs) {
    return ensureWorker().then(() => new Promise((resolve, reject) => {
      const id = nextId++;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error('Python 请求超时'));
      }, timeoutMs || 180000);
      pending.set(id, {
        resolve: (value) => { clearTimeout(timer); resolve(value); },
        reject: (err) => { clearTimeout(timer); reject(err); },
      });
      worker.postMessage(Object.assign({ type, id }, payload));
    }));
  }

  function check(source) {
    return request('check', { source }, 180000).then(raw => JSON.parse(raw));
  }

  function run(source, options) {
    return request('run', { source, options: options || {} }, 180000).then(raw => JSON.parse(raw));
  }

  /* ── tagged Python value → plain JS value ── */
  function hydrate(node, registry) {
    const reg = registry || new Map();
    if (node === null || typeof node !== 'object') return node;
    if (Array.isArray(node)) return node.map(item => hydrate(item, reg));
    switch (node.$t) {
      case 'ref':
        return reg.has(node.id) ? reg.get(node.id) : null;
      case 'seq': {
        const arr = [];
        if (node.id != null) reg.set(node.id, arr);
        (node.items || []).forEach(item => arr.push(hydrate(item, reg)));
        return arr;
      }
      case 'dict': {
        const map = new Map();
        if (node.id != null) reg.set(node.id, map);
        (node.entries || []).forEach(entry => {
          map.set(hydrate(entry[0], reg), hydrate(entry[1], reg));
        });
        return map;
      }
      case 'set': {
        const set = new Set();
        if (node.id != null) reg.set(node.id, set);
        (node.items || []).forEach(item => set.add(hydrate(item, reg)));
        return set;
      }
      case 'obj': {
        const obj = {};
        if (node.id != null) reg.set(node.id, obj);
        try {
          Object.defineProperty(obj, '__py_cls__', {
            value: node.cls || '', enumerable: false, configurable: true, writable: true,
          });
        } catch (_) { /* ignore */ }
        Object.keys(node.fields || {}).forEach(key => {
          obj[key] = hydrate(node.fields[key], reg);
        });
        return obj;
      }
      case 'repr':
        return String(node.v == null ? '' : node.v);
      case 'bigint': {
        const n = Number(node.v);
        return Number.isSafeInteger(n) ? n : String(node.v);
      }
      case 'float': {
        const raw = String(node.v || '');
        if (/nan/i.test(raw)) return NaN;
        if (/^-?inf/i.test(raw)) return raw.startsWith('-') ? -Infinity : Infinity;
        return Number(raw);
      }
      default:
        return node;
    }
  }

  function hydrateVars(tagged) {
    const out = {};
    Object.keys(tagged || {}).forEach(name => { out[name] = hydrate(tagged[name]); });
    return out;
  }

  function cloneVars(vRaw) {
    const out = {};
    Object.keys(vRaw).forEach(name => {
      const value = vRaw[name];
      out[name] = (value !== null && typeof value === 'object') ? cloneDeepBounded(value, 2) : value;
    });
    return out;
  }

  function enrich(ds, v, note, record) {
    try { enrichFromNote(ds, v, note); } catch (_) {}
    if (!note) return;
    const pyPatterns = [
      { re: /\b([A-Za-z_]\w*)\.append\s*\(/g, hot: 'last' },
      { re: /\b([A-Za-z_]\w*)\.add\s*\(/g, hot: 'last' },
      { re: /\b([A-Za-z_]\w*)\.pop\s*\(/g, hot: 'last' },
      { re: /\b([A-Za-z_]\w*)\.popleft\s*\(/g, hot: 'first' },
      { re: /heapq\.heappush\s*\(\s*([A-Za-z_]\w*)\s*,/g, hot: 'last' },
      { re: /heapq\.heappop\s*\(\s*([A-Za-z_]\w*)\s*\)/g, hot: 'first' },
    ];
    pyPatterns.forEach(({ re, hot }) => {
      let m;
      while ((m = re.exec(note))) {
        const d = ds[m[1]];
        if (!d) continue;
        if (d.kind === 'set' && d.items && d.items.length) {
          d.hot = hot === 'first' ? d.items[0] : d.items[d.items.length - 1];
        } else if (d.items && d.items.length) {
          d.hot = hot === 'first' ? 0 : d.items.length - 1;
        } else if (d.kind === 'queue' && d.items && d.items.length) {
          d.hot = 0;
        }
      }
    });
    const getM = note.match(/\b([A-Za-z_]\w*)\.get\s*\(\s*([^)]+?)\s*\)/);
    if (getM && ds[getM[1]] && ds[getM[1]].kind === 'map') {
      const key = pyEvalSimple(getM[2], v);
      if (key !== undefined) ds[getM[1]].hot = key;
    }
    if (record && record.isCheckpoint) {
      Object.keys(ds).forEach(key => { ds[key].win = detectWindowRange(v) || ds[key].win; });
    }
  }

  function pySplitTop(text) {
    const out = [];
    let depth = 0, start = 0, quote = null;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (quote) {
        if (ch === '\\') { i++; continue; }
        if (ch === quote) quote = null;
        continue;
      }
      if (ch === '"' || ch === "'") { quote = ch; continue; }
      if (ch === '(' || ch === '[' || ch === '{') depth++;
      else if (ch === ')' || ch === ']' || ch === '}') depth--;
      else if (ch === ',' && depth === 0) {
        out.push(text.slice(start, i).trim());
        start = i + 1;
      }
    }
    const tail = text.slice(start).trim();
    if (tail) out.push(tail);
    return out;
  }

  function pyExprToJs(expr) {
    return String(expr || '')
      .replace(/\bTrue\b/g, 'true')
      .replace(/\bFalse\b/g, 'false')
      .replace(/\bNone\b/g, 'null')
      .replace(/\bis\s+not\b/g, '!==')
      .replace(/\bis\b/g, '===')
      .replace(/\band\b/g, '&&')
      .replace(/\bor\b/g, '||')
      .replace(/\bnot\s+/g, '!')
      .replace(/\blen\s*\(\s*([A-Za-z_]\w*)\s*\)/g, '$1.length');
  }

  function pyEvalSimple(expr, v) {
    const text = String(expr || '').trim();
    if (!text) return undefined;
    if (text === 'self' && v && 'this' in v) return v.this;
    if (/^[A-Za-z_]\w*$/.test(text) && v && text in v) return v[text];
    if (/^-?\d+(?:\.\d+)?$/.test(text)) return Number(text);
    if (/^(['"]).*\1$/.test(text)) return text.slice(1, -1);
    try { return safeEvalExpr(pyExprToJs(text), v); } catch (_) { return undefined; }
  }

  function fmt(value) {
    try { return formatShortVal(value); } catch (_) { return String(value); }
  }

  function fmtReturn(value, depth, seen) {
    const d = depth || 0;
    const s = seen || new WeakSet();
    if (value === undefined) return '(undefined)';
    if (value === null) return 'None';
    if (typeof value === 'boolean') return value ? 'True' : 'False';
    if (typeof value === 'number') return String(value);
    if (typeof value === 'string') return JSON.stringify(value);
    if (typeof value === 'object') {
      if (s.has(value)) return '[Circular]';
      if (d > 6) return String(value);
      s.add(value);
      if (Array.isArray(value)) {
        return '[' + value.map(x => fmtReturn(x, d + 1, s)).join(', ') + ']';
      }
      if (typeof isMapLike === 'function' && isMapLike(value)) {
        const entries = [];
        value.forEach((v, k) => entries.push(fmtReturn(k, d + 1, s) + ': ' + fmtReturn(v, d + 1, s)));
        return '{' + entries.join(', ') + '}';
      }
      if (typeof isSetLike === 'function' && isSetLike(value)) {
        const items = [];
        value.forEach(v => items.push(fmtReturn(v, d + 1, s)));
        return items.length ? '{' + items.join(', ') + '}' : 'set()';
      }
      const keys = Object.keys(value);
      const cls = value.__py_cls__;
      const body = keys.map(k => k + '=' + fmtReturn(value[k], d + 1, s)).join(', ');
      return cls && cls !== 'dict' && cls !== 'object' ? `${cls}(${body})` : `{${keys.map(k => JSON.stringify(k) + ': ' + fmtReturn(value[k], d + 1, s)).join(', ')}}`;
    }
    return String(value);
  }

  function deriveAnim(record, vRaw, nextRaw, theLines, payload, isLast) {
    const line = record.note || '';
    const clean = line.trim();
    if (!clean) return null;

    const ckpt = clean.match(/^(checkpoint|断点)\s*\((.*)\)\s*$/);
    if (ckpt) {
      const args = pySplitTop(ckpt[2]);
      return {
        type: 'checkpoint',
        fn: ckpt[1],
        args,
        argVals: record.checkpointVals || args.map(a => fmt(pyEvalSimple(a, vRaw))),
      };
    }

    const cond = clean.match(/^(if|elif|while)\s+(.+):\s*$/);
    if (cond) {
      const expr = cond[2].trim();
      const result = pyEvalSimple(expr, vRaw);
      if (typeof result === 'boolean') {
        const cmp = expr.match(/^(.+?)\s*(==|!=|<=|>=|<|>)\s*(.+)$/);
        if (cmp) {
          return {
            type: 'compare',
            lhs: cmp[1].trim(),
            op: cmp[2],
            rhs: cmp[3].trim(),
            lhsVal: fmt(pyEvalSimple(cmp[1], vRaw)),
            rhsVal: fmt(pyEvalSimple(cmp[3], vRaw)),
            result,
          };
        }
        return { type: 'compare', lhs: expr, op: '?', rhs: '', lhsVal: fmt(result), rhsVal: '', result };
      }
      return null;
    }

    const forM = clean.match(/^for\s+(.+?)\s+in\s+(.+):\s*$/);
    if (forM) {
      const target = forM[1].trim();
      const val = nextRaw && target in nextRaw ? nextRaw[target] : vRaw[target];
      if (val !== undefined) return { type: 'assign', to: target, from: forM[2].trim(), val: fmt(val) };
      return null;
    }

    const compound = clean.match(/^([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)\s*(\+=|-=|\*=|\/=|%=|\/\/=)\s*(.+)$/);
    if (compound) {
      const to = compound[1];
      let val = nextRaw ? pyEvalSimple(to, nextRaw) : undefined;
      if (val === undefined) val = pyEvalSimple(to, vRaw);
      if (val !== undefined) {
        return { type: 'assign', to, from: compound[2] + ' ' + compound[3].trim(), val: fmt(val) };
      }
    }

    const tupleAssign = clean.match(/^([A-Za-z_]\w*)\s*,\s*([A-Za-z_]\w*)\s*=\s*(.+)$/);
    if (tupleAssign) {
      const a = tupleAssign[1], b = tupleAssign[2];
      const av = nextRaw && a in nextRaw ? nextRaw[a] : vRaw[a];
      const bv = nextRaw && b in nextRaw ? nextRaw[b] : vRaw[b];
      if (av !== undefined || bv !== undefined) {
        return {
          type: 'assign',
          to: a + ', ' + b,
          from: tupleAssign[3].trim(),
          val: fmt(av) + ', ' + fmt(bv),
        };
      }
    }

    const idxAssign = clean.match(/^([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)\s*\[([^\]]+)\]\s*=\s*(.+)$/);
    if (idxAssign) {
      const name = idxAssign[1];
      const idx = pyEvalSimple(idxAssign[2], vRaw);
      let val = nextRaw ? pyEvalSimple(name, nextRaw) : pyEvalSimple(name, vRaw);
      if (typeof idx === 'number' && Array.isArray(val)) val = val[idx];
      return { type: 'assign', to: name + '[' + idxAssign[2].trim() + ']', from: idxAssign[3].trim(), val: fmt(val) };
    }

    const assign = clean.match(/^([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)(?:\s*:\s*[^=]+)?\s*=\s*(?!=)(.+)$/);
    if (assign) {
      const to = assign[1];
      let val = nextRaw ? pyEvalSimple(to, nextRaw) : undefined;
      if (val === undefined) val = pyEvalSimple(to, vRaw);
      if (val !== undefined) return { type: 'assign', to, from: assign[2].trim(), val: fmt(val) };
    }

    const ret = clean.match(/^return\s+(.+)$/);
    if (ret) {
      const val = pyEvalSimple(ret[1], vRaw);
      if (val !== undefined) return { type: 'assign', to: 'return', from: ret[1].trim(), val: fmt(val) };
      return null;
    }

    const call = clean.match(/^([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)?)\s*\((.*)\)\s*$/);
    if (call) {
      const args = pySplitTop(call[2]);
      return {
        type: 'call',
        fn: call[1],
        args,
        argVals: args.map(a => fmt(pyEvalSimple(a, vRaw))),
        result: null,
      };
    }

    if (isLast && payload && payload.returnValue != null) {
      return {
        type: 'assign',
        to: 'return',
        from: payload.__callExpr || '调用结果',
        val: fmtReturn(payload.__returnValueHydrated),
      };
    }
    return null;
  }

  function buildCallStack(record, vRaw, v, ds, sourceLines) {
    const frames = record.stack || [];
    if (!frames.length) {
      return [{ id: 0, fn: '<module>', label: 'global', line: record.line, v, ds }];
    }
    return frames.map((frame, idx) => {
      const isTop = idx === frames.length - 1;
      const frameRaw = isTop ? vRaw : hydrateVars(frame.vars);
      const frameV = isTop ? v : cloneVars(frameRaw);
      const frameDs = {};
      Object.keys(frameRaw).forEach(name => {
        const d = classifyValue(name, frameRaw[name]);
        if (d) frameDs[name] = d;
      });
      populateInterfaceSchemas(frameDs);
      enrich(frameDs, frameRaw, sourceLines[frame.line - 1] || '');
      const out = {
        id: idx,
        fn: frame.fn,
        label: frame.label,
        line: isTop ? record.line : frame.line,
        v: isTop ? v : frameV,
        ds: isTop ? ds : frameDs,
      };
      const win = detectWindowRange(frameRaw);
      if (win) { out.l = win[0]; out.r = win[1]; }
      return out;
    });
  }

  function buildSteps(payload, sourceLines) {
    const rawSteps = payload.steps || [];
    const steps = [];
    for (let i = 0; i < rawSteps.length; i++) {
      const record = rawSteps[i];
      const vRaw = hydrateVars(record.vars);
      const nextRaw = i + 1 < rawSteps.length ? hydrateVars(rawSteps[i + 1].vars) : null;
      const v = cloneVars(vRaw);
      const ds = {};
      Object.keys(vRaw).forEach(name => {
        const d = classifyValue(name, vRaw[name]);
        if (d) ds[name] = d;
      });
      populateInterfaceSchemas(ds);
      enrich(ds, nextRaw || vRaw, record.note, record);
      const callStack = buildCallStack(record, vRaw, v, ds, sourceLines);
      const isLast = i === rawSteps.length - 1;
      const anim = record.error
        ? { type: 'error', message: record.error }
        : deriveAnim(record, vRaw, nextRaw, sourceLines, payload, isLast);
      steps.push({
        line: record.line,
        note: record.note,
        v,
        vRaw,
        ds,
        callStack,
        isCheckpoint: Boolean(record.isCheckpoint),
        checkpointVals: record.checkpointVals || null,
        error: record.error || null,
        anim,
        isFinalReturn: Boolean(record.isFinalReturn),
        rawNote: record.note,
      });
    }
    return steps;
  }

  function applyMeta(meta) {
    const interfaces = new Map();
    (meta && meta.classes ? meta.classes : []).forEach(cls => {
      interfaces.set(cls.name, {
        name: cls.name,
        line: cls.line || 1,
        isClass: cls.isClass !== false,
        fields: (cls.fields || []).map(f => ({
          k: f.k,
          declaredType: f.declaredType || 'any',
          optional: Boolean(f.optional),
        })),
      });
    });
    const varTypes = new Map(Object.entries((meta && meta.varTypes) || {}));
    CURRENT_TS_META = { interfaces, varTypes };
    metaDeclared = new Set((meta && meta.declared) || []);
  }

  function extractCall(src) {
    const m = String(src || '').match(/#\s*调用\s*[:：]\s*(.+)/);
    return m ? m[1].trim() : '';
  }

  function setDiags(list) {
    diags = list || [];
    if (typeof PY_DIAGS !== 'undefined') {
      PY_DIAGS.length = 0;
      diags.forEach(d => PY_DIAGS.push(d));
    }
  }

  function setStatus(text, cls) {
    const el = document.getElementById('cnt');
    if (!el) return;
    el.textContent = text;
    el.className = cls || '';
  }

  async function start(initialStep) {
    if (busy) return false;
    busy = true;
    const src = editor.value.replace(/\r/g, '');
    const sourceLines = src.split('\n');
    try {
      stopAuto();
      clearFlyLayer();
      setDiags([]);
      setStatus('… Python 运行中', 'running');
      say('… 正在检查 Python 语法并加载运行时（首次约 1–3 秒）', 'dim');
      const checked = await check(src);
      if (!checked.ok) {
        const err = checked.syntaxError || checked || { line: 1, msg: '语法错误' };
        const diag = { line: err.line || 1, code: 'PY', message: err.msg || '语法错误' };
        setDiags([diag]);
        resetTraceState();
        cur = 0;
        say('✗ 第 ' + diag.line + ' 行语法错误: ' + diag.message, 'err', diag.line);
        revealErrorLine(diag.line);
        updateEditorChrome();
        setStatus('未在调试', '');
        return false;
      }
      const payload = await run(src, { maxSteps: 2000, timeLimit: 6 });
      if (payload.syntaxError) {
        const err = payload.syntaxError;
        const diag = { line: err.line || 1, code: 'PY', message: err.msg || '语法错误' };
        setDiags([diag]);
        resetTraceState();
        cur = 0;
        say('✗ 第 ' + diag.line + ' 行语法错误: ' + diag.message, 'err', diag.line);
        revealErrorLine(diag.line);
        updateEditorChrome();
        setStatus('未在调试', '');
        return false;
      }
      applyMeta(payload.meta || {});
      payload.__returnValueHydrated = hydrate(payload.returnValue);
      payload.__callExpr = payload.entryExpr || extractCall(src);
      const steps = buildSteps(payload, sourceLines);
      resetTraceState();
      TRACE = { title: 'Python Playground · Debug', code: sourceLines, steps };
      DEBUG_SESSION = {
        active: true,
        finished: true,
        crashed: Boolean(payload.error),
        error: payload.error || null,
        errorLine: payload.errorLine || -1,
        returnValue: payload.__returnValueHydrated,
        originalLines: sourceLines,
        callExpr: payload.entryExpr || extractCall(src),
      };
      TYPE_ERROR_LINES.clear();
      RUNTIME_ERROR_LINES.clear();
      if (payload.errorLine) RUNTIME_ERROR_LINES.add(payload.errorLine);
      let targetStep = Math.max(0, initialStep || 0);
      if (!initialStep && editor.value === PY_SAMPLES[activeSampleKey]) {
        const hint = DEFAULT_STEP_HINTS[activeSampleKey];
        if (hint) {
          const hinted = steps.findIndex(hint);
          if (hinted > 0) targetStep = hinted;
        }
      }
      cur = Math.min(targetStep, Math.max(0, steps.length - 1));
      SELECTED_FRAME_IDX = null;
      watched = new Set();
      SEEN_VARS_EVER = new Set();
      layoutSpan = Object.create(null);
      initWatchedVars();
      renderPicker();
      renderStatic(cur, false);
      if (payload.stdout) {
        payload.stdout.split('\n').filter(Boolean).forEach(line => say('  log: ' + line, 'dim'));
      }
      if (payload.error) {
        say('✗ 第 ' + (payload.errorLine || 1) + ' 行运行时报错: ' + payload.error, 'err', payload.errorLine || 1);
      } else {
        say('✓ Python 运行完成（共 ' + steps.length + ' 步，可逐步回放）', 'ok');
      }
      const rv = payload.__returnValueHydrated;
      if (rv !== undefined && rv !== null) say('  →  ' + fmtReturn(rv), 'ok');
      return true;
    } catch (err) {
      setStatus('未在调试', '');
      say('✗ Python 运行失败: ' + ((err && err.message) || err), 'err');
      return false;
    } finally {
      busy = false;
    }
  }

  async function runOnly() {
    if (busy) return false;
    busy = true;
    const src = editor.value.replace(/\r/g, '');
    try {
      stopAuto();
      clearFlyLayer();
      setDiags([]);
      setStatus('… Python 运行中', 'running');
      say('… 正在检查 Python 语法并运行', 'dim');
      const checked = await check(src);
      if (!checked.ok) {
        const err = checked.syntaxError || checked || { line: 1, msg: '语法错误' };
        const diag = { line: err.line || 1, code: 'PY', message: err.msg || '语法错误' };
        setDiags([diag]);
        say('✗ 第 ' + diag.line + ' 行语法错误: ' + diag.message, 'err', diag.line);
        revealErrorLine(diag.line);
        updateEditorChrome();
        setStatus('未在调试', '');
        return false;
      }
      const payload = await run(src, { maxSteps: 2000, timeLimit: 6 });
      TYPE_ERROR_LINES.clear();
      RUNTIME_ERROR_LINES.clear();
      if (payload.errorLine) RUNTIME_ERROR_LINES.add(payload.errorLine);
      if (payload.stdout) {
        payload.stdout.split('\n').filter(Boolean).forEach(line => say('  log: ' + line, 'dim'));
      }
      if (payload.error) {
        say('✗ 第 ' + (payload.errorLine || 1) + ' 行运行时报错: ' + payload.error, 'err', payload.errorLine || 1);
        revealErrorLine(payload.errorLine || 1);
        setStatus('✗ 运行时报错', 'err');
      } else {
        const rv = hydrate(payload.returnValue);
        say('✓ 运行完成  →  ' + (rv === undefined ? '(undefined)' : fmtReturn(rv)), 'ok');
        setStatus('未在调试', '');
      }
      updateEditorChrome();
      return !payload.error;
    } catch (err) {
      setStatus('未在调试', '');
      say('✗ Python 运行失败: ' + ((err && err.message) || err), 'err');
      return false;
    } finally {
      busy = false;
    }
  }

  async function runToNextCheckpoint() {
    if (busy) return;
    if (!DEBUG_SESSION || !DEBUG_SESSION.active || !TRACE.steps.length) {
      const ok = await start(0);
      if (!ok) return;
    }
    let nextIdx = -1;
    for (let i = cur + 1; i < TRACE.steps.length; i++) {
      if (TRACE.steps[i] && TRACE.steps[i].isCheckpoint) { nextIdx = i; break; }
    }
    if (nextIdx < 0) {
      nextIdx = TRACE.steps.length - 1;
      const rv = DEBUG_SESSION && DEBUG_SESSION.returnValue;
      say('✓ 已运行至程序结束（后续无更多检查点）' + (rv !== undefined && rv !== null ? '  →  ' + fmtReturn(rv) : ''), 'ok');
    } else {
      const st = TRACE.steps[nextIdx];
      say('◉ 已运行到检查点 [第 ' + st.line + ' 行] · ' + (st.note || ''), 'ok');
    }
    cur = nextIdx;
    SELECTED_FRAME_IDX = null;
    renderPicker();
    renderStatic(cur, true);
  }

  /* ── Python tokenizer / highlighter ── */
  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function tokenizePyLine(line) {
    const tokens = [];
    const re = /(#.*$)|((?:[rRbBuUfF]{0,2})(?:"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'))|(\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|([A-Za-z_]\w*)|(\s+)|([^\sA-Za-z_0-9])/g;
    let match;
    while ((match = re.exec(line))) {
      if (match[1]) tokens.push({ type: 'com', text: match[1] });
      else if (match[2]) tokens.push({ type: 'str', text: match[2] });
      else if (match[3]) tokens.push({ type: 'num', text: match[3] });
      else if (match[4]) tokens.push({ type: 'id', text: match[4] });
      else if (match[5]) tokens.push({ type: 'ws', text: match[5] });
      else tokens.push({ type: 'op', text: match[6] });
      if (match[0] === '') re.lastIndex++;
    }
    return tokens;
  }

  function hl(text, declared) {
    const declaredSet = declared instanceof Set ? declared : new Set(declared || []);
    const tokens = tokenizePyLine(String(text || ''));
    return tokens.map((token, idx) => {
      if (token.type === 'ws') return token.text;
      if (token.type === 'com') return '<span class="com">' + escapeHtml(token.text) + '</span>';
      if (token.type === 'str') return '<span class="str">' + escapeHtml(token.text) + '</span>';
      if (token.type === 'num') return '<span class="num">' + escapeHtml(token.text) + '</span>';
      if (token.type === 'op') return '<span class="op">' + escapeHtml(token.text) + '</span>';
      const word = token.text;
      const prev = tokens[idx - 1];
      const next = tokens[idx + 1];
      if (PY_KEYWORDS.has(word)) return '<span class="kw">' + escapeHtml(word) + '</span>';
      const isCall = next && next.type === 'op' && next.text === '(';
      const isProp = prev && prev.type === 'op' && prev.text === '.';
      if (isProp) return '<span class="prop">' + escapeHtml(word) + '</span>';
      if (declaredSet.has(word)) {
        return '<span class="' + (isCall ? 'fn' : 'prop') + '">' + escapeHtml(word) + '</span>';
      }
      if (PY_BUILTINS.has(word)) return '<span class="bi">' + escapeHtml(word) + '</span>';
      if (isCall) return '<span class="fn">' + escapeHtml(word) + '</span>';
      return escapeHtml(word);
    }).join('');
  }

  function hlActiveLine(rawLine, anim, declared) {
    return hl(rawLine, declared);
  }

  function collectDeclared(src) {
    const names = new Set(PY_EXTRA_DECLARED);
    metaDeclared.forEach(name => names.add(name));
    const text = String(src || '');
    const patterns = [
      /(?:^|\n)\s*(?:async\s+)?def\s+([A-Za-z_]\w*)/g,
      /(?:^|\n)\s*class\s+([A-Za-z_]\w*)/g,
      /(?:^|\n)\s*([A-Za-z_]\w*)\s*(?::\s*[^=\n]+)?\s*(?:,\s*[A-Za-z_]\w*\s*)*=/g,
      /\bfor\s+([A-Za-z_]\w*)(?:\s*,\s*([A-Za-z_]\w*))?\s+in\b/g,
      /\bas\s+([A-Za-z_]\w*)/g,
      /\bimport\s+([A-Za-z_]\w*)/g,
      /\bfrom\s+([A-Za-z_]\w*)\s+import\b/g,
    ];
    patterns.forEach(re => {
      let m;
      while ((m = re.exec(text))) {
        if (m[1]) names.add(m[1]);
        if (m[2]) names.add(m[2]);
      }
    });
    const defRe = /def\s+[A-Za-z_]\w*\s*\(([^)]*)\)/g;
    let dm;
    while ((dm = defRe.exec(text))) {
      pySplitTop(dm[1]).forEach(part => {
        const pm = part.match(/^(?:\*{1,2})?([A-Za-z_]\w*)/);
        if (pm && !PY_KEYWORDS.has(pm[1])) names.add(pm[1]);
      });
    }
    const lambdaRe = /\blambda\s+([^:]+):/g;
    let lm;
    while ((lm = lambdaRe.exec(text))) {
      pySplitTop(lm[1]).forEach(part => {
        const pm = part.match(/^(?:\*{1,2})?([A-Za-z_]\w*)/);
        if (pm && !PY_KEYWORDS.has(pm[1])) names.add(pm[1]);
      });
    }
    return names;
  }

  function sampleOptionsHtml() {
    return Object.keys(PY_SAMPLES).map(key =>
      '<option value="' + key + '">' + escapeHtml(SAMPLES_LABELS[key] || key) + '</option>'
    ).join('');
  }

  function setLang(lang, options) {
    const opts = options || {};
    const restoring = Boolean(opts.restoring);
    const next = lang === 'python' ? 'python' : 'ts';
    if (typeof LANG !== 'undefined' && LANG === next && opts.src == null) return;
    if (!restoring && typeof LANG_BUFFERS !== 'undefined' && typeof editor !== 'undefined') {
      LANG_BUFFERS[LANG] = {
        src: editor.value,
        name: (typeof FILE_NAME !== 'undefined' ? FILE_NAME : (document.getElementById('fileName') || {}).value) || 'playground.ts',
      };
    }
    LANG = next;
    STRICT_TS = next !== 'python';
    setDiags([]);
    stopAuto();
    resetTraceState();
    const isPy = next === 'python';
    document.title = isPy ? 'Python Playground VISUAL' : 'TypeScript Playground VISUAL';
    const langSel = document.getElementById('langSel');
    if (langSel) langSel.value = isPy ? 'python' : 'ts';
    const brandMain = document.querySelector('.brand-main');
    if (brandMain) brandMain.textContent = isPy ? 'Python' : 'TypeScript';
    const brandMark = document.querySelector('.brand-mark');
    if (brandMark) brandMark.textContent = isPy ? 'PY' : 'TS';
    const fileDot = document.querySelector('.file-tab-dot');
    if (fileDot) fileDot.textContent = isPy ? 'PY' : 'TS';
    const checkerBadge = document.getElementById('checkerBadge');
    if (checkerBadge) {
      checkerBadge.textContent = isPy ? 'Python · 语法检查' : 'TS 子集检查';
      checkerBadge.title = isPy
        ? 'Python 模式只做运行前语法检查，不做静态类型检查；点击查看说明'
        : '内置类型检查器只覆盖常用 TypeScript 语法，不是完整 tsc；点击查看已知限制';
    }
    const btnImport = document.getElementById('btnImport');
    if (btnImport) btnImport.title = isPy ? '导入本地 Python 文件（.py）到编辑器' : '导入本地 TypeScript 文件（.ts / .tsx / .txt）到编辑器';
    const fileInput = document.getElementById('fileInput');
    if (fileInput) fileInput.accept = isPy ? '.py,text/x-python,text/plain' : '.ts,.tsx,.js,.jsx,.txt,text/plain';
    const exportBtn = document.getElementById('btnExportTs');
    if (exportBtn) {
      const span = exportBtn.querySelector('span');
      if (span) span.textContent = isPy ? '📄 导出 Python 文件' : '📄 导出 TypeScript 文件';
    }
    const exportWrap = document.getElementById('btnExportMenu');
    if (exportWrap) exportWrap.title = isPy ? '导出 Python 文件（视频导出暂未适配 Python 模式）' : '导出 TypeScript 文件或 1080p 60fps 演示视频';
    const videoBtn = document.getElementById('btnExportVideo');
    if (videoBtn) videoBtn.disabled = isPy;
    const editorEl = document.getElementById('editor');
    if (editorEl) editorEl.placeholder = isPy
      ? '# 写 Python，可在任意位置调用 checkpoint() 设置检查点，最后一行直接写入口调用，例如 main()'
      : '// 写 TypeScript，可在任意位置调用 checkpoint() 设置检查点，最后一行直接写入口调用，例如 main()';
    const sel = document.getElementById('sampleSel');
    if (sel) {
      sel.innerHTML = isPy ? sampleOptionsHtml() : TS_SAMPLE_OPTIONS_HTML;
    }
    if (opts.src != null) {
      activeSampleKey = opts.sampleKey || '';
      editor.value = String(opts.src);
      const restoredName = opts.name || (isPy ? 'shared.py' : 'shared.ts');
      setFileName(restoredName);
      if (sel) {
        if (opts.sampleKey && [...sel.options].some(o => o.value === opts.sampleKey)) sel.value = opts.sampleKey;
        else sel.selectedIndex = -1;
      }
      if (typeof LANG_BUFFERS !== 'undefined') LANG_BUFFERS[next] = { src: editor.value, name: FILE_NAME };
      updateEditorChrome();
      if (opts.start) {
        if (isPy) start(opts.step || 0);
        else if (typeof startDebug === 'function') startDebug(opts.step || 0);
      }
      return;
    }
    if (typeof LANG_BUFFERS !== 'undefined' && LANG_BUFFERS[next]) {
      editor.value = LANG_BUFFERS[next].src;
      setFileName(LANG_BUFFERS[next].name);
      updateEditorChrome();
      if (isPy) start(0);
      else if (typeof startDebug === 'function') startDebug(0);
    } else if (isPy) {
      loadPySample('quickstart');
    } else {
      loadSample('showcase');
    }
  }

  function loadPySample(key) {
    const target = PY_SAMPLES[key] ? key : 'quickstart';
    activeSampleKey = target;
    editor.value = PY_SAMPLES[target];
    setFileName(target + '.py');
    lastEditorCursorLine = -1;
    const sel = document.getElementById('sampleSel');
    if (sel) sel.value = target;
    clearLog('已加载 Python 样例 · 正在录制执行步骤');
    resetTraceState();
    start(0);
  }

  return {
    samples: PY_SAMPLES,
    builtins: PY_BUILTINS,
    sampleOptionsHtml,
    setLang,
    loadSample: loadPySample,
    start,
    runOnly,
    runToNextCheckpoint,
    check,
    run,
    hydrate,
    buildSteps,
    applyMeta,
    deriveAnim,
    enrich,
    hl,
    hlActiveLine,
    collectDeclared,
    setDiags,
    get diags() { return diags; },
    get busy() { return busy; },
  };
})();

if (typeof window !== 'undefined') window.PY_ENGINE = PY_ENGINE;
