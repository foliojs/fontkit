import * as fontkit from 'fontkit';
import assert from 'assert';

describe('glyphs', function () {
  describe('truetype glyphs', function () {
    let font = fontkit.openSync(new URL('data/OpenSans/OpenSans-Regular.ttf', import.meta.url));
    let mada = fontkit.openSync(new URL('data/Mada/Mada-VF.ttf', import.meta.url));

    it('should get a TTFGlyph', function () {
      let glyph = font.getGlyph(39); // D
      return assert.equal(glyph.type, 'TTF');
    });

    it('should get a path for the glyph as SVG', function () {
      let glyph = font.getGlyph(39);
      return assert.equal(glyph.path.toSVG(), 'M1368 745Q1368 383 1171.5 191.5Q975 0 606 0L201 0L201 1462L649 1462Q990 1462 1179 1273Q1368 1084 1368 745ZM1188 739Q1188 1025 1044.5 1170Q901 1315 618 1315L371 1315L371 147L578 147Q882 147 1035 296.5Q1188 446 1188 739Z');
    });

    it('should get a path for the glyph as function', function () {
      let glyph = font.getGlyph(39);
      let results = [];
      let ctx = {
        moveTo: (...args) => results.push('moveTo(' + args.join(', ') + ');'),
        lineTo: (...args) => results.push('lineTo(' + args.join(', ') + ');'),
        quadraticCurveTo: (...args) => results.push('quadraticCurveTo(' + args.join(', ') + ');'),
        bezierCurveTo: (...args) => results.push('bezierCurveTo(' + args.join(', ') + ');'),
        closePath: (...args) => results.push('closePath(' + args.join(', ') + ');')
      };

      let fn = glyph.path.toFunction();
      fn(ctx);

      return assert.equal(results.join('\n'), 'moveTo(1368, 745);\nquadraticCurveTo(1368, 383, 1171.5, 191.5);\nquadraticCurveTo(975, 0, 606, 0);\nlineTo(201, 0);\nlineTo(201, 1462);\nlineTo(649, 1462);\nquadraticCurveTo(990, 1462, 1179, 1273);\nquadraticCurveTo(1368, 1084, 1368, 745);\nclosePath();\nmoveTo(1188, 739);\nquadraticCurveTo(1188, 1025, 1044.5, 1170);\nquadraticCurveTo(901, 1315, 618, 1315);\nlineTo(371, 1315);\nlineTo(371, 147);\nlineTo(578, 147);\nquadraticCurveTo(882, 147, 1035, 296.5);\nquadraticCurveTo(1188, 446, 1188, 739);\nclosePath();');
    });

    it('should get a composite glyph', function () {
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

    it('should get the glyph cbox', function () {
      let glyph = font.getGlyph(39);
      assert.equal(glyph.cbox.minX, 201);
      assert.equal(glyph.cbox.minY, 0);
      assert.equal(glyph.cbox.maxX, 1368);
      assert.equal(glyph.cbox.maxY, 1462);
    });

    it('should get the glyph bbox', function () {
      let glyph = font.getGlyph(39);
      assert.equal(glyph.bbox.minX, 201);
      assert.equal(glyph.bbox.minY, 0);
      assert.equal(glyph.bbox.maxX, 1368);
      assert.equal(glyph.bbox.maxY, 1462);
    });

    it('should get correct bbox for runs containing blanks', function () {
      let r = font.layout('abc ef');
      assert.equal(r.bbox.minX, 94);
      assert.equal(r.bbox.minY, -20);
      assert.equal(r.bbox.maxX, 5832);
      assert.equal(r.bbox.maxY, 1567);
    });

    it('should get the advance width', function () {
      let glyph = font.getGlyph(39);
      return assert.equal(glyph.advanceWidth | 0, 1493);
    });

    it('should get the glyph name', function () {
      let glyph = font.getGlyph(171);
      return assert.equal(glyph.name, 'eacute');
    });
  });

  describe('CFF glyphs', function () {
    let font = fontkit.openSync(new URL('data/SourceSansPro/SourceSansPro-Regular.otf', import.meta.url));

    it('should get a CFFGlyph', function () {
      let glyph = font.getGlyph(5); // D
      return assert.equal(glyph.type, 'CFF');
    });

    it('should get a path for the glyph as SVG', function () {
      let glyph = font.getGlyph(5);
      return assert.equal(glyph.path.toSVG(), 'M90 0L258 0C456 0 564 122 564 331C564 539 456 656 254 656L90 656ZM173 68L173 588L248 588C401 588 478 496 478 331C478 165 401 68 248 68Z');
    });

    it('should get a path for the glyph as function', function () {
      let glyph = font.getGlyph(5);
      let results = [];
      let ctx = {
        moveTo: (...args) => results.push('moveTo(' + args.join(', ') + ');'),
        lineTo: (...args) => results.push('lineTo(' + args.join(', ') + ');'),
        quadraticCurveTo: (...args) => results.push('quadraticCurveTo(' + args.join(', ') + ');'),
        bezierCurveTo: (...args) => results.push('bezierCurveTo(' + args.join(', ') + ');'),
        closePath: (...args) => results.push('closePath(' + args.join(', ') + ');')
      };

      let fn = glyph.path.toFunction();
      fn(ctx);

      return assert.equal(results.join('\n'), 'moveTo(90, 0);\nlineTo(258, 0);\nbezierCurveTo(456, 0, 564, 122, 564, 331);\nbezierCurveTo(564, 539, 456, 656, 254, 656);\nlineTo(90, 656);\nclosePath();\nmoveTo(173, 68);\nlineTo(173, 588);\nlineTo(248, 588);\nbezierCurveTo(401, 588, 478, 496, 478, 331);\nbezierCurveTo(478, 165, 401, 68, 248, 68);\nclosePath();');
    });

    it('should get the glyph cbox', function () {
      let glyph = font.getGlyph(5);
      assert.equal(glyph.cbox.minX, 90);
      assert.equal(glyph.cbox.minY, 0);
      assert.equal(glyph.cbox.maxX, 564);
      assert.equal(glyph.cbox.maxY, 656);
    });

    it('should get the glyph bbox', function () {
      let glyph = font.getGlyph(5);
      assert.equal(glyph.bbox.minX, 90);
      assert.equal(glyph.bbox.minY, 0);
      assert.equal(glyph.bbox.maxX, 564);
      assert.equal(glyph.bbox.maxY, 656);
    });

    it('should get the glyph name', function () {
      let glyph = font.getGlyph(5);
      return assert.equal(glyph.name, 'D');
    });

    it('should handle seac-like endchar operators', function () {
      let font2 = fontkit.openSync(new URL('data/unicode/TestCFFThree.otf', import.meta.url));
      assert.equal(font2.getGlyph(3).path.toSVG(), 'M203 367C227 440 248 512 268 588L272 588C293 512 314 440 338 367L369 267L172 267ZM3 0L88 0L151 200L390 200L452 0L541 0L319 656L225 656ZM300 653L342 694L201 861L143 806Z');
      assert.equal(font2.getGlyph(4).path.toSVG(), 'M323 -12C457 -12 558 60 558 271L558 656L478 656L478 269C478 111 410 61 323 61C237 61 170 111 170 269L170 656L87 656L87 271C87 60 189 -12 323 -12ZM220 727C248 727 269 749 269 777C269 805 248 827 220 827C191 827 170 805 170 777C170 749 191 727 220 727ZM412 727C441 727 462 749 462 777C462 805 441 827 412 827C384 827 363 805 363 777C363 749 384 727 412 727Z');
    })
  });

  describe('CFF glyphs (CID font)', function () {
    let font = fontkit.openSync(new URL('data/NotoSansCJK/NotoSansCJKkr-Regular.otf', import.meta.url));

    it('should get a CFFGlyph', function () {
      let glyph = font.getGlyph(27); // :
      return assert.equal(glyph.type, 'CFF');
    });

    it('should get a path for the glyph', function () {
      let glyph = font.getGlyph(27);
      return assert.equal(glyph.path.toSVG(), 'M139 390C175 390 205 419 205 459C205 501 175 530 139 530C103 530 73 501 73 459C73 419 103 390 139 390ZM139 -13C175 -13 205 15 205 56C205 97 175 127 139 127C103 127 73 97 73 56C73 15 103 -13 139 -13Z');
    });

    it('should get the glyph cbox', function () {
      let glyph = font.getGlyph(27);
      assert.equal(glyph.cbox.minX, 73);
      assert.equal(glyph.cbox.minY, -13);
      assert.equal(glyph.cbox.maxX, 205);
      assert.equal(glyph.cbox.maxY, 530);
    });

    it('should get the glyph bbox', function () {
      let glyph = font.getGlyph(27);
      assert.equal(glyph.bbox.minX, 73);
      assert.equal(glyph.bbox.minY, -13);
      assert.equal(glyph.bbox.maxX, 205);
      assert.equal(glyph.bbox.maxY, 530);
    });

    it('should get the correct fd index', function () {
      let cff = font['CFF '];
      // FDSelect ranges
      // {first: 0, fd: 5 }
      // {first: 1, fd: 15 }
      // {first: 17, fd: 17 }
      // {first: 27, fd: 15 }
      // {first: 102, fd: 3 }
      assert.equal(cff.fdForGlyph(0), 5);
      assert.equal(cff.fdForGlyph(1), 15);
      assert.equal(cff.fdForGlyph(10), 15);
      assert.equal(cff.fdForGlyph(16), 15);
      assert.equal(cff.fdForGlyph(17), 17);
      assert.equal(cff.fdForGlyph(26), 17);
      assert.equal(cff.fdForGlyph(27), 15);
      assert.equal(cff.fdForGlyph(28), 15);
      assert.equal(cff.fdForGlyph(102), 3);
    });
  });

  describe('SBIX glyphs', function () {
    let font = fontkit.openSync(new URL('data/ss-emoji/ss-emoji-apple.ttf', import.meta.url));

    it('should get an SBIXGlyph', function () {
      let glyph = font.glyphsForString('😜')[0];
      return assert.equal(glyph.type, 'SBIX');
    });

    it('should have an empty path', function () {
      let glyph = font.glyphsForString('😜')[0];
      return assert.equal(glyph.path.toSVG(), 'M0 2048ZM2055 -7Z');
    });

    it('should get an image', function () {
      let glyph = font.glyphsForString('😜')[0];
      let image = glyph.getImageForSize(32);
      return assert.deepEqual(image, {
        originX: 0,
        originY: 0,
        type: 'png ',
        data: image.data
      });
    });

    it('should get the glyph name', function () {
      let glyph = font.glyphsForString('😜')[0];
      return assert.equal(glyph.name, 'stuckouttonguewinkingeye');
    });
  });

  describe('COLR glyphs', function () {
    let font = fontkit.openSync(new URL('data/ss-emoji/ss-emoji-microsoft.ttf', import.meta.url));

    it('should get an SBIXGlyph', function () {
      let glyph = font.glyphsForString('😜')[0];
      return assert.equal(glyph.type, 'COLR');
    });

    it('should get layers', function () {
      let glyph = font.glyphsForString('😜')[0];
      return assert.deepEqual(glyph.layers, [
        { glyph: font.getGlyph(247), color: { red: 252, green: 194, blue: 0, alpha: 255 } },
        { glyph: font.getGlyph(248), color: { red: 159, green: 79, blue: 0, alpha: 255 } },
        { glyph: font.getGlyph(249), color: { red: 229, green: 65, blue: 65, alpha: 255 } }
      ]);
    });

    it('should get empty path', function () {
      let glyph = font.glyphsForString('😜')[0];
      return assert.equal(glyph.path.toSVG(), '');
    });

    it('should get bbox', function () {
      let glyph = font.glyphsForString('😜')[0];
      assert.deepEqual(glyph.bbox.minX, 0);
      assert.deepEqual(glyph.bbox.minY, 0);
      assert.deepEqual(glyph.bbox.maxX, 2048);
      assert.deepEqual(glyph.bbox.maxY, 2048);
    });

    it('should get the glyph name', function () {
      let glyph = font.glyphsForString('😜')[0];
      return assert.equal(glyph.name, 'stuckouttonguewinkingeye');
    });
  });

  describe('WOFF ttf glyphs', function () {
    let font = fontkit.openSync(new URL('data/SourceSansPro/SourceSansPro-Regular.ttf.woff', import.meta.url));
    let glyph = font.glyphsForString('D')[0];

    it('should get the glyph name', function () {
      return assert.equal(glyph.name, 'D');
    });

    it('should get a TTFGlyph', function () {
      return assert.equal(glyph.type, 'TTF');
    });

    it('should get a quadratic path for the glyph', function () {
      return assert.equal(glyph.path.toSVG(), 'M90 0L90 656L254 656Q406 656 485 571.5Q564 487 564 331Q564 174 485.5 87Q407 0 258 0ZM173 68L248 68Q363 68 420.5 137.5Q478 207 478 331Q478 455 420.5 521.5Q363 588 248 588L173 588Z');
    });
  });

  describe('WOFF otf glyphs', function () {
    let font = fontkit.openSync(new URL('data/SourceSansPro/SourceSansPro-Regular.otf.woff', import.meta.url));
    let glyph = font.glyphsForString('D')[0];

    it('should get the glyph name', function () {
      return assert.equal(glyph.name, 'D');
    });

    it('should get a CFFGlyph', function () {
      return assert.equal(glyph.type, 'CFF');
    });

    it('should get a cubic path for the glyph', function () {
      return assert.equal(glyph.path.toSVG(), 'M90 0L258 0C456 0 564 122 564 331C564 539 456 656 254 656L90 656ZM173 68L173 588L248 588C401 588 478 496 478 331C478 165 401 68 248 68Z');
    });
  });

  describe('WOFF2 ttf glyph', function () {
    let font = fontkit.openSync(new URL('data/SourceSansPro/SourceSansPro-Regular.ttf.woff2', import.meta.url));

    let glyph = font.glyphsForString('D')[0];

    it('should get the glyph name', function () {
      return assert.equal(glyph.name, 'D');
    });

    it('should get a WOFF2Glyph', function () {
      return assert.equal(glyph.type, 'WOFF2');
    });

    it('should get a path for the glyph', function () {
      let tglyph = font.glyphsForString('T')[0];
      return assert.equal(tglyph.path.toSVG(), 'M226 0L226 586L28 586L28 656L508 656L508 586L310 586L310 0Z');
    });

    it('should get a correct quadratic path for all contours', function () {
      return assert.equal(glyph.path.toSVG(), 'M90 0L90 656L254 656Q406 656 485 571.5Q564 487 564 331Q564 174 485.5 87Q407 0 258 0ZM173 68L248 68Q363 68 420.5 137.5Q478 207 478 331Q478 455 420.5 521.5Q363 588 248 588L173 588Z');
    });

    it('should get the ttf glyph cbox', function () {
      assert.equal(glyph.cbox.minX, 90);
      assert.equal(glyph.cbox.minY, 0);
      assert.equal(glyph.cbox.maxX, 564);
      assert.equal(glyph.cbox.maxY, 656);
    });

    it('should get the ttf glyph bbox', function () {
      assert.equal(glyph.bbox.minX, 90);
      assert.equal(glyph.bbox.minY, 0);
      assert.equal(glyph.bbox.maxX, 564);
      assert.equal(glyph.bbox.maxY, 656);
    });
  });

  describe('WOFF2 otf glyph', function () {
    let font = fontkit.openSync(new URL('data/SourceSansPro/SourceSansPro-Regular.otf.woff2', import.meta.url));

    let glyph = font.glyphsForString('D')[0];

    it('should get the glyph name', function () {
      return assert.equal(glyph.name, 'D');
    });

    it('should get a CFFGlyph', function () {
      return assert.equal(glyph.type, 'CFF');
    });

    it('should get a path for the glyph', function () {
      let tglyph = font.glyphsForString('T')[0];
      return assert.equal(tglyph.path.toSVG(), 'M226 0L310 0L310 586L508 586L508 656L28 656L28 586L226 586Z');
    });

    it('should get a correct cubic path for all contours', function () {
      return assert.equal(glyph.path.toSVG(), 'M90 0L258 0C456 0 564 122 564 331C564 539 456 656 254 656L90 656ZM173 68L173 588L248 588C401 588 478 496 478 331C478 165 401 68 248 68Z');
    });

    it('should get the otf glyph cbox', function () {
      assert.equal(glyph.cbox.minX, 90);
      assert.equal(glyph.cbox.minY, 0);
      assert.equal(glyph.cbox.maxX, 564);
      assert.equal(glyph.cbox.maxY, 656);
    });

    it('should get the otf glyph bbox', function () {
      assert.equal(glyph.bbox.minX, 90);
      assert.equal(glyph.bbox.minY, 0);
      assert.equal(glyph.bbox.maxX, 564);
      assert.equal(glyph.bbox.maxY, 656);
    });
  });
});
