// WORLD 4 - LEVEL 2
// A finished level with difficulty tuned for world 4.
Levels.register({
  world: 4,
  level: 2,
  name: "The Hollow - Trial 2",
  tip: "The traps are faster and less forgiving than the last world.",
  width: 1575,
  exit: { x: 1505, y: 322 },
  solids: [{"x": 0, "y": 380, "w": 1575, "h": 100, "type": "floor"}, {"x": 0, "y": 0, "w": 1575, "h": 40, "type": "ceiling"}],
  traps: [{"type": "ceilingSpikes", "x": 286, "y": 56, "count": 3}, {"type": "fakeDoor", "x": 518, "y": 336, "w": 28, "h": 44}]
});
