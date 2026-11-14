import Subset from './Subset';
import Directory from '../tables/directory';
import TTFGlyphEncoder from '../glyph/TTFGlyphEncoder';

export default class TTFSubset extends Subset {
  constructor(font) {
    super(font);
    this.glyphEncoder = new TTFGlyphEncoder();
  }

  _addGlyph(gid) {
    let glyph = this.font.getGlyph(gid);
    let glyf = glyph._decode();
    let transformed = this.font.directory.tables.glyf.transformed;
    let buffer;
    let bearing;

    if (transformed) {
      if (glyf.numberOfContours && this.font._variationProcessor) {
        // Resolving the path also updates varied phantom-point metrics.
        let box = glyph.path.cbox;
        if (glyf.numberOfContours > 0) {
          box = {
            minX: Infinity,
            minY: Infinity,
            maxX: -Infinity,
            maxY: -Infinity,
          };
          for (let point of glyf.points) {
            box.minX = Math.min(box.minX, point.x);
            box.minY = Math.min(box.minY, point.y);
            box.maxX = Math.max(box.maxX, point.x);
            box.maxY = Math.max(box.maxY, point.y);
          }
        }
        if (
          !Number.isFinite(box.minX) ||
          (glyf.numberOfContours < 0 && glyph.path.commands.length === 0)
        ) {
          // Empty composites have no contour box; preserve their stored bounds.
          box = {
            minX: glyf.xMin,
            minY: glyf.yMin,
            maxX: glyf.xMax,
            maxY: glyf.yMax,
          };
        }
        glyf = {
          ...glyf,
          xMin: Math.floor(box.minX),
          yMin: Math.floor(box.minY),
          xMax: Math.ceil(box.maxX),
          yMax: Math.ceil(box.maxY),
        };
      }
      buffer = this.glyphEncoder.encodeGlyph(glyf, (id) =>
        this.includeGlyph(id),
      );
      bearing = glyf.phantomPoints
        ? glyf.xMin - glyf.phantomPoints[0].x
        : glyph._getMetrics().leftBearing;
    } else {
      // get the offset to the glyph from the loca table
      let curOffset = this.font.loca.offsets[gid];
      let nextOffset = this.font.loca.offsets[gid + 1];

      let stream = this.font._getTableStream('glyf');
      stream.pos += curOffset;

      buffer = stream.readBuffer(nextOffset - curOffset);

      bearing = glyph._getMetrics().leftBearing;
      if (glyf && this.font._variationProcessor) {
        // If this is a TrueType variation glyph, re-encode the path and take the
        // left side bearing from it. Compound glyphs are flattened too, as the
        // offsets of their components vary.
        buffer = this.glyphEncoder.encodeSimple(glyph.path, glyf.instructions);
        bearing = glyph.path.cbox.minX;
      } else if (glyf && glyf.numberOfContours < 0) {
        // if it is a compound glyph, include its components
        buffer = new Uint8Array(buffer);
        let view = new DataView(buffer.buffer);
        for (let component of glyf.components) {
          gid = this.includeGlyph(component.glyphID);
          view.setUint16(component.pos, gid);
        }
      }
    }

    this.glyf.push(buffer);
    this.loca.offsets.push(this.offset);

    this.hmtx.metrics.push({
      advance: transformed
        ? Math.round(glyph.advanceWidth)
        : glyph.advanceWidth,
      bearing,
    });

    this.offset += buffer.length;
    return this.glyf.length - 1;
  }

  encode() {
    if (
      this.font.directory.tables.glyf.transformed &&
      this.font.directory.tables.hmtx.transformed
    ) {
      throw new Error(
        'Subsetting WOFF2 fonts with transformed hmtx is not supported',
      );
    }
    // tables required by PDF spec:
    //   head, hhea, loca, maxp, cvt , prep, glyf, hmtx, fpgm
    //
    // additional tables required for standalone fonts:
    //   name, cmap, OS/2, post

    this.glyf = [];
    this.offset = 0;
    this.loca = {
      offsets: [],
      version: this.font.directory.tables.glyf.transformed
        ? 1
        : this.font.loca.version,
    };

    this.hmtx = {
      metrics: [],
      bearings: [],
    };

    // include all the glyphs
    // not using a for loop because we need to support adding more
    // glyphs to the array as we go, and CoffeeScript caches the length.
    let i = 0;
    while (i < this.glyphs.length) {
      this._addGlyph(this.glyphs[i++]);
    }

    let maxp = { ...this.font.maxp };
    maxp.numGlyphs = this.glyf.length;

    this.loca.offsets.push(this.offset);

    let head = { ...this.font.head };
    head.indexToLocFormat = this.loca.version;

    let hhea = { ...this.font.hhea };
    hhea.numberOfMetrics = this.hmtx.metrics.length;

    // map = []
    // for index in [0...256]
    //     if index < @numGlyphs
    //         map[index] = index
    //     else
    //         map[index] = 0
    //
    // cmapTable =
    //     version: 0
    //     length: 262
    //     language: 0
    //     codeMap: map
    //
    // cmap =
    //     version: 0
    //     numSubtables: 1
    //     tables: [
    //         platformID: 1
    //         encodingID: 0
    //         table: cmapTable
    //     ]

    // TODO: subset prep, cvt, fpgm?
    return Directory.toBuffer({
      tables: {
        head,
        hhea,
        loca: this.loca,
        maxp,
        'cvt ': this.font['cvt '],
        prep: this.font.prep,
        glyf: this.glyf,
        hmtx: this.hmtx,
        fpgm: this.font.fpgm,

        // name: clone @font.name
        // 'OS/2': clone @font['OS/2']
        // post: clone @font.post
        // cmap: cmap
      },
    });
  }
}
