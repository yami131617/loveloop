// LoveLoop service worker — cache shell + network-first for API, offline fallback
const CACHE_NAME = "loveloop-v1";
const SHELL = [
  "/",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // API + uploaded media: network-first (stale data is bad for chat/feed)
  if (
    url.pathname.startsWith("/auth") ||
    url.pathname.startsWith("/posts") ||
    url.pathname.startsWith("/rooms") ||
    url.pathname.startsWith("/chat") ||
    url.pathname.startsWith("/swipe") ||
    url.pathname.startsWith("/preferences") ||
    url.pathname.startsWith("/profile") ||
    url.pathname.startsWith("/uploads") ||
    url.pathname.startsWith("/games") ||
    url.pathname.startsWith("/leaderboard") ||
    url.pathname.startsWith("/socket.io")
  ) {
    event.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  // Static assets + routes: cache-first, fallback to network
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, clone)).catch(() => {});
          }
          return res;
        })
        .catch(() => {
          // Offline fallback: landing page shell
          if (req.mode === "navigate") return caches.match("/");
        });
    })
  );
});

// Push notifications (wired when backend sends)
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); } catch { payload = { title: "LoveLoop", body: event.data.text() }; }
  const { title = "LoveLoop", body = "", url = "/" } = payload;
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-96.png",
      data: { url },
      vibrate: [100, 50, 100],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((list) => {
      const existing = list.find((c) => c.url.endsWith(url));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});
