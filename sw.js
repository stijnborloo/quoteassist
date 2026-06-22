// Ricoh Offerte Studio Pro - Service Worker v6
var CACHE = "ricoh-offerte-v6";
var INDEX = "index.html";

// Install: cache core assets met relatieve paden (werkt voor elke base URL)
self.addEventListener("install", function(e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return Promise.all([
        "index.html",
        "manifest.json",
        "icon-192.png",
        "icon-512.png",
        "apple-touch-icon.png"
      ].map(function(url) {
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

// Fetch handler
self.addEventListener("fetch", function(e) {
  var req = e.request;
  var url = req.url;

  // Externe API's: laat browser zelf afhandelen
  if(url.includes("supabase.co") ||
     url.includes("api.anthropic.com") ||
     url.includes("workers.dev") ||
     url.includes("googleapis.com")) {
    return;
  }

  // Navigatie-requests (app-launch, refresh) -> altijd index.html ophalen
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
