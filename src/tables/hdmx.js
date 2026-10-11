import * as r from 'restructure';

let DeviceRecord = new r.Struct({
  pixelSize: r.uint8,
  maximumWidth: r.uint8,
  widths: new r.Array(r.uint8, (t) => t.parent.parent.maxp.numGlyphs),
  // Each record is padded to sizeDeviceRecord bytes, a multiple of four
  padding: new r.Reserved(r.uint8, (t) =>
    Math.max(0, t.parent.sizeDeviceRecord - t._currentOffset),
  ),
});

// The Horizontal Device Metrics table stores integer advance widths scaled to particular pixel sizes
export default new r.Struct({
  version: r.uint16,
  numRecords: r.int16,
  sizeDeviceRecord: r.int32,
  records: new r.Array(DeviceRecord, 'numRecords'),
});
