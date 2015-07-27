fontkit = require '../'
assert = require 'assert'

describe.only 'shaping', ->
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
