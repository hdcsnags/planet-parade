import { chime, pop } from '../audio/audio.js';
import { sayQueue } from '../audio/speech.js';
import { TAU, shuffle } from '../core/util.js';
import { drawAstronaut, drawRocket, drawStar, roundRect } from '../engine/art.js';
import { sparkle } from '../engine/particles.js';
import { H, W, cx } from '../engine/stage.js';
import { Template } from '../engine/template.js';
import { SCALE } from '../engine/world.js';
import { LANG, lookup, t } from '../i18n/i18n.js';

// Story sequence: hear a little story, then put the picture cards in order (tap the card that comes
// next; it slides into the next slot). For a cycle (the seasons) she may start anywhere, then must
// keep going around. Cards are drawn in code; the words are in content/i18n (tpl.story.sets.*).
// params: steps 3–5, cardType 'picture', narration, cycle, set 'procedures'|'short-stories'|'local-seasons'
// Seasons are an observation of the local year (Canada and Iran both have four), see
// https://spaceplace.nasa.gov/seasons/ for the grown-ups' "why".










const SETS = { procedures: 3, 'short-stories': 3, 'local-seasons': 4 };
export class StorySequence extends Template {
  makeRound() {
    this.set = this.p.set || 'procedures';
    this.n = Math.min(this.p.steps || SETS[this.set], SETS[this.set]);
    this.cycle = !!this.p.cycle;
    this.lines = lookup(`tpl.story.sets.${this.set}`, LANG) || [];
    let order = shuffle([...Array(this.n).keys()]);
    if (order.every((v, i) => v === i)) order = order.reverse(); // never already in order
    this.cards = order.map(k => ({ k, placed: -1, wob: 0 }));
    this.slots = []; this.startK = null;
    this.busy = true;
    // the story first (untimed), then the question
    const narr = this.p.narration === false ? [] : this.lines.slice(0, this.n).map(text => ({ text }));
    sayQueue([{ text: t('tpl.story.go') }, ...narr], () => { this.busy = false; this.ask(t(this.cycle ? 'tpl.story.firstAny' : 'tpl.story.first')); });
  }
  expected() { // which card k comes next
    const placed = this.slots.length;
    if (!placed) return this.cycle ? null : 0;
    return (this.slots[0] + placed) % this.n;
  }
  layout() {
    const n = this.n, cw = Math.min((W - 64) / n - 16, 300, H * .3 / .85), ch = cw * .85;
    this.cw = cw; this.ch = ch;
    this.cards.forEach((c, i) => { c.hx = W / 2 + (i - (n - 1) / 2) * (cw + 16); c.hy = Math.max(H * .38, 280); });
    this.slotY = Math.min(H * .78, this.cards[0].hy + ch + 60);
    // story order follows reading order: left-to-right, and right-to-left in Farsi
    this.slotX = i => W / 2 + (LANG === 'fa' ? -1 : 1) * (i - (n - 1) / 2) * (cw + 16);
  }
  onTap(x, y) {
    const card = this.cards.find(c => c.placed < 0 && Math.abs(x - c.hx) < this.cw / 2 && Math.abs(y - c.hy) < this.ch / 2);
    if (!card) return;
    const want = this.expected();
    if (want === null || card.k === want) {
      card.placed = this.slots.length; this.slots.push(card.k); pop(); chime(SCALE[this.slots.length + 2]);
      sparkle(this.slotX(card.placed), this.slotY, 8);
      if (this.slots.length === this.n) this.win(t(this.cycle ? 'tpl.story.cycleDone' : 'tpl.story.done'), W / 2, this.slotY);
      else this.ask(t('tpl.story.next'));
    } else { card.wob = 1; this.miss(t('tpl.story.notYet')); }
  }
  step(dt) { this.cards.forEach(c => { c.wob = Math.max(0, c.wob - dt * 1.6); }); }
  render(tt) {
    const c = cx, cw = this.cw, ch = this.ch;
    for (let i = 0; i < this.n; i++) {
      const x = this.slotX(i), y = this.slotY;
      c.save(); c.setLineDash([8, 7]); c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,.3)'; roundRect(c, x - cw / 2, y - ch / 2, cw, ch, 16); c.stroke(); c.restore();
      if (i < this.n - 1 || this.cycle) { const d = LANG === 'fa' ? -1 : 1, ax = x + d * (cw / 2 + 8); c.fillStyle = 'rgba(159,180,255,.5)'; c.beginPath(); c.moveTo(ax - 6 * d, y - 8); c.lineTo(ax + 4 * d, y); c.lineTo(ax - 6 * d, y + 8); c.fill(); }
    }
    const want = this.expected();
    this.cards.forEach(card => {
      const x = card.placed >= 0 ? this.slotX(card.placed) : card.hx, y = card.placed >= 0 ? this.slotY : card.hy;
      c.save(); c.translate(x, y); c.rotate(Math.sin(tt * 28) * .08 * card.wob);
      if (this.hint && card.placed < 0 && (want === null ? card.k === 0 : card.k === want)) { c.shadowColor = 'rgba(110,240,194,.95)'; c.shadowBlur = 24; }
      roundRect(c, -cw / 2, -ch / 2, cw, ch, 16); c.fillStyle = '#1b2360'; c.fill(); c.shadowBlur = 0;
      c.lineWidth = 3; c.strokeStyle = '#9fb4ff'; c.stroke();
      c.save(); roundRect(c, -cw / 2 + 4, -ch / 2 + 4, cw - 8, ch - 8, 12); c.clip();
      drawCard(c, this.set, card.k, cw, ch, tt);
      c.restore(); c.restore();
    });
  }
}
function drawCard(c, set, k, w, h, tt) {
  const s = Math.min(w, h);
  if (set === 'local-seasons') {
    c.fillStyle = ['#bfe3ff', '#9fd3ff', '#ffd9a8', '#dfe7f5'][k]; c.fillRect(-w / 2, -h / 2, w, h);
    c.fillStyle = k === 3 ? '#f4f7ff' : '#7fcf7a'; c.fillRect(-w / 2, h * .28, w, h * .3);
    c.fillStyle = '#7a5230'; c.fillRect(-s * .05, -s * .05, s * .1, s * .38);
    c.strokeStyle = '#7a5230'; c.lineWidth = s * .035; c.beginPath(); c.moveTo(0, 0); c.lineTo(-s * .18, -s * .16); c.moveTo(0, -s * .02); c.lineTo(s * .17, -s * .18); c.stroke();
    if (k < 3) {
      const col = ['#8fd18a', '#3fa34d', '#f08a1c'][k];
      c.fillStyle = col; for (const [dx, dy, r] of [[0, -.24, .2], [-.16, -.16, .15], [.16, -.17, .15]]) { c.beginPath(); c.arc(dx * s, dy * s, r * s, 0, TAU); c.fill(); }
      if (k === 0) { c.fillStyle = '#ff9ec9'; for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(Math.cos(i * 1.7) * s * .2, -s * .2 + Math.sin(i * 2.3) * s * .12, s * .03, 0, TAU); c.fill(); } }
      if (k === 2) { c.fillStyle = '#f5a623'; for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(-s * .25 + i * s * .16, s * .22, s * .03, s * .018, i, 0, TAU); c.fill(); } }
    } else { c.fillStyle = '#fff'; for (let i = 0; i < 12; i++) { c.beginPath(); c.arc(-w / 2 + ((i * 37) % 100) / 100 * w, -h / 2 + ((i * 53) % 100) / 100 * h * .7, s * .02, 0, TAU); c.fill(); } }
    return;
  }
  c.fillStyle = '#0f1440'; c.fillRect(-w / 2, -h / 2, w, h);
  c.fillStyle = '#fff'; for (let i = 0; i < 6; i++) drawStar(c, -w / 2 + ((i * 41) % 100) / 100 * w, -h / 2 + ((i * 29) % 60) / 100 * h, s * .02, 0);
  if (set === 'procedures') {
    if (k === 0) { drawAstronaut(c, 0, s * .08, s * .3, tt); c.strokeStyle = '#6ef0c2'; c.lineWidth = 3; c.beginPath(); c.moveTo(s * .3, -s * .35); c.lineTo(s * .12, -s * .2); c.stroke(); }
    else if (k === 1) { drawRocket(c, s * .12, 0, s * .42, -Math.PI / 2, tt, 0); drawAstronaut(c, -s * .22, s * .12, s * .2, tt); }
    else { drawRocket(c, 0, -s * .08, s * .42, -Math.PI / 2, tt, 1.2); }
  } else {
    c.fillStyle = '#cfccc6'; c.beginPath(); c.ellipse(0, h * .52, w * .7, h * .28, 0, Math.PI, TAU); c.fill();
    if (k === 0) drawRocket(c, 0, -s * .1, s * .36, -Math.PI / 2, tt, .8); // landing, engine glowing
    else if (k === 1) { drawRocket(c, s * .2, s * .02, s * .34, -Math.PI / 2, tt, 0); drawAstronaut(c, -s * .18, s * .1, s * .2, tt); }
    else { drawAstronaut(c, -s * .12, s * .1, s * .2, tt); c.strokeStyle = '#e8ecff'; c.lineWidth = 3; c.beginPath(); c.moveTo(s * .16, s * .24); c.lineTo(s * .16, -s * .2); c.stroke(); c.fillStyle = '#ff5a6e'; c.fillRect(s * .16, -s * .2, s * .2, s * .13); }
  }
}

export { SETS, drawCard };
