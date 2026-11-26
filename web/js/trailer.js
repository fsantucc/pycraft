// The PyCraft trailer: 30 seconds at most, played when the game starts.
//
// Fast cuts, one strong image each, almost no words:
//
//   • the opening (the title over the first village);
//   • what you learn — each shot is a line of code typed on screen and its
//     effect on the world: a function lights the lantern in the night, a
//     loop builds a tower, a class brings a flock to life, a boss falls,
//     an exception explodes, a generator lets out its waves;
//   • the progression (worlds, levels, XP — the path fills up);
//   • the secrets (a glimpse, nothing told);
//   • the last level, given more time: its sky, its floating islands, its
//     sleeping Heart, three of its four seals… and a question. Its
//     awakening stays a surprise for the end of the game (see finale.js).
//
// Along the bottom, the path of the journey: the 13 worlds, act by act,
// up to the Heart. Each shot shows its world in the top left corner.
//
// The first time, the start card invites to discover PyCraft and the
// trailer cannot be closed; afterwards the card welcomes the player back
// with his game, and the trailer can be closed at any moment (✕). It runs
// on the cinematic engine: pause, previous / next shot (⏸ ⏮ ⏭).
//
// Every place of the trailer is drawn in advance (the ground of each world)
// while the start card is shown, so that the cuts never stall.
import { Cinematic } from "./cinematic.js";
import { HEART, SEALS, heartPulse, setHeart } from "./coeur.js";
import { sound } from "./sound.js";
import { el } from "./util.js";

// Raised each time the trailer changes: a player who saw an older version
// sees the new one once, at the next launch.
export const TRAILER_VERSION = "7";
export const TRAILER_KEY = "pycraft.trailerSeen";
// The trailer never lasts longer than this (the sum of its shots).
export const TRAILER_MAX_MS = 30000;

const ROMAN = ["", "I", "II", "III", "IV"];
const HEART_LEVEL = "k3l1";
const H = [HEART.x, HEART.y, HEART.z];

// A line of code, as coloured pieces: k keyword, f name called / class,
// v variable, n number, s string, p punctuation.
const CODE = {
  fonctions: [["f", "allumer_lanterne"], ["p", "()"]],
  boucles: [["k", "for "], ["v", "etage "], ["k", "in "], ["f", "range"], ["p", "("], ["n", "5"], ["p", "):"]],
  objets: [["v", "troupeau "], ["p", "= ["], ["f", "Sheep"], ["p", "() "], ["k", "for "], ["v", "_ "], ["k", "in "], ["f", "range"], ["p", "("], ["n", "3"], ["p", ")]"]],
  boss: [["k", "class "], ["f", "Chevalier"], ["p", "("], ["f", "Heros"], ["p", "):"]],
  erreurs: [["k", "raise "], ["f", "TempeteError"], ["p", "("], ["s", "\"orage\""], ["p", ")"]],
  generateurs: [["k", "yield "], ["v", "vague"]],
};

// What each shot teaches: icon, notion, one line.
const SKILLS = {
  fonctions: ["⚡", "Les fonctions", "Ton code allume le monde."],
  boucles: ["🔁", "Les boucles", "Elles bâtissent, étage par étage."],
  objets: ["🧱", "Classes et objets", "Tes plans prennent vie."],
  boss: ["⚔️", "Héritage", "Des boss à vaincre… avec ton code."],
  erreurs: ["💥", "Les exceptions", "Les erreurs, tu les domptes."],
  generateurs: ["♾️", "Les générateurs", "Des vagues sans fin, une à la fois."],
};

// The shots, in order: [key, level of the place, duration in ms].
export const SHOTS = [
  ["ouverture", "a1l1", 2200],
  ["fonctions", "a1l1", 2700],
  ["boucles", "a2l1", 2200],
  ["objets", "r2l1", 2200],
  ["boss", "r6l4", 2200],
  ["erreurs", "x1l6", 2000],
  ["generateurs", "k2l1", 2000],
  ["progression", "r7l1", 2400],
  ["secrets", "k1l1", 2000],
  ["silence", HEART_LEVEL, 1400],
  ["coeur", HEART_LEVEL, 3600],
  ["defi", HEART_LEVEL, 3100],
  ["fin", null, 1600],
];

export class Trailer {
  constructor(app) {
    this.app = app;
    this.root = null;
  }

  // ----- what can happen in a shot
  npc(id) {
    const { world } = this.app;
    if (!world.stage) return null;
    const n = world.stage.npcs.find((x) => x.id === id);
    return n ? n.id : world.stage.npcs[0].id;
  }

  attack(npcId, mobId, color, big = false) {
    const { world } = this.app;
    const id = this.npc(npcId);
    if (id) world.npcPose(id, "point", 500);
    world.hitMob(mobId, id ? world.npcTop(id) : null, color, big);
    sound.play(big ? "zap" : "blip", { depth: 3, gain: 0.7 });
  }

  boom(mobId) {
    const { world } = this.app;
    world.addEffect({ kind: "explosion", at: world.mobTop(mobId), dur: 1200 });
    world.shakeCamera(9, 450);
    world.flashScreen("rgba(255,120,80,0.4)", 260);
    sound.play("boom", { gain: 0.7 });
  }

  fireworks() {
    this.app.world.celebrate();
    sound.play("achievement");
  }

  // The first prop of a type in the scene, and its middle.
  prop(type) {
    const st = this.app.world.stage;
    return st ? st.props.find((p) => p.type === type) : null;
  }

  propAt(type, z = 0.8) {
    const p = this.prop(type);
    return p ? [p.x + 1, p.y + 1, z] : [...this.stageCentre(), z];
  }

  pulse(type, colors = ["#fff3c0", "#f2c14e"]) {
    const { world } = this.app;
    for (const p of world.stage ? world.stage.props.filter((x) => x.type === type) : []) {
      p.pulseAt = world.now();
      world.particles.burst(world.propTop(p), { count: 14, colors, speed: 60, up: 60, gravity: 20, size: 3, glow: true });
    }
  }

  // ----- screen
  build() {
    this.kicker = el("div", { class: "tr-act" });
    this.title = el("div", { class: "tr-title" });
    this.sub = el("div", { class: "tr-sub" });
    this.worldName = el("div", { class: "tr-world" });
    this.codeLine = el("span", { class: "tr-code-line" });
    this.code = el("div", { class: "tr-code" }, el("div", { class: "tr-code-file" }, "main.py"),
      el("div", { class: "tr-code-row" }, el("span", { class: "tr-code-prompt" }, "▶ "), this.codeLine, el("span", { class: "tr-code-caret" })));
    this.stats = el("div", { class: "tr-stats" });
    this.glitch = el("div", { class: "tr-glitch", "data-text": "42" }, "42");
    this.logo = el("div", { class: "tr-logo" }, el("img", { src: "/img/logo.svg", alt: "PyCraft" }));
    this.path = this.buildPath();
    this.root = el("div", { class: "trailer" },
      this.code, this.stats, this.glitch, this.logo,
      el("div", { class: "tr-caption" }, this.kicker, this.title, this.sub),
      this.worldName, this.path,
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

  // The state of the path. mode: travel (world i), calling (the Heart
  // calls, still unknown), start (the end: where the player is, the Heart
  // locked at the end of the road).
  setPath(i, mode = "travel") {
    const last = this.nodes.length - 1;
    this.nodes.forEach((node, j) => {
      node.className = node.className.replace(/ ?(seen|now|calling|revealed|locked|first)/g, "");
      if (j < i) node.classList.add("seen");
      if (j === i && j !== last) node.classList.add("now");
      if (j === last && mode === "calling") node.classList.add("calling");
      if (j === last && mode === "start") node.classList.add("revealed");
    });
    const at = Math.min(i, last);
    const box = this.track.getBoundingClientRect();
    const r = this.nodes[at].getBoundingClientRect();
    this.track.style.setProperty("--fill", `${Math.max(0, r.left + r.width / 2 - box.left - 6)}px`);
    this.track.classList.toggle("done", mode === "calling");
    this.here.classList.toggle("show", mode === "start");
    this.here.style.left = `${r.left + r.width / 2 - box.left}px`;
    const heart = this.nodes[last].getBoundingClientRect();
    this.goal.style.left = `${heart.left + heart.width / 2 - box.left}px`;
    this.goal.textContent = mode === "start" ? "🔒 Le Cœur du Monde" : mode === "calling" ? "?" : "";
    this.goal.classList.toggle("show", mode === "start" || mode === "calling");
  }

  show(node, text) {
    node.classList.remove("show");
    void node.offsetWidth;
    node.textContent = text;
    if (text) node.classList.add("show");
  }

  // The words of a shot: a small kicker, a title, a line.
  say(kicker = "", title = "", sub = "") {
    this.show(this.kicker, kicker);
    this.show(this.title, title);
    this.show(this.sub, sub);
  }

  // A line of code typed on screen.
  typeCode(key) {
    const pieces = CODE[key];
    this.code.classList.remove("show");
    this.codeLine.innerHTML = "";
    if (!pieces) return;
    for (const [cls, text] of pieces) this.codeLine.append(el("span", { class: `tk-${cls}` }, text));
    const n = pieces.reduce((s, [, text]) => s + text.length, 0);
    this.codeLine.style.setProperty("--n", n);
    this.codeLine.style.setProperty("--type-dur", `${Math.min(700, 30 * n + 150)}ms`);
    void this.code.offsetWidth;
    this.code.classList.add("show");
  }

  flashOverlay(node) {
    node.classList.remove("show");
    void node.offsetWidth;
    node.classList.add("show");
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
          ? [el("p", {}, "Bienvenue ! 30 secondes d'aperçu du voyage qui t'attend."), go,
            el("p", { class: "small muted" }, "Pense à monter le son 🔊 · ⏸ pause · ⏮ ⏭ pour revoir ou avancer")]
          : [el("p", { class: "tr-back" }, "Bon retour, aventurier !"), this.saveCard(), go,
            el("p", { class: "small muted" }, "30 secondes d'aperçu · ✕ pour le passer à tout moment · ⏸ ⏮ ⏭")]));
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
  enterWorld(levelId, mobs = []) {
    const { app } = this;
    const { world } = app;
    const level = app.levelsById[levelId];
    const region = app.regionOf[levelId];
    app.clearRun();
    world.hideBoss();
    world.camShot = null;
    world.setTheme(region.theme);
    world.setStage(level.scene, false);
    world.setMobs(mobs);
    world.focusUntil = Infinity;
    world.quiet = true;
    world.setGrade({ kind: "vignette", strength: 0.6 });
    return { level, region };
  }

  stageCentre() {
    const st = this.app.world.stage;
    const pts = [...st.npcs, ...st.props];
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length + 0.5;
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length + 0.5;
    return [cx, cy];
  }

  // A cut: a quick flash, a whoosh, the name of the world in the corner,
  // the path, and a clean screen (no code, no words left from before).
  cut(levelId, { flash = "#ffffff", words = true } = {}) {
    const { world } = this.app;
    world.fadeIn(180, flash);
    sound.play("whoosh", { gain: 0.4 });
    this.code.classList.remove("show");
    this.stats.classList.remove("show");
    this.glitch.classList.remove("show");
    this.logo.classList.remove("show");
    if (words) this.say();
    if (levelId) {
      const region = this.app.regionOf[levelId];
      this.show(this.worldName, `Acte ${ROMAN[region.act] || region.act} · ${region.name}`);
      this.setPath(this.worldIndex(levelId), "travel");
    }
  }

  // ----- the shots
  // Each returns { enter, cues } for its step; enter() rebuilds the whole
  // state of the shot (so ⏮ ⏭ always show the same thing).
  shot(key, levelId) {
    const { world } = this.app;
    const make = {
      ouverture: () => ({
        enter: () => {
          this.enterWorld(levelId, [
            { id: "c1", model: "Cow", ...this.mobAt([1.8, 4.2]), scale: 1.2 },
            { id: "s1", model: "Sheep", ...this.mobAt([3.2, 2.4]), scale: 1.2 },
            { id: "p1", model: "Chicken", ...this.mobAt([2.6, 5.4]), scale: 0.9 }]);
          this.cut(levelId, { flash: "#000000" });
          const [cx, cy] = this.stageCentre();
          world.shot({ at: [cx - 5, cy - 5, 2.5], zoom: 0.62 }, { at: [cx, cy, 0.8], zoom: 1.4 }, 2200);
          this.say("Un jeu pour apprendre Python", "PyCraft", "Apprends Python en construisant un monde.");
          sound.lockMood("voyage");
          sound.hush(0);
          sound.play("bell");
        },
        cues: [[1200, () => world.celebrate()]],
      }),
      fonctions: () => ({
        enter: () => {
          this.enterWorld(levelId, [{ id: "z", model: "Zombie", ...this.mobAt([1.4, 2.6]), scale: 1.15 }]);
          world.setNight(true, false);
          this.cut(levelId, { flash: "#0a0d2e" });
          const lamp = this.propAt("lantern", 1);
          world.shot({ at: [lamp[0] + 0.6, lamp[1] + 1.2, 1.2], zoom: 2.1 }, { at: [lamp[0] + 0.2, lamp[1] + 0.6, 1.0], zoom: 2.35 }, 2700);
          this.typeCode("fonctions");
          this.skill("fonctions");
        },
        cues: [
          [950, () => {
            const p = this.prop("lantern");
            if (p) {
              p.code = { on: true };
              p.litAt = world.now();
            }
            this.pulse("lantern", ["#ffd27a", "#fff3c0", "#ff9a3a"]);
            sound.play("ignite");
            const z = world.mobs.find((m) => m.id === "z");
            if (z) z.fleeing = world.now();
            world.npcPose(this.npc("ancien"), "cheer", 1400);
          }],
          [1500, () => {
            const house = this.prop("house");
            if (house) house.code = { on: true, open: true };
            this.pulse("house");
            sound.play("door");
            world.killMob("z");
          }],
        ],
      }),
      boucles: () => ({
        enter: () => {
          this.enterWorld(levelId);
          this.cut(levelId);
          const tower = this.prop("blocktower");
          if (tower) tower.code = { count: 1 };
          const at = this.propAt("blocktower", 1.4);
          world.shot({ at: [at[0] + 1.5, at[1] + 1.5, 1.0], zoom: 1.7 }, { at: [at[0] + 0.6, at[1] + 0.6, 2.0], zoom: 1.85 }, 2200);
          this.typeCode("boucles");
          this.skill("boucles");
        },
        cues: [450, 700, 950, 1200, 1450].map((t, i) => [t, () => {
          const tower = this.prop("blocktower");
          if (tower) tower.code = { count: i + 2 };
          this.pulse("blocktower", ["#e8d6a0", "#ffffff"]);
          sound.play("build", { gain: 0.6 });
        }]),
      }),
      objets: () => ({
        enter: () => {
          this.enterWorld(levelId);
          this.cut(levelId);
          const [cx, cy] = this.stageCentre();
          world.shot({ at: [cx + 1.6, cy + 1.6, 0.8], zoom: 1.55 }, { at: [cx + 1.0, cy + 1.0, 0.8], zoom: 1.75 }, 2200);
          this.typeCode("objets");
          this.skill("objets");
        },
        cues: [[700, [2.2, 2.0]], [950, [3.2, 3.2]], [1200, [2.0, 4.2]]].map(([t, at], i) => [t, () => {
          world.addMob({ id: `s${i}`, model: "Sheep", scale: 1.1 }, at);
          this.pulse("workbench", ["#b8f36b", "#ffffff"]);
          sound.play("spawn", { gain: 0.7 });
        }]),
      }),
      boss: () => ({
        enter: () => {
          this.enterWorld(levelId, [{ id: "d", model: "Dragon", ...this.mobAt([2.6, 4.4]), scale: 1.5 }]);
          this.cut(levelId);
          const [cx, cy] = this.stageCentre();
          world.shot({ at: [cx + 1.2, cy + 2.2, 1.4], zoom: 1.25 }, { at: [cx + 1.6, cy + 2.6, 1.2], zoom: 1.5 }, 2200);
          this.typeCode("boss");
          this.skill("boss");
        },
        cues: [
          [550, () => this.attack("chevalier", "d", "#b8f36b", true)],
          [1050, () => this.attack("architecte", "d", "#5ee6e0", true)],
          [1500, () => { this.boom("d"); world.killMob("d"); }],
        ],
      }),
      erreurs: () => ({
        enter: () => {
          this.enterWorld(levelId, [{ id: "cr", model: "Creeper", ...this.mobAt([2.4, 1.6]), scale: 1.2 }]);
          this.cut(levelId, { flash: "#2a0808" });
          const at = this.propAt("storm", 1);
          world.shot({ at: [at[0] + 1.6, at[1] + 1.2, 1.2], zoom: 1.6 }, { at: [at[0] + 1.2, at[1] + 0.8, 1.1], zoom: 1.85 }, 2000);
          this.typeCode("erreurs");
          this.skill("erreurs");
        },
        cues: [
          [800, () => {
            this.boom("cr");
            world.killMob("cr");
            this.pulse("storm", ["#ff5a4a", "#ffb08a", "#ffffff"]);
          }],
          [1250, () => this.pulse("sensor", ["#6ad04a", "#ffffff"])],
        ],
      }),
      generateurs: () => ({
        enter: () => {
          this.enterWorld(levelId);
          this.cut(levelId);
          const at = this.propAt("spawner", 1);
          world.shot({ at: [at[0] + 2.2, at[1] + 1.8, 1.0], zoom: 1.45 }, { at: [at[0] + 1.6, at[1] + 1.4, 1.0], zoom: 1.65 }, 2000);
          this.typeCode("generateurs");
          this.skill("generateurs");
        },
        cues: [["Zombie", [0.2, 1.2]], ["Spider", [1.2, 0.4]], ["Creeper", [0.6, 2.2]], ["Zombie", [1.8, 1.6]]]
          .map(([model, at], i) => [450 + i * 300, () => {
            world.addMob({ id: `w${i}`, model, scale: 1 }, at);
            this.pulse("spawner", ["#b48cf2", "#ffffff"]);
            sound.play("spawn", { gain: 0.6 });
          }]),
      }),
      progression: () => ({
        enter: () => {
          this.enterWorld(levelId, [{ id: "hr", model: "Horse", ...this.mobAt([2.4, 4.0]), scale: 1.2 }]);
          this.cut(levelId);
          const [cx, cy] = this.stageCentre();
          world.shot({ at: [12, 12, 1], zoom: 0.62 }, { at: [cx - 2, cy - 2, 1], zoom: 0.95 }, 2400, { ease: false });
          this.say("Ta progression", "Du premier print()…", "…à ton plus grand programme.");
          this.setPath(0, "travel");
          this.counts(0);
          this.flashOverlay(this.stats);
        },
        cues: [
          ...[1, 2, 3, 4, 5, 6].map((k) => [k * 220, () => this.counts(k / 6)]),
          ...this.nodes.slice(0, -1).map((_, i) => [150 + i * 120, () => this.setPath(i, "travel")]),
          ...[[500, "+50 XP", "#b8f36b"], [900, "Niveau 5 !", "#f2c14e"], [1300, "🏆 Région terminée", "#ffd84a"]]
            .map(([t, text, color], i) => [t, () => {
              const st = world.stage;
              const who = st.npcs[i % st.npcs.length];
              world.addEffect({ kind: "float", at: world.npcTop(who.id), text, color, dur: 1600 });
              sound.play(i === 2 ? "achievement" : "xp", { gain: 0.6 });
            }]),
        ],
      }),
      secrets: () => ({
        enter: () => {
          this.enterWorld(levelId);
          world.setNight(true, false);
          this.cut(levelId, { flash: "#000000" });
          const at = this.propAt("bookshelf", 1);
          world.shot({ at: [at[0] + 1.0, at[1] + 1.0, 1.2], zoom: 2.2 }, { at: [at[0] + 0.6, at[1] + 0.6, 1.1], zoom: 2.5 }, 2000);
          this.say("🥚 Les secrets", "Des secrets se cachent partout…", "Clique. Fouille. Ose.");
        },
        cues: [
          [350, () => { this.pulse("bookshelf", ["#d7c0ff", "#b48cf2", "#ffffff"]); sound.play("twinkle", { gain: 0.6 }); }],
          [800, () => { this.flashOverlay(this.glitch); sound.play("zap", { gain: 0.35 }); world.shakeCamera(3, 200); }],
        ],
      }),
      silence: () => ({
        enter: () => {
          this.enterHeart();
          setHeart(world, { awake: 0, seals: 0, beat: 1700 });
          world.setGrade({ kind: "black" });
          world.shot({ at: [H[0] + 1.6, H[1] + 1.6, H[2] - 1], zoom: 1.35 }, null, 10);
          this.cut(null, { flash: "#000000" });
          this.show(this.worldName, "");
          this.setPath(this.nodes.length - 1, "calling");
          sound.lockMood("coeur");
          sound.hush(1.3);
        },
        cues: [[250, () => this.beat(0.9)], [900, () => this.beat(1)]],
      }),
      coeur: () => ({
        enter: () => {
          this.enterHeart();
          setHeart(world, { awake: 0, seals: 0, beat: 1500 });
          world.setGrade({ kind: "vignette", strength: 0.75 });
          world.fadeIn(600, "#000000");
          world.shot({ at: [16, 16, 7], zoom: 0.52 }, { at: [H[0] + 1.2, H[1] + 1.2, H[2] - 0.8], zoom: 1.5 }, 3600);
          this.show(this.worldName, "Le dernier monde");
          this.setPath(this.nodes.length - 1, "calling");
          this.say("", "", "Tout au bout du voyage…");
          sound.play("drone");
        },
        // Three seals light up; the fourth stays dark — for later.
        cues: [
          [500, () => this.beat(0.7)],
          ...[0, 1, 2].map((i) => [1100 + i * 750, () => {
            setHeart(world, { seals: i + 1 });
            world.flashScreen(`${SEALS[i].color}44`, 240);
            sound.play("chime", { note: [72, 76, 79][i] });
            heartPulse(world);
          }]),
        ],
      }),
      defi: () => ({
        enter: () => {
          this.enterHeart();
          setHeart(world, { awake: 0, seals: 3, beat: 1100 });
          world.setGrade({ kind: "vignette", strength: 0.85 });
          world.shot({ at: [H[0] + 0.8, H[1] + 0.8, H[2] - 3.4], zoom: 1.2 }, { at: [H[0], H[1], H[2] - 3.0], zoom: 1.4 }, 3100);
          world.setChallenge({ lead: ["Mais", "seras-tu", "capable"], line: ["d'atteindre"], name: "Le Cœur du Monde", end: " ?" });
          this.say();
          this.show(this.worldName, "");
          this.setPath(this.nodes.length - 1, "calling");
        },
        cues: [
          [250, () => this.beat(0.7)],
          [1500, () => { this.beat(1); sound.play("chime", { note: 74 }); }],
          [1720, () => sound.play("chime", { note: 81 })],
          [2600, () => this.beat(0.8)],
        ],
      }),
      fin: () => ({
        enter: () => {
          const start = this.first ? "a1l1" : this.app.level.id;
          this.enterWorld(start);
          sound.lockMood("voyage");
          world.setChallenge(null);
          const here = this.worldIndex(start);
          const [cx, cy] = this.stageCentre();
          world.shot({ at: [cx - 3, cy - 3, 1.6], zoom: 0.8 }, { at: [cx - 1.5, cy - 1.5, 1.2], zoom: 0.95 }, 1600);
          this.cut(null, { flash: "#ffffff" });
          this.setPath(here, "start");
          this.flashOverlay(this.logo);
          this.say("", "À toi de jouer !", this.first ? "Ton aventure commence dans la prairie."
            : `Ton aventure reprend : ${this.app.regionOf[start].name}.`);
          sound.play("achievement");
        },
        cues: [[400, () => world.celebrate()]],
      }),
    };
    return make[key]();
  }

  // A creature placed on the stage of the scene.
  mobAt(at) {
    const [x, y] = this.app.world.stagePoint(at);
    // setMobs works in (s, d) coordinates: back from (x, y).
    return { s: x + y, d: x - y };
  }

  skill(key) {
    const [icon, name, line] = SKILLS[key];
    this.say(`${icon} Tu apprends`, name, line);
  }

  beat(gain) {
    const { world } = this.app;
    world.gradePulse();
    heartPulse(world);
    sound.play("heartbeat", { gain });
  }

  // The counters of the progression shot (f: 0 → 1).
  counts(f) {
    const { curriculum } = this.app;
    const acts = new Set(curriculum.regions.map((r) => r.act)).size;
    const items = [[acts, "actes"], [curriculum.regions.length, "mondes"], [curriculum.order.length, "niveaux"]];
    this.stats.innerHTML = "";
    for (const [n, label] of items) {
      this.stats.append(el("div", { class: "tr-stat" }, el("b", {}, String(Math.round(n * f))), el("span", {}, label)));
    }
  }

  // The place of the Heart (the last level).
  enterHeart() {
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
  }

  steps() {
    return SHOTS.map(([key, level, dur]) => {
      const { enter, cues } = this.shot(key, level);
      return { label: key, dur, enter, cues };
    });
  }

  // The themes of the places of the trailer (drawn in advance).
  themes() {
    const { app } = this;
    const levels = SHOTS.map(([, level]) => level || (this.first ? "a1l1" : app.level.id));
    return levels.map((id) => app.regionOf[id].theme);
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
      // The ground of every place, drawn in advance (while the start card
      // is read), at a resolution kept modest: 2, or 3 on sharp screens.
      const fit = Math.min(window.innerWidth / 860, window.innerHeight / 560);
      const sharp = world.pixelRatio() * fit * 2 > 4.5 && world.quality.scale >= 1;
      const K = sharp ? 3 : 2;
      world.groundMaxK = K;
      world.prewarmGround(this.themes(), K);
      const steps = this.steps();
      const finish = () => {
        world.trailerActive = false;
        world.camShot = null;
        world.setMobs([]);
        world.hideBoss();
        world.setChallenge(null);
        world.setGrade(null);
        world.focusUntil = 0;
        world.groundMaxK = 4;
        world.groundKeep = 3;
        world.trimGround();
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
