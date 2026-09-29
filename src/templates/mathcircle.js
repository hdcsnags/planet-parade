import { pop, whoosh } from '../audio/audio.js';
import { TAU, clamp, pick, randInt, shuffle } from '../core/util.js';
import { drawButton, drawObj, hitButton, makeButton } from '../engine/components.js';
import { sparkle } from '../engine/particles.js';
import { H, W, cx } from '../engine/stage.js';
import { Template } from '../engine/template.js';
import { after } from '../engine/timers.js';
import { t } from '../i18n/i18n.js';

// Math circle (Zvonkin-style little puzzles): odd one out; odd one out with a reason; what changed.
//   oddOne:      four things, one differs in one attribute; tap it
//   oddReason:   then tap the picture card that says why (colour, shape or size)
//   whatChanged: look, a curtain closes, one thing changes, the curtain opens; tap what changed
// params: mode 'oddOne'|'oddReason'|'whatChanged', setSize 3–5, attribute [...], reasonCards 3










// stars and round balls both take any colour, so a colour change never looks like a shape change
const VAL = { kind: ['star', 'ball'], color: ['pink', 'blue', 'gold'], size: ['big', 'small'] };
export class MathCircle extends Template {
  makeRound() {
    const p = this.p; this.mode = p.mode || 'oddOne';
    const n = p.setSize || 4;
    this.attr = pick(this.mode === 'oddOne' ? [].concat(p.attribute || ['kind', 'color']) : ['kind', 'color', 'size']);
    const base = { kind: pick(VAL.kind), color: pick(VAL.color), size: 'big' };
    this.items = Array.from({ length: n }, () => ({ ...base, wob: 0 }));
    this.odd = randInt(0, n - 1);
    const other = pick(VAL[this.attr].filter(v => v !== base[this.attr]));
    this.phase = 'pick'; this.reasons = [];
    if (this.mode === 'whatChanged') {
      this.items.forEach((o, i) => { if (i) o.kind = pick(VAL.kind); o.color = pick(VAL.color); });
      this.phase = 'look'; this.curtain = 0; this.busy = true;
      this.ask(t('tpl.circle.look'));
      after(3.2, () => { this.phase = 'closing'; whoosh(.6); });
      after(4.2, () => { const o = this.items[this.odd]; o[this.attr] = pick(VAL[this.attr].filter(v => v !== o[this.attr])); this.phase = 'opening'; });
      after(5.2, () => { this.phase = 'pick'; this.busy = false; this.ask(t('tpl.circle.changed')); });
    } else {
      this.items[this.odd][this.attr] = other;
      this.ask(t('tpl.circle.odd'));
    }
  }
  layout() {
    const n = this.items.length, cw = Math.min((W - 64) / n, 240);
    this.items.forEach((o, i) => { o.x = W / 2 + (i - (n - 1) / 2) * cw; o.y = Math.max(H * .45, 320); o.r = Math.min(cw * .34, 96); });
    const r = clamp(Math.min(W, H) * .07, 40, 56);
    this.reasons.forEach((b, i) => { b.r = r; b.x = W / 2 + (i - 1) * r * 2.8; b.y = H * .8; });
  }
  onTap(x, y) {
    if (this.phase === 'reason') {
      const b = hitButton(this.reasons, x, y); if (!b) return;
      if (b.id === this.attr) this.win(t(`tpl.circle.because.${this.attr}`), b.x, b.y);
      else { b.sv = 3; this.miss(t('tpl.qb.lookAgain')); }
      return;
    }
    if (this.phase !== 'pick') return;
    const i = this.items.findIndex(o => Math.hypot(x - o.x, y - o.y) < Math.max(o.r * 1.3, 50));
    if (i < 0) return;
    if (i !== this.odd) { this.items[i].wob = 1; this.miss(t('tpl.qb.lookAgain')); return; }
    const o = this.items[i]; sparkle(o.x, o.y, 14); pop();
    if (this.mode === 'oddReason') {
      this.phase = 'reason'; this.reasons = shuffle(['color', 'kind', 'size']).map(id => makeButton(id)); this.layout();
      this.ask(t('tpl.circle.why'));
    } else this.win(t(this.mode === 'whatChanged' ? 'tpl.circle.changedYes' : 'tpl.circle.oddYes'), o.x, o.y);
  }
  step(dt) {
    this.items.forEach(o => { o.wob = Math.max(0, o.wob - dt * 1.6); });
    if (this.phase === 'closing') this.curtain = Math.min(1, this.curtain + dt * 1.6);
    if (this.phase === 'opening') this.curtain = Math.max(0, this.curtain - dt * 1.6);
    this.reasons.forEach(b => { b.sv += (-160 * (b.scale - 1) - 11 * b.sv) * dt; b.scale += b.sv * dt; b.glow = this.hint && b.id === this.attr ? 1 : 0; });
  }
  render(tt) {
    const c = cx;
    this.items.forEach((o, i) => {
      c.save(); c.translate(o.x, o.y); c.rotate(Math.sin(tt * 28) * .12 * o.wob);
      if (this.hint && this.phase === 'pick' && i === this.odd) { c.fillStyle = `rgba(110,240,194,${.25 + .2 * Math.sin(tt * 5)})`; c.beginPath(); c.arc(0, 0, o.r * 1.45, 0, TAU); c.fill(); }
      drawObj(c, o, 0, 0, o.r, tt, { faces: false });
      c.restore();
    });
    if (this.curtain > 0) {
      const top = this.items[0].y - 130, h = 260;
      c.fillStyle = '#6c3fb0'; c.fillRect(0, top, W / 2 * this.curtain, h); c.fillRect(W - W / 2 * this.curtain, top, W / 2 * this.curtain, h);
      c.fillStyle = '#ffc93c'; c.fillRect(0, top, W, 10);
    }
    this.reasons.forEach(b => drawButton(c, b, tt, '#2a3380', (g, r) => {
      if (b.id === 'color') ['#ff7eb6', '#5ea8ff', '#ffc93c'].forEach((col, k) => { g.fillStyle = col; g.beginPath(); g.arc((k - 1) * r * .45, 0, r * .22, 0, TAU); g.fill(); });
      else if (b.id === 'kind') { g.fillStyle = '#f6f2ff'; g.beginPath(); g.moveTo(-r * .55, r * .3); g.lineTo(-r * .2, -r * .35); g.lineTo(r * .1, r * .3); g.closePath(); g.fill(); g.beginPath(); g.arc(r * .35, 0, r * .25, 0, TAU); g.fill(); }
      else { g.fillStyle = '#f6f2ff'; g.beginPath(); g.arc(-r * .25, 0, r * .36, 0, TAU); g.fill(); g.beginPath(); g.arc(r * .4, r * .12, r * .16, 0, TAU); g.fill(); }
    }));
  }
}

export { VAL };
