/**
 * Load every route in a real browser and fail if it does not render.
 *
 * This exists because of a specific afternoon. All six gates were green —
 * content, palette, design-lint, prose, density, icons — while the home page
 * was a blank white screen. A mid-refactor rename had left `cat.quizPool`
 * undefined, React threw during render, and #root had zero children. Every
 * gate we had inspects files. A file can be perfectly well-formed and still
 * throw the moment it runs.
 *
 * It is the same failure class the other gates were written for — the artefact
 * exists, nothing errors where anyone is looking, and the wrong thing (or
 * nothing at all) reaches the reader — one level further out. Static analysis
 * cannot reach it. Only running it can.
 *
 * It checks heading OUTLINE, not just presence: a `querySelector('h1,h2,h3')`
 * check is a low bar, and it was pointed out as one. Skipped levels fail here.
 * It requires exactly one h1 per rendered screen, a <title> that reflects it,
 * and an accessible name on every form control a user can actually reach. A state branch that renders
 * its own view — a loading state, an empty state — needs its own: that is where
 * the review screen lost its heading, and no static check saw it.
 *
 * It refuses to run against a stale dist. If a build lands while preview is
 * serving, index.html points at chunk hashes that no longer exist and every
 * route fails with "Failed to fetch dynamically imported module" — which reads
 * exactly like a genuinely broken code split. A gate whose false failures
 * imitate its true ones teaches people to distrust it, and it fires precisely
 * when someone is iterating fast and least likely to investigate.
 *
 * Skips with a warning, not a failure, when the driver or Chrome is missing:
 * the other gates must stay runnable on a machine without a browser.
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';

const ROUTES = [
  '#/', '#/lessons', '#/lesson/l-courts', '#/review', '#/quiz', '#/problems',
  '#/books', '#/progress', '#/seals', '#/glossary', '#/settings',
  // Parameterised routes matter more than the indexes: the multi-state screens
  // (write / predict / mark / done, loading branches) all live behind an id,
  // and a gate that only walks the top-level routes never reaches them.
  '#/lesson/l-how-to-study', '#/problem/pd-p-guided-arrest', '#/module/m-study-method',
  // The case-reading tier. `#/case/:id` is gated on its lesson being read, so
  // the seed below opens this one — without it the walk only ever sees the
  // locked panel, which is the same blind spot the `unlockAll` seed exists for.
  // The bad id is deliberate: a Not-found fallback is a screen too.
  '#/cases', '#/case/x-tan-ying-hong', '#/case/does-not-exist',
];
const CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
];

let chromium;
try { ({ chromium } = await import('playwright-core')); }
catch { console.log('smoke: SKIPPED — playwright-core not installed (npm i)'); process.exit(0); }

const exe = CHROME_CANDIDATES.find(existsSync);
if (!exe) { console.log('smoke: SKIPPED — no Chrome found'); process.exit(0); }

// Every asset index.html names must exist before we serve it.
const distIndex = 'dist/index.html';
if (!existsSync(distIndex)) {
  console.error('smoke: FAILED — no dist/index.html. Run `npm run build` first.');
  process.exit(1);
}
const html = readFileSync(distIndex, 'utf8');
const refs = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map(m => m[1]);
// Lazily-imported chunks are never named in index.html — the entry code asks
// for them at runtime — so a stale dist can pass an index.html-only check and
// still fail in the browser. That is exactly the failure that produced the two
// false alarms this check was written for, so look for them too.
// Vite emits these as sibling-relative — "./module-m06-contract-D0ZZi4wN.js" —
// not with an assets/ prefix, so match on the hashed filename itself. The
// 8-character hash is what makes this precise: it will not match a stray ".js"
// mentioned in prose.
const lazyRefs = [...readdirSync(join('dist', 'assets'))]
  .filter(f => f.endsWith('.js'))
  .flatMap(f => [...readFileSync(join('dist', 'assets', f), 'utf8')
    .matchAll(/["'`](?:\.\/|assets\/)?([A-Za-z0-9._-]+-[A-Za-z0-9_-]{8}\.js)["'`]/g)]
    .map(m => m[1]))
  .filter(f => !existsSync(join('dist', 'assets', f)));
const missing = refs.filter(r => !existsSync(join('dist', r.replace(/^\.?\//, ''))))
  .concat([...new Set(lazyRefs)].map(f => `assets/${f} (lazily imported)`));
if (missing.length) {
  console.error('smoke: FAILED — dist is stale: it references files that are not there.');
  missing.forEach(m => console.error(`  - ${m}`));
  console.error('  A build probably landed while preview was serving. Rebuild and retry.');
  process.exit(1);
}

// Serve the built site, so this tests what actually ships.
const port = 4178;
const server = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'],
  { stdio: 'ignore', detached: false });
const base = `http://localhost:${port}/`;
const wait = ms => new Promise(r => setTimeout(r, ms));

const startedAgainst = statSync(distIndex).mtimeMs;
let failures = [];
try {
  for (let i = 0; i < 40 && !(await fetch(base).then(r => r.ok).catch(() => false)); i++) await wait(250);
  const browser = await chromium.launch({ executablePath: exe });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  // Open every lesson before walking anything.
  //
  // Lessons are progression-gated, so on a fresh browser profile
  // `#/lesson/l-courts` and `#/lesson/l-how-to-study` both render a short
  // "finish X to open this" panel instead of a lesson. That panel mounts, has a
  // heading, names its controls and leaks no NaN — so every check below passed
  // on it, and the two lesson routes in the list above had never once been
  // walked against a lesson body. The comment on ROUTES argues that
  // parameterised routes matter more than the indexes because the multi-state
  // screens live behind an id; the gate then stopped at the one state the
  // progression system hands a new reader.
  //
  // `unlockAll` is a real Settings option, not a test hook, so this walks a
  // configuration the app actually ships.
  await page.goto(base, { waitUntil: 'load' });
  await page.evaluate(() => new Promise((res, rej) => {
    const o = indexedDB.open('lawstudy', 1);
    o.onerror = () => rej(o.error);
    o.onsuccess = () => { const db = o.result;
      const t = db.transaction('meta', 'readwrite');
      const store = t.objectStore('meta');
      store.put({ key: 'unlockAll', value: true });
      // Opens the case tier. `unlockAll` governs lessons only — the extracts
      // gate reads the lessonsRead map (lib/lessons.js), a different key — so
      // seeding one without the other walks the locked branch and reports it as
      // the page. Measured: the geometry gate called that screen "no prose
      // column to measure", which is what a locked panel looks like.
      store.put({ key: 'lessonsRead', value: { 'l-torrens': new Date().toISOString() } });
      t.oncomplete = () => { db.close(); res(); }; t.onerror = () => rej(t.error); };
  }));
  await page.reload({ waitUntil: 'load' });

  for (const route of ROUTES) {
    const errors = [];
    page.removeAllListeners('pageerror');
    page.removeAllListeners('console');
    page.on('pageerror', e => errors.push(e.message.split('\n')[0].slice(0, 120)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 120)); });

    await page.goto(base + route, { waitUntil: 'load' });
    await wait(1200);

    const state = await page.evaluate(() => {
      const root = document.getElementById('root');
      return {
        mounted: !!root && root.children.length > 0,
        text: (document.querySelector('.main')?.innerText || '').trim().length,
        heading: !!document.querySelector('h1,h2,h3'),
        title: document.title,
        // Form controls with no accessible name. The visibility filter is not
        // optional: a file input hidden behind a styled button is the standard
        // way to make a file picker look like the rest of an app, and a scan
        // without the filter reports it as an unnamed control on every codebase
        // that does it. A display:none element is out of the accessibility tree
        // and cannot be tabbed to — it is not exposed to anyone, so it cannot
        // be missing a name. Checking a11y by enumerating the DOM instead of
        // asking what a user can actually reach produces exactly this false
        // positive, and I filed one before writing this.
        unnamed: [...document.querySelectorAll('input,select,textarea')]
          .filter(el => {
            const cs = getComputedStyle(el);
            if (cs.display === 'none' || cs.visibility === 'hidden') return false;
            if (el.offsetParent === null && cs.position !== 'fixed') return false;
            if (el.type === 'hidden') return false;
            const id = el.id;
            const forLabel = id && document.querySelector(`label[for="${CSS.escape(id)}"]`);
            return !forLabel && !el.closest('label') &&
                   !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby') &&
                   !el.getAttribute('title');
          })
          .map(el => `${el.tagName.toLowerCase()}[type=${el.type}]${el.id ? '#' + el.id : ''}`),
        // A `role="group"` with no accessible name is worse than an unlabelled
        // div: it announces as a named thing that has no name. These are the
        // scroll boxes around wide figures and tables — four of them, in
        // Diagram, Blocks, Chart and Insight — and they became keyboard stops
        // deliberately, so a reader now lands on each one and is told what it
        // is. The rule above covers form controls only, so nothing here would
        // have caught an empty label on any of them.
        unnamedGroups: [...document.querySelectorAll('[role="group"]')]
          .filter(el => {
            const cs = getComputedStyle(el);
            if (cs.display === 'none' || cs.visibility === 'hidden') return false;
            if ((el.getAttribute('aria-label') || '').trim()) return false;
            const by = el.getAttribute('aria-labelledby');
            if (by && by.split(/\s+/)
              .map(id => document.getElementById(id)?.textContent || '')
              .join(' ').trim()) return false;
            return true;
          })
          .map(el => {
            const cls = (el.className || '').toString().trim().split(/\s+/)[0];
            return el.tagName.toLowerCase() + (cls ? `.${cls}` : '');
          }),
        h1: (document.querySelector('main h1')?.textContent || '').trim(),
        // A page of computed statistics, rendered against an empty database,
        // is where a missing denominator reaches the reader as "NaN%" or
        // "undefined marks". Every gate before this one inspects files; only
        // running it with no data in it can catch this.
        leaks: ((document.querySelector('.main')?.innerText || '')
          .match(/\b(?:NaN|undefined|Infinity)\b|\[object Object\]/g) || []).slice(0, 3),
        // A heading EXISTING is a low bar. What matters for a screen reader is
        // the outline: no level may be skipped, because a jump from h2 to h4
        // tells the reader a level of structure exists that they never heard.
        levels: [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(h => +h.tagName[1]),
      };
    });

    if (!state.mounted) failures.push(`${route}  #root is empty — the app did not mount`);
    else if (state.text < 40) failures.push(`${route}  rendered ${state.text} chars of content`);
    else if (!state.heading) failures.push(`${route}  no heading rendered`);
    if (state.leaks?.length) {
      failures.push(`${route}  rendered ${state.leaks.join(', ')} — a figure with no denominator`);
    }
    // WCAG 2.4.2. A single-page app keeps one <title> from index.html unless
    // something changes it, so every route announces itself identically to a
    // screen reader and is indistinguishable in history and tab strips.
    if (!state.title || !state.h1 || !state.title.includes(state.h1)) {
      failures.push(`${route}  <title> "${state.title}" does not reflect the page h1 "${state.h1}"`);
    }

    for (const c of state.unnamed || []) {
      failures.push(`${route}  form control with no accessible name: ${c}`);
    }
    for (const g of state.unnamedGroups || []) {
      failures.push(`${route}  role="group" with no accessible name: ${g}`);
    }

    const L = state.levels || [];
    const h1s = L.filter(l => l === 1).length;
    if (h1s !== 1) failures.push(`${route}  ${h1s} h1 elements (want exactly 1)`);
    else if (L[0] !== 1) failures.push(`${route}  outline starts at h${L[0]}, not h1`);
    for (let i = 1; i < L.length; i++) {
      if (L[i] > L[i - 1] + 1) {
        failures.push(`${route}  heading level skips h${L[i - 1]} -> h${L[i]}`);
        break;
      }
    }
    for (const e of errors) failures.push(`${route}  ${e}`);
  }
  await browser.close();
} finally {
  server.kill('SIGTERM');
}

// A build landing DURING the walk is not a route failure.
//
// The stale-dist guard above runs before the browser starts, and it is right
// about the moment it runs: dist was consistent then. The race is a build
// landing while the walk is in flight, which replaces the hashed chunk
// filenames the pages are still fetching, and surfaces as `ERR_FAILED` against
// a route name — indistinguishable from a genuinely broken route, and it sends
// the next person hunting a defect that was never there.
//
// Seeding `unlockAll` widened this considerably: a locked lesson renders a
// panel that needs no module chunk, while a real lesson body pulls its
// code-split chunk on demand. Every lesson route is now lazy where two of them
// used to be inert. With several sessions building through an afternoon, this
// will fire.
const movedDuringRun = statSync(distIndex).mtimeMs !== startedAgainst;
if (movedDuringRun) {
  const n = failures.length;
  if (n) {
    console.error(`smoke: INCONCLUSIVE — dist was rebuilt during the run, so these ${n} findings are probably artefacts of it.`);
    console.error('  Nothing here is evidence of a broken route. Rebuild and re-run.');
    process.exit(1);
  }
  console.log('smoke: note — dist was rebuilt during the run; it passed anyway.');
}

if (failures.length) {
  console.error('smoke: FAILED');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`smoke: OK — ${ROUTES.length} routes mount, render and log no errors`);
