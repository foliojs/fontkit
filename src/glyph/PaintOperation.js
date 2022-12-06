import * as fontkit from '../base';

class PaintOperation {
  constructor(paint, font) {
    this.paint = paint;
    this.font = font;
    this.cpal = font.CPAL;
    this.layerList = font.COLR.layerList?.paint;
    this.next = null;
    this.layers = [];
  }
  render(_ctx, _size) {}
  instantiate(location) {
    this._instantiate_others(location);
    return this;
  }
  _instantiate_others(location) {
    if (this.next) {
      this.next = this.next.instantiate(location);
    }
    for (let layer in this.layers) {
      layer.instantiate(location);
    }
  }
}

class VariablePaintOperation extends PaintOperation {
  instantiate(location) { // Do something clever here
    this._instantiate_others(location);
    return this;
  }

}

export var PAINT_OPERATIONS = [null];

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

// PaintSolid
class PaintSolidOperation extends PaintOperation {
  render(ctx, _size) {
    var color = this.cpal.colorRecords[this.paint.paletteIndex];
    ctx.fillStyle = `rgba(${color.red}, ${color.green}, ${color.blue}, ${color.alpha / 255 * this.paint.alpha})`;
  }
}
PAINT_OPERATIONS.push(PaintSolidOperation);

// PaintVarSolid
class PaintVarSolidOperation extends VariablePaintOperation {}
PAINT_OPERATIONS.push(PaintVarSolidOperation);

// PaintLinearGradient
class PaintGradientOperation extends PaintOperation {
  _renderColorLine(gradient, colorline) {
    for (let stop of colorline.colorStops) {
      var color = this.cpal.colorRecords[stop.paletteIndex];
      var alpha = color.alpha / 255 * stop.alpha;
      gradient.addColorStop(stop.stopOffset, `rgba(${color.red}, ${color.green}, ${color.blue}, ${alpha})`);
    }
  }
}
class PaintLinearGradientOperation extends PaintGradientOperation {
  render(ctx, _size) {
    let gradient = ctx.createLinearGradient(this.paint.x0, this.paint.y0, this.paint.x1, this.paint.y1);
    // XXX This does not handle the x2,y2 (rotation point)
    this._renderColorLine(gradient, this.paint.colorLine);
    ctx.fillStyle = gradient;
  }
}
PAINT_OPERATIONS.push(PaintLinearGradientOperation);

// PaintVarLinearGradient
class PaintVarLinearGradientOperation extends VariablePaintOperation {}
PAINT_OPERATIONS.push(PaintVarLinearGradientOperation);

// PaintRadialGradient
class PaintRadialGradientOperation extends PaintGradientOperation {
  render(ctx, _size) {
    let gradient = ctx.createRadialGradient(
      this.paint.x0, this.paint.y0, this.paint.radius0,
      this.paint.x1, this.paint.y1, this.paint.radius1
    );
    this._renderColorLine(gradient, this.paint.colorLine);
    ctx.fillStyle = gradient;
  }
}
PAINT_OPERATIONS.push(PaintRadialGradientOperation);

// PaintVarRadialGradient
class PaintVarRadialGradientOperation extends VariablePaintOperation {}
PAINT_OPERATIONS.push(PaintVarRadialGradientOperation);

// PaintSweepGradient
class PaintSweepGradientOperation extends PaintOperation {
  render(ctx, _size) {
    const angle = this.paint.startAngle * Math.PI;
    let gradient = ctx.createConicGradient(
      angle, this.paint.centerX, this.paint.centerY
    );
    this._renderColorLine(gradient, this.colorLine);
    ctx.fillStyle = gradient;
  }

}
PAINT_OPERATIONS.push(PaintSweepGradientOperation);

// PaintVarSweepGradient
class PaintVarSweepGradientOperation extends VariablePaintOperation {}
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
    ctx.save();
    // Set fill, transform, etc.
    ctx.beginPath();
    this.next.render(ctx, size);
    const glyph = this.font._getBaseGlyph(this.paint.glyphID);
    glyph.render(ctx, size);
    ctx.restore();
  }
}
PAINT_OPERATIONS.push(PaintGlyphOperation);

// PaintColrGlyph
class PaintColrGlyphOperation extends PaintOperation {
  render(ctx, size) {
    // We want a COLRGlyph or COLRv1Glyph here, not a base glyph
    const glyph = this.font.getGlyph(this.paint.glyphID);
    glyph.render(ctx, size);
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
class PaintVarTranslateOperation extends PaintVarTransformOperation {}
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
}
PAINT_OPERATIONS.push(PaintScaleOperation);

// PaintVarScale
class PaintVarScaleOperation extends PaintVarTransformOperation {}
PAINT_OPERATIONS.push(PaintVarScaleOperation);

// PaintScaleAroundCenter
class PaintScaleAroundCenterOperation extends PaintTransformOperation {
  get affine() {
    return; // XXX
  }
}
PAINT_OPERATIONS.push(PaintScaleAroundCenterOperation);

// PaintVarScaleAroundCenter
class PaintVarScaleAroundCenterOperation extends PaintVarTransformOperation {}
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
}
PAINT_OPERATIONS.push(PaintScaleUniformOperation);

// PaintVarScale
class PaintVarScaleUniformOperation extends PaintVarTransformOperation {}
PAINT_OPERATIONS.push(PaintVarScaleUniformOperation);

// PaintScaleUniformAroundCenter
class PaintScaleUniformAroundCenterOperation extends PaintTransformOperation {
  get affine() {
    return; // XXX
  }
}
PAINT_OPERATIONS.push(PaintScaleUniformAroundCenterOperation);

// PaintVarScaleUniformAroundCenter
class PaintVarScaleUniformAroundCenterOperation extends PaintVarTransformOperation {}
PAINT_OPERATIONS.push(PaintVarScaleUniformAroundCenterOperation);

// PaintRotate
class PaintRotateOperation extends PaintTransformOperation {
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
}
PAINT_OPERATIONS.push(PaintRotateOperation);

// PaintVarRotate
class PaintVarRotateOperation extends PaintVarTransformOperation {}
PAINT_OPERATIONS.push(PaintVarRotateOperation);

// PaintRotateAroundCenter
class PaintRotateAroundCenterOperation extends PaintTransformOperation {
  get affine() {
    return; // XXX
  }
}
PAINT_OPERATIONS.push(PaintRotateAroundCenterOperation);

// PaintVarRotateAroundCenter
class PaintVarRotateAroundCenterOperation extends PaintVarTransformOperation {}
PAINT_OPERATIONS.push(PaintVarRotateAroundCenterOperation);

// PaintRotate
class PaintSkewOperation extends PaintTransformOperation {
  get affine() {
    return; // XXX
  }
}
PAINT_OPERATIONS.push(PaintSkewOperation);

// PaintVarSkew
class PaintVarSkewOperation extends PaintVarTransformOperation {}
PAINT_OPERATIONS.push(PaintVarSkewOperation);

// PaintSkewAroundCenter
class PaintSkewAroundCenterOperation extends PaintTransformOperation {
  get affine() {
    return; // XXX
  }
}
PAINT_OPERATIONS.push(PaintSkewAroundCenterOperation);

// PaintVarSkewAroundCenter
class PaintVarSkewAroundCenterOperation extends PaintVarTransformOperation {}
PAINT_OPERATIONS.push(PaintVarSkewAroundCenterOperation);

/* And finally... */
// PaintComposite
class PaintComposite extends PaintOperation {
  source() {
    return makePaintOperation(this.paint.source, this.font);
  }
  backdrop() {
    return makePaintOperation(this.paint.backdrop, this.font);
  }
}

PAINT_OPERATIONS.push(PaintComposite);

if (PAINT_OPERATIONS.length != 33) {
  throw 'Not all paints registered';
}
