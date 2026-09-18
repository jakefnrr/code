// WORLD 2 - LEVEL 1 - "First Fall"
// A measured introduction to World 2: bait the weight, cross the void,
// climb the two-step route, then dodge the ground saw.
Levels.register({
  world: 2,
  level: 1,
  name: "First Fall",
  tip: "Step under the weight, step back, then take the long jump.",
  width: 1500,
  spawn: { x: 70, y: 300 },
  exit: { x: 1430, y: 322 },
  solids: [
    { x: 0, y: 380, w: 400, h: 100, type: "floor" },
    { x: 820, y: 380, w: 680, h: 100, type: "floor" },
    { x: 0, y: 0, w: 1500, h: 40, type: "ceiling" },
    { x: 470, y: 300, w: 120, h: 18, type: "platform" },
    { x: 650, y: 240, w: 130, h: 18, type: "platform" }
  ],
  traps: [
    { type: "fallingBlock", x: 250, y: 220, w: 60, h: 60, triggerDist: 95, respawn: 100 },
    { type: "popupSpikes", x: 350, y: 380, count: 3, phase: 20 },
    { type: "saw", x: 1070, y: 360, axis: "x", range: 80, speed: 1.45, size: 38 },
    { type: "spikes", x: 1300, y: 380, count: 2 }
  ]
});
