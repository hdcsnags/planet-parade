import { TAU } from '../../core/util.js';
import { drawPlanet, drawSun } from '../../engine/art.js';
import { H, W, cx } from '../../engine/stage.js';
import { PLANETS } from '../../engine/world.js';
import { openParent } from '../../ui/parent.js';
import { openStudio } from '../../ui/studio.js';

/* ================= Game: menu backdrop ================= */
function MenuMode() {
  return {
    layout() {},
    // Deep-link helpers for screenshots and for grown-ups: #menu_grownups, #menu_studio
    start(sub) { if (sub === 'grownups') openParent(); else if (sub === 'studio') openStudio(); },
    update() {},
    draw(t) {
      const mx = W / 2, my = H * .5, m = Math.min(W, H), sr = m * .07, far = Math.max(W, H) * .56;
      cx.save(); cx.globalAlpha = .6;
      const pos = PLANETS.map((p, i) => {
        const rx = sr * 2.2 + (i + 1) * (far - sr * 2.2) / 8, a = t * (.5 / Math.sqrt(i + 1)) + i * 1.7;
        cx.strokeStyle = 'rgba(159,180,255,.12)'; cx.lineWidth = 1; cx.beginPath(); cx.ellipse(mx, my, rx, rx * .42, 0, 0, TAU); cx.stroke();
        return { p, x: mx + Math.cos(a) * rx, y: my + Math.sin(a) * rx * .42, s: Math.sin(a), R: m * .022 * (.6 + p.r * .6) };
      });
      const drawQ = q => drawPlanet(cx, q.p, q.x, q.y, q.R * (1 + .15 * q.s), t, {});
      pos.filter(q => q.s < 0).forEach(drawQ);
      drawSun(cx, mx, my, sr, t, {});
      pos.filter(q => q.s >= 0).forEach(drawQ);
      cx.restore();
    },
  };
}

export { MenuMode };
