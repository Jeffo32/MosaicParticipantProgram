// Mosaic service worker — offline-capable app shell.
// Bump CACHE when you change cached files.
const CACHE = "mosaic-v4"; // v4: unwrap redirected responses (PWA start_url /index.html → blank screen)
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

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // Never cache API or cross-origin (Supabase, CDNs) — always go to network.
  if (req.method !== "GET" || url.pathname.startsWith("/api/") || url.origin !== self.location.origin) {
    return;
  }

  // Same-origin GET: cache-first, fall back to network, then to cached shell.
  e.respondWith(
    caches.match(req).then(async (hit) => {
      if (hit) return hit;
      try {
        const resp = await fetch(req);
        // cleanUrls 308-redirects .html → clean paths. Handing a *redirected* response
        // to a navigation is a browser error (blank screen), and cache.put() throws on
        // it — so rebuild redirected responses as plain, non-redirected ones.
        let out = resp;
        if (resp.redirected) {
          const body = await resp.blob();
          const headers = new Headers(resp.headers);
          headers.delete("content-encoding");
          headers.delete("content-length");
          out = new Response(body, { status: resp.status, statusText: resp.statusText, headers });
        }
        if (out.ok) {
          const copy = out.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return out;
      } catch {
        return (await caches.match("./")) || Response.error();
      }
    })
  );
});
