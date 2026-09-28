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

## Put it online (Michael's steps)
The `dist/` folder is a complete installable app (PWA). Once it's hosted, open the page on the tablet and use **Add to Home screen** / **Install app**. After the first visit it works offline.

1. **Create the GitHub repo.** On github.com: New repository → name it `planet-parade` → *Private* is fine → don't add a README (this repo already has one) → Create.
2. **Push this folder.** In `C:\New folder\PlanetParade`:
   ```
   git remote add origin https://github.com/<your-user>/planet-parade.git
   git branch -M main
   git push -u origin main
   ```
3. **Cloudflare Pages.** dash.cloudflare.com → Workers & Pages → Create → Pages → *Connect to Git*.
4. **Connect the repo.** Authorise GitHub and pick `planet-parade`.
5. **Build settings.** Framework preset: *None*. Build command: leave empty (the build is committed). **Build output directory: `dist`**. Save and Deploy.
6. **Custom domain (optional).** In the Pages project, go to Custom domains → Set up a domain → follow the DNS prompt.

`dist/_headers` sets the caching and security headers on Cloudflare Pages automatically. After you change the game, run `python tools/build_standalone.py`, commit, and push. The installed app picks up the new version the *next* time it's opened, never in the middle of play.

Regenerate the app icons (only if the art changes): `python tools/make_icons.py`.
