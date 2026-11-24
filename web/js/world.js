// The voxel world: an isometric renderer whose content is driven entirely by
// the recorded execution of the learner's code (classes, objects, attributes,
// calls). Nothing here is decorative except the terrain props.
import { Particles, hash, nameTag, roundRect, speechBubble } from "./fx.js";
import { buildParts, crierParts, healthOf } from "./models.js";
import { TraceModel } from "./trace.js";
import { hashColor, showValue } from "./util.js";

const W = 24;
const D = 24;
// Layout helper: s = depth in the screen (x + y), d = left/right (x - y).
const SD = (s, d) => [(s + d) / 2, (s - d) / 2];
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
};

const AMBIENT = {
  pollen: { colors: ["#fff6b0", "#ffffff"], vy: -8, size: 2.5, life: 5000 },
  dust: { colors: ["#d9c7a8", "#b8a68a"], vy: -4, size: 2.5, life: 5000 },
  snow: { colors: ["#ffffff", "#e8f0ff"], vy: 14, size: 3, life: 6000 },
  ember: { colors: ["#ffb347", "#ff6a2a", "#ffd27a"], vy: -22, size: 3, life: 3500, glow: true },
  sparkle: { colors: ["#d7c0ff", "#9ff7f2", "#ffffff"], vy: -6, size: 2.5, life: 2500, glow: true },
  end: { colors: ["#c060ff", "#e0a0ff"], vy: -10, size: 3, life: 4000, glow: true },
  page: { colors: ["#f5ecd7", "#e8dcc0"], vy: 10, size: 4, life: 6000 },
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
    this.particles = new Particles();
    this.shake = { until: 0, amp: 0 };
    this.flash = { until: 0, color: "#fff", t0: 0 };
    this.groundCache = document.createElement("canvas");
    this.groundKey = "";
    this.groundReady = false;
    this.stableFrames = 0;
    this.crierSpeakAt = 0;
    this.crierAct = null;
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
    const k = this.cam.k * this.zoom;
    let sx = 0;
    let sy = 0;
    const now = performance.now();
    if (now < this.shake.until) {
      const left = (this.shake.until - now) / 400;
      sx = Math.sin(now / 17) * this.shake.amp * left;
      sy = Math.cos(now / 23) * this.shake.amp * left;
    }
    return [this.width / 2 + this.pan.x - this.cam.u * k + sx, this.height / 2 + this.pan.y - this.cam.v * k + sy, k];
  }

  shakeCamera(amp = 6, ms = 400) {
    this.shake = { until: performance.now() + ms, amp };
  }

  flashScreen(color, ms = 350) {
    this.flash = { until: performance.now() + ms, color, t0: performance.now() };
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
      this.zoom = Math.max(0.5, Math.min(2.6, this.zoom * (e.deltaY < 0 ? 1.1 : 0.9)));
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
      this.signs.set(name, { name, text, x: sx, y: sy, changedAt: prev && prev.text !== text ? performance.now() : prev ? prev.changedAt : performance.now(), value });
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
        name, kind: value.t, items, len: value.len, s: colStart + cIndex * 5, d0: -2,
        changedAt: prev && prev.text !== text ? performance.now() : prev ? prev.changedAt : performance.now(),
        bornAt: prev ? prev.bornAt : performance.now(), text,
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
      bases: info.user_bases || [], born: prev ? prev.born : performance.now(),
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
      born: prev ? prev.born : performance.now(),
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

  // Make the crier react: speak, ask, read, call, alert or cheer.
  crierDo(pose, dur = 1400) {
    this.crierAct = { pose, t0: performance.now(), dur };
    if (pose === "speak" || pose === "ask") this.crierSpeakAt = performance.now();
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
    const fx = { t0: performance.now(), dur: 1600, seed: Math.random() * 1000, ...effect };
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
    if (ent) ent.anim = { kind, t0: performance.now() };
  }

  pulseBlueprint(qual, color) {
    const bp = this.blueprints.get(qual);
    if (bp) {
      bp.pulse = performance.now();
      bp.pulseColor = color;
    }
  }

  // Turn the events of one execution step into visible effects.
  animateEvents(events, state) {
    const names = TraceModel.names(state);
    for (const ev of events) {
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
            last.t0 = performance.now();
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
          this.addEffect({ kind: "float", at, text: `⌨ "${ev.value}"`, color: "#ffe7a0", dur: 1900, rise: 0.5 });
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
      this.boss.hit = performance.now();
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
  loop(now) {
    const dt = Math.min(0.05, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    this.dt = dt;
    for (const ent of this.entities.values()) {
      ent.x += (ent.tx - ent.x) * Math.min(1, dt * 6);
      ent.y += (ent.ty - ent.y) * Math.min(1, dt * 6);
    }
    this.effects = this.effects.filter((f) => now - f.t0 < f.dur);
    if (this.width > 0) {
      const target = this.frameTarget();
      const a = Math.min(1, dt * 3);
      this.cam.k += (target.k - this.cam.k) * a;
      this.cam.u += (target.u - this.cam.u) * a;
      this.cam.v += (target.v - this.cam.v) * a;
    }
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
      c.lineWidth = 1;
      c.stroke();
    }
  }

  // A face split into n×n cells with a slight color noise: the pixel look.
  texturedFace(pts, color, n, seed) {
    const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const at = (u, v) => lerp(lerp(pts[0], pts[1], u), lerp(pts[3], pts[2], u), v);
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

  draw(now) {
    const c = this.ctx;
    this.drawSky(now);
    this.drawGround();
    this.drawShadows(now);
    const drawables = [];
    this.hitboxes = [];
    this.collectProps(drawables, now);

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
      const sorted = [...bp.parts].sort((a, b) => this.depthOf(a.x + a.w / 2, a.y + a.d / 2, a.z) - this.depthOf(b.x + b.w / 2, b.y + b.d / 2, b.z));
      drawables.push({ d: this.depthOf(bp.x + 1.01, bp.y + 1.01, 0.5), fn: () => {
        const ox = bp.x + 0.5;
        const oy = bp.y + 0.5;
        const sc = s * born;
        const maxZ = Math.max(...bp.parts.map((p) => p.z + p.h));
        const cut = age < 1 ? maxZ * age : 99;
        const flicker = 0.04 * Math.sin(now / 90 + bp.x);
        for (const p of sorted) {
          if (p.z > cut) continue;
          const h = Math.min(p.h, cut - p.z);
          this.box(ox + p.x * sc, oy + p.y * sc, 0.25 + p.z * sc, p.w * sc, p.d * sc, h * sc,
            pulse > 0 ? bp.pulseColor : "#7fe9f0", 0.3 + 0.4 * pulse + flicker, "rgba(140,250,245,0.6)");
        }
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
        const leg = (p) => (String(p.role || "").startsWith("leg") ? 0 : 1);
        const key = (p) => this.depthOf(p.x + p.w / 2, p.y + p.d / 2, p.z);
        const list = parts.map((p, pi) => ({ ...p, pi }))
          .sort((a, b) => leg(a) - leg(b) || key(a) - key(b) || a.pi - b.pi);
        for (const p of list) {
          if (p.role === "eye" && blink) continue;
          const big = p.w * p.h > 0.12 && p.role !== "eye";
          const color = (glitch && Math.floor(now / 80) % 2) || hurt ? "#ff4b3e" : p.c;
          this.box(ent.x + p.x * ent.scale, ent.y + p.y * ent.scale, p.z * ent.scale + (p.lift || 0),
            p.w * ent.scale, p.d * ent.scale, p.h * ent.scale, color,
            p.role === "beam" ? 0.55 : 1, "rgba(0,0,0,0.28)", big ? 2 : 0, p.pi * 7.31 + ent.oid.length);
        }
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

    this.particles.draw(c, this.dt || 0.016);
    this.drawInheritance(now);
    this.drawLinks(now);
    this.labelRects = [];
    this.drawLabels(now);
    this.drawCollectionLabels(now);
    this.drawStackLabels();
    this.drawEffects(now);
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
    if (t.night) {
      for (let i = 0; i < 90; i += 1) {
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(now / 900 + i));
        c.globalAlpha = tw * (this.themeName === "mine" ? 0.25 : 0.9);
        c.fillStyle = i % 9 === 0 ? "#d7c0ff" : "#ffffff";
        const size = i % 7 === 0 ? 3 : 2;
        c.fillRect((i * 137.5) % this.width, (i * 53.3) % (this.height * 0.55), size, size);
      }
      c.globalAlpha = 1;
      if (this.themeName === "tour" || this.themeName === "faille") {
        const g = c.createRadialGradient(this.width * 0.8, this.height * 0.15, 5, this.width * 0.8, this.height * 0.15, 220);
        g.addColorStop(0, this.themeName === "tour" ? "rgba(180,100,255,0.35)" : "rgba(255,90,60,0.35)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        c.fillStyle = g;
        c.fillRect(0, 0, this.width, this.height);
      }
      return;
    }
    if (t.sun) {
      const sx = this.width - 90;
      const g = c.createRadialGradient(sx, 70, 10, sx, 70, 110);
      g.addColorStop(0, "rgba(255,250,210,0.9)");
      g.addColorStop(1, "rgba(255,250,210,0)");
      c.fillStyle = g;
      c.fillRect(sx - 120, 0, 240, 200);
      c.fillStyle = "#fff6c8";
      c.fillRect(sx - 18, 52, 36, 36);
    }
    for (const cl of this.clouds) {
      const x = ((cl.x + (now / 1000) * cl.speed) % (this.width + 300)) - 150;
      c.fillStyle = "rgba(255,255,255,0.85)";
      c.fillRect(x, cl.y, cl.w, 14);
      c.fillRect(x + cl.w * 0.2, cl.y - 10, cl.w * 0.5, 12);
      c.fillStyle = "rgba(220,230,240,0.8)";
      c.fillRect(x, cl.y + 14, cl.w, 5);
    }
  }

  // The ground is expensive (thousands of textured cells): it is drawn
  // plainly while the camera moves, then cached once the camera is still.
  drawGround() {
    const dpr = window.devicePixelRatio || 1;
    const key = [this.cam.k.toFixed(3), this.cam.u.toFixed(1), this.cam.v.toFixed(1), this.zoom.toFixed(3),
      Math.round(this.pan.x), Math.round(this.pan.y), this.rot, this.width, this.height, this.themeName].join("|");
    const shaking = performance.now() < this.shake.until;
    if (key !== this.groundKey) {
      this.groundKey = key;
      this.stableFrames = 0;
      this.groundReady = false;
    } else {
      this.stableFrames += 1;
    }
    if (this.groundReady && !shaking) {
      this.ctx.drawImage(this.groundCache, 0, 0, this.width, this.height);
      return;
    }
    if (this.stableFrames >= 2 && !shaking) {
      const cache = this.groundCache;
      cache.width = this.width * dpr;
      cache.height = this.height * dpr;
      const cctx = cache.getContext("2d");
      cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const main = this.ctx;
      this.ctx = cctx;
      this.renderGround(true);
      this.ctx = main;
      this.groundReady = true;
      this.ctx.drawImage(cache, 0, 0, this.width, this.height);
      return;
    }
    this.renderGround(false);
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
      if (zone === "create") color = (x + y) % 2 ? "#33506b" : "#3a5975";
      else if (zone === "square") color = hash(x, y) < 0.5 ? t.path : shade(t.path, 0.92);
      else if (hash(x, y, 9) < 0.12) color = shade(t.top, 0.9);
      const [rx, ry] = this.rotate(x, y);
      const edge = rx >= W - 1 || ry >= D - 1;
      const outline = zone === "create" ? "rgba(94,230,224,0.28)" : detailed ? null : "rgba(0,0,0,0.06)";
      this.box(x, y, -0.5, 1, 1, 0.5, color, 1, outline, detailed ? 3 : 0);
      if (edge) {
        this.box(x, y, -1.4, 1, 1, 0.9, t.side, 1, "rgba(0,0,0,0.2)", detailed ? 3 : 0);
        this.box(x, y, -2.2, 1, 1, 0.8, "#5e5a57", 1, "rgba(0,0,0,0.25)", detailed ? 3 : 0);
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

  drawShadows(now) {
    const c = this.ctx;
    const k = this.cam.k * this.zoom;
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
    const spots = [SD(25, 21), SD(31, 15), SD(39, 7), SD(44, -2), SD(25, -22), SD(11, 9)];
    spots.forEach(([x, y], i) => {
      if (kind === "tree") {
        const big = hash(i, 11) > 0.5;
        props.push([x + 0.35, y + 0.35, 0, 0.3, 0.3, big ? 1.8 : 1.3, "#6b4527", 2]);
        props.push([x - 0.4, y - 0.4, big ? 1.5 : 1.0, 1.4, 1.4, 0.9, "#3f8a2c", 3]);
        props.push([x - 0.1, y - 0.1, big ? 2.4 : 1.9, 0.8, 0.8, 0.5, "#4f9a35", 2]);
        if (hash(i, 12) > 0.6) props.push([x + 0.55, y + 0.95, big ? 1.8 : 1.3, 0.14, 0.01, 0.14, "#e5534b", 0]);
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
    for (const p of props) {
      list.push({ d: this.depthOf(p[0] + p[3] / 2, p[1] + p[4] / 2, p[2]), fn: () => this.box(p[0], p[1], p[2], p[3], p[4], p[5], p[6], 1, "rgba(0,0,0,0.25)", p[7] || 0) });
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
      const parts = crierParts(pose, now).map((p, pi) => ({ ...p, pi }));
      const leg = (p) => (p.role === "legL" || p.role === "legR" ? 0 : 1);
      const key = (p) => this.depthOf(p.x + p.w / 2, p.y + p.d / 2, p.z);
      parts.sort((a, b) => leg(a) - leg(b) || key(a) - key(b) || a.pi - b.pi);
      for (const p of parts) {
        this.box(cx + p.x, cy + p.y, 0.35 + p.z + jump, p.w, p.d, p.h, p.c, 1, "rgba(0,0,0,0.25)", p.w * p.h > 0.12 ? 2 : 0, p.pi * 5.17);
      }
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
    parts.forEach((p, pi) => {
      const [bx, by] = SD(14, 11.5);
      list.push({ d: this.depthOf(bx + p.x * 2, by + p.y * 2, p.z), fn: () => {
        this.box(bx - 0.4 + shake + p.x * 1.8, by - 0.4 + p.y * 1.8, p.z * 1.8 + float, p.w * 1.8, p.d * 1.8, p.h * 1.8,
          now - b.hit < 300 ? "#ff5040" : p.c, 1, "rgba(0,0,0,0.3)", 2, pi * 3.7);
      } });
    });
  }

  drawOverlay(now) {
    const c = this.ctx;
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
        this.tag(mx, my + 22, "hérite de", "#f2c14e", 9, null, { icon: "🧬", collide: false });
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
    return rect.w;
  }

  drawLabels(now) {
    const c = this.ctx;
    const k = this.cam.k * this.zoom;
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
      this.tag(x, ly - hpOffset, label, sel ? "#f2c14e" : "#ffffff", ent.scale < 1 ? 9 : 11, null,
        { icon: ent.owner ? "↳" : isError ? "💣" : "🧍", accent: hashColorOf(ent.cls), border: sel ? "#f2c14e" : null });
      if (hpOffset) {
        const max = Math.max(ent.hpMax || ent.hp.value, 1);
        const ratio = Math.max(0, Math.min(1, ent.hp.value / max));
        const bw = 52 * Math.max(0.8, k);
        const by = ly - 8;
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
    const [cx, cy] = this.crierPos();
    const [lx, ly] = this.project(cx + 0.5, cy + 0.5, 0);
    this.tag(lx, ly + 30, "Crieur public · affiche tes print()", "#ffe7a0", 9, "rgba(90,25,20,0.88)", { icon: "📢", border: "#f2c14e" });
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
    if (!this.blueprints.size && !this.entities.size && !this.signs.size && !this.collections.size) {
      c.font = "600 13px system-ui";
      c.fillStyle = "rgba(255,255,255,0.75)";
      c.textAlign = "center";
      c.textBaseline = "alphabetic";
      c.fillText("Ici apparaîtront les plans (classes), les objets et les variables de ton programme.", this.width / 2, this.height - 20);
      c.textAlign = "left";
    }
  }

  colPos(col, j) {
    return SD(col.s, col.d0 + j * 3);
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
        const shown = (f.revealFrom || 0) + (now - f.t0) / 22;
        const reveal = shown / Math.max(1, f.text.length) / 2.2;
        const style = f.question ? { bg: "#fff4cc", border: "#8a5a10" } : {};
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
