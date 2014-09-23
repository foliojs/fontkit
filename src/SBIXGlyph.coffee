TTFGlyph = require './TTFGlyph'

class SBIXGlyph extends TTFGlyph
  getImageForSize: (size) ->
    for table in @_font.sbix.imageTables
      break if table.height >= size
    
    offsets = table.imageOffsets
    start = offsets[@id]
    end = offsets[@id + 1]
    
    if start is end
      return null
    
    pos = @_font.stream.pos 
    @_font.stream.pos = start + 8
    buf = @_font.stream.readBuffer end - start - 8
    @_font.stream.pos = pos
    
    return buf
    
  render: (ctx, size) ->
    img = @getImageForSize size
    if img?
      ctx.image img, height: size, x: 0, y: @bbox[1] * 1 / @_font.head.unitsPerEm * size
      
    if @_font.sbix.flags.renderOutlines
      super
    
module.exports = SBIXGlyph
