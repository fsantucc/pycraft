// « Comprendre »: the passage of the course that explains the line being run
// (level 1.3 as the example).
import assert from "node:assert/strict";
import { test } from "node:test";
import { bestPassage } from "../../web/js/lesson.js";

const P = (text, code) => ({ text, code });
const COURSE = [
  P("input(\"Question : \") affiche la question… puis renvoie ce texte.", "input(\"Question : \")"),
  P("Attention : input() renvoie toujours une chaîne… int(\"5\") donne le nombre 5.", "input() str 5 int(\"5\") 5"),
  P("\"5\" + \"3\" vaut \"53\" (on colle deux textes) ;", "\"5\" + \"3\" \"53\""),
  P("int(\"5\") + int(\"3\") vaut 8.", "int(\"5\") + int(\"3\") 8"),
  P("Les opérateurs : + - *, / , // (17 // 5 = 3) et % (17 % 5 = 2).", "+ - * / // %"),
  P("Dans PyCraft, ce que l'utilisateur tape se règle dans Entrées du programme.", "input()"),
];

test("each line of the 1.3 demo lights the passage that explains it", () => {
  assert.equal(bestPassage(COURSE, '    texte = input("Quel âge as-tu ? ")'), 0);
  assert.equal(bestPassage(COURSE, "    age = int(texte)"), 1);
  assert.equal(bestPassage(COURSE, '    print("Dans 10 ans, tu auras", age + 10, "ans")'), 3);
  assert.equal(bestPassage(COURSE, '    print("Texte collé :", texte + "10")'), 2);
  assert.equal(bestPassage(COURSE, '    print("17 // 5 =", 17 // 5, "et 17 % 5 =", 17 % 5)'), 4);
});

test("a line the course does not talk about lights nothing", () => {
  assert.equal(bestPassage(COURSE, "demander_age()"), -1);
  assert.equal(bestPassage(COURSE, ""), -1);
  // A word inside a string is not code: no false match.
  assert.equal(bestPassage(COURSE, 'nom = "input"'), -1);
});
