import * as fontkit from 'fontkit';
import assert from 'assert';

describe('character to glyph mapping', function () {
  describe('basic cmap handling', function () {
    let font = fontkit.openSync(new URL('data/OpenSans/OpenSans-Regular.ttf', import.meta.url));

    it('should get characterSet', function () {
      assert(Array.isArray(font.characterSet));
      return assert.equal(font.characterSet.length, 883);
    });

    it('should cache character sets separately for each cmap processor', function () {
      let other = fontkit.openSync(new URL('data/OpenSans/OpenSans-Regular.ttf', import.meta.url));
      let processor = font._cmapProcessor;
      let characterSet = processor.getCharacterSet();
      assert.strictEqual(processor.getCharacterSet(), characterSet);
      assert.deepEqual(other._cmapProcessor.getCharacterSet(), characterSet);
      assert.notStrictEqual(other._cmapProcessor.getCharacterSet(), characterSet);
    });

    it('should cache code points separately for each glyph and cmap processor', function () {
      let other = fontkit.openSync(new URL('data/OpenSans/OpenSans-Regular.ttf', import.meta.url));
      let processor = font._cmapProcessor;
      let codePoints = processor.codePointsForGlyph(68);
      assert.deepEqual(codePoints, [97]);
      assert.strictEqual(processor.codePointsForGlyph(68), codePoints);
      assert.deepEqual(processor.codePointsForGlyph(69), [98]);
      assert.notStrictEqual(processor.codePointsForGlyph(69), codePoints);
      assert.deepEqual(other._cmapProcessor.codePointsForGlyph(68), codePoints);
      assert.notStrictEqual(other._cmapProcessor.codePointsForGlyph(68), codePoints);

      let missing = processor.codePointsForGlyph(0xffff);
      assert.deepEqual(missing, []);
      assert.strictEqual(processor.codePointsForGlyph(0xffff), missing);
    });

    it('should leave code points mapped to .notdef out of characterSet', function () {
      // U+FFFF is only the closing segment of the format 4 subtable (#158)
      assert(!font.characterSet.includes(0xffff));
      assert(font.characterSet.every(codePoint => font.hasGlyphForCodePoint(codePoint)));

      let cmap14 = fontkit.openSync(new URL('data/fonttest/TestCMAP14.otf', import.meta.url));
      assert.deepEqual(cmap14.characterSet, [0x20, 0x2269, 0x82a6]);
    });

    it('should check if a character is supported', function () {
      assert(font.hasGlyphForCodePoint('a'.charCodeAt()));
      return assert(!font.hasGlyphForCodePoint(0));
    });

    it('should get a glyph for a character code', function () {
      let glyph = font.glyphForCodePoint('a'.charCodeAt());
      assert.equal(glyph.id, 68);
      return assert.deepEqual(glyph.codePoints, [97]);
    });

    it('should map a string to glyphs', function () {
      let glyphs = font.glyphsForString('hello', []);
      assert(Array.isArray(glyphs));
      assert.equal(glyphs.length, 5);
      assert.deepEqual(glyphs.map(g => g.id), [75, 72, 79, 79, 82]);
      return assert.deepEqual(glyphs.map(g => g.codePoints), [[104], [101], [108], [108], [111]]);
    });

    it('should support unicode variation selectors', function () {
      let font = fontkit.openSync(new URL('data/fonttest/TestCMAP14.otf', import.meta.url));
      let glyphs = font.glyphsForString('\u{82a6}\u{82a6}\u{E0100}\u{82a6}\u{E0101}');
      assert.deepEqual(glyphs.map(g => g.id), [1, 1, 2]);
    });

    it('should support cmap format 10', function () {
      let font = fontkit.openSync(new URL('data/aots/cmap10_font1.otf', import.meta.url));
      assert.deepEqual(font.characterSet, [0x109423, 0x109424, 0x109425]);

      let glyphs = font.glyphsForString('\u{109423}\u{109424}\u{109425}');
      assert.deepEqual(glyphs.map(g => g.id), [26, 27, 32]);
      assert.deepEqual(font.stringsForGlyph(27), ['\u{109424}']);
    });

    it('should support legacy encodings when no unicode cmap is found', function () {
      let font = fontkit.openSync(new URL('data/fonttest/TestCMAPMacTurkish.ttf', import.meta.url));
      let glyphs = font.glyphsForString("“ABÇĞIİÖŞÜ”");
      assert.deepEqual(glyphs.map(g => g.id), [200, 34, 35, 126, 176, 42, 178, 140, 181, 145, 201]);
    });

    it('should not map code points missing from a legacy encoding to other glyphs', function () {
      let font = fontkit.openSync(new URL('data/fonttest/TestCMAPMacTurkish.ttf', import.meta.url));
      let glyphs = font.glyphsForString(' \u00a0\u00b9\u0080');
      assert.deepEqual(glyphs.map(g => g.id), [1, 96, 0, 0]);
    });
  });

  describe('opentype features', function () {
    let font = fontkit.openSync(new URL('data/SourceSansPro/SourceSansPro-Regular.otf', import.meta.url));

    it('should list available features', () =>
      assert.deepEqual(font.availableFeatures, [
        'aalt', 'c2sc', 'case', 'ccmp', 'dnom', 'frac', 'liga', 'numr',
        'onum', 'ordn', 'pnum', 'salt', 'sinf', 'smcp', 'ss01', 'ss02',
        'ss03', 'ss04', 'ss05', 'subs', 'sups', 'zero', 'kern', 'mark',
        'mkmk', 'size'
      ])
    );

    it('should apply opentype GSUB features', function () {
      let { glyphs } = font.layout('ffi', ['dlig']);
      assert.equal(glyphs.length, 2);
      assert.deepEqual(glyphs.map(g => g.id), [514, 36]);
      return assert.deepEqual(glyphs.map(g => g.codePoints), [[102, 102], [105]]);
    });

    it('should enable fractions when using fraction slash', function () {
      let { glyphs } = font.layout('123 1⁄16 123');
      return assert.deepEqual(glyphs.map(g => g.id), [1088, 1089, 1090, 1, 1617, 1724, 1603, 1608, 1, 1088, 1089, 1090]);
    });

    it('should not break if can’t enable fractions when using fraction slash', function () {
      let { glyphs } = font.layout('a⁄b ⁄ 1⁄ ⁄2');
      return assert.deepEqual(glyphs.map(g => g.id), [28, 1724, 29, 1, 1724, 1, 1617, 1724, 1, 1724, 1604]);
    });
  });

  describe('AAT features', function () {
    let font = fontkit.openSync(new URL('data/Play/Play-Regular.ttf', import.meta.url));

    it('should list available features', () => assert.deepEqual(font.availableFeatures, ['tnum', 'sups', 'subs', 'numr', 'onum', 'lnum', 'liga', 'kern']));

    it('should apply default AAT morx features', function () {
      let { glyphs } = font.layout('ffi 1⁄2');
      assert.equal(glyphs.length, 5);
      assert.deepEqual(glyphs.map(g => g.id), [767, 3, 20, 645, 21]);
      return assert.deepEqual(glyphs.map(g => g.codePoints), [[102, 102, 105], [32], [49], [8260], [50]]);
    });

    it('should allow for disabling of default AAT morx features', function () {
      let { glyphs } = font.layout('ffi 1⁄2', { 'liga': false });
      assert.equal(glyphs.length, 7);
      assert.deepEqual(glyphs.map(g => g.id), [73, 73, 76, 3, 20, 645, 21]);
      return assert.deepEqual(glyphs.map(g => g.codePoints), [[102], [102], [105], [32], [49], [8260], [50]]);
    });

    it('should apply user specified features', function () {
      let { glyphs } = font.layout('ffi 1⁄2', ['numr']);
      assert.equal(glyphs.length, 3);
      assert.deepEqual(glyphs.map(g => g.id), [767, 3, 126]);
      return assert.deepEqual(glyphs.map(g => g.codePoints), [[102, 102, 105], [32], [49, 8260, 50]]);
    });

    it('should handle rtl direction', function () {
      let { glyphs } = font.layout('ffi', [], null, null, "rtl");
      assert.equal(glyphs.length, 3);
      assert.deepEqual(glyphs.map(g => g.id), [76, 73, 73]);
      return assert.deepEqual(glyphs.map(g => g.codePoints), [[105], [102], [102]]);
    });

    it('should apply indic reordering features', function () {
      let f = fontkit.openSync(new URL('data/Khmer/Khmer.ttf', import.meta.url));
      let { glyphs } = f.layout('ខ្ញុំអាចញ៉ាំកញ្ចក់បាន ដោយគ្មានបញ្ហា');
      assert.deepEqual(glyphs.map(g => g.id), [
        45, 153, 177, 112, 248, 188, 49, 296, 44, 187, 149, 44, 117, 236, 188, 63, 3, 107,
        226, 188, 69, 218, 169, 188, 63, 64, 255, 175, 188
      ]);

      return assert.deepEqual(glyphs.map(g => g.codePoints), [
        [6017], [6098, 6025], [6075], [6086], [6050], [6070], [6021],
        [6025, 6089, 6070, 6086], [6016], [6025], [6098, 6021], [6016],
        [6091], [6036], [6070], [6035], [32], [6084], [6026], [6070],
        [6041], [6018], [6098, 6040], [6070], [6035], [6036], [6025],
        [6098, 6048], [6070]
      ]);
    });
  });

  describe('glyph id to strings', function () {
    it('should return strings from cmap that map to a given glyph', function () {
      let font = fontkit.openSync(new URL('data/OpenSans/OpenSans-Regular.ttf', import.meta.url));
      let strings = font.stringsForGlyph(68);
      assert.deepEqual(strings, ['a']);
    });

    it('should return strings from AAT morx table that map to the given glyph', function () {
      let font = fontkit.openSync(new URL('data/Play/Play-Regular.ttf', import.meta.url));
      let strings = font.stringsForGlyph(767);
      assert.deepEqual(strings, ['ffi']);
    });
  });
});
