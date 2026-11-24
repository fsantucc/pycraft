// "Le Cœur du Monde": the place of the last level.
//
// The map becomes the centre of an amphitheatre: two flights of dark stone
// terraces rise behind it, four seals (one per act of the adventure) stand
// on them, and above the back corner floats the Heart of the World — a red
// gem in a golden frame, wrapped in turning rings. Floating islands drift on
// both sides; rune lines in the floor lead to the Heart.
//
// The Heart has a state, shown everywhere: asleep (0), stirring (1), awake
// (2); and the number of seals lit (0 to 4). The finale cinematic plays with
// it; the checks of the mission light the seals one by one, and success
// wakes the Heart completely (a beam of light to the sky).
//
// Everything stands behind the back edges of the map, so it never hides the
// objects of the learner's program.

const B = (x, y, z, w, d, h, c, role = "stone") => ({ x, y, z, w, d, h, c, role });
const W = 24;
const D = 24;

export const HEART = { x: -2.2, y: -2.2, z: 5.4 };
export const SEALS = [
  { x: -3.4, y: 14.2, act: "I", name: "Sceau des Fondations", color: "#6ad04a" },
  { x: -3.4, y: 5.4, act: "II", name: "Sceau des Créateurs", color: "#f09a3e" },
  { x: 5.4, y: -3.4, act: "III", name: "Sceau des Terres Instables", color: "#b48cf2" },
  { x: 14.2, y: -3.4, act: "IV", name: "Sceau du Royaume des Données", color: "#f2c14e" },
];
const ISLANDS = [{ x: -10.5, y: 16.5, z: 2.6, seed: 1 }, { x: 16.5, y: -10.5, z: 2.6, seed: 2 }];

const STONE = "#3a3150";
const STONE2 = "#2f2843";
const GOLD = "#d9a640";

export function heartState(world) {
  if (!world.heart) world.heart = { awake: 1, seals: 0, pulseAt: -1e9, wave: -1e9, beat: 1400 };
  return world.heart;
}

export function setHeart(world, { awake, seals, beat }) {
  const h = heartState(world);
  if (awake !== undefined) h.awake = awake;
  if (seals !== undefined) h.seals = seals;
  if (beat !== undefined) h.beat = beat;
}

// A heartbeat: the Heart swells and its light flares.
export function heartPulse(world) {
  heartState(world).pulseAt = world.now();
}

// A shockwave of light from the Heart (awakening).
export function heartWave(world) {
  const h = heartState(world);
  h.wave = world.now();
  h.pulseAt = world.now();
}

// ------------------------------------------------------------ geometry
// Static: built once.
let TERRACES = null;
function terraceGroups() {
  if (TERRACES) return TERRACES;
  const left = [];
  const right = [];
  for (let i = 0; i < 24; i += 1) {
    const tone = i % 2 ? STONE : STONE2;
    const other = tone === STONE ? STONE2 : STONE;
    // Left back edge (x < 0), then right back edge (y < 0): two steps.
    left.push(B(-2, i, 0, 2, 1, 0.45, tone), B(-4, i, 0, 2, 1, 0.95, other));
    right.push(B(i, -2, 0, 1, 2, 0.45, tone), B(i, -4, 0, 1, 2, 0.95, other));
    if (i % 3 === 1) {
      left.push(B(-0.08, i + 0.3, 0.45, 0.08, 0.4, 0.05, GOLD, "trim"));
      right.push(B(i + 0.3, -0.08, 0.45, 0.4, 0.08, 0.05, GOLD, "trim"));
    }
  }
  // The dais under the Heart, in the back corner, with its crystals.
  const dais = [B(-4, -4, 0, 4, 4, 1.4, "#41385a"), B(-3.6, -3.6, 1.4, 3.2, 3.2, 0.12, "#4b4168")];
  for (const [x, y] of [[-3.8, -3.8], [-0.6, -3.8], [-3.8, -0.6]]) {
    dais.push(B(x, y, 1.52, 0.4, 0.4, 0.5, "#9ff7f2", "crystal"), B(x + 0.1, y + 0.1, 2.02, 0.2, 0.2, 0.3, "#d8ffff", "crystal"));
  }
  TERRACES = [left, right, dais];
  return TERRACES;
}

function sealParts(seal, lit, t) {
  const parts = [];
  const z0 = 0.95;
  const left = seal.x < 0;
  parts.push(B(seal.x - 0.6, seal.y - 0.6, z0, 1.2, 1.2, 0.3, "#4b4168"));
  parts.push(B(seal.x - 0.45, seal.y - 0.45, z0 + 0.3, 0.9, 0.9, 0.2, "#41385a"));
  parts.push(B(seal.x - 0.3, seal.y - 0.3, z0 + 0.5, 0.6, 0.6, 2.4, "#2a2340"));
  for (const k of [0.7, 1.5, 2.3]) parts.push(B(seal.x - 0.32, seal.y - 0.32, z0 + 0.5 + k, 0.64, 0.64, 0.07, GOLD, "trim"));
  // A rune on the side that faces the map.
  const glow = lit ? seal.color : "#4a4560";
  if (left) parts.push(B(seal.x + 0.3, seal.y - 0.15, z0 + 1.1, 0.02, 0.3, 0.6, glow, lit ? "flame" : "stone"));
  else parts.push(B(seal.x - 0.15, seal.y + 0.3, z0 + 1.1, 0.3, 0.02, 0.6, glow, lit ? "flame" : "stone"));
  // The crystal floats above the shaft.
  const bob = lit ? Math.sin(t / 500 + seal.x) * 0.08 : 0;
  const cz = z0 + 3.1 + bob;
  const c = lit ? seal.color : "#6a6680";
  parts.push(B(seal.x - 0.25, seal.y - 0.25, cz, 0.5, 0.5, 0.5, c, lit ? "flame" : "stone"));
  parts.push(B(seal.x - 0.14, seal.y - 0.14, cz + 0.5, 0.28, 0.28, 0.25, lit ? "#ffffff" : "#8a86a0", lit ? "flame" : "stone"));
  parts.push(B(seal.x - 0.14, seal.y - 0.14, cz - 0.22, 0.28, 0.28, 0.22, c, lit ? "flame" : "stone"));
  return parts;
}

export function sealTop(seal) {
  return [seal.x, seal.y, 0.95 + 3.4];
}

function islandParts(island, t) {
  const bob = Math.sin(t / 1600 + island.seed * 2) * 0.18;
  const { x, y } = island;
  const z = island.z + bob;
  const parts = [
    B(x - 1, y - 1, z, 2, 2, 0.32, "#2f6b5a", "grass"),
    B(x - 0.9, y - 0.9, z - 0.5, 1.8, 1.8, 0.5, "#3a3150"),
    B(x - 0.6, y - 0.6, z - 1.0, 1.2, 1.2, 0.5, "#2f2843"),
    B(x - 0.3, y - 0.3, z - 1.4, 0.6, 0.6, 0.4, "#251f38"),
    B(x - 0.12, y - 0.12, z - 1.75, 0.24, 0.24, 0.35, "#9ff7f2", "crystal"),
    // A small tree with glowing leaves, and crystals.
    B(x - 0.5, y + 0.2, z + 0.32, 0.16, 0.16, 0.8, "#5a3a22"),
    B(x - 0.85, y - 0.15, z + 1.0, 0.85, 0.85, 0.55, "#4fc0a0", "flame"),
    B(x + 0.35, y - 0.55, z + 0.32, 0.22, 0.22, 0.6, "#b48cf2", "crystal"),
    B(x + 0.55, y - 0.25, z + 0.32, 0.16, 0.16, 0.38, "#d7c0ff", "crystal"),
  ];
  return parts;
}

// The Heart: a red gem in a golden frame, wrapped in three turning rings.
function heartParts(world, t) {
  const h = heartState(world);
  const beat = Math.max(0, 1 - (t - h.pulseAt) / 380);
  const idle = h.awake > 0 ? Math.max(0, Math.sin((t / h.beat) * Math.PI * 2)) ** 8 * 0.6 : 0;
  const swell = 1 + (beat + idle) * 0.12;
  const float = Math.sin(t / 900) * 0.12;
  const { x, y } = HEART;
  const z = HEART.z + float;
  const parts = [];
  const s = 0.95 * swell;
  const core = h.awake === 0 ? "#5a2030" : h.awake === 1 ? "#c62d4a" : "#ff4466";
  parts.push(B(x - s / 2, y - s / 2, z - s / 2, s, s, s, core, h.awake ? "flame" : "stone"));
  const f = 0.62 * swell;
  for (const dx of [-1, 1]) {
    for (const dy of [-1, 1]) {
      for (const dz of [-1, 1]) parts.push(B(x + dx * f - 0.14, y + dy * f - 0.14, z + dz * f - 0.14, 0.28, 0.28, 0.28, GOLD, "trim"));
    }
  }
  // Rings: cubes on circles, turning faster as the Heart wakes up.
  const speed = [0.00012, 0.0006, 0.0013][h.awake];
  const rings = [
    { r: 1.55, tilt: 0, phase: 0, n: 14, c: "#f2c14e" },
    { r: 1.85, tilt: 1.05, phase: 1, n: 16, c: "#9ff7f2" },
    { r: 1.85, tilt: -1.05, phase: 2, n: 16, c: "#d7c0ff" },
  ];
  rings.forEach((ring, ri) => {
    const a0 = t * speed * (ri % 2 ? -1 : 1) + ring.phase;
    for (let k = 0; k < ring.n; k += 1) {
      const a = a0 + (k / ring.n) * Math.PI * 2;
      const px = Math.cos(a) * ring.r;
      const py0 = Math.sin(a) * ring.r;
      const py = py0 * Math.cos(ring.tilt);
      const pz = py0 * Math.sin(ring.tilt);
      const size = 0.15;
      parts.push(B(x + px - size / 2, y + py - size / 2, z + pz - size / 2, size, size, size, h.awake ? ring.c : "#6a6680", h.awake ? "flame" : "stone"));
    }
  });
  return parts;
}

// ------------------------------------------------------------- drawing
export function collectCoeur(world, list, now) {
  const h = heartState(world);
  const rotate = (x, y) => world.rotate(x, y);
  const style = (p, pi) => ({
    color: p.c,
    outline: p.role === "crystal" || p.role === "flame" ? null : "rgba(0,0,0,0.3)",
    tex: p.role === "stone" ? 2 : 0,
    seed: pi * 1.7,
  });
  // Every landmark lies outside the map (x < 0 or y < 0): it is entirely
  // behind the map or entirely in front of it, depending on the rotation of
  // the camera — so it is drawn before or after everything on the map.
  const [m0x, m0y] = world.rotate(0, 0);
  const [m1x, m1y] = world.rotate(W, D);
  const map = { x0: Math.min(m0x, m1x), x1: Math.max(m0x, m1x), y0: Math.min(m0y, m1y), y1: Math.max(m0y, m1y) };
  const depthOfGroup = (parts) => {
    let x0 = Infinity; let x1 = -Infinity; let y0 = Infinity; let y1 = -Infinity; let z = 0;
    for (const p of parts) {
      for (const [a, b] of [[p.x, p.y], [p.x + p.w, p.y + p.d]]) {
        const [rx, ry] = rotate(a, b);
        x0 = Math.min(x0, rx); x1 = Math.max(x1, rx); y0 = Math.min(y0, ry); y1 = Math.max(y1, ry);
      }
      z += p.z + p.h / 2;
    }
    const centre = (x0 + x1) / 2 + (y0 + y1) / 2 + (z / parts.length) * 0.2;
    const behind = x1 <= map.x0 + 1e-6 || y1 <= map.y0 + 1e-6;
    return (behind ? -1000 : 1000) + centre;
  };
  // A seal stands on a terrace, the Heart floats above the dais: they are
  // ordered together with what they stand on.
  const [left, right, dais] = terraceGroups();
  const seals = SEALS.map((seal, i) => sealParts(seal, i < h.seals, now));
  const groups = [
    left.concat(seals[0], seals[1]),
    right.concat(seals[2], seals[3]),
    dais.concat(heartParts(world, now)),
    ...ISLANDS.map((island) => islandParts(island, now)),
  ];
  for (const parts of groups) {
    list.push({ d: depthOfGroup(parts), fn: () => world.drawModel(parts, (p) => p, style) });
  }
  SEALS.forEach((seal, i) => {
    const [sx, sy] = world.project(seal.x, seal.y, 3);
    const k = world.cam.k * world.zoom;
    world.hitboxes.push({ x0: sx - 16 * k, x1: sx + 16 * k, y0: sy - 50 * k, y1: sy + 40 * k, target: { kind: "seal", id: i } });
  });
  const [hx, hy] = world.project(HEART.x, HEART.y, HEART.z);
  const k = world.cam.k * world.zoom;
  world.hitboxes.push({ x0: hx - 40 * k, x1: hx + 40 * k, y0: hy - 40 * k, y1: hy + 40 * k, target: { kind: "heart", id: "heart" } });
}

// Sky of the place: an aurora above everything.
export function drawCoeurSky(world, now) {
  const c = world.ctx;
  const { width, height } = world;
  c.save();
  c.globalCompositeOperation = "lighter";
  const bands = [["#3fd0b0", 0.22, 0], ["#7a4ae8", 0.3, 2], ["#e05ad0", 0.16, 4]];
  for (const [color, alpha, phase] of bands) {
    c.beginPath();
    for (let i = 0; i <= 40; i += 1) {
      const x = (i / 40) * width;
      const y = height * (0.12 + 0.06 * phase / 4) + Math.sin(i / 5 + now / 2600 + phase) * 24 + Math.sin(i / 11 + phase) * 18;
      if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
    }
    for (let i = 40; i >= 0; i -= 1) {
      const x = (i / 40) * width;
      const y = height * (0.12 + 0.06 * phase / 4) + 70 + Math.sin(i / 6 + now / 3100 + phase) * 20;
      c.lineTo(x, y);
    }
    c.closePath();
    const g = c.createLinearGradient(0, height * 0.05, 0, height * 0.4);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(0.5, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    c.globalAlpha = alpha * (0.75 + 0.25 * Math.sin(now / 1900 + phase));
    c.fillStyle = g;
    c.fill();
  }
  c.restore();
}

// Lights: halos of the seals and of the Heart, energy streams, the beam of
// the awakened Heart, the shockwave.
export function drawCoeurLights(world, now) {
  const c = world.ctx;
  const h = heartState(world);
  const k = world.cam.k * world.zoom;
  c.save();
  c.globalCompositeOperation = "lighter";
  const halo = (x, y, r, color, alpha) => {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    c.globalAlpha = alpha;
    c.fillStyle = g;
    c.fillRect(x - r, y - r, r * 2, r * 2);
  };
  SEALS.forEach((seal, i) => {
    if (i >= h.seals) return;
    const [x, y] = world.project(...sealTop(seal));
    halo(x, y, 60 * k, seal.color, 0.5 + 0.15 * Math.sin(now / 300 + i));
    // A pillar of light on each lit seal.
    const grad = c.createLinearGradient(0, y - 160 * k, 0, y);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, seal.color);
    c.globalAlpha = 0.35;
    c.fillStyle = grad;
    c.fillRect(x - 6 * k, y - 160 * k, 12 * k, 160 * k);
  });
  const [hx, hy] = world.project(HEART.x, HEART.y, HEART.z);
  const beat = Math.max(0, 1 - (now - h.pulseAt) / 500);
  const power = [0.25, 0.65, 1][h.awake] + beat * 0.6;
  halo(hx, hy, (110 + 50 * beat) * k * (0.7 + power * 0.4), "#ff5a7a", 0.45 * power);
  halo(hx, hy, 40 * k, "#ffe7a0", 0.5 * power);
  // Energy streams from the lit seals to the Heart.
  if (h.awake > 0) {
    SEALS.forEach((seal, i) => {
      if (i >= h.seals) return;
      const [sx, sy] = world.project(...sealTop(seal));
      for (let q = 0; q < 7; q += 1) {
        const f = ((now / 1300) + q / 7 + i * 0.13) % 1;
        const arc = Math.sin(f * Math.PI) * 40 * k;
        const x = sx + (hx - sx) * f;
        const y = sy + (hy - sy) * f - arc;
        halo(x, y, 9 * k, seal.color, 0.9 * Math.sin(f * Math.PI));
      }
    });
  }
  // The beam of the fully awakened Heart.
  if (h.awake === 2) {
    const w = (22 + 6 * Math.sin(now / 200)) * k;
    const grad = c.createLinearGradient(0, 0, 0, hy);
    grad.addColorStop(0, "rgba(255,240,200,0)");
    grad.addColorStop(1, "rgba(255,200,220,0.8)");
    c.globalAlpha = 0.6;
    c.fillStyle = grad;
    c.fillRect(hx - w / 2, 0, w, hy);
  }
  // Shockwave.
  const tw = (now - h.wave) / 1400;
  if (tw >= 0 && tw < 1) {
    c.globalAlpha = (1 - tw) * 0.9;
    c.strokeStyle = "#ffe7a0";
    c.lineWidth = 6 * (1 - tw) + 1;
    c.beginPath();
    c.ellipse(hx, hy, (40 + tw * 900) * k, (20 + tw * 450) * k, 0, 0, Math.PI * 2);
    c.stroke();
  }
  // Rune lines of the floor: pulses running to the back corner (the Heart).
  if (h.awake > 0) {
    for (let q = 0; q < 6; q += 1) {
      const f = 1 - (((now / 2600) + q / 6) % 1);
      const p = f * 24;
      const [x, y] = world.project(p + 0.5, p + 0.5, 0.02);
      halo(x, y, 14 * k, "#f2c14e", 0.5 * Math.sin(f * Math.PI));
      for (const [ax, ay] of [[p + 0.5, 12.5], [12.5, p + 0.5]]) {
        const [x2, y2] = world.project(ax, ay, 0.02);
        halo(x2, y2, 10 * k, "#9ff7f2", 0.35 * Math.sin(f * Math.PI));
      }
    }
  }
  c.restore();
}

// Floor of the map in this place: dark stone, gold rune lines (baked in the
// ground image).
export function coeurTile(x, y) {
  if (x === y) return "#7a5a2a";
  if (x === 12 || y === 12) return "#2f5a5a";
  return (x + y) % 2 ? "#2b2440" : "#272038";
}

// Points the camera must keep in view (with the map) in this place.
export function coeurBounds(add) {
  add(HEART.x - 2, HEART.y - 2, HEART.x + 2, HEART.y + 2, HEART.z + 2);
  for (const seal of SEALS) add(seal.x - 0.6, seal.y - 0.6, seal.x + 0.6, seal.y + 0.6, 4.6);
}

export function sealInfo(i) {
  const seal = SEALS[i];
  return seal ? `${seal.name} (Acte ${seal.act})` : "";
}
