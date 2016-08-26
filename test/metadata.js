import fontkit from '../src';
import assert from 'assert';
import BBox from '../src/glyph/BBox';

describe('metadata', function() {
  let font = fontkit.openSync(__dirname + '/data/NotoSans/NotoSans.ttc', 'NotoSans');

  it('has metadata properties', function() {
    assert.equal(font.fullName, 'Noto Sans');
    assert.equal(font.postscriptName, 'NotoSans');
    assert.equal(font.familyName, 'Noto Sans');
    assert.equal(font.subfamilyName, 'Regular');
    assert.equal(font.copyright, 'Copyright 2012 Google Inc. All Rights Reserved.');
    return assert.equal(font.version, 'Version 1.05 uh');
  });

  it('exposes some metrics', function() {
    assert.equal(font.unitsPerEm, 2048);
    assert.equal(font.ascent | 0, 2189);
    assert.equal(font.descent | 0, -600);
    assert.equal(font.lineGap, 0);
    assert.equal(font.underlinePosition, -154);
    assert.equal(font.underlineThickness, 102);
    assert.equal(font.italicAngle, 0);
    assert.equal(font.capHeight, 1462);
    assert.equal(font.xHeight, 1098);
    assert.equal(font.numGlyphs, 8708);
    return assert.deepEqual(font.bbox, new BBox(-1268, -600, 2952, 2189));
  });

  it('exposes tables directly', function() {
    let iterable = ['head', 'hhea', 'OS/2', 'post'];
    for (let i = 0; i < iterable.length; i++) {
      let table = iterable[i];
      assert.equal(typeof font[table], 'object');
    }
  });
});
