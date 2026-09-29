import { chime, fanfare, pop, whoosh } from '../../audio/audio.js';
import { say, sayQueue } from '../../audio/speech.js';
import { logUse, settings } from '../../core/settings.js';
import { $, TAU, clamp, pick, shuffle } from '../../core/util.js';
import { drawWordArt, roundRect, tapGate } from '../../engine/art.js';
import { spring } from '../../engine/body.js';
import { gridFit } from '../../engine/layout.js';
import { COLORS, burst, sparkle } from '../../engine/particles.js';
import { H, T, W, cx } from '../../engine/stage.js';
import { after } from '../../engine/timers.js';
import { SCALE } from '../../engine/world.js';
import { I18N, LANG, LANGS, bang, cap, fontFor, t, word } from '../../i18n/i18n.js';

/* ================= Game 6: Space Words ================= */
// Four big cards at a time with arrows to page through the ten words. A tapped card comes alive as a
// toy and says a two-word phrase; the globe replays the word in the other two languages.
const WORD_IDS = ['rocket', 'star', 'moon', 'sun', 'planet', 'astronaut', 'comet', 'telescope', 'satellite', 'ring'];
const CARD_HUES = ['#ff7eb6', '#ffc93c', '#cfccc6', '#ff9a5c', '#5ea8ff', '#e8ecff', '#9fe3e6', '#9fb4ff', '#ffe08a', '#f2c48f'];
const act = (id, lang = LANG) => I18N.acts[id][lang];
function WordsMode() {
  const PER = 4, PAGES = Math.ceil(WORD_IDS.length / PER), ANIM = 1.4;
  let sub = 'explore', page = 0, cards = [], target = null, last = null, busy = false, wrong = 0, idle = 0, arrowsAt = [];
  const pageIds = p => Array.from({ length: PER }, (_, k) => WORD_IDS[(p * PER + k) % WORD_IDS.length]);
  const mkCards = ids => ids.map(id => ({ id, i: WORD_IDS.indexOf(id), x: W / 2, y: H / 2, tx: W / 2, ty: H / 2, w: 10, h: 10, scale: .01, sv: 0, wob: 0, glow: 0, alpha: 1, fade: false, animT: -9, gkey: {} }));
  const arrowR = () => clamp(Math.min(W, H) * .065, 34, 50);
  function layout() {
    const find = sub === 'find', narrow = W < 640, r = arrowR();
    const y0 = find ? Math.max(H * .22, 160) : Math.max(100, H * .13);
    const y1 = H - 20 - (!find && narrow ? r * 2 + 16 : 0);
    const side = !find && !narrow ? r * 2 + 20 : 0;
    const g = gridFit(cards.length, 16 + side, y0, W - 32 - side * 2, y1 - y0, 1.12);
    cards.forEach((cd, i) => { const s = Math.min(g[i].s, Math.min(W, H) * .55); cd.w = s * .9; cd.h = s * 1.12 * .9; cd.tx = g[i].x; cd.ty = g[i].y; });
    arrowsAt = find ? [] : narrow
      ? [{ dir: -1, x: W / 2 - r - 24, y: H - 20 - r, r }, { dir: 1, x: W / 2 + r + 24, y: H - 20 - r, r }]
      : [{ dir: -1, x: 16 + r, y: (y0 + y1) / 2, r }, { dir: 1, x: W - 16 - r, y: (y0 + y1) / 2, r }];
  }
  const snap = () => cards.forEach(cd => { cd.x = cd.tx; cd.y = cd.ty; });
  const globe = cd => { const r = clamp(cd.w * .12, 28, 40); return { x: cd.x + cd.w / 2 - r - 6, y: cd.y - cd.h / 2 + r + 6, r }; };
  function setFindIcon() { $('#findIcon').hidden = sub === 'find'; $('#gridIcon').hidden = sub !== 'find'; }
  function showPage(dir = 0) {
    sub = 'explore'; busy = false; cards = mkCards(pageIds(page)); layout(); snap();
    if (dir) cards.forEach(cd => { cd.x += dir * W * .35; });
    setFindIcon();
  }
  function ask() { idle = 0; say(t('findWord', { w: word(target.id) })); }
  function round() {
    sub = 'find';
    const n = clamp(settings.choices, 2, 4);
    const tid = pick(WORD_IDS.filter(id => id !== last)); last = tid;
    cards = mkCards(shuffle([tid, ...shuffle(WORD_IDS.filter(id => id !== tid)).slice(0, n - 1)]));
    target = cards.find(cd => cd.id === tid);
    layout(); snap(); wrong = 0; busy = false; setFindIcon(); ask();
  }
  function drawArrow(c, a, t) {
    c.save(); c.translate(a.x, a.y);
    c.fillStyle = 'rgba(22,29,79,.92)'; c.beginPath(); c.arc(0, 0, a.r, 0, TAU); c.fill();
    c.lineWidth = 3; c.strokeStyle = `rgba(110,240,194,${.55 + .25 * Math.sin(t * 3)})`; c.stroke();
    c.strokeStyle = '#f6f2ff'; c.lineWidth = a.r * .16; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(-a.dir * a.r * .15, -a.r * .38); c.lineTo(a.dir * a.r * .25, 0); c.lineTo(-a.dir * a.r * .15, a.r * .38); c.stroke();
    c.restore();
  }
  function drawGlobe(c, g) {
    c.save(); c.translate(g.x, g.y);
    c.fillStyle = 'rgba(159,180,255,.95)'; c.beginPath(); c.arc(0, 0, g.r, 0, TAU); c.fill();
    c.strokeStyle = '#0a0e2a'; c.lineWidth = Math.max(2, g.r * .09);
    const k = g.r * .58;
    c.beginPath(); c.arc(0, 0, k, 0, TAU); c.stroke();
    c.beginPath(); c.ellipse(0, 0, k * .45, k, 0, 0, TAU); c.stroke();
    c.beginPath(); c.moveTo(-k, 0); c.lineTo(k, 0); c.stroke();
    c.restore();
  }
  function drawCard(c, cd, t) {
    if (cd.alpha <= .01) return;
    const s = Math.max(.001, cd.scale), w = cd.w, h = cd.h, hue = CARD_HUES[cd.i], a = clamp((T - cd.animT) / ANIM, 0, 1);
    c.save(); c.globalAlpha = cd.alpha; c.translate(cd.x, cd.y); c.rotate(Math.sin(t * 28) * .1 * cd.wob); c.scale(s, s);
    if (cd.glow) { c.shadowColor = 'rgba(110,240,194,.9)'; c.shadowBlur = 24 + 10 * Math.sin(t * 5); }
    roundRect(c, -w / 2, -h / 2, w, h, Math.min(w, h) * .14);
    const g = c.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, '#222c6e'); g.addColorStop(1, '#141a46');
    c.fillStyle = g; c.fill(); c.shadowBlur = 0;
    c.lineWidth = 3.5; c.strokeStyle = hue; c.stroke();
    drawWordArt(c, cd.id, 0, -h * .1, Math.min(w, h) * .3, t, a < 1 ? a : 0);
    const fs = clamp(w * .12, 16, 34);
    c.fillStyle = '#f6f2ff'; c.font = `800 ${fs}px ${fontFor()}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(word(cd.id), 0, h * .37, w * .92);
    c.restore();
    if (sub === 'explore') { c.save(); c.globalAlpha = cd.alpha; drawGlobe(c, globe(cd)); c.restore(); }
  }
  return {
    layout,
    start(subMode) { if (subMode === 'find') round(); else { showPage(); say(t('wordsIntro')); } },
    repeat() { if (sub === 'find') ask(); else say(t('wordsIntro')); },
    toggle() { if (sub === 'find') showPage(); else round(); },
    tap(x, y) {
      if (busy) return;
      idle = 0;
      if (sub === 'explore') {
        const ar = arrowsAt.find(q => Math.hypot(x - q.x, y - q.y) < q.r + 12);
        if (ar) { if (!tapGate(ar)) return; pop(); page = (page + ar.dir + PAGES) % PAGES; showPage(ar.dir); return; }
        const gcard = cards.find(cd => { const g = globe(cd); return Math.hypot(x - g.x, y - g.y) < g.r + 8; });
        if (gcard) {
          if (!tapGate(gcard.gkey)) return;
          gcard.sv += 3; pop();
          sayQueue(LANGS.filter(l => l !== LANG).map(l => ({ text: cap(word(gcard.id, l)) + bang(l), lang: l })));
          return;
        }
      }
      const cd = cards.find(q => Math.abs(x - q.x) < q.w / 2 && Math.abs(y - q.y) < q.h / 2);
      if (!cd || !tapGate(cd)) return;
      if (sub === 'explore') {
        cd.sv += 4; cd.animT = T; chime(SCALE[cd.i % 9]); sparkle(cd.x, cd.y - cd.h * .3, 10); logUse('words', cd.id);
        if (cd.id === 'rocket' || cd.id === 'comet') whoosh(.9);
        say(act(cd.id));
      } else if (cd === target) {
        busy = true; cd.sv += 7; cd.glow = 0; cd.animT = T; fanfare(); burst(cd.x, cd.y, 44, COLORS, 1.1);
        cards.forEach(o => { if (o !== cd) o.fade = true; });
        say(t('yesWord', { w: word(cd.id) }));
        after(2.8, round);
      } else {
        cd.wob = 1; wrong++;
        say(t('thatsWord', { w: word(cd.id) }));
        if (wrong >= 2) target.glow = 1;
      }
    },
    update(dt) {
      idle += dt;
      cards.forEach(cd => {
        spring(cd, dt); cd.wob = Math.max(0, cd.wob - dt * 1.6);
        if (cd.fade) cd.alpha = Math.max(.18, cd.alpha - dt * 2);
        const k = Math.min(1, dt * 5); cd.x += (cd.tx - cd.x) * k; cd.y += (cd.ty - cd.y) * k;
      });
      if (sub === 'find' && !busy && idle > 9) { target.glow = 1; ask(); }
    },
    draw(t) {
      cards.forEach(cd => drawCard(cx, cd, t));
      arrowsAt.forEach(a => drawArrow(cx, a, t));
    },
  };
}

export { CARD_HUES, WORD_IDS, WordsMode, act };
