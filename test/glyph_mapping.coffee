fontkit = require '../'
assert = require 'assert'

describe 'character to glyph mapping', ->
  describe 'basic cmap handling', ->
    font = fontkit.openSync __dirname + '/data/OpenSans-Regular.ttf'
    
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
    font = fontkit.openSync __dirname + '/data/ACaslonPro-Regular.otf'
    
    it 'should list available features', ->
      assert.deepEqual font.availableFeatures, [
        'aalt', 'c2sc', 'case', 'dlig', 'dnom', 'frac', 'hist',
        'liga', 'lnum', 'numr', 'onum', 'ordn', 'ornm', 'pnum',
        'sinf', 'smcp', 'subs', 'sups', 'tnum', 'zero', 'cpsp',
        'kern', 'size'
      ]

    it 'should apply opentype GSUB features', ->
      {glyphs} = font.layout 'ffi 1/2', ['liga', 'dlig', 'frac']
      assert.equal glyphs.length, 3
      assert.deepEqual glyphs.map((g) -> g.id), [323, 53, 124]
      assert.deepEqual glyphs.map((g) -> g.codePoints), [[102, 102, 105], [32], [49, 47, 50]]
      
    it 'should enable fractions when using fraction slash', ->
      {glyphs} = font.layout '123 1⁄16 123'
      assert.deepEqual glyphs.map((g) -> g.id), [103, 104, 105, 53, 601, 133, 618, 623, 53, 103, 104, 105]
      
      
  describe 'AAT features', ->
    font = fontkit.openSync __dirname + '/data/Skia.ttf'
    
    it 'should list available features', ->
      assert.deepEqual font.availableFeatures, [
        'liga', 'dlig', 'tnum', 'pnum', 'sups', 'subs', 'ordn',
        'afrc', 'numr', 'cv01', 'onum', 'lnum', 'ccmp', 'kern'
      ]

    it 'should apply default AAT morx features', ->
      {glyphs} = font.layout 'ffi 1⁄2'
      assert.equal glyphs.length, 5
      assert.deepEqual glyphs.map((g) -> g.id), [535, 3, 389, 218, 408]
      assert.deepEqual glyphs.map((g) -> g.codePoints), [[102, 102, 105], [32], [49], [8260], [50]]
            
    it 'should apply user specified features', ->
      {glyphs} = font.layout 'ffi 1⁄2', ['afrc'] # switch to vertical fractions
      assert.equal glyphs.length, 3
      assert.deepEqual glyphs.map((g) -> g.id), [535, 3, 451]
      assert.deepEqual glyphs.map((g) -> g.codePoints), [[102, 102, 105], [32], [49, 8260, 50]]

    it 'should apply indic reordering features', ->
      f = fontkit.openSync __dirname + '/data/DevanagariMT.ttc', 'DevanagariMT'
      {glyphs} = f.layout 'पि'
      assert.equal glyphs.length, 2
      assert.deepEqual glyphs.map((g) -> g.id), [101, 86]
      assert.deepEqual glyphs.map((g) -> g.codePoints), [[2367], [2346]]
