# Natural fish swimming, v252-30

This is a cosmetic change to the shared fish painter and aquarium swimming phase.
Catch probabilities, battles, controls, growth, mutations, identities and saved
state are unchanged. PR298's hidden/covered suspension, 30 Hz home paint cap and
exact request deduplication remain in place.

## Movement

- Pet-tank and inspection tails use continuous time rather than integer frames.
- All 60 fish have an explicit profile in seven swimming families, with selected
  individual amplitude/wavelength overrides and existing species gait speeds.
  Long-bodied fish propagate a longer wave, swift fish concentrate it near the
  tail, hovering fish are restrained, and bottom dwellers ease pushes into glides.
  These are art-direction choices for the elevated camera, not a biology model.
- The 12 aquarium variants inherit their parent species' motion.
- Swimming continues through yaw turns. The original frontal drawings keep
  their volume; the code never collapses a side-view image to a zero-width plane.
- The face collar and lip are fixed. The shared mouth/hook projection is unchanged.
  Exact turn endpoints match the cruising image, including its mirrored left side.
- There is one original opaque body, with no whole-fish alpha crossfades or
  overlapping resampled strips. The source PNG artwork is unchanged.

## Cost bounds

The renderer caches phase-independent source rasters, at most 48, and reuses an
old pixel buffer on eviction. Each destination context has one reusable output.
Continuous phases do not create new cache entries. There is no per-frame readback
from the destination canvas, and the original artwork resolution is retained.

`fish-swimming-evidence.cjs` compares the renderer with exact baseline commit
`a67f76b6e7072478a098d25ba3200fff9b39f4d4`, using the same decoded PNGs and an
8-second nine-fish 30-sample/second trace. Measurements are renderer diagnostics,
not physical-phone heat, battery, or full-game frame-rate measurements. Allocation
counts instrument ImageData calls on the destination contexts, not all browser
allocations. The browser trace also compares the same exact old renderer.

## Verification

`fish-swimming-v252-30.test.cjs` covers all 72 originals across headings and phases,
unchanged pixel counts/width, unclipped silhouettes, fixed lip patches, periodic
phase wraps, continuous elapsed-time samples at 10/20/30/60/120 Hz, exact endpoint
continuity, and bounded cache/output reuse. Existing palette, hook, moray, growth,
image loading, visibility, reduced-motion and gameplay tests remain applicable.

The dedicated browser workflow checks the native five-fish tank and enlarged
inspection through full turns on desktop and landscape touch/DPR 3. It preserves
clips, screenshots, contact sheets and measured traces. Browser checks are only
complete when that workflow has passed and its actual images have been reviewed.
The post-merge source check includes the new `fish-motion.js` dependency before
running the same browser checks against the published game.
