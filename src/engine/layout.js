import { H, W } from './stage.js';

/* ---------- layout helpers ---------- */
function rowsLayout(list, ax, ay, aw, ah, maxRows, gap, maxU) {
  let best = null;
  for (let r = 1; r <= maxRows; r++) {
    const per = Math.ceil(list.length / r), rows = [];
    for (let i = 0; i < list.length; i += per) rows.push(list.slice(i, i + per));
    const rw = rows.map(row => row.reduce((s, p) => s + 2 * p.r * (p.wf || 1), 0) + (row.length - 1) * gap);
    const rh = rows.map(row => Math.max(...row.map(p => 2 * p.r * (p.hf || 1))) + .6);
    const totalH = rh.reduce((a, b) => a + b, 0) + (rows.length - 1) * gap;
    const u = Math.min(aw / Math.max(...rw), ah / totalH, maxU);
    if (!best || u > best.u) best = { u, rows, rw, rh, totalH };
  }
  const { u, rows, rw, rh, totalH } = best, out = [];
  let y = ay + (ah - totalH * u) / 2;
  rows.forEach((row, ri) => {
    let x = ax + (aw - rw[ri] * u) / 2;
    const cy = y + (rh[ri] - .6) * u / 2;
    row.forEach(p => { const w = p.r * (p.wf || 1) * u; out.push({ x: x + w, y: cy, R: p.r * u }); x += 2 * w + gap * u; });
    y += (rh[ri] + gap) * u;
  });
  return out;
}
function cells(n, top, bottom) {
  const aw = W - 32, ah = Math.max(80, bottom - top);
  let cols, rows;
  if (W >= H * 1.1) { cols = n; rows = 1; }
  else if (n === 4) { cols = 2; rows = 2; }
  else if (aw / ah > .9) { cols = n; rows = 1; }
  else { cols = 1; rows = n; }
  const cw = aw / cols, ch = ah / rows;
  return Array.from({ length: n }, (_, i) => ({ x: 16 + cw * (i % cols + .5), y: top + ch * (Math.floor(i / cols) + .5), w: cw, h: ch }));
}
const fitR = (p, cell, k) => Math.min(cell.w / (2 * (p.wf || 1)), cell.h / (2 * (p.hf || 1))) * k;
// Best square-ish grid for n items with a width:height ratio of `ratio`, centered in the box.
function gridFit(n, x0, y0, w, h, ratio = 1) {
  if (!n) return [];
  let best = null;
  for (let c = 1; c <= n; c++) { const r = Math.ceil(n / c), s = Math.min(w / c, h / r / ratio); if (!best || s > best.s) best = { c, r, s }; }
  const { c, r, s } = best;
  return Array.from({ length: n }, (_, i) => {
    const row = Math.floor(i / c), col = i % c, inRow = Math.min(c, n - row * c);
    return { x: x0 + w / 2 + (col - (inRow - 1) / 2) * s, y: y0 + h / 2 + (row - (r - 1) / 2) * s * ratio, s };
  });
}

export { cells, fitR, gridFit, rowsLayout };
