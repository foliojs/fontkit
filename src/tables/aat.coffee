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

exports.LookupTable = (ValueType = r.uint16) ->  
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
