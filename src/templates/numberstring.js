import { pop, whoosh } from '../audio/audio.js';
import { say } from '../audio/speech.js';
import { TAU, clamp, pick, randInt, shuffle } from '../core/util.js';
import { drawButton, drawObj, drawTile, hitButton, hitTile, layoutTiles, makeButton, makeTile, stepTiles } from '../engine/components.js';
import { gridFit } from '../engine/layout.js';
import { H, W, cx } from '../engine/stage.js';
import { Template } from '../engine/template.js';
import { after } from '../engine/timers.js';
import { bang, cap, num, t } from '../i18n/i18n.js';

// Number strings (untimed mental math, Japan/Netherlands style): a running total changes step by step
// while she listens — "Look: six. Two more land! One flies away! How many now?" The stars hide under a
// cloud during the story; the "show me" eye brings them back any time (that round then isn't first try).
// Nothing is timed; the prompt waits.
// params: start [min,max], steps 2|3, ops ['+','-'], stepMax, maxN, objectsOnDemand, choices











export class NumberString extends Template {
  makeRound() {
    const p = this.p, maxN = p.maxN || 10, sm = p.stepMax || 2, ops = p.ops || ['+', '-'];
    let n = randInt(...(p.start || [1, 6]));
    this.startN = n; this.seq = [];
    for (let i = 0; i < (p.steps || 3); i++) {
      let op = pick(ops), k = randInt(1, sm);
      if (op === '+' && n + k > maxN) op = '-';
      if (op === '-' && n - k < 0) op = '+';
      if (op === '+' && n + k > maxN) k = maxN - n;
      if (k <= 0) continue;
      n += op === '+' ? k : -k; this.seq.push({ op, k });
    }
    this.answer = n; this.shown = this.startN; this.covered = false; this.peek = false; this.tiles = [];
    this.eye = makeButton('eye', { hidden: true });
    this.busy = true; // the story plays first; taps wait
    const lines = [t('tpl.string.start', { a: num(this.startN) })];
    this.seq.forEach(s => lines.push(s.op === '+' ? (s.k === 1 ? t('tpl.string.moreOne') : t('tpl.string.more', { b: cap(num(s.k)) })) : (s.k === 1 ? t('tpl.string.flyOne') : t('tpl.string.fly', { b: cap(num(s.k)) }))));
    // tell the story one line at a time; the objects change with each line, then hide under the cloud
    let running = this.startN;
    const stepLine = i => {
      if (i >= lines.length) { this.finishStory(); return; }
      if (i === 1) this.covered = true; // after "look: six", the stars go under the cloud
      if (i > 0) { const s = this.seq[i - 1]; running += s.op === '+' ? s.k : -s.k; this.shown = running; if (s.op === '+') pop(); else whoosh(.5); }
      say(lines[i], { onend: () => after(.35, () => stepLine(i + 1)) });
    };
    stepLine(0);
  }
  finishStory() {
    const p = this.p, opts = new Set([this.answer]);
    for (let d = 1; opts.size < (p.choices || 3); d++) { if (this.answer + d <= (p.maxN || 10)) opts.add(this.answer + d); if (opts.size < (p.choices || 3) && this.answer - d >= 0) opts.add(this.answer - d); }
    this.tiles = shuffle([...opts]).map(v => makeTile(v));
    this.eye.hidden = !(p.objectsOnDemand ?? true);
    this.layout(); this.busy = false;
    this.ask(t('tpl.string.ask'));
  }
  layout() {
    this.box = { x: W / 2, y: Math.max(H * .45, 330), w: Math.min(W * .7, 620), h: Math.min(H * .34, 260) };
    layoutTiles(this.tiles, W / 2, H * .86, clamp(H * .14, 80, 120), W - 180);
    this.eye.r = clamp(Math.min(W, H) * .06, 34, 48); this.eye.x = W - 24 - this.eye.r; this.eye.y = H * .86;
  }
  onTap(x, y) {
    if (!this.eye.hidden && hitButton([this.eye], x, y)) { this.peek = !this.peek; this.eye.sv = 4; if (this.peek) this.revealed = true; pop(); return; }
    const tl = hitTile(this.tiles, x, y); if (!tl) return;
    if (tl.n === this.answer) { tl.sv = 6; this.covered = false; this.win(t('countYes', { a: num(this.answer) })); }
    else { tl.wob = 1; this.miss(cap(num(tl.n)) + bang()); }
  }
  step(dt) { stepTiles(this.tiles, dt); if (this.hint) { const g = this.tiles.find(q => q.n === this.answer); if (g) g.glow = 1; this.eye.glow = 1; } this.eye.sv += (-160 * (this.eye.scale - 1) - 11 * this.eye.sv) * dt; this.eye.scale += this.eye.sv * dt; }
  render(tt) {
    const c = cx, b = this.box;
    const g = gridFit(Math.max(1, this.shown), b.x - b.w / 2 + 20, b.y - b.h / 2 + 20, b.w - 40, b.h - 40);
    if (!this.covered || this.peek) for (let i = 0; i < this.shown; i++) drawObj(c, { kind: 'star' }, g[i].x, g[i].y, Math.min(g[i].s * .4, 40), tt, { faces: this.shown <= 6 });
    if (this.covered && !this.peek) {
      // a soft cloud hides the stars while she thinks
      c.save(); c.fillStyle = 'rgba(232,236,255,.92)';
      for (const [dx, dy, r] of [[-.3, .05, .3], [0, -.12, .38], [.3, .04, .3], [-.12, .18, .28], [.16, .2, .28]]) { c.beginPath(); c.arc(b.x + dx * b.w, b.y + dy * b.h, r * b.h, 0, TAU); c.fill(); }
      c.restore();
    }
    this.tiles.forEach(tl => drawTile(c, tl, tt));
    drawButton(c, this.eye, tt, this.peek ? '#6ef0c2' : '#2a3380', (g2, r) => {
      g2.strokeStyle = this.peek ? '#0a0e2a' : '#f6f2ff'; g2.lineWidth = r * .12;
      g2.beginPath(); g2.ellipse(0, 0, r * .6, r * .34, 0, 0, TAU); g2.stroke();
      g2.fillStyle = g2.strokeStyle; g2.beginPath(); g2.arc(0, 0, r * .16, 0, TAU); g2.fill();
    });
  }
}
