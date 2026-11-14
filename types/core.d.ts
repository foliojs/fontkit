import type { DefaultShaper } from './shapers/DefaultShaper.js';

/**
 * There are several different types of font objects that are returned by fontkit depending on the font format.
 * They all inherit from the TTFFont class and have the same public API.
 */
export interface Font {
  type: 'TTF' | 'WOFF' | 'WOFF2';

  /** null if the font has no PostScript name, or the runtime cannot decode its encoding */
  postscriptName: string | null;
  fullName: string | null;
  familyName: string | null;
  subfamilyName: string | null;
  copyright: string | null;
  version: string | null;

  /** the size of the font’s internal coordinate grid */
  unitsPerEm: number;
  /** the font’s ascender */
  ascent: number;
  /** the font’s descender */
  descent: number;
  /** the amount of space that should be included between lines */
  lineGap: number;
  /** the offset from the normal underline position that should be used */
  underlinePosition: number;
  /** the weight of the underline that should be used */
  underlineThickness: number;
  /** if this is an italic font, the angle the cursor should be drawn at to match the font design */
  italicAngle: number;
  /** the height of capital letters above the baseline */
  capHeight: number;
  /** the height of lower case letters */
  xHeight: number;
  /** the font’s bounding box, i.e. the box that encloses all glyphs in the font */
  bbox: BBOX;
  /** the font metric table consisting of a set of metrics and other data required for OpenType fonts */
  'OS/2': Os2Table;
  /** the font's horizontal header table consisting of information needed to layout fonts with horizontal characters    */
  hhea: HHEA;
  /** the color table containing layer records for color glyphs (optional, present in fonts with color glyphs) */
  COLR?: COLRTable;
  /** the color palette table containing color definitions (optional, present in fonts with color glyphs) */
  CPAL?: CPALTable;

  /** the number of glyphs in the font */
  numGlyphs: number;
  /** an array of all of the unicode code points supported by the font */
  characterSet: number[];
  /** an array of all OpenType feature tags (or mapped AAT tags) supported by the font */
  availableFeatures: string[];

  /** An object describing the available axes in a variable font. Keys are 4 letter axis tags. */
  variationAxes: Partial<
    Record<string, { name: string; min: number; default: number; max: number }>
  >;

  /** The named variation instances in a variable font. Keys are instance names, and values are axis settings. */
  namedVariations: Partial<Record<string, Record<string, number>>>;

  /**
   * Returns an array of strings that map to the given glyph id.
   */
  stringsForGlyph(gid: number): string[];

  /**
   * Maps a single unicode code point to a Glyph object.
   * Does not perform any advanced substitutions (there is no context to do so).
   */
  glyphForCodePoint(codePoint: number): Glyph;

  /**
   * Returns whether there is glyph in the font for the given unicode code point.
   */
  hasGlyphForCodePoint(codePoint: number): boolean;

  /**
   * Returns an array of Glyph objects for the given string.
   * This is only a one-to-one mapping from characters to glyphs.
   * For most uses, you should use font.layout (described below), which
   * provides a much more advanced mapping supporting AAT and OpenType shaping.
   */
  glyphsForString(string: string): Glyph[];

  /**
   * Returns the advance width for a single glyph id.
   */
  widthOfGlyph(glyph_id: number): number;

  /**
   * Returns a GlyphRun object, which includes an array of Glyphs and GlyphPositions for the given string.
   * In a features object, a number selects that alternate (1-based) for alternate substitution features such as `aalt`.
   */
  layout(
    string: string,
    features?: string[] | Record<string, boolean | number>,
    script?: string | null,
    language?: string | null,
    direction?: string | null,
  ): GlyphRun;
  /** Lays out the string with the default features */
  layout(
    string: string,
    script: string,
    language?: string | null,
    direction?: string | null,
  ): GlyphRun;

  /**
   * Returns a glyph object for the given glyph id. You can pass the array of
   * code points this glyph represents for your use later, and it will be
   * stored in the glyph object.
   */
  getGlyph(glyphId: number, codePoints?: number[]): Glyph;

  /**
   * an array of all OpenType feature tags
   * same to availableFeatures but can input custom script and language params
   */
  getAvailableFeatures(script: string | string[], language: string): string[];

  /**
   * Returns a Subset for this font.
   */
  createSubset(): Subset;

  /**
   * Returns a new font with the given variation settings applied.
   * Settings can either be an instance name, or an object containing
   * variation tags as specified by the `variationAxes` property.
   */
  getVariation(settings: object | string): Font;

  // Standardized format plugin API
  getFont(name: string): Font;

  /**
   * Gets a string from the font's `name` table
   * `lang` is a BCP-47 language code.
   */
  getName(key: string, lang?: string): string | null;

  setDefaultLanguage(lang?: string | null): void;
}

export interface GlyphRun {
  /**
   * An array of Glyph objects in the run
   */
  glyphs: Glyph[];

  /**
   * An array of GlyphPosition objects for each glyph in the run
   */
  positions: GlyphPosition[];

  /**
   * The script that was requested for shaping. This was either passed in or detected automatically.
   */
  script: string;

  /**
   * The language requested for shaping, as passed in. If `null`, the default language for the
   * script was used.
   */
  language: string | null;

  /**
   * The direction requested for shaping, as passed in (either ltr or rtl).
   * If `null`, the default direction of the script is used.
   */
  direction: string;

  /**
   * The features requested during shaping. This is a combination of user
   * specified features and features chosen by the shaper.
   */
  features: Record<string, boolean | number>;

  /**
   * The total advance width of the run.
   */
  advanceWidth: number;

  /**
   * The total advance height of the run.
   */
  advanceHeight: number;

  /**
   * The bounding box containing all glyphs in the run.
   */
  bbox: BBOX;
}

/**
 * Represents positioning information for a glyph in a GlyphRun.
 */
export interface GlyphPosition {
  /** The amount to move the virtual pen in the X direction after rendering this glyph. */
  xAdvance: number;

  /** The amount to move the virtual pen in the Y direction after rendering this glyph. */
  yAdvance: number;

  /** The offset from the pen position in the X direction at which to render this glyph. */
  xOffset: number;

  /** The offset from the pen position in the Y direction at which to render this glyph. */
  yOffset: number;
}

/**
 * Glyph objects represent a glyph in the font. They have various properties for accessing metrics and
 * the actual vector path the glyph represents, and methods for rendering the glyph to a graphics context.
 *
 * You do not create glyph objects directly. They are created by various methods on the font object.
 * There are several subclasses of the base Glyph class internally that may be returned depending
 * on the font format, but they all inherit from this class.
 */
export interface Glyph {
  /** The glyph's outline or color format */
  type: 'TTF' | 'CFF' | 'WOFF2' | 'SBIX' | 'COLR';

  /** the glyph id in the font */
  id: number;

  /**
   * An array of unicode code points that are represented by this glyph.
   * There can be multiple code points in the case of ligatures and other glyphs
   * that represent multiple visual characters.
   */
  codePoints: number[];

  /** a vector Path object representing the glyph */
  path: Path;

  /** Returns the glyph's path scaled to the given font size */
  getScaledPath(size: number): Path;

  /** the glyph’s bounding box, i.e. the rectangle that encloses the glyph outline as tightly as possible. */
  bbox: BBOX;

  /**
   * The glyph’s control box.
   * This is often the same as the bounding box, but is faster to compute.
   * Because of the way bezier curves are defined, some of the control points
   * can be outside of the bounding box. Where `bbox` takes this into account,
   * `cbox` does not. Thus, cbox is less accurate, but faster to compute.
   * See [here](http://www.freetype.org/freetype2/docs/glyphs/glyphs-6.html#section-2)
   * for a more detailed description.
   */
  cbox: BBOX;

  /** the glyph’s advance width */
  advanceWidth: number;

  /** the glyph’s advance height */
  advanceHeight: number;

  /** is a mark glyph (non-spacing combining glyph) */
  isMark: boolean;

  /** is a ligature glyph (multiple character, spacing glyph) */
  isLigature: boolean;

  /** Renders the glyph to the given graphics context, at the specified font size. */
  render(ctx: RenderContext, size: number): void;

  /**
   * The glyph's name. Commonly the character, or 'space' or UTF****.
   * undefined if the font's `post` table has no glyph names (version 3), and null if
   * the font has no `post` table or is a CID-keyed CFF font.
   */
  name: string | null | undefined;

  /**
   * For COLR glyphs, an array of objects containing the glyph and color for each layer.
   * Each layer has a `glyph` property with the glyph object and a `color` property with RGBA values.
   */
  layers?: Array<{
    glyph: Glyph;
    color: { red: number; green: number; blue: number; alpha: number };
  }>;

  /**
   * For SBIX glyphs, which are bitmap based, the image for the given size (usually PNG data),
   * or null if the glyph has no image.
   */
  getImageForSize?(size: number): SBIXImage | null;
}

/** A bitmap image of an SBIX glyph */
export interface SBIXImage {
  originX: number;
  originY: number;
  /** The image format, such as `png ` */
  type: string;
  data: Uint8Array;
}

/**
 * Path objects are returned by glyphs and represent the actual
 * vector outlines for each glyph in the font. Paths can be converted
 * to SVG path data strings, or to functions that can be applied to
 * render the path to a graphics context.
 */
export interface Path {
  commands: PathCommand[];

  /**
   * Gets the exact bounding box of the path by evaluating curve segments.
   * Slower to compute than the control box, but more accurate.
   */
  bbox: BBOX;

  /**
   * Gets the "control box" of a path.
   * This is like the bounding box, but it includes all points including
   * control points of bezier segments and is much faster to compute than
   * the real bounding box.
   */
  cbox: BBOX;

  /**
   * Compiles the path to a JavaScript function that can be applied with
   * a graphics context in order to render the path.
   */
  toFunction(): (ctx: PathContext) => void;

  /** Converts the path to an SVG path data string */
  toSVG(): string;

  /** Transforms the path by the given matrix */
  transform(
    m0: number,
    m1: number,
    m2: number,
    m3: number,
    m4: number,
    m5: number,
  ): this;

  /** Translates the path by the given offset */
  translate(x: number, y: number): this;

  /** Rotates the path by the given angle (in radians) */
  rotate(angle: number): this;

  /** Scales the path */
  scale(scaleX: number, scaleY?: number): this;

  /** Moves the virtual pen to the given x, y coordinates */
  moveTo(x: number, y: number): this;

  /** Adds a line to the path from the current point to the given x, y coordinates */
  lineTo(x: number, y: number): this;

  /** Adds a quadratic curve to the path from the current point to the given x, y coordinates */
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): this;

  /** Adds a bezier curve to the path from the current point to the given x, y coordinates */
  bezierCurveTo(
    cp1x: number,
    cp1y: number,
    cp2x: number,
    cp2y: number,
    x: number,
    y: number,
  ): this;

  /** Closes the current sub-path by drawing a straight line back to the starting point */
  closePath(): this;
}

/** The drawing methods a path calls, which canvas 2D contexts and PDFKit documents both have */
export interface PathContext {
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;
  bezierCurveTo(
    cp1x: number,
    cp1y: number,
    cp2x: number,
    cp2y: number,
    x: number,
    y: number,
  ): void;
  closePath(): void;
}

/** The methods outline glyphs call to render themselves */
export interface RenderContext extends PathContext {
  save(): void;
  scale(x: number, y: number): void;
  fill(): void;
  restore(): void;
}

export interface PathCommand {
  command:
    'moveTo' | 'lineTo' | 'quadraticCurveTo' | 'bezierCurveTo' | 'closePath';
  args: number[];
}

export interface BBOX {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface Os2Table {
  breakChar: number;
  capHeight: number;
  codePageRange: number[];
  defaultChar: number;
  fsSelection: {
    italic: boolean;
    negative: boolean;
    outlined: boolean;
    strikeout: boolean;
    underscore: boolean;
    useTypoMetrics: boolean;
    wws: boolean;
    bold: boolean;
    regular: boolean;
    oblique: boolean;
  };
  fsType: {
    bitmapOnly: boolean;
    editable: boolean;
    noEmbedding: boolean;
    noSubsetting: boolean;
    viewOnly: boolean;
  };
  maxContent: number;
  panose: number[];
  sFamilyClass: number;
  typoAscender: number;
  typoDescender: number;
  typoLineGap: number;
  ulCharRange: number[];
  usFirstCharIndex: number;
  usLastCharIndex: number;
  usWeightClass: number;
  usWidthClass: number;
  vendorID: string;
  version: number;
  winAscent: number;
  winDescent: number;
  xAvgCharWidth: number;
  xHeight: number;
  yStrikeoutPosition: number;
  yStrikeoutSize: number;
  ySubscriptXOffset: number;
  ySubscriptXSize: number;
  ySubscriptYOffset: number;
  ySubscriptYSize: number;
  ySuperscriptXOffset: number;
  ySuperscriptXSize: number;
  ySuperscriptYOffset: number;
  ySuperscriptYSize: number;
}

export interface HHEA {
  version: number;
  ascent: number;
  descent: number;
  lineGap: number;
  advanceWidthMax: number;
  minLeftSideBearing: number;
  minRightSideBearing: number;
  xMaxExtent: number;
  caretSlopeRise: number;
  caretSlopeRun: number;
  caretOffset: number;
  metricDataFormat: number;
  numberOfMetrics: number;
}

export interface COLRTable {
  version: number;
  numBaseGlyphRecords: number;
  baseGlyphRecord: Array<{
    gid: number;
    firstLayerIndex: number;
    numLayers: number;
  }>;
  layerRecords: Array<{
    gid: number;
    paletteIndex: number;
  }>;
  numLayerRecords: number;
}

export interface CPALTable {
  version: number;
  numPaletteEntries: number;
  numPalettes: number;
  numColorRecords: number;
  colorRecords: Array<{
    red: number;
    green: number;
    blue: number;
    alpha: number;
  }>;
  colorRecordIndices: number[];
}

export interface FontCollection {
  type: 'TTC' | 'DFont';
  getFont(name: string): Font | null;
  fonts: Font[];
}

export interface Subset {
  /** Includes the given glyph object or glyph ID in the subset, and returns its ID in the subset */
  includeGlyph(glyph: Glyph | number): number;
  encode(): Uint8Array;
}

/**
 * Returns a font object for the given buffer.
 * For collection fonts (such as TrueType collection files),
 * you can pass a postscriptName to get that font out of the collection instead of a collection object.
 */
export function create(
  buffer: Uint8Array,
  postscriptName?: null,
): Font | FontCollection;
/** Returns the font with the given postscriptName, or null if the collection has none. */
export function create(buffer: Uint8Array, postscriptName: string): Font | null;
export function create(
  buffer: Uint8Array,
  postscriptName?: string | null,
): Font | FontCollection | null;

/**
 * Registers a font format class, such as one from `fontkit/formats/*`.
 * `create` uses the first registered format whose `probe` accepts the buffer.
 */
export function registerFormat(format: {
  probe(buffer: Uint8Array): boolean;
  new (stream: unknown): Font | FontCollection;
}): void;

/**
 * Registers a shaper class, such as one from `fontkit/shapers/*`, for each OpenType script tag in `scripts`,
 * which defaults to the class's static `scripts`. Later registrations replace earlier ones for the same tags.
 */
export function registerShaper(
  shaper: typeof DefaultShaper,
  scripts?: string[],
): void;

/** The BCP-47 language code that fonts use to look up names, unless they set their own */
export let defaultLanguage: string;

export function setDefaultLanguage(lang?: string): void;

/** Whether errors decoding font tables are logged to the console */
export let logErrors: boolean;
