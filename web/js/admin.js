// The organizer's panel, for a workshop (see server/admin.py).
//
// Behind a password checked by the server (a session cookie the page cannot
// read). It manages the save of THIS installation only:
//   Démarrage     — where the participant starts (presets, any level);
//   Aide          — open the next level or the region, restart a level;
//   Sauvegardes   — backups, restore, export / import;
//   Atelier       — prepare the game for a new participant;
//   Historique    — the last admin actions.
// Every action is previewed by the server (dry run), confirmed, then the game
// is updated at once (no reload, except for a new participant).
import { TRAILER_KEY, TRAILER_VERSION } from "./trailer.js";
import { api, el, toast } from "./util.js";

const ICONS = { locked: "🔒", available: "▶", in_progress: "⛏", completed: "✔", mastered: "🏆" };
const STATUS = { locked: "verrouillé", available: "disponible", in_progress: "en cours", completed: "terminé", mastered: "maîtrisé" };
const ROMAN = { 1: "I", 2: "II", 3: "III", 4: "IV" };
const TABS = [
  ["start", "🚩 Démarrage"],
  ["help", "🛟 Aide au joueur"],
  ["saves", "💾 Sauvegardes"],
  ["workshop", "👥 Atelier"],
  ["history", "🕘 Historique"],
];

const when = (seconds) => new Date(seconds * 1000).toLocaleString("fr-CH", {
  day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
});

export class AdminPanel {
  constructor(app) {
    this.app = app;
    this.tab = "start";
    this.button = document.getElementById("btn-admin");
  }

  // ------------------------------------------------------------- session
  async refreshButton() {
    try {
      const status = await api("/api/admin/status");
      this.setLogged(status.logged_in);
    } catch {
      this.setLogged(false);
    }
  }

  setLogged(on) {
    this.logged = on;
    this.button.textContent = on ? "Admin ✓" : "Admin";
    this.button.classList.toggle("on", on);
  }

  async open() {
    await this.refreshButton();
    if (this.logged) await this.panel();
    else this.login();
  }

  login(message = "") {
    const input = el("input", { type: "password", class: "adm-input", autocomplete: "current-password", "aria-label": "Mot de passe admin" });
    const error = el("p", { class: "adm-error" }, message);
    const go = el("button", { class: "mc-btn primary", type: "submit" }, "Entrer");
    const form = el("form", { class: "adm-login", onsubmit: async (e) => {
      e.preventDefault();
      go.disabled = true;
      error.textContent = "";
      try {
        await api("/api/admin/login", { password: input.value });
        this.setLogged(true);
        await this.panel();
      } catch (err) {
        error.textContent = err.message;
        input.select();
        go.disabled = false;
      }
    } },
    el("h2", {}, "🛠 Espace organisateur"),
    el("p", { class: "muted" }, "Réservé à l'organisateur de l'atelier."),
    el("label", {}, "Mot de passe", input),
    error,
    el("div", { class: "next-row" }, go));
    this.app.overlay(form);
    setTimeout(() => input.focus(), 50);
  }

  async logout() {
    try {
      await api("/api/admin/logout", {});
    } catch {
      // already logged out
    }
    this.setLogged(false);
    document.getElementById("overlay").classList.add("hidden");
    toast("Session admin fermée.");
  }

  // A refused action: the session may have expired.
  failed(err) {
    if (/Session admin/.test(err.message)) {
      this.setLogged(false);
      this.login("Session expirée : reconnecte-toi.");
    } else {
      toast(err.message, "bad");
    }
  }

  // --------------------------------------------------------------- panel
  async panel(tab = this.tab) {
    this.tab = tab;
    let state;
    try {
      state = await api("/api/admin/state");
    } catch (err) {
      this.failed(err);
      return;
    }
    this.state = state;
    const { app } = this;
    const info = state.info;
    const level = app.level;
    const chips = [];
    if (info.admin.all_unlocked) chips.push("🧭 Exploration libre active");
    if (info.admin.unlocked_through) chips.push(`🔓 Débloqué jusqu'au ${this.num(info.admin.unlocked_through)}`);
    if (info.admin.start_level) chips.push(`🚩 Départ : ${this.num(info.admin.start_level)}`);
    const body = el("div", { class: "adm-body" });
    const tabs = el("div", { class: "adm-tabs", role: "tablist" }, TABS.map(([id, label]) => el("button", {
      class: `adm-tab ${id === tab ? "on" : ""}`, role: "tab", "data-tab": id,
      onclick: () => this.panel(id),
    }, label)));
    const root = el("div", { class: "adm" },
      el("div", { class: "adm-head" },
        el("div", { class: "adm-title" },
          el("h2", {}, "🛠 Admin · atelier"),
          el("div", { class: "adm-actions" },
            el("button", { class: "mc-btn", onclick: () => document.getElementById("overlay").classList.add("hidden") }, "Retour au jeu"),
            el("button", { class: "tiny", onclick: () => this.logout() }, "Se déconnecter"))),
        el("div", { class: "adm-status" },
          el("b", {}, `Niveau en cours : ${level ? `${level.number} · ${level.title}` : "—"}`),
          ` · ${info.done}/${info.total} niveaux terminés (${info.percent} %) · ${info.xp} XP · ${info.rewards} récompense(s)`,
          chips.length ? el("div", { class: "adm-chips" }, chips.map((c) => el("span", { class: "adm-chip" }, c))) : null),
        el("div", { class: "adm-note" },
          "Cette installation : ", el("code", {}, info.save),
          ". L'admin ne gère que la sauvegarde de cet ordinateur.",
          ` Session : ${Math.max(1, Math.round(state.session / 60))} min sans action avant déconnexion.`,
          state.default_password ? " Mot de passe par défaut (modifiable : voir le README)." : null)),
      info.set_aside ? el("div", { class: "adm-alert" },
        `⚠ Une sauvegarde illisible a été mise de côté le ${when(info.set_aside.time)} (${info.set_aside.file}). `,
        el("button", { class: "tiny", onclick: () => this.panel("saves") }, "Restaurer une sauvegarde")) : null,
      tabs, body);
    body.append(this[`tab_${tab}`]());
    app.overlay(root);
  }

  num(levelId) {
    const level = this.app.levelsById[levelId];
    return level ? level.number : levelId;
  }

  // A chooser Acte → Région → Niveau, from the real curriculum.
  picker(initial) {
    const { app } = this;
    const { regions } = app.curriculum;
    const act = el("select", { class: "adm-select", "aria-label": "Acte" });
    const region = el("select", { class: "adm-select", "aria-label": "Région" });
    const level = el("select", { class: "adm-select wide", "aria-label": "Niveau" });
    const acts = [...new Set(regions.map((r) => r.act))];
    for (const a of acts) act.append(el("option", { value: a }, `Acte ${ROMAN[a] || a}`));
    const fillLevels = (regionId, levelId) => {
      level.innerHTML = "";
      const r = regions.find((x) => x.id === regionId);
      for (const l of r.levels) {
        const st = (app.progress.levels[l.id] || {}).status || "locked";
        level.append(el("option", { value: l.id }, `${l.number} · ${l.title} — ${ICONS[st] || ""}`));
      }
      level.value = levelId && r.levels.some((l) => l.id === levelId) ? levelId : r.levels[0].id;
    };
    const fillRegions = (actId, regionId, levelId) => {
      region.innerHTML = "";
      const list = regions.filter((r) => String(r.act) === String(actId));
      for (const r of list) region.append(el("option", { value: r.id }, r.name));
      region.value = regionId && list.some((r) => r.id === regionId) ? regionId : list[0].id;
      fillLevels(region.value, levelId);
    };
    const set = (levelId) => {
      const r = app.regionOf[levelId] || regions[0];
      act.value = String(r.act);
      fillRegions(r.act, r.id, levelId);
    };
    act.addEventListener("change", () => fillRegions(act.value));
    region.addEventListener("change", () => fillLevels(region.value));
    set(initial || app.curriculum.order[0]);
    const node = el("div", { class: "adm-picker" }, act, region, level);
    return { node, set, value: () => level.value };
  }

  // The presets: each one fills the chooser (it can still be changed).
  presets(pick) {
    const { regions, order } = this.app.curriculum;
    const firstOf = (act) => regions.find((r) => r.act === act).levels[0].id;
    return el("div", { class: "adm-presets" },
      [["🌱 Débutant", order[0]], ["Acte II", firstOf(2)], ["Acte III", firstOf(3)], ["Acte IV", firstOf(4)]].map(([label, id]) =>
        el("button", { class: "tiny wide", type: "button", onclick: () => pick.set(id) }, `${label} · ${this.num(id)}`)));
  }

  // ---------------------------------------------------------------- tabs
  tab_start() {
    const pick = this.picker(this.state.info.admin.start_level || (this.app.level && this.app.level.id));
    return el("div", { class: "adm-section" },
      el("h3", {}, "Où commence le participant ?"),
      el("p", { class: "muted" }, "Un préréglage remplit le choix ci-dessous (tu peux encore le changer). Les niveaux d'avant deviennent accessibles sans être marqués comme réussis : pas d'XP, pas de récompense."),
      this.presets(pick),
      pick.node,
      el("div", { class: "adm-row" },
        el("button", { class: "mc-btn primary", onclick: () => this.run("/api/admin/start", { level: pick.value() }, { title: "Commencer ici ?" }) }, "🚩 Commencer ici")),
      el("h3", {}, "Tout le jeu"),
      el("div", { class: "adm-row" },
        el("button", { class: "mc-btn gold", onclick: () => this.run("/api/admin/unlock", { scope: "all" }, { title: "Exploration libre ?", stay: true }) }, "🧭 Exploration libre (43 niveaux)"),
        el("button", { class: "tiny", onclick: () => this.run("/api/admin/unlock", { scope: "normal" }, { title: "Revenir à la progression normale ?", stay: true }) }, "Progression normale")),
      el("p", { class: "muted small" }, "« Progression normale » retire les déblocages de l'admin : seuls les niveaux vraiment terminés ouvrent les suivants."));
  }

  tab_help() {
    const { app } = this;
    const level = app.level;
    const st = (app.progress.levels[level.id] || {}).status;
    const region = app.regionOf[level.id];
    const keep = el("input", { type: "checkbox", checked: "" });
    const last = this.state.backups.find((b) => !b.broken);
    return el("div", { class: "adm-section" },
      el("h3", {}, "Participant bloqué"),
      el("p", {}, "Niveau en cours : ", el("b", {}, `${level.number} · ${level.title}`), ` (${ICONS[st] || ""} ${STATUS[st] || ""})`),
      el("div", { class: "adm-grid" },
        this.card("⏭ Débloquer le niveau suivant", "Ouvre le niveau d'après (sans valider celui-ci) et y emmène le joueur.",
          el("button", { class: "mc-btn", onclick: () => this.run("/api/admin/unlock", { scope: "next", level: level.id }, { title: "Débloquer le niveau suivant ?" }) }, "Débloquer")),
        this.card(`🗺 Débloquer toute la région`, `Ouvre tous les niveaux de « ${region.name} ».`,
          el("button", { class: "mc-btn", onclick: () => this.run("/api/admin/unlock", { scope: "region", level: level.id }, { title: "Débloquer toute la région ?", stay: true }) }, "Débloquer")),
        this.card("↺ Recommencer ce niveau", "Remet ce niveau à zéro (étapes, mission, quiz, indices, son XP). Les niveaux suivants restent ouverts.",
          el("label", { class: "adm-check" }, keep, " Garder le code"),
          el("button", { class: "mc-btn", onclick: () => this.run("/api/admin/restart", { level: level.id, keep_code: keep.checked }, { title: "Recommencer ce niveau ?", danger: true }) }, "Recommencer")),
        this.card("⏪ Restaurer la dernière sauvegarde", last ? `Celle du ${when(last.time)}${last.label ? ` (${last.label})` : ""}.` : "Aucune sauvegarde pour l'instant.",
          el("button", { class: "mc-btn", disabled: last ? null : "", onclick: () => this.run("/api/admin/restore", { last: true }, { title: "Restaurer la dernière sauvegarde ?", danger: true, reopen: true }) }, "Restaurer"))));
  }

  tab_saves() {
    const label = el("input", { class: "adm-input", placeholder: "Étiquette (facultatif, ex. un prénom)", maxlength: "24" });
    const file = el("input", { type: "file", accept: ".json,application/json", class: "hidden" });
    file.addEventListener("change", () => this.importFile(file));
    const rows = this.state.backups.map((b) => el("tr", {},
      el("td", {}, when(b.time)),
      el("td", {}, b.label || "—"),
      el("td", {}, b.broken ? "⚠ illisible" : `${b.reached ? `jusqu'au ${b.reached}` : "début"} · ${b.passed} mission(s) · ${b.xp} XP`),
      el("td", {}, el("button", { class: "tiny", disabled: b.broken ? "" : null, onclick: () => this.run("/api/admin/restore", { file: b.file }, { title: "Restaurer cette sauvegarde ?", danger: true, reopen: true }) }, "Restaurer"))));
    return el("div", { class: "adm-section" },
      el("h3", {}, "Sauvegarder"),
      el("div", { class: "adm-row" }, label,
        el("button", { class: "mc-btn primary", onclick: async () => {
          try {
            const res = await api("/api/admin/backup", { label: label.value });
            toast(`💾 ${res.action}`, "good");
            this.panel("saves");
          } catch (err) {
            this.failed(err);
          }
        } }, "💾 Sauvegarder maintenant")),
      el("p", { class: "muted small" }, "Une sauvegarde est aussi faite automatiquement avant chaque restauration, import, niveau recommencé ou nouveau participant. Les 30 plus récentes sont gardées (dossier backups à côté de la sauvegarde)."),
      el("h3", {}, `Sauvegardes (${this.state.backups.length})`),
      rows.length
        ? el("div", { class: "adm-table" }, el("table", {}, el("thead", {}, el("tr", {}, el("th", {}, "Date"), el("th", {}, "Étiquette"), el("th", {}, "Contenu"), el("th", {}, ""))), el("tbody", {}, rows)))
        : el("p", { class: "muted" }, "Aucune sauvegarde pour l'instant."),
      el("h3", {}, "Changer d'ordinateur"),
      el("p", { class: "muted small" }, "Exporte la partie ici, puis importe le fichier sur l'autre ordinateur (dans son propre panneau admin)."),
      el("div", { class: "adm-row" },
        el("a", { class: "mc-btn", href: "/api/admin/export", download: "" }, "⬇ Exporter la partie"),
        el("button", { class: "mc-btn", onclick: () => file.click() }, "⬆ Importer un fichier…"), file));
  }

  tab_workshop() {
    const { order } = this.app.curriculum;
    const name = el("input", { class: "adm-input", placeholder: "Prénom du participant précédent (facultatif)", maxlength: "24" });
    const keep = el("input", { type: "checkbox" });
    const intro = el("input", { type: "checkbox", checked: "" });
    const pick = this.picker(order[0]);
    return el("div", { class: "adm-section" },
      el("h3", {}, "👥 Nouveau participant"),
      el("ol", { class: "adm-steps" },
        el("li", {}, "La partie actuelle est sauvegardée (avec ce prénom, pour la retrouver).", el("div", {}, name)),
        el("li", {}, "La progression repart de zéro.", el("label", { class: "adm-check" }, keep, " Garder le code du participant précédent")),
        el("li", {}, "Point de départ :", this.presets(pick), pick.node),
        el("li", {}, el("label", { class: "adm-check" }, intro, " Montrer l'introduction (aperçu ≈ 45 s, accueil, visite guidée)")),
        el("li", {}, "Tu es déconnecté de l'admin et la page se recharge.")),
      el("div", { class: "adm-row" },
        el("button", { class: "mc-btn gold big", onclick: () => this.newParticipant(name.value, keep.checked, pick.value(), intro.checked) }, "Préparer le jeu pour le nouveau participant")),
      el("h3", {}, "Raccourci"),
      el("div", { class: "adm-row" },
        el("button", { class: "mc-btn", onclick: () => this.run("/api/admin/unlock", { scope: "all" }, { title: "Exploration libre ?", stay: true }) }, "🧭 Exploration libre (43 niveaux)")));
  }

  tab_history() {
    const list = this.state.history;
    return el("div", { class: "adm-section" },
      el("h3", {}, "Dernières actions"),
      list.length
        ? el("ul", { class: "adm-history" }, list.map((h) => el("li", {}, el("span", { class: "muted" }, when(h.time)), " ", h.action)))
        : el("p", { class: "muted" }, "Aucune action pour l'instant."));
  }

  card(title, text, ...actions) {
    return el("div", { class: "adm-card" }, el("b", {}, title), el("p", { class: "muted small" }, text), el("div", { class: "adm-row" }, actions));
  }

  // ------------------------------------------------------------- actions
  // What a dry run says will change, in one or two sentences.
  describe(changes) {
    const parts = [];
    const range = (ids) => (ids.length === 1 ? this.num(ids[0]) : `${this.num(ids[0])} → ${this.num(ids[ids.length - 1])}`);
    if (changes.opened.length) parts.push(`${changes.opened.length} niveau(x) deviennent accessibles (${range(changes.opened)}).`);
    if (changes.locked.length) parts.push(`${changes.locked.length} niveau(x) seront de nouveau verrouillés (${range(changes.locked)}).`);
    if (changes.xp < 0) parts.push(`${-changes.xp} XP retirés.`);
    if (!parts.length) parts.push("Aucun niveau ne change d'état.");
    return parts.join(" ");
  }

  confirm({ title, action, preview, danger = false, note = "" }) {
    return new Promise((resolve) => {
      const done = (answer) => {
        window.removeEventListener("keydown", onKey, true);
        box.remove();
        resolve(answer);
      };
      const onKey = (e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          done(false);
        }
      };
      const ok = el("button", { class: `mc-btn ${danger ? "danger" : "primary"}`, onclick: () => done(true) }, danger ? "Confirmer" : "Valider");
      const box = el("div", { class: "adm-confirm", role: "dialog", "aria-modal": "true" },
        el("div", { class: "adm-confirm-box" },
          el("h3", {}, title),
          action ? el("p", {}, el("b", {}, action)) : null,
          preview ? el("p", {}, preview) : null,
          danger ? el("p", { class: "muted small" }, note || "Une sauvegarde de la partie actuelle est faite d'abord.") : null,
          el("div", { class: "next-row" }, el("button", { class: "tiny", onclick: () => done(false) }, "Annuler"), ok)));
      window.addEventListener("keydown", onKey, true);
      document.body.append(box);
      ok.focus();
    });
  }

  // Preview (dry run) → confirmation → action → the game is updated.
  // opts: title, danger, stay (keep the panel open), reopen (open the
  // current level again), leave (the page is about to reload: nothing to
  // update).
  async run(path, body, opts = {}) {
    let preview;
    try {
      preview = await api(path, { ...body, dry: true });
    } catch (err) {
      this.failed(err);
      return null;
    }
    const start = preview.changes.start && path === "/api/admin/start" ? ` Le joueur commencera au ${this.num(preview.changes.start)}.` : "";
    const ok = await this.confirm({ title: opts.title, action: preview.action, preview: this.describe(preview.changes) + start, danger: opts.danger });
    if (!ok) return null;
    let res;
    try {
      res = await api(path, body);
    } catch (err) {
      this.failed(err);
      return null;
    }
    toast(`✔ ${res.action}`, "good");
    if (!opts.leave) await this.applied(res, opts);
    return res;
  }

  // The game shows the new state at once.
  async applied(res, opts = {}) {
    const { app } = this;
    await app.refreshProgress();
    // (a restored or imported save: same player, the browser keeps its
    // memory of the game)
    app.rememberSave({ keep: true });
    const status = (id) => (app.progress.levels[id] || {}).status;
    let target = res.open && !opts.stay ? res.open : null;
    if (opts.reopen) target = app.level.id;
    if (!target && status(app.level.id) === "locked") {
      // The level on screen is locked again: back to the first open one.
      target = app.curriculum.order.find((id) => ["available", "in_progress"].includes(status(id))) || app.curriculum.order[0];
    }
    if (target && status(target) !== "locked") {
      localStorage.setItem("pycraft.level", target);
      await app.openLevel(target);
      return;
    }
    if (app.lesson) app.lesson.render();
    await this.panel(this.tab);
  }

  async importFile(input) {
    const file = input.files && input.files[0];
    input.value = "";
    if (!file) return;
    let save;
    try {
      save = JSON.parse(await file.text());
    } catch {
      toast("Fichier refusé : ce n'est pas un fichier JSON lisible.", "bad");
      return;
    }
    await this.run("/api/admin/import", { save, name: file.name }, { title: `Importer « ${file.name} » ?`, danger: true, reopen: true });
  }

  async newParticipant(label, keepCode, start, intro) {
    const res = await this.run("/api/admin/new-participant", { label, keep_code: keepCode, start },
      { title: "Préparer le jeu pour un nouveau participant ?", danger: true, leave: true });
    if (!res) return;
    // The browser side of the game starts again too: the newcomer gets the
    // real first launch (or none of it, if the introduction is skipped).
    await this.app.refreshProgress();
    this.app.rememberSave();
    if (!intro) {
      localStorage.setItem(TRAILER_KEY, TRAILER_VERSION);
      localStorage.setItem("pycraft.welcomed", "1");
    }
    this.setLogged(false);
    location.href = `${location.pathname}${intro ? "" : "?intro=0"}`;
  }
}
