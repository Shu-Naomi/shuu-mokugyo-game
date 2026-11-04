# Valley building proportions and truthful release display

The Starview stream house and Sam shop used 13–13.5 world-unit-wide sprites. Their roughly 140-pixel atlas doors rendered much shorter than the player and residents. The house is now 28 × 23 and the shop 29 × 23 world units. The renderer retains aspect ratio and the original atlas; players, residents, other settlements, and the painted background are unchanged.

Door positions move slightly to (190, 40) for the house and (166, 66.5) for the shop. Access paths, door anchoring, and collision use those same definitions rather than a cosmetic CSS transform. The south-facing entrances stay reachable; the existing valley test walks from the arrival point to the shop, bridge, north pass, cave, all fishing banks and back, and checks legacy save recovery. Added tests cover house access, both door scales and solid footprints.

The HUD contained the literal `v251` while the worker/cache advanced independently. It now displays the loaded HTML release `v252-35`, with matching worker registration and cache suffix, and a regression test rejects mismatches. This does not claim that an already-open old page has refreshed. Existing saves and storage keys remain unchanged. World-life's script URL is updated so the new geometry is cached separately.

Browser CI captures both buildings and their interactions on desktop (1280 × 720) and touch landscape (844 × 390). Local native-canvas preview was reviewed. Local Chromium launch was blocked by the environment's Unix-socket restriction, including the escalated attempt, so actual browser results must be obtained from CI before merge.
