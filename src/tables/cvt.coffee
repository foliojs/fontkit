r = require 'restructure'

# An array of predefined values accessible by instructions
module.exports = new r.Struct
  controlValues: new r.Array(r.int16)