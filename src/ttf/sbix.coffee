r = require 'restructure'

Image = new r.Struct
  originX: r.uint16
  originY: r.uint16
  kind: new r.String(4)
  data: new r.Buffer('buflen')

ImageTable = new r.Struct
  height: r.uint16
  dpi: r.uint16
  imageOffsets: new r.Array(new r.Pointer(r.uint32, 'void'), -> @parent.parent.maxp.numGlyphs + 1)

# This is the Apple sbix table, used by the "Apple Color Emoji" font.
# It includes several image tables with images for each bitmap glyph
# of several different sizes.
module.exports = new r.Struct
  version: r.uint16
  flags: new r.Bitfield(r.uint16, ['renderOutlines'])
  numImgTables: r.uint32
  imageTables: new r.Array(new r.Pointer(r.uint32, ImageTable), 'numImgTables')
