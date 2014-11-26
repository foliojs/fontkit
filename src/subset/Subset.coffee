r = require 'restructure'

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
    
  encodeStream: (stream) ->
    s = new r.EncodeStream
    s.pipe stream
    @encode s
    s.end()
    
module.exports = Subset
