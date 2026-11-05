/**
 * Suite 02: TypeScript Compiler (`stripTypes`, `transpileEnums`, `instrument`, `resolveEntry`)
 * & Educational Subset Type-Checker (`typecheckTS`) + 10 Built-in TS Samples Verification.
 */
import { check, assertEq, resetSandbox } from './harness.mjs';

export async function runCompilerTypecheckSuite(sandbox) {
  resetSandbox(sandbox);

  // 1. Transpilation: stripTypes & transpileEnums
  const tsInput = `
interface NodeItem<T> {
  readonly id: number;
  val: T;
}
type Pair = [number, string];
enum Dir { Up = 1, Down, Label = "DOWN" }
class Counter {
  public count: number = 0;
  constructor(private step: number = 1) {}
  inc(): number {
    this.count += this.step;
    return this.count;
  }
}
function run(): number {
  const c = new Counter(2);
  return c.inc() + Dir.Down;
}
run()
`;
  const stripped = sandbox.stripTypes(tsInput);
  check('stripTypes removes interface & type declarations while preserving line count',
    stripped.split('\n').length === tsInput.split('\n').length &&
    !stripped.includes('interface NodeItem') &&
    !stripped.includes('type Pair ='),
  );
  check('stripTypes expands constructor parameter properties (private step: number = 1)',
    stripped.includes('this.step = step;'),
  );
  check('transpileEnums converts numeric and string enum members into runtime object',
    stripped.includes('Dir') && stripped.includes('Up') && stripped.includes('Down'),
  );

  // 2. Entry Resolution (`resolveEntry`)
  const entryInfo = sandbox.resolveEntry(tsInput, stripped);
  check('resolveEntry detects trailing expression `run()` as entry call',
    Boolean(entryInfo && entryInfo.expr && entryInfo.expr.includes('run()')),
  );

  // 3. AST Instrumentation (`instrument`)
  const names = sandbox.collectNames(stripped);
  const instCode = sandbox.instrument(stripped, tsInput.split('\n'), names);
  check('instrument produces valid instrumented code with __t step hooks',
    typeof instCode === 'string' && instCode.includes('__t('),
  );

  // 4. Built-in 10 TypeScript Samples: Zero Type Errors + Exact Expected Return Values
  const sampleKeys = Object.keys(sandbox.SAMPLES || {});
  assertEq('10 built-in TypeScript samples registered', sampleKeys.length, 10);

  for (const key of sampleKeys) {
    const src = sandbox.SAMPLES[key];
    const diags = sandbox.typecheckTS(src);
    assertEq(`Sample [${key}] has 0 static typecheck errors`, diags.length, 0);
  }

  // 5. Type-Checker Positive & Negative Diagnostic Matrix
  const validAdvancedTs = `
interface User {
  id: number;
  name: string;
  tags?: string[];
}
class Admin implements User {
  id: number;
  name: string;
  role: string = "super";
  constructor(id: number, name: string) {
    this.id = id;
    this.name = name;
  }
  greet(prefix: string = "Hi"): string {
    return \`\${prefix}, \${this.name}\`;
  }
}
function identity<T>(val: T): T {
  return val;
}
function formatInput(x: string | number): string {
  if (typeof x === "number") {
    return x.toFixed(1);
  }
  return x.toUpperCase();
}
const a = new Admin(1, "Ada");
const msg: string = identity(a.greet("Hello")) + " " + formatInput(42);
msg
`;
  assertEq('typecheckTS: valid OOP + generics + typeof narrowing produces 0 errors',
    sandbox.typecheckTS(validAdvancedTs).length,
    0,
  );

  // Negative cases: verify specific TS diagnostic codes
  const errCases = [
    {
      name: 'primitive assignment mismatch (number = string)',
      code: 'const x: number = "bad";',
      expectCode: 'TS2322',
    },
    {
      name: 'function return type mismatch',
      code: 'function f(a: number): number { return "nope"; }\nf(1)',
      expectCode: 'TS2322',
    },
    {
      name: 'argument type mismatch in function call',
      code: 'function add(a: number, b: number): number { return a + b; }\nadd(1, "two")',
      expectCode: 'TS2345',
    },
    {
      name: 'argument count mismatch (too few arguments)',
      code: 'function pair(a: number, b: string): string { return b; }\npair(1)',
      expectCode: 'TS2554',
    },
    {
      name: 'missing required interface property',
      code: 'interface Pt { x: number; y: number; }\nconst p: Pt = { x: 1 };',
      expectCode: 'TS2741',
    },
    {
      name: 'unknown property on interface',
      code: 'interface Box { width: number; }\nconst b: Box = { width: 10 };\nconst z = b.height;',
      expectCode: 'TS2339',
    },
    {
      name: 'reassigning const variable',
      code: 'const port: number = 80;\nport = 90;',
      expectCode: 'TS2588',
    },
    {
      name: 'array element type mismatch',
      code: 'const nums: number[] = [1, 2, "three"];',
      expectCode: 'TS2322',
    },
  ];

  for (const tc of errCases) {
    const diags = sandbox.typecheckTS(tc.code);
    const codes = diags.map((d) => d.code);
    check(
      `typecheckTS catches ${tc.name} (${tc.expectCode})`,
      diags.length > 0 && codes.includes(tc.expectCode),
      `got ${JSON.stringify(diags)}`,
    );
  }

  // 6. Regressions: B07 (inline case/default instrumentation), B08 (throw-only function TS2355), variadic checkpoint()
  const switchSrc = [
    'function pick(n: number): string {',
    '  switch (n) {',
    '    case 1: return "one";',
    '    default: return "other";',
    '  }',
    '}',
  ].join('\n');
  const switchJs = sandbox.stripTypes(switchSrc);
  const switchInst = sandbox.instrument(switchJs, switchSrc.split('\n'), sandbox.collectNames(switchJs));
  check(
    'B07: instrument injects __t hook after colon on inline case/default statements',
    switchInst.includes('case 1: __t(3,') && switchInst.includes('default: __t(4,'),
  );

  const throwOnlyFnSrc = `
function failAlways(msg: string): number {
  throw new Error(msg);
}
failAlways("boom")
`;
  assertEq(
    'B08: function that throws unconditionally is not flagged with TS2355',
    sandbox.typecheckTS(throwOnlyFnSrc).length,
    0,
  );

  const variadicCkptSrc = `
const r: number = 1, sum: number = 9, best: number = 9;
checkpoint("窗口达标", r, sum, best);
`;
  assertEq(
    'typecheckTS accepts variadic/labeled checkpoint("窗口达标", r, sum, best) with 0 errors',
    sandbox.typecheckTS(variadicCkptSrc).length,
    0,
  );

  // 7. Regression: Arrow function parameter & return type inference in CURRENT_TS_META / LOCALS
  const arrowMetaSrc = [
    'let a = () => {};',
    'let add = (x: number, y: number) => x + y;',
    'let ctxFn: (x: number) => string = (x) => String(x);',
    'let multi = (x: number, y = "ok") => {',
    '  const z = x * 2;',
    '  return `${y}:${z}`;',
    '};',
    'let ho = (cb: (n: number) => void) => { cb(1); };',
    'a();',
    'add(1, 2);',
  ].join('\n');
  sandbox.startDebug(1, arrowMetaSrc);
  const fnTypes = sandbox.CURRENT_TS_META && sandbox.CURRENT_TS_META.fnTypes;
  assertEq('arrow fn `let a = () => {}` infers `() => void`', fnTypes && fnTypes.get('a'), '() => void');
  assertEq('arrow fn `let add = (x: number, y: number) => x + y` infers `(x: number, y: number) => number`', fnTypes && fnTypes.get('add'), '(x: number, y: number) => number');
  assertEq('arrow fn with contextual LHS type infers `(x: number) => string`', fnTypes && fnTypes.get('ctxFn'), '(x: number) => string');
  assertEq('multi-line arrow fn with default param infers `(x: number, y?: string) => string`', fnTypes && fnTypes.get('multi'), '(x: number, y?: string) => string');
  assertEq('higher-order arrow fn with callback param infers `(cb: (n: number) => void) => void`', fnTypes && fnTypes.get('ho'), '(cb: (n: number) => void) => void');

  // 8. Customizable tsconfig.json & Default Beginner Mode Verification
  resetSandbox(sandbox);
  assertEq('default TS_CONFIG preset is beginner', sandbox.TS_CONFIG.preset, 'beginner');
  assertEq('default beginner mode disables noImplicitAny & strictNullChecks and enables allowRunOnTypeError',
    {
      noImplicitAny: sandbox.TS_CONFIG.noImplicitAny,
      strictNullChecks: sandbox.TS_CONFIG.strictNullChecks,
      allowRunOnTypeError: sandbox.TS_CONFIG.allowRunOnTypeError,
    },
    { noImplicitAny: false, strictNullChecks: false, allowRunOnTypeError: true },
  );

  const untypedFnSrc = 'function quickAdd(a, b) { return a + b; }\nquickAdd(2, 3)';
  assertEq('beginner mode allows untyped function parameters (0 TS7006 errors)',
    sandbox.typecheckTS(untypedFnSrc).length,
    0,
  );
  assertEq('beginner mode allows null assignment when strictNullChecks is false',
    sandbox.typecheckTS('const maybeNum: number = null;\nmaybeNum').length,
    0,
  );
  check('beginner mode allowRunOnTypeError=true allows startDebug to run despite type mismatch',
    sandbox.startDebug(0, 'const wrong: number = "still_runs";\nwrong') === true,
  );

  // Switch to strict preset
  sandbox.applyTsConfig(sandbox.createTsConfigFromPreset('strict'), true);
  assertEq('strict preset sets preset="strict" and strict=true',
    { preset: sandbox.TS_CONFIG.preset, strict: sandbox.TS_CONFIG.strict, allowRun: sandbox.TS_CONFIG.allowRunOnTypeError },
    { preset: 'strict', strict: true, allowRun: false },
  );
  check('strict mode flags untyped function parameters with TS7006',
    sandbox.typecheckTS(untypedFnSrc).some((d) => d.code === 'TS7006'),
  );
  check('strict mode flags null assignment to number with TS2322 (strictNullChecks)',
    sandbox.typecheckTS('const maybeNum: number = null;').some((d) => d.code === 'TS2322'),
  );
  check('strict mode flags missing return statement with TS2355 (noImplicitReturns)',
    sandbox.typecheckTS('function noRet(x: number): number { const y = x + 1; }\nnoRet(1)').some((d) => d.code === 'TS2355'),
  );
  check('strict mode flags unused local variable with TS6133 (noUnusedLocals)',
    sandbox.typecheckTS('const unusedLocal: number = 99;').some((d) => d.code === 'TS6133'),
  );
  check('strict mode allowRunOnTypeError=false blocks startDebug on type error',
    sandbox.startDebug(0, 'const wrong: number = "blocked";\nwrong') === false,
  );

  // JSON with comments & trailing commas parsing via parseTsConfigJson
  const customJson = `{
    // custom tsconfig with comments
    "compilerOptions": {
      "noImplicitAny": true,
      "strictNullChecks": false,
    },
    "playgroundConfig": {
      "allowRunOnTypeError": true,
    }
  }`;
  const parsedCustom = sandbox.parseTsConfigJson(customJson);
  assertEq('parseTsConfigJson parses JSON with comments and trailing commas',
    {
      err: parsedCustom.error,
      noImplicitAny: parsedCustom.config.noImplicitAny,
      strictNullChecks: parsedCustom.config.strictNullChecks,
      allowRun: parsedCustom.config.allowRunOnTypeError,
      preset: parsedCustom.config.preset,
    },
    { err: null, noImplicitAny: true, strictNullChecks: false, allowRun: true, preset: 'custom' },
  );

  // Restore default beginner preset
  resetSandbox(sandbox);

  // -------------------------------------------------------------------------
  // 9. Algorithm Time & Space Complexity Analyzer (analyzeTimeComplexity)
  // -------------------------------------------------------------------------
  const binSearchSrc = `
function binarySearch(nums: number[], target: number): number {
  let l = 0, r = nums.length - 1;
  while (l <= r) {
    const mid = (l + r) >> 1;
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) l = mid + 1;
    else r = mid - 1;
  }
  return -1;
}
binarySearch([1, 3, 5, 7, 9], 5);`;
  const binReport = sandbox.analyzeTimeComplexity(binSearchSrc, 'binarySearch([1, 3, 5, 7, 9], 5)');
  assertEq('analyzeTimeComplexity identifies O(log N) for binary search', binReport.overallTime, 'O(log N)');

  const slideWinSrc = `
function maxSubArrayLen(nums: number[], k: number): number {
  let l = 0, sum = 0, best = 0;
  for (let r = 0; r < nums.length; r++) {
    sum += nums[r];
    while (sum > k) {
      sum -= nums[l];
      l++;
    }
    if (r - l + 1 > best) best = r - l + 1;
  }
  return best;
}
maxSubArrayLen([1, 2, 3, 4, 5], 6);`;
  const slideReport = sandbox.analyzeTimeComplexity(slideWinSrc, 'maxSubArrayLen([1, 2, 3, 4, 5], 6)');
  assertEq('analyzeTimeComplexity recognizes amortized O(N) for two-pointer sliding window', slideReport.overallTime, 'O(N)');

  const bubbleSrc = `
function bubble(arr: number[]): number[] {
  for (let i = 0; i < arr.length; i++) {
    for (let j = 0; j < arr.length - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        const t = arr[j]; arr[j] = arr[j + 1]; arr[j + 1] = t;
      }
    }
  }
  return arr;
}
bubble([5, 3, 1, 4, 2]);`;
  const bubbleReport = sandbox.analyzeTimeComplexity(bubbleSrc, 'bubble([5, 3, 1, 4, 2])');
  assertEq('analyzeTimeComplexity identifies O(N²) for nested quadratic loops', bubbleReport.overallTime, 'O(N²)');

  const mergeSortSrc = `
function mergeSort(arr: number[]): number[] {
  if (arr.length <= 1) return arr;
  const mid = arr.length >> 1;
  const left = mergeSort(arr.slice(0, mid));
  const right = mergeSort(arr.slice(mid));
  return left.concat(right);
}
mergeSort([4, 2, 1, 3]);`;
  const mergeReport = sandbox.analyzeTimeComplexity(mergeSortSrc, 'mergeSort([4, 2, 1, 3])');
  assertEq('analyzeTimeComplexity identifies O(N log N) for 2-way divide-and-conquer recursion', mergeReport.overallTime, 'O(N log N)');

  const fibSrc = `
function fib(n: number): number {
  if (n <= 1) return n;
  return fib(n - 1) + fib(n - 2);
}
fib(6);`;
  const fibReport = sandbox.analyzeTimeComplexity(fibSrc, 'fib(6)');
  assertEq('analyzeTimeComplexity identifies O(2^N) for unmemoized branching recursion', fibReport.overallTime, 'O(2^N)');
}

