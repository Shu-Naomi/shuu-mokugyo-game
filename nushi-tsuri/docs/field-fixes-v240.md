# v240 field and shop fixes

Buildings retain their entrances and interactions but use smaller footprints and a quieter dirt approach rather than conspicuous plank strips. Each traced main trail is tested against every new building wall. The pond loop and region exits remain the original painted paths.

NPCs alternate neutral and stride frames: both supplied wide-stride cells looked almost identical, causing a sliding appearance when used alone. Reduced-motion mode remains still.

Old or invalid player positions recover onto ground with two adjacent safe directions. Directional input rechecks its origin before attempting movement. This preserves inventory, time and health and avoids landing on an isolated collision edge. Existing pond ring, pass and wetland route regression tests remain required.

Shallow casts are available from all coastal shore positions. Rod reach, prices, fish weights and save schema stay unchanged. On the harbor's upper quay the original complete front-view avatar faces the water below; the rod grip and launch trajectory use the same front-facing pose coordinates.

Asual's shop keeps the existing catalogue, tabs, selection, purchase and buyback handlers. Ivory paper, wood and warm ink replace the large green surfaces. All tabs and targets must fit the existing landscape dimensions, without reducing 44px controls.

Validation: focused tests cover old saves, painted trail samples, coastal short casts, visible NPC foot changes and harbor geometry. Browser evidence adds 1280×720, 844×390 and 820×366 touch checks, plus the existing loop/interior/purchase/fishing/save regressions. Simulated viewport checks do not substitute for physical-device play testing.
