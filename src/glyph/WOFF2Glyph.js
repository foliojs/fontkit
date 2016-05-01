import TTFGlyph from './TTFGlyph';

// This is a subclass of TTFGlyph for WOFF2, where the decoding is different
// for simple glyphs. We have to do this ahead of time (it's done in WOFF2Font)
// so this class just returns the pre-decoded glyph data.
export default class WOFF2Glyph extends TTFGlyph {
  _decode() {
    return this._font._transformedGlyphs[this.id];
  }
    
  _getCBox() {
    return this.path.bbox;
  }
}
