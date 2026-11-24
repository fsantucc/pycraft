// Sound effects, synthesized with the Web Audio API: no audio files, works
// offline. The player can mute them (the choice is remembered).

const KEY = "pycraft.muted";

// Each sound is a list of notes: [delay s, frequency Hz, duration s, wave,
// volume, slide-to frequency]. "noise" plays a short filtered noise burst.
const SOUNDS = {
  click: [[0, 880, 0.04, "square", 0.05]],
  bell: [[0, 1318, 0.5, "sine", 0.12], [0, 1975, 0.35, "sine", 0.05], [0.12, 1318, 0.4, "sine", 0.07]],
  spawn: [[0, 330, 0.12, "triangle", 0.12, 660], [0.08, 660, 0.18, "triangle", 0.1, 990]],
  build: [[0, 220, 0.08, "square", 0.06], [0.09, 330, 0.08, "square", 0.06], [0.18, 440, 0.12, "square", 0.06]],
  blip: [[0, 620, 0.06, "square", 0.05, 760]],
  ask: [[0, 520, 0.12, "triangle", 0.1, 780]],
  zap: [[0, 1400, 0.25, "sawtooth", 0.07, 120]],
  boom: [[0, "noise", 0.6, "noise", 0.35], [0, 90, 0.5, "sine", 0.3, 40]],
  pop: [[0, 300, 0.08, "sine", 0.15, 900], [0.06, 1200, 0.1, "triangle", 0.08]],
  twinkle: [[0, 1568, 0.12, "sine", 0.07], [0.07, 2093, 0.15, "sine", 0.06]],
  spot: [[0, 440, 0.15, "triangle", 0.08], [0.15, 440, 0.15, "triangle", 0.08]],
  shield: [[0, 200, 0.18, "square", 0.08, 140]],
  victory: [[0, 523, 0.14, "square", 0.08], [0.13, 659, 0.14, "square", 0.08], [0.26, 784, 0.14, "square", 0.08],
    [0.39, 1047, 0.45, "square", 0.09], [0.39, 523, 0.45, "triangle", 0.08]],
  fail: [[0, 392, 0.18, "square", 0.07], [0.17, 330, 0.18, "square", 0.07], [0.34, 262, 0.35, "square", 0.07]],
  achievement: [[0, 784, 0.1, "triangle", 0.1], [0.09, 988, 0.1, "triangle", 0.1], [0.18, 1175, 0.1, "triangle", 0.1],
    [0.27, 1568, 0.5, "sine", 0.12], [0.27, 2349, 0.4, "sine", 0.04]],
  xp: [[0, 988, 0.08, "square", 0.06], [0.07, 1318, 0.16, "square", 0.06]],
  hint: [[0, 660, 0.1, "sine", 0.08], [0.1, 880, 0.18, "sine", 0.08]],
};

class SoundBoard {
  constructor() {
    this.ctx = null;
    this.muted = false;
    try {
      this.muted = localStorage.getItem(KEY) === "1";
    } catch {
      this.muted = false;
    }
    this.last = {};
    this.listeners = [];
  }

  // Browsers only allow audio after a user gesture: the context is created
  // lazily, on the first sound played after a click or a key press.
  context() {
    if (this.ctx) return this.ctx;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.7;
    this.master.connect(this.ctx.destination);
    return this.ctx;
  }

  setMuted(value) {
    this.muted = value;
    try {
      localStorage.setItem(KEY, value ? "1" : "0");
    } catch {
      // storage unavailable: the choice lasts for this session only
    }
    this.listeners.forEach((fn) => fn(value));
  }

  onChange(fn) {
    this.listeners.push(fn);
  }

  play(name) {
    if (this.muted) return;
    const notes = SOUNDS[name];
    if (!notes) return;
    const now = performance.now();
    if (now - (this.last[name] || 0) < 90) return; // no machine-gun effect
    this.last[name] = now;
    const ctx = this.context();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const t0 = ctx.currentTime + 0.01;
    for (const [delay, freq, dur, wave, vol, slide] of notes) {
      const start = t0 + delay;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(vol, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      gain.connect(this.master);
      if (wave === "noise") {
        const length = Math.floor(ctx.sampleRate * dur);
        const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 900;
        src.connect(filter);
        filter.connect(gain);
        src.start(start);
        src.stop(start + dur);
      } else {
        const osc = ctx.createOscillator();
        osc.type = wave;
        osc.frequency.setValueAtTime(freq, start);
        if (slide) osc.frequency.exponentialRampToValueAtTime(slide, start + dur);
        osc.connect(gain);
        osc.start(start);
        osc.stop(start + dur + 0.02);
      }
    }
  }
}

export const sound = new SoundBoard();
export const SOUND_NAMES = Object.keys(SOUNDS);
