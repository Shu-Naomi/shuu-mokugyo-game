const CACHE_NAME = "nushi-tsuri-v9-canvas-dogs-haptics-2";
const APP_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./assets/riku-walk.png",
  "./assets/fish-shadows.png",
  "./assets/player-boy.png",
  "./assets/player-girl.png",
  "./assets/shuu-walk.png",
  "./assets/grey-walk.png",
  "./assets/dog-idles.png",
  "./assets/fish-moroko.png",
  "./assets/fish-funa.png",
  "./assets/fish-koi.png",
  "./assets/fish-nushi.png",
];
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_ASSETS))
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches
      .match(event.request)
      .then(
        (cached) =>
          cached ||
          fetch(event.request).catch(() => caches.match("./index.html")),
      ),
  );
});
