import { chime, pop } from '../audio/audio.js';
import { say } from '../audio/speech.js';
import { logUse } from '../core/settings.js';
import { TAU, clamp, rand, randInt, shuffle } from '../core/util.js';
import { drawFace, roundRect } from '../engine/art.js';
import { drawObj, drawTile, hitTile, layoutTiles, makeTile, stepTiles } from '../engine/components.js';
import { gridFit } from '../engine/layout.js';
import { sparkle } from '../engine/particles.js';
import { H, W, cx } from '../engine/stage.js';
import { Template } from '../engine/template.js';
import { SCALE } from '../engine/world.js';
import { bang, cap, fmt, fontFor, num, t } from '../i18n/i18n.js';

// Counting tray (the basic Number steps): one-to-one "give", tap-counting, and choosing the total.
//   give:  "Give each astronaut one helmet!" Tap an astronaut: a helmet pops on. A second tap on the
//          same astronaut never gives two ("This one already has a helmet.")
//   count: tap each moon rock once (a repeated tap says its number again, never recounts); when all
//          are counted, pick the total from dot cards or numerals.
// params: mode 'give'|'count', n [min,max], recipients [min,max], choices, answer 'dots'|'numeral',
//         layout 'line'|'rows'|'scatter'













export class CountingTray extends Template {
  makeRound() {
    const p = this.p; this.mode = p.mode || 'count'; this.tiles = []; this.done = 0;
    if (this.mode === 'give') {
      const [lo, hi] = p.recipients || p.n || [1, 3]; this.k = randInt(lo, hi);
      this.things = Array.from({ length: this.k }, () => ({ has: false, sv: 0, scale: 1 }));
      this.ask(t('tpl.tray.give'));
    } else {
      const [lo, hi] = p.n || [1, 5]; this.k = randInt(lo, hi);
      let lay = p.layout || 'line'; if (this.transfer) lay = lay === 'scatter' ? 'rows' : 'scatter';
      this.lay = lay;
      this.things = Array.from({ length: this.k }, () => ({ counted: 0, sv: 0, scale: 1, jx: rand(-.3, .3), jy: rand(-.3, .3) }));
      this.ask(t('tpl.tray.count'));
    }
  }
  layout() {
    const top = Math.max(H * .27, 215), bottom = this.tiles.length ? H * .7 : H * .9, w = W - 64;
    const g = this.lay === 'line' || this.mode === 'give' ? Array.from({ length: this.k }, (_, i) => ({ x: 32 + w * (i + .5) / this.k, y: (top + bottom) / 2, s: Math.min(w / this.k, bottom - top) })) : gridFit(this.k, 32, top, w, bottom - top);
    this.things.forEach((o, i) => {
      const q = g[i], sc = this.lay === 'scatter' ? .5 : 0;
      o.x = q.x + (o.jx || 0) * q.s * sc; o.y = q.y + (o.jy || 0) * q.s * sc; o.r = Math.min(q.s * .32, this.mode === 'give' ? 120 : 64);
    });
    layoutTiles(this.tiles, W / 2, H * .85, clamp(H * .15, 84, 130), W - 48);
  }
  onTap(x, y) {
    if (this.tiles.length) {
      const tl = hitTile(this.tiles, x, y); if (!tl) return;
      if (tl.n === this.k) { tl.sv = 6; logUse('nums', this.k); this.win(t('countYes', { a: num(this.k) })); }
      else { tl.wob = 1; this.miss(cap(num(tl.n)) + bang()); }
      return;
    }
    const o = this.things.find(q => Math.hypot(x - q.x, y - q.y) < Math.max(q.r * 1.3, 48));
    if (!o) return;
    o.sv = 5;
    if (this.mode === 'give') {
      if (o.has) { this.miss(t('tpl.tray.hasOne')); return; }
      o.has = true; this.done++; pop(); chime(SCALE[Math.min(8, this.done)]); sparkle(o.x, o.y - o.r, 8);
      if (this.done === this.k) this.win(t('tpl.tray.allHave'), o.x, o.y);
      else say(cap(num(this.done)) + bang());
      return;
    }
    if (o.counted) { if (!this.p.quiet) say(cap(num(o.counted)) + bang(), { onend: this.restorePrompt }); return; } // never recount
    this.done++; o.counted = this.done; chime(SCALE[Math.min(8, this.done)]); sparkle(o.x, o.y - o.r, 6);
    if (!this.p.quiet) say(cap(num(this.done)) + bang(), { onend: this.restorePrompt }); // Challenge: she counts in her head
    if (this.done === this.k) {
      const p = this.p, opts = new Set([this.k]);
      for (let d = 1; opts.size < (p.choices || 2); d++) { opts.add(this.k + d); if (opts.size < (p.choices || 2) && this.k - d > 0) opts.add(this.k - d); }
      this.tiles = shuffle([...opts]).map(v => makeTile(v)); this.layout();
      this.ask(t('tpl.tray.pick'));
    }
  }
  explain() { if (this.tiles.length && this.mode !== 'give') this.together(this.k); }
  step(dt) {
    this.things.forEach(o => { o.sv += (-160 * (o.scale - 1) - 11 * o.sv) * dt; o.scale += o.sv * dt; });
    stepTiles(this.tiles, dt);
    if (this.hint) { const g = this.tiles.find(q => q.n === this.k); if (g) g.glow = 1; }
  }
  render(tt) {
    const c = cx;
    this.things.forEach(o => {
      const s = Math.max(.01, o.scale);
      c.save(); c.translate(o.x, o.y); c.scale(s, s);
      if (this.mode === 'give') drawCrew(c, o.r, o.has, tt);
      else {
        if (o.counted) { c.fillStyle = 'rgba(110,240,194,.25)'; c.beginPath(); c.arc(0, 0, o.r * 1.35, 0, TAU); c.fill(); }
        drawObj(c, { kind: 'moon' }, 0, 0, o.r, tt, { faces: false });
        if (o.counted) { const r = Math.max(15, o.r * .34); c.fillStyle = '#6ef0c2'; c.beginPath(); c.arc(0, -o.r * 1.15, r, 0, TAU); c.fill(); c.fillStyle = '#0a0e2a'; c.font = `800 ${r * 1.2}px ${fontFor()}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(fmt(o.counted), 0, -o.r * 1.15); }
        else if (this.hint) { c.strokeStyle = `rgba(110,240,194,${.5 + .4 * Math.sin(tt * 5)})`; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, o.r * 1.25, 0, TAU); c.stroke(); }
      }
      c.restore();
    });
    const dots = (this.p.answer || 'dots') === 'dots';
    this.tiles.forEach(tl => drawTile(c, tl, tt, { dots, label: dots ? '' : null }));
  }
}
// A little astronaut without a helmet; the helmet (a glass dome) pops on when given.
function drawCrew(c, r, has, tt) {
  c.fillStyle = '#e8ecff'; roundRect(c, -r * .5, -r * .1, r, r * 1.05, r * .3); c.fill();
  c.fillStyle = '#ff7eb6'; c.fillRect(-r * .16, r * .2, r * .32, r * .2);
  c.fillStyle = '#ffd7b5'; c.beginPath(); c.arc(0, -r * .45, r * .38, 0, TAU); c.fill();
  c.fillStyle = '#6b4a2b'; c.beginPath(); c.arc(0, -r * .62, r * .3, Math.PI, TAU); c.fill();
  c.save(); c.translate(0, -r * .38); drawFace(c, r * .34, { blink: 1, happy: has, look: { x: 0, y: 0 } }); c.restore();
  if (has) {
    c.fillStyle = 'rgba(159,210,255,.35)'; c.beginPath(); c.arc(0, -r * .45, r * .55, 0, TAU); c.fill();
    c.strokeStyle = '#e8ecff'; c.lineWidth = r * .08; c.stroke();
    c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(-r * .22, -r * .68, r * .1, r * .06, -.5, 0, TAU); c.fill();
  } else { c.strokeStyle = 'rgba(255,255,255,.35)'; c.setLineDash([6, 6]); c.lineWidth = 3; c.beginPath(); c.arc(0, -r * .45, r * .55, 0, TAU); c.stroke(); c.setLineDash([]); }
  void tt;
}

export { drawCrew };
