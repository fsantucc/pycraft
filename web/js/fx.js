// Visual effects toolkit: pixel particles, rounded labels, speech bubbles,
// deterministic noise. Pure drawing helpers, no knowledge of Python.

export function hash(...values) {
  let h = 2166136261;
  for (const v of values) {
    h ^= Math.floor(v * 997) | 0;
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

export function shadeHex(hex, f) {
  if (hex.startsWith("hsl")) {
    const m = hex.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    return `hsl(${m[1]}, ${m[2]}%, ${Math.max(0, Math.min(100, Number(m[3]) * f))}%)`;
  }
  if (hex.startsWith("rgb")) return hex;
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 255) * f);
  const g = Math.min(255, ((n >> 8) & 255) * f);
  const b = Math.min(255, (n & 255) * f);
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

export function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

// A Minecraft-like name tag: dark translucent pill, optional icon and
// colored accent. Returns the occupied rectangle.
export function nameTag(c, x, y, text, opts = {}) {
  const size = opts.size || 11;
  const icon = opts.icon || "";
  const label = icon ? `${icon} ${text}` : text;
  c.font = `${opts.weight || 600} ${size}px ui-monospace, "SF Mono", Menlo, Consolas, monospace`;
  const w = c.measureText(label).width + 12;
  const h = size + 8;
  const left = opts.align === "left" ? x : x - w / 2;
  const top = y - h + 3;
  c.save();
  c.globalAlpha *= opts.alpha ?? 1;
  roundRect(c, left, top, w, h, Math.min(6, h / 2));
  c.fillStyle = opts.bg || "rgba(16,12,8,0.78)";
  c.fill();
  if (opts.border) {
    c.strokeStyle = opts.border;
    c.lineWidth = 1.2;
    c.stroke();
  }
  if (opts.accent) {
    c.fillStyle = opts.accent;
    roundRect(c, left, top, 3.5, h, 1.5);
    c.fill();
  }
  c.fillStyle = opts.color || "#fff";
  c.textBaseline = "middle";
  c.textAlign = "left";
  c.fillText(label, left + 6 + (opts.accent ? 2 : 0), top + h / 2 + 0.5);
  c.restore();
  return { x: left, y: top, w, h };
}

// Cut a text into lines that fit maxWidth (words are kept whole when
// possible, very long words are split).
export function wrapText(c, text, maxWidth, maxLines = 8) {
  const lines = [];
  for (const raw of String(text).split("\n")) {
    let line = "";
    for (const word of raw.split(/(\s+)/)) {
      if (c.measureText(line + word).width <= maxWidth) {
        line += word;
        continue;
      }
      if (line.trim()) lines.push(line.trimEnd());
      line = word.trimStart();
      while (c.measureText(line).width > maxWidth) {
        let cut = line.length - 1;
        while (cut > 1 && c.measureText(line.slice(0, cut)).width > maxWidth) cut -= 1;
        lines.push(line.slice(0, cut));
        line = line.slice(cut);
      }
    }
    lines.push(line);
  }
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = `${kept[maxLines - 1].slice(0, -1)}…`;
    return kept;
  }
  return lines;
}

// Speech bubble with a tail and a typewriter reveal. Long texts wrap on
// several lines instead of being cut.
export function speechBubble(c, x, y, text, progress, style = {}) {
  c.font = "12px ui-monospace, Menlo, Consolas, monospace";
  const lines = wrapText(c, text, 300, 10);
  const lineH = 16;
  const w = Math.max(40, ...lines.map((l) => c.measureText(l).width)) + 20;
  const h = lines.length * lineH + 10;
  const screenW = c.canvas.clientWidth || c.canvas.width;
  const left = Math.max(4, Math.min(screenW - w - 4, x - w / 2));
  const tail = style.tail !== false;
  const top = Math.max(4, y - h - (tail ? 14 : 0));
  const tailX = Math.max(left + 12, Math.min(left + w - 12, x));
  c.save();
  c.shadowColor = "rgba(0,0,0,0.35)";
  c.shadowBlur = 8;
  c.shadowOffsetY = 3;
  roundRect(c, left, top, w, h, 8);
  c.fillStyle = style.bg || "#fffdf5";
  c.fill();
  c.shadowColor = "transparent";
  c.strokeStyle = style.border || "#2b2118";
  c.lineWidth = 2;
  c.stroke();
  if (tail) {
    c.beginPath();
    c.moveTo(tailX - 7, top + h - 1);
    c.lineTo(tailX, top + h + 10);
    c.lineTo(tailX + 7, top + h - 1);
    c.closePath();
    c.fillStyle = style.bg || "#fffdf5";
    c.fill();
    c.beginPath();
    c.moveTo(tailX - 7, top + h);
    c.lineTo(tailX, top + h + 10);
    c.lineTo(tailX + 7, top + h);
    c.stroke();
  }
  c.fillStyle = style.color || "#241a10";
  c.textBaseline = "middle";
  c.textAlign = "left";
  // Typewriter: reveal the characters line after line.
  const total = lines.reduce((n, l) => n + l.length, 0);
  let budget = Math.ceil(total * Math.min(1, progress * 2.2));
  lines.forEach((line, i) => {
    if (budget <= 0) return;
    c.fillText(line.slice(0, budget), left + 10, top + 5 + lineH * i + lineH / 2 + 0.5);
    budget -= line.length;
  });
  c.restore();
  return { top, h };
}

// Pixel particle system (screen space, anchored to world points).
export class Particles {
  constructor() {
    this.list = [];
  }

  burst(at, { count = 16, color = "#fff", colors = null, speed = 60, up = 30, gravity = 90,
    life = 900, size = 4, spread = Math.PI * 2, angle = -Math.PI / 2, glow = false } = {}) {
    const [x, y] = at();
    const now = performance.now();
    for (let i = 0; i < count; i += 1) {
      const a = angle + (Math.random() - 0.5) * spread;
      const v = speed * (0.4 + Math.random() * 0.8);
      this.list.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - up * Math.random(),
        g: gravity, t0: now, life: life * (0.6 + Math.random() * 0.6),
        size: size * (0.6 + Math.random() * 0.8),
        color: colors ? colors[i % colors.length] : color, glow,
      });
    }
  }

  ambient(p) {
    this.list.push({ ...p, t0: performance.now() });
  }

  draw(c, dt) {
    const now = performance.now();
    this.list = this.list.filter((p) => now - p.t0 < p.life);
    for (const p of this.list) {
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.wobble) p.x += Math.sin((now - p.t0) / 300 + p.wobble) * 0.3;
      const t = (now - p.t0) / p.life;
      const fade = p.fadeIn ? Math.min(1, t * 4) * (1 - t) * 1.6 : 1 - t * t;
      c.globalAlpha = Math.max(0, Math.min(1, fade));
      if (p.glow) {
        c.shadowColor = p.color;
        c.shadowBlur = 8;
      }
      c.fillStyle = p.color;
      const s = p.size * (p.shrink ? 1 - t * 0.7 : 1);
      c.fillRect(p.x - s / 2, p.y - s / 2, s, s);
      c.shadowBlur = 0;
    }
    c.globalAlpha = 1;
  }
}
