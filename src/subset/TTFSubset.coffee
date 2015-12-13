cloneDeep = require 'clone'
Subset = require './Subset'
Directory = require '../tables/directory'
Tables = require '../tables'

class TTFSubset extends Subset
  _addGlyph: (gid) ->
    glyf = @font.getGlyph(gid)._decode()
    
    # get the offset to the glyph from the loca table
    curOffset = @font.loca.offsets[gid]
    nextOffset = @font.loca.offsets[gid + 1]
    
    stream = @font._getTableStream 'glyf'
    stream.pos += curOffset
    
    buffer = stream.readBuffer(nextOffset - curOffset)
  
    # if it is a compound glyph, include its components
    if glyf?.numberOfContours < 0
      buffer = new Buffer(buffer)
      for component in glyf.components
        gid = @includeGlyph component.glyphID
        buffer.writeUInt16BE gid, component.pos
        
    @glyf.push buffer
    @loca.offsets.push @offset
    
    if gid < @font.hmtx.metrics.length
      @hmtx.metrics.push @font.hmtx.metrics.get gid
    else
      @hmtx.metrics.push
        advance: @font.hmtx.metrics.get(@font.hmtx.metrics.length - 1).advance
        bearing: @font.hmtx.bearings.get(gid - @font.hmtx.metrics.length)
      
    @offset += buffer.length
    return @glyf.length - 1
          
  encode: (stream) ->      
    # tables required by PDF spec: 
    #   head, hhea, loca, maxp, cvt , prep, glyf, hmtx, fpgm
    #
    # additional tables required for standalone fonts: 
    #   name, cmap, OS/2, post
              
    @glyf = []
    @offset = 0
    @loca = 
      offsets: []
    
    @hmtx =
      metrics: []
      bearings: []
      
    # include all the glyphs
    # not using a for loop because we need to support adding more
    # glyphs to the array as we go, and CoffeeScript caches the length.
    i = 0
    while i < @glyphs.length
      @_addGlyph @glyphs[i++]
      
    maxp = cloneDeep @font.maxp
    maxp.numGlyphs = @glyf.length
      
    @loca.offsets.push @offset
    Tables.loca.preEncode.call @loca
    
    head = cloneDeep @font.head
    head.indexToLocFormat = @loca.version
    
    hhea = cloneDeep @font.hhea
    hhea.numberOfMetrics = @hmtx.metrics.length
        
    # map = []
    # for index in [0...256]
    #     if index < @numGlyphs
    #         map[index] = index
    #     else
    #         map[index] = 0
    # 
    # cmapTable = 
    #     version: 0
    #     length: 262
    #     language: 0
    #     codeMap: map
    # 
    # cmap = 
    #     version: 0
    #     numSubtables: 1
    #     tables: [
    #         platformID: 1
    #         encodingID: 0
    #         table: cmapTable
    #     ]
        
    # TODO: subset prep, cvt, fpgm?
    Directory.encode stream,
      tables:
        head: head
        hhea: hhea
        loca: @loca
        maxp: maxp
        'cvt ': @font['cvt ']
        prep: @font.prep
        glyf: @glyf
        hmtx: @hmtx
        fpgm: @font.fpgm
        # name: clone @font.name
        # 'OS/2': clone @font['OS/2']
        # post: clone @font.post
        # cmap: cmap
        
module.exports = TTFSubset
