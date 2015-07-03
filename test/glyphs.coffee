fontkit = require '../'
assert = require 'assert'
BBox = require '../src/glyph/BBox'

describe 'glyphs', ->
  describe 'truetype glyphs', ->
    font = fontkit.openSync __dirname + '/data/Skia.ttf'
    
    it 'should get a TTFGlyph', ->
      glyph = font.getGlyph 68 # D
      assert.equal glyph.constructor.name, 'TTFGlyph'
      
    it 'should get a path for the glyph', ->
      glyph = font.getGlyph 68
      assert.equal glyph.path.toSVG(), 'M1354 662Q1354 486 1267.5 353Q1181 220 1043 139Q923 68 775.5 31Q628 -6 444 -6Q374 -6 307 -4Q240 -2 233 -2Q233 3 235.5 228.5Q238 454 238 656Q238 763 237.5 931Q237 1099 233 1339Q243 1339 324.5 1340Q406 1341 412 1341Q619 1341 779.5 1304Q940 1267 1066 1187Q1212 1094 1283 963.5Q1354 833 1354 662M1183 663Q1183 793 1127 899Q1071 1005 950 1081Q837 1152 699.5 1180Q562 1208 450 1208Q436 1208 419 1208Q402 1208 398 1208Q396 1050 395.5 946Q395 842 395 780Q395 736 395.5 574.5Q396 413 397 127Q411 127 422.5 127Q434 127 448 127Q578 127 709 157.5Q840 188 930 242Q1044 310 1113.5 414.5Q1183 519 1183 663Z'
      
    it 'should get a composite glyph', ->
      glyph = font.getGlyph 142 # é      
      assert.equal glyph.path.toSVG(), 'M963 543L240 543Q241 437 285 348.5Q329 260 420 202Q478 165 552 146.5Q626 128 730 128Q787 128 834.5 131Q882 134 893 135L875 2Q867 1 822 -1.5Q777 -4 716 -4Q556 -4 437.5 37.5Q319 79 243 152Q178 213 132.5 308Q87 403 87 519Q87 633 121 725Q155 817 223 896Q282 964 369.5 1001Q457 1038 551 1038Q644 1038 716 1010Q788 982 841 925Q900 861 931 767.5Q962 674 963 543M808 655Q792 779 723.5 849.5Q655 920 543 920Q431 920 356 848.5Q281 777 252 655L808 655M891 1363L452 1131L392 1224L821 1476L891 1363Z'
      
    it 'should get the glyph cbox', ->
      glyph = font.getGlyph 68
      assert.deepEqual glyph.cbox, new BBox 233, -6, 1354, 1341
      
    it 'should get the glyph bbox', ->
      glyph = font.getGlyph 68
      assert.deepEqual glyph.bbox, new BBox 233, -6, 1354, 1341
      
    it 'should get the advance width', ->
      glyph = font.getGlyph 68
      assert.equal glyph.advanceWidth | 0, 1497

  describe 'CFF glyphs', ->
    font = fontkit.openSync __dirname + '/data/ACaslonPro-Regular.otf'
    
    it 'should get a CFFGlyph', ->
      glyph = font.getGlyph 4 # D
      assert.equal glyph.constructor.name, 'CFFGlyph'

    it 'should get a path for the glyph', ->
      glyph = font.getGlyph 4
      assert.equal glyph.path.toSVG(), 'M143 384C143 306 139 81 136 60C134 44 123 36 104 36L37 36C32 36 29 34 29 30L29 4C29 -1 31 -3 36 -3C50 -3 90 0 177 0C222 0 298 0 361 0C438 0 576 0 672 106C738 178 771 254 771 369C771 485 725 568 660 624C572 699 464 714 335 714C312 714 212 711 186 711C96 711 52 711 39 711C35 711 32 710 32 706L32 679C32 673 35 672 40 672L95 672C122 672 135 668 138 644C140 627 143 485 143 459M235 433C235 449 235 580 236 622C237 644 241 660 255 669C272 679 313 679 335 679C446 679 534 640 586 583C634 530 668 440 668 362C668 271 637 189 595 137C545 73 462 29 360 29C310 29 270 40 254 61C241 81 237 97 237 117C236 179 235 349 235 362Z'

    it 'should get the glyph cbox', ->
      glyph = font.getGlyph 4
      assert.deepEqual glyph.cbox, new BBox 29, -3, 771, 714
      
    it 'should get the glyph bbox', ->
      glyph = font.getGlyph 4
      assert.deepEqual glyph.bbox, new BBox 29, -3, 771, 714

  describe 'SBIX glyphs', ->
    font = fontkit.openSync __dirname + '/data/Apple Color Emoji.ttf'
    
    it 'should get an SBIXGlyph', ->
      glyph = font.glyphsForString('😜')[0]
      assert.equal glyph.constructor.name, 'SBIXGlyph'
      
    it 'should have an empty path', ->
      glyph = font.glyphsForString('😜')[0]
      assert.equal glyph.path.toSVG(), 'M0 0M800 800Z'
      
    it 'should get an image', ->
      glyph = font.glyphsForString('😜')[0]
      image = glyph.getImageForSize 32
      assert.deepEqual image,
        originX: 0
        originY: 0
        type: 'png '
        data: image.data
        
  describe 'COLR glyphs', ->
    font = fontkit.openSync __dirname + '/data/ss-emoji-microsoft.ttf'
    
    it 'should get an SBIXGlyph', ->
      glyph = font.glyphsForString('😜')[0]
      assert.equal glyph.constructor.name, 'COLRGlyph'
      
    it 'should get layers', ->
      glyph = font.glyphsForString('😜')[0]
      assert.deepEqual glyph.layers, [
        { glyph: font.getGlyph(247), color: { red: 252, green: 194, blue: 0, alpha: 255 }},
        { glyph: font.getGlyph(248), color: { red: 159, green: 79, blue: 0, alpha: 255 }},
        { glyph: font.getGlyph(249), color: { red: 229, green: 65, blue: 65, alpha: 255 }}
      ]
      
    it 'should get empty path', ->
      glyph = font.glyphsForString('😜')[0]
      assert.equal glyph.path.toSVG(), ''
      
    it 'should get bbox', ->
      glyph = font.glyphsForString('😜')[0]
      assert.deepEqual glyph.bbox, new BBox 0, 0, 2048, 2048
      
  describe 'WOFF glyphs', ->
    font = fontkit.openSync __dirname + '/data/MuseoSans.woff'
    
    it 'should get a TTFGlyph', ->
      glyph = font.glyphsForString('T')[0]
      assert.equal glyph.constructor.name, 'TTFGlyph'
      
    it 'should get a path for the glyph', ->
      glyph = font.glyphsForString('T')[0]      
      assert.equal glyph.path.toSVG(), 'M5 620L5 706L588 706L588 620L346 620L346 0L247 0L247 620L5 620Z'
      
  describe 'WOFF2 glyph', ->
    font = fontkit.openSync __dirname + '/data/BigCaslon.woff2'
    
    it 'should get a WOFF2Glyph', ->
      glyph = font.glyphsForString('T')[0]
      assert.equal glyph.constructor.name, 'WOFF2Glyph'

    it 'should get a path for the glyph', ->
      glyph = font.glyphsForString('T')[0]      
      assert.equal glyph.path.toSVG(), 'M750 535L718 730Q695 723 673.5 718.5Q652 714 619 713Q581 713 551 712.5Q521 712 493 711.5Q465 711 435 711Q406 711 369 711Q332 711 302 711Q273 711 245 711Q217 711 187 711.5Q157 712 119 713Q82 714 62.5 717Q43 720 20 725L-10 535L-1 532Q5 550 15.5 569Q26 588 37.5 604.5Q49 621 59.5 635Q70 649 78 656Q99 676 123.5 684Q148 692 186 693Q205 693 219.5 693.5Q234 694 247 694Q261 694 276 694Q292 694 313 694L313 363Q313 336 313 306Q313 276 312.5 248Q312 220 311.5 197Q311 174 311 160Q311 144 310.5 127Q310 110 308.5 95.5Q307 81 304.5 69.5Q302 58 297 53Q274 27 250 20Q226 13 200 10L200 0L525 0L525 10Q503 14 475.5 22Q448 30 433 52Q425 63 423.5 89.5Q422 116 422 145L422 367Q422 398 422 443Q422 489 422 536Q422 583 422.5 626Q423 669 423 694Q445 694 460 694Q476 694 489 694Q503 694 517 693.5Q531 693 550 693Q588 692 612.5 685.5Q637 679 658 659Q666 652 677 637.5Q688 623 699.5 606Q711 589 722 569.5Q733 550 741 532L750 535Z'

    it 'should get the glyph cbox', ->
      glyph = font.glyphsForString('T')[0]
      assert.deepEqual glyph.cbox, new BBox -10, 0, 750, 730

    it 'should get the glyph bbox', ->
      glyph = font.glyphsForString('T')[0]
      assert.deepEqual glyph.bbox, new BBox -10, 0, 750, 730
