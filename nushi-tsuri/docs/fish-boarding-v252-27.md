# Free fish boarding at Asual's pet shop

## Player-facing behavior

- The existing shop gains a **魚のお預かり** tab, separate from selling fish.
- Boarding and retrieval cost 0 yen. Each species has two boarding slots, shared by ordinary and rare-color individuals. Buri growth-stage names are still one species.
- The selected fish keeps its UID, nickname, size, sex, generation, mutation, experience, care history, and recorded growth stages. Its record remains visible in the notebook with an **お預かり中** label.
- Growth, food-related decay, water decay, and breeding are paused while boarded. Returning after many days does not apply a backlog. A ration fed before boarding resumes as one ration, not one per skipped day.
- Retrieval needs an unlocked tank with compatible water and room, including egg reservations. Existing shared tank-water rules apply upon return.
- Legendary fish retain their one-time acquisition claim and can return only to their matching legendary tank. Eggs remain in their original tank and cannot be boarded. A fish currently in a judging contest must finish before boarding.

## Save and transfer safety

The mutation schema remains version 6. `petLife.boardingVersion: 1` and `petLife.boarded: []` are additive fields; old saves start with an empty roster. Active and boarded fish share normalization, global UID deduplication, legendary-species uniqueness, and UID allocation. Normalization enforces the two-per-species cap, preserves mutation decisions without redrawing, and repairs malformed pause clocks without catch-up.

A transfer moves the existing fish record, never creates a new fish. It runs in one synchronous transaction with a snapshot of pet and notebook state before any day synchronization. A rejected transfer, failed save, thrown persistence callback, or non-true persistence result restores the previous state. The UI calls the dedicated save-only callback once, and avoids resynchronizing immediately after failure. A successful transfer clears relevant breeding-pair progress and repairs the active selection.

All four modified pet modules have matching `?v=252-27` resource URLs and a new service-worker cache key. The village renewal is not part of this branch.

## Verification

Final local validation on 2026-11-03: **837/837** full regression tests passed (exit 0). The release-focused command also passed **90/90**, including **28** new boarding tests. Independent save/UID review, JavaScript syntax, YAML parsing, and whitespace checks passed.

- `pet-boarding.test.cjs`: migration, identity roundtrip, rare-color cap, long pause, ration/sentinel preservation, malformed pause clocks, full/incompatible/egg-reserved/legend tanks, exact rollback, one save per transfer, repeated requests, global UID safety, legend claims, eggs and contest restrictions, malformed raw saves, cache versions.
- `pet-boarding-ui.test.cjs`: confirmed UID transfers, cancellation/navigation, repeated/stale controls, storage failure and retry, notebook display and editing, identity provenance across reload.
- `pet-boarding-fuzz.test.cjs`: fixed-seed 2,000-operation sequence covering acquisition, boarding, retrieval, reloading, care, synchronization, and rehoming; checks frozen boarding, capacity, uniqueness, and rollback invariants.
- `browser-fish-boarding-v252-27.cjs`: desktop 1280×720 and landscape 844×390 / 820×366, screenshots plus interaction, reload, error and layout checks.
- `fish-boarding-public-source-v252-27.cjs`: checks published source hashes against the release checkout, intended only after authorized publication.

Local real-browser execution is currently blocked before a page opens by the runtime's Chromium socket permission denial. Do not describe browser screenshots or browser CI as passed until the workflow has run in a permitted environment. DOM, core, and regression results are reported separately.
