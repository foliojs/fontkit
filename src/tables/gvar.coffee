r = require 'restructure'

shortFrac = new r.Fixed 16, 'BE', 14

module.exports = new r.Struct
  version: r.uint16
  reserved: new r.Reserved r.uint16
  axisCount: r.uint16
  globalCoordCount: r.uint16
  globalCoords: new r.Pointer(r.uint32, new r.Array(new r.Array(shortFrac, 'axisCount'), 'globalCoordCount'))
  glyphCount: r.uint16
  flags: r.uint16
  offsetToData: r.uint32

module.exports.process = (stream) ->
  type = if @flags is 1 then r.uint32 else r.uint16
  ptr = new r.Pointer(type, 'void', relativeTo: 'offsetToData', allowNull: no)
  @offsets = new r.Array(ptr, @glyphCount + 1).decode(stream, this)
  
  if @flags is 0
    # In short format, offsets are multiplied by 2.
    # This doesn't seem to be documented by Apple, but it
    # is implemented this way in Freetype.
    for offset, i in @offsets
      @offsets[i] = offset * 2

  return
