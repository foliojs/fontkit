Path = require './Path'
unicode = require 'unicode-properties'

class Glyph
  get = require('../get')(this)
  constructor: (@id, @codePoints, @_font) ->
    # TODO: get this info from GDEF if available
    @isMark = @codePoints.every unicode.isMark
    @isLigature = @codePoints.length > 1
      
  _getPath: ->
    return new Path
      
  _getCBox: ->
    @path.cbox
    
  _getBBox: ->
    @path.bbox
    
  _getAdvanceWidth: ->
    @_font._getMetrics(@_font.hmtx, @id).advance
      
  get 'cbox', ->
    @_cbox ?= @_getCBox()
      
  get 'bbox', ->
    @_bbox ?= @_getBBox()
    
  get 'path', ->
    # Cache the path so we only decode it once
    # Decoding is actually performed by subclasses
    @_path ?= @_getPath()
    
  get 'advanceWidth', ->
    @_advanceWidth ?= @_getAdvanceWidth()
    
  get 'ligatureCaretPositions', ->
    
  render: (ctx, size) ->
    ctx.save()
    ctx.scale size / @_font.unitsPerEm

    fn = @path.toFunction()
    fn(ctx)
    ctx.fill()
    
    ctx.restore()
    
module.exports = Glyph
