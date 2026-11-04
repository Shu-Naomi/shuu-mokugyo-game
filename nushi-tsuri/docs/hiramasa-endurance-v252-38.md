# Hiramasa endurance calibration (v252-38)

## Failure and cause

After v252-37, the browser's maximum-size hiramasa safe-play check repeatedly remained in `fight` at its unchanged 180-second limit. The issue occurred on both desktop and a small touchscreen. One earlier unchanged retry passed; that was not sufficient evidence of an environmental problem.

The browser seeds its shared random generator after `beginFishing` creates 46 water particles. Particle wrapping and wakes later consume the same generator as fish mood selection. Therefore a fixed gameplay seed alone does not fix the encounter's later random sequence. The older pure playability fixture suppressed water effects, so it missed this source of variability.

A controlled full-logic replay initializes particles with an independent seed, then restores gameplay seed 301. It retains water-effect updates and all gameplay/input logic, suppressing only drawing. With a maximum-size hiramasa, Sea King rod and 600 ms reactions:

| Particle seed | Previous 520 active-run ticks | New 400 active-run ticks |
| --- | ---: | ---: |
| 11 | 155.28 s | 148.80 s |
| 22 | 191.88 s | 144.24 s |
| 33 | 164.76 s | 130.68 s |

All six replays landed without input during unsafe running ticks or script errors. The failing seed 22 replay was confirmed again with normal DOM-label updates: same 191.88 seconds and final RNG. At 180 seconds it still had 19.37 meters remaining, despite already being fully fatigued. This is a gameplay duration outlier, not merely a late landing animation.

## Scoped correction

Only hiramasa's endurance changes to 400 active-run ticks, still four times the original universal 100. The fatigue curve, maximum fatigue effect, fish strength, payout, timing cues, hook wear, rods, other species and gauge mode are unchanged. These are game calibration values, not biological claims or a guarantee covering every random sequence.

The regression retains water effects with fixed particle seed 22 and requires landing below the original 180-second limit. Browser checks retain their 180-second limit and real input. They now write per-fish phase/progress, RNG state/count, endurance, hook state, input edges and timing to JSON before asserting, plus a cutoff screenshot if needed. This preserves evidence for future failures rather than relying on retries.

Release badge, service worker cache/registration and fishing-duel asset are 252-38. Opening assets remain 252-37; rest and building integrations are preserved.
