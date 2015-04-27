Script = require '../layout/Script'

class OpenTypeProcessor
  constructor: (@font, @table) ->
    @script = null
    @scriptTag = null
    
    @language = null
    @languageTag = null
    
    @features = {}
    @lookups = {}
    
    # initialize to default script + language
    @selectScript()
        
    # current context (set by applyFeatures)
    @glyphIndex = 0
    @glyphs = []
    @advances = [] # only used by GPOS
  
  findScript: (script) ->
    for entry in @table.scriptList when entry.tag is script
      return entry
      
    return null
    
  selectScript: (script, language) ->
    changed = false
    if not @script? or script isnt @scriptTag
      if script?
        if Array.isArray(script)
          for s in script
            entry = @findScript s
            break if entry
        else
          entry = @findScript script
      
      entry ?= @findScript 'DFLT'
      entry ?= @findScript 'dflt'
      entry ?= @findScript 'latn'

      return unless entry?
            
      @scriptTag = entry.tag
      @script = entry.script
      @direction = Script.direction script
      @language = null
      changed = true
    
    if language? and language isnt @langugeTag
      for lang in @script.langSysRecords when lang.tag is language
        @language = lang.langSys
        @langugeTag = lang.tag
        changed = true
        break
        
    @language ?= @script.defaultLangSys
    
    # Build a feature lookup table
    if changed
      @features = {}
      if @language?
        for featureIndex in @language.featureIndexes
          record = @table.featureList[featureIndex]
          @features[record.tag] = record.feature
        
    return
    
  lookupsForFeatures: (userFeatures = [], exclude) ->
    lookups = []
    for tag in userFeatures
      feature = @features[tag]
      continue unless feature
      
      for lookupIndex in feature.lookupListIndexes
        continue if exclude and lookupIndex in exclude
        lookups.push @table.lookupList[lookupIndex]
        
    return lookups
    
  applyFeatures: (userFeatures, glyphs, advances) ->    
    lookups = @lookupsForFeatures userFeatures
    @applyLookups lookups, glyphs, advances
    
  applyLookups: (lookups, @glyphs, @advances) ->
    @glyphIndex = 0
    
    while @glyphIndex < @glyphs.length
      for lookup in lookups
        for table in lookup.subTables
          @applyLookup lookup.lookupType, table
          
      @glyphIndex++
        
    return
    
  applyLookup: (lookup, table) ->
    throw new Error "applyLookup must be implemented by subclasses"
      
  applyLookupList: (lookupRecords) ->
    glyphIndex = @glyphIndex
    
    for lookupRecord in lookupRecords
      @glyphIndex = glyphIndex + lookupRecord.sequenceIndex
      
      lookup = @table.lookupList[lookupRecord.lookupListIndex]
      for table in lookup.subTables
        @applyLookup lookup.lookupType, table
    
    @glyphIndex = glyphIndex                        
    return
    
  coverageIndex: (coverage, glyph) ->
    glyph ?= @glyphs[@glyphIndex].id
    
    switch coverage.version
      when 1
        return coverage.glyphs.indexOf(glyph)
        
      when 2
        for range, i in coverage.rangeRecords
          if range.start <= glyph <= range.end
            return range.startCoverageIndex + glyph - range.start
      
    return -1
    
  sequenceMatches: (sequenceIndex, sequence) ->
    glyphIndex = @glyphIndex + sequenceIndex
    return false if glyphIndex < 0 or glyphIndex + sequence.length > @glyphs.length
    
    for component, i in sequence
      return false unless component is @glyphs[glyphIndex + i].id
      
    return true
    
  coverageSequenceMatches: (sequenceIndex, sequence) ->
    glyphIndex = @glyphIndex + sequenceIndex
    return false if glyphIndex < 0 or glyphIndex + sequence.length > @glyphs.length
    
    for coverage, i in sequence
      return false if @coverageIndex(coverage, @glyphs[glyphIndex + i].id) is -1
      
    return true
    
  getClassID: (sequenceIndex, classDef) ->
    glyph = @glyphs[@glyphIndex + sequenceIndex].id
    
    switch classDef.version
      when 1 # Class array
        glyphID = classDef.startGlyph
        for classID in classDef.classValueArray
          return classID if glyph is glyphID++
          
      when 2
        for range in classDef.classRangeRecord
          return range.class if range.start <= glyph <= range.end
        
    return -1
    
  classSequenceMatches: (sequenceIndex, sequence, classDef) ->
    glyphIndex = @glyphIndex + sequenceIndex
    return false if glyphIndex + sequence.length > @glyphs.length
    
    for classID, i in sequence
      return false if classID isnt @getClassID i, classDef
        
    return true
    
module.exports = OpenTypeProcessor
