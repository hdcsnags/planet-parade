import { Compare } from './compare.js';
import { NumberLine } from './numberline.js';
import { Pattern } from './pattern.js';
import { RoverCode } from './rovercode.js';
import { Sort } from './sort.js';
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
};
