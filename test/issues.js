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
      // HarfBuzz's vertical advance, from the hhea ascent and descent:
      assert.strictEqual(glyph.advanceHeight, 2789);
      let metrics = glyph._getMetrics();
      assert.strictEqual(metrics.topBearing, 2189);
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

  describe('#39 - right-to-left text in fonts without GSUB, GPOS or morx', function () {
    // HarfBuzz gives the same glyphs, offsets and advances.
    let layout = (font, string, direction) => {
      let run = font.layout(string, [], undefined, undefined, direction);
      return run.glyphs.map((glyph, i) => {
        let { xAdvance, xOffset, yOffset } = run.positions[i];
        return [glyph.id, xAdvance, xOffset, yOffset];
      });
    };

    describe('order and marks', function () {
      // A subset of Noticia Text Italic, which has no GSUB or GPOS table
      let font = fontkit.openSync(
        new URL(
          'data/FontkitMarkFallbackTest/FontkitMarkFallbackTest-Italic.ttf',
          import.meta.url,
        ),
      );

      it('should reverse the glyphs', function () {
        assert.deepEqual(layout(font, 'abx', 'rtl'), [
          [5, 1019, 0, 0],
          [1, 1117, 0, 0],
          [2, 1158, 0, 0],
        ]);
      });

      it('should position marks from the origin of their base', function () {
        assert.deepEqual(layout(font, 'q\u0323\u0307', 'rtl'), [
          [18, 0, 899, -53],
          [19, 0, 899, -375],
          [3, 1099, 0, 0],
        ]);
      });

      it('should keep left-to-right text in logical order', function () {
        assert.deepEqual(layout(font, 'abx\u0301', 'ltr'), [
          [2, 1158, 0, 0],
          [1, 1117, 0, 0],
          [5, 1019, 0, 0],
          [6, 0, -75, -15],
        ]);
      });
    });

    describe('kerning', function () {
      // None of the other test fonts without layout tables has a kern table,
      // so this is a subset of Noto Kufi Arabic with one kern pair added.
      let font = fontkit.openSync(
        new URL('data/NotoSans/NotoKufiArabic-NoLayout.ttf', import.meta.url),
      );

      it('should kern the glyphs in visual order', function () {
        // The font kerns lam + alef, which is drawn for alef then lam.
        assert.deepEqual(layout(font, 'ال'), [
          [3, 1257, 0, 0],
          [2, 592, 0, 0],
        ]);
        assert.deepEqual(layout(font, 'لا'), [
          [2, 592, 0, 0],
          [3, 1407, 0, 0],
        ]);
      });
    });
  });

  describe('#383 - running out of memory with Libre Barcode EAN13 Text', function () {
    let font = fontkit.openSync(
      new URL(
        'data/LibreBarcodeEAN13Text/LibreBarcodeEAN13Text-Regular.ttf',
        import.meta.url,
      ),
    );

    it('should lay out an EAN-13 code', function () {
      assert.equal(font.layout('123456789012').glyphs.length, 17);
    });

    it('should lay out an EAN-8 code', function () {
      assert.deepEqual(
        font.layout('12345670').glyphs.map((glyph) => glyph.name),
        [
          'lt.below.quiet',
          'guard.normal.ean8',
          'one.ean8.setA',
          'two.ean8.setA',
          'three.ean8.setA',
          'four.ean8.setA',
          'guard.centre.ean8',
          'five.ean8.setC',
          'six.ean8.setC',
          'seven.ean8.setC',
          'zero.ean8.setC',
          'guard.normal.ean8',
          'gt.below.quiet',
        ],
      );
    });
  });

  describe('#175 - infinite loop in a morx state machine', function () {
    it('should stop a machine that never advances', function () {
      // MORX-24 from Unicode text-rendering-tests substitutes A by B, B by C,
      // and so on back to A, without ever advancing.
      let font = fontkit.openSync(
        new URL('data/fonttest/TestMORXTwentyfour.ttf', import.meta.url),
      );

      assert.equal(font.layout('ABCDE').glyphs.length, 5);
    });
  });

  describe('#171, #172, #173 - AAT glyph insertion', function () {
    let openFont = (file) =>
      fontkit.openSync(new URL(`data/fonttest/${file}`, import.meta.url));

    // MORX-29 to MORX-33 and MORX-35 from Unicode text-rendering-tests
    let cases = [
      [
        'TestMORXTwentynine.ttf',
        'PQRMMXXMMYYAZZ',
        'P Q R M M X X M I N S M Y Y A Z Z',
      ],
      [
        'TestMORXTwentynine.ttf',
        'PQRMMXXMMYYBZZ',
        'P Q R M M X X M M I N S Y Y B Z Z',
      ],
      [
        'TestMORXTwentynine.ttf',
        'PQRMMXXMMYYCZZ',
        'P Q R M M X X M M Y Y I N S C Z Z',
      ],
      [
        'TestMORXTwentynine.ttf',
        'PQRMMXXMMYYDZZ',
        'P Q R M M X X M M Y Y D I N S Z Z',
      ],
      [
        'TestMORXTwentynine.ttf',
        'PQRMMXXXAYYAZZ',
        'P Q R M I N S I N S M X X X A Y Y A Z Z',
      ],
      [
        'TestMORXTwentynine.ttf',
        'PQRMMXXXAYYBZZ',
        'P Q R M I I N S N S M X X X A Y Y B Z Z',
      ],
      [
        'TestMORXTwentynine.ttf',
        'PQRMMXXXBYYAZZ',
        'P Q R M I N S M I N S X X X B Y Y A Z Z',
      ],
      [
        'TestMORXTwentynine.ttf',
        'PQRMMXXXBYYBZZ',
        'P Q R M M I N S I N S X X X B Y Y B Z Z',
      ],
      ['TestMORXThirtyone.ttf', 'XXAYYAZZ', 'I N I N S S X X A Y Y A Z Z'],
      ['TestMORXThirtyone.ttf', 'XXAYYBYY', 'I N S I N S X X A Y Y B Y Y'],
      ['TestMORXThirtyone.ttf', 'XXBYYAZZ', 'X I I N S N S X B Y Y A Z Z'],
      ['TestMORXThirtyone.ttf', 'XXBYYBZZ', 'X I N I N S S X B Y Y B Z Z'],
      ['TestMORXThirtyone.ttf', 'MPQRAXYZA', 'I N S M I N S P Q R A X Y Z A'],
      ['TestMORXThirtyone.ttf', 'MPQRAXYZB', 'I N S M P I N S Q R A X Y Z B'],
      ['TestMORXThirtyone.ttf', 'MPQRBXYZA', 'M I N S I N S P Q R B X Y Z A'],
      ['TestMORXThirtyone.ttf', 'MPQRBXYZB', 'M I N S P I N S Q R B X Y Z B'],
      ['TestMORXThirtytwo.ttf', 'A', 'I N S A'],
      ['TestMORXThirtytwo.ttf', 'XAY', 'I N S X A Y'],
      ['TestMORXThirtytwo.ttf', 'B', 'B I N S'],
      ['TestMORXThirtytwo.ttf', 'XBY', 'X I N S B Y'],
      ['TestMORXThirtythree.ttf', 'ha', 'h a h a'],
      ['TestMORXThirtythree.ttf', 'haha', 'h a h a h a h a'],
      ['TestMORXThirtythree.ttf', 'ah', 'a h'],
      ['TestMORXThirtyfive.ttf', 'A', 'A B C E'],
      ['TestMORXThirtyfive.ttf', 'XAY', 'X A B C E Y'],
    ];

    for (let [file, text, expected] of cases) {
      it(`should lay out ${text} with ${file}`, function () {
        let glyphs = openFont(file).layout(text).glyphs;
        assert.equal(glyphs.map((glyph) => glyph.name).join(' '), expected);
      });
    }
  });

  describe('#174 - running out of memory with AAT glyph insertion', function () {
    this.timeout(10000);

    let openFont = (file) =>
      fontkit.openSync(new URL(`data/fonttest/${file}`, import.meta.url));

    it('should limit the glyphs inserted by nine insertion subtables', function () {
      // MORX-34 from Unicode text-rendering-tests inserts ten glyphs for
      // every glyph in each of nine subtables.
      let glyphs = openFont('TestMORXThirtyfour.ttf').layout('ha').glyphs;
      assert(glyphs.length <= 65536);
    });

    it('should stop inserting glyphs without advancing', function () {
      // MORX-36 from Unicode text-rendering-tests keeps inserting glyphs
      // after the current one without advancing.
      let glyphs = openFont('TestMORXThirtysix.ttf').layout('A').glyphs;
      assert(glyphs.length <= 65536);
    });
  });

  describe('#221 - billion laughs attack with GSUB', function () {
    it('should stop multiple substitutions at a length limit', function () {
      // GSUB-3 from Unicode text-rendering-tests has nine lookups that each
      // replace an o between two l's by olololololololololo.
      let font = fontkit.openSync(
        new URL('data/fonttest/TestGSUBThree.ttf', import.meta.url),
      );

      let { glyphs } = font.layout('lol');
      assert.ok(glyphs.length > 3);
      assert.ok(glyphs.length <= 65536);
    });
  });
});
