// Rebuilds the program state at any step of a recorded execution, and
// describes each event in plain French.
import { esc, showValue } from "./util.js";

export class TraceModel {
  constructor(result, files) {
    this.result = result;
    this.files = files || {};
    this.steps = result.steps || [];
    this.pre = result.pre_events || [];
    this.classes = result.classes || {};
    this.count = this.steps.length;
  }

  // State after executing the events attached to steps[0..index].
  stateAt(index) {
    const state = {
      classes: [], objects: new Map(), vars: new Map(), output: [],
      stack: [], index, order: [], maxima: new Map(), error: null,
    };
    const apply = (ev) => this.apply(state, ev);
    this.pre.forEach(apply);
    for (let i = 0; i <= index && i < this.count; i += 1) {
      this.steps[i].events.forEach(apply);
    }
    return state;
  }

  apply(s, ev) {
    switch (ev.type) {
      case "class_def":
        if (!s.classes.includes(ev.cls)) s.classes.push(ev.cls);
        break;
      case "spawn":
        s.objects.set(ev.oid, { oid: ev.oid, cls: ev.cls, attrs: {}, by: ev.by || null, n: s.order.length });
        s.order.push(ev.oid);
        break;
      case "attr_set": {
        const obj = s.objects.get(ev.oid);
        if (!obj) break;
        obj.attrs[ev.name] = ev.new;
        const num = Number(ev.new && (ev.new.t === "int" || ev.new.t === "float") ? ev.new.r : NaN);
        if (!Number.isNaN(num)) {
          const key = `${ev.oid}.${ev.name}`;
          s.maxima.set(key, Math.max(s.maxima.get(key) ?? num, num));
        }
        break;
      }
      case "attr_del": {
        const obj = s.objects.get(ev.oid);
        if (obj) delete obj.attrs[ev.name];
        break;
      }
      case "var_set": s.vars.set(ev.name, ev.value); break;
      case "var_del": s.vars.delete(ev.name); break;
      case "print": s.output.push(ev.text); break;
      case "call": s.stack.push(ev); break;
      case "func_call": s.stack.push({ ...ev, cls: null, method: ev.name }); break;
      case "return":
      case "func_return": s.stack.pop(); break;
      case "error": s.error = ev; break;
      default: break;
    }
  }

  eventsAt(index) {
    if (index < 0) return this.pre;
    return this.steps[index] ? this.steps[index].events : [];
  }

  // Variable names currently bound to each object id.
  static names(state) {
    const names = new Map();
    for (const [name, value] of state.vars) {
      if (value && value.t === "obj") {
        if (!names.has(value.ref)) names.set(value.ref, []);
        names.get(value.ref).push(name);
      }
    }
    return names;
  }
}

const KIND_LABEL = {
  instance: "méthode", static: "méthode statique", class: "méthode de classe",
  getter: "getter (property)", setter: "setter (property)",
};

export function describe(ev, state) {
  const names = state ? TraceModel.names(state) : new Map();
  const who = (oid) => {
    if (!oid) return "?";
    const list = names.get(oid);
    const obj = state && state.objects.get(oid);
    return list ? list[0] : obj ? `un ${obj.cls}` : oid;
  };
  const c = (t) => `<code>${esc(t)}</code>`;
  switch (ev.type) {
    case "class_def":
      return { k: "class", ic: "📐", html: `Plan ${c(ev.cls)} défini : un modèle, <b>aucun objet</b> n'existe encore.` };
    case "spawn": {
      let how = `Nouvel objet ${c(ev.cls)} construit à partir du plan`;
      if (ev.by && ev.by.kind === "classmethod") how += ` par la méthode de classe ${c(ev.by.cls + "." + ev.by.method + "()")} (cls)`;
      else if (ev.via === "__init__") how += " — le constructeur va remplir ses attributs";
      return { k: "spawn", ic: "✨", html: how + "." };
    }
    case "attr_set": {
      const old = ev.old ? showValue(ev.old) : null;
      const base = `${c(who(ev.oid) + "." + ev.name)} : ${old !== null ? esc(old) + " → " : ""}${esc(showValue(ev.new))}`;
      if (ev.protected && !ev.internal) {
        return { k: "bad", ic: "⚠️", html: `${base} — attribut <b>protégé</b> modifié <b>depuis l'extérieur</b> de sa classe !` };
      }
      return { k: "attr", ic: ev.protected ? "🔒" : "✏️", html: base + (old === null ? " (nouvel attribut)" : "") };
    }
    case "attr_del":
      return { k: "attr", ic: "🗑", html: `Attribut ${c(ev.name)} supprimé.` };
    case "var_set":
      if (ev.value.t === "class" || ev.value.t === "function") {
        return { k: "class", ic: "🏷", html: `Le nom ${c(ev.name)} désigne ${esc(showValue(ev.value))}.` };
      }
      if (ev.value.t === "obj") {
        return { k: "spawn", ic: "🏷", html: `La variable ${c(ev.name)} désigne l'objet ${c("<" + ev.value.cls + ">")}.` };
      }
      return { k: "attr", ic: "🪧", html: `Variable ${c(ev.name)} = ${c(showValue(ev.value))} (${esc(ev.value.t)})` };
    case "var_del":
      return { k: "attr", ic: "🗑", html: `Variable ${c(ev.name)} supprimée.` };
    case "call": {
      const args = (ev.args || []).map(([n, v]) => `${n}=${showValue(v)}`).join(", ");
      const sig = `${ev.method}(${args})`;
      if (ev.kind === "static") {
        return { k: "static", ic: "⚙️", html: `${c(ev.cls + "." + sig)} : méthode <b>statique</b>, exécutée sans aucun objet.` };
      }
      if (ev.kind === "class") {
        return { k: "static", ic: "🔷", html: `${c((ev.receiver_cls || ev.cls) + "." + sig)} : méthode <b>de classe</b>, cls = ${c(ev.receiver_cls || ev.cls)}.` };
      }
      if (ev.via_super) {
        return { k: "super", ic: "⬆️", html: `${c("super()." + sig)} depuis ${c(ev.from_cls)} : on exécute la version du parent ${c(ev.cls)} sur ${c(who(ev.oid))}.` };
      }
      if (ev.method === "__init__") {
        return { k: "call", ic: "🔧", html: `Constructeur ${c(ev.cls + ".__init__(" + args + ")")} sur ${c(who(ev.oid))} (self).` };
      }
      const inh = ev.inherited ? ` — méthode <b>héritée</b> de ${c(ev.cls)}` : "";
      return { k: "call", ic: "▶️", html: `${c(who(ev.oid) + "." + sig)}${inh}. self = ${c(who(ev.oid))}` };
    }
    case "return": {
      const val = ev.value && ev.value.t !== "NoneType" ? ` → renvoie ${c(showValue(ev.value))}` : "";
      if (ev.rejected) {
        return { k: "bad", ic: "🛡️", html: `${c(ev.method + "()")} terminée <b>sans rien modifier</b> : valeur refusée, l'objet reste intact${val}.` };
      }
      return { k: "call", ic: "↩️", html: `Fin de ${c((ev.cls ? ev.cls + "." : "") + ev.method + "()")}${val}.` };
    }
    case "func_call": {
      const args = (ev.args || []).map(([n, v]) => `${n}=${showValue(v)}`).join(", ");
      return { k: "call", ic: "🔹", html: `Appel de la fonction ${c(ev.name + "(" + args + ")")}.` };
    }
    case "func_return": {
      const val = ev.value && ev.value.t !== "NoneType" ? ` → renvoie ${c(showValue(ev.value))}` : "";
      return { k: "call", ic: "↩️", html: `Fin de ${c(ev.name + "()")}${val}.` };
    }
    case "module_start":
      return { k: "class", ic: "📦", html: `Import : exécution de ${c(ev.file)} (là-bas, __name__ = ${c(JSON.stringify(ev.name))}).` };
    case "print":
      return { k: "print", ic: "💬", html: `Affiche : ${c(ev.text)}` };
    case "error":
      return { k: "bad", ic: "💥", html: `<b>${esc(ev.etype)}</b> : ${esc(ev.message)}` };
    default:
      return { k: "", ic: "•", html: esc(ev.type) };
  }
}
