# Sam's shop: same-art rendering study

Status: draft investigation, not a release. Building redesign has been stopped at the owner's request. Do not merge, deploy, change village-wide presentation, or resume redesign without review.

## Restoration and scope

The immutable comparison baseline is `880817ec738f6f9dcc45dc9a3a098e7bd6676823` (v252-55). The rejected 120×96 building replacement and its generator are removed from the branch. All production files, source images, scene definitions, camera code, CSS, cache names and offline URLs match that baseline. The original appearance is restored. Main was never changed by the unmerged prior draft.

This PR now adds investigation, tests and browser evidence only. CSS/compositor/position variants are injected by the browser test, not shipped to the game. Facilities, collisions, water and fishing triggers, NPC routes, player/dog art and positions, saves, prices and inventory remain unchanged. There is no sharpening, recoloring, palette reduction, replacement illustration or new per-frame production work.

## Findings before the new comparison

- The world source is already 1672×941. After loading, `#worldPixels` and the motion/foreground canvases use native scene dimensions. The initial HTML 960×540 is not a lasting downsample. Native source → prepare → compose is pixel-identical on a spring daytime frame; the exact full-world check finds zero changed pixels.
- Canvas composition and motion already set `imageSmoothingEnabled=false`. CSS already requests `image-rendering:pixelated`. Merely adding either setting cannot solve an already-disabled interpolation problem.
- **Correction to the previous pilot report:** the active `.map.v54-map` has 240% width with automatic height and 16:9 aspect ratio. An older 190% height declaration is overridden. This is not a demonstrated large anisotropic-stretch bug. The source's 1672/941 aspect ratio differs minutely from 16:9 because its height is an odd integer.
- Actual settled browser sizes have noninteger scale and fractional origins: desktop width3072 / source1672 ≈1.8373 CSS pixels per source pixel; landscape844 width2025.59375 /1672 ≈1.2115; landscape820/DPR1.875 physical scale≈2.2069. A noninteger scale alone does **not** prove added blur. At small scales, one-source-pixel details have unequal screen coverage and can be lost during downsampling.
- In an existing baseline screenshot's static roof/wall region `[1300,490]–[1440,575]`, all sampled screen colors match a source RGB in the expected 3×3 sampling neighborhood on the three viewports. This supports nearest-like settled presentation with no newly blended colors in that specific region. It does not prove the whole frame, every browser or camera movement is blend-free.
- The original Sam crop `(1252,476)–(1476,659)` contains35,474 RGB colors among40,992 pixels. That describes dense source shading. It does **not** establish that a redesign is necessary or authorized. Existing colors, shapes and character are to be preserved.
- CSS `crisp-edges` is a diagnostic control, not a promised fix. The [Chromium implementation discussion](https://groups.google.com/a/chromium.org/g/blink-dev/c/dqAs7zmriQQ/m/nzl-7lmrBQAJ) describes it as effectively a synonym of `pixelated`. The actual test browser's support, computed values and screenshot pixels must decide the result.
- The camera uses a percentage `translate3d`, a 0.3s transition and compositor hints. Changing compositing or snapping the final origin might affect sampling phase, but could cause movement judder, repaint cost or misalignment if only scenery moves. Such probes remain test-only and are not an endorsed production fix.

## Review experiments

The browser study compares the same original art at the same viewport, clock, player position, camera rectangle and scale. It records canvas dimensions, CSS and physical scales, fractional origins, computed styles and original canvas RGBA hashes. Baseline versus restored-default images must match exactly. Interpolation probes must not change source pixels, camera scale, collision state or save state. Any position-snapped probe is explicitly separate because a bounded subpixel origin adjustment is not an identical-camera comparison.

`auto` is a diagnostic reference for ordinary smoothing, not an assumed improvement. A compositor probe may leave pixels unchanged or cost more during movement. Zero visual difference is a useful result and must not be relabeled an improvement. Native-device-pixel crops and whole-frame pairs avoid hiding losses behind a changed zoom.

## Verification and limits

- Local focused restoration regression:25/25 tests pass. Source image hashes, no replacement assembly/asset, unchanged production settings and offline resources are checked. Previous gameplay/native-master tests are restored without weakening expectations.
- Dedicated CI uses the clean pinned baseline and exact PR head on Chromium:1280×720/DPR1, landscape touch844×390/DPR1, and820×366/DPR1.875.
- Real direction/action buttons, repeated shop open/close, practice-pond cancellation, NPC walkable feet, save/reload and existing purchase/entrance checks are exercised. Fixture money/date/name are test data, not the owner's save.
- Performance probes use a separate native-clock context, not the frozen screenshot clock. Short CI RAF/long-task/heap samples are not physical-phone temperature, battery measurements, sustained-play or statistically controlled benchmarks. Browser-emulated mobile size and touch are not a real phone.
- Browser comparison and final full regression are pending. Final results must replace this line before reporting completion. Local browser socket restrictions are not bypassed; actual browser evidence is produced in CI.

Art redesign remains the last resort. No redesign or wider rollout is authorized by a rendering experiment.
