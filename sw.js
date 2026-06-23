// Mosaic service worker — offline-capable app shell.
// Bump CACHE when you change cached files.
const CACHE = "mosaic-v6"; // v6: network-first for HTML (stale cached page must never blank the app)
const SHELL = [
  "./",
  "./admin",
  "./config.js",
  "./js/db.js",
  "./manifest.webmanifest",
  "./Public/mosaic-logo.png",
  "./Public/mosaic-icon.png",
  "./icons/icon-192.png",
  "./icons/apple-touch-icon.png",
  // Chibi character art (optimized .jpg) — precache for offline.
  "./assets/characters/hero-welcome.jpg",
  "./assets/characters/onboarding-hello.jpg",
  "./assets/characters/q-likes.jpg",
  "./assets/characters/q-strengths.jpg",
  "./assets/characters/q-skills.jpg",
  "./assets/characters/q-wellbeing.jpg",
  "./assets/characters/plan-week.jpg",
  "./assets/characters/week-done.jpg",
  "./assets/characters/help-support.jpg",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()).catch(() => {}));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

// cleanUrls 308-redirects .html → clean paths. A *redirected* response handed to a
// navigation is a browser error (blank screen) and cache.put() throws on it — so
// rebuild redirected responses as plain, non-redirected ones.
async function unredirect(resp) {
  if (!resp.redirected) return resp;
  const body = await resp.blob();
  const headers = new Headers(resp.headers);
  headers.delete("content-encoding");
  headers.delete("content-length");
  return new Response(body, { status: resp.status, statusText: resp.statusText, headers });
}
const putCache = (req, resp) => { if (resp.ok) caches.open(CACHE).then((c) => c.put(req, resp.clone())).catch(() => {}); };

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // Never touch API or cross-origin (Supabase, CDNs) — always go to network.
  if (req.method !== "GET" || url.pathname.startsWith("/api/") || url.origin !== self.location.origin) {
    return;
  }

  const isDoc = req.mode === "navigate" || req.destination === "document";

  if (isDoc) {
    // NETWORK-FIRST for HTML — guarantees the latest page; a stale/broken cached
    // document can never blank the app. Falls back to cache only when offline.
    e.respondWith((async () => {
      try {
        const out = await unredirect(await fetch(req));
        putCache(req, out);
        return out;
      } catch {
        return (await caches.match(req)) || (await caches.match("./")) || Response.error();
      }
    })());
    return;
  }

  // CACHE-FIRST for static assets (art, css, js, icons) — fast + offline.
  e.respondWith((async () => {
    const hit = await caches.match(req);
    if (hit) return hit;
    try {
      const out = await unredirect(await fetch(req));
      putCache(req, out);
      return out;
    } catch {
      return Response.error();
    }
  })());
});
