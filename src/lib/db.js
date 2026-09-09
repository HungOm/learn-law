// Persistence. IndexedDB, no server. Everything survives a browser restart
// but not a cleared cache — hence the export in settings.

const DB_NAME = 'lawstudy';
const DB_VERSION = 1;

let _db = null;

/**
 * Ask the browser to stop treating this data as disposable.
 *
 * Without this, IndexedDB is "best-effort": Chrome and Safari may evict the
 * whole origin under storage pressure, and the reader loses every section they
 * marked, every card's schedule and every point of XP with no warning and no
 * action of their own to explain it. Granted, the data survives until the
 * reader deletes it themselves. Chrome usually grants it silently to a site
 * with any engagement; Safari asks. Either way it is best-effort and never a
 * substitute for the export in Settings, which is the only real backup.
 *
 * Fire-and-forget: a refusal is not an error and must never stop the app
 * opening. Called once, from `open()`, because that is the one path every
 * store goes through.
 */
function askToPersist() {
  try {
    navigator.storage?.persist?.().catch(() => {});
  } catch { /* no navigator.storage: nothing to ask, nothing to report */ }
}

export function open() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('cardState')) {
        // one row per card id: the FSRS state (stability, difficulty, due...)
        const s = db.createObjectStore('cardState', { keyPath: 'id' });
        s.createIndex('due', 'due');
        s.createIndex('moduleId', 'moduleId');
      }
      if (!db.objectStoreNames.contains('reviewLog')) {
        // append-only. Never mutated. This is what FSRS optimisation would use.
        db.createObjectStore('reviewLog', { keyPath: 'logId', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('attempts')) {
        // problem-question attempts + self-marks + calibration prediction
        const a = db.createObjectStore('attempts', { keyPath: 'attemptId', autoIncrement: true });
        a.createIndex('problemId', 'problemId');
        a.createIndex('moduleId', 'moduleId');
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => { _db = req.result; askToPersist(); resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Run `fn` against an object store. The transaction is created and the request
 * placed in the same synchronous block — IndexedDB auto-commits a transaction
 * as soon as control returns to the event loop with no pending requests, so
 * splitting those across two microtasks produces intermittent
 * TransactionInactiveError under load.
 */
async function run(stores, mode, fn) {
  const db = await open();
  const names = Array.isArray(stores) ? stores : [stores];
  const t = db.transaction(names, mode);
  const result = fn(...names.map(n => t.objectStore(n)), t);
  return new Promise((resolve, reject) => {
    t.oncomplete = () => resolve(result && result.__req ? result.__req.result : result);
    t.onabort = t.onerror = () => reject(t.error);
  });
}

/** Marker so `run` can return a request's result once the transaction commits. */
const req = (request) => ({ __req: request });

export const cardState = {
  get: (id) => run('cardState', 'readonly', s => req(s.get(id))),
  all: () => run('cardState', 'readonly', s => req(s.getAll())),
  put: (row) => run('cardState', 'readwrite', s => req(s.put(row))),
  putMany: (rows) => run('cardState', 'readwrite', s => { rows.forEach(r => s.put(r)); }),
};

export const reviewLog = {
  add: (row) => run('reviewLog', 'readwrite', s => req(s.add(row))),
  all: () => run('reviewLog', 'readonly', s => req(s.getAll())),
  count: () => run('reviewLog', 'readonly', s => req(s.count())),
};

export const attempts = {
  add: (row) => run('attempts', 'readwrite', s => req(s.add(row))),
  all: () => run('attempts', 'readonly', s => req(s.getAll())),
  byModule: (moduleId) =>
    run('attempts', 'readonly', s => req(s.index('moduleId').getAll(moduleId))),
};

export const meta = {
  get: async (key, fallback = null) => {
    const row = await run('meta', 'readonly', s => req(s.get(key)));
    return row ? row.value : fallback;
  },
  set: (key, value) => run('meta', 'readwrite', s => req(s.put({ key, value }))),
  del: (key) => run('meta', 'readwrite', s => req(s.delete(key))),
};

// --- backup ---------------------------------------------------------------
// The single most important feature in a browser-storage app. Clearing site
// data wipes years of review history; there is no server copy.

const BACKUP_STORES = ['cardState', 'reviewLog', 'attempts', 'meta'];

export async function exportAll() {
  const out = await run(BACKUP_STORES, 'readonly', (cs, rl, at, mt) => {
    const reqs = { cardState: cs.getAll(), reviewLog: rl.getAll(), attempts: at.getAll(), meta: mt.getAll() };
    return reqs;
  });
  return {
    format: 'lawstudy-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    cardState: out.cardState.result,
    reviewLog: out.reviewLog.result,
    attempts: out.attempts.result,
    meta: out.meta.result,
  };
}

export async function importAll(payload) {
  if (!payload || payload.format !== 'lawstudy-backup') {
    throw new Error('That file is not a study backup.');
  }
  await run(BACKUP_STORES, 'readwrite', (...stores) => {
    BACKUP_STORES.forEach((name, i) => {
      const s = stores[i];
      s.clear();
      (payload[name] || []).forEach(row => s.put(row));
    });
  });
  return true;
}
