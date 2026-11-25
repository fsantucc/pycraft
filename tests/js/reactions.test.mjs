// The code → world rules: an event of the program changes the scene, and
// stepping back and forth always gives the same world.
import assert from "node:assert/strict";
import { test } from "node:test";
import { matches, replay } from "../../web/js/reactions.js";

const rules = [
  { on: { print: "nuit tombe" }, do: [["night", true], ["mob", "Zombie", [0, 4]], ["say", "ancien", "Vite !"]] },
  { on: { call: "allumer_lanterne" }, do: [["light", "lantern", true], ["flee"], ["pose", "ancien", "cheer"]] },
  { on: { print: "rentrent chez eux" }, do: [["light", "house", true], ["open", "house", true]] },
];
const P = (text) => ({ type: "print", text });
const CALL = { type: "func_call", name: "allumer_lanterne" };

test("patterns: print (any case), call, method, spawn, set, error", () => {
  assert.ok(matches({ print: "nuit tombe" }, P("La NUIT TOMBE...")));
  assert.ok(!matches({ print: "nuit" }, { type: "var_set", name: "nuit" }));
  assert.ok(matches({ call: "allumer_lanterne" }, CALL));
  assert.ok(!matches({ call: "allumer_lanterne" }, { type: "func_call", name: "autre" }));
  assert.ok(matches({ call: "Forge.chauffer" }, { type: "call", cls: "main.Forge", method: "chauffer" }));
  assert.ok(matches({ call: "chauffer" }, { type: "call", cls: "Forge", method: "chauffer" }));
  assert.ok(matches({ spawn: "Golem" }, { type: "spawn", cls: "main.Golem", oid: "o1" }));
  assert.ok(matches({ set: "pv" }, { type: "attr_set", name: "pv", oid: "o1" }));
  assert.ok(matches({ error: true }, { type: "error" }));
  assert.ok(!matches({}, P("rien")), "an empty pattern matches nothing");
});

test("level 1.1: night falls, the lantern lights up, the house too", () => {
  const before = replay(rules, [[], [P("La nuit tombe...")]]);
  assert.equal(before.state.night, true);
  assert.equal(before.state.props.lantern, undefined, "the lantern is still out");
  assert.equal(before.state.mobs.length, 1, "a zombie lurks in the dark");
  assert.deepEqual(before.news.map((n) => n.kind), ["nightfall", "mob", "say"]);

  const lit = replay(rules, [[], [P("La nuit tombe...")], [CALL]]);
  assert.equal(lit.state.props.lantern.on, true);
  assert.equal(lit.state.mobs.length, 0, "the light drives the zombie away");
  assert.deepEqual(lit.news.map((n) => n.kind), ["ignite", "flee", "pose"]);
  // Transient actions of earlier steps are not replayed.
  assert.ok(!lit.news.some((n) => n.kind === "say"));

  const home = replay(rules, [[], [P("La nuit tombe...")], [CALL], [P("La lanterne s'allume.")], [P("Les villageois rentrent chez eux.")]]);
  assert.equal(home.state.props.house.on, true);
  assert.equal(home.state.props.house.open, true);
});

test("a second call keeps the lantern lit (no toggle)", () => {
  const twice = replay(rules, [[P("La nuit tombe...")], [CALL], [P("Plus tard...")], [CALL]]);
  assert.equal(twice.state.props.lantern.on, true);
  assert.deepEqual(twice.news.map((n) => n.kind), ["relight", "pose"], "the second call rekindles, it does not light from scratch");
});

test("the state only depends on the events, not on the order of visits", () => {
  const batches = [[P("La nuit tombe...")], [CALL], [P("Les villageois rentrent chez eux.")]];
  const a = replay(rules, batches).state;
  replay(rules, batches.slice(0, 1));
  const b = replay(rules, batches).state;
  assert.deepEqual(a, b);
  assert.deepEqual(replay([], batches).state, { night: false, props: {}, mobs: [], fired: 0 });
});
