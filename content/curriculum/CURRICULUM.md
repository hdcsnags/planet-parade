# Planet Parade curriculum (build spec)

Synthesised from Astra, Gemini, Fable, Kimi, Sol and the platform vision. Data: `curriculum.json`. Conflicts: `DISAGREEMENTS.md`.

**Shape:** 6 strands, 75 levels (39 basic, 36 advanced), 26 templates (6 exist, 3 ported, 17 new). Ages are guides, not gates; the child never sees levels or scores.

**Track rule.** *Basic* (B) is ~2–4 content and is on by default. *Advanced* (A) holds the international raises and ~4–7 content. It opens only when the parent switches it on for the strand **and** every `requires` level is mastered (Kimi: mastery "before any raise unlocks"; Sol: "prerequisite-driven, not age-gated"). Content rises; method stays play (China's anti-小学化 rule, MOE 2012, per Kimi).

## Mastery rules

|Rule|Definition|
|---|---|
|**M**|≥4 of the last 5 *first committed* responses correct, in **each of 2 sessions on different days**, with ≥1 transfer item (new representation or context). Struggle = 3 misses in the window. (Astra, Fable, Gemini)|
|**M4**|M for long items (rover, tangram, rangoli, word builder): 3 of 4. Matches existing `rovercode.json`.|
|**E**|M scored on the *observation* answer. A wrong prediction never counts against her (Astra).|
|**L**|M tracked per language (Astra, Sol).|
|**R**|Rhythm: order plus long/short/rest correct within ±35% of a beat. **UNVERIFIED tolerance.** Never scores speed.|
|**X**|Exploration, never scored.|

"First try" = no miss **and** no answer-revealing glow. Replaying the prompt is fine (Astra). Engine gaps: `progress.js` has no `sessions` count, and `template.js` treats the idle-hint glow as first-try.

## 1. Number (Mercury; number-line levels at Jupiter)

|#|T|Age|Skill / objective|Example|Template|Rule|
|---|---|---|---|---|---|---|
|1|B|2|One-to-one: give 1 each to 1–3; tap-count 1–3|helmet per astronaut|counting_tray `give`/`count`|M|
|2|B|2–3|Count 1–5, choose the total|4 moon rocks → 4-dot card|counting_tray|M|
|3|B|2.5–3|Subitize 1–4 across arrangements|3 lights, dome covers, pick 3|subitize|M|
|4|B|3|More/fewer/same to 5, despite spacing|4 big vs 5 small stars|compare (exists)|M|
|5|B|3–4|Count 6–10, match numeral|8 satellites → 8|counting_tray|M|
|6|B|3–4|One more/less; ±1–2 within 10 by hopping|rocket on 4, hop back 1|numberline (exists)|M|
|7|A|3.5+|**Structured subitizing** 5–10 as "five and some more"|full row + 2 = "five and two"|subitize `fiveAnd`|M|
|8|A|3.5+|**Number bonds to 5**, then the hidden part|5 pods, 3 in rocket, how many under the dome?|bond|M|
|9|A|4+|**Bead frame** 1–10 on the five landmark; complement to 10|7 = one row + 2|bead_frame|M|
|10|A|4+|**Bonds to 10**, missing addend, pictures → numerals|7 + ? = 10|bond|M|
|11|A|4+|**Teens as ten-and-more**, said as "ten and four" before "fourteen"|full cabin + 4|tenframe `teen`|M|
|12|A|4.5+|**Mental-math strings**, untimed, objects on demand|show 6, +2, −1|number_string|M|
|13|A|5+|**Make-ten** within 20|8+5 → 8+2+3|tenframe `makeTen`|M|
|14|A|5.5+|**Bar-model** part-whole stories within 20|12 probes, 5 to Mars, how many to the Moon?|bond `bar`|M|

Evidence:
- L6: Siegler & Ramani 2008 (strong).
- L7: Clements & Sarama (strong); Sol warns against "arbitrary ten-object flashes".
- L8, L10, L14: Singapore NEL 2022 and primary syllabus (Sol; moderate).
- L9: soroban/rekenrek. Barner et al. 2016 is school-age, so no brain-training claims.
- L11: Miller et al. 1995 (moderate).
- L12: anecdotal (Kimi, Sol).
- L13: Grade 1 in China; **UNVERIFIED at 4** (Sol).

**Eliana (2y4m):** start Number at L6 with advanced on; a 3/3 probe moves her to L7, then L8 bonds. This is routing, not a norm.

Existing pack levels become item pools (`existing` in the JSON). compare.5–6/.8 and numberline.4/.7–.8 (skip counting) are unmapped and form a v1.1 extension.

## 2. Measuring & Shapes (Venus)

|#|T|Age|Skill / objective|Example|Template|Rule|
|---|---|---|---|---|---|---|
|1|B|2|Match circle/square/triangle outlines|round pod → round bay|shadow_match|M|
|2|B|2–2.5|**Measurement-first:** longer/taller of two|which antenna is longer?|quantity_balance `compare`|M|
|3|B|2.5–3|Place in/on/under/beside|rover under the bridge|place_scene|M|
|4|B|3|**Measurement-first:** heavier on a pan balance; fuller|which rock is heavier?|quantity_balance|M|
|5|B|3–3.5|Named shapes across size, rotation, odd forms|sideways triangle|shadow_match `named`|M|
|6|B|3–4|Order 3 by length or size|3 rockets, shortest → tallest|line_up (port)|M|
|7|B|3.5–4|Left/middle/right/between on real screen sides, never mirrored|satellite between two moons|place_scene|M|
|8|A|3.5+|**Equalize** two lengths or volumes|make both tracks equal|quantity_balance `equalize`|M|
|9|A|4+|Compose a silhouette from 2–3 pieces|2 triangles → square|tangram|M4|
|10|A|4+|**Units** end to end; spot gaps and overlaps; smaller unit → bigger count|strip = 6 tiles; with half tiles?|quantity_balance `unitCount`|M|
|11|A|4+|3D solids across views|planet = sphere, nose = cone|shadow_match `views`|M|
|12|A|5+|Tangram, 4–5 pieces, quarter-turn rotation|rocket from 5 pieces|tangram|M4|
|13|A|5+|Mirror symmetry on a dot grid|finish the nebula wing|rangoli|M4|

Evidence:
- Davydov (Sol, PMC7711087; Kimi, *Measure Up*) is supported in Grade 1, not toddlers. So direct comparison is basic play; equalizing and units are advanced.
- Tangram: Uttal et al. 2013 (strong); cultural-form claims **UNVERIFIED**.
- Rangoli: India NCF 2022 (Sol); anecdotal pedagogy.
- Ontario Grade 1 E1.4–E1.5 (Astra).

## 3. Logic & Patterns (Saturn; rover and sequences at Mars)

|#|T|Age|Skill / objective|Example|Template|Rule|
|---|---|---|---|---|---|---|
|1|B|2|Sort 4 by kind into 2 craters|stars / moons|sort (exists)|M|
|2|B|2–2.5|Sort 5 by colour or size|big / small rocks|sort|M|
|3|B|2.5–3|Continue AB|moon, star, moon, star, ?|pattern (exists)|M|
|4|B|3|Odd one out of 4|3 rockets + a moon|math_circle `oddOne`|M|
|5|B|3–3.5|Plan 2–3 forward moves|FFF to the rock|rovercode (exists)|M4|
|6|B|3.5–4|Extend AAB/ABB/ABC|rocket, rocket, moon…|pattern|M|
|7|B|3.5–4|Order 3 procedure steps|helmet, climb in, blast off|story_sequence|M|
|8|A|4+|Missing middle; find the wrong car|red, ?, yellow|pattern `blank:middle`/`fixMode`|M|
|9|A|4+|Route with one turn; step-by-step drive|F L F|rovercode `plan`/`drive`|M4|
|10|A|4.5+|Two-attribute sort into 4|red/blue × moon/star|sort|M|
|11|A|4.5+|Odd one out *with a reason*; what changed|odd pod: colour, stripes or size?|math_circle|M|
|12|A|5+|Plan 5–6 moves around rocks; predict and fix one bug|swap L for R|rovercode `debug`|M4|
|13|A|5.5+|Growing patterns +1/+2|1, 2, 3 lights…|pattern `grow`|M|

Evidence: Ontario Grade 1 C3.1–C3.2 coding (Astra). Math circle: Zvonkin (Kimi; anecdotal, low risk). A clue-elimination mode is reserved (Sol).

## 4. Science: Space & Earth (Earth; space topics at the Moon)

|#|T|Age|Skill / objective|Example|Template|Rule|
|---|---|---|---|---|---|---|
|1|B|2|Sort pictures into day sky / night sky|Sun → day, stars → night|sort `sky`|M|
|2|B|2–2.5|Find Sun, Moon, cloud, rain or snow in photos|where is the rain?|find_hear (port)|M|
|3|B|2.5–3|Hot vs cold (sourced facts)|Sun / snowman|sort `temp`|M|
|4|B|3|What living things need|plant: water or toy?|find_hear|M|
|5|B|3–3.5|Find a named planet (real images)|where is Saturn?|find_hear|M|
|6|B|3.5–4|Sink/float: predict → verified test → report|wooden block|observe_change|E|
|7|A|4+|Shadow falls opposite a moved lamp|lamp left → shadow right|observe_change|E|
|8|A|4+|Turn Earth: home faces the Sun or away|turn until home is dark|dial `globe`|M|
|9|A|4.5+|Rocky vs gas; star/planet/moon roles|Jupiter = gas giant|sort `bodyType`|M|
|10|A|4.5+|Order a local seasonal cycle; spot the change|tree through the year|story_sequence `cycle`|M|
|11|A|5+|4 Moon landmarks; the Sun lights the Moon|new → full → …|dial `moon`|M|
|12|A|5.5+|Fair test: change one factor, read the result|ice in sun vs shade|observe_change|E|

Every fact needs a NASA/ESA source URL. Never teach "heavy things sink" or "phases are Earth's shadow" (Astra). Gemini's fall-rate level is dropped as wrong (Sol). Ontario Grade 1 Science E2.1–E2.6 covers L8/L10 (Astra).

## 5. Words & Letters (Neptune). Authored separately per language, never translated.

|#|T|Age|Skill / objective|Example|Template|Rule|
|---|---|---|---|---|---|---|
|1|B|2|Tap the named picture among 2–3|where is the comet?|find_hear|L|
|2|B|2–2.5|One-step action|astronaut in the rocket|place_scene|L|
|3|B|2.5–3|Opposites|tap the one going down|find_hear `opposite`|L|
|4|B|3|Two-step instruction|rocket, then Moon|find_hear `steps:2`|L|
|5|B|3–3.5|Order 3 pictures after a story|—|story_sequence|L|
|6|B|3.5–4|One tap per syllable (counts taps, not timing)|Ju-pi-ter = 3|sound_match|L|
|7|B|3.5–4|Rhyme (reviewed pairs per language)|moon: spoon?|sound_match|L|
|8|A|4+|Same first sound, no letters|mmm-moon: Mars|sound_match|L|
|9|A|4+|Letter names in her script (Persian isolated forms first)|where is M?|find_hear `letter`|L|
|10|A|4.5+|Sound → letter; optional trace, never scored|/s/ → S|letter_path|L|
|11|A|5+|Blend 2–3 sounds → picture|s-u-n|sound_match `blend`|L|
|12|A|5+|Build a word from taught tiles|sun|word_builder|M4/locale|
|13|A|5.5+|Read a decodable sentence → pick the scene (audio off)|"The cat sat."|find_hear `sentence`|L|

Evidence: Hoff et al. 2012 (strong), no vocabulary delay once all languages are counted. Ontario Language Grade 1 B2 and C1.1/C1.3 (Astra, Fable). English alignment says nothing about French or Persian (Astra).

## 6. Music & Rhythm (Uranus). Supported by Fable and Gemini; Astra defers it. Build last.

|#|T|Age|Skill / objective|Example|Template|Rule|
|---|---|---|---|---|---|---|
|1|B|2|Play along with a steady beat|pulsar drum|echo `beat`|X|
|2|B|2–2.5|Louder / softer|which drum was louder?|echo `compare`|M|
|3|B|2.5–3|Faster / slower|rocket vs asteroid beat|echo `compare`|M|
|4|B|3|Echo 2 taps|ta ta|echo|R|
|5|B|3–3.5|Higher / lower (octave)|chime vs rumble|echo `compare`|M|
|6|B|3.5–4|Echo 3 with long and short|ta, ta-ti, ta|echo|R|
|7|A|4+|Tune goes up or down|do-mi-sol|echo `compare`|M|
|8|A|4.5+|Echo 4 with a rest|ta ta – ta|echo|R|
|9|A|5+|Play back 3 notes on 3 keys|Mercury-Venus-Earth|echo `melody`|R|
|10|A|5+|Match a rhythm to its pattern train|long short long short|pattern `rhythm`|M|

Arts curriculum codes cited by Gemini and Fable are **UNVERIFIED**.

## Template catalogue

**Exist** in `src/templates/` (registered):
- `tenframe`: fill/count/bond/bondPick/teen. **Extend** with `makeTen`, `frames:2`, `sayAs:"tenAnd"`.
- `numberline`: hop/add/sub/mix/skip, predict.
- `compare`: more/less/equal/bigger/smaller/biggest.
- `pattern`: AB…ABCD, grow. **Extend** with `fixMode` and `token:"rhythm"`.
- `sort`: kind/colour/size. **Extend** with content attributes (`sky`, `temp`, `bodyType`) and `set`.
- `rovercode`: plan. **Extend** with `mode:"drive"|"debug"`.

**Port** from `src/templates/legacy/`:
- `counting_tray` (count.js): give/count/addTake/make.
- `find_hear` (find.js + words.js): prompts by word, opposite, letter or sentence.
- `line_up` (order.js).

**New:**
- `subitize`: cover-and-peek. `peekMs` 2000 is display-only (**UNVERIFIED** value); unlimited replay; no response timing.
- `bond`: part-whole circles or bar; CPA `stage` (Singapore).
- `bead_frame`: 2×5 beads with a colour change at five (soroban/rekenrek).
- `number_string`: untimed operation chains (Japan/Netherlands).
- `quantity_balance`: compare, equalize, unit measure (Davydov).
- `shadow_match`: outlines, names, rotations, 3D views.
- `place_scene`: put the object where the voice says.
- `tangram`: any valid solution counts (China).
- `rangoli`: dot-grid copy, extend and mirror (India).
- `math_circle`: odd one out, reasons, what changed (Zvonkin).
- `story_sequence`: ordered or cyclic cards.
- `observe_change`: predict, demonstrate, observe (Japanese experiential science).
- `dial`: quarter-turn globe or Moon.
- `sound_match`: syllables, rhyme, first sound, blend.
- `letter_path`: sound → letter; optional checkpoint trace.
- `word_builder`: taught tiles; Persian joining and vowel support.
- `echo`: beat, compare, echo, melody.

Interaction: tap or tap-then-tap, targets ≥64 px. No double-tap, required hold, precision drag or timed answer (Astra, Fable). Keep counters plain; distracting manipulatives hurt learning (Sol).

## Placement and adaptivity

1. **Start.** Per strand, the parent picks "she can already do this" from example items. The advanced track is a per-strand toggle.
2. **Probe** (first visit, or when the parent asks). Three reserved items: prerequisite, target, transfer. 3/3 → one level up (provisional). 2/3 → stay. 0–1 → demonstrate, then offer the prerequisite. A probe is never mastery: skipped levels become *placed*, not *done*, so they add no moons. (`applyProbe` currently marks them done.)
3. **Visit.** 3–5 items, under 3 minutes: one warm-up from a mastered level, then current-level items, plus at most one look-ahead item after 3 of 4 first-try, counting only toward advancing (Fable's 70/20/10, adapted).
4. **Support.** After 2 consecutive misses: speak the true answer, cut choices to 2, drop one CPA stage or show counters. After 3 misses in the window: offer the prerequisite **for this visit only**; mastery is never erased. (`recordResult` currently steps back permanently.)
5. **Independence.** Challenge, motor support and language are set separately, so a toddler can do L10 bonds with big counters and no digits (Astra).

## Space Map

The Sun hub/Playground holds the parent gear and free play (Tap & Hear, Planet Song, Rocket Trip).

|Station|Strand|Current pack|
|---|---|---|
|Mercury|Number|tenframe (stays)|
|Jupiter|Number track|numberline (stays)|
|Venus|Measuring & Shapes|sort moves to Saturn|
|Earth / Moon|Science|pattern → Saturn; Moon is new|
|Mars|Logic: rover, sequences|rovercode (stays)|
|Saturn|Logic: patterns, sorting, math circle|compare moves to Mercury|
|Uranus|Music|none|
|Neptune|Language|none|

All stations are open from day one; nothing dims (Astra, Kimi, Sol). Each mastered level adds a moon, as the hub does now. Schema: `strand` adds `space` and `music`; levels add `track`, `requires`, `variants` and `mastery.sessions`.

## v1 content volume

|Kind|Levels|Items|Total|
|---|---|---|---|
|Generated (number, music, most space/logic)|44|30 each (3 probe + 3 transfer reserved)|1,320|
|Authored, shared (science, tangram, rangoli, math circle, sequences)|18|18 each|324|
|Authored per language|13|18 × 3|702|
|**Total**|**75**||**≈2,346 records**|

Minimum viable per level: 13 (10 practice + 3 probe). Generators run at build time with deterministic checks; facts, translations, rhymes, letters and audio are human-verified.

## Where the sources disagree

Resolved (full table in `DISAGREEMENTS.md`): Music is in but built last; Astra's two-session mastery rule is used, not 5/5; the probe checks prerequisite, target and transfer rather than jumping L+2/L+4; step-back lasts one visit only; subitize uses peek-and-replay instead of a 600 ms flash; measurement starts at 2; four packs move stations. Two items need Michael:
- **Ontario references:** Astra says the 2026 Kindergarten program replaced the 2016 one that Fable and Gemini cite, so their OE numbers are **UNVERIFIED**.
- **Release cap:** the vision's "~10 new items per release" cannot deliver 2,346 records.
