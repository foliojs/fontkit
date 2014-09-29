r = require 'restructure'
fs = require 'fs'
TTFFont = require './TTFFont'
WOFFFont = require './WOFFFont'
TrueTypeCollection = require './TrueTypeCollection'
DFont = require './DFont'

exports.TTFFont = TTFFont
exports.WOFFFont = WOFFFont
exports.TrueTypeCollection = TrueTypeCollection
exports.DFont = DFont

exports.openSync = (filename, postscriptName) ->
  buffer = fs.readFileSync filename
  return exports.create buffer, postscriptName
  
exports.open = (filename, postscriptName, callback) ->
  if typeof postscriptName is 'function'
    callback = postscriptName
    postscriptName = null
    
  fs.readFile filename, (err, buffer) ->
    return callback err if err
    
    try
      font = exports.create buffer, postscriptName
    catch e
      return callback e
      
    callback null, font
    
  return
  
exports.create = (buffer, postscriptName) ->
  stream = new r.DecodeStream(buffer)
  sig = stream.readString(4)
  stream.pos = 0

  switch sig
    when 'ttcf'
      ttc = new TrueTypeCollection(stream)
      if postscriptName
        return ttc.getFont(postscriptName)
        
      return ttc
      
    when 'wOFF'
      return new WOFFFont(stream)
      
    when 'true', 'OTTO', String.fromCharCode(0, 1, 0, 0)
      return new TTFFont(stream)
      
    else
      if DFont.isDFont stream
        dfont = new DFont(stream)
        if postscriptName
          return dfont.getFont(postscriptName)
          
        return dfont
        
      throw new Error 'Unknown font format'
