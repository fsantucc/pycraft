// Story scenes: the characters and the scenery of each level.
//
// Everything is built from boxes, like the rest of the world. A part is
// { x, y, z, w, d, h, c, role } in tile units; +y is the front of a
// character (the side that faces the player). Props may also return
// "lights": points that glow and give off sparks.
//
// `done` is true once the mission of the level is passed: the scenery then
// shows the result (the house is lit, the bridge is repaired, the storm is
// gone…).

const B = (x, y, z, w, d, h, c, role = "body") => ({ x, y, z, w, d, h, c, role });

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const cl = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => cl(v).toString(16).padStart(2, "0")).join("")}`;
}

// ------------------------------------------------------------- characters
// Each skin: colors + a hat + extras + the item held in the hand. `icon` is
// shown on the name tag.
export const SKINS = {
  elder: { icon: "👴", skin: "#d9a57a", hair: "#e8e8e8", beard: "#ededed", shirt: "#7a5230", pants: "#4e3420", shoes: "#2e1d10", robe: true, hat: { type: "hood", c: "#6b4527" }, item: "scroll" },
  chief: { icon: "🧔", skin: "#c98e62", hair: "#3b2614", beard: "#3b2614", shirt: "#2f6b3a", pants: "#3a3a2a", shoes: "#2a1a0e", cape: "#8a2a22", hat: { type: "cap", c: "#5a3a1a" }, item: "staff" },
  villager: { icon: "🧑‍🌾", skin: "#d4a373", hair: "#5a3a1a", shirt: "#3e7a3a", pants: "#5a4a2a", shoes: "#3a2414", apron: "#b58a52", hat: { type: "straw", c: "#e2c36a" }, item: "torch" },
  guard: { icon: "💂", skin: "#c99a6c", shirt: "#8d939a", pants: "#5f6166", shoes: "#3a3a3a", armor: "#b9c0c8", hat: { type: "helmet", c: "#c3c9d0" }, item: "sword" },
  miner: { icon: "⛏", skin: "#c48e62", hair: "#2b1d12", beard: "#4a3020", shirt: "#4a5a6a", pants: "#3a3020", shoes: "#2a1a0e", hat: { type: "miner", c: "#e8b830" }, item: "pickaxe" },
  builder: { icon: "👷", skin: "#d9a57a", hair: "#7a4a20", shirt: "#e07a20", pants: "#3b4a6b", shoes: "#2e2e2e", hat: { type: "hardhat", c: "#f2c14e" }, item: "hammer" },
  artisan: { icon: "🧑‍🔧", skin: "#c98e62", hair: "#2b1d12", beard: "#2b1d12", shirt: "#8a3a2a", pants: "#3a2a1a", shoes: "#2a1a0e", apron: "#6b4a2a", hat: { type: "beret", c: "#2a3a5a" }, item: "hammer" },
  smith: { icon: "⚒", skin: "#b07a52", hair: "#1a1a1a", beard: "#1a1a1a", shirt: "#5a2a1a", pants: "#2a2020", shoes: "#1a1010", apron: "#3a2a1e", hat: { type: "bandana", c: "#8a1a1a" }, item: "hammer" },
  lord: { icon: "🤴", skin: "#d9a57a", hair: "#c9a050", shirt: "#3a4a8a", pants: "#2a2a4a", shoes: "#1a1a2a", armor: "#9aa6c8", cape: "#3a5ab0", hat: { type: "circlet", c: "#f2c14e" }, item: "sword" },
  engineer: { icon: "👩‍🔬", skin: "#e0b088", hair: "#a83a2a", shirt: "#e8e4dc", pants: "#4a4a5a", shoes: "#2a2a2a", robe: true, hat: { type: "goggles", c: "#5ee6e0" }, item: "wrench" },
  alchemist: { icon: "🧙", skin: "#d4a373", hair: "#bbbbbb", beard: "#cccccc", shirt: "#5a3a8a", pants: "#3a2a5a", shoes: "#2a1a3a", robe: true, hat: { type: "wizard", c: "#4a2a7a" }, item: "potion" },
  architect: { icon: "📐", skin: "#c98e62", hair: "#2b2b2b", shirt: "#2a4a7a", pants: "#2a2a3a", shoes: "#1a1a1a", cape: "#1e2e4a", hat: { type: "beret", c: "#1e2e4a" }, item: "plans" },
  general: { icon: "🎖", skin: "#d9a57a", hair: "#5a5a5a", beard: "#6a6a6a", shirt: "#8a1e1e", pants: "#1e1e2a", shoes: "#111111", armor: "#c9a24a", hat: { type: "plume", c: "#1e1e2a" }, item: "flag" },
  king: { icon: "👑", skin: "#d9a57a", hair: "#e8e0c8", beard: "#efe8d0", shirt: "#7a1a2a", pants: "#3a1a2a", shoes: "#1a1010", cape: "#b01a2a", robe: true, hat: { type: "crown", c: "#f2c14e" }, item: "staff" },
  keeper: { icon: "🧝", skin: "#c99a6c", hair: "#2a2a2a", shirt: "#2a3a3a", pants: "#1e2a2a", shoes: "#111111", robe: true, hat: { type: "hood", c: "#1e3a3a" }, item: "lantern" },
  librarian: { icon: "📚", skin: "#e0b088", hair: "#6a4a3a", shirt: "#5a2a3a", pants: "#3a2a2a", shoes: "#2a1a1a", robe: true, glasses: true, hat: { type: "bun", c: "#6a4a3a" }, item: "book" },
  cartographer: { icon: "🧭", skin: "#c48e62", hair: "#3a2a1a", beard: "#3a2a1a", shirt: "#6a5a3a", pants: "#3a3020", shoes: "#2a1a0e", cape: "#3a5a3a", hat: { type: "tricorne", c: "#3a2a1a" }, item: "map" },
  explorer: { icon: "🤠", skin: "#d4a373", hair: "#8a5a2a", shirt: "#8a7a4a", pants: "#4a3a2a", shoes: "#2a1a0e", hat: { type: "safari", c: "#c9a86a" }, item: "map" },
  player: { icon: "🎮", skin: "#c8946a", hair: "#2a2a2a", shirt: "#7a4ac4", pants: "#3a3a3a", shoes: "#e8e8e8", hat: { type: "headband", c: "#f2c14e" }, item: "none" },
  runner: { icon: "🏃", skin: "#e0b088", hair: "#e8c050", shirt: "#e5534b", pants: "#2a2a2a", shoes: "#f4f4f4", hat: { type: "headband", c: "#f4f4f4" }, item: "none" },
  warden: { icon: "🛡", skin: "#c99a6c", hair: "#d8d0c0", beard: "#e8e0d0", shirt: "#e8e0c8", pants: "#3a2f52", shoes: "#2a2238", robe: true, cape: "#7a4ae8", armor: "#d9a640", hat: { type: "hood", c: "#d9a640" }, item: "staff" },
  cook: { icon: "🧑‍🍳", skin: "#d9a57a", hair: "#3a2a1a", shirt: "#f4f4f4", pants: "#3a3a3a", shoes: "#2a2a2a", apron: "#e8e8e8", hat: { type: "chef", c: "#ffffff" }, item: "book" },
};

export const SKIN_NAMES = Object.keys(SKINS);

// A hat, a helmet or hair wraps the head: as one box crossing the head, it
// had no clear drawing order with it — from some sides the head was drawn
// over its helmet. So a box that crosses the head is cut into plates lying
// against the faces of the head (top, back, sides, front above the brow,
// below the chin): each one is clearly in front of or behind the head, from
// every side. Below the brow the front stays open (the face).
export function wrapHead(head, add, brow) {
  return (x, y, z, w, d, h, c, role) => {
    const b = { x0: x, x1: x + w, y0: y, y1: y + d, z0: z, z1: z + h };
    const crosses = b.x0 < head.x1 && b.x1 > head.x0 && b.y0 < head.y1 && b.y1 > head.y0 && b.z0 < head.z1 && b.z1 > head.z0;
    if (!crosses) {
      add(x, y, z, w, d, h, c, role);
      return;
    }
    const box = (x0, x1, y0, y1, z0, z1) => {
      if (x1 - x0 > 1e-4 && y1 - y0 > 1e-4 && z1 - z0 > 1e-4) add(x0, y0, z0, x1 - x0, y1 - y0, z1 - z0, c, role);
    };
    const z0 = Math.max(b.z0, head.z0);
    const z1 = Math.min(b.z1, head.z1);
    const ya = Math.max(b.y0, head.y0);
    const yb = Math.min(b.y1, head.y1);
    box(b.x0, b.x1, b.y0, b.y1, head.z1, b.z1);
    box(b.x0, b.x1, b.y0, b.y1, b.z0, head.z0);
    box(b.x0, b.x1, b.y0, head.y0, z0, z1);
    box(b.x0, b.x1, head.y1, b.y1, Math.max(z0, brow), z1);
    box(b.x0, head.x0, ya, yb, z0, z1);
    box(head.x1, b.x1, ya, yb, z0, z1);
  };
}

function hatParts(hat, hx, hz, add) {
  const c = hat.c;
  const top = hz + 0.5;
  switch (hat.type) {
    case "hood":
      add(hx - 0.04, 0.23, hz + 0.05, 0.58, 0.48, 0.5, c, "hat");
      add(hx - 0.04, 0.23, top, 0.58, 0.5, 0.1, c, "hat");
      break;
    case "cap":
      add(hx - 0.02, 0.24, top - 0.06, 0.54, 0.54, 0.14, c, "hat");
      break;
    case "straw":
      add(hx - 0.12, 0.13, top - 0.02, 0.74, 0.74, 0.05, c, "hat");
      add(hx + 0.04, 0.29, top + 0.03, 0.42, 0.42, 0.14, c, "hat");
      add(hx + 0.04, 0.29, top + 0.05, 0.42, 0.42, 0.04, "#a8322a", "hat");
      break;
    case "helmet":
      add(hx - 0.03, 0.24, hz + 0.28, 0.56, 0.54, 0.3, c, "hat");
      add(hx + 0.22, 0.811, hz + 0.12, 0.06, 0.03, 0.36, shade(c, 0.8), "hat");
      add(hx + 0.18, 0.3, top + 0.08, 0.14, 0.4, 0.1, "#a8322a", "hat");
      break;
    case "miner":
      add(hx - 0.03, 0.24, hz + 0.34, 0.56, 0.54, 0.24, c, "hat");
      add(hx + 0.18, 0.781, hz + 0.4, 0.14, 0.03, 0.12, "#fff6b0", "light");
      break;
    case "hardhat":
      add(hx - 0.03, 0.22, hz + 0.4, 0.56, 0.62, 0.08, c, "hat");
      add(hx + 0.05, 0.29, top - 0.02, 0.4, 0.42, 0.14, c, "hat");
      break;
    case "beret":
      add(hx - 0.04, 0.25, top - 0.04, 0.58, 0.5, 0.1, c, "hat");
      break;
    case "bandana":
      add(hx - 0.01, 0.26, hz + 0.36, 0.52, 0.5, 0.12, c, "hat");
      break;
    case "circlet":
      add(hx - 0.01, 0.26, hz + 0.42, 0.52, 0.5, 0.06, c, "hat");
      add(hx + 0.21, 0.761, hz + 0.43, 0.08, 0.02, 0.06, "#5ee6e0", "hat");
      break;
    case "goggles":
      add(hx - 0.01, 0.26, hz + 0.36, 0.52, 0.5, 0.06, "#3a2a1a", "hat");
      add(hx + 0.06, 0.761, hz + 0.33, 0.16, 0.03, 0.12, c, "hat");
      add(hx + 0.28, 0.761, hz + 0.33, 0.16, 0.03, 0.12, c, "hat");
      break;
    case "wizard":
      add(hx - 0.1, 0.16, top - 0.04, 0.7, 0.68, 0.06, c, "hat");
      add(hx + 0.05, 0.31, top + 0.02, 0.4, 0.38, 0.22, c, "hat");
      add(hx + 0.13, 0.39, top + 0.24, 0.24, 0.22, 0.2, c, "hat");
      add(hx + 0.19, 0.45, top + 0.44, 0.12, 0.1, 0.14, c, "hat");
      add(hx + 0.05, 0.69, top + 0.04, 0.4, 0.01, 0.05, "#f2c14e", "hat");
      break;
    case "plume":
      add(hx - 0.05, 0.22, top - 0.04, 0.6, 0.58, 0.12, c, "hat");
      add(hx + 0.2, 0.3, top + 0.08, 0.1, 0.3, 0.26, "#f4f4f4", "hat");
      break;
    case "crown":
      add(hx + 0.0, 0.27, top - 0.02, 0.5, 0.48, 0.1, c, "hat");
      for (const [cx, cy] of [[0, 0.27], [0.4, 0.27], [0, 0.65], [0.4, 0.65], [0.2, 0.65]]) add(hx + cx, cy, top + 0.08, 0.1, 0.1, 0.1, c, "hat");
      add(hx + 0.21, 0.752, top + 0.01, 0.08, 0.02, 0.06, "#e5534b", "hat");
      break;
    case "bun":
      add(hx + 0.15, 0.25, top - 0.02, 0.22, 0.2, 0.16, c, "hat");
      break;
    case "tricorne":
      add(hx - 0.1, 0.18, top - 0.04, 0.72, 0.68, 0.08, c, "hat");
      add(hx + 0.05, 0.3, top + 0.04, 0.42, 0.42, 0.16, c, "hat");
      break;
    case "safari":
      add(hx - 0.12, 0.14, top - 0.04, 0.76, 0.74, 0.05, c, "hat");
      add(hx + 0.03, 0.29, top + 0.01, 0.44, 0.44, 0.16, c, "hat");
      add(hx + 0.03, 0.29, top + 0.04, 0.44, 0.44, 0.04, "#6b4527", "hat");
      break;
    case "headband":
      add(hx - 0.01, 0.26, hz + 0.34, 0.52, 0.5, 0.07, c, "hat");
      break;
    case "chef":
      add(hx + 0.02, 0.27, top - 0.04, 0.46, 0.46, 0.12, c, "hat");
      add(hx - 0.02, 0.23, top + 0.08, 0.54, 0.54, 0.18, c, "hat");
      break;
    default:
      break;
  }
}

// ------------------------------------------------------------ held items
// An item is described once, in its own space:
//   u = along the item, from the grip (0) towards its tip;
//   a = across, left / right (the x axis of the world);
//   b = across, the other way (its "front": where a pickaxe head points).
// A box is [u0, u1, a0, a1, b0, b1, color, role]; a light is [u, a, b, color].
// holdItem() then places it in the hand of a character, oriented by the pose
// of the arm: so the item follows the hand and never ends up inside the arm.
//   "up"    — arm raised or held forward: the item points up from the fist;
//   "diag"  — arm down: the item is held forward and up, like in Minecraft;
//   "front" — arm down: held upright just in front of the fist (staff, flag);
//   "flat"  — arm down: held flat in front of the fist (book, map);
//   "hang"  — arm down: hanging under the fist (lantern, bell).
const flick = (t, speed = 120) => Math.abs(Math.sin(t / speed)) * 0.05;
export const ITEMS = {
  torch: { down: "diag", make: (t) => ({
    boxes: [[0, 0.4, -0.03, 0.03, -0.03, 0.03, "#6b4527", "item"],
      [0.4, 0.5 + flick(t), -0.06, 0.06, -0.06, 0.06, "#ffb347", "flame"],
      [0.42, 0.52 + flick(t), -0.03, 0.03, -0.03, 0.03, "#fff3a0", "flame"]],
    lights: [[0.48, 0, 0, "#ffb347"]] }) },
  pickaxe: { down: "diag", make: () => ({
    boxes: [[0, 0.5, -0.03, 0.03, -0.03, 0.03, "#6b4527", "item"],
      [0.42, 0.5, -0.03, 0.03, -0.22, 0.22, "#9fd0e0", "item"]], lights: [] }) },
  hammer: { down: "diag", make: () => ({
    boxes: [[0, 0.36, -0.03, 0.03, -0.03, 0.03, "#6b4527", "item"],
      [0.3, 0.44, -0.07, 0.07, -0.12, 0.12, "#8d939a", "item"]], lights: [] }) },
  sword: { down: "diag", make: () => ({
    boxes: [[0, 0.1, -0.03, 0.03, -0.03, 0.03, "#6b4527", "item"],
      [0.1, 0.14, -0.1, 0.1, -0.03, 0.03, "#f2c14e", "item"],
      [0.14, 0.64, -0.035, 0.035, -0.02, 0.02, "#dfe8f0", "item"]], lights: [] }) },
  staff: { down: "front", make: () => ({
    boxes: [[-0.7, 0.7, -0.03, 0.03, -0.03, 0.03, "#6b4527", "item"],
      [0.7, 0.84, -0.07, 0.07, -0.07, 0.07, "#5ee6e0", "flame"]],
    lights: [[0.77, 0, 0, "#5ee6e0"]] }) },
  scroll: { down: "diag", make: () => ({
    boxes: [[0, 0.3, -0.06, 0.06, -0.06, 0.06, "#f5ecd7", "item"],
      [0.12, 0.16, -0.065, 0.065, -0.065, 0.065, "#a8322a", "item"]], lights: [] }) },
  book: { down: "flat", make: () => ({
    boxes: [[0, 0.3, -0.12, 0.12, 0, 0.08, "#5a2a8a", "item"],
      [0.02, 0.28, -0.1, 0.1, 0.08, 0.085, "#f5ecd7", "item"]], lights: [] }) },
  potion: { down: "front", make: () => ({
    boxes: [[0, 0.14, -0.06, 0.06, -0.06, 0.06, "#e05ad0", "flame"],
      [0.14, 0.22, -0.03, 0.03, -0.03, 0.03, "#dfe8f0", "item"]],
    lights: [[0.07, 0, 0, "#e05ad0"]] }) },
  wrench: { down: "diag", make: () => ({
    boxes: [[0, 0.3, -0.03, 0.03, -0.03, 0.03, "#8d939a", "item"],
      [0.26, 0.36, -0.08, 0.08, -0.03, 0.03, "#8d939a", "item"]], lights: [] }) },
  plans: { down: "diag", make: () => ({
    boxes: [[0, 0.4, -0.05, 0.05, -0.05, 0.05, "#7fb7e8", "item"],
      [0.4, 0.44, -0.055, 0.055, -0.055, 0.055, "#f4f4f4", "item"]], lights: [] }) },
  map: { down: "flat", make: () => ({
    boxes: [[0, 0.3, -0.2, 0.2, 0, 0.02, "#e8d3a2", "item"],
      [0.08, 0.18, -0.1, 0.02, 0.02, 0.025, "#3a7a3a", "item"],
      [0.14, 0.2, 0.04, 0.12, 0.02, 0.025, "#e5534b", "item"]], lights: [] }) },
  flag: { down: "front", make: (t) => ({
    boxes: [[-0.7, 0.9, -0.03, 0.03, -0.03, 0.03, "#6b4527", "item"],
      [0.55, 0.85 + Math.sin(t / 300) * 0.02, -0.015, 0.015, 0.03, 0.48, "#b01a2a", "item"]], lights: [] }) },
  lantern: { down: "hang", make: () => ({
    boxes: [[0, 0.06, -0.02, 0.02, -0.02, 0.02, "#3a3a3a", "item"],
      [0.06, 0.28, -0.08, 0.08, -0.08, 0.08, "#3a3a3a", "item"],
      [0.08, 0.26, -0.065, 0.065, -0.065, 0.065, "#ffd27a", "flame"]],
    lights: [[0.17, 0, 0, "#ffd27a"]] }) },
  bell: { down: "hang", make: () => ({
    boxes: [[0, 0.12, -0.03, 0.03, -0.03, 0.03, "#6b4527", "item"],
      [0.12, 0.3, -0.08, 0.08, -0.08, 0.08, "#f2c14e", "item"],
      [0.28, 0.33, -0.1, 0.1, -0.1, 0.1, "#c29a3e", "item"]], lights: [] }) },
};

// The diagonal item starts a little in front of the fist (its first small
// cube must not sink into the hand).
const DIAG_GAP = 0.065;
// Direction of an item held arm down: mostly up, leaning forward and
// outward (away from the body, so it never crosses in front of it). Never
// close to the axis of the camera, so it reads from all four sides.
// out: -1 left hand, +1 right hand.
const DIAG = { out: 0.35, fwd: 0.32, up: 0.88 };
function diagAxes(out) {
  const n = Math.hypot(DIAG.out, DIAG.fwd, DIAG.up);
  const d = [(out * DIAG.out) / n, DIAG.fwd / n, DIAG.up / n];
  const h = Math.hypot(d[0], d[1]);
  // b: perpendicular to the item, in its vertical plane (up and back).
  const b = [(-d[0] / h) * d[2], (-d[1] / h) * d[2], h];
  return { d, b };
}

// grip: { x, y, z } — the point of the fist the item starts from, and the
// faces of the fist: { front, bottom, top }. dir: see above.
export function holdItem(name, grip, dir, t = 0) {
  const item = ITEMS[name];
  if (!item) return { parts: [], lights: [] };
  const { boxes, lights } = item.make(t);
  const parts = [];
  const out = [];
  const place = (u0, u1, a0, a1, b0, b1, color, role) => {
    const x = grip.x + a0;
    const w = a1 - a0;
    if (dir === "up" || dir === "front") {
      if (dir === "up" && u1 <= 0) return;
      const lo = dir === "up" ? Math.max(0, u0) : u0;
      const base = dir === "front" ? Math.max(0.02 - grip.z, lo) : lo;
      if (u1 <= base) return;
      parts.push(B(x, grip.y + b0, grip.z + base, w, b1 - b0, u1 - base, color, role));
    } else if (dir === "flat") {
      parts.push(B(x, grip.y + u0, grip.z + b0, w, u1 - u0, b1 - b0, color, role));
    } else if (dir === "hang") {
      parts.push(B(x, grip.y + b0, grip.z - u1, w, b1 - b0, u1 - u0, color, role));
    } else {
      // "diag": forward, outward and up, built from small cubes (pixel
      // style).
      const { d, b: bv } = diagAxes(grip.out || 1);
      const du = u1 - u0;
      const db = b1 - b0;
      const long = Math.max(du, db);
      const short = Math.min(du, db);
      const steps = Math.max(1, Math.ceil(long / 0.06));
      const size = Math.max(long / steps, short) * 0.95;
      for (let k = 0; k < steps; k += 1) {
        const f = (k + 0.5) / steps;
        const u = du >= db ? u0 + f * du : (u0 + u1) / 2;
        const b = du >= db ? (b0 + b1) / 2 : b0 + f * db;
        const cx = x + w / 2 + u * d[0] + b * bv[0];
        const cy = grip.y + DIAG_GAP + u * d[1] + b * bv[1];
        const cz = grip.z + u * d[2] + b * bv[2];
        parts.push(B(cx - w / 2, cy - size / 2, cz - size / 2, w, size, size, color, role));
      }
    }
  };
  for (const box of boxes) place(...box);
  for (const [u, a, b, color] of lights) {
    let p;
    if (dir === "up" || dir === "front") p = [grip.x + a, grip.y + b, grip.z + u];
    else if (dir === "flat") p = [grip.x + a, grip.y + u, grip.z + b];
    else if (dir === "hang") p = [grip.x + a, grip.y + b, grip.z - u];
    else {
      const { d, b: bv } = diagAxes(grip.out || 1);
      p = [grip.x + a + u * d[0] + b * bv[0], grip.y + DIAG_GAP + u * d[1] + b * bv[1], grip.z + u * d[2] + b * bv[2]];
    }
    out.push([...p, color]);
  }
  return { parts, lights: out };
}

// The grip of a fist, for each pose of the arm. fist = the box of the hand.
export function gripOf(fist, armMode, itemName) {
  const cx = fist.x + fist.w / 2;
  const cy = fist.y + fist.d / 2;
  const item = ITEMS[itemName];
  if (armMode !== "down") return { grip: { x: cx, y: cy, z: fist.z + fist.h }, dir: "up" };
  const down = item ? item.down : "diag";
  if (down === "hang") return { grip: { x: cx, y: cy, z: fist.z }, dir: "hang" };
  if (down === "front") return { grip: { x: cx + (cx > 0.5 ? 0.06 : -0.06), y: fist.y + fist.d + 0.1, z: fist.z + fist.h / 2 }, dir: "front" };
  if (down === "flat") return { grip: { x: cx + (cx > 0.5 ? 0.06 : -0.06), y: fist.y + fist.d + 0.1, z: fist.z }, dir: "flat" };
  return { grip: { x: cx, y: fist.y + fist.d + 0.01, z: fist.z + fist.h / 2, out: cx > 0.5 ? 1 : -1 }, dir: "diag" };
}

// pose: idle | talk | cheer | sad | point
export function npcParts(skinName, pose = "idle", t = 0, seed = 0) {
  const s = SKINS[skinName] || SKINS.villager;
  const parts = [];
  const lights = [];
  const add = (x, y, z, w, d, h, c, role = "body") => parts.push(B(x, y, z, w, d, h, c, role));
  const L = 0.7;
  const hop = pose === "cheer" ? Math.abs(Math.sin(t / 140)) * 0.16 : pose === "talk" ? Math.abs(Math.sin(t / 160)) * 0.04 : Math.sin(t / 700 + seed) * 0.012;
  const slump = pose === "sad" ? -0.06 : 0;
  // Legs (hidden under a robe).
  if (s.robe) {
    add(0.2, 0.32, 0, 0.6, 0.38, L + 0.05, s.shirt);
    add(0.2, 0.69, 0.02, 0.6, 0.01, 0.06, shade(s.shirt, 0.7));
    add(0.27, 0.6, 0, 0.18, 0.14, 0.08, s.shoes, "legL");
    add(0.55, 0.6, 0, 0.18, 0.14, 0.08, s.shoes, "legR");
  } else {
    const step = pose === "cheer" ? Math.sin(t / 140) * 0.05 : 0;
    for (const [lx, role, dy] of [[0.23, "legL", step], [0.57, "legR", -step]]) {
      add(lx, 0.38 + dy, 0.18, 0.2, 0.24, L - 0.18, s.pants, role);
      add(lx - 0.01, 0.37 + dy, 0, 0.22, 0.3, 0.2, s.shoes, role);
    }
  }
  const bz = L + hop;
  // Body.
  add(0.2, 0.32, bz, 0.6, 0.36, 0.75, s.shirt);
  add(0.199, 0.31, bz + 0.05, 0.602, 0.38, 0.07, shade(s.shirt, 0.65));
  if (s.apron) add(0.25, 0.685, bz - (s.robe ? 0 : 0.25), 0.5, 0.012, s.robe ? 0.68 : 0.9, s.apron);
  if (s.armor) {
    add(0.22, 0.68, bz + 0.25, 0.56, 0.02, 0.46, s.armor);
    add(0.13, 0.3, bz + 0.6, 0.2, 0.42, 0.16, s.armor);
    add(0.67, 0.3, bz + 0.6, 0.2, 0.42, 0.16, s.armor);
  }
  if (s.cape) add(0.16, 0.26, bz - 0.35, 0.68, 0.07, 1.1, s.cape);
  // Head.
  const look = pose === "idle" ? Math.sin(t / 2100 + seed) * 0.03 : 0;
  const hz = bz + 0.75 + slump;
  const hx = 0.25 + look;
  add(hx, 0.27, hz, 0.5, 0.48, 0.48, s.skin, "head");
  const head = { x0: hx, x1: hx + 0.5, y0: 0.27, y1: 0.75, z0: hz, z1: hz + 0.48 };
  // (the brow: above it a band may cover the front; a hood leaves the face
  // open)
  const hood = s.hat && s.hat.type === "hood";
  const around = wrapHead(head, add, hz + (hood ? 0.48 : 0.36));
  if (s.hair && (!s.hat || ["none", "bun", "headband", "bandana", "goggles", "circlet"].includes(s.hat.type))) {
    around(hx - 0.01, 0.26, hz + 0.38, 0.52, 0.5, 0.12, s.hair, "head");
    around(hx - 0.01, 0.26, hz + 0.18, 0.52, 0.12, 0.3, s.hair, "head");
  } else if (s.hair) {
    around(hx - 0.01, 0.26, hz + 0.2, 0.52, 0.1, 0.25, s.hair, "head");
  }
  const sad = pose === "sad";
  add(hx + 0.07, 0.752, hz + 0.24, 0.11, 0.01, sad ? 0.05 : 0.09, "#ffffff", "eye");
  add(hx + 0.32, 0.752, hz + 0.24, 0.11, 0.01, sad ? 0.05 : 0.09, "#ffffff", "eye");
  add(hx + 0.11, 0.754, hz + 0.24, 0.06, 0.01, sad ? 0.05 : 0.08, "#2b2b5a", "eye");
  add(hx + 0.36, 0.754, hz + 0.24, 0.06, 0.01, sad ? 0.05 : 0.08, "#2b2b5a", "eye");
  add(hx + 0.21, 0.75, hz + 0.14, 0.08, 0.06, 0.1, shade(s.skin, 0.86), "head");
  if (s.glasses) {
    add(hx + 0.05, 0.758, hz + 0.22, 0.4, 0.01, 0.02, "#2a2a2a", "head");
    add(hx + 0.05, 0.758, hz + 0.22, 0.15, 0.01, 0.13, "#2a2a2a55", "head");
  }
  const talking = pose === "talk" || pose === "cheer";
  const mouth = talking ? 0.03 + Math.abs(Math.sin(t / 80)) * 0.05 : sad ? 0.02 : 0.025;
  if (s.beard) {
    add(hx + 0.05, 0.751, hz - 0.04, 0.4, 0.04, 0.18, s.beard, "head");
    add(hx + 0.17, 0.795, hz + 0.08 - mouth, 0.16, 0.01, mouth, "#5a1a1a", "mouth");
  } else {
    add(hx + 0.17, 0.753, hz + 0.08 - mouth, 0.16, 0.01, mouth, "#5a1a1a", "mouth");
  }
  if (s.hat) hatParts(s.hat, hx, hz, around);
  // Arms. Each returns the box of its fist, where an item is held.
  const arm = (side, mode) => {
    const x = side === "L" ? 0.02 : 0.8;
    const role = side === "L" ? "armL" : "armR";
    let fist;
    if (mode === "up") {
      const wave = Math.sin(t / 110 + (side === "L" ? 1 : 0)) * 0.03;
      add(x + wave, 0.38, bz + 0.62, 0.18, 0.24, 0.6, s.shirt, role);
      fist = B(x + wave + 0.02, 0.4, bz + 1.22, 0.14, 0.2, 0.13, s.skin, role);
    } else if (mode === "forward") {
      add(x, 0.38, bz + 0.46, 0.18, 0.6, 0.2, s.shirt, role);
      fist = B(x + 0.02, 0.98, bz + 0.48, 0.14, 0.14, 0.16, s.skin, role);
    } else {
      const swing = pose === "idle" ? Math.sin(t / 900 + seed + (side === "L" ? 0 : 2)) * 0.02 : 0;
      add(x, 0.38 + swing, bz + 0.09, 0.18, 0.24, 0.62 + slump, s.shirt, role);
      fist = B(x + 0.02, 0.4 + swing, bz - 0.04, 0.14, 0.2, 0.13, s.skin, role);
    }
    parts.push(fist);
    return fist;
  };
  const modes = { idle: ["down", "down"], talk: ["down", "up"], cheer: ["up", "up"], sad: ["down", "down"], point: ["down", "forward"] }[pose] || ["down", "down"];
  arm("L", modes[0]);
  const fist = arm("R", modes[1]);
  if (s.item && s.item !== "none") {
    const { grip, dir } = gripOf(fist, modes[1], s.item);
    const held = holdItem(s.item, grip, dir, t);
    parts.push(...held.parts);
    lights.push(...held.lights);
  }
  return { parts, lights };
}

// ------------------------------------------------------------------ props
const WOOD = "#8a5a2b";
const PLANK = "#b8894f";
const DARK = "#5e3b1c";
const STONE = "#8d9096";
const COBBLE = "#7a7a7a";
const LEAF = "#3f8a2c";

function torchAt(add, lights, x, y, z, lit, t) {
  add(x - 0.04, y - 0.04, z, 0.08, 0.08, 0.38, "#6b4527", "prop");
  if (lit) {
    const f = 0.1 + Math.abs(Math.sin(t / 110 + x * 3)) * 0.05;
    add(x - 0.07, y - 0.07, z + 0.38, 0.14, 0.14, f, "#ffb347", "flame");
    add(x - 0.035, y - 0.035, z + 0.4, 0.07, 0.07, f, "#fff3a0", "flame");
    lights.push([x, y, z + 0.48, "#ffb347"]);
  } else {
    add(x - 0.05, y - 0.05, z + 0.38, 0.1, 0.1, 0.06, "#3a3a3a", "prop");
  }
}

// Each prop: (opts) => { parts, lights }. opts: { done, t, n, color }.
export const PROPS = {
  house({ done, t, n = 0, open = false }) {
    const p = [];
    const lights = [];
    const add = (...a) => p.push(B(...a));
    add(0, 0, 0, 2, 2, 0.15, COBBLE, "prop");
    add(0.1, 0.1, 0.15, 1.8, 1.8, 1.3, PLANK, "prop");
    for (const [x, y] of [[0.05, 0.05], [1.75, 0.05], [0.05, 1.75], [1.75, 1.75]]) add(x, y, 0.15, 0.2, 0.2, 1.35, DARK, "prop");
    if (open) {
      // The doorway (warm inside when someone is home), the door swung out.
      add(0.75, 1.901, 0.15, 0.5, 0.02, 0.8, done ? "#ffcf7a" : "#1a1410", done ? "flame" : "prop");
      add(0.72, 1.92, 0.15, 0.05, 0.48, 0.8, DARK, "prop");
      add(0.66, 2.3, 0.5, 0.06, 0.06, 0.06, "#f2c14e", "prop");
    } else {
      add(0.75, 1.901, 0.15, 0.5, 0.02, 0.8, DARK, "prop");
      add(1.1, 1.92, 0.5, 0.06, 0.01, 0.06, "#f2c14e", "prop");
    }
    const win = done ? "#ffe08a" : "#2a3a4a";
    add(0.25, 1.902, 0.7, 0.35, 0.02, 0.35, win, done ? "flame" : "prop");
    add(1.902, 0.4, 0.7, 0.02, 0.35, 0.35, win, done ? "flame" : "prop");
    add(1.902, 1.1, 0.7, 0.02, 0.35, 0.35, win, done ? "flame" : "prop");
    for (let i = 0; i < 4; i += 1) add(-0.05 + i * 0.22, -0.05 + i * 0.22, 1.45 + i * 0.22, 2.1 - i * 0.44, 2.1 - i * 0.44, 0.22, i % 2 ? "#8a2a22" : "#a8322a", "prop");
    add(1.4, 0.3, 1.6, 0.3, 0.3, 0.6, COBBLE, "prop");
    if (done) {
      lights.push([0.42, 1.95, 0.88, "#ffe08a"], [1.95, 0.6, 0.88, "#ffe08a"], [1.95, 1.3, 0.88, "#ffe08a"]);
    }
    for (let i = 0; i < n; i += 1) torchAt(add, lights, 0.3 + i * 0.45, 2.15, 0.15, done, t);
    return { parts: p, lights };
  },
  torch({ done, t }) {
    const p = [];
    const lights = [];
    torchAt((...a) => p.push(B(...a)), lights, 0.5, 0.5, 0, done, t);
    return { parts: p, lights };
  },
  // lit: false → cold glass, no light. Just lit (since < 900 ms): the
  // flame hesitates, flickers, then holds.
  lantern({ t, lit = true, since = 1e9 }) {
    const p = [B(0.45, 0.45, 0, 0.1, 0.1, 1.4, "#3a3a3a", "prop"), B(0.45, 0.45, 1.4, 0.4, 0.1, 0.06, "#3a3a3a", "prop"),
      B(0.68, 0.38, 1.0, 0.24, 0.24, 0.32, "#3a3a3a", "prop")];
    if (lit === false) {
      p.push(B(0.7, 0.4, 1.03, 0.2, 0.2, 0.26, "#4a5560", "prop"), B(0.77, 0.47, 1.03, 0.06, 0.06, 0.08, "#2a2a2a", "prop"));
      return { parts: p, lights: [] };
    }
    const warm = since < 900 ? Math.min(1, since / 900) : 1;
    const flicker = since < 900 && Math.sin(since / 35) * Math.sin(since / 90) < -0.2;
    if (flicker) {
      p.push(B(0.7, 0.4, 1.03, 0.2, 0.2, 0.26, "#8a6a3a", "prop"));
      return { parts: p, lights: [] };
    }
    const h = (0.12 + 0.14 * warm) + Math.sin(t / 300) * 0.01;
    p.push(B(0.7, 0.4, 1.03, 0.2, 0.2, 0.26, "#ffe9b0", "flame"), B(0.75, 0.45, 1.05, 0.1, 0.1, h, "#ffb347", "flame"));
    return { parts: p, lights: [[0.8, 0.5, 1.16, "#ffd27a"]] };
  },
  campfire({ t, done = true }) {
    const p = [];
    const lights = [];
    p.push(B(0.15, 0.4, 0, 0.7, 0.18, 0.14, DARK, "prop"), B(0.4, 0.15, 0.08, 0.18, 0.7, 0.14, DARK, "prop"));
    for (const [x, y] of [[0.05, 0.05], [0.75, 0.05], [0.05, 0.75], [0.75, 0.75]]) p.push(B(x, y, 0, 0.2, 0.2, 0.12, COBBLE, "prop"));
    if (done) {
      const f = 0.25 + Math.abs(Math.sin(t / 130)) * 0.12;
      p.push(B(0.3, 0.3, 0.16, 0.4, 0.4, f, "#ff8a2a", "flame"), B(0.4, 0.4, 0.2, 0.2, 0.2, f + 0.1, "#ffe066", "flame"));
      lights.push([0.5, 0.5, 0.5, "#ff8a2a"]);
    }
    return { parts: p, lights };
  },
  well() {
    const p = [];
    for (const [x, y, w, d] of [[0, 0, 1.4, 0.2], [0, 1.2, 1.4, 0.2], [0, 0, 0.2, 1.4], [1.2, 0, 0.2, 1.4]]) p.push(B(x, y, 0, w, d, 0.6, COBBLE, "prop"));
    p.push(B(0.2, 0.2, 0, 1, 1, 0.45, "#2f6fd0", "prop"));
    p.push(B(0.05, 0.6, 0.6, 0.15, 0.15, 1.0, DARK, "prop"), B(1.2, 0.6, 0.6, 0.15, 0.15, 1.0, DARK, "prop"));
    p.push(B(-0.1, 0.3, 1.6, 1.6, 0.8, 0.12, "#a8322a", "prop"), B(0.62, 0.62, 0.9, 0.16, 0.16, 0.18, PLANK, "prop"));
    return { parts: p, lights: [] };
  },
  bridge({ done }) {
    const p = [];
    p.push(B(0, 0, -0.45, 1.2, 3, 0.46, "#1a1410", "prop"));
    p.push(B(0, 0, -0.1, 1.2, 0.08, 0.1, "#3a2a1a", "prop"), B(0, 2.92, -0.1, 1.2, 0.08, 0.1, "#3a2a1a", "prop"));
    const planks = done ? 6 : 3;
    for (let i = 0; i < 6; i += 1) {
      if (i >= planks && i % 2) continue;
      p.push(B(0.05, 0.1 + i * 0.47, 0.02, 1.1, 0.4, 0.08, i % 2 ? PLANK : shade(PLANK, 0.9), "prop"));
    }
    for (const [x, y] of [[-0.05, -0.1], [1.1, -0.1], [-0.05, 3.0], [1.1, 3.0]]) p.push(B(x, y, 0, 0.15, 0.15, 0.8, DARK, "prop"));
    p.push(B(0, -0.05, 0.62, 0.05, 3.1, 0.04, "#c9a86a", "prop"), B(1.15, -0.05, 0.62, 0.05, 3.1, 0.04, "#c9a86a", "prop"));
    return { parts: p, lights: [] };
  },
  fence() {
    const p = [];
    for (let i = 0; i < 3; i += 1) p.push(B(0.1, i * 0.5, 0, 0.12, 0.12, 0.6, PLANK, "prop"));
    p.push(B(0.12, 0, 0.42, 0.08, 1.1, 0.07, PLANK, "prop"), B(0.12, 0, 0.2, 0.08, 1.1, 0.07, PLANK, "prop"));
    return { parts: p, lights: [] };
  },
  board({ color = "#c9a86a" }) {
    const p = [B(0.1, 0.4, 0, 0.12, 0.12, 1.4, DARK, "prop"), B(1.3, 0.4, 0, 0.12, 0.12, 1.4, DARK, "prop"),
      B(0, 0.42, 0.6, 1.52, 0.1, 0.9, color, "prop"), B(0.15, 0.53, 0.75, 0.5, 0.01, 0.3, "#f5ecd7", "prop"),
      B(0.8, 0.53, 0.85, 0.55, 0.01, 0.4, "#f5ecd7", "prop"), B(-0.05, 0.38, 1.48, 1.62, 0.18, 0.08, "#a8322a", "prop")];
    return { parts: p, lights: [] };
  },
  chest({ done, open }) {
    const p = [B(0.1, 0.15, 0, 0.8, 0.7, 0.45, "#a0682a", "prop"), B(0.1, 0.849, 0.38, 0.8, 0.002, 0.04, "#3a2a1a", "prop")];
    if (!(open ?? !done)) p.push(B(0.1, 0.15, 0.45, 0.8, 0.7, 0.2, "#b8783a", "prop"), B(0.44, 0.85, 0.4, 0.12, 0.03, 0.14, "#c9c9c9", "prop"));
    else p.push(B(0.1, 0.0, 0.45, 0.8, 0.2, 0.6, "#b8783a", "prop"), B(0.3, 0.25, 0.4, 0.4, 0.4, 0.06, "#f2c14e", "prop"));
    return { parts: p, lights: [] };
  },
  barrel() {
    return { parts: [B(0.15, 0.15, 0, 0.7, 0.7, 0.85, "#8a5a2b", "prop"), B(0.13, 0.13, 0.15, 0.74, 0.74, 0.06, "#5a5a5a", "prop"),
      B(0.13, 0.13, 0.62, 0.74, 0.74, 0.06, "#5a5a5a", "prop"), B(0.2, 0.2, 0.85, 0.6, 0.6, 0.02, "#6b4527", "prop")], lights: [] };
  },
  crates({ n = 3 }) {
    const p = [];
    const spots = [[0, 0, 0], [0.75, 0.1, 0], [0.35, 0.3, 0.62], [0.1, 0.8, 0], [0.85, 0.85, 0]];
    for (let i = 0; i < Math.min(n, spots.length); i += 1) {
      const [x, y, z] = spots[i];
      p.push(B(x, y, z, 0.6, 0.6, 0.6, "#b8894f", "prop"), B(x - 0.005, y + 0.27, z, 0.61, 0.06, 0.6, DARK, "prop"));
    }
    return { parts: p, lights: [] };
  },
  anvil() {
    return { parts: [B(0.25, 0.3, 0, 0.5, 0.4, 0.15, "#3a3a40", "prop"), B(0.35, 0.35, 0.15, 0.3, 0.3, 0.25, "#45454c", "prop"),
      B(0.1, 0.25, 0.4, 0.8, 0.5, 0.2, "#50505a", "prop")], lights: [] };
  },
  furnace({ done = true, t }) {
    const p = [B(0, 0, 0, 1, 1, 1, "#6a6a6a", "prop"), B(0.25, 1.0, 0.15, 0.5, 0.02, 0.35, done ? "#ff8a2a" : "#1a1a1a", done ? "flame" : "prop")];
    const lights = done ? [[0.5, 1.05, 0.3, "#ff8a2a"]] : [];
    if (done) p.push(B(0.3, 1.01, 0.18, 0.4, 0.02, 0.15 + Math.abs(Math.sin(t / 150)) * 0.1, "#ffe066", "flame"));
    return { parts: p, lights };
  },
  forge({ t }) {
    const p = [B(0, 0, 0, 1.6, 1.2, 0.7, "#4a3a36", "prop"), B(0.2, 0.2, 0.7, 1.2, 0.8, 0.06, "#ff6a2a", "flame"),
      B(0.5, 0.4, 0.7, 0.6, 0.4, 0.08 + Math.abs(Math.sin(t / 140)) * 0.06, "#ffe066", "flame"), B(1.2, 0.3, 0.7, 0.3, 0.3, 1.4, "#5a4a44", "prop")];
    return { parts: p, lights: [[0.8, 0.6, 0.8, "#ff6a2a"]] };
  },
  workbench() {
    return { parts: [B(0, 0, 0, 1, 1, 0.9, "#a3753f", "prop"), B(-0.02, -0.02, 0.9, 1.04, 1.04, 0.1, "#7a5230", "prop"),
      B(0.1, 1.001, 0.3, 0.3, 0.01, 0.3, "#5a3a1a", "prop"), B(0.6, 1.001, 0.3, 0.3, 0.01, 0.3, "#5a3a1a", "prop"),
      B(0.2, 0.3, 1.0, 0.5, 0.3, 0.04, "#f5ecd7", "prop")], lights: [] };
  },
  bookshelf() {
    const p = [B(0, 0, 0, 1.6, 0.6, 1.8, WOOD, "prop")];
    const colors = ["#a8322a", "#2a5a8a", "#3a7a3a", "#8a6a2a", "#5a2a8a", "#c9a86a"];
    for (let row = 0; row < 3; row += 1) {
      for (let i = 0; i < 6; i += 1) p.push(B(0.1 + i * 0.24, 0.601, 0.15 + row * 0.56, 0.18, 0.01, 0.42, colors[(i + row * 2) % 6], "prop"));
    }
    return { parts: p, lights: [] };
  },
  lectern() {
    return { parts: [B(0.35, 0.35, 0, 0.3, 0.3, 0.8, WOOD, "prop"), B(0.15, 0.2, 0.8, 0.7, 0.6, 0.1, PLANK, "prop"),
      B(0.22, 0.28, 0.9, 0.56, 0.44, 0.05, "#f5ecd7", "prop"), B(0.49, 0.28, 0.9, 0.02, 0.44, 0.06, "#7a5230", "prop")], lights: [] };
  },
  cauldron({ t, color = "#7a3ad0" }) {
    const p = [B(0.1, 0.1, 0, 0.8, 0.8, 0.7, "#3a3a40", "prop"), B(0.2, 0.2, 0.7, 0.6, 0.6, 0.02, color, "flame")];
    for (let i = 0; i < 3; i += 1) {
      const z = 0.72 + ((t / 600 + i / 3) % 1) * 0.5;
      p.push(B(0.3 + i * 0.15, 0.4, z, 0.08, 0.08, 0.08, shade(color, 1.3), "flame"));
    }
    return { parts: p, lights: [[0.5, 0.5, 0.75, color]] };
  },
  potions() {
    const p = [B(0, 0.2, 0, 1.2, 0.6, 0.5, WOOD, "prop")];
    ["#e5534b", "#5ee6e0", "#b8f36b", "#e05ad0"].forEach((c, i) => {
      p.push(B(0.08 + i * 0.28, 0.35, 0.5, 0.16, 0.16, 0.2, c, "prop"), B(0.12 + i * 0.28, 0.39, 0.7, 0.08, 0.08, 0.08, "#dfe8f0", "prop"));
    });
    return { parts: p, lights: [[0.6, 0.45, 0.7, "#e05ad0"]] };
  },
  redstone({ done, t }) {
    const on = done || Math.sin(t / 500) > 0.3;
    const p = [];
    for (let i = 0; i < 4; i += 1) p.push(B(0.1 + i * 0.3, 0.45, 0, 0.22, 0.1, 0.02, on ? "#ff3a2a" : "#6a1a1a", on ? "flame" : "prop"));
    p.push(B(1.25, 0.2, 0, 0.6, 0.6, 0.6, on ? "#ffcf6a" : "#6a4a2a", on ? "flame" : "prop"));
    return { parts: p, lights: on ? [[1.55, 0.5, 0.5, "#ffcf6a"]] : [] };
  },
  levers({ done, n = 6, t }) {
    const p = [B(0, 0, 0, 2, 0.8, 1.2, "#5a5a60", "prop"), B(0.1, 0.801, 0.8, 1.8, 0.01, 0.3, "#3a3a40", "prop")];
    const lights = [];
    for (let i = 0; i < n; i += 1) {
      const up = done || (i % 2 === 0);
      const x = 0.15 + i * (1.7 / Math.max(1, n));
      p.push(B(x, 0.82, 0.35, 0.18, 0.08, 0.18, "#4a4a50", "prop"), B(x + 0.06, 0.88, up ? 0.5 : 0.25, 0.06, 0.06, 0.25, "#6b4527", "prop"));
      p.push(B(x + 0.04, 0.802, 0.88, 0.1, 0.01, 0.1, done ? "#6ad04a" : (i % 3 === 0 ? "#e5534b" : "#6ad04a"), "flame"));
    }
    p.push(B(1.6, 0.2, 1.2, 0.3, 0.3, 0.5 + Math.abs(Math.sin(t / 400)) * 0.05, "#7a7a80", "prop"));
    return { parts: p, lights };
  },
  portal({ done = true, t, color = "#9a4ae8" }) {
    const p = [];
    const O = "#1e1530";
    p.push(B(0, 0.4, 0, 0.3, 0.3, 2.4, O, "prop"), B(1.7, 0.4, 0, 0.3, 0.3, 2.4, O, "prop"));
    p.push(B(0, 0.4, 2.4, 2, 0.3, 0.3, O, "prop"), B(0, 0.4, 0, 2, 0.3, 0.2, O, "prop"));
    if (done) {
      for (let i = 0; i < 4; i += 1) {
        const f = 0.85 + 0.15 * Math.sin(t / 200 + i);
        p.push(B(0.3, 0.5, 0.2 + i * 0.55, 1.4, 0.1, 0.55, shade(color, f), "flame"));
      }
    }
    return { parts: p, lights: done ? [[1, 0.55, 1.2, color]] : [] };
  },
  gate({ open = false } = {}) {
    const p = [B(0, 0.3, 0, 0.5, 0.5, 2.2, STONE, "prop"), B(1.6, 0.3, 0, 0.5, 0.5, 2.2, STONE, "prop"),
      B(0, 0.3, 2.2, 2.1, 0.5, 0.45, shade(STONE, 1.05), "prop")];
    // Closed: one wooden door. Open: two leaves swung back to the walls.
    if (open) p.push(B(0.5, 0.35, 0, 0.06, 0.55, 1.9, "#4a3a2a", "prop"), B(1.54, 0.35, 0, 0.06, 0.55, 1.9, "#4a3a2a", "prop"));
    else p.push(B(0.5, 0.35, 0, 1.1, 0.06, 1.9, "#4a3a2a", "prop"));
    for (let i = 0; i < 5; i += 1) p.push(B(0.05 + i * 0.45, 0.3, 2.65, 0.25, 0.5, 0.25, STONE, "prop"));
    return { parts: p, lights: [] };
  },
  blocktower({ done, n = 4, floors: built }) {
    const p = [];
    const floors = built ? Math.min(n + 3, built) : done ? n : Math.max(1, Math.ceil(n / 2));
    for (let i = 0; i < floors; i += 1) {
      const w = 1.4 - i * 0.18;
      p.push(B((1.4 - w) / 2, (1.4 - w) / 2, i * 0.5, w, w, 0.5, i % 2 ? "#8d7a5f" : "#a08a6a", "prop"));
    }
    if (!done) p.push(B(1.5, 0.2, 0, 0.5, 0.5, 0.5, "#a08a6a", "prop"), B(1.6, 0.8, 0, 0.4, 0.4, 0.4, "#8d7a5f", "prop"));
    return { parts: p, lights: [] };
  },
  rocks() {
    return { parts: [B(0, 0, 0, 1.2, 1, 0.8, "#6f6a66", "prop"), B(0.5, 0.6, 0, 0.9, 0.8, 1.2, "#5e5a57", "prop"),
      B(0.2, 1.001, 0.3, 0.2, 0.01, 0.15, "#f2c14e", "prop"), B(0.9, 1.401, 0.6, 0.15, 0.01, 0.15, "#5fe0e0", "prop"),
      B(0.6, 1.401, 0.2, 0.15, 0.01, 0.12, "#e5534b", "prop")], lights: [] };
  },
  cave({ t }) {
    const p = [B(0, 0, 0, 2.2, 1.4, 1.8, "#5e5a57", "prop"), B(0.5, 1.39, 0, 1.2, 0.02, 1.2, "#0e0c0a", "prop"),
      B(0.2, 0.1, 1.8, 1.6, 1.0, 0.4, "#6f6a66", "prop")];
    const echo = (t / 900) % 1;
    p.push(B(1.1 - echo * 0.4, 1.5 + echo * 0.4, 0.6, 0.06, 0.06, 0.3 * (1 - echo), "#9fdcff", "flame"));
    return { parts: p, lights: [] };
  },
  crystal({ color = "#b48cf2" }) {
    return { parts: [B(0.3, 0.3, 0, 0.35, 0.35, 1.1, color, "flame"), B(0.7, 0.5, 0, 0.25, 0.25, 0.7, shade(color, 1.2), "flame"),
      B(0.1, 0.65, 0, 0.2, 0.2, 0.5, shade(color, 0.85), "flame")], lights: [[0.45, 0.45, 0.9, color]] };
  },
  beacon({ done, t }) {
    const p = [B(0, 0, 0, 1, 1, 0.3, "#6a8ab0", "prop"), B(0.15, 0.15, 0.3, 0.7, 0.7, 0.6, "#9fdcff", "prop")];
    const lights = [];
    if (done) {
      p.push(B(0.38, 0.38, 0.9, 0.24, 0.24, 2.4 + Math.sin(t / 300) * 0.1, "#bff4ff", "flame"));
      lights.push([0.5, 0.5, 1.6, "#9fdcff"]);
    } else {
      p.push(B(0.3, 0.3, 0.9, 0.4, 0.4, 0.06, "#e5534b", "flame"));
    }
    return { parts: p, lights };
  },
  turret({ color = "#7a7a80", t }) {
    const r = Math.sin(t / 700) * 0.06;
    return { parts: [B(0.1, 0.1, 0, 0.8, 0.8, 0.5, "#4a4a50", "prop"), B(0.2, 0.2, 0.5, 0.6, 0.6, 0.5, color, "prop"),
      B(0.4 + r, 0.75, 0.65, 0.2, 0.5, 0.18, "#2a2a2e", "prop"), B(0.3, 0.3, 1.0, 0.4, 0.4, 0.1, shade(color, 1.2), "prop")], lights: [] };
  },
  dummy() {
    return { parts: [B(0.45, 0.45, 0, 0.1, 0.1, 0.6, WOOD, "prop"), B(0.25, 0.35, 0.6, 0.5, 0.3, 0.6, "#e8d3a2", "prop"),
      B(0.3, 0.3, 1.2, 0.4, 0.4, 0.4, "#e8d3a2", "prop"), B(0.38, 0.701, 1.32, 0.24, 0.01, 0.16, "#e5534b", "prop")], lights: [] };
  },
  banner({ color = "#a8322a", t }) {
    return { parts: [B(0.45, 0.45, 0, 0.1, 0.1, 2.2, DARK, "prop"), B(0.1, 0.48, 2.1, 0.8, 0.06, 0.06, DARK, "prop"),
      B(0.15, 0.5, 1.1, 0.7, 0.04, 1.0 + Math.sin(t / 400) * 0.02, color, "prop"), B(0.35, 0.545, 1.5, 0.3, 0.01, 0.3, "#f2c14e", "prop")], lights: [] };
  },
  throne() {
    return { parts: [B(0, 0, 0, 1.2, 1.2, 0.3, "#a8322a", "prop"), B(0.2, 0.2, 0.3, 0.8, 0.8, 0.5, "#c9a24a", "prop"),
      B(0.2, 0.15, 0.8, 0.8, 0.2, 1.2, "#c9a24a", "prop"), B(0.3, 0.351, 0.8, 0.6, 0.01, 0.9, "#7a1a2a", "prop"),
      B(0.15, 0.1, 2.0, 0.9, 0.3, 0.15, "#f2c14e", "prop")], lights: [] };
  },
  chatboard({ t }) {
    const p = [B(0.45, 0.45, 0, 0.1, 0.1, 0.8, "#3a3a3a", "prop"), B(-0.2, 0.4, 0.8, 1.4, 0.1, 1.0, "#1a1a1e", "prop")];
    const lines = ["#f2c14e", "#ffffff", "#9fdcff", "#ffffff"];
    lines.forEach((c, i) => p.push(B(-0.1, 0.501, 1.6 - i * 0.2, 0.4 + ((i * 37) % 7) / 10, 0.01, 0.07, c, "prop")));
    p.push(B(-0.1, 0.501, 0.88, 0.06, 0.01, 0.1 * (Math.floor(t / 400) % 2), "#ffffff", "prop"));
    return { parts: p, lights: [] };
  },
  podium() {
    return { parts: [B(0.6, 0, 0, 0.6, 0.8, 0.9, "#f2c14e", "prop"), B(0, 0, 0, 0.6, 0.8, 0.6, "#c9c9d0", "prop"),
      B(1.2, 0, 0, 0.6, 0.8, 0.4, "#c98a4a", "prop"), B(0.8, 0.801, 0.4, 0.2, 0.01, 0.3, "#2a2a2a", "prop")], lights: [] };
  },
  maptable() {
    return { parts: [B(0, 0, 0, 1.6, 1, 0.8, WOOD, "prop"), B(0.1, 0.1, 0.8, 1.4, 0.8, 0.03, "#e8d3a2", "prop"),
      B(0.3, 0.3, 0.83, 0.4, 0.3, 0.01, "#3a7a3a", "prop"), B(0.8, 0.4, 0.83, 0.3, 0.3, 0.01, "#2f6fd0", "prop"),
      B(1.15, 0.2, 0.83, 0.15, 0.15, 0.01, "#e5534b", "prop")], lights: [] };
  },
  fountain({ t, color = "#5ee6e0" }) {
    const p = [B(0, 0, 0, 1.6, 1.6, 0.35, "#a5a8ad", "prop"), B(0.15, 0.15, 0.2, 1.3, 1.3, 0.16, "#2f6fd0", "prop"),
      B(0.6, 0.6, 0.35, 0.4, 0.4, 0.9, "#a5a8ad", "prop")];
    for (let i = 0; i < 4; i += 1) {
      const k = ((t / 700) + i / 4) % 1;
      p.push(B(0.7 + Math.cos(i * 1.6) * k * 0.6, 0.7 + Math.sin(i * 1.6) * k * 0.6, 1.3 + Math.sin(k * Math.PI) * 0.4 - k * 0.6, 0.12, 0.12, 0.12, color, "flame"));
    }
    return { parts: p, lights: [[0.8, 0.8, 1.3, color]] };
  },
  spawner({ t }) {
    const p = [B(0, 0, 0, 1, 1, 1, "#2a2a3a55", "prop")];
    for (const [x, y] of [[0, 0], [0.9, 0], [0, 0.9], [0.9, 0.9]]) p.push(B(x, y, 0, 0.1, 0.1, 1, "#3a3a4a", "prop"));
    p.push(B(0, 0, 0.9, 1, 1, 0.1, "#3a3a4a", "prop"));
    const r = 0.15 + Math.abs(Math.sin(t / 250)) * 0.1;
    p.push(B(0.5 - r / 2, 0.5 - r / 2, 0.35, r, r, r, "#e5534b", "flame"));
    return { parts: p, lights: [[0.5, 0.5, 0.45, "#ff5a3a"]] };
  },
  storm({ done, t }) {
    if (done) return { parts: [B(0.2, 0.2, 3.2, 1.2, 0.8, 0.3, "#ffffff", "prop"), B(0.5, 0.4, 3.45, 0.7, 0.5, 0.25, "#ffffff", "prop")], lights: [] };
    const p = [B(0, 0, 3.0, 1.8, 1.2, 0.4, "#3a3a4a", "prop"), B(0.4, 0.3, 3.35, 1.0, 0.7, 0.3, "#4a4a5a", "prop")];
    for (let i = 0; i < 5; i += 1) {
      const k = ((t / 500) + i / 5) % 1;
      p.push(B(0.2 + i * 0.32, 0.5, 3.0 - k * 2.8, 0.04, 0.04, 0.2, "#9fdcff", "prop"));
    }
    if (Math.floor(t / 700) % 4 === 0) p.push(B(0.9, 0.6, 1.6, 0.08, 0.08, 1.4, "#fff3a0", "flame"));
    return { parts: p, lights: [] };
  },
  sensor({ done, t }) {
    const p = [B(0.15, 0.15, 0, 0.7, 0.7, 0.7, "#7a7a80", "prop"), B(0.45, 0.45, 0.7, 0.08, 0.08, 0.6, "#5a5a60", "prop"),
      B(0.38, 0.38, 1.3, 0.22, 0.22, 0.1, done ? "#6ad04a" : (Math.floor(t / 300) % 2 ? "#e5534b" : "#6a1a1a"), "flame")];
    if (!done) p.push(B(0.3, 0.851, 0.2, 0.04, 0.01, 0.4, "#1a1a1a", "prop"), B(0.34, 0.851, 0.45, 0.2, 0.01, 0.04, "#1a1a1a", "prop"));
    return { parts: p, lights: [[0.5, 0.5, 1.35, done ? "#6ad04a" : "#e5534b"]] };
  },
  stacks({ n = 3 }) {
    const p = [];
    const colors = ["#8d7a5f", "#6aa84f", "#a0682a", "#7a7a80", "#c9a86a"];
    for (let i = 0; i < n; i += 1) {
      const h = 0.25 + ((i * 7) % 5) * 0.15;
      p.push(B((i % 3) * 0.55, Math.floor(i / 3) * 0.55, 0, 0.45, 0.45, h, colors[i % colors.length], "prop"));
    }
    return { parts: p, lights: [] };
  },
  toolrack() {
    const p = [B(0, 0.4, 0, 0.1, 0.1, 1.4, DARK, "prop"), B(1.5, 0.4, 0, 0.1, 0.1, 1.4, DARK, "prop"), B(0, 0.42, 1.2, 1.6, 0.08, 0.1, WOOD, "prop")];
    ["#9fd0e0", "#8d939a", "#f2c14e", "#dfe8f0"].forEach((c, i) => {
      p.push(B(0.25 + i * 0.32, 0.5, 0.5, 0.05, 0.03, 0.7, "#6b4527", "prop"), B(0.18 + i * 0.32, 0.5, 1.0, 0.2, 0.03, 0.12, c, "prop"));
    });
    return { parts: p, lights: [] };
  },
  hay() {
    return { parts: [B(0, 0, 0, 0.9, 0.9, 0.7, "#e2c36a", "prop"), B(-0.01, 0.3, 0, 0.92, 0.06, 0.72, "#a8322a", "prop"),
      B(0.6, 0.6, 0, 0.8, 0.8, 0.6, "#d8b85a", "prop")], lights: [] };
  },
  flowers() {
    const p = [];
    ["#e5534b", "#f2c14e", "#ffffff", "#7aa7ff", "#e05ad0", "#f2c14e"].forEach((c, i) => {
      const x = (i % 3) * 0.35 + 0.1;
      const y = Math.floor(i / 3) * 0.4 + 0.1;
      p.push(B(x + 0.04, y + 0.04, 0, 0.04, 0.04, 0.25, "#3f7f2c", "prop"), B(x, y, 0.25, 0.12, 0.12, 0.1, c, "prop"));
    });
    return { parts: p, lights: [] };
  },
  tree() {
    return { parts: [B(0.35, 0.35, 0, 0.3, 0.3, 1.2, "#6b4527", "prop"), B(-0.3, -0.3, 1.2, 1.6, 1.6, 1.0, LEAF, "prop"),
      B(0.05, 0.05, 2.2, 0.9, 0.9, 0.5, "#4f9a35", "prop")], lights: [] };
  },
  minecart() {
    const p = [];
    for (let i = 0; i < 3; i += 1) p.push(B(0.2 + i * 0.45, 0, 0, 0.12, 1.4, 0.04, "#6b6b6b", "prop"));
    p.push(B(0, 0.3, 0, 1.4, 0.08, 0.06, DARK, "prop"), B(0, 1.0, 0, 1.4, 0.08, 0.06, DARK, "prop"));
    p.push(B(0.15, 0.25, 0.1, 1.1, 0.9, 0.5, "#7a7a80", "prop"), B(0.25, 0.35, 0.6, 0.9, 0.7, 0.15, "#5e5a57", "prop"));
    return { parts: p, lights: [] };
  },
  tent({ color = "#c9a86a" }) {
    const p = [];
    for (let i = 0; i < 4; i += 1) p.push(B(i * 0.2, 0, i * 0.35, 1.6 - i * 0.4, 1.6, 0.35, i % 2 ? color : shade(color, 0.9), "prop"));
    p.push(B(0.6, 1.601, 0, 0.4, 0.01, 0.6, "#3a2a1a", "prop"));
    return { parts: p, lights: [] };
  },
  clock({ t }) {
    const a = t / 1000;
    return { parts: [B(0.2, 0.4, 0, 0.6, 0.3, 1.8, WOOD, "prop"), B(0.25, 0.701, 1.2, 0.5, 0.01, 0.5, "#f5ecd7", "prop"),
      B(0.48 + Math.cos(a) * 0.12, 0.703, 1.43 + Math.sin(a) * 0.12, 0.05, 0.005, 0.05, "#2a2a2a", "prop"),
      B(0.45, 0.702, 0.4, 0.1, 0.005, 0.5 + Math.sin(t / 300) * 0.05, "#f2c14e", "prop")], lights: [] };
  },
  // The altar of the last level: an old stone table where a shard of the
  // Heart of the World resonates.
  altar({ t, done }) {
    const p = [B(0.1, 0.1, 0, 1.8, 1.8, 0.3, "#41385a", "prop"), B(0.3, 0.3, 0.3, 1.4, 1.4, 0.55, "#2f2843", "prop"),
      B(0.25, 0.25, 0.85, 1.5, 1.5, 0.1, "#d9a640", "prop"), B(0.4, 0.4, 0.95, 1.2, 1.2, 0.05, "#4b4168", "prop")];
    const glow = done ? "#ff5a7a" : "#c62d4a";
    const f = Math.sin(t / 600) * 0.06;
    p.push(B(0.82, 0.82, 1.2 + f, 0.36, 0.36, 0.36, glow, "flame"), B(0.92, 0.92, 1.56 + f, 0.16, 0.16, 0.14, "#ffe7a0", "flame"));
    for (const [x, y] of [[0.15, 0.15], [1.65, 0.15], [0.15, 1.65], [1.65, 1.65]]) p.push(B(x, y, 0.3, 0.2, 0.2, 0.75, "#9ff7f2", "flame"));
    return { parts: p, lights: [[1, 1, 1.4, glow], [0.25, 0.25, 0.9, "#9ff7f2"], [1.75, 1.75, 0.9, "#9ff7f2"]] };
  },
  heart({ t }) {
    const k = 1 + Math.abs(Math.sin(t / 350)) * 0.15;
    const p = [B(0.5 - 0.4 * k, 0.5 - 0.4 * k, 0.2, 0.8 * k, 0.8 * k, 0.8 * k, "#e5534b", "flame"),
      B(0.3, 0.3, 0, 0.4, 0.4, 0.2, "#4a3a3a", "prop")];
    return { parts: p, lights: [[0.5, 0.5, 0.6, "#ff5a5a"]] };
  },
};

export const PROP_NAMES = Object.keys(PROPS);

export function propParts(type, opts) {
  const make = PROPS[type];
  if (!make) return { parts: [], lights: [] };
  return make(opts);
}
