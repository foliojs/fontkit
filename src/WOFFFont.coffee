TTFFont = require './TTFFont'
WOFFDirectory = require './WOFFDirectory'
tables = require './tables'
zlib = require 'browserify-zlib'

class WOFFFont extends TTFFont
  _decodeDirectory: ->
    @directory = WOFFDirectory.decode(@stream, _startOffset: 0)
    
  _decodeTable: (table) ->
    if table.compLength < table.origLength
      buf = zlib.inflateSync @stream.readBuffer(table.compLength)
      stream = new r.DecodeStream(buf)
      return tables[table.tag].decode(stream, this, table.origLength)
    else
      super
    
module.exports = WOFFFont
