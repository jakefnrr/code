// WORLD 3 - LEVEL 7
// A finished level with difficulty tuned for world 3.
Levels.register({
  world: 3,
  level: 7,
  name: "Molten Core - Trial 7",
  tip: "The traps are faster and less forgiving than the last world.",
  width: 1650,
  exit: { x: 1580, y: 322 },
  solids: [{"x": 0, "y": 380, "w": 1650, "h": 100, "type": "floor"}, {"x": 0, "y": 0, "w": 1650, "h": 40, "type": "ceiling"}],
  traps: [{"type": "saw", "x": 301, "y": 330, "axis": "x", "range": 110, "speed": 2.0, "size": 36}, {"type": "crusher", "x": 471, "y": 40, "dist": 260, "speed": 1.8, "rest": 20}, {"type": "movingSpikes", "x": 733, "y": 380, "count": 4, "range": 110, "speed": 1.7999999999999998}, {"type": "fireballSpitter", "x": 973, "y": 340, "dir": 1, "interval": 85, "speed": 2.8}]
});
