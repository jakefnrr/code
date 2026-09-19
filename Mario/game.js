// game.js - Mario-style 2D Platformer Engine
const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
const W = 800, H = 480;
canvas.width = W; canvas.height = H;

function resizeCanvas() {
  const sx = window.innerWidth / W, sy = window.innerHeight / H;
  const s = Math.min(sx, sy);
  canvas.style.width = (W * s) + "px";
  canvas.style.height = (H * s) + "px";
  canvas.style.position = "absolute";
  canvas.style.left = ((window.innerWidth - W * s) / 2) + "px";
  canvas.style.top = ((window.innerHeight - H * s) / 2) + "px";
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

const GRAVITY = 0.6, MAX_FALL = 10;
const NORMAL_W = 24, NORMAL_H = 32, BIG_W = 24, BIG_H = 48;
const INVINCIBLE_FRAMES = 90, STAR_FRAMES = 600, JUMP_BUFFER = 10, MAX_PARTICLES = 100;
const SAVE_KEY = "mario25_save";
