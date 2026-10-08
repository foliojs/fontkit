import TTFGlyph from './TTFGlyph';
import BBox from './BBox';

/**
 * Represents a TrueType glyph in the WOFF2 format, which compresses glyphs differently.
 */
export default class WOFF2Glyph extends TTFGlyph {
  type = 'WOFF2';

  _decode() {
    // We have to decode in advance (in WOFF2Font), so just return the pre-decoded data.
    let glyph = this._font._transformedGlyphs[this.id];
    if (!glyph || !this._font._variationProcessor || glyph.numberOfContours === 0) {
      return glyph;
    }

    // A variation moves a copy of it: the decoded data is the font's, and
    // that of every other variation of it.
    let varied = Object.assign({}, glyph);
    if (glyph.numberOfContours > 0) {
      varied.points = glyph.points.map(point => point.copy());
    } else {
      varied.components = glyph.components.map(component => Object.assign({}, component));
    }

    this._applyVariation(varied);
    return varied;
  }

  _getCBox(internal) {
    // What a variation starts from is the box in the glyph's header, as it
    // is for a TTFGlyph. The path's own would be the varied glyph's, and
    // decoding that is what is asking.
    if (internal && this._font._variationProcessor) {
      let glyph = this._font._transformedGlyphs[this.id];
      return Object.freeze(new BBox(glyph.xMin, glyph.yMin, glyph.xMax, glyph.yMax));
    }

    return this.path.bbox;
  }
}
