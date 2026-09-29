import { settings } from '../core/settings.js';
import { TAU, clamp } from '../core/util.js';
import { fontFor, plabel } from '../i18n/i18n.js';
import { T, cx } from './stage.js';
import { MOON_P, PLANETS } from './world.js';

// A toddler's palm lands several times on one thing: each target ignores repeat taps for 250 ms.
const lastTap = new WeakMap();
function tapGate(o) { const t0 = lastTap.get(o); if (t0 !== undefined && T - t0 < .25) return false; lastTap.set(o, T); return true; }

// Gradients are built in local (translated) coordinates, so one per context + radius can be reused.
const gradCache = new WeakMap();
function cachedGrad(c, key, make) {
  let m = gradCache.get(c);
  if (!m) { m = new Map(); gradCache.set(c, m); }
  let g = m.get(key);
  if (!g) { if (m.size > 400) m.clear(); g = make(); m.set(key, g); }
  return g;
}

/* ---------- drawing: planets ---------- */
const EARTH_LAND = [
  { lon: 0, lat: .62, s: .3 }, { lon: .25, lat: .38, s: .22 }, { lon: .45, lat: .05, s: .12 }, { lon: .6, lat: -.25, s: .22 }, { lon: .65, lat: -.55, s: .14 },
  { lon: 2.2, lat: .68, s: .18 }, { lon: 2.35, lat: .25, s: .28 }, { lon: 2.55, lat: -.15, s: .24 }, { lon: 2.6, lat: -.45, s: .12 },
  { lon: 3.3, lat: .6, s: .32 }, { lon: 3.8, lat: .55, s: .3 }, { lon: 4.1, lat: .25, s: .2 }, { lon: 3.7, lat: .2, s: .16 }, { lon: 4.8, lat: -.45, s: .17 },
];
const EARTH_SAND = [{ lon: 2.38, lat: .3, s: .13 }, { lon: 3.55, lat: .5, s: .12 }, { lon: 4.8, lat: -.45, s: .08 }];
const EARTH_CLOUD = [
  { lon: .8, lat: .3, s: .1, w: 3, h: .6 }, { lon: 1.9, lat: -.35, s: .09, w: 3.5, h: .6 }, { lon: 3, lat: .05, s: .08, w: 3, h: .6 },
  { lon: 4.4, lat: .45, s: .1, w: 2.6, h: .6 }, { lon: 5.5, lat: -.1, s: .1, w: 3, h: .6 }, { lon: 5.9, lat: .62, s: .08, w: 3, h: .6 },
];
const MARS_DARK = [{ lon: .5, lat: .1, s: .25, w: 1.6, h: .5 }, { lon: 1.8, lat: -.2, s: .2, w: 1.2 }, { lon: 3.2, lat: .25, s: .18, w: 1.8, h: .5 }, { lon: 4.5, lat: -.1, s: .22, w: 1.4, h: .6 }, { lon: 5.6, lat: .35, s: .12 }];
const CRATERS = [{ lon: .3, lat: .3, s: .14 }, { lon: 1.1, lat: -.3, s: .18 }, { lon: 1.9, lat: .5, s: .1 }, { lon: 2.6, lat: -.1, s: .16 }, { lon: 3.4, lat: .35, s: .12 }, { lon: 4.2, lat: -.45, s: .1 }, { lon: 5, lat: .1, s: .17 }, { lon: 5.8, lat: -.25, s: .11 }];
const BANDS = {
  venus: [[-.75, -.45, 'rgba(255,246,215,.38)'], [-.12, .14, 'rgba(196,132,62,.28)'], [.42, .7, 'rgba(255,240,205,.32)']],
  jupiter: [[-1, -.7, 'rgba(140,95,70,.45)'], [-.52, -.3, 'rgba(166,98,60,.55)'], [-.14, .06, 'rgba(255,244,222,.4)'], [.2, .4, 'rgba(155,90,55,.55)'], [.58, .74, 'rgba(166,115,82,.42)'], [.84, 1, 'rgba(140,95,70,.4)']],
  saturn: [[-.62, -.42, 'rgba(192,152,92,.35)'], [-.1, .08, 'rgba(255,246,214,.35)'], [.3, .48, 'rgba(192,152,92,.3)']],
  uranus: [[-.35, -.15, 'rgba(255,255,255,.14)'], [.4, .55, 'rgba(60,150,170,.18)']],
  neptune: [[-.5, -.34, 'rgba(140,175,255,.35)'], [.18, .3, 'rgba(20,40,140,.3)']],
};

// Features sit on a rotating sphere: longitude scrolls, and they squash as they near the edge.
function features(c, R, rot, list, color) {
  c.fillStyle = color;
  for (const f of list) {
    const d = f.lon - rot, cz = Math.cos(d);
    if (cz < -.15) continue;
    c.beginPath();
    c.ellipse(R * Math.cos(f.lat) * Math.sin(d), -R * Math.sin(f.lat), Math.max(.01, f.s * R * Math.max(.12, cz) * (f.w || 1)), f.s * R * (f.h || 1), 0, 0, TAU);
    c.fill();
  }
}
function bands(c, R, list, t, wav) {
  const steps = 16, edge = (y, i) => y * R + Math.sin(i * .9 + t * .8 + y * 5) * R * wav;
  for (const [a, b, col] of list) {
    c.fillStyle = col; c.beginPath();
    for (let i = 0; i <= steps; i++) c.lineTo(-R + 2 * R * i / steps, edge(a, i));
    for (let i = steps; i >= 0; i--) c.lineTo(-R + 2 * R * i / steps, edge(b, i));
    c.closePath(); c.fill();
  }
}
function surface(c, p, R, t) {
  switch (p.id) {
    case 'mercury': features(c, R, t * .12, CRATERS, 'rgba(70,64,58,.35)'); break;
    case 'moon': features(c, R, t * .08, CRATERS, 'rgba(90,86,80,.32)'); break;
    case 'venus': bands(c, R, BANDS.venus, t, .07); break;
    case 'earth':
      features(c, R, t * .25, EARTH_LAND, '#49b36a'); features(c, R, t * .25, EARTH_SAND, '#d8c27a');
      features(c, R, t * .34, EARTH_CLOUD, 'rgba(255,255,255,.72)');
      c.fillStyle = 'rgba(255,255,255,.92)'; c.beginPath(); c.ellipse(0, -R * .96, R * .42, R * .12, 0, 0, TAU); c.ellipse(0, R * .97, R * .34, R * .1, 0, 0, TAU); c.fill();
      break;
    case 'mars':
      features(c, R, t * .2, MARS_DARK, 'rgba(110,35,15,.35)');
      c.fillStyle = 'rgba(255,250,245,.9)'; c.beginPath(); c.ellipse(0, -R * .95, R * .36, R * .12, 0, 0, TAU); c.ellipse(0, R * .97, R * .22, R * .08, 0, 0, TAU); c.fill();
      break;
    case 'jupiter': bands(c, R, BANDS.jupiter, t, .025); features(c, R, t * .35, [{ lon: 1, lat: -.38, s: .17, w: 1.5, h: .62 }], '#c8543a'); break;
    case 'saturn': bands(c, R, BANDS.saturn, t, .015); break;
    case 'uranus': bands(c, R, BANDS.uranus, t, 0); break;
    case 'neptune': bands(c, R, BANDS.neptune, t, .02); features(c, R, t * .3, [{ lon: 2, lat: -.32, s: .13, w: 1.6, h: .6 }], 'rgba(20,35,120,.7)'); break;
  }
}
function ring(c, R, p, half) {
  const uranus = p.id === 'uranus', flat = uranus ? .2 : .3;
  const list = uranus
    ? [[1.55, 'rgba(210,245,255,.4)', R * .05], [1.72, 'rgba(210,245,255,.22)', R * .03]]
    : [[1.35, 'rgba(210,180,130,.55)', R * .12], [1.55, 'rgba(240,215,160,.88)', R * .2], [1.78, 'rgba(200,165,110,.72)', R * .14], [1.98, 'rgba(235,210,160,.5)', R * .1]];
  c.save(); c.rotate(uranus ? 1.35 : -.3);
  for (const [k, col, lw] of list) {
    c.strokeStyle = col; c.lineWidth = lw; c.beginPath();
    c.ellipse(0, 0, k * R, k * R * flat, 0, half === 'back' ? Math.PI : 0, half === 'back' ? TAU : Math.PI);
    c.stroke();
  }
  c.restore();
}
function drawFace(c, R, o, faceY = 0) {
  const ink = '#1b1740', fy = faceY * R, ex = R * .33, ey = fy - R * .1, er = R * .16;
  const lk = o.look || { x: 0, y: 0 }, bl = o.blink ?? 1;
  for (const sd of [-1, 1]) {
    const px = sd * ex + lk.x * er * .35, py = ey + lk.y * er * .35;
    if (bl > .3) {
      c.fillStyle = '#fff'; c.beginPath(); c.ellipse(sd * ex, ey, er * .9, er * bl, 0, 0, TAU); c.fill();
      c.fillStyle = ink; c.beginPath(); c.ellipse(px, py, er * .58, er * .58 * bl, 0, 0, TAU); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(px - er * .2, py - er * .22 * bl, er * .2, 0, TAU); c.fill();
    } else {
      c.strokeStyle = ink; c.lineWidth = R * .045; c.lineCap = 'round';
      c.beginPath(); c.arc(sd * ex, ey - er * .3, er * .7, .2 * Math.PI, .8 * Math.PI); c.stroke();
    }
    c.fillStyle = 'rgba(255,110,150,.38)'; c.beginPath(); c.ellipse(sd * R * .55, fy + R * .14, R * .12, R * .08, 0, 0, TAU); c.fill();
  }
  const my = fy + R * .14;
  if (o.yawn) { // a sleepy "oh"
    c.fillStyle = ink; c.beginPath(); c.ellipse(0, my + R * .05, R * .1, R * .14, 0, 0, TAU); c.fill();
  } else if (o.happy) {
    c.fillStyle = ink; c.beginPath(); c.arc(0, my, R * .19, 0, Math.PI); c.closePath(); c.fill();
    c.fillStyle = '#ff6f91'; c.beginPath(); c.ellipse(0, my + R * .12, R * .09, R * .05, 0, 0, TAU); c.fill();
  } else {
    c.strokeStyle = ink; c.lineWidth = R * .055; c.lineCap = 'round';
    c.beginPath(); c.arc(0, my - R * .05, R * .17, .22 * Math.PI, .78 * Math.PI); c.stroke();
  }
}
function drawPlanet(c, p, x, y, R, t, o = {}) {
  c.save(); c.translate(x, y);
  if (o.rot) c.rotate(o.rot);
  if (o.sx) c.scale(o.sx, o.sy);
  const ringed = p.id === 'saturn' || p.id === 'uranus';
  if (ringed) ring(c, R, p, 'back');
  c.save(); c.beginPath(); c.arc(0, 0, R, 0, TAU); c.clip();
  const rk = R.toFixed(1);
  c.fillStyle = cachedGrad(c, `pb|${p.id}|${rk}`, () => {
    const g = c.createRadialGradient(-R * .38, -R * .42, R * .05, 0, 0, R * 1.05);
    g.addColorStop(0, p.light); g.addColorStop(.55, p.base); g.addColorStop(1, p.dark);
    return g;
  });
  c.fillRect(-R, -R, R * 2, R * 2);
  surface(c, p, R, t);
  c.fillStyle = cachedGrad(c, `ps|${rk}`, () => {
    const s = c.createRadialGradient(-R * .45, -R * .5, R * .1, -R * .1, -R * .1, R * 1.35);
    s.addColorStop(0, 'rgba(255,255,255,.22)'); s.addColorStop(.45, 'rgba(255,255,255,0)'); s.addColorStop(1, 'rgba(8,6,40,.55)');
    return s;
  });
  c.fillRect(-R, -R, R * 2, R * 2);
  c.restore();
  if (p.atmo) { c.save(); c.globalAlpha *= .45; c.strokeStyle = p.atmo; c.lineWidth = R * .07; c.beginPath(); c.arc(0, 0, R * 1.01, 0, TAU); c.stroke(); c.restore(); }
  if (o.face) drawFace(c, R, o, p.faceY || 0);
  if (ringed) ring(c, R, p, 'front');
  c.restore();
}
function drawSun(c, x, y, R, t, o = {}) {
  c.save(); c.translate(x, y);
  if (o.rot) c.rotate(o.rot);
  if (o.sx) c.scale(o.sx, o.sy);
  const rk = R.toFixed(1);
  c.fillStyle = cachedGrad(c, `sg|${rk}`, () => {
    const g = c.createRadialGradient(0, 0, R * .6, 0, 0, R * 2.1);
    g.addColorStop(0, 'rgba(255,200,60,.5)'); g.addColorStop(1, 'rgba(255,120,40,0)');
    return g;
  });
  c.beginPath(); c.arc(0, 0, R * 2.1, 0, TAU); c.fill();
  c.save(); c.rotate(t * .12); c.fillStyle = 'rgba(255,210,90,.6)';
  for (let i = 0, n = 14; i < n; i++) {
    const a = i / n * TAU, l = R * (1.26 + .1 * Math.sin(t * 2 + i * 1.7));
    c.beginPath(); c.moveTo(Math.cos(a - .1) * R * .95, Math.sin(a - .1) * R * .95); c.lineTo(Math.cos(a) * l, Math.sin(a) * l); c.lineTo(Math.cos(a + .1) * R * .95, Math.sin(a + .1) * R * .95); c.fill();
  }
  c.restore();
  c.fillStyle = cachedGrad(c, `sb|${rk}`, () => {
    const b = c.createRadialGradient(-R * .3, -R * .3, R * .1, 0, 0, R);
    b.addColorStop(0, '#fff3b0'); b.addColorStop(.55, '#ffc93c'); b.addColorStop(1, '#ff8a1f');
    return b;
  });
  c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill();
  if (o.face) drawFace(c, R, o, 0);
  c.restore();
}
function drawRocket(c, x, y, s, ang, t, thrust) {
  c.save(); c.translate(x, y); c.rotate(ang);
  if (thrust > 0) {
    const fl = s * (.9 + .35 * Math.sin(t * 40)) * thrust;
    const fg = c.createLinearGradient(-s * .65, 0, -s * .65 - fl * 1.7, 0);
    fg.addColorStop(0, '#fff6c0'); fg.addColorStop(.4, '#ffb13c'); fg.addColorStop(1, 'rgba(255,80,40,0)');
    c.fillStyle = fg; c.beginPath(); c.moveTo(-s * .65, -s * .2); c.quadraticCurveTo(-s * .65 - fl * 1.9, 0, -s * .65, s * .2); c.fill();
  }
  c.fillStyle = '#ff5a6e';
  for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(-s * .25, sd * s * .24); c.lineTo(-s * .78, sd * s * .62); c.lineTo(-s * .68, sd * s * .16); c.closePath(); c.fill(); }
  c.beginPath(); c.moveTo(s * .9, 0);
  c.bezierCurveTo(s * .6, -s * .38, -s * .4, -s * .34, -s * .7, -s * .22); c.lineTo(-s * .7, s * .22);
  c.bezierCurveTo(-s * .4, s * .34, s * .6, s * .38, s * .9, 0); c.closePath();
  const bg = c.createLinearGradient(0, -s * .32, 0, s * .32); bg.addColorStop(0, '#ffffff'); bg.addColorStop(1, '#c3caf2');
  c.fillStyle = bg; c.fill();
  c.save(); c.clip(); c.fillStyle = '#ff5a6e'; c.fillRect(s * .5, -s, s, s * 2); c.fillRect(-s * .5, -s, s * .1, s * 2); c.restore();
  c.fillStyle = '#2b3a8f'; c.beginPath(); c.arc(s * .12, 0, s * .17, 0, TAU); c.fill();
  c.strokeStyle = '#8fa0ff'; c.lineWidth = s * .06; c.stroke();
  c.fillStyle = 'rgba(255,255,255,.75)'; c.beginPath(); c.arc(s * .07, -s * .06, s * .05, 0, TAU); c.fill();
  c.restore();
}
function drawStar(c, x, y, r, rot) {
  c.beginPath();
  for (let i = 0; i < 10; i++) { const a = rot + i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * .45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  c.closePath(); c.fill();
}
function goldStar(c, x, y, r, t, face) {
  const g = c.createRadialGradient(x - r * .2, y - r * .3, r * .1, x, y, r);
  g.addColorStop(0, '#fff3b0'); g.addColorStop(.6, '#ffc93c'); g.addColorStop(1, '#f08a1c');
  c.fillStyle = g; drawStar(c, x, y, r, 0);
  if (face) { c.save(); c.translate(x, y + r * .1); drawFace(c, r * .42, face); c.restore(); }
}
function roundRect(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function label(b) {
  const size = clamp(b.R * .36, 14, 26);
  cx.font = `800 ${size}px ${fontFor()}`; cx.textAlign = 'center'; cx.textBaseline = 'middle';
  cx.fillStyle = 'rgba(246,242,255,.86)';
  cx.fillText(plabel(b.p), b.x, b.y + b.R * (b.p.hf || 1) + size * 1.1);
}

/* ---------- position cues: a glowing arrow under a spot, a pulsing frame around a slot ---------- */
function drawPosArrow(c, x, y, s, text, t) {
  const a = .6 + .4 * Math.sin(t * 5);
  c.save(); c.translate(x, y);
  c.shadowColor = 'rgba(110,240,194,.95)'; c.shadowBlur = 26 * a;
  c.fillStyle = '#6ef0c2';
  c.beginPath(); c.moveTo(0, 0); c.lineTo(s * .55, s * .6); c.lineTo(s * .2, s * .6); c.lineTo(s * .2, s * 1.05);
  c.lineTo(-s * .2, s * 1.05); c.lineTo(-s * .2, s * .6); c.lineTo(-s * .55, s * .6); c.closePath(); c.fill();
  c.shadowBlur = 0;
  c.fillStyle = '#f6f2ff'; c.font = `800 ${s * .44}px ${fontFor()}`; c.textAlign = 'center'; c.textBaseline = 'top';
  c.fillText(text, 0, s * 1.16);
  c.restore();
}
function drawSlotFrame(c, x, y, w, h, t) {
  c.save(); c.lineWidth = 5; c.setLineDash([16, 10]); c.lineDashOffset = -t * 30;
  c.strokeStyle = `rgba(110,240,194,${.55 + .4 * Math.sin(t * 5)})`;
  roundRect(c, x - w / 2, y - h / 2, w, h, 28); c.stroke(); c.restore();
}
// A friendly space whale, swimming to the right.
function drawWhale(c, x, y, R, t) {
  c.save(); c.translate(x, y + Math.sin(t * 3) * R * .06);
  const g = c.createLinearGradient(0, -R, 0, R); g.addColorStop(0, '#7f9dff'); g.addColorStop(1, '#4b5fd6');
  c.fillStyle = g;
  c.beginPath(); c.moveTo(-R * 1.45, 0); c.lineTo(-R * 2.1, -R * .55 + Math.sin(t * 6) * R * .1); c.lineTo(-R * 1.95, 0); c.lineTo(-R * 2.1, R * .5 + Math.sin(t * 6) * R * .1); c.closePath(); c.fill();
  c.beginPath(); c.ellipse(0, 0, R * 1.55, R * .95, 0, 0, TAU); c.fill();
  c.fillStyle = '#c9d6ff'; c.beginPath(); c.ellipse(R * .15, R * .45, R * 1.1, R * .42, 0, 0, Math.PI); c.fill();
  c.fillStyle = '#1b1740'; c.beginPath(); c.arc(R * .85, -R * .2, R * .13, 0, TAU); c.fill();
  c.fillStyle = '#fff'; c.beginPath(); c.arc(R * .81, -R * .25, R * .05, 0, TAU); c.fill();
  c.strokeStyle = '#1b1740'; c.lineWidth = R * .07; c.lineCap = 'round';
  c.beginPath(); c.arc(R * .95, R * .12, R * .28, .1 * Math.PI, .6 * Math.PI); c.stroke();
  c.fillStyle = 'rgba(255,110,150,.45)'; c.beginPath(); c.ellipse(R * .62, R * .16, R * .13, R * .08, 0, 0, TAU); c.fill();
  c.fillStyle = 'rgba(180,230,255,.85)';
  for (let k = 0; k < 3; k++) { const ph = (t * 1.6 + k / 3) % 1; c.beginPath(); c.arc(R * .3 + (k - 1) * R * .2 * ph, -R * .95 - ph * R * .8, R * .09 * (1 - ph * .5), 0, TAU); c.fill(); }
  c.restore();
}

/* ---------- pictures for Space Words ---------- */
function drawAstronaut(c, x, y, s, t, wave = 0) {
  c.save(); c.translate(x, y + Math.sin(t * 1.5) * s * .04);
  c.fillStyle = '#9aa3c8'; roundRect(c, -s * .5, -s * .1, s * 1, s * .78, s * .16); c.fill();
  c.fillStyle = '#f4f6ff'; roundRect(c, -s * .4, -s * .05, s * .8, s * .85, s * .24); c.fill();
  c.strokeStyle = '#f4f6ff'; c.lineWidth = s * .2; c.lineCap = 'round';
  // The right arm lifts and waves when she taps the card.
  const arm = -.55 - wave * (1.1 + .45 * Math.sin(t * 14)), ax = s * .38, ay = s * .12, al = s * .42;
  c.beginPath(); c.moveTo(-s * .38, s * .12); c.lineTo(-s * .66, s * .38); c.moveTo(ax, ay); c.lineTo(ax + Math.cos(arm) * al, ay + Math.sin(arm) * al); c.stroke();
  c.fillStyle = '#ff7eb6'; c.fillRect(-s * .14, s * .2, s * .28, s * .18);
  c.fillStyle = '#f4f6ff'; c.beginPath(); c.arc(0, -s * .38, s * .42, 0, TAU); c.fill();
  const v = c.createLinearGradient(0, -s * .62, 0, -s * .14); v.addColorStop(0, '#5b6fd8'); v.addColorStop(1, '#1d2366');
  c.fillStyle = v; c.beginPath(); c.ellipse(0, -s * .38, s * .31, s * .24, 0, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.ellipse(-s * .12, -s * .47, s * .09, s * .05, -.5, 0, TAU); c.fill();
  c.restore();
}
function drawComet(c, x, y, s, t, zoom = 0) {
  c.save(); c.translate(x, y);
  c.rotate(-.55);
  const tail = s * 1.6 * (1 + zoom * .9);
  const g = c.createLinearGradient(0, 0, -tail, 0); g.addColorStop(0, 'rgba(160,240,255,.9)'); g.addColorStop(1, 'rgba(160,240,255,0)');
  c.fillStyle = g; c.beginPath(); c.moveTo(0, -s * .3); c.quadraticCurveTo(-tail * .56, -s * .22, -tail, 0); c.quadraticCurveTo(-tail * .56, s * .22, 0, s * .3); c.fill();
  const h = c.createRadialGradient(0, 0, 0, 0, 0, s * .45); h.addColorStop(0, '#ffffff'); h.addColorStop(.4, '#b8f4ff'); h.addColorStop(1, 'rgba(110,200,255,0)');
  c.fillStyle = h; c.beginPath(); c.arc(0, 0, s * .45 * (1 + .05 * Math.sin(t * 4)), 0, TAU); c.fill();
  c.restore();
}
function drawTelescope(c, x, y, s, ext = 0) {
  c.save(); c.translate(x, y);
  c.strokeStyle = '#c9b48a'; c.lineWidth = s * .09; c.lineCap = 'round';
  c.beginPath(); c.moveTo(0, s * .05); c.lineTo(-s * .45, s * .8); c.moveTo(0, s * .05); c.lineTo(s * .45, s * .8); c.moveTo(0, s * .05); c.lineTo(0, s * .82); c.stroke();
  c.rotate(-.5);
  const slide = ext * s * .5; // a thinner inner tube slides out of the front when she taps
  c.fillStyle = '#5b72d8'; roundRect(c, s * .4, -s * .13, s * .3 + slide, s * .26, s * .08); c.fill();
  const g = c.createLinearGradient(0, -s * .2, 0, s * .2); g.addColorStop(0, '#7f9dff'); g.addColorStop(1, '#3b4fb0');
  c.fillStyle = g; roundRect(c, -s * .75, -s * .17, s * 1.25, s * .34, s * .1); c.fill();
  c.fillStyle = '#ffc93c'; c.fillRect(s * .2, -s * .19, s * .1, s * .38);
  c.fillStyle = '#dff4ff'; c.beginPath(); c.ellipse(s * .7 + slide, 0, s * .07, s * .15, 0, 0, TAU); c.fill();
  c.restore();
}
// A ring that reads as a ring: a thick tilted band with a little planet sitting inside it.
function drawRingArt(c, x, y, s, spin) {
  c.save(); c.translate(x, y); c.rotate(-.38 + Math.sin(spin) * .25);
  const band = (a0, a1) => {
    for (const [k, col, lw] of [[1, 'rgba(255,214,140,.95)', s * .16], [1.22, 'rgba(255,238,200,.7)', s * .08]]) {
      c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.ellipse(0, 0, s * k, s * k * .34, 0, a0, a1); c.stroke();
    }
  };
  band(Math.PI, TAU);
  c.rotate(.38 - Math.sin(spin) * .25);
  drawPlanet(c, { id: 'ringplanet', r: 1, base: '#c7a4ff', light: '#efe2ff', dark: '#6d4fb8' }, 0, 0, s * .42, spin, {});
  c.rotate(-.38 + Math.sin(spin) * .25);
  band(0, Math.PI);
  c.restore();
}
function drawSatellite(c, x, y, s, t) {
  c.save(); c.translate(x, y); c.rotate(Math.sin(t * .8) * .12 - .2);
  for (const sd of [-1, 1]) {
    c.fillStyle = '#3b6fd6'; c.fillRect(sd > 0 ? s * .3 : -s * 1.05, -s * .22, s * .75, s * .44);
    c.strokeStyle = 'rgba(200,230,255,.6)'; c.lineWidth = 1.5;
    for (let i = 1; i < 4; i++) { const xx = (sd > 0 ? s * .3 : -s * 1.05) + s * .75 * i / 4; c.beginPath(); c.moveTo(xx, -s * .22); c.lineTo(xx, s * .22); c.stroke(); }
    c.beginPath(); c.moveTo(sd > 0 ? s * .3 : -s * 1.05, 0); c.lineTo(sd > 0 ? s * 1.05 : -s * .3, 0); c.stroke();
  }
  const g = c.createLinearGradient(-s * .3, -s * .3, s * .3, s * .3); g.addColorStop(0, '#ffe08a'); g.addColorStop(1, '#c98a1c');
  c.fillStyle = g; roundRect(c, -s * .3, -s * .3, s * .6, s * .6, s * .08); c.fill();
  c.strokeStyle = '#e8ecff'; c.lineWidth = s * .05; c.beginPath(); c.moveTo(0, -s * .3); c.lineTo(0, -s * .5); c.stroke();
  c.fillStyle = '#e8ecff'; c.beginPath(); c.arc(0, -s * .55, s * .12, Math.PI, TAU); c.fill();
  c.restore();
}
// a: toy-animation progress 0..1 after a tap (0 = resting). ph rises and falls once.
function drawWordArt(c, id, x, y, s, t, a = 0) {
  const ph = Math.sin(a * Math.PI);
  const face = settings.faces ? { blink: 1, happy: true, look: { x: 0, y: 0 } } : null;
  const withFace = face ? { face: true, ...face } : {};
  switch (id) {
    case 'rocket': drawRocket(c, x, y - ph * s * 1.15, s * .95, -Math.PI / 2 + Math.sin(t * 2) * .05, t, a ? 1.2 : .7); break;
    case 'star': c.save(); c.translate(x, y); c.rotate(a * TAU); c.scale(1 + ph * .25, 1 + ph * .25); goldStar(c, 0, 0, s * .9, t, face); c.restore(); break;
    case 'moon': drawPlanet(c, MOON_P, x, y - Math.abs(Math.sin(a * Math.PI * 2)) * s * .35, s * .72, t, withFace); break;
    case 'sun': c.save(); c.translate(x, y); c.scale(1 + ph * .28, 1 + ph * .28); drawSun(c, 0, 0, s * .55, t + a * 4, withFace); c.restore(); break;
    case 'planet': drawPlanet(c, PLANETS[2], x, y, s * .72, t + a * 9, withFace); break;
    case 'astronaut': drawAstronaut(c, x, y, s * .85, t, ph); break;
    case 'comet': drawComet(c, x + s * .35 + Math.sin(a * TAU) * s * .45, y - s * .15 - Math.sin(a * TAU) * s * .3, s * .75, t, ph); break;
    case 'telescope': drawTelescope(c, x, y - s * .2, s * .85, ph); break;
    case 'satellite': c.save(); c.translate(x, y); c.rotate(a * TAU); drawSatellite(c, 0, 0, s * .72, t); c.restore(); break;
    case 'ring': drawRingArt(c, x, y, s * .72, t * .6 + a * 7); break;
  }
}

export { BANDS, CRATERS, EARTH_CLOUD, EARTH_LAND, EARTH_SAND, MARS_DARK, bands, cachedGrad, drawAstronaut, drawComet, drawFace, drawPlanet, drawPosArrow, drawRingArt, drawRocket, drawSatellite, drawSlotFrame, drawStar, drawSun, drawTelescope, drawWhale, drawWordArt, features, goldStar, gradCache, label, lastTap, ring, roundRect, surface, tapGate };
