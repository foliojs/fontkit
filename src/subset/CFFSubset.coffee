Subset = require './Subset'
CFFTop = require '../cff/CFFTop'
CFFPrivateDict = require '../cff/CFFPrivateDict'
standardStrings = require '../cff/CFFStandardStrings'

class CFFSubset extends Subset
  constructor: ->
    super
    @cff = @font['CFF ']
    unless @cff
      throw new Error 'Not a CFF Font'
  
  subsetCharstrings: ->
    @charstrings = []
    gsubrs = {}

    for gid in @glyphs
      @charstrings.push @cff.getCharString gid

      glyph = @font.getGlyph gid
      path = glyph.path # this causes the glyph to be parsed

      for subr of glyph._usedGsubrs
        gsubrs[subr] = true
        
    @gsubrs = @subsetSubrs @cff.globalSubrIndex, gsubrs
    
  subsetSubrs: (subrs, used) ->
    res = []
    for subr, i in subrs
      if used[i]
        @cff.stream.pos = subr.offset
        res.push @cff.stream.readBuffer subr.length
      else
        res.push new Buffer([11]) # return
        
    return res
    
  shallowCopy = (obj) ->
    res = {}
    for key, val of obj
      res[key] = val
      
    return res
    
  subsetFontdict: (topDict) ->
    topDict.FDArray = []
    topDict.FDSelect =
      version: 0
      fds: []
    
    used_fds = {}
    used_subrs = []
    for gid in @glyphs
      fd = @cff.fdForGlyph gid
      continue unless fd?
      
      unless used_fds[fd]
        topDict.FDArray.push shallowCopy @cff.topDict.FDArray[fd]
        used_subrs.push {}
        
      used_fds[fd] = true
      topDict.FDSelect.fds.push topDict.FDArray.length - 1
      
      glyph = @font.getGlyph gid
      path = glyph.path # this causes the glyph to be parsed
      for subr of glyph._usedSubrs
        used_subrs[used_subrs.length - 1][subr] = true
      
    for dict, i in topDict.FDArray
      delete dict.FontName
      if dict.Private?.Subrs
        dict.Private = shallowCopy dict.Private
        dict.Private.Subrs = @subsetSubrs dict.Private.Subrs, used_subrs[i]
        
    return
    
  createCIDFontdict: (topDict) ->
    used_subrs = {}
    for gid in @glyphs
      glyph = @font.getGlyph gid
      path = glyph.path # this causes the glyph to be parsed
        
      for subr of glyph._usedSubrs
        used_subrs[subr] = true
    
    privateDict = shallowCopy @cff.topDict.Private
    privateDict.Subrs = @subsetSubrs @cff.topDict.Private.Subrs, used_subrs
    
    topDict.FDArray = [{ Private: privateDict }]
    topDict.FDSelect =
      version: 3
      nRanges: 1
      ranges: [{ first: 0, fd: 0 }]
      sentinel: @charstrings.length
      
  addString: (string) ->
    return null unless string
    
    @strings ?= []
    @strings.push string
    return standardStrings.length + @strings.length - 1
    
  encode: (stream) ->
    @subsetCharstrings()
    
    charset = 
      version: if @charstrings.length > 255 then 2 else 1
      ranges: [{ first: 1, nLeft: @charstrings.length - 2 }]
    
    topDict = shallowCopy @cff.topDict
    topDict.Private = null
    topDict.charset = charset
    topDict.Encoding = null
    topDict.CharStrings = @charstrings
    
    for key in ['version', 'Notice', 'Copyright', 'FullName', 'FamilyName', 'Weight', 'PostScript', 'BaseFontName', 'FontName']
      topDict[key] = @addString @cff.string topDict[key]
      
    topDict.ROS = [@addString('Adobe'), @addString('Identity'), 0]
    topDict.CIDCount = @charstrings.length
    
    if @cff.isCIDFont
      @subsetFontdict topDict
    else
      @createCIDFontdict topDict
    
    top =
      header: @cff.header
      nameIndex: [@cff.postscriptName]
      topDictIndex: [topDict]
      stringIndex: @strings
      globalSubrIndex: @gsubrs
      
    CFFTop.encode stream, top
    
module.exports = CFFSubset
