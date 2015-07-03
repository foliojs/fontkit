class GlyphIterator
  get = require('../get')(this)
  constructor: (@glyphs, flags) ->
    @reset flags
    
  reset: (@flags = {}) ->
    @index = 0
  
  get 'cur', ->
    return @glyphs[@index] or null
    
  shouldIgnore = (glyph, flags) ->
    return ((flags.ignoreMarks and glyph.isMark) or
           (flags.ignoreBaseGlyphs and not glyph.isMark) or
           (flags.ignoreLigatures and glyph.isLigature))
           
  move = (dir) ->
    @index += dir
    while 0 <= @index < @glyphs.length and shouldIgnore @glyphs[@index], @flags
      @index += dir
      
    unless 0 <= @index < @glyphs.length
      return null
      
    return @glyphs[@index]
    
  next: ->
    move.call this, 1
    
  prev: ->
    move.call this, -1
    
  peek: (count = 1) ->
    idx = @index
    res = @increment count
    @index = idx
    return res
    
  peekIndex: (count = 1) ->
    idx = @index
    @increment count
    res = @index
    @index = idx
    return res
    
  increment: (count = 1) ->
    dir = if count < 0 then -1 else 1
    count = Math.abs count
    while count--
      move.call this, dir
      
    return @glyphs[@index]

module.exports = GlyphIterator
