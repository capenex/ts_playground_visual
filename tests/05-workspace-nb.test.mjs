/**
 * Suite 05: Virtual File System (`/workspace` VFS, `fs` / `fs/promises` Shims, Path Traversal Security),
 * Multi-Tab Script Bar (`script-tabs-store`), and Jupyter Notebook Kernel + 6 TS Tutorial Notebooks.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, check, assertEq, resetSandbox } from './harness.mjs';

export async function runWorkspaceNotebookSuite(sandbox, elements) {
  resetSandbox(sandbox);

  // 1. VFS CRUD, Path Normalization & Path Traversal Security
  sandbox.bindGlobalVfsApi();
  sandbox.__VFS__.clear();
  sandbox.__VFS__.mkdir('/workspace/data');
  sandbox.__VFS__.writeFile('/workspace/data/input.txt', '10 20 30\n40 50');

  assertEq('__VFS__.readFile reads created file', sandbox.__VFS__.readFile('/workspace/data/input.txt'), '10 20 30\n40 50');
  assertEq('resolveWorkspacePath resolves relative paths inside /workspace',
    sandbox.resolveWorkspacePath('data/./input.txt'),
    'data/input.txt',
  );

  let traversalBlocked = false;
  try {
    sandbox.resolveWorkspacePath('../../etc/passwd');
  } catch (_) {
    traversalBlocked = true;
  }
  check('resolveWorkspacePath blocks directory traversal outside /workspace', traversalBlocked);

  // 2. Runtime Node.js `fs` and `fs/promises` Shims inside TypeScript Execution
  const editorEl = elements.get('editor');
  editorEl.value = `
import * as fs from 'fs';
function processFile(): number {
  const raw = fs.readFileSync('/workspace/data/input.txt', 'utf8');
  const nums = raw.trim().split(/\\s+/).map((s: string) => Number(s));
  const total = nums.reduce((a: number, b: number) => a + b, 0);
  fs.writeFileSync('/workspace/data/out.txt', String(total));
  return total;
}
processFile()
`;
  sandbox.runOnce();
  assertEq('TS runtime fs.readFileSync + fs.writeFileSync writes /workspace/data/out.txt',
    sandbox.__VFS__.readFile('/workspace/data/out.txt'),
    '150',
  );

  // 3. Multi-Tab Script Bar (`upsertSampleScriptTab`, `getActiveScriptTab`, `syncActiveScriptTabFromFileName`)
  const tab1 = sandbox.upsertSampleScriptTab('algo1.ts', 'const a = 1;\na');
  const tab2 = sandbox.upsertSampleScriptTab('algo2.ts', 'const b = 2;\nb');
  check('upsertSampleScriptTab creates distinct script tabs', Boolean(tab1 && tab2 && tab1.id !== tab2.id));
  sandbox.syncActiveScriptTabFromFileName('renamed_algo.ts');
  assertEq('syncActiveScriptTabFromFileName updates active tab title',
    sandbox.getActiveScriptTab().title,
    'renamed_algo.ts',
  );

  // 4. Jupyter Notebook Mode: Shared Context Across Cells, Single-Cell Step Debug & .ipynb Serialization
  sandbox.setViewMode('notebook');
  sandbox.restartNotebookKernel();
  const doc = sandbox.getActiveNotebook();
  doc.cells = [
    { id: 'c1', type: 'markdown', source: '# Notebook Test', output: null, executionCount: null, status: 'idle' },
    { id: 'c2', type: 'code', source: 'interface Item { price: number; }\nconst taxRate: number = 0.1;', output: null, executionCount: null, status: 'idle' },
    { id: 'c3', type: 'code', source: 'const item: Item = { price: 200 };\nconst finalPrice = item.price * (1 + taxRate);\nMath.round(finalPrice)', output: null, executionCount: null, status: 'idle' },
  ];
  doc.activeCellId = 'c2';
  await sandbox.runNotebookCell('c2', false);
  await sandbox.runNotebookCell('c3', false);

  const c3Out = doc.cells[2].output;
  check('Notebook cross-cell execution shares interface Item and const taxRate across cells',
    Boolean(c3Out && !c3Out.error && String(c3Out.returnValue) === '220'),
    JSON.stringify(c3Out),
  );

  // Single-cell interactive step debugging (`debugNotebookCell`)
  await sandbox.debugNotebookCell('c3');
  check('debugNotebookCell starts step-by-step trace on cell c3 with prior cell context',
    sandbox.TRACE.steps.length >= 1,
  );

  // `.ipynb` JSON round-trip export & import
  const ipynbJson = sandbox.serializeNotebookToIpynbJson(doc);
  const parsedDoc = sandbox.parseIpynbJsonToDocument(ipynbJson, 'roundtrip.ipynb');
  assertEq('parseIpynbJsonToDocument preserves cell count and language="ts"',
    { len: parsedDoc.cells.length, lang: parsedDoc.lang },
    { len: 3, lang: 'ts' },
  );

  // 5. All 6 Built-in TypeScript Advanced Interactive Tutorial Notebooks (`examples/notebooks/01..06`)
  const tutorials = sandbox.TS_NOTEBOOK_TUTORIALS || [];
  assertEq('6 TypeScript advanced tutorial notebooks registered', tutorials.length, 6);

  for (const item of tutorials) {
    const nbPath = path.join(ROOT, 'examples', 'notebooks', item.fileName);
    check(`Tutorial notebook file exists: examples/notebooks/${item.fileName}`, fs.existsSync(nbPath));
    const nbDoc = sandbox.createTutorialNotebookDocument(item.id);
    check(`Tutorial [${item.id}] has >= 4 cells`, Boolean(nbDoc && nbDoc.cells.length >= 4));
  }

  sandbox.setViewMode('script');

  // 6. Multi-File TypeScript Module Graph, Cross-File Type Checking & Cross-Module Step Debugging
  const missingModGraph = sandbox.typecheckWorkspaceModules(
    'main.ts',
    "import { foo } from './non_existent';\nfoo();",
    { 'main.ts': "import { foo } from './non_existent';\nfoo();" },
    true,
  );
  check(
    'Multi-file typecheck reports TS2307 on missing module',
    missingModGraph.diags.some((d) => d.code === 'TS2307'),
  );

  const missingExportGraph = sandbox.typecheckWorkspaceModules(
    'main.ts',
    "import { nope } from './math';\nnope();",
    {
      'math.ts': 'export function add(a: number, b: number): number { return a + b; }',
      'main.ts': "import { nope } from './math';\nnope();",
    },
    true,
  );
  check(
    'Multi-file typecheck reports TS2305 on missing named export',
    missingExportGraph.diags.some((d) => d.code === 'TS2305'),
  );

  const circularGraph = sandbox.typecheckWorkspaceModules(
    'a.ts',
    "import { bVal } from './b';\nexport const aVal: number = bVal + 1;",
    {
      'a.ts': "import { bVal } from './b';\nexport const aVal: number = bVal + 1;",
      'b.ts': "import { aVal } from './a';\nexport const bVal: number = aVal + 1;",
    },
    true,
  );
  check(
    'Multi-file typecheck reports TS2300 on circular module dependency',
    circularGraph.diags.some((d) => d.code === 'TS2300'),
  );

  const crossFileMismatchGraph = sandbox.typecheckWorkspaceModules(
    'main.ts',
    "import { add } from './math';\nconst bad: number = add(1, 'wrong');",
    {
      'math.ts': 'export function add(a: number, b: number): number { return a + b; }',
      'main.ts': "import { add } from './math';\nconst bad: number = add(1, 'wrong');",
    },
    true,
  );
  check(
    'Multi-file typecheck reports cross-module argument type mismatch',
    crossFileMismatchGraph.diags.length > 0,
  );

  // Load multi-file BST project and step through cross-module execution
  sandbox.loadMultiFileSampleProject();
  check(
    'loadMultiFileSampleProject initializes multi-module DEBUG_SESSION with bst.ts and main.ts',
    Boolean(
      sandbox.DEBUG_SESSION.active &&
        sandbox.TRACE.moduleSources &&
        sandbox.TRACE.moduleSources['bst.ts'] &&
        sandbox.TRACE.moduleSources['main.ts'],
    ),
  );

  while (!sandbox.DEBUG_SESSION.finished && sandbox.TRACE.steps.length < 120) {
    sandbox.computeAndAppendNextStep({ silent: true });
  }
  assertEq(
    'Multi-file BST project finishes with root val 8',
    sandbox.DEBUG_SESSION.returnValue,
    8,
  );
  const visitedFiles = new Set(sandbox.TRACE.steps.map((s) => s.file).filter(Boolean));
  check(
    'Multi-file trace records steps across both main.ts and bst.ts',
    visitedFiles.has('main.ts') && visitedFiles.has('bst.ts'),
    Array.from(visitedFiles).join(', '),
  );
  const bstStepIdx = sandbox.TRACE.steps.findIndex((s) => s.file === 'bst.ts');
  check('Multi-file trace has step inside bst.ts with callStack frame file="bst.ts"', bstStepIdx >= 0);
  if (bstStepIdx >= 0) {
    sandbox.cur = bstStepIdx;
    sandbox.renderStatic(bstStepIdx, false);
    assertEq(
      'Stepping into bst.ts automatically switches active editor file to bst.ts',
      sandbox.appState.ACTIVE_DEBUG_FILE,
      'bst.ts',
    );
  }
}

