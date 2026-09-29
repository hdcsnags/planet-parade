import { fanfare } from '../audio/audio.js';
import { TAU, clamp } from '../core/util.js';
import { LANG, fmt, fontFor } from '../i18n/i18n.js';
import { drawPlanet, drawRocket, drawStar, goldStar, roundRect } from './art.js';
import { spring } from './body.js';
import { COLORS, burst } from './particles.js';
import { MOON_P } from './world.js';

// Shared pieces every template uses: space objects with kind / colour / size, big numeral tiles,
// the counting track, round buttons, and the one shared celebration.








export const PALETTE = {
  gold: ['#fff3b0', '#ffc93c', '#f08a1c'],
  pink: ['#ffd1e6', '#ff7eb6', '#c2407a'],
  blue: ['#cfe3ff', '#5ea8ff', '#2b5fc0'],
  green: ['#d2ffef', '#6ef0c2', '#23a37c'],
};
const face = { face: true, blink: 1, happy: true, look: { x: 0, y: 0 } };

// A space object: { kind: 'star'|'moon'|'rocket'|'ball', color, size: 'big'|'small' }
export function drawObj(c, o, x, y, r, t, opts = {}) {
  const k = o.size === 'small' ? .62 : 1, R = r * k, col = PALETTE[o.color || 'gold'] || PALETTE.gold;
  c.save();
  if (o.kind === 'star') {
    if (!o.color || o.color === 'gold') goldStar(c, x, y, R, t, opts.faces === false ? null : face);
    else {
      const g = c.createRadialGradient(x - R * .2, y - R * .3, R * .1, x, y, R);
      g.addColorStop(0, col[0]); g.addColorStop(.6, col[1]); g.addColorStop(1, col[2]);
      c.fillStyle = g; drawStar(c, x, y, R, 0);
    }
  } else if (o.kind === 'rocket') drawRocket(c, x, y, R, -Math.PI / 2, t, .3);
  else if (o.kind === 'moon' && (!o.color || o.color === 'gold')) drawPlanet(c, MOON_P, x, y, R * .8, t, opts.faces === false ? {} : face);
  else drawPlanet(c, { id: `ball-${o.color || 'gold'}`, r: 1, light: col[0], base: col[1], dark: col[2] }, x, y, R * .8, t, opts.faces === false ? {} : face);
  c.restore();
}

// Big answer tile with a numeral (and optional dots). Tiles spring in; `wob` wiggles a wrong pick.
export const makeTile = (n, extra = {}) => ({ n, x: 0, y: 0, w: 10, h: 10, scale: .01, sv: 0, wob: 0, glow: 0, ...extra });
export function layoutTiles(tiles, cxp, cyp, h, maxW) {
  const tw = Math.min(maxW / tiles.length - 24, h * 1.3);
  tiles.forEach((tl, i) => { tl.w = tw; tl.h = h; tl.x = cxp + (i - (tiles.length - 1) / 2) * (tw + 24); tl.y = cyp; });
}
export const hitTile = (tiles, x, y) => tiles.find(q => Math.abs(x - q.x) < q.w / 2 + 6 && Math.abs(y - q.y) < q.h / 2 + 6);
export function stepTiles(tiles, dt) { tiles.forEach(tl => { spring(tl, dt); tl.wob = Math.max(0, tl.wob - dt * 1.6); }); }
export function drawTile(c, tl, t, { dots = false, label = null } = {}) {
  const s = Math.max(.001, tl.scale), w = tl.w, h = tl.h;
  c.save(); c.translate(tl.x, tl.y); c.rotate(Math.sin(t * 28) * .1 * tl.wob); c.scale(s, s);
  if (tl.glow) { c.shadowColor = 'rgba(110,240,194,.9)'; c.shadowBlur = 22 + 10 * Math.sin(t * 5); }
  roundRect(c, -w / 2, -h / 2, w, h, h * .22);
  c.fillStyle = 'rgba(22,29,79,.95)'; c.fill(); c.shadowBlur = 0;
  c.lineWidth = 4; c.strokeStyle = tl.glow ? `rgba(110,240,194,${.6 + .4 * Math.sin(t * 5)})` : 'rgba(255,255,255,.3)'; c.stroke();
  c.fillStyle = '#ffc93c'; c.font = `800 ${h * (dots ? .42 : .55)}px ${fontFor()}`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(label ?? fmt(tl.n), 0, dots ? -h * .13 : h * .02);
  if (dots) {
    // dots under the numeral, or (dots-only cards, label '') big and centred
    const only = label === '', n = tl.n, perRow = Math.min(n, 5), rows = Math.ceil(n / 5);
    const dr = only ? Math.min(h * .11, w / (perRow * 2.7)) : Math.min(h * .065, w / (perRow * 2.8)), cy0 = only ? 0 : h * .24;
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / 5), col = i % 5, inRow = Math.min(5, n - row * 5);
      c.fillStyle = '#6ef0c2'; c.beginPath(); c.arc((col - (inRow - 1) / 2) * dr * 2.7, cy0 + (row - (rows - 1) / 2) * dr * 2.6, dr, 0, TAU); c.fill();
    }
  }
  c.restore();
}

// Round icon button (palette, GO, hop). `icon(c, r)` draws inside, centred at 0,0.
export const makeButton = (id, extra = {}) => ({ id, x: 0, y: 0, r: 40, scale: 1, sv: 0, glow: 0, ...extra });
export const hitButton = (btns, x, y) => btns.find(b => !b.hidden && Math.hypot(x - b.x, y - b.y) < b.r + 10);
export function drawButton(c, b, t, fill, icon) {
  if (b.hidden) return;
  const s = Math.max(.001, b.scale);
  c.save(); c.translate(b.x, b.y); c.scale(s, s);
  if (b.glow) { c.shadowColor = 'rgba(110,240,194,.95)'; c.shadowBlur = 20 + 10 * Math.sin(t * 5); }
  c.fillStyle = fill; c.beginPath(); c.arc(0, 0, b.r, 0, TAU); c.fill(); c.shadowBlur = 0;
  c.lineWidth = 3; c.strokeStyle = b.glow ? '#6ef0c2' : 'rgba(255,255,255,.3)'; c.stroke();
  icon(c, b.r);
  c.restore();
}

// Counting track: `n` slots that fill with a picture as she counts (right-to-left in Farsi: reading
// order only, it is a count, not a left/right answer).
export function drawCountTrack(c, { n, filled, kind = 'star', x, y, maxW, t, next = true }) {
  if (!n) return;
  let per = n, r = clamp(maxW / (n * 2.3), 16, 26);
  if (n * r * 2.3 > maxW) { per = Math.ceil(n / 2); r = clamp(maxW / (per * 2.3), 16, 26); }
  const rows = Math.ceil(n / per), gap = r * 2.3;
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / per), col = i % per, inRow = Math.min(per, n - row * per);
    let px = x + (col - (inRow - 1) / 2) * gap;
    if (LANG === 'fa') px = x - (px - x);
    const py = y + (row - (rows - 1) / 2) * gap;
    c.save();
    if (i < filled) {
      c.fillStyle = 'rgba(110,240,194,.28)'; c.beginPath(); c.arc(px, py, r, 0, TAU); c.fill();
      c.lineWidth = 3; c.strokeStyle = '#6ef0c2'; c.stroke();
      drawObj(c, { kind }, px, py, r * .72, t, { faces: false });
    } else {
      c.setLineDash([5, 6]); c.lineWidth = 3;
      c.strokeStyle = i === filled && next ? `rgba(110,240,194,${.5 + .4 * Math.sin(t * 5)})` : 'rgba(255,255,255,.34)';
      c.beginPath(); c.arc(px, py, r, 0, TAU); c.stroke();
    }
    c.restore();
  }
}

// The one shared "yes!" moment.
export function celebrate(x, y, power = 1) { fanfare(); burst(x, y, Math.round(40 * power), COLORS, 1.1 * power); }

export { face };
