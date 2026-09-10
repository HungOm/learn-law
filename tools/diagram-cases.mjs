/**
 * Render every diagram kind against inputs no lesson contains, and assert the
 * geometry.
 *
 * `responsive.mjs` derives its route list from content, which is the right
 * default and leaves a structural hole: a kind nothing uses gets no route, and
 * a SHAPE nothing uses gets no case. `matrix` has zero uses, so nothing in the
 * chain has ever rendered one. The corpus also happens to contain no timeline
 * label long enough to overflow, no stack apex label long enough to overflow,
 * and no spectrum mark at either extreme of its scale — all three of which were
 * broken when this fixture first ran, and none of which any gate could see.
 *
 * So the cases here are adversarial rather than representative. They are the
 * shapes an author will eventually write, checked before someone writes one.
 *
 * NOT in `npm run check`. Run it directly:
 *
 *     node tools/diagram-cases.mjs              # assert
 *     node tools/diagram-cases.mjs --sensitise  # prove it can still fail
 *
 * The second is not optional ceremony. A check reporting zero and a check that
 * has quietly stopped looking are indistinguishable, and this file has already
 * produced one of each. `--sensitise` inverts the collision threshold so every
 * pair of labels counts as touching: it must report a large number. If it
 * reports zero, the walk is broken, not the renderers.
 *
 * It calibrates before it measures, by ASKING THE APP rather than by trusting
 * a number written here. At each width it opens a real lesson, measures the
 * `.dia-svg` the app actually renders, and requires the fixture's calibration
 * figure to match it. A container of the wrong width makes every geometry
 * number wrong in the same direction and nothing downstream would look wrong,
 * so if calibration fails the run stops rather than reporting figures nobody
 * should trust.
 *
 * Calibration goes through `/app/`, not `/`. The repo's root `index.html` is a
 * committed BUILD ARTIFACT — it loads `./assets/index-*.js`, because the site
 * deploys from the root — and the dev server serves it at `/` like any other
 * file. `vite.config.js` moves only the build ENTRY to `app/index.html` and
 * deliberately leaves Vite's root at the repository root, so this tool can
 * still fetch `/tools/fixtures/...`. The consequence is that `/` on the dev
 * server runs the last committed bundle. Calibrating source-rendered figures
 * against it compares live code with a stale build and reports the difference
 * as a defect in whichever one moved last, which is exactly what it did: a
 * 17px body from the bundle against a 19px body from source, chased as a
 * layout race and a font race before anyone asked which code each page ran.
 *
 * The first version of this pinned the expected width to 608 — `.dia-svg`'s
 * `min-width: 38rem` — which was not the container's width but a floor under
 * it. `.dia-svg` is `width: 100%; min-width: 38rem`, so it renders at
 * max(608, the container's inner width), and the constant held only while the
 * column stayed narrower than 608. It does not: `--measure` is `68ch`, and
 * `ch` scales with font-size, so raising body text widens the column. The
 * constant would have failed a legitimate improvement — a wider column at
 * 780px removes the figure's sideways scroll — and reported it as a defect in
 * someone else's change. Measuring the app cannot go stale that way.
 *
 * It deliberately makes no page-level assertion. The fixture mounts the lesson
 * container chain but not the whole app shell, so its body-scroll number is an
 * artefact — `responsive.mjs` owns that question against real routes.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SENSITISE = process.argv.includes('--sensitise');
const WIDTHS = [360, 780, 1600];
const CALIBRATION_ENTRY = '/app/';   // the app's dev entry — loads /src/main.jsx
// Candidates, not one route. At <=780px the lesson paginates and only the first
// step is in the DOM, and just 2 of 10 lessons sampled carry a figure there — so
// a single hard-coded route is one content reorder away from breaking, and the
// failure would read as "the renderers are broken" rather than "the figure moved".
const CALIBRATION_ROUTES = ['#/lesson/l-courts', '#/lesson/pe-l-civil-start'];
const FLOOR_PX = 12;                 // DESIGN.md §3

const CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
];
let chromium;
try { ({ chromium } = await import('playwright-core')); }
catch { console.log('diagram-cases: SKIPPED — playwright-core not installed (npm i)'); process.exit(0); }
const exe = CHROME_CANDIDATES.find(existsSync);
if (!exe) { console.log('diagram-cases: SKIPPED — no Chrome found'); process.exit(0); }
if (!existsSync(join(ROOT, 'tools/fixtures/diagram-cases.html'))) {
  console.error('diagram-cases: FAILED — fixture missing'); process.exit(1);
}

const port = 4380 + (process.pid % 40);
const server = spawn('npx', ['vite', '--port', String(port), '--strictPort'],
  { cwd: ROOT, stdio: 'ignore' });
const stop = () => { try { server.kill(); } catch {} };
process.on('exit', stop); process.on('SIGINT', () => { stop(); process.exit(130); });

// A sensitised run that exits early prints no finding count, and a MISSING
// count reads exactly like a zero — which by this file's own rule means "the
// walk never reached the figures", i.e. the opposite of the truth. site-17 hit
// this shape on its own gate: an unrelated early exit truncated the output its
// control was counting, and the control reported failure of a fix that had
// worked. So every exit path says so, including ones added later.
let sensitisedReported = false;
process.on('exit', () => {
  if (SENSITISE && !sensitisedReported) {
    console.error('diagram-cases: SENSITISED — CONTROL DID NOT RUN. The run exited early (above),');
    console.error('  so there is no finding count. A missing count is NOT a zero — it means the');
    console.error('  control was never exercised. Fix the early exit, then re-run the control.');
  }
});
await new Promise(r => setTimeout(r, 4000));

const browser = await chromium.launch({ executablePath: exe });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const findings = [];
let cases = 0;

// Lessons are progression-gated; a fresh profile renders a locked panel and no
// figure at all, which would calibrate against nothing. Use the real Settings
// control rather than a test hook.
const unlock = await ctx.newPage();
await unlock.goto(`http://localhost:${port}${CALIBRATION_ENTRY}`, { waitUntil: 'load' });
await unlock.waitForTimeout(1500);
await unlock.goto(`http://localhost:${port}${CALIBRATION_ENTRY}#/settings`, { waitUntil: 'load' });
await unlock.waitForTimeout(1200);
try { await unlock.getByRole('button', { name: /unlock everything/i }).click(); }
catch { console.error('diagram-cases: FAILED — could not unlock lessons to calibrate'); stop(); process.exit(1); }
await unlock.waitForTimeout(800);
await unlock.close();

/** What the real app renders a figure at, at this viewport. */
async function appFigureWidth(width) {
  for (const route of CALIBRATION_ROUTES) {
    const w = await tryRoute(width, route);
    if (w != null) return { width: w, route };
  }
  return null;
}

async function tryRoute(width, CALIBRATION_ROUTE) {
  const page = await ctx.newPage();
  await page.setViewportSize({ width, height: 1000 });
  await page.goto(`http://localhost:${port}${CALIBRATION_ENTRY}${CALIBRATION_ROUTE}`, { waitUntil: 'load' });
  // Distinguish "the entry did not boot" from "the lesson had no figure". The
  // dev entry has moved once already (a `root: 'app'` restructure landed and
  // was reverted inside five minutes), and a tool that blames the figures for
  // a moved entry sends the next person to the wrong file.
  const fromSource = await page.evaluate(() =>
    [...document.scripts].some(s => new URL(s.src, location.href).pathname === '/src/main.jsx'));
  if (!fromSource) {
    await page.close();
    console.error(`diagram-cases: FAILED — ${CALIBRATION_ENTRY} is not serving the app from source.`);
    console.error('  It must load /src/main.jsx. Vite\'s history fallback answers any unmatched path');
    console.error('  with the ROOT index.html, which on this repo is a committed build artifact — so a');
    console.error('  moved or mistyped entry does not 404, it silently serves a stale bundle and every');
    console.error('  number below becomes a comparison against last week\'s code.');
    console.error('  Check rollupOptions.input in vite.config.js.');
    stop(); process.exit(1);
  }
  try { await page.waitForSelector('.dia-svg', { timeout: 15000 }); }
  catch { await page.close(); return null; }
  await page.waitForTimeout(600);
  const w = await page.evaluate(() => +document.querySelector('.dia-svg').getBoundingClientRect().width.toFixed(1));
  await page.close();
  return w;
}

for (const width of WIDTHS) {
  const app = await appFigureWidth(width);
  if (app == null) {
    console.error(`diagram-cases: FAILED — no calibration route rendered a figure at ${width}px.`);
    console.error(`  Tried: ${CALIBRATION_ROUTES.join(', ')}`);
    console.error('  At <=780px the lesson paginates and only the first step is in the DOM, so a');
    console.error('  calibration route must carry a figure on its FIRST step. If the content moved,');
    console.error('  add a lesson that does to CALIBRATION_ROUTES.');
    stop(); process.exit(1);
  }
  const page = await ctx.newPage();
  await page.setViewportSize({ width, height: 1000 });
  await page.goto(`http://localhost:${port}/tools/fixtures/diagram-cases.html`, { waitUntil: 'load' });
  try { await page.waitForSelector('.dia-svg', { timeout: 15000 }); }
  catch { console.error(`diagram-cases: FAILED — nothing rendered at ${width}px`); stop(); process.exit(1); }
  await page.waitForTimeout(900);

  const out = await page.evaluate(({ floorPx, sensitise }) => {
    const figs = [];
    for (const fig of document.querySelectorAll('.dia')) {
      const svg = fig.querySelector('.dia-svg');
      if (!svg) continue;
      const name = fig.querySelector('.dia-title')?.textContent || '(untitled)';
      const vb = svg.viewBox.baseVal;
      const rendered = svg.getBoundingClientRect().width;
      const ratio = rendered / vb.width;
      const items = [];
      for (const t of svg.querySelectorAll('text')) {
        let bb = null; try { bb = t.getBBox(); } catch {}
        if (!bb) continue;
        items.push({ txt: (t.textContent || '').slice(0, 24), bb,
          px: +(parseFloat(getComputedStyle(t).fontSize) * ratio).toFixed(2) });
      }
      // Sensitised: -40 makes every pair "touch", so the count must explode.
      const threshold = sensitise ? -40 : 0.5;
      const collide = [], spill = [], under = [];
      for (let i = 0; i < items.length; i++) {
        const a = items[i].bb;
        if (items[i].px < floorPx) under.push(`${items[i].txt} at ${items[i].px}px`);
        if (a.x < -0.5 || a.y < -0.5 || a.x + a.width > vb.width + 0.5 || a.y + a.height > vb.height + 0.5)
          spill.push(`${items[i].txt} [${a.x.toFixed(0)},${a.y.toFixed(0)} ${a.width.toFixed(0)}x${a.height.toFixed(0)}] vs ${vb.width}x${vb.height.toFixed(0)}`);
        for (let j = i + 1; j < items.length; j++) {
          const c = items[j].bb;
          const ox = Math.min(a.x + a.width, c.x + c.width) - Math.max(a.x, c.x);
          const oy = Math.min(a.y + a.height, c.y + c.height) - Math.max(a.y, c.y);
          if (ox > threshold && oy > threshold)
            collide.push(`${items[i].txt} x ${items[j].txt} (${ox.toFixed(0)}x${oy.toFixed(0)})`);
        }
      }
      figs.push({ name, rendered: +rendered.toFixed(1), collide, spill, under });
    }
    return figs;
  }, { floorPx: FLOOR_PX, sensitise: SENSITISE });

  const calib = out.find(f => f.name.startsWith('CALIBRATION'));
  if (!calib) { console.error('diagram-cases: FAILED — no calibration figure'); stop(); process.exit(1); }
  if (Math.abs(calib.rendered - app.width) > 1) {
    console.error(`diagram-cases: FAILED — at ${width}px the fixture renders a figure at ${calib.rendered}px`);
    console.error(`  but the app renders one at ${app.width}px (${app.route}).`);
    console.error('  The fixture container is not the width the real app gives a figure, so every');
    console.error('  geometry number below it would be wrong in the same direction. Not reporting them.');
    stop(); process.exit(1);
  }

  for (const f of out) {
    if (f.name.startsWith('CALIBRATION')) continue;
    cases++;
    for (const c of f.collide) findings.push(`${width}px ${f.name}: COLLIDE ${c}`);
    for (const s of f.spill) findings.push(`${width}px ${f.name}: SPILL ${s}`);
    for (const u of f.under) findings.push(`${width}px ${f.name}: FLOOR ${u}`);
  }
  console.log(`  ${String(width).padStart(4)}px — ${out.length - 1} cases, figure ${calib.rendered}px (app: ${app.width}px via ${app.route.split('/').pop()})`);
  await page.close();
}

await browser.close();
stop();

if (SENSITISE) {
  sensitisedReported = true;
  console.log(`\ndiagram-cases: SENSITISED — ${findings.length} findings across ${cases} case-renders.`);
  if (findings.length < cases) {
    console.error('  Too few. Every case should report touching labels at this threshold;');
    console.error('  a small number means the walk is not reaching the figures.');
    process.exit(1);
  }
  console.log('  The walk reaches the figures and the assertions can fire.');
  process.exit(0);
}
if (findings.length) {
  console.error(`\ndiagram-cases: FAILED — ${findings.length} findings across ${cases} case-renders`);
  findings.forEach(f => console.error('  - ' + f));
  process.exit(1);
}
console.log(`\ndiagram-cases: OK — ${cases} case-renders, no collisions, spills or labels under ${FLOOR_PX}px`);
