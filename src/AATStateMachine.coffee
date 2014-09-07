AATLookupTable = require './AATLookupTable'

class AATStateMachine
  constructor: (@stateTable) ->
    @lookupTable = new AATLookupTable @stateTable.classTable
      
  START_OF_TEXT_STATE = 0
  START_OF_LINE_STATE = 1
  
  END_OF_TEXT_CLASS = 0
  OUT_OF_BOUNDS_CLASS = 1
  DELETED_GLYPH_CLASS = 2
  END_OF_LINE_CLASS = 3
  
  DONT_ADVANCE = 0x4000
    
  process: (glyphs, reverse, processEntry) ->
    currentState = START_OF_TEXT_STATE # START_OF_LINE_STATE is used for kashida glyph insertions sometimes I think?
    index = if reverse then glyphs.length - 1 else 0
    dir = if reverse then -1 else 1
    
    while (dir is 1 and index <= glyphs.length) or (dir is -1 and index >= -1)
      glyph = null
      classCode = OUT_OF_BOUNDS_CLASS
      shouldAdvance = true
        
      if index in [glyphs.length, -1]
        classCode = END_OF_TEXT_CLASS
      else
        glyph = glyphs[index]
        if glyph.id is 0xffff # deleted glyph
          classCode = DELETED_GLYPH_CLASS
        else
          classCode = @lookupTable.lookup(glyph.id)
          unless classCode?
            classCode = OUT_OF_BOUNDS_CLASS
          
      row = @stateTable.stateArray.getItem currentState
      entryIndex = row[classCode]
      entry = @stateTable.entryTable.getItem entryIndex
      
      if classCode not in [END_OF_TEXT_CLASS, DELETED_GLYPH_CLASS]
        processEntry glyph, entry, index
        shouldAdvance = !(entry.flags & DONT_ADVANCE)

      currentState = entry.newState
      if shouldAdvance
        index += dir
        
    return glyphs
          
module.exports = AATStateMachine
