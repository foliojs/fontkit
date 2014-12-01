fontkit = require '../'
assert = require 'assert'

describe 'fontkit', ->
  it 'should open a font asynchronously', ->
    fontkit.open __dirname + '/data/Skia.ttf', (err, font) ->
      assert.equal err, null
      assert font instanceof fontkit.TTFFont
      
  it 'should open a font synchronously', ->
    font = fontkit.openSync __dirname + '/data/Skia.ttf'
    assert font instanceof fontkit.TTFFont
  
  it 'should open fonts of different formats', ->
    font = fontkit.openSync __dirname + '/data/Skia.ttf'
    assert font instanceof fontkit.TTFFont
    
    font = fontkit.openSync __dirname + '/data/ACaslonPro-Regular.otf'
    assert font instanceof fontkit.TTFFont
    
    font = fontkit.openSync __dirname + '/data/Chalkboard.ttc'
    assert font instanceof fontkit.TrueTypeCollection

    font = fontkit.openSync __dirname + '/data/Chalkboard.ttc', 'Chalkboard'
    assert font instanceof fontkit.TTFFont
    
    font = fontkit.openSync __dirname + '/data/Helvetica.dfont'
    assert font instanceof fontkit.DFont

    font = fontkit.openSync __dirname + '/data/Helvetica.dfont', 'Helvetica'
    assert font instanceof fontkit.TTFFont

    font = fontkit.openSync __dirname + '/data/MuseoSans.woff'
    assert font instanceof fontkit.WOFFFont
    assert font instanceof fontkit.TTFFont

    font = fontkit.openSync __dirname + '/data/ACaslonPro-Regular.woff2'
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
    collection = fontkit.openSync __dirname + '/data/Chalkboard.ttc'
    assert collection instanceof fontkit.TrueTypeCollection
    
    names = collection.fonts.map (f) -> f.postscriptName
    assert.deepEqual names, ['Chalkboard', 'Chalkboard-Bold']
    
    font = collection.getFont 'Chalkboard-Bold'
    assert.equal font.postscriptName, 'Chalkboard-Bold'
    
  it 'should get collection objects for dfonts', ->
    collection = fontkit.openSync '/System/Library/Fonts/Helvetica.dfont'
    assert collection instanceof fontkit.DFont
        
    names = collection.fonts.map (f) -> f.postscriptName
    assert.deepEqual names, ['Helvetica', 'Helvetica-Bold', 'Helvetica-Oblique', 'Helvetica-BoldOblique', 'Helvetica-Light', 'Helvetica-LightOblique']
    
    font = collection.getFont 'Helvetica-Bold'
    assert.equal font.postscriptName, 'Helvetica-Bold'
