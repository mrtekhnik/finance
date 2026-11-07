/* Служебный файл: хранит копию приложения для работы без интернета и ловит новые версии.
   Версия подставляется автоматически при выпуске. */
const VERSION = "2026-11-07.1";
const CACHE = "savings-" + VERSION;
const SHELL = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png"];

self.addEventListener("install", function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      return Promise.all(SHELL.map(function(u){
        return fetch(new Request(u, { cache: "reload" })).then(function(r){
          if(!r.ok) throw new Error("bad " + u);
          return c.put(u, r);
        });
      }));
    }).then(function(){
      /* если у предыдущей версии копии приложения нет (кэш пуст) — сразу заменяем её, иначе страница не откроется */
      return caches.keys().then(function(keys){
        return Promise.all(keys.filter(function(k){ return k.indexOf("savings-") === 0 && k !== CACHE; }).map(function(k){
          return caches.open(k).then(function(c){ return c.match("index.html"); });
        })).then(function(res){
          if(!res.length || res.some(function(x){ return !x; })) return self.skipWaiting();
        });
      });
    })
  );
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
  var nav = r.mode === "navigate";
  e.respondWith(
    caches.match(r, { ignoreSearch: true })
      .then(function(hit){ return hit || (nav ? caches.match("index.html") : null); })
      .then(function(hit){
        if(hit) return hit;
        /* в кэше пусто — берём из сети и заодно восстанавливаем кэш */
        return fetch(r).then(function(resp){
          if(nav && resp && resp.ok){ var copy = resp.clone(); caches.open(CACHE).then(function(c){ c.put("index.html", copy); }); }
          return resp;
        });
      })
      .catch(function(){
        return nav ? new Response("<meta charset=utf-8><meta name=viewport content='width=device-width'><body style='font-family:sans-serif;padding:24px'><h3>Нет связи</h3><p>Не удалось загрузить приложение. Проверьте интернет и обновите страницу.</p>", { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }) : Response.error();
      })
  );
});
