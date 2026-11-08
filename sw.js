/* Přátelé Dhammy – service worker
 *
 * - The app shell (page, styles, scripts, fonts, icons) is cached on install.
 * - Texts and images are cached the first time they are opened, so every
 *   text a reader has opened stays available offline.
 * - Everything is served from the cache first and refreshed in the background
 *   when online ("stale-while-revalidate"), so edits pushed to GitHub reach
 *   phones on the next launch.
 *
 * Bump VERSION when you change the SHELL list below or this file's logic.
 * Changes to texts, CSS or JS alone do not need a bump.
 */
const VERSION = "v1";
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
