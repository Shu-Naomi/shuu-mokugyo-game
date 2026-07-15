const CACHE_NAME = "nushi-tsuri-v16-riku-real-paw-ground";
const APP_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./assets/riku-walk.png?v=12",
  "./assets/fish-shadows.png",
  "./assets/player-boy.png",
  "./assets/player-girl.png",
  "./assets/player-boy-pet.png?v=16c",
  "./assets/player-girl-pet.png?v=16c",
  "./assets/player-boy-sit.png?v=16",
  "./assets/player-girl-sit.png?v=16",
  "./assets/shuu-walk.png?v=12",
  "./assets/grey-walk.png?v=12",
  "./assets/dog-idles.png?v=12",
  "./assets/fish-moroko.png",
  "./assets/fish-funa.png",
  "./assets/fish-koi.png",
  "./assets/fish-nushi.png",
  "./assets/sam-front.png",
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
  const request = event.request;
  const url = new URL(request.url);
  if (request.mode === "navigate" || url.pathname.endsWith("/index.html")) {
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
          return response;
        })
        .catch(() => caches.match("./index.html")),
    );
    return;
  }
  event.respondWith(
    caches
      .match(request)
      .then(
        (cached) =>
          cached ||
          fetch(request).catch(() => caches.match("./index.html")),
      ),
  );
});
