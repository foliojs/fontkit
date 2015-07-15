fontkit = require '../'
assert = require 'assert'
BBox = require '../src/glyph/BBox'

describe 'glyphs', ->
  describe 'truetype glyphs', ->
    font = fontkit.openSync __dirname + '/data/OpenSans/OpenSans-Regular.ttf'
    
    it 'should get a TTFGlyph', ->
      glyph = font.getGlyph 39 # D
      assert.equal glyph.constructor.name, 'TTFGlyph'
      
    it 'should get a path for the glyph', ->
      glyph = font.getGlyph 39
      assert.equal glyph.path.toSVG(), 'M1368 745Q1368 383 1171.5 191.5Q975 0 606 0L201 0L201 1462L649 1462Q990 1462 1179 1273Q1368 1084 1368 745M1188 739Q1188 1025 1044.5 1170Q901 1315 618 1315L371 1315L371 147L578 147Q882 147 1035 296.5Q1188 446 1188 739Z'
      
    it 'should get a composite glyph', ->
      glyph = font.getGlyph 171 # é
      assert.equal glyph.path.toSVG(), 'M639 -20Q396 -20 255.5 128Q115 276 115 539Q115 804 245.5 960Q376 1116 596 1116Q802 1116 922 980.5Q1042 845 1042 623L1042 518L287 518Q292 325 384.5 225Q477 125 645 125Q822 125 995 199L995 51Q907 13 828.5 -3.5Q750 -20 639 -20M594 977Q462 977 383.5 891Q305 805 291 653L864 653Q864 810 794 893.5Q724 977 594 977M471 1266Q519 1328 574.5 1416Q630 1504 662 1569L864 1569L864 1548Q820 1483 733 1388Q646 1293 582 1241L471 1241L471 1266Z'
      
    it 'should get the glyph cbox', ->
      glyph = font.getGlyph 39
      assert.deepEqual glyph.cbox, new BBox 201, 0, 1368, 1462
      
    it 'should get the glyph bbox', ->
      glyph = font.getGlyph 39
      assert.deepEqual glyph.bbox, new BBox 201, 0, 1368, 1462
      
    it 'should get the advance width', ->
      glyph = font.getGlyph 39
      assert.equal glyph.advanceWidth | 0, 1493

  describe 'CFF glyphs', ->
    font = fontkit.openSync __dirname + '/data/SourceSansPro/SourceSansPro-Regular.otf'
    
    it 'should get a CFFGlyph', ->
      glyph = font.getGlyph 5 # D
      assert.equal glyph.constructor.name, 'CFFGlyph'

    it 'should get a path for the glyph', ->
      glyph = font.getGlyph 5
      assert.equal glyph.path.toSVG(), 'M90 0L258 0C456 0 564 122 564 331C564 539 456 656 254 656L90 656M173 68L173 588L248 588C401 588 478 496 478 331C478 165 401 68 248 68Z'

    it 'should get the glyph cbox', ->
      glyph = font.getGlyph 5
      assert.deepEqual glyph.cbox, new BBox 90, 0, 564, 656
      
    it 'should get the glyph bbox', ->
      glyph = font.getGlyph 5
      assert.deepEqual glyph.bbox, new BBox 90, 0, 564, 656

  describe 'SBIX glyphs', ->
    font = fontkit.openSync __dirname + '/data/ss-emoji/ss-emoji-apple.ttf'
    
    it 'should get an SBIXGlyph', ->
      glyph = font.glyphsForString('😜')[0]
      assert.equal glyph.constructor.name, 'SBIXGlyph'
      
    it 'should have an empty path', ->
      glyph = font.glyphsForString('😜')[0]
      assert.equal glyph.path.toSVG(), 'M0 2048M2055 -7Z'
      
    it 'should get an image', ->
      glyph = font.glyphsForString('😜')[0]
      image = glyph.getImageForSize 32
      assert.deepEqual image,
        originX: 0
        originY: 0
        type: 'png '
        data: image.data
        
  describe 'COLR glyphs', ->
    font = fontkit.openSync __dirname + '/data/ss-emoji/ss-emoji-microsoft.ttf'
    
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
    font = fontkit.openSync __dirname + '/data/SourceSansPro/SourceSansPro-Regular.woff'
    
    it 'should get a TTFGlyph', ->
      glyph = font.glyphsForString('T')[0]
      assert.equal glyph.constructor.name, 'TTFGlyph'
      
    it 'should get a path for the glyph', ->
      glyph = font.glyphsForString('T')[0]      
      assert.equal glyph.path.toSVG(), 'M226 586L28 586L28 656L508 656L508 586L310 586L310 0L226 0L226 586Z'
      
  describe 'WOFF2 glyph', ->
    font = fontkit.openSync __dirname + '/data/SourceSansPro/SourceSansPro-Regular.woff2'
    
    it 'should get a WOFF2Glyph', ->
      glyph = font.glyphsForString('T')[0]
      assert.equal glyph.constructor.name, 'WOFF2Glyph'

    it 'should get a path for the glyph', ->
      glyph = font.glyphsForString('T')[0]      
      assert.equal glyph.path.toSVG(), 'M226 586L28 586L28 656L508 656L508 586L310 586L310 0L226 0L226 586Z'

    it 'should get the glyph cbox', ->
      glyph = font.glyphsForString('T')[0]
      assert.deepEqual glyph.cbox, new BBox 28, 0, 508, 656

    it 'should get the glyph bbox', ->
      glyph = font.glyphsForString('T')[0]
      assert.deepEqual glyph.bbox, new BBox 28, 0, 508, 656
