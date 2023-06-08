import * as fontkit from '../base';
import { ColorLine, ColorStop } from "../tables/COLR";
export var PAINT_OPERATIONS = [null];

// Variation deltas of values in a variable paint table come
// back from instantiator.getDelta as an integer, but sometimes
// they're actually intended to be interpreted as float values.
// This simple function just helps the code document that fact.
function deltaToFloat(f2dot14) {
  return f2dot14 / (1 << 14);
}

// Wrap the raw paint tree data into a JS object of the
// appropriate class
function makePaintOperation(paint, font) {
  if (paint.version < 1 || paint.version >= PAINT_OPERATIONS.length) {
    if (fontkit.logErrors) {
      console.error(`Unknown paint table ${paint.version}`);
    }
    return;
  }
  let thisPaint = PAINT_OPERATIONS[paint.version];
  return new thisPaint(paint, font);
}

class PaintOperation {
  constructor(paint, font) {
    this.paint = paint;
    this.font = font;
    this.cpal = font.CPAL;
    this.layerList = font.COLR.layerList?.paint;
    this.ivs = font.COLR.itemVariationStore;
    this.next = null;
    this.layers = [];
  }

  render(_ctx, _size) {
    throw new Error('Unimplemented abstract method');
  }

  // Convert a paint tree to a "static" paint tree (containing
  // no PaintVar* paints) so that it can be rendered at a given
  // location. This is done by walking the tree and calling
  // `_instantiate` on all paints.
  instantiate(processor) {
    var instantiated = new (this.constructor)(this.paint, this.font);
    instantiated = instantiated._instantiate(processor);
    if (this.next) {
      instantiated.next = this.next.instantiate(processor);
    }
    instantiated.layers = [];
    for (let layer of this.layers) {
      instantiated.layers.push(layer.instantiate(processor));
    }
    return instantiated;
  }

  // Convert a single variable paint to its static equivalent.
  // In this case, static paint operations don't need any
  // instantiating, so we just return them...
  _instantiate(_processor) {
    return this;
  }
}

class VariablePaintOperation extends PaintOperation {
  // ...but variable paint operations require some operation-specific
  // processing to turn them into a static equivalent.
  _instantiate(_processor) {
    throw new Error('Unimplemented abstract method');
  }

  _instantiateColorLine(varcolorline, instantiator) {
    let stops = [];
    for (var stop of varcolorline.colorStops) {
      let [posDelta, alphaDelta] = this.getDeltas(instantiator, 2, stop);
      stops.push({
        stopOffset: stop.stopOffset + posDelta / (1 << 14),
        paletteIndex: stop.paletteIndex,
        alpha: stop.alpha + alphaDelta / (1 << 14),
      });
    }
    return {
      extend: varcolorline.extend,
      numStops: varcolorline.numStops,
      colorStops: stops
    };
  }

  getDeltas(instantiator, count, thing) {
    let res = [];
    if (!thing) { thing = this.paint; }
    let ix = thing.varIndexBase;
    while (res.length < count) {
      let {outerIndex, innerIndex} = this.font.COLR.varIndexMap.mapData[ix];
      try {
        res.push(instantiator.getDelta(this.ivs, outerIndex, innerIndex));
      } catch {
        res.push(0);
      }
      ix += 1;
    }
    return res;
  }
}

// PaintColrLayers
class PaintColrLayersOperation extends PaintOperation {
  constructor(paint, font) {
    super(paint, font);
    for (let layer of this.layerList.slice(
      this.paint.firstLayerIndex,
      this.paint.firstLayerIndex + this.paint.numLayers
    )) {
      this.layers.push(makePaintOperation(layer, this.font));
    }
  }

  render(ctx, size) {
    for (let layer of this.layers) {
      ctx.save();
      layer.render(ctx, size);
      ctx.restore();
    }
  }
}

PAINT_OPERATIONS.push(PaintColrLayersOperation);

/*
 * Fill-related paints
 */
class PaintFillOperation extends PaintOperation {
  floodFill(ctx, size) {
    ctx.fillRect(0, 0, ctx.canvas.width * 2, ctx.canvas.height * 2);
  }
}

// PaintSolid
class PaintSolidOperation extends PaintFillOperation {
  render(ctx, size) {
    var color = this.cpal.colorRecords[this.paint.paletteIndex];
    ctx.fillStyle = `rgba(${color.red}, ${color.green}, ${color.blue}, ${color.alpha / 255 * this.paint.alpha})`;
    this.floodFill(ctx, size);
  }
}
PAINT_OPERATIONS.push(PaintSolidOperation);

// PaintVarSolid
class PaintVarSolidOperation extends VariablePaintOperation {
  _instantiate(processor) {
    let [deltaAlpha] = this.getDeltas(processor, 1);
    let rv = new PaintSolidOperation(
      {
        version: 2,
        paint: this.paint.paint,
        paletteIndex: this.paint.paletteIndex,
        alpha: this.paint.alpha + deltaToFloat(deltaAlpha),
      }, this.font
    );
    return rv;
  }
}
PAINT_OPERATIONS.push(PaintVarSolidOperation);

// PaintLinearGradient
class PaintGradientOperation extends PaintFillOperation {
  _renderColorLine(gradient, colorline) {
    if (!colorline || !colorline.colorStops) {
      return;
    }
    for (let stop of colorline.colorStops) {
      var color = this.cpal.colorRecords[stop.paletteIndex];
      var alpha = color.alpha / 255 * stop.alpha;
      // If the stop offset > 1 or < 0 we should interpolate,
      // not clamp. But we're going to clamp for now.
      let stopOffset = stop.stopOffset > 1.0 ? 1.0 : (stop.stopOffset < 0.0 ? 0.0 : stop.stopOffset);
      gradient.addColorStop(stopOffset, `rgba(${color.red}, ${color.green}, ${color.blue}, ${alpha})`);
    }
  }
}


class PaintLinearGradientOperation extends PaintGradientOperation {
  render(ctx, size) {
    const d1x = this.paint.x1 - this.paint.x0;
    const d1y = this.paint.y1 - this.paint.y0;
    const d2x = this.paint.x2 - this.paint.x0;
    const d2y = this.paint.y2 - this.paint.y0;
    const dotProd = d1x*d2x + d1y*d2y;
    const rotLengthSquared = d2x*d2x + d2y*d2y;
    const magnitude = dotProd / rotLengthSquared;
    let finalX = this.paint.x1 - magnitude * d2x;
    let finalY = this.paint.y1 - magnitude * d2y;
    let gradient = ctx.createLinearGradient(this.paint.x0, this.paint.y0, finalX, finalY);
    this._renderColorLine(gradient, this.paint.colorLine);
    ctx.fillStyle = gradient;
    this.floodFill(ctx, size);
  }
}
PAINT_OPERATIONS.push(PaintLinearGradientOperation);

// PaintVarLinearGradient
class PaintVarLinearGradientOperation extends VariablePaintOperation {
  _instantiate(processor) {
    let [deltaX0, deltaY0, deltaX1, deltaY1, deltaX2, deltaY2] = this.getDeltas(processor, 6);
    let rv = new PaintLinearGradientOperation(
      {
        version: 4,
        paint: this.paint.paint,
        x0: this.paint.x0 + deltaX0,
        y0: this.paint.y0 + deltaY0,
        x1: this.paint.x1 + deltaX1,
        y1: this.paint.y1 + deltaY1,
        x2: this.paint.x2 + deltaX2,
        y2: this.paint.y2 + deltaY2,
        colorLine: this._instantiateColorLine(this.paint.colorLine, processor),
      }, this.font
    );
    return rv;
  }
}


PAINT_OPERATIONS.push(PaintVarLinearGradientOperation);

// PaintRadialGradient
class PaintRadialGradientOperation extends PaintGradientOperation {
  render(ctx, size) {
    let gradient = ctx.createRadialGradient(
      this.paint.x0, this.paint.y0, this.paint.radius0,
      this.paint.x1, this.paint.y1, this.paint.radius1
    );
    this._renderColorLine(gradient, this.paint.colorLine);
    ctx.fillStyle = gradient;
    this.floodFill(ctx, size);
  }
}
PAINT_OPERATIONS.push(PaintRadialGradientOperation);

// PaintVarRadialGradient
class PaintVarRadialGradientOperation extends VariablePaintOperation {
  _instantiate(processor) {
    let [deltaX0, deltaY0, deltaR0, deltaX1, deltaY1, deltaR1] = this.getDeltas(processor, 6);
    let rv = new PaintRadialGradientOperation(
      {
        version: 6,
        paint: this.paint.paint,
        x0: this.paint.x0 + deltaX0,
        y0: this.paint.y0 + deltaY0,
        radius0: this.paint.radius0 + deltaR0,
        x1: this.paint.x1 + deltaX1,
        y1: this.paint.y1 + deltaY1,
        radius1: this.paint.radius1 + deltaR1,
        colorLine: this._instantiateColorLine(this.paint.colorLine, processor),
      }, this.font
    );
    return rv;
  }
}
PAINT_OPERATIONS.push(PaintVarRadialGradientOperation);

// PaintSweepGradient
class PaintSweepGradientOperation extends PaintGradientOperation {
  render(ctx, _size) {
    const angle = this.paint.startAngle * Math.PI;
    let gradient = ctx.createConicGradient(
      angle, this.paint.centerX, this.paint.centerY
    );
    this._renderColorLine(gradient, this.colorLine);
    // console.log(gradient);
    ctx.fillStyle = gradient;
  }

}
PAINT_OPERATIONS.push(PaintSweepGradientOperation);

// PaintVarSweepGradient
class PaintVarSweepGradientOperation extends VariablePaintOperation {

}
PAINT_OPERATIONS.push(PaintVarSweepGradientOperation);

/*
 * Glyph painting
 */

// PaintGlyph
class PaintGlyphOperation extends PaintOperation {
  constructor(paint, font) {
    super(paint, font);
    this.next = makePaintOperation(this.paint.paint, this.font);
  }
  render(ctx, size) {
    // Set fill, transform, etc.
    ctx.beginPath();
    const glyph = this.font._getBaseGlyphUncached(this.paint.glyphID);
    let path = glyph.path;
    path.commands.pop();
    let fn = glyph.path.toFunction();
    fn(ctx);
    ctx.clip();

    this.next.render(ctx, size);
    // // Use this as a clipping mask
    // let path = glyph.path;
    // path.commands.pop(); // Remove the closepath
    // let fn = path.toFunction();
    // fn(ctx);
    // ctx.clip();
    // // ctx.fill();
  }
}
PAINT_OPERATIONS.push(PaintGlyphOperation);

// PaintColrGlyph
class PaintColrGlyphOperation extends PaintOperation {
  render(ctx, size) {
    // We want a COLRGlyph or COLRv1Glyph here, not a base glyph
    // We also want to undo the scaling operation, else it will get
    // done twice.
    ctx.save();
    let scale = 1 / this.font.unitsPerEm * size;
    ctx.scale(1 / scale, 1 / scale);
    const glyph = this.font.getGlyph(this.paint.glyphID);
    glyph.render(ctx, size);
    ctx.restore();
  }
}
PAINT_OPERATIONS.push(PaintColrGlyphOperation);

/*
 * Transformation-related paints
 */

// PaintTransform
class PaintTransformOperation extends PaintOperation {
  constructor(paint, font) {
    super(paint, font);
    this.next = makePaintOperation(this.paint.paint, this.font);
  }

  get affine() {
    return this.paint.transform;
  }

  render(ctx, size) {
    console.log(this);
    if (this.affine) {
      let { xx, yx, xy, yy, dx, dy } = this.affine;
      ctx.transform(xx, yx, xy, yy, dx, dy);
    }
    this.next.render(ctx, size);
  }
}
PAINT_OPERATIONS.push(PaintTransformOperation);

// PaintVarTransform
class PaintVarTransformOperation extends VariablePaintOperation {
  constructor(paint, font) {
    super(paint, font);
    this.next = makePaintOperation(this.paint.paint, this.font);
  }
  newAffine(processor) {
    let deltas = this.getDeltas(processor, 6, this.paint.transform);
    let { xx, yx, xy, yy, dx, dy } = this.paint.transform;
    return {
      xx: xx + deltas[0] / (1<<16),
      yx: yx + deltas[1] / (1<<16),
      xy: xy + deltas[2] / (1<<16),
      yy: yy + deltas[3] / (1<<16),
      dx: dx + deltas[4] / (1<<16),
      dy: dy + deltas[5] / (1<<16),
    };
  }

  _instantiate(processor) {
    return new PaintTransformOperation(
      {
        version: 12,
        paint: this.paint.paint,
        transform: this.newAffine(processor)
      }, this.font
    );
  }
}
PAINT_OPERATIONS.push(PaintVarTransformOperation);

// PaintTranslate
class PaintTranslateOperation extends PaintTransformOperation {
  get affine() {
    return {
      xx: 1,
      yx: 0,
      xy: 0,
      yy: 1,
      dx: this.paint.dx,
      dy: this.paint.dy,
    };
  }

}
PAINT_OPERATIONS.push(PaintTranslateOperation);

// PaintVarTranslate
class PaintVarTranslateOperation extends PaintVarTransformOperation {
  _instantiate(processor) {
    let [deltaX, deltaY] = this.getDeltas(processor, 2);
    let rv = new PaintTranslateOperation(
      {
        version: 14,
        paint: this.paint.paint,
        dx: this.paint.dx + deltaX,
        dy: this.paint.dy + deltaY,
      }, this.font
    );
    return rv;
  }
}
PAINT_OPERATIONS.push(PaintVarTranslateOperation);

// PaintScale
class PaintScaleOperation extends PaintTransformOperation {
  get affine() {
    return {
      xx: this.paint.scaleX,
      yx: 0,
      xy: 0,
      yy: this.paint.scaleY,
      dx: 0,
      dy: 0,
    };
  }
  render(ctx, size) {
    ctx.scale(this.paint.scaleX, this.paint.scaleY);
    this.next.render(ctx, size);
  }
}
PAINT_OPERATIONS.push(PaintScaleOperation);

// PaintVarScale
class PaintVarScaleOperation extends PaintVarTransformOperation {
  _instantiate(processor) {
    let [scaleX, scaleY] = this.getDeltas(processor, 2);
    let rv = new PaintScaleOperation(
      {
        version: 16,
        paint: this.paint.paint,
        scaleX: this.paint.scaleX + scaleX / (1<<14),
        scaleY: this.paint.scaleY + scaleY / (1<<14),
      }, this.font
    );
    // console.log(rv);
    return rv;
  }
}
PAINT_OPERATIONS.push(PaintVarScaleOperation);

// PaintScaleAroundCenter
class PaintScaleAroundCenterOperation extends PaintTransformOperation {
  render(ctx, size) {
    ctx.translate(this.paint.centerX, this.paint.centerY);
    ctx.scale(this.paint.scaleX, this.paint.scaleY);
    ctx.translate(-this.paint.centerX, -this.paint.centerY);
    this.next.render(ctx, size);
  }
}
PAINT_OPERATIONS.push(PaintScaleAroundCenterOperation);

// PaintVarScaleAroundCenter
class PaintVarScaleAroundCenterOperation extends PaintVarTransformOperation {
  _instantiate(processor) {
    let [scaleX, scaleY, centerX, centerY] = this.getDeltas(processor, 4);
    let rv = new PaintScaleAroundCenterOperation(
      {
        version: 18,
        paint: this.paint.paint,
        scaleX: this.paint.scaleX + scaleX / (1 << 14),
        scaleY: this.paint.scaleY + scaleY / (1 << 14),
        centerX: this.paint.centerX + centerX,
        centerY: this.paint.centerY + centerY,
      }, this.font
    );
    return rv;
  }
}
PAINT_OPERATIONS.push(PaintVarScaleAroundCenterOperation);

// PaintScale
class PaintScaleUniformOperation extends PaintTransformOperation {
  get affine() {
    return {
      xx: this.paint.scale,
      yx: 0,
      xy: 0,
      yy: this.paint.scale,
      dx: 0,
      dy: 0,
    };
  }
  render(ctx, size) {
    ctx.scale(this.paint.scale, this.paint.scale);
    this.next.render(ctx, size);
  }
}
PAINT_OPERATIONS.push(PaintScaleUniformOperation);

// PaintVarScale
class PaintVarScaleUniformOperation extends PaintVarTransformOperation {
  _instantiate(processor) {
    let [deltaScale] = this.getDeltas(processor, 1);
    let rv = new PaintScaleUniformOperation(
      {
        version: 20,
        paint: this.paint.paint,
        scale: this.paint.scale + deltaScale / (1<<14)
      }, this.font
    );
    return rv;
  }
}
PAINT_OPERATIONS.push(PaintVarScaleUniformOperation);

// PaintScaleUniformAroundCenter
class PaintScaleUniformAroundCenterOperation extends PaintTransformOperation {
  render(ctx, size) {
    ctx.translate(this.paint.centerX, this.paint.centerY);
    ctx.scale(this.paint.scale, this.paint.scale);
    ctx.translate(-this.paint.centerX, -this.paint.centerY);
    this.next.render(ctx, size);
  }
}
PAINT_OPERATIONS.push(PaintScaleUniformAroundCenterOperation);

// PaintVarScaleUniformAroundCenter
class PaintVarScaleUniformAroundCenterOperation extends PaintVarTransformOperation {
  _instantiate(processor) {
    let [deltaScale, centerX, centerY] = this.getDeltas(processor, 3);
    let rv = new PaintScaleUniformAroundCenterOperation(
      {
        version: 22,
        paint: this.paint.paint,
        scale: this.paint.scale + deltaScale / (1<< 14),
        centerX: this.paint.centerX + centerX,
        centerY: this.paint.centerY + centerY,
      }, this.font
    );
    // console.log(rv)
    return rv;
  }
}
PAINT_OPERATIONS.push(PaintVarScaleUniformAroundCenterOperation);

// PaintRotate
class PaintRotateOperation extends PaintTransformOperation {
  render(ctx, size) {
    ctx.rotate(this.paint.angle * Math.PI);
    this.next.render(ctx, size);
  }
}
PAINT_OPERATIONS.push(PaintRotateOperation);

// PaintVarRotate
class PaintVarRotateOperation extends PaintVarTransformOperation {
  _instantiate(processor) {
    let [delta] = this.getDeltas(processor, 1);
    let rv = new PaintRotateOperation(
      {
        version: 24,
        paint: this.paint.paint,
        angle: this.paint.angle + delta / (1<< 14)
      }, this.font
    );
    return rv;
  }
}
PAINT_OPERATIONS.push(PaintVarRotateOperation);

// PaintRotateAroundCenter
class PaintRotateAroundCenterOperation extends PaintTransformOperation {
  render(ctx, size) {
    ctx.translate(this.paint.centerX, this.paint.centerY);
    ctx.rotate(this.paint.angle * Math.PI);
    ctx.translate(-this.paint.centerX, -this.paint.centerY);
    this.next.render(ctx, size);
  }}
PAINT_OPERATIONS.push(PaintRotateAroundCenterOperation);

// PaintVarRotateAroundCenter
class PaintVarRotateAroundCenterOperation extends PaintVarTransformOperation {
  _instantiate(processor) {
    let [deltaAngle, deltaX, deltaY] = this.getDeltas(processor, 3);
    let rv = new PaintRotateAroundCenterOperation(
      {
        version: 26,
        paint: this.paint.paint,
        angle: this.paint.angle + deltaAngle / (1<< 14),
        centerX: this.paint.centerX + deltaX,
        centerY: this.paint.centerY + deltaY
      }, this.font
    );
    return rv;
  }
}
PAINT_OPERATIONS.push(PaintVarRotateAroundCenterOperation);

// PaintRotate
class PaintSkewOperation extends PaintTransformOperation {
  get affine() {
    return {
      xx: 1,
      yx: Math.tan(this.paint.ySkewAngle * Math.PI),
      xy: -Math.tan(this.paint.xSkewAngle * Math.PI),
      yy: 1,
      dx: 0,
      dy: 0,
    };
  }
}
PAINT_OPERATIONS.push(PaintSkewOperation);

// PaintVarSkew
class PaintVarSkewOperation extends PaintVarTransformOperation {
  _instantiate(processor) {
    let [xDelta, yDelta] = this.getDeltas(processor, 2);
    return new PaintSkewOperation(
      {
        version: 28,
        paint: this.paint.paint,
        xSkewAngle: this.paint.xSkewAngle + xDelta / (1<< 14),
        ySkewAngle: this.paint.ySkewAngle + yDelta / (1<< 14)
      }, this.font
    );
  }
}
PAINT_OPERATIONS.push(PaintVarSkewOperation);

// PaintSkewAroundCenter
class PaintSkewAroundCenterOperation extends PaintTransformOperation {
  render(ctx, size) {
    ctx.translate(this.paint.centerX, this.paint.centerY);
    ctx.transform(1.0, Math.tan(this.paint.ySkewAngle * Math.PI), -Math.tan(this.paint.xSkewAngle * Math.PI), 1.0, 0.0, 0.0);
    ctx.translate(-this.paint.centerX, -this.paint.centerY);
    this.next.render(ctx, size);
  }
}

PAINT_OPERATIONS.push(PaintSkewAroundCenterOperation);

// PaintVarSkewAroundCenter
class PaintVarSkewAroundCenterOperation extends PaintVarTransformOperation {
  _instantiate(processor) {
    let [xDelta, yDelta, cxDelta, cyDelta] = this.getDeltas(processor, 4);
    return new PaintSkewAroundCenterOperation(
      {
        version: 30,
        paint: this.paint.paint,
        xSkewAngle: this.paint.xSkewAngle + xDelta / (1<< 14),
        ySkewAngle: this.paint.ySkewAngle + yDelta / (1<< 14),
        centerX: this.paint.centerX + cxDelta,
        centerY: this.paint.centerY + cyDelta,
      }, this.font
    );
  }
}
PAINT_OPERATIONS.push(PaintVarSkewAroundCenterOperation);

/* And finally... */
// PaintComposite
let CANVAS_COMPOSITING_MODES = [
  'source-over',
  'source-over',
  'source-over',
  'source-over',
  'dest-over',
  'source-in',
  'dest-in',
  'source-out',
  'dest-out',
  'source-atop',
  'dest-atop',
  'xor',
  'lighter',
  'screen',
  'overlay',
  'lighten',
  'darken',
  'color-dodge',
  'color-burn',
  'hard-light',
  'soft-light',
  'difference',
  'exclusion',
  'multiply',
  'hue',
  'saturation',
  'color',
  'luminosity'
];

class PaintComposite extends PaintOperation {
  constructor(paint, font) {
    super(paint, font);
    this.layers = [
      makePaintOperation(this.paint.sourcePaint, this.font),
      makePaintOperation(this.paint.backdropPaint, this.font)
    ];
  }

  get source() {
    return this.layers[0];
  }
  get backdrop() {
    return this.layers[1];
  }

  render(ctx, size) {
    // console.log(this.paint.compositeMode);
    if (this.paint.compositeMode == 1 || this.paint.compositeMode > 2) {
      ctx.save();
      this.backdrop.render(ctx,size);
      ctx.restore();
    }
    if (this.paint.compositeMode > 1) {
      ctx.save();
      ctx.globalCompositeOperation = CANVAS_COMPOSITING_MODES[this.paint.compositeMode];
      this.source.render(ctx, size);

      ctx.restore();
    }
  }
}

PAINT_OPERATIONS.push(PaintComposite);

if (PAINT_OPERATIONS.length != 33) {
  throw 'Not all paints registered';
}
