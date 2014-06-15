CFFIndex = require './cff/CFFIndex'
CFFTop = require './cff/CFFTop'
CFFPrivateDict = require './cff/CFFPrivateDict'
standardStrings = require './cff/CFFStandardStrings'
  
class CFFFont
  constructor: (@stream) ->
    @decode()
  
  @decode: (stream) ->
    return new CFFFont(stream)
    
  bias = (s) ->
    if s.length < 1240
      return 107
    else if s.length < 33900
      return 1131
    else
      return 32768
  
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
      
    @globalSubrsBias = bias @globalSubrIndex
      
    @charStrings = @topDict.CharStrings
    
    # Private DICT Data
    if @privateDict = @topDict.Private      
      @subrs = @privateDict.Subrs
      @subrsBias = bias @subrs
      
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

module.exports = CFFFont
