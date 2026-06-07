// Ricoh Offerte Studio Pro - Service Worker
// Versie: 2.0  (network-first zodat updates altijd doorkomen)

var CACHE = "ricoh-offerte-v2";
// Relatieve paden t.o.v. de SW-locatie (app draait onder /quoteassist/)
var ASSETS = ["./", "./index.html", "./manifest.json"];

// Externe diensten die NOOIT gecachet mogen worden
function isExternalApi(url){
  return url.indexOf("supabase.co") > -1 ||
         url.indexOf("supabase.in") > -1 ||
         url.indexOf("generativelanguage.googleapis.com") > -1 ||
         url.indexOf("api.anthropic.com") > -1 ||
         url.indexOf("workers.dev") > -1 ||
         url.indexOf("openrouter.ai") > -1 ||
         url.indexOf("api.groq.com") > -1;
}

// Installatie: cache assets individueel (faalt niet als er één ontbreekt)
self.addEventListener("install", function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return Promise.all(ASSETS.map(function(a){
        return cache.add(a).catch(function(){ /* negeer ontbrekend asset */ });
      }));
    })
  );
  self.skipWaiting();
});

// Activatie: verwijder ALLE oude caches
self.addEventListener("activate", function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e) {
  var req = e.request;
  if (req.method !== "GET") return;          // alleen GET
  if (isExternalApi(req.url)) return;        // API's normaal laten verlopen

  var isDoc = req.mode === "navigate" || req.destination === "document";

  if (isDoc) {
    // HTML/navigatie: NETWORK-FIRST -> altijd verse code, val terug op cache offline
    e.respondWith(
      fetch(req).then(function(resp){
        var clone = resp.clone();
        caches.open(CACHE).then(function(c){ c.put(req, clone); });
        return resp;
      }).catch(function(){
        return caches.match(req).then(function(c){ return c || caches.match("./index.html"); });
      })
    );
    return;
  }

  // Overige bestanden: stale-while-revalidate
  e.respondWith(
    caches.match(req).then(function(cached){
      var network = fetch(req).then(function(resp){
        if (resp && resp.status === 200) {
          var clone = resp.clone();
          caches.open(CACHE).then(function(c){ c.put(req, clone); });
        }
        return resp;
      }).catch(function(){ return cached; });
      return cached || network;
    })
  );
});
