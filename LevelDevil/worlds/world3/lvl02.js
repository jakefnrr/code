// WORLD 3 - LEVEL 2 - "The Spiked Lift"
Levels.register({
  world: 3,
  level: 2,
  name: "The Spiked Lift",
  tip: "Take platform one, then two. The last platform moves when you land on it.",
  width: 1900,
  spawn: { x: 70, y: 300 },
  exit: { x: 1810, y: 322 },
  solids: [
    { x: 0, y: 380, w: 300, h: 100, type: "floor" },
    { x: 470, y: 380, w: 1430, h: 100, type: "floor" },
    { x: 0, y: 0, w: 1900, h: 40, type: "ceiling" },
    { x: 250, y: 315, w: 100, h: 18, type: "platform" },
    { x: 520, y: 300, w: 125, h: 18, type: "platform" },
    { x: 690, y: 245, w: 125, h: 18, type: "platform" }
  ],
  gaps: [
    { x: 300, w: 170 }
  ],
  traps: [
    { type: "ceilingSpikes", x: 250, y: 56, count: 4, fallThrough: true, triggerDist: 85 },
    { type: "spikes", x: 690, y: 380, count: 4 },
    { type: "movingPlatform", x: 850, y: 190, w: 110, h: 18, triggerOnLand: true,
      triggerDelay: 6, showPath: false,
      path: [{ dx: 120, dy: 0, speed: 9 }, { dx: 0, dy: -150, speed: 9 }] },
    { type: "ceilingSpikes", x: 950, y: 40, count: 4, h: 60, static: true, staticKill: true },
    { type: "fireballSpitter", x: 1040, y: 340, dir: -1, interval: 96, speed: 2.35 },
    { type: "saw", x: 1160, y: 360, axis: "x", range: 85, speed: 1.65, size: 40 },
    { type: "fallingBlock", x: 1430, y: 200, w: 60, h: 60, triggerDist: 100, respawn: 110 },
    { type: "lava", x: 1590, y: 402, w: 210, h: 78,
      cycle: { hidden: 60, rise: 150, high: 45, fall: 150, height: 80 } }
  ]
});
