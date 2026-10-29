/**
 * Suite 03: On-Demand Step Debugger (`startDebug`, `computeAndAppendNextStep`, `runOnce`),
 * Call Stack Frames, Checkpoints (`checkpoint()`, `addCheckpointFunction`),
 * Infinite Loop Watchdog, and Deterministic EventLoop (`async/await`, `Promise`, `setTimeout`).
 */
import { check, assertEq, resetSandbox } from './harness.mjs';

export async function runRuntimeDebugSuite(sandbox, elements) {
  resetSandbox(sandbox);
  const editorEl = elements.get('editor');
  const logEl = elements.get('log');

  // 1. Direct Run (`runOnce`) on all non-crash built-in samples
  for (const [key, expected] of Object.entries(sandbox.TS_SAMPLE_EXPECTED || {})) {
    resetSandbox(sandbox);
    sandbox.clearLog();
    editorEl.value = sandbox.SAMPLES[key];
    sandbox.runOnce();
    if (key === 'async_loop') {
      await new Promise((r) => setTimeout(r, 80));
    }
    check(
      `runOnce [${key}] completes and logs expected output (${expected})`,
      logEl.textContent.includes('运行完成') && logEl.textContent.includes(String(expected)),
      `log=${logEl.textContent}`,
    );
  }

  // 2. Step-by-step On-Demand Debugging (`startDebug`) + Call Stack Depth & Frame Locals
  resetSandbox(sandbox);
  editorEl.value = `
function fib(n: number): number {
  if (n <= 1) return n;
  return fib(n - 1) + fib(n - 2);
}
fib(3)
`;
  sandbox.startDebug(0);
  assertEq('startDebug(0) computes only 1st step on demand', sandbox.TRACE.steps.length, 1);

  let maxStackDepth = 0;
  for (let i = 0; i < 40; i++) {
    if (!sandbox.computeAndAppendNextStep({ silent: true })) break;
    const lastStep = sandbox.TRACE.steps[sandbox.TRACE.steps.length - 1];
    if (lastStep && Array.isArray(lastStep.callStack)) {
      maxStackDepth = Math.max(maxStackDepth, lastStep.callStack.length);
    }
    if (sandbox.DEBUG_SESSION.finished) break;
  }
  check('recursive fib(3) records multi-frame callStack (depth >= 3)', maxStackDepth >= 3, `maxDepth=${maxStackDepth}`);
  check('recursive fib(3) finishes with returnValue 2',
    sandbox.DEBUG_SESSION.finished && sandbox.DEBUG_SESSION.returnValue === 2,
  );

  // 3. Checkpoints (`checkpoint(cond?, msg?)` & `runToNextCheckpoint` & `addCheckpointFunction`)
  resetSandbox(sandbox);
  editorEl.value = `
function demo(): number {
  let sum = 0;
  for (let i = 1; i <= 4; i++) {
    sum += i;
    checkpoint(i === 3, 'iReached3');
  }
  return sum;
}
demo()
`;
  sandbox.startDebug(0);
  sandbox.runToNextCheckpoint();
  const ckptStep = sandbox.TRACE.steps[sandbox.cur];
  check('runToNextCheckpoint skips false conditional checkpoints and halts when cond === true', Boolean(ckptStep && ckptStep.isCheckpoint));
  assertEq('checkpoint(i === 3, "iReached3") captures local variable sum = 6 when i === 3', ckptStep && ckptStep.v && ckptStep.v.sum, 6);
  check('checkpoint(cond, msg) logs message string when triggered', logEl.textContent.includes('iReached3'));

  // Live checkpoint insertion & removal (`addCheckpointFunction`) preserves current step progress
  const stepBeforeInsert = sandbox.cur;
  sandbox.addCheckpointFunction(4);
  check('addCheckpointFunction inserts checkpoint() into source and preserves debug step',
    editorEl.value.includes('checkpoint();') && sandbox.cur >= Math.min(stepBeforeInsert, sandbox.TRACE.steps.length - 1),
  );
  sandbox.addCheckpointFunction(4);
  check('addCheckpointFunction called again on same line removes checkpoint()',
    !editorEl.value.includes('checkpoint();'),
  );

  // 4. Runtime Error Halting (`debug_crash`)
  resetSandbox(sandbox);
  editorEl.value = sandbox.SAMPLES.debug_crash;
  sandbox.startDebug(0);
  for (let i = 0; i < 6; i++) {
    sandbox.runToNextCheckpoint();
    if (sandbox.DEBUG_SESSION.crashed) break;
  }
  check('runtime error halts debug session with crashed=true and errorLine > 0',
    Boolean(sandbox.DEBUG_SESSION.crashed && sandbox.DEBUG_SESSION.errorLine > 0),
  );

  // 5. Infinite Loop Watchdog in `runOnce`
  resetSandbox(sandbox);
  editorEl.value = `
function hang(): number {
  let x = 0;
  while (true) {
    x++;
  }
  return x;
}
hang()
`;
  sandbox.runOnce(60);
  check('runOnce infinite loop watchdog halts execution and reports line number',
    /死循环|超时|熔断/.test(logEl.textContent),
    logEl.textContent,
  );

  // 6. Deterministic Virtual EventLoop (`async/await`, `Promise`, `queueMicrotask`, `setTimeout`)
  resetSandbox(sandbox);
  editorEl.value = `
async function scheduler(): Promise<string> {
  const order: string[] = [];
  setTimeout(() => order.push("timeout"), 10);
  Promise.resolve().then(() => order.push("micro1"));
  queueMicrotask(() => order.push("micro2"));
  order.push("sync");
  await new Promise<void>((r) => setTimeout(r, 20));
  return order.join("->");
}
scheduler()
`;
  sandbox.startDebug(0);
  let sawEventLoopState = false;
  for (let i = 0; i < 80; i++) {
    const step = sandbox.TRACE.steps[sandbox.TRACE.steps.length - 1];
    if (step && step.ds && step.ds.eventLoop) sawEventLoopState = true;
    if (sandbox.DEBUG_SESSION.finished) break;
    if (!sandbox.computeAndAppendNextStep({ silent: true })) break;
  }
  check('async/await step debugger captures virtual EventLoop state (microtasks + macrotasks)', sawEventLoopState);

  // 7. Regressions: B05 (console.log returns undefined in evalCall), B06 (trailing checkpoint line), B07 (inline case step)
  const b05Res = sandbox.evalCall('function f(){ return console.log("hi"); }', 'f()', { instrumented: false });
  check(
    'B05: console.log() returns undefined in normal run (evalCall)',
    b05Res.ok === true && b05Res.value === undefined && b05Res.logs[0] === 'hi',
  );

  resetSandbox(sandbox);
  editorEl.value = [
    'const a: number = 1;',
    'console.log(a);',
    'checkpoint(true, "audit-tail");',
  ].join('\n');
  sandbox.startDebug(0);
  sandbox.runToNextCheckpoint();
  const tailCkptStep = sandbox.TRACE.steps[sandbox.cur];
  assertEq(
    'B06: trailing checkpoint() at end of file is recorded on its own line (line 3)',
    tailCkptStep && tailCkptStep.line,
    3,
  );

  resetSandbox(sandbox);
  editorEl.value = [
    'function label(n: number): string {',
    '  switch (n) {',
    '    case 1: return "one";',
    '    default: return "other";',
    '  }',
    '}',
    'label(1)',
  ].join('\n');
  sandbox.startDebug(0);
  while (!sandbox.DEBUG_SESSION.finished && sandbox.TRACE.steps.length < 20) {
    sandbox.computeAndAppendNextStep({ silent: true });
  }
  check(
    'B07: step debugger visits inline case 1: return "one" on line 3',
    sandbox.TRACE.steps.some((s) => s.line === 3),
  );
}

