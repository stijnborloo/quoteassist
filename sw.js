// Ricoh Offerte Studio Pro - Service Worker v7
// Timestamp: 2026-06-22T00:00:00Z
var CACHE = "ricoh-offerte-v7";
var INDEX = "index.html";

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

self.addEventListener("activate", function(e) {
  e.waitUntil(
    // Verwijder ALLE oude caches, niet alleen de vorige versie
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) {
              console.log("SW: verwijder oude cache:", k);
              return caches.delete(k);
            })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function(e) {
  var req = e.request;
  var url = req.url;

  // Externe diensten: nooit via SW
  if(url.includes("supabase.co") ||
     url.includes("api.anthropic.com") ||
     url.includes("workers.dev") ||
     url.includes("googleapis.com")) {
    return;
  }

  // Navigatie (app-launch, refresh): altijd verse index.html van netwerk
  if(req.mode === "navigate") {
    e.respondWith(
      fetch(INDEX, {cache: "no-cache"}).then(function(r) {
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

  // Overige assets: network-first
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
