// Drawing order of the boxes of one model (a character, a prop, a boss…).
//
// Sorting boxes by the depth of their centre is not enough: a hat sitting
// on a head has its centre slightly "behind" the centre of the head, so it
// was drawn first and the head covered it. Here two boxes are ordered only
// when they can hide each other on screen, using the plane that separates
// them: the box on the camera side of a plane x = c, y = c or z = c is in
<<<<<<< HEAD
// front. Boxes that intersect (an eye drawn on a face, a hood around a head)
// keep the order of their centres, then the order in which the model lists
// them. The result does not depend on the camera position or zoom, only on
// its rotation.
=======
// front.
//
// Boxes that intersect have no true order. For solid scenery (`solid`: a
// tree, a house, a bridge…) they are pushed apart along the axis where they
// overlap the least: a trunk entering the leaves overlaps them a little in
// height, it is below, so behind. Characters are different: their clothes
// wrap their body on purpose (an open helmet around a face, a hood around a
// head) and must keep the order of the model — so without `solid`, as for
// boxes nested on every axis, intersecting boxes keep the order of their
// centres, then the order in which the model lists them. The result does
// not depend on the camera position or zoom, only on its rotation.
>>>>>>> c46f881 (lastfeatures)

const EPS = 1e-6;
// Height of one block on screen, in half tile heights (BH / (TH / 2) / 2).
const K = 20 / 8.5 / 2;

<<<<<<< HEAD
// boxes: [{ x, y, z, w, d, h }] in world units (absolute or relative, but
// all in the same space). rotate(x, y) → [rx, ry]: the camera rotation.
// Returns the boxes in drawing order (a new array).
export function orderBoxes(boxes, rotate = (x, y) => [x, y]) {
=======
// Two interpenetrating boxes: +1 if A goes behind B, -1 if B goes behind A,
// 0 if no axis tells (nested boxes). Only the axes where the two intervals
// overlap partly count (on an axis where one contains the other, moving
// them apart would not make sense); the smallest overlap wins.
export function pushApart(A, B) {
  let best = null;
  for (const [a0, a1, b0, b1] of [[A.x0, A.x1, B.x0, B.x1], [A.y0, A.y1, B.y0, B.y1], [A.z0, A.z1, B.z0, B.z1]]) {
    const nested = (a0 >= b0 - EPS && a1 <= b1 + EPS) || (b0 >= a0 - EPS && b1 <= a1 + EPS);
    if (nested) continue;
    const overlap = Math.min(a1, b1) - Math.max(a0, b0);
    if (!best || overlap < best.overlap) best = { overlap, side: a0 + a1 < b0 + b1 ? 1 : -1 };
  }
  return best ? best.side : 0;
}

// boxes: [{ x, y, z, w, d, h }] in world units (absolute or relative, but
// all in the same space). rotate(x, y) → [rx, ry]: the camera rotation.
// Returns the boxes in drawing order (a new array).
export function orderBoxes(boxes, rotate = (x, y) => [x, y], { solid = false } = {}) {
>>>>>>> c46f881 (lastfeatures)
  const n = boxes.length;
  if (n < 2) return boxes.slice();
  const info = boxes.map((b, i) => {
    const [ax, ay] = rotate(b.x, b.y);
    const [bx, by] = rotate(b.x + b.w, b.y + b.d);
    const x0 = Math.min(ax, bx);
    const x1 = Math.max(ax, bx);
    const y0 = Math.min(ay, by);
    const y1 = Math.max(ay, by);
    const z0 = b.z;
    const z1 = b.z + b.h;
    return {
      i, x0, x1, y0, y1, z0, z1,
      // On screen a box is a hexagon. Two hexagons overlap exactly when
      // their extents along these three directions all overlap.
      h0: x0 - y1, h1: x1 - y0,
      p0: K * z0 - y1, p1: K * z1 - y0,
      q0: x0 - K * z1, q1: x1 - K * z0,
      key: (x0 + x1) / 2 + (y0 + y1) / 2 + ((z0 + z1) / 2) * 0.01,
    };
  });
  const after = Array.from({ length: n }, () => []);
  const before = Array.from({ length: n }, () => []);
  const indegree = new Array(n).fill(0);
  for (let a = 0; a < n; a += 1) {
    const A = info[a];
    for (let b = a + 1; b < n; b += 1) {
      const B = info[b];
      if (A.h1 <= B.h0 + EPS || B.h1 <= A.h0 + EPS || A.p1 <= B.p0 + EPS || B.p1 <= A.p0 + EPS
        || A.q1 <= B.q0 + EPS || B.q1 <= A.q0 + EPS) continue;
      // +1: A is behind B; -1: B is behind A; 0: no separating plane.
      const votes = [];
      if (A.x1 <= B.x0 + EPS) votes.push(1);
      else if (B.x1 <= A.x0 + EPS) votes.push(-1);
      if (A.y1 <= B.y0 + EPS) votes.push(1);
      else if (B.y1 <= A.y0 + EPS) votes.push(-1);
      if (A.z1 <= B.z0 + EPS) votes.push(1);
      else if (B.z1 <= A.z0 + EPS) votes.push(-1);
<<<<<<< HEAD
      if (!votes.length) continue;
=======
      if (!votes.length) {
        const side = solid ? pushApart(A, B) : 0;
        if (!side) continue;
        votes.push(side);
      }
>>>>>>> c46f881 (lastfeatures)
      // Planes disagreeing means the boxes cannot really overlap on screen.
      if (votes.some((v) => v !== votes[0])) continue;
      const [first, second] = votes[0] > 0 ? [a, b] : [b, a];
      after[first].push(second);
      before[second].push(first);
      indegree[second] += 1;
    }
  }
  // Topological order; among the boxes that are free, the one furthest
  // back first (then the model order).
  const done = new Array(n).fill(false);
  const order = [];
  const better = (p, q) => info[p].key < info[q].key - EPS || (Math.abs(info[p].key - info[q].key) <= EPS && p < q);
  for (let step = 0; step < n; step += 1) {
    let pick = -1;
    for (let i = 0; i < n; i += 1) {
      if (!done[i] && indegree[i] === 0 && (pick < 0 || better(i, pick))) pick = i;
    }
    if (pick < 0) {
      // Boxes hiding each other in a circle (it happens with three of them):
      // walk back along the "behind" links until we loop, and start with
      // the box of that loop that is furthest back.
      let u = done.indexOf(false);
      const seen = new Map();
      const path = [];
      while (!seen.has(u)) {
        seen.set(u, path.length);
        path.push(u);
        u = before[u].find((v) => !done[v]);
      }
      for (const v of path.slice(seen.get(u))) if (pick < 0 || better(v, pick)) pick = v;
    }
    done[pick] = true;
    order.push(boxes[pick]);
    for (const next of after[pick]) indegree[next] -= 1;
  }
  return order;
}
