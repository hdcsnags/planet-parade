import { TAU, clamp, pick, randInt, shuffle } from '../core/util.js';
import { roundRect } from '../engine/art.js';
import { drawObj, drawTile, hitTile, layoutTiles, makeTile, stepTiles } from '../engine/components.js';
import { gridFit } from '../engine/layout.js';
import { H, W, cx } from '../engine/stage.js';
import { Template } from '../engine/template.js';
import { cap, fmt, fontFor, num, t } from '../i18n/i18n.js';

// Number bonds (part-part-whole, Singapore): a whole and its two parts as circles or a bar model.
// One part is unknown (or hidden under a dome), or the whole is unknown; she picks it from big tiles.
// params: whole [min,max], unknown 'part'|'whole'|[...], diagram 'circles'|'bar', stage [...CPA order],
//         show 'split'|'hide', includeZero, story, choices
// Concrete → pictorial → abstract: the round's stage moves on after 3 first-try wins in a row and
// drops back one after 2 consecutive misses (kept for the visit).









const nw = n => (n <= 10 ? num(n) : fmt(n)); // spoken number: words to ten, digits above
export class Bond extends Template {
  constructor(run, level) { super(run, level); this.stageIdx = 0; this.streak = 0; this.missRun = 0; }
  makeRound() {
    const p = this.p, stages = [].concat(p.stage || ['pictorial']);
    this.stage = stages[Math.min(this.stageIdx, stages.length - 1)];
    const [lo, hi] = p.whole || [3, 5];
    const w = randInt(lo, hi), zero = p.includeZero && Math.random() < .12;
    const a = zero ? pick([0, w]) : randInt(1, w - 1);
    this.w = w; this.a = a; this.b = w - a;
    this.unknown = [].concat(p.unknown || 'part');
    this.unknown = this.unknown[Math.floor(Math.random() * this.unknown.length)];
    // the transfer round switches the picture: circles ↔ bar
    this.diagram = this.transfer ? (p.diagram === 'bar' ? 'circles' : 'bar') : (p.diagram || 'circles');
    this.hidden = p.show === 'hide' && this.unknown === 'part';
    this.answer = this.unknown === 'whole' ? w : this.b;
    this.revealed2 = false;
    const opts = new Set([this.answer]);
    for (let d = 1; opts.size < (p.choices || 3); d++) { if (this.answer + d <= Math.max(hi, this.answer + 2)) opts.add(this.answer + d); if (opts.size < (p.choices || 3) && this.answer - d >= 0) opts.add(this.answer - d); }
    this.tiles = shuffle([...opts]).map(v => makeTile(v));
    const A = nw(a), B = nw(this.b), Wd = nw(w);
    let line;
    if (p.story) line = this.unknown === 'whole' ? t('tpl.bond.storyWhole', { a: cap(A), b: B }) : t('tpl.bond.storyPart', { w: cap(Wd), a: A });
    else if (this.unknown === 'whole') line = t('tpl.bond.askWhole', { a: cap(A), b: B });
    else if (this.hidden) line = t('tpl.bond.askHidden', { w: cap(Wd), a: A });
    else line = t('tpl.bond.askPart', { w: cap(Wd), a: A });
    this.ask(line);
  }
  layout() {
    this.top = Math.max(H * .27, 215); this.bottom = H * .72; // clear of a two-line caption
    layoutTiles(this.tiles, W / 2, H * .85, clamp(H * .15, 84, 130), W - 48);
  }
  onTap(x, y) {
    const tl = hitTile(this.tiles, x, y); if (!tl) return;
    if (tl.n === this.answer) {
      tl.sv = 6; this.revealed2 = true; // lift the dome / fill the question mark
      this.streak = this.misses === 0 && !this.revealed ? this.streak + 1 : 0; this.missRun = 0;
      if (this.streak >= 3) { this.stageIdx++; this.streak = 0; }
      this.win(t('tpl.bond.say', { a: cap(nw(this.a)), b: nw(this.b), w: nw(this.w) }));
    } else {
      tl.wob = 1; this.missRun++; this.streak = 0;
      if (this.missRun >= 2 && this.stageIdx > 0) { this.stageIdx--; this.missRun = 0; }
      this.miss(cap(nw(tl.n)) + (this.misses >= 1 ? '' : '.'));
    }
  }
  step(dt) { stepTiles(this.tiles, dt); if (this.hint) { const g = this.tiles.find(q => q.n === this.answer); if (g) g.glow = 1; } }
  // draw a quantity inside a box: objects (concrete), dots (pictorial) or a numeral (abstract)
  fill(c, n, x, y, w, h, tt, unknown) {
    if (unknown && !this.revealed2) {
      c.fillStyle = '#6ef0c2'; c.font = `800 ${Math.min(w, h) * .55}px ${fontFor()}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('?', x, y); return;
    }
    if (this.stage === 'abstract' || n > 12) {
      c.fillStyle = '#ffc93c'; c.font = `800 ${Math.min(w, h) * .5}px ${fontFor()}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(fmt(n), x, y); return;
    }
    if (!n) return;
    const g = gridFit(n, x - w / 2, y - h / 2, w, h);
    g.forEach(q => {
      if (this.stage === 'concrete') drawObj(c, { kind: 'rocket' }, q.x, q.y, Math.min(q.s * .4, 30), tt, { faces: false });
      else { c.fillStyle = '#ff7eb6'; c.beginPath(); c.arc(q.x, q.y, Math.min(q.s * .3, 16), 0, TAU); c.fill(); }
    });
  }
  render(tt) {
    const c = cx, top = this.top, bottom = this.bottom, midY = (top + bottom) / 2;
    if (this.diagram === 'bar') {
      const x0 = W * .12, x1 = W * .88, bw = x1 - x0, bh = clamp((bottom - top) * .3, 60, 110);
      const y1 = top + bh * .6, y2 = y1 + bh * 1.35;
      const box = (x, y, w, h, n, unk, col) => { c.fillStyle = col; roundRect(c, x, y, w, h, 12); c.fill(); c.lineWidth = 3; c.strokeStyle = unk && !this.revealed2 ? '#6ef0c2' : 'rgba(255,255,255,.4)'; if (unk && !this.revealed2) c.setLineDash([8, 6]); c.stroke(); c.setLineDash([]); this.fill(c, n, x + w / 2, y + h / 2, w * .9, h * .8, tt, unk); };
      box(x0, y1, bw, bh, this.w, this.unknown === 'whole', 'rgba(94,168,255,.25)');
      const aw = bw * (this.w ? this.a / this.w : .5);
      box(x0, y2, Math.max(aw, 40), bh, this.a, false, 'rgba(255,201,60,.22)');
      box(x0 + Math.max(aw, 40) + 6, y2, Math.max(bw - aw - 6, 40), bh, this.b, this.unknown === 'part', 'rgba(255,126,182,.22)');
      if (this.hidden && !this.revealed2) this.dome(c, x0 + aw + 6 + (bw - aw - 6) / 2, y2 + bh * .95, Math.max(bw - aw - 6, 80) * .55, bh * 1.1);
    } else {
      const R = clamp(Math.min(W * .16, (bottom - top) * .26), 60, 130), wx = W / 2, wy = top + R;
      const px = [W / 2 - R * 1.55, W / 2 + R * 1.55], py = bottom - R * .95;
      c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 5;
      px.forEach(x => { c.beginPath(); c.moveTo(wx, wy + R * .9); c.lineTo(x, py - R * .8); c.stroke(); });
      const circ = (x, y, r, n, unk, col) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.lineWidth = 4; c.strokeStyle = unk && !this.revealed2 ? '#6ef0c2' : 'rgba(255,255,255,.45)'; if (unk && !this.revealed2) c.setLineDash([9, 7]); c.stroke(); c.setLineDash([]); this.fill(c, n, x, y, r * 1.3, r * 1.3, tt, unk); };
      circ(wx, wy, R, this.w, this.unknown === 'whole', 'rgba(94,168,255,.22)');
      circ(px[0], py, R * .8, this.a, false, 'rgba(255,201,60,.2)');
      circ(px[1], py, R * .8, this.b, this.unknown === 'part', 'rgba(255,126,182,.2)');
      if (this.hidden && !this.revealed2) this.dome(c, px[1], py + R * .8, R * .95, R * 1.7);
    }
    void midY;
    this.tiles.forEach(tl => drawTile(c, tl, tt, { dots: this.stage !== 'abstract' && tl.n <= 10 && tl.n > 0 }));
  }
  dome(c, x, baseY, r, h) {
    const g = c.createLinearGradient(x, baseY - h, x, baseY); g.addColorStop(0, '#e8ecff'); g.addColorStop(1, '#8f9bd6');
    c.fillStyle = g; c.beginPath(); c.ellipse(x, baseY, r, h, 0, Math.PI, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(x - r * .35, baseY - h * .6, r * .15, h * .22, -.4, 0, TAU); c.fill();
  }
}

export { nw };
