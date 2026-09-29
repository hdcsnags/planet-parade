import { chime, pop } from '../audio/audio.js';
import { TAU, clamp, ease, pick, shuffle } from '../core/util.js';
import { drawObj } from '../engine/components.js';
import { sparkle } from '../engine/particles.js';
import { H, W, cx } from '../engine/stage.js';
import { Template } from '../engine/template.js';
import { SCALE } from '../engine/world.js';
import { lookup, t } from '../i18n/i18n.js';

// Sort into craters: one space object at a time appears at the top; she taps the crater where it
// belongs. Each crater shows a picture of what goes in it, so no reading is needed.
// params: by ['kind'] | ['color'] | ['size'] | ['kind','color'] | ['size','kind'], groups 2–4, count










const VALUES = { kind: ['star', 'moon', 'rocket'], color: ['pink', 'blue', 'gold'], size: ['big', 'small'] };
export class Sort extends Template {
  makeRound() {
    const p = this.p, by = p.by || ['kind'], groups = p.groups || 2;
    // pick the groups: combinations of the chosen attribute values
    let combos = [{}];
    for (const a of by) combos = combos.flatMap(cmb => VALUES[a].map(v => ({ ...cmb, [a]: v })));
    this.groups = shuffle(combos).slice(0, groups);
    const base = { kind: by.includes('kind') ? null : pick(['star', 'moon']), color: by.includes('color') ? null : 'gold', size: by.includes('size') ? null : 'big' };
    const full = g => ({ kind: g.kind || base.kind, color: g.color || base.color, size: g.size || base.size });
    this.groups = this.groups.map(g => ({ key: g, sample: full(g), items: [] }));
    const n = p.count || 4;
    this.queue = shuffle(Array.from({ length: n }, (_, i) => full(this.groups[i % this.groups.length].key)));
    this.by = by; this.flying = null;
    this.next();
    this.ask(t('tpl.sort.go'));
  }
  next() { this.cur = this.queue.shift() || null; if (this.cur) this.cur.scale = .01, this.cur.sv = 0; }
  matches(o, g) { return this.by.every(a => o[a] === g.key[a]); }
  layout() {
    const n = this.groups.length, cw = (W - 32) / n;
    this.groups.forEach((g, i) => { g.x = 16 + cw * (i + .5); g.y = H * .74; g.rx = Math.min(cw * .42, 200); g.ry = g.rx * .42; });
    this.itemX = W / 2; this.itemY = Math.max(H * .33, 190); this.itemR = clamp(Math.min(W, H) * .11, 44, 90);
  }
  onTap(x, y) {
    if (!this.cur || this.flying) return;
    const g = this.groups.find(q => Math.hypot((x - q.x) / q.rx, (y - q.y) / (q.ry * 2.2)) < 1.25);
    if (!g) return;
    if (this.matches(this.cur, g)) {
      pop(); this.flying = { o: this.cur, g, t: 0 }; this.cur = null;
    } else {
      this.wob = 1;
      // name the attribute that does not match
      const bad = this.by.find(a => this.cur[a] !== g.key[a]);
      const line = bad === 'color' ? t('tpl.sort.isColor', { c: lookup(`colors.${this.cur.color}`) })
        : bad === 'size' ? t('tpl.sort.isSize', { s: lookup(`sizes.${this.cur.size}`) })
        : t('tpl.sort.isKind', { o: lookup(`objects.${this.cur.kind}`)[0] });
      this.miss(line);
    }
  }
  step(dt) {
    if (this.cur) { const o = this.cur; o.sv += (-160 * (o.scale - 1) - 11 * o.sv) * dt; o.scale += o.sv * dt; }
    this.wob = Math.max(0, (this.wob || 0) - dt * 1.6);
    if (this.flying) {
      const f = this.flying; f.t += dt / .6;
      if (f.t >= 1) {
        f.g.items.push(f.o); chime(SCALE[Math.min(8, f.g.items.length + 2)]); sparkle(f.g.x, f.g.y - f.g.ry, 8);
        this.flying = null;
        if (!this.queue.length) this.win(t('tpl.sort.allDone'), W / 2, H * .6);
        else this.next();
      }
    }
  }
  render(tt) {
    const c = cx;
    this.groups.forEach(g => {
      c.save();
      const hot = this.hint && this.cur && this.matches(this.cur, g);
      const grd = c.createRadialGradient(g.x, g.y, g.rx * .2, g.x, g.y, g.rx);
      grd.addColorStop(0, '#2a2060'); grd.addColorStop(1, '#4b3a8f');
      c.fillStyle = grd; c.beginPath(); c.ellipse(g.x, g.y, g.rx, g.ry, 0, 0, TAU); c.fill();
      c.lineWidth = 6; c.strokeStyle = hot ? `rgba(110,240,194,${.6 + .4 * Math.sin(tt * 5)})` : '#8f7fd6'; c.stroke();
      // sign: the picture of what belongs here
      c.fillStyle = 'rgba(22,29,79,.9)'; c.beginPath(); c.arc(g.x, g.y - g.ry - 44, 38, 0, TAU); c.fill();
      c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,.35)'; c.stroke();
      drawObj(c, g.sample, g.x, g.y - g.ry - 44, 26, tt, { faces: false });
      // what she has sorted so far, nestled in the crater
      g.items.forEach((o, i) => drawObj(c, o, g.x + (i - (g.items.length - 1) / 2) * Math.min(28, g.rx * 1.6 / Math.max(1, g.items.length)), g.y - 4, 16, tt, { faces: false }));
      c.restore();
    });
    if (this.flying) {
      const f = this.flying, e = ease(Math.min(1, f.t));
      const x = this.itemX + (f.g.x - this.itemX) * e, y = this.itemY + (f.g.y - this.itemY) * e - Math.sin(e * Math.PI) * 60;
      drawObj(c, f.o, x, y, this.itemR * (1 - e * .6), tt);
    }
    if (this.cur) {
      c.save(); c.translate(this.itemX, this.itemY + Math.sin(tt * 1.6) * 4); c.rotate(Math.sin(tt * 28) * .16 * (this.wob || 0));
      const s = Math.max(.01, this.cur.scale); c.scale(s, s);
      drawObj(c, this.cur, 0, 0, this.itemR, tt); c.restore();
    }
  }
}

export { VALUES };
