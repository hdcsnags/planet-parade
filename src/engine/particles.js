import { tone } from '../audio/audio.js';
import { TAU, rand } from '../core/util.js';
import { drawStar } from './art.js';
import { H, W, camX, cx } from './stage.js';
import { after } from './timers.js';

/* ---------- particles ---------- */
const parts = [];
const COLORS = ['#ffc93c', '#ff7eb6', '#6ef0c2', '#9fb4ff', '#ffffff'];
function burst(x, y, n = 24, colors = COLORS, power = 1) {
  for (let i = 0; i < n && parts.length < 700; i++) {
    const a = rand(0, TAU), sp = rand(120, 420) * power, life = rand(.9, 1.6);
    parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120 * power, life, max: life, col: colors[i % colors.length], s: rand(6, 13), rot: rand(0, TAU), vr: rand(-6, 6), star: Math.random() < .6, g: 380 });
  }
}
const sparkle = (x, y, n = 8) => burst(x, y, n, COLORS, .5);
function trail(x, y) {
  if (parts.length > 700) return;
  parts.push({ x, y, vx: rand(-30, 30), vy: rand(-30, 30), life: .6, max: .6, col: Math.random() < .5 ? '#ffb13c' : '#fff3b0', s: rand(4, 9), rot: 0, vr: 0, star: false, g: 0, shrink: true });
}
function fireworks(n = 6) {
  for (let i = 0; i < n; i++) after(i * .32, () => { burst(camX + rand(W * .15, W * .85), rand(H * .15, H * .5), 36, COLORS, 1.2); tone(rand(600, 1000), .3, { type: 'triangle', vol: .1 }); });
}
function updateParts(dt) {
  const drag = Math.pow(.35, dt);
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]; p.life -= dt;
    if (p.life <= 0) { parts.splice(i, 1); continue; }
    p.vx *= drag; p.vy = p.vy * drag + p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
  }
}
function drawParts() {
  for (const p of parts) {
    cx.globalAlpha = Math.min(1, p.life / .4); cx.fillStyle = p.col;
    const s = p.shrink ? p.s * (p.life / p.max) : p.s;
    if (p.star) drawStar(cx, p.x, p.y, s, p.rot); else { cx.beginPath(); cx.arc(p.x, p.y, s * .5, 0, TAU); cx.fill(); }
  }
  cx.globalAlpha = 1;
}

export { COLORS, burst, drawParts, fireworks, parts, sparkle, trail, updateParts };
