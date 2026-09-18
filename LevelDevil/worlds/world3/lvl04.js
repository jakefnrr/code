// WORLD 3 - LEVEL 4 - "Lava Door"
Levels.register({
  world: 3,
  level: 4,
  name: "Lava Door",
  tip: "The four spikes rise from the floor. Clear the void, then wait for the lava.",
  width: 1900,
  spawn: { x: 70, y: 300 },
  exit: { x: 1810, y: 322 },
  solids: [
    { x: 0, y: 380, w: 1900, h: 100, type: "floor" },
    { x: 0, y: 0, w: 1900, h: 40, type: "ceiling" },
    { x: 785, y: 315, w: 100, h: 18, type: "platform" }
  ],
  gaps: [
    { x: 760, w: 155 }
  ],
  traps: [
    { type: "fakeDoor", x: 300, y: 336, w: 28, h: 44 },
    { type: "popupSpikes", x: 500, y: 380, count: 4, phase: 18 },
    { type: "spikes", x: 650, y: 380, count: 3 },
    { type: "fallingBlock", x: 980, y: 200, w: 60, h: 60, triggerDist: 100, respawn: 110 },
    { type: "saw", x: 1220, y: 360, axis: "x", range: 85, speed: 1.7, size: 40 },
    { type: "lava", x: 1480, y: 402, w: 250, h: 78,
      cycle: { hidden: 60, rise: 150, high: 45, fall: 150, height: 80 } }
  ]
});
