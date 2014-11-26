r = require 'restructure'

#########################
# Scripts and Languages #
#########################

LangSysTable = new r.Struct
  reserved:         new r.Reserved(r.uint16)
  reqFeatureIndex:  r.uint16
  featureCount:     r.uint16
  featureIndexes:   new r.Array(r.uint16, 'featureCount')
  
LangSysRecord = new r.Struct
  tag:      new r.String(4)
  langSys:  new r.Pointer(r.uint16, LangSysTable, type: 'parent')
  
Script = new r.Struct
  defaultLangSys: new r.Pointer(r.uint16, LangSysTable)
  count:          r.uint16
  langSysRecords: new r.Array(LangSysRecord, 'count')
  
ScriptRecord = new r.Struct
  tag:    new r.String(4)
  script: new r.Pointer(r.uint16, Script, type: 'parent')

exports.ScriptList = new r.Array(ScriptRecord, r.uint16)

########################
# Features and Lookups #
########################

Feature = new r.Struct
  featureParams:      r.uint16 # pointer
  lookupCount:        r.uint16
  lookupListIndexes:  new r.Array(r.uint16, 'lookupCount')
  
FeatureRecord = new r.Struct
  tag:      new r.String(4)
  feature:  new r.Pointer(r.uint16, Feature, type: 'parent')

exports.FeatureList = new r.Array(FeatureRecord, r.uint16)

LookupFlags = new r.Bitfield r.uint16, [
  'rightToLeft', 'ignoreBaseGlyphs', 'ignoreLigatures',
  'ignoreMarks', 'useMarkFilteringSet', null, 'markAttachmentType'
]

exports.LookupList = (SubTable) ->
  Lookup = new r.Struct
    lookupType:         r.uint16
    flags:              LookupFlags
    subTableCount:      r.uint16
    subTables:          new r.Array(new r.Pointer(r.uint16, SubTable), 'subTableCount')
    markFilteringSet:   r.uint16 # TODO: only present when flags says so...
      
  return new r.Array new r.Pointer(r.uint16, Lookup), r.uint16
  
##################
# Coverage Table #
##################
  
RangeRecord = new r.Struct
  start:              r.uint16
  end:                r.uint16
  startCoverageIndex: r.uint16
  
exports.Coverage = new r.VersionedStruct r.uint16,
  1: 
    glyphCount:   r.uint16
    glyphs:       new r.Array(r.uint16, 'glyphCount')
  2:
    rangeCount:   r.uint16
    rangeRecords: new r.Array(RangeRecord, 'rangeCount')
    
##########################
# Class Definition Table #
##########################
    
ClassRangeRecord = new r.Struct
  start:  r.uint16
  end:    r.uint16
  class:  r.uint16

exports.ClassDef = new r.VersionedStruct r.uint16,
  1: # Class array
    startGlyph:       r.uint16
    glyphCount:       r.uint16
    classValueArray:  new r.Array(r.uint16, 'glyphCount')
  2: # Class ranges
    classRangeCount:  r.uint16
    classRangeRecord: new r.Array(ClassRangeRecord, 'classRangeCount')
      
################
# Device Table #
################
      
exports.Device = new r.Struct
  startSize:    r.uint16
  endSize:      r.uint16
  deltaFormat:  r.uint16