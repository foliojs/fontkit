r = require 'restructure'

Base128 =
  decode: (stream) ->
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
    
knownTags = [
  'cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ',
  'fpgm', 'glyf', 'loca', 'prep', 'CFF ', 'VORG', 'EBDT', 'EBLC', 'gasp',
  'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF',
  'GPOS', 'GSUB', 'EBSC', 'JSTF', 'MATH', 'CBDT', 'CBLC', 'COLR', 'CPAL',
  'SVG ', 'sbix', 'acnt', 'avar', 'bdat', 'bloc', 'bsln', 'cvar', 'fdsc',
  'feat', 'fmtx', 'fvar', 'gvar', 'hsty', 'just', 'lcar', 'mort', 'morx',
  'opbd', 'prop', 'trak', 'Zapf', 'Silf', 'Glat', 'Gloc', 'Feat', 'Sill'
]

WOFF2DirectoryEntry = new r.Struct
  flags: r.uint8
  customTag: new r.Optional(new r.String(4), -> (@flags & 0x3f) is 0x3f)
  tag: -> @customTag or knownTags[@flags & 0x3f] or throw new Error "Bad tag: ${flags & 0x3f}"
  length: Base128
  transformVersion: -> (@flags >>> 6) & 0x03
  transformed: -> if @tag in ['glyf', 'loca'] then @transformVersion is 0 else @transformVersion isnt 0
  transformLength: new r.Optional(Base128, -> @transformed)

WOFF2Directory = new r.Struct
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
  tables: new r.Array(WOFF2DirectoryEntry, 'numTables')

WOFF2Directory.process = ->
  tables = {}
  for table in @tables
    tables[table.tag] = table
    
  @tables = tables

module.exports = WOFF2Directory
