# v222: visible casting water

The v221 water animation changed pixels at native resolution, but Naomi reported
that movement was hard to see on her phone. This update makes the final landscape
move clearly after its landscape-phone crop and downscale.

- Lake ripples sway, river crests drift downstream, sea crests are wider, and
  marsh/cave water has a quieter cadence. Foreground crests are wider than distant
  ones. Eight phases run on the existing 12 fps scenery timer.
- Small water reflections move using the already graded source painting; night,
  evening and indoor cave lighting are preserved. There is no outdoor sunlight
  added to the cave, and no new raster art.
- At most 200 anchors per water part are spread across its whole depth instead of
  spending the budget on the first rows. This matters when a wide phone crops a
  taller painting.
- Eight small dot-grid frames are compiled before playback. A dot is included
  only if every native pixel it covers belongs to the same water part. Reflected
  source pixels must also belong to that part. Banks, rocks and piers are masked
  out. The static painting, actors, float and input layers remain separate.
- Playback draws one small bitmap per water part. Preparation works on the
  scenery worker and the existing main-thread fallback; worker frames transfer
  as ImageBitmaps. Pixel reads, color grading and phase generation happen only
  during preparation. The existing hidden-screen and reduced-motion stops apply.
- HUD v222; HTML, worker imports and scenery script references use 222-1. The
  service-worker cache is `nushi-tsuri-v222-visible-water-222-1`.

Verification includes the existing all-13-background water ownership checks,
the phone-size final-composite test in `cast-water-v222.test.cjs`, and real PC and
touch-phone screenshots compared across time in `browser-v221.water.cjs`.
Browser checks also retain casting controls, inventory/time/HP conservation,
reduced-motion stop/resume and animation stopping after the screen closes.

Fish remain at 33 species. This release does not implement the final legendary
nushi, advanced-tournament tickets, giant hooks or the postgame universal worm.
