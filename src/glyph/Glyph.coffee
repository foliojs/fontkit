Path = require './Path'
unicode = require 'unicode-properties'

class Glyph
  constructor: (@id, @codePoints, @_font) ->
    # TODO: get this info from GDEF if available
    @isMark = @codePoints.length is 1 and unicode.isMark @codePoints[0]
    
  get = (key, fn) =>
    Object.defineProperty @prototype, key,
      get: fn
      enumerable: true
      
  _getPath: ->
    return new Path
      
  _getCBox: ->
    @path.cbox
    
  _getBBox: ->
    @path.bbox
      
  get 'cbox', ->
    @_cbox ?= @_getCBox()
      
  get 'bbox', ->
    @_bbox ?= @_getBBox()
    
  get 'path', ->
    # Cache the path so we only decode it once
    # Decoding is actually performed by subclasses
    @_path ?= @_getPath()
    
  get 'advanceWidth', ->
    return @_font.widthOfGlyph @id
    
  get 'ligatureCaretPositions', ->
    
  render: (ctx, size) ->
    ctx.save()
    ctx.scale size / @_font.unitsPerEm

    fn = @path.toFunction()
    fn(ctx)
    ctx.fill()
    
    ctx.restore()
    
module.exports = Glyph
