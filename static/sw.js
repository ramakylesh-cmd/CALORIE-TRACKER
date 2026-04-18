/* ── NutriPulse Service Worker ──────────────────────────────────────────── */
const CACHE_NAME = "nutripulse-v2";
const STATIC_ASSETS = [
  "/",
  "/static/style.css",
  "/static/script.js",
  "/static/manifest.json",
  "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=JetBrains+Mono:wght@400;600;700&display=swap",
  "https://cdnjs.cloudflare.com/ajax/libs/quagga/0.12.1/quagga.min.js",
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(STATIC_ASSETS.map(url => cache.add(url).catch(() => null)));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const { request } = event;
  const url = new URL(request.url);

  // Network-first for API calls
  if (url.pathname.startsWith("/add_food") || url.pathname.startsWith("/get_totals") ||
      url.pathname.startsWith("/delete_entry") || url.pathname.startsWith("/clear_log") ||
      url.pathname.startsWith("/scan_barcode") || url.pathname.startsWith("/update_profile") ||
      url.pathname.startsWith("/add_water") || url.pathname.startsWith("/analyze_photo") ||
      url.pathname.startsWith("/parse_input") || url.pathname.startsWith("/search_foods")) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ status: "error", message: "Offline — no internet connection." }), {
          headers: { "Content-Type": "application/json" }
        })
      )
    );
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response.ok && request.method === "GET") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(() => {
        if (request.mode === "navigate") {
          return caches.match("/");
        }
      });
    })
  );
});