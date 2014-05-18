r = require 'restructure'

DeviceRecord = new r.Struct
  pixelSize:      r.uint8
  maximumWidth:   r.uint8
  widths:         new r.Array(r.uint8, -> @parent.parent.maxp.numGlyphs)

# The Horizontal Device Metrics table stores integer advance widths scaled to particular pixel sizes
module.exports = new r.Struct
  version:            r.uint16
  numRecords:         r.int16
  sizeDeviceRecord:   r.int32
  records:            new r.Array(DeviceRecord, 'numRecords')