# Fish-market sign repair, v252-68

The navy sign left/below SAM had two forked ends. A generated localized sign edit gives it a rounded left head, a small light eye, and one right tail.

The approved original `assets/village-reference-pilot.png` stays byte-identical. The production build selects the separate `assets/village-fishmarket-sign-v252-68.png`. Only the rectangle x=1025..1067, y=597..611 differs in decoded pixels. No geometry, collision, facility, NPC, fishing or save code changed. The content-addressed map, generated entry and precache manifest update together; the release badge and worker use v252-68.

Built-in image generation was used on an enlarged crop with the instruction to replace only the left fork with a rounded head/eye, retaining the navy body, right tail, beige sign, wooden frame and pixel grid. Only the sign interior from the selected result was composited at native resolution with nearest-neighbor sampling. A first whole-map generation was rejected because it retained the ambiguous silhouette.

Focused automated verification checks every pixel outside the 43 x 15 rectangle, retains original-reference provenance, checks source rendering, and checks deterministic production generation. The browser check uses 844 x 390 and 667 x 375 mobile emulation with an explicit fish-market position fixture, not actual-device testing or a walking test. Screenshots require visual review before merge.
