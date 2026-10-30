/* Служебный файл: хранит копию приложения для работы без интернета и ловит новые версии.
   Версия подставляется автоматически при выпуске. */
const VERSION = "2026-10-30.1";
const CACHE = "savings-" + VERSION;
const SHELL = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png"];

self.addEventListener("install", function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){
    return Promise.all(SHELL.map(function(u){
      return fetch(new Request(u, { cache: "reload" })).then(function(r){ if(r.ok) return c.put(u, r); });
    }));
  }));
});

self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k.indexOf("savings-") === 0 && k !== CACHE; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});

self.addEventListener("message", function(e){
  if(e.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", function(e){
  var r = e.request;
  if(r.method !== "GET") return;
  var u = new URL(r.url);
  if(u.origin !== location.origin) return;
  if(u.pathname.endsWith("/version.json") || u.pathname.endsWith("/sw.js")) return;
  e.respondWith(
    caches.match(r, { ignoreSearch: true }).then(function(hit){
      if(hit) return hit;
      if(r.mode === "navigate") return caches.match("index.html");
      return fetch(r);
    })
  );
});
