import { boop, chime, fanfare, pop } from '../../audio/audio.js';
import { say } from '../../audio/speech.js';
import { settings } from '../../core/settings.js';
import { TAU, clamp, ease, lerp, pick, rand } from '../../core/util.js';
import { tapGate } from '../../engine/art.js';
import { Body } from '../../engine/body.js';
import { cells, fitR } from '../../engine/layout.js';
import { COLORS, burst, fireworks, sparkle } from '../../engine/particles.js';
import { H, W, cx } from '../../engine/stage.js';
import { after } from '../../engine/timers.js';
import { PLANETS, SCALE, SUN } from '../../engine/world.js';
import { LANG, bang, cap, fontFor, plabel, pname, t } from '../../i18n/i18n.js';

/* ================= Game 4: Line Up ================= */
function OrderMode() {
  let sun = null, placed = 0, floating = [], placedB = [], flying = null, slots = [], slotR = 0, slotY = 0, wrong = 0, idle = 0, done = false, canReplay = false;
  const slotSize = p => slotR * (p.id === 'saturn' ? .5 : p.id === 'uranus' ? .78 : .9) * (.78 + .22 * p.r / 1.3);
  const nextBody = () => floating.find(o => o.p === PLANETS[placed]);
  function layoutSlots() {
    slotR = Math.min((W - 32) / (8 * 2.25 + 2), H * .075, 58);
    slotY = H - Math.max(slotR * 1.6 + 28, H * .13);
    const sunR = slotR * 1.9;
    if (!sun) sun = new Body(SUN, 0, 0, sunR);
    sun.R = sunR; sun.x = sun.tx = sunR * .35; sun.y = sun.ty = slotY;
    const x0 = sun.x + sunR + slotR * 1.3, x1 = W - 16 - slotR * 1.1;
    slots = PLANETS.map((p, i) => ({ x: x0 + (x1 - x0) * i / 7, y: slotY }));
    if (LANG === 'fa') { sun.x = sun.tx = W - sun.x; slots.forEach(sl => { sl.x = W - sl.x; }); } // Farsi reads right-to-left: the Sun sits on the right
    placedB.forEach((b, i) => { b.x = b.tx = slots[i].x; b.y = b.ty = slots[i].y; b.R = slotSize(b.p); });
  }
  function layoutFloats() {
    if (!floating.length) return;
    const cs = cells(floating.length, Math.max(H * .2, 150), slotY - slotR * 2.4);
    floating.forEach((b, i) => { b.R = fitR(b.p, cs[i], .62); b.tx = cs[i].x + b.jx * cs[i].w * .08; b.ty = cs[i].y + b.jy * cs[i].h * .08; });
  }
  function spawn(p) { const b = new Body(p, W / 2, H * .4, 40); b.scale = .01; b.jx = rand(-1, 1); b.jy = rand(-1, 1); b.fresh = true; return b; }
  const insertRandom = b => floating.splice(Math.floor(Math.random() * (floating.length + 1)), 0, b);
  function refill() {
    const remaining = PLANETS.slice(placed), next = PLANETS[placed];
    const cap = Math.min(clamp(settings.choices, 2, 4), remaining.length);
    if (next && !floating.some(b => b.p === next)) {
      if (floating.length >= cap) floating.splice(Math.floor(Math.random() * floating.length), 1);
      insertRandom(spawn(next));
    }
    while (floating.length < cap) insertRandom(spawn(pick(remaining.filter(p => !floating.some(b => b.p === p)))));
    layoutFloats();
    floating.forEach(b => { if (b.fresh) { b.x = b.tx; b.y = b.ty; b.fresh = false; } });
  }
  function prompt() { idle = 0; say(placed === 0 ? t('whoFirst') : t('whoNext')); }
  function reset() {
    placed = 0; floating = []; placedB = []; flying = null; done = false; canReplay = false; wrong = 0; idle = 0;
    layoutSlots(); refill();
    say(t('lineUp'));
  }
  function parade() {
    done = true;
    const names = PLANETS.map(p => pname(p)); names[0] = cap(names[0]);
    placedB.forEach((b, i) => after(.3 + i * .5, () => { b.bounce(6); chime(SCALE[i + 1]); sparkle(b.x, b.y - b.R, 8); }));
    // The finale waits for the name roll-call to finish instead of talking over it.
    const finale = () => { if (canReplay) return; fanfare(); fireworks(8); say(t('didIt'), { onend: () => { canReplay = true; } }); };
    say(names.join(LANG === 'fa' ? '، ' : ', ') + bang(), { onend: () => after(.4, finale) });
    after(14, () => { canReplay = true; }); // safety net if a voice never reports that it finished
  }
  return {
    repeat() { if (!done) prompt(); },
    layout() { layoutSlots(); layoutFloats(); },
    start: reset,
    tap(x, y) {
      idle = 0;
      if (done) { if (canReplay) reset(); return; }
      if (flying) return;
      const b = [...floating].reverse().find(o => o.hit(x, y));
      if (!b || !tapGate(b)) return;
      if (b.p === PLANETS[placed]) {
        floating.splice(floating.indexOf(b), 1);
        b.glow = 0; b.fly = { t: 0, dur: .9, x0: b.x, y0: b.y, R0: b.R }; flying = b; wrong = 0;
        pop(); say(t('nameBang', { p: cap(pname(b.p)) }));
      } else {
        b.wiggle(); boop(); wrong++;
        say(t('thatsP', { p: pname(b.p) }));
        if (wrong >= 2 && nextBody()) nextBody().glow = 1;
      }
    },
    update(dt) {
      idle += dt; sun.update(dt);
      floating.forEach(b => b.update(dt)); placedB.forEach(b => b.update(dt));
      if (flying) {
        const b = flying, f = b.fly, sl = slots[placed];
        f.t += dt / f.dur;
        const e = ease(Math.min(1, f.t));
        b.x = lerp(f.x0, sl.x, e); b.y = lerp(f.y0, sl.y, e) - Math.sin(e * Math.PI) * H * .12; b.R = lerp(f.R0, slotSize(b.p), e);
        b.update(dt);
        if (f.t >= 1) {
          b.fly = null; b.tx = sl.x; b.ty = sl.y; placedB.push(b); flying = null; placed++;
          b.bounce(5); chime(SCALE[placed]); burst(sl.x, sl.y, 22, COLORS, .7);
          if (placed === 8) after(.6, parade); else { refill(); after(.9, prompt); }
        }
      }
      if (!done && !flying && idle > 8) { if (nextBody()) nextBody().glow = 1; prompt(); }
    },
    draw(t) {
      cx.save(); cx.strokeStyle = 'rgba(159,180,255,.16)'; cx.lineWidth = 3; cx.beginPath(); cx.moveTo(sun.x, slotY); cx.lineTo(slots[7].x, slotY); cx.stroke(); cx.restore();
      slots.forEach((sl, i) => {
        if (i < placed) return;
        const isNext = i === placed && !flying;
        cx.save(); cx.setLineDash([5, 7]);
        cx.fillStyle = '#10163f'; cx.strokeStyle = isNext ? `rgba(110,240,194,${.55 + .45 * Math.sin(t * 5)})` : 'rgba(255,255,255,.28)';
        cx.lineWidth = isNext ? 4 : 2.5;
        cx.beginPath(); cx.arc(sl.x, sl.y, slotR * .9, 0, TAU); cx.fill(); cx.stroke(); cx.restore();
      });
      sun.draw(cx, t);
      placedB.forEach(b => b.draw(cx, t));
      if (slotR > 24) {
        cx.font = `800 ${clamp(slotR * .34, 12, 18)}px ${fontFor()}`; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillStyle = 'rgba(246,242,255,.8)';
        placedB.forEach((b, i) => cx.fillText(plabel(b.p), slots[i].x, slotY + slotR * 1.35));
      }
      floating.forEach(b => b.draw(cx, t));
      if (flying) flying.draw(cx, t);
      if (canReplay) {
        const r = Math.min(W, H) * .09, x = W / 2, y = Math.max(H * .2, 150) + (slotY - slotR * 2.4 - Math.max(H * .2, 150)) / 2, pulse = 1 + .06 * Math.sin(t * 4);
        cx.save(); cx.translate(x, y); cx.scale(pulse, pulse);
        cx.fillStyle = '#ffc93c'; cx.beginPath(); cx.arc(0, 0, r, 0, TAU); cx.fill();
        cx.strokeStyle = '#2a1a00'; cx.lineWidth = r * .16; cx.lineCap = 'round';
        cx.beginPath(); cx.arc(0, 0, r * .5, -.4 * Math.PI, 1.3 * Math.PI); cx.stroke();
        cx.fillStyle = '#2a1a00'; cx.beginPath(); cx.moveTo(r * .1, -r * .78); cx.lineTo(r * .42, -r * .46); cx.lineTo(r * .02, -r * .28); cx.closePath(); cx.fill();
        cx.restore();
      }
    },
  };
}

export { OrderMode };
