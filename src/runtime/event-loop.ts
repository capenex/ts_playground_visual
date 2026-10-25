/* ================================================================
   Virtual Event Loop Scheduler & Console Log Utilities (src/runtime/event-loop.ts)
   ================================================================ */
import { blankStrings } from "../compiler/comments";
import { formatShortVal, isMapLike, isSetLike, renderPicker, renderStatic } from "../viz/memory-graph";
import { revealErrorLine, updateEditorChrome } from "../viz/highlight";
import { clearFlyLayer } from "../viz/ast-view";
import { stopAuto } from "../ui/controls";
import { EventLoopSnapshot } from "../types";
import type { VfsClientApi } from "../globals";

export function say(msg: string, cls?: string, line?: number) {
  const d = document.createElement('div');
  if (cls) d.className = cls;
  if (line) {
    d.className = (cls ? cls + ' ' : '') + 'diag';
    if (d.setAttribute) {
      d.setAttribute('data-line', String(line));
      d.setAttribute('title', '点击定位到第 ' + line + ' 行');
    }
  }
  d.textContent = msg;
  logEl.appendChild(d);
  logEl.scrollTop = logEl.scrollHeight;
}

/* clicking a diagnostic in the log jumps to (and highlights) its line */
if (logEl && logEl.addEventListener) {
  logEl.addEventListener('click', (e: MouseEvent) => {
    const el = e && (e.target as HTMLElement | null);
    const target = el && el.closest ? el.closest('.diag') : null;
    if (!target || !target.getAttribute) return;
    revealErrorLine(parseInt(target.getAttribute('data-line') || '0', 10), true);
  });
}

export function clearLog(msg?: string) {
  logEl.innerHTML = '';
  if (msg) say(msg, 'dim');
}

/* V8 wraps a Function body in extra lines; measure it instead of hard-coding.
   Stack frames look like `at boom (eval at f (file:12:3), <anonymous>:6:9)` — the
   `<anonymous>` location after the comma is the one inside the compiled body. */
export function anonStackLine(stack: unknown) {
  const re = /,\s*<anonymous>:(\d+):\d+/g;
  const m = re.exec(String(stack || ''));
  return m && m[1] ? parseInt(m[1], 10) : 0;
}

let FN_BODY_LINE_OFFSET: number | null = null;
export function fnBodyLineOffset() {
  if (FN_BODY_LINE_OFFSET !== null) return FN_BODY_LINE_OFFSET;
  let off = 2;
  try {
    new Function('throw new Error("probe")')();
  } catch (e) {
    const line = anonStackLine(e instanceof Error ? e.stack : undefined);
    if (line > 0) off = Math.max(1, line - 1);
  }
  FN_BODY_LINE_OFFSET = off;
  return off;
}

/* Map a compiled-function stack line back to the editor line it came from.
   The generated body is: line 1 = checkpoint stub, source line 1 starts on body line 2. */
export function sourceLineFromStack(stack: unknown, lineCount?: number) {
  const stackLine = anonStackLine(stack);
  if (!stackLine) return 0;
  const line = stackLine - fnBodyLineOffset() - 1;
  if (!isFinite(line) || line < 1) return 0;
  if (lineCount && line > lineCount) return 0;   // threw inside the evaluation wrapper, not user code
  return line;
}

/* Compile & evaluate one call. `opts.budgetMs` arms the loop watchdog: the instrumented
   `__t(line)` hooks count executions and throw once the wall-clock budget is spent, so a
   runaway loop is aborted on the spot and we still know which source line kept spinning. */
export function safeJSONStringify(val: unknown) {
  if (val === undefined) return '(undefined)';
  try {
    const seen = new WeakSet();
    return JSON.stringify(val, (_k, v) => {
      if (v !== null && typeof v === 'object') {
        if (seen.has(v)) return '[Circular]';
        seen.add(v);
        if (Array.isArray(v) && v.length > 60) {
          return [
            ...v.slice(0, 20),
            `… (共 ${v.length} 项)`,
            ...v.slice(v.length - 5),
          ];
        }
      }
      return v;
    });
  } catch (_) {
    try { return String(val); } catch (__) { return '[Object]'; }
  }
}

/* ================================================================
   4.1) Deterministic Virtual Event Loop Sandbox (Promise / async-await / setTimeout / queueMicrotask)
   Executes microtasks and timer macrotasks deterministically so step-by-step replay
   and PAUSE_SIGNAL unwinding work across async boundaries.
   ================================================================ */
export function hasAsyncConstructs(src: unknown) {
  if (!src || typeof src !== 'string') return false;
  const clean = blankStrings(src);
  return /\b(?:async|await|Promise|setTimeout|queueMicrotask|sleep)\b/.test(clean);
}

export interface VirtualMicrotaskEntry {
  id: number;
  label: string;
  line: number;
  status: string;
  isInternalAwait: boolean;
  run: () => void;
  rawCb: unknown;
}

export interface VirtualMacrotaskEntry {
  id: number;
  label: string;
  delay: number;
  fireAt: number;
  line: number;
  status: string;
  cb: ((...a: unknown[]) => unknown) | null | undefined;
  args: unknown[];
}

export interface VirtualCoroutineEntry {
  id: number;
  name: string;
  line: number;
  status: string;
  awaitExpr: string | null;
  fid: number;
}

export interface VirtualPromiseLike {
  __isVirtualPromise: boolean;
  id: number;
  label: string;
  state: string;
  value: unknown;
  reason: unknown;
  line: number;
  _internal?: boolean;
  reactions?: unknown[];
}

export interface VirtualLoopState {
  used: boolean;
  virtualTime: number;
  phase: string;
  activeTaskLabel: string;
  coroutines: VirtualCoroutineEntry[];
  microtasks: VirtualMicrotaskEntry[];
  macrotasks: VirtualMacrotaskEntry[];
  promises: VirtualPromiseLike[];
  globalSnapFn: (() => Record<string, unknown>) | null;
}

export function createVirtualEventLoop(
  __t: ((line?: number, note?: string, snap?: unknown, self?: unknown) => void) | null | undefined,
  getCurLine: () => number = () => 1,
  onSuspendFrame?: (fid: number, line?: number, expr?: string) => void,
  onResumeFrame?: (fid: number) => void
) {
  let promiseSeq = 0;
  let microSeq = 0;
  let macroSeq = 0;
  let coroSeq = 0;

  const loop: VirtualLoopState = {
    used: false,
    virtualTime: 0,
    phase: 'sync', // 'sync' | 'microtask' | 'macrotask' | 'idle'
    activeTaskLabel: '主线程同步栈 (Sync)',
    coroutines: [],
    microtasks: [],
    macrotasks: [],
    promises: [],
    globalSnapFn: null,
  };

  function rethrowIfControlSignal(err: unknown) {
    const ctrl = (err && typeof err === 'object')
      ? (err as { __debugPause?: boolean; __timeout?: boolean })
      : null;
    if (err === PAUSE_SIGNAL || (ctrl && (ctrl.__debugPause || ctrl.__timeout))) {
      throw err;
    }
  }

  function enqueueMicrotask(item: {
    label?: string;
    line?: number;
    isInternalAwait?: boolean;
    run: () => void;
    rawCb?: unknown;
  }) {
    loop.used = true;
    const task: VirtualMicrotaskEntry = {
      id: ++microSeq,
      label: item.label || ('microtask#' + microSeq),
      line: item.line || getCurLine() || 1,
      status: 'queued',
      isInternalAwait: Boolean(item.isInternalAwait),
      run: item.run,
      rawCb: item.rawCb || null,
    };
    loop.microtasks.push(task);
    return task;
  }

  interface PromiseHandler {
    onFulfilled?: ((v: unknown) => unknown) | null;
    onRejected?: ((r: unknown) => unknown) | null;
    child: VirtualPromise;
    line?: number;
    label?: string;
    isInternalAwait?: boolean;
  }

  class VirtualPromise implements VirtualPromiseLike {
    __isVirtualPromise: boolean;
    id: number;
    label: string;
    state: string;
    value: unknown;
    reason: unknown;
    line: number;
    _handlers: PromiseHandler[];
    _internal?: boolean;
    reactions?: unknown[];

    constructor(
      executor?: ((resolve: (val?: unknown) => void, reject: (reason?: unknown) => void) => void) | null,
      label?: string
    ) {
      loop.used = true;
      this.__isVirtualPromise = true;
      this.id = ++promiseSeq;
      this.label = label || ('Promise#' + this.id);
      this.state = 'pending';
      this.value = undefined;
      this.reason = undefined;
      this.line = getCurLine() || 1;
      this._handlers = [];
      loop.promises.push(this);

      const resolve = (val?: unknown) => this._resolve(val);
      const reject = (reason?: unknown) => this._reject(reason);
      if (typeof executor === 'function') {
        try {
          executor(resolve, reject);
        } catch (err) {
          rethrowIfControlSignal(err);
          this._reject(err);
        }
      }
    }

    _resolve(val?: unknown) {
      if (this.state !== 'pending') return;
      const thenable = (val && (typeof val === 'object' || typeof val === 'function'))
        ? (val as { __isVirtualPromise?: boolean; then?: (onF: (v: unknown) => void, onR: (r: unknown) => void) => void })
        : null;
      if (thenable && (thenable.__isVirtualPromise || typeof thenable.then === 'function') && typeof thenable.then === 'function') {
        try {
          thenable.then((v: unknown) => this._resolve(v), (r: unknown) => this._reject(r));
        } catch (err) {
          rethrowIfControlSignal(err);
          this._reject(err);
        }
        return;
      }
      this.state = 'fulfilled';
      this.value = val;
      this._flush();
    }

    _reject(reason?: unknown) {
      if (this.state !== 'pending') return;
      this.state = 'rejected';
      this.reason = reason;
      this._flush();
    }

    _flush() {
      if (this.state === 'pending') return;
      const pending = this._handlers.splice(0, this._handlers.length);
      for (const h of pending) {
        this._scheduleHandler(h);
      }
    }

    _scheduleHandler(h: PromiseHandler) {
      const isFulfilled = this.state === 'fulfilled';
      const cb = isFulfilled ? h.onFulfilled : h.onRejected;
      const arg = isFulfilled ? this.value : this.reason;
      enqueueMicrotask({
        label: h.label || (this.label + (isFulfilled ? '.then' : '.catch')),
        line: h.line || this.line || 1,
        isInternalAwait: Boolean(h.isInternalAwait),
        rawCb: cb,
        run: () => {
          if (typeof cb !== 'function') {
            if (isFulfilled) h.child._resolve(arg);
            else h.child._reject(arg);
            return;
          }
          try {
            // If user wrote a single-line callback without inner __t hooks, emit a trace step for the microtask
            const cbSrc = Function.prototype.toString.call(cb);
            if (!h.isInternalAwait && !cbSrc.includes('__t(') && typeof __t === 'function') {
              __t(h.line || 1, '⚡ [微任务 Microtask] ' + (h.label || 'Promise.then'), loop.globalSnapFn);
            }
            const res = cb(arg);
            h.child._resolve(res);
          } catch (err) {
            rethrowIfControlSignal(err);
            h.child._reject(err);
          }
        },
      });
    }

    then(
      onFulfilled?: ((v: unknown) => unknown) | null,
      onRejected?: ((r: unknown) => unknown) | null,
      metaLabel?: string,
      isInternalAwait?: boolean
    ) {
      const callLine = getCurLine() || this.line || 1;
      const child = new VirtualPromise(null, metaLabel || (this.label + '.then'));
      // Hide internal child promises created purely for chaining from cluttering the promise list if needed
      if (isInternalAwait) child._internal = true;
      const handler: PromiseHandler = {
        onFulfilled,
        onRejected,
        child,
        line: callLine,
        label: metaLabel || (this.label + '.then'),
        isInternalAwait: Boolean(isInternalAwait),
      };
      if (this.state === 'pending') {
        this._handlers.push(handler);
      } else {
        this._scheduleHandler(handler);
      }
      return child;
    }

    catch(onRejected?: ((reason: unknown) => unknown) | null) {
      return this.then(null, onRejected, this.label + '.catch');
    }

    finally(onFinally?: (() => unknown) | null) {
      return this.then(
        (v: unknown) => {
          if (typeof onFinally === 'function') onFinally();
          return v;
        },
        (err: unknown) => {
          if (typeof onFinally === 'function') onFinally();
          throw err;
        },
        this.label + '.finally'
      );
    }

    static resolve(val?: unknown): VirtualPromise {
      loop.used = true;
      if (val instanceof VirtualPromise || (val && typeof val === 'object' && '__isVirtualPromise' in val)) {
        return val as VirtualPromise;
      }
      return new VirtualPromise((res: (v?: unknown) => void) => res(val), 'Promise.resolve(' + formatShortVal(val) + ')');
    }

    static reject(reason?: unknown): VirtualPromise {
      loop.used = true;
      return new VirtualPromise((_res: (v?: unknown) => void, rej: (r?: unknown) => void) => rej(reason), 'Promise.reject(' + formatShortVal(reason) + ')');
    }

    static all(items: Iterable<unknown> | null | undefined): VirtualPromise {
      loop.used = true;
      const arr = Array.from(items || []);
      return new VirtualPromise((resolve: (v?: unknown) => void, reject: (r?: unknown) => void) => {
        if (arr.length === 0) { resolve([]); return; }
        const out = new Array(arr.length);
        let left = arr.length;
        arr.forEach((item, idx) => {
          VirtualPromise.resolve(item).then((val: unknown) => {
            out[idx] = val;
            if (--left === 0) resolve(out);
          }, reject);
        });
      }, 'Promise.all');
    }

    static race(items: Iterable<unknown> | null | undefined): VirtualPromise {
      loop.used = true;
      const arr = Array.from(items || []);
      return new VirtualPromise((resolve: (v?: unknown) => void, reject: (r?: unknown) => void) => {
        arr.forEach((item) => {
          VirtualPromise.resolve(item).then(resolve, reject);
        });
      }, 'Promise.race');
    }
  }

  const getVfsApi = (): VfsClientApi => {
    if (globalThis.__VFS__) return globalThis.__VFS__;
    const fallbackFiles = new Map<string, { type: 'file' | 'folder'; content: string; mtime: number }>();
    const resolveFallbackWorkspacePath = (rawPath: string, allowEmptyRoot = false): string => {
      const s = String(rawPath ?? '').trim().replace(/\\/g, '/');
      if (!s) {
        if (allowEmptyRoot) return '';
        throw new Error(`ENOENT: no such file or directory, open ''`);
      }
      if (/^[A-Za-z]:/.test(s) || s.startsWith('~')) {
        throw new Error(`EACCES: permission denied, access '${rawPath}' (outside workspace is not allowed)`);
      }
      let rel = s;
      if (s.startsWith('/')) {
        if (s === '/' || s === '/workspace' || s === '/workspace/') {
          rel = '';
        } else if (s.startsWith('/workspace/')) {
          rel = s.slice('/workspace/'.length);
        } else {
          throw new Error(`EACCES: permission denied, access '${rawPath}' (outside workspace is not allowed)`);
        }
      } else if (s === 'workspace' || s === 'workspace/') {
        rel = '';
      } else if (s.startsWith('workspace/')) {
        rel = s.slice('workspace/'.length);
      }
      const rawParts = rel.split('/');
      const resolved: string[] = [];
      for (const part of rawParts) {
        if (!part || part === '.') continue;
        if (part === '..') {
          if (resolved.length === 0) {
            throw new Error(`EACCES: permission denied, access '${rawPath}' (outside workspace is not allowed)`);
          }
          resolved.pop();
          continue;
        }
        resolved.push(part);
      }
      if (resolved.length === 0 && !allowEmptyRoot) {
        throw new Error(`EISDIR: illegal operation on a directory, open '${rawPath}'`);
      }
      return resolved.join('/');
    };
    const ensureParentFolders = (norm: string) => {
      const parts = norm.split('/').filter(Boolean);
      let acc = '';
      for (let idx = 0; idx < parts.length - 1; idx++) {
        const seg = parts[idx] || '';
        acc = acc ? `${acc}/${seg}` : seg;
        if (!fallbackFiles.has(acc)) {
          fallbackFiles.set(acc, { type: 'folder', content: '', mtime: Date.now() });
        }
      }
    };
    const api: VfsClientApi = {
      resolveWorkspacePath(rawPath: string, allowEmptyRoot = false) {
        return resolveFallbackWorkspacePath(rawPath, allowEmptyRoot);
      },
      readFile(p: string) {
        const norm = resolveFallbackWorkspacePath(p, false);
        const node = fallbackFiles.get(norm);
        if (!node) throw new Error(`ENOENT: no such file or directory, open '${p}'`);
        if (node.type === 'folder') throw new Error(`EISDIR: illegal operation on a directory, read '${p}'`);
        return node.content;
      },
      writeFile(p: string, data: string) {
        const norm = resolveFallbackWorkspacePath(p, false);
        ensureParentFolders(norm);
        const str = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
        fallbackFiles.set(norm, { type: 'file', content: str, mtime: Date.now() });
        return true;
      },
      appendFile(p: string, data: string) {
        const norm = resolveFallbackWorkspacePath(p, false);
        ensureParentFolders(norm);
        const prev = fallbackFiles.get(norm)?.content ?? '';
        const str = typeof data === 'string' ? data : JSON.stringify(data);
        fallbackFiles.set(norm, { type: 'file', content: prev + str, mtime: Date.now() });
        return true;
      },
      exists(p: string) {
        const norm = resolveFallbackWorkspacePath(p, true);
        if (!norm) return true;
        return fallbackFiles.has(norm);
      },
      listFiles(p?: string) {
        const norm = resolveFallbackWorkspacePath(p || '.', true);
        const prefix = norm ? norm + '/' : '';
        const out = new Set<string>();
        fallbackFiles.forEach((_v, k) => {
          if (!prefix) {
            const first = k.split('/')[0];
            if (first) out.add(first);
          } else if (k.startsWith(prefix)) {
            const rest = k.slice(prefix.length).split('/')[0];
            if (rest) out.add(rest);
          }
        });
        return Array.from(out).sort();
      },
      readdir(p?: string) {
        return api.listFiles(p);
      },
      mkdir(p: string) {
        const norm = resolveFallbackWorkspacePath(p, true);
        if (!norm) return true;
        ensureParentFolders(norm);
        fallbackFiles.set(norm, { type: 'folder', content: '', mtime: Date.now() });
        return true;
      },
      deleteFile(p: string) {
        const norm = resolveFallbackWorkspacePath(p, false);
        const existed = fallbackFiles.delete(norm);
        Array.from(fallbackFiles.keys()).forEach(k => {
          if (k.startsWith(norm + '/')) fallbackFiles.delete(k);
        });
        return existed;
      },
      unlink(p: string) {
        return api.deleteFile(p);
      },
      stat(p: string) {
        const norm = resolveFallbackWorkspacePath(p, true);
        if (!norm) {
          return {
            size: 0,
            isFile: () => false,
            isDirectory: () => true,
          };
        }
        const node = fallbackFiles.get(norm);
        if (!node) throw new Error(`ENOENT: no such file or directory, stat '${p}'`);
        return {
          size: node.type === 'file' ? node.content.length : 0,
          isFile: () => node.type === 'file',
          isDirectory: () => node.type === 'folder',
        };
      },
      listAll() {
        return Array.from(fallbackFiles.keys()).sort();
      },
      clear() {
        fallbackFiles.clear();
      },
    };
    globalThis.__VFS__ = api;
    globalThis.vfs = api;
    return api;
  };

  const readRequiredVfsFile = (p: string): string => {
    const content = getVfsApi().readFile(p);
    if (content === null) {
      throw new Error(`ENOENT: no such file or directory, open '${p}'`);
    }
    return content;
  };

  const fsPromisesApi = {
    readFile(p: string, _encoding?: string) {
      loop.used = true;
      return new VirtualPromise((resolve: (v?: unknown) => void, reject: (r?: unknown) => void) => {
        try {
          resolve(readRequiredVfsFile(p));
        } catch (e) {
          reject(e);
        }
      }, `fs.readFile(${formatShortVal(p)})`);
    },
    writeFile(p: string, data: unknown, _encoding?: string) {
      loop.used = true;
      return new VirtualPromise((resolve: (v?: unknown) => void, reject: (r?: unknown) => void) => {
        try {
          getVfsApi().writeFile(p, typeof data === 'string' ? data : String(data ?? ''));
          resolve(undefined);
        } catch (e) {
          reject(e);
        }
      }, `fs.writeFile(${formatShortVal(p)})`);
    },
    appendFile(p: string, data: unknown, _encoding?: string) {
      loop.used = true;
      return new VirtualPromise((resolve: (v?: unknown) => void, reject: (r?: unknown) => void) => {
        try {
          getVfsApi().appendFile(p, typeof data === 'string' ? data : String(data ?? ''));
          resolve(undefined);
        } catch (e) {
          reject(e);
        }
      }, `fs.appendFile(${formatShortVal(p)})`);
    },
    readdir(p?: string) {
      loop.used = true;
      return new VirtualPromise((resolve: (v?: unknown) => void, reject: (r?: unknown) => void) => {
        try {
          resolve(getVfsApi().readdir(p));
        } catch (e) {
          reject(e);
        }
      }, `fs.readdir(${formatShortVal(p || '.')})`);
    },
    mkdir(p: string, _options?: unknown) {
      loop.used = true;
      return new VirtualPromise((resolve: (v?: unknown) => void, reject: (r?: unknown) => void) => {
        try {
          getVfsApi().mkdir(p);
          resolve(undefined);
        } catch (e) {
          reject(e);
        }
      }, `fs.mkdir(${formatShortVal(p)})`);
    },
    unlink(p: string) {
      loop.used = true;
      return new VirtualPromise((resolve: (v?: unknown) => void, reject: (r?: unknown) => void) => {
        try {
          getVfsApi().unlink(p);
          resolve(undefined);
        } catch (e) {
          reject(e);
        }
      }, `fs.unlink(${formatShortVal(p)})`);
    },
    rm(p: string, _options?: unknown) {
      loop.used = true;
      return new VirtualPromise((resolve: (v?: unknown) => void, reject: (r?: unknown) => void) => {
        try {
          getVfsApi().unlink(p);
          resolve(undefined);
        } catch (e) {
          reject(e);
        }
      }, `fs.rm(${formatShortVal(p)})`);
    },
    stat(p: string) {
      loop.used = true;
      return new VirtualPromise((resolve: (v?: unknown) => void, reject: (r?: unknown) => void) => {
        try {
          resolve(getVfsApi().stat(p));
        } catch (e) {
          reject(e);
        }
      }, `fs.stat(${formatShortVal(p)})`);
    },
    exists(p: string) {
      loop.used = true;
      return new VirtualPromise((resolve: (v?: unknown) => void, reject: (r?: unknown) => void) => {
        try {
          resolve(getVfsApi().exists(p));
        } catch (e) {
          reject(e);
        }
      }, `fs.exists(${formatShortVal(p)})`);
    },
    access(p: string, _mode?: number) {
      loop.used = true;
      return new VirtualPromise((resolve: (v?: unknown) => void, reject: (r?: unknown) => void) => {
        try {
          getVfsApi().stat(p);
          resolve(undefined);
        } catch (e) {
          reject(e);
        }
      }, `fs.access(${formatShortVal(p)})`);
    },
    copyFile(srcPath: string, destPath: string) {
      loop.used = true;
      return new VirtualPromise((resolve: (v?: unknown) => void, reject: (r?: unknown) => void) => {
        try {
          const content = readRequiredVfsFile(srcPath);
          getVfsApi().writeFile(destPath, content);
          resolve(undefined);
        } catch (e) {
          reject(e);
        }
      }, `fs.copyFile(${formatShortVal(srcPath)})`);
    },
    rename(oldPath: string, newPath: string) {
      loop.used = true;
      return new VirtualPromise((resolve: (v?: unknown) => void, reject: (r?: unknown) => void) => {
        try {
          const content = readRequiredVfsFile(oldPath);
          getVfsApi().writeFile(newPath, content);
          getVfsApi().unlink(oldPath);
          resolve(undefined);
        } catch (e) {
          reject(e);
        }
      }, `fs.rename(${formatShortVal(oldPath)})`);
    },
  };

  const fsModuleEnv = {
    promises: fsPromisesApi,
    readFileSync(p: string, _encoding?: string) {
      return readRequiredVfsFile(p);
    },
    writeFileSync(p: string, data: unknown, _encoding?: string) {
      getVfsApi().writeFile(p, typeof data === 'string' ? data : String(data ?? ''));
    },
    appendFileSync(p: string, data: unknown, _encoding?: string) {
      getVfsApi().appendFile(p, typeof data === 'string' ? data : String(data ?? ''));
    },
    existsSync(p: string) {
      try {
        return getVfsApi().exists(p);
      } catch (_) {
        return false;
      }
    },
    readdirSync(p?: string) {
      return getVfsApi().readdir(p);
    },
    mkdirSync(p: string, _options?: unknown) {
      getVfsApi().mkdir(p);
    },
    unlinkSync(p: string) {
      getVfsApi().unlink(p);
    },
    rmSync(p: string, _options?: unknown) {
      getVfsApi().unlink(p);
    },
    statSync(p: string) {
      return getVfsApi().stat(p);
    },
    copyFileSync(srcPath: string, destPath: string) {
      const content = readRequiredVfsFile(srcPath);
      getVfsApi().writeFile(destPath, content);
    },
    renameSync(oldPath: string, newPath: string) {
      const content = readRequiredVfsFile(oldPath);
      getVfsApi().writeFile(newPath, content);
      getVfsApi().unlink(oldPath);
    },
  };

  const env = {
    Promise: VirtualPromise,
    fs: fsModuleEnv,
    queueMicrotask(cb: (() => unknown) | null | undefined) {
      loop.used = true;
      const line = getCurLine() || 1;
      enqueueMicrotask({
        label: 'queueMicrotask',
        line,
        rawCb: cb,
        run: () => {
          if (typeof cb !== 'function') return;
          const cbSrc = Function.prototype.toString.call(cb);
          if (!cbSrc.includes('__t(') && typeof __t === 'function') {
            __t(line, '⚡ [微任务] queueMicrotask', loop.globalSnapFn);
          }
          cb();
        },
      });
    },
    setTimeout(cb: ((...a: unknown[]) => unknown) | null | undefined, delay: number | string = 0, ...args: unknown[]) {
      loop.used = true;
      const d = Math.max(0, Number(delay) || 0);
      const line = getCurLine() || 1;
      const id = ++macroSeq;
      loop.macrotasks.push({
        id,
        label: `setTimeout (${d}ms)`,
        delay: d,
        fireAt: loop.virtualTime + d,
        line,
        status: 'waiting',
        cb,
        args,
      });
      return id;
    },
    clearTimeout(id: number) {
      const t = loop.macrotasks.find((m: { id: number; status: string }) => m.id === id && m.status === 'waiting');
      if (t) t.status = 'cancelled';
    },
    sleep(ms: number | string = 0, val: unknown = undefined) {
      loop.used = true;
      const d = Math.max(0, Number(ms) || 0);
      return new VirtualPromise((resolve: (v?: unknown) => void) => {
        env.setTimeout(() => resolve(val), d);
      }, `sleep(${d}ms)`);
    },
  };

  function runAsyncCoroutine(
    genFn: (this: unknown) => Generator<unknown, unknown, unknown>,
    self: unknown,
    fnName?: string,
    defLine?: number
  ) {
    loop.used = true;
    const coro = {
      id: ++coroSeq,
      name: fnName || 'async',
      line: defLine || getCurLine() || 1,
      status: 'running',
      awaitExpr: null as string | null,
      fid: 0,
    };
    loop.coroutines.push(coro);
    const outPromise = new VirtualPromise(null, `${coro.name}()`);
    let gen: Generator<unknown, unknown, unknown>;
    try {
      gen = genFn.call(self);
    } catch (err) {
      rethrowIfControlSignal(err);
      coro.status = 'rejected';
      outPromise._reject(err);
      return outPromise;
    }

    function drive(method: 'next' | 'throw', arg: unknown) {
      coro.status = 'running';
      coro.awaitExpr = null;
      let stepRes;
      try {
        stepRes = gen[method](arg);
      } catch (err) {
        rethrowIfControlSignal(err);
        coro.status = 'rejected';
        outPromise._reject(err);
        return;
      }
      if (stepRes.done) {
        coro.status = 'done';
        outPromise._resolve(stepRes.value);
        return;
      }
      const yielded = stepRes.value;
      const awaitDesc = (yielded && typeof yielded === 'object' && '__isAwait' in yielded)
        ? (yielded as { __isAwait?: boolean; value?: unknown; fid?: number; line?: number; expr?: string })
        : null;
      const isAwaitDesc = Boolean(awaitDesc && awaitDesc.__isAwait);
      const awaitedVal = isAwaitDesc && awaitDesc ? awaitDesc.value : yielded;
      const fid = (isAwaitDesc && awaitDesc && awaitDesc.fid) ? awaitDesc.fid : 0;
      const awaitLine = (isAwaitDesc && awaitDesc && awaitDesc.line) ? awaitDesc.line : getCurLine() || coro.line;
      const awaitExpr = (isAwaitDesc && awaitDesc && awaitDesc.expr) ? awaitDesc.expr : 'await';

      coro.status = 'suspended';
      coro.line = awaitLine;
      coro.awaitExpr = awaitExpr;
      coro.fid = fid;
      if (fid && typeof onSuspendFrame === 'function') {
        onSuspendFrame(fid, awaitLine, awaitExpr);
      }

      const awaitedPromise = VirtualPromise.resolve(awaitedVal);
      awaitedPromise.then(
        (resolvedVal: unknown) => {
          if (fid && typeof onResumeFrame === 'function') {
            onResumeFrame(fid);
          }
          drive('next', resolvedVal);
        },
        (rejectedReason: unknown) => {
          if (fid && typeof onResumeFrame === 'function') {
            onResumeFrame(fid);
          }
          drive('throw', rejectedReason);
        },
        `await 恢复: ${coro.name} (L${awaitLine})`,
        true
      );
    }

    drive('next', undefined);
    return outPromise;
  }

  function drainEventLoop(entryVal: unknown, fallbackSnapFn?: (() => Record<string, unknown>) | null) {
    if (fallbackSnapFn && !loop.globalSnapFn) loop.globalSnapFn = fallbackSnapFn;
    if (!loop.used) return entryVal;

    let safety = 0;
    while (safety++ < 2000) {
      // 1. Drain all queued microtasks (FIFO)
      const nextMicro = loop.microtasks.find((m: { status: string }) => m.status === 'queued');
      if (nextMicro) {
        nextMicro.status = 'running';
        loop.phase = 'microtask';
        loop.activeTaskLabel = nextMicro.label;
        try {
          nextMicro.run();
        } finally {
          if (nextMicro.status === 'running') nextMicro.status = 'done';
        }
        continue;
      }

      // 2. Pick the earliest waiting macrotask timer
      let bestMacro: VirtualMacrotaskEntry | null = null;
      for (const m of loop.macrotasks) {
        if (m.status !== 'waiting') continue;
        if (!bestMacro || m.fireAt < bestMacro.fireAt || (m.fireAt === bestMacro.fireAt && m.id < bestMacro.id)) {
          bestMacro = m;
        }
      }
      if (bestMacro) {
        bestMacro.status = 'running';
        loop.virtualTime = Math.max(loop.virtualTime, bestMacro.fireAt);
        loop.phase = 'macrotask';
        loop.activeTaskLabel = `${bestMacro.label} @ ${loop.virtualTime}ms`;
        try {
          if (typeof bestMacro.cb === 'function') {
            const cbSrc = Function.prototype.toString.call(bestMacro.cb);
            if (!cbSrc.includes('__t(') && typeof __t === 'function') {
              __t(bestMacro.line || 1, `⚡ [宏任务 @ ${loop.virtualTime}ms] ${bestMacro.label}`, loop.globalSnapFn);
            }
            bestMacro.cb(...(bestMacro.args || []));
          }
        } catch (err) {
          rethrowIfControlSignal(err);
          throw err;
        } finally {
          if (bestMacro.status === 'running') bestMacro.status = 'done';
        }
        continue;
      }

      break;
    }

    loop.phase = 'idle';
    loop.activeTaskLabel = '事件循环已清空 (Idle)';

    const vp = (entryVal && typeof entryVal === 'object' && '__isVirtualPromise' in entryVal)
      ? (entryVal as { __isVirtualPromise?: boolean; state?: string; reason?: unknown; value?: unknown })
      : null;
    if (vp && vp.__isVirtualPromise) {
      if (vp.state === 'rejected') {
        throw vp.reason instanceof Error ? vp.reason : new Error(String(vp.reason));
      }
      if (vp.state === 'fulfilled') {
        return vp.value;
      }
    }
    return entryVal;
  }

  function toVizSnapshot(): EventLoopSnapshot {
    return {
      kind: 'eventloop',
      now: loop.virtualTime,
      virtualTime: loop.virtualTime,
      phase: loop.phase,
      activeTask: loop.activeTaskLabel,
      activeTaskLabel: loop.activeTaskLabel,
      coroutines: loop.coroutines.slice(-8).map((c: { id: number; name: string; line: number; status: string; awaitExpr: string | null }) => ({
        id: c.id,
        name: c.name,
        line: c.line,
        status: c.status,
        awaitExpr: c.awaitExpr,
        awaitingExpr: c.awaitExpr,
      })),
      microtasks: loop.microtasks.filter((m: { status: string }) => m.status !== 'done').concat(
        loop.microtasks.filter((m: { status: string }) => m.status === 'done').slice(-3)
      ).slice(0, 8).map((m: { id: number; label: string; line: number; status: string }) => ({
        id: m.id,
        label: m.label,
        line: m.line,
        status: m.status,
      })),
      macrotasks: loop.macrotasks.filter((m: { status: string }) => m.status !== 'done' && m.status !== 'cancelled').concat(
        loop.macrotasks.filter((m: { status: string }) => m.status === 'done').slice(-3)
      ).slice(0, 8).map((m: { id: number; label: string; delay: number; fireAt: number; line: number; status: string }) => ({
        id: m.id,
        label: m.label,
        delay: m.delay,
        due: m.fireAt,
        fireAt: m.fireAt,
        line: m.line,
        status: m.status,
      })),
      promises: loop.promises.filter((p: { _internal?: boolean }) => !p._internal).slice(-8).map((p: { id: number; label: string; state: string; value: unknown; reason: unknown; reactions?: unknown[]; line: number }) => ({
        id: p.id,
        label: p.label,
        state: p.state,
        value: p.state === 'fulfilled' ? formatShortVal(p.value) : (p.state === 'rejected' ? formatShortVal(p.reason) : 'pending'),
        valStr: p.state === 'fulfilled' ? formatShortVal(p.value) : (p.state === 'rejected' ? formatShortVal(p.reason) : 'pending'),
        reactions: p.reactions ? p.reactions.length : 0,
        line: p.line,
      })),
    };
  }

  return {
    loop,
    env,
    runAsyncCoroutine,
    drainEventLoop,
    toVizSnapshot,
  };
}

export function formatCallArgItem(val: unknown): string {
  if (val === undefined) return 'undefined';
  if (val === null) return 'null';
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (typeof val === 'string') {
    return val.length > 10 ? JSON.stringify(val.slice(0, 8) + '…') : JSON.stringify(val);
  }
  if (Array.isArray(val)) {
    if (val.length === 0) return '[]';
    if (Array.isArray(val[0])) return `[${val.length}×${val[0].length}]`;
    if (val.length <= 4) return '[' + val.map((x: unknown): string => formatCallArgItem(x)).join(', ') + ']';
    return '[' + val.slice(0, 3).map((x: unknown): string => formatCallArgItem(x)).join(', ') + ', …]';
  }
  if (isMapLike(val)) return `Map(${(val as Map<unknown, unknown>).size})`;
  if (isSetLike(val)) return `Set(${(val as Set<unknown>).size})`;
  if (typeof val === 'object') {
    if ('val' in val && ('left' in val || 'right' in val)) return `Tree(${(val as { val: unknown }).val})`;
    if ('val' in val && 'next' in val) return `List(${(val as { val: unknown }).val})`;
    return '{…}';
  }
  return String(val);
}

export function formatCallFrameLabel(fnName: string, _paramNames: unknown, paramVals: unknown) {
  const vals = Array.isArray(paramVals) ? paramVals : [];
  if (!vals.length) return `${fnName}()`;
  const isPrimitive = (v: unknown) => v === null || v === undefined || typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean';
  const primVals = vals.filter(isPrimitive);
  const hasComplex = vals.some((v: unknown) => !isPrimitive(v));
  // If a function takes a container alongside >=2 numeric range indices (e.g. mergeSort(arr, 0, 7)), display the numeric indices cleanly as mergeSort(0, 7)
  if (hasComplex && primVals.length >= 2 && primVals.every((v: unknown) => typeof v === 'number')) {
    return `${fnName}(${primVals.map((v: unknown) => formatCallArgItem(v)).join(', ')})`;
  }
  return `${fnName}(${vals.map((v: unknown) => formatCallArgItem(v)).join(', ')})`;
}

export function resetTraceState() {
  stopAuto();
  clearFlyLayer();
  TRACE = { title: 'TypeScript Playground · Debug', code: [], steps: [] };
  DEBUG_SESSION = {
    active: false,
    finished: false,
    crashed: false,
    error: null,
    errorLine: -1,
    returnValue: undefined,
    compiledFn: null,
    originalLines: [],
    callExpr: 'undefined',
  };
  RUNTIME_ERROR_LINES.clear();
  cur = 0;
  watched = new Set();
  SEEN_VARS_EVER = new Set();
  layoutSpan = Object.create(null);
  renderPicker();
  renderStatic(0);
  updateEditorChrome();
}

