// The bracket assistance of the editor (web/js/editor.js).
import assert from "node:assert/strict";
import test from "node:test";
import { scanBrackets } from "../../web/js/editor.js";

test("pairs of brackets are found, with their depth", () => {
  const code = "print(len([1, 2]), {'a': (3)})";
  const { pairs, depth, bad } = scanBrackets(code);
  assert.equal(bad.size, 0);
  const at = (ch, from = 0) => code.indexOf(ch, from);
  assert.equal(pairs.get(at("(")), code.length - 1);
  assert.equal(pairs.get(at("[")), at("]"));
  assert.equal(depth.get(at("(")), 0);
  assert.equal(depth.get(at("(", 6)), 1);       // len(
  assert.equal(depth.get(at("[")), 2);
  assert.equal(depth.get(at("{")), 1);
});

test("brackets in strings and comments do not count", () => {
  const code = 'x = "(" + f"{y}" + \'[\'  # ) ]\ny = """ ( \n ) """ + str(1)';
  const { pairs, bad } = scanBrackets(code);
  assert.equal(bad.size, 0);
  assert.equal(pairs.size, 2);                   // only str( ... )
});

test("unmatched brackets are reported with a clear message", () => {
  let res = scanBrackets("print((1 + 2)");
  assert.equal(res.bad.size, 1);
  assert.match([...res.bad.values()][0], /jamais fermée/);
  res = scanBrackets("x = 3)");
  assert.match([...res.bad.values()][0], /fermée sans avoir été ouverte/);
  res = scanBrackets("x = [1, 2)");
  assert.equal(res.bad.size, 2);
  assert.ok([...res.bad.values()].some((m) => /ne correspond pas/.test(m)));
});
