// Drawing order of interpenetrating boxes: the trees (their trunk used to be
// drawn over the leaves) and the general rule behind the fix.
import assert from "node:assert/strict";
import { test } from "node:test";
import { orderBoxes, pushApart } from "../../web/js/depth.js";
import { SKINS, npcParts, propParts } from "../../web/js/scene.js";

const ROTATIONS = [0, 1, 2, 3].map((rot) => (x, y) => {
  let dx = x - 12;
  let dy = y - 12;
  for (let i = 0; i < rot; i += 1) [dx, dy] = [-dy, dx];
  return [dx + 12, dy + 12];
});
const box = (x, y, z, w, d, h, name) => ({ x, y, z, w, d, h, name });

test("a trunk entering the leaves is drawn before them, from every side", () => {
  // The old geometry of the decoration trees: the trunk went 0.3 into the
  // canopy, whose centre is offset — the trunk was drawn over the leaves.
  const trunk = box(10.35, 10.35, 0, 0.3, 0.3, 1.8, "trunk");
  const leaves = box(9.6, 9.6, 1.5, 1.4, 1.4, 0.9, "leaves");
  const top = box(9.9, 9.9, 2.4, 0.8, 0.8, 0.5, "top");
  for (const rotate of ROTATIONS) {
    const names = orderBoxes([leaves, top, trunk], rotate, { solid: true }).map((b) => b.name);
    assert.ok(names.indexOf("trunk") < names.indexOf("leaves"), names.join(","));
    assert.ok(names.indexOf("leaves") < names.indexOf("top"), names.join(","));
  }
});

test("the tree of the scenery: trunk first, then the leaves (4 rotations)", () => {
  const { parts } = propParts("tree", { t: 0 });
  const placed = parts.map((p, i) => ({ ...p, x: p.x + 10, y: p.y + 10, name: i }));
  for (const rotate of ROTATIONS) {
    const names = orderBoxes(placed, rotate, { solid: true }).map((b) => b.name);
    assert.ok(names.indexOf(0) < names.indexOf(1), `trunk before leaves: ${names}`);
  }
});

test("push apart: the smallest partial overlap decides, nested boxes do not", () => {
  const ext = (b) => ({ x0: b.x, x1: b.x + b.w, y0: b.y, y1: b.y + b.d, z0: b.z, z1: b.z + b.h });
  // Overlap 0.3 in height, nested in x and y: the lower one is behind.
  assert.equal(pushApart(ext(box(0.4, 0.4, 0, 0.2, 0.2, 1.3)), ext(box(0, 0, 1, 1, 1, 1))), 1);
  assert.equal(pushApart(ext(box(0, 0, 1, 1, 1, 1)), ext(box(0.4, 0.4, 0, 0.2, 0.2, 1.3))), -1);
  // A plank crossing a post: they overlap less along x than along y.
  assert.equal(pushApart(ext(box(0, 0, 0, 1, 1, 1)), ext(box(0.9, 0.2, 0.2, 1, 3, 0.2))), 1);
  // A hood around a head (nested on every axis): no rule, model order kept.
  assert.equal(pushApart(ext(box(0.2, 0.2, 1.3, 0.6, 0.6, 0.5)), ext(box(0.15, 0.15, 1.25, 0.7, 0.7, 0.6))), 0);
});

test("no hat, helmet or hair crosses a head: drawn in front of it from every side", () => {
  const cross = (a, b) => a.x < b.x + b.w - 1e-6 && b.x < a.x + a.w - 1e-6 && a.y < b.y + b.d - 1e-6
    && b.y < a.y + a.d - 1e-6 && a.z < b.z + b.h - 1e-6 && b.z < a.z + a.h - 1e-6;
  for (const skin of Object.keys(SKINS)) {
    for (const pose of ["idle", "talk", "cheer", "sad"]) {
      const { parts } = npcParts(skin, pose, 0, 0);
      const head = parts.find((p) => p.role === "head");
      for (const p of parts) {
        if (p === head || !["hat", "head"].includes(p.role)) continue;
        assert.ok(!cross(p, head), `${skin} ${pose}: ${p.role} crosses the head`);
      }
      // From each side, the helmet's top plate is drawn after the head.
      const placed = parts.map((p, i) => ({ ...p, x: p.x + 10, y: p.y + 10, i }));
      const hi = parts.indexOf(head);
      const tops = placed.filter((p) => p.role === "hat" && Math.abs(p.z - head.z - head.h) < 1e-6);
      for (const rotate of ROTATIONS) {
        const order = orderBoxes(placed, rotate).map((b) => b.i);
        for (const t of tops) assert.ok(order.indexOf(t.i) > order.indexOf(hi), `${skin}: hat top behind the head`);
      }
    }
  }
});
