# Opening storybook

This change is presentation-only. All sixteen page identifiers, lines, speakers, choices, and version-2 checkpoints are preserved. Text advances on the player's input, never on animation completion. Both protagonist appearances and all three favorite companions have their own reunion paintings.

## Art direction

Warm 16-bit storybook paintings replace the overhead sprite stage. The standing scale reference establishes similar head sizes, with Sam about 1.2 times the protagonist's height. The conversation uses a reverse view toward the home's south entrance, rather than inventing an entrance in the east wall. Door, table, protagonist and the dogs' route remain continuous across the call, refusal, nose peek, threshold crossing and nuzzle beats.

The diary is held down while the protagonist looks up. The refusal painting brings it against the chest with a slight withdrawal. A nose appears behind Sam before the three dogs cross the same threshold. The selected companion then reaches the protagonist's hem. The illustrations contain no baked-in dialogue or names.

## Rendering and accessibility

Paintings render on a 640 × 360 canvas with nearest-neighbor sampling. Text lives in a separate grid cell; object-fit contain never crops the artwork. Each page has one small animation region and a finite 0.7–1.25 second presentation. There is no continuous loop or full-frame camera pan. Reduced-motion and backgrounding settle the scene immediately. Navigation cancels pending animation and late image callbacks. Loading does not block text navigation. Canvas data attributes expose page, panel, asset state, and animation region for integration tests.

## Validation

The unit tests retain exact dialogue-hash/save compatibility and check panel selection, animation bounds, state purity, cancellation, reduced motion, loading and backgrounding. Browser evidence replays every page for both avatars on desktop and landscape phones, tests previous/rapid advance/reload resume/skip/replay, checks selected companion names, confirms decoded artwork and distinct compositions, and asserts separate readable image/text/control bounds.

The PR must not merge until browser replay screenshots have been visually inspected, all referenced assets have decoded, and required CI passes for the final head. No rest, fishing, or battle changes are included.
