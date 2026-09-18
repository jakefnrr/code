// WORLD 2 - LEVEL 3 - "False Bottom"
// The first void lesson: cross the trap floor before the room opens behind you.
Levels.register({
  world: 2,
  level: 3,
  name: "False Bottom",
  tip: "Do not wait on the boards. The room is changing behind you.",
  width: 1320,
  spawn: { x: 70, y: 300 },
  exit: { x: 1250, y: 322 },
  solids: [
    { x: 0, y: 380, w: 1320, h: 100, type: "floor" },
    { x: 0, y: 0, w: 1320, h: 40, type: "ceiling" }
  ],
  traps: [
    { type: "trapFloor", x: 300, y: 362, w: 120, h: 18, delay: 14, respawn: 100 },
    { type: "crumbleFloor", x: 520, y: 362, w: 120, h: 18, maxTimer: 42 },
    { type: "growingGap", x: 790, max: 120, trigger: 110, speed: 1.55 },
    { type: "fakeDoor", x: 1010, y: 334, w: 34, h: 46 },
    { type: "spikes", x: 1150, y: 380, count: 2 }
  ]
});
