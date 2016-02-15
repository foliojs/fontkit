Script = require '../layout/Script'

# ShapingPlans are used by the OpenType shapers to store which
# features should by applied, and in what order to apply them.
# The features are applied in groups called stages. A feature
# can be applied globally to all glyphs, or locally to only
# specific glyphs.
class ShapingPlan
  constructor: (@font, @script, @language) ->
    @direction = Script.direction(@script)
    @stages = []
    @globalFeatures = {}
    @allFeatures = {}
    
  # Adds the given features to the last stage.
  # Ignores features that have already been applied.
  _addFeatures: (features) ->
    stage = @stages[@stages.length - 1]
    for feature in features
      unless @allFeatures[feature]
        stage.push feature
        @allFeatures[feature] = true
      
    return
    
  # Adds the given features to the global list
  _addGlobal: (features) ->
    for feature in features
      @globalFeatures[feature] = true
      
    return
    
  # Add features to the last stage
  add: (arg, global = true) ->
    if @stages.length is 0
      @stages.push []
    
    if typeof arg is 'string'
      arg = [arg]
    
    if Array.isArray(arg)
      @_addFeatures arg
      if global
        @_addGlobal arg
        
    else if typeof arg is 'object'
      features = (arg.global || []).concat(arg.local || [])
      @_addFeatures features
      if arg.global
        @_addGlobal arg.global
        
    else
      throw new Error "Unsupported argument to ShapingPlan#add"
  
  # Add a new stage
  addStage: (arg, global) ->
    if typeof arg is 'function'
      @stages.push arg, []
    else
      @stages.push []
      @add arg, global
      
  # Assigns the global features to the given glyphs
  assignGlobalFeatures: (glyphs) ->
    for glyph in glyphs
      for feature of @globalFeatures
        glyph.features[feature] = true
        
    return
    
  # Executes the planned stages using the given OTProcessor
  process: (processor, glyphs, positions) ->
    processor.selectScript @script, @language
    
    for item in @stages
      if typeof item is 'function'
        item(glyphs, positions)
        
      else if item.length > 0
        processor.applyFeatures(item, glyphs, positions)
        
    return
  
module.exports = ShapingPlan
