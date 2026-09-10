/* Warta service worker.
 *
 * Written for a reader in Malaysia on a phone, often on prepaid data, sometimes
 * with no signal at all. Two goals, in this order: never make them pay for the
 * same bytes twice, and let them study with the radio off.
 *
 * The precache list is deliberately the shell ONLY — index.html, the stylesheet,
 * the app and vendor chunks, the icons. It does NOT include the lesson content.
 * Content is large (290KB gzipped today) and the whole point of this work is to
 * stop handing all of it to someone who wants one lesson. Content is cached when
 * it is actually opened, by the runtime rule for hashed assets below.
 *
 * When the per-module content split lands, the small eager catalogue chunk joins
 * PRECACHE and the per-module chunks stay on runtime caching. That is a change to
 * the plugin's asset filter in vite.config.js, not a change to this file.
 *
 * Placeholders 94a1d87a44ba and [
  "./",
  "./assets/ibm-plex-sans-var-BD64o3ke.woff2",
  "./assets/index-B16LeiL_.js",
  "./assets/index-Bxoz-cWS.css",
  "./assets/spectral-400-Com8ZUEe.woff2",
  "./assets/vendor-BSOwabzx.js",
  "./favicon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-192.png",
  "./icon-maskable-512.png",
  "./index.html",
  "./manifest.webmanifest"
] are filled at build time.
 */

const VERSION = '94a1d87a44ba';
const PRECACHE = [
  "./",
  "./assets/ibm-plex-sans-var-BD64o3ke.woff2",
  "./assets/index-B16LeiL_.js",
  "./assets/index-Bxoz-cWS.css",
  "./assets/spectral-400-Com8ZUEe.woff2",
  "./assets/vendor-BSOwabzx.js",
  "./favicon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-192.png",
  "./icon-maskable-512.png",
  "./index.html",
  "./manifest.webmanifest"
];

const SHELL_CACHE = `warta-shell-${VERSION}`;
const ASSET_CACHE = `warta-assets-${VERSION}`;
// Fonts are self-hosted under /assets/ and therefore covered by the hashed-asset
// rule below — there is no third-party font origin left to special-case.

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      // A single failed request must not fail the whole install, or one 404
      // leaves the reader with no service worker at all.
      .then((cache) => Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => null))))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL_CACHE, ASSET_CACHE]);
      const names = await caches.keys();
      await Promise.all(names.filter((n) => !keep.has(n)).map((n) => caches.delete(n)));
      await self.clients.claim();
    })()
  );
});

// The page asks for the update rather than being interrupted by one: a reader
// mid-quiz should not have the app swapped under them.
self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response && (response.ok || response.type === 'opaque')) {
    cache.put(request, response.clone());
  }
  return response;
}


// Navigation: try the network so a deploy is picked up, fall back to the cached
// shell so no signal still opens the app. HashRouter means this fires on the
// first load only; route changes never leave the document.
async function navigate(request) {
  try {
    const fresh = await fetch(request);
    const cache = await caches.open(SHELL_CACHE);
    cache.put('index.html', fresh.clone());
    return fresh;
  } catch {
    const cache = await caches.open(SHELL_CACHE);
    return (await cache.match('index.html')) || (await cache.match('./')) || Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(navigate(request));
    return;
  }


  if (url.origin !== self.location.origin) return;

  // Built assets carry a content hash in the filename, so they are immutable and
  // safe to serve from cache without revalidation. This is what makes a lesson
  // free the second time it is opened.
  if (url.pathname.includes('/assets/')) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  if (/\.(png|svg|webmanifest)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
  }
});
