import { TAU, rand, reduced } from '../core/util.js';
import { DPR, H, W, camX, cx } from './stage.js';

/* ---------- sky ---------- */
let stars = [], shoot = null, nextShoot = 4;
function makeStars() { stars = Array.from({ length: Math.round(W * H / 4500) }, () => ({ x: Math.random(), y: Math.random(), r: rand(.5, 1.8), tw: rand(0, TAU), sp: rand(.5, 2), d: rand(.2, 1) })); }
// The gradient + nebula backdrop never changes between frames: paint it once per resize.
const skyCv = document.createElement('canvas');
function paintSkyBackdrop() {
  skyCv.width = Math.max(1, Math.round(W * DPR)); skyCv.height = Math.max(1, Math.round(H * DPR));
  const c = skyCv.getContext('2d');
  c.setTransform(DPR, 0, 0, DPR, 0, 0);
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0a0e2a'); g.addColorStop(1, '#1d1552');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  for (const [nx, ny, col] of [[.82, .2, 'rgba(255,126,182,.12)'], [.14, .86, 'rgba(110,240,194,.08)'], [.5, .55, 'rgba(159,180,255,.06)']]) {
    const r = Math.max(W, H) * .5, ng = c.createRadialGradient(nx * W, ny * H, 0, nx * W, ny * H, r);
    ng.addColorStop(0, col); ng.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = ng; c.fillRect(0, 0, W, H);
  }
}
function drawSky(t, dt) {
  cx.drawImage(skyCv, 0, 0, W, H);
  cx.fillStyle = '#fff';
  for (const s of stars) {
    const x = (((s.x * W - camX * s.d * .3) % W) + W) % W;
    cx.globalAlpha = reduced ? .8 : .3 + .7 * (.5 + .5 * Math.sin(t * s.sp + s.tw));
    cx.fillRect(x, s.y * H, s.r, s.r);
  }
  cx.globalAlpha = 1;
  if (reduced) return;
  nextShoot -= dt;
  if (!shoot && nextShoot < 0) { shoot = { x: rand(W * .2, W), y: rand(0, H * .4), life: 1 }; nextShoot = rand(5, 10); }
  if (shoot) {
    shoot.life -= dt * 1.4; shoot.x -= dt * W * .6; shoot.y += dt * W * .25;
    const lg = cx.createLinearGradient(shoot.x, shoot.y, shoot.x + 90, shoot.y - 38);
    lg.addColorStop(0, `rgba(255,255,255,${Math.max(0, shoot.life)})`); lg.addColorStop(1, 'rgba(255,255,255,0)');
    cx.strokeStyle = lg; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(shoot.x, shoot.y); cx.lineTo(shoot.x + 90, shoot.y - 38); cx.stroke();
    if (shoot.life <= 0) shoot = null;
  }
}

export { drawSky, makeStars, nextShoot, paintSkyBackdrop, shoot, skyCv, stars };
