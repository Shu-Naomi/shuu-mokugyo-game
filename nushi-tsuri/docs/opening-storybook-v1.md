# Opening storybook

All sixteen page identifiers, speakers, choices, and version-2 checkpoints are preserved. The feedback revision changes only the puppies title to match the visible doorway and its narration opening to introduce the small footsteps before identifying the three dogs; all dialogue remains unchanged. Text advances on the player's input, never on animation completion. Both protagonist appearances and all three favorite companions have their own reunion paintings.

## Art direction

Warm 16-bit storybook paintings replace the overhead sprite stage. The standing scale reference establishes similar head sizes, with Sam about 1.2 times the protagonist's height. The conversation uses a reverse view toward the home's south entrance, rather than inventing an entrance in the east wall. Door, table, protagonist and the dogs' route remain continuous across the call, refusal, nose peek, threshold crossing and nuzzle beats.

The diary is held down while the protagonist looks up. The refusal painting brings it against the chest with a slight withdrawal. A nose appears behind Sam before the three dogs cross the same threshold. The selected companion then reaches the protagonist's hem. The illustrations contain no baked-in dialogue or names.

## Rendering and accessibility

Paintings render on a 640 × 360 canvas with nearest-neighbor sampling. Text lives in a separate grid cell; object-fit contain never crops the artwork. Each page has one small animation region and a finite 0.7–1.6 second presentation. There is no continuous loop or full-frame camera pan. Reduced-motion and backgrounding settle the scene immediately. Navigation cancels pending animation and late image callbacks. A separate cancellable completion deadline, armed after all required paintings decode, guarantees the flat final diary pose even if animation-frame delivery stops. Reduced-motion, visibility changes and ordinary completion clear that deadline. Loading does not block text navigation. Canvas data attributes expose page, panel, asset state, and animation region for integration tests.

## Validation

The unit tests retain the original story hash after normalizing only the explicitly revised footsteps title and narration, and preserve save compatibility and check panel selection, animation bounds, state purity, cancellation, reduced motion, loading and backgrounding. Browser evidence replays every page for both avatars on desktop and landscape phones, tests previous/rapid advance/reload resume/skip/replay, checks selected companion names, confirms decoded artwork and distinct compositions, and asserts separate readable image/text/control bounds.

The PR must not merge until browser replay screenshots have been visually inspected, all referenced assets have decoded, and required CI passes for the final head. No rest, fishing, or battle changes are included.

## User feedback validation

The first released scene drew the open diary for the viewer rather than the seated protagonist, and the retort reused a smiling expression. Corrected paintings must be visually inspected at desktop and landscape-phone size for both avatars. Changed artwork uses fresh asset URLs rather than relying on old cached names.

The reported raised diary page matches the intermediate painting. The shipped final source is flat; a stalled RAF on the user's device has not been reproduced. Timing flags alone are not visual proof of completion: browser evidence must capture the actual starting, raised, and flat final pixels, plus reduced motion, interruption and re-entry.

The browser matrix retains all 384 settled page/cast/screen cases. Supplementary interrupted diary sequences target both avatars at desktop 1280×720 and landscape phone 820×366; native-clock diary sequences run for both avatars on all four viewports. Review sheets reuse existing full UI captures and retain native canvas images, avoiding duplicate screenshots. Pull-request jobs allow 25 minutes for this expanded evidence. Main-branch jobs allow 45 minutes because they repeat the complete browser replay against the published site after verifying source parity.
Evidence is uploaded as one artifact per viewport, keeping individual archives within the retrieval limit while retaining every capture.

## Visible page-turn follow-up

The diary now turns one opaque textured leaf through many integer-column poses at the existing 12 fps drawing cap. Its outside edge rises 64 pixels, travels from x516 across the fixed x324 spine to x136, and settles on the left. The final paper mask shows both pages of the new spread; the previous right-only crop hid the new left page. The original hands, binding and table remain fixed. No new artwork, canvas allocations, per-pixel runtime operations, image-wide transforms or transparent ink crossfades are added. All three existing paintings still participate in the decode readiness and completion contract. Duration is 1.6 seconds with short opening/closing holds.

The new actual-source pixel tests check 21 poses for each diary step and both avatars, opaque rendering, protected hand/background pixels, bounded drawing cost, the spine crossing, and an independently composited complete flat final spread. Existing cancellation, reduced-motion, image loading permutations and late-RAF/deadline guards remain covered. The original user-reported freeze is still not reproduced; this change addresses the visibly weak motion, not a proven cause of that report.

`browser-opening-turn-comparison.cjs` records actual native-clock before/after WebM for both avatars at 1280×720, 844×390 and 820×366, with PNG frame sheets and pixel/trajectory reports. The baseline is commit `20141e1`. Local Chromium is unavailable under the current socket restriction, so browser/video verification runs in GitHub CI and requires independent visual review before release. Native Canvas still-frame review confirms the readable rise/cross/settle silhouette but does not establish real browser timing.
