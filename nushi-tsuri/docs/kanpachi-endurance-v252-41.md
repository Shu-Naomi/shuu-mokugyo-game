# Kanpachi endurance calibration

A post-deployment browser run caught a separate maximum-size kanpachi duration outlier: at 180 seconds it was still fighting with 8.08m remaining, 624 active-run ticks, and zero hook wear. Hiramasa landed in 128.88 seconds in the same run. This was not a Pages deployment mismatch, and that failed gameplay job was not blindly retried.

## Controlled reproduction

Using the actual merged v252-38 code, gameplay seed 301, maximum specimen size (169.99cm), Sea King rod, 600ms reactions, and real water-effect updates, a separately seeded initial particle state reproduces a slow safe fight. Particle seed 34 is the first failing case among 34 sampled particle seeds. Full DOM-label updates reproduce the same 188.04 seconds, every recorded tick, and final RNG state.

| Particle seed | Previous 446 run ticks | Candidate 380 run ticks |
| --- | ---: | ---: |
| 11 | 148.80 s | 140.16 s |
| 22 | 157.56 s | 138.72 s |
| 33 | 157.44 s | 150.60 s |
| 34 | 188.04 s | 131.64 s |

All cases landed with no wrong-running inputs, no hook wear, and no script errors. The 380/34 result was confirmed with normal DOM-label updates, not just the faster diagnostic renderer. A lower 360 candidate was also tested but is a larger adjustment than these results require. These sampled outcomes are not a universal guarantee for every random sequence.

## Scoped change and safeguards

Only kanpachi endurance changes from 446 to 380 active-run ticks, a 14.8% reduction while retaining 3.8 times the original universal 100 ticks. Hiramasa remains 400. Other species, gauge mode, fatigue curve, maximum fatigue effect, fish strength/payout, timing cues, hook wear and equipment are unchanged.

The regression uses the existing retained-water-effects fixture with particle seed 34 and keeps the original 180-second limit. Browser evidence now saves initial water-effect state alongside its RNG, input and phase trace, so future timing outliers can be replayed more precisely. It does not change or reseed the browser's live particle state.

Release 252-41 is reserved after the building and page-turn fixes. The final release/cache/asset tokens will be reconciled with those preceding changes before readiness; this draft must not be released with the old fishing-duel cache token.
