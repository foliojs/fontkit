fontkit = require '../'
assert = require 'assert'

describe 'glyph positioning', ->
  describe 'basic positioning', ->
    font = fontkit.openSync __dirname + '/data/ACaslonPro-Regular.otf'
    
    it 'should get a glyph width', ->
      assert.equal font.getGlyph(68).advanceWidth, 354

  describe 'opentype positioning', ->
    font = fontkit.openSync __dirname + '/data/ACaslonPro-Regular.otf'
    
    it 'should apply opentype GPOS features', ->
      {positions} = font.layout 'Twitter'
      assert.deepEqual positions.map((p) -> p.xAdvance), [ 607, 686, 267, 319, 319, 426, 341 ]
    
    it 'should ignore duplicate features', ->
      {positions} = font.layout 'Twitter', ['kern', 'kern']
      assert.deepEqual positions.map((p) -> p.xAdvance), [ 607, 686, 267, 319, 319, 426, 341 ]

  describe 'AAT features', ->
    font = fontkit.openSync __dirname + '/data/Skia.ttf'
    
    it 'should not apply kerning if not requested', ->
      {positions} = font.layout 'Twitter', []
      assert.deepEqual positions.map((p) -> p.xAdvance), [1167, 1645, 545, 803, 803, 1044, 788]

    it 'should apply kerning', ->
      {positions} = font.layout 'Twitter', ['kern']
      assert.deepEqual positions.map((p) -> p.xAdvance), [948, 1645, 545, 680, 791, 1044, 788]
