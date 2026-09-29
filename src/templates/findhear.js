import { chime, pop } from '../audio/audio.js';
import { TAU, pick, randInt, shuffle } from '../core/util.js';
import { drawPlanet, drawRocket, drawSun, drawWordArt, roundRect } from '../engine/art.js';
import { sparkle } from '../engine/particles.js';
import { H, W, cx } from '../engine/stage.js';
import { Template } from '../engine/template.js';
import { MOON_P, PLANETS, SCALE } from '../engine/world.js';
import { lookup, pname, t, word } from '../i18n/i18n.js';

// Find & hear (listening): "Where is Saturn?" / "Find the comet!" / "Where is the rain?" among 2–4
// pictures; opposites ("This rocket goes up. Tap the one going down!"); two-step instructions
// ("Tap the rocket, then the Moon!"). Pictures are drawn in code (not photos yet).
// params: promptKind 'word'|'opposite', set 'planets'|'space-words'|'sky-weather', choices n|[min,max],
//         steps 1|2, pairs [...]
// Letter, sentence and "living needs" modes are authored per language and still planned.









const SPACE_WORDS = ['rocket', 'star', 'moon', 'sun', 'planet', 'astronaut', 'comet', 'telescope', 'satellite', 'ring'];
const SKY = ['sun', 'moon', 'cloud', 'rain', 'snow', 'rainbow'];
const OPP = { 'big-small': ['big', 'small'], 'up-down': ['up', 'down'], 'full-empty': ['full', 'empty'], 'fast-slow': ['fast', 'slow'] };
export class FindHear extends Template {
  makeRound() {
    const p = this.p; this.kind = p.promptKind || 'word'; this.set = p.set || 'space-words';
    const nC = Array.isArray(p.choices) ? randInt(p.choices[0], p.choices[1]) : (p.choices || 3);
    this.order = []; this.got = 0;
    if (this.kind === 'opposite') {
      const pair = pick([].concat(p.pairs || Object.keys(OPP)));
      const [a, b] = OPP[pair], flip = Math.random() < .5; // ask for either side
      this.shown = flip ? b : a; this.want = flip ? a : b; this.pair = pair;
      this.items = shuffle([this.shown, this.want]).map(id => ({ id, wob: 0 }));
      this.order = [this.want];
      this.ask(t(`tpl.find.opp.${this.shown}`));
      return;
    }
    const pool = this.set === 'planets' ? PLANETS.map(q => q.id) : this.set === 'sky-weather' ? SKY : SPACE_WORDS;
    const ids = shuffle(pool).slice(0, Math.max(nC, (p.steps || 1)));
    this.items = ids.map(id => ({ id, wob: 0 }));
    this.order = shuffle(ids).slice(0, p.steps || 1);
    if (this.order.length === 2) this.ask(t('tpl.find.two', { a: this.name(this.order[0]), b: this.name(this.order[1]) }));
    else if (this.set === 'planets') this.ask(t('whereIs', { p: pname(PLANETS.find(q => q.id === this.order[0])) }));
    else if (this.set === 'sky-weather') this.ask(t(`tpl.find.sky.${this.order[0]}`));
    else this.ask(t('findWord', { w: word(this.order[0]) }));
  }
  name(id) { return this.set === 'planets' ? pname(PLANETS.find(q => q.id === id)) : this.set === 'sky-weather' ? lookup(`tpl.find.skyName.${id}`) : word(id); }
  layout() {
    const n = this.items.length, cols = n === 4 && W < H * 1.2 ? 2 : n, rows = Math.ceil(n / cols);
    const cw = Math.min((W - 48) / cols, 280), ch = Math.min((H * .62) / rows, 260), top = Math.max(H * .28, 215);
    this.items.forEach((o, i) => { const r = Math.floor(i / cols), c = i % cols, inRow = Math.min(cols, n - r * cols); o.x = W / 2 + (c - (inRow - 1) / 2) * cw; o.y = top + ch * (r + .5); o.w = cw * .86; o.h = ch * .86; });
  }
  onTap(x, y) {
    const o = this.items.find(q => Math.abs(x - q.x) < q.w / 2 && Math.abs(y - q.y) < q.h / 2);
    if (!o || o.done) return;
    const want = this.order[this.got];
    if (o.id === want) {
      o.done = true; this.got++; pop(); chime(SCALE[this.got + 3]); sparkle(o.x, o.y, 12);
      if (this.got >= this.order.length) this.win(t('tpl.find.yes'), o.x, o.y);
    } else {
      o.wob = 1;
      this.miss(this.kind === 'opposite' ? t(`tpl.find.opp.${this.shown}`) : this.set === 'planets' ? t('thatsP', { p: this.name(o.id) }) : this.set === 'sky-weather' ? t('tpl.find.thatsSky', { w: this.name(o.id) }) : t('thatsWord', { w: word(o.id) }));
    }
  }
  step(dt) { this.items.forEach(o => { o.wob = Math.max(0, o.wob - dt * 1.6); }); }
  render(tt) {
    const c = cx, want = this.order[this.got];
    this.items.forEach(o => {
      c.save(); c.translate(o.x, o.y); c.rotate(Math.sin(tt * 28) * .08 * o.wob);
      if (this.hint && o.id === want) { c.shadowColor = 'rgba(110,240,194,.95)'; c.shadowBlur = 26; }
      roundRect(c, -o.w / 2, -o.h / 2, o.w, o.h, 20); c.fillStyle = o.done ? 'rgba(110,240,194,.18)' : 'rgba(22,29,79,.9)'; c.fill(); c.shadowBlur = 0;
      c.lineWidth = 3; c.strokeStyle = o.done ? '#6ef0c2' : 'rgba(255,255,255,.3)'; c.stroke();
      const s = Math.min(o.w, o.h) * .32;
      if (this.kind === 'opposite') drawOpposite(c, this.pair, o.id, s, tt);
      else if (this.set === 'planets') { const pl = PLANETS.find(q => q.id === o.id); drawPlanet(c, pl, 0, 0, s * (pl.id === 'saturn' ? .6 : .85), tt, {}); }
      else if (this.set === 'sky-weather') drawWeather(c, o.id, s, tt);
      else drawWordArt(c, o.id, 0, 0, s, tt);
      c.restore();
    });
  }
}
function drawOpposite(c, pair, id, s, tt) {
  if (pair === 'big-small') { c.save(); c.scale(id === 'big' ? 1 : .45, id === 'big' ? 1 : .45); drawWordArt(c, 'star', 0, 0, s, tt); c.restore(); }
  else if (pair === 'up-down') { const bob = ((tt * .6) % 1) * s * .6; drawRocket(c, 0, id === 'up' ? s * .3 - bob : -s * .3 + bob, s * .9, id === 'up' ? -Math.PI / 2 : Math.PI / 2, tt, 1); }
  else if (pair === 'full-empty') { const w = s * .8, h = s * 1.6; c.lineWidth = 4; c.strokeStyle = '#e8ecff'; roundRect(c, -w / 2, -h / 2, w, h, 12); c.stroke(); if (id === 'full') { c.fillStyle = '#6ef0c2'; roundRect(c, -w / 2 + 5, -h / 2 + 5, w - 10, h - 10, 8); c.fill(); } }
  else { const sp = id === 'fast' ? 2.2 : .35, x = ((tt * sp) % 1 - .5) * s * 1.6; drawRocket(c, x, 0, s * .7, 0, tt, id === 'fast' ? 1.4 : .2); if (id === 'fast') { c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 3; for (const dy of [-.2, 0, .2]) { c.beginPath(); c.moveTo(x - s * 1.1, dy * s); c.lineTo(x - s * .7, dy * s); c.stroke(); } } }
}
function drawWeather(c, id, s, tt) {
  const cloud = (dx, dy, k, col) => { c.fillStyle = col; for (const [x, y, r] of [[-.35, .05, .3], [0, -.12, .38], [.35, .05, .3], [0, .12, .3]]) { c.beginPath(); c.arc(dx + x * s * k, dy + y * s * k, r * s * k, 0, TAU); c.fill(); } };
  if (id === 'sun') drawSun(c, 0, 0, s * .55, tt, {});
  else if (id === 'moon') drawPlanet(c, MOON_P, 0, 0, s * .7, tt, {});
  else if (id === 'cloud') cloud(0, 0, 1.1, '#e8ecff');
  else if (id === 'rain') { cloud(0, -s * .3, .9, '#b8c2e0'); c.strokeStyle = '#5ea8ff'; c.lineWidth = 4; c.lineCap = 'round'; for (let i = 0; i < 5; i++) { const x = (i - 2) * s * .22, y = s * .2 + ((tt * 1.5 + i * .3) % 1) * s * .45; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 4, y + 14); c.stroke(); } }
  else if (id === 'snow') { cloud(0, -s * .3, .9, '#dfe7f5'); c.fillStyle = '#fff'; for (let i = 0; i < 6; i++) { const x = (i - 2.5) * s * .2, y = s * .15 + ((tt * .6 + i * .27) % 1) * s * .5; c.beginPath(); c.arc(x, y, 5, 0, TAU); c.fill(); } }
  else { ['#ff5a6e', '#ffc93c', '#6ef0c2', '#5ea8ff', '#9f7fff'].forEach((col, i) => { c.strokeStyle = col; c.lineWidth = s * .09; c.beginPath(); c.arc(0, s * .45, s * (.95 - i * .1), Math.PI, TAU); c.stroke(); }); }
}

export { OPP, SKY, SPACE_WORDS, drawOpposite, drawWeather };
