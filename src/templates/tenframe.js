import { chime } from '../audio/audio.js';
import { say } from '../audio/speech.js';
import { logUse } from '../core/settings.js';
import { clamp, randInt, shuffle } from '../core/util.js';
import { roundRect } from '../engine/art.js';
import { spring } from '../engine/body.js';
import { drawObj, drawTile, hitTile, layoutTiles, makeTile, stepTiles } from '../engine/components.js';
import { sparkle } from '../engine/particles.js';
import { H, W, cx } from '../engine/stage.js';
import { Template } from '../engine/template.js';
import { after } from '../engine/timers.js';
import { SCALE } from '../engine/world.js';
import { bang, cap, fmt, num, qty, t } from '../i18n/i18n.js';

// Ten-frame: fill a frame with N stars, count a frame, make 5 and 10 (number bonds), teen numbers.
// params: mode 'fill' | 'count' | 'bond' (fill the rest) | 'bondPick' (how many more?) | 'teen'
//         | 'makeTen' (8 + 5: move stars up to make ten, then how many in all? → 8 + 2 + 3)
//         range [min, max], whole 5 | 10, choices 2 | 3
// Frames fill left-to-right, top row first, the usual ten-frame convention in every language.














export class TenFrame extends Template {
  makeRound() {
    const p = this.p, [lo, hi] = p.range || [1, 5];
    this.whole = p.whole || 10; this.frames = p.mode === 'teen' || p.mode === 'makeTen' || (p.range && p.range[1] > 10) ? 2 : 1;
    this.phase = 'play';
    this.cells = Array.from({ length: this.frames * 10 }, (_, i) => ({ i, on: false, pre: false, scale: 1, sv: 0 }));
    this.tiles = [];
    const pre = n => { for (let i = 0; i < n; i++) { this.cells[i].on = this.cells[i].pre = true; } };
    if (p.mode === 'fill') {
      this.target = randInt(lo, hi);
      this.ask(t('tpl.tenframe.fill', { a: qty(this.target, 'star') }));
    } else if (p.mode === 'count') {
      this.target = randInt(lo, hi); pre(this.target);
      this.makeTiles(this.target, hi);
      this.ask(t('tpl.tenframe.count'));
    } else if (p.mode === 'bond') {
      this.k = randInt(1, this.whole - 1); pre(this.k); this.target = this.whole;
      this.ask(t('tpl.tenframe.bondFill', { a: cap(qty(this.k, 'star')) }));
    } else if (p.mode === 'bondPick') {
      this.k = randInt(1, this.whole - 1); pre(this.k); this.target = this.whole - this.k;
      this.makeTiles(this.target, this.whole - 1);
      this.ask(t('tpl.tenframe.bondAsk', { z: num(this.whole) }));
    } else if (p.mode === 'makeTen') {
      // bridge through ten: a in the first frame, b waiting in the second; sum is more than 10
      const maxN = p.maxN || 20;
      this.k = randInt(6, 9); this.bb = randInt(11 - this.k, Math.min(9, maxN - this.k)); this.target = this.k + this.bb;
      pre(this.k);
      for (let i = 0; i < this.bb; i++) Object.assign(this.cells[10 + i], { on: true, pre: true, col: 'pink', movable: true });
      this.phase = 'move';
      this.ask(t('tpl.tenframe.makeTenMove', { a: cap(num(this.k)), b: num(this.bb) }));
    } else { // teen: a full ten and some more
      this.k = randInt(lo - 10, hi - 10); pre(10 + this.k); this.target = 10 + this.k;
      this.makeTiles(this.target, 19, 11);
      this.ask(t('tpl.tenframe.teenAsk'));
    }
  }
  makeTiles(answer, max, min = 1) {
    const n = this.p.choices || 2, opts = new Set([answer]);
    for (let d = 1; opts.size < n && d < 20; d++) { if (answer + d <= max) opts.add(answer + d); if (opts.size < n && answer - d >= min) opts.add(answer - d); }
    this.tiles = shuffle([...opts]).map(v => makeTile(v));
  }
  get count() { return this.cells.filter(c => c.on).length; }
  layout() {
    const bottom = this.tiles.length ? H * .72 : H - 40, top = Math.max(H * .22, 150);
    const cols = 5, rows = this.whole === 5 && this.frames === 1 ? 1 : 2, framesAcross = this.frames === 2 && W > H ? 2 : 1;
    const framesDown = this.frames === 2 && framesAcross === 1 ? 2 : 1;
    const availW = (W - 48 - (framesAcross - 1) * 32) / framesAcross, availH = (bottom - top - (framesDown - 1) * 24) / framesDown;
    const cs = Math.min(availW / cols, availH / rows, 160);
    this.cs = cs;
    this.frameBoxes = [];
    for (let f = 0; f < this.frames; f++) {
      const fx = W / 2 + (framesAcross === 2 ? (f - .5) * (cols * cs + 32) : 0), fy = top + (bottom - top) / 2 + (framesDown === 2 ? (f - .5) * (rows * cs + 24) : 0);
      this.frameBoxes.push({ x: fx - cols * cs / 2, y: fy - rows * cs / 2, w: cols * cs, h: rows * cs });
    }
    this.cells.forEach((c, i) => {
      const f = Math.floor(i / 10), j = i % 10, b = this.frameBoxes[f];
      if (!b || (rows === 1 && j >= 5)) { c.hidden = true; return; }
      c.hidden = false; c.x = b.x + (j % 5 + .5) * cs; c.y = b.y + (Math.floor(j / 5) + .5) * cs;
    });
    layoutTiles(this.tiles, W / 2, H * .86, clamp(H * .15, 84, 130), W - 48);
  }
  fillNext() {
    const c = this.cells.find(q => !q.on && !q.hidden);
    if (!c) return;
    c.on = true; c.sv = 6; const n = this.count;
    chime(SCALE[Math.min(8, n % 9)]); sparkle(c.x, c.y, 6); logUse('nums', n);
    const added = n - (this.k || 0);
    if (n === this.target) {
      if (this.p.mode === 'bond') this.win(t('tpl.tenframe.bondSay', { x: cap(num(this.k)), y: num(added), z: num(this.whole) }), c.x, c.y);
      else this.win(t('tpl.tenframe.full', { a: cap(qty(n, 'star')) }), c.x, c.y);
    } else say(cap(num(this.p.mode === 'bond' ? added : n)) + bang());
  }
  // make-ten: each tap moves one pink star from the second frame into the first until it holds ten
  moveUp() {
    const from = [...this.cells].reverse().find(c => c.on && c.movable), to = this.cells.find(c => c.i < 10 && !c.on && !c.hidden);
    if (!from || !to) return;
    from.on = false; from.movable = false; Object.assign(to, { on: true, pre: true, col: 'pink', sv: 6 });
    const moved = this.cells.filter(c => c.i < 10 && c.col === 'pink').length;
    chime(SCALE[Math.min(8, moved + 2)]); sparkle(to.x, to.y, 6);
    if (this.cells.slice(0, 10).every(c => c.on)) {
      // ten is made: now how many in all?
      this.phase = 'ask'; this.makeTiles(this.target, 19, 11); this.layout();
      this.ask(t('tpl.tenframe.teenAsk'));
    } else say(cap(num(this.k + moved)) + bang());
  }
  onTap(x, y) {
    if (this.phase === 'move') { this.moveUp(); return; }
    if (this.tiles.length) {
      const tl = hitTile(this.tiles, x, y);
      if (!tl) return;
      if (tl.n === this.target) {
        tl.sv = 6;
        if (this.p.mode === 'bondPick') {
          // show the answer: the missing stars pour in, then the bond is spoken
          const free = this.cells.filter(c => !c.on && !c.hidden);
          free.forEach((c, i) => after(i * .12, () => { c.on = true; c.sv = 5; }));
          this.win(t('tpl.tenframe.bondSay', { x: cap(num(this.k)), y: num(this.target), z: num(this.whole) }));
        } else if (this.p.mode === 'teen') this.win(t('tpl.tenframe.teenSay', { y: num(this.k), z: fmt(this.target) }));
        else if (this.p.mode === 'makeTen') this.win(t('tpl.tenframe.makeTenSay', { a: cap(num(this.k)), x: num(10 - this.k), y: num(this.bb - (10 - this.k)), s: fmt(this.target) }));
        else this.win(t('countYes', { a: qty(this.target, 'star') }));
      } else { tl.wob = 1; this.miss(cap(num(tl.n)) + bang()); }
      return;
    }
    const inFrame = this.frameBoxes.some(b => x > b.x - 20 && x < b.x + b.w + 20 && y > b.y - 20 && y < b.y + b.h + 20);
    if (!inFrame) return;
    // Tapping a star she placed takes the last one back out (never the pre-filled ones).
    const hit = this.cells.find(c => !c.hidden && Math.hypot(x - c.x, y - c.y) < this.cs * .5);
    if (hit && hit.on && !hit.pre) { const last = [...this.cells].reverse().find(c => c.on && !c.pre); last.on = false; say(cap(num(this.count)) + bang()); return; }
    this.fillNext();
  }
  explain() {
    if (!this.tiles.length) return;
    const m = this.p.mode;
    if (m === 'count') this.together(this.target);
    else if (m === 'bondPick') say(t('tpl.tenframe.bondSay', { x: cap(num(this.k)), y: num(this.target), z: num(this.whole) }), { onend: this.restorePrompt });
    else if (m === 'teen') say(t('tpl.tenframe.teenSay', { y: num(this.k), z: fmt(this.target) }), { onend: this.restorePrompt });
    else if (m === 'makeTen') say(t('tpl.tenframe.makeTenSay', { a: cap(num(this.k)), x: num(10 - this.k), y: num(this.bb - (10 - this.k)), s: fmt(this.target) }), { onend: this.restorePrompt });
  }
  step(dt) { this.cells.forEach(c => spring(c, dt)); stepTiles(this.tiles, dt); if (this.hint) { const g = this.tiles.find(q => q.n === this.target); if (g) g.glow = 1; } }
  render(tt) {
    const c = cx, cs = this.cs;
    this.frameBoxes.forEach(b => {
      c.save(); roundRect(c, b.x - 10, b.y - 10, b.w + 20, b.h + 20, 18);
      c.fillStyle = 'rgba(22,29,79,.9)'; c.fill(); c.lineWidth = 4; c.strokeStyle = '#9fb4ff'; c.stroke();
      c.strokeStyle = 'rgba(159,180,255,.45)'; c.lineWidth = 2;
      for (let i = 1; i < 5; i++) { c.beginPath(); c.moveTo(b.x + i * cs, b.y); c.lineTo(b.x + i * cs, b.y + b.h); c.stroke(); }
      if (b.h > cs * 1.5) { c.beginPath(); c.moveTo(b.x, b.y + cs); c.lineTo(b.x + b.w, b.y + cs); c.stroke(); }
      c.restore();
    });
    this.cells.forEach(cl => {
      if (cl.hidden || !cl.on) return;
      c.save(); c.translate(cl.x, cl.y); const s = Math.max(.01, cl.scale); c.scale(s, s);
      drawObj(c, { kind: 'star', color: cl.col || (cl.pre || this.p.mode === 'fill' || this.p.mode === 'count' ? 'gold' : 'pink') }, 0, 0, cs * .36, tt);
      c.restore();
    });
    this.tiles.forEach(tl => drawTile(c, tl, tt));
  }
}
