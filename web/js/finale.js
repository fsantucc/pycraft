// The finale: the cinematic of the last level, "Le Cœur du Monde".
//
// It builds up in five movements — darkness, a sleeping heart, the four
// seals of the adventure lighting up one by one, the awakening, the burst —
// then the guardian of the Heart speaks. It shows the place and its mystery
// without telling what the mission is about.
//
// The same movements end the trailer of the game (faster, with its own
// words): see heartSequence().
//
// Like every cinematic it can be paused, rewound and advanced step by step:
// each step sets the whole state of the place (heart, seals, camera,
// caption) when it starts.
import { Cinematic, lineDuration } from "./cinematic.js";
import { HEART, SEALS, heartPulse, heartWave, sealTop, setHeart } from "./coeur.js";
import { sound } from "./sound.js";

const H = [HEART.x, HEART.y, HEART.z];

// The words of the finale (title, subtitle) for each movement.
const FINALE_WORDS = {
  prologue: ["", "Au-delà de toutes les régions…"],
  sleeping: ["", "…bat un cœur endormi."],
  seals: ["", "Quatre sceaux. Quatre épreuves déjà traversées."],
  awakening: ["", ""],
  burst: ["Le Cœur du Monde", "La dernière région · l'aboutissement de ton voyage"],
};

// The movements of the Heart, as cinematic steps.
// words: { prologue, sleeping, seals, awakening, burst } -> [title, sub]
// say(title, sub, big): shows the words. pace: < 1 is faster.
// only: the movements to keep (all by default).
export function heartSequence(world, { words = FINALE_WORDS, say, pace = 1, only = null } = {}) {
  const ms = (t) => Math.round(t * pace);
  const beat = () => {
    heartPulse(world);
    sound.play("heartbeat");
  };
  const show = (key, big = false) => {
    const [title, sub] = words[key] || ["", ""];
    say(title, sub, big);
  };
  const sealAt = (i, dz = -1.2) => {
    const [x, y, z] = sealTop(SEALS[i]);
    return [x + 1, y + 1, z + dz];
  };
  const steps = {
    prologue: {
      label: "Prologue",
      dur: ms(3400),
      enter: () => {
        setHeart(world, { awake: 0, seals: 0, beat: 1700 });
        world.fadeIn(ms(1500));
        world.shot({ at: [16, 16, 7], zoom: 0.5 }, { at: [7, 7, 3.5], zoom: 0.72 }, ms(3400));
        show("prologue");
        sound.play("drone");
      },
      cues: [[ms(1900), beat]],
    },
    sleeping: {
      label: "Le Cœur endormi",
      dur: ms(3500),
      enter: () => {
        setHeart(world, { awake: 0, seals: 0, beat: 1700 });
        world.fadeIn(ms(500));
        world.shot({ at: [H[0] + 1.6, H[1] + 1.6, H[2] - 1], zoom: 1.35 }, { at: H, zoom: 2.0 }, ms(3500));
        show("sleeping");
      },
      cues: [250, 1350, 2450].map((t) => [ms(t), beat]),
    },
    seals: {
      label: "Les quatre sceaux",
      dur: ms(4300),
      enter: () => {
        setHeart(world, { awake: 0, seals: 0, beat: 1500 });
        world.fadeIn(ms(400));
        world.shot({ at: sealAt(0), zoom: 1.05 }, { at: sealAt(3), zoom: 1.05 }, ms(4300));
        show("seals");
      },
      cues: SEALS.map((seal, i) => [ms(450 + i * 900), () => {
        setHeart(world, { seals: i + 1 });
        world.flashScreen(`${seal.color}55`, 260);
        sound.play("chime", { note: [72, 76, 79, 84][i] });
      }]),
    },
    awakening: {
      label: "L'éveil",
      dur: ms(3200),
      enter: () => {
        setHeart(world, { awake: 1, seals: 4, beat: 800 });
        world.shot({ at: [5, 5, 2.5], zoom: 0.72 }, { at: [0.5, 0.5, 3.2], zoom: 0.95 }, ms(3200));
        show("awakening");
        sound.play("riser");
      },
      cues: [0, 650, 1200, 1650, 2050, 2380, 2650, 2880, 3080].map((t, i) => [ms(t), () => {
        beat();
        world.shakeCamera(1.5 + i * 0.9, 260);
      }]),
    },
    burst: {
      label: "Le Cœur du Monde",
      dur: ms(3900),
      enter: () => {
        setHeart(world, { awake: 1, seals: 4, beat: 1100 });
        heartWave(world);
        world.fadeIn(ms(1100), "#fff6e0");
        world.shakeCamera(16, 900);
        world.particles.burst(() => world.project(...H), {
          count: 90, colors: ["#ffe7a0", "#ff8aa0", "#9ff7f2", "#ffffff"], speed: 280, up: 30, gravity: 30, size: 5, life: 1800, glow: true,
        });
        world.shot({ at: [1.5, 1.5, 3.2], zoom: 0.92 }, { at: [3.5, 3.5, 2.6], zoom: 0.82 }, ms(3900));
        show("burst", true);
        sound.play("impact");
      },
      cues: [1500, 2800].map((t) => [ms(t), beat]),
    },
  };
  return (only || Object.keys(steps)).map((key) => ({ key, ...steps[key] }));
}

export function finaleCinematic(world, scene, options = {}) {
  const { passed = false, onEnd = null, onStop = null } = options;
  // Name tags stay hidden while the place shows itself.
  const say = (title, sub, big = false) => {
    world.quiet = true;
    world.setCaption({ title, sub, big });
  };
  const steps = heartSequence(world, { say });
  // Then the guardian of the Heart speaks (the camera comes back to the
  // characters). The seals that lit up go out again: the mission will be to
  // light them for good.
  const lines = scene.intro || [];
  lines.forEach(([id, text], i) => {
    const dur = lineDuration(text) + 200;
    const fading = i === 1;
    steps.push({
      label: `Réplique ${i + 1}`,
      dur: fading ? Math.max(dur, 3600) : dur,
      enter: () => {
        world.camShot = null;
        setHeart(world, { awake: 1, seals: i === 0 || fading ? 4 : 0, beat: 1300 });
        world.npcSay(id, text, { dur: dur + 1200 });
      },
      cues: fading ? [1500, 1850, 2200, 2550].map((t, k) => [t, () => {
        setHeart(world, { seals: 3 - k });
        sound.play("chime", { note: [67, 64, 60, 55][k] });
      }]) : [[400, () => {
        heartPulse(world);
        sound.play("heartbeat");
      }]],
    });
  });
  // At the end the place shows its real state: still waiting, or awake if
  // the mission is already done.
  const settle = () => setHeart(world, passed ? { awake: 2, seals: 4, beat: 1000 } : { awake: 1, seals: 0, beat: 1300 });
  return new Cinematic(world, {
    ...options,
    steps,
    kind: "finale",
    onEnd: () => { settle(); if (onEnd) onEnd(); },
    onStop: () => { settle(); if (onStop) onStop(); },
  });
}
