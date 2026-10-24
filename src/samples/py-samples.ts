/* ================================================================
   Python / Multi-language sample bridge (src/samples/py-samples.ts)
   ================================================================ */
import type { PyEngineBridge } from '../types';

export function getPyEngine(): PyEngineBridge | null {
  return typeof PY_ENGINE !== 'undefined' ? PY_ENGINE : null;
}

export function getPySamples(): Record<string, string> {
  const eng = getPyEngine();
  return eng && eng.PY_SAMPLES ? eng.PY_SAMPLES : {};
}
