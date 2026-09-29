import { $ } from '../core/util.js';

/* ---------- canvas ---------- */
const cv = $('#stage'), cx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1, T = 0, camX = 0;
const pointer = { x: -999, y: -999, t: -99 };
// Only this module assigns these; everyone else reads the live bindings.
function setViewport() {
  DPR = Math.min(2, window.devicePixelRatio || 1); W = innerWidth; H = innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  cx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
const advanceClock = dt => { T += dt; };
const setCamX = v => { camX = v; };

export { DPR, H, T, W, advanceClock, camX, cv, cx, pointer, setCamX, setViewport };
