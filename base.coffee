r = require 'restructure'
fs = require 'fs'

formats = []
exports.registerFormat = (format) ->
  formats.push format
  exports[format.name] = format

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
  for format in formats
    if format.probe buffer
      font = new format(new r.DecodeStream(buffer))
      if postscriptName
        return font.getFont postscriptName
        
      return font
      
  throw new Error 'Unknown font format'
