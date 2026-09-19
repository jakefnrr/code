// WORLD 2 - LEVEL 4 - "Saw Bridge"
// A moving-platform crossing that teaches the player to watch the saw, not the door.
Levels.register({
  world: 2,
  level: 4,
  name: "Saw Bridge",
  tip: "Ride the bridge, then wait for the blade to pass.",
  width: 1400,
  spawn: { x: 70, y: 300 },
  exit: { x: 1330, y: 322 },
  solids: [
    { x: 0, y: 380, w: 410, h: 100, type: "floor" },
    { x: 690, y: 380, w: 710, h: 100, type: "floor" },
    { x: 0, y: 0, w: 1400, h: 40, type: "ceiling" },
    { x: 860, y: 292, w: 100, h: 18, type: "platform" }
  ],
  traps: [
    { type: "popupSpikes", x: 250, y: 380, count: 3, phase: 12 },
    { type: "lava", x: 410, y: 402, w: 280, h: 78, rise: false },
    { type: "movingPlatform", x: 470, y: 320, w: 110, h: 18, axis: "x", range: 105, speed: 1.25 },
    { type: "saw", x: 760, y: 320, axis: "x", range: 70, speed: 1.7, size: 38 },
    { type: "spikes", x: 1080, y: 380, count: 3 }
  ]
});
