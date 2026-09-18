// WORLD 2 - LEVEL 10 - "Ashen Gauntlet"
// World 2's final lesson: familiar traps are chained, never stacked unfairly in one jump.
Levels.register({
  world: 2,
  level: 10,
  name: "Ashen Gauntlet",
  tip: "You know every trick now. Slow down at the door, then commit.",
  width: 1980,
  spawn: { x: 70, y: 300 },
  exit: { x: 1910, y: 322 },
  solids: [
    { x: 0, y: 380, w: 1980, h: 100, type: "floor" },
    { x: 0, y: 0, w: 1980, h: 40, type: "ceiling" },
    { x: 720, y: 282, w: 110, h: 18, type: "platform" },
    { x: 1330, y: 282, w: 100, h: 18, type: "platform" }
  ],
  traps: [
    { type: "crusher", x: 440, y: 40, dist: 240, speed: 1.55, rest: 18 },
    { type: "growingGap", x: 650, max: 130, trigger: 110, speed: 1.8 },
    { type: "saw", x: 870, y: 315, axis: "y", range: 70, speed: 2, size: 42 },
    { type: "fireballSpitter", x: 1050, y: 340, dir: 1, interval: 82, speed: 2.55 },
    { type: "movingSpikes", x: 1210, y: 380, count: 3, range: 110, speed: 1.5 },
    { type: "ceilingSpikes", x: 1470, y: 40, count: 4, fallThrough: true },
    { type: "fakeDoor", x: 1650, y: 334, w: 34, h: 46 },
    { type: "spikes", x: 1810, y: 380, count: 3 }
  ]
});
