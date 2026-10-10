import * as fontkit from 'fontkit';
import assert from 'assert';

describe('issues', function () {
  describe("#282 - ReferenceError: Cannot access 'c3x' before initialization", function () {
    it('should not throw a ReferenceError', function () {
      let font = fontkit.openSync(
        new URL(
          'data/PlayfairDisplay/PlayfairDisplay-Regular.otf',
          import.meta.url,
        ),
      );

      let glyph = font.getGlyph(5);

      glyph.path;
    });
  });

  describe('#154 - Glyph cache issue', function () {
    it('should retain code points after a composite glyph caches a component', function () {
      let font = fontkit.openSync(
        new URL('data/OpenSans/OpenSans-Regular.ttf', import.meta.url),
      );
      let composite = font.layout('ç').glyphs[0];

      composite.path.commands;

      let glyph = font.layout('c').glyphs[0];
      assert.deepEqual(glyph.codePoints, [99]);
    });

    it('should retain code points for composed glyphs', function () {
      let font = fontkit.openSync(
        new URL('data/OpenSans/OpenSans-Regular.ttf', import.meta.url),
      );

      for (let [character, codePoint] of [
        ['ã', 227],
        ['á', 225],
      ]) {
        let glyph = font.layout(character).glyphs[0];
        glyph.path.commands;
        assert.deepEqual(glyph.codePoints, [codePoint]);
      }
    });
  });

  describe('#342 - Glyph cache issue with glyphs shared by several code points', function () {
    let openFont = () =>
      fontkit.openSync(
        new URL('data/NotoSans/NotoKufiArabic-Regular.ttf', import.meta.url),
      );

    it('should keep the code points of each lookup when a glyph is shared', function () {
      let font = openFont();
      assert.equal(
        font.glyphForCodePoint(0x20).id,
        font.glyphForCodePoint(0xa0).id,
      );

      assert.deepEqual(font.layout(' ').glyphs[0].codePoints, [0x20]);
      assert.deepEqual(font.layout('\u00a0').glyphs[0].codePoints, [0xa0]);
      assert.deepEqual(font.layout(' ').glyphs[0].codePoints, [0x20]);
    });

    it('should shape text after laying out a presentation form that shares its glyph', function () {
      let word = '\u0628\u0622\u0628';
      let reference = openFont();
      assert.equal(
        reference.glyphForCodePoint(0x622).id,
        reference.glyphForCodePoint(0xfe81).id,
      );
      let expected = reference.layout(word).glyphs.map((glyph) => glyph.id);

      let font = openFont();
      font.layout('\ufe81');

      let glyphs = font.layout(word).glyphs;
      assert.deepEqual(
        glyphs.map((glyph) => glyph.id),
        expected,
      );
      assert.deepEqual(glyphs[1].codePoints, [0x622]);
    });
  });
});
