/**
 * Copy the built site to the repository root, because that is what GitHub Pages
 * publishes for this repo.
 *
 * Pages here is set to "deploy from a branch" at the root. In that mode GitHub
 * serves the branch verbatim — so the branch itself has to contain a servable
 * site. It did not: `dist/` is gitignored, the root held Vite's SOURCE
 * index.html, and what got published was a page pointing at /src/main.jsx,
 * which no browser can execute. Every route was blank while the URL answered
 * 200, which is the worst shape a deploy failure can take.
 *
 * The alternative is switching Pages to the GitHub Actions source, which is
 * cleaner — no build output in version control — but needs repo-admin rights a
 * workflow token does not have. This is the route that works without it.
 *
 * So: the entry is app/index.html, the build goes to dist/ (where smoke.mjs and
 * responsive.mjs still find it), and this copies dist/ over the root. It only
 * ever writes the files the build produced; nothing is deleted, and no source
 * directory shares a name with one of them.
 *
 *     npm run pages     # build, then copy
 */

import { cpSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, 'dist');

if (!existsSync(dist)) {
  console.error('publish-pages: no dist/ — run `npm run build` first');
  process.exit(1);
}

const entries = readdirSync(dist);
if (!entries.includes('index.html')) {
  console.error('publish-pages: dist/ has no index.html — refusing to publish a partial build');
  process.exit(1);
}

for (const name of entries) {
  cpSync(join(dist, name), join(root, name), { recursive: true, force: true });
}

console.log(`publish-pages: copied ${entries.length} entries to the repository root — ${entries.join(', ')}`);
