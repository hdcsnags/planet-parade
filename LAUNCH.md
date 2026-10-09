# From "my dad built this" to "we launched this": the path

*2026-10-09. The question: how does Planet Parade go from a family project to something shared with
many children through a school board, without losing what makes it good.*

## The asset you already have
The pitch to a school board is not the space theme or the three languages. It is **nothing leaves the
device**: no accounts, no tracking, no network calls during play, offline as one file, `PRIVACY.md`
says "collects nothing". That removes the privacy review that blocks most classroom apps. Protect it:
never add analytics, logins or "outcome measurement". Teachers' feedback is the measurement.

## What has to be true before the first classroom
1. **A shared-tablet profile switch.** `progress.js` already keeps profiles (`data.profiles`, hooks
   "ready for cousins"). A kindergarten iPad is shared by 20 children: add a picture-based child
   picker (no typing, no names on screen if the teacher prefers) and a per-profile Today summary.
   This is the single biggest product gap for classrooms.
2. **French reviewed by a person.** 360 of 360 French lines are unreviewed. In Ontario, French is
   not optional for a board-wide share. Farsi can stay family-phase.
3. **One page for grown-ups.** What it teaches (the six strands), what a moon means, the three
   switches (Advanced, Challenge, Family Lab), and the privacy line. Plain language, printable.
4. **A terms line and a licence decision.** The repo is "all rights reserved for now"; the live app
   is free. Say what people may do with it before it spreads.
5. **Accessibility pass.** Tap targets are already ≥64 px and captions stay on screen; check
   reduced-motion (`reduced` exists), colour contrast on the result tiles, and a voice-off path.

## The pilot
- Two or three kindergarten classes (ages 4–5 match the game's 4–5 band), on the board's iPads,
  for four weeks. Teachers get the one-pager and a 10-minute walkthrough.
- Collect **teacher** observations only: which stations children choose, where they stall, what
  they say out loud, what breaks. No child data.
- Ship fixes weekly; the Pages deploy is one merge.

## Content growth, in the order the evidence supports (see `content/curriculum/EVIDENCE.md`)
1. Finish the 11 planned levels: language (authored natively per language), tangram, living needs.
2. Moon → spoken planet fact; "count together" correction after a second miss; co-play prompt.
3. Stretch variants at the top of Number (compose a number several ways, estimate on 0–100, debug
   a sequence) so advanced children meet real difficulty.
4. Science beyond space: states of matter and simple machines as `observe_change` items with
   NASA/ESA or equivalent sources. Interactive sims (Godot HTML5 export in a window) fit this
   template better than generated video, which cannot be sourced.
5. Coding precursors stay at sequencing and fix-the-path until age 5; rover `debug` mode is the
   right shape.

## What not to do
- No accounts, analytics, leaderboards, streaks, stickers or "gifted" labels.
- Don't gate anything by age; gate by demonstrated mastery, which the engine already does.
- Don't ship AI-generated science footage as fact.
