/* Storage Version Guard for TypeScript Playground VISUAL.
   - Runs in <head> before any application or session script reads localStorage/IndexedDB.
   - Compares localStorage['ts-playground-storage-version'] against CURRENT_STORAGE_VERSION.
   - If missing or mismatched, deletes ONLY keys owned by this app ('ts-playground-*' except
     the version key itself, and 'ts-visual-*') without clearing the entire origin storage,
     preserving other same-origin apps (e.g. /ui/notes/, music).
   - Best-effort cleanup of IndexedDB databases prefixed with 'ts-playground' or 'ts-visual'
     or named 'playground'.
   - Silently degrades on any storage error (private mode, quota, disabled storage). */
(function (globalScope) {
  'use strict';

  var STORAGE_VERSION_KEY = 'ts-playground-storage-version';
  var CURRENT_STORAGE_VERSION = '20261026-1';

  function isOwnedLocalStorageKey(key) {
    if (typeof key !== 'string' || key === STORAGE_VERSION_KEY) return false;
    return key.indexOf('ts-playground-') === 0 || key.indexOf('ts-visual-') === 0;
  }

  function isOwnedIndexedDbName(name) {
    if (typeof name !== 'string' || !name) return false;
    return (
      name === 'playground' ||
      name.indexOf('ts-playground') === 0 ||
      name.indexOf('ts-visual') === 0
    );
  }

  function isValidUserPayload(keyName, rawValue) {
    if (typeof rawValue !== 'string' || !rawValue) return false;
    try {
      var parsed = JSON.parse(rawValue);
      if (!parsed || typeof parsed !== 'object') return false;
      if (keyName === 'ts-playground-session-v1') {
        if (parsed.v !== 1) return false;
        var hasTsSrc = Boolean(parsed.ts && typeof parsed.ts.src === 'string');
        var hasTabs = Boolean(parsed.tabsSession && Array.isArray(parsed.tabsSession.tabs) && parsed.tabsSession.tabs.length > 0);
        return hasTsSrc || hasTabs;
      }
      if (keyName === 'ts-visual-vfs-workspace-v2') {
        return Array.isArray(parsed.nodes) || Array.isArray(parsed);
      }
      if (keyName === 'ts-visual-notebooks-v1') {
        return Array.isArray(parsed.docs) && parsed.docs.length > 0;
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  function runStorageVersionGuard(customStorage, customIndexedDB, targetVersion) {
    var version = typeof targetVersion === 'string' && targetVersion ? targetVersion : CURRENT_STORAGE_VERSION;
    var result = {
      version: version,
      matched: false,
      cleaned: false,
      removedKeys: [],
      preservedKeys: [],
      error: null
    };

    try {
      var storage = customStorage !== undefined
        ? customStorage
        : (typeof localStorage !== 'undefined' ? localStorage : null);
      if (!storage) return result;

      var storedVersion = storage.getItem(STORAGE_VERSION_KEY);
      if (storedVersion === version) {
        result.matched = true;
        return result;
      }

      var keysSnapshot = [];
      var len = typeof storage.length === 'number' ? storage.length : 0;
      for (var i = 0; i < len; i++) {
        var k = storage.key(i);
        if (typeof k === 'string') {
          keysSnapshot.push(k);
        }
      }

      for (var j = 0; j < keysSnapshot.length; j++) {
        var keyName = keysSnapshot[j];
        if (isOwnedLocalStorageKey(keyName)) {
          if (keyName.indexOf('ts-playground-backup-') === 0) {
            continue;
          }
          var rawVal = storage.getItem(keyName);
          if (isValidUserPayload(keyName, rawVal)) {
            result.preservedKeys.push(keyName);
            continue;
          }
          if (typeof rawVal === 'string' && rawVal.length > 0 && keyName !== 'ts-visual-vfs-v1') {
            try {
              storage.setItem('ts-playground-backup-' + keyName, rawVal);
            } catch (_) { /* ignore quota */ }
          }
          storage.removeItem(keyName);
          result.removedKeys.push(keyName);
        }
      }

      storage.setItem(STORAGE_VERSION_KEY, version);
      result.cleaned = true;
    } catch (err) {
      result.error = err;
    }

    try {
      if (result.cleaned) {
        var idb = customIndexedDB !== undefined
          ? customIndexedDB
          : (typeof indexedDB !== 'undefined' ? indexedDB : null);
        if (idb && typeof idb.databases === 'function' && typeof idb.deleteDatabase === 'function') {
          Promise.resolve(idb.databases())
            .then(function (dbs) {
              if (!Array.isArray(dbs)) return;
              for (var d = 0; d < dbs.length; d++) {
                var dbInfo = dbs[d];
                var dbName = dbInfo && typeof dbInfo.name === 'string' ? dbInfo.name : '';
                if (isOwnedIndexedDbName(dbName)) {
                  try { idb.deleteDatabase(dbName); } catch (_) { /* ignore */ }
                }
              }
            })
            .catch(function () { /* ignore */ });
        }
      }
    } catch (_) {
      /* ignore IndexedDB errors */
    }

    return result;
  }

  try {
    if (globalScope && typeof globalScope === 'object') {
      globalScope.__TS_PLAYGROUND_STORAGE_VERSION_KEY__ = STORAGE_VERSION_KEY;
      globalScope.__TS_PLAYGROUND_STORAGE_VERSION__ = CURRENT_STORAGE_VERSION;
      globalScope.__runStorageVersionGuard = runStorageVersionGuard;
    }
  } catch (_) { /* ignore */ }

  runStorageVersionGuard();
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
