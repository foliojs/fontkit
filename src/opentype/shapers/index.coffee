DefaultShaper = require './DefaultShaper'

SHAPERS =
  latn: DefaultShaper
  DFLT: DefaultShaper

exports.choose = (script) ->
  shaper = SHAPERS[script]
  return shaper if shaper
  
  return DefaultShaper
