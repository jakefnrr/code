// WORLD 4 - LEVEL 3
// A finished level with difficulty tuned for world 4.
Levels.register({
  world: 4,
  level: 3,
  name: "The Hollow - Trial 3",
  tip: "The traps are faster and less forgiving than the last world.",
  width: 1600,
  exit: { x: 1530, y: 322 },
  solids: [{"x": 0, "y": 380, "w": 1600, "h": 100, "type": "floor"}, {"x": 0, "y": 0, "w": 1600, "h": 40, "type": "ceiling"}],
  traps: [{"type": "fakeDoor", "x": 269, "y": 336, "w": 28, "h": 44}, {"type": "spikes", "x": 518, "y": 380, "count": 3}, {"type": "growingGap", "x": 760, "max": 134, "trigger": 120, "speed": 1.58}]
});
