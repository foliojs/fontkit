import * as fontkit from 'fontkit';
import assert from 'assert';
import * as r from 'restructure';

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

  describe('#353 - reading the cbox of an empty glyph', function () {
    let openFont = () =>
      fontkit.openSync(
        new URL('data/OpenSans/OpenSans-Regular.ttf', import.meta.url),
      );

    let assertEmptyCBox = (cbox) => {
      assert.deepStrictEqual(
        [cbox.minX, cbox.minY, cbox.maxX, cbox.maxY],
        [0, 0, 0, 0],
      );
      assert.strictEqual(cbox.width, 0);
      assert.strictEqual(cbox.height, 0);
      assert.ok(Object.isFrozen(cbox));
    };

    it('should return a zero control box for a space glyph', function () {
      let font = openFont();
      let glyph = font.glyphForCodePoint(0x20);
      assert.strictEqual(
        font.loca.offsets[glyph.id],
        font.loca.offsets[glyph.id + 1],
      );

      assertEmptyCBox(glyph.cbox);
    });

    it('should preserve advances and compute finite metrics for a space glyph', function () {
      let font = openFont();
      let glyph = font.glyphForCodePoint(0x20);
      assert.strictEqual(glyph.advanceWidth, 532);
      assert.strictEqual(glyph.advanceHeight, 2059);
      let metrics = glyph._getMetrics();
      assert.strictEqual(metrics.topBearing, 1567);
      assert.ok(Object.values(metrics).every(Number.isFinite));
    });

    it('should handle an empty glyph at the end of the glyf table', function () {
      let font = openFont();
      let glyphId = font.numGlyphs - 1;
      let offsets = font.loca.offsets;
      let end = offsets[glyphId + 1];
      offsets[glyphId] = end;

      // Make the final glyph empty and bound its stream to the glyf table,
      // so reading a header at the final offset would run past the buffer.
      let table = font.directory.tables.glyf;
      let buffer = font.stream.buffer.subarray(
        table.offset,
        table.offset + end,
      );
      let getTableStream = font._getTableStream.bind(font);
      font._getTableStream = (tag) =>
        tag === 'glyf' ? new r.DecodeStream(buffer) : getTableStream(tag);

      let glyph = font.getGlyph(glyphId);
      assertEmptyCBox(glyph.cbox);
      assert.ok(Number.isFinite(glyph.advanceWidth));
      assert.ok(Number.isFinite(glyph.advanceHeight));
      assert.ok(Object.values(glyph._getMetrics()).every(Number.isFinite));
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
