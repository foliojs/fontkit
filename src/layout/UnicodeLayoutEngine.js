import { getCombiningClass } from 'unicode-properties';
import BBox from '../glyph/BBox';

/**
 * This class is used when GPOS does not define 'mark' or 'mkmk' features
 * for positioning marks relative to base glyphs. It uses the unicode
 * combining class property to position marks.
 *
 * Based on code from Harfbuzz, thanks!
 * https://github.com/behdad/harfbuzz/blob/master/src/hb-ot-shape-fallback.cc
 */
export default class UnicodeLayoutEngine {
  constructor(font) {
    this.font = font;
  }

  /**
   * Positions marks on the glyphs in logical order. With `direction` 'rtl',
   * the offsets are for the glyphs once they're reversed, when marks are
   * drawn before their base.
   */
  positionGlyphs(glyphs, positions, direction = 'ltr') {
    // find each base + mark cluster, and position the marks relative to the base
    let clusterStart = 0;
    while (clusterStart < glyphs.length) {
      let clusterEnd = clusterStart;
      while (clusterEnd + 1 < glyphs.length && glyphs[clusterEnd + 1].isMark) {
        clusterEnd++;
      }

      // marks without a preceding base glyph are not positioned
      if (clusterEnd > clusterStart && !glyphs[clusterStart].isMark) {
        this.positionCluster(
          glyphs,
          positions,
          clusterStart,
          clusterEnd,
          direction,
        );
      }

      clusterStart = clusterEnd + 1;
    }

    return positions;
  }

  positionCluster(glyphs, positions, clusterStart, clusterEnd, direction) {
    let base = glyphs[clusterStart];
    let { minY, maxY } = base.cbox;
    // Like HarfBuzz, use the advance width for horizontal positioning, which
    // also works for glyphs without ink.
    let width = base.advanceWidth;
    let baseBox = new BBox(0, minY, width, maxY);

    // adjust bounding box for ligature glyphs, positioning all marks over the
    // last component
    let components = base.codePoints.length;
    if (components > 1) {
      // LTR. TODO: RTL support.
      baseBox.minX = Math.trunc(((components - 1) * width) / components);
      baseBox.maxX = baseBox.minX + Math.trunc(width / components);
    }

    // Like HarfBuzz, offset the marks from the origin of the base, which is
    // after the base in left-to-right text, and before it in right-to-left.
    let forward = direction !== 'rtl';
    let xOffset = forward ? -positions[clusterStart].xAdvance : 0;
    let yOffset = 0;
    let yGap = Math.trunc(this.font.unitsPerEm / 16);
    let clusterBox = null;
    let lastClass = null;

    // position each of the mark glyphs relative to the base glyph
    for (let index = clusterStart + 1; index <= clusterEnd; index++) {
      let mark = glyphs[index];
      let markBox = mark.cbox;
      let position = positions[index];

      let combiningClass = this.getCombiningClass(mark.codePoints[0]);

      if (combiningClass !== 'Not_Reordered') {
        // stack marks of the same class, start from the base for a new class
        if (combiningClass !== lastClass) {
          clusterBox = baseBox.copy();
          lastClass = combiningClass;
        }

        position.xOffset = position.yOffset = 0;

        // x positioning
        switch (combiningClass) {
          case 'Double_Above':
          case 'Double_Below':
            // LTR. TODO: RTL support.
            position.xOffset =
              clusterBox.maxX - Math.trunc(markBox.width / 2) - markBox.minX;
            break;

          case 'Attached_Below_Left':
          case 'Below_Left':
          case 'Above_Left':
            // left align
            position.xOffset = clusterBox.minX - markBox.minX;
            break;

          case 'Attached_Above_Right':
          case 'Below_Right':
          case 'Above_Right':
            // right align
            position.xOffset = clusterBox.maxX - markBox.maxX;
            break;

          default: // Attached_Below, Attached_Above, Below, Above, other
            // center align
            position.xOffset =
              clusterBox.minX +
              Math.trunc((clusterBox.width - markBox.width) / 2) -
              markBox.minX;
        }

        // y positioning
        switch (combiningClass) {
          case 'Double_Below':
          case 'Below_Left':
          case 'Below':
          case 'Below_Right':
            // add a small gap between the glyphs if they are not attached
            clusterBox.minY -= yGap;
          // falls through
          case 'Attached_Below_Left':
          case 'Attached_Below':
            position.yOffset = clusterBox.minY - markBox.maxY;
            // never shift up "below" marks
            if (position.yOffset > 0) {
              clusterBox.minY -= position.yOffset;
              position.yOffset = 0;
            }
            clusterBox.minY -= markBox.height;
            break;

          case 'Double_Above':
          case 'Above_Left':
          case 'Above':
          case 'Above_Right':
            // add a small gap between the glyphs if they are not attached
            clusterBox.maxY += yGap;
          // falls through
          case 'Attached_Above':
          case 'Attached_Above_Right':
            position.yOffset = clusterBox.maxY - markBox.minY;
            // don't shift down "above" marks too much
            if (position.yOffset < 0) {
              let correction = -Math.trunc(position.yOffset / 2);
              clusterBox.maxY += correction;
              position.yOffset += correction;
            }
            clusterBox.maxY += markBox.height;
            break;
        }

        position.xAdvance = position.yAdvance = 0;
        position.xOffset += xOffset;
        position.yOffset += yOffset;
      } else if (forward) {
        xOffset -= position.xAdvance;
        yOffset -= position.yAdvance;
      } else {
        xOffset += position.xAdvance;
        yOffset += position.yAdvance;
      }
    }
  }

  getCombiningClass(codePoint) {
    let combiningClass = getCombiningClass(codePoint);

    // Thai / Lao need some per-character work
    if ((codePoint & ~0xff) === 0x0e00) {
      if (combiningClass === 'Not_Reordered') {
        switch (codePoint) {
          case 0x0e31:
          case 0x0e34:
          case 0x0e35:
          case 0x0e36:
          case 0x0e37:
          case 0x0e47:
          case 0x0e4c:
          case 0x0e4d:
          case 0x0e4e:
            return 'Above_Right';

          case 0x0eb1:
          case 0x0eb4:
          case 0x0eb5:
          case 0x0eb6:
          case 0x0eb7:
          case 0x0ebb:
          case 0x0ecc:
          case 0x0ecd:
            return 'Above';

          case 0x0ebc:
            return 'Below';
        }
      } else if (codePoint === 0x0e3a) {
        // virama
        return 'Below_Right';
      }
    }

    switch (combiningClass) {
      // Hebrew

      case 'CCC10': // sheva
      case 'CCC11': // hataf segol
      case 'CCC12': // hataf patah
      case 'CCC13': // hataf qamats
      case 'CCC14': // hiriq
      case 'CCC15': // tsere
      case 'CCC16': // segol
      case 'CCC17': // patah
      case 'CCC18': // qamats
      case 'CCC20': // qubuts
      case 'CCC22': // meteg
        return 'Below';

      case 'CCC23': // rafe
        return 'Attached_Above';

      case 'CCC24': // shin dot
        return 'Above_Right';

      case 'CCC25': // sin dot
      case 'CCC19': // holam
        return 'Above_Left';

      case 'CCC26': // point varika
        return 'Above';

      case 'CCC21': // dagesh
        break;

      // Arabic and Syriac

      case 'CCC27': // fathatan
      case 'CCC28': // dammatan
      case 'CCC30': // fatha
      case 'CCC31': // damma
      case 'CCC33': // shadda
      case 'CCC34': // sukun
      case 'CCC35': // superscript alef
      case 'CCC36': // superscript alaph
        return 'Above';

      case 'CCC29': // kasratan
      case 'CCC32': // kasra
        return 'Below';

      // Thai

      case 'CCC103': // sara u / sara uu
        return 'Below_Right';

      case 'CCC107': // mai
        return 'Above_Right';

      // Lao

      case 'CCC118': // sign u / sign uu
        return 'Below';

      case 'CCC122': // mai
        return 'Above';

      // Tibetan

      case 'CCC129': // sign aa
      case 'CCC132': // sign u
        return 'Below';

      case 'CCC130': // sign i
        return 'Above';
    }

    return combiningClass;
  }
}
