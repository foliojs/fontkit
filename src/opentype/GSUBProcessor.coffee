OpenTypeProcessor = require './OpenTypeProcessor'
GlyphInfo = require './GlyphInfo'

class GSUBProcessor extends OpenTypeProcessor
  applyLookup: (lookupType, table) ->
    switch lookupType
      when 1 # Single Substitution
        index = @coverageIndex table.coverage
        return false if index is -1
        
        glyph = @glyphIterator.cur
        switch table.version
          when 1
            glyph.id += table.deltaGlyphID
            return true
            
          when 2
            glyph.id = table.substitute[index]
            return true
            
      when 2 # Multiple Substitution
        index = @coverageIndex table.coverage
        unless index is -1
          sequence = table.sequence[index]
          @glyphIterator.cur.id = sequence[0]
          @glyphs.splice @glyphIterator.index + 1, 0, (new GlyphInfo gid for gid in sequence[1..])
          return true
          
      when 3 # Alternate Substitution
        index = @coverageIndex table.coverage
        unless index is -1
          USER_INDEX = 0 # TODO
          @glyphIterator.cur.id = table.alternateSet[index][USER_INDEX]
          return true
    
      when 4 # Ligature Substitution
        index = @coverageIndex table.coverage
            
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
        
    return false
        
module.exports = GSUBProcessor
