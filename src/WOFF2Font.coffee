TTFFont = require './TTFFont'
r = require 'restructure'
brotli = require 'brotli'

class WOFF2Font extends TTFFont  
  WOFF2Header = new r.Struct
    tag: new r.String(4) # should be 'wOF2'
    flavor: r.uint32
    length: r.uint32
    numTables: r.uint16
    reserved: new r.Reserved(r.uint16)
    totalSfntSize: r.uint32
    totalCompressedSize: r.uint32
    majorVersion: r.uint16
    minorVersion: r.uint16
    metaOffset: r.uint32
    metaLength: r.uint32
    metaOrigLength: r.uint32
    privOffset: r.uint32
    privLength: r.uint32
    
  knownTags = [
    'cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ',
    'fpgm', 'glyf', 'loca', 'prep', 'CFF ', 'VORG', 'EBDT', 'EBLC', 'gasp',
    'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF',
    'GPOS', 'GSUB', 'EBSC', 'JSTF', 'MATH', 'CBDT', 'CBLC', 'COLR', 'CPAL',
    'SVG ', 'sbix', 'acnt', 'avar', 'bdat', 'bloc', 'bsln', 'cvar', 'fdsc',
    'feat', 'fmtx', 'fvar', 'gvar', 'hsty', 'just', 'lcar', 'mort', 'morx',
    'opbd', 'prop', 'trak', 'Zapf', 'Silf', 'Glat', 'Gloc', 'Feat', 'Sill'
  ]
  
  readBase128 = (stream) ->
    result = 0
    for i in [0...5]
      code = stream.readUInt8()
      
      # If any of the top seven bits are set then we're about to overflow.
      if result & 0xe0000000
        throw new Error 'Overflow'
        
      result = (result << 7) | (code & 0x7f)
      if (code & 0x80) is 0
        return result
        
    throw new Error 'Bad base 128 number'
  
  _decodeDirectory: ->
    @directory = WOFF2Header.decode @stream
    @directory.tables = {}
    
    for index in [0...@directory.numTables] by 1
      entry = {}
      flags = entry.flags = @stream.readUInt8()
      
      # read tag if it is not one of the known indices
      if (flags & 0x3f) is 0x3f
        entry.tag = @stream.readString(4)
      else
        entry.tag = knownTags[flags & 0x3f]
        unless entry.tag
          throw new Error 'Bad Tag: ' + (flags & 0x3f)
          
      entry.length = readBase128 @stream
      
      # glyf and loca tables are transformed further
      if entry.tag in ['glyf', 'loca']
        entry.transformLength = readBase128 @stream
        
      @directory.tables[entry.tag] = entry
      
    @_dataPos = @stream.pos
    
  _decodeTable: (table) ->
    # decompress data and setup table offsets if we haven't already
    unless @_decompressed
      @stream.pos = @_dataPos
      buffer = @stream.readBuffer @directory.totalCompressedSize
      
      decompressedSize = 0
      for tag, entry of @directory.tables
        decompressedSize += entry.transformLength or entry.length
        
      decompressed = brotli.decompress buffer, decompressedSize
      unless decompressed
        throw new Error 'Error decoding compressed data in WOFF2'
        
      @stream = new r.DecodeStream new Buffer decompressed
      
      offset = 0
      for tag, entry of @directory.tables
        entry.offset = offset
        offset += entry.length
      
      @_decompressed = true
      
    @stream.pos = table.offset
    
    # TODO: transform glyf and loca tables
    
    super
    
module.exports = WOFF2Font
