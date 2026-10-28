/* ================================================================
   Pure Value Formatting, Inspection & Bounded Cloning Utilities (src/utils/format.ts)
   ================================================================ */
import type { Frame } from "../types";

export function isMapLike(v: unknown): v is Map<unknown, unknown> {
  return Object.prototype.toString.call(v) === '[object Map]';
}

export function isSetLike(v: unknown): v is Set<unknown> {
  return Object.prototype.toString.call(v) === '[object Set]';
}

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

export function isFrame(v: unknown): v is Frame {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function defineHidden(obj: unknown, key: string, val: unknown): void {
  if (!obj || typeof obj !== 'object') return;
  try {
    Object.defineProperty(obj, key, {
      value: val,
      enumerable: false,
      configurable: true,
      writable: true,
    });
  } catch (_) {}
}

export function formatShortVal(val: unknown): string {
  if (val === undefined) return 'undefined';
  if (val === null) return 'null';
  if (typeof val === 'string') return JSON.stringify(val.length > 16 ? val.slice(0, 14) + '…' : val);
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (Array.isArray(val)) return '[' + val.slice(0, 4).map(formatShortVal).join(', ') + (val.length > 4 ? ', …' : '') + ']';
  if (isMapLike(val)) return 'Map(' + val.size + ')';
  if (isSetLike(val)) return 'Set(' + val.size + ')';
  if (isRecord(val)) {
    const keys = Object.keys(val);
    if (keys.length > 0 && keys.length <= 4 && keys.every(k => val[k] === null || typeof val[k] !== 'object')) {
      return '{ ' + keys.map((k: string): string => k + ': ' + formatShortVal(val[k])).join(', ') + ' }';
    }
  }
  return '{…}';
}

export function cloneDeepBounded(val: unknown, depth = 0): unknown {
  if (!isRecord(val)) return val;
  if (val.__isVirtualPromise) {
    if (val.state === 'pending') return 'Promise <pending>';
    if (val.state === 'fulfilled') return 'Promise <fulfilled: ' + formatShortVal(val.value) + '>';
    return 'Promise <rejected: ' + formatShortVal(val.reason) + '>';
  }
  if (depth >= 4) return String(val);
  if (Array.isArray(val)) return val.slice(0, 40).map((x: unknown): unknown => cloneDeepBounded(x, depth + 1));
  if (isMapLike(val)) {
    const entries: Array<{ k: unknown; v: unknown }> = [];
    for (const [k, v] of val) {
      if (entries.length >= 40) break;
      entries.push({ k: cloneDeepBounded(k, depth + 1), v: cloneDeepBounded(v, depth + 1) });
    }
    return entries;
  }
  if (isSetLike(val)) {
    const items: unknown[] = [];
    for (const v of val) {
      if (items.length >= 40) break;
      items.push(cloneDeepBounded(v, depth + 1));
    }
    return items;
  }
  const out: Record<string, unknown> = {};
  const clsName =
    typeof val.__cls__ === 'string' && val.__cls__
      ? val.__cls__
      : val.constructor && val.constructor !== Object && val.constructor.name
      ? val.constructor.name
      : '';
  if (clsName) {
    defineHidden(out, '__cls__', clsName);
  }
  Object.keys(val).slice(0, 20).forEach(k => {
    out[k] = cloneDeepBounded(val[k], depth + 1);
  });
  return out;
}

export function safeJSONStringify(val: unknown): string {
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
