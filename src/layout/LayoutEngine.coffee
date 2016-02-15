KernProcessor = require './KernProcessor'
UnicodeLayoutEngine = require './UnicodeLayoutEngine'
GlyphRun = require './GlyphRun'
Script = require './Script'
unicode = require 'unicode-properties'
AATLayoutEngine = require '../aat/AATLayoutEngine'
OTLayoutEngine = require '../opentype/OTLayoutEngine'

class LayoutEngine
  constructor: (@font) ->
    # Choose an advanced layout engine. We try the AAT morx table first since more 
    # scripts are currently supported because the shaping logic is built into the font.
    @engine = if @font.morx
      new AATLayoutEngine @font
      
    else if @font.GSUB or @font.GPOS
      new OTLayoutEngine @font
        
  layout: (string, features = [], script, language) ->
    # Make the userFeatures parameter optional
    if typeof features is 'string'
      script = features
      language = script
      features = []
    
    # Map string to glyphs if needed
    if typeof string is 'string'
      # Attempt to detect the script from the string if not provided.
      script ?= Script.forString string
      glyphs = @font.glyphsForString string
    else
      # Attempt to detect the script from the glyph code points if not provided.
      unless script?
        codePoints = []
        for glyph in string
          codePoints.push glyph.codePoints...
        
        script = Script.forCodePoints codePoints
        
      glyphs = string
            
    # Return early if there are no glyphs
    if glyphs.length is 0
      return new GlyphRun glyphs, []
    
    # Setup the advanced layout engine
    @engine?.setup?(glyphs, features, script, language)
      
    # Substitute and position the glyphs
    glyphs = @substitute glyphs, features, script, language
    positions = @position glyphs, features, script, language
    
    # Let the layout engine clean up any state it might have
    @engine?.cleanup?()
    
    return new GlyphRun glyphs, positions
    
  substitute: (glyphs, features, script, language) ->
    # Call the advanced layout engine to make substitutions
    if @engine?.substitute
      glyphs = @engine.substitute(glyphs, features, script, language)
      
    return glyphs
    
  class GlyphPosition
    constructor: (@xAdvance = 0, @yAdvance = 0, @xOffset = 0, @yOffset = 0) ->
      
  position: (glyphs, features, script, language) ->
    # Get initial glyph positions
    positions = []
    for glyph, i in glyphs
      positions.push new GlyphPosition glyph.advanceWidth
      
    # Call the advanced layout engine. Returns the features applied.
    positioned = @engine?.position?(glyphs, positions, features, script, language)
        
    # if there is no GPOS table, use unicode properties to position marks.
    unless positioned
      @unicodeLayoutEngine ?= new UnicodeLayoutEngine @font
      @unicodeLayoutEngine.positionGlyphs glyphs, positions
      
    # if kerning is not supported by GPOS, do kerning with the TrueType/AAT kern table
    if not positioned?.kern and @font.kern
      @kernProcessor ?= new KernProcessor @font
      @kernProcessor.process glyphs, positions
          
    return positions
    
  getAvailableFeatures: (script, language) ->
    features = []
    
    if @engine
      features.push @engine.getAvailableFeatures(script, language)...
    
    if @font.kern and 'kern' not in features
      features.push 'kern'
    
    return features
    
module.exports = LayoutEngine
