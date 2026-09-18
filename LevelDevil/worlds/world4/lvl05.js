// WORLD 4 - LEVEL 5 - "You Beat The Game"
// The real final room. The left side is only for players who refuse to leave.
Levels.register({
  world: 4,
  level: 5,
  name: "You Beat The Game",
  tip: "Walk right through the door. Seriously. Do not walk back.",
  width: 1700,
  spawn: { x: 90, y: 300 },
  exit: { x: 1510, y: 322 },
  finalWin: true,
  leftWarningX: 760,
  leftDeathX: 360,
  solids: [
    { x: 0, y: 380, w: 1700, h: 100, type: "floor" },
    { x: 0, y: 0, w: 1700, h: 40, type: "ceiling" }
  ],
  traps: []
});
