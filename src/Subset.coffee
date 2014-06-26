class Subset
  constructor: (@font) ->
    @glyphs = []
    @mapping = {}
    
    # always include the missing glyph
    @includeGlyph 0
    
  includeGlyph: (glyph) ->
    unless @mapping[glyph]?
      @glyphs.push glyph
      @mapping[glyph] = @glyphs.length - 1
      
    return @mapping[glyph]
    
module.exports = Subset
