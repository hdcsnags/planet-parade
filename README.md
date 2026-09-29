# Planet Parade

Talking space learning games for ages 2–7, in English, French and Farsi. Voice-first, never
"wrong", no ads, no accounts and no tracking. It works offline as a single file or as an
installable app.

**Live site:** https://hdcsnags.github.io/planet-parade/ · **Privacy:** [PRIVACY.md](PRIVACY.md)
(Planet Parade collects nothing) · **Licence:** see [LICENSE](LICENSE) (all rights reserved for now).

## What's inside
- **The Space Map:** a scrolling solar system. Each planet is a station for one skill strand. Tap a
  planet and the rocket flies there. Sessions last under 3 minutes and return to the map, and every
  level she masters adds a moon orbiting that station.
  - **Mercury:** counting with ten-frames (to 20, bonds of 5 and 10)
  - **Venus:** sorting into craters (by one thing, then two)
  - **Earth:** the pattern train (AB, ABB, ABC, growing patterns)
  - **Mars:** rover code (Forward / Left / Right plans on a grid)
  - **Jupiter:** number-line hops (add and subtract within 10 and 20, skip counting)
  - **Saturn:** the balance scale (more, less, equal, numbers to 20)
- **The Playground** (next to the Sun): the original six games.
  - Tap & Hear with the Planet Song
  - Find It, including left / middle / right
  - Rocket Trip
  - Line Up
  - Count & Add
  - Space Words
- **Grown-ups** (hold the gear):
  - language and voice picker
  - learning path per station (starting step and "Try harder?")
  - child name and age band
  - play-time limit with a gentle goodnight
  - a "Today" summary kept on the device only
  - the Recording Studio for family voices (offline file only)

## How it's built
```
src/            ES modules: core, i18n, audio + speech, engine (stage, art, template, session, components),
                templates/ (six curriculum templates + legacy/ original games), hub/ (Space Map, router), ui/
content/packs/  one JSON pack per strand: 8 levels each (age band, skill, objective, template, params,
                items or a generator, mastery rule); items carry `source` for facts and `reviewed_by`
content/i18n/   en.json · fr.json · fa.json (every spoken line; `_reviewed` records who checked it)
content/schema/ pack.schema.json
tools/          validate.mjs · fonts.mjs · postbuild.mjs · tour.mjs · seed-packs.mjs · make_icons.py
public/         PWA files (manifest, icons, Cloudflare _headers)
dist/           build output: one self-contained index.html + PWA files
```

```
npm ci
npm run build        # fonts → validate (fails the build on bad content) → vite (single file) → sw.js
npm run tour         # Playwright screenshot tour (en/fr/fa) using the installed Microsoft Edge → tours/
npm run dev          # local dev server
node tools/postbuild.mjs <path>.html   # also write the claude.ai artifact version of the page
```

Content rules enforced by `npm run validate`:
- every pack matches the schema
- level ids are unique
- templates exist
- every rover puzzle is solvable within its slots
- en, fr and fa have the same keys
- every key the code uses exists
- facts need an `https://` source

Lines not yet checked by a person are allowed during the family phase. The build log counts them,
and the grown-ups panel flags them.

## Publishing
**GitHub Pages (live):** `.github/workflows/pages.yml` runs on every push to `main`: `npm ci` → validate
→ build → deploy `dist/`. If anything fails, nothing is deployed. The app uses only relative URLs, so it
works under `/planet-parade/`. The manifest's `start_url` and `scope` are `./`, and the service worker is
scoped to the sub-path. Updates install quietly and apply on the next launch, never mid-game.
GitHub Pages ignores `_headers`; those caching and security headers apply only on Cloudflare Pages.

**Cloudflare Pages (optional, custom domain):**
1. dash.cloudflare.com → Workers & Pages → Create → Pages → Connect to Git → pick `planet-parade`.
2. Build command `npm run build`, build output directory `dist`.
3. Custom domains → Set up a domain.

Regenerate the app icons (only if the art changes): `python tools/make_icons.py`.

## Curriculum status

`content/curriculum/curriculum.json` is the canonical ladder (6 strands, 75 levels), imported with
`node tools/import-curriculum.mjs`. Now: 61 levels ready, 3 in Family Lab (observe_change: science.6,
.7, .12, until each fact has a reviewed source), 11 planned (not shown): the per-language Language
templates (sound_match, letter_path, word_builder, find_hear letters/sentences) need native-speaker
authoring; tangram (space.9, .12); living-needs pictures (science.4).
