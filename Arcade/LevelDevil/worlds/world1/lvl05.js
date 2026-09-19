// WORLD 1 · LEVEL 5 — "Sawdust"
// A spinning blade patrols the middle floor.
Levels.register({
  world: 1,
  level: 5,
  name: "Sawdust",
  tip: "Watch the blade's whole route before you move.",
  width: 1200,
  spawn: { x: 70, y: 300 },
  exit: { x: 1130, y: 322 },
  solids: [
    { x: 0, y: 380, w: 1200, h: 100, type: "floor" },
    { x: 0, y: 0, w: 1200, h: 40, type: "ceiling" },
    { x: 350, y: 280, w: 120, h: 18, type: "platform" },
    { x: 540, y: 280, w: 120, h: 18, type: "platform" }
  ],
  traps: [
    { type: "saw", x: 420, y: 330, axis: "x", range: 60, speed: 2.2, size: 40 },
    { type: "growingGap", x: 620, max: 100, trigger: 90, speed: 1.5 },
    { type: "spikes", x: 900, y: 380, count: 2 }
  ]
});