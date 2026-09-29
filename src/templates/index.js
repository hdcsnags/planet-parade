import { Compare } from './compare.js';
import { NumberLine } from './numberline.js';
import { Pattern } from './pattern.js';
import { RoverCode } from './rovercode.js';
import { Sort } from './sort.js';
import { TenFrame } from './tenframe.js';

// Template registry: pack levels name a template id; the SessionRunner instantiates it.







export const TEMPLATES = { tenframe: TenFrame, numberline: NumberLine, compare: Compare, pattern: Pattern, sort: Sort, rovercode: RoverCode };
