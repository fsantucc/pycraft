// PyCraft — application glue: levels, editor buffers, execution playback.
import { renderDiagram } from "./diagram.js";
import { Editor } from "./editor.js";
import { Inspector } from "./inspector.js";
import { LessonPanel, STEPS } from "./lesson.js";
import { sound } from "./sound.js";
import { storyCinematic } from "./cinematic.js";
import { heartPulse, heartWave, sealInfo, setHeart } from "./coeur.js";
import { finaleCinematic } from "./finale.js";
import { Tour } from "./tour.js";
import { TRAILER_KEY, Trailer } from "./trailer.js";
import { TraceModel, describe } from "./trace.js";
import { api, el, esc, md, pushToast, showValue, toast } from "./util.js";
import { World } from "./world.js";

const $ = (id) => document.getElementById(id);
const BOSS_MODELS = { r1: "Creeper", r2: "Enderman", r3: "Golem", r4: "Wither", r5: "Alchemist", r6: "Dragon", r7: "Castle" };

// Show that a button is working (and block double clicks) until the
// returned function is called.
function busy(button, label) {
  if (!button) return () => {};
  const before = button.innerHTML;
  button.disabled = true;
  button.classList.add("busy");
  button.textContent = label;
  return () => {
    button.disabled = false;
    button.classList.remove("busy");
    if (button.textContent === label) button.innerHTML = before;
  };
}

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
    this.io = { demo: null, mission: null };

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
    this.watchCovers();
    await this.openLevel(target);
    this.startTracking();
    // At every launch: the trailer of the game, then the level starts for
    // real. The first time it cannot be closed; a returning player is
    // welcomed back (his game, his progress) and can close it (✕).
    // ?intro=0 in the address skips it (automated tests).
    let returning = false;
    try {
      returning = !!localStorage.getItem(TRAILER_KEY);
    } catch {
      returning = true;
    }
    returning = returning || this.progress.xp > 0;
    if (new URLSearchParams(location.search).get("intro") !== "0") {
      await this.playTrailer(!returning, true);
    }
    if (!localStorage.getItem("pycraft.welcomed")) {
      localStorage.setItem("pycraft.welcomed", "1");
      this.showWelcome();
    }
  }

  async playTrailer(first = false, launch = false) {
    if (this.trailerPlaying) return;
    this.trailerPlaying = true;
    $("overlay").classList.add("hidden");
    try {
      this.trailer = new Trailer(this);
      await this.trailer.play({ first, launch });
    } finally {
      this.trailerPlaying = false;
      await this.openLevel(this.level.id);
    }
  }

  // ----------------------------------------------------- stats & sounds
  // Play time is counted only while the tab is visible and the player did
  // something in the last 2 minutes (no counting when you walk away).
  startTracking() {
    const d = new Date();
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    this.sendEvent({ kind: "session", date, hour: d.getHours() });
    this.lastActivity = Date.now();
    for (const name of ["keydown", "pointerdown", "wheel"]) {
      window.addEventListener(name, () => { this.lastActivity = Date.now(); }, { passive: true });
    }
    setInterval(() => {
      if (document.hidden || !this.level || Date.now() - this.lastActivity > 120000) return;
      this.sendEvent({ kind: "time", level: this.level.id, seconds: 30 });
    }, 30000);
  }

  sendEvent(payload) {
    api("/api/event", payload).catch(() => {});
  }

  countStep() {
    this.pendingSteps = (this.pendingSteps || 0) + 1;
    clearTimeout(this.stepTimer);
    this.stepTimer = setTimeout(() => {
      this.sendEvent({ kind: "steps", count: this.pendingSteps });
      this.pendingSteps = 0;
    }, 2500);
  }

  onAchievements(list) {
    list.forEach((a, i) => setTimeout(() => {
      sound.play("achievement");
      this.world.celebrate();
      pushToast(el("div", { class: "ach-row" },
        el("div", { class: "ach-icon" }, a.icon),
        el("div", {}, el("div", { class: "ach-title" }, `Succès débloqué : ${a.name}`), el("div", { class: "small" }, a.description))),
      "ach", 5200);
    }, i * 1400));
  }

  updateMuteButton() {
    $("btn-sound").textContent = sound.muted ? "🔇" : "🔊";
    $("btn-sound").title = "Son et musique";
  }

  // Small panel under the 🔊 button: volumes of the effects, the voices of
  // the characters and the music.
  toggleSoundPanel() {
    let panel = document.getElementById("sound-panel");
    if (panel) {
      panel.remove();
      return;
    }
    const st = sound.settings;
    const slider = (key, label, icon) => el("label", { class: "snd-row" },
      el("span", { class: "snd-ic" }, icon), el("span", { class: "snd-lb" }, label),
      el("input", {
        type: "range", min: "0", max: "100", value: String(Math.round(st[key] * 100)),
        oninput: (e) => sound.set(key, Number(e.target.value) / 100),
        onchange: () => sound.play(key === "voice" ? "ask" : key === "music" ? "tick" : "bell"),
      }));
    panel = el("div", { id: "sound-panel", class: "sound-panel", onclick: (e) => e.stopPropagation() },
      el("div", { class: "snd-head" }, el("b", {}, "Son"),
        el("button", { class: "tiny", onclick: () => { sound.setMuted(!sound.muted); this.updateMuteButton(); panel.remove(); this.toggleSoundPanel(); } },
          sound.muted ? "🔇 Son coupé — réactiver" : "🔊 Couper tout")),
      slider("master", "Général", "🎚"),
      slider("sfx", "Effets", "✨"),
      slider("voice", "Voix", "🗣"),
      slider("music", "Musique", "🎵"),
      el("label", { class: "snd-check" }, el("input", {
        type: "checkbox", checked: st.musicOn ? "checked" : null,
        onchange: (e) => sound.set("musicOn", e.target.checked),
      }), " Musique d'ambiance (change selon la région)"),
      el("div", { class: "snd-test" },
        el("button", { class: "tiny", onclick: () => sound.play("victory") }, "▶ Victoire"),
        el("button", { class: "tiny", onclick: () => sound.voice("Bonjour, voyageur ! Tu m'entends ?", { pitch: 170 }) }, "▶ Voix"),
        el("button", { class: "tiny", onclick: () => sound.play("boom") }, "▶ Explosion")));
    document.body.append(panel);
    const r = $("btn-sound").getBoundingClientRect();
    panel.style.top = `${r.bottom + 8}px`;
    panel.style.right = `${Math.max(8, window.innerWidth - r.right)}px`;
    const close = (e) => {
      if (!panel.contains(e.target) && e.target !== $("btn-sound")) {
        panel.remove();
        window.removeEventListener("pointerdown", close);
      }
    };
    window.addEventListener("pointerdown", close);
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
    const left = Math.max(0, p.level_next - p.xp);
    document.querySelector("#topbar .xp").title = `${p.xp} XP au total · encore ${left} XP pour le niveau ${p.player_level + 1}`;
    if (this.lastLevel !== undefined && p.player_level > this.lastLevel) {
      sound.play("levelup");
      toast(`⬆ Niveau ${p.player_level} atteint !`, "xp");
    } else if (this.lastXp !== undefined && p.xp > this.lastXp) {
      sound.play("xp");
    }
    this.lastLevel = p.player_level;
    if (this.lastXp !== undefined && p.xp > this.lastXp) {
      const box = document.querySelector("#topbar .xp");
      box.classList.remove("gain");
      void box.offsetWidth;
      box.classList.add("gain");
    }
    this.lastXp = p.xp;
    const iconOf = {};
    (this.curriculum ? this.curriculum.regions : []).forEach((r) => { iconOf[r.reward] = r.icon; });
    $("rewards").innerHTML = p.rewards.map((r) => `<span title="${esc(r)}">${iconOf[r] || "★"}</span>`).join("");
  }

  readIO() {
    const stdin = $("io-stdin").value.replace(/\r/g, "").split("\n");
    while (stdin.length && stdin[stdin.length - 1] === "") stdin.pop();
    return { stdin, argv: splitArgs($("io-argv").value) };
  }

  writeIO(io) {
    $("io-stdin").value = (io.stdin || []).join("\n");
    $("io-argv").value = (io.argv || []).map((a) => (/\s/.test(a) || a === "" ? `"${a}"` : a)).join(" ");
    const used = (io.stdin && io.stdin.length) || (io.argv && io.argv.length)
      || /input\(|sys\.argv/.test(Object.values(this.editor.files).join("\n"));
    $("io-panel").open = !!used;
    this.updateIOSummary();
  }

  updateIOSummary() {
    const io = this.readIO();
    const parts = [];
    if (io.stdin.length) parts.push(`${io.stdin.length} réponse(s)`);
    if (io.argv.length) parts.push(`${io.argv.length} argument(s)`);
    $("io-summary").textContent = parts.length ? `(${parts.join(", ")})` : "(aucune)";
  }

  // Drag the thin bars between the three panels to resize them. The sizes
  // are remembered; a double click restores the default layout.
  bindGutters() {
    const layout = $("layout");
    const apply = (side, px) => layout.style.setProperty(side === "left" ? "--col-l" : "--col-r", px ? `${px}px` : "");
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem("pycraft.cols") || "{}");
    } catch (err) {
      saved = {};
    }
    for (const side of ["left", "right"]) if (saved[side]) apply(side, saved[side]);
    document.querySelectorAll(".gutter").forEach((gutter) => {
      const side = gutter.dataset.side;
      gutter.addEventListener("dblclick", () => {
        delete saved[side];
        apply(side, 0);
        localStorage.setItem("pycraft.cols", JSON.stringify(saved));
      });
      gutter.addEventListener("pointerdown", (down) => {
        down.preventDefault();
        gutter.setPointerCapture(down.pointerId);
        document.body.classList.add("resizing");
        const box = layout.getBoundingClientRect();
        const move = (e) => {
          const raw = side === "left" ? e.clientX - box.left : box.right - e.clientX;
          const px = Math.round(Math.max(260, Math.min(box.width * 0.45, raw)));
          saved[side] = px;
          apply(side, px);
        };
        const up = () => {
          gutter.removeEventListener("pointermove", move);
          gutter.removeEventListener("pointerup", up);
          document.body.classList.remove("resizing");
          localStorage.setItem("pycraft.cols", JSON.stringify(saved));
        };
        gutter.addEventListener("pointermove", move);
        gutter.addEventListener("pointerup", up);
      });
    });
  }

  bindUi() {
    this.bindGutters();
    $("btn-run").addEventListener("click", () => this.runCurrent());
    $("btn-sound").addEventListener("click", (e) => { e.stopPropagation(); this.toggleSoundPanel(); });
    $("btn-tour").addEventListener("click", () => this.startTour());
    $("btn-trailer").addEventListener("click", () => this.playTrailer(false));
    this.updateMuteButton();
    window.addEventListener("pycraft:achievements", (e) => this.onAchievements(e.detail));
    $("btn-check").addEventListener("click", () => this.checkMission());
    $("btn-quality").addEventListener("click", () => this.quality());
    $("btn-reset-code").addEventListener("click", () => this.resetCode());
    $("btn-map").addEventListener("click", () => this.showMap());
    $("btn-progress").addEventListener("click", () => this.showDashboard());
    $("overlay-close").addEventListener("click", () => $("overlay").classList.add("hidden"));
    $("overlay").addEventListener("click", (e) => { if (e.target.id === "overlay") $("overlay").classList.add("hidden"); });
    $("tl-play").addEventListener("click", () => (this.playing ? this.pause() : this.play()));
    $("tl-step").addEventListener("click", () => { this.pause(); this.goto(this.index + 1, true); this.countStep(); sound.play("tick"); });
    $("tl-back").addEventListener("click", () => { this.pause(); this.goto(this.index - 1, false); this.countStep(); sound.play("tick"); });
    $("tl-start").addEventListener("click", () => { this.pause(); this.goto(0, true); });
    $("tl-end").addEventListener("click", () => { this.pause(); this.goto(this.model ? this.model.count - 1 : 0, false); });
    $("tl-range").addEventListener("input", (e) => { this.pause(); this.goto(Number(e.target.value), false); });
    $("cam-rot").addEventListener("click", () => { this.world.rot = (this.world.rot + 1) % 4; });
    $("cam-in").addEventListener("click", () => { this.world.zoom = Math.min(2.6, this.world.zoom * 1.15); });
    $("cam-out").addEventListener("click", () => { this.world.zoom = Math.max(0.5, this.world.zoom / 1.15); });
    $("cam-home").addEventListener("click", () => { this.world.zoom = 1; this.world.pan = { x: 0, y: 0 }; this.world.rot = 0; });
    $("dg-objects").addEventListener("change", () => this.renderSide());
    for (const id of ["io-stdin", "io-argv"]) {
      $(id).addEventListener("input", () => {
        if (this.mode === "demo" || this.mode === "mission") this.io[this.mode] = this.readIO();
        this.updateIOSummary();
      });
    }
    document.querySelectorAll(".tab").forEach((tab) => tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t === tab));
      document.querySelectorAll(".tab-body").forEach((b) => b.classList.toggle("active", b.id === `tab-${tab.dataset.tab}`));
      this.renderSide();
    }));
    window.addEventListener("keydown", (e) => {
      if (this.world.cinematic || document.body.classList.contains("trailer-on")) {
        // The start card of the trailer: Enter or Space press its button.
        if (document.activeElement && document.activeElement.closest(".tr-start")) return;
        // A cinematic handles its own keys (← ⏸ →); nothing else meanwhile.
        if (["Escape", " ", "F5", "F10", "Enter"].includes(e.key)) e.preventDefault();
        return;
      }
      if (e.key === "Escape" && !$("overlay").classList.contains("hidden") && !document.querySelector(".tour")) {
        e.preventDefault();
        $("overlay").classList.add("hidden");
        return;
      }
      if (e.key === "F10") {
        e.preventDefault();
        this.pause();
        this.goto(this.index + (e.shiftKey ? -1 : 1), !e.shiftKey);
        this.countStep();
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
    if (this.world.cinematic && !this.trailerPlaying) this.world.cinematic.stop();
    this.pause();
    this.mode = null;
    this.model = null;
    this.level = this.levelsById[levelId];
    this.region = this.regionOf[levelId];
    localStorage.setItem("pycraft.level", levelId);
    this.world.setTheme(this.region.theme);
    this.world.hideBoss();
    // The characters and scenery of the story, and the story told by them.
    this.world.setStage(this.level.scene, !!this.progress.levels[levelId].mission_passed);
    if (this.world.theme.coeur) {
      // The Heart of the World: awake once the last mission is done.
      setHeart(this.world, this.progress.levels[levelId].mission_passed ? { awake: 2, seals: 4, beat: 1000 } : { awake: 1, seals: 0, beat: 1300 });
    }
    this.introPlayedFor = null;
    this.lesson.reset();
    $("where").textContent = `${this.region.name} — ${this.level.number} ${this.level.title}`;
    const saved = await api(`/api/code?level=${levelId}`);
    this.buffers.demo = Object.keys(saved.sandbox || {}).length ? saved.sandbox : { ...this.level.demo };
    this.buffers.mission = Object.keys(saved.code || {}).length ? saved.code : this.starterFiles();
    for (const name of this.level.readonly || []) {
      if (this.level.starter[name] !== undefined) this.buffers.mission[name] = this.level.starter[name];
    }
    this.io = {
      demo: { stdin: [...(this.level.demo_stdin || [])], argv: [...(this.level.demo_argv || [])] },
      mission: { stdin: [...(this.level.stdin || [])], argv: [...(this.level.argv || [])] },
    };
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

  // The cinematic of the story of the current level: the characters talk
  // (or, for the last level, the finale).
  playStory({ blocking = false, onEnd = null } = {}) {
    const scene = this.level && this.level.scene;
    if (!scene || !scene.intro || !scene.intro.length || !this.world.stage) return false;
    const passed = !!(this.progress.levels[this.level.id] || {}).mission_passed;
    const options = { blocking, onEnd, passed, onChange: (info) => this.lesson.onCinematic(info) };
    const cine = scene.cinematic === "finale"
      ? finaleCinematic(this.world, scene, options)
      : storyCinematic(this.world, scene, options);
    this.pause();
    cine.start();
    // Started under a window (the welcome, the map…): it waits for it.
    if (!$("overlay").classList.contains("hidden")) cine.hold("overlay", true);
    if (this.tour && this.tour.root) cine.hold("tour", true);
    return true;
  }

  replayStory() {
    if (this.world.cinematic) return;
    this.clearRun();
    this.playStory({ onEnd: () => { if (this.step === "story") this.runDemo(true); } });
  }

  nextLevelId(levelId) {
    const order = this.curriculum.order;
    return order[order.indexOf(levelId) + 1] || null;
  }

  async goStep(step) {
    if (step !== "story" && this.world.cinematic && this.world.cinematic.blocking) {
      toast("Regarde d'abord la scène jusqu'au bout : ⏭ (ou →) pour avancer étape par étape.", "");
      return;
    }
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
    if (this.level.boss && step === "mission" && !this.world.theme.coeur) {
      this.world.showBoss(this.level.title.replace(/^Boss : /, ""), BOSS_MODELS[this.region.id] || "Zombie", this.level.checks.length);
    } else {
      this.world.hideBoss();
    }
    this.lesson.render();
    document.querySelector('.tab[data-tab="lesson"]').click();
    if (step === "story") {
      // First the characters tell the story (a cinematic), then the
      // demonstration plays. The first time, the lesson waits for the end of
      // the cinematic (which can be paused, rewound or advanced step by step).
      const levelId = this.level.id;
      if (this.introPlayedFor !== levelId) {
        this.introPlayedFor = levelId;
        const st = this.progress.levels[levelId] || {};
        const firstTime = !(st.steps_seen || []).includes("explain") && !["completed", "mastered"].includes(st.status);
        this.clearRun();
        const playing = this.playStory({
          blocking: firstTime,
          onEnd: () => {
            if (this.step === "story" && this.level.id === levelId) {
              this.lesson.render();
              this.runDemo(true);
            }
          },
        });
        if (!playing) this.runDemo(true);
      } else {
        this.runDemo(true);
      }
    }
    else if (step === "demo") this.runDemo(false);
    else if (step === "mission" && !this.model) this.clearRun();
  }

  setMode(mode) {
    if (this.mode && this.mode !== "snippet" && this.buffers[this.mode]) this.buffers[this.mode] = this.editor.getFiles();
    this.mode = mode;
    const files = this.buffers[mode] || { "main.py": "" };
    const names = Object.keys(files);
    const first = mode === "mission" ? names.find((n) => !(this.level.readonly || []).includes(n)) || "main.py" : "main.py";
    this.editor.setFiles(files, files[first] !== undefined ? first : names[0]);
    this.editor.setMarkers({});
    if (this.io[mode]) this.writeIO(this.io[mode]);
    const label = mode === "mission" ? `Mission : ${this.level.mission_title}` : mode === "demo" ? "Démonstration / essais" : "Extrait du quiz (non sauvegardé)";
    $("editor-label").textContent = label;
    this.renderFileTabs();
  }

  renderFileTabs() {
    const tabs = $("file-tabs");
    tabs.innerHTML = "";
    const names = Object.keys(this.editor.files);
    const locked = this.mode === "mission" ? this.level.readonly || [] : [];
    names.forEach((name) => tabs.append(el("div", {
      class: `file-tab ${name === this.editor.active ? "active" : ""}`,
      title: locked.includes(name) ? "Fichier verrouillé : c'est le testeur, il appelle ta fonction" : "",
      onclick: () => this.editor.switchTo(name),
    }, name, locked.includes(name) ? el("span", { class: "lock-ic" }, "🔒") : null)));
    this.editor.setReadOnly(locked.includes(this.editor.active));
    if (names.length > 1) {
      const viaHelper = (this.level.readonly || []).includes("main.py");
      $("btn-run").textContent = viaHelper || this.editor.active === "main.py" ? "▶ Exécuter main.py" : `▶ Exécuter ${this.editor.active}`;
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
    const helper = this.mode !== "snippet" && (this.level.readonly || []).includes("main.py") && files["main.py"] ? "main.py" : null;
    this.execute(files, helper || this.editor.active, true, true);
  }

  clearRun() {
    this.model = null;
    this.world.emptyHint = true;
    this.pause();
    this.world.setScene(new TraceModel({ steps: [] }, {}).stateAt(-1), {});
    $("event-log").innerHTML = "";
    $("console-out").textContent = "";
    $("console-extra").innerHTML = "";
    $("tl-info").textContent = "";
    this.inspector.render(null);
  }

  // byPlayer: the player pressed Exécuter (only those runs count in the
  // statistics, not the automatic replays of the demonstration).
  async execute(files, entry, autoplay, byPlayer = false) {
    this.pause();
    const done = busy($("btn-run"), "⏳ Exécution…");
    try {
      const io = this.mode === "snippet" ? (this.snippetIO || { stdin: [], argv: [] }) : this.readIO();
      const level = this.mode === "snippet" ? undefined : this.level && this.level.id;
      const result = await api("/api/run", { files, entry, stdin: io.stdin, argv: io.argv, level, track: byPlayer });
      this.world.unfocus();
      this.loadResult(result, files, autoplay);
      if (this.mode !== "snippet") this.world.npcArgv(io.argv);
    } catch (err) {
      toast(err.message, "bad");
    } finally {
      done();
    }
  }

  loadResult(result, files, autoplay) {
    this.model = new TraceModel(result, files);
    // The "things will appear here" caption is only for an empty world.
    this.world.emptyHint = !this.model.count;
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
      // Guided explanation: one question at a time, from general to
      // precise. The answer (the corrected code) is never given.
      const questions = help.questions && help.questions.length ? help.questions : [help.hint || ""];
      let shown = 1;
      const list = el("ol", { class: "guide-q" });
      const more = el("button", { class: "tiny" });
      const renderQuestions = () => {
        list.innerHTML = "";
        questions.slice(0, shown).forEach((q) => list.append(el("li", { html: md(q).replace(/^<p>|<\/p>$/g, "") })));
        more.textContent = `Une autre question (${questions.length - shown})`;
        more.classList.toggle("hidden", shown >= questions.length);
      };
      more.addEventListener("click", () => { shown += 1; renderQuestions(); sound.play("click"); });
      renderQuestions();
      const suspects = help.suspects || [];
      const showOnMap = () => {
        if (this.model && this.model.count) {
          this.pause();
          this.goto(Math.max(0, this.model.count - 1), false);
        }
        const found = this.world.spotlight(suspects);
        this.sendEvent({ kind: "spot" });
        if (err.line) this.editor.gotoLine(err.file || "main.py", err.line);
        if (!found) toast("Rien de visible sur la carte pour cette erreur : regarde la ligne surlignée.", "");
        else sound.play("spot");
      };
      box.append(el("div", { class: "card err" },
        el("h4", {}, `💥 ${err.type}${err.line ? ` — ligne ${err.line}${err.file && err.file !== "main.py" ? ` (${err.file})` : ""}` : ""}`),
        el("div", { class: "small muted" }, err.message),
        help.code ? el("pre", {}, help.code) : null,
        el("p", {}, el("b", {}, "Ce qui se passe : "), help.what || ""),
        el("p", {}, el("b", {}, "Pourquoi : "), help.why || ""),
        el("div", { class: "guide" }, el("b", {}, "🧭 Questions pour te guider"), list, more),
        help.experiment ? el("p", { class: "small" }, el("b", {}, "🔬 Expérience : "), help.experiment) : null,
        el("div", { class: "row-btns" },
          suspects.length ? el("button", { class: "tiny", onclick: showOnMap }, "🔎 Montrer sur la carte") : null,
          err.line ? el("button", { class: "tiny", onclick: () => this.editor.gotoLine(err.file || "main.py", err.line) }, "Aller à la ligne") : null)));
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
      if (!this.playing || !this.model) return;
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
    const stepNow = this.model.steps[target];
    this.world.setScene(state, this.model.classes, stepNow ? stepNow.locals : [], stepNow ? stepNow.func : "");
    if (animate && forward) this.world.animateEvents(this.model.eventsAt(target), state);
    const step = this.model.steps[target];
    if (step && step.file !== this.editor.active && this.editor.files[step.file] !== undefined) {
      this.editor.switchTo(step.file);
    }
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
    if (target && (target.kind === "heart" || target.kind === "seal")) {
      heartPulse(this.world);
      sound.play(target.kind === "heart" ? "heartbeat" : "chime", { note: 72 + (target.id || 0) * 4 });
      return;
    }
    if (target && target.kind === "npc") {
      // Clicking a character of the story: he tells his story again.
      if (!this.world.cinematic) this.replayStory();
      return;
    }
    this.selected = target;
    this.world.select(target);
    if (target) document.querySelector('.tab[data-tab="inspector"]').click();
    this.renderSide();
  }

  hover(target, e) {
    const tip = $("tooltip");
    if (!target || (!this.state && !["npc", "heart", "seal"].includes(target.kind))) {
      tip.classList.add("hidden");
      return;
    }
    let html = "";
    if (target.kind === "heart") {
      html = "<b>Le Cœur du Monde</b><br><i>Il bat. Clique pour l'écouter.</i>";
    } else if (target.kind === "seal") {
      html = `<b>${esc(sealInfo(target.id))}</b><br><i>Un des quatre sceaux du Cœur.</i>`;
    } else if (target.kind === "npc") {
      const npc = this.world.stageNpc(target.id);
      html = `<b>${esc(npc ? npc.name : "")}</b><br>Personnage de l'histoire.<br><i>Clique pour réécouter ce qu'il dit.</i>`;
    } else if (target.kind === "object") {
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

  async visualizeSnippet(code, stdin = []) {
    if (this.mode !== "snippet") this.buffers[this.mode] = this.editor.getFiles();
    this.mode = "snippet";
    this.snippetIO = { stdin, argv: [] };
    this.writeIO(this.snippetIO);
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
    const done = [$("btn-check"), ...document.querySelectorAll(".js-check")].map((b) => busy(b, "⏳ Vérification…"));
    const files = this.editor.getFiles();
    try {
      const io = this.readIO();
      const res = await api("/api/check", { level: this.level.id, files, stdin: io.stdin, argv: io.argv });
      this.lesson.lastCheck = res;
      this.progress = res.progress;
      this.updateTopbar();
      this.loadResult(res.trace, files, false);
      this.goto(this.model.count - 1, false);
      const warnings = res.results.filter((r) => !r.ok && r.line).map((r) => ({ file: r.file || "main.py", line: r.line, msg: r.message }));
      this.editor.setMarkers({ ...this.editor.markers, warnings });
      if (this.world.theme.coeur) {
        // The checks light the four seals; success wakes the Heart.
        const ok = res.results.filter((r) => r.ok).length;
        const seals = res.passed ? 4 : Math.min(3, Math.floor((4 * ok) / Math.max(1, res.results.length)));
        setHeart(this.world, res.passed ? { awake: 2, seals: 4, beat: 1000 } : { awake: 1, seals });
        if (res.passed) {
          heartWave(this.world);
          this.world.shakeCamera(10, 700);
          sound.play("impact");
        } else {
          heartPulse(this.world);
          sound.play("heartbeat");
        }
      } else if (this.level.boss) {
        this.world.showBoss(this.level.title.replace(/^Boss : /, ""), BOSS_MODELS[this.region.id] || "Zombie", res.results.length);
        res.results.forEach((r, i) => setTimeout(() => this.world.hitBoss(r.ok), 300 + i * 450));
      }
      this.banner(res.passed ? "Mission réussie !" : `${res.results.filter((r) => !r.ok).length} vérification(s) échouée(s)`, !res.passed);
      sound.play(res.passed ? "victory" : "fail");
      if (res.passed) this.world.celebrate();
      this.world.unfocus();
      this.world.npcReact(res.passed);
      res.xp_gained.forEach((g) => toast(`+${g.xp} XP — ${g.label}`, "xp"));
      res.rewards.forEach((r) => toast(`🏆 Récompense : ${r}`, "xp"));
      this.lesson.render();
    } catch (err) {
      toast(err.message, "bad");
    } finally {
      done.forEach((restore) => restore());
    }
  }

  banner(text, bad) {
    const b = $("world-banner");
    b.innerHTML = "";
    b.append(el("span", { class: "wb-icon" }, bad ? "⚠" : "🏆"), el("span", {}, text));
    b.classList.toggle("bad", !!bad);
    b.classList.remove("hidden", "show");
    void b.offsetWidth;
    b.classList.add("show");
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => b.classList.add("hidden"), 3200);
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
    if ($("overlay").classList.contains("hidden")) sound.play("page");
    $("overlay").classList.remove("hidden");
  }

  showWelcome() {
    this.overlay(el("div", { class: "md", html: '<img src="/img/logo.svg" alt="PyCraft" width="420">' + md(`## Bienvenue dans PyCraft

Ici, **chaque ligne de Python que tu écris agit sur un monde**. Les classes apparaissent comme des plans holographiques, les objets comme des créatures, les attributs comme leurs caractéristiques, les méthodes comme leurs actions.

- **À gauche** : l'éditeur Python (Ctrl+Entrée pour exécuter, F10 pour avancer pas à pas).
- **Au centre** : le monde qui rejoue ton programme instruction par instruction.
- **À droite** : le professeur (leçon), l'inspecteur des objets et le diagramme des classes.

Chaque niveau suit 7 étapes : découverte, explication, démonstration, expérimentation, mission, vérification, maîtrise. Le jeu ne te donne jamais la solution : il t'aide à la trouver.

Ta progression est sauvegardée automatiquement.`) },
    el("div", { class: "row-btns center" },
      el("button", { class: "mc-btn primary", onclick: () => { $("overlay").classList.add("hidden"); this.startTour(); } }, "🧭 Visite guidée (30 s)"),
      el("button", { class: "mc-btn", onclick: () => $("overlay").classList.add("hidden") }, "Je connais déjà"))));
  }

  renderStats(st) {
    const dur = (sec) => {
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      return h ? `${h} h ${String(m).padStart(2, "0")}` : `${m} min`;
    };
    const box = el("div", { class: "stats" });
    const tiles = [
      ["⏱", dur(st.total_time), "de jeu"], ["▶", st.runs, "exécutions"], ["🐛", st.errors, "erreurs rencontrées"],
      ["🔧", st.fixed, "erreurs corrigées"], ["🧠", st.no_hint, "missions sans indice"], ["🎯", st.first_try, "du premier coup"],
      ["🔍", st.steps, "pas à pas"], ["📅", st.days, "jour(s) de jeu"],
    ];
    box.append(el("div", { class: "stat-tiles" }, tiles.map(([icon, value, label]) =>
      el("div", { class: "stat-tile" }, el("div", { class: "stat-icon" }, icon), el("div", { class: "stat-value" }, String(value)), el("div", { class: "small muted" }, label)))));
    const maxNotion = Math.max(1, ...st.per_notion.map((n) => n.seconds));
    const bars = el("div", { class: "bars" }, el("h3", {}, "Temps par notion"),
      st.per_notion.length ? st.per_notion.map((n) => el("div", { class: "bar-row" },
        el("span", { class: "bar-label small", title: n.name }, `${n.id} ${n.name}`),
        el("span", { class: "bar" }, el("span", { class: "bar-fill", style: `width:${(100 * n.seconds) / maxNotion}%` })),
        el("span", { class: "small muted" }, dur(n.seconds))))
        : el("p", { class: "muted small" }, "Le temps passé sur chaque notion apparaîtra ici."));
    const errs = el("div", { class: "bars" }, el("h3", {}, "Tes erreurs les plus fréquentes"),
      st.error_types.length ? st.error_types.slice(0, 6).map(([type, n]) => el("div", { class: "bar-row" },
        el("span", { class: "bar-label small" }, type),
        el("span", { class: "bar" }, el("span", { class: "bar-fill err", style: `width:${(100 * n) / st.error_types[0][1]}%` })),
        el("span", { class: "small muted" }, `×${n}`)))
        : el("p", { class: "muted small" }, "Aucune erreur pour l'instant… ça viendra !"));
    box.append(el("div", { class: "dash-grid" }, bars, errs));
    box.append(el("h3", {}, `Succès ${st.unlocked}/${st.total}`),
      el("div", { class: "ach-grid" }, st.achievements.map((a) => el("div", { class: `ach-card ${a.unlocked ? "on" : "off"}`, title: a.description },
        el("div", { class: "ach-icon" }, a.icon),
        el("div", {}, el("div", { class: "ach-title" }, a.name), el("div", { class: "small muted" }, a.description))))));
    return box;
  }

  startTour() {
    $("overlay").classList.add("hidden");
    if (!this.tour) {
      this.tour = new Tour({
        onDone: () => { this.sendEvent({ kind: "tour" }); sound.play("victory"); },
        onSound: () => sound.play("click"),
      });
      this.tour.onStop = () => this.holdCinematic("tour", false);
    }
    this.tour.start();
    this.holdCinematic("tour", true);
  }

  // A window or the guided tour covers the world: the cinematic waits.
  holdCinematic(reason, on) {
    if (this.world.cinematic) this.world.cinematic.hold(reason, on);
  }

  watchCovers() {
    const box = $("overlay");
    const sync = () => this.holdCinematic("overlay", !box.classList.contains("hidden"));
    new MutationObserver(sync).observe(box, { attributes: true, attributeFilter: ["class"] });
  }

  showMap() {
    const wrap = el("div");
    wrap.append(el("h2", {}, "Carte du monde"));
    let grid = null;
    let act = null;
    const icon = { mastered: "🏆", completed: "✔", in_progress: "⛏", available: "▶", locked: "🔒" };
    for (const region of this.curriculum.regions) {
      if (region.act !== act) {
        act = region.act;
        const info = this.curriculum.acts[act] || {};
        wrap.append(el("div", { class: "act-head" }, el("h3", {}, info.name || `Acte ${act}`),
          el("div", { class: "muted" }, `${info.subject || ""} — ${info.summary || ""}`)));
        grid = el("div", { class: "map-regions" });
        wrap.append(grid);
      }
      const statuses = region.levels.map((l) => this.progress.levels[l.id].status);
      const locked = statuses.every((s) => s === "locked");
      const card = el("div", { class: `region-card theme-${region.theme} ${locked ? "locked" : ""}` },
        el("h3", {}, region.name), el("div", { class: "sub" }, region.subtitle));
      region.levels.forEach((level) => {
        const st = this.progress.levels[level.id].status;
        const current = this.level && this.level.id === level.id;
        card.append(el("div", {
          class: `lvl-node st-${st} ${st === "locked" ? "locked" : ""} ${current ? "current" : ""}`,
          title: st === "locked" ? "Termine le niveau précédent pour débloquer celui-ci" : "Ouvrir ce niveau",
          onclick: () => st !== "locked" && this.openLevel(level.id),
        }, el("span", { class: "ic" }, icon[st]), el("span", { class: "lvl-name" }, `${level.number} ${level.title}`),
        level.boss ? el("span", { class: "boss-tag" }, "BOSS") : null,
        current ? el("span", { class: "here" }, "tu es ici") : null));
      });
      const doneCount = statuses.filter((x) => x === "completed" || x === "mastered").length;
      card.insertBefore(el("div", { class: "region-progress", title: `${doneCount}/${statuses.length} niveaux terminés` },
        el("span", { style: `width:${100 * doneCount / statuses.length}%` })), card.children[2] || null);
      card.append(el("div", { class: "reward" }, `${region.icon} Récompense : ${region.reward}`));
      grid.append(card);
    }
    this.overlay(wrap);
    const here = wrap.querySelector(".lvl-node.current");
    if (here) here.scrollIntoView({ block: "center" });
  }

  async showDashboard() {
    const p = this.progress;
    const wrap = el("div", { class: "dash" });
    wrap.append(el("h2", {}, `Progression — niveau ${p.player_level}, ${p.xp} XP`));
    try {
      wrap.append(this.renderStats(await api("/api/stats")));
    } catch (err) {
      wrap.append(el("p", { class: "muted small" }, `Statistiques indisponibles : ${err.message}`));
    }
    const counts = Object.values(p.notions).reduce((acc, s) => ({ ...acc, [s]: (acc[s] || 0) + 1 }), {});
    wrap.append(el("div", { class: "legend small" },
      el("span", { class: "notion-chip st-mastered" }, `Maîtrisées : ${counts.mastered || 0}`),
      el("span", { class: "notion-chip st-review" }, `À revoir : ${counts.review || 0}`),
      el("span", { class: "notion-chip st-discovered" }, `Découvertes : ${counts.discovered || 0}`),
      el("span", { class: "notion-chip st-unknown" }, `Pas encore vues : ${counts.unknown || 0}`)));
    const grid = el("div", { class: "dash-grid" });
    const notions = el("div", {}, el("h3", {}, "Notions du programme"));
    const groups = { H: "Fondamentaux (python00)", A: "Structure (python01)", B: "POO", C: "Encapsulation", D: "Héritage",
      E: "Méthodes avancées", F: "Architecture", G: "Qualité", X: "Exceptions (python02)", K: "Collections (python03)" };
    for (const [letter, name] of Object.entries(groups)) {
      const line = el("div", {}, el("div", { class: "small muted" }, `${letter}. ${name}`));
      Object.entries(this.curriculum.notions).filter(([id]) => id[0] === letter).forEach(([id, label]) => {
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

function splitArgs(text) {
  const args = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let m;
  while ((m = re.exec(text)) !== null) args.push(m[1] ?? m[2] ?? m[3]);
  return args;
}

const app = new App();
window.pycraft = app;
app.start().catch((err) => {
  document.body.insertAdjacentHTML("beforeend", `<div class="overlay"><div class="overlay-box"><h2>Impossible de démarrer</h2><p>${esc(err.message)}</p><p>Le serveur Python tourne-t-il ? Lance <code>python3 run.py</code>.</p></div></div>`);
});
void STEPS;
