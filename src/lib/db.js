// Persistence. IndexedDB, no server. Everything survives a browser restart
// but not a cleared cache — hence the export in settings.

const DB_NAME = 'lawstudy';
// 2: added `termState`. Glossary terms are scheduled by FSRS the same way
// cards are, but in their OWN store rather than in `cardState` with a `kind`
// field. That is not tidiness: `buildQueue`, `counts` and `countsByModule` in
// scheduler.js each scan the whole of `cardState` with no kind filter, so a
// shared store would silently change every number the app shows about legal
// cards — Home, Progress, Arena, every module page — and the damage would
// present as a counting bug in four places rather than a scheduling decision in
// one. A separate store makes that impossible instead of relying on a filter
// nobody forgets.
const DB_VERSION = 2;

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
      if (!db.objectStoreNames.contains('termState')) {
        // one row per glossary term id, same FSRS shape as `cardState`.
        // Terms are NOT seeded in bulk: a term enters the schedule the first
        // time a reader looks it up, because a lookup is the honest signal
        // that they did not know it. Seeding all 499 would hand a reader a
        // backlog they never asked for and would say nothing about what they
        // actually find hard.
        const v = db.createObjectStore('termState', { keyPath: 'id' });
        v.createIndex('due', 'due');
      }
    };
    req.onsuccess = () => {
      _db = req.result;
      // If ANOTHER tab later opens a higher version, it will block on this
      // connection exactly as described below. Stepping out of the way is the
      // only cooperative thing to do: hold on, and the other tab hangs.
      _db.onversionchange = () => { try { _db.close(); } catch { /* already gone */ } _db = null; };
      askToPersist();
      resolve(_db);
    };

    // The hang this exists to stop. Raising DB_VERSION means every open
    // connection at the old version has to close before the upgrade can run.
    // A second tab still on the old version blocks it — and a blocked request
    // fires NEITHER onsuccess NOR onerror, so a promise with only those two
    // handlers never settles. The provider awaits it, `ready` never becomes
    // true, and the app sits on "Opening the file — reading your progress from
    // this device" for ever, with no error anywhere to say why.
    //
    // Rejecting is not a fix for the situation; it is a fix for the SILENCE.
    // The reader gets a screen that names the cause and the action, which is
    // the difference between a bug they can clear themselves and one that
    // looks like their progress is gone.
    req.onblocked = () => reject(new Error(
      'Another tab has this site open and is still using an older version of its '
      + 'storage. Close the other tabs showing this site, then reload this page. '
      + 'Nothing has been lost.',
    ));
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

export const termState = {
  get: (id) => run('termState', 'readonly', s => req(s.get(id))),
  all: () => run('termState', 'readonly', s => req(s.getAll())),
  put: (row) => run('termState', 'readwrite', s => req(s.put(row))),
  del: (id) => run('termState', 'readwrite', s => req(s.delete(id))),
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

const BACKUP_STORES = ['cardState', 'reviewLog', 'attempts', 'meta', 'termState'];

// `exportAll` iterates BACKUP_STORES the way `importAll` already does. It used
// to destructure positionally — `(cs, rl, at, mt)` — and hand-build the payload
// from four literal keys, which made the two halves asymmetric in a way that
// was not merely lossy but destructive:
//
//   Adding a store to BACKUP_STORES put it in the transaction, but `exportAll`
//   never called getAll() on it and never wrote its key into the payload. Then
//   `importAll` — which DOES iterate — would `s.clear()` that store and restore
//   `(payload[name] || [])`, an empty array. Restoring any backup would wipe
//   the new store rather than fail to restore it. On a browser-storage app with
//   no server copy that is the worst failure available.
//
// The asymmetry was the defect; `termState` was only the first store to meet
// it. Iterating on both sides means the next one added cannot reintroduce it.
export async function exportAll() {
  const out = await run(BACKUP_STORES, 'readonly', (...stores) =>
    Object.fromEntries(BACKUP_STORES.map((name, i) => [name, stores[i].getAll()])));
  return {
    format: 'lawstudy-backup',
    // 2: adds `termState`. Bumped because the payload's SHAPE changed; a file
    // whose contents differ from what its version claims is worse than either
    // number. `importAll` does not gate on this — it restores whatever keys it
    // finds — so the bump is honest labelling rather than a compatibility
    // check. Restoring is a full replace, so a v1 file legitimately clears
    // `termState`: that is the existing semantic for every store, not new.
    version: 2,
    exportedAt: new Date().toISOString(),
    ...Object.fromEntries(BACKUP_STORES.map(name => [name, out[name].result])),
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
