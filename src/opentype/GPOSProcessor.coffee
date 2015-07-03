OpenTypeProcessor = require './OpenTypeProcessor'

class GPOSProcessor extends OpenTypeProcessor
  applyPositionValue: (sequenceIndex, value) ->
    position = @positions[@glyphIterator.peekIndex sequenceIndex]
    if value.xAdvance?
      position.xAdvance += value.xAdvance
      
    if value.yAdvance?
      position.yAdvance += value.yAdvance
      
    if value.xPlacement?
      position.xOffset += value.xPlacement
      
    if value.yPlacement?
      position.yOffset += value.yPlacement
            
    # TODO: device tables
  
  applyLookup: (lookupType, table) ->
    switch lookupType
      when 1 # Single positioning value
        index = @coverageIndex table.coverage
        return false if index is -1
        
        switch table.version
          when 1
            @applyPositionValue 0, table.value
            
          when 2
            @applyPositionValue 0, table.values[index]
            
        return true
    
      when 2 # Pair Adjustment Positioning
        nextGlyph = @glyphIterator.peek()
        return false unless nextGlyph
        
        index = @coverageIndex table.coverage
        return false if index is -1
      
        switch table.version
          when 1 # Adjustments for glyph pairs
            set = table.pairSets[index]
            
            for pair in set when pair.secondGlyph is nextGlyph.id
              @applyPositionValue 0, pair.value1
              @applyPositionValue 1, pair.value2
              return true
              
            return false
          
          when 2 # Class pair adjustment
            class1 = @getClassID @glyphIterator.cur.id, table.classDef1
            class2 = @getClassID nextGlyph.id, table.classDef2
            return false if class1 is -1 or class2 is -1
              
            pair = table.classRecords[class1][class2]
            @applyPositionValue 0, pair.value1
            @applyPositionValue 1, pair.value2
            
        return true
      when 4 # Mark to base positioning
        markIndex = @coverageIndex table.markCoverage
        return false if markIndex is -1
        
        # search backward for a base glyph
        baseGlyphIndex = @glyphIterator.index
        while --baseGlyphIndex >= 0
          break unless @glyphs[baseGlyphIndex].isMark
        
        return false if baseGlyphIndex < 0
        
        baseIndex = @coverageIndex table.baseCoverage, @glyphs[baseGlyphIndex].id
        return false if baseIndex is -1
        
        markRecord = table.markArray[markIndex]
        baseAnchor = table.baseArray[baseIndex][markRecord.class]
        @applyAnchor markRecord, baseAnchor, baseGlyphIndex
        return true
        
      when 5 # Mark to ligature positioning
        markIndex = @coverageIndex table.markCoverage
        return false if markIndex is -1
        
        # search backward for a base glyph
        baseGlyphIndex = @glyphIterator.index
        while --baseGlyphIndex >= 0
          break unless @glyphs[baseGlyphIndex].isMark
        
        return false if baseGlyphIndex < 0
        
        ligIndex = @coverageIndex table.ligatureCoverage, @glyphs[baseGlyphIndex].id
        return false if ligIndex is -1
        
        ligAttach = table.ligatureArray[ligIndex]
        
        markGlyph = @glyphIterator.cur
        ligGlyph = @glyphs[baseGlyphIndex]
        compIndex = if ligGlyph.ligatureID and ligGlyph.ligatureID is markGlyph.ligatureID and markGlyph.ligatureComponent?
          Math.min(markGlyph.ligatureComponent, ligGlyph.codePoints.length) - 1
        else
          ligGlyph.codePoints.length - 1
                    
        markRecord = table.markArray[markIndex]
        baseAnchor = ligAttach[compIndex][markRecord.class]
        @applyAnchor markRecord, baseAnchor, baseGlyphIndex
        return true
        
      when 6 # Mark to mark positioning
        mark1Index = @coverageIndex table.mark1Coverage
        return false if mark1Index is -1
        
        # get the previous mark to attach to
        prevIndex = @glyphIterator.peekIndex -1
        prev = @glyphs[prevIndex]
        return false unless prev?.isMark
        
        cur = @glyphIterator.cur
        
        # The following logic was borrowed from Harfbuzz
        good = no
        if cur.ligatureID is prev.ligatureID
          if not cur.ligatureID # Marks belonging to the same base
            good = yes
          else if cur.ligatureComponent is prev.ligatureComponent # Marks belonging to the same ligature component
            good = yes
        else
          # If ligature ids don't match, it may be the case that one of the marks
          # itself is a ligature, in which case match.
          if (cur.ligatureID and not cur.ligatureComponent) or (prev.ligatureID and not prev.ligatureComponent)
            good = yes
            
        return false unless good
        
        mark2Index = @coverageIndex table.mark2Coverage, prev.id
        return false if mark2Index is -1
        
        markRecord = table.mark1Array[mark1Index]
        baseAnchor = table.mark2Array[mark2Index][markRecord.class]
        @applyAnchor markRecord, baseAnchor, prevIndex
        return true
        
      when 7 # Contextual positioning
        @applyContext table
        
      when 8 # Chaining contextual positioning
        @applyChainingContext table
        
      when 9 # Extension positioning
        @applyLookup table.lookupType, table.extension
        
      else
        throw new Error "Unsupported GPOS table: #{lookupType}"
        
    return false
        
  applyAnchor: (markRecord, baseAnchor, baseGlyphIndex) ->
    baseCoords = @getAnchor baseAnchor
    markCoords = @getAnchor markRecord.markAnchor
    
    basePos = @positions[baseGlyphIndex]
    markPos = @positions[@glyphIterator.index]
    
    markPos.xOffset = basePos.xOffset + baseCoords.x - markCoords.x
    markPos.yOffset = basePos.yOffset + baseCoords.y - markCoords.y
    
    if @direction is 'ltr'
      markPos.xOffset -= basePos.xAdvance
        
  getAnchor: (anchor) ->
    switch anchor.version
      when 1
        return { x: anchor.xCoordinate, y: anchor.yCoordinate }
        
      else
        throw new Error "Unsupported anchor format: #{anchor.version}"
        
module.exports = GPOSProcessor
