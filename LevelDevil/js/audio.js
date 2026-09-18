/* =====================================================================
   LEVEL DEVIL — AUDIO ENGINE v2
   High-quality procedural audio: layered transients, filtered noise,
   a stereo feedback reverb, a mastered compressor bus and a proper
   little music sequencer with real voicings + humanization.
   No external files; everything is synthesized with WebAudio nodes.
   ===================================================================== */
const Audio = (() => {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  let ctx = null;
  let master, comp, sfxBus, musicBus, verbIn, verbOut;
  let noiseBuf = null;
  let footStepCounter = 0;
  let throttleBusy = {};

  /* -------------------------------------------------------------
     GRAPH: master -> compressor -> speakers
            sfxBus  -----------> master ----------+-> reverb send
            musicBus ----------> master ----------+
   ------------------------------------------------------------- */
  function init() {
    if (ctx) {
      if (ctx.state === "suspended") ctx.resume();
      return;
    }
    ctx = new Ctx();

    master = ctx.createGain();
    master.gain.value = 0.9;
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 22;
    comp.ratio.value = 6;
    comp.attack.value = 0.004;
    comp.release.value = 0.22;
    master.connect(comp);
    comp.connect(ctx.destination);

    // stereo-ish feedback reverb: three damped delay taps
    verbIn = ctx.createGain();
    verbIn.gain.value = 0.55;
    verbOut = ctx.createGain();
    verbOut.gain.value = 0.5;
    const taps = [
      { dt: 0.21, fb: 0.42, cut: 2400 },
      { dt: 0.31, fb: 0.38, cut: 1600 },
      { dt: 0.47, fb: 0.26, cut: 900 }
    ];
    for (const tap of taps) {
      const d = ctx.createDelay(2);
      d.delayTime.value = tap.dt;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = tap.cut;
      const g = ctx.createGain();
      g.gain.value = tap.fb;
      const wet = ctx.createGain();
      wet.gain.value = 1;
      verbIn.connect(d);
      d.connect(lp);
      lp.connect(g);
      g.connect(d);
      lp.connect(wet);
      wet.connect(verbOut);
    }
    verbOut.connect(master);

    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.95;
    sfxBus.connect(master);
    sfxBus.connect(verbIn);

    musicBus = ctx.createGain();
    musicBus.gain.value = 0.5;
    musicBus.connect(master);
    musicBus.connect(verbIn);

    // reusable 2s white noise buffer
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  const now = () => (ctx ? ctx.currentTime : 0);
  const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const TICK = 0.012; // music humanization jitter

  /* ---- envelope: attack / decay / sustain / release ---- */
  function env(g, t, peak, a, d, sustain, r) {
    g.gain.setValueAtTime(0.0001, t);
    if (a > 0) g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    g.gain.setValueAtTime(Math.max(0.0002, peak), t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, sustain), t + a + d);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d + r);
  }

  /* ---- filtered noise burst ---- */
  function noise(opts = {}) {
    if (!ctx) return;
    const { dur = 0.1, type = "lowpass", freq = 800, q = 0.8, peak = 0.2,
            a = 0.002, sustain = 0.0, r = 0.05, dest = sfxBus,
            freqEnd = null, t0 = 0, pan = 0 } = opts;
    const t = now() + Math.max(0, t0);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(Math.max(30, freq), t);
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(Math.max(30, freqEnd), t + dur);
    const g = ctx.createGain();
    env(g, t, peak, a, dur - 0.02, sustain, r);
    src.connect(f);
    f.connect(g);
    route(g, dest, pan);
    src.start(t);
    src.stop(t + dur + 0.14);
  }

  /* ---- oscillator with optional pitch glide + pan ---- */
  function osc({ type = "sine", f0 = 440, f1 = null, dur = 0.1, peak = 0.2,
                 a = 0.005, r = 0.05, sustain = 0, dest = sfxBus, t0 = 0,
                 detune = 0, pan = 0 }) {
    if (!ctx) return;
    const t = now() + Math.max(0, t0);
    const o = ctx.createOscillator();
    o.type = type;
    o.detune.value = detune;
    o.frequency.setValueAtTime(Math.max(20, f0), t);
    if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain();
    env(g, t, peak, a, dur - 0.02, sustain, r);
    o.connect(g);
    route(g, dest, pan);
    o.start(t);
    o.stop(t + dur + 0.2);
  }

  function route(g, dest, pan) {
    if (pan && ctx.createStereoPanner) {
      const pn = ctx.createStereoPanner();
      pn.pan.value = pan;
      g.connect(pn);
      pn.connect(dest);
    } else {
      g.connect(dest);
    }
  }

  /* ====================== SFX ====================== */

  function walk() {
    if (!enabled()) return;
    if (now() === 0) return;
    footStepCounter++;
    const alt = footStepCounter % 2;
    const t = now();
    // heavy boot: low body thump + gritty scuff
    osc({ type: "triangle", f0: alt ? 112 : 86, f1: 50, dur: 0.07, peak: 0.3, a: 0.002, r: 0.06 });
    noise({ dur: 0.07, type: "bandpass", freq: alt ? 2100 : 1400, q: 0.6,
            peak: 0.1, a: 0.002, r: 0.06, freqEnd: 500 });
    if (alt) {
      // second quieter scuff as the other foot lands
      noise({ dur: 0.05, type: "lowpass", freq: 900, peak: 0.05, a: 0.002, r: 0.05, t0: 0.05 });
    }
    void t;
  }

  function jump() {
    // air whoosh up + spring lift-off
    noise({ dur: 0.1, type: "bandpass", freq: 700, q: 1.3, peak: 0.09,
            freqEnd: 2600, a: 0.01, r: 0.09 });
    osc({ type: "triangle", f0: 150, f1: 400, dur: 0.18, peak: 0.12, a: 0.01, r: 0.16 });
    osc({ type: "sine", f0: 80, f1: 160, dur: 0.06, peak: 0.08, a: 0.002, r: 0.05 });
  }

  function land() {
    // weighted impact + dust puff
    osc({ type: "sine", f0: 110, f1: 42, dur: 0.09, peak: 0.28, a: 0.002, r: 0.08 });
    noise({ dur: 0.07, type: "lowpass", freq: 800, peak: 0.1, freqEnd: 180, a: 0.002, r: 0.06 });
  }

  function die() {
    // scream (gritty, vibrato), body splat, final whimper
    osc({ type: "sawtooth", f0: 460, f1: 90, dur: 0.6, peak: 0.3, a: 0.02, r: 0.55, detune: 14 });
    osc({ type: "square", f0: 680, f1: 75, dur: 0.45, peak: 0.15, a: 0.02, r: 0.42, detune: -9 });
    osc({ type: "sawtooth", f0: 700, f1: 200, dur: 0.3, peak: 0.1, a: 0.02, r: 0.28, t0: 0.03, detune: 26 });
    noise({ dur: 0.4, type: "lowpass", freq: 800, peak: 0.28, freqEnd: 110, a: 0.01, r: 0.36 });
    noise({ dur: 0.06, type: "bandpass", freq: 3200, q: 2, peak: 0.12, t0: 0.42, r: 0.05 });
    osc({ type: "sine", f0: 300, f1: 75, dur: 0.35, peak: 0.1, a: 0.4, r: 0.22, t0: 0.42 });
  }

  function respawn() {
    // warm rising shimmer
    const notes = [523, 659, 784, 1046];
    notes.forEach((m, i) => {
      osc({ type: "triangle", f0: m, dur: 0.18, peak: 0.12, a: 0.005, r: 0.14, t0: i * 0.07, pan: (i % 2 ? 0.2 : -0.2) });
      osc({ type: "sine", f0: m * 2, dur: 0.22, peak: 0.045, a: 0.005, r: 0.18, t0: i * 0.07 });
    });
    noise({ dur: 0.5, type: "bandpass", freq: 600, q: 1, peak: 0.04, freqEnd: 4200, a: 0.2, r: 0.3 });
  }

  function gate() {
    // heavy iron gate slam with a metallic clank
    osc({ type: "sine", f0: 65, f1: 30, dur: 0.32, peak: 0.5, a: 0.004, r: 0.28 });
    noise({ dur: 0.28, type: "lowpass", freq: 500, peak: 0.4, freqEnd: 130, a: 0.003, r: 0.24 });
    osc({ type: "triangle", f0: 320, f1: 150, dur: 0.12, peak: 0.16, a: 0.002, r: 0.1, t0: 0.02 });
    osc({ type: "square", f0: 190, f1: 60, dur: 0.2, peak: 0.11, a: 0.01, r: 0.18, t0: 0.05 });
  }

  function click() {
    // crisp double-click UI tick
    osc({ type: "square", f0: 1250, f1: 820, dur: 0.07, peak: 0.16, a: 0.001, r: 0.07, pan: 0.15 });
    osc({ type: "sine", f0: 480, f1: 220, dur: 0.06, peak: 0.1, a: 0.002, r: 0.06 });
    noise({ dur: 0.03, type: "highpass", freq: 3000, peak: 0.07, a: 0.001, r: 0.03 });
  }

  function locked() {
    // dull double-thunk: "nuh-uh"
    osc({ type: "sine", f0: 150, f1: 55, dur: 0.11, peak: 0.22, a: 0.004, r: 0.1 });
    osc({ type: "sine", f0: 130, f1: 50, dur: 0.11, peak: 0.18, a: 0.004, r: 0.1, t0: 0.13 });
    noise({ dur: 0.06, type: "lowpass", freq: 350, peak: 0.1, a: 0.002, r: 0.05, t0: 0.02 });
  }

  function levelClear() {
    // triumphant fanfare: riser -> major arpeggio -> sparkle bell
    noise({ dur: 0.35, type: "bandpass", freq: 500, q: 1, peak: 0.08, freqEnd: 3800, a: 0.15, r: 0.2 });
    const seq = [523, 659, 784, 1046, 1319];
    seq.forEach((m, i) => {
      osc({ type: "triangle", f0: m, dur: 0.26, peak: 0.17, a: 0.008, r: 0.22, t0: 0.25 + i * 0.09, pan: (i % 2 ? 0.2 : -0.2) });
      osc({ type: "sine", f0: m * 2, dur: 0.3, peak: 0.05, a: 0.01, r: 0.26, t0: 0.25 + i * 0.09 });
    });
    osc({ type: "sine", f0: 1046, f1: 1568, dur: 0.9, peak: 0.12, a: 0.7, r: 0.4, t0: 0.5 });
    // final chord shimmer
    [523, 659, 784, 1046].forEach((m, i) => {
      osc({ type: "triangle", f0: m, dur: 1.0, peak: 0.07, a: 0.01, r: 0.9, t0: 0.55 + i * 0.03 });
    });
  }

  function unlock() {
    // padlock breaking off: bolt shear -> massive CLANK -> low boom -> triumphant chime
    // 1) metal shear (the bolt snapping)
    noise({ dur: 0.12, type: "highpass", freq: 3800, q: 1.5, peak: 0.28, a: 0.001, r: 0.11, pan: -0.2 });
    osc({ type: "square", f0: 2600, f1: 500, dur: 0.07, peak: 0.16, a: 0.002, r: 0.06, pan: -0.2 });
    // 2) heavy iron CLANK
    osc({ type: "triangle", f0: 480, f1: 90, dur: 0.28, peak: 0.4, a: 0.002, r: 0.26 });
    osc({ type: "square", f0: 220, f1: 70, dur: 0.16, peak: 0.2, a: 0.002, r: 0.14, detune: 8 });
    noise({ dur: 0.1, type: "bandpass", freq: 2200, q: 3, peak: 0.2, a: 0.002, r: 0.09 });
    // 3) low boom that shakes the room
    osc({ type: "sine", f0: 90, f1: 32, dur: 0.65, peak: 0.5, a: 0.003, r: 0.6 });
    noise({ dur: 0.5, type: "lowpass", freq: 320, peak: 0.35, freqEnd: 90, a: 0.003, r: 0.46 });
    // 4) whoosh as the padlock flies off
    noise({ dur: 0.28, type: "bandpass", freq: 700, q: 1, peak: 0.1, freqEnd: 3200, a: 0.08, r: 0.2, t0: 0.15, pan: 0.3 });
    // 5) triumphant chime arpeggio
    [784, 1046, 1319, 1568].forEach((m, i) => {
      osc({ type: "triangle", f0: m, dur: 0.4, peak: 0.14, a: 0.005, r: 0.34, t0: 0.4 + i * 0.08, pan: (i % 2 ? 0.25 : -0.25) });
      osc({ type: "sine", f0: m * 2, dur: 0.5, peak: 0.05, a: 0.006, r: 0.44, t0: 0.4 + i * 0.08 });
    });
  }

  /* ---- trap sounds (which trap DID this) ---- */

  function trapSpike() {
    // metallic ratchet - spikes extend
    osc({ type: "square", f0: 200, f1: 540, dur: 0.12, peak: 0.13, a: 0.004, r: 0.1 });
    noise({ dur: 0.1, type: "bandpass", freq: 2800, q: 2, peak: 0.12, freqEnd: 700, a: 0.003, r: 0.09 });
    osc({ type: "sawtooth", f0: 90, f1: 60, dur: 0.06, peak: 0.08, a: 0.003, r: 0.05, pan: 0.1 });
  }

  function trapCrack() {
    // stone cracking open (growingGap)
    noise({ dur: 0.5, type: "lowpass", freq: 1300, peak: 0.24, q: 1.2, freqEnd: 180, a: 0.02, r: 0.45 });
    osc({ type: "sawtooth", f0: 120, f1: 45, dur: 0.5, peak: 0.22, a: 0.03, r: 0.42 });
    noise({ dur: 0.05, type: "highpass", freq: 3200, q: 2, peak: 0.16, t0: 0.1 });
    noise({ dur: 0.06, type: "highpass", freq: 2600, q: 2, peak: 0.13, t0: 0.26 });
    noise({ dur: 0.09, type: "bandpass", freq: 900, peak: 0.14, t0: 0.34, r: 0.07 });
  }

  function trapSlam() {
    // huge crusher impact with tail
    osc({ type: "sine", f0: 90, f1: 34, dur: 0.32, peak: 0.55, a: 0.002, r: 0.28 });
    noise({ dur: 0.3, type: "lowpass", freq: 420, peak: 0.5, freqEnd: 110, a: 0.002, r: 0.26 });
    osc({ type: "square", f0: 150, f1: 55, dur: 0.13, peak: 0.17, a: 0.004, r: 0.12 });
    noise({ dur: 0.08, type: "bandpass", freq: 1800, q: 2, peak: 0.12, t0: 0.03, r: 0.07 });
  }

  function trapSaw() {
    // spinning blade hiss with warble
    osc({ type: "sawtooth", f0: 150, f1: 120, dur: 0.35, peak: 0.07, a: 0.05, r: 0.3, detune: 12 });
    noise({ dur: 0.4, type: "bandpass", freq: 1700, q: 1.6, peak: 0.09, freqEnd: 700, a: 0.1, r: 0.3 });
  }

  function trapLava() {
    // bubbling magma blobs
    osc({ type: "sine", f0: 90, f1: 130, dur: 0.13, peak: 0.12, a: 0.02, r: 0.1 });
    noise({ dur: 0.13, type: "lowpass", freq: 320, peak: 0.15, freqEnd: 280, a: 0.01, r: 0.11 });
    osc({ type: "sine", f0: 60, f1: 85, dur: 0.16, peak: 0.09, a: 0.02, r: 0.14, t0: 0.04, pan: 0.2 });
  }

  function trapFireball() {
    // flame whoosh + roar
    noise({ dur: 0.24, type: "bandpass", freq: 1000, q: 1.3, peak: 0.18, freqEnd: 2600, a: 0.01, r: 0.2 });
    osc({ type: "sawtooth", f0: 260, f1: 520, dur: 0.18, peak: 0.11, a: 0.01, r: 0.16, detune: 18 });
    noise({ dur: 0.1, type: "lowpass", freq: 1800, peak: 0.08, t0: 0.12, r: 0.08 });
  }

  function trapEvil() {
    // fake door: descending wobble laugh
    osc({ type: "sawtooth", f0: 880, f1: 150, dur: 0.7, peak: 0.22, a: 0.08, r: 0.5, detune: 24 });
    osc({ type: "square", f0: 500, f1: 90, dur: 0.55, peak: 0.12, a: 0.08, r: 0.4, detune: -16 });
    osc({ type: "sawtooth", f0: 600, f1: 120, dur: 0.4, peak: 0.08, a: 0.12, r: 0.3, t0: 0.06, detune: 40 });
    noise({ dur: 0.4, type: "lowpass", freq: 400, peak: 0.16, freqEnd: 110, a: 0.02, r: 0.36 });
  }

  function trapWarp() {
    // teleport squeal + shimmer
    osc({ type: "sine", f0: 150, f1: 950, dur: 0.35, peak: 0.2, a: 0.04, r: 0.3 });
    osc({ type: "sine", f0: 700, f1: 1500, dur: 0.25, peak: 0.07, a: 0.04, r: 0.2, pan: 0.2 });
    noise({ dur: 0.22, type: "bandpass", freq: 4000, q: 2, peak: 0.09, freqEnd: 800, a: 0.02, r: 0.2 });
  }

  function trapShake() {
    // subtle rumble with a growl
    noise({ dur: 0.38, type: "lowpass", freq: 240, peak: 0.15, freqEnd: 80, a: 0.05, r: 0.32 });
    osc({ type: "sine", f0: 66, f1: 44, dur: 0.38, peak: 0.18, a: 0.05, r: 0.32 });
    osc({ type: "sawtooth", f0: 55, f1: 40, dur: 0.3, peak: 0.05, a: 0.05, r: 0.25 });
  }

  function bounce() {
    // synthesized spring boing (boioioing)
    osc({ type: "square", f0: 190, f1: 660, dur: 0.16, peak: 0.13, a: 0.005, r: 0.13 });
    osc({ type: "sine", f0: 300, f1: 800, dur: 0.14, peak: 0.07, a: 0.005, r: 0.12 });
    [0, 0.14, 0.26, 0.36].forEach((o, i) => {
      osc({ type: "sine", f0: 700 - i * 110, f1: 520 - i * 90, dur: 0.11, peak: 0.05, a: 0.004, r: 0.1, t0: o });
    });
  }

  function crumble() {
    // stone shatter: rapid pops + rumble
    noise({ dur: 0.28, type: "bandpass", freq: 1500, q: 1.5, peak: 0.18, freqEnd: 200, a: 0.008, r: 0.26 });
    for (let i = 0; i < 5; i++) {
      noise({ dur: 0.03, type: "highpass", freq: 2500, q: 2, peak: 0.1, t0: i * 0.035, r: 0.02 });
    }
    osc({ type: "sawtooth", f0: 100, f1: 48, dur: 0.22, peak: 0.12, a: 0.02, r: 0.2 });
  }

  /* ---- external mp3 samples (from the user's SoundBoard) ---- */
  const SAMPLES = {
    gunShot: "sounds/pump-shotgun.mp3",
    gunReload: "sounds/gun-reload.mp3",
    gunPew: "sounds/pew.mp3"
  };
  const sndGain = 0.95;

  function sample(name) {
    const url = SAMPLES[name];
    if (!url) return;
    const a = new Audio(url);
    a.volume = sndGain;
    const p = a.play();
    if (p && p.catch) p.catch(() => {});
  }

  function gunShot() { sample("gunShot"); }
  function gunReload() { sample("gunReload"); }
  function gunPew() { sample("gunPew"); }

  const sfx = {
    walk, jump, land, die, respawn, gate, click, locked, levelClear, unlock,
    trapSpike, trapCrack, trapSlam, trapSaw, trapLava, trapFireball,
    trapEvil, trapWarp, trapShake, bounce, crumble,
    gunShot, gunReload, gunPew
  };

  /* ====================== MUSIC ENGINE ====================== */

  let musTimer = null;
  let musStep = 0;
  let musNext = 0;
  let musTheme = null;
  let lastTheme = null;

  const THEMES = {
    lobby: {
      bpm: 62,
      drums: true,
      // warm dreamy voicings: Am(add9) Fmaj9 Cmaj9 G(add9)
      chords: [ [57, 64, 67, 71], [53, 60, 64, 69], [60, 67, 71, 74], [62, 64, 67, 71] ],
      bass: [45, 41, 48, 43],
      melody: [
        0, 0, 76, 0, 72, 0, 74, 72,
        0, 0, 69, 0, 72, 0, 67, 64,
        0, 74, 0, 76, 0, 79, 0, 76,
        0, 0, 71, 0, 67, 0, 69, 62
      ],
      bell: [0, 0, 0, 0, 0, 0, 0, 83,
             0, 0, 0, 0, 0, 0, 0, 76]
    },
    game: {
      bpm: 92,
      drums: true,
      // driving minor loop: Am G F E
      chords: [ [57, 60, 64], [55, 59, 62], [53, 57, 60], [52, 55, 59] ],
      bass: [45, 43, 41, 40],
      melody: [
        0, 76, 0, 72, 74, 0, 72, 0,
        0, 74, 0, 71, 67, 0, 69, 0,
        0, 72, 0, 69, 65, 0, 67, 0,
        0, 71, 0, 64, 71, 0, 76, 71
      ],
      bell: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    }
  };

  function startMusic(name) {
    if (name === musTheme) return;
    stopMusic();
    if (!ctx) return;
    musTheme = name;
    const th = THEMES[name];
    musStep = 0;
    musNext = ctx.currentTime + 0.15;
    const stepDur = 60 / th.bpm / 2;
    function tick() {
      while (musNext < ctx.currentTime + 0.25) {
        playStep(th, musStep, musNext, stepDur);
        musNext += stepDur;
        musStep = (musStep + 1) % 64;
      }
    }
    musTimer = setInterval(tick, 30);
    tick();
  }

  function stopMusic() {
    if (musTimer) { clearInterval(musTimer); musTimer = null; }
    musTheme = null;
  }

  function playStep(th, step, t, stepDur) {
    const bar = Math.floor(step / 8) % th.chords.length;
    const n8 = step % 8;
    const tt = () => now() + (t - now()) + rnd(-TICK, TICK) * 0.4;
    const to = (off) => t - now() + off;

    if (th.drums) {
      if (th.bpm < 80) {
        // lobby: slow heartbeat kick on bars 1 & 3 (steps 0 and 16)
        if (step % 16 === 0 || step % 16 === 8) {
          osc({ type: "sine", f0: 62, f1: 30, dur: 0.4, peak: th.bpm < 80 ? 0.3 : 0.2,
                a: 0.003, r: 0.36, dest: musicBus, t0: to(0) });
        }
        // gentle shimmer on bar ends
        if (step % 16 === 7 || step % 16 === 15) {
          noise({ dur: 0.5, type: "highpass", freq: 5000, peak: 0.05, a: 0.2, r: 0.35, dest: musicBus, t0: to(0), pan: 0.35 });
        }
      } else {
        // game: four-on-the-floor light kick
        if (n8 === 0 || n8 === 4) {
          osc({ type: "sine", f0: 130, f1: 40, dur: 0.2, peak: 0.48, a: 0.002, r: 0.18, dest: musicBus, t0: to(0) });
        }
        // snare on beats 2 & 4
        if (n8 === 2 || n8 === 6) {
          noise({ dur: 0.12, type: "bandpass", freq: 1800, q: 1, peak: 0.17, a: 0.002, r: 0.11, dest: musicBus, t0: to(0) });
        }
        // off-beat hats
        if (n8 === 1 || n8 === 3 || n8 === 5 || n8 === 7) {
          noise({ dur: 0.05, type: "highpass", freq: 6500, peak: n8 === 7 ? 0.1 : 0.07, a: 0.002, r: 0.04, dest: musicBus, t0: to(0), pan: n8 % 2 ? 0.2 : -0.2 });
        }
      }
    }

    // bass: play on step 0 and (game only) step 6 for syncopation
    const bassNote = th.bass[bar];
    if (n8 === 0) {
      osc({ type: "sine", f0: midi(bassNote), f1: midi(bassNote) * 0.985, dur: stepDur * 7,
            peak: th.bpm < 80 ? 0.2 : 0.26, a: 0.04, r: stepDur * 6, dest: musicBus, t0: to(0) });
    }
    if (th.bpm >= 80 && n8 === 6) {
      osc({ type: "sawtooth", f0: midi(bassNote + 7), f1: midi(bassNote + 7) * 0.97, dur: stepDur * 2,
            peak: 0.12, a: 0.01, r: stepDur * 1.8, dest: musicBus, t0: to(0) });
    }

    // chord pad (sustained through the bar)
    if (n8 === 0) {
      const chord = th.chords[bar];
      chord.forEach((m, i) => {
        osc({ type: "triangle", f0: midi(m), dur: stepDur * 7.5, peak: th.bpm < 80 ? 0.085 : 0.06,
              a: stepDur * 1.2, sustain: 0.03, r: stepDur * 3.5, dest: musicBus, t0: to(0), pan: (i % 2 ? 0.2 : -0.2) });
        if (th.bpm < 80) {
          osc({ type: "sine", f0: midi(m) * 2, dur: stepDur * 7.5, peak: 0.02,
                a: stepDur * 1.5, sustain: 0.01, r: stepDur * 3.5, dest: musicBus, t0: to(0) });
        }
      });
      // bass + one more low octave for weight
      osc({ type: "triangle", f0: midi(bassNote - 12), dur: stepDur * 7.5, peak: 0.05,
            a: stepDur * 1.0, sustain: 0.02, r: stepDur * 4, dest: musicBus, t0: to(0) });
    }

    // melody plucks (sparse, humanized velocity)
    const mNote = th.melody[step % th.melody.length];
    if (mNote) {
      const vel = rnd(0.75, 1);
      osc({ type: th.bpm < 80 ? "triangle" : "square", f0: midi(mNote), dur: stepDur * 3,
            peak: (th.bpm < 80 ? 0.09 : 0.052) * vel, a: 0.012, r: stepDur * 2.4,
            dest: musicBus, t0: to(rnd(0, TICK)), pan: rnd(-0.3, 0.3) });
      osc({ type: "sine", f0: midi(mNote) * 2, dur: stepDur * 2.4,
            peak: (th.bpm < 80 ? 0.03 : 0.015) * vel, a: 0.02, r: stepDur * 2,
            dest: musicBus, t0: to(rnd(0, TICK)) });
    }

    // glassy bell (lobby ambience)
    const bellNote = th.bell[step % th.bell.length];
    if (bellNote) {
      osc({ type: "sine", f0: midi(bellNote), dur: 0.9, peak: 0.08, a: 0.01, r: 0.85,
            dest: musicBus, t0: to(0), pan: 0.3 });
      osc({ type: "sine", f0: midi(bellNote + 12), dur: 0.7, peak: 0.03, a: 0.01, r: 0.65, dest: musicBus, t0: to(0) });
    }

    void tt;
  }

  function enable() { init(); }
  function enabled() { return !!ctx; }

  // Safari keeps Web Audio running even after the tab/browser closes unless
  // the page tears the AudioContext down. Stop & suspend on leaving/hiding so
  // quitting the game silences it, and restart the current theme on return.
  function suspendForBackground() {
    if (!ctx) return;
    if (ctx.state === "running") {
      lastTheme = musTheme;
      stopMusic();
      ctx.suspend().catch(() => {});
    }
  }
  function resumeForForeground() {
    if (!ctx) return;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
      if (lastTheme) { startMusic(lastTheme); lastTheme = null; }
    }
  }
  window.addEventListener("pagehide", () => {
    stopMusic();
    if (ctx && ctx.state === "running") ctx.suspend().catch(() => {});
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) suspendForBackground();
    else resumeForForeground();
  });

return {
    init: enable,
    sfx,
    music: { play: startMusic, stop: stopMusic, unlocked: enabled },
    _dbg: () => ({ ctx: ctx ? ctx.state : null, theme: musTheme, lastTheme, timer: !!musTimer })
  };
})();

window.__AUDIO_READY__ = true;