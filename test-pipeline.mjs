/**
 * TypeScript Playground VISUAL — Modular Automated Verification Pipeline (`test-pipeline.mjs`)
 *
 * Orchestrates 5 domain test suites under `/tests/`:
 *   1. `01-static-gates.test.mjs`       — 10 Architecture & Zero-Escape Static Gates + `tsc --noEmit`
 *   2. `02-compiler-typecheck.test.mjs` — Transpiler, AST Instrumenter, `typecheckTS` & 10 TS Samples
 *   3. `03-runtime-debug.test.mjs`      — On-Demand Step Debugger, Call Stack, Checkpoints & EventLoop
 *   4. `04-viz-editor.test.mjs`         — Data Normalizers, 1D/2D Windowing, VIZ, CM6 & WebM Muxer
 *   5. `05-workspace-nb.test.mjs`       — `/workspace` VFS, `fs` Shims, Script Tabs & Notebook Kernel
 */
import { createSandboxedApp, getStats } from './tests/harness.mjs';
import { runStaticGatesSuite } from './tests/01-static-gates.test.mjs';
import { runCompilerTypecheckSuite } from './tests/02-compiler-typecheck.test.mjs';
import { runRuntimeDebugSuite } from './tests/03-runtime-debug.test.mjs';
import { runVizEditorSuite } from './tests/04-viz-editor.test.mjs';
import { runWorkspaceNotebookSuite } from './tests/05-workspace-nb.test.mjs';

async function main() {
  const t0 = Date.now();

  // Suite 1: Architecture & Type-Safety Static Gates (1-10)
  await runStaticGatesSuite();

  // Build bundle & initialize sandboxed VM once for Suites 2-5
  const { sandbox, elements } = await createSandboxedApp();

  // Suite 2: Compiler & Static Type-Checker
  await runCompilerTypecheckSuite(sandbox);

  // Suite 3: Runtime, Step Debugger, Checkpoints & EventLoop
  await runRuntimeDebugSuite(sandbox, elements);

  // Suite 4: Data Visualization, Editor & 1080p 60fps WebM Muxer
  await runVizEditorSuite(sandbox);

  // Suite 5: VFS Workspace, Script Tabs & Jupyter Notebook Kernel
  await runWorkspaceNotebookSuite(sandbox, elements);

  const { passed, failed } = getStats();
  const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
  console.log(`\n============================================================`);
  console.log(`TypeScript Playground VISUAL Pipeline: ${passed} passed, ${failed} failed (${elapsed}s)`);
  console.log(`============================================================`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Fatal error in test-pipeline.mjs:', err);
  process.exit(1);
});
