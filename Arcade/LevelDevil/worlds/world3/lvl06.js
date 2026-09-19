// WORLD 3 - LEVEL 6
// A finished level with difficulty tuned for world 3.
Levels.register({
  world: 3,
  level: 6,
  name: "Molten Core - Trial 6",
  tip: "The traps are faster and less forgiving than the last world.",
  width: 1625,
  exit: { x: 1555, y: 322 },
  solids: [{"x": 0, "y": 380, "w": 1625, "h": 100, "type": "floor"}, {"x": 0, "y": 0, "w": 1625, "h": 40, "type": "ceiling"}],
  traps: [{"type": "popupSpikes", "x": 318, "y": 380, "count": 4, "phase": 31}, {"type": "saw", "x": 471, "y": 330, "axis": "x", "range": 107, "speed": 1.92, "size": 36}, {"type": "crusher", "x": 674, "y": 40, "dist": 256, "speed": 1.75, "rest": 20}, {"type": "growingGap", "x": 760, "max": 128, "trigger": 120, "speed": 1.46}]
});
