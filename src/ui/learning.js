import { PACKS } from '../content/packs.js';
import { $ } from '../core/util.js';
import { setMode } from '../hub/router.js';
import { unreviewedCount } from '../i18n/i18n.js';
import { packState, profile, setProfile, setStartLevel } from '../progress/progress.js';

// Grown-ups panel: the learning path. For each station: what she's working on now (a descriptive
// capability, never a score), buttons to move the starting point, and "Try harder?", a 3-round
// placement probe. Also the child profile hooks (name, age band) and the translation-review flag.






const PARENT_NAME = { tenframe: 'Mercury · Counting', numberline: 'Jupiter · Number line', compare: 'Saturn · Comparing', pattern: 'Earth · Patterns', sort: 'Venus · Sorting', rovercode: 'Mars · Rover code' };

export function renderLearning() {
  const box = $('#learnPath');
  box.innerHTML = '';
  for (const pack of PACKS) {
    const st = packState(pack), lv = pack.levels[st.level], last = pack.levels.length - 1;
    const row = document.createElement('div'); row.className = 'lrow';
    row.innerHTML = `<div><b></b><span></span></div><div class="seg"><button data-a="down" aria-label="Start easier">−</button><button data-a="up" aria-label="Start harder">+</button><button data-a="probe">Try harder?</button></div>`;
    row.querySelector('b').textContent = PARENT_NAME[pack.id] || pack.id;
    row.querySelector('span').textContent = `Now: ${lv.objective} · step ${st.level + 1} of ${pack.levels.length} · ages ${lv.band}`;
    const [down, up, probe] = row.querySelectorAll('button');
    down.disabled = st.level === 0; up.disabled = probe.disabled = st.level === last;
    down.onclick = () => { setStartLevel(pack, st.level - 1); renderLearning(); };
    up.onclick = () => { setStartLevel(pack, st.level + 1); renderLearning(); };
    probe.onclick = () => { $('#parent').hidden = true; setMode('play', `${pack.id}.probe`); };
    box.appendChild(row);
  }
  const pr = profile();
  $('#childName').value = pr.name || '';
  $('#childBand').value = pr.band || '2-3';
  const fr = unreviewedCount('fr'), fa = unreviewedCount('fa');
  const note = $('#reviewNote');
  note.hidden = !(fr || fa);
  note.textContent = `Not yet checked by a person: ${fr} French and ${fa} Farsi lines. They are still spoken; see TRANSLATIONS.md to review them.`;
}
$('#childName').addEventListener('change', e => setProfile({ name: e.target.value.trim().slice(0, 24) }));
// Choosing an age band moves untouched strands to the first step for that band.
$('#childBand').addEventListener('change', e => {
  const band = e.target.value;
  setProfile({ band });
  for (const pack of PACKS) {
    const st = packState(pack);
    if (st.done.length || st.hist.length) continue;
    const i = pack.levels.findIndex(l => l.band === band);
    setStartLevel(pack, i < 0 ? 0 : i);
  }
  renderLearning();
});

export { PARENT_NAME };
