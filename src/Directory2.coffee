r = require 'restructure'
tables = require './tables'

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
  _tables = []
  for tag, table of @tables when table?
    tables[tag].preEncode?.call(table)
    _tables.push
      tag: tag
      checkSum: 0
      offset: new r.VoidPointer(tables[tag], table)
      length: tables[tag].size(table)
  
  @version = 0x00010000
  @numTables = _tables.length
  @searchRange = 0
  @entrySelector = 0
  @rangeShift = 0
  @tables = _tables
  
module.exports = Directory
