r = require 'restructure'

TTCHeader = new r.VersionedStruct r.uint32,
  0x00010000:
    numFonts:   r.uint32
    offsets:    new r.Array(r.uint32, 'numFonts')
  0x00020000:
    numFonts:   r.uint32
    offsets:    new r.Array(r.uint32, 'numFonts')
    dsigTag:    r.uint32
    dsigLength: r.uint32
    dsigOffset: r.uint32
    
module.exports = TTCHeader
