# 峠の池: painted-road collision correction

The existing 1672 × 941 `pass-pond-v202.png` painting is unchanged.

## Reproduced

Four independently sampled tan-dirt pixels were not walkable: `(820,790)`, `(810,820)`, `(815,845)` on the south approach, and `(1520,470)` on the east bend. The approach collision drifted to world x124 at y118, east of much of the visible road. The entire ring also had a single 2.7-unit radius regardless of the painted width.

## Correction

- Recenter the south approach and give it its own 4.8-unit radius.
- Split the existing ring into sections. Use radii 3.4–3.8 on the broad western, eastern and southern bends, while keeping the northern ledge at 2.8 and switchbacks at 2.8.
- Shift the east-bend center half a world unit onto the visible dirt.
- Preserve the exact artwork, water polygon, shoreline access width, house footprint and approach, regional identifiers, save format, fish populations and both exit destinations.
- Do not widen all shoreline banks or allow cliff shortcuts.

## Regression coverage

`pond-paths.test.cjs` checks the independent source-pixel samples, usable entrance width, east-bend sweep, cliff/forest/water/house boundaries, actual touch controls around the ring and shores, house interaction, both exit transitions, resource preservation and save/reload.

`browser-pond-paths.cjs` uses real keyboard/touch input at 1280×720, 844×390 and 820×366. It records screenshots of each section, four shoreline cast preparations/cancellations, the house, both exits, saved west-edge position and options dismissal. It also verifies loaded source hashes. The main-branch workflow waits for exact deployed files before repeating the public-browser checks.
