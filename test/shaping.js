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

  describe.skip('thai shaper', function () {
    test('thai', 'THSarabunNew.ttf', 'ดีปี ด่ ป่ ดู ฤู', '233+391|266+0|240+428|344+0|496+216|233+391|352+0|496+216|240+428|347+0|496+216|233+391|270+0|496+216|249+378|367+0');
  });

  describe('indic shaper', function () {
    describe('shapes Kannada text', function () {
      // Tests from https://github.com/unicode-org/text-rendering-tests
      test('SHKNDA-1/1', 'NotoSans/NotoSerifKannada-Regular.ttf', 'ಲ್ಲಿ', '250+1550|126+0');
      test('SHKNDA-1/2', 'NotoSans/NotoSerifKannada-Regular.ttf', 'ಟ್ಸ್', '194+2092|130+96');
      test('SHKNDA-1/3', 'NotoSans/NotoSerifKannada-Regular.ttf', 'ಳಿ', '257+1441');
      test('SHKNDA-1/4', 'NotoSans/NotoSerifKannada-Regular.ttf', 'ಡಿ', '235+1565');
      test('SHKNDA-1/5', 'NotoSans/NotoSerifKannada-Regular.ttf', 'ಮೆ', '295+2196');
      test('SHKNDA-1/6', 'NotoSans/NotoSerifKannada-Regular.ttf', 'ರಿ', '249+1289');
      test('SHKNDA-1/7', 'NotoSans/NotoSerifKannada-Regular.ttf', 'ಖ್ಯೆ', '272+1733|124+164');
      test('SHKNDA-1/8', 'NotoSans/NotoSerifKannada-Regular.ttf', 'ಫ್ರಿ', '244+1505|125+170');
      test('SHKNDA-1/9', 'NotoSans/NotoSerifKannada-Regular.ttf', 'ನೆ', '290+1422');
      test('SHKNDA-1/10', 'NotoSans/NotoSerifKannada-Regular.ttf', 'ಗಿ', '225+1271');
      test('SHKNDA-1/11', 'NotoSans/NotoSerifKannada-Regular.ttf', 'ಷ್ಟಿ', '253+1528|109+141');
      test('SHKNDA-1/12', 'NotoSans/NotoSerifKannada-Regular.ttf', 'ಯಿಂ', '248+2564|73+1205');
      test('SHKNDA-1/13', 'NotoSans/NotoSerifKannada-Regular.ttf', 'ಚೀ', '228+1569|35+845');
      test('SHKNDA-1/14', 'NotoSans/NotoSerifKannada-Regular.ttf', 'ನಿ', '242+1389');
      test('SHKNDA-1/15', 'NotoSans/NotoSerifKannada-Regular.ttf', 'ಗ್ಲಿ', '225+1271|126+0');
      test('SHKNDA-1/16', 'NotoSans/NotoSerifKannada-Regular.ttf', 'ಷಿ', '253+1528');
      test('SHKNDA-1/17', 'NotoSans/NotoSerifKannada-Regular.ttf', 'ಗೆ', '273+1276');
      test('SHKNDA-1/18', 'NotoSans/NotoSerifKannada-Regular.ttf', 'ದ್ವಿ', '240+1516|127+57');
      test('SHKNDA-1/19', 'NotoSans/NotoSerifKannada-Regular.ttf', 'ತೀ', '238+1255|35+845');
      test('SHKNDA-1/20', 'NotoSans/NotoSerifKannada-Regular.ttf', 'ಮಿ', '247+2186');
      test('SHKNDA-1/21', 'NotoSans/NotoSerifKannada-Regular.ttf', 'ಲಿ', '250+1550');
      test('SHKNDA-1/22', 'NotoSans/NotoSerifKannada-Regular.ttf', 'ಗಿ', '225+1271');
      test('SHKNDA-1/23', 'NotoSans/NotoSerifKannada-Regular.ttf', 'ನ್', '203+1911');
      test('SHKNDA-1/24', 'NotoSans/NotoSerifKannada-Regular.ttf', 'ಬಿ', '245+1579');
      test('SHKNDA-1/25', 'NotoSans/NotoSerifKannada-Regular.ttf', 'ಲಿ', '250+1550');
      test('SHKNDA-1/26', 'NotoSans/NotoSerifKannada-Regular.ttf', 'ನ್ನಿಂ', '242+1389|118+158|73+1205');
      test('SHKNDA-1/27', 'NotoSans/NotoSerifKannada-Regular.ttf', 'ಲ್ಲಿ', '250+1550|126+0');
      test('SHKNDA-1/28', 'NotoSans/NotoSerifKannada-Regular.ttf', 'ಧಿ', '241+1516');
      test('SHKNDA-1/29', 'NotoSans/NotoSerifKannada-Regular.ttf', 'ಪೌ', '168+1514|34+773');
      test('SHKNDA-1/30', 'NotoSans/NotoSerifKannada-Regular.ttf', 'ವಿಂ', '251+1533|73+1205');
      test('SHKNDA-1/31', 'NotoSans/NotoSerifKannada-Regular.ttf', 'ಡಿ', '235+1565');
      test('SHKNDA-1/32', 'NotoSans/NotoSerifKannada-Regular.ttf', 'ಟಿ', '233+1621');
      test('SHKNDA-1/33', 'NotoSans/NotoSerifKannada-Regular.ttf', 'ನಿ', '242+1389');
      test('SHKNDA-1/34', 'NotoSans/NotoSerifKannada-Regular.ttf', 'ಧಿ', '241+1516');

      test('SHKNDA-2/1', 'NotoSans/NotoSansKannada-Regular.ttf', 'ನ್ನಾ', '150+1456|57+919|116+215');
      test('SHKNDA-2/2', 'NotoSans/NotoSansKannada-Regular.ttf', 'ನ್ನಾ', '150+1456|57+919|116+215');
      test('SHKNDA-2/3', 'NotoSans/NotoSansKannada-Regular.ttf', 'ತ್ತಾ', '146+1275|57+919|112+133');
      test('SHKNDA-2/4', 'NotoSans/NotoSansKannada-Regular.ttf', 'ಟ್ಟಾ', '141+1669|57+919|107+277');
      test('SHKNDA-2/5', 'NotoSans/NotoSansKannada-Regular.ttf', 'ಡೋಂಗಿ', '249+1573|61+1526|71+843|4+1127|207+1327');
      test('SHKNDA-2/6', 'NotoSans/NotoSansKannada-Regular.ttf', 'ಜಿ಼ೕಬೆನ್', '211+1590|55@-254,0+0|71+843|259+1651|186+2096');
      test('SHKNDA-2/7', 'NotoSans/NotoSansKannada-Regular.ttf', 'ಜಾ಼ಕಿರ್', '139+1590|57+919|55@-1173,0+0|205+1176|193+1974');
      test('SHKNDA-2/8', 'NotoSans/NotoSansKannada-Regular.ttf', 'ಇನ್ಫ್ಲೆಕ್ಷನಲ್', '8+1457|256+1456|118+346|335+791|282+1176|39+1456|195+2234');
      test('SHKNDA-2/9', 'NotoSans/NotoSansKannada-Regular.ttf', 'ಇನ್ಫ್ಲೆಕ್ಷನ್', '8+1457|256+1456|118+346|335+791|282+1176|186+2096');
      test('SHKNDA-2/10', 'NotoSans/NotoSansKannada-Regular.ttf', 'ದಟ್ಸ್', '37+1566|177+2150|130+245');
      test('SHKNDA-2/11', 'NotoSans/NotoSansKannada-Regular.ttf', 'ಎಕ್ಸ್', '14+1612|167+1656|130+245');
      test('SHKNDA-2/12', 'NotoSans/NotoSansKannada-Regular.ttf', 'ಮಾರ್ಚ್', '155+2367|57+919|172+2281|94+1161');
      test('SHKNDA-2/13', 'NotoSans/NotoSansKannada-Regular.ttf', 'ಟೆಕ್ಸ್ಟ್', '247+1669|167+1656|130+346|317+970');
      test('SHKNDA-2/14', 'NotoSans/NotoSansKannada-Regular.ttf', 'ಬುಕ್ಸ್', '42+1641|60+745|167+1656|130+245');
      test('SHKNDA-2/15', 'NotoSans/NotoSansKannada-Regular.ttf', 'ಸಾಫ್ಟ್', '163+1452|57+919|188+2101|107+277');
      test('SHKNDA-2/16', 'NotoSans/NotoSansKannada-Regular.ttf', 'ಜಸ್ಟ್', '27+1590|200+1932|107+277');

      test('SHKNDA-3/1', 'NotoSans/NotoSansKannada-Regular.ttf', 'ಕೋಂ', '239+1176|61+1526|71+843|4+1127');
      test('SHKNDA-3/2', 'NotoSans/NotoSansKannada-Regular.ttf', 'ಖೋಂ', '240+1772|61+1526|71+843|4+1127');
      test('SHKNDA-3/3', 'NotoSans/NotoSansKannada-Regular.ttf', 'ಗೋಂ', '241+1327|61+1526|71+843|4+1127');
      test('SHKNDA-3/4', 'NotoSans/NotoSansKannada-Regular.ttf', 'ಘೋಂ', '242+2041|279+1526|71+843|4+1127');
      test('SHKNDA-3/5', 'NotoSans/NotoSansKannada-Regular.ttf', 'ಙೋಂ', '24+1510|67+2009|71+843|4+1127');
      test('SHKNDA-3/6', 'NotoSans/NotoSansKannada-Regular.ttf', 'ಚೋಂ', '243+1628|61+1526|71+843|4+1127');
      test('SHKNDA-3/7', 'NotoSans/NotoSansKannada-Regular.ttf', 'ಛೋಂ', '244+1727|61+1526|71+843|4+1127');
      test('SHKNDA-3/8', 'NotoSans/NotoSansKannada-Regular.ttf', 'ಜೋಂ', '245+1590|61+1526|71+843|4+1127');
      test('SHKNDA-3/9', 'NotoSans/NotoSansKannada-Regular.ttf', 'ಝೋಂ', '246+2824|61+1526|71+843|4+1127');
      test('SHKNDA-3/10', 'NotoSans/NotoSansKannada-Regular.ttf', 'ಞೋಂ', '29+1982|67+2009|71+843|4+1127');
      test('SHKNDA-3/11', 'NotoSans/NotoSansKannada-Regular.ttf', 'ಟೋಂ', '247+1669|61+1526|71+843|4+1127');
      test('SHKNDA-3/12', 'NotoSans/NotoSansKannada-Regular.ttf', 'ಠೋಂ', '248+1334|61+1526|71+843|4+1127');
      test('SHKNDA-3/13', 'NotoSans/NotoSansKannada-Regular.ttf', 'ಡೋಂ', '249+1573|61+1526|71+843|4+1127');
      test('SHKNDA-3/14', 'NotoSans/NotoSansKannada-Regular.ttf', 'ಢೋಂ', '250+1573|61+1526|71+843|4+1127');
      test('SHKNDA-3/15', 'NotoSans/NotoSansKannada-Regular.ttf', 'ಣೋಂ', '251+1775|61+1526|71+843|4+1127');
      test('SHKNDA-3/16', 'NotoSans/NotoSansKannada-Regular.ttf', 'ತೋಂ', '252+1275|61+1526|71+843|4+1127');
      test('SHKNDA-3/17', 'NotoSans/NotoSansKannada-Regular.ttf', 'ಥೋಂ', '253+1566|61+1526|71+843|4+1127');
      test('SHKNDA-3/18', 'NotoSans/NotoSansKannada-Regular.ttf', 'ದೋಂ', '254+1566|61+1526|71+843|4+1127');
      test('SHKNDA-3/19', 'NotoSans/NotoSansKannada-Regular.ttf', 'ಧೋಂ ', '255+1566|61+1526|71+843|4+1127|3+590');
      test('SHKNDA-3/20', 'NotoSans/NotoSansKannada-Regular.ttf', 'ನೋಂ', '256+1456|61+1526|71+843|4+1127');
      test('SHKNDA-3/21', 'NotoSans/NotoSansKannada-Regular.ttf', 'ಪೋಂ', '257+1621|275+1316|71+843|4+1127');
      test('SHKNDA-3/22', 'NotoSans/NotoSansKannada-Regular.ttf', 'ಫೋಂ', '258+1621|277+1316|71+843|4+1127');
      test('SHKNDA-3/23', 'NotoSans/NotoSansKannada-Regular.ttf', 'ಬೋಂ', '259+1651|61+1526|71+843|4+1127');
      test('SHKNDA-3/24', 'NotoSans/NotoSansKannada-Regular.ttf', 'ಭೋಂ', '260+1651|61+1526|71+843|4+1127');
      test('SHKNDA-3/25', 'NotoSans/NotoSansKannada-Regular.ttf', 'ಮೋಂ', '280+3152|71+843|4+1127');
      test('SHKNDA-3/26', 'NotoSans/NotoSansKannada-Regular.ttf', 'ಯೋಂ', '281+3506|71+843|4+1127');
      test('SHKNDA-3/27', 'NotoSans/NotoSansKannada-Regular.ttf', 'ರೋಂ', '263+1334|61+1526|71+843|4+1127');
      test('SHKNDA-3/28', 'NotoSans/NotoSansKannada-Regular.ttf', 'ಱೋಂ', '47+1701|67+2009|71+843|4+1127');
      test('SHKNDA-3/29', 'NotoSans/NotoSansKannada-Regular.ttf', 'ಲೋಂ', '264+1574|61+1526|71+843|4+1127');
      test('SHKNDA-3/30', 'NotoSans/NotoSansKannada-Regular.ttf', 'ವೋಂ', '266+1626|275+1316|71+843|4+1127');
      test('SHKNDA-3/31', 'NotoSans/NotoSansKannada-Regular.ttf', 'ಆ್ಯಕ್ಷಿಸ್‌', '7+1717|122+532|285+1176|200+2092|3+0');
    });

    describe('shapes Telugu text', function () {
      test('HB-TELU-1', 'NotoSans/NotoSansTelugu-Regular.ttf', 'కై', '326+1065');
      test('HB-TELU-2', 'NotoSans/NotoSansTelugu-Regular.ttf', 'క్', '102+1065');
      test('HB-TELU-3', 'NotoSans/NotoSansTelugu-Regular.ttf', 'క్కై', '326+1065|511+1079');
      test('HB-TELU-4', 'NotoSans/NotoSansTelugu-Regular.ttf', 'క్ర', '21+1065|549+0');
      test('HB-TELU-5', 'NotoSans/NotoSansTelugu-Regular.ttf', 'క్రి', '174+1065|549+0');
      test('HB-TELU-6', 'NotoSans/NotoSansTelugu-Regular.ttf', 'క్రై', '326+1065|496+860');
      test('HB-TELU-7', 'NotoSans/NotoSansTelugu-Regular.ttf', 'క్ర్', '102+1065|549+0');
      test('HB-TELU-8', 'NotoSans/NotoSansTelugu-Regular.ttf', 'క్ర్క', '21+1065|549+0|511+1079');
      test('HB-TELU-9', 'NotoSans/NotoSansTelugu-Regular.ttf', 'క్ష', '101+1065');
      test('HB-TELU-10', 'NotoSans/NotoSansTelugu-Regular.ttf', 'క్ష్', '137+1065');
      test('HB-TELU-11', 'NotoSans/NotoSansTelugu-Regular.ttf', 'క్ష్ణ', '21+1065|605+0');
      test('HB-TELU-12', 'NotoSans/NotoSansTelugu-Regular.ttf', 'ఽం', '56+1208|5+1038');
    });

    describe('shapes Tamil text', function () {
      test('HB-TAML-1', 'NotoSans/NotoSansTamil-Regular.ttf', 'தமிழ்நாடு', '25+1689|29+1762|42+537|94+1762|26+1616|41+1311|112+2078');
      test('HB-TAML-2', 'NotoSans/NotoSansTamil-Regular.ttf', 'ஓர்', '16+2018|90+1311');
      test('HB-TAML-3', 'NotoSans/NotoSansTamil-Regular.ttf', 'இந்திய', '8+2306|85+1616|25+1689|149+537|30+1972');
      test('HB-TAML-4', 'NotoSans/NotoSansTamil-Regular.ttf', 'மாநிலமாகும்.', '29+1762|41+1311|26+1616|149+537|33+2075|29+1762|41+1311|101+2175|88+1762|164+549');
      test('HB-TAML-5', 'NotoSans/NotoSansTamil-Regular.ttf', 'தமிழ்நாடு,', '25+1689|29+1762|42+537|94+1762|26+1616|41+1311|112+2078|162+512');
      test('HB-TAML-6', 'NotoSans/NotoSansTamil-Regular.ttf', 'தமிழகம்', '25+1689|29+1762|42+537|35+1762|18+1689|88+1762');
      test('HB-TAML-7', 'NotoSans/NotoSansTamil-Regular.ttf', 'என்றும்', '12+1640|86+2528|132+2329|88+1762');
      test('HB-TAML-8', 'NotoSans/NotoSansTamil-Regular.ttf', 'பரவலாக', '28+1593|31+1311|36+2139|33+2075|41+1311|18+1689');
      test('HB-TAML-9', 'NotoSans/NotoSansTamil-Regular.ttf', 'அழைக்கப்படுகிறது.', '6+2295|48+2384|35+1762|77+1689|18+1689|87+1593|28+1593|112+2078|18+1689|149+537|32+1792|116+2234|164+549');
      test('HB-TAML-10', 'NotoSans/NotoSansTamil-Regular.ttf', 'ஆங்கிலத்தில்', '7+2690|78+2139|18+1689|149+537|33+2075|84+1689|25+1689|149+537|92+2075');
      test('HB-TAML-11', 'NotoSans/NotoSansTamil-Regular.ttf', 'மெட்ராஸ்', '46+1846|29+1762|82+1419|31+1311|41+1311|98+2631');
      test('HB-TAML-12', 'NotoSans/NotoSansTamil-Regular.ttf', 'ஸ்டேட்', '98+2631|47+1491|23+1419|82+1419');
      test('HB-TAML-13', 'NotoSans/NotoSansTamil-Regular.ttf', 'என்றும்', '12+1640|86+2528|132+2329|88+1762');
      test('HB-TAML-14', 'NotoSans/NotoSansTamil-Regular.ttf', 'தமிழில்', '25+1689|29+1762|42+537|35+1762|42+537|92+2075');
      test('HB-TAML-15', 'NotoSans/NotoSansTamil-Regular.ttf', 'சென்னை', '46+1846|20+1481|86+2528|48+2384|27+2528');
      test('HB-TAML-16', 'NotoSans/NotoSansTamil-Regular.ttf', 'ராஜ்ஜியம்', '31+1311|41+1311|80+2094|21+2094|42+537|30+1972|88+1762');
      test('HB-TAML-17', 'NotoSans/NotoSansTamil-Regular.ttf', 'என்றும்', '12+1640|86+2528|132+2329|88+1762');
      test('HB-TAML-18', 'NotoSans/NotoSansTamil-Regular.ttf', 'அழைக்கப்பெற்றது.', '6+2295|48+2384|35+1762|77+1689|18+1689|87+1593|46+1846|28+1593|91+1788|32+1792|116+2234|164+549');
      test('HB-TAML-19', 'NotoSans/NotoSansTamil-Regular.ttf', 'இதனை', '8+2306|25+1689|48+2384|27+2528');
      test('HB-TAML-20', 'NotoSans/NotoSansTamil-Regular.ttf', 'தமிழ்நாடு', '25+1689|29+1762|42+537|94+1762|26+1616|41+1311|112+2078');
      test('HB-TAML-21', 'NotoSans/NotoSansTamil-Regular.ttf', 'என்று', '12+1640|86+2528|132+2329');
      test('HB-TAML-22', 'NotoSans/NotoSansTamil-Regular.ttf', 'மாற்றக்கோரி', '29+1762|41+1311|91+1788|32+1792|77+1689|47+1491|18+1689|41+1311|31+1311|42+537');
      test('HB-TAML-23', 'NotoSans/NotoSansTamil-Regular.ttf', 'போராட்டங்கள்', '47+1491|28+1593|41+1311|31+1311|41+1311|82+1419|23+1419|78+2139|18+1689|93+2192');
      test('HB-TAML-24', 'NotoSans/NotoSansTamil-Regular.ttf', 'நடைபெற்றன.', '26+1616|48+2384|23+1419|46+1846|28+1593|91+1788|32+1792|27+2528|164+549');
      test('HB-TAML-25', 'NotoSans/NotoSansTamil-Regular.ttf', 'சங்கரலிங்கனார்', '20+1481|78+2139|18+1689|31+1311|134+2603|78+2139|18+1689|27+2528|41+1311|90+1311');
      test('HB-TAML-26', 'NotoSans/NotoSansTamil-Regular.ttf', 'என்பவர்', '12+1640|86+2528|28+1593|36+2139|90+1311');
      test('HB-TAML-27', 'NotoSans/NotoSansTamil-Regular.ttf', 'நாட்கள்', '26+1616|41+1311|82+1419|18+1689|93+2192');
      test('HB-TAML-28', 'NotoSans/NotoSansTamil-Regular.ttf', 'உண்ணாவிரதம்', '10+2185|83+3377|24+3377|41+1311|36+2139|148+537|31+1311|25+1689|88+1762');
      test('HB-TAML-29', 'NotoSans/NotoSansTamil-Regular.ttf', 'இருந்து', '8+2306|130+2153|85+1616|116+2234');
      test('HB-TAML-30', 'NotoSans/NotoSansTamil-Regular.ttf', 'உயிர்துறந்தார்.', '10+2185|30+1972|148+537|90+1311|116+2234|32+1792|85+1616|25+1689|41+1311|90+1311|164+549');
      test('HB-TAML-31', 'NotoSans/NotoSansTamil-Regular.ttf', 'பின்னர்', '28+1593|148+537|86+2528|27+2528|90+1311');
      test('HB-TAML-32', 'NotoSans/NotoSansTamil-Regular.ttf', 'மதராசு', '29+1762|25+1689|31+1311|41+1311|106+1776');
      test('HB-TAML-33', 'NotoSans/NotoSansTamil-Regular.ttf', 'ஸ்டேட்', '98+2631|47+1491|23+1419|82+1419');
      test('HB-TAML-34', 'NotoSans/NotoSansTamil-Regular.ttf', 'என்று', '12+1640|86+2528|132+2329');
      test('HB-TAML-35', 'NotoSans/NotoSansTamil-Regular.ttf', 'இருந்த', '8+2306|130+2153|85+1616|25+1689');
      test('HB-TAML-36', 'NotoSans/NotoSansTamil-Regular.ttf', 'பெயர்', '46+1846|28+1593|30+1972|90+1311');
      test('HB-TAML-37', 'NotoSans/NotoSansTamil-Regular.ttf', 'ஆம்', '7+2690|88+1762');
      test('HB-TAML-38', 'NotoSans/NotoSansTamil-Regular.ttf', 'ஆண்டு', '7+2690|83+3377|112+2078');
      test('HB-TAML-39', 'NotoSans/NotoSansTamil-Regular.ttf', 'தமிழ்நாடு', '25+1689|29+1762|42+537|94+1762|26+1616|41+1311|112+2078');
      test('HB-TAML-40', 'NotoSans/NotoSansTamil-Regular.ttf', 'என்று', '12+1640|86+2528|132+2329');
      test('HB-TAML-41', 'NotoSans/NotoSansTamil-Regular.ttf', 'மாற்றப்பட்டது.', '29+1762|41+1311|91+1788|32+1792|87+1593|28+1593|82+1419|23+1419|116+2234|164+549');
      test('HB-TAML-42', 'NotoSans/NotoSansTamil-Regular.ttf', 'ஸ்ரீ', '147+3100');
      test('HB-TAML-43', 'NotoSans/NotoSansTamil-Regular.ttf', 'க்ஷ', '76+3795');
    });
  });

  describe('universal shaping engine', function() {
    describe('shapes balinese text', function() {
      // Tests from https://github.com/unicode-org/text-rendering-tests
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
