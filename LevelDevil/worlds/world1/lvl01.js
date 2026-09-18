// WORLD 1 · LEVEL 1 — "The Gate"
// A gentle first lesson: run, jump, hop a platform, learn the cracks.
Levels.register({
  world: 1,
  level: 1,
  name: "The Gate",
  tip: "Touch the glowing door. Mind the teeth.",
  width: 1200,
  spawn: { x: 70, y: 300 },
  exit: { x: 1120, y: 322 },
  solids: [
    { x: 0, y: 380, w: 1200, h: 100, type: "floor" },
    { x: 0, y: 0, w: 1200, h: 40, type: "ceiling" },
    { x: 520, y: 300, w: 100, h: 18, type: "platform" }
  ],
  traps: [
    { type: "spikes", x: 280, y: 380, count: 2 },
    { type: "spikes", x: 430, y: 380, count: 3 },
    { type: "popupSpikes", x: 640, y: 380, count: 2, phase: 0 },
    { type: "growingGap", x: 850, max: 100, trigger: 140, speed: 1.4 },
    { type: "spikes", x: 1010, y: 380, count: 2 }
  ]
});