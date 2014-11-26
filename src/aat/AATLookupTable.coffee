class AATLookupTable
  constructor: (@table) ->
  lookup: (glyph) ->
    switch @table.version
      when 0 # simple array format
        return @table.values.getItem glyph
        
      when 2, 4 # segment format
        min = 0
        max = @table.binarySearchHeader.nUnits - 1
        
        while min <= max
          mid = (min + max) >> 1
          seg = @table.segments[mid]
          
          # special end of search value
          if seg.firstGlyph is 0xffff
            return null
          
          if glyph < seg.firstGlyph
            max = mid - 1
          else if glyph > seg.lastGlyph
            min = mid + 1
          else
            if @table.version is 2
              return seg.value
            else
              return seg.values[glyph - seg.firstGlyph]
              
      when 6 # lookup single
        min = 0
        max = @table.binarySearchHeader.nUnits - 1
        
        while min <= max
          mid = (min + max) >> 1
          seg = @table.segments[mid]
          
          # special end of search value
          if seg.glyph is 0xffff
            return null
            
          if glyph < seg.glyph
            max = mid - 1
          else if glyph > seg.glyph
            min = mid + 1
          else
            return seg.value
            
      when 8 # lookup trimmed
        return @table.values[glyph - @table.firstGlyph]
            
      else
        throw new Error "Unknown lookup table format: #{@table.version}"
          
    return null
    
module.exports = AATLookupTable
