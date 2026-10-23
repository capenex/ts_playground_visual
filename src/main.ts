/* ================================================================
   Application Entry Point & Global Compatibility Bridge (src/main.ts)
   ================================================================ */
import * as stateMod from './state';
import * as tsSamplesMod from './samples/ts-samples';
import * as pySamplesMod from './samples/py-samples';
import * as commentsMod from './compiler/comments';
import * as transpileMod from './compiler/transpile';
import * as instrumenterMod from './compiler/instrumenter';
import * as typeCheckerMod from './compiler/type-checker';
import * as eventLoopMod from './runtime/event-loop';
import * as runnerMod from './runtime/runner';
import * as astViewMod from './viz/ast-view';
import * as highlightMod from './viz/highlight';
import * as memoryGraphMod from './viz/memory-graph';
import * as controlsMod from './ui/controls';
import * as shareMod from './ui/share';

stateMod.bindStateGlobals(globalThis);

const allExports = {
  ...tsSamplesMod,
  ...pySamplesMod,
  ...commentsMod,
  ...transpileMod,
  ...instrumenterMod,
  ...typeCheckerMod,
  ...eventLoopMod,
  ...runnerMod,
  ...astViewMod,
  ...highlightMod,
  ...memoryGraphMod,
  ...controlsMod,
  ...shareMod,
};

Object.assign(globalThis, allExports);

// Additional bridge helpers from REFACTOR_PLAN.md
const g = globalThis as any;
if (typeof g.syncGutterAndHighlight !== 'function') {
  g.syncGutterAndHighlight = highlightMod.updateEditorChrome;
}
if (typeof g.updateCursorPos !== 'function') {
  g.updateCursorPos = controlsMod.recordEditorCursorLine;
}
if (!g.breakpoints) {
  g.breakpoints = new Set<number>();
}

shareMod.boot();
