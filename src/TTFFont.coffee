r = require 'restructure'
zlib = require 'browserify-zlib'
TTCHeader = require './TTCHeader'
Directory = require './Directory'
WOFFDirectory = require './WOFFDirectory'
tables = require './tables'
GSUBProcessor = require './GSUBProcessor'
GPOSProcessor = require './GPOSProcessor'
Glyph = require './Glyph'

class TTFFont    
  @open: (filename, name) ->
    contents = require?('fs').readFileSync filename
    return new TTFFont(contents, name)
  
  constructor: (data, name) ->
    @stream = new r.DecodeStream(data)
    
    # Check if this is a TrueType collection
    sig = @stream.readString(4)
    if sig is 'ttcf'
      unless name
        throw new Error "Must specify a font name for TTC files."
        
      @ttcHeader = TTCHeader.decode(@stream)
      
      for offset in @ttcHeader.offsets
        @stream.pos = offset
        directory = Directory.decode(@stream)
        nameTable = directory.tables.name
        unless nameTable
          throw new Error "Font must have a name table."
          
        @stream.pos = nameTable.offset
        nameTable = tables.name.decode(@stream)
        unless nameTable.records.postscriptName
          throw new Error "Font must have a postscript name"
          
        for lang, val of nameTable.records.postscriptName when val is name
          @stream.pos = offset
          @decode()
          return
    else if sig is 'wOFF'
      @isWOFF = true
      @decode()
    else
      @stream.pos = 0
      @decode()
    
  get = (key, fn) =>
    Object.defineProperty @prototype, key,
      get: fn
      enumerable: true
    
  getTable = (table) ->
    key = '_' + table.tag        
    unless key of this
      pos = @stream.pos
      @stream.pos = table.offset
      
      if @isWOFF and table.compLength < table.origLength
        buf = zlib.inflateSync @stream.readBuffer(table.compLength)
        stream = new r.DecodeStream(buf)
        this[key] = tables[table.tag].decode(stream, this, table.origLength)
      else
        this[key] = tables[table.tag].decode(@stream, this, table.length)
      
      @stream.pos = pos
      
    return this[key]
    
  decode: ->
    if @isWOFF
      @directory = WOFFDirectory.decode(@stream)
    else
      @directory = Directory.decode(@stream)
    
    # define properties for each table to lazily parse
    for tag, table of @directory.tables
      if not tables[tag]
        console.warn('Unsupported table ' + tag)
      
      Object.defineProperty this, tag,
        get: getTable.bind(this, table)
        
    return
    
  get 'postscriptName', ->
    name = @name.records.postscriptName
    lang = Object.keys(name)[0]
    return name[lang]
    
  get 'fullName', ->
    @name.records.fullName.English
    
  get 'familyName', ->
    @name.records.fontFamily.English
    
  get 'scale', ->
    return 1000 / @head.unitsPerEm
    
  # TODO: what about the hhea versions?
  get 'ascent', ->
    return this['OS/2'].ascent * @scale
    
  get 'descent', ->
    return this['OS/2'].descent * @scale
    
  get 'lineGap', ->
    return this['OS/2'].lineGap * @scale
    
  get 'underlinePosition', ->
    return @post.underlinePosition * @scale
    
  get 'underlineThickness', ->
    return @post.underlineThickness * @scale
    
  get 'italicAngle', ->
    return @post.italicAngle / 65536 # convert from fixed point to decimal
    
  get 'capHeight', ->
    return this['OS/2'].capHeight * @scale
    
  get 'xHeight', ->
    return this['OS/2'].xHeight * @scale
    
  get 'numGlyphs', ->
    return @maxp.numGlyphs
    
  get 'unitsPerEm', ->
    return @head.unitsPerEm
    
  get 'bbox', ->
    return [@head.xMin * @scale, @head.yMin * @scale, @head.xMax * @scale, @head.yMax * @scale]
    
  findUnicodeCmap = (font) ->
    # check for a 32-bit cmap first
    for cmap in font.cmap.tables
      # unicode or windows platform
      if (cmap.platformID is 0 and cmap.encodingID in [4, 6]) or (cmap.platformID is 3 and cmap.encodingID is 10)
         return cmap.table
         
    # try "old" 16-bit cmap
    for cmap in font.cmap.tables
      if cmap.platformID is 0 or (cmap.platformID is 3 and cmap.encodingID is 1)
        return cmap.table
        
    throw new Error "Could not find a unicode cmap"
        
  cmapLookup = (cmap, codepoint) ->
    switch cmap.version
      when 0
        return cmap.codeMap[codepoint]
        
      when 4
        min = 0
        max = cmap.segCount - 1
        while min <= max
          mid = (min + max) >> 1
          
          if codepoint < cmap.startCode[mid]
            max = mid - 1
          else if codepoint > cmap.endCode[mid]
            min = mid + 1
          else
            rangeOffset = cmap.idRangeOffset[mid]
            if rangeOffset is 0
              gid = codepoint + cmap.idDelta[mid]
            else
              index = rangeOffset / 2 + (codepoint - cmap.startCode[mid]) - (cmap.segCount - mid)
              gid = cmap.glyphIndexArray[index] or 0
              unless gid is 0
                gid += cmap.idDelta[mid]
                
            return gid & 0xffff
        
        return 0
        
      when 8
        throw new Error 'TODO: cmap format 8'
            
      when 6, 10
        return cmap.glyphIndices[codepoint - cmap.firstCode]
        
      when 12, 13
        min = 0
        max = cmap.nGroups - 1
        while min <= max
          mid = (min + max) >> 1
          group = cmap.groups[mid]
          
          if codepoint < group.startCharCode
            max = group.startCharCode - 1
          else if codepoint > group.endCharCode
            min = group.endCharCode + 1
          else
            if cmap.version is 12
              return group.glyphID + (codepoint - group.startCharCode)
            else
              return group.glyphID
              
        return 0
        
      when 14
        throw new Error 'TODO: cmap format 14'
        
      else
        throw new Error 'Unknown cmap format ' + cmap.version
            
  glyphForCodePoint: (codePoint) ->
    if not @_charMap
      @_charMap = findUnicodeCmap this
      
    return new Glyph cmapLookup(@_charMap, codePoint) or 0, [codePoint]
        
  codePointAt = (str, idx = 0) ->
    code = str.charCodeAt(idx)
    next = str.charCodeAt(idx + 1)
    
    # If a surrogate pair
    if 0xd800 <= code <= 0xdbff and 0xdc00 <= next <= 0xdfff
      return ((code - 0xd800) * 0x400) + (next - 0xdc00) + 0x10000
      
    return code
                
  glyphsForString: (str, userFeatures = []) ->
    # Map character codes to glyph ids
    glyphs = []
    for i in [0...str.length]
      # check for already processed low surrogates
      continue if 0xdc00 <= str.charCodeAt(i) <= 0xdfff
      
      # get the glyph
      glyphs.push @glyphForCodePoint codePointAt(str, i)
      
    return glyphs if not @GSUB? or userFeatures.length is 0
    
    # apply glyph substitutions
    @_GSUBProcessor ?= new GSUBProcessor(this, @GSUB)
    @_GSUBProcessor.applyFeatures(userFeatures, glyphs)
      
    return glyphs
    
  get 'availableFeatures', ->
    features = []
    
    if @GSUB?
      @_GSUBProcessor ?= new GSUBProcessor(this, @GSUB)
      features.push Object.keys(@_GSUBProcessor.features)...
    
    if @GPOS?
      @_GPOSProcessor ?= new GPOSProcessor(this, @GPOS)
      features.push Object.keys(@_GPOSProcessor.features)...
    
    return features
            
  # gets kerning info using the old 'kern' table
  # this has been largely superseded by the OpenType GPOS table
  getKerning = (kern, left, right) ->
    for table in kern.tables
      switch table.version
        when 0
          continue unless table.coverage.horizontal
        when 1
          continue if table.coverage.vertical
        else
          throw new Error "Unsupported kerning table version #{table.version}"
          
      switch table.format
        when 0
          for pair in table.subtable.pairs
            if pair.left is left and pair.right is right
              return pair.value
              
        else
          throw new Error "Unsupported kerning sub-table format #{table.format}"
          
    return 0
    
  widthOfGlyph: (glyph) ->
    if glyph < @hmtx.metrics.length
      return @hmtx.metrics[glyph].advanceWidth * @scale
      
    return @hmtx.metrics[@hmtx.metrics.length - 1].advanceWidth * @scale
    
  advancesForGlyphs: (glyphs, userFeatures = []) ->
    x = 0
    advances = []
    for glyph in glyphs
      advances.push @widthOfGlyph glyph.id
      
    return advances if userFeatures.length is 0
    
    if @GPOS?
      @_GPOSProcessor ?= new GPOSProcessor(this, @GPOS)
      @_GPOSProcessor.applyFeatures(userFeatures, glyphs, advances)
      
      return advances if 'kern' of @_GPOSProcessor.features
      
    if @kern? and 'kern' in userFeatures
      for glyph, glyphIndex in glyphs
        break if glyphIndex + 1 >= glyphs.length
        
        left = glyphs[glyphIndex]
        right = glyphs[glyphIndex + 1]
        advances[glyphIndex] += getKerning(@kern, left, right) * @scale
        
    return advances
    
  getGlyph: (glyph) ->
    
  boundingBoxForGlyph: (glyph) ->
    
  ligatureCaretsForGlyph: (glyph) ->
    
module.exports = TTFFont