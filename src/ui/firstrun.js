import { $ } from '../core/util.js';
import { applyBand, profile, setProfile } from '../progress/progress.js';

// First launch: one tap picks an age band and sets a good starting point on every planet, with an
// optional name for greetings. No gear hold needed. Shown once per device (profile.onboarded);
// everything it sets can be changed later in the grown-ups panel.

export function maybeFirstRun(onDone) {
  const box = $('#firstRun');
  if (!box || profile().onboarded) { if (onDone) onDone(); return; }
  box.hidden = false;
  const finish = band => {
    const name = ($('#firstName').value || '').trim().slice(0, 40);
    if (band) applyBand(band);
    setProfile({ ...(band ? { band } : {}), ...(name ? { name } : {}), onboarded: true });
    box.hidden = true;
    if (onDone) onDone();
  };
  box.querySelectorAll('button[data-band]').forEach(b => { b.onclick = () => finish(b.dataset.band); });
  $('#firstSkip').onclick = () => finish(null);
  $('#firstName').focus({ preventScroll: true });
}
