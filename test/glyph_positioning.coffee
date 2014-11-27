fontkit = require '../'
assert = require 'assert'

describe 'glyph positioning', ->
  describe 'basic positioning', ->
    font = fontkit.openSync __dirname + '/data/ACaslonPro-Regular.otf'
    
    it 'should get a glyph width', ->
      assert.equal font.widthOfGlyph(68), 354

    it 'should get advances for an array of glyphs', ->
      glyphs = font.glyphsForString 'Twitter', []
      advances = font.advancesForGlyphs glyphs, []
      assert.deepEqual advances, [ 702, 686, 267, 319, 319, 426, 341 ]
      
    it 'should get the width of an entire string', ->
      width = font.widthOfString 'Twitter', []
      assert.equal width, 3060

  describe 'opentype positioning', ->
    font = fontkit.openSync __dirname + '/data/ACaslonPro-Regular.otf'
    
    it 'should apply opentype GPOS features', ->
      glyphs = font.glyphsForString 'Twitter', []
      advances = font.advancesForGlyphs glyphs, ['kern']
      assert.deepEqual advances, [ 607, 686, 267, 319, 319, 426, 341 ]

  describe 'AAT features', ->
    font = fontkit.openSync __dirname + '/data/Skia.ttf'
    
    it 'should not apply kerning if not requested', ->
      glyphs = font.glyphsForString 'Twitter', []
      advances = font.advancesForGlyphs glyphs, []
      assert.deepEqual advances, [
        569.82421875,
        803.22265625,
        266.11328125,
        392.08984375,
        392.08984375,
        509.765625,
        384.765625
      ]

    it 'should apply kerning', ->
      glyphs = font.glyphsForString 'Twitter', []
      advances = font.advancesForGlyphs glyphs, ['kern']
      assert.deepEqual advances, [
        462.890625,
        803.22265625,
        266.11328125,
        332.03125,
        386.23046875,
        509.765625,
        384.765625
      ]
