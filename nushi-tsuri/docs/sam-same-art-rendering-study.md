# Sam's shop: same-art rendering study

Status: draft investigation, not a release. Building redesign has been stopped at the owner's request. Do not merge, deploy, change village-wide presentation, or resume redesign without review.

## Restoration and scope

The immutable comparison baseline is `880817ec738f6f9dcc45dc9a3a098e7bd6676823` (v252-55). The rejected 120×96 building replacement and its generator are removed from the branch. All production files, source images, scene definitions, camera code, CSS, cache names and offline URLs match that baseline. The original appearance is restored. Main was never changed by the unmerged prior draft.

This PR now adds investigation, tests and browser evidence only. CSS and alignment variants are injected by browser tests, not shipped to the game. Position changes are isolated in a separately labeled experiment, never included in the strict identical-framing CSS comparison. Facilities, collisions, water and fishing triggers, NPC routes, player/dog art and positions, saves, prices and inventory remain unchanged. There is no sharpening, recoloring, palette reduction, replacement illustration or new per-frame production work.

## Findings before the new comparison

- The world source is already 1672×941. After loading, `#worldPixels` and the motion/foreground canvases use native scene dimensions. The initial HTML 960×540 is not a lasting downsample. Native source → prepare → compose is pixel-identical on a spring daytime frame; the exact full-world check finds zero changed pixels.
- Canvas composition and motion already set `imageSmoothingEnabled=false`. CSS already requests `image-rendering:pixelated`. Merely adding either setting cannot solve an already-disabled interpolation problem.
- **Correction to the previous pilot report:** the active `.map.v54-map` has 240% width with automatic height and 16:9 aspect ratio. An older 190% height declaration is overridden. This is not a demonstrated large anisotropic-stretch bug. The source's 1672/941 aspect ratio differs minutely from 16:9 because its height is an odd integer.
- Actual settled browser sizes have noninteger scale and fractional origins: desktop width3072 / source1672 ≈1.8373 CSS pixels per source pixel; landscape844 width2025.59375 /1672 ≈1.2115; landscape820/DPR1.875 physical scale≈2.2069. A noninteger scale alone does **not** prove added blur. At small scales, one-source-pixel details have unequal screen coverage and can be lost during downsampling.
- In an existing baseline screenshot's static roof/wall region `[1300,490]–[1440,575]`, all sampled screen colors match a source RGB in the expected 3×3 sampling neighborhood on the three viewports. This supports nearest-like settled presentation with no newly blended colors in that specific region. It does not prove the whole frame, every browser or camera movement is blend-free.
- The original Sam crop `(1252,476)–(1476,659)` contains 35,474 RGB colors among 40,992 pixels. That describes dense source shading. It does **not** establish that a redesign is necessary or authorized. Existing colors, shapes and character are to be preserved.
- CSS `crisp-edges` is a diagnostic control, not a promised fix. The [Chromium implementation discussion](https://groups.google.com/a/chromium.org/g/blink-dev/c/dqAs7zmriQQ/m/nzl-7lmrBQAJ) describes it as effectively a synonym of `pixelated`. The actual test browser's support, computed values and screenshot pixels must decide the result.
- The camera uses a percentage `translate3d`, a 0.3s transition and compositor hints. A test-only 3D-to-2D/compositor change failed the strict same-position condition in CI: settled origins moved by less than 0.001 CSS pixel even after finishing transitions. It is excluded from matched comparisons rather than weakening the position assertion. This tiny sampling-phase change is not evidence of improved outlines. No compositor or camera-snapping change is shipped.

## Review experiments

The browser study compares the same original art at the same viewport, clock, player position, camera rectangle and scale. It records canvas dimensions, CSS and physical scales, fractional origins, computed styles and original canvas RGBA hashes. Baseline versus restored-default images must match exactly. Interpolation probes must not change source pixels, camera scale, collision state or save state. Any position-snapped probe is explicitly separate because a bounded subpixel origin adjustment is not an identical-camera comparison.

`auto` is a diagnostic reference for ordinary smoothing, not an assumed improvement. The excluded compositor probe is not presented as a same-position improvement. Zero visual difference is a useful result and must not be relabeled an improvement. Native-device-pixel crops and whole-frame pairs avoid hiding losses behind a changed zoom.

## Verification and limits

- Local focused restoration regression: 25/25 tests pass, plus the added full-native composition assertion. Source image hashes, no replacement assembly/asset, unchanged production settings and offline resources are checked. Previous gameplay/native-master tests are restored without weakening expectations.
- Dedicated CI uses the clean pinned baseline and exact PR head on Chromium: 1280×720/DPR1, landscape touch 844×390/DPR1, and 820×366/DPR1.875.
- Real direction/action buttons, repeated shop open/close, practice-pond cancellation, NPC walkable feet, save/reload and existing purchase/entrance checks are exercised. Fixture money/date/name are test data, not the owner's save.
- Performance probes use a separate native-clock context, not the frozen screenshot clock. Short CI RAF/long-task/heap samples are not physical-phone temperature, battery measurements, sustained-play or statistically controlled benchmarks. Browser-emulated mobile size and touch are not a real phone.
- The exact-head browser and full-regression results are recorded in the PR description and linked workflow runs. Treat pending or failed checks as unfinished, not a pass. Local browser socket restrictions are not bypassed; actual browser evidence is produced in CI.

Art redesign remains the last resort. No redesign or wider rollout is authorized by a rendering experiment.

## Second experiment: synchronized alignment and integer scale

`browser-sam-alignment-experiments.cjs` is a separate, reversible browser-only experiment. It does not change the served runtime, assets, collision coordinates, or saved data. It evaluates the whole map together with its scenery and actors, rather than moving only the background behind fixed characters.

The study separates three questions: whether snapping a settled final device-pixel origin changes static appearance, whether snapping each camera-animation frame stabilizes the sampling pattern at the existing scale, and whether integer physical scale gives uniform source-pixel blocks at an acceptable change in view. A viewport alternative is labeled separately because losing usable screen area is a real tradeoff, not an invisible sharpening fix.

The same three desktop/landscape screens are joined by 640×360/DPR1 to measure an actual landscape game layout below one device pixel per source pixel. The test captures original-asset screenshots, transition samples, bounds/scales, source hashes, view changes, restoration, and native-clock performance proxies. Its results must be reviewed before recommending any candidate. Integer scale is not an identical-scale comparison, endpoint snapping does not fix intermediate frames, and preserving the world pixel grid does not make independent actor assets share that grid.

The attempted 390×844 portrait case cannot enter the game: its existing portrait CSS hides the title/game screens behind a landscape warning. The test does not bypass that restriction; 640×360/DPR1 landscape is used for the below-one-scale case instead.

This second experiment is pending browser validation. No positive result or performance claim is implied by adding the harness. Physical-device temperature, battery use, Safari, and sustained play remain unmeasured.
