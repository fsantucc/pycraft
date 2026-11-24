// Small helpers shared by every module.

export async function api(path, body) {
  const options = body === undefined
    ? { method: "GET" }
    : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
  const response = await fetch(path, options);
  const data = await response.json().catch(() => ({ error: "Réponse illisible du serveur." }));
  if (!response.ok) throw new Error(data.error || `Erreur ${response.status}`);
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

export function toast(text, kind = "") {
  const box = el("div", { class: `toast ${kind}` }, text);
  document.getElementById("toasts").append(box);
  setTimeout(() => box.remove(), 4200);
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
