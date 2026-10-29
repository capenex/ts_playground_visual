/**
 * Suite 01: Architecture & Type-Safety Static Gates (Gates 1-10)
 * + HTML / Session / Storage Guard Structural Integrity Checks.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  ROOT, SRC_DIR, check, assertEq, walkTsFiles, stripCommentsAndStrings,
} from './harness.mjs';

export async function runStaticGatesSuite() {
  const tsFiles = walkTsFiles(SRC_DIR).sort();
  const relFiles = tsFiles.map((f) => path.relative(ROOT, f).replace(/\\/g, '/'));

  // Gate 10a: Exact 34 TypeScript modules in src/**/*.ts
  assertEq('Gate 10a: src/**/*.ts exact module count is 34', relFiles.length, 34);
  check(
    'Gate 10b: Python legacy directories & files completely removed',
    !fs.existsSync(path.join(ROOT, 'python')) &&
      !fs.existsSync(path.join(ROOT, 'examples', 'python')) &&
      !fs.existsSync(path.join(SRC_DIR, 'samples', 'py-samples.ts')),
  );

  // Gates 1-7 & 10c: Scan every TypeScript file for forbidden escape hatches & Python residue
  let explicitAnyCount = 0;
  let nonNullBangCount = 0;
  let tsIgnoreCount = 0;
  let doubleCastCount = 0;
  let inlineStructuralAsCount = 0;
  let bagTypeAsCount = 0;
  let anyAsCastCount = 0;
  let pyResidueCount = 0;

  for (const fullPath of tsFiles) {
    const rel = path.relative(ROOT, fullPath).replace(/\\/g, '/');
    const raw = fs.readFileSync(fullPath, 'utf8');
    const clean = stripCommentsAndStrings(raw);

    // Gate 1: Explicit `any`
    const anyMatches = clean.match(/(?::\s*any\b|<any>|as\s+any\b|\bany\[\])/g);
    if (anyMatches) {
      explicitAnyCount += anyMatches.length;
      check(`Gate 1 (${rel}): 0 explicit any`, false, anyMatches.join(', '));
    }

    // Gate 2: Non-null assertion `!`
    const withoutNotOps = clean.replace(/!==|!=|!=/g, '   ');
    const bangMatches = withoutNotOps.match(/[A-Za-z0-9_$\])}]!(?=[.\[(,;:\s)]|$)/g);
    if (bangMatches) {
      nonNullBangCount += bangMatches.length;
      check(`Gate 2 (${rel}): 0 non-null assertions`, false, bangMatches.join(', '));
    }

    // Gate 3: @ts-ignore / @ts-expect-error / @ts-nocheck
    if (/@ts-(?:ignore|expect-error|nocheck)/.test(raw)) {
      tsIgnoreCount++;
      check(`Gate 3 (${rel}): 0 @ts-ignore/@ts-expect-error/@ts-nocheck`, false);
    }

    // Gate 4: Double cast `as unknown as`
    if (/\bas\s+unknown\s+as\b/.test(clean)) {
      doubleCastCount++;
      check(`Gate 4 (${rel}): 0 double casts (as unknown as)`, false);
    }

    // Gate 5: Inline structural cast `as { ... }` or `as (...) => ...`
    if (/\bas\s+(?:\{|\([^)]*\)\s*=>)/.test(clean)) {
      inlineStructuralAsCount++;
      check(`Gate 5 (${rel}): 0 inline structural as-casts`, false);
    }

    // Gate 6: Index-signature bag cast
    if (/\bas\s+(?:StepAnim|Frame|Record<|ASTNode)\b/.test(clean)) {
      bagTypeAsCount++;
      check(`Gate 6 (${rel}): 0 bag-type as-casts`, false);
    }

    // Gate 7: Zero `as` type assertions (except `as const` and ES module `import/export ... as ...`)
    const lines = clean.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/^\s*(?:import|export)\b/.test(line)) continue;
      const withoutAsConst = line.replace(/\bas\s+const\b/g, '');
      if (/\bas\s+[A-Za-z_$[{(\b]/.test(withoutAsConst)) {
        anyAsCastCount++;
        check(`Gate 7 (${rel}:${i + 1}): 0 as-assertions`, false, line.trim());
      }
    }

    // Gate 10c: Zero Python runtime bridge residue in TypeScript modules
    if (/\b(?:PY_ENGINE|__py_meta__|__py_cls__|PyPayload|PyEngineBridge)\b/.test(raw)) {
      pyResidueCount++;
      check(`Gate 10c (${rel}): 0 Python residue`, false);
    }
  }

  assertEq('Gate 1: total explicit any count is 0', explicitAnyCount, 0);
  assertEq('Gate 2: total non-null ! assertion count is 0', nonNullBangCount, 0);
  assertEq('Gate 3: total @ts-ignore/@ts-expect-error count is 0', tsIgnoreCount, 0);
  assertEq('Gate 4: total double cast count is 0', doubleCastCount, 0);
  assertEq('Gate 5: total inline structural as-cast count is 0', inlineStructuralAsCount, 0);
  assertEq('Gate 6: total bag-type as-cast count is 0', bagTypeAsCount, 0);
  assertEq('Gate 7: total as-assertion count (excluding as const) is 0', anyAsCastCount, 0);
  assertEq('Gate 10c: total Python residue in src/**/*.ts is 0', pyResidueCount, 0);

  // Gate 8: Tarjan SCC Full-Graph Circular Dependency Check (0 2-node or multi-node cycles)
  const adj = new Map();
  for (const fullPath of tsFiles) {
    const rel = path.relative(ROOT, fullPath).replace(/\\/g, '/');
    const raw = fs.readFileSync(fullPath, 'utf8');
    const deps = [];
    const importRe = /(?:import|export)\s+(?:type\s+)?(?:[^'"]*?\s+from\s+)?['"](\.[^'"]+)['"]/g;
    let m;
    while ((m = importRe.exec(raw)) !== null) {
      const targetRel = path
        .relative(ROOT, path.resolve(path.dirname(fullPath), m[1] + '.ts'))
        .replace(/\\/g, '/');
      deps.push(targetRel);
    }
    adj.set(rel, deps);
  }

  let index = 0;
  const indices = new Map();
  const lowlink = new Map();
  const onStack = new Set();
  const stack = [];
  const cycles = [];

  function strongConnect(v) {
    indices.set(v, index);
    lowlink.set(v, index);
    index++;
    stack.push(v);
    onStack.add(v);

    for (const w of adj.get(v) || []) {
      if (!indices.has(w)) {
        strongConnect(w);
        lowlink.set(v, Math.min(lowlink.get(v), lowlink.get(w)));
      } else if (onStack.has(w)) {
        lowlink.set(v, Math.min(lowlink.get(v), indices.get(w)));
      }
    }

    if (lowlink.get(v) === indices.get(v)) {
      const scc = [];
      let w;
      do {
        w = stack.pop();
        onStack.delete(w);
        scc.push(w);
      } while (w !== v);
      if (scc.length > 1) cycles.push(scc);
      else if (scc.length === 1 && (adj.get(v) || []).includes(v)) cycles.push(scc);
    }
  }

  for (const node of adj.keys()) {
    if (!indices.has(node)) strongConnect(node);
  }
  assertEq('Gate 8: Tarjan SCC circular dependency count is 0', cycles.length, 0);

  // Gate 9: Full 22 Pure Logic Implementation Modules Zero-DOM Isolation Check
  const pureModulePrefixes = [
    'src/types.ts',
    'src/state.ts',
    'src/samples/',
    'src/compiler/',
    'src/runtime/',
    'src/notebook/',
    'src/utils/',
    'src/viz/memory-normalizers.ts',
  ];
  const pureModules = relFiles.filter((rel) =>
    pureModulePrefixes.some((p) => (p.endsWith('/') ? rel.startsWith(p) : rel === p)),
  );
  assertEq('Gate 9a: exact count of pure 0-DOM implementation modules is 22', pureModules.length, 22);

  let domViolations = 0;
  for (const rel of pureModules) {
    const raw = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const clean = stripCommentsAndStrings(raw);
    if (/\b(?:document|HTMLElement|localStorage|sessionStorage|navigator|location)\b/.test(clean)) {
      domViolations++;
      check(`Gate 9b (${rel}): 0 DOM references`, false);
    }
  }
  assertEq('Gate 9b: total DOM reference violations in 22 pure modules is 0', domViolations, 0);

  // TypeScript Official Compiler (`tsc --noEmit`) Strict Check
  // Spawn the compiler through the current node binary: the node_modules/.bin shims are
  // not directly executable on Windows (extensionless shim → ENOENT, .cmd → EINVAL).
  const tscBin = path.join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');
  let tscOk = false;
  let tscOut = '';
  try {
    execFileSync(process.execPath, [tscBin, '--noEmit'], { cwd: ROOT, stdio: 'pipe' });
    tscOk = true;
  } catch (err) {
    tscOut = String((err && err.stdout) || (err && err.message) || err);
  }
  check('Gate 10d: tsc --noEmit passes with 0 errors', tscOk, tscOut);

  // Structural checks on HTML, storage-guard.js, and app-session.js
  const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  check('index.html: does not contain #langSel or py_engine.js', !indexHtml.includes('id="langSel"') && !indexHtml.includes('py_engine.js'));
  check('index.html: loads storage-guard.js, app.bundle.js, app-session.js, cm.bundle.js',
    indexHtml.includes('storage-guard.js') &&
    indexHtml.includes('js/app.bundle.js') &&
    indexHtml.includes('app-session.js') &&
    indexHtml.includes('editor/cm.bundle.js'),
  );

  const shareHtml = fs.readFileSync(path.join(ROOT, 'share.html'), 'utf8');
  check('share.html: sandboxed iframe does not allow-same-origin',
    shareHtml.includes('sandbox="allow-scripts allow-downloads"') &&
    !shareHtml.includes('allow-same-origin'),
  );
}
