import * as r from 'restructure';
import { ItemVariationStore, DeltaSetIndexMap } from '../tables/variations';

let F2DOT14 = new r.Fixed(16, 'BE', 14);
let Fixed = new r.Fixed(32, 'BE', 16);
let FWORD = r.int16;
let UFWORD = r.uint16;

// COLRv0

let LayerRecord = new r.Struct({
  gid: r.uint16,          // Glyph ID of layer glyph (must be in z-order from bottom to top).
  paletteIndex: r.uint16  // Index value to use in the appropriate palette. This value must
});                       // be less than numPaletteEntries in the CPAL table, except for
                          // the special case noted below. Each palette entry is 16 bits.
                          // A palette index of 0xFFFF is a special case indicating that
                          // the text foreground color should be used.

let BaseGlyphRecord = new r.Struct({
  gid: r.uint16,             // Glyph ID of reference glyph. This glyph is for reference only
                             // and is not rendered for color.
  firstLayerIndex: r.uint16, // Index (from beginning of the Layer Records) to the layer record.
                             // There will be numLayers consecutive entries for this base glyph.
  numLayers: r.uint16
});

// COLRv1

// Affine transforms

let Affine2x3 = new r.Struct({
  xx: Fixed,                  // x-component of transformed x-basis vector.
  yx: Fixed,                  // y-component of transformed x-basis vector.
  xy: Fixed,                  // x-component of transformed y-basis vector.
  yy: Fixed,                  // y-component of transformed y-basis vector.
  dx: Fixed,                  // Translation in x direction.
  dy: Fixed                   // Translation in y direction.
})

let VarAffine2x3 = new r.Struct({
  xx: Fixed,                  // x-component of transformed x-basis vector.
  yx: Fixed,                  // y-component of transformed x-basis vector.
  xy: Fixed,                  // x-component of transformed y-basis vector.
  yy: Fixed,                  // y-component of transformed y-basis vector.
  dx: Fixed,                  // Translation in x direction.
  dy: Fixed,                  // Translation in y direction.
  varIndexBase: r.uint32      // Base index into DeltaSetIndexMap.
})

// Color lines for gradients
let ColorStop = new r.Struct({
  stopOffset: F2DOT14,        // Position on a color line.
  paletteIndex: r.uint16,     // Index for a CPAL palette entry.
  alpha: F2DOT14              // Alpha value.
});

let VarColorStop = new r.Struct({
  stopOffset: F2DOT14,        // Position on a color line.
  paletteIndex: r.uint16,     // Index for a CPAL palette entry.
  alpha: F2DOT14,             // Alpha value.
  varIndexBase: r.uint32      // Base index into DeltaSetIndexMap.
});

let ColorLine = new r.Struct({
  extend: r.uint8,            // An Extend enum value
  numStops: r.uint16,         // Number of ColorStop records.
  colorStops: new r.Array(ColorStop, 'numStops')
})
let VarColorLine = new r.Struct({
  extend: r.uint8,            // An Extend enum value
  numStops: r.uint16,         // Number of ColorStop records.
  colorStops: new r.Array(VarColorStop, 'numStops')
})

// Porter-Duff Composition modes, used in PaintComposite
export let CompositionMode = {
  CLEAR: 0,
  SRC: 1,
  DEST: 2,
  SRC_OVER: 3,
  DEST_OVER: 4,
  SRC_IN: 5,
  DEST_IN: 6,
  SRC_OUT: 7,
  DEST_OUT: 8,
  SRC_ATOP: 9,
  DEST_ATOP: 10,
  XOR: 11,
  PLUS: 12,
  SCREEN: 13,
  OVERLAY: 14,
  DARKEN: 15,
  LIGHTEN: 16,
  COLOR_DODGE: 17,
  COLOR_BURN: 18,
  HARD_LIGHT: 19,
  SOFT_LIGHT: 20,
  DIFFERENCE: 21,
  EXCLUSION: 22,
  MULTIPLY: 23,
  HSL_HUE: 24,
  HSL_SATURATION: 25,
  HSL_COLOR: 26,
  HSL_LUMINOSITY: 27
}

// The Paint table is format-switching rather than version-switching, but
// we use the VersionedStruct functionality to achieve what we want.
var Paint = new r.VersionedStruct(r.uint8, {
  header: {},
  // PaintColrLayers
  1: {
    numLayers: r.uint8,       // Number of offsets to paint tables to read from LayerList.
    firstLayerIndex: r.uint32 // Index (base 0) into the LayerList.
  },
  // PaintSolid
  2: {
    paletteIndex: r.uint16,   // Index for a CPAL palette entry.
    alpha: F2DOT14            // Alpha value.
  },
  // PaintVarSolid
  3: {
    paletteIndex: r.uint16,   // Index for a CPAL palette entry.
    alpha: F2DOT14,           // Alpha value.
    varIndexBase: r.uint32    // Base index into DeltaSetIndexMap.
  },
  // PaintLinearGradient
  4: {
    colorLine: new r.Pointer(r.uint24, ColorLine), // Offset to ColorLine table.
    x0: FWORD,                                 // Start point x coordinate.
    y0: FWORD,                                 // Start point y coordinate.
    x1: FWORD,                                 // End point x coordinate.
    y1: FWORD,                                 // End point y coordinate.
    x2: FWORD,                                 // Rotation point x coordinate.
    y2: FWORD,                                 // Rotation point y coordinate.
  },
  // PaintVarLinearGradient
  5: {
    colorLine: new r.Pointer(r.uint24, ColorLine), // Offset to ColorLine table.
    x0: FWORD,                                 // Start point x coordinate.
    y0: FWORD,                                 // Start point y coordinate.
    x1: FWORD,                                 // End point x coordinate.
    y1: FWORD,                                 // End point y coordinate.
    x2: FWORD,                                 // Rotation point x coordinate.
    y2: FWORD,                                 // Rotation point y coordinate.
    varIndexBase: r.uint32                     // Base index into DeltaSetIndexMap.
  },
  // PaintRadialGradient
  6: {
    colorLine: new r.Pointer(r.uint24, ColorLine), // Offset to ColorLine table.
    x0: FWORD,                                 // Start circle center x coordinate.
    y0: FWORD,                                 // Start circle center y coordinate.
    radius0: UFWORD,                           // Start circle radius.
    x1: FWORD,                                 // End circle center x coordinate.
    y1: FWORD,                                 // End circle center y coordinate.
    radius1: UFWORD                            // End circle radius.
  },
  // PaintVarRadialGradient
  7: {
    colorLine: new r.Pointer(r.uint24, ColorLine), // Offset to ColorLine table.
    x0: FWORD,                                 // Start circle center x coordinate.
    y0: FWORD,                                 // Start circle center y coordinate.
    radius0: UFWORD,                           // Start circle radius.
    x1: FWORD,                                 // End circle center x coordinate.
    y1: FWORD,                                 // End circle center y coordinate.
    radius1: UFWORD,                           // End circle radius.
    varIndexBase: r.uint32                     // Base index into DeltaSetIndexMap.
  },
  // PaintSweepGradient
  8: {
    colorLine: new r.Pointer(r.uint24, ColorLine), // Offset to ColorLine table.
    centerX: FWORD,                            // Center x coordinate.
    centerY: FWORD,                            // Center y coordinate.
    startAngle: F2DOT14,                       // Start of the angular range of the gradient, 180° in counter-clockwise degrees per 1.0 of value.
    endAngle: F2DOT14                          // End of the angular range of the gradient, 180° in counter-clockwise degrees per 1.0 of value.
  },
  // PaintVarSweepGradient
  9: {
    colorLine: new r.Pointer(r.uint24, ColorLine), // Offset to ColorLine table.
    centerX: FWORD,                            // Center x coordinate.
    centerY: FWORD,                            // Center y coordinate.
    startAngle: F2DOT14,                       // Start of the angular range of the gradient, 180° in counter-clockwise degrees per 1.0 of value.
    endAngle: F2DOT14,                         // End of the angular range of the gradient, 180° in counter-clockwise degrees per 1.0 of value.
    varIndexBase: r.uint32                     // Base index into DeltaSetIndexMap.
  },
  // PaintGlyph
  10: {
    paint: new r.Pointer(r.uint24, Paint),         // Paint table.
    glyphID: r.uint16                          // Glyph ID for the source outline.
  },
  // PaintColrGlyph
  11: {
    glyphID: r.uint16                          // Glyph ID for a BaseGlyphList base glyph.
  },
  // PaintTransform
  12: {
    paint: new r.Pointer(r.uint24, Paint),         // Paint table.
    transform: new r.Pointer(r.uint24, Affine2x3)  // Transformation.
  },
  // PaintVarTransform
  13: {
    paint: new r.Pointer(r.uint24, Paint),            // Paint table.
    transform: new r.Pointer(r.uint24, VarAffine2x3)  // Variable transformation.
  },
  // PaintTranslate
  14: {
    paint: new r.Pointer(r.uint24, Paint),         // Paint table.
    dx: FWORD,                                 // Translation in x direction.
    dy: FWORD                                  // Translation in y direction.
  },
  // PaintVarTranslate
  15: {
    paint: new r.Pointer(r.uint24, Paint),         // Paint table.
    dx: FWORD,                                 // Translation in x direction.
    dy: FWORD,                                 // Translation in y direction.
    varIndexBase: r.uint32                     // Base index into DeltaSetIndexMap.
  },
  // PaintScale
  16: {
    paint: new r.Pointer(r.uint24, Paint),         // Paint table.
    scaleX: F2DOT14,                           // Scale factor in x direction.
    scaleY: F2DOT14                            // Scale factor in y direction.
  },
  // PaintVarScale
  17: {
    paint: new r.Pointer(r.uint24, Paint),         // Paint table.
    scaleX: F2DOT14,                           // Scale factor in x direction.
    scaleY: F2DOT14,                           // Scale factor in y direction.
    varIndexBase: r.uint32                     // Base index into DeltaSetIndexMap.
  },
  // PaintScaleAroundCenter
  18: {
    paint: new r.Pointer(r.uint24, Paint),         // Paint table.
    scaleX: F2DOT14,                           // Scale factor in x direction.
    scaleY: F2DOT14,                           // Scale factor in y direction.
    centerX: FWORD,                            // x coordinate for the center of scaling.
    centerY: FWORD                            // y coordinate for the center of scaling.
  },
  // PaintVarScaleAroundCenter
  19: {
    paint: new r.Pointer(r.uint24, Paint),         // Paint table.
    dx: FWORD,                                 // Scale factor in x direction.
    scaleY: F2DOT14,                           // Scale factor in y direction.
    centerX: FWORD,                            // x coordinate for the center of scaling.
    centerY: FWORD,                            // y coordinate for the center of scaling.
    varIndexBase: r.uint32                     // Base index into DeltaSetIndexMap.
  },
  // PaintScaleUniform
  20: {
    paint: new r.Pointer(r.uint24, Paint),         // Paint table.
    scale: F2DOT14                            // Scale factor in x and y directions.
  },
  // PaintVarScaleUniform
  21: {
    paint: new r.Pointer(r.uint24, Paint),         // Paint table.
    scale: F2DOT14,                            // Scale factor in x and y directions.
    varIndexBase: r.uint32                     // Base index into DeltaSetIndexMap.
  },
  // PaintScaleUniformAroundCenter
  22: {
    paint: new r.Pointer(r.uint24, Paint),         // Paint table.
    scale: F2DOT14,                            // Scale factor in x and y directions.
    centerX: FWORD,                            // x coordinate for the center of scaling.
    centerY: FWORD                             // y coordinate for the center of scaling.
  },
  // PaintVarScaleUniformAroundCenter
  23: {
    paint: new r.Pointer(r.uint24, Paint),         // Paint table.
    scale: F2DOT14,                            // Scale factor in x and y directions.
    centerX: FWORD,                            // x coordinate for the center of scaling.
    centerY: FWORD,                            // y coordinate for the center of scaling.
    varIndexBase: r.uint32                     // Base index into DeltaSetIndexMap.
  },
  // PaintRotate
  24: {
    paint: new r.Pointer(r.uint24, Paint),         // Paint table.
    angle: F2DOT14                             // Rotation angle, 180° in counter-clockwise degrees per 1.0 of value
  },
  // PaintVarRotate
  25: {
    paint: new r.Pointer(r.uint24, Paint),         // Paint table.
    angle: F2DOT14,                            // Rotation angle, 180° in counter-clockwise degrees per 1.0 of value
    varIndexBase: r.uint32                     // Base index into DeltaSetIndexMap.
  },
  // PaintRotateAroundCenter
  26: {
    paint: new r.Pointer(r.uint24, Paint),         // Paint table.
    angle: F2DOT14,                            // Rotation angle, 180° in counter-clockwise degrees per 1.0 of value
    centerX: FWORD,                            // x coordinate for the center of scaling.
    centerY: FWORD                             // y coordinate for the center of scaling.
  },
  // PaintVarRotateAroundCenter
  27: {
    paint: new r.Pointer(r.uint24, Paint),         // Paint table.
    angle: F2DOT14,                            // Rotation angle, 180° in counter-clockwise degrees per 1.0 of value
    centerX: FWORD,                            // x coordinate for the center of scaling.
    centerY: FWORD,                            // y coordinate for the center of scaling.
    varIndexBase: r.uint32                     // Base index into DeltaSetIndexMap.
  },
  // PaintSkew
  28: {
    paint: new r.Pointer(r.uint24, Paint),         // Paint table.
    xSkewAngle: F2DOT14,                       // Angle of skew in the direction of the x-axis, 180° in counter-clockwise degrees per 1.0 of value.
    ySkewAngle: F2DOT14                        // Angle of skew in the direction of the 5-axis, 180° in counter-clockwise degrees per 1.0 of value.
  },
  // PaintVarSkew
  29: {
    paint: new r.Pointer(r.uint24, Paint),         // Paint table.
    xSkewAngle: F2DOT14,                       // Angle of skew in the direction of the x-axis, 180° in counter-clockwise degrees per 1.0 of value. 
    ySkewAngle: F2DOT14,                       // Angle of skew in the direction of the 5-axis, 180° in counter-clockwise degrees per 1.0 of value.
    varIndexBase: r.uint32                     // Base index into DeltaSetIndexMap.
  },
  // PaintSkewAroundCenter
  30: {
    paint: new r.Pointer(r.uint24, Paint),         // Paint table.
    xSkewAngle: F2DOT14,                       // Angle of skew in the direction of the x-axis, 180° in counter-clockwise degrees per 1.0 of value.
    ySkewAngle: F2DOT14,                       // Angle of skew in the direction of the 5-axis, 180° in counter-clockwise degrees per 1.0 of value.
    centerX: FWORD,                            // x coordinate for the center of scaling.
    centerY: FWORD                             // y coordinate for the center of scaling.
  },
  // PaintVarSkewAroundCenter
  31: {
    paint: new r.Pointer(r.uint24, Paint),         // Paint table.
    xSkewAngle: F2DOT14,                       // Angle of skew in the direction of the x-axis, 180° in counter-clockwise degrees per 1.0 of value. 
    ySkewAngle: F2DOT14,                       // Angle of skew in the direction of the 5-axis, 180° in counter-clockwise degrees per 1.0 of value.
    centerX: FWORD,                            // x coordinate for the center of scaling.
    centerY: FWORD,                            // y coordinate for the center of scaling.
    varIndexBase: r.uint32                     // Base index into DeltaSetIndexMap.
  },
  // PaintComposite
  32: {
    sourcePaint: new r.Pointer(r.uint24, Paint),   // Source paint table.
    compositeMode: r.uint8,                    // A CompositeMode enumeration value.
    backdropPaint: new r.Pointer(r.uint24, Paint), // Backdrop paint table.
  },
});

var LayerList = new r.Struct({
  numLayers: r.uint32,
  paint: new r.Array(new r.Pointer(r.uint32, Paint), 'numLayers')
});

// "A ClipList table is used to provide precomputed clip boxes for color glyphs."

var ClipBox = new r.VersionedStruct(r.uint8, {
  header: {
    xMin: r.int16,
    yMin: r.int16,
    xMax: r.int16,
    yMax: r.int16,
  },
  1: {},
  2: {
    varIndexBase: r.uint32
  }
});

var Clip = new r.Struct({
  startGlyphId: r.uint16,
  endGlyphId: r.uint16,
  clipBox: new r.Pointer(r.uint24, ClipBox, { type: 'parent' })
});

var ClipList = new r.Struct({
  format: r.uint8,
  numClips: r.uint32,
  clips: new r.Array(Clip, "numClips")
});

// "The BaseGlyphList table is, conceptually, similar to the baseGlyphRecords
// array in COLR version 0, providing records that map a base glyph to a
// color glyph definition. The color glyph definitions that each refer to are significantly
// different, however."

let BaseGlyphPaintRecord = new r.Struct({
  gid: r.uint16,                        // Glyph ID of the base glyph.
  paint: new r.Pointer(r.uint32, Paint, { type: 'parent' }) // Offset to a Paint table.
 });


let BaseGlyphList = new r.Struct({
  numBaseGlyphPaintRecords: r.uint32,
  baseGlyphPaintRecords: new r.Array(BaseGlyphPaintRecord, 'numBaseGlyphPaintRecords')
});


export default new r.VersionedStruct(r.uint16, {
  header: {
    numBaseGlyphRecords: r.uint16,
    baseGlyphRecord: new r.Pointer(r.uint32, new r.Array(BaseGlyphRecord, 'numBaseGlyphRecords')),
    layerRecords: new r.Pointer(r.uint32, new r.Array(LayerRecord, 'numLayerRecords'), { lazy: true }),
    numLayerRecords: r.uint16
  },
  0: {},
  1: {
    baseGlyphList: new r.Pointer(r.uint32, BaseGlyphList),
    layerList: new r.Pointer(r.uint32, LayerList),
    clipList: new r.Pointer(r.uint32, ClipList),
    varIndexMap: new r.Pointer(r.uint32, DeltaSetIndexMap),
    itemVariationStore: new r.Pointer(r.uint32, ItemVariationStore),
  }
});
