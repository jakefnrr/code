// WORLD 1 · LEVEL 8 — "Lava Walk"
// Cross the fire on a rail, then outrun the devil's breath.
Levels.register({
  world: 1,
  level: 8,
  name: "Lava Walk",
  tip: "The mouth spits on a beat. Run between breaths.",
  width: 1200,
  spawn: { x: 70, y: 300 },
  exit: { x: 1130, y: 322 },
  solids: [
    { x: 0, y: 380, w: 420, h: 100, type: "floor" },
    { x: 700, y: 380, w: 500, h: 100, type: "floor" },
    { x: 0, y: 0, w: 1200, h: 40, type: "ceiling" }
  ],
  traps: [
    { type: "lava", x: 420, y: 402, w: 280, h: 78, rise: true },
    { type: "movingPlatform", x: 500, y: 330, w: 100, h: 18, axis: "x", range: 130, speed: 1.4 },
    { type: "ceilingSpikes", x: 760, y: 40, count: 4, fallThrough: true },
    { type: "ceilingSpikes", x: 940, y: 40, count: 4, fallThrough: true },
    { type: "fireballSpitter", x: 1030, y: 340, dir: -1, interval: 90, speed: 2.2 }
  ]
});