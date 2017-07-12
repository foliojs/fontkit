import fontkit from '../src';
import assert from 'assert';
import BBox from '../src/glyph/BBox';

describe('glyphs', function() {
  describe('truetype glyphs', function() {
    let font = fontkit.openSync(__dirname + '/data/OpenSans/OpenSans-Regular.ttf');
    let mada = fontkit.openSync(__dirname + '/data/Mada/Mada-VF.ttf');

    it('should get a TTFGlyph', function() {
      let glyph = font.getGlyph(39); // D
      return assert.equal(glyph.constructor.name, 'TTFGlyph');
    });

    it('should get a path for the glyph', function() {
      let glyph = font.getGlyph(39);
      return assert.equal(glyph.path.toSVG(), 'M1368 745Q1368 383 1171.5 191.5Q975 0 606 0L201 0L201 1462L649 1462Q990 1462 1179 1273Q1368 1084 1368 745ZM1188 739Q1188 1025 1044.5 1170Q901 1315 618 1315L371 1315L371 147L578 147Q882 147 1035 296.5Q1188 446 1188 739Z');
    });

    it('should get a composite glyph', function() {
      let glyph = font.getGlyph(171); // é
      return assert.equal(glyph.path.toSVG(), 'M639 -20Q396 -20 255.5 128Q115 276 115 539Q115 804 245.5 960Q376 1116 596 1116Q802 1116 922 980.5Q1042 845 1042 623L1042 518L287 518Q292 325 384.5 225Q477 125 645 125Q822 125 995 199L995 51Q907 13 828.5 -3.5Q750 -20 639 -20ZM594 977Q462 977 383.5 891Q305 805 291 653L864 653Q864 810 794 893.5Q724 977 594 977ZM471 1266Q519 1328 574.5 1416Q630 1504 662 1569L864 1569L864 1548Q820 1483 733 1388Q646 1293 582 1241L471 1241Z');
    });

    it('should resolve composite glyphs recursively', function () {
      let r = mada.layout('ي');
      assert.equal(r.glyphs[0].path.toSVG(), 'M-140 0Q-140 -22 -125 -37Q-110 -52 -88 -52Q-66 -52 -51 -37Q-36 -22 -36 0Q-36 22 -51 37Q-66 52 -88 52Q-110 52 -125 37Q-140 22 -140 0ZM36 0Q36 -22 51 -37Q66 -52 88 -52Q110 -52 125 -37Q140 -22 140 0Q140 22 125 37Q110 52 88 52Q66 52 51 37Q36 22 36 0Z');
    });

    it('should transform points of a composite glyph', function () {
      let r = mada.layout('فا');
      assert.equal(r.glyphs[0].path.toSVG(), 'M155 624L155 84Q150 90 145.5 94.5Q141 99 136 105L292 105L292 0L156 0Q128 0 103.5 13.5Q79 27 64.5 50.5Q50 74 50 104L50 624ZM282 105L312 105L312 0L282 0Z');
    });

    it('should be able to get a scaled path at a given font size', function () {
      let glyph = font.getGlyph(39);
      assert.equal(glyph.getScaledPath(1000).toSVG(), 'M667.97 363.77Q667.97 187.01 572.02 93.51Q476.07 0 295.9 0L98.14 0L98.14 713.87L316.89 713.87Q483.4 713.87 575.68 621.58Q667.97 529.3 667.97 363.77ZM580.08 360.84Q580.08 500.49 510.01 571.29Q439.94 642.09 301.76 642.09L181.15 642.09L181.15 71.78L282.23 71.78Q430.66 71.78 505.37 144.78Q580.08 217.77 580.08 360.84Z');
    });

    it('should get the glyph cbox', function() {
      let glyph = font.getGlyph(39);
      return assert.deepEqual(glyph.cbox, new BBox(201, 0, 1368, 1462));
    });

    it('should get the glyph bbox', function() {
      let glyph = font.getGlyph(39);
      return assert.deepEqual(glyph.bbox, new BBox(201, 0, 1368, 1462));
    });

    it('should get correct bbox for runs containing blanks', function () {
      let r = font.layout('abc ef');
      return assert.deepEqual(r.bbox, new BBox(94, -20, 5832, 1567));
    });

    it('should get the advance width', function() {
      let glyph = font.getGlyph(39);
      return assert.equal(glyph.advanceWidth | 0, 1493);
    });

    it('should get the glyph name', function() {
      let glyph = font.getGlyph(171);
      return assert.equal(glyph.name, 'eacute');
    });
  });

  describe('CFF glyphs', function() {
    let font = fontkit.openSync(__dirname + '/data/SourceSansPro/SourceSansPro-Regular.otf');

    it('should get a CFFGlyph', function() {
      let glyph = font.getGlyph(5); // D
      return assert.equal(glyph.constructor.name, 'CFFGlyph');
    });

    it('should get a path for the glyph', function() {
      let glyph = font.getGlyph(5);
      return assert.equal(glyph.path.toSVG(), 'M90 0L258 0C456 0 564 122 564 331C564 539 456 656 254 656L90 656ZM173 68L173 588L248 588C401 588 478 496 478 331C478 165 401 68 248 68Z');
    });

    it('should get the glyph cbox', function() {
      let glyph = font.getGlyph(5);
      return assert.deepEqual(glyph.cbox, new BBox(90, 0, 564, 656));
    });

    it('should get the glyph bbox', function() {
      let glyph = font.getGlyph(5);
      return assert.deepEqual(glyph.bbox, new BBox(90, 0, 564, 656));
    });

    it('should get the glyph name', function() {
      let glyph = font.getGlyph(5);
      return assert.equal(glyph.name, 'D');
    });
  });

  describe('SBIX glyphs', function() {
    let font = fontkit.openSync(__dirname + '/data/ss-emoji/ss-emoji-apple.ttf');

    it('should get an SBIXGlyph', function() {
      let glyph = font.glyphsForString('😜')[0];
      return assert.equal(glyph.constructor.name, 'SBIXGlyph');
    });

    it('should have an empty path', function() {
      let glyph = font.glyphsForString('😜')[0];
      return assert.equal(glyph.path.toSVG(), 'M0 2048ZM2055 -7Z');
    });

    it('should get an image', function() {
      let glyph = font.glyphsForString('😜')[0];
      let image = glyph.getImageForSize(32);
      return assert.deepEqual(image, {
        originX: 0,
        originY: 0,
        type: 'png ',
        data: image.data
      });
    });

    it('should get the glyph name', function() {
      let glyph = font.glyphsForString('😜')[0];
      return assert.equal(glyph.name, 'stuckouttonguewinkingeye');
    });
  });

  describe('COLR glyphs', function() {
    let font = fontkit.openSync(__dirname + '/data/ss-emoji/ss-emoji-microsoft.ttf');

    it('should get an SBIXGlyph', function() {
      let glyph = font.glyphsForString('😜')[0];
      return assert.equal(glyph.constructor.name, 'COLRGlyph');
    });

    it('should get layers', function() {
      let glyph = font.glyphsForString('😜')[0];
      return assert.deepEqual(glyph.layers, [
        { glyph: font.getGlyph(247), color: { red: 252, green: 194, blue: 0, alpha: 255 }},
        { glyph: font.getGlyph(248), color: { red: 159, green: 79, blue: 0, alpha: 255 }},
        { glyph: font.getGlyph(249), color: { red: 229, green: 65, blue: 65, alpha: 255 }}
      ]);
    });

    it('should get empty path', function() {
      let glyph = font.glyphsForString('😜')[0];
      return assert.equal(glyph.path.toSVG(), '');
    });

    it('should get bbox', function() {
      let glyph = font.glyphsForString('😜')[0];
      return assert.deepEqual(glyph.bbox, new BBox(0, 0, 2048, 2048));
    });

    it('should get the glyph name', function() {
      let glyph = font.glyphsForString('😜')[0];
      return assert.equal(glyph.name, 'stuckouttonguewinkingeye');
    });
  });

  describe('WOFF glyphs', function() {
    let font = fontkit.openSync(__dirname + '/data/SourceSansPro/SourceSansPro-Regular.woff');

    it('should get a TTFGlyph', function() {
      let glyph = font.glyphsForString('T')[0];
      return assert.equal(glyph.constructor.name, 'TTFGlyph');
    });

    it('should get a path for the glyph', function() {
      let glyph = font.glyphsForString('T')[0];
      return assert.equal(glyph.path.toSVG(), 'M226 586L28 586L28 656L508 656L508 586L310 586L310 0L226 0Z');
    });

    it('should get the glyph name', function() {
      let glyph = font.glyphsForString('T')[0];
      return assert.equal(glyph.name, 'T');
    });
  });

  describe('WOFF2 glyph', function() {
    let font = fontkit.openSync(__dirname + '/data/SourceSansPro/SourceSansPro-Regular.woff2');

    it('should get a WOFF2Glyph', function() {
      let glyph = font.glyphsForString('T')[0];
      return assert.equal(glyph.constructor.name, 'WOFF2Glyph');
    });

    it('should get a path for the glyph', function() {
      let glyph = font.glyphsForString('T')[0];
      return assert.equal(glyph.path.toSVG(), 'M226 586L28 586L28 656L508 656L508 586L310 586L310 0L226 0Z');
    });

    it('should get a correct path for all contours', function() {
      let glyph = font.glyphsForString('o')[0];
      return assert.equal(glyph.path.toSVG(), 'M271 -12Q226 -12 185.5 5Q145 22 114 54.5Q83 87 64.5 134.5Q46 182 46 242Q46 303 64.5 350.5Q83 398 114 431Q145 464 185.5 481Q226 498 271 498Q316 498 356.5 481Q397 464 428 431Q459 398 477.5 350.5Q496 303 496 242Q496 182 477.5 134.5Q459 87 428 54.5Q397 22 356.5 5Q316 -12 271 -12ZM271 56Q302 56 328 69.5Q354 83 372.5 107.5Q391 132 401 166Q411 200 411 242Q411 284 401 318.5Q391 353 372.5 378Q354 403 328 416.5Q302 430 271 430Q240 430 214 416.5Q188 403 169.5 378Q151 353 141 318.5Q131 284 131 242Q131 200 141 166Q151 132 169.5 107.5Q188 83 214 69.5Q240 56 271 56Z');
    });

    it('should get the glyph cbox', function() {
      let glyph = font.glyphsForString('T')[0];
      return assert.deepEqual(glyph.cbox, new BBox(28, 0, 508, 656));
    });

    it('should get the glyph bbox', function() {
      let glyph = font.glyphsForString('T')[0];
      return assert.deepEqual(glyph.bbox, new BBox(28, 0, 508, 656));
    });

    it('should get the glyph name', function() {
      let glyph = font.glyphsForString('T')[0];
      return assert.equal(glyph.name, 'T');
    });
  });
});
