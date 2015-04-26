r = require 'restructure'
CFFIndex = require './cff/CFFIndex'
CFFTop = require './cff/CFFTop'
CFFPrivateDict = require './cff/CFFPrivateDict'
standardStrings = require './cff/CFFStandardStrings'
  
class CFFFont
  get = require('./get')(this)
  constructor: (@stream) ->
    @decode()
  
  @decode: (stream) ->
    return new CFFFont(stream)
    
  @open: (filename, name) ->
    contents = require?('fs').readFileSync filename
    return new CFFFont new r.DecodeStream(contents)  
      
  decode: ->
    start = @stream.pos
    top = CFFTop.decode(@stream)
    for key, val of top
      this[key] = val
    
    if @topDictIndex.length isnt 1
      throw new Error "Only a single font is allowed in CFF"
      
    @isCIDFont = @topDict.ROS?
      
    # if @topDict.CharstringType isnt 2
    #   throw new Error "Only CharstringType 2 is supported"
      
    # charset?
    switch @topDictIndex[0].Encoding
      when 0 # standard encoding
        break
      when 1 # expert encoding
        break
      else # custom
        break
    
    return this
  
  string: (sid) ->
    if sid <= standardStrings.length
      return standardStrings[sid]
    
    return @stringIndex[sid - standardStrings.length]
    
  get 'topDict', ->
    return @topDictIndex[0]
      
  get 'postscriptName', ->
    return @nameIndex[0]
    
  get 'fullName', ->
    return @string @topDict.FullName
    
  get 'familyName', ->
    return @string @topDict.FamilyName
    
  getCharString: (glyph) ->
    @stream.pos = @topDict.CharStrings[glyph].offset
    return @stream.readBuffer @topDict.CharStrings[glyph].length
    
  fdForGlyph: (gid) ->
    return null unless @topDict.FDSelect
    
    switch @topDict.FDSelect.version
      when 0
        return @topDict.FDSelect.fds[gid]
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
            return ranges[mid].fd
      else
        throw new Error "Unknown FDSelect version: #{@topDict.FDSelect.version}"
    
  privateDictForGlyph: (gid) ->
    if @topDict.FDSelect
      fd = @fdForGlyph gid
      return if fd? then @topDict.FDArray[fd]?.Private else null
      
    return @topDict.Private

module.exports = CFFFont
