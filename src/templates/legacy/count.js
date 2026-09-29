import { boop, chime, fanfare, pop, tone, whoosh } from '../../audio/audio.js';
import { say, showCaption } from '../../audio/speech.js';
import { logUse, saveSettings, settings } from '../../core/settings.js';
import { TAU, clamp, pick, rand, randInt, reduced, shuffle } from '../../core/util.js';
import { drawPlanet, drawPosArrow, drawRocket, drawSlotFrame, drawWhale, goldStar, roundRect, tapGate } from '../../engine/art.js';
import { spring } from '../../engine/body.js';
import { gridFit } from '../../engine/layout.js';
import { COLORS, burst, sparkle, trail } from '../../engine/particles.js';
import { H, W, cx } from '../../engine/stage.js';
import { after } from '../../engine/timers.js';
import { MOON_P, SCALE } from '../../engine/world.js';
import { LANG, bang, cap, fmt, fontFor, num, plural, posLabel, posWord, qty, t, word } from '../../i18n/i18n.js';

/* ================= Game 5: Count & Add ================= */
// Rounds cycle count → add → which has more → take away → make N → left/middle/right.
// Objects are always on screen and a counting track along the bottom fills with pictures as she
// counts. Wrong answers just name themselves; nothing ever says "wrong".
// Gentle adaptive difficulty: `lvl` is the biggest number used right now. Three first-try wins in a
// row step it up (never past the grown-ups' "highest number"); two misses step it back down.
function CountMode() {
  const KINDS = ['star', 'rocket', 'moon'], TYPES = ['count', 'add', 'more', 'take', 'make', 'lmr'];
  let things = [], tiles = [], kind = 'star', type = 'count', answer = 0, busy = true, counted = 0, idle = 0, roundNo = 0;
  let split = false, promptText = '', moreSide = 0, moreWrong = 0, panels = [], trackY = 0;
  let takeStyle = 'fly', whale = null, ramp = null, plus = null, makeTarget = 0, lmrPos = -1, arrow = null, missed = false;
  let lvl = clamp(settings.countLvl || Math.min(3, settings.maxNum), Math.min(2, settings.maxNum), settings.maxNum), streak = 0, missRun = 0;
  function noteWin() {
    if (!missed) { missRun = 0; if (++streak >= 3) { streak = 0; lvl = Math.min(settings.maxNum, lvl + 1); } }
    settings.countLvl = lvl; saveSettings();
  }
  function noteMiss() {
    missed = true; streak = 0;
    if (++missRun >= 2) { missRun = 0; lvl = Math.max(Math.min(2, settings.maxNum), lvl - 1); settings.countLvl = lvl; saveSettings(); }
  }
  // ±1 by default; "up to 3" lets adaptive mode use ±2 (and ±3 once numbers are big).
  const stepMax = () => settings.step === 3 ? (lvl >= 6 ? 3 : lvl >= 4 ? 2 : 1) : 1;
  const top = () => Math.max(H * .2, 150);
  const tileH = () => clamp(H * .17, 96, 150);
  const plusR = () => clamp(Math.min(W, H) * .07, 38, 54);
  const live = () => things.filter(o => !o.gone && !o.fly && !o.roll);
  const hasTrack = () => type !== 'more' && type !== 'lmr';
  const trackCount = () => type === 'make' ? Math.max(makeTarget, live().length) : live().length;
  function mk(n, grp, k = kind) {
    return Array.from({ length: n }, () => ({ kind: k, grp, x: W / 2, y: H / 2, tx: W / 2, ty: H / 2, R: 30, scale: .01, sv: 0, wob: 0, happy: 0, counted: 0, gone: false, fly: null, roll: null, hint: 0, phase: rand(0, TAU) }));
  }
  function place(list, x0, y0, w, h) {
    const g = gridFit(list.length, x0, y0, w, h);
    list.forEach((o, i) => { o.R = Math.min(g[i].s * .36, Math.min(W, H) * .13); o.tx = g[i].x; o.ty = g[i].y; });
  }
  function trackGeom(n) {
    const room = W - 48;
    let per = n, r = clamp(room / (n * 2.3), 18, 28);
    if (n * r * 2.3 > room) { per = Math.ceil(n / 2); r = clamp(room / (per * 2.3), 18, 28); }
    const rows = Math.ceil(n / per);
    return { r, per, rows, h: rows * r * 2.3 + 14 };
  }
  function layout() {
    const below = tiles.length ? tileH() + 30 : plus ? plusR() * 2 + 34 : 16;
    const track = hasTrack() ? trackGeom(Math.max(1, trackCount())).h : 0;
    const y0 = top(), y1 = H - below - track, x0 = 16, w = W - 32, h = Math.max(80, y1 - y0);
    trackY = H - below - track / 2;
    const L = live();
    if (type === 'lmr') {
      // Three things in one row, left to right on screen. Never mirrored for Farsi.
      const cw = w / 3; panels = [];
      L.forEach((o, i) => { o.R = Math.min(cw * .28, h * .28, Math.min(W, H) * .14); o.tx = x0 + cw * (i + .5); o.ty = y0 + h * .42; });
    } else if (split || type === 'more') {
      const hw = w * .5 - 12;
      panels = [{ x: x0, y: y0, w: hw, h }, { x: x0 + w * .5 + 12, y: y0, w: hw, h }];
      [0, 1].forEach(gi => place(L.filter(o => o.grp === gi), panels[gi].x + 10, y0 + 10, hw - 20, h - 20));
    } else { panels = []; place(L, x0, y0, w, h); }
    const th = tileH(), tw = Math.min(W * .36, th * 1.45);
    tiles.forEach((tl, i) => { tl.w = tw; tl.h = th; tl.x = W / 2 + (i - (tiles.length - 1) / 2) * (tw + 28); tl.y = H - th / 2 - 22; });
    if (plus) { plus.r = plusR(); plus.x = W / 2; plus.y = H - plus.r - 20; }
  }
  const snap = list => list.forEach(o => { o.x = o.tx; o.y = o.ty; });
  function makeTiles() {
    let d = answer + (Math.random() < .5 ? -1 : 1);
    if (d < 1 || d > Math.max(lvl, answer + 1)) d = answer === 1 ? 2 : answer - 1;
    tiles = shuffle([answer, d]).map(n => ({ n, x: W / 2, y: H, w: 10, h: 10, scale: .01, sv: 0, wob: 0, glow: 0 }));
  }
  // The question stays on screen while she thinks; a spoken number briefly replaces it, then it returns.
  const ask = (text, extra) => { promptText = text; say(text, { persist: true, onend: extra }); };
  const restorePrompt = () => { if (!busy && promptText) showCaption(promptText, LANG, true); };
  function newRound(forced) {
    busy = true; tiles = []; counted = 0; idle = 0; split = false; promptText = ''; moreWrong = 0; things = [];
    whale = null; ramp = null; plus = null; lmrPos = -1; arrow = null; missed = false;
    type = forced || TYPES[roundNo % TYPES.length]; roundNo++;
    kind = pick(KINDS);
    const M = Math.max(2, lvl), S = stepMax();
    if (type === 'count') {
      answer = randInt(1, M); things = mk(answer, 0); layout(); snap(things);
      ask(t('countIntro', { pl: plural(kind) })); busy = false;
    } else if (type === 'add') {
      const b = randInt(1, Math.min(S, M - 1)), a = randInt(1, M - b); answer = a + b;
      things = mk(a, 0); split = true; layout(); snap(things);
      say(cap(qty(a, kind)) + bang());
      after(1.5, () => {
        const B = mk(b, 1); B.forEach(o => { o.x = W + 80; o.y = H * .45; }); things.push(...B); layout(); whoosh(.8);
        ask(t(b === 1 ? 'addOne' : 'addMany', { a: cap(qty(a, kind)), b: num(b) }));
      });
      after(2.9, () => { split = false; makeTiles(); layout(); busy = false; restorePrompt(); });
    } else if (type === 'take') {
      const b = randInt(1, Math.min(S, M - 1)), a = randInt(b + 1, M); answer = a - b;
      takeStyle = pick(['fly', 'whale', 'roll']);
      things = mk(a, 0); layout(); snap(things);
      say(cap(qty(a, kind)) + bang());
      after(1.5, () => {
        const going = shuffle(live()).slice(0, b).sort((p, q) => p.x - q.x);
        if (takeStyle === 'fly') { going.forEach(o => { o.fly = { vy: -40, vx: rand(-60, 60) }; }); whoosh(.9); }
        else if (takeStyle === 'whale') {
          const R = Math.min(W, H) * .11;
          whale = { x: -R * 2.4, y: going.reduce((s, o) => s + o.y, 0) / going.length, R, eat: going };
          tone(110, .9, { vol: .12, slide: 1.6 });
        } else {
          const y0 = Math.max(...going.map(o => o.ty + o.R)), x0 = Math.min(...going.map(o => o.x)) - 20;
          ramp = { x0, y0, slope: .22 };
          going.forEach((o, k) => { o.roll = { vx: 0, delay: k * .22, spin: 0 }; });
        }
        const key = { fly: 'take', whale: 'eat', roll: 'roll' }[takeStyle] + (b === 1 ? 'One' : 'Many');
        const bWord = takeStyle === 'whale' || LANG === 'fa' ? num(b) : cap(num(b));
        ask(t(key, { a: cap(qty(a, kind)), b: bWord }));
      });
      after(3.6, () => { makeTiles(); layout(); busy = false; restorePrompt(); });
    } else if (type === 'make') {
      makeTarget = randInt(1, M);
      let k = randInt(0, M); if (k === makeTarget) k = makeTarget === 1 ? 2 : makeTarget - 1;
      things = mk(k, 0); plus = { x: W / 2, y: H, r: 40, scale: 1, sv: 0 }; layout(); snap(things);
      ask(t('makeN', { a: qty(makeTarget, kind) }), () => say(t('makeHint'), { onend: restorePrompt }));
      busy = false;
    } else if (type === 'lmr') {
      lmrPos = randInt(0, 2);
      things = shuffle(KINDS).map(k => mk(1, 0, k)[0]); layout(); snap(things);
      ask(t('whichOneAt', { pos: posWord(lmrPos) })); busy = false;
    } else { // which has more: no numerals, just two groups side by side
      const hi = Math.max(3, Math.min(M + 1, 6)), gap = hi >= 4 ? 2 : 1;
      let a, b;
      do { a = randInt(1, hi); b = randInt(1, hi); } while (Math.abs(a - b) < gap);
      moreSide = a > b ? 0 : 1; answer = Math.max(a, b);
      things = [...mk(a, 0), ...mk(b, 1)]; layout(); snap(things);
      ask(t('whichMore', { pl: plural(kind) })); busy = false;
    }
  }
  function win(line) {
    busy = true; fanfare(); burst(W / 2, H * .45, 44, COLORS, 1.1);
    live().forEach(o => { if (type !== 'more' || o.grp === moreSide) { o.sv += 5; o.happy = 1.6; } });
    noteWin(); promptText = '';
    const n = type === 'make' ? makeTarget : answer;
    if (type !== 'more' && type !== 'lmr') logUse('nums', n);
    say(line || (type === 'more' ? t('moreYes') : type === 'count' ? t('countDone', { a: cap(qty(n, kind)) }) : t('countYes', { a: qty(n, kind) })));
    after(3.4, () => newRound());
  }
  function checkMake() {
    const n = live().length;
    say(cap(num(n)) + bang(), { onend: restorePrompt });
    if (n === makeTarget) { busy = true; after(.7, () => win()); }
  }
  function addOne() {
    if (live().length >= 10) { plus.sv += 2; boop(); return; }
    const o = mk(1, 0)[0]; o.x = plus.x; o.y = plus.y; things.push(o);
    plus.sv += 4; chime(SCALE[Math.min(8, live().length)]); layout(); checkMake();
  }
  function drawThing(c, o, t) {
    const s = Math.max(.001, o.scale), bob = (reduced || o.fly || o.roll) ? 0 : Math.sin(t * 1.6 + o.phase) * o.R * .05;
    const face = settings.faces ? { blink: 1, happy: o.happy > 0, look: { x: 0, y: 0 } } : null;
    c.save(); c.translate(o.x, o.y + bob); c.rotate(Math.sin(t * 28) * .16 * o.wob + (o.roll ? o.roll.spin : 0)); c.scale(s, s);
    if (o.counted || o.hint) {
      const al = o.counted ? .45 : .35 + .3 * Math.sin(t * 5), g = c.createRadialGradient(0, 0, o.R * .6, 0, 0, o.R * 1.5);
      g.addColorStop(0, `rgba(110,240,194,${al})`); g.addColorStop(1, 'rgba(110,240,194,0)');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, o.R * 1.5, 0, TAU); c.fill();
    }
    if (o.kind === 'star') goldStar(c, 0, 0, o.R * 1.05, t, face);
    else if (o.kind === 'rocket') drawRocket(c, 0, 0, o.R * 1.05, -Math.PI / 2, t, o.fly ? 1 : .35);
    else drawPlanet(c, MOON_P, 0, 0, o.R * .82, t, face ? { face: true, ...face } : {});
    c.restore();
    if (o.counted && !o.fly) {
      const r = Math.max(16, o.R * .32), bx = o.x, by = o.y + bob - o.R * 1.2;
      c.fillStyle = '#6ef0c2'; c.beginPath(); c.arc(bx, by, r, 0, TAU); c.fill();
      c.fillStyle = '#0a0e2a'; c.font = `800 ${r * 1.25}px ${fontFor()}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(fmt(o.counted), bx, by + r * .06);
    }
  }
  // One slot per object (at least 36 px across, two rows if needed), filling with the object's own
  // picture as she counts, left-to-right (right-to-left in Farsi). In Make N the slots show the target;
  // extra objects beyond it show as pink slots.
  function drawTrack(c, t) {
    const n = trackCount();
    if (!n) return;
    const { r, per, rows } = trackGeom(n), gap = r * 2.3, have = live().length;
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / per), col = i % per, inRow = Math.min(per, n - row * per);
      let x = W / 2 + (col - (inRow - 1) / 2) * gap;
      if (LANG === 'fa') x = W - x; // reading order only; this is a count, not a left/right answer
      const y = trackY + (row - (rows - 1) / 2) * gap;
      const filled = type === 'make' ? i < have : i < counted, extra = type === 'make' && i >= makeTarget;
      c.save();
      if (filled) {
        c.fillStyle = extra ? 'rgba(255,126,182,.3)' : 'rgba(110,240,194,.28)'; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
        c.lineWidth = 3; c.strokeStyle = extra ? '#ff7eb6' : '#6ef0c2'; c.stroke();
        if (kind === 'star') goldStar(c, x, y, r * .72, t, null);
        else if (kind === 'rocket') drawRocket(c, x, y, r * .72, -Math.PI / 2, t, 0);
        else drawPlanet(c, MOON_P, x, y, r * .62, t, {});
      } else {
        c.setLineDash([5, 6]); c.lineWidth = 3;
        const next = type === 'make' ? i === have : i === counted;
        c.strokeStyle = next && !busy ? `rgba(110,240,194,${.5 + .4 * Math.sin(t * 5)})` : 'rgba(255,255,255,.34)';
        c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke();
      }
      c.restore();
    }
  }
  function drawTile(c, tl, t) {
    const s = Math.max(.001, tl.scale), w = tl.w, h = tl.h;
    c.save(); c.translate(tl.x, tl.y); c.rotate(Math.sin(t * 28) * .1 * tl.wob); c.scale(s, s);
    roundRect(c, -w / 2, -h / 2, w, h, h * .22);
    c.fillStyle = 'rgba(22,29,79,.94)'; c.fill();
    c.lineWidth = 4; c.strokeStyle = tl.glow ? `rgba(110,240,194,${.55 + .45 * Math.sin(t * 5)})` : 'rgba(255,255,255,.3)'; c.stroke();
    c.fillStyle = '#ffc93c'; c.font = `800 ${h * .42}px ${fontFor()}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(fmt(tl.n), 0, -h * .13);
    const perRow = Math.min(tl.n, 5), rows = Math.ceil(tl.n / 5), dr = Math.min(h * .065, w / (perRow * 2.8));
    for (let i = 0; i < tl.n; i++) {
      const row = Math.floor(i / 5), col = i % 5, inRow = Math.min(5, tl.n - row * 5);
      c.fillStyle = '#6ef0c2'; c.beginPath();
      c.arc((col - (inRow - 1) / 2) * dr * 2.8, h * .24 + (row - (rows - 1) / 2) * dr * 2.6, dr, 0, TAU); c.fill();
    }
    c.restore();
  }
  function drawPlus(c, t) {
    const s = Math.max(.001, plus.scale), r = plus.r;
    c.save(); c.translate(plus.x, plus.y); c.scale(s, s);
    c.shadowColor = 'rgba(110,240,194,.8)'; c.shadowBlur = 18;
    c.fillStyle = '#6ef0c2'; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill(); c.shadowBlur = 0;
    c.strokeStyle = '#0a0e2a'; c.lineWidth = r * .2; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-r * .45, 0); c.lineTo(r * .45, 0); c.moveTo(0, -r * .45); c.lineTo(0, r * .45); c.stroke();
    c.restore();
  }
  function drawRamp(c) {
    const x1 = W + 40, y1 = ramp.y0 + (x1 - ramp.x0) * ramp.slope;
    c.save(); c.lineCap = 'round';
    c.strokeStyle = '#ff7eb6'; c.lineWidth = 12; c.beginPath(); c.moveTo(ramp.x0, ramp.y0); c.lineTo(x1, y1); c.stroke();
    c.strokeStyle = '#fff3b0'; c.lineWidth = 12; c.setLineDash([14, 14]); c.beginPath(); c.moveTo(ramp.x0, ramp.y0); c.lineTo(x1, y1); c.stroke();
    c.restore();
  }
  function tapMore(x, y) {
    const side = panels.findIndex(p => x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h);
    if (side < 0 || !tapGate(panels[side])) return;
    if (side === moreSide) { win(); return; }
    const grp = live().filter(o => o.grp === side);
    grp.forEach(o => { o.wob = 1; });
    noteMiss(); moreWrong++;
    if (moreWrong >= 2) live().forEach(o => { o.hint = o.grp === moreSide ? 1 : 0; });
    say(cap(qty(grp.length, kind)) + '.', { onend: restorePrompt });
  }
  function tapLmr(o) {
    const i = things.indexOf(o); // 0 = screen left, 1 = middle, 2 = screen right (never mirrored)
    if (i === lmrPos) {
      arrow = { i };
      win(t('yesTheAt', { w: word(o.kind), W: cap(word(o.kind)), pos: posWord(i) }));
    } else {
      o.wob = 1; noteMiss();
      say(t('thatsTheAt', { w: word(o.kind), pos: posWord(i) }), { onend: restorePrompt });
    }
  }
  return {
    layout,
    start(sub) { newRound(TYPES.includes(sub) ? sub : undefined); },
    repeat() { if (promptText) ask(promptText); },
    tap(x, y) {
      if (busy) return;
      idle = 0;
      if (type === 'more') { tapMore(x, y); return; }
      if (plus && Math.hypot(x - plus.x, y - plus.y) < plus.r + 14) { if (tapGate(plus)) addOne(); return; }
      const tl = tiles.find(q => Math.abs(x - q.x) < q.w / 2 && Math.abs(y - q.y) < q.h / 2);
      if (tl) {
        if (!tapGate(tl)) return;
        if (tl.n === answer) win();
        else { tl.wob = 1; noteMiss(); say(cap(num(tl.n)) + bang(), { onend: restorePrompt }); }
        return;
      }
      const o = [...live()].reverse().find(q => Math.hypot(x - q.x, y - q.y) < Math.max(q.R * 1.25, 44));
      if (!o || !tapGate(o)) return;
      if (type === 'lmr') { tapLmr(o); return; }
      if (type === 'make') { o.fly = { vy: -80, vx: rand(-320, 320) }; pop(); checkMake(); return; }
      if (o.counted) { // already counted: bounce and say its number again
        o.sv += 4; o.happy = 1; chime(SCALE[Math.min(8, o.counted)]);
        say(cap(num(o.counted)) + bang(), { onend: restorePrompt });
        return;
      }
      counted++; o.counted = counted; o.sv += 5; o.happy = 1.4; logUse('nums', counted);
      chime(SCALE[Math.min(8, counted)]); sparkle(o.x, o.y - o.R, 8);
      say(cap(num(counted)) + bang(), { onend: restorePrompt });
      if (counted === live().length && counted === answer) { busy = true; after(.8, () => win()); }
    },
    update(dt) {
      idle += dt;
      let relayout = false;
      for (const o of things) {
        spring(o, dt); o.wob = Math.max(0, o.wob - dt * 1.6); o.happy = Math.max(0, o.happy - dt);
        if (o.fly) {
          o.fly.vy -= 1300 * dt; o.x += o.fly.vx * dt; o.y += o.fly.vy * dt;
          if (o.kind === 'rocket') trail(o.x, o.y + o.R); else if (Math.random() < .4) sparkle(o.x, o.y, 1);
          if (o.y < -o.R * 3) { o.fly = null; o.gone = true; relayout = true; }
        } else if (o.roll) {
          o.roll.delay -= dt;
          if (o.roll.delay <= 0) {
            o.roll.vx += 900 * dt; const dx = o.roll.vx * dt;
            o.x += dx; o.y += dx * ramp.slope; o.roll.spin += dx / o.R;
            if (o.x > W + o.R * 2) { o.roll = null; o.gone = true; relayout = true; }
          }
        } else if (!o.gone) { const k = Math.min(1, dt * 5); o.x += (o.tx - o.x) * k; o.y += (o.ty - o.y) * k; }
      }
      if (whale) {
        whale.x += W * .7 * dt;
        for (const o of whale.eat) if (!o.gone && whale.x + whale.R * 1.2 >= o.x) { o.gone = true; tone(220, .18, { vol: .18, slide: .5 }); sparkle(o.x, o.y, 6); }
        if (whale.x > W + whale.R * 2.5) { whale = null; relayout = true; }
      }
      if (ramp && !things.some(o => o.roll)) ramp = null;
      if (relayout) layout();
      tiles.forEach(tl => { spring(tl, dt); tl.wob = Math.max(0, tl.wob - dt * 1.6); });
      if (plus) spring(plus, dt);
      if (!busy && idle > 9) {
        idle = 0;
        if (tiles.length) { const c = tiles.find(q => q.n === answer); if (c) c.glow = 1; }
        if (type === 'more') live().forEach(o => { o.hint = o.grp === moreSide ? 1 : 0; });
        if (type === 'lmr') { const o = things[lmrPos]; if (o) o.hint = 1; }
        if (promptText) ask(promptText); else say(t('tapToCount'));
      }
    },
    draw(t) {
      panels.forEach(p => {
        cx.save(); roundRect(cx, p.x, p.y, p.w, p.h, 28);
        cx.fillStyle = 'rgba(159,180,255,.06)'; cx.fill();
        cx.setLineDash([6, 8]); cx.strokeStyle = 'rgba(159,180,255,.22)'; cx.lineWidth = 2; cx.stroke(); cx.restore();
      });
      if (type === 'lmr' && lmrPos >= 0 && !busy) {
        const o = things[lmrPos], cw = (W - 32) / 3;
        if (o) drawSlotFrame(cx, 16 + cw * (lmrPos + .5), o.ty, cw * .86, o.R * 3.2, t);
      }
      if (ramp) drawRamp(cx);
      things.forEach(o => { if (!o.gone) drawThing(cx, o, t); });
      if (whale) drawWhale(cx, whale.x, whale.y, whale.R, t);
      if (arrow) { const o = things[arrow.i]; if (o) { const s = clamp(o.R * .6, 34, 64); drawPosArrow(cx, o.x, Math.min(o.y + o.R * 1.3, H - s * 1.9), s, posLabel(arrow.i), t); } }
      if (hasTrack()) drawTrack(cx, t);
      tiles.forEach(tl => drawTile(cx, tl, t));
      if (plus) drawPlus(cx, t);
    },
  };
}

export { CountMode };
