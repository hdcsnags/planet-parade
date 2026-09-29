import { settings } from '../core/settings.js';

/* ---------- audio ---------- */
let ac = null, master = null;
function unlockAudio() {
  if (!ac) {
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = .55; master.connect(ac.destination); } catch (e) { ac = null; }
  }
  if (ac && ac.state === 'suspended') ac.resume().catch(() => {});
}
function tone(freq, dur = .4, { type = 'sine', vol = .3, delay = 0, slide = 0 } = {}) {
  if (!ac || !settings.sound) return;
  const t0 = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t0 + dur);
  g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + .015); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
  o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + .05);
}
function chime(f, delay = 0) { tone(f, .9, { vol: .22, delay }); tone(f * 2, .6, { vol: .07, delay, type: 'triangle' }); tone(f * 3.01, .3, { vol: .03, delay }); }
const pop = () => tone(560, .14, { type: 'triangle', vol: .25, slide: .45 });
const boop = () => { tone(330, .16, { vol: .18, slide: .7 }); tone(250, .22, { vol: .15, slide: .7, delay: .12 }); };
const fanfare = () => [0, 4, 7, 12].forEach((s, i) => chime(523.25 * Math.pow(2, s / 12), i * .12));
function whoosh(dur = 1.2) {
  if (!ac || !settings.sound) return;
  const len = Math.floor(ac.sampleRate * dur), buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(), t0 = ac.currentTime;
  src.buffer = buf; f.type = 'bandpass'; f.Q.value = 1.4;
  f.frequency.setValueAtTime(260, t0); f.frequency.exponentialRampToValueAtTime(2000, t0 + dur * .55); f.frequency.exponentialRampToValueAtTime(420, t0 + dur);
  g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(.32, t0 + .2); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
  src.connect(f); f.connect(g); g.connect(master); src.start();
}

export { ac, boop, chime, fanfare, master, pop, tone, unlockAudio, whoosh };
