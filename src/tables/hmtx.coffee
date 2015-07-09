r = require 'restructure'

HmtxEntry = new r.Struct
  advance: r.uint16
  bearing: r.int16

module.exports = new r.Struct
  metrics:    new r.Array(HmtxEntry, -> @parent.hhea.numberOfMetrics)
  bearings:   new r.Array(r.int16, -> @parent.maxp.numGlyphs - @parent.hhea.numberOfMetrics)