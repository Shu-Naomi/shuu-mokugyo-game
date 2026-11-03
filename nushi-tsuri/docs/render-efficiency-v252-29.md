# Rendering efficiency, v252-29

This change targets unnecessary rendering. It does not establish a measured
phone-temperature or battery improvement.

## Scope

- Home dogs and the display aquarium paint at most 30 times per second during
  their animation loops. Their existing elapsed-time movement updates and stall
  clamps remain unchanged. This is a visual-cadence limit, not a gameplay limit.
- The display aquarium stops when the opaque settings panel fully covers its
  rectangle. It resumes after closing settings or resizing, without advancing
  hidden time. A wide layout with the tank visible beside settings keeps moving.
- Dog-care drawing and the companion-petting animation skip hidden documents.
  Dog-care timer decisions, throws, rewards and saved state remain unchanged.
- World scenery stops underneath the full-screen home and fishing scenes.
  Nushi water stops the obsolete underwater layers it replaces. Lure/gauge
  travel keeps its transparent source layers animated for compositing.
- Animation visibility is separate from scene cache lifetime, so suspension
  does not discard prepared scenery. Inset/translucent conversations keep their
  background effects.
- Identical fish raster requests share the already painted frame. Incomplete
  image loads are not memoized, and new frames, appearance/yaw, image variants,
  and dimensions invalidate the result. Immediate battle-tick sprite and hook
  updates remain together.

Artwork, source resolution, fishing rules, probabilities, controls, saves,
audio, cache policy and offline asset coverage are unchanged. Only release
identifiers are updated together for the changed scenery module and its worker.

## Verification

The focused deterministic suite covers 60/120 Hz presentation clocks, equal
elapsed motion, hidden/covered/resume behavior, exact raster deduplication,
image loading, scene-cache retention, and nushi versus lure source visibility.
The dedicated browser workflow runs desktop and touch/mobile viewport checks
and saves screenshots. Browser execution and screenshots must be verified from
that workflow before treating the branch as ready to merge.

Physical-device heat has not been measured. Stop a device test if it becomes
uncomfortably hot; a long thermal stress test is not part of this change.
