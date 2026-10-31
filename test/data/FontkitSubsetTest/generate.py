"""Create original geometric glyphs for exact WOFF2 subset regressions."""
from array import array
from pathlib import Path
from fontTools.fontBuilder import FontBuilder
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables._g_l_y_f import Glyph, GlyphCoordinates, GlyphComponent
from fontTools.ttLib.tables.ttProgram import Program
from fontTools.ttLib.woff2 import WOFF2FlavorData
from fontTools.ttLib.tables.TupleVariation import TupleVariation

def simple(points, flags, hinted=True):
    glyph = Glyph()
    glyph.numberOfContours = 1
    glyph.coordinates = GlyphCoordinates(points)
    glyph.flags = array('B', flags)
    glyph.endPtsOfContours = [len(points)-1]
    glyph.program = Program()
    glyph.program.fromBytecode([0, 1] if hinted else [])
    return glyph

glyphs = {
    '.notdef': simple([(0,0), (100,0), (100,100), (0,100)], [1]*4),
    'offcurve': simple([(-300,-300), (0,-300), (0,0), (-300,0)], [0,1,1,1]),
    'repeats': simple([(i,i) for i in range(300)], [0x41]+[1]*299),
    'space': Glyph(),
    'plain': simple([(0,0),(50,0),(0,50)], [1,1,1], False),
}
composite = Glyph()
composite.numberOfContours = -1
component = GlyphComponent()
component.glyphName = 'offcurve'
component.x, component.y, component.flags = 25, 50, 0x200
composite.components = [component]
attachment = GlyphComponent()
attachment.glyphName = 'plain'
attachment.firstPt, attachment.secondPt, attachment.flags = 0, 0, 0
composite.components.append(attachment)
composite.program = Program()
composite.program.fromBytecode([1, 0])
glyphs['composite'] = composite
order = ['.notdef', 'offcurve', 'repeats', 'space', 'plain', 'composite']
builder = FontBuilder(1000, isTTF=True)
builder.setupGlyphOrder(order)
builder.setupCharacterMap({65:'offcurve', 66:'repeats', 32:'space', 67:'plain', 68:'composite'})
builder.setupGlyf(glyphs)
builder.setupHorizontalMetrics({name:(600, 0) for name in order})
builder.setupHorizontalHeader(ascent=800, descent=-200)
builder.setupNameTable({'familyName':'Fontkit Subset Test', 'styleName':'Regular',
                        'uniqueFontIdentifier':'FontkitSubsetTest-Regular',
                        'fullName':'Fontkit Subset Test Regular', 'psName':'FontkitSubsetTest-Regular'})
builder.setupOS2(sTypoAscender=800, sTypoDescender=-200, usWinAscent=800, usWinDescent=200)
builder.setupPost()
builder.setupMaxp()
builder.font['head'].created = builder.font['head'].modified = 3406620153
builder.font.recalcTimestamp = False
destination = Path(__file__).resolve().parent
builder.save(destination / 'FontkitSubsetTest.ttf')
builder.font.flavor = 'woff2'
builder.font.flavorData = WOFF2FlavorData(transformedTables={'glyf','loca'})
builder.save(destination / 'FontkitSubsetTest.woff2')
builder.font.flavorData = WOFF2FlavorData(transformedTables={'glyf','loca','hmtx'})
builder.save(destination / 'FontkitSubsetTest.hmtx.woff2')
builder.setupFvar([('wght', 100, 400, 900, 'Weight')], [])
builder.setupGvar({name: [] for name in order})
builder.font['gvar'].variations['composite'] = [
    TupleVariation({'wght': (0, 1, 1)}, [(200, 0), None, None, None, None, None])
]
builder.font.flavorData = WOFF2FlavorData(transformedTables={'glyf', 'loca'})
builder.save(destination / 'FontkitSubsetTest.variable.woff2')
# A composite can have component records but no actual outline points.
composite.components = composite.components[:1]
composite.components[0].glyphName = 'space'
builder.font['hmtx'].metrics['composite'] = (600, 17)
builder.font['gvar'].variations['composite'] = [
    TupleVariation({'wght': (0, 1, 1)}, [(200, 0), None, None, None, None])
]
builder.save(destination / 'FontkitSubsetTest.empty-composite.woff2')
print('generated original six-glyph fixture; hinted simple/composite, empty, off-curve first point, 300-point flag run, OVERLAP_SIMPLE')

# Preserve an explicit nonzero header box on a composite with no outline points.
font = TTFont(destination / 'FontkitSubsetTest.empty-composite.woff2', recalcBBoxes=False)
font['glyf']['composite'].xMin = font['glyf']['composite'].xMax = 100
font['glyf']['composite'].yMin = font['glyf']['composite'].yMax = 0
font.recalcBBoxes = False
font.recalcTimestamp = False
font.flavor = 'woff2'
font.flavorData = WOFF2FlavorData(transformedTables={'glyf', 'loca'})
font.save(destination / 'FontkitSubsetTest.nonzero-empty-composite.woff2')
