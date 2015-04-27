BBox = require '../glyph/BBox'

class GlyphRun
  get = require('../get')(this)
  constructor: (@glyphs, @positions) ->
    
  get 'advanceWidth', ->
    width = 0
    for position in @positions
      width += position.xAdvance
      
    return width
    
  get 'advanceHeight', ->
    height = 0
    for position in @positions
      height += position.yAdvance
      
    return height
      
  get 'bbox', ->
    bbox = new BBox
    
    x = 0
    y = 0
    for glyph, index in @glyphs
      p = @positions[index]
      b = glyph.bbox
      
      bbox.addPoint b.minX + x + p.xOffset, b.minY + y + p.yOffset
      bbox.addPoint b.maxX + x + p.xOffset, b.maxY + y + p.yOffset
      
      x += p.xAdvance
      y += p.yAdvance
      
    return bbox
    
module.exports = GlyphRun
