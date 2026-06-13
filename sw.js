// Easy Quotation — RICOH Belgium - Service Worker
// Versie: 2.0

var CACHE = "easy-quotation-v2";
var ASSETS = [
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

// Installatie: cache alle assets
self.addEventListener("install", function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activatie: verwijder ALLE oude caches (ook ricoh-offerte-v1)
self.addEventListener("activate", function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) {
              console.log("Oude cache verwijderd:", k);
              return caches.delete(k);
            })
      );
    }).then(function(){ return self.clients.claim(); })
  );
});

// Fetch: network-first voor manifest (zodat naam altijd up-to-date is),
// cache-first voor de rest van de app
self.addEventListener("fetch", function(e) {
  var url = e.request.url;

  // API-calls nooit cachen
  if(url.includes("generativelanguage.googleapis.com") ||
     url.includes("api.anthropic.com") ||
     url.includes("supabase.co")) {
    e.respondWith(fetch(e.request));
    return;
  }

  // manifest.json altijd vers ophalen zodat naam/icoon altijd klopt
  if(url.includes("manifest.json")) {
    e.respondWith(
      fetch(e.request).then(function(response) {
        var clone = response.clone();
        caches.open(CACHE).then(function(cache){ cache.put(e.request, clone); });
        return response;
      }).catch(function(){ return caches.match(e.request); })
    );
    return;
  }

  // App-bestanden: cache-first met netwerk-fallback
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if(cached) return cached;
      return fetch(e.request).then(function(response) {
        if(response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE).then(function(cache){ cache.put(e.request, clone); });
        }
        return response;
      }).catch(function() {
        return caches.match("./index.html");
      });
    })
  );
});
