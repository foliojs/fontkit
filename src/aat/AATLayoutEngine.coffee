AATFeatureMap = require './AATFeatureMap'
AATMorxProcessor = require './AATMorxProcessor'
Script = require '../layout/Script'

class AATLayoutEngine
  constructor: (@font) ->
    @morxProcessor = new AATMorxProcessor(@font)
    
  substitute: (glyphs, features, script, language) ->
    # AAT expects the glyphs to be in visual order prior to morx processing,
    # so reverse the glyphs if the script is right-to-left.
    isRTL = Script.direction(script) is 'rtl'
    if isRTL
      glyphs.reverse()
    
    @morxProcessor.process(glyphs, AATFeatureMap.mapOTToAAT(features))
    return glyphs
    
  getAvailableFeatures: (script, language) ->
    return AATFeatureMap.mapAATToOT @morxProcessor.getSupportedFeatures()

module.exports = AATLayoutEngine
