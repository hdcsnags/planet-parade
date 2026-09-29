import { tone } from '../audio/audio.js';
import { say } from '../audio/speech.js';
import { TAU, clamp, randInt } from '../core/util.js';
import { drawPlanet, drawStar } from '../engine/art.js';
import { drawButton, hitButton, makeButton } from '../engine/components.js';
import { sparkle } from '../engine/particles.js';
import { H, T, W, cx } from '../engine/stage.js';
import { Template } from '../engine/template.js';
import { after } from '../engine/timers.js';
import { PLANETS } from '../engine/world.js';
import { t } from '../i18n/i18n.js';

// Echo (Music & Rhythm, built last): listening and playing back. Never a speed score.
//   beat:    a pulsing star keeps a steady beat; she taps along (exploration, never scored)
//   compare: two planet drums play; which was louder / softer, faster / slower, higher / lower, and
//            which tune goes up / down. The ear replays them.
//   echo:    the drum plays 2–4 notes (long, short, a rest); she taps the same back. Checked on the
//            number of taps and the long/short/rest spacing within ±35% of a beat (UNVERIFIED
//            tolerance, CURRICULUM.md), never on speed.
//   melody:  three planet keys play a little tune; she plays it back in order.
// params: mode, bpm [min,max], beats, rests, longShort, attribute, intervalSemitones, notes, keys












const drum = (vol = .3, freq = 110, delay = 0) => { tone(freq, .28, { type: 'sine', vol, slide: .55, delay }); tone(freq * 2.1, .08, { type: 'triangle', vol: vol * .3, delay }); };
const NOTE = [261.63, 329.63, 392.0]; // C E G on Mercury, Venus, Earth
export class Echo extends Template {
  makeRound() {
    const p = this.p; this.mode = p.mode || 'beat'; this.pulse = []; this.taps = []; this.flash = [0, 0, 0];
    this.ear = makeButton('ear', { hidden: this.mode !== 'compare' });
    const [b0, b1] = p.bpm || [70, 90]; this.beat = 60 / randInt(b0, b1);
    if (this.mode === 'beat') {
      this.busy = true; this.count = 0;
      this.ask(t('tpl.echo.beat'), () => { this.busy = false; this.startBeat(); });
    } else if (this.mode === 'compare') {
      this.attr = p.attribute || 'loudness'; this.flip = Math.random() < .5; this.ans = randInt(0, 1);
      this.play(); this.ask(t(`tpl.echo.cmp.${this.attr}${this.flip ? 'B' : 'A'}`));
    } else if (this.mode === 'echo') {
      this.pattern = this.makeRhythm(p); this.phase = 'listen';
      this.busy = true; say(t('tpl.echo.listen')); after(1.2, () => this.playRhythm(() => { this.phase = 'turn'; this.busy = false; this.ask(t('tpl.echo.turn')); }));
    } else { // melody
      this.seq = Array.from({ length: p.notes || 3 }, () => randInt(0, (p.keys || 3) - 1)); this.got = 0;
      this.busy = true; say(t('tpl.echo.melodyListen')); after(1.3, () => this.playMelody(() => { this.busy = false; this.ask(t('tpl.echo.melodyTurn')); }));
    }
  }
  // ---- beat
  startBeat() { const tick = () => { if (this.count >= (this.p.beats || 8) || this.busy) return; this.count++; drum(.18, 90); this.pulse.push(T); after(this.beat, tick); if (this.count >= (this.p.beats || 8)) after(this.beat, () => this.win(t('tpl.echo.beatDone'))); }; tick(); }
  // ---- compare: two sounds, A (left planet) then B (right planet)
  play() {
    const a = this.attr, big = this.ans; // index of the louder/faster/higher/upward one
    const sound = (i, at) => {
      after(at, () => { this.flash[i] = 1; });
      const hi = i === big;
      if (a === 'loudness') for (let k = 0; k < 3; k++) drum(hi ? .45 : .09, 120, at + k * .35);
      else if (a === 'tempo') { const bt = hi ? .2 : .55; for (let k = 0; k < 4; k++) drum(.25, 120, at + k * bt); }
      else if (a === 'pitch') { const f = hi ? 523.25 : 523.25 / Math.pow(2, (this.p.intervalSemitones || 12) / 12); tone(f, .8, { vol: .25, delay: at }); }
      else { const up = hi, notes = up ? [261.63, 329.63, 392] : [392, 329.63, 261.63]; notes.forEach((f, k) => tone(f, .35, { vol: .22, delay: at + k * .38 })); }
    };
    sound(0, .3); sound(1, 2.1);
  }
  // ---- echo: onsets in beats; long notes = 1 beat, short = ½, a rest adds a silent beat
  makeRhythm(p) {
    const n = p.beats || 2, out = []; let tt = 0;
    for (let i = 0; i < n; i++) {
      if (p.rests && i === Math.floor(n / 2)) tt += 1; // one rest in the middle
      out.push(tt);
      tt += p.longShort && i === 1 ? .5 : 1;
      if (p.longShort && i === 1) { out.push(tt); tt += .5; }
    }
    return out;
  }
  playRhythm(done) { const b = this.beat; this.pattern.forEach(o => { drum(.3, 110, o * b); after(o * b, () => { this.flash[1] = 1; }); }); after(this.pattern[this.pattern.length - 1] * b + .8, done); }
  playMelody(done) { this.seq.forEach((k, i) => { tone(NOTE[k], .45, { vol: .25, delay: i * .6 }); after(i * .6, () => { this.flash[k] = 1; }); }); after(this.seq.length * .6 + .4, done); }
  judgeEcho() {
    const want = this.pattern, got = this.taps;
    if (got.length !== want.length) return false;
    const span = want[want.length - 1] - want[0] || 1, gspan = got[got.length - 1] - got[0] || 1, k = gspan / span; // her own tempo is fine
    for (let i = 1; i < want.length; i++) { const e = (want[i] - want[i - 1]) * k, g = got[i] - got[i - 1]; if (Math.abs(g - e) > .35 * k) return false; }
    return true;
  }
  layout() {
    this.pads = [0, 1, 2].map(i => ({ x: W / 2 + (i - 1) * Math.min(W * .28, 300), y: Math.max(H * .52, 360), r: clamp(Math.min(W, H) * .12, 60, 110) }));
    this.ear.r = clamp(Math.min(W, H) * .06, 34, 48); this.ear.x = W - 24 - this.ear.r; this.ear.y = H * .85;
  }
  onTap(x, y) {
    if (this.mode === 'compare' && hitButton([this.ear], x, y)) { this.play(); return; }
    if (this.mode === 'beat') { drum(.3, 150); this.pulse.push(T); sparkle(W / 2, H * .5, 6); return; }
    if (this.mode === 'compare') {
      const i = [0, 1].find(k => Math.hypot(x - this.pads[k * 2].x, y - this.pads[k * 2].y) < this.pads[0].r * 1.2);
      if (i === undefined) return;
      const want = this.flip ? 1 - this.ans : this.ans;
      if (i === want) this.win(t('tpl.echo.yes'), this.pads[i * 2].x, this.pads[i * 2].y);
      else this.miss(t('tpl.echo.listenAgain'));
      return;
    }
    if (this.mode === 'echo') {
      drum(.3, 150); this.flash[1] = 1; this.taps.push(T);
      if (this.taps.length >= this.pattern.length) {
        after(.5, () => {
          if (this.busy) return;
          if (this.judgeEcho()) this.win(t('tpl.echo.echoYes'));
          else { this.taps = []; this.busy = true; this.miss(t('tpl.echo.again')); after(1.6, () => this.playRhythm(() => { this.busy = false; this.ask(t('tpl.echo.turn')); })); }
        });
      }
      return;
    }
    const k = this.pads.findIndex(q => Math.hypot(x - q.x, y - q.y) < q.r * 1.1);
    if (k < 0) return;
    tone(NOTE[k], .4, { vol: .25 }); this.flash[k] = 1;
    if (k === this.seq[this.got]) { this.got++; if (this.got === this.seq.length) this.win(t('tpl.echo.echoYes')); }
    else { this.got = 0; this.busy = true; this.miss(t('tpl.echo.again')); after(1.6, () => this.playMelody(() => { this.busy = false; this.ask(t('tpl.echo.melodyTurn')); })); }
  }
  step(dt) { this.flash = this.flash.map(f => Math.max(0, f - dt * 3)); this.ear.sv += (-160 * (this.ear.scale - 1) - 11 * this.ear.sv) * dt; this.ear.scale += this.ear.sv * dt; }
  render(tt) {
    const c = cx;
    if (this.mode === 'beat' || this.mode === 'echo') {
      const p = this.pads[1], last = this.pulse[this.pulse.length - 1] ?? -9, k = Math.max(0, 1 - (T - last) * 3), f = Math.max(k, this.flash[1]);
      c.save(); c.translate(p.x, p.y);
      const g = c.createRadialGradient(0, 0, p.r * .2, 0, 0, p.r * (1.4 + f * .5)); g.addColorStop(0, 'rgba(255,243,176,.9)'); g.addColorStop(1, 'rgba(255,201,60,0)');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, p.r * (1.4 + f * .5), 0, TAU); c.fill();
      c.fillStyle = '#ffc93c'; drawStar(c, 0, 0, p.r * (.7 + f * .15), tt * .3);
      c.restore();
      if (this.mode === 'echo' && this.pattern) { // the rhythm as dots (long = big, short = small), for grown-ups and big kids
        this.pattern.forEach((o, i) => { const next = this.pattern[i + 1] ?? o + 1, long = next - o >= 1; c.fillStyle = i < this.taps.length ? '#6ef0c2' : 'rgba(255,255,255,.35)'; c.beginPath(); c.arc(W / 2 + (o - this.pattern[this.pattern.length - 1] / 2) * 70, H * .82, long ? 14 : 8, 0, TAU); c.fill(); });
      }
      return;
    }
    const idx = this.mode === 'compare' ? [0, 2] : [0, 1, 2];
    idx.forEach((pi, n) => {
      const p = this.pads[pi], pl = PLANETS[this.mode === 'compare' ? (n ? 0 : 4) : pi], f = this.flash[this.mode === 'compare' ? n : pi];
      const hint = this.hint && (this.mode === 'compare' ? n === (this.flip ? 1 - this.ans : this.ans) : pi === this.seq[this.got]);
      if (f || hint) { c.fillStyle = `rgba(110,240,194,${Math.max(f * .5, hint ? .3 : 0)})`; c.beginPath(); c.arc(p.x, p.y, p.r * 1.4, 0, TAU); c.fill(); }
      drawPlanet(c, pl, p.x, p.y, p.r * (1 + f * .08), tt, { face: true, blink: 1, happy: f > 0 });
    });
    drawButton(c, this.ear, tt, '#2a3380', (g, r) => { g.strokeStyle = '#f6f2ff'; g.lineWidth = r * .12; g.beginPath(); g.arc(0, -r * .05, r * .38, Math.PI * .9, Math.PI * 2.2); g.stroke(); g.beginPath(); g.arc(r * .05, r * .1, r * .14, 0, TAU); g.stroke(); });
  }
}

export { NOTE, drum };
