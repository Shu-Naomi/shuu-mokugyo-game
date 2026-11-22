# Sam-area bounded palette pilot

Review only. No production file, artwork, camera, layout, collision, input or save format is changed. This experiment is not loaded by the game. Do not merge or roll it out before visual review.

Based on main `b0f8e02`, after inspecting draft #324 at `d4f03dd`. The older rendering investigation is separate. The accepted mockup is a palette/density direction, not replacement game art. The original Sam building design, signs and object coordinates remain the source.

## What this first pilot does

- Transforms colors only inside a polygon covering Sam and a small adjoining path.
- Uses 46 muted earth/foliage/slate/water/accent colors, with no blur, sharpening, dithering, coordinate resampling or zoom change.
- Makes no attempt to regenerate a building or match the mockup's changed architecture.
- Applies the preview only to the already-painted Canvas layers, then restores every saved pixel. It is a reversible screenshot experiment, not an active production renderer or final asset.

## Limits that matter

The current 1672×941 source contains anti-aliased curved edges and texture. CSS and Canvas already use nearest-neighbor/pixelated rendering. A palette mapping can remove intermediate colors but cannot produce art-directed pixel clusters or unify character/background density. It can also merge nearby tones and lose detail. These images must be reviewed before any further art work. A bounded preview has a visible palette transition at its edge; this is not a finished join.

No claim is made that this is a finished pixel-art redraw or that non-integer scaling artifacts have been fixed. At 640×360/DPR1 the existing view shrinks source pixels; those lost columns are not restored by this pilot. Touch/viewport/DPR emulation is Chromium, not a physical phone, and says nothing about Safari, handset battery or temperature.

## Evidence and checks

The dedicated workflow records original/pilot/restored images at exactly the same camera, position, source size and device scale. Side-by-side sheets copy native screenshots without resizing. The unchanged original files remain the baseline.

Screens: 844×390/DPR1, 820×366/DPR1.875, 640×360/DPR1. Each captures Sam approach and doorway. It requires exact full-screen PNG restoration after disabling the experiment, with no tolerance or mask, plus exact Canvas restoration. It also verifies touch movement against collision results, three shop open/close cycles, saved state and reload using synthetic test data.

Local Chromium could not start because the execution container disallows its required socket operation, including through the supported escalation. Therefore local Node tests and CI browser results must be reported separately. A workflow being created or running is not evidence of success. Consult each `result.json` and the workflow conclusion.
