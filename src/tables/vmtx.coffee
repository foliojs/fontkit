r = require 'restructure'

VmtxEntry = new r.Struct
  advance: r.uint16  # The advance height of the glyph
  bearing: r.int16   # The top sidebearing of the glyph

# Vertical Metrics Table
module.exports = new r.Struct
  metrics:  new r.Array(VmtxEntry, -> @parent.vhea.numberOfMetrics)
  bearings: new r.Array(r.int16, -> @parent.maxp.numGlyphs - @parent.vhea.numberOfMetrics)