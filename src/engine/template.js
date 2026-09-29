import { boop } from '../audio/audio.js';
import { say, showCaption } from '../audio/speech.js';
import { LANG } from '../i18n/i18n.js';
import { celebrate } from './components.js';
import { H, W } from './stage.js';

// Base class for curriculum templates. A template plays short rounds of one level; the SessionRunner
// owns progress, the ≤3-minute loop and the trip back to the Space Map.
//
// Rules every template inherits (proven with Eliana, see the platform vision):
//   * voice first: every prompt is spoken, and the caption stays on screen while she thinks;
//   * never fail: a wrong pick wiggles and names itself, the prompt comes back, no penalty sound;
//   * after two misses (or ~9 s of quiet) the right answer glows (`this.hint`);
//   * the child never sees a level number or a score.






export class Template {
  constructor(run, level) {
    this.run = run; this.level = level; this.p = level.params || {};
    this.items = level.items || null; this.itemIdx = Math.floor(Math.random() * 1000);
    this.busy = true; this.misses = 0; this.idle = 0; this.promptText = ''; this.hint = false;
    this.restorePrompt = () => { if (!this.busy && this.promptText) showCaption(this.promptText, LANG, true); };
  }
  // ---- hooks for subclasses
  makeRound(item) {}   // set up one round and call this.ask(...)
  layout() {}
  onTap(x, y) {}
  step(dt) {}
  render(t) {}
  // ---- shared lifecycle
  start() { this.nextRound(); }
  nextItem() { return this.items ? this.items[this.itemIdx++ % this.items.length] : null; }
  nextRound() { this.misses = 0; this.hint = false; this.idle = 0; this.busy = false; this.promptText = ''; this.makeRound(this.nextItem()); this.layout(); }
  ask(text, then) { this.promptText = text; say(text, { persist: true, onend: then }); }
  repeat() { if (this.promptText) this.ask(this.promptText); }
  miss(line) {
    this.misses++; boop();
    if (line) say(line, { onend: this.restorePrompt });
    if (this.misses >= 2) this.hint = true;
  }
  win(line, x = W / 2, y = H * .45) {
    if (this.busy) return;
    this.busy = true; this.promptText = '';
    celebrate(x, y);
    say(line);
    this.run.roundDone(this.misses === 0);
  }
  tap(x, y) { if (this.busy) return; this.idle = 0; this.onTap(x, y); }
  update(dt) {
    this.idle += dt; this.step(dt);
    if (!this.busy && this.idle > 9) { this.idle = 0; this.hint = true; this.repeat(); }
  }
  draw(t) { this.render(t); }
}
