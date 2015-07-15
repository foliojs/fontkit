fontkit = require '../'
assert = require 'assert'

describe 'fontkit', ->
  it 'should open a font asynchronously', ->
    fontkit.open __dirname + '/data/OpenSans/OpenSans-Regular.ttf', (err, font) ->
      assert.equal err, null
      assert font instanceof fontkit.TTFFont
      
  it 'should open a font synchronously', ->
    font = fontkit.openSync __dirname + '/data/OpenSans/OpenSans-Regular.ttf'
    assert font instanceof fontkit.TTFFont
  
  it 'should open fonts of different formats', ->
    font = fontkit.openSync __dirname + '/data/OpenSans/OpenSans-Regular.ttf'
    assert font instanceof fontkit.TTFFont
    
    font = fontkit.openSync __dirname + '/data/SourceSansPro/SourceSansPro-Regular.otf'
    assert font instanceof fontkit.TTFFont
    
    font = fontkit.openSync __dirname + '/data/NotoSans/NotoSans.ttc'
    assert font instanceof fontkit.TrueTypeCollection

    font = fontkit.openSync __dirname + '/data/NotoSans/NotoSans.ttc', 'NotoSans'
    assert font instanceof fontkit.TTFFont
    
    font = fontkit.openSync __dirname + '/data/NotoSans/NotoSans.dfont'
    assert font instanceof fontkit.DFont

    font = fontkit.openSync __dirname + '/data/NotoSans/NotoSans.dfont', 'NotoSans'
    assert font instanceof fontkit.TTFFont

    font = fontkit.openSync __dirname + '/data/SourceSansPro/SourceSansPro-Regular.woff'
    assert font instanceof fontkit.WOFFFont
    assert font instanceof fontkit.TTFFont

    font = fontkit.openSync __dirname + '/data/SourceSansPro/SourceSansPro-Regular.woff2'
    assert font instanceof fontkit.WOFF2Font
    assert font instanceof fontkit.TTFFont
    
  it 'should error when opening an invalid font asynchronously', ->
    fontkit.open __filename, (err, font) ->
      assert err instanceof Error
      assert.equal err.message, 'Unknown font format'
      
  it 'should error when opening an invalid font synchronously', ->
    assert.throws ->
      fontkit.openSync __filename
    , /Unknown font format/
    
  it 'should get collection objects for ttc fonts', ->
    collection = fontkit.openSync __dirname + '/data/NotoSans/NotoSans.ttc'
    assert collection instanceof fontkit.TrueTypeCollection
    
    names = collection.fonts.map (f) -> f.postscriptName
    assert.deepEqual names, ['NotoSans-Bold', 'NotoSans', 'NotoSans-Italic', 'NotoSans-BoldItalic']
    
    font = collection.getFont 'NotoSans-Italic'
    assert.equal font.postscriptName, 'NotoSans-Italic'
    
  it 'should get collection objects for dfonts', ->
    collection = fontkit.openSync __dirname + '/data/NotoSans/NotoSans.dfont'
    assert collection instanceof fontkit.DFont
        
    names = collection.fonts.map (f) -> f.postscriptName
    assert.deepEqual names, ['NotoSans', 'NotoSans-Bold', 'NotoSans-Italic', 'NotoSans-BoldItalic']
    
    font = collection.getFont 'NotoSans-Italic'
    assert.equal font.postscriptName, 'NotoSans-Italic'
