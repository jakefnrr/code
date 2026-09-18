// WORLD 3 - LEVEL 5 - "The Six-Step Drop"
Levels.register({
  world: 3,
  level: 5,
  name: "The Six-Step Drop",
  tip: "Clear the saw and weight, cross the void, then use both platforms to clear all six spikes.",
  width: 1900,
  spawn: { x: 70, y: 300 },
  exit: { x: 1810, y: 322 },
  solids: [
    { x: 0, y: 380, w: 930, h: 100, type: "floor" },
    { x: 1080, y: 380, w: 820, h: 100, type: "floor" },
    { x: 0, y: 0, w: 1900, h: 40, type: "ceiling" },
    // Both platforms stay within normal jump height, with a short horizontal step.
    { x: 955, y: 315, w: 100, h: 18, type: "platform" },
    { x: 1100, y: 300, w: 125, h: 18, type: "platform" },
    { x: 1285, y: 235, w: 125, h: 18, type: "platform" },
    { x: 1445, y: 315, w: 100, h: 18, type: "platform" }
  ],
  gaps: [
    { x: 930, w: 150 },
    { x: 1420, w: 140 }
  ],
  traps: [
    { type: "saw", x: 560, y: 360, axis: "x", range: 90, speed: 1.7, size: 40 },
    { type: "fallingBlock", x: 760, y: 200, w: 60, h: 60, triggerDist: 100, respawn: 110 },
    { type: "spikes", x: 1320, y: 380, count: 6 },
    { type: "fallingBlock", x: 1650, y: 200, w: 60, h: 60, triggerDist: 100, respawn: 110 }
  ]
});
