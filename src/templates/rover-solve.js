// Pure helper (no browser APIs) shared by the rover template and tools/validate.mjs.
// dir 0 = up, 1 = right, 2 = down, 3 = left. Returns the shortest plan ['F','L','R',...] or null.
export const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
export function roverSolve(item, cols, rows, maxLen = 10) {
  const key = (x, y, d) => `${x},${y},${d}`, rocks = new Set((item.rocks || []).map(([x, y]) => `${x},${y}`));
  const q = [[item.start[0], item.start[1], item.start[2], []]], seen = new Set([key(...item.start)]);
  while (q.length) {
    const [x, y, d, plan] = q.shift();
    if (x === item.goal[0] && y === item.goal[1]) return plan;
    if (plan.length >= maxLen) continue;
    for (const op of ['F', 'L', 'R']) {
      let nx = x, ny = y, nd = d;
      if (op === 'F') { nx += DX[d]; ny += DY[d]; if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || rocks.has(`${nx},${ny}`)) continue; }
      else nd = (d + (op === 'L' ? 3 : 1)) % 4;
      const k = key(nx, ny, nd); if (seen.has(k)) continue; seen.add(k); q.push([nx, ny, nd, [...plan, op]]);
    }
  }
  return null;
}
