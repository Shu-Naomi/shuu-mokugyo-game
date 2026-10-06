# v223: calm casting water

Naomi's v222 phone report described the water as wriggling and uncomfortable.
Large pixel changes passed the previous visibility checks, but did not establish
that the animation looked natural. This revision prioritizes calm motion.

- Remove displaced strips of the original painted reflection. Trees, rocks and
  fine water texture stay fixed. Only sparse, straight, translucent crests move.
- Crests in the same row share a phase. Their silhouette stays fixed; lake water
  moves by one dot, while river/sea crests fade fully before their loop resets.
- Slow the eight phase cycle: river 3.36 seconds, sea 4.64 seconds, lake 6.08
  seconds, marsh/cave 8.8 seconds. Crossfade neighbouring premultiplied bitmaps
  continuously on the existing 12 fps clock, including the last/first phase.
- Retain the original all-pixel ownership mask, night/evening/weather grading,
  worker and main-thread fallback, hidden-screen and reduced-motion stops.
  Draw two small bitmap layers per water part; no per-frame pixel reads,
  preparation, decoding or randomness.
- HUD v223; updated scenery/worker/service-worker references use 223-1. Cache:
  nushi-tsuri-v223-calm-water-223-1.

Verification checks final 844x354 phone composites, sparse visible movement over
two seconds, low contrast against the static painting, and no large changes
between 12 fps ticks at any phase boundary or loop seam. The previous v222
widespread/high-contrast minimum is replaced because it rewarded the reported
visual defect. All thirteen landscapes still check water-only pixel ownership.

Real browser smoke retains PC1280x720 and touch-phone844x390 casting, resource
conservation, reduced-motion stop/resume and closing the scene. Phone lake and
reef sequences capture ten water crops over more than six seconds for visual
review, alongside the existing scene screenshots.

This change concerns water only. Naomi's complete October 6 endgame and DLC plan
is preserved in the ongoing handover as a future plan. It is not an announcement
that boss progression, crafting, postgame bait or DLC is implemented.

