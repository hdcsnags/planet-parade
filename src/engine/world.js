/* ---------- the planets ---------- */
const PLANETS = [
  { id: 'mercury', r: .62, base: '#b8b0a6', light: '#ece6de', dark: '#5f5850' },
  { id: 'venus', r: .86, base: '#eec27a', light: '#fff0c8', dark: '#a8742f', atmo: '#ffe8b0' },
  { id: 'earth', r: .9, base: '#3a8ee6', light: '#9fd3ff', dark: '#173f8f', atmo: '#9fd3ff' },
  { id: 'mars', r: .72, base: '#e0663a', light: '#ffb48a', dark: '#8c3016' },
  { id: 'jupiter', r: 1.3, base: '#dcae84', light: '#fbe6cc', dark: '#96623e' },
  { id: 'saturn', r: 1.08, base: '#ecd294', light: '#fff4d0', dark: '#a8843f', wf: 2.05, faceY: -.14 },
  { id: 'uranus', r: 1, base: '#98e0e4', light: '#e4fdff', dark: '#4a9aa8', atmo: '#d6fbff', wf: 1.15, hf: 1.5 },
  { id: 'neptune', r: 1, base: '#4b78ee', light: '#a9c2ff', dark: '#1c3597', atmo: '#9fb8ff' },
];
PLANETS.forEach((p, i) => p.i = i);
const SUN = { id: 'sun', r: 1, i: -1 };
const MOON_P = { id: 'moon', r: 1, base: '#cfccc6', light: '#f5f3ee', dark: '#77736c' };
// C major pentatonic: the Sun is the root, each planet one step up, so any tapping sounds musical.
const SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99];

export { MOON_P, PLANETS, SCALE, SUN };
