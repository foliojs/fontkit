fontkit = require '../'
assert = require 'assert'
concat = require 'concat-stream'
CFFFont = require '../src/CFFFont'
r = require 'restructure'
CFFGlyph = require '../src/glyph/CFFGlyph'

describe 'font subsetting', ->
  describe 'truetype subsetting', ->
    font = fontkit.openSync __dirname + '/data/OpenSans/OpenSans-Regular.ttf'
    
    it 'should create a TTFSubset instance', ->
      subset = font.createSubset()
      assert.equal subset.constructor.name, 'TTFSubset'
      
    it 'should produce a subset', (done) ->
      subset = font.createSubset()
      for glyph in font.glyphsForString 'hello'
        subset.includeGlyph glyph
        
      subset.encodeStream().pipe concat (buf) ->
        f = fontkit.create buf
        assert.equal f.numGlyphs, 5
        assert.equal f.getGlyph(1).path.toSVG(), font.glyphsForString('h')[0].path.toSVG()
        done()

    it 'should handle composite glyphs', (done) ->
      subset = font.createSubset()
      subset.includeGlyph font.glyphsForString('é')[0]
      
      subset.encodeStream().pipe concat (buf) ->
        f = fontkit.create buf
        assert.equal f.numGlyphs, 4
        assert.equal f.getGlyph(1).path.toSVG(), font.glyphsForString('é')[0].path.toSVG()
        done()
        
  describe 'CFF subsetting', ->
    font = fontkit.openSync __dirname + '/data/SourceSansPro/SourceSansPro-Regular.otf'
    
    it 'should create a CFFSubset instance', ->
      subset = font.createSubset()
      assert.equal subset.constructor.name, 'CFFSubset'
      
    it 'should produce a subset', (done) ->
      subset = font.createSubset()
      for glyph in font.glyphsForString 'hello'
        subset.includeGlyph glyph
        
      subset.encodeStream().pipe concat (buf) ->
        stream = new r.DecodeStream buf
        cff = new CFFFont stream
        glyph = new CFFGlyph 1, [], { stream: stream, 'CFF ': cff }
        assert.equal glyph.path.toSVG(), font.glyphsForString('h')[0].path.toSVG()
        done()
        
    it 'should handle CID fonts', (done) ->
      f = fontkit.openSync __dirname + '/data/NotoSansCJK/NotoSansCJKkr-Regular.otf'
      subset = f.createSubset()
      for glyph in f.glyphsForString '갈휸'
        subset.includeGlyph glyph
        
      subset.encodeStream().pipe concat (buf) ->
        stream = new r.DecodeStream buf
        cff = new CFFFont stream
        glyph = new CFFGlyph 1, [], { stream: stream, 'CFF ': cff }
        assert.equal glyph.path.toSVG(), f.glyphsForString('갈')[0].path.toSVG()
        assert.equal cff.topDict.FDArray.length, 2
        assert.deepEqual cff.topDict.FDSelect.fds, [0, 1, 1]
        done()
