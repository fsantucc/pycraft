// PyCraft — application glue: levels, editor buffers, execution playback.
import { renderDiagram } from "./diagram.js";
import { Editor } from "./editor.js";
import { Inspector } from "./inspector.js";
import { LessonPanel, STEPS } from "./lesson.js";
import { TraceModel, describe } from "./trace.js";
import { api, el, esc, md, showValue, toast } from "./util.js";
import { World } from "./world.js";

const $ = (id) => document.getElementById(id);
const BOSS_MODELS = { r1: "Creeper", r2: "Enderman", r3: "Golem", r4: "Wither", r5: "Alchemist", r6: "Dragon", r7: "Castle" };

class App {
  constructor() {
    this.curriculum = null;
    this.progress = null;
    this.level = null;
    this.region = null;
    this.step = "story";
    this.mode = "demo";
    this.buffers = { demo: null, mission: null };
    this.model = null;
    this.index = 0;
    this.playing = false;
    this.selected = null;
    this.saveTimer = null;
    this.playTimer = null;
    this.entry = "main.py";

    this.editor = new Editor($("editor"), {
      onChange: (files) => this.onEdit(files),
      onRun: () => this.runCurrent(),
      onTab: () => this.renderFileTabs(),
    });
    this.world = new World($("world"), {
      onSelect: (target) => this.select(target),
      onHover: (target, e) => this.hover(target, e),
    });
    this.inspector = new Inspector($("tab-inspector"), { onSelect: (t) => this.select(t) });
    this.lesson = new LessonPanel($("tab-lesson"), this);
    this.bindUi();
  }

  // ---------------------------------------------------------------- boot
  async start() {
    this.curriculum = await api("/api/curriculum");
    this.levelsById = {};
    this.regionOf = {};
    for (const region of this.curriculum.regions) {
      for (const level of region.levels) {
        this.levelsById[level.id] = level;
        this.regionOf[level.id] = region;
      }
    }
    await this.refreshProgress();
    const remembered = localStorage.getItem("pycraft.level");
    const firstOpen = this.curriculum.order.find((id) => {
      const st = this.progress.levels[id].status;
      return st === "available" || st === "in_progress";
    }) || this.curriculum.order[0];
    const target = remembered && this.progress.levels[remembered] && this.progress.levels[remembered].status !== "locked"
      ? remembered : firstOpen;
    await this.openLevel(target);
    if (!localStorage.getItem("pycraft.welcomed")) {
      localStorage.setItem("pycraft.welcomed", "1");
      this.showWelcome();
    }
  }

  async refreshProgress() {
    this.progress = await api("/api/progress");
    this.updateTopbar();
  }

  updateTopbar() {
    const p = this.progress;
    $("player-level").textContent = `Niv. ${p.player_level}`;
    const span = Math.max(1, p.level_next - p.level_floor);
    $("xp-fill").style.width = `${Math.min(100, 100 * (p.xp - p.level_floor) / span)}%`;
    $("xp-text").textContent = `${p.xp} XP`;
    const icons = ["⛏", "🛠", "🛡", "⚒", "🔴", "👁", "👑"];
    $("rewards").innerHTML = p.rewards.map((r, i) => `<span title="${esc(r)}">${icons[i] || "★"}</span>`).join("");
  }

  bindUi() {
    $("btn-run").addEventListener("click", () => this.runCurrent());
    $("btn-check").addEventListener("click", () => this.checkMission());
    $("btn-quality").addEventListener("click", () => this.quality());
    $("btn-reset-code").addEventListener("click", () => this.resetCode());
    $("btn-map").addEventListener("click", () => this.showMap());
    $("btn-progress").addEventListener("click", () => this.showDashboard());
    $("overlay-close").addEventListener("click", () => $("overlay").classList.add("hidden"));
    $("overlay").addEventListener("click", (e) => { if (e.target.id === "overlay") $("overlay").classList.add("hidden"); });
    $("tl-play").addEventListener("click", () => (this.playing ? this.pause() : this.play()));
    $("tl-step").addEventListener("click", () => { this.pause(); this.goto(this.index + 1, true); });
    $("tl-back").addEventListener("click", () => { this.pause(); this.goto(this.index - 1, false); });
    $("tl-start").addEventListener("click", () => { this.pause(); this.goto(0, true); });
    $("tl-end").addEventListener("click", () => { this.pause(); this.goto(this.model ? this.model.count - 1 : 0, false); });
    $("tl-range").addEventListener("input", (e) => { this.pause(); this.goto(Number(e.target.value), false); });
    $("cam-rot").addEventListener("click", () => { this.world.rot = (this.world.rot + 1) % 4; });
    $("cam-in").addEventListener("click", () => { this.world.zoom = Math.min(2.6, this.world.zoom * 1.15); });
    $("cam-out").addEventListener("click", () => { this.world.zoom = Math.max(0.5, this.world.zoom / 1.15); });
    $("cam-home").addEventListener("click", () => { this.world.zoom = 1; this.world.pan = { x: 0, y: 0 }; this.world.rot = 0; });
    $("dg-objects").addEventListener("change", () => this.renderSide());
    document.querySelectorAll(".tab").forEach((tab) => tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t === tab));
      document.querySelectorAll(".tab-body").forEach((b) => b.classList.toggle("active", b.id === `tab-${tab.dataset.tab}`));
      this.renderSide();
    }));
    window.addEventListener("keydown", (e) => {
      if (e.key === "F10") {
        e.preventDefault();
        this.pause();
        this.goto(this.index + (e.shiftKey ? -1 : 1), !e.shiftKey);
      } else if (e.key === "F5") {
        e.preventDefault();
        this.runCurrent();
      } else if (e.key === " " && document.activeElement === document.body) {
        e.preventDefault();
        if (this.playing) this.pause(); else this.play();
      }
    });
  }

  // -------------------------------------------------------------- levels
  async openLevel(levelId) {
    const status = this.progress.levels[levelId].status;
    if (status === "locked") {
      toast("Ce niveau se débloque quand le précédent est terminé.", "bad");
      return;
    }
    await this.flushSave();
    $("overlay").classList.add("hidden");
    this.mode = null;
    this.model = null;
    this.level = this.levelsById[levelId];
    this.region = this.regionOf[levelId];
    localStorage.setItem("pycraft.level", levelId);
    this.world.setTheme(this.region.theme);
    this.world.hideBoss();
    this.lesson.reset();
    $("where").textContent = `${this.region.name} — ${this.level.number} ${this.level.title}`;
    const saved = await api(`/api/code?level=${levelId}`);
    this.buffers.demo = Object.keys(saved.sandbox || {}).length ? saved.sandbox : { ...this.level.demo };
    this.buffers.mission = Object.keys(saved.code || {}).length ? saved.code : this.starterFiles();
    await this.lesson.loadHints();
    const st = this.progress.levels[levelId];
    let step = "story";
    if (st.status === "completed" || st.status === "mastered") step = "mastery";
    else if (st.mission_passed) step = "quiz";
    else if ((st.steps_seen || []).includes("mission")) step = "mission";
    await this.goStep(step);
  }

  starterFiles() {
    const starter = this.level.starter;
    return starter && Object.keys(starter).length ? { ...starter } : { "main.py": "" };
  }

  nextLevelId(levelId) {
    const order = this.curriculum.order;
    return order[order.indexOf(levelId) + 1] || null;
  }

  async goStep(step) {
    this.step = step;
    const missionSide = ["mission", "quiz", "mastery"].includes(step);
    this.setMode(missionSide ? "mission" : "demo");
    const veiled = ["story", "explain"].includes(step);
    $("editor-veil").classList.toggle("hidden", !veiled);
    $("btn-check").classList.toggle("hidden", step !== "mission");
    try {
      this.progress = await api("/api/step", { level: this.level.id, step });
    } catch (err) {
      toast(err.message, "bad");
    }
    this.updateTopbar();
    if (this.level.boss && step === "mission") {
      this.world.showBoss(this.level.title.replace(/^Boss : /, ""), BOSS_MODELS[this.region.id] || "Zombie", this.level.checks.length);
    } else {
      this.world.hideBoss();
    }
    this.lesson.render();
    document.querySelector('.tab[data-tab="lesson"]').click();
    if (step === "story") this.runDemo(true);
    else if (step === "demo") this.runDemo(false);
    else if (step === "mission" && !this.model) this.clearRun();
  }

  setMode(mode) {
    if (this.mode && this.mode !== "snippet" && this.buffers[this.mode]) this.buffers[this.mode] = this.editor.getFiles();
    this.mode = mode;
    const files = this.buffers[mode] || { "main.py": "" };
    this.editor.setFiles(files, "main.py");
    this.editor.setMarkers({});
    this.editor.setReadOnly(false);
    const label = mode === "mission" ? `Mission : ${this.level.mission_title}` : mode === "demo" ? "Démonstration / essais" : "Extrait du quiz (non sauvegardé)";
    $("editor-label").textContent = label;
    this.renderFileTabs();
  }

  renderFileTabs() {
    const tabs = $("file-tabs");
    tabs.innerHTML = "";
    const names = Object.keys(this.editor.files);
    names.forEach((name) => tabs.append(el("div", {
      class: `file-tab ${name === this.editor.active ? "active" : ""}`,
      onclick: () => this.editor.switchTo(name),
    }, name)));
    if (names.length > 1) {
      $("btn-run").textContent = this.editor.active === "main.py" ? "▶ Exécuter main.py" : `▶ Exécuter ${this.editor.active}`;
    } else {
      $("btn-run").textContent = "▶ Exécuter";
    }
  }

  onEdit(files) {
    if (this.mode === "snippet") return;
    this.buffers[this.mode] = files;
    $("save-state").textContent = "…";
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.flushSave(), 1200);
  }

  async flushSave() {
    if (!this.level || this.mode === "snippet" || !this.saveTimer) return;
    clearTimeout(this.saveTimer);
    this.saveTimer = null;
    try {
      await api("/api/save", { level: this.level.id, files: this.editor.getFiles(), slot: this.mode === "mission" ? "code" : "sandbox" });
      $("save-state").textContent = "Sauvegardé ✓";
    } catch (err) {
      $("save-state").textContent = "Sauvegarde impossible";
    }
  }

  resetCode() {
    if (!confirm("Remettre le code de départ ? Ton code actuel sera remplacé.")) return;
    if (this.mode === "mission") this.buffers.mission = this.starterFiles();
    else this.buffers.demo = { ...this.level.demo };
    this.editor.setFiles(this.buffers[this.mode], "main.py");
    this.onEdit(this.editor.getFiles());
  }

  resetDemo() {
    this.buffers.demo = { ...this.level.demo };
    this.editor.setFiles(this.buffers.demo, "main.py");
    this.onEdit(this.editor.getFiles());
    this.runDemo(false);
  }

  async importFrom(levelId) {
    const saved = await api(`/api/code?level=${levelId}`);
    if (!saved.code || !Object.keys(saved.code).length) {
      toast("Aucun code sauvegardé pour ce niveau.", "bad");
      return;
    }
    const current = (this.editor.getFiles()["main.py"] || "").trim();
    if (current && !current.startsWith("#") && !confirm("Remplacer ton code actuel par celui du niveau précédent ?")) return;
    this.buffers.mission = { ...saved.code };
    this.editor.setFiles(this.buffers.mission, "main.py");
    this.onEdit(this.editor.getFiles());
    toast("Code repris. À toi de l'étendre !");
  }

  async startReview() {
    this.progress = await api("/api/review", { level: this.level.id });
    this.lesson.reset();
    await this.goStep("quiz");
  }

  // ------------------------------------------------------------ execution
  runDemo(autoplay) {
    if (this.mode !== "demo") this.setMode("demo");
    const veiled = this.step === "story" || this.step === "explain";
    this.execute(veiled ? { ...this.level.demo } : this.editor.getFiles(), "main.py", autoplay);
  }

  runCurrent() {
    if (!$("editor-veil").classList.contains("hidden")) {
      this.goStep("demo");
      return;
    }
    const files = this.editor.getFiles();
    this.execute(files, this.editor.active, true);
  }

  clearRun() {
    this.model = null;
    this.pause();
    this.world.setScene(new TraceModel({ steps: [] }, {}).stateAt(-1), {});
    $("event-log").innerHTML = "";
    $("console-out").textContent = "";
    $("console-extra").innerHTML = "";
    $("tl-info").textContent = "";
    this.inspector.render(null);
  }

  async execute(files, entry, autoplay) {
    this.pause();
    $("btn-run").disabled = true;
    try {
      const result = await api("/api/run", { files, entry });
      this.loadResult(result, files, autoplay);
    } catch (err) {
      toast(err.message, "bad");
    } finally {
      $("btn-run").disabled = false;
    }
  }

  loadResult(result, files, autoplay) {
    this.model = new TraceModel(result, files);
    this.files = files;
    this.world.entities.clear();
    this.world.blueprints.clear();
    this.world.signs.clear();
    this.world.effects = [];
    $("tl-range").max = Math.max(0, this.model.count - 1);
    this.renderError(result);
    if (!this.model.count) {
      this.index = -2;
      this.goto(-1, true);
      if (result.error) this.world.animateEvents([{ type: "error" }], this.state);
      return;
    }
    this.index = -1;
    if (autoplay) {
      this.goto(0, true);
      this.play();
    } else {
      this.goto(0, true);
    }
  }

  renderError(result) {
    const box = $("console-extra");
    box.innerHTML = "";
    const markers = { errors: [] };
    if (result.error) {
      const err = result.error;
      const help = err.help || {};
      if (err.line) markers.errors.push({ file: err.file || "main.py", line: err.line, msg: `${err.type}: ${err.message}` });
      box.append(el("div", { class: "card err" },
        el("h4", {}, `💥 ${err.type}${err.line ? ` — ligne ${err.line}${err.file && err.file !== "main.py" ? ` (${err.file})` : ""}` : ""}`),
        el("div", { class: "small muted" }, err.message),
        help.code ? el("pre", {}, help.code) : null,
        el("p", {}, el("b", {}, "Ce qui se passe : "), help.what || ""),
        el("p", {}, el("b", {}, "Pourquoi : "), help.why || ""),
        el("p", {}, el("b", {}, "Piste : "), help.hint || ""),
        err.line ? el("button", { class: "tiny", onclick: () => this.editor.gotoLine(err.file || "main.py", err.line) }, "Aller à la ligne") : null));
    }
    if (result.truncated) box.append(el("div", { class: "card" }, "La visualisation s'est arrêtée après de nombreuses étapes."));
    this.editor.setMarkers(markers);
  }

  play() {
    if (!this.model || !this.model.count) return;
    if (this.index >= this.model.count - 1) this.goto(0, true);
    this.playing = true;
    $("tl-play").textContent = "⏸ Pause";
    const tick = () => {
      if (!this.playing) return;
      if (this.index >= this.model.count - 1) {
        this.pause();
        return;
      }
      this.goto(this.index + 1, true);
      const speed = Number($("tl-speed").value);
      const events = this.model.eventsAt(this.index).length;
      const base = 1150 - speed * 105;
      this.playTimer = setTimeout(tick, base + (events ? base * 0.6 : 0));
    };
    this.playTimer = setTimeout(tick, 250);
  }

  pause() {
    this.playing = false;
    clearTimeout(this.playTimer);
    $("tl-play").textContent = "▶ Lecture";
  }

  goto(index, animate) {
    if (!this.model) return;
    const max = this.model.count - 1;
    const target = Math.max(-1, Math.min(max, index));
    const forward = target === this.index + 1;
    this.index = target;
    const state = this.model.stateAt(target);
    this.state = state;
    this.world.setScene(state, this.model.classes);
    if (animate && forward) this.world.animateEvents(this.model.eventsAt(target), state);
    const step = this.model.steps[target];
    this.editor.setCurrent(step ? { file: step.file, line: step.line } : null);
    $("tl-range").value = Math.max(0, target);
    $("tl-info").textContent = this.model.count
      ? `Étape ${target + 1}/${this.model.count}${step ? ` · ligne ${step.line}${step.file !== "main.py" ? ` (${step.file})` : ""}` : ""}`
      : "Aucune étape (erreur avant l'exécution)";
    this.renderConsole(state);
    this.renderLog(target, state);
    this.renderSide();
  }

  renderConsole(state) {
    const out = $("console-out");
    const all = (this.model.result.output || "").replace(/\n$/, "").split("\n").filter((l, i, arr) => l || i < arr.length - 1);
    const shown = state.output.length;
    out.innerHTML = all.map((line, i) => (i < shown ? esc(line) : `<span class="future">${esc(line)}</span>`)).join("\n");
    $("console-step").textContent = this.model.count && shown < all.length ? "(les lignes grisées s'afficheront plus tard)" : "";
    out.scrollTop = out.scrollHeight;
  }

  renderLog(index, state) {
    const log = $("event-log");
    const rows = [];
    const from = Math.max(-1, index - 6);
    for (let i = from; i <= index; i += 1) {
      const events = this.model.eventsAt(i);
      const step = this.model.steps[i];
      events.forEach((ev) => {
        if (ev.type === "var_set" && (ev.value.t === "class" || ev.value.t === "function")) return;
        const d = describe(ev, state);
        rows.push(`<div class="ev k-${d.k} ${i === index ? "now" : ""}"><span class="ic">${d.ic}</span>${step ? `<span class="muted small">L${step.line}</span> ` : ""}${d.html}</div>`);
      });
    }
    log.innerHTML = rows.join("") || '<div class="ev muted">Pas d\'événement visible à cette étape : Python évalue la ligne.</div>';
    log.scrollTop = log.scrollHeight;
  }

  renderSide() {
    if (!this.model) return;
    const active = document.querySelector(".tab.active").dataset.tab;
    const state = this.state || this.model.stateAt(this.index);
    if (active === "inspector") {
      this.inspector.selected = this.selected;
      this.inspector.render(this.model, state, this.model.steps[this.index]);
    } else if (active === "diagram") {
      renderDiagram($("diagram"), this.model, state, {
        showObjects: $("dg-objects").checked, selected: this.selected, onSelect: (t) => this.select(t),
      });
    }
  }

  select(target) {
    this.selected = target;
    this.world.select(target);
    if (target) document.querySelector('.tab[data-tab="inspector"]').click();
    this.renderSide();
  }

  hover(target, e) {
    const tip = $("tooltip");
    if (!target || !this.state) {
      tip.classList.add("hidden");
      return;
    }
    let html = "";
    if (target.kind === "object") {
      const obj = this.state.objects.get(target.id);
      if (!obj) return;
      html = `<b>${esc(obj.cls)}</b> (objet)<br>` + (Object.entries(obj.attrs).map(([k, v]) => `${k.startsWith("_") ? "🔒 " : ""}${esc(k)} = ${esc(showValue(v))}`).join("<br>") || "<i>aucun attribut</i>");
    } else if (target.kind === "class") {
      const info = this.model.classes[target.id];
      html = `<b>class ${esc(target.id)}</b> (plan)<br>${info.user_bases.length ? `hérite de ${esc(info.user_bases.join(", "))}<br>` : ""}${info.methods.map((m) => `${esc(m.name)}()`).join(", ") || "aucune méthode"}`;
    }
    const r = $("world-wrap").getBoundingClientRect();
    tip.innerHTML = html;
    tip.style.left = `${Math.min(e.clientX - r.left + 14, r.width - 240)}px`;
    tip.style.top = `${e.clientY - r.top + 14}px`;
    tip.classList.remove("hidden");
  }

  async visualizeSnippet(code) {
    if (this.mode !== "snippet") this.buffers[this.mode] = this.editor.getFiles();
    this.mode = "snippet";
    this.editor.setFiles({ "main.py": code }, "main.py");
    $("editor-label").textContent = "Extrait du quiz (non sauvegardé) — ";
    $("editor-label").append(el("button", { class: "tiny", onclick: () => this.goStep(this.step) }, "revenir à ma mission"));
    this.renderFileTabs();
    await this.execute({ "main.py": code }, "main.py", false);
    toast("Avance avec « Pas suivant » (F10) et compare avec ta prédiction.");
  }

  // -------------------------------------------------------------- mission
  async checkMission() {
    if (this.mode !== "mission") await this.goStep("mission");
    await this.flushSave();
    $("btn-check").disabled = true;
    const files = this.editor.getFiles();
    try {
      const res = await api("/api/check", { level: this.level.id, files });
      this.lesson.lastCheck = res;
      this.progress = res.progress;
      this.updateTopbar();
      this.loadResult(res.trace, files, false);
      this.goto(this.model.count - 1, false);
      const warnings = res.results.filter((r) => !r.ok && r.line).map((r) => ({ file: r.file || "main.py", line: r.line, msg: r.message }));
      this.editor.setMarkers({ ...this.editor.markers, warnings });
      if (this.level.boss) {
        this.world.showBoss(this.level.title.replace(/^Boss : /, ""), BOSS_MODELS[this.region.id] || "Zombie", res.results.length);
        res.results.forEach((r, i) => setTimeout(() => this.world.hitBoss(r.ok), 300 + i * 450));
      }
      this.banner(res.passed ? "Mission réussie !" : `${res.results.filter((r) => !r.ok).length} vérification(s) échouée(s)`, !res.passed);
      res.xp_gained.forEach((g) => toast(`+${g.xp} XP — ${g.label}`, "xp"));
      res.rewards.forEach((r) => toast(`🏆 Récompense : ${r}`, "xp"));
      this.lesson.render();
    } catch (err) {
      toast(err.message, "bad");
    } finally {
      $("btn-check").disabled = false;
    }
  }

  banner(text, bad) {
    const b = $("world-banner");
    b.textContent = text;
    b.classList.toggle("bad", !!bad);
    b.classList.remove("hidden");
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => b.classList.add("hidden"), 3500);
  }

  async quality() {
    const res = await api("/api/quality", { files: this.editor.getFiles() });
    const box = $("console-extra");
    box.innerHTML = "";
    const card = el("div", { class: `card ${res.issues.length ? "err" : "ok"}` },
      el("h4", {}, res.issues.length ? `Analyse qualité : ${res.issues.length} remarque(s)` : "Analyse qualité : aucune remarque ✓"));
    const ul = el("ul", { class: "small" });
    res.issues.slice(0, 25).forEach((i) => ul.append(el("li", {},
      el("a", { href: "#", onclick: (e) => { e.preventDefault(); this.editor.gotoLine(i.file, i.line); } }, `${i.file}:${i.line}`),
      ` [${i.code}] ${i.text}`)));
    card.append(ul);
    for (const [name, tool] of Object.entries(res.tools)) {
      if (!tool.available) card.append(el("div", { class: "small muted" }, `${name} n'est pas installé (optionnel) : `, el("code", {}, tool.install)));
      else card.append(el("div", { class: "small" }, el("b", {}, `${name} : `), tool.ok ? "OK" : "problèmes détectés", el("pre", {}, tool.output)));
    }
    box.append(card);
    this.editor.setMarkers({ ...this.editor.markers, warnings: res.issues.map((i) => ({ file: i.file, line: i.line, msg: i.text })) });
  }

  // ------------------------------------------------------------- overlays
  overlay(content) {
    const body = $("overlay-body");
    body.innerHTML = "";
    body.append(content);
    $("overlay").classList.remove("hidden");
  }

  showWelcome() {
    this.overlay(el("div", { class: "md", html: md(`## Bienvenue dans PyCraft

Ici, **chaque ligne de Python que tu écris agit sur un monde**. Les classes apparaissent comme des plans holographiques, les objets comme des créatures, les attributs comme leurs caractéristiques, les méthodes comme leurs actions.

- **À gauche** : l'éditeur Python (Ctrl+Entrée pour exécuter, F10 pour avancer pas à pas).
- **Au centre** : le monde qui rejoue ton programme instruction par instruction.
- **À droite** : le professeur (leçon), l'inspecteur des objets et le diagramme des classes.

Chaque niveau suit 7 étapes : découverte, explication, démonstration, expérimentation, mission, vérification, maîtrise. Le jeu ne te donne jamais la solution : il t'aide à la trouver.

Ta progression est sauvegardée automatiquement.`) }));
  }

  showMap() {
    const wrap = el("div");
    wrap.append(el("h2", {}, "Carte du monde"));
    const grid = el("div", { class: "map-regions" });
    const icon = { mastered: "🏆", completed: "✔", in_progress: "⛏", available: "▶", locked: "🔒" };
    for (const region of this.curriculum.regions) {
      const statuses = region.levels.map((l) => this.progress.levels[l.id].status);
      const locked = statuses.every((s) => s === "locked");
      const card = el("div", { class: `region-card theme-${region.theme} ${locked ? "locked" : ""}` },
        el("h3", {}, region.name), el("div", { class: "sub" }, region.subtitle));
      region.levels.forEach((level) => {
        const st = this.progress.levels[level.id].status;
        card.append(el("div", {
          class: `lvl-node ${st === "locked" ? "locked" : ""}`,
          onclick: () => st !== "locked" && this.openLevel(level.id),
        }, el("span", { class: "ic" }, icon[st]), `${level.number} ${level.title}`, level.boss ? el("span", { class: "boss-tag" }, "BOSS") : null));
      });
      card.append(el("div", { class: "reward" }, `Récompense : ${region.reward}`));
      grid.append(card);
    }
    wrap.append(grid);
    this.overlay(wrap);
  }

  showDashboard() {
    const p = this.progress;
    const wrap = el("div", { class: "dash" });
    wrap.append(el("h2", {}, `Progression — niveau ${p.player_level}, ${p.xp} XP`));
    const counts = Object.values(p.notions).reduce((acc, s) => ({ ...acc, [s]: (acc[s] || 0) + 1 }), {});
    wrap.append(el("div", { class: "legend small" },
      el("span", { class: "notion-chip st-mastered" }, `Maîtrisées : ${counts.mastered || 0}`),
      el("span", { class: "notion-chip st-review" }, `À revoir : ${counts.review || 0}`),
      el("span", { class: "notion-chip st-discovered" }, `Découvertes : ${counts.discovered || 0}`),
      el("span", { class: "notion-chip st-unknown" }, `Pas encore vues : ${counts.unknown || 0}`)));
    const grid = el("div", { class: "dash-grid" });
    const notions = el("div", {}, el("h3", {}, "Notions du programme"));
    const groups = { A: "Structure", B: "POO", C: "Encapsulation", D: "Héritage", E: "Méthodes avancées", F: "Architecture", G: "Qualité" };
    for (const [letter, name] of Object.entries(groups)) {
      const line = el("div", {}, el("div", { class: "small muted" }, `${letter}. ${name}`));
      Object.entries(this.curriculum.notions).filter(([id]) => id.startsWith(letter)).forEach(([id, label]) => {
        line.append(el("span", { class: `notion-chip st-${p.notions[id]}`, title: p.notions[id] }, `${id} ${label}`));
      });
      notions.append(line);
    }
    const table = el("table");
    table.append(el("tr", {}, el("th", {}, "Niveau"), el("th", {}, "État"), el("th", {}, "Essais"), el("th", {}, "Indices"), el("th", {}, "Quiz"), el("th", {}, "XP")));
    for (const id of this.curriculum.order) {
      const lv = this.levelsById[id];
      const st = p.levels[id];
      const quiz = Object.values(st.quiz || {});
      table.append(el("tr", {},
        el("td", {}, `${lv.number} ${lv.title}`), el("td", {}, { mastered: "🏆 maîtrisé", completed: "✔ à revoir", in_progress: "⛏ en cours", available: "▶ disponible", locked: "🔒" }[st.status]),
        el("td", {}, String(st.attempts)), el("td", {}, String(st.hints_used)),
        el("td", {}, quiz.length ? `${quiz.filter((q) => q.first_try).length}/${lv.quiz.length} du 1er coup` : "—"),
        el("td", {}, String(st.xp))));
    }
    grid.append(notions, el("div", {}, el("h3", {}, "Missions"), table));
    wrap.append(grid);
    wrap.append(el("h3", {}, "Récompenses"), el("p", {}, p.rewards.length ? p.rewards.join(" · ") : "Aucune pour l'instant."));
    wrap.append(el("div", { class: "next-row" }, el("button", { class: "tiny", onclick: async () => {
      if (prompt("Tout effacer ? Tape RESET pour confirmer.") !== "RESET") return;
      this.progress = await api("/api/reset", { confirm: "RESET" });
      localStorage.removeItem("pycraft.level");
      location.reload();
    } }, "Réinitialiser toute la progression")));
    this.overlay(wrap);
  }
}

const app = new App();
window.pycraft = app;
app.start().catch((err) => {
  document.body.insertAdjacentHTML("beforeend", `<div class="overlay"><div class="overlay-box"><h2>Impossible de démarrer</h2><p>${esc(err.message)}</p><p>Le serveur Python tourne-t-il ? Lance <code>python3 run.py</code>.</p></div></div>`);
});
void STEPS;
