# Nushi hook wear and species endurance

Only the nushi battle branch changes. Gauge battle physics, fish encounters, rewards, and saves are unchanged.

## Endurance tuning

Previously all fish reached maximum fatigue after 100 active run ticks (12 seconds of running). Each supported species now has a deterministic endurance budget: behavior-group base plus 40 times its existing strength. The first 20% is a fresh reserve, followed by gradual fatigue. Examples: medaka 170 ticks (20.4 seconds), yamame 272 (32.64), koi 416 (49.92), hiramasa 520 (62.4), starNushi 660 (79.2). These are gameplay values, not biological estimates or promised fight lengths. Only running consumes endurance; waiting in slack and pausing cannot tire a fish. Existing maximum force and speed reductions stay unchanged.

## Hook wear

Gill-wash leaps retain their separate existing tension mechanic; this change applies to ordinary underwater resistance episodes.

The existing visible head-shake warning and 720 ms reaction margin remain. Continued pulling after the margin adds one persistent wear charge per pull/run episode, weighted by species shake strength and reduced by rod control (capped at 2). Re-pressing cannot reset the episode or wear. Several unsafe episodes can dislodge the hook, even if line tension was reduced between episodes. A danger state must precede hook loss in an earlier episode. Holding continuously can still break the line through the existing tension system.

The cue says 安定 below .3, 緩みかけ from .3, 危険 from .7. Timely release followed by an unforced run recovers .001 per active run tick only when that episode was not charged. Recovery is intentionally slow; idle slack is not a reset. Practice cannot lose the hook. Each new battle starts clean.

Hook loss uses the existing escape animation with a distinct ピンッ……針が外れた！ caption instead of claiming the line broke.

## Checks

Focused tests cover the full species table, fresh reserve, run-only exhaustion, reaction margin, cumulative episodes, danger before loss, slow recovery, rod/species modifiers, practice and runtime cues. Existing seeded real-battle simulations exercise successful delayed responses, bosses, specimen sizes and held-input failure. Browser evidence captures three hook states and hook escape on desktop and mobile. Final test and CI results belong in the PR rather than being presumed here.
