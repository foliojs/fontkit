_ = require 'lodash'
Subset = require '../Subset'
CFFTop = require './CFFTop'
CFFPrivateDict = require './CFFPrivateDict'
standardStrings = require './CFFStandardStrings'

class CFFSubset extends Subset
  constructor: ->
    super
    @cff = @font['CFF ']
    unless @cff
      throw new Error 'Not a CFF Font'
  
  subsetCharstrings: ->
    @charstrings = []
    subrs = {}
    gsubrs = {}
    
    @charstrings.push @cff.getCharString 0
    
    for gid of @glyphs
      @charstrings.push @cff.getCharString gid
      
      glyph = @font.getGlyph gid
      path = glyph.path # this causes the glyph to be parsed
      
      for subr in glyph._usedSubrs
        subrs[subr] = true
        
      for subr in glyph._usedGsubrs
        gsubrs[subr] = true
      
    @subrs = []
    for subr, i in @cff.subrs
      if subrs[i]
        @cff.stream.pos = subr.offset
        @subrs.push @cff.stream.readBuffer subr.length
      else
        @subrs.push new Buffer([11]) # return
        
    @gsubrs = []
    for subr, i in @cff.globalSubrIndex
      if gsubrs[i]
        @cff.stream.pos = subr.offset
        @gsubrs.push @cff.stream.readBuffer subr.length
      else
        @gsubrs.push new Buffer([11]) # return
      
    return
    
  subsetFontdict: ->
    
  createCIDFontdict: ->
      
  addString: (string) ->
    return null unless string
    
    @strings ?= []
    @strings.push string
    return standardStrings.length + @strings.length - 1
    
  encode: (stream) ->
    @subsetCharstrings()
    
    privateDict = _.cloneDeep @cff.privateDict
    privateDict.Subrs = @subrs
    
    charset = 
      version: if @charstrings.length > 255 then 2 else 1
      ranges: [{ first: 1, nLeft: @charstrings.length - 1 }]
    
    topDict = _.cloneDeep @cff.topDict
    topDict.Private = null
    topDict.charset = charset
    topDict.Encoding = null
    topDict.CharStrings = @charstrings
    
    for key in ['version', 'Notice', 'Copyright', 'FullName', 'FamilyName', 'Weight', 'PostScript', 'BaseFontName', 'FontName']
      topDict[key] = @addString @cff.string topDict[key]
      
    topDict.ROS = [@addString('Adobe'), @addString('Identity'), 0]
    topDict.CIDCount = @charstrings.length
    topDict.FDArray = [{ Private: privateDict }]
    topDict.FDSelect = 
      version: 3
      nRanges: 1
      ranges: [{ first: 0, fd: 0 }]
      sentinel: @charstrings.length
    
    top =
      header: @cff.header
      nameIndex: @cff.nameIndex
      topDictIndex: [topDict]
      stringIndex: @strings
      globalSubrIndex: @gsubrs
      
    # console.log require('util').inspect top, false, 50
    CFFTop.encode stream, top
    
module.exports = CFFSubset
