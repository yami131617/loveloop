// LoveLoop service worker — bumped cache key on every deploy so F5 gets fresh HTML.
// Strategy:
//   - Navigation requests (HTML pages)  → network-first (F5 always fresh, cache is offline fallback)
//   - Hashed JS/CSS bundles              → cache-first (URLs change per build, safe to cache forever)
//   - API + uploaded media              → network-first (realtime data)
//   - Manifest + static icons            → cache-first
const CACHE_NAME = "loveloop-v3";
const SHELL = [
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

// Accept SKIP_WAITING message from the page so new SW takes over without a kill/reopen.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
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

  // 1. API / realtime / uploaded media → network-first
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
    url.pathname.startsWith("/music") ||
    url.pathname.startsWith("/groups") ||
    url.pathname.startsWith("/socket.io")
  ) {
    event.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  // 2. Page navigations (HTML) → network-first so F5 always gets latest markup.
  if (req.mode === "navigate" || req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, clone)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match("/")))
    );
    return;
  }

  // 3. Static assets (hashed JS/CSS/images) → cache-first
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
        .catch(() => undefined);
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
