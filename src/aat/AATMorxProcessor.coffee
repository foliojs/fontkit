AATStateMachine = require './AATStateMachine'
AATLookupTable = require './AATLookupTable'

class AATMorxProcessor
  # indic replacement flags
  MARK_FIRST = 0x8000
  MARK_LAST  = 0x2000
  VERB       = 0x000F
  
  # contextual substitution and glyph insertion flag
  SET_MARK = 0x8000
  
  # ligature entry flags
  SET_COMPONENT  = 0x8000
  PERFORM_ACTION = 0x2000
  
  # ligature action masks
  LAST_MASK   = 0x80000000
  STORE_MASK  = 0x40000000
  OFFSET_MASK = 0x3FFFFFFF
      
  VERTICAL_ONLY           = 0x800000
  REVERSE_DIRECTION       = 0x400000
  HORIZONTAL_AND_VERTICAL = 0x200000
  
  # glyph insertion flags
  CURRENT_IS_KASHIDA_LIKE = 0x2000
  MARKED_IS_KASHIDA_LIKE  = 0x1000
  CURRENT_INSERT_BEFORE   = 0x0800
  MARKED_INSERT_BEFORE    = 0x0400
  CURRENT_INSERT_COUNT    = 0x03E0
  MARKED_INSERT_COUNT     = 0x001F
  
  constructor: (@font) ->
    @morx = @font.morx
    
  # Processes an array of glyphs and applies the specified features
  # Features should be in the form of {featureType:{featureSetting:true}}
  process: (glyphs, features = {}) ->    
    for chain in @morx.chains
      flags = chain.defaultFlags
      
      # enable/disable the requested features
      for feature in chain.features
        if (f = features[feature.featureType]) and f[feature.featureSetting]
          flags &= feature.disableFlags
          flags |= feature.enableFlags
                
      for subtable, index in chain.subtables
        if subtable.subFeatureFlags & flags
          @processSubtable subtable, glyphs
        
    # remove deleted glyphs
    index = glyphs.length - 1
    while index >= 0
      if glyphs[index].id is 0xffff
        glyphs.splice index, 1

      index--
        
    return glyphs
        
  processSubtable: (@subtable, @glyphs) ->
    if @subtable.type is 4
      @processNoncontextualSubstitutions @subtable, @glyphs
      return
    
    @ligatureStack = []
    @markedGlyph = null
    @firstGlyph = null
    @lastGlyph = null
    @markedIndex = null
    
    stateMachine = new AATStateMachine @subtable.table.stateTable
    process = switch @subtable.type
      when 0 then @processIndicRearragement
      when 1 then @processContextualSubstitution
      when 2 then @processLigature
      when 5 then @processGlyphInsertion
      else throw new Error "Invalid morx subtable type: #{@subtable.type}"
    
    reverse = !!(@subtable.coverage & REVERSE_DIRECTION)
    stateMachine.process @glyphs, reverse, process
        
  processIndicRearragement: (glyph, entry, index) =>
    if entry.flags & MARK_FIRST
      @firstGlyph = index
      
    if entry.flags & MARK_LAST
      @lastGlyph = index
      
    reorderGlyphs @glyphs, entry.flags & VERB, @firstGlyph, @lastGlyph
    return
    
  # swaps the glyphs in rangeA with those in rangeB
  # reverse the glyphs inside those ranges if specified
  # ranges are in [offset, length] format
  swap = (glyphs, rangeA, rangeB, reverseA = false, reverseB = false) ->
    end = glyphs.splice(rangeB[0] - (rangeB[1] - 1), rangeB[1])
    if reverseB
      end.reverse()
      
    start = glyphs.splice(rangeA[0], rangeA[1], end...)
    if reverseA
      start.reverse()
      
    glyphs.splice rangeB[0] - (rangeA[1] - 1), 0, start...
    
  reorderGlyphs = (glyphs, verb, firstGlyph, lastGlyph) ->
    length = lastGlyph - firstGlyph + 1
    switch verb
      when 0 # no change
        break
        
      when 1 # Ax => xA
        swap glyphs, [firstGlyph, 1], [lastGlyph, 0]
        
      when 2 # xD => Dx
        swap glyphs, [firstGlyph, 0], [lastGlyph, 1]
        
      when 3 # AxD => DxA
        swap glyphs, [firstGlyph, 1], [lastGlyph, 1]
        
      when 4 # ABx => xAB
        swap glyphs, [firstGlyph, 2], [lastGlyph, 0]
        
      when 5 # ABx => xBA
        swap glyphs, [firstGlyph, 2], [lastGlyph, 0], true, false
        
      when 6 # xCD => CDx
        swap glyphs, [firstGlyph, 0], [lastGlyph, 2]
        
      when 7 # xCD => DCx
        swap glyphs, [firstGlyph, 0], [lastGlyph, 2], false, true
        
      when 8 # AxCD => CDxA
        swap glyphs, [firstGlyph, 1], [lastGlyph, 2]
        
      when 9 # AxCD => DCxA
        swap glyphs, [firstGlyph, 1], [lastGlyph, 2], false, true
        
      when 10 # ABxD => DxAB
        swap glyphs, [firstGlyph, 2], [lastGlyph, 1]
        
      when 11 # ABxD => DxBA
        swap glyphs, [firstGlyph, 2], [lastGlyph, 1], true, false

      when 12 # ABxCD => CDxAB
        swap glyphs, [firstGlyph, 2], [lastGlyph, 2]
        
      when 13 # ABxCD => CDxBA
        swap glyphs, [firstGlyph, 2], [lastGlyph, 2], true, false
        
      when 14 # ABxCD => DCxAB
        swap glyphs, [firstGlyph, 2], [lastGlyph, 2], false, true
        
      when 15 # ABxCD => DCxBA
        swap glyphs, [firstGlyph, 2], [lastGlyph, 2], true, true
        
      else
        throw new Error "Unknown verb: #{verb}"
        
    return glyphs
        
  processContextualSubstitution: (glyph, entry, index) =>
    subsitutions = @subtable.table.substitutionTable.items
    if entry.markIndex isnt 0xffff
      lookup = subsitutions.getItem entry.markIndex
      lookupTable = new AATLookupTable lookup
      glyph = @glyphs[@markedGlyph]
      gid = lookupTable.lookup(glyph.id)
      if gid
        @glyphs[@markedGlyph] = @font.getGlyph gid, glyph.codePoints
      
    if entry.currentIndex isnt 0xffff
      lookup = subsitutions.getItem entry.currentIndex
      lookupTable = new AATLookupTable lookup
      glyph = @glyphs[index]
      gid = lookupTable.lookup(glyph.id)
      if gid
        @glyphs[index] = @font.getGlyph gid, glyph.codePoints
      
    if entry.flags & SET_MARK
      @markedGlyph = index
          
    return
  
  processLigature: (glyph, entry, index) =>  
    if entry.flags & SET_COMPONENT
      @ligatureStack.push index
    
    if entry.flags & PERFORM_ACTION
      actions = @subtable.table.ligatureActions
      components = @subtable.table.components
      ligatureList = @subtable.table.ligatureList
      
      actionIndex = entry.action
      last = false
      ligatureIndex = 0
      codePoints = []
      
      until last
        componentGlyph = @ligatureStack.pop()
        codePoints.unshift @glyphs[componentGlyph].codePoints...
        
        action = actions.getItem actionIndex++
        last = !!(action & LAST_MASK)
        store = !!(action & STORE_MASK)
        offset = (action & OFFSET_MASK) << 2 >> 2 # sign extend 30 to 32 bits
        offset += @glyphs[componentGlyph].id
        
        component = components.getItem offset
        ligatureIndex += component
                          
        if last or store
          ligatureEntry = ligatureList.getItem ligatureIndex
          @glyphs[componentGlyph] = @font.getGlyph ligatureEntry, codePoints
          ligatureIndex = 0
          codePoints = []
        else
          @glyphs[componentGlyph] = @font.getGlyph 0xffff
              
    return
  
  processNoncontextualSubstitutions: (subtable, glyphs, index) =>
    lookupTable = new AATLookupTable subtable.table.lookupTable
    
    for glyph, index in glyphs when glyph.id isnt 0xffff
      gid = lookupTable.lookup glyph.id
      if gid # 0 means do nothing
        glyphs[index] = @font.getGlyph gid, glyph.codePoints
      
    return
    
  _insertGlyphs: (glyphIndex, insertionActionIndex, count, isBefore) ->
    insertions = while count--
      gid = @subtable.table.insertionActions.getItem insertionActionIndex++
      @font.getGlyph gid
      
    unless isBefore
      glyphIndex++
      
    @glyphs.splice glyphIndex, 0, insertions...
    return
        
  processGlyphInsertion: (glyph, entry, index) =>    
    if entry.flags & SET_MARK
      @markedIndex = index
    
    if entry.markedInsertIndex isnt 0xffff
      count = (entry.flags & MARKED_INSERT_COUNT) >>> 5
      isBefore = !!(entry.flags & MARKED_INSERT_BEFORE)
      @_insertGlyphs @markedIndex, entry.markedInsertIndex, count, isBefore
      
    if entry.currentInsertIndex isnt 0xffff
      count = (entry.flags & CURRENT_INSERT_COUNT) >>> 5
      isBefore = !!(entry.flags & CURRENT_INSERT_BEFORE)
      @_insertGlyphs index, entry.currentInsertIndex, count, isBefore
    
    return
    
  getSupportedFeatures: ->
    features = []
    for chain in @morx.chains
      for feature in chain.features
        features.push [feature.featureType, feature.featureSetting]
        
    return features
  
module.exports = AATMorxProcessor
