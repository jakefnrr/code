// WORLD 3 - LEVEL 10
// A finished level with difficulty tuned for world 3.
Levels.register({
  world: 3,
  level: 10,
  name: "Molten Core - Trial 10",
  tip: "The traps are faster and less forgiving than the last world.",
  width: 1725,
  exit: { x: 1655, y: 322 },
  solids: [{"x": 0, "y": 380, "w": 1725, "h": 100, "type": "floor"}, {"x": 0, "y": 0, "w": 1725, "h": 40, "type": "ceiling"}],
  traps: [{"type": "fireballSpitter", "x": 250, "y": 340, "dir": -1, "interval": 79, "speed": 3.04}, {"type": "ceilingSpikes", "x": 471, "y": 56, "count": 5, "fallThrough": true}, {"type": "risingFallingSpikes", "x": 973, "y": 380, "count": 6, "rise": 314, "pause": 36, "speed": 10}, {"type": "popupSpikes", "x": 1190, "y": 380, "count": 5, "phase": 59}]
});
