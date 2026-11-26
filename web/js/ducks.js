// Little yellow rubber ducks (a nod to "rubber duck debugging": explaining
// your code to a duck helps you find the bug). From time to time one comes
// out and waddles across the map, on every level and every step; a click on
// it: "couic !", it is gone.

const YELLOW = "#f7d02c";
const SHADE = "#d9ad16";
const BEAK = "#f06a1d";

const B = (x, y, z, w, d, h, c, role = "duck") => ({ x, y, z, w, d, h, c, role });

// The duck in its cell (1 × 1), looking towards +y.
const BASE = [
  B(0.15, 0.1, 0, 0.7, 0.75, 0.42, YELLOW),
  B(0.3, 0.0, 0.28, 0.4, 0.1, 0.26, YELLOW),
  B(0.1, 0.3, 0.12, 0.05, 0.4, 0.2, SHADE),
  B(0.85, 0.3, 0.12, 0.05, 0.4, 0.2, SHADE),
  B(0.25, 0.52, 0.42, 0.5, 0.45, 0.42, YELLOW),
  B(0.33, 0.97, 0.5, 0.34, 0.16, 0.12, BEAK),
  B(0.36, 0.97, 0.47, 0.28, 0.12, 0.03, "#c84f12"),
  B(0.27, 0.971, 0.68, 0.12, 0.01, 0.12, "#ffffff", "eye"),
  B(0.61, 0.971, 0.68, 0.12, 0.01, 0.12, "#ffffff", "eye"),
  B(0.3, 0.982, 0.7, 0.06, 0.01, 0.07, "#151515", "eye"),
  B(0.64, 0.982, 0.7, 0.06, 0.01, 0.07, "#151515", "eye"),
];

// dir: 0 looks towards +y, 1 towards -x, 2 towards -y, 3 towards +x.
export function duckParts(dir = 0) {
  let parts = BASE;
  for (let i = 0; i < ((dir % 4) + 4) % 4; i += 1) {
    parts = parts.map((p) => ({ ...p, x: 1 - (p.y + p.d), y: p.x, w: p.d, d: p.w }));
  }
  return parts;
}

// Which way a duck looks when it moves by (dx, dy).
export function duckDir(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 3 : 1;
  return dy > 0 ? 0 : 2;
}

// The life of the ducks: when one appears, where it goes. rand: a random
// function (Math.random in the game, a fixed one in the tests).
export class Ducks {
  constructor(rand = Math.random) {
    this.rand = rand;
    this.list = [];
    this.made = 0;
    this.next = 25000 + rand() * 20000;
  }

  // A new duck, at the edge of the map, waddling in.
  spawn(now, size = 24) {
    const r = this.rand;
    const edge = Math.floor(r() * 4);
    const t = 2 + r() * (size - 4);
    const [x, y] = [[1, t], [size - 2, t], [t, 1], [t, size - 2]][edge];
    this.made += 1;
    const duck = { id: `duck${this.made}`, x, y, tx: x, ty: y, dir: 0, born: now, dying: 0, pause: 0, leaveAt: now + 40000 + r() * 20000 };
    this.target(duck, size);
    this.list.push(duck);
    return duck;
  }

  target(duck, size) {
    const r = this.rand;
    duck.tx = Math.max(1.5, Math.min(size - 2.5, duck.x + (r() - 0.5) * 8));
    duck.ty = Math.max(1.5, Math.min(size - 2.5, duck.y + (r() - 0.5) * 8));
  }

  // One step of time (dt in s). active: ducks may appear (not during a
  // cinematic). At most 2 at once, one every 20 to 50 s.
  update(now, dt, active, size = 24) {
    this.list = this.list.filter((d) => !d.dying || now - d.dying < 500);
    if (active && now >= this.next && this.list.length < 2) {
      this.spawn(now, size);
      this.next = now + 20000 + this.rand() * 30000;
    }
    for (const d of this.list) {
      if (d.dying) continue;
      if (now > d.leaveAt && !d.leaving) {
        // Time to go: back to the nearest edge, then away.
        d.leaving = true;
        const edges = [[0.5, d.y], [size - 1.5, d.y], [d.x, 0.5], [d.x, size - 1.5]];
        [d.tx, d.ty] = edges.sort((a, b) => Math.hypot(a[0] - d.x, a[1] - d.y) - Math.hypot(b[0] - d.x, b[1] - d.y))[0];
      }
      if (now < d.pause) continue;
      const dx = d.tx - d.x;
      const dy = d.ty - d.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.05) {
        if (d.leaving) {
          d.gone = true;
          continue;
        }
        d.pause = now + 800 + this.rand() * 2500;
        this.target(d, size);
        continue;
      }
      const step = Math.min(dist, 0.9 * dt);
      d.x += (dx / dist) * step;
      d.y += (dy / dist) * step;
      d.dir = duckDir(dx, dy);
    }
    this.list = this.list.filter((d) => !d.gone);
  }

  kill(id, now) {
    const d = this.list.find((x) => x.id === id && !x.dying);
    if (d) d.dying = now;
    return d || null;
  }
}
