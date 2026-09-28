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
           f'{title}\n<script>window.PP_STANDALONE = true;</script>\n<style>\n/* Inlined fonts so the game works offline (latin + arabic subsets). */\n{faces}\n</style>\n'
           f'</head>\n<body>\n{body}</body>\n</html>\n')
    for out in OUTS:
        out.parent.mkdir(exist_ok=True)
        out.write_text(doc, encoding='utf-8')
    print(f'dist/index.html written: {OUTS[0].stat().st_size // 1024} KB total, fonts {total // 1024} KB raw')

if __name__ == '__main__':
    main()
