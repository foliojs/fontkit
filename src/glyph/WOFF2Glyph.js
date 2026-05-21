import TTFGlyph, { Point } from './TTFGlyph';
import Glyph from './Glyph';

/**
 * Represents a TrueType glyph in the WOFF2 format, which compresses glyphs differently.
 */
export default class WOFF2Glyph extends TTFGlyph {
  type = 'WOFF2';

  _decode() {
    let cached = this._font._transformedGlyphs[this.id];
    if (!cached) {
      return null;
    }

    let variationProcessor = this._font._variationProcessor;
    if (!variationProcessor) {
      // No variations to apply — return the pre-decoded data directly so the
      // non-variable path stays a zero-copy lookup.
      return cached;
    }

    // Clone the cached glyph so we can apply per-instance variation deltas
    // without affecting other variations that share the same _transformedGlyphs
    // cache on the font. Provide xMin/yMax placeholders so that downstream
    // metric recomputation in TTFGlyph._getContours has well-defined inputs
    // (the transformed glyf format doesn't carry per-glyph bbox unless the
    // bbox bitmap explicitly marks it, which fontkit doesn't read).
    let glyph = {
      numberOfContours: cached.numberOfContours,
      xMin: 0,
      yMin: 0,
      xMax: 0,
      yMax: 0,
    };

    // Initialize this._metrics from hmtx so that the post-variation update
    // in TTFGlyph._getContours can assign onto it without crashing. Skip
    // TTFGlyph._getMetrics — it eagerly triggers .path, which re-enters
    // _decode and recurses. Pass a placeholder cbox so the vmtx-less branch
    // doesn't pull this.cbox (which also triggers .path).
    let metrics = Glyph.prototype._getMetrics.call(this, { maxY: 0 });
    let phantoms = [
      new Point(false, true, 0, 0),
      new Point(false, true, metrics.advanceWidth, 0),
      new Point(false, true, 0, 0),
      new Point(false, true, 0, -metrics.advanceHeight),
    ];

    if (cached.points) {
      glyph.points = cached.points.map(p => p.copy());
      let points = glyph.points.concat(phantoms);
      variationProcessor.transformPoints(this.id, points);
      glyph.phantomPoints = points.slice(-4);
    }

    if (cached.components) {
      glyph.components = cached.components.map(c => {
        return Object.assign(Object.create(Object.getPrototypeOf(c)), c);
      });

      let points = [];
      for (let component of glyph.components) {
        points.push(new Point(true, true, component.dx, component.dy));
      }
      points.push(...phantoms);

      variationProcessor.transformPoints(this.id, points);
      glyph.phantomPoints = points.splice(-4, 4);

      for (let i = 0; i < points.length; i++) {
        glyph.components[i].dx = points[i].x;
        glyph.components[i].dy = points[i].y;
      }
    }

    return glyph;
  }

  _getCBox() {
    return this.path.bbox;
  }
}
