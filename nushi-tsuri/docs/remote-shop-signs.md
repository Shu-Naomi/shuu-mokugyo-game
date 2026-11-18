# SAM's regional shop signs

`world-life.js` defines two functional distant shops: `stream-shop` (サムの渓流売店) and `wetland-shop` (サムの水郷売店). Both use sprite 1 of the shared settlement sheet. The previous fish-only roof sign could be mistaken for a fish market.

`assets/settlement-buildings-sam-signs.png` replaces only the sign interior at x=1240..1367, y=117..170 with a cream SAM wordmark, fishing hook and red/cream bobber. The base `settlement-buildings-v238.png` is retained unchanged. Every other decoded pixel and the full alpha channel remain identical. No building anchors, collision, terrain, routes, inventory or prices change.

Built-in image generation edited an enlarged crop with this instruction: replace only the fish picture with a large cream SAM wordmark on the left and hook/bobber on the right, preserving the aged wooden board, ropes, frame, roof and pixel-art style. Only the selected interior was downsampled and composited back into the original sheet. The final full shop crop was visually inspected.

`tests/remote-shop-signs-art.test.cjs` checks all pixels and alpha, both shop sprite references, and exclusion of residential buildings. Regional browser screenshots and publication/build cache wiring are handled by the integrating release task; this isolated change does not claim those checks have run.
