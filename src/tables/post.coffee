r = require 'restructure'

# PostScript information
module.exports = new r.VersionedStruct r.int32,
  header: # these fields exist at the top of all versions
    italicAngle:        r.fixed32 # Italic angle in counter-clockwise degrees from the vertical.
    underlinePosition:  r.int16   # Suggested distance of the top of the underline from the baseline 
    underlineThickness: r.int16   # Suggested values for the underline thickness
    isFixedPitch:       r.uint32  # Whether the font is monospaced
    minMemType42:       r.uint32  # Minimum memory usage when a TrueType font is downloaded as a Type 42 font
    maxMemType42:       r.uint32  # Maximum memory usage when a TrueType font is downloaded as a Type 42 font
    minMemType1:        r.uint32  # Minimum memory usage when a TrueType font is downloaded as a Type 1 font
    maxMemType1:        r.uint32  # Maximum memory usage when a TrueType font is downloaded as a Type 1 font
  
  0x00010000: {} # version 1 has no additional fields
  
  0x00020000:
    numberOfGlyphs: r.uint16
    glyphNameIndex: new r.Array(r.uint16, 'numberOfGlyphs')
    names:          new r.Array(new r.String(r.uint8))
    
  0x00025000:
    numberOfGlyphs: r.uint16
    offsets:        new r.Array(r.uint8, 'numberOfGlyphs')
      
  0x00030000: {} # version 3 has no additional fields
    
  0x00040000:
    map: new r.Array(r.uint32, -> @parent.maxp.numGlyphs)