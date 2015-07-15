fontkit = require '../'
assert = require 'assert'

describe 'glyph positioning', ->
  describe 'basic positioning', ->
    font = fontkit.openSync __dirname + '/data/SourceSansPro/SourceSansPro-Regular.otf'
    
    it 'should get a glyph width', ->
      assert.equal font.getGlyph(5).advanceWidth, 615

  describe 'opentype positioning', ->
    font = fontkit.openSync __dirname + '/data/SourceSansPro/SourceSansPro-Regular.otf'
    
    it 'should apply opentype GPOS features', ->
      {positions} = font.layout 'Twitter'
      assert.deepEqual positions.map((p) -> p.xAdvance), [ 502, 718, 246, 318, 324, 496, 347 ]
    
    it 'should ignore duplicate features', ->
      {positions} = font.layout 'Twitter', ['kern', 'kern']
      assert.deepEqual positions.map((p) -> p.xAdvance), [ 502, 718, 246, 318, 324, 496, 347 ]

  describe 'AAT features', ->
    font = fontkit.openSync __dirname + '/data/Play/Play-Regular.ttf'
    
    it 'should apply kerning by default', ->
      {positions} = font.layout 'Twitter'
      assert.deepEqual positions.map((p) -> p.xAdvance), [ 535, 792, 246, 372, 402, 535, 351 ]
