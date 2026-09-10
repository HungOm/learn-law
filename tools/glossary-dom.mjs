/**
 * Check the glossary-density model against the renderer it claims to model.
 *
 * `tools/glossary-density.py` reimplements `src/lib/glossary.js` in Python so
 * that content can be measured without a browser. That is a model, and a model
 * drifts. This counts the `.term` buttons the real app puts on a real lesson
 * page and diffs them against the model's per-lesson totals; a divergence means
 * the cheap instrument has stopped describing the page and its numbers are
 * confident fiction.
 *
 * Focus mode is on by default at every width, so exactly one section is in the
 * DOM at a time and each section starts its own `seen` map. This walks the
 * sections with the stepper and compares the count per section, which is both
 * what the model reports and what a reader actually meets. Counting the whole
 * page in one go would need the continuous mode, which is not the mode anyone
 * is in unless they ask for it.
 *
 * **Deliberately not in `npm run check` at the moment.** It is a named script —
 * `npm run check:glossary-dom` — and it should go back in the chain once the
 * reading surface stops moving. As of this writing two other sessions are
 * rewriting it, and the same lesson measured three times in twenty minutes gave
 * 45 marks (whole lesson in the sheet), 69, and 17 (a `.focusview` overlay
 * holding one section, with a nearly empty sheet behind it). Every one of those
 * was the correct count for the page as it stood. A gate that fails because
 * somebody else is mid-refactor teaches the team to skip the chain, which costs
 * more than this gate is worth until the surface settles.
 *
 * Where it stood when it was last conclusive: 10 lessons compared against
 * dist built 23:23:58, 8 matching the DOM exactly and 2 differing by 1 and 24,
 * the second being a rebuild landing mid-walk. It began at 0 of 10.
 *
 *     node tools/glossary-dom.mjs            # sample of lessons
 *     node tools/glossary-dom.mjs --all      # every lesson (slow)
 */
import { createServer } from 'node:http';
import { cpSync, existsSync, readFileSync, rmSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { extname, join, normalize } from 'node:path';
import { tmpdir } from 'node:os';

const CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
];
let chromium;
try { ({ chromium } = await import('playwright-core')); }
catch { console.log('glossary-dom: SKIPPED — playwright-core not installed'); process.exit(0); }
const exe = CHROME_CANDIDATES.find(existsSync);
if (!exe) { console.log('glossary-dom: SKIPPED — no Chrome found'); process.exit(0); }
if (!existsSync('dist/index.html')) {
  console.error('glossary-dom: FAILED — no dist. Run `npm run build`.');
  process.exit(1);
}

// The model's answer, straight from the tool under test.
const expected = new Map(
  execFileSync('python3', ['tools/glossary-density.py', '--verify'], { encoding: 'utf8' })
    .split('\n').filter(Boolean)
    .map(l => l.trim().split(' '))
    .map(([id, sheet, steps]) => [id, {
      sheet: Number(sheet.replace('sheet=', '')),
      steps: steps.replace('steps=', '').split(',').map(Number),
    }]));

const all = [...expected.keys()];
const sample = process.argv.includes('--all') ? all
  : all.filter((_, i) => i % 7 === 0);   // a spread, not the first N

// Serve a PRIVATE COPY of dist, not dist itself.
//
// Guarding on dist and reporting INCONCLUSIVE when it moves was the wrong
// answer to the right problem. On a working copy several sessions share, dist
// is rebuilt every couple of minutes; three runs in a row died on it, and the
// guard got better each time without ever letting a run finish. A guard that is
// correct and always fires still yields no measurement.
//
// Copying dist and serving the copy removes the race instead of detecting it.
// The walk then reads exactly the build it started with, whatever anybody else
// does, and the result is conclusive rather than hedged.
//
// A plain static server is enough because the app is hash-routed: every route
// is `#/...`, so the only paths ever requested are `/` and the hashed assets.
// There is no history fallback to reproduce — which is also why this cannot
// accidentally serve index.html in place of a missing asset and call it a pass.
// The copy is itself racy, and the first version of it crashed on that. `vite
// build` empties dist and writes index.html LAST, so a copy taken during
// someone else's build gets the assets and no entry point — which is what
// happened: `ENOENT ... /glossary-dom-81790/index.html` on a run where
// `existsSync('dist/index.html')` had passed moments earlier. So take the copy,
// then check it is a whole build: an index.html that names assets, and every
// asset it names actually present. Retry rather than fail, because the window
// is about a second wide and the next attempt almost always lands clear.
const snapshot = join(tmpdir(), `glossary-dom-${process.pid}`);
let ok = false;
for (let attempt = 0; attempt < 6 && !ok; attempt++) {
  if (attempt) await new Promise(r => setTimeout(r, 1500));
  rmSync(snapshot, { recursive: true, force: true });
  try {
    cpSync('dist', snapshot, { recursive: true });
    const html = readFileSync(join(snapshot, 'index.html'), 'utf8');
    const refs = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map(m => m[1]);
    ok = refs.length > 0 && refs.every(r => existsSync(join(snapshot, r.replace(/^\.?\//, ''))));
  } catch { ok = false; }
}
if (!ok) {
  console.error('glossary-dom: FAILED — could not copy a complete dist in six attempts. '
    + 'Something is rebuilding continuously; stop it and re-run.');
  process.exit(1);
}
const builtAt = statSync(join(snapshot, 'index.html')).mtime;

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.webmanifest': 'application/manifest+json' };

const port = 4380 + (process.pid % 40);
const server = createServer((req, res) => {
  const rel = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
  const file = join(snapshot, rel === '/' ? 'index.html' : rel);
  if (!file.startsWith(snapshot) || !existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(404); res.end('not found'); return;
  }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise(r => server.listen(port, r));
const base = `http://localhost:${port}/`;

const wait = ms => new Promise(r => setTimeout(r, ms));

/** The mark count once it has stopped moving — framer-motion mounts in stages. */
async function settle(page) {
  // Two consecutive equal readings, not one. framer-motion mounts a section in
  // stages, so a single stable poll can land in a pause partway through and
  // report a number that is about to grow.
  let last = -1, stable = 0;
  for (let i = 0; i < 40; i++) {
    await wait(100);
    const n = await page.evaluate(() => document.querySelectorAll('.term').length);
    stable = n === last ? stable + 1 : 0;
    if (stable >= 2 && n > 0) return n;
    last = n;
  }
  return last;
}

let diffs = [], checked = 0;
const modes = new Set();
try {
  for (let i = 0; i < 40 && !(await fetch(base).then(r => r.ok).catch(() => false)); i++) await wait(250);
  const browser = await chromium.launch({ executablePath: exe });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(base, { waitUntil: 'load' });
  await page.evaluate(() => new Promise((res, rej) => {
    const o = indexedDB.open('lawstudy', 1);
    o.onerror = () => rej(o.error);
    o.onsuccess = () => {
      const t = o.result.transaction('meta', 'readwrite');
      t.objectStore('meta').put({ key: 'unlockAll', value: true });
      t.oncomplete = () => res(); t.onerror = () => rej(t.error);
    };
  }));
  await page.reload({ waitUntil: 'load' });

  for (const id of sample) {
    await page.goto(`${base}#/lesson/${id}`, { waitUntil: 'load' });
    // The content chunk is lazily imported, so the first paint is a loading
    // branch with a heading and no lesson in it. Counting there reported a
    // handful of marks and then broke out of the walk because the stepper did
    // not exist yet — five of ten lessons "diverged" for that reason alone.
    // Which surface is on screen decides which model to compare against. The
    // page steps only when the stepper is mounted; otherwise every section is
    // rendered at once and a term is marked once per LESSON rather than once
    // per section. Detecting it beats assuming it: the default has changed
    // twice under this tool already, and an assumption produces a confident
    // diff against a page that was never going to match.
    await page.waitForSelector('.lsec-h', { timeout: 15000 }).catch(() => {});
    const model = expected.get(id);
    if (!model) continue;
    const stepped = await page.locator('.stepper-btn--next').count() > 0;
    const want = stepped ? model.steps : [model.sheet];
    const got = [];
    for (let i = 0; i < want.length; i++) {
      got.push(await settle(page));
      if (!stepped) break;
      const next = page.locator('.stepper-btn--next');
      if (!(await next.count()) || await next.isDisabled()) break;
      await next.click();
    }
    checked++;
    modes.add(stepped ? 'stepped' : 'sheet');
    if (got.length !== want.length || got.some((n, i) => n !== want[i])) {
      diffs.push({ id, want, got, mode: stepped ? 'stepped' : 'sheet' });
    }
  }
  await browser.close();
} finally {
  server.close();
  rmSync(snapshot, { recursive: true, force: true });
}

console.log(`glossary-dom: ${checked} lessons compared against the model, `
  + `against dist/ built ${builtAt.toTimeString().slice(0, 8)} `
  + `(private copy, ${[...modes].join(' + ')} rendering)`);
if (!diffs.length) { console.log('glossary-dom: OK — the model matches the DOM'); process.exit(0); }
for (const d of diffs) console.log(`  ${d.id} (${d.mode})\n      model [${d.want}]\n      DOM   [${d.got}]`);
console.log(`glossary-dom: FAILED — the model diverges from the renderer on ${diffs.length} of ${checked}`);
process.exit(1);
