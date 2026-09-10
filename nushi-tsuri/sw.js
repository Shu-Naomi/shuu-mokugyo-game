const CACHE_PREFIX = "nushi-tsuri-";
const CACHE_NAME = "nushi-tsuri-v170-seasonal-music-170-1";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./music-tracks.js?v=170-1",
  "./soundscape.js?v=170-1",
  "./assets/audio/music-v170/boats.mp3",
  "./assets/audio/music-v170/diner.mp3",
  "./assets/audio/music-v170/fish-market.mp3",
  "./assets/audio/music-v170/harbor-birds.mp3",
  "./assets/audio/music-v170/home.mp3",
  "./assets/audio/music-v170/inn.mp3",
  "./assets/audio/music-v170/lake-birds.mp3",
  "./assets/audio/music-v170/map-autumn.mp3",
  "./assets/audio/music-v170/map-spring.mp3",
  "./assets/audio/music-v170/map-summer.mp3",
  "./assets/audio/music-v170/map-winter.mp3",
  "./assets/audio/music-v170/sam.mp3",
  "./assets/audio/music-v170/shrine.mp3",
  "./assets/audio/music-v170/yaoya.mp3",
  "./weather.js?v=169-1",
  "./pixel-world.js?v=165-1",
  "./pixel-cast.js?v=168-1",
  "./pixel-scenes.css?v=165-1",
  "./scene-layers.js?v=165-1",
  "./layered-scenery.js?v=169-1",
  "./scenery-worker.js?v=169-1",
  "./assets/terrain-world-v54.png",
  "./assets/layered-v163/world-underlay.png",
  "./assets/player-home-exterior-v160.webp",
  "./assets/layered-v163/home-exterior-underlay.png",
  "./assets/player-home-interior-v160.webp",
  "./assets/layered-v163/home-interior-underlay.png",
  "./assets/interior-sam-shop-v55.png",
  "./assets/layered-v163/fishing-inn-master.png",
  "./assets/interior-yaoya-v55.png",
  "./assets/interior-minato-diner-v55.png",
  "./assets/interior-star-shrine-v55.png",
  "./assets/interior-fish-market-v55.png",
  "./assets/cast-lake-morning-v77.jpg",
  "./assets/cast-lake-day-soft-v77.jpg",
  "./assets/cast-lake-evening-v77.jpg",
  "./assets/cast-lake-night-v77.jpg",
  "./assets/cast-river-morning-v77.jpg",
  "./assets/cast-river-day-soft-v77.jpg",
  "./assets/cast-river-evening-v77.jpg",
  "./assets/cast-river-night-v77.jpg",
  "./assets/cast-sea-beach-morning-v76.jpg",
  "./assets/cast-sea-beach-day-soft-v76.jpg",
  "./assets/cast-sea-beach-evening-v76.jpg",
  "./assets/cast-sea-beach-night-v76.jpg",
  "./assets/cast-sea-harbor-morning-v76.jpg",
  "./assets/cast-sea-harbor-day-soft-v76.jpg",
  "./assets/cast-sea-harbor-evening-v76.jpg",
  "./assets/cast-sea-harbor-night-v76.jpg",
  "./assets/cast-sam-pond-morning-v78.jpg",
  "./assets/cast-sam-pond-day-soft-v78.jpg",
  "./assets/cast-sam-pond-evening-v78.jpg",
  "./assets/cast-sam-pond-night-v78.jpg",
  "./assets/underwater-lake-shallow-v64.jpg",
  "./assets/underwater-lake-mid-v64.jpg",
  "./assets/underwater-lake-deep-v64.jpg",
  "./assets/underwater-river-shallow-v64.jpg",
  "./assets/underwater-river-mid-v64.jpg",
  "./assets/underwater-river-deep-v64.jpg",
  "./assets/underwater-sea-shallow-v65.jpg",
  "./assets/underwater-sea-mid-v65.jpg",
  "./assets/underwater-sea-deep-v65.jpg",
  "./assets/underwater-sea-sand-flatfish-v97.jpg",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./assets/rod-display-atlas-v82-10.png",
  "./assets/player-boy-cast-atlas-v168.webp",
  "./assets/player-girl-cast-atlas-v168.webp",
  "./assets/player-boy-cast-v73.png",
  "./assets/player-girl-cast-v73.png",
  "./assets/shuu-walk.png?v=12",
  "./assets/riku-walk.png?v=12",
  "./assets/grey-walk.png?v=12",
  "./assets/dog-idles.png?v=12",
  "./assets/sam-front.png",
  "./assets/fish-moroko-v125.png",
  "./assets/fish-funa-v124.png",
  "./assets/fish-koi-v114.png",
  "./assets/fish-namazu-v115.png",
  "./assets/fish-nushi-v31.png",
  "./assets/fish-aji-v68.png",
  "./assets/fish-kasago-v57.png",
  "./assets/fish-kasago-catch-v58.png",
  "./assets/fish-moroko-mouth-part-v125.png",
  "./assets/fish-moroko-mouth-open-v125.png",
  "./assets/fish-moroko-turn-v70.png",
  "./assets/fish-aji-mouth-v68.png",
  "./assets/fish-aji-turn-v70.png",
  "./assets/fish-ayu-v95.png",
  "./assets/fish-ayu-mouth-v95.png",
  "./assets/fish-ayu-turn-v95.png",
  "./assets/fish-yamame-v100.png",
  "./assets/fish-yamame-mouth-v100.png",
  "./assets/fish-yamame-turn-v100.png",
  "./assets/fish-nijimasu-v147.png",
  "./assets/fish-nijimasu-mouth-v147.png",
  "./assets/fish-nijimasu-turn-v147.png",
  "./assets/fish-namazu-v96.png",
  "./assets/fish-namazu-mouth-open-v123.png",
  "./assets/fish-namazu-turn-v96.png",
  "./assets/fish-unagi-v102.png",
  "./assets/fish-unagi-mouth-v102.png",
  "./assets/fish-unagi-turn-v102.png",
  "./assets/fish-bass-v98.png",
  "./assets/fish-bass-mouth-v98.png",
  "./assets/fish-bass-turn-v98.png",
  "./assets/fish-kurodai-v99.png",
  "./assets/fish-kurodai-mouth-v99.png",
  "./assets/fish-kurodai-turn-v99.png",
  "./assets/fish-hirame-v97.png",
  "./assets/fish-hirame-ground-v97-1.png",
  "./assets/fish-hirame-mouth-v97.png",
  "./assets/fish-hirame-turn-v97.png",
  "./assets/fish-funa-mouth-part-v124.png",
  "./assets/fish-funa-mouth-open-v124.png",
  "./assets/fish-funa-turn-v70.png",
  "./assets/fish-koi-mouth-part-v130.png",
  "./assets/fish-koi-mouth-open-v130.png",
  "./assets/fish-koi-turn-v70.png",
  "./assets/fish-kasago-mouth-v68.png",
  "./assets/fish-kasago-turn-v70.png",
  "./assets/fish-suzuki-v93.png",
  "./assets/fish-suzuki-mouth-v93.png",
  "./assets/fish-suzuki-turn-v93.png",
  "./assets/fish-bora-v137.png",
  "./assets/fish-bora-mouth-part-v137.png",
  "./assets/fish-bora-mouth-open-v137.png",
  "./assets/fish-bora-turn-v137.png",
  "./assets/mebaru-v144/swim-00.png",
  "./assets/mebaru-v144/swim-01.png",
  "./assets/mebaru-v144/swim-02.png",
  "./assets/mebaru-v144/swim-03.png",
  "./assets/mebaru-v144/swim-04.png",
  "./assets/mebaru-v144/swim-05.png",
  "./assets/mebaru-v144/swim-06.png",
  "./assets/mebaru-v144/swim-07.png",
  "./assets/mebaru-v144/swim-08.png",
  "./assets/mebaru-v144/swim-09.png",
  "./assets/mebaru-v144/swim-10.png",
  "./assets/mebaru-v144/swim-11.png",
  "./assets/mebaru-v144/mouth-part-00.png",
  "./assets/mebaru-v144/mouth-part-01.png",
  "./assets/mebaru-v144/mouth-part-02.png",
  "./assets/mebaru-v144/mouth-part-03.png",
  "./assets/mebaru-v144/mouth-part-04.png",
  "./assets/mebaru-v144/mouth-part-05.png",
  "./assets/mebaru-v144/mouth-part-06.png",
  "./assets/mebaru-v144/mouth-part-07.png",
  "./assets/mebaru-v144/mouth-part-08.png",
  "./assets/mebaru-v144/mouth-part-09.png",
  "./assets/mebaru-v144/mouth-part-10.png",
  "./assets/mebaru-v144/mouth-part-11.png",
  "./assets/mebaru-v144/mouth-open-00.png",
  "./assets/mebaru-v144/mouth-open-01.png",
  "./assets/mebaru-v144/mouth-open-02.png",
  "./assets/mebaru-v144/mouth-open-03.png",
  "./assets/mebaru-v144/mouth-open-04.png",
  "./assets/mebaru-v144/mouth-open-05.png",
  "./assets/mebaru-v144/mouth-open-06.png",
  "./assets/mebaru-v144/mouth-open-07.png",
  "./assets/mebaru-v144/mouth-open-08.png",
  "./assets/mebaru-v144/mouth-open-09.png",
  "./assets/mebaru-v144/mouth-open-10.png",
  "./assets/mebaru-v144/mouth-open-11.png",
  "./assets/mebaru-v144/turn-00.png",
  "./assets/mebaru-v144/turn-01.png",
  "./assets/mebaru-v144/turn-02.png",
  "./assets/mebaru-v144/turn-03.png",
  "./assets/mebaru-v144/turn-04.png",
  "./assets/fish-nushi-mouth-v68.png",
  "./assets/fish-nushi-turn-v70.png",
  "./assets/audio/underwater-loop.mp3",
  "./assets/audio/fish-swim-small.mp3",
  "./assets/audio/fish-swim-medium.mp3",
  "./assets/audio/fish-swim-large.mp3",
  "./assets/audio/cast-lake-pond.mp3",
  "./assets/audio/cast-river.mp3",
  "./assets/audio/cast-sea-beach.mp3",
  "./assets/audio/cast-sea-harbor.mp3",
  "./assets/audio/cast-throw.mp3",
  "./assets/audio/lure-splash.mp3",
  "./assets/audio/reel-hook-set.mp3",
  "./assets/audio/reel-fish-pull.mp3",
  "./assets/audio/reel-player-wind.mp3",
  "./assets/audio/fish-gill-wash.mp3",
  "./assets/audio/fish-catch.mp3",
  "./assets/audio/dog-pet-bark.mp3",
  "./assets/audio/dog-bark-before-dig.mp3",
  "./assets/audio/dog-dig.mp3",
  "./assets/audio/shrine-draw-bell-v150.mp3",
  "./assets/audio/fortune-win-bell-v150.mp3",
  "./assets/audio/fortune-jackpot-confirm-v150.mp3",
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
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
async function matchGameCache(request) {
  try {
    const cache = await caches.open(CACHE_NAME);
    return await cache.match(request);
  } catch (_) {
    return undefined;
  }
}
function storeGameResponse(event, request, response) {
  // Error pages and partial media responses must not replace a good copy.
  if (response.status !== 200) return;
  const copy = response.clone();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.put(request, copy))
      .catch(() => {}),
  );
}
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (request.mode === "navigate" || url.pathname.endsWith("/index.html")) {
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then(async (response) => {
          if (response.status >= 500)
            return await matchGameCache("./index.html") || response;
          storeGameResponse(event, "./index.html", response);
          return response;
        })
        .catch(async () => await matchGameCache("./index.html") || Response.error()),
    );
    return;
  }
  event.respondWith(
    matchGameCache(request)
      .then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((response) => {
            storeGameResponse(event, request, response);
            return response;
          })
          // A missing PNG/MP3 must fail as that resource, never receive HTML.
          .catch(() => Response.error());
      }),
  );
});
