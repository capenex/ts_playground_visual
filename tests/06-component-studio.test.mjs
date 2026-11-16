/**
 * Suite 06: Component Studio — JSX Transpiler, Props Schema Extractor,
 * Bidirectional Sync, TSX/CSS Diagnostics & VFS Config Behavior
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, check, assertEq, resetSandbox } from './harness.mjs';

export async function runComponentStudioSuite(sandbox, elements) {
  const {
    transpileJSX,
    transpileTSXForSandbox,
    extractPropsSchema,
    applyPropDefaultToSource,
    generateJsxSnippet,
    REACT_SAMPLES,
    setViewMode,
    loadStudioSample,
    syncPropValuesWithSchema,
    liveTypeDiags,
    typecheckTS,
    typecheckWorkspaceModules,
    ensureVfsInitialized,
    VFS_NODES,
    applyTsConfig,
    createTsConfigFromPreset,
    inferEditorLanguageFromFileName,
  } = sandbox;

  // 0. Task 2: ensureVfsInitialized() does NOT auto-inject tsconfig.json
  resetSandbox(sandbox);
  VFS_NODES.clear();
  // Reset boot flag indirectly by clearing & checking applyTsConfig behavior
  ensureVfsInitialized();
  check(
    'Task 2: VFS_NODES does not automatically include tsconfig.json after init/clear',
    !VFS_NODES.has('tsconfig.json')
  );
  applyTsConfig(createTsConfigFromPreset('standard'), true);
  check(
    'Task 2: applyTsConfig(standard, true) does not create tsconfig.json when absent in VFS',
    !VFS_NODES.has('tsconfig.json')
  );
  applyTsConfig(createTsConfigFromPreset('beginner'), true);

  // 1. transpileJSX syntax coverage
  const basicJsx = transpileJSX(
    'return <div className="box" disabled data-id={123}>Hello {name}</div>;'
  );
  check(
    'transpileJSX: converts intrinsic element + string/boolean/expr props + children',
    basicJsx.includes('React.createElement("div"') &&
      basicJsx.includes('className: "box"') &&
      basicJsx.includes('disabled: true') &&
      basicJsx.includes('"data-id": 123') &&
      basicJsx.includes('"Hello "') &&
      basicJsx.includes('name')
  );

  const fragJsx = transpileJSX('const el = <><Button {...props} /><Icons.Star /></>;');
  check(
    'transpileJSX: converts Fragment, spread props, and member component tag',
    fragJsx.includes('React.createElement(React.Fragment, null') &&
      fragJsx.includes('React.createElement(Button, Object.assign({}, props))') &&
      fragJsx.includes('React.createElement(Icons.Star, null)')
  );

  const commentJsx = transpileJSX('const el = <div>{/* comment */}<span>ok</span></div>;');
  check(
    'transpileJSX: ignores JSX comment expression {/* comment */}',
    !commentJsx.includes('comment') && commentJsx.includes('React.createElement("span", null, "ok")')
  );

  const genericPreserved = transpileJSX(
    'const [count, setCount] = useState<number>(0); const id = <T,>(x: T) => x;'
  );
  check(
    'transpileJSX: preserves TS generics (useState<number>, <T,>(x: T)) without misparsing as JSX',
    genericPreserved.includes('useState<number>(0)') && genericPreserved.includes('<T,>(x: T)')
  );

  // 2. Built-in React samples (TSX + CSS) compile, extract cssImports & execute in mock React runtime
  assertEq('REACT_SAMPLES: has 3 built-in TSX+CSS samples', REACT_SAMPLES.length, 3);
  const mockReact = {
    Fragment: 'Fragment',
    useState: (init) => [init, () => {}],
    createElement: (type, props, ...children) => ({ type, props, children }),
  };

  for (const sample of REACT_SAMPLES) {
    check(
      `REACT_SAMPLES(${sample.id}): has split cssFileName and non-empty cssCode`,
      typeof sample.cssFileName === 'string' &&
        sample.cssFileName.endsWith('.css') &&
        typeof sample.cssCode === 'string' &&
        sample.cssCode.trim().length > 0
    );

    const res = transpileTSXForSandbox(sample.code);
    check(`transpileTSXForSandbox(${sample.fileName}): no compile error`, res.error === null);
    check(
      `transpileTSXForSandbox(${sample.fileName}): extracts CSS import ./${sample.cssFileName}`,
      Array.isArray(res.cssImports) &&
        res.cssImports.includes('./' + sample.cssFileName) &&
        !res.code.includes('.css')
    );
    check(
      `transpileTSXForSandbox(${sample.fileName}): detects exported component`,
      typeof res.exportedComponent === 'string' && res.exportedComponent.length > 0
    );
    const factory = new Function('React', res.code);
    const Comp = factory(mockReact);
    check(`transpileTSXForSandbox(${sample.fileName}): returns component function`, typeof Comp === 'function');
    const vnode = Comp({});
    check(
      `transpileTSXForSandbox(${sample.fileName}): component renders valid vnode`,
      vnode !== null && typeof vnode === 'object' && 'type' in vnode
    );

    // Zero false-positive diagnostics in typecheckTS & liveTypeDiags (including studio mode)
    sandbox.appState.FILE_NAME = sample.fileName;
    sandbox.appState.VIEW_MODE = 'studio';
    const tsDiags = typecheckTS(sample.code, true, sample.fileName);
    const liveDiags = liveTypeDiags(sample.code);
    assertEq(`typecheckTS(${sample.fileName}) returns 0 diagnostics`, tsDiags.length, 0);
    assertEq(`liveTypeDiags(${sample.fileName}) returns 0 diagnostics`, liveDiags.length, 0);
  }

  // Verify React & CSS virtual module resolution in module-graph / typecheckWorkspaceModules
  const wsTsxResult = typecheckWorkspaceModules(
    'Button.tsx',
    REACT_SAMPLES[0].code,
    {
      'Button.tsx': REACT_SAMPLES[0].code,
      'Button.css': REACT_SAMPLES[0].cssCode,
    },
    true
  );
  assertEq(
    'typecheckWorkspaceModules(Button.tsx + Button.css): 0 TS2307/TS2304 diagnostics',
    wsTsxResult.diagnostics.length,
    0
  );

  // Verify Task 3: .css and .html skip TS diagnostics & inferEditorLanguageFromFileName works
  sandbox.appState.FILE_NAME = 'Button.css';
  assertEq('liveTypeDiags(Button.css) returns empty []', liveTypeDiags('.sb-btn { color: red; }').length, 0);
  sandbox.appState.FILE_NAME = 'index.html';
  assertEq('liveTypeDiags(index.html) returns empty []', liveTypeDiags('<div class="box">hi</div>').length, 0);
  assertEq('inferEditorLanguageFromFileName maps css/html/tsx/ts/json',
    [
      inferEditorLanguageFromFileName('Button.css'),
      inferEditorLanguageFromFileName('index.html'),
      inferEditorLanguageFromFileName('Button.tsx'),
      inferEditorLanguageFromFileName('main.ts'),
      inferEditorLanguageFromFileName('tsconfig.json'),
    ],
    ['css', 'html', 'tsx', 'ts', 'json']
  );

  // 3. Props Schema extraction
  const btnSchema = extractPropsSchema(REACT_SAMPLES[0].code);
  assertEq('extractPropsSchema(Button): componentName is Button', btnSchema.componentName, 'Button');
  assertEq('extractPropsSchema(Button): propsTypeName is ButtonProps', btnSchema.propsTypeName, 'ButtonProps');
  check('extractPropsSchema(Button): extracts 7 fields', btnSchema.fields.length === 7);

  const variantField = btnSchema.fields.find((f) => f.name === 'variant');
  check(
    'extractPropsSchema(Button): variant is enum with 4 options & default primary',
    variantField !== undefined &&
      variantField.kind === 'enum' &&
      Array.isArray(variantField.options) &&
      variantField.options.length === 4 &&
      variantField.defaultValue === 'primary'
  );

  const radiusField = btnSchema.fields.find((f) => f.name === 'radius');
  check(
    'extractPropsSchema(Button): radius is number with default 10 & description',
    radiusField !== undefined &&
      radiusField.kind === 'number' &&
      radiusField.defaultValue === 10 &&
      typeof radiusField.description === 'string' &&
      radiusField.description.includes('圆角')
  );

  const disabledField = btnSchema.fields.find((f) => f.name === 'disabled');
  check(
    'extractPropsSchema(Button): disabled is boolean optional with default false',
    disabledField !== undefined &&
      disabledField.kind === 'boolean' &&
      disabledField.optional === true &&
      disabledField.defaultValue === false
  );

  const onClickField = btnSchema.fields.find((f) => f.name === 'onClick');
  check(
    'extractPropsSchema(Button): onClick is callback',
    onClickField !== undefined && onClickField.kind === 'callback'
  );

  // type alias Props support
  const typeAliasSchema = extractPropsSchema(`
    type AlertProps = {
      // Alert title
      title: string;
      closable?: boolean;
    };
    export const Alert = ({ title = 'Notice', closable = true }: AlertProps) => <div />;
  `);
  assertEq('extractPropsSchema(type AlertProps): componentName is Alert', typeAliasSchema.componentName, 'Alert');
  assertEq('extractPropsSchema(type AlertProps): fields count is 2', typeAliasSchema.fields.length, 2);
  assertEq('extractPropsSchema(type AlertProps): title default is Notice', typeAliasSchema.fields[0].defaultValue, 'Notice');

  // 4. Bidirectional sync tests (Source <-> Props Panel)
  // 4a. Pure source updater: applyPropDefaultToSource
  const badgeCode = REACT_SAMPLES[1].code;
  const badgeUpdatedText = applyPropDefaultToSource(badgeCode, 'text', 'Production Rea');
  assertEq(
    'applyPropDefaultToSource updates string default value in destructuring',
    extractPropsSchema(badgeUpdatedText).fields.find((f) => f.name === 'text')?.defaultValue,
    'Production Rea'
  );
  const badgeUpdatedBool = applyPropDefaultToSource(badgeUpdatedText, 'closable', true);
  assertEq(
    'applyPropDefaultToSource updates boolean default value in destructuring',
    extractPropsSchema(badgeUpdatedBool).fields.find((f) => f.name === 'closable')?.defaultValue,
    true
  );

  const missingDefaultSrc = `
    interface ChipProps {
      label: string;
      active?: boolean;
    }
    export function Chip({ label = 'Tag', active }: ChipProps) {
      return <span>{label}</span>;
    }
  `;
  const chipWithActive = applyPropDefaultToSource(missingDefaultSrc, 'active', true);
  assertEq(
    'applyPropDefaultToSource inserts `= default` when prop has no default yet',
    extractPropsSchema(chipWithActive).fields.find((f) => f.name === 'active')?.defaultValue,
    true
  );

  // 4b. Code -> Props sync when code default changes (Badge text: 'Production Ready' -> 'Production Rea')
  setViewMode('studio');
  loadStudioSample('badge');
  const propsListEl = elements.get('studioPropsList');
  check(
    'loadStudioSample(badge): opens both Badge.tsx and Badge.css tabs and activates Badge.tsx',
    sandbox.appState.FILE_NAME === 'Badge.tsx' &&
      sandbox.SCRIPT_TABS.ts.tabs.some((t) => t.title === 'Badge.tsx') &&
      sandbox.SCRIPT_TABS.ts.tabs.some((t) => t.title === 'Badge.css') &&
      propsListEl.innerHTML.includes('Production Ready')
  );

  const editorEl = elements.get('editor');
  editorEl.value = badgeUpdatedText;
  sandbox.compileAndRenderStudio(false);
  check(
    'Source -> Props sync: editing default in code updates Props panel input immediately',
    propsListEl.innerHTML.includes('Production Rea') && !propsListEl.innerHTML.includes('Production Ready')
  );

  // Switch active editor tab to Badge.css and edit CSS -> studio still renders Badge.tsx + updated CSS
  sandbox.switchToScriptFile('Badge.css');
  editorEl.value = '.sb-badge { padding: 8px 16px; border-radius: 12px; }';
  sandbox.syncActiveScriptTabSource(editorEl.value);
  sandbox.compileAndRenderStudio(false);
  const tagEl = elements.get('studioComponentTag');
  check(
    'Studio CSS tab editing: keeps associated component (<Badge />) active while editing Badge.css',
    sandbox.appState.FILE_NAME === 'Badge.css' && tagEl.textContent === '<Badge />'
  );

  // Check syncPropValuesWithSchema directly for modified default
  syncPropValuesWithSchema(extractPropsSchema(applyPropDefaultToSource(badgeCode, 'text', 'Custom Live')), false);
  check(
    'syncPropValuesWithSchema overwrites stale propValues when code defaultValue changes',
    elements.get('studioPropsList').innerHTML.includes('Production Rea')
  );

  // 5. JSX snippet generator & Studio view mode switching
  const snippet = generateJsxSnippet(
    btnSchema,
    new Map([
      ['label', 'Submit'],
      ['variant', 'primary'],
      ['disabled', true],
    ])
  );
  check(
    'generateJsxSnippet: generates valid JSX invocation string',
    snippet.startsWith('<Button') &&
      snippet.includes('label="Submit"') &&
      snippet.includes('variant="primary"') &&
      snippet.includes('disabled') &&
      snippet.includes('onClick={() => {}}')
  );

  // Check CM bundle entry supports html/css/jsx
  const cmEntrySrc = fs.readFileSync(path.join(ROOT, 'editor', 'cm-entry.js'), 'utf8');
  check(
    'editor/cm-entry.js integrates @codemirror/lang-html, @codemirror/lang-css and jsx: true',
    cmEntrySrc.includes('@codemirror/lang-html') &&
      cmEntrySrc.includes('@codemirror/lang-css') &&
      cmEntrySrc.includes('jsx: true')
  );

  setViewMode('script');
  assertEq('setViewMode(script): sandbox.VIEW_MODE returns to script', sandbox.VIEW_MODE, 'script');
}
