// WORLD 4 - LEVEL 4
// A finished level with difficulty tuned for world 4.
Levels.register({
  world: 4,
  level: 4,
  name: "The Hollow - Trial 4",
  tip: "The traps are faster and less forgiving than the last world.",
  width: 1625,
  backDeathX: 30,
  exit: { x: 1555, y: 322 },
  solids: [{"x": 0, "y": 380, "w": 1625, "h": 100, "type": "floor"}, {"x": 0, "y": 0, "w": 1625, "h": 40, "type": "ceiling"}],
  traps: [{"type": "spikes", "x": 252, "y": 380, "count": 3}, {"type": "popupSpikes", "x": 518, "y": 380, "count": 3, "phase": 51}, {"type": "saw", "x": 666, "y": 330, "axis": "x", "range": 107, "speed": 1.92, "size": 36}]
});
