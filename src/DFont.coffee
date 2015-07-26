r = require 'restructure'
TTFFont = require './TTFFont'
  
class DFont
  get = require('./get')(this)
  
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
    
  @probe: (buffer) ->
    stream = new r.DecodeStream(buffer)
    
    try
      header = DFontHeader.decode stream
    catch e
      return false
      
    for type in header.map.typeList.types
      if type.name is 'sfnt'
        return true
      
    return false
    
  constructor: (@stream) ->
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
      pos = @header.dataOffset + ref.dataOffset + 4
      stream = new r.DecodeStream @stream.buffer.slice(pos)
      font = new TTFFont stream
      if font.postscriptName is name
        return font
        
    return null
  
  get 'fonts', ->
    fonts = []
    for ref in @sfnt.refList
      pos = @header.dataOffset + ref.dataOffset + 4
      stream = new r.DecodeStream @stream.buffer.slice(pos)
      fonts.push new TTFFont stream
      
    return fonts

module.exports = DFont
