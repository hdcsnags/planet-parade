import { chime, tone } from '../audio/audio.js';
import { TAU, clamp, shuffle } from '../core/util.js';
import { drawPlanet, goldStar, roundRect } from '../engine/art.js';
import { drawObj, hitTile, layoutTiles, makeTile, stepTiles } from '../engine/components.js';
import { H, W, cx } from '../engine/stage.js';
import { Template } from '../engine/template.js';
import { PLANETS, SCALE } from '../engine/world.js';
import { LANG, cap, fmt, lookup, pname, t, word } from '../i18n/i18n.js';

// Pattern train: cars carry a repeating (or growing) pattern; one car is empty. She picks what goes
// there from 2–3 big choices, the car fills, the train says the pattern out loud and chugs away.
// params: unit 'AB'|'AAB'|'ABB'|'ABC'|'AABB'|'ABCD'|'grow'|'grow2', token 'color'|'planet'|'shape',
//         blank 'end'|'middle', choices, cars











const TOKENS = {
  color: ['pink', 'blue', 'gold', 'green'],
  planet: ['mars', 'earth', 'neptune', 'jupiter'],
  shape: ['star', 'moon', 'rocket', 'ball'],
  rhythm: ['long', 'short'], // music: a long note and a short note
};
export class Pattern extends Template {
  makeRound() {
    const p = this.p, unit = [].concat(p.unit || 'AB')[Math.floor(Math.random() * [].concat(p.unit || 'AB').length)], n = p.cars || 6;
    this.grow = unit.startsWith('grow');
    const pool = shuffle(TOKENS[p.token || 'color']);
    if (this.grow) {
      const d = unit === 'grow2' ? 2 : 1, s0 = unit === 'grow2' ? 2 : 1;
      this.seq = Array.from({ length: Math.min(n, 5) }, (_, i) => ({ count: s0 + i * d }));
    } else {
      const letters = unit.split(''), map = {};
      [...new Set(letters)].forEach((L, i) => { map[L] = pool[i]; });
      this.seq = Array.from({ length: n }, (_, i) => ({ tok: map[letters[i % letters.length]] }));
    }
    this.blankAt = p.blank === 'middle' ? Math.floor(this.seq.length / 2) : this.seq.length - 1;
    const ans = this.seq[this.blankAt];
    const key = o => this.grow ? o.count : o.tok;
    const opts = new Map([[key(ans), ans]]);
    const others = this.grow ? [ans.count - 1, ans.count + 1, ans.count + 2].filter(v => v > 0).map(count => ({ count })) : pool.filter(tk => tk !== ans.tok).map(tok => ({ tok }));
    for (const o of shuffle(others)) { if (opts.size >= (p.choices || 2)) break; opts.set(key(o), o); }
    this.answerKey = key(ans);
    this.tiles = shuffle([...opts.values()]).map(o => makeTile(0, { item: o, key: key(o) }));
    this.filled = false; this.drive = 0;
    if ((p.token || 'color') === 'rhythm') this.playRhythm();
    this.ask(t(p.blank === 'middle' ? 'tpl.pattern.missing' : 'tpl.pattern.next'));
  }
  // rhythm cars: long = a held note, short = a quick one; the train plays its pattern (the blank is a rest)
  playRhythm() { let at = .4; this.seq.forEach((o, i) => { if (i !== this.blankAt) tone(392, o.tok === 'long' ? .5 : .16, { vol: .2, delay: at }); at += o.tok === 'long' ? .7 : .35; }); }
  nameOf(o, lang = LANG) {
    if (this.grow) return fmt(o.count);
    const tok = o.tok, tp = this.p.token || 'color';
    if (tp === 'color') return lookup(`colors.${tok}`, lang);
    if (tp === 'rhythm') return lookup(`tpl.pattern.${tok}`, lang);
    if (tp === 'planet') return cap(pname(PLANETS.find(pl => pl.id === tok), lang));
    return tok === 'ball' ? lookup('colors.blue', lang) : word(tok, lang).replace(/^(la |le |l’)/, '');
  }
  layout() {
    const n = this.seq.length;
    this.carW = Math.min((W - 80) / (n + 1.3), 150); this.carH = this.carW * .8; this.ty = Math.max(H * .42, 220);
    this.x0 = W / 2 - (n + 1.2) * this.carW / 2;
    layoutTiles(this.tiles, W / 2, H * .8, clamp(H * .19, 96, 150), W - 48);
  }
  drawToken(c, o, x, y, r, tt) {
    if (this.grow) {
      const k = o.count, per = Math.ceil(Math.sqrt(k)), rr = r / (per * .95);
      for (let i = 0; i < k; i++) { const row = Math.floor(i / per), col = i % per, rowsN = Math.ceil(k / per); goldStar(c, x + (col - (Math.min(per, k - row * per) - 1) / 2) * rr * 2, y + (row - (rowsN - 1) / 2) * rr * 2, rr * .85, tt, null); }
      return;
    }
    const tp = this.p.token || 'color';
    if (tp === 'rhythm') { c.fillStyle = '#6ef0c2'; if (o.tok === 'long') { c.beginPath(); c.roundRect ? c.roundRect(x - r * .8, y - r * .22, r * 1.6, r * .44, r * .22) : c.rect(x - r * .8, y - r * .22, r * 1.6, r * .44); c.fill(); } else { c.beginPath(); c.arc(x, y, r * .3, 0, TAU); c.fill(); } return; }
    if (tp === 'planet') drawPlanet(c, PLANETS.find(pl => pl.id === o.tok), x, y, r * (o.tok === 'jupiter' ? .9 : .8), tt, { face: true, blink: 1, happy: true });
    else if (tp === 'shape') drawObj(c, { kind: o.tok, color: o.tok === 'ball' ? 'blue' : 'gold' }, x, y, r, tt);
    else drawObj(c, { kind: 'ball', color: o.tok }, x, y, r, tt);
  }
  onTap(x, y) {
    const tl = hitTile(this.tiles, x, y);
    if (!tl) return;
    if (tl.key === this.answerKey) {
      this.filled = true; tl.gone = true; chime(SCALE[5]);
      tone(392, .25, { type: 'triangle', vol: .12 }); tone(330, .35, { type: 'triangle', vol: .12, delay: .22 }); // toot toot
      this.drive = .001;
      // The win line is the whole pattern said out loud: "pink, blue, pink, blue, pink, blue!"
      const seqNames = this.seq.slice(0, 6).map(o => this.nameOf(o)).join(LANG === 'fa' ? '، ' : ', ');
      this.win(cap(seqNames) + (LANG === 'fr' ? ' !' : '!'), this.x0 + (this.blankAt + 1.6) * this.carW, this.ty);
    } else { tl.wob = 1; this.miss(this.nameOf(tl.item) + '.'); }
  }
  step(dt) {
    stepTiles(this.tiles, dt);
    if (this.hint) { const g = this.tiles.find(q => q.key === this.answerKey); if (g) g.glow = 1; }
    if (this.drive > 0 && this.drive < 3) this.drive += dt;
  }
  render(tt) {
    const c = cx, cw = this.carW, ch = this.carH, dx = this.drive > 1.4 ? (this.drive - 1.4) * (this.drive - 1.4) * W * .5 : 0;
    c.save(); c.translate(dx, 0);
    // track
    c.strokeStyle = 'rgba(159,180,255,.35)'; c.lineWidth = 6; c.beginPath(); c.moveTo(0 - dx, this.ty + ch * .62); c.lineTo(W - dx, this.ty + ch * .62); c.stroke();
    // engine
    const ex = this.x0 + cw * .55, bounce = Math.sin(tt * 6) * 2;
    c.fillStyle = '#ff5a6e'; roundRect(c, ex - cw * .5, this.ty - ch * .45 + bounce, cw, ch * .9, 14); c.fill();
    c.fillStyle = '#ffc93c'; roundRect(c, ex - cw * .1, this.ty - ch * .85 + bounce, cw * .3, ch * .45, 8); c.fill();
    c.fillStyle = '#cfe3ff'; roundRect(c, ex - cw * .4, this.ty - ch * .3 + bounce, cw * .35, ch * .3, 6); c.fill();
    this.seq.forEach((o, i) => {
      const x = this.x0 + (i + 1.6) * cw, y = this.ty + Math.sin(tt * 6 + i) * 2;
      c.fillStyle = 'rgba(22,29,79,.95)'; roundRect(c, x - cw * .45, y - ch * .45, cw * .9, ch * .9, 14); c.fill();
      const blank = i === this.blankAt && !this.filled;
      c.lineWidth = 4; c.strokeStyle = blank ? `rgba(110,240,194,${.5 + .4 * Math.sin(tt * 5)})` : '#9fb4ff';
      if (blank) c.setLineDash([8, 7]); c.stroke(); c.setLineDash([]);
      c.fillStyle = '#23285e'; for (const s of [-1, 1]) { c.beginPath(); c.arc(x + s * cw * .25, y + ch * .5, ch * .12, 0, TAU); c.fill(); }
      if (blank) { c.fillStyle = '#6ef0c2'; c.font = `800 ${ch * .55}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', x, y); }
      else this.drawToken(c, o, x, y, ch * .34, tt);
    });
    c.restore();
    this.tiles.forEach(tl => {
      if (tl.gone) return;
      const s = Math.max(.01, tl.scale);
      c.save(); c.translate(tl.x, tl.y); c.rotate(Math.sin(tt * 28) * .1 * tl.wob); c.scale(s, s);
      if (tl.glow) { c.shadowColor = 'rgba(110,240,194,.9)'; c.shadowBlur = 22; }
      roundRect(c, -tl.w / 2, -tl.h / 2, tl.w, tl.h, tl.h * .22); c.fillStyle = 'rgba(22,29,79,.95)'; c.fill(); c.shadowBlur = 0;
      c.lineWidth = 4; c.strokeStyle = tl.glow ? '#6ef0c2' : 'rgba(255,255,255,.3)'; c.stroke();
      this.drawToken(c, tl.item, 0, 0, tl.h * .3, tt);
      c.restore();
    });
  }
}

export { TOKENS };
