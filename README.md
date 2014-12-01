# fontkit

Fontkit is an advanced font engine for Node and the browser, used by [PDFKit](https://github.com/devongovett/pdfkit). It supports many font formats, advanced glyph substitution and layout features, glyph path extraction, color emoji glyphs, font subsetting, and more.

## Features

* Suports TrueType (.ttf), OpenType (.otf), WOFF, WOFF2, TrueType Collection (.ttc), and Datafork TrueType (.dfont) font files
* Supports mapping characters to glyphs, including support for ligatures and other advanced substitutions (see below)
* Supports reading glyph metrics and laying out glyphs, including support for kerning and other advanced layout features (see below)
* Advanced OpenType features including glyph substitution (GSUB) and positioning (GPOS)
* Apple Advanced Typography (AAT) glyph substitution features (morx table)
* Support for getting glyph vector paths and converting them to SVG paths, or rendering them to a graphics context
* Supports TrueType (glyf) and PostScript (CFF) outlines
* Support for color glyphs (e.g. emoji), including Apple’s SBIX table, and Microsoft’s COLR table
* Font subsetting support - create a new font including only the specified glyphs

## Installation

    npm install fontkit

## Example

```javascript
var fontkit = require('fontkit');

// open a font synchronously
var font = fontkit.openSync('font.ttf');

// get some glyphs for a string, and apply ligature substitutions
var glyphs = font.glyphsForString('hello world!', ['liga']);

// get glyph advances, and apply kerning
var advances = font.advancesForGlyphs(glyphs, ['kern']);

// get an SVG path for a glyph
var svg = glyphs[0].path.toSVG();

// create a font subset
var subset = font.createSubset();
glyphs.forEach(function(glyph) {
  subset.includeGlyph(glyph);
});

subset.encodeStream()
      .pipe(fs.createWriteStream('subset.ttf'));
```

## API

### `fontkit.open(filename, postscriptName = null, callback(err, font))`

Opens a font file asynchronously, and calls the callback with a font object. For collection fonts (such as TrueType collection files), you can pass a `postscriptName` to get that font out of the collection instead of a collection object.

### `fontkit.openSync(filename, postscriptName = null)`

Opens a font file synchronously, and returns a font object. For collection fonts (such as TrueType collection files), you can pass a `postscriptName` to get that font out of the collection instead of a collection object.

### `fontkit.create(buffer, postscriptName = null)`

Returns a font object for the given buffer. For collection fonts (such as TrueType collection files), you can pass a `postscriptName` to get that font out of the collection instead of a collection object.

## Font objects

There are several different types of font objects that are returned by fontkit depending on the font format. They all inherit from the `TTFFont` class and have the same public API, described below.

### Metadata properties

The following properties are strings (or null if the font does not contain strings for them) describing the font, as specified by the font creator.

* `postscriptName`
* `fullName`
* `familyName`
* `subfamilyName`
* `copyright`
* `version`

### Metrics

The following properties describe the general metrics of the font. See [here](http://www.freetype.org/freetype2/docs/glyphs/glyphs-3.html) for a good overview of how all of these properties relate to one another.

* `scale` - the font’s internal scale factor
* `unitsPerEm` - the size of the font’s internal coordinate grid
* `ascent` - the font’s [ascender](http://en.wikipedia.org/wiki/Ascender_(typography))
* `descent` - the font’s [descender](http://en.wikipedia.org/wiki/Descender)
* `lineGap` - the amount of space that should be included between lines
* `underlinePosition` - the offset from the normal underline position that should be used
* `underlineThickness` - the weight of the underline that should be used
* `italicAngle` - if this is an italic font, the angle the cursor should be drawn at to match the font design
* `capHeight` - the height of capital letters above the baseline. See [here](http://en.wikipedia.org/wiki/Cap_height) for more details.
* `xHeight`- the height of lower case letters. See [here](http://en.wikipedia.org/wiki/X-height) for more details.
* `bbox` - the font’s bounding box, i.e. the box that encloses all glyphs in the font

### Other properties

* `numGlyphs` - the number of glyphs in the font
* `characterSet` - an array of all of the unicode code points supported by the font
* `availableFeatures` - an array of all [OpenType feature tags](https://www.microsoft.com/typography/otspec/featuretags.htm) (or mapped AAT tags) supported by the font (see below for a description of this)

### Character to glyph mapping

Fontkit includes several methods for character to glyph mapping, including support for advanced OpenType and AAT substitutions.

#### `font.glyphsForString(string, features = null)`

This method returns an array of Glyph objects for the given string. This may not be a one to one mapping if OpenType or AAT substitutions are applied.

The `features` parameter is an array of [OpenType feature tags](https://www.microsoft.com/typography/otspec/featuretags.htm) to be applied. If this is an AAT font, the OpenType feature tags are mapped to AAT features. If nothing is passed to the `features` parameter, a set of default features are applied. To disable features entirely, explicitly pass an empty array to the `features` parameter.

#### `font.glyphForCodePoint(codePoint)`

Maps a single unicode code point (number) to a Glyph object. Does not perform any advanced substitutions (there is no context to do so).

#### `font.hasGlyphForCodePoint(codePoint)`

Returns whether there is glyph in the font for the given unicode code point.

### Glyph metrics and layout

Fontkit includes several methods for accessing glyph metrics and performing layout, including support for kerning and other advanced OpenType positioning adjustments.

#### `font.advancesForGlyphs(glyphs, features = null)`

Returns an array of advances for the given array of Glyph objects. Conceptually, an advance is the distance to move the “pen” after a glyph has been rendered, before the next glyph is rendered.

The `features` parameter is an array of [OpenType feature tags](https://www.microsoft.com/typography/otspec/featuretags.htm) to be applied. If this is an AAT font, only the ‘kern’ feature is supported. If nothing is passed to the `features` parameter, a set of default features are applied. To disable features entirely, explicitly pass an empty array to the `features` parameter.

#### `font.widthOfString(string, features = null)`

Returns the width of the given string, applying the given features as described above. This is just the sum of `advancesForGlyphs(glyphsForString(string))`.

#### `font.widthOfGlyph(glyph_id)`

Returns the advance width (described above) for a single glyph id.

### Other methods

#### `font.getGlyph(glyph_id, codePoints = [])`

Returns a glyph object for the given glyph id. You can pass the array of code points this glyph represents for your use later, and it will be stored in the glyph object.

#### `font.createSubset()`

Returns a Subset object for this font, described below.

## Font Collection objects

For font collection files that contain multiple fonts in a single file, such as TrueType Collection (.ttc) and Datafork TrueType (.dfont) files, a font collection object can be returned by Fontkit.

### `collection.getFont(postscriptName)`

Gets a font from the collection by its postscript name. Returns a Font object, described above.

### `collection.fonts`

This property is a lazily-loaded array of all of the fonts in the collection.

## Glyph objects

Glyph objects represent a glyph in the font. They have various properties for accessing metrics and the actual vector path the glyph represents, and methods for rendering the glyph to a graphics context.

You do not create glyph objects directly. They are created by various methods on the font object, described above. There are several subclasses of the base `Glyph` class internally that may be returned depending on the font format, but they all include the following API.

### Properties

* `id` - the glyph id in the font
* `codePoints` - an array of unicode code points that are represented by this glyph. There can be multiple code points in the case of ligatures and other glyphs that represent multiple visual characters.
* `path` - a vector Path object representing the glyph
* `bbox` - the glyph’s bounding box, i.e. the rectangle that encloses the glyph outline as tightly as possible.
* `cbox` - the glyph’s control box. This is often the same as the bounding box, but is faster to compute. Because of the way bezier curves are defined, some of the control points can be outside of the bounding box. Where `bbox` takes this into account, `cbox` does not. Thus, `cbox` is less accurate, but faster to compute. See [here](http://www.freetype.org/freetype2/docs/glyphs/glyphs-6.html#section-2) for a more detailed description.
* `advanceWidth` - the glyph’s advance width. Equivalent to calling `font.widthOfGlyph(glyph.id)`

### `glyph.render(ctx, size)`

Renders the glyph to the given graphics context, at the specified font size.

### Color glyphs (e.g. emoji)

Fontkit has support for several different color emoji font formats. Currently, these include Apple’s SBIX table (as used by the “Apple Color Emoji” font), and Microsoft’s COLR table (supported by Windows 8.1). [Here](http://blog.symbolset.com/multicolor-fonts) is an overview of the various color font formats out there.

#### `glyph.getImageForSize(size)`

For SBIX glyphs, which are bitmap based, this returns an object containing some properties about the image, along with the image data itself (usually PNG).

#### `glyph.layers`

For COLR glyphs, which are vector based, this returns an array of objects representing the glyphs and colors for each layer in render order.

## Path objects

Path objects are returned by glyphs and represent the actual vector outlines for each glyph in the font. Paths can be converted to SVG path data strings, or to functions that can be applied to render the path to a graphics context.

### `path.moveTo(x, y)`

Moves the virtual pen to the given x, y coordinates.

### `path.lineTo(x, y)`

Adds a line to the path from the current point to the given x, y coordinates.

### `path.quadraticCurveTo(cpx, cpy, x, y)`

Adds a quadratic curve to the path from the current point to the given x, y coordinates using cpx, cpy as a control point.

### `path.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y)`

Adds a bezier curve to the path from the current point to the given x, y coordinates using cp1x, cp1y and cp2x, cp2y as control points.

### `path.closePath()`

Closes the current sub-path by drawing a straight line back to the starting point.

### `path.toFunction()`

Compiles the path to a JavaScript function that can be applied with a graphics context in order to render the path.

### `path.toSVG()`

Converts the path to an SVG path data string.

### `path.bbox`

This property represents the path’s bounding box, i.e. the smallest rectangle that contains the entire path shape. This is the exact bounding box, taking into account control points that may be outside the visible shape.

### `path.cbox`

This property represents the path’s control box. It is like the bounding box, but it includes all points of the path, including control points of bezier segments. It is much faster to compute than the real bounding box, but less accurate if there are control points outside of the visible shape.

## Subsets

Fontkit can perform font subsetting, i.e. the process of creating a new font from an existing font where only the specified glyphs are included. This is useful to reduce the size of large fonts, such as in PDF generation or for web use.

Currently, subsets produce minimal fonts designed for PDF embedding that may not work as standalone files. They have no cmap tables and other essential tables for standalone use. This limitation will be removed in the future.

You create a Subset object by calling `font.createSubset()`, described above. The API on Subset objects is as follows.

### `subset.includeGlyph(glyph)`

Includes the given glyph object or glyph ID in the subset.

### `subset.encodeStream()`

Returns a [stream](https://nodejs.org/api/stream.html) containing the encoded font file that can be piped to a destination, such as a file.

## License

MIT
