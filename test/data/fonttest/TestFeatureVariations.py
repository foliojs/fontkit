#!/usr/bin/env python3
# Generates TestFeatureVariations.ttf: a minimal TTF variable font whose `rvrn`
# FeatureVariations substitutes A -> A.alt under a condition set that covers the
# default location (normalized wght in [0, 1], which includes the default 0).
# Used to test that fontkit evaluates FeatureVariations at the default location.
# Build: python3 TestFeatureVariations.py TestFeatureVariations.ttf
import sys
from fontTools.fontBuilder import FontBuilder
from fontTools.varLib.featureVars import addFeatureVariations
from fontTools.pens.ttGlyphPen import TTGlyphPen


def box(x0, y0, x1, y1):
    pen = TTGlyphPen(None)
    pen.moveTo((x0, y0)); pen.lineTo((x0, y1))
    pen.lineTo((x1, y1)); pen.lineTo((x1, y0)); pen.closePath()
    return pen.glyph()


glyphs = ['.notdef', 'A', 'A.alt']
fb = FontBuilder(1000, isTTF=True)
fb.setupGlyphOrder(glyphs)
fb.setupCharacterMap({0x41: 'A'})
fb.setupGlyf({'.notdef': box(0, 0, 0, 0), 'A': box(100, 0, 500, 700),
              'A.alt': box(100, 0, 400, 700)})
fb.setupHorizontalMetrics({g: (600, 100) for g in glyphs})
fb.setupHorizontalHeader(ascent=800, descent=-200)
fb.setupNameTable({'familyName': 'TestFeatureVariations', 'styleName': 'Regular'})
fb.setupOS2(); fb.setupPost()
fb.setupFvar(axes=[('wght', 0, 400, 1000, 'Weight')], instances=[])
fb.setupGvar({})
addFeatureVariations(fb.font, [([{'wght': (0, 1)}], {'A': 'A.alt'})], featureTag='rvrn')
fb.save(sys.argv[1])
