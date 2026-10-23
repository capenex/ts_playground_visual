/* ================================================================
   Python / Multi-language sample bridge (src/samples/py-samples.ts)
   ================================================================ */

export function getPyEngine(): any {
  return (globalThis as any).PY_ENGINE || null;
}

export function getPySamples(): Record<string, string> {
  const eng = getPyEngine();
  return (eng && eng.PY_SAMPLES) ? eng.PY_SAMPLES : {};
}
