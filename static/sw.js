// =============================================================================
// NutriPulse — Service Worker (sw.js)
// =============================================================================
// === AI SYSTEM GUIDE ===
// Caching strategy:
//   Static assets  → Cache-first  (CSS, JS, fonts — versioned by CACHE_NAME)
//   API routes     → Network-first with structured offline JSON fallback
//   Navigation     → Cache-first fallback to "/" app shell
//
// === OFFLINE BEHAVIOUR ===
// API calls while offline → returns {status: "offline", message: "..."} JSON
// Frontend detects status:"offline" and shows a toast rather than a crash.
//
// === CACHE VERSIONING ===
// Bump CACHE_NAME version on every deploy to invalidate stale static assets.
// Old caches are auto-deleted in the activate event below.
// =============================================================================

const CACHE_NAME = "nutripulse-v5";

const STATIC_ASSETS = [
  "/",
  "/static/style.css",
  "/static/script.js",
  "/static/manifest.json",
  "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=JetBrains+Mono:wght@400;600;700&display=swap",
  "https://cdnjs.cloudflare.com/ajax/libs/quagga/0.12.1/quagga.min.js",
];

// === API ROUTES (network-first) ===
// All backend API paths. If offline, a structured JSON error is returned
// so the UI can handle it gracefully instead of throwing a raw network error.
const API_PREFIXES = [
  "/add_food", "/get_totals", "/delete_entry", "/clear_log",
  "/scan_barcode", "/update_profile", "/add_water", "/reset_water",
  "/analyze_photo", "/parse_input", "/search_foods", "/search_usda",
];

// ── INSTALL: pre-cache static assets ─────────────────────────────────────────
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache =>
        Promise.allSettled(
          STATIC_ASSETS.map(url => cache.add(url).catch(() => null))
        )
      )
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: clean up old cache versions ─────────────────────────────────────
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── FETCH: routing logic ──────────────────────────────────────────────────────
self.addEventListener("fetch", event => {
  const { request } = event;
  const url = new URL(request.url);
  const isApiCall = API_PREFIXES.some(p => url.pathname.startsWith(p));

  // STRATEGY A: Network-first for API calls
  // Offline → structured JSON so frontend can show a user-friendly message
  if (isApiCall) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(
          JSON.stringify({
            status: "offline",
            message: "You're offline. Reconnect to sync your log.",
          }),
          {
            status: 503,
            headers: {
              "Content-Type": "application/json",
              "X-Served-By": "ServiceWorker-Offline",
            },
          }
        )
      )
    );
    return;
  }

  // STRATEGY B: Cache-first for static assets
  // Serves from cache instantly. Falls back to network + caches new responses.
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request)
        .then(response => {
          if (response.ok && request.method === "GET") {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // Navigation offline → serve app shell (shows the UI, not a blank screen)
          if (request.mode === "navigate") return caches.match("/");
          return new Response("Offline", { status: 503 });
        });
    })
  );
});
