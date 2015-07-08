class BBox
  get = require('../get')(this)
  constructor: (@minX = Infinity, @minY = Infinity, @maxX = -Infinity, @maxY = -Infinity) ->
      
  get 'width', ->
    @maxX - @minX
    
  get 'height', ->
    @maxY - @minY
    
  addPoint: (x, y) ->
    if x < @minX
      @minX = x
      
    if y < @minY
      @minY = y
      
    if x > @maxX
      @maxX = x
      
    if y > @maxY
      @maxY = y
      
  copy: ->
    return new BBox @minX, @minY, @maxX, @maxY

module.exports = BBox
