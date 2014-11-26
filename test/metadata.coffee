fontkit = require '../'
assert = require 'assert'

describe 'metadata', ->
  font = fontkit.openSync __dirname + '/data/Skia.ttf'
  
  it 'has metadata properties', ->
    assert.equal font.fullName, 'Skia'
    assert.equal font.postscriptName, 'Skia-Regular'
    assert.equal font.familyName, 'Skia'
    assert.equal font.subfamilyName, 'Regular'
    assert.equal font.copyright, '© 1993-2014 Apple Inc.'
    assert.equal font.version, '10.0d4e1'

  it 'exposes some metrics', ->
    assert.equal font.unitsPerEm, 2048
    assert.equal font.scale, 1000 / 2048
    assert.equal font.ascent | 0, 776
    assert.equal font.descent | 0, -223
    assert.equal font.lineGap, 0
    assert.equal font.underlinePosition, 0
    assert.equal font.underlineThickness, 0
    assert.equal font.italicAngle, 0
    assert.equal font.capHeight, font.ascent
    assert.equal font.xHeight, 0
    assert.equal font.numGlyphs, 591
    assert.deepEqual font.bbox, [-1024 * 1000 / 2048, -803 * 1000 / 2048, 2765 * 1000 / 2048, 1896 * 1000 / 2048]
    
  it 'exposes tables directly', ->
    for table in ['head', 'hhea', 'OS/2', 'post']
      assert.equal typeof font[table], 'object'