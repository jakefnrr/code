// WORLD 1 · LEVEL 3 — "Loose Boards"
// A shaking bridge over the abyss, then a floor that cracks behind you.
Levels.register({
  world: 1,
  level: 3,
  name: "Loose Boards",
  tip: "Some ledges lie. Keep moving.",
  width: 1100,
  spawn: { x: 70, y: 300 },
  exit: { x: 1030, y: 322 },
  solids: [
    { x: 0, y: 380, w: 340, h: 100, type: "floor" },
    { x: 480, y: 380, w: 620, h: 100, type: "floor" },
    { x: 0, y: 0, w: 1100, h: 40, type: "ceiling" }
  ],
  traps: [
    { type: "crumbleFloor", x: 340, y: 362, w: 140, h: 18 },
    { type: "growingGap", x: 700, max: 90, trigger: 90, speed: 1.6 }
  ]
});