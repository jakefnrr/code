// WORLD 1 · LEVEL 10 — "Devil's Ledge"
// A final run through the world's language: ground saws, a ceiling drop,
// ground saws, a ceiling drop, and a lava door that opens on a patient rhythm.
Levels.register({
  world: 1,
  level: 10,
  name: "Devil's Ledge",
  tip: "Wait out the lava, then jump through the door while it falls.",
  width: 1600,
  spawn: { x: 70, y: 300 },
  exit: { x: 1510, y: 322 },
  solids: [
    { x: 0, y: 380, w: 1600, h: 100, type: "floor" },
    { x: 0, y: 0, w: 1600, h: 40, type: "ceiling" }
  ],
  traps: [
    { type: "crusher", x: 180, y: 40, dist: 300, speed: 1.5, rest: 24 },
    { type: "growingGap", x: 430, max: 125, trigger: 110, speed: 1.7 },
    { type: "saw", x: 650, y: 360, axis: "x", range: 75, speed: 1.7, size: 40 },
    { type: "popupSpikes", x: 820, y: 380, count: 3, phase: 28 },
    { type: "ceilingSpikes", x: 980, y: 40, count: 4, fallThrough: true },
    { type: "saw", x: 1130, y: 360, axis: "x", range: 70, speed: 1.8, size: 40 },
    { type: "lava", x: 1320, y: 402, w: 210, h: 78,
      cycle: { hidden: 60, rise: 150, high: 45, fall: 150, height: 80 } }
  ]
});
