TTFGlyph = require './TTFGlyph'

# This is a subclass of TTFGlyph for WOFF2, where the decoding is different
# for simple glyphs. We have to do this ahead of time (it's done in WOFF2Font)
# so this class just returns the pre-decoded glyph data.
class WOFF2Glyph extends TTFGlyph
  _decode: ->
    return @_font._transformedGlyphs[@id]
    
  _getCBox: ->
    return @path.bbox
    
module.exports = WOFF2Glyph
