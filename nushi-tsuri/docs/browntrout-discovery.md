# ブラウントラウト: 峠の池の新しい発見

## Scope

The three previously approved island species are already merged in #325, and bluegill is already #47. This change implements the user's earlier brown trout request as one independent addition, #65. Lake trout remains a separate future addition. No village art, collision, layouts or save schema changes.

Brown trout appears only in 峠の池's middle/deep casting pools. The recommended combination is 活き小魚 + ハリ中 + 深場; 川虫 and ミミズ also work. Existing regional progression gates are unchanged. Available all day; no unimplemented seasonal/time promise.

## Identification and tuning

- Salmo trutta, brown/olive back, pale-ringed red spots, dark spots, orange-edged adipose fin. Not a recolored rainbow trout.
- Ecology checked against https://www.nies.go.jp/biodiversity/invasive/DB/detail/50180.html and https://australian.museum/learn/animals/fishes/brown-trout-salmo-trutta-linnaeus-1758/ .
- Geographic distribution in the fictional game, price, weights, size tiers and fight rhythms are game tuning, not biological measurements.
- Sharp run, turn/head shake and readable rest windows; distinct strength and stamina in the classic mode. Existing battle scheduler and aquarium animation lifecycles retained.

## Asset

`assets/fish-browntrout.png`: original built-in image_gen transparent PNG, 1536×1024, eight views (right profile, 3/4 right, near front right, front, near front left, 3/4 left, left profile, right open mouth). Asset is not resampled/recolored. Frame boxes measured from alpha >100; head anchors follow visible mouth tips. Source generation was followed by an alpha cutout edit; background RGB may contain color but surrounding alpha is zero.

Prompt: detailed natural SFC-style pixel-art brown trout, olive back/golden flank/cream belly, dark and pale-ringed red spots, orange adipose edge, 4×2 atlas in the specified turn order, full fins, no text/water/shadows/background, true alpha. Cutout prompt preserved all fish and removed all background/glow.

## Verification boundaries

`browntrout.test.cjs`: real route collision, ordinary candidate picker with deterministic rolls, both modes, bait consumption, exactly-once catch, catalogue #65, aquarium/boarding/reload, real fight physics with 600ms reaction, 97 rendered headings. DOM tests use explicit canvas/layout doubles except native canvas art test. Browser runner records real desktop/touch inputs with seeded encounter/randomness and screenshots/video. CI runs it alongside the existing Donko workflow to avoid creating another duplicate broad validation job.

Release cache suffix/module URL updates are coordinated with the parallel village release before integration. Do not merge until exact-head browser/CI checks and final screenshot review complete.

## Calibration result

The inherited physics fixture used distance 95, exceeding the recommended clearStream rod's maximum 90. Brown trout now uses reachable deep distance 80. At that distance the initial classic fatigue budget landed successfully but exceeded the 180-second playability target (185/202 sec). Its new-species-only endurance override is 250 active-run ticks, still 2.5× the former shared 100-tick budget. Same 600ms reaction, same seed and same assertions: normal 143.52 sec / giant 151.68 sec, 16/17 warning episodes. Tension remains 21.48/37.68 sec. This is tuning a new species, not weakening a test or changing existing fish.

### Native-browser correction

On head aa9b454, the native browser caught a 45.65cm medium specimen in tension mode but classic mode remained fighting after 216 seconds (retrieval .15036, no JS errors/escape). The initial 33cm DOM fixture was not enough: activating water FX at the same seed increased that case from 143.52 to 216.72 seconds, and a 46.80cm specimen on clearStream took 260.52 seconds even without FX. These are distinct real simulation inputs, not proof of broken pointer input.

Brown trout now has its own burst/recovery rhythm: unchanged dart speed 1.8, shake 1.15 and tempo 1.25, runs 1800–3000ms and pull budgets 2400–4800ms. Strength 2.4 and endurance 250 remain unchanged. Existing species/rhythms, 600ms test reaction and 180/216-second test limits are unchanged. Tests explicitly include 33cm and 46.8cm specimens with active water FX; browser results also retain specimen and failure physics details. Final native/mobile verification remains required.
