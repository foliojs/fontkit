class KernProcessor
  constructor: (@font) ->
    @kern = @font.kern
    
  process: (glyphs, advances) ->
    for glyph, glyphIndex in glyphs
      break if glyphIndex + 1 >= glyphs.length
      
      left = glyphs[glyphIndex].id
      right = glyphs[glyphIndex + 1].id
      advances[glyphIndex] += @getKerning(left, right) * @font.scale
      
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
              
        when 3
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
