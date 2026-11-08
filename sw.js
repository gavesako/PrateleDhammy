/* Přátelé Dhammy – service worker
 *
 * - The app shell (page, styles, scripts, fonts, icons) is cached on install.
 * - On every launch the page sends the full list of texts (from js/data.js);
 *   the worker downloads the ones not stored yet, plus the images they use,
 *   so the whole library is readable offline. New texts added later are
 *   picked up on the next launch, and stored texts are re-checked once a
 *   day so edits reach the phone without reinstalling.
 * - Everything is served from the cache first and refreshed in the background
 *   when online ("stale-while-revalidate"), so edits pushed to GitHub reach
 *   phones on the next launch.
 *
 * Bump VERSION when you change the SHELL list below or this file's logic.
 * Changes to texts, CSS or JS alone do not need a bump.
 */
const VERSION = "v2";
const SHELL_CACHE = "pd-shell-" + VERSION;
const CONTENT_CACHE = "pd-content"; // texts + images, kept across versions

const SHELL = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/style.css",
  "js/data.js",
  "js/app.js",
  "fonts/fonts.css",
  "fonts/PublicSans-400-latin.woff2",
  "fonts/PublicSans-400-latin-ext.woff2",
  "fonts/Spectral-400-latin.woff2",
  "fonts/Spectral-400-latin-ext.woff2",
  "fonts/Spectral-400i-latin.woff2",
  "fonts/Spectral-400i-latin-ext.woff2",
  "fonts/Spectral-600-latin.woff2",
  "fonts/Spectral-600-latin-ext.woff2",
  "img/home-banner.jpg",
  "img/home-figure.jpg",
  "img/texts-banner.jpg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png",
  "icons/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith("pd-shell-") && k !== SHELL_CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

function isContent(url) {
  return /\/(texts|img)\//.test(url.pathname);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // external links: browser default

  // Page navigations: network first, fall back to the cached page offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(SHELL_CACHE).then((c) => c.put("index.html", copy));
          }
          return res;
        })
        .catch(() => caches.match("index.html", { ignoreSearch: true }))
    );
    return;
  }

  // Everything else: cache first, refresh in the background.
  const cacheName = isContent(url) ? CONTENT_CACHE : SHELL_CACHE;
  event.respondWith(
    caches.open(cacheName).then((cache) =>
      cache.match(req, { ignoreSearch: true }).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached || Response.error());
        if (cached) {
          event.waitUntil(network);
          return cached;
        }
        return network;
      })
    )
  );
});

/* ---- Full offline library ------------------------------------------------
 * The page posts {type: "precache", urls: [...]} with every text file.
 * Missing ones are downloaded (6 at a time) together with their images, and
 * progress is reported back as {type: "precache-progress", done, total}.
 */
let precaching = null;

async function storeIfMissing(cache, url) {
  const hit = await cache.match(url);
  if (hit) return hit;
  const res = await fetch(url);
  if (!res.ok) throw new Error(url + " " + res.status);
  await cache.put(url, res.clone());
  return res;
}

function imagesIn(html) {
  const out = new Set();
  const re = /src="(img\/[^"]+)"/g;
  let m;
  while ((m = re.exec(html))) out.add(m[1]);
  return [...out];
}

const REFRESH_KEY = "__last-refresh";
const REFRESH_EVERY = 24 * 60 * 60 * 1000; // re-check stored texts once a day

async function precacheAll(urls, client) {
  const cache = await caches.open(CONTENT_CACHE);
  // Once a day also re-check texts already stored, so edits pushed to
  // GitHub reach the phone. "no-cache" asks the server whether the file
  // changed; unchanged files cost only a tiny "304 Not Modified" reply.
  const last = await cache.match(REFRESH_KEY);
  const lastTime = last ? Number(await last.text()) : 0;
  const refresh = Date.now() - lastTime > REFRESH_EVERY;
  const total = urls.length;
  let done = 0, failed = 0;
  const report = () => client && client.postMessage({ type: "precache-progress", done, failed, total });
  const queue = urls.slice();
  async function worker() {
    while (queue.length) {
      const url = queue.shift();
      try {
        let res = await storeIfMissing(cache, url);
        if (refresh && lastTime) {
          const fresh = await fetch(url, { cache: "no-cache" }).catch(() => null);
          if (fresh && fresh.ok) { await cache.put(url, fresh.clone()); res = fresh; }
        }
        if (url.endsWith(".html")) {
          const html = await res.clone().text();
          await Promise.all(imagesIn(html).map((img) => storeIfMissing(cache, img).catch(() => {})));
        }
      } catch (e) {
        failed++;
      }
      done++;
      if (done % 5 === 0 || done === total) report();
    }
  }
  await Promise.all([1, 2, 3, 4, 5, 6].map(worker));
  if (refresh && !failed) await cache.put(REFRESH_KEY, new Response(String(Date.now())));
  report();
}

self.addEventListener("message", (event) => {
  const msg = event.data || {};
  if (msg.type !== "precache" || !Array.isArray(msg.urls)) return;
  if (!precaching) {
    precaching = precacheAll(msg.urls, event.source).finally(() => { precaching = null; });
  }
  event.waitUntil(precaching);
});
