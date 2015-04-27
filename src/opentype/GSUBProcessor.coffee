OpenTypeProcessor = require './OpenTypeProcessor'

class GSUBProcessor extends OpenTypeProcessor
  applyLookup: (lookupType, table) ->
    switch lookupType
      when 1 # Single Substitution
        index = @coverageIndex table.coverage
        return if index is -1
        
        glyph = @glyphs[@glyphIndex]
        switch table.version
          when 1
            @glyphs[@glyphIndex] = @font.getGlyph glyph.id + table.deltaGlyphID, glyph.codePoints
            
          when 2
            @glyphs[@glyphIndex] = @font.getGlyph table.substitute[index], glyph.codePoints
            
      when 2 # Multiple Substitution
        index = @coverageIndex table.coverage
        unless index is -1
          @glyphs.splice @glyphIndex, 1, table.sequence[index]... # FIX!!!!
          
      when 3 # Alternate Substitution
        index = @coverageIndex table.coverage
        unless index is -1
          USER_INDEX = 0
          @glyphs[@glyphIndex] = @font.getGlyph table.alternateSet[index][USER_INDEX], @glyphs[@glyphIndex].codePoints # TODO
    
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
        @applyContext table
            
      when 6 # Chaining Contextual Substitution
        @applyChainingContext table
            
      when 7 # Extension Substitution
        @applyLookup table.lookupType, table.extension
        
      else
        throw new Error "GSUB lookupType #{lookupType} is not supported"
        
module.exports = GSUBProcessor
