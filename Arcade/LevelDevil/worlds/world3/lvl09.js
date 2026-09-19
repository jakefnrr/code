// WORLD 3 - LEVEL 9
// A finished level with difficulty tuned for world 3.
Levels.register({
  world: 3,
  level: 9,
  name: "Molten Core - Trial 9",
  tip: "The traps are faster and less forgiving than the last world.",
  width: 1700,
  exit: { x: 1630, y: 322 },
  solids: [{"x": 0, "y": 380, "w": 1700, "h": 100, "type": "floor"}, {"x": 0, "y": 0, "w": 1700, "h": 40, "type": "ceiling"}],
  traps: [{"type": "movingSpikes", "x": 267, "y": 380, "count": 5, "range": 116, "speed": 1.92}, {"type": "fireballSpitter", "x": 471, "y": 340, "dir": 1, "interval": 81, "speed": 2.96}, {"type": "ceilingSpikes", "x": 741, "y": 56, "count": 5, "static": true}, {"type": "fakeDoor", "x": 973, "y": 336, "w": 28, "h": 44}, {"type": "growingGap", "x": 760, "max": 128, "trigger": 120, "speed": 1.46}]
});
