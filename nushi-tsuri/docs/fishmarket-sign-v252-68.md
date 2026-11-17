# Fish-market sign repair, v252-68

The navy sign left/below SAM had two forked ends. A generated localized sign edit gives it a rounded left head, a small light eye, and one right tail.

The approved original `assets/village-reference-pilot.png` stays byte-identical. The production build selects the separate `assets/village-fishmarket-sign-v252-68.png`. Only the rectangle x=1025..1067, y=597..611 differs in decoded pixels. No geometry, collision, facility, NPC, fishing or save code changed. The content-addressed map, generated entry and precache manifest update together; the release badge and worker use v252-68.

Built-in image generation was used on an enlarged crop with the instruction to replace only the left fork with a rounded head/eye, retaining the navy body, right tail, beige sign, wooden frame and pixel grid. Only the sign interior from the selected result was composited at native resolution with nearest-neighbor sampling. A first whole-map generation was rejected because it retained the ambiguous silhouette.

Focused automated verification checks every pixel outside the 43 x 15 rectangle, retains original-reference provenance, checks source rendering, and checks deterministic production generation. The browser check uses 844 x 390 and 667 x 375 mobile emulation with an explicit fish-market position fixture, not actual-device testing or a walking test. Screenshots require visual review before merge.

## Water-test diagnosis (2026-11-17)

Regression run 44116913604 failed the unchanged calm-water upper bound. Its original failing pair and number were not retained, so the exact original cause remains unproven.

Fixed base c7c81c5 / head a56e951 comparison run 44120516841 passed all three mobile lake observations on both revisions. Evening change: base 0.208–0.362%, head 0.149–0.300%. Images revealed a forage toast within the measured surface.

Controlled run 44123476350 froze water through existing reduced-motion and measured the identical toast naturally expiring. On BOTH base and head, this alone changed 5.11027% of pixels, above the unchanged 3.5% upper bound. After the toast expired and water resumed, evening water passed at 0.16965% (base) and 0.15585% (head). This reproduces a pre-existing measurement confound, not proof of the original failure's exact cause.

The browser test now waits for this unrelated notice before taking its first water sample. No masking, threshold relaxation, or gameplay/rendering change. Measurements precede assertion and failing pairs are retained in evidence logs. Trials were fixed, not repeated until success.
