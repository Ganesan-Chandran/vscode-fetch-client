import fs from "fs";
import loki, { LokiFsAdapter } from "lokijs";
import { writeLog } from "../../fetch-client-vscode/logger/logger";
import { getSharedDBConfiguration } from "../../fetch-client-vscode/utils/vscodeConfig";

export interface DBCache {
  getLoadedDB: () => Promise<loki>;
  saveDB: (db: loki) => Promise<void>;
  flush: () => Promise<void>;
  invalidate: () => void;
}

export function createDBCache(pathFn: () => string, ttlMs: number = 0): DBCache {
  let cache: loki | null = null;
  let externalChange = false;
  let loadingPromise: Promise<loki> | null = null;
  let ownWriteTimer: NodeJS.Timeout | null = null;
  let watcher: fs.FSWatcher | null = null;
  let evictTimer: NodeJS.Timeout | null = null;

  let dirty = false;
  let saving = false;
  let debounceTimer: NodeJS.Timeout | null = null;
  const pendingResolvers: Array<{ resolve: () => void; reject: (e: Error) => void; }> = [];

  function startWatcher() {
    if (watcher) { return; }
    try {
      watcher = fs.watch(pathFn(), () => {
        if (ownWriteTimer) { return; }
        externalChange = true;
      });
      watcher.on("error", () => { watcher = null; });
    } catch {      /* file may not exist yet */ }
  }

  function resetEvictTimer() {
    if (!ttlMs) { return; }
    if (evictTimer) { clearTimeout(evictTimer); }
    evictTimer = setTimeout(() => {
      cache = null;
      evictTimer = null;
    }, ttlMs);
  }

  function getLoadedDB(): Promise<loki> {
    resetEvictTimer();

    if (cache && !externalChange) {
      return Promise.resolve(cache);
    }

    if (loadingPromise) {
      return loadingPromise;
    }

    externalChange = false;
    loadingPromise = new Promise((resolve, reject) => {
      const db = new loki(pathFn(), { adapter: new LokiFsAdapter() });
      db.autosaveDisable();
      db.loadDatabase({}, (err?: Error) => {
        loadingPromise = null;
        if (err) {
          writeLog("error::dbCache::getLoadedDB(): " + err);
          reject(err);
          return;
        }
        cache = db;
        startWatcher();
        resolve(db);
      });
    });

    return loadingPromise;
  }

  function flushResolvers(err?: Error) {
    const batch = pendingResolvers.splice(0);
    batch.forEach(r => err ? r.reject(err) : r.resolve());
  }

  function triggerSave(db: loki) {
    if (saving) { return; };
    if (!dirty) {
      flushResolvers();
      return;
    }

    const wasDirty = dirty;
    dirty = false;
    saving = true;

    if (ownWriteTimer) { clearTimeout(ownWriteTimer); }
    ownWriteTimer = setTimeout(() => { ownWriteTimer = null; }, 500);

    db.saveDatabase((err?: Error) => {
      saving = false;
      if (err) {
        dirty = dirty || wasDirty;
        writeLog("error::dbCache::triggerSave(): " + err);
        flushResolvers(err);
        return;
      }
      if (dirty) {
        triggerSave(db);
      } else {
        flushResolvers();
      }
    });
  }

  function saveDB(db: loki): Promise<void> {
    dirty = true;

    return new Promise((resolve, reject) => {
      pendingResolvers.push({ resolve, reject });

      if (debounceTimer) { clearTimeout(debounceTimer); }
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        triggerSave(db);
      }, 100);
    });
  }

  function flush(): Promise<void> {
    if (!dirty || !cache) { return Promise.resolve(); }
    if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
    return new Promise((resolve, reject) => {
      pendingResolvers.push({ resolve, reject });
      triggerSave(cache);
    });
  }

  function invalidate() {
    if (pendingResolvers.length > 0) {
      flushResolvers(new Error("DB invalidated - path changed"));
    }
    if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
    if (ownWriteTimer) { clearTimeout(ownWriteTimer); ownWriteTimer = null; }
    if (evictTimer) { clearTimeout(evictTimer); evictTimer = null; }
    if (watcher) { watcher.close(); watcher = null; }
    cache = null;
    dirty = false;
    saving = false;
    loadingPromise = null;
    externalChange = false;
  }

  return { getLoadedDB, saveDB, flush, invalidate };
}

export function createNoopCache(pathFn: () => string): DBCache {
  function getLoadedDB(): Promise<loki> {
    return new Promise((resolve, reject) => {
      const db = new loki(pathFn(), { adapter: new LokiFsAdapter() });
      db.autosaveDisable();
      db.loadDatabase({}, (err?: Error) => {
        if (err) { reject(err); return; }
        resolve(db);
      });
    });
  }

  function saveDB(db: loki): Promise<void> {
    return new Promise((resolve, reject) => {
      db.saveDatabase((err?: Error) => err ? reject(err) : resolve());
    });
  }

  function flush(): Promise<void> { return Promise.resolve(); }
  function invalidate() {    /* nothing to clear */ }

  return { getLoadedDB, saveDB, flush, invalidate };
}

export function createAutoDBCache(pathFn: () => string, ttlMs: number = 0): DBCache {
  const config = getSharedDBConfiguration();
  return config ? createDBCache(pathFn, ttlMs) : createNoopCache(pathFn);
}