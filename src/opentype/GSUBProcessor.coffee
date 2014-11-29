OpenTypeProcessor = require './OpenTypeProcessor'

class GSUBProcessor extends OpenTypeProcessor
  applyLookup: (lookupType, table) ->
    switch lookupType
      when 1 # Single Substitution
        index = @coverageIndex table.coverage
        return if index is -1
        
        switch table.version
          when 1
            @glyphs[@glyphIndex] = @font.getGlyph @glyphs[@glyphIndex].id + table.deltaGlyphID
            
          when 2
            @glyphs[@glyphIndex] = @font.getGlyph table.substitute[index]
            
      when 2 # Multiple Substitution
        index = @coverageIndex table.coverage
        unless index is -1
          @glyphs.splice @glyphIndex, 1, table.sequence[index]... # FIX!!!!
          
      when 3 # Alternate Substitution
        index = @coverageIndex table.coverage
        unless index is -1
          @glyphs[@glyphIndex] = @font.getGlyph table.alternateSet[USER_INDEX] # TODO
    
      when 4 # Ligature Substitution
        index = @coverageIndex table.coverage
        return if index is -1
            
        set = table.ligatureSets[index]
            
        for ligature in set when @sequenceMatches 1, ligature.components
          characters = []
          for glyph in @glyphs[@glyphIndex...@glyphIndex + ligature.compCount]
            characters.push glyph.codePoints...
            
          glyph = @font.getGlyph ligature.glyph, characters
          @glyphs.splice @glyphIndex, ligature.compCount, glyph
          break # correct?
          
      when 5 # Contextual Substitution
        switch table.version
          when 1
            index = @coverageIndex table.coverage
            return if index is -1
        
            set = table.subRuleSets[index]
            for rule in set when @sequenceMatches 1, set.input
              @applyLookupList rule.lookupRecords
              break # correct?
              
          when 2
            return if @coverageIndex(table.coverage) is -1
            
            index = @getClassID 0, table.classDef
            return if index is -1
            
            set = table.subClassSet[index]
            for rule in set when @classSequenceMatches 1, rule.classes, table.classDef
              @applyLookupList rule.lookupRecords
              break # correct?
              
          when 3
            if @coverageSequenceMatches 0, table.coverages
              @applyLookupList table.substLookupRecord
            
      when 6 # Chaining Contextual Substitution
        switch table.version
          when 1
            index = @coverageIndex table.coverage
            return if index is -1
            
            set = table.chainSubRuleSets[index]
            for rule in set
              if @sequenceMatches(-table.backtrack.length, table.backtrack) and
                 @sequenceMatches(1, table.input) and
                 @sequenceMatches(1 + table.input.length, table.lookahead)
                  @applyLookupList rule.lookupRecords
                  break # correct?
          
          when 2
            return if @coverageIndex(table.coverage) is -1
            
            index = getClassID glyphs[glyphIndex], table.inputClassDef
            return if index is -1
            
            rules = table.chainSubClassSet[index]
            for rule in rules
              if @classSequenceMatches(-rule.backtrack.length, rule.backtrack, table.backtrackClassDef) and
                 @classSequenceMatches(1, rule.input, table.inputClassDef) and
                 @classSequenceMatches(1 + rule.input.length, rule.lookahead, table.lookaheadClassDef)
                   @applyLookupList rule.lookupRecords
                   break # correct?
              
          when 3
            if @coverageSequenceMatches(-table.backtrackGlyphCount, table.backtrackCoverage) and
               @coverageSequenceMatches(0, table.inputCoverage) and
               @coverageSequenceMatches(table.inputGlyphCount, table.lookaheadCoverage)
                @applyLookupList table.substLookupRecord
            
      when 7 # Extension Substitution
        @applyLookup table.lookupType, table.extension
        
      else
        throw new Error "GSUB lookupType #{lookupType} is not supported"
        
module.exports = GSUBProcessor
