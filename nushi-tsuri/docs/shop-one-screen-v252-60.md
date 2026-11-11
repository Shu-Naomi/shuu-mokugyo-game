# Boarding and purchase clarity, v252-60

## Scope

Asual's fish boarding uses a fixed two-column screen rather than stacking long explanations, species buttons, and every fish. The left side holds the shop selector, deposit/return switch, species filter (including the species' shared boarding count), and rules. The right side pages through two fish on short/mobile screens or four on larger screens. Selected fish, explicit destination, free confirmation, and cancellation stay in that same screen. Rules replace the right-hand panel temporarily and return without losing the pending fish. No fish is moved by selecting, filtering, paging, opening rules, or cancelling.

Sam's list distinguishes the number per set from the selected number of sets. For example, corn is one set of three, and 20 sets shows 60 items and a total of 5,200 yen. Presets say 1/5/10 sets rather than suggesting a multiplier. The original purchase handlers and prices are unchanged.

## Save safety and release

No save schema or transaction code changed. Boarding continues to use the original UID-specific reversible transfer and persistence rollback. Fish identity, capacity limits, compatible tanks, money, and saved quantities are covered by existing and new tests. Modified scripts and styles have matching versioned HTML and service-worker references. This branch does not include the separate village art draft.

## Verification

`pet-boarding-ui.test.cjs` covers paging/filtering/cancel/help without save changes, plus existing transfers, repeated clicks, invalid destinations, save failure/retry, names, and reload. `sam-purchase-quantity.test.cjs` covers set counts from 1 to 100, displayed totals and actual purchased units, insufficient funds, details cancellation, and save/reopen.

`browser-fish-boarding-v252-27.cjs` now asserts that boarding content and all active controls fit without scroll on desktop and landscape phones, while keeping the existing behavioral checks. `browser-sam-quantity-evidence.cjs` checks purchase labels, balances, and screenshots on those sizes. Local Chromium startup is blocked by this executor's socket policy, so actual layout evidence must come from CI and must be reviewed before merge.
