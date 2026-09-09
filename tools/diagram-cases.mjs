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
 * It calibrates before it measures. A known `hierarchy` is rendered first and
 * its `.dia-svg` must come out at the same width the real app gives it; a
 * container of the wrong width makes every geometry number wrong in the same
 * direction, and nothing downstream would look wrong. If calibration fails the
 * run stops rather than reporting figures nobody should trust.
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
const CALIBRATION_PX = 608;          // .dia-svg min-width, 38rem — plates.css
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
await new Promise(r => setTimeout(r, 4000));

const browser = await chromium.launch({ executablePath: exe });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const findings = [];
let cases = 0;

for (const width of WIDTHS) {
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
  if (width <= 1024 && Math.abs(calib.rendered - CALIBRATION_PX) > 1) {
    console.error(`diagram-cases: FAILED — calibration figure is ${calib.rendered}px, expected ${CALIBRATION_PX}px.`);
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
  console.log(`  ${String(width).padStart(4)}px — ${out.length - 1} cases, calibration ${calib.rendered}px`);
  await page.close();
}

await browser.close();
stop();

if (SENSITISE) {
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
