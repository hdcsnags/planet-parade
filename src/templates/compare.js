import { chime } from '../audio/audio.js';
import { say } from '../audio/speech.js';
import { TAU, clamp, pick, randInt, shuffle } from '../core/util.js';
import { roundRect } from '../engine/art.js';
import { drawObj, drawTile, hitTile, layoutTiles, makeTile, stepTiles } from '../engine/components.js';
import { gridFit } from '../engine/layout.js';
import { sparkle } from '../engine/particles.js';
import { H, W, cx } from '../engine/stage.js';
import { Template } from '../engine/template.js';
import { SCALE } from '../engine/world.js';
import { bang, cap, fmt, fontFor, num, t } from '../i18n/i18n.js';

// Compare on a balance scale: more / less with objects, make both sides equal, then numerals
// (bigger / smaller) and the biggest of three. The beam stays level until she answers, then tips to
// show why; in "make them equal" it tips live as she adds.
// params: mode 'more' | 'less' | 'equal' | 'bigger' | 'smaller' | 'biggest', max, minDiff, choices
// Left and right pans are the child's real screen left/right in every language (never mirrored).












const KINDS = ['star', 'moon', 'rocket'];
export class Compare extends Template {
  makeRound() {
    const p = this.p, max = p.max || 5, md = p.minDiff || 1;
    this.kind = pick(KINDS); this.tilt = 0; this.tiltTo = 0; this.reveal = false; this.tiles = [];
    let a, b; do { a = randInt(1, max); b = randInt(1, max); } while (Math.abs(a - b) < md);
    this.n = [a, b];
    if (p.mode === 'more') { this.answer = a > b ? 0 : 1; this.ask(t('tpl.compare.more')); }
    else if (p.mode === 'less') { this.answer = a < b ? 0 : 1; this.ask(t('tpl.compare.less')); }
    else if (p.mode === 'equal') { this.n = [Math.max(a, b), Math.min(a, b)]; this.answer = 1; this.tiltTo = this.beamFor(); this.ask(t('tpl.compare.equalAsk')); }
    else if (p.mode === 'bigger') { this.answer = a > b ? 0 : 1; this.ask(t('tpl.compare.bigger')); }
    else if (p.mode === 'smaller') { this.answer = a < b ? 0 : 1; this.ask(t('tpl.compare.smaller')); }
    else { // biggest of three, no scale
      const set = new Set(); while (set.size < (p.choices || 3)) set.add(randInt(1, max));
      this.tiles = shuffle([...set]).map(v => makeTile(v)); this.answer = Math.max(...set);
      this.ask(t('tpl.compare.biggest'));
    }
    this.numerals = p.mode === 'bigger' || p.mode === 'smaller';
  }
  beamFor() { const [a, b] = this.n; return clamp((b - a) * .06, -.28, .28); } // positive: right side down
  layout() {
    this.cxp = W / 2; this.top = Math.max(H * .3, 190); this.arm = Math.min(W * .34, 420); this.panW = Math.min(W * .32, 380); this.panH = Math.min(H * .34, 260);
    layoutTiles(this.tiles, W / 2, H * .6, clamp(H * .2, 100, 160), W - 48);
  }
  pan(i) { // pan centre (hanging from the beam end)
    const sgn = i === 0 ? -1 : 1, ang = this.tilt;
    const ex = this.cxp + sgn * this.arm * Math.cos(ang), ey = this.top + sgn * this.arm * Math.sin(ang);
    return { x: ex, y: ey + this.panH * .75, w: this.panW, h: this.panH };
  }
  onTap(x, y) {
    if (this.p.mode === 'biggest') {
      const tl = hitTile(this.tiles, x, y); if (!tl) return;
      if (tl.n === this.answer) { tl.sv = 6; this.win(t('tpl.compare.biggestYes', { a: cap(fmt(tl.n)) }), tl.x, tl.y); }
      else { tl.wob = 1; this.miss(cap(fmt(tl.n)) + bang()); }
      return;
    }
    const side = [0, 1].find(i => { const p = this.pan(i); return Math.abs(x - p.x) < p.w / 2 + 20 && y > p.y - p.h * .9 && y < p.y + p.h * .6; });
    if (side === undefined) return;
    if (this.p.mode === 'equal') {
      if (side === 0) { this.miss(t('tpl.compare.equalAsk')); return; }
      this.n[1]++; chime(SCALE[Math.min(8, this.n[1])]); this.tiltTo = this.beamFor();
      const pp = this.pan(1); sparkle(pp.x, pp.y - pp.h * .3, 6);
      if (this.n[1] === this.n[0]) this.win(t('tpl.compare.equalDone'), pp.x, pp.y - pp.h * .4);
      else say(cap(num(this.n[1])) + bang());
      return;
    }
    const pp = this.pan(side);
    if (side === this.answer) {
      this.reveal = true; this.tiltTo = this.beamFor();
      const [a, b] = this.n, me = this.n[side], other = this.n[1 - side];
      let line;
      if (this.p.mode === 'more') line = t('moreYes');
      else if (this.p.mode === 'less') line = t('tpl.compare.lessYes');
      else if (this.p.mode === 'bigger') line = t('tpl.compare.isBigger', { a: cap(fmt(me)), b: fmt(other) });
      else line = t('tpl.compare.isSmaller', { a: cap(fmt(me)), b: fmt(other) });
      this.win(line, pp.x, pp.y - pp.h * .4);
    } else {
      this.wobble = { side, t: 1 };
      this.miss(this.numerals ? cap(fmt(this.n[side])) + bang() : cap(num(this.n[side])) + bang());
    }
  }
  step(dt) {
    stepTiles(this.tiles, dt);
    this.tilt += (this.tiltTo - this.tilt) * Math.min(1, dt * 4);
    if (this.wobble) { this.wobble.t -= dt * 1.6; if (this.wobble.t <= 0) this.wobble = null; }
    if (this.hint && this.p.mode === 'biggest') { const g = this.tiles.find(q => q.n === this.answer); if (g) g.glow = 1; }
  }
  render(tt) {
    const c = cx;
    if (this.p.mode === 'biggest') { this.tiles.forEach(tl => drawTile(c, tl, tt)); return; }
    // stand + beam
    c.save(); c.lineCap = 'round';
    c.fillStyle = '#6c7bd6'; roundRect(c, this.cxp - 16, this.top, 32, H - this.top - 60, 10); c.fill();
    c.fillStyle = '#9fb4ff'; roundRect(c, this.cxp - 90, H - 76, 180, 30, 14); c.fill();
    c.translate(this.cxp, this.top); c.rotate(this.tilt);
    c.strokeStyle = '#ffc93c'; c.lineWidth = 14; c.beginPath(); c.moveTo(-this.arm, 0); c.lineTo(this.arm, 0); c.stroke();
    c.fillStyle = '#fff3b0'; c.beginPath(); c.arc(0, 0, 16, 0, TAU); c.fill();
    c.restore();
    for (const i of [0, 1]) {
      const p = this.pan(i), wob = this.wobble && this.wobble.side === i ? Math.sin(tt * 28) * 8 * this.wobble.t : 0;
      const sgn = i === 0 ? -1 : 1, ex = this.cxp + sgn * this.arm * Math.cos(this.tilt), ey = this.top + sgn * this.arm * Math.sin(this.tilt);
      c.save();
      c.strokeStyle = 'rgba(255,243,176,.7)'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(ex, ey); c.lineTo(p.x - p.w * .42 + wob, p.y - p.h * .25); c.moveTo(ex, ey); c.lineTo(p.x + p.w * .42 + wob, p.y - p.h * .25); c.stroke();
      const glow = this.hint && i === this.answer;
      c.translate(wob, 0);
      c.fillStyle = glow ? 'rgba(110,240,194,.25)' : 'rgba(22,29,79,.92)';
      c.beginPath(); c.ellipse(p.x, p.y - p.h * .1, p.w / 2, p.h * .32, 0, 0, Math.PI); c.lineTo(p.x - p.w / 2, p.y - p.h * .1); c.fill();
      c.lineWidth = 4; c.strokeStyle = glow ? '#6ef0c2' : '#ffc93c'; c.stroke();
      const n = this.n[i];
      if (this.numerals && !this.reveal) {
        c.fillStyle = '#ffc93c'; c.font = `800 ${p.h * .5}px ${fontFor()}`; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
        c.fillText(fmt(n), p.x, p.y - p.h * .14);
      } else {
        const g = gridFit(n, p.x - p.w * .4, p.y - p.h * .62, p.w * .8, p.h * .52); // resting on the pan
        g.forEach((q, k) => drawObj(c, { kind: this.kind }, q.x, q.y, Math.min(q.s * .46, 52), tt, { faces: n <= 6 }));
      }
      c.restore();
    }
  }
}

export { KINDS };
