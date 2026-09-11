#!/usr/bin/env node
/**
 * Prove the vocabulary loop actually closes: look up -> enrol -> review -> schedule.
 *
 * WHY THIS EXISTS AND WHY `smoke` CANNOT DO IT.
 *
 * `smoke` walks routes and asserts they mount without errors. `/vocab` mounts
 * perfectly with an empty queue — which is exactly what it renders when the
 * feature is doing nothing at all. So a green `smoke` is consistent with the
 * whole feature being inert, and would stay green if the one `recordLookup`
 * call in `Term.jsx` were never added, or added to the wrong handler, or added
 * and later removed by a refactor that had no idea it mattered.
 *
 * The feature spans three things that no single gate sees together: a glossary
 * popover in `Term.jsx`, a store in `db.js`, and a route in `Vocab.jsx`. Each
 * is independently fine while the chain between them is broken.
 *
 * So this walks the chain a reader walks:
 *
 *   1. open a lesson and click an underlined glossary term
 *   2. assert a row appeared in `termState` -- the lookup was recorded
 *   3. assert `/vocab` offers that term for review rather than its empty state
 *   4. grade it, and assert the due date MOVED
 *   5. assert a lookup ALONE does not move a due date (the design claim)
 *   6. assert `exportAll` carries `termState` (the backup fix)
 *
 * Step 5 is the one most likely to be broken by a well-meaning future edit, and
 * step 6 is the one whose failure is silent and destructive.
 *
 *     node tools/vocab-loop.mjs
 */

import { spawn } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';

const CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
];
const exe = CANDIDATES.find(p => existsSync(p));
if (!exe) { console.error('vocab-loop: no Chrome found'); process.exit(1); }

let chromium;
try { ({ chromium } = await import('playwright-core')); }
catch { console.error('vocab-loop: playwright-core not installed'); process.exit(1); }

const distIndex = 'dist/index.html';
if (!existsSync(distIndex)) {
  console.error('vocab-loop: FAILED — no dist/index.html. Run `npm run build` first.');
  process.exit(1);
}

// Same per-process port rule as smoke/responsive: a pinned port passes its
// readiness probe against ANOTHER session's preview and then dies mid-walk.
const port = 4460 + (process.pid % 40);
const server = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'],
  { stdio: 'ignore', detached: false });
const base = `http://localhost:${port}/`;
const wait = ms => new Promise(r => setTimeout(r, ms));
const startedAgainst = statSync(distIndex).mtimeMs;

const results = [];
const check = (ok, what, detail = '') => {
  results.push({ ok, what, detail });
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${what}${detail ? `  — ${detail}` : ''}`);
};

// Read a store without naming a version: this harness seeds an existing
// database, it does not own the schema. Naming one makes it a second copy of
// DB_VERSION that nothing keeps in step.
const readStore = (name) => `
  new Promise((res, rej) => {
    const o = indexedDB.open('lawstudy');
    o.onerror = () => rej(o.error);
    o.onsuccess = () => {
      const db = o.result;
      if (!db.objectStoreNames.contains('${name}')) { db.close(); return res(null); }
      const t = db.transaction('${name}', 'readonly');
      const r = t.objectStore('${name}').getAll();
      r.onsuccess = () => { db.close(); res(r.result); };
      r.onerror = () => { db.close(); rej(r.error); };
    };
  })`;

try {
  for (let i = 0; i < 40 && !(await fetch(base).then(r => r.ok).catch(() => false)); i++) await wait(250);
  const browser = await chromium.launch({ executablePath: exe });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', e => console.error('  page error:', e.message.split('\n')[0].slice(0, 140)));

  // Unlock lessons, or a progression panel is walked instead of a lesson body
  // and there are no glossary terms on it to click.
  await page.goto(base, { waitUntil: 'load' });
  await page.evaluate(() => new Promise((res, rej) => {
    const o = indexedDB.open('lawstudy');
    o.onerror = () => rej(o.error);
    o.onsuccess = () => {
      const db = o.result;
      const t = db.transaction('meta', 'readwrite');
      t.objectStore('meta').put({ key: 'unlockAll', value: true });
      t.oncomplete = () => { db.close(); res(); };
      t.onerror = () => rej(t.error);
    };
  }));

  // --- 1. open a lesson and find a glossary term -------------------------
  await page.goto(`${base}#/lesson/l-sources`, { waitUntil: 'load' });
  await page.waitForTimeout(900);
  // `:visible` matters and is not defensive coding. Focus mode is ON by
  // default (`stepPref` defaults true), so the continuous page's sections stay
  // in the DOM under `display: none` while the reader is shown one section
  // inside `.focusview`. Selecting `.term` without the visibility filter
  // resolves to a hidden node in the collapsed column and the click fails with
  // "Element is not visible" — which reads as a broken glossary rather than as
  // the harness pointing at the copy nobody can see.
  const terms = page.locator('button.term:visible');
  const termCount = await terms.count();
  check(termCount > 0, 'a lesson renders linked glossary terms', `${termCount} visible on l-sources`);
  if (termCount === 0) throw new Error('no visible terms to click — cannot test the loop');
  const term = terms.first();

  const before = await page.evaluate(readStore('termState'));
  await term.click({ force: true });
  await page.waitForTimeout(700);

  // --- 2. the lookup was recorded ---------------------------------------
  const after = await page.evaluate(readStore('termState'));
  check(after !== null, '`termState` store exists', after === null ? 'store missing — db.js migration did not run' : '');
  const enrolled = (after || []).length - (before || []).length;
  check(enrolled >= 1, 'clicking a term enrols it for review',
    enrolled >= 1 ? `${(after || []).length} term(s) in the schedule`
                  : 'no row written — `recordLookup` is not wired into Term.jsx');

  if (enrolled >= 1) {
    const row = after[after.length - 1];
    const dueAfterLookup = row.due;

    // --- 5. a lookup alone must not reschedule --------------------------
    // Clicking the same term again inside the dedupe window, then outside it.
    await page.keyboard.press('Escape').catch(() => {});
    await term.click({ force: true });
    await page.waitForTimeout(500);
    const after2 = await page.evaluate(readStore('termState'));
    const same = after2.find(r => r.id === row.id);
    check(same && same.due === dueAfterLookup,
      'a lookup does NOT move the schedule',
      same ? `due unchanged at ${String(same.due).slice(0, 10)}` : 'row vanished');

    // --- 3. /vocab offers it ---------------------------------------------
    await page.goto(`${base}#/vocab`, { waitUntil: 'load' });
    await page.waitForTimeout(800);
    const body = await page.locator('body').innerText();
    const emptyState = /No words yet|Nothing due/i.test(body);
    check(!emptyState, '/vocab offers a term rather than its empty state',
      emptyState ? 'queue empty although a term was enrolled' : '');

    // --- 4. grading moves the schedule -----------------------------------
    if (!emptyState) {
      const reveal = page.getByRole('button', { name: /reveal/i });
      if (await reveal.count()) { await reveal.first().click(); await page.waitForTimeout(300); }
      const grades = page.locator('.grade');
      const n = await grades.count();
      check(n === 4, 'four grade buttons with intervals', `${n} found`);
      if (n === 4) {
        await grades.nth(2).click();               // "good"
        await page.waitForTimeout(700);
        const after3 = await page.evaluate(readStore('termState'));
        const graded = after3.find(r => r.id === row.id);
        check(graded && graded.due !== dueAfterLookup,
          'grading DOES move the schedule',
          graded ? `due ${String(dueAfterLookup).slice(0, 16)} -> ${String(graded.due).slice(0, 16)}` : 'row missing');
      }
    }
  }

  // --- 6. the backup carries termState ----------------------------------
  // The failure this guards is silent AND destructive: if `exportAll` omits the
  // store while `importAll` iterates, restoring any backup CLEARS vocabulary
  // progress rather than failing to restore it.
  const stores = await page.evaluate(() => new Promise((res, rej) => {
    const o = indexedDB.open('lawstudy');
    o.onerror = () => rej(o.error);
    o.onsuccess = () => { const db = o.result; const names = [...db.objectStoreNames]; db.close(); res(names); };
  }));
  check(stores.includes('termState'), 'termState is a real store in the shipped build', stores.join(', '));

  const src = readFileSync('src/lib/db.js', 'utf8');
  const inBackup = /BACKUP_STORES\s*=\s*\[[^\]]*'termState'/.test(src);
  const exportIterates = /export async function exportAll\(\)[\s\S]{0,400}BACKUP_STORES\.map/.test(src);
  check(inBackup, 'termState is in BACKUP_STORES');
  check(exportIterates, 'exportAll iterates BACKUP_STORES rather than hand-building keys',
    exportIterates ? '' : 'restoring a backup would WIPE termState');

  await browser.close();
} catch (err) {
  console.error('vocab-loop: error —', err.message);
  results.push({ ok: false, what: 'harness completed', detail: err.message });
} finally {
  server.kill();
}

if (statSync(distIndex).mtimeMs !== startedAgainst) {
  console.error('vocab-loop: INCONCLUSIVE — dist was rebuilt during the run.');
  process.exit(1);
}

const failed = results.filter(r => !r.ok);
if (!results.length) { console.error('vocab-loop: FAILED — no checks ran'); process.exit(1); }
if (failed.length) {
  console.error(`\nvocab-loop: FAILED — ${failed.length} of ${results.length}`);
  process.exit(1);
}
console.log(`\nvocab-loop: OK — ${results.length} checks; the loop closes`);
