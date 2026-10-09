import { chime, pop, whoosh } from '../audio/audio.js';
import { say } from '../audio/speech.js';
import { PACKS } from '../content/packs.js';
import { TAU, clamp, ease } from '../core/util.js';
import { drawPlanet, drawRocket, roundRect } from '../engine/art.js';
import { Body } from '../engine/body.js';
import { COLORS, burst, sparkle, trail } from '../engine/particles.js';
import { H, W, camX, cx, setCamX } from '../engine/stage.js';
import { after } from '../engine/timers.js';
import { MOON_P, PLANETS, SUN } from '../engine/world.js';
import { fontFor, lookup, plabel, t } from '../i18n/i18n.js';
import { childName, isMastered, isPending, isPlaced, playable } from '../progress/progress.js';
import { setMode } from './router.js';

// The Space Map: a scrolling solar system where every planet is a station. Tap a station and the
// rocket flies there, says what we'll do ("Mars! Let's program the rover!"), then the session starts.
// Each level she masters adds a little moon orbiting that station and lights a segment of its ring.
// No reading needed: stations speak their names, pictures show the activity, and the Playground
// (the original six games) sits right next to the Sun.
//
// Stations come from each curriculum level's `station`; one with nothing playable yet sleeps ("Soon!").
// start(sub): '' | '<station>' (rocket waits there) | 'lit.<station>' (a new moon pops in)














const ORDER = ['playground', 'mercury', 'venus', 'earth', 'moon', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const levelsAt = id => PACKS.flatMap(p => p.levels.map(l => ({ p, l }))).filter(x => x.l.station === id);
let welcomed = false;
const MOON_P_STATION = { ...MOON_P, id: 'moon' };
const loadAt = () => { try { return localStorage.getItem('planet-parade-hub-at') || 'playground'; } catch (e) { return 'playground'; } };
const saveAt = id => { try { localStorage.setItem('planet-parade-hub-at', id); } catch (e) {} };

export function HubMode() {
  let stations = [], sun = null, rk = { x: 0, y: 0, ang: -.2 }, at = loadAt(), fly = null, drag = null, launching = false, litPop = null, worldW = 0;
  function build() {
    stations = ORDER.map(id => {
      const planet = id === 'moon' ? MOON_P_STATION : PLANETS.find(p => p.id === id), here = levelsAt(id);
      const b = new Body(planet || SUN, 0, 0, 40);
      const open = here.some(x => playable(x.p, x.l));
      return { id, planet, here, body: b, sleeping: id !== 'playground' && !open, moonA: Math.random() * TAU };
    });
    sun = new Body(SUN, 0, 0, 60);
  }
  function layout() {
    if (!sun) return; // the router lays out before start()
    const R = clamp(Math.min(H * .13, W * .14), 50, 96), spacing = Math.max(W * .2, R * 3.1);
    sun.R = clamp(H * .3, 110, 260); sun.x = sun.tx = -sun.R * .3; sun.y = sun.ty = H * .55;
    stations.forEach((s, i) => {
      const k = s.id === 'moon' ? .62 : s.planet ? (s.planet.id === 'jupiter' ? 1.25 : s.planet.id === 'saturn' ? 1.05 : .9 + .1 * s.planet.r) : .95;
      s.R = R * k; s.x = sun.R * .9 + R * 1.6 + i * spacing; s.y = H * .56 + Math.sin(i * 1.25 + .4) * H * .13;
      s.body.R = s.R; s.body.x = s.body.tx = s.x; s.body.y = s.body.ty = s.y;
    });
    worldW = stations[stations.length - 1].x + R * 3;
    const s = stations.find(q => q.id === at) || stations[0];
    if (!fly) { const p = park(s); rk.x = p.x; rk.y = p.y; }
    setCamX(clamp(s.x - W / 2, 0, Math.max(0, worldW - W)));
  }
  const park = s => ({ x: s.x - s.R * 1.35, y: s.y - s.R * .9 });
  function station(x, y) { return stations.find(s => Math.hypot(x - s.x, y - s.y) < Math.max(s.R * 1.3, 56)); }
  function arrive(s) {
    at = s.id; saveAt(at); s.body.bounce(5); chime(523.25);
    if (s.sleeping) { s.body.wiggle(); say(t('stations.sleeping')); return; }
    launching = true;
    say(t(`stations.${s.id}`), { onend: () => after(.2, go) });
    after(4, go); // never wait forever for a voice
    function go() { if (!launching) return; launching = false; if (s.id === 'playground') setMode('freeplay'); else setMode('play', `station:${s.id}`); }
  }
  function flyTo(s) {
    if (fly || launching) return;
    const p = park(s);
    if (Math.hypot(p.x - rk.x, p.y - rk.y) < 10) { arrive(s); return; }
    fly = { s, t: 0, x0: rk.x, y0: rk.y, dur: clamp(Math.abs(p.x - rk.x) / (W * .9), .8, 2.2) }; whoosh(fly.dur); pop();
  }
  return {
    start(sub = '') {
      build();
      const [a, b] = String(sub).split('.');
      if (a === 'lit' && b) { const s = stations.find(q => q.id === b); if (s) { at = s.id; saveAt(at); litPop = { s, t: 0 }; } }
      else if (a) { const s = stations.find(q => q.id === a); if (s) { at = s.id; saveAt(at); } }
      layout();
      if (litPop) after(.6, () => { const s = litPop.s; burst(s.x, s.y - s.R, 40, COLORS, 1); chime(783.99); s.body.bounce(6); });
      if (!welcomed) { welcomed = true; after(.5, () => { const name = childName(); say(name ? t('hub.welcomeName', { name }) : t('hub.welcome')); }); }
    },
    layout,
    repeat() { const name = childName(); say(name ? t('hub.welcomeName', { name }) : t('hub.welcome')); },
    // tap = press; the action happens on release so a drag can scroll the map instead
    tap(x, y) { drag = { x0: x - camX, cam0: camX, moved: false, wx: x, wy: y }; },
    move(sx) { if (!drag) return; const dx = sx - drag.x0; if (Math.abs(dx) > 12) drag.moved = true; if (drag.moved) setCamX(clamp(drag.cam0 - dx, 0, Math.max(0, worldW - W))); },
    up() {
      if (!drag) return;
      const d = drag; drag = null;
      if (d.moved) return;
      const s = station(d.wx, d.wy);
      if (s) flyTo(s); else sparkle(d.wx, d.wy, 5);
    },
    update(dt) {
      sun.update(dt); stations.forEach(s => { s.body.update(dt); s.moonA += dt * .6; });
      if (litPop) litPop.t += dt;
      if (fly) {
        fly.t += dt / fly.dur;
        const e = ease(Math.min(1, fly.t)), p = park(fly.s), u = 1 - e;
        const qx = (fly.x0 + p.x) / 2, qy = Math.min(fly.y0, p.y) - H * .25;
        rk.x = u * u * fly.x0 + 2 * u * e * qx + e * e * p.x; rk.y = u * u * fly.y0 + 2 * u * e * qy + e * e * p.y;
        rk.ang = Math.atan2(2 * u * (qy - fly.y0) + 2 * e * (p.y - qy), 2 * u * (qx - fly.x0) + 2 * e * (p.x - qx));
        trail(rk.x - Math.cos(rk.ang) * 20, rk.y - Math.sin(rk.ang) * 20);
        if (!drag) setCamX(camX + (clamp(rk.x - W * .45, 0, Math.max(0, worldW - W)) - camX) * Math.min(1, dt * 3));
        if (fly.t >= 1) { const s = fly.s; fly = null; rk.ang = -.2; arrive(s); }
      } else rk.ang += (-.2 - rk.ang) * Math.min(1, dt * 3);
    },
    draw(tt) {
      const c = cx;
      sun.draw(c, tt);
      // the flight path joining the stations
      c.save(); c.setLineDash([8, 14]); c.lineDashOffset = -tt * 20; c.strokeStyle = 'rgba(159,180,255,.28)'; c.lineWidth = 4;
      c.beginPath(); stations.forEach((s, i) => { if (i === 0) c.moveTo(s.x, s.y); else { const p = stations[i - 1]; c.quadraticCurveTo((p.x + s.x) / 2, Math.min(p.y, s.y) - 60, s.x, s.y); } }); c.stroke(); c.restore();
      stations.forEach(s => drawStation(c, s, tt, litPop && litPop.s === s ? litPop.t : 99));
      drawRocket(c, rk.x, rk.y + (fly ? 0 : Math.sin(tt * 2) * 5), clamp(H * .05, 26, 40), rk.ang, tt, fly ? 1 : .35);
    },
  };
}

// ---------- drawing a station ----------
function drawStation(c, s, tt, litT) {
  const { x, y, R } = s;
  if (s.id === 'playground') drawPlayground(c, x, y, R, tt);
  else if (s.sleeping) { s.body.sleep = true; c.save(); c.globalAlpha = .75; s.body.draw(c, tt); c.restore(); }
  else s.body.draw(c, tt);
  if (s.here.length) {
    const n = s.here.length;
    // ring of level segments: mastered glow gold, pending (one good visit, waiting for another day)
    // a brighter gold, placed (starting point / probe) a soft gold
    for (let i = 0; i < n; i++) {
      const a0 = -Math.PI / 2 + i / n * TAU + .06, a1 = -Math.PI / 2 + (i + 1) / n * TAU - .06, id = s.here[i].l.id;
      c.beginPath(); c.arc(x, y, R * 1.28, a0, a1); c.lineWidth = 7; c.lineCap = 'round';
      c.strokeStyle = isMastered(id) ? '#ffc93c' : isPending(id) ? 'rgba(255,201,60,.65)' : isPlaced(id) ? 'rgba(255,201,60,.35)' : 'rgba(255,255,255,.14)'; c.stroke();
    }
    // a moon for every mastered level (placed levels add none; the newest pops in)
    const moons = s.here.filter(x => isMastered(x.l.id)).length;
    for (let i = 0; i < moons; i++) {
      const a = s.moonA + i / Math.max(1, moons) * TAU, isNew = i === moons - 1 && litT < 1.2, k = isNew ? ease(Math.min(1, litT / 1.2)) : 1;
      const mx = x + Math.cos(a) * R * 1.62, my = y + Math.sin(a) * R * .55;
      drawPlanet(c, MOON_P, mx, my, R * .15 * k, tt, {});
    }
    drawBadge(c, s.id, x + R * .95, y - R * 1.05, clamp(R * .34, 20, 32), tt);
  }
  const name = s.id === 'playground' ? '' : s.id === 'moon' ? lookup('planets.moon.label') : plabel(s.planet);
  if (name) { c.fillStyle = 'rgba(246,242,255,.8)'; c.font = `800 ${clamp(R * .3, 13, 22)}px ${fontFor()}`; c.textAlign = 'center'; c.textBaseline = 'top'; c.fillText(name, x, y + R * 1.45); }
}
function drawPlayground(c, x, y, R, tt) {
  // a friendly space station: a ring, a hub, solar wings, and a slide peeking out
  c.save(); c.translate(x, y); c.rotate(Math.sin(tt * .5) * .08);
  c.strokeStyle = '#9fb4ff'; c.lineWidth = R * .16; c.beginPath(); c.ellipse(0, 0, R * .95, R * .38, 0, 0, TAU); c.stroke();
  c.fillStyle = '#3b6fd6'; for (const sd of [-1, 1]) c.fillRect(sd > 0 ? R * .95 : -R * 1.6, -R * .16, R * .65, R * .32);
  const g = c.createRadialGradient(-R * .15, -R * .2, R * .05, 0, 0, R * .55); g.addColorStop(0, '#fff3b0'); g.addColorStop(1, '#ff7eb6');
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, R * .5, 0, TAU); c.fill();
  c.fillStyle = '#6ef0c2'; c.beginPath(); c.arc(0, -R * .08, R * .16, 0, TAU); c.fill();
  c.fillStyle = '#ffc93c'; for (let i = 0; i < 5; i++) { const a = tt * 1.5 + i * TAU / 5; c.beginPath(); c.arc(Math.cos(a) * R * .95, Math.sin(a) * R * .38, R * .06, 0, TAU); c.fill(); }
  c.restore();
}
// Little pictures of each activity, so the map needs no reading.
function drawBadge(c, id, x, y, r, tt) {
  c.save(); c.translate(x, y);
  c.fillStyle = 'rgba(22,29,79,.95)'; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
  c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,.45)'; c.stroke();
  c.strokeStyle = '#f6f2ff'; c.fillStyle = '#ffc93c'; c.lineWidth = 2.5; c.lineCap = 'round';
  const s = r * .62;
  if (id === 'mercury') { for (let i = 0; i < 10; i++) { const cx0 = -s + (i % 5) * s * .5, cy0 = -s * .3 + Math.floor(i / 5) * s * .6; c.strokeRect(cx0 - s * .2, cy0 - s * .22, s * .4, s * .44); if (i < 6) { c.beginPath(); c.arc(cx0, cy0, s * .13, 0, TAU); c.fill(); } } }
  else if (id === 'jupiter') { c.beginPath(); c.moveTo(-s, s * .3); c.lineTo(s, s * .3); c.stroke(); for (let i = 0; i <= 4; i++) { c.beginPath(); c.moveTo(-s + i * s * .5, s * .15); c.lineTo(-s + i * s * .5, s * .45); c.stroke(); } c.beginPath(); c.arc(-s * .5, -s * .1, s * .5, Math.PI, 0); c.stroke(); }
  else if (id === 'venus') { c.beginPath(); c.moveTo(0, s * .7); c.lineTo(0, -s * .5); c.moveTo(-s, -s * .3); c.lineTo(s, -s * .6); c.stroke(); c.beginPath(); c.arc(-s * .8, s * .05, s * .3, 0, Math.PI); c.fill(); c.beginPath(); c.arc(s * .8, -s * .25, s * .3, 0, Math.PI); c.fill(); }
  else if (id === 'saturn') { ['#ff7eb6', '#5ea8ff', '#ff7eb6'].forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.arc(-s * .7 + i * s * .7, 0, s * .28, 0, TAU); c.fill(); }); }
  else if (id === 'earth' || id === 'moon') { c.fillStyle = '#8f7fd6'; c.beginPath(); c.ellipse(0, s * .35, s * .9, s * .35, 0, 0, TAU); c.fill(); c.fillStyle = '#ffc93c'; c.beginPath(); c.arc(-s * .3, -s * .25, s * .22, 0, TAU); c.fill(); c.fillStyle = '#cfccc6'; c.beginPath(); c.arc(s * .35, -s * .2, s * .22, 0, TAU); c.fill(); }
  else if (id === 'mars') { c.fillStyle = '#e8ecff'; roundRect(c, -s * .6, -s * .25, s * 1.2, s * .55, 5); c.fill(); c.fillStyle = '#2b3a8f'; for (const sx of [-.45, 0, .45]) { c.beginPath(); c.arc(sx * s, s * .38, s * .16, 0, TAU); c.fill(); } c.fillStyle = '#6ef0c2'; c.beginPath(); c.moveTo(0, -s * .85); c.lineTo(s * .3, -s * .45); c.lineTo(-s * .3, -s * .45); c.closePath(); c.fill(); }
  else if (id === 'uranus') { c.fillStyle = '#9fe3e6'; c.beginPath(); c.ellipse(-s * .25, s * .45, s * .28, s * .2, -.4, 0, TAU); c.fill(); c.strokeStyle = '#9fe3e6'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, s * .42); c.lineTo(0, -s * .7); c.lineTo(s * .5, -s * .45); c.stroke(); }
  else if (id === 'neptune') { c.fillStyle = '#f6f2ff'; c.font = `800 ${s * 1.1}px ${fontFor()}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('Aa', 0, s * .05); }
  c.restore();
}

export { MOON_P_STATION, ORDER, drawBadge, drawPlayground, drawStation, levelsAt, loadAt, saveAt, welcomed };
