// Mosaic service worker — offline-capable app shell.
// Bump CACHE when you change cached files.
const CACHE = "mosaic-v1";
const SHELL = [
  "./",
  "./index.html",
  "./admin.html",
  "./config.js",
  "./js/db.js",
  "./manifest.webmanifest",
  "./Public/mosaic-logo.png",
  "./Public/mosaic-icon.png",
  "./icons/icon-192.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()).catch(() => {}));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // Never cache API or cross-origin (Supabase, CDNs) — always go to network.
  if (req.method !== "GET" || url.pathname.startsWith("/api/") || url.origin !== self.location.origin) {
    return;
  }

  // Same-origin GET: cache-first, fall back to network, then to cached shell.
  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req)
        .then((resp) => {
          if (resp && resp.ok) {
            const copy = resp.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return resp;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
