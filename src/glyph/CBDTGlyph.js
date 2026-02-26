import Glyph from './Glyph';
import Path from './Path';

/**
 * Represents a bitmap glyph in the CBDT/CBLC format (e.g. color emoji).
 * CBDT glyphs are bitmap-based and have no vector outlines.
 * Metrics (advanceWidth etc.) come from hmtx via the base Glyph._getMetrics().
 */
export default class CBDTGlyph extends Glyph {
  type = 'CBDT';

  _getPath() {
    // CBDT glyphs are bitmap-based, no vector outlines
    return new Path();
  }

  _getCBox() {
    return this.path.cbox;
  }

  _getBBox() {
    return this.path.bbox;
  }
}

