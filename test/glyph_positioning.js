import * as fontkit from 'fontkit';
import assert from 'assert';

describe('glyph positioning', function () {
  describe('basic positioning', function () {
    let font = fontkit.openSync(
      new URL('data/SourceSansPro/SourceSansPro-Regular.otf', import.meta.url),
    );

    it('should get a glyph width', () =>
      assert.equal(font.getGlyph(5).advanceWidth, 615));
  });

  describe('opentype positioning', function () {
    let font = fontkit.openSync(
      new URL('data/SourceSansPro/SourceSansPro-Regular.otf', import.meta.url),
    );

    it('should apply opentype GPOS features', function () {
      let { positions } = font.layout('Twitter');
      return assert.deepEqual(
        positions.map((p) => p.xAdvance),
        [502, 718, 246, 318, 324, 496, 347],
      );
    });

    it('should ignore duplicate features', function () {
      let { positions } = font.layout('Twitter', ['kern', 'kern']);
      return assert.deepEqual(
        positions.map((p) => p.xAdvance),
        [502, 718, 246, 318, 324, 496, 347],
      );
    });
  });

  describe('AAT features', function () {
    let font = fontkit.openSync(
      new URL('data/Play/Play-Regular.ttf', import.meta.url),
    );

    it('should apply kerning by default', function () {
      let { positions } = font.layout('Twitter');
      return assert.deepEqual(
        positions.map((p) => p.xAdvance),
        [535, 792, 246, 372, 402, 535, 351],
      );
    });
  });

  describe('fallback mark positioning', function () {
    // A subset of Noticia Text Italic, which has no GPOS table
    let font = fontkit.openSync(
      new URL(
        'data/FontkitMarkFallbackTest/FontkitMarkFallbackTest-Italic.ttf',
        import.meta.url,
      ),
    );

    // Expected values from hb-shape: [glyph id, xAdvance, xOffset, yOffset]
    let layout = (text) => {
      let { glyphs, positions } = font.layout(text);
      return glyphs.map((glyph, i) => {
        let { xAdvance, xOffset, yOffset } = positions[i];
        return [glyph.id, xAdvance, xOffset, yOffset];
      });
    };

    it('should stack marks of the same class above the base', () =>
      assert.deepEqual(layout('x́̈'), [
        [5, 1019, 0, 0],
        [6, 0, -75, -15],
        [16, 0, -59, 478],
      ]));

    it('should position marks below and above the base', () =>
      assert.deepEqual(layout('q̣̇'), [
        [3, 1099, 0, 0],
        [19, 0, -200, -375],
        [18, 0, -200, -53],
      ]));

    it('should never shift marks below the base up', () =>
      assert.deepEqual(layout('ḇ̃'), [
        [1, 1117, 0, 0],
        [20, 0, -51, 0],
        [12, 0, 8, 422],
      ]));

    it('should position attached marks without a gap', () =>
      assert.deepEqual(layout('á̧'), [
        [2, 1158, 0, 0],
        [25, 0, -161, -59],
        [6, 0, -144, -15],
      ]));

    it('should right align attached marks above right', () =>
      assert.deepEqual(layout('y̛'), [
        [4, 1204, 0, 0],
        [9, 0, 194, 249],
      ]));
  });
});
