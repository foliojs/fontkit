class KernProcessor
  constructor: (@font) ->
    @kern = @font.kern
    
  process: (glyphs, positions) ->
    for glyph, glyphIndex in glyphs
      break if glyphIndex + 1 >= glyphs.length
      
      left = glyphs[glyphIndex].id
      right = glyphs[glyphIndex + 1].id
      positions[glyphIndex].xAdvance += @getKerning(left, right)
      
  getKerning: (left, right) ->
    res = 0
    
    for table in @kern.tables
      continue if table.coverage.crossStream
      switch table.version
        when 0
          continue unless table.coverage.horizontal
        when 1
          continue if table.coverage.vertical or table.coverage.variation
        else
          throw new Error "Unsupported kerning table version #{table.version}"
      
      val = 0
      s = table.subtable
      switch table.format
        when 0
          # TODO: binary search
          for pair in s.pairs
            if pair.left is left and pair.right is right
              val = pair.value
              break
              
        when 2
          if left >= s.leftTable.firstGlyph and left < s.leftTable.firstGlyph + s.leftTable.nGlyphs
            leftOffset = s.leftTable.offsets[left - s.leftTable.firstGlyph]
          else
            leftOffset = s.array.off
          
          if right >= s.rightTable.firstGlyph and right < s.rightTable.firstGlyph + s.rightTable.nGlyphs
            rightOffset = s.rightTable.offsets[right - s.rightTable.firstGlyph]
          else
            rightOffset = 0
            
          index = (leftOffset + rightOffset - s.array.off) / 2
          val = s.array.values.get(index)
              
        when 3
          return 0 if left >= s.glyphCount or right >= s.glyphCount
          val = s.kernValue[s.kernIndex[s.leftClass[left] * s.rightClassCount + s.rightClass[right]]]
              
        else
          throw new Error "Unsupported kerning sub-table format #{table.format}"
          
      # Microsoft supports the override flag, which resets the result
      # Otherwise, the sum of the results from all subtables is returned
      if table.coverage.override
        res = val
      else
        res += val
          
    return res
    
module.exports = KernProcessor
