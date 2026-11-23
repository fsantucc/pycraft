// The voxel world: an isometric renderer whose content is driven entirely by
// the recorded execution of the learner's code (classes, objects, attributes,
// calls). Nothing here is decorative except the terrain props.
import { buildParts, healthOf } from "./models.js";
import { TraceModel } from "./trace.js";
import { hashColor, showValue } from "./util.js";

const W = 20;
const D = 20;
// Layout helper: s = depth in the screen (x + y), d = left/right (x - y).
const SD = (s, d) => [(s + d) / 2, (s - d) / 2];
const TW = 34;
const TH = 17;
const BH = 20;

const THEMES = {
  village: { top: "#6aa84f", side: "#8a5a2b", path: "#b59a62", sky: ["#87c6f0", "#cfe9fa"], prop: "tree" },
  atelier: { top: "#a07443", side: "#6b4a2a", path: "#8b6239", sky: ["#f0b778", "#fde3c0"], prop: "table" },
  citadelle: { top: "#8d9096", side: "#5f6166", path: "#a5a8ad", sky: ["#7895b8", "#c7d6e8"], prop: "wall" },
  forge: { top: "#5a3a36", side: "#3a2422", path: "#7a4a40", sky: ["#5a2a2a", "#b0584a"], prop: "lava" },
  labo: { top: "#ddd6ce", side: "#a89f96", path: "#b48cf2", sky: ["#5c5a8a", "#a9a4d6"], prop: "crystal" },
  tour: { top: "#e3dfa7", side: "#a9a476", path: "#c9c48a", sky: ["#130f20", "#3a2c55"], prop: "pillar" },
  royaume: { top: "#79b85a", side: "#8a5a2b", path: "#e2c36a", sky: ["#8ad0f5", "#fff1c9"], prop: "tree" },
};

function shade(hex, f) {
  if (hex.startsWith("hsl")) {
    const m = hex.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    return `hsl(${m[1]}, ${m[2]}%, ${Math.max(0, Math.min(100, Number(m[3]) * f))}%)`;
  }
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 255) * f);
  const g = Math.min(255, ((n >> 8) & 255) * f);
  const b = Math.min(255, (n & 255) * f);
  return `rgb(${r | 0},${g | 0},${b | 0})`;
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
    return [this.width / 2 + this.pan.x - this.cam.u * k, this.height / 2 + this.pan.y - this.cam.v * k, k];
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
    if (this.boss) add(...SD(13, 11), ...SD(16, 13), 4);
    if (pts.length < 8) add(0, 0, W, D, 0);
    const [cx, cy] = SD(12.5, -10.5);
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
  setScene(state, classes) {
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
    for (const [name, value] of state.vars) {
      if (!value || name === "_" || ["obj", "class", "function", "module"].includes(value.t)) continue;
      if (sIndex >= 7) break;
      const prev = this.signs.get(name);
      const text = `${name} = ${showValue(value)}`;
      const [sx, sy] = SD(16 + sIndex * 1.9, -12);
      this.signs.set(name, { name, text, x: sx, y: sy, changedAt: prev && prev.text !== text ? performance.now() : prev ? prev.changedAt : performance.now(), value });
      keepSigns.add(name);
      sIndex += 1;
    }
    for (const key of [...this.signs.keys()]) if (!keepSigns.has(key)) this.signs.delete(key);
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

  crierTop() {
    const [x, y] = SD(12.5, -10.5);
    return () => this.project(x + 0.5, y + 0.5, 2.2);
  }

  addEffect(effect) {
    this.effects.push({ t0: performance.now(), dur: 1600, ...effect });
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
          if (at) this.addEffect({ kind: "float", at, text: `plan ${ev.cls.split(".").pop()}`, color: "#5ee6e0" });
          break;
        }
        case "spawn": {
          const at = this.entityTop(ev.oid);
          if (!at) break;
          this.addEffect({ kind: "particles", at, color: "#b8f36b", dur: 900 });
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
            if (at) this.addEffect({ kind: "float", at, text: `⚙ ${label} — sans objet`, color: "#d7c0ff", dur: 1800 });
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
            this.addEffect({ kind: "float", at, text: label, color: "#ffe7a0", dur: 1200, rise: 0.6 });
            this.act(ev.oid, actionFor(ev.method));
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
          if (!at) at = this.crierTop();
          this.effects = this.effects.filter((f) => !(f.kind === "bubble" && f.owner === (ev.oid || "crier")));
          this.addEffect({ kind: "bubble", at, text: ev.text, dur: 2600, owner: ev.oid || "crier" });
          break;
        }
        case "var_set": {
          if (ev.value.t === "obj") {
            const at = this.entityTop(ev.value.ref);
            if (at) this.addEffect({ kind: "float", at, text: `🏷 ${ev.name}`, color: "#ffffff", dur: 1200, rise: 0.3 });
          }
          break;
        }
        case "module_start":
          this.addEffect({ kind: "float", at: this.crierTop(), text: `📦 import ${ev.name}`, color: "#ffe7a0", dur: 2000 });
          break;
        case "error": {
          const last = [...this.entities.keys()].pop();
          const at = (last && this.entityTop(last)) || this.crierTop();
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
    this.draw(now);
    requestAnimationFrame((t) => this.loop(t));
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

  // Draw an axis-aligned box given in world coordinates.
  box(x, y, z, w, d, h, color, alpha = 1, outline = "rgba(0,0,0,0.25)") {
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
    this.poly([P(rx, ry + rd, z), P(rx + rw, ry + rd, z), P(rx + rw, ry + rd, z + h), P(rx, ry + rd, z + h)], shade(color, 0.68), outline);
    this.poly([P(rx + rw, ry, z), P(rx + rw, ry + rd, z), P(rx + rw, ry + rd, z + h), P(rx + rw, ry, z + h)], shade(color, 0.84), outline);
    this.poly([P(rx, ry, z + h), P(rx + rw, ry, z + h), P(rx + rw, ry + rd, z + h), P(rx, ry + rd, z + h)], color, outline);
    c.globalAlpha = 1;
  }

  depthOf(x, y, z) {
    const [rx, ry] = this.rotate(x, y);
    return rx + ry + z * 0.01;
  }

  draw(now) {
    const c = this.ctx;
    const sky = c.createLinearGradient(0, 0, 0, this.height);
    sky.addColorStop(0, this.theme.sky[0]);
    sky.addColorStop(1, this.theme.sky[1]);
    c.fillStyle = sky;
    c.fillRect(0, 0, this.width, this.height);
    if (this.themeName === "tour") this.drawStars();

    this.drawGround();
    const drawables = [];
    this.hitboxes = [];
    this.collectProps(drawables);

    // Blueprint pedestals and holograms.
    for (const bp of this.blueprints.values()) {
      const s = bp.scale;
      const born = ease(Math.min(1, (now - bp.born) / 700));
      const pulse = Math.max(0, 1 - (now - bp.pulse) / 900);
      drawables.push({ d: this.depthOf(bp.x + 1, bp.y + 1, 0), fn: () => {
        if (!bp.owner) this.box(bp.x, bp.y, 0, 2, 2, 0.18, "#3c4a5a");
        this.box(bp.x + 0.5 - 0.5 * s + 0.5 * s, bp.y + 0.5 - 0.5 * s + 0.5 * s, bp.owner ? 0.18 : 0.18, s, s, 0.05, pulse > 0 ? bp.pulseColor : "#5ee6e0", 0.6);
      } });
      const sorted = [...bp.parts].sort((a, b) => this.depthOf(a.x + a.w / 2, a.y + a.d / 2, a.z) - this.depthOf(b.x + b.w / 2, b.y + b.d / 2, b.z));
      drawables.push({ d: this.depthOf(bp.x + 1.01, bp.y + 1.01, 0.5), fn: () => {
        const ox = bp.x + 0.5;
        const oy = bp.y + 0.5;
        const sc = s * born;
        for (const p of sorted) {
          this.box(ox + p.x * sc, oy + p.y * sc, 0.25 + p.z * sc, p.w * sc, p.d * sc, p.h * sc,
            pulse > 0 ? bp.pulseColor : "#7fe9f0", 0.32 + 0.4 * pulse, "rgba(94,230,224,0.55)");
        }
      } });
      const [lx, ly] = this.project(bp.x + 1, bp.y + 1, 0);
      const k = this.cam.k * this.zoom;
      this.hitboxes.push({ x0: lx - 30 * k, x1: lx + 30 * k, y0: ly - 60 * k * s, y1: ly + 12, target: { kind: "class", id: bp.qual } });
    }

    // Signposts.
    for (const sign of this.signs.values()) {
      drawables.push({ d: this.depthOf(sign.x + 0.5, sign.y + 0.5, 0), fn: () => {
        this.box(sign.x + 0.45, sign.y + 0.45, 0, 0.1, 0.1, 0.8, "#7a5230");
        this.box(sign.x + 0.1, sign.y + 0.42, 0.8, 0.8, 0.12, 0.5, "#b48a52");
      } });
    }

    // Entities (objects).
    for (const ent of this.entities.values()) {
      const parts = this.animatedParts(ent, now);
      for (const p of parts) {
        const wx = ent.x + p.x * ent.scale;
        const wy = ent.y + p.y * ent.scale;
        drawables.push({ d: this.depthOf(wx + p.w * ent.scale / 2, wy + p.d * ent.scale / 2, p.z), fn: () => {
          const glitch = ent.anim && ent.anim.kind === "glitch" && now - ent.anim.t0 < 900;
          const color = glitch && Math.floor(now / 80) % 2 ? "#ff3b30" : p.c;
          this.box(wx, wy, p.z * ent.scale + (p.lift || 0), p.w * ent.scale, p.d * ent.scale, p.h * ent.scale, color,
            p.role === "beam" ? 0.55 : 1);
        } });
      }
      const top = Math.max(...ent.parts.map((p) => p.z + p.h)) * ent.scale;
      const [sx, sy] = this.project(ent.x + 0.5 * ent.scale, ent.y + 0.5 * ent.scale, top);
      const [bx, by] = this.project(ent.x + 0.5 * ent.scale, ent.y + 0.5 * ent.scale, 0);
      const k = this.cam.k * this.zoom;
      this.hitboxes.push({ x0: sx - 22 * k, x1: sx + 22 * k, y0: sy - 8, y1: by + 8, target: { kind: "object", id: ent.oid } });
    }

    if (this.boss) this.collectBoss(drawables, now);
    drawables.sort((a, b) => a.d - b.d);
    drawables.forEach((d) => d.fn());

    this.drawInheritance();
    this.drawLinks();
    this.drawLabels(now);
    this.drawEffects(now);
  }

  drawStars() {
    const c = this.ctx;
    c.fillStyle = "#ffffffaa";
    for (let i = 0; i < 60; i += 1) {
      const x = (i * 97) % this.width;
      const y = (i * 53) % (this.height * 0.5);
      c.fillRect(x, y, 2, 2);
    }
  }

  drawGround() {
    const t = this.theme;
    const tiles = [];
    for (let x = 0; x < W; x += 1) {
      for (let y = 0; y < D; y += 1) tiles.push([x, y]);
    }
    tiles.sort((a, b) => this.depthOf(a[0], a[1], 0) - this.depthOf(b[0], b[1], 0));
    for (const [x, y] of tiles) {
      const zone = x + y < 10 ? "create" : x - y < -9 ? "square" : "world";
      let color = t.top;
      if (zone === "create") color = (x + y) % 2 ? "#4b5f73" : "#53687d";
      else if (zone === "square") color = (x + y) % 2 ? t.path : shade(t.path, 0.93);
      else if ((x * 7 + y * 13) % 11 === 0) color = shade(t.top, 0.9);
      else if ((x * 5 + y * 3) % 13 === 0) color = shade(t.top, 1.08);
      const [rx, ry] = this.rotate(x, y);
      const edge = rx >= W - 1 || ry >= D - 1 || rx <= 0 || ry <= 0;
      this.box(x, y, -0.5, 1, 1, 0.5, color, 1, edge ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.08)");
      if (edge) this.box(x, y, -1.3, 1, 1, 0.8, t.side, 1, "rgba(0,0,0,0.2)");
    }
  }

  collectProps(list) {
    const props = [];
    const kind = this.theme.prop;
    const spots = [SD(21, 17), SD(27, 11), SD(33, 5), SD(36, -1), SD(21, -18), SD(9, 7.5)];
    for (const [x, y] of spots) {
      if (kind === "tree") {
        props.push([x, y, 0, 0.3, 0.3, 1.4, "#6b4527"], [x - 0.5, y - 0.5, 1.2, 1.3, 1.3, 1.0, "#3f7f2c"]);
      } else if (kind === "lava") {
        props.push([x - 0.3, y - 0.3, -0.05, 0.9, 0.9, 0.08, "#f28c28"]);
      } else if (kind === "crystal") {
        props.push([x, y, 0, 0.35, 0.35, 0.9, "#b48cf2"]);
      } else if (kind === "pillar") {
        props.push([x, y, 0, 0.6, 0.6, 2.2, "#1e1530"], [x + 0.1, y + 0.1, 2.2, 0.4, 0.4, 0.4, "#ff6af0"]);
      } else if (kind === "wall") {
        props.push([x, y, 0, 0.9, 0.9, 1.1, "#777b82"]);
      } else if (kind === "table") {
        props.push([x, y, 0, 0.9, 0.9, 0.9, "#a3753f"], [x, y, 0.9, 0.9, 0.9, 0.05, "#7a5230"]);
      }
    }
    // The town crier: everything printed outside of any object speaks here.
    const [cx, cy] = SD(12.5, -10.5);
    props.push([cx + 0.15, cy + 0.15, 0, 0.7, 0.7, 0.8, "#7a5230"], [cx + 0.25, cy + 0.25, 0.8, 0.5, 0.5, 0.5, "#c99a6c"],
      [cx + 0.2, cy + 0.2, 1.3, 0.6, 0.6, 0.12, "#6b3f22"]);
    for (const p of props) {
      list.push({ d: this.depthOf(p[0] + p[3] / 2, p[1] + p[4] / 2, p[2]), fn: () => this.box(...p) });
    }
  }

  collectBoss(list, now) {
    const b = this.boss;
    const shake = now - b.hit < 400 ? Math.sin(now / 20) * 0.15 : 0;
    const { parts } = buildParts(b.model, {}, {});
    for (const p of parts) {
      const [bx, by] = SD(14, 11.5);
      list.push({ d: this.depthOf(bx + p.x * 2, by + p.y * 2, p.z), fn: () => {
        this.box(bx - 0.4 + shake + p.x * 1.8, by - 0.4 + p.y * 1.8, p.z * 1.8, p.w * 1.8, p.d * 1.8, p.h * 1.8,
          now - b.hit < 300 ? "#ff5040" : p.c);
      } });
    }
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

  drawInheritance() {
    const c = this.ctx;
    for (const bp of this.blueprints.values()) {
      for (const base of bp.bases) {
        const parent = this.blueprints.get(base);
        if (!parent) continue;
        const [x1, y1] = this.project(bp.x + 1, bp.y + 1, 0.2);
        const [x2, y2] = this.project(parent.x + 1, parent.y + 1, 0.2);
        c.strokeStyle = "#f2c14e";
        c.lineWidth = 2.5;
        c.setLineDash([]);
        c.beginPath();
        c.moveTo(x1, y1);
        c.quadraticCurveTo((x1 + x2) / 2, Math.min(y1, y2) - 40, x2, y2);
        c.stroke();
        const ang = Math.atan2(y2 - (Math.min(y1, y2) - 40), x2 - (x1 + x2) / 2);
        c.fillStyle = "#f2c14e";
        c.beginPath();
        c.moveTo(x2, y2);
        c.lineTo(x2 - 10 * Math.cos(ang - 0.4), y2 - 10 * Math.sin(ang - 0.4));
        c.lineTo(x2 - 10 * Math.cos(ang + 0.4), y2 - 10 * Math.sin(ang + 0.4));
        c.fill();
      }
    }
  }

  drawLinks() {
    const c = this.ctx;
    for (const link of this.links) {
      const a = this.entityTop(link.from);
      const b = this.entityTop(link.to);
      if (!a || !b) continue;
      const [x1, y1] = a();
      const [x2, y2] = b();
      c.strokeStyle = link.satellite ? "#5ee6e099" : "#e8d3a2bb";
      c.lineWidth = 2;
      c.setLineDash(link.satellite ? [3, 3] : [6, 4]);
      c.beginPath();
      c.moveTo(x1, y1);
      c.quadraticCurveTo((x1 + x2) / 2, (y1 + y2) / 2 + 25, x2, y2);
      c.stroke();
      c.setLineDash([]);
      if (!link.satellite) this.tag((x1 + x2) / 2, (y1 + y2) / 2 + 12, link.label, "#e8d3a2", 10);
    }
  }

  tag(x, y, text, color = "#fff", size = 11, bg = "rgba(0,0,0,0.6)") {
    const c = this.ctx;
    c.font = `600 ${size}px ui-monospace, Menlo, Consolas, monospace`;
    const w = c.measureText(text).width + 8;
    c.fillStyle = bg;
    c.fillRect(x - w / 2, y - size, w, size + 5);
    c.fillStyle = color;
    c.textAlign = "center";
    c.fillText(text, x, y);
    c.textAlign = "left";
    return w;
  }

  drawLabels(now) {
    const c = this.ctx;
    const k = this.cam.k * this.zoom;
    // Zone captions.
    const [zx, zy] = this.project(...SD(11, -7.5), 0);
    this.tag(zx, zy - 4, "▲ PLANS (classes)", "#7fe9f0", 10);
    this.tag(zx, zy + 14, "▼ OBJETS (instances)", "#b8f36b", 10);
    for (const bp of this.blueprints.values()) {
      const [x, y] = this.project(bp.x + 1, bp.y + 1, bp.owner ? 0.4 : 0.1);
      const sel = this.selected && this.selected.kind === "class" && this.selected.id === bp.qual;
      if (bp.owner) {
        const [nx, ny] = this.project(bp.x + 0.5 + 0.5 * bp.scale, bp.y + 0.5 + 0.5 * bp.scale, 1.5);
        this.tag(nx + 18, ny, `class ${bp.qual.split(".").pop()} (imbriquée)`, sel ? "#f2c14e" : "#d7c0ff", 9);
      } else {
        this.tag(x, y + 14, `class ${bp.qual}`, sel ? "#f2c14e" : "#7fe9f0", 11);
      }
      if (bp.inheritedFrom === null && bp.bases.length === 0) continue;
    }
    for (const sign of this.signs.values()) {
      const [x, y] = this.project(sign.x + 0.5, sign.y + 0.5, 1.45);
      const fresh = now - sign.changedAt < 900;
      const label = sign.text.length > 30 ? sign.text.slice(0, 29) + "…" : sign.text;
      this.ctx.font = "600 10px ui-monospace, Menlo, Consolas, monospace";
      const half = this.ctx.measureText(label).width / 2 + 4;
      this.tag(x - half + 6, y, label, fresh ? "#1b1b1b" : "#fff3d0", 10,
        fresh ? "#f2c14e" : "rgba(60,40,20,0.85)");
    }
    for (const ent of this.entities.values()) {
      const top = Math.max(...ent.parts.map((p) => p.z + p.h)) * ent.scale;
      const [x, y] = this.project(ent.x + 0.5 * ent.scale, ent.y + 0.5 * ent.scale, top + 0.2);
      const sel = this.selected && this.selected.kind === "object" && this.selected.id === ent.oid;
      const name = ent.names.length ? ent.names.join(" = ") : "";
      const short = ent.cls.split(".").pop();
      const label = ent.owner ? `↳ ${(ent.names[0] || "").split(".").pop()} : ${short}` : name ? `${name} : ${ent.cls}` : ent.cls;
      this.tag(x, y - 4 - (ent.labelShift || 0), label, sel ? "#f2c14e" : "#ffffff", ent.scale < 1 ? 9 : 11);
      if (ent.hp && !ent.owner) {
        const max = Math.max(ent.hpMax || ent.hp.value, 1);
        const ratio = Math.max(0, Math.min(1, ent.hp.value / max));
        const bw = 44 * Math.max(0.7, k);
        c.fillStyle = "#000c";
        c.fillRect(x - bw / 2, y - 22 - (ent.labelShift || 0), bw, 6);
        c.fillStyle = ratio > 0.5 ? "#6ad04a" : ratio > 0.2 ? "#f2c14e" : "#e5534b";
        c.fillRect(x - bw / 2 + 1, y - 21 - (ent.labelShift || 0), (bw - 2) * ratio, 4);
        c.font = "9px monospace";
        c.fillStyle = "#fff";
        c.fillText(`${ent.hp.key.replace(/^_/, "")} ${ent.hp.value}`, x + bw / 2 + 3, y - 16 - (ent.labelShift || 0));
      }
      if (sel) {
        c.strokeStyle = "#f2c14e";
        c.lineWidth = 2;
        const [bx, by] = this.project(ent.x + 0.5 * ent.scale, ent.y + 0.5 * ent.scale, 0);
        c.beginPath();
        c.ellipse(bx, by, 26 * k * ent.scale, 13 * k * ent.scale, 0, 0, Math.PI * 2);
        c.stroke();
      }
    }
    const [cx, cy] = this.crierTop()();
    this.tag(cx, cy + 10, "crieur (prints hors objet)", "#e8d3a2", 9);
    if (this.boss) {
      const [bx, by] = this.project(...SD(14, 11.5), 4.2);
      this.tag(bx, by - 18, this.boss.name, "#ff8a80", 12);
      const w = 120;
      c.fillStyle = "#000c";
      c.fillRect(bx - w / 2, by - 10, w, 8);
      c.fillStyle = "#e24c4c";
      c.fillRect(bx - w / 2 + 1, by - 9, (w - 2) * (this.boss.hp / Math.max(1, this.boss.total)), 6);
    }
    if (!this.blueprints.size && !this.entities.size && !this.signs.size) {
      c.font = "600 14px system-ui";
      c.fillStyle = "#00000088";
      c.textAlign = "center";
      c.fillText("Ici apparaîtront les plans (classes), les objets et les variables de ton programme.", this.width / 2, this.height - 24);
      c.textAlign = "left";
    }
  }

  drawEffects(now) {
    const c = this.ctx;
    for (const f of this.effects) {
      const t = (now - f.t0) / f.dur;
      if (f.kind === "float") {
        const [x, y] = f.at();
        this.tag(x, y - 18 - t * 30 * (f.rise ?? 1), f.text, f.color, 11, `rgba(0,0,0,${0.75 * (1 - t * t)})`);
      } else if (f.kind === "bubble") {
        const [x, y] = f.at();
        const text = f.text.length > 60 ? f.text.slice(0, 59) + "…" : f.text;
        c.font = "12px ui-monospace, Menlo, monospace";
        const w = c.measureText(text).width + 14;
        const by = y - 44;
        c.globalAlpha = t > 0.85 ? (1 - t) / 0.15 : 1;
        c.fillStyle = "#fffdf5";
        c.strokeStyle = "#000";
        c.lineWidth = 2;
        c.fillRect(x - w / 2, by - 16, w, 24);
        c.strokeRect(x - w / 2, by - 16, w, 24);
        c.beginPath();
        c.moveTo(x - 6, by + 8);
        c.lineTo(x, by + 16);
        c.lineTo(x + 6, by + 8);
        c.fill();
        c.fillStyle = "#222";
        c.textAlign = "center";
        c.fillText(text, x, by + 1);
        c.textAlign = "left";
        c.globalAlpha = 1;
      } else if (f.kind === "beam") {
        const [x1, y1] = f.from();
        const [x2, y2] = f.to();
        const p = Math.min(1, t * 2);
        c.strokeStyle = f.color;
        c.globalAlpha = 1 - Math.max(0, t - 0.6) / 0.4;
        c.lineWidth = f.thin ? 1.5 : 3.5;
        c.shadowColor = f.color;
        c.shadowBlur = f.thin ? 0 : 10;
        c.beginPath();
        c.moveTo(x1, y1);
        const mx = (x1 + x2) / 2;
        const my = Math.min(y1, y2) - 30;
        const qx = (1 - p) * (1 - p) * x1 + 2 * (1 - p) * p * mx + p * p * x2;
        const qy = (1 - p) * (1 - p) * y1 + 2 * (1 - p) * p * my + p * p * y2;
        c.quadraticCurveTo((x1 + mx) / 2 * (1 - p) + mx * p, (y1 + my) / 2 * (1 - p) + my * p, qx, qy);
        c.stroke();
        c.shadowBlur = 0;
        c.globalAlpha = 1;
        if (f.label && t > 0.15) this.tag(mx, my + 8, f.label, f.color, 11);
      } else if (f.kind === "particles" || f.kind === "explosion") {
        const [x, y] = f.at();
        const n = f.kind === "explosion" ? 26 : 14;
        for (let i = 0; i < n; i += 1) {
          const ang = (i / n) * Math.PI * 2;
          const r = t * (f.kind === "explosion" ? 70 : 34);
          c.fillStyle = f.kind === "explosion" ? (i % 2 ? "#f28c28" : "#555") : f.color;
          c.globalAlpha = 1 - t;
          const s = f.kind === "explosion" ? 7 : 4;
          c.fillRect(x + Math.cos(ang) * r - s / 2, y + Math.sin(ang) * r * 0.6 + 10 - s / 2, s, s);
        }
        c.globalAlpha = 1;
      } else if (f.kind === "shield") {
        const [x, y] = f.at();
        c.globalAlpha = 1 - t * t;
        c.fillStyle = "#c0392b";
        c.strokeStyle = "#fff";
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(x, y - 52);
        c.lineTo(x + 16, y - 46);
        c.lineTo(x + 14, y - 26);
        c.lineTo(x, y - 16);
        c.lineTo(x - 14, y - 26);
        c.lineTo(x - 16, y - 46);
        c.closePath();
        c.fill();
        c.stroke();
        this.tag(x, y - 58, "refusé : rien n'a changé", "#ffb4ad", 10);
        c.globalAlpha = 1;
      } else if (f.kind === "alert") {
        const [x, y] = f.at();
        c.globalAlpha = (1 - t) * (Math.floor(now / 120) % 2 ? 1 : 0.4);
        this.tag(x, y - 60, "⚠ ACCÈS EXTERNE À UN ATTRIBUT PROTÉGÉ", "#fff", 11, "#c0392b");
        c.globalAlpha = 1;
      }
    }
  }
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
