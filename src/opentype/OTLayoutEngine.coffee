ShapingPlan = require './ShapingPlan'
Shapers = require './shapers'
GlyphInfo = require './GlyphInfo'
GSUBProcessor = require './GSUBProcessor'
GPOSProcessor = require './GPOSProcessor'

class OTLayoutEngine
  constructor: (@font) ->
    if @font.GSUB
      @GSUBProcessor = new GSUBProcessor(@font, @font.GSUB)
      
    if @font.GPOS
      @GPOSProcessor = new GPOSProcessor(@font, @font.GPOS)
      
    @glyphInfos = null
    @plan = null
    
  setup: (glyphs, features, script, language) ->    
    # Map glyphs to GlyphInfo objects so data can be passed between
    # GSUB and GPOS without mutating the real (shared) Glyph objects.
    @glyphInfos = for glyph, i in glyphs
      new GlyphInfo glyph.id, [glyph.codePoints...]
      
    # Choose a shaper based on the script, and setup a shaping plan.
    # This determines which features to apply to which glyphs.
    shaper = Shapers.choose script
    @plan = new ShapingPlan @font, script, language
    shaper.plan(@plan, @glyphInfos, features)
    
  substitute: (glyphs) ->
    if @GSUBProcessor
      @plan.process @GSUBProcessor, @glyphInfos
      
      # Map glyph infos back to normal Glyph objects
      glyphs = for glyphInfo in @glyphInfos
        @font.getGlyph glyphInfo.id, glyphInfo.codePoints
        
    return glyphs
    
  position: (glyphs, positions) ->
    if @GPOSProcessor
      @plan.process @GPOSProcessor, @glyphInfos, positions
            
    # Reverse the glyphs and positions if the script is right-to-left
    if @plan.direction is 'rtl'
      glyphs.reverse()
      positions.reverse()
    
    return @GPOSProcessor?.features
    
  cleanup: ->
    @glyphInfos = null
    @plan = null
    
  getAvailableFeatures: (script, language) ->
    features = []
  
    if @GSUBProcessor
      @GSUBProcessor.selectScript script, language
      features.push Object.keys(@GSUBProcessor.features)...
  
    if @GPOSProcessor
      @GPOSProcessor.selectScript script, language
      features.push Object.keys(@GPOSProcessor.features)...
      
    return features

module.exports = OTLayoutEngine
