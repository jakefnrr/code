// WORLD 1 · LEVEL 4 — "The Pitfall"
// A moving platform ferries you over a bottomless crack.
Levels.register({
  world: 1,
  level: 4,
  name: "The Pitfall",
  tip: "Ride the rail. Don't look down.",
  width: 1100,
  spawn: { x: 70, y: 300 },
  exit: { x: 1030, y: 322 },
  solids: [
    { x: 0, y: 380, w: 420, h: 100, type: "floor" },
    { x: 720, y: 380, w: 380, h: 100, type: "floor" },
    { x: 0, y: 0, w: 1100, h: 40, type: "ceiling" }
  ],
  traps: [
    { type: "popupSpikes", x: 250, y: 380, count: 3, phase: 0 },
    { type: "movingPlatform", x: 480, y: 320, w: 110, h: 18, axis: "x", range: 120, speed: 1.3 },
    { type: "spikes", x: 820, y: 380, count: 2 }
  ]
});