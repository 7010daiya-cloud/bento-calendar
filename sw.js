/* お弁当注文カレンダー Service Worker */
const CACHE = "bento-v1";
const ASSETS = [
  "./", "./index.html", "./manifest.json",
  "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png", "./favicon-32.png"
];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).catch(() => {}));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  // GET かつ同一オリジンのみ扱う（Firebase等の通信はそのまま素通し）
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;

  const accept = req.headers.get("accept") || "";
  // HTML はネット優先（更新を即反映）→ 失敗時キャッシュ
  if (req.mode === "navigate" || accept.includes("text/html")) {
    e.respondWith(
      fetch(req).then((r) => {
        const cp = r.clone();
        caches.open(CACHE).then((c) => c.put(req, cp));
        return r;
      }).catch(() => caches.match(req).then((m) => m || caches.match("./index.html")))
    );
    return;
  }
  // それ以外（アイコン等）はキャッシュ優先
  e.respondWith(
    caches.match(req).then((m) => m || fetch(req).then((r) => {
      const cp = r.clone();
      caches.open(CACHE).then((c) => c.put(req, cp));
      return r;
    }))
  );
});
