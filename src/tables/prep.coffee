r = require 'restructure'

# Set of instructions executed whenever the point size or font transformation change
module.exports = new r.Struct
  controlValueProgram: new r.Array(r.uint8)