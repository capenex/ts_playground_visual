/* ================================================================
   Application Entry Point & Global Compatibility Bridge (src/main.ts)
   ================================================================ */
import * as stateMod from './state';
import * as domMod from './ui/dom';
import * as tsSamplesMod from './samples/ts-samples';
import * as reactSamplesMod from './samples/react-samples';
import * as commentsMod from './compiler/comments';
import * as transpileMod from './compiler/transpile';
import * as jsxTranspileMod from './compiler/jsx-transpile';
import * as propsSchemaMod from './compiler/props-schema';
import * as instrumenterMod from './compiler/instrumenter';
import * as typeCheckerMod from './compiler/type-checker';
import * as eventLoopMod from './runtime/event-loop';
import * as runnerMod from './runtime/runner';
import * as astViewMod from './viz/ast-view';
import * as highlightMod from './viz/highlight';
import * as memoryGraphMod from './viz/memory-graph';
import * as controlsMod from './ui/controls';
import * as shareMod from './ui/share';
import * as videoWebmMod from './ui/video-webm';
import * as vfsMod from './ui/vfs';
import * as scriptTabsMod from './ui/script-tabs';
import * as notebookMod from './ui/notebook';
import * as componentStudioMod from './ui/component-studio';

stateMod.bindStateGlobals();
domMod.bindDomGlobals();

const allExports = {
  ...stateMod,
  ...domMod,
  ...tsSamplesMod,
  ...reactSamplesMod,
  ...commentsMod,
  ...transpileMod,
  ...jsxTranspileMod,
  ...propsSchemaMod,
  ...instrumenterMod,
  ...typeCheckerMod,
  ...eventLoopMod,
  ...runnerMod,
  ...astViewMod,
  ...highlightMod,
  ...memoryGraphMod,
  ...controlsMod,
  ...shareMod,
  ...videoWebmMod,
  ...vfsMod,
  ...scriptTabsMod,
  ...notebookMod,
  ...componentStudioMod,
};

Object.assign(globalThis, allExports);

// Additional bridge helpers from REFACTOR_PLAN.md
if (typeof globalThis.syncGutterAndHighlight !== 'function') {
  globalThis.syncGutterAndHighlight = highlightMod.updateEditorChrome;
}
if (typeof globalThis.updateCursorPos !== 'function') {
  globalThis.updateCursorPos = controlsMod.recordEditorCursorLine;
}
if (!globalThis.breakpoints) {
  globalThis.breakpoints = new Set<number>();
}

notebookMod.initNotebookUI();
shareMod.boot();
