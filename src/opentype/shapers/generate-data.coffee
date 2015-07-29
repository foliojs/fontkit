#
# This script generates a UnicodeTrie containing shaping data derived
# from Unicode properties (currently just for the Arabic shaper).
#
codepoints = require 'codepoints'
fs = require 'fs'
UnicodeTrieBuilder = require 'unicode-trie/builder'
  
ShapingClasses = 
  Non_Joining: 0
  Left_Joining: 1
  Right_Joining: 2
  Dual_Joining: 3
  Join_Causing: 3
  ALAPH: 4
  'DALATH RISH': 5
  Transparent: 6

trie = new UnicodeTrieBuilder
for codepoint in codepoints when codepoint
  if codepoint.joiningGroup in ['ALAPH', 'DALATH RISH']
    trie.set codepoint.code, ShapingClasses[codepoint.joiningGroup] + 1
    
  else if codepoint.joiningType
    trie.set codepoint.code, ShapingClasses[codepoint.joiningType] + 1

fs.writeFileSync __dirname + '/data.trie', trie.toBuffer()
