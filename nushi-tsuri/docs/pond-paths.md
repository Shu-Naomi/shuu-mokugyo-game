# 峠の池: visibly wider roads and aligned collision (v252-51)

## Why v252-50 was incomplete

PR #318 corrected four sampled locations and widened parts of the collision corridor, but left the painting unchanged. Independent inspection found 75 further 11×11-pixel patches of clear dirt that were still blocked, particularly on the western and northeastern bends. Some old centreline points followed adjacent vegetation instead of the road. A pathfinder-driven browser tour established that a route existed, but did not prove that ordinary steering or the visible width was usable.

## Current correction

- Replace the field and journal image with `assets/pass-pond-v252-51.png` (1671×941), a constrained edit of the previous painting with visibly wider dirt roads, entrance and switchbacks.
- Retrace the road centreline against the finished image, and use the full painted width. Ring radii are 5.2–7.4 world units, the entrance radius is 12, and the switchbacks use 5.2.
- Add four explicitly traced rock/cliff polygons so the wider switchbacks cannot be crossed vertically through cliff faces.
- Widen the south return gate to cover the expanded entrance. Keep its destination, the marsh exit, entry coordinates, house and inhabitants, water geometry, fish, inventory and save format unchanged.
- Update the map, journal script, HUD, service-worker registration and cache together.

The original image remains in the repository for historical references. The new asset was made with the built-in image-edit tool: widen all existing tan paths about 1.6×, widen into adjacent vegetation rather than the lake, and preserve the camera, composition, lake outline, islands, exits and pixel-art style. It was inspected before collision tracing.

## Verification

`pond-wide-road.test.cjs` independently scans the final PNG on a 10px grid. A point is checked only if over 90% of an 11×11 neighbourhood is clear tan dirt. This audits 1,876 background-road patches, excluding only the visible house's solid footprint. It also exercises fixed touch sequences across the west and northeast road widths, up the western side of the entrance, and along the east road. Cliff shortcuts and the full-width return gate are tested explicitly.

The existing pond tests retain the loop, four fishing shores, house, both exits, save/reload and resource-preservation checks. An old migration test now correctly preserves a save at (219,66), which is on the expanded road, instead of requiring a displacement.

`browser-pond-paths.cjs` records desktop and phone evidence at 1280×720, 844×390 and 820×366. It checks loaded source hashes, the loop and fishing/cancel flows, independent fixed input sequences, held touch and release on the broad entrance, house, both exits, saved position, reload and options dismissal. Exact arrival is required before independent steering checks. The main workflow repeats the browser check only after deployed source hashes match.

Local Chromium cannot launch in the current execution sandbox because its Unix sockets are unavailable, including the accepted escalated attempt. Browser evidence must therefore be produced by the repository's GitHub Actions workflow and reviewed before merge. A successful unit or collision-data test is not a substitute for that visual browser pass.
