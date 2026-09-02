#!/usr/bin/env python3
"""Compose assets/social/og-card.svg for the Tribulnation brandkit.


Run from the repo root:

  python3 -m venv .venv && .venv/bin/pip install fonttools uharfbuzz
  .venv/bin/python scripts/outline-og-card.py assets/social/og-card.svg

It expects Inter (rsms/inter release, extras/ttf) and JetBrains Mono (its
GitHub release, fonts/ttf) unpacked under scripts/fonts/inter and
scripts/fonts/jb; see FONTS below. The output is committed, so this only
needs re-running when the card's copy or layout changes.
Text is shaped with HarfBuzz and outlined with fontTools, so the SVG needs
no fonts installed (same approach as the X header and LinkedIn banner).
"""
import re, sys
from pathlib import Path
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

FONTS = {
  'semibold': 'scripts/fonts/inter/extras/ttf/Inter-SemiBold.ttf',
  'medium': 'scripts/fonts/inter/extras/ttf/Inter-Medium.ttf',
  'regular': 'scripts/fonts/inter/extras/ttf/Inter-Regular.ttf',
  'mono': 'scripts/fonts/jb/fonts/ttf/JetBrainsMono-Regular.ttf',
}
_cache = {}
def load(key):
  if key not in _cache:
    data = Path(FONTS[key]).read_bytes()
    face = hb.Face(data); font = hb.Font(face)
    tt = TTFont(FONTS[key]); gs = tt.getGlyphSet(); order = tt.getGlyphOrder()
    _cache[key] = (font, gs, order, tt['head'].unitsPerEm)
  return _cache[key]

def text_path(s, key, size, x, y, tracking=0.0, anchor='start'):
  """SVG path `d` for string `s` at font-size `size`px with baseline at (x, y)."""
  font, gs, order, upm = load(key)
  buf = hb.Buffer(); buf.add_str(s); buf.guess_segment_properties()
  hb.shape(font, buf, {'kern': True, 'liga': True})
  k = size / upm
  track = tracking * size  # em units -> px
  total = sum(p.x_advance for p in buf.glyph_positions) * k + track * (len(buf.glyph_infos) - 1)
  if anchor == 'middle': x -= total / 2
  pen = SVGPathPen(gs)
  pen_x = x
  for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
    name = order[info.codepoint]
    gx = pen_x + pos.x_offset * k; gy = y - pos.y_offset * k
    gs[name].draw(TransformPen(pen, (k, 0, 0, -k, gx, gy)))
    pen_x += pos.x_advance * k + track
  return pen.getCommands(), total

def T(s, key, size, x, y, fill, tracking=0.0, anchor='start'):
  d, _ = text_path(s, key, size, x, y, tracking, anchor)
  return f'  <path fill="{fill}" d="{d}"/>\n'

# ---- lockup: the mark and wordmark groups from the X header, re-origined.
header = Path('assets/social/twitter-header.svg').read_text()
# take the three groups verbatim (mark, "Tribulnation", "Labs"); skip the tagline group
raw = re.findall(r'(  <g transform="translate\([^"]*\)"[^>]*>\n(?:.*\n)*?  </g>\n)', header)
lockup = ''.join(g for g in raw if 'translate(110,140)' in g or 'translate(385.75,255.24)' in g or 'translate(744.341796875,255.24)' in g)
assert lockup.count('<g transform') == 3, lockup.count('<g transform')
# Mark and wordmark are scaled separately: the header's proportions (a 220px mark
# beside a 42px wordmark) are for a banner; here the mark is 44px tall and the
# wordmark 21px, matching the site's own nav lockup.
mark = next(g for g in raw if 'translate(110,140)' in g)
word = next(g for g in raw if 'translate(385.75,255.24)' in g)
labs = next(g for g in raw if 'translate(744.341796875,255.24)' in g)
lockup_g = (f'  <g transform="translate(72,128) scale(0.2) translate(-110,-140)">\n{mark}  </g>\n'
            f'  <g transform="translate(130,162) scale(0.5) translate(-385.75,-255.24)">\n{word}{labs}  </g>\n')

# ---- schematic (right side), geometry from the landing hero at 520x340 → scaled to fit
sch = []
def box(x, name, sub):
  sch.append(f'    <rect x="{x}" y="106" width="88" height="88" rx="8" fill="#13161b" stroke="#323942" stroke-width="1.4"/>\n')
  sch.append('  ' + T(name, 'semibold', 17, x + 44, 155, '#eef1f4', -0.02, 'middle'))
  sch.append('  ' + T(sub, 'regular', 11, x + 44, 172, '#a3a7b3', 0, 'middle'))
wire = 'fill="none" stroke="#323942" stroke-width="1.4"'
sch.append(f'    <line x1="130" y1="296" x2="518" y2="296" stroke="#6b7180" stroke-width="1.6" stroke-dasharray="3 4"/>\n')
sch.append('  ' + T('Catalogue', 'semibold', 12, 130, 318, '#eef1f4'))
sch.append('  ' + T('one name for every asset, on every venue', 'regular', 12, 215, 318, '#6b7180'))
for x in (194, 344, 494):
  sch.append(f'    <path d="M{x} 296 L{x} 194" {wire}/>\n')
sch.append('    <circle cx="194" cy="250" r="2.5" fill="#a3a7b3"/><circle cx="344" cy="230" r="2.5" fill="#a3a7b3"/>\n')
for y in (46, 98, 150, 202, 254):
  d = f'M64 150 L150 150' if y == 150 else f'M64 {y} C107 {y}, 107 150, 150 150'
  sch.append(f'    <path d="{d}" {wire}/>\n')
for cx, cy in ((96, 66), (118, 141), (84, 240), (272, 150), (410, 150)):
  sch.append(f'    <circle cx="{cx}" cy="{cy}" r="3" fill="#ff5a36"/>\n')
for y in (46, 98, 150, 202, 254):
  sch.append(f'    <circle cx="46" cy="{y}" r="17" fill="#13161b" stroke="#323942"/>\n')
sch.append(f'    <path d="M238 150 L300 150" {wire}/><path d="M388 150 L450 150" {wire}/>\n')
box(150, 'Typed', 'clients'); box(300, 'SDK', 'one interface'); box(450, 'Terminal', 'your screen')
schematic = '  <g transform="translate(672,172) scale(0.9)">\n' + ''.join(sch) + '  </g>\n'

# ---- copy
h1a = T('Institutional-grade', 'semibold', 62, 72, 262, '#eef1f4', -0.035)
h1b = T('infra.', 'semibold', 62, 72, 326, '#eef1f4', -0.035)
h1c = T('Open sourced.', 'medium', 62, 72, 390, '#a3a7b3', -0.035)
pill_d, pill_w = text_path('Independent trading firm · Barcelona', 'mono', 15, 104, 461)
pill = (f'  <rect x="72" y="438" width="{pill_w + 46:.0f}" height="34" rx="17" fill="#13161b" stroke="#262b32"/>\n'
        f'  <circle cx="90" cy="455" r="4" fill="#ff5a36"/><circle cx="90" cy="455" r="8" fill="#ff5a36" fill-opacity="0.18"/>\n'
        f'  <path fill="#a3a7b3" d="{pill_d}"/>\n')

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <pattern id="grid" width="44" height="44" patternUnits="userSpaceOnUse">
      <path d="M 44 0 L 0 0 0 44" fill="none" stroke="#ffffff" stroke-opacity="0.04" stroke-width="1"/>
    </pattern>
    <radialGradient id="gridFade" cx="18%" cy="40%" r="70%">
      <stop offset="0%" stop-color="#fff" stop-opacity="1"/>
      <stop offset="70%" stop-color="#fff" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <mask id="gridMask"><rect width="1200" height="630" fill="url(#gridFade)"/></mask>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ff5a36" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="#ff5a36" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="#0a0c10"/>
  <rect width="1200" height="630" fill="url(#grid)" mask="url(#gridMask)"/>
  <circle cx="1080" cy="120" r="360" fill="url(#glow)"/>
  <rect x="0.75" y="0.75" width="1198.5" height="628.5" fill="none" stroke="#262b32" stroke-width="1.5"/>
{lockup_g}{h1a}{h1b}{h1c}{pill}{schematic}</svg>
'''
out = Path(sys.argv[1]); out.write_text(svg)
print('wrote', out, len(svg), 'bytes')
