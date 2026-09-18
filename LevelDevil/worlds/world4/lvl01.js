// WORLD 4 - LEVEL 1
// A finished level with difficulty tuned for world 4.
Levels.register({
  world: 4,
  level: 1,
  name: "The Hollow - Trial 1",
  tip: "The traps are faster and less forgiving than the last world.",
  width: 1550,
  exit: { x: 1480, y: 322 },
  solids: [{"x": 0, "y": 380, "w": 1550, "h": 100, "type": "floor"}, {"x": 0, "y": 0, "w": 1550, "h": 40, "type": "ceiling"}],
  traps: [{"type": "fireballSpitter", "x": 303, "y": 340, "dir": 1, "interval": 93, "speed": 2.48}, {"type": "ceilingSpikes", "x": 518, "y": 56, "count": 3}]
});
