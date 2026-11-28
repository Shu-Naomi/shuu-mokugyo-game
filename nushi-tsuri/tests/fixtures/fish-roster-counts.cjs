// Independent expectations for the public catalogue. Aquarium-only mutations
// are deliberately absent from the species and ordinary-fish totals.
const ordinaryFresh = 39;
const ordinarySea = 32;
const legendary = 6;
const ordinary = ordinaryFresh + ordinarySea;

module.exports = {ordinaryFresh, ordinarySea, ordinary, total: ordinary + legendary};
