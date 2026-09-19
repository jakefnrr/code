// WORLD 2 - LEVEL 2 - "Rattle Run"
// World 2 opens with a guided tour of its language: floor traps, saws, void,
// spikes, fire, and one door that lies. Each hazard has room around it.
Levels.register({
  world: 2,
  level: 2,
  name: "Rattle Run",
  tip: "Every trap has a quiet beat. Find it before you sprint.",
  width: 1500,
  spawn: { x: 70, y: 300 },
  exit: { x: 1430, y: 322 },
  solids: [
    { x: 0, y: 380, w: 1500, h: 100, type: "floor" },
    { x: 0, y: 0, w: 1500, h: 40, type: "ceiling" }
  ],
  traps: [
    { type: "popupSpikes", x: 230, y: 380, count: 3, phase: 0 },
    { type: "trapFloor", x: 410, y: 362, w: 110, h: 18, delay: 16, respawn: 100 },
    { type: "saw", x: 650, y: 315, axis: "x", range: 70, speed: 1.7, size: 38 },
    { type: "growingGap", x: 820, max: 115, trigger: 110, speed: 1.45 },
    { type: "movingSpikes", x: 1010, y: 380, count: 2, range: 85, speed: 1.2 },
    { type: "fakeDoor", x: 1180, y: 334, w: 34, h: 46 },
    { type: "fireballSpitter", x: 1300, y: 340, dir: -1, interval: 100, speed: 2.2 },
    { type: "spikes", x: 1370, y: 380, count: 2 }
  ]
});
