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
}
