/* =====================================================================
   LEVEL DEVIL — PLAYER SPRITE (procedural, animated)
   A handsome devil in a full tuxedo: sharp black suit, red bow tie,
   a tilted fedora and cool sunglasses. Smooth, confident, dapper.
   Animations: idle (breathing, hat-bob, blinking glint), walk (legs pump,
   body bob, hat sway), jump/fall (arms up), death (spin, dizzy tilt,
   fade), plus squash & stretch on land.
   Hitbox stays 26x38; the drawing is a bit larger for charm.
   ===================================================================== */
const Player = (() => {
  const W = 26, H = 38;

  function draw(ctx, p) {
    const t = p.animTime;
    const fx = p.face; // 1 = right
    const cx = p.x + W / 2;
    const top = p.y;

    let bobY = 0, bobA = 0, lean = 0;
    let legsL = 0, legsR = 0;
    let armsUp = 0;
    let hatTilt = -0.14;
    let headSwing = 0;
    let dizzy = false;
    let bodyScaleY = 1, bodyScaleX = 1;
    let rot = 0;
    let alpha = 1;

    const anim = p.anim; // idle | walk | jump | fall | die

    if (anim === "idle") {
      // perfectly still until the player moves
    } else if (anim === "walk") {
      bobY = Math.sin(t * 10) * 1.2;
      legsL = Math.sin(t * 10) * 8;
      legsR = Math.sin(t * 10 + Math.PI) * 8;
      bobA = Math.sin(t * 10) * 0.06;
      lean = 0.08;
      hatTilt = -0.14 + Math.sin(t * 10) * 0.03;
      headSwing = Math.sin(t * 5) * 0.5;
    } else if (anim === "jump") {
      armsUp = 0.9;
      legsL = -6; legsR = -6;
      hatTilt = 0.18;
    } else if (anim === "fall") {
      armsUp = 0.6;
      legsL = 4 + Math.sin(t * 10) * 3;
      legsR = -4;
      hatTilt = -0.3;
    } else if (anim === "die") {
      rot = Math.sin(t * 6) * 0.9;
      bobY = -Math.min(t * 2.5, 26);
      alpha = Math.max(0, 1 - Math.max(0, t - 45) / 25);
      dizzy = true;
      hatTilt = -0.5 + Math.sin(t * 8) * 0.2;
    }

    // squash & stretch on land
    if (p.squash > 0) {
      const s = p.squash;
      bodyScaleY = 1 - s * 0.25;
      bodyScaleX = 1 + s * 0.3;
    }

    const skin = "#e8b98a";
    const suit = "#17171f";
    const suitDark = "#101016";
    const suitLight = "#2a2a36";
    const shirt = "#ecece8";
    const hair = "#241811";

    ctx.save();
    ctx.translate(cx, top + bobY);
    ctx.rotate(rot + bobA);
    ctx.scale(fx, 1);
    ctx.globalAlpha = alpha;

    // ---- shadow under ----
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath();
    ctx.ellipse(0, 36, 11, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // ---- legs & shoes ----
    ctx.strokeStyle = suitDark;
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-4, 27);
    ctx.lineTo(-5 - Math.max(legsL, 0) * 0.15, 32 + legsL * 0.5);
    ctx.moveTo(4, 27);
    ctx.lineTo(5 + Math.max(legsR, 0) * 0.15, 32 + legsR * 0.5);
    ctx.stroke();
    // polished oxfords
    ctx.fillStyle = "#0d0d12";
    ctx.beginPath();
    ctx.ellipse(-5, 34.5 + legsL * 0.5, 4.6, 2.4, 0, 0, Math.PI * 2);
    ctx.ellipse(5, 34.5 + legsR * 0.5, 4.6, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath();
    ctx.ellipse(-5.4, 33.8 + legsL * 0.5, 1.8, 0.6, 0, 0, Math.PI * 2);
    ctx.ellipse(4.6, 33.8 + legsR * 0.5, 1.8, 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // ---- arms (tux sleeves) ----
    const armAng = (armsUp || 0) > 0 ? -0.5 : (anim === "walk" ? Math.sin(t * 10 + Math.PI) * 0.5 : 0);
    ctx.strokeStyle = suit;
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-8, 15);
    ctx.lineTo(-7 - armAng * 10, 21 + (armsUp > 0 ? 4 : 0));
    ctx.moveTo(8, 15);
    ctx.lineTo(11 - armAng * 10, 21 + (armsUp > 0 ? 4 : 0));
    ctx.stroke();
    // hands
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(-8 - armAng * 10, 21.5 + (armsUp > 0 ? 4 : 0), 2.6, 0, Math.PI * 2);
    ctx.arc(12 - armAng * 10, 21.5 + (armsUp > 0 ? 4 : 0), 2.6, 0, Math.PI * 2);
    ctx.fill();

    // ---- torso: tuxedo jacket ----
    ctx.fillStyle = suit;
    ctx.beginPath();
    ctx.ellipse(0, 20, 11 * bodyScaleX, 12 * bodyScaleY, 0, 0, Math.PI * 2);
    ctx.fill();
    // white shirt front
    ctx.fillStyle = shirt;
    ctx.beginPath();
    ctx.moveTo(-3.5, 12.5);
    ctx.lineTo(3.5, 12.5);
    ctx.lineTo(0, 23.5);
    ctx.closePath();
    ctx.fill();
    // jacket lapels (subtle)
    ctx.fillStyle = suitLight;
    ctx.beginPath();
    ctx.moveTo(-3.5, 12.5);
    ctx.lineTo(-9, 17);
    ctx.lineTo(-7.5, 26);
    ctx.lineTo(-3.5, 23.5);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(3.5, 12.5);
    ctx.lineTo(9, 17);
    ctx.lineTo(7.5, 26);
    ctx.lineTo(3.5, 23.5);
    ctx.closePath();
    ctx.fill();
    // red pocket square
    ctx.fillStyle = "#c22f2f";
    ctx.beginPath();
    ctx.moveTo(4.5, 17.5);
    ctx.lineTo(8, 17.5);
    ctx.lineTo(6.4, 20.5);
    ctx.closePath();
    ctx.fill();

    // ---- bow tie ----
    ctx.fillStyle = "#0a0a0e";
    ctx.beginPath();
    ctx.moveTo(0, 12.4);
    ctx.lineTo(-6, 13.2);
    ctx.lineTo(-6, 16);
    ctx.lineTo(0, 14.8);
    ctx.closePath();
    ctx.moveTo(0, 12.4);
    ctx.lineTo(6, 13.2);
    ctx.lineTo(6, 16);
    ctx.lineTo(0, 14.8);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(-1.3, 12.8, 2.6, 2.6);

    // ---- head ----
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(2, 0, 9, 9.5 + headSwing * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    // side hair / sideburns
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.ellipse(-5.5, -1, 1.8, 5.5, -0.2, 0, Math.PI * 2);
    ctx.ellipse(9.5, -1, 1.8, 5.5, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // ---- smile ----
    ctx.strokeStyle = "#5a2f1a";
    ctx.lineWidth = 1.4;
    ctx.lineCap = "round";
    ctx.beginPath();
    if (dizzy) {
      ctx.arc(3, 7, 3.5, 0, Math.PI);
    } else {
      ctx.arc(4, 5.5, 4, 0.15 * Math.PI, 0.85 * Math.PI);
    }
    ctx.stroke();

    // ---- sunglasses ----
    const so = dizzy ? 1.5 : 0;
    ctx.fillStyle = "#0b0b10";
    ctx.beginPath();
    ctx.ellipse(-2, -1.5 + so * 0.3, 4, 3.6, -0.04, 0, Math.PI * 2);
    ctx.ellipse(6, -1.5 + so * 0.3, 4, 3.6, 0.04, 0, Math.PI * 2);
    ctx.fill();
    // bridge
    ctx.fillStyle = "#0b0b10";
    ctx.fillRect(-1.2, -2.6 + so * 0.3, 2.4, 2);
    // brow line
    ctx.fillStyle = "#050508";
    ctx.fillRect(-6.4, -4 + so * 0.3, 4.9, 1.1);
    ctx.fillRect(3.6, -4 + so * 0.3, 4.9, 1.1);
    // glints
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.ellipse(-3.4, -2.7 + so * 0.3, 1.1, 0.55, -0.3, 0, Math.PI * 2);
    ctx.ellipse(4.6, -2.7 + so * 0.3, 1.1, 0.55, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // temple arms
    ctx.strokeStyle = "#0b0b10";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-5.9, -2.6 + so * 0.3);
    ctx.lineTo(-9.5, -0.8);
    ctx.stroke();

    // ---- fedora ----
    ctx.save();
    ctx.translate(2, -8 + headSwing * 0.3);
    ctx.rotate(hatTilt);
    // brim
    ctx.fillStyle = "#1d1d28";
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 3.1, 0, 0, Math.PI * 2);
    ctx.fill();
    // crown
    ctx.fillStyle = "#23232f";
    ctx.beginPath();
    ctx.moveTo(-8.5, 0);
    ctx.lineTo(-8.5, -6.5);
    ctx.ellipse(0, -6.5, 8.5, 3.2, 0, Math.PI, 0);
    ctx.lineTo(8.5, 0);
    ctx.closePath();
    ctx.fill();
    // top dent highlight
    ctx.fillStyle = "#2e2e3c";
    ctx.beginPath();
    ctx.ellipse(0, -6.5, 7, 2.2, 0, Math.PI, 0);
    ctx.fill();
    // hat band
    ctx.fillStyle = "#c22f2f";
    ctx.fillRect(-8.6, -3.4, 17.2, 2.4);
    ctx.restore();

    ctx.restore();
  }

  return { draw, W, H };
})();