r = require 'restructure'

class Subset
  constructor: (@font) ->
    @glyphs = []
    @mapping = {}
    
    # always include the missing glyph
    @includeGlyph 0
    
  includeGlyph: (glyph) ->    
    if typeof glyph is 'object'
      glyph = glyph.id
    
    unless @mapping[glyph]?
      @glyphs.push glyph
      @mapping[glyph] = @glyphs.length - 1
      
    return @mapping[glyph]
    
  encodeStream: ->
    s = new r.EncodeStream
    
    process.nextTick =>
      @encode s
      s.end()
      
    return s
    
module.exports = Subset
