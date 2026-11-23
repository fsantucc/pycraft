// Interactive class / object diagram (SVG), built from the real classes and
// objects of the execution.
import { TraceModel } from "./trace.js";
import { esc, showValue } from "./util.js";

const KIND_BADGE = { instance: "", static: "«static» ", class: "«class» ", getter: "«get» ", setter: "«set» " };

export function renderDiagram(root, model, state, { showObjects, onSelect, selected }) {
  if (!model || !state.classes.length) {
    root.innerHTML = '<p class="muted">Aucune classe définie pour l\'instant.</p>';
    return;
  }
  const classes = model.classes;
  const defined = state.classes.filter((q) => classes[q]);
  // Depth in the inheritance tree (parents on top).
  const depth = {};
  const depthOf = (q, seen = new Set()) => {
    if (depth[q] !== undefined) return depth[q];
    if (seen.has(q)) return 0;
    seen.add(q);
    const bases = (classes[q].user_bases || []).filter((b) => defined.includes(b));
    depth[q] = bases.length ? 1 + Math.max(...bases.map((b) => depthOf(b, seen))) : 0;
    return depth[q];
  };
  defined.forEach((q) => depthOf(q));

  // Attributes observed on the instances of each class.
  const observed = {};
  for (const obj of state.objects.values()) {
    observed[obj.cls] = observed[obj.cls] || new Set();
    Object.keys(obj.attrs).forEach((a) => observed[obj.cls].add(a));
  }

  const BOX_W = 200;
  const LINE = 15;
  const rows = {};
  defined.forEach((q) => {
    const d = depth[q];
    rows[d] = rows[d] || [];
    rows[d].push(q);
  });
  const pos = {};
  let height = 20;
  const maxRow = Math.max(...Object.values(rows).map((r) => r.length));
  const width = Math.max(640, maxRow * (BOX_W + 30) + 30);
  Object.keys(rows).sort((a, b) => a - b).forEach((d) => {
    let rowH = 0;
    rows[d].forEach((q, i) => {
      const info = classes[q];
      const attrs = [...(observed[q] || [])];
      const h = 26 + (attrs.length + info.methods.length) * LINE + 14;
      pos[q] = { x: 20 + i * (BOX_W + 30), y: height, h, attrs };
      rowH = Math.max(rowH, h);
    });
    height += rowH + 50;
  });

  let objY = height;
  const objPos = {};
  const names = TraceModel.names(state);
  if (showObjects) {
    const objs = [...state.objects.values()];
    for (let r = 0; r < objs.length; r += 3) {
      const row = objs.slice(r, r + 3);
      const h = Math.max(...row.map((o) => 24 + Object.keys(o.attrs).length * 14));
      row.forEach((obj, i) => { objPos[obj.oid] = { x: 20 + i * 200, y: objY, h: 24 + Object.keys(obj.attrs).length * 14 }; });
      objY += h + 24;
    }
  }
  const total = Math.max(height, objY) + 10;

  let svg = `<svg viewBox="0 0 ${width} ${total}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <marker id="tri" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="12" markerHeight="12" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="#221c16" stroke="#f2c14e"/></marker>
    <marker id="arr" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto">
      <path d="M0,0 L10,5 L0,10 z" fill="#5ee6e0"/></marker>
    <marker id="dia" viewBox="0 0 12 12" refX="1" refY="6" markerWidth="12" markerHeight="12" orient="auto">
      <path d="M1,6 L6,1 L11,6 L6,11 z" fill="#b48cf2"/></marker>
  </defs>`;

  // Inheritance arrows (child → parent, hollow triangle).
  defined.forEach((q) => {
    (classes[q].user_bases || []).forEach((b) => {
      if (!pos[b]) return;
      const c = pos[q];
      const p = pos[b];
      svg += `<path d="M${c.x + BOX_W / 2},${c.y} C${c.x + BOX_W / 2},${c.y - 25} ${p.x + BOX_W / 2},${p.y + p.h + 25} ${p.x + BOX_W / 2},${p.y + p.h}"
        fill="none" stroke="#f2c14e" stroke-width="2" marker-end="url(#tri)"/>`;
    });
    const owner = classes[q].owner;
    if (owner && pos[owner]) {
      const c = pos[q];
      const o = pos[owner];
      svg += `<path d="M${o.x + BOX_W},${o.y + 14} L${c.x},${c.y + 14}" fill="none" stroke="#b48cf2" stroke-width="2"
        stroke-dasharray="5 3" marker-start="url(#dia)"/>
        <text x="${(o.x + BOX_W + c.x) / 2}" y="${(o.y + c.y) / 2 + 8}" fill="#b48cf2" font-size="10" text-anchor="middle">imbriquée</text>`;
    }
  });

  defined.forEach((q) => {
    const info = classes[q];
    const p = pos[q];
    const sel = selected && selected.kind === "class" && selected.id === q;
    svg += `<g class="cls-box" data-cls="${esc(q)}">
      <rect x="${p.x}" y="${p.y}" width="${BOX_W}" height="${p.h}" fill="#1a2733" stroke="${sel ? "#f2c14e" : "#5ee6e0"}" stroke-width="${sel ? 3 : 1.5}"/>
      <rect x="${p.x}" y="${p.y}" width="${BOX_W}" height="22" fill="#24384a"/>
      <text x="${p.x + BOX_W / 2}" y="${p.y + 15}" fill="#7fe9f0" font-size="12" font-weight="700" text-anchor="middle">${esc(q)}</text>`;
    let y = p.y + 22 + LINE;
    p.attrs.forEach((a) => {
      svg += `<text x="${p.x + 8}" y="${y}" fill="${a.startsWith("_") ? "#f09a3e" : "#d8e8c8"}" font-size="11">${a.startsWith("_") ? "# " : "+ "}${esc(a)}</text>`;
      y += LINE;
    });
    svg += `<line x1="${p.x}" x2="${p.x + BOX_W}" y1="${y - LINE + 4}" y2="${y - LINE + 4}" stroke="#5ee6e055"/>`;
    y += 4;
    info.methods.forEach((m) => {
      const color = m.kind === "static" ? "#d7c0ff" : m.kind === "class" ? "#9fdcff" : "#ffe7a0";
      svg += `<text x="${p.x + 8}" y="${y}" fill="${color}" font-size="11">${KIND_BADGE[m.kind]}${esc(m.name)}()</text>`;
      y += LINE;
    });
    svg += "</g>";
  });

  if (showObjects) {
    for (const obj of state.objects.values()) {
      const o = objPos[obj.oid];
      const cp = pos[obj.cls];
      const sel = selected && selected.kind === "object" && selected.id === obj.oid;
      if (cp) {
        svg += `<path d="M${o.x + 90},${o.y} L${cp.x + BOX_W / 2},${cp.y + cp.h}" stroke="#6aa84f" stroke-dasharray="3 4" fill="none"/>`;
      }
      for (const [attr, v] of Object.entries(obj.attrs)) {
        const refs = v && v.t === "obj" ? [v.ref] : (v && v.items ? v.items.flat().filter((x) => x && x.t === "obj").map((x) => x.ref) : []);
        refs.forEach((ref) => {
          const t = objPos[ref];
          if (t) svg += `<path d="M${o.x + 180},${o.y + 12} C${o.x + 230},${o.y} ${t.x - 50},${t.y} ${t.x},${t.y + 12}" stroke="#5ee6e0" fill="none" marker-end="url(#arr)"/>
            <text x="${(o.x + 180 + t.x) / 2}" y="${(o.y + t.y) / 2 + 6}" fill="#5ee6e0" font-size="9" text-anchor="middle">${esc(attr)}</text>`;
        });
      }
      const label = (names.get(obj.oid) || [""])[0];
      svg += `<g class="cls-box" data-obj="${obj.oid}">
        <rect x="${o.x}" y="${o.y}" width="180" height="${o.h}" rx="8" fill="#1c2a16" stroke="${sel ? "#f2c14e" : "#6aa84f"}" stroke-width="${sel ? 3 : 1.5}"/>
        <text x="${o.x + 8}" y="${o.y + 16}" fill="#b8f36b" font-size="11" font-weight="700">${esc(label || obj.oid)} : ${esc(obj.cls)}</text>`;
      let y = o.y + 32;
      for (const [attr, v] of Object.entries(obj.attrs)) {
        const text = `${attr} = ${showValue(v)}`;
        svg += `<text x="${o.x + 8}" y="${y}" fill="#d8e8c8" font-size="10.5">${esc(text.length > 28 ? text.slice(0, 27) + "…" : text)}</text>`;
        y += 14;
      }
      svg += "</g>";
    }
  }
  svg += "</svg>";
  root.innerHTML = svg;
  root.querySelectorAll("[data-cls]").forEach((g) => g.addEventListener("click", () => onSelect({ kind: "class", id: g.dataset.cls })));
  root.querySelectorAll("[data-obj]").forEach((g) => g.addEventListener("click", () => onSelect({ kind: "object", id: g.dataset.obj })));
}
