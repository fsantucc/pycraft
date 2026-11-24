// Cinematics: the story told by the characters of a level, the trailer of
// the game and the finale of the last level all run on this engine.
//
// A cinematic is a list of steps. Each step has a duration, an enter()
// function that puts the world in the state of the beginning of the step
// (scenery, characters, camera…) and timed cues (an attack, a sound, a
// line of dialogue…). Steps never depend on what happened in the step
// before: so the player can go to the next step, back to the previous one,
// pause and resume at any moment without anything firing twice or getting
// out of sync.
//
// Time is the clock of the world: pausing stops the world itself (bubbles,
// effects, characters) and the sound, then everything starts again from
// exactly where it was.
import { sound } from "./sound.js";
import { el } from "./util.js";

export class Cinematic {
  // steps: [{ label, dur, enter(cine), cues: [[ms, fn(cine)]] }]
  // blocking: the lesson waits for the end (first viewing).
  // closable: a ✕ button stops it (replays only).
  // focus: the camera frames the characters of the scene.
  constructor(world, { steps, kind = "story", blocking = false, closable = false, focus = true,
    letterbox = true, onEnd = null, onChange = null, onStop = null, host = null } = {}) {
    this.world = world;
    this.steps = steps;
    this.kind = kind;
    this.blocking = blocking;
    this.closable = closable;
    this.focus = focus;
    this.letterbox = letterbox;
    this.onEnd = onEnd;
    this.onChange = onChange;
    this.onStop = onStop;
    this.host = host;
    this.index = -1;
    this.done = false;
    this.holds = new Set();
  }

  get paused() {
    return this.world.paused;
  }

  info() {
    return { kind: this.kind, blocking: this.blocking, index: this.index, count: this.steps.length,
      paused: this.paused, label: (this.steps[this.index] || {}).label || "" };
  }

  start() {
    const { world } = this;
    if (world.cinematic) world.cinematic.stop();
    world.cinematic = this;
    if (this.focus) world.focusUntil = Infinity;
    sound.capture(true);
    this.buildControls();
    this.keys = (e) => this.onKey(e);
    window.addEventListener("keydown", this.keys, true);
    this.go(0);
    return this;
  }

  // Puts the world at the beginning of step i (or ends the cinematic).
  go(i) {
    if (this.done) return;
    const { world } = this;
    sound.cut();
    world.clearCineFx();
    if (i >= this.steps.length) {
      this.finish();
      return;
    }
    this.index = Math.max(0, i);
    this.t0 = world.now();
    this.fired = 0;
    const step = this.steps[this.index];
    step.cues = (step.cues || []).slice().sort((a, b) => a[0] - b[0]);
    if (step.enter) step.enter(this);
    this.emit();
  }

  // Called by the world at every frame.
  update() {
    if (this.done || this.paused || this.index < 0) return;
    const step = this.steps[this.index];
    const t = this.world.now() - this.t0;
    while (this.fired < step.cues.length && step.cues[this.fired][0] <= t) {
      const cue = step.cues[this.fired];
      this.fired += 1;
      cue[1](this);
    }
    if (this.bar) this.bar.style.width = `${Math.min(100, ((this.index + Math.min(1, t / step.dur)) / this.steps.length) * 100)}%`;
    if (t >= step.dur) this.go(this.index + 1);
  }

  elapsed() {
    return this.world.now() - this.t0;
  }

  next() {
    this.go(this.index + 1);
    if (!this.paused && !this.done) sound.play("tick");
  }

  prev() {
    this.go(this.index - 1);
    if (!this.paused) sound.play("tick");
  }

  pause() {
    if (this.done || this.paused) return;
    this.world.setPaused(true);
    sound.hold(true);
    this.emit();
  }

  resume() {
    if (this.done || !this.paused) return;
    sound.hold(false);
    this.world.setPaused(false);
    this.emit();
  }

  toggle() {
    if (this.paused) this.resume(); else this.pause();
  }

  finish() {
    if (this.done) return;
    this.cleanup();
    if (this.onEnd) this.onEnd();
  }

  // Stopped from outside (another level opened, ✕ pressed…).
  stop() {
    if (this.done) return;
    this.cleanup();
    if (this.onStop) this.onStop();
  }

  cleanup() {
    const { world } = this;
    this.done = true;
    if (this.paused) {
      sound.hold(false);
      world.setPaused(false);
    }
    sound.cut();
    sound.capture(false);
    world.clearCineFx();
    world.camShot = null;
    if (world.cinematic === this) world.cinematic = null;
    if (this.focus) world.focusUntil = world.now() + 700;
    window.removeEventListener("keydown", this.keys, true);
    if (this.controls) this.controls.remove();
    this.emit();
  }

  emit() {
    document.body.classList.toggle("cine-paused", !this.done && this.paused);
    this.refreshControls();
    if (this.onChange) this.onChange(this.done ? null : this.info());
  }

  // Something covers the cinematic (a window, the guided tour): it waits,
  // paused, and leaves the keys alone until it is uncovered — then it goes
  // on from exactly where it was (unless the player had paused it).
  hold(reason, on) {
    if (this.done) return;
    const before = this.holds.size > 0;
    if (on) this.holds.add(reason); else this.holds.delete(reason);
    const after = this.holds.size > 0;
    if (after && !before) {
      this.pausedBefore = this.paused;
      this.pause();
    } else if (!after && before && !this.pausedBefore) {
      this.resume();
    }
  }

  onKey(e) {
    if (this.holds.size) return;
    const typing = ["TEXTAREA", "INPUT"].includes(document.activeElement && document.activeElement.tagName);
    if (typing) return;
    const actions = { ArrowRight: () => this.next(), ArrowLeft: () => this.prev(), " ": () => this.toggle(), k: () => this.toggle() };
    const act = actions[e.key];
    if (!act) {
      if (["F10", "F5", "Enter"].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
      }
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    act();
  }

  // ------------------------------------------------------------ controls
  buildControls() {
    const host = this.host || document.getElementById("world-wrap");
    const btn = (label, title, fn, cls = "") => el("button", { class: `cine-btn ${cls}`, title, onclick: (e) => { e.stopPropagation(); fn(); } }, label);
    this.btnPrev = btn("⏮", "Étape précédente (←)", () => this.prev());
    this.btnPlay = btn("⏸", "Pause / reprise (Espace)", () => this.toggle(), "main");
    this.btnNext = btn("⏭", "Étape suivante (→)", () => this.next());
    this.count = el("span", { class: "cine-count" });
    this.bar = el("span");
    this.controls = el("div", { class: `cine-controls kind-${this.kind}`, onclick: (e) => e.stopPropagation() },
      this.btnPrev, this.btnPlay, this.btnNext,
      el("span", { class: "cine-info" }, this.count, el("span", { class: "cine-track" }, this.bar)),
      this.closable ? btn("✕", "Quitter", () => this.stop(), "close") : null);
    host.append(this.controls);
  }

  refreshControls() {
    if (!this.controls) return;
    this.btnPlay.textContent = this.paused ? "▶" : "⏸";
    this.btnPlay.title = this.paused ? "Reprendre (Espace)" : "Pause (Espace)";
    this.btnPrev.disabled = this.index <= 0;
    this.btnNext.title = this.index >= this.steps.length - 1 ? "Terminer (→)" : "Étape suivante (→)";
    this.count.textContent = `${Math.max(1, this.index + 1)} / ${this.steps.length}${this.paused ? " · en pause" : ""}`;
    this.controls.classList.toggle("paused", this.paused);
  }
}

// ------------------------------------------------------ story cinematic
// The characters of a level tell its story: one line of dialogue per step.
export function lineDuration(text) {
  return Math.max(2200, Math.min(6500, 900 + String(text).length * 40));
}

export function storyCinematic(world, scene, options = {}) {
  const steps = (scene.intro || []).map(([id, text], i) => ({
    label: `Réplique ${i + 1}`,
    dur: lineDuration(text) + (i === scene.intro.length - 1 ? 300 : 0),
    enter: () => {
      world.resetNpcPoses();
      world.npcSay(id, text, { dur: lineDuration(text) + 1200 });
    },
  }));
  return new Cinematic(world, { steps, kind: "story", ...options });
}
