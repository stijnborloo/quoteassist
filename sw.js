// Ricoh Offerte Studio Pro - Service Worker
// Network-first: GitHub Pages deploys propageren automatisch

var CACHE = "ricoh-offerte-v4";
var BASE = "/quoteassist";

// Installatie: cache core assets
self.addEventListener("install", function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll([
        BASE + "/",
        BASE + "/index.html",
        BASE + "/manifest.json",
        BASE + "/icon-192.png",
        BASE + "/icon-512.png"
      ]).catch(function(){});
    })
  );
  self.skipWaiting();
});

// Activatie: verwijder oude caches
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

// Fetch: network-first voor navigatie en app, cache als fallback
self.addEventListener("fetch", function(e) {
  var url = e.request.url;

  // Externe API-calls nooit cachen
  if(url.includes("supabase.co") ||
     url.includes("api.anthropic.com") ||
     url.includes("workers.dev") ||
     url.includes("generativelanguage.googleapis.com")) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Network-first: probeer netwerk, val terug op cache
  e.respondWith(
    fetch(e.request).then(function(response) {
      if(response && response.status === 200) {
        var clone = response.clone();
        caches.open(CACHE).then(function(cache) {
          cache.put(e.request, clone);
        });
      }
      return response;
    }).catch(function() {
      return caches.match(e.request).then(function(cached) {
        return cached || caches.match(BASE + "/index.html");
      });
    })
  );
});
