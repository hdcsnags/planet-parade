/* ---------- timers owned by the current game ---------- */
let timers = [];
const after = (s, fn) => timers.push({ t: s, fn });
function runTimers(dt) {
  const due = [];
  timers = timers.filter(k => { k.t -= dt; if (k.t <= 0) { due.push(k.fn); return false; } return true; });
  due.forEach(fn => fn());
}

const clearTimers = () => { timers = []; };

export { after, clearTimers, runTimers, timers };
