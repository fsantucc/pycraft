// Small helpers shared by every module.

export async function api(path, body) {
  const options = body === undefined
    ? { method: "GET" }
    : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
  const response = await fetch(path, options);
  const data = await response.json().catch(() => ({ error: "Réponse illisible du serveur." }));
  if (!response.ok) throw new Error(data.error || `Erreur ${response.status}`);
  // Any answer may unlock achievements: the app shows them in one place.
  if (data && Array.isArray(data.achievements_new) && data.achievements_new.length) {
    window.dispatchEvent(new CustomEvent("pycraft:achievements", { detail: data.achievements_new }));
  }
  return data;
}

export function esc(text) {
  return String(text ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "class") node.className = value;
    else if (key === "html") node.innerHTML = value;
    else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
    else if (value !== undefined && value !== null && value !== false) node.setAttribute(key, value);
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(child));
  }
  return node;
}

// Minimal markdown: paragraphs, lists, **bold**, *italic*, `code`, ``` blocks, tables.
export function md(source) {
  const lines = String(source || "").replace(/\r/g, "").split("\n");
  let html = "";
  let i = 0;
  const inline = (t) => esc(t)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
  while (i < lines.length) {
    const line = lines[i];
    const heading = line.match(/^(#{1,4}) (.*)$/);
    if (heading) {
      const level = Math.min(4, heading[1].length + 1);
      html += `<h${level}>${inline(heading[2])}</h${level}>`;
      i += 1;
    } else if (line.startsWith("```")) {
      const block = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith("```")) block.push(lines[i++]);
      i += 1;
      html += `<pre>${esc(block.join("\n"))}</pre>`;
    } else if (/^\s*[-*] /.test(line)) {
      html += "<ul>";
      while (i < lines.length && /^\s*[-*] /.test(lines[i])) {
        html += `<li>${inline(lines[i].replace(/^\s*[-*] /, ""))}</li>`;
        i += 1;
      }
      html += "</ul>";
    } else if (/^\d+\. /.test(line)) {
      html += "<ol>";
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        html += `<li>${inline(lines[i].replace(/^\d+\. /, ""))}</li>`;
        i += 1;
      }
      html += "</ol>";
    } else if (line.startsWith("|")) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith("|")) rows.push(lines[i++]);
      html += "<table>";
      rows.filter((r) => !/^\|[-| :]+\|$/.test(r)).forEach((r, n) => {
        const cells = r.slice(1, -1).split("|").map((c) => inline(c.trim()));
        const tag = n === 0 ? "th" : "td";
        html += `<tr>${cells.map((c) => `<${tag}>${c}</${tag}>`).join("")}</tr>`;
      });
      html += "</table>";
    } else if (line.trim() === "") {
      i += 1;
    } else {
      const para = [];
      while (i < lines.length && lines[i].trim() !== "" && !lines[i].startsWith("```")
        && !/^\s*[-*] /.test(lines[i]) && !/^\d+\. /.test(lines[i]) && !lines[i].startsWith("|")
        && !/^#{1,4} /.test(lines[i])) {
        para.push(lines[i++]);
      }
      html += `<p>${inline(para.join(" "))}</p>`;
    }
  }
  return html;
}

// Notifications. They appear at the top of the screen, never block a click
// (pointer-events: none in the CSS), stack at most 3 deep, and consecutive
// "+N XP" messages are merged into one.
const TOAST_MAX = 3;

function dismissToast(box) {
  if (box.classList.contains("out")) return;
  box.classList.add("out");
  setTimeout(() => box.remove(), 260);
}

export function pushToast(content, kind = "", life = 3200) {
  const root = document.getElementById("toasts");
  const box = el("div", { class: `toast ${kind}`, role: "status" }, content,
    el("span", { class: "toast-life", style: `animation-duration:${life}ms` }));
  root.append(box);
  const alive = [...root.children].filter((t) => !t.classList.contains("out"));
  alive.slice(0, Math.max(0, alive.length - TOAST_MAX)).forEach(dismissToast);
  box.dataset.timer = String(setTimeout(() => dismissToast(box), life));
  return box;
}

export function toast(text, kind = "") {
  const root = document.getElementById("toasts");
  const xp = /^\+(\d+) XP$/.exec(String(text));
  const last = root.lastElementChild;
  if (xp && last && last.dataset.xp && !last.classList.contains("out")) {
    const total = Number(last.dataset.xp) + Number(xp[1]);
    last.dataset.xp = String(total);
    last.firstChild.textContent = `+${total} XP`;
    last.classList.remove("bump");
    void last.offsetWidth;
    last.classList.add("bump");
    clearTimeout(Number(last.dataset.timer));
    last.dataset.timer = String(setTimeout(() => dismissToast(last), 3200));
    return;
  }
  const box = pushToast(el("span", {}, text), kind, kind === "bad" ? 4200 : 3200);
  if (xp) box.dataset.xp = xp[1];
}

// Serialized Python values (from the sandbox) → short text.
export function showValue(v) {
  if (!v) return "?";
  if (v.t === "obj") return `<${v.cls}>`;
  if (v.t === "class") return `classe ${v.r}`;
  if (v.items && v.t === "dict") {
    return `{${v.items.map(([k, val]) => `${k}: ${showValue(val)}`).join(", ")}${v.len > v.items.length ? ", …" : ""}}`;
  }
  if (v.items) {
    const [open, close] = v.t === "tuple" ? ["(", ")"] : v.t === "list" ? ["[", "]"] : ["{", "}"];
    return `${open}${v.items.map(showValue).join(", ")}${v.len > v.items.length ? ", …" : ""}${close}`;
  }
  return v.r;
}

export function numberOf(v) {
  if (!v) return null;
  if (v.t === "int" || v.t === "float") return Number(v.r);
  return null;
}

export function hashColor(text) {
  let h = 0;
  for (const c of String(text)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `hsl(${h % 360}, 45%, 52%)`;
}
