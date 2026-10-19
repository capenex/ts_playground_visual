/**
 * Browser E2E smoke: open index.html in headless Chrome, click 生成轨迹,
 * step forward, and assert TRACE / UI state. No Playwright.
 */
import { spawn } from 'child_process';
import { rmSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function findChromeBinary() {
  if (process.env.CHROME_BIN && existsSync(process.env.CHROME_BIN)) {
    return process.env.CHROME_BIN;
  }
  const candidates = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return 'google-chrome';
}

const chrome = findChromeBinary();
const port = 9333;
const profile = path.join(__dirname, '_chrome_profile');
const pageUrl = 'file:///' + path.join(__dirname, 'index.html').replace(/\\/g, '/');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getWsUrl() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      const list = await res.json();
      const page = list.find((t) => t.type === 'page');
      if (page && page.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {
      /* retry */
    }
    await sleep(150);
  }
  throw new Error('CDP not ready');
}

function cdp(ws, method, params = {}, sessionId) {
  return new Promise((resolve, reject) => {
    const id = ++cdp._id;
    cdp._wait.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });
}
cdp._id = 0;
cdp._wait = new Map();

async function main() {
  if (existsSync(profile)) rmSync(profile, { recursive: true, force: true });

  const proc = spawn(
    chrome,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      'about:blank',
    ],
    { stdio: 'ignore', detached: false }
  );

  let ws;
  try {
    const wsUrl = await getWsUrl();
    ws = new WebSocket(wsUrl);
    await new Promise((res, rej) => {
      ws.onopen = res;
      ws.onerror = rej;
    });
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && cdp._wait.has(msg.id)) {
        const { resolve, reject } = cdp._wait.get(msg.id);
        cdp._wait.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    };

    await cdp(ws, 'Page.enable');
    await cdp(ws, 'Runtime.enable');
    await cdp(ws, 'Page.navigate', { url: pageUrl });
    await sleep(800);

    const evalJs = async (expression) => {
      const r = await cdp(ws, 'Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
      if (r.exceptionDetails) {
        throw new Error(r.exceptionDetails.text + ' ' + JSON.stringify(r.exceptionDetails.exception || {}));
      }
      return r.result.value;
    };

    let failed = 0;
    const check = (name, cond, extra) => {
      if (cond) console.log('OK  ' + name);
      else {
        console.log('FAIL ' + name + (extra !== undefined ? ' :: ' + String(extra) : ''));
        failed++;
      }
    };

    // page loaded -> showcase sample is active & Debug Mode is automatically started on boot
    const title = await evalJs('document.title');
    check('page title', title.includes('TypeScript'), title);

    const hasCode = await evalJs('document.getElementById("highlight").textContent.includes("function visualShowcase")');
    check('editor chrome rendered with showcase', hasCode);

    const bootState = await evalJs(`(() => ({
      cnt: document.getElementById('cnt').textContent,
      slots: document.getElementById('slots').innerHTML,
      hl: document.getElementById('highlight').innerHTML,
      viz: document.getElementById('stepViz').innerHTML,
      vizDisplay: document.getElementById('stepViz').style.display,
      hasTsBadge: Boolean(document.querySelector('.ts-only') || document.getElementById('btnStrict')),
      hasNextCkptBtn: Boolean(document.getElementById('nextCheckpoint')),
      hasAddCkptBtn: Boolean(document.getElementById('btnAddCheckpoint')),
      hasImport: Boolean(document.getElementById('btnImport') && document.getElementById('fileInput')),
      fileName: (document.getElementById('fileName') || {}).value,
      exportName: (document.getElementById('fileExportTag') || {}).textContent
    }))()`);
    check('TypeScript badge removed', !bootState.hasTsBadge);
    check('checkpoint buttons rendered', bootState.hasNextCkptBtn && bootState.hasAddCkptBtn);
    check('import button + editable file chip rendered', bootState.hasImport && bootState.fileName === 'showcase.ts' && bootState.exportName === 'showcase.ts', JSON.stringify({ f: bootState.fileName, e: bootState.exportName }));
    check('auto debug on boot (no step numbers in #cnt)', bootState.cnt.includes('调试') && !/\d/.test(bootState.cnt), bootState.cnt);
    check('floating step capsule rendered above the code layer', bootState.viz.includes('step-viz-row') && bootState.vizDisplay === 'block' && !bootState.hl.includes('step-viz-row'));

    // run
    await evalJs('document.getElementById("btnRun").click()');
    await sleep(200);
    const runLog = await evalJs('document.getElementById("log").textContent');
    check('run ok', /运行完成/.test(runLog) && /29/.test(runLog), runLog.slice(-120));

    // start fresh debug session from step 0
    await evalJs('document.getElementById("btnTrace").click()');
    await sleep(300);
    const state = await evalJs(`(() => {
      const log = document.getElementById('log').textContent;
      const cnt = document.getElementById('cnt').textContent;
      const vars = document.getElementById('vars').textContent;
      const slots = document.getElementById('slots').textContent;
      const consoleTxt = document.getElementById('console').textContent;
      const hl = document.getElementById('highlight').innerHTML;
      return { log, cnt, vars, slots, consoleTxt, stepsLen: TRACE.steps.length, hlHasCur: /class="ln cur"/.test(hl) || /ln cur/.test(hl) };
    })()`);
    check('debug mode started on demand (1st step only)', /Debug 模式/.test(state.log) && state.stepsLen === 1, 'stepsLen=' + state.stepsLen);
    check('status badge shows no step numbers', !/\d/.test(state.cnt), state.cnt);
    check('current line marked', state.hlHasCur);

    // step forward on demand
    await evalJs('document.getElementById("next").click()');
    await evalJs('document.getElementById("next").click()');
    await evalJs('document.getElementById("next").click()');
    await sleep(200);
    const after = await evalJs(`(() => ({
      stepsLen: TRACE.steps.length,
      cur: cur,
      consoleTxt: document.getElementById('console').textContent,
      vars: document.getElementById('vars').textContent,
      slots: document.getElementById('slots').innerHTML
    }))()`);
    check('stepping computes steps on the spot', after.stepsLen === 4 && after.cur === 3, 'stepsLen=' + after.stepsLen);
    check('step note shown', after.consoleTxt.includes('›'), after.consoleTxt.slice(0, 80));
    check('viz rendered', /gcell|vcell|vstr|vcol|vmap-row|vgrid|vsvg-node/.test(after.slots), after.slots.slice(0, 100));

    // click Run to Next Checkpoint
    await evalJs('document.getElementById("nextCheckpoint").click()');
    await sleep(200);
    const ckptState = await evalJs(`(() => ({
      cnt: document.getElementById('cnt').textContent,
      isCkpt: Boolean(TRACE.steps[cur] && TRACE.steps[cur].isCheckpoint),
      viz: document.getElementById('stepViz').innerHTML
    }))()`);
    check('runToNextCheckpoint stops at checkpoint', ckptState.isCkpt && ckptState.cnt.includes('检查点') && ckptState.viz.includes('CHECKPOINT'), ckptState.cnt);

    // sample switch to debug_crash and run until runtime error
    await evalJs(`(() => { const s = document.getElementById('sampleSel'); s.value = 'debug_crash'; s.dispatchEvent(new Event('change')); })()`);
    await sleep(250);
    for (let i = 0; i < 6; i++) {
      await evalJs('document.getElementById("nextCheckpoint").click()');
    }
    await sleep(200);
    const crashDom = await evalJs(`(() => ({
      cnt: document.getElementById('cnt').textContent,
      crashed: DEBUG_SESSION.crashed,
      viz: document.getElementById('stepViz').innerHTML
    }))()`);
    check('runtime error halts debug session and renders RUNTIME ERROR capsule', crashDom.crashed && crashDom.cnt.includes('报错') && crashDom.viz.includes('RUNTIME ERROR'), crashDom.cnt);

    console.log(failed ? `\n${failed} FAILED` : '\nall passed');
    process.exitCode = failed ? 1 : 0;
  } finally {
    try {
      ws && ws.close();
    } catch { /* ignore */ }
    try {
      proc.kill('SIGKILL');
    } catch { /* ignore */ }
    await sleep(300);
    try {
      if (existsSync(profile)) rmSync(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    } catch { /* chrome may still hold the profile */ }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
