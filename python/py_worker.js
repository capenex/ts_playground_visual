/* Pyodide worker: loads the runtime once, then answers syntax-check and run requests.
   All payloads cross the worker boundary as JSON strings, so no PyProxy leaks. */

let pyodide = null;
let bridgeReady = false;
let numpyReady = false;

function post(message) {
  self.postMessage(message);
}

async function init(runtimeBase) {
  try {
    importScripts(runtimeBase + 'pyodide.js');
    pyodide = await loadPyodide({ indexURL: runtimeBase });
    const bridgeUrl = new URL('py_bridge.py', self.location.href);
    const response = await fetch(bridgeUrl);
    if (!response.ok) throw new Error('无法加载 py_bridge.py: HTTP ' + response.status);
    const bridgeSource = await response.text();
    pyodide.runPython(bridgeSource);
    bridgeReady = true;
    post({ type: 'ready', version: pyodide.version });
  } catch (err) {
    post({ type: 'init-error', message: String((err && err.message) || err) });
  }
}

async function ensureNumpy(source) {
  if (numpyReady) return;
  if (!/(^|\n)\s*(?:import\s+numpy\b|from\s+numpy\b)/.test(source)) return;
  await pyodide.loadPackage('numpy');
  numpyReady = true;
}

self.onmessage = async (event) => {
  const message = event.data || {};
  if (message.type === 'init') {
    await init(message.runtimeBase);
    return;
  }
  if (!bridgeReady || !pyodide) {
    post({ type: 'request-error', id: message.id, message: 'Python 运行时尚未就绪' });
    return;
  }
  try {
    if (message.type === 'check') {
      const check = pyodide.globals.get('check_syntax_json');
      try {
        const payload = check(message.source);
        post({ type: 'check-result', id: message.id, payload });
      } finally {
        check.destroy();
      }
      return;
    }
    if (message.type === 'run') {
      await ensureNumpy(message.source || '');
      const run = pyodide.globals.get('run_trace_json');
      try {
        const payload = run(message.source, JSON.stringify(message.options || {}));
        post({ type: 'run-result', id: message.id, payload });
      } finally {
        run.destroy();
      }
      return;
    }
    post({ type: 'request-error', id: message.id, message: '未知请求: ' + message.type });
  } catch (err) {
    post({
      type: 'request-error',
      id: message.id,
      message: String((err && err.message) || err),
    });
  }
};
