// WORLD 1 · LEVEL 7 — "The Weight"
// Twin bridges over the void; blocks fall from above.
Levels.register({
  world: 1,
  level: 7,
  name: "The Weight",
  tip: "Fall. Settle. Breathe. Then run.",
  width: 1200,
  spawn: { x: 70, y: 300 },
  exit: { x: 1130, y: 322 },
  solids: [
    { x: 0, y: 380, w: 360, h: 100, type: "floor" },
    { x: 480, y: 380, w: 280, h: 100, type: "floor" },
    { x: 880, y: 380, w: 320, h: 100, type: "floor" },
    { x: 0, y: 0, w: 1200, h: 40, type: "ceiling" }
  ],
  traps: [
    { type: "fallingBlock", x: 280, y: 220, w: 60, h: 60, triggerDist: 100, respawn: 100 },
    { type: "crumbleFloor", x: 360, y: 362, w: 120, h: 18 },
    { type: "fallingBlock", x: 620, y: 220, w: 60, h: 60, triggerDist: 90, respawn: 90 },
    { type: "trapFloor", x: 760, y: 362, w: 120, h: 18, delay: 8, respawn: 80 },
    { type: "spikes", x: 1000, y: 380, count: 2 }
  ]
});