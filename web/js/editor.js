// A small but real Python editor: highlighting, line numbers, auto-indent,
// autocompletion, several files, execution / error markers — and the help
// of a real IDE kept simple for beginners: matching brackets (the pair at
// the cursor lights up, a bracket without partner turns red), brackets in
// three colours by depth, indentation guides, the line of the cursor,
// brackets and quotes closed automatically, else/elif/except re-indented.
import { el, esc } from "./util.js";

const OPEN = { "(": ")", "[": "]", "{": "}" };
const CLOSE = { ")": "(", "]": "[", "}": "{" };

// Every bracket of the code (outside strings and comments): its partner,
// its depth, or "bad" when it has none.
export function scanBrackets(text) {
  const pairs = new Map();
  const depth = new Map();
  const bad = new Map();   // position → message
  const stack = [];
  let i = 0;
  const n = text.length;
  while (i < n) {
    const ch = text[i];
    if (ch === "#") {
      const end = text.indexOf("\n", i);
      i = end === -1 ? n : end;
      continue;
    }
    const m = /^[rbfuRBFU]{0,2}("""|'''|"|')/.exec(text.slice(i, i + 5));
    if (m && (m[0].length === m[1].length || !/\w/.test(text[i - 1] || ""))) {
      const quote = m[1];
      let j = i + m[0].length;
      while (j < n) {
        if (text[j] === "\\") { j += 2; continue; }
        if (text.startsWith(quote, j)) { j += quote.length; break; }
        if (quote.length === 1 && text[j] === "\n") break;
        j += 1;
      }
      i = j;
      continue;
    }
    if (OPEN[ch]) {
      depth.set(i, stack.length);
      stack.push(i);
    } else if (CLOSE[ch]) {
      const top = stack.length ? stack[stack.length - 1] : -1;
      if (top >= 0 && text[top] === CLOSE[ch]) {
        stack.pop();
        pairs.set(top, i);
        pairs.set(i, top);
        depth.set(i, stack.length);
      } else {
        bad.set(i, top >= 0 ? `« ${ch} » ne correspond pas à « ${text[top]} »` : `« ${ch} » fermée sans avoir été ouverte`);
      }
    }
    i += 1;
  }
  for (const pos of stack) bad.set(pos, `« ${text[pos]} » jamais fermée`);
  return { pairs, depth, bad };
}

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

function highlightLine(text, state, offset = 0, br = null) {
  // state.triple: current open triple-quote delimiter or null
  let out = "";
  let i = 0;
  if (state.triple) {
    const end = text.indexOf(state.triple);
    if (end === -1) return `<span class="tk-str">${esc(text)}</span>`;
    out += `<span class="tk-str">${esc(text.slice(0, end + 3))}</span>`;
    i = end + 3;
    state.triple = null;
  } else {
    // Indentation guides: one thin line per level of 4 spaces.
    const lead = /^ */.exec(text)[0].length;
    const levels = Math.floor(lead / 4);
    if (levels && lead < text.length) {
      out += `<span class="ig">    </span>`.repeat(levels);
      i = levels * 4;
    }
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
    const ch = rest[0];
    if (br && (OPEN[ch] || CLOSE[ch])) {
      const pos = offset + i;
      let cls = `br br${(br.depth.get(pos) || 0) % 3}`;
      if (br.bad.has(pos)) cls = "br br-bad";
      if (br.match.has(pos)) cls += " br-match";
      out += `<span class="${cls}">${esc(ch)}</span>`;
    } else {
      out += esc(ch);
    }
    if (!/\s/.test(ch)) prev = ch;
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
    this.area.addEventListener("blur", () => {
      setTimeout(() => this.closePopup(), 150);
      this.renderCaret();
    });
    this.area.addEventListener("focus", () => this.renderCaret());
    // The bracket pair and the line of the cursor follow the cursor.
    document.addEventListener("selectionchange", () => {
      if (document.activeElement === this.area) this.renderCaret();
    });
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
    if (this.readOnly === flag && this.area.readOnly === flag) return;
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

  // Only the cursor moved: redraw if the bracket pair or the line changed.
  renderCaret() {
    const key = this.caretKey();
    if (key !== this.lastCaret) this.render();
  }

  caretKey() {
    const focused = document.activeElement === this.area;
    const pos = this.area.selectionStart;
    const value = this.area.value;
    const line = value.slice(0, pos).split("\n").length;
    const match = this.matchAt(pos);
    return `${focused}:${line}:${match ? match.join("-") : ""}`;
  }

  // The bracket next to the cursor (just before it, else just after it)
  // and its partner.
  matchAt(pos) {
    const br = this.brackets;
    if (!br) return null;
    for (const p of [pos - 1, pos]) {
      if (br.pairs.has(p)) return [p, br.pairs.get(p)];
      if (br.bad.has(p)) return [p];
    }
    return null;
  }

  render() {
    const value = this.area.value;
    const lines = value.split("\n");
    const state = { triple: null };
    this.brackets = scanBrackets(value);
    const match = this.matchAt(this.area.selectionStart);
    const br = { ...this.brackets, match: new Set(match || []) };
    const focused = document.activeElement === this.area;
    const caretLine = value.slice(0, this.area.selectionStart).split("\n").length;
    // Lines holding a bracket without partner (a red mark in the gutter).
    const badLines = new Map();
    let offset = 0;
    const starts = lines.map((t) => {
      const s0 = offset;
      offset += t.length + 1;
      return s0;
    });
    for (const [pos, msg] of this.brackets.bad) {
      let lo = 0;
      let hi = starts.length - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (starts[mid] <= pos) lo = mid; else hi = mid - 1;
      }
      if (!badLines.has(lo + 1)) badLines.set(lo + 1, msg);
    }
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
      if (badLines.has(n) && !g) g = "g-bad";
      if (n === cur) { cls += " cur"; g = g || "g-cur"; }
      if (focused && n === caretLine) cls += " caret";
      html += `<span class="${cls}">${highlightLine(text, state, starts[idx], br) || " "}</span>`;
      const title = (errs.get(n) || warns.get(n) || {}).msg || badLines.get(n);
      gutter += `<div class="${g}"${title ? ` title="${esc(title)}"` : ""}>${n === cur ? "▶" : ""}${n}</div>`;
    });
    this.pre.innerHTML = html;
    this.gutter.innerHTML = gutter;
    this.lastCaret = this.caretKey();
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
      const { selectionStart: s, value } = this.area;
      const before = value[s - 1];
      const after = value[s];
      if (/:\s*(#.*)?$/.test(text)) indent += "    ";
      if (/^\s*(return|pass|break|continue|raise)\b/.test(text)) indent = indent.slice(4);
      if (OPEN[before] && after === OPEN[before]) {
        // Between a pair of brackets: the content goes on its own line.
        this.insert(`\n${indent}    \n${indent}`);
        const pos = this.area.selectionStart - indent.length - 1;
        this.area.setSelectionRange(pos, pos);
        return;
      }
      this.insert("\n" + indent);
    } else if (OPEN[e.key] || e.key === '"' || e.key === "'") {
      this.typePair(e);
    } else if (CLOSE[e.key]) {
      // Typing the closing bracket that is already there: just step over it.
      const { selectionStart: s, selectionEnd: end, value } = this.area;
      if (s === end && value[s] === e.key) {
        e.preventDefault();
        this.area.setSelectionRange(s + 1, s + 1);
      }
    } else if (e.key === ":") {
      this.dedentKeyword();
    } else if (e.key === "Backspace") {
      const { selectionStart: s, selectionEnd: end } = this.area;
      const { text } = this.currentLine();
      const { value } = this.area;
      if (s === end && text.length > 0 && /^ +$/.test(text) && text.length % 4 === 0) {
        e.preventDefault();
        this.area.setSelectionRange(s - 4, s);
        this.insert("");
      } else if (s === end && s > 0 && (OPEN[value[s - 1]] === value[s] || (/["']/.test(value[s - 1]) && value[s - 1] === value[s]))) {
        // An empty pair: both go.
        e.preventDefault();
        this.area.setSelectionRange(s - 1, s + 1);
        this.insert("");
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key === "/") {
      e.preventDefault();
      this.toggleComment();
    }
  }

  // ( [ { " ' : the closing one comes with it (around the selection if
  // there is one); a quote already there is stepped over.
  typePair(e) {
    const { selectionStart: s, selectionEnd: end, value } = this.area;
    const ch = e.key;
    const close = OPEN[ch] || ch;
    const next = value[s] || "";
    const prev = value[s - 1] || "";
    if (s !== end) {
      e.preventDefault();
      const inside = value.slice(s, end);
      this.insert(ch + inside + close);
      this.area.setSelectionRange(s + 1, s + 1 + inside.length);
      return;
    }
    if (!OPEN[ch]) {
      if (next === ch) {
        e.preventDefault();
        this.area.setSelectionRange(s + 1, s + 1);
        return;
      }
      // Not after a letter (an apostrophe in a word) nor before one.
      if (/\w/.test(prev) || /\w/.test(next)) return;
    } else if (next && !/[\s)\]}:,]/.test(next)) {
      return;
    }
    e.preventDefault();
    this.insert(ch + close);
    this.area.setSelectionRange(s + 1, s + 1);
  }

  // else: / elif …: / except …: / finally: go back to the level of the
  // block they continue (as VS Code does).
  dedentKeyword() {
    const { selectionStart: s, selectionEnd: end, value } = this.area;
    if (s !== end) return;
    const start = value.lastIndexOf("\n", s - 1) + 1;
    const typed = value.slice(start, s);
    const m = /^( *)(else|elif\b.*|except\b.*|finally)\s*$/.exec(typed);
    if (!m) return;
    const indent = m[1].length;
    const prevLines = value.slice(0, start).split("\n").reverse();
    for (const line of prevLines) {
      if (!line.trim()) continue;
      const lead = /^ */.exec(line)[0].length;
      if (lead < indent && /^ *(if|elif|else|for|while|try|except|with)\b/.test(line)) {
        if (lead === indent) return;
        this.area.setSelectionRange(start, start + indent);
        this.insert(" ".repeat(lead));
        const pos = start + lead + m[2].length;
        this.area.setSelectionRange(pos, pos);
        return;
      }
      if (lead < indent) return;
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
      // Names of this file, then of the other files of the level (what
      // can be imported from them).
      const others = Object.entries(this.files).filter(([name]) => name !== this.active).map(([name, text]) => [name, text]);
      for (const [where, text] of [["", code], ...others]) {
        const from = where ? ` · ${where}` : "";
        for (const m of text.matchAll(/^\s*class (\w+)/gm)) add(m[1], `classe${from}`);
        for (const m of text.matchAll(/^\s*def (\w+)\(([^)]*)\)/gm)) {
          const params = m[2].split(",").map((p) => p.split(":")[0].trim()).filter((p) => p && p !== "self" && p !== "cls");
          add(m[1], `fonction(${params.join(", ")})${from}`);
        }
      }
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
