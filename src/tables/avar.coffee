r = require 'restructure'

shortFrac = new r.Fixed 16, 'BE', 14

Correspondence = new r.Struct
  fromCoord: shortFrac
  toCoord: shortFrac

Segment = new r.Struct
  pairCount: r.uint16
  correspondence: new r.Array Correspondence, 'pairCount'

module.exports = new r.Struct
  version: r.fixed32
  axisCount: r.uint32
  segment: new r.Array Segment, 'axisCount'
