// WORLD 3 - LEVEL 8
// A finished level with difficulty tuned for world 3.
Levels.register({
  world: 3,
  level: 8,
  name: "Molten Core - Trial 8",
  tip: "The traps are faster and less forgiving than the last world.",
  width: 1675,
  exit: { x: 1605, y: 322 },
  solids: [{"x": 0, "y": 380, "w": 1675, "h": 100, "type": "floor"}, {"x": 0, "y": 0, "w": 1675, "h": 40, "type": "ceiling"}],
  traps: [{"type": "crusher", "x": 284, "y": 40, "dist": 264, "speed": 1.85, "rest": 20}, {"type": "movingSpikes", "x": 471, "y": 380, "count": 4, "range": 113, "speed": 1.8599999999999999}, {"type": "fireballSpitter", "x": 682, "y": 340, "dir": -1, "interval": 83, "speed": 2.88}, {"type": "ceilingSpikes", "x": 973, "y": 56, "count": 4}]
});
