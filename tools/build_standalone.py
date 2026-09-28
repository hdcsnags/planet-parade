"""Build dist/index.html (offline, standalone) from planet-parade.html (artifact source).

- Also writes a convenience copy at ./index.html (git-ignored).
- Sets window.PP_STANDALONE so the Recording Studio (microphone) is offered; the artifact frame blocks the mic.

- Wraps the page in a full <!doctype html> document.
- Replaces the Google Fonts <link> tags with inline base64 woff2 @font-face rules, keeping only the
  latin and arabic unicode-range subsets (English/French + Farsi). Fonts are cached in fonts/.
Run:  python tools/build_standalone.py
"""
import base64, pathlib, re, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC, CACHE = ROOT / 'planet-parade.html', ROOT / 'fonts'
OUTS = [ROOT / 'dist' / 'index.html', ROOT / 'index.html']
CSS_URL = ('https://fonts.googleapis.com/css2?family=Nunito:wght@600;800'
           '&family=Sniglet:wght@800&family=Vazirmatn:wght@500;800&display=swap')
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
KEEP = {'latin', 'arabic'}

def fetch(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=30).read()

def font_faces():
    CACHE.mkdir(exist_ok=True)
    css_file = CACHE / 'google-fonts.css'
    if not css_file.exists():
        css_file.write_bytes(fetch(CSS_URL))
    css = css_file.read_text(encoding='utf-8')
    groups = {}  # variable fonts serve one file for every weight: emit one face with a weight range
    for subset, face in re.findall(r'/\* ([a-z-]+) \*/\s*(@font-face\s*{[^}]*})', css):
        family = re.search(r"font-family: '([^']+)'", face).group(1)
        if subset not in KEEP or (family == 'Vazirmatn' and subset != 'arabic'):
            continue  # Latin text uses Nunito/Sniglet; Vazirmatn is only needed for Persian
        weight = int(re.search(r'font-weight: (\d+)', face).group(1))
        url = re.search(r'url\((https://[^)]+\.woff2)\)', face).group(1)
        rng = re.search(r'unicode-range: ([^;]+);', face).group(1)
        g = groups.setdefault(url, {'family': family, 'subset': subset, 'range': rng, 'weights': []})
        g['weights'].append(weight)
    out, total = [], 0
    for url, g in groups.items():
        local = CACHE / f"{g['family'].replace(' ', '')}-{g['subset']}.woff2"
        if not local.exists():
            local.write_bytes(fetch(url))
        data = local.read_bytes(); total += len(data)
        b64 = base64.b64encode(data).decode()
        w = f"{min(g['weights'])} {max(g['weights'])}"
        out.append(f"@font-face{{font-family:'{g['family']}';font-style:normal;font-weight:{w};font-display:swap;"
                   f"src:url(data:font/woff2;base64,{b64}) format('woff2');unicode-range:{g['range']};}}")
    return '\n'.join(out), total

# Installable-app (PWA) pieces, only meaningful when dist/ is served over http(s), e.g. Cloudflare Pages.
PWA_HEAD = """<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/icon-192.png">
<script>
// Offline, installable app when served over http(s). Never registered on file://, so the single
// offline file keeps working exactly as before.
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready)
      .then(() => { document.documentElement.dataset.sw = 'ready'; }).catch(() => {});
  });
}
</script>
"""
ICONS = ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png']
MANIFEST = {
    'name': 'Planet Parade', 'short_name': 'Planets',
    'description': 'Six talking space games for toddlers, in English, French and Farsi.',
    'start_url': './', 'scope': './', 'display': 'standalone', 'display_override': ['fullscreen', 'standalone'],
    'orientation': 'any', 'background_color': '#0a0e2a', 'theme_color': '#0a0e2a', 'lang': 'en',
    'icons': [
        {'src': 'icons/icon-192.png', 'sizes': '192x192', 'type': 'image/png', 'purpose': 'any'},
        {'src': 'icons/icon-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'any'},
        {'src': 'icons/icon-maskable-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'},
    ],
}
SW = """// Planet Parade service worker: cache-first and versioned. A new version installs quietly in the
// background and takes over on the NEXT launch (no skipWaiting / clients.claim), so a toddler is never
// interrupted mid-game. Old caches are removed when the new version activates.
const CACHE = 'planet-parade-__VERSION__';
const ASSETS = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' })))));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('planet-parade-') && k !== CACHE).map(k => caches.delete(k)))));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = (await c.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' ? await c.match('index.html') : null);
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    } catch (err) {
      return (await c.match('index.html')) || Response.error();
    }
  }));
});
"""
HEADERS = """/sw.js
  Cache-Control: no-cache

/
  Cache-Control: no-cache

/index.html
  Cache-Control: no-cache

/manifest.webmanifest
  Cache-Control: no-cache

/icons/*
  Cache-Control: public, max-age=31536000, immutable

/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' data: blob:; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'
  Permissions-Policy: microphone=(self), camera=(), geolocation=(), payment=(), usb=()
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  X-Frame-Options: DENY
"""

def write_pwa(dist, doc):
    import hashlib, json, shutil
    (dist / 'icons').mkdir(parents=True, exist_ok=True)
    h = hashlib.sha256(doc.encode('utf-8'))
    for name in ICONS:
        src = ROOT / 'icons' / name
        if not src.exists():
            raise SystemExit(f'missing {src}: run python tools/make_icons.py first')
        shutil.copyfile(src, dist / 'icons' / name); h.update(src.read_bytes())
    (dist / 'manifest.webmanifest').write_text(json.dumps(MANIFEST, indent=2, ensure_ascii=False), encoding='utf-8')
    version = h.hexdigest()[:10]  # changes whenever the game or an icon changes
    (dist / 'sw.js').write_text(SW.replace('__VERSION__', version), encoding='utf-8')
    (dist / '_headers').write_text(HEADERS, encoding='utf-8')
    return version

def main():
    src = SRC.read_text(encoding='utf-8')
    head_end = src.index('<style>')
    head, body = src[:head_end], src[head_end:]
    title = re.search(r'<title>.*?</title>', head).group(0)
    faces, total = font_faces()
    doc = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
           '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">\n'
           '<meta name="theme-color" content="#0a0e2a">\n<meta name="mobile-web-app-capable" content="yes">\n'
           '<meta name="apple-mobile-web-app-capable" content="yes">\n'
           f'{title}\n{PWA_HEAD}<script>window.PP_STANDALONE = true;</script>\n<style>\n/* Inlined fonts so the game works offline (latin + arabic subsets). */\n{faces}\n</style>\n'
           f'</head>\n<body>\n{body}</body>\n</html>\n')
    for out in OUTS:
        out.parent.mkdir(exist_ok=True)
        out.write_text(doc, encoding='utf-8')
    version = write_pwa(OUTS[0].parent, doc)
    print(f'dist/index.html written: {OUTS[0].stat().st_size // 1024} KB total, fonts {total // 1024} KB raw; sw cache v{version}')

if __name__ == '__main__':
    main()
