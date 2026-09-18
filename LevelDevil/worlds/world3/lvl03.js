// WORLD 3 - LEVEL 3 - "The Door That Lies"
Levels.register({
  world: 3,
  level: 3,
  name: "The Door That Lies",
  tip: "The small door is a trap. Cross the voids, then test the white floor.",
  width: 1900,
  spawn: { x: 70, y: 300 },
  exit: { x: 1810, y: 322 },
  solids: [
    { x: 0, y: 380, w: 1900, h: 100, type: "floor" },
    { x: 0, y: 0, w: 1900, h: 40, type: "ceiling" },
    { x: 565, y: 315, w: 100, h: 18, type: "platform" },
    { x: 1295, y: 315, w: 100, h: 18, type: "platform" }
  ],
  gaps: [
    { x: 540, w: 150 },
    { x: 1270, w: 150 }
  ],
  traps: [
    { type: "ceilingSpikes", x: 250, y: 56, count: 4, fallThrough: true, triggerDist: 85 },
    { type: "fakeDoor", x: 430, y: 336, w: 28, h: 44 },
    { type: "spikes", x: 735, y: 380, count: 2 },
    { type: "spikes", x: 900, y: 380, count: 3 },
    { type: "fallingBlock", x: 1080, y: 200, w: 60, h: 60, triggerDist: 100, respawn: 110 },
    { type: "invisibleSpikes", x: 1490, y: 380, count: 2 },
    { type: "spikes", x: 1660, y: 380, count: 2 }
  ]
});
