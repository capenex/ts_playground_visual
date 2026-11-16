/* ================================================================
   Pure Virtual File System Store (/workspace) & Node fs Shim (src/runtime/vfs-store.ts)
   Zero DOM dependencies — safe for headless Node.js execution & unit testing
   ================================================================ */

import { isRecord } from "../utils/format";

export interface VfsNode {
  path: string;
  name: string;
  type: "file" | "folder";
  parentPath: string;
  content?: string;
  readonly?: boolean;
}

export const VFS_STORAGE_KEY = "ts-visual-vfs-workspace-v2";
let vfsBootInitialized = false;

export const VFS_EXPANDED_FOLDERS = new Set<string>();
export const VFS_NODES = new Map<string, VfsNode>();

const vfsListeners = new Set<() => void>();

export interface VfsStorageAdapter {
  load: () => string | null;
  save: (rawJson: string) => void;
}

let vfsStorageAdapter: VfsStorageAdapter | null = null;

export function registerVfsStorageAdapter(adapter: VfsStorageAdapter): void {
  vfsStorageAdapter = adapter;
}

export function subscribeVfsStore(listener: () => void): () => void {
  vfsListeners.add(listener);
  return () => {
    vfsListeners.delete(listener);
  };
}

export function notifyVfsStoreChanged(): void {
  vfsListeners.forEach((fn) => fn());
}

export function resolveWorkspacePath(rawPath: string, allowEmptyRoot = false): string {
  const raw = String(rawPath ?? "").trim().replace(/\\/g, "/");
  if (
    !raw ||
    raw === "." ||
    raw === "./" ||
    raw === "workspace" ||
    raw === "/workspace" ||
    raw === "workspace/" ||
    raw === "/workspace/"
  ) {
    if (allowEmptyRoot) return "";
    throw new Error(`EISDIR: illegal operation on workspace root directory '${rawPath}'`);
  }
  if (/^[A-Za-z]:/.test(raw) || raw.startsWith("~")) {
    throw new Error(`EACCES: permission denied, file operations outside workspace are not allowed: '${rawPath}'`);
  }
  if (raw.startsWith("/")) {
    if (raw !== "/workspace" && !raw.startsWith("/workspace/")) {
      throw new Error(`EACCES: permission denied, file operations outside workspace are not allowed: '${rawPath}'`);
    }
  }
  let stripped = raw;
  if (stripped.startsWith("/workspace/")) {
    stripped = stripped.slice("/workspace/".length);
  } else if (stripped.startsWith("workspace/")) {
    stripped = stripped.slice("workspace/".length);
  } else if (stripped.startsWith("./")) {
    stripped = stripped.slice(2);
  }
  const rawSegments = stripped.split("/");
  const resolved: string[] = [];
  for (const seg of rawSegments) {
    if (!seg || seg === ".") continue;
    if (seg === "..") {
      if (resolved.length === 0) {
        throw new Error(`EACCES: permission denied, file operations outside workspace are not allowed: '${rawPath}'`);
      }
      resolved.pop();
      continue;
    }
    resolved.push(seg);
  }
  const firstSeg = resolved[0] || "";
  if (firstSeg === "examples" || firstSeg === "notebooks") {
    throw new Error(`EACCES: permission denied, file operations outside workspace are not allowed: '${rawPath}'`);
  }
  const finalPath = resolved.join("/");
  if (!finalPath && !allowEmptyRoot) {
    throw new Error(`EISDIR: illegal operation on workspace root directory '${rawPath}'`);
  }
  return finalPath;
}

function isPersistedVfsNode(item: unknown): item is VfsNode {
  if (!isRecord(item)) return false;
  return (
    typeof item.path === "string" &&
    typeof item.name === "string" &&
    (item.type === "file" || item.type === "folder")
  );
}

export function ensureVfsInitialized(): void {
  if (vfsBootInitialized) return;
  vfsBootInitialized = true;
  VFS_NODES.clear();
  try {
    if (vfsStorageAdapter) {
      const raw = vfsStorageAdapter.load();
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (isPersistedVfsNode(item)) {
              VFS_NODES.set(item.path, {
                path: item.path,
                name: item.name,
                type: item.type,
                parentPath: typeof item.parentPath === "string" ? item.parentPath : "",
                content: typeof item.content === "string" ? item.content : undefined,
                readonly: Boolean(item.readonly),
              });
            }
          }
        }
      }
    }
  } catch (_) {
    /* ignore storage errors */
  }
}

export function persistVfsToClientStorage(): void {
  try {
    if (!vfsStorageAdapter) return;
    const customNodes: VfsNode[] = [];
    VFS_NODES.forEach((node) => {
      customNodes.push(node);
    });
    vfsStorageAdapter.save(JSON.stringify(customNodes));
  } catch (_) {
    /* ignore storage errors */
  }
}

export function ensureParentFoldersExist(relPath: string): void {
  const parts = relPath.split("/").filter(Boolean);
  if (parts.length <= 1) return;
  let acc = "";
  for (let i = 0; i < parts.length - 1; i++) {
    const folderName = parts[i] || "";
    const parentPath = acc;
    acc = acc ? `${acc}/${folderName}` : folderName;
    if (!VFS_NODES.has(acc)) {
      VFS_NODES.set(acc, {
        path: acc,
        name: folderName,
        type: "folder",
        parentPath,
      });
      VFS_EXPANDED_FOLDERS.add(acc);
    }
  }
}

export function serializeFsData(data: unknown): string {
  if (typeof data === "string") return data;
  if (data instanceof Uint8Array) {
    return typeof TextDecoder !== "undefined" ? new TextDecoder().decode(data) : String(data);
  }
  if (data !== null && typeof data === "object") {
    try {
      return JSON.stringify(data, null, 2);
    } catch (_) {
      return String(data);
    }
  }
  return String(data ?? "");
}

export function createVfsCoreApi() {
  const api = {
    resolveWorkspacePath(rawPath: string, allowEmptyRoot = false): string {
      return resolveWorkspacePath(rawPath, allowEmptyRoot);
    },
    readFile(path: string): string | null {
      ensureVfsInitialized();
      const rel = resolveWorkspacePath(path, false);
      const node = VFS_NODES.get(rel);
      if (!node) return null;
      if (node.type === "folder") {
        throw new Error(`EISDIR: illegal operation on a directory, read '${path}'`);
      }
      return node.content ?? "";
    },
    writeFile(path: string, content: string): boolean {
      ensureVfsInitialized();
      const rel = resolveWorkspacePath(path, false);
      const existing = VFS_NODES.get(rel);
      if (existing && existing.type === "folder") {
        throw new Error(`EISDIR: illegal operation on a directory, open '${path}'`);
      }
      ensureParentFoldersExist(rel);
      const parts = rel.split("/");
      const name = parts.pop() || rel;
      const parentPath = parts.join("/");
      VFS_NODES.set(rel, {
        path: rel,
        name,
        type: "file",
        parentPath,
        content: serializeFsData(content),
      });
      persistVfsToClientStorage();
      notifyVfsStoreChanged();
      return true;
    },
    appendFile(path: string, content: string): boolean {
      ensureVfsInitialized();
      const rel = resolveWorkspacePath(path, false);
      const existing = VFS_NODES.get(rel);
      if (existing && existing.type === "folder") {
        throw new Error(`EISDIR: illegal operation on a directory, open '${path}'`);
      }
      const prev = existing && existing.type === "file" ? (existing.content ?? "") : "";
      return api.writeFile(rel, prev + serializeFsData(content));
    },
    listFiles(dirPath = ""): string[] {
      ensureVfsInitialized();
      const rel = resolveWorkspacePath(dirPath, true);
      if (rel !== "") {
        const dirNode = VFS_NODES.get(rel);
        if (!dirNode) {
          throw new Error(`ENOENT: no such file or directory, scandir '${dirPath}'`);
        }
        if (dirNode.type !== "folder") {
          throw new Error(`ENOTDIR: not a directory, scandir '${dirPath}'`);
        }
      }
      const out: string[] = [];
      VFS_NODES.forEach((node) => {
        if (node.parentPath === rel) out.push(node.name);
      });
      return out;
    },
    readdir(dirPath = ""): string[] {
      return api.listFiles(dirPath);
    },
    listAll(): string[] {
      ensureVfsInitialized();
      return Array.from(VFS_NODES.keys()).sort();
    },
    exists(path: string): boolean {
      ensureVfsInitialized();
      const rel = resolveWorkspacePath(path, true);
      if (rel === "") return true;
      return VFS_NODES.has(rel);
    },
    deleteFile(path: string): boolean {
      ensureVfsInitialized();
      const rel = resolveWorkspacePath(path, false);
      const node = VFS_NODES.get(rel);
      if (!node) {
        throw new Error(`ENOENT: no such file or directory, unlink '${path}'`);
      }
      const prefix = rel + "/";
      Array.from(VFS_NODES.keys()).forEach((k) => {
        if (k === rel || k.startsWith(prefix)) {
          VFS_NODES.delete(k);
        }
      });
      persistVfsToClientStorage();
      notifyVfsStoreChanged();
      return true;
    },
    unlink(path: string): boolean {
      return api.deleteFile(path);
    },
    mkdir(path: string): boolean {
      ensureVfsInitialized();
      const rel = resolveWorkspacePath(path, true);
      if (!rel) return true;
      ensureParentFoldersExist(rel + "/_");
      persistVfsToClientStorage();
      notifyVfsStoreChanged();
      return true;
    },
    stat(path: string) {
      ensureVfsInitialized();
      const rel = resolveWorkspacePath(path, true);
      if (rel === "") {
        return {
          size: 0,
          isFile: () => false,
          isDirectory: () => true,
        };
      }
      const node = VFS_NODES.get(rel);
      if (!node) {
        throw new Error(`ENOENT: no such file or directory, stat '${path}'`);
      }
      const isDir = node.type === "folder";
      const size = isDir ? 0 : (node.content ?? "").length;
      return {
        size,
        isFile: () => !isDir,
        isDirectory: () => isDir,
      };
    },
    clear(): void {
      ensureVfsInitialized();
      VFS_NODES.clear();
      persistVfsToClientStorage();
      notifyVfsStoreChanged();
    },
  };
  return api;
}

/* Expose client-side VFS API on globalThis.__VFS__ and Node-compatible fs shim on globalThis.__FS_SHIM__ */
export function bindGlobalVfsApi(): void {
  const api = createVfsCoreApi();

  const fsPromises = {
    async readFile(path: string, _options?: unknown): Promise<string> {
      const content = api.readFile(path);
      if (content === null) {
        throw new Error(`ENOENT: no such file or directory, open '${path}'`);
      }
      return content;
    },
    async writeFile(path: string, data: unknown, _options?: unknown): Promise<void> {
      api.writeFile(path, serializeFsData(data));
    },
    async appendFile(path: string, data: unknown, _options?: unknown): Promise<void> {
      api.appendFile(path, serializeFsData(data));
    },
    async unlink(path: string): Promise<void> {
      api.deleteFile(path);
    },
    async rm(path: string, _options?: unknown): Promise<void> {
      api.deleteFile(path);
    },
    async readdir(path = "", _options?: unknown): Promise<string[]> {
      return api.listFiles(path);
    },
    async mkdir(path: string, _options?: unknown): Promise<string | undefined> {
      api.mkdir(path);
      return undefined;
    },
    async rmdir(path: string, _options?: unknown): Promise<void> {
      api.deleteFile(path);
    },
    async stat(path: string) {
      return api.stat(path);
    },
    async access(path: string, _mode?: number): Promise<void> {
      if (!api.exists(path)) {
        throw new Error(`ENOENT: no such file or directory, access '${path}'`);
      }
    },
    async exists(path: string): Promise<boolean> {
      return api.exists(path);
    },
    async copyFile(src: string, dest: string): Promise<void> {
      const content = api.readFile(src);
      if (content === null) {
        throw new Error(`ENOENT: no such file or directory, copyfile '${src}'`);
      }
      api.writeFile(dest, content);
    },
    async rename(oldPath: string, newPath: string): Promise<void> {
      const content = api.readFile(oldPath);
      if (content === null) {
        throw new Error(`ENOENT: no such file or directory, rename '${oldPath}'`);
      }
      api.writeFile(newPath, content);
      api.deleteFile(oldPath);
    },
  };

  const fsShim = {
    promises: fsPromises,
    readFileSync(path: string, _options?: unknown): string {
      const content = api.readFile(path);
      if (content === null) {
        throw new Error(`ENOENT: no such file or directory, open '${path}'`);
      }
      return content;
    },
    writeFileSync(path: string, data: unknown, _options?: unknown): void {
      api.writeFile(path, serializeFsData(data));
    },
    appendFileSync(path: string, data: unknown, _options?: unknown): void {
      api.appendFile(path, serializeFsData(data));
    },
    existsSync(path: string): boolean {
      return api.exists(path);
    },
    unlinkSync(path: string): void {
      api.deleteFile(path);
    },
    rmSync(path: string, _options?: unknown): void {
      api.deleteFile(path);
    },
    readdirSync(path = ""): string[] {
      return api.listFiles(path);
    },
    mkdirSync(path: string, _options?: unknown): string | undefined {
      api.mkdir(path);
      return undefined;
    },
    rmdirSync(path: string, _options?: unknown): void {
      api.deleteFile(path);
    },
    statSync(path: string) {
      return api.stat(path);
    },
    copyFileSync(src: string, dest: string): void {
      const content = api.readFile(src);
      if (content === null) {
        throw new Error(`ENOENT: no such file or directory, copyfile '${src}'`);
      }
      api.writeFile(dest, content);
    },
    renameSync(oldPath: string, newPath: string): void {
      const content = api.readFile(oldPath);
      if (content === null) {
        throw new Error(`ENOENT: no such file or directory, rename '${oldPath}'`);
      }
      api.writeFile(newPath, content);
      api.deleteFile(oldPath);
    },
  };

  globalThis.__VFS__ = api;
  globalThis.vfs = api;
  globalThis.__FS_SHIM__ = fsShim;
}
