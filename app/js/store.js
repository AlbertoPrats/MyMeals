// Keeps the app state in memory and saves it on the phone (IndexedDB, with a
// localStorage fallback). Every change runs on a copy: if it throws, nothing
// is saved and the error message is shown to the user.

import { applyChange, createState, mergeSeed, validateBackup } from "./core/state.js";

const DB_NAME = "mymeals";
const STORE = "kv";
const KEY = "state";
const LS_KEY = "mymeals-state";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(db) {
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).get(KEY);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(db, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export class Store {
  constructor() {
    this.state = null;
    this.listeners = new Set();
    this.db = null;
    this.saveError = null;
  }

  async load(seed) {
    try {
      this.db = await openDb();
    } catch {
      this.db = null;
    }
    let saved = null;
    try {
      saved = this.db ? await idbGet(this.db) : JSON.parse(localStorage.getItem(LS_KEY) ?? "null");
    } catch {
      saved = null;
    }
    if (!saved) {
      this.state = createState(seed);
      await this.save();
    } else {
      this.state = saved;
      if (seed && saved.seedVersion !== seed.version) {
        // recetas.md changed since the last visit: add/update bundled recipes.
        this.state = applyChange(saved, (d) => mergeSeed(d, seed)).state;
        await this.save();
      }
    }
    // Ask Safari not to evict the data under storage pressure.
    navigator.storage?.persist?.().catch(() => {});
    return this.state;
  }

  async save() {
    try {
      if (this.db) await idbPut(this.db, this.state);
      else localStorage.setItem(LS_KEY, JSON.stringify(this.state));
      this.saveError = null;
    } catch (e) {
      this.saveError = e;
      console.error("Could not save", e);
    }
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Run `fn(draft)`; on success replace the state, save and re-render. */
  update(fn) {
    const { state, result } = applyChange(this.state, fn);
    this.state = state;
    this.save();
    for (const l of this.listeners) l(state);
    return result;
  }

  replace(data) {
    const { exportedAt, ...state } = validateBackup(data);
    this.state = state;
    this.save();
    for (const l of this.listeners) l(state);
  }

  exportJson() {
    return JSON.stringify({ ...this.state, exportedAt: new Date().toISOString() });
  }
}

export const store = new Store();
