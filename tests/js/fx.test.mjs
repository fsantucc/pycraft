// Unit tests of the pure drawing helpers (run with: node --test tests/js).
import assert from "node:assert/strict";
import { test } from "node:test";
import { hash, wrapText } from "../../web/js/fx.js";
import { crierParts } from "../../web/js/models.js";
import { SOUND_NAMES } from "../../web/js/sound.js";
import { TOUR_STEPS } from "../../web/js/tour.js";

// A fake canvas context: every character is 7 px wide.
const ctx = { measureText: (text) => ({ width: String(text).length * 7 }) };

test("hash is deterministic and stays in [0, 1)", () => {
  for (let i = 0; i < 200; i += 1) {
    const value = hash(i, i * 3.7, "x");
    assert.equal(value, hash(i, i * 3.7, "x"));
    assert.ok(value >= 0 && value < 1);
  }
});

test("wrapText never cuts a short text", () => {
  assert.deepEqual(wrapText(ctx, "Bonjour", 300), ["Bonjour"]);
});

test("wrapText wraps long texts on words and keeps every word", () => {
  const text = "Bienvenue au village de PyCraft ! Le forgeron cherche de l'aide pour fabriquer cent épées.";
  const lines = wrapText(ctx, text, 140);
  assert.ok(lines.length > 1);
  for (const line of lines) assert.ok(ctx.measureText(line).width <= 140, line);
  assert.equal(lines.join(" ").replace(/\s+/g, " "), text);
});

test("wrapText keeps the line breaks of the text", () => {
  assert.deepEqual(wrapText(ctx, "a\nb", 300), ["a", "b"]);
});

test("wrapText splits a word longer than the bubble", () => {
  const lines = wrapText(ctx, "x".repeat(100), 70, 20);
  assert.ok(lines.every((l) => l.length <= 10));
  assert.equal(lines.join(""), "x".repeat(100));
});

test("wrapText ends with … when there are too many lines", () => {
  const lines = wrapText(ctx, "x".repeat(100), 70, 3);
  assert.equal(lines.length, 3);
  assert.ok(lines[2].endsWith("…"));
});

test("the crier has the same parts in every frame (no flicker)", () => {
  for (const pose of ["idle", "speak", "ask", "read", "call", "alert", "cheer"]) {
    const a = crierParts(pose, 0);
    const b = crierParts(pose, 1234);
    assert.equal(a.length, b.length, pose);
    a.forEach((p, i) => {
      assert.equal(p.c, b[i].c, `${pose} part ${i} changes color`);
      assert.equal(p.role, b[i].role);
    });
  }
});

test("the crier has two legs, each with a boot", () => {
  const parts = crierParts("idle", 0);
  for (const leg of ["legL", "legR"]) {
    const own = parts.filter((p) => p.role === leg);
    assert.ok(own.length >= 3, leg);
    assert.ok(own.some((p) => p.z === 0), `${leg} touches the ground`);
  }
});

test("sounds and tour steps are defined", () => {
  for (const name of ["bell", "spawn", "boom", "victory", "fail", "achievement"]) {
    assert.ok(SOUND_NAMES.includes(name), name);
  }
  assert.ok(TOUR_STEPS.length >= 5);
  for (const step of TOUR_STEPS) assert.ok(step.target && step.title && step.text);
});
