import fontkit from '../src';
import assert from 'assert';

describe('character to glyph mapping', function() {
  describe('basic cmap handling', function() {
    let font = fontkit.openSync(__dirname + '/data/OpenSans/OpenSans-Regular.ttf');

    it('should get characterSet', function() {
      assert(Array.isArray(font.characterSet));
      return assert.equal(font.characterSet.length, 884);
    });

    it('should check if a character is supported', function() {
      assert(font.hasGlyphForCodePoint('a'.charCodeAt()));
      return assert(!font.hasGlyphForCodePoint(0));
    });

    it('should get a glyph for a character code', function() {
      let glyph = font.glyphForCodePoint('a'.charCodeAt());
      assert.equal(glyph.id, 68);
      return assert.deepEqual(glyph.codePoints, [97]);
    });

    it('should map a string to glyphs', function() {
      let glyphs = font.glyphsForString('hello', []);
      assert(Array.isArray(glyphs));
      assert.equal(glyphs.length, 5);
      assert.deepEqual(glyphs.map(g => g.id), [75, 72, 79, 79, 82]);
      return assert.deepEqual(glyphs.map(g => g.codePoints), [[104], [101], [108], [108], [111]]);
    });

    it('should support unicode variation selectors', function() {
      let font = fontkit.openSync(__dirname + '/data/fonttest/TestCMAP14.otf');
      let glyphs = font.glyphsForString('\u{82a6}\u{82a6}\u{E0100}\u{82a6}\u{E0101}');
      assert.deepEqual(glyphs.map(g => g.id), [1, 1, 2]);
    });

    it('should support legacy encodings when no unicode cmap is found', function() {
      let font = fontkit.openSync(__dirname + '/data/fonttest/TestCMAPMacTurkish.ttf');
      let glyphs = font.glyphsForString("“ABÇĞIİÖŞÜ”");
      assert.deepEqual(glyphs.map(g => g.id), [200, 34, 35, 126, 176, 42, 178, 140, 181, 145, 201]);
    });
  });

  describe('opentype features', function() {
    let font = fontkit.openSync(__dirname + '/data/SourceSansPro/SourceSansPro-Regular.otf');

    it('should list available features', () =>
      assert.deepEqual(font.availableFeatures, [
        'aalt', 'c2sc', 'case', 'ccmp', 'dnom', 'frac', 'liga', 'numr',
        'onum', 'ordn', 'pnum', 'salt', 'sinf', 'smcp', 'ss01', 'ss02',
        'ss03', 'ss04', 'ss05', 'subs', 'sups', 'zero', 'kern', 'mark',
        'mkmk', 'size'
      ])
    );

    it('should apply opentype GSUB features', function() {
      let {glyphs} = font.layout('ffi', ['dlig']);
      assert.equal(glyphs.length, 2);
      assert.deepEqual(glyphs.map(g => g.id), [ 514, 36 ]);
      return assert.deepEqual(glyphs.map(g => g.codePoints), [[102, 102], [105]]);
    });

    it('should enable fractions when using fraction slash', function() {
      let {glyphs} = font.layout('123 1⁄16 123');
      return assert.deepEqual(glyphs.map(g => g.id), [ 1088, 1089, 1090, 1, 1617, 1724, 1603, 1608, 1, 1088, 1089, 1090 ]);
    });

    it('should not break if can’t enable fractions when using fraction slash', function() {
      let {glyphs} = font.layout('a⁄b ⁄ 1⁄ ⁄2');
      return assert.deepEqual(glyphs.map(g => g.id), [ 28, 1724, 29, 1, 1724, 1, 1617, 1724, 1, 1724, 1604 ]);
    });
  });

  describe('AAT features', function() {
    let font = fontkit.openSync(__dirname + '/data/Play/Play-Regular.ttf');

    it('should list available features', () => assert.deepEqual(font.availableFeatures, [ 'tnum', 'sups', 'subs', 'numr', 'onum', 'lnum', 'liga', 'kern' ]));

    it('should apply default AAT morx features', function() {
      let {glyphs} = font.layout('ffi 1⁄2');
      assert.equal(glyphs.length, 5);
      assert.deepEqual(glyphs.map(g => g.id), [ 767, 3, 20, 645, 21 ]);
      return assert.deepEqual(glyphs.map(g => g.codePoints), [[102, 102, 105], [32], [49], [8260], [50]]);
    });

    it('should apply user specified features', function() {
      let {glyphs} = font.layout('ffi 1⁄2', [ 'numr' ]);
      assert.equal(glyphs.length, 3);
      assert.deepEqual(glyphs.map(g => g.id), [ 767, 3, 126 ]);
      return assert.deepEqual(glyphs.map(g => g.codePoints), [[102, 102, 105], [32], [49, 8260, 50]]);
    });

    it('should handle rtl direction', function() {
      let {glyphs} = font.layout('ffi', [], null, null, "rtl");
      assert.equal(glyphs.length, 3);
      assert.deepEqual(glyphs.map(g => g.id), [ 76, 73, 73 ]);
      return assert.deepEqual(glyphs.map(g => g.codePoints), [[105], [102], [102]]);
    });

    it('should apply indic reordering features', function() {
      let f = fontkit.openSync(__dirname + '/data/Khmer/Khmer.ttf');
      let {glyphs} = f.layout('ខ្ញុំអាចញ៉ាំកញ្ចក់បាន ដោយគ្មានបញ្ហា');
      assert.deepEqual(glyphs.map(g => g.id), [
        45, 153, 177, 112, 248, 188, 49, 296, 44, 187, 149, 44, 117, 236, 188, 63, 3, 107,
        226, 188, 69, 218, 169, 188, 63, 64, 255, 175, 188
      ]);

      return assert.deepEqual(glyphs.map(g => g.codePoints), [
        [ 6017 ], [ 6098, 6025 ], [ 6075 ], [ 6086 ], [ 6050 ], [ 6070 ], [ 6021 ],
        [ 6025, 6089, 6070, 6086 ], [ 6016 ], [ 6025 ], [ 6098, 6021 ], [ 6016 ],
        [ 6091 ], [ 6036 ], [ 6070 ], [ 6035 ], [ 32 ], [ 6084 ], [ 6026 ], [ 6070 ],
        [ 6041 ], [ 6018 ], [ 6098, 6040 ], [ 6070 ], [ 6035 ], [ 6036 ], [ 6025 ],
        [ 6098, 6048 ], [ 6070 ]
      ]);
    });
  });

  describe('glyph id to strings', function () {
    it('should return strings from cmap that map to a given glyph', function () {
      let font = fontkit.openSync(__dirname + '/data/OpenSans/OpenSans-Regular.ttf');
      let strings = font.stringsForGlyph(68);
      assert.deepEqual(strings, ['a']);
    });

    it('should return strings from AAT morx table that map to the given glyph', function () {
      let font = fontkit.openSync(__dirname + '/data/Play/Play-Regular.ttf');
      let strings = font.stringsForGlyph(767);
      assert.deepEqual(strings, ['ffi']);
    });
  });
});
