import { BeadFrame } from './beadframe.js';
import { Bond } from './bond.js';
import { Compare } from './compare.js';
import { CountingTray } from './countingtray.js';
import { Dial } from './dial.js';
import { Echo } from './echo.js';
import { FindHear } from './findhear.js';
import { LineUp } from './lineup.js';
import { MathCircle } from './mathcircle.js';
import { NumberLine } from './numberline.js';
import { NumberString } from './numberstring.js';
import { Pattern } from './pattern.js';
import { PlaceScene } from './placescene.js';
import { QuantityBalance } from './quantitybalance.js';
import { RoverCode } from './rovercode.js';
import { ShadowMatch } from './shadowmatch.js';
import { Sort } from './sort.js';
import { StorySequence } from './storysequence.js';
import { Subitize } from './subitize.js';
import { TenFrame } from './tenframe.js';

// Template registry: pack levels name a template id; the SessionRunner instantiates it.
// One entry per line. A trailing `// lab` marks a template that is built but still being tried
// out: its levels import as status "lab" and appear only with the grown-ups' Family Lab switch.
// Templates not listed here import as "planned" and are skipped. (tools/import-curriculum.mjs)







export const TEMPLATES = {
  tenframe: TenFrame,
  numberline: NumberLine,
  compare: Compare,
  pattern: Pattern,
  sort: Sort,
  rovercode: RoverCode,
  bond: Bond,
  bead_frame: BeadFrame,
  number_string: NumberString,
  subitize: Subitize,
  quantity_balance: QuantityBalance,
  counting_tray: CountingTray,
  place_scene: PlaceScene,
  story_sequence: StorySequence,
  math_circle: MathCircle,
  shadow_match: ShadowMatch,
  find_hear: FindHear,
  line_up: LineUp,
  dial: Dial,
  echo: Echo,
};
