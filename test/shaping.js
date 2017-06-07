import fontkit from '../src';
import assert from 'assert';

describe('shaping', function() {
  let fontCache = {};
  let test = (description, font, text, output) => {
    it(description, function() {
      let f = fontCache[font] || (fontCache[font] = fontkit.openSync(__dirname + '/data/' + font));
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

  describe('general shaping tests', function() {
    let font = fontkit.openSync(__dirname + '/data/amiri/amiri-regular.ttf');

    it('should use correct script and language when features are not specified', function() {
      let {glyphs} = font.layout('۴', 'arab', 'URD');
      return assert.deepEqual(glyphs.map(g => g.id), [ 1940 ]);
    });

    it('should use specified left-to-right direction', function() {
      let {glyphs} = font.layout('١٢٣', 'arab', 'ARA ', 'ltr');
      return assert.deepEqual(glyphs.map(g => g.id), [ 446, 447, 448 ]);
    });
  });

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

    test('should attach marks to the first base of a multiple substitution', 'amiri/amiri-regular.ttf', 'الله', '1824+721|461@-267,-162+0|430@-277,-440+0|6714+0|1823+473|1822+319|388+446');

    test('should adjust attached marks if base is adjusted', 'amiri/amiri-regular.ttf', 'لَكنت' ,'2054+1810|2133+500|2300+1206|427@-96,0+0|5988+380|2322+360');
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

    describe('shapes Devanagari text', function () {
      describe('joiners', function () {
        test('HB-DEVA-joiners-1', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'र्ह', '61+1088|181+0');
        test('HB-DEVA-joiners-2', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'र्‌ह', '52+838|81@-48,0+0|3+0|61+1088');
        test('HB-DEVA-joiners-3', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'र्‍ह', '209+818|61+1088');
        test('HB-DEVA-joiners-4', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'ऱ्ह', '209+818|61+1088');
        test('HB-DEVA-joiners-5', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'ऱ्‌ह', '53+838|81@-48,0+0|3+0|61+1088');
        test('HB-DEVA-joiners-6', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'ऱ्‍ह', '209+818|3+0|61+1088');
        test('HB-DEVA-joiners-7', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'क्क', '183+1104|25+1561');
        test('HB-DEVA-joiners-8', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'क्‍', '183+1204|3+0');
        test('HB-DEVA-joiners-9', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'क्‌क', '25+1561|81@-454,0+0|3+0|25+1561');
        test('HB-DEVA-joiners-10', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'क्‍क', '183+1104|3+0|25+1561');
        test('HB-DEVA-joiners-11', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'क्कि', '558+530|183+1104|25+1561');
        test('HB-DEVA-joiners-12', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'क्‌कि', '25+1561|81@-454,0+0|3+0|561+530|25+1561');
        test('HB-DEVA-joiners-13', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'क्‍कि', '558+530|183+1104|3+0|25+1561');
        test('HB-DEVA-joiners-14', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'क्ष', '179+1458');
        test('HB-DEVA-joiners-15', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'क्‌ष', '25+1561|81@-454,0+0|3+0|59+1184');
        test('HB-DEVA-joiners-16', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'क्‍ष', '183+1204|3+0|59+1184');
        test('HB-DEVA-joiners-17', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'द्सि', '42+1064|81@96,0+0|563+530|60+1375');
        test('HB-DEVA-joiners-18', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'द्‌सि', '42+1064|81@96,0+0|3+0|563+530|60+1375');
        test('HB-DEVA-joiners-19', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'द्‍सि', '558+530|200+1064|60+1375');
      });

      describe('misc', function () {
        test('HB-DEVA-misc-1', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'क', '25+1561');
        test('HB-DEVA-misc-2', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'क़', '92+1561');
        test('HB-DEVA-misc-3', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'कि', '561+530|25+1561');
        test('HB-DEVA-misc-4', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'क्', '25+1561|81@-454,0+0');
        test('HB-DEVA-misc-5', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'क्क', '183+1104|25+1561');
        test('HB-DEVA-misc-6', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'क्र', '254+1561');
        test('HB-DEVA-misc-7', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'क्र्क', '327+1204|25+1561');
        test('HB-DEVA-misc-8', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'क्र्‍', '327+1204|3+0');
        test('HB-DEVA-misc-9', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'क्ष', '179+1458');
        test('HB-DEVA-misc-10', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'क्ष्', '179+1458|81+0');
        test('HB-DEVA-misc-11', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'क्‌ष', '25+1561|81@-454,0+0|3+0|59+1184');
        test('HB-DEVA-misc-12', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'क्‍', '183+1204|3+0');
        test('HB-DEVA-misc-13', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'क्‍ष', '183+1204|3+0|59+1184');
        test('HB-DEVA-misc-14', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'छ्र्क', '334+1435|25+1561');
        test('HB-DEVA-misc-15', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'ज्ञ्', '180+1313|81+0');
        test('HB-DEVA-misc-16', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'ट्रु', '35+1032|657@-10,0+0');
        test('HB-DEVA-misc-17', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'र्क', '25+1561|181@-454,0+0');
        test('HB-DEVA-misc-18', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'र्कि', '585+530|25+1561|606+0');
        test('HB-DEVA-misc-19', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'र्क्रि', '585+530|254+1561|606+0');
        test('HB-DEVA-misc-20', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'र्‍', '209+818');
        test('HB-DEVA-misc-21', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'ि', '67+530|135+1044');
        test('HB-DEVA-misc-22', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'फ़्र', '314+1579');
        test('HB-DEVA-misc-23', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'फ्र', '275+1579');
        test('HB-DEVA-misc-24', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'द्दि', '560+530|511+1105');
        test('HB-DEVA-misc-25', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'क्ष', '179+1458');
        test('HB-DEVA-misc-26', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'क्‌ष', '25+1561|81@-454,0+0|3+0|59+1184');
        test('HB-DEVA-misc-27', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'क्‍ष', '183+1204|3+0|59+1184');
        test('HB-DEVA-misc-28', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'र्अ्', '9+1565|81+0|181+0');
        test('HB-DEVA-misc-29', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'र्अ्‌', '9+1565|81+0|3+0|181+0');
        test('HB-DEVA-misc-30', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'र्अ्‍', '52+838|81@-48,0+0|9+1565|81+0|3+0');
        test('HB-DEVA-misc-31', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'र्आ्र्', '10+2095|81+0|181+0|52+838|81@-48,0+0');
        test('HB-DEVA-misc-32', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'क‌ि', '561+530|25+1561|3+0');
        test('HB-DEVA-misc-33', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'ऽं', '65+957|6+0');
        test('HB-DEVA-misc-34', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'रुँः', '413+1152|5@-314,0+0|7+558');
        test('HB-DEVA-misc-35', 'NotoSans/NotoSansDevanagari-Regular.ttf', '1ि', '558+530|748+1128');
        test('HB-DEVA-misc-36', 'NotoSans/NotoSansDevanagari-Regular.ttf', '१॑', '107+1128|85@-298,0+0');
      });

      describe('dotted circle', function () {
        test('HB-DEVA-dottedcircle-1', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'र्◌', '135+1044|181+0');
        test('HB-DEVA-dottedcircle-2', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'र्◌्च', '135+1044|81+0|181+0|30+1299');
        test('HB-DEVA-dottedcircle-3', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'र्◌्च्छे', '135+1044|81+0|181+0|188+810|31+1435|75@-156,0+0');
        test('HB-DEVA-dottedcircle-4', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'र्◌ि', '67+530|135+1044|181+0');
        test('HB-DEVA-dottedcircle-5', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'र्◌्', '135+1044|81+0|181+0');
        test('HB-DEVA-dottedcircle-6', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'र्◌़', '135+1044|64+0|181+0');
        test('HB-DEVA-dottedcircle-7', 'NotoSans/NotoSansDevanagari-Regular.ttf', '◌्च्छे', '135+1044|81+0|188+810|31+1435|75@-156,0+0');
        test('HB-DEVA-dottedcircle-8', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'र् ', '52+838|81@-48,0+0|3+532');
      });

      describe('eyelash', function () {
        test('HB-DEVA-eyelash-1', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'त्र्क', '347+782|25+1561');
        test('HB-DEVA-eyelash-2', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'त्र्‍क', '347+782|3+0|25+1561');
        test('HB-DEVA-eyelash-3', 'NotoSans/NotoSansDevanagari-Regular.ttf', 'त्र्‌क', '269+1130|81+0|3+0|25+1561');
      });
    });

    describe('shapes Bengali text', function () {
      test('HB-BENG-1', 'NotoSans/NotoSansBengali-Regular.ttf', 'অ্য', '7+1828|198+523');
      test('HB-BENG-2', 'NotoSans/NotoSansBengali-Regular.ttf', 'ক', '19+1653');
      test('HB-BENG-3', 'NotoSans/NotoSansBengali-Regular.ttf', 'ক়', '96+1653');
      test('HB-BENG-4', 'NotoSans/NotoSansBengali-Regular.ttf', 'কি', '54+545|19+1653');
      test('HB-BENG-5', 'NotoSans/NotoSansBengali-Regular.ttf', 'ক্', '19+1653|64@-453,0+0');
      test('HB-BENG-6', 'NotoSans/NotoSansBengali-Regular.ttf', 'ক্ক', '280+1575');
      test('HB-BENG-7', 'NotoSans/NotoSansBengali-Regular.ttf', 'ক্র', '199+1905');
      test('HB-BENG-8', 'NotoSans/NotoSansBengali-Regular.ttf', 'ক্র্ক', '199+1905|64@-436,0+0|19+1653');
      test('HB-BENG-9', 'NotoSans/NotoSansBengali-Regular.ttf', 'ক্‌ক', '19+1653|64@-453,0+0|3+0|19+1653');
      test('HB-BENG-10', 'NotoSans/NotoSansBengali-Regular.ttf', 'ক্‍ক', '130+1397|3+0|19+1653');
      test('HB-BENG-11', 'NotoSans/NotoSansBengali-Regular.ttf', 'দ্য', '36+1235|198+523');
      test('HB-BENG-12', 'NotoSans/NotoSansBengali-Regular.ttf', 'ন্ক', '149+756|19+1653');
      test('HB-BENG-13', 'NotoSans/NotoSansBengali-Regular.ttf', 'ন্ধ', '360+1586');
      test('HB-BENG-14', 'NotoSans/NotoSansBengali-Regular.ttf', 'ন্ব', '260+1253');
      test('HB-BENG-15', 'NotoSans/NotoSansBengali-Regular.ttf', 'ন্য', '38+1236|198+523');
      test('HB-BENG-16', 'NotoSans/NotoSansBengali-Regular.ttf', 'ন্র', '219+1357');
      test('HB-BENG-17', 'NotoSans/NotoSansBengali-Regular.ttf', 'ন্‌ক', '38+1236|64+0|3+0|19+1653');
      test('HB-BENG-18', 'NotoSans/NotoSansBengali-Regular.ttf', 'ন্‌ধ', '38+1236|64+0|3+0|37+1221');
      test('HB-BENG-19', 'NotoSans/NotoSansBengali-Regular.ttf', 'ন্‌ব', '38+1236|64+0|3+0|41+1221');
      test('HB-BENG-20', 'NotoSans/NotoSansBengali-Regular.ttf', 'ন্‌র', '38+1236|64+0|3+0|45+1221');
      test('HB-BENG-21', 'NotoSans/NotoSansBengali-Regular.ttf', 'ন্‍ক', '149+756|3+0|19+1653');
      test('HB-BENG-22', 'NotoSans/NotoSansBengali-Regular.ttf', 'ন্‍ধ', '149+756|3+0|37+1221');
      test('HB-BENG-23', 'NotoSans/NotoSansBengali-Regular.ttf', 'ন্‍ব', '149+756|3+0|41+1221');
      test('HB-BENG-24', 'NotoSans/NotoSansBengali-Regular.ttf', 'ন্‍র', '149+756|3+0|45+1221');
      test('HB-BENG-25', 'NotoSans/NotoSansBengali-Regular.ttf', 'য্', '44+1282|64+0');
      test('HB-BENG-26', 'NotoSans/NotoSansBengali-Regular.ttf', 'র্ক', '19+1653|127@-453,0+0');
      test('HB-BENG-27', 'NotoSans/NotoSansBengali-Regular.ttf', 'র্কি', '54+545|19+1653|127@-453,0+0');
      test('HB-BENG-28', 'NotoSans/NotoSansBengali-Regular.ttf', 'র্কৌ', '446+708|19+1653|127@-453,0+0|66+545');
      test('HB-BENG-29', 'NotoSans/NotoSansBengali-Regular.ttf', 'র্ন্‍', '45+1221|64+0|38+1236|64+0|3+0');
      test('HB-BENG-30', 'NotoSans/NotoSansBengali-Regular.ttf', 'র্ব্ব', '263+2001|127+0');
      test('HB-BENG-31', 'NotoSans/NotoSansBengali-Regular.ttf', 'শ্য', '47+1386|198+523');
      test('HB-BENG-32', 'NotoSans/NotoSansBengali-Regular.ttf', 'ষ্য', '48+1296|198+523');
      test('HB-BENG-33', 'NotoSans/NotoSansBengali-Regular.ttf', 'স্য', '49+1397|198+523');
      test('HB-BENG-34', 'NotoSans/NotoSansBengali-Regular.ttf', 'ি', '54+545|575+1044');
      test('HB-BENG-35', 'NotoSans/NotoSansBengali-Regular.ttf', 'কো', '446+708|19+1653|53+545');
      test('HB-BENG-36', 'NotoSans/NotoSansBengali-Regular.ttf', 'কৌ', '446+708|19+1653|66+545');
      test('HB-BENG-37', 'NotoSans/NotoSansBengali-Regular.ttf', 'ক্র্ক', '199+1905|64@-436,0+0|19+1653');
      test('HB-BENG-38', 'NotoSans/NotoSansBengali-Regular.ttf', 'ন্‌ক', '38+1236|64+0|3+0|19+1653');
      test('HB-BENG-39', 'NotoSans/NotoSansBengali-Regular.ttf', 'ন্‌ব', '38+1236|64+0|3+0|41+1221');
      test('HB-BENG-40', 'NotoSans/NotoSansBengali-Regular.ttf', 'ন্‍ক', '149+756|3+0|19+1653');
      test('HB-BENG-41', 'NotoSans/NotoSansBengali-Regular.ttf', 'ন্‍ব', '149+756|3+0|41+1221');
      test('HB-BENG-42', 'NotoSans/NotoSansBengali-Regular.ttf', 'ন্‍র', '149+756|3+0|45+1221');
      test('HB-BENG-43', 'NotoSans/NotoSansBengali-Regular.ttf', 'র্কাং', '19+1653|127@-453,0+0|53+545|5+938');
      test('HB-BENG-44', 'NotoSans/NotoSansBengali-Regular.ttf', 'র্কাঃ', '19+1653|127@-453,0+0|53+545|6+938');
      test('HB-BENG-45', 'NotoSans/NotoSansBengali-Regular.ttf', 'র্কৌ', '446+708|19+1653|127@-453,0+0|66+545');
      test('HB-BENG-46', 'NotoSans/NotoSansBengali-Regular.ttf', 'র্ভ', '42+1476|127@-339,0+0');
      test('HB-BENG-47', 'NotoSans/NotoSansBengali-Regular.ttf', 'ৰ্ভ', '42+1476|127@-339,0+0');
      test('HB-BENG-48', 'NotoSans/NotoSansBengali-Regular.ttf', 'ৱ্ভ', '85+1221|64+0|42+1476');
      test('HB-BENG-49', 'NotoSans/NotoSansBengali-Regular.ttf', 'অৗ', '7+1828|66+545');
      test('HB-BENG-50', 'NotoSans/NotoSansBengali-Regular.ttf', 'ন্ত্র', '365+1403');
      test('HB-BENG-51', 'NotoSans/NotoSansBengali-Regular.ttf', 'ত্যু', '34+1447|518@-222,0+0|198+523');
      test('HB-BENG-52', 'NotoSans/NotoSansBengali-Regular.ttf', 'চ্য্র', '135+1014|225+1408');
      test('HB-BENG-53', 'NotoSans/NotoSansBengali-Regular.ttf', 'ক্‍ষ', '130+1397|3+0|48+1296');
    });

    describe('shapes Gurmukhi text', function () {
      test('HB-GURU-1', 'NotoSans/NotoSansGurmukhi-Regular.ttf', 'ਕ੍ਹ', '17+1273|111@75,0+0');
      test('HB-GURU-2', 'NotoSans/NotoSansGurmukhi-Regular.ttf', 'ਤ੍ਯੋ', '32+1110|175+1363|58+0');
    });

    describe('shapes Gujarati text', function () {
      test('HB-GURU-1', 'NotoSans/NotoSansGujarati-Regular.ttf', 'ગ્ષ', '132+839|52+1183');
      test('HB-GURU-1', 'NotoSans/NotoSansGujarati-Regular.ttf', 'ગ્સ', '132+839|53+1457');
      test('HB-GURU-1', 'NotoSans/NotoSansGujarati-Regular.ttf', 'ગ્હ', '132+839|54+1296');
      test('HB-GURU-1', 'NotoSans/NotoSansGujarati-Regular.ttf', 'ઘ્ક', '133+899|21+1047');
      test('HB-GURU-1', 'NotoSans/NotoSansGujarati-Regular.ttf', 'ઘ્ખ', '133+899|22+1528');
      test('HB-GURU-1', 'NotoSans/NotoSansGujarati-Regular.ttf', 'ઘ્ગ', '133+899|23+1339');
      test('HB-GURU-1', 'NotoSans/NotoSansGujarati-Regular.ttf', 'ઘ્ઘ', '133+729|24+1271');
      test('HB-GURU-1', 'NotoSans/NotoSansGujarati-Regular.ttf', 'ઘ્ઙ', '133+899|25+1004');
      test('HB-GURU-1', 'NotoSans/NotoSansGujarati-Regular.ttf', 'ઘ્ચ', '133+899|26+1353');
      test('HB-GURU-1', 'NotoSans/NotoSansGujarati-Regular.ttf', 'ઘ્છ', '133+899|27+1512');
      test('HB-GURU-1', 'NotoSans/NotoSansGujarati-Regular.ttf', 'ઘ્જ', '133+899|28+1786');
      test('HB-GURU-1', 'NotoSans/NotoSansGujarati-Regular.ttf', 'ઘ્ઝ', '133+899|29+1430');
      test('HB-GURU-1', 'NotoSans/NotoSansGujarati-Regular.ttf', 'ઘ્ઞ', '133+899|30+1417');
      test('HB-GURU-1', 'NotoSans/NotoSansGujarati-Regular.ttf', 'ઘ્ટ', '133+899|31+923');
      test('HB-GURU-1', 'NotoSans/NotoSansGujarati-Regular.ttf', 'ઘ્ઠ', '133+899|32+1059');
      test('HB-GURU-1', 'NotoSans/NotoSansGujarati-Regular.ttf', 'ઘ્ડ', '133+899|33+986');
      test('HB-GURU-1', 'NotoSans/NotoSansGujarati-Regular.ttf', 'ઘ્ઢ', '133+899|34+1056');
      test('HB-GURU-1', 'NotoSans/NotoSansGujarati-Regular.ttf', 'ઘ્ણ', '133+899|35+1683');
      test('HB-GURU-1', 'NotoSans/NotoSansGujarati-Regular.ttf', 'ઘ્ત', '133+899|36+1173');
      test('HB-GURU-1', 'NotoSans/NotoSansGujarati-Regular.ttf', 'ઘ્થ', '133+899|37+1280');
      test('HB-GURU-1', 'NotoSans/NotoSansGujarati-Regular.ttf', 'ઘ્દ', '133+899|38+956');
    });

    describe('shapes Malayalam text', function () {
      test('HB-MLYM-1', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'അൎത്ഥം', '6+3058|180+3448|73@-2606,0+0|4+927');
      test('HB-MLYM-2', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'അഥൎവ്വം', '6+3058|36+1835|208+1963|73@-1864,0+0|4+927');
      test('HB-MLYM-3', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'ക്‍', '101+2470');
      test('HB-MLYM-4', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'കായ്‌കറി', '20+2125|59+1033|46+2120|72+0|3+0|20+2125|48+1381|60+467');
      test('HB-MLYM-5', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'കാര്‍ക്കോടകന്‍', '20+2125|59+1033|98+1507|67+1219|147+3085|59+1033|30+1152|20+2125|97+2173');
      test('HB-MLYM-6', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'കുറ്റ്യാടി', '20+2125|62+679|203+1271|229+697|59+1033|30+1152|60+467');
      test('HB-MLYM-7', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'കെ', '66+1465|20+2125');
      test('HB-MLYM-8', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'കേ', '67+1219|20+2125');
      test('HB-MLYM-9', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'കൈ', '68+2935|20+2125');
      test('HB-MLYM-10', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'കൊ', '66+1465|20+2125|59+1033');
      test('HB-MLYM-11', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'കോ', '67+1219|20+2125|59+1033');
      test('HB-MLYM-12', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'കൌ', '66+1465|20+2125|74+1555');
      test('HB-MLYM-13', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'ക്കെ', '66+1465|147+3085');
      test('HB-MLYM-14', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'ക്കൊ', '66+1465|147+3085|59+1033');
      test('HB-MLYM-15', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'ക്ത്ര', '146+409|148+3707');
      test('HB-MLYM-16', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'ക്യ', '20+2125|144+497');
      test('HB-MLYM-17', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'ക്വ', '20+2125|145+467');
      test('HB-MLYM-18', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'ഖ്യ', '21+2047|144+497');
      test('HB-MLYM-19', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'ഖ്ര', '146+469|21+2047');
      test('HB-MLYM-20', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'ഗ്ദ്ധ്രോ', '22+1837|72+0|67+1219|146+444|183+2428|59+1033');
      test('HB-MLYM-21', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'ട്ട', '167+1152');
      test('HB-MLYM-22', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'ട്ടു്', '167+1206|225+719|72+0');
      test('HB-MLYM-23', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'ണ്‍', '96+3110');
      test('HB-MLYM-24', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'ണ്ട', '174+2995');
      test('HB-MLYM-25', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'ത്ത', '179+3603');
      test('HB-MLYM-26', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'ത്തെ', '66+1465|179+3603');
      test('HB-MLYM-27', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'ത്തൊ', '66+1465|179+3603|59+1033');
      test('HB-MLYM-28', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'ദ്ദ', '182+1310');
      test('HB-MLYM-29', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'ന്‍', '97+2173');
      test('HB-MLYM-30', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'ന്ത', '189+2734');
      test('HB-MLYM-31', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'ന്ത്യ', '189+2734|144+497');
      test('HB-MLYM-32', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'ന്ത്ര്യ', '146+499|189+2734|144+497');
      test('HB-MLYM-33', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'പ്ര', '146+420|41+1835');
      test('HB-MLYM-34', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'പ്ലോ', '67+1219|192+1835|59+1033');
      test('HB-MLYM-35', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'മുഖ്യമന്ത്രി', '45+1485|62+679|21+2047|144+497|45+1485|146+499|189+2734|60+467');
      test('HB-MLYM-36', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'മ്പ', '199+2447');
      test('HB-MLYM-37', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'യാത്രാകൂലി', '46+2120|59+1033|146+475|35+2077|59+1033|20+2125|63+679|49+1759|60+467');
      test('HB-MLYM-38', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'യും', '46+2050|62+659|4+927');
      test('HB-MLYM-39', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'യ്ക്കു', '46+2120|72+0|147+3010|62+679');
      test('HB-MLYM-40', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'യ്യ', '202+2120');
      test('HB-MLYM-41', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'ര്', '47+1507|72+0');
      test('HB-MLYM-42', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'ര്‍', '98+1507');
      test('HB-MLYM-43', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'ര്ക', '47+1507|72+0|20+2125');
      test('HB-MLYM-44', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'ര്യ', '47+1507|144+497');
      test('HB-MLYM-45', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'ര്‍വ്വ', '98+1507|208+1963');
      test('HB-MLYM-46', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'ല്‍', '99+2454');
      test('HB-MLYM-47', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'ല്യ', '49+1759|144+497');
      test('HB-MLYM-48', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'ല്ല', '205+1759');
      test('HB-MLYM-49', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'ല്ലാം', '205+1759|59+1033|4+927');
      test('HB-MLYM-50', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'വ്വ', '208+1963');
      test('HB-MLYM-51', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'ഷ്ട്രീ', '54+2354|72+0|146+519|30+1152|61+467');
      test('HB-MLYM-52', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'സോഫ്റ്റ്‌വെയര്‍', '67+1219|55+2505|59+1033|42+2312|72+0|203+1381|72+0|3+0|66+1465|52+1963|46+2120|98+1507');
      test('HB-MLYM-53', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'സ്പ്രി', '55+2505|72+0|146+420|41+1835|60+467');
      test('HB-MLYM-54', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'സ്പ്രേ', '55+2505|72+0|67+1219|146+420|41+1835');
      test('HB-MLYM-55', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'സ്പ്ലേ', '55+2505|72+0|67+1219|192+1835');
      test('HB-MLYM-56', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'സ്വാതന്ത്ര്യം', '55+2505|145+467|59+1033|35+2077|146+499|189+2734|144+497|4+927');
      test('HB-MLYM-57', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'ഹാര്‍ഡ്‌വെയര്‍', '56+2437|59+1033|98+1507|32+2505|72+0|3+0|66+1465|52+1963|46+2120|98+1507');
      test('HB-MLYM-58', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'ള്‍', '100+2139');
      test('HB-MLYM-59', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'ള്യം', '50+1466|229+697|4+927');
      test('HB-MLYM-60', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'ള്ള', '206+2906');
      test('HB-MLYM-61', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'ല്‍പ്പേ', '99+2454|67+1219|191+1836');
      test('HB-MLYM-62', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'ശിം‌', '53+2130|60+467|3+0|4+927');
      test('HB-MLYM-63', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'കോം‌', '67+1219|20+2125|59+1033|3+0|4+927');
      test('HB-MLYM-64', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'യ‍്യ', '46+2120|3+0|144+497');
      test('HB-MLYM-65', 'NotoSans/NotoSansMalayalam-Regular.ttf', 'സ്റ്റ്', '214+2505|72+0');
    });

    describe('shapes Oriya text', function () {
      test('HB-ORYA-1', 'NotoSans/NotoSansOriya-Regular.ttf', 'କ୍ତ୍ର', '165+1354|527@-225,0+0');
      test('HB-ORYA-2', 'NotoSans/NotoSansOriya-Regular.ttf', 'ତ୍ତ୍ବ', '195+1397|150@-333,0+0');
      test('HB-ORYA-3', 'NotoSans/NotoSansOriya-Regular.ttf', 'ନ୍ତ୍ବ', '206+1298|525@-280,0+0');
      test('HB-ORYA-4', 'NotoSans/NotoSansOriya-Regular.ttf', 'ନ୍ତ୍ର', '38+1298|161@-280,0+0');
      test('HB-ORYA-5', 'NotoSans/NotoSansOriya-Regular.ttf', 'ନ୍ତ୍ର୍ଯ', '38+1298|161@-280,0+0|162+768');
      test('HB-ORYA-6', 'NotoSans/NotoSansOriya-Regular.ttf', 'ସ୍ତ୍ର', '51+1317|161+0');
      test('HB-ORYA-7', 'NotoSans/NotoSansOriya-Regular.ttf', 'ମୁଁ', '43+1327|4+0|58+0');
      test('HB-ORYA-8', 'NotoSans/NotoSansOriya-Regular.ttf', 'ମୁଂ', '43+1327|58+0|5+618');
    });

    describe('shapes Khmer text', function () {
      test('HB-KHMR-1', 'NotoSans/NotoSansKhmer-Regular.ttf', 'ខ្មែ', '108+588|45+1300|169+0');
      test('HB-KHMR-2', 'NotoSans/NotoSansKhmer-Regular.ttf', 'ជា', '51+1300|96+588');
      test('HB-KHMR-3', 'NotoSans/NotoSansKhmer-Regular.ttf', 'ថ្ងៃ', '109+588|60+1300|148+0');
      test('HB-KHMR-4', 'NotoSans/NotoSansKhmer-Regular.ttf', 'មា', '68+1300|96+588');
      test('HB-KHMR-5', 'NotoSans/NotoSansKhmer-Regular.ttf', 'ម្ពុ', '68+1300|167+0|177+0');
      test('HB-KHMR-6', 'NotoSans/NotoSansKhmer-Regular.ttf', 'រ', '70+588');
      test('HB-KHMR-7', 'NotoSans/NotoSansKhmer-Regular.ttf', 'រី', '70+588|194+0');
      test('HB-KHMR-8', 'NotoSans/NotoSansKhmer-Regular.ttf', 'រ៍', '70+588|199+0');
      test('HB-KHMR-9', 'NotoSans/NotoSansKhmer-Regular.ttf', 'សៅ', '107+588|75+1900|111+588');
      test('HB-KHMR-10', 'NotoSans/NotoSansKhmer-Regular.ttf', 'រ្ឥ', '70+588|124+0|81+1300');
      test('HB-KHMR-11', 'NotoSans/NotoSansKhmer-Regular.ttf', 'ងឹ្ឈ', '48+1300|99+0|152+588');
      test('HB-KHMR-12', 'NotoSans/NotoSansKhmer-Regular.ttf', 'ង្ឈឹ', '48+1300|152+588|99+0');
      test('HB-KHMR-13', 'NotoSans/NotoSansKhmer-Regular.ttf', 'ង្គ្រ', '189+588|48+1300|146+0');
      test('HB-KHMR-14', 'NotoSans/NotoSansKhmer-Regular.ttf', 'ង្រ្គ', '189+588|48+1300|146+0');
      test('HB-KHMR-15', 'NotoSans/NotoSansKhmer-Regular.ttf', 'ម៉្លេះ', '107+588|68+1300|115+0|172+0|113+850');
      test('HB-KHMR-16', 'NotoSans/NotoSansKhmer-Regular.ttf', 'ម‌៉្លេះ', '107+588|68+1300|3+0|115+0|172+0|113+850');
      test('HB-KHMR-17', 'NotoSans/NotoSansKhmer-Regular.ttf', 'ប៊័', '64+1300|116+0|122+0');
      test('HB-KHMR-18', 'NotoSans/NotoSansKhmer-Regular.ttf', 'នែ៎', '108+588|63+1300|120+0');
      test('HB-KHMR-19', 'NotoSans/NotoSansKhmer-Regular.ttf', 'កេ្រ', '107+588|171+588|44+1300');
      test('HB-KHMR-20', 'NotoSans/NotoSansKhmer-Regular.ttf', 'កៀ្រ', '171+588|107+588|44+1300|106+588');
      test('HB-KHMR-21', 'NotoSans/NotoSansKhmer-Regular.ttf', 'កោ្រ', '171+588|107+588|44+1300|110+588');
      test('HB-KHMR-22', 'NotoSans/NotoSansKhmer-Regular.ttf', 'កៅ្រ', '171+588|107+588|44+1300|111+588');
      test('HB-KHMR-23', 'NotoSans/NotoSansKhmer-Regular.ttf', 'ព៑ា', '66+1300|123+0|96+588');

      test('decomposes split matras', 'NotoSans/NotoSansKhmer-Regular.ttf', 'ដើម្បីឲ្យបានកាន់តែប្រសើរឡើងសម្រាប់ការធ្វើដំណើររបស់ភ្ញៀវទេសចរណ៍', '107+588|54+1300|104+0|68+1300|165+588|98+0|94+1300|170+588|188+1300|96+588|63+1300|44+1300|96+588|63+1300|117+0|108+588|59+1300|171+588|64+1300|107+588|75+1900|104+0|70+588|107+588|77+1900|104+0|48+1300|75+1900|171+588|68+1300|96+588|64+1300|117+0|44+1300|96+588|70+588|107+588|62+1300|173+0|104+0|54+1300|112+0|107+588|58+2538|104+0|70+588|70+588|64+1300|75+1900|117+0|107+588|67+1300|153+0|192+588|72+588|107+588|61+1300|75+1900|49+1300|70+588|58+2538|119+0');
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
