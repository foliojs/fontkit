r = require 'restructure'
{ScriptList, FeatureList, LookupList, Coverage, ClassDef, Device} = require './opentype'

Sequence = AlternateSet = new r.Array(r.uint16, r.uint16)
  
Ligature = new r.Struct
  glyph:      r.uint16
  compCount:  r.uint16
  components: new r.Array(r.uint16, -> @compCount - 1)
  
LigatureSet = new r.Array(new r.Pointer(r.uint16, Ligature), r.uint16)
  
SubstLookupRecord = new r.Struct
  sequenceIndex:      r.uint16
  lookupListIndex:    r.uint16
  
SubRule = new r.Struct
  glyphCount:     r.uint16
  substCount:     r.uint16
  input:          new r.Array(r.uint16, -> @glyphCount - 1)
  lookupRecords:  new r.Array(SubstLookupRecord, 'substCount')

SubRuleSet = new r.Array(new r.Pointer(r.uint16, SubRule), r.uint16)
      
SubClassRule = new r.Struct
  glyphCount:     r.uint16
  substCount:     r.uint16
  classes:        new r.Array(r.uint16, -> @glyphCount - 1)
  lookupRecords:  new r.Array(SubstLookupRecord, 'substCount')
      
SubClassSet = new r.Array(new r.Pointer(r.uint16, SubClassRule), r.uint16)

ChainSubRule = new r.Struct
  backtrackGlyphCount:  r.uint16
  backtrack:            new r.Array(r.uint16, 'backtrackGlyphCount')
  inputGlyphCount:      r.uint16
  input:                new r.Array(r.uint16, -> @inputGlyphCount - 1)
  lookaheadGlyphCount:  r.uint16
  lookahead:            new r.Array(r.uint16, 'lookaheadGlyphCount')
  substCount:           r.uint16
  lookupRecords:        new r.Array(SubstLookupRecord, 'substCount')

ChainSubRuleSet = new r.Array(new r.Pointer(r.uint16, ChainSubRule), r.uint16)
      
GSUBLookup = new r.VersionedStruct 'lookupType',
  1: new r.VersionedStruct r.uint16, # Single Substitution
    1: 
      coverage:       new r.Pointer(r.uint16, Coverage)
      deltaGlyphID:   r.int16
    2:
      coverage:       new r.Pointer(r.uint16, Coverage)
      glyphCount:     r.uint16
      substitute:     new r.Array(r.uint16, 'glyphCount')
        
  2: # Multiple Substitution
    substFormat:    r.uint16
    coverage:       new r.Pointer(r.uint16, Coverage)
    count:          r.uint16
    sequences:      new r.Array(new r.Pointer(r.uint16, Sequence), 'count')
    
  3: # Alternate Substitution
    substFormat:    r.uint16
    coverage:       new r.Pointer(r.uint16, Coverage)
    count:          r.uint16
    alternateSet:   new r.Array(new r.Pointer(r.uint16, AlternateSet), 'count')
    
  4: # Ligature Substitution
    substFormat:    r.uint16
    coverage:       new r.Pointer(r.uint16, Coverage)
    count:          r.uint16
    ligatureSets:   new r.Array(new r.Pointer(r.uint16, LigatureSet), 'count')
    
  5: new r.VersionedStruct r.uint16, # Contextual Substitution
    1: # Simple context glyph substitution
      coverage:           new r.Pointer(r.uint16, Coverage)
      subRuleSetCount:    r.uint16
      subRuleSets:        new r.Array(new r.Pointer(r.uint16, SubRuleSet), 'subRuleSetCount')
    2:
      coverage:           new r.Pointer(r.uint16, Coverage)
      classDef:           new r.Pointer(r.uint16, ClassDef)
      subClassSetCnt:     r.uint16
      subClassSet:        new r.Array(new r.Pointer(r.uint16, SubClassSet), 'subClassSetCnt')
    3:
      glyphCount:         r.uint16
      substCount:         r.uint16
      coverages:          new r.Array(new r.Pointer(r.uint16, Coverage), 'glyphCount')
      substLookupRecord:  new r.Array(SubstLookupRecord, 'substCount')
    
  6: new r.VersionedStruct r.uint16, # Chaining Contextual Substitution
    1: # Simple context glyph substitution
      coverage:           new r.Pointer(r.uint16, Coverage)
      chainCount:         r.uint16
      chainSubRuleSets:   new r.Array(new r.Pointer(r.uint16, ChainSubRuleSet), 'chainCount')
      
    2: # Class-based Chaining Context Glyph Substitution
      coverage:           new r.Pointer(r.uint16, Coverage)
      backtrackClassDef:  new r.Pointer(r.uint16, ClassDef)
      inputClassDef:      new r.Pointer(r.uint16, ClassDef)
      lookaheadClassDef:  new r.Pointer(r.uint16, ClassDef)
      chainCount:         r.uint16
      chainSubClassSet:   new r.Array(new r.Pointer(r.uint16, ChainSubRuleSet), 'chainCount')
      
    3: # Coverage-based Chaining Context Glyph Substitution
      backtrackGlyphCount:    r.uint16
      backtrackCoverage:      new r.Array(new r.Pointer(r.uint16, Coverage), 'backtrackGlyphCount')
      inputGlyphCount:        r.uint16
      inputCoverage:          new r.Array(new r.Pointer(r.uint16, Coverage), 'inputGlyphCount')
      lookaheadGlyphCount:    r.uint16
      lookaheadCoverage:      new r.Array(new r.Pointer(r.uint16, Coverage), 'lookaheadGlyphCount')
      substCount:             r.uint16
      substLookupRecord:      new r.Array(SubstLookupRecord, 'substCount')
  
  7: # Extension Substitution
    substFormat:   r.uint16
    lookupType:    r.uint16   # cannot also be 7
    extension:     new r.Pointer(r.uint32, GSUBLookup)
    
  8: # Reverse Chaining Contextual Single Substitution
    substFormat:            r.uint16
    coverage:               new r.Pointer(r.uint16, Coverage)
    backtrackCoverage:      new r.Array(new r.Pointer(r.uint16, Coverage), 'backtrackGlyphCount')
    lookaheadGlyphCount:    r.uint16
    lookaheadCoverage:      new r.Array(new r.Pointer(r.uint16, Coverage), 'lookaheadGlyphCount')
    glyphCount:             r.uint16
    substitutes:            new r.Array(r.uint16, 'glyphCount')
  
module.exports = new r.Struct
  version:        r.int32
  scriptList:     new r.Pointer(r.uint16, ScriptList)
  featureList:    new r.Pointer(r.uint16, FeatureList)
  lookupList:     new r.Pointer(r.uint16, new LookupList(GSUBLookup))