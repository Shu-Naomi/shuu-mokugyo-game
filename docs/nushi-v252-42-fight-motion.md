# v252-42: stronger underwater fight strokes

Fish now use a separate fight-only stroke rhythm. The starfall nushi has a broad, deliberate push-and-glide tail stroke; swift fish stay tighter and quicker, long-bodied fish carry a broader posterior wave, and each regional nushi has its own cadence. Calm windows retain a smaller stroke. Head-shake warnings, turns, gill-washes and grounded flatfish return to the original amplitude.

## Scope and safeguards

- Only the painter's swim phase and posterior-wave effort change. Retrieval, tension, stamina, hook wear, random decisions and movement bounds are unchanged.
- Original sprites, body volume, fixed lips, fin roots, body transforms and hook anchors are preserved. No whole-fish bobbing or new camera shake.
- Aquarium/default rendering stays byte-identical. Effort does not enter source-raster cache keys and reuses output buffers.
- Reduced motion removes the additional fight phase/effort while retaining existing game movement. Pause/visibility resume shifts the art clock without wall-time catch-up.
- A stale motion module falls back to the old rendering during an interrupted update. Script query versions, service-worker CORE_ASSETS, cache name, registration and release badge must be updated together.

## Verification

- Maximum-effort anatomy checks cover every fish with exact pixel-count, fixed-lip and canvas-bound checks. Independent comparison of default/effort-1 output covers 72 species/variants and 1,152 swim/turn/mouth comparisons against v252-38.
- Paired seeded simulation traces compare responsive bounds, positions/velocities, retrieval, tension, mood/windows and random draw counts with cosmetic effort enabled versus neutral. Explicit nonzero browser geometry is used.
- Before/after real-browser recordings use controlled encounter/phase fixtures, not catch-rate trials, and cover landscape mobile (844×390, DPR 3), desktop (1280×720), nushi and gauge modes, small/long/swift fish, starfall nushi, warnings, pauses, grounded/lifted hirame, turns and gill-washes.
- Temporal inspection found broader starfall-nushi strokes, a broader utsubo wave and tighter hiramasa movement. Moroko's change is subtler at native phone size. No new disconnected anatomy, hook separation or button overlap was observed. Existing mouth-pose size changes are present in both baseline and updated captures. The leap apex also passes behind the persistent top help banner/HUD in both versions; this patch does not alter that existing layout.
- Warmed painter samples remain approximately 0.1–0.2 ms median and 0.2–0.4 ms p95, with stable raster/output counts. These are CI browser-renderer samples, not physical-phone temperature or battery measurements.

The `Underwater fight motion` workflow preserves comparison clips and measurements. After merge it also verifies exact deployed source hashes before exercising the public runtime. Final merge is gated on the coordinated v252-39/v252-40/v252-41 changes and checks for the final integrated head.
