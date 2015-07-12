class CmapProcessor
  constructor: (cmapTable) ->
    @_characterSet = null
    
    # find the unicode cmap
    # check for a 32-bit cmap first
    for cmap in cmapTable.tables
      # unicode or windows platform
      if (cmap.platformID is 0 and cmap.encodingID in [4, 6]) or (cmap.platformID is 3 and cmap.encodingID is 10)
         @cmap = cmap.table
         return
       
    # try "old" 16-bit cmap
    for cmap in cmapTable.tables
      if cmap.platformID is 0 or (cmap.platformID is 3 and cmap.encodingID is 1)
        @cmap = cmap.table
        return
      
    throw new Error "Could not find a unicode cmap"
    
  lookup: (codepoint) ->
    cmap = @cmap
    switch cmap.version
      when 0
        return cmap.codeMap.get(codepoint) or 0
        
      when 4
        min = 0
        max = cmap.segCount - 1
        while min <= max
          mid = (min + max) >> 1
          
          if codepoint < cmap.startCode.get(mid)
            max = mid - 1
          else if codepoint > cmap.endCode.get(mid)
            min = mid + 1
          else
            rangeOffset = cmap.idRangeOffset.get(mid)
            if rangeOffset is 0
              gid = codepoint + cmap.idDelta.get(mid)
            else
              index = rangeOffset / 2 + (codepoint - cmap.startCode.get(mid)) - (cmap.segCount - mid)
              gid = cmap.glyphIndexArray.get(index) or 0
              unless gid is 0
                gid += cmap.idDelta.get(mid)
                
            return gid & 0xffff
        
        return 0
        
      when 8
        throw new Error 'TODO: cmap format 8'
            
      when 6, 10
        return cmap.glyphIndices.get(codepoint - cmap.firstCode) or 0
        
      when 12, 13
        min = 0
        max = cmap.nGroups - 1
        while min <= max
          mid = (min + max) >> 1
          group = cmap.groups.get(mid)
          
          if codepoint < group.startCharCode
            max = mid - 1
          else if codepoint > group.endCharCode
            min = mid + 1
          else
            if cmap.version is 12
              return group.glyphID + (codepoint - group.startCharCode)
            else
              return group.glyphID
              
        return 0
        
      when 14
        throw new Error 'TODO: cmap format 14'
        
      else
        throw new Error 'Unknown cmap format ' + cmap.version
    
  getCharacterSet: ->
    if @_characterSet
      return @_characterSet
      
    cmap = @cmap
    switch cmap.version
      when 0
        @_characterSet = [0...cmap.codeMap.length]
          
      when 4
        res = []
        for tail, i in cmap.endCode.toArray()
          start = cmap.startCode.get(i)
          res.push [start..tail]...
          
        @_characterSet = res
      
      when 8
        throw new Error 'TODO: cmap format 8'
        
      when 6, 10
        @_characterSet = [cmap.firstCode...cmap.firstCode + cmap.glyphIndices.length]
        
      when 12, 13
        res = []
        for group in cmap.groups.toArray()
          res.push [group.startCharCode..group.endCharCode]...
          
        @_characterSet = res
        
      when 14
        throw new Error 'TODO: cmap format 14'
        
      else
        throw new Error 'Unknown cmap format ' + cmap.version
        
    return @_characterSet

module.exports = CmapProcessor
