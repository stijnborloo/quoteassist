// Easy Quotation — RICOH Belgium - Service Worker v2

var CACHE = "easy-quotation-v2";
var ASSETS = [
  "/quoteassist/index.html",
  "/quoteassist/manifest.json",
  "/quoteassist/icon-192.png",
  "/quoteassist/icon-512.png"
];

self.addEventListener("install", function(e) {
  e.waitUntil(caches.open(CACHE).then(function(cache){ return cache.addAll(ASSETS); }));
  self.skipWaiting();
});

self.addEventListener("activate", function(e) {
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k!==CACHE; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e) {
  var url = e.request.url;
  if(url.includes("generativelanguage.googleapis.com")||url.includes("api.anthropic.com")||url.includes("supabase.co")){
    e.respondWith(fetch(e.request)); return;
  }
  // manifest altijd vers (naam/icoon altijd up-to-date)
  if(url.includes("manifest.json")){
    e.respondWith(fetch(e.request).then(function(r){
      var c=r.clone(); caches.open(CACHE).then(function(cache){cache.put(e.request,c);});
      return r;
    }).catch(function(){ return caches.match(e.request); }));
    return;
  }
  e.respondWith(caches.match(e.request).then(function(cached){
    if(cached) return cached;
    return fetch(e.request).then(function(r){
      if(r&&r.status===200){var c=r.clone();caches.open(CACHE).then(function(cache){cache.put(e.request,c);});}
      return r;
    }).catch(function(){ return caches.match("/quoteassist/index.html"); });
  }));
});
