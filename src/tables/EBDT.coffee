r = require 'restructure'

# module.exports = new r.Struct
#   version: r.uint32 # 0x00020000
  
BigMetrics = new r.Struct
  height: r.uint8
  width: r.uint8
  horiBearingX: r.int8
  horiBearingY: r.int8
  horiAdvance: r.uint8
  vertBearingX: r.int8
  vertBearingY: r.int8
  vertAdvance: r.uint8
  
exports.BigMetrics = BigMetrics
  
SmallMetrics = new r.Struct
  height: r.uint8
  width: r.uint8
  bearingX: r.int8
  bearingY: r.int8
  advance: r.uint8
  
exports.SmallMetrics = SmallMetrics
  
EBDTComponent = new r.Struct
  glyph: r.uint16
  xOffset: r.int8
  yOffset: r.int8
  
class ByteAligned
  
class BitAligned
  
exports.glyph = new r.VersionedStruct 'version',
  1:
    metrics: SmallMetrics
    data: ByteAligned
    
  2:
    metrics: SmallMetrics
    data: BitAligned
    
  # format 3 is deprecated
  # format 4 is not supported by Microsoft
    
  5:
    data: BitAligned
    
  6:
    metrics: BigMetrics
    data: ByteAligned
    
  7:
    metrics: BigMetrics
    data: BitAligned
    
  8:
    metrics: SmallMetrics
    pad: new r.Reserved(r.uint8)
    numComponents: r.uint16
    components: new r.Array(EBDTComponent, 'numComponents')
    
  9:
    metrics: BigMetrics
    pad: new r.Reserved(r.uint8)
    numComponents: r.uint16
    components: new r.Array(EBDTComponent, 'numComponents')
    
  17:
    metrics: SmallMetrics
    dataLen: r.uint32
    data: new r.Buffer('dataLen')
    
  18:
    metrics: BigMetrics
    dataLen: r.uint32
    data: new r.Buffer('dataLen')
    
  19:
    dataLen: r.uint32
    data: new r.Buffer('dataLen')
    