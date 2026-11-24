// The PyCraft trailer, played the first time the game is launched: a fast
// tour of the maps, their characters and their creatures, a few attacks and
// a few achievements — without telling the story or the lessons (no
// spoilers). It runs on the real world engine.
//
// It cannot be skipped; it is short and already played fast. Watched again
// later (🎬 button), it can be closed.
import { sound } from "./sound.js";
import { el } from "./util.js";

// Raised each time the trailer changes: a player who saw an older version
// sees the new one once, at the next launch.
export const TRAILER_VERSION = "3";
export const TRAILER_KEY = "pycraft.trailerSeen";
const MIN_SHOT = 3000; // ms: the shortest shot, to read the card

// One shot = a map (theme + the characters of one of its scenes), some
// creatures, and what happens: attacks, achievements. Times are in ms.
// learn: what the player learns in the level shown (displayed on screen).
const SHOTS = [
  { level: "a1l1", map: "PyCraft", learn: "créer et appeler tes premières fonctions, afficher avec print()", title: true, hold: 2600,
    mobs: [{ id: "c1", model: "Cow", s: 21, d: 6, scale: 1.3 }, { id: "s1", model: "Sheep", s: 23.5, d: 8.5, scale: 1.3 }, { id: "p1", model: "Chicken", s: 19, d: 9, scale: 0.91 }],
    play: async (t) => { await t.wait(600); t.cheer(); } },
  { level: "a1l3", map: "La Prairie", learn: "poser des questions avec input(), convertir avec int(), calculer", hold: 1500,
    mobs: [{ id: "h1", model: "Horse", s: 21, d: 7, scale: 1.3 }],
    play: async (t) => { await t.wait(500); t.achieve(); } },
  { level: "a2l1", map: "Les Mines", learn: "répéter des actions avec les boucles for et while", hold: 1200,
    mobs: [{ id: "z1", model: "Zombie", s: 20.5, d: 7.5, scale: 1.3 }, { id: "sp", model: "Spider", s: 23, d: 9, scale: 1.3 }],
    play: async (t) => {
      await t.wait(500);
      t.attack("mineur", "z1", "#ffd84a");
      await t.wait(380);
      t.attack("mineur", "z1", "#ffd84a", true);
      await t.wait(300);
      t.kill("z1");
      await t.wait(300);
      t.attack("mineur", "sp", "#9fdcff", true);
      await t.wait(300);
      t.kill("sp");
    } },
  { level: "r2l1", map: "L'Atelier", learn: "créer des classes et des objets, chacun avec ses attributs", hold: 1300,
    mobs: [{ id: "pg", model: "Pig", s: 21, d: 6.5, scale: 1.3 }, { id: "bee", model: "Bee", s: 23, d: 9, scale: 1.04 }],
    play: async (t) => { await t.wait(600); t.achieve(); } },
  { level: "r3l2", map: "La Citadelle", learn: "protéger les données d'un objet : setters et validation", hold: 1300,
    mobs: [{ id: "g", model: "Golem", s: 21.5, d: 7.5, scale: 1.56 }],
    play: async (t) => {
      await t.wait(450);
      t.attack("seigneur", "g", "#5ee6e0");
      await t.wait(350);
      t.attack("apprenti", "g", "#f2c14e", true);
      await t.wait(400);
      t.kill("g");
      t.achieve();
    } },
  { level: "r4l1", map: "La Forge", learn: "l'héritage : des familles de classes parent / enfant", hold: 1300,
    mobs: [{ id: "w", model: "Wither", s: 21.5, d: 7.5, scale: 1.56 }],
    play: async (t) => {
      await t.wait(400);
      t.bolt("w");
      await t.wait(300);
      t.attack("forgeron", "w", "#ff8a2a", true);
      await t.wait(350);
      t.boom("w");
      t.kill("w");
    } },
  { level: "r5l2", map: "Le Laboratoire", learn: "les @classmethod : d'autres façons de fabriquer un objet", hold: 1300,
    mobs: [{ id: "sl", model: "Slime", s: 21, d: 7, scale: 1.3 }, { id: "bt", model: "Bat", s: 23, d: 9, scale: 0.91 }],
    play: async (t) => {
      await t.wait(500);
      t.attack("alchimiste", "sl", "#e05ad0");
      sound.play("twinkle");
      await t.wait(400);
      t.kill("sl");
      t.achieve();
    } },
  { level: "r6l4", map: "La Tour", learn: "le polymorphisme et des objets qui interagissent entre eux", hold: 1400,
    mobs: [{ id: "d", model: "Dragon", s: 21, d: 7, scale: 1.43 }],
    play: async (t) => {
      await t.wait(450);
      t.attack("champion", "d", "#b8f36b");
      await t.wait(300);
      t.attack("architecte", "d", "#5ee6e0");
      await t.wait(300);
      t.attack("champion", "d", "#b8f36b", true);
      await t.wait(350);
      t.boom("d");
      t.kill("d");
      await t.wait(200);
      t.cheer();
    } },
  { level: "x1l6", map: "Les Terres Instables", learn: "les exceptions : try, except, raise et finally", hold: 1400,
    mobs: [{ id: "cr", model: "Creeper", s: 21, d: 7.5, scale: 1.3 }, { id: "en", model: "Enderman", s: 23.5, d: 9.5, scale: 1.3 }],
    play: async (t) => {
      await t.wait(600);
      t.boom("cr");
      t.kill("cr");
      await t.wait(400);
      t.attack("technicienne", "en", "#9fdcff", true);
      await t.wait(300);
      t.kill("en");
      t.achieve();
    } },
  { level: "k1l2", map: "La Bibliothèque", learn: "les listes : index, tri, sum, min et max", hold: 1300,
    mobs: [{ id: "ca", model: "Cat", s: 21, d: 7, scale: 1.04 }, { id: "wo", model: "Wolf", s: 23, d: 8.5, scale: 1.3 }],
    play: async (t) => { await t.wait(500); t.achieve(); } },
  { level: "k3l1", map: "Le Royaume", learn: "tout réunir dans un seul vrai programme", final: true, hold: 3400,
    mobs: [{ id: "hr", model: "Horse", s: 21, d: 7, scale: 1.3 }, { id: "sh", model: "Sheep", s: 23, d: 9, scale: 1.3 }],
    play: async (t) => {
      await t.wait(400);
      t.achieve();
      await t.wait(600);
      t.fireworks();
      await t.wait(600);
      t.fireworks();
    } },
];

export class Trailer {
  constructor(app) {
    this.app = app;
    this.root = null;
    this.rate = 1; // > 1 only in the automated tests
  }

  wait(ms) {
    return new Promise((resolve) => {
      const end = performance.now() + ms / this.rate;
      const tick = (now) => {
        if (now >= end || this.stopped) resolve();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  // ----- what can happen in a shot
  npc(id) {
    const world = this.app.world;
    const n = world.stage && world.stage.npcs.find((x) => x.id === id || x.name.toLowerCase().includes(id));
    return n ? n.id : world.stage && world.stage.npcs[0] && world.stage.npcs[0].id;
  }

  attack(npcId, mobId, color, big = false) {
    const world = this.app.world;
    const id = this.npc(npcId);
    if (id) world.npcPose(id, "point", 500);
    world.hitMob(mobId, id ? world.npcTop(id) : null, color, big);
    sound.play(big ? "zap" : "blip", { depth: 3 });
  }

  bolt(mobId) {
    this.app.world.hitMob(mobId, null, "#fff3a0", true);
    sound.play("zap");
  }

  boom(mobId) {
    const world = this.app.world;
    world.addEffect({ kind: "explosion", at: world.mobTop(mobId), dur: 1200 });
    world.shakeCamera(10, 500);
    world.flashScreen("rgba(255,200,120,0.35)", 250);
    sound.play("boom");
  }

  kill(mobId) {
    this.app.world.killMob(mobId);
    sound.play("pop");
  }

  cheer() {
    const world = this.app.world;
    if (!world.stage) return;
    world.stage.npcs.forEach((n) => world.npcPose(n.id, "cheer", 1600));
  }

  // An achievement: the scenery shows the result, everyone is happy.
  achieve() {
    const world = this.app.world;
    if (world.stage) world.stage.done = true;
    this.cheer();
    world.celebrate();
    sound.play("victory");
  }

  fireworks() {
    this.app.world.celebrate();
    sound.play("achievement");
  }

  // ----- screen
  build(closable) {
    this.bar = el("span");
    this.title = el("div", { class: "tr-title" });
    this.sub = el("div", { class: "tr-sub" });
    this.mapName = el("div", { class: "tr-map-name" });
    this.mapLevel = el("div", { class: "tr-map-level" });
    this.mapLearn = el("div", { class: "tr-learn" });
    this.mapCard = el("div", { class: "tr-map" }, this.mapName, this.mapLevel, this.mapLearn);
    this.root = el("div", { class: "trailer" },
      el("div", { class: "tr-caption" }, this.title, this.sub),
      this.mapCard,
      el("div", { class: "tr-controls" },
        el("span", { class: "tr-label" }, "🎬 Aperçu de PyCraft"),
        el("span", { class: "tr-bar" }, this.bar),
        closable ? el("button", { class: "tiny", onclick: () => { this.stopped = true; } }, "✕ Quitter") : null));
    document.body.append(this.root);
  }

  show(node, text) {
    node.classList.remove("show");
    void node.offsetWidth;
    node.textContent = text;
    if (text) node.classList.add("show");
  }

  // The click on the start card is also what allows the browser to play
  // sound.
  startCard() {
    return new Promise((resolve) => {
      const card = el("div", { class: "tr-start" },
        el("img", { src: "/img/logo.svg", alt: "PyCraft", width: "420" }),
        el("p", {}, "Bienvenue ! Petit aperçu du monde qui t'attend."),
        el("button", { class: "mc-btn primary big", onclick: () => { card.remove(); resolve(); } }, "▶ Découvrir PyCraft"),
        el("p", { class: "small muted" }, "Pense à monter le son 🔊"));
      this.root.append(card);
    });
  }

  async play({ first = false } = {}) {
    const { app } = this;
    const world = app.world;
    this.stopped = false;
    this.build(!first);
    document.body.classList.add("trailer-on");
    world.stopIntro();
    app.pause();
    await this.startCard();
    sound.unlock();
    world.trailerActive = true;
    for (let i = 0; i < SHOTS.length && !this.stopped; i += 1) {
      this.bar.style.width = `${Math.round((i / SHOTS.length) * 100)}%`;
      await this.shot(SHOTS[i]);
    }
    this.bar.style.width = "100%";
    world.trailerActive = false;
    world.setMobs([]);
    world.hideBoss();
    world.focusUntil = 0;
    document.body.classList.remove("trailer-on");
    this.root.remove();
    try {
      localStorage.setItem(TRAILER_KEY, TRAILER_VERSION);
    } catch {
      // storage unavailable
    }
  }

  async shot(shot) {
    const { app } = this;
    const world = app.world;
    const level = app.levelsById[shot.level];
    const region = app.regionOf[shot.level];
    if (!level) return;
    app.clearRun();
    world.hideBoss();
    world.setTheme(region.theme);
    world.setStage(level.scene, false);
    world.setMobs(shot.mobs || []);
    world.focusUntil = Infinity;
    // The map, the level, and what is learned there.
    this.card(region.name, `Niveau ${level.number} · ${level.title}`, shot.learn || this.notionsOf(level));
    if (shot.title) {
      this.show(this.title, "PyCraft");
      this.show(this.sub, "Apprends Python en construisant un monde.");
      sound.play("bell");
    } else if (shot.final) {
      this.show(this.title, "À toi de jouer !");
      this.show(this.sub, "Ton aventure commence dans la prairie.");
    } else {
      this.show(this.title, "");
      this.show(this.sub, "");
      sound.play("whoosh");
    }
    const start = performance.now();
    if (shot.play) await shot.play(this);
    await this.wait((shot.hold || 1200) * 0.8);
    // Enough time to read what is learned there.
    const left = MIN_SHOT - (performance.now() - start) * this.rate;
    if (left > 0) await this.wait(left);
    this.mapCard.classList.remove("show");
  }

  card(name, levelLine, learn) {
    this.mapCard.classList.remove("show");
    void this.mapCard.offsetWidth;
    this.mapName.textContent = name;
    this.mapLevel.textContent = levelLine;
    this.mapLearn.innerHTML = "";
    this.mapLearn.append(el("b", {}, "📘 Tu y apprends : "), learn);
    this.mapCard.classList.add("show");
  }

  // Fallback: the first notions of the level.
  notionsOf(level) {
    const names = this.app.curriculum.notions || {};
    return level.notions.slice(0, 3).map((n) => names[n] || n).join(", ");
  }
}
