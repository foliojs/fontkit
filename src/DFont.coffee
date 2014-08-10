r = require 'restructure'
TTFFont = require './TTFFont'
  
class DFont
  constructor: (@stream) ->
    @decode()
  
  @decode: (stream) ->
    return new DFont(stream)
    
  @open: (filename, name) ->
    contents = require?('fs').readFileSync filename
    return new DFont new r.DecodeStream(contents)
    
  DFontName = new r.String(r.uint8)
  DFontData = new r.Struct
    len: r.uint32
    buf: new r.Buffer('len')

  Ref = new r.Struct
    id: r.uint16
    nameOffset: r.int16
    attr: r.uint8
    dataOffset: r.uint24
    handle: r.uint32

  Type = new r.Struct
    name: new r.String(4)
    maxTypeIndex: r.uint16
    refList: new r.Pointer(r.uint16, new r.Array(Ref, -> @maxTypeIndex + 1), type: 'parent')
  
  TypeList = new r.Struct
    length: r.uint16
    types: new r.Array(Type, -> @length + 1)
  
  DFontMap = new r.Struct
    reserved: new r.Reserved(r.uint8, 24)
    typeList: new r.Pointer(r.uint16, TypeList)
    nameListOffset: new r.Pointer(r.uint16, 'void')

  DFontHeader = new r.Struct
    dataOffset: r.uint32
    map: new r.Pointer(r.uint32, DFontMap)
    dataLength: r.uint32
    mapLength: r.uint32
    
  decode: ->
    @header = DFontHeader.decode @stream
    
    for type in @header.map.typeList.types
      for ref in type.refList
        if ref.nameOffset >= 0
          @stream.pos = ref.nameOffset + @header.map.nameListOffset
          ref.name = DFontName.decode @stream
        else
          ref.name = null
          
      if type.name is 'sfnt'
        @sfnt = type
          
    return
    
  getFont: (name) ->
    return null unless @sfnt
    
    for ref in @sfnt.refList
      if ref.name is name
        @stream.pos = ref.dataOffset + @header.dataOffset
        data = DFontData.decode @stream
        return new TTFFont data.buf
        
    return null

module.exports = DFont
