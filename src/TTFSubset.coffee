Glyph = require './Glyph'

class TTFSubset
  constructor: (@font) ->
    @subset = {}
    @numGlyphs = 0
    @unicodes = {}
    @gids = {}
    @map = []
    
    # always include the missing glyph
    @includeGlyph new Glyph 0
    
  includeGlyph: (glyph) ->
    glyph = glyph.id
    if glyph of @subset
      return @gids[glyph]
        
    # get the offset to the glyph from the loca table
    stream = @font.stream
    pos = stream.pos
    
    glyfOffset = @font.directory.tables.glyf.offset
    curOffset = @font.loca.offsets[glyph]
    nextOffset = @font.loca.offsets[glyph + 1]
    stream.pos = glyfOffset + curOffset
    
    # parse the glyph from the glyf table
    glyf = GlyfTable.decode(stream)
    
    stream.pos = glyfOffset + curOffset
    glyf.buffer = stream.readBuffer(nextOffset - curOffset)
    
    @subset[glyph] = glyf
    @gids[glyph] = @numGlyphs++
    @map.push glyph
    
    # if it is a compound glyph, include its components
    if glyf.numberOfContours < 0
      for glyphID, index in glyf.glyphIDs
        gid = @includeGlyph glyphID
        glyf.buffer.writer.uint16BE gid, glyf.offsets[index]
      
    stream.pos = pos
    return @gids[glyph]
    
  clone = (obj) ->
    if Array.isArray(obj)
      ret = []
      for item in obj
        ret.push clone(item)
        
      return ret
    
    else if typeof obj is 'object'
      ret = {}
      for key, val of obj
        ret[key] = clone(val)
        
      return ret
      
    return obj
          
  encode: (stream) ->
    stream = new WritableStream stream
    
    # tables required by PDF spec: 
    #   head, hhea, loca, maxp, cvt , prep, glyf, hmtx, fpgm
    #
    # additional tables required for standalone fonts: 
    #   name, cmap, OS/2, post
    
    maxp = clone @font.maxp
    maxp.numGlyphs = @numGlyphs
    
    loca = 
      offsets: []
      
    glyfs = []
    hmtx =
      metrics: []
      leftSideBearings: []
    
    offset = 0
    for id in @map
      glyph = @subset[id]
      loca.offsets.push offset
      glyfs.push glyph.buffer
      
      if id < @font.hmtx.metrics.length
        hmtx.metrics.push @font.hmtx.metrics[id]
      else
        hmtx.metrics.push
          advanceWidth: @font.hmtx.metrics[@font.hmtx.metrics.length - 1].advanceWidth
          leftSideBearing: @font.hmtx.leftSideBearings[id - @font.hmtx.metrics.length]
        
      offset += glyph.buffer.length
      
    loca.offsets.push offset
    tables.loca.preEncode.call(loca)
    
    head = clone @font.head
    head.indexToLocFormat = loca.version
    
    hhea = clone @font.hhea
    hhea.numberOfMetrics = hmtx.metrics.length
        
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
        loca: loca
        maxp: maxp
        'cvt ': @font['cvt ']
        prep: @font.prep
        glyf: glyfs
        hmtx: hmtx
        fpgm: @font.fpgm
        # name: clone @font.name
        # 'OS/2': clone @font['OS/2']
        # post: clone @font.post
        # cmap: cmap