DefaultShaper = require './DefaultShaper'
unicode = require 'unicode-properties'
UnicodeTrie = require 'unicode-trie'
fs = require 'fs'
trie = new UnicodeTrie fs.readFileSync __dirname + '/data.trie'

#
# This is a shaper for Arabic, and other cursive scripts.
# It uses data from ArabicShaping.txt in the Unicode database,
# compiled to a UnicodeTrie by generate-data.coffee.
#
# The shaping state machine was ported from Harfbuzz.
# https://github.com/behdad/harfbuzz/blob/master/src/hb-ot-shape-complex-arabic.cc
#
class ArabicShaper extends DefaultShaper
  @getGlobalFeatures: (script, isVertical = false) ->
    features = super
    features.push 'mset'
    return features
    
  ShapingClasses = 
    Non_Joining: 0
    Left_Joining: 1
    Right_Joining: 2
    Dual_Joining: 3
    Join_Causing: 3
    ALAPH: 4
    'DALATH RISH': 5
    Transparent: 6
    
  ISOL = 'isol'
  FINA = 'fina'
  FIN2 = 'fin2'
  FIN3 = 'fin3'
  MEDI = 'medi'
  MED2 = 'med2'
  INIT = 'init'
  NONE = null
  
  # Each entry is [prevAction, curAction, nextState]
  STATE_TABLE = [
    #   Non_Joining,        Left_Joining,       Right_Joining,     Dual_Joining,           ALAPH,            DALATH RISH
    # State 0: prev was U,  not willing to join.
    [ [ NONE, NONE, 0 ],  [ NONE, ISOL, 2 ],  [ NONE, ISOL, 1 ],  [ NONE, ISOL, 2 ],  [ NONE, ISOL, 1 ],  [ NONE, ISOL, 6 ] ]

    # State 1: prev was R or ISOL/ALAPH,  not willing to join.
    [ [ NONE, NONE, 0 ],  [ NONE, ISOL, 2 ],  [ NONE, ISOL, 1 ],  [ NONE, ISOL, 2 ],  [ NONE, FIN2, 5 ],  [ NONE, ISOL, 6 ] ]

    # State 2: prev was D/L in ISOL form,  willing to join.
    [ [ NONE, NONE, 0 ],  [ NONE, ISOL, 2 ],  [ INIT, FINA, 1 ],  [ INIT, FINA, 3 ],  [ INIT, FINA, 4 ],  [ INIT, FINA, 6 ] ]

    # State 3: prev was D in FINA form,  willing to join.
    [ [ NONE, NONE, 0 ],  [ NONE, ISOL, 2 ],  [ MEDI, FINA, 1 ],  [ MEDI, FINA, 3 ],  [ MEDI, FINA, 4 ],  [ MEDI, FINA, 6 ] ]

    # State 4: prev was FINA ALAPH,  not willing to join.
    [ [ NONE, NONE, 0 ],  [ NONE, ISOL, 2 ],  [ MED2, ISOL, 1 ],  [ MED2, ISOL, 2 ],  [ MED2, FIN2, 5 ],  [ MED2, ISOL, 6 ] ]

    # State 5: prev was FIN2/FIN3 ALAPH,  not willing to join.
    [ [ NONE, NONE, 0 ],  [ NONE, ISOL, 2 ],  [ ISOL, ISOL, 1 ],  [ ISOL, ISOL, 2 ],  [ ISOL, FIN2, 5 ],  [ ISOL, ISOL, 6 ] ]

    # State 6: prev was DALATH/RISH,  not willing to join.
    [ [ NONE, NONE, 0 ],  [ NONE, ISOL, 2 ],  [ NONE, ISOL, 1 ],  [ NONE, ISOL, 2 ],  [ NONE, FIN3, 5 ],  [ NONE, ISOL, 6 ] ]
  ]
  
  getShapingClass = (codePoint) ->
    res = trie.get(codePoint)
    if res
      return res - 1

    if unicode.getCategory(codePoint) in ['Mn', 'Me', 'Cf']
      return ShapingClasses.Transparent

    return ShapingClasses.Non_Joining
    
  @assignFeatures: (glyphs, script) ->
    features = super
        
    prev = -1
    state = 0
    actions = []
  
    # Apply the state machine to map glyphs to features
    for glyph, i in glyphs
      type = getShapingClass glyph.codePoints[0]
      if type is ShapingClasses.Transparent
        actions[i] = NONE
        continue
      
      [prevAction, curAction, state] = STATE_TABLE[state][type]
    
      if prevAction isnt NONE and prev isnt -1
        actions[prev] = prevAction
      
      actions[i] = curAction
      prev = i
  
    # Apply the chosen features to their respective glyphs
    for glyph, index in glyphs
      if feature = actions[index]
        glyph.features[feature] = true

    features.push 'isol', 'fina', 'fin2', 'fin3', 'medi', 'med2', 'init'
    return features
  
module.exports = ArabicShaper
