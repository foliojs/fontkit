fontkit = require '../'
assert = require 'assert'
concat = require 'concat-stream'

describe 'font subsetting', ->
  describe 'truetype subsetting', ->
    font = fontkit.openSync __dirname + '/data/Skia.ttf'
    
    it 'should create a TTFSubset instance', ->
      subset = font.createSubset()
      assert.equal subset.constructor.name, 'TTFSubset'
      
    it 'should produce a subset', (done) ->
      subset = font.createSubset()
      for glyph in font.glyphsForString 'hello'
        subset.includeGlyph glyph
        
      subset.encodeStream concat (buf) ->
        f = fontkit.create buf
        assert.equal f.numGlyphs, 5
        assert.equal f.getGlyph(1).path.toSVG(), font.glyphsForString('h')[0].path.toSVG()
        done()

    it 'should handle composite glyphs', (done) ->
      subset = font.createSubset()
      subset.includeGlyph font.glyphsForString('é')[0]
      
      subset.encodeStream concat (buf) ->
        f = fontkit.create buf
        assert.equal f.numGlyphs, 4
        assert.equal f.getGlyph(1).path.toSVG(), font.glyphsForString('é')[0].path.toSVG()
        done()
        