// WORLD 2 - LEVEL 5 - "Weight of Silence"
// Falling traps are introduced one at a time, then paired with a fake exit.
Levels.register({
  world: 2,
  level: 5,
  name: "Weight of Silence",
  tip: "The ceiling is listening. Keep moving after the impact.",
  width: 1460,
  spawn: { x: 70, y: 300 },
  exit: { x: 1390, y: 322 },
  solids: [
    { x: 0, y: 380, w: 1460, h: 100, type: "floor" },
    { x: 0, y: 0, w: 1460, h: 40, type: "ceiling" }
  ],
  traps: [
    { type: "fallingBlock", x: 300, y: 230, w: 60, h: 60, triggerDist: 85, respawn: 105 },
    { type: "ceilingSpikes", x: 540, y: 40, count: 4, fallThrough: true },
    { type: "crusher", x: 760, y: 40, dist: 240, speed: 1.45, rest: 22 },
    { type: "popupSpikes", x: 970, y: 380, count: 3, phase: 32 },
    { type: "fakeDoor", x: 1160, y: 334, w: 34, h: 46 },
    { type: "spikes", x: 1290, y: 380, count: 2 }
  ]
});
