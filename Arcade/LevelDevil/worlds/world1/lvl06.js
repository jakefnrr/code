// WORLD 1 · LEVEL 6 — "Wrong Door"
// One glowing door is kind. The other is a lie.
Levels.register({
  world: 1,
  level: 6,
  name: "Wrong Door",
  tip: "A door that smiles too wide is usually hungry.",
  width: 1100,
  spawn: { x: 70, y: 300 },
  exit: { x: 960, y: 322 },
  solids: [
    { x: 0, y: 380, w: 1100, h: 100, type: "floor" },
    { x: 0, y: 0, w: 1100, h: 40, type: "ceiling" }
  ],
  traps: [
    { type: "spikes", x: 300, y: 380, count: 3 },
    { type: "fakeDoor", x: 520, y: 334, w: 34, h: 46 },
    { type: "popupSpikes", x: 660, y: 380, count: 3, phase: 20 },
    { type: "fakeDoor", x: 820, y: 334, w: 34, h: 46 }
  ]
});