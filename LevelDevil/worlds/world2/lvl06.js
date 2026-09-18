// WORLD 2 - LEVEL 6 - "Ash Current"
// The first real combination: a void trap, a saw route, and fire that controls pace.
Levels.register({
  world: 2,
  level: 6,
  name: "Ash Current",
  tip: "The fire sets the tempo. Do not jump blindly over the crack.",
  width: 1540,
  spawn: { x: 70, y: 300 },
  exit: { x: 1470, y: 322 },
  solids: [
    { x: 0, y: 380, w: 1540, h: 100, type: "floor" },
    { x: 0, y: 0, w: 1540, h: 40, type: "ceiling" },
    { x: 1050, y: 285, w: 100, h: 18, type: "platform" }
  ],
  traps: [
    { type: "growingGap", x: 330, max: 125, trigger: 115, speed: 1.6 },
    { type: "saw", x: 610, y: 315, axis: "y", range: 62, speed: 1.8, size: 40 },
    { type: "movingSpikes", x: 820, y: 380, count: 3, range: 105, speed: 1.3 },
    { type: "fireballSpitter", x: 970, y: 340, dir: 1, interval: 94, speed: 2.25 },
    { type: "ceilingSpikes", x: 1190, y: 40, count: 4, fallThrough: true },
    { type: "spikes", x: 1350, y: 380, count: 3 }
  ]
});
