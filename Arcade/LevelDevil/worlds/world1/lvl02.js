// WORLD 1 · LEVEL 2 — "Clockwork"
// The devil's spikes pop on a timer. Learn the rhythm.
Levels.register({
  world: 1,
  level: 2,
  name: "Clockwork",
  tip: "Off-beat spikes. Count the pause.",
  width: 1100,
  spawn: { x: 70, y: 300 },
  exit: { x: 1030, y: 322 },
  solids: [
    { x: 0, y: 380, w: 1100, h: 100, type: "floor" },
    { x: 0, y: 0, w: 1100, h: 40, type: "ceiling" }
  ],
  traps: [
    { type: "popupSpikes", x: 300, y: 380, count: 3, phase: 0 },
    { type: "popupSpikes", x: 520, y: 380, count: 3, phase: 40 },
    { type: "popupSpikes", x: 740, y: 380, count: 2, phase: 80 }
  ]
});