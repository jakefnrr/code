/* =====================================================================
   LEVEL DEVIL — LEVEL REGISTRY
   Levels register themselves by calling Levels.register(levelObject).
   The engine reads Levels.all to build worlds and Levels.get(w,l) to
   load a specific level.
   ===================================================================== */
const Levels = (() => {
  const map = {};   // key "w-l" -> level
  const worlds = new Array(5).fill(null).map(() => []);

  function register(def) {
    const w = def.world;
    const lv = def.level;
    const L = Object.assign({
      world: w,
      level: lv,
      name: `World ${w} - ${lv}`,
      tip: "",
      width: 960,
      height: 480,
      spawn: { x: 70, y: 300 },
      exit: { x: 900, y: 330 },
      music: "game",
      solids: [],
      gaps: [],
      traps: [],
      emberDensity: 18,
      bg: "dungeon"
    }, def);
    map[w + "-" + lv] = L;
    worlds[w][lv] = L;
  }

  function get(w, lv) { return map[w + "-" + lv] || null; }
  function getWorld(w) { return worlds[w].filter(Boolean).sort((a, b) => a.level - b.level); }
  function countWorld(w) { return getWorld(w).length; }
  function all() { return map; }
  function firstUnlocked(pb) {
    // returns the first uncompleted level (defaults to w1l1)
    for (let w = 1; w <= 4; w++) {
      const ls = getWorld(w);
      for (const L of ls) {
        if (!pb.cleared[w + "-" + L.level]) return { world: w, level: L.level };
      }
    }
    return { world: 4, level: 5 };
  }

  return { register, get, getWorld, countWorld, all, firstUnlocked };
})();