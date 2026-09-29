import { settings } from '../core/settings.js';
import { FONT, PERSIAN_FONT, TAU } from '../core/util.js';
import { drawAstronaut, drawPlanet, drawRocket, drawStar, drawSun, goldStar } from '../engine/art.js';
import { PLANETS } from '../engine/world.js';
import { LANG, fmt, fontFor } from '../i18n/i18n.js';

/* ---------- menu tile art ---------- */
function drawIcons() {
  document.querySelectorAll('canvas[data-icon]').forEach(c => {
    const g = c.getContext('2d'), P = id => PLANETS.find(p => p.id === id), f = settings.faces;
    g.setTransform(2, 0, 0, 2, 0, 0); g.clearRect(0, 0, 150, 150);
    switch (c.dataset.icon) {
      case 'free':
        drawPlanet(g, P('earth'), 68, 80, 44, 1.2, { face: f, happy: true, look: { x: .3, y: -.2 } });
        g.strokeStyle = '#ffc93c'; g.lineWidth = 6; g.lineCap = 'round';
        for (const r of [16, 30]) { g.beginPath(); g.arc(112, 44, r, -1.1, -.1); g.stroke(); }
        break;
      case 'find':
        g.globalAlpha = .45; drawPlanet(g, P('neptune'), 28, 96, 18, 0, {}); drawPlanet(g, P('venus'), 124, 96, 18, 0, {}); g.globalAlpha = 1;
        { const gr = g.createRadialGradient(76, 84, 26, 76, 84, 56); gr.addColorStop(0, 'rgba(110,240,194,.55)'); gr.addColorStop(1, 'rgba(110,240,194,0)'); g.fillStyle = gr; g.beginPath(); g.arc(76, 84, 56, 0, TAU); g.fill(); }
        drawPlanet(g, P('mars'), 76, 84, 32, 0, { face: f, happy: true });
        g.fillStyle = '#ffc93c'; drawStar(g, 114, 30, 12, .2); drawStar(g, 40, 38, 8, -.3);
        break;
      case 'rocket':
        drawPlanet(g, P('saturn'), 108, 112, 18, 0, {});
        g.fillStyle = '#fff'; drawStar(g, 30, 30, 5, 0); drawStar(g, 122, 34, 4, .4);
        drawRocket(g, 66, 70, 50, -.7, 0, 1);
        break;
      case 'order': {
        const rtl = LANG === 'fa'; // Farsi: the Sun sits on the right and the count runs right-to-left
        g.save(); if (rtl) { g.translate(150, 0); g.scale(-1, 1); }
        g.strokeStyle = 'rgba(159,180,255,.4)'; g.lineWidth = 3; g.beginPath(); g.moveTo(10, 92); g.lineTo(146, 92); g.stroke();
        drawSun(g, -4, 92, 26, 0, {});
        [['mercury', 38, 9], ['venus', 62, 12], ['earth', 90, 13], ['mars', 118, 10]].forEach(([id, x, r], i) => drawPlanet(g, P(id), x, 92 - i * 6 - (i === 2 ? 4 : 0), r, 0, {}));
        g.restore();
        g.fillStyle = '#6ef0c2'; g.font = `800 34px ${fontFor()}`; g.textAlign = 'center';
        g.fillText(rtl ? `${fmt(3)} ${fmt(2)} ${fmt(1)}` : '1 2 3', 78, 46);
        break;
      }
      case 'count':
        goldStar(g, 36, 96, 22, 0, f ? { blink: 1, happy: true } : null);
        goldStar(g, 76, 104, 22, 0, f ? { blink: 1, happy: true } : null);
        goldStar(g, 116, 96, 22, 0, f ? { blink: 1, happy: true } : null);
        g.fillStyle = '#ff9a5c'; g.font = `800 36px ${fontFor()}`; g.textAlign = 'center'; g.fillText(`${fmt(2)} + ${fmt(1)}`, 76, 50);
        break;
      case 'words':
        drawAstronaut(g, 64, 88, 40, 0);
        [['EN', 112, 34, '#6ef0c2'], ['FR', 124, 72, '#9fb4ff'], ['فا', 110, 110, '#ff7eb6']].forEach(([s, x, y, col]) => {
          g.fillStyle = col; g.beginPath(); g.arc(x, y, 16, 0, TAU); g.fill();
          g.fillStyle = '#0a0e2a'; g.font = `800 15px ${s === 'فا' ? PERSIAN_FONT : FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, x, y + 1);
        });
        break;
    }
  });
}

export { drawIcons };
