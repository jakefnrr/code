// WORLD 3 - LEVEL 1 - "Cannon Crossing"
Levels.register({
  world: 3,
  level: 1,
  name: "Cannon Crossing",
  tip: "Cross the void, slip past the cannon, and bait the weight before the door.",
  width: 1600,
  spawn: { x: 70, y: 300 },
  exit: { x: 1510, y: 322 },
  solids: [
    { x: 0, y: 380, w: 360, h: 100, type: "floor" },
    { x: 500, y: 380, w: 1100, h: 100, type: "floor" },
    { x: 380, y: 315, w: 100, h: 18, type: "platform" },
    { x: 0, y: 0, w: 1600, h: 40, type: "ceiling" }
  ],
  gaps: [
    { x: 360, w: 140 }
  ],
  traps: [
    { type: "fireballSpitter", x: 650, y: 340, dir: -1, interval: 92, speed: 2.35 },
    { type: "spikes", x: 790, y: 380, count: 2 },
    { type: "saw", x: 980, y: 360, axis: "x", range: 70, speed: 1.55, size: 38 },
    { type: "fallingBlock", x: 1250, y: 200, w: 60, h: 60, triggerDist: 100, respawn: 110 }
  ]
});
