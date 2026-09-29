import { chime, pop, tone } from '../audio/audio.js';
import { say } from '../audio/speech.js';
import { TAU, clamp, ease } from '../core/util.js';
import { roundRect } from '../engine/art.js';
import { drawButton, hitButton, makeButton } from '../engine/components.js';
import { sparkle } from '../engine/particles.js';
import { H, W, cx } from '../engine/stage.js';
import { Template } from '../engine/template.js';
import { after } from '../engine/timers.js';
import { SCALE } from '../engine/world.js';
import { t } from '../i18n/i18n.js';
import { DX, DY, roverSolve } from './rover-solve.js';

// Rover code: plan 2–6 blocks (Forward / Turn left / Turn right), press the green button, and the
// rover drives the Mars grid to the blue sample. Bumping a rock or the edge just means "let's try
// again"; the plan stays so she can fix it.
// Level items: { start: [x, y, dir], goal: [x, y], rocks: [[x, y], ...] }; dir 0 = up, 1 = right,
// 2 = down, 3 = left. Left and right are the ROVER's own turns (never mirrored for Farsi).
// params: cols, rows, slots














export class RoverCode extends Template {
  makeRound(item) {
    this.item = item; this.cols = this.p.cols || 4; this.rows = this.p.rows || 3; this.slots = this.p.slots || 3;
    this.plan = []; this.running = null; this.rover = { x: item.start[0], y: item.start[1], d: item.start[2], ax: 0, ay: 0, ang: item.start[2] * Math.PI / 2 };
    this.solution = roverSolve(item, this.cols, this.rows) || [];
    this.btns = [makeButton('F'), makeButton('L'), makeButton('R'), makeButton('GO')];
    const first = !this.explained; this.explained = true; // explain the buttons once per visit
    this.ask(t('tpl.rover.goal'), first ? () => say(t('tpl.rover.plan'), { onend: this.restorePrompt }) : undefined);
  }
  layout() {
    const gridTop = Math.max(H * .25, 200), gridH = H * .42, cs = Math.min((W - 64) / this.cols, gridH / this.rows, 120);
    this.cs = cs; this.gx = W / 2 - this.cols * cs / 2; this.gy = gridTop;
    const r = clamp(Math.min(W, H) * .062, 36, 52), by = H - r - 22;
    const xs = [W / 2 - r * 5.4, W / 2 - r * 3.1, W / 2 - r * .8, W / 2 + r * 3.8];
    this.btns.forEach((b, i) => { b.r = i === 3 ? r * 1.25 : r; b.x = xs[i]; b.y = by; });
    this.slotR = clamp(r * .82, 28, 44); this.slotY = by - r - this.slotR - 26;
  }
  slotX(i) { return W / 2 + (i - (this.slots - 1) / 2) * this.slotR * 2.5; }
  cellXY(x, y) { return [this.gx + (x + .5) * this.cs, this.gy + (y + .5) * this.cs]; }
  onTap(x, y) {
    if (this.running) return;
    // tap a filled slot to take that block out
    for (let i = 0; i < this.plan.length; i++) if (Math.hypot(x - this.slotX(i), y - this.slotY) < this.slotR + 6) { this.plan.splice(i, 1); pop(); return; }
    const b = hitButton(this.btns, x, y);
    if (!b) return;
    b.sv = 5;
    if (b.id === 'GO') { if (!this.plan.length) { this.miss(t('tpl.rover.plan')); return; } say(t('tpl.rover.go')); this.run(); return; }
    if (this.plan.length >= this.slots) { tone(220, .15, { vol: .1 }); return; }
    this.plan.push(b.id); chime(SCALE[this.plan.length + 1]);
    say(t({ F: 'tpl.rover.forward', L: 'tpl.rover.left', R: 'tpl.rover.right' }[b.id]));
  }
  run() {
    const rv = this.rover; this.running = { i: 0, t: 0, from: { x: rv.x, y: rv.y, ang: rv.ang }, op: this.plan[0] };
  }
  reset(line) {
    this.running = null;
    after(.9, () => { const s = this.item.start; Object.assign(this.rover, { x: s[0], y: s[1], d: s[2], ang: s[2] * Math.PI / 2, bump: 0 }); });
    this.miss(line);
  }
  step(dt) {
    this.btns.forEach(b => { b.sv += (-160 * (b.scale - 1) - 11 * b.sv) * dt; b.scale += b.sv * dt; b.glow = 0; });
    if (this.hint && !this.running) {
      // glow the next block the shortest plan needs
      const ok = this.plan.every((op, i) => this.solution[i] === op), next = ok ? this.solution[this.plan.length] : null;
      const b = next ? this.btns.find(q => q.id === next) : this.btns[3]; if (b) b.glow = 1;
    }
    const r = this.running, rv = this.rover;
    if (rv.bump) rv.bump = Math.max(0, rv.bump - dt * 2);
    if (!r) return;
    r.t += dt / .6;
    const e = ease(Math.min(1, r.t));
    if (r.op === 'F') {
      const nx = r.from.x + DX[rv.d], ny = r.from.y + DY[rv.d];
      const blocked = nx < 0 || ny < 0 || nx >= this.cols || ny >= this.rows || (this.item.rocks || []).some(([a, b]) => a === nx && b === ny);
      if (blocked) { rv.bump = 1; tone(140, .25, { vol: .18, slide: .6 }); this.reset(t('tpl.rover.bump')); return; }
      rv.ax = DX[rv.d] * e; rv.ay = DY[rv.d] * e;
    } else rv.ang = r.from.ang + (r.op === 'L' ? -1 : 1) * e * Math.PI / 2;
    if (r.t < 1) return;
    if (r.op === 'F') { rv.x += DX[rv.d]; rv.y += DY[rv.d]; rv.ax = rv.ay = 0; chime(SCALE[Math.min(8, r.i + 2)]); }
    else { rv.d = (rv.d + (r.op === 'L' ? 3 : 1)) % 4; rv.ang = rv.d * Math.PI / 2; }
    if (rv.x === this.item.goal[0] && rv.y === this.item.goal[1]) { this.running = null; const [gx, gy] = this.cellXY(rv.x, rv.y); sparkle(gx, gy, 16); this.win(t('tpl.rover.got'), gx, gy); return; }
    r.i++;
    if (r.i >= this.plan.length) { this.reset(t('tpl.rover.almost')); return; }
    r.t = 0; r.op = this.plan[r.i]; r.from = { x: rv.x, y: rv.y, ang: rv.ang };
  }
  render(tt) {
    const c = cx, cs = this.cs;
    // Mars grid
    for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++) {
      c.fillStyle = (x + y) % 2 ? '#b8532e' : '#c9643a';
      roundRect(c, this.gx + x * cs + 2, this.gy + y * cs + 2, cs - 4, cs - 4, 10); c.fill();
    }
    (this.item.rocks || []).forEach(([x, y]) => {
      const [px, py] = this.cellXY(x, y);
      c.fillStyle = '#6d625e'; c.beginPath(); c.ellipse(px, py + cs * .06, cs * .32, cs * .24, 0, 0, TAU); c.fill();
      c.fillStyle = '#8c807b'; c.beginPath(); c.ellipse(px - cs * .06, py - cs * .02, cs * .18, cs * .12, 0, 0, TAU); c.fill();
    });
    const [gx, gy] = this.cellXY(...this.item.goal), pulse = 1 + .1 * Math.sin(tt * 4);
    c.save(); c.translate(gx, gy); c.scale(pulse, pulse);
    c.shadowColor = 'rgba(94,168,255,.9)'; c.shadowBlur = 24;
    c.fillStyle = '#5ea8ff'; c.beginPath(); c.moveTo(0, -cs * .3); c.lineTo(cs * .2, 0); c.lineTo(0, cs * .26); c.lineTo(-cs * .2, 0); c.closePath(); c.fill();
    c.restore();
    // rover
    const rv = this.rover, [rx, ry] = this.cellXY(rv.x + rv.ax, rv.y + rv.ay), wob = rv.bump ? Math.sin(tt * 40) * 6 * rv.bump : 0;
    c.save(); c.translate(rx + wob, ry); c.rotate(rv.ang);
    c.fillStyle = '#e8ecff'; roundRect(c, -cs * .26, -cs * .3, cs * .52, cs * .6, 10); c.fill();
    c.fillStyle = '#2b3a8f'; for (const sx of [-1, 1]) for (const sy of [-1, 0, 1]) { c.beginPath(); c.arc(sx * cs * .3, sy * cs * .2, cs * .08, 0, TAU); c.fill(); }
    c.fillStyle = '#ffc93c'; c.beginPath(); c.moveTo(0, -cs * .36); c.lineTo(cs * .12, -cs * .18); c.lineTo(-cs * .12, -cs * .18); c.closePath(); c.fill();
    c.fillStyle = '#5ea8ff'; c.beginPath(); c.arc(0, 0, cs * .1, 0, TAU); c.fill();
    c.restore();
    // plan slots
    for (let i = 0; i < this.slots; i++) {
      const x = this.slotX(i), y = this.slotY, op = this.plan[i], active = this.running && this.running.i === i;
      c.save();
      c.fillStyle = op ? (active ? '#6ef0c2' : 'rgba(110,240,194,.25)') : 'rgba(22,29,79,.9)';
      c.beginPath(); c.arc(x, y, this.slotR, 0, TAU); c.fill();
      c.lineWidth = 3; c.strokeStyle = op ? '#6ef0c2' : 'rgba(255,255,255,.3)'; if (!op) c.setLineDash([5, 6]); c.stroke();
      if (op) arrowIcon(c, op, x, y, this.slotR * .75, active ? '#0a0e2a' : '#f6f2ff');
      c.restore();
    }
    this.btns.forEach(b => drawButton(c, b, tt, b.id === 'GO' ? '#3ecf8e' : '#2a3380', (g, r) => {
      if (b.id === 'GO') { g.fillStyle = '#0a0e2a'; g.beginPath(); g.moveTo(-r * .28, -r * .38); g.lineTo(r * .42, 0); g.lineTo(-r * .28, r * .38); g.closePath(); g.fill(); }
      else arrowIcon(g, b.id, 0, 0, r * .8, '#f6f2ff');
    }));
  }
}
function arrowIcon(c, op, x, y, s, color) {
  c.save(); c.translate(x, y); c.strokeStyle = color; c.fillStyle = color; c.lineWidth = s * .2; c.lineCap = 'round'; c.lineJoin = 'round';
  if (op === 'F') {
    c.beginPath(); c.moveTo(0, s * .55); c.lineTo(0, -s * .3); c.stroke();
    c.beginPath(); c.moveTo(-s * .38, -s * .1); c.lineTo(0, -s * .58); c.lineTo(s * .38, -s * .1); c.stroke();
  } else {
    if (op === 'L') c.scale(-1, 1); // icon only: a left turn is the mirror image of a right turn
    c.beginPath(); c.moveTo(-s * .3, s * .55); c.lineTo(-s * .3, 0); c.quadraticCurveTo(-s * .3, -s * .35, s * .1, -s * .35); c.stroke();
    c.beginPath(); c.moveTo(s * .05, -s * .64); c.lineTo(s * .48, -s * .35); c.lineTo(s * .05, -s * .06); c.closePath(); c.fill();
  }
  c.restore();
}

export { arrowIcon };
