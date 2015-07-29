GlyphIterator = require './GlyphIterator'
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
    @glyphs = []
    @positions = [] # only used by GPOS
    @ligatureID = 1
  
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
        lookups.push 
          feature: tag
          index: lookupIndex
          lookup: @table.lookupList.get(lookupIndex)
          
    lookups.sort (a, b) ->
      a.index - b.index
      
    return lookups
    
  applyFeatures: (userFeatures, glyphs, advances) ->
    lookups = @lookupsForFeatures userFeatures
    @applyLookups lookups, glyphs, advances
    
  applyLookups: (lookups, @glyphs, @positions) ->
    @glyphIterator = new GlyphIterator @glyphs
    
    for {feature, lookup} in lookups
      @glyphIterator.reset lookup.flags
            
      while @glyphIterator.index < @glyphs.length
        unless feature of @glyphIterator.cur.features
          @glyphIterator.index++
          continue
        
        for table in lookup.subTables
          res = @applyLookup lookup.lookupType, table
          break if res
          
        @glyphIterator.index++
        
    return
    
  applyLookup: (lookup, table) ->
    throw new Error "applyLookup must be implemented by subclasses"
      
  applyLookupList: (lookupRecords) ->
    glyphIndex = @glyphIterator.index
    
    for lookupRecord in lookupRecords
      @glyphIterator.index = glyphIndex + lookupRecord.sequenceIndex
      
      lookup = @table.lookupList.get(lookupRecord.lookupListIndex)
      for table in lookup.subTables
        @applyLookup lookup.lookupType, table
    
    @glyphIterator.index = glyphIndex                        
    return
    
  coverageIndex: (coverage, glyph) ->
    glyph ?= @glyphIterator.cur.id
    
    switch coverage.version
      when 1
        return coverage.glyphs.indexOf(glyph)
        
      when 2
        for range, i in coverage.rangeRecords
          if range.start <= glyph <= range.end
            return range.startCoverageIndex + glyph - range.start
      
    return -1
    
  match: (sequenceIndex, sequence, fn, matched) ->    
    pos = @glyphIterator.index
    
    glyph = @glyphIterator.increment sequenceIndex    
    idx = 0
    
    while idx < sequence.length and glyph and fn(sequence[idx], glyph.id)
      matched?.push @glyphIterator.index
      idx++
      glyph = @glyphIterator.next()
      
    @glyphIterator.index = pos
    if idx < sequence.length
      return false
      
    return matched or true
        
  sequenceMatches: (sequenceIndex, sequence) ->
    @match sequenceIndex, sequence, (component, glyph) ->
      component is glyph
      
  sequenceMatchIndices: (sequenceIndex, sequence) ->
    @match sequenceIndex, sequence, (component, glyph) ->
      component is glyph
    , []
    
  coverageSequenceMatches: (sequenceIndex, sequence) ->
    @match sequenceIndex, sequence, (coverage, glyph) =>
      @coverageIndex(coverage, glyph) >= 0
    
  getClassID: (glyph, classDef) ->    
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
    @match sequenceIndex, sequence, (classID, glyph) =>
      classID is @getClassID glyph, classDef
        
  applyContext: (table) ->
    switch table.version
      when 1
        index = @coverageIndex table.coverage
        return if index is -1
    
        set = table.ruleSets[index]
        for rule in set when @sequenceMatches 1, rule.input
          return @applyLookupList rule.lookupRecords
          
      when 2
        return if @coverageIndex(table.coverage) is -1
        
        index = @getClassID @glyphIterator.cur.id, table.classDef
        return if index is -1
        
        set = table.classSet[index]
        for rule in set when @classSequenceMatches 1, rule.classes, table.classDef
          return @applyLookupList rule.lookupRecords
          
      when 3
        if @coverageSequenceMatches 0, table.coverages
          @applyLookupList table.lookupRecords
          
  applyChainingContext: (table) ->
    switch table.version
      when 1
        index = @coverageIndex table.coverage
        return if index is -1
        
        set = table.chainRuleSets[index]
        for rule in set
          if @sequenceMatches(-rule.backtrack.length, rule.backtrack) and
             @sequenceMatches(1, rule.input) and
             @sequenceMatches(1 + rule.input.length, rule.lookahead)
              return @applyLookupList rule.lookupRecords
      
      when 2
        return if @coverageIndex(table.coverage) is -1
        
        index = @getClassID @glyphIterator.cur.id, table.inputClassDef
        return if index is -1
        
        rules = table.chainClassSet[index]
        for rule in rules
          if @classSequenceMatches(-rule.backtrack.length, rule.backtrack, table.backtrackClassDef) and
             @classSequenceMatches(1, rule.input, table.inputClassDef) and
             @classSequenceMatches(1 + rule.input.length, rule.lookahead, table.lookaheadClassDef)
               return @applyLookupList rule.lookupRecords
          
      when 3
        if @coverageSequenceMatches(-table.backtrackGlyphCount, table.backtrackCoverage) and
           @coverageSequenceMatches(0, table.inputCoverage) and
           @coverageSequenceMatches(table.inputGlyphCount, table.lookaheadCoverage)
             return @applyLookupList table.lookupRecords
    
module.exports = OpenTypeProcessor
