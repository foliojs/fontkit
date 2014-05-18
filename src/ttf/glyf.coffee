r = require 'restructure'

GlyfTable = new r.Struct
  numberOfContours: r.int16 # if negative, this is a composite glyph
  xMin:             r.int16
  yMin:             r.int16
  xMax:             r.int16
  yMax:             r.int16
  
ARG_1_AND_2_ARE_WORDS     = 0x0001
WE_HAVE_A_SCALE           = 0x0008
MORE_COMPONENTS           = 0x0020
WE_HAVE_AN_X_AND_Y_SCALE  = 0x0040
WE_HAVE_A_TWO_BY_TWO      = 0x0080
WE_HAVE_INSTRUCTIONS      = 0x0100
  
GlyfTable.process = (stream) ->
  # only process if this is a compound glyph
  return unless @numberOfContours < 0
  
  @glyphIDs = []
  @offsets = []
  start = stream.pos
      
  loop
    flags = stream.readUInt16BE()
    @offsets.push stream.pos - start
    @glyphIDs.push stream.readUInt16BE()
      
    break unless flags & MORE_COMPONENTS
      
    if flags & ARG_1_AND_2_ARE_WORDS
      stream.pos += 4
    else 
      stream.pos += 2
        
    if flags & WE_HAVE_A_TWO_BY_TWO
      stream.pos += 8
    else if flags & WE_HAVE_AN_X_AND_Y_SCALE
      stream.pos += 4
    else if flags & WE_HAVE_A_SCALE
      stream.pos += 2
  
# only used for encoding
module.exports = new r.Array(new r.Buffer)