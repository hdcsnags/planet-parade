import { boop, fanfare } from '../../audio/audio.js';
import { say, sayQueue, showCaption } from '../../audio/speech.js';
import { logUse, settings } from '../../core/settings.js';
import { clamp, pick, randInt, shuffle } from '../../core/util.js';
import { drawPosArrow, drawSlotFrame, tapGate } from '../../engine/art.js';
import { Body } from '../../engine/body.js';
import { cells, fitR } from '../../engine/layout.js';
import { COLORS, burst, fireworks } from '../../engine/particles.js';
import { H, W, cx } from '../../engine/stage.js';
import { after } from '../../engine/timers.js';
import { PLANETS } from '../../engine/world.js';
import { setStars } from '../../hub/router.js';
import { LANG, cap, pfact, pname, posLabel, posWord, t } from '../../i18n/i18n.js';

/* ================= Game 2: Find It ================= */
// Round types: "Where is Saturn?", plus two spatial rounds with exactly three planets in one row:
//   where: "Where is Mars? On the left, in the middle, or on the right?"
//   which: "Which planet is in the middle?" (that slot pulses)
// Spatial positions are the child's REAL screen left / middle / right. bodies[0] is always the leftmost
// planet on screen, and this is NEVER mirrored in Farsi (RTL) mode. Only text direction changes.
function FindMode() {
  const TYPES = ['find', 'where', 'find', 'which'];
  let bodies = [], target = null, last = null, wrong = 0, idle = 0, busy = false, stars = 0;
  let type = 'find', roundNo = 0, framePos = -1, arrow = null, promptText = '';
  const top = () => Math.max(H * .22, 160);
  const targetBody = () => bodies.find(o => o.p === target);
  const posOf = b => bodies.indexOf(b); // 0 = left, 1 = middle, 2 = right, on screen, never mirrored
  const rowGeom = () => { const cw = (W - 32) / 3, area = H - 24 - top(); return { cw, y: top() + area * .38, ch: Math.max(120, area * .6) }; };
  function layout() {
    if (type === 'find') {
      const cs = cells(bodies.length, top(), H - 24);
      bodies.forEach((b, i) => { b.R = fitR(b.p, cs[i], .7) * (.86 + .14 * b.p.r / 1.3); b.tx = cs[i].x; b.ty = cs[i].y; });
      return;
    }
    // One row across the screen, left to right, in portrait and in Farsi alike.
    const { cw, y, ch } = rowGeom();
    bodies.forEach((b, i) => { b.R = Math.min(cw / (2 * (b.p.wf || 1)), ch / (2 * (b.p.hf || 1))) * .64; b.tx = 16 + cw * (i + .5); b.ty = y; });
  }
  function ask() {
    idle = 0;
    if (type === 'find') { promptText = ''; say(t('whereIs', { p: pname(target) })); return; }
    promptText = type === 'where' ? t('whereLMR', { p: pname(target) }) : t('whichAt', { pos: posWord(framePos) });
    say(promptText, { persist: true });
  }
  const restorePrompt = () => { if (!busy && promptText) showCaption(promptText, LANG, true); };
  function round(forced) {
    type = forced || TYPES[roundNo % TYPES.length]; roundNo++;
    const n = type === 'find' ? clamp(settings.choices, 2, 4) : 3;
    target = pick(PLANETS.filter(p => p !== last));
    const others = shuffle(PLANETS.filter(p => p !== target)).slice(0, n - 1);
    bodies = shuffle([target, ...others]).map(p => { const b = new Body(p, W / 2, H / 2, 10); b.scale = .01; return b; });
    framePos = -1; arrow = null;
    if (type === 'which') { framePos = randInt(0, 2); target = bodies[framePos].p; }
    last = target;
    layout(); bodies.forEach(b => { b.x = b.tx; b.y = b.ty; });
    wrong = 0; busy = false; ask();
  }
  function succeed(b) {
    busy = true; b.bounce(7); b.glow = 0; fanfare(); burst(b.x, b.y, 44, COLORS, 1.1);
    bodies.forEach(o => { if (o !== b) o.fade = true; });
    stars++; setStars(stars); logUse('words', target.id);
    promptText = '';
    const lines = [];
    if (type === 'find') lines.push(t('yesThats', { p: pname(target) }));
    else {
      arrow = { i: posOf(b) };
      lines.push(t(type === 'where' ? 'isAt' : 'yesAt', { p: cap(pname(target)), pos: posWord(posOf(b)) }));
    }
    if (settings.facts) lines.push(pfact(target));
    sayQueue(lines.map(text => ({ text })));
    const wait = (settings.facts ? 3.8 : 2.4) + (type === 'find' ? 0 : 1);
    if (stars >= 5) {
      after(wait, () => { say(t('fiveStars')); fireworks(8); fanfare(); });
      after(wait + 3.8, () => { stars = 0; setStars(0); round(); });
    } else after(wait, () => round());
  }
  return {
    layout, repeat: ask,
    start(sub) { setStars(0); round(TYPES.includes(sub) ? sub : undefined); },
    tap(x, y) {
      if (busy) return;
      idle = 0;
      const b = [...bodies].reverse().find(o => o.hit(x, y));
      if (!b || !tapGate(b)) return;
      if (b.p === target) { succeed(b); return; }
      b.wiggle(); boop(); wrong++;
      if (type === 'find') say(t('notThat', { p: pname(b.p), q: pname(target) }));
      else say(t('thatsAt', { p: pname(b.p), pos: posWord(posOf(b)) }), { onend: restorePrompt });
      if (wrong >= 2) targetBody().glow = 1;
    },
    update(dt) {
      idle += dt;
      bodies.forEach(b => { b.update(dt); if (b.fade) b.alpha = Math.max(.18, b.alpha - dt * 2); });
      if (!busy && idle > 9) { targetBody().glow = 1; ask(); }
    },
    draw(t) {
      if (framePos >= 0 && !busy) { const { cw, y, ch } = rowGeom(); drawSlotFrame(cx, 16 + cw * (framePos + .5), y, cw * .9, ch * .95, t); }
      bodies.forEach(b => b.draw(cx, t));
      if (arrow) {
        const b = bodies[arrow.i], s = clamp(b.R * .55, 34, 64);
        drawPosArrow(cx, b.x, Math.min(b.y + b.R * (b.p.hf || 1) + 18, H - s * 1.9), s, posLabel(arrow.i), t);
      }
    },
  };
}

export { FindMode };
