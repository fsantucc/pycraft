// A small but real Python editor: highlighting, line numbers, auto-indent,
// autocompletion, several files, execution / error markers.
import { el, esc } from "./util.js";

const KEYWORDS = ["False", "None", "True", "and", "as", "assert", "break", "class", "continue",
  "def", "del", "elif", "else", "except", "finally", "for", "from", "global", "if", "import",
  "in", "is", "lambda", "nonlocal", "not", "or", "pass", "raise", "return", "try", "while",
  "with", "yield"];
const BUILTINS = ["print", "range", "round", "len", "int", "str", "float", "bool", "list",
  "dict", "set", "tuple", "super", "isinstance", "issubclass", "max", "min", "sum", "abs",
  "staticmethod", "classmethod", "property", "type", "hasattr", "getattr", "sorted", "enumerate",
  "zip", "object"];
const KW = new Set(KEYWORDS);
const BI = new Set(BUILTINS);

function highlightLine(text, state) {
  // state.triple: current open triple-quote delimiter or null
  let out = "";
  let i = 0;
  if (state.triple) {
    const end = text.indexOf(state.triple);
    if (end === -1) return `<span class="tk-str">${esc(text)}</span>`;
    out += `<span class="tk-str">${esc(text.slice(0, end + 3))}</span>`;
    i = end + 3;
    state.triple = null;
  }
  let prev = "";
  while (i < text.length) {
    const rest = text.slice(i);
    let m;
    if (rest[0] === "#") {
      out += `<span class="tk-com">${esc(rest)}</span>`;
      break;
    }
    if ((m = rest.match(/^[rbfuRBFU]{0,2}("""|''')/))) {
      const delim = m[1];
      const close = rest.indexOf(delim, m[0].length);
      if (close === -1) {
        out += `<span class="tk-str">${esc(rest)}</span>`;
        state.triple = delim;
        break;
      }
      out += `<span class="tk-str">${esc(rest.slice(0, close + 3))}</span>`;
      i += close + 3;
      continue;
    }
    if ((m = rest.match(/^[rbfuRBFU]{0,2}("([^"\\]|\\.)*"?|'([^'\\]|\\.)*'?)/))) {
      out += `<span class="tk-str">${esc(m[0])}</span>`;
      i += m[0].length;
      continue;
    }
    if ((m = rest.match(/^@[\w.]+/))) {
      out += `<span class="tk-deco">${esc(m[0])}</span>`;
      i += m[0].length;
      continue;
    }
    if ((m = rest.match(/^\d[\d_]*(\.\d+)?/))) {
      out += `<span class="tk-num">${m[0]}</span>`;
      i += m[0].length;
      continue;
    }
    if ((m = rest.match(/^[A-Za-z_]\w*/))) {
      const w = m[0];
      let cls = "";
      if (prev === "def") cls = "tk-def";
      else if (prev === "class") cls = "tk-cls";
      else if (KW.has(w)) cls = "tk-kw";
      else if (w === "self" || w === "cls") cls = "tk-self";
      else if (BI.has(w)) cls = "tk-builtin";
      else if (/^[A-Z][a-z]/.test(w)) cls = "tk-cls";
      out += cls ? `<span class="${cls}">${w}</span>` : w;
      prev = w;
      i += w.length;
      continue;
    }
    out += esc(rest[0]);
    if (!/\s/.test(rest[0])) prev = rest[0];
    i += 1;
  }
  return out;
}

export class Editor {
  constructor(root, { onChange, onRun, onTab } = {}) {
    this.root = root;
    this.onChange = onChange || (() => {});
    this.onRun = onRun || (() => {});
    this.onTab = onTab || (() => {});
    this.files = { "main.py": "" };
    this.active = "main.py";
    this.markers = { current: null, errors: [], warnings: [] };
    this.readOnly = false;
    this.gutter = el("div", { class: "ed-gutter" });
    this.pre = el("pre");
    this.area = el("textarea", { spellcheck: "false", autocapitalize: "off", autocomplete: "off", wrap: "off" });
    this.main = el("div", { class: "ed-main" }, this.pre, this.area);
    root.append(this.gutter, this.main);
    this.popup = null;
    this.area.addEventListener("input", () => this.handleInput());
    this.area.addEventListener("scroll", () => this.syncScroll());
    this.area.addEventListener("keydown", (e) => this.handleKey(e));
    this.area.addEventListener("click", () => this.closePopup());
    this.area.addEventListener("blur", () => setTimeout(() => this.closePopup(), 150));
    this.charWidth = this.measureChar();
  }

  measureChar() {
    const ctx = document.createElement("canvas").getContext("2d");
    ctx.font = getComputedStyle(this.area).font || "13px monospace";
    return ctx.measureText("M").width || 7.8;
  }

  setFiles(files, active) {
    this.files = { ...files };
    this.active = active && files[active] !== undefined ? active : Object.keys(files)[0];
    this.area.value = this.files[this.active];
    this.render();
    this.onTab(this.active);
  }

  getFiles() {
    this.files[this.active] = this.area.value;
    return { ...this.files };
  }

  switchTo(name) {
    if (!(name in this.files)) return;
    this.files[this.active] = this.area.value;
    this.active = name;
    this.area.value = this.files[name];
    this.render();
    this.onTab(name);
  }

  setReadOnly(flag) {
    this.readOnly = flag;
    this.area.readOnly = flag;
  }

  setMarkers(markers) {
    this.markers = { current: null, errors: [], warnings: [], ...markers };
    this.render();
  }

  setCurrent(current) {
    this.markers.current = current;
    this.render();
    if (current && current.file === this.active) this.scrollToLine(current.line);
  }

  scrollToLine(line) {
    const top = (line - 1) * 20;
    const view = this.area.clientHeight;
    if (top < this.area.scrollTop + 20 || top > this.area.scrollTop + view - 40) {
      this.area.scrollTop = Math.max(0, top - view / 3);
      this.syncScroll();
    }
  }

  gotoLine(file, line) {
    if (file && file !== this.active) this.switchTo(file);
    const lines = this.area.value.split("\n");
    let pos = 0;
    for (let i = 0; i < line - 1 && i < lines.length; i += 1) pos += lines[i].length + 1;
    this.area.focus();
    this.area.setSelectionRange(pos, pos + (lines[line - 1] || "").length);
    this.scrollToLine(line);
  }

  render() {
    const lines = this.area.value.split("\n");
    const state = { triple: null };
    const mark = (list) => new Map(list.filter((m) => (m.file || "main.py") === this.active)
      .map((m) => [m.line, m]));
    const errs = mark(this.markers.errors);
    const warns = mark(this.markers.warnings);
    const cur = this.markers.current && this.markers.current.file === this.active
      ? this.markers.current.line : -1;
    let html = "";
    let gutter = "";
    lines.forEach((text, idx) => {
      const n = idx + 1;
      let cls = "ed-line";
      let g = "";
      if (errs.has(n)) { cls += " err"; g = "g-err"; } else if (warns.has(n)) { cls += " warn"; g = "g-warn"; }
      if (n === cur) { cls += " cur"; g = g || "g-cur"; }
      html += `<span class="${cls}">${highlightLine(text, state) || " "}</span>`;
      const title = (errs.get(n) || warns.get(n) || {}).msg;
      gutter += `<div class="${g}"${title ? ` title="${esc(title)}"` : ""}>${n === cur ? "▶" : ""}${n}</div>`;
    });
    this.pre.innerHTML = html;
    this.gutter.innerHTML = gutter;
    this.syncScroll();
  }

  syncScroll() {
    this.pre.scrollTop = this.area.scrollTop;
    this.pre.scrollLeft = this.area.scrollLeft;
    this.gutter.scrollTop = this.area.scrollTop;
  }

  handleInput() {
    this.files[this.active] = this.area.value;
    this.markers.errors = this.markers.errors.filter((m) => (m.file || "main.py") !== this.active);
    this.render();
    this.onChange(this.getFiles());
    this.updateCompletion();
  }

  insert(text) {
    if (this.readOnly) return;
    this.area.focus();
    if (!document.execCommand("insertText", false, text)) {
      const { selectionStart: s, selectionEnd: e, value } = this.area;
      this.area.value = value.slice(0, s) + text + value.slice(e);
      this.area.selectionStart = this.area.selectionEnd = s + text.length;
      this.handleInput();
    }
  }

  currentLine() {
    const { value, selectionStart } = this.area;
    const start = value.lastIndexOf("\n", selectionStart - 1) + 1;
    return { start, text: value.slice(start, selectionStart) };
  }

  handleKey(e) {
    if (this.popup && this.handlePopupKey(e)) return;
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      this.onRun();
      return;
    }
    if (this.readOnly) return;
    if (e.key === "Tab") {
      e.preventDefault();
      const { selectionStart: s, selectionEnd: end, value } = this.area;
      if (s !== end && value.slice(s, end).includes("\n")) {
        this.indentSelection(e.shiftKey);
      } else if (e.shiftKey) {
        this.indentSelection(true);
      } else {
        this.insert("    ");
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      const { text } = this.currentLine();
      let indent = text.match(/^\s*/)[0];
      if (/:\s*(#.*)?$/.test(text)) indent += "    ";
      if (/^\s*(return|pass|break|continue|raise)\b/.test(text)) indent = indent.slice(4);
      this.insert("\n" + indent);
    } else if (e.key === "Backspace") {
      const { selectionStart: s, selectionEnd: end } = this.area;
      const { text } = this.currentLine();
      if (s === end && text.length > 0 && /^ +$/.test(text) && text.length % 4 === 0) {
        e.preventDefault();
        this.area.setSelectionRange(s - 4, s);
        this.insert("");
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key === "/") {
      e.preventDefault();
      this.toggleComment();
    }
  }

  indentSelection(outdent) {
    const { selectionStart: s, selectionEnd: end, value } = this.area;
    const start = value.lastIndexOf("\n", s - 1) + 1;
    const block = value.slice(start, end);
    const changed = block.split("\n").map((l) => (outdent ? l.replace(/^ {1,4}/, "") : "    " + l)).join("\n");
    this.area.setSelectionRange(start, end);
    this.insert(changed);
    this.area.setSelectionRange(start, start + changed.length);
  }

  toggleComment() {
    const { selectionStart: s, selectionEnd: end, value } = this.area;
    const start = value.lastIndexOf("\n", s - 1) + 1;
    let stop = value.indexOf("\n", end);
    if (stop === -1) stop = value.length;
    const lines = value.slice(start, stop).split("\n");
    const all = lines.every((l) => /^\s*#/.test(l) || !l.trim());
    const out = lines.map((l) => (all ? l.replace(/^(\s*)# ?/, "$1") : l.replace(/^(\s*)/, "$1# "))).join("\n");
    this.area.setSelectionRange(start, stop);
    this.insert(out);
  }

  // ------------------------------------------------------------ completion
  candidates(prefix, before) {
    const code = this.area.value;
    const words = new Map();
    const add = (w, kind) => { if (!words.has(w)) words.set(w, kind); };
    const dot = before.match(/([A-Za-z_]\w*)\.\w*$/);
    if (dot) {
      const owner = dot[1];
      if (owner === "self" || owner === "cls") {
        for (const m of code.matchAll(/self\.(\w+)/g)) add(m[1], "attribut");
      }
      for (const m of code.matchAll(/def (\w+)\(/g)) if (!m[1].startsWith("__")) add(m[1], "méthode");
      if (owner === "super()") add("__init__", "méthode");
    } else {
      KEYWORDS.forEach((k) => add(k, "mot-clé"));
      BUILTINS.forEach((b) => add(b, "intégré"));
      for (const m of code.matchAll(/class (\w+)/g)) add(m[1], "classe");
      for (const m of code.matchAll(/def (\w+)/g)) add(m[1], "fonction");
      for (const m of code.matchAll(/\b([a-z_]\w*)\s*=/g)) add(m[1], "variable");
      add("__init__", "constructeur");
      add("__name__", "spécial");
    }
    return [...words].filter(([w]) => w.startsWith(prefix) && w !== prefix).slice(0, 12);
  }

  updateCompletion() {
    const { selectionStart: s, selectionEnd: end, value } = this.area;
    if (s !== end || this.readOnly) return this.closePopup();
    const before = value.slice(Math.max(0, value.lastIndexOf("\n", s - 1) + 1), s);
    const m = before.match(/(\w+)$/);
    const afterDot = /\.\w*$/.test(before);
    if (!m && !afterDot) return this.closePopup();
    const prefix = m ? m[1] : "";
    if (!afterDot && prefix.length < 2) return this.closePopup();
    const items = this.candidates(prefix, before);
    if (!items.length) return this.closePopup();
    this.showPopup(items, prefix, before.length);
  }

  showPopup(items, prefix, column) {
    this.closePopup();
    const lines = this.area.value.slice(0, this.area.selectionStart).split("\n");
    const top = lines.length * 20 + 8 - this.area.scrollTop;
    const left = Math.min(10 + column * this.charWidth - this.area.scrollLeft, this.main.clientWidth - 150);
    this.popup = el("div", { class: "ac-pop", style: `top:${top}px;left:${Math.max(0, left)}px` });
    this.popupItems = items;
    this.popupPrefix = prefix;
    this.popupIndex = 0;
    items.forEach(([word, kind], i) => {
      this.popup.append(el("div", {
        class: i === 0 ? "sel" : "",
        onmousedown: (e) => { e.preventDefault(); this.popupIndex = i; this.acceptPopup(); },
      }, word, el("span", { class: "kind" }, kind)));
    });
    this.main.append(this.popup);
  }

  handlePopupKey(e) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const n = this.popupItems.length;
      this.popupIndex = (this.popupIndex + (e.key === "ArrowDown" ? 1 : n - 1)) % n;
      [...this.popup.children].forEach((c, i) => c.classList.toggle("sel", i === this.popupIndex));
      return true;
    }
    if (e.key === "Tab" || e.key === "Enter") {
      e.preventDefault();
      this.acceptPopup();
      return true;
    }
    if (e.key === "Escape") {
      this.closePopup();
      return true;
    }
    return false;
  }

  acceptPopup() {
    const [word] = this.popupItems[this.popupIndex];
    this.closePopup();
    this.insert(word.slice(this.popupPrefix.length));
  }

  closePopup() {
    if (this.popup) this.popup.remove();
    this.popup = null;
  }
}
