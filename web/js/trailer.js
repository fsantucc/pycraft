// The PyCraft trailer, played the first time the game is launched: the
// journey towards the Heart of the World, in three phases.
//
//   1. The journey (Acts I, II, III): one image per world, fleeting like
//      memories — a blur, a warm light, a drift of the camera — faster and
//      faster.
//   2. The approach (Act IV): the rhythm slows down, the light turns cold
//      and dark, a drone, a distant heartbeat: the end of the road is near.
//   3. The ultimate challenge: a silence in the dark, then the Heart of the
//      World (the same sequence as before: asleep, the four seals, the
//      awakening, the burst), and a question asked to the player.
//
// Along the bottom, the path of the journey: the 13 worlds, act by act,
// leading to the Heart. Nothing of the story or of the exercises is told.
//
// It plays at every launch of the game. The first time, the start card
// invites to discover PyCraft and the trailer cannot be closed; afterwards
// the card welcomes the player back, shows where his game stands, and the
// trailer can be closed at any moment (✕). It runs on the cinematic engine:
// the player can pause it, go back to the previous shot or on to the next
// one (⏮ ⏸ ⏭).
import { Cinematic } from "./cinematic.js";
import { HEART, heartPulse, setHeart } from "./coeur.js";
import { heartSequence } from "./finale.js";
import { sound } from "./sound.js";
import { el } from "./util.js";

// Raised each time the trailer changes: a player who saw an older version
// sees the new one once, at the next launch.
export const TRAILER_VERSION = "6";
export const TRAILER_KEY = "pycraft.trailerSeen";

const ROMAN = ["", "I", "II", "III", "IV"];

// What can happen in a shot (t = the trailer). Flashes of battles in the
// memories.
const attack = (npc, mob, color, big = false) => (t) => t.attack(npc, mob, color, big);
const kill = (mob) => (t) => t.kill(mob);
const boom = (mob) => (t) => t.boom(mob);
const bolt = (mob) => (t) => t.bolt(mob);
const sparkle = () => (t) => t.app.world.celebrate();

// Phase 1 — one memory per world of Acts I, II and III: a level of the world
// (its scenery and characters), a few creatures. dur: ms, shorter and
// shorter (the journey speeds up).
const MEMORIES = [
  { level: "a1l1", title: true, dur: 2600,
    mobs: [{ id: "c1", model: "Cow", s: 21, d: 6, scale: 1.3 }, { id: "s1", model: "Sheep", s: 23.5, d: 8.5, scale: 1.3 }, { id: "p1", model: "Chicken", s: 19, d: 9, scale: 0.9 }] },
  { level: "a2l1", dur: 1450,
    mobs: [{ id: "z1", model: "Zombie", s: 20.5, d: 7.5, scale: 1.3 }, { id: "sp", model: "Spider", s: 23, d: 9, scale: 1.3 }] },
  { level: "r1l2", dur: 1400, mobs: [{ id: "hr", model: "Horse", s: 21, d: 7, scale: 1.3 }] },
  { level: "r2l1", dur: 1350, mobs: [{ id: "pg", model: "Pig", s: 21, d: 6.5, scale: 1.3 }, { id: "bee", model: "Bee", s: 23, d: 9, scale: 1 }] },
  { level: "r3l2", dur: 1300, mobs: [{ id: "g", model: "Golem", s: 21.5, d: 7.5, scale: 1.5 }],
    cues: [[320, attack("seigneur", "g", "#5ee6e0", true)]] },
  { level: "r4l1", dur: 1250, mobs: [{ id: "w", model: "Wither", s: 21.5, d: 7.5, scale: 1.5 }], cues: [[300, bolt("w")]] },
  { level: "r5l2", dur: 1200, mobs: [{ id: "sl", model: "Slime", s: 21, d: 7, scale: 1.3 }, { id: "bt", model: "Bat", s: 23, d: 9, scale: 0.9 }] },
  { level: "r6l4", dur: 1150, mobs: [{ id: "d", model: "Dragon", s: 21, d: 7, scale: 1.4 }],
    cues: [[300, attack("chevalier", "d", "#b8f36b", true)]] },
  { level: "r7l1", dur: 1100, mobs: [{ id: "hr", model: "Horse", s: 21, d: 7, scale: 1.3 }, { id: "sh", model: "Sheep", s: 23, d: 9, scale: 1.3 }],
    cues: [[250, sparkle()]] },
  { level: "x1l6", dur: 1100, mobs: [{ id: "cr", model: "Creeper", s: 21, d: 7.5, scale: 1.3 }, { id: "en", model: "Enderman", s: 23.5, d: 9.5, scale: 1.3 }],
    cues: [[300, boom("cr")], [310, kill("cr")]] },
];

// Phase 2 — the worlds of Act IV, longer, darker, closer.
const APPROACH = [
  { level: "k1l2", dur: 3400, mobs: [{ id: "ca", model: "Cat", s: 21, d: 7, scale: 1 }, { id: "wo", model: "Wolf", s: 23, d: 8.5, scale: 1.3 }] },
  { level: "k2l1", dur: 3800, mobs: [{ id: "en", model: "Enderman", s: 21.5, d: 7.5, scale: 1.3 }, { id: "bt", model: "Bat", s: 23, d: 9, scale: 0.9 }] },
];

// Phase 3 — the last level, the Heart of the World.
const HEART_LEVEL = "k3l1";
const HEART_LEARN = "réunir les quatre actes dans un seul grand programme";
const HEART_WORDS = {
  sleeping: ["", "Et tout au bout du voyage…"],
  seals: ["", "…quatre sceaux attendent d'être rallumés…"],
  awakening: ["", ""],
  // The question comes right after, on its own.
  burst: ["Le Cœur du Monde", ""],
};
const H = [HEART.x, HEART.y, HEART.z];

export class Trailer {
  constructor(app) {
    this.app = app;
    this.root = null;
  }

  // ----- what can happen in a shot
  npc(id) {
    const { world } = this.app;
    if (!world.stage) return null;
    const n = world.stage.npcs.find((x) => x.id === id || x.name.toLowerCase().includes(id));
    return n ? n.id : world.stage.npcs[0].id;
  }

  attack(npcId, mobId, color, big = false) {
    const { world } = this.app;
    const id = this.npc(npcId);
    if (id) world.npcPose(id, "point", 500);
    world.hitMob(mobId, id ? world.npcTop(id) : null, color, big);
    sound.play(big ? "zap" : "blip", { depth: 3, gain: 0.7 });
  }

  bolt(mobId) {
    this.app.world.hitMob(mobId, null, "#fff3a0", true);
    sound.play("zap", { gain: 0.7 });
  }

  boom(mobId) {
    const { world } = this.app;
    world.addEffect({ kind: "explosion", at: world.mobTop(mobId), dur: 1200 });
    world.shakeCamera(8, 400);
    world.flashScreen("rgba(255,200,120,0.35)", 250);
    sound.play("boom", { gain: 0.7 });
  }

  kill(mobId) {
    this.app.world.killMob(mobId);
  }

  fireworks() {
    this.app.world.celebrate();
    sound.play("achievement");
  }

  // ----- screen
  build() {
    this.title = el("div", { class: "tr-title" });
    this.sub = el("div", { class: "tr-sub" });
    this.mapName = el("div", { class: "tr-map-name" });
    this.mapLevel = el("div", { class: "tr-map-level" });
    this.mapLearn = el("div", { class: "tr-learn" });
    this.mapCard = el("div", { class: "tr-map" }, this.mapName, this.mapLevel, this.mapLearn);
    this.worldName = el("div", { class: "tr-world" });
    this.path = this.buildPath();
    this.root = el("div", { class: "trailer" },
      el("div", { class: "tr-caption" }, this.title, this.sub),
      this.mapCard, this.worldName, this.path,
      el("div", { class: "tr-tag" }, "🎬 Aperçu de PyCraft"));
    document.body.append(this.root);
  }

  // The path of the journey: the worlds act by act, then the Heart.
  buildPath() {
    const { regions } = this.app.curriculum;
    this.nodes = [];
    const acts = [];
    for (const region of regions) {
      if (!acts.length || acts[acts.length - 1].act !== region.act) acts.push({ act: region.act, regions: [] });
      acts[acts.length - 1].regions.push(region);
    }
    this.track = el("div", { class: "trp-track" });
    for (const { act, regions: list } of acts) {
      const group = el("div", { class: "trp-act" }, el("div", { class: "trp-act-name" }, `Acte ${ROMAN[act] || act}`));
      const row = el("div", { class: "trp-nodes" });
      for (const region of list) {
        const heart = region.levels.some((l) => l.id === HEART_LEVEL);
        const node = el("div", { class: `trp-node${heart ? " heart" : ""}`, title: region.name });
        this.nodes.push(node);
        row.append(node);
      }
      group.append(row);
      this.track.append(group);
    }
    this.here = el("div", { class: "trp-here" }, "Tu es ici");
    this.goal = el("div", { class: "trp-goal" });
    this.track.append(this.here, this.goal);
    return el("div", { class: "trp" }, this.track);
  }

  // The state of the path at the beginning of a shot.
  // mode: travel (world i), calling (the Heart calls, still unknown),
  // reveal (the Heart is shown), start (the end: you are at the beginning).
  // start: the end of the trailer — world i is where the player is.
  setPath(i, mode = "travel") {
    const last = this.nodes.length - 1;
    this.nodes.forEach((node, j) => {
      node.className = node.className.replace(/ ?(seen|now|calling|revealed|locked|first)/g, "");
      if (mode === "start") {
        if (j < i) node.classList.add("seen");
        if (j === i && j !== last) node.classList.add("now");
        if (j === last) node.classList.add("revealed");
        return;
      }
      if (j < i) node.classList.add("seen");
      if (j === i && j !== last) node.classList.add("now");
      if (j === last && mode === "calling") node.classList.add("calling");
      if (j === last && mode === "reveal") node.classList.add("revealed");
    });
    const at = Math.min(i, last);
    const node = this.nodes[at];
    const box = this.track.getBoundingClientRect();
    const r = node.getBoundingClientRect();
    this.track.style.setProperty("--fill", `${Math.max(0, r.left + r.width / 2 - box.left - 6)}px`);
    this.track.classList.toggle("done", mode === "calling" || mode === "reveal");
    this.here.classList.toggle("show", mode === "start");
    const here = node.getBoundingClientRect();
    this.here.style.left = `${here.left + here.width / 2 - box.left}px`;
    const heart = this.nodes[last].getBoundingClientRect();
    this.goal.style.left = `${heart.left + heart.width / 2 - box.left}px`;
    const locked = mode === "start" && at < last;
    this.goal.textContent = locked ? "🔒 Le Cœur du Monde" : mode === "reveal" || mode === "start" ? "Le Cœur du Monde" : mode === "calling" ? "?" : "";
    this.goal.classList.toggle("show", ["start", "reveal", "calling"].includes(mode) && !(mode === "start" && at === last));
  }

  show(node, text) {
    node.classList.remove("show");
    void node.offsetWidth;
    node.textContent = text;
    if (text) node.classList.add("show");
  }

  card(name, levelLine, learn) {
    this.cardFor = levelLine;
    this.mapCard.classList.remove("show");
    void this.mapCard.offsetWidth;
    this.mapName.textContent = name;
    this.mapLevel.textContent = levelLine;
    this.mapLearn.innerHTML = "";
    this.mapLearn.classList.toggle("hidden", !learn);
    if (learn) this.mapLearn.append(el("b", {}, "📘 Tu y apprends : "), learn);
    this.mapCard.classList.add("show");
  }

  label(text) {
    this.show(this.worldName, text);
  }

  // The index of the world (on the path) of a level.
  worldIndex(levelId) {
    const regions = this.app.curriculum.regions;
    const i = regions.findIndex((r) => r.levels.some((l) => l.id === levelId));
    return Math.max(0, i);
  }

  // The start card. Its click is also what allows the browser to play
  // sound. The first time: discover PyCraft. Afterwards: welcome back, the
  // state of the game, and resume it.
  startCard(first) {
    return new Promise((resolve) => {
      const go = el("button", { class: "mc-btn primary big", onclick: () => { card.remove(); resolve(); } },
        first ? "▶ Découvrir PyCraft" : "▶ Reprendre l'aventure");
      const card = el("div", { class: `tr-start ${first ? "" : "back"}` },
        el("img", { src: "/img/logo.svg", alt: "PyCraft", width: "420" }),
        ...(first
          ? [el("p", {}, "Bienvenue ! Petit aperçu du voyage qui t'attend."), go,
            el("p", { class: "small muted" }, "Pense à monter le son 🔊 · ⏸ pause · ⏮ ⏭ pour revoir ou avancer")]
          : [el("p", { class: "tr-back" }, "Bon retour, aventurier !"), this.saveCard(), go,
            el("p", { class: "small muted" }, "Le voyage défile d'abord · ✕ pour le passer à tout moment · ⏸ ⏮ ⏭")]));
      this.root.append(card);
      go.focus();
    });
  }

  // Where the game of the player stands: his level, his world, his
  // progress on the whole journey.
  saveCard() {
    const { app } = this;
    const level = app.level;
    const region = app.regionOf[level.id];
    const order = app.curriculum.order;
    const done = order.filter((id) => ["completed", "mastered"].includes((app.progress.levels[id] || {}).status)).length;
    return el("div", { class: "tr-save" },
      el("div", { class: "tr-save-head" }, "💾 Ta partie"),
      el("div", { class: "tr-save-level" }, `Niveau ${level.number} · ${level.title}`),
      el("div", { class: "tr-save-region" }, `${region.name} · Acte ${ROMAN[region.act] || region.act} · ${app.progress.xp} XP`),
      el("div", { class: "tr-save-bar", title: `${done} niveaux terminés sur ${order.length}` },
        el("span", { style: `width:${(100 * done) / order.length}%` })),
      el("div", { class: "tr-save-count" }, `${done} / ${order.length} niveaux terminés · le Cœur du Monde t'attend au bout`));
  }

  // ----- places
  // A world of the journey: its theme, the scenery and characters of one of
  // its levels, its creatures. Name tags hidden: only the image.
  enterWorld(levelId, mobs) {
    const { app } = this;
    const { world } = app;
    const level = app.levelsById[levelId];
    const region = app.regionOf[levelId];
    app.clearRun();
    world.hideBoss();
    world.camShot = null;
    world.setTheme(region.theme);
    world.setStage(level.scene, false);
    world.setMobs(mobs || []);
    world.focusUntil = Infinity;
    world.quiet = true;
    return { level, region };
  }

  // The middle of the scene of the current level (characters and props).
  stageCentre() {
    const st = this.app.world.stage;
    const pts = [...st.npcs, ...st.props];
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length + 0.5;
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length + 0.5;
    return [cx, cy];
  }

  // The place of the Heart, at the beginning of each of its steps. card:
  // the card of the level (what is learned there) is shown.
  enterHeart(card) {
    const { app } = this;
    const { world } = app;
    const level = app.levelsById[HEART_LEVEL];
    const region = app.regionOf[HEART_LEVEL];
    app.clearRun();
    world.hideBoss();
    world.setTheme(region.theme);
    world.setStage(level.scene, false);
    world.setMobs([]);
    world.focusUntil = Infinity;
    world.quiet = true;
    sound.lockMood("coeur");
    const line = `Niveau ${level.number} · ${level.title}`;
    if (!card) this.mapCard.classList.remove("show");
    else if (this.cardFor !== line || !this.mapCard.classList.contains("show")) this.card(region.name, line, HEART_LEARN);
  }

  // ----- the three phases
  memorySteps() {
    const { world } = this.app;
    return MEMORIES.map((m, i) => ({
      label: `souvenir ${m.level}`,
      dur: m.dur,
      enter: () => {
        const { region } = this.enterWorld(m.level, m.mobs);
        this.mapCard.classList.remove("show");
        sound.lockMood("voyage");
        sound.hush(0);
        // A memory: a flash of warm light, a blur that clears, the camera
        // drifting sideways (left, right, left…).
        world.setGrade({ kind: "memory", seed: i });
        world.fadeIn(300, "#fff3dc");
        const [cx, cy] = this.stageCentre();
        const side = i % 2 ? 1 : -1;
        world.shot({ at: [cx - side * 0.9, cy + side * 0.9, 0.7], zoom: 1.5 }, { at: [cx + side * 0.9, cy - side * 0.9, 0.7], zoom: 1.68 },
          m.dur, { ease: false });
        this.label(`Acte ${ROMAN[region.act]} · ${region.name}`);
        this.setPath(i, "travel");
        if (m.title) {
          this.show(this.title, "PyCraft");
          this.show(this.sub, "Apprends Python en construisant un monde.");
          sound.play("bell");
        } else {
          this.show(this.title, "");
          this.show(this.sub, "");
          sound.play("whoosh", { gain: 0.45 });
        }
      },
      cues: (m.cues || []).map(([at, fn]) => [at, () => fn(this)]),
    }));
  }

  approachSteps() {
    const { world } = this.app;
    const first = MEMORIES.length;
    return APPROACH.map((m, i) => ({
      label: `approche ${m.level}`,
      dur: m.dur,
      enter: () => {
        const { region } = this.enterWorld(m.level, m.mobs);
        sound.lockMood("approche");
        sound.hush(0);
        // Darker and colder from one world to the next; a slow push in.
        world.setGrade({ kind: "approach", strength: 0.7 + 0.3 * i });
        world.fadeIn(700, "#000");
        const [cx, cy] = this.stageCentre();
        world.shot({ at: [cx + 1.2, cy + 1.2, 1], zoom: 1.25 }, { at: [cx, cy, 0.8], zoom: 1.85 }, m.dur);
        this.label("");
        this.show(this.title, "");
        this.show(this.sub, "");
        this.card(region.name, `Acte ${ROMAN[region.act]} · ${this.app.curriculum.acts[region.act].name.split("—").pop().trim()}`, null);
        this.setPath(first + i, "travel");
        sound.play(i === 0 ? "drone" : "whoosh", { gain: i === 0 ? 1 : 0.5 });
      },
      // Far away, something beats — closer and closer.
      cues: i === 0
        ? [[2300, () => sound.play("heartbeat", { gain: 0.3 })]]
        : [[900, () => sound.play("heartbeat", { gain: 0.4 })], [1700, () => sound.play("riser")],
          [2100, () => sound.play("heartbeat", { gain: 0.55 })], [3100, () => sound.play("heartbeat", { gain: 0.75 })]],
    }));
  }

  // The break: everything stops. Darkness, silence, a heart beating.
  silenceStep() {
    const { world } = this.app;
    const beat = (gain) => () => {
      world.gradePulse();
      sound.play("heartbeat", { gain });
    };
    return {
      label: "silence",
      dur: 2900,
      enter: () => {
        this.enterHeart(false);
        setHeart(world, { awake: 0, seals: 0, beat: 1700 });
        world.setGrade({ kind: "black" });
        world.shot({ at: [H[0] + 1.6, H[1] + 1.6, H[2] - 1], zoom: 1.35 }, null, 10);
        sound.hush(2.7);
        this.label("");
        this.show(this.title, "");
        this.show(this.sub, "");
        this.setPath(this.nodes.length - 1, "calling");
      },
      cues: [[750, beat(0.9)], [1650, beat(1)], [2350, () => sound.play("drone")]],
    };
  }

  heartSteps() {
    const { world } = this.app;
    const say = (title, sub) => {
      world.quiet = true;
      this.show(this.title, title);
      this.show(this.sub, sub);
    };
    const last = this.nodes.length - 1;
    const steps = heartSequence(world, { words: HEART_WORDS, say, pace: 0.8, only: ["sleeping", "seals", "awakening", "burst"] })
      .map((step, i) => ({
        ...step,
        label: step.key,
        enter: (cine) => {
          this.enterHeart(i < 2);
          this.label("");
          this.setPath(last, i < 3 ? "calling" : "reveal");
          step.enter(cine);
        },
      }));
    // The challenge, right after the burst: the light settles on the Heart
    // and the question is asked to the player.
    steps.push({
      label: "défi",
      dur: 5200,
      enter: () => {
        this.enterHeart(false);
        this.label("");
        this.show(this.title, "");
        this.show(this.sub, "");
        this.setPath(last, "reveal");
        setHeart(world, { awake: 1, seals: 4, beat: 1100 });
        // The Heart in the upper part of the screen, the words below it.
        world.shot({ at: [H[0] + 0.8, H[1] + 0.8, H[2] - 3.4], zoom: 1.2 }, { at: [H[0], H[1], H[2] - 3.0], zoom: 1.4 }, 5200);
        world.setChallenge({ lead: ["Mais", "seras-tu", "capable"], line: ["d'atteindre"], name: "Le Cœur du Monde", end: " ?" });
        sound.play("drone");
      },
      cues: [
        [300, () => { heartPulse(world); sound.play("heartbeat", { gain: 0.7 }); }],
        [1500, () => { heartPulse(world); sound.play("heartbeat"); sound.play("chime", { note: 74 }); }],
        [1720, () => sound.play("chime", { note: 81 })],
        [2300, () => sound.play("chime", { note: 86, gain: 0.6 })],
        [3400, () => { heartPulse(world); sound.play("heartbeat", { gain: 0.8 }); }],
      ],
    });
    // Last shot: the whole place, the Heart shining, and the invitation —
    // the path shows where the player starts and where he must go.
    steps.push({
      label: "fin",
      dur: 3600,
      enter: () => {
        this.enterHeart(false);
        this.label("");
        const here = this.first ? 0 : this.worldIndex(this.app.level.id);
        this.setPath(here, "start");
        setHeart(world, { awake: 1, seals: 4, beat: 1000 });
        world.fadeIn(500);
        world.shot({ at: [5, 5, 3], zoom: 0.62 }, { at: [8, 8, 2.4], zoom: 0.56 }, 3600);
        this.show(this.title, "À toi de jouer !");
        this.show(this.sub, this.first ? "Ton aventure commence dans la prairie."
          : `Ton aventure reprend : ${this.app.regionOf[this.app.level.id].name}.`);
        sound.play("achievement");
      },
      cues: [[1100, () => this.fireworks()]],
    });
    return steps;
  }

  // first: the very first launch. launch: played when the game starts (a
  // start card first); otherwise asked with the 🎬 button (no card).
  play({ first = false, launch = false } = {}) {
    const { app } = this;
    const { world } = app;
    this.first = first;
    return new Promise((resolve) => {
      this.build();
      document.body.classList.add("trailer-on");
      if (world.cinematic) world.cinematic.stop();
      app.pause();
      const steps = [...this.memorySteps(), ...this.approachSteps(), this.silenceStep(), ...this.heartSteps()];
      const finish = () => {
        world.trailerActive = false;
        world.camShot = null;
        world.setMobs([]);
        world.hideBoss();
        world.focusUntil = 0;
        sound.lockMood(null);
        sound.hush(0);
        document.body.classList.remove("trailer-on");
        this.root.remove();
        try {
          localStorage.setItem(TRAILER_KEY, TRAILER_VERSION);
        } catch {
          // storage unavailable
        }
        resolve();
      };
      const gate = first || launch ? this.startCard(first) : Promise.resolve();
      gate.then(() => {
        sound.unlock();
        world.trailerActive = true;
        this.cine = new Cinematic(world, {
          steps, kind: "trailer", closable: !first, focus: true, letterbox: true,
          onEnd: finish, onStop: finish,
        }).start();
      });
    });
  }
}
