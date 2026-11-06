# Village visual refresh: baseline audit and implementation plan

Historical pre-implementation audit. The later local implementation and its intentional small geometry adjustments are documented in `village-refresh-v252-55.md`; that document supersedes the unchanged-runtime status below.

Inspected main `09cb4477b4f9fd6c37dbed35211c95439536bf52` (v252-54) on 2026-11-06 UTC (November 7 in Japan). This is an implementation plan, not a released change. No runtime code, save format, facility function or remote branch was changed by this audit.

## Requested result and limits

Keep the initial village concept, make its pixel art crisp and cohesive, widen narrow roads, and make routes continue visibly to area boundaries. The home exit in particular should not look blocked by rocks. The user also requested signs, a Dan fish-race exterior in place of the left shrine, a new Riao fish-TCG exterior, and an exterior that clearly identifies Asuar's existing pet shop.

Those exterior requests do not define race or TCG gameplay. The earlier question about storefront-only facilities marked "準備中" versus playable games remains unanswered. Do not invent those games or silently wire a new entrance to an unrelated old function. The remaining right shrine already owns offerings and rod fortunes. Keep that function in place. Preserve the current left-shrine behavior until the replacement's interaction scope is decided.

Village publication and merge are not authorized by this audit. Work can continue locally on visual preparation independently of the unresolved new-facility interaction scope.

## What causes the patchwork

`scene-layers.js:18–28` composes three newer facility illustrations into the older `assets/terrain-world-v54.png` master. The current image is 1536×864; game coordinates are 240×135, or 6.4 art pixels per world unit.

| Replacement | Input size | Destination in master | Reduction |
| --- | --- | --- | --- |
| Sam shop | 1407×1118 | x1120,y405,w272,h216 | 5.173× / 5.176× |
| Fishing inn | 1407×1118 | x120,y48,w272,h216 | 5.173× / 5.176× |
| Fish market | 1448×1086 | x912,y532,w224,h168 | 6.464× |

The replacement images are much higher-detail, brighter and more strongly outlined than the surrounding master. They are sampled down to different densities and clipped to the previous district polygons. The composed image visibly exposes the discontinuity, especially along the inn roof/garden, shop-side grass and fish-market paving. Old masks can cut the newly painted silhouette. These are actual asset/composition seams, not a guessed CSS fault.

The old master itself contains soft, fine-grained painterly texture rather than consistently authored pixel clusters. Nearest-neighbor display preserves that texture; it cannot turn it into crisp pixel art. Reducing detail by arbitrary sharpening alone would preserve the mismatched districts.

Two explicit tiled dock patches are also present in `scene-layers.js:88–89`: a lower-pier link at [967,722,42,40] and an east-pier link at [1389,627,37,55], both sampled from [984,756,26,18]. They keep established walkable links visible but should be authored into a coherent final master rather than retained as obvious repeated texture pieces.

The compositor already sets `imageSmoothingEnabled=false`, uses native scene dimensions, and applies coherent ground/water grading. `pixel-scenes.css` already uses `image-rendering:pixelated`. Although the initial HTML canvas says 960×540, the loaded controller resizes it to 1536×864. Do not diagnose that initial attribute as permanent downsampling. Current native-resolution layer reconstruction passes its exact-pixel test.

## Geometry and behavior to preserve

Keep the current lake, river, sea, practice pond, stone bridge, harbor and all existing building anchors. Do not globally open a road polygon across water or building walls. Current village walkability already permits most dry terrain; a wider painted road does not necessarily require broader collision permissions.

Key anchors, in game coordinates:

| Place | Preserve |
| --- | --- |
| Home exit | rectangle x2–6,y73–85; return x10,y79 facing right |
| Mountain exit | rectangle x116–132,y2–10; return x124,y8 facing down |
| Rural exit | rectangle x216–225,y33–39; return x214,y35 facing left |
| Inn | ID farmhouse; interaction center43,34 radius8; verified arrival42,35 |
| Sam | ID sam-shop; interaction x193–203,y88–96; central approach x195–201,y86–93 |
| Fish market | ID fish-market; center160,105 radius9; keep east harbor passage |
| Pet shop | ID watermill; interaction x191–204,y31.2–37.5 |
| Right shrine | ID main-shrine; center193,66 radius9; preserve offerings and fortunes |
| Left shrine | ID west-shrine; center36,61 radius8; current prayer interaction remains until scope decision |
| Central bridge | x99–119,y75–88, with separate cast-over-water restriction |

Keep the other shop, diner, produce shop, small shrine, quest board, lake pier, boat shop and ferry access. Preserve IDs, save keys/slots, fish inventory, equipment, hooks, boarding, aquarium/eggs/breeding, quests, story, dog state, money, game time, and existing modal/return behavior.

## Safe implementation sequence

1. Freeze the current geometry and render a baseline, including existing newer buildings. Keep original source assets unchanged. Recover the previous candidate only if its actual bytes can be found; do not claim it was restored from a historical note alone.
2. Create one cohesive full-village draft from the current composed map, instead of attaching another small bright replacement. Preserve landmarks and door anchors exactly, keep the established Japanese lakeside/river/harbor layout, and unify roof/wood/grass/stone/water treatment. Select a common pixel density before finalizing art; a 768×432 logical grid at integer 2× is one candidate to compare at phone size, not an approved requirement. Avoid soft gradients, resampled line detail and oversharpening halos.
3. Widen existing dry-road corridors around the lake, village shops and central bridge, clearing only the minimum vegetation/rocks needed. Draw the home route continuously to the left boundary and mountain route to the top boundary. Keep the newly released rural exit legible on the northeast side of the pet shop. Put signs beside, not in, the walkable corridor. Preserve explicit bridge/shore separation.
4. Draw requested exteriors as visual proposals with marked footprint/door coordinates. Keep current pet-shop functionality and entrance. Leave race/TCG interaction changes out of the playable branch until scope is clarified. Do not place Riao's new building over an existing connection simply to fit the composition.
5. For the accepted cohesive master, remove only the three superseded `world.edits` entries and the two dock patches after their pixels are demonstrably baked into the new art. Preserve historical image files. Re-measure building, foliage, water and foreground masks against the actual new pixels; no mask should reuse an old roof outline merely because its ID matches. Update the underlay only where moving parts expose it. Keep coherent grading and native canvas rendering.
6. Match any necessary collision edits to the accepted painted shapes. Record changed geometry explicitly, keeping door positions and return positions unless an intentional relocation has been approved. Prefer no collision change when road widening remains on already-walkable dry land.
7. Update the mini-map/guide source, fallback image, scene manifest, worker references and offline service-worker asset cache together. Do not change the release version or publish until the full final candidate is verified and publication is authorized.

## Verification gates for implementation

- Render the final composite, not just the new PNG. Review full map plus 1:1 crops of inn, Sam, fish market, home exit, mountain exit, rural exit, bridge and both dock links.
- Check spring/day, night, rain and seasonal foliage. Static, motion and foreground layers must reconstruct cleanly without uncovered underlay, double buildings or rectangular color seams.
- Preserve the current 16 movement-grid reachability tests and solid-water/wall tests. Add authored center/edge route samples for the widened corridors and all three exits. Test four-unit movement forward and backward and interrupted steps, not coordinate teleportation as a substitute.
- Walk home → inn → left facility → produce shop → bridge → diner → shrine → pet shop → rural exit/return → Sam → fish market → boat shop/ferry, plus mountain exit/return. Check A targets, exit feet, NPC/dog feet, fishing/cast cancellation, and repeated entry/exit.
- Round-trip existing saves with aquarium, boarding and quest/story progress, including saves near changed road margins. No fish duplication, deletion, reset or ID migration is part of this task.
- Run focused tests, then all four standard unit shards and required browser suites against the final candidate. Use PC1280×720, touch844×390 and touch820×366/DPR1.875. Check 44px controls, actual visible feet, JS/HTTP errors and save/reload. Chromium/CDP is not physical-phone verification.
- Obtain appearance/scope feedback and publication authorization before remote writes, merge or deployment. Verify exact remote commit and CI if publication is later authorized.

## Completed audit checks and limitations

- Main was refreshed and a separate checkout created at exact commit `09cb4477b4f9fd6c37dbed35211c95439536bf52`.
- 24 focused tests passed, with zero failure/cancel/skip: layered scenery, world paths, village layout/save round-trip, inn, Sam and harbor dialogue. This is a baseline focused pass, not a final implementation or full-suite pass.
- Current source and spring/day composite were rendered through the actual `assembleSource`, `prepare` and `compose` code and visually inspected.
- Browser launch did not reach a page. The default Playwright browser binary is missing. The installed Chromium path was tried, but the runtime rejected its process-singleton socket with EPERM; an explicit environment escalation attempt produced the same failure. No local browser results are claimed. Use an authorized working browser environment/CI for the final candidate, without weakening test assertions.
- The historical `/workspace/scratch/8443be8b39aa/village-renewal` directory is absent. Its historical Library ID is not visible in the current files surface, and title search found only an unrelated August original map. The old revised image/code have not been recovered. Preserve the known historical identity rather than silently recreating it and calling it the original.

Local evidence for this audit lives next to the checkout in `village-refresh-evidence/`; logs are `village-refresh-baseline-tests.log` and `village-refresh-browser-inn.log`. These are internal working evidence, not newly delivered user artifacts.
