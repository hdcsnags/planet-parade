import { chime, whoosh } from '../audio/audio.js';
import { say } from '../audio/speech.js';
import { logUse } from '../core/settings.js';
import { TAU, clamp, ease, pick, randInt, shuffle } from '../core/util.js';
import { drawRocket } from '../engine/art.js';
import { drawButton, drawTile, hitButton, hitTile, layoutTiles, makeButton, makeTile, stepTiles } from '../engine/components.js';
import { sparkle, trail } from '../engine/particles.js';
import { H, W, cx } from '../engine/stage.js';
import { Template } from '../engine/template.js';
import { after } from '../engine/timers.js';
import { SCALE } from '../engine/world.js';
import { bang, cap, fmt, fontFor, num, t } from '../i18n/i18n.js';

// Number line: the rocket hops along 0…max. Count on, add and subtract by hopping, predict the
// landing spot, and skip counting (by 2s, 5s, 10s).
// params: op 'hop' | 'add' | 'sub' | 'skip', max, maxStep, predict (answer with tiles first),
//         step (skip size), choices
// The line runs left-to-right in every language: it is a number line, not reading order.













export class NumberLine extends Template {
  makeRound() {
    const p = this.p, max = p.max || 10, ms = p.maxStep || 3;
    const op = this.op = p.op === 'mix' ? pick(['add', 'sub']) : p.op;
    this.max = max; this.tiles = []; this.hops = 0; this.hopAnim = null; this.phase = 'hop';
    if (op === 'hop') { this.a = 0; this.b = randInt(2, Math.min(ms, max)); this.dir = 1; this.ask(t('tpl.numberline.hopN', { n: num(this.b) })); }
    else if (op === 'add') { this.b = randInt(1, ms); this.a = randInt(0, max - this.b); this.dir = 1; }
    else if (op === 'sub') { this.b = randInt(1, ms); this.a = randInt(this.b, max); this.dir = -1; }
    else { // skip counting
      this.s = p.step || 2; this.a = 0; this.dir = 1; this.b = Math.floor(max / this.s);
      if (p.predict) { this.b = randInt(2, Math.max(2, Math.floor(max / this.s) - 1)); }
    }
    this.pos = this.a; this.result = op === 'skip' ? this.a + this.b * (this.s || 1) : this.a + this.dir * this.b;
    if (op === 'add' || op === 'sub') {
      if (p.predict) { this.phase = 'predict'; this.makeTiles(this.result); this.ask(t(op === 'add' ? 'tpl.numberline.predictAdd' : 'tpl.numberline.predictSub', { a: cap(num(this.a)), b: num(this.b) })); }
      else this.ask(t(op === 'add' ? 'tpl.numberline.startHop' : 'tpl.numberline.startBack', { a: num(this.a), b: num(this.b) }));
    }
    if (op === 'skip') {
      if (p.predict) {
        this.pos = this.b * this.s; this.phase = 'predict';
        const list = [1, 2, 3].map(k => this.pos - (3 - k) * this.s).filter(v => v >= 0).map(v => fmt(v)).join(', ');
        this.result = this.pos + this.s; this.makeTiles(this.result, this.s);
        this.ask(t('tpl.numberline.skipNext', { list }));
      } else this.ask(t('tpl.numberline.skipGo', { s: num(this.s) }));
    }
    this.hopBtn = makeButton('hop', { hidden: this.phase === 'predict' });
  }
  makeTiles(ans, spread = 1) {
    const n = this.p.choices || 2, opts = new Set([ans]);
    for (let d = 1; opts.size < n && d < 10; d++) { if (ans + d * spread <= this.max) opts.add(ans + d * spread); if (opts.size < n && ans - d * spread >= 0) opts.add(ans - d * spread); }
    this.tiles = shuffle([...opts]).map(v => makeTile(v));
  }
  xOf(v) { return this.x0 + (v / this.max) * (this.x1 - this.x0); }
  layout() {
    this.x0 = 48; this.x1 = W - 48; this.ly = this.tiles.length ? H * .56 : H * .62;
    this.hopBtn.r = clamp(Math.min(W, H) * .07, 40, 56); this.hopBtn.x = W / 2; this.hopBtn.y = H - this.hopBtn.r - 24;
    layoutTiles(this.tiles, W / 2, H * .84, clamp(H * .15, 84, 130), W - 48);
  }
  hop() {
    if (this.hopAnim) return;
    const step = this.op === 'skip' ? this.s : 1, to = this.pos + this.dir * step;
    if (to < 0 || to > this.max) return;
    this.hopAnim = { from: this.pos, to, t: 0 }; whoosh(.4);
  }
  landed() {
    this.hops++;
    const n = this.pos, done = Math.abs(this.pos - this.result) < .01; // every mode ends on the answer
    chime(SCALE[Math.min(8, this.hops)]); sparkle(this.xOf(n), this.ly - 40, 8); logUse('nums', n);
    if (!done) { say(cap(this.op === 'skip' ? fmt(n) : num(this.hops)) + bang()); if (this.phase === 'auto') after(.35, () => this.hop()); return; }
    const x = this.xOf(n), y = this.ly - 60;
    if (this.op === 'hop') this.win(t('tpl.numberline.landed', { n: fmt(n) }), x, y);
    else if (this.op === 'add') this.win(t('tpl.numberline.addSay', { a: cap(num(this.a)), b: num(this.b), c: fmt(this.result) }), x, y);
    else if (this.op === 'sub') this.win(t('tpl.numberline.subSay', { a: cap(num(this.a)), b: num(this.b), c: fmt(this.result) }), x, y);
    else this.win(this.p.predict ? t('countYes', { a: fmt(n) }) : t('tpl.numberline.skipDone', { s: num(this.s) }), x, y);
  }
  onTap(x, y) {
    if (this.phase === 'predict') {
      const tl = hitTile(this.tiles, x, y);
      if (!tl) return;
      if (tl.n === this.result) {
        tl.sv = 6; this.tiles.forEach(q => { if (q !== tl) q.fade = true; });
        this.phase = 'auto'; if (this.op === 'skip') this.pos = this.result - this.s;
        this.hop();
      } else { tl.wob = 1; this.miss(cap(fmt(tl.n)) + bang()); }
      return;
    }
    if (hitButton([this.hopBtn], x, y) || y > this.ly - 140) this.hop();
  }
  step(dt) {
    stepTiles(this.tiles, dt);
    if (this.hint) { const g = this.tiles.find(q => q.n === this.result); if (g) g.glow = 1; this.hopBtn.glow = 1; }
    if (this.hopAnim) {
      const a = this.hopAnim; a.t += dt / .55;
      const e = ease(Math.min(1, a.t)); this.pos = a.from + (a.to - a.from) * e;
      trail(this.xOf(this.pos) - 10, this.ly - 40 - Math.sin(e * Math.PI) * 70);
      if (a.t >= 1) { this.pos = a.to; this.hopAnim = null; this.landed(); }
    }
  }
  render(tt) {
    const c = cx, max = this.max, big = max > 20, every = big ? 10 : 1, lw = 6;
    c.save();
    c.strokeStyle = '#9fb4ff'; c.lineWidth = lw; c.lineCap = 'round';
    c.beginPath(); c.moveTo(this.x0 - 14, this.ly); c.lineTo(this.x1 + 14, this.ly); c.stroke();
    const fs = clamp((this.x1 - this.x0) / (max / every) * .45, 12, 30);
    c.font = `800 ${fs}px ${fontFor()}`; c.textAlign = 'center'; c.textBaseline = 'top';
    for (let v = 0; v <= max; v += big ? 5 : 1) {
      const x = this.xOf(v), major = v % every === 0;
      c.strokeStyle = major ? '#f6f2ff' : 'rgba(246,242,255,.4)'; c.lineWidth = major ? 4 : 2;
      c.beginPath(); c.moveTo(x, this.ly - (major ? 14 : 8)); c.lineTo(x, this.ly + (major ? 14 : 8)); c.stroke();
      if (major) {
        const reached = this.op === 'skip' ? v % this.s === 0 && v <= this.pos + .01 && v > 0 : false;
        c.fillStyle = reached ? '#6ef0c2' : Math.abs(v - this.pos) < .5 ? '#ffc93c' : 'rgba(246,242,255,.85)';
        c.fillText(fmt(v), x, this.ly + 20);
      }
    }
    // start flag
    if (this.op === 'add' || this.op === 'sub') { c.fillStyle = '#ff7eb6'; c.beginPath(); c.arc(this.xOf(this.a), this.ly, 9, 0, TAU); c.fill(); }
    const hopT = this.hopAnim ? ease(Math.min(1, this.hopAnim.t)) : 0;
    const rx = this.xOf(this.pos), ry = this.ly - 44 - Math.sin(hopT * Math.PI) * 70;
    drawRocket(c, rx, ry, clamp(Math.min(W, H) * .075, 34, 64), -Math.PI / 2 + (this.hopAnim ? this.dir * .5 * Math.cos(hopT * Math.PI) : 0), tt, this.hopAnim ? 1 : .3);
    c.restore();
    this.tiles.forEach(tl => { if (!tl.fade) drawTile(c, tl, tt); });
    drawButton(c, this.hopBtn, tt, '#6ef0c2', (g, r) => {
      g.strokeStyle = '#0a0e2a'; g.lineWidth = r * .16; g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath(); g.arc(0, r * .25, r * .5, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
      const d = this.dir; g.beginPath(); g.moveTo(d * r * .48, r * .05); g.lineTo(d * r * .5, r * .32); g.lineTo(d * r * .24, r * .26); g.stroke();
    });
  }
}
