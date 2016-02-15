unicode = require 'unicode-properties'

COMMON_FEATURES = ['ccmp', 'locl', 'rlig', 'mark', 'mkmk']
FRACTIONAL_FEATURES = ['frac', 'numr', 'dnom']
HORIZONTAL_FEATURES = ['calt', 'clig', 'liga', 'rclt', 'curs', 'kern']
VERTICAL_FEATURES = ['vert']
DIRECTIONAL_FEATURES =
  ltr: ['ltra', 'ltrm']
  rtl: ['rtla', 'rtlm']

class DefaultShaper
  @plan: (plan, glyphs, features) ->
    # Plan the features we want to apply
    @planPreprocessing plan
    @planFeatures plan
    @planPostprocessing plan, features
    
    # Assign the global features to all the glyphs
    plan.assignGlobalFeatures glyphs
    
    # Assign local features to glyphs
    @assignFeatures plan, glyphs
    
  @planPreprocessing: (plan) ->
    plan.add
      global: DIRECTIONAL_FEATURES[plan.direction]
      local: FRACTIONAL_FEATURES
        
  @planFeatures: (plan) ->
    # Do nothing by default. Let subclasses override this.
  
  @planPostprocessing: (plan, userFeatures) ->
    plan.add [COMMON_FEATURES..., HORIZONTAL_FEATURES..., userFeatures...]
      
  @assignFeatures: (plan, glyphs) ->
    # Enable contextual fractions
    i = 0
    while i < glyphs.length
      glyph = glyphs[i]
      if glyph.codePoints[0] is 0x2044 # fraction slash
        start = i - 1
        end = i + 1
        
        # Apply numerator
        while start >= 0 and unicode.isDigit(glyphs[start].codePoints[0])
          glyphs[start].features.numr = true
          glyphs[start].features.frac = true
          start--
          
        # Apply denominator
        while end < glyphs.length and unicode.isDigit(glyphs[end].codePoints[0])
          glyphs[end].features.dnom = true
          glyphs[end].features.frac = true
          end++
          
        # Apply fraction slash
        glyph.features.frac = true
        i = end - 1
        
      else
        i++
        
    return
    
module.exports = DefaultShaper
