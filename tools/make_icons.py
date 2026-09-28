"""Render the PWA icons from the game's own canvas art (drawSun / drawPlanet in planet-parade.html).

The drawing code is lifted out of planet-parade.html, run in headless Edge on a 512x512 canvas,
and the PNGs are written to icons/: icon-192.png, icon-512.png and icon-maskable-512.png
(the maskable one keeps the art inside the central 80% safe zone on a full-bleed background).
Run:  python tools/make_icons.py
"""
import base64, html, json, os, pathlib, re, subprocess, tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'planet-parade.html'
OUT = ROOT / 'icons'
EDGE_PATHS = [r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
              r'C:\Program Files\Microsoft\Edge\Application\msedge.exe']

def drawing_code():
    src = SRC.read_text(encoding='utf-8')
    start = src.index('// Gradients are built in local')
    end = src.index('/* ---------- position cues')
    return src[start:end]

PAGE = """<!doctype html><meta charset="utf-8"><body><script>
const TAU = Math.PI * 2;
%s
function paint(size, safe) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'), k = size / 512;
  g.scale(k, k);
  // Night-sky ground from the palette (--void to the nebula purple), full bleed.
  const bg = g.createRadialGradient(256, 230, 40, 256, 256, 380);
  bg.addColorStop(0, '#1d1552'); bg.addColorStop(1, '#0a0e2a');
  g.fillStyle = bg; g.fillRect(0, 0, 512, 512);
  g.fillStyle = 'rgba(255,255,255,.8)';
  [[70,90,2.4],[440,70,2],[410,430,2.6],[96,420,1.8],[300,40,1.6],[470,260,1.8],[40,250,1.6]].forEach(([x,y,r]) => { g.beginPath(); g.arc(x,y,r,0,TAU); g.fill(); });
  const s = safe ? .78 : 1; // maskable: keep the art inside the 80%% safe circle
  g.translate(256, 256); g.scale(s, s); g.translate(-256, -256);
  g.strokeStyle = 'rgba(159,180,255,.45)'; g.lineWidth = 5;
  g.beginPath(); g.ellipse(256, 262, 205, 86, -.18, 0, TAU); g.stroke();
  const face = { face: true, blink: 1, happy: true, look: { x: .2, y: -.1 } };
  drawSun(g, 256, 250, 112, .4, face);
  drawPlanet(g, { id: 'earth', r: .9, base: '#3a8ee6', light: '#9fd3ff', dark: '#173f8f', atmo: '#9fd3ff' }, 418, 318, 50, 1.3, face);
  return c.toDataURL('image/png');
}
document.body.setAttribute('data-icons', JSON.stringify({ i192: paint(192, false), i512: paint(512, false), m512: paint(512, true) }));
</script>"""

def main():
    edge = next((p for p in EDGE_PATHS if os.path.exists(p)), None)
    if not edge:
        raise SystemExit('Microsoft Edge not found; install it or edit EDGE_PATHS.')
    with tempfile.TemporaryDirectory() as tmp:
        page = pathlib.Path(tmp) / 'icons.html'
        page.write_text(PAGE % drawing_code(), encoding='utf-8')
        dom = subprocess.run([edge, '--headless=new', '--disable-gpu', '--virtual-time-budget=3000', '--dump-dom', page.as_uri()],
                             capture_output=True, text=True, encoding='utf-8', timeout=120).stdout
    m = re.search(r'data-icons="([^"]+)"', dom)
    if not m:
        raise SystemExit('Icon page did not render (no data-icons attribute).')
    data = json.loads(html.unescape(m.group(1)))  # a JSON object of data URLs
    OUT.mkdir(exist_ok=True)
    for key, name in [('i192', 'icon-192.png'), ('i512', 'icon-512.png'), ('m512', 'icon-maskable-512.png')]:
        (OUT / name).write_bytes(base64.b64decode(data[key].split(',', 1)[1]))
        print('wrote', OUT / name)

if __name__ == '__main__':
    main()
