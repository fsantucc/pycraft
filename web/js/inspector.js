// Right panel "Inspecteur": variables, call stack, objects and their
// attributes at the current step of the execution.
import { TraceModel } from "./trace.js";
import { el, esc, showValue } from "./util.js";

export class Inspector {
  constructor(root, { onSelect }) {
    this.root = root;
    this.onSelect = onSelect;
    this.selected = null;
  }

  valueNode(v) {
    if (v && v.t === "obj") {
      return el("span", { class: "ref", onclick: () => this.onSelect({ kind: "object", id: v.ref }) }, `<${v.cls}>`);
    }
    if (v && v.items && v.items.some((i) => (Array.isArray(i) ? i[1] : i)?.t === "obj")) {
      const span = el("span", {}, v.t === "list" ? "[" : "(");
      v.items.forEach((item, n) => {
        const val = Array.isArray(item) ? item[1] : item;
        if (n) span.append(", ");
        span.append(this.valueNode(val));
      });
      span.append(v.t === "list" ? "]" : ")");
      return span;
    }
    return el("span", {}, showValue(v));
  }

  render(model, state, step) {
    const root = this.root;
    root.innerHTML = "";
    if (!model) {
      root.append(el("p", { class: "muted" }, "Exécute ton code pour inspecter les variables et les objets."));
      return;
    }
    const names = TraceModel.names(state);
    const changed = new Set();
    for (const ev of model.eventsAt(state.index)) {
      if (ev.type === "attr_set") changed.add(`${ev.oid}.${ev.name}`);
      if (ev.type === "var_set") changed.add(`var.${ev.name}`);
    }

    if (step) {
      const sec = el("div", { class: "insp-sec" }, el("h4", {}, "Où en est Python ?"));
      sec.append(el("div", { class: "stack-row" }, `${step.file} · ligne ${step.line} · ${step.func === "<module>" ? "niveau du module" : step.func}`));
      if (state.stack.length) {
        sec.append(el("div", { class: "muted small" }, "Pile d'appels (du plus ancien au plus récent) :"));
        state.stack.forEach((call) => {
          const target = call.oid ? (names.get(call.oid) || [call.oid])[0] : call.receiver_cls || call.cls || "";
          const label = call.type === "func_call" ? `${call.name}()` : `${target}${target ? "." : ""}${call.method}()  [${call.kind === "instance" ? "self" : call.kind === "class" ? "cls" : "statique"}]`;
          sec.append(el("div", { class: "stack-row" }, label));
        });
      }
      if (step.locals && step.locals.length) {
        const table = el("table", { class: "kv" });
        step.locals.forEach(([n, v]) => table.append(el("tr", {}, el("td", {}, n), el("td", {}, this.valueNode(v)))));
        sec.append(el("div", { class: "muted small" }, "Variables locales de la fonction en cours :"), table);
      }
      root.append(sec);
    }

    const vars = el("div", { class: "insp-sec" }, el("h4", {}, "Variables du programme"));
    const table = el("table", { class: "kv" });
    for (const [name, value] of state.vars) {
      table.append(el("tr", { class: changed.has(`var.${name}`) ? "changed" : "" },
        el("td", {}, name), el("td", {}, this.valueNode(value))));
    }
    if (!state.vars.size) vars.append(el("p", { class: "muted small" }, "Aucune variable pour l'instant."));
    else vars.append(table);
    root.append(vars);

    const objs = el("div", { class: "insp-sec" }, el("h4", {}, `Objets (${state.objects.size})`));
    if (!state.objects.size) objs.append(el("p", { class: "muted small" }, "Aucun objet créé. Une classe seule ne crée rien."));
    for (const obj of state.objects.values()) {
      const sel = this.selected && this.selected.kind === "object" && this.selected.id === obj.oid;
      const card = el("div", { class: `obj-card${sel ? " sel" : ""}` });
      const label = (names.get(obj.oid) || []).join(" = ") || "(sans variable)";
      card.append(el("div", { class: "oh", onclick: () => this.onSelect({ kind: "object", id: obj.oid }) },
        el("span", { class: "cls" }, obj.cls), "  ", label));
      const t = el("table", { class: "kv" });
      const entries = Object.entries(obj.attrs);
      if (!entries.length) t.append(el("tr", {}, el("td", { colspan: 2, class: "muted" }, "aucun attribut")));
      for (const [name, value] of entries) {
        t.append(el("tr", { class: changed.has(`${obj.oid}.${name}`) ? "changed" : "" },
          el("td", {}, name.startsWith("_") ? el("span", { class: "lock", title: "attribut protégé" }, "🔒 ") : "", name),
          el("td", {}, this.valueNode(value))));
      }
      card.append(t);
      objs.append(card);
    }
    root.append(objs);

    if (this.selected && this.selected.kind === "class") {
      const info = model.classes[this.selected.id];
      if (info) root.prepend(this.classCard(info));
    }
  }

  classCard(info) {
    const box = el("div", { class: "card" });
    box.append(el("h4", {}, `Plan : class ${info.qualname}`));
    if (info.user_bases.length) box.append(el("div", { class: "small" }, "Hérite de : ", info.user_bases.join(", ")));
    if (info.owner) box.append(el("div", { class: "small" }, "Classe imbriquée dans : ", info.owner));
    box.append(el("div", { class: "small muted" }, `Ordre de recherche des méthodes (MRO) : ${info.mro.join(" → ")}`));
    const list = el("ul", { class: "small" });
    info.methods.forEach((m) => {
      const kind = { instance: "méthode", static: "statique", class: "de classe", getter: "getter", setter: "setter" }[m.kind];
      list.append(el("li", { html: `<code>${esc(m.name)}</code> — ${kind} (ligne ${m.line})` }));
    });
    if (!info.methods.length) list.append(el("li", { class: "muted" }, "aucune méthode propre"));
    box.append(list);
    return box;
  }
}
