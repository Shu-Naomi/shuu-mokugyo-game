# Lake-town storefront signs, v252-73

The artwork source `assets/village-shop-signs-v252-73.png` is based on the v252-68 map. Eight storefront/service signs and the requested fish-race hall panel have localized new artwork. Shrines, quest board, roof statues, structural frames, surrounding buildings and all terrain are unchanged.

Verified facility semantics in the game landmark definitions:
- Fishing inn (internal ID farmhouse): warm bath/steam emblem on its wall sign.
- Asual pet shop (watermill): paw and fish.
- Riao fish TCG shop: overlapping fish trading cards, not a second fish-market logo.
- Greengrocer: carrot and cabbage.
- Minato diner: steaming rice bowl and chopsticks.
- SAM tackle store: larger high-contrast SAM wordmark.
- Fish market: left-facing fish with one head and one tail.
- Harbor boat store: anchor and paddle.
- Dan fish race hall (west-shrine, not a shrine or shop): two racing fish and finish pennant replace the three waves.

Built-in image generation created a localized race-panel edit and an eight-icon sheet. The generation requested restrained warm-beige/navy pixel-art signs, the above exact store-specific motifs, and no extraneous labels except SAM. Only selected sign interiors were composited at native map resolution; icon proportions were preserved and the SAM letter crop was enlarged for readability. Generated whole-map changes were not used. The original map and prior fishmarket repair remain untouched.

`tests/village-shop-signs-art.test.cjs` checks decoded pixels exhaustively against the prior map, requiring a change in every one of nine declared interiors and none outside them. This is artwork-only coverage, not proof of collision or mobile interaction behavior. Browser verification is handled by the release task.
