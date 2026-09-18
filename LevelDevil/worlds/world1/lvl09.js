// WORLD 1 · LEVEL 9 — "The Gauntlet"
// Everything so far, politely arranged to hurt you.
Levels.register({
  world: 1,
  level: 9,
  name: "The Gauntlet",
  tip: "No two traps share a rhythm. Learn them separately.",
  width: 1400,
  spawn: { x: 70, y: 300 },
  exit: { x: 1330, y: 322 },
  solids: [
    { x: 0, y: 380, w: 420, h: 100, type: "floor" },
    { x: 600, y: 380, w: 800, h: 100, type: "floor" },
    { x: 0, y: 0, w: 1400, h: 40, type: "ceiling" },
    { x: 380, y: 300, w: 150, h: 18, type: "platform" }
  ],
  traps: [
    { type: "popupSpikes", x: 220, y: 380, count: 3, phase: 0 },
    { type: "growingGap", x: 420, max: 120, trigger: 100, speed: 1.8 },
    { type: "movingSpikes", x: 720, y: 380, count: 3, range: 120, speed: 1.3 },
    { type: "saw", x: 880, y: 330, axis: "y", range: 70, speed: 2, size: 38 },
    { type: "crumbleFloor", x: 1040, y: 362, w: 120, h: 18 },
    { type: "spikes", x: 1240, y: 380, count: 3 }
  ]
});