import { PACKS } from '../content/packs.js';
import { saveSettings, settings } from '../core/settings.js';
import { $ } from '../core/util.js';
import { setMode } from '../hub/router.js';
import { unreviewedCount } from '../i18n/i18n.js';
import { current, profile, setAdvanced, setProfile, setStart, startIndex, strandState } from '../progress/progress.js';

// Grown-ups panel: the learning path, one row per strand. It shows what she's working on (a
// descriptive capability, never a score), where the strand starts (moved with −/+ by example), the
// Advanced switch (the advanced track opens only with it AND every prerequisite satisfied), and
// "Try harder?": a 3-round placement probe (prerequisite, target, transfer).
// Also: the council's suggested start (a suggestion, never applied automatically), the Family Lab
// switch, the child profile hooks and the translation-review flag.







// From content/curriculum/CURRICULUM.md: "start Number at L6 with advanced on; a 3/3 probe moves
// her to L7, then L8 bonds. This is routing, not a norm." Other strands: their basic levels 3–5.
const SUGGESTION = { number: { start: 6, advanced: true }, other: { start: 3, advanced: false } };

export function renderLearning() {
  const box = $('#learnPath');
  box.innerHTML = '';
  const sug = document.createElement('div'); sug.className = 'lrow suggest';
  sug.innerHTML = `<div><b>Suggested start (curriculum council)</b><span>For a child who is already strong with numbers: Number from step 6 with Advanced on; the other strands from basic step 3. A suggestion only; change anything below afterwards.</span></div><div class="seg"><button data-a="apply">Use suggestion</button></div>`;
  sug.querySelector('button').onclick = () => {
    for (const pack of PACKS) { const s = pack.id === 'number' ? SUGGESTION.number : SUGGESTION.other; setStart(pack, Math.min(pack.levels.length - 1, s.start - 1)); setAdvanced(pack.strand, s.advanced); }
    renderLearning();
  };
  box.appendChild(sug);
  for (const pack of PACKS) {
    const st = strandState(pack.strand), cur = current(pack), si = startIndex(pack), n = pack.levels.length;
    const built = pack.levels.filter(l => l.status === 'ready' || (l.status === 'lab' && settings.familyLab)).length;
    const row = document.createElement('div'); row.className = 'lrow';
    row.innerHTML = `<div><b></b><span class="now"></span><span class="ex"></span></div><div class="seg"><button data-a="down" aria-label="Start easier">−</button><button data-a="up" aria-label="Start harder">+</button><button data-a="adv" aria-pressed="false">Advanced</button><button data-a="probe">Try harder?</button></div>`;
    row.querySelector('b').textContent = `${pack.name.en} · ${built} of ${n} steps ready`;
    row.querySelector('.now').textContent = cur ? `Now: ${cur.objective} (step ${cur.n}, ${cur.track})` : built ? 'Everything ready here is done. More steps are coming.' : 'Coming soon: these activities are still being built.';
    const startLv = pack.levels[Math.min(si, n - 1)];
    row.querySelector('.ex').textContent = si > 0 ? `Starts at step ${si + 1}. Before that counts as “she can already do this”, e.g. ${pack.levels[si - 1].example || pack.levels[si - 1].objective}` : `Starts at step 1 (${startLv.example || startLv.objective})`;
    const [down, up, adv, probe] = row.querySelectorAll('button');
    down.disabled = si === 0; up.disabled = si >= n - 1; probe.disabled = !cur;
    adv.setAttribute('aria-pressed', st.advanced);
    down.onclick = () => { setStart(pack, si - 1); renderLearning(); };
    up.onclick = () => { setStart(pack, si + 1); renderLearning(); };
    adv.onclick = () => { setAdvanced(pack.strand, !st.advanced); renderLearning(); };
    probe.onclick = () => { $('#parent').hidden = true; setMode('play', `probe:${pack.id}`); };
    box.appendChild(row);
  }
  const lab = document.createElement('div'); lab.className = 'lrow';
  lab.innerHTML = `<div><b>Family Lab</b><span>Try activities that are built but still being tested with families.</span></div><div class="seg"><button data-a="lab"></button></div>`;
  const lb = lab.querySelector('button'); lb.setAttribute('aria-pressed', !!settings.familyLab); lb.textContent = settings.familyLab ? 'On' : 'Off';
  lb.onclick = () => { settings.familyLab = !settings.familyLab; saveSettings(); renderLearning(); };
  box.appendChild(lab);
  const pr = profile();
  $('#childName').value = pr.name || '';
  $('#childBand').value = pr.band || '2-3';
  const fr = unreviewedCount('fr'), fa = unreviewedCount('fa');
  const note = $('#reviewNote');
  note.hidden = !(fr || fa);
  note.textContent = `Not yet checked by a person: ${fr} French and ${fa} Farsi lines. They are still spoken; see TRANSLATIONS.md to review them.`;
}
$('#childName').addEventListener('change', e => setProfile({ name: e.target.value.trim().slice(0, 24) }));
$('#childBand').addEventListener('change', e => { setProfile({ band: e.target.value }); renderLearning(); });

export { SUGGESTION };
