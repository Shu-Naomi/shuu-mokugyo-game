// Expected counts independent of the game registry, shared by old-save and catalogue checks.
const ordinaryFresh = 40;
const ordinarySea = 33;
const legendary = 7;
const ordinary = ordinaryFresh + ordinarySea;

module.exports = { ordinaryFresh, ordinarySea, ordinary, total: ordinary + legendary };
