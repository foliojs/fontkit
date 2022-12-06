import Glyph from './Glyph';
import BBox from './BBox';

class COLRLayer {
  constructor(glyph, color) {
    this.glyph = glyph;
    this.color = color;
  }
}

/**
 * Represents a color (e.g. emoji) glyph in Microsoft's COLR format.
 * Each glyph in this format contain a list of colored layers, each
 * of which  is another vector glyph.
 */
export class COLRGlyph extends Glyph {
  type = 'COLR';

  _getBBox() {
    let bbox = new BBox;
    for (let i = 0; i < this.layers.length; i++) {
      let layer = this.layers[i];
      let b = layer.glyph.bbox;
      bbox.addPoint(b.minX, b.minY);
      bbox.addPoint(b.maxX, b.maxY);
    }

    return bbox;
  }

  /**
   * Returns an array of objects containing the glyph and color for
   * each layer in the composite color glyph.
   * @type {object[]}
   */
  get layers() {
    let cpal = this._font.CPAL;
    let colr = this._font.COLR;
    let low = 0;
    let high = colr.baseGlyphRecord.length - 1;

    while (low <= high) {
      let mid = (low + high) >> 1;
      var rec = colr.baseGlyphRecord[mid];

      if (this.id < rec.gid) {
        high = mid - 1;
      } else if (this.id > rec.gid) {
        low = mid + 1;
      } else {
        var baseLayer = rec;
        break;
      }
    }

    // if base glyph not found in COLR table,
    // default to normal glyph from glyf or CFF
    if (baseLayer == null) {
      var g = this._font._getBaseGlyph(this.id);
      var color = {
        red: 0,
        green: 0,
        blue: 0,
        alpha: 255
      };

      return [new COLRLayer(g, color)];
    }

    // otherwise, return an array of all the layers
    let layers = [];
    for (let i = baseLayer.firstLayerIndex; i < baseLayer.firstLayerIndex + baseLayer.numLayers; i++) {
      var rec = colr.layerRecords[i];
      var color = cpal.colorRecords[rec.paletteIndex];
      var g = this._font._getBaseGlyph(rec.gid);
      layers.push(new COLRLayer(g, color));
    }

    return layers;
  }

  render(ctx, size) {
    for (let {glyph, color} of this.layers) {
      ctx.fillColor([color.red, color.green, color.blue], color.alpha / 255 * 100);
      glyph.render(ctx, size);
    }

    return;
  }
  _getContours() {
    var base = this._font._getBaseGlyphUncached(this.id);
    return base._getContours();
  }

}

/**
 * Represents a color (e.g. emoji) glyph in Microsoft/Google's COLRv1
 * format. Each glyph in this format contains a directed acyclic graph
 * of Paint structures.
 */
export class COLRv1Glyph extends COLRGlyph {
  type = 'COLRv1';

  _getBBox() {
    // If we have a clip list item, use that
    let colr = this._font.COLR;
    if (colr.clipList) {
      for (var clip of colr.clipList.clips) {
        if (clip.startGlyphId <= this.id && this.id <= clip.endGlyphId) {
          let box = clip.clipBox;
          return new BBox(
            box.xMin,
            box.yMin,
            box.xMax,
            box.yMax
          );
        }
      }
    }
    return super._getBBox();
  }
  render(ctx, size) {
    this.paint.render(ctx, size);
  }
}
