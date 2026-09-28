# Planet Parade

Six talking space games for toddlers, in English, French and Farsi. It's one HTML file with no build step to play and no tracking, and it works offline.

- **Tap & Hear**: planets say their names and facts, and the ♪ Planet Song sings them in order.
- **Find It**: "Where is Saturn?", plus left / middle / right rounds.
- **Rocket Trip**: fly past all eight planets.
- **Line Up**: put the planets in order (it reads right-to-left in Farsi).
- **Count & Add**: counting, adding, taking away (flies away, space whale, rolls off a ramp), "which has more?", Make N and left / middle / right. Difficulty adapts gently.
- **Space Words**: ten space words that come alive as toys, each available in all three languages.

Grown-ups hold the gear button for settings: language, voice picker, number range, play-time limit with a gentle goodnight, a "Today" summary kept on the device only, and (in the offline file) a Recording Studio for family voices.

## Files
- `planet-parade.html`: the source (also published as a claude.ai artifact).
- `tools/build_standalone.py`: builds `dist/index.html`, a single offline file with the fonts inlined and the Recording Studio enabled.
- `dist/index.html`: open this on a tablet, or host the `dist/` folder (for example on Cloudflare Pages).
- `TRANSLATIONS.md`: French and Farsi lines and review status.
- `fonts/`: cached Google Fonts subsets (OFL) used by the build.

## Build
```
python tools/build_standalone.py
```
