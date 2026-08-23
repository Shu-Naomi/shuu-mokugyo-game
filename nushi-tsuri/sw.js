const CACHE_NAME = "nushi-tsuri-v89-3-water-audio-87";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./assets/player-boy-cast-v73.png",
  "./assets/player-girl-cast-v73.png",
  "./assets/player-boy-cast-motion-v82-3.png",
  "./assets/player-girl-cast-motion-v82-3.png",
  "./assets/rod-display-atlas-v82-10.png",
  "./assets/rod-held-boy-atlas-v82-12.png",
  "./assets/rod-held-girl-atlas-v82-12.png",
  "./assets/cast-lake-morning-v77.jpg",
  "./assets/cast-lake-day-soft-v77.jpg",
  "./assets/cast-lake-day-bright-v77.jpg",
  "./assets/cast-lake-evening-v77.jpg",
  "./assets/cast-lake-night-v77.jpg",
  "./assets/cast-river-morning-v77.jpg",
  "./assets/cast-river-day-soft-v77.jpg",
  "./assets/cast-river-day-bright-v77.jpg",
  "./assets/cast-river-evening-v77.jpg",
  "./assets/cast-river-night-v77.jpg",
  "./assets/cast-sam-pond-morning-v78.jpg",
  "./assets/cast-sam-pond-day-soft-v78.jpg",
  "./assets/cast-sam-pond-day-bright-v78.jpg",
  "./assets/cast-sam-pond-evening-v78.jpg",
  "./assets/cast-sam-pond-night-v78.jpg",
  "./assets/cast-sea-beach-morning-v76.jpg",
  "./assets/cast-sea-beach-day-soft-v76.jpg",
  "./assets/cast-sea-beach-day-bright-v76.jpg",
  "./assets/cast-sea-beach-evening-v76.jpg",
  "./assets/cast-sea-beach-night-v76.jpg",
  "./assets/cast-sea-harbor-morning-v76.jpg",
  "./assets/cast-sea-harbor-day-soft-v76.jpg",
  "./assets/cast-sea-harbor-day-bright-v76.jpg",
  "./assets/cast-sea-harbor-evening-v76.jpg",
  "./assets/cast-sea-harbor-night-v76.jpg",
  "./assets/terrain-world-v54.png",
  "./assets/fishing-biomes-v49.png",
  "./assets/underwater-lake-shallow-v64.jpg",
  "./assets/underwater-lake-mid-v64.jpg",
  "./assets/underwater-lake-deep-v64.jpg",
  "./assets/underwater-river-shallow-v64.jpg",
  "./assets/underwater-river-mid-v64.jpg",
  "./assets/underwater-river-deep-v64.jpg",
  "./assets/underwater-sea-shallow-v65.jpg",
  "./assets/underwater-sea-mid-v65.jpg",
  "./assets/underwater-sea-deep-v65.jpg",
  "./assets/sam-shop-exterior-v53.png",
  "./assets/interior-sam-shop-v55.png",
  "./assets/interior-yaoya-v55.png",
  "./assets/interior-fishing-inn-v55.png",
  "./assets/interior-star-shrine-v55.png",
  "./assets/interior-minato-diner-v55.png",
  "./assets/interior-fish-market-v55.png",
  "./assets/sam-practice-pond-v53.png",
  "./assets/sam-front.png",
  "./assets/fish-moroko-v31.png",
  "./assets/fish-funa-v31.png",
  "./assets/fish-koi-v31.png",
  "./assets/fish-nushi-v31.png",
  "./assets/fish-aji-v68.png",
  "./assets/fish-kasago-v57.png",
  "./assets/fish-kasago-catch-v58.png",
  "./assets/fish-moroko-mouth-v68.png",
  "./assets/fish-moroko-turn-v70.png",
  "./assets/fish-aji-mouth-v68.png",
  "./assets/fish-aji-turn-v70.png",
  "./assets/fish-funa-mouth-v68.png",
  "./assets/fish-funa-turn-v70.png",
  "./assets/fish-koi-mouth-v68.png",
  "./assets/fish-koi-turn-v70.png",
  "./assets/fish-kasago-mouth-v68.png",
  "./assets/fish-kasago-turn-v70.png",
  "./assets/fish-nushi-mouth-v68.png",
  "./assets/fish-nushi-turn-v70.png",
  "./assets/terrain-water-v45.svg",
  "./assets/terrain-grass-v45.svg",
  "./assets/terrain-sand-v45.svg",
  "./assets/terrain-dirt-v45.svg",
  "./assets/terrain-stone-v45.svg",
  "./assets/terrain-field-v45.svg",
];
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
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
      .then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((response) => {
            if (request.method === "GET" && response.ok) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => caches.match("./index.html"));
      }),
  );
});
