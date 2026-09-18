/* =====================================================================
   LEVEL DEVIL — ENGINE
   Loads levels, runs the world, handles input, physics, HUD, and the
   menu / world-select / level-select / pause / clear / gameover screens.
   Exposes window.LD.press()/release() for the on-screen dpad.
   ===================================================================== */
const LD = (() => {

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const CW = 960, CH = 480;

  const GROUND_DEFAULT = 380;

  /* ---------- physics constants (per 60fps frame) ---------- */
  const GRAV = 0.72;
  const WALK = 4.2;
  const JUMP = -12.4;
  const MAXFALL = 15;
  const MAX_LIVES = 15;

  const PW = 26, PH = 38;   // player hitbox

  /* ---------- state ---------- */
  let state = "menu";       // menu | select | game | paused | clear | gameover | worldclear
  let keys = {};
  let mouse = { x: 0, y: 0, click: false, down: false };
  let uiCooldown = 0;
  let cam = { x: 0, y: 0 };
  let shake = 0;
  let frame = 0;
  let dt = 1 / 60;
  let fit = 1; // frame-time scaling

  let current = { world: 1, level: 1 };
  let currentLevel = null;
  let runLevel = null;      // fully-built playable level
  let lives = MAX_LIVES;
  let hearts = [];
  let deathTimer = -1;
  let invuln = 0;
  let tipTimer = 0;
  let totalDeaths = 0;
  let levelDeaths = 0;
  let winTimer = -1;
  let shootCd = 0;
  let gameoverWipe = false;

  let selectWorld = 1;

  /* ---------- padlock unlock FX ---------- */
  let lockBurst = null;          // {x,y,t,shards} active bursting padlock
  let pendingWorldBurst = 0;     // world padlock to burst on the world-clear screen
  let pendingLevelBurst = null;  // {world,level} padlock to burst on the level-clear screen

  function spawnLockBurst(x, y) {
    const shards = [];
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 1.5 + Math.random() * 5;
      shards.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 2.2,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.45,
        size: 3 + Math.random() * 6,
        life: 24 + Math.random() * 22,
        t: 0
      });
    }
    // the whole padlock body is blown off and tumbles away
    shards.push({ x, y, vx: (Math.random() - 0.5) * 7, vy: -8, rot: 0, vr: 0.35, size: 20, life: 62, t: 0, whole: true });
    lockBurst = { x, y, t: 0, shards };
    Audio.sfx.unlock();
  }

  function updateLockBurst() {
    if (!lockBurst) return;
    const b = lockBurst;
    b.t++;
    for (const s of b.shards) {
      s.t++;
      s.vy += 0.24;
      s.vx *= 0.965;
      s.x += s.vx; s.y += s.vy;
      s.rot += s.vr;
    }
    if (b.t > 70) lockBurst = null;
  }

  function drawLockBurst() {
    if (!lockBurst) return;
    const b = lockBurst;
    if (b.t < 10) {
      const r = 10 + b.t * 7;
      ctx.globalAlpha = Math.max(0, 0.5 - b.t * 0.05);
      ctx.strokeStyle = "#ffd166";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    for (const s of b.shards) {
      const a = Math.max(0, 1 - s.t / s.life);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.fillStyle = s.whole ? "#e8b33a" : "#ffd166";
      ctx.fillRect(-s.size / 2, -s.size / 2, s.size, s.size);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  function drawPadlock(cx, cy, s, color) {
    s = s || 1;
    color = color || "#c9a86b";
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineCap = "round";
    ctx.lineWidth = Math.max(2.5, 4 * s);
    ctx.beginPath();
    ctx.arc(0, -5.5 * s, 5.5 * s, Math.PI, 0);
    ctx.stroke();
    ctx.fillRect(-7 * s, -1 * s, 14 * s, 11 * s);
    ctx.fillStyle = "#0a0604";
    ctx.beginPath();
    ctx.arc(0, 3.2 * s, 2 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-1.1 * s, 4 * s, 2.2 * s, 3.6 * s);
    ctx.restore();
  }

  const WORLD_NAMES = ["", "Ember Depths", "Ashen Crypts", "Molten Core", "The Hollow"];
  const WORLD_COLORS = ["", "#c22f2f", "#8a5a5a", "#e08030", "#4a5a8a"];

  /* ---------- progress ---------- */
  const SAVE_KEY = "leveldevil_progress";
  function loadPB() {
    try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || { cleared: {} }; }
    catch (e) { return { cleared: {} }; }
  }
  let pb = loadPB();

  function savePB() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(pb)); } catch (e) {} }

  function isUnlocked(w, lv) {
    if ((w === 1 && lv === 1)) return true;
    if (lv > 1 && pb.cleared[w + "-" + (lv - 1)]) return true;
    if (lv === 1 && w > 1) {
      const previousWorld = Levels.getWorld(w - 1);
      const lastLevel = previousWorld[previousWorld.length - 1];
      return !!(lastLevel && pb.cleared[(w - 1) + "-" + lastLevel.level]);
    }
    return false;
  }

  /* ---------------------------------------------------------
     LEVEL BUILD
     --------------------------------------------------------- */
  function buildLevel() {
    const L = currentLevel;
    const spawn = L.spawn;
    runLevel = {
      config: L,
      solids: [],           // static solids {x,y,w,h,type,solidNow,oneway}
      carvable: [],         // floor pieces that can be carved by gaps
      oneways: [],
      traps: [],
      projectiles: [],
      particles: [],
      embers: [],
      width: L.width || CW,
      height: L.height || CH,
      player: {
        x: spawn.x, y: spawn.y, w: PW, h: PH,
        vx: 0, vy: 0, grounded: false, face: 1,
        anim: "idle", animTime: 0, squash: 0, dead: false, deadT: 0,
        hasGun: false
      }
    };
    // solids
    for (const s of (L.solids || [])) {
      const rect = { x: s.x, y: s.y, w: s.w, h: s.h, type: s.type || "wall" };
      if (rect.type === "platform") {
        rect.oneway = true;
        runLevel.oneways.push(rect);
      } else if (rect.type === "floor") {
        rect.carve = true;
        rect.solidNow = true;
        rect.oneway = true;
        runLevel.carvable.push(rect);
      } else if (rect.type === "fake") {
        rect.solidNow = true;
        rect.fakeTimer = Math.floor(Math.random() * 40);
        rect.onInterval = 90;   // frames solid
        rect.offInterval = 45;  // frames ghost
        runLevel.solids.push(rect);
      } else {
        rect.solidNow = true;
        runLevel.solids.push(rect);
      }
    }
    // traps
    runLevel.trapDefs = (L.traps || []).slice();
    runLevel.traps = runLevel.trapDefs.map(d => Traps.createTrap(Object.assign({}, d)));
    // gap holes (static)
    runLevel.staticHoles = (L.gaps || []).map(g => ({ x: g.x, y: 0, w: g.w, h: CH }));
    // ambient embers
    const n = L.emberDensity ?? 18;
    for (let i = 0; i < n; i++) {
      runLevel.embers.push({
        x: Math.random() * (L.width || CW),
        y: Math.random() * CH,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -(0.3 + Math.random() * 0.7),
        t: Math.random() * 100,
        r: 1 + Math.random() * 2
      });
    }
    runLevel.isBoss = !!(L.isBoss);
    runLevel.chest = L.chest || null;
    runLevel.chestOpen = false;
    runLevel.chestMsg = false;
    runLevel.arena = L.arena || 0;
    runLevel.camLockX = L.camLockX || 960;
    runLevel.camLock = false;
    runLevel.bullets = [];
    runLevel.bossBullets = [];
    runLevel.boss = null;
    runLevel.finalWon = false;
    runLevel.confetti = [];
    if (runLevel.isBoss && L.boss) {
      const b = L.boss;
      const bossHp = b.hp != null ? b.hp : (10 + (current.world - 1) * 5);
      runLevel.boss = {
        x: b.x, y: 380 - 78, w: 54, h: 78,
        hp: bossHp, maxHp: bossHp,
        dmg: b.damage || 1,
        state: "sleep", stateT: 0, t: 0, face: -1, flash: 0, recoil: 0,
        aimUp: 0, aimAt: null, deadT: 0, proj: 0,
        patrol: b.patrol || [1360, 1880], name: b.name || "Troll King"
      };
      runLevel.exitRect = { x: -200, y: 400, w: 1, h: 1 };
    } else {
      runLevel.exitRect = { x: L.exit.x, y: L.exit.y, w: 42, h: 58 };
    }
    cam.x = 0; cam.y = 0;
    shake = 0;
    levelDeaths = 0;
    gameoverWipe = false;
    shootCd = 0;
    if (hearts.length === 0) resetHearts();
    tipTimer = 200;
    invuln = 40;
  }

  function resetSpawn() {
    const p = runLevel.player;
    const sp = runLevel.config.spawn;
    p.x = sp.x; p.y = sp.y; p.vx = 0; p.vy = 0; p.grounded = false;
    p.dead = false; p.anim = "idle"; p.animTime = 0;
    invuln = 50;
    resetTraps();
  }

  // Wipe every trap back to its fresh spawn state (and clear stray fireballs).
  // On respawn the world looks untouched — no clues about where a trap acted.
  function resetTraps() {
    runLevel.traps = runLevel.trapDefs.map(d => Traps.createTrap(Object.assign({}, d)));
    runLevel.projectiles = [];
    runLevel.bossBullets = [];
    if (runLevel.boss) {
      runLevel.boss.state = runLevel.camLock ? "walk" : "sleep";
      runLevel.boss.stateT = 0;
      runLevel.boss.recoil = 0;
      runLevel.boss.aimAt = null;
    }
  }

  function resetHearts() {
    hearts = [];
    for (let i = 0; i < MAX_LIVES; i++) hearts.push({ x: 16 + i * 26, y: 14, lost: false });
  }

  function resetRun() {
    lives = MAX_LIVES;
    resetHearts();
  }

  /* ---------- gaps (holes) incl. growing gaps ---------- */
  function currentHoles() {
    const holes = runLevel.staticHoles.slice();
    for (const t of runLevel.traps) {
      if (t.type === "growingGap" && t.w > 0) {
        holes.push({ x: t.x - t.w / 2, y: 0, w: t.w, h: runLevel.height });
      }
    }
    return holes;
  }

  function carve(r, holes) {
    let out = [r];
    for (const h of holes) {
      const next = [];
      for (const k of out) {
        if (k.x >= h.x + h.w || k.x + k.w <= h.x || k.y >= h.y + h.h || k.y + k.h <= h.y) {
          next.push(k); continue;
        }
        if (h.x > k.x) next.push({ x: k.x, y: k.y, w: h.x - k.x, h: k.h, carve: true, oneway: true });
        const right = k.x + k.w - (h.x + h.w);
        if (right > 0.5) next.push({ x: h.x + h.w, y: k.y, w: right, h: k.h, carve: true, oneway: true });
      }
      out = next;
    }
    return out;
  }

  function solidRects() {
    const holes = currentHoles();
    const rects = [];
    for (const r of runLevel.carvable) {
      // carve vertically using holes' horizontal ranges only if overlaps
      const pieces = carve(r, holes);
      for (const p of pieces) rects.push({ x: p.x, y: p.y, w: p.w, h: p.h });
    }
    for (const s of runLevel.solids) if (s.solidNow) rects.push(s);
    for (const t of runLevel.traps) if (t.solid) rects.push(t.rect);
    return rects;
  }

  // All landable-on-top surfaces: carved floors, explicit platforms and
  // solid platform traps. These only catch the player from above.
  function onewayRects() {
    const holes = currentHoles();
    const rects = [];
    for (const r of runLevel.carvable) {
      const pieces = carve(r, holes);
      for (const p of pieces) rects.push({ x: p.x, y: p.y, w: p.w, h: p.h, ground: true });
    }
    for (const o of runLevel.oneways) rects.push(o);
    for (const s of runLevel.solids) if (s.solidNow && s.oneway) rects.push(s);
    for (const t of runLevel.traps) if (t.solid && t.oneway) rects.push(t.rect);
    return rects;
  }

  /* ---------------------------------------------------------
     PHYSICS
     --------------------------------------------------------- */
  const S = () => fit; // frame-time scale

  function updatePlayer() {
    const p = runLevel.player;
    if (p.dead) {
      p.deadT++;
      if (p.deadT > 55) { // respawn or game over
        if (lives > 0) {
          resetSpawn();
          Audio.sfx.respawn();
        } else {
          if (!gameoverWipe) {
            gameoverWipe = true;
            pb.cleared = {};
            savePB();
            totalDeaths = 0;
          }
          state = "gameover";
          Audio.music.stop();
        }
      }
      return;
    }
    p.animTime++;

    // input
    let dir = (keys.ArrowRight || keys.d || keys.D ? 1 : 0) - (keys.ArrowLeft || keys.a || keys.A ? 1 : 0);
    const jumpHeld = keys.ArrowUp || keys.w || keys.W || (!runLevel.isBoss && keys.Space);
    const dropHeld = keys.ArrowDown || keys.s || keys.S;

    // (menu shortcuts handled elsewhere)
    p.vx = dir * WALK;
    if (dir !== 0) p.face = dir > 0 ? 1 : -1;

    // drop through one-way
    if (dropHeld && p.grounded) p.dropTimer = (p.dropTimer || 0) + 1;
    else p.dropTimer = 0;

    // jump
    let jumpCtx = keys._jump; // released gate (edge detect handled via flags below)
    if (jumpHeld && p.grounded && !p.jumpHeld && p.dropTimer < 6) {
      p.vy = JUMP;
      p.grounded = false;
      p.jumpHeld = true;
      p.anim = "jump";
      p.animTime = 0;
      Audio.sfx.jump();
    }
    if (!jumpHeld) p.jumpHeld = false;

    // gravity
    p.vy += GRAV;
    if (p.vy > MAXFALL) p.vy = MAXFALL;

    // animations (air vs ground)
    if (!p.grounded) {
      if (p.vy < -0.5) p.anim = "jump";
      else if (p.vy > 0.5) p.anim = "fall";
    } else if (Math.abs(p.vx) > 0.5) {
      p.anim = "walk";
    } else {
      p.anim = "idle";
    }

    // horizontal move + resolve (one-way platforms don't block from the side)
    p.x += p.vx * S();
    const rects = solidRects().filter(s => !s.oneway);
    for (const s of rects) {
      if (p.x < s.x + s.w && p.x + p.w > s.x && p.y < s.y + s.h && p.y + p.h > s.y) {
        if (p.vx > 0) p.x = s.x - p.w;
        else if (p.vx < 0) p.x = s.x + s.w;
        p.vx = 0;
      }
    }
    // walls at world bounds
    if (p.x < 0) { p.x = 0; }
    if (p.x + p.w > runLevel.width) p.x = runLevel.width - p.w;

    // vertical move + resolve
    const prevBottom = p.y + p.h;
    p.y += p.vy * S();
    p.grounded = false;
    let landedSolid = null;
    for (const s of rects) {
      if (p.x < s.x + s.w && p.x + p.w > s.x && p.y < s.y + s.h && p.y + p.h > s.y) {
        if (p.vy > 0) {
          p.y = s.y - p.h;
          p.vy = 0;
          p.grounded = true;
          landedSolid = s;
        } else if (p.vy < 0) {
          p.y = s.y + s.h;
          p.vy = 0;
        }
      }
    }
    // one-way platforms: land on top from above, pass through from below
    if (p.vy >= 0) {
      for (const o of onewayRects()) {
        if ((o.ground || p.dropTimer < 6) &&
            p.x + p.w > o.x && p.x < o.x + o.w &&
            prevBottom <= o.y + 8 && p.y + p.h >= o.y && p.y + p.h <= o.y + 22) {
          p.y = o.y - p.h;
          p.vy = 0;
          p.grounded = true;
          landedSolid = o;
        }
      }
    }

    // carry on moving platforms
    for (const t of runLevel.traps) {
      if (!t.solid) continue;
      const r = t.rect;
      if (p.grounded && p.y + p.h <= r.y + 8 && p.y + p.h >= r.y - 20 &&
          p.x + p.w > r.x + 2 && p.x < r.x + r.w - 2) {
        p.x += t.dx || 0;
        p.y += t.dy || 0;
      }
    }

    // landing fx
    if (p.grounded && !p._wasGrounded && p.vy === 0 && runLevel._prevVy > 3) {
      p.squash = 1;
      Audio.sfx.land();
      dust(p.x + p.w / 2, p.y + p.h, 5);
    }
    runLevel._prevVy = runLevel._prevVy === undefined ? 0 : (p.grounded ? 0 : p.vy);
    p._wasGrounded = p.grounded;
    if (p.squash > 0) p.squash -= 0.06;

    // walk dust + sound (throttled inside Audio)
    if (p.grounded && Math.abs(p.vx) > 0.5 && frame % 18 === 0) {
      dust(p.x + p.w / 2 - p.face * 8, p.y + p.h, 1);
      Audio.sfx.walk();
    }

    // fell off the world
    if (p.y > runLevel.height + 40) { kill("the void"); }
  }

  function dust(x, y, n) {
    for (let i = 0; i < n; i++) {
      runLevel.particles.push({
        x: x + (Math.random() - 0.5) * 6, y,
        vx: (Math.random() - 0.5) * 1.2, vy: -(0.2 + Math.random() * 0.6),
        life: 20 + Math.random() * 10, t: 0, kind: "dust"
      });
    }
  }

  function kill(cause) {
    const p = runLevel.player;
    if (p.dead || invuln > 0) return;
    p.dead = true;
    p.deadT = 0;
    p.anim = "die";
    p.animTime = 0;
    p.vy = -6;
    lives--;
    levelDeaths++;
    totalDeaths++;
    for (let i = hearts.length - 1; i >= 0; i--) {
      if (!hearts[i].lost) { hearts[i].lost = true; break; }
    }
    Audio.sfx.die();
    shake += 6;
  }

  /* ---------------------------------------------------------
     WORLD UPDATE
     --------------------------------------------------------- */
  function updateGame() {
    // chest message freezes the world
    if (runLevel.chestMsg) {
      if (keys.Space || keys.Enter || keys.ArrowUp || keys.w || keys.W || mouse.click) {
        runLevel.chestMsg = false;
        keys.Space = false;
        keys.Enter = false;
        mouse.click = false;
        shootCd = 18;
      }
      return;
    }
    // traps
    for (const t of runLevel.traps) {
      Traps.update(t, runLevel, dt);
      // falling block / caramel etc set t.kill - checked below
    }
    Traps.updateProjectiles(runLevel);

    updatePlayer();
    if (state !== "game") return; // death may move state

    const p = runLevel.player;
    if (p.dead) return;
    if (runLevel.config.backDeathX != null && p.x <= runLevel.config.backDeathX) {
      kill("you walked back");
      selectWorld = current.world;
      state = "select";
      Audio.music.play("lobby");
      return;
    }
    if (runLevel.finalWon) {
      updateVictoryEffects();
      if (p.x < (runLevel.config.leftDeathX || -Infinity)) kill("you walked past the win");
      return;
    }

    // kill detection
    for (const t of runLevel.traps) {
      const k = Traps.killRect(t);
      if (k && overlap(p, k)) { kill(t.type + " trap"); break; }
    }
    if (p.dead) return;
    if (invuln > 0) invuln--;

    // projectiles
    for (const pr of runLevel.projectiles) {
      if (overlap(p, { x: pr.x - pr.r, y: pr.y - pr.r, w: pr.r * 2, h: pr.r * 2 })) { kill("fire"); break; }
    }
    if (p.dead) return;

    // boss level logic: chest, gun, boss, boss projectiles
    if (runLevel.isBoss) {
      updateChest();
      updateGun();
      updateBoss();
      updateBossBullets();
      if (state !== "game" || p.dead) return;
    }

    // bounce/warp handled in trap update already

    // exit
    const ex = runLevel.exitRect;
    if (p.x + p.w > ex.x && p.x < ex.x + ex.w && p.y + p.h > ex.y && p.y < ex.y + ex.h) {
      win();
    }
  }

  /* ---------- boss helpers (player gun, chest, boss logic) ---------- */

  function sfx(name) {
    try { if (Audio.sfx && Audio.sfx[name]) Audio.sfx[name](); } catch (e) {}
  }

  function pushParticles(x, y, n, color, power) {
    for (let i = 0; i < n; i++) {
      runLevel.particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * (power || 3),
        vy: -Math.random() * (power || 3),
        life: 18 + Math.random() * 14, t: 0, kind: "spark", col: color
      });
    }
  }

  function hurtHearts(n) {
    const p = runLevel.player;
    if (p.dead || invuln > 0) return;
    let drained = 0;
    for (let i = hearts.length - 1; i >= 0 && drained < n; i--) {
      if (!hearts[i].lost) { hearts[i].lost = true; hearts[i].fl = 6; lives--; drained++; }
    }
    shake += 6;
    sfx("die");
    if (hearts.every(h => h.lost)) {
      p.dead = true;
      p.deadT = 0;
      p.anim = "die";
      p.animTime = 0;
      p.vy = -7;
    }
  }

  function updateChest() {
    const cb = runLevel.chest;
    if (!cb || runLevel.chestOpen) return;
    const p = runLevel.player;
    if (p.x + p.w > cb.x - 6 && p.x < cb.x + cb.w + 6 &&
        p.y + p.h > cb.y && p.y < cb.y + cb.h) {
      runLevel.chestOpen = true;
      runLevel.chestMsg = true;
      runLevel.player.hasGun = true;
      sfx("click");
    }
  }

  function updateGun() {
    const p = runLevel.player;
    // reload: 1 second before you can fire again; reload click at the halfway mark
    if (p.reloadT > 0) {
      p.reloadT--;
      if (p.reloadT === 30) sfx("gunReload");
    }
    if (keys.Space && p.hasGun && p.reloadT <= 0) {
      p.reloadT = 60;
      const mx = p.x + (p.face > 0 ? p.w : 0);
      const my = p.y + p.h * 0.32;
      runLevel.bullets.push({ x: mx, y: my, x0: mx, y0: my, vx: p.face * 13, life: 90, t: 0, dead: false });
      p.shootFlash = 8;
      pushParticles(mx, my, 3, "#ffdf8a", 1.5);
      sfx("gunShot");
    }
    const b = runLevel.boss;
    for (const bl of runLevel.bullets) {
      if (bl.dead) continue;
      bl.x += bl.vx;
      bl.t++;
      if (bl.t > bl.life) bl.dead = true;
      if (bl.y < 8 || bl.y > 470) bl.dead = true;
      if (b && !b.dead && bl.x > b.x && bl.x < b.x + b.w && bl.y > b.y && bl.y < b.y + b.h) {
        const head = bl.y < b.y + b.h * 0.4;
        bossDamage(head ? 2 : 1);
        bl.dead = true;
      }
    }
    runLevel.bullets = runLevel.bullets.filter(v => !v.dead);
    if (p.shootFlash > 0) p.shootFlash--;
  }

  function bossDamage(n) {
    const b = runLevel.boss;
    if (b.dead) return;
    b.hp -= n;
    b.flash = 8;
    b.state = "hurt";
    b.stateT = 0;
    shake += 2;
    sfx("trapSpike");
    pushParticles(b.x + b.w / 2, b.y + b.h / 2, 10, "#ffce6b", 3);
    if (b.hp <= 0) {
      b.hp = 0;
      b.dead = true;
      b.state = "dead";
      b.stateT = 0;
      b.deadT = 0;
      shake += 10;
      sfx("trapSlam");
      for (let i = 0; i < 46; i++) {
        pushParticles(b.x + Math.random() * b.w, b.y + Math.random() * b.h, 1,
          ["#b06bff", "#ff6b6b", "#ffdf8a", "#5a4545"][i % 4], 5);
      }
    }
  }

  function fireBossShot() {
    const p = runLevel.player;
    const b = runLevel.boss;
    const ox = b.x + b.w / 2 + b.face * 6;
    const oy = b.y + b.h * 0.26;
    const tx = p.x + p.w / 2;
    const ty = p.y + p.h / 2;
    let dx = tx - ox;
    let dy = ty - oy;
    if (b.aimAt) { dx = b.aimAt.x - ox; dy = b.aimAt.y - oy; }
    // clamp upward angle to max 45 degrees (boss can't shoot straight up)
    if (dy < 0) {
      const absDx = Math.abs(dx);
      const maxUpDy = absDx; // 45 degrees: |dy| <= |dx|
      if (-dy > maxUpDy) dy = -maxUpDy;
    }
    const m = Math.max(12, Math.sqrt(dx * dx + dy * dy));
    const spd = 2.2 + current.world * 0.1;
    const nx = dx / m * spd, ny = dy / m * spd;
    runLevel.bossBullets.push({
      x: ox, y: oy, vx: nx, vy: ny,
      t: 0, dmg: b.dmg, r: 7 + current.world * 0.4,
      angle: Math.atan2(ny, nx)
    });
  }

  function updateBossBullets() {
    const p = runLevel.player;
    const bs = runLevel.bossBullets;
    for (let i = bs.length - 1; i >= 0; i--) {
      const q = bs[i];
      q.t++;
      q.x += q.vx;
      q.y += q.vy;
      if (q.y < -20 || q.y > 480 || q.x > runLevel.width + 30 || q.x < -40) { bs.splice(i, 1); continue; }
      if (!p.dead && invuln <= 0 &&
          p.x < q.x + q.r && p.x + p.w > q.x - q.r &&
          p.y < q.y + q.r && p.y + p.h > q.y - q.r) {
        hurtHearts(q.dmg);
        pushParticles(q.x, q.y, 6, "#ff6b6b", 2.5);
        bs.splice(i, 1);
      }
    }
  }

  function updateBoss() {
    const b = runLevel.boss;
    if (!b) return;
    b.t++;
    if (b.dead) {
      b.deadT++;
      if (b.deadT === 40) {
        pushParticles(b.x + b.w / 2, b.y + b.h / 2, 26, "#b06bff", 6);
        shake += 6;
      }
      if (b.deadT === 70) winBoss();
      return;
    }
    const p = runLevel.player;
    const dx = (p.x + p.w / 2) - (b.x + b.w / 2);
    const dist = Math.abs(dx);
    const dy = (p.y + p.h / 2) - (b.y + b.h / 2);
    b.face = dx >= 0 ? 1 : -1;
    b.aimUp = Math.max(0, Math.min(1, dy / 220));
    if (b.state !== "sleep") b.aimAt = { x: p.x + p.w / 2, y: p.y + p.h / 2 };

    switch (b.state) {
      case "sleep":
        // frozen in the dark until the player crosses into the arena
        if (runLevel.camLock) { b.state = "wake"; b.stateT = 0; }
        break;
      case "wake":
        b.stateT++;
        if (b.stateT > 26) b.state = "walk";
        break;
      case "walk":
        // no jumping: troll plods along the ground, never touching platforms
        b.stateT++;
        const half = b.w / 2;
        if (dist > 240) b.x += b.face * 1.3;
        else if (dist < 150) b.x -= b.face * 1.0;
        b.x = Math.max(b.patrol[0], Math.min(b.patrol[1], b.x));
        // fixed 2s attack cadence: 70 walk + 38 aim + 12 shoot = 120 frames
        if (b.stateT > 70) { b.state = "aim"; b.stateT = 0; }
        break;
      case "aim":
        b.stateT++;
        if (b.stateT > 38) {
          b.state = "shoot";
          b.stateT = 0;
          fireBossShot();
          sfx("gunPew");
        }
        break;
      case "shoot":
        b.stateT++;
        b.recoil = 6;
        if (b.stateT > 12) { b.state = "walk"; b.stateT = 0; }
        break;
      case "hurt":
        b.stateT++;
        if (b.stateT > 14) b.state = "walk";
        break;
    }
    if (b.flash > 0) b.flash--;
    if (b.recoil > 0) b.recoil--;
    if (b.stompCd > 0) b.stompCd--;

    // stomp the troll's head for 2 damage (jump on it)
    const pl = runLevel.player;
    if (!b.dead && !pl.dead && b.stompCd <= 0 && pl.vy > 0 &&
        pl.y + pl.h >= b.y + 2 && pl.y + pl.h <= b.y + b.h * 0.4 &&
        pl.x + pl.w > b.x + 8 && pl.x < b.x + b.w - 8) {
      bossDamage(2);
      b.stompCd = 50;
      pl.vy = -10;
      pl.grounded = false;
      invuln = 26;
      sfx("jump");
    }
  }

  function overlap(a, b) {
    if (b.w === undefined || b.h === undefined) return false;
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function nextTarget() {
    let w = current.world, lv = current.level;
    lv++;
    const worldLevels = Levels.getWorld(w);
    if (lv > worldLevels.length) { w++; lv = 1; }
    if (w > 4) return null;
    return { world: w, level: lv, newWorld: lv === 1 };
  }

  function win() {
    pb.cleared[current.world + "-" + current.level] = true;
    if (runLevel && runLevel.config.finalWin) {
      runLevel.finalWon = true;
      runLevel.confetti = Array.from({ length: 90 }, (_, i) => ({
        x: Math.random() * CW,
        y: -Math.random() * CH,
        vx: (Math.random() - 0.5) * 2,
        vy: 1.5 + Math.random() * 2.5,
        r: 2 + Math.random() * 3,
        hue: i % 3
      }));
      savePB();
      Audio.music.stop();
      Audio.sfx.levelClear();
      return;
    }
    const nt = nextTarget();
    if (nt) {
      pb.cleared[nt.world + "-" + nt.level] = pb.cleared[nt.world + "-" + nt.level] || false; // marker only (entry)
    }
    savePB();
    Audio.music.stop();
    keys.Space = false;
    keys.Enter = false;
    if (!runLevel || !nt || nt.newWorld) {
      state = "worldclear";
      if (nt) pendingWorldBurst = nt.world;
      Audio.sfx.levelClear();
    } else {
      state = "clear";
      winTimer = 0;
      pendingLevelBurst = nt ? { world: nt.world, level: nt.level } : null;
      Audio.sfx.levelClear();
    }
  }

  function winBoss() {
    pb.cleared[current.world + "-" + current.level] = true;
    savePB();
    Audio.music.stop();
    keys.Space = false;
    keys.Enter = false;
    state = "worldclear";
    pendingWorldBurst = current.world + 1 <= 4 ? current.world + 1 : 0;
    Audio.sfx.levelClear();
  }

  // Advance from the level-clear / world-clear screens (any key, click, or space/enter).
  function advClear() {
    Audio.sfx.click();
    const nt = nextTarget();
    if (nt) gotoLevel(nt.world, nt.level);
    else { state = "menu"; Audio.music.play("lobby"); }
  }

  function gotoLevel(w, lv) {
    current.world = w;
    current.level = lv;
    currentLevel = Levels.get(w, lv);
    if (!currentLevel) { state = "select"; return; }
    buildLevel();
    state = "game";
    Audio.init(); // warm the audio context (user gesture reached here)
    Audio.music.play(currentLevel.music || "game");
  }

  function cameraUpdate() {
    const p = runLevel.player;
    let cx;
    if (runLevel.isBoss) {
      if (!runLevel.camLock && p.x + p.w > runLevel.arena) {
        runLevel.camLock = true;
        if (runLevel.boss) {
          runLevel.boss.state = "wake";
          runLevel.boss.stateT = 0;
          runLevel.boss.aimAt = null;
        }
        Audio.sfx.trapSlam();
        shake += 6;
      }
      cx = runLevel.camLock ? runLevel.camLockX : Math.max(0, Math.min(p.x + p.w / 2 - CW / 2, Math.max(0, runLevel.width - CW)));
    } else {
      cx = Math.max(0, Math.min(p.x + p.w / 2 - CW / 2, Math.max(0, runLevel.width - CW)));
    }
    const cy = Math.max(0, Math.min(p.y + p.h / 2 - CH / 2, Math.max(0, runLevel.height - CH)));
    cam.x += (cx - cam.x) * 0.08;
    cam.y += (cy - cam.y) * 0.08;
  }

  /* ---------------------------------------------------------
     PARTICLES / EMBERS
     --------------------------------------------------------- */
  function updateParticles() {
    if (!runLevel) return;
    const ps = runLevel.particles;
    for (let i = ps.length - 1; i >= 0; i--) {
      const q = ps[i];
      q.t++;
      q.x += q.vx; q.y += q.vy;
      if (q.kind === "dust") q.vy += 0.02;
      if (q.t > q.life) ps.splice(i, 1);
    }

    for (const e of runLevel.embers) {
      e.x += e.vx; e.y += e.vy;
      e.t++;
      if (e.y < -10) { e.y = CH + 10; e.x = cam.x + Math.random() * CW; }
      if (e.x < cam.x - 20) e.x = cam.x + CW + 20;
      if (e.x > cam.x + CW + 20) e.x = cam.x - 20;
    }
  }

  function updateVictoryEffects() {
    for (const c of runLevel.confetti) {
      c.x += c.vx;
      c.y += c.vy;
      c.vy += 0.035;
      if (c.y > CH + 12) {
        c.y = -10;
        c.x = Math.random() * CW;
        c.vy = 1.5 + Math.random() * 2.5;
      }
    }
  }

  /* ---------------------------------------------------------
     DRAWING
     --------------------------------------------------------- */
  const THEMES = {
    dungeon: { bg1: "#2a1136", bg2: "#0d0514", glow: "#b06bff", rock: "#241033" },
    crypt:   { bg1: "#161024", bg2: "#08050d", glow: "#c9e0a0", rock: "#1d1630" },
    hellfire:{ bg1: "#2a1208", bg2: "#0e0402", glow: "#ffaa33", rock: "#331608" }
  };

  function drawBackground() {
    const th = THEMES[(currentLevel && currentLevel.bg) || "dungeon"] || THEMES.dungeon;
    // base gradient
    const g = ctx.createLinearGradient(0, 0, 0, CH);
    g.addColorStop(0, th.bg1);
    g.addColorStop(1, th.bg2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CW, CH);
    // warm glow centered (the "yellow middle")
    const rg = ctx.createRadialGradient(CW / 2, CH / 2, 40, CW / 2, CH / 2, 420);
    rg.addColorStop(0, th.glow + "44");
    rg.addColorStop(0.5, th.glow + "1a");
    rg.addColorStop(1, th.glow + "00");
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, CW, CH);
    // distant rock silhouettes (parallax)
    ctx.fillStyle = th.rock;
    for (let i = 0; i < 8; i++) {
      const bx = i * 200 - (cam.x * 0.15 % 200);
      ctx.beginPath();
      ctx.moveTo(bx, CH * 0.55);
      ctx.lineTo(bx + 60, CH * 0.4);
      ctx.lineTo(bx + 130, CH * 0.5);
      ctx.lineTo(bx + 200, CH * 0.42);
      ctx.lineTo(bx + 260, CH * 0.6);
      ctx.closePath();
      ctx.fill();
    }
    // top-side rock
    ctx.save();
    ctx.translate(0, 0);
    for (let i = 0; i < 8; i++) {
      const bx = i * 200 - (cam.x * 0.1 % 200);
      ctx.beginPath();
      ctx.moveTo(bx, 0);
      ctx.lineTo(bx + 80, 26);
      ctx.lineTo(bx + 160, 8);
      ctx.lineTo(bx + 240, 30);
      ctx.lineTo(bx + 300, 0);
      ctx.fillStyle = th.rock;
      ctx.fill();
    }
    ctx.restore();
    // embers (screen space, warm)
    if (runLevel) {
      for (const e of runLevel.embers) {
        const sx = e.x - cam.x;
        const sy = e.y;
        if (sx < -5 || sx > CW + 5) continue;
        const a = 0.4 + Math.sin(e.t * 0.3) * 0.3;
        ctx.fillStyle = `rgba(255,${120 + (e.t % 80)},40,${Math.max(0.05, a)})`;
        ctx.beginPath();
        ctx.arc(sx, sy, e.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawSolid(s, isFloor) {
    const g = ctx.createLinearGradient(0, s.y, 0, s.y + s.h);
    if (isFloor) {
      g.addColorStop(0, "#e05555");
      g.addColorStop(0.15, "#c04444");
      g.addColorStop(1, "#8a2424");
    } else {
      g.addColorStop(0, "#d34a4a");
      g.addColorStop(1, "#992828");
    }
    ctx.fillStyle = g;
    ctx.fillRect(s.x, s.y, s.w, s.h);
    if (isFloor) {
      // glowing edge + brick lines
      ctx.fillStyle = "rgba(255,150,120,0.4)";
      ctx.fillRect(s.x, s.y, s.w, 3);
      ctx.strokeStyle = "rgba(50,0,0,0.3)";
      ctx.lineWidth = 1;
      const brickH = 22;
      let row = 0;
      for (let y = s.y + 3; y < s.y + s.h; y += brickH, row++) {
        for (let x = s.x + (row % 2 ? 14 : 0); x < s.x + s.w; x += 28) {
          ctx.strokeRect(x, y, 28, brickH);
        }
      }
    }
  }

  function drawWorld() {
    ctx.save();
    ctx.translate(-Math.round(cam.x), -Math.round(cam.y));

    // solids underground = none; draw flo+solids
    const rects = solidRects();
    for (const s of rects) {
      const isFloor = (s.carve !== undefined) || s.type === "floor";
      drawSolid(s, isFloor);
    }
    for (const o of runLevel.oneways) {
      drawSolid(o, false);
      ctx.fillStyle = "rgba(170,110,255,0.5)";
      ctx.fillRect(o.x, o.y, o.w, 3);
    }
    // fake solids shimmer
    for (const s of runLevel.solids) {
      if (s.type === "fake") {
        ctx.fillStyle = s.solidNow ? "rgba(255,180,120,0.35)" : "rgba(255,180,120,0.08)";
        ctx.fillRect(s.x, s.y, s.w, s.h);
      }
    }
    // traps
    for (const t of runLevel.traps) Traps.draw(t, ctx, runLevel);
    // projectiles
    for (const pr of runLevel.projectiles) {
      ctx.fillStyle = "#ff7a30";
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, pr.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffe08a";
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, pr.r * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,120,40,0.4)";
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, pr.r * 1.6 + Math.sin(frame * 0.3) * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    // exit door
    drawExitDoor(runLevel.exitRect);
    // boss bullets — slow red lasers
    for (const q of runLevel.bossBullets) {
      const len = 26;
      const ang = q.angle != null ? q.angle : Math.atan2(q.vy, q.vx);
      ctx.save();
      ctx.translate(q.x, q.y);
      ctx.rotate(ang);
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = "#ff3838";
      ctx.fillRect(-len / 2 - 6, -5, len + 12, 10);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#ff5a5a";
      ctx.fillRect(-len / 2, -2.5, len, 5);
      ctx.fillStyle = "#ffd0d0";
      ctx.fillRect(len / 2 - 5, -1.5, 6, 3);
      ctx.restore();
    }
    // gun bullets — blue beam that shoots straight out of the gun
    for (const bl of runLevel.bullets) {
      ctx.save();
      ctx.lineCap = "round";
      ctx.strokeStyle = "rgba(64,150,255,0.35)";
      ctx.lineWidth = 13;
      ctx.beginPath();
      ctx.moveTo(bl.x0, bl.y0);
      ctx.lineTo(bl.x, bl.y);
      ctx.stroke();
      ctx.strokeStyle = "#55c2ff";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(bl.x0, bl.y0);
      ctx.lineTo(bl.x, bl.y);
      ctx.stroke();
      ctx.strokeStyle = "#d8f2ff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bl.x0, bl.y0);
      ctx.lineTo(bl.x, bl.y);
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "#55c2ff";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(bl.x, bl.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#55c2ff";
      ctx.beginPath();
      ctx.arc(bl.x0, bl.y0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // chest
    if (runLevel.chest) drawChest(runLevel.chest);
    // boss
    if (runLevel.boss) drawBoss(runLevel.boss);
    // particles
    for (const q of runLevel.particles) {
      ctx.globalAlpha = Math.max(0, 1 - q.t / q.life);
      ctx.fillStyle = q.kind === "dust" ? "rgba(200,170,140,0.8)" : "#ffd166";
      ctx.beginPath();
      ctx.arc(q.x, q.y, q.kind === "dust" ? 2 : 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // player
    if (!runLevel.player.dead || runLevel.player.deadT < 55) {
      Player.draw(ctx, runLevel.player);
      if (runLevel.isBoss && runLevel.player.hasGun) drawGun(ctx, runLevel.player);
    } else {
      // fading ghost that floats up
    }
    ctx.restore();
  }

  function drawChest(cb) {
    const open = runLevel.chestOpen;
    // soft glow when closed
    if (!open && frame % 45 < 22) {
      ctx.fillStyle = "rgba(255,214,120,0.25)";
      ctx.beginPath();
      ctx.ellipse(cb.x + cb.w / 2, cb.y + cb.h / 2, cb.w * 1.4, cb.h * 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // body
    ctx.fillStyle = "#6b4a2c";
    ctx.fillRect(cb.x, cb.y + cb.h * 0.28, cb.w, cb.h * 0.72);
    ctx.fillStyle = "#4a2f18";
    ctx.fillRect(cb.x + 2, cb.y + cb.h * 0.28 + 2, cb.w - 4, cb.h * 0.72 - 4);
    // lid (opens up when chest open)
    if (!open) {
      ctx.fillStyle = "#8a6138";
      ctx.fillRect(cb.x - 2, cb.y, cb.w + 4, cb.h * 0.4);
      ctx.fillStyle = "#c9a05a";
      ctx.fillRect(cb.x, cb.y + cb.h * 0.4 - 3, cb.w, 3);
    } else {
      ctx.save();
      ctx.translate(cb.x - 2, cb.y);
      ctx.rotate(-0.9);
      ctx.fillStyle = "#8a6138";
      ctx.fillRect(0, 0, cb.w + 4, cb.h * 0.4);
      ctx.restore();
    }
    ctx.fillStyle = "#ffd76a";
    ctx.fillRect(cb.x + cb.w / 2 - 3, cb.y + cb.h * 0.35, 6, cb.h * 0.3);
    if (open) {
      ctx.fillStyle = "#ffe9b0";
      ctx.fillRect(cb.x + cb.w / 2 - 4, cb.y + cb.h * 0.14, 8, 12);
    }
  }

  function drawBoss(b) {
    const x = b.x, y = b.y, w = b.w, h = b.h;
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    if (b.state === "sleep") {
      // dormant silhouette — eyes glint faintly in the dark
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = "#120a1a";
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(255,60,60,0.5)";
      ctx.fillRect(-w / 2 + 6, -h / 2 + 8, 8, 4);
      ctx.fillRect(w / 2 - 14, -h / 2 + 8, 8, 4);
      ctx.restore();
      return;
    }
    if (b.dead) {
      // boss crumbles into falling chunks
      ctx.globalAlpha = Math.max(0, 1 - b.deadT / 60);
      ctx.translate((Math.random() - 0.5) * 3 * (1 - b.deadT / 60), (b.deadT * 0.4));
      ctx.rotate((Math.random() - 0.5) * 0.1 * (1 - b.deadT / 60));
    }
    const bob = b.animPose || {};
    const step = b.state === "walk" ? Math.sin(b.t * 0.28) : 0;
    ctx.scale(b.face, 1);

    // body (big troll torso, liver-ish green)
    ctx.fillStyle = b.state === "hurt" ? "#3a9a5a" : "#4f8a46";
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 2, -h / 2 + 14);
    ctx.quadraticCurveTo(-w / 2 - 4, h * 0.1, -w / 2 + 10, h * 0.55);
    ctx.quadraticCurveTo(-w / 2 + 14, h / 2, -w / 2 + 22, h / 2 - 6);
    ctx.lineTo(w / 2 - 22, h / 2 - 6);
    ctx.quadraticCurveTo(w / 2 - 14, h / 2, w / 2 - 10, h * 0.55);
    ctx.quadraticCurveTo(w / 2 + 4, h * 0.1, w / 2 - 2, -h / 2 + 14);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#3c6b34";
    ctx.fillRect(-w / 2 + 8, -h / 2 + 16, w - 16, h * 0.3);

    // arms
    const aimed = b.state === "aim" || b.state === "shoot";
    const armLift = aimed ? -h * 0.22 : step * 3;
    ctx.fillStyle = "#4f8a46";
    ctx.fillRect(-w / 2 + 3, -h / 2 + 26 + (aimed ? -h * 0.18 : 0), 9, h * 0.34);
    ctx.fillRect(w / 2 - 12, -h / 2 + 26 + (aimed ? -16 : 0), 9, h * 0.34);
    ctx.fillStyle = "#3c6b34";
    ctx.fillRect(-w / 2 + 4, -h / 2 + 26 + armLift, 10, 13);
    ctx.fillRect(w / 2 - 14, -h / 2 + 26 + (aimed ? -16 : step * 3), 10, 13);

    // head
    ctx.fillStyle = "#52934a";
    ctx.beginPath();
    ctx.arc(0, -h / 2 + 4, w * 0.26, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = "#3c6b34";
    ctx.fillRect(-w * 0.12, -h / 2 + 12, w * 0.24, 9);

    // eyes (look at the player when aiming)
    const eyeUp = aimed ? -2 : 0;
    ctx.fillStyle = "#ffe24a";
    ctx.beginPath();
    ctx.arc(-w * 0.1, -h / 2 + 2 + eyeUp, 4, 0, Math.PI * 2);
    ctx.arc(w * 0.1, -h / 2 + 2 + eyeUp, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a0f0f";
    ctx.beginPath();
    ctx.arc((b.face > 0 ? 1 : 0) * w * 0.03 + w * 0.1, -h / 2 + 2 + eyeUp, 2, 0, Math.PI * 2);
    ctx.fill();

    // muzzle flash when shooting
    if (b.state === "shoot" && b.recoil > 3) {
      ctx.fillStyle = "rgba(255,220,120,0.9)";
      ctx.beginPath();
      ctx.moveTo(w / 2, -h * 0.12);
      ctx.lineTo(w / 2 + 18, -h * 0.12 - 4);
      ctx.lineTo(w / 2 + 18, -h * 0.12 + 4);
      ctx.closePath();
      ctx.fill();
    }

    // legs (walk)
    ctx.fillStyle = "#3c6b34";
    ctx.fillRect(-w * 0.22, h / 2 - 10 + step * 4.5, 10, 10 - step * 4.5);
    ctx.fillRect(w * 0.08, h / 2 - 10 - step * 4.5, 10, 10 + step * 4.5);

    // white flash when hit
    if (b.flash > 0) {
      ctx.globalAlpha = b.flash / 9;
      ctx.fillStyle = "#fff";
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    // single HP bar above the boss — damaged part grays out, creeping in from the right
    const bw = 110, bh = 9;
    const bx = x + w / 2 - bw / 2, by = y - 18;
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
    // gray "used up" fill covering the whole bar first
    ctx.fillStyle = "#46464f";
    ctx.fillRect(bx, by, bw, bh);
    ctx.save();
    ctx.beginPath();
    ctx.rect(bx, by, bw, bh);
    ctx.clip();
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 2;
    for (let hx = bx - bh * 2; hx <= bx + bw + bh * 2; hx += 7) {
      ctx.beginPath();
      ctx.moveTo(hx, by + bh);
      ctx.lineTo(hx + bh, by);
      ctx.stroke();
    }
    ctx.restore();
    // red remainder shrinks from the right, so gray visibly eats the bar from the right
    const frac = Math.max(0, b.hp / b.maxHp);
    if (frac > 0) {
      ctx.fillStyle = "#ff4b3e";
      ctx.fillRect(bx, by, bw * frac, bh);
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.fillRect(bx, by, bw * frac, bh * 0.35);
    }
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(bx, by + bh * 0.45, bw, 1.5);
  }

  function drawGun(ctx2, p) {
    const mx = p.x + (p.face > 0 ? p.w - 2 : -14);
    const my = p.y + p.h * 0.32;
    ctx2.save();
    ctx2.translate(mx, my);
    if (p.face < 0) ctx2.scale(-1, 1);
    // barrel droops while reloading
    if (p.reloadT > 0) ctx2.rotate(0.28 - 0.28 * Math.min(1, p.reloadT / 60));
    ctx2.fillStyle = "#8a8468";
    ctx2.fillRect(0, -3, 18, 6);
    ctx2.fillStyle = "#5a5444";
    ctx2.fillRect(7, 0, 13, 3);
    if (p.shootFlash > 0) {
      ctx2.fillStyle = "rgba(255,220,120,0.9)";
      ctx2.beginPath();
      ctx2.moveTo(18, 0);
      ctx2.lineTo(30, -5);
      ctx2.lineTo(30, 5);
      ctx2.closePath();
      ctx2.fill();
    }
    ctx2.restore();
  }

  function drawExitDoor(ex) {
    // warm glow behind
    const g = ctx.createRadialGradient(ex.x + ex.w / 2, ex.y + ex.h / 2, 2, ex.x + ex.w / 2, ex.y + ex.h / 2, 60);
    g.addColorStop(0, "rgba(255,220,150,0.5)");
    g.addColorStop(1, "rgba(255,220,150,0)");
    ctx.fillStyle = g;
    ctx.fillRect(ex.x - 30, ex.y - 20, ex.w + 60, ex.h + 40);
    // stone frame
    ctx.fillStyle = "#5a4636";
    ctx.fillRect(ex.x, ex.y, ex.w, ex.h);
    ctx.fillStyle = "#241812";
    ctx.fillRect(ex.x + 3, ex.y + 3, ex.w - 6, ex.h - 6);
    // inner glow
    ctx.fillStyle = "rgba(255,210,140,0.8)";
    ctx.fillRect(ex.x + 6, ex.y + 6, ex.w - 12, ex.h - 12);
    // devil sigil
    ctx.fillStyle = "#c22f2f";
    ctx.beginPath();
    ctx.arc(ex.x + ex.w / 2, ex.y + ex.h / 2 - 4, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffce6b";
    ctx.beginPath();
    ctx.moveTo(ex.x + ex.w / 2, ex.y + ex.h / 2 - 8);
    ctx.lineTo(ex.x + ex.w / 2 - 8, ex.y + ex.h / 2 + 7);
    ctx.lineTo(ex.x + ex.w / 2 + 8, ex.y + ex.h / 2 + 7);
    ctx.closePath();
    ctx.fill();
  }

  /* ---------------------------------------------------------
     UI SCREENS
     --------------------------------------------------------- */
  function btn(x, y, w, h, label, color = "#5a4636", hover = false, sub = "") {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = hover ? "#ffe8c0" : "#e8dcc8";
    ctx.font = "16px monospace";
    ctx.textAlign = "center";
    ctx.fillText(label, x + w / 2, y + h / 2 + 5);
    if (sub) {
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.font = "10px monospace";
      ctx.fillText(sub, x + w / 2, y + h - 8);
    }
    return { x, y, w, h };
  }

  function clicked(b) {
    if (mouse.click && mouse.x >= b.x && mouse.x <= b.x + b.w && mouse.y >= b.y && mouse.y <= b.y + b.h) {
      mouse.click = false;
      return true;
    }
    return false;
  }

  function hover(b) {
    return mouse.x > b.x && mouse.x < b.x + b.w && mouse.y > b.y && mouse.y < b.y + b.h;
  }

  function drawMenu() {
    ctx.fillStyle = "#0d0506";
    ctx.fillRect(0, 0, CW, CH);
    drawBackground();
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, 0, CW, CH);

    ctx.textAlign = "center";
    ctx.fillStyle = "#c22f2f";
    ctx.font = "bold 64px monospace";
    ctx.shadowColor = "#ffce6b";
    ctx.shadowBlur = 30;
    ctx.fillText("LEVEL DEVIL", CW / 2, 100);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#e8dcc8";
    ctx.font = "14px monospace";
    ctx.fillText("4 worlds  |  17 levels  |  a dungeon full of lies", CW / 2, 128);

    // world cards
    const cardW = 170, cardH = 52, gap = 12;
    const totalW = 5 * cardW + 4 * gap;
    let x0 = (CW - totalW) / 2;
    if (pendingWorldBurst > 0) {
      const burstColumn = (pendingWorldBurst - 1) % 5;
      const burstRow = Math.floor((pendingWorldBurst - 1) / 5);
      spawnLockBurst(
        x0 + burstColumn * (cardW + gap) + cardW / 2,
        148 + burstRow * (cardH + gap) + cardH / 2
      );
      pendingWorldBurst = 0;
    }
    ctx.font = "15px monospace";
    for (let w = 1; w <= 4; w++) {
      const col = (w - 1) % 5;
      const row = Math.floor((w - 1) / 5);
      const x = x0 + col * (cardW + gap);
      const y = 148 + row * (cardH + gap);
      const previousWorld = Levels.getWorld(w - 1);
      const previousLast = previousWorld[previousWorld.length - 1];
      const opened = (w === 1) || (previousLast && pb.cleared[(w - 1) + "-" + previousLast.level]);
      const b = { x, y, w: cardW, h: cardH };
      ctx.fillStyle = hover(b) ? "#221226" : "#160b22";
      ctx.strokeStyle = opened ? WORLD_COLORS[w] : "#3a2a3a";
      ctx.lineWidth = 2;
      ctx.fillRect(x, y, cardW, cardH);
      ctx.strokeRect(x, y, cardW, cardH);
      ctx.fillStyle = "#e8dcc8";
      ctx.fillText("WORLD " + w, x + cardW / 2, y + 18);
      ctx.font = "11px monospace";
      ctx.fillStyle = opened ? "#d8aaff" : "#8a6a8a";
      if (opened) {
        ctx.fillText(WORLD_NAMES[w], x + cardW / 2, y + 34);
        const done = Levels.getWorld(w).filter(l => pb.cleared[w + "-" + l.level]).length;
        ctx.fillStyle = "#8a7a8a";
        ctx.font = "10px monospace";
        ctx.fillText(done + "/" + Levels.getWorld(w).length + " cleared", x + cardW / 2, y + 48);
        if (clicked(b)) {
          selectWorld = w;
          state = "select";
          uiCooldown = 6;
          Audio.init();
          Audio.sfx.click();
          Audio.music.play("lobby");
        }
      } else {
        ctx.font = "bold 11px monospace";
        ctx.fillStyle = "#8a7a8a";
        ctx.fillText("LOCKED", x + cardW / 2, y + 36);
        drawPadlock(x + cardW - 22, y + 26, 0.9, "#8a7a8a");
        if (clicked(b)) Audio.sfx.locked();
      }
    }

    // CLEAR DATA button (top right of the worlds screen)
    const clearB = { x: CW - 150, y: 56, w: 120, h: 26 };
    ctx.fillStyle = hover(clearB) ? "#4a1010" : "#2a0d0d";
    ctx.strokeStyle = "#c22f2f";
    ctx.lineWidth = 1.5;
    ctx.fillRect(clearB.x, clearB.y, clearB.w, clearB.h);
    ctx.strokeRect(clearB.x, clearB.y, clearB.w, clearB.h);
    ctx.fillStyle = "#ff8a7a";
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.fillText("CLEAR DATA", clearB.x + clearB.w / 2, clearB.y + 17);
    ctx.textAlign = "left";
    if (clicked(clearB)) {
      pb = { cleared: {} };
      savePB();
      totalDeaths = 0;
      Audio.sfx.click();
    }

    // progress summary
    const clearedCount = Object.keys(pb.cleared).filter(k => pb.cleared[k]).length;
    ctx.fillStyle = "rgba(220,190,150,0.8)";
    ctx.font = "13px monospace";
    ctx.fillText(clearedCount + " / 38 cleared   |   total deaths: " + totalDeaths, CW / 2, 272);

    // controls hint
    ctx.fillStyle = "rgba(220,190,150,0.5)";
    ctx.font = "12px monospace";
    ctx.fillText("← → move  |  ↑ / SPACE jump  |  ESC pause  |  ↓ drop through platforms", CW / 2, 298);

    // tip of dex
    ctx.fillStyle = "#333";
    ctx.font = "10px monospace";
    ctx.fillText("“The floor is a liar.” — the devil", CW / 2, CH - 20);
  }

  function drawSelect() {
    ctx.fillStyle = "#0d0506";
    ctx.fillRect(0, 0, CW, CH);
    drawBackground();
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, CW, CH);

    ctx.textAlign = "center";
    ctx.fillStyle = WORLD_COLORS[selectWorld];
    ctx.font = "bold 34px monospace";
    ctx.fillText(WORLD_NAMES[selectWorld], CW / 2, 80);
    ctx.fillStyle = "#e8dcc8";
    ctx.font = "14px monospace";
    ctx.fillText("World " + selectWorld, CW / 2, 110);

    if (uiCooldown > 0) {
      uiCooldown--;
      mouse.click = false;
    }

    // Show every registered level in the selected world.
    const levelCount = Levels.getWorld(selectWorld).length;
    const columns = 5;
    const size = 82;
    const gap = 18;
    const gridWidth = columns * size + (columns - 1) * gap;
    const gridX = (CW - gridWidth) / 2;
    const gridY = 140;
    for (let lv = 1; lv <= levelCount; lv++) {
      const c = (lv - 1) % columns;
      const r = Math.floor((lv - 1) / columns);
      const x = gridX + c * (size + gap);
      const y = gridY + r * (size + gap);
      const b = { x, y, w: size, h: size };
      const unlocked = isUnlocked(selectWorld, lv);
      const cleared = pb.cleared[selectWorld + "-" + lv];
      ctx.fillStyle = hover(b) ? "#2a1818" : (unlocked ? "#1c1214" : "#101010");
      ctx.strokeStyle = cleared ? "#c22f2f" : (unlocked ? "#4a3a3a" : "#2a2a2a");
      ctx.lineWidth = 2;
      ctx.fillRect(x, y, size, size);
      ctx.strokeRect(x, y, size, size);
      ctx.fillStyle = cleared ? "#ffce6b" : (unlocked ? "#e8dcc8" : "#4a4a4a");
      ctx.font = "bold 26px monospace";
      ctx.fillText(String(lv).padStart(2, "0"), x + size / 2, y + size / 2 + 8);
      if (cleared) {
        ctx.font = "16px monospace";
        ctx.fillText("✓", x + size / 2, y + size - 12);
      }
      if (unlocked) {
        ctx.font = "10px monospace";
        ctx.fillStyle = "rgba(220,190,150,0.7)";
        const nm = Levels.get(selectWorld, lv);
        if (nm)         ctx.fillText(nm.name.slice(0, 13), x + size / 2, y + 64);
      } else {
        drawPadlock(x + size / 2, y + size / 2 + 16, 1.15, "#6a5a5a");
        ctx.font = "bold 11px monospace";
        ctx.fillStyle = "#8a5a5a";
        ctx.fillText("LOCKED", x + size / 2, y + size - 10);
      }
      if (unlocked && uiCooldown <= 0 && clicked(b)) {
        Audio.sfx.click();
        gotoLevel(selectWorld, lv);
        return;
      } else if (!unlocked && uiCooldown <= 0 && clicked(b)) {
        Audio.sfx.locked();
      }
    }
    // back button
    const back = btn(30, 26, 110, 34, "◄ ROOMS", "#3a2a2a");
    if (clicked(back)) { state = "menu"; Audio.sfx.click(); Audio.music.play("lobby"); }

  }

  function drawHud() {
    // level indicator (top-left; hearts live in the DOM overlay at top-right)
    ctx.textAlign = "left";
    ctx.fillStyle = "#2a1515";
    ctx.font = "bold 18px monospace";
    ctx.fillText("W" + current.world + " · L" + current.level + "  " + currentLevel.name, 16, 30);
    ctx.fillStyle = "#e8dcc8";
    ctx.font = "11px monospace";
    ctx.fillText("deaths " + levelDeaths + "  (" + totalDeaths + " all-time)", 16, 46);

    // level tip at start
    if (tipTimer > 0 && currentLevel.tip) {
      tipTimer--;
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,206,107," + Math.min(1, tipTimer / 60) + ")";
      ctx.font = "14px monospace";
      ctx.fillText("“" + currentLevel.tip + "”", CW / 2, CH - 16);
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.beginPath();
      ctx.arc(CW - 24, 24, 8, 0, Math.PI * 2);
      ctx.stroke();
    }
    // invuln flash
    if (invuln > 0 && (frame % 6) < 3) {
      // handled by player alpha? skip
    }
    // shoot hint in boss fights
    if (runLevel.isBoss && !runLevel.chestOpen && runLevel.chest && !runLevel.camLock) {
      ctx.font = "12px monospace";
      ctx.fillStyle = "rgba(255,214,120," + (0.4 + 0.4 * Math.sin(frame * 0.05)) + ")";
      ctx.textAlign = "center";
      ctx.fillText("A chest glimmers ahead...", CW / 2, CH - 30);
    }
    // reload progress under the player during boss reloads
    if (runLevel.isBoss && runLevel.player.reloadT > 0 && !runLevel.player.dead) {
      const px = runLevel.player.x - Math.round(cam.x > 0 ? cam.x : 0) + runLevel.player.w / 2;
      ctx.textAlign = "center";
      ctx.font = "9px monospace";
      ctx.fillStyle = "rgba(255,206,107,0.9)";
      ctx.fillText("reloading…", px, runLevel.player.y - Math.round(cam.y) - 6);
      const frac = 1 - runLevel.player.reloadT / 60;
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(px - 24, runLevel.player.y - Math.round(cam.y) - 3, 48, 5);
      ctx.fillStyle = "#ffce6b";
      ctx.fillRect(px - 24, runLevel.player.y - Math.round(cam.y) - 3, 48 * frac, 5);
    }
    // chest message overlay
    if (runLevel.chestMsg) drawChestMsg();
  }

  function drawVictoryOverlay() {
    if (!runLevel || !runLevel.finalWon) return;
    ctx.save();
    ctx.fillStyle = "rgba(20, 4, 30, 0.72)";
    ctx.fillRect(0, 0, CW, CH);
    for (const c of runLevel.confetti) {
      ctx.fillStyle = ["#ffce6b", "#ff6b6b", "#8ee3f5"][c.hue];
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate((c.x + c.y) * 0.03);
      ctx.fillRect(-c.r, -c.r * 0.5, c.r * 2, c.r);
      ctx.restore();
    }
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffce6b";
    ctx.font = "bold 44px monospace";
    ctx.shadowColor = "#ff6b6b";
    ctx.shadowBlur = 18;
    ctx.fillText("YOU BEAT THE GAME!", CW / 2, 155);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px monospace";
    ctx.fillText("CONGRATULATIONS!", CW / 2, 198);
    ctx.fillStyle = "#e8dcc8";
    ctx.font = "14px monospace";
    if (runLevel.player.x < (runLevel.config.leftWarningX || 0)) {
      ctx.fillText("WHAT ARE YOU DOING????", CW / 2, 250);
      ctx.fillText("YOU BEAT THE GAME!", CW / 2, 274);
    } else {
      ctx.fillText("The door is behind you. Enjoy the confetti.", CW / 2, 250);
      ctx.fillText("...unless you walk back.", CW / 2, 274);
    }
    ctx.restore();
  }

  function drawChestMsg() {
    ctx.fillStyle = "rgba(0,0,0,0.78)";
    ctx.fillRect(0, 0, CW, CH);
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffd76a";
    ctx.font = "bold 40px monospace";
    ctx.shadowColor = "#ffce6b";
    ctx.shadowBlur = 22;
    ctx.fillText("YOU GOT THE BLASTER!", CW / 2, 130);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#e8dcc8";
    ctx.font = "16px monospace";
    const bossHpText = 10 + (current.world - 1) * 5;
    ctx.fillText("The troll has " + bossHpText + " HP. Headshots deal double damage —", CW / 2, 168);
    ctx.fillText("jump on his head for 2 damage!", CW / 2, 190);
    ctx.fillStyle = "#c9a86b";
    ctx.font = "14px monospace";
    ctx.fillText("HOW TO SHOOT", CW / 2, 232);
    ctx.fillStyle = "#e8dcc8";
    ctx.fillText("COMPUTER: press  SPACE", CW / 2, 256);
    ctx.fillText("PHONE: use the  SHOOT  button (bottom-right)", CW / 2, 278);
    ctx.fillStyle = "#c9a86b";
    ctx.font = "12px monospace";
    ctx.fillText("Walk right until the camera locks — then it's a fight.", CW / 2, 314);

    const bb = btn(CW / 2 - 100, 352, 200, 48, "CONTINUE", "#5a4a1a", hover({ x: CW / 2 - 100, y: 352, w: 200, h: 48 }));
    if (clicked(bb)) {
      runLevel.chestMsg = false;
      shootCd = 18;
      Audio.sfx.click();
    }
  }

  function drawPause() {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, CW, CH);
    ctx.textAlign = "center";
    ctx.fillStyle = "#e8dcc8";
    ctx.font = "bold 40px monospace";
    ctx.fillText("PAUSED", CW / 2, 150);
    const buttons = [
      { label: "RESUME", y: 200, a: () => { state = "game"; Audio.sfx.click(); } },
      { label: "RESTART LEVEL", y: 260, a: () => { gotoLevel(current.world, current.level); Audio.sfx.click(); } },
      { label: "LEVEL SELECT", y: 320, a: () => {
        state = "select";
        uiCooldown = 6;
        Audio.sfx.click();
        Audio.music.play("lobby");
      } }
    ];
    for (const b of buttons) {
      const bb = btn(CW / 2 - 110, b.y, 220, 44, b.label, "#3a2a2a", hover({ x: CW / 2 - 110, y: b.y, w: 220, h: 44 }));
      if (clicked(bb)) b.a();
    }
  }

  function drawClear() {
    ctx.fillStyle = "rgba(6,2,1,0.75)";
    ctx.fillRect(0, 0, CW, CH);
    ctx.textAlign = "center";

    if (!runLevel.dropT) runLevel.dropT = 0;
    runLevel.dropT++;
    const nt = nextTarget();
    const fresh = nt && !pb.cleared[nt.world + "-" + nt.level];
    if (fresh && pendingLevelBurst) {
      spawnLockBurst(CW / 2, 235);
      pendingLevelBurst = null;
    }

    ctx.fillStyle = "#ffce6b";
    ctx.font = "bold 52px monospace";
    ctx.shadowColor = "#ffce6b";
    ctx.shadowBlur = 24;
    ctx.fillText("LEVEL CLEAR", CW / 2, 140);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#e8dcc8";
    ctx.font = "16px monospace";
    ctx.fillText("deaths this level: " + levelDeaths, CW / 2, 176);

    if (nt) {
      if (fresh) {
        ctx.font = "bold 18px monospace";
        ctx.fillStyle = "#ffd166";
        ctx.shadowColor = "#ffce6b";
        ctx.shadowBlur = 14;
        ctx.fillText(nt.newWorld ? "WORLD " + nt.world + " UNLOCKED!" : "LEVEL " + nt.level + " UNLOCKED!", CW / 2, 240);
        ctx.shadowBlur = 0;
      }
      ctx.fillStyle = "#c9a86b";
      ctx.font = "14px monospace";
      ctx.fillText("Next: " + (Levels.get(nt.world, nt.level) || {}).name, CW / 2, fresh ? 262 : 215);
    }

    // click anywhere (or space/enter) to continue — no retry, no level select
    const adv = () => {
      Audio.sfx.click();
      if (nt) gotoLevel(nt.world, nt.level);
      else { state = "menu"; Audio.music.play("lobby"); }
    };
    if (runLevel.dropT > 30 && mouse.click) adv();
    ctx.fillStyle = "#ffce6b";
    ctx.font = "bold 20px monospace";
    ctx.fillText("CLICK ANYWHERE TO START THE NEXT LEVEL", CW / 2, 360);
    ctx.fillStyle = "rgba(220,190,150,0.6)";
    ctx.font = "13px monospace";
    ctx.fillText("(press any key too)", CW / 2, 388);
  }

  function drawGameOver() {
    ctx.fillStyle = "#2a0505";
    ctx.fillRect(0, 0, CW, CH);
    ctx.textAlign = "center";
    ctx.fillStyle = "#c22f2f";
    ctx.font = "bold 52px monospace";
    ctx.shadowColor = "#ff0000";
    ctx.shadowBlur = 30;
    ctx.fillText("GAME OVER", CW / 2, 150);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#e8dcc8";
    ctx.font = "16px monospace";
    ctx.fillText("The devil counted your sins: " + levelDeaths + " deaths", CW / 2, 190);
    ctx.fillStyle = "#c9a86b";
    ctx.font = "13px monospace";
    ctx.fillText("You lost every heart — the dungeon collapses and re-locks itself.", CW / 2, 215);

    const buttons = [
      { label: "TRY AGAIN", y: 260, a: () => { resetRun(); gotoLevel(1, 1); } },
      { label: "LEVEL SELECT", y: 330, a: () => { resetRun(); state = "select"; Audio.music.play("lobby"); } }
    ];
    for (const b of buttons) {
      const bb = btn(CW / 2 - 110, b.y, 220, 44, b.label, "#3a0d0d", hover({ x: CW / 2 - 110, y: b.y, w: 220, h: 44 }));
      if (clicked(bb)) { Audio.sfx.click(); b.a(); }
    }
  }

  function drawWorldClear() {
    ctx.fillStyle = "rgba(8,3,1,0.7)";
    ctx.fillRect(0, 0, CW, CH);
    ctx.textAlign = "center";

    ctx.fillStyle = WORLD_COLORS[Math.min(10, current.world + 1)];
    ctx.font = "bold 44px monospace";
    ctx.shadowColor = "#ffce6b";
    ctx.shadowBlur = 20;
    ctx.fillText("WORLD " + current.world + " CLEAR!", CW / 2, 140);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#e8dcc8";
    ctx.font = "16px monospace";
    ctx.fillText(WORLD_NAMES[current.world] + " conquered. The devil smirks.", CW / 2, 178);

    if (current.world < 4) {
      ctx.font = "bold 20px monospace";
      ctx.fillStyle = "#ffd166";
      ctx.shadowColor = "#ffce6b";
      ctx.shadowBlur = 16;
      ctx.fillText("WORLD " + (current.world + 1) + " UNLOCKED!", CW / 2, 262);
      ctx.shadowBlur = 0;
      ctx.font = "12px monospace";
      ctx.fillStyle = "#c9a86b";
      ctx.fillText("The padlock blasted off " + WORLD_NAMES[current.world + 1] + ".", CW / 2, 282);
    }
    ctx.fillStyle = "#ffd166";
    ctx.font = "bold 20px monospace";
    ctx.fillText("CONGRATULATIONS! WORLD " + current.world + " COMPLETED!", CW / 2, 262);
    ctx.fillStyle = "#e8dcc8";
    ctx.font = "bold 16px monospace";
    ctx.fillText("CLICK ANYWHERE TO CONTINUE", CW / 2, 330);
    ctx.fillStyle = "rgba(220,190,150,0.6)";
    ctx.font = "13px monospace";
    ctx.fillText("(press ENTER or SPACE too)", CW / 2, 368);
  }

  /* ---------------------------------------------------------
     MAIN LOOP
     --------------------------------------------------------- */
  let last = 0;
  function loop(ts) {
    requestAnimationFrame(loop);
    dt = Math.min(0.05, Math.max(0.001, (ts - last) / 1000 || 1 / 60));
    last = ts;
    fit = Math.min(2.5, dt * 60);
    frame++;
    if (shake > 0) shake--;
    updateLockBurst();

    // handle keyboard shortcuts for menus
    if (state === "menu") {
      if (keys.ArrowUp || keys.Enter) { Audio.init(); Audio.sfx.click(); asd(); }
    } else if (state === "select") {
      if (keys.Escape) { state = "menu"; keys.Escape = false; }
    } else if (state === "game") {
      if (keys.Escape) { state = "paused"; keys.Escape = false; }
      updateParticles();
      cameraUpdate();
      updateGame();
    } else if (state === "paused") {
      if (keys.Escape) { state = "game"; keys.Escape = false; }
    } else if (state === "clear") {
      if (keys.Enter || keys.Space) {
        keys.Enter = false;
        keys.Space = false;
        advClear();
      }
    } else if (state === "worldclear") {
      if (mouse.click) {
        mouse.click = false;
        state = "menu";
        Audio.sfx.click();
        Audio.music.play("lobby");
      }
      if (keys.Enter || keys.Space) {
        keys.Enter = false;
        keys.Space = false;
        state = "menu";
        Audio.sfx.click();
        Audio.music.play("lobby");
      }
    } else if (state === "gameover") {
      if (keys.Enter || keys.Space) {
        keys.Enter = false;
        keys.Space = false;
        resetRun();
        gotoLevel(1, 1);
      }
    }

    // ---- render ----
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, CW, CH);
    if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    ctx.textAlign = "left";

    if (state === "menu") drawMenu();
    else if (state === "select") drawSelect();
    else if (state === "paused") { drawBackground(); drawWorld(); drawHud(); drawPause(); }
    else if (state === "gameover") { drawBackground(); drawWorld(); drawGameOver(); }
    else if (state === "clear") { drawBackground(); drawWorld(); drawHud(); drawClear(); }
    else if (state === "worldclear") { drawBackground(); drawWorld(); drawWorldClear(); }
    else { // game
      drawWorld();
      drawHud();
      drawVictoryOverlay();

      // guard: if nothing loaded (shouldn't happen)
      if (!runLevel) drawMenu();
    }

    // padlock bursts render on top (menu/select/clear/worldclear use screen-space coords)
    drawLockBurst();

    // consume click
    mouse.click = false;
  }

  function asd() {
    // start first unlocked level
    const f = Levels.firstUnlocked(pb);
    resetRun();
    gotoLevel(f.world, f.level);
  }

  /* ---------------------------------------------------------
     INPUT
     --------------------------------------------------------- */
  function press(key) {
    if (!keys[key]) {
      if (key === "ArrowRight" || key === "ArrowUp") Audio.init();
    }
    keys[key] = true;
  }
  function release(key) { keys[key] = false; }

  function setPointer(e) {
    const r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) * (CW / r.width);
    mouse.y = (e.clientY - r.top) * (CH / r.height);
  }

  canvas.addEventListener("pointermove", setPointer);
  canvas.addEventListener("pointerdown", (e) => {
    Audio.init();
    setPointer(e);
    mouse.down = true;
    canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointerup", (e) => {
    setPointer(e);
    mouse.down = false;
    mouse.click = true;
  });
  canvas.addEventListener("pointercancel", () => { mouse.down = false; });

  window.addEventListener("keydown", (e) => {
    Audio.init();
    if ([" ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) e.preventDefault();
    if (state === "clear") {
      advClear();
      return;
    }
    if (state === "worldclear") {
      keys.Enter = false;
      keys.Space = false;
      state = "menu";
      Audio.sfx.click();
      Audio.music.play("lobby");
      return;
    }
    press(e.key);
  });
  window.addEventListener("keyup", (e) => release(e.key));

  // make demo state work even before a level exists
  setTimeout(() => {
    if (Levels.countWorld(1) >= 1) {
      currentLevel = Levels.get(1, 1);
    }
  }, 0);

  loop(0);

  // ---- debug / modding handle (also used by AI test tools) ----
  window.LDDBG = {
    get state() { return state; },
    get frame() { return frame; },
    get fit() { return fit; },
    keys() { return Object.fromEntries(Object.entries(keys).filter(([, v]) => v)); },
    worldCounts() {
      const o = {};
      for (let w = 1; w <= 4; w++) o[w] = Levels.countWorld(w);
      return o;
    },
    totalLevels() { return Object.keys(Levels.all()).length; },
    player() {
      return runLevel ? {
        x: runLevel.player.x, y: runLevel.player.y,
        vx: runLevel.player.vx, vy: runLevel.player.vy,
        grounded: runLevel.player.grounded, anim: runLevel.player.anim, dead: runLevel.player.dead
      } : null;
    },
    current() { return { world: current.world, level: current.level, state }; },
    cleared() { return pb.cleared; },
    hearts() {
      return runLevel ? hearts.map(h => ({ lost: h ? !!h.lost : true })) : null;
    },
    jumpTo(w, l) { gotoLevel(w, l); },
    traps() {
      return runLevel ? runLevel.traps.map(t => ({
        type: t.type, x: Math.round(t.x), y: Math.round(t.y),
        state: t.state, kill: !!t.kill,
        krect: t.kill ? { x: Math.round(t.kill.x), y: Math.round(t.kill.y), w: Math.round(t.kill.w), h: Math.round(t.kill.h) } : null,
        dist: t.dist, pos: Math.round(t.pos || 0)
      })) : [];
    },
    boss() {
      if (!runLevel || !runLevel.boss) return null;
      const b = runLevel.boss;
      return {
        x: b.x, y: b.y, hp: b.hp, maxHp: b.maxHp, dmg: b.dmg,
        state: b.state, stateT: b.stateT, dead: b.dead, patrol: b.patrol,
        recoil: b.recoil, stompCd: b.stompCd,
        bullets: runLevel.bossBullets.length,
        camLock: runLevel.camLock, chestOpen: runLevel.chestOpen, chestMsg: runLevel.chestMsg
      };
    },
    setPos(x, y) { if (runLevel) { runLevel.player.x = x; runLevel.player.y = y; runLevel.player.vx = 0; runLevel.player.vy = 0; } },
    start() { asd(); },
    cam() { return { x: cam.x, y: cam.y }; }
  };

  return {
    press, release,
    atMenu: () => state === "menu",
    unlockAll() {
      for (let w = 1; w <= 4; w++) {
        for (const level of Levels.getWorld(w)) {
          const lv = level.level;
          pb.cleared[w + "-" + lv] = true;
        }
      }
      savePB();
      spawnLockBurst(CW / 2, 48);
    },
    isBossFight: () => !!(runLevel && runLevel.isBoss),
    inGame: () => state === "game" || state === "paused" || state === "clear",
    exitGame() {
      if (state === "game" || state === "paused" || state === "clear") {
        selectWorld = current.world;
        state = "select";
        Audio.sfx.click();
        Audio.music.play("lobby");
      }
    }
  };
})();
window.LD = LD;