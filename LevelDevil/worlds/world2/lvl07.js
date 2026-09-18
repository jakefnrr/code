// WORLD 2 - LEVEL 7 - "The Long Lie"
// Fake doors and invisible spikes punish rushing, but every danger has a readable route.
Levels.register({
  world: 2,
  level: 7,
  name: "The Long Lie",
  tip: "A door is not a promise. Check the floor before you celebrate.",
  width: 1600,
  spawn: { x: 70, y: 300 },
  exit: { x: 1530, y: 322 },
  solids: [
    { x: 0, y: 380, w: 1600, h: 100, type: "floor" },
    { x: 0, y: 0, w: 1600, h: 40, type: "ceiling" },
    { x: 1080, y: 285, w: 110, h: 18, type: "platform" }
  ],
  traps: [
    { type: "fakeDoor", x: 330, y: 334, w: 34, h: 46 },
    { type: "invisibleSpikes", x: 520, y: 380, count: 2 },
    { type: "popupSpikes", x: 700, y: 380, count: 3, phase: 48 },
    { type: "growingGap", x: 900, max: 125, trigger: 105, speed: 1.7 },
    { type: "saw", x: 1160, y: 320, axis: "x", range: 75, speed: 1.8, size: 40 },
    { type: "fakeDoor", x: 1320, y: 334, w: 34, h: 46 },
    { type: "spikes", x: 1450, y: 380, count: 2 }
  ]
});
