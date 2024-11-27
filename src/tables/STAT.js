import * as r from 'restructure';

let AxisRecord = new r.Struct({
  axisTag: new r.String(4),
  axisNameID: r.uint16,
  axisOrdering: r.uint16,
});

let AxisValue = new r.VersionedStruct(r.uint16, {
  1: {
    axisIndex: r.uint16,
    flags: r.uint16,
    valueNameID: r.uint16,
    value: r.fixed32,
  },
  2: {
    axisIndex: r.uint16,
    flags: r.uint16,
    valueNameID: r.uint16,
    nominalValue: r.fixed32,
    rangeMinValue: r.fixed32,
    rangeMaxValue: r.fixed32,
  },
  3: {
    axisIndex: r.uint16,
    flags: r.uint16,
    valueNameID: r.uint16,
    value: r.fixed32,
    linkedValue: r.fixed32,
  },
  4: {
    axisCount: r.uint16,
    flags: r.uint16,
    valueNameID: r.uint16,
    axisValues: new r.Array(
      new r.Struct({
        axisIndex: r.uint16,
        value: r.fixed32,
      }),
      'axisCount',
    ),
  },
});

// Wrap the array of AxisValue structs in a struct which ensures that the
// pointers are relative to the start of the array (which equals the start of
// the struct) instead of the STAT table.
// https://github.com/foliojs/restructure/issues/25#issuecomment-300372772
let AxisValueArray = new r.Struct({
  axisValues: new r.Array(
    new r.Pointer(r.uint16, AxisValue),
    (parent) => parent.parent.axisValueCount,
  ),
});

// Simplify the structure by moving axisValues to the top level. Also rename
// the `version` field to `format` in the AxisValue structs.
// There should be a better way to do this.
class STATStruct extends r.VersionedStruct {
  decode(stream, parent) {
    let value = super.decode(stream, parent);
    value.axisValues = value.offsetToAxisValueOffsets.axisValues;
    delete value.offsetToAxisValueOffsets;
    for (let axisValue of value.axisValues) {
      axisValue.format = axisValue.version;
      delete axisValue.version;
    }
    return value;
  }

  encode(stream, value, parent) {
    value.offsetToAxisValueOffsets = { axisValues: value.axisValues };
    delete value.axisValues;
    for (let axisValue of value.offsetToAxisValueOffsets.axisValues) {
      axisValue.version = axisValue.format;
      delete axisValue.format;
    }
    return super.encode(stream, value, parent);
  }
}

export default new STATStruct(r.uint32, {
  header: {
    designAxisSize: r.uint16,
    designAxisCount: r.uint16,
    designAxes: new r.Pointer(
      r.uint32,
      new r.Array(AxisRecord, 'designAxisCount'),
    ),
    axisValueCount: r.uint16,
    offsetToAxisValueOffsets: new r.Pointer(r.uint32, AxisValueArray),
  },
  0x00010000: {},
  0x00010001: {
    elidedFallbackNameID: r.uint16,
  },
  // Version 1.2 adds support for the format 4 axis value table.
  0x00010002: {
    elidedFallbackNameID: r.uint16,
  },
});
