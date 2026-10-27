/* ================================================================
   Virtual Promise, Virtual FS Module Shims & Async Coroutine Driver (src/runtime/event-loop-env.ts)
   ================================================================ */
import { formatShortVal } from "../utils/format";
import type { VfsClientApi } from "../globals";

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


export function rethrowIfControlSignal(err: unknown) {
  const ctrl = (err && typeof err === 'object')
    ? (err as { __debugPause?: boolean; __timeout?: boolean })
    : null;
  if (err === PAUSE_SIGNAL || (ctrl && (ctrl.__debugPause || ctrl.__timeout))) {
    throw err;
  }
}

export function getOrCreateVfsApi(): VfsClientApi {
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
}

export interface PromiseHandler<TPromise> {
  onFulfilled?: ((v: unknown) => unknown) | null;
  onRejected?: ((r: unknown) => unknown) | null;
  child: TPromise;
  line?: number;
  label?: string;
  isInternalAwait?: boolean;
}

export function createVirtualPromiseAndFsEnv(opts: {
  loop: VirtualLoopState;
  getCurLine: () => number;
  nextPromiseId: () => number;
  enqueueMicrotask: (item: {
    label?: string;
    line?: number;
    isInternalAwait?: boolean;
    run: () => void;
    rawCb?: unknown;
  }) => VirtualMicrotaskEntry;
  __t: ((line?: number, note?: string, snap?: unknown, self?: unknown) => void) | null | undefined;
}) {
  const { loop, getCurLine, nextPromiseId, enqueueMicrotask, __t } = opts;

  class VirtualPromise implements VirtualPromiseLike {
    __isVirtualPromise: boolean;
    id: number;
    label: string;
    state: string;
    value: unknown;
    reason: unknown;
    line: number;
    _handlers: Array<PromiseHandler<VirtualPromise>>;
    _internal?: boolean;
    reactions?: unknown[];

    constructor(
      executor?: ((resolve: (val?: unknown) => void, reject: (reason?: unknown) => void) => void) | null,
      label?: string
    ) {
      loop.used = true;
      this.__isVirtualPromise = true;
      this.id = nextPromiseId();
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

    _scheduleHandler(h: PromiseHandler<VirtualPromise>) {
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
      if (isInternalAwait) child._internal = true;
      const handler: PromiseHandler<VirtualPromise> = {
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

  const readRequiredVfsFile = (p: string): string => {
    const content = getOrCreateVfsApi().readFile(p);
    if (content === null) {
      throw new Error(`ENOENT: no such file or directory, open '${p}'`);
    }
    return content;
  };

  const fsPromisesApi = {
    readFile(p: string, _encoding?: string) {
      loop.used = true;
      return new VirtualPromise((resolve: (v?: unknown) => void, reject: (r?: unknown) => void) => {
        try { resolve(readRequiredVfsFile(p)); } catch (e) { reject(e); }
      }, `fs.readFile(${formatShortVal(p)})`);
    },
    writeFile(p: string, data: unknown, _encoding?: string) {
      loop.used = true;
      return new VirtualPromise((resolve: (v?: unknown) => void, reject: (r?: unknown) => void) => {
        try {
          getOrCreateVfsApi().writeFile(p, typeof data === 'string' ? data : String(data ?? ''));
          resolve(undefined);
        } catch (e) { reject(e); }
      }, `fs.writeFile(${formatShortVal(p)})`);
    },
    appendFile(p: string, data: unknown, _encoding?: string) {
      loop.used = true;
      return new VirtualPromise((resolve: (v?: unknown) => void, reject: (r?: unknown) => void) => {
        try {
          getOrCreateVfsApi().appendFile(p, typeof data === 'string' ? data : String(data ?? ''));
          resolve(undefined);
        } catch (e) { reject(e); }
      }, `fs.appendFile(${formatShortVal(p)})`);
    },
    readdir(p?: string) {
      loop.used = true;
      return new VirtualPromise((resolve: (v?: unknown) => void, reject: (r?: unknown) => void) => {
        try { resolve(getOrCreateVfsApi().readdir(p)); } catch (e) { reject(e); }
      }, `fs.readdir(${formatShortVal(p || '.')})`);
    },
    mkdir(p: string, _options?: unknown) {
      loop.used = true;
      return new VirtualPromise((resolve: (v?: unknown) => void, reject: (r?: unknown) => void) => {
        try { getOrCreateVfsApi().mkdir(p); resolve(undefined); } catch (e) { reject(e); }
      }, `fs.mkdir(${formatShortVal(p)})`);
    },
    unlink(p: string) {
      loop.used = true;
      return new VirtualPromise((resolve: (v?: unknown) => void, reject: (r?: unknown) => void) => {
        try { getOrCreateVfsApi().unlink(p); resolve(undefined); } catch (e) { reject(e); }
      }, `fs.unlink(${formatShortVal(p)})`);
    },
    rm(p: string, _options?: unknown) {
      loop.used = true;
      return new VirtualPromise((resolve: (v?: unknown) => void, reject: (r?: unknown) => void) => {
        try { getOrCreateVfsApi().unlink(p); resolve(undefined); } catch (e) { reject(e); }
      }, `fs.rm(${formatShortVal(p)})`);
    },
    stat(p: string) {
      loop.used = true;
      return new VirtualPromise((resolve: (v?: unknown) => void, reject: (r?: unknown) => void) => {
        try { resolve(getOrCreateVfsApi().stat(p)); } catch (e) { reject(e); }
      }, `fs.stat(${formatShortVal(p)})`);
    },
    exists(p: string) {
      loop.used = true;
      return new VirtualPromise((resolve: (v?: unknown) => void, reject: (r?: unknown) => void) => {
        try { resolve(getOrCreateVfsApi().exists(p)); } catch (e) { reject(e); }
      }, `fs.exists(${formatShortVal(p)})`);
    },
    access(p: string, _mode?: number) {
      loop.used = true;
      return new VirtualPromise((resolve: (v?: unknown) => void, reject: (r?: unknown) => void) => {
        try { getOrCreateVfsApi().stat(p); resolve(undefined); } catch (e) { reject(e); }
      }, `fs.access(${formatShortVal(p)})`);
    },
    copyFile(srcPath: string, destPath: string) {
      loop.used = true;
      return new VirtualPromise((resolve: (v?: unknown) => void, reject: (r?: unknown) => void) => {
        try {
          const content = readRequiredVfsFile(srcPath);
          getOrCreateVfsApi().writeFile(destPath, content);
          resolve(undefined);
        } catch (e) { reject(e); }
      }, `fs.copyFile(${formatShortVal(srcPath)})`);
    },
    rename(oldPath: string, newPath: string) {
      loop.used = true;
      return new VirtualPromise((resolve: (v?: unknown) => void, reject: (r?: unknown) => void) => {
        try {
          const content = readRequiredVfsFile(oldPath);
          getOrCreateVfsApi().writeFile(newPath, content);
          getOrCreateVfsApi().unlink(oldPath);
          resolve(undefined);
        } catch (e) { reject(e); }
      }, `fs.rename(${formatShortVal(oldPath)})`);
    },
  };

  const fsModuleEnv = {
    promises: fsPromisesApi,
    readFileSync(p: string, _encoding?: string) {
      return readRequiredVfsFile(p);
    },
    writeFileSync(p: string, data: unknown, _encoding?: string) {
      getOrCreateVfsApi().writeFile(p, typeof data === 'string' ? data : String(data ?? ''));
    },
    appendFileSync(p: string, data: unknown, _encoding?: string) {
      getOrCreateVfsApi().appendFile(p, typeof data === 'string' ? data : String(data ?? ''));
    },
    existsSync(p: string) {
      try { return getOrCreateVfsApi().exists(p); } catch (_) { return false; }
    },
    readdirSync(p?: string) {
      return getOrCreateVfsApi().readdir(p);
    },
    mkdirSync(p: string, _options?: unknown) {
      getOrCreateVfsApi().mkdir(p);
    },
    unlinkSync(p: string) {
      getOrCreateVfsApi().unlink(p);
    },
    rmSync(p: string, _options?: unknown) {
      getOrCreateVfsApi().unlink(p);
    },
    statSync(p: string) {
      return getOrCreateVfsApi().stat(p);
    },
    copyFileSync(srcPath: string, destPath: string) {
      const content = readRequiredVfsFile(srcPath);
      getOrCreateVfsApi().writeFile(destPath, content);
    },
    renameSync(oldPath: string, newPath: string) {
      const content = readRequiredVfsFile(oldPath);
      getOrCreateVfsApi().writeFile(newPath, content);
      getOrCreateVfsApi().unlink(oldPath);
    },
  };

  return { VirtualPromise, fsModuleEnv };
}
