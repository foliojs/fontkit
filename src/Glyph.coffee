class Glyph
  constructor: (@id, @codePoints, @_font) ->
    
  get = (key, fn) =>
    Object.defineProperty @prototype, key,
      get: fn
      enumerable: true
      
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
    
  get 'ligatureCaretPositions', ->
    
module.exports = Glyph
