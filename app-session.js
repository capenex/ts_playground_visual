/* Session persistence + share links for TypeScript Playground VISUAL.
   - Autosaves the current code / file name / language to localStorage.
   - Restores the last session on reload (without auto-running it).
   - Share links put compressed code in the URL hash; opening one only loads it.

   Security note: shared code is NOT auto-run. Running it still executes in the
   page's origin, so the UI warns the user before they press Run/Debug. */
(function () {
  'use strict';

  const KEY = 'ts-playground-session-v1';
  const IN_SANDBOX = (() => {
    try { return new URLSearchParams(location.search).get('sandbox') === '1'; } catch (_) { return false; }
  })();
  if (IN_SANDBOX && typeof window !== 'undefined') window.__SANDBOX_MODE = true;
  const editor = document.getElementById('editor');
  const fileNameEl = document.getElementById('fileName');
  const sampleSel = document.getElementById('sampleSel');
  const shareBtn = document.getElementById('btnShareLink');
  const exportWrap = document.getElementById('exportMenuWrap');

  let ready = false;
  let shareMode = false;
  let saveTimer = null;

  function saySafe(msg, cls, line) {
    try { say(msg, cls, line); } catch (_) { /* ignore */ }
  }

  function currentLang() {
    return 'ts';
  }

  function currentName() {
    if (typeof getActiveScriptTab === 'function') {
      const activeTab = getActiveScriptTab('ts');
      if (activeTab && activeTab.title) return activeTab.title;
    }
    if (typeof FILE_NAME !== 'undefined' && FILE_NAME) return FILE_NAME;
    return (fileNameEl && fileNameEl.value) || 'playground.ts';
  }

  function snapshot() {
    const lang = currentLang();
    if (typeof syncActiveScriptTabSource === 'function' && editor) {
      try { syncActiveScriptTabSource(editor.value); } catch (_) {}
    }
    const current = { src: editor ? editor.value : '', name: currentName() };
    if (typeof LANG_BUFFERS !== 'undefined') {
      LANG_BUFFERS.ts = current;
    }
    const tabsSession = typeof serializeScriptTabsSession === 'function'
      ? serializeScriptTabsSession()
      : null;
    return {
      v: 1,
      at: Date.now(),
      lang,
      ts: (typeof LANG_BUFFERS !== 'undefined' && LANG_BUFFERS.ts) ? LANG_BUFFERS.ts : current,
      tabsSession,
    };
  }

  function saveNow() {
    if (!ready || shareMode) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(snapshot()));
    } catch (_) { /* quota / private mode */ }
  }

  function scheduleSave() {
    if (!ready || shareMode) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 500);
  }

  function readSaved() {
    try {
      if (typeof localStorage === 'undefined') return null;
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const state = JSON.parse(raw);
      if (!state || state.v !== 1) return null;
      const buf = state.ts;
      const hasTabs = Boolean(state.tabsSession && Array.isArray(state.tabsSession.tabs) && state.tabsSession.tabs.length > 0);
      if ((!buf || typeof buf.src !== 'string') && !hasTabs) return null;
      return state;
    } catch (_) {
      return null;
    }
  }

  function applyState(state, source) {
    if (!state) return false;
    const buf = state.ts;
    const hasTabs = Boolean(state.tabsSession && Array.isArray(state.tabsSession.tabs) && state.tabsSession.tabs.length > 0);
    if ((!buf || typeof buf.src !== 'string') && !hasTabs) return false;

    let restoredTabs = false;
    if (hasTabs && typeof restoreScriptTabsSession === 'function') {
      try {
        restoredTabs = Boolean(restoreScriptTabsSession(state.tabsSession));
      } catch (_) {}
    }

    let targetSrc = buf && typeof buf.src === 'string' ? buf.src : '';
    let targetName = (buf && buf.name) ? buf.name : (source === 'share' ? 'shared.ts' : 'playground.ts');

    if (restoredTabs && typeof getActiveScriptTab === 'function') {
      const activeTab = getActiveScriptTab('ts');
      if (activeTab) {
        targetSrc = activeTab.source;
        targetName = activeTab.title || targetName;
      }
    } else if (typeof getActiveScriptTab === 'function') {
      const activeTab = getActiveScriptTab('ts');
      if (activeTab) {
        activeTab.title = targetName;
        activeTab.source = targetSrc;
      }
    }

    if (typeof LANG_BUFFERS !== 'undefined') {
      LANG_BUFFERS.ts = { src: targetSrc, name: targetName };
    }
    if (typeof LANG !== 'undefined') LANG = 'ts';
    if (typeof setScriptTabSyncing === 'function') setScriptTabSyncing(true);
    if (editor) editor.value = targetSrc;
    if (typeof setFileName === 'function') {
      setFileName(targetName);
    } else if (fileNameEl) {
      fileNameEl.value = targetName;
    }
    if (typeof setScriptTabSyncing === 'function') setScriptTabSyncing(false);
    if (typeof renderScriptTabsUI === 'function') renderScriptTabsUI();
    if (typeof renderVfsTreeUI === 'function') renderVfsTreeUI();
    if (typeof updateEditorChrome === 'function') updateEditorChrome();

    if (source === 'share') {
      shareMode = true;
      saySafe('⚠ 已加载分享链接中的代码，未自动运行。请先检查代码，再点「运行」或「Debug」；运行会以当前页面的权限执行。', 'err');
    } else {
      saySafe('✓ 已恢复上次编辑内容（自动保存）', 'ok');
    }
    return true;
  }

  /* ── base64url + gzip helpers ── */
  function toB64Url(bytes) {
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function fromB64Url(text) {
    const padded = text.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((text.length + 3) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  async function packState(state) {
    const bytes = new TextEncoder().encode(JSON.stringify(state));
    if (typeof CompressionStream === 'function') {
      try {
        const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
        const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
        return 'g' + toB64Url(compressed);
      } catch (_) { /* fall through */ }
    }
    return 'j' + toB64Url(bytes);
  }

  async function unpackState(encoded) {
    if (!encoded) throw new Error('空链接');
    const kind = encoded[0];
    let bytes = fromB64Url(encoded.slice(1));
    if (kind === 'g') {
      if (typeof DecompressionStream !== 'function') throw new Error('当前浏览器不支持解压分享链接');
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
      bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    } else if (kind !== 'j') {
      throw new Error('未知的分享链接格式');
    }
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  async function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.left = '-9999px';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand && document.execCommand('copy');
    document.body.removeChild(area);
    if (!ok) throw new Error('剪贴板不可用');
  }

  async function copyShareLink() {
    if (exportWrap) exportWrap.classList.remove('open');
    const tag = document.getElementById('shareLinkTag');
    try {
      const encoded = await packState(snapshot());
      const base = (typeof location !== 'undefined' && location.origin && location.pathname)
        ? location.origin + location.pathname + (location.search || '')
        : '';
      const url = base + '#s=' + encoded;
      if (typeof history !== 'undefined' && history && typeof history.replaceState === 'function') {
        try { history.replaceState(null, '', '#s=' + encoded); } catch (_) {}
      }
      await copyText(url);
      if (tag) {
        tag.textContent = '✓ 已复制';
        setTimeout(() => { tag.textContent = '含当前代码'; }, 2000);
      }
      saySafe('✓ 已复制分享链接（含当前代码，打开后仅加载不自动运行）', 'ok');
    } catch (err) {
      if (tag) tag.textContent = '复制失败';
      saySafe('✗ 复制分享链接失败：' + ((err && err.message) || err), 'err');
    }
  }

  async function restoreFromHash() {
    try {
      const hash = (typeof location !== 'undefined' && location.hash) || '';
      if (!hash.startsWith('#s=')) return false;
      const state = await unpackState(hash.slice(3));
      let normalized = state;
      if (!state || state.v !== 1) {
        if (state && (state.src || state.ts)) {
          normalized = {
            v: 1,
            lang: 'ts',
            ts: { src: state.src || (state.ts && state.ts.src), name: state.name || (state.ts && state.ts.name) },
          };
        } else {
          throw new Error('无效的分享数据');
        }
      }
      const ok = applyState(normalized, 'share');
      if (!ok) throw new Error('分享数据里没有可加载的代码');
      return true;
    } catch (err) {
      saySafe('✗ 分享链接解析失败：' + ((err && err.message) || err), 'err');
      return false;
    }
  }

  async function bootRestore() {
    if (!window.__BOOT_DEFERRED) {
      ready = true;
      return;
    }

    if (await restoreFromHash()) {
      ready = true;
      return;
    }

    let qsLang = null;
    let qsSample = null;
    try {
      const qs = new URLSearchParams(location.search);
      qsLang = qs.get('lang');
      qsSample = qs.get('sample') || qs.get('trace');
    } catch (_) { /* ignore */ }

    if (qsLang === 'ts' || qsSample) {
      try { loadSample(qsSample && SAMPLES[qsSample] ? qsSample : 'showcase'); } catch (_) {}
      ready = true;
      return;
    }

    const saved = readSaved();
    if (saved && applyState(saved, 'saved')) {
      ready = true;
      return;
    }

    try { loadSample('showcase'); } catch (_) {}
    ready = true;
  }

  if (editor) {
    editor.addEventListener('input', () => {
      shareMode = false;
      scheduleSave();
    });
  }
  if (fileNameEl) {
    fileNameEl.addEventListener('change', () => { shareMode = false; scheduleSave(); });
    fileNameEl.addEventListener('blur', () => { shareMode = false; scheduleSave(); });
  }
  if (sampleSel) {
    sampleSel.addEventListener('change', () => {
      shareMode = false;
      setTimeout(scheduleSave, 700);
    });
  }
  if (shareBtn) shareBtn.addEventListener('click', copyShareLink);
  document.addEventListener('ts-session-change', () => {
    if (!ready) return;
    shareMode = false;
    scheduleSave();
  });
  window.addEventListener('pagehide', saveNow);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveNow();
  });
  setTimeout(() => {
    saySafe('ℹ 类型检查：TS 为内置子集检查器（不是完整 tsc）。点击代码栏右上角「TS 子集检查」徽标查看边界。', 'dim');
    if (IN_SANDBOX) {
      saySafe('ℹ 沙箱预览模式：不能访问本地会话，编辑内容不会自动保存；分享代码不会自动运行。', 'dim');
    }
  }, 450);

  bootRestore().then(() => {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'ts-playground-ready',
          lang: 'ts',
          fileName: (typeof FILE_NAME !== 'undefined' ? FILE_NAME : ''),
        }, '*');
      }
    } catch (_) { /* ignore */ }
  });
})();
