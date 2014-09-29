r = require 'restructure'
TTFFont = require './TTFFont'
Directory = require './Directory'
tables = require './tables'

class TrueTypeCollection
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
      
  constructor: (@stream) ->
    if @stream.readString(4) isnt 'ttcf'
      throw new Error 'Not a TrueType collection'
      
    @header = TTCHeader.decode @stream
    
  getFont: (name) ->
    for offset in @header.offsets
      @stream.pos = offset
      directory = Directory.decode(@stream, _startOffset: 0)
      nameTable = directory.tables.name
      unless nameTable
        throw new Error "Font must have a name table."

      @stream.pos = nameTable.offset
      nameTable = tables.name.decode(@stream)
      unless nameTable.records.postscriptName
        throw new Error "Font must have a postscript name"

      for lang, val of nameTable.records.postscriptName when val is name
        substream = new r.DecodeStream @stream.buffer
        substream.pos = offset
        return new TTFFont substream
        
    return null
    
module.exports = TrueTypeCollection
