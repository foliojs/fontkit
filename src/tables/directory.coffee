r = require 'restructure'
Tables = require './'

TableEntry = new r.Struct
  tag:        new r.String(4)
  checkSum:   r.uint32
  offset:     new r.Pointer(r.uint32, 'void', type: 'global')
  length:     r.uint32

Directory = new r.Struct
  tag:            new r.String(4)
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
  
  @tag = 'true'
  @numTables = tables.length
  @tables = tables
  
  @searchRange = Math.floor(Math.log(@numTables) / Math.LN2) * 16
  @entrySelector = Math.floor @searchRange / Math.LN2
  @rangeShift = @numTables * 16 - @searchRange
    
module.exports = Directory
