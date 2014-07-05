r = require 'restructure'
Tables = require './tables'

TableEntry = new r.Struct
  tag:        new r.String(4)
  checkSum:   r.uint32
  offset:     new r.Pointer(r.uint32, 'void', type: 'global')
  length:     r.uint32

Directory = new r.Struct
  version:        r.uint32
  numTables:      r.uint16
  searchRange:    r.uint16
  entrySelector:  r.uint16
  rangeShift:     r.uint16
  tables:         new r.Array(TableEntry, 'numTables')
  
Directory.process = ->
  tables = {}
  for table in @tables
    tables[table.tag] = table
    
  @tables = tables
  
Directory.preEncode = (stream) ->
  tables = []
  for tag, table of @tables when table?
    tables.push
      tag: tag
      checkSum: 0
      offset: new r.VoidPointer(Tables[tag], table)
      length: Tables[tag].size(table)
  
  @version = 0x00010000
  @numTables = tables.length
  @tables = tables
  
  log2 = Math.log(2)
  @searchRange = Math.floor(Math.log(@numTables) / log2) * 16
  @entrySelector = Math.floor @searchRange / log2
  @rangeShift = @numTables * 16 - @searchRange
    
module.exports = Directory
