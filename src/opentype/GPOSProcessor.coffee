OpenTypeProcessor = require './OpenTypeProcessor'

class GPOSProcessor extends OpenTypeProcessor
  applyPositionValue: (sequenceIndex, value) ->
    position = @advances[@glyphIndex + sequenceIndex]
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
        return if index is -1
        
        switch table.version
          when 1
            @applyPositionValue 0, table.value
            
          when 2
            @applyPositionValue 0, table.values[index]
    
      when 2 # Pair Adjustment Positioning
        return unless @glyphIndex + 1 < @glyphs.length
        
        index = @coverageIndex table.coverage
        return if index is -1
      
        switch table.version
          when 1 # Adjustments for glyph pairs
            set = table.pairSets[index]
            
            for pair in set when pair.secondGlyph is @glyphs[@glyphIndex + 1].id
              @applyPositionValue 0, pair.value1
              @applyPositionValue 1, pair.value2
              break
          
          when 2 # Class pair adjustment
            class1 = @getClassID 0, table.classDef1
            class2 = @getClassID 1, table.classDef2    
            return if class1 is -1 or class2 is -1
              
            pair = table.classRecords[class1][class2]
            @applyPositionValue 0, pair.value1
            @applyPositionValue 1, pair.value2
      
      else
        throw new Error "Unsupported GPOS table!"
        
module.exports = GPOSProcessor
