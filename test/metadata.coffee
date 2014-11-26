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
