r = require 'restructure'

class CFFIndex
  constructor: (@type) ->
  
  decode: (stream) ->
    count = stream.readUInt16BE()
    offSize = stream.readUInt8()
    
    offsetType = switch offSize
      when 1 then r.uint8
      when 2 then r.uint16
      when 3 then r.uint24
      when 4 then r.uint32
      
    startPos = stream.pos + ((count + 1) * offSize) - 1
      
    ret = []
    prev = null
    
    for i in [0..count]
      offset = offsetType.decode(stream)
      if prev?
        if @type?
          pos = stream.pos
          stream.pos = startPos + prev
        
          ret.push @type.decode(stream, length: offset - prev)
          stream.pos = pos
        else
          ret.push 
            offset: startPos + prev
            length: offset - prev
        
      prev = offset
    
    stream.pos = startPos + prev
    return ret
    
module.exports = CFFIndex
