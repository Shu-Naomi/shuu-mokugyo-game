# Village production entry (252-67, pending release)

This draft currently incorporates baseline main `09025ae58547709d99b0e604df9e789570da1858` (brown trout).
Village release 252-67 follows the verified public 252-65 baseline. On 2026-11-17 the coordinator confirmed no brown-trout gameplay correction is needed: public/main core files match, and the 740x360, 45.65cm, 600ms-input diagnostic caught the fish in 165.36 seconds. The earlier 216-second failure was not reproduced and its cause remains unidentified. Diagnostic PR #339 (run 43998909519, artifact 14289804974) is evidence only and must not be merged as a dependency. No 252-66 integration is required.
It is not approved for public deployment until exact-head CI and release review finish.

## Editing and generating

- Edit the game document in `tools/templates/game-index.html`.
- Edit external JS/CSS normally. Run `node tools/build-village-production.cjs` from this directory afterwards.
- Commit the generated `index.html`, `village-precache-252-67.js`, and hash-named reference PNG together with their inputs.
- The production build pins every local script/stylesheet via SRI and content query, and pins the map bytes. The gate defers the game runtime until verification and a save lock succeed.
- `village-save-safety.yml` rebuilds and rejects a generated-output difference. Do not edit generated HTML directly.
- A future release must update the HUD/template, builder worker URL, worker cache suffix and manifest filename consistently. Contract tests check this.

## Saves and old clients

The new release uses separate generation records for slots 1 and 2. Original legacy JSON is preserved, not overwritten. A changed legacy save stops the new runtime; the recovery UI exports both versions and requires an explicit choice followed by reload. A lifetime Web Lock prevents two new clients from writing together. Neither successful tests nor a version badge imply old client writes can be ignored.

New worker registration happens only after verified runtime completion. The new worker neither calls skipWaiting/clients.claim nor deletes old caches. Existing old clients keep their worker until naturally closed. The new worker only stores canonical game navigations into its index fallback, not arbitrary same-origin HTML.

The old worker itself can cache a newly fetched canonical game document before the new worker activates. Therefore old-cache retention is **not** a promise that historical HTML stays byte-identical. A mixed dependency/map is rejected before save import; both legacy originals and generation records stay intact. Network loss can require reconnecting before first successful complete installation.

## Verification scope

- `game-harness.cjs` executes the editable runtime source with DOM doubles. It does not prove production gate/cache behavior.
- Production browser safety runs the actual generated index, including multiple tabs, recovery, suspension, slot creation and reload.
- Native worker upgrade uses the exact prior 252-65 worker fixture with current asset tree, then actual new worker. It is not a claim that every baseline asset is byte-for-byte historical.
- Preview-negative and historic coordinate life/audio tests are explicitly source-template baselines. Current production village/facilities/fishing have separately identified browser coverage.
- CI mobile emulation is not physical-device heat/performance testing.

Before merge: verify required checks and unchanged runtime evidence, review current village facilities and exit readability, and report unverified physical-device limits. Runtime head f68ce3 passed all 32 workflows (29 success, 3 skips); the subsequent change to this document does not alter runtime, tests, configuration or dependencies. Three-size visual review retained the reference art/colors. Riao TCG remains a preparation notice, not a finished card game. Physical-device heat/performance remains unmeasured. No cache clearing or legacy save deletion is a migration step.
