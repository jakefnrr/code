// WORLD 2 - LEVEL 8 - "Crossfire"
// A set-piece crossing: lava below, a moving rail, then two different kinds of fire.
Levels.register({
  world: 2,
  level: 8,
  name: "Crossfire",
  tip: "Cross the fire, land low, and save your jump for the roof.",
  width: 1720,
  spawn: { x: 70, y: 300 },
  exit: { x: 1650, y: 322 },
  solids: [
    { x: 0, y: 380, w: 360, h: 100, type: "floor" },
    { x: 660, y: 380, w: 1060, h: 100, type: "floor" },
    { x: 0, y: 0, w: 1720, h: 40, type: "ceiling" },
    { x: 830, y: 280, w: 100, h: 18, type: "platform" }
  ],
  traps: [
    { type: "spikes", x: 220, y: 380, count: 3 },
    { type: "lava", x: 360, y: 402, w: 300, h: 78, rise: true },
    { type: "movingPlatform", x: 420, y: 320, w: 110, h: 18, axis: "x", range: 115, speed: 1.35 },
    { type: "fireballSpitter", x: 1010, y: 340, dir: -1, interval: 88, speed: 2.4 },
    { type: "ceilingSpikes", x: 1240, y: 40, count: 4, fallThrough: true },
    { type: "movingSpikes", x: 1430, y: 380, count: 3, range: 100, speed: 1.45 },
    { type: "spikes", x: 1570, y: 380, count: 2 }
  ]
});
