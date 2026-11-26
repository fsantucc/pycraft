// The little dictionary: every entry is complete and short, every word can
// be found (with its plural), and the definitions avoid jargon.
import assert from "node:assert/strict";
import { test } from "node:test";
import { GLOSSARY, lookup } from "../../web/js/glossary.js";

test("every entry has a title, a short definition, and something that finds it", () => {
  const ids = new Set();
  for (const g of GLOSSARY) {
    assert.ok(!ids.has(g.id), `id ${g.id} twice`);
    ids.add(g.id);
    assert.ok(g.title && g.def, g.id);
    assert.ok(g.def.length <= 170, `${g.id}: definition too long (${g.def.length})`);
    assert.ok(g.words.length || (g.code || []).length, g.id);
  }
});

test("the words of the lessons are found, with the plural and in any case", () => {
  assert.equal(lookup("Entrées du programme").id, "entrees");
  assert.equal(lookup("inspecteur").id, "inspecteur");
  assert.equal(lookup("chaînes").id, "chaine");
  assert.equal(lookup("entiers").id, "entier");
  assert.equal(lookup("Méthodes").id, "methode");
  assert.equal(lookup("int", true).id, "entier");
  assert.equal(lookup("input()", true).id, "input");
  assert.equal(lookup("self", true).id, "self");
  assert.equal(lookup("chat"), null);
});

test("definitions use everyday words (no unexplained jargon in them)", () => {
  const jargon = /\b(instancier|itérable|itérateur|scope|runtime|compiler|interpréteur|syntaxique|booléenne|callable|namespace)\b/i;
  for (const g of GLOSSARY) assert.ok(!jargon.test(`${g.def} ${g.more || ""}`), g.id);
});
