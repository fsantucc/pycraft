// Voxel models. The model of an object is chosen from its class name
// (and inherited from its parent class when the name is unknown), and is
// driven by the object's real attributes (color, fuel, power…).
import { hashColor } from "./util.js";

const COLORS = {
  red: "#c83b30", rouge: "#c83b30", blue: "#3a5ec8", bleu: "#3a5ec8", bleue: "#3a5ec8",
  green: "#4f9a35", vert: "#4f9a35", verte: "#4f9a35", yellow: "#e9c73a", jaune: "#e9c73a",
  white: "#eeeeee", blanc: "#eeeeee", blanche: "#eeeeee", black: "#252525", noir: "#252525",
  noire: "#252525", pink: "#ee9ab8", rose: "#ee9ab8", purple: "#8a4fc8", violet: "#8a4fc8",
  orange: "#ec8a2c", brown: "#7a5230", marron: "#7a5230", gray: "#8a8a8a", grey: "#8a8a8a",
  gris: "#8a8a8a", cyan: "#4fd0d0", lime: "#86d63a", gold: "#f2c14e", or: "#f2c14e",
  iron: "#d0d0d0", fer: "#d0d0d0", diamond: "#5fe0e0", diamant: "#5fe0e0", wood: "#9b7445",
  bois: "#9b7445", stone: "#7d7d7d", pierre: "#7d7d7d", netherite: "#4a4040",
};

export function colorFrom(value) {
  if (!value || value.t !== "str") return null;
  const text = value.r.replace(/^['"]|['"]$/g, "").toLowerCase();
  for (const [name, hex] of Object.entries(COLORS)) if (text.includes(name)) return hex;
  return null;
}

function attr(attrs, ...names) {
  for (const n of names) {
    if (attrs[n] !== undefined) return attrs[n];
    if (attrs["_" + n] !== undefined) return attrs["_" + n];
  }
  return undefined;
}

function num(v) {
  return v && (v.t === "int" || v.t === "float") ? Number(v.r) : null;
}

const B = (x, y, z, w, d, h, c, role) => ({ x, y, z, w, d, h, c, role });

function shadeColor(hex, f) {
  if (!hex.startsWith("#")) return hex;
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.min(255, Math.round(v * f)).toString(16).padStart(2, "0");
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
}

// The town crier: a villager in a red and gold robe, with a hat and a bell.
export function crierParts(ringing) {
  const parts = humanoid({ head: "#d4a373", body: "#a8322a", legs: "#5a2a20", arms: "#8c2a22", nose: true });
  const L = 0.75;
  parts.push(
    B(0.18, 0.2, L + 1.25, 0.64, 0.6, 0.08, "#2b2118", "head"),
    B(0.3, 0.32, L + 1.33, 0.4, 0.36, 0.22, "#2b2118", "head"),
    B(0.31, 0.33, L + 1.36, 0.38, 0.34, 0.05, "#f2c14e", "head"),
    B(0.22, 0.672, L + 0.1, 0.56, 0.01, 0.6, "#f2c14e", "body"),
    B(0.22, 0.673, L + 0.5, 0.56, 0.01, 0.08, "#2b2118", "body"),
  );
  const arm = parts.find((p) => p.role === "armR");
  if (ringing) {
    arm.z += 0.55;
    arm.h = 0.6;
  }
  parts.push(B(0.86, 0.42, arm.z + arm.h - 0.05, 0.16, 0.16, 0.18, "#f2c14e", "bell"),
    B(0.9, 0.46, arm.z + arm.h + 0.12, 0.08, 0.08, 0.08, "#7a5a1a", "bell"));
  return parts;
}

function humanoid({ head = "#c99a6c", body = "#39a0c4", legs = "#3b3b8f", arms = null, scale = 1,
  hair = null, nose = false, eyes = null, tall = 1 }) {
  const s = scale;
  const L = 0.75 * s * tall;
  const parts = [
    B(0.22 * s, 0.35 * s, 0, 0.26 * s, 0.3 * s, L, legs, "legL"),
    B(0.52 * s, 0.35 * s, 0, 0.26 * s, 0.3 * s, L, legs, "legR"),
    B(0.22 * s, 0.33 * s, L, 0.56 * s, 0.34 * s, 0.75 * s, body, "body"),
    B(0.02 * s, 0.37 * s, L + 0.05 * s, 0.2 * s, 0.26 * s, 0.68 * s, arms || body, "armL"),
    B(0.78 * s, 0.37 * s, L + 0.05 * s, 0.2 * s, 0.26 * s, 0.68 * s, arms || body, "armR"),
    B(0.25 * s, 0.25 * s, L + 0.75 * s, 0.5 * s, 0.5 * s, 0.5 * s, head, "head"),
  ];
  if (hair) parts.push(B(0.24 * s, 0.24 * s, L + 1.12 * s, 0.52 * s, 0.52 * s, 0.14 * s, hair, "head"));
  if (nose) parts.push(B(0.44 * s, 0.75 * s, L + 0.8 * s, 0.12 * s, 0.12 * s, 0.22 * s, shadeColor(head, 0.85), "head"));
  if (eyes) {
    parts.push(B(0.3 * s, 0.751 * s, L + 1.0 * s, 0.4 * s, 0.01, 0.08 * s, eyes, "eye"));
  } else {
    parts.push(B(0.3 * s, 0.752 * s, L + 0.98 * s, 0.13 * s, 0.01, 0.1 * s, "#f4f4f4", "eye"),
      B(0.57 * s, 0.752 * s, L + 0.98 * s, 0.13 * s, 0.01, 0.1 * s, "#f4f4f4", "eye"),
      B(0.37 * s, 0.754 * s, L + 0.98 * s, 0.06 * s, 0.01, 0.1 * s, "#2b2b5a", "eye"),
      B(0.64 * s, 0.754 * s, L + 0.98 * s, 0.06 * s, 0.01, 0.1 * s, "#2b2b5a", "eye"));
  }
  parts.push(B(0.22 * s, 0.33 * s, L + 0.02 * s, 0.56 * s, 0.341 * s, 0.1 * s, shadeColor(body, 0.7), "body"));
  return parts;
}

function quadruped({ body, head = body, legs = body, scale = 1, low = false, eyes = null, extra = [] }) {
  const s = scale;
  const lh = low ? 0.2 : 0.4;
  const parts = [
    B(0.12 * s, 0.25 * s, 0, 0.18 * s, 0.18 * s, lh * s, legs, "legL"),
    B(0.7 * s, 0.25 * s, 0, 0.18 * s, 0.18 * s, lh * s, legs, "legR"),
    B(0.12 * s, 0.62 * s, 0, 0.18 * s, 0.18 * s, lh * s, legs, "legR"),
    B(0.7 * s, 0.62 * s, 0, 0.18 * s, 0.18 * s, lh * s, legs, "legL"),
    B(0.08 * s, 0.22 * s, lh * s, 0.84 * s, 0.6 * s, 0.45 * s, body, "body"),
    B(0.3 * s, 0.72 * s, (lh + 0.2) * s, 0.42 * s, 0.38 * s, 0.4 * s, head, "head"),
  ];
  const eyeColor = eyes || "#1b1b1b";
  parts.push(B(0.34 * s, 1.102 * s, (lh + 0.42) * s, 0.09 * s, 0.01, 0.09 * s, eyeColor, "eye"),
    B(0.59 * s, 1.102 * s, (lh + 0.42) * s, 0.09 * s, 0.01, 0.09 * s, eyeColor, "eye"),
    B(0.43 * s, 1.102 * s, (lh + 0.24) * s, 0.16 * s, 0.01, 0.1 * s, shadeColor(head, 0.75), "head"));
  return parts.concat(extra);
}

function block(color, { w = 0.9, h = 0.9, top = null, front = null } = {}) {
  const o = (1 - w) / 2;
  const parts = [B(o, o, 0, w, w, h, color, "body")];
  if (top) parts.push(B(o + 0.05, o + 0.05, h, w - 0.1, w - 0.1, 0.06, top, "body"));
  if (front) parts.push(B(o + 0.2, o + w, 0.2, w - 0.4, 0.01, h * 0.45, front, "body"));
  return parts;
}

function stand(item) {
  return [
    B(0.3, 0.3, 0, 0.4, 0.4, 0.1, "#6b6b6b", "body"),
    B(0.45, 0.45, 0.1, 0.1, 0.1, 0.9, "#9b7445", "body"),
    ...item,
  ];
}

const MODELS = [
  { keys: ["zombie"], make: () => humanoid({ head: "#4f8a3c", body: "#2f8f9a", legs: "#3b3b8f", arms: "#4f8a3c" }) },
  { keys: ["creeper"], make: () => [
    B(0.25, 0.2, 0, 0.5, 0.25, 0.35, "#58b043", "legL"), B(0.25, 0.55, 0, 0.5, 0.25, 0.35, "#58b043", "legR"),
    B(0.25, 0.3, 0.35, 0.5, 0.4, 0.9, "#5fbe48", "body"), B(0.2, 0.25, 1.25, 0.6, 0.55, 0.55, "#6acb52", "head"),
    B(0.3, 0.801, 1.42, 0.4, 0.01, 0.2, "#1d2a18", "head")] },
  { keys: ["enderman"], make: () => humanoid({ head: "#151515", body: "#181818", legs: "#121212", tall: 1.7, eyes: "#c060ff" }) },
  { keys: ["golem"], make: () => humanoid({ head: "#d7d2c4", body: "#c8c3b5", legs: "#b0ab9e", scale: 1.15, nose: true, eyes: "#a8341f" }) },
  { keys: ["wither"], make: () => [
    B(0.3, 0.35, 0, 0.4, 0.3, 1.0, "#2a2a2a", "body"), B(0, 0.35, 1.0, 1, 0.3, 0.25, "#2a2a2a", "body"),
    B(0.32, 0.3, 1.25, 0.36, 0.4, 0.36, "#1b1b1b", "head"), B(-0.1, 0.32, 1.2, 0.3, 0.34, 0.3, "#1b1b1b", "head"),
    B(0.8, 0.32, 1.2, 0.3, 0.34, 0.3, "#1b1b1b", "head")] },
  { keys: ["dragon"], make: () => quadruped({ body: "#1a1424", head: "#221a2e", legs: "#120e18", scale: 1.5, eyes: "#d060ff",
    extra: [B(-0.4, 0.4, 0.9, 0.5, 0.6, 0.08, "#2b2240", "armL"), B(1.4, 0.4, 0.9, 0.5, 0.6, 0.08, "#2b2240", "armR")] }) },
  { keys: ["sheep", "mouton", "brebis"], make: (a) => quadruped({ body: colorFrom(attr(a, "wool_color", "color", "couleur")) || "#eeeeee",
    head: "#d9c7b0", legs: "#d9c7b0" }), tinted: true },
  { keys: ["cow", "vache"], make: () => quadruped({ body: "#5a3d2a", head: "#4a3020", legs: "#d8d0c4",
    extra: [B(0.3, 0.3, 0.86, 0.3, 0.3, 0.01, "#efefef", "body")] }) },
  { keys: ["pig", "cochon"], make: () => quadruped({ body: "#ef9fa5", head: "#f2aab0", low: true }) },
  { keys: ["wolf", "loup", "dog", "chien", "fox", "renard"], make: () => quadruped({ body: "#c7c7c7", head: "#d7d7d7", eyes: "#222" }) },
  { keys: ["spider", "araignee", "araignée"], make: () => quadruped({ body: "#34302b", head: "#2b2723", legs: "#1f1c19", low: true, eyes: "#e02020",
    extra: [B(-0.2, 0.4, 0.15, 0.3, 0.08, 0.08, "#1f1c19", "legL"), B(0.9, 0.4, 0.15, 0.3, 0.08, 0.08, "#1f1c19", "legR")] }) },
  { keys: ["cat", "chat", "ocelot", "lynx"], make: () => quadruped({ body: "#e3b85a", head: "#e8c26c", scale: 0.8, eyes: "#3fa03f" }) },
  { keys: ["horse", "cheval"], make: () => quadruped({ body: "#8a5a2b", head: "#7a4a22", legs: "#6b3f1c", scale: 1.25 }) },
  { keys: ["chicken", "poule"], make: () => [B(0.3, 0.3, 0.2, 0.4, 0.45, 0.4, "#f4f4f4", "body"), B(0.35, 0.6, 0.5, 0.3, 0.25, 0.35, "#f4f4f4", "head"),
    B(0.42, 0.85, 0.65, 0.16, 0.12, 0.08, "#f2a33a", "head"), B(0.35, 0.4, 0, 0.08, 0.08, 0.2, "#f2a33a", "legL"), B(0.57, 0.4, 0, 0.08, 0.08, 0.2, "#f2a33a", "legR")] },
  { keys: ["bee", "abeille"], make: () => [B(0.3, 0.3, 0.5, 0.4, 0.5, 0.35, "#f0c330", "body"), B(0.3, 0.45, 0.5, 0.4, 0.1, 0.35, "#2a2a2a", "body"),
    B(0.35, 0.4, 0.86, 0.3, 0.2, 0.04, "#cfe8ff", "armL")] },
  { keys: ["bat", "chauve"], make: () => [B(0.4, 0.4, 0.9, 0.2, 0.2, 0.25, "#3a2f28", "body"), B(0.05, 0.42, 1.0, 0.35, 0.15, 0.05, "#2a201a", "armL"),
    B(0.6, 0.42, 1.0, 0.35, 0.15, 0.05, "#2a201a", "armR")] },
  { keys: ["slime"], make: (a) => { const s = Math.min(1.2, 0.4 + 0.15 * (num(attr(a, "size", "taille")) || 2)); const o = (1 - s) / 2;
    return [B(o, o, 0, s, s, s, "#77d16a", "body"), B(o + s * 0.2, o + s + 0.001, s * 0.55, s * 0.6, 0.01, s * 0.12, "#2c5a24", "body")]; } },
  { keys: ["villager", "villageois", "worker", "ouvrier", "farmer", "fermier", "builder", "batisseur", "apprenti", "trader", "marchand", "alchemist", "alchimiste"],
    make: (a, name) => humanoid({ head: "#c99a6c", body: /build|bati/.test(name) ? "#a0632e" : /farm|ferm/.test(name) ? "#5d8a35" : "#7a5230",
      legs: "#5a3a20", arms: "#6b4527", nose: true }) },
  { keys: ["miner", "mineur"], make: (a, name) => humanoid({ head: "#c99a6c", body: /master|maitre|maître/.test(name) ? "#6a4fb0" : "#646464",
    legs: "#3c3c3c", nose: true, hair: "#f2c14e" }).concat([B(0.95, 0.45, 1.2, 0.1, 0.1, 0.6, "#9b7445", "armR"), B(0.8, 0.4, 1.75, 0.4, 0.2, 0.1, "#bfbfbf", "armR")]) },
  { keys: ["player", "joueur", "steve", "alex", "hero", "héros", "knight", "chevalier", "fighter", "combattant", "archer", "guard", "garde", "warrior", "guerrier"],
    make: () => humanoid({ head: "#c99a6c", hair: "#4a2f1a", body: "#36a3b8", legs: "#3b3b8f", arms: "#c99a6c" }) },
  { keys: ["chest", "coffre", "vault", "inventory", "inventaire", "box", "boite", "boîte", "backpack", "sac", "bag", "bank"],
    make: (a) => { const locked = attr(a, "locked", "is_locked"); const parts = block("#9b6a2f", { w: 0.86, h: 0.8, top: "#86592a" });
      parts.push(B(0.44, 0.931, 0.45, 0.12, 0.01, 0.18, locked && locked.r === "True" ? "#c0392b" : "#d8c27a", "body")); return parts; } },
  { keys: ["furnace", "four", "forge"], make: (a) => { const fuel = num(attr(a, "fuel", "combustible"));
    return block("#7a7a7a", { h: 0.95, front: fuel && fuel > 0 ? "#f39c3d" : "#2b2b2b" }); } },
  { keys: ["cauldron", "chaudron"], make: (a) => { const lvl = num(attr(a, "level")) || 0; const cap = num(attr(a, "capacity")) || 3;
    const parts = [B(0.1, 0.1, 0, 0.8, 0.8, 0.75, "#3d3d3d", "body")]; if (lvl > 0) parts.push(B(0.18, 0.18, 0.75, 0.64, 0.64, 0.01 + 0.0, "#3f76e4", "body"));
    parts[0].h = 0.55 + 0.2 * Math.min(1, lvl / Math.max(1, cap)); return parts; } },
  { keys: ["minecart", "wagon", "cart", "vehicle", "vehicule", "véhicule"], make: () => [
    B(0.05, 0.15, 0, 0.9, 0.7, 0.04, "#6b5a45", "body"), B(0.1, 0.2, 0.12, 0.8, 0.6, 0.45, "#8f8f8f", "body"),
    B(0.15, 0.25, 0.52, 0.7, 0.5, 0.05, "#5c5c5c", "body"), B(0.15, 0.12, 0.02, 0.15, 0.08, 0.15, "#333", "legL"), B(0.7, 0.12, 0.02, 0.15, 0.08, 0.15, "#333", "legR")] },
  { keys: ["boat", "bateau", "raft", "radeau", "galion", "ship"], make: () => [
    B(0.05, 0.2, 0, 0.9, 0.6, 0.12, "#8f6435", "body"), B(0.05, 0.2, 0.12, 0.9, 0.08, 0.25, "#a37442", "body"),
    B(0.05, 0.72, 0.12, 0.9, 0.08, 0.25, "#a37442", "body"), B(0.45, 0.35, 0.12, 0.08, 0.3, 0.7, "#6b4527", "body")] },
  { keys: ["pickaxe", "pioche"], make: (a) => stand([B(0.2, 0.45, 0.95, 0.6, 0.1, 0.12, colorFrom(attr(a, "material", "materiau")) || "#bfbfbf", "armR")]) },
  { keys: ["sword", "epee", "épée", "blade", "lame", "weapon", "arme"], make: (a) => stand([B(0.46, 0.46, 0.8, 0.08, 0.08, 0.75, colorFrom(attr(a, "material", "enchantment")) || "#d8e6f0", "armR"),
    B(0.35, 0.44, 0.78, 0.3, 0.12, 0.06, "#8a6a3a", "armR")]) },
  { keys: ["bow", "arc"], make: () => stand([B(0.48, 0.3, 0.7, 0.06, 0.06, 0.7, "#8a5a2b", "armR"), B(0.5, 0.65, 0.7, 0.02, 0.02, 0.7, "#ddd", "armR")]) },
  { keys: ["tool", "outil", "hammer", "marteau"], make: () => stand([B(0.3, 0.45, 0.95, 0.4, 0.1, 0.2, "#9aa3ad", "armR")]) },
  { keys: ["beacon", "balise", "lamp", "lampe", "lantern", "lanterne", "torch", "torche", "light"], make: (a) => {
    const p = num(attr(a, "power", "puissance", "on")) ?? 1;
    const parts = block("#bfe8f0", { w: 0.8, h: 0.8 }); parts.push(B(0.3, 0.3, 0.1, 0.4, 0.4, 0.5, p > 0 ? "#5ee6e0" : "#2b3a3d", "body"));
    if (p > 0) parts.push(B(0.42, 0.42, 0.8, 0.16, 0.16, 0.4 + 0.5 * p, "#9ff7f2", "beam")); return parts; } },
  { keys: ["turret", "tourelle", "cannon", "canon"], make: (a, name) => { const frost = /frost|givre|ice|glace/.test(name);
    return [B(0.1, 0.1, 0, 0.8, 0.8, 0.7, frost ? "#9fd6ef" : "#7d7d7d", "body"), B(0.25, 0.25, 0.7, 0.5, 0.5, 0.35, frost ? "#cfeefa" : "#5f5f5f", "head"),
      B(0.42, 0.7, 0.8, 0.16, 0.5, 0.16, "#333", "head")]; } },
  { keys: ["portal", "portail"], make: () => [B(0, 0.45, 0, 0.25, 0.2, 1.8, "#1e1530", "body"), B(0.75, 0.45, 0, 0.25, 0.2, 1.8, "#1e1530", "body"),
    B(0, 0.45, 1.8, 1, 0.2, 0.25, "#1e1530", "body"), B(0, 0.45, 0, 1, 0.2, 0.2, "#1e1530", "body"), B(0.25, 0.5, 0.2, 0.5, 0.1, 1.6, "#8a3ff2", "beam")] },
  { keys: ["potion", "fiole", "bottle", "flask", "egg", "oeuf", "œuf"], make: (a, name) => {
    if (/egg|oeuf|œuf/.test(name)) return [B(0.35, 0.35, 0, 0.3, 0.3, 0.4, /gold|or/.test(name) ? "#f2c14e" : "#efe6d2", "body")];
    const s = num(attr(a, "strength", "force")) || 0;
    return [B(0.35, 0.35, 0, 0.3, 0.3, 0.32, s > 1 ? "#c0392b" : s > 0 ? "#8a3ff2" : "#3f76e4", "body"), B(0.42, 0.42, 0.32, 0.16, 0.16, 0.14, "#dfe8ec", "body")]; } },
  { keys: ["house", "maison", "cabane", "hut"], make: () => [B(-0.2, -0.2, 0, 1.4, 1.4, 0.9, "#b08a55", "body"), B(-0.3, -0.3, 0.9, 1.6, 1.6, 0.18, "#7a4a2a", "body"),
    B(0.1, 0.1, 1.08, 0.8, 0.8, 0.25, "#6b3f22", "body"), B(0.4, 1.201, 0, 0.3, 0.01, 0.6, "#5a3a20", "body")] },
  { keys: ["tower", "tour", "watchtower", "castle", "chateau", "château", "kingdom", "royaume", "outpost", "fort", "avant"],
    make: (a, name) => { const k = /kingdom|royaume|castle|chat/.test(name); const h = k ? 1.6 : 2.2;
      return [B(-0.1, -0.1, 0, 1.2, 1.2, h, "#9a9a9a", "body"), B(-0.2, -0.2, h, 0.35, 0.35, 0.3, "#8a8a8a", "body"),
        B(0.85, -0.2, h, 0.35, 0.35, 0.3, "#8a8a8a", "body"), B(-0.2, 0.85, h, 0.35, 0.35, 0.3, "#8a8a8a", "body"),
        B(0.85, 0.85, h, 0.35, 0.35, 0.3, "#8a8a8a", "body"), B(0.38, 1.101, 0, 0.3, 0.01, 0.6, "#3a2a1a", "body"),
        ...(k ? [B(0.45, 0.45, h, 0.08, 0.08, 0.8, "#6b4527", "body"), B(0.53, 0.45, h + 0.5, 0.4, 0.04, 0.25, "#c83b30", "body")] : [])]; } },
  { keys: ["mine", "quarry", "carriere", "carrière"], make: (a) => { const ore = num(attr(a, "ore", "ores", "minerai")) || 0;
    return [B(-0.1, -0.1, 0, 1.2, 1.2, 0.8, "#6d6d6d", "body"), B(0.3, 1.101, 0, 0.4, 0.01, 0.55, "#1a1a1a", "body"),
      ...(ore > 0 ? [B(0.1, 0.1, 0.8, 0.3, 0.3, 0.2 + Math.min(0.6, ore / 60), "#d9a066", "body")] : [])]; } },
  { keys: ["building", "batiment", "bâtiment", "structure"], make: () => [B(-0.1, -0.1, 0, 1.2, 1.2, 1.1, "#c2a878", "body"), B(-0.15, -0.15, 1.1, 1.3, 1.3, 0.15, "#7a5230", "body")] },
  { keys: ["journal", "logbook", "log", "stats", "stat", "meter", "counter", "compteur", "data", "carnet", "record", "battery", "batterie", "engine", "moteur", "part"],
    make: (a, name) => (/batter|engine|moteur/.test(name)
      ? [B(0.3, 0.35, 0, 0.4, 0.3, 0.5, "#3a8a3a", "body"), B(0.42, 0.42, 0.5, 0.16, 0.16, 0.08, "#c0c0c0", "body")]
      : [B(0.25, 0.3, 0, 0.5, 0.4, 0.14, "#7a2a2a", "body"), B(0.27, 0.32, 0.14, 0.46, 0.36, 0.04, "#efe6d2", "body")]) },
  { keys: ["robot", "drone", "machine", "automate"], make: () => humanoid({ head: "#a9b4bf", body: "#7f8c99", legs: "#5f6b77", eyes: "#4fd0ff" }) },
  { keys: ["redstone", "clock", "horloge", "circuit", "comparator"], make: () => block("#b02b20", { w: 0.7, h: 0.35, top: "#e04a3a" }) },
  { keys: ["bird", "oiseau"], make: () => [B(0.35, 0.35, 0.3, 0.3, 0.4, 0.3, "#3a7ad0", "body"), B(0.38, 0.65, 0.5, 0.24, 0.2, 0.25, "#3a7ad0", "head")] },
  { keys: ["mob", "animal", "creature", "créature", "monster", "monstre", "entity", "entite", "entité", "beast", "bete", "bête"],
    make: (a, name, color) => quadruped({ body: color, head: color, eyes: "#222" }) },
];

// Find the model for a class, walking up its user-defined parents.
export function modelFor(qualname, classes) {
  const seen = new Set();
  let current = qualname;
  while (current && !seen.has(current)) {
    seen.add(current);
    const simple = current.split(".").pop().toLowerCase();
    let found = null;
    let best = 0;
    for (const m of MODELS) {
      for (const k of m.keys) {
        if (simple.includes(k) && k.length > best) { best = k.length; found = m; }
      }
    }
    if (found) return { model: found, source: current };
    const info = classes[current];
    current = info && info.user_bases && info.user_bases[0];
  }
  return { model: null, source: null };
}

export function buildParts(qualname, attrs, classes) {
  const info = classes[qualname];
  if (info && info.mro && info.mro.includes("BaseException")) {
    // An exception class: a block of TNT, ready to go off.
    return { parts: [B(0.1, 0.1, 0, 0.8, 0.8, 0.8, "#c0392b", "body"), B(0.08, 0.08, 0.3, 0.84, 0.84, 0.22, "#eeeeee", "body"),
      B(0.45, 0.45, 0.8, 0.1, 0.1, 0.2, "#3a2a1a", "head")], inheritedFrom: null };
  }
  const { model, source } = modelFor(qualname, classes);
  const name = qualname.toLowerCase();
  const color = hashColor(qualname);
  if (!model) {
    // Unknown class: a friendly cube creature colored by its class name.
    return { parts: [B(0.12, 0.12, 0, 0.76, 0.76, 0.76, color, "body"), B(0.25, 0.881, 0.45, 0.5, 0.01, 0.12, "#1b1b1b", "head")], inheritedFrom: null };
  }
  let parts = model.make(attrs || {}, name, color);
  const custom = colorFrom(attr(attrs || {}, "color", "couleur"));
  if (custom && !model.tinted) parts = parts.map((p) => (p.role === "body" ? { ...p, c: custom } : p));
  // A subclass that borrows its parent's model gets a colored band: you can
  // see that it is "the same kind of thing, specialized".
  if (source && source !== qualname) {
    const top = Math.max(...parts.map((p) => p.z + p.h));
    parts = parts.concat([B(0.3, 0.3, top + 0.08, 0.4, 0.4, 0.08, color, "crest")]);
  }
  return { parts, inheritedFrom: source !== qualname ? source : null };
}

export function healthOf(attrs) {
  for (const key of Object.keys(attrs)) {
    if (/^_?(health|hp|vie|pv|energy|energie|énergie|durability|durabilite|life|ammo|fuel|power|charge)$/i.test(key)) {
      const v = num(attrs[key]);
      if (v !== null) return { key, value: v };
    }
  }
  return null;
}
