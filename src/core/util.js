const TAU = Math.PI * 2;
const $ = s => document.querySelector(s);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[Math.floor(Math.random() * a.length)];
const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FONT = 'Sniglet, "Trebuchet MS", sans-serif';
const PERSIAN_FONT = 'Vazirmatn, Tahoma, sans-serif';

export { $, FONT, PERSIAN_FONT, TAU, clamp, ease, lerp, pick, rand, randInt, reduced, shuffle };
