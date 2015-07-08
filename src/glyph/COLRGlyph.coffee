Glyph = require './Glyph'
BBox = require './BBox'

class COLRGlyph extends Glyph
  get = require('../get')(this)
  class COLRLayer
    constructor: (@glyph, @color) ->
    
  _getBBox: ->
    bbox = new BBox
    for layer in @layers
      b = layer.glyph.bbox
      bbox.addPoint b.minX, b.minY
      bbox.addPoint b.maxX, b.maxY
          
    return bbox
      
  get 'layers', ->
    cpal = @_font.CPAL
    colr = @_font.COLR
    low = 0
    high = colr.baseGlyphRecord.length - 1

    while low <= high
      mid = (low + high) >> 1
      rec = colr.baseGlyphRecord[mid]

      if @id < rec.gid
        high = mid - 1
      else if @id > rec.gid
        low = mid + 1
      else
        baseLayer = rec
        break
        
    # if base glyph not found in COLR table, 
    # default to normal glyph from glyf or CFF
    unless baseLayer?
      g = @_font._getBaseGlyph(@id)
      color = 
        red: 0
        green: 0
        blue: 0
        alpha: 255
        
      return [new COLRLayer g, color]
    
    # otherwise, return an array of all the layers
    for i in [baseLayer.firstLayerIndex...baseLayer.firstLayerIndex + baseLayer.numLayers] by 1
      rec = colr.layerRecords[i]
      color = cpal.colorRecords[rec.paletteIndex]
      g = @_font._getBaseGlyph rec.gid
      new COLRLayer g, color
  
  render: (ctx, size) ->
    for {glyph, color} in @layers
      ctx.fillColor [color.red, color.green, color.blue], color.alpha / 255 * 100
      glyph.render(ctx, size)

module.exports = COLRGlyph
