unicode = require 'unicode-properties'

# This class is used when GPOS does not define 'mark' or 'mkmk' features
# for positioning marks relative to base glyphs. It uses the unicode
# combining class property to position marks.
# 
# Based on code from Harfbuzz, thanks!
# https://github.com/behdad/harfbuzz/blob/master/src/hb-ot-shape-fallback.cc
class UnicodeLayoutEngine
  constructor: (@font) ->
    
  positionGlyphs: (glyphs, positions) ->
    # find each base + mark cluster, and position the marks relative to the base
    clusterStart = 0
    clusterEnd = 0
    for glyph, index in glyphs        
      if glyph.isMark # TODO: handle ligatures
        clusterEnd = index
      else
        if clusterStart isnt clusterEnd
          @positionCluster glyphs, positions, clusterStart, clusterEnd
          
        clusterStart = clusterEnd = index
        
    if clusterStart isnt clusterEnd
      @positionCluster glyphs, positions, clusterStart, clusterEnd
  
    return positions
    
  positionCluster: (glyphs, positions, clusterStart, clusterEnd) ->
    base = glyphs[clusterStart]
    baseBox = base.cbox.copy()
    
    # adjust bounding box for ligature glyphs
    if base.codePoints.length > 1
      # LTR. TODO: RTL support.
      baseBox.minX += ((base.codePoints.length - 1) * baseBox.width) / base.codePoints.length
    
    xOffset = -positions[clusterStart].xAdvance
    yOffset = 0
    yGap = @font.unitsPerEm / 16
    
    # position each of the mark glyphs relative to the base glyph
    for index in [clusterStart + 1..clusterEnd] by 1
      mark = glyphs[index]
      markBox = mark.cbox
      position = positions[index]
              
      combiningClass = @getCombiningClass mark.codePoints[0]
      
      if combiningClass isnt 'Not_Reordered'
        position.xOffset = position.yOffset = 0
        
        # x positioning
        switch combiningClass
          when 'Double_Above', 'Double_Below'
            # LTR. TODO: RTL support.
            position.xOffset += baseBox.minX - markBox.width / 2 - markBox.minX
                    
          when 'Attached_Below_Left', 'Below_Left', 'Above_Left'
            # left align
            position.xOffset += baseBox.minX - markBox.minX
          
          when 'Attached_Above_Right', 'Below_Right', 'Above_Right'
            # right align
            position.xOffset += baseBox.maxX - markBox.width - markBox.minX
            
          else # Attached_Below, Attached_Above, Below, Above, other
            # center align
            position.xOffset += baseBox.minX + (baseBox.width - markBox.width) / 2 - markBox.minX
          
        # y positioning
        switch combiningClass
          when 'Double_Below', 'Below_Left', 'Below', 'Below_Right', 'Attached_Below_Left', 'Attached_Below'
            # add a small gap between the glyphs if they are not attached
            if combiningClass not in ['Attached_Below_Left', 'Attached_Below']
              baseBox.minY += yGap
              
            position.yOffset = -baseBox.minY - markBox.maxY
            baseBox.minY += markBox.height
                        
          when 'Double_Above', 'Above_Left', 'Above', 'Above_Right', 'Attached_Above', 'Attached_Above_Right'
            # add a small gap between the glyphs if they are not attached
            if combiningClass not in ['Attached_Above', 'Attached_Above_Right']
              baseBox.maxY += yGap

            position.yOffset = baseBox.maxY - markBox.minY              
            baseBox.maxY += markBox.height
            
        position.xAdvance = position.yAdvance = 0
        position.xOffset += xOffset
        position.yOffset += yOffset
      
      else
        xOffset -= position.xAdvance
        yOffset -= position.yAdvance
        
    return
    
  getCombiningClass: (codePoint) ->
    combiningClass = unicode.getCombiningClass codePoint
    
    # Thai / Lao need some per-character work
    if (codePoint & ~0xff) is 0x0e00
      if combiningClass is 'Not_Reordered'
        switch codePoint
          when 0x0e31, 0x0e34, 0x0e35, 0x0e36, 0x0e37, 0x0e47, 0x0e4c, 0x0e3d, 0x0e4e
            return 'Above_Right'
            
          when 0x0eb1, 0x0eb4, 0x0eb5, 0x0eb6, 0x0eb7, 0x0ebb, 0x0ecc, 0x0ecd
            return 'Above'
            
          when 0x0ebc
            return 'Below'
            
      else if codePoint is 0x0e3a # virama
        return 'Below_Right'
    
    switch combiningClass
      # Hebrew
      
      # sheva, hataf segol, hataf patah, hataf qamats, hiriq, tsere, segol, patah, qamats, qubuts, meteg
      when 'CCC10', 'CCC11', 'CCC12', 'CCC13', 'CCC14', 'CCC15', 'CCC16', 'CCC17', 'CCC18', 'CCC20', 'CCC22'
        return 'Below'
        
      when 'CCC23' # rafe
        return 'Attached_Above'
        
      when 'CCC24' # shin dot
        return 'Above_Right'
        
      when 'CCC25', 'CCC19' # sin dot, holam
        return 'Above_Left'
        
      when 'CCC26' # point varika
        return 'Above'
        
      when 'CCC21' # dagesh
        break
        
      # Arabic and Syriac
        
      # fathatan, dammatan, fatha, damma, shadda, sukun, superscript alef, superscript alaph
      when 'CCC27', 'CCC28', 'CCC30', 'CCC31', 'CCC33', 'CCC34', 'CCC35', 'CCC36'
        return 'Above'
        
      when 'CCC29', 'CCC32' # kasratan, kasra
        return 'Below'
        
      # Thai
        
      when 'CCC103' # sara u / sara uu
        return 'Below_Right'
        
      when 'CCC107' # mai
        return 'Above_Right'
        
      # Lao
      
      when 'CCC118' # sign u / sign uu
        return 'Below'
        
      when 'CCC122' # mai
        return 'Above'
        
      # Tibetan
        
      when 'CCC129', 'CCC132' # sign aa, sign u
        return 'Below'
        
      when 'CCC130' # sign i
        return 'Above'
        
    return combiningClass
    
module.exports = UnicodeLayoutEngine
