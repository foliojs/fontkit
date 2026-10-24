import * as r from 'restructure';

// Flags for simple glyphs
const ON_CURVE = 1 << 0;
const X_SHORT_VECTOR = 1 << 1;
const Y_SHORT_VECTOR = 1 << 2;
const REPEAT = 1 << 3;
const SAME_X = 1 << 4;
const SAME_Y = 1 << 5;

class Point {
  static size(val) {
    return val >= 0 && val <= 255 ? 1 : 2;
  }

  static encode(stream, value) {
    if (value >= 0 && value <= 255) {
      stream.writeUInt8(value);
    } else {
      stream.writeInt16BE(value);
    }
  }
}

let Glyf = new r.Struct({
  numberOfContours: r.int16, // if negative, this is a composite glyph
  xMin: r.int16,
  yMin: r.int16,
  xMax: r.int16,
  yMax: r.int16,
  endPtsOfContours: new r.Array(r.uint16, 'numberOfContours'),
  instructions: new r.Array(r.uint8, r.uint16),
  flags: new r.Array(r.uint8, 0),
  xPoints: new r.Array(Point, 0),
  yPoints: new r.Array(Point, 0),
});

/**
 * Encodes TrueType glyph outlines
 */
export default class TTFGlyphEncoder {
  // Reconstruct a WOFF2 glyph without changing point indices used by hints.
  encodeGlyph(glyph, includeGlyph) {
    if (glyph.numberOfContours === 0) return new Uint8Array(0);

    if (glyph.numberOfContours < 0) {
      let records = glyph.components.map((component, index) => {
        let start = component.pos - 2 - glyph.compositeOffset;
        let end =
          index + 1 < glyph.components.length
            ? glyph.components[index + 1].pos - 2 - glyph.compositeOffset
            : glyph.compositeData.length;
        let record = glyph.compositeData.subarray(start, end);
        let flags = (record[0] << 8) | record[1];
        let oldArgs = flags & 1 ? 4 : 2;
        if (
          flags & 2 &&
          (component.dx < -128 ||
            component.dx > 127 ||
            component.dy < -128 ||
            component.dy > 127)
        ) {
          flags |= 1;
        }
        let args = flags & 1 ? 4 : 2;
        let stream = new r.EncodeStream(
          new Uint8Array(record.length + args - oldArgs),
        );
        stream.writeUInt16BE(flags);
        stream.writeUInt16BE(includeGlyph(component.glyphID));
        if (flags & 2) {
          if (flags & 1) {
            stream.writeInt16BE(component.dx);
            stream.writeInt16BE(component.dy);
          } else {
            stream.writeInt8(component.dx);
            stream.writeInt8(component.dy);
          }
        } else {
          stream.writeBuffer(record.subarray(4, 4 + oldArgs));
        }
        stream.writeBuffer(record.subarray(4 + oldArgs));
        return stream.buffer;
      });
      let size = 10 + records.reduce((sum, record) => sum + record.length, 0);
      if (glyph.haveInstructions) size += 2 + glyph.instructions.length;
      let stream = new r.EncodeStream(new Uint8Array((size + 3) & ~3));
      for (let field of ['numberOfContours', 'xMin', 'yMin', 'xMax', 'yMax']) {
        stream.writeInt16BE(glyph[field]);
      }
      for (let record of records) stream.writeBuffer(record);
      if (glyph.haveInstructions) {
        stream.writeUInt16BE(glyph.instructions.length);
        stream.writeBuffer(glyph.instructions);
      }
      return stream.buffer;
    }

    let flags = [],
      xPoints = [],
      yPoints = [];
    let lastX = 0,
      lastY = 0;
    for (let point of glyph.points) {
      let flag = point.onCurve ? ON_CURVE : 0;
      flag = this._encodePoint(
        point.x,
        lastX,
        xPoints,
        flag,
        X_SHORT_VECTOR,
        SAME_X,
      );
      flag = this._encodePoint(
        point.y,
        lastY,
        yPoints,
        flag,
        Y_SHORT_VECTOR,
        SAME_Y,
      );
      flags.push(flag);
      lastX = point.x;
      lastY = point.y;
    }
    if (glyph.overlapSimple) flags[0] |= 0x40;
    let runs = [];
    for (let i = 0; i < flags.length;) {
      let repeats = 0;
      while (repeats < 255 && flags[i + repeats + 1] === flags[i]) repeats++;
      runs.push(flags[i] | (repeats ? REPEAT : 0));
      if (repeats) runs.push(repeats);
      i += repeats + 1;
    }
    let data = Glyf.toBuffer({
      ...glyph,
      flags: runs,
      xPoints,
      yPoints,
    });
    let buffer = new Uint8Array((data.length + 3) & ~3);
    buffer.set(data);
    return buffer;
  }

  encodeSimple(path, instructions = []) {
    let endPtsOfContours = [];
    let xPoints = [];
    let yPoints = [];
    let flags = [];
    let same = 0;
    let lastX = 0,
      lastY = 0,
      lastFlag = 0;
    let pointCount = 0;

    for (let i = 0; i < path.commands.length; i++) {
      let c = path.commands[i];

      for (let j = 0; j < c.args.length; j += 2) {
        let x = c.args[j];
        let y = c.args[j + 1];
        let flag = 0;

        // If the ending point of a quadratic curve is the midpoint
        // between the control point and the control point of the next
        // quadratic curve, we can omit the ending point.
        if (c.command === 'quadraticCurveTo' && j === 2) {
          let next = path.commands[i + 1];
          if (next && next.command === 'quadraticCurveTo') {
            let midX = (lastX + next.args[0]) / 2;
            let midY = (lastY + next.args[1]) / 2;

            if (x === midX && y === midY) {
              continue;
            }
          }
        }

        // All points except control points are on curve.
        if (!(c.command === 'quadraticCurveTo' && j === 0)) {
          flag |= ON_CURVE;
        }

        flag = this._encodePoint(
          x,
          lastX,
          xPoints,
          flag,
          X_SHORT_VECTOR,
          SAME_X,
        );
        flag = this._encodePoint(
          y,
          lastY,
          yPoints,
          flag,
          Y_SHORT_VECTOR,
          SAME_Y,
        );

        if (flag === lastFlag && same < 255) {
          flags[flags.length - 1] |= REPEAT;
          same++;
        } else {
          if (same > 0) {
            flags.push(same);
            same = 0;
          }

          flags.push(flag);
          lastFlag = flag;
        }

        lastX = x;
        lastY = y;
        pointCount++;
      }

      if (c.command === 'closePath') {
        endPtsOfContours.push(pointCount - 1);
      }
    }

    // Close the path if the last command didn't already
    if (
      path.commands.length > 1 &&
      path.commands[path.commands.length - 1].command !== 'closePath'
    ) {
      endPtsOfContours.push(pointCount - 1);
    }

    let bbox = path.bbox;
    let glyf = {
      numberOfContours: endPtsOfContours.length,
      xMin: bbox.minX,
      yMin: bbox.minY,
      xMax: bbox.maxX,
      yMax: bbox.maxY,
      endPtsOfContours: endPtsOfContours,
      instructions: instructions,
      flags: flags,
      xPoints: xPoints,
      yPoints: yPoints,
    };

    let size = Glyf.size(glyf);
    let tail = 4 - (size % 4);

    let stream = new r.EncodeStream(new Uint8Array(size + tail));
    Glyf.encode(stream, glyf);

    // Align to 4-byte length
    if (tail !== 0) {
      stream.fill(0, tail);
    }

    return stream.buffer;
  }

  _encodePoint(value, last, points, flag, shortFlag, sameFlag) {
    let diff = value - last;

    if (value === last) {
      flag |= sameFlag;
    } else {
      if (-255 <= diff && diff <= 255) {
        flag |= shortFlag;
        if (diff < 0) {
          diff = -diff;
        } else {
          flag |= sameFlag;
        }
      }

      points.push(diff);
    }

    return flag;
  }
}
