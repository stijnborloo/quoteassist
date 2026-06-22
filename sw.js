// Ricoh Offerte Studio Pro - Service Worker v5
var CACHE = "ricoh-offerte-v5";
var BASE = "/quoteassist";
var INDEX = BASE + "/index.html";

var CORE = [
  INDEX,
  BASE + "/manifest.json",
  BASE + "/icon-192.png",
  BASE + "/icon-512.png",
  BASE + "/apple-touch-icon.png"
];

// Install: cache core assets
self.addEventListener("install", function(e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      // addAll faalt als 1 bestand 404 geeft — gebruik individuele adds
      return Promise.all(CORE.map(function(url) {
        return cache.add(url).catch(function(err) {
          console.log("SW cache skip:", url, err);
        });
      }));
    })
  );
});

// Activate: verwijder oude caches
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

// Fetch: navigatie altijd -> index.html; rest network-first
self.addEventListener("fetch", function(e) {
  var req = e.request;
  var url = req.url;

  // Externe API's nooit via SW
  if(url.includes("supabase.co") ||
     url.includes("api.anthropic.com") ||
     url.includes("workers.dev") ||
     url.includes("googleapis.com")) {
    return; // laat browser zelf afhandelen
  }

  // Navigatie-requests (app-launch, refresh) -> altijd index.html
  if(req.mode === "navigate") {
    e.respondWith(
      fetch(INDEX).then(function(r) {
        if(r && r.status === 200) {
          var clone = r.clone();
          caches.open(CACHE).then(function(c) { c.put(INDEX, clone); });
        }
        return r;
      }).catch(function() {
        return caches.match(INDEX);
      })
    );
    return;
  }

  // Overige assets: network-first, cache als fallback
  e.respondWith(
    fetch(req).then(function(r) {
      if(r && r.status === 200) {
        var clone = r.clone();
        caches.open(CACHE).then(function(c) { c.put(req, clone); });
      }
      return r;
    }).catch(function() {
      return caches.match(req);
    })
  );
});
