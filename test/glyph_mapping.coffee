fontkit = require '../'
assert = require 'assert'

describe 'character to glyph mapping', ->
  describe 'basic cmap handling', ->
    font = fontkit.openSync __dirname + '/data/OpenSans/OpenSans-Regular.ttf'
    
    it 'should get characterSet', ->
      assert Array.isArray(font.characterSet)
      assert.equal font.characterSet.length, 884
      
    it 'should check if a character is supported', ->
      assert font.hasGlyphForCodePoint 'a'.charCodeAt()
      assert !font.hasGlyphForCodePoint 0
      
    it 'should get a glyph for a character code', ->
      glyph = font.glyphForCodePoint 'a'.charCodeAt()
      assert.equal glyph.id, 68
      assert.deepEqual glyph.codePoints, [97]
      
    it 'should map a string to glyphs', ->
      glyphs = font.glyphsForString 'hello', []
      assert Array.isArray glyphs
      assert.equal glyphs.length, 5
      assert.deepEqual glyphs.map((g) -> g.id), [75, 72, 79, 79, 82]
      assert.deepEqual glyphs.map((g) -> g.codePoints), [[104], [101], [108], [108], [111]]
      
  describe 'opentype features', ->
    font = fontkit.openSync __dirname + '/data/SourceSansPro/SourceSansPro-Regular.otf'
    
    it 'should list available features', ->
      assert.deepEqual font.availableFeatures, [
        'aalt', 'c2sc', 'case', 'ccmp', 'dnom', 'frac', 'liga', 'numr',
        'onum', 'ordn', 'pnum', 'salt', 'sinf', 'smcp', 'ss01', 'ss02',
        'ss03', 'ss04', 'ss05', 'subs', 'sups', 'zero', 'kern', 'mark',
        'mkmk', 'size'
      ]

    it 'should apply opentype GSUB features', ->
      {glyphs} = font.layout 'ffi 1/2', ['liga', 'dlig', 'frac']
      assert.equal glyphs.length, 6
      assert.deepEqual glyphs.map((g) -> g.id), [ 514, 36, 1, 1617, 1726, 1604 ]
      assert.deepEqual glyphs.map((g) -> g.codePoints), [[102, 102], [105], [32], [49], [47], [50]]
      
    it 'should enable fractions when using fraction slash', ->
      {glyphs} = font.layout '123 1⁄16 123'
      assert.deepEqual glyphs.map((g) -> g.id), [ 1088, 1089, 1090, 1, 1617, 1724, 1603, 1608, 1, 1088, 1089, 1090 ]
                    
  describe 'AAT features', ->
    font = fontkit.openSync __dirname + '/data/Play/Play-Regular.ttf'
    
    it 'should list available features', ->
      assert.deepEqual font.availableFeatures, [ 'tnum', 'sups', 'subs', 'numr', 'onum', 'lnum', 'liga', 'kern' ]

    it 'should apply default AAT morx features', ->
      {glyphs} = font.layout 'ffi 1⁄2'
      assert.equal glyphs.length, 5
      assert.deepEqual glyphs.map((g) -> g.id), [ 767, 3, 20, 645, 21 ]
      assert.deepEqual glyphs.map((g) -> g.codePoints), [[102, 102, 105], [32], [49], [8260], [50]]
            
    it 'should apply user specified features', ->
      {glyphs} = font.layout 'ffi 1⁄2', [ 'numr' ]
      assert.equal glyphs.length, 3
      assert.deepEqual glyphs.map((g) -> g.id), [ 767, 3, 126 ]
      assert.deepEqual glyphs.map((g) -> g.codePoints), [[102, 102, 105], [32], [49, 8260, 50]]

    it 'should apply indic reordering features', ->
      f = fontkit.openSync __dirname + '/data/Khmer/Khmer.ttf'
      {glyphs} = f.layout 'ខ្ញុំអាចញ៉ាំកញ្ចក់បាន ដោយគ្មានបញ្ហា'
      assert.deepEqual glyphs.map((g) -> g.id), [
        45, 153, 177, 112, 248, 188, 49, 296, 44, 187, 149, 44, 117, 236, 188, 63, 3, 107, 
        226, 188, 69, 218, 169, 188, 63, 64, 255, 175, 188
      ] 
      
      assert.deepEqual glyphs.map((g) -> g.codePoints), [
        [ 6017 ], [ 6098, 6025 ], [ 6075 ], [ 6086 ], [ 6050 ], [ 6070 ], [ 6021 ],
        [ 6025, 6089, 6070, 6086 ], [ 6016 ], [ 6025 ], [ 6098, 6021 ], [ 6016 ],
        [ 6091 ], [ 6036 ], [ 6070 ], [ 6035 ], [ 32 ], [ 6084 ], [ 6026 ], [ 6070 ],
        [ 6041 ], [ 6018 ], [ 6098, 6040 ], [ 6070 ], [ 6035 ], [ 6036 ], [ 6025 ],
        [ 6098, 6048 ], [ 6070 ]
      ]
