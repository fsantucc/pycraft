// The tutor: the 7-step learning flow of a level.
// Découverte → Explication → Démonstration → Expérimentation → Mission →
// Vérification → Maîtrise.
import { api, el, esc, md, toast } from "./util.js";

export const STEPS = [
  { key: "story", label: "1 Découverte" },
  { key: "explain", label: "2 Explication" },
  { key: "demo", label: "3 Démo" },
  { key: "experiment", label: "4 Essais" },
  { key: "mission", label: "5 Mission" },
  { key: "quiz", label: "6 Vérification" },
  { key: "mastery", label: "7 Maîtrise" },
];

const STATUS_TEXT = {
  mastered: "Maîtrisé", completed: "Terminé — à revoir", in_progress: "En cours",
  available: "Disponible", locked: "Verrouillé",
};

export class LessonPanel {
  constructor(root, app) {
    this.root = root;
    this.app = app;
    this.lastCheck = null;
    this.hints = [];
    this.quizState = {};
  }

  levelState() {
    return this.app.progress.levels[this.app.level.id] || {};
  }

  reachable(key) {
    const st = this.levelState();
    const seen = st.steps_seen || [];
    switch (key) {
      case "story": case "explain": return true;
      case "demo": case "experiment": return seen.includes("explain") || seen.includes("demo") || st.mission_passed;
      case "mission": return seen.includes("demo") || st.mission_passed;
      case "quiz": return !!st.mission_passed;
      case "mastery": return ["completed", "mastered"].includes(st.status);
      default: return false;
    }
  }

  reset() {
    this.lastCheck = null;
    this.hints = [];
    this.quizState = {};
  }

  render() {
    const { level, region } = this.app;
    const root = this.root;
    root.innerHTML = "";
    if (!level) return;
    const st = this.levelState();
    root.append(el("div", { class: "lesson-head" },
      el("div", { class: "region" }, `${region.name} · niveau ${level.number}`),
      el("h2", {}, level.title, level.boss ? el("span", { class: "boss-tag" }, "BOSS") : null),
      el("div", { class: "small muted" }, `${STATUS_TEXT[st.status] || ""}${st.xp ? ` · ${st.xp} XP gagnés` : ""}`)));
    const stepper = el("div", { class: "stepper" });
    const seen = st.steps_seen || [];
    STEPS.forEach((s) => {
      const done = seen.includes(s.key) || (s.key === "mission" && st.mission_passed);
      stepper.append(el("button", {
        class: `${this.app.step === s.key ? "active" : ""} ${done ? "done" : ""}`,
        disabled: !this.reachable(s.key),
        title: this.reachable(s.key) ? "" : "Termine d'abord l'étape précédente",
        onclick: () => this.app.goStep(s.key),
      }, s.label));
    });
    root.append(stepper);
    const body = el("div", { class: "md" });
    root.append(body);
    this[`render_${this.app.step}`](body, st);
  }

  next(label, step) {
    return el("div", { class: "next-row" }, el("button", { class: "mc-btn primary", onclick: () => this.app.goStep(step) }, label));
  }

  render_story(body) {
    const { level } = this.app;
    body.innerHTML = md(level.story);
    body.append(el("div", { class: "card" },
      el("h4", {}, "👀 Observe le monde"),
      el("p", {}, "Le monde au centre rejoue le programme de démonstration, instruction par instruction. Le code est encore caché : regarde d'abord ce qui apparaît, ce qui change, qui parle."),
      el("button", { class: "tiny", onclick: () => this.app.runDemo(true) }, "↻ Revoir l'animation")));
    body.append(this.next("Comprendre →", "explain"));
  }

  render_explain(body) {
    const { level, curriculum } = this.app;
    body.innerHTML = md(level.explanation);
    const chips = el("div", {}, el("div", { class: "small muted" }, "Notions de ce niveau :"));
    level.notions.forEach((n) => {
      const state = this.app.progress.notions[n] || "unknown";
      chips.append(el("span", { class: `notion-chip st-${state}` }, `${n} · ${curriculum.notions[n] || n}`));
    });
    body.append(chips);
    if (level.going_further) body.append(el("div", { class: "card", html: md(level.going_further) }));
    body.append(this.next("Voir le code →", "demo"));
  }

  render_demo(body) {
    const { level } = this.app;
    body.append(el("p", {}, "Voici le code qui a produit l'animation. Utilise ", el("b", {}, "Pas suivant (F10)"),
      " sous le monde pour avancer une instruction à la fois : la ligne en cours est surlignée, le monde et l'inspecteur se mettent à jour."));
    if (level.demo_notes.length) {
      const card = el("div", { class: "card" }, el("h4", {}, "À observer"));
      const ul = el("ul");
      level.demo_notes.forEach((n) => ul.append(el("li", { html: md(n).replace(/^<p>|<\/p>$/g, "") })));
      card.append(ul);
      body.append(card);
    }
    body.append(el("div", { class: "next-row" },
      el("button", { class: "tiny", onclick: () => this.app.runDemo(false) }, "▶ Exécuter pas à pas"),
      el("button", { class: "tiny", onclick: () => this.app.runDemo(true) }, "▶▶ Lecture automatique")));
    body.append(this.next("Expérimenter →", "experiment"));
  }

  render_experiment(body) {
    const { level } = this.app;
    body.append(el("p", {}, "Le code est à toi : modifie-le, exécute (Ctrl+Entrée), observe. Tu ne peux rien casser."));
    if (level.experiments.length) {
      const card = el("div", { class: "card" }, el("h4", {}, "🧪 Essais proposés"));
      const ul = el("ul");
      level.experiments.forEach((x) => ul.append(el("li", { html: md(x).replace(/^<p>|<\/p>$/g, "") })));
      card.append(ul);
      body.append(card);
    }
    body.append(el("p", { class: "small muted" }, "Avant chaque exécution, essaie de prédire ce que le monde va faire. Puis compare."));
    body.append(el("div", { class: "next-row" },
      el("button", { class: "tiny", onclick: () => this.app.resetDemo() }, "↺ Revenir à la démo d'origine")));
    body.append(this.next("Passer à la mission →", "mission"));
  }

  render_mission(body, st) {
    const { level } = this.app;
    body.append(el("div", { class: "card mission" },
      el("h4", {}, `🎯 ${level.mission_title}`), el("div", { html: md(level.mission) })));
    if (level.bonus) body.append(el("p", { class: "small muted" }, level.bonus));
    body.append(el("p", { class: "small muted" }, "Mission secondaire permanente : réussis avec un code propre (bouton « Analyse qualité » sans remarque) pour un bonus d'XP."));
    if (level.starter_from) {
      body.append(el("button", { class: "tiny", onclick: () => this.app.importFrom(level.starter_from) },
        `⤵ Reprendre mon code du niveau ${this.app.levelsById[level.starter_from].number}`));
    }
    const results = this.lastCheck ? this.lastCheck.results : null;
    if (level.boss) {
      const total = level.checks.length;
      const done = results ? results.filter((r) => r.ok).length : 0;
      body.append(el("div", { class: "small" }, `Vie du boss : ${total - done}/${total}`),
        el("div", { class: "boss-bar" }, el("div", { style: `width:${100 * (total - done) / total}%` })));
    }
    const list = el("ul", { class: "checks" });
    level.checks.forEach((check, i) => {
      const r = results && results[i];
      const cls = !r ? "" : r.ok ? "ok" : r.skipped ? "skip" : "ko";
      const li = el("li", { class: cls }, el("span", { class: "st" }, !r ? "·" : r.ok ? "✓" : r.skipped ? "–" : "✗"), check.label);
      if (r && !r.ok && r.message) li.append(el("div", { class: "msg", html: md(r.message).replace(/^<p>|<\/p>$/g, "") }));
      if (r && !r.ok && !r.skipped && r.hint) li.append(el("div", { class: "msg muted" }, "💡 ", r.hint));
      if (r && !r.ok && r.line) {
        li.append(el("div", { class: "goto" }, el("button", { class: "tiny", onclick: () => this.app.editor.gotoLine(r.file || "main.py", r.line) }, `Voir la ligne ${r.line}`)));
      }
      list.append(li);
    });
    body.append(el("h4", {}, "Ce qui sera vérifié"), list);
    if (this.lastCheck) {
      if (this.lastCheck.passed) {
        body.append(el("div", { class: "card ok" }, el("h4", {}, "✔ Mission réussie !"),
          el("p", {}, "Le code passe toutes les vérifications, y compris avec des valeurs que le jeu a inventées. Prouve maintenant que tu comprends."),
          el("button", { class: "mc-btn primary", onclick: () => this.app.goStep("quiz") }, "Vérification →")));
      } else {
        const failed = this.lastCheck.results.filter((r) => !r.ok).length;
        body.append(el("div", { class: "card err" }, el("h4", {}, `${failed} vérification(s) à corriger`),
          el("p", { class: "small" }, "Commence par la première ligne en ✗ : c'est souvent elle qui explique les suivantes.")));
      }
    }
    const hintBox = el("div");
    (st.hints_used ? this.hints : []).forEach((h, i) => hintBox.append(el("div", { class: "card hint" }, el("h4", {}, `Indice ${i + 1}`), el("p", {}, h))));
    body.append(hintBox);
    const hintsLeft = level.hints_count - (st.hints_used || 0);
    body.append(el("div", { class: "next-row" },
      el("button", {
        class: "tiny", disabled: hintsLeft <= 0,
        title: "Chaque indice réduit un peu l'XP de la mission",
        onclick: () => this.askHint(),
      }, hintsLeft > 0 ? `💡 Indice (${st.hints_used || 0}/${level.hints_count})` : "Plus d'indice"),
      el("button", { class: "mc-btn gold", onclick: () => this.app.checkMission() }, "✔ Vérifier la mission")));
    if (this.lastCheck && this.lastCheck.suggest_hint) {
      body.append(el("p", { class: "small muted" }, "Plusieurs essais sans succès : un indice peut t'aider à débloquer ton raisonnement (sans te donner la solution)."));
    }
  }

  async loadHints() {
    try {
      const res = await api("/api/hint", { level: this.app.level.id, peek: true });
      this.hints = res.all;
    } catch (err) {
      this.hints = [];
    }
  }

  async askHint() {
    try {
      const res = await api("/api/hint", { level: this.app.level.id });
      this.hints = res.all;
      await this.app.refreshProgress();
      this.render();
    } catch (err) {
      toast(err.message, "bad");
    }
  }

  render_quiz(body, st) {
    const { level } = this.app;
    body.append(el("p", {}, "Un niveau n'est pas maîtrisé parce que le code passe : il faut pouvoir ", el("b", {}, "prédire"), " et ", el("b", {}, "expliquer"), "."));
    level.quiz.forEach((q, index) => body.append(this.question(q, index, st)));
    const done = level.quiz.every((_, i) => (st.quiz[String(i)] || {}).correct);
    if (done) body.append(this.next("Bilan de maîtrise →", "mastery"));
  }

  question(q, index, st) {
    const saved = (st.quiz || {})[String(index)] || {};
    const local = this.quizState[index] || {};
    const box = el("div", { class: `q ${saved.correct ? "correct" : local.wrong ? "wrong" : ""}` });
    const kindLabel = { predict: "Prédiction", choice: "Choix", explain: "Explique avec tes mots" }[q.kind];
    box.append(el("div", { class: "small muted" }, `Question ${index + 1} · ${kindLabel}`), el("div", { html: md(q.prompt) }));
    if (q.code) box.append(el("pre", {}, q.code));
    const feedback = el("div", { class: "feedback" });
    if (q.kind === "predict") {
      const area = el("textarea", { placeholder: "Écris exactement ce que le programme affiche…" });
      area.value = local.answer || "";
      box.append(area);
      box.append(el("div", { class: "next-row" },
        el("button", { class: "tiny", onclick: () => this.app.visualizeSnippet(q.code) }, saved.correct || local.wrong ? "👁 Voir l'exécution" : "👁 Voir l'exécution (après ta réponse)"),
        el("button", { class: "mc-btn primary", disabled: saved.correct, onclick: () => this.answer(index, area.value) }, saved.correct ? "Validé" : "Valider")));
    } else if (q.kind === "choice") {
      const opts = el("div", { class: "opts" });
      q.options.forEach((opt, i) => {
        const cls = local.answer === i ? (local.correct ? "right" : "bad") : saved.correct && local.answerIndex === i ? "right" : "";
        opts.append(el("button", { class: cls, disabled: saved.correct, onclick: () => this.answer(index, i) }, opt));
      });
      box.append(opts);
    } else {
      const area = el("textarea", { placeholder: "Explique comme si tu parlais à un camarade de 42…" });
      area.value = local.answer || saved.text || "";
      box.append(area, el("div", { class: "next-row" },
        el("button", { class: "mc-btn primary", disabled: saved.correct, onclick: () => this.answer(index, area.value) }, saved.correct ? "Enregistré" : "Enregistrer mon explication")));
    }
    if (local.feedback) feedback.innerHTML = local.feedback;
    else if (saved.correct) feedback.innerHTML = `<span style="color:#b8f36b">✓ Réussi${saved.first_try ? " du premier coup" : ""}</span>`;
    box.append(feedback);
    return box;
  }

  async answer(index, answer) {
    const q = this.app.level.quiz[index];
    if (q.kind === "predict" && !String(answer).trim()) {
      toast("Écris ta prédiction avant de valider.", "bad");
      return;
    }
    try {
      const res = await api("/api/quiz", { level: this.app.level.id, index, answer });
      let fb = "";
      if (res.correct) {
        fb = `<span style="color:#b8f36b">✓ Exact.</span> ${esc(res.explanation)}`;
        if (q.kind === "explain") fb = `<span style="color:#b8f36b">✓ Explication enregistrée dans ton journal.</span><br><b>Compare avec cette référence :</b> ${esc(res.reference)}<br><span class="muted small">Ce texte n'est pas noté automatiquement : relis-toi honnêtement. Ton explication contient-elle les mêmes idées ?</span>`;
        if (res.xp) toast(`+${res.xp} XP`, "xp");
      } else if (q.kind === "predict") {
        fb = `<span style="color:#ff8a80">✗ Pas tout à fait.</span> Ta réponse ne correspond pas à l'affichage réel. Avant de regarder la solution, utilise « Voir l'exécution » et suis les étapes une par une.`;
      } else if (q.kind === "choice") {
        fb = `<span style="color:#ff8a80">✗ Non.</span> Relis la question et l'explication du niveau, puis réessaie.`;
      } else {
        fb = `<span style="color:#ff8a80">${esc(res.explanation)}</span>`;
      }
      if (res.correct && q.kind === "predict") fb += `<pre>${esc(res.expected)}</pre>`;
      this.quizState[index] = { answer, correct: res.correct, wrong: !res.correct, feedback: fb, answerIndex: answer };
      (res.rewards || []).forEach((r) => toast(`🏆 Récompense : ${r}`, "xp"));
      this.app.progress = res.progress;
      this.app.updateTopbar();
      this.render();
    } catch (err) {
      toast(err.message, "bad");
    }
  }

  render_mastery(body, st) {
    const { level } = this.app;
    const mastered = st.status === "mastered";
    body.append(el("div", { class: "mastery" },
      el("div", { class: "big" }, mastered ? "🏆" : "📘"),
      el("h3", {}, mastered ? "Niveau maîtrisé" : "Niveau terminé, à consolider"),
      el("p", {}, mastered
        ? "Mission réussie, quiz réussi du premier coup, peu ou pas d'indices. Tu peux expliquer ces notions sans aide."
        : "Tu as terminé, mais avec plusieurs indices ou des erreurs au quiz. Ces notions sont marquées « à revoir »."),
      el("p", { class: "small muted" }, `${st.xp} XP gagnés · ${st.attempts} vérification(s) · ${st.hints_used} indice(s)${st.quality_bonus ? " · bonus code propre ✓" : ""}`)));
    const chips = el("div");
    level.notions.forEach((n) => {
      const s = this.app.progress.notions[n] || "unknown";
      chips.append(el("span", { class: `notion-chip st-${s}` }, `${n} · ${this.app.curriculum.notions[n]}`));
    });
    body.append(chips);
    const row = el("div", { class: "next-row" });
    if (!mastered) {
      row.append(el("button", { class: "tiny", onclick: () => this.app.startReview() }, "🔁 Défi de maîtrise (refaire le quiz)"));
    }
    const nextId = this.app.nextLevelId(level.id);
    if (nextId) row.append(el("button", { class: "mc-btn primary", onclick: () => this.app.openLevel(nextId) }, "Niveau suivant →"));
    else row.append(el("span", { class: "muted" }, "Tu as terminé PyCraft. Bravo !"));
    body.append(row);
  }
}
