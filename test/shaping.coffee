fontkit = require '../'
assert = require 'assert'

describe 'shaping', ->
  test = (description, font, text, output) ->
    it description, ->
      f = fontkit.openSync __dirname + '/data/' + font
      {glyphs, positions} = f.layout text
      
      # Generate a compact string representation of the results
      # in the same format as Harfbuzz, for comparison.
      res = []
      for glyph, i in glyphs
        pos = positions[i]
        x = "#{glyph.id}"
        if pos.xOffset or pos.yOffset
          x += "@#{pos.xOffset},#{pos.yOffset}"
          
        x += "+#{pos.xAdvance}"
        res.push x
        
      assert.equal res.join('|'), output
      
  describe 'arabic shaper', ->
    test 'should shape Arabic text', 'NotoSans/NotoKufiArabic-Regular.ttf', 'سُلَّاِّمتی',
      '223+1974|143+801|39+1176|270@180,80+0|268@1060,50+0|51+1452|101@900,-600+0|15+1798'
      
    test 'should handle cursive attachment positioning', 'NotoSans/NotoNastaliqUrduDraft.ttf', 'ححححححب',
      '18@652,-180+0|226+1350|574@0,279+90|825@0,707+176|825@0,1058+176|825@0,1409+176|825@0,1760+176|509@0,2111+636'

    test 'should shape Mongolian text', 'NotoSans/NotoSansMongolian-Regular.ttf', 'ᠬᠦᠮᠦᠨ ᠪᠦᠷ ᠲᠥᠷᠥᠵᠦ ᠮᠡᠨᠳᠡᠯᠡᠬᠦ ᠡᠷᠬᠡ',
      '488+2417|193+582|945+1174|56+874|3+532|358+2507|32+1032|3+532|35+1372|942+1778|31+1145|943+1174|101+1085|' + 
      '342+1298|3+532|206+1008|64+582|946+582|957+1255|64+582|75+582|64+582|493+1438|3+532|62+1008|31+1145|396+1993'
    
    test 'should shape Syriac text', 'NotoSans/NotoSansSyriacEstrangela-Regular.ttf', 'ܚܐܪܐ ܘܒܪܒܪ ܓܘ ܐܝܩܪܐ ܘܙܕܩܐ.', 
      '218+545|11+1781|94+1362|26@35,0+1139|34+564|32+1250|3+532|9+1904|96+1088|93+1383|51+569|8+1904|' + 
      '3+532|33+1225|21+1470|3+532|96+1088|17+1496|96+1088|17+1496|32+1250|3+532|9+1904|95+1104|12+1781|39+1052'
    
    test 'should shape N\'Ko text', 'NotoSans/NotoSansNKo-Regular.ttf', 'ߞߊ߬ ߞߐߕߐ߮ ߞߎߘߊ ߘߏ߫ ߘߊߦߟߍ߬ ߸ ߏ߬',
      '52@10,-300+0|23+1128|3+532|64+985|3+532|52@150,-300+0|84+1268|139+1184|160+1067|76+543|119+1622|3+532|51@10,-300+0|90+1128' +
      '|119+1622|3+532|75+543|118+1622|88+1212|137+1114|3+532|54@170,0+0|93+1321|109+1155|94+1321|137+1114|3+532|52@-210,0+0|75+543|137+1114'
    
    test 'should shape Phags Pa text', 'NotoSans/NotoSansPhagsPa-Regular.ttf', 'ꡀꡁꡂꡃ ꡄꡅꡆꡇ ꡈꡉꡊꡋ ꡌꡍꡎꡏ',
      '100+1491|212+1462|217+1462|87+1386|3+532|161+1677|168+1427|148+1532|329+1122|3+532|112+1614' +
      '|153+1491|158+1073|107+1231|3+532|171+1686|178+1542|313+1542|115+1231'

  describe 'hangul shaper', ->
    font = fontkit.openSync __dirname + '/data/NotoSansCJK/NotoSansCJKkr-Regular.otf'
        
    it 'should use composed versions if supported by the font', ->
      {glyphs} = font.layout '\uD734\uAC00\u0020\uAC00\u002D\u002D\u0020\u0028\uC624\u002D\u002D\u0029'
      assert.deepEqual glyphs.map((g) -> g.id), [ 58626, 47566, 62995, 47566, 14, 14, 1, 9, 54258, 14, 14, 10 ]
    
    it 'should compose decomposed syllables if supported', ->
      {glyphs} = font.layout '\u1112\u1172\u1100\u1161\u0020\u1100\u1161\u002D\u002D\u0020\u0028\u110B\u1169\u002D\u002D\u0029'
      assert.deepEqual glyphs.map((g) -> g.id), [ 58626, 47566, 62995, 47566, 14, 14, 1, 9, 54258, 14, 14, 10 ]
              
    it 'should use OT features for non-combining <L,V,T>', ->
      {glyphs} = font.layout '\ua960\ud7b0\ud7cb'
      assert.deepEqual glyphs.map((g) -> g.id), [ 64003, 64479, 64822 ]
      
    it 'should decompose <LV,T> to <L,V,T> if <LVT> is not supported', ->
      # <L,V> combine at first, but the T is non-combining, so this
      # tests that the <LV> gets decomposed again in this case.
      {glyphs} = font.layout '\u1100\u1161\ud7cb'
      assert.deepEqual glyphs.map((g) -> g.id), [ 63657, 64408, 64685 ]
      
    it 'should reorder tone marks to the beginning of <L,V> syllables', ->
      {glyphs} = font.layout '\ua960\ud7b0\u302f'
      assert.deepEqual glyphs.map((g) -> g.id), [ 1436, 64378, 64574 ]
      
    it 'should reorder tone marks to the beginning of <L,V,T> syllables', ->
      {glyphs} = font.layout '\ua960\ud7b0\ud7cb\u302f'
      assert.deepEqual glyphs.map((g) -> g.id), [ 1436, 64003, 64479, 64822 ]
      
    it 'should reorder tone marks to the beginning of <LV> syllables', ->
      {glyphs} = font.layout '\uac00\u302f'
      assert.deepEqual glyphs.map((g) -> g.id), [ 1436, 47566 ]
      
    it 'should reorder tone marks to the beginning of <LVT> syllables', ->
      {glyphs} = font.layout '\uac01\u302f'
      assert.deepEqual glyphs.map((g) -> g.id), [ 1436, 47567 ]
      
    it 'should insert a dotted circle for invalid tone marks', ->
      {glyphs} = font.layout '\u1100\u302f\u1161'
      assert.deepEqual glyphs.map((g) -> g.id), [ 365, 1436, 1256, 462 ]
