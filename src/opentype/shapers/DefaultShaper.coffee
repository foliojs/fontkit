Script = require '../../layout/Script'
unicode = require 'unicode-properties'

class DefaultShaper
  @getGlobalFeatures: (script, isVertical = false) ->
    features = ['ccmp', 'locl', 'rlig', 'mark', 'mkmk']
    
    switch Script.direction(script)
      when 'ltr'
        features.push 'ltra', 'ltrm'
        
      when 'rtl'
        features.push 'rtla', 'rtlm'
      
    if isVertical
      features.push 'vert'
    else
      features.push 'calt', 'clig', 'liga', 'rclt', 'curs', 'kern'
      
    return features
    
  @assignFeatures: (glyphs, script) ->
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
        
    return ['frac', 'numr', 'dnom']
    
module.exports = DefaultShaper
