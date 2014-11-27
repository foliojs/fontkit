fontkit = require '../'
assert = require 'assert'

describe 'glyphs', ->
  describe 'truetype glyphs', ->
    font = fontkit.openSync __dirname + '/data/Skia.ttf'
    
    it 'should get a TTFGlyph', ->
      glyph = font.getGlyph 68 # D
      assert.equal glyph.constructor.name, 'TTFGlyph'
      
    it 'should get a path for the glyph', ->
      glyph = font.getGlyph 68
      assert.equal glyph.path.toSVG(), 'M1354 -662Q1354 -486 1267.5 -353Q1181 -220 1043 -139Q923 -68 775.5 -31Q628 6 444 6Q374 6 307 4Q240 2 233 2Q233 -3 235.5 -228.5Q238 -454 238 -656Q238 -763 237.5 -931Q237 -1099 233 -1339Q243 -1339 324.5 -1340Q406 -1341 412 -1341Q619 -1341 779.5 -1304Q940 -1267 1066 -1187Q1212 -1094 1283 -963.5Q1354 -833 1354 -662M1183 -663Q1183 -793 1127 -899Q1071 -1005 950 -1081Q837 -1152 699.5 -1180Q562 -1208 450 -1208Q436 -1208 419 -1208Q402 -1208 398 -1208Q396 -1050 395.5 -946Q395 -842 395 -780Q395 -736 395.5 -574.5Q396 -413 397 -127Q411 -127 422.5 -127Q434 -127 448 -127Q578 -127 709 -157.5Q840 -188 930 -242Q1044 -310 1113.5 -414.5Q1183 -519 1183 -663Z'
      
    it 'should get the glyph cbox', ->
      glyph = font.getGlyph 68
      assert.deepEqual glyph.cbox, [ 233, -6, 1354, -1341 ]
      
    it 'should get the glyph bbox', ->
      glyph = font.getGlyph 68
      assert.deepEqual glyph.bbox, [ 233, -1341, 1354, 6 ]

    it 'should get a composite glyph', ->
      glyph = font.getGlyph 142 # é
      assert.equal glyph.path.toSVG(), 'M963 -543L240 -543Q241 -437 285 -348.5Q329 -260 420 -202Q478 -165 552 -146.5Q626 -128 730 -128Q787 -128 834.5 -131Q882 -134 893 -135L875 -2Q867 -1 822 1.5Q777 4 716 4Q556 4 437.5 -37.5Q319 -79 243 -152Q178 -213 132.5 -308Q87 -403 87 -519Q87 -633 121 -725Q155 -817 223 -896Q282 -964 369.5 -1001Q457 -1038 551 -1038Q644 -1038 716 -1010Q788 -982 841 -925Q900 -861 931 -767.5Q962 -674 963 -543M808 -655Q792 -779 723.5 -849.5Q655 -920 543 -920Q431 -920 356 -848.5Q281 -777 252 -655L808 -655M891 -1363L452 -1131L392 -1224L821 -1476L891 -1363Z'

  describe 'CFF glyphs', ->
    font = fontkit.openSync __dirname + '/data/ACaslonPro-Regular.otf'
    
    it 'should get a CFFGlyph', ->
      glyph = font.getGlyph 4 # D
      assert.equal glyph.constructor.name, 'CFFGlyph'

    it 'should get a path for the glyph', ->
      glyph = font.getGlyph 4
      assert.equal glyph.path.toSVG(), 'M143 -384C143 -306 139 -81 136 -60C134 -44 123 -36 104 -36L37 -36C32 -36 29 -34 29 -30L29 -4C29 1 31 3 36 3C50 3 90 0 177 0C222 0 298 0 361 0C438 0 576 0 672 -106C738 -178 771 -254 771 -369C771 -485 725 -568 660 -624C572 -699 464 -714 335 -714C312 -714 212 -711 186 -711C96 -711 52 -711 39 -711C35 -711 32 -710 32 -706L32 -679C32 -673 35 -672 40 -672L95 -672C122 -672 135 -668 138 -644C140 -627 143 -485 143 -459M235 -433C235 -449 235 -580 236 -622C237 -644 241 -660 255 -669C272 -679 313 -679 335 -679C446 -679 534 -640 586 -583C634 -530 668 -440 668 -362C668 -271 637 -189 595 -137C545 -73 462 -29 360 -29C310 -29 270 -40 254 -61C241 -81 237 -97 237 -117C236 -179 235 -349 235 -362Z'

    it 'should get the glyph cbox', ->
      glyph = font.getGlyph 4
      assert.deepEqual glyph.cbox, [ 29, -714, 771, 3 ]
      
    it 'should get the glyph bbox', ->
      glyph = font.getGlyph 4
      assert.deepEqual glyph.bbox, [ 29, -714, 771, 3 ]
