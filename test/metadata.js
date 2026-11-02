import * as fontkit from 'fontkit';
import assert from 'assert';

describe('metadata', function () {
  let font = fontkit.openSync(
    new URL('data/NotoSans/NotoSans.ttc', import.meta.url),
    'NotoSans',
  );

  it('has metadata properties', function () {
    assert.equal(font.fullName, 'Noto Sans');
    assert.equal(font.postscriptName, 'NotoSans');
    assert.equal(font.familyName, 'Noto Sans');
    assert.equal(font.subfamilyName, 'Regular');
    assert.equal(
      font.copyright,
      'Copyright 2012 Google Inc. All Rights Reserved.',
    );
    return assert.equal(font.version, 'Version 1.05 uh');
  });

  it('decodes the names of Windows symbol fonts as UTF-16BE', function () {
    let font = fontkit.openSync(
      new URL('data/symbol-names.ttf', import.meta.url),
    );
    assert.equal(font.familyName, 'Symbol Test');
    assert.equal(font.subfamilyName, 'Regular');
    assert.equal(font.fullName, 'Symbol Test Regular');
    assert.equal(font.postscriptName, 'SymbolTest-Regular');
  });

  it('exposes some metrics', function () {
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
    assert.equal(font.bbox.minX, -1268);
    assert.equal(font.bbox.minY, -600);
    assert.equal(font.bbox.maxX, 2952);
    assert.equal(font.bbox.maxY, 2189);
  });

  it('uses the typo metrics when the font sets useTypoMetrics', function () {
    // Mada's typo metrics differ from its hhea metrics. HarfBuzz reports the
    // typo values:
    let font = fontkit.openSync(
      new URL('data/Mada/Mada-Regular.subset1.ttf', import.meta.url),
    );
    assert.equal(font.ascent, 900);
    assert.equal(font.descent, -300);
    assert.equal(font.lineGap, 100);
  });

  it('falls back to the font metrics for vertical advances', function () {
    // Source Sans Pro has no vmtx table. HarfBuzz advances by its hhea
    // ascent minus descent:
    let font = fontkit.openSync(
      new URL('data/SourceSansPro/SourceSansPro-Regular.otf', import.meta.url),
    );
    assert.equal(font.glyphForCodePoint(0x41).advanceHeight, 1257);
  });

  it('reads the vhea table with its 32-bit version', function () {
    // HarfBuzz advances TestGVAROne's glyphs by 1000 vertically:
    let font = fontkit.openSync(
      new URL('data/fonttest/TestGVAROne.ttf', import.meta.url),
    );
    assert.equal(font.vhea.version, 1.1);
    assert.equal(font.glyphsForString('彌')[0].advanceHeight, 1000);
  });

  it('reads the maxp version as a 16.16 version number', function () {
    let font = fontkit.openSync(
      new URL('data/SourceSansPro/SourceSansPro-Regular.otf', import.meta.url),
    );
    assert.equal(font.maxp.version, 0.5);
  });

  it('gives empty CFF glyphs an empty box', function () {
    let font = fontkit.openSync(
      new URL('data/SourceSansPro/SourceSansPro-Regular.otf', import.meta.url),
    );
    let glyph = font.glyphForCodePoint(0x20);
    for (let box of [glyph.cbox, glyph.bbox]) {
      assert.deepEqual([box.minX, box.minY, box.maxX, box.maxY], [0, 0, 0, 0]);
    }
  });

  it('exposes tables directly', function () {
    let iterable = ['head', 'hhea', 'OS/2', 'post'];
    for (let i = 0; i < iterable.length; i++) {
      let table = iterable[i];
      assert.equal(typeof font[table], 'object');
    }
  });
});
