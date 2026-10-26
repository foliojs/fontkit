import * as fontkit from 'fontkit';
import assert from 'assert';
import concat from 'concat-stream';
import * as r from 'restructure';
import fs from 'fs';

describe('font subsetting', function () {
  describe('truetype subsetting', function () {
    let font = fontkit.openSync(
      new URL('data/OpenSans/OpenSans-Regular.ttf', import.meta.url),
    );

    it('should produce a subset', function () {
      let subset = font.createSubset();
      for (let glyph of font.glyphsForString('hello')) {
        subset.includeGlyph(glyph);
      }

      let buf = subset.encode();
      let f = fontkit.create(buf);
      assert.equal(f.numGlyphs, 5);
      assert.equal(
        f.getGlyph(1).path.toSVG(),
        font.glyphsForString('h')[0].path.toSVG(),
      );
    });

    it('should re-encode variation glyphs', function () {
      if (!fs.existsSync('/Library/Fonts/Skia.ttf')) return this.skip();

      let font = fontkit.openSync('/Library/Fonts/Skia.ttf', 'Bold');
      let subset = font.createSubset();
      for (let glyph of font.glyphsForString('e')) {
        subset.includeGlyph(glyph);
      }

      let buf = subset.encode();
      let f = fontkit.create(buf);
      assert.equal(
        f.getGlyph(1).path.toSVG(),
        font.glyphsForString('e')[0].path.toSVG(),
      );
    });

    it('should re-encode glyphs of a font with set variations', function () {
      let font = fontkit
        .openSync(new URL('data/fonttest/TestGVAROne.ttf', import.meta.url))
        .getVariation({ wght: 300 });

      let subset = font.createSubset();
      for (let glyph of font.glyphsForString('彌')) {
        subset.includeGlyph(glyph);
      }

      let buf = subset.encode();
      let f = fontkit.create(buf);
      assert.equal(
        f.getGlyph(1).path.toSVG(),
        font.glyphsForString('彌')[0].path.toSVG(),
      );
    });

    it('should handle composite glyphs', function () {
      let subset = font.createSubset();
      subset.includeGlyph(font.glyphsForString('é')[0]);

      let buf = subset.encode();
      let f = fontkit.create(buf);
      assert.equal(f.numGlyphs, 4);
      assert.equal(
        f.getGlyph(1).path.toSVG(),
        font.glyphsForString('é')[0].path.toSVG(),
      );
    });

    it('should handle fonts with long index to location format (indexToLocFormat = 1)', function () {
      let font = fontkit.openSync(
        new URL('data/FiraSans/FiraSans-Regular.ttf', import.meta.url),
      );
      let subset = font.createSubset();
      for (let glyph of font.glyphsForString('abcd')) {
        subset.includeGlyph(glyph);
      }

      let buf = subset.encode();
      let f = fontkit.create(buf);
      assert.equal(f.numGlyphs, 5);
      assert.equal(
        f.getGlyph(1).path.toSVG(),
        font.glyphsForString('a')[0].path.toSVG(),
      );
      // must test also second glyph which has an odd loca index
      assert.equal(
        f.getGlyph(2).path.toSVG(),
        font.glyphsForString('b')[0].path.toSVG(),
      );
    });

    describe('with set variations', function () {
      let font = fontkit
        .openSync(new URL('data/Mada/Mada-VF.ttf', import.meta.url))
        .getVariation({ wght: 900 });

      function encodeSubset(string) {
        let glyphs = font.glyphsForString(string);
        let subset = font.createSubset();
        for (let glyph of glyphs) {
          subset.includeGlyph(glyph);
        }

        return { glyphs, f: fontkit.create(subset.encode()) };
      }

      it('should re-encode glyphs whose last points repeat a flag', function () {
        let { glyphs, f } = encodeSubset('BDx');
        for (let i = 0; i < glyphs.length; i++) {
          assert.equal(f.getGlyph(i + 1).path.toSVG(), glyphs[i].path.toSVG());
        }
      });

      it('should flatten composite glyphs', function () {
        let { glyphs, f } = encodeSubset('é');
        assert.equal(f.numGlyphs, 2);
        assert.equal(f.getGlyph(1).path.toSVG(), glyphs[0].path.toSVG());
      });

      it('should write left side bearings of the varied outlines', function () {
        let { glyphs, f } = encodeSubset('aé');
        for (let i = 0; i < glyphs.length; i++) {
          assert.equal(f.hmtx.metrics.get(i + 1).bearing, glyphs[i].cbox.minX);
          assert.equal(f.getGlyph(i + 1).cbox.minX, glyphs[i].cbox.minX);
        }
      });
    });
  });

  describe('CFF subsetting', function () {
    let font = fontkit.openSync(
      new URL('data/SourceSansPro/SourceSansPro-Regular.otf', import.meta.url),
    );

    function encodeWithTopDict(values) {
      let font = fontkit.openSync(
        new URL(
          'data/SourceSansPro/SourceSansPro-Regular.otf',
          import.meta.url,
        ),
      );
      Object.assign(font['CFF '].topDict, values);

      let originalGlyph = font.glyphsForString('h')[0];
      let subset = font.createSubset();
      subset.includeGlyph(originalGlyph);
      let buffer = subset.encode();

      let stream = new r.DecodeStream(buffer);
      let CFFFont = font._tables['CFF '].constructor;
      let CFFGlyph = originalGlyph.constructor;
      let cff = new CFFFont(stream);
      let glyph = new CFFGlyph(1, [], { stream, 'CFF ': cff });
      assert.strictEqual(glyph.path.toSVG(), originalGlyph.path.toSVG());

      return { buffer, cff };
    }

    it('should omit scalar and array defaults from subsets', function () {
      let defaults = {
        FontMatrix: [0.001, -0, 0, 0.001, 0, -0],
        FontBBox: [0, 0, -0, 0],
        isFixedPitch: false,
        ItalicAngle: -0,
        UnderlinePosition: -100,
        UnderlineThickness: 50,
        UniqueID: null,
      };
      let omitted = Object.fromEntries(
        Object.keys(defaults).map((key) => [key, undefined]),
      );

      assert.deepStrictEqual(
        encodeWithTopDict(defaults).buffer,
        encodeWithTopDict(omitted).buffer,
      );
    });

    it('should preserve non-default array elements and scalar values', function () {
      let values = {
        FontMatrix: [0.001, 0, 0, 0.001, 10, 20],
        FontBBox: [0, 0, 100, 200],
        isFixedPitch: true,
        ItalicAngle: -12,
        UnderlinePosition: -90,
        UniqueID: 42,
      };
      let { cff } = encodeWithTopDict(values);

      for (let [key, value] of Object.entries(values)) {
        assert.deepStrictEqual(cff.topDict[key], value, key);
      }
    });

    it('should preserve arrays whose lengths differ from defaults', function () {
      for (let FontBBox of [[], [0, 0, 0], [0, 0, 0, 0, 0]]) {
        let { cff } = encodeWithTopDict({ FontBBox });
        assert.deepStrictEqual(cff.topDict.FontBBox, FontBBox);
      }
    });

    it('should produce a subset', function () {
      let subset = font.createSubset();
      let iterable = font.glyphsForString('hello');
      for (let i = 0; i < iterable.length; i++) {
        let glyph = iterable[i];
        subset.includeGlyph(glyph);
      }

      let buf = subset.encode();
      let stream = new r.DecodeStream(buf);
      let CFFFont = font._tables['CFF '].constructor;
      let CFFGlyph = iterable[0].constructor;
      let cff = new CFFFont(stream);
      let glyph = new CFFGlyph(1, [], { stream, 'CFF ': cff });
      assert.equal(
        glyph.path.toSVG(),
        font.glyphsForString('h')[0].path.toSVG(),
      );
    });

    it('should handle CID fonts', function () {
      let f = fontkit.openSync(
        new URL('data/NotoSansCJK/NotoSansCJKkr-Regular.otf', import.meta.url),
      );
      let subset = f.createSubset();
      let iterable = f.glyphsForString('갈휸');
      for (let i = 0; i < iterable.length; i++) {
        let glyph = iterable[i];
        subset.includeGlyph(glyph);
      }

      let buf = subset.encode();
      let stream = new r.DecodeStream(buf);
      let CFFFont = font._tables['CFF '].constructor;
      let CFFGlyph = iterable[0].constructor;
      let cff = new CFFFont(stream);
      let glyph = new CFFGlyph(1, [], { stream, 'CFF ': cff });
      assert.equal(glyph.path.toSVG(), f.glyphsForString('갈')[0].path.toSVG());
      assert.equal(cff.topDict.FDArray.length, 2);
      assert.deepEqual(cff.topDict.FDSelect.fds, [0, 1, 1]);
    });

    it('should produce a subset with asian punctuation corretly', function () {
      const koreanFont = fontkit.openSync(
        new URL('data/NotoSansCJK/NotoSansCJKkr-Regular.otf', import.meta.url),
      );
      const subset = koreanFont.createSubset();
      const iterable = koreanFont.glyphsForString('a。d');
      for (let i = 0; i < iterable.length; i++) {
        const glyph = iterable[i];
        subset.includeGlyph(glyph);
      }

      let buf = subset.encode();
      const stream = new r.DecodeStream(buf);
      let CFFFont = font._tables['CFF '].constructor;
      let CFFGlyph = iterable[0].constructor;
      const cff = new CFFFont(stream);
      let glyph = new CFFGlyph(1, [], { stream, 'CFF ': cff });
      assert.equal(
        glyph.path.toSVG(),
        koreanFont.glyphsForString('a')[0].path.toSVG(),
      );
      glyph = new CFFGlyph(2, [], { stream, 'CFF ': cff });
      assert.equal(
        glyph.path.toSVG(),
        koreanFont.glyphsForString('。')[0].path.toSVG(),
      );
      glyph = new CFFGlyph(3, [], { stream, 'CFF ': cff });
      assert.equal(
        glyph.path.toSVG(),
        koreanFont.glyphsForString('d')[0].path.toSVG(),
      );
    });
  });
});
