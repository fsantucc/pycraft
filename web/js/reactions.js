// Code → world. What the program does changes the scene of the level: the
// night falls when the program says so, the lantern lights up when the
// function that lights it is called, the villagers go home…
//
// The rules come with the scene of each level (server/curriculum/scenes.py,
// `react`). A rule: { on: <event pattern>, do: [[action, ...args], ...] }.
//
// Patterns (all optional, all must match):
//   print: "text"        a printed line containing the text (any case;
//                        "" for any line)
//   call: "name"         a call of the function / method `name`
//                        ("Class.method" for a precise method, "*" any)
//   spawn: "Class"       a new object of the class ("*": of any class)
//   raise: true          an exception is raised (caught or not)
//   caught: true         an exception is caught by an except
//   set: "attr"          an attribute assigned (on any object)
//   var: "name"          a variable assigned ("value": "True" to also
//                        check the value, as Python shows it)
//   yield: true          a generator produces a value
//   input: true          the program asks a question (input())
//   error: true          the program stops on an error
//   returns: "name"      the function `name` returns
//
// Actions that change the state of the scene (replayed from the start of
// the run, so stepping back and forth always shows the same world):
//   ["night", true|false]         night falls / day breaks
//   ["light", target, true|false] a prop lights up / goes out
//   ["open", target, true|false]  a door, a chest, a gate opens / closes
//   ["grow", target]              one more floor, one more plank…
//   ["mob", model, [ds, dd]]      a creature comes near (6 at most: the
//                                 oldest leaves; the next ones stand
//                                 around the first place)
//   ["flee"]                      the creatures run away
// Actions that only happen when the step is played (not when jumping):
//   ["pulse", target]  ["say", npc, text]  ["pose", npc, pose]
//   ["sound", name]    ["burst", target, color]
// A target is a type of prop of the scene ("lantern", "house"…).

const STATEFUL = new Set(["night", "light", "open", "grow", "mob", "flee"]);

const short = (name) => String(name || "").split(".").pop();

export function matches(when, ev) {
  if (!when || !ev) return false;
  let any = false;
  if (when.print !== undefined) {
    if (ev.type !== "print" || !String(ev.text).toLowerCase().includes(String(when.print).toLowerCase())) return false;
    any = true;
  }
  if (when.call !== undefined) {
    const name = String(when.call);
    if (ev.type === "func_call") {
      if (ev.name !== name && name !== "*") return false;
    } else if (ev.type === "call") {
      const full = `${short(ev.cls)}.${ev.method}`;
      if (name === "*" ? ev.method === "__init__" : ev.method !== name && full !== name) return false;
    } else {
      return false;
    }
    any = true;
  }
  if (when.returns !== undefined) {
    if (ev.type !== "func_return" && ev.type !== "return") return false;
    if ((ev.name || ev.method) !== when.returns) return false;
    any = true;
  }
  if (when.spawn !== undefined) {
    if (ev.type !== "spawn" || (when.spawn !== "*" && short(ev.cls) !== when.spawn)) return false;
    any = true;
  }
  if (when.set !== undefined) {
    if (ev.type !== "attr_set" || ev.name !== when.set) return false;
    any = true;
  }
  if (when.var !== undefined) {
    if (ev.type !== "var_set" || ev.name !== when.var) return false;
    any = true;
  }
  if (when.value !== undefined) {
    const v = ev.value || ev.new;
    if (!v || String(v.r) !== String(when.value)) return false;
    any = true;
  }
  if (when.yield) {
    if (ev.type !== "yield") return false;
    any = true;
  }
  if (when.raise) {
    if (ev.type !== "raise") return false;
    any = true;
  }
  if (when.caught) {
    if (ev.type !== "caught") return false;
    any = true;
  }
  if (when.input) {
    if (ev.type !== "input") return false;
    any = true;
  }
  if (when.error) {
    if (ev.type !== "error") return false;
    any = true;
  }
  return any;
}

export function emptyState() {
  return { night: false, props: {}, mobs: [], fired: 0 };
}

function propState(state, target) {
  if (!state.props[target]) state.props[target] = {};
  return state.props[target];
}

// Apply the stateful actions of a rule. Returns the "news" (what changed),
// for the animation of the step.
export function applyActions(state, actions, ruleIndex) {
  const news = [];
  for (const [kind, ...args] of actions) {
    switch (kind) {
      case "night":
        if (state.night !== !!args[0]) news.push({ kind: args[0] ? "nightfall" : "daybreak" });
        state.night = !!args[0];
        break;
      case "light": {
        const p = propState(state, args[0]);
        const on = args[1] !== false;
        news.push({ kind: on ? (p.on ? "relight" : "ignite") : "extinguish", target: args[0] });
        p.on = on;
        break;
      }
      case "open": {
        const p = propState(state, args[0]);
        const open = args[1] !== false;
        if (p.open !== open) news.push({ kind: open ? "opened" : "closed", target: args[0] });
        p.open = open;
        break;
      }
      case "grow": {
        const p = propState(state, args[0]);
        p.count = (p.count || 0) + 1;
        news.push({ kind: "grew", target: args[0], count: p.count });
        break;
      }
      case "mob": {
        state.made = (state.made || 0) + 1;
        const id = `react-${ruleIndex}-${state.made}`;
        const [ds, dd] = args[1] || [0, 4];
        const k = (state.made - 1) % 6;
        state.mobs.push({ id, model: args[0], at: [ds + (k % 3) * 0.9, dd + Math.floor(k / 3) * 1.1] });
        if (state.mobs.length > 6) state.mobs.shift();
        news.push({ kind: "mob", id, model: args[0] });
        break;
      }
      case "flee":
        if (state.mobs.length) news.push({ kind: "flee", ids: state.mobs.map((m) => m.id) });
        state.mobs = [];
        break;
      default:
        news.push({ kind, args });
    }
  }
  return news;
}

// The state of the scene after the events (in order), and what the events
// of the last batch (`last`) did — to animate the current step.
export function replay(rules, batches) {
  const state = emptyState();
  let news = [];
  if (!rules || !rules.length) return { state, news };
  batches.forEach((events, b) => {
    const lastBatch = b === batches.length - 1;
    for (const ev of events || []) {
      rules.forEach((rule, ri) => {
        if (!matches(rule.on, ev)) return;
        state.fired += 1;
        const got = applyActions(state, (rule.do || []).filter((a) => STATEFUL.has(a[0]) || lastBatch), ri);
        if (lastBatch) news = news.concat(got);
      });
    }
  });
  return { state, news };
}

// Same, from a trace model (TraceModel) at a step.
export function reactionState(rules, model, index) {
  const batches = [model.eventsAt(-1)];
  for (let i = 0; i <= index; i += 1) batches.push(model.eventsAt(i));
  return replay(rules, batches);
}
