// Rendering rules of the characters (run with: node --test tests/js).
import assert from "node:assert/strict";
import { test } from "node:test";
import { orderBoxes } from "../../web/js/depth.js";
import { buildParts, crierParts } from "../../web/js/models.js";
import { ITEMS, SKINS, gripOf, holdItem, npcParts } from "../../web/js/scene.js";

const POSES = ["idle", "talk", "cheer", "sad", "point"];
const CRIER_POSES = ["idle", "speak", "ask", "read", "call", "alert", "cheer"];
const ROTATIONS = [0, 1, 2, 3].map((rot) => (x, y) => {
  let dx = x - 12;
  let dy = y - 12;
  for (let i = 0; i < rot; i += 1) [dx, dy] = [-dy, dx];
  return [dx + 12, dy + 12];
});

const overlap = (a, b, eps = 1e-6) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > eps
  && Math.min(a.y + a.d, b.y + b.d) - Math.max(a.y, b.y) > eps
  && Math.min(a.z + a.h, b.z + b.h) - Math.max(a.z, b.z) > eps;
const inside = ([x, y, z], b) => x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.d && z > b.z && z < b.z + b.h;
const isItem = (p) => p.role === "item" || p.role === "flame";
// Do two boxes overlap on screen (isometric hexagons)? Only then does
// their order matter.
const K = 20 / 8.5 / 2;
function onScreenOverlap(a, b, rotate) {
  const ext = (p) => {
    const [ax, ay] = rotate(p.x, p.y);
    const [bx, by] = rotate(p.x + p.w, p.y + p.d);
    const x0 = Math.min(ax, bx); const x1 = Math.max(ax, bx); const y0 = Math.min(ay, by); const y1 = Math.max(ay, by);
    return [[x0 - y1, x1 - y0], [K * p.z - y1, K * (p.z + p.h) - y0], [x0 - K * (p.z + p.h), x1 - K * p.z]];
  };
  const A = ext(a);
  const B = ext(b);
  return A.every(([lo, hi], i) => Math.min(hi, B[i][1]) - Math.max(lo, B[i][0]) > 1e-6);
}

test("a hat is always drawn after the head it sits on (every skin, pose, rotation)", () => {
  for (const skin of Object.keys(SKINS)) {
    for (const pose of POSES) {
      const { parts } = npcParts(skin, pose, 1234, 0.5);
      const heads = parts.filter((p) => p.role === "head" && p.w >= 0.5);
      const hats = parts.filter((p) => p.role === "hat");
      for (const rotate of ROTATIONS) {
        const order = orderBoxes(parts, rotate);
        for (const head of heads) {
          for (const hat of hats) {
            const above = hat.z >= head.z + head.h - 1e-6
              && hat.x < head.x + head.w && hat.x + hat.w > head.x && hat.y < head.y + head.d && hat.y + hat.d > head.y;
            if (above && onScreenOverlap(hat, head, rotate)) {
              assert.ok(order.indexOf(hat) > order.indexOf(head), `${skin}/${pose}: chapeau derrière la tête`);
            }
          }
        }
      }
    }
  }
});

test("the tricorne of the crier stays on top of his head", () => {
  for (const pose of CRIER_POSES) {
    const parts = crierParts(pose, 777);
    const head = parts.find((p) => p.role === "head" && p.w >= 0.5);
    for (const rotate of ROTATIONS) {
      const order = orderBoxes(parts, rotate);
      for (const hat of parts.filter((p) => p.role === "hat" && p.z >= head.z + head.h - 1e-6)) {
        if (onScreenOverlap(hat, head, rotate)) assert.ok(order.indexOf(hat) > order.indexOf(head), pose);
      }
    }
  }
});

test("held items never go through the arm, the fist, the body or the head", () => {
  for (const skin of Object.keys(SKINS)) {
    for (const pose of POSES) {
      for (const t of [0, 400, 1300, 2700]) {
        const { parts, lights } = npcParts(skin, pose, t, 0.3);
        const items = parts.filter(isItem);
        const body = parts.filter((p) => !isItem(p) && p.role !== "hat" && p.role !== "eye" && p.role !== "mouth");
        for (const item of items) {
          for (const other of body) {
            assert.ok(!overlap(item, other), `${skin}/${pose}: l'objet traverse ${other.role}`);
          }
        }
        for (const light of lights) {
          for (const other of body.filter((p) => p.role === "armR" || p.role === "armL")) {
            assert.ok(!inside(light, other), `${skin}/${pose}: la lumière est dans le bras`);
          }
        }
      }
    }
  }
});

test("every item, in every grip, stays out of the fist that holds it", () => {
  const fists = {
    down: { x: 0.82, y: 0.4, z: 0.66, w: 0.14, d: 0.2, h: 0.13 },
    up: { x: 0.82, y: 0.4, z: 1.92, w: 0.14, d: 0.2, h: 0.13 },
    forward: { x: 0.82, y: 0.98, z: 1.18, w: 0.14, d: 0.14, h: 0.16 },
  };
  for (const name of Object.keys(ITEMS)) {
    for (const [mode, fist] of Object.entries(fists)) {
      const { grip, dir } = gripOf(fist, mode, name);
      const { parts } = holdItem(name, grip, dir, 500);
      assert.ok(parts.length > 0, `${name}/${mode}: rien n'est dessiné`);
      for (const p of parts) {
        assert.ok(!overlap(p, fist), `${name}/${mode}: l'objet est dans le poing`);
        assert.ok(p.z >= 0, `${name}/${mode}: l'objet passe sous le sol`);
      }
    }
  }
});

test("the crier's bell and scroll stay out of his arms", () => {
  for (const pose of CRIER_POSES) {
    const parts = crierParts(pose, 999);
    const held = parts.filter((p) => p.role === "bell" || p.role === "scroll");
    const arms = parts.filter((p) => p.role === "armL" || p.role === "armR");
    for (const h of held) for (const a of arms) assert.ok(!overlap(h, a), `${pose}: objet dans le bras`);
  }
});

test("the miner's pickaxe is held in front of his hand", () => {
  const { parts } = buildParts("Miner", {}, {});
  const arm = parts.find((p) => p.role === "armR" && p.h > 0.5);
  const pick = parts.filter((p) => p.role === "armR" && p !== arm);
  assert.ok(pick.length > 3);
  for (const p of pick) assert.ok(!overlap(p, arm), "pioche dans le bras");
});

test("the drawing order is the same whatever the camera position", () => {
  const { parts } = npcParts("king", "cheer", 500, 0);
  const shifted = parts.map((p) => ({ ...p, x: p.x + 7.25, y: p.y + 3.5 }));
  const a = orderBoxes(parts).map((p) => parts.indexOf(p));
  const b = orderBoxes(shifted).map((p) => shifted.indexOf(p));
  assert.deepEqual(a, b);
});

test("an item held arm down reads from the four sides of the camera", () => {
  // Screen vector of the item (first cube -> last cube), isometric
  // projection, for each rotation: it never points at the camera.
  const screen = ([x, y, z], rotate) => {
    const [rx, ry] = rotate(x, y);
    return [(rx - ry) * 17, (rx + ry) * 8.5 - z * 20];
  };
  for (const [name, item] of Object.entries(ITEMS)) {
    if (item.down !== "diag") continue;
    for (const fistX of [0.05, 0.75]) {
      const fist = { x: fistX, y: 0.4, z: 0.6, w: 0.2, d: 0.2, h: 0.16 };
      const { grip, dir } = gripOf(fist, "down", name);
      const cubes = holdItem(name, grip, dir, 0).parts;
      const c = (p) => [p.x + p.w / 2, p.y + p.d / 2, p.z + p.h / 2];
      const lowest = cubes.reduce((m, p) => (p.z < m.z ? p : m));
      const highest = cubes.reduce((m, p) => (p.z + p.h > m.z + m.h ? p : m));
      const lengths = ROTATIONS.map((rotate) => {
        const [ax, ay] = screen(c(lowest), rotate);
        const [bx, by] = screen(c(highest), rotate);
        return Math.hypot(bx - ax, by - ay);
      });
      assert.ok(Math.min(...lengths) > 0.5 * Math.max(...lengths), `${name}: ${lengths.map((l) => l.toFixed(1))}`);
    }
  }
});
