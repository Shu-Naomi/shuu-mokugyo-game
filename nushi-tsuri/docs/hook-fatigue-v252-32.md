# Nushi hook wear and species endurance

Only the nushi battle branch changes. Gauge battle physics, fish encounters, rewards, and saves are unchanged.

## Endurance tuning

Previously all fish reached maximum fatigue after 100 active run ticks (12 seconds of running). Each supported species now has a deterministic endurance budget: behavior-group base plus 40 times its existing strength (25 for bosses). The first 20% is a fresh reserve, followed by gradual fatigue. Examples: medaka 170 ticks (20.4 seconds), yamame 272 (32.64), koi 416 (49.92), hiramasa 520 (62.4), starNushi 210 (25.2). These are gameplay values, not biological estimates or promised fight lengths. Boss endurance uses a smaller group base because their high force already reduces reel progress. In the same maximum-size starNushi seed-301 simulation with a 600 ms reaction, old fatigue lands in 98.52 seconds, the rejected first 660-tick proposal took 481.92 seconds, and the final 210-tick candidate takes 233.76 seconds. A 300-tick trial still produced a 387-second outlier. The final 210-tick budget lands the three giant final-boss seeds in 233.76, 246.00 and 156.12 seconds; a five-minute guard covers them. Changing fatigue also changes phase timing, so encounter duration is not monotonic in this budget. These are simulation outcomes, not a promised duration for every player.

Only running consumes endurance; waiting in slack and pausing cannot tire a fish. Existing maximum force and speed reductions stay unchanged.

## Hook wear

Gill-wash leaps retain their separate existing tension mechanic; this change applies to ordinary underwater resistance episodes.

The existing visible head-shake warning and 720 ms reaction margin remain. Continued pulling after the margin adds one persistent wear charge per pull/run episode, weighted by species shake strength and reduced by rod control (capped at 2). Re-pressing cannot reset the episode or wear. Several unsafe episodes can dislodge the hook, even if line tension was reduced between episodes. A danger state must precede hook loss in an earlier episode. Holding continuously can still break the line through the existing tension system.

The cue says 安定 below .3, 緩みかけ from .3, 危険 from .7. Timely release followed by an unforced run recovers .001 per active run tick only when that episode was not charged. Recovery is intentionally slow; idle slack is not a reset. Practice cannot lose the hook. Each new battle starts clean.

Hook loss uses the existing escape animation with a distinct ピンッ……針が外れた！ caption instead of claiming the line broke.

## Checks

Focused tests cover the full species table, fresh reserve, run-only exhaustion, reaction margin, cumulative episodes, danger before loss, slow recovery, rod/species modifiers, practice and runtime cues. Existing seeded real-battle simulations exercise successful delayed responses, bosses, specimen sizes and held-input failure. Browser evidence captures three hook states and hook escape on desktop and mobile. Final test and CI results belong in the PR rather than being presumed here.
