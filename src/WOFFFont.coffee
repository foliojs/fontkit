TTFFont = require './TTFFont'
WOFFDirectory = require './tables/WOFFDirectory'
tables = require './tables'
pako = require 'pako/lib/inflate'
toBuffer = require 'typedarray-to-buffer'
r = require 'restructure'

class WOFFFont extends TTFFont
  @probe: (buffer) ->
    return buffer.toString('ascii', 0, 4) is 'wOFF'
    
  _decodeDirectory: ->
    @directory = WOFFDirectory.decode(@stream, _startOffset: 0)
    
  _getTableStream: (tag) ->
    table = @directory.tables[tag]
    if table
      @stream.pos = table.offset
    
      if table.compLength < table.origLength
        buf = toBuffer pako.inflate @stream.readBuffer(table.compLength)
        return new r.DecodeStream(buf)
      else
        return @stream
        
    return null
    
  _decodeTable: (table) ->
    return tables[table.tag].decode(@_getTableStream(table.tag), this, table.origLength)
    
module.exports = WOFFFont
