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

BinarySearchHeader = new r.Struct
  unitSize: r.uint16
  nUnits: r.uint16
  searchRange: r.uint16
  entrySelector: r.uint16
  rangeShift: r.uint16
  
LookupSegmentSingle = new r.Struct
  lastGlyph: r.uint16
  firstGlyph: r.uint16
  value: r.uint16
  
LookupSegmentArray = new r.Struct
  lastGlyph: r.uint16
  firstGlyph: r.uint16
  values: new r.Pointer(r.uint16, new r.Array(r.uint16, -> @lastGlyph - @firstGlyph + 1), type: 'parent')
  
LookupSingle = new r.Struct
  glyph: r.uint16
  value: r.uint16
  
LookupTable = new r.VersionedStruct r.uint16,
  0:
    values: new UnboundedArray(r.uint16) # length == number of glyphs maybe?
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
    values: new r.Array(r.uint16, 'count')
            
StateArray = new UnboundedArray(new r.Array(r.uint16, -> @nClasses))
    
Entry = new r.Struct
  newState: r.uint16
  flags: r.uint16
  action: r.uint16
  
ContextualEntry = new r.Struct
  newState: r.uint16
  flags: r.uint16
  markIndex: r.uint16
  currentIndex: r.uint16
  
IndicEntry = new r.Struct
  newState: r.uint16
  flags: r.uint16
  
InsertionStateEntry = new r.Struct
  newState: r.uint16
  flags: r.uint16
  currentInsertIndex: r.uint16
  markedInsertIndex: r.uint16

StateHeader = new r.Struct
  nClasses: r.uint32
  classTable: new r.Pointer(r.uint32, LookupTable)
  stateArray: new r.Pointer(r.uint32, StateArray)
  entryTable: new r.Pointer(r.uint32, new UnboundedArray(Entry))
  
IndicStateHeader = new r.Struct
  nClasses: r.uint32
  classTable: new r.Pointer(r.uint32, LookupTable)
  stateArray: new r.Pointer(r.uint32, StateArray)
  entryTable: new r.Pointer(r.uint32, new UnboundedArray(IndicEntry))

ContextualStateHeader = new r.Struct
  nClasses: r.uint32
  classTable: new r.Pointer(r.uint32, LookupTable)
  stateArray: new r.Pointer(r.uint32, StateArray)
  entryTable: new r.Pointer(r.uint32, new UnboundedArray(ContextualEntry))
  
InsertionStateHeader = new r.Struct
  nClasses: r.uint32
  classTable: new r.Pointer(r.uint32, LookupTable)
  stateArray: new r.Pointer(r.uint32, StateArray)
  entryTable: new r.Pointer(r.uint32, new UnboundedArray(InsertionStateEntry))
  
SubstitutionTable = new r.Struct
  items: new UnboundedArray(new r.Pointer(r.uint32, LookupTable))
  
SubtableData = new r.VersionedStruct 'type',
  0: # Indic Rearrangement Subtable
    stateTable: IndicStateHeader

  1: # Contextual Glyph Substitution Subtable
    stateTable: ContextualStateHeader
    substitutionTable: new r.Pointer(r.uint32, SubstitutionTable)

  2: # Ligature subtable
    stateTable: StateHeader
    ligatureActions: new r.Pointer(r.uint32, new UnboundedArray(r.uint32))
    components: new r.Pointer(r.uint32, new UnboundedArray(r.uint16))
    ligatureList: new r.Pointer(r.uint32, new UnboundedArray(r.uint16))
    
  4: # Non-contextual Glyph Substitution Subtable
    lookupTable: LookupTable

  5: # Glyph Insertion Subtable
    stateTable: InsertionStateHeader
    insertionActions: new r.Pointer(r.uint32, new UnboundedArray(r.uint16))
    
Subtable = new r.Struct
  length: r.uint32
  coverage: r.uint24
  type: r.uint8
  subFeatureFlags: r.uint32
  table: SubtableData
  padding: new r.Reserved r.uint8, -> @length - @_currentOffset

FeatureEntry = new r.Struct
  featureType:    r.uint16
  featureSetting: r.uint16
  enableFlags:    r.uint32
  disableFlags:   r.uint32

MorxChain = new r.Struct
  defaultFlags:     r.uint32
  chainLength:      r.uint32
  nFeatureEntries:  r.uint32
  nSubtables:       r.uint32
  features:         new r.Array(FeatureEntry, 'nFeatureEntries')
  subtables:        new r.Array(Subtable, 'nSubtables')

module.exports = new r.Struct
  version:  r.uint16
  unused:   new r.Reserved(r.uint16)
  nChains:  r.uint32
  chains:   new r.Array(MorxChain, 'nChains')
