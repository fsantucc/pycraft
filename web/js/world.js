// The voxel world: an isometric renderer whose content is driven entirely by
// the recorded execution of the learner's code (classes, objects, attributes,
// calls). Nothing here is decorative except the terrain props.
import { Particles, hash, nameTag, roundRect, speechBubble } from "./fx.js";
import { coeurBounds, coeurTile, collectCoeur, drawCoeurLights, drawCoeurSky } from "./coeur.js";
import { orderBoxes } from "./depth.js";
import { buildParts, crierParts, healthOf } from "./models.js";
import { npcParts, propParts, SKINS } from "./scene.js";
import { sound } from "./sound.js";
import { TraceModel } from "./trace.js";
import { hashColor, showValue } from "./util.js";

const W = 24;
const D = 24;
// Layout helper: s = depth in the screen (x + y), d = left/right (x - y).
const SD = (s, d) => [(s + d) / 2, (s - d) / 2];
// The story stage: the right corner of the map, where the characters and the
// scenery of the level stand. Scene positions are [ds, dd] offsets from it.
const STAGE = [24, 15];
const stageSD = (at) => SD(STAGE[0] + at[0], STAGE[1] + at[1]);
const TW = 34;
const TH = 17;
const BH = 20;

// grass: the top layer drips over the sides. night: stars instead of clouds.
// ambient: the particles that float in the air of the region.
const THEMES = {
  village: { top: "#6aa84f", side: "#8a5a2b", path: "#b59a62", sky: ["#6fb3e6", "#d6eefa"], prop: "tree", grass: true, ambient: "pollen", sun: true },
  atelier: { top: "#a07443", side: "#6b4a2a", path: "#8b6239", sky: ["#e8a563", "#fde3c0"], prop: "table", ambient: "dust", sun: true },
  citadelle: { top: "#8d9096", side: "#5f6166", path: "#a5a8ad", sky: ["#6d8bb0", "#d3deeb"], prop: "wall", ambient: "snow" },
  forge: { top: "#5a3a36", side: "#3a2422", path: "#7a4a40", sky: ["#3a1616", "#b0584a"], prop: "lava", ambient: "ember", night: true },
  labo: { top: "#ddd6ce", side: "#a89f96", path: "#b48cf2", sky: ["#4a4878", "#b4aee0"], prop: "crystal", ambient: "sparkle" },
  tour: { top: "#e3dfa7", side: "#a9a476", path: "#c9c48a", sky: ["#0b0816", "#3a2c55"], prop: "pillar", ambient: "end", night: true },
  royaume: { top: "#79b85a", side: "#8a5a2b", path: "#e2c36a", sky: ["#7cc6f2", "#fff1c9"], prop: "tree", grass: true, ambient: "pollen", sun: true },
  mine: { top: "#6f6a66", side: "#4a4542", path: "#8d7a5f", sky: ["#151210", "#4a3c30"], prop: "ore", ambient: "dust", night: true },
  faille: { top: "#4a3b52", side: "#2c2232", path: "#7a5a3a", sky: ["#250f22", "#9c4a3a"], prop: "lava", ambient: "ember", night: true },
  biblio: { top: "#9c7a4f", side: "#6b4f30", path: "#c9a86a", sky: ["#2e4a6a", "#a8c0d8"], prop: "bookshelf", ambient: "page" },
  // The last level: a place unlike all the others (see coeur.js).
  coeur: { top: "#2b2440", side: "#1c1630", path: "#3a2f52", sky: ["#07051a", "#2c1450"], prop: "none", ambient: "heart", night: true, coeur: true },
};

const AMBIENT = {
  pollen: { colors: ["#fff6b0", "#ffffff"], vy: -8, size: 2.5, life: 5000 },
  dust: { colors: ["#d9c7a8", "#b8a68a"], vy: -4, size: 2.5, life: 5000 },
  snow: { colors: ["#ffffff", "#e8f0ff"], vy: 14, size: 3, life: 6000 },
  ember: { colors: ["#ffb347", "#ff6a2a", "#ffd27a"], vy: -22, size: 3, life: 3500, glow: true },
  sparkle: { colors: ["#d7c0ff", "#9ff7f2", "#ffffff"], vy: -6, size: 2.5, life: 2500, glow: true },
  end: { colors: ["#c060ff", "#e0a0ff"], vy: -10, size: 3, life: 4000, glow: true },
  page: { colors: ["#f5ecd7", "#e8dcc0"], vy: 10, size: 4, life: 6000 },
  heart: { colors: ["#f2c14e", "#ffe7a0", "#9ff7f2", "#ff8aa0"], vy: -14, size: 2.5, life: 4200, glow: true },
};

function shade(color, f) {
  const hsl = color.match(/hsl\(([\d.]+),\s*([\d.]+)%,\s*([\d.]+)%\)/);
  if (hsl) return `hsl(${hsl[1]}, ${hsl[2]}%, ${Math.max(0, Math.min(100, Number(hsl[3]) * f)).toFixed(1)}%)`;
  let r = 128;
  let g = 128;
  let b = 128;
  const rgb = color.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/);
  if (rgb) {
    [r, g, b] = [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  } else if (color.startsWith("#")) {
    let hex = color.slice(1);
    if (hex.length === 3) hex = [...hex].map((ch) => ch + ch).join("");
    const n = parseInt(hex.slice(0, 6), 16);
    [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const cl = (v) => Math.max(0, Math.min(255, v * f)) | 0;
  return `rgb(${cl(r)},${cl(g)},${cl(b)})`;
}

const ease = (t) => 1 - (1 - t) ** 3;

export class World {
  constructor(canvas, { onSelect, onHover } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.onSelect = onSelect || (() => {});
    this.onHover = onHover || (() => {});
    this.theme = THEMES.village;
    this.themeName = "village";
    this.rot = 0;
    this.zoom = 1;
    this.cam = { k: 0.9, u: 0, v: 150 };
    this.pan = { x: 0, y: 0 };
    this.entities = new Map();
    this.blueprints = new Map();
    this.signs = new Map();
    this.links = [];
    this.effects = [];
    this.selected = null;
    this.hitboxes = [];
    this.boss = null;
    this.classes = {};
    this.collections = new Map();
    this.stack = [];
    // The clock of the world: everything that moves uses it, so a paused
    // cinematic freezes the whole world (bubbles, effects, characters…).
    this.time = 0;
    this.paused = false;
    this.later = [];
<<<<<<< HEAD
=======
    // Night falling on the world (a program can make it happen): 0 day, 1 night.
    this.night = { from: 0, to: 0, t0: 0, dur: 1 };
    // Smooth camera moves asked by the player (zoom, recentre, focus).
    this.panTo = null;
    this.zoomTo = null;
>>>>>>> c46f881 (lastfeatures)
    this.particles = new Particles(() => this.time);
    this.shake = { until: 0, amp: 0 };
    this.flash = { until: 0, color: "#fff", t0: 0 };
    this.groundCache = document.createElement("canvas");
    this.groundKey = "";
    this.groundReady = false;
    this.stableFrames = 0;
    this.crierSpeakAt = 0;
    this.crierAct = null;
    this.emptyHint = true;
    this.stage = null;
    this.introTimers = [];
    this.focusUntil = 0;
    this.trailerActive = false;
    this.mobs = [];
    this.cinematic = null;
    this.camShot = null;
    this.fade = null;
    this.nextAmbient = 0;
    this.labelRects = [];
    this.clouds = Array.from({ length: 7 }, (_, i) => ({
      x: hash(i, 1) * 1400, y: 20 + hash(i, 2) * 140, w: 60 + hash(i, 3) * 90, speed: 6 + hash(i, 4) * 10,
    }));
    this.lastFrame = performance.now();
    this.resize();
    new ResizeObserver(() => this.resize()).observe(canvas.parentElement);
    this.bindMouse();
    requestAnimationFrame((t) => this.loop(t));
  }

  now() {
    return this.time;
  }

  // Runs fn after ms of world time (paused with the world; forgotten when a
  // cinematic jumps to another step).
  after(ms, fn) {
    this.later.push({ at: this.time + ms, fn, cine: !!this.cinematic });
  }

  setPaused(paused) {
    this.paused = paused;
  }

  // ------------------------------------------------------------ camera
  resize() {
    const box = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = box.width;
    this.height = box.height;
    this.canvas.width = box.width * dpr;
    this.canvas.height = box.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  }

  rotate(x, y) {
    const cx = W / 2;
    const cy = D / 2;
    let dx = x - cx;
    let dy = y - cy;
    for (let i = 0; i < this.rot; i += 1) [dx, dy] = [-dy, dx];
    return [dx + cx, dy + cy];
  }

  // Camera: automatically frames what exists (plans, objects, signs),
  // then the user can zoom / pan on top of it.
  origin() {
    if (this.fixedOrigin) return this.fixedOrigin;
    const k = this.cam.k * this.zoom;
    let sx = 0;
    let sy = 0;
    const now = this.now();
    if (now < this.shake.until) {
      const left = (this.shake.until - now) / 400;
      sx = Math.sin(now / 17) * this.shake.amp * left;
      sy = Math.cos(now / 23) * this.shake.amp * left;
    }
    // Whole pixels: with a fractional origin every edge was re-antialiased
    // differently at each frame of a camera move (shimmering details).
    return [Math.round(this.width / 2 + this.pan.x - this.cam.u * k + sx), Math.round(this.height / 2 + this.pan.y - this.cam.v * k + sy), k];
  }

  shakeCamera(amp = 6, ms = 400) {
    this.shake = { until: this.now() + ms, amp };
  }

  flashScreen(color, ms = 350) {
    this.flash = { until: this.now() + ms, color, t0: this.now() };
  }

  unit(x, y, z) {
    const [rx, ry] = this.rotate(x, y);
    return [(rx - ry) * (TW / 2), (rx + ry) * (TH / 2) - z * BH];
  }

  frameTarget() {
    const pts = [];
    const add = (x0, y0, x1, y1, h) => {
      for (const [x, y] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) {
        pts.push(this.unit(x, y, 0), this.unit(x, y, h));
      }
    };
    if (this.camShot) return this.shotTarget();
    // While the characters tell the story, the camera comes close to them.
    if (this.stage && this.now() < this.focusUntil) {
      for (const item of [...this.stage.npcs, ...this.stage.props]) add(item.x - 0.5, item.y - 0.5, item.x + (item.w || 1) + 0.5, item.y + (item.d || 1) + 0.5, 3.2);
      if (this.boss) add(...SD(13, 10.5), ...SD(16, 13), 4.6);
      for (const m of this.mobs) add(m.x - 0.5, m.y - 0.5, m.x + 1.5 * m.scale, m.y + 1.5 * m.scale, 2.4 * m.scale);
      const us = pts.map((p) => p[0]);
      const vs = pts.map((p) => p[1]);
      const du = Math.max(...us) - Math.min(...us);
      const dv = Math.max(...vs) - Math.min(...vs);
      const cap = this.trailerActive ? 3.0 : 2.2;
      const [padU, padV] = this.trailerActive ? [40, 70] : [120, 160];
      let k = Math.max(0.8, Math.min(cap, Math.min(this.width / (du + padU), this.height / (dv + padV))));
      if (this.push) {
        const t = Math.min(1, (this.now() - this.push.t0) / this.push.dur);
        k *= this.push.from + (1 - this.push.from) * (1 - (1 - t) ** 3);
        if (t >= 1) this.push = null;
      }
      const u = (Math.max(...us) + Math.min(...us)) / 2;
      const v = (Math.max(...vs) + Math.min(...vs)) / 2 - 30;
      // In the trailer, the scene sits to the right and above the captions.
      if (this.trailerActive) return { k, u: u - (this.width * 0.12) / k, v: v + (this.height * 0.08) / k };
      return { k, u, v };
    }
    for (const bp of this.blueprints.values()) add(bp.x, bp.y, bp.x + 2, bp.y + 2, 2);
    for (const e of this.entities.values()) add(e.tx - 0.5, e.ty - 0.5, e.tx + 1.5, e.ty + 1.5, 2.6);
    for (const sg of this.signs.values()) add(sg.x - 1.5, sg.y, sg.x + 1, sg.y + 1, 1.6);
    for (const col of this.collections.values()) {
      const n = Math.min(8, Math.max(1, col.items.length));
      const [ax, ay] = this.colPos(col, -1);
      const [bx, by] = this.colPos(col, n);
      add(Math.min(ax, bx), Math.min(ay, by), Math.max(ax, bx) + 1, Math.max(ay, by) + 1, 1.4);
    }
    if (this.stack.length) {
      const [sx, sy] = this.stackBase();
      add(sx, sy, sx + 3, sy + 1, this.stack.length * 0.55 + 1);
    }
    if (this.boss) add(...SD(13, 11), ...SD(16, 13), 4);
    if (this.stage) {
      for (const item of [...this.stage.npcs, ...this.stage.props]) add(item.x, item.y, item.x + (item.w || 1), item.y + (item.d || 1), item.h || 2.4);
    }
    if (this.theme.coeur) coeurBounds(add);
    if (pts.length < 8) add(0, 0, W, D, 0);
    const [cx, cy] = SD(7, -6);
    add(cx, cy, cx + 1, cy + 1, 2.4);
    const us = pts.map((p) => p[0]);
    const vs = pts.map((p) => p[1]);
    const du = Math.max(...us) - Math.min(...us);
    const dv = Math.max(...vs) - Math.min(...vs);
    const k = Math.max(0.55, Math.min(2.0, Math.min(this.width / (du + 150), this.height / (dv + 130))));
    return { k, u: (Math.max(...us) + Math.min(...us)) / 2, v: (Math.max(...vs) + Math.min(...vs)) / 2 - 10 };
  }

  project(x, y, z) {
    const [rx, ry] = this.rotate(x, y);
    const [ox, oy, k] = this.origin();
    return [ox + (rx - ry) * (TW / 2) * k, oy + (rx + ry) * (TH / 2) * k - z * BH * k];
  }

  bindMouse() {
    let drag = null;
    this.canvas.addEventListener("mousedown", (e) => {
      drag = { x: e.clientX, y: e.clientY, px: this.pan.x, py: this.pan.y, moved: false };
      this.canvas.style.cursor = "grabbing";
    });
    window.addEventListener("mouseup", (e) => {
      if (drag && !drag.moved) this.click(e);
      drag = null;
      this.canvas.style.cursor = "grab";
    });
    window.addEventListener("mousemove", (e) => {
      if (drag) {
        const dx = e.clientX - drag.x;
        const dy = e.clientY - drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
        this.panTo = null;
        this.pan.x = drag.px + dx;
        this.pan.y = drag.py + dy;
      } else if (e.target === this.canvas) {
        const hit = this.hitTest(e);
        this.onHover(hit, e);
      }
    });
    this.canvas.addEventListener("mouseleave", () => this.onHover(null));
    this.canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      const r = this.canvas.getBoundingClientRect();
      this.zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });
  }

  hitTest(e) {
    const r = this.canvas.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    for (let i = this.hitboxes.length - 1; i >= 0; i -= 1) {
      const h = this.hitboxes[i];
      if (x >= h.x0 && x <= h.x1 && y >= h.y0 && y <= h.y1) return h.target;
    }
    return null;
  }

  click(e) {
    const hit = this.hitTest(e);
    this.selected = hit;
    this.onSelect(hit);
  }

  select(target) {
    this.selected = target;
  }

  setTheme(name) {
    this.themeName = THEMES[name] ? name : "village";
    this.theme = THEMES[this.themeName];
    sound.setMood(this.themeName);
  }

  // ------------------------------------------------------- scene from code
  setScene(state, classes, locals = [], func = "") {
    this.classes = classes || {};
    const names = TraceModel.names(state);

    // Blueprints (classes) in the creation zone, nested classes inside their owner.
    const roots = state.classes.filter((q) => !(classes[q] && classes[q].owner && state.classes.includes(classes[q].owner)));
    const keepBp = new Set();
    roots.forEach((qual, i) => {
      const row = Math.floor(i / 4);
      const inRow = Math.min(4, roots.length - row * 4);
      const [x, y] = SD(5.6 + row * 3.6, ((i % 4) - (inRow - 1) / 2) * 4.6 - 0.5);
      this.placeBlueprint(qual, x, y, 1, keepBp);
      const nested = state.classes.filter((q) => classes[q] && classes[q].owner === qual);
      nested.forEach((nq, j) => this.placeBlueprint(nq, x + 1.3, y - 0.2 + j * 0.7, 0.5, keepBp, qual));
    });
    for (const key of [...this.blueprints.keys()]) if (!keepBp.has(key)) this.blueprints.delete(key);

    // Objects. Components (instances of nested classes, or owned by one
    // single object) float next to their owner as satellites.
    const owners = new Map();
    for (const obj of state.objects.values()) {
      for (const [attr, value] of Object.entries(obj.attrs)) {
        const refs = value && value.t === "obj" ? [value.ref]
          : (value && value.items ? value.items.flat().filter((v) => v && v.t === "obj").map((v) => v.ref) : []);
        refs.forEach((ref) => {
          if (!owners.has(ref)) owners.set(ref, []);
          owners.get(ref).push({ owner: obj.oid, attr, direct: value.t === "obj" });
        });
      }
    }
    const keep = new Set();
    const slots = [];
    const links = [];
    const satellites = [];
    for (const oid of state.order) {
      const obj = state.objects.get(oid);
      if (!obj) continue;
      const own = owners.get(oid) || [];
      const info = classes[obj.cls] || {};
      const isComponent = own.length === 1 && own[0].direct && !names.has(oid)
        && (info.owner || own.length === 1);
      if (isComponent && own[0].owner !== oid) {
        satellites.push({ oid, owner: own[0].owner, attr: own[0].attr });
      } else {
        slots.push(obj);
      }
      own.forEach((o) => { if (!isComponent) links.push({ from: o.owner, to: oid, label: o.attr }); });
    }
    slots.forEach((obj, i) => {
      const row = Math.floor(i / 5);
      const inRow = Math.min(5, slots.length - row * 5);
      const [x, y] = SD(17 + row * 3.8, ((i % 5) - (inRow - 1) / 2) * 3.4 + 1);
      this.placeEntity(obj, x, y, 1, names.get(obj.oid), keep, state);
      this.entities.get(obj.oid).labelShift = (i % 2) * 17;
    });
    satellites.forEach((s, i) => {
      const owner = this.entities.get(s.owner);
      const obj = state.objects.get(s.oid);
      if (!obj) return;
      const bx = owner ? owner.tx + 0.85 + (i % 2) * 0.2 : 2 + i;
      const by = owner ? owner.ty - 0.45 : 14;
      this.placeEntity(obj, bx, by, 0.5, [`${(names.get(s.owner) || [state.objects.get(s.owner)?.cls || "?"])[0]}.${s.attr}`], keep, state, s.owner);
      links.push({ from: s.owner, to: s.oid, label: s.attr, satellite: true });
    });
    for (const key of [...this.entities.keys()]) if (!keep.has(key)) this.entities.delete(key);
    this.links = links;

    // Signposts: plain variables on the village square.
    const keepSigns = new Set();
    let sIndex = 0;
    const scoped = new Map(state.vars);
    const where = func && func !== "<module>" ? func.split(".").pop() : "";
    for (const [name, value] of locals || []) {
      if (name === "self" || name === "cls") continue;
      scoped.set(where ? `${where}·${name}` : name, value);
    }
    this.scoped = scoped;
    for (const [name, value] of scoped) {
      if (!value || name === "_" || name.endsWith("·_") || ["obj", "class", "function", "module"].includes(value.t)) continue;
      if (value.items) continue;
      if (sIndex >= 7) break;
      const prev = this.signs.get(name);
      const text = `${name} = ${showValue(value)}`;
      const [sx, sy] = SD(19.5 + sIndex * 1.9, -14.5);
      this.signs.set(name, { name, text, x: sx, y: sy, changedAt: prev && prev.text !== text ? this.now() : prev ? prev.changedAt : this.now(), value });
      keepSigns.add(name);
      sIndex += 1;
    }
    for (const key of [...this.signs.keys()]) if (!keepSigns.has(key)) this.signs.delete(key);

    // Collections: lists, tuples, sets and dicts get their own furniture.
    const keepCol = new Set();
    let cIndex = 0;
    const colStart = this.entities.size ? 17 + Math.ceil([...this.entities.values()].filter((e) => !e.owner).length / 5) * 3.8 + 0.5 : 16;
    for (const [name, value] of this.scoped) {
      if (!value || !value.items || name === "_" || cIndex >= 5) continue;
      const items = value.t === "dict"
        ? value.items.map(([k, v]) => ({ key: k.replace(/^'|'$/g, ""), label: showValue(v), ref: v && v.t === "obj" ? v.ref : null }))
        : value.items.map((v, i) => ({ key: value.t === "set" || value.t === "frozenset" ? "" : String(i), label: showValue(v), ref: v && v.t === "obj" ? v.ref : null }));
      const text = JSON.stringify(items);
      const prev = this.collections.get(name);
      this.collections.set(name, {
        name, kind: value.t, items, len: value.len, s: colStart + cIndex * 5, d0: -6,
        changedAt: prev && prev.text !== text ? this.now() : prev ? prev.changedAt : this.now(),
        bornAt: prev ? prev.bornAt : this.now(), text,
      });
      keepCol.add(name);
      cIndex += 1;
    }
    for (const key of [...this.collections.keys()]) if (!keepCol.has(key)) this.collections.delete(key);
    this.stack = state.stack.filter((f) => f.type !== "module");
  }

  placeBlueprint(qual, x, y, scale, keep, owner = null) {
    keep.add(qual);
    const info = this.classes[qual] || {};
    const { parts, inheritedFrom } = buildParts(qual, {}, this.classes);
    const prev = this.blueprints.get(qual);
    this.blueprints.set(qual, {
      qual, x, y, scale, parts, owner, inheritedFrom,
      bases: info.user_bases || [], born: prev ? prev.born : this.now(),
      pulse: prev ? prev.pulse : 0, pulseColor: prev ? prev.pulseColor : "#5ee6e0",
    });
  }

  placeEntity(obj, x, y, scale, names, keep, state, owner = null) {
    keep.add(obj.oid);
    const prev = this.entities.get(obj.oid);
    const { parts } = buildParts(obj.cls, obj.attrs, this.classes);
    const hp = healthOf(obj.attrs);
    const max = hp ? state.maxima.get(`${obj.oid}.${hp.key}`) : null;
    this.entities.set(obj.oid, {
      oid: obj.oid, cls: obj.cls, attrs: obj.attrs, parts, scale, owner,
      names: names || [], tx: x, ty: y,
      x: prev ? prev.x : x, y: prev ? prev.y : y,
      born: prev ? prev.born : this.now(),
      anim: prev ? prev.anim : null, hp, hpMax: max,
      by: obj.by,
    });
  }

  // ---------------------------------------------------------- animations
  entityTop(oid) {
    const ent = this.entities.get(oid);
    if (!ent) return null;
    const top = Math.max(...ent.parts.map((p) => p.z + p.h)) * ent.scale;
    return () => this.project(ent.x + 0.5 * ent.scale, ent.y + 0.5 * ent.scale, top + 0.25);
  }

  // Confetti fireworks over the world (mission passed, achievement…).
  celebrate() {
    const colors = ["#f2c14e", "#5ee6e0", "#e5534b", "#6ad04a", "#b48cf2", "#ffffff"];
    for (let i = 0; i < 4; i += 1) {
      this.after(i * 220, () => {
        const x = this.width * (0.2 + 0.6 * Math.random());
        const y = this.height * (0.2 + 0.3 * Math.random());
        this.particles.burst(() => [x, y], { count: 36, colors, speed: 160, up: 60, gravity: 220, size: 5, life: 1400, glow: true });
      });
    }
    this.flashScreen("rgba(255,240,180,0.25)", 300);
  }

  // Point at the things named in an error (objects, classes, variables,
  // collections). Returns how many were found on the map.
  spotlight(names, dur = 6000) {
    const wanted = new Set(names);
    const spots = [];
    for (const ent of this.entities.values()) {
      const short = ent.cls.split(".").pop();
      const hit = ent.names.find((n) => wanted.has(n.split(".").pop())) || (wanted.has(short) ? short : null);
      if (hit) spots.push({ at: this.entityTop(ent.oid), base: this.entityBase(ent.oid), label: hit });
    }
    for (const bp of this.blueprints.values()) {
      const short = bp.qual.split(".").pop();
      if (wanted.has(short)) spots.push({ at: this.blueprintTop(bp.qual), base: () => this.project(bp.x + 1, bp.y + 1, 0), label: `class ${short}` });
    }
    for (const sign of this.signs.values()) {
      if (wanted.has(sign.name)) spots.push({ at: () => this.project(sign.x + 0.5, sign.y + 0.5, 1.6), base: () => this.project(sign.x + 0.5, sign.y + 0.5, 0), label: sign.name });
    }
    for (const col of this.collections.values()) {
      if (wanted.has(col.name)) {
        const [x, y] = this.colPos(col, 0);
        spots.push({ at: () => this.project(x + 0.5, y + 0.5, 1.6), base: () => this.project(x + 0.5, y + 0.5, 0), label: col.name });
      }
    }
    this.effects = this.effects.filter((f) => f.kind !== "spot");
    for (const spot of spots.slice(0, 6)) {
      this.addEffect({ kind: "spot", at: spot.at, base: spot.base, label: spot.label, dur });
    }
    return spots.length;
  }

  blueprintTop(qual) {
    const bp = this.blueprints.get(qual);
    if (!bp) return null;
    return () => this.project(bp.x + 0.5 + 0.5 * bp.scale, bp.y + 0.5 + 0.5 * bp.scale, 1.6 * bp.scale + 0.3);
  }

  // The call stack tower: one block per running function call.
  stackBase() {
    return SD(11.5, -10.5);
  }

  stackTop(extra = 0) {
    if (!this.stack.length && !extra) return null;
    const [x, y] = this.stackBase();
    const h = Math.max(1, this.stack.length + extra) * 0.55;
    return () => this.project(x + 0.5, y + 0.5, h + 0.2);
  }

  crierPos() {
    return SD(7, -6);
  }

  // ------------------------------------------------------------ story stage
  // scene = { npcs: [{id, name, skin, at, pose}], props: [{type, at, label,
  // n, color}], intro: [[id, text]], answers, argv_by, success, fail }
  setStage(scene, done = false) {
    this.introTimers.forEach(clearTimeout);
    this.introTimers = [];
    this.effects = this.effects.filter((f) => !(f.kind === "bubble" && String(f.owner).startsWith("npc:")));
    if (!scene || !scene.npcs || !scene.npcs.length) {
      this.stage = null;
      return;
    }
    const npcs = scene.npcs.map((n, i) => {
      const [x, y] = stageSD(n.at);
      return { ...n, x, y, w: 1, d: 1, h: 2.3, pose: n.pose || "idle", poseUntil: 0, seed: i * 1.7 };
    });
    const props = (scene.props || []).map((p, i) => {
      const [x, y] = stageSD(p.at);
      return { ...p, x, y, w: 2, d: 2, h: 2.4, seed: i * 3.1, code: {}, click: {} };
    });
    this.stage = { ...scene, npcs, props, done };
    // A new scene starts in daylight, without the creatures of the last one.
    this.setNight(false, false);
    this.mobs = this.mobs.filter((m) => !m.react);
  }

  setStageDone(done) {
    if (this.stage) this.stage.done = done;
  }

  skinIcon(skin) {
    return (SKINS[skin] || {}).icon || "🧑";
  }

  bossCenter() {
    const [bx, by] = SD(14, 11.5);
    return [bx + 0.5, by + 0.5];
  }

  stageNpc(id) {
    if (!this.stage) return null;
    return this.stage.npcs.find((n) => n.id === id) || this.stage.npcs[0];
  }

  npcTop(id) {
    return () => {
      const n = this.stageNpc(id);
      return n ? this.project(n.x + 0.5, n.y + 0.5, 2.45) : [0, 0];
    };
  }

  npcPose(id, pose, ms) {
    const n = this.stageNpc(id);
    if (!n) return;
    n.pose = pose;
    n.poseUntil = this.now() + ms;
  }

  resetNpcPoses() {
    for (const n of this.stage ? this.stage.npcs : []) {
      n.pose = n.restPose || "idle";
      n.poseUntil = 0;
    }
  }

  npcSay(id, text, { dur = 0, delay = 0, answer = false } = {}) {
    const n = this.stageNpc(id);
    if (!n) return;
    const go = () => {
      const life = dur || Math.min(9000, 2400 + String(text).length * 45);
      this.npcPose(n.id, "talk", Math.min(life, 2200));
      sound.voice(String(text), voiceOf(n), { pan: this.panAt(this.npcTop(n.id)) });
<<<<<<< HEAD
=======
      // One bubble per character: a new line replaces the previous one.
      this.effects = this.effects.filter((f) => !(f.kind === "bubble" && f.owner === `npc:${n.id}`));
>>>>>>> c46f881 (lastfeatures)
      this.addEffect({ kind: "bubble", at: this.npcTop(n.id), text: answer ? `🗣 ${text}` : String(text), dur: life, owner: `npc:${n.id}`, npc: true });
    };
    if (delay) this.introTimers.push(setTimeout(go, delay)); else go();
  }

  // Everything a cinematic step created (bubbles, beams, particles, flash,
  // shake, poses) is removed when the player jumps to another step.
  clearCineFx() {
    this.effects = this.effects.filter((f) => !f.cine && !(f.kind === "bubble" && String(f.owner).startsWith("npc:")));
    this.later = this.later.filter((l) => !l.cine);
    this.particles.clear();
    this.shake = { until: 0, amp: 0 };
    this.flash = { until: 0, color: "#fff", t0: 0 };
    this.fade = null;
    this.caption = null;
    this.quiet = false;
    this.grade = null;
    this.challenge = null;
    this.resetNpcPoses();
  }

  // Back to the whole world (a program is running) — except during a
  // cinematic, which keeps the camera on the characters.
  unfocus() {
    if (!this.cinematic || !this.cinematic.focus) this.focusUntil = 0;
  }

  // ------------------------------------------------- cinematic camera
  // A camera move during a cinematic: from one point of view to another,
  // over `dur` ms of world time. at = [x, y, z] in the world; zoom = 1 shows
  // the whole map. cut: jump there at once (a new scene).
<<<<<<< HEAD
=======
  // ------------------------------------------------ camera of the player
  // The playable map never leaves the screen: at least a good part of it
  // stays visible whatever the drag, the zoom or the size of the window.
  keepMapInView() {
    const pts = [[0, 0], [W, 0], [0, D], [W, D]].map(([x, y]) => this.project(x, y, 0));
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    // At least this much of the map stays on screen, horizontally and
    // vertically.
    const mx = Math.min(160, this.width * 0.25);
    const my = Math.min(140, this.height * 0.25);
    let dx = 0;
    let dy = 0;
    if (maxX < mx) dx = mx - maxX; else if (minX > this.width - mx) dx = this.width - mx - minX;
    if (maxY < my) dy = my - maxY; else if (minY > this.height - my) dy = this.height - my - minY;
    if (dx || dy) {
      this.pan.x += dx;
      this.pan.y += dy;
      if (this.panTo) this.panTo = { x: this.panTo.x + dx, y: this.panTo.y + dy };
    }
  }

  // Zoom keeping the point under the mouse where it is (like a map).
  zoomAt(factor, sx = this.width / 2, sy = this.height / 2) {
    const from = this.zoomTo || this.zoom;
    const to = Math.max(0.5, Math.min(2.6, from * factor));
    const r = to / this.zoom;
    const base = this.panTo || this.pan;
    this.panTo = {
      x: (sx - this.width / 2) - (sx - this.width / 2 - base.x) * r,
      y: (sy - this.height / 2) - (sy - this.height / 2 - base.y) * r,
    };
    this.zoomTo = to;
  }

  recenter() {
    this.panTo = { x: 0, y: 0 };
    this.zoomTo = 1;
  }

  // The camera goes to someone (a click on a character or a creature) and
  // comes back where it was when the card is closed.
  focusOn(at, zoom = 2.3) {
    if (this.cinematic) return;
    if (!this.focusSaved) this.focusSaved = { pan: { ...(this.panTo || this.pan) }, zoom: this.zoomTo || this.zoom };
    this.panTo = { x: 0, y: 0 };
    this.zoomTo = 1;
    // The card sits at the bottom right: the subject goes up and left.
    const shift = this.width > 700 ? [-0.14, -0.08] : [0, -0.18];
    this.shot({ at, zoom, shift }, null, 10, { cut: false });
  }

  endFocus() {
    if (this.camShot && !this.cinematic) this.camShot = null;
    if (this.focusSaved) {
      this.panTo = this.focusSaved.pan;
      this.zoomTo = this.focusSaved.zoom;
      this.focusSaved = null;
    }
  }

  // A program printed 42: the sky answers, for a moment.
  answer42() {
    const at = () => [this.width / 2, this.height * 0.3];
    this.particles.burst(at, { count: 42, colors: ["#b48cf2", "#5ee6e0", "#ffffff", "#f2c14e"], speed: 160, up: 60, gravity: 40, size: 4, glow: true, life: 1600 });
    this.addEffect({ kind: "float", at, text: "42 — la réponse à la grande question", color: "#d7c0ff", dur: 2600 });
    sound.play("twinkle");
  }

  // ------------------------------------------------------------- night
  setNight(on, animate = true) {
    const to = on ? 1 : 0;
    if (this.night.to === to) return;
    const from = animate ? this.nightLevel() : to;
    this.night = { from, to, t0: this.now(), dur: animate ? 2600 : 1 };
  }

  nightLevel() {
    const n = this.night;
    const t = Math.max(0, Math.min(1, (this.now() - n.t0) / n.dur));
    const e = t * t * (3 - 2 * t);
    return n.from + (n.to - n.from) * e;
  }

  // Darkness over the world (the lights of the scene shine through it,
  // they are drawn after), fireflies near the ground.
  drawNight(now) {
    const n = this.nightLevel();
    if (n <= 0.001) return;
    const c = this.ctx;
    c.save();
    c.fillStyle = `rgba(10,14,46,${(0.5 * n).toFixed(3)})`;
    c.fillRect(0, 0, this.width, this.height);
    c.globalCompositeOperation = "lighter";
    const k = this.cam.k * this.zoom;
    for (let i = 0; i < 16; i += 1) {
      const x = (hash(i, 31) * W + Math.sin(now / 1900 + i) * 0.8);
      const y = (hash(i, 32) * D + Math.cos(now / 2300 + i * 1.7) * 0.8);
      const z = 0.4 + Math.abs(Math.sin(now / 1400 + i)) * 1.2;
      const [px, py] = this.project(x, y, z);
      const blink = Math.max(0, Math.sin(now / 420 + i * 2.1));
      const r = (2.2 + 2 * blink) * Math.max(0.6, k);
      const g = c.createRadialGradient(px, py, 0, px, py, r * 3);
      g.addColorStop(0, `rgba(214,255,140,${(0.8 * n * blink).toFixed(3)})`);
      g.addColorStop(1, "rgba(214,255,140,0)");
      c.fillStyle = g;
      c.fillRect(px - r * 3, py - r * 3, r * 6, r * 6);
    }
    c.restore();
  }

>>>>>>> c46f881 (lastfeatures)
  shot(from, to = null, dur = 1000, { cut = true, ease = true } = {}) {
    this.camShot = { from, to: to || from, dur, t0: this.now(), ease };
    if (cut) this.snapCam = true;
  }

  shotTarget() {
    const s = this.camShot;
    const t = Math.max(0, Math.min(1, (this.now() - s.t0) / s.dur));
    const e = s.ease ? t * t * (3 - 2 * t) : t;
    const mix = (a, b) => a + (b - a) * e;
    const at = [0, 1, 2].map((i) => mix(s.from.at[i], s.to.at[i]));
    const zoom = mix(s.from.zoom, s.to.zoom);
    const [u, v] = this.unit(at[0], at[1], at[2]);
    const fit = Math.min(this.width / 860, this.height / 560);
<<<<<<< HEAD
    return { k: fit * zoom, u, v, speed: 6 };
=======
    const k = fit * zoom;
    // shift: where the subject sits on screen (fractions of the view from
    // the centre), e.g. to leave room for a card.
    const [fx, fy] = s.from.shift || [0, 0];
    return { k, u: u - (fx * this.width) / k, v: v - (fy * this.height) / k, speed: 6 };
>>>>>>> c46f881 (lastfeatures)
  }

  // A slow dolly towards the scene (the camera starts a little further away
  // and comes closer): used when a cinematic shows a new place.
  pushIn(from = 0.82, ms = 1500) {
    this.push = { from, t0: this.now(), dur: ms };
    this.snapCam = true;
  }

  // A paused cinematic: the world is frozen and dimmed, with a pause sign
  // in the middle. Drawn under the bubbles and the subtitles, which stay
  // readable.
  drawPaused() {
    if (!this.paused) return;
    const c = this.ctx;
    c.save();
    c.fillStyle = "rgba(6,4,14,0.38)";
    c.fillRect(0, 0, this.width, this.height);
    const h = Math.min(84, this.height / 7);
    const w = h * 0.3;
    c.fillStyle = "rgba(255,255,255,0.28)";
    for (const dx of [-w * 1.25, w * 0.25]) {
      c.beginPath();
      c.roundRect(this.width / 2 + dx, this.height / 2 - h / 2, w, h, w / 3);
      c.fill();
    }
    c.restore();
  }

  // ------------------------------------------- color grades of the trailer
  // Presentation only (the places themselves do not change), on the clock
  // of the world, so they pause and rewind with the cinematic.
  //   memory: a fleeting memory — blurred for an instant, warm, faded edges;
  //   approach: the end of the journey — colder, darker, closing in;
  //   black: a dramatic pause, only a red glow beating in the dark.
  setGrade(grade) {
    this.grade = grade ? { strength: 1, seed: 0, ...grade, t0: this.now(), pulseAt: -1e9 } : null;
  }

  gradePulse() {
    if (this.grade) this.grade.pulseAt = this.now();
  }

  drawGrade(now) {
    const g = this.grade;
    if (!g) return;
    const c = this.ctx;
    const { width: w, height: h } = this;
    const t = now - g.t0;
    c.save();
    if (g.kind === "memory") {
      if (t < 420) {
        c.filter = `blur(${((1 - t / 420) * 7).toFixed(2)}px)`;
        c.drawImage(c.canvas, 0, 0, w, h);
        c.filter = "none";
      }
      c.globalCompositeOperation = "saturation";
      c.fillStyle = "rgba(128,128,128,0.22)";
      c.fillRect(0, 0, w, h);
      c.globalCompositeOperation = "soft-light";
      c.fillStyle = "rgba(255,206,140,0.42)";
      c.fillRect(0, 0, w, h);
      // A light leak, from a corner that changes from memory to memory.
      c.globalCompositeOperation = "screen";
      const corner = [[0, 0], [w, 0], [w, h], [0, h]][g.seed % 4];
      const leak = c.createRadialGradient(corner[0], corner[1], 0, corner[0], corner[1], Math.max(w, h) * 0.55);
      leak.addColorStop(0, "rgba(255,190,120,0.30)");
      leak.addColorStop(1, "rgba(255,190,120,0)");
      c.fillStyle = leak;
      c.fillRect(0, 0, w, h);
      c.globalCompositeOperation = "source-over";
      const v = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.72);
      v.addColorStop(0, "rgba(40,22,8,0)");
      v.addColorStop(1, "rgba(40,22,8,0.55)");
      c.fillStyle = v;
      c.fillRect(0, 0, w, h);
    } else if (g.kind === "approach") {
      // Closes in during the shot.
      const k = g.strength * (0.6 + 0.4 * Math.min(1, t / 3000));
      c.globalCompositeOperation = "saturation";
      c.fillStyle = `rgba(128,128,128,${(0.3 * k).toFixed(3)})`;
      c.fillRect(0, 0, w, h);
      c.globalCompositeOperation = "multiply";
      c.fillStyle = `rgba(70,58,130,${(0.5 * k).toFixed(3)})`;
      c.fillRect(0, 0, w, h);
      c.globalCompositeOperation = "soft-light";
      c.fillStyle = `rgba(70,40,150,${(0.55 * k).toFixed(3)})`;
      c.fillRect(0, 0, w, h);
      c.globalCompositeOperation = "source-over";
      const v = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * (0.42 - 0.14 * k), w / 2, h / 2, Math.max(w, h) * 0.7);
      v.addColorStop(0, "rgba(6,2,20,0)");
      v.addColorStop(1, `rgba(6,2,20,${(0.78 * k).toFixed(3)})`);
      c.fillStyle = v;
      c.fillRect(0, 0, w, h);
    } else if (g.kind === "black") {
      c.fillStyle = "#000";
      c.fillRect(0, 0, w, h);
      const beat = Math.exp(-(now - g.pulseAt) / 380);
      const r = Math.min(w, h) * (0.16 + 0.08 * beat);
      const glow = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, r);
      glow.addColorStop(0, `rgba(255,70,110,${(0.06 + 0.4 * beat).toFixed(3)})`);
      glow.addColorStop(1, "rgba(255,70,110,0)");
      c.globalCompositeOperation = "lighter";
      c.fillStyle = glow;
      c.fillRect(0, 0, w, h);
    }
    c.restore();
  }

  // The question asked to the player at the climax of the trailer, written
  // word after word in the middle of the screen.
  // { lead: words of the first line, line: words of the second line, name,
  //   end }: name is written in gold, with a glow and a sweep of light.
  setChallenge(challenge) {
    this.challenge = challenge ? { ...challenge, t0: this.now() } : null;
  }

  drawChallenge(now) {
    const ch = this.challenge;
    if (!ch) return;
    const c = this.ctx;
    const { width: w, height: h } = this;
    const t = now - ch.t0;
    const clamp = (x) => Math.max(0, Math.min(1, x));
    const easeOut = (x) => 1 - (1 - x) ** 3;
    c.save();
    // The world steps back behind the words.
    const dim = clamp(t / 500) * 0.62;
    const v = c.createRadialGradient(w / 2, h * 0.66, 0, w / 2, h * 0.66, Math.max(w, h) * 0.6);
    v.addColorStop(0, `rgba(4,2,12,${(dim * 0.75).toFixed(3)})`);
    v.addColorStop(1, `rgba(4,2,12,${dim.toFixed(3)})`);
    c.fillStyle = v;
    c.fillRect(0, 0, w, h);
    c.textBaseline = "middle";
    c.textAlign = "left";
    const small = Math.round(Math.min(34, w / 26));
    const big = Math.round(Math.min(58, w / 15));
    // In the lower part of the screen: the Heart stays visible above.
    const y1 = h * 0.6;
    const y2 = y1 + small * 0.9 + big * 0.75;
    // A line of words, each appearing at its time (rising, fading in).
    const line = (words, y, font, color, start, step) => {
      c.font = font;
      const gap = c.measureText(" ").width;
      const widths = words.map((word) => c.measureText(word).width);
      let x = w / 2 - (widths.reduce((a, b) => a + b, 0) + gap * (words.length - 1)) / 2;
      words.forEach((word, i) => {
        const a = easeOut(clamp((t - start - i * step) / 420));
        c.globalAlpha = a;
        c.fillStyle = color;
        c.shadowColor = "rgba(0,0,0,0.9)";
        c.shadowBlur = 14;
        c.fillText(word, x, y + (1 - a) * 10);
        x += widths[i] + gap;
      });
      return x;
    };
    line(ch.lead, y1, `italic 600 ${small}px system-ui, sans-serif`, "#f5ecd7", 350, 170);
    // Second line: the verb, then the name in gold (it lands with a glow).
    c.font = `800 ${big}px system-ui, sans-serif`;
    const lineWords = [...ch.line];
    const nameW = c.measureText(ch.name).width;
    const endW = c.measureText(ch.end).width;
    const gap = c.measureText(" ").width;
    const lineW = lineWords.reduce((s2, word) => s2 + c.measureText(word).width + gap, 0);
    let x = w / 2 - (lineW + nameW + endW) / 2;
    lineWords.forEach((word, i) => {
      const a = easeOut(clamp((t - 1100 - i * 170) / 420));
      c.globalAlpha = a;
      c.fillStyle = "#f5ecd7";
      c.shadowColor = "rgba(0,0,0,0.9)";
      c.shadowBlur = 14;
      c.fillText(word, x, y2 + (1 - a) * 10);
      x += c.measureText(word).width + gap;
    });
    const land = clamp((t - 1500) / 520);
    if (land > 0) {
      const s = 1 + 0.18 * (1 - easeOut(land));
      c.save();
      c.translate(x + nameW / 2, y2);
      c.scale(s, s);
      c.globalAlpha = easeOut(land);
      const grad = c.createLinearGradient(0, -big / 2, 0, big / 2);
      grad.addColorStop(0, "#fff6d8");
      grad.addColorStop(0.55, "#f2c14e");
      grad.addColorStop(1, "#d98a2b");
      c.fillStyle = grad;
      c.shadowColor = `rgba(255,120,150,${(0.5 + 0.4 * Math.sin(now / 260) ** 2).toFixed(3)})`;
      c.shadowBlur = 26;
      c.fillText(ch.name, -nameW / 2, 0);
      // A sweep of light across the name.
      const sweep = clamp((t - 2300) / 900);
      if (sweep > 0 && sweep < 1) {
        // The same letters again, painted only by a moving white band.
        const sx = -nameW / 2 - 60 + (nameW + 120) * sweep;
        const shine = c.createLinearGradient(sx - 50, 0, sx + 50, 0);
        shine.addColorStop(0, "rgba(255,255,255,0)");
        shine.addColorStop(0.5, "rgba(255,255,255,0.8)");
        shine.addColorStop(1, "rgba(255,255,255,0)");
        c.fillStyle = shine;
        c.shadowBlur = 0;
        c.fillText(ch.name, -nameW / 2, 0);
      }
      c.restore();
      c.globalAlpha = easeOut(land);
      c.fillStyle = "#f5ecd7";
      c.shadowColor = "rgba(0,0,0,0.9)";
      c.shadowBlur = 14;
      c.fillText(ch.end, x + nameW, y2);
    }
    c.restore();
  }

  // Words written on the screen by a cinematic (they appear slowly, with
  // the time of the world).
  setCaption({ title = "", sub = "", big = false } = {}) {
    this.caption = title || sub ? { title, sub, big, t0: this.now() } : null;
  }

  drawCaption(now) {
    const cap = this.caption;
    if (!cap) return;
    const c = this.ctx;
    const t = (now - cap.t0) / 900;
    c.save();
    c.textAlign = "center";
    c.textBaseline = "middle";
    const y = cap.big ? this.height * 0.17 : this.height * 0.8;
    if (cap.title) {
      const a = Math.max(0, Math.min(1, t));
      const size = Math.round(Math.min(64, this.width / 12) * (0.92 + 0.08 * a));
      c.globalAlpha = a;
      c.font = `900 ${size}px system-ui, sans-serif`;
      c.shadowColor = "#000";
      c.shadowBlur = 18;
      const grad = c.createLinearGradient(0, y - size / 2, 0, y + size / 2);
      grad.addColorStop(0, "#fff6d8");
      grad.addColorStop(1, "#f2c14e");
      c.fillStyle = grad;
      c.fillText(cap.title.toUpperCase(), this.width / 2, y);
      c.shadowBlur = 0;
    }
    if (cap.sub) {
      const a = Math.max(0, Math.min(1, cap.title ? t - 0.5 : t));
      c.globalAlpha = a;
      c.font = `italic 600 ${Math.round(Math.min(24, this.width / 36))}px system-ui, sans-serif`;
      c.fillStyle = "#f5ecd7";
      c.shadowColor = "#000";
      c.shadowBlur = 10;
      c.fillText(cap.sub, this.width / 2, cap.title ? y + Math.min(48, this.width / 16) : y);
    }
    c.restore();
  }

  // A new scene starts from black (or white).
  fadeIn(ms = 450, color = "#000") {
    this.fade = { t0: this.now(), dur: ms, color };
  }

  npcArgv(argv) {
    if (!this.stage || !argv.length) return;
    const who = this.stageNpc(this.stage.argv_by || this.stage.answers);
    if (who) this.npcSay(who.id, `Je lance le programme avec : ${argv.join(" ")}`, { dur: 3200, delay: 200 });
  }

  // Reaction to the verification of the mission.
  npcReact(passed) {
    if (!this.stage) return;
    if (passed) {
      this.stage.done = true;
      this.stage.npcs.forEach((n) => this.npcPose(n.id, "cheer", 2600));
      const [id, text] = this.stage.success || [this.stage.npcs[0].id, "Merci, tu as réussi !"];
      this.npcSay(id, text, { dur: 4800, delay: 1500 });
      for (const n of this.stage.npcs) {
        this.particles.burst(this.npcTop(n.id), { count: 26, colors: ["#f2c14e", "#b8f36b", "#ffffff"], speed: 70, up: 140, gravity: 220, size: 4, glow: true });
      }
    } else {
      this.stage.npcs.forEach((n) => this.npcPose(n.id, "sad", 2200));
      const [id, text] = this.stage.fail || [this.stage.npcs[0].id, "Hmm… ce n'est pas encore ça. Regarde les vérifications en ✗."];
      this.npcSay(id, text, { dur: 3600, delay: 300 });
    }
  }

  collectStage(list, now) {
    const st = this.stage;
    if (!st) return;
    for (const [index, prop] of st.props.entries()) {
      const look = this.propLook(prop);
      const { parts, lights } = propParts(prop.type, { done: look.on, lit: look.lit, open: look.open, floors: look.count, t: now, n: prop.n, color: prop.color, since: now - (prop.litAt ?? -1e9) });
      prop.lights = lights;
      prop.index = index;
      prop.top = Math.max(0.5, ...parts.map((p) => p.z + p.h));
      const cx = parts.length ? Math.max(...parts.map((p) => p.x + p.w)) / 2 : 0.5;
      const cy = parts.length ? Math.max(...parts.map((p) => p.y + p.d)) / 2 : 0.5;
      prop.cx = cx;
      prop.cy = cy;
      // A little jump when the prop reacts (a click, the program).
      const bump = prop.pulseAt && now - prop.pulseAt < 400 ? Math.sin(((now - prop.pulseAt) / 400) * Math.PI) * 0.12 : 0;
      list.push({ d: this.depthOf(prop.x + cx, prop.y + cy, 0), fn: () => {
        this.drawModel(parts,
<<<<<<< HEAD
          (p) => ({ x: prop.x + p.x, y: prop.y + p.y, z: p.z, w: p.w, d: p.d, h: p.h }),
          (p, pi) => ({ color: p.c, outline: p.role === "flame" ? null : "rgba(0,0,0,0.25)",
            tex: p.w * p.h > 0.3 && p.role !== "flame" ? 2 : 0, seed: prop.seed + pi * 2.3 }));
=======
          (p) => ({ x: prop.x + p.x, y: prop.y + p.y, z: p.z + bump, w: p.w, d: p.d, h: p.h }),
          (p, pi) => ({ color: p.c, outline: p.role === "flame" ? null : "rgba(0,0,0,0.25)",
            tex: p.w * p.h > 0.3 && p.role !== "flame" ? 2 : 0, seed: prop.seed + pi * 2.3 }), { solid: true });
>>>>>>> c46f881 (lastfeatures)
      } });
      // Clickable: the screen box of the model.
      const box = this.screenBox(prop.x, prop.y, parts);
      this.hitboxes.push({ ...box, target: { kind: "prop", id: index } });
    }
    for (const n of st.npcs) {
      if (n.poseUntil && now > n.poseUntil) {
        n.pose = n.restPose || "idle";
        n.poseUntil = 0;
      }
      const { parts, lights } = npcParts(n.skin, n.pose, now, n.seed);
      n.lights = lights;
      list.push({ d: this.depthOf(n.x + 0.5, n.y + 0.5, 0) + 0.01, fn: () => {
        this.drawModel(parts,
          (p) => ({ x: n.x + p.x, y: n.y + p.y, z: p.z, w: p.w, d: p.d, h: p.h }),
          (p, pi) => ({ color: p.c, outline: p.role === "flame" ? null : "rgba(0,0,0,0.25)",
            tex: p.w * p.h > 0.12 && p.role !== "eye" && p.role !== "flame" ? 2 : 0, seed: n.seed + pi * 5.17 }));
      } });
      const [sx, sy] = this.project(n.x + 0.5, n.y + 0.5, 2.3);
      const [bx, by] = this.project(n.x + 0.5, n.y + 0.5, 0);
      const k = this.cam.k * this.zoom;
      this.hitboxes.push({ x0: sx - 18 * k, x1: sx + 18 * k, y0: sy, y1: by + 6, target: { kind: "npc", id: n.id } });
    }
  }

  // What a prop shows now: the mission result (done), what the program
  // did to it (code), what the player did with a click (open a chest…).
  propLook(prop) {
    const st = this.stage;
    const done = st ? (prop.invert ? !st.done : st.done) : false;
    const code = prop.code || {};
    const start = prop.start || {};
    const click = prop.click || {};
    return {
      on: code.on ?? done,
      // Lamps lit from the start unless the scene says otherwise; once the
      // mission is done, they shine.
      lit: code.on ?? (done ? true : start.on),
      open: click.open ?? code.open ?? start.open,
      count: code.count,
    };
  }

  propTop(prop) {
    return () => this.project(prop.x + (prop.cx || 0.5), prop.y + (prop.cy || 0.5), (prop.top || 1) * 0.85);
  }

  // ----------------------------------------------- code → world reactions
  // `result`: { state, news } from reactions.js. The state is the world as
  // the program left it at this step; the news, what this step changed
  // (animated only when the step is played forward).
  applyReactions(result, animate) {
    const { state, news } = result;
    const st = this.stage;
    this.setNight(state.night, animate);
    if (st) for (const p of st.props) p.code = { ...(state.props[p.type] || {}) };
    // The creatures brought by the program.
    const want = new Map(state.mobs.map((m) => [m.id, m]));
    const fleeing = new Set();
    for (const n of animate ? news : []) if (n.kind === "flee") n.ids.forEach((id) => fleeing.add(id));
    this.mobs = this.mobs.filter((m) => {
      if (!m.react) return true;
      if (want.has(m.id)) return !m.fleeing && !m.dying;
      if (fleeing.has(m.id) && !m.dying) {
        m.fleeing = this.now();
        this.later.push({ at: this.now() + 650, fn: () => { if (m.fleeing && this.mobs.includes(m)) this.killMob(m.id); } });
        return true;
      }
      return !!m.fleeing;
    });
    for (const m of state.mobs) {
      if (this.mobs.some((x) => x.id === m.id)) continue;
      const [x, y] = stageSD(m.at);
      this.mobs.push({ id: m.id, model: m.model, x, y, scale: 1, born: this.now(), hurt: 0, dying: 0, react: true });
    }
    if (!animate || !st) return;
    const now = this.now();
    const props = (target) => st.props.filter((p) => p.type === target);
    for (const n of news) {
      switch (n.kind) {
        case "nightfall":
          sound.play("whoosh", { gain: 0.6 });
          sound.play("chime", { gain: 0.25 });
          break;
        case "daybreak":
          sound.play("chime", { gain: 0.5 });
          break;
        case "ignite":
          for (const p of props(n.target)) {
            p.litAt = now;
            p.pulseAt = now;
            this.particles.burst(this.propTop(p), { count: 22, colors: ["#ffd27a", "#fff3c0", "#ff9a3a"], speed: 60, up: 70, gravity: -30, size: 3, glow: true });
          }
          sound.play("ignite");
          break;
        case "relight":
          for (const p of props(n.target)) {
            p.pulseAt = now;
            this.particles.burst(this.propTop(p), { count: 10, colors: ["#ffd27a", "#fff3c0"], speed: 40, up: 50, gravity: -30, size: 3, glow: true });
          }
          sound.play("twinkle", { gain: 0.5 });
          break;
        case "extinguish":
          for (const p of props(n.target)) {
            p.pulseAt = now;
            this.particles.burst(this.propTop(p), { count: 14, colors: ["#8a8a8a", "#bdbdbd"], speed: 30, up: 40, gravity: -40, size: 5, life: 1100 });
          }
          sound.play("whoosh", { gain: 0.4 });
          break;
        case "opened":
        case "closed":
          for (const p of props(n.target)) p.pulseAt = now;
          sound.play("door");
          break;
        case "grew":
          for (const p of props(n.target)) {
            p.pulseAt = now;
            this.particles.burst(this.propTop(p), { count: 10, colors: ["#e8d6a0", "#ffffff"], speed: 50, up: 40, gravity: 120, size: 3 });
          }
          sound.play("build", { gain: 0.6 });
          break;
        case "mob":
          sound.play("creature", { pitch: 150 });
          break;
        case "pulse":
          for (const p of props(n.args[0])) {
            p.pulseAt = now;
            this.particles.burst(this.propTop(p), { count: 12, colors: ["#fff3c0", "#f2c14e"], speed: 50, up: 50, gravity: -10, size: 3, glow: true });
          }
          break;
        case "burst":
          for (const p of props(n.args[0])) this.particles.burst(this.propTop(p), { count: 26, colors: [n.args[1] || "#f2c14e", "#ffffff"], speed: 80, up: 70, gravity: 80, size: 4, glow: true });
          break;
        case "say":
          this.npcSay(n.args[0], n.args[1]);
          break;
        case "pose":
          this.npcPose(n.args[0], n.args[1], 1800);
          break;
        case "sound":
          sound.play(n.args[0]);
          break;
        default:
          break;
      }
    }
  }

  // Screen rectangle of a model (for clicks), from its parts.
  screenBox(ox, oy, parts) {
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (const p of parts) {
      for (const [x, y, z] of [[p.x, p.y, p.z], [p.x + p.w, p.y + p.d, p.z], [p.x + p.w, p.y, p.z + p.h], [p.x, p.y + p.d, p.z + p.h], [p.x + p.w, p.y + p.d, p.z + p.h], [p.x, p.y, p.z + p.h]]) {
        const [sx, sy] = this.project(ox + x, oy + y, z);
        x0 = Math.min(x0, sx);
        x1 = Math.max(x1, sx);
        y0 = Math.min(y0, sy);
        y1 = Math.max(y1, sy);
      }
    }
    if (!Number.isFinite(x0)) {
      const [sx, sy] = this.project(ox + 0.5, oy + 0.5, 0);
      return { x0: sx - 10, x1: sx + 10, y0: sy - 20, y1: sy + 4 };
    }
    return { x0, x1, y0, y1 };
  }

  // Warm halos and sparks around torches, fires, portals…
  drawStageLights(now) {
    const st = this.stage;
    if (!st) return;
    const c = this.ctx;
    const k = this.cam.k * this.zoom;
    c.save();
    c.globalCompositeOperation = "lighter";
<<<<<<< HEAD
    const glow = this.theme.night ? ["88", "3a"] : ["50", "1e"];
=======
    const glow = this.theme.night || this.nightLevel() > 0.5 ? ["88", "3a"] : ["50", "1e"];
>>>>>>> c46f881 (lastfeatures)
    for (const item of [...st.props, ...st.npcs]) {
      for (const [lx, ly, lz, color] of item.lights || []) {
        const [x, y] = this.project(item.x + lx, item.y + ly, lz);
        const r = (22 + 4 * Math.sin(now / 160 + lx * 7)) * k;
        const g = c.createRadialGradient(x, y, 0, x, y, r);
        // Softer by day: several lights side by side (a torch in a hand
        // next to the torches of a house) must not burn the colors white.
        g.addColorStop(0, `${color}${glow[0]}`);
        g.addColorStop(0.35, `${color}${glow[1]}`);
        g.addColorStop(1, `${color}00`);
        c.fillStyle = g;
        c.fillRect(x - r, y - r, r * 2, r * 2);
        if (Math.random() < 0.04) {
          this.particles.ambient({ x, y, vx: (Math.random() - 0.5) * 10, vy: -20 - Math.random() * 20, g: 0, life: 900, size: 2.5, color, glow: true, fadeIn: true });
        }
      }
    }
    c.restore();
  }

  drawStageLabels() {
    const st = this.stage;
    if (!st) return;
    const sel = this.selected || {};
    for (const n of st.npcs) {
      const [x, y] = this.project(n.x + 0.5, n.y + 0.5, 0);
      const skin = SKINS[n.skin] || {};
      const on = sel.kind === "npc" && sel.id === n.id;
      this.tag(x, y + 26, n.name, on ? "#2b1d0e" : "#eaffd8", 10, on ? "rgba(242,193,78,0.95)" : "rgba(20,40,14,0.9)", { icon: skin.icon || "🧑", border: on ? "#fff3c0" : "#6aa84f" });
      // The name is clickable too: same as a click on the character.
      const r = this.lastTag;
      if (r) this.hitboxes.push({ x0: r.x, x1: r.x + r.w, y0: r.y, y1: r.y + r.h, target: { kind: "npc", id: n.id } });
    }
    for (const [i, p] of st.props.entries()) {
      if (!p.label) continue;
      const [x, y] = this.project(p.x + (p.cx || 0.5), p.y + (p.cy || 0.5), (p.top || 1) + 0.25);
      const on = sel.kind === "prop" && sel.id === i;
      this.tag(x, y, p.label, on ? "#2b1d0e" : "#f5ecd7", 9, on ? "rgba(242,193,78,0.95)" : "rgba(40,30,20,0.75)", {});
      const r = this.lastTag;
      if (r) this.hitboxes.push({ x0: r.x, x1: r.x + r.w, y0: r.y, y1: r.y + r.h, target: { kind: "prop", id: i } });
    }
  }

  // ------------------------------------------------- decorative creatures
  // Mobs shown in the trailer (no program behind them): they idle, get hit,
  // and vanish in a puff of smoke.
  setMobs(list) {
    this.mobs = (list || []).map((m, i) => {
      const [x, y] = SD(m.s, m.d);
      return { ...m, x, y, scale: m.scale || 1, born: this.now() + i * 120, hurt: 0, dying: 0 };
    });
    for (const m of this.mobs) this.addEffect({ kind: "pillar", at: () => this.project(m.x + 0.5 * m.scale, m.y + 0.5 * m.scale, 0), color: "#b8f36b", dur: 900 });
  }

  mobTop(id) {
    return () => {
      const m = this.mobs.find((x) => x.id === id);
      return m ? this.project(m.x + 0.5 * m.scale, m.y + 0.5 * m.scale, 1.6 * m.scale) : [0, 0];
    };
  }

  // A character of the scene (or the sky) strikes a mob.
  hitMob(id, from = null, color = "#ffd84a", big = false) {
    const m = this.mobs.find((x) => x.id === id);
    if (!m) return;
    const at = this.mobTop(id);
    if (from) this.addEffect({ kind: "beam", from, to: at, color, label: "", dur: 600 });
    else this.addEffect({ kind: "bolt", at, dur: 700 });
    m.hurt = this.now();
    this.particles.burst(at, { count: big ? 40 : 18, colors: [color, "#ffffff", "#ff6b61"], speed: big ? 140 : 80, up: 90, gravity: 220, size: 4, glow: true });
    if (big) this.shakeCamera(8, 400);
  }

  killMob(id) {
    const m = this.mobs.find((x) => x.id === id);
    if (!m) return;
    m.dying = this.now();
    const at = () => this.project(m.x + 0.5 * m.scale, m.y + 0.5 * m.scale, 0.8 * m.scale);
    this.particles.burst(at, { count: 36, colors: ["#dddddd", "#aaaaaa", "#ffffff"], speed: 90, up: 60, gravity: -20, size: 6, life: 900 });
    // (it shrinks for 450 ms of world time, then collectMobs forgets it)
  }

  collectMobs(list, now) {
    this.mobs = this.mobs.filter((m) => !m.dying || now - m.dying < 450);
    for (const m of this.mobs) {
      if (now < m.born) continue;
      const { parts } = buildParts(m.model, {}, {});
      const grow = Math.min(1, (now - m.born) / 300);
      const dying = m.dying ? Math.max(0, 1 - (now - m.dying) / 450) : 1;
      const k = m.scale * grow * dying;
      if (k <= 0.01) continue;
      const hurt = now - m.hurt < 260;
      // Idle: a slow breath. Clicked: a hop (a peaceful creature) or a
      // threatening lunge (a monster).
      const react = m.reactAt && now - m.reactAt < 520 ? Math.sin(((now - m.reactAt) / 520) * Math.PI) : 0;
      const bob = Math.abs(Math.sin(now / 260 + m.x)) * 0.06 + react * 0.35;
      const shake = hurt ? Math.sin(now / 25) * 0.08 : react * 0.12 * Math.sin(now / 40);
      if (m.fleeing) {
        // Running away from the light, towards the edge of the map.
        m.x += this.dt * 3.2;
        m.y -= this.dt * 1.2;
      }
      list.push({ d: this.depthOf(m.x + 0.5, m.y + 0.5, 0), fn: () => {
        this.drawModel(parts,
          (p) => ({ x: m.x + shake + p.x * k, y: m.y + p.y * k, z: p.z * k + bob, w: p.w * k, d: p.d * k, h: p.h * k }),
          (p, pi) => ({ color: hurt ? "#ff5040" : p.c, outline: "rgba(0,0,0,0.28)", tex: p.w * p.h > 0.12 ? 2 : 0, seed: pi * 4.1 + m.x }));
      } });
      const box = this.screenBox(m.x, m.y, parts.map((p) => ({ x: p.x * k, y: p.y * k, z: p.z * k, w: p.w * k, d: p.d * k, h: p.h * k })));
      this.hitboxes.push({ ...box, target: { kind: "mob", id: m.id } });
    }
  }

  // Make the crier react: speak, ask, read, call, alert or cheer.
  crierDo(pose, dur = 1400) {
    this.crierAct = { pose, t0: this.now(), dur };
    if (pose === "speak" || pose === "ask") this.crierSpeakAt = this.now();
  }

  crierTop() {
    const [x, y] = this.crierPos();
    return () => this.project(x + 0.5, y + 0.5, 3.0);
  }

  entityBase(oid) {
    const ent = this.entities.get(oid);
    if (!ent) return null;
    return () => this.project(ent.x + 0.5 * ent.scale, ent.y + 0.5 * ent.scale, 0);
  }

  addEffect(effect) {
    const fx = { t0: this.now(), dur: 1600, seed: Math.random() * 1000, cine: !!this.cinematic, ...effect };
    this.effects.push(fx);
    const at = fx.at || fx.to;
    if (!at) return;
    switch (fx.kind) {
      case "particles":
        this.particles.burst(at, { count: 18, color: fx.color, speed: 70, up: 40, size: 4, glow: true });
        break;
      case "explosion":
        this.particles.burst(at, { count: 40, colors: ["#ffcf4d", "#ff7a2a", "#e5534b", "#5a5a5a", "#8a8a8a"], speed: 160, up: 60, size: 7, life: 1200 });
        this.shakeCamera(10, 500);
        this.flashScreen("rgba(255,140,60,0.35)", 300);
        break;
      case "bolt":
        this.flashScreen("rgba(255,80,60,0.18)", 250);
        this.shakeCamera(4, 250);
        this.particles.burst(at, { count: 14, colors: ["#ffe066", "#ff8a80"], speed: 90, size: 3, glow: true, life: 600 });
        break;
      case "net":
        this.particles.burst(at, { count: 22, colors: ["#b8f36b", "#6ad04a", "#ffffff"], speed: 80, up: 50, size: 4, life: 900 });
        break;
      case "shield":
        this.particles.burst(at, { count: 12, colors: ["#ff6b61", "#ffffff"], speed: 70, size: 3, life: 700 });
        break;
      default:
        break;
    }
  }

  act(oid, kind) {
    const ent = this.entities.get(oid);
    if (ent) ent.anim = { kind, t0: this.now() };
  }

  pulseBlueprint(qual, color) {
    const bp = this.blueprints.get(qual);
    if (bp) {
      bp.pulse = this.now();
      bp.pulseColor = color;
    }
  }

  // Left/right position of a point of the world, for stereo sound.
  panAt(at) {
    if (!at || !this.width) return 0;
    const [x] = at();
    return Math.max(-0.8, Math.min(0.8, (x / this.width) * 2 - 1));
  }

  soundOf(ev) {
    let name = EVENT_SOUNDS[ev.type];
    if (!name) return;
    if (ev.type === "return" && !ev.rejected) return;
    const opts = {};
    if (ev.type === "print") {
      if (ev.oid && !ev.oid.startsWith("class:")) {
        name = "blip";
        opts.pan = this.panAt(this.entityTop(ev.oid));
      } else {
        opts.pan = this.panAt(this.crierTop());
      }
    } else if (ev.type === "call" || ev.type === "func_call") {
      opts.depth = this.stack.length;
      if (ev.oid) opts.pan = this.panAt(this.entityTop(ev.oid));
    } else if (ev.type === "spawn" && ev.oid) {
      opts.pan = this.panAt(() => {
        const e = this.entities.get(ev.oid);
        return e ? this.project(e.tx + 0.5, e.ty + 0.5, 1) : [this.width / 2, 0];
      });
    } else if (ev.type === "input") {
      opts.pan = this.panAt(this.crierTop());
    }
    sound.play(name, opts);
  }

  // Turn the events of one execution step into visible effects.
  animateEvents(events, state) {
    const names = TraceModel.names(state);
    for (const ev of events) {
      this.soundOf(ev);
      switch (ev.type) {
        case "class_def": {
          this.pulseBlueprint(ev.cls, "#5ee6e0");
          const at = this.blueprintTop(ev.cls);
          if (at) {
            this.addEffect({ kind: "float", at, text: `📐 plan ${ev.cls.split(".").pop()}`, color: "#7fe9f0" });
            this.particles.burst(at, { count: 16, colors: ["#5ee6e0", "#bffcff"], speed: 40, up: 20, gravity: -20, size: 3, glow: true });
          }
          break;
        }
        case "spawn": {
          const at = this.entityTop(ev.oid);
          if (!at) break;
          this.addEffect({ kind: "particles", at, color: "#b8f36b", dur: 900 });
          const base = this.entityBase(ev.oid);
          if (base) this.addEffect({ kind: "pillar", at: base, color: "#c8ff9a", dur: 1100 });
          if (ev.by && ev.by.kind === "classmethod") {
            const from = this.blueprintTop(ev.by.cls);
            if (from) this.addEffect({ kind: "beam", from, to: at, color: "#59b8f0", label: "cls(...)", dur: 1800 });
          } else {
            const from = this.blueprintTop(ev.cls);
            if (from) this.addEffect({ kind: "beam", from, to: at, color: "#b8f36b", label: "", dur: 900, thin: true });
          }
          break;
        }
        case "attr_set": {
          const at = this.entityTop(ev.oid);
          if (!at) break;
          const bad = ev.protected && !ev.internal;
          const old = ev.old ? `${showValue(ev.old)} → ` : "";
          const before = ev.old && (ev.old.t === "int" || ev.old.t === "float") ? Number(ev.old.r) : null;
          const after = ev.new && (ev.new.t === "int" || ev.new.t === "float") ? Number(ev.new.r) : null;
          if (before !== null && after !== null && before !== after) {
            const delta = Math.round((after - before) * 100) / 100;
            this.addEffect({ kind: "number", at, text: `${delta > 0 ? "+" : ""}${delta}`, color: delta > 0 ? "#7dff7a" : "#ff6b61", dur: 1100 });
          }
          this.addEffect({ kind: "float", at, text: `${bad ? "⚠ " : ev.protected ? "🔒 " : ""}${ev.name}: ${old}${showValue(ev.new)}`,
            color: bad ? "#ff6b61" : "#9fdcff", dur: 1800 });
          if (bad) {
            this.addEffect({ kind: "alert", at, dur: 1400 });
            this.act(ev.oid, "glitch");
          }
          break;
        }
        case "call": {
          const label = `${ev.method}()`;
          if (ev.kind === "static") {
            this.pulseBlueprint(ev.cls, "#b48cf2");
            const at = this.blueprintTop(ev.cls);
            if (at) {
              this.addEffect({ kind: "float", at, text: `⚙ ${label} — sans objet`, color: "#d7c0ff", dur: 1800 });
              this.addEffect({ kind: "gear", at, color: "#d7c0ff", dur: 1500 });
            }
            break;
          }
          if (ev.kind === "class") {
            this.pulseBlueprint(ev.receiver_cls || ev.cls, "#59b8f0");
            const at = this.blueprintTop(ev.receiver_cls || ev.cls);
            if (at) this.addEffect({ kind: "float", at, text: `🔷 ${label} (cls)`, color: "#9fdcff", dur: 1800 });
            break;
          }
          const at = this.entityTop(ev.oid);
          if (!at) break;
          if (ev.via_super) {
            const to = this.blueprintTop(ev.cls);
            if (to) this.addEffect({ kind: "beam", from: at, to, color: "#ffd56a", label: `super().${label}`, dur: 2000 });
            this.pulseBlueprint(ev.cls, "#ffd56a");
          } else if (ev.inherited && ev.method !== "__init__") {
            const to = this.blueprintTop(ev.cls);
            if (to) this.addEffect({ kind: "beam", from: at, to, color: "#e8c25a", label: `hérité de ${ev.cls}`, dur: 1500, thin: true });
          }
          if (ev.method !== "__init__") {
            this.addEffect({ kind: "float", at, text: `▶ ${label}`, color: "#ffe7a0", dur: 1300, rise: 0.6 });
            this.act(ev.oid, actionFor(ev.method));
            const base = this.entityBase(ev.oid);
            if (base) this.addEffect({ kind: "ring", at: base, color: ev.via_super ? "#ffd56a" : "#ffe7a0", dur: 700 });
          }
          // Methods that receive another object: draw the interaction.
          for (const [, value] of ev.args || []) {
            if (value && value.t === "obj" && value.ref !== ev.oid) {
              const to = this.entityTop(value.ref);
              if (to) this.addEffect({ kind: "beam", from: at, to, color: "#ff9d5c", label: "", dur: 1100 });
            }
          }
          break;
        }
        case "return": {
          if (ev.rejected && ev.oid) {
            const at = this.entityTop(ev.oid);
            if (at) this.addEffect({ kind: "shield", at, dur: 1800 });
          } else if (ev.value && ev.value.t !== "NoneType") {
            const at = ev.oid ? this.entityTop(ev.oid) : this.blueprintTop(ev.cls);
            if (at) this.addEffect({ kind: "float", at, text: `↩ ${showValue(ev.value)}`, color: "#c8f0a0", dur: 1500, rise: 0.4 });
          }
          break;
        }
        case "func_call": {
          const at = this.crierTop();
          this.crierDo("call", 1200);
          this.addEffect({ kind: "float", at, text: `fonction ${ev.name}()`, color: "#ffe7a0", dur: 1500 });
          for (const [, value] of ev.args || []) {
            if (value && value.t === "obj") {
              const to = this.entityTop(value.ref);
              if (to) this.addEffect({ kind: "beam", from: at, to, color: "#ffe7a0", label: "", dur: 1300 });
            }
          }
          break;
        }
        case "print": {
          let at = null;
          if (ev.oid && ev.oid.startsWith("class:")) at = this.blueprintTop(ev.oid.slice(6));
          else if (ev.oid) at = this.entityTop(ev.oid);
          if (!at) {
            at = this.crierTop();
            this.crierDo("speak", Math.min(4000, 1200 + ev.text.length * 30));
          }
          // One bubble per print(). Lines of the same string
          // (print("a\nb")) stay together; older bubbles pile up above.
          const owner = ev.oid || "crier";
          const mine = this.effects.filter((f) => f.kind === "bubble" && f.owner === owner);
          const last = mine[mine.length - 1];
          if (ev.cont && last && !last.question) {
            last.revealFrom = last.text.length + 1;
            last.text += `\n${ev.text}`;
            last.t0 = this.now();
            last.dur = Math.min(10000, 2600 + last.text.length * 45);
            break;
          }
          if (mine.length >= 3) this.effects = this.effects.filter((f) => f !== mine[0]);
          this.addEffect({ kind: "bubble", at, text: ev.text, revealFrom: 0, dur: Math.min(10000, 3200 + ev.text.length * 45), owner });
          break;
        }
        case "var_set": {
          if (ev.value.t === "obj") {
            const at = this.entityTop(ev.value.ref);
            if (at) this.addEffect({ kind: "float", at, text: `🏷 ${ev.name}`, color: "#ffffff", dur: 1200, rise: 0.3 });
          }
          break;
        }
        case "raise": {
          const at = (ev.oid && this.entityTop(ev.oid)) || this.stackTop() || this.crierTop();
          this.crierDo("alert", 1500);
          this.addEffect({ kind: "bolt", at, dur: 1300 });
          this.addEffect({ kind: "float", at, text: `⚡ ${ev.etype}`, color: "#ff8a80", dur: 1800 });
          break;
        }
        case "propagate": {
          const at = this.stackTop() || this.crierTop();
          this.addEffect({ kind: "float", at, text: `⤴ ${ev.etype} remonte`, color: "#ffb4ad", dur: 1300 });
          break;
        }
        case "caught": {
          const at = this.stackTop() || this.crierTop();
          this.crierDo("cheer", 1600);
          this.addEffect({ kind: "net", at, dur: 1600 });
          this.addEffect({ kind: "float", at, text: `🥅 ${ev.etype} attrapée`, color: "#b8f36b", dur: 1800 });
          break;
        }
        case "input": {
          const at = this.crierTop();
          this.crierDo("ask", 2600);
          this.addEffect({ kind: "bubble", at, text: `❓ ${ev.prompt.trim()}`, dur: Math.min(6000, 1800 + ev.prompt.length * 40), owner: "crier", question: true });
          const who = this.stage && this.stageNpc(this.stage.answers);
          if (who) {
            // The character of the story is the one who answers.
            this.npcSay(who.id, ev.value === "" ? "(il appuie sur Entrée)" : ev.value, { dur: 2600, delay: 350, answer: true });
          } else {
            this.addEffect({ kind: "float", at, text: `⌨ "${ev.value}"`, color: "#ffe7a0", dur: 1900, rise: 0.5 });
          }
          break;
        }
        case "yield": {
          const at = this.stackTop(1) || this.crierTop();
          this.particles.burst(at, { count: 20, colors: ["#5ee6e0", "#9ff7f2", "#ffffff"], speed: 50, up: 120, gravity: 160, size: 4, glow: true, spread: 0.9 });
          this.addEffect({ kind: "float", at, text: `✨ yield ${showValue(ev.value)}`, color: "#9ff7f2", dur: 1700 });
          break;
        }
        case "module_start":
          this.crierDo("read", 1800);
          this.addEffect({ kind: "float", at: this.crierTop(), text: `📦 import ${ev.name}`, color: "#ffe7a0", dur: 2000 });
          break;
        case "error": {
          const last = [...this.entities.keys()].pop();
          const at = (last && this.entityTop(last)) || this.crierTop();
          this.crierDo("alert", 2200);
          this.addEffect({ kind: "explosion", at, dur: 1400 });
          break;
        }
        default:
          break;
      }
    }
    void names;
  }

  showBoss(name, model, total) {
    this.boss = { name, model, total, hp: total, hit: 0 };
  }

  hitBoss(ok) {
    if (!this.boss) return;
    const at = () => this.project(...SD(14, 11.5), 2.8);
    if (ok) {
      this.boss.hp = Math.max(0, this.boss.hp - 1);
      this.boss.hit = this.now();
      this.addEffect({ kind: "beam", from: () => this.project(...SD(18, 0), 1.5), to: at, color: "#b8f36b", label: "", dur: 700 });
      this.addEffect({ kind: "particles", at, color: "#ff6b61", dur: 700 });
    } else {
      this.addEffect({ kind: "float", at, text: "✗ attaque repoussée", color: "#ff6b61", dur: 1200 });
    }
  }

  hideBoss() {
    this.boss = null;
  }

  // ------------------------------------------------------------- drawing
  loop(frame) {
    const real = Math.min(250, Math.max(0, frame - this.lastFrame));
    this.lastFrame = frame;
    if (!this.paused) this.time += real;
    const now = this.time;
    const dt = this.paused ? 0 : Math.min(0.05, real / 1000);
    this.dt = dt;
    const camDt = Math.min(0.05, real / 1000);
    for (const ent of this.entities.values()) {
      ent.x += (ent.tx - ent.x) * Math.min(1, dt * 6);
      ent.y += (ent.ty - ent.y) * Math.min(1, dt * 6);
    }
    this.effects = this.effects.filter((f) => now - f.t0 < f.dur);
    if (this.width > 0) {
      const target = this.frameTarget();
      if (this.snapCam) {
        this.snapCam = false;
        Object.assign(this.cam, { k: target.k, u: target.u, v: target.v });
      }
      const a = Math.min(1, camDt * (target.speed || 3));
      this.cam.k += (target.k - this.cam.k) * a;
      this.cam.u += (target.u - this.cam.u) * a;
      this.cam.v += (target.v - this.cam.v) * a;
      // Once (almost) there, stop exactly on the target: an endless tiny
      // drift made thin details shimmer.
      if (Math.abs(target.k - this.cam.k) < 1e-4) this.cam.k = target.k;
      if (Math.abs(target.u - this.cam.u) < 0.02) this.cam.u = target.u;
      if (Math.abs(target.v - this.cam.v) < 0.02) this.cam.v = target.v;
    }
<<<<<<< HEAD
=======
    if (this.panTo) {
      const a = Math.min(1, camDt * 7);
      this.pan.x += (this.panTo.x - this.pan.x) * a;
      this.pan.y += (this.panTo.y - this.pan.y) * a;
      if (Math.abs(this.panTo.x - this.pan.x) + Math.abs(this.panTo.y - this.pan.y) < 0.5) {
        this.pan = { ...this.panTo };
        this.panTo = null;
      }
    }
    if (this.zoomTo) {
      this.zoom += (this.zoomTo - this.zoom) * Math.min(1, camDt * 7);
      if (Math.abs(this.zoomTo - this.zoom) < 0.002) {
        this.zoom = this.zoomTo;
        this.zoomTo = null;
      }
    }
    if (this.width > 0 && !this.cinematic && !this.trailerActive) this.keepMapInView();
>>>>>>> c46f881 (lastfeatures)
    if (this.later.length) {
      const due = this.later.filter((l) => l.at <= now);
      this.later = this.later.filter((l) => l.at > now);
      due.forEach((l) => l.fn());
    }
    if (this.cinematic) this.cinematic.update();
    this.spawnAmbient(now);
    this.draw(now);
    requestAnimationFrame((t) => this.loop(t));
  }

  spawnAmbient(now) {
    const kind = AMBIENT[this.theme.ambient];
    if (!kind || now < this.nextAmbient || this.particles.list.length > 220) return;
    this.nextAmbient = now + 120;
    const [x, y] = this.project(hash(now, 1) * W, hash(now, 2) * D, 0.5 + hash(now, 3) * 2.5);
    this.particles.ambient({
      x, y, vx: (hash(now, 4) - 0.5) * 8, vy: kind.vy * (0.6 + hash(now, 5) * 0.8), g: 0,
      life: kind.life, size: kind.size, color: kind.colors[Math.floor(hash(now, 6) * kind.colors.length)],
      glow: kind.glow, fadeIn: true, wobble: hash(now, 7) * 6,
    });
  }

  poly(points, fill, stroke) {
    const c = this.ctx;
    c.beginPath();
    c.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i += 1) c.lineTo(points[i][0], points[i][1]);
    c.closePath();
    c.fillStyle = fill;
    c.fill();
    if (stroke) {
      c.strokeStyle = stroke;
      c.lineWidth = this.lineW || 1;
      c.stroke();
    }
  }

  // A face split into n×n cells with a slight color noise: the pixel look.
  texturedFace(pts, color, n, seed) {
    // Level of detail: when the cells would be only a few pixels wide (far
    // away, zoomed out), the face is drawn plain; tiny cells only made a
    // shimmering noise when the camera moved.
    const edge = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (Math.min(edge(pts[0], pts[1]), edge(pts[1], pts[2])) / n < 4) {
      this.poly(pts, color);
      return;
    }
    const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const at = (u, v) => lerp(lerp(pts[0], pts[1], u), lerp(pts[3], pts[2], u), v);
    // Base fill first: the tiny anti-aliased seams between the cells then
    // show the face color instead of dark lines.
    this.poly(pts, color);
    for (let i = 0; i < n; i += 1) {
      for (let j = 0; j < n; j += 1) {
        const f = 0.9 + hash(seed, i, j) * 0.18;
        this.poly([at(i / n, j / n), at((i + 1) / n, j / n), at((i + 1) / n, (j + 1) / n), at(i / n, (j + 1) / n)], shade(color, f));
      }
    }
  }

  // Draw an axis-aligned box given in world coordinates.
  // seed: fixes the pixel noise of a textured box. Moving things pass their
  // own stable seed, otherwise the noise would change every frame (flicker).
  box(x, y, z, w, d, h, color, alpha = 1, outline = "rgba(0,0,0,0.25)", tex = 0, seed = null) {
    const corners = [[x, y], [x + w, y], [x + w, y + d], [x, y + d]].map(([a, b]) => this.rotate(a, b));
    const xs = corners.map((c) => c[0]);
    const ys = corners.map((c) => c[1]);
    const rx = Math.min(...xs);
    const ry = Math.min(...ys);
    const rw = Math.max(...xs) - rx;
    const rd = Math.max(...ys) - ry;
    const [ox, oy, k] = this.origin();
    const P = (a, b, c) => [ox + (a - b) * (TW / 2) * k, oy + (a + b) * (TH / 2) * k - c * BH * k];
    const c = this.ctx;
    c.globalAlpha = alpha;
    const left = [P(rx, ry + rd, z + h), P(rx + rw, ry + rd, z + h), P(rx + rw, ry + rd, z), P(rx, ry + rd, z)];
    const right = [P(rx + rw, ry, z + h), P(rx + rw, ry + rd, z + h), P(rx + rw, ry + rd, z), P(rx + rw, ry, z)];
    const top = [P(rx, ry, z + h), P(rx + rw, ry, z + h), P(rx + rw, ry + rd, z + h), P(rx, ry + rd, z + h)];
    if (tex) {
      seed = seed ?? x * 13.1 + y * 7.7 + z * 3.3;
      this.texturedFace(left, shade(color, 0.66), tex, seed + 1);
      this.texturedFace(right, shade(color, 0.82), tex, seed + 2);
      this.texturedFace(top, color, tex, seed + 3);
      if (outline) {
        for (const face of [left, right, top]) this.poly(face, "rgba(0,0,0,0)", outline);
      }
    } else {
      this.poly(left, shade(color, 0.66), outline);
      this.poly(right, shade(color, 0.82), outline);
      this.poly(top, color, outline);
    }
    c.globalAlpha = 1;
  }

  depthOf(x, y, z) {
    const [rx, ry] = this.rotate(x, y);
    return rx + ry + z * 0.01;
  }

  // Draws the boxes of one model (character, prop, boss…) in the right
  // order. place(p) gives the box of a part in the world; style(p) its
  // color, outline, texture and alpha. See depth.js for the ordering.
<<<<<<< HEAD
  drawModel(parts, place, style) {
    const boxes = parts.map((p, pi) => ({ ...place(p, pi), p, pi }));
    for (const b of orderBoxes(boxes, (x, y) => this.rotate(x, y))) {
=======
  // solid: scenery made of solid blocks (see depth.js); characters keep the
  // order of their model.
  drawModel(parts, place, style, { solid = false } = {}) {
    const boxes = parts.map((p, pi) => ({ ...place(p, pi), p, pi }));
    for (const b of orderBoxes(boxes, (x, y) => this.rotate(x, y), { solid })) {
>>>>>>> c46f881 (lastfeatures)
      const st = style(b.p, b.pi);
      if (!st) continue;
      this.box(b.x, b.y, b.z, b.w, b.d, b.h, st.color, st.alpha ?? 1, st.outline === undefined ? "rgba(0,0,0,0.26)" : st.outline,
        st.tex || 0, st.seed);
    }
  }

  draw(now) {
    const c = this.ctx;
    // Outlines get thinner when zoomed out, so they never swallow details.
    this.lineW = Math.max(0.5, Math.min(1, this.cam.k * this.zoom));
    this.drawSky(now);
    this.drawGround();
    this.drawShadows(now);
    const drawables = [];
    this.hitboxes = [];
    this.collectProps(drawables, now);
    this.collectStage(drawables, now);
    this.collectMobs(drawables, now);
    if (this.theme.coeur) collectCoeur(this, drawables, now);

    // Blueprint pedestals and holograms (with a scan line while building).
    for (const bp of this.blueprints.values()) {
      const s = bp.scale;
      const age = (now - bp.born) / 900;
      const born = ease(Math.min(1, age));
      const pulse = Math.max(0, 1 - (now - bp.pulse) / 900);
      drawables.push({ d: this.depthOf(bp.x + 1, bp.y + 1, 0), fn: () => {
        if (!bp.owner) {
          this.box(bp.x, bp.y, 0, 2, 2, 0.16, "#2f3f52", 1, "rgba(0,0,0,0.35)", 2);
          this.box(bp.x + 0.15, bp.y + 0.15, 0.16, 1.7, 1.7, 0.04, "#1d2c3c", 1, "rgba(94,230,224,0.45)");
        }
        const glow = 0.35 + 0.35 * pulse + 0.1 * Math.sin(now / 300);
        this.box(bp.x + 0.5, bp.y + 0.5, bp.owner ? 0.18 : 0.2, s, s, 0.03, pulse > 0 ? bp.pulseColor : "#5ee6e0", glow, null);
      } });
      drawables.push({ d: this.depthOf(bp.x + 1.01, bp.y + 1.01, 0.5), fn: () => {
        const ox = bp.x + 0.5;
        const oy = bp.y + 0.5;
        const sc = s * born;
        const maxZ = Math.max(...bp.parts.map((p) => p.z + p.h));
        const cut = age < 1 ? maxZ * age : 99;
        const flicker = 0.04 * Math.sin(now / 90 + bp.x);
        const shown = bp.parts.filter((p) => p.z <= cut);
        this.drawModel(shown,
          (p) => ({ x: ox + p.x * sc, y: oy + p.y * sc, z: 0.25 + p.z * sc, w: p.w * sc, d: p.d * sc, h: Math.min(p.h, cut - p.z) * sc }),
          () => ({ color: pulse > 0 ? bp.pulseColor : "#7fe9f0", alpha: 0.3 + 0.4 * pulse + flicker, outline: "rgba(140,250,245,0.6)" }));
        if (age < 1) {
          const [lx, ly] = this.project(ox + 0.5 * sc, oy + 0.5 * sc, 0.25 + cut * sc);
          c.fillStyle = "rgba(190,255,250,0.8)";
          c.fillRect(lx - 22 * this.cam.k, ly, 44 * this.cam.k, 2);
        }
      } });
      const [lx, ly] = this.project(bp.x + 1, bp.y + 1, 0);
      const k = this.cam.k * this.zoom;
      this.hitboxes.push({ x0: lx - 30 * k, x1: lx + 30 * k, y0: ly - 60 * k * s, y1: ly + 12, target: { kind: "class", id: bp.qual } });
    }

    // Wooden signposts for simple variables.
    for (const sign of this.signs.values()) {
      drawables.push({ d: this.depthOf(sign.x + 0.5, sign.y + 0.5, 0), fn: () => {
        this.box(sign.x + 0.45, sign.y + 0.45, 0, 0.1, 0.1, 0.85, "#6b4527");
        this.box(sign.x + 0.05, sign.y + 0.42, 0.7, 0.9, 0.08, 0.55, "#b8894f", 1, "rgba(60,35,15,0.6)", 2);
      } });
    }

    // Collections and the call stack tower.
    this.collectCollections(drawables, now);
    const [tx, ty] = this.stackBase();
    if (this.stack.length) {
      drawables.push({ d: this.depthOf(tx + 0.5, ty + 0.5, -1), fn: () => this.box(tx - 0.05, ty - 0.05, 0, 0.9 + 0.1, 0.9 + 0.1, 0.08, "#4a4a4a") });
    }
    this.stack.forEach((frame, i) => {
      const color = frame.type === "gen" ? "#3fb7b0" : frame.kind === "static" ? "#8a6ad0" : frame.kind === "class" ? "#4a8ad0" : frame.cls ? "#c9a24a" : "#7d9a5a";
      const top = i === this.stack.length - 1;
      drawables.push({ d: this.depthOf(tx + 0.5, ty + 0.5, i), fn: () => {
        this.box(tx + 0.1, ty + 0.1, 0.08 + i * 0.55, 0.8, 0.8, 0.5, color, 1, "rgba(0,0,0,0.3)", 2);
        if (top) this.box(tx + 0.25, ty + 0.25, 0.58 + i * 0.55, 0.5, 0.5, 0.04, "#fff7c0", 0.5 + 0.4 * Math.sin(now / 200), null);
      } });
    });

    // Entities (objects).
    for (const ent of this.entities.values()) {
      const parts = this.animatedParts(ent, now);
      const blink = (now + ent.oid.length * 731) % 3600 < 120;
      // One drawable per object, parts ordered inside it (legs first), so
      // the parts of one body never flicker in front of each other.
      const glitch = ent.anim && ent.anim.kind === "glitch" && now - ent.anim.t0 < 900;
      const hurt = ent.anim && ent.anim.kind === "hurt" && now - ent.anim.t0 < 400;
      drawables.push({ d: this.depthOf(ent.x + 0.5 * ent.scale, ent.y + 0.5 * ent.scale, 0), fn: () => {
        const sc = ent.scale;
        this.drawModel(parts.filter((p) => !(p.role === "eye" && blink)),
          (p) => ({ x: ent.x + p.x * sc, y: ent.y + p.y * sc, z: p.z * sc + (p.lift || 0), w: p.w * sc, d: p.d * sc, h: p.h * sc }),
          (p, pi) => ({
            color: (glitch && Math.floor(now / 80) % 2) || hurt ? "#ff4b3e" : p.c,
            alpha: p.role === "beam" ? 0.55 : 1,
            tex: p.w * p.h > 0.12 && p.role !== "eye" ? 2 : 0,
            seed: pi * 7.31 + ent.oid.length,
          }));
      } });
      const top = Math.max(...ent.parts.map((p) => p.z + p.h)) * ent.scale;
      const [sx, sy] = this.project(ent.x + 0.5 * ent.scale, ent.y + 0.5 * ent.scale, top);
      const [bx, by] = this.project(ent.x + 0.5 * ent.scale, ent.y + 0.5 * ent.scale, 0);
      const k = this.cam.k * this.zoom;
      this.hitboxes.push({ x0: sx - 22 * k, x1: sx + 22 * k, y0: sy - 8, y1: by + 8, target: { kind: "object", id: ent.oid } });
    }

    if (this.boss) this.collectBoss(drawables, now);
    drawables.sort((a, b) => a.d - b.d);
    drawables.forEach((d) => d.fn());
    this.drawNight(now);
    this.drawStageLights(now);
    if (this.theme.coeur) drawCoeurLights(this, now);

    this.particles.draw(c, this.dt || 0.016);
    this.drawGrade(now);
    this.labelRects = [];
    this.drawInheritance(now);
    this.drawLinks(now);
    if (!this.quiet) this.drawLabels(now);
    this.drawCollectionLabels(now);
    this.drawStackLabels();
    this.drawEffects(now);
    this.drawPaused();
    this.drawBubbles(now);
    this.drawOverlay(now);
  }

  drawSky(now) {
    const c = this.ctx;
    const t = this.theme;
    const sky = c.createLinearGradient(0, 0, 0, this.height);
    sky.addColorStop(0, t.sky[0]);
    sky.addColorStop(1, t.sky[1]);
    c.fillStyle = sky;
    c.fillRect(0, 0, this.width, this.height);
    // The night falls: a deep blue sky, the stars come out one by one.
    const n = t.night ? 0 : this.nightLevel();
    if (n > 0.001) {
      const dusk = c.createLinearGradient(0, 0, 0, this.height);
      dusk.addColorStop(0, `rgba(8,10,38,${(0.92 * n).toFixed(3)})`);
      dusk.addColorStop(0.75, `rgba(40,30,80,${(0.8 * n).toFixed(3)})`);
      dusk.addColorStop(1, `rgba(90,60,90,${(0.6 * n).toFixed(3)})`);
      c.fillStyle = dusk;
      c.fillRect(0, 0, this.width, this.height);
      for (let i = 0; i < 70; i += 1) {
        const show = Math.max(0, Math.min(1, n * 1.6 - hash(i, 41) * 0.6));
        if (!show) continue;
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(now / 900 + i));
        c.globalAlpha = tw * show;
        c.fillStyle = i % 9 === 0 ? "#d7c0ff" : "#ffffff";
        c.fillRect((i * 137.5) % this.width, (i * 53.3) % (this.height * 0.5), i % 7 === 0 ? 3 : 2, i % 7 === 0 ? 3 : 2);
      }
      c.globalAlpha = 1;
      // The moon.
      const mx = this.width * 0.82;
      const my = this.height * 0.14;
      c.globalAlpha = n;
      c.fillStyle = "#f5f1dc";
      c.beginPath();
      c.arc(mx, my, 16, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "rgba(20,22,60,0.9)";
      c.beginPath();
      c.arc(mx + 7, my - 4, 14, 0, Math.PI * 2);
      c.fill();
      c.globalAlpha = 1;
    }
    if (t.night) {
      for (let i = 0; i < 90; i += 1) {
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(now / 900 + i));
        c.globalAlpha = tw * (this.themeName === "mine" ? 0.25 : 0.9);
        c.fillStyle = i % 9 === 0 ? "#d7c0ff" : "#ffffff";
        const size = i % 7 === 0 ? 3 : 2;
        c.fillRect((i * 137.5) % this.width, (i * 53.3) % (this.height * 0.55), size, size);
      }
      c.globalAlpha = 1;
      if (t.coeur) drawCoeurSky(this, now);
      if (this.themeName === "tour" || this.themeName === "faille") {
        const g = c.createRadialGradient(this.width * 0.8, this.height * 0.15, 5, this.width * 0.8, this.height * 0.15, 220);
        g.addColorStop(0, this.themeName === "tour" ? "rgba(180,100,255,0.35)" : "rgba(255,90,60,0.35)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        c.fillStyle = g;
        c.fillRect(0, 0, this.width, this.height);
      }
      return;
    }
    // At night the sun sets and the clouds turn grey-blue.
    c.save();
    if (t.sun && n < 0.98) {
      c.globalAlpha = 1 - n;
      const sx = this.width - 90;
      const g = c.createRadialGradient(sx, 70, 10, sx, 70, 110);
      g.addColorStop(0, "rgba(255,250,210,0.9)");
      g.addColorStop(1, "rgba(255,250,210,0)");
      c.fillStyle = g;
      c.fillRect(sx - 120, 0, 240, 200);
      c.fillStyle = "#fff6c8";
      c.fillRect(sx - 18, 52, 36, 36);
    }
    c.globalAlpha = 1 - 0.65 * n;
    for (const cl of this.clouds) {
      const x = ((cl.x + (now / 1000) * cl.speed) % (this.width + 300)) - 150;
      c.fillStyle = "rgba(255,255,255,0.85)";
      c.fillRect(x, cl.y, cl.w, 14);
      c.fillRect(x + cl.w * 0.2, cl.y - 10, cl.w * 0.5, 12);
      c.fillStyle = "rgba(220,230,240,0.8)";
      c.fillRect(x, cl.y + 14, cl.w, 5);
    }
    c.restore();
  }

  // The ground is expensive (thousands of textured cells). It is rendered
  // once per theme and rotation, at a fixed scale, into an offscreen
  // canvas. The isometric projection is just a scale + a translation, so
  // each frame only has to draw that image at the right place: the ground
  // stays textured and stable even while the camera moves or shakes.
  drawGround() {
    // Resolution of the cached image: just enough for the current zoom and
    // screen density (2 to 4), so it stays sharp without using too much memory.
    const dpr = window.devicePixelRatio || 1;
    // The resolution only goes up (never down): zooming in and out around a
    // threshold used to re-render the ground again and again (a visible pop).
    const want = Math.min(4, Math.max(2, Math.ceil(this.cam.k * this.zoom * dpr)));
    const base = `${this.rot}|${this.themeName}`;
    if (this.groundBase !== base) {
      this.groundBase = base;
      this.groundK = want;
    }
    this.groundK = Math.max(this.groundK, want);
    const K0 = this.groundK;
    const pad = 12;
    const key = `${base}|${K0}`;
    if (key !== this.groundKey || !this.groundReady) {
      const cache = this.groundCache;
      const gw = Math.ceil((W + D) * (TW / 2) * K0 + pad * 2);
      const gh = Math.ceil(((W + D) * (TH / 2) + (this.theme.coeur ? 5.5 : 3) * BH) * K0 + pad * 2);
      cache.width = gw;
      cache.height = gh;
      const cctx = cache.getContext("2d");
      cctx.clearRect(0, 0, gw, gh);
      this.groundOrigin = [D * (TW / 2) * K0 + pad, 0.6 * BH * K0 + pad];
      const main = this.ctx;
      this.ctx = cctx;
      this.fixedOrigin = [this.groundOrigin[0], this.groundOrigin[1], K0];
      try {
        this.renderGround(true);
      } finally {
        this.fixedOrigin = null;
        this.ctx = main;
      }
      this.groundKey = key;
      this.groundReady = true;
    }
    const [ox, oy, k] = this.origin();
    const scale = k / K0;
    const c = this.ctx;
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = "high";
    c.drawImage(this.groundCache, ox - this.groundOrigin[0] * scale, oy - this.groundOrigin[1] * scale,
      this.groundCache.width * scale, this.groundCache.height * scale);
  }

  renderGround(detailed) {
    const t = this.theme;
    const tiles = [];
    for (let x = 0; x < W; x += 1) {
      for (let y = 0; y < D; y += 1) tiles.push([x, y]);
    }
    tiles.sort((a, b) => this.depthOf(a[0], a[1], 0) - this.depthOf(b[0], b[1], 0));
    for (const [x, y] of tiles) {
      const zone = x + y < 10 ? "create" : x - y < -9 ? "square" : "world";
      let color = t.top;
      if (zone === "create") color = t.coeur ? ((x + y) % 2 ? "#26304a" : "#2b3756") : (x + y) % 2 ? "#33506b" : "#3a5975";
      else if (t.coeur) color = coeurTile(x, y);
      else if (zone === "square") color = hash(x, y) < 0.5 ? t.path : shade(t.path, 0.92);
      else if (hash(x, y, 9) < 0.12) color = shade(t.top, 0.9);
      const [rx, ry] = this.rotate(x, y);
      const edge = rx >= W - 1 || ry >= D - 1;
      const outline = zone === "create" ? "rgba(94,230,224,0.28)" : detailed ? null : "rgba(0,0,0,0.06)";
      this.box(x, y, -0.5, 1, 1, 0.5, color, 1, outline, detailed ? 3 : 0);
      if (edge) {
        this.box(x, y, -1.4, 1, 1, 0.9, t.side, 1, "rgba(0,0,0,0.2)", detailed ? 3 : 0);
        this.box(x, y, -2.2, 1, 1, 0.8, t.coeur ? "#241d36" : "#5e5a57", 1, "rgba(0,0,0,0.25)", detailed ? 3 : 0);
        if (t.coeur && (x * 7 + y * 3) % 5 === 0) {
          // Glowing crystals hanging under the floating platform.
          const len = 0.6 + hash(x, y, 2) * 1.2;
          this.box(x + 0.3, y + 0.3, -2.2 - len, 0.4, 0.4, len, hash(x, y, 4) < 0.5 ? "#9ff7f2" : "#d7c0ff", 1, null);
          this.box(x + 0.4, y + 0.4, -2.4 - len, 0.2, 0.2, 0.2, "#ffffff", 1, null);
        }
        if (t.grass && zone !== "square") this.box(x, y, -0.62, 1, 1, 0.12, shade(t.top, 0.85), 1, null);
      }
      if (!detailed || zone !== "world") continue;
      const r = hash(x, y, 3);
      if (t.grass && r < 0.06) {
        const flower = ["#e5534b", "#f2c14e", "#ffffff", "#7aa7ff"][Math.floor(hash(x, y, 4) * 4)];
        const fx = x + 0.2 + hash(x, y, 5) * 0.5;
        const fy = y + 0.2 + hash(x, y, 6) * 0.5;
        this.box(fx + 0.04, fy + 0.04, 0, 0.04, 0.04, 0.22, "#3f7f2c", 1, null);
        this.box(fx, fy, 0.2, 0.12, 0.12, 0.1, flower, 1, null);
      } else if (t.grass && r < 0.16) {
        const gx = x + 0.2 + hash(x, y, 7) * 0.5;
        const gy = y + 0.2 + hash(x, y, 8) * 0.5;
        this.box(gx, gy, 0, 0.05, 0.05, 0.2, shade(t.top, 1.15), 1, null);
        this.box(gx + 0.12, gy + 0.05, 0, 0.05, 0.05, 0.15, shade(t.top, 1.05), 1, null);
      } else if (!t.grass && r < 0.08) {
        this.box(x + 0.3, y + 0.3, 0, 0.18, 0.18, 0.08, shade(t.top, 0.75), 1, null);
      }
    }
  }

  // A golden ring on the ground under what the player selected.
  drawSelectionRing(x, y, r, now) {
    const c = this.ctx;
    const k = this.cam.k * this.zoom;
    const pulse = 1 + 0.12 * Math.sin(now / 180);
    c.save();
    c.strokeStyle = "#f2c14e";
    c.lineWidth = 3;
    c.shadowColor = "#f2c14e";
    c.shadowBlur = 12;
    c.beginPath();
    c.ellipse(x, y, r * k * pulse, r * 0.5 * k * pulse, 0, 0, Math.PI * 2);
    c.stroke();
    c.restore();
  }

  drawShadows(now) {
    const c = this.ctx;
    const k = this.cam.k * this.zoom;
    const sel = this.selected;
    if (sel && this.stage && sel.kind === "npc") {
      const n = this.stage.npcs.find((x) => x.id === sel.id);
      if (n) this.drawSelectionRing(...this.project(n.x + 0.5, n.y + 0.5, 0), 24, now);
    } else if (sel && this.stage && sel.kind === "prop") {
      const p = this.stage.props[sel.id];
      if (p) this.drawSelectionRing(...this.project(p.x + (p.cx || 0.5), p.y + (p.cy || 0.5), 0), 34, now);
    } else if (sel && sel.kind === "mob") {
      const m = this.mobs.find((x) => x.id === sel.id);
      if (m) this.drawSelectionRing(...this.project(m.x + 0.5 * m.scale, m.y + 0.5 * m.scale, 0), 26 * m.scale, now);
    }
    c.fillStyle = "rgba(0,0,0,0.22)";
    for (const ent of this.entities.values()) {
      if (ent.owner) continue;
      const [x, y] = this.project(ent.x + 0.5 * ent.scale, ent.y + 0.5 * ent.scale, 0);
      const lift = ent.anim && now - ent.anim.t0 < 1000 ? 0.85 : 1;
      c.beginPath();
      c.ellipse(x, y, 20 * k * ent.scale * lift, 10 * k * ent.scale * lift, 0, 0, Math.PI * 2);
      c.fill();
    }
    const [cx, cy] = this.crierPos();
    const [sx, sy] = this.project(cx + 0.5, cy + 0.5, 0);
    c.beginPath();
    c.ellipse(sx, sy, 26 * k, 13 * k, 0, 0, Math.PI * 2);
    c.fill();
    for (const m of this.mobs) {
      const [mx, my] = this.project(m.x + 0.5 * m.scale, m.y + 0.5 * m.scale, 0);
      c.beginPath();
      c.ellipse(mx, my, 20 * k * m.scale, 10 * k * m.scale, 0, 0, Math.PI * 2);
      c.fill();
    }
    for (const n of this.stage ? this.stage.npcs : []) {
      const [nx, ny] = this.project(n.x + 0.5, n.y + 0.5, 0);
      c.beginPath();
      c.ellipse(nx, ny, 18 * k, 9 * k, 0, 0, Math.PI * 2);
      c.fill();
    }
    if (this.selected && this.selected.kind === "object") {
      const ent = this.entities.get(this.selected.id);
      if (ent) {
        const [x, y] = this.project(ent.x + 0.5 * ent.scale, ent.y + 0.5 * ent.scale, 0);
        const pulse = 1 + 0.12 * Math.sin(now / 180);
        c.strokeStyle = "#f2c14e";
        c.lineWidth = 3;
        c.shadowColor = "#f2c14e";
        c.shadowBlur = 12;
        c.beginPath();
        c.ellipse(x, y, 28 * k * ent.scale * pulse, 14 * k * ent.scale * pulse, 0, 0, Math.PI * 2);
        c.stroke();
        c.shadowBlur = 0;
      }
    }
  }

  collectProps(list, now) {
    const props = [];
    const kind = this.theme.prop;
    const spots = (this.stage ? [SD(39, 7), SD(44, -2), SD(25, -22), SD(11, 9), SD(36, 0)] : [SD(25, 21), SD(31, 15), SD(39, 7), SD(44, -2), SD(25, -22), SD(11, 9)]);
    const spotOf = [];
    spots.forEach(([x, y], i) => {
      while (spotOf.length < props.length) spotOf.push(i - 1);
      if (kind === "tree") {
        const big = hash(i, 11) > 0.5;
        // The trunk stops under the leaves; the apple hangs on their face.
        props.push([x + 0.35, y + 0.35, 0, 0.3, 0.3, big ? 1.5 : 1.0, "#6b4527", 2]);
        props.push([x - 0.4, y - 0.4, big ? 1.5 : 1.0, 1.4, 1.4, 0.9, "#3f8a2c", 3]);
        props.push([x - 0.1, y - 0.1, big ? 2.4 : 1.9, 0.8, 0.8, 0.5, "#4f9a35", 2]);
        if (hash(i, 12) > 0.6) props.push([x + 0.55, y + 1.002, big ? 1.8 : 1.3, 0.14, 0.01, 0.14, "#e5534b", 0]);
      } else if (kind === "lava") {
        const glow = 0.85 + 0.15 * Math.sin(now / 300 + i);
        props.push([x - 0.4, y - 0.4, -0.05, 1.3, 1.3, 0.1, shade("#f28c28", glow), 2]);
        props.push([x - 0.2, y - 0.2, 0.05, 0.4, 0.4, 0.02, "#ffe066", 0]);
      } else if (kind === "crystal") {
        props.push([x, y, 0, 0.35, 0.35, 1.1, "#b48cf2", 2], [x + 0.4, y + 0.2, 0, 0.25, 0.25, 0.7, "#d7c0ff", 0]);
      } else if (kind === "pillar") {
        props.push([x, y, 0, 0.7, 0.7, 2.6, "#1e1530", 3], [x + 0.15, y + 0.15, 2.6, 0.4, 0.4, 0.4, "#ff6af0", 0]);
      } else if (kind === "wall") {
        props.push([x, y, 0, 1, 1, 1.2, "#777b82", 3], [x, y, 1.2, 0.3, 1, 0.3, "#6a6e75", 0], [x + 0.7, y, 1.2, 0.3, 1, 0.3, "#6a6e75", 0]);
      } else if (kind === "ore") {
        props.push([x, y, 0, 1, 1, 1, "#7d7d7d", 3], [x + 0.2, y + 1.001, 0.3, 0.2, 0.01, 0.15, "#f2c14e", 0],
          [x + 0.6, y + 1.001, 0.6, 0.15, 0.01, 0.15, "#5fe0e0", 0]);
      } else if (kind === "bookshelf") {
        props.push([x, y, 0, 1, 1, 1.1, "#8a5a2b", 2], [x + 0.08, y + 1.001, 0.15, 0.84, 0.01, 0.35, "#5a3f8f", 0],
          [x + 0.08, y + 1.001, 0.6, 0.84, 0.01, 0.35, "#a8322a", 0]);
      } else if (kind === "table") {
        props.push([x, y, 0, 1, 1, 0.95, "#a3753f", 2], [x - 0.02, y - 0.02, 0.95, 1.04, 1.04, 0.08, "#7a5230", 2]);
      }
    });
    // One drawable per decoration (a tree = trunk + leaves), drawn in order.
    while (spotOf.length < props.length) spotOf.push(spots.length - 1);
    const groups = new Map();
    props.forEach((p, i) => {
      const key = spotOf[i];
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(p);
    });
    for (const group of groups.values()) {
      const [gx, gy] = [group[0][0], group[0][1]];
      list.push({ d: this.depthOf(gx + 0.5, gy + 0.5, 0), fn: () => this.drawModel(group,
        (p) => ({ x: p[0], y: p[1], z: p[2], w: p[3], d: p[4], h: p[5] }),
<<<<<<< HEAD
        (p, pi) => ({ color: p[6], outline: "rgba(0,0,0,0.25)", tex: p[7] || 0, seed: gx * 3.1 + gy * 1.7 + pi })) });
=======
        (p, pi) => ({ color: p[6], outline: "rgba(0,0,0,0.25)", tex: p[7] || 0, seed: gx * 3.1 + gy * 1.7 + pi }), { solid: true }) });
>>>>>>> c46f881 (lastfeatures)
    }
    // The town crier on his stage: everything printed outside of any object
    // comes out of his mouth.
    const [cx, cy] = this.crierPos();
    const act = this.crierAct;
    const pose = act && now - act.t0 < act.dur ? act.pose : "idle";
    // A little jump when a new intervention starts.
    const start = act && pose !== "idle" ? Math.max(0, 1 - (now - act.t0) / 260) : 0;
    const jump = Math.sin(start * Math.PI) * 0.18;
    list.push({ d: this.depthOf(cx + 0.5, cy + 0.5, 0), fn: () => {
      this.box(cx - 0.2, cy - 0.2, 0, 1.4, 1.4, 0.3, "#8a5a2b", 1, "rgba(0,0,0,0.3)", 3);
      this.box(cx - 0.25, cy - 0.25, 0.3, 1.5, 1.5, 0.05, "#a8322a", 1, null);
      this.box(cx - 0.251, cy + 1.249, 0.22, 1.502, 0.002, 0.08, "#f2c14e", 1, null);
    } });
    // The crier is drawn as one block: legs first (everything else is above
    // them), then the other parts from back to front. Sorting every part
    // with the rest of the world made some of them pop in and out.
    list.push({ d: this.depthOf(cx + 0.5, cy + 0.5, 0) + 0.01, fn: () => {
      this.drawModel(crierParts(pose, now),
        (p) => ({ x: cx + p.x, y: cy + p.y, z: 0.35 + p.z + jump, w: p.w, d: p.d, h: p.h }),
        (p, pi) => ({ color: p.c, tex: p.w * p.h > 0.12 ? 2 : 0, seed: pi * 5.17 }));
    } });
    list.push({ d: this.depthOf(cx - 0.6, cy + 0.9, 0), fn: () => {
      this.box(cx - 0.75, cy + 0.75, 0, 0.1, 0.1, 1.6, "#6b4527");
      this.box(cx - 0.95, cy + 0.72, 1.15, 0.5, 0.06, 0.4, "#a8322a", 1, "rgba(0,0,0,0.3)");
      this.box(cx - 0.95, cy + 0.719, 1.3, 0.5, 0.06, 0.06, "#f2c14e", 1, null);
    } });
  }

  collectBoss(list, now) {
    const b = this.boss;
    const shake = now - b.hit < 400 ? Math.sin(now / 20) * 0.15 : 0;
    const float = Math.sin(now / 500) * 0.1;
    const { parts } = buildParts(b.model, {}, {});
    const [bx, by] = SD(14, 11.5);
    // Drawn as one block (parts ordered inside it) so they never flicker.
    list.push({ d: this.depthOf(bx + 1, by + 1, 0), fn: () => {
      this.drawModel(parts,
        (p) => ({ x: bx - 0.4 + shake + p.x * 1.8, y: by - 0.4 + p.y * 1.8, z: p.z * 1.8 + float, w: p.w * 1.8, d: p.d * 1.8, h: p.h * 1.8 }),
        (p, pi) => ({ color: now - b.hit < 300 ? "#ff5040" : p.c, outline: "rgba(0,0,0,0.3)", tex: 2, seed: pi * 3.7 }));
    } });
    const box = this.screenBox(bx - 0.4, by - 0.4, parts.map((p) => ({ x: p.x * 1.8, y: p.y * 1.8, z: p.z * 1.8, w: p.w * 1.8, d: p.d * 1.8, h: p.h * 1.8 })));
    this.hitboxes.push({ ...box, target: { kind: "boss" } });
  }

  drawOverlay(now) {
    const c = this.ctx;
    // Cinema bars while the characters tell the story.
    const target = (this.cinematic && this.cinematic.letterbox) || this.trailerActive ? 1 : 0;
    this.bars = (this.bars || 0) + (target - (this.bars || 0)) * 0.12;
    if (this.bars > 0.01) {
      const h = Math.round(this.height * 0.075 * this.bars);
      c.fillStyle = "#000";
      c.fillRect(0, 0, this.width, h);
      c.fillRect(0, this.height - h, this.width, h);
    }
    if (this.fade) {
      const t = (now - this.fade.t0) / this.fade.dur;
      if (t >= 1) {
        this.fade = null;
      } else {
        c.globalAlpha = 1 - t * t;
        c.fillStyle = this.fade.color;
        c.fillRect(0, 0, this.width, this.height);
        c.globalAlpha = 1;
      }
    }
    if (now < this.flash.until) {
      const t = (now - this.flash.t0) / (this.flash.until - this.flash.t0);
      c.globalAlpha = 1 - t;
      c.fillStyle = this.flash.color;
      c.fillRect(0, 0, this.width, this.height);
      c.globalAlpha = 1;
    }
    const g = c.createRadialGradient(this.width / 2, this.height / 2, Math.min(this.width, this.height) * 0.35,
      this.width / 2, this.height / 2, Math.max(this.width, this.height) * 0.75);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, this.theme.night ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0.22)");
    c.fillStyle = g;
    c.fillRect(0, 0, this.width, this.height);
    this.drawChallenge(now);
    this.drawCaption(now);
  }

  animatedParts(ent, now) {
    const born = ease(Math.min(1, (now - ent.born) / 600));
    const a = ent.anim;
    const t = a ? (now - a.t0) / 1000 : 9;
    const active = a && t < 1.1;
    return ent.parts.map((p) => {
      const q = { ...p };
      q.x = 0.5 + (p.x - 0.5) * born;
      q.y = 0.5 + (p.y - 0.5) * born;
      q.z = p.z * born;
      q.w = p.w * born;
      q.d = p.d * born;
      q.h = p.h * born;
      const idle = Math.sin(now / 600 + ent.oid.length) * 0.02;
      if (p.role === "head") q.z += idle;
      if (active) {
        const s = Math.sin(t * Math.PI * 4);
        if (a.kind === "hop" || a.kind === "speak") q.lift = Math.abs(Math.sin(t * Math.PI * 2)) * 0.35 * (1 - t);
        if (a.kind === "attack") {
          if (p.role === "armR" || p.role === "armL") q.z += Math.max(0, s) * 0.3;
          q.y += Math.max(0, Math.sin(t * Math.PI)) * 0.35;
        }
        if (a.kind === "walk") {
          if (p.role === "legL") q.z += Math.max(0, s) * 0.1;
          if (p.role === "legR") q.z += Math.max(0, -s) * 0.1;
          q.lift = Math.abs(s) * 0.08;
        }
        if (a.kind === "work" && (p.role === "armR" || p.role === "head")) q.z += Math.abs(s) * 0.12;
        if (a.kind === "hurt" || a.kind === "glitch") q.x += Math.sin(t * 60) * 0.05;
        if (a.kind === "grow") {
          const g = 1 + Math.sin(Math.min(1, t) * Math.PI) * 0.25;
          q.w *= g; q.d *= g; q.h *= g; q.z *= g;
        }
      }
      return q;
    });
  }

  drawInheritance(now) {
    const c = this.ctx;
    for (const bp of this.blueprints.values()) {
      for (const base of bp.bases) {
        const parent = this.blueprints.get(base);
        if (!parent) continue;
        const [x1, y1] = this.project(bp.x + 1, bp.y + 1, 0.2);
        const [x2, y2] = this.project(parent.x + 1, parent.y + 1, 0.2);
        const mx = (x1 + x2) / 2;
        const my = Math.min(y1, y2) - 40;
        c.save();
        c.shadowColor = "#f2c14e";
        c.shadowBlur = 10;
        c.strokeStyle = "#f2c14e";
        c.lineWidth = 3;
        c.setLineDash([10, 6]);
        c.lineDashOffset = -now / 40;
        c.beginPath();
        c.moveTo(x1, y1);
        c.quadraticCurveTo(mx, my, x2, y2);
        c.stroke();
        c.restore();
        const ang = Math.atan2(y2 - my, x2 - mx);
        c.fillStyle = "#f2c14e";
        c.beginPath();
        c.moveTo(x2, y2);
        c.lineTo(x2 - 13 * Math.cos(ang - 0.45), y2 - 13 * Math.sin(ang - 0.45));
        c.lineTo(x2 - 13 * Math.cos(ang + 0.45), y2 - 13 * Math.sin(ang + 0.45));
        c.fill();
        this.tag(mx, my + 22, "hérite de", "#f2c14e", 9, null, { icon: "🧬" });
      }
    }
  }

  drawLinks(now) {
    const c = this.ctx;
    for (const link of this.links) {
      const a = this.entityTop(link.from);
      const b = this.entityTop(link.to);
      if (!a || !b) continue;
      const [x1, y1] = a();
      const [x2, y2] = b();
      c.save();
      c.strokeStyle = link.satellite ? "rgba(94,230,224,0.75)" : "rgba(232,211,162,0.85)";
      c.lineWidth = 2;
      c.setLineDash(link.satellite ? [3, 4] : [7, 5]);
      c.lineDashOffset = -now / 60;
      c.beginPath();
      c.moveTo(x1, y1);
      c.quadraticCurveTo((x1 + x2) / 2, (y1 + y2) / 2 + 25, x2, y2);
      c.stroke();
      c.restore();
      if (!link.satellite) this.tag((x1 + x2) / 2, (y1 + y2) / 2 + 16, link.label, "#e8d3a2", 9, null, { icon: "🔗" });
    }
  }

  // Name tags, with a simple anti-overlap: a tag that would cover another
  // one is moved up.
  tag(x, y, text, color = "#fff", size = 11, bg = null, opts = {}) {
    const c = this.ctx;
    c.font = `600 ${size}px ui-monospace, Menlo, Consolas, monospace`;
    const w = c.measureText((opts.icon ? opts.icon + " " : "") + text).width + 14;
    const h = size + 8;
    x = Math.max(w / 2 + 4, Math.min(this.width - w / 2 - 4, x));
    let top = y;
    if (opts.collide !== false) {
      for (let tries = 0; tries < 6; tries += 1) {
        const r = { x: x - w / 2, y: top - h, w, h };
        const hit = this.labelRects.find((o) => r.x < o.x + o.w && r.x + r.w > o.x && r.y < o.y + o.h && r.y + r.h > o.y);
        if (!hit) break;
        top = hit.y - 2;
      }
    }
    const rect = nameTag(c, x, top, text, { color, size, bg: bg || undefined, ...opts });
    if (opts.collide !== false) this.labelRects.push(rect);
    this.lastTag = rect;
    return rect.w;
  }

  drawLabels(now) {
    const c = this.ctx;
    const k = this.cam.k * this.zoom;
    // The crier's caption is placed first, under his stage: the other tags
    // move away from it instead of pushing it over him.
    const [cx, cy] = this.crierPos();
    const [lx, ly] = this.project(cx + 0.5, cy + 0.5, 0);
    this.tag(lx, ly + 30, "Crieur public · affiche tes print()", "#ffe7a0", 9, "rgba(90,25,20,0.88)", { icon: "📢", border: "#f2c14e" });
    this.drawStageLabels();
    const [zx, zy] = this.project(...SD(10.5, 12), 0);
    if (this.blueprints.size || this.entities.size) {
      this.tag(zx, zy - 4, "PLANS (classes)", "#7fe9f0", 10, null, { icon: "▲", accent: "#5ee6e0", collide: false });
      this.tag(zx, zy + 16, "OBJETS (instances)", "#b8f36b", 10, null, { icon: "▼", accent: "#6aa84f", collide: false });
    }
    for (const ent of this.entities.values()) {
      const top = Math.max(...ent.parts.map((p) => p.z + p.h)) * ent.scale;
      const [x, y] = this.project(ent.x + 0.5 * ent.scale, ent.y + 0.5 * ent.scale, top + 0.2);
      const sel = this.selected && this.selected.kind === "object" && this.selected.id === ent.oid;
      const name = ent.names.length ? ent.names.join(" = ") : "";
      const short = ent.cls.split(".").pop();
      const info = this.classes[ent.cls] || {};
      const isError = (info.mro || []).includes("BaseException");
      const label = ent.owner ? `${(ent.names[0] || "").split(".").pop()} : ${short}` : name ? `${name} : ${ent.cls}` : `objet ${ent.cls}`;
      const ly = y - 6 - (ent.labelShift || 0);
      const hpOffset = ent.hp && !ent.owner ? 12 : 0;
      this.tag(x, ly - hpOffset + 2, label, sel ? "#f2c14e" : "#ffffff", ent.scale < 1 ? 9 : 11, null,
        { icon: ent.owner ? "↳" : isError ? "💣" : "🧍", accent: hashColorOf(ent.cls), border: sel ? "#f2c14e" : null });
      if (hpOffset) {
        const max = Math.max(ent.hpMax || ent.hp.value, 1);
        const ratio = Math.max(0, Math.min(1, ent.hp.value / max));
        const bw = 52 * Math.max(0.8, k);
        // Right under the name tag, even when the tag had to move up.
        const by = this.lastTag.y + this.lastTag.h + 2;
        this.labelRects.push({ x: x - bw / 2, y: by, w: bw + 50, h: 9 });
        roundRect(c, x - bw / 2, by, bw, 8, 3);
        c.fillStyle = "rgba(0,0,0,0.75)";
        c.fill();
        roundRect(c, x - bw / 2 + 1.5, by + 1.5, Math.max(0, (bw - 3) * ratio), 5, 2);
        c.fillStyle = ratio > 0.5 ? "#6ad04a" : ratio > 0.2 ? "#f2c14e" : "#e5534b";
        c.fill();
        c.font = "600 9px ui-monospace, monospace";
        c.fillStyle = "#fff";
        c.textAlign = "left";
        c.textBaseline = "alphabetic";
        c.fillText(`${ent.hp.key.replace(/^_/, "")} ${ent.hp.value}`, x + bw / 2 + 4, by + 7);
      }
    }
    for (const bp of this.blueprints.values()) {
      const sel = this.selected && this.selected.kind === "class" && this.selected.id === bp.qual;
      if (bp.owner) {
        const [nx, ny] = this.project(bp.x + 0.5 + 0.5 * bp.scale, bp.y + 0.5 + 0.5 * bp.scale, 1.5);
        this.tag(nx + 18, ny, `class ${bp.qual.split(".").pop()} (imbriquée)`, sel ? "#f2c14e" : "#d7c0ff", 9, null, { icon: "📦", accent: "#b48cf2" });
      } else {
        const [x, y] = this.project(bp.x + 1, bp.y + 1, 0.1);
        this.tag(x, y + 18, `class ${bp.qual}`, sel ? "#f2c14e" : "#bffcff", 11, "rgba(10,30,45,0.85)", { icon: "📐", accent: "#5ee6e0", border: sel ? "#f2c14e" : "rgba(94,230,224,0.5)" });
      }
    }
    for (const sign of this.signs.values()) {
      const [x, y] = this.project(sign.x + 0.5, sign.y + 0.5, 1.3);
      const fresh = now - sign.changedAt < 900;
      const label = sign.text.length > 30 ? sign.text.slice(0, 29) + "…" : sign.text;
      this.tag(x, y, label, fresh ? "#2b1d0e" : "#fff3d0", 10, fresh ? "rgba(242,193,78,0.95)" : "rgba(110,72,36,0.92)",
        { icon: "🪧", border: "#3b2410" });
    }
    if (now - this.crierSpeakAt < 900) {
      const [bx, by] = this.project(cx + 1.0, cy + 0.5, 2.6);
      c.strokeStyle = "rgba(255,231,160,0.85)";
      c.lineWidth = 2;
      for (let i = 1; i <= 3; i += 1) {
        const r = i * 6 + ((now / 40) % 6);
        c.beginPath();
        c.arc(bx, by, r, -0.6, 0.6);
        c.stroke();
      }
    }
    if (this.boss) {
      const [bx, by] = this.project(...SD(14, 11.5), 4.2);
      this.tag(bx, by - 22, this.boss.name, "#ff8a80", 12, "rgba(60,10,10,0.9)", { icon: "☠", border: "#e5534b", collide: false });
      const w = 140;
      roundRect(c, bx - w / 2, by - 12, w, 10, 4);
      c.fillStyle = "rgba(0,0,0,0.8)";
      c.fill();
      roundRect(c, bx - w / 2 + 2, by - 10, (w - 4) * (this.boss.hp / Math.max(1, this.boss.total)), 6, 3);
      c.fillStyle = "#e24c4c";
      c.fill();
    }
    if (this.emptyHint && this.now() > this.focusUntil && !this.blueprints.size && !this.entities.size && !this.signs.size && !this.collections.size) {
      c.font = "600 13px system-ui";
      c.fillStyle = "rgba(255,255,255,0.75)";
      c.textAlign = "center";
      c.textBaseline = "alphabetic";
      c.fillText("Ici apparaîtront les plans (classes), les objets et les variables de ton programme.", this.width / 2, this.height - 20);
      c.textAlign = "left";
    }
  }

  colPos(col, j) {
    return SD(col.s, col.d0 + j * 2.4);
  }

  collectCollections(list, now) {
    const style = {
      list: ["#a0763f", "#e8d3a2"], tuple: ["#7d7d7d", "#d9d9d9"], set: ["#5d8a35", "#c8f0a0"],
      frozenset: ["#5d8a35", "#c8f0a0"], dict: ["#7a5230", "#f2c14e"],
    };
    for (const col of this.collections.values()) {
      const [base, item] = style[col.kind] || style.list;
      const grow = ease(Math.min(1, (now - col.bornAt) / 500));
      const shown = col.items.slice(0, 8);
      if (!shown.length) {
        const [x, y] = this.colPos(col, 0);
        list.push({ d: this.depthOf(x + 0.5, y + 0.5, 0), fn: () => this.box(x, y, 0, 1, 1, 0.15, base, 0.6) });
      }
      shown.forEach((it, j) => {
        const [x, y] = this.colPos(col, j);
        list.push({ d: this.depthOf(x + 0.5, y + 0.5, 0.2), fn: () => {
          this.box(x - 0.05, y - 0.05, 0, 1.1, 1.1, 0.16, base);
          const sz = 0.62 * grow;
          const o = (1 - sz) / 2;
          const color = now - col.changedAt < 900 ? "#ffe066" : it.ref ? "#5ee6e0" : item;
          if (col.kind === "set" || col.kind === "frozenset") this.box(x + o, y + o, 0.16, sz, sz, sz * 0.75, color);
          else if (col.kind === "tuple") this.box(x + o, y + 0.35, 0.16, sz, 0.25, sz * 1.2, color);
          else this.box(x + o, y + o, 0.16, sz, sz, sz, color);
        } });
      });
    }
  }

  drawCollectionLabels() {
    const kindName = { list: "list", tuple: "tuple (immuable)", set: "set (sans ordre ni doublon)", frozenset: "frozenset", dict: "dict" };
    for (const col of this.collections.values()) {
      const [nx, ny] = this.colPos(col, 0);
      const [x0, y0] = this.project(nx + 0.5, ny + 0.5, 1.4);
      this.ctx.font = "600 10px ui-monospace, Menlo, Consolas, monospace";
      const title = `${col.name} : ${kindName[col.kind] || col.kind} · ${col.len}`;
      const w = this.ctx.measureText(title).width;
      const icon = { list: "📚", tuple: "🪨", set: "👜", frozenset: "👜", dict: "🗄" }[col.kind] || "📦";
      this.tag(x0 + w / 2 - 4, y0 - 16, title, "#fff3d0", 10, "rgba(60,40,20,0.92)", { icon, accent: "#f2c14e", collide: false });
      col.items.slice(0, 8).forEach((it, j) => {
        const [ix, iy] = this.colPos(col, j);
        const [x, y] = this.project(ix + 0.5, iy + 0.5, 0.95);
        const label = it.label.length > 11 ? it.label.slice(0, 10) + "…" : it.label;
        this.tag(x, y - 2, label, "#ffffff", 9, null, { collide: false });
        const [bx, by] = this.project(ix + 0.5, iy + 0.5, 0);
        if (it.key !== "") this.tag(bx, by + 20, col.kind === "dict" ? it.key.slice(0, 10) : `[${it.key}]`, col.kind === "dict" ? "#f2c14e" : "#9fdcff", 9, null, { collide: false });
      });
      if (col.len > Math.min(8, col.items.length)) {
        const [ex, ey] = this.colPos(col, 8);
        const [x, y] = this.project(ex + 0.5, ey + 0.5, 0.3);
        this.tag(x, y, `… +${col.len - Math.min(8, col.items.length)}`, "#ddd", 9, null, { collide: false });
      }
    }
  }

  drawStackLabels() {
    if (!this.stack.length) return;
    const [bx, by] = this.stackBase();
    const [lx, ly] = this.project(bx + 0.5, by + 0.5, 0);
    this.tag(lx, ly + 18, "pile d'appels", "#e8d3a2", 9, null, { icon: "🧱", collide: false });
    this.stack.forEach((frame, i) => {
      const [x, y] = this.project(bx + 0.9, by + 0.5, i * 0.55 + 0.25);
      const args = (frame.args || []).map(([n, v]) => `${n}=${showValue(v)}`).join(", ");
      const name = frame.type === "gen" ? `${frame.method}() ⏸ générateur` : `${frame.cls ? frame.cls.split(".").pop() + "." : ""}${frame.method}(${args.length > 22 ? args.slice(0, 21) + "…" : args})`;
      const cur = i === this.stack.length - 1;
      this.tag(x + 60, y, name, cur ? "#ffe7a0" : "#cfc6b4", 9, null, { collide: false, accent: cur ? "#f2c14e" : null, icon: cur ? "▶" : "" });
    });
  }

  drawEffects(now) {
    const c = this.ctx;
    const k = this.cam.k * this.zoom;
    for (const f of this.effects) {
      const t = Math.min(1, (now - f.t0) / f.dur);
      if (f.kind === "float") {
        const [x, y] = f.at();
        const rise = ease(t) * 34 * (f.rise ?? 1);
        c.globalAlpha = t > 0.75 ? (1 - t) / 0.25 : Math.min(1, t * 6);
        this.tag(x, y - 20 - rise, f.text, f.color, 11, "rgba(12,10,8,0.82)", { collide: false, accent: f.color });
        c.globalAlpha = 1;
      } else if (f.kind === "number") {
        const [x, y] = f.at();
        const bounce = Math.abs(Math.sin(t * Math.PI * 2.2)) * (1 - t) * 14;
        c.globalAlpha = 1 - t * t;
        c.font = `800 ${16 + (1 - t) * 6}px ui-monospace, monospace`;
        c.textAlign = "center";
        c.textBaseline = "alphabetic";
        c.lineWidth = 4;
        c.strokeStyle = "rgba(0,0,0,0.85)";
        c.strokeText(f.text, x + 28, y - 30 - t * 30 - bounce);
        c.fillStyle = f.color;
        c.fillText(f.text, x + 28, y - 30 - t * 30 - bounce);
        c.textAlign = "left";
        c.globalAlpha = 1;
      } else if (f.kind === "bubble") {
        continue;
      } else if (f.kind === "beam") {
        this.drawBeam(f, t, now);
      } else if (f.kind === "pillar") {
        const [x, y] = f.at();
        const h = 140 * k;
        const w = 26 * k * (1 - t * 0.5);
        const g = c.createLinearGradient(0, y - h, 0, y);
        g.addColorStop(0, "rgba(255,255,255,0)");
        g.addColorStop(1, f.color);
        c.globalAlpha = (1 - t) * 0.8;
        c.fillStyle = g;
        c.fillRect(x - w / 2, y - h, w, h);
        c.globalAlpha = 1;
      } else if (f.kind === "spot") {
        const [bx, by] = f.base();
        const [x, y] = f.at();
        const pulse = 1 + 0.15 * Math.sin(now / 160);
        c.save();
        c.globalAlpha = t > 0.85 ? (1 - t) / 0.15 : 1;
        c.strokeStyle = "#ff5a4f";
        c.lineWidth = 3;
        c.shadowColor = "#ff5a4f";
        c.shadowBlur = 14;
        c.setLineDash([8, 6]);
        c.lineDashOffset = -now / 30;
        c.beginPath();
        c.ellipse(bx, by, 32 * k * pulse, 16 * k * pulse, 0, 0, Math.PI * 2);
        c.stroke();
        c.setLineDash([]);
        const bob = Math.sin(now / 200) * 5;
        c.fillStyle = "#ff5a4f";
        c.beginPath();
        c.moveTo(x, y - 6 + bob);
        c.lineTo(x - 9, y - 20 + bob);
        c.lineTo(x + 9, y - 20 + bob);
        c.closePath();
        c.fill();
        c.restore();
        this.tag(x, y - 24 + bob, `regarde ici : ${f.label}`, "#fff", 10, "rgba(140,20,20,0.92)", { icon: "🔎", collide: false, border: "#ffb4ad" });
      } else if (f.kind === "ring") {
        const [x, y] = f.at();
        c.globalAlpha = 1 - t;
        c.strokeStyle = f.color;
        c.lineWidth = 3 * (1 - t) + 1;
        c.beginPath();
        c.ellipse(x, y, (14 + t * 34) * k, (7 + t * 17) * k, 0, 0, Math.PI * 2);
        c.stroke();
        c.globalAlpha = 1;
      } else if (f.kind === "gear") {
        const [x, y] = f.at();
        c.save();
        c.globalAlpha = 1 - t;
        c.translate(x - 30, y - 40);
        c.rotate(now / 300);
        c.fillStyle = f.color;
        for (let i = 0; i < 8; i += 1) {
          c.rotate(Math.PI / 4);
          c.fillRect(-2.5, -13, 5, 6);
        }
        c.beginPath();
        c.arc(0, 0, 8, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "#2b2140";
        c.beginPath();
        c.arc(0, 0, 3.5, 0, Math.PI * 2);
        c.fill();
        c.restore();
      } else if (f.kind === "explosion") {
        const [x, y] = f.at();
        const r = 10 + ease(t) * 60;
        const g = c.createRadialGradient(x, y - 10, 0, x, y - 10, r);
        g.addColorStop(0, `rgba(255,240,180,${1 - t})`);
        g.addColorStop(0.5, `rgba(255,120,40,${0.8 * (1 - t)})`);
        g.addColorStop(1, "rgba(80,40,20,0)");
        c.fillStyle = g;
        c.beginPath();
        c.arc(x, y - 10, r, 0, Math.PI * 2);
        c.fill();
      } else if (f.kind === "particles") {
        const [x, y] = f.at();
        c.globalAlpha = (1 - t) * 0.6;
        c.strokeStyle = f.color;
        c.lineWidth = 2;
        c.beginPath();
        c.arc(x, y + 10, 6 + t * 30, 0, Math.PI * 2);
        c.stroke();
        c.globalAlpha = 1;
      } else if (f.kind === "shield") {
        const [x, y] = f.at();
        const pop = t < 0.12 ? t / 0.12 : 1;
        c.save();
        c.globalAlpha = t > 0.7 ? (1 - t) / 0.3 : 1;
        c.translate(x, y - 38);
        c.scale(pop, pop);
        c.shadowColor = "#e5534b";
        c.shadowBlur = 14;
        const g = c.createLinearGradient(0, -20, 0, 22);
        g.addColorStop(0, "#ff7b6b");
        g.addColorStop(1, "#8c1c1c");
        c.fillStyle = g;
        c.strokeStyle = "#fff";
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(0, -22);
        c.lineTo(18, -15);
        c.lineTo(15, 8);
        c.lineTo(0, 22);
        c.lineTo(-15, 8);
        c.lineTo(-18, -15);
        c.closePath();
        c.fill();
        c.shadowBlur = 0;
        c.stroke();
        c.strokeStyle = "rgba(255,255,255,0.9)";
        c.beginPath();
        c.moveTo(-7, -7);
        c.lineTo(7, 7);
        c.moveTo(7, -7);
        c.lineTo(-7, 7);
        c.stroke();
        c.restore();
        this.tag(x, y - 66, "refusé : rien n'a changé", "#ffd4cf", 10, "rgba(80,10,10,0.9)", { collide: false, icon: "🛡" });
      } else if (f.kind === "alert") {
        const [x, y] = f.at();
        const blink = Math.floor(now / 120) % 2;
        c.globalAlpha = (1 - t) * (blink ? 1 : 0.55);
        this.tag(x, y - 64, "ACCÈS EXTERNE À UN ATTRIBUT PROTÉGÉ", "#fff", 11, "#b3261e", { collide: false, icon: "⚠", border: "#ffd0cc" });
        c.globalAlpha = 1;
      } else if (f.kind === "bolt") {
        const [x, y] = f.at();
        c.save();
        c.globalAlpha = 1 - t;
        c.shadowColor = "#ffdd55";
        c.shadowBlur = 16;
        const pts = [[x - 10, y - 80]];
        for (let i = 1; i <= 5; i += 1) pts.push([x + (hash(f.seed ?? f.t0, i) - 0.5) * 22, y - 80 + i * 14]);
        for (const [width, color] of [[7, "rgba(255,221,85,0.5)"], [3.5, "#fff3a0"], [1.5, "#ffffff"]]) {
          c.strokeStyle = color;
          c.lineWidth = width;
          c.beginPath();
          c.moveTo(pts[0][0], pts[0][1]);
          for (const p of pts.slice(1)) c.lineTo(p[0], p[1]);
          c.stroke();
        }
        c.restore();
      } else if (f.kind === "net") {
        const [x, y] = f.at();
        c.save();
        c.globalAlpha = 1 - t * 0.85;
        c.shadowColor = "#b8f36b";
        c.shadowBlur = 10;
        c.strokeStyle = "#c8ff9a";
        c.lineWidth = 2;
        const r = 16 + 8 * Math.sin(t * Math.PI);
        c.beginPath();
        c.arc(x, y - 30, r + 4, 0, Math.PI * 2);
        c.stroke();
        c.beginPath();
        c.arc(x, y - 30, r, 0, Math.PI * 2);
        c.clip();
        for (let i = -3; i <= 3; i += 1) {
          c.beginPath(); c.moveTo(x - r, y - 30 + i * 6); c.lineTo(x + r, y - 30 + i * 6); c.stroke();
          c.beginPath(); c.moveTo(x + i * 6, y - 30 - r); c.lineTo(x + i * 6, y - 30 + r); c.stroke();
        }
        c.restore();
      }
    }
  }

  // Speech bubbles: one per print(). For each speaker the newest one sits
  // right above him (with a tail), the older ones pile up above it.
  drawBubbles(now) {
    const c = this.ctx;
    const owners = new Map();
    for (const f of this.effects) {
      if (f.kind !== "bubble") continue;
      if (!owners.has(f.owner)) owners.set(f.owner, []);
      owners.get(f.owner).push(f);
    }
    for (const list of owners.values()) {
      list.sort((a, b) => b.t0 - a.t0);
      const [x, y0] = list[0].at();
      let y = y0;
      list.forEach((f, i) => {
        if (i > 0 && y < 40) return;
        const t = Math.min(1, (now - f.t0) / f.dur);
        const pop = t < 0.04 ? 0.7 + 7.5 * t : 1;
        const fade = t > 0.88 ? (1 - t) / 0.12 : 1;
        c.globalAlpha = Math.min(fade, pop) * (i === 0 ? 1 : Math.max(0.55, 0.9 - i * 0.12));
        const shown = (f.revealFrom || 0) + ((now - (f.clock0 || f.t0)) / 22) * (f.speed || 1);
        const reveal = shown / Math.max(1, f.text.length) / 2.2;
        const style = f.question ? { bg: "#fff4cc", border: "#8a5a10" } : f.npc ? { bg: "#eef9e4", border: "#2c5a1f", color: "#14240c" } : {};
        if (i > 0) style.tail = false;
        const box = speechBubble(c, x, y - (i === 0 ? (1 - pop) * 10 : 0), f.text, reveal, style);
        y = box.top - 5;
        c.globalAlpha = 1;
      });
    }
  }

  drawBeam(f, t, now) {
    const c = this.ctx;
    const [x1, y1] = f.from();
    const [x2, y2] = f.to();
    const p = ease(Math.min(1, t * 1.8));
    const mx = (x1 + x2) / 2;
    const my = Math.min(y1, y2) - 35;
    const point = (u) => [(1 - u) * (1 - u) * x1 + 2 * (1 - u) * u * mx + u * u * x2,
      (1 - u) * (1 - u) * y1 + 2 * (1 - u) * u * my + u * u * y2];
    c.save();
    c.globalAlpha = 1 - Math.max(0, t - 0.65) / 0.35;
    const steps = 24;
    for (const [width, alpha] of f.thin ? [[2, 0.9]] : [[9, 0.18], [4.5, 0.5], [1.8, 1]]) {
      c.strokeStyle = alpha === 1 ? "#ffffff" : f.color;
      c.globalAlpha *= 1;
      c.lineWidth = width;
      c.shadowColor = f.color;
      c.shadowBlur = f.thin ? 0 : 12;
      c.beginPath();
      for (let i = 0; i <= steps * p; i += 1) {
        const [px, py] = point(i / steps);
        if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
      }
      c.strokeStyle = alpha === 1 ? (f.thin ? f.color : "rgba(255,255,255,0.95)") : f.color;
      c.globalAlpha = (1 - Math.max(0, t - 0.65) / 0.35) * alpha;
      c.stroke();
    }
    c.restore();
    if (!f.thin && p < 1) {
      const [hx, hy] = point(p);
      c.fillStyle = "#ffffff";
      c.shadowColor = f.color;
      c.shadowBlur = 14;
      c.beginPath();
      c.arc(hx, hy, 4, 0, Math.PI * 2);
      c.fill();
      c.shadowBlur = 0;
      if (Math.random() < 0.6) {
        this.particles.ambient({ x: hx, y: hy, vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30,
          g: 40, life: 500, size: 3, color: f.color, glow: true });
      }
    }
    if (f.label && t > 0.15 && t < 0.9) {
      this.tag(mx, my + 6, f.label, f.color, 11, "rgba(12,10,8,0.85)", { collide: false, accent: f.color });
    }
  }
}

// Sound played for each kind of trace event (see sound.js).
// Each character keeps his voice: pitch from his look, a little variation
// from his name.
const VOICE_PITCH = {
  elder: 120, chief: 105, villager: 175, guard: 110, miner: 115, builder: 140, artisan: 125, smith: 95,
  lord: 150, engineer: 230, alchemist: 100, architect: 135, general: 98, king: 92, keeper: 120,
  librarian: 240, cartographer: 130, explorer: 215, player: 190, runner: 250, cook: 145, warden: 88,
};
function voiceOf(npc) {
  let h = 0;
  for (const ch of String(npc.name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const base = VOICE_PITCH[npc.skin] || 160;
  return { pitch: base * (0.94 + (h % 13) / 100), speed: 0.068 + (h % 5) / 200 };
}

const EVENT_SOUNDS = {
  class_def: "build", spawn: "spawn", print: "bell", call: "blip", func_call: "blip", input: "ask",
  raise: "zap", error: "boom", caught: "pop", yield: "twinkle", return: "shield",
};

function hashColorOf(text) {
  let h = 0;
  for (const ch of String(text)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `hsl(${h % 360}, 70%, 60%)`;
}

function actionFor(method) {
  const m = method.toLowerCase();
  if (/attack|strike|hit|shoot|frapp|attaqu|tir|volley|fight|combat/.test(m)) return "attack";
  if (/move|walk|run|fly|climb|march|avanc|grimp|swim|ride|jump|saut/.test(m)) return "walk";
  if (/damage|hurt|hit|blesse|degat|dégât|take_/.test(m)) return "hurt";
  if (/grow|upgrade|level|evolu|grandi/.test(m)) return "grow";
  if (/smelt|mine|work|brew|fill|craft|build|forge|cook|fond|travail|record|add|put|deposit|withdraw|remove|give/.test(m)) return "work";
  if (/speak|introduce|describe|show|display|report|sound|say|present|light/.test(m)) return "speak";
  return "hop";
}

export { hashColor };
