r = require 'restructure'

module.exports = new r.VersionedStruct 'head.indexToLocFormat',
  0:
    offsets: new r.Array(r.uint16)
  1:         
    offsets: new r.Array(r.uint32)
    
module.exports.process = ->
  return unless @version is 0
  for i in [0...@offsets.length] by 1
    @offsets[i] <<= 1
    
module.exports.preEncode = ->
  return if @version?
  
  # assume @offsets is a sorted array
  @version = if @offsets[@offsets.length - 1] > 0xffff then 1 else 0
  return unless @version is 0
  
  for i in [0...@offsets.length] by 1
    @offsets[i] >>>= 1