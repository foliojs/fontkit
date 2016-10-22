import fontkit from '../src';
import assert from 'assert';

describe('shaping', function() {
  let test = (description, font, text, output) => {
    it(description, function() {
      let f = fontkit.openSync(__dirname + '/data/' + font);
      let {glyphs, positions} = f.layout(text);

      // Generate a compact string representation of the results
      // in the same format as Harfbuzz, for comparison.
      let res = [];
      for (let i = 0; i < glyphs.length; i++) {
        let glyph = glyphs[i];
        let pos = positions[i];
        let x = `${glyph.id}`;
        if (pos.xOffset || pos.yOffset) {
          x += `@${pos.xOffset},${pos.yOffset}`
        }

        x += `+${pos.xAdvance}`;
        res.push(x);
      }

      return assert.equal(res.join('|'), output);
    })
  };

  describe('arabic shaper', function() {
    test('should shape Arabic text', 'NotoSans/NotoKufiArabic-Regular.ttf', 'سُلَّاِّمتی',
      '223+1974|143+801|39+1176|270@180,80+0|268@1060,50+0|51+1452|101@900,-600+0|15+1798');

    test('should handle cursive attachment positioning', 'NotoSans/NotoNastaliqUrduDraft.ttf', 'ححححححب',
      '18@652,-180+0|226+1350|574@0,279+90|825@0,707+176|825@0,1058+176|825@0,1409+176|825@0,1760+176|509@0,2111+636');

    test('should shape Mongolian text', 'NotoSans/NotoSansMongolian-Regular.ttf', 'ᠬᠦᠮᠦᠨ ᠪᠦᠷ ᠲᠥᠷᠥᠵᠦ ᠮᠡᠨᠳᠡᠯᠡᠬᠦ ᠡᠷᠬᠡ',
      '488+2417|193+582|945+1174|56+874|3+532|358+2507|32+1032|3+532|35+1372|942+1778|31+1145|943+1174|101+1085|' +
      '342+1298|3+532|206+1008|64+582|946+582|957+1255|64+582|75+582|64+582|493+1438|3+532|62+1008|31+1145|396+1993');

    test('should shape Syriac text', 'NotoSans/NotoSansSyriacEstrangela-Regular.ttf', 'ܚܐܪܐ ܘܒܪܒܪ ܓܘ ܐܝܩܪܐ ܘܙܕܩܐ.',
      '218+545|11+1781|94+1362|26@35,0+1139|34+564|32+1250|3+532|9+1904|96+1088|93+1383|51+569|8+1904|' +
      '3+532|33+1225|21+1470|3+532|96+1088|17+1496|96+1088|17+1496|32+1250|3+532|9+1904|95+1104|12+1781|39+1052');

    test('should shape N\'Ko text', 'NotoSans/NotoSansNKo-Regular.ttf', 'ߞߊ߬ ߞߐߕߐ߮ ߞߎߘߊ ߘߏ߫ ߘߊߦߟߍ߬ ߸ ߏ߬',
      '52@10,-300+0|23+1128|3+532|64+985|3+532|52@150,-300+0|84+1268|139+1184|160+1067|76+543|119+1622|3+532|51@10,-300+0|90+1128' +
      '|119+1622|3+532|75+543|118+1622|88+1212|137+1114|3+532|54@170,0+0|93+1321|109+1155|94+1321|137+1114|3+532|52@-210,0+0|75+543|137+1114');

    test('should shape Phags Pa text', 'NotoSans/NotoSansPhagsPa-Regular.ttf', 'ꡀꡁꡂꡃ ꡄꡅꡆꡇ ꡈꡉꡊꡋ ꡌꡍꡎꡏ',
      '100+1491|212+1462|217+1462|87+1386|3+532|161+1677|168+1427|148+1532|329+1122|3+532|112+1614' +
      '|153+1491|158+1073|107+1231|3+532|171+1686|178+1542|313+1542|115+1231');
  });

  describe('hangul shaper', function() {
    let font = fontkit.openSync(__dirname + '/data/NotoSansCJK/NotoSansCJKkr-Regular.otf');

    it('should use composed versions if supported by the font', function() {
      let {glyphs} = font.layout('\uD734\uAC00\u0020\uAC00\u002D\u002D\u0020\u0028\uC624\u002D\u002D\u0029');
      return assert.deepEqual(glyphs.map(g => g.id), [ 58626, 47566, 62995, 47566, 14, 14, 1, 9, 54258, 14, 14, 10 ]);
    });

    it('should compose decomposed syllables if supported', function() {
      let {glyphs} = font.layout('\u1112\u1172\u1100\u1161\u0020\u1100\u1161\u002D\u002D\u0020\u0028\u110B\u1169\u002D\u002D\u0029');
      return assert.deepEqual(glyphs.map(g => g.id), [ 58626, 47566, 62995, 47566, 14, 14, 1, 9, 54258, 14, 14, 10 ]);
    });

    it('should use OT features for non-combining <L,V,T>', function() {
      let {glyphs} = font.layout('\ua960\ud7b0\ud7cb');
      return assert.deepEqual(glyphs.map(g => g.id), [ 64003, 64479, 64822 ]);
    });

    it('should decompose <LV,T> to <L,V,T> if <LVT> is not supported', function() {
      // <L,V> combine at first, but the T is non-combining, so this
      // tests that the <LV> gets decomposed again in this case.
      let {glyphs} = font.layout('\u1100\u1161\ud7cb');
      return assert.deepEqual(glyphs.map(g => g.id), [ 63657, 64408, 64685 ]);
    });

    it('should reorder tone marks to the beginning of <L,V> syllables', function() {
      let {glyphs} = font.layout('\ua960\ud7b0\u302f');
      return assert.deepEqual(glyphs.map(g => g.id), [ 1436, 64378, 64574 ]);
    });

    it('should reorder tone marks to the beginning of <L,V,T> syllables', function() {
      let {glyphs} = font.layout('\ua960\ud7b0\ud7cb\u302f');
      return assert.deepEqual(glyphs.map(g => g.id), [ 1436, 64003, 64479, 64822 ]);
    });

    it('should reorder tone marks to the beginning of <LV> syllables', function() {
      let {glyphs} = font.layout('\uac00\u302f');
      return assert.deepEqual(glyphs.map(g => g.id), [ 1436, 47566 ]);
    });

    it('should reorder tone marks to the beginning of <LVT> syllables', function() {
      let {glyphs} = font.layout('\uac01\u302f');
      return assert.deepEqual(glyphs.map(g => g.id), [ 1436, 47567 ]);
    });

    it('should insert a dotted circle for invalid tone marks', function() {
      let {glyphs} = font.layout('\u1100\u302f\u1161');
      return assert.deepEqual(glyphs.map(g => g.id), [ 365, 1436, 1256, 462 ]);
    });
  });

  describe('universal shaping engine', function() {
    describe('shapes balinese text', function() {
      // Tests from https://github.com/icu-project/text-rendering-tests
      test('SHBALI-1/1', 'NotoSans/NotoSansBalinese-Regular.ttf', "ᬓᬸᬀ", '23+2275|60@5,0+0|4@-95,0+0');
      test('SHBALI-1/2', 'NotoSans/NotoSansBalinese-Regular.ttf', "ᬕ᭄ᬖᬂ", '25+2237|132+0|6@-307,0+0');
      test('SHBALI-1/3', 'NotoSans/NotoSansBalinese-Regular.ttf', "ᬘᬻ", '28+1627|62@3,0+0|57+916');
      test('SHBALI-1/4', 'NotoSans/NotoSansBalinese-Regular.ttf', "ᬙᭀ", '66+990|29+2155|57+916');
      test('SHBALI-1/5', 'NotoSans/NotoSansBalinese-Regular.ttf', "ᬚᬿ", '67+990|30+1800');
      test('SHBALI-1/6', 'NotoSans/NotoSansBalinese-Regular.ttf', "ᬔᬶ", '24+2316|58@-620,0+0');
      test('SHBALI-1/7', 'NotoSans/NotoSansBalinese-Regular.ttf', "ᬓ᭄ᬓᬁ", '23+2275|129+0|5@-95,0+0');
      test('SHBALI-1/8', 'NotoSans/NotoSansBalinese-Regular.ttf', "ᬓ᭄ᬛᬁ", '23+2275|137+0|5@550,370+0');
      test('SHBALI-1/9', 'NotoSans/NotoSansBalinese-Regular.ttf', "ᬓ᭄ᬦᬃ", '23+2275|148+0|7@-245,0+0');
      test('SHBALI-1/10', 'NotoSans/NotoSansBalinese-Regular.ttf', "ᬓ᭄ᬓᬸ", '23+2275|129+0|60@0,-1000+0');
      test('SHBALI-1/11', 'NotoSans/NotoSansBalinese-Regular.ttf', "ᬓ᭄ᬓᬼ", '23+2275|129+0|70@35,0+0|170@5,0+0');
      test('SHBALI-1/12', 'NotoSans/NotoSansBalinese-Regular.ttf', "ᬓ᭄ᬓᬽ", '23+2275|129+0|70@35,0+0|170@5,0+0|57+916');
      test('SHBALI-1/13', 'NotoSans/NotoSansBalinese-Regular.ttf', "ᬓᬾ", '66+990|23+2275');
      test('SHBALI-1/14', 'NotoSans/NotoSansBalinese-Regular.ttf', "ᬓᬶᬾ", '23+2275|58@-95,0+0|66+990|128+1127');
      test('SHBALI-1/15', 'NotoSans/NotoSansBalinese-Regular.ttf', "ᬓᬸᬾ", '23+2275|60@5,0+0|66+990|128+1127');
      test('SHBALI-1/16', 'NotoSans/NotoSansBalinese-Regular.ttf', "ᬓ᭄ᬕᬾ", '66+990|23+2275|131+0');
      test('SHBALI-1/17', 'NotoSans/NotoSansBalinese-Regular.ttf', "ᬓᭀ", '66+990|23+2275|57+916');
      test('SHBALI-1/18', 'NotoSans/NotoSansBalinese-Regular.ttf', "ᬓᬾ", '66+990|23+2275');
      test('SHBALI-1/19', 'NotoSans/NotoSansBalinese-Regular.ttf', "ᬓᬾᬶ", '66+990|23+2275|58@-95,0+0');
      test('SHBALI-1/20', 'NotoSans/NotoSansBalinese-Regular.ttf', "ᬓᬾᬸ", '66+990|23+2275|60@5,0+0');
      test('SHBALI-1/21', 'NotoSans/NotoSansBalinese-Regular.ttf', "ᬓ᭄ᬕᬾ", '66+990|23+2275|131+0');
      test('SHBALI-1/22', 'NotoSans/NotoSansBalinese-Regular.ttf', "ᬓᭀ", '66+990|23+2275|57+916');

      test('SHBALI-2/1', 'NotoSans/NotoSansBalinese-Regular.ttf', "ᬓ᭄ᬧᬾ", '66+990|23+2275|149+1315');
      test('SHBALI-2/2', 'NotoSans/NotoSansBalinese-Regular.ttf', "ᬓ᭄ᬨᬿ", '67+990|23+2275|150+1228');
      test('SHBALI-2/3', 'NotoSans/NotoSansBalinese-Regular.ttf', "ᬓ᭄ᬱᬾ", '66+990|23+2275|159+1315');
      test('SHBALI-2/4', 'NotoSans/NotoSansBalinese-Regular.ttf', "ᬓ᭄ᬲᬾ", '66+990|23+2275|60@5,0+0|149+1315');
      test('SHBALI-2/5', 'NotoSans/NotoSansBalinese-Regular.ttf', "ᬓ᭄ᭊᬾ", '66+990|23+2275|60@5,0+0|165+1315');
      test('SHBALI-2/6', 'NotoSans/NotoSansBalinese-Regular.ttf', "ᬛ᭄ᬓ", '181+2473|129@-293,-400+0');
      test('SHBALI-2/7', 'NotoSans/NotoSansBalinese-Regular.ttf', "ᬛ᭄ᬓᬾ", '66+990|181+2473|129@-293,-400+0');
      test('SHBALI-2/8', 'NotoSans/NotoSansBalinese-Regular.ttf', "ᬛ᭄ᬓᬸᬀ", '181+2473|129@-293,-400+0|60@-293,-1400+0|4@-722,0+0');
      test('SHBALI-2/9', 'NotoSans/NotoSansBalinese-Regular.ttf', "ᬓ᭄ᬓᬸ", '23+2275|129+0|60@0,-1000+0');
      test('SHBALI-2/10', 'NotoSans/NotoSansBalinese-Regular.ttf', "ᬓ᭄ᬛᬹ", '23+2275|137+0|61@308,-1000+0');
      test('SHBALI-2/11', 'NotoSans/NotoSansBalinese-Regular.ttf', "ᬓ᭄ᬱᬺ", '23+2275|159+1315|62+0');
      test('SHBALI-2/12', 'NotoSans/NotoSansBalinese-Regular.ttf', "ᬓ᭄ᭅᬸ", '23+2275|162+0|60@0,-1000+0');
    });
  });
});
