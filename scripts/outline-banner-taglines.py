#!/usr/bin/env python3
"""Rewrite the tagline line in the X header and LinkedIn banner.

Run from the repo root (same setup as outline-og-card.py):

  python3 -m venv .venv && .venv/bin/pip install fonttools uharfbuzz
  .venv/bin/python scripts/outline-banner-taglines.py

It expects Inter (rsms/inter release, extras/ttf) unpacked under
scripts/fonts/inter. Only the tagline group (the last <g> before </svg>) is
replaced; the mark and wordmark stay as committed. Text is shaped with
HarfBuzz and outlined with fontTools, so the SVGs need no fonts installed.
"""
import re
from pathlib import Path
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

TAGLINE = 'Software for crypto traders. We use it too.'
FONT = 'scripts/fonts/inter/extras/ttf/Inter-Bold.ttf'
# file -> font-size in px (cap height matches the wordmark above it)
BANNERS = {
  'assets/social/twitter-header.svg': 24,
  'assets/social/linkedin-banner.svg': 13,
}

data = Path(FONT).read_bytes()
font = hb.Font(hb.Face(data))
tt = TTFont(FONT); gs = tt.getGlyphSet(); order = tt.getGlyphOrder()
upm = tt['head'].unitsPerEm

def text_path(s, size):
  """SVG path `d` for `s` at `size`px, baseline at the origin."""
  buf = hb.Buffer(); buf.add_str(s); buf.guess_segment_properties()
  hb.shape(font, buf, {'kern': True, 'liga': True})
  k = size / upm
  pen = SVGPathPen(gs, ntos=lambda v: f'{v:.2f}'.rstrip('0').rstrip('.'))
  x = 0.0
  for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
    gs[order[info.codepoint]].draw(TransformPen(pen, (k, 0, 0, -k, x + pos.x_offset * k, -pos.y_offset * k)))
    x += pos.x_advance * k
  return pen.getCommands()

for file, size in BANNERS.items():
  p = Path(file); svg = p.read_text()
  # the tagline is the last group: <g transform="translate(x,y)" fill="#a3a7b3"> <path/> </g>
  pat = re.compile(r'(  <g transform="translate\([^"]*\)" fill="#a3a7b3">\n    <path d=")[^"]*("/>\n  </g>\n</svg>)')
  assert len(pat.findall(svg)) == 1, file
  p.write_text(pat.sub(lambda m: m.group(1) + text_path(TAGLINE, size) + m.group(2), svg))
  print('wrote', file)
