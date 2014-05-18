r = require 'restructure'
{ScriptList, FeatureList, LookupList, Coverage, ClassDef, Device} = require './opentype'

AttachPoint = new r.Array(r.uint16, r.uint16)
AttachList = new r.Struct
  coverage:       new r.Pointer(r.uint16, Coverage)
  glyphCount:     r.uint16
  attachPoints:   new r.Array(new r.Pointer(r.uint16, AttachPoint), 'glyphCount')
  
CaretValue = new r.VersionedStruct r.uint16,
  1: # Design units only
    coordinate: r.int16
    
  2: # Contour point
    caretValuePoint: r.uint16
    
  3: # Design units plus Device table
    coordinate:     r.int16
    deviceTable:    new r.Pointer(r.uint16, Device)
  
LigGlyph = new r.Array(new r.Pointer(r.uint16, CaretValue), r.uint16)
  
LigCaretList = new r.Struct
  coverage:       new r.Pointer(r.uint16, Coverage)
  ligGlyphCount:  r.uint16
  ligGlyphs:      new r.Array(new r.Pointer(r.uint16, LigGlyph), 'ligGlyphCount')
  
MarkGlyphSetsDef = new r.Struct
  markSetTableFormat: r.uint16
  markSetCount:       r.uint16
  coverage:           new r.Array(new r.Pointer(r.uint32, Coverage), 'markSetCount')
  
module.exports = new r.VersionedStruct r.uint32,
  0x00010000: 
    glyphClassDef:      new r.Pointer(r.uint16, ClassDef)       # 1: base glyph, 2: ligature, 3: mark, 4: component
    attachList:         new r.Pointer(r.uint16, AttachList)
    ligCaretList:       new r.Pointer(r.uint16, LigCaretList)
    markAttachClassDef: new r.Pointer(r.uint16, ClassDef)
  0x00010002:
    glyphClassDef:      new r.Pointer(r.uint16, ClassDef)
    attachList:         new r.Pointer(r.uint16, AttachList)
    ligCaretList:       new r.Pointer(r.uint16, LigCaretList)
    markAttachClassDef: new r.Pointer(r.uint16, ClassDef)
    markGlyphSetsDef:   new r.Pointer(r.uint16, MarkGlyphSetsDef)