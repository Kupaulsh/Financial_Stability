/* FinSta service worker: precaches the whole app so it works fully offline. */
const CACHE = "finsta-bb85353f";
const ASSETS = [
 "./",
 ".nojekyll",
 "app.bundle.js",
 "config.local.js",
 "extra.css",
 "fonts.css",
 "fonts/anta-latin-400-normal.woff2",
 "fonts/coming-soon-latin-400-normal.woff2",
 "fonts/delius-latin-400-normal.woff2",
 "fonts/inter-latin-400-normal.woff2",
 "fonts/inter-latin-500-normal.woff2",
 "fonts/inter-latin-600-normal.woff2",
 "fonts/inter-latin-700-normal.woff2",
 "fonts/material-icons-outlined.woff2",
 "icons/icon-192.png",
 "icons/icon-512.png",
 "icons/icon.svg",
 "index.html",
 "manifest.webmanifest",
 "style.css",
 "vendor/591.supabase.js",
 "vendor/supabase.js"
];

self.addEventListener("install", (e) => {
  // cache:"reload" bypasses the HTTP cache so we never precache stale copies
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(ASSETS.map((u) => c.add(new Request(u, { cache: "reload" }))))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Network first: you always get the newest files when they can be reached, and the cache keeps the app working offline.
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if(req.method !== "GET") return;
  const url = new URL(req.url);
  if(url.origin !== location.origin) return;            // Supabase / Google etc. always go to the network
  e.respondWith(
    fetch(req).then((res) => {
      if(res && res.ok){ const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || (req.mode === "navigate" ? caches.match("index.html") : Response.error())))
  );
});
