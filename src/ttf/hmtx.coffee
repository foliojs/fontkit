r = require 'restructure'

HmtxEntry = new r.Struct
  advanceWidth:    r.uint16
  leftSideBearing: r.int16

module.exports = new r.Struct
  metrics:            new r.Array(HmtxEntry, -> @parent.hhea.numberOfMetrics)
  leftSideBearings:   new r.Array(r.int16, -> @parent.maxp.numGlyphs - @parent.hhea.numberOfMetrics)