// Ricoh Easy Quotation - Service Worker
// Versie: 2.0 — network-first zodat updates altijd direct doorkomen

var CACHE = "ricoh-offerte-v2";
var ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon192.png",
  "./icon512.png"
];

self.addEventListener("install", function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(ASSETS).catch(function(){});
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function(e) {
  if (e.request.method !== "GET") return;
  var url = e.request.url;

  // API-calls nooit cachen
  if (url.includes("api.anthropic.com") ||
      url.includes("supabase.co") ||
      url.includes("workers.dev")) {
    return; // gewoon netwerk, geen SW-tussenkomst
  }

  // App-bestanden: NETWORK-FIRST — altijd de nieuwste versie,
  // cache enkel als offline-fallback
  e.respondWith(
    fetch(e.request).then(function(response) {
      if (response && response.status === 200 && response.type === "basic") {
        var clone = response.clone();
        caches.open(CACHE).then(function(cache) {
          cache.put(e.request, clone);
        });
      }
      return response;
    }).catch(function() {
      return caches.match(e.request);
    })
  );
});
