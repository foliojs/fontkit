TTFGlyph = require './TTFGlyph'
r = require 'restructure'

class SBIXGlyph extends TTFGlyph
  SBIXImage = new r.Struct
    originX: r.uint16
    originY: r.uint16
    type: new r.String(4)
    data: new r.Buffer -> @parent.buflen - @_currentOffset
  
  getImageForSize: (size) ->
    for table in @_font.sbix.imageTables
      break if table.ppem >= size
    
    offsets = table.imageOffsets
    start = offsets[@id]
    end = offsets[@id + 1]
    
    if start is end
      return null
      
    @_font.stream.pos = start
    return SBIXImage.decode @_font.stream, buflen: end - start
    
  render: (ctx, size) ->
    img = @getImageForSize size
    if img?
      scale = size / @_font.unitsPerEm
      ctx.image img.data, height: size, x: img.originX, y: (@bbox[1] - img.originY) * scale
      
    if @_font.sbix.flags.renderOutlines
      super
    
module.exports = SBIXGlyph
