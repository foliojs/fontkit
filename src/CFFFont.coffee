CFFIndex = require './cff/CFFIndex'
CFFTop = require './cff/CFFTop'
CFFPrivateDict = require './cff/CFFPrivateDict'
standardStrings = require './cff/CFFStandardStrings'
  
class CFFFont
  constructor: (@stream) ->
    @decode()
  
  @decode: (stream) ->
    return new CFFFont(stream)
      
  decode: ->
    start = @stream.pos
    top = CFFTop.decode(@stream)
    for key, val of top
      this[key] = val
    
    if @topDictIndex.length isnt 1
      throw new Error "Only a single font is allowed in CFF"
      
    @topDict = @topDictIndex[0]
    @isCIDFont = @topDict.ROS?
      
    # if @topDict.CharstringType isnt 2
    #   throw new Error "Only CharstringType 2 is supported"
      
    @charStrings = @topDict.CharStrings
      
    # charset?
    switch @topDictIndex[0].Encoding
      when 0 # standard encoding
        break
      when 1 # expert encoding
        break
      else # custom
        break
    
    return this
    
  get = (key, fn) =>
    Object.defineProperty @prototype, key,
      get: fn
      enumerable: true
  
  string: (sid) ->
    if sid <= standardStrings.length
      return standardStrings[sid]
    
    return @stringIndex[sid - standardStrings.length]
      
  get 'postscriptName', ->
    return @nameIndex[0]
    
  get 'fullName', ->
    return @string @topDict.FullName
    
  get 'familyName', ->
    return @string @topDict.FamilyName
    
  getCharString: (glyph) ->
    @stream.pos = @charStrings[glyph].offset
    return @stream.readBuffer @charStrings[glyph].length
    
  privateDictForGlyph: (gid) ->
    if @topDict.FDSelect
      switch @topDict.FDSelect.version
        when 0
          return @topDict.FDArray[@topDict.FDSelect[gid]]?.Private
        when 3
          ranges = @topDict.FDSelect.ranges
          low = 0
          high = ranges.length - 1
          
          while low <= high
            mid = (low + high) >> 1
            
            if gid < ranges[mid].first
              high = mid - 1
            else if gid > ranges[mid + 1]?.first
              low = mid + 1
            else
              return @topDict.FDArray[ranges[mid].fd]?.Private
        else
          throw new Error "Unknown FDSelect version: #{@topDict.FDSelect.version}"
      
    return @topDict.Private

module.exports = CFFFont
