r = require 'restructure'
Directory = require './tables/directory'
tables = require './tables'
CmapProcessor = require './CmapProcessor'
LayoutEngine = require './layout/LayoutEngine'
TTFGlyph = require './glyph/TTFGlyph'
CFFGlyph = require './glyph/CFFGlyph'
SBIXGlyph = require './glyph/SBIXGlyph'
COLRGlyph = require './glyph/COLRGlyph'
GlyphVariationProcessor = require './glyph/GlyphVariationProcessor'
TTFSubset = require './subset/TTFSubset'
CFFSubset = require './subset/CFFSubset'
BBox = require './glyph/BBox'

class TTFFont
  get = require('./get')(this)
  
  @probe: (buffer) ->
    return buffer.toString('ascii', 0, 4) in ['true', 'OTTO', String.fromCharCode(0, 1, 0, 0)]
  
  constructor: (@stream, variationCoords = null) ->    
    @_tables = {}
    @_glyphs = {}
    @_decodeDirectory()
    
    # define properties for each table to lazily parse
    for tag, table of @directory.tables when tables[tag]
      Object.defineProperty this, tag,
        get: getTable.bind(this, table)
        
    if variationCoords
      @_variationProcessor = new GlyphVariationProcessor this, variationCoords
        
  getTable = (table) ->
    unless table.tag of @_tables
      pos = @stream.pos
      @stream.pos = table.offset
      @_tables[table.tag] = @_decodeTable table
      @stream.pos = pos
      
    return @_tables[table.tag]
    
  _getTableStream: (tag) ->
    table = @directory.tables[tag]
    if table
      @stream.pos = table.offset
      return @stream
      
    return null
    
  _decodeDirectory: ->
    @_directoryPos = @stream.pos
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
    
  get 'ascent', ->
    @hhea.ascent
    
  get 'descent', ->
    @hhea.descent
    
  get 'lineGap', ->
    @hhea.lineGap
    
  get 'underlinePosition', ->
    @post.underlinePosition
    
  get 'underlineThickness', ->
    @post.underlineThickness
    
  get 'italicAngle', ->
    @post.italicAngle
    
  get 'capHeight', ->
    this['OS/2']?.capHeight or @ascent
    
  get 'xHeight', ->
    this['OS/2']?.xHeight or 0
    
  get 'numGlyphs', ->
    @maxp.numGlyphs
    
  get 'unitsPerEm', ->
    @head.unitsPerEm
    
  get 'bbox', ->
    @_bbox ?= Object.freeze new BBox @head.xMin, @head.yMin, @head.xMax, @head.yMax
    
  get 'characterSet', ->
    @_cmapProcessor ?= new CmapProcessor @cmap
    return @_cmapProcessor.getCharacterSet()
        
  hasGlyphForCodePoint: (codePoint) ->
    @_cmapProcessor ?= new CmapProcessor @cmap
    return !!@_cmapProcessor.lookup codePoint
            
  glyphForCodePoint: (codePoint) ->
    @_cmapProcessor ?= new CmapProcessor @cmap
    return @getGlyph @_cmapProcessor.lookup(codePoint), [codePoint]
    
  glyphsForString: (string) ->
    # Map character codes to glyph ids
    glyphs = []    
    len = string.length
    idx = 0
    while idx < len
      code = string.charCodeAt idx++
      if 0xd800 <= code <= 0xdbff and idx < len
        next = string.charCodeAt idx
        if 0xdc00 <= next <= 0xdfff
          idx++
          code = ((code & 0x3FF) << 10) + (next & 0x3FF) + 0x10000
    
      glyphs.push @glyphForCodePoint code
      
    return glyphs
    
  layout: (string, userFeatures, script, language) ->
    @_layoutEngine ?= new LayoutEngine this
    return @_layoutEngine.layout string, userFeatures, script, language
    
  get 'availableFeatures', ->
    @_layoutEngine ?= new LayoutEngine this
    return @_layoutEngine.getAvailableFeatures()
            
  widthOfString: (string, features, script, language) ->
    @_layoutEngine ?= new LayoutEngine this
    return @_layoutEngine.layout(string, features, script, language).advanceWidth
    
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
    
  # Returns an object describing the available variation axes
  # that this font supports. Keys are setting tags, and values
  # contain the axis name, range, and default value.
  get 'variationAxes', ->
    res = {}
    return res unless @fvar
    
    for axis in @fvar.axis
      res[axis.axisTag] = 
        name: axis.name
        min: axis.minValue
        default: axis.defaultValue
        max: axis.maxValue
        
    return res
    
  # Returns an object describing the named variation instances
  # that the font designer has specified. Keys are variation names
  # and values are the variation settings for this instance.
  get 'namedVariations', ->
    res = {}
    return res unless @fvar
    
    for instance in @fvar.instance
      settings = {}
      for axis, i in @fvar.axis
        settings[axis.axisTag] = instance.coord[i]
      
      res[instance.name] = settings
        
    return res
    
  # Returns a new font with the given variation settings applied.
  # Settings can either be an instance name, or an object containing
  # variation tags as specified by the `variationAxes` property.
  getVariation: (settings) ->
    unless @directory.tables.fvar and @directory.tables.gvar and @directory.tables.glyf
      throw new Error 'Variations require a font with the fvar, gvar, and glyf tables.'
      
    if typeof settings is 'string'
      settings = @namedVariations[settings]
    
    if typeof settings isnt 'object'
      throw new Error 'Variation settings must be either a variation name or settings object.'  
    
    # normalize the coordinates
    coords = for axis, i in @fvar.axis
      if axis.axisTag of settings
        Math.max axis.minValue, Math.min axis.maxValue, settings[axis.axisTag]
      else
        axis.defaultValue
        
    stream = new r.DecodeStream @stream.buffer
    stream.pos = @_directoryPos
    
    font = new TTFFont stream, coords
    font._tables = @_tables
    
    return font
    
  # Standardized format plugin API
  getFont: (name) ->
    return @getVariation name
    
module.exports = TTFFont
