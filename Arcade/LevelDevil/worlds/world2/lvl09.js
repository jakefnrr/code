// WORLD 2 - LEVEL 9 - "Pressure Stack"
// A focused gauntlet: each section adds one hazard, then the last run asks for all of them.
Levels.register({
  world: 2,
  level: 9,
  name: "Pressure Stack",
  tip: "The gaps are the easy part. Watch what moves above them.",
  width: 1840,
  spawn: { x: 70, y: 300 },
  exit: { x: 1770, y: 322 },
  solids: [
    { x: 0, y: 380, w: 1840, h: 100, type: "floor" },
    { x: 0, y: 0, w: 1840, h: 40, type: "ceiling" },
    { x: 900, y: 315, w: 100, h: 18, type: "platform" }
  ],
  traps: [
    { type: "crusher", x: 280, y: 40, dist: 235, speed: 1.5, rest: 20 },
    { type: "trapFloor", x: 500, y: 362, w: 120, h: 18, delay: 12, respawn: 90 },
    { type: "movingSpikes", x: 720, y: 380, count: 3, range: 105, speed: 1.35 },
    { type: "growingGap", x: 980, max: 130, trigger: 115, speed: 1.75 },
    { type: "fakeDoor", x: 1390, y: 334, w: 34, h: 46 },
    { type: "fireballSpitter", x: 1530, y: 340, dir: -1, interval: 86, speed: 2.5 },
    { type: "spikes", x: 1690, y: 380, count: 3 }
  ]
});
