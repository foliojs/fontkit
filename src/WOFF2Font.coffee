r = require 'restructure'
brotli = require 'brotli/decompress'
TTFFont = require './TTFFont'
TTFGlyph = require './glyph/TTFGlyph'
WOFF2Glyph = require './glyph/WOFF2Glyph'

# Subclass of TTFFont that represents a TTF/OTF font compressed by WOFF2
# See spec here: http://www.w3.org/TR/WOFF2/
class WOFF2Font extends TTFFont
  @probe: (buffer) ->
    return buffer.toString('ascii', 0, 4) is 'wOF2'
    
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
    
  _decompress: ->
    # decompress data and setup table offsets if we haven't already
    unless @_decompressed
      @stream.pos = @_dataPos
      buffer = @stream.readBuffer @directory.totalCompressedSize
      
      decompressedSize = 0
      for tag, entry of @directory.tables
        entry.offset = decompressedSize
        decompressedSize += entry.transformLength or entry.length
        
      decompressed = brotli buffer, decompressedSize
      unless decompressed
        throw new Error 'Error decoding compressed data in WOFF2'
        
      @stream = new r.DecodeStream new Buffer decompressed
      @_decompressed = true
    
  _decodeTable: (table) ->
    @_decompress()
    @stream.pos = table.offset
    super
    
  # Override this method to get a glyph and return our
  # custom subclass if there is a glyf table.
  _getBaseGlyph: (glyph, characters = []) ->
    unless @_glyphs[glyph]
      if @directory.tables.glyf?
        @_transformGlyfTable() unless @_transformedGlyphs
        @_glyphs[glyph] = new WOFF2Glyph glyph, characters, this
        
      else
        super
        
  # Special class that accepts a length and returns a sub-stream for that data
  class Substream
    constructor: (@length) ->
      @_buf = new r.Buffer @length
      
    decode: (stream, parent) ->
      return new r.DecodeStream @_buf.decode(stream, parent)
      
  # This struct represents the entire glyf table
  GlyfTable = new r.Struct
    version: r.uint32
    numGlyphs: r.uint16
    indexFormat: r.uint16
    nContourStreamSize: r.uint32
    nPointsStreamSize: r.uint32
    flagStreamSize: r.uint32
    glyphStreamSize: r.uint32
    compositeStreamSize: r.uint32
    bboxStreamSize: r.uint32
    instructionStreamSize: r.uint32
    nContours: new Substream 'nContourStreamSize'
    nPoints: new Substream 'nPointsStreamSize'
    flags: new Substream 'flagStreamSize'
    glyphs: new Substream 'glyphStreamSize'
    composites: new Substream 'compositeStreamSize'
    bboxes: new Substream 'bboxStreamSize'
    instructions: new Substream 'instructionStreamSize'
      
  _transformGlyfTable: ->
    @_decompress()
    @stream.pos = @directory.tables.glyf.offset
    table = GlyfTable.decode @stream
    glyphs = []
        
    for index in [0...table.numGlyphs] by 1
      glyph = {}
      nContours = table.nContours.readInt16BE()
      glyph.numberOfContours = nContours
            
      if nContours > 0 # simple glyph
        nPoints = []
        totalPoints = 0
                
        for i in [0...nContours] by 1
          r = read255UInt16 table.nPoints
          nPoints.push r
          totalPoints += r
          
        glyph.points = decodeTriplet table.flags, table.glyphs, totalPoints
        for i in [0...nContours] by 1
          glyph.points[nPoints[i] - 1].endContour = true
        
        instructionSize = read255UInt16 table.glyphs
        
      else if nContours < 0 # composite glyph          
        haveInstructions = TTFGlyph::_decodeComposite.call { _font: this }, glyph, table.composites          
        if haveInstructions
          instructionSize = read255UInt16 table.glyphs
          
      glyphs.push glyph
      
    @_transformedGlyphs = glyphs
    
  WORD_CODE = 253
  ONE_MORE_BYTE_CODE2 = 254
  ONE_MORE_BYTE_CODE1 = 255
  LOWEST_U_CODE = 253
    
  read255UInt16 = (stream) ->
    code = stream.readUInt8()
    
    if code is WORD_CODE
      return stream.readUInt16BE()
      
    if code is ONE_MORE_BYTE_CODE1
      return stream.readUInt8() + LOWEST_U_CODE
      
    if code is ONE_MORE_BYTE_CODE2
      return stream.readUInt8() + LOWEST_U_CODE * 2
      
    return code
    
  # Represents a glyph point
  class Point
    constructor: (@x, @y, @onCurve) ->
      @endContour = false
  
  withSign = (flag, baseval) ->
    return if (flag & 1) then baseval else -baseval
    
  decodeTriplet = (flags, glyphs, nPoints) ->
    x = y = 0
    res = []
    
    for i in [0...nPoints] by 1
      flag = flags.readUInt8()
      onCurve = !(flag >> 7)
      flag &= 0x7f
        
      if flag < 10
        dx = 0
        dy = withSign flag, ((flag & 14) << 7) + glyphs.readUInt8()
        
      else if flag < 20
        dx = withSign flag, (((flag - 10) & 14) << 7) + glyphs.readUInt8()
        dy = 0
        
      else if flag < 84
        b0 = flag - 20
        b1 = glyphs.readUInt8()
        dx = withSign flag, 1 + (b0 & 0x30) + (b1 >> 4)
        dy = withSign flag >> 1, 1 + ((b0 & 0x0c) << 2) + (b1 & 0x0f)
        
      else if flag < 120
        b0 = flag - 84
        dx = withSign flag, 1 + ((b0 / 12) << 8) + glyphs.readUInt8()
        dy = withSign flag >> 1, 1 + (((b0 % 12) >> 2) << 8) + glyphs.readUInt8()
        
      else if flag < 124
        b1 = glyphs.readUInt8()
        b2 = glyphs.readUInt8()
        dx = withSign flag, (b1 << 4) + (b2 >> 4)
        dy = withSign flag >> 1, ((b2 & 0x0f) << 8) + glyphs.readUInt8()
        
      else
        dx = withSign flag, glyphs.readUInt16BE()
        dy = withSign flag >> 1, glyphs.readUInt16BE()
        
      x += dx
      y += dy
      res.push new Point x, y, onCurve
      
    return res
    
module.exports = WOFF2Font
