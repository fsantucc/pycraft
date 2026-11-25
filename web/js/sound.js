// PyCraft audio engine: everything is synthesized with the Web Audio API
// (no audio file, works offline).
//
//   sources ─► per-sound gain ─► stereo panner ─┬─► bus (effects / voices / music) ─► master ─► compressor ─► out
//                                               └─► reverb send ─► convolver (generated hall) ─┘
//
// * effects: each event of the program has its own instrument (FM bell for
//   the crier, marimba for method calls, explosion, zap, fanfare…), with a
//   little random variation so that nothing sounds like a machine gun;
// * voices: the characters "talk" in syllables (formant-filtered babble),
//   each with his own pitch, while their speech bubble is written;
// * music: a calm procedural ambience, different in each region (scale,
//   tempo, instruments), generated note by note — never the same loop.
//
// The player chooses the volume of each part; the choice is remembered.

const KEY = "pycraft.audio";
const OLD_KEY = "pycraft.muted";
const DEFAULTS = { muted: false, master: 0.8, sfx: 0.85, voice: 0.7, music: 0.4, musicOn: true };

const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (list) => list[Math.floor(Math.random() * list.length)];

// --------------------------------------------------------------- graph
function makeImpulse(ctx, seconds = 2.6, decay = 3.2) {
  const rate = ctx.sampleRate;
  const length = Math.floor(rate * seconds);
  const buffer = ctx.createBuffer(2, length, rate);
  for (let ch = 0; ch < 2; ch += 1) {
    const data = buffer.getChannelData(ch);
    let last = 0;
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      last = last * 0.6 + white * 0.4; // a little darker than white noise
      data[i] = last * (1 - i / length) ** decay;
    }
  }
  return buffer;
}

function makeNoise(ctx) {
  const length = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
}

export function buildGraph(ctx) {
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.knee.value = 12;
  comp.ratio.value = 4;
  comp.attack.value = 0.004;
  comp.release.value = 0.2;
  comp.connect(ctx.destination);
  const master = ctx.createGain();
  master.connect(comp);
  const reverb = ctx.createConvolver();
  reverb.buffer = makeImpulse(ctx);
  const wet = ctx.createGain();
  wet.gain.value = 0.9;
  reverb.connect(wet);
  wet.connect(master);
  const bus = {};
  for (const name of ["sfx", "voice", "music"]) {
    bus[name] = ctx.createGain();
    bus[name].connect(master);
  }
  return { ctx, master, comp, reverb, bus, noise: makeNoise(ctx) };
}

// An output for one sound: volume, stereo position, and how much of it
// goes to the reverb.
function voiceOut(g, busName, { vol = 1, pan = 0, verb = 0.2 } = {}) {
  const { ctx } = g;
  const gain = ctx.createGain();
  gain.gain.value = vol;
  let node = gain;
  if (ctx.createStereoPanner) {
    const p = ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    gain.connect(p);
    node = p;
  }
  node.connect(g.bus[busName]);
  if (verb > 0) {
    const send = ctx.createGain();
    send.gain.value = verb;
    node.connect(send);
    send.connect(g.reverb);
  }
  return gain;
}

// ------------------------------------------------------- instruments
function envelope(param, t, { a = 0.005, peak = 1, d = 0.2, s = 0, hold = 0, r = 0.2 }) {
  param.cancelScheduledValues(t);
  param.setValueAtTime(0.0001, t);
  param.linearRampToValueAtTime(peak, t + a);
  if (s > 0) {
    param.setTargetAtTime(peak * s, t + a, d / 3);
    param.setTargetAtTime(0.0001, t + a + d + hold, r / 4);
  } else {
    param.setTargetAtTime(0.0001, t + a, d / 3);
  }
  return t + a + d + hold + r + 0.1;
}

function osc(g, type, freq, t, stop) {
  const o = g.ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.start(t);
  o.stop(stop);
  return o;
}

// Hand bell: FM synthesis with an inharmonic modulator (ratio 3.5).
function bell(g, out, t, freq, vol = 0.3, dur = 1.8) {
  const amp = g.ctx.createGain();
  amp.connect(out);
  const end = envelope(amp.gain, t, { a: 0.002, peak: vol, d: dur });
  const car = osc(g, "sine", freq, t, end);
  const mod = osc(g, "sine", freq * 3.5, t, end);
  const index = g.ctx.createGain();
  index.gain.setValueAtTime(freq * 2.2, t);
  index.gain.exponentialRampToValueAtTime(freq * 0.05, t + dur * 0.5);
  mod.connect(index);
  index.connect(car.frequency);
  car.connect(amp);
  const shimmer = g.ctx.createGain();
  shimmer.connect(out);
  const end2 = envelope(shimmer.gain, t, { a: 0.002, peak: vol * 0.25, d: dur * 0.45 });
  osc(g, "sine", freq * 2.76, t, end2).connect(shimmer);
}

// Wooden mallet: a sine plus a quickly fading 4th partial.
function marimba(g, out, t, freq, vol = 0.25, dur = 0.45) {
  const amp = g.ctx.createGain();
  amp.connect(out);
  const end = envelope(amp.gain, t, { a: 0.002, peak: vol, d: dur });
  osc(g, "sine", freq, t, end).connect(amp);
  const hi = g.ctx.createGain();
  hi.connect(out);
  const end2 = envelope(hi.gain, t, { a: 0.001, peak: vol * 0.45, d: dur * 0.18 });
  osc(g, "sine", freq * 3.99, t, end2).connect(hi);
}

// Plucked string / soft piano: triangle + sine through a closing filter.
function pluck(g, out, t, freq, vol = 0.22, dur = 1.2, bright = 3200) {
  const filter = g.ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.Q.value = 0.8;
  filter.frequency.setValueAtTime(bright, t);
  filter.frequency.exponentialRampToValueAtTime(Math.max(200, freq * 1.5), t + dur * 0.6);
  const amp = g.ctx.createGain();
  filter.connect(amp);
  amp.connect(out);
  const end = envelope(amp.gain, t, { a: 0.004, peak: vol, d: dur });
  const a = osc(g, "triangle", freq, t, end);
  const b = osc(g, "sine", freq * 2, t, end);
  b.detune.value = 4;
  const bg = g.ctx.createGain();
  bg.gain.value = 0.3;
  a.connect(filter);
  b.connect(bg);
  bg.connect(filter);
}

// Warm pad: a soft saw and a triangle per note, detuned, through two
// low-pass filters whose cutoff breathes slowly.
function pad(g, out, t, freqs, dur, vol = 0.06, cutoff = 900) {
  const f1 = g.ctx.createBiquadFilter();
  const f2 = g.ctx.createBiquadFilter();
  for (const f of [f1, f2]) {
    f.type = "lowpass";
    f.Q.value = 0.4;
    f.frequency.setValueAtTime(cutoff * 0.7, t);
    f.frequency.linearRampToValueAtTime(cutoff, t + dur * 0.5);
    f.frequency.linearRampToValueAtTime(cutoff * 0.6, t + dur + 1.2);
  }
  f1.connect(f2);
  const amp = g.ctx.createGain();
  f2.connect(amp);
  amp.connect(out);
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.linearRampToValueAtTime(vol, t + Math.min(1.6, dur * 0.4));
  amp.gain.setValueAtTime(vol, t + dur * 0.7);
  amp.gain.linearRampToValueAtTime(0.0001, t + dur + 1.2);
  for (const f of freqs) {
    for (const [type, det, level] of [["triangle", -6, 1], ["triangle", 6, 1], ["sawtooth", 0, 0.25]]) {
      const o = osc(g, type, f, t, t + dur + 1.3);
      o.detune.value = det;
      const lg = g.ctx.createGain();
      lg.gain.value = level;
      o.connect(lg);
      lg.connect(f1);
    }
  }
}

function noise(g, out, t, { dur = 0.3, vol = 0.3, type = "lowpass", freq = 1200, to = null, q = 0.7, a = 0.003 } = {}) {
  const src = g.ctx.createBufferSource();
  src.buffer = g.noise;
  src.loop = true;
  const filter = g.ctx.createBiquadFilter();
  filter.type = type;
  filter.Q.value = q;
  filter.frequency.setValueAtTime(freq, t);
  if (to) filter.frequency.exponentialRampToValueAtTime(to, t + dur);
  const amp = g.ctx.createGain();
  src.connect(filter);
  filter.connect(amp);
  amp.connect(out);
  const end = envelope(amp.gain, t, { a, peak: vol, d: dur });
  src.start(t, Math.random() * 1.5);
  src.stop(end);
}

function thump(g, out, t, f0 = 140, f1 = 45, dur = 0.35, vol = 0.5) {
  const amp = g.ctx.createGain();
  amp.connect(out);
  const end = envelope(amp.gain, t, { a: 0.002, peak: vol, d: dur });
  const o = osc(g, "sine", f0, t, end);
  o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.8);
  o.connect(amp);
}

function chip(g, out, t, freq, dur = 0.08, vol = 0.12, type = "square", to = null) {
  const filter = g.ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 3500;
  const amp = g.ctx.createGain();
  filter.connect(amp);
  amp.connect(out);
  const end = envelope(amp.gain, t, { a: 0.002, peak: vol, d: dur, s: 0.6, hold: dur * 0.5, r: 0.04 });
  const o = osc(g, type, freq, t, end);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  o.connect(filter);
}

// One syllable of a voice: a buzzy source through two formant filters.
const VOWELS = { a: [800, 1150], e: [400, 2100], i: [300, 2300], o: [450, 800], u: [325, 700], é: [500, 1800] };
function syllable(g, out, t, pitch, vol, vowel, dur, glide) {
  const [f1, f2] = VOWELS[vowel] || VOWELS.a;
  const amp = g.ctx.createGain();
  amp.connect(out);
  const end = envelope(amp.gain, t, { a: 0.008, peak: vol, d: dur, s: 0.7, hold: dur * 0.4, r: 0.03 });
  const src = osc(g, "sawtooth", pitch, t, end);
  src.frequency.linearRampToValueAtTime(pitch * glide, t + dur);
  for (const [f, q, gain] of [[f1, 6, 1], [f2, 8, 0.6]]) {
    const bp = g.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = f;
    bp.Q.value = q;
    const fg = g.ctx.createGain();
    fg.gain.value = gain;
    src.connect(bp);
    bp.connect(fg);
    fg.connect(amp);
  }
}

// ------------------------------------------------------------ effects
const PENTA = [0, 2, 4, 7, 9];
const scaleNote = (root, scale, step) => root + scale[((step % scale.length) + scale.length) % scale.length] + 12 * Math.floor(step / scale.length);

// name: (g, out, t, opts, state) => void. `opts.pan` places the sound.
const SOUNDS = {
  click(g, out, t) {
    noise(g, out, t, { dur: 0.02, vol: 0.25, type: "bandpass", freq: 3200, q: 2 });
    marimba(g, out, t, rand(1700, 1900), 0.08, 0.05);
  },
  tick(g, out, t) {
    marimba(g, out, t, rand(2300, 2500), 0.05, 0.04);
  },
  // The crier's bell: each print plays the next note of a little tune.
  bell(g, out, t, opts, st) {
    st.bellStep = (st.bellStep || 0) + pick([-2, -1, 1, 1, 2]);
    if (st.bellStep > 7 || st.bellStep < -2) st.bellStep = 2;
    const f = mtof(scaleNote(84, PENTA, st.bellStep));
    bell(g, out, t, f, 0.16, 1.6);
  },
  // Method call: a marimba note, higher when the call is deeper.
  blip(g, out, t, opts) {
    const depth = Math.min(6, opts.depth || 0);
    marimba(g, out, t, mtof(scaleNote(67, PENTA, depth + (Math.random() < 0.3 ? 1 : 0))), 0.2, 0.35);
  },
  spawn(g, out, t) {
    noise(g, out, t, { dur: 0.35, vol: 0.12, type: "bandpass", freq: 600, to: 4000, q: 1.5, a: 0.05 });
    [0, 2, 4].forEach((s, i) => pluck(g, out, t + 0.06 + i * 0.06, mtof(scaleNote(72, PENTA, s + 2)), 0.14, 0.6));
    bell(g, out, t + 0.22, mtof(91), 0.05, 0.8);
  },
  build(g, out, t) {
    for (let i = 0; i < 3; i += 1) {
      noise(g, out, t + i * 0.11, { dur: 0.06, vol: 0.35, type: "bandpass", freq: rand(700, 900), q: 3 });
      thump(g, out, t + i * 0.11, 260, 120, 0.08, 0.25);
    }
    pad(g, out, t + 0.3, [mtof(60), mtof(67), mtof(76)], 0.4, 0.05, 2200);
    bell(g, out, t + 0.34, mtof(88), 0.08, 1.2);
  },
  ask(g, out, t) {
    marimba(g, out, t, mtof(74), 0.18, 0.25);
    marimba(g, out, t + 0.12, mtof(79), 0.2, 0.5);
  },
  zap(g, out, t) {
    chip(g, out, t, 1800, 0.22, 0.09, "sawtooth", 90);
    noise(g, out, t, { dur: 0.25, vol: 0.18, type: "highpass", freq: 3000, q: 0.7 });
    chip(g, out, t + 0.05, 1200, 0.18, 0.05, "square", 70);
  },
  boom(g, out, t) {
    noise(g, out, t, { dur: 1.2, vol: 0.5, type: "lowpass", freq: 3500, to: 70, q: 0.9 });
    thump(g, out, t, 120, 30, 0.9, 0.7);
    noise(g, out, t + 0.05, { dur: 0.5, vol: 0.2, type: "highpass", freq: 2500, q: 0.5 });
  },
  pop(g, out, t) {
    chip(g, out, t, 400, 0.06, 0.12, "sine", 1400);
    marimba(g, out, t + 0.07, mtof(76), 0.16, 0.3);
    marimba(g, out, t + 0.15, mtof(84), 0.16, 0.45);
  },
  twinkle(g, out, t) {
    [0, 2, 4, 5].forEach((s, i) => bell(g, out, t + i * 0.07, mtof(scaleNote(84, PENTA, s)), 0.05, 0.7));
  },
  shield(g, out, t) {
    bell(g, out, t, 520, 0.12, 0.5);
    noise(g, out, t, { dur: 0.08, vol: 0.25, type: "bandpass", freq: 2500, q: 4 });
    thump(g, out, t, 180, 90, 0.15, 0.2);
  },
  spot(g, out, t) {
    bell(g, out, t, mtof(81), 0.12, 1.0);
    bell(g, out, t + 0.3, mtof(81), 0.06, 1.0);
  },
  hint(g, out, t) {
    [0, 4, 7, 11].forEach((s, i) => pluck(g, out, t + i * 0.09, mtof(72 + s), 0.12, 1.2, 5000));
  },
  xp(g, out, t) {
    chip(g, out, t, mtof(88), 0.06, 0.07);
    chip(g, out, t + 0.07, mtof(95), 0.14, 0.07);
  },
  page(g, out, t) {
    noise(g, out, t, { dur: 0.22, vol: 0.14, type: "bandpass", freq: 2200, to: 900, q: 0.9, a: 0.02 });
  },
  whoosh(g, out, t) {
    noise(g, out, t, { dur: 0.35, vol: 0.3, type: "bandpass", freq: 400, to: 2400, q: 1.2, a: 0.08 });
  },
  // A flame catching (a lantern, a torch, a furnace): a soft breath of
  // air, then a warm crackle.
  ignite(g, out, t) {
    noise(g, out, t, { dur: 0.45, vol: 0.28, type: "bandpass", freq: 300, to: 1600, q: 0.9, a: 0.06 });
    for (let i = 0; i < 5; i += 1) noise(g, out, t + 0.18 + i * 0.07 + rand(0, 0.03), { dur: 0.03, vol: 0.16, type: "highpass", freq: rand(2500, 4500), q: 1 });
    bell(g, out, t + 0.12, mtof(79), 0.05, 0.6);
  },
  // Metal on metal (an anvil, a gate).
  clang(g, out, t) {
    bell(g, out, t, rand(880, 940), 0.16, 0.9);
    bell(g, out, t, rand(1310, 1390), 0.08, 0.6);
    noise(g, out, t, { dur: 0.06, vol: 0.25, type: "highpass", freq: 3000, q: 0.8 });
  },
  splash(g, out, t) {
    noise(g, out, t, { dur: 0.5, vol: 0.32, type: "lowpass", freq: 2600, to: 500, q: 0.6, a: 0.01 });
    for (let i = 0; i < 4; i += 1) chip(g, out, t + 0.08 + i * 0.06, rand(900, 1600), 0.05, 0.04, "sine", rand(300, 600));
  },
  // A wooden door or a lid.
  door(g, out, t) {
    noise(g, out, t, { dur: 0.3, vol: 0.2, type: "bandpass", freq: 700, to: 350, q: 3, a: 0.04 });
    thump(g, out, t + 0.26, 140, 70, 0.4, 0.18);
  },
  // A creature answers: a short voice, its pitch says which one.
  creature(g, out, t, opts = {}) {
    const f = opts.pitch || 220;
    chip(g, out, t, f, 0.16, 0.22, "sawtooth", f * 0.7);
    chip(g, out, t + 0.12, f * 0.85, 0.12, 0.18, "triangle", f * 0.6);
    noise(g, out, t, { dur: 0.25, vol: 0.08, type: "bandpass", freq: f * 3, q: 2 });
  },
  victory(g, out, t) {
    const chords = [[60, 64, 67], [65, 69, 72], [67, 71, 74], [72, 76, 79, 84]];
    chords.forEach((ch, i) => {
      const at = t + i * 0.16 + (i === 3 ? 0.08 : 0);
      ch.forEach((m) => pluck(g, out, at, mtof(m), i === 3 ? 0.13 : 0.1, i === 3 ? 2.2 : 0.5, 4200));
    });
    [72, 76, 79, 84].forEach((m, i) => chip(g, out, t + i * 0.16, mtof(m + 12), 0.12, 0.035));
    pad(g, out, t + 0.56, [mtof(48), mtof(60), mtof(64), mtof(67)], 1.4, 0.08, 1500);
    bell(g, out, t + 0.56, mtof(96), 0.08, 2.4);
    noise(g, out, t + 0.56, { dur: 1.4, vol: 0.03, type: "highpass", freq: 7000, q: 0.5, a: 0.02 });
  },
  fail(g, out, t) {
    pluck(g, out, t, mtof(67), 0.14, 0.4, 1600);
    pluck(g, out, t + 0.18, mtof(63), 0.14, 0.4, 1400);
    pluck(g, out, t + 0.36, mtof(60), 0.15, 1.0, 1000);
    thump(g, out, t + 0.36, 110, 55, 0.3, 0.25);
  },
  achievement(g, out, t) {
    [0, 2, 4, 5, 7].forEach((s, i) => bell(g, out, t + i * 0.06, mtof(scaleNote(79, PENTA, s)), 0.08, 1.0));
    pad(g, out, t + 0.3, [mtof(67), mtof(71), mtof(74), mtof(79)], 1.0, 0.07, 1700);
    noise(g, out, t + 0.3, { dur: 1.0, vol: 0.025, type: "highpass", freq: 7500, q: 0.5 });
  },
  levelup(g, out, t) {
    [60, 64, 67, 72, 76, 79, 84].forEach((m, i) => chip(g, out, t + i * 0.05, mtof(m + 12), 0.1, 0.04));
    pad(g, out, t + 0.35, [mtof(60), mtof(67), mtof(72), mtof(76)], 1.2, 0.09, 1500);
    bell(g, out, t + 0.35, mtof(96), 0.1, 2);
  },
  // --- the finale of the last level
  heartbeat(g, out, t) {
    thump(g, out, t, 78, 38, 0.28, 0.85);
    thump(g, out, t + 0.24, 70, 34, 0.34, 0.6);
    noise(g, out, t, { dur: 0.3, vol: 0.12, type: "lowpass", freq: 180, q: 0.8 });
  },
  drone(g, out, t) {
    pad(g, out, t, [mtof(38), mtof(45), mtof(50), mtof(57)], 3.2, 0.1, 520);
    noise(g, out, t, { dur: 3.4, vol: 0.06, type: "bandpass", freq: 300, to: 1100, q: 1.4, a: 1.2 });
  },
  chime(g, out, t, opts) {
    const note = opts.note || 76;
    bell(g, out, t, mtof(note), 0.16, 2.4);
    bell(g, out, t + 0.04, mtof(note + 12), 0.05, 1.6);
    pad(g, out, t, [mtof(note - 24), mtof(note - 17)], 1.2, 0.04, 1600);
  },
  riser(g, out, t) {
    noise(g, out, t, { dur: 2.6, vol: 0.2, type: "bandpass", freq: 180, to: 5200, q: 2.2, a: 2.2 });
    chip(g, out, t, 70, 2.6, 0.03, "sawtooth", 420);
  },
  impact(g, out, t) {
    noise(g, out, t, { dur: 2.2, vol: 0.5, type: "lowpass", freq: 5000, to: 60, q: 0.8 });
    thump(g, out, t, 110, 28, 1.4, 0.75);
    [84, 91, 96, 100].forEach((m, i) => bell(g, out, t + i * 0.05, mtof(m), 0.07, 3.2));
    pad(g, out, t + 0.05, [mtof(38), mtof(50), mtof(57), mtof(62), mtof(66)], 3.0, 0.08, 1700);
  },
  step(g, out, t) {
    noise(g, out, t, { dur: 0.05, vol: rand(0.12, 0.18), type: "lowpass", freq: rand(500, 800), q: 1 });
  },
};

// Bus, volume and reverb of each sound.
const MIX = {
  click: ["sfx", 0.6, 0.05], tick: ["sfx", 0.5, 0.05], bell: ["sfx", 0.9, 0.35], blip: ["sfx", 0.8, 0.2],
  spawn: ["sfx", 1, 0.35], build: ["sfx", 0.9, 0.3], ask: ["sfx", 0.9, 0.25], zap: ["sfx", 0.9, 0.2],
  boom: ["sfx", 1, 0.45], pop: ["sfx", 0.9, 0.25], twinkle: ["sfx", 0.9, 0.5], shield: ["sfx", 0.9, 0.25],
  spot: ["sfx", 0.8, 0.45], hint: ["sfx", 0.9, 0.45], xp: ["sfx", 0.8, 0.15], page: ["sfx", 0.8, 0.15],
  whoosh: ["sfx", 0.8, 0.2], victory: ["sfx", 1, 0.4], fail: ["sfx", 0.9, 0.35], achievement: ["sfx", 1, 0.5],
  levelup: ["sfx", 1, 0.45], step: ["sfx", 0.6, 0.05],
  heartbeat: ["sfx", 1, 0.2], drone: ["sfx", 0.9, 0.6], chime: ["sfx", 1, 0.6], riser: ["sfx", 0.9, 0.45],
  impact: ["sfx", 1, 0.5],
<<<<<<< HEAD
=======
  ignite: ["sfx", 0.9, 0.35], clang: ["sfx", 0.8, 0.4], splash: ["sfx", 0.8, 0.3], door: ["sfx", 0.8, 0.2],
  creature: ["sfx", 0.8, 0.25],
>>>>>>> c46f881 (lastfeatures)
};
const DUCK = new Set(["victory", "achievement", "levelup", "boom", "fail", "impact", "drone", "riser"]);

// ------------------------------------------------------------- music
// One mood per region: scale, root note, tempo, chord progression (scale
// degrees), and how busy the melody is.
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const LYDIAN = [0, 2, 4, 6, 7, 9, 11];
const PHRYGIAN = [0, 1, 3, 5, 7, 8, 10];
export const MOODS = {
  village: { root: 60, scale: MAJOR, bpm: 76, chords: [0, 5, 3, 4], density: 0.45, lead: "pluck", cutoff: 1400 },
  mine: { root: 57, scale: MINOR, bpm: 62, chords: [0, 5, 3, 6], density: 0.22, lead: "marimba", cutoff: 700, drips: true },
  atelier: { root: 62, scale: MAJOR, bpm: 84, chords: [0, 3, 4, 0], density: 0.5, lead: "marimba", cutoff: 1500 },
  citadelle: { root: 55, scale: DORIAN, bpm: 68, chords: [0, 3, 0, 6], density: 0.3, lead: "pluck", cutoff: 1000 },
  forge: { root: 50, scale: MINOR, bpm: 66, chords: [0, 0, 5, 4], density: 0.25, lead: "pluck", cutoff: 650, drone: true },
  labo: { root: 64, scale: LYDIAN, bpm: 72, chords: [0, 1, 0, 4], density: 0.4, lead: "bell", cutoff: 1800 },
  tour: { root: 52, scale: MINOR, bpm: 64, chords: [0, 5, 2, 6], density: 0.3, lead: "bell", cutoff: 1100 },
  royaume: { root: 55, scale: MAJOR, bpm: 80, chords: [0, 4, 5, 3], density: 0.5, lead: "pluck", cutoff: 1600 },
  faille: { root: 53, scale: PHRYGIAN, bpm: 60, chords: [0, 1, 0, 6], density: 0.3, lead: "bell", cutoff: 600, drone: true },
  biblio: { root: 65, scale: MAJOR, bpm: 70, chords: [0, 3, 5, 4], density: 0.38, lead: "pluck", cutoff: 1300 },
  coeur: { root: 62, scale: LYDIAN, bpm: 56, chords: [0, 4, 5, 3], density: 0.28, lead: "bell", cutoff: 1300, drone: true, drips: true },
  // The trailer: the journey (bright, quick), then the approach of the end
  // (minor, slower, a drone underneath).
  voyage: { root: 60, scale: MAJOR, bpm: 96, chords: [0, 5, 3, 4], density: 0.55, lead: "pluck", cutoff: 1800 },
  approche: { root: 57, scale: MINOR, bpm: 62, chords: [0, 5, 6, 4], density: 0.34, lead: "bell", cutoff: 850, drone: true },
};

class Music {
  constructor(board) {
    this.board = board;
    this.mood = MOODS.village;
    this.timer = null;
    this.next = 0;
    this.beat = 0;
    this.melody = 7;
  }

  setMood(name) {
    this.mood = MOODS[name] || MOODS.village;
  }

  start() {
    if (this.timer) return;
    const g = this.board.graph;
    if (!g) return;
    this.next = g.ctx.currentTime + 0.3;
    this.beat = 0;
    this.timer = setInterval(() => this.schedule(), 120);
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
  }

  // Look-ahead scheduler: plans the notes of the next half second.
  schedule() {
    const g = this.board.graph;
    if (!g || g.ctx.state !== "running") return;
    const m = this.mood;
    const beatLen = 60 / m.bpm / 2; // eighth notes
    while (this.next < g.ctx.currentTime + 0.6) {
      this.playBeat(g, this.next, m, beatLen);
      this.next += beatLen;
      this.beat += 1;
    }
  }

  playBeat(g, t, m, beatLen) {
    const bar = Math.floor(this.beat / 8);
    const inBar = this.beat % 8;
    const degree = m.chords[bar % m.chords.length];
    const chord = [0, 2, 4].map((k) => m.root + scaleNote(0, m.scale, degree + k));
    const out = (vol, verb, pan = 0) => voiceOut(g, "music", { vol, verb, pan });
    if (inBar === 0) {
      pad(g, out(1, 0.6), t, chord.map((n) => mtof(n - 12)), beatLen * 8, 0.05, m.cutoff);
      const bass = out(1, 0.2);
      const amp = g.ctx.createGain();
      amp.connect(bass);
      const end = envelope(amp.gain, t, { a: 0.02, peak: 0.12, d: beatLen * 6 });
      osc(g, "sine", mtof(chord[0] - 24), t, end).connect(amp);
      if (m.drone && bar % 2 === 0) pad(g, out(1, 0.5), t, [mtof(m.root - 24)], beatLen * 16, 0.03, 400);
    }
    // Melody: a random walk on the scale, resting often, landing on chord tones.
    const strong = inBar % 2 === 0;
    if (Math.random() < m.density * (strong ? 1 : 0.5)) {
      this.melody += pick([-2, -1, -1, 1, 1, 2, 0]);
      this.melody = Math.max(3, Math.min(13, this.melody));
      let note = m.root + scaleNote(0, m.scale, this.melody);
      if (strong && Math.random() < 0.6) note = chord[Math.floor(Math.random() * 3)] + 12;
      const pan = rand(-0.4, 0.4);
      const vol = rand(0.06, 0.1);
      if (m.lead === "bell") bell(g, out(1, 0.55, pan), t, mtof(note + 12), vol * 0.6, 2.2);
      else if (m.lead === "marimba") marimba(g, out(1, 0.45, pan), t, mtof(note), vol * 1.4, 0.6);
      else pluck(g, out(1, 0.5, pan), t, mtof(note), vol, 1.6, 2400);
    }
    if (m.drips && Math.random() < 0.06) bell(g, out(1, 0.8, rand(-0.8, 0.8)), t, mtof(pick([96, 98, 101, 103])), 0.025, 0.5);
    if (inBar === 4 && Math.random() < 0.15) bell(g, out(1, 0.7, rand(-0.6, 0.6)), t, mtof(chord[2] + 24), 0.02, 1.5);
  }
}

// --------------------------------------------------------------- board
class SoundBoard {
  constructor() {
    this.graph = null;
    this.settings = { ...DEFAULTS };
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "null");
      if (saved) this.settings = { ...DEFAULTS, ...saved };
      else if (localStorage.getItem(OLD_KEY) === "1") this.settings.muted = true;
    } catch {
      this.settings = { ...DEFAULTS };
    }
    this.last = {};
    this.state = {};
    this.listeners = [];
    this.music = new Music(this);
    this.unlock = () => {
      this.context();
      if (!this.held && this.graph && this.graph.ctx.state === "suspended") this.graph.ctx.resume().catch(() => {});
      this.updateMusic();
    };
    // Browsers only allow audio after a gesture of the player.
    if (typeof window !== "undefined") {
      window.addEventListener("pointerdown", this.unlock, { once: false, passive: true });
      window.addEventListener("keydown", this.unlock, { once: false });
    }
  }

  get muted() {
    return this.settings.muted;
  }

  context() {
    if (this.graph) return this.graph.ctx;
    const Ctx = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
    if (!Ctx) return null;
    this.graph = buildGraph(new Ctx());
    this.applyVolumes();
    return this.graph.ctx;
  }

  applyVolumes() {
    const g = this.graph;
    if (!g) return;
    const s = this.settings;
    const now = g.ctx.currentTime;
    g.master.gain.setTargetAtTime(s.muted ? 0 : s.master, now, 0.05);
    g.bus.sfx.gain.setTargetAtTime(s.sfx, now, 0.05);
    g.bus.voice.gain.setTargetAtTime(s.voice, now, 0.05);
    g.bus.music.gain.setTargetAtTime(s.musicOn ? s.music * 0.6 : 0, now, 0.3);
  }

  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.settings));
    } catch {
      // storage unavailable: the settings last for this session only
    }
    this.applyVolumes();
    this.updateMusic();
    this.listeners.forEach((fn) => fn(this.settings));
  }

  set(key, value) {
    this.settings[key] = value;
    this.save();
  }

  setMuted(value) {
    this.set("muted", value);
  }

  onChange(fn) {
    this.listeners.push(fn);
  }

  updateMusic() {
    if (!this.graph || this.graph.ctx.state !== "running") return;
    if (this.settings.musicOn && !this.settings.muted) this.music.start();
    else this.music.stop();
  }

  setMood(theme) {
    if (!this.moodLock) this.music.setMood(theme);
  }

  // The trailer chooses its own music, whatever the place shown (null: the
  // places choose again).
  lockMood(name) {
    this.moodLock = name || null;
    if (name) this.music.setMood(name);
  }

  // Silence of the music for a dramatic pause, then it comes back slowly.
  // seconds = 0: back at once.
  hush(seconds = 0) {
    const g = this.graph;
    if (!g) return;
    const now = g.ctx.currentTime;
    const full = this.settings.musicOn ? this.settings.music * 0.6 : 0;
    g.bus.music.gain.cancelScheduledValues(now);
    if (seconds > 0) {
      g.bus.music.gain.setTargetAtTime(0, now, 0.12);
      g.bus.music.gain.setTargetAtTime(full, now + seconds, 1.2);
    } else {
      g.bus.music.gain.setTargetAtTime(full, now, 0.2);
    }
  }

  duck(seconds = 2) {
    const g = this.graph;
    if (!g || !this.settings.musicOn) return;
    const now = g.ctx.currentTime;
    const full = this.settings.music * 0.6;
    g.bus.music.gain.cancelScheduledValues(now);
    g.bus.music.gain.setTargetAtTime(full * 0.3, now, 0.05);
    g.bus.music.gain.setTargetAtTime(full, now + seconds, 0.6);
  }

  // ------------------------------------------------ cinematics
  // While a cinematic plays, its sounds are kept: when the player jumps to
  // another step they are cut at once (no voice of the previous step
  // talking over the next one). The music is never cut.
  capture(on) {
    this.capturing = on;
    if (!on) this.captured = [];
  }

  keep(node, busName) {
    if (this.capturing && busName !== "music") {
      this.captured = (this.captured || []).filter((n) => !n.done);
      this.captured.push(node);
    }
    return node;
  }

  cut() {
    const g = this.graph;
    for (const node of this.captured || []) {
      try {
        if (g) {
          node.gain.cancelScheduledValues(g.ctx.currentTime);
          node.gain.setTargetAtTime(0, g.ctx.currentTime, 0.02);
        }
        setTimeout(() => node.disconnect(), 200);
      } catch {
        // already gone
      }
      node.done = true;
    }
    this.captured = [];
  }

  // Pause: the whole sound (voices, effects, music) stops exactly where it
  // is, and starts again from there.
  hold(on) {
    this.held = on;
    const g = this.graph;
    if (!g) return;
    if (on) g.ctx.suspend().catch(() => {});
    else if (!this.settings.muted || g.ctx.state === "suspended") g.ctx.resume().catch(() => {});
  }

  // play("bell"), play("blip", { depth: 2, pan: -0.3 })
  play(name, opts = {}) {
    if (this.settings.muted) return;
    const make = SOUNDS[name];
    if (!make) return;
    const now = performance.now();
    if (now - (this.last[name] || 0) < 70) return; // no machine-gun effect
    this.last[name] = now;
    const ctx = this.context();
    if (!ctx) return;
    if (ctx.state === "suspended" && !this.held) ctx.resume().catch(() => {});
    const [busName, vol, verb] = MIX[name] || ["sfx", 1, 0.2];
    const gain = opts.gain === undefined ? 1 : opts.gain;
    const out = this.keep(voiceOut(this.graph, busName, { vol: vol * gain, verb, pan: opts.pan || 0 }), busName);
    make(this.graph, out, ctx.currentTime + 0.01, opts, this.state);
    if (DUCK.has(name)) this.duck(name === "victory" || name === "levelup" ? 3 : 1.6);
  }

  // A character speaks: one syllable every ~70 ms while his text appears.
  // profile: { pitch (Hz), speed } — the same character keeps his voice.
  voice(text, profile = {}, opts = {}) {
    if (this.settings.muted) return;
    const ctx = this.context();
    if (!ctx) return;
    if (ctx.state === "suspended" && !this.held) ctx.resume().catch(() => {});
    const letters = String(text).replace(/[^A-Za-zÀ-ÿ0-9]/g, "");
    const count = Math.max(2, Math.min(16, Math.round(letters.length / 3)));
    const pitch = profile.pitch || 180;
    const gap = profile.speed || 0.075;
    const out = this.keep(voiceOut(this.graph, "voice", { vol: 0.5, verb: 0.15, pan: opts.pan || 0 }), "voice");
    const vowels = Object.keys(VOWELS);
    let t = ctx.currentTime + 0.02;
    const question = /\?\s*$/.test(text);
    for (let i = 0; i < count; i += 1) {
      const last = i === count - 1;
      const contour = 1 + 0.08 * Math.sin(i * 1.7) + (last ? (question ? 0.18 : -0.1) : 0);
      const dur = gap * rand(0.7, 1.1);
      syllable(this.graph, out, t, pitch * contour * rand(0.96, 1.04), 0.6, pick(vowels), dur, last ? (question ? 1.15 : 0.88) : rand(0.97, 1.03));
      t += gap * rand(0.9, 1.3) + (Math.random() < 0.12 ? gap : 0);
    }
  }
}

export const sound = new SoundBoard();
export const SOUND_NAMES = Object.keys(SOUNDS);

// For the tests and the audio preview: renders sounds into an offline
// context. items: [[name, opts]] or [["voice", text, profile]].
export async function renderOffline(OfflineCtx, items, seconds = 2.5, rate = 22050) {
  const ctx = new OfflineCtx(2, Math.ceil(rate * seconds * items.length), rate);
  const g = buildGraph(ctx);
  g.master.gain.value = 0.8;
  const state = {};
  items.forEach(([name, a, b], i) => {
    const t = 0.05 + i * seconds;
    if (name === "voice") {
      const out = voiceOut(g, "voice", { vol: 0.5, verb: 0.15 });
      const vowels = Object.keys(VOWELS);
      const count = Math.max(2, Math.min(16, Math.round(String(a).length / 3)));
      for (let k = 0; k < count; k += 1) syllable(g, out, t + k * 0.085, (b && b.pitch) || 180, 0.6, vowels[k % vowels.length], 0.07, 1);
    } else if (name.startsWith("music:")) {
      const music = new Music({ graph: g });
      music.setMood(name.slice(6));
      const beatLen = 60 / music.mood.bpm / 2;
      for (let k = 0; k * beatLen < seconds - 0.5; k += 1) {
        music.beat = k;
        music.playBeat(g, t + k * beatLen, music.mood, beatLen);
      }
    } else {
      const [busName, vol, verb] = MIX[name] || ["sfx", 1, 0.2];
      SOUNDS[name](g, voiceOut(g, busName, { vol, verb }), t, a || {}, state);
    }
  });
  return ctx.startRendering();
}
