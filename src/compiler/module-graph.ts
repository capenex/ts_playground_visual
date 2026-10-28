/* ================================================================
   Multi-File TypeScript Module Resolver, Dependency Graph & ESM-to-CJS Rewriter
   (src/compiler/module-graph.ts) — Layer 3 Pure Compiler Module (0 DOM)
   ================================================================ */
import { splitTopLevel, stripInlineCommentSafe } from './comments';
import { transpileFsImportStatement } from './transpile-helpers';
import type { Diag } from '../types';

export interface ModuleImportBinding {
  imported: string;
  local: string;
  isTypeOnly: boolean;
}

export interface ModuleImportSpec {
  line: number;
  specifier: string;
  resolvedPath: string | null;
  isTypeOnly: boolean;
  isBuiltinFs: boolean;
  bindings: ModuleImportBinding[];
}

export interface ModuleExportSpec {
  line: number;
  exported: string;
  local: string;
  kind: 'value' | 'type' | 'function' | 'class' | 'enum' | 'reexport';
  reexportSpecifier?: string;
}

export interface ModuleNode {
  file: string;
  rawSource: string;
  lines: string[];
  imports: ModuleImportSpec[];
  exports: ModuleExportSpec[];
  dependencies: string[];
}

export interface ModuleGraphResult {
  entryFile: string;
  isMultiFile: boolean;
  order: string[];
  modules: Map<string, ModuleNode>;
  diagnostics: Diag[];
}

export function normalizeWorkspaceModulePath(rawPath: string): string {
  const cleaned = String(rawPath ?? '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\/+/, '');
  const stripped = cleaned.startsWith('workspace/')
    ? cleaned.slice('workspace/'.length)
    : cleaned.startsWith('./')
      ? cleaned.slice(2)
      : cleaned;
  const parts = stripped.split('/');
  const resolved: string[] = [];
  for (const seg of parts) {
    if (!seg || seg === '.') continue;
    if (seg === '..') {
      if (resolved.length > 0) resolved.pop();
      continue;
    }
    resolved.push(seg);
  }
  return resolved.join('/');
}

export function resolveModuleImportPath(
  fromFile: string,
  specifier: string,
  availableFiles?: ReadonlyMap<string, string> | null
): string | null {
  const spec = String(specifier ?? '').trim();
  if (!spec) return null;
  if (spec === 'fs' || spec === 'node:fs' || spec === 'fs/promises' || spec === 'node:fs/promises') {
    return 'fs';
  }

  const normFrom = normalizeWorkspaceModulePath(fromFile || 'main.ts');
  const fromParts = normFrom.split('/').filter(Boolean);
  fromParts.pop(); // directory of fromFile

  let targetSegments: string[] = [];
  if (spec.startsWith('./') || spec.startsWith('../')) {
    targetSegments = [...fromParts];
    const relParts = spec.split('/');
    for (const seg of relParts) {
      if (!seg || seg === '.') continue;
      if (seg === '..') {
        if (targetSegments.length === 0) return null;
        targetSegments.pop();
      } else {
        targetSegments.push(seg);
      }
    }
  } else if (spec.startsWith('/workspace/') || spec.startsWith('workspace/')) {
    const norm = normalizeWorkspaceModulePath(spec);
    targetSegments = norm.split('/').filter(Boolean);
  } else if (spec.startsWith('/')) {
    const norm = normalizeWorkspaceModulePath(spec.slice(1));
    targetSegments = norm.split('/').filter(Boolean);
  } else {
    // Bare specifier: check workspace relative to root or fromFile directory
    const norm = normalizeWorkspaceModulePath(spec);
    targetSegments = norm.split('/').filter(Boolean);
  }

  const baseCandidate = targetSegments.join('/');
  if (!baseCandidate) return null;

  const candidates: string[] = [];
  if (/\.[A-Za-z0-9]+$/.test(baseCandidate)) {
    candidates.push(baseCandidate);
    if (baseCandidate.endsWith('.js')) {
      candidates.push(baseCandidate.slice(0, -3) + '.ts');
    }
  } else {
    candidates.push(baseCandidate + '.ts');
    candidates.push(baseCandidate + '.tsx');
    candidates.push(baseCandidate + '.js');
    candidates.push(baseCandidate + '/index.ts');
  }

  // Also check relative to root if fromFile was in a subfolder and user wrote a root-relative path
  if (fromParts.length > 0 && !spec.startsWith('.')) {
    const dirCandidate = [...fromParts, ...targetSegments].join('/');
    if (!/\.[A-Za-z0-9]+$/.test(dirCandidate)) {
      candidates.push(dirCandidate + '.ts');
    } else {
      candidates.push(dirCandidate);
    }
  }

  if (availableFiles && availableFiles.size > 0) {
    for (const cand of candidates) {
      if (availableFiles.has(cand)) return cand;
    }
    // Case-insensitive or basename fallback if exact path not matched
    for (const cand of candidates) {
      const lower = cand.toLowerCase();
      for (const existingKey of availableFiles.keys()) {
        if (existingKey.toLowerCase() === lower) return existingKey;
      }
    }
    return null;
  }

  return candidates[0] || null;
}

function parseNamedSpecifiersList(
  braceInner: string,
  parentTypeOnly: boolean
): ModuleImportBinding[] {
  const bindings: ModuleImportBinding[] = [];
  const parts = splitTopLevel(braceInner);
  for (const rawPart of parts) {
    let part = rawPart.trim();
    if (!part) continue;
    let isTypeOnly = parentTypeOnly;
    if (/^type\s+/.test(part)) {
      isTypeOnly = true;
      part = part.replace(/^type\s+/, '').trim();
    }
    const asMatch = part.match(/^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/);
    const imported = asMatch && asMatch[1] ? asMatch[1] : part;
    const local = asMatch && asMatch[2] ? asMatch[2] : part;
    if (/^[A-Za-z_$][\w$]*$/.test(imported) && /^[A-Za-z_$][\w$]*$/.test(local)) {
      bindings.push({ imported, local, isTypeOnly });
    }
  }
  return bindings;
}

export function parseModuleImportsAndExports(
  src: string,
  currentFile = 'main.ts',
  availableFiles?: ReadonlyMap<string, string> | null
): {
  imports: ModuleImportSpec[];
  exports: ModuleExportSpec[];
  hasRelativeImports: boolean;
} {
  const lines = String(src ?? '').replace(/\r/g, '').split('\n');
  const imports: ModuleImportSpec[] = [];
  const exports: ModuleExportSpec[] = [];
  let hasRelativeImports = false;

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const rawLine = lines[i] ?? '';
    const trimmed = stripInlineCommentSafe(rawLine).trim();
    if (!trimmed) continue;

    // 1. Parse import statements
    if (/^import\b/.test(trimmed)) {
      const cleanStmt = trimmed.replace(/;\s*$/, '').trim();
      // Side-effect import: `import './mod'`
      const sideEffectM = cleanStmt.match(/^import\s+(['"])([^'"]+)\1$/);
      if (sideEffectM && sideEffectM[2]) {
        const spec = sideEffectM[2].trim();
        const isBuiltinFs = spec === 'fs' || spec === 'node:fs' || spec === 'fs/promises' || spec === 'node:fs/promises';
        if (!isBuiltinFs) hasRelativeImports = true;
        imports.push({
          line: lineNum,
          specifier: spec,
          resolvedPath: resolveModuleImportPath(currentFile, spec, availableFiles),
          isTypeOnly: false,
          isBuiltinFs,
          bindings: [],
        });
        continue;
      }

      const impM = cleanStmt.match(/^import\s+(type\s+)?([\s\S]+?)\s+from\s+(['"])([^'"]+)\3$/);
      if (impM && impM[2] && impM[4]) {
        const isTypeOnly = Boolean(impM[1]);
        const clause = impM[2].trim();
        const spec = impM[4].trim();
        const isBuiltinFs = spec === 'fs' || spec === 'node:fs' || spec === 'fs/promises' || spec === 'node:fs/promises';
        if (!isBuiltinFs) hasRelativeImports = true;
        const bindings: ModuleImportBinding[] = [];

        const nsM = clause.match(/^\*\s+as\s+([A-Za-z_$][\w$]*)$/);
        if (nsM && nsM[1]) {
          bindings.push({ imported: '*', local: nsM[1], isTypeOnly });
        } else if (clause.startsWith('{') && clause.endsWith('}')) {
          bindings.push(...parseNamedSpecifiersList(clause.slice(1, -1), isTypeOnly));
        } else {
          const defAndNamedM = clause.match(/^([A-Za-z_$][\w$]*)\s*,\s*\{([\s\S]*)\}$/);
          if (defAndNamedM && defAndNamedM[1] && defAndNamedM[2] !== undefined) {
            bindings.push({ imported: 'default', local: defAndNamedM[1], isTypeOnly });
            bindings.push(...parseNamedSpecifiersList(defAndNamedM[2], isTypeOnly));
          } else if (/^[A-Za-z_$][\w$]*$/.test(clause)) {
            bindings.push({ imported: 'default', local: clause, isTypeOnly });
          }
        }

        imports.push({
          line: lineNum,
          specifier: spec,
          resolvedPath: resolveModuleImportPath(currentFile, spec, availableFiles),
          isTypeOnly,
          isBuiltinFs,
          bindings,
        });
      }
      continue;
    }

    // 2. Parse export statements
    if (/^export\b/.test(trimmed)) {
      const cleanStmt = trimmed.replace(/;\s*$/, '').trim();

      // `export type { A, B as C }` or `export { a, b as c } from './mod'`
      const exportListM = cleanStmt.match(/^export\s+(type\s+)?\{([^}]*)\}(?:\s+from\s+(['"])([^'"]+)\3)?$/);
      if (exportListM && exportListM[2] !== undefined) {
        const isTypeExport = Boolean(exportListM[1]);
        const fromSpec = exportListM[4] ? exportListM[4].trim() : undefined;
        if (fromSpec) {
          hasRelativeImports = true;
          imports.push({
            line: lineNum,
            specifier: fromSpec,
            resolvedPath: resolveModuleImportPath(currentFile, fromSpec, availableFiles),
            isTypeOnly: isTypeExport,
            isBuiltinFs: false,
            bindings: [],
          });
        }
        const items = splitTopLevel(exportListM[2]);
        for (const rawItem of items) {
          let item = rawItem.trim();
          if (!item) continue;
          let itemTypeOnly = isTypeExport;
          if (/^type\s+/.test(item)) {
            itemTypeOnly = true;
            item = item.replace(/^type\s+/, '').trim();
          }
          const asM = item.match(/^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/);
          const local = asM && asM[1] ? asM[1] : item;
          const exported = asM && asM[2] ? asM[2] : item;
          if (/^[A-Za-z_$][\w$]*$/.test(local) && /^[A-Za-z_$][\w$]*$/.test(exported)) {
            exports.push({
              line: lineNum,
              exported,
              local,
              kind: fromSpec ? 'reexport' : (itemTypeOnly ? 'type' : 'value'),
              reexportSpecifier: fromSpec,
            });
          }
        }
        continue;
      }

      // `export interface Foo` / `export type Bar = ...`
      const typeExportM = cleanStmt.match(/^export\s+(?:declare\s+)?(interface|type)\s+([A-Za-z_$][\w$]*)/);
      if (typeExportM && typeExportM[2]) {
        exports.push({
          line: lineNum,
          exported: typeExportM[2],
          local: typeExportM[2],
          kind: 'type',
        });
        continue;
      }

      // `export enum E` / `export const enum E`
      const enumExportM = cleanStmt.match(/^export\s+(?:const\s+)?enum\s+([A-Za-z_$][\w$]*)/);
      if (enumExportM && enumExportM[1]) {
        exports.push({
          line: lineNum,
          exported: enumExportM[1],
          local: enumExportM[1],
          kind: 'enum',
        });
        continue;
      }

      // `export default function foo()` or `export function foo()`
      const fnExportM = cleanStmt.match(/^export\s+(default\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)?/);
      if (fnExportM) {
        const isDefault = Boolean(fnExportM[1]);
        const fnName = fnExportM[2] || '__default_export__';
        exports.push({
          line: lineNum,
          exported: isDefault ? 'default' : fnName,
          local: fnName,
          kind: 'function',
        });
        if (isDefault && fnExportM[2]) {
          exports.push({
            line: lineNum,
            exported: fnExportM[2],
            local: fnExportM[2],
            kind: 'function',
          });
        }
        continue;
      }

      // `export default class Cls` or `export class Cls`
      const clsExportM = cleanStmt.match(/^export\s+(default\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)?/);
      if (clsExportM) {
        const isDefault = Boolean(clsExportM[1]);
        const clsName = clsExportM[2] || '__default_export__';
        exports.push({
          line: lineNum,
          exported: isDefault ? 'default' : clsName,
          local: clsName,
          kind: 'class',
        });
        if (isDefault && clsExportM[2]) {
          exports.push({
            line: lineNum,
            exported: clsExportM[2],
            local: clsExportM[2],
            kind: 'class',
          });
        }
        continue;
      }

      // `export const a = 1, b = 2`
      const varExportM = cleanStmt.match(/^export\s+(?:const|let|var)\s+([\s\S]+)$/);
      if (varExportM && varExportM[1]) {
        const decls = splitTopLevel(varExportM[1]);
        for (const d of decls) {
          const idM = d.trim().match(/^([A-Za-z_$][\w$]*)/);
          if (idM && idM[1]) {
            exports.push({
              line: lineNum,
              exported: idM[1],
              local: idM[1],
              kind: 'value',
            });
          }
        }
        continue;
      }

      // `export default expr`
      if (/^export\s+default\b/.test(cleanStmt)) {
        exports.push({
          line: lineNum,
          exported: 'default',
          local: '__default_export__',
          kind: 'value',
        });
      }
    }
  }

  return { imports, exports, hasRelativeImports };
}

/**
 * Rewrites ES module `import` and `export` statements on a strictly line-by-line basis
 * so that line numbers 1..N are 100% preserved for `stripTypes` and `instrument`.
 */
export function rewriteModuleEsmToCjs(
  src: string,
  currentFile = 'main.ts',
  availableFiles?: ReadonlyMap<string, string> | null
): {
  code: string;
  exportedBindings: Array<{ exported: string; local: string }>;
} {
  const normCurrent = normalizeWorkspaceModulePath(currentFile || 'main.ts');
  const lines = String(src ?? '').replace(/\r/g, '').split('\n');
  const outLines: string[] = [];
  const exportedBindings: Array<{ exported: string; local: string }> = [];
  const seenExported = new Set<string>();

  const recordExport = (exported: string, local: string) => {
    const key = `${exported}:${local}`;
    if (!seenExported.has(key)) {
      seenExported.add(key);
      exportedBindings.push({ exported, local });
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i] ?? '';
    const trimmed = stripInlineCommentSafe(rawLine).trim();
    const indentMatch = rawLine.match(/^(\s*)/);
    const indent = indentMatch && indentMatch[1] ? indentMatch[1] : '';

    if (/^import\b/.test(trimmed)) {
      const cleanStmt = trimmed.replace(/;\s*$/, '').trim();

      // Side-effect import: `import './mod'`
      const sideM = cleanStmt.match(/^import\s+(['"])([^'"]+)\1$/);
      if (sideM && sideM[2]) {
        const spec = sideM[2].trim();
        const resolved = resolveModuleImportPath(normCurrent, spec, availableFiles) || spec;
        outLines.push(`${indent}/*__import__*/ __require(${JSON.stringify(resolved)}, ${JSON.stringify(normCurrent)});`);
        continue;
      }

      const impM = cleanStmt.match(/^import\s+(type\s+)?([\s\S]+?)\s+from\s+(['"])([^'"]+)\3$/);
      if (impM && impM[2] && impM[4]) {
        const isTypeOnly = Boolean(impM[1]);
        const clause = impM[2].trim();
        const spec = impM[4].trim();
        if (isTypeOnly) {
          outLines.push(`${indent}/*__import_type__*/`);
          continue;
        }
        if (spec === 'fs' || spec === 'node:fs' || spec === 'fs/promises' || spec === 'node:fs/promises') {
          outLines.push(indent + transpileFsImportStatement(rawLine.trim()));
          continue;
        }
        const resolved = resolveModuleImportPath(normCurrent, spec, availableFiles) || spec;
        const targetTypeExports = new Set<string>();
        if (availableFiles && availableFiles.has(resolved)) {
          const targetSrc = availableFiles.get(resolved) || '';
          const parsedTarget = parseModuleImportsAndExports(targetSrc, resolved, availableFiles);
          for (const exp of parsedTarget.exports) {
            if (exp.kind === 'type') {
              targetTypeExports.add(exp.exported);
            }
          }
        }
        const reqCall = `__require(${JSON.stringify(resolved)}, ${JSON.stringify(normCurrent)})`;

        const nsM = clause.match(/^\*\s+as\s+([A-Za-z_$][\w$]*)$/);
        if (nsM && nsM[1]) {
          outLines.push(`${indent}/*__import__*/ var ${nsM[1]} = ${reqCall};`);
          continue;
        }

        if (clause.startsWith('{') && clause.endsWith('}')) {
          const bindings = parseNamedSpecifiersList(clause.slice(1, -1), false).filter(
            b => !b.isTypeOnly && !targetTypeExports.has(b.imported)
          );
          if (bindings.length === 0) {
            outLines.push(`${indent}/*__import_type__*/`);
          } else {
            const destructure = bindings
              .map(b => (b.imported === b.local ? b.local : `${b.imported}: ${b.local}`))
              .join(', ');
            outLines.push(`${indent}/*__import__*/ var { ${destructure} } = ${reqCall};`);
          }
          continue;
        }

        const defAndNamedM = clause.match(/^([A-Za-z_$][\w$]*)\s*,\s*\{([\s\S]*)\}$/);
        if (defAndNamedM && defAndNamedM[1] && defAndNamedM[2] !== undefined) {
          const defLocal = defAndNamedM[1];
          const named = parseNamedSpecifiersList(defAndNamedM[2], false).filter(
            b => !b.isTypeOnly && !targetTypeExports.has(b.imported)
          );
          const tmpVar = `__mod_${i + 1}`;
          const destructure = named
            .map(b => (b.imported === b.local ? b.local : `${b.imported}: ${b.local}`))
            .join(', ');
          const namedPart = destructure ? `, { ${destructure} } = ${tmpVar}` : '';
          outLines.push(
            `${indent}/*__import__*/ var ${tmpVar} = ${reqCall}, ${defLocal} = (${tmpVar} && ${tmpVar}.default !== undefined ? ${tmpVar}.default : ${tmpVar})${namedPart};`
          );
          continue;
        }

        if (/^[A-Za-z_$][\w$]*$/.test(clause)) {
          const tmpVar = `__mod_${i + 1}`;
          outLines.push(
            `${indent}/*__import__*/ var ${tmpVar} = ${reqCall}, ${clause} = (${tmpVar} && ${tmpVar}.default !== undefined ? ${tmpVar}.default : ${tmpVar});`
          );
          continue;
        }
      }
    }

    if (/^export\b/.test(trimmed)) {
      const cleanStmt = trimmed.replace(/;\s*$/, '').trim();

      // `export type { ... }` or `export { a, b as c } [from './mod']`
      const exportListM = cleanStmt.match(/^export\s+(type\s+)?\{([^}]*)\}(?:\s+from\s+(['"])([^'"]+)\3)?$/);
      if (exportListM && exportListM[2] !== undefined) {
        const isTypeOnly = Boolean(exportListM[1]);
        const fromSpec = exportListM[4] ? exportListM[4].trim() : '';
        if (isTypeOnly) {
          outLines.push(`${indent}/*__export_type__*/`);
          continue;
        }
        const items = parseNamedSpecifiersList(exportListM[2], false).filter(b => !b.isTypeOnly);
        if (fromSpec) {
          const resolved = resolveModuleImportPath(normCurrent, fromSpec, availableFiles) || fromSpec;
          const tmpVar = `__reexp_${i + 1}`;
          const assigns = items
            .map(b => `__exports.${b.local} = ${tmpVar}.${b.imported};`)
            .join(' ');
          outLines.push(
            `${indent}/*__import__*/ var ${tmpVar} = __require(${JSON.stringify(resolved)}, ${JSON.stringify(normCurrent)}); ${assigns}`
          );
        } else {
          items.forEach(b => recordExport(b.local, b.imported));
          outLines.push(`${indent}/*__export__*/`);
        }
        continue;
      }

      // `export interface ...` / `export type ...`
      if (/^export\s+(?:declare\s+)?(?:interface|type)\b/.test(cleanStmt)) {
        outLines.push(rawLine.replace(/^(\s*)export\s+/, '$1'));
        continue;
      }

      // `export default function foo` / `export function foo`
      const fnM = cleanStmt.match(/^export\s+(default\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)?/);
      if (fnM) {
        const isDefault = Boolean(fnM[1]);
        const fnName = fnM[2] || '';
        if (isDefault && fnName) {
          recordExport('default', fnName);
          recordExport(fnName, fnName);
          outLines.push(rawLine.replace(/^(\s*)export\s+default\s+/, '$1'));
        } else if (isDefault && !fnName) {
          recordExport('default', '__default_export__');
          outLines.push(rawLine.replace(/^(\s*)export\s+default\s+/, '$1const __default_export__ = '));
        } else if (fnName) {
          recordExport(fnName, fnName);
          outLines.push(rawLine.replace(/^(\s*)export\s+/, '$1'));
        } else {
          outLines.push(rawLine.replace(/^(\s*)export\s+/, '$1'));
        }
        continue;
      }

      // `export default class Cls` / `export class Cls`
      const clsM = cleanStmt.match(/^export\s+(default\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)?/);
      if (clsM) {
        const isDefault = Boolean(clsM[1]);
        const clsName = clsM[2] || '';
        if (isDefault && clsName) {
          recordExport('default', clsName);
          recordExport(clsName, clsName);
          outLines.push(rawLine.replace(/^(\s*)export\s+default\s+/, '$1'));
        } else if (isDefault && !clsName) {
          recordExport('default', '__default_export__');
          outLines.push(rawLine.replace(/^(\s*)export\s+default\s+/, '$1const __default_export__ = '));
        } else if (clsName) {
          recordExport(clsName, clsName);
          outLines.push(rawLine.replace(/^(\s*)export\s+/, '$1'));
        } else {
          outLines.push(rawLine.replace(/^(\s*)export\s+/, '$1'));
        }
        continue;
      }

      // `export enum E` / `export const enum E`
      const enumM = cleanStmt.match(/^export\s+(?:const\s+)?enum\s+([A-Za-z_$][\w$]*)/);
      if (enumM && enumM[1]) {
        recordExport(enumM[1], enumM[1]);
        outLines.push(rawLine.replace(/^(\s*)export\s+/, '$1'));
        continue;
      }

      // `export const/let/var ...`
      const varM = cleanStmt.match(/^export\s+(?:const|let|var)\s+([\s\S]+)$/);
      if (varM && varM[1]) {
        const decls = splitTopLevel(varM[1]);
        for (const d of decls) {
          const idM = d.trim().match(/^([A-Za-z_$][\w$]*)/);
          if (idM && idM[1]) {
            recordExport(idM[1], idM[1]);
          }
        }
        outLines.push(rawLine.replace(/^(\s*)export\s+/, '$1'));
        continue;
      }

      // `export default expr`
      if (/^export\s+default\b/.test(cleanStmt)) {
        recordExport('default', '__default_export__');
        outLines.push(rawLine.replace(/^(\s*)export\s+default\s+/, '$1const __default_export__ = '));
        continue;
      }
    }

    outLines.push(rawLine);
  }

  return {
    code: outLines.join('\n'),
    exportedBindings,
  };
}

export function buildExportAssignmentFooter(
  exportedBindings: ReadonlyArray<{ exported: string; local: string }>
): string {
  if (exportedBindings.length === 0) return '';
  const getters = exportedBindings
    .map(
      b =>
        `try { Object.defineProperty(__exports, ${JSON.stringify(b.exported)}, { enumerable: true, configurable: true, get: function(){ return ${b.local}; } }); } catch (_) { try { __exports[${JSON.stringify(b.exported)}] = ${b.local}; } catch (__e) {} }`
    )
    .join(' ');
  return `if (typeof __exports === "object" && __exports) { ${getters} }`;
}

function isReadonlyStringMap(
  val: ReadonlyMap<string, string> | Record<string, string>
): val is ReadonlyMap<string, string> {
  return typeof val.forEach === 'function' && typeof val.get === 'function';
}

export function buildModuleGraph(
  entryFile: string,
  entrySource: string,
  fileMap: ReadonlyMap<string, string> | Record<string, string>
): ModuleGraphResult {
  const normEntry = normalizeWorkspaceModulePath(entryFile || 'main.ts') || 'main.ts';
  const allFiles = new Map<string, string>();
  if (isReadonlyStringMap(fileMap)) {
    fileMap.forEach((content, k) => {
      const nk = normalizeWorkspaceModulePath(k);
      if (nk) allFiles.set(nk, content.replace(/\r/g, ''));
    });
  } else {
    Object.keys(fileMap).forEach((k) => {
      const nk = normalizeWorkspaceModulePath(k);
      const content = fileMap[k];
      if (nk && typeof content === 'string') allFiles.set(nk, content.replace(/\r/g, ''));
    });
  }
  allFiles.set(normEntry, String(entrySource ?? '').replace(/\r/g, ''));

  const entryParsed = parseModuleImportsAndExports(
    allFiles.get(normEntry) || '',
    normEntry,
    allFiles
  );

  const modules = new Map<string, ModuleNode>();
  const diagnostics: Diag[] = [];
  const order: string[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(filePath: string): void {
    if (visited.has(filePath)) return;
    visiting.add(filePath);

    const rawSource = allFiles.get(filePath) ?? '';
    const parsed = filePath === normEntry
      ? entryParsed
      : parseModuleImportsAndExports(rawSource, filePath, allFiles);
    const deps: string[] = [];

    for (const imp of parsed.imports) {
      if (imp.isBuiltinFs) continue;
      if (!imp.resolvedPath || !allFiles.has(imp.resolvedPath)) {
        diagnostics.push({
          file: filePath,
          line: imp.line,
          code: 'TS2307',
          message: `找不到模块 "${imp.specifier}"（请确认文件已存在于 /workspace 工作区中）`,
          severity: 'error',
        });
        continue;
      }
      const depPath = imp.resolvedPath;
      if (!deps.includes(depPath)) deps.push(depPath);

      if (visiting.has(depPath)) {
        diagnostics.push({
          file: filePath,
          line: imp.line,
          code: 'TS2300',
          message: `检测到模块循环依赖: "${filePath}" -> "${depPath}"`,
          severity: 'error',
        });
        continue;
      }

      visit(depPath);
    }

    const node: ModuleNode = {
      file: filePath,
      rawSource,
      lines: rawSource.split('\n'),
      imports: parsed.imports,
      exports: parsed.exports,
      dependencies: deps,
    };
    modules.set(filePath, node);

    visiting.delete(filePath);
    visited.add(filePath);
    order.push(filePath);
  }

  visit(normEntry);

  // Verify named imports exist in target module's exports
  modules.forEach((modNode) => {
    for (const imp of modNode.imports) {
      if (imp.isBuiltinFs || !imp.resolvedPath) continue;
      const targetMod = modules.get(imp.resolvedPath);
      if (!targetMod) continue;

      const exportedSet = new Set<string>();
      for (const exp of targetMod.exports) {
        exportedSet.add(exp.exported);
        if (exp.reexportSpecifier) {
          const reRes = resolveModuleImportPath(targetMod.file, exp.reexportSpecifier, allFiles);
          if (reRes && modules.has(reRes)) {
            modules.get(reRes)?.exports.forEach(re => exportedSet.add(re.exported));
          }
        }
      }

      for (const bind of imp.bindings) {
        if (bind.imported === '*') continue;
        if (!exportedSet.has(bind.imported)) {
          diagnostics.push({
            file: modNode.file,
            line: imp.line,
            code: 'TS2305',
            message: `模块 "${imp.specifier}" (${imp.resolvedPath}) 没有导出成员 "${bind.imported}"`,
            severity: 'error',
          });
        }
      }
    }
  });

  const isMultiFile =
    order.length > 1 ||
    entryParsed.hasRelativeImports ||
    entryParsed.exports.length > 0;

  return {
    entryFile: normEntry,
    isMultiFile,
    order,
    modules,
    diagnostics,
  };
}
