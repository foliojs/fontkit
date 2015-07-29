DefaultShaper = require './DefaultShaper'
GlyphInfo = require '../GlyphInfo'

#
# This is a shaper for the Hangul script, used by the Korean language.
# It does the following:
#   - decompose if unsupported by the font:
#     <LV>   -> <L,V>
#     <LVT>  -> <L,V,T>
#     <LV,T> -> <L,V,T>
#
#   - compose if supported by the font:
#     <L,V>   -> <LV>
#     <L,V,T> -> <LVT>
#     <LV,T>  -> <LVT>
#
#   - reorder tone marks (S is any valid syllable):
#     <S, M> -> <M, S>
#
#   - apply ljmo, vjmo, and tjmo OpenType features to decomposed Jamo sequences.
#
# This logic is based on the following documents:
#   - http://www.microsoft.com/typography/OpenTypeDev/hangul/intro.htm
#   - http://ktug.org/~nomos/harfbuzz-hangul/hangulshaper.pdf
#
class HangulShaper extends DefaultShaper
  HANGUL_BASE  = 0xac00
  HANGUL_END   = 0xd7a4
  HANGUL_COUNT = HANGUL_END - HANGUL_BASE + 1
  L_BASE  = 0x1100 # lead
  V_BASE  = 0x1161 # vowel
  T_BASE  = 0x11a7 # trail
  L_COUNT = 19
  V_COUNT = 21
  T_COUNT = 28
  L_END   = L_BASE + L_COUNT - 1
  V_END   = V_BASE + V_COUNT - 1
  T_END   = T_BASE + T_COUNT - 1
  DOTTED_CIRCLE = 0x25cc
    
  isL = (code) -> 0x1100 <= code <= 0x115f or 0xa960 <= code <= 0xa97c
  isV = (code) -> 0x1160 <= code <= 0x11a7 or 0xd7b0 <= code <= 0xd7c6
  isT = (code) -> 0x11a8 <= code <= 0x11ff or 0xd7cb <= code <= 0xd7fb
  isTone = (code) -> 0x302e <= code <= 0x302f
  isLVT = (code) -> HANGUL_BASE <= code <= HANGUL_END
  isLV = (c) ->
    c -= HANGUL_BASE
    return c < HANGUL_COUNT and c % T_COUNT is 0
      
  isCombiningL = (code) -> L_BASE <= code <= L_END
  isCombiningV = (code) -> V_BASE <= code <= V_END
  isCombiningT = (code) -> T_BASE + 1 <= code <= T_END  
  
  # Character categories
  X   = 0 # Other character
  L   = 1 # Leading consonant
  V   = 2 # Medial vowel
  T   = 3 # Trailing consonant
  LV  = 4 # Composed <LV> syllable
  LVT = 5 # Composed <LVT> syllable
  M   = 6 # Tone mark
  
  # This function classifies a character using the above categories.
  getType = (code) ->
    return L   if isL code
    return V   if isV code
    return T   if isT code
    return LV  if isLV code
    return LVT if isLVT code
    return M   if isTone code
    return X
    
  # State machine actions
  NO_ACTION = 0
  DECOMPOSE = 1
  COMPOSE   = 2
  TONE_MARK = 4
  INVALID   = 5
  
  # Build a state machine that accepts valid syllables, and applies actions along the way.
  # The logic this is implementing is documented at the top of the file.
  STATE_TABLE = [
    #       X                 L                 V                T                  LV                LVT               M
    # State 0: start state
    [ [ NO_ACTION, 0 ], [ NO_ACTION, 1 ], [ NO_ACTION, 0 ], [ NO_ACTION, 0 ], [ DECOMPOSE, 2 ], [ DECOMPOSE, 3 ], [  INVALID, 0  ] ]
    
    # State 1: <L>
    [ [ NO_ACTION, 0 ], [ NO_ACTION, 1 ], [  COMPOSE, 2  ], [ NO_ACTION, 0 ], [ DECOMPOSE, 2 ], [ DECOMPOSE, 3 ], [  INVALID, 0  ] ]
    
    # State 2: <L,V> or <LV>
    [ [ NO_ACTION, 0 ], [ NO_ACTION, 1 ], [ NO_ACTION, 0 ], [  COMPOSE, 3  ], [ DECOMPOSE, 2 ], [ DECOMPOSE, 3 ], [ TONE_MARK, 0 ] ]
    
    # State 3: <L,V,T> or <LVT>
    [ [ NO_ACTION, 0 ], [ NO_ACTION, 1 ], [ NO_ACTION, 0 ], [ NO_ACTION, 0 ], [ DECOMPOSE, 2 ], [ DECOMPOSE, 3 ], [ TONE_MARK, 0 ] ]
  ]
      
  @assignFeatures: (glyphs, script, font) ->
    state = 0
    i = 0
    while i < glyphs.length
      glyph = glyphs[i]
      code = glyph.codePoints[0]
      type = getType code
      
      [ action, state ] = STATE_TABLE[state][type]
      
      switch action
        when DECOMPOSE
          # Decompose the composed syllable if it is not supported by the font.
          unless font.hasGlyphForCodePoint code
            i = decompose glyphs, i, font
      
        when COMPOSE
          # Found a decomposed syllable. Try to compose if supported by the font.
          i = compose glyphs, i, font
          
        when TONE_MARK
          # Got a valid syllable, followed by a tone mark. Move the tone mark to the beginning of the syllable.
          reorderToneMark glyphs, i, font
          
        when INVALID
          # Tone mark has no valid syllable to attach to, so insert a dotted circle
          i = insertDottedCircle glyphs, i, font
                
      i++

    return ['ljmo', 'vjmo', 'tjmo']
    
  getGlyph = (font, code, features) ->
    return new GlyphInfo font.glyphForCodePoint(code).id, [code], Object.keys features
    
  decompose = (glyphs, i, font) ->
    glyph = glyphs[i]
    code = glyph.codePoints[0]
        
    s = code - HANGUL_BASE
    t = T_BASE + s % T_COUNT
    s = s / T_COUNT | 0
    l = L_BASE + s / V_COUNT | 0
    v = V_BASE + s % V_COUNT
    
    # Don't decompose if all of the components are not available
    return i unless font.hasGlyphForCodePoint(l) and 
                 font.hasGlyphForCodePoint(v) and
                 (t is T_BASE or font.hasGlyphForCodePoint(t))
    
    # Replace the current glyph with decomposed L, V, and T glyphs,
    # and apply the proper OpenType features to each component.
    ljmo = getGlyph font, l, glyph.features
    ljmo.features.ljmo = true
  
    vjmo = getGlyph font, v, glyph.features
    vjmo.features.vjmo = true
  
    insert = [ ljmo, vjmo ]
  
    if t > T_BASE
      tjmo = getGlyph font, t, glyph.features
      tjmo.features.tjmo = true
      insert.push tjmo

    glyphs.splice i, 1, insert...    
    return i + insert.length - 1
    
  compose = (glyphs, i, font) ->
    glyph = glyphs[i]
    code = glyphs[i].codePoints[0]
    type = getType code
    
    prev = glyphs[i - 1].codePoints[0]
    prevType = getType prev
    
    # Figure out what type of syllable we're dealing with
    if prevType is LV and type is T
      # <LV,T>
      lv = prev
      tjmo = glyph
    else
      if type is V
        # <L,V>
        ljmo = glyphs[i - 1]
        vjmo = glyph
      else
        # <L,V,T>
        ljmo = glyphs[i - 2]
        vjmo = glyphs[i - 1]
        tjmo = glyph

      l = ljmo.codePoints[0]
      v = vjmo.codePoints[0]

      # Make sure L and V are combining characters
      if isCombiningL(l) and isCombiningV(v)
        lv = HANGUL_BASE + ((l - L_BASE) * V_COUNT + (v - V_BASE)) * T_COUNT
      
    t = tjmo?.codePoints[0] or T_BASE
    if lv? and (t is T_BASE or isCombiningT(t))
      s = lv + (t - T_BASE)
    
      # Replace with a composed glyph if supported by the font,
      # otherwise apply the proper OpenType features to each component.
      if font.hasGlyphForCodePoint s
        del = if prevType is V then 3 else 2
        glyphs.splice i - del + 1, del, getGlyph font, s, glyph.features
        return i - del + 1
        
    # Didn't compose (either a non-combining component or unsupported by font).
    ljmo?.features.ljmo = true
    vjmo?.features.vjmo = true
    tjmo?.features.tjmo = true
        
    if prevType is LV
      # Sequence was originally <L,V>, which got combined earlier.
      # Either the T was non-combining, or the LVT glyph wasn't supported.
      # Decompose the glyph again and apply OT features.
      decompose glyphs, i - 1, font
      return i + 1
      
    return i
    
  reorderToneMark = (glyphs, i, font) ->
    glyph = glyphs[i]
    code = glyphs[i].codePoints[0]
    
    # Move tone mark to the beginning of the previous syllable, unless it is zero width
    return if font.glyphForCodePoint(code).advanceWidth is 0
    
    prev = glyphs[i - 1].codePoints[0]
    len = switch getType prev
      when LV, LVT then 1
      when V then 2
      when T then 3
      
    glyphs.splice i, 1
    glyphs.splice i - len, 0, glyph
    
  insertDottedCircle = (glyphs, i, font) ->
    glyph = glyphs[i]
    code = glyphs[i].codePoints[0]
    
    if font.hasGlyphForCodePoint DOTTED_CIRCLE
      dottedCircle = getGlyph font, DOTTED_CIRCLE, glyph.features
      
      # If the tone mark is zero width, insert the dotted circle before, otherwise after
      idx = if font.glyphForCodePoint(code).advanceWidth is 0 then i else i + 1            
      glyphs.splice idx, 0, dottedCircle
      i++
      
    return i
    
module.exports = HangulShaper
