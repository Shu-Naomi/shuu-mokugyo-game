# Sam's shop: bounded SFC-style pixel-art pilot

Status: draft for visual review. Do not merge, deploy, or extend to the village before the owner reviews the before/after screenshots.

## Diagnosis

The baseline is `880817ec738f6f9dcc45dc9a3a098e7bd6676823` (v252-55).

- The selected world master is 1672×941 RGB. The Sam crop `(1252,476)-(1476,659)` contains 35,474 different RGB colors in 40,992 pixels. Only 0.95% of horizontal neighboring pixels match. Dense shading and softened edges are already present in the file. Nearest-neighbor rendering or sharpening cannot turn that source into deliberately drawn pixel clusters.
- The loaded world canvas already takes the source's native dimensions. `layered-scenery.js` already disables smoothing on composition/motion, and `pixel-scenes.css` already requests `image-rendering: pixelated`. The initial HTML 960×540 canvas is not the steady-state source resolution.
- Responsive map size (240% × 190%) and fractional percentage camera translation create noninteger, sometimes anisotropic display scales. Camera transitions can produce unequal device-pixel coverage. This pilot records the actual browser rectangles but does not change the camera globally or claim to eliminate all movement shimmer.
- Characters and scenery use different density: the 92×116 player canvas occupies about 43.47×54.81 world-master pixels, before responsive display. The pilot is intentionally a local visual direction test, not a claim that every character/background pixel grid now matches.

## What changes

`assets/sam-sfc-pixel-pilot.png` is original 120×96 artwork authored with integer pixel primitives and a fixed palette of at most 30 colors. `tools/draw-sam-pixel-pilot.cjs` is its reproducible source. It never reads or filters the old image. The roof, bitmap SAM sign, timber, tackle shelves, door, barrels, floats, net, small verge and paved forecourt use deliberate hard-edged clusters.

The existing compositor displays it at exactly 2× within native-master rectangle `[1240,472,240,192]`. An integer, axis-aligned stepped contour keeps the change around the shop and its immediate forecourt. More than 97% of the master remains byte-for-byte unchanged. The original PNG and underlay remain unchanged. There is no whole-map filter, sharpening, resampling, global scaling, or recoloring.

The existing scene preparation/cache/worker path is reused. The extra PNG is only a few kilobytes, is decoded/assembled once per prepared scene, and adds no timer, animation, per-frame draw pass, Canvas size, scene part or effect. The existing 12 fps motion cap, three prepared-scene cache, visibility suspension and inactive-buffer release stay intact. The metadata URL/cache name changes so a review build cannot keep stale metadata; the public v252-55 badge remains the baseline release.

## What stays unchanged

All gameplay geometry and state logic: facilities and their IDs, shop entrance, collisions, paths, water and fishing triggers, NPC routes, player/dog positions, player art, inventory, prices, fishing modes, save key/schema and camera behavior. Opening-story and guide artwork intentionally keep their original master until a wider direction is approved.

## Verification

- `sam-pixel-pilot.test.cjs`: palette and native size, exact 2× source pixels, binary-alpha asset, integer clip boundary without blended edge colors, exact unchanged pixels outside the contour, day/night/rain composition and unchanged scene/effect budgets.
- Existing native-master/archived district tests are retained. Only their current-world expectation is updated to allow this single explicit pilot. Sam's expected daytime pixels are the actual assembled pilot, not a deleted fidelity assertion.
- Existing village Sam, inn, market, facility-front, water-alignment and scene-compositor tests continue to cover gameplay.
- Dedicated CI checks a clean pinned baseline against the exact PR head at desktop 1280×720, landscape touch 844×390/DPR1 and 820×366/DPR1.875. It asserts identical save fixture, game time, positions, routes, camera and scale; records before/after/pair/diff PNGs; walks with actual buttons; opens/closes Sam repeatedly; cancels practice-pond fishing; checks NPC feet and save/reload. Existing purchase/entrance regression runs separately.
- A separate unmocked-clock context samples 5 seconds of steady idle after a 2-second warm-up, reporting RAF intervals, long tasks and supported heap counters. This is a single sequential CI performance proxy, not a physical-phone temperature, battery or sustained-load measurement.

Local browser launch is unavailable under the current execution environment's recorded socket restriction. Local tests are not substituted for actual browser screenshots. Browser evidence and exact final CI status must be checked before calling the pilot ready for review; aesthetic acceptance remains with the owner.
