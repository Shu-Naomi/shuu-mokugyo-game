const { test } = require('node:test');
const assert = require('node:assert/strict');
const Mountain = require('../mountain-region.js');
const Coast = require('../coast-voyage.js');
const Life = require('../world-life.js');

// Foot positions traced on the background independently of the collision polygons.
// Use the same swept cardinal movement as the direction buttons, in both directions.
function walkBothWays(points, move) {
  for (const route of [points, [...points].reverse()]) {
    let [x, y] = route[0];
    for (const [nextX, nextY] of route.slice(1)) {
      assert.ok(x === nextX || y === nextY, 'one cardinal leg');
      const direction = x < nextX ? 'right' : x > nextX ? 'left' : y < nextY ? 'down' : 'up';
      const distance = Math.abs(nextX - x) + Math.abs(nextY - y);
      for (let remaining = distance; remaining > 0; remaining -= 4) {
        const stride = Math.min(remaining, 4);
        const next = move(x, y, direction, stride);
        assert.equal(Math.abs(next.x - x) + Math.abs(next.y - y), stride,
          'blocked at (' + x + ', ' + y + ') heading ' + direction);
        ({ x, y } = next);
      }
      assert.deepEqual([x, y], [nextX, nextY]);
    }
  }
}

const wetlandMove = (x, y, direction, stride) => Mountain.moveTarget(x, y, direction, stride, 'wetland');

test('wetland bridge reaches the painted fishing point on the east bank', () => {
  walkBothWays([[124,57],[134,57],[134,59],[138,59],[138,61],[142,61],
    [142,63],[146,63],[146,65],[150,65],[150,67],[153,67]], wetlandMove);
  assert.equal(Mountain.fishingWater(153,67,'down','wetland')?.type, 'wetMarsh');
  for (const [x,y] of [[143,57],[145,70],[162,71]]) {
    assert.equal(Mountain.waterType(x,y,'wetland'), 'wetMarsh');
    assert.equal(Mountain.walkable(x,y,'wetland'), false);
  }
});

test('wetland north fork, eastern bend and southwest fishing bank allow a return walk', () => {
  for (const line of [
    [[215,21],[215,26],[216,26],[216,31]],
    [[231,63],[231,71],[231,82]],
    [[138,106],[138,108],[142,108],[142,111],[145,111],[145,113]]
  ]) walkBothWays(line, wetlandMove);
  assert.equal(Mountain.walkable(224,70,'wetland'), false);
  assert.equal(Mountain.walkable(138,100,'wetland'), false);
});

for (const [id, bank, tip, y, beyond] of [['sand',115,107,77,104], ['reef',88,96,92,99]]) {
  test(id + ' island dock boards carry feet to the tip and keep boats in water', () => {
    walkBothWays([[bank,y],[tip,y]], (x,y,d,n) => Life.moveTarget(x,y,d,n,Coast.shore));
    assert.equal(Coast.water(tip,y), false);
    assert.equal(Coast.near({x:tip,y},Coast.docks[id].land,Coast.docks[id].radius), true);
    for (const [x,py] of [[beyond,y],[tip,y-4],[tip,y+4]]) {
      assert.equal(Coast.shore(x,py), false);
      assert.equal(Coast.water(x,py), true);
    }
  });
}
