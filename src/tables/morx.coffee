r = require 'restructure'
{UnboundedArray, LookupTable} = require './aat'
            
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
  classTable: new r.Pointer(r.uint32, new LookupTable)
  stateArray: new r.Pointer(r.uint32, StateArray)
  entryTable: new r.Pointer(r.uint32, new UnboundedArray(Entry))
  
IndicStateHeader = new r.Struct
  nClasses: r.uint32
  classTable: new r.Pointer(r.uint32, new LookupTable)
  stateArray: new r.Pointer(r.uint32, StateArray)
  entryTable: new r.Pointer(r.uint32, new UnboundedArray(IndicEntry))

ContextualStateHeader = new r.Struct
  nClasses: r.uint32
  classTable: new r.Pointer(r.uint32, new LookupTable)
  stateArray: new r.Pointer(r.uint32, StateArray)
  entryTable: new r.Pointer(r.uint32, new UnboundedArray(ContextualEntry))
  
InsertionStateHeader = new r.Struct
  nClasses: r.uint32
  classTable: new r.Pointer(r.uint32, new LookupTable)
  stateArray: new r.Pointer(r.uint32, StateArray)
  entryTable: new r.Pointer(r.uint32, new UnboundedArray(InsertionStateEntry))
  
SubstitutionTable = new r.Struct
  items: new UnboundedArray(new r.Pointer(r.uint32, new LookupTable))
  
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
    lookupTable: new LookupTable

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
