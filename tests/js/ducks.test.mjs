// The rubber ducks: they come from time to time (2 at most), waddle on the
// map without leaving it, look where they go, and a click removes them.
import assert from "node:assert/strict";
import { test } from "node:test";
import { Ducks, duckDir, duckParts } from "../../web/js/ducks.js";

function seeded(seed = 7) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

test("ducks appear from time to time, 2 at most, never during a cinematic", () => {
  const ducks = new Ducks(seeded());
  let now = 0;
  for (; now < 20000; now += 50) ducks.update(now, 0.05, true);
  assert.equal(ducks.list.length, 0, "not right at the start");
  for (; now < 600000; now += 50) {
    ducks.update(now, 0.05, true);
    assert.ok(ducks.list.length <= 2);
    for (const d of ducks.list) {
      assert.ok(d.x >= 0 && d.x <= 24 && d.y >= 0 && d.y <= 24, "stays on the map");
    }
  }
  assert.ok(ducks.made >= 8, `${ducks.made} ducks in 10 minutes`);
  const quiet = new Ducks(seeded());
  for (let t = 0; t < 200000; t += 50) quiet.update(t, 0.05, false);
  assert.equal(quiet.made, 0);
});

test("a duck moves towards its target, looking that way; a click removes it", () => {
  const ducks = new Ducks(seeded(3));
  const d = ducks.spawn(0);
  d.tx = d.x + 3;
  d.ty = d.y;
  d.leaveAt = Infinity;
  const x0 = d.x;
  for (let t = 0; t < 1000; t += 50) ducks.update(t, 0.05, false);
  assert.ok(d.x > x0 + 0.5);
  assert.equal(d.dir, 3);
  assert.ok(ducks.kill(d.id, 1000));
  assert.equal(ducks.kill(d.id, 1000), null, "only once");
  ducks.update(1600, 0.05, false);
  assert.equal(ducks.list.length, 0);
});

test("the duck model turns with its direction", () => {
  assert.equal(duckDir(1, 0.2), 3);
  assert.equal(duckDir(-1, 0), 1);
  assert.equal(duckDir(0, -1), 2);
  for (let dir = 0; dir < 4; dir += 1) {
    const parts = duckParts(dir);
    assert.equal(parts.length, duckParts(0).length);
    for (const p of parts) assert.ok(p.x >= -0.2 && p.x + p.w <= 1.2 && p.y >= -0.2 && p.y + p.d <= 1.2);
  }
  // The beak points where the duck looks.
  const beak = (dir) => duckParts(dir).find((p) => p.c === "#f06a1d");
  assert.ok(beak(0).y > 0.9 && beak(3).x > 0.9 && beak(1).x < 0.1 && beak(2).y < 0.1);
});
