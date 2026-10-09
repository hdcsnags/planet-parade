# How 2-to-6-year-olds learn: the evidence, and what Planet Parade does about it

*Research pass 2026-10-09. Sources gathered by Claude Opus 5.5 (web search, 30 lookups); mapping
to the game by Claude Mythos 5.1 after building the ramp (PR #1) and Challenge (PR #2). Strength:
**S** strong (meta-analysis, RCT, replicated) · **M** moderate · **W** weak or single-study ·
**C** contested. Effect sizes were read from abstracts and summaries, not every full paper; check
the original before quoting a number. Council seats before this: Astra, Gemini, Fable, Kimi, Sol
(see `CURRICULUM.md`, `DISAGREEMENTS.md`).*

## Part 1 — What the evidence says

### 1. Number sense
- **Linear number board games cause lasting gains.** About an hour on a 1–10 linear board game improved number-line estimation, magnitude comparison, counting and numeral identification; gains held 9 weeks later. The same game with colours instead of numbers did nothing. The linear layout plus counting on from the current square is the active ingredient. **S** — Siegler & Ramani 2008, https://onpurposely.com/wp-content/uploads/2023/10/sieg-ram08.pdf
- **Training the approximate number system trains only that.** Transfer to symbolic arithmetic is unproven (Szűcs & Myers 2017 meta-analysis found none). **C, leaning null** — https://www.frontiersin.org/articles/10.3389/fpsyg.2019.02084/full
- **Spontaneous focusing on numerosity (SFON) predicts arithmetic years later**, independent of counting skill; low scorers do fine once prompted to attend to number. **M** — Hannula & Lehtinen; McMullen et al. 2015, https://pmc.ncbi.nlm.nih.gov/articles/PMC6132254
- **Counting talk about visible sets predicts cardinality.** Parent number talk at 14–30 months predicted cardinal knowledge at 46 months; only talk that counts or labels present, visible sets mattered. **M–S** — Levine et al. 2010, https://pmc.ncbi.nlm.nih.gov/articles/PMC2998540 ; Gibson et al. 2020 (experimental).
- **Learning-trajectory curricula work.** Building Blocks: g = 0.72 in a cluster RCT of 1,375 preschoolers. Order: subitize → count → cardinality → compare → compose/decompose → add/subtract. **S** — Clements & Sarama 2011, https://www.mheducation.com/prek-12/resources/research/library/math/effects-of-a-research-based-preschool-math-curriculum.html

### 2. Executive function
- **Gains are narrow.** Training improves the trained skill; wide transfer does not occur. Programmes that keep raising the challenge and meet social-emotional needs do best. **S** — Diamond & Ling 2016, https://pmc.ncbi.nlm.nih.gov/articles/PMC5108631/
- **Tools of the Mind failed its large RCT** (877 children, good fidelity; some negative effects). **S** — Nesbitt & Farran 2021, https://monographmatters.srcd.org/?p=2227
- **Generic N-back / task-switching drills don't improve executive function.** **M** — same source.

### 3. Spatial reasoning
- **Spatial skills are trainable and transfer**, g = 0.47 over 217 studies, largest in young children, durable. **S** — Uttal et al. 2013, https://pubmed.ncbi.nlm.nih.gov/22663761/
- **Block-copying at 3 predicts early math** after controlling for executive function. **M–S** — Verdine et al. 2014, https://www.srcd.org/news/playing-blocks-may-help-childrens-spatial-and-math-thinking
- **Spatial vocabulary grows most under guided play**: guided play beat free play (g = 0.93) and beat direct instruction on shape knowledge (g = 0.63). **M** — Skene et al. 2022, https://ueaeprints.uea.ac.uk/id/eprint/90660

### 4. Language and literacy in multilingual children
- **Dialogic reading builds oral language** (adult prompts, child talks, adult expands); no discernible effect on phonological processing. **S** — WWC, https://www.readingrockets.org/article/preschool-language-and-literacy-practices
- **Phonological awareness transfers across languages**; bilingualism gives a small advantage or none, never harm. **M** — https://www.cambridge.org/core/journals/applied-psycholinguistics/article/crosslanguage-transfer-of-phonological-awareness-in-lowincome-spanish-and-english-bilingual-preschool-children/3C66A0C5CA9762AE88657CAC3B17FB63
- **Letter-sound knowledge and phonological awareness at 4–5 are among the strongest predictors of reading.** No evidence letters hurt 3–5-year-olds; the cost is opportunity cost if drill starves oral language. **S** — National Early Literacy Panel 2008, https://lincs.ed.gov/publications/pdf/NELPReport09.pdf
- **Bilingual vocabulary is spread across languages**; total conceptual vocabulary is comparable. Use each language fully; don't translate word-for-word. **M** — Hoff et al.; Pearson et al. 1993

### 5. Science reasoning
- **Surprise drives explanation and better experiments** from age 3: predict, observe, explain the surprise. **M–S** — Legare 2012, https://pmc.ncbi.nlm.nih.gov/articles/PMC3039682
- **Telling the answer narrows exploration.** After direct instruction, preschoolers explored only what they were shown. **S, replicated** — Bonawitz et al. 2011, https://pmc.ncbi.nlm.nih.gov/articles/PMC3369499
- **Predictable astronomy misconceptions**: flat Earth, a sun that "goes to sleep", a "down" in space; over-simple images entrench them. **M** — Vosniadou & Brewer 1992/1994

### 6. Computational thinking precursors
- **Programming improves sequencing at 4–7**, mostly from developers' own studies. **M–W** — Kazakoff & Bers; https://kinderlabrobotics.com/research
- **ScratchJr suits K–2**; under 5, use ordering physical-story steps and "fix the path" debugging, not abstract blocks. **M** — Strawhacker et al., https://sites.bc.edu/devtech/wp-content/uploads/sites/181/2018/05/EDUCON.pdf

### 7. Memory science in preschoolers
- **Spacing helps 2–3-year-olds generalise** after a delay. **M–S** — Vlach et al. 2008/2012, https://pmc.ncbi.nlm.nih.gov/articles/PMC3399982
- **Retrieval practice works at 5–6 only with cued recall plus immediate corrective feedback** and enough initial success. **M** — Kliegl et al. 2018, https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6110808/ ; Fazio & Marsh 2019, https://scholars.duke.edu/publication/1367137
- **Interleaving is untested below school age.** **W for preschool** — Rohrer (grade 4+)

### 8. Motivation
- **Expected tangible rewards undermine intrinsic motivation** (d ≈ −0.3 to −0.4); preschoolers promised a "Good Player" award later drew less. **S, disputed by Cameron** — Deci, Koestner & Ryan 1999, https://home.ubalt.edu/ntygmitc/642/Articles%20syllabus/Deci%20Koestner%20Ryan%20meta%20IM%20psy%20bull%2099.pdf
- **Process praise beats person praise.** Toddlers' process praise predicted challenge-seeking 5 years later (**M**, Gunderson 2013, https://now.temple.edu/news/2013-02-11/praising-effort-toddlers-predicts-positive-attitudes-toward-challenges); "you are a good drawer" undermined 4-year-olds' persistence vs "you did a good job drawing" (**M**, Cimpian 2007); praising for being smart increased cheating (**M**, Zhao 2017, https://journals.sagepub.com/doi/full/10.1177/0956797617721529).
- **Growth-mindset interventions are weak overall.** **S** — Sisk et al. 2018

### 9. Gifted and advanced young children
- **Acceleration has the strongest evidence of any gifted intervention**, including subject-level acceleration, with no social-emotional harm on average. **S** — A Nation Empowered (Belin-Blank 2015), https://www.accelerationinstitute.org/nation_empowered
- **Early identification is unreliable**; preschool IQ is unstable. Respond to demonstrated performance, don't label. **S** — https://ideas.repec.org/a/taf/ugtixx/v21y2006i1p47-65.html
- **Gifts become talents only through development** (Gagné; Renzulli adds task commitment and creativity). **framework** — https://gifted.uconn.edu/schoolwide-enrichment-model/three-ring_conception_of_giftedness
- **Underchallenge is common and harmful**; children who never meet difficulty may avoid it later. **M** — https://now.uiowa.edu/node/41081
- **Asynchronous development and perfectionism** are clinically described, thin on evidence at 2–6. **W**

### 10. Screen-based learning
- **The four pillars**: active (minds-on), engaged (no distracting extras), meaningful, socially interactive, in service of a learning goal. **S, consensus** — Hirsh-Pasek et al. 2015, https://www.psychologicalscience.org/publications/educational-apps.html
- **The video deficit is real**: ≈0.5 SD at 0–6, ≈0.25 SD after 3. **S** — Strouse & Samson 2021, https://red.library.usd.edu/se-fp/3
- **Only taps aimed at the relevant object help**; "tap anywhere" disrupted learning in 3-year-olds. **M** — Kirkorian et al. 2016, https://www.childrenandscreens.org/learn-explore/research/young-child-learning-attention-and-screen-use-heather-kirkorian-phd/
- **Joint media engagement improves learning.** **M**

### 11. Play versus direct instruction
- **Guided play works**: a prepared environment with a goal, child leads, adult scaffolds. Beats direct instruction on early math (g = 0.24), shapes and task switching; never worse. **M–S** — Weisberg et al. 2016, https://www.cmu.edu/dietrich/psychology/pdf/klahr/PDFs/Guided%20Play%202016.pdf
- **Pure discovery is the weakest option for specific skills.** **S** — Alfieri et al. 2011

## Part 2 — Planet Parade against the evidence

**Already right (keep, don't regress):**
- No scores or levels shown to the child; no streaks, points or stickers (checked: zero such lines in `en.json`). No person praise anywhere ("smart", "clever", "genius": zero hits). Lines name the fact ("Yes! Four!").
- Mastery needs two sessions on different days with a transfer item (§7 spacing, §1 generalisation). The ramp (2026-10-09) adds within-level difficulty so advanced children meet challenge without failure framing (§9 underchallenge, Diamond's "keep raising the challenge").
- Acceleration by demonstration: the probe ("Try harder?") and `placed` levels; no gifted label anywhere (§9).
- The Number ladder follows the Clements/Sarama trajectory (§1); Jupiter is a linear number line with counting-on (§1, the best-evidenced mechanic).
- Every tap is on the relevant object; there is no "tap to continue" (§10).
- Science: predict → observe → report in `observe_change`; the misconception list (no sleeping sun, no Earth-shadow phases) is in `CURRICULUM.md` (§5).
- Spatial language in `place_scene`; shape composition and rangoli symmetry (§3).
- Guided play, not drill: 3-minute visits, open Playground, parent sets the start by example (§11).

**Tensions the evidence raises (decide, don't drift):**
1. **Moons are a performance-contingent visible reward** (§8). Mitigation that keeps the moons: make each new moon *informational* as well — it unlocks and speaks one sourced fact about that planet (`pfact` already exists for free play). Never add streaks, daily goals or sticker books.
2. **Correction after a miss is thin** (§7: retrieval works only with immediate corrective feedback). Today a wrong tap names itself and the answer glows after two misses. Add a "together" line after the second miss: the narrator counts the set aloud with the child ("Let's count: one, two, three. Three moons!") before the retry. Cheap, per-template.
3. **No social layer** (§10 joint media engagement, §1 number talk about visible sets). Add one line to the grown-ups "Today" panel after each visit: a co-play prompt keyed to the level she played ("Ask: how many spoons on the table?"). Keep it on-device.
4. **Letters** (§4): the planned per-language language levels are right to be authored natively and kept one script per activity. Don't delay them past age 4 for a child who is reading-curious.

**Not worth building (the evidence says no):** executive-function mini-games, dot-flash approximate-number drills, mindset messaging, a "gifted mode", analytics to prove outcomes.

## Part 3 — Backlog this creates (ordered)
1. Moon → spoken planet fact (informational reward). Small.
2. "Count together" correction after the second miss in counting_tray, tenframe, subitize, bond. Small per template.
3. Co-play prompt in the Today panel, one line per level played. Small; needs ~75 prompt lines × 3 languages.
4. Finish the 11 planned levels: language templates (native authoring), tangram, living-needs pictures.
5. Stretch variants for the top of the Number ladder: compose 7 several ways, estimate on 0–100, debug a broken sequence (§9: a deeper ceiling, not more of the same).
