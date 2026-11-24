// Used by tests/test_frontend.py: checks that every story scene fits on
// the stage (inside the map, nothing overlapping). Prints the problems as JSON.
import { propParts, PROPS, SKINS } from "../../web/js/scene.js";
import fs from "fs";
const scenes = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const SD = (s, d) => [(s + d) / 2, (s - d) / 2];
const problems = [];
for (const [id, sc] of Object.entries(scenes)) {
  const boxes = [];
  for (const p of sc.props) {
    if (!PROPS[p.type]) { problems.push(`${id}: décor inconnu ${p.type}`); continue; }
    for (const done of [false, true]) {
      const { parts } = propParts(p.type, { done, t: 0, n: p.n });
      const [x, y] = SD(24 + p.at[0], 15 + p.at[1]);
      if (!done) boxes.push({ name: p.type, x0: x + Math.min(...parts.map((q) => q.x)), y0: y + Math.min(...parts.map((q) => q.y)),
        x1: x + Math.max(...parts.map((q) => q.x + q.w)), y1: y + Math.max(...parts.map((q) => q.y + q.d)) });
    }
  }
  for (const n of sc.npcs) {
    if (!SKINS[n.skin]) problems.push(`${id}: skin inconnu ${n.skin}`);
    const [x, y] = SD(24 + n.at[0], 15 + n.at[1]);
    boxes.push({ name: n.id, x0: x + 0.1, y0: y + 0.2, x1: x + 0.9, y1: y + 1.1 });
  }
  for (const b of boxes) if (b.x0 < 0 || b.y0 < 0 || b.x1 > 24 || b.y1 > 24) problems.push(`${id}: ${b.name} sort de la carte`);
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    if (Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 0.05 && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > 0.05) problems.push(`${id}: ${a.name} chevauche ${b.name}`);
  }
}
console.log(JSON.stringify(problems));
