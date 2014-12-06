r = require 'restructure'

class UnboundedArray extends r.Array
  constructor: (@type) ->
    @length = 0
    
  class UnboundedArrayAccessor
    constructor: (@type, @stream, @parent) ->
      @base = @stream.pos
      @_items = []
      
    getItem: (index) ->
      unless @_items[index]?
        pos = @stream.pos
        @stream.pos = @base + @type.size(null, @parent) * index
        @_items[index] = @type.decode @stream, @parent
        @stream.pos = pos
        
      return @_items[index]
      
    inspect: ->
      return "[UnboundedArray #{@type.constructor.name}]"
      
  decode: (stream, parent) ->
    return new UnboundedArrayAccessor @type, stream, parent

exports.UnboundedArray = UnboundedArray

exports.LookupTable = LookupTable = (ValueType = r.uint16) ->
  # Helper class that makes internal structures invisible to pointers
  class Shadow
    constructor: (@type) ->
    decode: (stream, ctx) ->
      ctx = ctx.parent.parent
      return @type.decode stream, ctx
    
    size: (val, ctx) ->
      ctx = ctx.parent.parent
      return @type.size val, ctx
    
    encode: (stream, val, ctx) ->
      ctx = ctx.parent.parent
      @type.encode stream, val, ctx
  
  ValueType = new Shadow ValueType
  
  BinarySearchHeader = new r.Struct
    unitSize: r.uint16
    nUnits: r.uint16
    searchRange: r.uint16
    entrySelector: r.uint16
    rangeShift: r.uint16
  
  LookupSegmentSingle = new r.Struct
    lastGlyph: r.uint16
    firstGlyph: r.uint16
    value: ValueType
  
  LookupSegmentArray = new r.Struct
    lastGlyph: r.uint16
    firstGlyph: r.uint16
    values: new r.Pointer(r.uint16, new r.Array(ValueType, -> @lastGlyph - @firstGlyph + 1), type: 'parent')
  
  LookupSingle = new r.Struct
    glyph: r.uint16
    value: ValueType
  
  return new r.VersionedStruct r.uint16,
    0:
      values: new UnboundedArray(ValueType) # length == number of glyphs maybe?
    2:
      binarySearchHeader: BinarySearchHeader
      segments: new r.Array(LookupSegmentSingle, -> @binarySearchHeader.nUnits)
    4:
      binarySearchHeader: BinarySearchHeader
      segments: new r.Array(LookupSegmentArray, -> @binarySearchHeader.nUnits)
    6:
      binarySearchHeader: BinarySearchHeader
      segments: new r.Array(LookupSingle, -> @binarySearchHeader.nUnits)
    8:
      firstGlyph: r.uint16
      count: r.uint16
      values: new r.Array(ValueType, 'count')

exports.StateTable = (entryData = {}, lookupType = r.uint16) ->  
  entry = 
    newState: r.uint16
    flags: r.uint16
    
  for key, val of entryData
    entry[key] = val
    
  Entry = new r.Struct entry
  StateArray = new UnboundedArray(new r.Array(r.uint16, -> @nClasses))

  StateHeader = new r.Struct
    nClasses: r.uint32
    classTable: new r.Pointer(r.uint32, new LookupTable(lookupType))
    stateArray: new r.Pointer(r.uint32, StateArray)
    entryTable: new r.Pointer(r.uint32, new UnboundedArray(Entry))
    
  return StateHeader
  
# This is the old version of the StateTable structure
exports.StateTable1 = (entryData = {}, lookupType = r.uint16) ->
  ClassLookupTable = new r.Struct
    version: -> 8 # simulate LookupTable
    firstGlyph: r.uint16
    values: new r.Array(r.uint8, r.uint16)
    
  entry = 
    newStateOffset: r.uint16
    # convert offset to stateArray index
    newState: -> (@newStateOffset - (@parent.stateArray.base - @parent._startOffset)) / @parent.nClasses
    flags: r.uint16
    
  for key, val of entryData
    entry[key] = val
    
  Entry = new r.Struct entry
  StateArray = new UnboundedArray(new r.Array(r.uint8, -> @nClasses))

  StateHeader1 = new r.Struct
    nClasses: r.uint16
    classTable: new r.Pointer(r.uint16, ClassLookupTable)
    stateArray: new r.Pointer(r.uint16, StateArray)
    entryTable: new r.Pointer(r.uint16, new UnboundedArray(Entry))
    
  return StateHeader1
