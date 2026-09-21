/* ============================================================
   LSR AI STUDIO — sw.js
   Service worker: cache-first app shell with a versioned cache.
   Only registered on http(s) — never on file:// (see app.js).
   Same-origin requests only; your AI provider traffic is
   never intercepted.
   ============================================================ */
var CACHE = "lsr-ai-studio-v2";

var SHELL = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./manifest.webmanifest",
  "./js/state.js",
  "./js/markdown.js",
  "./js/demo.js",
  "./js/api.js",
  "./js/chat.js",
  "./js/codelab.js",
  "./js/automations.js",
  "./js/sites.js",
  "./js/app.js",
  "./icons/icon-192.svg",
  "./icons/icon-512.svg",
  "./icons/icon-maskable.svg"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE)
      .then(function (cache) { return cache.addAll(SHELL); })
      .then(function () { return self.skipWaiting(); })
      .catch(function () { /* best effort — app still works online */ })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys
          .filter(function (k) { return k !== CACHE; })
          .map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  var url = new URL(event.request.url);
  // Only the same-origin app shell. Provider APIs, Pollinations
  // images and everything else go straight to the network.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(function (hit) {
      if (hit) return hit;
      return fetch(event.request).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (cache) { cache.put(event.request, copy); });
        return res;
      }).catch(function () {
        return caches.match("./index.html");
      });
    })
  );
});
