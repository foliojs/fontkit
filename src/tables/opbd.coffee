r = require 'restructure'
{LookupTable} = require './aat'

OpticalBounds = new r.Struct
  left: r.int16
  top: r.int16
  right: r.int16
  bottom: r.int16

module.exports = new r.Struct
  version: r.fixed32
  format: r.uint16
  lookupTable: new LookupTable(OpticalBounds)
