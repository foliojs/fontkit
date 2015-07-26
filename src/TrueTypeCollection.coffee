r = require 'restructure'
TTFFont = require './TTFFont'
Directory = require './tables/directory'
tables = require './tables'

class TrueTypeCollection
  get = require('./get')(this)
  TTCHeader = new r.VersionedStruct r.uint32,
    0x00010000:
      numFonts:   r.uint32
      offsets:    new r.Array(r.uint32, 'numFonts')
    0x00020000:
      numFonts:   r.uint32
      offsets:    new r.Array(r.uint32, 'numFonts')
      dsigTag:    r.uint32
      dsigLength: r.uint32
      dsigOffset: r.uint32
      
  @probe: (buffer) ->
    return buffer.toString('ascii', 0, 4) is 'ttcf'
      
  constructor: (@stream) ->
    if @stream.readString(4) isnt 'ttcf'
      throw new Error 'Not a TrueType collection'
      
    @header = TTCHeader.decode @stream
    
  getFont: (name) ->
    for offset in @header.offsets
      stream = new r.DecodeStream @stream.buffer
      stream.pos = offset
      font = new TTFFont stream
      if font.postscriptName is name
        return font
        
    return null
  
  get 'fonts', ->
    fonts = []
    for offset in @header.offsets
      stream = new r.DecodeStream @stream.buffer
      stream.pos = offset
      fonts.push new TTFFont stream
      
    return fonts
    
module.exports = TrueTypeCollection
