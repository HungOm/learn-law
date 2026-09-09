import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const swTemplate = fileURLToPath(new URL('./sw/service-worker.js', import.meta.url));

// Files copied verbatim from public/. They are part of the shell a reader needs
// before anything renders, so they are precached by name rather than discovered.
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png',
];

// Fonts are self-hosted and same-origin, so the hashed-asset rule caches them on
// first use. Two are precached anyway: Spectral 400 sets every line of prose and
// the IBM Plex variable face carries all four sans weights in one file, so both
// render on any page a reader can reach. Guaranteeing those two offline protects
// the serif/sans split DESIGN.md calls load-bearing. The remaining Spectral
// weights and the italic are left to runtime caching rather than charging a
// prepaid reader for faces this visit may never render.
const SHELL_FONT = /\/(spectral-400-(?!italic)|ibm-plex-sans-var-)[^/]*\.woff2$/;

// What belongs in the shell, stated as an ALLOWLIST rather than a list of things
// to exclude. This matters: a denylist fails open, so a lesson chunk that Rollup
// happens to name differently tomorrow would be silently precached and every
// reader would pay for all sixteen modules on their first visit — the exact cost
// this work exists to remove. An allowlist fails closed. An unrecognised chunk
// is merely runtime-cached when it is opened, which is never worse than correct.
//
// `catalogue` is in the shell deliberately: it is small, every index page needs
// it before first paint, and a reader offline must still see what exists.
function isShellChunk(file, chunk) {
  if (file.endsWith('.css')) return true;
  if (SHELL_FONT.test(`/${file}`)) return true;
  if (!chunk || chunk.type !== 'chunk') return false;
  return Boolean(chunk.isEntry) || chunk.name === 'vendor' || /catalogue/.test(chunk.name ?? '');
}

function serviceWorker() {
  return {
    name: 'warta-service-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      const built = Object.keys(bundle).filter((f) => /\.(js|css|woff2)$/.test(f));
      const shell = built.filter((f) => isShellChunk(f, bundle[f]));
      const precache = [...SHELL_FILES, ...shell.map((f) => `./${f}`)].sort();

      // Version over EVERY built file, not just the precached ones, so a
      // content-only deploy still retires the previous asset cache instead of
      // leaving dead lesson chunks on the reader's phone for ever.
      const version = createHash('sha256').update(built.sort().join('\n')).digest('hex').slice(0, 12);

      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: readFileSync(swTemplate, 'utf8')
          .replaceAll('__VERSION__', version)
          .replaceAll('__PRECACHE__', JSON.stringify(precache, null, 2)),
      });
    },
  };
}

// With the entry at app/index.html, Rollup emits dist/app/index.html and, under
// `base: './'`, points it at ../assets/. Both are wrong for what gets published:
// the file has to sit at the root of the output, next to assets/. So the emitted
// HTML is moved up and its relative links are corrected in the same step —
// before it is written, rather than shuffled on disk afterwards where a partial
// run would leave a half-published site.
function entryAtOutputRoot() {
  return {
    name: 'warta-entry-at-output-root',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const nested = bundle['app/index.html'];
      if (!nested) return;
      nested.fileName = 'index.html';
      // Every relative link in it was computed for a file one level down, so
      // each leading ../ becomes ./ when the file moves to the output root.
      // This is deliberately the general rule rather than a list of the paths
      // that happen to appear today: the first cut handled ../assets/ only, and
      // the icon and manifest links silently kept pointing one level above the
      // site — a 404 for the favicon and, worse, for the manifest the installed
      // app is defined by.
      nested.source = String(nested.source).replaceAll('"../', '"./');
      bundle['index.html'] = nested;
      delete bundle['app/index.html'];
    },
  };
}

// `base: './'` so the built site works from a repository sub-path on GitHub
// Pages without knowing the repository name at build time.
// The Pages site is served straight from this branch's root, so the root has to
// hold the BUILT site. That leaves nowhere at the root for Vite's own entry — a
// source index.html pointing at /src/main.jsx is exactly what was being
// published, and no browser can execute JSX. So the entry moved to app/.
//
// Vite's ROOT deliberately stays at the repository root. Moving it there too was
// the obvious first cut and it broke tools/diagram-cases.mjs, which serves the
// repo with `vite` and fetches /tools/fixtures/diagram-cases.html — a path that
// stops existing the moment the document root becomes app/. Only the entry
// moves; every tool that talks to the dev server keeps working.
export default defineConfig({
  base: './',
  plugins: [react(), serviceWorker(), entryAtOutputRoot()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      // The entry lives in app/, not at the repository root, because the root
      // is what GitHub Pages publishes.
      input: 'app/index.html',
      // The content JSON is imported, not fetched, so a hand-edited rule change
      // is a rebuild rather than a silent 404. Keep it in its own chunk so a
      // content edit does not invalidate the application bundle.
      output: {
        manualChunks(id) {
          if (id.includes('/content/')) return 'content';
          if (id.includes('node_modules')) return 'vendor';
        },
      },
    },
  },
});
