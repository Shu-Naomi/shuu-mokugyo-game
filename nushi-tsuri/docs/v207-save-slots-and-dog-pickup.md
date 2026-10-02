# v207: independent save slots and automatic dog pickup

The title screen offers two adventures. Existing progress remains in slot 1 under its original storage key; slot 2 has a separate key. Each adventure keeps its own inventory, catches, pets, clock, equipment and journal. The HUD identifies the active slot. The field menu saves progress before returning to the selection screen.

Previewing a slot or changing the title-screen companion cannot save or overwrite data. Switching adventures reloads the game so its existing normalization and migration run independently. The active slot remains fixed for the lifetime of a page, even when another tab changes the last-played preference. Invalid or unavailable stored data is protected from replacement. A failed save keeps the current game open.

When a companion finishes discovering a hidden gathering point, its item goes directly into the appropriate bag. The completion message names the dog, item and quantity. The point is marked harvested immediately, preventing repeat pickup after a second callback or reload. Ordinary manual gathering and emergency bait rescue retain their behavior.

Validation: all 269 deterministic regression tests pass, including 12 new tests covering independent adventures, legacy data preservation, navigation, corrupt data, storage failures, actual digging timers and duplicate rewards. Real Chromium desktop/mobile coverage was extended for slot switching and dog pickup. That browser suite is prepared for CI; the local environment has no Chromium executable.
