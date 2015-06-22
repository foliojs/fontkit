r = require 'restructure'

Axis = new r.Struct
  axisTag: new r.String 4
  minValue: r.fixed32
  defaultValue: r.fixed32
  maxValue: r.fixed32
  flags: r.uint16
  nameID: r.uint16
  name: -> @parent.parent.name.records.fontFeatures?.English?[@nameID]
  
Instance = new r.Struct
  nameID: r.uint16
  name: -> @parent.parent.name.records.fontFeatures?.English?[@nameID]
  flags: r.uint16
  coord: new r.Array r.fixed32, -> @parent.axisCount

module.exports = new r.Struct
  version: r.fixed32
  offsetToData: r.uint16
  countSizePairs: r.uint16
  axisCount: r.uint16
  axisSize: r.uint16
  instanceCount: r.uint16
  instanceSize: r.uint16
  axis: new r.Array Axis, 'axisCount'
  instance: new r.Array Instance, 'instanceCount'
