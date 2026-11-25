# Outdoor night and rural bridge correction (draft, based on 12df756)

## Cause and scope

The 01:10 screenshot contains a baked railing shadow in `assets/rural-canals-v252-48.webp`, not a dynamic shadow. Regional maps already receive the shared game clock, but used a separate translucent navy overlay. It retains warm highlights and has no dawn treatment. Village outdoor scenes use channel multiplication instead.

- Coast, offshore island, stream, mountain pond, mountain marsh, wetland and rural canals now use the village's night (.38/.49/.72) and dawn (.73/.77/.91) multipliers, rounded to 8-bit Canvas multiply. Day, morning and evening appearance is preserved.
- Lighting is restricted to each map canvas, after scenery composition. No filter on the world container, no HUD, character, boat, interiors, cast screen or controls changes. Cave intentionally stays unchanged.
- `assets/rural-bridge-shadow-repair.png` is a 140×130 transparent overlay at source (1138,465) on the 1672×941 rural map. Alpha is restricted to the elongated railing shadow on dirt. The original full map bytes, short bridge contact shadow, bridge/rail geometry and collision data are unchanged. It is applied before grading in all periods, avoiding a shadow popping at dusk.
- Tradeoff: source art remains a baked daytime painting, not dynamic relighting. A faint local dirt texture seam is visible at daytime zoom. The bridge fix is deliberately not a whole-map regeneration.

## Art provenance

Replacement dirt generated using built-in ImageGen from a crop of the existing project asset, then a bounded feathered alpha mask keeps the rest of the original untouched. Final overlay SHA-256: `8f7496f100810560ac1e2d8079d99194b76e4b51ec941e714e743fe276f0ceed`.

Prompt: Precisely retouch the supplied landscape crop in place, maintaining its 3:2 framing and exact pixel-art composition. The only removal is the long, dark ladder-shaped railing shadow cast diagonally southeast below the wooden bridge across the tan dirt path. Preserve the short, soft contact shadow immediately beside the bridge foot. Restore matching uninterrupted granular tan dirt underneath the rest of that long shadow; continue the path's existing grain and subtle tonal variation. Leave the bridge geometry, posts, rails, planks, water, foliage, grass borders, flowers, and stones in exactly the same positions and proportions; do not redraw, move, crop or restyle them. Retain the existing golden daytime lighting, palette, resolution feel and pixel texture. No other alteration.

## Verification

`tests/outdoor-night.test.cjs` covers decoded native Canvas pixels across every region, cave exemption, all shared-clock boundaries, repaint without accumulated tint, bounded repair alpha, delayed-load latest time, stale destination, actual A-entry/return and save/reload. Existing rural regression tests cover delayed image completion under menus/background visibility. Standalone VM fixtures load the new explicit lighting dependency.

`tests/browser-outdoor-night.cjs` runs the generated production entry in Chromium at 844×390 / DPR 2, captures day/night for all regional maps and rural dawn, checks actual clock/Canvas values, night save/reload, A-button region transitions, movement and absence of ancestor/UI filters. It runs in the existing Rural canals CI; no local Chromium launch is required. These are emulator screenshots, not a claim of physical-device validation.

Draft only: no release version bump, merge, cache deletion or deployment. Rebuild generated index/precache with `node tools/build-village-production.cjs` before any commit.
