import * as fontkit from 'fontkit';
import assert from 'assert';

describe('glyph positioning', function () {
  describe('basic positioning', function () {
    let font = fontkit.openSync(new URL('data/SourceSansPro/SourceSansPro-Regular.otf', import.meta.url));

    it('should get a glyph width', () => assert.equal(font.getGlyph(5).advanceWidth, 615));
  });

  describe('opentype positioning', function () {
    let font = fontkit.openSync(new URL('data/SourceSansPro/SourceSansPro-Regular.otf', import.meta.url));

    it('should apply opentype GPOS features', function () {
      let { positions } = font.layout('Twitter');
      return assert.deepEqual(positions.map(p => p.xAdvance), [502, 718, 246, 318, 324, 496, 347]);
    });

    it('should ignore duplicate features', function () {
      let { positions } = font.layout('Twitter', ['kern', 'kern']);
      return assert.deepEqual(positions.map(p => p.xAdvance), [502, 718, 246, 318, 324, 496, 347]);
    });
  });

  describe('AAT features', function () {
    let font = fontkit.openSync(new URL('data/Play/Play-Regular.ttf', import.meta.url));

    it('should apply kerning by default', function () {
      let { positions } = font.layout('Twitter');
      return assert.deepEqual(positions.map(p => p.xAdvance), [535, 792, 246, 372, 402, 535, 351]);
    });
  });
});
