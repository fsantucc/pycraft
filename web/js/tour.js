// Interactive welcome tour: a spotlight moves over the interface and a
// bubble explains each zone. Clicking the highlighted element (when it is
// a button) also moves on, so the player learns by doing.

const STEPS = [
  { target: "#editor-wrap", title: "1. L'éditeur", text: "Tu écris ton code Python ici. Plusieurs fichiers ? Ils ont chacun leur onglet au-dessus." },
  { target: "#btn-run", title: "2. Exécuter", text: "Lance ton programme (ou Ctrl+Entrée). Essaie : clique dessus !", click: true },
  { target: "#world-wrap", title: "3. Le monde", text: "Ton programme prend vie ici : les classes deviennent des plans, les objets des personnages, et le crieur affiche tes print()." },
  { target: "#timeline", title: "4. Le pas à pas", text: "Rejoue ton programme instruction par instruction avec ▶| (ou F10), recule avec ◀. Idéal pour comprendre un bug." },
  { target: "#console", title: "5. La console", text: "Ce que ton programme affiche. En cas d'erreur, des questions t'aident à trouver la cause, sans te donner la solution." },
  { target: "#right .tabs", title: "6. Leçon, inspecteur, diagramme", text: "La leçon te guide en 7 étapes. L'inspecteur montre les attributs d'un objet (clique sur un objet du monde). Le diagramme dessine tes classes." },
  { target: "#topbar nav", title: "7. Carte et progression", text: "La carte du monde montre les niveaux. Progression : ton XP, tes statistiques et des succès cachés à débloquer." },
  { target: "#btn-sound", title: "8. Le son", text: "Règle ici le volume des effets, des voix des personnages et de la musique (différente dans chaque région). C'est fini, bon jeu !" },
];

export class Tour {
  constructor({ onDone, onSound } = {}) {
    this.onDone = onDone || (() => {});
    this.onSound = onSound || (() => {});
    this.index = 0;
    this.root = null;
  }

  start() {
    this.stop();
    this.root = document.createElement("div");
    this.root.className = "tour";
    this.root.innerHTML = `
      <div class="tour-hole"></div>
      <div class="tour-box" role="dialog" aria-live="polite">
        <div class="tour-title"></div>
        <div class="tour-text"></div>
        <div class="tour-dots"></div>
        <div class="tour-btns">
          <button class="tiny tour-skip">Passer</button>
          <button class="tiny tour-prev">◀</button>
          <button class="mc-btn primary tour-next">Suivant ▶</button>
        </div>
      </div>`;
    document.body.append(this.root);
    this.root.querySelector(".tour-skip").addEventListener("click", () => this.finish(false));
    this.root.querySelector(".tour-prev").addEventListener("click", () => this.show(this.index - 1));
    this.root.querySelector(".tour-next").addEventListener("click", () => this.show(this.index + 1));
    this.onResize = () => this.place();
    window.addEventListener("resize", this.onResize);
    this.onKey = (e) => {
      const typing = ["TEXTAREA", "INPUT"].includes(document.activeElement && document.activeElement.tagName);
      if (typing && e.key !== "Escape") return;
      if (e.key === "Escape") this.finish(false);
      else if (e.key === "ArrowRight" || e.key === "Enter") this.show(this.index + 1);
      else if (e.key === "ArrowLeft") this.show(this.index - 1);
    };
    window.addEventListener("keydown", this.onKey);
    this.show(0);
  }

  show(index) {
    if (index >= STEPS.length) {
      this.finish(true);
      return;
    }
    this.index = Math.max(0, index);
    const step = STEPS[this.index];
    this.root.querySelector(".tour-title").textContent = step.title;
    this.root.querySelector(".tour-text").textContent = step.text;
    this.root.querySelector(".tour-prev").disabled = this.index === 0;
    this.root.querySelector(".tour-next").textContent = this.index === STEPS.length - 1 ? "Terminer ✔" : "Suivant ▶";
    this.root.querySelector(".tour-dots").innerHTML = STEPS.map((_, i) =>
      `<span class="${i === this.index ? "on" : i < this.index ? "done" : ""}"></span>`).join("");
    if (this.clickTarget) this.clickTarget.removeEventListener("click", this.onTargetClick);
    this.clickTarget = null;
    const target = document.querySelector(step.target);
    if (target && step.click) {
      this.clickTarget = target;
      this.onTargetClick = () => setTimeout(() => this.show(this.index + 1), 350);
      target.addEventListener("click", this.onTargetClick, { once: true });
    }
    this.onSound();
    this.place();
  }

  // Put the spotlight on the target and the bubble next to it (below,
  // above, or beside it, whichever fits on screen).
  place() {
    if (!this.root) return;
    const step = STEPS[this.index];
    const target = document.querySelector(step.target);
    const hole = this.root.querySelector(".tour-hole");
    const box = this.root.querySelector(".tour-box");
    const W = window.innerWidth;
    const H = window.innerHeight;
    const r = target ? target.getBoundingClientRect() : { left: W / 2 - 1, top: H / 2 - 1, width: 2, height: 2 };
    const pad = 6;
    Object.assign(hole.style, {
      left: `${r.left - pad}px`, top: `${r.top - pad}px`,
      width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px`,
    });
    const bw = Math.min(340, W - 20);
    box.style.width = `${bw}px`;
    const bh = box.offsetHeight || 160;
    let left = r.left + r.width / 2 - bw / 2;
    let top = r.bottom + 14;
    if (top + bh > H - 10) top = r.top - bh - 14;
    if (top < 10) {
      top = Math.max(10, Math.min(H - bh - 10, r.top + r.height / 2 - bh / 2));
      left = r.right + 14 + bw < W ? r.right + 14 : r.left - bw - 14;
    }
    box.style.left = `${Math.max(10, Math.min(W - bw - 10, left))}px`;
    box.style.top = `${Math.max(10, Math.min(H - bh - 10, top))}px`;
  }

  finish(completed) {
    this.stop();
    if (completed) this.onDone();
  }

  stop() {
    if (this.root && this.onStop) this.onStop();
    if (this.clickTarget) this.clickTarget.removeEventListener("click", this.onTargetClick);
    this.clickTarget = null;
    if (this.onResize) window.removeEventListener("resize", this.onResize);
    if (this.onKey) window.removeEventListener("keydown", this.onKey);
    if (this.root) this.root.remove();
    this.root = null;
  }
}

export const TOUR_STEPS = STEPS;
