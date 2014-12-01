r = require 'restructure'
Directory = require './tables/directory'
tables = require './tables'
CmapProcessor = require './CmapProcessor'
GSUBProcessor = require './opentype/GSUBProcessor'
GPOSProcessor = require './opentype/GPOSProcessor'
AATFeatureMap = require './aat/AATFeatureMap'
AATMorxProcessor = require './aat/AATMorxProcessor'
KernProcessor = require './KernProcessor'
TTFGlyph = require './glyph/TTFGlyph'
CFFGlyph = require './glyph/CFFGlyph'
SBIXGlyph = require './glyph/SBIXGlyph'
COLRGlyph = require './glyph/COLRGlyph'
TTFSubset = require './subset/TTFSubset'
CFFSubset = require './subset/CFFSubset'

class TTFFont
  constructor: (@stream) ->
    @_glyphs = {}
    @_decodeDirectory()
    
    # define properties for each table to lazily parse
    for tag, table of @directory.tables when tables[tag]
      Object.defineProperty this, tag,
        get: getTable.bind(this, table)
        
    return
    
  get = (key, fn) =>
    Object.defineProperty @prototype, key,
      get: fn
      enumerable: true
    
  getTable = (table) ->
    key = '_' + table.tag
    unless key of this
      pos = @stream.pos
      @stream.pos = table.offset
      this[key] = @_decodeTable table
      @stream.pos = pos
      
    return this[key]
    
  _getTableStream: (tag) ->
    table = @directory.tables[tag]
    if table
      @stream.pos = table.offset
      return @stream
      
    return null
    
  _decodeDirectory: ->
    @directory = Directory.decode(@stream, _startOffset: 0)
    
  _decodeTable: (table) ->
    return tables[table.tag].decode(@stream, this, table.length)
        
  get 'postscriptName', ->
    name = @name.records.postscriptName
    lang = Object.keys(name)[0]
    return name[lang]
    
  get 'fullName', ->
    @name.records.fullName?.English
    
  get 'familyName', ->
    @name.records.fontFamily?.English
    
  get 'subfamilyName', ->
    @name.records.fontSubfamily?.English
    
  get 'copyright', ->
    @name.records.copyright?.English
    
  get 'version', ->
    @name.records.version?.English
    
  get 'scale', ->
    return 1000 / @head.unitsPerEm
    
  get 'ascent', ->
    return @hhea.ascent * @scale
    
  get 'descent', ->
    return @hhea.descent * @scale
    
  get 'lineGap', ->
    return @hhea.lineGap * @scale
    
  get 'underlinePosition', ->
    return @post.underlinePosition * @scale
    
  get 'underlineThickness', ->
    return @post.underlineThickness * @scale
    
  get 'italicAngle', ->
    return @post.italicAngle
    
  get 'capHeight', ->
    return this['OS/2']?.capHeight * @scale or @ascent
    
  get 'xHeight', ->
    return this['OS/2']?.xHeight * @scale or 0
    
  get 'numGlyphs', ->
    return @maxp.numGlyphs
    
  get 'unitsPerEm', ->
    return @head.unitsPerEm
    
  get 'bbox', ->
    return [@head.xMin * @scale, @head.yMin * @scale, @head.xMax * @scale, @head.yMax * @scale]
    
  get 'characterSet', ->
    @_cmapProcessor ?= new CmapProcessor @cmap
    return @_cmapProcessor.getCharacterSet()
        
  hasGlyphForCodePoint: (codePoint) ->
    @_cmapProcessor ?= new CmapProcessor @cmap
    return !!@_cmapProcessor.lookup codePoint
            
  glyphForCodePoint: (codePoint) ->
    @_cmapProcessor ?= new CmapProcessor @cmap
    return @getGlyph @_cmapProcessor.lookup(codePoint), [codePoint]
        
  codePointAt = (str, idx = 0) ->
    code = str.charCodeAt(idx)
    next = str.charCodeAt(idx + 1)
    
    # If a surrogate pair
    if 0xd800 <= code <= 0xdbff and 0xdc00 <= next <= 0xdfff
      return ((code - 0xd800) * 0x400) + (next - 0xdc00) + 0x10000
      
    return code
                
  glyphsForString: (str, userFeatures) ->
    # Map character codes to glyph ids
    glyphs = []
    for i in [0...str.length]
      # check for already processed low surrogates
      continue if 0xdc00 <= str.charCodeAt(i) <= 0xdfff
      
      # get the glyph
      glyphs.push @glyphForCodePoint codePointAt(str, i)
      
    return glyphs if userFeatures?.length is 0
    userFeatures ?= ['ccmp', 'liga', 'rlig', 'clig', 'calt']
          
    # apply glyph substitutions
    # first, try the OpenType GSUB table
    # TODO: OT feature defaults for GSUB. AAT has defaults for each font built in
    if userFeatures.length > 0 and @GSUB
      @_GSUBProcessor ?= new GSUBProcessor(this, @GSUB)
      @_GSUBProcessor.applyFeatures(userFeatures, glyphs)
      
    # if not found, try AAT morx table
    else if @morx
      @_morxProcessor ?= new AATMorxProcessor(this)
      @_morxProcessor.process(glyphs, AATFeatureMap.mapOTToAAT(userFeatures))
    
    return glyphs
    
  get 'availableFeatures', ->
    features = []
    t = @directory.tables
    
    if t.GSUB?
      @_GSUBProcessor ?= new GSUBProcessor(this, @GSUB)
      features.push Object.keys(@_GSUBProcessor.features)...
    
    if t.GPOS?
      @_GPOSProcessor ?= new GPOSProcessor(this, @GPOS)
      features.push Object.keys(@_GPOSProcessor.features)...
      
    if t.morx?
      @_morxProcessor ?= new AATMorxProcessor(this)
      aatFeatures = AATFeatureMap.mapAATToOT @_morxProcessor.getSupportedFeatures()
      features.push aatFeatures...
      
    if t.kern? and (not t.GPOS or 'kern' not of @GPOS.features)
      features.push 'kern'
    
    return features
    
  widthOfGlyph: (glyph) ->
    if glyph < @hmtx.metrics.length
      return @hmtx.metrics[glyph].advanceWidth * @scale
      
    return @hmtx.metrics[@hmtx.metrics.length - 1].advanceWidth * @scale
    
  advancesForGlyphs: (glyphs, userFeatures) ->
    x = 0
    advances = []
    for glyph in glyphs
      advances.push @widthOfGlyph glyph.id
      
    return advances if userFeatures?.length is 0
    userFeatures ?= ['kern'] # TODO 'mark', 'mkmk'
    
    if @GPOS?
      @_GPOSProcessor ?= new GPOSProcessor(this, @GPOS)
      @_GPOSProcessor.applyFeatures(userFeatures, glyphs, advances)
      
      return advances if 'kern' of @_GPOSProcessor.features
      
    if 'kern' in userFeatures and @kern?
      @_kernProcessor ?= new KernProcessor this
      @_kernProcessor.process glyphs, advances
        
    return advances
    
  widthOfString: (string, features) ->
    glyphs = @glyphsForString '' + string, features
    advances = @advancesForGlyphs glyphs, features
    
    width = 0
    for advance in advances
      width += advance
    
    return width
    
  _getBaseGlyph: (glyph, characters = []) ->
    unless @_glyphs[glyph]
      if @directory.tables.glyf?
        @_glyphs[glyph] = new TTFGlyph glyph, characters, this
      
      else if @directory.tables['CFF ']?
        @_glyphs[glyph] = new CFFGlyph glyph, characters, this
    
    return @_glyphs[glyph] or null
    
  getGlyph: (glyph, characters = []) ->
    unless @_glyphs[glyph]
      if @directory.tables.sbix?
        @_glyphs[glyph] = new SBIXGlyph glyph, characters, this
        
      else if @directory.tables.COLR? and @directory.tables.CPAL?
        @_glyphs[glyph] = new COLRGlyph glyph, characters, this
        
      else
        @_getBaseGlyph glyph, characters
    
    return @_glyphs[glyph] or null
    
  createSubset: ->
    if @directory.tables['CFF ']?
      return new CFFSubset this
      
    return new TTFSubset this
        
module.exports = TTFFont
