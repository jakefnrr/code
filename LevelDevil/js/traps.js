/* =====================================================================
   LEVEL DEVIL — TRAP SYSTEM
   Every trap is defined via a {type, ...params} object in the level file.
   Each type registers { create, update, draw }. The engine calls
   Traps.createTrap(def) at load, then each frame:
       update(trap, game)
       draw(trap, ctx, game)
   and checks Traps.killRect(trap) for lethal overlap, and t.solid for
   physical solids (moving platforms etc.).
   ===================================================================== */
const Traps = (() => {
  const REG = {};

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);

  /* -------------------------------------------------------------
     SHARED DRAW HELPERS
     ------------------------------------------------------------- */
  function drawSpikeRow(ctx, x, baseY, count, h = 24, dir = -1, color = "#ffffff") {
    ctx.fillStyle = color;
    const w = 20;
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const sx = x + i * w;
      ctx.moveTo(sx, baseY);
      ctx.lineTo(sx + w / 2, baseY + dir * h);
      ctx.lineTo(sx + w, baseY);
    }
    ctx.fill();
  }

  /* ================== type: spikes ================== */
  REG.spikes = {
    create(t) {
      t.count = t.count || 1;
      t.h = t.h || 24;
      t.gap = 2;
      t.rect = { x: t.x, y: t.y - t.h, w: t.count * 20, h: t.h };
      t.kill = { x: t.x + 3, y: t.y - t.h + 3, w: t.count * 20 - 6, h: t.h - 3 };
    },
    draw(t, ctx) {
      drawSpikeRow(ctx, t.x, t.y, t.count, t.h);
      ctx.fillStyle = "#3a0d0d";
      ctx.fillRect(t.x - 2, t.y, t.count * 20 + 4, 8);
    }
  };

  /* ================== type: popupSpikes ================== */
  REG.popupSpikes = {
    create(t) {
      t.count = t.count || 1;
      t.off = t.off || 70;      // frames hidden
      t.on = t.on || 40;        // frames shown
      t.phase = t.phase || 0;
      t.t = t.phase || 0;
      t.ext = 0;                // 0..1 extension
      t.wasPopped = false;
      t.rect = { x: t.x, y: t.y - 26, w: t.count * 20, h: 26 };
    },
    update(t, game) {
      t.t++;
      const period = t.off + t.on;
      const tt = t.t % period;
      const popping = tt < t.on;
      t.target = popping ? 1 : 0;
      t.ext += (t.target - t.ext) * 0.25;
      if (t.ext > 0.98) t.ext = 1;
      if (t.ext < 0.02) t.ext = 0;
      if (popping && !t.wasPopped) {
        t.wasPopped = true;
        game.shake += 2;
        Audio.sfx.trapSpike();
      }
      if (!popping) t.wasPopped = false;
      const h = 26 * t.ext;
      t.rect.y = t.y - h;
      t.rect.h = h;
      t.kill = t.ext > 0.5 ? { x: t.x + 5, y: t.y - h + 3, w: t.count * 20 - 10, h: h - 3 } : null;
    },
    draw(t, ctx) {
      // base plate
      ctx.fillStyle = "#3a0d0d";
      ctx.fillRect(t.x - 4, t.y, t.count * 20 + 8, 10);
      ctx.fillStyle = "#1d0505";
      ctx.fillRect(t.x - 4, t.y + 10, t.count * 20 + 8, 4);
      if (t.ext > 0.02) {
        drawSpikeRow(ctx, t.x, t.y, t.count, 26 * t.ext, -1,
          t.ext > 0.9 ? "#ffffff" : "#bfbfbf");
      }
    }
  };

  /* ================== type: risingFallingSpikes ================== */
  REG.risingFallingSpikes = {
    create(t) {
      t.count = t.count || 1;
      t.h = t.h || 26;
      t.triggerDist = t.triggerDist || 70;
      t.rise = t.rise || 65;
      t.pause = t.pause || 36; // 0.6 seconds at 60fps
      t.speed = t.speed || 5;
      t.state = "ready"; // ready | rising | pause | falling | gone
      t.baseY = t.y;
      t.currentY = t.y;
      t.timer = 0;
      t.rect = { x: t.x, y: t.y - t.h, w: t.count * 20, h: t.h };
      t.kill = null;
    },
    update(t, game) {
      if (t.state === "gone") return;
      const p = game.player;
      if (t.state === "ready" && p.x + p.w + t.triggerDist > t.x &&
          p.x < t.x + t.count * 20 + t.triggerDist) {
        t.state = "rising";
        game.shake += 2;
        Audio.sfx.trapSpike();
      }
      if (t.state === "rising") {
        t.currentY = Math.max(t.baseY - t.rise, t.currentY - t.speed);
        if (t.currentY <= t.baseY - t.rise) {
          t.currentY = t.baseY - t.rise;
          t.state = "pause";
          t.timer = t.pause;
        }
      } else if (t.state === "pause") {
        t.timer--;
        if (t.timer <= 0) t.state = "falling";
      } else if (t.state === "falling") {
        t.currentY += t.speed;
        if (t.currentY > game.height + t.h) {
          t.state = "gone";
          t.kill = null;
          return;
        }
      }
      t.rect.x = t.x;
      t.rect.y = t.currentY - t.h;
      t.rect.w = t.count * 20;
      t.rect.h = t.h;
      t.kill = t.state === "pause" || t.state === "falling"
        ? { x: t.x + 4, y: t.currentY - t.h + 3, w: t.count * 20 - 8, h: t.h - 3 }
        : null;
    },
    draw(t, ctx) {
      if (t.state === "gone") return;
      const down = t.state === "falling";
      drawSpikeRow(ctx, t.x, t.currentY, t.count, t.h, down ? 1 : -1,
        t.state === "ready" ? "#bfbfbf" : "#ffffff");
      ctx.fillStyle = "#3a0d0d";
      ctx.fillRect(t.x - 2, down ? t.currentY + t.h : t.currentY, t.count * 20 + 4, 8);
    }
  };

  /* ================== type: movingSpikes ================== */
  REG.movingSpikes = {
    create(t) {
      t.count = t.count || 2;
      t.range = t.range || 140;
      t.speed = t.speed || 1.4;
      t.scale = 0;
      t.h = 24;
      t.rect = { x: t.x, y: t.y - t.h, w: t.count * 20, h: t.h };
    },
    update(t, game) {
      t.scale += t.speed * 0.03;
      const dx = Math.sin(t.scale) * t.range;
      t.x = t.ox + dx;
      t.rect.x = t.x;
      t.rect.y = t.y - t.h;
      t.kill = { x: t.x + 3, y: t.y - t.h + 3, w: t.count * 20 - 6, h: t.h - 3 };
      Audio.sfx.trapSaw; // (kept silent; hard to hear mid-step)
    },
    draw(t, ctx) {
      ctx.fillStyle = "#3a0d0d";
      ctx.fillRect(t.x - 2, t.y, t.count * 20 + 4, 8);
      drawSpikeRow(ctx, t.x, t.y, t.count, t.h);
      // route rail
      ctx.strokeStyle = "rgba(150,140,120,0.25)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(t.ox - t.range, t.y - t.h - 8);
      ctx.lineTo(t.ox + t.range, t.y - t.h - 8);
      ctx.stroke();
    }
  };

  /* ================== type: growingGap ================== */
  REG.growingGap = {
    create(t) {
      t.max = t.max || 130;
      t.trigger = t.trigger || t.max + 20;
      t.speed = t.speed || 1.2;
      t.w = 0;
      t.started = false;
      t.done = false;
      t.anim = 0;
    },
    update(t, game) {
      const px = game.player.x + game.player.w / 2;
      if (!t.started && px > t.x - t.trigger) {
        t.started = true;
        game.shake += 4;
        Audio.sfx.trapCrack();
      }
      if (t.started && !t.done) {
        t.w = Math.min(t.max, t.w + t.speed);
        if (t.w >= t.max) {
          t.done = true;
          game.shake += 5;
          Audio.sfx.trapSlam();
        }
      }
      t.anim++;
    },
    draw(t, ctx) {
      if (t.w <= 0) return; // no indicator before the trap starts
      const gx = t.x - t.w / 2;   // left edge slides left
      const gw = t.w;
      const gy = 380;
      // dark abyss
      const g = ctx.createLinearGradient(0, gy, 0, gy + 90);
      g.addColorStop(0, "#250a04");
      g.addColorStop(1, "#080100");
      ctx.fillStyle = g;
      ctx.fillRect(gx, gy, gw, 100);
      // jagged edges (both sides)
      ctx.fillStyle = "#4a1710";
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx + 6, gy);
      ctx.lineTo(gx + 10, gy - 8);
      ctx.lineTo(gx + 16, gy);
      ctx.lineTo(gx + gw - 16, gy);
      ctx.lineTo(gx + gw - 10, gy - 8);
      ctx.lineTo(gx + gw - 6, gy);
      ctx.lineTo(gx + gw, gy);
      ctx.fill();
      // heat shimmer
      ctx.fillStyle = "rgba(255,120,40,0.18)";
      ctx.fillRect(gx + 2, gy + 6, gw - 4, 14 + Math.sin(performance.now() * 0.01) * 4);
    }
  };

  /* ================== type: saw ================== */
  REG.saw = {
    create(t) {
      t.size = t.size || 36;
      t.range = t.range || 120;
      t.speed = t.speed || 1.5;
      t.axis = t.axis || "x";
      t.angle = 0;
      t.t = 0;
      t.cx = t.x;
      t.cy = t.y;
      t.rect = { x: t.x - t.size / 2, y: t.y - t.size / 2, w: t.size, h: t.size };
      t.spinSound = 0;
    },
    update(t, game) {
      t.t += t.speed * 0.03;
      t.angle += 0.18;
      const cx = t.rect.x + t.rect.w / 2;
      const cy = t.rect.y + t.rect.h / 2;
      if (t.axis === "x") { t.cx = t.x + Math.sin(t.t) * t.range; t.cy = t.y; }
      else if (t.axis === "y") { t.cy = t.y + Math.sin(t.t) * t.range; t.cx = t.x; }
      else if (t.axis === "circle") {
        t.cx = t.x + Math.cos(t.t) * t.range;
        t.cy = t.y + Math.sin(t.t) * t.range;
      } else { // pendulum from a pivot above
        const ang = Math.sin(t.t) * (t.range / 100);
        t.cx = t.x + Math.sin(ang) * (t.y * 0 + 120);
        t.cy = (t.y - 120) + Math.cos(ang) * 120;
      }
      t.rect.x = t.cx - t.size / 2;
      t.rect.y = t.cy - t.size / 2;
      t.kill = { x: t.rect.x + t.size * 0.12, y: t.rect.y + t.size * 0.12,
                 w: t.size * 0.76, h: t.size * 0.76 };
      t.spinSound++;
      if (t.spinSound > 40) { t.spinSound = 0; Audio.sfx.trapSaw(); }
    },
    draw(t, ctx) {
      // chain / rail
      ctx.strokeStyle = "rgba(120,110,100,0.5)";
      ctx.lineWidth = 3;
      if (t.axis === "x") {
        ctx.beginPath(); ctx.moveTo(t.x - t.range, t.cy); ctx.lineTo(t.x + t.range, t.cy); ctx.stroke();
      } else if (t.axis === "y") {
        ctx.beginPath(); ctx.moveTo(t.cx, t.y - t.range); ctx.lineTo(t.cx, t.y + t.range); ctx.stroke();
      }
      if (t.axis === "pendulum") {
        ctx.beginPath(); ctx.moveTo(t.x, t.y - 120); ctx.lineTo(t.cx, t.cy); ctx.stroke();
      }
      ctx.save();
      ctx.translate(t.cx, t.cy);
      ctx.rotate(t.angle);
      ctx.fillStyle = "#d8d4c8";
      ctx.strokeStyle = "#6a645a";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        ctx.rotate(Math.PI / 4);
        ctx.save();
        ctx.translate(0, t.size * 0.4);
        ctx.beginPath();
        ctx.arc(0, 0, t.size * 0.3, 0.35 * Math.PI, 0.65 * Math.PI);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      ctx.beginPath();
      ctx.arc(0, 0, t.size * 0.18, 0, Math.PI * 2);
      ctx.fillStyle = "#c8c2b4";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, t.size * 0.07, 0, Math.PI * 2);
      ctx.fillStyle = "#5a544a";
      ctx.fill();
      ctx.restore();
    }
  };

  /* ================== type: crusher ================== */
  REG.crusher = {
    create(t) {
      t.dist = t.dist || 300;
      t.speed = t.speed || 1.5;
      t.fall = t.fall || 9;     // descent speed: a real slam, not a slow creep
      t.rest = t.rest || 25;
      t.w = t.w || 60;
      t.h = t.h || 50;
      t.pos = 0;
      t.dir = 1;
      t.wait = 0;
      t.t = Array.isArray(t.wait) ? t.wait[0] : 0;
      t.rect = { x: t.x, y: t.y, w: t.w, h: t.h };
      t.kill = null;
      t.slamming = false;
      t._reached = false;
    },
    update(t, game) {
      // guarantee the block falls far enough to reach the ground under it,
      // so it ALWAYS threatens a standing player (never a walk-past)
      if (!t._reached) {
        const below = [].concat(game.solids || [], game.carvable || [])
          .filter(s => s.solidNow !== false && s.y > t.y && s.y <= 470 &&
                       t.x + t.w / 2 >= s.x - 4 && t.x + t.w / 2 <= s.x + s.w + 4);
        if (below.length) {
          const top = Math.min.apply(null, below.map(s => s.y));
          const need = (top - (t.y + t.h)) + 6;
          if (need > t.dist) t.dist = Math.round(need);
        }
        t._reached = true;
      }
      t.wait--;
      if (t.wait <= 0) {
        t.pos += t.dir * (t.dir === 1 ? t.fall : t.speed);
        if (t.pos >= t.dist) { t.pos = t.dist; t.dir = -1; t.slamming = true; game.shake += 6; Audio.sfx.trapSlam(); t.wait = t.rest; }
        if (t.pos <= 0 && t.dir === -1) { t.pos = 0; t.dir = 1; t.slamming = false; Audio.sfx.trapSlam(); t.wait = t.t; }
      }
      t.rect.y = t.y + t.pos;
      const eh = t.h;
      t.kill = t.pos > 8 ? { x: t.x, y: t.y + t.pos + (t.slamming ? 4 : 0), w: t.w, h: eh - (t.slamming ? 0 : 2) } : null;
    },
    draw(t, ctx) {
      const y = t.y + t.pos;
      // overhead mount
      ctx.fillStyle = "#2a1a12";
      ctx.fillRect(t.x - 8, t.y - 10, t.w + 16, 12);
      ctx.fillStyle = "#5a4a3a";
      ctx.fillRect(t.x, t.y - 4, t.w, 6);
      // spiked block
      const g = ctx.createLinearGradient(0, y, 0, y + t.h);
      g.addColorStop(0, "#8a2f20");
      g.addColorStop(1, "#3d0f0a");
      ctx.fillStyle = g;
      ctx.fillRect(t.x, y, t.w, t.h);
      // spikes on bottom face
      drawSpikeRow(ctx, t.x, y + t.h, Math.ceil(t.w / 20), 16, 1, "#ffffff");
      // chains
      ctx.strokeStyle = "#6a645a";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(t.x + 6, t.y - 4); ctx.lineTo(t.x + 6, y); ctx.moveTo(t.x + t.w - 6, t.y - 4); ctx.lineTo(t.x + t.w - 6, y); ctx.stroke();
    }
  };

  /* ================== type: fallingBlock ================== */
  REG.fallingBlock = {
    create(t) {
      t.w = t.w || 60; t.h = t.h || 60;
      t.triggerDist = t.triggerDist || 70;
      t.respawn = t.respawn || 90;
      t.ox = t.x; t.oy = t.y;
      t.state = "idle";   // idle, shake, fall, safe
      t.vy = 0;
      t.timer = 0;
      t.rect = { x: t.x, y: t.y, w: t.w, h: t.h };
      t.kill = null;
      t.solid = true; t.oneway = true;
      t.floorY = 380;
    },
    update(t, game) {
      const cx = t.rect.x + t.rect.w / 2;
      const cy = t.rect.y + t.rect.h / 2;
      const pxc = game.player.x + game.player.w / 2;
      const pyc = game.player.y + game.player.h / 2;
      const close = Math.hypot(pxc - cx, pyc - cy) < t.triggerDist + 60;

      if (t.state === "idle") {
        if (close || (pxc > t.rect.x - 10 && pxc < t.rect.x + t.rect.w + 10 &&
                      pyc > t.rect.y)) {
          t.state = "shake";
          t.timer = 16;
          Audio.sfx.trapShake();
        }
      } else if (t.state === "shake") {
        t.timer--;
        if (t.timer <= 0) { t.state = "fall"; t.vy = 0; }
      } else if (t.state === "fall") {
        t.vy += 1.0;
        t.rect.y += t.vy;
        t.solid = false;
        t.kill = { x: t.rect.x, y: t.rect.y, w: t.rect.w, h: t.rect.h };
        if (t.rect.y + t.rect.h >= t.floorY) {
          t.rect.y = t.floorY - t.rect.h;
          t.state = "safe";
          t.timer = t.respawn;
          t.kill = null;
          t.solid = true;
          game.shake += 4;
          Audio.sfx.trapSlam();
        }
      } else if (t.state === "safe") {
        // stay solid; respawn after a while if left alone
        t.timer--;
        if (t.timer <= 0 && pxc < t.rect.x - 120) {
          t.state = "idle";
          t.rect.x = t.ox; t.rect.y = t.oy;
          t.vy = 0; t.solid = true; t.kill = null;
        }
      }
    },
    draw(t, ctx) {
      let x = t.rect.x;
      if (t.state === "shake") x += Math.sin(performance.now() * 0.4) * 2;
      ctx.fillStyle = "#4a5a6a";
      ctx.fillRect(x, t.rect.y, t.rect.w, t.rect.h);
      ctx.fillStyle = "#2c3542";
      ctx.fillRect(x + 4, t.rect.y + 4, t.rect.w - 8, 6);
      ctx.strokeStyle = "#28303a";
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 2, t.rect.y + 2, t.rect.w - 4, t.rect.h - 4);
      if (t.state === "shake" && Math.floor(performance.now() / 300) % 2 === 0) {
        ctx.fillStyle = "rgba(255,255,200,0.5)";
        ctx.font = "bold 20px monospace";
        ctx.textAlign = "center";
        ctx.fillText("!", x + t.rect.w / 2, t.rect.y + 14);
      }
    }
  };

  /* ================== type: crumbleFloor ================== */
  REG.crumbleFloor = {
    create(t) {
      t.w = t.w || 80; t.h = t.h || 18;
      t.respawn = t.respawn || 120;
      t.ox = t.x; t.oy = t.y;
      t.state = "solid"; // solid, shake, gone
      t.timer = 0;
      t.rect = { x: t.x, y: t.y, w: t.w, h: t.h };
      t.solid = true; t.oneway = true;
    },
    update(t, game) {
      const p = game.player;
      if (t.state === "solid") {
        if (rectHit(p, t)) { t.state = "shake"; t.timer = 30; Audio.sfx.trapCrack(); }
      } else if (t.state === "shake") {
        t.timer--;
        if (t.timer <= 0) { t.state = "gone"; t.solid = false; Audio.sfx.crumble(); t.timer = t.respawn; }
      } else { // gone
        t.timer--;
        if (t.timer <= 0) { t.state = "solid"; t.solid = true; }
      }
      t.rect.x = t.ox; t.rect.y = t.oy;
    },
    draw(t, ctx) {
      if (t.state === "gone") return;
      let x = t.rect.x;
      if (t.state === "shake") x += Math.sin(performance.now() * 0.3) * (1 + (30 - t.timer) / 8);
      const alpha = t.state === "shake" ? 0.7 : 1;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#5a4632";
      ctx.fillRect(x, t.rect.y, t.rect.w, t.rect.h);
      ctx.strokeStyle = "#3a2c1c";
      ctx.lineWidth = 1;
      for (let i = 0; i < t.rect.w / 20; i++) ctx.strokeRect(x + i * 20, t.rect.y, 20, t.rect.h);
      ctx.globalAlpha = 1;
    }
  };

  /* ================== type: trapFloor ================== */
  REG.trapFloor = {
    create(t) {
      t.w = t.w || 80; t.h = t.h || 18;
      t.delay = t.delay || 15; t.respawn = t.respawn || 110;
      t.ox = t.x; t.oy = t.y;
      t.state = "closed"; t.timer = 0; t.solid = true; t.oneway = true;
      t.rect = { x: t.x, y: t.y, w: t.w, h: t.h };
    },
    update(t, game) {
      const p = game.player;
      if (t.state === "closed") {
        if (rectHit(p, t)) { t.state = "armed"; t.timer = t.delay; }
      } else if (t.state === "armed") {
        t.timer--;
        if (t.timer <= 0) { t.state = "open"; t.solid = false; Audio.sfx.crumble(); t.timer = t.respawn; }
      } else {
        t.timer--;
        if (t.timer <= 0) { t.state = "closed"; t.solid = true; }
      }
    },
    draw(t, ctx) {
      ctx.fillStyle = t.state === "open" ? "#1a0d06" : "#4a3f30";
      ctx.fillRect(t.rect.x, t.rect.y, t.rect.w, t.rect.h);
      ctx.strokeStyle = "#31281c";
      ctx.strokeRect(t.rect.x, t.rect.y, t.rect.w, t.rect.h);
      if (t.state === "open") {
        // dark hole
        ctx.fillStyle = "#000";
        ctx.fillRect(t.rect.x + 4, t.rect.y, t.rect.w - 8, t.rect.h);
      } else if (t.state === "armed") {
        ctx.fillStyle = "rgba(255,60,40,0.4)";
        ctx.fillRect(t.rect.x, t.rect.y, t.rect.w, 4);
      }
    }
  };

  /* ================== type: movingPlatform ================== */
  REG.movingPlatform = {
    create(t) {
      t.w = t.w || 90; t.h = t.h || 18;
      t.axis = t.axis || "x";
      t.range = t.range || 130;
      t.speed = t.speed || 1.2;
      t.ox = t.x; t.oy = t.y;
      t.t = 0;
      t.pathIndex = 0;
      t.pathActive = !t.triggerOnLand;
      t.triggerDelay = t.triggerDelay || 0;
      t.triggerTimer = 0;
      t.pathX = t.x;
      t.pathY = t.y;
      t.rect = { x: t.x, y: t.y, w: t.w, h: t.h };
      t.solid = true; t.oneway = true;
      t.dx = 0; t.dy = 0;
    },
    update(t, game) {
      if (t.path) {
        const p = game.player;
        const standing = p.x + p.w > t.rect.x && p.x < t.rect.x + t.w &&
          Math.abs((p.y + p.h) - t.rect.y) < 10;
        if (standing && !t.pathActive && t.triggerTimer <= 0) {
          t.triggerTimer = t.triggerDelay;
        }
        if (t.triggerTimer > 0) {
          t.triggerTimer--;
          if (t.triggerTimer <= 0) t.pathActive = true;
        }
        if (t.pathActive && t.pathIndex < t.path.length) {
          const step = t.path[t.pathIndex];
          const dx = step.dx || 0;
          const dy = step.dy || 0;
          const speed = step.speed || t.speed;
          const remainingX = t.ox + (t.path.slice(0, t.pathIndex + 1).reduce((n, s) => n + (s.dx || 0), 0)) - t.pathX;
          const remainingY = t.oy + (t.path.slice(0, t.pathIndex + 1).reduce((n, s) => n + (s.dy || 0), 0)) - t.pathY;
          const moveX = Math.sign(remainingX) * Math.min(Math.abs(remainingX), speed);
          const moveY = Math.sign(remainingY) * Math.min(Math.abs(remainingY), speed);
          t.pathX += moveX;
          t.pathY += moveY;
          t.dx = moveX;
          t.dy = moveY;
          t.rect.x = t.pathX;
          t.rect.y = t.pathY;
          if (Math.abs(remainingX) <= speed && Math.abs(remainingY) <= speed) t.pathIndex++;
          return;
        }
        t.dx = 0;
        t.dy = 0;
        return;
      }
      t.t += t.speed * 0.03;
      const nx = t.axis === "x" ? t.ox + Math.sin(t.t) * t.range : t.ox;
      const ny = t.axis === "y" ? t.oy + Math.sin(t.t) * t.range : t.oy;
      t.dx = nx - t.rect.x;
      t.dy = ny - t.rect.y;
      t.rect.x = nx;
      t.rect.y = ny;
    },
    draw(t, ctx) {
      // Rails are optional; hidden by default so trap routes stay secret.
      if (t.showPath) {
        ctx.strokeStyle = "rgba(150,140,120,0.3)";
        ctx.lineWidth = 2;
        if (t.axis === "x") { ctx.beginPath(); ctx.moveTo(t.ox - t.range, t.rect.y + t.h / 2); ctx.lineTo(t.ox + t.range, t.rect.y + t.h / 2); ctx.stroke(); }
        else { ctx.beginPath(); ctx.moveTo(t.rect.x + t.w / 2, t.oy - t.range); ctx.lineTo(t.rect.x + t.w / 2, t.oy + t.range); ctx.stroke(); }
      }
      // platform body (iron rails)
      ctx.fillStyle = "#d9d9d9";
      ctx.fillRect(t.rect.x, t.rect.y, t.rect.w, t.rect.h);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(t.rect.x, t.rect.y, t.rect.w, 5);
      ctx.fillStyle = "#b06bff";
      for (let i = 0; i < t.rect.w / 24; i++) ctx.fillRect(t.rect.x + 6 + i * 24, t.rect.y + 7, 12, 4);
    }
  };

  /* ================== type: fakeDoor ================== */
  REG.fakeDoor = {
    create(t) {
      t.w = t.w || 42; t.h = t.h || 58;
      t.kill = { x: t.x + 2, y: t.y + 2, w: t.w - 4, h: t.h - 4 };
      t.rect = { x: t.x, y: t.y, w: t.w, h: t.h };
      t.glow = 0;
    },
    update(t, game) {
      t.glow++;
      // evil growl cue when player approaches
      const p = game.player;
      const near = Math.hypot((p.x + p.w / 2) - (t.x + t.w / 2), (p.y + p.h / 2) - (t.y + t.h / 2));
      if (near < 60 && (t.glow % 120) === 1) Audio.sfx.trapEvil();
    },
    draw(t, ctx) {
      // red glow behind
      const g = ctx.createRadialGradient(t.x + t.w / 2, t.y + t.h / 2, 2, t.x + t.w / 2, t.y + t.h / 2, 60);
      g.addColorStop(0, "rgba(255,60,60,0.5)");
      g.addColorStop(1, "rgba(255,60,60,0)");
      ctx.fillStyle = g;
      ctx.fillRect(t.x - 30, t.y - 20, t.w + 60, t.h + 40);
      // stone frame (red)
      ctx.fillStyle = "#8a2020";
      ctx.fillRect(t.x, t.y, t.w, t.h);
      ctx.fillStyle = "#4a0e0e";
      ctx.fillRect(t.x + 3, t.y + 3, t.w - 6, t.h - 6);
      // inner glow (red)
      ctx.fillStyle = "rgba(255,80,80,0.8)";
      ctx.fillRect(t.x + 6, t.y + 6, t.w - 12, t.h - 12);
      // devil sigil
      ctx.fillStyle = "#c22f2f";
      ctx.beginPath();
      ctx.arc(t.x + t.w / 2, t.y + t.h / 2 - 4, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffce6b";
      ctx.beginPath();
      ctx.moveTo(t.x + t.w / 2, t.y + t.h / 2 - 8);
      ctx.lineTo(t.x + t.w / 2 - 8, t.y + t.h / 2 + 7);
      ctx.lineTo(t.x + t.w / 2 + 8, t.y + t.h / 2 + 7);
      ctx.closePath();
      ctx.fill();
    }
  };

  /* ================== type: lava ================== */
  REG.lava = {
    create(t) {
      t.w = t.w || 200; t.h = t.h || 80;
      t.ox = t.x; t.oy = t.y;
      t.kill = { x: t.x, y: t.y, w: t.w, h: t.h };
      t.rect = { x: t.x, y: t.y, w: t.w, h: t.h };
      t.level = 0;
      t.cycleT = 0;
      t.bubbles = Array.from({ length: 12 }, () => ({ x: rand(0, t.w), y: rand(0, t.h), s: rand(4, 10), v: rand(0.3, 1) }));
      t.snd = 0;
    },
    update(t, game) {
      if (t.cycle) {
        const c = t.cycle;
        const hidden = c.hidden || 0;
        const rise = c.rise || 1;
        const high = c.high || 0;
        const fall = c.fall || 1;
        const total = hidden + rise + high + fall;
        const phase = t.cycleT % total;
        if (phase < hidden) {
          t.level = c.depth || t.h;
        } else if (phase < hidden + rise) {
          t.level = (c.depth || t.h) -
            ((phase - hidden) / rise) * ((c.depth || t.h) + (c.height || 72));
        } else if (phase < hidden + rise + high) {
          t.level = -(c.height || 72);
        } else {
          t.level = -(c.height || 72) +
            ((phase - hidden - rise - high) / fall) * ((c.depth || t.h) + (c.height || 72));
        }
        t.cycleT++;
      } else if (t.rise) {
        t.level = Math.sin(performance.now() * 0.001) * 12;
      }
      t.rect.y = t.oy + t.level;
      t.kill = { x: t.x, y: t.oy + t.level, w: t.w, h: Math.max(0, t.h - t.level) };
      t.bubbles.forEach(b => { b.y -= b.v; if (b.y < -10) { b.y = t.h; b.x = rand(0, t.w); } });
      t.snd++;
      if (t.snd > 60) { t.snd = 0; Audio.sfx.trapLava(); }
    },
    draw(t, ctx) {
      const y = t.oy + t.level;
      const g = ctx.createLinearGradient(0, y, 0, y + t.h);
      g.addColorStop(0, "#ff6a00");
      g.addColorStop(0.3, "#e04600");
      g.addColorStop(1, "#5a1200");
      ctx.fillStyle = g;
      ctx.fillRect(t.x, y, t.w, t.h);
      // glowing bumps
      ctx.fillStyle = "#ffd166";
      for (let i = 0; i < t.w; i += 14) {
        const h = 4 + Math.sin(performance.now() * 0.008 + i) * 3;
        ctx.beginPath();
        ctx.ellipse(t.x + i, y + 2 + h * 0.5, 7, h * 0.8, 0, Math.PI, 0);
        ctx.fill();
      }
      // bubbles
      ctx.fillStyle = "rgba(255,140,40,0.7)";
      t.bubbles.forEach(b => {
        ctx.beginPath();
        ctx.arc(t.x + b.x, y + b.y, b.s * 0.4, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  };

  /* ================== type: fireballSpitter ================== */
  REG.fireballSpitter = {
    create(t) {
      t.dir = t.dir || -1;
      t.interval = t.interval || 90;
      t.speed = t.speed || 2.4;
      t.w = t.w || 40; t.h = t.h || 40;
      t.timer = t.firstDelay || 40;
      t.recoil = 0;
      t.rect = { x: t.x, y: t.y, w: t.w, h: t.h };
    },
    update(t, game) {
      t.timer--;
      t.recoil = Math.max(0, t.recoil - 0.2);
      if (t.timer <= 0) {
        t.timer = t.interval;
        t.recoil = 1;
        Audio.sfx.trapFireball();
        const mx = t.dir > 0 ? t.x + t.w : t.x;
        game.projectiles.push({
          x: mx, y: t.y + t.h / 2,
          vx: t.dir * t.speed, vy: 0,
          r: 12, life: 240, kind: "fireball",
          origin: t
        });
      }
    },
    draw(t, ctx) {
      const dir = t.dir > 0 ? 1 : -1;
      const rec = t.recoil * 4;
      ctx.save();
      ctx.translate(t.x + t.w / 2, t.y + t.h / 2);
      ctx.scale(dir, 1);
      ctx.translate(-t.w / 2, -t.h / 2);
      ctx.translate(-rec, 0); // recoil: barrel slides back after firing
      const w = t.w, h = t.h, my = h / 2;
      // carriage / base
      ctx.fillStyle = "#4a3f36";
      ctx.beginPath();
      ctx.moveTo(2, h - 2);
      ctx.lineTo(9, my + 5);
      ctx.lineTo(w - 9, my + 5);
      ctx.lineTo(w - 2, h - 2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#2a211a";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // wheels
      ctx.fillStyle = "#5c534a";
      ctx.beginPath(); ctx.arc(10, h - 4, 5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(w - 10, h - 4, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#2c2722";
      ctx.beginPath(); ctx.arc(10, h - 4, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(w - 10, h - 4, 2, 0, Math.PI * 2); ctx.fill();
      // barrel (wider at breech, tapers toward the muzzle)
      ctx.fillStyle = "#3a3630";
      ctx.beginPath();
      ctx.moveTo(5, my - 9);
      ctx.lineTo(w - 2, my - 5);
      ctx.lineTo(w - 2, my + 5);
      ctx.lineTo(5, my + 9);
      ctx.lineTo(1, my + 9);
      ctx.lineTo(1, my - 9);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#1e1b18";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // muzzle band
      ctx.fillStyle = "#4c463f";
      ctx.fillRect(w - 7, my - 6, 5, 12);
      // barrel bore
      ctx.fillStyle = "#141210";
      ctx.fillRect(w - 7, my - 3, 5, 6);
      // glowing muzzle flash (pulses with recoil)
      ctx.fillStyle = `rgba(255,150,40,${0.55 + t.recoil * 0.45})`;
      ctx.beginPath();
      ctx.arc(w - 3, my, 4 + t.recoil * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,230,150,0.9)";
      ctx.beginPath();
      ctx.arc(w - 3, my, 2 + t.recoil * 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };

  /* ================== type: ceilingSpikes ================== */
  // They hang from the top of the room, but as you approach they DETACH
  // and fall down (deadly while falling); when they hit the floor they
  // shatter into harmless debris so the path stays passable.
  REG.ceilingSpikes = {
    create(t) {
      t.count = t.count || 4;
      t.y = t.y || 40;
      t.h = t.h || 26;
      t.fallThrough = !!t.fallThrough;  // fall through the floor and off-screen
      t.static = !!t.static;             // remain mounted and never trigger
      t.staticKill = !!t.staticKill;     // attached spikes can still be deadly
      t.sweepT = 0;
      t.state = "rest";                 // rest | fall | down | gone
      t.triggerDist = t.triggerDist || 90;
      t.vy = 0;
      t.rect = { x: t.x, y: t.y, w: t.count * 20, h: t.h };
      t.kill = null;                    // not deadly while hanging safe
    },
    update(t, game) {
      const f = game.runLevel ? game.runLevel : game;
      const floorY = f && f.floorY ? f.floorY : 380;
      if (t.static) {
        t.rect.x = t.x;
        t.rect.y = t.y;
        t.kill = t.staticKill ? { x: t.x + 5, y: t.y, w: t.count * 20 - 10, h: t.h } : null;
        return;
      }
      if (t.sweep) {
        const p = game.player;
        if (t.state === "rest" && p.x + p.w + t.triggerDist > t.x &&
            p.x < t.x + t.count * 20 + t.triggerDist) {
          t.state = "fall";
          t.sweepT = 0;
          game.shake += 2;
          Audio.sfx.trapCrack();
        }
        if (t.state === "fall") {
          const down = t.sweep.down || 230;
          const rise = t.sweep.rise || 180;
          const pause = t.sweep.pause || 30;
          const total = down + rise + pause;
          const phase = t.sweepT % total;
          if (phase < down) {
            t.y = t.sweep.startY + (phase / down) * (t.sweep.lowY - t.sweep.startY);
          } else if (phase < down + pause) {
            t.y = t.sweep.lowY;
          } else {
            t.y = t.sweep.lowY -
              ((phase - down - pause) / rise) * (t.sweep.lowY - t.sweep.startY);
          }
          t.sweepT++;
          t.rect.y = t.y;
          t.kill = { x: t.x + 5, y: t.y + 4, w: t.count * 20 - 10, h: t.h - 7 };
          return;
        }
      }
      if (t.state === "rest") {
        const p = game.player;
        if (p.x + p.w + t.triggerDist > t.x && p.x < t.x + t.count * 20 + t.triggerDist) {
          t.state = "fall";
          t.vy = 0;
          game.shake += 2;
          Audio.sfx.trapCrack();
        }
      } else if (t.state === "fall") {
        t.vy += 0.7;
        if (t.vy > 11) t.vy = 11;
        t.y += t.vy;
        t.rect.y = t.y;
        t.kill = { x: t.x + 5, y: t.y + 4, w: t.count * 20 - 10, h: t.h - 7 };
        if (t.fallThrough) {
          // drop right through the ground and keep falling off-screen
          if (t.y > game.height + 40) {
            t.state = "gone";
            t.kill = null;
          }
        } else if (t.y + t.h >= floorY) {
          t.y = floorY - t.h;
          t.state = "down";
          t.kill = null;
          game.shake += 3;
          Audio.sfx.trapSlam();
          for (let i = 0; i < 10; i++) {
            game.particles && game.particles.push({
              x: t.x + Math.random() * t.count * 20,
              y: t.y + t.h,
              vx: (Math.random() - 0.5) * 2.4,
              vy: -(0.5 + Math.random() * 1.6),
              life: 22 + Math.random() * 12, t: 0, kind: "dust"
            });
          }
        }
      }
      t.rect.x = t.x;
    },
    draw(t, ctx) {
      if (t.state === "gone") return;
      // base plate
      ctx.fillStyle = "#1a0d0d";
      ctx.fillRect(t.x - 2, t.y - 6, t.count * 20 + 4, 8);
      // dangling spikes point DOWN
      ctx.fillStyle = t.state === "rest" ? "#ffffff" : "#e8dcd0";
      ctx.beginPath();
      for (let i = 0; i < t.count; i++) {
        const sx = t.x + i * 20;
        ctx.moveTo(sx, t.y);
        ctx.lineTo(sx + 10, t.y + t.h);
        ctx.lineTo(sx + 20, t.y);
      }
      ctx.fill();
      // torn debris after landing
      if (t.state === "down") {
        ctx.fillStyle = "#1a0d0d";
        for (let i = 0; i < t.count; i++) {
          const sx = t.x + i * 20;
          ctx.fillRect(sx + 2, t.y + t.h - 5, 8, 5);
          ctx.fillRect(sx + 12, t.y + t.h - 3, 5, 3);
        }
      }
      if (t.state === "rest") {
        // faint hold-lines so the player knows these can drop
        ctx.strokeStyle = "rgba(255,255,255,0.25)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < t.count; i++) {
          const sx = t.x + i * 20 + 10;
          ctx.moveTo(sx, t.y - 6);
          ctx.lineTo(sx, t.y - 2);
        }
        ctx.stroke();
      }
    }
  };

  /* ================== type: bouncer ================== */
  REG.bouncer = {
    create(t) {
      t.w = t.w || 60;
      t.boost = t.boost || -17.5;   // bounces about 2x a normal jump (~210px)
      t.rect = { x: t.x, y: t.y, w: t.w, h: 12 };
      t.comp = 0;
    },
    update(t, game) {
      const p = game.player;
      if (rectHit(p, t) && p.vy > -2) {
        p.vy = t.boost;
        p.grounded = false;
        t.comp = 1;
        Audio.sfx.bounce();
        game.dust(p.x + p.w / 2, p.y + p.h, 8);
      }
      t.comp = Math.max(0, t.comp - 0.25);
    },
    draw(t, ctx) {
      const squeeze = t.comp * 3;
      ctx.fillStyle = "#2f7d3a";
      ctx.fillRect(t.x, t.y + squeeze, t.w, 12 - squeeze);
      ctx.fillStyle = "#4fdc5e";
      ctx.fillRect(t.x + 6, t.y + squeeze, t.w - 12, 5);
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fillRect(t.x + 4, t.y + 12, t.w - 8, 3);
    }
  };

  /* ================== type: warp ================== */
  REG.warp = {
    create(t) {
      t.w = 26; t.h = 26;
      t.rect = { x: t.x, y: t.y + 14, w: t.w, h: 26 };
      t.armed = true;
      t.t = 0;
    },
    update(t, game) {
      t.t++;
      if (t.armed && rectHit(game.player, t.rect)) {
        t.armed = false;
        t.cool = 40;
        game.player.x = t.tx;
        game.player.y = t.ty;
        game.player.vx = 0; game.player.vy = 0;
        Audio.sfx.trapWarp();
      }
      if (!t.armed) { t.cool--; if (t.cool <= 0) t.armed = true; }
    },
    draw(t, ctx) {
      const pulse = 0.5 + Math.sin(t.t * 0.1) * 0.3;
      ctx.strokeStyle = `rgba(150,90,220,${pulse + 0.3})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(t.x + t.w / 2, t.y + t.h, t.w / 2, Math.PI, 0);
      ctx.stroke();
      ctx.fillStyle = `rgba(150,90,220,${pulse * 0.4})`;
      ctx.beginPath();
      ctx.ellipse(t.x + t.w / 2, t.y + t.h, t.w / 2, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(200,160,255,0.9)";
      ctx.font = "18px monospace";
      ctx.textAlign = "center";
      ctx.fillText("™", t.x + t.w / 2, t.y + 12);
    }
  };

  /* ================== type: invisibleSpikes ================== */
  REG.invisibleSpikes = {
    create(t) {
      t.count = t.count || 2;
      t.h = 24;
      t.shown = false;
      t.rect = { x: t.x, y: t.y - t.h, w: t.count * 20, h: t.h };
      t.kill = null;
    },
    update(t, game) {
      if (!t.shown && rectHit(game.player, t.rect)) {
        t.shown = true;
        Audio.sfx.trapSpike();
        game.shake += 3;
      }
      t.kill = t.shown ? { x: t.x + 3, y: t.y - t.h + 3, w: t.count * 20 - 6, h: t.h - 3 } : null;
    },
    draw(t, ctx) {
      if (t.shown) {
        drawSpikeRow(ctx, t.x, t.y, t.count, t.h, -1, "#ffffff");
      } else {
        // faint hint
        ctx.fillStyle = "rgba(255,255,255,0.14)";
        ctx.fillRect(t.x, t.y - 2, t.count * 20, 4);
      }
    }
  };

  /* ================== PROJECTILES ================== */
  function updateProjectiles(game) {
    const arr = game.projectiles;
    for (let i = arr.length - 1; i >= 0; i--) {
      const pr = arr[i];
      pr.x += pr.vx;
      pr.y += pr.vy || 0;
      pr.life--;
      // bounce off walls
      if (pr.kind === "fireball") {
        const floor = [].concat(game.solids || [], game.carvable || [], game.oneways || []);
        for (const s of floor) {
          if (s.solidNow === false) continue;
          if (rectHit(pr, s)) {
            pr.life = 0;
            // spark burst
            for (let k = 0; k < 6; k++) game.particles.push({ x: pr.x, y: pr.y, vx: rand(-1.5, 1.5), vy: rand(-1, 1), life: 30, t: 0, kind: "spark" });
            break;
          }
        }
      }
      if (pr.life <= 0 || pr.x < -40 || pr.x > game.width + 40 || pr.y > game.height + 40) {
        arr.splice(i, 1);
      }
    }
  }

  function rectHit(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  /* ================== PUBLIC API ================== */
  return {
    createTrap(def) {
      const t = Object.assign({}, def);
      if (REG[def.type]) REG[def.type].create(t);
      return t;
    },
    update(t, game, dt) { if (REG[t.type] && REG[t.type].update) REG[t.type].update(t, game, dt); },
    draw(t, ctx, game) { if (REG[t.type]) REG[t.type].draw(t, ctx, game); },
    killRect(t) { return t.kill || null; },
    updateProjectiles,
    rectHit
  };
})();