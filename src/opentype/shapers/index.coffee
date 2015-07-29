DefaultShaper = require './DefaultShaper'
ArabicShaper = require './ArabicShaper'

SHAPERS =
  arab: ArabicShaper    # Arabic
  mong: ArabicShaper    # Mongolian
  syrc: ArabicShaper    # Syriac
  'nko ': ArabicShaper  # N'Ko
  phag: ArabicShaper    # Phags Pa
  mand: ArabicShaper    # Mandaic
  mani: ArabicShaper    # Manichaean
  phlp: ArabicShaper    # Psalter Pahlavi
  
  latn: DefaultShaper   # Latin
  DFLT: DefaultShaper   # Default

exports.choose = (script) ->
  shaper = SHAPERS[script]
  return shaper if shaper
  
  return DefaultShaper
