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
  });

  describe('WOFF2 TrueType subsetting', function () {
    function open(name) {
      return fontkit.openSync(new URL(`data/${name}`, import.meta.url));
    }

    function checkSubset(font, reference, ids) {
      let subset = font.createSubset();
      for (let id of ids) subset.includeGlyph(id);
      let result = fontkit.create(subset.encode());
      assert.equal(result.numGlyphs, subset.glyphs.length);
      for (let [index, id] of subset.glyphs.entries()) {
        let actual = result.getGlyph(index);
        let expected = reference.getGlyph(id);
        assert.equal(actual.path.toSVG(), expected.path.toSVG());
        assert.equal(actual.advanceWidth, expected.advanceWidth);
        assert.equal(
          actual._getMetrics().leftBearing,
          expected._getMetrics().leftBearing,
        );
        let decoded = actual._decode();
        let original = expected._decode();
        if (original && original.numberOfContours > 0) {
          assert.deepEqual(decoded.points, original.points);
          assert.deepEqual(decoded.instructions, original.instructions);
          for (let field of ['xMin', 'yMin', 'xMax', 'yMax']) {
            assert.equal(decoded[field], original[field]);
          }
        } else if (original && original.numberOfContours < 0) {
          // Components and their instructions are already in TrueType format.
          let source = reference._getTableStream('glyf');
          source.pos += reference.loca.offsets[id];
          let bytes = new Uint8Array(
            source.readBuffer(
              reference.loca.offsets[id + 1] - reference.loca.offsets[id],
            ),
          );
          let view = new DataView(bytes.buffer);
          let hasInstructions = false;
          for (let component of original.components) {
            hasInstructions ||= !!(view.getUint16(component.pos - 2) & 0x100);
            view.setUint16(component.pos, subset.mapping[component.glyphID]);
          }
          let last = original.components[original.components.length - 1];
          let flags = view.getUint16(last.pos - 2);
          let end = last.pos + 2 + (flags & 1 ? 4 : 2);
          end += flags & 8 ? 2 : flags & 64 ? 4 : flags & 128 ? 8 : 0;
          if (hasInstructions) end += 2 + view.getUint16(end);
          bytes = bytes.subarray(0, end);
          let output = result._getTableStream('glyf');
          output.pos += result.loca.offsets[index];
          assert.deepEqual(output.readBuffer(bytes.length), bytes);
        } else {
          assert.equal(
            result.loca.offsets[index],
            result.loca.offsets[index + 1],
          );
        }
      }
      assert.deepEqual(subset.encode(), result.stream.buffer);
      return result;
    }

    it('preserves hinted glyphs, component arguments and overlapping contours', function () {
      let font = open('FontkitSubsetTest/FontkitSubsetTest.woff2');
      let reference = open('FontkitSubsetTest/FontkitSubsetTest.ttf');
      assert.deepEqual(reference.getGlyph(1)._decode().instructions, [0, 1]);
      assert.equal(reference.getGlyph(1)._decode().points[0].onCurve, false);
      assert.equal(reference.getGlyph(2)._decode().points.length, 300);
      let result = checkSubset(font, reference, [5, 2, 1, 4, 3]);
      let data = result._getTableStream('glyf');
      // Requested glyph 2 is subset index 2, after .notdef and the composite.
      data.pos += result.loca.offsets[2] + 10 + 2 + 2 + 2;
      assert.equal(data.readUInt8() & 0x40, 0x40);
      assert.equal(result.head.indexToLocFormat, 1);
    });

    it('preserves the bearing of a varied composite with only empty components', function () {
      let font = open(
        'FontkitSubsetTest/FontkitSubsetTest.empty-composite.woff2',
      ).getVariation({ wght: 900 });
      let glyph = font.glyphForCodePoint(68);
      assert.equal(glyph.path.commands.length, 0);
      let subset = font.createSubset();
      let id = subset.includeGlyph(glyph);
      let output = fontkit.create(subset.encode()).getGlyph(id);
      assert.equal(output.path.commands.length, 0);
      assert.equal(output._decode().numberOfContours, -1);
      assert.deepEqual(
        ['xMin', 'yMin', 'xMax', 'yMax'].map((key) => output._decode()[key]),
        [0, 0, 0, 0],
      );
      assert.equal(output.advanceWidth, 600);
      assert.equal(output._getMetrics().leftBearing, 17);
    });

    it('preserves stored bounds and bearing for a varied empty composite', function () {
      let font = open(
        'FontkitSubsetTest/FontkitSubsetTest.nonzero-empty-composite.woff2',
      ).getVariation({ wght: 900 });
      let glyph = font.glyphForCodePoint(68);
      let fields = ['xMin', 'yMin', 'xMax', 'yMax'];
      let bounds = fields.map((key) => glyph._decode()[key]);
      assert.deepEqual(bounds, [100, 0, 100, 0]);
      assert.equal(glyph.path.commands.length, 0);
      assert.equal(glyph._getMetrics().leftBearing, 17);
      let subset = font.createSubset();
      let id = subset.includeGlyph(glyph);
      let output = fontkit.create(subset.encode()).getGlyph(id);
      assert.equal(output.path.commands.length, 0);
      assert.deepEqual(
        fields.map((key) => output._decode()[key]),
        bounds,
      );
      assert.equal(output.advanceWidth, glyph.advanceWidth);
      assert.equal(
        output._getMetrics().leftBearing,
        glyph._getMetrics().leftBearing,
      );
    });

    it('preserves overlap flags and widens varied component arguments', function () {
      let font = open('FontkitSubsetTest/FontkitSubsetTest.variable.woff2');
      let variation = font.getVariation({ wght: 900 });
      let subset = variation.createSubset();
      let compositeId = subset.includeGlyph(5);
      let repeatedId = subset.includeGlyph(2);
      let result = fontkit.create(subset.encode());
      let composite = result.getGlyph(compositeId)._decode();
      assert.equal(composite.components[0].dx, 225);
      assert.equal(composite.components[0].dy, 50);
      assert.equal(composite.components[1].dx, 0);
      assert.equal(composite.components[1].dy, 0);
      let stream = result._getTableStream('glyf');
      stream.pos += result.loca.offsets[compositeId] + 10;
      assert.equal(stream.readUInt16BE() & 1, 1);
      stream = result._getTableStream('glyf');
      stream.pos += result.loca.offsets[repeatedId] + 16;
      assert.equal(stream.readUInt8() & 0x40, 0x40);
      assert.equal(font.getGlyph(5)._decode().components[0].dx, 25);
    });

    it('does not read transformed source loca offsets', function () {
      let font = open('FontkitSubsetTest/FontkitSubsetTest.woff2');
      let decode = font._decodeTable;
      font._decodeTable = function (table) {
        assert.notEqual(table.tag, 'loca');
        return decode.call(this, table);
      };
      let subset = font.createSubset();
      subset.includeGlyph(5);
      assert.equal(fontkit.create(subset.encode()).head.indexToLocFormat, 1);
    });

    it('refuses unsupported transformed horizontal metrics', function () {
      let font = open('FontkitSubsetTest/FontkitSubsetTest.hmtx.woff2');
      assert.equal(font.directory.tables.hmtx.transformed, true);
      let subset = font.createSubset();
      subset.includeGlyph(1);
      assert.throws(() => subset.encode(), /transformed hmtx/);
    });

    for (let text of ['Abcd', 'é', ' A ']) {
      it(`preserves points, instructions and metrics for ${JSON.stringify(text)}`, function () {
        let font = open('SourceSansPro/SourceSansPro-Regular.ttf.woff2');
        let reference = open('SourceSansPro/SourceSansPro-Regular.ttf.woff');
        assert.ok(font.glyphsForString('A')[0].path.commands.length > 0);
        checkSubset(
          font,
          reference,
          font.glyphsForString(text).map((g) => g.id),
        );
      });
    }

    it('preserves every glyph of a transformed font', function () {
      let font = open('SourceSansPro/SourceSansPro-Regular.ttf.woff2');
      let reference = open('SourceSansPro/SourceSansPro-Regular.ttf.woff');
      checkSubset(
        font,
        reference,
        Array.from({ length: font.numGlyphs }, (_, id) => id).reverse(),
      );
    });

    for (let name of ['TestGVAROne', 'TestGVAROne.untransformed']) {
      it(`subsets ${name} without changing its source`, function () {
        let font = open(`fonttest/${name}.woff2`);
        let reference = open('fonttest/TestGVAROne.ttf');
        checkSubset(
          font,
          reference,
          Array.from({ length: font.numGlyphs }, (_, id) => id),
        );
        assert.equal(
          font.getGlyph(0).path.toSVG(),
          reference.getGlyph(0).path.toSVG(),
        );
      });
    }

    it('subsets simple glyphs at non-default variation coordinates', function () {
      let font = open('fonttest/TestGVAROne.woff2');
      let variation = font.getVariation({ wght: 300 });
      let glyph = variation.glyphsForString('彌')[0];
      let subset = variation.createSubset();
      let id = subset.includeGlyph(glyph);
      let result = fontkit.create(subset.encode()).getGlyph(id);
      assert.equal(result.path.toSVG(), glyph.path.toSVG());
      assert.equal(result.advanceWidth, glyph.advanceWidth);
      assert.equal(
        font.getGlyph(glyph.id).path.toSVG(),
        open('fonttest/TestGVAROne.ttf').getGlyph(glyph.id).path.toSVG(),
      );
    });

    it('updates phantom-point advances before encoding a varied simple glyph', function () {
      let font = open('fonttest/TestGVAROne.woff2').getVariation({ wght: 650 });
      let subset = font.createSubset();
      let result = fontkit.create(subset.encode());
      assert.equal(result.getGlyph(0).advanceWidth, 517);
    });

    it('leaves varied empty glyph records empty', function () {
      let font = open('fonttest/TestGVAROne.woff2').getVariation({ wght: 333 });
      let subset = font.createSubset();
      let id = subset.includeGlyph(font.glyphsForString(' ')[0]);
      let result = fontkit.create(subset.encode());
      assert.equal(result.loca.offsets[id], result.loca.offsets[id + 1]);
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
