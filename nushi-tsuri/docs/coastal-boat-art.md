# Coastal boat fishing artwork (draft #371 follow-up)

Source baseline: 4498dc7805c49929b38a4e4b93bb17c02426b669
(running-draft tree digest 9ef3daf0bacba59dc810d209e1d4df30317f17dc99df0924afbbd10d934d6ae0).
Keep its five shore/island asset pairs unchanged.

- Coastal fishing initiated afloat selects a distinct open-water cast backdrop and
  underwater coastal shelf. The selected hull (canoe or tarai) is drawn under the
  existing angler using the same pixel coordinates in preparation and casting.
- Artwork context stays with the battle, including the prep-to-cast rebuild.
  Reef/sand encounter IDs, depth, tackle and catch record locale are not changed.
  Dry shore and ferry island points still select their own painted scenes.
- The two 1024×576 WebPs are included for offline use; runtime uses the existing
  scenery compositor and reduced-motion behavior, not a new animation loop.
- Browser CI captures cast and fight at 844×390 CSS (DPR 1.875, touch). This is
  not a measurement of physical Android display, device heat, or installed PWA
  upgrade behavior. Do not publish from this draft without release verification.
