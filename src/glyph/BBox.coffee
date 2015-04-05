class BBox
  constructor: (@minX = Infinity, @minY = Infinity, @maxX = -Infinity, @maxY = -Infinity) ->
    
  get = (key, fn) =>
    Object.defineProperty @prototype, key,
      get: fn
      enumerable: true
      
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

module.exports = BBox
