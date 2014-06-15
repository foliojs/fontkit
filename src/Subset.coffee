class Subset
  constructor: (@font) ->
    @glyphs = {}
    
  includeGlyph: (glyph) ->
    @glyphs[glyph] = true
    
module.exports = Subset
