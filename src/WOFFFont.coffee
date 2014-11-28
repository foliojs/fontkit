TTFFont = require './TTFFont'
WOFFDirectory = require './tables/WOFFDirectory'
tables = require './tables'
zlib = require 'browserify-zlib'
r = require 'restructure'

class WOFFFont extends TTFFont
  _decodeDirectory: ->
    @directory = WOFFDirectory.decode(@stream, _startOffset: 0)
    
  _getTableStream: (tag) ->
    table = @directory.tables[tag]
    if table
      @stream.pos = table.offset
    
      if table.compLength < table.origLength
        buf = zlib.inflateSync @stream.readBuffer(table.compLength)
        return new r.DecodeStream(buf)
      else
        return @stream
        
    return null
    
  _decodeTable: (table) ->
    return tables[table.tag].decode(@_getTableStream(table.tag), this, table.origLength)
    
module.exports = WOFFFont
